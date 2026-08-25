import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, DollarSign, Calendar, Percent, BarChart3, ArrowRight } from 'lucide-react';

function calculateAmortization(principal, annualRate, months) {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = monthlyRate > 0
    ? (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
    : principal / months;

  const rows = [];
  let balance = principal;
  let totalInterest = 0;

  for (let i = 1; i <= months; i++) {
    const interestPart = balance * monthlyRate;
    const principalPart = monthlyPayment - interestPart;
    balance = Math.max(0, balance - principalPart);
    totalInterest += interestPart;
    rows.push({
      month: i,
      payment: monthlyPayment,
      principal: principalPart,
      interest: interestPart,
      balance: balance,
    });
  }

  return {
    monthlyPayment,
    totalPayment: monthlyPayment * months,
    totalInterest,
    rows,
  };
}

export default function CreditSimulator() {
  const [amount, setAmount] = useState(1000);
  const [months, setMonths] = useState(12);
  const [rate, setRate] = useState(10);

  const [compareRate, setCompareRate] = useState(15);
  const [showComparison, setShowComparison] = useState(false);

  const mainCalc = useMemo(() => calculateAmortization(amount, rate, months), [amount, rate, months]);
  const compareCalc = useMemo(() => showComparison ? calculateAmortization(amount, compareRate, months) : null, [amount, compareRate, months, showComparison]);

  const formatCurrency = (val) => `$${val.toFixed(2)}`;

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Simulador de Crédito</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Calcula tus cuotas y amortización antes de solicitar</p>
      </div>

      {/* Controls */}
      <div className="premium-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monto del Préstamo</label>
              <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>${amount.toLocaleString()}</span>
            </div>
            <input type="range" min="100" max="10000" step="100" value={amount} onChange={e => setAmount(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)', height: '6px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              <span>$100</span><span>$10,000</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plazo (meses)</label>
                <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>{months}</span>
              </div>
              <input type="range" min="1" max="60" step="1" value={months} onChange={e => setMonths(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)', height: '6px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                <span>1 mes</span><span>60 meses</span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tasa de Interés (%)</label>
                <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>{rate}%</span>
              </div>
              <input type="range" min="1" max="50" step="0.5" value={rate} onChange={e => setRate(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)', height: '6px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                <span>1%</span><span>50%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-4col" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Capital', value: formatCurrency(amount), icon: <DollarSign size={20} />, color: 'var(--primary)' },
          { label: 'Cuota Mensual', value: formatCurrency(mainCalc.monthlyPayment), icon: <Calendar size={20} />, color: '#10B981' },
          { label: 'Total con Intereses', value: formatCurrency(mainCalc.totalPayment), icon: <TrendingUp size={20} />, color: '#F59E0B' },
          { label: 'Total Intereses', value: formatCurrency(mainCalc.totalInterest), icon: <Percent size={20} />, color: '#EF4444' },
        ].map((card, i) => (
          <div key={i} className="premium-card" style={{ padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: `${card.color}15`, color: card.color }}>{card.icon}</div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: card.color }}>{card.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Toggle */}
      <div className="premium-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '14px', fontWeight: 700 }}>Comparar con otra tasa</span>
          </div>
          <div onClick={() => setShowComparison(!showComparison)} style={{ width: '46px', height: '24px', borderRadius: '12px', backgroundColor: showComparison ? 'var(--primary)' : 'var(--border)', padding: '2px', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', left: showComparison ? '24px' : '2px', transition: 'left 0.2s' }} />
          </div>
        </div>
        {showComparison && (
          <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tasa alternativa:</label>
            <input type="number" step="0.5" min="1" max="50" className="form-control" value={compareRate} onChange={e => setCompareRate(Number(e.target.value))} style={{ width: '100px' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>%</span>
          </div>
        )}
      </div>

      {/* Side by side comparison */}
      {showComparison && compareCalc && (
        <div className="grid-2col" style={{ marginBottom: '24px' }}>
          <div className="premium-card" style={{ padding: '20px', borderColor: 'var(--primary)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--primary)' }}>Tasa: {rate}%</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Cuota Mensual', value: formatCurrency(mainCalc.monthlyPayment) },
                { label: 'Total a Pagar', value: formatCurrency(mainCalc.totalPayment) },
                { label: 'Intereses Totales', value: formatCurrency(mainCalc.totalInterest) },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--surface-light)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="premium-card" style={{ padding: '20px', borderColor: '#10B981' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#10B981' }}>Tasa: {compareRate}%</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Cuota Mensual', value: formatCurrency(compareCalc.monthlyPayment) },
                { label: 'Total a Pagar', value: formatCurrency(compareCalc.totalPayment) },
                { label: 'Intereses Totales', value: formatCurrency(compareCalc.totalInterest) },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--surface-light)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Amortization Table */}
      <div className="premium-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} style={{ color: 'var(--primary)' }} /> Tabla de Amortización
        </h3>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cuota</th>
                <th>Capital</th>
                <th>Interés</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {mainCalc.rows.map(row => (
                <tr key={row.month}>
                  <td style={{ fontWeight: 'bold' }}>{row.month}</td>
                  <td>{formatCurrency(row.payment)}</td>
                  <td style={{ color: 'var(--primary)' }}>{formatCurrency(row.principal)}</td>
                  <td style={{ color: '#EF4444' }}>{formatCurrency(row.interest)}</td>
                  <td style={{ fontWeight: 'bold' }}>{formatCurrency(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
