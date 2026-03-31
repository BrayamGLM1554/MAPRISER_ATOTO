import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Area {
  id: string;
  nombre: string;
  descripcion: string;
  jefeId: string;
  jefeNombre: string;
  activa: boolean;
  fechaCreacion: string;
  cantidadUsuarios: number;
}

interface AreaContextType {
  areas: Area[];
  agregarArea: (area: Omit<Area, 'id' | 'fechaCreacion' | 'cantidadUsuarios'>) => void;
  actualizarArea: (id: string, area: Partial<Area>) => void;
  eliminarArea: (id: string) => void;
  obtenerAreaPorId: (id: string) => Area | undefined;
}

const AreaContext = createContext<AreaContextType | undefined>(undefined);

// Áreas de ejemplo
const areasIniciales: Area[] = [
  {
    id: '1',
    nombre: 'Recursos Humanos',
    descripcion: 'Gestión de personal y nómina',
    jefeId: '2',
    jefeNombre: 'Juan Pérez García',
    activa: true,
    fechaCreacion: '15 de enero de 2024',
    cantidadUsuarios: 3,
  },
  {
    id: '2',
    nombre: 'Secretaría / Tesorería',
    descripcion: 'Administración financiera y contabilidad',
    jefeId: '3',
    jefeNombre: 'María González López',
    activa: true,
    fechaCreacion: '20 de enero de 2024',
    cantidadUsuarios: 2,
  },
];

export function AreaProvider({ children }: { children: ReactNode }) {
  const [areas, setAreas] = useState<Area[]>(areasIniciales);

  const agregarArea = (area: Omit<Area, 'id' | 'fechaCreacion' | 'cantidadUsuarios'>) => {
    const nuevaArea: Area = {
      ...area,
      id: Date.now().toString(),
      fechaCreacion: new Date().toLocaleDateString('es-MX', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }),
      cantidadUsuarios: 0,
    };
    setAreas([...areas, nuevaArea]);
  };

  const actualizarArea = (id: string, areaActualizada: Partial<Area>) => {
    setAreas(areas.map(area => 
      area.id === id ? { ...area, ...areaActualizada } : area
    ));
  };

  const eliminarArea = (id: string) => {
    setAreas(areas.filter(area => area.id !== id));
  };

  const obtenerAreaPorId = (id: string) => {
    return areas.find(area => area.id === id);
  };

  return (
    <AreaContext.Provider value={{
      areas,
      agregarArea,
      actualizarArea,
      eliminarArea,
      obtenerAreaPorId,
    }}>
      {children}
    </AreaContext.Provider>
  );
}

export function useAreas() {
  const context = useContext(AreaContext);
  if (context === undefined) {
    throw new Error('useAreas must be used within an AreaProvider');
  }
  return context;
}
