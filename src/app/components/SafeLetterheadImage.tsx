/**
 * Componente SafeLetterheadImage
 * Carga de forma segura imágenes de hojas membretadas desde Cloudinary
 * con validación, manejo de errores y fallback
 */

import React, { useState, useEffect } from 'react';
import membreteImage from 'figma:asset/f486ee75730424b368ebdf6b113e550e2c7acb26.png';
import { AlertCircle } from 'lucide-react';

interface SafeLetterheadImageProps {
  imageUrl?: string;
  fallbackUrl?: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: (error: string) => void;
  showErrorMessage?: boolean;
}

/**
 * Validar si una URL apunta a una imagen válida
 * Usa Image nativo para evitar problemas de CORS en HEAD/fetch
 */
async function validateImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      console.warn('⏱ Timeout al validar imagen, usando fallback:', url);
      resolve(false);
    }, 8000);

    img.onload = () => {
      clearTimeout(timeout);
      console.log('✅ URL válida (imagen cargada):', url);
      resolve(true);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      console.warn('⚠️ No se pudo cargar la imagen desde URL:', url);
      resolve(false);
    };

    img.src = url;
  });
}

/**
 * Componente que carga imágenes de hojas membretadas de forma segura
 */
export const SafeLetterheadImage: React.FC<SafeLetterheadImageProps> = ({
  imageUrl,
  fallbackUrl = membreteImage,
  className = '',
  style = {},
  onError,
  showErrorMessage = false
}) => {
  const [currentUrl, setCurrentUrl] = useState<string>(imageUrl || fallbackUrl);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedValidation, setHasAttemptedValidation] = useState(false);

  // Validar la URL cuando cambie
  useEffect(() => {
    if (!imageUrl) {
      setCurrentUrl(fallbackUrl);
      setError(null);
      return;
    }

    // Si es una URL de Cloudinary con previewUrl, confiar en ella
    // (el backend ya ha validado que es una imagen)
    if (imageUrl.includes('cloudinary.com')) {
      // Si la URL termina en .pdf, algo está mal
      if (imageUrl.toLowerCase().endsWith('.pdf')) {
        console.error('❌ URL apunta a un PDF, esto no debería pasar. Debe usarse previewUrl');
        const errorMsg = 'La URL apunta a un PDF en lugar de una imagen de preview';
        setError(errorMsg);
        setCurrentUrl(fallbackUrl);
        onError?.(errorMsg);
        return;
      }
      
      // Para URLs de Cloudinary, cargar directamente
      console.log('✅ Usando URL de Cloudinary:', imageUrl);
      setCurrentUrl(imageUrl);
      setError(null);
      return;
    }

    // Para URLs no-Cloudinary, validar antes de cargar
    if (!hasAttemptedValidation) {
      setIsValidating(true);
      setHasAttemptedValidation(true);
      
      validateImageUrl(imageUrl)
        .then(isValid => {
          if (isValid) {
            setCurrentUrl(imageUrl);
            setError(null);
          } else {
            const errorMsg = 'URL de imagen no válida o inaccesible';
            setError(errorMsg);
            setCurrentUrl(fallbackUrl);
            onError?.(errorMsg);
          }
        })
        .catch(err => {
          const errorMsg = `Error al validar imagen: ${err.message}`;
          console.error('❌', errorMsg);
          setError(errorMsg);
          setCurrentUrl(fallbackUrl);
          onError?.(errorMsg);
        })
        .finally(() => {
          setIsValidating(false);
        });
    }
  }, [imageUrl, fallbackUrl, onError, hasAttemptedValidation]);

  // Handler para errores de carga de <img>
  const handleImageError = (e: React.SyntheticEvent<HTMLDivElement>) => {
    console.error('❌ Error al cargar imagen de hoja membretada:', imageUrl);
    const errorMsg = 'Error al cargar imagen de hoja membretada';
    setError(errorMsg);
    setCurrentUrl(fallbackUrl);
    onError?.(errorMsg);
  };

  // Si está validando, mostrar un estado de carga suave
  if (isValidating) {
    return (
      <div
        className={className}
        style={{
          ...style,
          backgroundImage: `url(${fallbackUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.5,
          transition: 'opacity 0.3s ease',
        }}
      />
    );
  }

  return (
    <>
      <div
        className={className}
        onError={handleImageError}
        style={{
          ...style,
          backgroundImage: `url(${currentUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      {/* Mensaje de error opcional */}
      {error && showErrorMessage && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(220, 38, 38, 0.9)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </>
  );
};

export default SafeLetterheadImage;