import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDocuments } from '../contexts/DocumentContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Toggle } from './ui/toggle';
import { ArrowLeft, Save, Download, Printer, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo2, Redo2, Palette, Type, Eye, CheckCircle, Trash2, Wand2, FileText, Check, Info, Sparkles, Send, Upload, Plus, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Textarea } from './ui/textarea';
import { PrintPreviewModal } from './PrintPreviewModal';
import { Separator } from './ui/separator';
import membreteImage from 'figma:asset/f486ee75730424b368ebdf6b113e550e2c7acb26.png';
import { AREAS_SISTEMA, obtenerAreasDisponibles } from '../constants/areas';
import { createMachote, normalizePlaceholders, extractVariablesFromSquareBrackets, getHojasMembreteadasArea, subirHojaMembretada, HojaMembretadaAPI } from '../services/api';
import { SafeLetterheadImage } from './SafeLetterheadImage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';

interface CrearDocumentoNuevoProps {
  onVolver: () => void;
}

interface HojaMembretada {
  id: string;
  nombre: string;
  imagenUrl: string;
  areaId?: string;
}

const membretadasPorArea: Record<string, HojaMembretada[]> = {
  'Recursos Humanos': [
    { id: 'rh-1', nombre: 'RH - Oficial', imagenUrl: membreteImage },
    { id: 'rh-2', nombre: 'RH - Alterna', imagenUrl: membreteImage },
  ],
  'Secretaría': [
    { id: 'sec-1', nombre: 'Secretaría - Oficial', imagenUrl: membreteImage },
  ],
  'Tesorería': [
    { id: 'tes-1', nombre: 'Tesorería - Oficial', imagenUrl: membreteImage },
  ],
  'Obras Públicas':   [{ id: 'op-1',   nombre: 'Obras - Oficial',      imagenUrl: membreteImage }],
  'Desarrollo Social':[{ id: 'ds-1',   nombre: 'Desarrollo - Oficial', imagenUrl: membreteImage }],
  'Seguridad Pública':[{ id: 'sp-1',   nombre: 'Seguridad - Oficial',  imagenUrl: membreteImage }],
  'Catastro':         [{ id: 'cat-1',  nombre: 'Catastro - Oficial',   imagenUrl: membreteImage }],
  'Servicios Públicos':[{ id: 'serv-1',nombre: 'Servicios - Oficial',  imagenUrl: membreteImage }],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Markdown inline → HTML
// ─────────────────────────────────────────────────────────────────────────────
const procesarMarkdown = (texto: string): string => {
  let procesado = texto.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  procesado = procesado.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return procesado;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Texto plano / Markdown de Groq → HTML institucional
// Cambios respecto al original:
//   ✅ Limpia "---" (HR Markdown) — ya no aparece como texto
//   ✅ Reconoce encabezados MAYÚSCULAS con paréntesis (ej: CUERPO (CONTINUA))
//   ✅ Omite líneas de firma cuando omitirFirma=true (el membrete ya las trae)
//   ✅ Maneja ATENTAMENTE con espaciado variable
// ─────────────────────────────────────────────────────────────────────────────
const convertirTextoAHTML = (texto: string, omitirFirma = false): string => {
  const lineas = texto.split('\n');
  let html = '';

  const esFirmaLinea = (l: string) =>
    /^(LIC\.|ING\.|DR\.|MTRO\.|C\.|ARQ\.|PROF\.)\s+[A-ZÁÉÍÓÚÜÑ]/i.test(l.trim()) ||
    (/^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ\s]{9,}$/.test(l.trim()) && l.trim().split(' ').length >= 2);

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const lineaTrim = linea.trim();

    // Línea vacía
    // Líneas vacías: colapsar múltiples vacías consecutivas en un solo espacio mínimo
    if (lineaTrim === '') {
      // Solo añadir espacio si la línea anterior no era vacía (evitar múltiples <br>)
      if (!html.endsWith('<!-- br -->')) {
        html += '<!-- br -->';
      }
      continue;
    }

    // ── Separadores Markdown "---" / "***" / "___" → descartar silenciosamente ──
    if (/^[-*_]{3,}$/.test(lineaTrim)) {
      continue;
    }

    // ── Encabezados Markdown "## Título" → extraer solo el texto, sin el ## ──
    if (/^#{1,6}\s+/.test(lineaTrim)) {
      const textoEncabezado = lineaTrim.replace(/^#{1,6}\s+/, '').trim();
      const formateado = procesarMarkdown(textoEncabezado);
      html += `<p style="font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:12pt;margin:6pt 0 2pt 0;">${formateado}</p>`;
      continue;
    }

    // Aplicar Markdown inline
    const lineaFormateada = procesarMarkdown(lineaTrim);

    // ── Encabezado institucional ──
    if (lineaTrim.includes('H. AYUNTAMIENTO') || lineaTrim.includes('AYUNTAMIENTO')) {
      html += `<p style="font-family:Arial,Helvetica,sans-serif;text-align:center;font-weight:bold;font-size:12pt;margin:3pt 0;">${lineaFormateada}</p>`;
      continue;
    }

    if (lineaTrim.includes('GOBIERNO DEL ESTADO') || lineaTrim.includes('ESTADO DE')) {
      html += `<p style="font-family:Arial,Helvetica,sans-serif;text-align:center;font-size:12pt;margin:2pt 0;">${lineaFormateada}</p>`;
      continue;
    }

    // ── Tipo de documento centrado (OFICIO, SOLICITUD, etc.) ──
    if (
      /^(OFICIO|SOLICITUD|CONSTANCIA|MEMORÁNDUM|MEMORANDUM|DICTAMEN|INFORME)\b/i.test(lineaTrim) &&
      lineaTrim === lineaTrim.toUpperCase()
    ) {
      html += `<p style="font-family:Arial,Helvetica,sans-serif;text-align:center;font-weight:bold;font-size:12pt;margin:6pt 0;">${lineaFormateada}</p>`;
      continue;
    }

    // ── Encabezados de sección en MAYÚSCULAS (ASUNTO, CUERPO, CUERPO (CONTINUA), LUGAR Y FECHA…) ──
    // Línea corta, totalmente en mayúsculas, sin placeholders
    if (
      lineaTrim === lineaTrim.toUpperCase() &&
      lineaTrim.length >= 3 &&
      lineaTrim.length < 60 &&
      /^[A-ZÁÉÍÓÚÜÑ]/.test(lineaTrim) &&
      !lineaTrim.includes('{{') &&
      !lineaTrim.includes('[') &&
      !/^[-*_]{3,}$/.test(lineaTrim)
    ) {
      html += `<p style="font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:12pt;margin:6pt 0 1pt 0;">${lineaFormateada}</p>`;
      continue;
    }

    // ── ATENTAMENTE (con o sin espacios entre letras) ──
    if (/^A[\s]*T[\s]*E[\s]*N[\s]*T[\s]*A[\s]*M[\s]*E[\s]*N[\s]*T[\s]*E\.?$/.test(lineaTrim)) {
      html += `<p style="font-family:Arial,Helvetica,sans-serif;text-align:center!important;font-weight:bold;font-size:12pt;margin:16pt 0 4pt 0;display:block;">${lineaFormateada}</p>`;
      continue;
    }

    // ── Firma — omitir si el membrete ya la trae ──
    if (esFirmaLinea(lineaTrim)) {
      if (omitirFirma) continue;
      html += `<p style="font-family:Arial,Helvetica,sans-serif;text-align:center;font-weight:bold;font-size:12pt;margin:2pt 0;">${lineaFormateada}</p>`;
      continue;
    }

    // ── PRESENTE / A QUIEN CORRESPONDA ──
    if (lineaTrim.includes('P R E S E N T E') || /^A\s+QUIEN\s+CORRESPONDA/i.test(lineaTrim)) {
      html += `<p style="font-family:Arial,Helvetica,sans-serif;font-size:12pt;margin:2pt 0 6pt 0;">${lineaFormateada}</p>`;
      continue;
    }

    // ── C. / C.c.p. ──
    if (lineaTrim.startsWith('C. ') || lineaTrim.startsWith('C.c.p.')) {
      html += `<p style="font-family:Arial,Helvetica,sans-serif;font-size:12pt;margin:1pt 0;">${lineaFormateada}</p>`;
      continue;
    }

    // ── Listas ──
    if (lineaTrim.startsWith('•') || lineaTrim.startsWith('-') || lineaTrim.startsWith('*')) {
      html += `<p style="font-family:Arial,Helvetica,sans-serif;font-size:12pt;text-align:justify;margin-left:20pt;margin-top:1pt;margin-bottom:1pt;">${lineaFormateada}</p>`;
      continue;
    }

    // ── Línea de separación con guiones bajos ──
    if (/^_{5,}/.test(lineaTrim)) {
      html += `<p style="font-family:Arial,Helvetica,sans-serif;text-align:center;margin:24pt 0 4pt 0;">${lineaFormateada}</p>`;
      continue;
    }

    // ── Párrafo normal ──
    html += `<p style="font-family:Arial,Helvetica,sans-serif;font-size:12pt;text-align:justify;margin:0 0 3pt 0;line-height:1.4;">${lineaFormateada}</p>`;
  }

    // Convertir marcadores de línea vacía en espaciado mínimo entre bloques
  return html.replace(/<!-- br -->/g, '');
};

// ─────────────────────────────────────────────────────────────────────────────
// procesarRespuestaGroq — compatible con DocumentRenderer (usa div.page-break)
// Cambios respecto al original:
//   ✅ Limpia separadores "---" antes de convertir
//   ✅ Pasa omitirFirma=true (el membrete ya trae firma y sello)
// ─────────────────────────────────────────────────────────────────────────────
const procesarRespuestaGroq = (data: any): string => {
  console.log('📥 Procesando respuesta de Groq:', data);

  const limpiarMarkdown = (texto: string): string =>
    texto
      .split('\n')
      .filter(l => !/^[-*_]{3,}$/.test(l.trim()))
      .join('\n')
      .trim();

  // Caso 1: array de páginas
  if (data.pages && Array.isArray(data.pages)) {
    console.log(`✅ Formato con páginas detectado (${data.pages.length} páginas)`);

    return data.pages
      .map((pagina: string, index: number) => {
        const limpia      = limpiarMarkdown(pagina);
        const normalizada = normalizePlaceholders(limpia);
        // omitirFirma=true: el membrete visual ya incluye firma y sello
        const paginaHTML  = convertirTextoAHTML(normalizada, true);

        return index < data.pages.length - 1
          ? paginaHTML + '<div class="page-break" style="page-break-after:always;margin:24pt 0;"></div>'
          : paginaHTML;
      })
      .join('\n');
  }

  // Caso 2: texto simple
  if (data.text) {
    console.log('✅ Formato con texto simple detectado');
    const limpio      = limpiarMarkdown(data.text);
    const normalizado = normalizePlaceholders(limpio);
    return convertirTextoAHTML(normalizado, true);
  }

  console.warn('⚠️ Formato de respuesta no reconocido:', data);
  throw new Error('La respuesta no contiene ni "text" ni "pages"');
};

// ─────────────────────────────────────────────────────────────────────────────
// extraerTextoPlano — sin cambios
// ─────────────────────────────────────────────────────────────────────────────
const extraerTextoPlano = (html: string): string => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
};

// ─────────────────────────────────────────────────────────────────────────────
// DocumentPage — sin cambios
// ─────────────────────────────────────────────────────────────────────────────
interface DocumentPageProps {
  contenidoHTML: string;
  pageNumber: number;
  pageIndex?: number;
  isEditable?: boolean;
  onContentChange?: () => void;
  onPageChange?: (html: string) => void;
  onRegisterRef?: (index: number, el: HTMLDivElement | null) => void;
  onFocusPage?: (el: HTMLDivElement) => void;
  onSelectionChange?: () => void;
  documentRef?: React.RefObject<HTMLDivElement>;
  showPrint?: boolean;
  pageRef?: React.RefObject<HTMLDivElement>;
  hojaMembretada?: HojaMembretada;
}

// Márgenes del área de contenido dentro del membrete (en px, sobre 794×1123px = carta a 96dpi)
// Ajustados para que el texto caiga dentro del área imprimible del membrete:
//   top: 160px  → debajo del encabezado (logo + título)
//   bottom: 100px → encima del pie de página (dirección, tel)
//   left/right: 72px → márgenes laterales estándar (~19mm)
const MARGIN = { top: 160, bottom: 100, left: 72, right: 72 } as const;

// Altura real disponible para contenido por página
const CONTENT_HEIGHT = 1123 - MARGIN.top - MARGIN.bottom; // 863px

const DocumentPage = ({
  contenidoHTML,
  pageNumber,
  pageIndex = 0,
  isEditable = false,
  onContentChange,
  onPageChange,
  onRegisterRef,
  onFocusPage,
  onSelectionChange,
  documentRef,
  showPrint = false,
  pageRef,
  hojaMembretada,
}: DocumentPageProps) => {
  const localRef = useRef<HTMLDivElement>(null);
  const refToUse = documentRef ?? localRef;
  const isFocused = useRef(false);

  // Stack de undo/redo por página
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const lastSavedHTML = useRef<string>('');

  // Registrar este ref en el map del padre para permitir actualizaciones DOM directas
  useEffect(() => {
    if (isEditable && onRegisterRef) {
      onRegisterRef(pageIndex, refToUse.current);
      return () => onRegisterRef(pageIndex, null);
    }
  }, [pageIndex, isEditable]);

  useEffect(() => {
    if (isEditable && refToUse.current && contenidoHTML !== undefined && !isFocused.current) {
      if (refToUse.current.innerHTML !== contenidoHTML) {
        refToUse.current.innerHTML = contenidoHTML;
        // Inicializar el estado base del undo stack con el contenido cargado
        lastSavedHTML.current = contenidoHTML;
        undoStack.current = [];
        redoStack.current = [];
      }
    }
  }, [contenidoHTML]);

  const checkAndNotify = () => {
    if (!refToUse.current) return;
    const html = refToUse.current.innerHTML;
    // Guardar en undo stack si el contenido cambió
    if (html !== lastSavedHTML.current) {
      undoStack.current.push(lastSavedHTML.current);
      if (undoStack.current.length > 100) undoStack.current.shift(); // límite
      redoStack.current = []; // limpiar redo al hacer cambio nuevo
      lastSavedHTML.current = html;
    }
    if (onPageChange) onPageChange(html);
    else if (onContentChange) onContentChange();
  };

  const handleInput = () => checkAndNotify();

  const handleUndo = () => {
    if (!refToUse.current || undoStack.current.length === 0) return;
    const prev = undoStack.current.pop()!;
    redoStack.current.push(lastSavedHTML.current);
    lastSavedHTML.current = prev;
    refToUse.current.innerHTML = prev;
    if (onPageChange) onPageChange(prev);
    // Mover cursor al final
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(refToUse.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const handleRedo = () => {
    if (!refToUse.current || redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push(lastSavedHTML.current);
    lastSavedHTML.current = next;
    refToUse.current.innerHTML = next;
    if (onPageChange) onPageChange(next);
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(refToUse.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const contentStyle: React.CSSProperties = {
    position: 'absolute',
    top:    `${MARGIN.top}px`,
    left:   `${MARGIN.left}px`,
    right:  `${MARGIN.right}px`,
    bottom: `${MARGIN.bottom}px`,
    zIndex: 2,
    background: 'transparent',
    // overflow: hidden para modo lectura — el texto ya viene pre-dividido
    // overflow: hidden también para modo editable porque handlePageChange
    // mueve el exceso a la página siguiente antes de que se vea el desbordamiento
    overflow: 'hidden',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '12pt',
    lineHeight: '1.4',
    color: '#000',
    // No poner textAlign aquí — cada <p> tiene su propio text-align inline
    wordBreak: 'break-word',
  };

  return (
    <div
      ref={pageRef}
      id="page-to-export"
      className="document-page"
      style={{
        width: '794px',
        height: '1123px',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        boxShadow: showPrint ? 'none' : '0 2px 16px rgba(0,0,0,0.18)',
        borderRadius: showPrint ? '0' : '3px',
        marginBottom: showPrint ? '0' : '28px',
        pageBreakAfter: 'always',
        pageBreakInside: 'avoid',
        flexShrink: 0,
      }}
    >
      {/* Membrete como fondo absoluto */}
      <SafeLetterheadImage
        imageUrl={hojaMembretada?.imagenUrl}
        fallbackUrl={membreteImage}
        className="membrete-layer"
        style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}
        onError={(error) => console.error('Error al cargar imagen de hoja membretada:', error)}
      />

      {/* Área de contenido */}
      {isEditable ? (
        <div
          ref={refToUse}
          contentEditable={true}
          onInput={handleInput}
          onKeyDown={(e) => {
            const ctrl = e.ctrlKey || e.metaKey;

            // Ctrl+Z — Undo
            if (ctrl && e.key === 'z' && !e.shiftKey) {
              e.preventDefault();
              handleUndo();
              return;
            }

            // Ctrl+Y / Ctrl+Shift+Z — Redo
            if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
              e.preventDefault();
              handleRedo();
              return;
            }

            // Ctrl+A — Seleccionar todo el contenido de ESTA página solamente
            if (ctrl && e.key === 'a') {
              e.preventDefault();
              if (refToUse.current) {
                const sel = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(refToUse.current);
                sel?.removeAllRanges();
                sel?.addRange(range);
              }
              return;
            }

            // Ctrl+C, Ctrl+X, Ctrl+V — el browser los maneja nativamente en contentEditable
            // Solo nos aseguramos de que Ctrl+V dispare checkAndNotify después de pegar
            if (ctrl && e.key === 'v') {
              requestAnimationFrame(checkAndNotify);
              return;
            }

            // Enter, Delete, Backspace — verificar overflow/absorción después de que el DOM actualice
            if (e.key === 'Enter' || e.key === 'Delete' || e.key === 'Backspace') {
              requestAnimationFrame(checkAndNotify);
            }
          }}
          onFocus={() => {
            isFocused.current = true;
            if (refToUse.current && onFocusPage) onFocusPage(refToUse.current);
          }}
          onBlur={() => { isFocused.current = false; }}
          onSelect={() => { if (onSelectionChange) onSelectionChange(); }}
          onKeyUp={() => { if (onSelectionChange) onSelectionChange(); }}
          onClick={() => { if (onSelectionChange) onSelectionChange(); }}
          suppressContentEditableWarning
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          style={{ ...contentStyle, outline: 'none', cursor: 'text' }}
        />
      ) : (
        <div
          className="content-layer"
          style={contentStyle}
          dangerouslySetInnerHTML={{ __html: contenidoHTML }}
        />
      )}

      {/* Número de página */}
      {pageNumber > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: `${MARGIN.bottom - 36}px`,
            left: 0, right: 0,
            textAlign: 'center',
            fontSize: '9pt',
            color: '#888',
            zIndex: 3,
            fontFamily: 'Georgia, serif',
            letterSpacing: '0.5px',
          }}
        >
          {pageNumber}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DocumentRenderer — sin cambios
// ─────────────────────────────────────────────────────────────────────────────
interface DocumentRendererProps {
  contenidoHTML: string;
  paginasHTML?: string[];
  isEditable?: boolean;
  onPageChange?: (index: number, nuevoHTML: string) => void;
  onContentChange?: () => void;
  onRegisterRef?: (index: number, el: HTMLDivElement | null) => void;
  onFocusPage?: (el: HTMLDivElement) => void;       // notifica qué página tiene foco
  onSelectionChange?: () => void;                    // notifica cambio de selección
  documentRef?: React.RefObject<HTMLDivElement>;
  showPrint?: boolean;
  pageRef?: React.RefObject<HTMLDivElement>;
  hojaMembretada?: HojaMembretada;
}

/**
 * Divide el HTML en páginas usando los div.page-break que inserta procesarRespuestaGroq.
 * Si no hay separadores, usa la heurística original de altura estimada.
 */
const dividirHTMLEnPaginas = (contenidoHTML: string): string[] => {
  // ── Prioridad 1: separadores explícitos insertados por procesarRespuestaGroq ──
  if (/<div[^>]*page-break[^>]*>/i.test(contenidoHTML)) {
    const partes = contenidoHTML
      .split(/<div[^>]*page-break[^>]*>[\s\S]*?<\/div>/i)
      .map(p => p.trim())
      .filter(Boolean);
    if (partes.length > 1) return partes;
  }

  // ── Prioridad 2: heurística de altura real medida en el DOM ──
  const contentWidth = 794 - MARGIN.left - MARGIN.right; // 650px
  const tempDiv = document.createElement('div');
  tempDiv.style.cssText = `position:absolute;left:-9999px;width:${contentWidth}px;font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.4;`;
  tempDiv.innerHTML = contenidoHTML;
  document.body.appendChild(tempDiv);
  const alturaTotal = tempDiv.scrollHeight;
  document.body.removeChild(tempDiv);

  if (alturaTotal <= CONTENT_HEIGHT) return [contenidoHTML];

  // Dividir elemento a elemento respetando CONTENT_HEIGHT
  const parser    = new DOMParser();
  const doc       = parser.parseFromString(contenidoHTML, 'text/html');
  const elementos = Array.from(doc.body.children);
  const nuevasPaginas: string[] = [];
  let paginaActual    = '';
  let alturaAcumulada = 0;

  elementos.forEach((elemento) => {
    const elementoHTML = elemento.outerHTML;
    // Medir altura real del elemento
    const medidor = document.createElement('div');
    medidor.style.cssText = `position:absolute;left:-9999px;width:${contentWidth}px;font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.4;`;
    medidor.innerHTML = elementoHTML;
    document.body.appendChild(medidor);
    const alturaElemento = medidor.scrollHeight;
    document.body.removeChild(medidor);

    if (alturaAcumulada + alturaElemento > CONTENT_HEIGHT && paginaActual) {
      nuevasPaginas.push(paginaActual);
      paginaActual    = elementoHTML;
      alturaAcumulada = alturaElemento;
    } else {
      paginaActual    += elementoHTML;
      alturaAcumulada += alturaElemento;
    }
  });

  if (paginaActual) nuevasPaginas.push(paginaActual);
  return nuevasPaginas.length > 0 ? nuevasPaginas : [contenidoHTML];
};

const DocumentRenderer = ({
  contenidoHTML,
  paginasHTML,
  isEditable = false,
  onPageChange,
  onContentChange,
  onRegisterRef,
  onFocusPage,
  onSelectionChange,
  documentRef,
  showPrint = false,
  pageRef,
  hojaMembretada,
}: DocumentRendererProps) => {
  // En modo lectura/print: dividir el string en páginas
  const [paginasCalculadas, setPaginasCalculadas] = useState<string[]>([contenidoHTML || '']);

  useEffect(() => {
    // Solo recalcular en modo lectura (print). En modo editable, las páginas
    // vienen del estado externo (paginasHTML) y no se recalculan aquí.
    if (isEditable) return;
    if (!contenidoHTML) { setPaginasCalculadas(['']); return; }
    const resultado = dividirHTMLEnPaginas(contenidoHTML);
    setPaginasCalculadas(resultado);
  }, [contenidoHTML, isEditable]);

  // En modo editable usar el array externo (fuente de verdad)
  const paginas = isEditable ? (paginasHTML ?? [contenidoHTML]) : paginasCalculadas;

  if (isEditable) {
    return (
      <>
        {paginas.map((paginaHTML, index) => (
          <DocumentPage
            key={`page-${index}-${paginas.length}`}
            contenidoHTML={paginaHTML}
            pageNumber={index + 1}
            pageIndex={index}
            isEditable={true}
            onContentChange={onPageChange ? () => undefined : onContentChange}
            onPageChange={onPageChange ? (html) => onPageChange(index, html) : undefined}
            onRegisterRef={onRegisterRef}
            onFocusPage={onFocusPage}
            onSelectionChange={onSelectionChange}
            documentRef={index === 0 ? documentRef : undefined}
            showPrint={showPrint}
            pageRef={index === 0 ? pageRef : undefined}
            hojaMembretada={hojaMembretada}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {paginas.map((paginaHTML, index) => (
        <DocumentPage
          key={index}
          contenidoHTML={paginaHTML}
          pageNumber={index + 1}
          isEditable={false}
          showPrint={showPrint}
          hojaMembretada={hojaMembretada}
        />
      ))}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal — sin cambios funcionales
// ─────────────────────────────────────────────────────────────────────────────
export function CrearDocumentoNuevo({ onVolver }: CrearDocumentoNuevoProps) {
  const { user } = useAuth();
  const { generarDocumento } = useDocuments();

  const [nombreDocumento, setNombreDocumento]   = useState('');
  const [areaDocumento, setAreaDocumento]       = useState('');
  const [contenidoHTML, setContenidoHTML]       = useState('');
  // Array de páginas — fuente de verdad para el editor. Se inicializa al generar
  // y se actualiza página a página cuando el usuario edita. Nunca se recalcula
  // desde contenidoHTML mientras el usuario edita (evita el colapso a 1 página).
  const [paginasHTML, setPaginasHTML] = useState<string[]>([]);
  const [documentoGuardado, setDocumentoGuardado] = useState(false);
  const [mostrarAdvertenciaImpresion, setMostrarAdvertenciaImpresion] = useState(false);
  const [guardandoDocumento, setGuardandoDocumento] = useState(false);

  const [grokPrompt, setGrokPrompt]       = useState('');
  const [grokGenerando, setGrokGenerando] = useState(false);
  const [errorGeneracion, setErrorGeneracion] = useState('');

  const documentoEditableRef = useRef<HTMLDivElement>(null);
  const pageRef              = useRef<HTMLDivElement>(null);
  const documentContainerRef = useRef<HTMLDivElement>(null);
  // Map de refs a los divs contentEditable de cada página — para forzar actualización del DOM
  const pageContentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const rebalanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null); // ref al contenedor con overflow-auto
  const [fontSize, setFontSize] = useState('3');
  const [zoomVista, setZoomVista] = useState(75);
  const PAGE_W_PX = 794;

  // Ref a la última página que tuvo el foco — para devolver el cursor al lugar correcto
  const lastFocusedPageRef = useRef<HTMLDivElement | null>(null);
  // Rango guardado antes de que el botón de la toolbar robe el foco
  const savedRangeRef = useRef<Range | null>(null);

  // Estado de los botones activos (bold, italic, underline, align)
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  const [hojaMembretadaSeleccionada, setHojaMembretadaSeleccionada] = useState<HojaMembretada | null>(null);
  const [hojasSelectorOpen, setHojasSelectorOpen] = useState(false);

  const [hojasMembreteadasAPI, setHojasMembreteadasAPI] = useState<HojaMembretadaAPI[]>([]);
  const [cargandoHojas, setCargandoHojas]     = useState(false);
  const [modalSubirHoja, setModalSubirHoja]   = useState(false);
  const [archivoHoja, setArchivoHoja]         = useState<File | null>(null);
  const [nombreHoja, setNombreHoja]           = useState('');
  const [descripcionHoja, setDescripcionHoja] = useState('');
  const [subiendoHoja, setSubiendoHoja]       = useState(false);

  useEffect(() => {
    const cargarHojasMembreteadas = async () => {
      if (!areaDocumento) { setHojasMembreteadasAPI([]); return; }

      const tieneAcceso = user.rol === 'administrador' ||
        (user.areasPermitidas && user.areasPermitidas.includes(areaDocumento));
      if (!tieneAcceso) { setHojasMembreteadasAPI([]); return; }

      setCargandoHojas(true);
      try {
        const response = await getHojasMembreteadasArea(areaDocumento);
        setHojasMembreteadasAPI(response.hojas);
        if (response.hojas.length > 0 && !hojaMembretadaSeleccionada) {
          const primera = response.hojas[0];
          setHojaMembretadaSeleccionada({ id: primera.id, nombre: primera.nombre, imagenUrl: primera.archivo.previewUrl, areaId: primera.areaId });
        }
      } catch (error) {
        console.error('Error al cargar hojas membretadas:', error);
        toast.error('No se pudieron cargar las hojas membretadas');
        setHojasMembreteadasAPI([]);
      } finally {
        setCargandoHojas(false);
      }
    };
    cargarHojasMembreteadas();
  }, [areaDocumento]);

  const hojasDisponibles: HojaMembretada[] = React.useMemo(() => {
    if (hojasMembreteadasAPI.length > 0) {
      return hojasMembreteadasAPI.map(h => ({ id: h.id, nombre: h.nombre, imagenUrl: h.archivo.previewUrl }));
    }
    return areaDocumento ? membretadasPorArea[areaDocumento] || [] : [];
  }, [hojasMembreteadasAPI, areaDocumento]);

  const puedeSubirMembretada = user.rolApi ? ['ADMIN', 'JEFE_AREA'].includes(user.rolApi) : false;

  const handleSubirHoja = async () => {
    if (!archivoHoja)          { toast.error('Por favor selecciona un archivo'); return; }
    if (!nombreHoja.trim())    { toast.error('Por favor ingresa un nombre para la hoja'); return; }
    if (!areaDocumento)        { toast.error('Por favor selecciona un área primero'); return; }
    if (archivoHoja.size > 10 * 1024 * 1024) { toast.error('El archivo es demasiado grande. Máximo 10MB.'); return; }
    const formatosPermitidos = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];
    if (!formatosPermitidos.includes(archivoHoja.type)) { toast.error('Formato no válido. Usa JPG, PNG, WEBP o PDF'); return; }

    setSubiendoHoja(true);
    try {
      const response = await subirHojaMembretada(archivoHoja, areaDocumento, nombreHoja, descripcionHoja || undefined);
      setHojasMembreteadasAPI(prev => [response.hoja, ...prev]);
      setHojaMembretadaSeleccionada({ id: response.hoja.id, nombre: response.hoja.nombre, imagenUrl: response.hoja.archivo.previewUrl, areaId: response.hoja.areaId });
      setArchivoHoja(null); setNombreHoja(''); setDescripcionHoja(''); setModalSubirHoja(false);
      toast.success('Hoja membretada subida exitosamente');
    } catch (error) {
      console.error('Error al subir hoja membretada:', error);
      toast.error('No se pudo subir la hoja membretada');
    } finally {
      setSubiendoHoja(false);
    }
  };

  if (!user) return null;

  const areasDisponibles = obtenerAreasDisponibles(user.rol, user.areasPermitidas || []);
  const areas = areasDisponibles.map(area => area.nombre);

  const sugerencias = ['Solicitud de vacaciones', 'Constancia de empleo', 'Oficio de invitación', 'Memorándum interno'];

  useEffect(() => {
    if (areasDisponibles.length === 1)                        setAreaDocumento(areasDisponibles[0].nombre);
    else if (user.area && areas.includes(user.area))          setAreaDocumento(user.area);
    else if (areasDisponibles.length > 0 && !areaDocumento)   setAreaDocumento(areasDisponibles[0].nombre);
  }, [areasDisponibles, user.area]);

  // Guardar selección actual antes de que el botón robe el foco
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  // Restaurar selección y devolver foco a la última página activa
  const restoreSelectionAndFocus = () => {
    const target = lastFocusedPageRef.current;
    if (!target) return;
    target.focus();
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  // Actualizar qué botones están activos según el estado del cursor
  const updateActiveFormats = () => {
    const formats = new Set<string>();
    if (document.queryCommandState('bold'))        formats.add('bold');
    if (document.queryCommandState('italic'))      formats.add('italic');
    if (document.queryCommandState('underline'))   formats.add('underline');
    if (document.queryCommandState('justifyLeft'))   formats.add('justifyLeft');
    if (document.queryCommandState('justifyCenter')) formats.add('justifyCenter');
    if (document.queryCommandState('justifyRight'))  formats.add('justifyRight');
    if (document.queryCommandState('justifyFull'))   formats.add('justifyFull');
    setActiveFormats(formats);
  };

  const applyFormat = (command: string, value?: string) => {
    restoreSelectionAndFocus();
    document.execCommand(command, false, value);
    updateActiveFormats();
    // Notificar cambio a la página activa
    const activeRef = lastFocusedPageRef.current;
    if (activeRef) {
      const pageIdx = Array.from(pageContentRefs.current.entries())
        .find(([, el]) => el === activeRef)?.[0] ?? 0;
      handlePageChange(pageIdx, activeRef.innerHTML);
    }
  };

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    restoreSelectionAndFocus();
    document.execCommand('fontSize', false, size);
    const activeRef = lastFocusedPageRef.current;
    if (activeRef) {
      const pageIdx = Array.from(pageContentRefs.current.entries())
        .find(([, el]) => el === activeRef)?.[0] ?? 0;
      handlePageChange(pageIdx, activeRef.innerHTML);
    }
  };

  const generarMachoteCompleto = async () => {
    if (!grokPrompt.trim())  { toast.error('Por favor escribe una instrucción para generar el machote'); return; }
    if (!areaDocumento)      { toast.error('Por favor selecciona un área primero'); return; }
    if (contenidoHTML.trim() && !window.confirm('Esto reemplazará el contenido actual. ¿Deseas continuar?')) return;

    setGrokGenerando(true);
    setErrorGeneracion('');

    try {
      console.log('📤 POST /api/generate-template - Llamando a Groq');
      const response = await fetch('https://groqq-microservice.onrender.com/api/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ area: areaDocumento, prompt: grokPrompt }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      if (!data.text && !data.pages) throw new Error('La respuesta no contiene el campo "text" ni "pages"');

      console.log('✅ Groq respondió, normalizando placeholders...');

      // procesarRespuestaGroq ya normaliza placeholders y limpia Markdown internamente
      const htmlFormateado = procesarRespuestaGroq(data);

      // Dividir inmediatamente en páginas y guardar como array
      const paginas = dividirHTMLEnPaginas(htmlFormateado);
      setPaginasHTML(paginas);
      setContenidoHTML(htmlFormateado);

      // Re-balancear una vez que los contentEditable estén montados en el DOM
      // para corregir diferencias entre la medición estimada y el layout real
      setTimeout(() => {
        setPaginasHTML(prev => {
          if (prev.length === 0) return prev;
          const rebalanceadas = repartirDesde([...prev], 0);
          const SEP = '<div class="page-break" style="page-break-after:always;margin:0;"></div>';
          setContenidoHTML(rebalanceadas.join(SEP));
          return rebalanceadas;
        });
      }, 300);

      const variables = extractVariablesFromSquareBrackets(htmlFormateado);
      console.log('✅ Variables detectadas:', variables.map(v => v.key));

      toast.success('¡Machote generado exitosamente!', {
        description: variables.length > 0 ? `Se detectaron ${variables.length} campos dinámicos` : 'Contenido generado',
      });

      if (!nombreDocumento.trim()) {
        setNombreDocumento(grokPrompt.length > 50 ? grokPrompt.substring(0, 50) + '...' : grokPrompt);
      }

      setTimeout(() => {
        document.querySelector('.document-page')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error('Error al generar machote:', error);
      let errorMsg = 'Error desconocido';
      if (error instanceof TypeError && error.message === 'Failed to fetch') errorMsg = 'No se pudo conectar al servidor. Por favor intenta de nuevo.';
      else if (error instanceof Error) errorMsg = error.message;
      setErrorGeneracion(errorMsg);
      toast.error('No se pudo generar el machote');
    } finally {
      setGrokGenerando(false);
    }
  };

  // Separa los elementos de un HTML que no caben en CONTENT_HEIGHT.
  // Usa el DOM real montado en el documento para medir con precisión,
  // incluyendo nodos sueltos (<br>, <div>) que crea el browser al presionar Enter.
  const separarOverflow = (html: string): { caben: string; sobran: string } => {
    const contentWidth = 794 - MARGIN.left - MARGIN.right;

    // Montar un medidor real en el DOM para obtener el layout exacto
    const contenedor = document.createElement('div');
    contenedor.style.cssText = [
      'position:absolute', 'left:-9999px', 'top:-9999px',
      `width:${contentWidth}px`,
      'font-family:Arial,Helvetica,sans-serif',
      'font-size:12pt', 'line-height:1.4',
      'word-break:break-word', 'overflow:visible',
    ].join(';');
    contenedor.innerHTML = html;
    document.body.appendChild(contenedor);

    // Normalizar: envolver nodos sueltos (text, BR) en <p> para poder medirlos
    const childNodes = Array.from(contenedor.childNodes);
    const bloques: Element[] = [];
    let buffer = document.createElement('p');
    let bufferHasSomething = false;

    childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent?.trim() ?? '';
        if (t) { buffer.appendChild(node.cloneNode()); bufferHasSomething = true; }
      } else if (node.nodeName === 'BR') {
        if (bufferHasSomething) { bloques.push(buffer); buffer = document.createElement('p'); bufferHasSomething = false; }
      } else {
        if (bufferHasSomething) { bloques.push(buffer); buffer = document.createElement('p'); bufferHasSomething = false; }
        bloques.push(node as Element);
      }
    });
    if (bufferHasSomething) bloques.push(buffer);

    document.body.removeChild(contenedor);

    // Medir cada bloque acumulando altura
    let caben = '';
    let sobran = '';
    let alturaAcumulada = 0;
    let desbordando = false;

    bloques.forEach((el) => {
      if (desbordando) { sobran += el.outerHTML; return; }

      const medidor = document.createElement('div');
      medidor.style.cssText = [
        'position:absolute', 'left:-9999px', 'top:-9999px',
        `width:${contentWidth}px`,
        'font-family:Arial,Helvetica,sans-serif',
        'font-size:12pt', 'line-height:1.4', 'word-break:break-word',
      ].join(';');
      medidor.innerHTML = el.outerHTML;
      document.body.appendChild(medidor);
      const h = medidor.scrollHeight;
      document.body.removeChild(medidor);

      if (h === 0) return; // ignorar elementos vacíos
      if (alturaAcumulada + h > CONTENT_HEIGHT) {
        desbordando = true;
        sobran += el.outerHTML;
      } else {
        caben += el.outerHTML;
        alturaAcumulada += h;
      }
    });

    // Si no se detectó nada sobrante pero el HTML es demasiado alto, separar por mitad
    if (!sobran && alturaAcumulada > CONTENT_HEIGHT && bloques.length > 1) {
      const mitad = Math.floor(bloques.length / 2);
      caben = bloques.slice(0, mitad).map(e => e.outerHTML).join('');
      sobran = bloques.slice(mitad).map(e => e.outerHTML).join('');
    }

    return { caben: caben || html, sobran };
  };

  // ─── Utilidad: medir altura de un HTML con el mismo CSS que el contentEditable ───
  const medirAltura = (html: string): number => {
    const W = 794 - MARGIN.left - MARGIN.right;
    const m = document.createElement('div');
    m.style.cssText = [
      'position:absolute','left:-9999px','top:-9999px',
      `width:${W}px`,
      'font-family:Arial,Helvetica,sans-serif',
      'font-size:12pt','line-height:1.4','word-break:break-word',
    ].join(';');
    m.innerHTML = html;
    document.body.appendChild(m);
    const h = m.scrollHeight;
    document.body.removeChild(m);
    return h;
  };

  // ─── Repartir contenido entre páginas a partir de pageIndex, propagando hacia adelante ───
  // Devuelve el nuevo array de páginas ya balanceado.
  const repartirDesde = (paginas: string[], desde: number): string[] => {
    const resultado = [...paginas];

    for (let i = desde; i < resultado.length; i++) {
      const domRef = pageContentRefs.current.get(i);
      // Para overflow: usar scrollHeight real del DOM (incluye nodos de Enter del browser)
      // Para absorción: usar medirAltura con el HTML actual (más preciso para comparar contenido)
      const alturaDOM = domRef ? domRef.scrollHeight : medirAltura(resultado[i]);
      const alturaContenido = medirAltura(resultado[i]);
      // La altura efectiva para detectar overflow es la del DOM real
      // La altura para decidir cuánto espacio libre hay para absorber es la del contenido
      const altura = alturaDOM;
      const alturaParaAbsorber = alturaContenido;
      const W = 794 - MARGIN.left - MARGIN.right;

      if (altura > CONTENT_HEIGHT) {
        // ── Overflow: mover exceso a página siguiente ──
        const { caben, sobran } = separarOverflow(resultado[i]);
        resultado[i] = caben;

        // Actualizar DOM inmediatamente para evitar duplicados
        if (domRef && domRef.innerHTML !== caben) {
          const sel = window.getSelection();
          let savedOffset = 0;
          if (sel?.rangeCount) {
            try {
              const r = sel.getRangeAt(0);
              const pre = document.createRange();
              pre.setStart(domRef, 0);
              pre.setEnd(r.startContainer, r.startOffset);
              savedOffset = pre.toString().length;
            } catch { savedOffset = 0; }
          }

          domRef.innerHTML = caben;

          // Restaurar cursor
          if (sel) {
            try {
              const maxOff = (domRef.textContent || '').length;
              const target = Math.min(savedOffset, maxOff);
              const walker = document.createTreeWalker(domRef, NodeFilter.SHOW_TEXT);
              let acc = 0; let placed = false;
              while (walker.nextNode()) {
                const node = walker.currentNode as Text;
                const len = node.textContent?.length ?? 0;
                if (!placed && acc + len >= target) {
                  const range = document.createRange();
                  range.setStart(node, target - acc);
                  range.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(range);
                  placed = true; break;
                }
                acc += len;
              }
              if (!placed) {
                const range = document.createRange();
                range.selectNodeContents(domRef);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            } catch { /* ignorar */ }
          }
        }

        if (sobran) {
          if (i + 1 < resultado.length) {
            resultado[i + 1] = sobran + resultado[i + 1];
          } else {
            resultado.push(sobran);
          }
          // Continuar propagando en la página siguiente
        }

      } else {
        // ── Sin overflow: intentar absorber elementos del inicio de la página siguiente ──
        if (i + 1 < resultado.length && resultado[i + 1]?.trim()) {
          const sigParser = new DOMParser();
          const sigDoc = sigParser.parseFromString(resultado[i + 1], 'text/html');
          const sigEls = Array.from(sigDoc.body.children);

          let alturaActual = alturaParaAbsorber;
          let absorbidos = '';
          let resto = '';
          let absorbiendo = true;

          sigEls.forEach((el) => {
            if (!absorbiendo) { resto += el.outerHTML; return; }
            const h = medirAltura(el.outerHTML);
            if (alturaActual + h <= CONTENT_HEIGHT) {
              absorbidos += el.outerHTML;
              alturaActual += h;
            } else {
              absorbiendo = false;
              resto += el.outerHTML;
            }
          });

          if (absorbidos) {
            resultado[i] = resultado[i] + absorbidos;

            // Actualizar DOM de esta página con el contenido absorbido
            const ref = pageContentRefs.current.get(i);
            if (ref) ref.innerHTML = resultado[i];

            if (!resto.trim()) {
              resultado.splice(i + 1, 1);
              // Continuar propagando absorción hacia adelante
            } else {
              resultado[i + 1] = resto;
            }
          }
        }

        // Si la página actual quedó vacía y no es la primera, eliminarla
        if (i > 0 && !resultado[i]?.trim()) {
          resultado.splice(i, 1);
          i--; // re-evaluar el índice
        }
      }
    }

    return resultado;
  };

  // ─── Re-balance global de todas las páginas ───
  // Preserva la posición del scroll para que el usuario no salte al inicio.
  const rebalanceTodas = () => {
    if (rebalanceTimerRef.current) clearTimeout(rebalanceTimerRef.current);
    rebalanceTimerRef.current = setTimeout(() => {
      // Guardar scroll ANTES del re-render
      const scrollEl = scrollContainerRef.current;
      const savedScroll = scrollEl ? scrollEl.scrollTop : 0;

      setPaginasHTML(prev => {
        if (prev.length === 0) return prev;
        const rebalanceadas = repartirDesde([...prev], 0);
        const cambio = rebalanceadas.some((p, i) => p !== prev[i]) || rebalanceadas.length !== prev.length;
        if (!cambio) return prev;
        const SEP = '<div class="page-break" style="page-break-after:always;margin:0;"></div>';
        setContenidoHTML(rebalanceadas.join(SEP));
        // Restaurar scroll después del re-render
        requestAnimationFrame(() => {
          if (scrollEl) scrollEl.scrollTop = savedScroll;
        });
        return rebalanceadas;
      });
    }, 400);
  };

  // ─── Callback principal de cambio de página ───
  const handlePageChange = (pageIndex: number, nuevoHTML: string) => {
    const scrollEl = scrollContainerRef.current;
    const savedScroll = scrollEl ? scrollEl.scrollTop : 0;

    setPaginasHTML(prev => {
      const base = [...prev];
      base[pageIndex] = nuevoHTML;
      const resultado = repartirDesde(base, pageIndex);
      const SEP = '<div class="page-break" style="page-break-after:always;margin:0;"></div>';
      setContenidoHTML(resultado.join(SEP));
      // Restaurar scroll para que no salte al inicio tras re-render
      requestAnimationFrame(() => {
        if (scrollEl) scrollEl.scrollTop = savedScroll;
      });
      return resultado;
    });
    rebalanceTodas();
  };

  const handleGuardarDocumento = async () => {
    if (!nombreDocumento.trim()) { toast.error('Por favor ingresa un nombre para el documento'); return; }
    if (!contenidoHTML.trim())   { toast.error('El contenido del documento no puede estar vacío'); return; }
    if (!areaDocumento)          { toast.error('Por favor selecciona un área'); return; }

    setGuardandoDocumento(true);
    try {
      const payload: any = {
        title: nombreDocumento,
        area: areaDocumento,
        contentHtml: contenidoHTML,
        letterheadUrl: hojaMembretadaSeleccionada?.imagenUrl || membreteImage,
      };

      if (hojaMembretadaSeleccionada?.areaId) {
        payload.letterheadRef = { id: hojaMembretadaSeleccionada.id, areaId: hojaMembretadaSeleccionada.areaId, nombre: hojaMembretadaSeleccionada.nombre };
        console.log('📎 Enviando letterheadRef:', payload.letterheadRef);
      }

      const response = await createMachote(payload);
      const textoPlano = documentoEditableRef.current?.innerText || extraerTextoPlano(contenidoHTML);

      generarDocumento({
        machoteId: response._id || `nuevo-${Date.now()}`,
        nombreMachote: nombreDocumento,
        area: areaDocumento,
        usuario: user.nombre,
        contenido: textoPlano,
        camposUtilizados: {},
      });

      setDocumentoGuardado(true);
      toast.success('Documento guardado exitosamente');
    } catch (error) {
      console.error('Error al guardar documento:', error);
      toast.error('No se pudo guardar. Reintenta.');
    } finally {
      setGuardandoDocumento(false);
    }
  };

  /**
   * Exporta todas las páginas del documento como PDF.
   * Captura cada .document-page individualmente con html2canvas
   * y las añade como páginas separadas en jsPDF.
   */
  const exportarConHtml2Canvas = async (): Promise<jsPDF | null> => {
    const contenedor = documentContainerRef.current;
    if (!contenedor) { toast.error('No se pudo obtener la referencia del documento'); return null; }

    // Obtener todas las páginas renderizadas en el DOM
    const paginasDOM = Array.from(contenedor.querySelectorAll<HTMLElement>('.document-page'));
    if (paginasDOM.length === 0) { toast.error('No hay páginas para exportar'); return null; }

    const doc   = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    const pageW = 612; // puntos — ancho carta
    const pageH = 792; // puntos — alto carta

    for (let i = 0; i < paginasDOM.length; i++) {
      const pagina = paginasDOM[i];

      // Asegurarse de que la página esté totalmente visible para html2canvas
      pagina.style.visibility = 'visible';
      pagina.style.opacity    = '1';

      const canvas = await html2canvas(pagina, {
        scale:           2,          // 2× es suficiente y más rápido que 3×
        useCORS:         true,
        allowTaint:      true,
        backgroundColor: '#ffffff',
        logging:         false,
        // Scroll al elemento antes de capturar para que esté en viewport
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth:  document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        onclone: (clonedDoc) => {
          // Aplicar clase de export a la página clonada
          clonedDoc.querySelectorAll('.document-page').forEach(el => {
            el.classList.add('export-pdf');
            (el as HTMLElement).style.boxShadow    = 'none';
            (el as HTMLElement).style.borderRadius = '0';
          });
          // Asegurar que las imágenes del membrete sean visibles
          clonedDoc.querySelectorAll('.membrete-layer img, .membrete-layer').forEach(el => {
            (el as HTMLElement).style.opacity    = '1';
            (el as HTMLElement).style.visibility = 'visible';
          });
        },
      });

      const imgData = canvas.toDataURL('image/png');
      const imgH    = (canvas.height * pageW) / canvas.width;

      if (i > 0) doc.addPage();
      doc.addImage(imgData, 'PNG', 0, 0, pageW, imgH > pageH ? pageH : imgH);
    }

    return doc;
  };

  const handleDescargarPDF = async () => {
    if (!nombreDocumento.trim()) { toast.error('Por favor ingresa un nombre'); return; }
    if (!contenidoHTML.trim())   { toast.error('El contenido no puede estar vacío'); return; }
    const doc = await exportarConHtml2Canvas();
    if (doc) { doc.save(`${nombreDocumento.replace(/\s+/g, '_')}_${Date.now()}.pdf`); toast.success('PDF descargado correctamente'); }
  };

  const handleImprimir = async () => {
    if (!nombreDocumento.trim()) { toast.error('Por favor ingresa un nombre'); return; }
    if (!contenidoHTML.trim())   { toast.error('El contenido no puede estar vacío'); return; }
    const doc = await exportarConHtml2Canvas();
    if (doc) { const url = URL.createObjectURL(doc.output('blob')); window.open(url, '_blank'); toast.success('PDF abierto para impresión'); }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <style>{`
        .export-pdf, .export-pdf * { color:#000!important;box-shadow:none!important;filter:none!important;border-color:#000!important; }
        .export-pdf img,.export-pdf .membrete-layer { opacity:1!important;visibility:visible!important; }
        .export-pdf .membrete-layer,.export-pdf .content-layer { background-color:transparent!important; }
        @media print {
          body * { visibility:hidden; }
          #page-to-export,#page-to-export * { visibility:visible; }
          #page-to-export { position:absolute;top:0;left:0;width:100%;height:100%;box-shadow:none!important;border-radius:0!important; }
          .membrete-layer { print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important; }
          .no-print { display:none!important; }
          .print-only { display:block!important; }
        }
      `}</style>

      {/* ── Barra superior sticky ── */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm no-print">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={onVolver} size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Nombre del documento"
                  value={nombreDocumento}
                  onChange={(e) => setNombreDocumento(e.target.value)}
                  className="h-8 w-48 text-sm"
                />
                <Select value={areaDocumento} onValueChange={setAreaDocumento}>
                  <SelectTrigger className="h-8 w-40 text-sm">
                    <SelectValue placeholder="Área" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((area) => <SelectItem key={area} value={area}>{area}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hojasDisponibles.length > 0 && (
                <>
                  <Popover open={hojasSelectorOpen} onOpenChange={setHojasSelectorOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-xs">{hojaMembretadaSeleccionada?.nombre || 'Hoja'}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-2" align="end">
                      <div className="space-y-1">
                        <div className="px-2 py-1.5">
                          <p className="text-xs font-semibold text-gray-700">Seleccionar Plantilla</p>
                          <p className="text-xs text-gray-500">{hojasDisponibles.length} disponibles</p>
                        </div>
                        <Separator />
                        <div className="max-h-80 overflow-y-auto space-y-1">
                          {hojasDisponibles.map((hoja) => (
                            <button
                              key={hoja.id}
                              onClick={() => { setHojaMembretadaSeleccionada(hoja); setHojasSelectorOpen(false); toast.success(`Plantilla: ${hoja.nombre}`); }}
                              className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors hover:bg-gray-100 ${hojaMembretadaSeleccionada?.id === hoja.id ? 'bg-gray-100 border border-gray-300' : 'border border-transparent'}`}
                            >
                              <div className="w-12 h-16 flex-shrink-0 bg-white rounded border border-gray-200 overflow-hidden shadow-sm">
                                <img src={hoja.imagenUrl} alt={hoja.nombre} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm font-medium text-gray-900">{hoja.nombre}</p>
                                {hojaMembretadaSeleccionada?.id === hoja.id && (
                                  <p className="text-xs text-gray-600 font-medium flex items-center gap-1 mt-0.5">
                                    <Check className="h-3 w-3" />Seleccionada
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                        {puedeSubirMembretada && areaDocumento && (
                          <>
                            <Separator />
                            <div className="px-2 py-1.5">
                              <Button
                                onClick={() => { setModalSubirHoja(true); setHojasSelectorOpen(false); }}
                                variant="outline" size="sm"
                                className="w-full gap-2 text-gray-700 border-gray-300 hover:bg-gray-100"
                              >
                                <Plus className="h-4 w-4" />Subir Nueva Hoja
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Separator orientation="vertical" className="h-6" />
                </>
              )}

              <Button onClick={handleGuardarDocumento} size="sm" className="bg-green-600 hover:bg-green-700 h-8">
                {guardandoDocumento ? (
                  <><div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Guardando...</>
                ) : (
                  <><Save className="h-3.5 w-3.5 mr-2" />Guardar</>
                )}
              </Button>
              {/* OCULTOS - Los botones PDF e Imprimir están deshabilitados
              <Button onClick={handleDescargarPDF} variant="outline" size="sm" className="h-8">
                <Download className="h-3.5 w-3.5 mr-2" />PDF
              </Button>
              <Button onClick={handleImprimir} variant="outline" size="sm" className="h-8">
                <Printer className="h-3.5 w-3.5 mr-2" />Imprimir
              </Button>
              */}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 no-print">

        {/* ── Panel Grok ── */}
        <Card className="mb-6 border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={grokPrompt}
                    onChange={(e) => setGrokPrompt(e.target.value)}
                    placeholder="Describe el documento que necesitas generar..."
                    className="h-9 text-sm flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && generarMachoteCompleto()}
                  />
                  <Button
                    onClick={generarMachoteCompleto}
                    disabled={grokGenerando || !grokPrompt.trim() || !areaDocumento}
                    className="bg-gray-800 hover:bg-gray-900 h-9" size="sm"
                  >
                    {grokGenerando ? (
                      <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Generando...</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" />Generar</>
                    )}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sugerencias.map((s) => (
                    <button key={s} onClick={() => setGrokPrompt(s)} className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-200 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
                {errorGeneracion && (
                  <Alert className="bg-red-50 border-red-200 py-2">
                    <AlertDescription className="text-xs text-red-900">{errorGeneracion}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Barra de formato + controles de zoom ── */}
        <div className="sticky top-[61px] z-40 bg-white border border-gray-200 rounded-t-lg shadow-sm">
          <div className="flex items-center justify-between gap-2 py-2 px-4">
            {/* Herramientas de texto */}
            {/* onMouseDown + preventDefault evita que el botón robe el foco del contentEditable */}
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { cmd: 'bold',          icon: <Bold className="h-4 w-4" />,         label: 'Negrita'    },
                { cmd: 'italic',        icon: <Italic className="h-4 w-4" />,       label: 'Cursiva'    },
                { cmd: 'underline',     icon: <Underline className="h-4 w-4" />,    label: 'Subrayado'  },
              ].map(({ cmd, icon, label }) => (
                <button
                  key={cmd}
                  aria-label={label}
                  title={label}
                  onMouseDown={(e) => { e.preventDefault(); applyFormat(cmd); }}
                  className={[
                    'h-7 w-7 flex items-center justify-center rounded text-sm transition-colors',
                    activeFormats.has(cmd)
                      ? 'bg-gray-800 text-white'
                      : 'hover:bg-gray-100 text-gray-700',
                  ].join(' ')}
                >
                  {icon}
                </button>
              ))}

              <Separator orientation="vertical" className="h-5 mx-1" />

              {[
                { cmd: 'justifyLeft',   icon: <AlignLeft className="h-4 w-4" />,    label: 'Izquierda'  },
                { cmd: 'justifyCenter', icon: <AlignCenter className="h-4 w-4" />,  label: 'Centrar'    },
                { cmd: 'justifyRight',  icon: <AlignRight className="h-4 w-4" />,   label: 'Derecha'    },
                { cmd: 'justifyFull',   icon: <AlignJustify className="h-4 w-4" />, label: 'Justificar' },
              ].map(({ cmd, icon, label }) => (
                <button
                  key={cmd}
                  aria-label={label}
                  title={label}
                  onMouseDown={(e) => { e.preventDefault(); applyFormat(cmd); }}
                  className={[
                    'h-7 w-7 flex items-center justify-center rounded text-sm transition-colors',
                    activeFormats.has(cmd)
                      ? 'bg-gray-800 text-white'
                      : 'hover:bg-gray-100 text-gray-700',
                  ].join(' ')}
                >
                  {icon}
                </button>
              ))}

              <Separator orientation="vertical" className="h-5 mx-1" />
              <div className="flex items-center gap-1.5">
                <Type className="h-4 w-4 text-gray-500" />
                <Select value={fontSize} onValueChange={handleFontSizeChange}>
                  <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[['1','8pt'],['2','10pt'],['3','12pt'],['4','14pt'],['5','18pt'],['6','24pt'],['7','36pt']].map(([v,l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Controles de zoom — solo afectan la escala visual, no el contenido */}
            <div className="flex items-center gap-1.5 shrink-0 border-l pl-3 ml-1">
              <button
                onClick={() => setZoomVista(z => Math.max(30, z - 10))}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 transition-colors"
                title="Reducir zoom"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs tabular-nums text-gray-600 min-w-[34px] text-center">{zoomVista}%</span>
              <button
                onClick={() => setZoomVista(z => Math.min(150, z + 10))}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 transition-colors"
                title="Aumentar zoom"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setZoomVista(75)}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 transition-colors"
                title="Restablecer zoom"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Área del documento con scroll interno ── */}
        {/*
          CSS `zoom` (a diferencia de transform:scale) SÍ ajusta el espacio en el flow,
          por lo que el scroll se adapta correctamente al nivel de zoom elegido.
          html2canvas captura el DOM real (sin zoom) gracias al documentContainerRef,
          por lo que el PDF siempre sale a resolución completa.
        */}
        <div
          ref={scrollContainerRef}
          className="bg-[#404040] rounded-b-lg overflow-auto"
          style={{ height: '680px' }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '28px 32px',
              // zoom afecta visualmente todo incluyendo el espacio entre páginas
              zoom: zoomVista / 100,
              // Ancho mínimo para que el scroll horizontal aparezca si el zoom es grande
              minWidth: `${PAGE_W_PX + 64}px`,
            }}
          >
            <div ref={documentContainerRef}>
              <DocumentRenderer
                contenidoHTML={contenidoHTML}
                paginasHTML={paginasHTML.length > 0 ? paginasHTML : undefined}
                isEditable={true}
                onPageChange={handlePageChange}
                onRegisterRef={(idx, el) => {
                  if (el) pageContentRefs.current.set(idx, el);
                  else pageContentRefs.current.delete(idx);
                }}
                onFocusPage={(el) => { lastFocusedPageRef.current = el; saveSelection(); }}
                onSelectionChange={() => { saveSelection(); updateActiveFormats(); }}
                documentRef={documentoEditableRef}
                pageRef={pageRef}
                hojaMembretada={hojaMembretadaSeleccionada || membretadasPorArea[areaDocumento]?.[0]}
              />
            </div>
          </div>
        </div>

        <div className="h-8" />
      </div>

      {/* ── Versión para impresión ── */}
      <div className="print-only">
        <DocumentRenderer
          contenidoHTML={contenidoHTML}
          isEditable={false}
          showPrint={true}
          hojaMembretada={hojaMembretadaSeleccionada || membretadasPorArea[areaDocumento]?.[0]}
        />
      </div>

      {/* ── Modal éxito ── */}
      {documentoGuardado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">¡Documento Guardado!</h2>
            <p className="text-sm text-gray-500 mb-6">El documento se ha guardado correctamente</p>
            <div className="space-y-2">
              <Button onClick={handleDescargarPDF} variant="outline" className="w-full" size="sm"><Download className="h-3.5 w-3.5 mr-2" />Descargar PDF</Button>
              <Button onClick={handleImprimir}     variant="outline" className="w-full" size="sm"><Printer className="h-3.5 w-3.5 mr-2" />Imprimir</Button>
              <Button onClick={onVolver} className="w-full bg-gray-800 hover:bg-gray-900" size="sm">Volver a Machotes</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal subir hoja membretada ── */}
      <Dialog open={modalSubirHoja} onOpenChange={setModalSubirHoja}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Subir Nueva Hoja Membretada</DialogTitle>
            <DialogDescription>
              Sube una hoja para {areaDocumento}. Formatos: JPG, PNG, WEBP, PDF (máx. 10MB)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="archivo-hoja">Archivo *</Label>
              <Input id="archivo-hoja" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => setArchivoHoja(e.target.files?.[0] || null)} className="cursor-pointer" />
              {archivoHoja && <p className="text-xs text-gray-500">{archivoHoja.name} ({(archivoHoja.size/1024/1024).toFixed(2)} MB)</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre-hoja">Nombre *</Label>
              <Input id="nombre-hoja" value={nombreHoja} onChange={(e) => setNombreHoja(e.target.value)} placeholder="Ej: RH - Oficial 2024" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion-hoja">Descripción (opcional)</Label>
              <Textarea id="descripcion-hoja" value={descripcionHoja} onChange={(e) => setDescripcionHoja(e.target.value)} placeholder="Describe brevemente esta hoja..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalSubirHoja(false); setArchivoHoja(null); setNombreHoja(''); setDescripcionHoja(''); }} disabled={subiendoHoja}>
              Cancelar
            </Button>
            <Button onClick={handleSubirHoja} disabled={subiendoHoja || !archivoHoja || !nombreHoja.trim()} className="bg-gray-800 hover:bg-gray-900">
              {subiendoHoja ? <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Subiendo...</> : <><Upload className="h-4 w-4 mr-2" />Subir Hoja</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}