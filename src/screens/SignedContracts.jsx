import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import localdb from '../lib/localdb';
import { openContractPrint } from '../lib/contractTemplate';
import { FileText, Award, PenTool, ArrowRight, Download } from 'lucide-react';

export default function SignedContracts() {
  const { currentUser } = useAuth();
  const { loans } = useData();

  const [contracts, setContracts] = useState([]);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signingLoan, setSigningLoan] = useState(null);

  const loadContracts = async () => {
    if (!currentUser?.id) return;
    const list = await localdb.getSignedContractsByClient(currentUser.id);
    setContracts(list || []);
  };

  useEffect(() => {
    loadContracts();
  }, [currentUser]);

  const unsignedLoans = loans.filter(l => {
    if (l.status !== 'approved') return false;
    const hasContract = contracts.some(c => c.loan_id === l.id);
    return !hasContract;
  });

  const handleSignContract = async () => {
    if (!signatureName.trim()) {
      alert('Ingresa tu nombre completo para firmar el documento.');
      return;
    }

    try {
      const contract = {
        client_id: currentUser.id,
        loan_id: signingLoan.id,
        client_name: signatureName.trim(),
        client_email: currentUser.email,
        amount: signingLoan.amount,
        interest_rate: signingLoan.interest_rate,
        installments_count: signingLoan.installments_count,
        purpose: signingLoan.purpose || 'Préstamo personal',
        currency: signingLoan.currency || 'USD',
        signature: `FIRMADO DIGITALMENTE POR: ${signatureName.trim().toUpperCase()}`,
        signed_at: new Date().toISOString(),
      };

      await localdb.saveSignedContract(contract);
      alert('Contrato firmado y archivado exitosamente.');
      setShowSignModal(false);
      setSignatureName('');
      setSigningLoan(null);
      await loadContracts();
    } catch (error) {
      alert('Error al firmar: ' + error.message);
    }
  };

  const downloadContractPDF = (contract) => {
    openContractPrint(contract);
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Contratos Digitales</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Consulta y descarga los pagarés y contratos legales de tus préstamos</p>
      </div>

      {/* Unsigned Contracts Alerts */}
      {unsignedLoans.map((loan) => (
        <div 
          key={loan.id} 
          className="premium-card pulsing" 
          style={{ 
            borderColor: 'var(--warning)', 
            background: 'rgba(243, 156, 18, 0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <h4 style={{ color: 'var(--warning)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PenTool size={18} />
              Contrato pendiente de firma
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              El préstamo por <strong>${loan.amount.toFixed(2)}</strong> aprobado el {new Date(loan.created_at).toLocaleDateString()} requiere tu firma digital.
            </p>
          </div>
          <button 
            className="btn btn-admin" 
            style={{ backgroundColor: 'var(--warning)', color: '#121619' }}
            onClick={() => {
              setSigningLoan(loan);
              setSignatureName('');
              setShowSignModal(true);
            }}
          >
            Firmar Contrato
            <ArrowRight size={14} />
          </button>
        </div>
      ))}

      {/* Signed Contracts List */}
      <div className="premium-card">
        <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={20} style={{ color: 'var(--primary)' }} />
          Tus Contratos Archivados
        </h3>

        {contracts.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
            No tienes contratos firmados aún.
          </p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Fecha de Firma</th>
                  <th>Monto del Crédito</th>
                  <th>Interés</th>
                  <th>Cuotas</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id}>
                    <td>{new Date(c.signed_at).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 'bold' }}>${c.amount.toFixed(2)}</td>
                    <td>{c.interest_rate}%</td>
                    <td>{c.installments_count} meses</td>
                    <td>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => downloadContractPDF(c)}
                        style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Download size={12} /> Descargar PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contract Sign Modal */}
      {showSignModal && (
        <div className="modal-backdrop" onClick={() => setShowSignModal(false)}>
          <div className="modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Firma Digital de Contrato</h3>
            </div>
            <div className="modal-body" style={{ maxHeight: '420px', overflowY: 'auto', fontSize: '14px', lineHeight: '1.6' }}>
              <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: 'var(--surface-light)', marginBottom: '16px' }}>
                <h4 style={{ textAlign: 'center', marginBottom: '12px', textTransform: 'uppercase' }}>CONTRATO DE MUTUO Y PAGARÉ</h4>
                <p>
                  Yo, <strong>{currentUser.email}</strong>, por medio del presente documento me reconozco deudor de la cantidad de <strong>${signingLoan?.amount.toFixed(2)} USD</strong> con una tasa de interés del <strong>{signingLoan?.interest_rate}%</strong>, monto que me comprometo a pagar en un lapso de <strong>{signingLoan?.installments_count} cuotas mensuales</strong> consecutivas.
                </p>
                <br />
                <p>
                  Acepto los términos legales que rigen el cobro de cuotas, el cálculo de mora correspondiente al 5% en caso de impago y declaro que las firmas electrónicas aquí asentadas tienen plena validez legal.
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Escribe tu Nombre Completo para firmar:</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ej. Juan Carlos Pérez" 
                  value={signatureName}
                  onChange={e => setSignatureName(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSignModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSignContract}>Acepto y Firmo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
