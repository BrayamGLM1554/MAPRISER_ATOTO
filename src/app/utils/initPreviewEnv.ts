/**
 * Inicializa el entorno para Figma Make Preview
 * Debe llamarse lo antes posible en la aplicación
 */

import { isFigmaPreview } from './environment';

/**
 * Suprime errores de ResizeObserver que son comunes en Preview
 */
export function suppressResizeObserverErrors(): void {
  if (typeof window === 'undefined') return;

  const errorHandler = (event: ErrorEvent) => {
    // Suprimir errores de ResizeObserver loop limit exceeded
    if (
      event.message?.includes('ResizeObserver loop') ||
      event.message?.includes('ResizeObserver loop limit exceeded')
    ) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return true;
    }
    return false;
  };

  const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
    const reason = event.reason?.toString() || '';
    
    // Suprimir errores de red conocidos en Figma Preview
    const ignoredErrors = [
      'Failed to fetch',
      'Network request failed',
      'NetworkError',
      '/api/folders',
      '/api/integrations',
      'livegraph',
    ];

    const shouldSuppress = isFigmaPreview() && ignoredErrors.some(pattern => 
      reason.includes(pattern)
    );

    if (shouldSuppress) {
      event.preventDefault();
      return true;
    }
    return false;
  };

  try {
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);
  } catch (error) {
    console.warn('Unable to set up error handlers:', error);
  }
}

/**
 * Inicializa todas las protecciones para Figma Preview
 */
export function initPreviewEnvironment(): void {
  suppressResizeObserverErrors();
  
  // Log de diagnóstico solo en desarrollo (no en Figma Preview)
  if (!isFigmaPreview() && process.env.NODE_ENV === 'development') {
    console.log('[Dev] Running in development mode');
  }
}
