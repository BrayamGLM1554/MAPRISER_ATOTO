// Cliente API para guardar machotes en MongoDB (Render)
const BASE_URL = 'https://machotes-guardado.onrender.com';
const TIMEOUT_MS = 30000; // Aumentado a 30 segundos para cold starts de Render

// Mapeo de áreas a claves
const AREA_KEY_MAP: Record<string, string> = {
  'Recursos Humanos': 'RH',
  'Secretaría': 'SEC',
  'Tesorería': 'TES',
  'Secretaría / Tesorería': 'SEC',
  'Obras Públicas': 'OP',
  'Desarrollo Social': 'DS',
  'Seguridad Pública': 'SP',
  'Catastro': 'CAT',
  'Servicios Públicos': 'SERV',
};

/**
 * Interface para auditoría de acciones
 */
interface AuditActor {
  userId: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Obtener token del localStorage
 */
function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Obtener actor desde localStorage para auditoría
 * Construye el objeto actor desde los datos del usuario logueado
 */
function getActor(): AuditActor | null {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    const user = JSON.parse(userStr);
    
    // Aceptar tanto 'id' como '_id' (MongoDB puede devolver _id)
    const userId = user.id || user._id;
    const email  = user.email;

    if (!userId && !email) {
      console.warn('⚠️ Usuario en localStorage sin id ni email, no se puede construir actor');
      return null;
    }

    // Construir nombre con cualquier combinación disponible
    const nombreCompleto =
      user.nombreCompleto ||
      `${user.nombre || ''} ${user.apellidos || ''}`.trim() ||
      email ||
      'Usuario';

    // Obtener rol (priorizar rolApi, fallback a rol, luego valor por defecto)
    const rol = user.rolApi || user.rol || 'EMPLEADO';

    return {
      userId: userId || email,
      name: nombreCompleto,
      email: email || '',
      role: rol,
    };
  } catch (error) {
    console.error('❌ Error al obtener actor desde localStorage:', error);
    return null;
  }
}

// Tipo de machote de la API
export interface ApiMachote {
  _id: string;
  title: string;
  areaKey: string;
  area: string;
  status: 'active' | 'draft' | 'inactive';
  content: {
    html: string;
    json: any | null;
  };
  variables: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
  }>;
  letterheadUrl: string;
  createdAt: string;
  updatedAt: string;
  fechaBaja?: string;
  fechaAlta?: string;
}

export interface ListMachotesResponse {
  items: ApiMachote[];
}

export interface GetMachoteResponse {
  data: ApiMachote;
}

/**
 * Helper: Fetch con timeout y 1 reintento automático (para Render cold start)
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
    
    // Si falla y tenemos reintentos, intentar de nuevo después de 1s
    if (retries > 0) {
      console.warn(`Request failed, retrying in 1s... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithTimeout(url, options, timeoutMs, retries - 1);
    }
    
    throw error;
  }
}

/**
 * Extraer variables únicas del HTML
 * Detecta placeholders con formato {{NombreVariable}}
 */
export function extractVariablesFromHTML(html: string): Array<{
  key: string;
  label: string;
  type: string;
  required: boolean;
}> {
  const variables: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
  }> = [];
  
  const regex = /\{\{\s*([^}]+?)\s*\}\}/g;
  const foundKeys = new Set<string>();
  let match;

  while ((match = regex.exec(html)) !== null) {
    const key = match[1].trim();
    if (!foundKeys.has(key)) {
      foundKeys.add(key);
      variables.push({
        key,
        label: key,
        type: 'string',
        required: true,
      });
    }
  }

  return variables;
}

/**
 * Extraer variables con formato [VARIABLE] (corchetes)
 * Esta es la sintaxis que usa el sistema para campos dinámicos
 */
export function extractVariablesFromSquareBrackets(html: string): Array<{
  key: string;
  label: string;
  type: string;
  required: boolean;
}> {
  const variables: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
  }> = [];
  
  const regex = /\[\s*([^\]]+?)\s*\]/g;
  const foundKeys = new Set<string>();
  let match;

  while ((match = regex.exec(html)) !== null) {
    const key = match[1].trim();
    if (!foundKeys.has(key)) {
      foundKeys.add(key);
      variables.push({
        key,
        label: key,
        type: 'string',
        required: true,
      });
    }
  }

  return variables;
}

/**
 * Normalizar placeholders: Convierte {{Variable}} a [Variable]
 * Esto asegura que el contenido de Groq use la sintaxis correcta
 */
export function normalizePlaceholders(text: string): string {
  // Convertir {{Variable}} a [Variable]
  let normalized = text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, '[$1]');
  
  // Opcional: Convertir {Variable} a [Variable] (sin doble llave)
  // Solo si NO es parte de CSS o JSON
  normalized = normalized.replace(/(?<![{"\'])\{([A-Z][A-Za-z0-9_]*)\}(?![}"\'])/g, '[$1]');
  
  return normalized;
}

/**
 * Crear un nuevo machote en la API
 */
export async function createMachote(payload: {
  title: string;
  area: string;
  contentHtml: string;
  letterheadUrl?: string;
  letterheadRef?: { id: string; areaId: string; nombre: string };
}): Promise<{ _id: string; data: any }> {
  try {
    const { title, area, contentHtml, letterheadUrl, letterheadRef } = payload;

    // Obtener areaKey del área
    const areaKey = AREA_KEY_MAP[area] || 'GEN';

    // Extraer variables del HTML con corchetes [VARIABLE]
    const variables = extractVariablesFromSquareBrackets(contentHtml);

    // Obtener actor para auditoría
    const actor = getActor();

    // Construir el payload completo
    const requestBody: any = {
      title,
      areaKey,
      area,
      status: 'active',
      content: {
        html: contentHtml,
      },
      variables,
      letterheadUrl: letterheadUrl || 'https://ejemplo.com/membretada_default.png',
    };

    // Agregar actor si está disponible
    if (actor) {
      requestBody.actor = actor;
      console.log('🔍 Actor agregado para auditoría:', actor);
    }

    // Agregar letterheadRef si está disponible
    if (letterheadRef && letterheadRef.id) {
      requestBody.letterheadRef = letterheadRef;
    }

    // Log para debug (solo desarrollo)
    console.log('📤 POST /machotes - Payload:', {
      title,
      areaKey,
      area,
      variablesCount: variables.length,
      contentLength: contentHtml.length,
      hasActor: !!actor,
    });

    // Hacer la petición POST
    const response = await fetchWithTimeout(`${BASE_URL}/machotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const responseData = await response.json();
    
    // Log para debug
    console.log('✅ POST /machotes - Success:', {
      _id: responseData.data?._id,
      message: responseData.message,
    });

    return {
      _id: responseData.data?._id || '',
      data: responseData.data,
    };
  } catch (error) {
    console.error('❌ Error al crear machote:', error);
    throw error;
  }
}

/**
 * Listar machotes con búsqueda opcional
 */
export async function listMachotes(term?: string, includeInactive?: boolean): Promise<ApiMachote[]> {
  try {
    const queryParams = new URLSearchParams();
    if (term) queryParams.append('term', term);
    if (includeInactive) queryParams.append('includeInactive', 'true');

    const url = `${BASE_URL}/machotes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    console.log('📤 GET /machotes', queryParams.toString() || '(sin parámetros)');

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ListMachotesResponse = await response.json();
    console.log(`✅ GET /machotes - ${data.items?.length || 0} machotes obtenidos`);
    return data.items || [];
  } catch (error) {
    console.error('❌ Error al listar machotes:', error);
    throw error;
  }
}

/**
 * Listar SOLO los machotes creados por el usuario logueado
 * Endpoint: GET /machotes/mis-machotes
 */
export async function listMisMachotes(term?: string, includeInactive?: boolean): Promise<ApiMachote[]> {
  try {
    const queryParams = new URLSearchParams();
    if (term) queryParams.append('term', term);
    if (includeInactive) queryParams.append('includeInactive', 'true');

    const url = `${BASE_URL}/machotes/mis-machotes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    console.log('📤 GET /machotes/mis-machotes', queryParams.toString() || '(sin parámetros)');

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ListMachotesResponse = await response.json();
    console.log(`✅ GET /machotes/mis-machotes - ${data.items?.length || 0} machotes obtenidos`);
    return data.items || [];
  } catch (error) {
    console.error('❌ Error al listar mis machotes:', error);
    throw error;
  }
}

/**
 * Obtener un machote por ID
 */
export async function getMachote(id: string): Promise<ApiMachote> {
  try {
    console.log(`📤 GET /machotes/${id}`);

    const response = await fetchWithTimeout(`${BASE_URL}/machotes/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: GetMachoteResponse = await response.json();
    console.log(`✅ GET /machotes/${id} - Success:`, {
      title: data.data.title,
      area: data.data.area,
      variablesCount: data.data.variables?.length || 0,
    });
    return data.data;
  } catch (error) {
    console.error(`❌ Error al obtener machote ${id}:`, error);
    throw error;
  }
}

/**
 * Actualizar un machote existente
 */
export async function updateMachote(
  id: string,
  payload: {
    title: string;
    areaKey: string;
    area: string;
    status: string;
    content: {
      text?: string;
      html?: string;
      json?: any | null;
    };
    letterheadUrl: string;
  }
): Promise<ApiMachote> {
  try {
    // Obtener actor para auditoría
    const actor = getActor();

    // Construir el payload con actor si está disponible
    const requestBody: any = { ...payload };
    if (actor) {
      requestBody.actor = actor;
      console.log('🔍 Actor agregado para auditoría:', actor);
    }

    console.log(`📤 PUT /machotes/${id} - Payload:`, {
      title: payload.title,
      areaKey: payload.areaKey,
      area: payload.area,
      contentTextLength: payload.content?.text?.length || 0,
      contentHtmlLength: payload.content?.html?.length || 0,
      hasActor: !!actor,
    });

    const response = await fetchWithTimeout(`${BASE_URL}/machotes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const responseData: GetMachoteResponse = await response.json();
    console.log(`✅ PUT /machotes/${id} - Success`);
    return responseData.data;
  } catch (error) {
    console.error(`❌ Error al actualizar machote ${id}:`, error);
    throw error;
  }
}

/**
 * Helper: Obtener areaKey desde área
 */
export function getAreaKey(area: string): string {
  return AREA_KEY_MAP[area] || 'GEN';
}

/**
 * Desactivar (dar de baja) un machote
 * Cambia status a "inactive" y guarda fechaBaja
 */
export async function deactivateMachote(id: string): Promise<ApiMachote> {
  try {
    // Obtener actor para auditoría
    const actor = getActor();

    // Construir body con actor si está disponible
    const requestBody: any = {};
    if (actor) {
      requestBody.actor = actor;
      console.log('🔍 Actor agregado para auditoría:', actor);
    }

    console.log(`📤 POST /machotes/${id}/deactivate`, { hasActor: !!actor });

    const response = await fetchWithTimeout(`${BASE_URL}/machotes/${id}/deactivate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const responseData: GetMachoteResponse = await response.json();
    console.log(`✅ POST /machotes/${id}/deactivate - Success`);
    return responseData.data;
  } catch (error) {
    console.error(`❌ Error al desactivar machote ${id}:`, error);
    throw error;
  }
}

/**
 * Reactivar un machote dado de baja
 * Cambia status a "active" y guarda fechaAlta
 */
export async function reactivateMachote(id: string): Promise<ApiMachote> {
  try {
    // Obtener actor para auditoría
    const actor = getActor();

    // Construir body con actor si está disponible
    const requestBody: any = {};
    if (actor) {
      requestBody.actor = actor;
      console.log('🔍 Actor agregado para auditoría:', actor);
    }

    console.log(`📤 POST /machotes/${id}/reactivate`, { hasActor: !!actor });

    const response = await fetchWithTimeout(`${BASE_URL}/machotes/${id}/reactivate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const responseData: GetMachoteResponse = await response.json();
    console.log(`✅ POST /machotes/${id}/reactivate - Success`);
    return responseData.data;
  } catch (error) {
    console.error(`❌ Error al reactivar machote ${id}:`, error);
    throw error;
  }
}

// ============================================================================
// API DE HOJAS MEMBRETADAS (Cloudinary Integration)
// ============================================================================

const AUTH_BASE_URL = 'https://login-pwa-atoto.onrender.com';

// Wrapper para peticiones JSON con autenticación
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${AUTH_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });
  
  if (res.status === 401) {
    localStorage.clear();
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Error desconocido');
  return data as T;
}

// Wrapper para peticiones multipart/form-data (avatares y hojas membretadas)
async function apiFetchForm<T>(path: string, body: FormData, method = 'POST'): Promise<T> {
  const res = await fetch(`${AUTH_BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${getToken()}` },
    body,
  });
  
  if (res.status === 401) {
    localStorage.clear();
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Error desconocido');
  return data as T;
}

// Interfaces para hojas membretadas
export interface HojaMembretadaAPI {
  id: string;
  areaId: string;
  nombre: string;
  descripcion: string;
  archivo: {
    url: string;         // URL original (puede ser PDF) - usar para descarga
    previewUrl: string;  // URL de imagen JPEG - usar siempre en <img>
    publicId: string;
    formato: string;     // 'png' | 'jpg' | 'pdf' | 'webp'
    bytes: number;
  };
  activa: boolean;
  subidaPor: { nombre: string; apellidos: string; puesto: string };
  creadoEn: string;
  actualizadoEn: string;
}

export interface HojasMembreteadasAreaResponse {
  areaId: string;
  total: number;
  hojas: HojaMembretadaAPI[];
}

/**
 * Obtener hojas membretadas de un área específica
 */
export async function getHojasMembreteadasArea(areaId: string): Promise<HojasMembreteadasAreaResponse> {
  try {
    console.log(`📤 GET /membretadas/area/${areaId}`);
    const response = await apiFetch<HojasMembreteadasAreaResponse>(`/membretadas/area/${areaId}`);
    console.log(`✅ GET /membretadas/area/${areaId} - ${response.hojas.length} hojas obtenidas`);
    return response;
  } catch (error) {
    console.error(`❌ Error al obtener hojas membretadas del área ${areaId}:`, error);
    throw error;
  }
}

/**
 * Subir una nueva hoja membretada
 */
export async function subirHojaMembretada(
  archivo: File,
  areaId: string,
  nombre: string,
  descripcion?: string
): Promise<{ hoja: HojaMembretadaAPI }> {
  try {
    console.log(`📤 POST /membretadas - Subiendo hoja para área: ${areaId}`);
    
    const formData = new FormData();
    formData.append('archivo', archivo);  // IMPORTANTE: campo debe llamarse "archivo"
    formData.append('areaId', areaId);
    formData.append('nombre', nombre);
    if (descripcion) {
      formData.append('descripcion', descripcion);
    }
    
    const response = await apiFetchForm<{ hoja: HojaMembretadaAPI }>('/membretadas', formData);
    console.log(`✅ POST /membretadas - Hoja subida exitosamente:`, response.hoja.id);
    return response;
  } catch (error) {
    console.error('❌ Error al subir hoja membretada:', error);
    throw error;
  }
}

/**
 * Listar todas las hojas membretadas (con filtro opcional por área)
 */
export async function listarHojasMembreteadas(areaId?: string, page = 1, limit = 20): Promise<{
  hojas: HojaMembretadaAPI[];
  paginacion: { total: number; pagina: number; paginas: number; limite: number };
}> {
  try {
    const params = new URLSearchParams();
    if (areaId) params.append('areaId', areaId);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    const queryString = params.toString();
    console.log(`📤 GET /membretadas?${queryString}`);
    
    const response = await apiFetch<{
      hojas: HojaMembretadaAPI[];
      paginacion: { total: number; pagina: number; paginas: number; limite: number };
    }>(`/membretadas?${queryString}`);
    
    console.log(`✅ GET /membretadas - ${response.hojas.length} hojas obtenidas`);
    return response;
  } catch (error) {
    console.error('❌ Error al listar hojas membretadas:', error);
    throw error;
  }
}

/**
 * Obtener una hoja membretada por ID
 */
export async function getHojaMembretada(id: string): Promise<HojaMembretadaAPI> {
  try {
    console.log(`📤 GET /membretadas/${id}`);
    const response = await apiFetch<{ hoja: HojaMembretadaAPI }>(`/membretadas/${id}`);
    console.log(`✅ GET /membretadas/${id} - Hoja obtenida`);
    return response.hoja;
  } catch (error) {
    console.error(`❌ Error al obtener hoja membretada ${id}:`, error);
    throw error;
  }
}

/**
 * Eliminar una hoja membretada
 */
export async function eliminarHojaMembretada(id: string): Promise<void> {
  try {
    console.log(`📤 DELETE /membretadas/${id}`);
    await apiFetch<{ message: string }>(`/membretadas/${id}`, { method: 'DELETE' });
    console.log(`✅ DELETE /membretadas/${id} - Hoja eliminada`);
  } catch (error) {
    console.error(`❌ Error al eliminar hoja membretada ${id}:`, error);
    throw error;
  }
}

// ============================================================================
// ENDPOINTS DE DOCUMENTOS (LLENADO DE MACHOTES)
// ============================================================================

/**
 * Interface para documentos llenados
 */
export interface DocumentoAPI {
  _id: string;
  machoteId: string;
  campos: Record<string, string>;
  status: 'borrador' | 'final';
  createdBy: AuditActor;
  updatedBy?: AuditActor;
  createdAt: string;
  updatedAt: string;
}

/**
 * Crear un nuevo documento (POST /documentos)
 */
export async function createDocumento(payload: {
  machoteId: string;
  campos: Record<string, string>;
  status?: 'borrador' | 'final';
}): Promise<DocumentoAPI> {
  try {
    const actor = getActor();
    // Si no hay actor no bloqueamos la operación, el backend lo manejará
    if (!actor) {
      console.warn('⚠️ No se pudo construir actor para auditoría, continuando sin él');
    }

    const requestBody: Record<string, any> = {
      machoteId: payload.machoteId,
      campos: payload.campos,
      status: payload.status || 'borrador',
    };
    if (actor) requestBody.actor = actor;

    console.log('📤 POST /documentos - Payload:', requestBody);
    
    const response = await fetchWithTimeout(`${BASE_URL}/documentos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ POST /documentos - Documento creado:', data._id);
    return data;
  } catch (error) {
    console.error('❌ Error al crear documento:', error);
    throw error;
  }
}

/**
 * Obtener historial de documentos de un machote (GET /documentos?machoteId=xxx)
 */
export async function getDocumentosPorMachote(machoteId: string): Promise<DocumentoAPI[]> {
  try {
    const url = `${BASE_URL}/documentos?machoteId=${machoteId}`;
    console.log(`📤 GET ${url}`);
    
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error en GET /documentos: ${response.status} - ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    console.log('📦 Respuesta completa del servidor:', data);
    console.log('📦 Tipo de respuesta:', Array.isArray(data) ? 'Array' : typeof data);
    
    // Manejar diferentes estructuras de respuesta
    let documentos: DocumentoAPI[];
    if (Array.isArray(data)) {
      // Si la respuesta es un array directamente
      console.log('✅ Respuesta es un array directo');
      documentos = data.map(normalizeDocumento);
    } else if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) {
      // ✅ CORRECCIÓN: Si la respuesta tiene la estructura { items: [...], pagination: {...} }
      console.log('✅ Respuesta tiene estructura { items: [...] }');
      documentos = data.items.map(normalizeDocumento);
    } else if (data && typeof data === 'object' && 'documentos' in data) {
      // Si la respuesta tiene la estructura { documentos: [...] }
      console.log('✅ Respuesta tiene estructura { documentos: [...] }');
      documentos = data.documentos.map(normalizeDocumento);
    } else if (data && typeof data === 'object' && '_id' in data) {
      // Si la respuesta es un objeto individual (un solo documento)
      console.log('⚠️ Respuesta es un objeto individual, convirtiéndolo a array');
      documentos = [normalizeDocumento(data)];
    } else {
      console.warn('⚠️ Estructura de respuesta inesperada:', data);
      documentos = [];
    }
    
    console.log(`✅ GET /documentos?machoteId=${machoteId} - ${documentos.length} documentos obtenidos`);
    return documentos;
  } catch (error) {
    console.error(`❌ Error al obtener documentos del machote ${machoteId}:`, error);
    throw error;
  }
}

/**
 * Normalizar documento de MongoDB a DocumentoAPI
 * Convierte { "$oid": "xxx" } a "xxx" y { "$date": "xxx" } a "xxx"
 */
function normalizeDocumento(doc: any): DocumentoAPI {
  return {
    _id: doc._id?.$oid || doc._id,
    machoteId: doc.machoteId?.$oid || doc.machoteId,
    campos: doc.campos || {},
    status: doc.status || 'borrador',
    createdBy: doc.createdBy || { userId: '', name: '', email: '', role: '' },
    updatedBy: doc.updatedBy,
    createdAt: doc.createdAt?.$date || doc.createdAt,
    updatedAt: doc.updatedAt?.$date || doc.updatedAt,
  };
}

/**
 * Obtener un documento específico (GET /documentos/:id)
 */
export async function getDocumento(id: string): Promise<DocumentoAPI> {
  try {
    console.log(`📤 GET /documentos/${id}`);
    
    const response = await fetchWithTimeout(`${BASE_URL}/documentos/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ GET /documentos/${id} - Documento obtenido`);
    return data;
  } catch (error) {
    console.error(`❌ Error al obtener documento ${id}:`, error);
    throw error;
  }
}

/**
 * Actualizar un documento (PUT /documentos/:id)
 */
export async function updateDocumento(
  id: string,
  payload: {
    campos?: Record<string, string>;
    status?: 'borrador' | 'final';
  }
): Promise<DocumentoAPI> {
  try {
    const actor = getActor();
    // Si no hay actor no bloqueamos la operación, el backend lo manejará
    if (!actor) {
      console.warn('⚠️ No se pudo construir actor para auditoría, continuando sin él');
    }

    const requestBody: Record<string, any> = { ...payload };
    if (actor) requestBody.actor = actor;

    console.log(`📤 PUT /documentos/${id} - Payload:`, requestBody);
    
    const response = await fetchWithTimeout(`${BASE_URL}/documentos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ PUT /documentos/${id} - Documento actualizado`);
    return data;
  } catch (error) {
    console.error(`❌ Error al actualizar documento ${id}:`, error);
    throw error;
  }
}

/**
 * Cancelar/eliminar un documento (DELETE /documentos/:id)
 */
export async function deleteDocumento(id: string): Promise<void> {
  try {
    console.log(`📤 DELETE /documentos/${id}`);
    
    const response = await fetchWithTimeout(`${BASE_URL}/documentos/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    console.log(`✅ DELETE /documentos/${id} - Documento cancelado`);
  } catch (error) {
    console.error(`❌ Error al cancelar documento ${id}:`, error);
    throw error;
  }
}