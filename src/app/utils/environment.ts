/**
 * Detecta si la aplicación está corriendo en Figma Make Preview
 */
export const isFigmaPreview = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const origin = window.location.origin;
    const hostname = window.location.hostname;
    
    return (
      origin.includes('figma.com') ||
      origin.includes('figma.site') ||
      hostname.includes('figma.com') ||
      hostname.includes('figma.site')
    );
  } catch (error) {
    // Si hay error al acceder a window.location, asumir que no es Figma Preview
    return false;
  }
};

/**
 * Wrapper seguro para llamadas de red
 * En Figma Preview, retorna fallback inmediatamente
 */
export async function safeFetch<T>(
  url: string,
  options?: RequestInit,
  fallback?: T
): Promise<T | null> {
  if (isFigmaPreview()) {
    return fallback || null;
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`Fetch failed for ${url}, using fallback:`, error);
    return fallback || null;
  }
}

/**
 * Ejecuta código solo si NO estamos en Figma Preview
 */
export function skipInFigmaPreview(fn: () => void): void {
  if (!isFigmaPreview()) {
    try {
      fn();
    } catch (error) {
      console.warn('Function execution failed:', error);
    }
  }
}

/**
 * Suprime errores de consola en Figma Preview
 */
export function suppressConsoleErrorsInPreview(): void {
  if (isFigmaPreview()) {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args: any[]) => {
      // Filtrar errores conocidos de Figma Preview
      const message = args[0]?.toString() || '';
      
      const ignoredErrors = [
        'ResizeObserver loop',
        'Failed to fetch',
        'Network request failed',
        '/api/folders',
        '/api/integrations',
        'livegraph',
        'figma.com/api',
      ];

      const shouldIgnore = ignoredErrors.some(pattern => 
        message.includes(pattern)
      );

      if (!shouldIgnore) {
        originalError.apply(console, args);
      }
    };

    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      
      const ignoredWarnings = [
        'ResizeObserver loop',
        'Failed to fetch',
      ];

      const shouldIgnore = ignoredWarnings.some(pattern => 
        message.includes(pattern)
      );

      if (!shouldIgnore) {
        originalWarn.apply(console, args);
      }
    };
  }
}
