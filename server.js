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
const CLIENT_ID_MAX_LENGTH = 64;

// 追踪待发送的离开消息定时器，用于取消
// key: `${roomId}:${username}`, value: { timeoutId, sessionId, clientId }
const pendingLeaveTimers = new Map();

// 标记已被清理的socket，其disconnect事件应被跳过
const skippedDisconnects = new Set();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = new Map();

// 构建身份索引键
function buildIdentityKey(roomId, sessionId, clientId) {
    if (!roomId) return null;
    return `${roomId}:${sessionId || ''}:${clientId || ''}`;
}

// 统一移除用户的方法，确保清理所有相关数据
function removeUserFromRoom(room, socketId, normalizedRoom, existingRecord = null) {
    if (!room || !socketId) return false;
    const record = existingRecord || room.users.get(socketId);
    if (!record) return false;

    room.users.delete(socketId);

    // 清理身份索引
    const identityKey = record.identityKey || buildIdentityKey(normalizedRoom, record.sessionId, record.clientId);
    if (identityKey && room.identities && room.identities.get(identityKey) === socketId) {
        room.identities.delete(identityKey);
    }

    // 尝试清理旧socket
    const socketRef = io.sockets.sockets.get(socketId);
    if (socketRef) {
        socketRef.leave(normalizedRoom);
        socketRef.data.roomId = null;
    } else {
        // 旧socket已被清理，标记其disconnect应被跳过
        skippedDisconnects.add(socketId);
    }
    return true;
}

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

// 规范化客户端ID
function normalizeClientId(raw = '') {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, CLIENT_ID_MAX_LENGTH);
}

// 解析并确保socket有clientId
function resolveClientId(socket, candidate) {
    const normalized = normalizeClientId(candidate);
    if (normalized) {
        socket.data.clientId = normalized;
        return normalized;
    }
    if (socket.data.clientId) return socket.data.clientId;
    const fallback = socket.data.sessionId || crypto.randomUUID();
    socket.data.clientId = fallback;
    return fallback;
}

// 判断是否为同一身份（通过sessionId或clientId匹配）
function isSameIdentity(record = {}, sessionId, clientId) {
    if (!record) return false;
    if (sessionId && record.sessionId && record.sessionId === sessionId) return true;
    if (clientId && record.clientId && record.clientId === clientId) return true;
    return false;
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

// 静态文件服务 - 图片文件
app.use('/images', express.static(path.join(__dirname, 'images')));

function normalizeRoom(roomId = '') {
    return roomId.trim().toUpperCase();
}

function ensureRoom(roomId) {
    const normalized = normalizeRoom(roomId);
    if (!normalized) return null;
    if (!rooms.has(normalized)) {
        rooms.set(normalized, { users: new Map(), messages: [], identities: new Map(), cleanupTimer: null });
    }
    const room = rooms.get(normalized);
    // 兼容旧房间数据
    if (!room.identities) {
        room.identities = new Map();
    }
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
    // 从handshake.auth中获取客户端ID
    const auth = socket.handshake && socket.handshake.auth;
    const handshakeClientId = normalizeClientId(auth && auth.clientId);

    // 从cookie获取sessionId，优先使用clientId作为后备
    const sessionId = getSessionIdFromSocket(socket) || handshakeClientId || crypto.randomUUID();
    socket.data.sessionId = sessionId;
    socket.data.clientId = handshakeClientId || sessionId;

    socket.on('join-room', (payload = {}, ack = () => {}) => {
        const { roomId, username, clientId: payloadClientId } = payload;
        const cleanName = (username || '').trim();
        const normalizedRoom = normalizeRoom(roomId);
        const clientId = resolveClientId(socket, payloadClientId);

        if (!cleanName) {
            return ack({ ok: false, error: '请填写昵称' });
        }
        if (!normalizedRoom) {
            return ack({ ok: false, error: '房间号缺失' });
        }

        const room = ensureRoom(normalizedRoom);
        let isRejoin = false;

        // 首先通过身份索引回收同一身份的旧连接（核心：解决快速刷新问题）
        const identityKey = buildIdentityKey(normalizedRoom, sessionId, clientId);
        if (identityKey) {
            const previousSocketId = room.identities.get(identityKey);
            if (previousSocketId && previousSocketId !== socket.id) {
                if (removeUserFromRoom(room, previousSocketId, normalizedRoom)) {
                    isRejoin = true;
                }
            }
        }

        const userKey = `${normalizedRoom}:${cleanName}`;

        // 检查是否有待发送的离开消息（刷新场景）
        const pendingTimer = pendingLeaveTimers.get(userKey);
        if (pendingTimer) {
            // 通过sessionId或clientId匹配来判断是否同一用户
            if (isSameIdentity(pendingTimer, sessionId, clientId)) {
                clearTimeout(pendingTimer.timeoutId);
                pendingLeaveTimers.delete(userKey);
                isRejoin = true;
            } else {
                // 有其他用户正在使用此昵称（在离开窗口期内）
                return ack({ ok: false, error: '该昵称已被使用，请换一个' });
            }
        }

        // 检查房间内是否已有同名用户
        const matchingUsers = Array.from(room.users.entries()).filter(([, u]) => u.name === cleanName);
        const releasableUsers = [];
        let hasConflict = false;

        matchingUsers.forEach(([existingSocketId, user]) => {
            if (isSameIdentity(user, sessionId, clientId)) {
                releasableUsers.push([existingSocketId, user]);
            } else {
                hasConflict = true;
            }
        });

        if (hasConflict) {
            return ack({ ok: false, error: '该昵称已被使用，请换一个' });
        }

        // 清理同一身份的旧连接（刷新场景）
        if (releasableUsers.length > 0) {
            releasableUsers.forEach(([oldSocketId, userRecord]) => {
                if (removeUserFromRoom(room, oldSocketId, normalizedRoom, userRecord)) {
                    isRejoin = true;
                }
            });
        }

        // 创建用户记录
        const userRecord = {
            socketId: socket.id,
            name: cleanName,
            sessionId,
            clientId,
            identityKey,
            joinedAt: Date.now(),
            cameraOn: false,
            status: null,
        };

        room.users.set(socket.id, userRecord);

        // 更新身份索引
        if (identityKey) {
            room.identities.set(identityKey, socket.id);
        }

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
        // 检查是否已被标记为跳过（由removeUserFromRoom标记）
        if (skippedDisconnects.has(socket.id)) {
            skippedDisconnects.delete(socket.id);
            return;
        }

        const { roomId, sessionId: userSessionId, clientId: userClientId } = socket.data;
        if (!roomId) return;
        const room = rooms.get(roomId);
        if (!room) return;

        const user = room.users.get(socket.id);
        room.users.delete(socket.id);

        // 清理身份索引
        if (user) {
            const identityKey = user.identityKey || buildIdentityKey(roomId, user.sessionId, user.clientId || userClientId);
            if (identityKey && room.identities && room.identities.get(identityKey) === socket.id) {
                room.identities.delete(identityKey);
            }
        }

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

            // 创建新的定时器记录（包含clientId用于刷新场景识别）
            const timerRecord = {
                sessionId: user.sessionId || userSessionId,
                clientId: user.clientId || userClientId || socket.data.clientId || null,
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
