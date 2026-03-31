import React, { useState, useEffect } from 'react';
import { User, useAuth } from '../contexts/AuthContext';
import { useAreas } from '../contexts/AreaContext';
import { DetalleUsuario } from './DetalleUsuario';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Users, Eye, Search, Plus, ArrowLeft, KeyRound, Copy, RefreshCw, Loader2 } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import * as authApi from '../services/authApi';
import { AREAS_SISTEMA, obtenerAreasDisponibles } from '../constants/areas';
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

interface UsuarioExtendido extends User {
  activo: boolean;
  fechaCreacion: string;
  ultimoAcceso: string;
}

interface GestionUsuariosProps {
  onVolver: () => void;
}

export function GestionUsuarios({ onVolver }: GestionUsuariosProps) {
  const { user: usuarioActual, useRealApi } = useAuth();
  const { areas } = useAreas();
  const [vistaDetalle, setVistaDetalle] = useState<UsuarioExtendido | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [dialogoNuevoUsuario, setDialogoNuevoUsuario] = useState(false);
  const [contrasenaGenerada, setContrasenaGenerada] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [creandoUsuario, setCreandoUsuario] = useState(false);

  // Formulario de nuevo usuario - Actualizado para coincidir con API
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    puesto: '',
    areasPermitidas: [] as string[],
    contrasena: '',
  });

  // Usuarios de ejemplo (en producción vendrían de una base de datos)
  const [usuarios, setUsuarios] = useState<UsuarioExtendido[]>([]);

  // Mapeo de roles de API a roles internos
  const mapRolFromApi = (apiRol: string): 'administrador' | 'jefe_area' | 'usuario' => {
    switch (apiRol) {
      case 'ADMIN':
        return 'administrador';
      case 'JEFE_AREA':
        return 'jefe_area';
      case 'EMPLEADO':
      case 'ASISTENTE':
        return 'usuario';
      default:
        return 'usuario';
    }
  };

  // Convertir perfil de API a UsuarioExtendido
  const convertirPerfilApi = (perfil: authApi.PerfilUsuario): UsuarioExtendido => {
    return {
      id: perfil.id,
      nombre: perfil.nombreCompleto || `${perfil.nombre} ${perfil.apellidos}`,
      email: perfil.email,
      rol: mapRolFromApi(perfil.rol),
      area: perfil.areasPermitidas?.[0] || undefined,
      permisos: {
        lectura: true,
        escritura: perfil.rol === 'ADMIN' || perfil.rol === 'JEFE_AREA',
        edicion: perfil.rol === 'ADMIN' || perfil.rol === 'JEFE_AREA',
      },
      activo: perfil.activo,
      fechaCreacion: new Date(perfil.createdAt).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      ultimoAcceso: perfil.ultimoLogin
        ? new Date(perfil.ultimoLogin).toLocaleString('es-MX')
        : 'Nunca',
      // Campos adicionales
      apellidos: perfil.apellidos,
      nombreCompleto: perfil.nombreCompleto,
      puesto: perfil.puesto,
      areasPermitidas: perfil.areasPermitidas,
      avatar: perfil.avatar,
    };
  };

  // Cargar usuarios desde la API al montar
  useEffect(() => {
    // ADMIN y JEFE_AREA pueden listar usuarios
    if (useRealApi && (usuarioActual?.rol === 'administrador' || usuarioActual?.rol === 'jefe_area')) {
      cargarUsuarios();
    }
  }, [useRealApi, usuarioActual]);

  // Función para cargar usuarios desde la API
  const cargarUsuarios = async () => {
    setCargandoUsuarios(true);
    try {
      const usuariosApi = await authApi.listUsers();
      const usuariosConvertidos = usuariosApi.map(convertirPerfilApi);
      setUsuarios(usuariosConvertidos);
    } catch (error: any) {
      console.error('Error al cargar usuarios:', error);
      toast.error('Error al cargar usuarios', {
        description: error.message || 'Intenta de nuevo',
      });
    } finally {
      setCargandoUsuarios(false);
    }
  };

  // Filtrar usuarios según el rol
  const usuariosVisibles = usuarios.filter(u => {
    // Admin ve todos
    if (usuarioActual?.rol === 'administrador') return true;
    // Jefe de área solo ve usuarios de su área
    if (usuarioActual?.rol === 'jefe_area') {
      return u.area === usuarioActual.area;
    }
    // Usuarios normales no pueden ver esta sección
    return false;
  });

  const usuariosFiltrados = usuariosVisibles.filter(u => 
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.area?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRolDisplay = (rol: string) => {
    const roles: Record<string, string> = {
      'administrador': 'Administrador',
      'jefe_area': 'Director',
      'usuario': 'Auxiliar Administrativo',
    };
    return roles[rol] || rol;
  };

  const handleActualizarUsuario = (usuario: User) => {
    setUsuarios(usuarios.map(u => 
      u.id === usuario.id ? { ...u, ...usuario } : u
    ));
    toast.success('Usuario actualizado correctamente');
  };

  // Generar contraseña simple y fácil de recordar
  const generarContrasenaSimple = () => {
    const palabras = ['atotonilco', 'usuario', 'ayto', 'tula'];
    const palabra = palabras[Math.floor(Math.random() * palabras.length)];
    const numero = Math.floor(Math.random() * 999) + 100; // número de 3 dígitos
    const contrasena = `${palabra}${numero}`;
    
    setFormData({ ...formData, contrasena });
    setContrasenaGenerada(contrasena);
    toast.success('Contraseña generada', {
      description: 'Copia la contraseña antes de crear el usuario',
    });
  };

  const copiarContrasena = () => {
    if (!formData.contrasena) return;

    // Crear un elemento textarea temporal
    const textarea = document.createElement('textarea');
    textarea.value = formData.contrasena;
    
    // Hacerlo visible pero fuera de la pantalla
    textarea.style.position = 'fixed';
    textarea.style.left = '0';
    textarea.style.top = '0';
    textarea.style.opacity = '0';
    
    document.body.appendChild(textarea);
    
    // Enfocar y seleccionar el contenido
    textarea.focus();
    textarea.select();
    
    // Intentar copiar
    try {
      const successful = document.execCommand('copy');
      
      if (successful) {
        toast.success('✓ Copiado al portapapeles', {
          description: formData.contrasena,
        });
      } else {
        toast.error('No se pudo copiar', {
          description: `Copia manualmente: ${formData.contrasena}`,
        });
      }
    } catch (err) {
      toast.error('Error al copiar', {
        description: `Copia manualmente: ${formData.contrasena}`,
      });
    } finally {
      // Limpiar
      document.body.removeChild(textarea);
    }
  };

  const handleCrearUsuario = async () => {
    if (!formData.nombre || !formData.apellidos || !formData.email || !formData.contrasena || !formData.puesto) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    if (useRealApi) {
      // Crear usuario con API real
      setCreandoUsuario(true);
      try {
        const payload: authApi.CreateUserPayload = {
          nombre: formData.nombre,
          apellidos: formData.apellidos,
          email: formData.email,
          password: formData.contrasena,
          puesto: formData.puesto,
          areasPermitidas: formData.areasPermitidas, // Enviar nombres directamente, sin convertir a IDs
        };

        const nuevoUsuarioApi = await authApi.createUser(payload);
        const nuevoUsuarioConvertido = convertirPerfilApi(nuevoUsuarioApi);
        
        setUsuarios([...usuarios, nuevoUsuarioConvertido]);
        
        toast.success('Usuario creado correctamente', {
          description: `Contraseña: ${formData.contrasena} - Asegúrate de guardarla`,
          duration: 8000,
        });
        
        setDialogoNuevoUsuario(false);
        setFormData({
          nombre: '',
          apellidos: '',
          email: '',
          puesto: '',
          areasPermitidas: [],
          contrasena: '',
        });
        setContrasenaGenerada('');
      } catch (error: any) {
        console.error('Error al crear usuario:', error);
        
        if (error.message.includes('email ya esta registrado') || error.message.includes('409')) {
          toast.error('El correo ya está registrado');
        } else if (error.message.includes('Campos requeridos')) {
          toast.error('Faltan campos requeridos');
        } else {
          toast.error('Error al crear usuario', {
            description: error.message || 'Intenta de nuevo',
          });
        }
      } finally {
        setCreandoUsuario(false);
      }
    } else {
      // Crear usuario en modo mock (simulado)
      const nuevoUsuario: UsuarioExtendido = {
        id: Date.now().toString(),
        nombre: `${formData.nombre} ${formData.apellidos}`,
        email: formData.email,
        rol: 'usuario', // Por defecto
        area: formData.areasPermitidas[0],
        permisos: { lectura: true, escritura: false, edicion: false },
        activo: true,
        fechaCreacion: new Date().toLocaleDateString('es-MX', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        }),
        ultimoAcceso: 'Nunca',
      };

      setUsuarios([...usuarios, nuevoUsuario]);
      
      toast.success('Usuario creado correctamente', {
        description: `Contraseña: ${formData.contrasena} - Asegúrate de guardarla`,
        duration: 8000,
      });
      
      setDialogoNuevoUsuario(false);
      setFormData({
        nombre: '',
        apellidos: '',
        email: '',
        puesto: '',
        areasPermitidas: [],
        contrasena: '',
      });
      setContrasenaGenerada('');
    }
  };

  const handleNuevoUsuario = () => {
    // Precargar área si es jefe de área con una sola área
    if (usuarioActual?.rol === 'jefe_area' && usuarioActual.areasPermitidas) {
      if (usuarioActual.areasPermitidas.length === 1) {
        // Si solo tiene 1 área, asignarla automáticamente
        const areaUnica = obtenerAreasDisponibles('JEFE_AREA', usuarioActual.areasPermitidas)[0];
        setFormData({
          nombre: '',
          apellidos: '',
          email: '',
          puesto: '',
          areasPermitidas: areaUnica ? [areaUnica.nombre] : usuarioActual.areasPermitidas,
          contrasena: '',
        });
      } else {
        // Si tiene múltiples áreas, no precargar ninguna
        setFormData({
          nombre: '',
          apellidos: '',
          email: '',
          puesto: '',
          areasPermitidas: [],
          contrasena: '',
        });
      }
    } else {
      // Admin o usuario sin áreas
      setFormData({
        nombre: '',
        apellidos: '',
        email: '',
        puesto: '',
        areasPermitidas: [],
        contrasena: '',
      });
    }
    setContrasenaGenerada('');
    setDialogoNuevoUsuario(true);
  };

  // Verificar permisos
  if (!usuarioActual || (usuarioActual.rol !== 'administrador' && usuarioActual.rol !== 'jefe_area')) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="pt-6 text-center">
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

  if (vistaDetalle) {
    return (
      <DetalleUsuario
        usuario={vistaDetalle}
        onVolver={() => setVistaDetalle(null)}
        onActualizar={handleActualizarUsuario}
        esAdmin={usuarioActual.rol === 'administrador'}
        esJefeArea={usuarioActual.rol === 'jefe_area'}
        areaActual={usuarioActual.area}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Encabezado */}
      <div className="mb-8">
        <Button variant="ghost" onClick={onVolver} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Dashboard
        </Button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center shadow-md">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
              <p className="text-sm text-gray-600">
                {usuarioActual.rol === 'administrador' 
                  ? 'Administración de cuentas del sistema'
                  : `Usuarios del área de ${usuarioActual.area}`}
              </p>
            </div>
          </div>

          <Dialog open={dialogoNuevoUsuario} onOpenChange={setDialogoNuevoUsuario}>
            <DialogTrigger asChild>
              <Button 
                onClick={handleNuevoUsuario}
                className="bg-gray-800 hover:bg-gray-900"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nuevo Usuario</DialogTitle>
                <DialogDescription>
                  Completa la información para crear un nuevo usuario
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre(s) *</Label>
                  <Input
                    id="nombre"
                    placeholder="Ej: Juan"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="apellidos">Apellidos *</Label>
                  <Input
                    id="apellidos"
                    placeholder="Ej: Pérez García"
                    value={formData.apellidos}
                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@atotonilco.gob.mx"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="puesto">Puesto *</Label>
                  <Select
                    value={formData.puesto}
                    onValueChange={(value) => setFormData({ ...formData, puesto: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un puesto" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarioActual.rol === 'administrador' && (
                        <>
                          <SelectItem value="Jefe de Area">Jefe de Área</SelectItem>
                          <SelectItem value="Director">Director</SelectItem>
                          <SelectItem value="Coordinador">Coordinador</SelectItem>
                        </>
                      )}
                      <SelectItem value="Empleado">Empleado</SelectItem>
                      <SelectItem value="Operativo">Operativo</SelectItem>
                      <SelectItem value="Asistente">Asistente</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    El rol se asigna automáticamente según el puesto
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="areas">Áreas Permitidas *</Label>
                  {usuarioActual.rol === 'administrador' ? (
                    // ADMIN: Puede seleccionar múltiples áreas
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 mb-3">
                        Selecciona una o más áreas (el usuario tendrá acceso a todas las seleccionadas)
                      </p>
                      <div className="grid grid-cols-2 gap-3 max-h-[250px] overflow-y-auto p-2 border rounded-lg">
                        {AREAS_SISTEMA.map((area) => (
                          <div key={area.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`area-${area.id}`}
                              checked={formData.areasPermitidas.includes(area.nombre)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({
                                    ...formData,
                                    areasPermitidas: [...formData.areasPermitidas, area.nombre],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    areasPermitidas: formData.areasPermitidas.filter(a => a !== area.nombre),
                                  });
                                }
                              }}
                            />
                            <Label
                              htmlFor={`area-${area.id}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {area.nombre}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {formData.areasPermitidas.length > 0 && (
                        <p className="text-xs text-green-600 mt-2">
                          ✓ {formData.areasPermitidas.length} área{formData.areasPermitidas.length > 1 ? 's' : ''} seleccionada{formData.areasPermitidas.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  ) : usuarioActual.rol === 'jefe_area' ? (
                    // JEFE DE ÁREA: Filtrar según sus áreas permitidas
                    usuarioActual.areasPermitidas && usuarioActual.areasPermitidas.length === 1 ? (
                      // Si solo tiene 1 área, no mostrar selector
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-700">
                          {obtenerAreasDisponibles('JEFE_AREA', usuarioActual.areasPermitidas)[0]?.nombre || usuarioActual.areasPermitidas[0]}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Área asignada automáticamente
                        </p>
                      </div>
                    ) : (
                      // Si tiene múltiples áreas, mostrar dropdown con sus áreas permitidas
                      <div className="space-y-2">
                        <Select
                          value={formData.areasPermitidas[0] || ''}
                          onValueChange={(value) => setFormData({ ...formData, areasPermitidas: [value] })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un área" />
                          </SelectTrigger>
                          <SelectContent>
                            {obtenerAreasDisponibles('JEFE_AREA', usuarioActual.areasPermitidas).map((area) => (
                              <SelectItem key={area.id} value={area.nombre}>
                                {area.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                          Solo puedes asignar áreas en las que tienes permisos
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm text-red-700">Sin permisos para asignar áreas</p>
                    </div>
                  )}
                </div>

                {/* Campo de Contraseña */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="contrasena">Contraseña *</Label>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={generarContrasenaSimple}
                      className="h-auto p-0 text-gray-700"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Generar
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="contrasena"
                      type={mostrarContrasena ? "text" : "password"}
                      placeholder="Escribe o genera una contraseña"
                      value={formData.contrasena}
                      onChange={(e) => setFormData({ ...formData, contrasena: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setMostrarContrasena(!mostrarContrasena)}
                      title={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copiarContrasena}
                      disabled={!formData.contrasena}
                      title="Copiar contraseña"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.contrasena && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <KeyRound className="h-3 w-3" />
                      Longitud: {formData.contrasena.length} caracteres
                    </p>
                  )}
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    💡 Tip: Usa el botón "Generar" para crear contraseñas simples y fáciles de recordar
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setDialogoNuevoUsuario(false)}
                  disabled={creandoUsuario}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCrearUsuario}
                  className="bg-gray-800 hover:bg-gray-900"
                  disabled={creandoUsuario}
                >
                  {creandoUsuario ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Usuario'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Usuarios</CardDescription>
            <CardTitle className="text-3xl">{usuariosVisibles.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Usuarios Activos</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {usuariosVisibles.filter(u => u.activo).length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Directores</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {usuariosVisibles.filter(u => u.rol === 'jefe_area').length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Auxiliares Administrativos</CardDescription>
            <CardTitle className="text-3xl text-gray-700">
              {usuariosVisibles.filter(u => u.rol === 'usuario').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Barra de búsqueda */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, correo o área..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            {usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? 's' : ''} encontrado{usuariosFiltrados.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cargandoUsuarios ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-gray-500 mb-4" />
                <p className="text-gray-500">Cargando usuarios...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {usuariosFiltrados.map((usuario) => (
                  <div
                    key={usuario.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="h-12 w-12">
                        {usuario.avatar && <AvatarImage src={usuario.avatar} alt={usuario.nombre} />}
                        <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white">
                          {getInitials(usuario.nombre)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{usuario.nombre}</h3>
                          {!usuario.activo && (
                            <Badge variant="secondary" className="text-xs">
                              Inactivo
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{usuario.email}</p>
                      </div>

                      <div className="hidden md:block text-right">
                        <Badge variant="outline" className="mb-1">
                          {getRolDisplay(usuario.rol)}
                        </Badge>
                        {usuario.area && (
                          <p className="text-xs text-gray-500">{usuario.area}</p>
                        )}
                      </div>

                      <div className="hidden lg:block text-right text-sm text-gray-500">
                        <p className="text-xs">Último acceso</p>
                        <p>{usuario.ultimoAcceso}</p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVistaDetalle(usuario)}
                      className="ml-4"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalle
                    </Button>
                  </div>
                ))}

                {usuariosFiltrados.length === 0 && !cargandoUsuarios && (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No se encontraron usuarios</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}