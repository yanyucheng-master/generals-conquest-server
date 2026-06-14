import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { GameState, CardDef, BoardKey, Faction } from '@/types/game';
import type { MultiplayerPhase, RoomInfo } from '@/types/multiplayer';
import {
  createGame, combatPhaseStart, mirrorEnemyDeploy, mirrorEnemySpell, mirrorEnemySnipers, mirrorEnemyAttack,
  finishPlayerTurn, advanceToPlayerTurn, checkGameOver, endTurn, setSeed,
  getTargetsInRange, deployUnitWithSync, castSpellWithSync, getAttackOrder,
  executeSingleAttack, clearAttackingUnit, resolveAllSnipers, isRowEmpty,
  resolveSnipeTargetWithJamming,
} from '@/engine/gameEngine';
import type { SpellSyncData, DeploySyncData } from '@/types/game';

const LOCAL_ATTACK_STEP_MS = 1000;
const LOCAL_ATTACK_CLEAR_MS = 500;
const REMOTE_ATTACK_ANIM_MS = 450;
import { ALL_CARDS } from '@/data/cards';
import { loadDIYCards } from '@/data/diySystem';

const DEFAULT_WS_PORT = 3001;
const SERVER_URL_KEY = 'mp_server_url';

/** 生产环境在 .env.production 中设置 VITE_WS_URL=wss://你的联机服域名 */
export function getConfiguredWsUrl(): string {
  const configured = import.meta.env.VITE_WS_URL as string | undefined;
  return configured?.trim() || '';
}

export function isPublicServerMode(): boolean {
  const url = getConfiguredWsUrl();
  return !!url && !url.includes('localhost') && !url.includes('127.0.0.1');
}

function getDefaultWsUrl(): string {
  const configured = getConfiguredWsUrl();
  if (configured) return configured;
  if (typeof window === 'undefined') return `ws://localhost:${DEFAULT_WS_PORT}`;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:${DEFAULT_WS_PORT}`;
}

/** 供 UI 显示与连接使用；公网部署时忽略 localStorage 里的 localhost */
export function getEffectiveWsUrl(): string {
  const configured = getConfiguredWsUrl();
  if (typeof window === 'undefined') return getDefaultWsUrl();
  const saved = localStorage.getItem(SERVER_URL_KEY);
  if (configured) {
    if (!saved || saved.includes('localhost') || saved.includes('127.0.0.1')) {
      return configured;
    }
    return saved;
  }
  if (saved) return saved;
  return getDefaultWsUrl();
}

function getWsUrl(): string {
  return getEffectiveWsUrl();
}
const SESSION_KEY = 'mp_session';
const GAME_STATE_KEY = 'mp_game_state';
const MAX_RECONNECT_ATTEMPTS = 8;
const HEARTBEAT_INTERVAL = 15000; // 15秒
const INITIAL_RECONNECT_DELAY = 1000; // 1秒

export function getSavedServerUrl(): string {
  return localStorage.getItem(SERVER_URL_KEY) || '';
}

export function setServerUrl(url: string): void {
  localStorage.setItem(SERVER_URL_KEY, url);
}

// ======== Session 持久化 ========
interface MPSession {
  roomId: string;
  role: 'host' | 'guest';
  rejoinToken: string;
}

function saveSession(session: MPSession) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* ignore */ }
}

function loadSession(): MPSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function saveLocalGameState(session: MPSession, state: GameState) {
  try {
    sessionStorage.setItem(`${GAME_STATE_KEY}_${session.roomId}_${session.role}`, JSON.stringify(state));
  } catch { /* ignore quota */ }
}

function loadLocalGameState(session: MPSession): GameState | null {
  try {
    const raw = sessionStorage.getItem(`${GAME_STATE_KEY}_${session.roomId}_${session.role}`);
    return raw ? JSON.parse(raw) as GameState : null;
  } catch { return null; }
}

function clearLocalGameState(session?: MPSession | null) {
  if (!session) return;
  try {
    sessionStorage.removeItem(`${GAME_STATE_KEY}_${session.roomId}_${session.role}`);
  } catch { /* ignore */ }
}

// ======== 序列化/反序列化工具 ========
export function serializeDeck(cards: CardDef[]): string {
  return JSON.stringify(cards.map(c => {
    if (c.id.toString().startsWith('diy_')) {
      return { _diy: true, full: c };
    }
    return { id: c.id };
  }));
}

export function deserializeDeck(data: string): CardDef[] {
  const arr = JSON.parse(data);
  const diyCards = loadDIYCards();
  const result: CardDef[] = [];
  for (const item of arr) {
    if (item._diy && item.full) {
      result.push(item.full);
    } else {
      const found = ALL_CARDS.find(c => c.id === item.id);
      if (found) result.push(found);
      else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const diyFound = diyCards.find((c: any) => c.id == item.id);
        if (diyFound) result.push(diyFound as unknown as CardDef);
        else console.warn('[Multiplayer] Deck card not found:', item.id);
      }
    }
  }
  return result;
}

// ======== 与 GameBoard 兼容的返回类型 ========
interface DamagePopup { key: string; amount: number; id: number; }
interface SkillFloat { key: string; text: string; id: number; }

export type ConnectionStatus = 'online' | 'reconnecting' | 'peer_offline';

export interface UseMultiplayerReturn {
  // 核心状态
  wsState: 'idle' | 'connecting' | 'open' | 'closed' | 'error';
  phase: MultiplayerPhase;
  roomId: string | null;
  playerId: string | null;
  faction: Faction | null;
  gameState: GameState | null;
  enemyFaction: Faction | null;
  myDeckData: string | null;
  countdown: number;
  error: string | null;
  // 重连状态
  connectionStatus: ConnectionStatus;
  peerOnline: boolean;
  // 派生状态
  isInGame: boolean;
  isMyTurn: boolean;
  // MultiplayerLobby 兼容
  room: { roomId: string; inviteUrl: string; role: 'host' | 'guest' } | null;
  enemySelected: boolean;
  errorMsg: string;
  // 方法
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  createRoom: (customDeck?: CardDef[]) => void;
  joinRoom: (room: string, customDeck?: CardDef[]) => void;
  selectFaction: (faction: Faction, customDeck?: CardDef[]) => void;
  send: (type: string, payload: Record<string, unknown>) => boolean;
  resetError: () => void;
  // === GameBoard 兼容接口 ===
  selectedCardIdx: number | null;
  animating: boolean;
  deployFlash: { key: string } | null;
  damagePopups: DamagePopup[];
  shakeCell: string | null;
  attackLine: { from: string; to: string } | null;
  skillFloats: SkillFloat[];
  aiDeploying: boolean;
  selectCard: (idx: number | null) => void;
  handleCellClick: (row: number, col: number) => void;
  handleEndTurn: (onComplete?: () => void) => void;
  handleSurrender: () => boolean;
  handleRestart: () => void;
  setMultiplayerMode: (v: boolean) => void;
  forceSync: () => void;
  loadGameState: (s: GameState) => void;
  mirrorEnemyDeployAt: (row: number, col: number, card: CardDef) => void;
  mirrorEnemySpellAt: (card: { name: string; type: string; skills: string[] }, targetKey: BoardKey | null) => void;
  snipeAndAttack: (targetKey: BoardKey) => void;
  runAttackSequenceFor: (who: 'player' | 'enemy', onComplete: () => void) => void;
  advanceTurn: () => void;
  getHighlightCells: () => Set<BoardKey>;
  getSnipeTargets: () => Set<BoardKey>;
  getEnemyFrontExists: () => boolean;
  getPlayerFrontExists: () => boolean;
}

export function useMultiplayer(): UseMultiplayerReturn {
  // WebSocket 状态
  const [wsState, setWsState] = useState<'idle' | 'connecting' | 'open' | 'closed' | 'error'>('idle');
  const [phase, setPhase] = useState<MultiplayerPhase>('menu');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [faction, setFaction] = useState<Faction | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [enemyFaction, setEnemyFaction] = useState<Faction | null>(null);
  const [myDeckData, setMyDeckData] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // 重连状态
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('online');
  const [peerOnline, setPeerOnline] = useState(true);
  const [playerRole, setPlayerRole] = useState<'host' | 'guest' | null>(null);

  // GameBoard UI 状态
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [deployFlash, setDeployFlash] = useState<{ key: string } | null>(null);
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [shakeCell, setShakeCell] = useState<string | null>(null);
  const [attackLine, setAttackLine] = useState<{ from: string; to: string } | null>(null);
  const [skillFloats, setSkillFloats] = useState<SkillFloat[]>([]);
  const [aiDeploying] = useState(false);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const gameRef = useRef<GameState | null>(null);
  const factionRef = useRef<Faction | null>(null);
  const enemyFactionRef = useRef<Faction | null>(null);
  const myDeckDataRef = useRef<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rejoinTokenRef = useRef<string | null>(null);
  const roleRef = useRef<'host' | 'guest' | null>(null);
  const sessionRef = useRef<MPSession | null>(null);
  const handleMessageRef = useRef<(msg: Record<string, unknown>) => void>(() => {});
  const attemptReconnectRef = useRef<() => void>(() => {});
  const bindWebSocketHandlersRef = useRef<(ws: WebSocket, options?: { isReconnect?: boolean }) => void>(() => {});
  const pendingAfterSnipeRef = useRef<(() => void) | null>(null);
  const lastProcessedEndTurnRef = useRef(-1);
  const stateSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameSeedRef = useRef<number | null>(null);

  // 从 localStorage 恢复 session（页面刷新后），连接成功后 onopen 自动 rejoin
  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      sessionRef.current = saved;
      rejoinTokenRef.current = saved.rejoinToken;
      roleRef.current = saved.role;
      setPlayerRole(saved.role);
      setRoomId(saved.roomId);
      if (gameRef.current) {
        setPhase('playing');
      }
    }
  }, []);

  // Sync refs
  useEffect(() => { factionRef.current = faction; }, [faction]);
  useEffect(() => { gameRef.current = gameState; }, [gameState]);
  useEffect(() => { myDeckDataRef.current = myDeckData; }, [myDeckData]);
  useEffect(() => { enemyFactionRef.current = enemyFaction; }, [enemyFaction]);

  // 清理定时器
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const addTimer = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }, []);

  // 停止心跳
  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // 停止自动重连
  const stopReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // Countdown timer
  const startCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(30);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(0);
  }, []);

  // ======== 工具函数（WebSocket 依赖） ========
  const syncStateInner = useCallback(() => {
    if (gameRef.current) {
      const s = gameRef.current;
      setGameState({
        ...s,
        player: { ...s.player, hand: [...s.player.hand], board: { ...s.player.board } },
        enemy: { ...s.enemy, hand: [...s.enemy.hand], board: { ...s.enemy.board } },
        log: [...s.log],
      });
    }
  }, []);

  const pushStateSync = useCallback(() => {
    const session = sessionRef.current;
    const g = gameRef.current;
    if (!session || !g || g.phase === 'game_over') return;
    saveLocalGameState(session, g);
    if (stateSyncTimerRef.current) clearTimeout(stateSyncTimerRef.current);
    stateSyncTimerRef.current = setTimeout(() => {
      const latest = gameRef.current;
      const ws = wsRef.current;
      if (latest && sessionRef.current && ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'state_sync', payload: { state: JSON.stringify(latest) } }));
      }
    }, 400);
  }, []);

  const syncState = useCallback(() => {
    syncStateInner();
    pushStateSync();
  }, [syncStateInner, pushStateSync]);

  const restoreGameState = useCallback((state: GameState, seed?: number) => {
    if (seed !== undefined) {
      gameSeedRef.current = seed;
      setSeed(seed);
    }
    gameRef.current = state;
    lastProcessedEndTurnRef.current = -1;
    pendingAfterSnipeRef.current = null;
    syncStateInner();
    setPhase('playing');
    setError(null);
    setPeerOnline(true);
    pushStateSync();
  }, [syncStateInner, pushStateSync]);

  const startHeartbeat = useCallback((ws: WebSocket) => {
    stopHeartbeat();
    heartbeatRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', payload: {} }));
      }
    }, HEARTBEAT_INTERVAL);
  }, [stopHeartbeat]);

  const bindWebSocketHandlers = useCallback((ws: WebSocket, options?: { isReconnect?: boolean }) => {
    ws.onopen = () => {
      setWsState('open');
      setConnectionStatus('online');
      reconnectAttemptRef.current = 0;
      stopReconnect();
      startHeartbeat(ws);
      setError(null);

      const session = sessionRef.current;
      if (session?.rejoinToken) {
        ws.send(JSON.stringify({
          type: 'rejoin_room',
          payload: { token: session.rejoinToken },
        }));
        return;
      }

      if (options?.isReconnect) return;

      setPhase((prev) => (prev === 'connecting' ? 'menu' : prev));
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        handleMessageRef.current(msg);
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      setWsState('closed');
      stopHeartbeat();

      if (sessionRef.current) {
        attemptReconnectRef.current();
      } else {
        setPhase((prev) => (prev === 'connecting' ? 'menu' : prev));
        setConnectionStatus('peer_offline');
        const hint = isPublicServerMode()
          ? '无法连接到联机服务器，请检查网络或稍后重试'
          : '无法连接到联机服务器，请确认 server/index.cjs 已启动';
        setError((prev) => prev ?? hint);
      }
    };

    ws.onerror = () => {
      setWsState('error');
      if (!sessionRef.current) {
        setPhase((prev) => (prev === 'connecting' ? 'menu' : prev));
        const hint = isPublicServerMode()
          ? '无法连接到联机服务器，请检查网络或稍后重试'
          : '无法连接到联机服务器，请确认 server/index.cjs 已启动';
        setError(hint);
      }
      setConnectionStatus('reconnecting');
    };
  }, [startHeartbeat, stopHeartbeat, stopReconnect]);

  bindWebSocketHandlersRef.current = bindWebSocketHandlers;

  const openWebSocket = useCallback((options?: { isReconnect?: boolean }) => {
    const existing = wsRef.current;
    if (existing?.readyState === WebSocket.OPEN || existing?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;
    bindWebSocketHandlersRef.current(ws, options);
  }, []);

  // ======== 自动重连逻辑 ========
  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionStatus('peer_offline');
      setError('重连次数已达上限，请手动刷新页面');
      return;
    }

    reconnectAttemptRef.current += 1;
    const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptRef.current - 1);
    const jitter = Math.random() * 1000;
    const totalDelay = Math.min(delay + jitter, 30000);

    setConnectionStatus('reconnecting');
    setWsState('connecting');

    reconnectTimerRef.current = setTimeout(() => {
      console.log(`[MP] 自动重连尝试 ${reconnectAttemptRef.current}/${MAX_RECONNECT_ATTEMPTS}`);
      openWebSocket({ isReconnect: true });
    }, totalDelay);
  }, [openWebSocket]);

  attemptReconnectRef.current = attemptReconnect;

  // ======== WebSocket ========
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setWsState('connecting');
    setPhase('connecting');
    setError(null);
    setConnectionStatus('online');
    reconnectAttemptRef.current = 0;
    openWebSocket();
  }, [openWebSocket]);

  // 手动重连
  const reconnect = useCallback(() => {
    stopReconnect();
    reconnectAttemptRef.current = 0;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setWsState('connecting');
    setError(null);
    setConnectionStatus('online');
    openWebSocket({ isReconnect: !!sessionRef.current });
  }, [openWebSocket, stopReconnect]);

  const disconnect = useCallback(() => {
    // 发送 leave_room 主动退出
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN && sessionRef.current) {
      ws.send(JSON.stringify({ type: 'leave_room', payload: {} }));
    }

    stopCountdown();
    stopHeartbeat();
    stopReconnect();
    clearAllTimers();
    wsRef.current?.close();
    wsRef.current = null;

    // 清理session
    clearLocalGameState(sessionRef.current);
    clearSession();
    sessionRef.current = null;
    rejoinTokenRef.current = null;
    roleRef.current = null;

    setWsState('idle');
    setPhase('menu');
    setRoomId(null);
    setPlayerId(null);
    setFaction(null);
    setGameState(null);
    setEnemyFaction(null);
    setMyDeckData(null);
    setError(null);
    setConnectionStatus('online');
    setPeerOnline(true);
    setPlayerRole(null);
    setSelectedCardIdx(null);
    setAnimating(false);
    setDeployFlash(null);
    setDamagePopups([]);
    setShakeCell(null);
    setAttackLine(null);
    setSkillFloats([]);
  }, [stopCountdown, stopHeartbeat, stopReconnect, clearAllTimers]);

  const send = useCallback((type: string, payload: Record<string, unknown>): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
      return true;
    }
    setError('未连接到服务器，请稍候再试');
    setPhase((prev) => (prev === 'connecting' ? 'menu' : prev));
    return false;
  }, []);

  const getHpSnapshot = useCallback((state: GameState) => {
    const snap: Record<string, number> = {};
    snap['HQ-p'] = state.player.hp;
    snap['HQ-e'] = state.enemy.hp;
    for (const [k, u] of Object.entries(state.player.board)) snap[k + '-p'] = u.hp;
    for (const [k, u] of Object.entries(state.enemy.board)) snap[k + '-e'] = u.hp;
    return snap;
  }, []);

  const detectDamage = useCallback((before: Record<string, number>, state: GameState) => {
    const newPopups: DamagePopup[] = [];
    let id = Date.now();
    const check = (key: string, label: string, current: number) => {
      const prev = before[key] ?? current;
      if (current < prev) {
        newPopups.push({ key: label, amount: prev - current, id: id++ });
      }
    };
    check('HQ-p', 'hq-player', state.player.hp);
    check('HQ-e', 'hq-enemy', state.enemy.hp);
    for (const [k, u] of Object.entries(state.player.board)) {
      const prev = before[k + '-p'] ?? u.hp;
      if (u.hp < prev) newPopups.push({ key: k, amount: prev - u.hp, id: id++ });
    }
    for (const [k, u] of Object.entries(state.enemy.board)) {
      const prev = before[k + '-e'] ?? u.hp;
      if (u.hp < prev) newPopups.push({ key: k, amount: prev - u.hp, id: id++ });
    }
    if (newPopups.length) {
      setDamagePopups(prev => [...prev, ...newPopups]);
      addTimer(() => setDamagePopups(prev => prev.filter(p => !newPopups.find(n => n.id === p.id))), 1200);
    }
  }, [addTimer]);

  const flipRemoteKey = useCallback((row: number, col: number): BoardKey => {
    return `${3 - row}-${col}` as BoardKey;
  }, []);

  const flipRemoteBoardKey = useCallback((key: BoardKey): BoardKey => {
    const [row, col] = key.split('-').map(Number);
    return flipRemoteKey(row, col);
  }, [flipRemoteKey]);

  const finishRemoteGameOver = useCallback((g: GameState) => {
    checkGameOver(g);
    if (g.gameOver) {
      syncState();
      send('game_over', { winner: g.winner, turn: g.turn });
    }
  }, [syncState, send]);

  // ======== Message Handler ========
  // 服务器消息格式: { type: string, payload: Record<string, unknown> }
  const handleMessage = useCallback((msg: Record<string, unknown>) => {
    const type = msg.type as string;
    const p = (msg.payload || {}) as Record<string, unknown>;

    switch (type) {
      case 'connected':
        setPlayerId(p.playerId as string);
        break;

      case 'room_created': {
        const rid = p.roomId as string;
        setRoomId(rid);
        setPhase('waiting_peer');
        const token = (p.rejoinToken as string) || '';
        const role = (p.role as 'host' | 'guest') || 'host';
        rejoinTokenRef.current = token;
        roleRef.current = role;
        setPlayerRole(role);
        const session: MPSession = { roomId: rid, role, rejoinToken: token };
        sessionRef.current = session;
        saveSession(session);
        break;
      }

      case 'room_joined': {
        const rid = p.roomId as string;
        setRoomId(rid);
        setPhase('select_faction');
        const token = (p.rejoinToken as string) || '';
        const role = (p.role as 'host' | 'guest') || 'guest';
        rejoinTokenRef.current = token;
        roleRef.current = role;
        setPlayerRole(role);
        const session: MPSession = { roomId: rid, role, rejoinToken: token };
        sessionRef.current = session;
        saveSession(session);
        break;
      }

      // ====== 断线重连消息 ======
      case 'rejoin_ok': {
        const rid = p.roomId as string;
        const role = (p.role as 'host' | 'guest') || roleRef.current;
        setRoomId(rid);
        rejoinTokenRef.current = (p.rejoinToken as string) || rejoinTokenRef.current;
        if (role) {
          roleRef.current = role;
          setPlayerRole(role);
        }
        setConnectionStatus('online');
        setError(null);
        setPeerOnline(true);

        const hostFaction = p.hostFaction as Faction | null | undefined;
        const guestFaction = p.guestFaction as Faction | null | undefined;
        if (role === 'host') {
          if (hostFaction) { setFaction(hostFaction); factionRef.current = hostFaction; }
          if (guestFaction) { setEnemyFaction(guestFaction); enemyFactionRef.current = guestFaction; }
        } else if (role === 'guest') {
          if (guestFaction) { setFaction(guestFaction); factionRef.current = guestFaction; }
          if (hostFaction) { setEnemyFaction(hostFaction); enemyFactionRef.current = hostFaction; }
        }

        if (p.gameStarted) {
          const seed = p.gameSeed as number | undefined;
          const session = sessionRef.current;
          let restored: GameState | null = session ? loadLocalGameState(session) : null;
          if (!restored && p.gameState) {
            try {
              restored = JSON.parse(p.gameState as string) as GameState;
            } catch { /* ignore */ }
          }
          if (restored) {
            restoreGameState(restored, seed);
          } else if (gameRef.current) {
            setPhase('playing');
            setError(null);
          } else {
            setPhase('waiting_reconnect');
            setError('对局进行中，正在恢复棋盘状态...');
          }
        } else {
          setPhase(guestFaction || hostFaction ? 'select_faction' : 'waiting_peer');
        }
        break;
      }

      case 'rejoin_failed': {
        clearLocalGameState(sessionRef.current);
    clearSession();
        sessionRef.current = null;
        rejoinTokenRef.current = null;
        setError((p.message as string) || '重连失败，房间已过期');
        setPhase('error');
        setConnectionStatus('peer_offline');
        break;
      }

      case 'peer_reconnected': {
        setPeerOnline(true);
        setConnectionStatus('online');
        setError(null);
        pushStateSync();
        break;
      }

      case 'peer_left': {
        setPeerOnline(false);
        setConnectionStatus('peer_offline');
        setError('对手已离开房间');
        setPhase('peer_disconnected');
        clearLocalGameState(sessionRef.current);
    clearSession();
        sessionRef.current = null;
        break;
      }

      case 'peer_joined':
      case 'player_joined': {
        setPhase('select_faction');
        setPeerOnline(true);
        startCountdown();
        break;
      }

      case 'peer_selected_faction':
      case 'faction_selected': {
        if (p.faction) {
          setEnemyFaction(p.faction as Faction);
          enemyFactionRef.current = p.faction as Faction;
        }
        break;
      }

      case 'player_ready':
        break;

      case 'game_start': {
        stopCountdown();
        setPeerOnline(true);
        setError(null);

        const myF = (p.myFaction as Faction) || factionRef.current;
        const enemyF = (p.enemyFaction as Faction) || enemyFactionRef.current;
        if (!myF) {
          setError('未选择阵营');
          setPhase('error');
          return;
        }

        setFaction(myF);
        setEnemyFaction(enemyF);
        factionRef.current = myF;
        enemyFactionRef.current = enemyF;

        if (p.myRejoinToken) {
          rejoinTokenRef.current = p.myRejoinToken as string;
          const currentRole = roleRef.current || 'host';
          const rid = (p.roomId as string) || roomId || sessionRef.current?.roomId || '';
          const session: MPSession = { roomId: rid, role: currentRole, rejoinToken: p.myRejoinToken as string };
          sessionRef.current = session;
          saveSession(session);
          if (rid) setRoomId(rid);
        }

        let myDeck: CardDef[] | undefined;
        let enemyDeck: CardDef[] | undefined;
        if (p.myDeckData) {
          try { myDeck = deserializeDeck(p.myDeckData as string); } catch { /* ignore */ }
        }
        if (p.enemyDeckData) {
          try { enemyDeck = deserializeDeck(p.enemyDeckData as string); } catch { /* ignore */ }
        }
        try {
          const state = createGame(
            myF,
            (enemyF ?? 'empire') as Faction,
            p.seed as number | undefined,
            myDeck?.length ? myDeck : undefined,
            enemyDeck?.length ? enemyDeck : undefined
          );
          if (p.myTurn === false) {
            state.currentPlayer = 'enemy';
          }
          gameSeedRef.current = (p.seed as number) ?? null;
          gameRef.current = state;
          lastProcessedEndTurnRef.current = -1;
          pendingAfterSnipeRef.current = null;
          syncStateInner();
          setGameState({
            ...state,
            player: { ...state.player, hand: [...state.player.hand], board: { ...state.player.board } },
            enemy: { ...state.enemy, hand: [...state.enemy.hand], board: { ...state.enemy.board } },
            log: [...state.log],
          });
          pushStateSync();
          setPhase('playing');
        } catch (err) {
          setError('游戏初始化失败: ' + (err as Error).message);
          setPhase('error');
        }
        break;
      }

      case 'deploy': {
        const g = gameRef.current;
        if (!g) return;
        const remoteRow = p.row as number;
        const remoteCol = p.col as number;
        const localKey = flipRemoteKey(remoteRow, remoteCol);
        const [localRow, localCol] = localKey.split('-').map(Number);
        const beforeHps = getHpSnapshot(g);
        mirrorEnemyDeploy(g, p.card as CardDef, localRow, localCol, p.sync as DeploySyncData | undefined);
        detectDamage(beforeHps, g);
        setDeployFlash({ key: localKey });
        addTimer(() => setDeployFlash(null), 600);
        syncState();
        finishRemoteGameOver(g);
        break;
      }

      case 'spell': {
        const g = gameRef.current;
        if (!g) return;
        const card = p.card as { name: string; type: string; skills: string[] };
        const targetKey = p.targetKey as BoardKey | null;
        setAnimating(true);
        const beforeHps = getHpSnapshot(g);
        mirrorEnemySpell(g, card, targetKey, p.sync as SpellSyncData | undefined);
        detectDamage(beforeHps, g);
        if (targetKey) {
          const localKey = flipRemoteBoardKey(targetKey);
          setShakeCell(localKey);
          addTimer(() => setShakeCell(null), 500);
        }
        syncState();
        finishRemoteGameOver(g);
        addTimer(() => setAnimating(false), 400);
        break;
      }

      case 'sniper_target': {
        const g = gameRef.current;
        if (!g) return;
        const remoteTargetKey = p.targetKey as BoardKey;
        const localTargetKey = flipRemoteBoardKey(remoteTargetKey);
        setAnimating(true);
        const beforeHps = getHpSnapshot(g);
        mirrorEnemySnipers(g, remoteTargetKey, p.amounts as number[] | undefined);
        detectDamage(beforeHps, g);
        setShakeCell(localTargetKey);
        addTimer(() => setShakeCell(null), 500);
        syncState();
        finishRemoteGameOver(g);
        addTimer(() => setAnimating(false), 600);
        break;
      }

      case 'attack_phase_start': {
        const g = gameRef.current;
        if (!g || g.gameOver) return;
        combatPhaseStart(g, 'enemy');
        syncState();
        break;
      }

      case 'attack': {
        const g = gameRef.current;
        if (!g || g.gameOver) return;
        const fromKey = p.fromKey as BoardKey;
        const toKey = p.toKey as BoardKey;
        if (!fromKey || !toKey) return;
        const localFrom = flipRemoteBoardKey(fromKey);
        const localTo = flipRemoteBoardKey(toKey);
        setAnimating(true);
        const beforeHps = getHpSnapshot(g);
        g.attackingUnit = localFrom;
        setAttackLine({ from: localFrom, to: localTo });
        mirrorEnemyAttack(g, fromKey, toKey, {
          amount: p.amount as number | undefined,
          dodged: p.dodged as boolean | undefined,
          blocked: p.blocked as boolean | undefined,
        });
        detectDamage(beforeHps, g);
        syncState();
        addTimer(() => {
          if (gameRef.current) {
            clearAttackingUnit(gameRef.current);
            setAttackLine(null);
            syncState();
          }
        }, LOCAL_ATTACK_CLEAR_MS);
        addTimer(() => setAnimating(false), REMOTE_ATTACK_ANIM_MS);
        finishRemoteGameOver(g);
        break;
      }

      case 'end_turn': {
        const g = gameRef.current;
        if (!g || g.gameOver) return;
        const turnAtEnd = p.turn as number | undefined;
        if (turnAtEnd !== undefined) {
          if (turnAtEnd <= lastProcessedEndTurnRef.current) return;
          lastProcessedEndTurnRef.current = turnAtEnd;
        }
        if (p.gameOver) {
          checkGameOver(g);
          syncState();
          finishRemoteGameOver(g);
          return;
        }
        advanceToPlayerTurn(g);
        syncState();
        break;
      }

      case 'game_over': {
        const g = gameRef.current;
        if (!g) return;
        const remoteWinner = p.winner as 'player' | 'enemy' | null;
        g.gameOver = true;
        g.phase = 'game_over';
        g.winner = remoteWinner === 'player' ? 'enemy' : remoteWinner === 'enemy' ? 'player' : null;
        syncState();
        clearLocalGameState(sessionRef.current);
    clearSession();
        sessionRef.current = null;
        break;
      }

      case 'surrender': {
        const g = gameRef.current;
        if (!g) return;
        g.winner = 'player';
        g.gameOver = true;
        g.phase = 'game_over';
        g.log.push({ id: Date.now(), msg: '🏳️ 对手认输！你获胜了！', type: 'player' });
        syncState();
        clearLocalGameState(sessionRef.current);
    clearSession();
        sessionRef.current = null;
        break;
      }

      case 'peer_disconnected': {
        setPeerOnline(false);
        const isTemporary = p.temporary !== false;
        if (isTemporary) {
          setConnectionStatus('peer_offline');
          setPhase('waiting_reconnect');
          setError((p.message as string) || '对手断线，等待重连中...');
        } else {
          setConnectionStatus('peer_offline');
          setPhase('peer_disconnected');
          setError('对手已断开连接');
          clearLocalGameState(sessionRef.current);
    clearSession();
          sessionRef.current = null;
        }
        break;
      }

      case 'error':
        setError(p.message as string);
        setPhase('error');
        break;

      case 'room_closed':
        setError('房间已关闭');
        setPhase('peer_disconnected');
        setConnectionStatus('peer_offline');
        setRoomId(null);
        stopCountdown();
        clearLocalGameState(sessionRef.current);
    clearSession();
        sessionRef.current = null;
        break;

      case 'pong':
        // 心跳响应，无需处理
        break;
    }
  }, [roomId, startCountdown, stopCountdown, syncState, syncStateInner, pushStateSync, restoreGameState, flipRemoteKey, flipRemoteBoardKey, addTimer, getHpSnapshot, detectDamage, finishRemoteGameOver]);

  handleMessageRef.current = handleMessage;

  // ======== 游戏操作（GameBoard 兼容） ========
  const selectCard = useCallback((idx: number | null) => {
    const g = gameRef.current;
    if (g && idx !== null) {
      const card = g.player.hand[idx];
      if (card?.type === '士兵' && g.player.spellOnlyNextTurn) return;
    }
    setSelectedCardIdx(prev => prev === idx ? null : idx);
  }, []);

  const getHighlightCells = useCallback((): Set<BoardKey> => {
    const g = gameRef.current;
    if (!g || selectedCardIdx === null) return new Set();
    const card = g.player.hand[selectedCardIdx];
    if (!card) return new Set();
    const cells = new Set<BoardKey>();
    if (card.type === '士兵') {
      if (g.player.spellOnlyNextTurn) return cells;
      for (const r of [2, 3]) {
        for (let c = 0; c < 3; c++) {
          if (r === 3 && c === 1) continue;
          cells.add(`${r}-${c}`);
        }
      }
    } else if (card.type === '法术') {
      const skills = card.skills ?? [];
      if (card.name === '天火降临' || card.name === '混乱风暴') {
        cells.add('3-1');
        return cells;
      }
      if (skills.includes('magicDmg') || skills.includes('focusFire') || skills.includes('destroy')) {
        for (let r = 0; r <= 1; r++) {
          for (let c = 0; c < 3; c++) {
            const k = `${r}-${c}` as BoardKey;
            const u = g.enemy.board[k];
            if (u && u.skills.includes('immune')) continue;
            cells.add(k);
          }
        }
      } else if (skills.includes('shield')) {
        cells.add('3-1');
        for (let c = 0; c < 3; c++) {
          if (g.player.board[`2-${c}` as BoardKey]) cells.add(`2-${c}` as BoardKey);
          if (g.player.board[`3-${c}` as BoardKey]) cells.add(`3-${c}` as BoardKey);
        }
      } else if (skills.includes('tear') && skills.includes('poisonBurst')) {
        for (let r = 0; r <= 1; r++) {
          for (let c = 0; c < 3; c++) cells.add(`${r}-${c}` as BoardKey);
        }
      } else if (skills.includes('magicSwap') && card.name === '疾风步') {
        for (let r = 0; r <= 1; r++) {
          for (let c = 0; c < 3; c++) cells.add(`${r}-${c}` as BoardKey);
        }
      }
    }
    return cells;
  }, [selectedCardIdx]);

  const getSnipeTargets = useCallback((): Set<BoardKey> => {
    const g = gameRef.current;
    if (!g || !g.sniperMode || g.sniperQueue.length === 0) return new Set();
    const unit = g.sniperQueue[0];
    const targets = getTargetsInRange(g, unit, 'player');
    return new Set(targets.map(t => t.key));
  }, []);

  const getEnemyFrontExists = useCallback((): boolean => {
    const g = gameRef.current;
    if (!g) return true;
    return !isRowEmpty(g, 1);
  }, []);

  const getPlayerFrontExists = useCallback((): boolean => {
    const g = gameRef.current;
    if (!g) return true;
    return !isRowEmpty(g, 2);
  }, []);

  const runPlayerAttackPhase = useCallback((onComplete?: () => void) => {
    const g = gameRef.current;
    if (!g || g.gameOver) {
      setAnimating(false);
      onComplete?.();
      return;
    }

    setAnimating(true);
    combatPhaseStart(g, 'player');
    send('attack_phase_start', {});

    const finishMyTurn = () => {
      const s = gameRef.current;
      if (!s) { setAnimating(false); onComplete?.(); return; }
      if (s.gameOver) {
        finishPlayerTurn(s);
        syncState();
        finishRemoteGameOver(s);
        setAnimating(false);
        onComplete?.();
        return;
      }
      finishPlayerTurn(s);
      syncState();
      setAnimating(false);
      send('end_turn', { turn: s.turn });
      onComplete?.();
    };

    const order = getAttackOrder(g, 'player');
    if (order.length === 0) {
      finishMyTurn();
      return;
    }

    let idx = 0;
    const step = () => {
      const s = gameRef.current;
      if (!s || s.gameOver) { setAttackLine(null); finishMyTurn(); return; }

      while (idx < order.length) {
        const entry = order[idx];
        if (!s.player.board[entry.key]) { idx++; continue; }
        if (entry.unit.subtype === '狙击') { idx++; continue; }
        break;
      }
      if (idx >= order.length) { setAttackLine(null); finishMyTurn(); return; }

      const { key, unit } = order[idx];
      const targets = getTargetsInRange(s, unit, 'player');
      const target = targets.length > 0 ? targets[0] : null;

      s.attackingUnit = key;
      if (target) setAttackLine({ from: key, to: target.key });
      syncState();

      const beforeHps = getHpSnapshot(s);
      const evt = executeSingleAttack(s, key, 'player');
      if (evt) {
        send('attack', {
          fromKey: key,
          toKey: evt.targetKey,
          amount: evt.amount,
          dodged: evt.isDodged ?? false,
          blocked: evt.isBlocked ?? false,
        });
      }
      detectDamage(beforeHps, s);
      checkGameOver(s);
      syncState();
      if (s.gameOver) {
        setAttackLine(null);
        finishMyTurn();
        return;
      }
      idx++;

      addTimer(() => {
        if (gameRef.current) {
          clearAttackingUnit(gameRef.current);
          setAttackLine(null);
          syncState();
        }
      }, LOCAL_ATTACK_CLEAR_MS);
      addTimer(step, LOCAL_ATTACK_STEP_MS);
    };

    step();
  }, [syncState, getHpSnapshot, detectDamage, addTimer, send, finishRemoteGameOver]);

  const handleCellClick = useCallback((row: number, col: number) => {
    const g = gameRef.current;
    if (!g || g.currentPlayer !== 'player' || g.gameOver || animating) return;
    if (!peerOnline) return;
    const key: BoardKey = `${row}-${col}`;

    // 狙击模式
    if (g.sniperMode) {
      if (row >= 2) return;
      const targetUnit = g.enemy.board[key];
      if (!targetUnit) return;
      setAnimating(true);
      const beforeHps = getHpSnapshot(g);
      const actualTarget = resolveSnipeTargetWithJamming(g, key);
      const events = resolveAllSnipers(g, actualTarget);
      detectDamage(beforeHps, g);
      send('sniper_target', { targetKey: actualTarget, amounts: events.map(e => e.amount) });
      syncState();
      finishRemoteGameOver(g);
      setShakeCell(actualTarget);
      addTimer(() => setShakeCell(null), 500);
      const continueAttack = pendingAfterSnipeRef.current;
      pendingAfterSnipeRef.current = null;
      if (continueAttack) {
        addTimer(() => continueAttack(), 300);
      } else {
        addTimer(() => setAnimating(false), 600);
      }
      return;
    }

    // 部署或法术
    if (selectedCardIdx === null) return;
    const card = g.player.hand[selectedCardIdx];
    if (!card) return;

    if (card.type === '法术') {
      setAnimating(true);
      const spellTarget = (card.name === '天火降临' || card.name === '混乱风暴') ? null : key;
      const result = castSpellWithSync(g, selectedCardIdx, spellTarget, 'player');
      if (result.success) {
        send('spell', {
          card: { name: card.name, type: card.type, skills: card.skills },
          targetKey: spellTarget,
          sync: result.sync,
        });
        syncState();
        finishRemoteGameOver(g);
        addTimer(() => setAnimating(false), 400);
      } else {
        setAnimating(false);
      }
      setSelectedCardIdx(null);
    } else {
      const result = deployUnitWithSync(g, selectedCardIdx, row, col, 'player');
      if (result.success) {
        send('deploy', { card, row, col, sync: result.sync });
        setDeployFlash({ key });
        addTimer(() => setDeployFlash(null), 600);
        syncState();
        finishRemoteGameOver(g);
        setSelectedCardIdx(null);
      }
    }
  }, [selectedCardIdx, animating, peerOnline, syncState, getHpSnapshot, detectDamage, addTimer, send, finishRemoteGameOver]);

  const handleEndTurn = useCallback((onComplete?: () => void) => {
    const g = gameRef.current;
    if (!g || g.currentPlayer !== 'player' || g.gameOver || animating) {
      onComplete?.();
      return;
    }
    if (!peerOnline) {
      onComplete?.();
      return;
    }
    if (g.sniperMode || g.sniperQueue.length > 0) {
      onComplete?.();
      return;
    }

    setSelectedCardIdx(null);
    endTurn(g);

    if (g.sniperMode) {
      pendingAfterSnipeRef.current = () => runPlayerAttackPhase(onComplete);
      syncState();
      onComplete?.();
      return;
    }

    runPlayerAttackPhase(onComplete);
  }, [animating, peerOnline, syncState, runPlayerAttackPhase]);

  const handleSurrender = useCallback((): boolean => {
    const g = gameRef.current;
    if (!g || g.gameOver) return false;
    if (window.confirm('确认认输？')) {
      g.gameOver = true;
      g.winner = 'enemy';
      g.phase = 'game_over';
      g.log.push({ id: Date.now(), msg: '🏳️ 你已认输', type: 'player' });
      syncState();
      send('surrender', {});
      clearLocalGameState(sessionRef.current);
    clearSession();
      sessionRef.current = null;
      return true;
    }
    return false;
  }, [syncState, send]);

  const handleRestart = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const setMultiplayerMode = useCallback(() => { /* no-op */ }, []);

  const forceSync = useCallback(() => syncState(), [syncState]);

  const loadGameState = useCallback((s: GameState) => {
    gameRef.current = s;
    syncState();
  }, [syncState]);

  const mirrorEnemyDeployAt = useCallback((row: number, col: number, card: CardDef) => {
    if (!gameRef.current) return;
    mirrorEnemyDeploy(gameRef.current, card, row, col);
    syncState();
  }, [syncState]);

  const mirrorEnemySpellAt = useCallback((card: { name: string; type: string; skills: string[] }, targetKey: BoardKey | null) => {
    if (!gameRef.current) return;
    mirrorEnemySpell(gameRef.current, card, targetKey);
    syncState();
  }, [syncState]);

  const snipeAndAttack = useCallback((targetKey: BoardKey) => {
    const g = gameRef.current;
    if (!g || !g.sniperMode) return;
    setAnimating(true);
    const beforeHps = getHpSnapshot(g);
    resolveAllSnipers(g, targetKey);
    detectDamage(beforeHps, g);
    syncState();
    setShakeCell(targetKey);
    addTimer(() => setShakeCell(null), 500);
    addTimer(() => setAnimating(false), 600);
  }, [syncState, getHpSnapshot, detectDamage, addTimer]);

  const runAttackSequenceFor = useCallback((who: 'player' | 'enemy', onComplete: () => void) => {
    const g = gameRef.current;
    if (!g) { onComplete(); return; }
    setAnimating(true);
    const order = getAttackOrder(g, who);
    if (order.length === 0) {
      setAnimating(false);
      onComplete();
      return;
    }
    let idx = 0;
    const step = () => {
      const s = gameRef.current;
      if (!s || s.gameOver) { setAttackLine(null); setAnimating(false); onComplete(); return; }
      while (idx < order.length) { if ((who === 'player' ? s.player.board : s.enemy.board)[order[idx].key]) break; idx++; }
      if (idx >= order.length) { setAttackLine(null); setAnimating(false); onComplete(); return; }
      const { key, unit } = order[idx];
      const targets = getTargetsInRange(s, unit, who);
      const target = targets.length > 0 ? targets[0] : null;
      s.attackingUnit = key;
      if (target) setAttackLine({ from: key, to: target.key });
      syncState();
      const beforeHps = getHpSnapshot(s);
      const evt = executeSingleAttack(s, key, who);
      if (evt && who === 'player') {
        send('attack', {
          fromKey: key,
          toKey: evt.targetKey,
          amount: evt.amount,
          dodged: evt.isDodged ?? false,
          blocked: evt.isBlocked ?? false,
        });
      }
      detectDamage(beforeHps, s);
      checkGameOver(s);
      syncState();
      if (s.gameOver) {
        setAttackLine(null);
        setAnimating(false);
        onComplete();
        return;
      }
      idx++;
      addTimer(() => { if (gameRef.current) { clearAttackingUnit(gameRef.current); setAttackLine(null); syncState(); } }, LOCAL_ATTACK_CLEAR_MS);
      addTimer(step, LOCAL_ATTACK_STEP_MS);
    };
    step();
  }, [syncState, getHpSnapshot, detectDamage, addTimer, send]);

  const advanceTurn = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    finishPlayerTurn(g);
    advanceToPlayerTurn(g);
    syncState();
  }, [syncState]);

  // ======== Actions ========
  const createRoom = useCallback((customDeck?: CardDef[]) => {
    const deckStr = customDeck ? serializeDeck(customDeck) : null;
    setMyDeckData(deckStr);
    myDeckDataRef.current = deckStr;
    if (!send('create_room', { deckData: deckStr })) return;
    setPhase('creating_room');
  }, [send]);

  const joinRoom = useCallback((room: string, customDeck?: CardDef[]) => {
    const deckStr = customDeck ? serializeDeck(customDeck) : null;
    setMyDeckData(deckStr);
    myDeckDataRef.current = deckStr;
    if (!send('join_room', { roomId: room.trim().toUpperCase(), deckData: deckStr })) return;
    setPhase('joining');
  }, [send]);

  const selectFaction = useCallback((f: Faction, customDeck?: CardDef[]) => {
    setFaction(f);
    factionRef.current = f;
    let deckStr = myDeckDataRef.current;
    if (customDeck) {
      deckStr = serializeDeck(customDeck);
      setMyDeckData(deckStr);
      myDeckDataRef.current = deckStr;
    }
    const rid = sessionRef.current?.roomId || roomId;
    if (!send('select_faction', { roomId: rid, faction: f, deckData: deckStr })) return;
    setPhase('waiting_faction');
  }, [send, roomId]);

  const resetError = useCallback(() => setError(null), []);

  // 派生状态
  const isInGame = gameState !== null && gameState.phase !== 'game_over';
  const isMyTurn = gameState?.currentPlayer === 'player' || false;

  // MultiplayerLobby 兼容属性
  const room: RoomInfo | null = useMemo(() => {
    if (!roomId) return null;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    return {
      roomId,
      inviteUrl: `${baseUrl}?room=${roomId}`,
      role: (playerRole ?? roleRef.current ?? 'host') as 'host' | 'guest',
    };
  }, [roomId, playerRole]);
  const enemySelected = enemyFaction !== null;
  const errorMsg = error ?? '';

  return {
    // 核心状态
    wsState, phase, roomId, playerId, faction, gameState, enemyFaction,
    myDeckData, countdown, error,
    // 重连状态
    connectionStatus, peerOnline,
    // 派生状态
    isInGame, isMyTurn, room, enemySelected, errorMsg,
    // 基础方法
    connect, disconnect, reconnect, createRoom, joinRoom, selectFaction,
    send, resetError,
    // GameBoard 兼容
    selectedCardIdx, animating, deployFlash, damagePopups,
    shakeCell, attackLine, skillFloats, aiDeploying,
    selectCard, handleCellClick, handleEndTurn, handleSurrender,
    handleRestart, setMultiplayerMode, forceSync, loadGameState,
    mirrorEnemyDeployAt, mirrorEnemySpellAt, snipeAndAttack,
    runAttackSequenceFor, advanceTurn,
    getHighlightCells, getSnipeTargets, getEnemyFrontExists, getPlayerFrontExists,
  };
}
