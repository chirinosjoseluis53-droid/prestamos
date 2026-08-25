import React, { useState, useMemo } from 'react';
import { Calculator, Calendar, Percent, DollarSign, Plus, Minus } from 'lucide-react';

const RATE_PRESETS = ['3', '5', '8', '10', '15'];

const addMonths = (date, count) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + count);
  return next;
};

export default function AdminLoanCalculator() {
  const [amount, setAmount] = useState('');
  const [interestRate, setInterestRate] = useState('5');
  const [installments, setInstallments] = useState('12');
  const [firstPaymentDate, setFirstPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const result = useMemo(() => {
    const principal = parseFloat(amount) || 0;
    const rate = parseFloat(interestRate) || 0;
    const count = Math.max(1, parseInt(installments, 10) || 1);

    if (principal <= 0) {
      return { principal: 0, interest: 0, total: 0, perInstallment: 0, schedule: [] };
    }

    const interest = principal * (rate / 100);
    const total = principal + interest;
    const perInstallment = total / count;
    
    // Parse selected date safely
    const [y, m, d] = firstPaymentDate.split('-').map(Number);
    const start = new Date(y, m - 1, d);

    const schedule = Array.from({ length: count }, (_, i) => {
      const due = addMonths(start, i);
      return {
        number: i + 1,
        dueDate: due.toISOString().split('T')[0],
        dueLabel: due.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
        amount: perInstallment,
      };
    });

    return { principal, interest, total, perInstallment, schedule };
  }, [amount, interestRate, installments, firstPaymentDate]);

  return (
    <div className="admin-calculator animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Simula cuotas, intereses y fechas antes de aprobar un préstamo.
        </p>
      </div>

      <div className="grid-2col">
        {/* Left column - Controls */}
        <div className="premium-card" style={{ padding: '24px' }}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Monto del préstamo ($)</label>
            <div style={{ position: 'relative' }}>
              <DollarSign size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="number"
                className="form-control"
                placeholder="Ej. 500"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Tasa de interés (%)</label>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Percent size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="number"
                className="form-control"
                placeholder="5"
                value={interestRate}
                onChange={e => setInterestRate(e.target.value)}
                style={{ paddingLeft: '44px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {RATE_PRESETS.map(p => (
                <button
                  key={p}
                  type="button"
                  className={`btn ${interestRate === p ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '20px' }}
                  onClick={() => setInterestRate(p)}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Número de cuotas</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                type="button"
                className="btn btn-secondary"
                style={{ padding: '12px', borderRadius: '12px' }}
                onClick={() => setInstallments(String(Math.max(1, (parseInt(installments, 10) || 1) - 1)))}
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                className="form-control"
                style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}
                value={installments}
                onChange={e => setInstallments(e.target.value)}
              />
              <button 
                type="button"
                className="btn btn-secondary"
                style={{ padding: '12px', borderRadius: '12px' }}
                onClick={() => setInstallments(String((parseInt(installments, 10) || 1) + 1))}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Fecha del primer pago</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="date"
                className="form-control"
                value={firstPaymentDate}
                onChange={e => setFirstPaymentDate(e.target.value)}
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>
        </div>

        {/* Right column - Simulation Result & Schedule */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Result Box */}
          <div className="premium-card" style={{ padding: '24px', backgroundColor: 'rgba(15,164,108,0.05)', border: '1px solid rgba(15,164,108,0.2)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', marginBottom: '20px', color: 'var(--text)' }}>
              <Calculator size={20} style={{ color: 'var(--primary)' }} />
              Resultado de la Simulación
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Capital prestado</span>
                <span style={{ fontWeight: '600' }}>${result.principal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Interés ({interestRate || 0}%)</span>
                <span style={{ fontWeight: '600', color: 'var(--warning)' }}>+${result.interest.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <span>Total a cobrar</span>
                <span style={{ color: 'var(--primary)' }}>${result.total.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', backgroundColor: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cuota mensual estimada</span>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary)', margin: '4px 0' }}>
                ${result.perInstallment.toFixed(2)}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{installments || 1} pagos mensuales</span>
            </div>
          </div>

          {/* Schedule list */}
          {result.schedule.length > 0 && (
            <div className="premium-card" style={{ padding: '24px', flex: 1, maxHeight: '300px', overflowY: 'auto' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>Calendario de Cuotas</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {result.schedule.map(item => (
                  <div key={item.number} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(15,164,108,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justify: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                        #{item.number}
                      </div>
                      <span style={{ fontSize: '14px', color: 'var(--text)' }}>{item.dueLabel}</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '700' }}>${item.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
