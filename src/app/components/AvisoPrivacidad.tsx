import React, { useState } from 'react';
import { X, ChevronRight, FileText } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface AvisoPrivacidadProps {
  onClose: () => void;
  onAceptar?: () => Promise<void>; // solo se pasa cuando es el flujo de login
}

interface Section {
  id: string;
  title: string;
  number: string;
}

const sections: Section[] = [
  { id: 'intro', title: 'Introducción', number: '' },
  { id: 'section1', title: 'Identidad y Domicilio del Responsable', number: 'I.' },
  { id: 'section2', title: 'Finalidades del Tratamiento', number: 'II.' },
  { id: 'section3', title: 'Datos Personales Recabados', number: 'III.' },
  { id: 'section4', title: 'Fundamento Legal', number: 'IV.' },
  { id: 'section5', title: 'Transferencia de Datos', number: 'V.' },
  { id: 'section6', title: 'Mecanismos de Seguridad', number: 'VI.' },
  { id: 'section7', title: 'Derechos ARCO', number: 'VII.' },
  { id: 'section8', title: 'Uso de Tecnologías', number: 'VIII.' },
  { id: 'section9', title: 'Cambios al Aviso', number: 'IX.' },
  { id: 'section10', title: 'Fecha de Actualización', number: 'X.' },
];

export default function AvisoPrivacidad({ onClose, onAceptar }: AvisoPrivacidadProps) {
  const [activeSection, setActiveSection] = useState('intro');
  const [aceptado, setAceptado] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAceptar = async () => {
    if (!onAceptar) return;
    setLoading(true);
    try {
      await onAceptar();
      onClose();
    } catch (_) {
      // el error ya lo maneja authApi con toast
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="border-b bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Aviso de Privacidad Integral</h2>
              <p className="text-sm text-gray-600">Sistema MAPRISER - Municipio de Atotonilco de Tula</p>
            </div>
          </div>
          {/* Ocultar X si el aviso es obligatorio */}
          {!onAceptar && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar de navegación */}
          <div className="w-72 border-r bg-gray-50 overflow-y-auto">
            <nav className="p-4 space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    activeSection === section.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <ChevronRight className={`h-4 w-4 flex-shrink-0 ${activeSection === section.id ? 'text-white' : 'text-gray-400'}`} />
                  <span className="flex-1">
                    {section.number && <span className="font-medium mr-2">{section.number}</span>}
                    {section.title}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Contenido */}
          <ScrollArea className="flex-1">
            <div className="p-8 max-w-4xl mx-auto">

              {/* Introducción */}
              <section id="intro" className="mb-12">
                <div className="text-center mb-8 pb-6 border-b">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">AVISO DE PRIVACIDAD INTEGRAL</h1>
                  <p className="text-xl text-gray-700 font-medium">MAPRISER — Sistema de Gestión Documental</p>
                  <p className="text-gray-600 mt-2">Municipio de Atotonilco de Tula, Hidalgo</p>
                </div>
              </section>

              {/* I. Identidad y Domicilio */}
              <section id="section1" className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b">I. Identidad y Domicilio del Responsable</h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  La Presidencia Municipal de Atotonilco de Tula, Hidalgo, a través del Área de Transparencia e Informática, con domicilio en Avenida Industrial sin número, Barrio de Boxfi, Código Postal 42980, Atotonilco de Tula, Hidalgo, dentro del Palacio Municipal, es responsable del tratamiento de los datos personales recabados a través del sistema MAPRISER, conforme a la Ley de Protección de Datos Personales en Posesión de Sujetos Obligados del Estado de Hidalgo y demás normatividad aplicable.
                </p>
                <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-2.5 font-semibold text-gray-900 w-40">Sistema</td>
                        <td className="py-2.5 text-gray-700">MAPRISER — Gestión Documental (SaaS)</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-2.5 font-semibold text-gray-900">Responsable</td>
                        <td className="py-2.5 text-gray-700">Área de Transparencia e Informática</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-2.5 font-semibold text-gray-900">Municipio</td>
                        <td className="py-2.5 text-gray-700">Atotonilco de Tula, Hidalgo</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-2.5 font-semibold text-gray-900">Domicilio</td>
                        <td className="py-2.5 text-gray-700">Av. Industrial S/N, Barrio de Boxfi, CP 42980</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-2.5 font-semibold text-gray-900">Correo</td>
                        <td className="py-2.5 text-gray-700">transparencia-informatica@atotonilcodetula.gob.mx</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-semibold text-gray-900">Sitio web</td>
                        <td className="py-2.5 text-gray-700">www.atotonilcodetula.gob.mx</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* II. Finalidades */}
              <section id="section2" className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b">II. Finalidades del Tratamiento de Datos Personales</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Los datos personales recabados a través de MAPRISER serán utilizados para las siguientes finalidades primarias:
                </p>
                <ul className="list-disc list-outside ml-6 space-y-2 text-gray-700 mb-6">
                  <li>Registro, autenticación y control de acceso de usuarios al sistema.</li>
                  <li>Asignación de usuarios a las áreas municipales correspondientes.</li>
                  <li>Administración y organización de documentos institucionales por área.</li>
                  <li>Gestión de plantillas y hojas membretadas de cada área municipal.</li>
                  <li>Control de auditoría interna mediante registros de actividad (logs).</li>
                  <li>Cumplimiento de obligaciones legales, administrativas y de transparencia.</li>
                </ul>
                <p className="text-gray-900 font-semibold mb-3">Finalidades secundarias:</p>
                <ul className="list-disc list-outside ml-6 space-y-2 text-gray-700 mb-4">
                  <li>Generación de reportes estadísticos de uso del sistema para mejora administrativa.</li>
                  <li>Optimización de procesos documentales internos del municipio.</li>
                </ul>
                <p className="text-gray-600 text-sm italic bg-gray-50 p-4 rounded-lg border border-gray-200">
                  Si no desea que sus datos sean tratados para las finalidades secundarias, puede manifestarlo a través de los medios indicados en la sección VII.
                </p>
              </section>

              {/* III. Datos Recabados */}
              <section id="section3" className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b">III. Datos Personales Recabados</h2>
                <p className="text-gray-900 font-semibold mb-3">Datos de identificación y acceso:</p>
                <ul className="list-disc list-outside ml-6 space-y-2 text-gray-700 mb-6">
                  <li>Nombre completo del usuario</li>
                  <li>Correo electrónico institucional</li>
                  <li>Cargo o puesto</li>
                  <li>Área o dependencia de adscripción</li>
                </ul>
                <p className="text-gray-900 font-semibold mb-3">Datos generados por el sistema:</p>
                <ul className="list-disc list-outside ml-6 space-y-2 text-gray-700 mb-6">
                  <li>Metadatos de documentos (nombre, fecha, área, tipo de documento)</li>
                  <li>Referencias a plantillas institucionales almacenadas en servicio de nube</li>
                  <li>Registros de actividad (logs) y direcciones IP de acceso</li>
                  <li>Tokens de sesión (JWT) con expiración automática a los 10 minutos</li>
                </ul>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <p className="text-gray-800 text-sm">
                    <span className="font-semibold">Importante:</span> MAPRISER no almacena documentos completos. Únicamente se guarda la metadata del documento en base de datos (MongoDB). Los archivos de hojas membretadas e imágenes institucionales se almacenan en Cloudinary.
                  </p>
                </div>
                <p className="text-gray-700 italic">
                  No se recabarán datos sensibles (salud, biometría, religión, etc.) en ningún caso.
                </p>
              </section>

              {/* IV. Fundamento Legal */}
              <section id="section4" className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b">IV. Fundamento Legal</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  El tratamiento de los datos personales se realiza con fundamento en:
                </p>
                <ul className="list-disc list-outside ml-6 space-y-2 text-gray-700">
                  <li>Artículos 6° Base A y 16° de la Constitución Política de los Estados Unidos Mexicanos.</li>
                  <li>Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados.</li>
                  <li>Ley de Protección de Datos Personales en Posesión de Sujetos Obligados del Estado de Hidalgo.</li>
                  <li>Ley Orgánica Municipal del Estado de Hidalgo.</li>
                  <li>Ley General de Transparencia y Acceso a la Información Pública.</li>
                  <li>Ley de Archivos del Estado de Hidalgo (en lo que resulte aplicable).</li>
                  <li>Normatividad aplicable en materia de administración pública municipal.</li>
                </ul>
              </section>

              {/* V. Transferencia */}
              <section id="section5" className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b">V. Transferencia de Datos Personales</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Sus datos personales podrán ser transferidos, sin requerir su consentimiento, a:
                </p>
                <ul className="list-disc list-outside ml-6 space-y-2 text-gray-700 mb-6">
                  <li>Presidencia Municipal (para fines de auditoría y control interno).</li>
                  <li>Órgano Interno de Control / Contraloría Municipal.</li>
                  <li>Autoridades estatales o federales competentes cuando exista requerimiento legal.</li>
                </ul>
                <p className="text-gray-900 font-semibold mb-3">Encargados del tratamiento (terceros técnicos):</p>
                <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="py-2.5 text-left font-semibold text-gray-900">Proveedor</th>
                        <th className="py-2.5 text-left font-semibold text-gray-900">Finalidad</th>
                        <th className="py-2.5 text-left font-semibold text-gray-900">Dato tratado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-2.5 text-gray-800 font-medium">Cloudinary</td>
                        <td className="py-2.5 text-gray-700">Almacenamiento de hojas membretadas e imágenes institucionales</td>
                        <td className="py-2.5 text-gray-700">Imágenes institucionales + URL de referencia</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-gray-800 font-medium">MongoDB</td>
                        <td className="py-2.5 text-gray-700">Almacenamiento de metadata de documentos y datos de usuarios</td>
                        <td className="py-2.5 text-gray-700">Nombre, correo, área, metadatos, URLs</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-gray-700 italic text-sm">
                  El acceso a los documentos está segmentado por área; cada área municipal opera de forma independiente dentro del sistema, sin visibilidad sobre los documentos de otras áreas.
                </p>
              </section>

              {/* VI. Seguridad */}
              <section id="section6" className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b">VI. Mecanismos de Seguridad</h2>
                <p className="text-gray-900 font-semibold mb-3">Medidas técnicas:</p>
                <ul className="list-disc list-outside ml-6 space-y-2 text-gray-700 mb-6">
                  <li>Autenticación mediante tokens JWT con expiración automática a los 10 minutos de inactividad.</li>
                  <li>Control de acceso por roles y áreas (cada usuario accede únicamente a su área asignada).</li>
                  <li>Cifrado de comunicaciones mediante protocolo HTTPS/TLS.</li>
                  <li>Registros de actividad (logs) para detección de accesos no autorizados.</li>
                </ul>
                <p className="text-gray-900 font-semibold mb-3">Medidas administrativas:</p>
                <ul className="list-disc list-outside ml-6 space-y-2 text-gray-700 mb-6">
                  <li>Asignación de permisos mínimos necesarios por perfil de usuario.</li>
                  <li>Supervisión y auditoría periódica de accesos al sistema.</li>
                  <li>Capacitación al personal responsable del manejo de datos.</li>
                </ul>
                <p className="text-gray-900 font-semibold mb-3">Medidas en servicios de nube:</p>
                <ul className="list-disc list-outside ml-6 space-y-2 text-gray-700">
                  <li>Los archivos almacenados en Cloudinary se gestionan bajo las políticas de seguridad de dicho proveedor (ISO 27001).</li>
                  <li>MongoDB gestiona los datos bajo políticas de seguridad y acceso controlado.</li>
                </ul>
              </section>

              {/* VII. Derechos ARCO */}
              <section id="section7" className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b">VII. Derechos ARCO y Mecanismos de Ejercicio</h2>
                <p className="text-gray-700 leading-relaxed mb-4">Usted tiene derecho a:</p>
                <ul className="list-disc list-outside ml-6 space-y-2 text-gray-700 mb-6">
                  <li><span className="font-semibold">Acceso:</span> conocer qué datos personales suyos tratamos y para qué fines.</li>
                  <li><span className="font-semibold">Rectificación:</span> solicitar la corrección de sus datos cuando sean inexactos o incompletos.</li>
                  <li><span className="font-semibold">Cancelación:</span> solicitar la supresión de sus datos cuando lo considere pertinente.</li>
                  <li><span className="font-semibold">Oposición:</span> oponerse al tratamiento de sus datos para finalidades específicas.</li>
                </ul>
                <p className="text-gray-900 font-semibold mb-3">Para ejercer sus derechos ARCO:</p>
                <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 mb-4">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-2.5 font-semibold text-gray-900 w-40">Unidad</td>
                        <td className="py-2.5 text-gray-700">Unidad de Transparencia del Municipio</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-2.5 font-semibold text-gray-900">Domicilio</td>
                        <td className="py-2.5 text-gray-700">Av. Industrial S/N, Barrio de Boxfi, Atotonilco de Tula, Hidalgo</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-2.5 font-semibold text-gray-900">Correo</td>
                        <td className="py-2.5 text-gray-700">transparencia-informatica@atotonilcodetula.gob.mx</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-semibold text-gray-900">Plataforma</td>
                        <td className="py-2.5 text-gray-700">https://www.plataformadetransparencia.org.mx</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-gray-700 text-sm">
                  La solicitud debe contener: nombre del titular, medio de contacto, identificación oficial y descripción clara de la solicitud. El responsable contará con 20 días hábiles para responder.
                </p>
              </section>

              {/* VIII. Tecnologías */}
              <section id="section8" className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b">VIII. Uso de Tecnologías en el Sistema</h2>
                <ul className="list-disc list-outside ml-6 space-y-2 text-gray-700 mb-4">
                  <li><span className="font-semibold">JWT:</span> tokens de sesión que expiran automáticamente a los 10 minutos de inactividad.</li>
                  <li><span className="font-semibold">Logs:</span> se registran las acciones realizadas dentro del sistema para auditoría y seguridad.</li>
                  <li><span className="font-semibold">Direcciones IP:</span> registradas para control de acceso y detección de usos no autorizados.</li>
                  <li><span className="font-semibold">Cloudinary CDN:</span> entrega las imágenes de hojas membretadas a través de URLs seguras.</li>
                </ul>
                <p className="text-gray-700 text-sm italic">
                  Estos datos se usan exclusivamente para seguridad, auditoría y funcionamiento técnico. No se utilizan para elaborar perfiles de comportamiento ni para fines comerciales.
                </p>
              </section>

              {/* IX. Cambios */}
              <section id="section9" className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b">IX. Cambios al Aviso de Privacidad</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  El presente aviso podrá ser modificado por cambios legales, actualizaciones del sistema o nuevas disposiciones administrativas. Las actualizaciones estarán disponibles en:
                </p>
                <ul className="list-disc list-outside ml-6 space-y-2 text-gray-700">
                  <li>www.atotonilcodetula.gob.mx</li>
                  <li>Dentro del propio sistema MAPRISER, en la sección de Aviso de Privacidad.</li>
                </ul>
              </section>

              {/* X. Fecha */}
              <section id="section10" className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b">X. Fecha de Actualización</h2>
                <p className="text-gray-700 mb-6">
                  Fecha de última actualización: <span className="font-semibold">30 de Marzo de 2026</span>.
                </p>
                <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                  <p className="text-sm text-gray-700 mb-2">Sistema desarrollado por:</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>Arturo Darinel Lopez Castillo</li>
                    <li>Brayam Gilberto Lopez Morales</li>
                    <li>Juan Mateo Hernández de Luna</li>
                  </ul>
                  <p className="text-sm text-gray-600 mt-3 italic">MAPRISER, Manejo de Procesos y Registros Inteligentes en Sistema de Expedientes y Recursos.</p>
                </div>
              </section>

              {/* Footer */}
              <div className="border-t pt-6 mt-12">
                {onAceptar && (
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      id="check-aviso"
                      checked={aceptado}
                      onChange={(e) => setAceptado(e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="check-aviso" className="text-sm text-gray-700 cursor-pointer select-none">
                      He leído y acepto el Aviso de Privacidad
                    </label>
                  </div>
                )}
                <div className="flex justify-center gap-3">
                  {!onAceptar && (
                    <Button onClick={onClose} className="bg-gray-800 hover:bg-gray-900">
                      Cerrar
                    </Button>
                  )}
                  {onAceptar && (
                    <Button
                      onClick={handleAceptar}
                      disabled={!aceptado || loading}
                      className="bg-gray-800 hover:bg-gray-900"
                    >
                      {loading ? 'Guardando...' : 'Aceptar y continuar'}
                    </Button>
                  )}
                </div>
              </div>

            </div>
          </ScrollArea>
        </div>
      </Card>
    </div>
  );
}