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

// Inicializar protecciones del entorno Preview lo antes posible
if (typeof window !== 'undefined') {
  initPreviewEnvironment();
  // Inicializar sistema de recuperación de errores
  initErrorRecovery();
}

function AppContent() {
  const auth = useAuth();
  const { isAuthenticated } = auth || {};

  // Suprimir errores de consola en Figma Preview
  useEffect(() => {
    suppressConsoleErrorsInPreview();
  }, []);

  // Verificar que auth esté disponible
  if (!auth) {
    console.log('⏳ Esperando inicialización de AuthProvider...');
    return null;
  }

  return (
    <>
      {isAuthenticated ? <Dashboard /> : <Login />}
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