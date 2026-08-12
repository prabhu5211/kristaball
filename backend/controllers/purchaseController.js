import db from '../config/db.js';
import { auditLog } from '../middlewares/loggerMiddleware.js';

/**
 * POST /api/purchases
 * Body: { baseId, equipmentTypeId, quantity, unitCost, supplier, notes }
 */
export const createPurchase = async (req, res) => {
  try {
    const { baseId, equipmentTypeId, quantity, unitCost, supplier, notes } = req.body;

    if (!baseId || !equipmentTypeId || !quantity) {
      return res.status(400).json({ message: 'baseId, equipmentTypeId, and quantity are required.' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive integer.' });
    }

    // Enforce base scope for BASE_COMMANDER
    if (req.user.role === 'BASE_COMMANDER' && req.user.baseId !== parseInt(baseId)) {
      return res.status(403).json({ message: 'You can only purchase for your assigned base.' });
    }

    const result = await db.query(
      `INSERT INTO purchases (base_id, equipment_type_id, quantity, unit_cost, supplier, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [baseId, equipmentTypeId, quantity, unitCost || 0, supplier || null, notes || null, req.user.id]
    );

    const purchase = result.rows[0];

    // Audit
    await auditLog({
      userId:    req.user.id,
      action:    'PURCHASE',
      entityId:  purchase.id,
      details:   `Purchase: ${quantity} units of equipment_type #${equipmentTypeId} at Base #${baseId}${supplier ? ` from "${supplier}"` : ''}.`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ message: 'Purchase recorded successfully.', purchase });
  } catch (err) {
    console.error('Create purchase error:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/purchases
 * Query params: baseId, equipmentTypeId, startDate, endDate, limit, offset
 */
export const getPurchases = async (req, res) => {
  try {
    const { baseId, equipmentTypeId, startDate, endDate, limit = 50, offset = 0 } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (baseId) { conditions.push(`p.base_id = $${idx++}`); params.push(parseInt(baseId)); }
    if (equipmentTypeId) { conditions.push(`p.equipment_type_id = $${idx++}`); params.push(parseInt(equipmentTypeId)); }
    if (startDate) { conditions.push(`p.created_at >= $${idx++}`); params.push(new Date(startDate)); }
    if (endDate)   { conditions.push(`p.created_at <= $${idx++}`); params.push(new Date(endDate)); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(
      `SELECT p.*,
              b.name   AS base_name,
              et.name  AS equipment_name,
              et.category,
              u.username AS created_by_username
       FROM purchases p
       JOIN bases b          ON p.base_id = b.id
       JOIN equipment_types et ON p.equipment_type_id = et.id
       LEFT JOIN users u     ON p.created_by = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    // Count query
    const countRes = await db.query(
      `SELECT COUNT(*)::int AS total FROM purchases p ${whereClause}`,
      params.slice(0, params.length - 2)
    );

    return res.status(200).json({
      data:  result.rows,
      total: countRes.rows[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    console.error('Get purchases error:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/purchases/:id  (Admin only)
 */
export const deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM purchases WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Purchase record not found.' });
    }
    await auditLog({
      userId:   req.user.id,
      action:   'PURCHASE',
      entityId: parseInt(id),
      details:  `Purchase record #${id} deleted by admin "${req.user.username}".`,
      ipAddress: req.ip,
    });
    return res.status(200).json({ message: 'Purchase deleted.', purchase: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
