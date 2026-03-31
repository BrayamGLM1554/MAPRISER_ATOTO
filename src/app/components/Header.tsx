import React, { useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { LogOut, FileText, Building2, Users as UsersIcon, UserCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface HeaderProps {
  onNavigate?: (vista: 'perfil' | 'areas' | 'usuarios' | 'historial' | 'gestion') => void;
}

function UserMenu({ user, onNavigate, handleLogout }: {
  user: any;
  onNavigate: (vista: any) => void;
  handleLogout: () => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const getInitials = (name: string) => {
    try {
      if (!name) return 'US';
      return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    } catch {
      return 'US';
    }
  };

  const getRolDisplay = (rol: string) => {
    const roles: Record<string, string> = {
      'administrador': 'Administrador General',
      'jefe_area': 'Jefe de Área',
      'usuario': 'Usuario',
    };
    return roles[rol] || rol;
  };

  const handleNav = (vista: any) => {
    setIsOpen(false);
    onNavigate(vista);
  };

  const handleOut = () => {
    setIsOpen(false);
    handleLogout();
  };

  
}

// Componente auxiliar para ítems del menú
function MenuItem({
  icon,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      role="menuitem"
    >
      <span className="flex-shrink-0 text-gray-500">{icon}</span>
      <span>{children}</span>
    </button>
  );
}

export function Header({ onNavigate }: HeaderProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const handleNavigate = (vista: 'perfil' | 'areas' | 'usuarios' | 'historial' | 'gestion') => {
    try {
      onNavigate?.(vista);
    } catch (error) {
      console.error('Error en navegación:', error);
    }
  };

  const handleLogout = () => {
    try {
      logout();
    } catch (error) {
      console.error('Error en logout:', error);
      window.location.reload();
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-none">
                Sistema de Documentos
              </h1>
              <p className="text-xs text-gray-500 leading-none mt-0.5">
                Ayuntamiento de Atotonilco de Tula
              </p>
            </div>
          </div>

          {/* Menú de usuario */}
          <UserMenu
            user={user}
            onNavigate={handleNavigate}
            handleLogout={handleLogout}
          />
        </div>
      </div>
    </header>
  );
}