'use client';
import { useEffect, useRef, useState } from 'react';
import { Peer } from 'peerjs';
import { getRoomStatus, savePeerId } from '../lib/api';

interface RoomStatus {
  isActive: boolean;
  hasAdmin: boolean;
  hasUser: boolean;
  roomCode: string;
  paymentVerified: boolean;
}

// Helper to get admin room details (with full peer IDs)
async function getAdminRoomDetails(roomCode: string) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const response = await fetch(`${API_BASE_URL}/admin/rooms/${roomCode}`);
  if (!response.ok) throw new Error('Failed to get room details');
  return response.json();
}

// Helper to parse Peer Server URL into host, port, path correctly
function parsePeerServerUrl(urlString: string) {
  try {
    const url = new URL(urlString);
    const isHttps = url.protocol === 'https:';
    const isDevTunnel = url.hostname.includes('devtunnels.ms');

    // Dev tunnels terminan TLS en el proxy: nunca pasar puerto explícito
    let port: number | undefined;
    if (isDevTunnel || isHttps) {
      port = undefined;
    } else if (url.port) {
      port = parseInt(url.port, 10);
    } else {
      port = 7860;
    }

    const host = url.hostname;
    let path = url.pathname.replace(/\/$/, '');
    if (!path || path === '/') {
      path = '/';
    }

    const secure = isHttps || isDevTunnel;

    console.log('🔌 Parsed Peer Server URL:', {
      originalUrl: urlString,
      host,
      port,
      path,
      secure,
      protocol: url.protocol,
    });

    return { host, port, path, secure };
  } catch (error) {
    console.error('❌ Error parsing Peer Server URL:', error);
    return { host: 'ezioorg-peerjs-server.hf.space', port: undefined, path: '/peerjs', secure: true };
  }
}

function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const turnUrls = process.env.NEXT_PUBLIC_TURN_URLS;
  const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrls && turnUser && turnCred) {
    servers.push({
      urls: turnUrls.split(',').map((u) => u.trim()),
      username: turnUser,
      credential: turnCred,
    });
  } else {
    // OpenRelay gratuito — necesario para video entre redes distintas
    servers.push({
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    });
  }

  return servers;
}

function logStreamTracks(label: string, stream: MediaStream | null) {
  if (!stream) {
    console.log(`🎬 [useWebRTC] ${label}: sin stream`);
    return;
  }
  const tracks = stream.getTracks().map((t) => `${t.kind}:${t.readyState}:${t.enabled}`);
  console.log(`🎬 [useWebRTC] ${label}:`, tracks);
}

function getLiveTracks(stream: MediaStream | null | undefined) {
  return stream?.getTracks().filter((t) => t.readyState === 'live') ?? [];
}

function buildStreamFromReceivers(call: any): MediaStream | null {
  const pc = call.peerConnection as RTCPeerConnection | undefined;
  if (!pc) return null;

  const tracks = pc
    .getReceivers()
    .map((r) => r.track)
    .filter((t): t is MediaStreamTrack => !!t && t.readyState === 'live');

  if (tracks.length === 0) return null;

  const stream = new MediaStream();
  tracks.forEach((track) => stream.addTrack(track));
  return stream;
}

function getRemoteStreamFromCall(call: any): MediaStream | null {
  const fromPeer = call.remoteStream as MediaStream | undefined;
  const peerTracks = getLiveTracks(fromPeer);
  if (peerTracks.length > 0) return fromPeer!;

  return buildStreamFromReceivers(call);
}

function replaceTracksInCall(call: any, stream: MediaStream) {
  const pc = call.peerConnection as RTCPeerConnection | undefined;
  if (!pc) return;

  stream.getTracks().forEach((track) => {
    track.enabled = true;
    const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
    if (sender) {
      if (sender.track?.id === track.id) return;
      sender.replaceTrack(track).catch((err) => {
        console.error('❌ [useWebRTC] Error replacing track:', err);
      });
    }
  });
}

function setupRemoteStreamFromCall(call: any, onStream: (stream: MediaStream) => void) {
  let received = false;

  const tryReceive = (source: string) => {
    if (received) return;

    const stream = getRemoteStreamFromCall(call);
    const liveTracks = getLiveTracks(stream);
    if (!stream || liveTracks.length === 0) return;

    received = true;
    logStreamTracks(`Remote stream (${source})`, stream);
    onStream(stream);
  };

  call.on('stream', () => tryReceive('event'));

  const poll = setInterval(() => {
    tryReceive('poll');
    if (received) clearInterval(poll);
  }, 500);

  setTimeout(() => clearInterval(poll), 15000);
}

export function useWebRTC(localStream: MediaStream | null, roomId: string, isAdmin = false) {
  // Refs to prevent race conditions and duplicate calls
  const peerInstanceRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeCallRef = useRef<any>(null);
  const hasConnectedRef = useRef(false);
  const hasTriedAutoConnectRef = useRef(false);
  const connectingSinceRef = useRef<number | null>(null);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRoomStatusRef = useRef(false);
  const lastCalledPeerIdRef = useRef<string | null>(null);
  const answeredCallsRef = useRef<Set<string>>(new Set());
  const lastSyncedTracksRef = useRef<string>('');

  // States
  const [peerId, setPeerId] = useState('');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<string>('new');
  const [roomStatus, setRoomStatus] = useState<RoomStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [adminRoomDetails, setAdminRoomDetails] = useState<any>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // ------------------------------
  // Helper: Reset All State
  // ------------------------------
  function resetState() {
    console.log('🔄 [useWebRTC] Resetting state...');
    hasConnectedRef.current = false;
    hasTriedAutoConnectRef.current = false;
    connectingSinceRef.current = null;
    isCheckingRoomStatusRef.current = false;
    lastCalledPeerIdRef.current = null;
    answeredCallsRef.current.clear();
    lastSyncedTracksRef.current = '';
    setConnectionState('new');
    setLastError(null);
  }

  // ------------------------------
  // 1. Initialize PeerJS
  // ------------------------------
  useEffect(() => {
    if (!localStream) {
      console.log('🔌 [useWebRTC] No local stream - skipping PeerJS init');
      return;
    }

    if (peerInstanceRef.current) {
      console.log('🔌 [useWebRTC] PeerJS already initialized');
      return;
    }

    console.log('🔌 [useWebRTC] Initializing PeerJS with DEFAULT configuration...');

    const peer = new Peer(); // Use PeerJS's default public server

    peerInstanceRef.current = peer;

    // ------------------------------
    // PeerJS Events
    // ------------------------------
    peer.on('open', (id) => {
      console.log('✅ [useWebRTC] PeerJS connected! My Peer ID:', id);
      setPeerId(id);
      setConnectionState('new');
    });

    peer.on('error', (err) => {
      console.error('❌ [useWebRTC] PeerJS error:', err);
      setConnectionState('error');
      setLastError(err.message || 'Error en PeerJS');
    });

    peer.on('disconnected', () => {
      console.log('❌ [useWebRTC] PeerJS disconnected');
      setConnectionState('disconnected');
      // Try to reconnect if not connected yet
      if (!hasConnectedRef.current && peerInstanceRef.current) {
        console.log('🔄 [useWebRTC] Trying to reconnect to PeerJS...');
        peerInstanceRef.current.reconnect();
      }
    });

    const attachCallHandlers = (call: any) => {
      setupRemoteStreamFromCall(call, (stream) => {
        console.log('✅ [useWebRTC] Remote stream received - connected!');
        connectingSinceRef.current = null;
        setRemoteStream(stream);
        setConnectionState('connected');
        hasConnectedRef.current = true;
        hasTriedAutoConnectRef.current = true;
      });

      call.on('close', () => {
        console.log('📞 [useWebRTC] Call closed');
        setRemoteStream(null);
        setConnectionState('new');
        resetState();
      });

      call.on('error', (err: Error) => {
        console.error('❌ [useWebRTC] Call error:', err);
        setConnectionState('error');
        setLastError(err.message || 'Error en la llamada');
        hasTriedAutoConnectRef.current = false;
      });

      activeCallRef.current = call;
    };

    const answerIncomingCall = (call: any) => {
      if (answeredCallsRef.current.has(call.connectionId)) {
        return true;
      }

      const currentStream = localStreamRef.current;
      const liveTracks = getLiveTracks(currentStream);
      if (!currentStream || liveTracks.length === 0) {
        return false;
      }

      logStreamTracks('Answering with local stream', currentStream);
      call.answer(currentStream);
      answeredCallsRef.current.add(call.connectionId);
      attachCallHandlers(call);
      return true;
    };

    // Handle incoming calls
    peer.on('call', (call) => {
      console.log('📞 [useWebRTC] Incoming call received from:', call.peer);
      setConnectionState('connecting');

      if (answerIncomingCall(call)) return;

      console.log('⏳ [useWebRTC] Waiting for local stream before answering...');
      const waitForStream = setInterval(() => {
        if (answerIncomingCall(call)) {
          clearInterval(waitForStream);
        }
      }, 300);

      setTimeout(() => clearInterval(waitForStream), 15000);
    });

    // Cleanup
    return () => {
      console.log('🔌 [useWebRTC] Cleaning up PeerJS...');
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
      activeCallRef.current?.close();
      peer.destroy();
      peerInstanceRef.current = null;
      resetState();
    };
  }, [!!localStream, roomId]);

  // Actualizar cámara/micrófono solo cuando cambian los tracks reales
  useEffect(() => {
    if (!localStream || !activeCallRef.current || !hasConnectedRef.current) return;

    const trackKey = localStream
      .getTracks()
      .map((t) => `${t.kind}:${t.id}`)
      .join('|');

    if (lastSyncedTracksRef.current === trackKey) return;

    // En la primera conexión los tracks ya van en call/answer — no reemplazar
    if (lastSyncedTracksRef.current === '') {
      lastSyncedTracksRef.current = trackKey;
      return;
    }

    lastSyncedTracksRef.current = trackKey;
    console.log('🔄 [useWebRTC] Updating tracks in active call...');
    replaceTracksInCall(activeCallRef.current, localStream);
  }, [localStream]);

  // ------------------------------
  // 2. Save Peer ID whenever it changes
  // ------------------------------
  useEffect(() => {
    if (!peerId || !roomId) return;

    console.log('💾 [useWebRTC] Saving Peer ID:', peerId, 'admin:', isAdmin);

    savePeerId(roomId, peerId, isAdmin)
      .then(() => console.log('✅ [useWebRTC] Peer ID saved!'))
      .catch((err) => {
        console.error('❌ [useWebRTC] Failed to save Peer ID:', err);
        setLastError('Error saving peer ID');
      });
  }, [peerId, roomId, isAdmin]);

  // ------------------------------
  // 3. Check Room Status + Auto-Connect
  // ------------------------------
  useEffect(() => {
    if (!roomId) {
      console.error('❌ [useWebRTC] No room ID provided!');
      return;
    }

    const tryAutoConnect = async (
      status: RoomStatus,
      details: { userPeerId?: string | null; adminPeerId?: string | null } | null
    ) => {
      if (
        !localStream ||
        !peerId ||
        !peerInstanceRef.current ||
        !peerInstanceRef.current.open ||
        hasConnectedRef.current
      ) {
        return;
      }

      try {
        let remotePeerId: string | null = null;

        // Solo el admin inicia la llamada para evitar conflicto de doble offer
        if (isAdmin) {
          if (!status.hasUser || !details?.userPeerId) return;
          remotePeerId = details.userPeerId;
        } else {
          // El usuario solo responde llamadas entrantes
          return;
        }

        if (!remotePeerId) return;

        // Reintentar si llevamos mucho en "connecting" sin stream remoto
        if (
          hasTriedAutoConnectRef.current &&
          lastCalledPeerIdRef.current === remotePeerId
        ) {
          const stuck =
            connectingSinceRef.current &&
            Date.now() - connectingSinceRef.current > 8000 &&
            !hasConnectedRef.current;
          if (!stuck) return;
          console.log('🔄 [useWebRTC] Reintentando llamada (timeout)...');
          activeCallRef.current?.close();
          activeCallRef.current = null;
          hasTriedAutoConnectRef.current = false;
        }

        // Esperar a que el peer ID esté guardado en el servidor
        await new Promise((r) => setTimeout(r, isAdmin ? 2000 : 0));

        // Obtener peer ID fresco del usuario antes de llamar
        if (isAdmin) {
          const fresh = await getAdminRoomDetails(roomId);
          if (fresh.room.userPeerId) {
            remotePeerId = fresh.room.userPeerId;
          }
        }

        if (!remotePeerId) return;

        console.log(`📞 [useWebRTC] Admin calling:`, remotePeerId);
        await startOffer(remotePeerId);
      } catch (err) {
        console.error('❌ [useWebRTC] Auto-connect failed:', err);
        setLastError('Error en la conexión automática');
        hasTriedAutoConnectRef.current = false;
        lastCalledPeerIdRef.current = null;
      }
    };

    const checkStatusOnce = async () => {
      if (isCheckingRoomStatusRef.current || hasConnectedRef.current) {
        return;
      }

      isCheckingRoomStatusRef.current = true;

      try {
        const data = await getRoomStatus(roomId);
        const status = data.room as RoomStatus;
        setRoomStatus(status);
        setIsCheckingStatus(false);
        console.log('📡 [useWebRTC] Room status updated:', status);

        let details: { userPeerId?: string | null; adminPeerId?: string | null } | null = null;

        if (isAdmin) {
          const adminData = await getAdminRoomDetails(roomId);
          details = adminData.room;
          setAdminRoomDetails(adminData.room);
          console.log('👤 [useWebRTC] Admin room details:', adminData.room);
        }

        await tryAutoConnect(status, details);
      } catch (error) {
        console.error('❌ [useWebRTC] Error checking room status:', error);
        setLastError('Failed to check room status');
      } finally {
        isCheckingRoomStatusRef.current = false;
      }
    };

    checkStatusOnce();
    statusIntervalRef.current = setInterval(checkStatusOnce, 3000);

    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    };
  }, [roomId, isAdmin, localStream, peerId]);

  // ------------------------------
  // Helper Functions
  // ------------------------------

  async function startOffer(remotePeerId: string) {
    if (
      !peerInstanceRef.current ||
      !peerInstanceRef.current.open ||
      !localStream ||
      !peerId ||
      !remotePeerId ||
      hasConnectedRef.current
    ) {
      console.warn('⚠️ [useWebRTC] Cannot start call - missing requirements');
      return;
    }

    if (
      hasTriedAutoConnectRef.current &&
      lastCalledPeerIdRef.current === remotePeerId
    ) {
      console.warn('⚠️ [useWebRTC] Already calling this peer, skipping...');
      return;
    }

    hasTriedAutoConnectRef.current = true;
    lastCalledPeerIdRef.current = remotePeerId;
    connectingSinceRef.current = Date.now();
    console.log('📞 [useWebRTC] Starting call to peer:', remotePeerId);
    setConnectionState('connecting');

    const streamToSend = localStreamRef.current || localStream;
    const liveTracks = getLiveTracks(streamToSend);
    if (!streamToSend || liveTracks.length === 0) {
      console.warn('⚠️ [useWebRTC] No live tracks to send');
      hasTriedAutoConnectRef.current = false;
      return;
    }

    logStreamTracks('Calling with local stream', streamToSend);

    const call = peerInstanceRef.current.call(remotePeerId, streamToSend);
    
    if (!call) {
      console.error('❌ [useWebRTC] Failed to create call object');
      setConnectionState('error');
      setLastError('No se pudo crear la llamada');
      hasTriedAutoConnectRef.current = false;
      return;
    }

    setupRemoteStreamFromCall(call, (stream) => {
      console.log('✅ [useWebRTC] Remote stream received! Call connected.');
      connectingSinceRef.current = null;
      setRemoteStream(stream);
      setConnectionState('connected');
      hasConnectedRef.current = true;
    });

    const pc = call.peerConnection as RTCPeerConnection | undefined;
    if (pc) {
      pc.oniceconnectionstatechange = () => {
        console.log('🧊 [useWebRTC] ICE state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          setLastError('Conexión ICE falló — reintentando...');
          hasTriedAutoConnectRef.current = false;
          connectingSinceRef.current = null;
        }
      };
    }

    call.on('close', () => {
      console.log('📞 [useWebRTC] Call closed');
      setRemoteStream(null);
      setConnectionState('new');
      resetState();
    });

    call.on('error', (err: Error) => {
      console.error('❌ [useWebRTC] Call error:', err);
      setConnectionState('new');
      setLastError(err.message || 'Error en la llamada');
      hasTriedAutoConnectRef.current = false;
      lastCalledPeerIdRef.current = null;
    });

    activeCallRef.current = call;
  }

  function closeConnection() {
    if (activeCallRef.current) {
      activeCallRef.current.close();
      activeCallRef.current = null;
    }
    setRemoteStream(null);
    setConnectionState('new');
    resetState();
  }

  function retryConnection() {
    console.log('🔄 [useWebRTC] Retrying connection...');
    // Clear last called peer ID so we can try again with fresh data
    lastCalledPeerIdRef.current = null;
    closeConnection();
  }

  return {
    remoteStream,
    connectionState,
    startOffer,
    closeConnection,
    peerId,
    roomStatus,
    isCheckingStatus,
    adminRoomDetails,
    lastError,
    retryConnection
  };
}
