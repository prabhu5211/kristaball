/**
 * RBAC Middleware
 * - authorizeRoles: only lets through requests whose user role is in the allowed list.
 * - enforceBaseScope: restricts Base Commanders to their own base automatically.
 */

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access Denied: Insufficient authorization level.',
      });
    }
    next();
  };
};

/**
 * Inject baseId filter for BASE_COMMANDER role.
 * Admins and Logistics Officers retain full scope unless they voluntarily filter.
 */
export const enforceBaseScope = (req, res, next) => {
  if (req.user && req.user.role === 'BASE_COMMANDER') {
    // Override any baseId the client might have sent
    req.query.baseId = String(req.user.baseId);
  }
  next();
};
