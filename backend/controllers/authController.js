import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { auditLog } from '../middlewares/loggerMiddleware.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    // Fetch user with base info
    const result = await db.query(
      `SELECT u.id, u.username, u.password_hash, u.role, u.base_id,
              b.name AS base_name
       FROM users u
       LEFT JOIN bases b ON u.base_id = b.id
       WHERE u.username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = result.rows[0];

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const payload = {
      id:       user.id,
      username: user.username,
      role:     user.role,
      baseId:   user.base_id,
      baseName: user.base_name,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });

    // Audit log
    await auditLog({
      userId:    user.id,
      action:    'LOGIN',
      details:   `User "${username}" logged in successfully.`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: payload,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * GET /api/auth/me
 * Returns the current authenticated user's info.
 */
export const getMe = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.role, u.base_id, b.name AS base_name, u.created_at
       FROM users u
       LEFT JOIN bases b ON u.base_id = b.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * POST /api/auth/register  (Admin only)
 * Body: { username, password, role, baseId }
 */
export const register = async (req, res) => {
  try {
    const { username, password, role, baseId } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Username, password, and role are required.' });
    }

    const validRoles = ['ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${validRoles.join(', ')}` });
    }

    // Check uniqueness
    const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const insertRes = await db.query(
      `INSERT INTO users (username, password_hash, role, base_id)
       VALUES ($1, $2, $3, $4) RETURNING id, username, role, base_id`,
      [username, passwordHash, role, baseId || null]
    );

    const newUser = insertRes.rows[0];

    await auditLog({
      userId:   req.user.id,
      action:   'USER_CREATED',
      entityId: newUser.id,
      details:  `Admin "${req.user.username}" created user "${username}" with role "${role}".`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ message: 'User created successfully.', user: newUser });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * GET /api/auth/users  (Admin only)
 */
export const getUsers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.role, u.base_id, b.name AS base_name, u.created_at
       FROM users u
       LEFT JOIN bases b ON u.base_id = b.id
       ORDER BY u.created_at DESC`
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('GetUsers error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
