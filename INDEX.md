# 📖 Índice de Documentación

Bienvenido a la aplicación de videochat modular. Aquí encontrarás todo lo que necesitas.

## 🚀 Empezar Rápido

### 1. **[QUICK_START.md](./QUICK_START.md)** - ⭐ Empieza aquí
- Estructura creada
- Cómo ejecutar la app
- Características implementadas
- Flujo de uso
- FAQ

### 2. **[VIDEOCHAT_ARCHITECTURE.md](./VIDEOCHAT_ARCHITECTURE.md)** - Arquitectura Profunda
- Explicación de cada componente
- Flujo de funcionamiento
- Configuración de WebRTC
- Características de seguridad
- Pasos para producción

### 3. **[EXTENSION_GUIDE.md](./EXTENSION_GUIDE.md)** - Cómo Extender
- Controles de micrófono/cámara
- Estadísticas de conexión
- Grabación de videollamadas
- Chat de texto
- Screen share
- Captura de pantalla
- Filtros de video
- Mejoras de seguridad

### 4. **[VISUAL_MAP.md](./VISUAL_MAP.md)** - Mapas Visuales
- Árbol de rutas
- Arquitectura de componentes
- Flujo de datos WebRTC
- Estados de conexión
- UI mockups

---

## 📁 Estructura de Archivos

```
app/
├── components/                    # Componentes reutilizables
│   ├── useMediaStream.ts         # Hook: Gestión de medios
│   ├── MediaDeviceSelector.tsx   # UI: Selector de dispositivos
│   ├── VideoPreview.tsx          # UI: Visualizador de video
│   ├── useWebRTC.ts             # Hook: Conexión P2P
│   ├── VideoChatRoom.tsx         # UI: Sala de llamada
│   └── RoomSelector.tsx          # UI: Selector de salas
│
├── videochat/                     # Rutas principales
│   ├── page.tsx                  # /videochat - Selector de salas
│   └── [roomId]/
│       └── page.tsx              # /videochat/[ID] - Sala específica
│
├── page.tsx                       # / - Landing page
├── layout.tsx                     # Layout global
└── globals.css                    # Estilos globales
```

---

## 🎯 Componentes Principales

### 🔧 Hooks (Lógica)

#### **useMediaStream** - Hook de Gestión de Medios
```typescript
const {
  devices,           // { video: [], audio: [] }
  selectedVideoId,   // ID del dispositivo seleccionado
  selectedAudioId,   // ID del dispositivo seleccionado
  stream,            // MediaStream activo
  isLoading,         // Estado de carga
  error,             // Errores
  startStream(),     // Inicia captura
  stopStream(),      // Detiene captura
  setSelectedVideo(),
  setSelectedAudio()
} = useMediaStream(autoStart);
```

**Responsabilidades:**
- Solicitar permisos del navegador
- Enumerar dispositivos disponibles
- Iniciar/detener streams
- Gestión limpia de tracks

---

#### **useWebRTC** - Hook de Conexión P2P
```typescript
const {
  remoteStream,      // MediaStream del otro peer
  connectionState,   // Estado de conexión
  iceGatheringState, // Estado de ICE
  signalingState,    // Estado de señalización
  startOffer(),      // Crear offer
  closeConnection()  // Cerrar conexión
} = useWebRTC(localStream, roomId);
```

**Responsabilidades:**
- Crear RTCPeerConnection
- Gestionar ofertas/respuestas
- Señalización vía localStorage
- Manejo de ICE candidates
- Procesamiento de tracks remotos

---

### 🎨 Componentes UI

#### **MediaDeviceSelector** - Selector de Dispositivos
Permite al usuario elegir cámara y micrófono.

```tsx
<MediaDeviceSelector
  onDevicesReady={() => console.log('Ready')}
  autoStart={false}
/>
```

#### **VideoPreview** - Visualizador de Video
Muestra stream de video local o remoto.

```tsx
<VideoPreview
  stream={mediaStream}
  label="Tu vídeo"
  isMuted={true}
  className="w-full aspect-video"
/>
```

#### **VideoChatRoom** - Sala de Videollamada
Integra todos los componentes en una sala.

```tsx
<VideoChatRoom roomId="ABC123DEF" />
```

#### **RoomSelector** - Gestor de Salas
Interfaz para crear o unirse a salas.

```tsx
<RoomSelector />
```

---

## 🔄 Flujos Principales

### Flujo 1: Iniciar Nueva Sala
```
1. Usuario accede a /videochat
2. Presiona "Generar Nueva Sala"
3. Se crea ID aleatorio
4. Presiona "Entrar a la Sala"
5. Redirige a /videochat/[ID]
6. VideoChatRoom inicializa
7. Usuario presiona "Iniciar Llamada"
8. useMediaStream pide permisos
9. useWebRTC inicia conexión
10. Espera a otro peer
```

### Flujo 2: Conectar Dos Personas
```
Usuario A                          Usuario B
    │                                  │
    ├─ /videochat/ABC123 ◄────────────┤
    ├─ Presiona "Iniciar"             │
    │  createOffer() ──────────►       │
    │                           setRemoteDescription()
    │                           createAnswer() ──┐
    │  ◄──────────────────────────────┘          │
    │  setRemoteDescription()                    │
    │                           ┌────────────────┘
    │  ICE Candidates ◄─────►  ICE Candidates
    │                           
    ├──────── Conectado ────────┤
    │  Audio + Video Bidireccional
    └─────────────────────────────┘
```

---

## 🔐 Seguridad

✅ **Encriptación E2E**
- DTLS-SRTP nativa del navegador
- Automática en WebRTC

✅ **Sin Intermediarios**
- Conexión P2P directa
- Sin servidor almacenando video/audio

✅ **Sin Autenticación**
- Solo compartir URL o ID
- Privacidad por URL

✅ **Limpieza de Recursos**
- Tracks detenidos correctamente
- Previene dispositivos bloqueados

---

## 🛠️ Configuración

### Stack Tecnológico
- **Next.js 16** - Framework React
- **React 19** - Librería UI
- **TypeScript** - Tipado estático
- **WebRTC** - Comunicación P2P
- **Tailwind CSS** - Estilos
- **STUN Servers** - NAT traversal

### STUN Servers Incluidos
```typescript
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]
```

---

## 📊 Tamaño de Componentes

| Archivo | Líneas | Tipo |
|---------|--------|------|
| useMediaStream.ts | 180 | Hook |
| useWebRTC.ts | 200 | Hook |
| MediaDeviceSelector.tsx | 90 | Componente |
| VideoPreview.tsx | 40 | Componente |
| VideoChatRoom.tsx | 200 | Componente |
| RoomSelector.tsx | 150 | Componente |
| **Total** | **860** | - |

Código limpio, modular y reutilizable.

---

## 🎓 Conceptos Clave

### MediaStream
Flujo de audio/video del navegador.
- Contiene Audio Tracks y Video Tracks
- Se obtiene con `getUserMedia()`
- Se asigna a elemento `<video>`

### RTCPeerConnection
Conexión P2P entre dos navegadores.
- Intercambia SDP (Session Description Protocol)
- Recolecta candidatos ICE
- Encripta automáticamente con DTLS-SRTP

### STUN Server
Servidor de reflejo para encontrar IP pública.
- Necesario si hay NAT/Firewall
- No almacena datos
- Google proporciona gratuito

### ICE Candidate
Dirección IP candidata para conexión.
- Reflexiva (publica vía STUN)
- Relayada (si hay NAT restrictivo)
- Localhost (si están en la misma red)

### SDP
Descripción de sesión multimedia.
- Ofertas (offer): "Aquí está mi configuración"
- Respuestas (answer): "Acepto tu configuración"
- Se intercambian vía señalización

---

## 🚀 Próximos Pasos

### Para Principiantes
1. Lee QUICK_START.md
2. Ejecuta `pnpm dev`
3. Prueba la app
4. Lee VIDEOCHAT_ARCHITECTURE.md

### Para Desarrolladores
1. Explora el código en `app/components/`
2. Estudia los hooks
3. Ve EXTENSION_GUIDE.md
4. Agrega funcionalidades

### Para Producción
1. Lee "Pasos para Producción" en VIDEOCHAT_ARCHITECTURE.md
2. Agregar servidor de señalización
3. Configurar TURN servers
4. Optimizar rendimiento
5. Desplegar en Vercel/Netlify

---

## 💬 FAQ Técnica

**P: ¿WebRTC necesita servidor?**
R: Mínimo necesita STUN (incluido). Para producción, agregar TURN server.

**P: ¿Cuál es la latencia?**
R: 10-100ms típicamente. P2P directo = muy baja.

**P: ¿Funciona en móvil?**
R: Sí, navegadores modernos (Chrome, Firefox, Safari).

**P: ¿Cómo escalo a 3+ personas?**
R: Necesitas SFU (Selective Forwarding Unit). Ver EXTENSION_GUIDE.md

**P: ¿Cómo agrego chat?**
R: Usa RTCDataChannel. Ejemplo en EXTENSION_GUIDE.md

**P: ¿Puedo grabar?**
R: Sí, MediaRecorder. Ejemplo en EXTENSION_GUIDE.md

---

## 🔗 Recursos Externos

- [MDN WebRTC](https://developer.mozilla.org/es/docs/Web/API/WebRTC_API)
- [HTML5 Rocks WebRTC](https://www.html5rocks.com/en/tutorials/webrtc/basics/)
- [WebRTC.org](https://webrtc.org/)
- [Interactive Codelab](https://codelabs.developers.google.com/codelabs/webrtc-web)

---

## 📝 Notas

- **Importante:** Siempre llamar `.stop()` en tracks para evitar dispositivos bloqueados
- **Desarrollo:** Usar localhost o HTTPS para permisos
- **Producción:** Configurar certificados SSL/TLS

---

## 🎉 ¡Listo!

Tienes una aplicación de videochat profesional, modular y bien documentada.

**Próximo paso:** Abre QUICK_START.md y ejecuta `pnpm dev`

¡Disfruta! 🎊
