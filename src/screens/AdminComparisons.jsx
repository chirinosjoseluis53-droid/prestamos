import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function ChangeIndicator({ current, previous }) {
  if (!previous || previous === 0) return <Minus size={14} style={{ color: 'var(--text-secondary)' }} />;
  const pct = ((current - previous) / previous * 100).toFixed(1);
  const isUp = current > previous;
  const isSame = current === previous;
  if (isSame) return <Minus size={14} style={{ color: 'var(--text-secondary)' }} />;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: '700', color: isUp ? '#2ECC71' : '#E74C3C' }}>
      {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      {Math.abs(pct)}%
    </span>
  );
}

function ComparisonCard({ label, current, previous, icon, color, format = 'number' }) {
  const display = format === 'currency' ? `$${current.toLocaleString()}` : current;
  return (
    <div className="premium-card" style={{ padding: '18px', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize: '24px', fontWeight: '800', color }}>{display}</div>
      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          vs {format === 'currency' ? `$${previous.toLocaleString()}` : previous} mes anterior
        </span>
        <ChangeIndicator current={current} previous={previous} />
      </div>
    </div>
  );
}

export default function AdminComparisons({ setTab }) {
  const { currentUser } = useAuth();
  const { loans, clients, getKycProfile } = useData();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const prevDate = useMemo(() => {
    const d = new Date(selectedYear, selectedMonth - 1, 1);
    return { month: d.getMonth(), year: d.getFullYear() };
  }, [selectedMonth, selectedYear]);

  const data = useMemo(() => {
    const getMonthData = (month, year) => {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);

      const monthLoans = loans.filter(l => {
        const d = new Date(l.created_at);
        return d >= start && d <= end;
      });

      const monthPaidInst = loans.filter(l => l.status === 'approved').flatMap(l =>
        (l.installments || []).filter(i => i.status === 'paid' && i.paid_date)
      ).filter(i => {
        const pd = new Date(i.paid_date);
        return pd >= start && pd <= end;
      });

      const newClients = clients.filter(c => {
        const d = new Date(c.created_at);
        return d >= start && d <= end;
      });

      const overdueInst = loans.filter(l => l.status === 'approved').flatMap(l =>
        (l.installments || []).filter(i => {
          const due = new Date(i.due_date + 'T00:00:00');
          return due >= start && due <= end && i.status !== 'paid' && due < new Date();
        })
      );

      return {
        loansIssued: monthLoans.length,
        paymentsCollected: monthPaidInst.reduce((s, i) => s + (i.paid_amount || i.amount), 0),
        newClients: newClients.length,
        delinquencyCount: overdueInst.length,
      };
    };

    const current = getMonthData(selectedMonth, selectedYear);
    const previous = getMonthData(prevDate.month, prevDate.year);
    return { current, previous };
  }, [loans, clients, selectedMonth, selectedYear, prevDate]);

  const chartData = useMemo(() => {
    return [
      { name: 'Préstamos', mesActual: data.current.loansIssued, mesAnterior: data.previous.loansIssued },
      { name: 'Clientes Nuevos', mesActual: data.current.newClients, mesAnterior: data.previous.newClients },
      { name: 'Mora', mesActual: data.current.delinquencyCount, mesAnterior: data.previous.delinquencyCount },
    ];
  }, [data]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
        padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ fontSize: '13px', fontWeight: '700', color: p.fill || p.color, marginTop: '2px' }}>
            {p.name}: {p.value}
          </div>
        ))}
      </div>
    );
  };

  const monthName = MONTHS[selectedMonth];
  const prevMonthName = MONTHS[prevDate.month];

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={22} style={{ color: 'var(--primary)' }} />
            Comparativas Mensuales
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
            Compara el rendimiento mes a mes
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select className="form-control" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} style={{ width: '140px' }}>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select className="form-control" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={{ width: '100px' }}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Comparison Title */}
      <div className="premium-card" style={{ padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
        <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>
          Comparando <span style={{ color: 'var(--primary)' }}>{monthName} {selectedYear}</span> vs <span style={{ color: 'var(--text-secondary)' }}>{prevMonthName} {prevDate.year}</span>
        </span>
      </div>

      {/* KPI Comparison Cards */}
      <div className="grid-4col" style={{ gap: '12px', marginBottom: '24px' }}>
        <ComparisonCard label="Préstamos Emitidos" current={data.current.loansIssued} previous={data.previous.loansIssued} color="#2563EB" icon={<TrendingUp size={16} style={{ color: '#2563EB' }} />} />
        <ComparisonCard label="Pagos Cobrados" current={data.current.paymentsCollected} previous={data.previous.paymentsCollected} color="#2ECC71" icon={<TrendingUp size={16} style={{ color: '#2ECC71' }} />} format="currency" />
        <ComparisonCard label="Clientes Nuevos" current={data.current.newClients} previous={data.previous.newClients} color="#8B5CF6" icon={<TrendingUp size={16} style={{ color: '#8B5CF6' }} />} />
        <ComparisonCard label="Cuotas en Mora" current={data.current.delinquencyCount} previous={data.previous.delinquencyCount} color="#E74C3C" icon={<TrendingDown size={16} style={{ color: '#E74C3C' }} />} />
      </div>

      {/* Bar Chart */}
      <div className="neo-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} style={{ color: 'var(--primary)' }} /> Comparación Visual
        </h3>
        <div style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="mesAnterior" name={prevMonthName} fill="var(--text-secondary)" radius={[6, 6, 0, 0]} opacity={0.5} />
              <Bar dataKey="mesActual" name={monthName} fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div className="premium-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>Detalle Comparativo</h3>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Métrica</th>
                <th>{prevMonthName}</th>
                <th>{monthName}</th>
                <th>Cambio</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Préstamos Emitidos', data.previous.loansIssued, data.current.loansIssued],
                ['Pagos Cobrados ($)', data.previous.paymentsCollected.toFixed(2), data.current.paymentsCollected.toFixed(2)],
                ['Clientes Nuevos', data.previous.newClients, data.current.newClients],
                ['Cuotas en Mora', data.previous.delinquencyCount, data.current.delinquencyCount],
              ].map(([label, prev, curr]) => (
                <tr key={label}>
                  <td style={{ fontWeight: '600' }}>{label}</td>
                  <td>{typeof prev === 'string' && prev.includes('.') ? `$${parseFloat(prev).toLocaleString()}` : prev}</td>
                  <td style={{ fontWeight: '700' }}>{typeof curr === 'string' && curr.includes('.') ? `$${parseFloat(curr).toLocaleString()}` : curr}</td>
                  <td><ChangeIndicator current={parseFloat(curr)} previous={parseFloat(prev)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
