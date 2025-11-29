// Enhanced ICE servers configuration for better NAT traversal
// Includes multiple STUN servers and TURN servers for cross-network connectivity
const iceServers = [
  // Google STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // Additional STUN servers
  { urls: 'stun:stun.stunprotocol.org:3478' },
  { urls: 'stun:stun.voiparound.com' },
  { urls: 'stun:stun.voipbuster.com' },
  { urls: 'stun:stun.voipstunt.com' },
  // TURN servers - these are essential for cross-network connections
  // Using free public TURN servers (may have rate limits)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  // Additional TURN server
  {
    urls: 'turn:relay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:relay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:relay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
];

export const rtcConfig = { 
  iceServers,
  iceCandidatePoolSize: 10, // Pre-gather ICE candidates
  iceTransportPolicy: 'all', // Use both relay and direct connections
};

// Base URL for generating room links - can be overridden via environment or config
export const BASE_URL = (() => {
  // Try to get from window config, environment variable, or use current origin
  if (typeof window !== 'undefined' && window.BASE_URL) {
    return window.BASE_URL;
  }
  // Default to current origin
  return window.location.origin;
})();

export function getUserRoomUrl(roomId) {
  return `${BASE_URL}/room/${encodeURIComponent(roomId)}`;
}

export function extractRoomId() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const roomSegmentIndex = segments.indexOf('room');
  if (roomSegmentIndex === -1 || !segments[roomSegmentIndex + 1]) {
    throw new Error('Room id missing from URL.');
  }
  return decodeURIComponent(segments[roomSegmentIndex + 1]);
}

export function generateDisplayName(prefix = 'Guest') {
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

export class SignalingClient {
  constructor(roomId) {
    this.roomId = roomId;
    // Connect to Socket.IO with proper options for ngrok compatibility
    this.socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });
    
    // Add connection event listeners for debugging
    this.socket.on('connect', () => {
      console.log('[Signaling] Connected to server:', this.socket.id);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('[Signaling] Disconnected:', reason);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('[Signaling] Connection error:', error);
    });
    
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[Signaling] Reconnected after', attemptNumber, 'attempts');
    });
    
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Signaling] Reconnection attempt', attemptNumber);
    });
    
    this.socket.on('reconnect_error', (error) => {
      console.error('[Signaling] Reconnection error:', error);
    });
    
    this.socket.on('reconnect_failed', () => {
      console.error('[Signaling] Reconnection failed');
    });
  }

  async join({ displayName, isAdmin = false } = {}) {
    return new Promise((resolve, reject) => {
      // Set a timeout for the join operation
      const timeout = setTimeout(() => {
        this.socket.off('peers-in-room', handlePeers);
        this.socket.off('connect_error', handleError);
        reject(new Error('Join timeout: Server did not respond'));
      }, 15000); // 15 second timeout

      const handlePeers = (peers) => {
        clearTimeout(timeout);
        this.socket.off('peers-in-room', handlePeers);
        this.socket.off('connect_error', handleError);
        console.log('[Signaling] Joined room, received peers:', peers.length);
        resolve(peers);
      };

      const handleError = (error) => {
        clearTimeout(timeout);
        this.socket.off('peers-in-room', handlePeers);
        this.socket.off('connect_error', handleError);
        reject(error);
      };

      // Make sure socket is connected before joining
      if (!this.socket.connected) {
        console.log('[Signaling] Socket not connected, waiting for connection...');
        this.socket.once('connect', () => {
          console.log('[Signaling] Socket connected, now joining room...');
          this.socket.on('peers-in-room', handlePeers);
          this.socket.once('connect_error', handleError);
          this.socket.emit('join-room', {
            roomId: this.roomId,
            displayName,
            isAdmin,
          });
        });
        this.socket.once('connect_error', handleError);
      } else {
        console.log('[Signaling] Socket already connected, joining room...');
        this.socket.on('peers-in-room', handlePeers);
        this.socket.once('connect_error', handleError);
        this.socket.emit('join-room', {
          roomId: this.roomId,
          displayName,
          isAdmin,
        });
      }
    });
  }

  onPeerJoined(callback) {
    this.socket.on('peer-joined', callback);
  }

  onPeerLeft(callback) {
    this.socket.on('peer-left', callback);
  }

  onSignal(callback) {
    this.socket.on('signal', callback);
  }

  onPeerMediaUpdated(callback) {
    this.socket.on('peer-media-updated', callback);
  }

  sendSignal(targetId, payload) {
    this.socket.emit('signal', {
      targetId,
      data: payload,
    });
  }

  disconnect() {
    this.socket.disconnect();
  }
}

