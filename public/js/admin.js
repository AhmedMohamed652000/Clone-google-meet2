import { SignalingClient, extractRoomId, generateDisplayName, rtcConfig, getUserRoomUrl } from './signaling.js';

// Arabic translations
const t = {
  locked: 'مقفلة',
  authenticated: 'مصادق عليه',
  requestingDevices: 'جاري طلب الأجهزة...',
  devicesReady: 'الأجهزة جاهزة',
  deviceError: 'خطأ في الأجهزة',
  unableToAccess: 'غير قادر على الوصول للكاميرا/الميكروفون.',
  weCanHearYou: 'يمكننا سماعك',
  mutedQuiet: 'صامت / هادئ',
  connecting: 'جاري الاتصال...',
  inCall: 'في المكالمة (مدير)',
  you: 'أنت (مدير)',
  waitingForOthers: 'في انتظار انضمام الآخرين...',
  peer: 'مشارك',
  recording: 'جاري التسجيل',
  notesPlaceholder: 'اكتب الملاحظات أثناء الاجتماع...',
  savingTo: 'الحفظ في',
  notProvided: 'غير محدد',
  checkingDevices: 'جاري فحص الأجهزة...',
  recordingComplete: 'اكتمل التسجيل',
  recordingSaved: 'تم حفظ التسجيل',
  saveFailed: 'فشل الحفظ',
  noRecording: 'لا يوجد تسجيل',
  noRecordings: 'لا توجد تسجيلات',
  noSavingPath: 'لم يتم تحديد مسار الحفظ',
  alreadySaved: 'تم الحفظ بالفعل',
  allSaved: 'تم حفظ جميع التسجيلات',
  saving: 'جاري الحفظ...',
  saved: 'تم الحفظ',
  save: 'حفظ',
  saveAll: 'حفظ الكل',
  savingAll: 'جاري حفظ الكل...',
  savedCount: 'تم الحفظ',
  partialSave: 'حفظ جزئي',
  recordingNumber: 'تسجيل',
  currentRecording: 'التسجيل الحالي',
  noRecordingsYet: 'لا توجد تسجيلات بعد',
  duration: 'المدة',
  notesSaved: 'تم حفظ الملاحظات',
  notesSaveFailed: 'فشل حفظ الملاحظات',
  enterPassword: 'أدخل كلمة المرور',
  invalidPassword: 'كلمة مرور غير صحيحة',
  passwordRequired: 'كلمة المرور مطلوبة',
  recordingOptions: 'خيارات التسجيل',
  selectAudioOptions: 'اختر خيارات تسجيل الصوت',
  adminUsersAudio: 'صوت المدير + المشاركين',
  recordBothAudio: 'تسجيل صوتك وصوت جميع المشاركين',
  usersAudioOnly: 'صوت المشاركين فقط',
  recordUsersOnly: 'تسجيل صوت المشاركين فقط (صوتك مستبعد)',
  cancel: 'إلغاء',
  startRecording: 'بدء التسجيل',
  screenCaptureError: 'خطأ في التقاط الشاشة',
  permissionDenied: 'تم رفض الإذن. يرجى السماح بمشاركة الشاشة للتسجيل.',
  failedToStart: 'فشل بدء تسجيل الشاشة',
  noTracksAvailable: 'لا توجد مسارات متاحة للتسجيل. يرجى التأكد من تفعيل مصدر فيديو أو صوت واحد على الأقل.',
  recordingSavedSuccess: 'تم حفظ التسجيل بنجاح',
  mb: 'ميجابايت',
  failedToSaveRecording: 'فشل حفظ التسجيل',
  savedRecordings: 'تم حفظ التسجيلات',
  successfullySaved: 'تم الحفظ بنجاح',
  error: 'خطأ',
  noUnsavedRecordings: 'لا توجد تسجيلات غير محفوظة',
  preparing: 'جاري التحضير...',
  savedOf: 'من',
  recordings: 'تسجيلات',
  errors: 'أخطاء',
  failedToSaveRecordings: 'فشل حفظ التسجيلات',
  copyLink: 'نسخ الرابط',
  linkCopied: 'تم نسخ الرابط',
  linkCopyFailed: 'فشل نسخ الرابط',
};

const roomId = extractRoomId();
const displayName = generateDisplayName('مدير');
const rawSavingPath = new URLSearchParams(window.location.search).get('saving-path') || '';
const savingPath = normalizeSavingPath(rawSavingPath);
const savingPathLabel = savingPath || t.notProvided;

const roomIdLabel = document.getElementById('roomIdLabel');
const connectionStatus = document.getElementById('connectionStatus');
const loginPanel = document.getElementById('loginPanel');
const callPanel = document.getElementById('callPanel');
const loginForm = document.getElementById('loginForm');
const adminPassword = document.getElementById('adminPassword');
const loginError = document.getElementById('loginError');

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
const videoStage = document.getElementById('videoStage');
const videoGrid = document.getElementById('videoGrid');
const emptyState = document.getElementById('emptyState');

const toggleRecording = document.getElementById('toggleRecording');
const recordIndicator = document.getElementById('recordIndicator');
const recordingTimer = document.getElementById('recordingTimer');
const notesPanel = document.getElementById('notesPanel');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const tabButtons = document.querySelectorAll('.tab-button');
const notesTab = document.getElementById('notesTab');
const recordingsTab = document.getElementById('recordingsTab');
const currentRecording = document.getElementById('currentRecording');
const currentRecordingTime = document.getElementById('currentRecordingTime');
const saveRecording = document.getElementById('saveRecording');
const downloadRecordingBtn = document.getElementById('downloadRecordingBtn');
const downloadAllRecordings = document.getElementById('downloadAllRecordings');
const emptyRecordings = document.getElementById('emptyRecordings');
const recordingsList = document.getElementById('recordingsList');
const savedRecordings = [];
const toastContainer = document.getElementById('toastContainer');
const recordingModal = document.getElementById('recordingModal');

// Toast Notification System
function showNotification(title, message, type = 'success', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
  
  toast.innerHTML = `
    <i class="fas ${icon} toast-icon"></i>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  toastContainer.appendChild(toast);
  
  // Auto remove after duration
  if (duration > 0) {
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 300);
    }, duration);
  }
  
  return toast;
}
const cancelRecording = document.getElementById('cancelRecording');
const startRecordingConfirm = document.getElementById('startRecordingConfirm');
const notesField = document.getElementById('notes');
const downloadNotes = document.getElementById('downloadNotes');
const clearNotes = document.getElementById('clearNotes');
const mainHeader = document.getElementById('mainHeader');
const mainContent = document.getElementById('mainContent');

roomIdLabel.textContent = `${roomId}`;
connectionStatus.textContent = t.locked;
callPanel.style.display = 'none';
notesField.placeholder = `${t.notesPlaceholder} (${t.savingTo}: ${savingPathLabel})`;

// Hide header initially for login-only view
mainHeader.style.display = 'none';

// Ensure record indicator is hidden initially
recordIndicator.hidden = true;

let localStream;
let signaling;
let audioContext;
let analyser;
let dataArray;
const peerConnections = new Map();
const peerLabels = new Map();
const mediaElements = new Map();
const remoteStreams = new Map();
const mediaStates = new Map();
let selfViewPosition = null;
let selfViewHidden = false;

let recordingStream;
let mediaRecorder;
let recordedChunks = [];
let allRecordings = []; // Array to store all recordings
let currentRecordingUrl = null; // Current active recording URL
let recordingTimerInterval = null;
let recordingStartTime = null;
let screenStream = null;
let recordingAudioMode = 'both'; // 'both' or 'users-only'
let recordingMimeType = 'video/webm'; // Track the mime type used for recording
let isRestartingRecording = false; // Flag to track if we're restarting (not actually stopping)

loginForm.addEventListener('submit', handleLogin);
joinButton.addEventListener('click', async () => {
  joinButton.disabled = true;
  await startCall();
});

togglePreMic.addEventListener('click', toggleMicTrack);
togglePreCam.addEventListener('click', toggleCameraTrack);
toggleMic.addEventListener('click', toggleMicTrack);
toggleCam.addEventListener('click', toggleCameraTrack);
toggleSelfView.addEventListener('click', handleSelfViewToggle);

toggleRecording.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopRecording();
  } else {
    showRecordingModal();
  }
});

if (copyLinkBtn) {
  copyLinkBtn.addEventListener('click', async () => {
    const userRoomUrl = getUserRoomUrl(roomId);
    try {
      await navigator.clipboard.writeText(userRoomUrl);
      showNotification(t.linkCopied, userRoomUrl, 'success', 2000);
      // Visual feedback
      const icon = copyLinkBtn.querySelector('i');
      const originalClass = icon.className;
      icon.className = 'fas fa-check';
      setTimeout(() => {
        icon.className = originalClass;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = userRoomUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification(t.linkCopied, userRoomUrl, 'success', 2000);
      } catch (fallbackError) {
        showNotification(t.error, t.linkCopyFailed, 'error');
      }
    }
  });
}

cancelRecording.addEventListener('click', () => {
  recordingModal.hidden = true;
});

startRecordingConfirm.addEventListener('click', async () => {
  const selectedMode = document.querySelector('input[name="audioMode"]:checked')?.value || 'both';
  recordingAudioMode = selectedMode;
  recordingModal.hidden = true;
  await startRecordingWithScreen();
});

// Close modal when clicking outside
recordingModal.addEventListener('click', (e) => {
  if (e.target === recordingModal) {
    recordingModal.hidden = true;
  }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !recordingModal.hidden) {
    recordingModal.hidden = true;
  }
});

// Tab switching
tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.dataset.tab;
    
    // Update active tab button
    tabButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Update active tab content
    notesTab.classList.toggle('active', tabName === 'notes');
    recordingsTab.classList.toggle('active', tabName === 'recordings');
    
    // Update recordings list when switching to recordings tab
    if (tabName === 'recordings') {
      updateRecordingsList();
    }
  });
});

// Initialize recordings list
updateRecordingsList();

downloadRecordingBtn.addEventListener('click', () => {
  if (allRecordings.length === 0) return;
  const latestRecording = allRecordings[allRecordings.length - 1];
  const link = document.createElement('a');
  link.href = latestRecording.url;
  link.download = latestRecording.fileName;
  link.click();
});

saveRecording.addEventListener('click', async () => {
  if (allRecordings.length === 0) {
    showNotification(t.noRecording, t.noRecordings, 'error');
    return;
  }
  
  // Find the latest unsaved recording
  const unsavedRecordings = allRecordings.filter(r => !r.saved);
  if (unsavedRecordings.length === 0) {
    showNotification(t.alreadySaved, t.allSaved, 'error');
    return;
  }
  
  // Save the most recent unsaved recording
  const recordingToSave = unsavedRecordings[unsavedRecordings.length - 1];
  await saveSingleRecording(recordingToSave.id);
  
  // Update button text
      saveRecording.querySelector('span').textContent = t.saved;
      setTimeout(() => {
        saveRecording.querySelector('span').textContent = t.save;
  }, 2000);
});

downloadAllRecordings.addEventListener('click', async () => {
  // Get all unsaved recordings
  const unsavedRecordings = allRecordings.filter(r => !r.saved);
  
  if (unsavedRecordings.length === 0) {
    showNotification(t.noRecordings, t.noUnsavedRecordings, 'error');
    return;
  }
  
  if (!savingPath) {
    showNotification(t.saveFailed, t.noSavingPath, 'error');
    return;
  }
  
  try {
    downloadAllRecordings.disabled = true;
    downloadAllRecordings.querySelector('span').textContent = `Saving ${unsavedRecordings.length}...`;
    
    let savedCount = 0;
    const errors = [];
    
    // Save all unsaved recordings
    for (const recording of unsavedRecordings) {
      try {
        const formData = new FormData();
        formData.append('recording', recording.blob, recording.fileName);
        formData.append('roomId', roomId);
        formData.append('savingPath', savingPath);
        formData.append('fileName', recording.fileName);
        
        const saveResponse = await fetch('/api/admin/recording', {
          method: 'POST',
          body: formData,
        });
        
        const data = await saveResponse.json();
        if (saveResponse.ok && data.ok) {
          // Mark as saved
          recording.saved = true;
          recording.filePath = data.filePath;
          
          savedRecordings.push({
            filePath: data.filePath,
            fileName: recording.fileName,
            timestamp: recording.timestamp,
          });
          savedCount++;
        } else {
          errors.push(`Failed to save ${recording.fileName}: ${data.message || 'Unknown error'}`);
        }
      } catch (error) {
        errors.push(`Error saving ${recording.fileName}: ${error.message}`);
      }
    }
    
    if (errors.length > 0) {
      downloadAllRecordings.querySelector('span').textContent = t.saveAll;
      showNotification(
        t.partialSave,
        `${t.savedCount} ${savedCount} ${t.savedOf} ${unsavedRecordings.length} ${t.recordings}.\n\n${t.errors}:\n${errors.join('\n')}`,
        'error',
        5000
      );
    } else {
      downloadAllRecordings.querySelector('span').textContent = `${t.savedCount} ${savedCount}!`;
      setTimeout(() => {
        downloadAllRecordings.querySelector('span').textContent = t.saveAll;
      }, 2000);
      
      showNotification(
        t.savedRecordings,
        `${t.successfullySaved} ${savedCount} ${t.recordings} إلى:\n${savingPath}`,
        'success'
      );
    }
    
    updateRecordingsList();
  } catch (error) {
    console.error('Error saving recordings:', error);
    downloadAllRecordings.querySelector('span').textContent = t.saveAll;
    showNotification(
      t.saveFailed,
      `${t.failedToSaveRecordings}: ${error.message}`,
      'error'
    );
  } finally {
    downloadAllRecordings.disabled = false;
  }
});

const NOTES_BUTTON_DEFAULT = 'حفظ الملاحظات';
downloadNotes.querySelector('span').textContent = NOTES_BUTTON_DEFAULT;

downloadNotes.addEventListener('click', async () => {
  const content = notesField.value || '';
  downloadNotes.disabled = true;
  const originalLabel = downloadNotes.querySelector('span').textContent;
  downloadNotes.querySelector('span').textContent = t.saving;

  try {
    if (!savingPath) {
      throw new Error(t.noSavingPath);
    }

    const savedPath = await saveNotesToServer(content);
    
    downloadNotes.querySelector('span').textContent = t.saved;
    setTimeout(() => {
      downloadNotes.querySelector('span').textContent = NOTES_BUTTON_DEFAULT;
    }, 1800);
    
    showNotification(
      t.notesSaved,
      `${t.successfullySaved} إلى:\n${savedPath}`,
      'success'
    );
  } catch (error) {
    console.error(error);
    downloadNotes.querySelector('span').textContent = originalLabel;
    showNotification(
      t.saveFailed,
      error.message || t.notesSaveFailed,
      'error'
    );
  } finally {
    downloadNotes.disabled = false;
  }
});

clearNotes.addEventListener('click', () => {
  notesField.value = '';
});

window.addEventListener('beforeunload', () => {
  if (signaling) {
    signaling.disconnect();
  }
  // Clean up all recording URLs
  allRecordings.forEach(recording => {
    if (recording.url) {
      URL.revokeObjectURL(recording.url);
    }
  });
  if (currentRecordingUrl) {
    URL.revokeObjectURL(currentRecordingUrl);
  }
  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop());
    screenStream = null;
  }
  if (recordingTimerInterval) {
    clearInterval(recordingTimerInterval);
  }
});

window.addEventListener('resize', () => {
  const entry = mediaElements.get('local');
  if (entry) {
    clampSelfViewPosition(entry.tile);
  }
});

async function handleLogin(event) {
  event.preventDefault();
  loginError.textContent = '';
  const password = adminPassword.value.trim();
  if (!password) {
    loginError.textContent = t.enterPassword;
    return;
  }

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || t.invalidPassword);
    }
    onAuthenticated();
  } catch (error) {
    loginError.textContent = error.message;
  }
}

function onAuthenticated() {
  // Show header after login
  mainHeader.style.display = 'flex';
  
  // Hide login panel and show call panel
  loginPanel.classList.remove('active');
  loginPanel.style.display = 'none';
  callPanel.classList.add('active');
  callPanel.style.display = 'flex';
  
  connectionStatus.textContent = t.authenticated;
  connectionStatus.classList.remove('bad');
  initDevices();
}

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
  joinButton.disabled = true;
  connectionStatus.textContent = t.checkingDevices;
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
  connectionStatus.textContent = 'Connecting...';

  // Show notes panel and adjust layout when call starts
  notesPanel.style.display = 'flex';
  mainContent.classList.add('with-notes');

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
    console.log('[Admin] Signaling handlers set up, attempting to join room:', roomId);
    const existingPeers = await signaling.join({ displayName, isAdmin: true });
    console.log('[Admin] Successfully joined room, existing peers:', existingPeers.length);
    connectionStatus.textContent = t.inCall;

    addOrUpdateTile('local', t.you, localStream, true);
    setPeerMediaState('local', getLocalMediaState());
    emitLocalMediaState();
    updateWaitingState();

    existingPeers.forEach(({ socketId, displayName: name, audioEnabled, videoEnabled }) => {
      console.log('[Admin] Creating connection to peer:', socketId, name);
      peerLabels.set(socketId, name || `${t.peer} ${socketId.slice(-4)}`);
      setPeerMediaState(socketId, { audioEnabled, videoEnabled });
      createPeerConnection(socketId, { isInitiator: true, label: peerLabels.get(socketId) });
      makeOffer(socketId);
    });
  } catch (error) {
    console.error('[Admin] Failed to start call:', error);
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
    console.log('[Admin] Peer joined event received:', socketId, name);
    peerLabels.set(socketId, name || `${t.peer} ${socketId.slice(-4)}`);
    setPeerMediaState(socketId, { audioEnabled, videoEnabled });
    createPeerConnection(socketId, { isInitiator: false, label: peerLabels.get(socketId) });
    addPlaceholderTile(socketId, peerLabels.get(socketId));
  });

  signaling.onPeerLeft(({ socketId }) => {
    removePeer(socketId);
  });

  signaling.onSignal(async ({ senderId, data }) => {
    console.log('[Admin] Received signal from', senderId, 'type:', data.type);
    let pc = peerConnections.get(senderId);
    if (!pc) {
      console.log('[Admin] Creating new peer connection for', senderId);
      createPeerConnection(senderId, { isInitiator: false, label: peerLabels.get(senderId) });
      pc = peerConnections.get(senderId);
    }

    if (data.type === 'offer') {
      console.log('[Admin] Processing offer from', senderId);
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[Admin] Sending answer to', senderId);
      signaling.sendSignal(senderId, { type: 'answer', sdp: answer });
    } else if (data.type === 'answer') {
      console.log('[Admin] Processing answer from', senderId);
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    } else if (data.type === 'ice-candidate' && data.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log('[Admin] Added ICE candidate from', senderId);
      } catch (error) {
        console.error('[Admin] Error adding ICE candidate from', senderId, ':', error);
      }
    }
  });

  signaling.onPeerMediaUpdated(({ socketId, audioEnabled, videoEnabled }) => {
    setPeerMediaState(socketId, { audioEnabled, videoEnabled });
  });
}

function createPeerConnection(peerId, { isInitiator = false, label } = {}) {
  if (peerConnections.has(peerId)) {
    console.log('[Admin] Peer connection already exists for', peerId);
    return peerConnections.get(peerId);
  }

  console.log('[Admin] Creating new peer connection for', peerId, 'isInitiator:', isInitiator);
  const pc = new RTCPeerConnection(rtcConfig);
  peerConnections.set(peerId, pc);

  localStream.getTracks().forEach((track) => {
    console.log('[Admin] Adding track to peer connection:', track.kind, track.id);
    pc.addTrack(track, localStream);
  });

  pc.ontrack = (event) => {
    console.log('[Admin] Received track from peer', peerId, 'track:', event.track.kind);
    const peerLabel = peerLabels.get(peerId) || label || `${t.peer} ${peerId.slice(-4)}`;
    const stream = event.streams[0];
    addOrUpdateTile(peerId, peerLabel, stream);
    remoteStreams.set(peerId, stream);
    extendRecordingWithStream(stream);
    
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
      console.log('[Admin] ICE candidate generated for', peerId, 'type:', event.candidate.type, 'protocol:', event.candidate.protocol);
      // Send candidate immediately
      signaling.sendSignal(peerId, { type: 'ice-candidate', candidate: event.candidate });
    } else {
      console.log('[Admin] ICE gathering complete for', peerId);
      // Send null candidate to signal gathering is complete
      signaling.sendSignal(peerId, { type: 'ice-candidate', candidate: null });
    }
  };

  pc.onicegatheringstatechange = () => {
    console.log('[Admin] ICE gathering state changed for', peerId, ':', pc.iceGatheringState);
  };

  pc.onconnectionstatechange = () => {
    console.log('[Admin] Connection state changed for', peerId, ':', pc.connectionState);
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      console.log('[Admin] Removing peer due to connection state:', peerId);
      removePeer(peerId);
    } else if (pc.connectionState === 'connected') {
      console.log('[Admin] Successfully connected to peer:', peerId);
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log('[Admin] ICE connection state changed for', peerId, ':', pc.iceConnectionState);
    if (pc.iceConnectionState === 'failed') {
      console.log('[Admin] ICE connection failed, attempting to restart ICE');
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
    console.error('[Admin] Cannot make offer: no peer connection for', peerId);
    return;
  }
  console.log('[Admin] Making offer to peer:', peerId);
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log('[Admin] Offer created and set, sending to peer:', peerId);
    signaling.sendSignal(peerId, { type: 'offer', sdp: offer });
  } catch (error) {
    console.error('[Admin] Error making offer to', peerId, ':', error);
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

  // Add control buttons for remote tiles (not local)
  let tileControls = null;
  if (peerId !== 'local') {
    tileControls = document.createElement('div');
    tileControls.className = 'tile-controls';
    
    const toggleMicBtn = document.createElement('button');
    toggleMicBtn.className = 'btn-icon tile-control-btn tile-toggle-mic';
    toggleMicBtn.dataset.active = 'true';
    toggleMicBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    toggleMicBtn.title = 'ميكروفون';
    
    const toggleCamBtn = document.createElement('button');
    toggleCamBtn.className = 'btn-icon tile-control-btn tile-toggle-cam';
    toggleCamBtn.dataset.active = 'true';
    toggleCamBtn.innerHTML = '<i class="fas fa-video"></i>';
    toggleCamBtn.title = 'كاميرا';
    
    const toggleSelfViewBtn = document.createElement('button');
    toggleSelfViewBtn.className = 'btn-icon tile-control-btn tile-toggle-selfview';
    toggleSelfViewBtn.dataset.active = 'true';
    toggleSelfViewBtn.innerHTML = '<i class="fas fa-user-circle"></i>';
    toggleSelfViewBtn.title = 'إخفاء نفسي';
    
    const toggleRecordingBtn = document.createElement('button');
    toggleRecordingBtn.className = 'btn-icon tile-control-btn btn-danger tile-toggle-recording';
    toggleRecordingBtn.dataset.active = 'false';
    toggleRecordingBtn.innerHTML = '<i class="fas fa-circle"></i>';
    toggleRecordingBtn.title = 'تسجيل';
    
    tileControls.appendChild(toggleMicBtn);
    tileControls.appendChild(toggleCamBtn);
    tileControls.appendChild(toggleSelfViewBtn);
    tileControls.appendChild(toggleRecordingBtn);
    
    // Wire up event listeners - these control admin's own media
    toggleMicBtn.addEventListener('click', toggleMicTrack);
    toggleCamBtn.addEventListener('click', toggleCameraTrack);
    toggleSelfViewBtn.addEventListener('click', handleSelfViewToggle);
    toggleRecordingBtn.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
      } else {
        showRecordingModal();
      }
    });
  }

  tile.appendChild(video);
  tile.appendChild(avatar);
  tile.appendChild(nameTag);
  tile.appendChild(mediaFlags);
  if (tileControls) {
    tile.appendChild(tileControls);
  }
  videoGrid.appendChild(tile);

  return { tile, video, avatar, labelEl: nameTag, flags: mediaFlags, controls: tileControls };
}

function updateTileVisual({ video, avatar, labelEl }, label) {
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
  remoteStreams.delete(peerId);
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
  
  // Update all tile buttons
  document.querySelectorAll('.tile-toggle-mic').forEach(btn => {
    btn.dataset.active = enabled;
    btn.querySelector('i').className = `fas ${icon}`;
  });
}

function updateCameraButtons(enabled) {
  togglePreCam.dataset.active = enabled;
  toggleCam.dataset.active = enabled;
  const icon = enabled ? 'fa-video' : 'fa-video-slash';
  togglePreCam.querySelector('i').className = `fas ${icon}`;
  toggleCam.querySelector('i').className = `fas ${icon}`;
  
  // Update all tile buttons
  document.querySelectorAll('.tile-toggle-cam').forEach(btn => {
    btn.dataset.active = enabled;
    btn.querySelector('i').className = `fas ${icon}`;
  });
}

function showRecordingModal() {
  recordingModal.hidden = false;
  // Reset to default selection
  document.querySelector('input[name="audioMode"][value="both"]').checked = true;
}

async function startRecordingWithScreen() {
  if (!localStream) return;
  
  // Ensure record indicator is hidden before starting
  recordIndicator.hidden = true;
  
  try {
    // Request screen capture
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { 
        displaySurface: 'monitor',
        cursor: 'always'
      },
      audio: false // We'll handle audio separately
    });

    // Handle screen share ending
    screenStream.getVideoTracks()[0].addEventListener('ended', () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
      }
    });

    // Start recording with screen
    await startRecording();
  } catch (error) {
    console.error('Screen capture error:', error);
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      showNotification(t.saveFailed, t.permissionDenied, 'error');
    } else {
      showNotification(t.saveFailed, `${t.failedToStart}: ${error.message}`, 'error');
    }
  }
}

function getBestVideoMimeType() {
  // Try MP4 first (if supported)
  const mp4Types = [
    'video/mp4;codecs=h264,opus',
    'video/mp4;codecs=avc1,opus',
    'video/mp4',
  ];
  
  // Then try WebM (better browser support)
  const webmTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  
  // Check all types
  const allTypes = [...mp4Types, ...webmTypes];
  
  for (const mimeType of allTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  
  // Fallback to default
  return 'video/webm';
}

function getFileExtension(mimeType) {
  if (mimeType.includes('mp4')) {
    return 'mp4';
  }
  return 'webm';
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function startRecording() {
  if (!localStream) return;
  
  // Reset start time for a new recording (not a restart)
  // If isRestartingRecording is false, this is a new recording
  if (!isRestartingRecording) {
    recordingStartTime = null;
  }
  
  recordedChunks = [];
  recordingStream = new MediaStream();

  // Add screen video track if available
  if (screenStream) {
    const screenVideoTrack = screenStream.getVideoTracks()[0];
    if (screenVideoTrack) {
      recordingStream.addTrack(screenVideoTrack);
    }
  } else {
    // Fallback: use local video if no screen
    const localVideoTrack = localStream.getVideoTracks().find(t => t.enabled);
    if (localVideoTrack) {
      recordingStream.addTrack(localVideoTrack.clone ? localVideoTrack.clone() : localVideoTrack);
    }
  }

  // Add audio tracks based on selected mode
  if (recordingAudioMode === 'both') {
    // Add admin's audio
    const localAudioTrack = localStream.getAudioTracks().find(t => t.enabled);
    if (localAudioTrack) {
      recordingStream.addTrack(localAudioTrack.clone ? localAudioTrack.clone() : localAudioTrack);
    }
  }

  // Add all remote streams audio (and video if no screen)
  remoteStreams.forEach((stream) => {
    // Add remote audio tracks
    stream.getAudioTracks().forEach((track) => {
      if (track.enabled) {
        recordingStream.addTrack(track.clone ? track.clone() : track);
      }
    });
    
    // Add remote video tracks only if we're not using screen capture
    if (!screenStream) {
      stream.getVideoTracks().forEach((track) => {
        if (track.enabled) {
          recordingStream.addTrack(track.clone ? track.clone() : track);
        }
      });
    }
  });

  if (currentRecordingUrl) {
    URL.revokeObjectURL(currentRecordingUrl);
    currentRecordingUrl = null;
  }
  recordedChunks = [];

  // Only start if we have tracks
  if (recordingStream.getTracks().length === 0) {
    showNotification(t.saveFailed, t.noTracksAvailable, 'error');
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      screenStream = null;
    }
    return;
  }

  // Get best available mime type
  recordingMimeType = getBestVideoMimeType();
  
  try {
    mediaRecorder = new MediaRecorder(recordingStream, {
      mimeType: recordingMimeType,
    });
  } catch (error) {
    // Fallback to default
    mediaRecorder = new MediaRecorder(recordingStream);
    recordingMimeType = 'video/webm';
  }

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  // Show indicator only when recording actually starts
  mediaRecorder.onstart = () => {
    toggleRecording.dataset.active = 'true';
    recordIndicator.hidden = false;
    
    // Update recording button icon
    const recordIcon = toggleRecording.querySelector('i');
    if (recordIcon) {
      recordIcon.className = 'fas fa-stop';
    }
    
    // Update all tile recording buttons
    document.querySelectorAll('.tile-toggle-recording').forEach(btn => {
      btn.dataset.active = 'true';
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = 'fas fa-stop';
      }
    });
    
    // Start recording timer (only set if not already set from a previous restart)
    if (!recordingStartTime) {
      recordingStartTime = Date.now();
    }
    updateRecordingTimer();
    recordingTimerInterval = setInterval(updateRecordingTimer, 1000);
  };

  mediaRecorder.onstop = () => {
    // If we're restarting, don't create a new recording entry
    // Just preserve the chunks and continue
    if (isRestartingRecording) {
      return;
    }
    
    // Capture start time BEFORE it might be reset by stopRecording()
    const startTime = recordingStartTime;
    const stopTime = Date.now();
    
    const blobType = recordedChunks[0]?.type || recordingMimeType || 'video/webm';
    const blob = new Blob(recordedChunks, { type: blobType });
    const recordingUrl = URL.createObjectURL(blob);
    
    // Determine file extension from blob type
    const fileExt = blobType.includes('mp4') ? 'mp4' : 'webm';
    
    // Calculate duration from the original start time
    const duration = startTime ? Math.floor((stopTime - startTime) / 1000) : 0;
    
    // Add to all recordings array
    const recording = {
      id: Date.now(),
      url: recordingUrl,
      blob: blob,
      fileName: `recording-${roomId}-${Date.now()}.${fileExt}`,
      timestamp: startTime || stopTime, // Use start time as timestamp
      duration: duration,
      saved: false,
    };
    
    allRecordings.push(recording);
    currentRecordingUrl = recordingUrl; // Keep reference to latest
    
    // Reset for next recording
    recordedChunks = [];
    
    // Stop screen stream
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      screenStream = null;
    }
    
    // Update recordings list
    updateRecordingsList();
    
    // Reset start time after calculating duration (for next recording)
    recordingStartTime = null;
    
    // Show notification
    showNotification(
      t.recordingComplete,
      `${t.recordingNumber} ${allRecordings.length} ${t.saved}. ${t.duration}: ${formatTime(recording.duration)}`,
      'success'
    );
  };

  // Start with timeslice to get periodic chunks (helps when restarting)
  mediaRecorder.start(1000);
  
  // Update recordings list
  updateRecordingsList();
}

function stopRecording() {
  if (!mediaRecorder) return;
  
  // Make sure we're not in restart mode when stopping
  isRestartingRecording = false;
  
  // Stop the recorder - onstop handler will calculate duration and reset recordingStartTime
  mediaRecorder.stop();
  mediaRecorder = null;
  if (recordingStream) {
    recordingStream.getTracks().forEach((track) => track.stop());
    recordingStream = null;
  }
  
  // Stop screen stream
  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop());
    screenStream = null;
  }
  
  // Stop recording timer
  if (recordingTimerInterval) {
    clearInterval(recordingTimerInterval);
    recordingTimerInterval = null;
  }
  if (recordingTimer) {
    recordingTimer.textContent = '00:00';
  }
  // Don't reset recordingStartTime here - let onstop handler do it after calculating duration
  
  toggleRecording.dataset.active = 'false';
  recordIndicator.hidden = true;
  
  // Update recording button icon
  const recordIcon = toggleRecording.querySelector('i');
  if (recordIcon) {
    recordIcon.className = 'fas fa-circle';
  }
  
  // Update all tile recording buttons
  document.querySelectorAll('.tile-toggle-recording').forEach(btn => {
    btn.dataset.active = 'false';
    const icon = btn.querySelector('i');
    if (icon) {
      icon.className = 'fas fa-circle';
    }
  });
  
  // Update recordings list
  updateRecordingsList();
}

function updateRecordingTimer() {
  if (!recordingStartTime || !recordingTimer) return;
  const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  recordingTimer.textContent = timeString;
  
  // Also update the current recording time in recordings tab
  if (currentRecordingTime) {
    currentRecordingTime.textContent = timeString;
  }
}

function updateRecordingsList() {
  const recordingsList = document.getElementById('recordingsList');
  const emptyRecordings = document.getElementById('emptyRecordings');
  
  // Remove all existing recording items (except empty state)
  const existingItems = recordingsList.querySelectorAll('.recording-item');
  existingItems.forEach(item => item.remove());
  
  // Check if currently recording
  const isRecording = mediaRecorder && mediaRecorder.state === 'recording';
  
  // Show all recordings
  if (allRecordings.length > 0 || isRecording) {
    emptyRecordings.style.display = 'none';
    
    // Show all saved recordings
    allRecordings.forEach((recording, index) => {
      const item = createRecordingItem(recording, index);
      recordingsList.insertBefore(item, emptyRecordings);
    });
    
    // Show current recording if active
    if (isRecording && currentRecording) {
      currentRecording.style.display = 'flex';
      const timeEl = currentRecording.querySelector('.recording-time');
      if (timeEl && recordingStartTime) {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        timeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
    } else if (currentRecording) {
      currentRecording.style.display = 'none';
    }
  } else {
    emptyRecordings.style.display = 'flex';
    if (currentRecording) {
      currentRecording.style.display = 'none';
    }
  }
  
  // Enable/disable save all button based on unsaved recordings
  const unsavedCount = allRecordings.filter(r => !r.saved).length;
  downloadAllRecordings.disabled = unsavedCount === 0;
  
  // Update save button state
  if (saveRecording) {
    const latestRecording = allRecordings[allRecordings.length - 1];
    if (latestRecording && !latestRecording.saved) {
      saveRecording.disabled = false;
    } else {
      saveRecording.disabled = allRecordings.length === 0 || (latestRecording && latestRecording.saved);
    }
  }
}

function createRecordingItem(recording, index) {
  const item = document.createElement('div');
  item.className = 'recording-item';
  item.dataset.recordingId = recording.id;
  
  const minutes = Math.floor(recording.duration / 60);
  const seconds = recording.duration % 60;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  const savedBadge = recording.saved ? '<span style="color: var(--success-green); font-size: 0.75rem; margin-left: 0.5rem;">✓ تم الحفظ</span>' : '';
  
  item.innerHTML = `
    <div class="recording-info">
      <i class="fas fa-video"></i>
      <div>
        <span class="recording-name">${t.recordingNumber} ${index + 1}${savedBadge}</span>
        <small class="recording-time">${timeString}</small>
      </div>
    </div>
    <div class="recording-actions">
      ${!recording.saved ? `
        <button class="btn-primary btn-small save-recording-btn" data-recording-id="${recording.id}">
          <i class="fas fa-save"></i>
          <span>${t.save}</span>
        </button>
      ` : ''}
      <button class="btn-secondary btn-small download-recording-btn" data-recording-id="${recording.id}">
        <i class="fas fa-download"></i>
      </button>
    </div>
  `;
  
  // Add event listeners
  const saveBtn = item.querySelector('.save-recording-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => saveSingleRecording(recording.id));
  }
  
  const downloadBtn = item.querySelector('.download-recording-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = recording.url;
      link.download = recording.fileName;
      link.click();
    });
  }
  
  return item;
}

async function saveSingleRecording(recordingId) {
  const recording = allRecordings.find(r => r.id === recordingId);
  if (!recording || recording.saved) {
    return;
  }
  
  if (!savingPath) {
    showNotification(t.saveFailed, t.noSavingPath, 'error');
    return;
  }
  
  try {
    const formData = new FormData();
    formData.append('recording', recording.blob, recording.fileName);
    formData.append('roomId', roomId);
    formData.append('savingPath', savingPath);
    formData.append('fileName', recording.fileName);
    
    const saveResponse = await fetch('/api/admin/recording', {
      method: 'POST',
      body: formData,
    });
    
    const data = await saveResponse.json();
    if (saveResponse.ok && data.ok) {
      recording.saved = true;
      recording.filePath = data.filePath;
      
      savedRecordings.push({
        filePath: data.filePath,
        fileName: recording.fileName,
        timestamp: recording.timestamp,
      });
      
      updateRecordingsList();
      
      const fileSize = (recording.blob.size / 1024 / 1024).toFixed(2);
      showNotification(
        t.recordingSaved,
        `${t.recordingSavedSuccess} (${fileSize} ${t.mb})\n${data.filePath}`,
        'success'
      );
    } else {
      throw new Error(data.message || t.failedToSaveRecording);
    }
  } catch (error) {
    console.error('Error saving recording:', error);
    showNotification(
      t.saveFailed,
      `${t.failedToSaveRecording}: ${error.message}`,
      'error'
    );
  }
}

function extendRecordingWithStream(stream) {
  if (!mediaRecorder || mediaRecorder.state !== 'recording' || !recordingStream) return;
  
  // MediaRecorder doesn't support adding tracks after starting
  // Request current data chunk before restarting
  mediaRecorder.requestData();
  
  // Set flag to indicate we're restarting (not actually stopping)
  isRestartingRecording = true;
  
  // Wait for the data to be available, then restart
  const checkAndRestart = () => {
    if (mediaRecorder.state === 'recording') {
      // Stop current recording to get final chunk
      mediaRecorder.stop();
      
      // Wait a bit for the stop event to fire and add the chunk
      setTimeout(() => {
        restartRecordingWithAllStreams();
      }, 200);
    } else {
      setTimeout(checkAndRestart, 50);
    }
  };
  
  checkAndRestart();
}

function restartRecordingWithAllStreams() {
  if (!localStream) return;
  
  // Preserve the original start time - don't reset it
  // We want the total duration from the original start, not from the restart
  // The start time should already be set from when recording first started
  
  // Create new recording stream with all current streams
  recordingStream = new MediaStream();

  // Add screen video track if available
  if (screenStream) {
    const screenVideoTrack = screenStream.getVideoTracks()[0];
    if (screenVideoTrack) {
      recordingStream.addTrack(screenVideoTrack);
    }
  } else {
    // Fallback: use local video if no screen
    const localVideoTrack = localStream.getVideoTracks().find(t => t.enabled);
    if (localVideoTrack) {
      try {
        recordingStream.addTrack(localVideoTrack.clone ? localVideoTrack.clone() : localVideoTrack);
      } catch (error) {
        console.warn('Could not add local video track to recording:', error);
      }
    }
  }

  // Add audio tracks based on selected mode
  if (recordingAudioMode === 'both') {
    // Add admin's audio
    const localAudioTrack = localStream.getAudioTracks().find(t => t.enabled);
    if (localAudioTrack) {
      try {
        recordingStream.addTrack(localAudioTrack.clone ? localAudioTrack.clone() : localAudioTrack);
      } catch (error) {
        console.warn('Could not add local audio track to recording:', error);
      }
    }
  }

  // Add all remote streams audio (and video if no screen)
  remoteStreams.forEach((stream) => {
    // Add remote audio tracks
    stream.getAudioTracks().forEach((track) => {
      if (track.enabled) {
        try {
          recordingStream.addTrack(track.clone ? track.clone() : track);
        } catch (error) {
          console.warn('Could not add remote audio track to recording:', error);
        }
      }
    });
    
    // Add remote video tracks only if we're not using screen capture
    if (!screenStream) {
      stream.getVideoTracks().forEach((track) => {
        if (track.enabled) {
          try {
            recordingStream.addTrack(track.clone ? track.clone() : track);
          } catch (error) {
            console.warn('Could not add remote video track to recording:', error);
          }
        }
      });
    }
  });

  // Only restart if we have tracks to record
  if (recordingStream.getTracks().length === 0) {
    console.warn('No tracks available for recording');
    return;
  }

  // Get best available mime type
  recordingMimeType = getBestVideoMimeType();
  
  try {
    mediaRecorder = new MediaRecorder(recordingStream, {
      mimeType: recordingMimeType,
    });
  } catch (error) {
    // Fallback to default
    mediaRecorder = new MediaRecorder(recordingStream);
    recordingMimeType = 'video/webm';
  }

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    // If we're restarting, don't create a new recording entry
    // Just preserve the chunks and continue
    if (isRestartingRecording) {
      return;
    }
    
    // Capture start time BEFORE it might be reset by stopRecording()
    const startTime = recordingStartTime;
    const stopTime = Date.now();
    
    const blobType = recordedChunks[0]?.type || recordingMimeType || 'video/webm';
    const blob = new Blob(recordedChunks, { type: blobType });
    const recordingUrl = URL.createObjectURL(blob);
    
    // Determine file extension from blob type
    const fileExt = blobType.includes('mp4') ? 'mp4' : 'webm';
    
    // Calculate duration from the original start time
    const duration = startTime ? Math.floor((stopTime - startTime) / 1000) : 0;
    
    // Add to all recordings array
    const recording = {
      id: Date.now(),
      url: recordingUrl,
      blob: blob,
      fileName: `recording-${roomId}-${Date.now()}.${fileExt}`,
      timestamp: startTime || stopTime, // Use start time as timestamp
      duration: duration,
      saved: false,
    };
    
    allRecordings.push(recording);
    currentRecordingUrl = recordingUrl; // Keep reference to latest
    
    // Reset for next recording
    recordedChunks = [];
    
    // Stop screen stream
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      screenStream = null;
    }
    
    // Update recordings list
    updateRecordingsList();
    
    // Reset start time after calculating duration (for next recording)
    recordingStartTime = null;
    
    // Show notification
    showNotification(
      t.recordingComplete,
      `${t.recordingNumber} ${allRecordings.length} ${t.saved}. ${t.duration}: ${formatTime(recording.duration)}`,
      'success'
    );
  };

  // Clear the restarting flag after setting up the new recorder
  isRestartingRecording = false;

  // Start with timeslice to get periodic chunks
  mediaRecorder.start(1000);
}

async function saveNotesToServer(content) {
  const response = await fetch('/api/admin/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId,
      notes: content,
      savingPath,
    }),
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    console.error('Failed to parse notes save response', error);
  }

  if (!response.ok || !data.ok) {
    throw new Error(data.message || 'Failed to save notes to the server path.');
  }

  return data.filePath;
}

function triggerNotesDownload(content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getNotesFileName();
  link.click();
  URL.revokeObjectURL(url);
}

function getNotesFileName() {
  return `room-${roomId}-notes.txt`;
}

function normalizeSavingPath(value) {
  if (!value) {
    return '';
  }
  return value.toString().trim().replace(/^['"]+|['"]+$/g, '');
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
  
  // Update all tile buttons
  document.querySelectorAll('.tile-toggle-selfview').forEach(btn => {
    btn.dataset.active = !selfViewHidden;
    btn.querySelector('i').className = `fas ${icon}`;
  });
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateWaitingState() {
  if (!emptyState) return;
  const remoteCount = [...mediaElements.keys()].filter((key) => key !== 'local').length;
  emptyState.hidden = remoteCount > 0;
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

