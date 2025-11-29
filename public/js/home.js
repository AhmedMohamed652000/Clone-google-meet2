const joinRoomForm = document.getElementById('joinRoomForm');
const roomIdInput = document.getElementById('roomIdInput');
const formError = document.getElementById('formError');

joinRoomForm.addEventListener('submit', (e) => {
  e.preventDefault();
  formError.textContent = '';
  
  const roomId = roomIdInput.value.trim();
  
  if (!roomId) {
    formError.textContent = 'يرجى إدخال معرف الغرفة';
    return;
  }
  
  // Validate room ID (alphanumeric, dashes, underscores only)
  const roomIdPattern = /^[A-Za-z0-9\-_]+$/;
  if (!roomIdPattern.test(roomId)) {
    formError.textContent = 'معرف الغرفة غير صحيح. يمكن أن يحتوي على أحرف وأرقام وشرطات وشرطات سفلية فقط';
    return;
  }
  
  // Encode room ID and navigate to room
  const encodedRoomId = encodeURIComponent(roomId);
  globalThis.location.href = `/room/${encodedRoomId}`;
});

// Focus on input when page loads
roomIdInput.focus();

// Allow Enter key to submit
roomIdInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    joinRoomForm.dispatchEvent(new Event('submit'));
  }
});

