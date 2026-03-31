import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDocuments } from '../contexts/DocumentContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ArrowLeft, FileText, Search, Calendar, Users, FilePlus, Building2, Sparkles } from 'lucide-react';

interface SeleccionarMachoteProps {
  onVolver: () => void;
  onSeleccionar: (machoteId: string) => void;
  onCrearNuevo: () => void;
}

export function SeleccionarMachote({ onVolver, onSeleccionar, onCrearNuevo }: SeleccionarMachoteProps) {
  const { user } = useAuth();
  const { machotes, obtenerMachotesPorArea } = useDocuments();
  const [busqueda, setBusqueda] = useState('');

  if (!user) return null;

  const machotesDelUsuario = user.rol === 'administrador' 
    ? machotes 
    : user.area 
    ? obtenerMachotesPorArea(user.area)
    : [];

  const machotesFiltrados = machotesDelUsuario.filter(machote =>
    machote.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    machote.area.toLowerCase().includes(busqueda.toLowerCase()) ||
    machote.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Agrupar machotes por área
  const machotesPorArea = machotesFiltrados.reduce((acc, machote) => {
    if (!acc[machote.area]) {
      acc[machote.area] = [];
    }
    acc[machote.area].push(machote);
    return acc;
  }, {} as Record<string, typeof machotes>);

  const formatearFecha = (fecha: string) => {
    try {
      const fechaObj = new Date(fecha);
      if (isNaN(fechaObj.getTime())) return 'Fecha no disponible';
      return fechaObj.toLocaleDateString('es-MX', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch (error) {
      return 'Fecha no disponible';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navegación */}
        <Button 
          variant="ghost" 
          onClick={onVolver} 
          className="mb-6 -ml-2 hover:bg-white text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Dashboard
        </Button>

        {/* Header con acción principal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
              Machotes Disponibles
            </h1>
            <p className="text-sm text-gray-600">
              Selecciona un machote para editar o crea uno nuevo
            </p>
          </div>
          <div>
            <Button 
              onClick={onCrearNuevo}
              className="bg-gray-900 hover:bg-gray-800 text-white font-medium shadow-sm h-11 px-6 gap-2"
            >
              <FilePlus className="h-4 w-4" />
              Crear Nuevo Machote
            </Button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <Card className="mb-8 border border-gray-200 shadow-sm bg-white">
          <CardContent className="p-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar machotes..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 h-10 border-gray-300 bg-white focus-visible:ring-gray-200 focus-visible:border-gray-400"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de machotes por área */}
        {Object.keys(machotesPorArea).length === 0 ? (
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CardContent className="py-20 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-5">
                <FileText className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No se encontraron machotes
              </h3>
              <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                {busqueda 
                  ? 'No hay resultados para tu búsqueda. Intenta con otros términos.' 
                  : 'No hay machotes disponibles para tu área.'}
              </p>
              <Button
                onClick={onCrearNuevo}
                className="bg-gray-900 hover:bg-gray-800 text-white h-10 px-6"
              >
                <FilePlus className="h-4 w-4 mr-2" />
                Crear Nuevo Machote
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(machotesPorArea).map(([area, machotesArea]) => (
              <div key={area}>
                {/* Encabezado de área */}
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                  <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{area}</h2>
                    <p className="text-xs text-gray-500">
                      {machotesArea.length} {machotesArea.length === 1 ? 'machote' : 'machotes'}
                    </p>
                  </div>
                </div>

                {/* Grid de machotes */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {machotesArea.map((machote) => (
                    <Card 
                      key={machote.id} 
                      className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 bg-white overflow-hidden group cursor-pointer"
                      onClick={() => onSeleccionar(machote.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 font-medium border-0 mb-2">
                              {area}
                            </Badge>
                            <CardTitle className="text-base font-semibold text-gray-900 line-clamp-2">
                              {machote.nombre}
                            </CardTitle>
                          </div>
                          <div className="h-10 w-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                        <CardDescription className="text-xs text-gray-600 line-clamp-2">
                          {machote.descripcion || 'Sin descripción disponible'}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="pt-0 space-y-3">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="truncate">{formatearFecha(machote.fechaCreacion)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            <span>Variables: {machote.campos.length}</span>
                          </div>
                        </div>
                        
                        <Button 
                          className="w-full h-9 bg-gray-900 hover:bg-gray-800 text-white font-medium shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSeleccionar(machote.id);
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Editar Documento
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}