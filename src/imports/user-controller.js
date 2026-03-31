const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { cloudinary, subirACloudinary } = require('../config/cloudinary');

// Puestos que resultan en roles de nivel bajo (los que JEFE_AREA puede crear)
const PUESTOS_OPERATIVOS = ['empleado', 'operativo', 'asistente'];

exports.crearUsuario = async (req, res) => {
  try {
    const { nombre, apellidos, email, password, puesto, areasPermitidas } = req.body;

    if (!nombre || !apellidos || !email || !password || !puesto) {
      return res.status(400).json({ 
        error: 'Campos requeridos: nombre, apellidos, email, password, puesto' 
      });
    }

    // JEFE_AREA solo puede crear usuarios con puestos operativos
    // Solo ADMIN puede crear otros jefes, directores o admins
    if (req.user.rol === 'JEFE_AREA') {
      const puestoLower = puesto.toLowerCase();
      const esOperativo = PUESTOS_OPERATIVOS.some(p => puestoLower.includes(p));
      if (!esOperativo) {
        return res.status(403).json({ 
          error: 'Solo puedes registrar usuarios con puesto Empleado, Operativo o Asistente' 
        });
      }
    }

    const existente = await User.findOne({ email });
    if (existente) {
      return res.status(409).json({ error: 'El email ya esta registrado' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const nuevoUsuario = new User({
      nombre,
      apellidos,
      email,
      passwordHash,
      puesto,
      areasPermitidas: areasPermitidas || [],
      creadoPor: req.user.uid, // backend registra quién creó al usuario
    });

    await nuevoUsuario.save();

    return res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      usuario: nuevoUsuario.toProfile(),
    });
  } catch (error) {
    console.error('Error creando usuario:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.actualizarAreas = async (req, res) => {
  try {
    const { id } = req.params;
    const { areasPermitidas } = req.body;

    if (!Array.isArray(areasPermitidas)) {
      return res.status(400).json({ error: 'areasPermitidas debe ser un arreglo' });
    }

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (usuario.rol === 'ADMIN') {
      return res.status(400).json({ error: 'No se pueden modificar las areas de un administrador' });
    }

    const areasAnteriores = [...usuario.areasPermitidas];
    usuario.areasPermitidas = areasPermitidas;
    await usuario.save();

    return res.json({
      mensaje: 'Areas actualizadas exitosamente',
      usuario: usuario.toProfile(),
      auditoria: {
        areasAnteriores,
        areasNuevas: areasPermitidas,
        modificadoPor: req.user.uid,
        fecha: new Date(),
      },
    });
  } catch (error) {
    console.error('Error actualizando areas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.listarUsuarios = async (req, res) => {
  try {
    let filtro = {};

    if (req.user.rol === 'JEFE_AREA') {
      // El jefe de area solo ve los usuarios que el mismo registro
      filtro.creadoPor = req.user.uid;
    }
    // ADMIN no tiene filtro, ve todos

    const usuarios = await User.find(filtro)
      .select('-passwordHash')
      .populate('creadoPor', 'nombre apellidos puesto')
      .sort({ createdAt: -1 });

    return res.json({ usuarios: usuarios.map(u => u.toProfile()) });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.obtenerUsuario = async (req, res) => {
  try {
    const usuario = await User.findById(req.params.id).select('-passwordHash');
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json({ usuario: usuario.toProfile() });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.toggleActivo = async (req, res) => {
  try {
    const usuario = await User.findById(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    usuario.activo = !usuario.activo;
    await usuario.save();
    
    return res.json({
      mensaje: `Usuario ${usuario.activo ? 'activado' : 'desactivado'}`,
      usuario: usuario.toProfile(),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.subirAvatar = async (req, res) => {
  try {
    const { id } = req.params;

    // Un usuario normal solo puede cambiar su propio avatar
    // El ADMIN puede cambiar el de cualquiera
    if (req.user.rol !== 'ADMIN' && req.user.uid.toString() !== id) {
      return res.status(403).json({ error: 'Solo puedes cambiar tu propio avatar' });
    }

    const usuario = await User.findById(id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (!req.file) return res.status(400).json({ error: 'No se subio ninguna imagen' });

    // Eliminar avatar anterior de Cloudinary si existe
    if (usuario.avatar?.publicId) {
      await cloudinary.uploader.destroy(usuario.avatar.publicId).catch(() => {});
    }

    // Subir buffer a Cloudinary directamente (compatible con cloudinary v2)
    const resultado = await subirACloudinary(req.file.buffer, {
      public_id: `usuario_${id}`,
      overwrite: true,
    });

    usuario.avatar = {
      url: resultado.secure_url,
      publicId: resultado.public_id,
    };
    await usuario.save();

    return res.json({
      mensaje: 'Avatar actualizado',
      avatar: usuario.avatar.url,
      perfil: usuario.toProfile(),
    });
  } catch (error) {
    console.error('Error subiendo avatar:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};