import http from 'node:http';
import { openDataMart, initializeDataMart } from './duckdb';

const PORT = Number(process.env['DUCKDB_STUDIO_PORT'] ?? 5556);

function renderHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DuckDB Studio - VMMS Analytics DataMart</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
      --card-bg: rgba(30, 41, 59, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent-primary: #6366f1;
      --accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      --accent-hover: #4f46e5;
      --table-header: rgba(15, 23, 42, 0.8);
      --table-row-even: rgba(30, 41, 59, 0.4);
      --table-row-hover: rgba(99, 102, 241, 0.15);
      --badge-bg: rgba(99, 102, 241, 0.2);
      --badge-text: #818cf8;
      --danger: #ef4444;
      --success: #10b981;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-gradient);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    header {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--card-border);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-icon {
      width: 36px;
      height: 36px;
      background: var(--accent-gradient);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.2rem;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }

    .brand-title {
      font-size: 1.25rem;
      font-weight: 700;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-tag {
      font-size: 0.75rem;
      background: var(--badge-bg);
      color: var(--badge-text);
      padding: 0.25rem 0.6rem;
      border-radius: 20px;
      font-weight: 600;
    }

    .main-layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      flex: 1;
      height: calc(100vh - 69px);
      overflow: hidden;
    }

    sidebar {
      background: rgba(15, 23, 42, 0.6);
      border-right: 1px solid var(--card-border);
      padding: 1.5rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      overflow-y: auto;
    }

    .sidebar-section-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
      padding-left: 0.5rem;
    }

    .table-nav {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .table-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      font-family: inherit;
      font-size: 0.9rem;
      font-weight: 500;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s ease;
    }

    .table-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-main);
    }

    .table-btn.active {
      background: var(--accent-gradient);
      color: #ffffff;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }

    .table-count-badge {
      background: rgba(0, 0, 0, 0.3);
      padding: 0.15rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
    }

    content {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      overflow-y: auto;
    }

    .panel {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
      backdrop-filter: blur(10px);
    }

    .sql-editor-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .sql-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .sql-input {
      width: 100%;
      height: 80px;
      background: #090d16;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      color: #38bdf8;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
      padding: 0.85rem;
      resize: vertical;
      outline: none;
    }

    .sql-input:focus {
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
    }

    .btn {
      background: var(--accent-gradient);
      border: none;
      color: white;
      padding: 0.6rem 1.2rem;
      border-radius: 8px;
      font-family: inherit;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
    }

    .btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-main);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .data-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .data-title {
      font-size: 1.1rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .table-wrapper {
      overflow-x: auto;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      max-height: 520px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      text-align: left;
    }

    th {
      background: var(--table-header);
      color: var(--text-muted);
      font-weight: 600;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--card-border);
      position: sticky;
      top: 0;
      backdrop-filter: blur(8px);
      white-space: nowrap;
    }

    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--card-border);
      white-space: nowrap;
    }

    tr:nth-child(even) {
      background: var(--table-row-even);
    }

    tr:hover {
      background: var(--table-row-hover);
    }

    .search-box {
      background: #090d16;
      border: 1px solid var(--card-border);
      border-radius: 6px;
      color: var(--text-main);
      padding: 0.45rem 0.75rem;
      font-family: inherit;
      font-size: 0.85rem;
      width: 240px;
    }

    .status-badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-pass { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .badge-fail { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .badge-null { color: #64748b; font-style: italic; }

    .error-box {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      padding: 0.75rem;
      border-radius: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      margin-top: 0.5rem;
      display: none;
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="brand-icon">🦆</div>
      <div class="brand-title">DuckDB Studio</div>
      <div class="brand-tag">VMMS DataMart</div>
    </div>
    <div>
      <button class="btn btn-secondary" onclick="refreshData()">🔄 Refresh</button>
    </div>
  </header>

  <div class="main-layout">
    <sidebar>
      <div>
        <div class="sidebar-section-title">DataMart Tables</div>
        <div class="table-nav" id="tableNav">
          <!-- Populated by JS -->
        </div>
      </div>
    </sidebar>

    <content>
      <div class="panel sql-editor-container">
        <div class="sql-header">
          <span style="font-weight: 600; font-size: 0.95rem;">⚡ Custom SQL Console</span>
          <button class="btn" onclick="executeCustomSql()">Execute Query</button>
        </div>
        <textarea id="sqlInput" class="sql-input" placeholder="SELECT * FROM vehicle_summary LIMIT 100;"></textarea>
        <div id="errorBox" class="error-box"></div>
      </div>

      <div class="panel" style="flex: 1; display: flex; flex-direction: column;">
        <div class="data-toolbar">
          <div class="data-title">
            <span id="currentTableName">vehicle_summary</span>
            <span id="rowCountPill" class="table-count-badge" style="background: var(--badge-bg); color: var(--badge-text);">0 rows</span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" id="searchInput" class="search-box" placeholder="Filter rows..." oninput="filterTable()">
            <button class="btn btn-secondary" onclick="exportJson()">Export JSON</button>
          </div>
        </div>

        <div class="table-wrapper" style="flex: 1;">
          <table id="dataTable">
            <thead id="tableHead"></thead>
            <tbody id="tableBody"></tbody>
          </table>
        </div>
      </div>
    </content>
  </div>

  <script>
    let currentData = [];
    let currentColumns = [];
    let activeTable = 'vehicle_summary';

    async function loadTables() {
      try {
        const res = await fetch('/api/tables');
        const tables = await res.json();
        const nav = document.getElementById('tableNav');
        nav.innerHTML = '';

        tables.forEach(t => {
          const btn = document.createElement('button');
          btn.className = 'table-btn' + (t.name === activeTable ? ' active' : '');
          btn.onclick = () => selectTable(t.name);
          btn.innerHTML = \`
            <span>\${t.name}</span>
            <span class="table-count-badge">\${t.rowCount}</span>
          \`;
          nav.appendChild(btn);
        });
      } catch (err) {
        console.error('Failed to fetch tables:', err);
      }
    }

    async function selectTable(tableName) {
      activeTable = tableName;
      document.getElementById('currentTableName').textContent = tableName;
      document.getElementById('sqlInput').value = \`SELECT * FROM \${tableName};\`;
      loadTables();
      await fetchTableData(tableName);
    }

    async function fetchTableData(tableName) {
      const errorBox = document.getElementById('errorBox');
      errorBox.style.display = 'none';
      try {
        const res = await fetch(\`/api/table/\${tableName}\`);
        const json = await res.json();
        if (json.error) {
          showError(json.error);
          return;
        }
        renderTable(json.columns, json.rows);
      } catch (err) {
        showError(err.message);
      }
    }

    async function executeCustomSql() {
      const sql = document.getElementById('sqlInput').value.trim();
      if (!sql) return;
      const errorBox = document.getElementById('errorBox');
      errorBox.style.display = 'none';
      try {
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: sql })
        });
        const json = await res.json();
        if (json.error) {
          showError(json.error);
          return;
        }
        document.getElementById('currentTableName').textContent = 'Custom Query Result';
        renderTable(json.columns, json.rows);
      } catch (err) {
        showError(err.message);
      }
    }

    function renderTable(cols, rows) {
      currentColumns = cols;
      currentData = rows;
      document.getElementById('rowCountPill').textContent = \`\${rows.length} rows\`;

      const thead = document.getElementById('tableHead');
      const tbody = document.getElementById('tableBody');

      thead.innerHTML = '<tr>' + cols.map(c => \`<th>\${c}</th>\`).join('') + '</tr>';

      if (rows.length === 0) {
        tbody.innerHTML = \`<tr><td colSpan="\${cols.length}" style="text-align: center; color: var(--text-muted); padding: 2rem;">No rows found.</td></tr>\`;
        return;
      }

      displayRows(rows);
    }

    function displayRows(rows) {
      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = rows.map(r => {
        return '<tr>' + currentColumns.map(col => {
          const val = r[col];
          if (val === null || val === undefined) return '<td class="badge-null">null</td>';
          if (typeof val === 'object') return \`<td>\${JSON.stringify(val)}</td>\`;
          return \`<td>\${val}</td>\`;
        }).join('') + '</tr>';
      }).join('');
    }

    function filterTable() {
      const query = document.getElementById('searchInput').value.toLowerCase();
      if (!query) {
        displayRows(currentData);
        return;
      }
      const filtered = currentData.filter(row => {
        return Object.values(row).some(v => String(v).toLowerCase().includes(query));
      });
      displayRows(filtered);
    }

    function showError(msg) {
      const errorBox = document.getElementById('errorBox');
      errorBox.textContent = 'SQL Error: ' + msg;
      errorBox.style.display = 'block';
    }

    function exportJson() {
      const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`\${activeTable}.json\`;
      a.click();
    }

    function refreshData() {
      loadTables();
      fetchTableData(activeTable);
    }

    // Initial Load
    loadTables();
    fetchTableData(activeTable);
  </script>
</body>
</html>`;
}

async function startStudioServer() {
  const duckdb = await openDataMart();
  await initializeDataMart(duckdb);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    
    // API: List tables
    if (req.method === 'GET' && url.pathname === '/api/tables') {
      try {
        const tableNames = [
          'vehicle_summary',
          'maintenance_schedule_summary',
          'analytics_snapshot',
          'maintenance_status_summary',
          'maintenance_monthly_trend',
          'vehicle_maintenance_kpi',
          'maintenance_alerts',
        ];
        const result = [];
        for (const name of tableNames) {
          const reader = await duckdb.runAndReadAll(`SELECT COUNT(*) AS count FROM ${name}`);
          const row = reader.getRowObjectsJS()[0] as { count: bigint | number };
          result.push({ name, rowCount: Number(row.count) });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // API: Get Table Data
    if (req.method === 'GET' && url.pathname.startsWith('/api/table/')) {
      const tableName = decodeURIComponent(url.pathname.replace('/api/table/', ''));
      try {
        const reader = await duckdb.runAndReadAll(`SELECT * FROM "${tableName}" LIMIT 500`);
        const rows = reader.getRowObjectsJS();
        const columns = reader.columnNames();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ columns, rows }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // API: Execute Custom Query
    if (req.method === 'POST' && url.pathname === '/api/query') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { query } = JSON.parse(body);
          const reader = await duckdb.runAndReadAll(query);
          const rows = reader.getRowObjectsJS();
          const columns = reader.columnNames();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ columns, rows }));
        } catch (err: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // Default HTML UI
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(renderHtml());
  });

  server.listen(PORT, () => {
    console.log(`🦆 DuckDB Studio is running at http://localhost:${PORT}`);
  });
}

startStudioServer().catch(err => {
  console.error('Failed to start DuckDB Studio:', err);
  process.exit(1);
});
