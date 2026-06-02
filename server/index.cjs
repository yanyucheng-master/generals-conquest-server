/**
 * 《将领：征服》联机对战 WebSocket 服务器 (CommonJS版本)
 * 支持断线重连、心跳保活、房间保留120秒
 *
 * 启动方式: node server/index.cjs
 */

const { WebSocketServer } = require('ws');
const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || process.env.WS_PORT || 3001;
const ROOM_TTL_MS = 120000; // 房间保留120秒
const MAX_RECONNECT_ATTEMPTS = 8;

// ======== 房间管理 ========
const rooms = new Map(); // roomId -> Room

function generateRoomId() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

function createRoom(hostId, hostDeckData) {
  const roomId = generateRoomId();
  const room = {
    id: roomId,
    hostId,
    guestId: null,
    hostFaction: null,
    guestFaction: null,
    hostDeckData: hostDeckData || null,
    guestDeckData: null,
    hostRejoinToken: generateToken(),
    guestRejoinToken: null,
    gameStarted: false,
    gameSeed: null,
    hostStateSnapshot: null,
    guestStateSnapshot: null,
    hostReady: false,
    guestReady: false,
    createdAt: Date.now(),
    disconnectTimer: null, // 延迟销毁定时器
    hostOnline: true,
    guestOnline: false,
  };
  rooms.set(roomId, room);
  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId.toUpperCase());
}

function destroyRoom(roomId) {
  const room = rooms.get(roomId.toUpperCase());
  if (room && room.disconnectTimer) {
    clearTimeout(room.disconnectTimer);
  }
  rooms.delete(roomId.toUpperCase());
}

function startRoomDestroyTimer(room) {
  if (room.disconnectTimer) clearTimeout(room.disconnectTimer);
  room.disconnectTimer = setTimeout(() => {
    const stillOnline = (room.hostOnline && room.hostId) || (room.guestOnline && room.guestId);
    if (!stillOnline) {
      destroyRoom(room.id);
      console.log(`[ROOM] 房间 ${room.id} 因120秒无人重连已销毁`);
    }
  }, ROOM_TTL_MS);
  console.log(`[ROOM] 房间 ${room.id} 将在 ${ROOM_TTL_MS / 1000} 秒后销毁（除非有人重连）`);
}

// 清理过期房间（超过1小时且无人活跃）
function cleanupOldRooms() {
  const now = Date.now();
  for (const [id, room] of rooms) {
    const hasOnlinePlayer = room.hostOnline || room.guestOnline;
    if (!hasOnlinePlayer && now - room.createdAt > 3600000) {
      destroyRoom(id);
    }
  }
}
setInterval(cleanupOldRooms, 60000);

// ======== WebSocket 服务器 ========
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  const roomList = Array.from(rooms.values()).map(r => ({
    id: r.id,
    hasGuest: !!r.guestId,
    gameStarted: r.gameStarted,
    hostOnline: r.hostOnline,
    guestOnline: r.guestOnline,
  }));
  res.end(JSON.stringify({
    status: 'ok',
    message: '《将领：征服》联机服务器运行中（支持断线重连）',
    port: PORT,
    rooms: roomList.length,
    roomList,
  }));
});

const wss = new WebSocketServer({ server });

// 客户端连接映射 clientId -> { ws, roomId, role }
const clients = new Map();

function broadcastToRoom(roomId, message, excludeId) {
  const room = getRoom(roomId);
  if (!room) return;

  const msgStr = JSON.stringify(message);

  if (room.hostId && room.hostId !== excludeId) {
    const host = clients.get(room.hostId);
    if (host && host.ws.readyState === 1) {
      host.ws.send(msgStr);
    }
  }
  if (room.guestId && room.guestId !== excludeId) {
    const guest = clients.get(room.guestId);
    if (guest && guest.ws.readyState === 1) {
      guest.ws.send(msgStr);
    }
  }
}

function sendTo(clientId, message) {
  const client = clients.get(clientId);
  if (client && client.ws.readyState === 1) {
    client.ws.send(JSON.stringify(message));
  }
}

// 获取对方clientId
function getPeerId(room, clientId) {
  if (room.hostId === clientId) return room.guestId;
  if (room.guestId === clientId) return room.hostId;
  return null;
}

// 获取角色
function getRole(room, clientId) {
  if (room.hostId === clientId) return 'host';
  if (room.guestId === clientId) return 'guest';
  return null;
}

// 校验消息合法性
function validateGameAction(room, clientId) {
  if (!room) return { ok: false, error: '房间不存在' };
  const role = getRole(room, clientId);
  if (!role) return { ok: false, error: '你不是房间成员' };
  if (!room.gameStarted) return { ok: false, error: '游戏尚未开始' };
  return { ok: true, role };
}

wss.on('connection', (ws, req) => {
  const clientId = crypto.randomUUID();
  clients.set(clientId, { ws, roomId: null, role: null });

  console.log(`[WS] 客户端连接: ${clientId} 来自 ${req.socket.remoteAddress}`);

  // 发送 connected 消息
  sendTo(clientId, { type: 'connected', payload: { playerId: clientId } });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      handleMessage(clientId, ws, msg);
    } catch (err) {
      console.error('[WS] 消息解析失败:', err.message);
    }
  });

  ws.on('close', () => {
    handleDisconnect(clientId);
  });

  ws.on('error', (err) => {
    console.error(`[WS] 客户端错误 ${clientId}:`, err.message);
  });
});

function handleMessage(clientId, ws, msg) {
  const { type, payload } = msg;

  switch (type) {
    // ====== 房间管理 ======
    case 'create_room': {
      const room = createRoom(clientId, payload?.deckData);
      const client = clients.get(clientId);
      client.roomId = room.id;
      client.role = 'host';

      sendTo(clientId, {
        type: 'room_created',
        payload: {
          roomId: room.id,
          rejoinToken: room.hostRejoinToken,
          role: 'host',
        },
      });
      console.log(`[ROOM] 创建房间: ${room.id} by ${clientId}`);
      break;
    }

    case 'join_room': {
      const { roomId } = payload;
      const room = getRoom(roomId);
      if (!room) {
        sendTo(clientId, { type: 'error', payload: { message: '房间不存在或已过期' } });
        return;
      }
      if (room.guestId && room.guestOnline) {
        sendTo(clientId, { type: 'error', payload: { message: '房间已满（最多2人）' } });
        return;
      }
      // 客机离线时释放席位，允许新玩家加入
      if (room.guestId && !room.guestOnline) {
        clients.delete(room.guestId);
        room.guestId = null;
        room.guestRejoinToken = null;
        room.guestReady = false;
        room.guestFaction = null;
        room.guestDeckData = null;
      }
      room.guestId = clientId;
      room.guestOnline = true;
      room.guestRejoinToken = generateToken();
      room.guestDeckData = payload?.deckData || null;

      const client = clients.get(clientId);
      client.roomId = room.id;
      client.role = 'guest';

      // 通知guest
      sendTo(clientId, {
        type: 'room_joined',
        payload: {
          roomId: room.id,
          role: 'guest',
          rejoinToken: room.guestRejoinToken,
        },
      });
      // 通知host有人加入
      sendTo(room.hostId, {
        type: 'peer_joined',
        payload: { guestId: clientId, deckData: room.guestDeckData },
      });
      console.log(`[ROOM] ${clientId} 加入房间: ${room.id}`);
      break;
    }

    // ====== 断线重连 ======
    case 'rejoin_room': {
      const { token } = payload;
      const room = findRoomByToken(token);
      if (!room) {
        sendTo(clientId, { type: 'rejoin_failed', payload: { message: '房间已过期或不存在' } });
        return;
      }

      const isHost = room.hostRejoinToken === token;
      const role = isHost ? 'host' : 'guest';
      const oldId = isHost ? room.hostId : room.guestId;

      // 更新房间在线状态
      if (isHost) room.hostOnline = true;
      else room.guestOnline = true;

      // 取消销毁定时器
      if (room.disconnectTimer) {
        clearTimeout(room.disconnectTimer);
        room.disconnectTimer = null;
      }

      // 移除旧客户端
      clients.delete(oldId);

      // 设置新客户端
      const newClient = clients.get(clientId);
      newClient.roomId = room.id;
      newClient.role = role;

      // 更新房间中的clientId
      if (isHost) room.hostId = clientId;
      else room.guestId = clientId;

      // 通知重连成功
      sendTo(clientId, {
        type: 'rejoin_ok',
        payload: {
          roomId: room.id,
          role,
          gameStarted: room.gameStarted,
          rejoinToken: token,
          hostFaction: room.hostFaction,
          guestFaction: room.guestFaction,
          hostReady: room.hostReady,
          guestReady: room.guestReady,
          gameSeed: room.gameSeed,
          gameState: isHost ? room.hostStateSnapshot : room.guestStateSnapshot,
        },
      });

      // 通知对手有人重连了
      const peerId = getPeerId(room, clientId);
      if (peerId) {
        sendTo(peerId, { type: 'peer_reconnected', payload: {} });
      }

      console.log(`[REJOIN] ${role} 重连到房间 ${room.id}: ${oldId} -> ${clientId}`);
      break;
    }

    // ====== 主动退出 ======
    case 'leave_room': {
      const client = clients.get(clientId);
      if (client && client.roomId) {
        const room = getRoom(client.roomId);
        if (room) {
          const peerId = getPeerId(room, clientId);
          if (peerId) {
            sendTo(peerId, { type: 'peer_left', payload: { message: '对手已离开房间' } });
          }
          destroyRoom(room.id);
          console.log(`[ROOM] 房间 ${room.id} 因玩家主动退出已销毁`);
        }
        client.roomId = null;
        client.role = null;
      }
      break;
    }

    // ====== 阵营选择 ======
    case 'select_faction': {
      const { roomId, faction, deckData } = payload;
      const room = getRoom(roomId);
      if (!room) return;

      const isHost = room.hostId === clientId;
      if (isHost) {
        room.hostFaction = faction;
        room.hostReady = true;
        if (deckData) room.hostDeckData = deckData;
      } else {
        room.guestFaction = faction;
        room.guestReady = true;
        if (deckData) room.guestDeckData = deckData;
      }

      // 通知对方
      const peerId = isHost ? room.guestId : room.hostId;
      if (peerId) {
        sendTo(peerId, {
          type: 'peer_selected_faction',
          payload: { faction, deckData: isHost ? room.hostDeckData : room.guestDeckData },
        });
      }

      // 双方都选好了，开始游戏
      if (room.hostReady && room.guestReady && room.hostFaction && room.guestFaction) {
        const seed = Math.floor(Math.random() * 1000000);
        room.gameStarted = true;
        room.gameSeed = seed;
        const shared = { roomId: room.id, seed };
        sendTo(room.hostId, {
          type: 'game_start',
          payload: {
            ...shared,
            myFaction: room.hostFaction,
            enemyFaction: room.guestFaction,
            myTurn: true,
            myDeckData: room.hostDeckData,
            enemyDeckData: room.guestDeckData,
            myRejoinToken: room.hostRejoinToken,
            enemyRejoinToken: room.guestRejoinToken,
          },
        });
        sendTo(room.guestId, {
          type: 'game_start',
          payload: {
            ...shared,
            myFaction: room.guestFaction,
            enemyFaction: room.hostFaction,
            myTurn: false,
            myDeckData: room.guestDeckData,
            enemyDeckData: room.hostDeckData,
            myRejoinToken: room.guestRejoinToken,
            enemyRejoinToken: room.hostRejoinToken,
          },
        });
        console.log(`[GAME] 房间 ${room.id} 游戏开始: ${room.hostFaction} vs ${room.guestFaction}`);
      }
      break;
    }

    // ====== 游戏操作转发（带校验） ======
    case 'state_sync': {
      const client = clients.get(clientId);
      if (!client || !client.roomId) return;
      const room = getRoom(client.roomId);
      if (!room || !room.gameStarted) return;
      const role = getRole(room, clientId);
      if (role === 'host') room.hostStateSnapshot = payload?.state || null;
      else if (role === 'guest') room.guestStateSnapshot = payload?.state || null;
      break;
    }

    case 'deploy':
    case 'spell':
    case 'sniper_target':
    case 'attack_phase_start':
    case 'attack':
    case 'end_turn':
    case 'game_over':
    case 'surrender': {
      const client = clients.get(clientId);
      if (!client || !client.roomId) return;
      const room = getRoom(client.roomId);
      const v = validateGameAction(room, clientId);
      if (!v.ok) {
        sendTo(clientId, { type: 'error', payload: { message: v.error } });
        return;
      }
      if (type === 'game_over' || type === 'surrender') {
        room.hostStateSnapshot = null;
        room.guestStateSnapshot = null;
      }
      broadcastToRoom(client.roomId, { type, payload: { ...payload, fromId: clientId } }, clientId);
      break;
    }

    case 'deploy_done':
    case 'chat': {
      const client = clients.get(clientId);
      if (!client || !client.roomId) return;
      const room = getRoom(client.roomId);
      const v = validateGameAction(room, clientId);
      if (!v.ok) {
        sendTo(clientId, { type: 'error', payload: { message: v.error } });
        return;
      }
      broadcastToRoom(client.roomId, { type, payload: { ...payload, fromId: clientId } }, clientId);
      break;
    }

    // ====== 心跳 ======
    case 'ping': {
      sendTo(clientId, { type: 'pong', payload: { ts: Date.now() } });
      break;
    }

    default: {
      console.warn(`[WS] 未知消息类型: ${type}`);
    }
  }
}

function handleDisconnect(clientId) {
  console.log(`[WS] 客户端断开: ${clientId}`);
  const client = clients.get(clientId);
  if (client && client.roomId) {
    const room = getRoom(client.roomId);
    if (room) {
      const isHost = room.hostId === clientId;

      // 标记离线
      if (isHost) room.hostOnline = false;
      else room.guestOnline = false;

      const peerId = getPeerId(room, clientId);

      // 如果游戏已开始，通知对方等待重连
      if (room.gameStarted) {
        if (peerId) {
          sendTo(peerId, {
            type: 'peer_disconnected',
            payload: { temporary: true, message: '对手断线，等待120秒重连...' },
          });
        }
        // 启动房间销毁定时器
        startRoomDestroyTimer(room);
      } else {
        // 游戏未开始，立即通知对方
        if (peerId) {
          sendTo(peerId, { type: 'peer_disconnected', payload: { temporary: false } });
        }
        if (!room.hostOnline && !room.guestOnline) {
          destroyRoom(room.id);
        }
      }
    }
  }
  clients.delete(clientId);
}

// 通过token查找房间
function findRoomByToken(token) {
  for (const room of rooms.values()) {
    if (room.hostRejoinToken === token || room.guestRejoinToken === token) {
      return room;
    }
  }
  return null;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     《将领：征服》联机对战服务器         ║');
  console.log('║           支持断线重连 v2.0              ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  WebSocket: ws://0.0.0.0:${PORT}           ║`);
  console.log(`║  HTTP状态: http://0.0.0.0:${PORT}           ║`);
  console.log(`║  房间TTL:  ${ROOM_TTL_MS / 1000}秒                        ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});
