# 🔧 Guía de Extensión y Mejoras

Esta guía muestra cómo agregar funcionalidades adicionales a la aplicación de videochat.

---

## 1. 🔇 Controles de Micrófono y Cámara

### Hook para Controles de Tracks

Crea `app/components/useAudioVideoControls.ts`:

```typescript
'use client';
import { useCallback } from 'react';

export function useAudioVideoControls(stream: MediaStream | null) {
  const toggleAudio = useCallback(() => {
    if (!stream) return;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
  }, [stream]);

  const toggleVideo = useCallback(() => {
    if (!stream) return;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
  }, [stream]);

  const muteAudio = useCallback(() => {
    if (!stream) return;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });
  }, [stream]);

  const enableAudio = useCallback(() => {
    if (!stream) return;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });
  }, [stream]);

  const disableVideo = useCallback(() => {
    if (!stream) return;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = false;
    });
  }, [stream]);

  const enableVideo = useCallback(() => {
    if (!stream) return;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = true;
    });
  }, [stream]);

  return {
    toggleAudio,
    toggleVideo,
    muteAudio,
    enableAudio,
    disableVideo,
    enableVideo,
  };
}
```

### Usar en VideoChatRoom

```typescript
import { useAudioVideoControls } from './useAudioVideoControls';

export function VideoChatRoom({ roomId }: { roomId: string }) {
  // ... código existente ...
  
  const { toggleAudio, toggleVideo } = useAudioVideoControls(localStream);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const handleToggleAudio = () => {
    toggleAudio();
    setIsAudioEnabled(!isAudioEnabled);
  };

  const handleToggleVideo = () => {
    toggleVideo();
    setIsVideoEnabled(!isVideoEnabled);
  };

  return (
    // ... código existente ...
    <div className="flex gap-4 justify-center">
      <button
        onClick={handleToggleAudio}
        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
          isAudioEnabled
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-red-600 hover:bg-red-700'
        } text-white`}
      >
        {isAudioEnabled ? '🎤 Micrófono' : '🔇 Mudo'}
      </button>
      
      <button
        onClick={handleToggleVideo}
        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
          isVideoEnabled
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-red-600 hover:bg-red-700'
        } text-white`}
      >
        {isVideoEnabled ? '📹 Cámara' : '📵 Cámara Off'}
      </button>
    </div>
  );
}
```

---

## 2. 📊 Estadísticas de Conexión

Crea `app/components/useConnectionStats.ts`:

```typescript
'use client';
import { useEffect, useState } from 'react';

interface ConnectionStats {
  videoBytesReceived: number;
  audioBytes

Received: number;
  videoFramesDecoded: number;
  audioLevel: number;
  roundTripTime: number;
}

export function useConnectionStats(peerConnection: RTCPeerConnection | null) {
  const [stats, setStats] = useState<ConnectionStats>({
    videoBytesReceived: 0,
    audioBytesReceived: 0,
    videoFramesDecoded: 0,
    audioLevel: 0,
    roundTripTime: 0,
  });

  useEffect(() => {
    if (!peerConnection) return;

    const interval = setInterval(async () => {
      try {
        const statsReport = await peerConnection.getStats();
        const newStats = { ...stats };

        statsReport.forEach((report) => {
          if (report.type === 'inbound-rtp') {
            if (report.kind === 'video') {
              newStats.videoBytesReceived = report.bytesReceived || 0;
              newStats.videoFramesDecoded = report.framesDecoded || 0;
            } else if (report.kind === 'audio') {
              newStats.audioBytesReceived = report.bytesReceived || 0;
              newStats.audioLevel = report.audioLevel || 0;
            }
          } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            newStats.roundTripTime = Math.round(report.currentRoundTripTime * 1000);
          }
        });

        setStats(newStats);
      } catch (err) {
        console.error('Error getting stats:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [peerConnection]);

  return stats;
}
```

### Mostrar en UI

```typescript
const stats = useConnectionStats(peerConnection);

<div className="text-xs text-gray-400 space-y-1">
  <p>📤 Video: {(stats.videoBytesReceived / 1024 / 1024).toFixed(2)} MB</p>
  <p>📊 Frames: {stats.videoFramesDecoded}</p>
  <p>📡 RTT: {stats.roundTripTime}ms</p>
</div>
```

---

## 3. 🎥 Grabar Videollamada

Crea `app/components/useRecording.ts`:

```typescript
'use client';
import { useRef, useState } from 'react';

export function useRecording(stream: MediaStream | null) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  function startRecording() {
    if (!stream) return;

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `videochat-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      chunksRef.current = [];
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
```

### Usar en VideoChatRoom

```typescript
const { isRecording, startRecording, stopRecording } = useRecording(localStream);

<button
  onClick={isRecording ? stopRecording : startRecording}
  className={`px-4 py-2 rounded-lg font-semibold ${
    isRecording
      ? 'bg-red-600 animate-pulse'
      : 'bg-gray-600'
  } text-white`}
>
  {isRecording ? '⏹️ Detener Grabación' : '⏺️ Grabar'}
</button>
```

---

## 4. 💬 Chat de Texto

Usa DataChannels de WebRTC para chat:

```typescript
// En useWebRTC.ts, agregar después de crear peerConnection:

const dataChannelRef = useRef<RTCDataChannel | null>(null);
const [messages, setMessages] = useState<Array<{
  author: string;
  text: string;
  timestamp: number;
}>>([]);

// Crear channel si eres quien crea la offer
if (isInitiator) {
  const dc = peerConnection.createDataChannel('chat');
  setupDataChannel(dc);
}

// Escuchar channels del otro peer
peerConnection.ondatachannel = (event) => {
  setupDataChannel(event.channel);
};

function setupDataChannel(dc: RTCDataChannel) {
  dataChannelRef.current = dc;

  dc.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    setMessages((prev) => [...prev, msg]);
  };
}

function sendMessage(text: string) {
  if (!dataChannelRef.current) return;

  const msg = {
    author: 'local',
    text,
    timestamp: Date.now(),
  };

  dataChannelRef.current.send(JSON.stringify(msg));
  setMessages((prev) => [...prev, msg]);
}
```

---

## 5. 🖼️ Captura de Pantalla

```typescript
function captureScreenshot(videoRef: React.RefObject<HTMLVideoElement>) {
  if (!videoRef.current) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = videoRef.current.videoWidth;
  canvas.height = videoRef.current.videoHeight;

  ctx.drawImage(videoRef.current, 0, 0);

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `screenshot-${Date.now()}.png`;
  link.click();
}
```

---

## 6. 🌐 Compartir Pantalla (Screen Share)

```typescript
async function startScreenShare(
  peerConnection: RTCPeerConnection,
  localStream: MediaStream
) {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    const screenTrack = screenStream.getVideoTracks()[0];
    const sender = peerConnection
      .getSenders()
      .find((s) => s.track?.kind === 'video');

    if (!sender) return;

    await sender.replaceTrack(screenTrack);

    screenTrack.onended = async () => {
      const videoTrack = localStream.getVideoTracks()[0];
      await sender.replaceTrack(videoTrack);
    };
  } catch (err) {
    console.error('Screen share denied:', err);
  }
}
```

---

## 7. 📋 Mejorar Manejo de Errores

```typescript
class VideoChatError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'VideoChatError';
  }
}

// Usar:
try {
  await startStream(videoId, audioId);
} catch (err) {
  if (err instanceof VideoChatError) {
    if (err.code === 'PERMISSION_DENIED') {
      // Mostrar diálogo de permisos
    } else if (err.code === 'DEVICE_BUSY') {
      // Dispositivo ocupado
    }
  }
}
```

---

## 8. 🎯 Filtros de Video (Usando Canvas)

```typescript
function applyFilter(
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  filterType: 'grayscale' | 'sepia' | 'blur'
) {
  const canvas = canvasRef.current;
  const video = videoRef.current;
  if (!canvas || !video) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const draw = () => {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    if (filterType === 'grayscale') {
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = avg;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    requestAnimationFrame(draw);
  };

  draw();
}
```

---

## 9. 🔐 Mejorar Seguridad

### Verificación de Identidad
```typescript
// Agregar fingerprint de certificado
const offer = await peerConnection.createOffer();
const stats = await peerConnection.getStats();
// Validar certificado
```

### Rate Limiting
```typescript
function createRateLimiter(maxMessages: number, windowMs: number) {
  let messages = 0;
  
  return () => {
    messages++;
    if (messages > maxMessages) {
      throw new Error('Rate limit exceeded');
    }
    setTimeout(() => messages--, windowMs);
  };
}
```

---

## 🎨 Mejoras de UI/UX

### Indicador de Micrófono Activo
```typescript
<div className="absolute top-2 right-2 flex gap-2">
  {isAudioEnabled && (
    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
  )}
</div>
```

### Indicador de Calidad de Conexión
```typescript
const getQualityLevel = (rtt: number) => {
  if (rtt < 50) return '🟢 Excelente';
  if (rtt < 150) return '🟡 Bueno';
  if (rtt < 300) return '🟠 Aceptable';
  return '🔴 Pobre';
};
```

---

¡Estos son solo algunos ejemplos! La API de WebRTC es muy flexible y permite muchas más funcionalidades.
