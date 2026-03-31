import React, { useRef, useEffect, useState } from 'react';
import { SafeLetterheadImage } from './SafeLetterheadImage';
import membreteImage from '../../assets/68376b3a9d85d6f4511d93a98d6c2d209148e62e.png';

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
 * Props para el renderizador de documentos
 */
interface UnifiedDocumentRendererProps {
  contenido: string;
  hojaMembretada?: HojaMembretada;
  zoom?: number;
  mostrarNumeroPagina?: boolean;
  className?: string;
}

/**
 * Dimensiones de página carta en píxeles (96 DPI)
 * Estándar: 8.5" x 11" = 794px x 1123px a 94 DPI
 */
const PAGE_DIMENSIONS = {
  width: 794,   // 8.5 pulgadas
  height: 1123, // 11 pulgadas
} as const;

/**
 * Márgenes del área de contenido dentro del membrete (en px)
 * Ajustados para que el texto caiga dentro del área imprimible:
 * - top: 160px → debajo del encabezado (logo + título institucional)
 * - bottom: 100px → encima del pie de página
 * - left/right: 72px → márgenes laterales estándar
 */
const CONTENT_MARGINS = {
  top: 160,
  bottom: 100,
  left: 72,
  right: 72,
} as const;

// Altura disponible para contenido por página
const CONTENT_HEIGHT = PAGE_DIMENSIONS.height - CONTENT_MARGINS.top - CONTENT_MARGINS.bottom; // 796px

/**
 * Convierte texto plano estructurado a HTML formateado
 * 
 * Reglas de formateo:
 * - Líneas en MAYÚSCULAS → Encabezados (centrados, bold)
 * - Saltos de línea dobles → Nuevos párrafos
 * - ATENTAMENTE + líneas siguientes → Bloque de firma (centrado)
 * - Metadatos (DEPENDENCIA, ASUNTO, etc.) → Alineados a la derecha
 * - Fechas → Centradas y en negritas
 * - Texto normal → Párrafos justificados
 * 
 * @param texto - Texto plano estructurado
 * @param omitirFirma - Si true, omite el bloque de firma (útil cuando el membrete ya la incluye)
 * @returns HTML formateado
 */
export function formatearTextoPlanoAHTML(texto: string, omitirFirma = false): string {
  const lineas = texto.split('\n');
  const bloques: string[] = [];
  let i = 0;

  // Detectores de patrones
  const esMeta = (l: string) =>
    /^(DEPENDENCIA|ASUNTO|N[°ºo]?\s*DE\s*OFICIO|SECRETAR[IÍ]A\s+GENERAL|DIRECCI[OÓ]N|SUBDIRECCI[OÓ]N|DEPARTAMENTO|[A-ZÁÉÍÓÚÜÑ\s]+:\s+.+)/i.test(
      l.trim()
    );

  const esFecha = (l: string) =>
    /^[A-ZÁÉÍÓÚÜÑ\s,]+,?\s*(HGO\.?|HIDALGO\.?)?\s*A\s+\d{1,2}\s+DE\s+[A-ZÁÉÍÓÚÜÑ]+\s+DEL?\s+\d{4}/i.test(
      l.trim()
    );

  const esSaludo = (l: string) =>
    /^(A\s+QUIEN\s+CORRESPONDA|PRESENTE|ESTIMADO|ATENCI[OÓ]N|SE[ÑN]OR|LICENCIADO|INGENIERO)/i.test(
      l.trim()
    );

  const esAtentamente = (l: string) => /^ATENTAMENTE\.?$/i.test(l.trim());

  const esFirmaLinea = (l: string) =>
    /^(LIC\.|ING\.|DR\.|MTRO\.|C\.|ARQ\.|PROF\.)\s+[A-ZÁÉÍÓÚÜÑ]/.test(l.trim()) ||
    /^[A-ZÁÉÍÓÚÜÑ\s]{10,}$/.test(l.trim());

  const esVacio = (l: string) => l.trim() === '';

  const esEncabezadoMayusculas = (l: string) => {
    const trim = l.trim();
    // Encabezado: línea completa en mayúsculas con al menos 3 caracteres
    return (
      trim.length >= 3 &&
      trim === trim.toUpperCase() &&
      /^[A-ZÁÉÍÓÚÜÑ0-9\s\(\)]+$/.test(trim)
    );
  };

  while (i < lineas.length) {
    const linea = lineas[i];
    const lineaTrim = linea.trim();

    // Preservar líneas vacías como espacios entre bloques (equivalente a un salto de línea)
    if (esVacio(linea)) {
      // Agregar un espacio vertical para separar bloques
      bloques.push('<div style="height:11px;"></div>');
      i++;
      continue;
    }

    // Metadatos (DEPENDENCIA, ASUNTO, etc.) → Alineados a la derecha
    if (esMeta(linea) && !esFecha(linea) && !esSaludo(linea)) {
      const metaLineas: string[] = [];
      while (
        i < lineas.length &&
        !esVacio(lineas[i]) &&
        esMeta(lineas[i]) &&
        !esFecha(lineas[i])
      ) {
        metaLineas.push(
          `<span style="display:block;font-size:10px;font-weight:600;line-height:1.5;">${lineas[i].trim()}</span>`
        );
        i++;
      }
      bloques.push(
        `<div style="text-align:right;margin-bottom:18px;">${metaLineas.join('')}</div>`
      );
      continue;
    }

    // Fechas → Centradas y en negritas
    if (esFecha(linea)) {
      bloques.push(
        `<p style="text-align:center;font-weight:700;font-size:11px;margin:16px 0 18px;">${lineaTrim}</p>`
      );
      i++;
      continue;
    }

    // Saludos → Negritas
    if (esSaludo(linea)) {
      bloques.push(
        `<p style="font-weight:700;font-size:11px;margin:14px 0 4px;">${lineaTrim}</p>`
      );
      i++;
      continue;
    }

    // Encabezados en MAYÚSCULAS → Negritas (sin centrar automáticamente)
    if (esEncabezadoMayusculas(linea)) {
      bloques.push(
        `<p style="font-weight:700;font-size:12px;margin:18px 0 12px;letter-spacing:0.5px;">${lineaTrim}</p>`
      );
      i++;
      continue;
    }

    // ATENTAMENTE + firma
    if (esAtentamente(linea)) {
      if (omitirFirma) {
        // Saltar todo el bloque de firma
        i++;
        while (i < lineas.length) {
          const l = lineas[i];
          if (esVacio(l)) {
            i++;
            continue;
          }
          if (esFirmaLinea(l)) {
            i++;
          } else {
            break;
          }
        }
      } else {
        // Renderizar bloque de firma
        const firmaLineas: string[] = [
          `<p style="text-align:center;font-weight:700;font-size:11px;margin:32px 0 2px;">ATENTAMENTE</p>`,
        ];
        i++;
        while (i < lineas.length) {
          const l = lineas[i];
          if (esVacio(l)) {
            i++;
            continue;
          }
          if (esFirmaLinea(l)) {
            firmaLineas.push(
              `<p style="text-align:center;font-weight:700;font-size:11px;margin:2px 0;">${l.trim()}</p>`
            );
            i++;
          } else {
            break;
          }
        }
        bloques.push(`<div style="margin-top:40px;">${firmaLineas.join('')}</div>`);
      }
      continue;
    }

    // Párrafos normales → Justificados
    // Cada línea se preserva como un párrafo individual para mantener la estructura original
    if (!esVacio(linea) &&
        !esFecha(linea) &&
        !esSaludo(linea) &&
        !esAtentamente(linea) &&
        !esEncabezadoMayusculas(linea) &&
        !esMeta(linea)) {
      bloques.push(
        `<p style="text-align:justify;font-size:11px;line-height:1.65;margin:0 0 4px;">${lineaTrim}</p>`
      );
      i++;
    } else {
      // Si no coincide con ningún patrón, avanzar para evitar bucle infinito
      i++;
    }
  }

  return bloques.join('\n');
}

/**
 * Detecta si un contenido es HTML o texto plano
 */
function esContenidoHTML(contenido: string): boolean {
  return /<[a-z][\s\S]*>/i.test(contenido);
}

/**
 * Componente de renderizado unificado de documentos
 * 
 * Renderiza un documento con:
 * - Hoja membretada institucional de fondo
 * - Formato consistente de texto estructurado
 * - Paginación automática
 * - Márgenes y estilos institucionales
 * 
 * Este componente se usa tanto en la vista de creación como en la de edición
 * para garantizar renderizado 100% consistente.
 */
export function UnifiedDocumentRenderer({
  contenido,
  hojaMembretada,
  zoom = 100,
  mostrarNumeroPagina = false,
  className = '',
}: UnifiedDocumentRendererProps) {
  const [paginas, setPaginas] = React.useState<string[]>([]);
  const contenidoHTMLRef = useRef<string>('');

  // Calcular escala para el zoom
  const scale = zoom / 100;
  const scaledWidth = PAGE_DIMENSIONS.width * scale;
  const scaledHeight = PAGE_DIMENSIONS.height * scale;

  // Dividir contenido en páginas
  useEffect(() => {
    let limpiado = false;
    const elementosTemporales: HTMLElement[] = [];

    const limpiarElementos = () => {
      if (limpiado) return;
      limpiado = true;
      elementosTemporales.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
      elementosTemporales.length = 0;
    };

    try {
      if (!contenido) {
        setPaginas(['']);
        return;
      }

      // Convertir texto plano a HTML si es necesario
      const contenidoHTML = esContenidoHTML(contenido)
        ? contenido
        : formatearTextoPlanoAHTML(contenido, !!hojaMembretada);
      
      contenidoHTMLRef.current = contenidoHTML;

      // Crear un elemento temporal para renderizar y medir el contenido
      const contenedorTemporal = document.createElement('div');
      contenedorTemporal.style.cssText = `
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: ${PAGE_DIMENSIONS.width - CONTENT_MARGINS.left - CONTENT_MARGINS.right}px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11px;
        line-height: 1.65;
        visibility: hidden;
      `;
      contenedorTemporal.innerHTML = contenidoHTML;
      document.body.appendChild(contenedorTemporal);
      elementosTemporales.push(contenedorTemporal);

      // Obtener todos los elementos hijo
      const elementos = Array.from(contenedorTemporal.children) as HTMLElement[];
      
      if (elementos.length === 0) {
        // Si no hay elementos hijos, tratar todo como una página
        limpiarElementos();
        setPaginas([contenidoHTML]);
        return;
      }

      // Dividir elementos en páginas basándose en altura
      const paginasResultado: string[] = [];
      let paginaActual = '';
      let alturaAcumulada = 0;

      for (const elemento of elementos) {
        // Crear contenedor temporal para medir este elemento específico
        const medidor = document.createElement('div');
        medidor.style.cssText = contenedorTemporal.style.cssText;
        medidor.appendChild(elemento.cloneNode(true));
        document.body.appendChild(medidor);
        elementosTemporales.push(medidor);
        
        const alturaElemento = medidor.offsetHeight;

        // Si agregar este elemento excede la altura disponible
        if (alturaAcumulada + alturaElemento > CONTENT_HEIGHT && paginaActual) {
          // Guardar página actual
          paginasResultado.push(paginaActual);
          // Empezar nueva página con este elemento
          paginaActual = elemento.outerHTML;
          alturaAcumulada = alturaElemento;
        } else {
          // Agregar a página actual
          paginaActual += elemento.outerHTML;
          alturaAcumulada += alturaElemento;
        }
      }

      // Agregar última página
      if (paginaActual.trim()) {
        paginasResultado.push(paginaActual);
      }

      // Limpiar elementos temporales
      limpiarElementos();

      // Asegurar que siempre hay al menos una página
      setPaginas(paginasResultado.length > 0 ? paginasResultado : [contenidoHTML]);
    } catch (error) {
      console.error('Error al procesar contenido del documento:', error);
      limpiarElementos();
      setPaginas([contenido]);
    }

    // Función de limpieza para cuando el componente se desmonte
    return () => {
      limpiarElementos();
    };
  }, [contenido, hojaMembretada]);

  // Renderizar contenido de una página
  const renderizarContenido = (contenidoPagina: string) => {
    if (esContenidoHTML(contenidoPagina)) {
      return (
        <div
          className="text-[11px] leading-[1.65] text-gray-900"
          dangerouslySetInnerHTML={{ __html: contenidoPagina }}
        />
      );
    }

    // Convertir texto plano a HTML formateado
    const htmlFormateado = formatearTextoPlanoAHTML(contenidoPagina, !!hojaMembretada);
    return (
      <div
        className="text-[11px] leading-[1.65] text-gray-900"
        dangerouslySetInnerHTML={{ __html: htmlFormateado }}
      />
    );
  };

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
              {renderizarContenido(contenidoPagina)}
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