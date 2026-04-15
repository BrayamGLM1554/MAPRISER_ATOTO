import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useDocuments } from "../contexts/DocumentContext";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Toggle } from "./ui/toggle";
import {
  ArrowLeft,
  Save,
  Download,
  Printer,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
  Palette,
  Type,
  Eye,
  CheckCircle,
  Trash2,
  Wand2,
  FileText,
  Check,
  Info,
  Sparkles,
  Send,
  Upload,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Textarea } from "./ui/textarea";
import { PrintPreviewModal } from "./PrintPreviewModal";
import { Separator } from "./ui/separator";
import { AREAS_SISTEMA, obtenerAreasDisponibles } from "../constants/areas";
import {
  createMachote,
  normalizePlaceholders,
  extractVariablesFromSquareBrackets,
  getHojasMembreteadasArea,
  subirHojaMembretada,
  HojaMembretadaAPI,
} from "../services/api";
import { SafeLetterheadImage } from "./SafeLetterheadImage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Alert, AlertDescription } from "./ui/alert";
import {
  UnifiedDocumentRenderer,
  formatearTextoPlanoAHTML,
} from "./UnifiedDocumentRenderer";
import {
  exportarDocumentoAPDF,
  generarHTMLImpresion,
} from "../utils/pdfExport";

interface CrearDocumentoNuevoProps {
  onVolver: () => void;
}

interface HojaMembretada {
  id: string;
  nombre: string;
  imagenUrl: string;
  areaId?: string;
}

const procesarRespuestaGroq = (data: any): string => {
  console.log("📥 Procesando respuesta de Groq:", data);
  const limpiarMarkdown = (texto: string): string =>
    texto
      .split("\n")
      .filter((l) => !/^[-*_]{3,}$/.test(l.trim()))
      .join("\n")
      .trim();
  if (data.pages && Array.isArray(data.pages)) {
    console.log(
      `✅ Formato con páginas detectado (${data.pages.length} páginas)`,
    );
    return data.pages
      .map((pagina: string, index: number) => {
        const paginaHTML = formatearTextoPlanoAHTML(
          normalizePlaceholders(limpiarMarkdown(pagina)),
          true,
        );
        return index < data.pages.length - 1
          ? paginaHTML +
              '<div class="page-break" style="page-break-after:always;margin:24px 0;"></div>'
          : paginaHTML;
      })
      .join("\n");
  }
  if (data.text) {
    console.log("✅ Formato con texto simple detectado");
    return formatearTextoPlanoAHTML(
      normalizePlaceholders(limpiarMarkdown(data.text)),
      true,
    );
  }
  console.warn("⚠️ Formato de respuesta no reconocido:", data);
  throw new Error('La respuesta no contiene ni "text" ni "pages"');
};

const extraerTextoPlano = (html: string): string => {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
};

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

const MARGIN = { top: 160, bottom: 100, left: 72, right: 72 } as const;
const CONTENT_HEIGHT = 1123 - MARGIN.top - MARGIN.bottom;

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
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const lastSavedHTML = useRef<string>("");

  useEffect(() => {
    if (isEditable && onRegisterRef) {
      onRegisterRef(pageIndex, refToUse.current);
      return () => onRegisterRef(pageIndex, null);
    }
  }, [pageIndex, isEditable, onRegisterRef]);
  useEffect(() => {
    if (
      !isEditable ||
      !refToUse.current ||
      contenidoHTML === undefined ||
      isFocused.current
    )
      return;
    if (refToUse.current.innerHTML !== contenidoHTML) {
      refToUse.current.innerHTML = contenidoHTML;
      lastSavedHTML.current = contenidoHTML;
      undoStack.current = [];
      redoStack.current = [];
    }
  }, [contenidoHTML, isEditable]);

  const checkAndNotify = () => {
    if (!refToUse.current) return;
    const html = refToUse.current.innerHTML;
    if (html !== lastSavedHTML.current) {
      undoStack.current.push(lastSavedHTML.current);
      if (undoStack.current.length > 100) undoStack.current.shift();
      redoStack.current = [];
      lastSavedHTML.current = html;
    }
    if (onPageChange) onPageChange(html);
    else if (onContentChange) onContentChange();
  };

  const handleUndo = () => {
    if (!refToUse.current || undoStack.current.length === 0) return;
    const prev = undoStack.current.pop()!;
    redoStack.current.push(lastSavedHTML.current);
    lastSavedHTML.current = prev;
    refToUse.current.innerHTML = prev;
    if (onPageChange) onPageChange(prev);
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
    position: "absolute",
    top: `${MARGIN.top}px`,
    left: `${MARGIN.left}px`,
    right: `${MARGIN.right}px`,
    bottom: `${MARGIN.bottom}px`,
    zIndex: 2,
    background: "transparent",
    overflow: "hidden",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "11px",
    lineHeight: "1.65",
    color: "#000",
    wordBreak: "break-word",
  };

  return (
    <div
      ref={pageRef}
      id="page-to-export"
      className="document-page"
      style={{
        width: "794px",
        height: "1123px",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#ffffff",
        boxShadow: showPrint ? "none" : "0 2px 16px rgba(0,0,0,0.18)",
        borderRadius: showPrint ? "0" : "3px",
        marginBottom: showPrint ? "0" : "28px",
        pageBreakAfter: "always",
        pageBreakInside: "avoid",
        flexShrink: 0,
      }}
    >
      <SafeLetterheadImage
        imageUrl={hojaMembretada?.imagenUrl}
        fallbackUrl={undefined}
        className="membrete-layer"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
        onError={(error) =>
          console.error("Error al cargar imagen de hoja membretada:", error)
        }
      />
      {isEditable ? (
        <div
          ref={refToUse}
          contentEditable={true}
          onInput={() => checkAndNotify()}
          onKeyDown={(e) => {
            const ctrl = e.ctrlKey || e.metaKey;
            if (ctrl && e.key === "z" && !e.shiftKey) {
              e.preventDefault();
              handleUndo();
              return;
            }
            if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
              e.preventDefault();
              handleRedo();
              return;
            }
            if (ctrl && e.key === "a") {
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
            if (ctrl && e.key === "v") {
              requestAnimationFrame(checkAndNotify);
              return;
            }
            if (
              e.key === "Enter" ||
              e.key === "Delete" ||
              e.key === "Backspace"
            ) {
              requestAnimationFrame(checkAndNotify);
            }
          }}
          onFocus={() => {
            isFocused.current = true;
            if (refToUse.current && onFocusPage) onFocusPage(refToUse.current);
          }}
          onBlur={() => {
            isFocused.current = false;
          }}
          onSelect={() => {
            if (onSelectionChange) onSelectionChange();
          }}
          onKeyUp={() => {
            if (onSelectionChange) onSelectionChange();
          }}
          onClick={() => {
            if (onSelectionChange) onSelectionChange();
          }}
          suppressContentEditableWarning
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          style={{ ...contentStyle, outline: "none", cursor: "text" }}
        />
      ) : (
        <div
          className="content-layer"
          style={contentStyle}
          dangerouslySetInnerHTML={{ __html: contenidoHTML }}
        />
      )}
      {pageNumber > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: `${MARGIN.bottom - 36}px`,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: "9pt",
            color: "#888",
            zIndex: 3,
            fontFamily: "Georgia, serif",
            letterSpacing: "0.5px",
          }}
        >
          {pageNumber}
        </div>
      )}
    </div>
  );
};

interface DocumentRendererProps {
  contenidoHTML: string;
  paginasHTML?: string[];
  isEditable?: boolean;
  onPageChange?: (index: number, nuevoHTML: string) => void;
  onContentChange?: () => void;
  onRegisterRef?: (index: number, el: HTMLDivElement | null) => void;
  onFocusPage?: (el: HTMLDivElement) => void;
  onSelectionChange?: () => void;
  documentRef?: React.RefObject<HTMLDivElement>;
  showPrint?: boolean;
  pageRef?: React.RefObject<HTMLDivElement>;
  hojaMembretada?: HojaMembretada;
}

const dividirHTMLEnPaginas = (contenidoHTML: string): string[] => {
  if (/<div[^>]*page-break[^>]*>/i.test(contenidoHTML)) {
    const partes = contenidoHTML
      .split(/<div[^>]*page-break[^>]*>[\s\S]*?<\/div>/i)
      .map((p) => p.trim())
      .filter(Boolean);
    if (partes.length > 1) return partes;
  }
  const contentWidth = 794 - MARGIN.left - MARGIN.right;
  const tempDiv = document.createElement("div");
  tempDiv.style.cssText = `position:absolute;left:-9999px;width:${contentWidth}px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.65;`;
  tempDiv.innerHTML = contenidoHTML;
  document.body.appendChild(tempDiv);
  const alturaTotal = tempDiv.scrollHeight;
  document.body.removeChild(tempDiv);
  if (alturaTotal <= CONTENT_HEIGHT) return [contenidoHTML];
  const parser = new DOMParser();
  const doc = parser.parseFromString(contenidoHTML, "text/html");
  const elementos = Array.from(doc.body.children);
  const nuevasPaginas: string[] = [];
  let paginaActual = "";
  let alturaAcumulada = 0;
  elementos.forEach((elemento) => {
    const elementoHTML = elemento.outerHTML;
    const medidor = document.createElement("div");
    medidor.style.cssText = `position:absolute;left:-9999px;width:${contentWidth}px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.65;`;
    medidor.innerHTML = elementoHTML;
    document.body.appendChild(medidor);
    const alturaElemento = medidor.scrollHeight;
    document.body.removeChild(medidor);
    if (alturaAcumulada + alturaElemento > CONTENT_HEIGHT && paginaActual) {
      nuevasPaginas.push(paginaActual);
      paginaActual = elementoHTML;
      alturaAcumulada = alturaElemento;
    } else {
      paginaActual += elementoHTML;
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
  const [paginasCalculadas, setPaginasCalculadas] = useState<string[]>([
    contenidoHTML || "",
  ]);

  useEffect(() => {
    if (isEditable) return;
    if (!contenidoHTML) {
      setPaginasCalculadas([""]);
      return;
    }

    // Evitar cálculos innecesarios si el contenido no ha cambiado realmente
    const nuevasPaginas = dividirHTMLEnPaginas(contenidoHTML);
    setPaginasCalculadas((prev) => {
      // Solo actualizar si realmente cambió
      if (
        prev.length === nuevasPaginas.length &&
        prev.every((p, i) => p === nuevasPaginas[i])
      ) {
        return prev;
      }
      return nuevasPaginas;
    });
  }, [contenidoHTML, isEditable]);

  const paginas = isEditable
    ? (paginasHTML ?? [contenidoHTML])
    : paginasCalculadas;
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
            onPageChange={
              onPageChange ? (html) => onPageChange(index, html) : undefined
            }
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
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export function CrearDocumentoNuevo({ onVolver }: CrearDocumentoNuevoProps) {
  const { user } = useAuth();
  const { generarDocumento } = useDocuments();
  const [archivoPendiente, setArchivoPendiente] = useState<File | null>(null);
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] =
    useState(false);

  // 🔍 LOG DE IDENTIFICACIÓN — versión EDITOR
  useEffect(() => {
    console.log(
      "%c🟩 CrearDocumentoNuevo ACTIVO: versión EDITOR (html2canvas + DocumentRenderer)",
      "background:#15803d;color:white;padding:4px 8px;border-radius:4px;font-weight:bold;",
    );
  }, []);

  const [nombreDocumento, setNombreDocumento] = useState("");
  const [areaDocumento, setAreaDocumento] = useState("");
  const [contenidoHTML, setContenidoHTML] = useState("");
  const [paginasHTML, setPaginasHTML] = useState<string[]>([]);
  const [documentoGuardado, setDocumentoGuardado] = useState(false);
  const [guardandoDocumento, setGuardandoDocumento] = useState(false);

  const [grokPrompt, setGrokPrompt] = useState("");
  const [grokGenerando, setGrokGenerando] = useState(false);
  const [errorGeneracion, setErrorGeneracion] = useState("");

  const documentoEditableRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const documentContainerRef = useRef<HTMLDivElement>(null);
  const pageContentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const rebalanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState("3");
  const [zoomVista, setZoomVista] = useState(75);
  const PAGE_W_PX = 794;

  const lastFocusedPageRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  const [hojaMembretadaSeleccionada, setHojaMembretadaSeleccionada] =
    useState<HojaMembretada | null>(null);
  const [hojasSelectorOpen, setHojasSelectorOpen] = useState(false);
  const [hojasMembreteadasAPI, setHojasMembreteadasAPI] = useState<
    HojaMembretadaAPI[]
  >([]);
  const [cargandoHojas, setCargandoHojas] = useState(false);
  const [modalSubirHoja, setModalSubirHoja] = useState(false);
  const [archivoHoja, setArchivoHoja] = useState<File | null>(null);
  const [nombreHoja, setNombreHoja] = useState("");
  const [descripcionHoja, setDescripcionHoja] = useState("");
  const [subiendoHoja, setSubiendoHoja] = useState(false);

  // ── Estado modal de impresión ─────────────────────────────────────────────
  const [modalImpresionAbierto, setModalImpresionAbierto] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // ── Estado para carga de documentos y campos dinámicos ────────────────────
  const [cargandoDocumento, setCargandoDocumento] = useState(false);
  const [textoNormalizado, setTextoNormalizado] = useState("");
  const [campos, setCampos] = useState<Array<{ key: string; label: string }>>(
    [],
  );
  const [valoresCampos, setValoresCampos] = useState<Record<string, string>>(
    {},
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const confirmarHojaMembretada = () => {
    if (!archivoPendiente) return;

    setArchivoHoja(archivoPendiente);
    setNombreHoja(archivoPendiente.name.replace(/\.[^/.]+$/, ""));
    setModalSubirHoja(true);

    setMostrarModalConfirmacion(false);
    setArchivoPendiente(null);
  };

  const cancelarHojaMembretada = () => {
    toast.error("El archivo no contiene información útil");
    setMostrarModalConfirmacion(false);
    setArchivoPendiente(null);
  };

  // Función para cargar y procesar documento (DOCX/PDF)
  const handleCargarDocumento = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar formato
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/pdf",
    ];

    if (!validTypes.includes(file.type)) {
      toast.error("Formato no válido", {
        description: "Solo se aceptan archivos .docx y .pdf",
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setCargandoDocumento(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No hay token de autenticación");
      }

      const response = await fetch(
        "https://extractorpwa.onrender.com/api/preview",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      console.log("📄 Respuesta del extractor:", data);

      // 🔴 ─────────────────────────────────────────────
      // 🔥 DETECCIÓN DE ARCHIVO VACÍO
      // 🔴 ─────────────────────────────────────────────
      if (data.isEmpty || data.data?.charCount < 20) {
        setArchivoPendiente(file);
        setMostrarModalConfirmacion(true);
        return;
      }

      // 🔵 ─────────────────────────────────────────────
      // FLUJO NORMAL (DOCUMENTO VÁLIDO)
      // 🔵 ─────────────────────────────────────────────

      const normalizedText = data.data?.normalizedText || data.normalizedText;

      if (!normalizedText) {
        throw new Error("La respuesta no contiene normalizedText");
      }

      setTextoNormalizado(normalizedText);

      const htmlFormateado = formatearTextoPlanoAHTML(normalizedText, true);
      const paginas = dividirHTMLEnPaginas(htmlFormateado);

      setPaginasHTML(paginas);
      setContenidoHTML(htmlFormateado);

      const fields = data.data?.fields || data.fields;
      const hasFields = data.data?.hasFields || data.hasFields;

      if (hasFields && fields && Array.isArray(fields)) {
        setCampos(fields);

        const valoresIniciales: Record<string, string> = {};
        fields.forEach((campo: { key: string }) => {
          valoresIniciales[campo.key] = "";
        });

        setValoresCampos(valoresIniciales);

        toast.success("Documento cargado exitosamente", {
          description: `Se detectaron ${fields.length} campos dinámicos`,
        });
      } else {
        setCampos([]);
        setValoresCampos({});
        toast.success("Documento cargado exitosamente");
      }
    } catch (error) {
      console.error("Error al cargar documento:", error);

      toast.error("Error al cargar documento", {
        description:
          error instanceof Error ? error.message : "Intenta de nuevo",
      });
    } finally {
      setCargandoDocumento(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Función para reemplazar {{key}} en tiempo real cuando el usuario escribe
  const handleCampoChange = (key: string, valor: string) => {
    // Actualizar el estado de valores
    setValoresCampos((prev) => ({
      ...prev,
      [key]: valor,
    }));

    // Crear un nuevo texto con todos los reemplazos
    let textoActualizado = textoNormalizado;
    const nuevosValores = { ...valoresCampos, [key]: valor };

    Object.keys(nuevosValores).forEach((k) => {
      const regex = new RegExp(`{{${k}}}`, "g");
      textoActualizado = textoActualizado.replace(
        regex,
        nuevosValores[k] || `{{${k}}}`,
      );
    });

    // Convertir a HTML y actualizar el editor
    const htmlFormateado = formatearTextoPlanoAHTML(textoActualizado, true);
    const paginas = dividirHTMLEnPaginas(htmlFormateado);
    setPaginasHTML(paginas);
    setContenidoHTML(htmlFormateado);
  };

  useEffect(() => {
    const cargarHojasMembreteadas = async () => {
      if (!areaDocumento) {
        setHojasMembreteadasAPI([]);
        return;
      }
      // ... (tu lógica de permisos se mantiene igual)

      setCargandoHojas(true);
      try {
        const response = await getHojasMembreteadasArea(areaDocumento);
        setHojasMembreteadasAPI(response.hojas);

        // 🔥 CAMBIO AQUÍ: Auto-seleccionar la primera si existe
        if (response.hojas && response.hojas.length > 0) {
          const primeraHoja = response.hojas[0];
          setHojaMembretadaSeleccionada({
            id: primeraHoja.id,
            nombre: primeraHoja.nombre,
            imagenUrl: primeraHoja.archivo.previewUrl,
          });
        } else {
          setHojaMembretadaSeleccionada(null);
        }
      } catch (error) {
        console.error("Error:", error);
        setHojasMembreteadasAPI([]);
      } finally {
        setCargandoHojas(false);
      }
    };
    cargarHojasMembreteadas();
  }, [areaDocumento]);

  const hojasDisponibles: HojaMembretada[] = React.useMemo(() => {
    if (!hojasMembreteadasAPI || hojasMembreteadasAPI.length === 0) {
      return [];
    }

    return hojasMembreteadasAPI.map((h) => ({
      id: h.id,
      nombre: h.nombre,
      imagenUrl: h.archivo.previewUrl,
    }));
  }, [hojasMembreteadasAPI]);

  const puedeSubirMembretada = user.rolApi
    ? ["ADMIN", "JEFE_AREA"].includes(user.rolApi)
    : false;

  const handleSubirHoja = async () => {
    if (!archivoHoja) {
      toast.error("Por favor selecciona un archivo");
      return;
    }
    if (!nombreHoja.trim()) {
      toast.error("Por favor ingresa un nombre para la hoja");
      return;
    }
    if (!areaDocumento) {
      toast.error("Por favor selecciona un área primero");
      return;
    }
    if (archivoHoja.size > 10 * 1024 * 1024) {
      toast.error("El archivo es demasiado grande. Máximo 10MB.");
      return;
    }
    const formatosPermitidos = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!formatosPermitidos.includes(archivoHoja.type)) {
      toast.error("Formato no válido. Usa JPG, PNG, WEBP o PDF");
      return;
    }
    setSubiendoHoja(true);
    try {
      const response = await subirHojaMembretada(
        archivoHoja,
        areaDocumento,
        nombreHoja,
        descripcionHoja || undefined,
      );
      setHojasMembreteadasAPI((prev) => [response.hoja, ...prev]);
      setHojaMembretadaSeleccionada({
        id: response.hoja.id,
        nombre: response.hoja.nombre,
        imagenUrl: response.hoja.archivo.previewUrl,
        areaId: response.hoja.areaId,
      });
      setArchivoHoja(null);
      setNombreHoja("");
      setDescripcionHoja("");
      setModalSubirHoja(false);
      toast.success("Hoja membretada subida exitosamente");
    } catch (error) {
      console.error("Error al subir hoja membretada:", error);
      toast.error("No se pudo subir la hoja membretada");
    } finally {
      setSubiendoHoja(false);
    }
  };

  if (!user) return null;

  const areas: string[] =
    user.rol === "administrador"
      ? AREAS_SISTEMA.map((a) => a.nombre)
      : user.areasPermitidas || [];

  const areasDisponibles = AREAS_SISTEMA.filter((a) =>
    areas.includes(a.nombre),
  );
  console.log("🔍 Areas debug:", {
    userRol: user.rol, // espera: 'usuario'
    userRolApi: user.rolApi, // espera: 'EMPLEADO'
    areasPermitidas: user.areasPermitidas, // espera: ['Servicios Públicos']
    areasDisponibles, // espera: [{id:'servicios-publicos', nombre:'Servicios Públicos'...}]
    areas, // espera: ['Servicios Públicos']
    areaDocumento, // espera: 'Servicios Públicos'
  });
  const sugerencias = [
    "Solicitud de vacaciones",
    "Constancia de empleo",
    "Oficio de invitación",
    "Memorándum interno",
  ];

  useEffect(() => {
    if (areaDocumento) return;
    if (areasDisponibles.length > 0) {
      setAreaDocumento(areasDisponibles[0].nombre);
    } else if (user.areasPermitidas && user.areasPermitidas.length > 0) {
      setAreaDocumento(user.areasPermitidas[0]);
    }
  }, [areasDisponibles, user.areasPermitidas]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0)
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  };
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
  const updateActiveFormats = () => {
    const formats = new Set<string>();
    if (document.queryCommandState("bold")) formats.add("bold");
    if (document.queryCommandState("italic")) formats.add("italic");
    if (document.queryCommandState("underline")) formats.add("underline");
    if (document.queryCommandState("justifyLeft")) formats.add("justifyLeft");
    if (document.queryCommandState("justifyCenter"))
      formats.add("justifyCenter");
    if (document.queryCommandState("justifyRight")) formats.add("justifyRight");
    if (document.queryCommandState("justifyFull")) formats.add("justifyFull");
    setActiveFormats(formats);
  };

  const applyFormat = (command: string, value?: string) => {
    restoreSelectionAndFocus();
    document.execCommand(command, false, value);
    updateActiveFormats();
    const activeRef = lastFocusedPageRef.current;
    if (activeRef) {
      const pageIdx =
        Array.from(pageContentRefs.current.entries()).find(
          ([, el]) => el === activeRef,
        )?.[0] ?? 0;
      handlePageChange(pageIdx, activeRef.innerHTML);
    }
  };

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    restoreSelectionAndFocus();
    document.execCommand("fontSize", false, size);
    const activeRef = lastFocusedPageRef.current;
    if (activeRef) {
      const pageIdx =
        Array.from(pageContentRefs.current.entries()).find(
          ([, el]) => el === activeRef,
        )?.[0] ?? 0;
      handlePageChange(pageIdx, activeRef.innerHTML);
    }
  };

  const generarMachoteCompleto = async () => {
    if (!grokPrompt.trim()) {
      toast.error("Por favor escribe una instrucción para generar el machote");
      return;
    }
    if (!areaDocumento) {
      toast.error("Por favor selecciona un área primero");
      return;
    }
    if (
      contenidoHTML.trim() &&
      !window.confirm(
        "Esto reemplazará el contenido actual. ¿Deseas continuar?",
      )
    )
      return;
    setGrokGenerando(true);
    setErrorGeneracion("");
    try {
      const response = await fetch(
        "https://groqq-microservice.onrender.com/api/generate-template",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ area: areaDocumento, prompt: grokPrompt }),
        },
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Error ${response.status}: ${errorText || response.statusText}`,
        );
      }
      const data = await response.json();
      if (!data.text && !data.pages)
        throw new Error('La respuesta no contiene el campo "text" ni "pages"');
      const htmlFormateado = procesarRespuestaGroq(data);
      const paginas = dividirHTMLEnPaginas(htmlFormateado);
      setPaginasHTML(paginas);
      setContenidoHTML(htmlFormateado);
      setTimeout(() => {
        setPaginasHTML((prev) => {
          if (prev.length === 0) return prev;
          const rebalanceadas = repartirDesde([...prev], 0);
          const SEP =
            '<div class="page-break" style="page-break-after:always;margin:0;"></div>';
          setContenidoHTML(rebalanceadas.join(SEP));
          return rebalanceadas;
        });
      }, 300);
      const variables = extractVariablesFromSquareBrackets(htmlFormateado);
      toast.success("¡Machote generado exitosamente!", {
        description:
          variables.length > 0
            ? `Se detectaron ${variables.length} campos dinámicos`
            : "Contenido generado",
      });
      if (!nombreDocumento.trim())
        setNombreDocumento(
          grokPrompt.length > 50
            ? grokPrompt.substring(0, 50) + "..."
            : grokPrompt,
        );
      setTimeout(() => {
        document
          .querySelector(".document-page")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (error) {
      console.error("Error al generar machote:", error);
      let errorMsg = "Error desconocido";
      if (error instanceof TypeError && error.message === "Failed to fetch")
        errorMsg =
          "No se pudo conectar al servidor. Por favor intenta de nuevo.";
      else if (error instanceof Error) errorMsg = error.message;
      setErrorGeneracion(errorMsg);
      toast.error("No se pudo generar el machote");
    } finally {
      setGrokGenerando(false);
    }
  };

  const separarOverflow = (html: string): { caben: string; sobran: string } => {
    const contentWidth = 794 - MARGIN.left - MARGIN.right;
    const contenedor = document.createElement("div");
    contenedor.style.cssText = [
      "position:absolute",
      "left:-9999px",
      "top:-9999px",
      `width:${contentWidth}px`,
      "font-family:Arial,Helvetica,sans-serif",
      "font-size:11px",
      "line-height:1.65",
      "word-break:break-word",
      "overflow:visible",
    ].join(";");
    contenedor.innerHTML = html;
    document.body.appendChild(contenedor);
    const childNodes = Array.from(contenedor.childNodes);
    const bloques: Element[] = [];
    let buffer = document.createElement("p");
    let bufferHasSomething = false;
    childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent?.trim() ?? "";
        if (t) {
          buffer.appendChild(node.cloneNode());
          bufferHasSomething = true;
        }
      } else if (node.nodeName === "BR") {
        if (bufferHasSomething) {
          bloques.push(buffer);
          buffer = document.createElement("p");
          bufferHasSomething = false;
        }
      } else {
        if (bufferHasSomething) {
          bloques.push(buffer);
          buffer = document.createElement("p");
          bufferHasSomething = false;
        }
        bloques.push(node as Element);
      }
    });
    if (bufferHasSomething) bloques.push(buffer);
    document.body.removeChild(contenedor);
    let caben = "";
    let sobran = "";
    let alturaAcumulada = 0;
    let desbordando = false;
    bloques.forEach((el) => {
      if (desbordando) {
        sobran += el.outerHTML;
        return;
      }
      const medidor = document.createElement("div");
      medidor.style.cssText = [
        "position:absolute",
        "left:-9999px",
        "top:-9999px",
        `width:${contentWidth}px`,
        "font-family:Arial,Helvetica,sans-serif",
        "font-size:11px",
        "line-height:1.65",
        "word-break:break-word",
      ].join(";");
      medidor.innerHTML = el.outerHTML;
      document.body.appendChild(medidor);
      const h = medidor.scrollHeight;
      document.body.removeChild(medidor);
      if (h === 0) return;
      if (alturaAcumulada + h > CONTENT_HEIGHT) {
        desbordando = true;
        sobran += el.outerHTML;
      } else {
        caben += el.outerHTML;
        alturaAcumulada += h;
      }
    });
    if (!sobran && alturaAcumulada > CONTENT_HEIGHT && bloques.length > 1) {
      const mitad = Math.floor(bloques.length / 2);
      caben = bloques
        .slice(0, mitad)
        .map((e) => e.outerHTML)
        .join("");
      sobran = bloques
        .slice(mitad)
        .map((e) => e.outerHTML)
        .join("");
    }
    return { caben: caben || html, sobran };
  };

  const medirAltura = (html: string): number => {
    const W = 794 - MARGIN.left - MARGIN.right;
    const m = document.createElement("div");
    m.style.cssText = [
      "position:absolute",
      "left:-9999px",
      "top:-9999px",
      `width:${W}px`,
      "font-family:Arial,Helvetica,sans-serif",
      "font-size:11px",
      "line-height:1.65",
      "word-break:break-word",
    ].join(";");
    m.innerHTML = html;
    document.body.appendChild(m);
    const h = m.scrollHeight;
    document.body.removeChild(m);
    return h;
  };

  const repartirDesde = (paginas: string[], desde: number): string[] => {
    const resultado = [...paginas];
    for (let i = desde; i < resultado.length; i++) {
      const domRef = pageContentRefs.current.get(i);
      const alturaDOM = domRef
        ? domRef.scrollHeight
        : medirAltura(resultado[i]);
      const alturaParaAbsorber = medirAltura(resultado[i]);
      if (alturaDOM > CONTENT_HEIGHT) {
        const { caben, sobran } = separarOverflow(resultado[i]);
        resultado[i] = caben;
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
            } catch {
              savedOffset = 0;
            }
          }
          domRef.innerHTML = caben;
          if (sel) {
            try {
              const maxOff = (domRef.textContent || "").length;
              const target = Math.min(savedOffset, maxOff);
              const walker = document.createTreeWalker(
                domRef,
                NodeFilter.SHOW_TEXT,
              );
              let acc = 0;
              let placed = false;
              while (walker.nextNode()) {
                const node = walker.currentNode as Text;
                const len = node.textContent?.length ?? 0;
                if (!placed && acc + len >= target) {
                  const range = document.createRange();
                  range.setStart(node, target - acc);
                  range.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(range);
                  placed = true;
                  break;
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
            } catch {
              /* ignorar */
            }
          }
        }
        if (sobran) {
          if (i + 1 < resultado.length)
            resultado[i + 1] = sobran + resultado[i + 1];
          else resultado.push(sobran);
        }
      } else {
        if (i + 1 < resultado.length && resultado[i + 1]?.trim()) {
          const sigParser = new DOMParser();
          const sigDoc = sigParser.parseFromString(
            resultado[i + 1],
            "text/html",
          );
          const sigEls = Array.from(sigDoc.body.children);
          let alturaActual = alturaParaAbsorber;
          let absorbidos = "";
          let resto = "";
          let absorbiendo = true;
          sigEls.forEach((el) => {
            if (!absorbiendo) {
              resto += el.outerHTML;
              return;
            }
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
            const ref = pageContentRefs.current.get(i);
            if (ref) ref.innerHTML = resultado[i];
            if (!resto.trim()) resultado.splice(i + 1, 1);
            else resultado[i + 1] = resto;
          }
        }
        if (i > 0 && !resultado[i]?.trim()) {
          resultado.splice(i, 1);
          i--;
        }
      }
    }
    return resultado;
  };

  const rebalanceTodas = () => {
    if (rebalanceTimerRef.current) clearTimeout(rebalanceTimerRef.current);
    rebalanceTimerRef.current = setTimeout(() => {
      const scrollEl = scrollContainerRef.current;
      const savedScroll = scrollEl ? scrollEl.scrollTop : 0;
      setPaginasHTML((prev) => {
        if (prev.length === 0) return prev;
        const rebalanceadas = repartirDesde([...prev], 0);
        const cambio =
          rebalanceadas.some((p, i) => p !== prev[i]) ||
          rebalanceadas.length !== prev.length;
        if (!cambio) return prev;
        const SEP =
          '<div class="page-break" style="page-break-after:always;margin:0;"></div>';
        setContenidoHTML(rebalanceadas.join(SEP));
        requestAnimationFrame(() => {
          if (scrollEl) scrollEl.scrollTop = savedScroll;
        });
        return rebalanceadas;
      });
    }, 400);
  };

  const handlePageChange = (pageIndex: number, nuevoHTML: string) => {
    const scrollEl = scrollContainerRef.current;
    const savedScroll = scrollEl ? scrollEl.scrollTop : 0;
    setPaginasHTML((prev) => {
      const base = [...prev];
      base[pageIndex] = nuevoHTML;
      const resultado = repartirDesde(base, pageIndex);
      const SEP =
        '<div class="page-break" style="page-break-after:always;margin:0;"></div>';
      setContenidoHTML(resultado.join(SEP));
      requestAnimationFrame(() => {
        if (scrollEl) scrollEl.scrollTop = savedScroll;
      });
      return resultado;
    });
    rebalanceTodas();
  };

  const handleGuardarDocumento = async () => {
    if (!nombreDocumento.trim()) {
      toast.error("Por favor ingresa un nombre para el documento");
      return;
    }
    if (!contenidoHTML.trim()) {
      toast.error("El contenido del documento no puede estar vacío");
      return;
    }
    if (!areaDocumento) {
      toast.error("Por favor selecciona un área");
      return;
    }
    setGuardandoDocumento(true);
    try {
      const payload: any = {
        title: nombreDocumento,
        area: areaDocumento,
        contentHtml: contenidoHTML,
        letterheadUrl: hojaMembretadaSeleccionada?.imagenUrl || null,
      };
      if (hojaMembretadaSeleccionada?.areaId)
        payload.letterheadRef = {
          id: hojaMembretadaSeleccionada.id,
          areaId: hojaMembretadaSeleccionada.areaId,
          nombre: hojaMembretadaSeleccionada.nombre,
        };
      const response = await createMachote(payload);
      const textoPlano =
        documentoEditableRef.current?.innerText ||
        extraerTextoPlano(contenidoHTML);
      generarDocumento({
        machoteId: response._id || `nuevo-${Date.now()}`,
        nombreMachote: nombreDocumento,
        area: areaDocumento,
        usuario: user.nombre,
        contenido: textoPlano,
        camposUtilizados: {},
      });
      setDocumentoGuardado(true);
      toast.success("Documento guardado exitosamente");
    } catch (error) {
      console.error("Error al guardar documento:", error);
      toast.error("No se pudo guardar. Reintenta.");
    } finally {
      setGuardandoDocumento(false);
    }
  };

  const handleDescargarPDF = async () => {
    console.log(
      "%c📥 [v.EDITOR] handleDescargarPDF llamado → usando helper pdfExport",
      "background:#15803d;color:white;padding:4px 8px;border-radius:4px;font-weight:bold;",
    );
    if (!nombreDocumento.trim()) {
      toast.error("Por favor ingresa un nombre");
      return;
    }
    if (!contenidoHTML.trim()) {
      toast.error("El contenido no puede estar vacío");
      return;
    }

    const contenedor = documentContainerRef.current;
    if (!contenedor) {
      toast.error("No se pudo obtener la referencia del documento");
      return;
    }

    const nombreLimpio = nombreDocumento.replace(/\s+/g, "_");
    const nombrePDF = `${nombreLimpio}_${Date.now()}.pdf`;

    const pdf = await exportarDocumentoAPDF(
      contenedor,
      nombrePDF,
      "document-page",
    );

    if (pdf) {
      pdf.save(nombrePDF);
      toast.success("PDF descargado correctamente");
    }
  };

  const handleDescargarDOCX = async () => {
    if (!nombreDocumento.trim()) {
      toast.error("Por favor ingresa un nombre");
      return;
    }
    if (!contenidoHTML.trim()) {
      toast.error("El contenido no puede estar vacío");
      return;
    }

    try {
      const {
        Document,
        Packer,
        Paragraph,
        TextRun,
        ImageRun,
        AlignmentType,
        HeadingLevel,
        Header,
        convertInchesToTwip,
        PageSize,
      } = await import("docx");

      // ── 1. Cargar la imagen del membrete como ArrayBuffer ──────────────────
      let headerChildren: any[] = [];

      const membreteSrc = hojaMembretadaSeleccionada?.imagenUrl;

      if (!membreteSrc) {
        console.warn("Sin membrete");
      }
      try {
        const resp = await fetch(membreteSrc);
        const blob = await resp.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);

        // Detectar formato por magic bytes
        const isJpeg = uint8[0] === 0xff && uint8[1] === 0xd8;
        const isPng = uint8[0] === 0x89 && uint8[1] === 0x50;
        const imgType = isJpeg ? "jpg" : isPng ? "png" : "png";

        // Ancho de página carta menos márgenes (en EMUs: 1 pulgada = 914400 EMU)
        // Página: 8.5" × 11" → contenido 6.5" de ancho, membrete ocupa ancho completo = 8.5"
        headerChildren = [
          new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [
              new ImageRun({
                data: uint8,
                transformation: {
                  width: convertInchesToTwip(8.5) / 20, // 8.5" en puntos → ~612 px
                  height: convertInchesToTwip(2.2) / 20, // altura del membrete ~2.2"
                },
                type: imgType as "jpg" | "png",
              }),
            ],
          }),
        ];
      } catch (imgErr) {
        console.warn("No se pudo cargar el membrete para DOCX:", imgErr);
        // Continuar sin membrete antes que fallar
      }

      // ── 2. Parsear el HTML del editor ──────────────────────────────────────
      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(contenidoHTML, "text/html");

      const extractRuns = (el: Element): any[] => {
        const runs: any[] = [];
        el.childNodes.forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent || "";
            if (text) runs.push(new TextRun({ text, font: "Arial", size: 22 }));
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const c = child as Element;
            const tag = c.tagName?.toLowerCase();
            const isBold = ["b", "strong"].includes(tag);
            const isItalic = ["i", "em"].includes(tag);
            const isUnderline = tag === "u";
            const innerText = c.textContent || "";
            if (innerText) {
              runs.push(
                new TextRun({
                  text: innerText,
                  bold: isBold,
                  italics: isItalic,
                  underline: isUnderline ? {} : undefined,
                  font: "Arial",
                  size: 22,
                }),
              );
            }
          }
        });
        if (runs.length === 0 && el.textContent?.trim()) {
          runs.push(
            new TextRun({ text: el.textContent, font: "Arial", size: 22 }),
          );
        }
        return runs;
      };

      const paragraphs: any[] = [];

      htmlDoc.body.childNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          if (node.textContent?.trim()) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: node.textContent,
                    font: "Arial",
                    size: 22,
                  }),
                ],
              }),
            );
          }
          return;
        }
        const el = node as Element;
        const tag = el.tagName?.toLowerCase();

        if (["h1", "h2", "h3", "h4"].includes(tag)) {
          const lvlMap: Record<string, any> = {
            h1: HeadingLevel.HEADING_1,
            h2: HeadingLevel.HEADING_2,
            h3: HeadingLevel.HEADING_3,
            h4: HeadingLevel.HEADING_4,
          };
          paragraphs.push(
            new Paragraph({ heading: lvlMap[tag], children: extractRuns(el) }),
          );
        } else if (tag === "p" || tag === "div") {
          const style = el.getAttribute("style") || "";
          let alignment: any;
          if (/text-align:\s*center/.test(style))
            alignment = AlignmentType.CENTER;
          else if (/text-align:\s*right/.test(style))
            alignment = AlignmentType.RIGHT;
          else if (/text-align:\s*justify/.test(style))
            alignment = AlignmentType.JUSTIFIED;

          const runs = extractRuns(el);
          paragraphs.push(
            new Paragraph({
              alignment,
              spacing: { before: 0, after: 80 },
              children: runs.length
                ? runs
                : [new TextRun({ text: "", font: "Arial", size: 22 })],
            }),
          );
        } else if (tag === "br") {
          paragraphs.push(
            new Paragraph({ children: [new TextRun({ text: "" })] }),
          );
        }
      });

      if (paragraphs.length === 0) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: contenidoHTML.replace(/<[^>]+>/g, ""),
                font: "Arial",
                size: 22,
              }),
            ],
          }),
        );
      }

      // ── 3. Construir el documento ──────────────────────────────────────────
      const docxDoc = new Document({
        styles: {
          default: { document: { run: { font: "Arial", size: 22 } } },
        },
        sections: [
          {
            properties: {
              page: {
                size: { width: 12240, height: 15840 }, // US Letter
                margin: {
                  top: convertInchesToTwip(2.2), // espacio para el membrete
                  bottom: convertInchesToTwip(1),
                  left: convertInchesToTwip(1),
                  right: convertInchesToTwip(1),
                },
              },
            },
            headers: {
              default: new Header({ children: headerChildren }),
            },
            children: paragraphs,
          },
        ],
      });

      // ── 4. Descargar ───────────────────────────────────────────────────────
      const blob = await Packer.toBlob(docxDoc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${nombreDocumento.replace(/\s+/g, "_")}_${Date.now()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Documento DOCX descargado");
    } catch (error) {
      console.error("Error al generar DOCX:", error);
      toast.error("No se pudo generar el archivo DOCX");
    }
  };

  // ── handleImprimir: genera HTML de impresión y muestra diálogo nativo ──
  const handleImprimir = async () => {
    console.log(
      "%c🖨️ [v.EDITOR] handleImprimir llamado → usando helper pdfExport",
      "background:#15803d;color:white;padding:4px 8px;border-radius:4px;font-weight:bold;",
    );
    if (!nombreDocumento.trim()) {
      toast.error("Por favor ingresa un nombre");
      return;
    }
    if (!contenidoHTML.trim()) {
      toast.error("El contenido no puede estar vacío");
      return;
    }

    const contenedor = documentContainerRef.current;
    if (!contenedor) {
      toast.error("No se pudo preparar el documento para impresión");
      return;
    }

    // Capturar el HTML ya renderizado
    const contenidoHTMLReal = contenedor.innerHTML;

    // Crear HTML de impresión con dimensiones REALES en carta
    const printHTML = generarHTMLImpresion(contenidoHTMLReal, nombreDocumento);

    // Crear iframe de impresión
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      toast.error("No se pudo abrir el diálogo de impresión");
      return;
    }

    iframeDoc.open();
    iframeDoc.write(printHTML);
    iframeDoc.close();

    // Función para imprimir
    let printed = false;
    const doPrint = () => {
      if (printed) return;
      printed = true;

      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error("Error al imprimir:", e);
        toast.error("Error al abrir el diálogo de impresión");
      }

      // Limpiar después de imprimir
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    };

    // Si hay hoja membretada, esperar a que cargue
    if (hojaMembretadaSeleccionada) {
      iframe.contentWindow?.addEventListener("load", doPrint);
      setTimeout(doPrint, 2500);
    } else {
      setTimeout(doPrint, 500);
    }
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
                    {areas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {
                <>
                  <Popover
                    open={hojasSelectorOpen}
                    onOpenChange={setHojasSelectorOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`
                          h-9 gap-2 px-4 transition-all duration-300 relative overflow-hidden group
                          ${
                            hojaMembretadaSeleccionada
                              ? "border-primary/60 bg-primary/5 text-primary shadow-sm" // Estado: Ya seleccionado
                              : "border-solid border-primary/50 bg-primary/[0.02] animate-in fade-in zoom-in duration-500 shadow-[0_0_8px_rgba(var(--primary),0.1)] hover:bg-primary/[0.05]" // Estado: Invitación a actuar
                          }
                        `}
                      >
                        {/* Punto de notificación llamativo (solo si no hay selección) */}
                        {!hojaMembretadaSeleccionada && (
                          <span className="absolute top-1 right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                          </span>
                        )}

                        {hojaMembretadaSeleccionada ? (
                          <Sparkles className="h-4 w-4 text-primary" />
                        ) : (
                          <FileUp className="h-4 w-4 text-primary animate-bounce-slow" />
                        )}

                        <span
                          className={`text-xs font-bold truncate max-w-[150px] ${!hojaMembretadaSeleccionada ? "text-primary" : ""}`}
                        >
                          {hojaMembretadaSeleccionada?.nombre ||
                            "Cargar Hoja Membretada"}
                        </span>

                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-2" align="end">
                      <div className="space-y-1">
                        <div className="px-2 py-1.5">
                          <p className="text-xs font-semibold text-gray-700">
                            Seleccionar Plantilla
                          </p>
                          <p className="text-xs text-gray-500">
                            {hojasDisponibles.length} disponibles
                          </p>
                        </div>
                        <Separator />
                        <div className="max-h-80 overflow-y-auto space-y-1">
                          {hojasDisponibles.map((hoja) => (
                            <button
                              key={hoja.id}
                              onClick={() => {
                                setHojaMembretadaSeleccionada(hoja);
                                setHojasSelectorOpen(false);
                                toast.success(`Plantilla: ${hoja.nombre}`);
                              }}
                              className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors hover:bg-gray-100 ${hojaMembretadaSeleccionada?.id === hoja.id ? "bg-gray-100 border border-gray-300" : "border border-transparent"}`}
                            >
                              <div className="w-12 h-16 flex-shrink-0 bg-white rounded border border-gray-200 overflow-hidden shadow-sm">
                                <img
                                  src={hoja.imagenUrl}
                                  alt={hoja.nombre}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm font-medium text-gray-900">
                                  {hoja.nombre}
                                </p>
                                {hojaMembretadaSeleccionada?.id === hoja.id && (
                                  <p className="text-xs text-gray-600 font-medium flex items-center gap-1 mt-0.5">
                                    <Check className="h-3 w-3" />
                                    Seleccionada
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
                                onClick={() => {
                                  setModalSubirHoja(true);
                                  setHojasSelectorOpen(false);
                                }}
                                variant="outline"
                                size="sm"
                                className="w-full gap-2 text-gray-700 border-gray-300 hover:bg-gray-100"
                              >
                                <Plus className="h-4 w-4" />
                                Subir Nueva Hoja
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Separator orientation="vertical" className="h-6" />
                </>
              }
              <Button
                onClick={handleGuardarDocumento}
                size="sm"
                className="bg-green-600 hover:bg-green-700 h-8"
              >
                {guardandoDocumento ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
              {/* OCULTOS EN CREACIÓN - Los botones PDF e Imprimir están deshabilitados en modo creación */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Download className="h-3.5 w-3.5" />
                    <span>Exportar</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={handleDescargarPDF}
                    className="gap-2 cursor-pointer"
                  >
                    <FileText className="h-4 w-4 text-red-500" />
                    Descargar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDescargarDOCX}
                    className="gap-2 cursor-pointer"
                  >
                    <FileText className="h-4 w-4 text-blue-500" />
                    Descargar DOCX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>{" "}
              {/* <Button onClick={handleImprimir} variant="outline" size="sm" className="h-8"><Printer className="h-3.5 w-3.5 mr-2" />Imprimir</Button> */}
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 w-full">
                    <Input
                      value={grokPrompt}
                      onChange={(e) => setGrokPrompt(e.target.value)}
                      placeholder="Describe el documento que necesitas generar..."
                      className="h-9 text-sm flex-1"
                      onKeyDown={(e) =>
                        e.key === "Enter" && generarMachoteCompleto()
                      }
                    />
                    <Button
                      onClick={generarMachoteCompleto}
                      disabled={
                        grokGenerando || !grokPrompt.trim() || !areaDocumento
                      }
                      className="bg-gray-800 hover:bg-gray-900 h-9 shrink-0"
                      size="sm"
                    >
                      {grokGenerando ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Generar
                        </>
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={cargandoDocumento || !areaDocumento}
                    variant="outline"
                    className="h-9 w-full sm:w-auto shrink-0"
                    size="sm"
                  >
                    {cargandoDocumento ? (
                      <>
                        <div className="h-4 w-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin mr-2" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <FileUp className="h-4 w-4 mr-2" />
                        Cargar documento
                      </>
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.pdf"
                    onChange={handleCargarDocumento}
                    className="hidden"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sugerencias.map((s) => (
                    <button
                      key={s}
                      onClick={() => setGrokPrompt(s)}
                      className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-200 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {errorGeneracion && (
                  <Alert className="bg-red-50 border-red-200 py-2">
                    <AlertDescription className="text-xs text-red-900">
                      {errorGeneracion}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Barra de formato + zoom ── */}
        <div className="sticky top-[61px] z-40 bg-white border border-gray-200 rounded-t-lg shadow-sm">
          <div className="flex items-center justify-between gap-2 py-2 px-4">
            <div className="flex items-center gap-1 flex-wrap">
              {[
                {
                  cmd: "bold",
                  icon: <Bold className="h-4 w-4" />,
                  label: "Negrita",
                },
                {
                  cmd: "italic",
                  icon: <Italic className="h-4 w-4" />,
                  label: "Cursiva",
                },
                {
                  cmd: "underline",
                  icon: <Underline className="h-4 w-4" />,
                  label: "Subrayado",
                },
              ].map(({ cmd, icon, label }) => (
                <button
                  key={cmd}
                  aria-label={label}
                  title={label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyFormat(cmd);
                  }}
                  className={[
                    "h-7 w-7 flex items-center justify-center rounded text-sm transition-colors",
                    activeFormats.has(cmd)
                      ? "bg-gray-800 text-white"
                      : "hover:bg-gray-100 text-gray-700",
                  ].join(" ")}
                >
                  {icon}
                </button>
              ))}
              <Separator orientation="vertical" className="h-5 mx-1" />
              {[
                {
                  cmd: "justifyLeft",
                  icon: <AlignLeft className="h-4 w-4" />,
                  label: "Izquierda",
                },
                {
                  cmd: "justifyCenter",
                  icon: <AlignCenter className="h-4 w-4" />,
                  label: "Centrar",
                },
                {
                  cmd: "justifyRight",
                  icon: <AlignRight className="h-4 w-4" />,
                  label: "Derecha",
                },
                {
                  cmd: "justifyFull",
                  icon: <AlignJustify className="h-4 w-4" />,
                  label: "Justificar",
                },
              ].map(({ cmd, icon, label }) => (
                <button
                  key={cmd}
                  aria-label={label}
                  title={label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyFormat(cmd);
                  }}
                  className={[
                    "h-7 w-7 flex items-center justify-center rounded text-sm transition-colors",
                    activeFormats.has(cmd)
                      ? "bg-gray-800 text-white"
                      : "hover:bg-gray-100 text-gray-700",
                  ].join(" ")}
                >
                  {icon}
                </button>
              ))}
              <Separator orientation="vertical" className="h-5 mx-1" />
              <div className="flex items-center gap-1.5">
                <Type className="h-4 w-4 text-gray-500" />
                <Select value={fontSize} onValueChange={handleFontSizeChange}>
                  <SelectTrigger className="w-20 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      ["1", "8pt"],
                      ["2", "10pt"],
                      ["3", "12pt"],
                      ["4", "14pt"],
                      ["5", "18pt"],
                      ["6", "24pt"],
                      ["7", "36pt"],
                    ].map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 border-l pl-3 ml-1">
              <button
                onClick={() => setZoomVista((z) => Math.max(30, z - 10))}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 transition-colors"
                title="Reducir zoom"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs tabular-nums text-gray-600 min-w-[34px] text-center">
                {zoomVista}%
              </span>
              <button
                onClick={() => setZoomVista((z) => Math.min(150, z + 10))}
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

        {/* ── Área del documento ── */}
        <div
          ref={scrollContainerRef}
          className="bg-[#404040] rounded-b-lg overflow-auto"
          style={{ height: "680px" }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "28px 32px",
              zoom: zoomVista / 100,
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
                onFocusPage={(el) => {
                  lastFocusedPageRef.current = el;
                  saveSelection();
                }}
                onSelectionChange={() => {
                  saveSelection();
                  updateActiveFormats();
                }}
                documentRef={documentoEditableRef}
                pageRef={pageRef}
                hojaMembretada={hojaMembretadaSeleccionada}
              />
            </div>
          </div>
        </div>
        {mostrarModalConfirmacion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full text-center">
              <h2 className="text-lg font-bold mb-2">Archivo sin contenido</h2>
              <p className="text-sm text-gray-600 mb-4">
                Este archivo no contiene texto.
                <br />
                Parece que subiste una hoja membretada (sin texto). Para
                continuar: • Sube el archivo como PDF o imagen (JPG, PNG) • O
                carga un documento con contenido editable"{" "}
              </p>

              <div className="flex gap-2 justify-center">
                <Button onClick={confirmarHojaMembretada}>
                  Sí, usar como membretada
                </Button>

                <Button variant="outline" onClick={cancelarHojaMembretada}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>

      {/* ── Versión para impresión ── */}
      <div className="print-only">
        <DocumentRenderer
          contenidoHTML={contenidoHTML}
          isEditable={false}
          showPrint={true}
          hojaMembretada={hojaMembretadaSeleccionada}
        />
      </div>

      {/* ── Modal éxito ── */}
      {documentoGuardado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              ¡Documento Guardado!
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              El documento se ha guardado correctamente
            </p>
            <div className="space-y-2">
              {/* OCULTOS EN CREACIÓN - Los botones PDF e Imprimir están deshabilitados en modo creación */}
              {/* <Button onClick={handleDescargarPDF} variant="outline" className="w-full" size="sm"><Download className="h-3.5 w-3.5 mr-2" />Descargar PDF</Button> */}
              {/* <Button onClick={handleImprimir} variant="outline" className="w-full" size="sm"><Printer className="h-3.5 w-3.5 mr-2" />Imprimir</Button> */}
              <Button
                onClick={onVolver}
                className="w-full bg-gray-800 hover:bg-gray-900"
                size="sm"
              >
                Volver a Machotes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de impresión ── */}
      <PrintPreviewModal
        isOpen={modalImpresionAbierto}
        onClose={() => {
          setModalImpresionAbierto(false);
          if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
          }
        }}
        contenido=""
        nombreDocumento={nombreDocumento || "Documento Nuevo"}
        pdfUrl={pdfPreviewUrl || undefined}
      />

      {/* ── Modal subir hoja membretada ── */}
      <Dialog open={modalSubirHoja} onOpenChange={setModalSubirHoja}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Subir Nueva Hoja Membretada</DialogTitle>
            <DialogDescription className="font-bold">
              Sube una hoja membretada para {areaDocumento}. Formatos: JPG, PNG,
              WEBP, PDF (máx. 10MB)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="archivo-hoja">Archivo *</Label>
              <Input
                id="archivo-hoja"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => setArchivoHoja(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
              {archivoHoja && (
                <p className="text-xs text-gray-500">
                  {archivoHoja.name} (
                  {(archivoHoja.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre-hoja">Nombre *</Label>
              <Input
                id="nombre-hoja"
                value={nombreHoja}
                onChange={(e) => setNombreHoja(e.target.value)}
                placeholder="Ej: RH - Oficial 2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion-hoja">Descripción (opcional)</Label>
              <Textarea
                id="descripcion-hoja"
                value={descripcionHoja}
                onChange={(e) => setDescripcionHoja(e.target.value)}
                placeholder="Describe brevemente esta hoja..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalSubirHoja(false);
                setArchivoHoja(null);
                setNombreHoja("");
                setDescripcionHoja("");
              }}
              disabled={subiendoHoja}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubirHoja}
              disabled={subiendoHoja || !archivoHoja || !nombreHoja.trim()}
              className="bg-gray-800 hover:bg-gray-900"
            >
              {subiendoHoja ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Hoja
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
