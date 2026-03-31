import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle } from 'lucide-react';

interface Props {
  nombreUsuario: string;
  onCambiar: (nuevaPassword: string) => Promise<void>;
}

export default function CambiarPasswordInicial({ nombreUsuario, onCambiar }: Props) {
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await onCambiar(password);
    } catch (err: any) {
      setError(err.message || 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-2xl">
        {/* Ícono */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Encabezado */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Establece tu contraseña
          </h2>
          <p className="text-sm text-gray-500">
            Bienvenido, <span className="font-medium text-gray-700">{nombreUsuario}</span>.
            Por seguridad, elige una contraseña personal antes de continuar.
          </p>
        </div>

        {/* Alerta de error */}
        {error && (
          <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Campos */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nueva-password" className="text-sm font-medium text-gray-700">
              Nueva contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="nueva-password"
                type={mostrarPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pl-10 pr-10 text-sm border-gray-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {mostrarPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmar-password" className="text-sm font-medium text-gray-700">
              Confirmar contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="confirmar-password"
                type={mostrarPassword ? 'text' : 'password'}
                placeholder="Repite tu contraseña"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                className="h-11 pl-10 text-sm border-gray-300 rounded-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>
        </div>

        {/* Indicador de fortaleza simple */}
        {password.length > 0 && (
          <div className="mt-3">
            <div className="flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i < Math.min(Math.floor(password.length / 3), 4)
                      ? password.length >= 10 ? 'bg-green-500'
                        : password.length >= 6 ? 'bg-yellow-400'
                        : 'bg-red-400'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {password.length < 6 ? 'Muy corta'
                : password.length < 10 ? 'Aceptable'
                : 'Segura'}
            </p>
          </div>
        )}

        {/* Botón */}
        <Button
          onClick={handleSubmit}
          disabled={loading || !password || !confirmacion}
          className="w-full h-11 mt-6 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg text-sm"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Guardando...
            </span>
          ) : 'Guardar contraseña y continuar'}
        </Button>

        <p className="text-xs text-center text-gray-400 mt-4">
          Esta acción solo se realiza una vez al momento de tu registro.
        </p>
      </Card>
    </div>
  );
}