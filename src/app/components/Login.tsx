import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { AlertCircle, FileText, Mail, Lock } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import AvisoPrivacidad from './AvisoPrivacidad';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const { login, user, aceptarAviso } = useAuth(); // ✅ traer user y aceptarAviso

  useEffect(() => {
    if (user && !user.avisoPrivacidadAceptado) {
      setMostrarAviso(true);
    }
  }, [user]);  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Credenciales incorrectas. Por favor, intente de nuevo.');
      }
    } catch (err) {
      setError('Error al iniciar sesión. Por favor, intente más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const avisoEsObligatorio = !!user && !user.avisoPrivacidadAceptado;


  // ELIMINAR usuarios estáticos de prueba

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4">
      <Card className="w-full max-w-5xl bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Panel Izquierdo - Branding */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-12 lg:p-16 flex flex-col justify-center text-white relative overflow-hidden">
            {/* Decoración */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-20 right-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-20 left-10 w-48 h-48 bg-[#FFD700] rounded-full blur-3xl"></div>
            </div>

            {/* Contenido */}
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">DOCS</h1>
                  <p className="text-white/70 text-sm">Sistema de Gestión Documental</p>
                </div>
              </div>

              <div className="space-y-5 mb-10">
                <h2 className="text-4xl font-bold leading-tight">
                  Gestión de<br />Documentos<br />Oficiales
                </h2>
                <p className="text-lg text-white/80 leading-relaxed">
                  Crea, edita y administra documentos institucionales de manera eficiente y profesional.
                </p>
              </div>

              <div className="pt-8 border-t border-white/20">
                <p className="text-sm text-white/70 mb-1">
                  H. Ayuntamiento de Atotonilco de Tula
                </p>
                <p className="text-xs text-white/50">
                  Gobierno del Estado de Hidalgo
                </p>
              </div>
            </div>
          </div>

          {/* Panel Derecho - Formulario */}
          <div className="p-12 lg:p-16 flex flex-col justify-center bg-white">
            <div className="w-full max-w-sm mx-auto">
              {/* Encabezado */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Iniciar Sesión
                </h3>
                <p className="text-sm text-gray-600">
                  Ingresa tus credenciales institucionales
                </p>
              </div>

              {/* Formulario */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Correo Electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 pl-10 text-sm border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Ingresa tu contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 pl-10 text-sm border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg text-sm"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Iniciando sesión...
                    </span>
                  ) : (
                    'Iniciar sesión'
                  )}
                </Button>
              </form>

              {/* Aviso de Privacidad */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setMostrarAviso(true)}
                  className="text-sm text-gray-600 hover:text-gray-800 underline transition-colors"
                >
                  Aviso de Privacidad
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {mostrarAviso && (
        <AvisoPrivacidad
          onClose={() => {
            // ✅ Si es obligatorio no puede cerrarse sin aceptar
            if (avisoEsObligatorio) return;
            setMostrarAviso(false);
          }}
          onAceptar={avisoEsObligatorio ? aceptarAviso : undefined}
        />
      )}
    </div>
  );
}