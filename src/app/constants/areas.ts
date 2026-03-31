/**
 * Áreas del sistema - Fuente única de verdad
 * IMPORTANTE: Mantener nombres EXACTOS con mayúsculas/minúsculas
 */

export interface Area {
  id: string;
  nombre: string;
  clave: string;
}

/**
 * Lista completa de áreas del sistema del Ayuntamiento
 */
export const AREAS_SISTEMA: Area[] = [
  {
    id: 'recursos-humanos',
    nombre: 'Recursos Humanos',
    clave: 'RH',
  },
  {
    id: 'secretaria',
    nombre: 'Secretaría',
    clave: 'SEC',
  },
  {
    id: 'tesoreria',
    nombre: 'Tesorería',
    clave: 'TES',
  },
  {
    id: 'obras-publicas',
    nombre: 'Obras Públicas',
    clave: 'OP',
  },
  {
    id: 'desarrollo-social',
    nombre: 'Desarrollo Social',
    clave: 'DS',
  },
  {
    id: 'seguridad-publica',
    nombre: 'Seguridad Pública',
    clave: 'SP',
  },
  {
    id: 'catastro',
    nombre: 'Catastro',
    clave: 'CAT',
  },
  {
    id: 'servicios-publicos',
    nombre: 'Servicios Públicos',
    clave: 'SERV',
  },
  {
    id: 'transparencia-informatica',
    nombre: 'Transparencia e Informática',
    clave: 'TEI',
  },
];

/**
 * Obtener áreas según el rol y permisos del usuario
 * @param rol - Rol del usuario ('administrador', 'jefe_area', 'usuario')
 * @param areasPermitidas - Array de IDs de áreas permitidas para el usuario
 * @returns Array de áreas filtradas según permisos
 */
export const obtenerAreasDisponibles = (
  rol: string,
  areasPermitidas: string[] = []
): Area[] => {
  // Si es Admin, devolver todas las áreas
  if (rol === 'administrador' || rol === 'ADMIN') {
    return AREAS_SISTEMA;
  }

  // Si es Jefe de Área, devolver solo sus áreas permitidas
  if (rol === 'jefe_area' || rol === 'JEFE_AREA' || rol === 'jefe') {
    // Si no tiene areasPermitidas definido, devolver todas las áreas
    if (!areasPermitidas || areasPermitidas.length === 0) {
      return AREAS_SISTEMA;
    }
    
    return AREAS_SISTEMA.filter(area => 
      areasPermitidas.includes(area.id) || 
      areasPermitidas.includes(area.nombre)
    );
  }

  // Usuario normal: sin áreas
  return [];
};

/**
 * Obtener nombre de área por su ID
 */
export const obtenerNombreArea = (areaId: string): string => {
  const area = AREAS_SISTEMA.find(a => a.id === areaId || a.nombre === areaId);
  return area ? area.nombre : areaId;
};

/**
 * Obtener ID de área por su nombre
 */
export const obtenerIdArea = (nombreArea: string): string => {
  const area = AREAS_SISTEMA.find(a => a.nombre === nombreArea || a.id === nombreArea);
  return area ? area.id : nombreArea;
};

/**
 * Validar si un usuario tiene acceso a un área específica
 */
export const tieneAccesoArea = (
  rol: string,
  areasPermitidas: string[],
  areaRequerida: string
): boolean => {
  // Admin tiene acceso a todo
  if (rol === 'ADMIN' || rol === 'administrador') {
    return true;
  }

  // Verificar si el área está en las permitidas (por ID o nombre)
  return areasPermitidas.some(area => 
    area === areaRequerida || 
    area === obtenerIdArea(areaRequerida) ||
    area === obtenerNombreArea(areaRequerida)
  );
};