// ======== 联机对战类型定义 ========

import type { BoardKey } from './game';

// 玩家角色
export type PlayerRole = 'host' | 'guest';

// 联机游戏状态
export type MultiplayerPhase =
  | 'connecting'      // 连接服务器中
  | 'menu'            // 主菜单
  | 'creating_room'   // 创建房间中
  | 'waiting_peer'    // 等待对手加入
  | 'joining'         // 加入房间中
  | 'select_faction'  // 选择阵营
  | 'waiting_faction' // 等待对方选阵营
  | 'playing'         // 游戏中
  | 'waiting_reconnect' // 等待对手重连
  | 'peer_disconnected' // 对方断开
  | 'error';          // 错误

// 房间信息
export interface RoomInfo {
  roomId: string;
  inviteUrl: string;
  role: PlayerRole;
}

// 服务器消息类型
export type ServerMsgType =
  | 'connected'
  | 'room_created'
  | 'room_joined'
  | 'peer_joined'
  | 'peer_selected_faction'
  | 'game_start'
  | 'peer_disconnected'
  | 'peer_reconnected'
  | 'peer_left'
  | 'room_closed'
  | 'rejoin_ok'
  | 'rejoin_failed'
  | 'error'
  | 'pong'
  // 游戏操作（从对方转发）
  | 'deploy'
  | 'spell'
  | 'attack_phase_start'
  | 'attack'
  | 'sniper_target'
  | 'end_turn'
  | 'game_over'
  | 'surrender'
  | 'deploy_done'
  | 'chat';

export interface ServerMessage {
  type: ServerMsgType;
  payload: Record<string, unknown>;
}

// 客户端消息类型
export type ClientMsgType =
  | 'create_room'
  | 'join_room'
  | 'select_faction'
  | 'deploy'
  | 'spell'
  | 'attack_phase_start'
  | 'attack'
  | 'sniper_target'
  | 'end_turn'
  | 'state_sync'
  | 'rejoin_room'
  | 'leave_room'
  | 'surrender'
  | 'deploy_done'
  | 'chat'
  | 'ping';

export interface ClientMessage {
  type: ClientMsgType;
  payload?: Record<string, unknown>;
}

// 联机游戏操作
export interface DeployAction {
  cardIdx: number;
  row: number;
  col: number;
}

export interface CastSpellAction {
  cardIdx: number;
  targetKey: BoardKey | null;
}

export interface SniperTargetAction {
  targetKey: BoardKey;
}

// 倒计时状态
export interface TimerState {
  remainingMs: number;
  isRunning: boolean;
  totalMs: number;
}
