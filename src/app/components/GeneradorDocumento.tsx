import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDocuments } from '../contexts/DocumentContext';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArrowLeft, Download, Printer, Save, CheckCircle, Edit3, ZoomIn, ZoomOut, Maximize2, Minimize2, Loader2, Copy, Trash2, RotateCcw, Expand } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { EditorMachote } from './EditorMachote';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { getMachote as apiGetMachote, updateMachote as apiUpdateMachote, deactivateMachote as apiDeactivateMachote, reactivateMachote as apiReactivateMachote, getAreaKey, getHojasMembreteadasArea, HojaMembretadaAPI, createDocumento, updateDocumento, DocumentoAPI } from '../services/api';
import { nombreAreaAId } from '../utils/areas';
import membreteImage from 'figma:asset/f486ee75730424b368ebdf6b113e550e2c7acb26.png';
import { SafeLetterheadImage } from './SafeLetterheadImage';
import { UnifiedDocumentRenderer, HojaMembretada as UnifiedHojaMembretada, formatearTextoPlanoAHTML } from './UnifiedDocumentRenderer';
import { exportarDocumentoAPDF, generarHTMLImpresion } from '../utils/pdfExport';

interface GeneradorDocumentoProps {
  machoteId: string;
  onVolver: () => void;
  documentoId?: string;
  camposIniciales?: Record<string, string>;
}

function detectarFormatoImagen(url: string): string {
  const urlLower = url.toLowerCase().split('?')[0];
  if (urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg')) return 'JPEG';
  if (urlLower.endsWith('.webp')) return 'WEBP';
  if (urlLower.endsWith('.png')) return 'PNG';
  if (urlLower.includes('.jpg') || urlLower.includes('.jpeg') || urlLower.includes('f_jpg')) return 'JPEG';
  if (urlLower.includes('.webp') || urlLower.includes('f_webp')) return 'WEBP';
  return 'JPEG';
}

export function GeneradorDocumento({ machoteId, onVolver, documentoId, camposIniciales }: GeneradorDocumentoProps) {
  const { user } = useAuth();
  const { machotes, generarDocumento, editarMachote, obtenerHojasMembreteadasPorArea } = useDocuments();
  const machote = machotes.find(m => m.id === machoteId);

  const modoEdicion = !!documentoId;

  const [valoresVariables, setValoresVariables] = useState<Record<string, string>>(camposIniciales ?? {});
  const [documentoGuardado, setDocumentoGuardado] = useState(false);
  const [modoEditorMachote, setModoEditorMachote] = useState(false);
  const [contenidoMachoteEditado, setContenidoMachoteEditado] = useState(machote?.contenido ?? '');
  const [zoomLevel, setZoomLevel] = useState(75); // ✅ Igualado a 75% como en CrearDocumentoNuevo
  const [hojaSeleccionada, setHojaSeleccionada] = useState<string>('');
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [guardandoMachote, setGuardandoMachote] = useState(false);
  const [nuevoPlaceholder, setNuevoPlaceholder] = useState('');
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [machoteAPI, setMachoteAPI] = useState<any>(null);
  const [cargandoMachote, setCargandoMachote] = useState(false);
  const [documentoAPIId, setDocumentoAPIId] = useState<string | null>(documentoId ?? null);
  const [guardandoDocumento, setGuardandoDocumento] = useState(false);
  const [hojasMembreteadasAPI, setHojasMembreteadasAPI] = useState<HojaMembretadaAPI[]>([]);
  const [cargandoHojas, setCargandoHojas] = useState(false);

  const vistaPreviewRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const documentRendererRef = useRef<HTMLDivElement>(null); // ✅ Ref para capturar el contenido renderizado

  useEffect(() => {
    if (machoteId) {
      setCargandoMachote(true);
      apiGetMachote(machoteId)
        .then(data => {
          setMachoteAPI(data);
          if (modoEditorMachote) {
            const contenido = data.content?.text || data.content?.html || machote?.contenido;
            setContenidoMachoteEditado(contenido);
          }
        })
        .catch(error => console.error('❌ Error al cargar machote:', error))
        .finally(() => setCargandoMachote(false));
    }
  }, [machoteId]);

  useEffect(() => {
    const cargarHojasMembreteadas = async () => {
      if (!machote || !machote.area) return;
      setCargandoHojas(true);
      try {
        const response = await getHojasMembreteadasArea(machote.area);
        setHojasMembreteadasAPI(response.hojas);
        if (machoteAPI?.letterheadRef?.id) {
          const hojaCoincidente = response.hojas.find(h => h.id === machoteAPI.letterheadRef.id);
          if (hojaCoincidente) setHojaSeleccionada(hojaCoincidente.id);
          else if (response.hojas.length > 0) setHojaSeleccionada(response.hojas[0].id);
        } else if (response.hojas.length > 0 && !hojaSeleccionada) {
          setHojaSeleccionada(response.hojas[0].id);
        }
      } catch (error) {
        console.error('❌ Error al cargar hojas membretadas:', error);
        setHojasMembreteadasAPI([]);
      } finally {
        setCargandoHojas(false);
      }
    };
    cargarHojasMembreteadas();
  }, [machote?.area, machoteAPI]);

  const detectarVariablesDesdeTexto = (texto: string): string[] => {
    const regex = /\[(.*?)\]/g;
    const variables: string[] = [];
    const variablesUnicas = new Set<string>();
    let match;
    while ((match = regex.exec(texto)) !== null) {
      const variable = match[1].trim();
      if (variable && !variablesUnicas.has(variable)) { variablesUnicas.add(variable); variables.push(variable); }
    }
    return variables;
  };

  const [variablesDetectadas, setVariablesDetectadas] = useState<string[]>([]);

  useEffect(() => {
    if (modoEditorMachote) {
      const variables = detectarVariablesDesdeTexto(contenidoMachoteEditado);
      setVariablesDetectadas(variables);
    }
  }, [contenidoMachoteEditado, modoEditorMachote]);

  const hojasDisponibles = hojasMembreteadasAPI.length > 0
    ? hojasMembreteadasAPI.map(hoja => ({ id: hoja.id, nombre: hoja.nombre, imagenUrl: hoja.archivo.previewUrl }))
    : (machote ? obtenerHojasMembreteadasPorArea(machote.area) : []);

  useEffect(() => {
    if (machote) setContenidoMachoteEditado(machote.contenido);
  }, [machote?.id, machote?.contenido]);

  useEffect(() => {
    const handleFullscreenChange = () => setPantallaCompleta(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  if (!machote || !user) return null;

  const extraerVariables = (contenido: string): string[] => {
    const regex = /\[([^\]]+)\]/g;
    const variables: string[] = [];
    let match;
    while ((match = regex.exec(contenido)) !== null) {
      if (!variables.includes(match[1])) variables.push(match[1]);
    }
    return variables;
  };

  const variables = extraerVariables(machote.contenido);

  useEffect(() => {
    setValoresVariables(prev => {
      const fechaActual = new Date();
      const fechaFormateada = fechaActual.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
      const añoActual = fechaActual.getFullYear().toString();
      const diaDelMes = fechaActual.getDate().toString();
      const horaFormateada = fechaActual.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
      const valoresIniciales: Record<string, string> = {};
      variables.forEach(variable => {
        if (prev[variable] !== undefined) { valoresIniciales[variable] = prev[variable]; return; }
        const vl = variable.toLowerCase();
        if (vl === 'fecha' || vl.includes('fecha')) valoresIniciales[variable] = fechaFormateada;
        else if (vl === 'año' || vl === 'ano' || vl.includes('año') || vl.includes('ano')) valoresIniciales[variable] = añoActual;
        else if (vl === 'dia' || vl === 'día') valoresIniciales[variable] = diaDelMes;
        else if (vl === 'hora') valoresIniciales[variable] = horaFormateada;
        else valoresIniciales[variable] = '';
      });
      return valoresIniciales;
    });
  }, [variables.join(',')]);

  const generarVistaPrevia = (): string => {
    let contenidoFinal = machote.contenido;
    Object.keys(valoresVariables).forEach(variable => {
      const valor = valoresVariables[variable] || `[${variable}]`;
      const regex = new RegExp(`\\[${variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
      contenidoFinal = contenidoFinal.replace(regex, valor);
    });
    return contenidoFinal;
  };

  const contenidoFinal = generarVistaPrevia();
  const usarHojaMembretada = hojasDisponibles.length > 0;
  const hojaActual = hojasDisponibles.find(h => h.id === hojaSeleccionada);

  const aumentarZoom  = () => setZoomLevel(prev => Math.min(prev + 10, 150));
  const disminuirZoom = () => setZoomLevel(prev => Math.max(prev - 10, 30));
  const resetearZoom  = () => setZoomLevel(75); // ✅ Igualado a 75% como en CrearDocumentoNuevo
  const togglePreviewExpanded = () => setPreviewExpanded(!previewExpanded);

  const togglePantallaCompleta = async () => {
    if (!vistaPreviewRef.current) return;
    try {
      if (!pantallaCompleta) {
        if (vistaPreviewRef.current.requestFullscreen) await vistaPreviewRef.current.requestFullscreen();
        else if ((vistaPreviewRef.current as any).webkitRequestFullscreen) await (vistaPreviewRef.current as any).webkitRequestFullscreen();
        setPantallaCompleta(true);
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
        setPantallaCompleta(false);
      }
    } catch (error) {
      console.warn('Pantalla completa no disponible en este entorno');
    }
  };

  const handleCambioVariable = (variable: string, valor: string) => {
    setValoresVariables(prev => ({ ...prev, [variable]: valor }));
  };

  const handleGuardarDocumento = async () => {
    if (!user) return;
    setGuardandoDocumento(true);
    try {
      if (documentoAPIId) {
        await updateDocumento(documentoAPIId, { campos: valoresVariables });
        toast.success('Documento actualizado correctamente');
      } else {
        const documento = await createDocumento({ machoteId, campos: valoresVariables, status: 'borrador' });
        setDocumentoAPIId(documento._id);
        generarDocumento({ machoteId: machote.id, nombreMachote: machote.nombre, area: machote.area, usuario: user.nombre, contenido: contenidoFinal, camposUtilizados: valoresVariables });
        toast.success('Documento guardado correctamente');
      }
      setDocumentoGuardado(true);
    } catch (error) {
      console.error('❌ Error al guardar documento:', error);
      toast.error('Error al guardar el documento');
    } finally {
      setGuardandoDocumento(false);
    }
  };

  const handleFinalizarDocumento = async () => {
    if (!documentoAPIId) { toast.error('Primero guarda el documento antes de finalizarlo'); return; }
    setGuardandoDocumento(true);
    try {
      await updateDocumento(documentoAPIId, { status: 'final' });
      toast.success('Documento marcado como final');
      setDocumentoGuardado(true);
    } catch (error) {
      console.error('❌ Error al finalizar documento:', error);
      toast.error('Error al finalizar el documento');
    } finally {
      setGuardandoDocumento(false);
    }
  };

  const handleDescargarPDF = async () => {
    if (!documentRendererRef.current) {
      toast.error('No se encontró el documento para generar PDF');
      return;
    }

    const nombreLimpio = machote.nombre
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');
    const nombrePDF = `${nombreLimpio}_${Date.now()}.pdf`;

    const pdf = await exportarDocumentoAPDF(documentRendererRef.current, nombrePDF, 'unified');
    
    if (pdf) {
      pdf.save(nombrePDF);
      toast.success('PDF descargado correctamente');
    }
  };

  const handleImprimir = () => {
    if (!documentRendererRef.current) {
      toast.error('No se pudo preparar el documento para impresión');
      return;
    }

    // Capturar el HTML ya renderizado del UnifiedDocumentRenderer
    const contenidoHTML = documentRendererRef.current.innerHTML;
    
    // Crear HTML de impresión con dimensiones REALES en carta
    const printHTML = generarHTMLImpresion(contenidoHTML, machote.nombre);
    
    // Crear iframe de impresión
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      toast.error('No se pudo abrir el diálogo de impresión');
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
        console.error('Error al imprimir:', e);
        toast.error('Error al abrir el diálogo de impresión');
      }
      
      // Limpiar después de imprimir
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    };

    // Si hay hoja membretada, esperar a que cargue
    if (usarHojaMembretada && hojaActual) {
      iframe.contentWindow?.addEventListener('load', doPrint);
      setTimeout(doPrint, 2500);
    } else {
      setTimeout(doPrint, 500);
    }
  };

  const formatearNombreVariable = (variable: string): string =>
    variable.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

  const esContenidoHTML = (contenido: string): boolean => /<[a-z][\s\S]*>/i.test(contenido);

  const handleGuardarMachoteEditado = async () => {
    if (!user || !machoteAPI) { toast.error('No se pudo cargar la información del machote'); return; }
    setGuardandoMachote(true);
    try {
      const payload = {
        title: machoteAPI.title, areaKey: machoteAPI.areaKey, area: machoteAPI.area, status: machoteAPI.status,
        content: { text: contenidoMachoteEditado, html: contenidoMachoteEditado, json: machoteAPI.content?.json || null },
        letterheadUrl: machoteAPI.letterheadUrl,
      };
      const machoteActualizado = await apiUpdateMachote(machoteId, payload);
      setMachoteAPI(machoteActualizado);
      const nuevoContenido = machoteActualizado.content?.text || machoteActualizado.content?.html || contenidoMachoteEditado;
      setContenidoMachoteEditado(nuevoContenido);
      setVariablesDetectadas(detectarVariablesDesdeTexto(nuevoContenido));
      await editarMachote(machote.id, { contenido: nuevoContenido });
      setModoEditorMachote(false);
      toast.success('Machote actualizado correctamente');
    } catch (error) {
      console.error('❌ Error al actualizar machote:', error);
      toast.error('Error al actualizar el machote', { description: error instanceof Error ? error.message : 'Intenta de nuevo' });
    } finally {
      setGuardandoMachote(false);
    }
  };

  const handleCancelarEdicionMachote = () => {
    setContenidoMachoteEditado(machote.contenido);
    setModoEditorMachote(false);
  };

  const handleAgregarPlaceholder = () => {
    if (!nuevoPlaceholder.trim()) { toast.error('Ingresa un nombre para el campo'); return; }
    const placeholder = `[${nuevoPlaceholder.trim()}]`;
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart, end = textarea.selectionEnd;
      const nuevoContenido = contenidoMachoteEditado.substring(0, start) + placeholder + contenidoMachoteEditado.substring(end);
      setContenidoMachoteEditado(nuevoContenido);
      setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + placeholder.length, start + placeholder.length); }, 0);
    } else {
      setContenidoMachoteEditado(prev => prev + ' ' + placeholder);
    }
    setNuevoPlaceholder('');
    toast.success(`Campo "${nuevoPlaceholder}" agregado`);
  };

  if (modoEditorMachote && (user.rol === 'administrador' || user.rol === 'jefe_area')) {
    return (
      <EditorMachote
        machoteId={machoteId}
        machoteNombre={machote.nombre}
        machoteContenidoInicial={machote.contenido}
        onVolver={() => setModoEditorMachote(false)}
        onActualizar={async (contenidoNuevo) => { await editarMachote(machote.id, { contenido: contenidoNuevo }); }}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ────────────────────────────────────┬───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Header compacto ── */}
        <div className="mb-6">
          <Button variant="ghost" onClick={onVolver} className="mb-4 -ml-2 hover:bg-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {modoEdicion ? 'Volver al Historial' : 'Volver a Machotes'}
          </Button>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{machote.nombre}</h1>
              {modoEdicion && (
                <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 shrink-0">
                  Editando borrador
                </Badge>
              )}
            </div>
            {(user.rol === 'administrador' || user.rol === 'jefe_area') && (
              <Button variant="outline" size="sm" onClick={() => setModoEditorMachote(true)} className="shrink-0">
                <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                Editar Machote
              </Button>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {modoEdicion ? 'Modifica los campos y guarda para actualizar el documento' : 'Completa los campos para generar el documento'}
          </p>
        </div>

        {/* ── Layout dos columnas ── */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[38%_62%]">

          {/* ── Panel izquierdo: formulario + acciones ── */}
          <div className="space-y-4">

            {/* Campos del documento */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800">Campos del Documento</h2>
              </div>
              <div className="px-5 py-4 space-y-3.5">
                {variables.map((variable) => (
                  <div key={variable}>
                    <Label htmlFor={variable} className="text-xs font-medium text-gray-600 mb-1 block">
                      {formatearNombreVariable(variable)}
                    </Label>
                    <Input
                      id={variable}
                      value={valoresVariables[variable] || ''}
                      onChange={(e) => handleCambioVariable(variable, e.target.value)}
                      placeholder={`Ingresa ${formatearNombreVariable(variable).toLowerCase()}`}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Acciones ── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800">Acciones</h2>
              </div>
              <div className="px-5 py-4 space-y-2.5">

                {/* Guardar — acción primaria */}
                <Button
                  onClick={handleGuardarDocumento}
                  disabled={guardandoDocumento}
                  size="sm"
                  className="w-full bg-gray-800 hover:bg-gray-900 h-9"
                >
                  {guardandoDocumento
                    ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    : <Save className="h-3.5 w-3.5 mr-2" />
                  }
                  {modoEdicion ? 'Actualizar Documento' : 'Guardar Borrador'}
                </Button>

                {/* Marcar como final — visible solo si ya hay documento guardado */}
                {documentoAPIId && (
                  <Button
                    onClick={handleFinalizarDocumento}
                    disabled={guardandoDocumento}
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 h-9"
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-2" />
                    Marcar como Final
                  </Button>
                )}

                {/* Exportar */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={handleDescargarPDF} className="h-9">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleImprimir} className="h-9">
                    <Printer className="h-3.5 w-3.5 mr-1.5" />
                    Imprimir
                  </Button>
                </div>

                {/* Cancelar — secundario, menos prominente */}
                <button
                  onClick={onVolver}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors pt-1 text-center"
                >
                  Cancelar y volver
                </button>
              </div>
            </div>
          </div>

          {/* ── Panel derecho: vista previa ── */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" ref={vistaPreviewRef}>

              {/* Barra de controles de preview */}
              <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center justify-between gap-4">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Vista Previa</span>

                <div className="flex items-center gap-1.5">
                  {/* Selector de hoja membretada inline */}
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Hoja Membretada</span>
                  {usarHojaMembretada && hojasDisponibles.length > 0 && (
                    <select
                      value={hojaSeleccionada}
                      onChange={(e) => setHojaSeleccionada(e.target.value)}
                      className="h-7 text-xs rounded-md border border-gray-200 bg-white px-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 mr-2"
                    >
                      {hojasDisponibles.map((hoja) => (
                        <option key={hoja.id} value={hoja.id}>{hoja.nombre}</option>
                      ))}
                    </select>
                  )}

                  <button
                    onClick={disminuirZoom}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition-colors text-gray-500"
                    title="Reducir zoom"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs text-gray-500 min-w-[34px] text-center tabular-nums">{zoomLevel}%</span>
                  <button
                    onClick={aumentarZoom}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition-colors text-gray-500"
                    title="Aumentar zoom"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={resetearZoom}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition-colors text-gray-500 ml-0.5"
                    title="Restablecer zoom"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Área de documento */}
              <div
                className="overflow-auto max-h-[680px] bg-gray-100"
                style={{
                  padding: '20px 32px 24px',
                  ...(pantallaCompleta ? {
                    maxHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1f2937',
                    padding: '32px 48px',
                  } : {}),
                }}
              >
                <div ref={documentRendererRef}>
                  <UnifiedDocumentRenderer
                    contenido={contenidoFinal}
                    hojaMembretada={usarHojaMembretada && hojaActual ? {
                      id: hojaActual.id,
                      nombre: hojaActual.nombre,
                      imagenUrl: hojaActual.imagenUrl,
                    } : undefined}
                    zoom={zoomLevel}
                    mostrarNumeroPagina={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: documento guardado ── */}
      {documentoGuardado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {modoEdicion ? '¡Documento Actualizado!' : '¡Documento Guardado!'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {modoEdicion ? 'Los cambios se han guardado correctamente' : 'El documento se ha guardado correctamente'}
            </p>
            <div className="space-y-2">
              <Button onClick={handleDescargarPDF} variant="outline" className="w-full" size="sm">
                <Download className="h-3.5 w-3.5 mr-2" />
                Descargar PDF
              </Button>
              <Button onClick={handleImprimir} variant="outline" className="w-full" size="sm">
                <Printer className="h-3.5 w-3.5 mr-2" />
                Imprimir
              </Button>
              <Button onClick={onVolver} className="w-full bg-gray-800 hover:bg-gray-900" size="sm">
                Volver
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: vista previa expandida ── */}
      <Dialog open={previewExpanded} onOpenChange={setPreviewExpanded}>
        <DialogContent className="max-w-[92vw] h-[95vh] p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-base font-semibold text-gray-900">
              Vista Previa — {machote.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto bg-gray-100 flex-1" style={{ padding: '24px 64px 32px 32px' }}>
            <UnifiedDocumentRenderer
              contenido={contenidoFinal}
              hojaMembretada={usarHojaMembretada && hojaActual ? {
                id: hojaActual.id,
                nombre: hojaActual.nombre,
                imagenUrl: hojaActual.imagenUrl,
              } : undefined}
              zoom={90}
              mostrarNumeroPagina={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}