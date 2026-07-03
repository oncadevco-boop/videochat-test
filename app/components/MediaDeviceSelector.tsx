'use client';
import { useMediaStream } from './useMediaStream';

interface MediaDeviceSelectorProps {
  onDevicesReady?: () => void;
  autoStart?: boolean;
}

export function MediaDeviceSelector({
  onDevicesReady,
  autoStart = false,
}: MediaDeviceSelectorProps) {
  const {
    devices,
    selectedVideoId,
    selectedAudioId,
    isLoading,
    error,
    setSelectedVideo,
    setSelectedAudio,
    startStream,
  } = useMediaStream();

  const handleVideoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVideo(e.target.value);
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAudio(e.target.value);
  };

  const handleStartStream = async () => {
    try {
      await startStream(selectedVideoId, selectedAudioId);
      onDevicesReady?.();
    } catch (err) {
      console.error('Error iniciando stream:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Seleccionar Dispositivos
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-semibold">Error:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Selector de Cámara */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Cámara
          </label>
          <select
            value={selectedVideoId}
            onChange={handleVideoChange}
            disabled={isLoading || devices.video.length === 0}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">
              {devices.video.length === 0 ? 'No hay cámaras disponibles' : 'Seleccionar cámara...'}
            </option>
            {devices.video.map((device) => (
              <option key={device.id} value={device.id}>
                {device.label || `Cámara ${device.id.slice(0, 5)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Micrófono */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Micrófono
          </label>
          <select
            value={selectedAudioId}
            onChange={handleAudioChange}
            disabled={isLoading || devices.audio.length === 0}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">
              {devices.audio.length === 0 ? 'No hay micrófonos disponibles' : 'Seleccionar micrófono...'}
            </option>
            {devices.audio.map((device) => (
              <option key={device.id} value={device.id}>
                {device.label || `Micrófono ${device.id.slice(0, 5)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Botón de Iniciar */}
        <button
          onClick={handleStartStream}
          disabled={
            isLoading ||
            !selectedVideoId ||
            !selectedAudioId ||
            devices.video.length === 0 ||
            devices.audio.length === 0
          }
          className="w-full mt-6 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Iniciando...' : 'Iniciar Dispositivos'}
        </button>
      </div>

      {/* Información de dispositivos */}
      <div className="mt-6 text-sm text-gray-600">
        <p>✓ Cámaras detectadas: {devices.video.length}</p>
        <p>✓ Micrófonos detectados: {devices.audio.length}</p>
      </div>
    </div>
  );
}
