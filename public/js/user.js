import { SignalingClient, extractRoomId, generateDisplayName, rtcConfig } from './signaling.js';

// Arabic translations
const t = {
  requestingDevices: 'جاري طلب الأجهزة...',
  devicesReady: 'الأجهزة جاهزة',
  deviceError: 'خطأ في الأجهزة',
  unableToAccess: 'غير قادر على الوصول للكاميرا/الميكروفون.',
  weCanHearYou: 'يمكننا سماعك',
  mutedQuiet: 'صامت / هادئ',
  connecting: 'جاري الاتصال...',
  inCall: 'في المكالمة',
  you: 'أنت',
  waitingForOthers: 'في انتظار انضمام الآخرين...',
  peer: 'مشارك',
  leave: 'مغادرة',
  thankYou: 'شكراً لك!',
  thankYouMessage: 'شكراً لاستخدامك تطبيقنا. نتمنى أن تكون تجربتك ممتعة!',
  close: 'إغلاق',
};

const roomId = extractRoomId();
const displayName = generateDisplayName('مستخدم');

const roomIdLabel = document.getElementById('roomIdLabel');
const connectionStatus = document.getElementById('connectionStatus');
const preJoin = document.getElementById('preJoin');
const callView = document.getElementById('callView');
const joinButton = document.getElementById('joinButton');
const prejoinPreview = document.getElementById('prejoinPreview');
const audioLevel = document.getElementById('audioLevel');
const audioStatus = document.getElementById('audioStatus');
const togglePreMic = document.getElementById('togglePreMic');
const togglePreCam = document.getElementById('togglePreCam');
const toggleMic = document.getElementById('toggleMic');
const toggleCam = document.getElementById('toggleCam');
const toggleSelfView = document.getElementById('toggleSelfView');
const leaveButton = document.getElementById('leaveButton');
const videoStage = document.getElementById('videoStage');
const videoGrid = document.getElementById('videoGrid');
const emptyState = document.getElementById('emptyState');
const thankYouModal = document.getElementById('thankYouModal');
const closeThankYouModal = document.getElementById('closeThankYouModal');
const thankYouMessage = document.getElementById('thankYouMessage');

// Hide leave button initially
if (leaveButton) {
  leaveButton.style.display = 'none';
}

roomIdLabel.textContent = roomId;

// Set thank you message text
if (thankYouMessage) {
  thankYouMessage.textContent = t.thankYouMessage;
}
if (closeThankYouModal && closeThankYouModal.querySelector('span')) {
  closeThankYouModal.querySelector('span').textContent = t.close;
}

let localStream;
let signaling;
let audioContext;
let analyser;
let dataArray;
const peerConnections = new Map();
const mediaElements = new Map();
const peerLabels = new Map();
const mediaStates = new Map();
let selfViewHidden = false;
let selfViewPosition = null;

initDevices();

joinButton.addEventListener('click', async () => {
  joinButton.disabled = true;
  await startCall();
});

togglePreMic.addEventListener('click', toggleMicTrack);
togglePreCam.addEventListener('click', toggleCameraTrack);
toggleMic.addEventListener('click', toggleMicTrack);
toggleCam.addEventListener('click', toggleCameraTrack);
toggleSelfView.addEventListener('click', handleSelfViewToggle);

leaveButton.addEventListener('click', handleLeave);
closeThankYouModal.addEventListener('click', () => {
  thankYouModal.hidden = true;
  // Redirect to home or close the page
  window.location.href = '/';
});

function handleLeave() {
  // Clean up all connections
  if (signaling) {
    signaling.disconnect();
    signaling = null;
  }
  
  // Close all peer connections
  peerConnections.forEach((pc) => {
    if (pc) {
      pc.close();
    }
  });
  peerConnections.clear();
  
  // Clear media elements
  mediaElements.forEach((entry) => {
    if (entry && entry.tile) {
      entry.tile.remove();
    }
  });
  mediaElements.clear();
  
  // Stop all media tracks
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  
  // Stop audio context
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
    audioContext = null;
  }
  
  // Hide call view
  if (callView) {
    callView.classList.remove('active');
  }
  
  // Hide leave button
  if (leaveButton) {
    leaveButton.style.display = 'none';
  }
  
  // Show thank you modal
  if (thankYouModal) {
    thankYouModal.hidden = false;
  }
}

window.addEventListener('beforeunload', () => {
  if (signaling) {
    signaling.disconnect();
  }
});

window.addEventListener('resize', () => {
  const entry = mediaElements.get('local');
  if (entry) {
    clampSelfViewPosition(entry.tile);
  }
});

// Check and request permissions explicitly
async function checkAndRequestPermissions() {
  try {
    // Check microphone permission
    if (navigator.permissions && navigator.permissions.query) {
      const micPermission = await navigator.permissions.query({ name: 'microphone' });
      const camPermission = await navigator.permissions.query({ name: 'camera' });
      
      // If permissions are denied, we still try getUserMedia to trigger browser prompt
      // The browser will show its own prompt when getUserMedia is called
      if (micPermission.state === 'denied' || camPermission.state === 'denied') {
        console.log('Permissions denied, will request again via getUserMedia');
      }
    }
  } catch (error) {
    // Permissions API might not be available in all browsers
    // This is fine, we'll proceed with getUserMedia which will prompt
    console.log('Permissions API not available, will use getUserMedia directly');
  }
}

async function initDevices() {
  connectionStatus.textContent = t.requestingDevices;
  joinButton.disabled = true;

  try {
    // First check and request permissions explicitly
    await checkAndRequestPermissions();
    
    // Request media with explicit constraints - this will always prompt if permissions not granted
    localStream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      }, 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    prejoinPreview.srcObject = localStream;
    registerVideoReady(prejoinPreview);
    startAudioMeter(localStream);
    updateMicButtons(localStream.getAudioTracks()[0]?.enabled !== false);
    updateCameraButtons(localStream.getVideoTracks()[0]?.enabled !== false);
    joinButton.disabled = false;
    connectionStatus.textContent = t.devicesReady;
  } catch (error) {
    console.error('Error requesting media permissions:', error);
    connectionStatus.textContent = t.deviceError;
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      audioStatus.textContent = 'تم رفض الإذن. يرجى السماح بالوصول للكاميرا والميكروفون من إعدادات المتصفح.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      audioStatus.textContent = 'لم يتم العثور على كاميرا أو ميكروفون. يرجى التأكد من توصيل الأجهزة.';
    } else {
      audioStatus.textContent = t.unableToAccess;
    }
  }
}

function startAudioMeter(stream) {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  dataArray = new Uint8Array(analyser.fftSize);
  source.connect(analyser);
  rafMeter();
}

function rafMeter() {
  if (!analyser) return;
  analyser.getByteTimeDomainData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i += 1) {
    const value = (dataArray[i] - 128) / 128;
    sum += value * value;
  }
  const volume = Math.min(1, Math.sqrt(sum / dataArray.length) * 4);
  audioLevel.style.width = `${Math.max(volume * 100, 4)}%`;
  audioStatus.textContent = volume > 0.08 ? t.weCanHearYou : t.mutedQuiet;
  requestAnimationFrame(rafMeter);
}

async function startCall() {
  if (!localStream) return;

  preJoin.classList.remove('active');
  callView.classList.add('active');
  connectionStatus.textContent = t.connecting;
  
  // Show leave button when call starts
  if (leaveButton) {
    leaveButton.style.display = 'flex';
  }

  try {
    signaling = new SignalingClient(roomId);
    
    // Wait a bit for socket connection
    if (!signaling.socket.connected) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);
        
        signaling.socket.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        signaling.socket.once('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    }
    
    // IMPORTANT: Set up handlers BEFORE joining to catch peer-joined events
    setupSignalingHandlers();
    console.log('[User] Signaling handlers set up, attempting to join room:', roomId);
    const existingPeers = await signaling.join({ displayName });
    console.log('[User] Successfully joined room, existing peers:', existingPeers.length);
    connectionStatus.textContent = t.inCall;

    addOrUpdateTile('local', t.you, localStream, true);
    setPeerMediaState('local', getLocalMediaState());
    emitLocalMediaState();
    updateWaitingState();

    existingPeers.forEach(({ socketId, displayName: name, audioEnabled, videoEnabled }) => {
      console.log('[User] Creating connection to peer:', socketId, name);
      peerLabels.set(socketId, name || `${t.peer} ${socketId.slice(-4)}`);
      setPeerMediaState(socketId, { audioEnabled, videoEnabled });
      createPeerConnection(socketId, { isInitiator: true, label: peerLabels.get(socketId) });
      makeOffer(socketId);
    });
  } catch (error) {
    console.error('[User] Failed to start call:', error);
    connectionStatus.textContent = 'خطأ في الاتصال';
    connectionStatus.classList.add('bad');
    let errorMessage = 'حدث خطأ أثناء الاتصال. يرجى إعادة المحاولة.';
    if (error.message && error.message.includes('timeout')) {
      errorMessage = 'فشل الاتصال بالخادم. يرجى التحقق من:\n1. الاتصال بالإنترنت\n2. أن ngrok يعمل\n3. أن الرابط صحيح';
    } else if (error.message && error.message.includes('Join timeout')) {
      errorMessage = 'انتهت مهلة الاتصال. يرجى التحقق من أن الخادم يعمل وأن الرابط صحيح.';
    }
    alert(errorMessage);
    // Go back to prejoin
    preJoin.classList.add('active');
    callView.classList.remove('active');
    if (signaling) {
      signaling.disconnect();
      signaling = null;
    }
  }
}

function setupSignalingHandlers() {
  signaling.onPeerJoined(({ socketId, displayName: name, audioEnabled, videoEnabled }) => {
    console.log('[User] Peer joined event received:', socketId, name);
    peerLabels.set(socketId, name || `${t.peer} ${socketId.slice(-4)}`);
    setPeerMediaState(socketId, { audioEnabled, videoEnabled });
    createPeerConnection(socketId, { isInitiator: false, label: peerLabels.get(socketId) });
    addPlaceholderTile(socketId, peerLabels.get(socketId));
  });

  signaling.onPeerLeft(({ socketId }) => {
    removePeer(socketId);
  });

  signaling.onSignal(async ({ senderId, data }) => {
    console.log('[User] Received signal from', senderId, 'type:', data.type);
    let pc = peerConnections.get(senderId);
    if (!pc) {
      console.log('[User] Creating new peer connection for', senderId);
      createPeerConnection(senderId, { isInitiator: false, label: peerLabels.get(senderId) });
      pc = peerConnections.get(senderId);
    }

    if (data.type === 'offer') {
      console.log('[User] Processing offer from', senderId);
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[User] Sending answer to', senderId);
      signaling.sendSignal(senderId, { type: 'answer', sdp: answer });
    } else if (data.type === 'answer') {
      console.log('[User] Processing answer from', senderId);
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    } else if (data.type === 'ice-candidate' && data.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log('[User] Added ICE candidate from', senderId);
      } catch (error) {
        console.error('[User] Error adding ICE candidate from', senderId, ':', error);
      }
    }
  });

  signaling.onPeerMediaUpdated(({ socketId, audioEnabled, videoEnabled }) => {
    setPeerMediaState(socketId, { audioEnabled, videoEnabled });
  });
}

function createPeerConnection(peerId, { isInitiator = false, label } = {}) {
  if (peerConnections.has(peerId)) {
    console.log('[User] Peer connection already exists for', peerId);
    return peerConnections.get(peerId);
  }

  console.log('[User] Creating new peer connection for', peerId, 'isInitiator:', isInitiator);
  const pc = new RTCPeerConnection(rtcConfig);
  peerConnections.set(peerId, pc);

  localStream.getTracks().forEach((track) => {
    console.log('[User] Adding track to peer connection:', track.kind, track.id);
    pc.addTrack(track, localStream);
  });

  pc.ontrack = (event) => {
    console.log('[User] Received track from peer', peerId, 'track:', event.track.kind);
    const peerLabel = peerLabels.get(peerId) || label || `${t.peer} ${peerId.slice(-4)}`;
    const stream = event.streams[0];
    addOrUpdateTile(peerId, peerLabel, stream);
    
    // Listen for track ended events to update visual when remote peer disables camera
    event.track.addEventListener('ended', () => {
      const entry = mediaElements.get(peerId);
      if (entry) {
        updateTileVisual(entry, peerLabel);
      }
    });
    
    // Listen for track mute/unmute to update visual
    event.track.addEventListener('mute', () => {
      const entry = mediaElements.get(peerId);
      if (entry) {
        updateTileVisual(entry, peerLabel);
      }
    });
    
    event.track.addEventListener('unmute', () => {
      const entry = mediaElements.get(peerId);
      if (entry) {
        updateTileVisual(entry, peerLabel);
      }
    });
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('[User] ICE candidate generated for', peerId);
      signaling.sendSignal(peerId, { type: 'ice-candidate', candidate: event.candidate });
    } else {
      console.log('[User] ICE gathering complete for', peerId);
    }
  };

  pc.onconnectionstatechange = () => {
    console.log('[User] Connection state changed for', peerId, ':', pc.connectionState);
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      console.log('[User] Removing peer due to connection state:', peerId);
      removePeer(peerId);
    } else if (pc.connectionState === 'connected') {
      console.log('[User] Successfully connected to peer:', peerId);
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log('[User] ICE connection state changed for', peerId, ':', pc.iceConnectionState);
    if (pc.iceConnectionState === 'failed') {
      console.log('[User] ICE connection failed, attempting to restart ICE');
      // Try to restart ICE
      pc.restartIce();
    }
  };

  if (isInitiator) {
    const peerLabel = label || peerLabels.get(peerId) || `Peer ${peerId.slice(-4)}`;
    addPlaceholderTile(peerId, peerLabel);
  }

  return pc;
}

async function makeOffer(peerId) {
  const pc = peerConnections.get(peerId);
  if (!pc) {
    console.error('[User] Cannot make offer: no peer connection for', peerId);
    return;
  }
  console.log('[User] Making offer to peer:', peerId);
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log('[User] Offer created and set, sending to peer:', peerId);
    signaling.sendSignal(peerId, { type: 'offer', sdp: offer });
  } catch (error) {
    console.error('[User] Error making offer to', peerId, ':', error);
  }
}

function addOrUpdateTile(peerId, label, stream, muted = false) {
  let entry = mediaElements.get(peerId);
  if (!entry) {
    entry = createVideoTile(peerId, label, muted);
    mediaElements.set(peerId, entry);
  }

  entry.video.srcObject = stream;
  entry.video.muted = muted;
  registerVideoReady(entry.video);
  updateTileVisual(entry, label);
  if (peerId !== 'local') {
    updatePrimaryRemoteTile();
  } else {
    updateSelfViewVisibility();
  }
}

function addPlaceholderTile(peerId, label) {
  if (mediaElements.has(peerId)) return;
  const entry = createVideoTile(peerId, label);
  mediaElements.set(peerId, entry);
  updateTileVisual(entry, label);
  if (peerId !== 'local') {
    updatePrimaryRemoteTile();
  } else {
    updateSelfViewVisibility();
  }
}

function createVideoTile(peerId, label, muted = false) {
  const tile = document.createElement('div');
  tile.className = 'video-tile';
  tile.dataset.peerId = peerId;
  if (peerId === 'local') {
    tile.classList.add('local-tile');
    initializeSelfViewTile(tile);
  } else {
    tile.classList.add('remote-tile');
  }

  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.muted = muted;
  registerVideoReady(video);

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = label?.charAt(0).toUpperCase() || '?';

  const nameTag = document.createElement('span');
  nameTag.className = 'label';
  nameTag.textContent = label;

  const mediaFlags = document.createElement('div');
  mediaFlags.className = 'media-flags';

  tile.appendChild(video);
  tile.appendChild(avatar);
  tile.appendChild(nameTag);
  tile.appendChild(mediaFlags);
  videoGrid.appendChild(tile);

  return { tile, video, avatar, labelEl: nameTag, flags: mediaFlags };
}

function updateTileVisual({ video, avatar, labelEl, flags }, label) {
  const peerId = video.parentElement?.dataset?.peerId;
  const state = getMediaState(peerId);
  if (label && labelEl) {
    labelEl.textContent = label;
    avatar.textContent = label.charAt(0).toUpperCase();
  }
  // Check if there are any video tracks and if they're enabled
  const videoTracks = video.srcObject ? video.srcObject.getVideoTracks() : [];
  // A track is considered active if it's enabled AND live (not ended)
  const hasActiveVideoTrack = videoTracks.length > 0 && videoTracks.some((track) => 
    track.enabled && track.readyState === 'live' && !track.muted
  );
  // Show video only if state says video is enabled AND there's an active video track
  const hasVideo = state.videoEnabled && hasActiveVideoTrack;
  video.style.display = hasVideo ? 'block' : 'none';
  if (avatar) {
    avatar.style.display = hasVideo ? 'none' : 'flex';
    avatar.style.opacity = hasVideo ? '0' : '1';
  }
  if (labelEl) {
    labelEl.style.opacity = hasVideo ? '0' : '1';
  }
  if (peerId && mediaElements.has(peerId)) {
    renderMediaFlags(mediaElements.get(peerId), state);
  }
}

function removePeer(peerId) {
  const pc = peerConnections.get(peerId);
  if (pc) {
    pc.close();
    peerConnections.delete(peerId);
  }
  peerLabels.delete(peerId);
  mediaStates.delete(peerId);
  const entry = mediaElements.get(peerId);
  if (entry) {
    entry.video.srcObject = null;
    entry.tile.remove();
    mediaElements.delete(peerId);
  }
  if (peerId === 'local') {
    updateSelfViewVisibility();
  }
  updatePrimaryRemoteTile();
}

async function toggleMicTrack() {
  if (!localStream) return;
  const [track] = localStream.getAudioTracks();
  const isEnabled = track && track.enabled && track.readyState === 'live';
  
  if (isEnabled) {
    // Disable: stop the track completely to release the microphone
    track.stop();
    localStream.removeTrack(track);
    
    // Remove track from all peer connections
    peerConnections.forEach((pc, peerId) => {
      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
      if (sender) {
        pc.removeTrack(sender);
        makeOffer(peerId);
      }
    });
    
    updateMicButtons(false);
  } else {
    // Enable: request new audio track with explicit permission request
    try {
      // Check permission first
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const micPermission = await navigator.permissions.query({ name: 'microphone' });
          if (micPermission.state === 'denied') {
            console.log('Microphone permission denied, requesting again');
          }
        } catch (e) {
          // Permissions API might not support microphone query
        }
      }
      
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });
      const newTrack = newStream.getAudioTracks()[0];
      if (newTrack) {
        // Stop other tracks from the new stream (if any) to avoid resource leaks
        newStream.getTracks().forEach(t => {
          if (t !== newTrack) t.stop();
        });
        
        localStream.addTrack(newTrack);
        
        // Add track to all peer connections
        peerConnections.forEach((pc, peerId) => {
          pc.addTrack(newTrack, localStream);
          makeOffer(peerId);
        });
        
        updateMicButtons(true);
        
        // Restart audio meter - need to recreate the source
        if (audioContext) {
          // Disconnect old sources if any
          if (audioContext.state !== 'closed') {
            try {
              const oldSource = audioContext.createMediaStreamSource(localStream);
              // Create new analyser connection
              if (!analyser) {
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                dataArray = new Uint8Array(analyser.fftSize);
              }
              oldSource.connect(analyser);
            } catch (e) {
              // If context is closed, recreate it
              startAudioMeter(localStream);
            }
          } else {
            startAudioMeter(localStream);
          }
        } else {
          startAudioMeter(localStream);
        }
      }
    } catch (error) {
      console.error('Failed to enable microphone:', error);
      updateMicButtons(false);
    }
  }
  
  setPeerMediaState('local', getLocalMediaState());
  emitLocalMediaState();
}

async function toggleCameraTrack() {
  if (!localStream) return;
  const [track] = localStream.getVideoTracks();
  const isEnabled = track && track.enabled && track.readyState === 'live';
  
  if (isEnabled) {
    // Disable: stop the track completely to release the camera
    track.stop();
    localStream.removeTrack(track);
    
    // Update media state first
    setPeerMediaState('local', getLocalMediaState());
    
    // Remove track from all peer connections
    peerConnections.forEach((pc, peerId) => {
      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        pc.removeTrack(sender);
        makeOffer(peerId);
      }
    });
    
    updateCameraButtons(false);
    
    // Immediately update visual to show avatar
    const entry = mediaElements.get('local');
    if (entry) {
      updateTileVisual(entry, t.you);
    }
  } else {
    // Enable: request new video track with explicit permission request
    try {
      // Check permission first
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const camPermission = await navigator.permissions.query({ name: 'camera' });
          if (camPermission.state === 'denied') {
            console.log('Camera permission denied, requesting again');
          }
        } catch (e) {
          // Permissions API might not support camera query
        }
      }
      
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: false 
      });
      const newTrack = newStream.getVideoTracks()[0];
      if (newTrack) {
        // Stop other tracks from the new stream (if any) to avoid resource leaks
        newStream.getTracks().forEach(t => {
          if (t !== newTrack) t.stop();
        });
        
        localStream.addTrack(newTrack);
        
        // Add track to all peer connections
        peerConnections.forEach((pc, peerId) => {
          pc.addTrack(newTrack, localStream);
          makeOffer(peerId);
        });
        
        updateCameraButtons(true);
        
        // Update preview if in prejoin - force reload
        if (prejoinPreview) {
          prejoinPreview.srcObject = null;
          prejoinPreview.srcObject = localStream;
        }
        
        // Update local video tile if in call
        const entry = mediaElements.get('local');
        if (entry && entry.video) {
          entry.video.srcObject = localStream;
        }
      }
    } catch (error) {
      console.error('Failed to enable camera:', error);
      updateCameraButtons(false);
    }
  }
  
  const entry = mediaElements.get('local');
  if (entry) {
    updateTileVisual(entry, t.you);
  }
  setPeerMediaState('local', getLocalMediaState());
  emitLocalMediaState();
}

function updateMicButtons(enabled) {
  togglePreMic.dataset.active = enabled;
  toggleMic.dataset.active = enabled;
  const icon = enabled ? 'fa-microphone' : 'fa-microphone-slash';
  togglePreMic.querySelector('i').className = `fas ${icon}`;
  toggleMic.querySelector('i').className = `fas ${icon}`;
}

function updateCameraButtons(enabled) {
  togglePreCam.dataset.active = enabled;
  toggleCam.dataset.active = enabled;
  const icon = enabled ? 'fa-video' : 'fa-video-slash';
  togglePreCam.querySelector('i').className = `fas ${icon}`;
  toggleCam.querySelector('i').className = `fas ${icon}`;
  const entry = mediaElements.get('local');
  if (entry) {
    updateTileVisual(entry, t.you);
  }
}

function registerVideoReady(video) {
  if (!video) return;
  if (!video.dataset.readyListenerBound) {
    video.dataset.readyListenerBound = 'true';
    video.addEventListener('loadeddata', () => {
      video.classList.add('ready');
    });
  }
  if (video.readyState >= 2) {
    video.classList.add('ready');
  }
}

function updatePrimaryRemoteTile() {
  let firstRemote = null;
  mediaElements.forEach((entry, key) => {
    if (key === 'local') {
      entry.tile.classList.remove('primary-remote');
      return;
    }
    entry.tile.classList.remove('primary-remote');
    if (!firstRemote) {
      firstRemote = entry;
    }
  });
  if (firstRemote) {
    firstRemote.tile.classList.add('primary-remote');
  }
  updateWaitingState();
}

function handleSelfViewToggle() {
  selfViewHidden = !selfViewHidden;
  updateSelfViewVisibility();
}

function updateSelfViewVisibility() {
  const entry = mediaElements.get('local');
  if (!entry) {
    toggleSelfView.disabled = true;
    return;
  }
  toggleSelfView.disabled = false;
  entry.tile.style.display = selfViewHidden ? 'none' : '';
  if (!selfViewHidden) {
    applySelfViewPosition(entry.tile);
  }
  toggleSelfView.dataset.active = !selfViewHidden;
  const icon = selfViewHidden ? 'fa-eye' : 'fa-eye-slash';
  toggleSelfView.querySelector('i').className = `fas ${icon}`;
}

function initializeSelfViewTile(tile) {
  if (tile.dataset.selfViewInit) {
    return;
  }
  tile.dataset.selfViewInit = 'true';
  tile.style.cursor = 'grab';
  applySelfViewPosition(tile);
  tile.addEventListener('pointerdown', startSelfViewDrag);
  tile.addEventListener('dblclick', () => {
    selfViewPosition = null;
    applySelfViewPosition(tile);
  });
}

function startSelfViewDrag(event) {
  if (selfViewHidden) return;
  event.preventDefault();
  const tile = event.currentTarget;
  tile.style.cursor = 'grabbing';
  const rect = tile.getBoundingClientRect();
  const parentRect = getSelfViewParentRect(tile);
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;

  const move = (e) => {
    const desiredLeft = e.clientX - parentRect.left - offsetX;
    const desiredTop = e.clientY - parentRect.top - offsetY;
    const { left, top } = getClampedPosition(desiredLeft, desiredTop, tile, parentRect);
    tile.style.left = `${left}px`;
    tile.style.top = `${top}px`;
    tile.style.right = 'auto';
    tile.style.bottom = 'auto';
    selfViewPosition = { left, top };
  };

  const end = () => {
    tile.style.cursor = 'grab';
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', end);
    document.removeEventListener('pointercancel', end);
  };

  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
}

function applySelfViewPosition(tile) {
  if (selfViewPosition) {
    const parentRect = getSelfViewParentRect(tile);
    const { left, top } = getClampedPosition(selfViewPosition.left, selfViewPosition.top, tile, parentRect);
    selfViewPosition = { left, top };
    tile.style.left = `${left}px`;
    tile.style.top = `${top}px`;
    tile.style.right = 'auto';
    tile.style.bottom = 'auto';
  } else {
    tile.style.left = '';
    tile.style.top = '';
    tile.style.right = '';
    tile.style.bottom = '';
  }
}

function clampSelfViewPosition(tile) {
  if (!selfViewPosition) return;
  applySelfViewPosition(tile);
}

function getClampedPosition(desiredLeft, desiredTop, tile, parentRect) {
  const margin = 12;
  const maxLeft = Math.max(margin, parentRect.width - tile.offsetWidth - margin);
  const maxTop = Math.max(margin, parentRect.height - tile.offsetHeight - margin);
  return {
    left: clamp(desiredLeft, margin, maxLeft),
    top: clamp(desiredTop, margin, maxTop),
  };
}

function getSelfViewParentRect(tile) {
  if (tile.offsetParent) {
    return tile.offsetParent.getBoundingClientRect();
  }
  if (videoStage) {
    return videoStage.getBoundingClientRect();
  }
  return {
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function updateWaitingState() {
  if (!emptyState) return;
  const remoteCount = [...mediaElements.keys()].filter((key) => key !== 'local').length;
  emptyState.hidden = remoteCount > 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getLocalMediaState() {
  const audioTrack = localStream?.getAudioTracks()?.[0];
  const videoTrack = localStream?.getVideoTracks()?.[0];
  return {
    audioEnabled: audioTrack ? audioTrack.enabled : true,
    videoEnabled: videoTrack ? videoTrack.enabled : true,
  };
}

function emitLocalMediaState() {
  if (!signaling?.socket) return;
  const state = getLocalMediaState();
  signaling.socket.emit('media-state-changed', state);
}

function setPeerMediaState(peerId, state = {}) {
  const previous = mediaStates.get(peerId) || { audioEnabled: true, videoEnabled: true };
  const next = {
    audioEnabled: typeof state.audioEnabled === 'boolean' ? state.audioEnabled : previous.audioEnabled,
    videoEnabled: typeof state.videoEnabled === 'boolean' ? state.videoEnabled : previous.videoEnabled,
  };
  mediaStates.set(peerId, next);
  const entry = mediaElements.get(peerId);
  if (entry) {
    // Force update visual when media state changes, especially for remote peers
    const label = entry.labelEl?.textContent || peerLabels.get(peerId) || '';
    updateTileVisual(entry, label);
  }
  if (peerId !== 'local') {
    updateWaitingState();
  }
}

function getMediaState(peerId) {
  return mediaStates.get(peerId) || { audioEnabled: true, videoEnabled: true };
}

function renderMediaFlags(entry, state) {
  if (!entry?.flags) return;
  entry.flags.innerHTML = '';
  if (!state.audioEnabled) {
    const flag = document.createElement('span');
    flag.className = 'media-flag';
    flag.title = 'Microphone Off';
    const icon = document.createElement('i');
    icon.className = 'fas fa-microphone-slash';
    flag.appendChild(icon);
    entry.flags.appendChild(flag);
  }
  if (!state.videoEnabled) {
    const flag = document.createElement('span');
    flag.className = 'media-flag';
    flag.title = 'Camera Off';
    const icon = document.createElement('i');
    icon.className = 'fas fa-video-slash';
    flag.appendChild(icon);
    entry.flags.appendChild(flag);
  }
}

