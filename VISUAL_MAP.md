# 📊 Mapa Visual de la Aplicación

## 🗺️ Árbol de Rutas

```
/                              → Página de inicio (landing page)
├── Features
├── Tech Stack
└── CTA: "Iniciar Videochat"

/videochat                     → Selector de salas
├── "Generar Nueva Sala"
│   └── Copia ID → URL
├── "Unirse a Sala"
│   └── Ingresa ID → URL
└── Información de Seguridad

/videochat/[roomId]            → Sala de videollamada
├── Video Local
├── Video Remoto
├── Estado de Conexión
├── Controles
│   ├── Iniciar Llamada
│   └── Terminar
└── Chat/Información
```

## 🏗️ Arquitectura de Componentes

```
┌─────────────────────────────────────────────┐
│         Página de Inicio (/)                 │
│    - Landing page profesional                │
│    - Features y beneficios                   │
│    - Call-to-action a /videochat             │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│     Selector de Salas (/videochat)          │
│     ┌──────────────┐    ┌───────────────┐   │
│     │ Nueva Sala   │    │ Unirse a Sala │   │
│     │ - Generar ID │    │ - Ingresa ID  │   │
│     │ - Copiar     │    │ - Valida      │   │
│     └──────────────┘    └───────────────┘   │
│            │                    │            │
│            └──────────┬─────────┘            │
│                       │                      │
│               Redirige a /videochat/[ID]    │
└───────────────────┬──────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────┐
    │ Sala de Videollamada (/[roomId])  │
    │                                   │
    │  ┌───────────┐     ┌───────────┐  │
    │  │ Video     │     │ Video     │  │
    │  │ Local     │ P2P │ Remoto    │  │
    │  │           │◄───►│           │  │
    │  └───────────┘     └───────────┘  │
    │        │                  │        │
    │        ├─ Audio Track ────┤        │
    │        ├─ Video Track ────┤        │
    │        └─ ICE Candidates──┤        │
    │                           │        │
    │   Estado: Conectando...   │        │
    │   Dispositivos: [Cambiar] │        │
    │                           │        │
    │  [Iniciar] [Terminar]    │        │
    └───────────────────────────────────┘
```

## 🔄 Flujo de Datos WebRTC

```
Usuario A                            Usuario B
    │                                    │
    ├─ Allow Permisos                   │
    │  (getUserMedia)                   │
    │                                   │
    ├─ Crear RTCPeerConnection         │
    │  + STUN Servers                   │
    │  + Add Local Tracks               │
    │                                   │
    ├─ Crear Offer                      │
    │  └─ SDP Offer                     │
    │                                   ├─ Allow Permisos
    │     SDP Offer ─────────────────►  │ (via Signal)
    │     (localStorage)                │
    │                                   ├─ Crear RTCPeerConnection
    │                                   │  + Add Local Tracks
    │                                   │
    │                                   ├─ Set Remote Description
    │                                   ├─ Crear Answer
    │                                   │  └─ SDP Answer
    │                                   │
    │     SDP Answer ◄─────────────────  │ 
    │                                   │
    ├─ Set Remote Description           │
    │                                   │
    ├─ ICE Candidates ◄──────────────►  │
    │  (STUN reflexive)                │
    │                                   │
    ├──────────────────────────────────┤
    │    Conexión Establecida ✓        │
    │    - Audio bidireccional         │
    │    - Video bidireccional         │
    │    - DTLS-SRTP Encriptado        │
    ├──────────────────────────────────┤
    │                                   │
    └────────────────────────────────────┘
```

## 🧩 Componentes y Su Rol

```
┌──────────────────────────────────────────────────────┐
│           CAPA DE PRESENTACIÓN (UI)                   │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────┐        ┌──────────────────┐    │
│  │ RoomSelector    │        │ VideoChatRoom    │    │
│  ├─────────────────┤        ├──────────────────┤    │
│  │ - Generar sala  │        │ - Integración    │    │
│  │ - Unirse a sala │        │ - UI maestro     │    │
│  └────────┬────────┘        └─────┬────────────┘    │
│           │                       │                  │
│           │                       ▼                  │
│           │        ┌──────────────────────┐          │
│           │        │ VideoPreview x2      │          │
│           │        ├──────────────────────┤          │
│           │        │ - <video> para local │          │
│           │        │ - <video> para remoto│          │
│           │        └──────────────────────┘          │
│           │                                          │
│        Redirige                                     │
│           │                                          │
└───────────┼──────────────────────────────────────────┘
            │
     ┌──────▼──────────────────────────────┐
     │   CAPA DE LÓGICA DE MEDIOS           │
     ├──────────────────────────────────────┤
     │                                      │
     │  ┌──────────────────────────────┐   │
     │  │ useMediaStream Hook          │   │
     │  ├──────────────────────────────┤   │
     │  │ - enumerateDevices()         │   │
     │  │ - getUserMedia()             │   │
     │  │ - Track management           │   │
     │  │ - Error handling             │   │
     │  └──────────────────────────────┘   │
     │                                      │
     └──────┬───────────────────────────────┘
            │
     ┌──────▼──────────────────────────────┐
     │   CAPA DE CONEXIÓN P2P               │
     ├──────────────────────────────────────┤
     │                                      │
     │  ┌──────────────────────────────┐   │
     │  │ useWebRTC Hook               │   │
     │  ├──────────────────────────────┤   │
     │  │ - RTCPeerConnection          │   │
     │  │ - Signal (SDP + ICE)         │   │
     │  │ - Remote stream              │   │
     │  │ - Connection monitoring      │   │
     │  └──────────────────────────────┘   │
     │                                      │
     └──────┬───────────────────────────────┘
            │
     ┌──────▼──────────────────────────────┐
     │   CAPA DE TRANSPORTE (WebRTC API)    │
     ├──────────────────────────────────────┤
     │ - navigator.mediaDevices             │
     │ - RTCPeerConnection                  │
     │ - STUN Servers (Google)              │
     │ - Encriptación DTLS-SRTP             │
     └──────────────────────────────────────┘
```

## 📦 Flujo de Datos - Instancia de Componente

```
VideoChatRoom
  │
  ├─ useMediaStream()
  │  ├─ streamRef.current → MediaStream
  │  └─ Control: selectedVideoId, selectedAudioId
  │
  ├─ useWebRTC(localStream, roomId)
  │  ├─ peerConnectionRef.current → RTCPeerConnection
  │  └─ remoteStream → MediaStream remoto
  │
  └─ Render:
     ├─ VideoPreview(stream=localStream)
     │  └─ <video srcObject={stream} muted />
     │
     ├─ VideoPreview(stream=remoteStream)
     │  └─ <video srcObject={stream} />
     │
     └─ Controles:
        ├─ startOffer() → Inicia llamada
        └─ closeConnection() → Termina
```

## 🎛️ Estados de Conexión

```
┌─────────────────────────────────────────┐
│       Estados de Conexión WebRTC        │
├─────────────────────────────────────────┤
│                                         │
│  new ─────► connecting ──► connected   │
│                │               │        │
│                ▼               │        │
│           iceGathering    connected    │
│                │               │        │
│                ▼               ▼        │
│         iceFailed ◄─ ─ ─ ─ ─ ─ ┘       │
│                │                       │
│                ▼                       │
│          disconnected                  │
│                │                       │
│                ▼                       │
│             closed                     │
│                                         │
└─────────────────────────────────────────┘

Estados Mostrados en UI:
🟢 Conectado  (connected)
🟡 Conectando (connecting)
🔴 Desconectado (disconnected)
⚪ Otro (new, closed, failed)
```

## 🔌 Puntos de Integración

### Para Agregar Funcionalidad:

```
Mute/Unmute Audio/Video:
└─ VideoPreview → getAudioTracks()/getVideoTracks() → track.enabled

Estadísticas:
└─ VideoChatRoom → peerConnection.getStats()

Grabación:
└─ VideoChatRoom → MediaRecorder(localStream)

Chat:
└─ useWebRTC → RTCDataChannel → sendMessage()

Screen Share:
└─ useWebRTC → peerConnection.getSenders() → replaceTrack()

Filtros:
└─ VideoPreview → Canvas + requestAnimationFrame()
```

## 💾 Almacenamiento de Señales

```
┌─────────────────────────────────────┐
│    Señalización via localStorage    │
│    (Para demo/desarrollo)           │
├─────────────────────────────────────┤
│                                     │
│  localStorage["webrtc-signal-..."]  │
│  {                                  │
│    type: "offer|answer|ice",        │
│    offer/answer: {...SDP...},       │
│    candidate: {...ICE...},          │
│    roomId: "ABC123",                │
│    timestamp: 1234567890            │
│  }                                  │
│                                     │
│  StorageEvent → Peer actualiza      │
│                                     │
│  Limpieza: 30 segundos              │
│                                     │
│  ⚠️ Para producción:                │
│  Usar WebSocket/Socket.io           │
│                                     │
└─────────────────────────────────────┘
```

## 🎨 Componentes Visuales

```
┌─────────────────────────────────────────────────────┐
│  Landing Page (/)                                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [Título Principal]                                 │
│  [Features Grid 2x2]                                │
│  [CTA Buttons]                                      │
│  [How It Works]                                     │
│  [Tech Stack]                                       │
│  [Footer]                                           │
│                                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Room Selector (/videochat)                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [Título]                                           │
│  [Nueva Sala Card]                                  │
│    - Botón Generar                                  │
│    - Display ID                                     │
│    - Botón Copiar                                   │
│  [Separator]                                        │
│  [Unirse Card]                                      │
│    - Input ID                                       │
│    - Botón Unirse                                   │
│  [Security Info]                                    │
│                                                      │
└─────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Video Chat Room (/videochat/[roomId])               │
├──────────────────────────────────────────────────────┤
│                                                       │
│  [Header] "Videollamada" | "Sala: ABC123"           │
│                                                       │
│  [Status Bar]                                        │
│    🟢 Conectado | ✓ Local | ✗ Remoto              │
│                                                       │
│  [Video Grid]                                        │
│    ┌────────────┐      ┌────────────┐              │
│    │            │      │            │              │
│    │   Video    │      │   Video    │              │
│    │  Local     │      │  Remoto    │              │
│    │            │      │            │              │
│    └────────────┘      └────────────┘              │
│                                                       │
│  [Controls]                                          │
│    [Iniciar] o [Terminar]                           │
│                                                       │
│  [Instructions]                                      │
│    1. Presiona iniciar                              │
│    2. Comparte URL                                  │
│    3. Ambos presionan iniciar                       │
│    4. ¡Conectados!                                  │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

Esta estructura visual muestra cómo todos los componentes, hooks y páginas trabajan juntos para crear una experiencia de videochat completa y profesional.
