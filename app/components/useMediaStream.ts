'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

interface Device {
  id: string;
  label: string;
  kind: 'videoinput' | 'audioinput';
}

interface MediaStreamState {
  devices: { video: Device[]; audio: Device[] };
  selectedVideoId: string;
  selectedAudioId: string;
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
}

export function useMediaStream() {
  const streamRef = useRef<MediaStream | null>(null);
  const selectedDevicesRef = useRef({ video: '', audio: '' });
  const [state, setState] = useState<MediaStreamState>({
    devices: { video: [], audio: [] },
    selectedVideoId: '',
    selectedAudioId: '',
    stream: null,
    isLoading: false,
    error: null,
  });

  // Función para enumerar dispositivos
  const enumerateDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      console.log('enumerateDevices ->', allDevices);
      const videoDevices: Device[] = allDevices
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({ id: d.deviceId, label: d.label, kind: d.kind as Device['kind'] }));
      
      const audioDevices: Device[] = allDevices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({ id: d.deviceId, label: d.label, kind: d.kind as Device['kind'] }));

      setState((prev) => ({
        ...prev,
        devices: { video: videoDevices, audio: audioDevices },
        selectedVideoId: prev.selectedVideoId || videoDevices[0]?.id || '',
        selectedAudioId: prev.selectedAudioId || audioDevices[0]?.id || '',
      }));
    } catch (err) {
      console.error('Error enumerando dispositivos:', err);
    }
  }, []);

  // Listar dispositivos al montar (sin permisos iniciales)
  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);

  // Escuchar cambios en dispositivos
  useEffect(() => {
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
    };
  }, [enumerateDevices]);

  // Actualizar flujo solo cuando el usuario cambia dispositivo (no al iniciar)
  useEffect(() => {
    if (!state.stream) {
      selectedDevicesRef.current = {
        video: state.selectedVideoId,
        audio: state.selectedAudioId,
      };
      return;
    }

    const videoChanged = selectedDevicesRef.current.video !== state.selectedVideoId;
    const audioChanged = selectedDevicesRef.current.audio !== state.selectedAudioId;

    if (!videoChanged && !audioChanged) return;

    selectedDevicesRef.current = {
      video: state.selectedVideoId,
      audio: state.selectedAudioId,
    };

    updateStream(state.selectedVideoId, state.selectedAudioId);
  }, [state.selectedVideoId, state.selectedAudioId, state.stream]);

  async function startStream(videoId: string, audioId: string) {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: videoId ? { deviceId: { exact: videoId } } : true,
        audio: audioId ? { deviceId: { exact: audioId } } : true,
      };

      let newStream: MediaStream;

      try {
        console.log('getUserMedia constraints:', constraints);
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (innerError) {
        // Some browsers throw DOMException-like objects that may not pass `instanceof Error` across realms.
        // Detect by the `name` property and accept several variants to trigger the fallback.
        const name = innerError && typeof innerError === 'object' && 'name' in innerError ? (innerError as any).name : '';
        const overconstrained = ['OverconstrainedError', 'NotFoundError', 'NotReadableError', 'DevicesNotFoundError'].includes(name as string);

        console.warn('getUserMedia failed with', innerError, '-> overconstrained?', overconstrained);

        if (overconstrained) {
          try {
            console.log('Attempting fallback getUserMedia with generic constraints');
            newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            console.log('Fallback getUserMedia succeeded');
          } catch (fallbackErr) {
            console.error('Fallback getUserMedia also failed', fallbackErr);
            throw fallbackErr;
          }
        } else {
          throw innerError;
        }
      }

      streamRef.current = newStream;
      selectedDevicesRef.current = { video: videoId, audio: audioId };
      setState((prev) => ({
        ...prev,
        stream: newStream,
        isLoading: false,
      }));

      // Volver a enumerar dispositivos para obtener los labels (ahora que tenemos permisos)
      await enumerateDevices();

      return newStream;
    } catch (err) {
      // Map DOMException-like errors to friendlier messages
      const name = err && typeof err === 'object' && 'name' in err ? (err as any).name : '';
      let friendly = 'Error al iniciar stream';
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
        friendly = 'No se encontró ningún dispositivo de cámara/micrófono disponible. Revisa permisos del navegador, la privacidad del sistema o cierra otras aplicaciones que usen la cámara.';
      } else if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
        friendly = 'Permisos denegados. Permite el acceso a la cámara y micrófono en el navegador para este sitio.';
      } else if (err instanceof Error) {
        friendly = err.message;
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: friendly,
      }));

      // Throw a wrapped error so callers still receive original info
      const e = err instanceof Error ? err : new Error(String(err));
      throw e;
    }
  }

  async function updateStream(videoId: string, audioId: string) {
    try {
      setState((prev) => ({ ...prev, error: null }));

      let newStream: MediaStream;

      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: videoId ? { deviceId: { exact: videoId } } : true,
          audio: audioId ? { deviceId: { exact: audioId } } : true,
        });
      } catch (innerError) {
        const name = innerError && typeof innerError === 'object' && 'name' in innerError ? (innerError as any).name : '';
        const overconstrained = ['OverconstrainedError', 'NotFoundError', 'NotReadableError', 'DevicesNotFoundError'].includes(name as string);
        console.warn('updateStream getUserMedia failed with', innerError, '-> overconstrained?', overconstrained);
        if (overconstrained) {
          newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } else {
          throw innerError;
        }
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      streamRef.current = newStream;
      setState((prev) => ({
        ...prev,
        stream: newStream,
      }));

      return newStream;
      } catch (err) {
        const name = err && typeof err === 'object' && 'name' in err ? (err as any).name : '';
        let friendly = 'Error al actualizar stream';
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
          friendly = 'No se encontró el dispositivo seleccionado. Intenta seleccionar otro dispositivo o revisa permisos.';
        } else if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
          friendly = 'Permisos denegados para cámara/micrófono.';
        } else if (err instanceof Error) {
          friendly = err.message;
        }

        setState((prev) => ({ ...prev, error: friendly }));
        throw err instanceof Error ? err : new Error(String(err));
      }
  }

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setState((prev) => ({
        ...prev,
        stream: null,
      }));
    }
  }

  function setSelectedVideo(videoId: string) {
    setState((prev) => ({ ...prev, selectedVideoId: videoId }));
  }

  function setSelectedAudio(audioId: string) {
    setState((prev) => ({ ...prev, selectedAudioId: audioId }));
  }

  return {
    ...state,
    startStream,
    stopStream,
    setSelectedVideo,
    setSelectedAudio,
    enumerateDevices,
  };
}
