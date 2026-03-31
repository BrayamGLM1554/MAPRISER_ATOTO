import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import hojaMembretadaSecretaria from "../../assets/68376b3a9d85d6f4511d93a98d6c2d209148e62e.png";
import { listMachotes as apiListMachotes, listMisMachotes as apiListMisMachotes, ApiMachote } from '../services/api';

// Context for managing machotes and generated documents
export interface CampoDinamico {
  id: string;
  nombre: string;
  tipo: 'texto' | 'fecha' | 'monto' | 'numero';
  valor: string;
  editable: boolean;
}

export interface HojaMembretada {
  id: string;
  nombre: string;
  area: string;
  imagenUrl: string;
  descripcion: string;
}

export interface Machote {
  id: string;
  nombre: string;
  area: string;
  contenido: string;
  campos: CampoDinamico[];
  fechaCreacion: Date;
  descripcion: string;
  status: 'activo' | 'inactivo';
}

export interface DocumentoGenerado {
  id: string;
  machoteId: string;
  nombreMachote: string;
  area: string;
  usuario: string;
  fechaGeneracion: Date;
  campos: CampoDinamico[];
}

interface DocumentContextType {
  machotes: Machote[];
  documentosGenerados: DocumentoGenerado[];
  hojasMembreteadas: HojaMembretada[];
  agregarMachote: (machote: Omit<Machote, 'id' | 'fechaCreacion'>) => void;
  editarMachote: (id: string, machote: Partial<Machote>) => Promise<void>;
  eliminarMachote: (id: string) => void;
  generarDocumento: (data: {
    machoteId: string;
    nombreMachote: string;
    area: string;
    usuario: string;
    contenido: string;
    camposUtilizados: Record<string, string>;
  }) => void;
  obtenerMachotesPorArea: (area: string) => Machote[];
  obtenerHojasMembreteadasPorArea: (area: string) => HojaMembretada[];
  refetchMachotes: (searchTerm?: string, includeInactive?: boolean) => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

// Catálogo de hojas membretadas por área
const hojasMembreteadasIniciales: HojaMembretada[] = [
  {
    id: 'hm1',
    nombre: 'Hoja Oficial Secretaría General Municipal',
    area: 'Secretaría / Tesorería',
    imagenUrl: hojaMembretadaSecretaria,
    descripcion: 'Hoja membretada oficial para documentos de Secretaría General Municipal',
  },
  // Aquí se pueden agregar más hojas membretadas para otras áreas
  // {
  //   id: 'hm2',
  //   nombre: 'Hoja Oficial Recursos Humanos',
  //   area: 'Recursos Humanos',
  //   imagenUrl: hojaMembretadaRH,
  //   descripcion: 'Hoja membretada oficial para documentos de Recursos Humanos',
  // },
];

const machotesIniciales: Machote[] = [
  {
    id: '1',
    nombre: 'Constancia Laboral',
    area: 'Recursos Humanos',
    contenido: `GOBIERNO DEL ESTADO DE HIDALGO
AYUNTAMIENTO DE ATOTONILCO DE TULA

CONSTANCIA LABORAL

A QUIEN CORRESPONDA:

Por medio de la presente, se hace constar que [nombre_empleado] con número de empleado [numero_empleado], labora en este H. Ayuntamiento desde el [fecha_inicio], desempeñando el cargo de [cargo] en el área de [departamento], con un sueldo mensual de [sueldo].

Se extiende la presente para los fines que al interesado convengan.

Atotonilco de Tula, Hidalgo a [fecha_actual].

ATENTAMENTE`,
    campos: [
      { id: 'c1', nombre: 'nombre_empleado', tipo: 'texto', valor: '', editable: true },
      { id: 'c2', nombre: 'numero_empleado', tipo: 'numero', valor: '', editable: true },
      { id: 'c3', nombre: 'fecha_inicio', tipo: 'fecha', valor: '', editable: true },
      { id: 'c4', nombre: 'cargo', tipo: 'texto', valor: '', editable: true },
      { id: 'c5', nombre: 'departamento', tipo: 'texto', valor: '', editable: true },
      { id: 'c6', nombre: 'sueldo', tipo: 'monto', valor: '', editable: true },
      { id: 'c7', nombre: 'fecha_actual', tipo: 'fecha', valor: new Date().toISOString().split('T')[0], editable: true },
    ],
    fechaCreacion: new Date('2024-01-15'),
    descripcion: '',
    status: 'activo',
  },
  {
    id: '2',
    nombre: 'Constancia de No Adeudo Predial',
    area: 'Secretaría / Tesorería',
    contenido: `DEPENDENCIA: PRESIDENCIA MUNICIPAL
ASUNTO: CONSTANCIA DE RADICACIÓN.
Nº DE OFICIO: SGM/[numero_oficio]/2026.
SECRETARIA GENERAL MUNICIPAL

ATOTONILCO DE TULA, HGO. A [fecha_actual].

A QUIEN CORRESPONDA:

Quien suscribe, LIC. MARTHA DELIA MONTERRUBIO HERNÁNDEZ, Secretaria General Municipal, por este conducto y con fundamento en el Artículo 98 Fracción IV de la ley Orgánica Municipal para el Estado de Hidalgo, así como, en el padrón de Comercio y negocios del Municipio de Atotonilco de Tula, Hidalgo. HAGO CONSTAR que la persona Moral Denominada "[nombre_persona_moral]" Representada por [nombre_representante] quien manifiesta Radicar en su domicilio a partir del mes de [mes_inicio] del año [año_inicio] en Calle [direccion_completa], Localidad [localidad], Municipio de Atotonilco de Tula, Hidalgo., C.P [codigo_postal]. Realizando todas sus actividades de trabajo y administrativas, las cuales tendrán continuidad hasta la fecha.

Se extiende la presente constancia a petición de la parte interesada para los usos y fines legales correspondientes a que haya lugar.


ATENTAMENTE


LIC. MARTHA DELIA MONTERRUBIO HERNÁNDEZ
SECRETARIA GENERAL MUNICIPAL.`,
    campos: [
      { id: 'c8', nombre: 'numero_oficio', tipo: 'numero', valor: '', editable: true },
      { id: 'c9', nombre: 'fecha_actual', tipo: 'fecha', valor: new Date().toISOString().split('T')[0], editable: true },
      { id: 'c10', nombre: 'nombre_persona_moral', tipo: 'texto', valor: '', editable: true },
      { id: 'c11', nombre: 'nombre_representante', tipo: 'texto', valor: '', editable: true },
      { id: 'c12', nombre: 'mes_inicio', tipo: 'texto', valor: '', editable: true },
      { id: 'c13', nombre: 'año_inicio', tipo: 'numero', valor: '', editable: true },
      { id: 'c14', nombre: 'direccion_completa', tipo: 'texto', valor: '', editable: true },
      { id: 'c15', nombre: 'localidad', tipo: 'texto', valor: '', editable: true },
      { id: 'c16', nombre: 'codigo_postal', tipo: 'numero', valor: '42980', editable: true },
    ],
    fechaCreacion: new Date('2024-01-20'),
    descripcion: '',
    status: 'activo',
  },
  {
    id: '3',
    nombre: 'Licencia Administrativa',
    area: 'Recursos Humanos',
    contenido: `GOBIERNO DEL ESTADO DE HIDALGO
AYUNTAMIENTO DE ATOTONILCO DE TULA
RECURSOS HUMANOS

AUTORIZACIÓN DE LICENCIA ADMINISTRATIVA

Nombre del empleado: [nombre_empleado]
Número de empleado: [numero_empleado]
Área: [area]

Por este medio se autoriza licencia administrativa por [dias_licencia] días, del [fecha_inicio] al [fecha_fin], por motivo de: [motivo].

Durante este periodo, el empleado [estatus_pago].

Atotonilco de Tula, Hidalgo a [fecha_actual].

AUTORIZA
JEFE DE RECURSOS HUMANOS`,
    campos: [
      { id: 'c15', nombre: 'nombre_empleado', tipo: 'texto', valor: '', editable: true },
      { id: 'c16', nombre: 'numero_empleado', tipo: 'numero', valor: '', editable: true },
      { id: 'c17', nombre: 'area', tipo: 'texto', valor: '', editable: true },
      { id: 'c18', nombre: 'dias_licencia', tipo: 'numero', valor: '', editable: true },
      { id: 'c19', nombre: 'fecha_inicio', tipo: 'fecha', valor: '', editable: true },
      { id: 'c20', nombre: 'fecha_fin', tipo: 'fecha', valor: '', editable: true },
      { id: 'c21', nombre: 'motivo', tipo: 'texto', valor: '', editable: true },
      { id: 'c22', nombre: 'estatus_pago', tipo: 'texto', valor: 'percibirá su sueldo normal', editable: true },
      { id: 'c23', nombre: 'fecha_actual', tipo: 'fecha', valor: new Date().toISOString().split('T')[0], editable: false },
    ],
    fechaCreacion: new Date('2024-02-01'),
    descripcion: '',
    status: 'activo',
  },
  {
    id: '4',
    nombre: 'Oficio General de Secretaría',
    area: 'Secretaría / Tesorería',
    contenido: `DEPENDENCIA: PRESIDENCIA MUNICIPAL
ASUNTO: [asunto]
Nº DE OFICIO: SGM/[numero_oficio]/2026.
SECRETARIA GENERAL MUNICIPAL

ATOTONILCO DE TULA, HGO. A [fecha_actual].

[destinatario]
[cargo_destinatario]
PRESENTE

Quien suscribe, LIC. MARTHA DELIA MONTERRUBIO HERNÁNDEZ, Secretaria General Municipal, por este conducto y con fundamento en el Artículo 98 Fracción IV de la ley Orgánica Municipal para el Estado de Hidalgo, me dirijo a Usted para hacer de su conocimiento lo siguiente:

[cuerpo_texto]

Sin otro particular por el momento, quedo de Usted.


ATENTAMENTE


LIC. MARTHA DELIA MONTERRUBIO HERNÁNDEZ
SECRETARIA GENERAL MUNICIPAL.`,
    campos: [
      { id: 'c24', nombre: 'asunto', tipo: 'texto', valor: '', editable: true },
      { id: 'c25', nombre: 'numero_oficio', tipo: 'numero', valor: '', editable: true },
      { id: 'c26', nombre: 'fecha_actual', tipo: 'fecha', valor: new Date().toISOString().split('T')[0], editable: true },
      { id: 'c27', nombre: 'destinatario', tipo: 'texto', valor: '', editable: true },
      { id: 'c28', nombre: 'cargo_destinatario', tipo: 'texto', valor: '', editable: true },
      { id: 'c29', nombre: 'cuerpo_texto', tipo: 'texto', valor: '', editable: true },
    ],
    fechaCreacion: new Date('2024-02-05'),
    descripcion: '',
    status: 'activo',
  },
];

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [machotes, setMachotes] = useState<Machote[]>(machotesIniciales);
  const [documentosGenerados, setDocumentosGenerados] = useState<DocumentoGenerado[]>([]);
  const [hojasMembreteadas] = useState<HojaMembretada[]>(hojasMembreteadasIniciales);
  const [isInitialized, setIsInitialized] = useState(false);

  // Cargar machotes desde la API al iniciar
  useEffect(() => {
    console.log('🚀 DocumentProvider mounted');
    const fetchMachotes = async () => {
      try {
        const apiMachotes = await apiListMachotes();
        
        // Convertir ApiMachote a Machote (tipo local)
        const machotesConvertidos: Machote[] = apiMachotes.map(apiMachote => {
          // Extraer variables usando la nueva sintaxis [Variable]
          const contenido = apiMachote.content?.text || apiMachote.content?.html || '';
          const regex = /\[(.*?)\]/g;
          const variablesDetectadas: string[] = [];
          const variablesUnicas = new Set<string>();
          let match;
          
          while ((match = regex.exec(contenido)) !== null) {
            const variable = match[1].trim();
            if (variable && !variablesUnicas.has(variable)) {
              variablesUnicas.add(variable);
              variablesDetectadas.push(variable);
            }
          }
          
          // Convertir a campos dinámicos
          const campos: CampoDinamico[] = variablesDetectadas.map((nombre, idx) => ({
            id: `campo-${idx}`,
            nombre,
            tipo: 'texto' as const,
            valor: '',
            editable: true,
          }));

          return {
            id: apiMachote._id,
            nombre: apiMachote.title,
            area: apiMachote.area,
            contenido: contenido,
            campos,
            fechaCreacion: new Date(apiMachote.createdAt),
            descripcion: '', // Agregar si existe en el futuro
            status: apiMachote.status,
          };
        });
        
        setMachotes(machotesConvertidos);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error al cargar machotes desde la API:', error);
        // En caso de error, mantener los machotes iniciales como fallback
      }
    };

    fetchMachotes();
  }, []);

  const agregarMachote = (machote: Omit<Machote, 'id' | 'fechaCreacion'>) => {
    const nuevoMachote: Machote = {
      ...machote,
      id: Date.now().toString(),
      fechaCreacion: new Date(),
    };
    setMachotes([...machotes, nuevoMachote]);
  };

  const editarMachote = (id: string, machoteActualizado: Partial<Machote>) => {
    return new Promise<void>((resolve, reject) => {
      try {
        setMachotes(machotes.map(m => (m.id === id ? { ...m, ...machoteActualizado } : m)));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  const eliminarMachote = (id: string) => {
    setMachotes(machotes.filter(m => m.id !== id));
  };

  const generarDocumento = (data: {
    machoteId: string;
    nombreMachote: string;
    area: string;
    usuario: string;
    contenido: string;
    camposUtilizados: Record<string, string>;
  }) => {
    const { machoteId, nombreMachote, area, usuario, contenido, camposUtilizados } = data;

    const campos: CampoDinamico[] = Object.entries(camposUtilizados).map(([id, valor]) => {
      const campo = machotes.find(m => m.id === machoteId)?.campos.find(c => c.id === id);
      return {
        id,
        nombre: campo?.nombre || '',
        tipo: campo?.tipo || 'texto',
        valor,
        editable: campo?.editable || false,
      };
    });

    const documento: DocumentoGenerado = {
      id: Date.now().toString(),
      machoteId,
      nombreMachote,
      area,
      usuario,
      fechaGeneracion: new Date(),
      campos,
    };

    setDocumentosGenerados([...documentosGenerados, documento]);
  };

  const obtenerMachotesPorArea = (area: string) => {
    return machotes.filter(m => m.area === area);
  };

  const obtenerHojasMembreteadasPorArea = (area: string) => {
    return hojasMembreteadas.filter(hm => hm.area === area);
  };

  // Obtiene TODOS los machotes disponibles para el área del usuario
  // Endpoint usado: GET /machotes
  const refetchMachotes = useCallback(async (searchTerm?: string, includeInactive?: boolean) => {
    try {
      const apiMachotes = await apiListMachotes(searchTerm, includeInactive);
      
      // Convertir ApiMachote a Machote (tipo local)
      const machotesConvertidos: Machote[] = apiMachotes.map(apiMachote => {
        // Extraer variables usando la nueva sintaxis [Variable]
        const contenido = apiMachote.content?.text || apiMachote.content?.html || '';
        const regex = /\[(.*?)\]/g;
        const variablesDetectadas: string[] = [];
        const variablesUnicas = new Set<string>();
        let match;
        
        while ((match = regex.exec(contenido)) !== null) {
          const variable = match[1].trim();
          if (variable && !variablesUnicas.has(variable)) {
            variablesUnicas.add(variable);
            variablesDetectadas.push(variable);
          }
        }
        
        // Convertir a campos dinámicos
        const campos: CampoDinamico[] = variablesDetectadas.map((nombre, idx) => ({
          id: `campo-${idx}`,
          nombre,
          tipo: 'texto' as const,
          valor: '',
          editable: true,
        }));

        return {
          id: apiMachote._id,
          nombre: apiMachote.title,
          area: apiMachote.area,
          contenido: contenido,
          campos,
          fechaCreacion: new Date(apiMachote.createdAt),
          descripcion: '', // Agregar si existe en el futuro
          status: apiMachote.status,
        };
      });
      
      setMachotes(machotesConvertidos);
    } catch (error) {
      console.error('Error al cargar machotes desde la API:', error);
      // En caso de error, mantener los machotes iniciales como fallback
    }
  }, []);

  return (
    <DocumentContext.Provider
      value={{
        machotes,
        documentosGenerados,
        hojasMembreteadas,
        agregarMachote,
        editarMachote,
        eliminarMachote,
        generarDocumento,
        obtenerMachotesPorArea,
        obtenerHojasMembreteadasPorArea,
        refetchMachotes,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocuments() {
  const context = useContext(DocumentContext);
  if (!context) {
    console.error('❌ DocumentContext is undefined - Provider may not be mounted correctly');
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
}