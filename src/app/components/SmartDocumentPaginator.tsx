import React, { useRef, useEffect, useState } from 'react';
import { SafeLetterheadImage } from './SafeLetterheadImage';
import membreteImage from 'figma:asset/f486ee75730424b368ebdf6b113e550e2c7acb26.png';
import { formatearTextoPlanoAHTML } from './UnifiedDocumentRenderer';

/**
 * Interfaz para hoja membretada
 */
export interface HojaMembretada {
  id: string;
  nombre: string;
  imagenUrl: string;
  areaId?: string;
}

/**
 * Props para el paginador inteligente
 */
interface SmartDocumentPaginatorProps {
  contenido: string;
  hojaMembretada?: HojaMembretada;
  zoom?: number;
  mostrarNumeroPagina?: boolean;
  className?: string;
}

/**
 * Dimensiones de página carta en píxeles (96 DPI)
 */
const PAGE_DIMENSIONS = {
  width: 816,
  height: 1056,
} as const;

/**
 * Márgenes del área de contenido
 */
const CONTENT_MARGINS = {
  top: 160,
  bottom: 100,
  left: 72,
  right: 72,
} as const;

/**
 * Altura disponible para contenido
 */
const CONTENT_HEIGHT = PAGE_DIMENSIONS.height - CONTENT_MARGINS.top - CONTENT_MARGINS.bottom;
const CONTENT_WIDTH = PAGE_DIMENSIONS.width - CONTENT_MARGINS.left - CONTENT_MARGINS.right;

/**
 * Detecta si un contenido es HTML
 */
function esContenidoHTML(contenido: string): boolean {
  return /<[a-z][\s\S]*>/i.test(contenido);
}

/**
 * Componente de paginación inteligente basada en altura real
 * 
 * Este componente renderiza el contenido en un contenedor invisible,
 * mide su altura, y lo divide en páginas que caben en hojas carta reales.
 */
export function SmartDocumentPaginator({
  contenido,
  hojaMembretada,
  zoom = 100,
  mostrarNumeroPagina = false,
  className = '',
}: SmartDocumentPaginatorProps) {
  const [paginas, setPaginas] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const medidorRef = useRef<HTMLDivElement>(null);

  const scale = zoom / 100;
  const scaledWidth = PAGE_DIMENSIONS.width * scale;
  const scaledHeight = PAGE_DIMENSIONS.height * scale;

  // Función para dividir contenido HTML en páginas basándose en altura real
  useEffect(() => {
    if (!contenido) {
      setPaginas(['']);
      setCargando(false);
      return;
    }

    // Convertir texto plano a HTML si es necesario
    const contenidoHTML = esContenidoHTML(contenido)
      ? contenido
      : formatearTextoPlanoAHTML(contenido, !!hojaMembretada);

    // Crear un elemento invisible para medir
    const medidor = document.createElement('div');
    medidor.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      width: ${CONTENT_WIDTH}px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.65;
      color: #000;
      visibility: hidden;
    `;
    medidor.innerHTML = contenidoHTML;
    document.body.appendChild(medidor);

    // Dividir por elementos HTML
    const elementos = Array.from(medidor.children) as HTMLElement[];
    const paginasResultado: string[] = [];
    let paginaActual = '';
    let alturaAcumulada = 0;

    for (let i = 0; i < elementos.length; i++) {
      const elemento = elementos[i];
      const elementoHTML = elemento.outerHTML;
      
      // Medir altura del elemento
      const contenedorTemp = document.createElement('div');
      contenedorTemp.style.cssText = medidor.style.cssText;
      contenedorTemp.innerHTML = elementoHTML;
      document.body.appendChild(contenedorTemp);
      const alturaElemento = contenedorTemp.offsetHeight;
      document.body.removeChild(contenedorTemp);

      // Si agregar este elemento excede la altura de la página
      if (alturaAcumulada + alturaElemento > CONTENT_HEIGHT && paginaActual) {
        // Guardar página actual y empezar nueva
        paginasResultado.push(paginaActual);
        paginaActual = elementoHTML;
        alturaAcumulada = alturaElemento;
      } else {
        // Agregar elemento a la página actual
        paginaActual += elementoHTML;
        alturaAcumulada += alturaElemento;
      }
    }

    // Agregar última página si tiene contenido
    if (paginaActual.trim()) {
      paginasResultado.push(paginaActual);
    }

    // Limpiar
    document.body.removeChild(medidor);

    // Si no se generaron páginas, usar contenido completo
    if (paginasResultado.length === 0) {
      paginasResultado.push(contenidoHTML);
    }

    setPaginas(paginasResultado);
    setCargando(false);
  }, [contenido, hojaMembretada]);

  if (cargando) {
    return (
      <div className={`flex items-center justify-center py-20 ${className}`}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-3 text-sm text-gray-500">Preparando documento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-6 ${className}`}>
      {paginas.map((contenidoPagina, index) => (
        <div
          key={index}
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <div
            className="bg-white shadow-lg"
            style={{
              width: `${PAGE_DIMENSIONS.width}px`,
              height: `${PAGE_DIMENSIONS.height}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            {/* Hoja membretada como fondo */}
            {hojaMembretada && (
              <SafeLetterheadImage
                imageUrl={hojaMembretada.imagenUrl}
                fallbackUrl={membreteImage}
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 0,
                  pointerEvents: 'none',
                }}
                onError={(error) =>
                  console.error('Error al cargar imagen de hoja membretada:', error)
                }
              />
            )}

            {/* Área de contenido */}
            <div
              style={{
                position: 'absolute',
                top: `${CONTENT_MARGINS.top}px`,
                left: `${CONTENT_MARGINS.left}px`,
                right: `${CONTENT_MARGINS.right}px`,
                bottom: `${CONTENT_MARGINS.bottom}px`,
                zIndex: 2,
                overflow: 'hidden',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '11px',
                lineHeight: '1.65',
                color: '#000',
              }}
            >
              <div
                className="text-[11px] leading-[1.65] text-gray-900"
                dangerouslySetInnerHTML={{ __html: contenidoPagina }}
              />
            </div>

            {/* Número de página */}
            {mostrarNumeroPagina && paginas.length > 1 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: `${CONTENT_MARGINS.bottom - 30}px`,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  fontSize: '9px',
                  color: '#666',
                  zIndex: 3,
                }}
              >
                Página {index + 1} de {paginas.length}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
