import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { DollarSign, Upload, Landmark, Smartphone, Mail, AlertTriangle, Eye, CheckCircle, Copy, Check } from 'lucide-react';

const PAYMENT_ICONS = {
  zelle: { icon: '⚡', color: '#6C3FE8', label: 'Zelle' },
  pagoMovil: { icon: '📱', color: 'var(--primary)', label: 'Pago Móvil' },
  transfer: { icon: '🏦', color: '#D4AF37', label: 'Transferencia' },
};

export default function ClientPay() {
  const { currentUser } = useAuth();
  const { loans, paymentSettings, submitInstallmentPayment } = useData();

  const [selectedInst, setSelectedInst] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  const activeLoan = loans.find(l => {
    if (l.status !== 'approved') return false;
    const isCompleted = l.installments && l.installments.length > 0 && l.installments.every(i => i.status === 'paid');
    return !isCompleted;
  });

  const availableMethods = [
    paymentSettings?.zelle?.enabled ? 'zelle' : null,
    paymentSettings?.pagoMovil?.enabled ? 'pagoMovil' : null,
    paymentSettings?.transfer?.enabled ? 'transfer' : null,
  ].filter(Boolean);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setProofPreview(event.target.result);
    reader.readAsDataURL(file);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!amountPaid || !proofFile || !selectedMethod) {
      alert('Selecciona un método de pago, especifica el monto y sube el comprobante.');
      return;
    }
    setLoading(true);
    try {
      await submitInstallmentPayment(activeLoan.id, selectedInst.id, proofFile, parseFloat(amountPaid), selectedMethod);
      alert('Reporte de pago enviado con éxito. El administrador lo verificará.');
      setSelectedInst(null);
      setSelectedMethod(null);
      setAmountPaid('');
      setProofFile(null);
      setProofPreview(null);
    } catch (error) {
      alert('Error enviando pago: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid': return <span className="badge badge-paid">Pagado</span>;
      case 'submitted': return <span className="badge badge-pending">En revisión</span>;
      case 'rejected': return <span className="badge badge-rejected">Rechazado</span>;
      default: return <span className="badge badge-pending">Pendiente</span>;
    }
  };

  const renderMethodDetails = (method) => {
    const settings = paymentSettings[method];
    const info = PAYMENT_ICONS[method];
    if (!settings || !settings.enabled) return null;

    let details = [];
    if (method === 'zelle') {
      details = [
        { label: 'Correo', value: settings.email, id: `${method}-email` },
        { label: 'Titular', value: settings.holderName, id: `${method}-holder` },
        ...(settings.phone ? [{ label: 'Teléfono', value: settings.phone, id: `${method}-phone` }] : []),
      ];
    } else if (method === 'pagoMovil') {
      details = [
        { label: 'Banco', value: settings.bank, id: `${method}-bank` },
        { label: 'Teléfono', value: settings.phone, id: `${method}-phone` },
        { label: 'RIF/Cédula', value: settings.rif, id: `${method}-rif` },
      ];
    } else if (method === 'transfer') {
      details = [
        { label: 'Banco', value: settings.bank, id: `${method}-bank` },
        { label: 'Cuenta', value: settings.account, id: `${method}-account` },
        { label: 'Titular', value: settings.owner, id: `${method}-owner` },
      ];
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {details.map(d => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '8px', backgroundColor: 'var(--surface-light)', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{d.label}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{d.value}</div>
            </div>
            <button onClick={() => handleCopy(d.value, d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: copied === d.id ? '#10B981' : 'var(--text-secondary)' }}>
              {copied === d.id ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Pasarela de Pagos</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Reporta tus abonos y revisa el estado de tus cuotas</p>
      </div>

      {!activeLoan ? (
        <div className="premium-card" style={{ padding: '40px', textAlign: 'center' }}>
          <CheckCircle size={48} style={{ color: 'var(--primary)', margin: '0 auto 16px auto' }} />
          <h3>Sin cuotas pendientes</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
            No tienes préstamos aprobados activos que requieran pagos en este momento.
          </p>
        </div>
      ) : (
        <div className={selectedInst ? 'grid-2col' : ''} style={{ gap: '24px' }}>
          {/* Installments List */}
          <div className="premium-card">
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Cronograma de Cuotas</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Préstamo: <strong>${activeLoan.amount.toFixed(2)}</strong>
            </p>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Vence</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {activeLoan.installments?.map((inst) => (
                    <tr key={inst.id} style={selectedInst?.id === inst.id ? { backgroundColor: 'rgba(37,99,235,0.05)' } : {}}>
                      <td style={{ fontWeight: 'bold' }}>{inst.number}</td>
                      <td style={{ fontSize: '12px' }}>{formatDate(inst.due_date)}</td>
                      <td style={{ fontWeight: 'bold' }}>${inst.amount.toFixed(2)}</td>
                      <td>{getStatusBadge(inst.status)}</td>
                      <td>
                        {inst.status === 'paid' ? (
                          <CheckCircle size={14} style={{ color: '#10B981' }} />
                        ) : inst.status === 'submitted' ? (
                          <button className="btn btn-secondary" onClick={() => alert('Tu comprobante está en evaluación.')} style={{ padding: '4px 10px', fontSize: '11px' }}>
                            <Eye size={11} /> Ver
                          </button>
                        ) : (
                          <button className="btn btn-primary" onClick={() => { setSelectedInst(inst); setAmountPaid(inst.amount.toString()); setProofFile(null); setProofPreview(null); setSelectedMethod(null); }} style={{ padding: '4px 10px', fontSize: '11px' }}>
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Panel */}
          {selectedInst && (
            <div className="premium-card animate-fade" style={{ borderColor: 'var(--primary)' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>Pagar Cuota #{selectedInst.number}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Monto: <strong>${selectedInst.amount.toFixed(2)}</strong></p>

              {/* Payment Methods Selector */}
              {availableMethods.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Método de Pago</label>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${availableMethods.length}, 1fr)`, gap: '8px' }}>
                    {availableMethods.map(method => {
                      const info = PAYMENT_ICONS[method];
                      const isSelected = selectedMethod === method;
                      return (
                        <button key={method} onClick={() => setSelectedMethod(method)} style={{
                          padding: '12px 8px', borderRadius: '12px', border: `2px solid ${isSelected ? info.color : 'var(--border)'}`,
                          backgroundColor: isSelected ? `${info.color}10` : 'var(--surface-light)',
                          cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                        }}>
                          <div style={{ fontSize: '24px', marginBottom: '4px' }}>{info.icon}</div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: isSelected ? info.color : 'var(--text)' }}>{info.label}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Method Details */}
                  {selectedMethod && (
                    <div style={{ marginTop: '8px', padding: '12px', borderRadius: '12px', border: `1px solid ${PAYMENT_ICONS[selectedMethod].color}30`, backgroundColor: `${PAYMENT_ICONS[selectedMethod].color}05` }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: PAYMENT_ICONS[selectedMethod].color, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Datos para pagar con {PAYMENT_ICONS[selectedMethod].label}
                      </div>
                      {renderMethodDetails(selectedMethod)}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', padding: '12px', color: 'var(--warning)', fontSize: '12px', marginBottom: '16px', backgroundColor: 'rgba(243,156,18,0.08)', borderRadius: '10px', border: '1px solid rgba(243,156,18,0.2)' }}>
                  <AlertTriangle size={16} />
                  <span>No hay métodos de pago configurados. Contacta al administrador.</span>
                </div>
              )}

              {/* Upload Form */}
              <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Monto Abonado ($)</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input type="number" step="0.01" className="form-control" placeholder="Monto transferido" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} style={{ paddingLeft: '36px' }} required />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Comprobante de Pago</label>
                  <div className="file-upload-box" onClick={() => document.getElementById('payment-proof-input').click()} style={{ minHeight: '80px' }}>
                    {proofPreview ? (
                      <img src={proofPreview} className="file-upload-preview" alt="Comprobante" style={{ maxHeight: '80px' }} />
                    ) : (
                      <>
                        <Upload size={24} style={{ color: 'var(--text-secondary)' }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sube el capture aquí</span>
                      </>
                    )}
                    <input type="file" id="payment-proof-input" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} required />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setSelectedInst(null); setSelectedMethod(null); }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1.5 }} disabled={loading || !selectedMethod}>
                    {loading ? 'ENVIANDO...' : 'ENVIAR COMPROBANTE'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
