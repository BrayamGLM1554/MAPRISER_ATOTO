const HojaMembretada = require('../models/HojaMembretada');
const { cloudinary, subirMembretadaACloudinary } = require('../config/cloudinary');
const { normalizarAreaId, AREAS_VALIDAS } = require('../middleware/auth');

// ============================================================================
// POST /membretadas
// - puedeGestionarMembretadas (router) ya bloqueó EMPLEADO y ASISTENTE
// - areaGuard (router) ya normalizó y validó req.body.areaId
// ============================================================================
exports.subirHojaMembretada = async (req, res) => {
  try {
    const { areaId, nombre, descripcion } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El campo nombre es requerido' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    // JEFE_AREA: confirmar que el área esté entre las suyas
    if (req.user.rol === 'JEFE_AREA' && !req.user.areas.includes(areaId)) {
      return res.status(403).json({
        error: 'Solo puedes subir hojas membretadas de áreas a las que perteneces',
      });
    }

    const esPDF = req.file.mimetype === 'application/pdf';

    const resultado = await subirMembretadaACloudinary(req.file.buffer, areaId, {
      _esPDF: esPDF,
    });

    const nuevaHoja = new HojaMembretada({
      areaId,
      nombre,
      descripcion: descripcion || '',
      archivo: {
        url:        resultado.secure_url,
        previewUrl: resultado.previewUrl || resultado.secure_url,
        publicId:   resultado.public_id,
        formato:    resultado.format,
        bytes:      resultado.bytes,
      },
      subidaPor: req.user.uid,
    });

    await nuevaHoja.save();
    await nuevaHoja.populate('subidaPor', 'nombre apellidos puesto');

    return res.status(201).json({
      mensaje: 'Hoja membretada subida exitosamente',
      hoja: _fmt(nuevaHoja),
    });
  } catch (error) {
    console.error('Error subiendo hoja membretada:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ============================================================================
// GET /membretadas?areaId=&page=&limit=
// Todos los roles autenticados. Normaliza areaId del query si viene.
// ============================================================================
exports.listarHojasMembretadas = async (req, res) => {
  try {
    let { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Normalizar areaId del query si el frontend lo manda
    let areaId = null;
    if (req.query.areaId) {
      areaId = normalizarAreaId(req.query.areaId);
      if (!AREAS_VALIDAS.has(areaId)) {
        return res.status(400).json({ error: `Área "${req.query.areaId}" no válida` });
      }
    }

    let filtro = { activa: true };

    if (req.user.rol === 'ADMIN') {
      if (areaId) filtro.areaId = areaId;
    } else {
      const areasUsuario = req.user.areas;
      if (!areasUsuario.length) {
        return res.json({
          hojas: [],
          paginacion: { total: 0, pagina: 1, paginas: 0, limite: Number(limit) },
        });
      }
      if (areaId) {
        if (!areasUsuario.includes(areaId)) {
          return res.status(403).json({ error: `No tienes acceso al área "${areaId}"` });
        }
        filtro.areaId = areaId;
      } else {
        filtro.areaId = { $in: areasUsuario };
      }
    }

    const [hojas, total] = await Promise.all([
      HojaMembretada.find(filtro)
        .populate('subidaPor', 'nombre apellidos puesto')
        .sort({ areaId: 1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      HojaMembretada.countDocuments(filtro),
    ]);

    return res.json({
      hojas: hojas.map(_fmt),
      paginacion: {
        total,
        pagina:  Number(page),
        paginas: Math.ceil(total / Number(limit)),
        limite:  Number(limit),
      },
    });
  } catch (error) {
    console.error('Error listando hojas membretadas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ============================================================================
// GET /membretadas/area/:areaId
// Normaliza el param antes de cualquier operación.
// ============================================================================
exports.obtenerHojasPorArea = async (req, res) => {
  try {
    const areaId = normalizarAreaId(req.params.areaId);

    if (!AREAS_VALIDAS.has(areaId)) {
      return res.status(400).json({ error: `Área "${req.params.areaId}" no válida` });
    }

    if (req.user.rol !== 'ADMIN' && !req.user.areas.includes(areaId)) {
      return res.status(403).json({ error: `No tienes acceso al área "${areaId}"` });
    }

    const hojas = await HojaMembretada.find({ areaId, activa: true })
      .populate('subidaPor', 'nombre apellidos puesto')
      .sort({ createdAt: -1 });

    return res.json({ areaId, total: hojas.length, hojas: hojas.map(_fmt) });
  } catch (error) {
    console.error('Error obteniendo hojas por área:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ============================================================================
// GET /membretadas/:id
// ============================================================================
exports.obtenerHojaMembretada = async (req, res) => {
  try {
    const hoja = await HojaMembretada.findById(req.params.id)
      .populate('subidaPor', 'nombre apellidos puesto');

    if (!hoja) {
      return res.status(404).json({ error: 'Hoja membretada no encontrada' });
    }

    if (req.user.rol !== 'ADMIN' && !req.user.areas.includes(hoja.areaId)) {
      return res.status(403).json({ error: 'No tienes acceso a esta hoja membretada' });
    }

    return res.json({ hoja: _fmt(hoja) });
  } catch (error) {
    console.error('Error obteniendo hoja membretada:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ============================================================================
// DELETE /membretadas/:id
// - puedeGestionarMembretadas (router) ya bloqueó EMPLEADO y ASISTENTE
// ============================================================================
exports.eliminarHojaMembretada = async (req, res) => {
  try {
    const hoja = await HojaMembretada.findById(req.params.id);
    if (!hoja) {
      return res.status(404).json({ error: 'Hoja membretada no encontrada' });
    }

    if (req.user.rol === 'JEFE_AREA' && !req.user.areas.includes(hoja.areaId)) {
      return res.status(403).json({
        error: 'Solo puedes eliminar hojas membretadas de áreas a las que perteneces',
      });
    }

    hoja.activa = false;
    await hoja.save();

    const resourceType = hoja.archivo.formato === 'pdf' ? 'raw' : 'image';
    cloudinary.uploader
      .destroy(hoja.archivo.publicId, { resource_type: resourceType })
      .catch((err) => console.error('Cloudinary destroy error:', err));

    return res.json({
      mensaje: 'Hoja membretada eliminada correctamente',
      id:      hoja._id,
      areaId:  hoja.areaId,
    });
  } catch (error) {
    console.error('Error eliminando hoja membretada:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── serialización ───────────────────────────────────────────────────────────
const _fmt = (hoja) => ({
  id:            hoja._id,
  areaId:        hoja.areaId,
  nombre:        hoja.nombre,
  descripcion:   hoja.descripcion,
  archivo:       hoja.archivo,
  activa:        hoja.activa,
  subidaPor:     hoja.subidaPor,
  creadoEn:      hoja.createdAt,
  actualizadoEn: hoja.updatedAt,
});