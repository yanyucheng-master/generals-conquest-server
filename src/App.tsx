import './App.css';
import { useState, useCallback } from 'react';
import { useGame } from '@/hooks/useGame';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import MainMenu from '@/components/MainMenu';
import FactionSelect from '@/components/FactionSelect';
import TutorialPage from '@/components/TutorialPage';
import MultiplayerLobby from '@/components/MultiplayerLobby';
import GameBoard from '@/components/GameBoard';
import GameOver from '@/components/GameOver';
import GachaPage from '@/components/GachaPage';
import DeckBuilder from '@/components/DeckBuilder';
import { loadDeck, loadDIYCards, getDeckCards } from '@/data/diySystem';
import { ALL_CARDS } from '@/data/cards';
import type { CardDef } from '@/data/cards';
import type { Faction } from '@/types/game';
import { WifiOff, Loader2, AlertCircle } from 'lucide-react';

// 应用模式
type AppMode = 'menu' | 'local_faction' | 'playing' | 'multiplayer' | 'gacha' | 'deck_builder' | 'tutorial';

// 联机重连状态提示条
function ReconnectBanner({ status, peerOnline, onReconnect }: {
  status: 'online' | 'reconnecting' | 'peer_offline';
  peerOnline: boolean;
  onReconnect: () => void;
}) {
  if (status === 'reconnecting') {
    return (
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-3 py-1.5 bg-yellow-900/80 border-b border-yellow-600">
        <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />
        <span className="text-[11px] text-yellow-300">正在自动重连服务器...</span>
        <button onClick={onReconnect} className="text-[10px] text-yellow-200 underline ml-2 cursor-pointer">立即重试</button>
      </div>
    );
  }
  if (status === 'peer_offline' && !peerOnline) {
    return (
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-3 py-1.5 bg-red-900/80 border-b border-red-600">
        <WifiOff className="w-3 h-3 text-red-400" />
        <span className="text-[11px] text-red-300">对手断线，等待重连中 (120秒)...</span>
      </div>
    );
  }
  return null;
}

function App() {
  const [mode, setMode] = useState<AppMode>('menu');

  const game = useGame();
  const mp = useMultiplayer();

  // ======== 主菜单操作 ========
  const handleLocalGame = useCallback(() => {
    setMode('local_faction');
  }, []);

  const handleMultiplayer = useCallback(() => {
    setMode('multiplayer');
    mp.connect();
  }, [mp]);

  const handleBackToMenu = useCallback(() => {
    setMode('menu');
    mp.disconnect();
    game.handleRestart();
  }, [mp, game]);

  const handleGacha = useCallback(() => {
    setMode('gacha');
  }, []);

  const handleDeckBuilder = useCallback(() => {
    setMode('deck_builder');
  }, []);

  const handleTutorial = useCallback(() => {
    setMode('tutorial');
  }, []);

  const handleCustomSelect = useCallback(() => {
    const deck = loadDeck();
    const diyCards = loadDIYCards();
    const customCards = getDeckCards(deck, ALL_CARDS, diyCards) as CardDef[];
    game.startGame('empire', customCards, undefined);
    setMode('playing');
  }, [game]);

  // ======== 本地对战：选择阵营 ========
  const handleLocalFactionSelect = useCallback((faction: Faction) => {
    game.startGame(faction);
    setMode('playing');
  }, [game]);

  // ======== 联机模式：创建房间 ========
  const handleCreateRoom = useCallback(() => {
    mp.createRoom();
  }, [mp]);

  // ======== 联机模式：加入房间 ========
  const handleJoinRoom = useCallback((roomId: string) => {
    mp.joinRoom(roomId);
  }, [mp]);

  // ======== 联机模式：选择阵营 ========
  const handleMpFactionSelect = useCallback((faction: Faction, customDeck?: CardDef[]) => {
    mp.selectFaction(faction, customDeck);
  }, [mp]);

  // ======== 显示主菜单 ========
  if (mode === 'menu') {
    return (
      <MainMenu
        onLocalGame={handleLocalGame}
        onMultiplayer={handleMultiplayer}
        onTutorial={handleTutorial}
        onGacha={handleGacha}
        onDeckBuilder={handleDeckBuilder}
      />
    );
  }

  // ======== 新手教程 ========
  if (mode === 'tutorial') {
    return (
      <TutorialPage
        onClose={handleBackToMenu}
        onBack={handleBackToMenu}
      />
    );
  }

  // ======== 本地对战：阵营选择 ========
  if (mode === 'local_faction') {
    return (
      <FactionSelect
        onSelect={handleLocalFactionSelect}
        onSelectCustom={handleCustomSelect}
        onBack={handleBackToMenu}
      />
    );
  }

  // ======== 抽卡体验 ========
  if (mode === 'gacha') {
    return <GachaPage onBack={handleBackToMenu} />;
  }

  // ======== 卡组DIY ========
  if (mode === 'deck_builder') {
    return <DeckBuilder onBack={handleBackToMenu} />;
  }

  // ======== 联机模式 ========
  if (mode === 'multiplayer') {
    // P0: 优先检测 game_over（无论是否 isInGame）
    if (mp.gameState?.gameOver || mp.gameState?.phase === 'game_over') {
      return (
        <GameOver
          winner={mp.gameState.winner}
          turn={mp.gameState.turn}
          onRestart={handleBackToMenu}
          playerHp={mp.gameState.player.hp}
          enemyHp={mp.gameState.enemy.hp}
        />
      );
    }

    // 游戏进行中，显示游戏面板
    if ((mp.isInGame || mp.phase === 'playing') && mp.gameState) {
      return (
        <div className="relative w-full h-screen">
          {/* 重连状态提示条 */}
          <ReconnectBanner
            status={mp.connectionStatus}
            peerOnline={mp.peerOnline}
            onReconnect={mp.reconnect}
          />
          {/* 联机状态条 */}
          <div className={`absolute left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-1 bg-black/60 rounded border border-gray-700 ${mp.connectionStatus !== 'online' ? 'top-9' : 'top-2'}`}>
            <div className={`w-2 h-2 rounded-full ${mp.isMyTurn ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-[10px] text-gray-300">
              {mp.isMyTurn ? '你的回合' : '对手回合'}
            </span>
            <span className="text-[10px] text-yellow-400 ml-1">
              {mp.countdown > 0 ? `${mp.countdown}s` : ''}
            </span>
            {mp.connectionStatus === 'peer_offline' && (
              <span className="text-[9px] text-red-400 flex items-center gap-0.5">
                <AlertCircle className="w-2.5 h-2.5" /> 对手离线
              </span>
            )}
            <button
              onClick={handleBackToMenu}
              className="text-[9px] text-red-400 hover:text-red-300 ml-2 cursor-pointer"
            >
              退出
            </button>
          </div>
          {/* 游戏面板 */}
          <GameBoard game={mp as unknown as ReturnType<typeof useGame>} multiplayer={true} isMyTurn={mp.isMyTurn} />
          {/* 对手断线：强制暂停遮罩 */}
          {(mp.connectionStatus === 'peer_offline' || !mp.peerOnline) && (
            <div className="absolute inset-0 z-50 bg-black/70 flex flex-col items-center justify-center gap-3 px-6">
              <WifiOff className="w-10 h-10 text-red-400" />
              <p className="text-red-200 text-sm font-bold text-center">对手已断线，对局已暂停</p>
              <p className="text-gray-400 text-xs text-center">等待对手重连（120秒内）或点击退出</p>
              <button
                onClick={handleBackToMenu}
                className="mt-2 px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-sm rounded cursor-pointer"
              >
                退出对局
              </button>
            </div>
          )}
        </div>
      );
    }

    // 开局加载中
    if (mp.phase === 'playing' && !mp.gameState) {
      return (
        <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center bg-[#0B0D14]">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
          <p className="text-gray-400 text-sm mt-3">正在进入对战...</p>
        </div>
      );
    }

    // 联机大厅（含 waiting_reconnect 阶段）
    return (
      <MultiplayerLobby
        phase={mp.phase}
        room={mp.room}
        myFaction={mp.faction}
        enemySelected={mp.enemySelected}
        errorMsg={mp.errorMsg}
        connectionStatus={mp.connectionStatus}
        peerOnline={mp.peerOnline}
        onBack={handleBackToMenu}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onSelectFaction={handleMpFactionSelect}
        onReconnect={mp.reconnect}
        wsReady={mp.wsState === 'open'}
      />
    );
  }

  // ======== 本地游戏中 ========
  if (mode === 'playing' && game.gameState) {
    // P0: 优先检测 game_over
    if (game.gameState.gameOver || game.gameState.phase === 'game_over') {
      return (
        <GameOver
          winner={game.gameState.winner}
          turn={game.gameState.turn}
          onRestart={handleBackToMenu}
          playerHp={game.gameState.player.hp}
          enemyHp={game.gameState.enemy.hp}
        />
      );
    }
    return <GameBoard game={game} />;
  }

  // 默认返回菜单
  return (
    <MainMenu
      onLocalGame={handleLocalGame}
      onMultiplayer={handleMultiplayer}
      onTutorial={handleTutorial}
      onGacha={handleGacha}
      onDeckBuilder={handleDeckBuilder}
    />
  );
}

export default App;
