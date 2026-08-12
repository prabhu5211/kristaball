import db from '../config/db.js';

/**
 * auditLog - utility to write an audit record manually from controllers.
 */
export const auditLog = async ({ userId, action, entityId = null, details, ipAddress = null }) => {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, action, entityId || null, details, ipAddress || null]
    );
  } catch (err) {
    // Non-blocking — log to console but don't fail the request
    console.error('Audit log write failed:', err.message);
  }
};

/**
 * requestLogger - simple HTTP request logger middleware (dev use).
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
};
