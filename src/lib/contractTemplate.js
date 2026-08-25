import { escapeHtml } from './sanitize';

export function generateContractHTML(contract, options = {}) {
  const e = escapeHtml;
  const {
    showAdminSignature = false,
    adminName = 'Administrador',
    documentTitle = 'CONTRATO DE PRÉSTAMO Y PAGARÉ ELECTRÓNICO',
    subtitle = 'PrestamosApp — Documento Oficial',
  } = options;

  const signedDate = contract.signed_at
    ? new Date(contract.signed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const signedTime = contract.signed_at
    ? new Date(contract.signed_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : '';
  const clientName = contract.client_name || contract.clientEmail || 'N/A';
  const clientEmail = contract.client_email || contract.clientEmail || 'N/A';
  const purpose = contract.purpose || 'Préstamo personal';
  const contractId = contract.id || 'N/A';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Contrato ${contractId}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: #1e293b;
    font-size: 12.5px;
    line-height: 1.6;
    padding: 35px 45px;
    background: #fff;
  }

  /* === Header === */
  .doc-header {
    text-align: center;
    padding: 24px 0 20px;
    margin-bottom: 20px;
    position: relative;
  }
  .doc-header::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 3px;
    background: linear-gradient(90deg, #0f4c8a, #2563eb);
    border-radius: 2px;
  }
  .doc-header h1 {
    font-size: 18px;
    font-weight: 800;
    color: #0f4c8a;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .doc-header .sub {
    font-size: 11px;
    color: #94a3b8;
    letter-spacing: 1.5px;
    font-weight: 500;
  }

  /* === Meta bar === */
  .doc-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 10.5px;
    color: #64748b;
    margin-bottom: 22px;
  }
  .doc-meta strong { color: #334155; }

  /* === Section === */
  .section { margin-bottom: 20px; }
  .section-title {
    font-size: 11px;
    font-weight: 800;
    color: #0f4c8a;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #cbd5e1;
  }

  /* === Info cards === */
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .info-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 14px;
  }
  .info-card .label {
    font-size: 9.5px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 2px;
  }
  .info-card .value {
    font-size: 12.5px;
    font-weight: 600;
    color: #1e293b;
  }

  /* === Terms === */
  .terms-box {
    background: #fafbfc;
    border: 1px solid #e8ecf1;
    border-radius: 8px;
    padding: 18px 20px;
    font-size: 11.5px;
    line-height: 1.8;
    color: #374151;
  }
  .clause {
    display: flex;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid #f1f5f9;
  }
  .clause:last-child { border-bottom: none; }
  .clause-num {
    font-weight: 800;
    color: #0f4c8a;
    min-width: 18px;
    font-size: 12px;
  }
  .clause-title { font-weight: 700; color: #1e293b; }

  /* === Signatures === */
  .signatures {
    display: flex;
    justify-content: space-between;
    gap: 50px;
    margin-top: 36px;
  }
  .sig-box {
    flex: 1;
    text-align: center;
    padding: 20px 10px 0;
  }
  .sig-line {
    border-top: 1.5px solid #94a3b8;
    padding-top: 8px;
    position: relative;
  }
  .sig-label {
    font-size: 9px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .sig-name {
    font-size: 18px;
    font-weight: 700;
    font-family: 'Brush Script MT', 'Segoe Script', 'Comic Sans MS', cursive;
    color: #0f4c8a;
    margin-top: 6px;
  }
  .sig-date {
    font-size: 9.5px;
    color: #94a3b8;
    margin-top: 4px;
  }

  /* === Footer === */
  .doc-footer {
    margin-top: 30px;
    text-align: center;
    font-size: 9px;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    padding-top: 12px;
    line-height: 1.6;
    letter-spacing: 0.3px;
  }
  .doc-footer strong { color: #64748b; }

  @media print {
    body { padding: 0; }
    .doc-meta { background: #fff; }
    .info-card { background: #fff; }
    .terms-box { background: #fff; }
  }
</style>
</head>
<body>

  <div class="doc-header">
    <h1>${e(documentTitle)}</h1>
    <div class="sub">${e(subtitle)}</div>
  </div>

  <div class="doc-meta">
    <span>Contrato: <strong>${e(contractId)}</strong></span>
    <span>Firmado: <strong>${e(signedDate)}${signedTime ? ' — ' + e(signedTime) : ''}</strong></span>
  </div>

  <!-- Partes -->
  <div class="section">
    <div class="section-title">Partes del Contrato</div>
    <div class="info-grid">
      <div class="info-card">
        <div class="label">Prestamista</div>
        <div class="value">Administrador de PrestamosApp</div>
      </div>
      <div class="info-card">
        <div class="label">Prestatario</div>
        <div class="value">${e(clientName)}</div>
      </div>
      <div class="info-card">
        <div class="label">Correo Electrónico</div>
        <div class="value">${e(clientEmail)}</div>
      </div>
      <div class="info-card">
        <div class="label">Propósito del Préstamo</div>
        <div class="value">${e(purpose)}</div>
      </div>
    </div>
  </div>

  <!-- Términos -->
  <div class="section">
    <div class="section-title">Términos y Condiciones</div>
    <div class="terms-box">
      <div class="clause">
        <span class="clause-num">1.</span>
        <div><span class="clause-title">Oportunidad de Pago.</span> Las cuotas deberán ser canceladas en la fecha de vencimiento indicada en el cronograma de pagos.</div>
      </div>
      <div class="clause">
        <span class="clause-num">2.</span>
        <div><span class="clause-title">Mora.</span> En caso de retraso en el pago, se aplicará una penalidad del 5% sobre el monto de la cuota vencida por cada mes de atraso.</div>
      </div>
      <div class="clause">
        <span class="clause-num">3.</span>
        <div><span class="clause-title">Incumplimiento.</span> El incumplimiento reiterado (3 cuotas consecutivas sin pago) autoriza al Prestamista a iniciar acciones legales para la recuperación del monto adeudado.</div>
      </div>
      <div class="clause">
        <span class="clause-num">4.</span>
        <div><span class="clause-title">Pago Anticipado.</span> El Prestatario podrá realizar pagos anticipados sin penalidad alguna, reduciendo proporcionalmente el saldo pendiente.</div>
      </div>
      <div class="clause">
        <span class="clause-num">5.</span>
        <div><span class="clause-title">Uso de Datos.</span> Los datos personales proporcionados serán utilizados exclusivamente para los fines de este contrato y la gestión del préstamo.</div>
      </div>
      <div class="clause">
        <span class="clause-num">6.</span>
        <div><span class="clause-title">Firma Digital.</span> Las partes reconocen que la firma digital aquí asentada tiene plena validez legal de acuerdo con la legislación vigente.</div>
      </div>
    </div>
  </div>

  <!-- Firmas -->
  <div class="signatures">
    ${showAdminSignature ? `
    <div class="sig-box">
      <div class="sig-line">
        <div class="sig-label">Firma del Prestamista</div>
        <div class="sig-name">${e(adminName)}</div>
        <div class="sig-date">Administrador</div>
      </div>
    </div>` : ''}
    <div class="sig-box">
      <div class="sig-line">
        <div class="sig-label">Firma Digital del Prestatario</div>
        <div class="sig-name">${e(contract.signature) || e(clientName)}</div>
        <div class="sig-date">${signedDate}</div>
      </div>
    </div>
  </div>

  <div class="doc-footer">
    <strong>PrestamosApp</strong> — Documento generado electrónicamente el ${new Date().toLocaleDateString('es-ES')}<br>
    Este contrato tiene plena validez legal según la legislación vigente.
  </div>

</body>
</html>`;
}

export function openContractPrint(contract, options = {}) {
  const html = generateContractHTML(contract, options);
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}
