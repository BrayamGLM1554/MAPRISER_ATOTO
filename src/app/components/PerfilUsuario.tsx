import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { 
  User, 
  Mail, 
  Building2, 
  Shield, 
  Calendar, 
  Clock,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Upload,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import * as authApi from '../services/authApi';

interface PerfilUsuarioProps {
  onVolver: () => void;
}

export function PerfilUsuario({ onVolver }: PerfilUsuarioProps) {
  const { user, useRealApi, updateUserProfile } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);

  if (!user) return null;

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
        const newAvatarUrl = e.target?.result as string;
        setAvatarUrl(newAvatarUrl);
        toast.success('Avatar actualizado (modo simulado)');
      };
      reader.readAsDataURL(file);
      return;
    }

    // Subir avatar con API real
    setSubiendoAvatar(true);
    try {
      const newAvatarUrl = await authApi.uploadUserAvatar(user.id, file);
      setAvatarUrl(newAvatarUrl);
      
      // Actualizar el usuario en el contexto
      if (updateUserProfile) {
        updateUserProfile({ ...user, avatar: newAvatarUrl });
      }
      
      toast.success('Avatar actualizado', {
        description: 'Tu foto de perfil se ha actualizado correctamente',
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRolDisplay = (rol: string) => {
    const roles: Record<string, { nombre: string; color: string }> = {
      'administrador': { nombre: 'Administrador General', color: 'bg-purple-100 text-purple-800' },
      'jefe_area': { nombre: 'Jefe de Área', color: 'bg-blue-100 text-blue-800' },
      'usuario': { nombre: 'Usuario', color: 'bg-gray-100 text-gray-800' },
    };
    return roles[rol] || { nombre: rol, color: 'bg-gray-100 text-gray-800' };
  };

  const rolInfo = getRolDisplay(user.rol);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Botón Volver */}
      <Button variant="ghost" onClick={onVolver} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver al Dashboard
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda - Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Encabezado del Usuario */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start gap-4">
                <Avatar className="w-20 h-20">
                  {avatarUrl && (
                    <AvatarImage src={avatarUrl} alt={user.nombre} />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white text-2xl">
                    {getInitials(user.nombre)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">{user.nombre}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={rolInfo.color}>
                      <Shield className="h-3 w-3 mr-1" />
                      {rolInfo.nombre}
                    </Badge>
                    {user.activo !== false && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Cuenta Activa
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Información Personal */}
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>
                Tus datos personales registrados en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <User className="h-4 w-4" />
                    <span>Nombre Completo</span>
                  </div>
                  <p className="text-base font-medium text-gray-900">{user.nombre}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail className="h-4 w-4" />
                    <span>Correo Electrónico</span>
                  </div>
                  <p className="text-base font-medium text-gray-900">{user.email}</p>
                </div>

                {user.area && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Building2 className="h-4 w-4" />
                      <span>Área Asignada</span>
                    </div>
                    <p className="text-base font-medium text-gray-900">{user.area}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Shield className="h-4 w-4" />
                    <span>Rol del Sistema</span>
                  </div>
                  <p className="text-base font-medium text-gray-900">{rolInfo.nombre}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permisos */}
          {user.permisos && (
            <Card>
              <CardHeader>
                <CardTitle>Permisos del Sistema</CardTitle>
                <CardDescription>
                  Acciones que puedes realizar en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg border ${user.permisos.lectura ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {user.permisos.lectura ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                      <span className="font-medium text-gray-900">Lectura</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Ver documentos y machotes
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg border ${user.permisos.escritura ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {user.permisos.escritura ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                      <span className="font-medium text-gray-900">Escritura</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Generar nuevos documentos
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg border ${user.permisos.edicion ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {user.permisos.edicion ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                      <span className="font-medium text-gray-900">Edición</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Modificar machotes y usuarios
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actividad de la Cuenta */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad de la Cuenta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>Fecha de Creación</span>
                  </div>
                  <p className="text-base font-medium text-gray-900">
                    {user.fechaCreacion || 'No disponible'}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>Último Acceso</span>
                  </div>
                  <p className="text-base font-medium text-gray-900">
                    {user.ultimoAcceso || 'Primera sesión'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha - Información Adicional y Avatar */}
        <div className="space-y-6">
          {/* Card para cambiar avatar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Foto de Perfil
              </CardTitle>
              <CardDescription>
                Actualiza tu foto de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                  {avatarUrl && (
                    <AvatarImage src={avatarUrl} alt={user.nombre} />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white text-2xl">
                    {getInitials(user.nombre)}
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

          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 text-white">
            <CardHeader>
              <CardTitle className="text-white">Tu Rol</CardTitle>
              <CardDescription className="text-white/80">
                Información sobre tu nivel de acceso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-white/90">
                  {user.rol === 'administrador' && 'Como Administrador General, tienes acceso completo al sistema. Puedes crear áreas, gestionar usuarios y machotes.'}
                  {user.rol === 'jefe_area' && 'Como Jefe de Área, puedes agregar usuarios a tu área y gestionar los documentos y machotes de tu departamento.'}
                  {user.rol === 'usuario' && 'Como Usuario, puedes visualizar y generar documentos según los permisos asignados por tu jefe de área.'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-sm">Nota Informativa</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600 leading-relaxed">
                Si necesitas modificar tu información personal o cambiar tus permisos, 
                contacta a {user.rol === 'usuario' ? 'tu jefe de área' : 'el administrador del sistema'}.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}