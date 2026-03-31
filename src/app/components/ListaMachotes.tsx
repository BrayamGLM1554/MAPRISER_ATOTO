import React from 'react';
import { Machote } from '../contexts/DocumentContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { FileText, Calendar, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';

interface ListaMachotesProps {
  machotes: Machote[];
  onSeleccionar: (id: string) => void;
}

export function ListaMachotes({ machotes, onSeleccionar }: ListaMachotesProps) {
  if (machotes.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <FolderOpen className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">No hay machotes disponibles para tu área</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {machotes.map((machote) => (
        <Card 
          key={machote.id} 
          className="border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group overflow-hidden"
          onClick={() => onSeleccionar(machote.id)}
        >
          <div className="p-5 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
                {machote.area}
              </span>
            </div>

            {/* Título */}
            <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors line-clamp-2 min-h-[3rem]">
              {machote.nombre}
            </h3>

            {/* Metadata */}
            <div className="flex items-center text-xs text-gray-500 mb-4">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              <span>
                Creado {(() => {
                  try {
                    const fecha = new Date(machote.fechaCreacion);
                    if (isNaN(fecha.getTime())) return 'Fecha inválida';
                    return format(fecha, "d 'de' MMMM, yyyy");
                  } catch (error) {
                    console.warn('Error formateando fecha:', error);
                    return 'Fecha inválida';
                  }
                })()}
              </span>
            </div>

            {/* Botón */}
            <div className="mt-auto">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onSeleccionar(machote.id);
                }}
                className="w-full h-10 bg-gray-800 hover:bg-gray-900 shadow-sm"
              >
                Generar Documento
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}