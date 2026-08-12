import db from '../config/db.js';
import { auditLog } from '../middlewares/loggerMiddleware.js';

/**
 * POST /api/transfers
 * Atomically moves assets from one base to another using a DB transaction.
 * Body: { sourceBaseId, destinationBaseId, equipmentTypeId, quantity, notes }
 */
export const createTransfer = async (req, res) => {
  const client = await db.getClient();
  try {
    const { sourceBaseId, destinationBaseId, equipmentTypeId, quantity, notes } = req.body;

    if (!sourceBaseId || !destinationBaseId || !equipmentTypeId || !quantity) {
      return res.status(400).json({
        message: 'sourceBaseId, destinationBaseId, equipmentTypeId, and quantity are required.',
      });
    }

    if (parseInt(sourceBaseId) === parseInt(destinationBaseId)) {
      return res.status(400).json({ message: 'Source and destination bases must be different.' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive integer.' });
    }

    // BASE_COMMANDER can only transfer FROM their base
    if (req.user.role === 'BASE_COMMANDER' && req.user.baseId !== parseInt(sourceBaseId)) {
      return res.status(403).json({ message: 'Base Commanders can only initiate transfers from their own base.' });
    }

    // Validate available stock at source
    const stockCheck = await client.query(
      `SELECT
         COALESCE(
           (SELECT SUM(quantity) FROM purchases   WHERE base_id = $1 AND equipment_type_id = $2), 0
         ) +
         COALESCE(
           (SELECT SUM(quantity) FROM transfers   WHERE destination_base_id = $1 AND equipment_type_id = $2 AND status = 'COMPLETED'), 0
         ) -
         COALESCE(
           (SELECT SUM(quantity) FROM transfers   WHERE source_base_id = $1 AND equipment_type_id = $2 AND status IN ('COMPLETED','IN_TRANSIT')), 0
         ) -
         COALESCE(
           (SELECT SUM(quantity) FROM assignments WHERE base_id = $1 AND equipment_type_id = $2), 0
         ) -
         COALESCE(
           (SELECT SUM(quantity) FROM expenditures WHERE base_id = $1 AND equipment_type_id = $2), 0
         ) AS available_stock`,
      [sourceBaseId, equipmentTypeId]
    );

    const availableStock = parseInt(stockCheck.rows[0].available_stock);
    if (availableStock < parseInt(quantity)) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`,
        availableStock,
      });
    }

    await client.query('BEGIN');

    // Insert transfer record
    const transferRes = await client.query(
      `INSERT INTO transfers
         (source_base_id, destination_base_id, equipment_type_id, quantity, status, notes, initiated_by)
       VALUES ($1, $2, $3, $4, 'COMPLETED', $5, $6)
       RETURNING *`,
      [sourceBaseId, destinationBaseId, equipmentTypeId, quantity, notes || null, req.user.id]
    );

    const transfer = transferRes.rows[0];

    // Audit log (inside transaction so it rolls back too)
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_id, details, ip_address)
       VALUES ($1, 'TRANSFER', $2, $3, $4)`,
      [
        req.user.id,
        transfer.id,
        `Transferred ${quantity} units (EquipType #${equipmentTypeId}) from Base #${sourceBaseId} → Base #${destinationBaseId}.`,
        req.ip,
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Transfer completed successfully.',
      transfer,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transfer error:', err);
    return res.status(500).json({ error: 'Transfer failed: ' + err.message });
  } finally {
    client.release();
  }
};

/**
 * GET /api/transfers
 * Query params: baseId (matches source OR dest), equipmentTypeId, startDate, endDate, limit, offset
 */
export const getTransfers = async (req, res) => {
  try {
    const { baseId, equipmentTypeId, startDate, endDate, limit = 50, offset = 0 } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (baseId) {
      conditions.push(`(t.source_base_id = $${idx} OR t.destination_base_id = $${idx})`);
      params.push(parseInt(baseId));
      idx++;
    }
    if (equipmentTypeId) { conditions.push(`t.equipment_type_id = $${idx++}`); params.push(parseInt(equipmentTypeId)); }
    if (startDate) { conditions.push(`t.created_at >= $${idx++}`); params.push(new Date(startDate)); }
    if (endDate)   { conditions.push(`t.created_at <= $${idx++}`); params.push(new Date(endDate)); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(
      `SELECT t.*,
              sb.name  AS source_base_name,
              db2.name AS destination_base_name,
              et.name  AS equipment_name,
              et.category,
              u.username AS initiated_by_username
       FROM transfers t
       JOIN bases sb           ON t.source_base_id = sb.id
       JOIN bases db2          ON t.destination_base_id = db2.id
       JOIN equipment_types et ON t.equipment_type_id = et.id
       LEFT JOIN users u       ON t.initiated_by = u.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    const countRes = await db.query(
      `SELECT COUNT(*)::int AS total FROM transfers t ${whereClause}`,
      params.slice(0, params.length - 2)
    );

    return res.status(200).json({
      data:  result.rows,
      total: countRes.rows[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    console.error('Get transfers error:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/assignments
 * Body: { baseId, equipmentTypeId, quantity, assignedTo, notes }
 */
export const createAssignment = async (req, res) => {
  try {
    const { baseId, equipmentTypeId, quantity, assignedTo, notes } = req.body;

    if (!baseId || !equipmentTypeId || !quantity || !assignedTo) {
      return res.status(400).json({ message: 'baseId, equipmentTypeId, quantity, and assignedTo are required.' });
    }

    // Scope check
    if (req.user.role === 'BASE_COMMANDER' && req.user.baseId !== parseInt(baseId)) {
      return res.status(403).json({ message: 'You can only create assignments for your base.' });
    }

    const result = await db.query(
      `INSERT INTO assignments (base_id, equipment_type_id, quantity, assigned_to, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [baseId, equipmentTypeId, quantity, assignedTo, notes || null, req.user.id]
    );

    const assignment = result.rows[0];

    await auditLog({
      userId:    req.user.id,
      action:    'ASSIGNMENT',
      entityId:  assignment.id,
      details:   `Assigned ${quantity} units of equip_type #${equipmentTypeId} at Base #${baseId} to "${assignedTo}".`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ message: 'Assignment created.', assignment });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/assignments
 */
export const getAssignments = async (req, res) => {
  try {
    const { baseId, equipmentTypeId, limit = 50, offset = 0 } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (baseId) { conditions.push(`a.base_id = $${idx++}`); params.push(parseInt(baseId)); }
    if (equipmentTypeId) { conditions.push(`a.equipment_type_id = $${idx++}`); params.push(parseInt(equipmentTypeId)); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(
      `SELECT a.*,
              b.name  AS base_name,
              et.name AS equipment_name,
              et.category,
              u.username AS created_by_username
       FROM assignments a
       JOIN bases b           ON a.base_id = b.id
       JOIN equipment_types et ON a.equipment_type_id = et.id
       LEFT JOIN users u      ON a.created_by = u.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    return res.status(200).json({ data: result.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/expenditures
 */
export const createExpenditure = async (req, res) => {
  try {
    const { baseId, equipmentTypeId, quantity, reason, notes } = req.body;

    if (!baseId || !equipmentTypeId || !quantity) {
      return res.status(400).json({ message: 'baseId, equipmentTypeId, and quantity are required.' });
    }

    if (req.user.role === 'BASE_COMMANDER' && req.user.baseId !== parseInt(baseId)) {
      return res.status(403).json({ message: 'You can only record expenditures for your base.' });
    }

    const result = await db.query(
      `INSERT INTO expenditures (base_id, equipment_type_id, quantity, reason, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [baseId, equipmentTypeId, quantity, reason || null, notes || null, req.user.id]
    );

    const expenditure = result.rows[0];

    await auditLog({
      userId:    req.user.id,
      action:    'EXPENDITURE',
      entityId:  expenditure.id,
      details:   `Expended ${quantity} units of equip_type #${equipmentTypeId} at Base #${baseId}. Reason: ${reason || 'N/A'}.`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ message: 'Expenditure recorded.', expenditure });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/expenditures
 */
export const getExpenditures = async (req, res) => {
  try {
    const { baseId, equipmentTypeId, limit = 50, offset = 0 } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (baseId) { conditions.push(`e.base_id = $${idx++}`); params.push(parseInt(baseId)); }
    if (equipmentTypeId) { conditions.push(`e.equipment_type_id = $${idx++}`); params.push(parseInt(equipmentTypeId)); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(
      `SELECT e.*,
              b.name  AS base_name,
              et.name AS equipment_name,
              et.category,
              u.username AS created_by_username
       FROM expenditures e
       JOIN bases b           ON e.base_id = b.id
       JOIN equipment_types et ON e.equipment_type_id = et.id
       LEFT JOIN users u      ON e.created_by = u.id
       ${whereClause}
       ORDER BY e.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    return res.status(200).json({ data: result.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
