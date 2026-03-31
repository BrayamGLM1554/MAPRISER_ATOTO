const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generarToken } = require('../utils/token');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son requeridos' });
    }

    // Cargar usuario con passwordHash
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    if (!user.activo) {
      return res.status(403).json({ error: 'Usuario inactivo. Contacta al administrador' });
    }

    const passwordValido = await user.compararPassword(password);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    // Registrar sesion
    const ahora = new Date();
    user.ultimoLogin = user.loginActual || null;
    user.loginActual = ahora;
    await user.save();

    const token = generarToken(user);

    return res.json({
      token,
      perfil: user.toProfile(),
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.perfil = async (req, res) => {
  try {
    return res.json({ perfil: req.user.doc.toProfile() });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
