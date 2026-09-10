module.exports = function requireAdmin(req, res, next) {
  const configuredPin = process.env.ADMIN_PIN;
  if (!configuredPin) {
    return res.status(500).json({ error: 'ADMIN_PIN não configurado no servidor (.env)' });
  }
  const providedPin = req.header('x-admin-pin');
  if (providedPin !== configuredPin) {
    return res.status(401).json({ error: 'PIN inválido' });
  }
  next();
};
