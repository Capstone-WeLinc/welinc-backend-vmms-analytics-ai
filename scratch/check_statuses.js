const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://welinc_user:welinc_pass@localhost:5432/welinc_db' });
const now = new Date();

pool.query(
  `SELECT id, status, start_reference_date,
          (start_reference_date - NOW()) AS diff_from_now
   FROM maintenance_schedules
   WHERE deleted_at IS NULL AND status = 'PENDING'
   ORDER BY start_reference_date`
).then(r => {
  console.log('NOW:', now.toISOString());
  console.log('PENDING records:', r.rows.length);
  r.rows.forEach(row => {
    const diff = row.start_reference_date
      ? Math.round((new Date(row.start_reference_date) - now) / (1000 * 60 * 60 * 24))
      : null;
    console.log(`  id=${row.id.slice(0,8)} | start_reference_date=${row.start_reference_date} | days_from_now=${diff}`);
  });
  pool.end();
}).catch(e => { console.error(e.message); pool.end(); });
