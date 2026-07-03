const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Helper to get auth headers with token
function getAuthHeaders() {
  const token = localStorage.getItem('adminToken');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function login(user: string, password: string) {
  console.log('🔐 Logging in as:', user);
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, password }),
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Login failed');
  }
  
  const data = await response.json();
  if (data.token) {
    localStorage.setItem('adminToken', data.token);
    localStorage.setItem('adminUser', data.user);
  }
  console.log('✅ Login successful:', data);
  return data;
}

export function logout() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
}

export function isLoggedIn() {
  return !!localStorage.getItem('adminToken');
}

export async function simulatePayment(amount: number = 10) {
  console.log('💰 Simulating payment of $', amount);
  const response = await fetch(`${API_BASE_URL}/payment/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount }),
  });
  
  if (!response.ok) {
    throw new Error('Payment failed');
  }
  
  const data = await response.json();
  console.log('✅ Payment success:', data);
  return data;
}

export async function getRoomStatus(roomCode: string) {
  console.log('📡 Getting room status for:', roomCode);
  const response = await fetch(`${API_BASE_URL}/rooms/${roomCode}/status`);
  
  if (!response.ok) {
    console.error('❌ getRoomStatus failed for roomCode:', roomCode, 'Response:', response.status);
    throw new Error('Room not found');
  }
  
  const data = await response.json();
  console.log('✅ Room status received:', data);
  return data;
}

export async function savePeerId(roomCode: string, peerId: string, isAdmin: boolean) {
  console.log('💾 Saving peer id:', peerId, 'for room:', roomCode, 'as admin:', isAdmin);
  const response = await fetch(`${API_BASE_URL}/rooms/${roomCode}/peer-id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ peerId, isAdmin }),
  });
  
  if (!response.ok) {
    console.error('❌ savePeerId failed! Response:', response.status);
    const err = await response.text();
    console.error('❌ Error details:', err);
    throw new Error('Failed to save peer id');
  }
  
  const data = await response.json();
  console.log('✅ Peer ID saved successfully:', data);
  return data;
}

export async function getAllRooms() {
  console.log('📋 Getting all rooms');
  const response = await fetch(`${API_BASE_URL}/admin/rooms`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      logout();
      throw new Error('Unauthorized');
    }
    throw new Error('Failed to fetch rooms');
  }
  
  const data = await response.json();
  console.log('✅ Rooms received:', data);
  return data;
}

export async function getPaymentSettings() {
  console.log('💳 Getting payment settings');
  const response = await fetch(`${API_BASE_URL}/admin/payment-settings`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      logout();
      throw new Error('Unauthorized');
    }
    throw new Error('Failed to fetch payment settings');
  }

  const data = await response.json();
  console.log('✅ Payment settings received:', data);
  return data;
}

export async function updatePaymentSettings(paymentSettings: {
  price: number;
  whatsappNumber: string;
  accountNumber: string;
}) {
  console.log('💾 Updating payment settings', paymentSettings);
  const response = await fetch(`${API_BASE_URL}/admin/payment-settings`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(paymentSettings),
  });

  if (!response.ok) {
    if (response.status === 401) {
      logout();
      throw new Error('Unauthorized');
    }
    throw new Error('Failed to update payment settings');
  }

  const data = await response.json();
  console.log('✅ Payment settings updated:', data);
  return data;
}

export async function resetDatabase() {
  console.log('🧹 Resetting database');
  const response = await fetch(`${API_BASE_URL}/admin/reset`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      logout();
      throw new Error('Unauthorized');
    }
    throw new Error('Failed to reset database');
  }
  
  const data = await response.json();
  console.log('✅ Database reset:', data);
  return data;
}

export async function verifyRoomPayment(roomCode: string, verified: boolean) {
  console.log('🔑 Verifying payment for room:', roomCode, 'verified:', verified);
  const response = await fetch(`${API_BASE_URL}/admin/rooms/${roomCode}/verify-payment`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ verified }),
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      logout();
      throw new Error('Unauthorized');
    }
    throw new Error('Failed to verify payment');
  }
  
  const data = await response.json();
  console.log('✅ Payment verified:', data);
  return data;
}
