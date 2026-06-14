import { useState, useEffect, useRef } from 'react';
import type { MultiplayerPhase } from '@/types/multiplayer';
import type { Faction, CardDef } from '@/types/game';
import { FACTIONS } from '@/data/cards';
import { setServerUrl, getEffectiveWsUrl, isPublicServerMode, getConfiguredWsUrl } from '@/hooks/useMultiplayer';
import { loadDeck, loadDIYCards } from '@/data/diySystem';
import { getDeckCards } from '@/data/diySystem';
import { ALL_CARDS } from '@/data/cards';
import {
  Copy, Check, ArrowLeft, Loader2,
  Clock, AlertTriangle, Settings, Wifi, Monitor, Smartphone,
  Library, Swords, WifiOff, RefreshCw,
} from 'lucide-react';
import type { ConnectionStatus } from '@/hooks/useMultiplayer';

interface Props {
  phase: MultiplayerPhase;
  room: { roomId: string; inviteUrl: string; role: 'host' | 'guest' } | null;
  myFaction: Faction | null;
  enemySelected: boolean;
  errorMsg: string;
  connectionStatus: ConnectionStatus;
  peerOnline: boolean;
  wsReady: boolean;
  onBack: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onSelectFaction: (faction: Faction, customDeck?: CardDef[]) => void;
  onReconnect: () => void;
}

export default function MultiplayerLobby({
  phase, room, myFaction, enemySelected, errorMsg,
  connectionStatus, peerOnline, wsReady,
  onBack, onCreateRoom, onJoinRoom, onSelectFaction, onReconnect,
}: Props) {
  const publicMode = isPublicServerMode();
  const roomIdFromUrl = new URLSearchParams(window.location.search).get('room')?.toUpperCase() || '';
  const [joinId, setJoinId] = useState(roomIdFromUrl);
  const [copied, setCopied] = useState(false);
  const [serverUrl, setServerUrlState] = useState(getEffectiveWsUrl());
  const [showSettings, setShowSettings] = useState(false);
  const [lanMode, setLanMode] = useState<'none' | 'host' | 'client'>(publicMode ? 'host' : 'none');
  const [hostIp, setHostIp] = useState('');
  // 卡组选择状态
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  const [showDeckSelect, setShowDeckSelect] = useState(false);
  const [customDeckCards, setCustomDeckCards] = useState<CardDef[] | null>(null);
  const [deckError, setDeckError] = useState('');
  const autoJoinFromUrlRef = useRef(Boolean(roomIdFromUrl));

  // 加载玩家自创卡组
  const loadCustomDeck = (): CardDef[] | null => {
    const deckEntries = loadDeck();
    if (deckEntries.length === 0) return null;
    const diyCards = loadDIYCards();
    const cards = getDeckCards(deckEntries, ALL_CARDS, diyCards);
    return cards.length > 0 ? (cards as CardDef[]) : null;
  };

  useEffect(() => {
    if (!autoJoinFromUrlRef.current || !wsReady || !joinId.trim() || phase !== 'menu') return;
    autoJoinFromUrlRef.current = false;
    onJoinRoom(joinId.trim());
  }, [wsReady, joinId, phase, onJoinRoom]);

  const doSaveAndConnect = (url: string) => {
    setServerUrl(url);
    setServerUrlState(url);
    onReconnect();
  };

  // ==================== 创建/加入房间中 ====================
  if (phase === 'creating_room' || phase === 'joining') {
    return (
      <div className="release-screen w-full h-screen flex flex-col items-center justify-center">
        <div className="release-backdrop release-backdrop-menu" />
        <div className="release-vignette" />
        <div className="release-grain" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
          <p className="text-gray-300 text-sm">{phase === 'creating_room' ? '正在创建房间...' : '正在加入房间...'}</p>
        </div>
      </div>
    );
  }

  // ==================== 菜单 / 连接中 ====================
  if (phase === 'menu' || phase === 'connecting') {
    return (
      <div className="release-screen w-full h-screen flex flex-col items-center justify-center">
        <div className="release-backdrop release-backdrop-menu" />
        <div className="release-vignette" />
        <div className="release-grain" />

        <div className="release-lobby-panel relative z-10 flex flex-col items-center gap-4 px-4 w-full max-w-sm">
          <button onClick={onBack} className="release-back-button absolute -top-14 left-0">
            <ArrowLeft className="w-4 h-4" /> 返回
          </button>

          {/* 标题 */}
          <div className="text-center space-y-1">
            <Wifi className="w-8 h-8 text-green-400 mx-auto" />
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
              {publicMode ? '公网联机' : '局域网联机'}
            </h2>
            <p className="text-gray-400 text-xs">
              {publicMode ? '创建房间或输入房间ID加入对战' : '同一WiFi下即可对战'}
            </p>
          </div>

          {/* 连接状态 + 服务器地址 */}
          <div className="w-full bg-slate-950/70 border border-amber-700/20 rounded-lg p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {phase === 'connecting' ? (
                  <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                ) : (
                  <Wifi className="w-3.5 h-3.5 text-green-400" />
                )}
                <span className="text-[10px] text-gray-400">
                  {phase === 'connecting'
                    ? '连接中...'
                    : publicMode
                      ? '已连接到联机服务器'
                      : '已连接到本地服务器'}
                </span>
              </div>
              {!publicMode && (
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Settings className="w-3 h-3" />
                  {showSettings ? '收起' : '改IP'}
                </button>
              )}
            </div>

            {!showSettings && (
              <p className="text-[10px] text-gray-500 mt-1 truncate font-mono">
                {serverUrl || (publicMode ? getConfiguredWsUrl() : 'ws://localhost:3001')}
              </p>
            )}

            {!publicMode && showSettings && (
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrlState(e.target.value)}
                  placeholder="ws://192.168.x.x:3001"
                  className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-gray-300 text-xs font-mono focus:outline-none focus:border-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => doSaveAndConnect(serverUrl)}
                    className="flex-1 py-1 bg-blue-700 hover:bg-blue-600 rounded text-white text-xs font-bold cursor-pointer"
                  >
                    连接
                  </button>
                  <button
                    onClick={() => doSaveAndConnect('ws://localhost:3001')}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs cursor-pointer"
                  >
                    本机
                  </button>
                </div>
                <p className="text-[9px] text-gray-500">
                  主机填 localhost，客机填主机的局域网IP
                </p>
              </div>
            )}
          </div>

          {/* 连接中状态 */}
          {phase === 'connecting' ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-gray-400 text-sm">连接服务器...</p>
            </div>
          ) : publicMode ? (
            <>
              {/* 公网模式：创建 / 加入 */}
              <div className="w-full bg-blue-950/35 border border-blue-500/25 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-bold text-blue-400">创建房间</h3>
                <p className="text-[10px] text-gray-400">创建后把房间ID发给朋友，对方输入ID即可加入</p>
                <button
                  onClick={onCreateRoom}
                  disabled={!wsReady}
                  className={`w-full py-2 rounded text-white font-bold text-sm cursor-pointer transition-all ${wsReady ? 'bg-gradient-to-b from-blue-600 to-blue-800 hover:brightness-110 border border-blue-400/30' : 'bg-gray-600 cursor-not-allowed'}`}
                >
                  {wsReady ? '创建房间' : '连接服务器中...'}
                </button>
              </div>

              <div className="w-full bg-emerald-950/35 border border-emerald-500/25 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-bold text-green-400">加入房间</h3>
                <p className="text-[10px] text-gray-400">向房主索取房间ID，输入后点击加入</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                    placeholder="房间ID"
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-green-500"
                    maxLength={8}
                  />
                  <button
                    onClick={() => joinId && wsReady && onJoinRoom(joinId)}
                    disabled={!joinId || !wsReady}
                    className={`px-4 py-2 rounded text-white font-bold text-sm cursor-pointer ${joinId && wsReady ? 'bg-green-700 hover:bg-green-600' : 'bg-gray-600 cursor-not-allowed'}`}
                  >
                    {wsReady ? '加入' : '连接中'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 局域网模式选择 */}
              <div className="w-full grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLanMode('host')}
                  className={`p-3 rounded-lg border transition-all cursor-pointer text-left ${lanMode === 'host' ? 'bg-blue-900/40 border-blue-500' : 'bg-gray-900/80 border-gray-700 hover:border-gray-500'}`}
                >
                  <Monitor className="w-5 h-5 text-blue-400 mb-1" />
                  <div className="text-sm font-bold text-white">我当主机</div>
                  <div className="text-[10px] text-gray-400">运行服务器</div>
                </button>
                <button
                  onClick={() => setLanMode('client')}
                  className={`p-3 rounded-lg border transition-all cursor-pointer text-left ${lanMode === 'client' ? 'bg-green-900/40 border-green-500' : 'bg-gray-900/80 border-gray-700 hover:border-gray-500'}`}
                >
                  <Smartphone className="w-5 h-5 text-green-400 mb-1" />
                  <div className="text-sm font-bold text-white">我加入</div>
                  <div className="text-[10px] text-gray-400">连别人的主机</div>
                </button>
              </div>

              {/* 主机模式 */}
              {lanMode === 'host' && (
                <div className="w-full bg-blue-900/20 border border-blue-700/40 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-bold text-blue-400">主机设置</h3>
                  <div className="bg-black/40 rounded p-2 space-y-1">
                    <p className="text-[10px] text-gray-400">1. 先在本地启动服务器：</p>
                    <code className="text-[10px] text-yellow-400 font-mono bg-gray-800 px-1 rounded">node server/index.cjs</code>
                    <p className="text-[10px] text-gray-400 mt-1">2. 让朋友输入你的IP：</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={hostIp}
                        onChange={(e) => setHostIp(e.target.value)}
                        placeholder="你的IP，如 192.168.1.5"
                        className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-yellow-400 text-xs font-mono focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => { if (hostIp) { navigator.clipboard.writeText(`ws://${hostIp}:3001`).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2000); }}}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs cursor-pointer"
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-500">在cmd执行 ipconfig 查看IPv4地址</p>
                  </div>
                  <button
                    onClick={onCreateRoom}
                    disabled={!wsReady}
                    className={`w-full py-2 rounded text-white font-bold text-sm cursor-pointer ${wsReady ? 'bg-blue-700 hover:bg-blue-600' : 'bg-gray-600 cursor-not-allowed'}`}
                  >
                    {wsReady ? '创建房间' : '连接服务器中...'}
                  </button>
                </div>
              )}

              {/* 客机模式 */}
              {lanMode === 'client' && (
                <div className="w-full bg-green-900/20 border border-green-700/40 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-bold text-green-400">加入游戏</h3>
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400">第1步：输入主机的IP</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={serverUrl.replace('ws://', '').replace(':3001', '')}
                        onChange={(e) => {
                          const ip = e.target.value.trim();
                          setServerUrlState(ip ? `ws://${ip}:3001` : '');
                        }}
                        placeholder="如 192.168.1.5"
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-green-500"
                      />
                      <button
                        onClick={() => { if (serverUrl) doSaveAndConnect(serverUrl); }}
                        className="px-3 py-2 bg-green-700 hover:bg-green-600 rounded text-white text-xs font-bold cursor-pointer"
                      >
                        连接
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">第2步：输入房间ID</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={joinId}
                        onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                        placeholder="房间ID"
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-green-500"
                        maxLength={8}
                      />
                      <button
                        onClick={() => joinId && wsReady && onJoinRoom(joinId)}
                        disabled={!joinId || !wsReady}
                        className={`px-4 py-2 rounded text-white font-bold text-sm cursor-pointer ${joinId && wsReady ? 'bg-green-700 hover:bg-green-600' : 'bg-gray-600 cursor-not-allowed'}`}
                      >
                        {wsReady ? '加入' : '连接中'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {lanMode === 'none' && (
                <div className="w-full bg-gray-900/60 border border-gray-800 rounded-lg p-4">
                  <p className="text-xs text-gray-400 text-center">
                    确保所有设备连接同一WiFi<br />
                    选择上方模式开始联机
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ==================== 等待对手 ====================
  if (phase === 'waiting_peer') {
    return (
      <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: 'url(/bg_war_table.jpg)' }} />
        <div className="absolute inset-0 bg-black/70 z-[1]" />

        <div className="relative z-10 flex flex-col items-center gap-5 px-4">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
          <h2 className="text-xl font-bold text-white">等待对手加入...</h2>

          {room && (
            <div className="bg-gray-900/80 border border-gray-700 rounded-lg p-4 space-y-3 w-72">
              <div className="text-center">
                <p className="text-xs text-gray-400">房间ID</p>
                <p className="text-lg font-bold text-yellow-400 tracking-wider">{room.roomId}</p>
              </div>
              <div className="border-t border-gray-700 pt-3">
                <p className="text-xs text-gray-400 mb-1">告诉朋友输入此ID加入</p>
                <div className="flex gap-2">
                  <input type="text" readOnly value={room.roomId} className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-gray-300 text-xs font-mono" />
                  <button onClick={() => { navigator.clipboard.writeText(room.roomId).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2000); }} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs cursor-pointer">
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          )}
          <button onClick={onBack} className="text-gray-400 hover:text-white text-sm cursor-pointer">
            <ArrowLeft className="w-3 h-3 inline" /> 取消
          </button>
        </div>
      </div>
    );
  }

  // ==================== 选择阵营 ====================
  if (phase === 'select_faction' || phase === 'waiting_faction') {
    return (
      <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: 'url(/bg_war_table.jpg)' }} />
        <div className="absolute inset-0 bg-black/70 z-[1]" />

        <div className="relative z-10 flex flex-col items-center gap-5 px-4">
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>选择阵营</h2>

          <div className="flex gap-6 text-sm">
            <div className={`flex items-center gap-1.5 ${myFaction ? 'text-green-400' : 'text-yellow-400'}`}>
              {myFaction ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              你: {myFaction ? factionName(myFaction) : '选择中...'}
            </div>
            <div className={`flex items-center gap-1.5 ${enemySelected ? 'text-green-400' : 'text-gray-400'}`}>
              {enemySelected ? <Check className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
              对手: {enemySelected ? '已选择' : '选择中...'}
            </div>
          </div>

          {!myFaction && !showDeckSelect && (
            <div className="flex gap-4 flex-wrap justify-center">
              {FACTIONS.map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelectedFaction(f.id as Faction);
                    setShowDeckSelect(true);
                    // 尝试加载玩家自创卡组
                    const customDeck = loadCustomDeck();
                    if (customDeck) {
                      setCustomDeckCards(customDeck);
                      setDeckError('');
                    }
                  }}
                  className="relative w-48 h-56 rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.03] hover:-translate-y-1"
                  style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                >
                  <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${f.accent}ee 0%, ${f.accent}99 30%, ${f.accent}66 70%)` }} />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                    <h3 className="text-lg font-bold text-white">{f.name}</h3>
                    <p className="text-white/70 text-xs">{f.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 卡组选择界面 */}
          {showDeckSelect && !myFaction && selectedFaction && (
            <div className="w-full max-w-2xl mx-auto space-y-6">
              <h2 className="text-xl font-bold text-white text-center">
                选择你的卡组
              </h2>

              {/* 选项1：使用官方预设卡组 */}
              <button
                onClick={() => {
                  onSelectFaction(selectedFaction);
                  setShowDeckSelect(false);
                }}
                className="w-full p-4 bg-gray-800/80 border-2 border-gray-600 rounded-xl hover:border-blue-500 hover:bg-gray-700/80 transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <Swords className="w-6 h-6 text-blue-400" />
                  <div className="flex-1">
                    <h3 className="font-bold text-white">使用官方预设卡组</h3>
                    <p className="text-gray-400 text-sm">
                      使用系统预设的40张{FACTIONS.find(f => f.id === selectedFaction)?.name}卡牌
                    </p>
                  </div>
                </div>
              </button>

              {/* 选项2：使用自创卡组 */}
              {customDeckCards ? (
                <button
                  onClick={() => {
                    onSelectFaction(selectedFaction, customDeckCards);
                    setShowDeckSelect(false);
                  }}
                  className="w-full p-4 bg-gray-800/80 border-2 border-gray-600 rounded-xl hover:border-green-500 hover:bg-gray-700/80 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <Library className="w-6 h-6 text-green-400" />
                    <div className="flex-1">
                      <h3 className="font-bold text-white">使用自创卡组</h3>
                      <p className="text-gray-400 text-sm">
                        使用你在"我的卡组"中配置的卡牌（含DIY卡）
                      </p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {customDeckCards.slice(0, 8).map((c, i) => (
                          <span key={i} className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">
                            {c.name}
                          </span>
                        ))}
                        {customDeckCards.length > 8 && (
                          <span className="text-xs text-gray-500">+{customDeckCards.length - 8}张</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ) : (
                <div className="w-full p-4 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-left opacity-60">
                  <div className="flex items-center gap-3">
                    <Library className="w-6 h-6 text-gray-500" />
                    <div>
                      <h3 className="font-bold text-gray-500">使用自创卡组</h3>
                      <p className="text-gray-600 text-sm">
                        你还没有在"我的卡组"中配置卡组，或卡组无效
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {deckError && (
                <div className="text-red-400 text-sm bg-red-900/30 border border-red-700 rounded-lg p-2">
                  {deckError}
                </div>
              )}

              <button
                onClick={() => { setShowDeckSelect(false); setSelectedFaction(null); }}
                className="w-full py-2 text-gray-400 hover:text-white transition-colors cursor-pointer text-sm"
              >
                返回重新选择阵营
              </button>
            </div>
          )}

          {myFaction && !enemySelected && (
            <div className="flex flex-col items-center gap-2 animate-pulse">
              <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
              <p className="text-gray-400 text-sm">等待对手选择阵营...</p>
            </div>
          )}

          <button onClick={onBack} className="text-gray-400 hover:text-white text-sm cursor-pointer">
            <ArrowLeft className="w-3 h-3 inline" /> 返回
          </button>
        </div>
      </div>
    );
  }

  // ==================== 错误 ====================
  if (phase === 'error') {
    const currentUrl = getEffectiveWsUrl();
    return (
      <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: 'url(/bg_war_table.jpg)' }} />
        <div className="absolute inset-0 bg-black/70 z-[1]" />

        <div className="relative z-10 flex flex-col items-center gap-4 px-4 max-w-sm">
          <AlertTriangle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-bold text-red-400">连接失败</h2>
          <p className="text-gray-400 text-sm text-center">{errorMsg || '无法连接到联机服务器'}</p>

          <div className="w-full bg-gray-900/60 border border-gray-700 rounded p-3">
            <p className="text-[10px] text-gray-500 mb-1">正在尝试连接</p>
            <p className="text-xs text-yellow-400 font-mono break-all">{currentUrl}</p>
          </div>

          <div className="w-full space-y-2">
            {!publicMode && (
              <>
                <p className="text-[10px] text-gray-500">局域网主机IP：</p>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrlState(e.target.value)}
                  placeholder="ws://192.168.x.x:3001"
                  className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-gray-300 text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </>
            )}
            <div className="flex gap-2">
              <button onClick={() => (publicMode ? onReconnect() : doSaveAndConnect(serverUrl))} className="flex-1 px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded text-white font-bold text-sm cursor-pointer">
                重试连接
              </button>
              <button onClick={onBack} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-bold text-sm cursor-pointer">
                返回
              </button>
            </div>
          </div>

          {!publicMode && (
            <div className="text-[10px] text-gray-500 text-center space-y-1">
              <p>确保主机已运行 node server/index.cjs</p>
              <p>确保双方在同一WiFi下</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== 等待对手重连 ====================
  if (phase === 'waiting_reconnect' || (phase === 'peer_disconnected' && connectionStatus === 'peer_offline' && peerOnline === false)) {
    return (
      <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: 'url(/bg_war_table.jpg)' }} />
        <div className="absolute inset-0 bg-black/70 z-[1]" />
        <div className="relative z-10 flex flex-col items-center gap-5 px-4 max-w-sm">
          <WifiOff className="w-12 h-12 text-orange-400" />
          <h2 className="text-xl font-bold text-orange-400">对手断线</h2>
          <p className="text-gray-400 text-sm text-center">
            对手暂时断开连接，服务器保留房间120秒...
          </p>

          {/* 重连状态 */}
          {connectionStatus === 'reconnecting' && (
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>正在自动重连服务器...</span>
            </div>
          )}
          {connectionStatus === 'online' && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Wifi className="w-4 h-4" />
              <span>已连接到服务器，等待对手...</span>
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button onClick={onReconnect} className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded text-white font-bold text-sm cursor-pointer flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> 手动重连
            </button>
            <button onClick={onBack} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-bold text-sm cursor-pointer">
              返回菜单
            </button>
          </div>

          <p className="text-[10px] text-gray-500 text-center">
            如果对手在120秒内未重连，房间将自动销毁
          </p>
        </div>
      </div>
    );
  }

  // ==================== 对方断开 ====================
  if (phase === 'peer_disconnected') {
    return (
      <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: 'url(/bg_war_table.jpg)' }} />
        <div className="absolute inset-0 bg-black/70 z-[1]" />
        <div className="relative z-10 flex flex-col items-center gap-4 px-4">
          <AlertTriangle className="w-12 h-12 text-yellow-500" />
          <h2 className="text-xl font-bold text-yellow-400">对手已断开连接</h2>
          <div className="flex gap-3 mt-2">
            <button onClick={onReconnect} className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded text-white font-bold text-sm cursor-pointer">
              重新匹配
            </button>
            <button onClick={onBack} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-bold text-sm cursor-pointer">
              返回菜单
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function factionName(id: Faction): string {
  switch (id) {
    case 'empire': return '帝国军团';
    case 'wild': return '荒野游侠';
    case 'arcane': return '奥术学院';
    default: return '未知';
  }
}
