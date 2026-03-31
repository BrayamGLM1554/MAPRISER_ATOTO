/**
 * Simulación de servicio de normalización de datos de Excel
 * En producción, esto se conectaría a un servicio real en la nube
 */

export interface FieldMapping {
  columnIndex: number;
  columnName: string;
  suggestedField: string;
  confidence: number; // 0-1
}

export interface DataIssue {
  row: number;
  column: string;
  issue: string;
  suggestedValue: string;
  originalValue: string;
  severity: 'error' | 'warning' | 'info';
}

export interface NormalizationResult {
  mappings: FieldMapping[];
  issues: DataIssue[];
  normalizedData: Record<string, string>[];
  originalData: any[][];
}

/**
 * Simula el análisis y normalización de datos del archivo Excel
 */
export async function normalizeExcelData(
  data: any[][],
  headers: string[]
): Promise<NormalizationResult> {
  // Simulamos un delay como si fuera una petición al servidor
  await new Promise(resolve => setTimeout(resolve, 1500));

  const mappings: FieldMapping[] = [];
  const issues: DataIssue[] = [];
  const normalizedData: Record<string, string>[] = [];

  // Patrones comunes para detectar tipos de campos
  const fieldPatterns = {
    nombre: /^(nombre|name|empleado|employee|trabajador)/i,
    numero_empleado: /^(num|numero|number|id|empleado|employee|clave)/i,
    fecha: /^(fecha|date|day|inicio|start|fin|end)/i,
    cargo: /^(cargo|puesto|position|job|title|ocupacion)/i,
    departamento: /^(depart|area|division|sector)/i,
    sueldo: /^(sueldo|salario|salary|pay|wage|monto|amount)/i,
    domicilio: /^(domicilio|direccion|address|calle|street)/i,
    cuenta: /^(cuenta|account|numero|number)/i,
  };

  // Analizar headers y crear mappings
  headers.forEach((header, index) => {
    // Asegurar que siempre haya un valor válido
    if (!header || header.trim() === '') {
      header = `columna_${index + 1}`;
    }
    
    let suggestedField = header.toLowerCase().replace(/\s+/g, '_');
    let confidence = 0.5;

    // Intentar detectar el tipo de campo basado en patrones
    for (const [field, pattern] of Object.entries(fieldPatterns)) {
      if (pattern.test(header)) {
        suggestedField = field;
        confidence = 0.9;
        break;
      }
    }

    mappings.push({
      columnIndex: index,
      columnName: header,
      suggestedField,
      confidence,
    });
  });

  // Analizar datos y detectar problemas
  data.forEach((row, rowIndex) => {
    const normalizedRow: Record<string, string> = {};

    row.forEach((cell, cellIndex) => {
      const header = headers[cellIndex];
      const mapping = mappings[cellIndex];
      let value = cell?.toString() || '';

      // Detectar fechas mal formateadas
      if (mapping.suggestedField.includes('fecha') && value) {
        const dateFormats = [
          /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
          /^\d{4}-\d{2}-\d{2}$/,
          /^\d{1,2}-\d{1,2}-\d{2,4}$/,
        ];

        const isValidDate = dateFormats.some(format => format.test(value));
        if (!isValidDate && value.length > 0) {
          // Intentar convertir a formato estándar
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              const suggestedValue = date.toISOString().split('T')[0];
              issues.push({
                row: rowIndex + 2, // +2 porque row 0 es header y Excel empieza en 1
                column: header,
                issue: 'Formato de fecha inconsistente',
                suggestedValue,
                originalValue: value,
                severity: 'warning',
              });
              value = suggestedValue;
            }
          } catch (e) {
            issues.push({
              row: rowIndex + 2,
              column: header,
              issue: 'Fecha inválida',
              suggestedValue: '',
              originalValue: value,
              severity: 'error',
            });
          }
        }
      }

      // Detectar números mal formateados
      if ((mapping.suggestedField.includes('numero') || mapping.suggestedField.includes('sueldo')) && value) {
        const cleanedValue = value.replace(/[,$\s]/g, '');
        if (!isNaN(Number(cleanedValue)) && value !== cleanedValue) {
          issues.push({
            row: rowIndex + 2,
            column: header,
            issue: 'Formato numérico con caracteres extra',
            suggestedValue: cleanedValue,
            originalValue: value,
            severity: 'info',
          });
          value = cleanedValue;
        }
      }

      // Detectar datos en columna incorrecta (simulación)
      if (rowIndex % 7 === 0 && cellIndex < row.length - 1) {
        // Simular que algunos datos están en columna incorrecta
        const nextCell = row[cellIndex + 1];
        if (mapping.suggestedField === 'nombre' && /^\d+$/.test(value) && nextCell && !/^\d+$/.test(nextCell)) {
          issues.push({
            row: rowIndex + 2,
            column: header,
            issue: 'Posible dato numérico en columna de texto',
            suggestedValue: `Mover a ${headers[cellIndex + 1] || 'siguiente columna'}`,
            originalValue: value,
            severity: 'warning',
          });
        }
      }

      normalizedRow[mapping.suggestedField] = value;
    });

    normalizedData.push(normalizedRow);
  });

  return {
    mappings,
    issues,
    normalizedData,
    originalData: data,
  };
}