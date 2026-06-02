// 《将领：征服》联机对战服务器 - Glitch版本
// Glitch会自动识别这个文件并运行

const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// 健康检查（Glitch用）
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: '《将领：征服》联机服务器运行中',
    rooms: rooms.size,
    roomList: Array.from(rooms.values()).map(r => ({
      id: r.id,
      hasGuest: !!r.guestId,
    })),
  });
});

// 房间管理
const rooms = new Map();

function generateRoomId() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
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

// 清理过期房间
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.createdAt > 3600000) destroyRoom(id);
  }
}, 60000);

// 客户端管理
const clients = new Map();

function broadcastToRoom(roomId, message, excludeId) {
  const room = getRoom(roomId);
  if (!room) return;
  const msgStr = JSON.stringify(message);
  if (room.hostId && room.hostId !== excludeId) {
    const host = clients.get(room.hostId);
    if (host?.ws.readyState === 1) host.ws.send(msgStr);
  }
  if (room.guestId && room.guestId !== excludeId) {
    const guest = clients.get(room.guestId);
    if (guest?.ws.readyState === 1) guest.ws.send(msgStr);
  }
}

function sendTo(clientId, message) {
  const client = clients.get(clientId);
  if (client?.ws.readyState === 1) client.ws.send(JSON.stringify(message));
}

wss.on('connection', (ws) => {
  const clientId = crypto.randomUUID();
  clients.set(clientId, { ws, roomId: null });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      handleMessage(clientId, msg);
    } catch (err) {
      console.error('消息解析失败:', err.message);
    }
  });

  ws.on('close', () => handleDisconnect(clientId));
  ws.on('error', () => {});
});

function handleMessage(clientId, msg) {
  const { type, payload } = msg;

  switch (type) {
    case 'create_room': {
      const room = createRoom(clientId);
      clients.get(clientId).roomId = room.id;
      sendTo(clientId, {
        type: 'room_created',
        payload: { roomId: room.id, inviteUrl: `?room=${room.id}` },
      });
      break;
    }

    case 'join_room': {
      const room = getRoom(payload?.roomId);
      if (!room) {
        sendTo(clientId, { type: 'error', payload: { message: '房间不存在' } });
        return;
      }
      if (room.guestId) {
        sendTo(clientId, { type: 'error', payload: { message: '房间已满' } });
        return;
      }
      room.guestId = clientId;
      clients.get(clientId).roomId = room.id;
      sendTo(clientId, { type: 'joined_room', payload: { roomId: room.id, role: 'guest' } });
      sendTo(room.hostId, { type: 'peer_joined', payload: {} });
      break;
    }

    case 'select_faction': {
      const room = getRoom(payload?.roomId);
      if (!room) return;
      const isHost = room.hostId === clientId;
      if (isHost) { room.hostFaction = payload.faction; room.hostReady = true; }
      else { room.guestFaction = payload.faction; room.guestReady = true; }

      const peerId = isHost ? room.guestId : room.hostId;
      if (peerId) sendTo(peerId, { type: 'peer_selected_faction', payload: { faction: payload.faction } });

      if (room.hostReady && room.guestReady && room.hostFaction && room.guestFaction) {
        room.gameStarted = true;
        sendTo(room.hostId, { type: 'game_start', payload: { myFaction: room.hostFaction, enemyFaction: room.guestFaction, myTurn: true } });
        sendTo(room.guestId, { type: 'game_start', payload: { myFaction: room.guestFaction, enemyFaction: room.hostFaction, myTurn: false } });
      }
      break;
    }

    case 'deploy':
    case 'cast_spell':
    case 'sniper_target':
    case 'end_turn':
    case 'deploy_done':
    case 'chat': {
      const client = clients.get(clientId);
      if (client?.roomId) {
        broadcastToRoom(client.roomId, { type, payload: { ...payload, fromId: clientId } }, clientId);
      }
      break;
    }

    case 'ping': {
      sendTo(clientId, { type: 'pong', payload: { ts: Date.now() } });
      break;
    }
  }
}

function handleDisconnect(clientId) {
  const client = clients.get(clientId);
  if (client?.roomId) {
    const room = getRoom(client.roomId);
    if (room) {
      const peerId = room.hostId === clientId ? room.guestId : room.hostId;
      if (peerId) sendTo(peerId, { type: 'peer_disconnected', payload: {} });
      destroyRoom(client.roomId);
    }
  }
  clients.delete(clientId);
}

// Glitch用process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[将领：征服] 服务器启动于端口 ${PORT}`);
});
