import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDocuments } from '../contexts/DocumentContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ArrowLeft, FileText, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';

interface HistorialDocumentosProps {
  onVolver: () => void;
}

export function HistorialDocumentos({ onVolver }: HistorialDocumentosProps) {
  const { user } = useAuth();
  const { documentosGenerados } = useDocuments();

  if (!user) return null;

  const documentosDelUsuario = user.rol === 'administrador'
    ? documentosGenerados
    : documentosGenerados.filter(d => d.usuario === user.nombre || d.area === user.area);

  const documentosOrdenados = [...documentosDelUsuario].sort((a, b) => {
    try {
      const fechaA = new Date(a.fechaGeneracion).getTime();
      const fechaB = new Date(b.fechaGeneracion).getTime();
      if (isNaN(fechaA) || isNaN(fechaB)) return 0;
      return fechaB - fechaA;
    } catch (error) {
      console.warn('Error ordenando documentos:', error);
      return 0;
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Button variant="ghost" onClick={onVolver} className="mb-4 -ml-2 hover:bg-gray-100 text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver al Dashboard
      </Button>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-gray-600" />
            </div>
            Historial de Documentos Generados
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            {user.rol === 'administrador' 
              ? 'Todos los documentos generados en el sistema' 
              : 'Documentos generados en tu área'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documentosOrdenados.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No hay documentos generados</p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="text-xs font-semibold text-gray-600 uppercase">Documento</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-600 uppercase">Área</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-600 uppercase">Generado por</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-600 uppercase">Fecha</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentosOrdenados.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-4 w-4 text-gray-500" />
                          </div>
                          <span className="text-sm">{doc.nombreMachote}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-medium">{doc.area}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <User className="h-3.5 w-3.5" />
                          {doc.usuario}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Calendar className="h-3.5 w-3.5" />
                          {(() => {
                            try {
                              const fecha = new Date(doc.fechaGeneracion);
                              if (isNaN(fecha.getTime())) return 'Fecha inválida';
                              return format(fecha, "d 'de' MMMM, yyyy 'a las' HH:mm");
                            } catch (error) {
                              console.warn('Error formateando fecha:', error);
                              return 'Fecha inválida';
                            }
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="h-8 text-xs font-medium hover:bg-gray-100">
                          Ver detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}