require('dotenv').config();

const path = require('path');
const fs = require('fs/promises');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const PORT = process.env.PORT || 3500;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'meet-admin';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/room/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

app.get('/room/:roomId/admin', (req, res) => {
  const { roomId } = req.params;
  const savingPath = sanitizeSavingPath(req.query['saving-path']);
  console.log(`[admin-route] room=${roomId} saving-path=${savingPath || 'not provided'}`);
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ ok: false, message: 'Password is required.' });
  }

  if (password === ADMIN_PASSWORD) {
    return res.json({ ok: true });
  }

  return res.status(401).json({ ok: false, message: 'Invalid admin password.' });
});

app.post('/api/admin/notes', async (req, res) => {
  const { roomId, notes, savingPath } = req.body || {};
  if (!roomId || !savingPath) {
    return res.status(400).json({ ok: false, message: 'roomId and savingPath are required.' });
  }

  const cleanedPath = sanitizeSavingPath(savingPath);
  if (!cleanedPath) {
    return res.status(400).json({ ok: false, message: 'savingPath is invalid.' });
  }

  try {
    const resolvedDir = path.resolve(cleanedPath);
    const roomDir = path.join(resolvedDir, `room-${String(roomId).replace(/[^a-z0-9-_]/gi, '_')}`);
    await fs.mkdir(roomDir, { recursive: true });

    const notesDir = path.join(roomDir, 'notes');
    await fs.mkdir(notesDir, { recursive: true });

    const safeRoomSegment = String(roomId).replace(/[^a-z0-9-_]/gi, '_');
    const fileName = `notes-${safeRoomSegment}-${Date.now()}.txt`;
    const fullPath = path.join(notesDir, fileName);

    await fs.writeFile(fullPath, notes || '', 'utf8');

    return res.json({ ok: true, filePath: fullPath });
  } catch (error) {
    console.error('[notes-save] failed', error);
    return res.status(500).json({ ok: false, message: 'Failed to save notes to disk.' });
  }
});

// Configure multer for memory storage (we'll write to disk ourselves)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
});

app.post('/api/admin/recording', upload.single('recording'), async (req, res) => {
  const { roomId, savingPath, fileName } = req.body || {};
  const file = req.file;
  
  if (!roomId || !savingPath) {
    return res.status(400).json({ ok: false, message: 'roomId and savingPath are required.' });
  }

  if (!file) {
    return res.status(400).json({ ok: false, message: 'Recording file is required.' });
  }

  const cleanedPath = sanitizeSavingPath(savingPath);
  if (!cleanedPath) {
    return res.status(400).json({ ok: false, message: 'savingPath is invalid.' });
  }

  try {
    const resolvedDir = path.resolve(cleanedPath);
    const roomDir = path.join(resolvedDir, `room-${String(roomId).replace(/[^a-z0-9-_]/gi, '_')}`);
    await fs.mkdir(roomDir, { recursive: true });

    const recordingsDir = path.join(roomDir, 'recordings');
    await fs.mkdir(recordingsDir, { recursive: true });

    const safeRoomSegment = String(roomId).replace(/[^a-z0-9-_]/gi, '_');
    const safeFileName = fileName || file.originalname || `recording-${safeRoomSegment}-${Date.now()}.webm`;
    const fullPath = path.join(recordingsDir, safeFileName);

    // Write the file buffer to disk
    await fs.writeFile(fullPath, file.buffer);

    console.log(`[recording-save] Saved recording to: ${fullPath} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    return res.json({ ok: true, filePath: fullPath });
  } catch (error) {
    console.error('[recording-save] failed', error);
    return res.status(500).json({ ok: false, message: 'Failed to save recording to disk.' });
  }
});

io.on('connection', (socket) => {
  console.log('[socket] connected', socket.id, 'from', socket.handshake.address || 'unknown');

  socket.on('join-room', ({ roomId, displayName, isAdmin }) => {
    if (!roomId) {
      console.log('[socket] join-room rejected: no roomId provided');
      return;
    }

    console.log(`[socket] ${socket.id} attempting to join room: ${roomId}, displayName: ${displayName || 'Guest'}, isAdmin: ${isAdmin}`);
    
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.displayName = displayName || 'Guest';
    socket.data.isAdmin = Boolean(isAdmin);
    socket.data.audioEnabled = true;
    socket.data.videoEnabled = true;

    const room = io.sockets.adapter.rooms.get(roomId);
    const peers = [];
    if (room) {
      room.forEach((id) => {
        if (id === socket.id) return;
        const peerSocket = io.sockets.sockets.get(id);
        if (peerSocket) {
          peers.push({
            socketId: id,
            displayName: peerSocket?.data?.displayName || 'Guest',
            isAdmin: Boolean(peerSocket?.data?.isAdmin),
            audioEnabled: peerSocket?.data?.audioEnabled !== false,
            videoEnabled: peerSocket?.data?.videoEnabled !== false,
          });
        }
      });
    }

    console.log(`[socket] ${socket.id} joined room ${roomId}, found ${peers.length} existing peers`);
    socket.emit('peers-in-room', peers);

    socket.to(roomId).emit('peer-joined', {
      socketId: socket.id,
      displayName: socket.data.displayName,
      isAdmin: socket.data.isAdmin,
      audioEnabled: socket.data.audioEnabled !== false,
      videoEnabled: socket.data.videoEnabled !== false,
    });

    console.log(`[socket] ${socket.id} (${socket.data.displayName}) successfully joined room ${roomId}`);
  });

  socket.on('signal', ({ targetId, data }) => {
    if (!targetId || !data) {
      return;
    }

    const targetSocket = io.sockets.sockets.get(targetId);
    const originRoom = socket.data.roomId;

    if (!targetSocket || targetSocket.data.roomId !== originRoom) {
      return;
    }

    io.to(targetId).emit('signal', {
      senderId: socket.id,
      data,
    });
  });

  socket.on('media-state-changed', ({ audioEnabled, videoEnabled }) => {
    if (typeof audioEnabled === 'boolean') {
      socket.data.audioEnabled = audioEnabled;
    }
    if (typeof videoEnabled === 'boolean') {
      socket.data.videoEnabled = videoEnabled;
    }
    const roomId = socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('peer-media-updated', {
        socketId: socket.id,
        audioEnabled: socket.data.audioEnabled !== false,
        videoEnabled: socket.data.videoEnabled !== false,
      });
    }
  });

  socket.on('disconnect', (reason) => {
    const roomId = socket.data.roomId;
    console.log(`[socket] ${socket.id} disconnected: ${reason}`);
    if (roomId) {
      socket.to(roomId).emit('peer-left', { socketId: socket.id });
      console.log(`[socket] ${socket.id} left room ${roomId}`);
    }
  });

  socket.on('error', (error) => {
    console.error(`[socket] ${socket.id} error:`, error);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Make sure to use your ngrok URL for external access`);
});

function sanitizeSavingPath(rawPath) {
  if (!rawPath) {
    return '';
  }
  return rawPath.toString().trim().replace(/^['"]+|['"]+$/g, '');
}

