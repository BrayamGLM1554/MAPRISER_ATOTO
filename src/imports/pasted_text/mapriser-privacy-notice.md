AVISO DE PRIVACIDAD INTEGRAL
MAPRISER — Sistema de Gestión Documental
Municipio de Atotonilco de Tula, Hidalgo

I. Identidad y Domicilio del Responsable
La Presidencia Municipal de Atotonilco de Tula, Hidalgo, a través del Área de Transparencia e Informática, con domicilio en Avenida Industrial sin número, Barrio de Boxfi, Código Postal 42980, Atotonilco de Tula, Hidalgo, dentro del Palacio Municipal, es responsable del tratamiento de los datos personales recabados a través del sistema MAPRISER, conforme a la Ley de Protección de Datos Personales en Posesión de Sujetos Obligados del Estado de Hidalgo y demás normatividad aplicable.
CampoDetalleSistemaMAPRISER — Gestión Documental (SaaS)ResponsableÁrea de Transparencia e InformáticaMunicipioAtotonilco de Tula, HidalgoDomicilioAv. Industrial S/N, Barrio de Boxfi, CP 42980Correotransparencia-informatica@atotonilcodetula.gob.mxSitio webwww.atotonilcodetula.gob.mx

II. Finalidades del Tratamiento de Datos Personales
Los datos personales recabados a través de MAPRISER serán utilizados para las siguientes finalidades primarias:

Registro, autenticación y control de acceso de usuarios al sistema.
Asignación de usuarios a las áreas municipales correspondientes.
Administración y organización de documentos institucionales por área.
Gestión de plantillas y hojas membretadas de cada área municipal.
Control de auditoría interna mediante registros de actividad (logs).
Cumplimiento de obligaciones legales, administrativas y de transparencia.

Finalidades secundarias:

Generación de reportes estadísticos de uso del sistema para mejora administrativa.
Optimización de procesos documentales internos del municipio.

Si no desea que sus datos sean tratados para las finalidades secundarias, puede manifestarlo a través de los medios indicados en la sección VII.

III. Datos Personales Recabados
Datos de identificación y acceso:

Nombre completo del usuario
Correo electrónico institucional
Cargo o puesto
Área o dependencia de adscripción

Datos generados por el sistema:

Metadatos de documentos (nombre, fecha, área, tipo de documento)
Referencias a plantillas institucionales almacenadas en servicio de nube
Registros de actividad (logs) y direcciones IP de acceso
Tokens de sesión (JWT) con expiración automática a los 10 minutos


⚠️ MAPRISER no almacena documentos completos. Únicamente se guarda la metadata del documento en base de datos (MongoDB). Los archivos de hojas membretadas e imágenes institucionales se almacenan en Cloudinary.


No se recabarán datos sensibles (salud, biometría, religión, etc.) en ningún caso.


IV. Fundamento Legal
El tratamiento de los datos personales se realiza con fundamento en:

Artículos 6° Base A y 16° de la Constitución Política de los Estados Unidos Mexicanos.
Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados.
Ley de Protección de Datos Personales en Posesión de Sujetos Obligados del Estado de Hidalgo.
Ley Orgánica Municipal del Estado de Hidalgo.
Ley General de Transparencia y Acceso a la Información Pública.
Ley de Archivos del Estado de Hidalgo (en lo que resulte aplicable).
Normatividad aplicable en materia de administración pública municipal.


V. Transferencia de Datos Personales
Sus datos personales podrán ser transferidos, sin requerir su consentimiento, a:

Presidencia Municipal (para fines de auditoría y control interno).
Órgano Interno de Control / Contraloría Municipal.
Autoridades estatales o federales competentes cuando exista requerimiento legal.

Encargados del tratamiento (terceros técnicos):
ProveedorFinalidadDato tratadoCloudinaryAlmacenamiento de hojas membretadas e imágenes institucionalesImágenes institucionales + URL de referenciaMongoDBAlmacenamiento de metadata de documentos y datos de usuariosNombre, correo, área, metadatos, URLs
El acceso a los documentos está segmentado por área; cada área municipal opera de forma independiente dentro del sistema, sin visibilidad sobre los documentos de otras áreas.

VI. Mecanismos de Seguridad
Medidas técnicas:

Autenticación mediante tokens JWT con expiración automática a los 10 minutos de inactividad.
Control de acceso por roles y áreas (cada usuario accede únicamente a su área asignada).
Cifrado de comunicaciones mediante protocolo HTTPS/TLS.
Registros de actividad (logs) para detección de accesos no autorizados.

Medidas administrativas:

Asignación de permisos mínimos necesarios por perfil de usuario.
Supervisión y auditoría periódica de accesos al sistema.
Capacitación al personal responsable del manejo de datos.

Medidas en servicios de nube:

Los archivos almacenados en Cloudinary se gestionan bajo las políticas de seguridad de dicho proveedor (ISO 27001).
MongoDB gestiona los datos bajo políticas de seguridad y acceso controlado.


VII. Derechos ARCO y Mecanismos de Ejercicio
Usted tiene derecho a:

Acceso: conocer qué datos personales suyos tratamos y para qué fines.
Rectificación: solicitar la corrección de sus datos cuando sean inexactos o incompletos.
Cancelación: solicitar la supresión de sus datos cuando lo considere pertinente.
Oposición: oponerse al tratamiento de sus datos para finalidades específicas.

Para ejercer sus derechos ARCO:
CampoDetalleUnidadUnidad de Transparencia del MunicipioDomicilioAv. Industrial S/N, Barrio de Boxfi, Atotonilco de Tula, HidalgoCorreotransparencia-informatica@atotonilcodetula.gob.mxPlataformahttps://www.plataformadetransparencia.org.mx
La solicitud debe contener: nombre del titular, medio de contacto, identificación oficial y descripción clara de la solicitud. El responsable contará con 20 días hábiles para responder.

VIII. Uso de Tecnologías en el Sistema

JWT: tokens de sesión que expiran automáticamente a los 10 minutos de inactividad.
Logs: se registran las acciones realizadas dentro del sistema para auditoría y seguridad.
Direcciones IP: registradas para control de acceso y detección de usos no autorizados.
Cloudinary CDN: entrega las imágenes de hojas membretadas a través de URLs seguras.

Estos datos se usan exclusivamente para seguridad, auditoría y funcionamiento técnico. No se utilizan para elaborar perfiles de comportamiento ni para fines comerciales.

IX. Cambios al Aviso de Privacidad
El presente aviso podrá ser modificado por cambios legales, actualizaciones del sistema o nuevas disposiciones administrativas. Las actualizaciones estarán disponibles en:

www.atotonilcodetula.gob.mx
Dentro del propio sistema MAPRISER, en la sección de Aviso de Privacidad.


X. Fecha de Actualización
Fecha de última actualización: 30 de Marzo de 2026.

Sistema desarrollado por 
Arturo Darinel Lopez Castillo
Brayam Gilberto Lopez Morales
Juan Mateo Hernández de Luna
MAPRISER, Sistema SaaS de Gestión Documental.