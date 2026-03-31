/**
 * Utilidades para recuperación de errores en la aplicación
 */

/**
 * Limpia el estado corrupto del localStorage
 */
export function cleanupCorruptedState() {
  try {
    const keysToCheck = ['user', 'token', 'auth'];
    
    keysToCheck.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          // Intentar parsear para verificar que no esté corrupto
          JSON.parse(value);
        }
      } catch (error) {
        console.warn(`⚠️ Estado corrupto detectado en '${key}', limpiando...`);
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error al limpiar estado corrupto:', error);
  }
}

/**
 * Verifica la salud de la aplicación
 */
export function checkApplicationHealth(): boolean {
  try {
    // Verificar que localStorage esté disponible
    if (typeof localStorage === 'undefined') {
      console.error('❌ localStorage no disponible');
      return false;
    }

    // Verificar que window esté disponible
    if (typeof window === 'undefined') {
      console.error('❌ window no disponible');
      return false;
    }

    // Limpiar estado corrupto
    cleanupCorruptedState();

    return true;
  } catch (error) {
    console.error('❌ Error en health check:', error);
    return false;
  }
}

/**
 * Intenta recuperar la aplicación de un error crítico
 */
export function attemptRecovery(errorType: 'auth' | 'navigation' | 'render' | 'unknown' = 'unknown') {
  console.log(`🔧 Intentando recuperación de error tipo: ${errorType}`);

  try {
    switch (errorType) {
      case 'auth':
        // Limpiar datos de autenticación
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        break;

      case 'navigation':
        // Intentar volver al inicio
        window.history.pushState({}, '', '/');
        break;

      case 'render':
        // Limpiar estado de React (si es posible)
        cleanupCorruptedState();
        break;

      default:
        // Limpieza general
        cleanupCorruptedState();
        break;
    }

    console.log('✅ Recuperación completada');
    return true;
  } catch (error) {
    console.error('❌ Error en recuperación:', error);
    return false;
  }
}

/**
 * Maneja errores globales no capturados
 */
export function setupGlobalErrorHandlers() {
  // Manejar errores no capturados
  window.addEventListener('error', (event) => {
    console.error('❌ Error global no capturado:', event.error);
    
    // No interferir con el comportamiento normal de React
    // Solo registrar el error
  });

  // Manejar promesas rechazadas no capturadas
  window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promise rechazada no capturada:', event.reason);
    
    // No prevenir el comportamiento por defecto
    // Solo registrar el error
  });
}

/**
 * Inicializa las utilidades de recuperación de errores
 */
export function initErrorRecovery() {
  try {
    // Verificar salud de la aplicación
    const isHealthy = checkApplicationHealth();
    
    if (!isHealthy) {
      console.warn('⚠️ La aplicación no pasó el health check');
      attemptRecovery('unknown');
    }

    // Configurar manejadores globales
    setupGlobalErrorHandlers();

    console.log('✅ Sistema de recuperación de errores inicializado');
  } catch (error) {
    console.error('❌ Error al inicializar recuperación de errores:', error);
  }
}
