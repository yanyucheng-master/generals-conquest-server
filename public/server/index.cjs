/**
 * 《将领：征服》联机对战 WebSocket 服务器 (CommonJS版本)
 * 
 * 启动方式:
 *   node server/index.cjs
 * 
 * 前提: 安装 ws 模块
 *   npm install ws
 */

const { WebSocketServer } = require('ws');
const http = require('http');
const crypto = require('crypto');

const PORT = process.env.WS_PORT || 3001;

// ======== 房间管理 ========
const rooms = new Map(); // roomId -> Room

function generateRoomId() {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8字符大写
}

function createRoom(hostId) {
  const roomId = generateRoomId();
  const room = {
    id: roomId,
    hostId,
    guestId: null,
    hostFaction: null,
    guestFaction: null,
    gameStarted: false,
    hostReady: false,
    guestReady: false,
    createdAt: Date.now(),
  };
  rooms.set(roomId, room);
  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId.toUpperCase());
}

function destroyRoom(roomId) {
  rooms.delete(roomId.toUpperCase());
}

// 清理过期房间（超过1小时）
function cleanupOldRooms() {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.createdAt > 3600000) {
      destroyRoom(id);
    }
  }
}
setInterval(cleanupOldRooms, 60000);

// ======== WebSocket 服务器 ========
const server = http.createServer((req, res) => {
  // 允许跨域
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
  }));
  res.end(JSON.stringify({ 
    status: 'ok', 
    message: '《将领：征服》联机服务器运行中',
    port: PORT,
    rooms: roomList.length,
    roomList,
  }));
});

const wss = new WebSocketServer({ server });

// 客户端连接映射 clientId -> { ws, roomId }
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

wss.on('connection', (ws, req) => {
  const clientId = crypto.randomUUID();
  clients.set(clientId, { ws, roomId: null });

  console.log(`[WS] 客户端连接: ${clientId} 来自 ${req.socket.remoteAddress}`);

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
      const room = createRoom(clientId);
      clients.get(clientId).roomId = room.id;
      
      // 构建邀请链接
      const protocol = 'https:'; // 部署页面是https
      const baseUrl = payload?.baseUrl || '';
      const inviteUrl = baseUrl 
        ? `${baseUrl}?room=${room.id}` 
        : `${protocol}//${ws._socket ? '' : 'localhost'}?room=${room.id}`;
      
      sendTo(clientId, {
        type: 'room_created',
        payload: { roomId: room.id, inviteUrl },
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
      if (room.guestId) {
        sendTo(clientId, { type: 'error', payload: { message: '房间已满（最多2人）' } });
        return;
      }
      room.guestId = clientId;
      clients.get(clientId).roomId = room.id;

      // 通知双方
      sendTo(clientId, { type: 'joined_room', payload: { roomId: room.id, role: 'guest' } });
      sendTo(room.hostId, { type: 'peer_joined', payload: { guestId: clientId } });
      console.log(`[ROOM] ${clientId} 加入房间: ${room.id}`);
      break;
    }

    // ====== 阵营选择 ======
    case 'select_faction': {
      const { roomId, faction } = payload;
      const room = getRoom(roomId);
      if (!room) return;

      const isHost = room.hostId === clientId;
      if (isHost) {
        room.hostFaction = faction;
        room.hostReady = true;
      } else {
        room.guestFaction = faction;
        room.guestReady = true;
      }

      // 通知对方我选好了
      const peerId = isHost ? room.guestId : room.hostId;
      if (peerId) {
        sendTo(peerId, { type: 'peer_selected_faction', payload: { faction } });
      }

      // 双方都选好了，通知开始
      if (room.hostReady && room.guestReady && room.hostFaction && room.guestFaction) {
        room.gameStarted = true;
        sendTo(room.hostId, {
          type: 'game_start',
          payload: { myFaction: room.hostFaction, enemyFaction: room.guestFaction, myTurn: true },
        });
        sendTo(room.guestId, {
          type: 'game_start',
          payload: { myFaction: room.guestFaction, enemyFaction: room.hostFaction, myTurn: false },
        });
        console.log(`[GAME] 房间 ${room.id} 游戏开始: ${room.hostFaction} vs ${room.guestFaction}`);
      }
      break;
    }

    // ====== 游戏操作转发 ======
    case 'deploy':
    case 'cast_spell':
    case 'sniper_target':
    case 'end_turn':
    case 'deploy_done':
    case 'chat': {
      const client = clients.get(clientId);
      if (client && client.roomId) {
        broadcastToRoom(client.roomId, { type, payload: { ...payload, fromId: clientId } }, clientId);
      }
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
      const peerId = room.hostId === clientId ? room.guestId : room.hostId;
      if (peerId) {
        sendTo(peerId, { type: 'peer_disconnected', payload: {} });
      }
      destroyRoom(client.roomId);
      console.log(`[ROOM] 房间 ${client.roomId} 已销毁`);
    }
  }
  clients.delete(clientId);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     《将领：征服》联机对战服务器         ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  WebSocket: ws://0.0.0.0:${PORT}           ║`);
  console.log(`║  HTTP状态: http://0.0.0.0:${PORT}           ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('按 Ctrl+C 停止服务器');
});
