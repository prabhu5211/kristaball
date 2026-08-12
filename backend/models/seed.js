/**
 * Database seed script - run after schema.sql
 * Usage: node models/seed.js
 */
import bcrypt from 'bcryptjs';
import db from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const SALT_ROUNDS = 12;

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Hash passwords
    const adminHash      = await bcrypt.hash('AdminPass123!',      SALT_ROUNDS);
    const commanderHash  = await bcrypt.hash('CommandPass123!',    SALT_ROUNDS);
    const logisticsHash  = await bcrypt.hash('LogisticsPass123!',  SALT_ROUNDS);

    // Fetch base IDs
    const basesRes = await db.query('SELECT id, name FROM bases ORDER BY id');
    const bases = basesRes.rows;
    if (bases.length === 0) {
      console.error('❌ No bases found. Did you run schema.sql first?');
      process.exit(1);
    }

    const [fortAlpha, fortBravo, fortCharlie] = bases;
    console.log('📍 Bases found:', bases.map(b => b.name).join(', '));

    // Insert users
    await db.query(`
      INSERT INTO users (username, password_hash, role, base_id) VALUES
        ($1, $2, 'ADMIN',             NULL),
        ($3, $4, 'BASE_COMMANDER',    $5),
        ($6, $7, 'LOGISTICS_OFFICER', $8)
      ON CONFLICT (username) DO NOTHING
    `, [
      'admin_user',        adminHash,
      'commander_alpha',   commanderHash,  fortAlpha.id,
      'logistics_officer', logisticsHash,  fortAlpha.id,
    ]);
    console.log('👤 Users seeded');

    // Fetch equipment type IDs
    const eqRes = await db.query('SELECT id, name FROM equipment_types ORDER BY id');
    const eq = {};
    eqRes.rows.forEach(r => { eq[r.name] = r.id; });
    console.log('🔫 Equipment types found:', Object.keys(eq).join(', '));

    // Seed purchases
    const adminUser = (await db.query("SELECT id FROM users WHERE username='admin_user'")).rows[0];

    const purchases = [
      [fortAlpha.id,   eq['M4 Carbine'],   50, adminUser.id],
      [fortAlpha.id,   eq['5.56mm Ammo'],  5000, adminUser.id],
      [fortAlpha.id,   eq['Humvee'],       5, adminUser.id],
      [fortBravo.id,   eq['M9 Pistol'],    30, adminUser.id],
      [fortBravo.id,   eq['9mm Ammo'],     3000, adminUser.id],
      [fortBravo.id,   eq['MRAP'],         3, adminUser.id],
      [fortCharlie.id, eq['M249 SAW'],     10, adminUser.id],
      [fortCharlie.id, eq['40mm Grenade'], 200, adminUser.id],
    ];

    for (const [base_id, equipment_type_id, quantity, created_by] of purchases) {
      await db.query(
        `INSERT INTO purchases (base_id, equipment_type_id, quantity, created_by) VALUES ($1, $2, $3, $4)`,
        [base_id, equipment_type_id, quantity, created_by]
      );
    }
    console.log('📦 Purchases seeded');

    // Seed a sample transfer
    await db.query(
      `INSERT INTO transfers (source_base_id, destination_base_id, equipment_type_id, quantity, initiated_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [fortAlpha.id, fortBravo.id, eq['M4 Carbine'], 10, adminUser.id, 'Reallocation for training exercise']
    );
    console.log('🔄 Transfers seeded');

    // Seed a sample assignment
    await db.query(
      `INSERT INTO assignments (base_id, equipment_type_id, quantity, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [fortAlpha.id, eq['M4 Carbine'], 20, '1st Infantry Platoon', adminUser.id]
    );
    console.log('📋 Assignments seeded');

    // Seed a sample expenditure
    await db.query(
      `INSERT INTO expenditures (base_id, equipment_type_id, quantity, reason, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [fortAlpha.id, eq['5.56mm Ammo'], 500, 'Live-fire training exercise', adminUser.id]
    );
    console.log('💥 Expenditures seeded');

    // Seed audit logs
    await db.query(
      `INSERT INTO audit_logs (user_id, action, details) VALUES ($1, 'LOGIN', 'Initial admin seed login')`,
      [adminUser.id]
    );
    console.log('📝 Audit logs seeded');

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('  Admin:             admin_user      / AdminPass123!');
    console.log('  Base Commander:    commander_alpha / CommandPass123!');
    console.log('  Logistics Officer: logistics_officer / LogisticsPass123!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
