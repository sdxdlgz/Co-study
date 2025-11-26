const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const ROOM_HISTORY_LIMIT = 80;
const ROOM_TTL_MS = 1000 * 60 * 30; // 30 minutes
const SESSION_COOKIE_NAME = 'coStudySessionId';
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// 追踪待发送的离开消息定时器，用于取消
// key: `${roomId}:${username}`, value: { timeoutId, sessionId }
const pendingLeaveTimers = new Map();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = new Map();

// Cookie解析
function parseCookies(cookieHeader = '') {
    return cookieHeader.split(';').reduce((acc, part) => {
        if (!part) return acc;
        const [rawKey, ...rawValue] = part.split('=');
        if (!rawKey) return acc;
        const key = rawKey.trim();
        if (!key) return acc;
        const value = rawValue.join('=').trim();
        try {
            acc[key] = value ? decodeURIComponent(value) : '';
        } catch (_err) {
            acc[key] = value;
        }
        return acc;
    }, {});
}

// 从socket获取sessionId
function getSessionIdFromSocket(socket) {
    const header = (socket.handshake && socket.handshake.headers && socket.handshake.headers.cookie) || '';
    const cookies = parseCookies(header);
    return cookies[SESSION_COOKIE_NAME] || null;
}

// 设置session cookie的中间件
function sessionMiddleware(req, res, next) {
    const cookies = parseCookies(req.headers.cookie || '');
    let sessionId = cookies[SESSION_COOKIE_NAME];
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_COOKIE_MAX_AGE}`);
    }
    req.sessionId = sessionId;
    next();
}

app.use(express.json());
app.use(sessionMiddleware);

// 静态文件服务 - 音频文件
app.use('/audio', express.static(path.join(__dirname, 'audio')));

function normalizeRoom(roomId = '') {
    return roomId.trim().toUpperCase();
}

function ensureRoom(roomId) {
    const normalized = normalizeRoom(roomId);
    if (!normalized) return null;
    if (!rooms.has(normalized)) {
        rooms.set(normalized, { users: new Map(), messages: [], cleanupTimer: null });
    }
    const room = rooms.get(normalized);
    if (room.cleanupTimer) {
        clearTimeout(room.cleanupTimer);
        room.cleanupTimer = null;
    }
    return room;
}

function roomSnapshot(roomId) {
    const normalized = normalizeRoom(roomId);
    const room = rooms.get(normalized);
    if (!room) {
        return { roomId: normalized, participants: [], messages: [] };
    }
    return {
        roomId: normalized,
        participants: Array.from(room.users.values()).map((user) => ({
            id: user.socketId,
            name: user.name,
            joinedAt: user.joinedAt,
            cameraOn: !!user.cameraOn,
            status: user.status || null,
        })),
        messages: room.messages,
    };
}

function sanitizeStatus(input = {}) {
    if (!input || typeof input !== 'object') {
        return { text: '', visible: false, updatedAt: Date.now() };
    }
    const visible = input.visible !== false;
    const safeText = typeof input.text === 'string' ? input.text.slice(0, 80) : '';
    const safe = {
        text: visible ? safeText : '',
        visible,
        manual: typeof input.manual === 'string' ? input.manual.slice(0, 40) : '',
        manualPreset: typeof input.manualPreset === 'string' ? input.manualPreset : null,
        autoSync: !!input.autoSync,
        ambientType: typeof input.ambientType === 'string' ? input.ambientType.slice(0, 20) : null,
        timerMode: input.timerMode === 'break' ? 'break' : (input.timerMode === 'focus' ? 'focus' : null),
        updatedAt: typeof input.updatedAt === 'number' ? input.updatedAt : Date.now(),
    };
    return safe;
}

function scheduleRoomCleanup(roomId) {
    const room = rooms.get(roomId);
    if (!room || room.users.size > 0 || room.cleanupTimer) return;
    room.cleanupTimer = setTimeout(() => rooms.delete(roomId), ROOM_TTL_MS);
}

function createSystemMessage(text, username = '', action = '') {
    return {
        id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        author: 'system',
        text,
        username,
        action,
        timestamp: Date.now(),
        type: 'system',
    };
}

app.get('/api/rooms/:roomId', (req, res) => {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ error: 'Room id missing' });
    const snapshot = roomSnapshot(roomId);
    if (!rooms.has(normalizeRoom(roomId))) {
        return res.status(404).json({ error: 'Room not found' });
    }
    return res.json(snapshot);
});

app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    // 从cookie获取sessionId
    const sessionId = getSessionIdFromSocket(socket) || crypto.randomUUID();
    socket.data.sessionId = sessionId;

    socket.on('join-room', (payload = {}, ack = () => {}) => {
        const { roomId, username } = payload;
        const cleanName = (username || '').trim();
        const normalizedRoom = normalizeRoom(roomId);

        if (!cleanName) {
            return ack({ ok: false, error: '请填写昵称' });
        }
        if (!normalizedRoom) {
            return ack({ ok: false, error: '房间号缺失' });
        }

        const room = ensureRoom(normalizedRoom);
        const userKey = `${normalizedRoom}:${cleanName}`;

        // 检查是否有待发送的离开消息
        let isRejoin = false;
        const pendingTimer = pendingLeaveTimers.get(userKey);
        if (pendingTimer) {
            // 只有同一个session才能取消离开消息（刷新场景）
            if (pendingTimer.sessionId === sessionId) {
                clearTimeout(pendingTimer.timeoutId);
                pendingLeaveTimers.delete(userKey);
                isRejoin = true;
            }
        }

        // 检查房间内是否已有同名用户
        const matchingUsers = Array.from(room.users.entries()).filter(([, u]) => u.name === cleanName);

        // 检查是否有来自不同session的同名用户（真正的冲突）
        const hasConflict = matchingUsers.some(([, u]) => u.sessionId && u.sessionId !== sessionId);
        if (hasConflict) {
            return ack({ ok: false, error: '该昵称已被使用，请换一个' });
        }

        // 清理同一session的旧连接（刷新场景）
        if (matchingUsers.length > 0) {
            matchingUsers.forEach(([oldSocketId]) => {
                room.users.delete(oldSocketId);
                const oldSocket = io.sockets.sockets.get(oldSocketId);
                if (oldSocket) {
                    oldSocket.leave(normalizedRoom);
                    oldSocket.data.roomId = null; // 防止disconnect时再次处理
                }
            });
            isRejoin = true;
        }

        room.users.set(socket.id, {
            socketId: socket.id,
            name: cleanName,
            sessionId: sessionId,
            joinedAt: Date.now(),
            cameraOn: false,
            status: null,
        });

        socket.data.username = cleanName;
        socket.data.roomId = normalizedRoom;
        socket.join(normalizedRoom);

        const snapshot = roomSnapshot(normalizedRoom);
        ack({ ok: true, room: snapshot });

        io.to(normalizedRoom).emit('presence', snapshot.participants);

        // 只有非刷新场景才发送加入消息
        if (!isRejoin) {
            const systemMsg = createSystemMessage(`${cleanName} joined the room`, cleanName, 'join');
            room.messages.push(systemMsg);
            if (room.messages.length > ROOM_HISTORY_LIMIT) room.messages.shift();
            io.to(normalizedRoom).emit('chat-message', systemMsg);
        }
    });

    socket.on('send-message', (payload = {}, ack = () => {}) => {
        const { text } = payload;
        const currentRoom = socket.data.roomId;
        const cleanText = (text || '').trim();

        if (!currentRoom) {
            return ack({ ok: false, error: '尚未加入房间' });
        }
        if (!cleanText) {
            return ack({ ok: false, error: '消息不能为空' });
        }

        const room = ensureRoom(currentRoom);
        const message = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            author: socket.data.username,
            text: cleanText,
            timestamp: Date.now(),
            type: 'user',
        };

        room.messages.push(message);
        if (room.messages.length > ROOM_HISTORY_LIMIT) room.messages.shift();
        io.to(currentRoom).emit('chat-message', message);
        ack({ ok: true });
    });

    socket.on('camera-status', (payload = {}) => {
        const { roomId } = socket.data;
        if (!roomId) return;
        const room = rooms.get(roomId);
        if (!room) return;
        const user = room.users.get(socket.id);
        if (!user) return;
        user.cameraOn = !!payload.camera;
        io.to(roomId).emit('camera-status', { userId: socket.id, camera: user.cameraOn });
    });

    socket.on('rtc-offer', (payload = {}) => {
        const { roomId } = socket.data;
        const { targetId, sdp } = payload;
        if (!roomId || !targetId || !sdp) return;
        const room = rooms.get(roomId);
        if (!room || !room.users.has(targetId)) return;
        io.to(targetId).emit('rtc-offer', { from: socket.id, sdp });
    });

    socket.on('rtc-answer', (payload = {}) => {
        const { roomId } = socket.data;
        const { targetId, sdp } = payload;
        if (!roomId || !targetId || !sdp) return;
        const room = rooms.get(roomId);
        if (!room || !room.users.has(targetId)) return;
        io.to(targetId).emit('rtc-answer', { from: socket.id, sdp });
    });

    socket.on('rtc-ice', (payload = {}) => {
        const { roomId } = socket.data;
        const { targetId, candidate } = payload;
        if (!roomId || !targetId || !candidate) return;
        const room = rooms.get(roomId);
        if (!room || !room.users.has(targetId)) return;
        io.to(targetId).emit('rtc-ice', { from: socket.id, candidate });
    });

    socket.on('user-status', (payload = {}, ack = () => {}) => {
        const { status } = payload || {};
        const { roomId } = socket.data;
        if (!roomId) return ack({ ok: false });
        const room = rooms.get(roomId);
        if (!room) return ack({ ok: false });
        const user = room.users.get(socket.id);
        if (!user) return ack({ ok: false });
        const safeStatus = sanitizeStatus(status);
        user.status = safeStatus;
        io.to(roomId).emit('status-update', { userId: socket.id, status: safeStatus });
        ack({ ok: true });
    });

    socket.on('disconnect', () => {
        const { roomId, sessionId: userSessionId } = socket.data;
        if (!roomId) return;
        const room = rooms.get(roomId);
        if (!room) return;

        const user = room.users.get(socket.id);
        room.users.delete(socket.id);
        io.to(roomId).emit('camera-status', { userId: socket.id, camera: false });
        const snapshot = roomSnapshot(roomId);
        io.to(roomId).emit('presence', snapshot.participants);

        if (user) {
            const userKey = `${roomId}:${user.name}`;

            // 清除之前可能存在的定时器
            const existingPending = pendingLeaveTimers.get(userKey);
            if (existingPending) {
                clearTimeout(existingPending.timeoutId);
            }

            // 创建新的定时器记录
            const timerRecord = {
                sessionId: user.sessionId || userSessionId,
                timeoutId: null
            };

            timerRecord.timeoutId = setTimeout(() => {
                // 确保这个定时器还是当前有效的
                const activeRecord = pendingLeaveTimers.get(userKey);
                if (activeRecord !== timerRecord) return;

                pendingLeaveTimers.delete(userKey);
                const currentRoom = rooms.get(roomId);
                if (currentRoom) {
                    const systemMsg = createSystemMessage(`${user.name} left the room`, user.name, 'leave');
                    currentRoom.messages.push(systemMsg);
                    if (currentRoom.messages.length > ROOM_HISTORY_LIMIT) currentRoom.messages.shift();
                    io.to(roomId).emit('chat-message', systemMsg);
                }
            }, 3000);

            pendingLeaveTimers.set(userKey, timerRecord);
        }

        scheduleRoomCleanup(roomId);
    });
});

server.listen(PORT, () => {
    console.log(`Co-Study backend listening on http://localhost:${PORT}`);
});
