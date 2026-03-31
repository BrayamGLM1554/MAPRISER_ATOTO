// Cliente API para autenticación y gestión de usuarios
const BASE_URL = 'https://login-pwa-atoto.onrender.com';
const TIMEOUT_MS = 30000; // Aumentado a 30 segundos para cold starts de Render

// Tipos de la API
export type Rol = 'ADMIN' | 'JEFE_AREA' | 'EMPLEADO' | 'ASISTENTE';

export interface PerfilUsuario {
  primerIngreso: boolean;
  id: string;
  nombre: string;
  apellidos: string;
  nombreCompleto: string;
  email: string;
  rol: Rol;
  puesto: string;
  areasPermitidas: string[];
  avatar: string | null;
  activo: boolean;
  ultimoLogin: string | null;
  loginActual: string;
  createdAt: string;
  avisoPrivacidadAceptado: boolean;
}

export interface LoginResponse {
  token: string;
  perfil: PerfilUsuario;
}

export interface CreateUserPayload {
  nombre: string;
  apellidos: string;
  email: string;
  password: string;
  puesto: string;
  areasPermitidas: string[];
}

export interface UpdateAreasPayload {
  areasPermitidas: string[];
}

/**
 * Helper: Fetch con timeout y 1 reintento automático
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = TIMEOUT_MS,
  retries = 1
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (retries > 0) {
      console.warn(`Request failed, retrying in 1s... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithTimeout(url, options, timeoutMs, retries - 1);
    }
    
    throw error;
  }
}

/**
 * Obtener token del localStorage
 */
function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Guardar token en localStorage
 */
function setToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

/**
 * Eliminar token del localStorage
 */
export function removeToken(): void {
  localStorage.removeItem('auth_token');
}

export async function cambiarPasswordInicial(nuevaPassword: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('No hay token de autenticación');

  const response = await fetchWithTimeout(`${BASE_URL}/auth/cambiar-password-inicial`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ nuevaPassword }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al cambiar contraseña');
  }
}

export async function aceptarAviso(): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('No hay token de autenticación');

  const response = await fetchWithTimeout(`${BASE_URL}/auth/aceptar-aviso`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al aceptar aviso');
  }
}

/**
 * Iniciar sesión
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    console.log('📤 POST /auth/login', { email });

    const response = await fetchWithTimeout(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: LoginResponse = await response.json();
    
    // Guardar token
    setToken(data.token);
    
    console.log('✅ POST /auth/login - Success:', {
      usuario: data.perfil.nombreCompleto,
      rol: data.perfil.rol,
    });

    return data;
  } catch (error) {
    console.error('❌ Error al iniciar sesión:', error);
    throw error;
  }
}

/**
 * Obtener perfil del usuario autenticado
 */
export async function getPerfil(): Promise<PerfilUsuario> {
  const token = getToken();
  if (!token) {
    throw new Error('No hay token de autenticación');
  }

  try {
    console.log('📤 GET /auth/perfil');

    const response = await fetchWithTimeout(`${BASE_URL}/auth/perfil`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
        throw new Error('Token inválido o expirado');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ GET /auth/perfil - Success');
    return data.perfil;
  } catch (error: any) {
    // Solo loguear si NO es un error de token (esos son esperados al inicio)
    if (!error.message?.includes('Token inválido') && !error.message?.includes('No hay token')) {
      console.error('❌ Error al obtener perfil:', error);
    }
    throw error;
  }
}

/**
 * Listar todos los usuarios (solo ADMIN)
 */
export async function listUsers(): Promise<PerfilUsuario[]> {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    console.log('📤 GET /admin/users');

    const response = await fetchWithTimeout(`${BASE_URL}/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
        throw new Error('Token inválido o expirado');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ GET /admin/users - ${data.usuarios?.length || 0} usuarios`);
    return data.usuarios || [];
  } catch (error) {
    console.error('❌ Error al listar usuarios:', error);
    throw error;
  }
}

/**
 * Crear nuevo usuario (solo ADMIN)
 */
export async function createUser(payload: CreateUserPayload): Promise<PerfilUsuario> {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    console.log('📤 POST /admin/users', { email: payload.email });

    const response = await fetchWithTimeout(`${BASE_URL}/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
        throw new Error('Token inválido o expirado');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ POST /admin/users - Success');
    return data.usuario;
  } catch (error) {
    console.error('❌ Error al crear usuario:', error);
    throw error;
  }
}

/**
 * Actualizar áreas de un usuario (solo ADMIN)
 */
export async function updateUserAreas(userId: string, payload: UpdateAreasPayload): Promise<PerfilUsuario> {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    console.log(`📤 PATCH /admin/users/${userId}/areas`);

    const response = await fetchWithTimeout(`${BASE_URL}/admin/users/${userId}/areas`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
        throw new Error('Token inválido o expirado');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ PATCH /admin/users/:id/areas - Success');
    return data.usuario;
  } catch (error) {
    console.error('❌ Error al actualizar áreas:', error);
    throw error;
  }
}

/**
 * Activar/Desactivar usuario (solo ADMIN)
 */
export async function toggleUserStatus(userId: string): Promise<PerfilUsuario> {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    console.log(`📤 PATCH /admin/users/${userId}/toggle`);

    const response = await fetchWithTimeout(`${BASE_URL}/admin/users/${userId}/toggle`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
        throw new Error('Token inválido o expirado');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ PATCH /admin/users/:id/toggle - Success');
    return data.usuario;
  } catch (error) {
    console.error('❌ Error al cambiar estado:', error);
    throw error;
  }
}

/**
 * Subir avatar de usuario (solo ADMIN)
 */
export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const formData = new FormData();
    formData.append('avatar', file);

    console.log(`📤 POST /admin/users/${userId}/avatar`);

    const response = await fetchWithTimeout(`${BASE_URL}/admin/users/${userId}/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // NO establecer Content-Type, el navegador lo hace automáticamente con boundary
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
        throw new Error('Token inválido o expirado');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ POST /admin/users/:id/avatar - Success');
    return data.avatar;
  } catch (error) {
    console.error('❌ Error al subir avatar:', error);
    throw error;
  }
}

/**
 * Restablecer contraseña de un usuario (solo JEFE_AREA)
 */
export async function resetUserPassword(userId: string, newPassword: string): Promise<{ message: string }> {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    console.log(`📤 PATCH /users/${userId}/password`);

    const response = await fetchWithTimeout(`${BASE_URL}/auth/users/${userId}/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ nuevaPassword: newPassword }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
        throw new Error('Token inválido o expirado');
      }
      if (response.status === 403) {
        throw new Error('No tienes permisos para realizar esta acción');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ PATCH /users/:id/password - Success');
    return data;
  } catch (error) {
    console.error('❌ Error al restablecer contraseña:', error);
    throw error;
  }
}