'use client';
import { useState, useEffect } from 'react';
import { useMediaStream } from './useMediaStream';
import { useWebRTC } from './useWebRTC';
import { VideoPreview } from './VideoPreview';
import { getPaymentSettings } from '../lib/api';

interface VideoChatRoomProps {
  roomId: string;
  isAdmin?: boolean;
}

interface DeviceSelectorPanelProps {
  devices: { video: { id: string; label: string }[]; audio: { id: string; label: string }[] };
  selectedVideoId: string;
  selectedAudioId: string;
  onVideoChange: (id: string) => void;
  onAudioChange: (id: string) => void;
  onClose: () => void;
  className?: string;
}

function DeviceSelectorPanel({
  devices,
  selectedVideoId,
  selectedAudioId,
  onVideoChange,
  onAudioChange,
  onClose,
  className = '',
}: DeviceSelectorPanelProps) {
  return (
    <div className={`p-6 bg-gray-800 rounded-xl border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Seleccionar Dispositivos</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-2xl"
        >
          ✕
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Cámara
          </label>
          <select
            value={selectedVideoId}
            onChange={(e) => onVideoChange(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {devices.video.length === 0 ? (
              <option value="">No hay cámaras disponibles</option>
            ) : (
              devices.video.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.label || `Cámara ${device.id.slice(0, 5)}`}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Micrófono
          </label>
          <select
            value={selectedAudioId}
            onChange={(e) => onAudioChange(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {devices.audio.length === 0 ? (
              <option value="">No hay micrófonos disponibles</option>
            ) : (
              devices.audio.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.label || `Micrófono ${device.id.slice(0, 5)}`}
                </option>
              ))
            )}
          </select>
        </div>
      </div>
    </div>
  );
}

export function VideoChatRoom({ roomId, isAdmin = false }: VideoChatRoomProps) {
  const {
    stream: localStream,
    selectedVideoId,
    selectedAudioId,
    isLoading,
    error: mediaError,
    startStream,
    stopStream,
    devices,
    setSelectedVideo,
    setSelectedAudio,
  } = useMediaStream();

  const {
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
  } = useWebRTC(localStream, roomId, isAdmin);

  const [hasInitialized, setHasInitialized] = useState(false);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [manualPeerId, setManualPeerId] = useState('');
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [localMediaError, setLocalMediaError] = useState<string | null>(null);
  const [showDiag, setShowDiag] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);

  const handleInitialize = async () => {
    setPermissionRequested(true);
    try {
      console.log('🎥 Starting media stream...');
      await startStream(selectedVideoId, selectedAudioId);
      setHasInitialized(true);
      setLocalMediaError(null);
      console.log('✅ Media stream started!');
    } catch (err) {
      console.error('❌ Error starting media:', err);
      const errorMessage =
        err instanceof Error
          ? `No se pudo iniciar la cámara o el micrófono: ${err.message}`
          : 'No se pudo iniciar la cámara o el micrófono.';
      setLocalMediaError(errorMessage);
    }
  };

  const handleHangUp = () => {
    stopStream();
    closeConnection();
    setHasInitialized(false);
  };

  const handleManualConnect = async () => {
    if (manualPeerId.trim()) {
      await startOffer(manualPeerId.trim());
    }
  };

  // Check payment verification status
  useEffect(() => {
    if (roomStatus !== null) {
      setShowPaymentModal(!roomStatus.paymentVerified);
    }
  }, [roomStatus]);

  // Fetch payment settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getPaymentSettings();
        setPaymentSettings(data.settings);
      } catch (error) {
        console.error('Error fetching payment settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';
  const hasError = connectionState === 'error';

  return (
    <>
      {/* Payment Verification Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl rounded-[2rem] border border-cyan-500/20 bg-slate-950/95 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-400/80 mb-2">Pago pendiente</p>
                <h2 className="text-4xl font-extrabold text-white">Completa tu pago</h2>
              </div>
              <button
                onClick={() => window.location.href = '/'}
                className="text-slate-400 hover:text-white text-2xl"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr] mb-6">
              <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-6">
                <p className="text-sm text-slate-500 mb-3">Precio de la sala</p>
                <p className="text-5xl font-bold text-cyan-300">${paymentSettings?.price || 10}.00</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-6 text-right">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Código</p>
                <p className="mt-3 rounded-3xl bg-slate-800 px-4 py-3 text-lg font-semibold text-white inline-block">{roomId}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-5">
                <p className="text-sm text-slate-500">Número de cuenta</p>
                <p className="mt-4 text-lg font-semibold text-white">{paymentSettings?.accountNumber || '0000 0000 0000 0000'}</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-5">
                <p className="text-sm text-slate-500">WhatsApp para pago</p>
                <button
                  onClick={() => {
                    // Get number from settings and clean it
                    const whatsappNumber = paymentSettings?.whatsappNumber || '1234567890';
                    const cleanNumber = whatsappNumber.replace(/\D/g, '');
                    
                    // Default message with room code
                    const defaultMessage = `Hola, quiero habilitar mi sala para una sesión en vivo. Mi código de sala es: ${roomId}`;
                    const encodedMessage = encodeURIComponent(defaultMessage);
                    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
                    
                    console.log('Opening WhatsApp:', whatsappUrl);
                    window.open(whatsappUrl, '_blank');
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-3xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Abrir WhatsApp
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-5">
                <p className="text-sm text-slate-500">Código de la sala</p>
                <p className="mt-4 text-lg font-semibold text-white">{roomId}</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-5">
                <p className="text-sm text-slate-500 uppercase tracking-[0.35em] mb-2">Estado</p>
                <p className="text-xl font-bold text-amber-300">Pago pendiente</p>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  El administrador revisará tu pago y, una vez confirmado, la sala estará lista para conectarte.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-500 text-center">
              Mientras tanto, puedes copiar el código y compartirlo con tu interlocutor.
            </p>
          </div>
        </div>
      )}

      <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black rounded-lg p-6">
      {!isConnected ? (
        // Setup/Connecting Screen
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-2xl">
            <h1 className="text-3xl font-bold text-white mb-4">
              {isAdmin ? '🎬 Sala de Administración' : '🎥 Sala de Videochat'}
            </h1>
            
            {/* Room Code Display */}
            <div className="bg-gray-800 rounded-xl p-6 mb-6 inline-block border border-gray-700">
              <p className="text-gray-400 text-sm mb-2">Código de Sala</p>
              <p className="font-mono text-2xl font-bold text-blue-400">{roomId}</p>
            </div>

            {/* Status Panel */}
            <div className="bg-gray-800 rounded-xl p-6 mb-6 text-left max-w-lg mx-auto border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                📋 Estado
              </h3>
              
              <div className="space-y-4">
                {/* Payment Verification Status */}
                {roomStatus && (
                  <div className={`flex items-center gap-2 ${roomStatus.paymentVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                    <span className="text-xl">{roomStatus.paymentVerified ? '✅' : '⏳'}</span>
                    <span>
                      {roomStatus.paymentVerified 
                        ? 'Pago verificado' 
                        : 'Esperando verificación de pago...'}
                    </span>
                  </div>
                )}
                {/* Room Status Check */}
                {isCheckingStatus ? (
                  <div className="flex items-center gap-2 text-yellow-400">
                    <span className="text-xl animate-pulse">⏳</span>
                    <span>Verificando sala...</span>
                  </div>
                ) : roomStatus ? (
                  <>
                    <div className={`flex items-center gap-2 ${roomStatus.hasAdmin ? 'text-green-400' : 'text-yellow-400'}`}>
                      <span className="text-xl">{roomStatus.hasAdmin ? '✅' : '⏳'}</span>
                      <span>
                        {roomStatus.hasAdmin 
                          ? 'Administrador en la sala' 
                          : isAdmin 
                            ? 'Esperando que el usuario entre...'
                            : 'Esperando que el administrador entre...'}
                      </span>
                    </div>
                    
                    <div className={`flex items-center gap-2 ${roomStatus.hasUser ? 'text-green-400' : 'text-yellow-400'}`}>
                      <span className="text-xl">{roomStatus.hasUser ? '✅' : '⏳'}</span>
                      <span>
                        {roomStatus.hasUser 
                          ? 'Usuario en la sala' 
                          : isAdmin 
                            ? 'Esperando que el usuario entre...'
                            : 'Tú estás en la sala'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-red-400">
                    <span className="text-xl">❌</span>
                    <span>No se puede conectar al servidor</span>
                  </div>
                )}

                {/* Peer ID Status */}
                {hasInitialized && (
                  <>
                    <div className="pt-3 border-t border-gray-700">
                      <div className={`flex items-center gap-2 ${peerId ? 'text-green-400' : 'text-yellow-400'}`}>
                        <span className="text-xl">{peerId ? '✅' : '⏳'}</span>
                        <span>
                          {peerId 
                            ? `Peer ID generado: ${peerId.slice(0, 12)}...` 
                            : 'Conectando a PeerJS...'}
                        </span>
                      </div>
                    </div>

                    {/* Connection Status */}
                    <div className="pt-2">
                      <p className="text-gray-400 text-sm">Estado de conexión:</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-4 h-4 rounded-full ${
                          isConnected ? 'bg-green-500' : 
                          isConnecting ? 'bg-yellow-500 animate-pulse' : 
                          hasError ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                        <span className={`font-semibold text-lg ${
                          isConnected ? 'text-green-400' : 
                          isConnecting ? 'text-yellow-400' : 
                          hasError ? 'text-red-400' : 'text-gray-500'
                        }`}>
                          {isConnected ? 'Conectado' : 
                           isConnecting ? 'Conectando...' : 
                           hasError ? 'Error' : 
                           isAdmin && roomStatus?.hasUser ? 'Llamando al usuario...' :
                           !isAdmin && roomStatus?.hasAdmin ? 'Esperando llamada del admin...' :
                           'Esperando...'}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Errors */}
                {(localMediaError || mediaError || lastError) && (
                  <div className="pt-3 border-t border-gray-700">
                    <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 space-y-3">
                      <p className="text-red-400 text-sm flex items-start gap-2">
                        <span>⚠️</span>
                            {localMediaError || mediaError || lastError}
                      </p>
                          <div className="text-sm text-slate-300">
                            <p>Si no aparece el prompt, revisa los permisos de cámara y micrófono en el navegador, y vuelve a intentarlo.</p>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>Cierra otras aplicaciones que usen la cámara (Zoom, Teams, etc.).</li>
                              <li>Revisa el icono de candado en la barra de direcciones y restablece permisos para este sitio.</li>
                              <li>En Windows: Configuración → Privacidad → Cámara / Micrófono → permite acceso.</li>
                            </ul>
                          </div>
                      <button
                        onClick={handleInitialize}
                        className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition"
                      >
                        Volver a solicitar permisos
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Camera Preview */}
            <div className="mb-6">
              {localStream ? (
                <div className="relative max-w-md mx-auto">
                  <VideoPreview
                    stream={localStream}
                    label={isAdmin ? 'Tu cámara (Admin)' : 'Tu cámara'}
                    isMuted={true}
                    className="w-full aspect-video rounded-xl border border-gray-700"
                  />
                  <button
                    onClick={() => setShowDeviceSelector(!showDeviceSelector)}
                    className="absolute bottom-4 right-4 bg-gray-900/80 hover:bg-gray-800 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors border border-gray-700"
                  >
                    🎥 Cambiar
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setShowDeviceSelector(!showDeviceSelector)}
                  className="max-w-md mx-auto aspect-video bg-gray-800 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors border-2 border-dashed border-gray-600"
                >
                  <div className="text-center">
                    <p className="text-gray-400 text-2xl mb-2">🎥</p>
                    <p className="text-gray-400 text-lg mb-2">Tu Cámara</p>
                    <p className="text-gray-500 text-sm">
                      {isLoading ? 'Iniciando...' : 'Haz clic para seleccionar dispositivos'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {showDeviceSelector && (
              <DeviceSelectorPanel
                devices={devices}
                selectedVideoId={selectedVideoId}
                selectedAudioId={selectedAudioId}
                onVideoChange={setSelectedVideo}
                onAudioChange={setSelectedAudio}
                onClose={() => setShowDeviceSelector(false)}
                className="mb-6 max-w-md mx-auto"
              />
            )}

            {/* Controls */}
            {!hasInitialized ? (
              <button
                onClick={handleInitialize}
                disabled={isLoading}
                className="px-10 py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl text-lg"
              >
                {isLoading ? '⏳ Iniciando...' : '📞 Iniciar Cámara y Micrófono'}
              </button>
            ) : (
              <div className="space-y-4 max-w-lg mx-auto">
                {/* Retry Button */}
                {hasError && (
                  <button
                    onClick={retryConnection}
                    className="w-full px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-all flex items-center justify-center gap-2"
                  >
                    🔄 Reintentar Conexión
                  </button>
                )}
                
                {/* Manual Connect (for debugging) */}
                {!isConnecting && !isConnected && (
                  <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <p className="text-gray-400 text-xs mb-2">Conexión manual (si falla la automática):</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ingresa Peer ID manualmente"
                        value={manualPeerId}
                        onChange={(e) => setManualPeerId(e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleManualConnect}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Conectar
                      </button>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleHangUp}
                  className="px-8 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all shadow-lg"
                >
                  ✕ Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Videochat Screen
        <div>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-4">
              {isAdmin ? '🎬 Videochat con Cliente' : '🎥 Videochat con Administrador'}
            </h1>
            <p className="text-gray-400">
              Sala: <span className="font-mono text-blue-400">{roomId}</span>
            </p>
          </div>

          {/* Success Status */}
          <div className="mb-6 p-5 bg-green-900/30 border border-green-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-green-400 text-2xl">✅</span>
              <span className="text-green-400 font-bold text-lg">Conectado exitosamente!</span>
            </div>
          </div>

          {/* Video Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div className="relative">
              {localStream && (
                <VideoPreview
                  stream={localStream}
                  label={isAdmin ? 'Tú (Admin)' : 'Tú'}
                  isMuted={true}
                  className="w-full aspect-video rounded-xl border border-gray-700"
                />
              )}
            </div>

            <div className="relative">
              {remoteStream && (
                <VideoPreview
                  key={remoteStream.id}
                  stream={remoteStream}
                  label={isAdmin ? 'Cliente' : 'Administrador'}
                  isMuted={false}
                  className="w-full aspect-video rounded-xl border border-gray-700"
                />
              )}
            </div>
          </div>

          {showDeviceSelector && (
            <DeviceSelectorPanel
              devices={devices}
              selectedVideoId={selectedVideoId}
              selectedAudioId={selectedAudioId}
              onVideoChange={setSelectedVideo}
              onAudioChange={setSelectedAudio}
              onClose={() => setShowDeviceSelector(false)}
              className="mb-6 max-w-lg mx-auto"
            />
          )}

          {mediaError && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-700/50 rounded-xl max-w-lg mx-auto">
              <p className="text-red-400 text-sm flex items-start gap-2">
                <span>⚠️</span>
                {mediaError}
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => setShowDeviceSelector(!showDeviceSelector)}
              className="px-8 py-4 bg-gray-700 text-white font-semibold rounded-xl hover:bg-gray-600 transition-all shadow-lg text-lg"
            >
              ⚙️ Dispositivos
            </button>
            <button
              onClick={handleHangUp}
              className="px-10 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg text-lg"
            >
              ✕ Terminar Videollamada
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
