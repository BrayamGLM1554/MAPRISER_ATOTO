import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Edit3, Loader2, User, FileText, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getMachote as apiGetMachote, getDocumentosPorMachote, DocumentoAPI } from '../services/api';

interface HistorialMachoteProps {
  machoteId: string;
  onVolver: () => void;
  onContinuarEdicion: () => void;
  onEditarDocumento: (documentoId: string, campos: Record<string, string>) => void;
}

export function HistorialMachote({ machoteId, onVolver, onContinuarEdicion, onEditarDocumento }: HistorialMachoteProps) {
  const [machote, setMachote] = useState<any>(null);
  const [documentos, setDocumentos] = useState<DocumentoAPI[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoDocumentos, setCargandoDocumentos] = useState(true);

  useEffect(() => {
    if (!machoteId) { setCargando(false); return; }
    setCargando(true);
    apiGetMachote(machoteId)
      .then(data => setMachote(data))
      .catch(() => toast.error('No se pudo cargar el historial del machote'))
      .finally(() => setCargando(false));
  }, [machoteId]);

  useEffect(() => {
    if (!machoteId) { setCargandoDocumentos(false); return; }
    setCargandoDocumentos(true);
    getDocumentosPorMachote(machoteId)
      .then(docs => setDocumentos(docs))
      .catch(() => { toast.error('No se pudo cargar el historial de documentos'); setDocumentos([]); })
      .finally(() => setCargandoDocumentos(false));
  }, [machoteId]);

  const formatearFecha = (fechaISO?: string): string => {
    if (!fechaISO) return '-';
    try {
      const fecha = new Date(fechaISO);
      if (isNaN(fecha.getTime())) return '-';
      return fecha.toLocaleDateString('es-MX', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return '-'; }
  };

  const obtenerBadgeStatus = (status: string) => {
    switch (status) {
      case 'active':   return <Badge className="bg-green-600">Activo</Badge>;
      case 'inactive': return <Badge variant="destructive">Inactivo</Badge>;
      case 'draft':    return <Badge variant="secondary">Borrador</Badge>;
      default:         return <Badge variant="outline">{status}</Badge>;
    }
  };

  const obtenerBadgeDocumento = (status: string) =>
    status === 'final'
      ? <Badge className="bg-green-600">Final</Badge>
      : <Badge variant="secondary">Borrador</Badge>;

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <span className="text-sm text-gray-500">Cargando historial...</span>
        </div>
      </div>
    );
  }

  if (!machote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No se pudo cargar el machote</p>
          <Button onClick={onVolver} variant="outline" size="sm">Volver</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header compacto */}
        <div className="mb-6">
          <Button variant="ghost" onClick={onVolver} className="mb-4 -ml-2 hover:bg-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Historial del Machote</h1>
              <p className="text-base text-gray-600 mt-0.5">{machote.title}</p>
              <p className="text-xs text-gray-400 mt-1">
                Creado: {formatearFecha(machote.createdAt)}
                <span className="mx-1.5">·</span>
                Actualizado: {formatearFecha(machote.updatedAt)}
              </p>
            </div>
            {obtenerBadgeStatus(machote.status)}
          </div>
        </div>

        {/* Tabla de documentos */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Historial de Documentos Generados</h2>
            {!cargandoDocumentos && documentos.length > 0 && (
              <span className="text-xs text-gray-400">{documentos.length} documento{documentos.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {cargandoDocumentos ? (
            <div className="flex items-center justify-center py-12 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
              <span className="text-sm text-gray-400">Cargando documentos...</span>
            </div>
          ) : documentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <FileText className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No hay documentos generados</p>
              <p className="text-xs text-gray-400 mt-1">Los documentos llenados aparecerán aquí</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-3 w-28">Estado</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Creado por</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Fecha de creación</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-3 w-32">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documentos.map((doc: DocumentoAPI) => {
                  const esFinal = doc.status === 'final';
                  return (
                    <tr key={doc._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-3.5">
                        {obtenerBadgeDocumento(doc.status)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-700 truncate max-w-[200px]">{doc.createdBy?.name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span className="whitespace-nowrap">{formatearFecha(doc.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {!esFinal ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEditarDocumento(doc._id, doc.campos)}
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-300">Finalizado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Acción principal */}
        <div className="flex justify-end">
          <Button
            onClick={onContinuarEdicion}
            size="lg"
            className="bg-gray-900 hover:bg-gray-800"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Continuar a Edición
          </Button>
        </div>

      </div>
    </div>
  );
}