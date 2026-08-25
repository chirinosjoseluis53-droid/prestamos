import { escapeHtml } from './sanitize';

export function generateReportHTML({ title, subtitle, clientInfo, stats, tableHeaders, tableRows, footer }) {
  const e = escapeHtml;
  const date = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const statsHTML = stats && stats.length > 0 ? `
    <div class="stats-grid">
      ${stats.map(s => `
        <div class="stat-card" style="border-left: 4px solid ${e(s.color || '#0f4c8a')}">
          <div class="stat-label">${e(s.label)}</div>
          <div class="stat-value" style="color: ${e(s.color || '#0f4c8a')}">${e(s.value)}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const clientInfoHTML = clientInfo ? `
    <div class="client-info">
      <div class="info-row"><span class="info-label">Cliente:</span> <span class="info-value">${e(clientInfo.name) || 'N/A'}</span></div>
      ${clientInfo.email ? `<div class="info-row"><span class="info-label">Correo:</span> <span class="info-value">${e(clientInfo.email)}</span></div>` : ''}
      ${clientInfo.id ? `<div class="info-row"><span class="info-label">Documento:</span> <span class="info-value">${e(clientInfo.id)}</span></div>` : ''}
      ${clientInfo.phone ? `<div class="info-row"><span class="info-label">Teléfono:</span> <span class="info-value">${e(clientInfo.phone)}</span></div>` : ''}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${e(title)} - PrestamosApp</title>
<style>
  @page { size: A4 landscape; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: #1e293b;
    font-size: 11px;
    line-height: 1.5;
    padding: 25px 35px;
    background: #fff;
  }

  /* Header */
  .report-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 3px solid #0f4c8a;
  }
  .report-header-left h1 {
    font-size: 20px;
    font-weight: 800;
    color: #0f4c8a;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .report-header-left .subtitle {
    font-size: 11px;
    color: #64748b;
    font-weight: 500;
  }
  .report-header-right {
    text-align: right;
    font-size: 10px;
    color: #64748b;
  }
  .report-header-right .date { font-weight: 700; color: #334155; }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }
  .stat-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px 14px;
  }
  .stat-label {
    font-size: 9px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 4px;
  }
  .stat-value {
    font-size: 18px;
    font-weight: 800;
  }

  /* Client Info */
  .client-info {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px 24px;
  }
  .info-row { font-size: 11px; }
  .info-label { font-weight: 700; color: #64748b; }
  .info-value { font-weight: 600; color: #1e293b; }

  /* Table */
  .table-container {
    margin-top: 8px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
  }
  thead th {
    background: #0f4c8a;
    color: #fff;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 9.5px;
    padding: 10px 12px;
    text-align: left;
    white-space: nowrap;
  }
  thead th:first-child { border-radius: 6px 0 0 0; }
  thead th:last-child { border-radius: 0 6px 0 0; }
  tbody tr { border-bottom: 1px solid #f1f5f9; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody tr:hover { background: #eff6ff; }
  tbody td {
    padding: 9px 12px;
    vertical-align: middle;
  }

  /* Badges */
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .badge-approved { background: #d1fae5; color: #065f46; }
  .badge-pending { background: #fef3c7; color: #92400e; }
  .badge-rejected { background: #fee2e2; color: #991b1b; }
  .badge-paid { background: #dbeafe; color: #1e40af; }

  /* Footer */
  .report-footer {
    margin-top: 24px;
    padding-top: 12px;
    border-top: 2px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 9px;
    color: #94a3b8;
  }
  .report-footer strong { color: #64748b; }

  @media print {
    body { padding: 0; }
    .stat-card { background: #fff; }
    .client-info { background: #fff; }
    tbody tr:nth-child(even) { background: #fff; }
    tbody tr:hover { background: #fff; }
    @page { size: A4 landscape; margin: 12mm; }
  }
</style>
</head>
<body>

  <div class="report-header">
    <div class="report-header-left">
      <h1>${e(title)}</h1>
      <div class="subtitle">${e(subtitle) || 'PrestamosApp — Documento Oficial'}</div>
    </div>
    <div class="report-header-right">
      <div>Generado el <span class="date">${date}</span></div>
      <div>${time}</div>
    </div>
  </div>

  ${clientInfoHTML}
  ${statsHTML}

  <div class="table-container">
    <table>
      <thead>
        <tr>
          ${tableHeaders.map(h => `<th>${e(h)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${tableRows.map(row => `
          <tr>
            ${row.map(cell => {
              if (cell && typeof cell === 'object' && cell.html) {
                const safeStyle = cell.style ? ` style="${e(cell.style)}"` : '';
                return `<td${safeStyle}>${cell.html}</td>`;
              }
              return `<td>${e(cell)}</td>`;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="report-footer">
    <div><strong>PrestamosApp</strong> — Documento generado electrónicamente</div>
    <div>${e(footer) || 'Este reporte tiene fines informativos y de gestión interna.'}</div>
  </div>

</body>
</html>`;
}

export function openReportPrint(html) {
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}

export function getStatusBadge(status) {
  const map = {
    approved: { label: 'Aprobado', class: 'badge-approved' },
    pending: { label: 'Pendiente', class: 'badge-pending' },
    rejected: { label: 'Rechazado', class: 'badge-rejected' },
    paid: { label: 'Pagado', class: 'badge-paid' },
    active: { label: 'Activo', class: 'badge-approved' },
    blocked: { label: 'Bloqueado', class: 'badge-rejected' },
  };
  return map[status] || { label: status, class: 'badge-pending' };
}
