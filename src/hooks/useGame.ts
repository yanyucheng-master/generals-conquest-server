import { useState, useCallback, useRef } from 'react';
import type { GameState, Faction, BoardKey, AttackLine, CardDef } from '@/types/game';
import {
  createGame,
  deployUnit,
  castSpell,
  endTurn,
  resolveSniper,
  getTargetsInRange,
  isRowEmpty,
  getAttackOrder,
  executeSingleAttack,
  clearAttackingUnit,
  pickAutoTarget,
  doAITurnDeploy,
  doAITurnResource,
  advanceToPlayerTurn,
  moveAgileUnit,
  mirrorEnemyDeploy,
  mirrorEnemySpell,
  combatPhaseStart,
} from '@/engine/gameEngine';

// 飘字条目
interface FloatText {
  id: number;
  key: BoardKey;
  text: string;
  color: string; // tailwind text color class
}

export function useGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [agileSourceKey, setAgileSourceKey] = useState<BoardKey | null>(null);
  const [animating, setAnimating] = useState(false);
  // 特效状态
  const [deployFlash, setDeployFlash] = useState<{ key: BoardKey; id: number } | null>(null);
  const [damagePopups, setDamagePopups] = useState<{ key: BoardKey; amount: number; id: number }[]>([]);
  const [shakeCell, setShakeCell] = useState<BoardKey | null>(null);
  const [aiDeploying, setAiDeploying] = useState(false);
  // 攻击连线
  const [attackLine, setAttackLine] = useState<AttackLine | null>(null);
  // 技能飘字
  const [skillFloats, setSkillFloats] = useState<FloatText[]>([]);

  const gameRef = useRef<GameState | null>(null);
  // 联机模式标志：true时跳过AI回合
  const isMultiplayerModeRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const idRef = useRef(0);

  const clearTimers = () => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
  };

  const addTimer = (fn: () => void, delay: number) => {
    const t = setTimeout(fn, delay);
    timersRef.current.push(t);
  };

  const nextId = () => ++idRef.current;

  const syncState = useCallback(() => {
    if (gameRef.current) {
      const s = gameRef.current;
      // 深拷贝关键对象，确保 React 检测到变化并重新渲染
      setGameState({
        ...s,
        player: { ...s.player, board: { ...s.player.board } },
        enemy: { ...s.enemy, board: { ...s.enemy.board } },
        log: [...s.log],
      });
    }
  }, []);

  // 显示部署闪光
  const showDeployFlash = useCallback((key: BoardKey) => {
    const id = nextId();
    setDeployFlash({ key, id });
    addTimer(() => setDeployFlash(null), 600);
  }, []);

  // 显示伤害飘字
  const showDamagePopup = useCallback((key: BoardKey, amount: number) => {
    if (amount <= 0) return;
    const id = nextId();
    setDamagePopups(prev => [...prev, { key, amount, id }]);
    addTimer(() => setDamagePopups(prev => prev.filter(p => p.id !== id)), 1200);
  }, []);

  // 显示技能飘字
  const showSkillFloat = useCallback((key: BoardKey, text: string, color: string) => {
    const id = nextId();
    setSkillFloats(prev => [...prev, { key, text, color, id }]);
    addTimer(() => setSkillFloats(prev => prev.filter(p => p.id !== id)), 1500);
  }, []);

  // 显示格子震动
  const showShake = useCallback((key: BoardKey) => {
    setShakeCell(key);
    addTimer(() => setShakeCell(null), 400);
  }, []);

  // 获取当前所有单位的HP快照
  const getHpSnapshot = useCallback((state: GameState): Record<string, number> => {
    const hps: Record<string, number> = {};
    hps['0-1'] = state.enemy.hp;
    hps['3-1'] = state.player.hp;
    for (const [k, u] of Object.entries(state.enemy.board)) hps[k] = u.hp;
    for (const [k, u] of Object.entries(state.player.board)) hps[k] = u.hp;
    return hps;
  }, []);

  // 解析log中的技能触发，生成飘字
  const parseSkillFloats = useCallback((state: GameState) => {
    const recentLogs = state.log.slice(-5);
    for (const log of recentLogs) {
      const msg = log.msg;
      // 在对应单位上飘技能名称
      const skillPatterns: { pattern: string; text: string; color: string }[] = [
        // ⚠️ 匹配顺序：长的在前，避免"闪避"先于"飞翔闪避"匹配
        { pattern: '飞翔闪避', text: '🕊️ 飞翔闪避!', color: 'text-cyan-300' },
        { pattern: '法力增幅', text: '✨ 法力增幅!', color: 'text-purple-300' },
        { pattern: '护甲抵消', text: '🛡️ 抵消!', color: 'text-blue-400' },
        { pattern: '护甲破碎', text: '💥 破碎!', color: 'text-orange-400' },
        { pattern: '反弹法术', text: '🔮 反弹!', color: 'text-purple-400' },
        { pattern: '闪击', text: '⚡ 闪击!', color: 'text-yellow-300' },
        { pattern: '毒爆', text: '💣 毒爆!', color: 'text-green-400' },
        { pattern: '撕裂', text: '🔪 撕裂!', color: 'text-red-400' },
        { pattern: '流血', text: '🩸 流血!', color: 'text-red-500' },
        { pattern: '伏击', text: '⚡ 伏击!', color: 'text-yellow-400' },
        { pattern: '闪避', text: '💨 闪避!', color: 'text-green-400' },
        { pattern: '吸血', text: '💚 吸血!', color: 'text-pink-400' },
        { pattern: '萃取', text: '💰 萃取!', color: 'text-yellow-400' },
        { pattern: '复仇', text: '😠 复仇!', color: 'text-red-400' },
        { pattern: '冻结', text: '❄️ 冻结!', color: 'text-cyan-400' },
        { pattern: '沉默', text: '🔇 沉默!', color: 'text-gray-400' },
        { pattern: '叱吓', text: '😤 叱吓!', color: 'text-red-300' },
        { pattern: '嘲讽', text: '🛡️ 嘲讽!', color: 'text-blue-300' },
        { pattern: '贯穿', text: '🔱 贯穿!', color: 'text-orange-300' },
        { pattern: '强运', text: '🍀 强运!', color: 'text-green-300' },
        { pattern: '利息', text: '💰 利息!', color: 'text-yellow-300' },
        { pattern: '悬赏', text: '💎 悬赏!', color: 'text-yellow-300' },
        { pattern: '生长', text: '🌱 生长!', color: 'text-green-300' },
        { pattern: '迷雾', text: '🌫️ 迷雾!', color: 'text-gray-300' },
        { pattern: '均衡', text: '⚖️ 均衡!', color: 'text-blue-300' },
        { pattern: '谜境', text: '🔮 谜境!', color: 'text-purple-300' },
        { pattern: '疾风步', text: '💨 疾风步!', color: 'text-cyan-300' },
        { pattern: '魔术', text: '🪄 魔术!', color: 'text-pink-300' },
        { pattern: '护盾术', text: '🛡️ 护盾!', color: 'text-blue-400' },
        { pattern: '集火令', text: '🎯 集火!', color: 'text-red-400' },
        { pattern: '反击', text: '🔄 反击!', color: 'text-orange-400' },
        { pattern: '狙击', text: '🎯 狙击!', color: 'text-purple-400' },
        { pattern: '荒野呼唤', text: '🌿 呼唤!', color: 'text-green-400' },
      ];

      for (const sp of skillPatterns) {
        if (msg.includes(sp.pattern)) {
          // 找到单位所在的格子
          const unitKeys = findUnitKeysByName(state, msg);
          for (const uk of unitKeys) {
            showSkillFloat(uk, sp.text, sp.color);
          }
          break;
        }
      }
    }
  }, [showSkillFloat]);

  // 根据log中的单位名称找到格子
  const findUnitKeysByName = (state: GameState, msg: string): BoardKey[] => {
    const keys: BoardKey[] = [];
    for (const [k, u] of Object.entries(state.enemy.board)) {
      if (msg.includes(u.name)) { keys.push(k as BoardKey); break; }
    }
    for (const [k, u] of Object.entries(state.player.board)) {
      if (msg.includes(u.name)) { keys.push(k as BoardKey); break; }
    }
    // 如果没找到具体单位，返回HQ
    if (keys.length === 0) {
      if (msg.includes('总部') || msg.includes('HQ')) keys.push('0-1');
    }
    return keys;
  };

  // 检测伤害并触发特效
  const detectDamage = useCallback((beforeHps: Record<string, number>, state: GameState) => {
    const afterHps = getHpSnapshot(state);
    for (const [k, prevHp] of Object.entries(beforeHps)) {
      const newHp = afterHps[k] || 0;
      if (newHp < prevHp) {
        const dmg = prevHp - newHp;
        showDamagePopup(k as BoardKey, dmg);
        showShake(k as BoardKey);
      }
    }
    // 解析技能飘字
    parseSkillFloats(state);
  }, [showDamagePopup, showShake, getHpSnapshot, parseSkillFloats]);

  // ====== 异步攻击序列（1秒间隔） ======
  const runAttackSequence = useCallback((who: 'player' | 'enemy', onComplete: () => void) => {
    const state = gameRef.current;
    if (!state || state.gameOver) { onComplete(); return; }

    const order = getAttackOrder(state, who);
    if (order.length === 0) { onComplete(); return; }

    let idx = 0;

    const step = () => {
      const s = gameRef.current;
      if (!s || s.gameOver) { setAttackLine(null); onComplete(); return; }

      // 跳过已不存在的单位
      while (idx < order.length) {
        const board = who === 'player' ? s.player.board : s.enemy.board;
        if (board[order[idx].key]) break;
        idx++;
      }

      if (idx >= order.length) { setAttackLine(null); onComplete(); return; }

      const { key, unit } = order[idx];

      // 找到攻击目标（用于画连线）
      const targetInfo = pickAutoTarget(s, unit, who);
      const targetKey = targetInfo?.key || null;

      // 设置攻击高亮和连线
      s.attackingUnit = key;
      if (targetKey) {
        setAttackLine({ from: key, to: targetKey });
      }
      syncState();

      // 执行攻击
      const beforeHps = getHpSnapshot(s);
      executeSingleAttack(s, key, who);
      detectDamage(beforeHps, s);
      syncState();
      idx++;

      // 500ms后清除连线和部分高亮
      addTimer(() => {
        if (gameRef.current) {
          clearAttackingUnit(gameRef.current);
          setAttackLine(null);
          syncState();
        }
      }, 500);

      // 1000ms后下一个单位
      addTimer(step, 1000);
    };

    step();
  }, [syncState, detectDamage, getHpSnapshot]);

  // ====== AI部署序列（逐张，1.2秒/张） ======
  const runAIDeploySequence = useCallback((onComplete: () => void) => {
    const state = gameRef.current;
    if (!state || state.gameOver) { onComplete(); return; }

    const tryDeploy = () => {
      const s = gameRef.current;
      if (!s || s.gameOver) { onComplete(); return; }

      const result = doAITurnDeploy(s);
      if (result) {
        const key: BoardKey = `${result.row}-${result.col}`;
        showDeployFlash(key);
        syncState();
        addTimer(tryDeploy, 1200);
      } else {
        onComplete();
      }
    };

    setAiDeploying(true);
    addTimer(() => {
      tryDeploy();
      addTimer(() => setAiDeploying(false), 100);
    }, 500);
  }, [syncState, showDeployFlash]);

  const startGame = useCallback((playerFaction: Faction, playerCustomCards?: CardDef[], enemyCustomCards?: CardDef[]) => {
    const factions: Faction[] = ['empire', 'wild', 'arcane'];
    const enemyFaction = factions.filter(f => f !== playerFaction)[Math.floor(Math.random() * 2)];
    const state = createGame(playerFaction, enemyFaction, undefined, playerCustomCards, enemyCustomCards);
    gameRef.current = state;
    syncState();
    setSelectedCardIdx(null);
    setAnimating(false);
    setAttackLine(null);
    setSkillFloats([]);
    clearTimers();

    addTimer(() => {
      if (gameRef.current) {
        gameRef.current.showTurnBanner = null;
        syncState();
      }
    }, 1500);
  }, [syncState]);

  const selectCard = useCallback((idx: number) => {
    const state = gameRef.current;
    if (!state || state.currentPlayer !== 'player' || state.gameOver || state.sniperMode) return;
    const card = state.player.hand[idx];
    if (!card) return;
    if (card.type === '士兵' && state.player.spellOnlyNextTurn) return;
    let cost = card.cost;
    if (state.player.discountNext > 0 && card.type === '士兵') {
      cost = Math.max(0, cost - state.player.discountNext);
    }
    if (cost > state.player.gold) return;
    setAgileSourceKey(null);
    setSelectedCardIdx(prev => prev === idx ? null : idx);
  }, []);

  const handleCellClick = useCallback((row: number, col: number) => {
    const state = gameRef.current;
    if (!state || state.currentPlayer !== 'player' || state.gameOver) return;
    const key: BoardKey = `${row}-${col}`;

    if (state.sniperMode && state.sniperQueue.length > 0) {
      if (row >= 2) return;
      resolveSniper(state, key);
      syncState();
      runFullAIResponse();
      return;
    }

    if (selectedCardIdx === null) {
      if (agileSourceKey) {
        if (moveAgileUnit(state, agileSourceKey, key, 'player')) {
          showDeployFlash(key);
          setAgileSourceKey(null);
          syncState();
        } else {
          const unit = state.player.board[key];
          if (unit?.skills.includes('agile') && !unit.agileUsed && (row === 2 || row === 3) && !(row === 3 && col === 1)) {
            setAgileSourceKey(key);
          } else {
            setAgileSourceKey(null);
          }
        }
        return;
      }
      const agileUnit = state.player.board[key];
      if (agileUnit?.skills.includes('agile') && !agileUnit.agileUsed && (row === 2 || row === 3) && !(row === 3 && col === 1)) {
        setAgileSourceKey(key);
        return;
      }
      return;
    }
    const card = state.player.hand[selectedCardIdx];
    if (!card) return;

    if (card.type === '士兵') {
      if (state.player.spellOnlyNextTurn) return;
      if (row !== 2 && row !== 3) return;
      if (row === 3 && col === 1) return;
      if (deployUnit(state, selectedCardIdx, row, col, 'player')) {
        showDeployFlash(key);
        setSelectedCardIdx(null);
        syncState();
        // 沉默：部署后200ms在敌方所有单位上显示沉默飘字
        if (card.skills.includes('silence')) {
          addTimer(() => {
            const g = gameRef.current;
            if (!g) return;
            for (const enemyKey of Object.keys(g.enemy.board)) {
              showSkillFloat(enemyKey as BoardKey, '🔇 沉默!', 'text-gray-400');
            }
          }, 200);
        }
      }
    } else if (card.type === '法术') {
      if (card.name === '天火降临' || card.name === '混乱风暴') {
        castSpell(state, selectedCardIdx, null, 'player');
        showSkillFloat('0-1', card.name === '天火降临' ? '🔥 天火!' : '🌪️ 混乱!', card.name === '天火降临' ? 'text-orange-400' : 'text-purple-300');
        setSelectedCardIdx(null);
        syncState();
        return;
      }
      if (card.skills.includes('magicDmg') || card.skills.includes('focusFire') || card.skills.includes('destroy')) {
        if (row < 0 || row > 1) return;
        // 免疫单位不能被法术指定（末日审判也受免疫影响）
        const targetUnit = state.enemy.board[key];
        if (targetUnit && targetUnit.skills.includes('immune')) return;
        castSpell(state, selectedCardIdx, key, 'player');
        // 法术飘字
        if (card.skills.includes('destroy')) {
          showSkillFloat(key, '☠️ 消灭!', 'text-red-500');
        } else {
          showSkillFloat(key, '💥 法术!', 'text-purple-400');
        }
        setSelectedCardIdx(null);
        syncState();
      } else if (card.skills.includes('shield')) {
        if (row !== 2 && row !== 3) return;
        const targetExists = row === 3 && col === 1 ? true : !!state.player.board[key];
        if (targetExists) {
          castSpell(state, selectedCardIdx, key, 'player');
          showSkillFloat(key, '🛡️ 护盾!', 'text-blue-400');
          setSelectedCardIdx(null);
          syncState();
        }
      } else if (card.skills.includes('tear') && card.skills.includes('poisonBurst')) {
        // 荒野呼唤：对指定单位使用
        if (row < 0 || row > 1) return;
        castSpell(state, selectedCardIdx, key, 'player');
        showSkillFloat(key, '🔪 撕裂!', 'text-red-400');
        setSelectedCardIdx(null);
        syncState();
      } else if (card.skills.includes('magicSwap') && card.name === '疾风步') {
        // 疾风步：指定1个敌方单位
        if (row < 0 || row > 1) return;
        castSpell(state, selectedCardIdx, key, 'player');
        showSkillFloat(key, '🪄 疾风步!', 'text-purple-400');
        setSelectedCardIdx(null);
        syncState();
      } else {
        castSpell(state, selectedCardIdx, null, 'player');
        // 根据法术类型飘字（均衡飘字在 combatPhaseStart 时统一显示）
        if (card.skills.includes('magicSwap')) {
          showSkillFloat('0-1', '🪄 魔术!', 'text-purple-400');
        } else if (card.skills.includes('fog')) {
          showSkillFloat('3-1', '🌫️ 迷雾!', 'text-gray-400');
        } else if (card.skills.includes('silence')) {
          showSkillFloat('0-1', '🔇 沉默!', 'text-gray-400');
        } else if (card.skills.includes('refreshBoost')) {
          showSkillFloat('3-1', '✨ 刷新增幅!', 'text-purple-300');
        } else if (card.skills.includes('cleanseSilence')) {
          showSkillFloat('3-1', '🌟 净化!', 'text-green-300');
        } else if (card.skills.includes('heal')) {
          showSkillFloat(key, '💚 治疗!', 'text-green-400');
        } else if (card.skills.includes('aoeHeal')) {
          showSkillFloat('3-1', '💚 群体治疗!', 'text-green-400');
        } else if (card.skills.includes('drawCard')) {
          showSkillFloat('3-1', '📜 抽卡!', 'text-blue-400');
        } else if (card.skills.includes('discard')) {
          showSkillFloat('0-1', '🗑️ 弃牌!', 'text-orange-400');
        } else if (card.skills.includes('healHQ')) {
          showSkillFloat('3-1', '💚 总部恢复!', 'text-green-400');
        }
        setSelectedCardIdx(null);
        syncState();
      }
    }
  }, [selectedCardIdx, syncState, showDeployFlash]);

  const handleEndTurn = useCallback((onComplete?: () => void) => {
    const state = gameRef.current;
    if (!state || state.currentPlayer !== 'player' || state.gameOver) {
      onComplete?.();
      return;
    }
    // P0: 狙击阶段禁止结束回合
    if (state.sniperMode || state.sniperQueue.length > 0) {
      onComplete?.();
      return;
    }

    setAnimating(true);
    endTurn(state);

    if (state.sniperMode) {
      syncState();
      setAnimating(false);
      onComplete?.();
      return;
    }

    // 战斗阶段开始：触发部署自带的均衡等技能，如有均衡则显示飘字
    const hasBalance = combatPhaseStart(state, 'player');
    if (hasBalance) showSkillFloat('3-1', '⚖️ 均衡!', 'text-yellow-400');

    runAttackSequence('player', () => {
      const s = gameRef.current;
      if (!s || s.gameOver) { setAnimating(false); onComplete?.(); return; }

      if (isMultiplayerModeRef.current) {
        // 联机模式：跳过AI回合，等待对手操作
        setAnimating(false);
        syncState();
        onComplete?.(); // P0: 攻击完成后再回调，避免竞态
        return;
      }

      doAITurnResource(s);
      syncState();

      runAIDeploySequence(() => {
        runAttackSequence('enemy', () => {
          const final = gameRef.current;
          if (!final || final.gameOver) { setAnimating(false); onComplete?.(); return; }
          advanceToPlayerTurn(final);
          syncState();

          addTimer(() => {
            if (gameRef.current) {
              gameRef.current.showTurnBanner = gameRef.current.turn;
              syncState();
              addTimer(() => {
                if (gameRef.current) {
                  gameRef.current.showTurnBanner = null;
                  syncState();
                }
              }, 1500);
            }
          }, 100);

          setAnimating(false);
          syncState();
          onComplete?.();
        });
      });
    });
  }, [syncState, runAttackSequence, runAIDeploySequence]);

  const runFullAIResponse = useCallback(() => {
    setAnimating(true);
    const s = gameRef.current;
    if (!s || s.gameOver) { setAnimating(false); return; }
    doAITurnResource(s);
    syncState();

    // ✅ AI回合战斗阶段开始：触发部署自带的均衡等技能
    combatPhaseStart(s, 'enemy');

    runAIDeploySequence(() => {
      runAttackSequence('enemy', () => {
        const final = gameRef.current;
        if (!final || final.gameOver) { setAnimating(false); return; }
        advanceToPlayerTurn(final);
        syncState();
        addTimer(() => {
          if (gameRef.current) {
            gameRef.current.showTurnBanner = gameRef.current.turn;
            syncState();
            addTimer(() => {
              if (gameRef.current) {
                gameRef.current.showTurnBanner = null;
                syncState();
              }
            }, 1500);
          }
        }, 100);
        setAnimating(false);
        syncState();
      });
    });
  }, [syncState, runAttackSequence, runAIDeploySequence]);

  // 联机模式专用：狙击目标选择后继续执行攻击序列
  const snipeAndAttack = useCallback((targetKey: BoardKey, onComplete: () => void) => {
    const state = gameRef.current;
    if (!state) { onComplete(); return; }
    resolveSniper(state, targetKey);
    syncState();
    // ✅ 战斗阶段开始：触发部署自带的均衡等技能
    const hasBalanceSnipe = combatPhaseStart(state, 'player');
    if (hasBalanceSnipe) showSkillFloat('3-1', '⚖️ 均衡!', 'text-yellow-400');
    runAttackSequence('player', () => {
      setAnimating(false);
      syncState();
      onComplete();
    });
  }, [syncState, runAttackSequence]);

  const handleSurrender = useCallback((): boolean => {
    const state = gameRef.current;
    if (!state || state.gameOver) return false;
    if (window.confirm('确认认输？')) {
      state.gameOver = true;
      state.winner = 'enemy';
      state.phase = 'game_over';
      syncState();
      return true; // P0: 确认后才返回true
    }
    return false; // P0: 取消返回false
  }, [syncState]);

  const handleRestart = useCallback(() => {
    clearTimers();
    gameRef.current = null;
    setGameState(null);
    setSelectedCardIdx(null);
    setAnimating(false);
    setDeployFlash(null);
    setDamagePopups([]);
    setShakeCell(null);
    setAiDeploying(false);
    setAttackLine(null);
    setSkillFloats([]);
  }, []);

  const getHighlightCells = useCallback(() => {
    const state = gameRef.current;
    if (!state || selectedCardIdx === null) return new Set<BoardKey>();
    const card = state.player.hand[selectedCardIdx];
    if (!card) return new Set<BoardKey>();
    const cells = new Set<BoardKey>();
    if (card.type === '士兵') {
      if (state.player.spellOnlyNextTurn) return cells;
      for (let r of [2, 3]) {
        for (let c = 0; c < 3; c++) {
          if (r === 3 && c === 1) continue;
          cells.add(`${r}-${c}`);
        }
      }
    } else if (card.type === '法术') {
      if (card.name === '天火降临' || card.name === '混乱风暴') {
        cells.add('3-1');
        return cells;
      }
      if (card.skills.includes('magicDmg') || card.skills.includes('focusFire') || card.skills.includes('destroy')) {
        for (let r = 0; r <= 1; r++) for (let c = 0; c < 3; c++) {
          const k = `${r}-${c}` as BoardKey;
          // 免疫：不能被法术指定为目标（末日审判的 destroy 也受免疫影响）
          const u = state.enemy.board[k];
          if (u && u.skills.includes('immune')) continue;
          cells.add(k);
        }
      } else if (card.skills.includes('shield')) {
        cells.add('3-1');
        for (let c = 0; c < 3; c++) {
          if (state.player.board[`2-${c}`]) cells.add(`2-${c}`);
          if (state.player.board[`3-${c}`]) cells.add(`3-${c}`);
        }
      } else if (card.skills.includes('tear') && card.skills.includes('poisonBurst')) {
        // 荒野呼唤：对指定单位使用撕裂+毒爆
        for (let r = 0; r <= 1; r++) for (let c = 0; c < 3; c++) {
          cells.add(`${r}-${c}` as BoardKey);
        }
      } else if (card.skills.includes('magicSwap') && card.name === '疾风步') {
        // 疾风步：指定1个敌方单位交换位置
        for (let r = 0; r <= 1; r++) for (let c = 0; c < 3; c++) {
          cells.add(`${r}-${c}` as BoardKey);
        }
      }
    }
    return cells;
  }, [selectedCardIdx]);

  const getSnipeTargets = useCallback(() => {
    const state = gameRef.current;
    if (!state || !state.sniperMode || state.sniperQueue.length === 0) return new Set<BoardKey>();
    const unit = state.sniperQueue[0];
    const targets = getTargetsInRange(state, unit, 'player');
    return new Set(targets.map(t => t.key));
  }, [gameState?.sniperMode]);

  const getEnemyFrontExists = useCallback(() => {
    if (!gameRef.current) return true;
    return !isRowEmpty(gameRef.current, 1);
  }, [gameState]);

  const getPlayerFrontExists = useCallback(() => {
    if (!gameRef.current) return true;
    return !isRowEmpty(gameRef.current, 2);
  }, [gameState]);

  // 设置联机模式（true=跳过AI回合）
  const setMultiplayerMode = useCallback((enabled: boolean) => {
    isMultiplayerModeRef.current = enabled;
  }, []);

  // 强制同步状态到React（联机模式用，外部修改gameRef后刷新UI）
  const forceSync = useCallback(() => {
    syncState();
  }, [syncState]);

  // 加载游戏状态（联机模式用，用种子创建游戏后加载）
  const loadGameState = useCallback((newState: GameState) => {
    gameRef.current = newState;
    syncState();
  }, [syncState]);

  // 镜像敌方部署（联机同步用）：直接在 gameRef.current 上操作
  const mirrorEnemyDeployAt = useCallback((row: number, col: number, card: CardDef) => {
    if (!gameRef.current) return;
    mirrorEnemyDeploy(gameRef.current, card, row, col);
    syncState();
  }, [syncState]);

  // 镜像敌方法术（联机同步用）：直接在 gameRef.current 上操作
  const mirrorEnemySpellAt = useCallback((card: CardDef, targetKey: BoardKey) => {
    if (!gameRef.current) return;
    mirrorEnemySpell(gameRef.current, card, targetKey);
    syncState();
  }, [syncState]);

  // 执行指定方的攻击序列（联机模式用）
  const runAttackSequenceFor = useCallback((who: 'player' | 'enemy', onComplete: () => void) => {
    runAttackSequence(who, onComplete);
  }, [runAttackSequence]);

  // 切换回玩家回合（联机模式用）
  const advanceTurn = useCallback(() => {
    const state = gameRef.current;
    if (!state || state.gameOver) return;
    advanceToPlayerTurn(state);
    syncState();
  }, [syncState]);

  return {
    gameState,
    selectedCardIdx,
    animating,
    deployFlash,
    damagePopups,
    shakeCell,
    aiDeploying,
    attackLine,
    skillFloats,
    startGame,
    selectCard,
    handleCellClick,
    handleEndTurn,
    handleSurrender,
    handleRestart,
    setMultiplayerMode,
    forceSync,
    loadGameState,
    mirrorEnemyDeployAt,
    mirrorEnemySpellAt,
    snipeAndAttack,
    runAttackSequenceFor,
    advanceTurn,
    getHighlightCells,
    getSnipeTargets,
    getEnemyFrontExists,
    getPlayerFrontExists,
  };
}
