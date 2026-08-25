import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import localdb from '../lib/localdb';
import { validateFinancialInput } from '../lib/sanitize';
import { AlertCircle, TrendingUp, CheckCircle, Clock, DollarSign, Activity, Percent, FileText, PenTool } from 'lucide-react';

const CURRENCIES = [
  { code: 'USD', label: 'Dólares (USD)', symbol: '$' },
  { code: 'EUR', label: 'Euros (EUR)', symbol: '€' },
  { code: 'COP', label: 'Peso Colombiano (COP)', symbol: '$' },
  { code: 'VES', label: 'Bolívares (VES)', symbol: 'Bs' },
  { code: 'MXN', label: 'Peso Mexicano (MXN)', symbol: '$' },
  { code: 'ZELLE', label: 'Zelle (USD)', symbol: '$' },
];

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

export default function LoanRequest({ setTab, setLoanData }) {
  const { currentUser } = useAuth();
  const { loans, getKycProfile, createLoanRequest, refreshLoans } = useData();

  const [amount, setAmount] = useState(500);
  const [months, setMonths] = useState(6);
  const [purpose, setPurpose] = useState('Consumo');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [adminRate, setAdminRate] = useState(null);
  const [hasSignedContract, setHasSignedContract] = useState(false);

  const [scoreData, setScoreData] = useState({
    score: 50,
    label: 'Riesgo Medio',
    color: '#F59E0B',
    description: 'Calculando perfil...'
  });

  const activeLoan = loans.find(l => {
    if (l.status !== 'approved') return false;
    const isCompleted = l.installments && l.installments.length > 0 && l.installments.every(i => i.status === 'paid');
    return !isCompleted;
  });
  const pendingLoan = loans.find(l => l.status === 'pending');

  useEffect(() => {
    refreshLoans();
    const loadRate = async () => {
      if (currentUser?.adminId) {
        const rate = await localdb.getAdminInterestRate(currentUser.adminId);
        if (rate !== null) setAdminRate(rate);
      }
    };
    loadRate();

    // Check if client has signed contract
    const checkContract = async () => {
      if (currentUser?.id) {
        const signed = await localdb.clientHasSignedContract(currentUser.id);
        setHasSignedContract(signed);
      }
    };
    checkContract();
  }, [currentUser]);

  const getLoyalty = (clientEmail) => {
    const clientLoans = loans.filter(l => l.clientEmail === clientEmail && l.status === 'approved');
    let points = 0;
    clientLoans.forEach(loan => {
      const allPaid = loan.installments && loan.installments.length > 0 && loan.installments.every(i => i.status === 'paid');
      if (allPaid) points += 50;
    });
    let tierLabel = 'BRONCE';
    if (points >= 250) tierLabel = 'ORO';
    else if (points >= 100) tierLabel = 'PLATA';
    return { points, tier: { label: tierLabel } };
  };

  const calculateScore = (clientEmail) => {
    if (!clientEmail) return;
    const profile = getKycProfile(clientEmail);
    const clientLoans = loans.filter(l => l.clientEmail === clientEmail);
    let kycPts = 0, profilePts = 0, paymentsPts = 0, completedPts = 0;

    if (profile) {
      if (profile.faceVerified) kycPts += 15;
      if (profile.idFrontPhoto && profile.idBackPhoto) kycPts += 10;
    }
    if (profile) {
      if (profile.fullName) profilePts += 3;
      if (profile.idNumber) profilePts += 3;
      if (profile.phone) profilePts += 2;
      if (profile.address) profilePts += 2;
    }

    const completedLoans = clientLoans.filter(l => l.status === 'approved' && l.installments?.every(i => i.status === 'paid'));
    completedPts = Math.min(completedLoans.length * 10, 20);

    let totalInstallments = 0, paidInstallments = 0, rejectedInstallments = 0;
    clientLoans.forEach(loan => {
      loan.installments?.forEach(inst => {
        totalInstallments++;
        if (inst.status === 'paid') paidInstallments++;
        if (inst.status === 'rejected') rejectedInstallments++;
      });
    });
    if (totalInstallments > 0) {
      const paidRatio = paidInstallments / totalInstallments;
      paymentsPts = Math.round(paidRatio * 45);
      paymentsPts = Math.max(0, paymentsPts - rejectedInstallments * 5);
    }

    const loyalty = getLoyalty(clientEmail);
    const loyaltyBonus = Math.min(15, Math.round(loyalty.points / 20));
    paymentsPts = Math.min(45, paymentsPts + loyaltyBonus);

    const totalScore = Math.min(100, Math.max(0, kycPts + profilePts + paymentsPts + completedPts));
    let label = 'Sin historial', color = '#A0AAB2', description = 'Aún no tienes préstamos.';
    if (totalScore >= 85) { label = 'Excelente'; color = '#10B981'; description = 'Cliente de muy bajo riesgo.'; }
    else if (totalScore >= 70) { label = 'Bueno'; color = '#3B82F6'; description = 'Cliente confiable.'; }
    else if (totalScore >= 50) { label = 'Regular'; color = '#F59E0B'; description = 'Historial moderado.'; }
    else if (totalScore >= 20) { label = 'En desarrollo'; color = '#F97316'; description = 'Estás comenzando.'; }

    setScoreData({ score: totalScore, label, color, description });
  };

  useEffect(() => {
    if (currentUser?.email) calculateScore(currentUser.email);
  }, [currentUser, loans, getKycProfile]);

  const interestRate = adminRate !== null ? adminRate : 5;
  const totalAmountToPay = amount * (1 + interestRate / 100);
  const monthlyInstallment = totalAmountToPay / months;
  const currencyObj = CURRENCIES.find(c => c.code === currency);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (activeLoan) { alert('Ya tienes un préstamo activo.'); return; }
    if (pendingLoan) { alert('Ya tienes una solicitud pendiente.'); return; }

    // Re-check contract status in real time
    const signed = await localdb.clientHasSignedContract(currentUser.id);
    setHasSignedContract(signed);

    if (!signed) {
      setLoanData({ amount, months, currency, purpose, interestRate });
      setTab('loan-contract');
      return;
    }

    await submitLoan();
  };

  const submitLoan = async () => {
    const amountErr = validateFinancialInput(amount, { label: 'Monto', min: 1, max: 999999999, required: true });
    if (amountErr) { alert(amountErr); setLoading(false); return; }
    const monthsErr = validateFinancialInput(months, { label: 'Plazo', min: 1, max: 360, required: true, allowDecimal: false });
    if (monthsErr) { alert(monthsErr); setLoading(false); return; }

    setLoading(true);
    try {
      const loanId = await createLoanRequest(currentUser.email, amount, purpose, { months, currency });
      alert('Solicitud enviada con éxito.');
      setTab('dashboard');
    } catch (error) {
      alert('Error al solicitar préstamo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Solicitud de Crédito</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Simula y solicita tu préstamo con aprobación rápida</p>
      </div>

      <div className="grid-2col-wide">
        {/* Calculator Form */}
        <div className="premium-card">
          <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Simulador de Crédito</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Monto a Solicitar</label>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{currencyObj?.symbol}{amount} {currency}</span>
              </div>
              <input type="range" min="100" max="5000" step="50" className="form-control" value={amount}
                onChange={e => setAmount(parseInt(e.target.value))}
                style={{ padding: 0, height: '6px', cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                <span>Min: {currencyObj?.symbol}100</span>
                <span>Max: {currencyObj?.symbol}5,000</span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Plazo de Amortización</label>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{months} Meses</span>
              </div>
              <input type="range" min="1" max="24" step="1" className="form-control" value={months}
                onChange={e => setMonths(parseInt(e.target.value))}
                style={{ padding: 0, height: '6px', cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                <span>Min: 1 Mes</span>
                <span>Max: 24 Meses</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Destino del Crédito</label>
                <select className="form-control" value={purpose} onChange={e => setPurpose(e.target.value)}>
                  <option value="Consumo">Consumo</option>
                  <option value="Negocio/Emprendimiento">Negocio / Emprendimiento</option>
                  <option value="Salud">Salud / Emergencia</option>
                  <option value="Educación">Educación</option>
                  <option value="Servicios/Otros">Otros</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Moneda</label>
                <select className="form-control" value={currency} onChange={e => setCurrency(e.target.value)}>
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {activeLoan ? (
              <div style={{ display: 'flex', gap: '10px', padding: '12px', backgroundColor: 'rgba(231, 76, 60, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', color: 'var(--danger)', fontSize: '13px' }}>
                <AlertCircle size={18} />
                <span>No puedes solicitar préstamos porque tienes uno activo.</span>
              </div>
            ) : pendingLoan ? (
              <div style={{ display: 'flex', gap: '10px', padding: '12px', backgroundColor: 'rgba(243, 156, 18, 0.1)', border: '1px solid var(--warning)', borderRadius: '8px', color: 'var(--warning)', fontSize: '13px' }}>
                <Clock size={18} />
                <span>Ya tienes una solicitud de crédito en revisión.</span>
              </div>
            ) : (
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'ENVIANDO...' : hasSignedContract ? 'SOLICITAR PRÉSTAMO' : 'REVISAR Y FIRMAR CONTRATO'}
              </button>
            )}
          </form>
        </div>

        {/* Scoring & Cost breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="premium-card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} style={{ color: 'var(--primary)' }} /> Tu Credit Score
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', border: `5px solid ${scoreData.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '800' }}>
                {scoreData.score}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px', color: scoreData.color }}>{scoreData.label}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{scoreData.description}</div>
              </div>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              Un puntaje mayor a 70 puntos te otorga mejores tasas y aprobación prioritaria.
            </div>
          </div>

          <div className="premium-card" style={{ borderColor: 'var(--primary)' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={20} style={{ color: 'var(--primary)' }} /> Detalles del Pago Estimado
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Moneda:</span>
                <span style={{ fontWeight: '600' }}>{currencyObj?.label}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Monto solicitado:</span>
                <span style={{ fontWeight: '600' }}>{currencyObj?.symbol}{amount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tasa de interés:</span>
                <span style={{ fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Percent size={14} />
                  {interestRate}%
                  {adminRate !== null && (
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '400' }}>(Tasa vigente)</span>
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Interés total:</span>
                <span style={{ fontWeight: '600' }}>{currencyObj?.symbol}{(amount * (interestRate / 100)).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total a devolver:</span>
                <span style={{ fontWeight: '600' }}>{currencyObj?.symbol}{totalAmountToPay.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '6px' }}>
                <span style={{ fontWeight: 'bold' }}>Cuota Mensual:</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>
                  {currencyObj?.symbol}{monthlyInstallment.toFixed(2)} / mes
                </span>
              </div>
            </div>
          </div>

          {/* Contract Status */}
          <div className="premium-card" style={{ borderColor: hasSignedContract ? '#10B981' : 'var(--warning)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {hasSignedContract ? (
                <CheckCircle size={20} style={{ color: '#10B981' }} />
              ) : (
                <FileText size={20} style={{ color: 'var(--warning)' }} />
              )}
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: hasSignedContract ? '#10B981' : 'var(--warning)' }}>
                  {hasSignedContract ? 'Contrato Firmado' : 'Contrato Pendiente'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {hasSignedContract ? 'Tu contrato está archivado y firmado.' : 'Debes firmar el contrato antes de solicitar.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
