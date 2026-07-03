'use client';
import { useParams, useSearchParams } from 'next/navigation';
import { VideoChatRoom } from '@/app/components/VideoChatRoom';

export default function VideoChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const isAdmin = searchParams.get('admin') === 'true';
  
  console.log('🎯 VideoChatPage loaded:', { params, roomId, isAdmin });
  
  if (!roomId) {
    return (
      <div className="min-h-screen bg-red-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">❌ Error</h1>
          <p className="text-xl">No se encontró el código de sala</p>
          <p className="mt-4">Params recibidos: {JSON.stringify(params)}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <VideoChatRoom roomId={roomId} isAdmin={isAdmin} />
    </div>
  );
}
