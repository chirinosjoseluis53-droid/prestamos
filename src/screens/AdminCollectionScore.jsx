import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { AlertTriangle, TrendingDown, ArrowUpDown, Filter, Shield, ShieldAlert, ShieldCheck, User } from 'lucide-react';

function calculateCollectionScore(client, loans, getKycProfile) {
  const profile = getKycProfile(client.email);
  const clientLoans = loans.filter(l => l.clientEmail === client.email && l.status === 'approved');
  const allInst = clientLoans.flatMap(l => l.installments || []);
  const totalInst = allInst.length;
  const paidInst = allInst.filter(i => i.status === 'paid');
  const overdueInst = allInst.filter(i => i.status !== 'paid' && new Date(i.due_date + 'T00:00:00') < new Date());
  const rejectedInst = allInst.filter(i => i.status === 'rejected');

  const paymentRate = totalInst > 0 ? paidInst.length / totalInst : 0;
  const avgDaysOverdue = overdueInst.length > 0
    ? overdueInst.reduce((sum, i) => {
        const days = Math.floor((new Date() - new Date(i.due_date + 'T00:00:00')) / 86400000);
        return sum + days;
      }, 0) / overdueInst.length
    : 0;
  const totalLoanAmount = clientLoans.reduce((s, l) => s + l.amount, 0);
  const lateCount = overdueInst.length;

  let score = 100;
  score -= (1 - paymentRate) * 40;
  score -= Math.min(avgDaysOverdue * 0.5, 25);
  score -= Math.min(totalLoanAmount * 0.001, 15);
  score -= Math.min(lateCount * 5, 20);
  score = Math.max(0, Math.min(100, Math.round(score)));

  let riskLevel = 'low';
  let riskLabel = 'Bajo';
  let riskColor = '#2ECC71';
  if (score >= 70) { riskLevel = 'low'; riskLabel = 'Bajo'; riskColor = '#2ECC71'; }
  else if (score >= 45) { riskLevel = 'medium'; riskLabel = 'Medio'; riskColor = '#F39C12'; }
  else if (score >= 20) { riskLevel = 'high'; riskLabel = 'Alto'; riskColor = '#E67E22'; }
  else { riskLevel = 'critical'; riskLabel = 'Crítico'; riskColor = '#E74C3C'; }

  return {
    score, riskLevel, riskLabel, riskColor,
    paymentRate: (paymentRate * 100).toFixed(0),
    avgDaysOverdue: Math.round(avgDaysOverdue),
    totalLoanAmount,
    lateCount,
    totalPaid: paidInst.length,
    totalInstallments: totalInst,
    name: profile?.fullName || client.nombre || client.email,
  };
}

export default function AdminCollectionScore({ setTab }) {
  const { currentUser } = useAuth();
  const { clients, loans, getKycProfile } = useData();

  const [riskFilter, setRiskFilter] = useState('all');
  const [sortKey, setSortKey] = useState('score');
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState('');

  const scoredClients = useMemo(() => {
    return clients.map(c => ({
      ...calculateCollectionScore(c, loans, getKycProfile),
      client: c,
    }));
  }, [clients, loans, getKycProfile]);

  const filtered = useMemo(() => {
    let result = [...scoredClients];
    if (riskFilter !== 'all') {
      result = result.filter(c => c.riskLevel === riskFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.client.email.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      let va, vb;
      switch (sortKey) {
        case 'score': va = a.score; vb = b.score; break;
        case 'avgDays': va = a.avgDaysOverdue; vb = b.avgDaysOverdue; break;
        case 'lateCount': va = a.lateCount; vb = b.lateCount; break;
        case 'amount': va = a.totalLoanAmount; vb = b.totalLoanAmount; break;
        case 'name': va = a.name; vb = b.name; break;
        default: va = a.score; vb = b.score;
      }
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return result;
  }, [scoredClients, riskFilter, sortKey, sortAsc, search]);

  const riskCounts = useMemo(() => ({
    low: scoredClients.filter(c => c.riskLevel === 'low').length,
    medium: scoredClients.filter(c => c.riskLevel === 'medium').length,
    high: scoredClients.filter(c => c.riskLevel === 'high').length,
    critical: scoredClients.filter(c => c.riskLevel === 'critical').length,
  }), [scoredClients]);

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'name'); }
  };

  const SortHeader = ({ label, field }) => (
    <th onClick={() => handleSort(field)} style={{ cursor: 'pointer', userSelect: 'none' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {label} <ArrowUpDown size={12} style={{ opacity: sortKey === field ? 1 : 0.3 }} />
      </span>
    </th>
  );

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert size={22} style={{ color: 'var(--primary)' }} />
          Score de Cobranza
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
          Clasifica a tus clientes por nivel de riesgo de cobro
        </p>
      </div>

      {/* Risk Summary */}
      <div className="grid-4col" style={{ gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Bajo', count: riskCounts.low, color: '#2ECC71', icon: <ShieldCheck size={18} /> },
          { label: 'Medio', count: riskCounts.medium, color: '#F39C12', icon: <Shield size={18} /> },
          { label: 'Alto', count: riskCounts.high, color: '#E67E22', icon: <ShieldAlert size={18} /> },
          { label: 'Crítico', count: riskCounts.critical, color: '#E74C3C', icon: <ShieldAlert size={18} /> },
        ].map(r => (
          <div key={r.label} className="premium-card" style={{ padding: '16px', borderLeft: `4px solid ${r.color}`, cursor: 'pointer' }} onClick={() => setRiskFilter(riskFilter === r.label.toLowerCase() ? 'all' : r.label.toLowerCase())}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ color: r.color }}>{r.icon}</div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: r.color }}>{r.count}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Riesgo {r.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="premium-card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Filter size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>
        <select className="form-control" value={riskFilter} onChange={e => setRiskFilter(e.target.value)} style={{ width: '160px' }}>
          <option value="all">Todos los niveles</option>
          <option value="low">Bajo</option>
          <option value="medium">Medio</option>
          <option value="high">Alto</option>
          <option value="critical">Crítico</option>
        </select>
      </div>

      {/* Table */}
      <div className="premium-card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <SortHeader label="Cliente" field="name" />
                <SortHeader label="Score" field="score" />
                <th>Nivel de Riesgo</th>
                <SortHeader label="% Pagos" field="score" />
                <SortHeader label="Días Prom. Mora" field="avgDays" />
                <SortHeader label="Cuotas Vencidas" field="lateCount" />
                <SortHeader label="Monto Total" field="amount" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                    No hay clientes con los filtros seleccionados.
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c.client.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--surface-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={14} style={{ color: 'var(--text-secondary)' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '13px' }}>{c.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{c.client.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: `3px solid ${c.riskColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', color: c.riskColor }}>
                      {c.score}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 12px', borderRadius: '99px', backgroundColor: `${c.riskColor}15`, color: c.riskColor, border: `1px solid ${c.riskColor}30` }}>
                      {c.riskLabel}
                    </span>
                  </td>
                  <td style={{ fontWeight: '600', color: parseFloat(c.paymentRate) >= 80 ? '#2ECC71' : parseFloat(c.paymentRate) >= 50 ? '#F39C12' : '#E74C3C' }}>
                    {c.paymentRate}%
                  </td>
                  <td style={{ fontWeight: '600', color: c.avgDaysOverdue > 30 ? '#E74C3C' : c.avgDaysOverdue > 10 ? '#F39C12' : 'var(--text)' }}>
                    {c.avgDaysOverdue}
                  </td>
                  <td style={{ fontWeight: '600' }}>{c.lateCount}</td>
                  <td style={{ fontWeight: '700', color: 'var(--primary)' }}>${c.totalLoanAmount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
