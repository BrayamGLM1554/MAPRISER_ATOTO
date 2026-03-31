BASE URL
https://login-pwa-atoto.onrender.com
Todas las rutas protegidas requieren:
Authorization: Bearer <token>

SISTEMA DE ROLES
El JWT devuelve el campo rol con uno de estos valores exactos:
Valor en JWTPuesto que lo generaPermisosADMINSeed / manualAcceso totalJEFE_AREADirector, Coordinador, Jefe de ÁreaGestiona usuarios y membretadas de sus áreasEMPLEADOEmpleado, OperativoSolo lectura en sus áreasASISTENTEAsistenteSolo lectura en sus áreas
La función obtenerAreasDisponibles ya existe en el proyecto y acepta tanto "ADMIN" como "administrador", tanto "JEFE_AREA" como "jefe_area". No la modifiques.

ÁREAS DEL SISTEMA
Estas son las únicas áreas válidas. El id es lo que se envía a la API, el nombre es lo que se muestra en la UI:
typescript{ id: 'recursos-humanos',          nombre: 'Recursos Humanos',           clave: 'RH'   }
{ id: 'secretaria',                nombre: 'Secretaría',                 clave: 'SEC'  }
{ id: 'tesoreria',                 nombre: 'Tesorería',                  clave: 'TES'  }
{ id: 'obras-publicas',            nombre: 'Obras Públicas',             clave: 'OP'   }
{ id: 'desarrollo-social',         nombre: 'Desarrollo Social',          clave: 'DS'   }
{ id: 'seguridad-publica',         nombre: 'Seguridad Pública',          clave: 'SP'   }
{ id: 'catastro',                  nombre: 'Catastro',                   clave: 'CAT'  }
{ id: 'servicios-publicos',        nombre: 'Servicios Públicos',         clave: 'SERV' }
{ id: 'transparencia-informatica', nombre: 'Transparencia e Informática',clave: 'TEI'  }
Regla crítica: siempre enviar el id kebab-case a la API. Nunca el nombre. El servidor normaliza variantes (tildes, espacios, underscores) pero lo correcto es enviar el id directamente.

WRAPPER DE FETCH
Crea estos dos helpers y úsalos en toda la app:
typescript// Para JSON
const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${BASE_URL}${path}`, {
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
};

// Para multipart/form-data — avatares y hojas membretadas
// NUNCA agregar Content-Type manualmente aquí
const apiFetchForm = async <T>(path: string, body: FormData, method = 'POST'): Promise<T> => {
  const res = await fetch(`${BASE_URL}${path}`, {
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
};
```

---

**ENDPOINTS Y CONTRATOS**

**Auth**
```
POST /auth/login
Body: { email: string, password: string }
Response: { token: string, perfil: Perfil }

GET /auth/perfil
Response: { perfil: Perfil }
typescriptinterface Perfil {
  id: string;
  nombre: string;
  apellidos: string;
  nombreCompleto: string;
  email: string;
  rol: 'ADMIN' | 'JEFE_AREA' | 'EMPLEADO' | 'ASISTENTE';
  puesto: string;
  areasPermitidas: string[];   // IDs kebab-case
  avatar: string | null;
  activo: boolean;
  ultimoLogin: string | null;
  loginActual: string | null;
  createdAt: string;
}
```

**Usuarios** (requieren token)
```
POST   /admin/users              → crear usuario (ADMIN, JEFE_AREA)
GET    /admin/users              → listar (ADMIN ve todos, JEFE_AREA solo los suyos)
GET    /admin/users/:id          → detalle (solo ADMIN)
PATCH  /admin/users/:id/areas    → actualizar áreas (solo ADMIN)
PATCH  /admin/users/:id/toggle   → activar/desactivar (solo ADMIN)
POST   /admin/users/:id/avatar   → subir avatar (multipart, campo: "avatar", máx 5MB, solo imágenes)
typescript// POST /admin/users — body
{
  nombre: string;
  apellidos: string;
  email: string;
  password: string;
  puesto: string;             // determina el rol automáticamente, NO enviar "rol"
  areasPermitidas?: string[]; // IDs kebab-case, opcional
}

// PATCH /admin/users/:id/areas — body
{ areasPermitidas: string[] }
```

Restricción: `JEFE_AREA` solo puede crear usuarios con puesto "Empleado", "Operativo" o "Asistente". Intentar otro puesto devuelve 403.

**Registros** (requieren token)
```
GET  /registros       → listar (filtrado automático por áreas del usuario)
POST /registros       → crear (todos los roles con acceso al área)
GET  /registros/:id   → detalle
typescript// GET /registros — query params
?areaId=recursos-humanos   // opcional, ID kebab-case
?page=1&limit=20

// POST /registros — body
{
  areaId: string;   // ID kebab-case — obligatorio
  data: object;     // contenido libre — obligatorio
}

// Response GET
{
  registros: Registro[];
  paginacion: { total: number; pagina: number; paginas: number; limite: number }
}
```

**Hojas Membretadas** (requieren token)
```
POST   /membretadas                → subir (ADMIN, JEFE_AREA de sus áreas)
GET    /membretadas                → listar activas (filtrado por áreas del usuario)
GET    /membretadas/area/:areaId   → hojas de un área — usar al generar documentos
GET    /membretadas/:id            → detalle
DELETE /membretadas/:id            → eliminar (ADMIN, JEFE_AREA de sus áreas)
typescript// POST /membretadas — multipart/form-data
// Campos:
//   archivo      File     jpg | png | webp | pdf    máx 10MB   obligatorio
//   areaId       string   ID kebab-case                         obligatorio
//   nombre       string                                         obligatorio
//   descripcion  string                                         opcional

interface HojaMembretada {
  id: string;
  areaId: string;
  nombre: string;
  descripcion: string;
  archivo: {
    url: string;         // URL original (puede ser PDF) — usar para descarga
    previewUrl: string;  // URL de imagen JPEG — usar siempre en <img>
    publicId: string;
    formato: string;     // 'png' | 'jpg' | 'pdf' | 'webp'
    bytes: number;
  };
  activa: boolean;
  subidaPor: { nombre: string; apellidos: string; puesto: string };
  creadoEn: string;
  actualizadoEn: string;
}

// GET /membretadas — query params
?areaId=tesoreria
?page=1&limit=20

// GET /membretadas/area/:areaId — response
{
  areaId: string;
  total: number;
  hojas: HojaMembretada[];
}

HOOK DE PERMISOS
Crea este hook y úsalo para controlar la visibilidad de elementos en la UI:
typescriptexport const usePermisos = (rol: string) => ({
  esAdmin:                 rol === 'ADMIN',
  esJefeArea:              rol === 'JEFE_AREA',
  esOperativo:             rol === 'EMPLEADO' || rol === 'ASISTENTE',
  puedeCrearUsuarios:      ['ADMIN', 'JEFE_AREA'].includes(rol),
  puedeVerTodosUsuarios:   rol === 'ADMIN',
  puedeEditarAreas:        rol === 'ADMIN',
  puedeToggleUsuario:      rol === 'ADMIN',
  puedeSubirMembretada:    ['ADMIN', 'JEFE_AREA'].includes(rol),
  puedeEliminarMembretada: ['ADMIN', 'JEFE_AREA'].includes(rol),
  puedeVerMembretadas:     true,
  puedeCrearRegistros:     true,
});
Tabla de visibilidad:
ElementoADMINJEFE_AREAEMPLEADOASISTENTEBotón crear usuario✅✅❌❌Lista de usuarios✅ todos✅ sus registrados❌❌Activar/desactivar usuario✅❌❌❌Editar áreas de usuario✅❌❌❌Cambiar avatar propio✅✅✅✅Selector de área (dropdown)✅ todas✅ sus áreas❌❌Ver registros✅ todos✅ sus áreas✅ sus áreas✅ sus áreasCrear registro✅✅✅✅Ver hojas membretadas✅ todas✅ sus áreas✅ sus áreas✅ sus áreasSubir hoja membretada✅✅ sus áreas❌❌Eliminar hoja membretada✅✅ sus áreas❌❌

MANEJO DE ERRORES
Todos los errores tienen formato { "error": "descripción" }. Mapea los códigos HTTP así:
CódigoMensaje al usuario400"Datos incorrectos. Revisa los campos."401Redirigir a /login y limpiar localStorage403"No tienes permiso para esta acción."404"El elemento no fue encontrado."409"Este correo ya está registrado."413"El archivo es demasiado grande."415"Formato no válido. Usa JPG, PNG, WEBP o PDF."500"Error inesperado. Intenta más tarde."

COMPONENTE DE CREACIÓN DE MACHOTES — INTEGRACIÓN DE HOJAS MEMBRETADAS
El componente que crea nuevos machotes (plantillas de documentos) debe integrarse con el sistema de hojas membretadas de Cloudinary. Elimina cualquier lógica que cargue hojas membretadas desde archivos locales, assets del proyecto o cualquier fuente interna — a partir de ahora la única fuente válida es la API.
Comportamiento requerido:

Al abrir el componente, si el machote tiene un areaId definido, hacer automáticamente GET /membretadas/area/:areaId para cargar las hojas disponibles de esa área. Si no hay hojas aún, mostrar un estado vacío con opción de subir una.
Selector de hoja membretada: mostrar las hojas disponibles del área como tarjetas o thumbnails usando archivo.previewUrl en un <img>. El usuario elige cuál usar para el machote. La hoja seleccionada se guarda en el estado del machote como hojaMembretadaId (el id de la hoja).
Botón "Subir nueva hoja membretada": visible solo si usePermisos(rol).puedeSubirMembretada es true. Al presionarlo abrir un panel o modal con:

Input de archivo (accept=".jpg,.jpeg,.png,.webp,.pdf", máx 10MB)
Campo de nombre (obligatorio)
Campo de descripción (opcional)
El areaId se toma del área del machote — no se le pide al usuario
Validar en cliente: tamaño ≤ 10MB y formato permitido antes de enviar
Enviar con apiFetchForm a POST /membretadas usando FormData con el campo del archivo llamado exactamente "archivo"
Al completarse exitosamente: cerrar el panel, agregar la nueva hoja al listado y seleccionarla automáticamente


Preview en tiempo real: cuando el usuario selecciona una hoja del listado, mostrar su preview a tamaño completo o como fondo de la vista previa del machote usando archivo.previewUrl.
Descarga del original: si el formato es PDF (archivo.formato === 'pdf'), ofrecer también un enlace/botón "Ver PDF original" que abra archivo.url en una nueva pestaña.
No almacenar la URL directamente en el machote — guardar solo el hojaMembretadaId. Cuando se necesite renderizar el machote, consultar la hoja por su ID para obtener la URL actualizada. Esto garantiza que si la hoja cambia en Cloudinary el machote siempre sirva la versión correcta.

Flujo resumido en pseudocódigo:
typescript// Al montar el componente
const hojas = await apiFetch(`/membretadas/area/${machote.areaId}`);
setHojasDisponibles(hojas.hojas);

// Al seleccionar una hoja
setHojaSeleccionada(hoja);
setMachote(prev => ({ ...prev, hojaMembretadaId: hoja.id }));

// Al subir nueva hoja
const form = new FormData();
form.append('archivo', file);            // campo DEBE llamarse 'archivo'
form.append('areaId', machote.areaId);   // ID kebab-case del área del machote
form.append('nombre', nombre);
if (descripcion) form.append('descripcion', descripcion);

const resultado = await apiFetchForm('/membretadas', form);
setHojasDisponibles(prev => [resultado.hoja, ...prev]);
setHojaSeleccionada(resultado.hoja);
setMachote(prev => ({ ...prev, hojaMembretadaId: resultado.hoja.id }));
Qué eliminar del componente actual:

Cualquier import de imágenes o PDFs locales usados como hoja membretada
Cualquier array hardcodeado de hojas membretadas
Cualquier lógica que lea hojas desde public/, assets/ o rutas relativas del proyecto
Cualquier estado que guarde una URL de hoja membretada directamente — reemplazar por hojaMembretadaId


REGLAS ESTRICTAS

Nunca enviar el campo rol al crear usuarios — el servidor lo asigna por puesto
Nunca agregar Content-Type manualmente en requests de FormData
Siempre usar archivo.previewUrl para <img> y archivo.url para descarga o enlace a PDF
Siempre usar IDs kebab-case para areaId — nunca nombres ni claves
El token expira el sábado a las 23:59 — no hay refresh token, al expirar redirigir a login
Si areasPermitidas del usuario está vacío, los GET de registros y membretadas devuelven array vacío sin error
Guardar hojaMembretadaId en el machote, nunca la URL directa de Cloudinary
El campo del archivo en FormData se llama "archivo" — no "file", no "image", no "pdf"