import db from '../config/db.js';

/**
 * GET /api/assets/dashboard
 * Returns aggregated metrics: opening balance, net movement, assigned, expended, closing balance.
 * Query params: baseId, equipmentTypeId, startDate, endDate
 */
export const getDashboardMetrics = async (req, res) => {
  try {
    const { baseId, equipmentTypeId, startDate, endDate } = req.query;

    const params = [
      baseId            ? parseInt(baseId)            : null,
      equipmentTypeId   ? parseInt(equipmentTypeId)   : null,
      startDate         ? new Date(startDate)          : null,
      endDate           ? new Date(endDate)            : null,
    ];

    const query = `
      WITH
      -- Purchases (stock in)
      purchase_summary AS (
        SELECT COALESCE(SUM(quantity), 0)::int AS total_purchases
        FROM purchases
        WHERE ($1::int IS NULL OR base_id = $1)
          AND ($2::int IS NULL OR equipment_type_id = $2)
          AND ($3::timestamp IS NULL OR created_at >= $3)
          AND ($4::timestamp IS NULL OR created_at <= $4)
      ),

      -- Opening balance = everything purchased/transferred in BEFORE startDate
      opening_purchases AS (
        SELECT COALESCE(SUM(quantity), 0)::int AS qty
        FROM purchases
        WHERE ($1::int IS NULL OR base_id = $1)
          AND ($2::int IS NULL OR equipment_type_id = $2)
          AND ($3::timestamp IS NOT NULL AND created_at < $3)
      ),
      opening_transfers_in AS (
        SELECT COALESCE(SUM(quantity), 0)::int AS qty
        FROM transfers
        WHERE ($1::int IS NULL OR destination_base_id = $1)
          AND ($2::int IS NULL OR equipment_type_id = $2)
          AND status = 'COMPLETED'
          AND ($3::timestamp IS NOT NULL AND created_at < $3)
      ),
      opening_transfers_out AS (
        SELECT COALESCE(SUM(quantity), 0)::int AS qty
        FROM transfers
        WHERE ($1::int IS NULL OR source_base_id = $1)
          AND ($2::int IS NULL OR equipment_type_id = $2)
          AND status = 'COMPLETED'
          AND ($3::timestamp IS NOT NULL AND created_at < $3)
      ),
      opening_assigned AS (
        SELECT COALESCE(SUM(quantity), 0)::int AS qty
        FROM assignments
        WHERE ($1::int IS NULL OR base_id = $1)
          AND ($2::int IS NULL OR equipment_type_id = $2)
          AND ($3::timestamp IS NOT NULL AND created_at < $3)
      ),
      opening_expended AS (
        SELECT COALESCE(SUM(quantity), 0)::int AS qty
        FROM expenditures
        WHERE ($1::int IS NULL OR base_id = $1)
          AND ($2::int IS NULL OR equipment_type_id = $2)
          AND ($3::timestamp IS NOT NULL AND created_at < $3)
      ),

      -- Transfers in current period
      transfer_in_summary AS (
        SELECT COALESCE(SUM(quantity), 0)::int AS total_transfer_in
        FROM transfers
        WHERE ($1::int IS NULL OR destination_base_id = $1)
          AND ($2::int IS NULL OR equipment_type_id = $2)
          AND status = 'COMPLETED'
          AND ($3::timestamp IS NULL OR created_at >= $3)
          AND ($4::timestamp IS NULL OR created_at <= $4)
      ),
      transfer_out_summary AS (
        SELECT COALESCE(SUM(quantity), 0)::int AS total_transfer_out
        FROM transfers
        WHERE ($1::int IS NULL OR source_base_id = $1)
          AND ($2::int IS NULL OR equipment_type_id = $2)
          AND status = 'COMPLETED'
          AND ($3::timestamp IS NULL OR created_at >= $3)
          AND ($4::timestamp IS NULL OR created_at <= $4)
      ),

      -- Assignments in current period
      assignment_summary AS (
        SELECT COALESCE(SUM(quantity), 0)::int AS total_assigned
        FROM assignments
        WHERE ($1::int IS NULL OR base_id = $1)
          AND ($2::int IS NULL OR equipment_type_id = $2)
          AND ($3::timestamp IS NULL OR created_at >= $3)
          AND ($4::timestamp IS NULL OR created_at <= $4)
      ),

      -- Expenditures in current period
      expenditure_summary AS (
        SELECT COALESCE(SUM(quantity), 0)::int AS total_expended
        FROM expenditures
        WHERE ($1::int IS NULL OR base_id = $1)
          AND ($2::int IS NULL OR equipment_type_id = $2)
          AND ($3::timestamp IS NULL OR created_at >= $3)
          AND ($4::timestamp IS NULL OR created_at <= $4)
      )

      SELECT
        -- Opening balance only meaningful when a date range is set
        CASE WHEN $3::timestamp IS NOT NULL
          THEN (op.qty + oti.qty - oto.qty - oa.qty - oe.qty)
          ELSE 0
        END                                                             AS opening_balance,

        p.total_purchases,
        ti.total_transfer_in,
        to_s.total_transfer_out,
        (p.total_purchases + ti.total_transfer_in - to_s.total_transfer_out) AS net_movement,
        asn.total_assigned,
        exp.total_expended,

        -- Closing = opening + net_movement - assigned - expended
        CASE WHEN $3::timestamp IS NOT NULL
          THEN (op.qty + oti.qty - oto.qty - oa.qty - oe.qty)
               + (p.total_purchases + ti.total_transfer_in - to_s.total_transfer_out)
               - asn.total_assigned
               - exp.total_expended
          ELSE
               (p.total_purchases + ti.total_transfer_in - to_s.total_transfer_out)
               - asn.total_assigned
               - exp.total_expended
        END                                                             AS closing_balance

      FROM purchase_summary p,
           transfer_in_summary ti,
           transfer_out_summary to_s,
           assignment_summary asn,
           expenditure_summary exp,
           opening_purchases op,
           opening_transfers_in oti,
           opening_transfers_out oto,
           opening_assigned oa,
           opening_expended oe;
    `;

    const result = await db.query(query, params);
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Dashboard metrics error:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/assets/summary
 * Returns per-equipment-type inventory snapshot for a base.
 */
export const getInventorySummary = async (req, res) => {
  try {
    const { baseId } = req.query;

    const query = `
      SELECT
        et.id              AS equipment_type_id,
        et.name            AS equipment_name,
        et.category,
        et.unit,
        COALESCE(p.qty, 0)   AS purchased,
        COALESCE(ti.qty, 0)  AS transfers_in,
        COALESCE(to2.qty, 0) AS transfers_out,
        COALESCE(a.qty, 0)   AS assigned,
        COALESCE(e.qty, 0)   AS expended,
        (
          COALESCE(p.qty, 0) + COALESCE(ti.qty, 0)
          - COALESCE(to2.qty, 0) - COALESCE(a.qty, 0) - COALESCE(e.qty, 0)
        )                    AS current_balance
      FROM equipment_types et
      LEFT JOIN (
        SELECT equipment_type_id, SUM(quantity)::int AS qty FROM purchases
        WHERE ($1::int IS NULL OR base_id = $1) GROUP BY equipment_type_id
      ) p   ON et.id = p.equipment_type_id
      LEFT JOIN (
        SELECT equipment_type_id, SUM(quantity)::int AS qty FROM transfers
        WHERE ($1::int IS NULL OR destination_base_id = $1) AND status='COMPLETED' GROUP BY equipment_type_id
      ) ti  ON et.id = ti.equipment_type_id
      LEFT JOIN (
        SELECT equipment_type_id, SUM(quantity)::int AS qty FROM transfers
        WHERE ($1::int IS NULL OR source_base_id = $1) AND status='COMPLETED' GROUP BY equipment_type_id
      ) to2 ON et.id = to2.equipment_type_id
      LEFT JOIN (
        SELECT equipment_type_id, SUM(quantity)::int AS qty FROM assignments
        WHERE ($1::int IS NULL OR base_id = $1) GROUP BY equipment_type_id
      ) a   ON et.id = a.equipment_type_id
      LEFT JOIN (
        SELECT equipment_type_id, SUM(quantity)::int AS qty FROM expenditures
        WHERE ($1::int IS NULL OR base_id = $1) GROUP BY equipment_type_id
      ) e   ON et.id = e.equipment_type_id
      ORDER BY et.category, et.name;
    `;

    const result = await db.query(query, [baseId ? parseInt(baseId) : null]);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Inventory summary error:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/assets/bases  - list all bases
 */
export const getBases = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM bases ORDER BY name');
    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/assets/equipment-types  - list all equipment types
 */
export const getEquipmentTypes = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM equipment_types ORDER BY category, name');
    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/assets/audit-logs  (Admin only)
 */
export const getAuditLogs = async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const result = await db.query(
      `SELECT al.*, u.username
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
