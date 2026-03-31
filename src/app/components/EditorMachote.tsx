import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import {
  ArrowLeft,
  Save,
  Loader2,
  Copy,
  Trash2,
  RotateCcw,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import {
  updateMachote as apiUpdateMachote,
  deactivateMachote as apiDeactivateMachote,
  reactivateMachote as apiReactivateMachote,
  getMachote as apiGetMachote,
} from "../services/api";

interface EditorMachoteProps {
  machoteId: string;
  machoteNombre: string;
  machoteContenidoInicial: string;
  onVolver: () => void;
  onActualizar: (contenido: string) => Promise<void>;
}

export function EditorMachote({
  machoteId,
  machoteNombre,
  machoteContenidoInicial,
  onVolver,
  onActualizar,
}: EditorMachoteProps) {
  const [contenido, setContenido] = useState(
    machoteContenidoInicial,
  );
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [machoteAPI, setMachoteAPI] = useState<any>(null);
  const [accionandoEstado, setAccionandoEstado] =
    useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cargar machote desde API
  useEffect(() => {
    if (!machoteId) {
      console.error("machoteId no está definido");
      setCargando(false);
      return;
    }

    setCargando(true);
    apiGetMachote(machoteId)
      .then((data) => {
        setMachoteAPI(data);
        // SIEMPRE usar content.text, con fallback seguro a string vacío
        let contenidoCargado =
          typeof data.content?.text === "string" &&
          data.content.text.trim()
            ? data.content.text
            : typeof data.content?.html === "string" &&
                data.content.html.trim()
              ? data.content.html
              : "";

        // Si el contenido parece ser HTML, convertirlo a texto plano
        // pero preservando las variables entre corchetes
        if (
          contenidoCargado.includes("<") &&
          contenidoCargado.includes(">")
        ) {
          contenidoCargado =
            convertirHTMLaTextoPlano(contenidoCargado);
        }

        setContenido(contenidoCargado);
        console.log("✅ Machote cargado desde API:", data);
      })
      .catch((error) => {
        console.error("❌ Error al cargar machote:", error);
        toast.error(
          "No se pudo cargar el machote desde el servidor",
        );
        setContenido(""); // Fallback a string vacío
      })
      .finally(() => {
        setCargando(false);
      });
  }, [machoteId]);

  // Función para convertir HTML a texto plano preservando variables
  const convertirHTMLaTextoPlano = (html: string): string => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // Convertir algunos bloques a saltos de línea antes de extraer texto
    tempDiv.querySelectorAll("br").forEach((el) => {
      el.replaceWith("\n");
    });

    tempDiv.querySelectorAll("p, div, li").forEach((el) => {
      el.insertAdjacentText("beforebegin", "\n");
    });

    let texto = tempDiv.innerText || tempDiv.textContent || "";

    texto = texto
      .replace(/\r/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim();

    return texto;
  };

  // Detectar variables usando regex /\[(.*?)\]/g
  const detectarVariables = (texto: string): string[] => {
    const regex = /\[(.*?)\]/g;
    const variables: string[] = [];
    const variablesUnicas = new Set<string>();
    let match;

    while ((match = regex.exec(texto)) !== null) {
      const variable = match[1].trim();
      if (variable && !variablesUnicas.has(variable)) {
        variablesUnicas.add(variable);
        variables.push(variable);
      }
    }

    return variables;
  };

  const variablesDetectadas = detectarVariables(contenido);

  // Formatear nombre de variable
  const formatearNombreVariable = (
    variable: string,
  ): string => {
    return variable
      .split("_")
      .map(
        (palabra) =>
          palabra.charAt(0).toUpperCase() + palabra.slice(1),
      )
      .join(" ");
  };

  // Copiar variable al portapapeles
  const handleCopiarVariable = (variable: string) => {
    const texto = `[${variable}]`;
    navigator.clipboard
      .writeText(texto)
      .then(() => {
        toast.success(`Copiado: ${texto}`);
      })
      .catch(() => {
        toast.error("No se pudo copiar al portapapeles");
      });
  };

  // Guardar (actualizar el mismo machote)
  const handleGuardar = async () => {
    if (!machoteAPI) {
      toast.error(
        "No se pudo cargar la información del machote",
      );
      return;
    }

    setGuardando(true);

    try {
      // Asegurar que contenido sea string
      const contenidoString =
        typeof contenido === "string" ? contenido : "";

      if (!contenidoString.trim()) {
        toast.error("El contenido no puede estar vacío");
        setGuardando(false);
        return;
      }

      const payload = {
        title: machoteAPI.title,
        areaKey: machoteAPI.areaKey,
        area: machoteAPI.area,
        status: machoteAPI.status,
        content: {
          text: contenidoString, // Solo texto plano
        },
        letterheadUrl: machoteAPI.letterheadUrl || "",
      };

      console.log(
        "📤 Actualizando machote. Variables detectadas:",
        variablesDetectadas,
      );

      const machoteActualizado = await apiUpdateMachote(
        machoteId,
        payload,
      );

      setMachoteAPI(machoteActualizado);
      const nuevoContenido =
        typeof machoteActualizado.content?.text === "string" &&
        machoteActualizado.content.text
          ? machoteActualizado.content.text
          : "";
      setContenido(nuevoContenido);

      await onActualizar(nuevoContenido);

      toast.success("Machote actualizado correctamente", {
        description: `${variablesDetectadas.length} variables detectadas`,
      });

      onVolver();
    } catch (error) {
      console.error("❌ Error al actualizar machote:", error);
      toast.error("Error al actualizar el machote", {
        description:
          error instanceof Error
            ? error.message
            : "Intenta de nuevo",
      });
    } finally {
      setGuardando(false);
    }
  };

  // Dar de baja
  const handleDesactivar = async () => {
    setAccionandoEstado(true);
    try {
      await apiDeactivateMachote(machoteId);
      toast.success("Machote dado de baja", {
        description: "El machote ha sido desactivado",
      });
      // Recargar machote
      const machoteActualizado = await apiGetMachote(machoteId);
      setMachoteAPI(machoteActualizado);
    } catch (error) {
      console.error("Error al desactivar machote:", error);
      toast.error("Error al dar de baja el machote", {
        description:
          error instanceof Error
            ? error.message
            : "Intenta de nuevo",
      });
    } finally {
      setAccionandoEstado(false);
    }
  };

  // Reactivar
  const handleReactivar = async () => {
    setAccionandoEstado(true);
    try {
      await apiReactivateMachote(machoteId);
      toast.success("Machote reactivado", {
        description: "El machote está nuevamente activo",
      });
      // Recargar machote
      const machoteActualizado = await apiGetMachote(machoteId);
      setMachoteAPI(machoteActualizado);
    } catch (error) {
      console.error("Error al reactivar machote:", error);
      toast.error("Error al reactivar el machote", {
        description:
          error instanceof Error
            ? error.message
            : "Intenta de nuevo",
      });
    } finally {
      setAccionandoEstado(false);
    }
  };

  // Formatear fecha
  const formatearFecha = (fechaISO?: string): string => {
    if (!fechaISO) return "-";
    try {
      const fecha = new Date(fechaISO);
      if (isNaN(fecha.getTime())) return "-";
      return fecha.toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "-";
    }
  };

  const esInactivo = machoteAPI?.status === "inactive";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={onVolver}
            className="mb-6 -ml-2 hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Editar Machote: {machoteNombre}
              </h1>
              <p className="text-sm text-gray-600">
                Escribe [NombreDelCampo] en el texto para crear
                un campo dinámico
              </p>

              {/* Estado del machote */}
              {machoteAPI && (
                <div className="mt-4 flex items-center gap-3">
                  {esInactivo ? (
                    <>
                      <Badge
                        variant="destructive"
                        className="bg-red-600"
                      >
                        Dado de baja
                      </Badge>
                      {machoteAPI.fechaBaja && (
                        <span className="text-xs text-gray-500">
                          Fecha de baja:{" "}
                          {formatearFecha(machoteAPI.fechaBaja)}
                        </span>
                      )}
                    </>
                  ) : (
                    <Badge
                      variant="default"
                      className="bg-green-600"
                    >
                      Activo
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Acciones de estado */}
            {machoteAPI && (
              <div className="flex gap-2">
                {esInactivo ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="text-green-600 hover:text-green-700"
                        disabled={accionandoEstado}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reactivar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          ¿Reactivar machote?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          El machote "{machoteNombre}" volverá a
                          estar disponible para su uso.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleReactivar}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Reactivar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        disabled={accionandoEstado}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Dar de Baja
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          ¿Dar de baja este machote?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          El machote "{machoteNombre}" será
                          marcado como inactivo. Podrás
                          reactivarlo más tarde si es necesario.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDesactivar}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Dar de Baja
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Indicador de carga */}
        {cargando && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <span className="ml-3 text-gray-600">
              Cargando machote...
            </span>
          </div>
        )}

        {!cargando && (
          <>
            {/* Instrucciones */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900">
                💡 <strong>Instrucciones:</strong> Para crear
                una variable dinámica, escribe el nombre entre
                corchetes, ejemplo:{" "}
                <code className="bg-blue-100 px-1.5 py-0.5 rounded">
                  [nombre_empleado]
                </code>
                . El sistema detectará automáticamente todas las
                variables.
              </p>
            </div>

            {/* Layout de dos columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Editor de contenido - Columna izquierda */}
              <div className="space-y-6">
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Edit3 className="h-5 w-5" />
                        Editor de Plantilla
                      </h2>
                    </div>
                    <Textarea
                      value={contenido}
                      onChange={(e) =>
                        setContenido(e.target.value)
                      }
                      className="min-h-[600px] font-mono text-sm"
                      placeholder="Escribe el contenido del machote aquí..."
                      ref={textareaRef}
                    />
                  </CardContent>
                </Card>

                {/* Botones de acción */}
                <div className="space-y-3">
                  <Button
                    onClick={handleGuardar}
                    size="lg"
                    className="w-full bg-gray-800 hover:bg-gray-900"
                    disabled={guardando}
                  >
                    {guardando ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Guardar
                  </Button>

                  <Button
                    variant="outline"
                    onClick={onVolver}
                    size="lg"
                    className="w-full"
                    disabled={guardando}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>

              {/* Panel de variables detectadas - Columna derecha */}
              <div className="lg:sticky lg:top-8 lg:self-start">
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Variables Detectadas (
                      {variablesDetectadas.length})
                    </h2>

                    {variablesDetectadas.length > 0 ? (
                      <div className="space-y-2">
                        {variablesDetectadas.map(
                          (variable, index) => (
                            <div
                              key={`${variable}-${index}`}
                              className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all duration-200"
                            >
                              <div className="flex-1">
                                <code className="text-sm text-gray-900 font-mono font-semibold">
                                  [{variable}]
                                </code>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {formatearNombreVariable(
                                    variable,
                                  )}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleCopiarVariable(variable)
                                }
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                                title={`Copiar [${variable}]`}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                          <Edit3 className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-600 mb-2 font-medium">
                          No se han detectado variables
                        </p>
                        <p className="text-xs text-gray-500">
                          Escribe algo como{" "}
                          <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                            [Nombre]
                          </code>{" "}
                          en el contenido
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}