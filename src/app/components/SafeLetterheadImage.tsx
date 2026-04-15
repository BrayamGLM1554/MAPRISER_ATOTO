import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface SafeLetterheadImageProps {
  imageUrl?: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: (error: string) => void;
  showErrorMessage?: boolean;
}

async function validateImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve(false);
    }, 8000);

    img.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };

    img.src = url;
  });
}

export const SafeLetterheadImage: React.FC<SafeLetterheadImageProps> = ({
  imageUrl,
  className = '',
  style = {},
  onError,
  showErrorMessage = false
}) => {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedValidation, setHasAttemptedValidation] = useState(false);

  useEffect(() => {
    // 🔥 SI NO HAY URL → NO RENDERIZAR NADA
    if (!imageUrl) {
      setCurrentUrl(null);
      setError(null);
      return;
    }

    // Cloudinary → confiar directo
    if (imageUrl.includes('cloudinary.com')) {
      if (imageUrl.toLowerCase().endsWith('.pdf')) {
        const errorMsg = 'La URL apunta a un PDF en lugar de una imagen';
        setError(errorMsg);
        setCurrentUrl(null);
        onError?.(errorMsg);
        return;
      }

      setCurrentUrl(imageUrl);
      setError(null);
      return;
    }

    // Validación opcional para otras URLs
    if (!hasAttemptedValidation) {
      setIsValidating(true);
      setHasAttemptedValidation(true);

      validateImageUrl(imageUrl)
        .then(isValid => {
          if (isValid) {
            setCurrentUrl(imageUrl);
            setError(null);
          } else {
            const errorMsg = 'URL de imagen no válida';
            setError(errorMsg);
            setCurrentUrl(null);
            onError?.(errorMsg);
          }
        })
        .catch(err => {
          const errorMsg = `Error al validar imagen`;
          setError(errorMsg);
          setCurrentUrl(null);
          onError?.(errorMsg);
        })
        .finally(() => {
          setIsValidating(false);
        });
    }
  }, [imageUrl, onError, hasAttemptedValidation]);

  const handleImageError = () => {
    const errorMsg = 'Error al cargar imagen';
    setError(errorMsg);
    setCurrentUrl(null);
    onError?.(errorMsg);
  };

  // 🔥 SI NO HAY IMAGEN → NO RENDERIZA NADA
  if (!currentUrl) return null;

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