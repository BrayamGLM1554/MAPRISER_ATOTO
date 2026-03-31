import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

/**
 * Exporta un documento HTML a PDF usando html2canvas
 * Esta es la lógica compartida entre GeneradorDocumento y CrearDocumentoNuevo
 * 
 * @param documentRef - Ref del contenedor del documento
 * @param nombreArchivo - Nombre base para el archivo PDF
 * @param selectorPaginas - Selector CSS para encontrar las páginas (default: '.document-page' o ':scope > div > div')
 * @returns jsPDF object o null si falla
 */
export async function exportarDocumentoAPDF(
  documentRef: HTMLElement,
  nombreArchivo: string,
  selectorPaginas: 'unified' | 'document-page' = 'document-page'
): Promise<jsPDF | null> {
  if (!documentRef) {
    toast.error('No se encontró el documento para generar PDF');
    return null;
  }

  const toastGenerando = toast.loading('Generando PDF del documento...');

  try {
    // ────────────────────────────────────────────────────────────────────────
    // PASO 0: ESPERAR A QUE TODO ESTÉ COMPLETAMENTE RENDERIZADO
    // ────────────────────────────────────────────────────────────────────────
    
    console.log('⏳ Esperando a que el documento esté completamente renderizado...');
    
    // Esperar a que todas las imágenes (hojas membretadas) estén cargadas
    const imagenes = documentRef.querySelectorAll('img');
    
    if (imagenes.length > 0) {
      console.log(`📸 Detectadas ${imagenes.length} imágenes, esperando carga...`);
      const promesasImagenes = Array.from(imagenes).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve());
          img.addEventListener('error', () => resolve());
          // Timeout de seguridad
          setTimeout(() => resolve(), 3000);
        });
      });
      await Promise.all(promesasImagenes);
      console.log('✅ Todas las imágenes cargadas');
    }
    
    // Delay adicional para asegurar renderizado completo
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // ────────────────────────────────────────────────────────────────────────
    // PASO 1: DETECTAR PÁGINAS
    // ────────────────────────────────────────────────────────────────────────
    
    let paginas: HTMLElement[];
    
    if (selectorPaginas === 'unified') {
      // Para UnifiedDocumentRenderer: <div ref> → <div flex flex-col> → páginas
      const contenedorPaginas = documentRef.querySelector(':scope > div') as HTMLElement;
      if (!contenedorPaginas) {
        toast.dismiss(toastGenerando);
        toast.error('No se encontró el contenedor de páginas');
        return null;
      }
      paginas = Array.from(contenedorPaginas.children) as HTMLElement[];
    } else {
      // Para DocumentRenderer: .document-page directo
      paginas = Array.from(documentRef.querySelectorAll<HTMLElement>('.document-page'));
    }

    if (paginas.length === 0) {
      toast.dismiss(toastGenerando);
      toast.error('No hay páginas para exportar al PDF');
      return null;
    }

    const totalPaginas = paginas.length;

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║           🚀 GENERACIÓN DE PDF INICIADA                    ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Total de páginas a exportar: ${totalPaginas.toString().padEnd(24)} ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // ────────────────────────────────────────────────────────────────────────
    // PASO 2: CREAR PDF
    // ────────────────────────────────────────────────────────────────────────
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
      compress: true,
    });

    console.log('✅ PDF creado: Tamaño Carta (216mm × 279mm)\n');

    // ────────────────────────────────────────────────────────────────────────
    // PASO 3: PROCESAR CADA PÁGINA
    // ────────────────────────────────────────────────────────────────────────

    let paginasExitosas = 0;
    let paginasFallidas = 0;

    for (let indice = 0; indice < totalPaginas; indice++) {
      const numero = indice + 1;

      console.log('┌────────────────────────────────────────────────────────┐');
      console.log(`│  📄 PÁGINA ${numero}/${totalPaginas}                                       │`);
      console.log('└────────────────────────────────────────────────────────┘');

      let clon: HTMLElement | null = null;

      try {
        // 3.1: Obtener página real
        const contenedorExterno = paginas[indice];
        let paginaInterna: HTMLElement;
        
        if (selectorPaginas === 'unified') {
          // Para UnifiedDocumentRenderer, buscar el div .bg-white interno
          paginaInterna = contenedorExterno.querySelector('.bg-white') as HTMLElement;
          if (!paginaInterna) {
            console.error(`   ❌ FALLO: No se encontró el div .bg-white en página ${numero}`);
            paginasFallidas++;
            continue;
          }
        } else {
          // Para DocumentRenderer, la página ya es el elemento correcto
          paginaInterna = contenedorExterno;
        }

        console.log('   ✓ Página localizada en el DOM');

        // 3.2: Clonar
        clon = paginaInterna.cloneNode(true) as HTMLElement;
        console.log('   ✓ Página clonada');

        // 3.3: Configurar dimensiones (carta en px a 94 DPI)
        clon.style.cssText = `
          position: fixed;
          top: -99999px;
          left: -99999px;
          width: 794px;
          height: 1123px;
          margin: 0;
          padding: 0;
          transform: none;
          transform-origin: top left;
          overflow: hidden;
          box-shadow: none;
          background-color: #ffffff;
        `;

        console.log('   ✓ Dimensiones: 794px × 1123px');

        // 3.4: Insertar en DOM (fuera de pantalla)
        document.body.appendChild(clon);
        void clon.offsetHeight; // Forzar reflow
        
        console.log('   ✓ Insertado temporalmente en DOM');

        // 3.4.5: Esperar a que las imágenes del clon estén listas
        const imagenesEnClon = clon.querySelectorAll('img');
        if (imagenesEnClon.length > 0) {
          console.log(`   🖼️  Esperando ${imagenesEnClon.length} imagen(es)...`);
          await Promise.all(
            Array.from(imagenesEnClon).map(img => {
              if (img.complete) return Promise.resolve();
              return new Promise<void>((resolve) => {
                img.addEventListener('load', () => resolve());
                img.addEventListener('error', () => resolve());
                setTimeout(() => resolve(), 2000);
              });
            })
          );
          console.log('   ✅ Imágenes del clon listas');
        }
        
        // Delay corto adicional para estabilización
        await new Promise(resolve => setTimeout(resolve, 100));

        // 3.5: Capturar con html2canvas
        console.log('   🎨 Capturando...');

        const canvas = await html2canvas(clon, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123,
          logging: false,
          imageTimeout: 0,
          removeContainer: false,
          onclone: (doc) => {
            // Limpiar colores oklch
            const elementos = doc.querySelectorAll('*');
            let corregidos = 0;

            elementos.forEach((el) => {
              if (!(el instanceof HTMLElement)) return;

              const estilos = window.getComputedStyle(el);

              if (estilos.color?.includes('oklch')) {
                el.style.color = 'rgb(0, 0, 0)';
                corregidos++;
              }

              if (estilos.backgroundColor?.includes('oklch')) {
                el.style.backgroundColor = 'rgb(255, 255, 255)';
                corregidos++;
              }

              if (estilos.borderColor?.includes('oklch')) {
                el.style.borderColor = 'rgb(200, 200, 200)';
                corregidos++;
              }

              const styleAttr = el.getAttribute('style') || '';
              if (styleAttr.includes('oklch')) {
                const limpio = styleAttr
                  .replace(/color:\s*oklch\([^)]+\)/gi, 'color: rgb(0, 0, 0)')
                  .replace(/background-color:\s*oklch\([^)]+\)/gi, 'background-color: rgb(255, 255, 255)')
                  .replace(/background:\s*oklch\([^)]+\)/gi, 'background: rgb(255, 255, 255)')
                  .replace(/border-color:\s*oklch\([^)]+\)/gi, 'border-color: rgb(200, 200, 200)');
                el.setAttribute('style', limpio);
              }
            });

            if (corregidos > 0) {
              console.log(`   ✓ ${corregidos} colores corregidos`);
            }
          },
        });

        console.log(`   ✅ Captura: ${canvas.width}px × ${canvas.height}px`);

        // 3.6: Convertir a JPEG
        const imagenJPEG = canvas.toDataURL('image/jpeg', 0.95);
        console.log('   ✓ Convertido a JPEG (95%)');

        // 3.7: Agregar al PDF
        if (indice > 0) {
          pdf.addPage('letter', 'portrait');
          console.log('   ➕ Nueva página PDF agregada');
        }

        pdf.addImage(
          imagenJPEG,
          'JPEG',
          0,     // x
          0,     // y
          216,   // ancho mm
          279,   // alto mm
          `pag${numero}`,
          'FAST'
        );

        console.log(`   ✅ Página ${numero} agregada al PDF\n`);

        paginasExitosas++;

      } catch (error) {
        console.error(`   ❌ FALLO EN PÁGINA ${numero}:`, error);
        console.log('');
        paginasFallidas++;
      } finally {
        // 3.8: Limpiar DOM
        if (clon && document.body.contains(clon)) {
          document.body.removeChild(clon);
        }
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // PASO 4: VALIDAR Y GUARDAR PDF
    // ────────────────────────────────────────────────────────────────────────

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           💾 PDF GENERADO                                  ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Páginas exitosas: ${paginasExitosas.toString().padEnd(35)} ║`);
    console.log(`║  Páginas fallidas: ${paginasFallidas.toString().padEnd(35)} ║`);
    console.log(`║  Total: ${totalPaginas.toString().padEnd(46)} ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    if (paginasExitosas === 0) {
      toast.dismiss(toastGenerando);
      toast.error('No se pudo exportar ninguna página');
      return null;
    }

    if (paginasFallidas > 0) {
      console.warn(`⚠️ ADVERTENCIA: ${paginasFallidas} página(s) no se exportaron correctamente`);
    }

    toast.dismiss(toastGenerando);
    
    if (paginasFallidas === 0) {
      console.log(`✅ PDF generado exitosamente (${paginasExitosas} página${paginasExitosas > 1 ? 's' : ''})\n`);
    } else {
      console.warn(`⚠️ PDF generado con advertencias: ${paginasExitosas}/${totalPaginas} páginas\n`);
    }

    return pdf;

  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════╗');
    console.error('║           ❌ ERROR CRÍTICO                                 ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    console.error(error);
    console.error('');

    toast.dismiss(toastGenerando);
    toast.error(
      'Error al generar el PDF',
      { description: error instanceof Error ? error.message : 'Desconocido' }
    );
    return null;
  }
}

/**
 * Genera HTML para impresión con estilos de página carta
 */
export function generarHTMLImpresion(contenidoHTML: string, nombreDocumento: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>${nombreDocumento}</title>
  <style>
    /* ════════════════════════════════════════════════════════════════════════
       CONFIGURACIÓN DE PÁGINA - Tamaño carta real
       ════════════════════════════════════════════════════════════════════════ */
    
    @page {
      size: letter; /* 8.5in x 11in = 216mm x 279mm */
      margin: 0;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html, body {
      margin: 0;
      padding: 0;
      width: 216mm;
      height: 279mm;
      font-family: Arial, Helvetica, sans-serif;
      background: white;
    }

    /* ═══════════════════════════════════════════════════════════════════════
       ESTILOS @media print - Forzar tamaño carta real con espacio para footer
       ═══════════════════════════════════════════════════════════════════════ */
    @media print {
      html, body {
        width: 216mm !important;
        height: 279mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* Contenedor principal - Ajustar a tamaño carta */
      body > div {
        width: 216mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* Cada página individual - Tamaño carta completo */
      body > div > div {
        width: 216mm !important;
        height: 279mm !important;
        max-height: 279mm !important;
        page-break-after: always;
        page-break-inside: avoid;
        margin: 0 !important;
        padding: 0 !important;
        position: relative;
        overflow: hidden;
      }

      body > div > div:last-child {
        page-break-after: auto;
      }

      /* Página interna - Eliminar escalas y reservar espacio para footer */
      body > div > div > div {
        width: 216mm !important;
        height: 279mm !important;
        max-height: 279mm !important;
        transform: none !important;
        scale: 1 !important;
        zoom: 1 !important;
        margin: 0 !important;
        padding: 0 !important;
        padding-bottom: 25mm !important; /* Reservar espacio para pie de hoja membretada */
        box-sizing: border-box !important;
        overflow: hidden;
      }

      /* Contenedor de contenido - No invadir área del footer */
      body > div > div > div > div[style*="padding"] {
        padding-bottom: 30mm !important; /* Espacio adicional para footer */
        box-sizing: border-box !important;
      }

      /* Asegurar que la imagen de fondo (hoja membretada) se vea completa */
      body > div > div > div > img,
      body > div > div img[style*="position: absolute"] {
        width: 216mm !important;
        height: 279mm !important;
        object-fit: fill !important;
        object-position: top left !important;
      }

      /* Ocultar número de página */
      div[style*="Página"] {
        display: none !important;
      }

      /* Evitar saltos dentro de párrafos */
      p {
        page-break-inside: avoid;
        orphans: 3;
        widows: 3;
      }

      /* Contenedor de texto sobre la hoja membretada */
      body > div > div > div > div:not([style*="position: absolute"]) {
        max-height: calc(279mm - 30mm) !important; /* Altura menos espacio del footer */
        overflow: visible !important;
      }
    }
  </style>
</head>
<body>
  ${contenidoHTML}
</body>
</html>`;
}
