# Sistema de Documentos - Ayuntamiento de Atotonilco de Tula

## Descripción

Aplicación web progresiva (PWA) para uso interno del H. Ayuntamiento de Atotonilco de Tula, Hidalgo, orientada a la gestión, estandarización y generación de documentos oficiales mediante machotes (plantillas).

## Características Principales

- ✅ Sistema de autenticación basado en roles
- ✅ Gestión de machotes por área administrativa
- ✅ Generación de documentos con campos dinámicos
- ✅ Previsualización de documentos antes de generar
- ✅ Descarga en formato PDF
- ✅ Función de impresión directa
- ✅ Historial de documentos generados
- ✅ Control de acceso basado en rol y área
- ✅ Diseño institucional con colores de Morena (Guinda #621132 y dorado #FFD700)
- ✅ Responsive con prioridad en escritorio
- ✅ Interfaz pensada para atención en ventanilla

## Áreas del Sistema

### Recursos Humanos
- Constancias laborales
- Licencias administrativas
- Adeudos internos

### Secretaría / Tesorería
- Adeudos de predial
- Constancias de no adeudo
- Licencias
- Documentos administrativos

## Usuarios de Ejemplo

### Administrador General
- **Email:** admin@atotonilco.gob.mx
- **Contraseña:** admin123
- **Permisos:** 
  - Gestionar usuarios, roles y áreas
  - Administrar todos los machotes del sistema
  - Crear, editar y eliminar machotes
  - Ver todos los documentos generados

### Usuario Recursos Humanos
- **Email:** rh@atotonilco.gob.mx
- **Contraseña:** rh123
- **Permisos:**
  - Acceso solo a machotes de Recursos Humanos
  - Generar documentos de su área
  - Ver historial de documentos de su área

### Usuario Tesorería
- **Email:** tesoreria@atotonilco.gob.mx
- **Contraseña:** tesoreria123
- **Permisos:**
  - Acceso solo a machotes de Secretaría / Tesorería
  - Generar documentos de su área
  - Ver historial de documentos de su área

## Flujo de Trabajo

1. **Inicio de Sesión:** El usuario inicia sesión con sus credenciales
2. **Dashboard:** Visualiza machotes disponibles según su rol y área
3. **Selección de Machote:** Elige el tipo de documento a generar
4. **Completar Campos:** Llena los campos dinámicos requeridos
5. **Vista Previa:** Revisa el documento antes de generarlo
6. **Generación:** Genera, descarga o imprime el documento
7. **Historial:** El documento queda registrado en el sistema

## Machotes Incluidos

### Recursos Humanos
1. **Constancia Laboral** - Documento que certifica la relación laboral de un empleado
2. **Licencia Administrativa** - Autorización de ausencia laboral

### Secretaría / Tesorería
1. **Constancia de No Adeudo Predial** - Certificado de que no existen adeudos de impuesto predial

## Funcionalidades para Administradores

- **Crear Machotes:** Diseñar nuevas plantillas de documentos
- **Definir Campos Dinámicos:** Establecer qué información se capturará
- **Gestión de Machotes:** Editar o eliminar plantillas existentes
- **Vista General:** Acceso a todos los documentos y estadísticas del sistema

## Funcionalidades para Usuarios de Área

- **Generar Documentos:** Crear documentos oficiales a partir de machotes
- **Edición Controlada:** Solo pueden editar campos permitidos
- **Descarga/Impresión:** Obtener documentos en PDF o imprimir directamente
- **Historial Personal:** Ver documentos generados por su área

## Tecnologías Utilizadas

- **React 18** - Framework de interfaz de usuario
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos y diseño
- **React Router** - Navegación
- **jsPDF** - Generación de PDFs
- **Lucide React** - Iconos
- **Sonner** - Notificaciones toast
- **date-fns** - Manejo de fechas

## Instalación y Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build
```

## Diseño Institucional

La aplicación utiliza los colores oficiales del partido Morena:
- **Color Primario:** #621132 (Guinda)
- **Color Secundario:** #FFD700 (Dorado)
- **Enfoque:** Sobrio, funcional y profesional
- **Tipografía:** Clara y legible para uso en ventanilla

## Contexto Institucional

- **Uso:** Exclusivo del H. Ayuntamiento de Atotonilco de Tula
- **Alcance:** Documentos de dominio público
- **Jurisdicción:** Gobierno del Estado de Hidalgo
- **Objetivo:** Orden, eficiencia administrativa y confiabilidad institucional

## Seguridad y Privacidad

⚠️ **Importante:** Este sistema NO está diseñado para:
- Almacenar información personal identificable (PII) sensible
- Manejar datos confidenciales de ciudadanos
- Transacciones financieras

El sistema es únicamente para la generación estandarizada de documentos administrativos de dominio público.

## Soporte y Contacto

Para soporte técnico o dudas sobre el sistema, contactar al administrador del sistema.

---

**Desarrollado para el H. Ayuntamiento de Atotonilco de Tula, Hidalgo**
*Gobierno del Estado de Hidalgo*
