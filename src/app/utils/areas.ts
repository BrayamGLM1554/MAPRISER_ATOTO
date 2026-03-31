// Mapeo de áreas del sistema según API de autenticación
// https://login-pwa-atoto.onrender.com

export interface AreaInfo {
  id: string;        // ID kebab-case para API
  nombre: string;    // Nombre para mostrar en UI
  clave: string;     // Clave corta
}

export const AREAS_SISTEMA: AreaInfo[] = [
  { id: 'recursos-humanos', nombre: 'Recursos Humanos', clave: 'RH' },
  { id: 'secretaria', nombre: 'Secretaría', clave: 'SEC' },
  { id: 'tesoreria', nombre: 'Tesorería', clave: 'TES' },
  { id: 'obras-publicas', nombre: 'Obras Públicas', clave: 'OP' },
  { id: 'desarrollo-social', nombre: 'Desarrollo Social', clave: 'DS' },
  { id: 'seguridad-publica', nombre: 'Seguridad Pública', clave: 'SP' },
  { id: 'catastro', nombre: 'Catastro', clave: 'CAT' },
  { id: 'servicios-publicos', nombre: 'Servicios Públicos', clave: 'SERV' },
  { id: 'transparencia-informatica', nombre: 'Transparencia e Informática', clave: 'TEI' },
];

// Mapa inverso: de nombre a ID
export const NOMBRE_A_ID: Record<string, string> = {
  'Recursos Humanos': 'recursos-humanos',
  'Secretaría': 'secretaria',
  'Tesorería': 'tesoreria',
  'Obras Públicas': 'obras-publicas',
  'Desarrollo Social': 'desarrollo-social',
  'Seguridad Pública': 'seguridad-publica',
  'Catastro': 'catastro',
  'Servicios Públicos': 'servicios-publicos',
  'Transparencia e Informática': 'transparencia-informatica',
};

// Mapa inverso: de ID a nombre
export const ID_A_NOMBRE: Record<string, string> = {
  'recursos-humanos': 'Recursos Humanos',
  'secretaria': 'Secretaría',
  'tesoreria': 'Tesorería',
  'obras-publicas': 'Obras Públicas',
  'desarrollo-social': 'Desarrollo Social',
  'seguridad-publica': 'Seguridad Pública',
  'catastro': 'Catastro',
  'servicios-publicos': 'Servicios Públicos',
  'transparencia-informatica': 'Transparencia e Informática',
};

/**
 * Convierte un nombre de área a su ID kebab-case
 */
export function nombreAreaAId(nombre: string): string {
  return NOMBRE_A_ID[nombre] || nombre.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Convierte un ID kebab-case a nombre de área
 */
export function idAreaANombre(id: string): string {
  return ID_A_NOMBRE[id] || id;
}

/**
 * Obtiene la información completa de un área por su nombre
 */
export function getAreaInfoPorNombre(nombre: string): AreaInfo | undefined {
  return AREAS_SISTEMA.find(area => area.nombre === nombre);
}

/**
 * Obtiene la información completa de un área por su ID
 */
export function getAreaInfoPorId(id: string): AreaInfo | undefined {
  return AREAS_SISTEMA.find(area => area.id === id);
}

export function obtenerAreasDisponibles(
  rol: string,
  areasPermitidas: string[]
): AreaInfo[] {
  if (rol === 'administrador' || rol === 'ADMIN') {
    return AREAS_SISTEMA;
  }
  if (!areasPermitidas || areasPermitidas.length === 0) {
    return [];
  }

  const normalizar = (s: string) => s.normalize('NFC').trim().toLowerCase();
  const permitidasNorm = areasPermitidas.map(normalizar);

  // LOG CRÍTICO
  console.log('🔎 obtenerAreasDisponibles:', {
    rol,
    areasPermitidas,
    permitidasNorm,
    sistemaNombres: AREAS_SISTEMA.map(a => ({
      nombre: a.nombre,
      norm: normalizar(a.nombre),
      match: permitidasNorm.includes(normalizar(a.nombre))
    }))
  });

  return AREAS_SISTEMA.filter(area =>
    permitidasNorm.includes(normalizar(area.nombre))
  );
}