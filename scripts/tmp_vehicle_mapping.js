const { Pool } = require('pg');
require('dotenv/config');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const rows = await client.query('SELECT id, "vehicleId", title, status, start_reference_date FROM maintenance_schedules WHERE deleted_at IS NULL ORDER BY created_at LIMIT 20');
    console.log('schedule rows:', JSON.stringify(rows.rows, null, 2));
    const vehicleIds = [...new Set(rows.rows.map((r) => r.vehicleId).filter(Boolean))];
    console.log('distinct vehicleId values:', JSON.stringify(vehicleIds, null, 2));
    const idMatch = await client.query('SELECT id, plate_number FROM vehicles WHERE id = ANY($1)', [vehicleIds]);
    console.log('matches by id:', JSON.stringify(idMatch.rows, null, 2));
    const plateMatch = await client.query('SELECT id, plate_number FROM vehicles WHERE plate_number = ANY($1)', [vehicleIds]);
    console.log('matches by plate:', JSON.stringify(plateMatch.rows, null, 2));
  } finally {
    await client.end();
    await pool.end();
  }
})();
