import React, { useState } from 'react';
import { useDocuments, Machote, CampoDinamico } from '../contexts/DocumentContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ArrowLeft, Trash2, FileText, RotateCcw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
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
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { 
  deactivateMachote as apiDeactivateMachote, 
  reactivateMachote as apiReactivateMachote,
  listMisMachotes as apiListMisMachotes,
  ApiMachote
} from '../services/api';

interface GestionMachotesProps {
  onVolver: () => void;
}

export function GestionMachotes({ onVolver }: GestionMachotesProps) {
  // Estado local para almacenar SOLO los machotes creados por el usuario
  // Usa el endpoint GET /machotes/mis-machotes
  const [misMachotes, setMisMachotes] = useState<Machote[]>([]);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [accionandoMachote, setAccionandoMachote] = useState<string | null>(null);

  // Función para convertir ApiMachote a Machote
  const convertirApiMachote = (apiMachote: ApiMachote): Machote => {
    const contenido = apiMachote.content?.text || apiMachote.content?.html || '';
    const regex = /\[(.*?)\]/g;
    const variablesDetectadas: string[] = [];
    const variablesUnicas = new Set<string>();
    let match;
    
    while ((match = regex.exec(contenido)) !== null) {
      const variable = match[1].trim();
      if (variable && !variablesUnicas.has(variable)) {
        variablesUnicas.add(variable);
        variablesDetectadas.push(variable);
      }
    }
    
    const campos: CampoDinamico[] = variablesDetectadas.map((nombre, idx) => ({
      id: `campo-${idx}`,
      nombre,
      tipo: 'texto' as const,
      valor: '',
      editable: true,
    }));

    return {
      id: apiMachote._id,
      nombre: apiMachote.title,
      area: apiMachote.area,
      contenido: contenido,
      campos,
      fechaCreacion: new Date(apiMachote.createdAt),
      descripcion: '',
      status: apiMachote.status,
    };
  };

  // Función para cargar solo mis machotes
  const cargarMisMachotes = React.useCallback(async () => {
    try {
      const apiMachotes = await apiListMisMachotes(undefined, mostrarInactivos);
      const machotesConvertidos = apiMachotes.map(convertirApiMachote);
      setMisMachotes(machotesConvertidos);
    } catch (error) {
      console.error('Error al cargar mis machotes:', error);
      toast.error('Error al cargar machotes', {
        description: 'No se pudieron cargar tus machotes',
      });
    }
  }, [mostrarInactivos]);

  // Cargar machotes al montar y cuando cambie el toggle de inactivos
  React.useEffect(() => {
    cargarMisMachotes();
  }, [cargarMisMachotes]);

  const handleDesactivar = async (id: string, nombre: string) => {
    setAccionandoMachote(id);
    try {
      await apiDeactivateMachote(id);
      toast.success(`Machote "${nombre}" dado de baja`, {
        description: 'El machote ha sido desactivado',
      });
      // Refrescar lista
      await cargarMisMachotes();
    } catch (error) {
      console.error('Error al desactivar machote:', error);
      toast.error('Error al dar de baja el machote', {
        description: error instanceof Error ? error.message : 'Intenta de nuevo',
      });
    } finally {
      setAccionandoMachote(null);
    }
  };

  const handleReactivar = async (id: string, nombre: string) => {
    setAccionandoMachote(id);
    try {
      await apiReactivateMachote(id);
      toast.success(`Machote "${nombre}" reactivado`, {
        description: 'El machote está nuevamente activo',
      });
      // Refrescar lista
      await cargarMisMachotes();
    } catch (error) {
      console.error('Error al reactivar machote:', error);
      toast.error('Error al reactivar el machote', {
        description: error instanceof Error ? error.message : 'Intenta de nuevo',
      });
    } finally {
      setAccionandoMachote(null);
    }
  };

  const formatearFecha = (fechaISO?: string): string => {
    if (!fechaISO) return '-';
    try {
      const fecha = new Date(fechaISO);
      if (isNaN(fecha.getTime())) return '-';
      return fecha.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return '-';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button variant="ghost" onClick={onVolver} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver al Dashboard
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Gestión de Machotes
              </CardTitle>
              <CardDescription>
                Administrar los machotes creados por ti
              </CardDescription>
            </div>
            
            {/* Toggle para mostrar inactivos */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="mostrar-inactivos" 
                checked={mostrarInactivos}
                onCheckedChange={(checked) => setMostrarInactivos(checked as boolean)}
              />
              <Label 
                htmlFor="mostrar-inactivos" 
                className="text-sm font-normal cursor-pointer"
              >
                Mostrar machotes dados de baja
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {misMachotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {mostrarInactivos 
                  ? 'No tienes machotes dados de baja' 
                  : 'No has creado ningún machote todavía'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Campos</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {misMachotes.map((machote) => {
                    const esInactivo = (machote as any).status === 'inactive';
                    const fechaBaja = (machote as any).fechaBaja;
                    
                    return (
                      <TableRow key={machote.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            {machote.nombre}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{machote.area}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {esInactivo ? (
                              <>
                                <Badge variant="destructive" className="bg-red-600">
                                  Dado de baja
                                </Badge>
                                {fechaBaja && (
                                  <p className="text-xs text-gray-500">
                                    Fecha de baja: {formatearFecha(fechaBaja)}
                                  </p>
                                )}
                              </>
                            ) : (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Activo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge>{machote.campos.length} campos</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {(() => {
                            try {
                              const fecha = new Date(machote.fechaCreacion);
                              if (isNaN(fecha.getTime())) return 'Fecha inválida';
                              return fecha.toLocaleDateString('es-MX');
                            } catch (error) {
                              console.warn('Error formateando fecha:', error);
                              return 'Fecha inválida';
                            }
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {esInactivo ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-green-600 hover:text-green-700"
                                    disabled={accionandoMachote === machote.id}
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    Reactivar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Reactivar machote?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      El machote \"{machote.nombre}\" volverá a estar disponible para su uso.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleReactivar(machote.id, machote.nombre)}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      Reactivar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-red-600 hover:text-red-700"
                                      disabled={accionandoMachote === machote.id}
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Dar de Baja
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>¿Dar de baja este machote?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        El machote \"{machote.nombre}\" será marcado como inactivo. 
                                        Podrás reactivarlo más tarde si es necesario.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDesactivar(machote.id, machote.nombre)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Dar de Baja
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}