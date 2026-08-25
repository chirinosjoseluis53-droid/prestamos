import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { getDueDate, getTotalPaid, getLoanStatus } from '../lib/loanHelpers';
import { Phone, Calendar, Trash2, Edit2, CheckCircle2, User, Wallet, MoreHorizontal } from 'lucide-react';

export default function AdminActiveLoans({ setTab, setSelectedLoan }) {
  const { loans, getKycProfile, deleteLoan, adminPayInstallment, refreshLoans } = useData();
  const [filter, setFilter] = useState('active'); // 'active' | 'completed'
  const [showPayModal, setShowPayModal] = useState(false);
  const [activePayLoan, setActivePayLoan] = useState(null);

  useEffect(() => {
    refreshLoans();
  }, []);

  const allApproved = loans.filter(l => l.status === 'approved');
  const activeLoans = allApproved.filter(l => l.installments?.some(i => i.status !== 'paid'));
  const completedLoans = allApproved.filter(l => l.installments?.length > 0 && l.installments?.every(i => i.status === 'paid'));
  const displayedLoans = filter === 'active' ? activeLoans : completedLoans;

  const handleWhatsAppReminder = (loan) => {
    const profile = getKycProfile(loan.clientEmail);
    const phone = profile?.phone;
    if (!phone) {
      alert('El cliente no tiene un teléfono válido registrado.');
      return;
    }

    const nextInst = (loan.installments || []).find(i => i.status !== 'paid' && i.status !== 'submitted');
    if (!nextInst) {
      alert('No hay cuotas pendientes para este préstamo.');
      return;
    }

    const clientName = profile?.fullName || profile?.full_name || loan.clientEmail;
    const amount = parseFloat(nextInst.amount || 0).toFixed(2);
    const message = `Hola ${clientName}, te saludamos de PrestamosApp. Le recordamos que su cuota #${nextInst.number} de $${amount} se encuentra pendiente. Por favor realice su pago y cargue el comprobante. ¡Gracias!`;

    // Clean phone number
    let digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 10) digits = `58${digits}`;

    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDelete = (loanId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este préstamo permanentemente?')) {
      deleteLoan(loanId);
    }
  };

  const handlePayPress = (loan) => {
    const pendingInstallments = loan.installments?.filter(i => i.status !== 'paid') || [];
    if (pendingInstallments.length === 0) {
      alert('Este préstamo no tiene cuotas pendientes.');
      return;
    }
    setActivePayLoan(loan);
    setShowPayModal(true);
  };

  const handleRecordPayment = async (installmentId) => {
    if (window.confirm('¿Confirmar registro de pago manual para esta cuota?')) {
      await adminPayInstallment(activePayLoan.id, installmentId);
      setShowPayModal(false);
      setActivePayLoan(null);
      alert('Pago registrado correctamente');
    }
  };

  return (
    <div className="admin-active-loans animate-fade">
      {/* Tab Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', backgroundColor: 'var(--surface)', padding: '6px', borderRadius: '12px', width: 'fit-content' }}>
        <button 
          className={`btn ${filter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('active')}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          Activos
        </button>
        <button 
          className={`btn ${filter === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('completed')}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          Finalizados
        </button>
      </div>

      {displayedLoans.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <Wallet size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>
            {filter === 'active' ? 'No hay préstamos activos.' : 'No hay préstamos finalizados.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: '20px' }}>
          {displayedLoans.map(loan => {
            const profile = getKycProfile(loan.clientEmail);
            const totalInstallments = loan.installments?.length || 0;
            const paidInstallments = loan.installments?.filter(i => i.status === 'paid').length || 0;
            const progress = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;
            const totalPaid = getTotalPaid(loan.installments);
            const totalAmount = loan.installments?.reduce((acc, i) => acc + i.amount, 0) || loan.amount;
            const loanStatus = getLoanStatus(loan);

            return (
              <div key={loan.id} className="premium-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {profile?.profilePhoto ? (
                      <img src={profile.profilePhoto} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} alt="Avatar" />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--surface-light)', display: 'flex', alignItems: 'center', justify: 'center' }}>
                        <User size={18} style={{ color: 'var(--text-secondary)' }} />
                      </div>
                    )}
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>{profile?.fullName || loan.clientEmail}</h4>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Préstamo #{loan.id.slice(-6)}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '16px' }}>${totalAmount.toFixed(2)}</div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: loanStatus.color }}>
                      {loanStatus.label}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ backgroundColor: 'var(--surface-light)', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Progreso de Pago</span>
                    <span style={{ fontWeight: '600' }}>{paidInstallments}/{totalInstallments} cuotas</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ height: '100%', backgroundColor: 'var(--primary)', width: `${progress}%`, borderRadius: '3px' }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'var(--success)', fontWeight: '500' }}>Pagado: ${totalPaid.toFixed(2)}</span>
                    <span style={{ color: 'var(--warning)', fontWeight: '500' }}>Restante: ${(totalAmount - totalPaid).toFixed(2)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleWhatsAppReminder(loan)}
                    style={{ flex: 1, padding: '8px', fontSize: '12px', gap: '6px', color: '#25D366', borderColor: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Phone size={14} /> Recordar
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handlePayPress(loan)}
                    style={{ flex: 1, padding: '8px', fontSize: '12px', gap: '6px', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Calendar size={14} /> Pagar
                  </button>
                  {setSelectedLoan && (
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => { setSelectedLoan(loan); setTab('edit-loan'); }}
                      style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleDelete(loan.id)}
                    style={{ padding: '8px', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && activePayLoan && (
        <div className="modal-backdrop" onClick={() => setShowPayModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Registrar Pago Manual</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Selecciona la cuota que el cliente ha pagado manualmente:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activePayLoan.installments?.filter(i => i.status !== 'paid').map(inst => (
                  <button 
                    key={inst.id}
                    className="btn btn-secondary"
                    onClick={() => handleRecordPayment(inst.id)}
                    style={{ justifyContent: 'space-between', padding: '14px', width: '100%', display: 'flex', alignItems: 'center' }}
                  >
                    <span>Cuota #{inst.number}</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>${inst.amount.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
