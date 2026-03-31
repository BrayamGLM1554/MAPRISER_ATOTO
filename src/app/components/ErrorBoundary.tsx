import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  showHomeButton?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary - Componente que captura errores de React y muestra una UI de fallback
 * Evita que errores en componentes bloqueen toda la aplicación
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Actualizar el estado para que el siguiente renderizado muestre la UI de fallback
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Registrar el error en la consola para debugging
    console.error('❌ ErrorBoundary capturó un error:', error);
    console.error('📍 Stack trace:', errorInfo.componentStack);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    // Resetear el estado del error
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    // Llamar callback personalizado si existe
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    // Resetear y recargar la página
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Si se proporcionó un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de fallback por defecto
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full border-red-200 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Algo salió mal
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Ha ocurrido un error inesperado. No te preocupes, puedes intentar continuar.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Mensaje de error técnico (solo en desarrollo) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    Detalles técnicos (solo visible en desarrollo):
                  </p>
                  <p className="text-xs text-gray-700 font-mono break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                        Ver stack trace
                      </summary>
                      <pre className="text-xs text-gray-600 mt-2 overflow-auto max-h-40 p-2 bg-white rounded border border-gray-200">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Acciones */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={this.handleReset}
                  className="flex-1 bg-gray-800 hover:bg-gray-900"
                  size="lg"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Intentar de nuevo
                </Button>
                
                {this.props.showHomeButton && (
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Ir al inicio
                  </Button>
                )}
              </div>

              <p className="text-xs text-gray-500 text-center pt-2">
                Si el problema persiste, contacta al administrador del sistema
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * ErrorBoundary ligero para componentes específicos
 * Muestra un mensaje inline en lugar de una página completa
 */
export class InlineErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ InlineErrorBoundary capturó un error:', error);
    console.error('📍 Stack trace:', errorInfo.componentStack);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">
                Error al cargar este componente
              </h3>
              <p className="text-xs text-red-700 mt-1">
                Ha ocurrido un error. Intenta refrescar esta sección.
              </p>
              <Button
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                className="mt-3 h-8 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1.5" />
                Reintentar
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}