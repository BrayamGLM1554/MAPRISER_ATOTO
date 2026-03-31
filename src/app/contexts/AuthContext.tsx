import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import * as authApi from "../services/authApi";
import { toast } from "sonner";

const USE_REAL_API = true;

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000;
const WARNING_BEFORE_MS = 1 * 60 * 1000;
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: "administrador" | "jefe_area" | "usuario";
  area?: string;
  permisos?: {
    lectura: boolean;
    escritura: boolean;
    edicion: boolean;
  };
  activo?: boolean;
  fechaCreacion?: string;
  ultimoAcceso?: string;
  apellidos?: string;
  nombreCompleto?: string;
  puesto?: string;
  areasPermitidas?: string[];
  avatar?: string | null;
  rolApi?: string;
  avisoPrivacidadAceptado?: boolean;
  primerIngreso?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  useRealApi: boolean;
  updateUserProfile: (updatedUser: User) => void;
  aceptarAviso: () => Promise<void>; // ✅ agregado al tipo
  cambiarPasswordInicial: (nuevaPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapRolFromApi(
  apiRol: string,
): "administrador" | "jefe_area" | "usuario" {
  switch (apiRol) {
    case "ADMIN":
      return "administrador";
    case "JEFE_AREA":
      return "jefe_area";
    default:
      return "usuario";
  }
}

const mockUsers: Record<string, { password: string; user: User }> = {
  "admin@atotonilco.gob.mx": {
    password: "admin123",
    user: {
      id: "1",
      nombre: "Administrador General",
      email: "admin@atotonilco.gob.mx",
      rol: "administrador",
      permisos: { lectura: true, escritura: true, edicion: true },
      activo: true,
      fechaCreacion: "1 de enero de 2024",
      ultimoAcceso: new Date().toLocaleString("es-MX"),
      areasPermitidas: [],
      avisoPrivacidadAceptado: false,
    },
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cambiarPasswordInicial = async (nuevaPassword: string) => {
    await authApi.cambiarPasswordInicial(nuevaPassword);
    setUser((prev) => (prev ? { ...prev, primerIngreso: false } : prev));
  };

  const logoutByInactivity = async () => {
    detenerSeguimiento();
    if (USE_REAL_API) {
      try {
        await (authApi as any).logout?.();
      } catch (_) {}
      authApi.removeToken();
    }
    setUser(null);
    toast.warning("Tu sesión se cerró por inactividad");
  };

  const resetTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);

    warningTimer.current = setTimeout(() => {
      toast.warning("Tu sesión cerrará en 1 minuto por inactividad");
    }, INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS);

    inactivityTimer.current = setTimeout(() => {
      logoutByInactivity();
    }, INACTIVITY_LIMIT_MS);
  };

  const iniciarSeguimiento = () => {
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true }),
    );
    resetTimer();
  };

  const detenerSeguimiento = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    ACTIVITY_EVENTS.forEach((event) =>
      window.removeEventListener(event, resetTimer),
    );
  };

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        localStorage.removeItem("user");
      }
    } catch (error) {
      console.error("Error al sincronizar usuario con localStorage:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      iniciarSeguimiento();
    } else {
      detenerSeguimiento();
    }
    return () => detenerSeguimiento();
  }, [user]);

  useEffect(() => {
    if (!USE_REAL_API) return;

    const loadSession = async () => {
      try {
        const perfil = await authApi.getPerfil(); // ✅ era "response.perfil" siendo que aquí es solo "perfil"
        const areasPermitidas = perfil.areasPermitidas || [];

        const userFromApi: User = {
          id: perfil.id,
          nombre:
            perfil.nombreCompleto || `${perfil.nombre} ${perfil.apellidos}`,
          email: perfil.email,
          rol: mapRolFromApi(perfil.rol),
          area: perfil.areasPermitidas?.[0] || undefined,
          permisos: {
            lectura: true,
            escritura: perfil.rol === "ADMIN" || perfil.rol === "JEFE_AREA",
            edicion: perfil.rol === "ADMIN" || perfil.rol === "JEFE_AREA",
          },
          activo: perfil.activo,
          fechaCreacion: new Date(perfil.createdAt).toLocaleDateString("es-MX"),
          ultimoAcceso: perfil.ultimoLogin
            ? new Date(perfil.ultimoLogin).toLocaleString("es-MX")
            : undefined,
          apellidos: perfil.apellidos,
          nombreCompleto: perfil.nombreCompleto,
          puesto: perfil.puesto,
          areasPermitidas,
          avatar: perfil.avatar,
          rolApi: perfil.rol,
          avisoPrivacidadAceptado: perfil.avisoPrivacidadAceptado ?? false,
          primerIngreso: perfil.primerIngreso ?? true,   // en loadSession

        };

        setUser(userFromApi);
      } catch (error: any) {
        if (
          error.message?.includes("No hay token") ||
          error.message?.includes("Token inválido")
        ) {
          console.log("ℹ️ No hay sesión activa");
        } else {
          console.log("⚠️ Error al recuperar sesión:", error.message);
        }
        try {
          localStorage.removeItem("user");
          authApi.removeToken();
        } catch (_) {}
      }
    };

    loadSession();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (USE_REAL_API) {
      try {
        const response = await authApi.login(email, password);
        const areasPermitidas = response.perfil.areasPermitidas || [];

        const userFromApi: User = {
          id: response.perfil.id,
          nombre:
            response.perfil.nombreCompleto ||
            `${response.perfil.nombre} ${response.perfil.apellidos}`,
          email: response.perfil.email,
          rol: mapRolFromApi(response.perfil.rol),
          area: response.perfil.areasPermitidas?.[0] || undefined,
          permisos: {
            lectura: true,
            escritura:
              response.perfil.rol === "ADMIN" ||
              response.perfil.rol === "JEFE_AREA",
            edicion:
              response.perfil.rol === "ADMIN" ||
              response.perfil.rol === "JEFE_AREA",
          },
          activo: response.perfil.activo,
          fechaCreacion: new Date(response.perfil.createdAt).toLocaleDateString(
            "es-MX",
          ),
          ultimoAcceso: response.perfil.ultimoLogin
            ? new Date(response.perfil.ultimoLogin).toLocaleString("es-MX")
            : undefined,
          apellidos: response.perfil.apellidos,
          nombreCompleto: response.perfil.nombreCompleto,
          puesto: response.perfil.puesto,
          areasPermitidas,
          avatar: response.perfil.avatar,
          rolApi: response.perfil.rol,
          avisoPrivacidadAceptado:
            response.perfil.avisoPrivacidadAceptado ?? false,
            primerIngreso: response.perfil.primerIngreso ?? true,
        };

        setUser(userFromApi);
        return true;
      } catch (error: any) {
        if (error.message.includes("Credenciales invalidas")) {
          toast.error("Correo o contraseña incorrectos");
        } else if (error.message.includes("Usuario inactivo")) {
          toast.error("Usuario inactivo. Contacta al administrador");
        } else if (
          error.message.includes("Network") ||
          error.message.includes("timeout")
        ) {
          toast.error("Error de conexión. Intenta de nuevo");
        } else {
          toast.error("Error al iniciar sesión");
        }
        return false;
      }
    } else {
      const mockUser = mockUsers[email];
      if (mockUser && mockUser.password === password) {
        setUser(mockUser.user);
        return true;
      }
      return false;
    }
  };

  const logout = () => {
    detenerSeguimiento();
    if (USE_REAL_API) authApi.removeToken();
    setUser(null);
  };

  // ✅ función aceptarAviso
  const aceptarAviso = async () => {
    await authApi.aceptarAviso();
    setUser((prev) =>
      prev ? { ...prev, avisoPrivacidadAceptado: true } : prev,
    );
  };

  const updateUserProfile = (updatedUser: User) => setUser(updatedUser);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        useRealApi: USE_REAL_API,
        updateUserProfile,
        aceptarAviso,
        cambiarPasswordInicial,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
