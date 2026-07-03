'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { simulatePayment } from '../lib/api';

export function RoomSelector() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [createMode, setCreateMode] = useState<'landing' | 'join'>('landing');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleCreateRoom = async () => {
    setIsProcessingPayment(true);

    try {
      const data = await simulatePayment();
      setPaymentData(data);
      setRoomId(data.room.roomCode);
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Payment error:', error);
      alert('Error al crear la sala. Intenta de nuevo.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/videochat/${roomId.trim()}`);
    }
  };

  const handleCloseModal = () => {
    setShowPaymentModal(false);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 text-white flex items-center justify-center p-4">
      <div className="max-w-[1500px] w-full grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Videochat</p>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
              Crea tu sala y comparte el código con quien quieras.
            </h1>
            <p className="max-w-xl text-lg text-slate-300/90">
              Paga una sola vez, espera la verificación del administrador y conecta en un videochat P2P sin complicaciones.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={handleCreateRoom}
              disabled={isProcessingPayment}
              className="rounded-3xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-semibold px-8 py-5 shadow-2xl shadow-cyan-500/20 transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessingPayment ? 'Creando sala...' : 'Crear sala'}
            </button>
            <button
              onClick={() => setCreateMode('join')}
              className="rounded-3xl border border-slate-700 bg-slate-900/70 px-8 py-5 text-slate-100 font-semibold shadow-xl shadow-black/20 transition hover:border-slate-500 hover:-translate-y-1"
            >
              Ingresar código de sala
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-center">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Pago</p>
              <p className="mt-3 text-3xl font-semibold text-cyan-300">Solo al crear sala</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-center">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Código</p>
              <p className="mt-3 text-3xl font-semibold text-cyan-300">Compartible</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-center">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Administración</p>
              <p className="mt-3 text-3xl font-semibold text-cyan-300">Pago verificado</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/5 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl">
          {createMode === 'landing' ? (
            <div className="space-y-6">
              <p className="text-slate-300">
                Si ya tienes un código, ingrésalo para unirte a la sala rápidamente.
              </p>
              <button
                onClick={() => setCreateMode('join')}
                className="w-full rounded-3xl bg-slate-800 px-6 py-4 text-white font-semibold transition hover:bg-slate-700"
              >
                Ingresar código
              </button>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
                <p className="text-slate-400 text-sm uppercase tracking-[0.2em] mb-3">¿Qué sucede al crear sala?</p>
                <ul className="space-y-3 text-slate-300">
                  <li>• Se genera un código único.</li>
                  <li>• Se muestra un modal con el precio, WhatsApp y número de cuenta.</li>
                  <li>• El admin debe verificar el pago antes de que la sala sea usable.</li>
                </ul>
              </div>
            </div>
          ) : (
            <form onSubmit={handleJoinRoom} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Unirse a sala</p>
                    <h2 className="text-3xl font-bold text-white">Ingresa el código</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateMode('landing')}
                    className="text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>

                <label className="block text-sm font-semibold text-slate-300">Código de sala</label>
                <input
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  placeholder="ABC123DEF"
                  className="w-full rounded-3xl border border-slate-700 bg-slate-950/80 px-5 py-4 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <button
                type="submit"
                disabled={!roomId.trim()}
                className="w-full rounded-3xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-4 text-slate-950 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                Ir a la sala
              </button>
            </form>
          )}
        </div>
      </div>

      {showPaymentModal && paymentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-xl w-full rounded-[2rem] bg-slate-950/95 border border-cyan-500/20 p-8 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Pago pendiente</p>
                <h2 className="mt-3 text-4xl font-extrabold">Completa tu pago</h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-slate-900 p-6 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">Precio de la sala</p>
                  <p className="mt-2 text-4xl font-semibold text-cyan-300">${paymentData.settings.price}.00</p>
                </div>
                <div className="rounded-3xl bg-slate-950 px-4 py-3 text-right">
                  <p className="text-slate-500 text-xs uppercase tracking-[0.2em]">Código</p>
                  <p className="mt-2 text-xl font-semibold text-white">{paymentData.room.roomCode}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-sm text-slate-400">Número de cuenta</p>
                  <p className="mt-3 text-lg font-semibold text-white break-all">{paymentData.settings.accountNumber}</p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-sm text-slate-400">WhatsApp para pago</p>
                  <button
                    onClick={() => {
                      console.log('WhatsApp URL:', paymentData.settings.whatsappUrl);
                      window.open(paymentData.settings.whatsappUrl, '_blank');
                    }}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-3xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    Abrir WhatsApp
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(paymentData.room.roomCode);
                    alert('Código copiado al portapapeles');
                  }}
                  className="rounded-3xl border border-slate-700 bg-white/5 px-5 py-4 text-left text-slate-100 transition hover:border-cyan-300"
                >
                  <p className="text-sm text-slate-400">Código de la sala</p>
                  <p className="mt-2 text-lg font-semibold text-white">{paymentData.room.roomCode}</p>
                </button>

                <div className="rounded-3xl border border-slate-700 bg-slate-900/80 px-5 py-4 text-left text-slate-100">
                  <p className="text-sm text-slate-400">Estado</p>
                  <p className="mt-2 text-lg font-semibold text-amber-300">Pago pendiente</p>
                  <p className="mt-3 text-sm text-slate-400 leading-6">
                    El administrador revisará tu pago y, una vez confirmado, la sala estará lista para conectarte.
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-500">
                Mientras tanto, puedes copiar el código y compartirlo con tu interlocutor.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
