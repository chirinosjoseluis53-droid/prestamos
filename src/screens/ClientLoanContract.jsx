import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import localdb from '../lib/localdb';
import { FileText, PenTool, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

const CONTRACT_TERMS = `
CONTRATO DE PRÉSTAMO Y PAGARÉ ELECTRÓNICO

EL PRESTAMISTA Y EL PRESTATARIO acuerdan los siguientes términos:

1. OBJETO DEL CONTRATO
El Prestamista otorga al Prestatario un préstamo por la cantidad solicitada, el cual se compromete a devolver bajo las condiciones aquí establecidas.

2. TASA DE INTERÉS
Se aplicará la tasa de interés acordada al momento de la aprobación del préstamo, la cual será fija durante toda la vigencia del mismo.

3. PLAZO DE PAGO
El Prestatario se compromete a pagar las cuotas mensuales en las fechas de vencimiento establecidas en el cronograma de amortización.

4. MORATORIOS
En caso de incumplimiento en el pago oportuno, se aplicará una penalidad del 5% sobre el monto de la cuota vencida por cada mes de retraso.

5. INCUMPLIMIENTO
El incumplimiento reiterado (3 cuotas consecutivas sin pago) autoriza al Prestamista a iniciar acciones legales para la recuperación del monto adeudado.

6. PAGO ANTICIPADO
El Prestatario podrá realizar pagos anticipados sin penalidad alguna, reduciendo proporcionalmente el saldo pendiente.

7. USO DE DATOS PERSONALES
Los datos personales proporcionados serán utilizados exclusivamente para los fines de este contrato y la gestión del préstamo.

8. FIRMA DIGITAL
Las partes reconocen que la firma digital aquí asentada tiene plena validez legal de acuerdo con la legislación vigente.

Al firmar este contrato, el Prestatario declara haber leído, comprendido y aceptado todos los términos y condiciones aquí establecidos.
`;

export default function ClientLoanContract({ setTab, loanData }) {
  const { currentUser } = useAuth();
  const { getKycProfile } = useData();

  const [signatureName, setSignatureName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signed, setSigned] = useState(false);

  const profile = getKycProfile(currentUser?.email);

  useEffect(() => {
    const checkContract = async () => {
      if (currentUser?.id) {
        const hasContract = await localdb.clientHasSignedContract(currentUser.id);
        if (hasContract) {
          setSigned(true);
        }
      }
    };
    checkContract();
  }, [currentUser]);

  const handleSignContract = async () => {
    if (!signatureName.trim()) {
      alert('Ingresa tu nombre completo para firmar.');
      return;
    }
    if (!acceptedTerms) {
      alert('Debes aceptar los términos y condiciones.');
      return;
    }

    setLoading(true);
    try {
      const contract = {
        client_id: currentUser.id,
        client_name: signatureName.trim(),
        client_email: currentUser.email,
        amount: loanData?.amount || 0,
        currency: loanData?.currency || 'USD',
        interest_rate: loanData?.interestRate || 0,
        installments_count: loanData?.months || 0,
        purpose: loanData?.purpose || 'No especificado',
        signature: `FIRMADO DIGITALMENTE POR: ${signatureName.trim().toUpperCase()}`,
        signed_at: new Date().toISOString(),
        terms: CONTRACT_TERMS,
      };

      await localdb.saveSignedContract(contract);
      setSigned(true);
    } catch (error) {
      alert('Error al firmar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const currencySymbols = { USD: '$', EUR: '€', COP: '$', VES: 'Bs', MXN: '$', ZELLE: '$' };
  const symbol = currencySymbols[loanData?.currency] || '$';
  const total = (loanData?.amount || 0) * (1 + (loanData?.interestRate || 0) / 100);
  const cuota = total / (loanData?.months || 1);

  if (signed) {
    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div className="premium-card" style={{ padding: '40px' }}>
          <CheckCircle size={64} style={{ color: '#10B981', margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px', color: '#10B981' }}>Contrato Firmado</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            Tu contrato está archivado y firmado digitalmente. Ahora puedes continuar con tu solicitud de préstamo.
          </p>
          <button className="btn btn-primary" onClick={() => setTab('loans')} style={{ padding: '12px 32px' }}>
            Continuar con la Solicitud
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '640px', margin: '0 auto' }}>
      <button onClick={() => setTab('loans')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontSize: '14px', fontWeight: '600', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={18} /> Volver a Solicitud
      </button>

      <div className="premium-card" style={{ padding: '28px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <FileText size={40} style={{ color: 'var(--primary)', margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '4px' }}>Contrato de Préstamo</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Lee los términos y firma para continuar</p>
        </div>

        {/* Loan Summary */}
        <div style={{ padding: '16px', border: '1px solid var(--primary)', borderRadius: '12px', backgroundColor: 'rgba(37,99,235,0.05)', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Resumen de tu Préstamo</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
            <div><strong>Monto:</strong> {symbol}{(loanData?.amount || 0).toFixed(2)} {loanData?.currency}</div>
            <div><strong>Plazo:</strong> {loanData?.months || 0} meses</div>
            <div><strong>Interés:</strong> {loanData?.interestRate || 0}%</div>
            <div><strong>Cuota:</strong> {symbol}{cuota.toFixed(2)}/mes</div>
            <div><strong>Total:</strong> {symbol}{total.toFixed(2)}</div>
            <div><strong>Destino:</strong> {loanData?.purpose || 'N/A'}</div>
          </div>
        </div>

        {/* Contract Terms */}
        <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: 'var(--surface-light)', marginBottom: '20px', fontSize: '12px', lineHeight: '1.7', whiteSpace: 'pre-line', color: 'var(--text)', maxHeight: '280px', overflowY: 'auto' }}>
          {CONTRACT_TERMS}
        </div>

        {/* Client Info */}
        <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--surface-light)', border: '1px solid var(--border)', marginBottom: '16px', fontSize: '12px' }}>
          <div><strong>Cliente:</strong> {profile?.fullName || currentUser?.email}</div>
          <div><strong>Email:</strong> {currentUser?.email}</div>
        </div>

        {/* Signature */}
        <div className="form-group" style={{ marginBottom: '12px' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PenTool size={14} /> Tu Nombre Completo (Firma Digital)
          </label>
          <input type="text" className="form-control" placeholder="Ej. Juan Carlos Pérez" value={signatureName} onChange={e => setSignatureName(e.target.value)} />
        </div>

        {/* Accept Checkbox */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '20px', cursor: 'pointer', fontSize: '12px', color: 'var(--text)' }}>
          <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} style={{ marginTop: '2px' }} />
          <span>He leído y acepto los términos y condiciones del contrato de préstamo.</span>
        </label>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setTab('loans')}>
            Cancelar
          </button>
          <button className="btn btn-primary" style={{ flex: 1.5 }} onClick={handleSignContract} disabled={loading || !acceptedTerms || !signatureName.trim()}>
            {loading ? 'Firmando...' : 'Aceptar y Firmar Contrato'}
          </button>
        </div>
      </div>
    </div>
  );
}
