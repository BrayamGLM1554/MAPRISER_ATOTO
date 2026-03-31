import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import * as authApi from '../services/authApi';
import { toast } from 'sonner';

// TOGGLE: true = usar API real, false = usar mock
const USE_REAL_API = true;

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: 'administrador' | 'jefe_area' | 'usuario';
  area?: string;
  permisos?: {
    lectura: boolean;
    escritura: boolean;
    edicion: boolean;
  };
  activo?: boolean;
  fechaCreacion?: string;
  ultimoAcceso?: string;
  // Campos adicionales de la API real
  apellidos?: string;
  nombreCompleto?: string;
  puesto?: string;
  areasPermitidas?: string[];
  avatar?: string | null;
  // Rol original de la API (ADMIN, JEFE_AREA, EMPLEADO, ASISTENTE)
  rolApi?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  useRealApi: boolean;
  updateUserProfile: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mapeo de roles de API a roles internos
function mapRolFromApi(apiRol: string): 'administrador' | 'jefe_area' | 'usuario' {
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
}

// Usuarios de ejemplo (MOCK)
const mockUsers: Record<string, { password: string; user: User }> = {
  'admin@atotonilco.gob.mx': {
    password: 'admin123',
    user: {
      id: '1',
      nombre: 'Administrador General',
      email: 'admin@atotonilco.gob.mx',
      rol: 'administrador',
      permisos: { lectura: true, escritura: true, edicion: true },
      activo: true,
      fechaCreacion: '1 de enero de 2024',
      ultimoAcceso: new Date().toLocaleString('es-MX'),
      areasPermitidas: [], // Admin tiene acceso a todas
    },
  },
  'rh@atotonilco.gob.mx': {
    password: 'rh123',
    user: {
      id: '2',
      nombre: 'Juan Pérez García',
      email: 'rh@atotonilco.gob.mx',
      rol: 'jefe_area',
      area: 'Recursos Humanos',
      permisos: { lectura: true, escritura: true, edicion: true },
      activo: true,
      fechaCreacion: '15 de enero de 2024',
      ultimoAcceso: new Date().toLocaleString('es-MX'),
      areasPermitidas: ['recursos-humanos'],
    },
  },
  'tesoreria@atotonilco.gob.mx': {
    password: 'tesoreria123',
    user: {
      id: '3',
      nombre: 'María González López',
      email: 'tesoreria@atotonilco.gob.mx',
      rol: 'jefe_area',
      area: 'Secretaría / Tesorería',
      permisos: { lectura: true, escritura: true, edicion: true },
      activo: true,
      fechaCreacion: '20 de enero de 2024',
      ultimoAcceso: new Date().toLocaleString('es-MX'),
      areasPermitidas: ['secretaria', 'tesoreria'],
    },
  },
  'asistente.rh@atotonilco.gob.mx': {
    password: 'asistente123',
    user: {
      id: '4',
      nombre: 'Carlos Ramírez Soto',
      email: 'asistente.rh@atotonilco.gob.mx',
      rol: 'usuario',
      area: 'Recursos Humanos',
      permisos: { lectura: true, escritura: false, edicion: false },
      activo: true,
      fechaCreacion: '1 de febrero de 2024',
      ultimoAcceso: new Date().toLocaleString('es-MX'),
      areasPermitidas: [],
    },
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Sincronizar usuario con localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('Error al sincronizar usuario con localStorage:', error);
    }
  }, [user]);

  // Al cargar, intentar recuperar sesión desde token
  useEffect(() => {
    if (USE_REAL_API) {
      const loadSession = async () => {
        try {
          const perfil = await authApi.getPerfil();
          
          // Las áreas ya vienen en formato de nombre desde la API ("Recursos Humanos")
          // No es necesario normalizarlas
          const areasPermitidas = perfil.areasPermitidas || [];
          
          const userFromApi: User = {
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
            fechaCreacion: new Date(perfil.createdAt).toLocaleDateString('es-MX'),
            ultimoAcceso: perfil.ultimoLogin ? new Date(perfil.ultimoLogin).toLocaleString('es-MX') : undefined,
            // Campos adicionales
            apellidos: perfil.apellidos,
            nombreCompleto: perfil.nombreCompleto,
            puesto: perfil.puesto,
            areasPermitidas: areasPermitidas, // Ya vienen en formato de nombre
            avatar: perfil.avatar,
            rolApi: perfil.rol, // ← AGREGADO: Guardar rol original de la API
          };

          setUser(userFromApi);
          console.log('✅ Sesión recuperada exitosamente');
        } catch (error: any) {
          // Si no hay token válido, no hacer nada (no es un error)
          if (error.message?.includes('No hay token') || error.message?.includes('Token inválido')) {
            console.log('ℹ️ No hay sesión activa');
          } else {
            console.log('⚠️ Error al recuperar sesión:', error.message);
          }
          // No mostrar toast ni lanzar error, simplemente quedarse sin usuario
          // Limpiar cualquier dato corrupto
          try {
            localStorage.removeItem('user');
            authApi.removeToken();
          } catch (cleanupError) {
            console.error('Error al limpiar datos:', cleanupError);
          }
        }
      };

      loadSession();
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (USE_REAL_API) {
      // Login con API real
      try {
        const response = await authApi.login(email, password);
        
        console.log('📋 Respuesta de login:', {
          areasPermitidas: response.perfil.areasPermitidas,
          rol: response.perfil.rol,
        });
        
        // Las áreas ya vienen en formato de nombre desde la API ("Recursos Humanos")
        // No es necesario normalizarlas
        const areasPermitidas = response.perfil.areasPermitidas || [];
        
        // Convertir perfil de API a User local
        const userFromApi: User = {
          id: response.perfil.id,
          nombre: response.perfil.nombreCompleto || `${response.perfil.nombre} ${response.perfil.apellidos}`,
          email: response.perfil.email,
          rol: mapRolFromApi(response.perfil.rol),
          area: response.perfil.areasPermitidas?.[0] || undefined,
          permisos: {
            lectura: true,
            escritura: response.perfil.rol === 'ADMIN' || response.perfil.rol === 'JEFE_AREA',
            edicion: response.perfil.rol === 'ADMIN' || response.perfil.rol === 'JEFE_AREA',
          },
          activo: response.perfil.activo,
          fechaCreacion: new Date(response.perfil.createdAt).toLocaleDateString('es-MX'),
          ultimoAcceso: response.perfil.ultimoLogin ? new Date(response.perfil.ultimoLogin).toLocaleString('es-MX') : undefined,
          // Campos adicionales
          apellidos: response.perfil.apellidos,
          nombreCompleto: response.perfil.nombreCompleto,
          puesto: response.perfil.puesto,
          areasPermitidas: areasPermitidas, // Ya vienen en formato de nombre
          avatar: response.perfil.avatar,
          rolApi: response.perfil.rol, // ← AGREGADO: Guardar rol original de la API
        };

        console.log('👤 Usuario mapeado:', {
          areasPermitidas: userFromApi.areasPermitidas,
          area: userFromApi.area,
        });

        setUser(userFromApi);
        return true;
      } catch (error: any) {
        console.error('Error en login real:', error);
        
        // Mensajes de error específicos
        if (error.message.includes('Credenciales invalidas')) {
          toast.error('Correo o contraseña incorrectos');
        } else if (error.message.includes('Usuario inactivo')) {
          toast.error('Usuario inactivo. Contacta al administrador');
        } else if (error.message.includes('Network') || error.message.includes('timeout')) {
          toast.error('Error de conexión. Intenta de nuevo');
        } else {
          toast.error('Error al iniciar sesión');
        }
        
        return false;
      }
    } else {
      // Login simulado (MOCK)
      const mockUser = mockUsers[email];
      if (mockUser && mockUser.password === password) {
        setUser(mockUser.user);
        return true;
      }
      return false;
    }
  };

  const logout = () => {
    if (USE_REAL_API) {
      authApi.removeToken();
    }
    setUser(null);
  };

  const updateUserProfile = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated: !!user,
      useRealApi: USE_REAL_API,
      updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}