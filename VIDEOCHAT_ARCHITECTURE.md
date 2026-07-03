# 📹 Aplicación de Videochat Modular

Una aplicación moderna de videochat en tiempo real construida con Next.js, React y WebRTC. Permite que dos personas se conecten sin autenticación mediante ID de sala compartido.

## 🏗️ Arquitectura Modular

### Componentes Principales

#### 1. **`useMediaStream.ts`** - Hook de Gestión de Medios
Maneja el ciclo de vida completo del flujo multimedia:
- ✅ Solicitud de permisos del navegador
- ✅ Enumeración de dispositivos (cámaras y micrófonos)
- ✅ Inicialización y cambio de dispositivos
- ✅ Gestión limpia de tracks (previene dispositivos bloqueados)
- ✅ Manejo de errores

**Uso:**
```typescript
const { 
  stream, 
  devices, 
  selectedVideoId, 
  selectedAudioId,
  startStream, 
  stopStream,
  setSelectedVideo,
  setSelectedAudio 
} = useMediaStream(autoStart);
```

#### 2. **`MediaDeviceSelector.tsx`** - Selector de Dispositivos
Interfaz para seleccionar cámara y micrófono:
- Dropdown de cámaras disponibles
- Dropdown de micrófonos disponibles
- Botón para iniciar dispositivos
- Mostrador de dispositivos detectados
- Manejo visual de errores

#### 3. **`VideoPreview.tsx`** - Visualizador de Video
Componente reutilizable para mostrar streams de video:
- Soporte para video local (muted) y remoto (unmuted)
- Etiqueta configurable
- Responsive y fullscreen
- Manejo de aspectRatio

#### 4. **`useWebRTC.ts`** - Hook de Conexión P2P
Gestiona toda la lógica de WebRTC:
- Configuración de ICE servers (Google STUN)
- Creación de ofertas (offer) y respuestas (answer)
- Recolección de candidatos ICE
- Monitoreo de estados de conexión
- Manejo de tracks remotos

**Señalización vía localStorage** (para demo):
- En producción, usar WebSocket o Socket.io
- Los pares intercambian SDP y ICE candidates
- Sincronización mediante eventos de storage

#### 5. **`VideoChatRoom.tsx`** - Sala de Videollamada
Integra todos los componentes:
- Gestor de flujos locales
- Conexión WebRTC con otro peer
- Visualización dual (local + remoto)
- Indicadores de estado en tiempo real
- Controles de inicio/cierre

#### 6. **`RoomSelector.tsx`** - Selector de Salas
Interfaz para gestionar salas:
- Generar nuevas salas con ID aleatorio
- Copiar ID al portapapeles
- Unirse a sala existente mediante ID
- Vista previa de funciones de seguridad

---

## 🚀 Flujo de Funcionamiento

### 1. Usuario Accede a `/videochat`
```
RoomSelector muestra opciones:
├─ Generar nueva sala
├─ Copiar ID de sala
└─ Unirse a sala existente
```

### 2. Usuario Presiona "Iniciar Llamada"
```
VideoChatRoom → useMediaStream:
├─ Solicita permisos (getUserMedia)
├─ Lista dispositivos (enumerateDevices)
├─ Inicia stream con dispositivo seleccionado
└─ Dibuja en elemento <video>
```

### 3. Establecer Conexión P2P
```
useWebRTC:
├─ Crear RTCPeerConnection
├─ Agregar tracks locales (video + audio)
├─ Crear offer
├─ Enviar offer vía signal (localStorage)
├─ Esperar answer del otro peer
├─ Recolectar candidatos ICE
└─ Conexión establecida → remoteStream llega
```

### 4. Comunicación en Tiempo Real
```
Una vez conectados:
├─ Audio bidireccional via audio track
├─ Video bidireccional via video track
├─ Encriptación E2E (DTLS-SRTP en navegador)
└─ Sin intermediarios (P2P directo)
```

---

## 📋 Estructura de Archivos

```
app/
├── components/
│   ├── useMediaStream.ts        # Hook de gestión de medios
│   ├── MediaDeviceSelector.tsx  # Selector de dispositivos
│   ├── VideoPreview.tsx         # Visualizador de video
│   ├── useWebRTC.ts            # Hook de conexión P2P
│   ├── VideoChatRoom.tsx        # Sala de videollamada
│   └── RoomSelector.tsx         # Selector de salas
├── videochat/
│   ├── page.tsx                # Página selector de salas
│   └── [roomId]/
│       └── page.tsx            # Página de sala específica
└── layout.tsx
```

---

## ⚙️ Configuración de WebRTC

### ICE Servers (STUN)
```typescript
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]
```

Para producción, agregar TURN servers:
```typescript
{
  urls: 'turn:turnserver.example.com',
  username: 'user',
  credential: 'password'
}
```

---

## 🔒 Características de Seguridad

- ✅ **WebRTC E2E:** Encriptación DTLS-SRTP nativa del navegador
- ✅ **Sin servidor:** P2P directo, sin intermediarios
- ✅ **Sin autenticación:** ID de sala es suficiente (compartir URL)
- ✅ **Limpieza de tracks:** Previene dispositivos bloqueados
- ✅ **Gestión de permisos:** Control granular del usuario

---

## 🎯 Cómo Usar

### Para Desarrollo
```bash
npm run dev
# o
pnpm dev
```

Abre http://localhost:3000/videochat

### Crear Nueva Llamada
1. Presiona "✨ Generar Nueva Sala"
2. Copia el ID generado
3. Comparte la URL con otra persona
4. Ambos presionan "📞 Iniciar Llamada"

### Unirse a Llamada Existente
1. Ingresa el ID de sala
2. Presiona "🚀 Unirse a Sala"
3. Presiona "📞 Iniciar Llamada"

---

## 🔧 Personalización

### Cambiar STUN Servers
Edita `useWebRTC.ts`:
```typescript
const config: RTCConfiguration = {
  iceServers: [
    // Tus servidores aquí
  ],
};
```

### Cambiar Mecanismo de Señalización
Actualmente usa localStorage. Para usar WebSocket:
1. Reemplaza `broadcastSignal()` en `useWebRTC.ts`
2. Conecta a servidor WebSocket
3. Emite/escucha eventos de señal

### Agregar Controles Adicionales
Agrega a `VideoChatRoom.tsx`:
- Silenciar/Activar micrófono
- Apagar/Encender cámara
- Grabar llamada
- Chat de texto

---

## 📱 Compatibilidad

- ✅ Chrome/Edge (v60+)
- ✅ Firefox (v55+)
- ✅ Safari (v11+)
- ✅ Opera (v47+)
- ❌ Internet Explorer

---

## 🐛 Troubleshooting

### "No hay cámaras disponibles"
- Verifica que conectaste una cámara
- Recarga la página
- Revisa permisos del navegador

### "Dispositivo ocupado (busy)"
- **Crítico:** No olvidar `.stop()` en tracks anteriores
- Esto está manejado en `useMediaStream.ts`
- Si persiste, reinicia el navegador

### "No se conecta el video remoto"
- Verifica ambas URL tienen mismo `roomId`
- Ambos presionan "Iniciar Llamada"
- Revisa console para logs de ICE

### OBS Virtual Camera no aparece
- Inicia OBS primero
- Activa "Start Virtual Camera"
- Recarga la página

---

## 🚀 Pasos para Producción

1. **Agregar servidor de señalización:**
   - Socket.io o similar
   - Reemplazar localStorage

2. **TURN Servers:**
   - Para usuarios detrás de NAT
   - Agregar credentials

3. **Escalabilidad:**
   - Para >2 personas: Usar SFU (Selective Forwarding Unit)
   - LiveKit, Janus, Mediasoup

4. **Monitoreo:**
   - Agregar stats de RTCPeerConnection
   - Logs de conexión/desconexión

5. **UI/UX:**
   - Mejorar indicadores de estado
   - Agregar pantalla de espera
   - Manejo de desconexiones

---

## 📚 Referencias

- [MDN WebRTC](https://developer.mozilla.org/es/docs/Web/API/WebRTC_API)
- [WebRTC Best Practices](https://www.html5rocks.com/en/tutorials/webrtc/basics/)
- [STUN & TURN](https://tools.ietf.org/html/rfc8489)

---

**Hecho con ❤️ para comunicación simple y segura.**
