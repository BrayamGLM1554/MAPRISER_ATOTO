import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDocuments } from '../contexts/DocumentContext';
import { Header } from './Header';
import { GeneradorDocumento } from './GeneradorDocumento';
import { CrearDocumentoNuevo } from './CrearDocumentoNuevo';
import { HistorialDocumentos } from './HistorialDocumentos';
import { GestionMachotes } from './GestionMachotes';
import { GestionAreas } from './GestionAreas';
import { GestionUsuarios } from './GestionUsuarios';
import { PerfilUsuario } from './PerfilUsuario';
import { HistorialMachote } from './HistorialMachote';
import { InlineErrorBoundary } from './ErrorBoundary';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { FileText, Search, Plus, FolderOpen, Home, Users, Building2, LogOut, User, Menu, X } from 'lucide-react';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

type Vista = 'machotes' | 'historial' | 'editar' | 'crear-nuevo' | 'historial-docs' | 'gestion' | 'areas' | 'usuarios' | 'perfil';

export function Dashboard() {
  const { user, logout } = useAuth();
  // machotes contiene TODOS los machotes disponibles para el área del usuario
  // Obtenidos mediante GET /machotes (endpoint que filtra por área permitida)
  const { machotes, obtenerMachotesPorArea, refetchMachotes } = useDocuments();
  const [vistaActual, setVistaActual] = useState<Vista>('machotes');
  const [machoteSeleccionado, setMachoteSeleccionado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ✅ Estado para edición de documentos existentes
  const [documentoEnEdicion, setDocumentoEnEdicion] = useState<{
    documentoId: string;
    campos: Record<string, string>;
  } | null>(null);

  // Búsqueda con debounce de 300ms
  // Usa GET /machotes (todos los machotes del área)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (busqueda.trim()) {
          refetchMachotes(busqueda);
        } else {
          refetchMachotes();
        }
      } catch (error) {
        console.error('Error en búsqueda:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [busqueda, refetchMachotes]);

  // Refetch machotes al volver a la vista principal
  useEffect(() => {
    if (vistaActual === 'machotes') {
      try {
        refetchMachotes();
      } catch (error) {
        console.error('Error al refetch machotes:', error);
      }
    }
  }, [vistaActual, refetchMachotes]);

  if (!user) return null;

  const machotesDelUsuario = user.rol === 'administrador'
    ? machotes
    : user.area
    ? obtenerMachotesPorArea(user.area)
    : [];

  const handleEditarMachote = (machoteId: string) => {
    setMachoteSeleccionado(machoteId);
    setVistaActual('historial');
  };

  const handleVolverMachotes = () => {
    setVistaActual('machotes');
    setMachoteSeleccionado(null);
    setDocumentoEnEdicion(null);
  };

  const handleContinuarEdicion = () => {
    setVistaActual('editar');
  };

  const handleEditarDocumento = (documentoId: string, campos: Record<string, string>) => {
    setDocumentoEnEdicion({ documentoId, campos });
    setVistaActual('editar');
  };

  const handleVolverDesdeMachote = () => {
    setDocumentoEnEdicion(null);
    handleVolverMachotes();
  };

  const handleNavigate = (vista: 'perfil' | 'areas' | 'usuarios' | 'historial' | 'gestion') => {
    setVistaActual(vista);
    setMachoteSeleccionado(null);
    setDocumentoEnEdicion(null);
    setSidebarOpen(false);
  };

  const getInitials = (name: string) => {
    if (!name) return 'US';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getRolDisplay = (rol: string) => {
    const roles: Record<string, string> = {
      'administrador': 'Administrador General',
      'jefe_area': 'Director',
      'usuario': 'Auxiliar Administrativo',
    };
    return roles[rol] || rol;
  };

  // Paleta de colores por área (cíclica)
  const areaColors = [
    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', icon: 'bg-blue-100', strip: 'from-blue-400 to-blue-500' },
    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', icon: 'bg-emerald-100', strip: 'from-emerald-400 to-emerald-500' },
    { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', icon: 'bg-amber-100', strip: 'from-amber-400 to-amber-500' },
    { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', icon: 'bg-purple-100', strip: 'from-purple-400 to-purple-500' },
    { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600', icon: 'bg-rose-100', strip: 'from-rose-400 to-rose-500' },
    { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', icon: 'bg-cyan-100', strip: 'from-cyan-400 to-cyan-500' },
  ];

  // Vista principal: machotes filtrados
  const machotesDelUsuarioActual = user.rol === 'administrador'
    ? machotes
    : user.area
    ? obtenerMachotesPorArea(user.area)
    : [];

  const machotesFiltrados = machotesDelUsuarioActual.filter(machote =>
    machote.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    machote.area.toLowerCase().includes(busqueda.toLowerCase()) ||
    machote.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const machotesPorArea = machotesFiltrados.reduce((acc, machote) => {
    if (!acc[machote.area]) {
      acc[machote.area] = [];
    }
    acc[machote.area].push(machote);
    return acc;
  }, {} as Record<string, typeof machotes>);

  const navButtonClass = (vista: Vista) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
      vistaActual === vista
        ? 'bg-gray-100 text-gray-900'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#621132] to-[#8B1538] rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Sistema Documentos</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden -mr-2"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User Profile */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-12 w-12">
              {user?.avatar && <AvatarFallback />}
              <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white text-sm font-semibold">
                {getInitials(user?.nombre || 'Usuario')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.nombre || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {getRolDisplay(user?.rol || 'usuario')}
              </p>
            </div>
          </div>
          {user?.area && (
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              <Building2 className="h-3.5 w-3.5" />
              <span className="truncate">{user.area}</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            <button onClick={() => { setVistaActual('machotes'); setSidebarOpen(false); }} className={navButtonClass('machotes')}>
              <Home className="h-5 w-5" />
              <span>Inicio</span>
            </button>

            <button onClick={() => { setVistaActual('crear-nuevo'); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <Plus className="h-5 w-5" />
              <span>Crear Documento</span>
            </button>

            <button onClick={() => { setVistaActual('perfil'); setSidebarOpen(false); }} className={navButtonClass('perfil')}>
              <User className="h-5 w-5" />
              <span>Mi Perfil</span>
            </button>

            {/* Administrador */}
            {user?.rol === 'administrador' && (
              <>
                <div className="pt-4 pb-2 px-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administración</p>
                </div>

                <button onClick={() => { setVistaActual('gestion'); setSidebarOpen(false); }} className={navButtonClass('gestion')}>
                  <FileText className="h-5 w-5" />
                  <span>Gestionar Machotes</span>
                </button>

                <button onClick={() => { setVistaActual('areas'); setSidebarOpen(false); }} className={navButtonClass('areas')}>
                  <Building2 className="h-5 w-5" />
                  <span>Gestionar Áreas</span>
                </button>

                <button onClick={() => { setVistaActual('usuarios'); setSidebarOpen(false); }} className={navButtonClass('usuarios')}>
                  <Users className="h-5 w-5" />
                  <span>Gestionar Usuarios</span>
                </button>
              </>
            )}

            {/* Jefe de Área */}
            {user?.rol === 'jefe_area' && (
              <>
                <div className="pt-4 pb-2 px-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mi Área</p>
                </div>

                <button onClick={() => { setVistaActual('gestion'); setSidebarOpen(false); }} className={navButtonClass('gestion')}>
                  <FileText className="h-5 w-5" />
                  <span>Gestionar Machotes</span>
                </button>

                <button onClick={() => { setVistaActual('usuarios'); setSidebarOpen(false); }} className={navButtonClass('usuarios')}>
                  <Users className="h-5 w-5" />
                  <span>Mis Usuarios</span>
                </button>
              </>
            )}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile menu button bar */}
        <div className="lg:hidden bg-white border-b border-gray-200 flex items-center h-10 px-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="-ml-2 h-8"
          >
            <Menu className="h-4 w-4 mr-2" />
            <span className="text-xs text-gray-600">Menú</span>
          </Button>
        </div>

        {/* Header / Navbar — siempre visible */}
        <Header onNavigate={handleNavigate} />

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto">

          {/* Vista: historial de un machote específico */}
          {vistaActual === 'historial' && machoteSeleccionado && (
            <InlineErrorBoundary onReset={handleVolverMachotes}>
              <HistorialMachote
                machoteId={machoteSeleccionado}
                onVolver={handleVolverMachotes}
                onContinuarEdicion={handleContinuarEdicion}
                onEditarDocumento={handleEditarDocumento}
              />
            </InlineErrorBoundary>
          )}

          {/* Vista: editor de documento */}
          {vistaActual === 'editar' && machoteSeleccionado && (
            <InlineErrorBoundary onReset={handleVolverDesdeMachote}>
              <GeneradorDocumento
                machoteId={machoteSeleccionado}
                onVolver={handleVolverDesdeMachote}
                documentoId={documentoEnEdicion?.documentoId}
                camposIniciales={documentoEnEdicion?.campos}
              />
            </InlineErrorBoundary>
          )}

          {/* Vista: crear nuevo documento */}
          {vistaActual === 'crear-nuevo' && (
            <InlineErrorBoundary onReset={handleVolverMachotes}>
              <CrearDocumentoNuevo onVolver={handleVolverMachotes} />
            </InlineErrorBoundary>
          )}

          {/* Vista: historial de documentos (sin machote seleccionado) */}
          {vistaActual === 'historial' && !machoteSeleccionado && (
            <InlineErrorBoundary onReset={handleVolverMachotes}>
              <HistorialDocumentos onVolver={handleVolverMachotes} />
            </InlineErrorBoundary>
          )}

          {/* Vista: historial-docs */}
          {vistaActual === 'historial-docs' && (
            <InlineErrorBoundary onReset={handleVolverMachotes}>
              <HistorialDocumentos onVolver={handleVolverMachotes} />
            </InlineErrorBoundary>
          )}

          {/* Vista: gestión de machotes */}
          {vistaActual === 'gestion' && (
            <InlineErrorBoundary onReset={handleVolverMachotes}>
              <GestionMachotes onVolver={handleVolverMachotes} />
            </InlineErrorBoundary>
          )}

          {/* Vista: gestión de áreas (solo admin) */}
          {vistaActual === 'areas' && (
            <InlineErrorBoundary onReset={handleVolverMachotes}>
              <GestionAreas onVolver={handleVolverMachotes} />
            </InlineErrorBoundary>
          )}

          {/* Vista: gestión de usuarios */}
          {vistaActual === 'usuarios' && (
            <InlineErrorBoundary onReset={handleVolverMachotes}>
              <GestionUsuarios onVolver={handleVolverMachotes} />
            </InlineErrorBoundary>
          )}

          {/* Vista: perfil de usuario */}
          {vistaActual === 'perfil' && (
            <InlineErrorBoundary onReset={handleVolverMachotes}>
              <PerfilUsuario onVolver={handleVolverMachotes} />
            </InlineErrorBoundary>
          )}

          {/* Vista: machotes (principal) */}
          {vistaActual === 'machotes' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Machotes Disponibles
                </h1>
                <p className="text-gray-600">
                  Selecciona un machote para editar o crea uno nuevo
                </p>
              </div>

              {/* Search Bar */}
              <div className="mb-8">
                <div className="relative max-w-2xl">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar machotes por nombre, área o descripción..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-12 h-12 text-base border-gray-300 rounded-xl shadow-sm"
                  />
                </div>
              </div>

              {/* Machotes Grid */}
              {Object.keys(machotesPorArea).length === 0 ? (
                <Card className="border border-gray-200 shadow-sm">
                  <CardContent className="py-20 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-5">
                      <FolderOpen className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No se encontraron machotes
                    </h3>
                    <p className="text-gray-500 mb-6">
                      {busqueda
                        ? 'Intenta con otros términos de búsqueda'
                        : 'No hay machotes disponibles'}
                    </p>
                    <Button
                      onClick={() => setVistaActual('crear-nuevo')}
                      variant="outline"
                      className="border-gray-300"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primer Machote
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-10">
                  {Object.entries(machotesPorArea).map(([area, machotesArea], areaIdx) => {
                    const color = areaColors[areaIdx % areaColors.length];
                    return (
                    <div key={area}>
                      {/* Area Header */}
                      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-200">
                        <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">{area}</h2>
                          <p className="text-sm text-gray-500">
                            {machotesArea.length} {machotesArea.length === 1 ? 'machote' : 'machotes'}
                          </p>
                        </div>
                      </div>

                      {/* Machotes Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {machotesArea.map((machote) => (
                          <Card
                            key={machote.id}
                            className="border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer group overflow-hidden"
                            onClick={() => handleEditarMachote(machote.id)}
                          >
                            <div className="h-2 bg-gradient-to-r from-gray-400 to-gray-500"></div>

                            <CardContent className="p-5">
                              {/* Icon and Badge */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                                  <FileText className="h-6 w-6 text-gray-600" />
                                </div>
                                <Badge variant="secondary" className={`text-xs ${color.bg} ${color.text} border-0`}>
                                  {machote.area}
                                </Badge>
                              </div>

                              {/* Title */}
                              <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 min-h-[3rem]">
                                {machote.nombre}
                              </h3>

                              {/* Description */}
                              {machote.descripcion && (
                                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                  {machote.descripcion}
                                </p>
                              )}

                              {/* Metadata */}
                              <div className="flex items-center gap-3 text-xs text-gray-500 pt-4 border-t border-gray-100">
                                <span>Variables: {machote.campos.length}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}