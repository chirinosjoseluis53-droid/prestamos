import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, User, Image as ImageIcon, DollarSign, Ban, ShieldCheck, ChevronRight } from 'lucide-react';

export default function AdminPaymentsVerification() {
  const { getPendingPayments, verifyInstallmentPayment, adminPayInstallment, getKycProfile, loans, refreshLoans } = useData();
  const { currentUser } = useAuth();
  
  const [approvalAmounts, setApprovalAmounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(null);

  useEffect(() => {
    refreshLoans();
  }, []);

  const pending = getPendingPayments();

  const handleVerify = async (loanId, instId, approved, claimedAmount) => {
    const finalAmount = approvalAmounts[instId] !== undefined 
      ? approvalAmounts[instId] 
      : claimedAmount;

    const action = approved ? 'aprobar un abono de $' + finalAmount : 'rechazar';
    if (window.confirm(`¿Deseas ${action} este comprobante de pago?`)) {
      setLoading(true);
      try {
        await verifyInstallmentPayment(loanId, instId, approved, finalAmount, currentUser?.name);
        alert('Operación procesada correctamente.');
        refreshLoans();
      } catch (e) {
        alert('Error al verificar: ' + e.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleManualPay = async (loanId, instId, clientEmail) => {
    if (window.confirm(`¿Registrar pago manual para el cliente ${clientEmail}?`)) {
      setLoading(true);
      try {
        await adminPayInstallment(loanId, instId);
        alert('Pago manual registrado.');
        refreshLoans();
      } catch (e) {
        alert('Error: ' + e.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAmountChange = (instId, value) => {
    setApprovalAmounts(prev => ({
      ...prev,
      [instId]: value
    }));
  };

  return (
    <div className="admin-payments-verification animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Revisa y aprueba comprobantes de pago subidos por tus clientes.
        </p>
      </div>

      {pending.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <CheckCircle2 size={48} style={{ color: 'var(--success)', marginBottom: '16px', display: 'inline-block' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', margin: '0 0 6px 0' }}>¡Todo al día!</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No hay pagos pendientes de verificación.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: '20px' }}>
          {pending.map(payment => {
            const profile = getKycProfile(payment.clientEmail);
            const initialAmount = (payment.claimedAmount || payment.claimed_amount || payment.amount).toString();
            const currentInputValue = approvalAmounts[payment.id] !== undefined ? approvalAmounts[payment.id] : initialAmount;

            return (
              <div key={payment.id} className="premium-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border)' }}>
                {/* Client header info */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {profile?.profilePhoto ? (
                    <img src={profile.profilePhoto} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} alt="Avatar" />
                  ) : (
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(15,164,108,0.1)', display: 'flex', alignItems: 'center', justify: 'center', color: 'var(--primary)', fontWeight: 'bold' }}>
                      {(profile?.fullName || 'C')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>{profile?.fullName || payment.clientEmail}</h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Cuota #{payment.number} • ${payment.amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Declared amount Alert */}
                {(payment.claimedAmount || payment.claimed_amount) && (
                  <div style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--warning)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <DollarSign size={16} /> Declaró: ${parseFloat(payment.claimedAmount || payment.claimed_amount).toFixed(2)}
                  </div>
                )}

                {/* Receipt photo */}
                {(payment.proofPhoto || payment.payment_proof_url) ? (
                  <div style={{ position: 'relative', height: '180px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setEnlargedImage(payment.proofPhoto || payment.payment_proof_url)}>
                    <img src={payment.proofPhoto || payment.payment_proof_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Comprobante" />
                    <div style={{ position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ImageIcon size={12} /> Ampliar
                    </div>
                  </div>
                ) : (
                  <div style={{ height: '100px', backgroundColor: 'var(--surface-light)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', gap: '6px' }}>
                    <ImageIcon size={20} style={{ color: 'var(--text-secondary)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sin imagen adjunta</span>
                  </div>
                )}

                {/* Input Approval Amount */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-light)', padding: '10px 12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Monto a aprobar:</span>
                  <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary)', marginRight: '4px' }}>$</span>
                    <input
                      type="number"
                      style={{ border: 'none', background: 'transparent', outline: 'none', width: '70px', fontWeight: 'bold', color: 'var(--primary)', textAlign: 'center' }}
                      value={currentInputValue}
                      onChange={e => handleAmountChange(payment.id, e.target.value)}
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: 'auto' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: '1', padding: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}
                    onClick={() => handleManualPay(payment.loanId, payment.id, payment.clientEmail)}
                    disabled={loading}
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: '1', padding: '8px', fontSize: '12px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    onClick={() => handleVerify(payment.loanId, payment.id, false, currentInputValue)}
                    disabled={loading}
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: '1.2', padding: '8px', fontSize: '12px' }}
                    onClick={() => handleVerify(payment.loanId, payment.id, true, currentInputValue)}
                    disabled={loading}
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enlarged Image Lightbox */}
      {enlargedImage && (
        <div className="modal-backdrop" onClick={() => setEnlargedImage(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img src={enlargedImage} style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0px 8px 30px rgba(0,0,0,0.5)' }} alt="Comprobante ampliado" />
            <button className="btn btn-primary" style={{ position: 'absolute', top: '16px', right: '16px', borderRadius: '50%', padding: '10px' }} onClick={() => setEnlargedImage(null)}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
