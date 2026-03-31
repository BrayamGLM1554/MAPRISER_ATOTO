import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DocumentProvider } from './contexts/DocumentContext';
import { AreaProvider } from './contexts/AreaContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Toaster } from './components/ui/sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { suppressConsoleErrorsInPreview } from './utils/environment';
import { initPreviewEnvironment } from './utils/initPreviewEnv';
import { initErrorRecovery } from './utils/errorRecovery';
import AvisoPrivacidad from './components/AvisoPrivacidad';
import CambiarPasswordInicial from './components/CambiarPasswordInicial';

// Inicializar protecciones del entorno Preview lo antes posible
if (typeof window !== 'undefined') {
  initPreviewEnvironment();
  // Inicializar sistema de recuperación de errores
  initErrorRecovery();
}

function AppContent() {
  const auth = useAuth();
  const { isAuthenticated, user, aceptarAviso, cambiarPasswordInicial  } = auth || {};

  // Suprimir errores de consola en Figma Preview
  useEffect(() => {
    suppressConsoleErrorsInPreview();
  }, []);

  // Verificar que auth esté disponible
  if (!auth) {
    console.log('⏳ Esperando inicialización de AuthProvider...');
    return null;
  }

  const avisosPendiente = isAuthenticated && user && !user.avisoPrivacidadAceptado;
  const passwordPendiente = isAuthenticated && user && user.avisoPrivacidadAceptado && user.primerIngreso;


  return (
    <>
      {isAuthenticated ? <Dashboard /> : <Login />}

      {avisosPendiente && (
        <AvisoPrivacidad
          onClose={() => {}}     // no-op: no se puede cerrar sin aceptar
          onAceptar={aceptarAviso}
        />
      )}

      {passwordPendiente && (
        <CambiarPasswordInicial
          nombreUsuario={user.nombre}
          onCambiar={cambiarPasswordInicial}
        />
      )}

      <Toaster position="top-right" richColors />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary showHomeButton>
      <AuthProvider>
        <ErrorBoundary 
          showHomeButton
          onReset={() => {
            // Limpiar localStorage y recargar
            console.log('🔄 Reiniciando aplicación...');
            localStorage.clear();
            window.location.reload();
          }}
        >
          <DocumentProvider>
            <AreaProvider>
              <AppContent />
            </AreaProvider>
          </DocumentProvider>
        </ErrorBoundary>
      </AuthProvider>
    </ErrorBoundary>
  );
}