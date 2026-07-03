'use client';
import { RoomSelector } from './components/RoomSelector';

export default function Home() {
  return (
    <div className="min-h-screen from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
     <RoomSelector/>
    </div>
  );
}
