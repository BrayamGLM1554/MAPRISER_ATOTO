import React, { useState } from 'react';
import { User, useAuth } from '../contexts/AuthContext';
import { useAreas } from '../contexts/AreaContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ArrowLeft, Edit3, Save, X, UserCog, Key, CheckCircle, XCircle, Upload, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import * as authApi from '../services/authApi';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface DetalleUsuarioProps {
  usuario: User & {
    activo?: boolean;
    fechaCreacion?: string;
    ultimoAcceso?: string;
  };
  onVolver: () => void;
  onActualizar?: (usuario: User) => void;
  esAdmin?: boolean;
  esJefeArea?: boolean;
  areaActual?: string;
}

export function DetalleUsuario({ 
  usuario, 
  onVolver, 
  onActualizar, 
  esAdmin = false,
  esJefeArea = false,
  areaActual
}: DetalleUsuarioProps) {
  const { useRealApi } = useAuth();
  const { areas } = useAreas();
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioEditado, setUsuarioEditado] = useState(usuario);
  const [activo, setActivo] = useState(usuario.activo ?? true);
  const [cargando, setCargando] = useState(false);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);

  // Estado para el formulario de cambio de contraseña
  const [dialogoContrasena, setDialogoContrasena] = useState(false);
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [mostrarNuevaContrasena, setMostrarNuevaContrasena] = useState(false);
  const [mostrarConfirmarContrasena, setMostrarConfirmarContrasena] = useState(false);

  // Determinar si el usuario actual puede editar este perfil
  const puedeEditar = esAdmin || (esJefeArea && usuario.area === areaActual && usuario.rol === 'usuario');

  // Validar si las contraseñas coinciden y cumplen requisitos
  const contrasenaValida = nuevaContrasena.length >= 6;
  const contrasenasCoinciden = nuevaContrasena === confirmarContrasena && nuevaContrasena.length > 0;
  const puedeRestablecer = contrasenaValida && contrasenasCoinciden;

  const handleGuardarCambios = async () => {
    if (!useRealApi) {
      // Modo mock
      if (onActualizar) {
        onActualizar(usuarioEditado);
        toast.success('Información actualizada', {
          description: 'Los cambios se han guardado correctamente',
        });
      }
      setModoEdicion(false);
      return;
    }

    // Actualizar áreas con API real
    if (usuarioEditado.areasPermitidas && usuario.areasPermitidas !== usuarioEditado.areasPermitidas) {
      setCargando(true);
      try {
        const usuarioActualizado = await authApi.updateUserAreas(usuarioEditado.id, {
          areasPermitidas: usuarioEditado.areasPermitidas,
        });
        
        if (onActualizar) {
          onActualizar(usuarioActualizado as any);
        }
        
        toast.success('Áreas actualizadas', {
          description: 'Las áreas del usuario se han actualizado correctamente',
        });
        setModoEdicion(false);
      } catch (error: any) {
        console.error('Error al actualizar áreas:', error);
        toast.error('Error al actualizar áreas', {
          description: error.message || 'Intenta de nuevo',
        });
      } finally {
        setCargando(false);
      }
    } else {
      // Si no hay cambios en áreas, solo cerrar modo edición
      setModoEdicion(false);
      toast.info('Sin cambios para guardar');
    }
  };

  const handleCancelarEdicion = () => {
    setUsuarioEditado(usuario);
    setModoEdicion(false);
  };

  const handleCambiarEstado = async () => {
    if (!useRealApi) {
      // Modo mock
      setActivo(!activo);
      toast.success(activo ? 'Cuenta desactivada' : 'Cuenta activada', {
        description: `El usuario ahora está ${activo ? 'inactivo' : 'activo'}`,
      });
      return;
    }

    // Cambiar estado con API real
    setCargando(true);
    try {
      const usuarioActualizado = await authApi.toggleUserStatus(usuarioEditado.id);
      setActivo(usuarioActualizado.activo);
      
      if (onActualizar) {
        onActualizar(usuarioActualizado as any);
      }
      
      toast.success(usuarioActualizado.activo ? 'Cuenta activada' : 'Cuenta desactivada', {
        description: `El usuario ahora está ${usuarioActualizado.activo ? 'activo' : 'inactivo'}`,
      });
    } catch (error: any) {
      console.error('Error al cambiar estado:', error);
      toast.error('Error al cambiar estado', {
        description: error.message || 'Intenta de nuevo',
      });
    } finally {
      setCargando(false);
    }
  };

  const handleRestablecerContrasena = async () => {
    if (!useRealApi) {
      // Modo mock
      toast.success('Contraseña restablecida', {
        description: 'La contraseña se ha cambiado correctamente',
      });
      setDialogoContrasena(false);
      setNuevaContrasena('');
      setConfirmarContrasena('');
      return;
    }

    // Restablecer contraseña con API real
    setCargando(true);
    try {
      const resultado = await authApi.resetUserPassword(usuarioEditado.id, nuevaContrasena);
      
      toast.success('Contraseña restablecida', {
        description: resultado.message || 'La contraseña se ha cambiado correctamente',
      });
      
      // Limpiar y cerrar el diálogo
      setDialogoContrasena(false);
      setNuevaContrasena('');
      setConfirmarContrasena('');
    } catch (error: any) {
      console.error('Error al restablecer contraseña:', error);
      toast.error('Error al restablecer contraseña', {
        description: error.message || 'Intenta de nuevo',
      });
    } finally {
      setCargando(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Archivo demasiado grande', {
        description: 'El tamaño máximo es 5MB',
      });
      return;
    }

    // Validar tipo
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato no válido', {
        description: 'Solo se permiten archivos JPG, PNG o WebP',
      });
      return;
    }

    if (!useRealApi) {
      // Modo mock - solo mostrar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setUsuarioEditado({
          ...usuarioEditado,
          avatar: e.target?.result as string,
        });
        toast.success('Avatar actualizado (modo simulado)');
      };
      reader.readAsDataURL(file);
      return;
    }

    // Subir avatar con API real
    setSubiendoAvatar(true);
    try {
      const avatarUrl = await authApi.uploadUserAvatar(usuarioEditado.id, file);
      
      setUsuarioEditado({
        ...usuarioEditado,
        avatar: avatarUrl,
      });
      
      if (onActualizar) {
        onActualizar({
          ...usuarioEditado,
          avatar: avatarUrl,
        } as any);
      }
      
      toast.success('Avatar actualizado', {
        description: 'La imagen se ha subido correctamente',
      });
    } catch (error: any) {
      console.error('Error al subir avatar:', error);
      toast.error('Error al subir avatar', {
        description: error.message || 'Intenta de nuevo',
      });
    } finally {
      setSubiendoAvatar(false);
    }
  };

  const getRolDisplay = (rol: string) => {
    const roles: Record<string, string> = {
      'administrador': 'Administrador General',
      'jefe_area': 'Director',
      'usuario': 'Auxiliar Administrativo',
    };
    return roles[rol] || rol;
  };

  const getAreaDisplay = (area?: string) => {
    if (!area) return 'Sin asignar';
    return area;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Botón Volver */}
      <Button variant="ghost" onClick={onVolver} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Usuarios
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda - Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Encabezado del Usuario */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-2xl font-bold text-white">
                      {getInitials(usuarioEditado.nombre)}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{usuarioEditado.nombre}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-2">
                      <span>{getRolDisplay(usuarioEditado.rol)}</span>
                      {usuarioEditado.area && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span>{getAreaDisplay(usuarioEditado.area)}</span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <Badge 
                  variant={activo ? "default" : "secondary"}
                  className={activo ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-gray-100 text-gray-800"}
                >
                  {activo ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Activo
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactivo
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Información Básica */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Información Básica</CardTitle>
                {puedeEditar && !modoEdicion && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModoEdicion(true)}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
                {modoEdicion && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelarEdicion}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleGuardarCambios}
                      className="bg-gray-800 hover:bg-gray-900"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre Completo</Label>
                  {modoEdicion ? (
                    <Input
                      id="nombre"
                      value={usuarioEditado.nombre}
                      onChange={(e) => setUsuarioEditado({ ...usuarioEditado, nombre: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm text-gray-700 py-2">{usuarioEditado.nombre}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  {modoEdicion ? (
                    <Input
                      id="email"
                      type="email"
                      value={usuarioEditado.email}
                      onChange={(e) => setUsuarioEditado({ ...usuarioEditado, email: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm text-gray-700 py-2">{usuarioEditado.email}</p>
                  )}
                </div>

                {esAdmin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="rol">Rol del Usuario</Label>
                      {modoEdicion ? (
                        <Select
                          value={usuarioEditado.rol}
                          onValueChange={(value: 'administrador' | 'jefe_area' | 'usuario') => 
                            setUsuarioEditado({ ...usuarioEditado, rol: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="administrador">Administrador General</SelectItem>
                            <SelectItem value="jefe_area">Director</SelectItem>
                            <SelectItem value="usuario">Auxiliar Administrativo</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-gray-700 py-2">{getRolDisplay(usuarioEditado.rol)}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="area">Área o Departamento</Label>
                      {modoEdicion ? (
                        <Select
                          value={usuarioEditado.area || 'ninguna'}
                          onValueChange={(value) => 
                            setUsuarioEditado({ ...usuarioEditado, area: value === 'ninguna' ? undefined : value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ninguna">Sin asignar</SelectItem>
                            {areas.filter(a => a.activa).map(area => (
                              <SelectItem key={area.id} value={area.nombre}>
                                {area.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-gray-700 py-2">{getAreaDisplay(usuarioEditado.area)}</p>
                      )}
                    </div>
                  </>
                )}

                {!esAdmin && esJefeArea && (
                  <div className="space-y-2 col-span-2">
                    <Label>Área o Departamento</Label>
                    <p className="text-sm text-gray-700 py-2">{getAreaDisplay(usuarioEditado.area)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Permisos */}
          {usuarioEditado.permisos && puedeEditar && (
            <Card>
              <CardHeader>
                <CardTitle>Permisos del Sistema</CardTitle>
                <CardDescription>
                  Acciones que el usuario puede realizar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {modoEdicion ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="lectura" 
                        checked={usuarioEditado.permisos.lectura}
                        onCheckedChange={(checked) => 
                          setUsuarioEditado({
                            ...usuarioEditado,
                            permisos: { ...usuarioEditado.permisos!, lectura: checked as boolean }
                          })
                        }
                      />
                      <label htmlFor="lectura" className="text-sm cursor-pointer">
                        Lectura (Ver documentos y machotes)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="escritura" 
                        checked={usuarioEditado.permisos.escritura}
                        onCheckedChange={(checked) => 
                          setUsuarioEditado({
                            ...usuarioEditado,
                            permisos: { ...usuarioEditado.permisos!, escritura: checked as boolean }
                          })
                        }
                      />
                      <label htmlFor="escritura" className="text-sm cursor-pointer">
                        Escritura (Generar nuevos documentos)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="edicion" 
                        checked={usuarioEditado.permisos.edicion}
                        onCheckedChange={(checked) => 
                          setUsuarioEditado({
                            ...usuarioEditado,
                            permisos: { ...usuarioEditado.permisos!, edicion: checked as boolean }
                          })
                        }
                      />
                      <label htmlFor="edicion" className="text-sm cursor-pointer">
                        Edición (Modificar machotes)
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-4 rounded-lg border ${usuarioEditado.permisos.lectura ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {usuarioEditado.permisos.lectura ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400" />
                        )}
                        <span className="font-medium text-gray-900">Lectura</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Ver documentos
                      </p>
                    </div>

                    <div className={`p-4 rounded-lg border ${usuarioEditado.permisos.escritura ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {usuarioEditado.permisos.escritura ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400" />
                        )}
                        <span className="font-medium text-gray-900">Escritura</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Generar documentos
                      </p>
                    </div>

                    <div className={`p-4 rounded-lg border ${usuarioEditado.permisos.edicion ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {usuarioEditado.permisos.edicion ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400" />
                        )}
                        <span className="font-medium text-gray-900">Edición</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Modificar machotes
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Información de Actividad */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad de la Cuenta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Fecha de Creación</Label>
                  <p className="text-sm text-gray-700">
                    {usuario.fechaCreacion || new Date().toLocaleDateString('es-MX', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Último Acceso</Label>
                  <p className="text-sm text-gray-700">
                    {usuario.ultimoAcceso || 'Nunca'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha - Acciones Administrativas */}
        {puedeEditar && (
          <div className="space-y-6">
            {/* Card para cambiar avatar */}
            {esAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Foto de Perfil
                  </CardTitle>
                  <CardDescription>
                    Actualizar la imagen del usuario
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24">
                      {usuarioEditado.avatar && (
                        <AvatarImage src={usuarioEditado.avatar} alt={usuarioEditado.nombre} />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800 text-white text-2xl">
                        {getInitials(usuarioEditado.nombre)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="w-full">
                      <Label 
                        htmlFor="avatar-upload" 
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                          {subiendoAvatar ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Subiendo...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              <span className="text-sm">Seleccionar Imagen</span>
                            </>
                          )}
                        </div>
                      </Label>
                      <Input
                        id="avatar-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatarChange}
                        className="hidden"
                        disabled={subiendoAvatar}
                      />
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        JPG, PNG o WebP. Máx 5MB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  Acciones {esJefeArea ? 'del Jefe de Área' : 'Administrativas'}
                </CardTitle>
                <CardDescription>
                  Gestión avanzada de la cuenta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Cambiar Estado */}
                {esAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        disabled={cargando}
                      >
                        {cargando ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            <span>Procesando...</span>
                          </>
                        ) : activo ? (
                          <>
                            <XCircle className="h-4 w-4 mr-2 text-red-600" />
                            <span>Desactivar Cuenta</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            <span>Activar Cuenta</span>
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {activo ? '¿Desactivar cuenta?' : '¿Activar cuenta?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {activo 
                            ? 'El usuario no podrá acceder al sistema hasta que sea reactivado.'
                            : 'El usuario podrá acceder nuevamente al sistema.'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleCambiarEstado}
                          className="bg-gray-800 hover:bg-gray-900"
                        >
                          Confirmar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Restablecer Contraseña - SOLO para Jefes de Área */}
                {esJefeArea && (
                  <Dialog open={dialogoContrasena} onOpenChange={setDialogoContrasena}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        disabled={cargando}
                      >
                        <Key className="h-4 w-4 mr-2" />
                        <span>Restablecer Contraseña</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Restablecer Contraseña</DialogTitle>
                        <DialogDescription>
                          Ingresa una nueva contraseña para {usuarioEditado.nombre}. La contraseña debe tener al menos 6 caracteres.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="nuevaContrasena">Nueva Contraseña</Label>
                          <div className="relative">
                            <Input
                              id="nuevaContrasena"
                              type={mostrarNuevaContrasena ? "text" : "password"}
                              placeholder="Ingresa la nueva contraseña"
                              value={nuevaContrasena}
                              onChange={(e) => setNuevaContrasena(e.target.value)}
                              disabled={cargando}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setMostrarNuevaContrasena(!mostrarNuevaContrasena)}
                              disabled={cargando}
                            >
                              {mostrarNuevaContrasena ? (
                                <EyeOff className="h-4 w-4 text-gray-500" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-500" />
                              )}
                            </Button>
                          </div>
                          {nuevaContrasena && (
                            <p className={`text-xs ${contrasenaValida ? 'text-green-600' : 'text-red-600'}`}>
                              {contrasenaValida ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Contraseña válida
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Mínimo 6 caracteres
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="confirmarContrasena">Confirmar Contraseña</Label>
                          <div className="relative">
                            <Input
                              id="confirmarContrasena"
                              type={mostrarConfirmarContrasena ? "text" : "password"}
                              placeholder="Confirma la nueva contraseña"
                              value={confirmarContrasena}
                              onChange={(e) => setConfirmarContrasena(e.target.value)}
                              disabled={cargando}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setMostrarConfirmarContrasena(!mostrarConfirmarContrasena)}
                              disabled={cargando}
                            >
                              {mostrarConfirmarContrasena ? (
                                <EyeOff className="h-4 w-4 text-gray-500" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-500" />
                              )}
                            </Button>
                          </div>
                          {confirmarContrasena && (
                            <p className={`text-xs ${contrasenasCoinciden ? 'text-green-600' : 'text-red-600'}`}>
                              {contrasenasCoinciden ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Las contraseñas coinciden
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Las contraseñas no coinciden
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDialogoContrasena(false);
                            setNuevaContrasena('');
                            setConfirmarContrasena('');
                          }}
                          disabled={cargando}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleRestablecerContrasena}
                          disabled={cargando || !puedeRestablecer}
                          className="bg-gray-800 hover:bg-gray-900"
                        >
                          {cargando ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            'Restablecer'
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>

            {/* Información Adicional */}
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-sm">Nota de Seguridad</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {esAdmin 
                    ? 'Los cambios en el rol del usuario afectarán sus permisos de acceso inmediatamente. Desactivar una cuenta es reversible y no elimina el historial del usuario.'
                    : 'Como jefe de área, puedes modificar los permisos de los usuarios de tu área. Los cambios se aplicarán de inmediato.'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}