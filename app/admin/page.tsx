'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAllRooms,
  resetDatabase,
  verifyRoomPayment,
  getPaymentSettings,
  updatePaymentSettings,
  login,
  logout,
  isLoggedIn,
} from '../lib/api';

interface Payment {
  _id: string;
  amount: number;
  currency: string;
  status: string;
  transactionId: string;
  createdAt: string;
}

interface Room {
  _id: string;
  roomCode: string;
  userPeerId: string | null;
  adminPeerId: string | null;
  isActive: boolean;
  paymentVerified: boolean;
  paymentId: Payment;
  createdAt: string;
  expiresAt: string;
}

interface PaymentSettings {
  price: number;
  whatsappNumber: string;
  accountNumber: string;
}

export default function AdminPanel() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPeerIds, setShowPeerIds] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    price: 10,
    whatsappNumber: '1234567890',
    accountNumber: '0000 0000 0000 0000',
  });
  const [editingSettings, setEditingSettings] = useState<PaymentSettings>({
    price: 10,
    whatsappNumber: '1234567890',
    accountNumber: '0000 0000 0000 0000',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  // Login state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const data = await getAllRooms();
      setRooms(data.rooms);
    } catch (error) {
      console.error('Error loading rooms:', error);
      if ((error as Error).message === 'Unauthorized') {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentSettings = async () => {
    try {
      const data = await getPaymentSettings();
      setPaymentSettings(data.settings);
      setEditingSettings(data.settings);
    } catch (error) {
      console.error('Error loading payment settings:', error);
      if ((error as Error).message === 'Unauthorized') {
        setIsAuthenticated(false);
      }
    }
  };

  useEffect(() => {
    if (isLoggedIn()) {
      setIsAuthenticated(true);
      loadRooms();
      loadPaymentSettings();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await login(username, password);
      setIsAuthenticated(true);
      loadRooms();
      loadPaymentSettings();
    } catch (error) {
      setLoginError((error as Error).message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
  };

  const handleSavePaymentSettings = async () => {
    try {
      setSavingSettings(true);
      const data = await updatePaymentSettings(editingSettings);
      setPaymentSettings(data.settings);
      alert('✅ Configuración de pago actualizada.');
    } catch (error) {
      console.error('Error saving payment settings:', error);
      alert('Error al guardar configuración de pago.');
      if ((error as Error).message === 'Unauthorized') {
        setIsAuthenticated(false);
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResetDatabase = async () => {
    if (confirm('⚠️ ¿Estás seguro de que quieres borrar TODAS las salas y pagos?')) {
      try {
        await resetDatabase();
        alert('✅ Base de datos reiniciada exitosamente!');
        await loadRooms();
      } catch (error) {
        console.error('Error resetting database:', error);
        alert('Error al reiniciar la base de datos');
        if ((error as Error).message === 'Unauthorized') {
          setIsAuthenticated(false);
        }
      }
    }
  };

  const handleJoinRoom = (roomCode: string) => {
    router.push(`/videochat/${roomCode}?admin=true`);
  };

  const handleOpenPaymentModal = (room: Room) => {
    setSelectedRoom(room);
    setShowPaymentModal(true);
  };

  const handleTogglePaymentVerification = async () => {
    if (!selectedRoom) return;

    try {
      await verifyRoomPayment(selectedRoom.roomCode, !selectedRoom.paymentVerified);
      alert('✅ Estado de pago actualizado!');
      await loadRooms();
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Error updating payment verification:', error);
      alert('Error al actualizar el estado de pago');
      if ((error as Error).message === 'Unauthorized') {
        setIsAuthenticated(false);
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔐</div>
            <h1 className="text-3xl font-bold text-gray-800">Panel de Administración</h1>
            <p className="text-gray-600 mt-2">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin123"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {isLoggingIn ? '⏳ Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              ← Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {showPaymentModal && selectedRoom && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Gestión de Pago</h2>
              <p className="text-gray-600">
                Sala: <span className="font-mono font-bold text-blue-600">{selectedRoom.roomCode}</span>
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600">Monto:</span>
                <span className="font-bold text-gray-800">
                  ${selectedRoom.paymentId.amount} {selectedRoom.paymentId.currency}
                </span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600">Transacción:</span>
                <span className="font-mono text-sm text-gray-800">
                  {selectedRoom.paymentId.transactionId.slice(0, 16)}...
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Estado actual:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedRoom.paymentVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {selectedRoom.paymentVerified ? '✅ Verificado' : '⏳ Pendiente'}
                </span>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleTogglePaymentVerification}
                className={`px-6 py-2 font-semibold rounded-lg transition-colors ${
                  selectedRoom.paymentVerified ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {selectedRoom.paymentVerified ? 'Marcar como Pendiente' : 'Marcar como Verificado'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🎬 Panel de Administración</h1>
            <p className="text-gray-600 mt-2">Gestiona las salas y la configuración de pago</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleResetDatabase}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2"
            >
              🧹 Reiniciar BD
            </button>
            <button
              onClick={() => setShowPeerIds(!showPeerIds)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center gap-2"
            >
              {showPeerIds ? '🙈 Ocultar' : '👁️ Mostrar'} Peer IDs
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
            >
              🚪 Cerrar sesión
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              ← Volver al inicio
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Salas creadas</h2>
              <p className="text-sm text-gray-500 mt-1">Mira el estado de cada pago y la actividad de la sala.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={loadRooms}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center gap-2"
              >
                🔄 {loading ? 'Actualizando...' : 'Actualizar'}
              </button>
              <button
                onClick={handleResetDatabase}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2"
              >
                🧹 Reiniciar BD
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Configuración de pago</h3>
            <div className="grid gap-4 xl:grid-cols-3">
              <label className="space-y-2 text-sm text-gray-700">
                <span>Precio</span>
                <input
                  type="number"
                  value={editingSettings.price}
                  onChange={(e) => setEditingSettings((prev) => ({ ...prev, price: Number(e.target.value) }))}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>WhatsApp</span>
                <input
                  type="text"
                  value={editingSettings.whatsappNumber}
                  onChange={(e) => setEditingSettings((prev) => ({ ...prev, whatsappNumber: e.target.value }))}
                  placeholder="5215512345678"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>Número de cuenta</span>
                <input
                  type="text"
                  value={editingSettings.accountNumber}
                  onChange={(e) => setEditingSettings((prev) => ({ ...prev, accountNumber: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 items-center">
              <button
                onClick={handleSavePaymentSettings}
                disabled={savingSettings}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {savingSettings ? 'Guardando...' : 'Guardar configuración'}
              </button>
              <span className="text-sm text-gray-500">Estos datos se muestran cuando el usuario crea una sala.</span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">⏳ Cargando salas...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No hay salas creadas aún</p>
              <p className="text-gray-400 text-sm mt-2">Primero un usuario debe crear una sala</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Código de sala</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Estado de sala</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Estado de pago</th>
                    {showPeerIds && (
                      <>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Peer ID Usuario</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Peer ID Admin</th>
                      </>
                    )}
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => (
                    <tr key={room._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-mono font-bold text-blue-600 text-lg">{room.roomCode}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          room.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {room.isActive ? '🟢 Activa' : '⚪ Inactiva'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          room.paymentVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {room.paymentVerified ? '✅ Verificado' : '⏳ Pendiente'}
                        </span>
                      </td>
                      {showPeerIds && (
                        <>
                          <td className="py-4 px-4">
                            {room.userPeerId ? (
                              <span className="font-mono text-xs text-green-700 bg-green-50 px-2 py-1 rounded">✅ {room.userPeerId.slice(0, 12)}...</span>
                            ) : (
                              <span className="text-yellow-600 text-xs bg-yellow-50 px-2 py-1 rounded">⏳ Esperando usuario...</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {room.adminPeerId ? (
                              <span className="font-mono text-xs text-green-700 bg-green-50 px-2 py-1 rounded">✅ {room.adminPeerId.slice(0, 12)}...</span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600">
                          {new Date(room.createdAt).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => handleJoinRoom(room.roomCode)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2"
                          >
                            🎬 {room.isActive ? 'Reunirse' : 'Ingresar'}
                          </button>
                          <button
                            onClick={() => handleOpenPaymentModal(room)}
                            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center gap-2"
                          >
                            💳 Gestionar pago
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
