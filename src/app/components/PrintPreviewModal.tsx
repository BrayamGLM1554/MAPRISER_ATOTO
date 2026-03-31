import React, { useEffect, useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { HojaMembretada } from '../contexts/DocumentContext';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  contenido: string;
  nombreDocumento: string;
  area?: string;
  hojaMembreteada?: HojaMembretada;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATEADOR — idéntico a GeneradorDocumento para consistencia total
// ─────────────────────────────────────────────────────────────────────────────
function formatearTextoPlanoAHTML(texto: string, omitirFirma = false): string {
  const lineas = texto.split('\n');
  const bloques: string[] = [];
  let i = 0;

  const esMeta        = (l: string) => /^(DEPENDENCIA|ASUNTO|N[°ºo]?\s*DE\s*OFICIO|SECRETAR[IÍ]A\s+GENERAL|DIRECCI[OÓ]N|SUBDIRECCI[OÓ]N|DEPARTAMENTO|[A-ZÁÉÍÓÚÜÑ\s]+:\s+.+)/i.test(l.trim());
  const esFecha       = (l: string) => /^[A-ZÁÉÍÓÚÜÑ\s,]+,?\s*(HGO\.?|HIDALGO\.?)?\s*A\s+\d{1,2}\s+DE\s+[A-ZÁÉÍÓÚÜÑ]+\s+DEL?\s+\d{4}/i.test(l.trim());
  const esSaludo      = (l: string) => /^(A\s+QUIEN\s+CORRESPONDA|PRESENTE|ESTIMADO|ATENCI[OÓ]N|SE[ÑN]OR|LICENCIADO|INGENIERO)/i.test(l.trim());
  const esAtentamente = (l: string) => /^ATENTAMENTE\.?$/i.test(l.trim());
  const esFirmaLinea  = (l: string) => /^(LIC\.|ING\.|DR\.|MTRO\.|C\.|ARQ\.|PROF\.)\s+[A-ZÁÉÍÓÚÜÑ]/.test(l.trim()) || /^[A-ZÁÉÍÓÚÜÑ\s]{10,}$/.test(l.trim());
  const esVacio       = (l: string) => l.trim() === '';

  while (i < lineas.length) {
    const linea = lineas[i];
    const lineaTrim = linea.trim();

    if (esVacio(linea)) { i++; continue; }

    if (esMeta(linea) && !esFecha(linea) && !esSaludo(linea)) {
      const metaLineas: string[] = [];
      while (i < lineas.length && !esVacio(lineas[i]) && esMeta(lineas[i]) && !esFecha(lineas[i])) {
        metaLineas.push(`<span style="display:block;font-size:10px;font-weight:600;line-height:1.5;">${lineas[i].trim()}</span>`);
        i++;
      }
      bloques.push(`<div style="text-align:right;margin-bottom:18px;">${metaLineas.join('')}</div>`);
      continue;
    }

    if (esFecha(linea)) {
      bloques.push(`<p style="text-align:center;font-weight:700;font-size:11px;margin:16px 0 18px;">${lineaTrim}</p>`);
      i++; continue;
    }

    if (esSaludo(linea)) {
      bloques.push(`<p style="font-weight:700;font-size:11px;margin:14px 0 4px;">${lineaTrim}</p>`);
      i++; continue;
    }

    if (esAtentamente(linea)) {
      if (omitirFirma) {
        i++;
        while (i < lineas.length) {
          const l = lineas[i];
          if (esVacio(l)) { i++; continue; }
          if (esFirmaLinea(l)) { i++; }
          else { break; }
        }
      } else {
        const firmaLineas: string[] = [`<p style="text-align:center;font-weight:700;font-size:11px;margin:32px 0 2px;">ATENTAMENTE</p>`];
        i++;
        while (i < lineas.length) {
          const l = lineas[i];
          if (esVacio(l)) { i++; continue; }
          if (esFirmaLinea(l)) {
            firmaLineas.push(`<p style="text-align:center;font-weight:700;font-size:11px;margin:2px 0;">${l.trim()}</p>`);
            i++;
          } else { break; }
        }
        bloques.push(`<div style="margin-top:40px;">${firmaLineas.join('')}</div>`);
      }
      continue;
    }

    const parrafoLineas: string[] = [];
    while (
      i < lineas.length &&
      !esVacio(lineas[i]) &&
      !esFecha(lineas[i]) &&
      !esSaludo(lineas[i]) &&
      !esAtentamente(lineas[i])
    ) {
      parrafoLineas.push(lineas[i].trim());
      i++;
    }
    if (parrafoLineas.length > 0) {
      bloques.push(`<p style="text-align:justify;font-size:11px;line-height:1.65;margin:0 0 14px;">${parrafoLineas.join(' ')}</p>`);
    }
  }

  return bloques.join('\n');
}

function esContenidoHTML(contenido: string): boolean {
  return /<[a-z][\s\S]*>/i.test(contenido);
}

/**
 * Divide el contenido en páginas usando el separador <page> que
 * produce procesarRespuestaGroq y que también usa MultiPageDocument.
 * Retorna siempre al menos una página.
 */
function dividirEnPaginas(contenido: string): string[] {
  // Separar por <page> (con o sin atributos, case-insensitive)
  const paginas = contenido
    .split(/<page[^>]*>/gi)
    .map(p => p.trim())
    .filter(Boolean);
  return paginas.length > 0 ? paginas : [contenido];
}

export function PrintPreviewModal({
  isOpen,
  onClose,
  contenido,
  nombreDocumento,
  area,
  hojaMembreteada,
}: PrintPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const usarHojaMembretada = !!hojaMembreteada;

  // Márgenes idénticos a GeneradorDocumento (px → mm, base carta 816px = 216mm)
  const pxToMM = (px: number) => Math.round(px * 216 / 816);
  const mTop    = pxToMM(130); // ~34mm
  const mRight  = pxToMM(80);  // ~21mm
  const mBottom = pxToMM(170); // ~45mm
  const mLeft   = pxToMM(70);  // ~18mm

  const fondoMembrete = usarHojaMembretada
    ? `background-image: url('${hojaMembreteada!.imagenUrl}');
       background-size: cover;
       background-position: center;
       background-repeat: no-repeat;`
    : '';

  // ── Dividir en páginas y generar HTML de cada una ────────────────────────
  const paginas = dividirEnPaginas(contenido);

  const paginasHTML = paginas.map((paginaContenido) => {
    const htmlContenidoPagina = esContenidoHTML(paginaContenido)
      ? paginaContenido
      : formatearTextoPlanoAHTML(paginaContenido, usarHojaMembretada);
    return `
      <div class="pagina">
        <div class="contenido">${htmlContenidoPagina}</div>
      </div>`;
  }).join('\n');

  const htmlDocumento = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>${nombreDocumento}</title>
      <style>
        @page { size: letter; margin: 0; }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        html, body {
          margin: 0; padding: 0;
          font-family: Arial, sans-serif;
          font-size: 11px;
          line-height: 1.65;
          color: #111;
          background: #e8e8e8;
        }
        .pagina {
          width: 216mm;
          min-height: 279mm;
          margin: 16px auto;
          position: relative;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          page-break-after: always;
          ${fondoMembrete}
        }
        .pagina:last-child { page-break-after: auto; margin-bottom: 16px; }
        .contenido {
          position: relative;
          padding: ${mTop}mm ${mRight}mm ${mBottom}mm ${mLeft}mm;
          min-height: 279mm;
          z-index: 1;
        }
        p { margin: 0 0 14px; }
        @media print {
          body { background: white; }
          .pagina { margin: 0; box-shadow: none; }
        }
      </style>
    </head>
    <body>
      ${paginasHTML}
    </body>
    </html>
  `;

  const handlePrint = () => {
    if (!iframeRef.current?.contentWindow) {
      console.error('[PrintPreviewModal] iframe no disponible');
      return;
    }
    try {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } catch (e) {
      console.error('[PrintPreviewModal] Error al imprimir:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-xl shadow-xl max-w-[900px] w-[95vw] h-[95vh] md:h-[90vh] flex flex-col overflow-hidden z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Vista previa para impresión</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {nombreDocumento}
              {hojaMembreteada && (
                <span className="ml-2 text-gray-600 font-medium">· {hojaMembreteada.nombre}</span>
              )}
              {paginas.length > 1 && (
                <span className="ml-2 text-gray-400">· {paginas.length} páginas</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Vista previa en iframe */}
        <div className="flex-1 overflow-hidden">
          <iframe
            srcDoc={htmlDocumento}
            title="Vista previa del documento"
            className="w-full h-full border-none"
            style={{ background: '#e8e8e8' }}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-gray-50 flex justify-end gap-2.5 shrink-0">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 h-9 px-4 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 h-9 px-4 transition-colors"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Iframe oculto exclusivo para print() */}
      <iframe
        ref={iframeRef}
        srcDoc={htmlDocumento}
        title="Documento para imprimir"
        aria-hidden="true"
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', border: 'none' }}
      />
    </div>
  );
}