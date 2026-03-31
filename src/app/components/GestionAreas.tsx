import React, { useState } from 'react';
import { useAreas } from '../contexts/AreaContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Building2, 
  Plus, 
  Edit3, 
  Trash2, 
  Users, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface GestionAreasProps {
  onVolver: () => void;
}

export function GestionAreas({ onVolver }: GestionAreasProps) {
  const { areas, agregarArea, actualizarArea, eliminarArea } = useAreas();
  const { user } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [areaSeleccionada, setAreaSeleccionada] = useState<string | null>(null);
  const [alertaEliminar, setAlertaEliminar] = useState<string | null>(null);

  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    jefeId: '',
    jefeNombre: '',
    activa: true,
  });

  const areasFiltradas = areas.filter(a => 
    a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.jefeNombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleNuevaArea = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      jefeId: '',
      jefeNombre: '',
      activa: true,
    });
    setModoEdicion(false);
    setAreaSeleccionada(null);
    setDialogoAbierto(true);
  };

  const handleEditarArea = (area: typeof areas[0]) => {
    setFormData({
      nombre: area.nombre,
      descripcion: area.descripcion,
      jefeId: area.jefeId,
      jefeNombre: area.jefeNombre,
      activa: area.activa,
    });
    setModoEdicion(true);
    setAreaSeleccionada(area.id);
    setDialogoAbierto(true);
  };

  const handleGuardarArea = () => {
    if (!formData.nombre || !formData.descripcion || !formData.jefeNombre) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    if (modoEdicion && areaSeleccionada) {
      actualizarArea(areaSeleccionada, formData);
      toast.success('Área actualizada correctamente');
    } else {
      agregarArea(formData);
      toast.success('Nueva área creada correctamente');
    }

    setDialogoAbierto(false);
    setFormData({
      nombre: '',
      descripcion: '',
      jefeId: '',
      jefeNombre: '',
      activa: true,
    });
  };

  const handleEliminarArea = (id: string) => {
    eliminarArea(id);
    toast.success('Área eliminada correctamente');
    setAlertaEliminar(null);
  };

  const handleCambiarEstado = (id: string, activa: boolean) => {
    actualizarArea(id, { activa: !activa });
    toast.success(activa ? 'Área desactivada' : 'Área activada');
  };

  // Solo el administrador puede acceder
  if (user?.rol !== 'administrador') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-16 pb-16 text-center">
            <p className="text-gray-600">No tienes permisos para acceder a esta sección.</p>
            <Button onClick={onVolver} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Encabezado */}
      <div className="mb-6">
        <Button variant="ghost" onClick={onVolver} className="mb-4 -ml-2 hover:bg-gray-100 text-gray-700">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Dashboard
        </Button>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Gestión de Áreas</h1>
              <p className="text-sm text-gray-500">Administra las áreas del ayuntamiento</p>
            </div>
          </div>
          
          <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
            <DialogTrigger asChild>
              <Button 
                onClick={handleNuevaArea}
                className="bg-gray-800 hover:bg-gray-900 h-9 shadow-sm font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Área
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">
                  {modoEdicion ? 'Editar Área' : 'Nueva Área'}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {modoEdicion 
                    ? 'Modifica la información del área'
                    : 'Completa la información para crear una nueva área'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-sm font-medium">Nombre del Área *</Label>
                  <Input
                    id="nombre"
                    placeholder="Ej: Dirección de Obras Públicas"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="h-10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="descripcion" className="text-sm font-medium">Descripción *</Label>
                  <Textarea
                    id="descripcion"
                    placeholder="Describe las funciones del área"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                    className="text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="jefeNombre" className="text-sm font-medium">Jefe de Área *</Label>
                  <Input
                    id="jefeNombre"
                    placeholder="Nombre completo del jefe de área"
                    value={formData.jefeNombre}
                    onChange={(e) => setFormData({ ...formData, jefeNombre: e.target.value })}
                    className="h-10"
                  />
                  <p className="text-xs text-gray-500">
                    Este usuario podrá agregar y gestionar usuarios en su área
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setDialogoAbierto(false)}
                  className="h-9"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleGuardarArea}
                  className="bg-gray-800 hover:bg-gray-900 h-9 font-medium"
                >
                  {modoEdicion ? 'Guardar Cambios' : 'Crear Área'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs">Total de Áreas</CardDescription>
            <CardTitle className="text-2xl font-semibold">{areas.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs">Áreas Activas</CardDescription>
            <CardTitle className="text-2xl font-semibold text-green-600">
              {areas.filter(a => a.activa).length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs">Áreas Inactivas</CardDescription>
            <CardTitle className="text-2xl font-semibold text-gray-400">
              {areas.filter(a => !a.activa).length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs">Total de Usuarios</CardDescription>
            <CardTitle className="text-2xl font-semibold text-gray-800">
              {areas.reduce((acc, area) => acc + area.cantidadUsuarios, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Barra de búsqueda */}
      <Card className="mb-5 border-0 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, descripción o jefe de área..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 h-10 border-gray-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de áreas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {areasFiltradas.map((area) => (
          <Card key={area.id} className={`border-0 shadow-sm ${!area.activa ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-base font-semibold">{area.nombre}</CardTitle>
                    <Badge 
                      variant={area.activa ? "default" : "secondary"}
                      className={`text-xs ${area.activa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                    >
                      {area.activa ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Activa
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactiva
                        </>
                      )}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">{area.descripcion}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-500">Jefe de Área</p>
                  <p className="font-medium text-gray-900 mt-0.5">{area.jefeNombre}</p>
                </div>
                <div>
                  <p className="text-gray-500">Usuarios</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1 mt-0.5">
                    <Users className="h-3.5 w-3.5" />
                    {area.cantidadUsuarios}
                  </p>
                </div>
              </div>

              <div className="text-xs text-gray-400">
                Creada el {area.fechaCreacion}
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditarArea(area)}
                  className="flex-1 h-8 text-xs hover:bg-gray-50"
                >
                  <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                  Editar
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCambiarEstado(area.id, area.activa)}
                  className="flex-1 h-8 text-xs hover:bg-gray-50"
                >
                  {area.activa ? (
                    <>
                      <XCircle className="h-3.5 w-3.5 mr-1.5" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                      Activar
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAlertaEliminar(area.id)}
                  className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {areasFiltradas.length === 0 && (
          <div className="col-span-2">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-16 pb-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Building2 className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No se encontraron áreas</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={!!alertaEliminar} onOpenChange={() => setAlertaEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar área?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el área y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => alertaEliminar && handleEliminarArea(alertaEliminar)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}