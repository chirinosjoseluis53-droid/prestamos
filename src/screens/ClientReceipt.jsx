import React, { useState, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { escapeHtml } from '../lib/sanitize';
import { FileText, Download, Printer, CheckCircle2 } from 'lucide-react';

export default function ClientReceipt() {
  const { currentUser } = useAuth();
  const { loans, getKycProfile } = useData();
  const profile = getKycProfile(currentUser?.email);
  const receiptRef = useRef(null);

  const paidInstallments = useMemo(() => {
    const result = [];
    loans.forEach(loan => {
      if (loan.clientEmail !== currentUser?.email) return;
      (loan.installments || []).forEach(inst => {
        if (inst.status === 'paid') {
          result.push({
            ...inst,
            loanId: loan.id,
            loanAmount: loan.amount,
            interestRate: loan.interest_rate,
          });
        }
      });
    });
    return result.sort((a, b) => new Date(b.paid_date || 0) - new Date(a.paid_date || 0));
  }, [loans, currentUser]);

  const [selectedInst, setSelectedInst] = useState(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const generateReceiptNumber = (inst) => {
    const date = new Date(inst.paid_date || Date.now());
    const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    return `REC-${datePart}-${inst.number.toString().padStart(4, '0')}`;
  };

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;
    const safeContent = escapeHtml(content.textContent);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante de Pago</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; }
          .receipt { max-width: 500px; margin: 0 auto; border: 2px solid #e2e8f0; border-radius: 12px; padding: 32px; }
          .header { text-align: center; border-bottom: 2px solid #0f4c8a; padding-bottom: 20px; margin-bottom: 20px; }
          .company { font-size: 22px; font-weight: 800; color: #0f4c8a; letter-spacing: 1px; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
          .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
          .label { font-size: 12px; color: #64748b; font-weight: 600; }
          .value { font-size: 13px; color: #1e293b; font-weight: 700; text-align: right; }
          .amount-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0; }
          .amount-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
          .amount-value { font-size: 28px; font-weight: 900; color: #059669; }
          .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
          .receipt-number { font-size: 11px; color: #64748b; text-align: center; margin-bottom: 16px; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; background: #d1fae5; color: #065f46; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        </style>
      </head>
      <body><pre style="white-space:pre-wrap;font-family:inherit;">${safeContent}</pre></body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Comprobante Digital</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Genera comprobantes de tus pagos realizados</p>
      </div>

      {paidInstallments.length === 0 ? (
        <div className="premium-card" style={{ padding: '40px', textAlign: 'center' }}>
          <CheckCircle2 size={48} style={{ color: 'var(--text-secondary)', margin: '0 auto 16px auto', opacity: 0.4 }} />
          <h3 style={{ fontSize: '16px', color: 'var(--text)' }}>Sin pagos registrados</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>Aún no tienes cuotas pagadas para generar comprobantes.</p>
        </div>
      ) : (
        <div className={selectedInst ? 'grid-2col' : ''} style={{ gap: '24px' }}>
          {/* Installments List */}
          <div className="premium-card">
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Pagos Realizados</h3>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cuota</th>
                    <th>Monto</th>
                    <th>Fecha Pago</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paidInstallments.map((inst) => (
                    <tr key={`${inst.loanId}_${inst.id}`} style={selectedInst?.id === inst.id ? { backgroundColor: 'rgba(37,99,235,0.05)' } : {}}>
                      <td style={{ fontSize: '11px', fontWeight: 'bold' }}>#{inst.loanId.slice(-6)}</td>
                      <td style={{ fontWeight: 'bold' }}>{inst.number}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>${(inst.paid_amount || inst.amount).toFixed(2)}</td>
                      <td style={{ fontSize: '12px' }}>{formatDate(inst.paid_date)}</td>
                      <td>
                        <button className="btn btn-primary" onClick={() => setSelectedInst(inst)} style={{ padding: '4px 10px', fontSize: '11px' }}>
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Receipt Preview */}
          {selectedInst && (
            <div className="premium-card animate-fade" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Comprobante</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" onClick={handlePrint} style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Printer size={14} /> Imprimir
                  </button>
                  <button className="btn btn-secondary" onClick={() => setSelectedInst(null)} style={{ padding: '6px 12px', fontSize: '12px' }}>
                    Cerrar
                  </button>
                </div>
              </div>

              {/* Receipt */}
              <div ref={receiptRef} style={{ border: '2px solid var(--border)', borderRadius: '12px', padding: '28px', backgroundColor: 'var(--surface)' }}>
                <div style={{ textAlign: 'center', borderBottom: '2px solid #0f4c8a', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f4c8a', letterSpacing: '1px' }}>PrestamosApp</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Comprobante de Pago</div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Recibo N°: {generateReceiptNumber(selectedInst)}
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px', textAlign: 'center', margin: '0 0 20px 0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Monto Pagado</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#059669' }}>${(selectedInst.paid_amount || selectedInst.amount).toFixed(2)}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {[
                    { label: 'Cliente', value: profile?.fullName || currentUser?.email },
                    { label: 'Email', value: currentUser?.email },
                    { label: 'Préstamo ID', value: `#${selectedInst.loanId.slice(-6)}` },
                    { label: 'Cuota N°', value: `#${selectedInst.number}` },
                    { label: 'Monto Original', value: `$${selectedInst.amount.toFixed(2)}` },
                    { label: 'Fecha de Pago', value: formatDate(selectedInst.paid_date) },
                    { label: 'Estado', value: 'Pagado', highlight: true },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{item.label}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: item.highlight ? '#059669' : 'var(--text)' }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '20px', paddingTop: '16px', borderTop: '2px solid var(--border)' }}>
                  Documento generado electrónicamente — {formatDateTime(new Date().toISOString())}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
