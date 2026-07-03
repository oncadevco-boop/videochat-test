'use client';
import { useEffect, useRef } from 'react';

interface VideoPreviewProps {
  stream: MediaStream | null;
  label?: string;
  isMuted?: boolean;
  className?: string;
}

export function VideoPreview({
  stream,
  label = 'Tu vídeo',
  isMuted = true,
  className = '',
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
  }, [stream]);

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden shadow-lg ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-sm font-medium">
        {label}
      </div>
    </div>
  );
}
