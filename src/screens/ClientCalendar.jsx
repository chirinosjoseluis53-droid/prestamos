import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { getDueDate } from '../lib/loanHelpers';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const WEEKDAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const pad = (n) => String(n).padStart(2, '0');
const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const todayStart = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

const getEventStatus = (inst) => {
  if (inst.status === 'paid') return 'paid';
  const due = getDueDate(inst);
  if (!due) return 'pending';
  const dueDate = new Date(`${due}T00:00:00`);
  if (dueDate < todayStart()) return 'overdue';
  if (inst.status === 'submitted') return 'submitted';
  return 'pending';
};

const STATUS_LABELS = { paid: 'Pagada', pending: 'Pendiente', overdue: 'Vencida', submitted: 'En revisión' };
const STATUS_COLORS = { paid: 'var(--success)', pending: 'var(--primary)', overdue: 'var(--danger)', submitted: 'var(--warning)' };

export default function ClientCalendar() {
  const { loans } = useData();
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));

  const eventsByDate = useMemo(() => {
    const map = {};
    loans.filter(l => l.status === 'approved').forEach(loan => {
      (loan.installments || []).forEach(inst => {
        const due = getDueDate(inst);
        if (!due) return;
        if (!map[due]) map[due] = [];
        map[due].push({
          id: inst.id,
          loanId: loan.id,
          installment: inst,
          amount: parseFloat(inst.amount || 0),
          status: getEventStatus(inst),
          number: inst.number,
          purpose: loan.purpose,
        });
      });
    });
    return map;
  }, [loans]);

  const monthStats = useMemo(() => {
    let pending = 0, overdue = 0, paid = 0;
    Object.entries(eventsByDate).forEach(([dateKey, events]) => {
      const d = new Date(`${dateKey}T00:00:00`);
      if (d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) return;
      events.forEach(e => {
        if (e.status === 'paid') paid++; else if (e.status === 'overdue') overdue++; else pending++;
      });
    });
    return { pending, overdue, paid };
  }, [eventsByDate, viewYear, viewMonth]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  const changeMonth = (delta) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const goToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(toDateKey(now));
  };

  const selectedEvents = eventsByDate[selectedDate] || [];
  const todayKey = toDateKey(new Date());

  return (
    <div className="animate-fade">
      <div className="grid-3col-stats" style={{ marginBottom: '24px' }}>
        <div className="premium-card" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(15,164,108,0.1)', color: 'var(--primary)' }}><Clock size={20} /></div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800' }}>{monthStats.pending}</div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pendientes</span>
          </div>
        </div>
        <div className="premium-card" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}><AlertCircle size={20} /></div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--danger)' }}>{monthStats.overdue}</div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Vencidas</span>
          </div>
        </div>
        <div className="premium-card" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}><CheckCircle size={20} /></div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--success)' }}>{monthStats.paid}</div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pagadas</span>
          </div>
        </div>
      </div>

      <div className="grid-2col-even">
        <div className="premium-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => changeMonth(-1)}><ChevronLeft size={16} /></button>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>{MONTHS[viewMonth]} {viewYear}</h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => changeMonth(1)}><ChevronRight size={16} /></button>
            </div>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={goToday}>Hoy</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: '600', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            {WEEKDAYS.map(d => <div key={d}>{d}</div>)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} style={{ aspectRatio: '1' }} />;
              const key = `${viewYear}-${pad(viewMonth+1)}-${pad(day)}`;
              const dayEvents = eventsByDate[key] || [];
              const isSelected = selectedDate === key;
              const isToday = key === todayKey;
              const hasOverdue = dayEvents.some(e => e.status === 'overdue');
              const dotColor = hasOverdue ? 'var(--danger)' : dayEvents.some(e => e.status === 'submitted') ? 'var(--warning)' : dayEvents.some(e => e.status === 'pending') ? 'var(--primary)' : dayEvents.some(e => e.status === 'paid') ? 'var(--success)' : null;

              return (
                <div key={key} onClick={() => setSelectedDate(key)} className="calendar-cell"
                  style={{ aspectRatio: '1', borderRadius: '10px', border: '1px solid', borderColor: isSelected ? 'var(--primary)' : isToday ? 'rgba(15,164,108,0.3)' : 'var(--border)', backgroundColor: isSelected ? 'rgba(15,164,108,0.1)' : 'var(--surface-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', transition: 'all 0.15s ease' }}>
                  <span style={{ fontSize: '14px', fontWeight: isToday || isSelected ? 'bold' : 'normal', color: isSelected ? 'var(--primary)' : 'var(--text)' }}>{day}</span>
                  {dayEvents.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                      {dotColor && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColor }} />}
                      {dayEvents.length > 1 && <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{dayEvents.length}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="premium-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
            {selectedEvents.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '150px', gap: '10px' }}>
                <CalendarIcon size={32} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sin cuotas este día</span>
              </div>
            ) : (
              selectedEvents.map(event => (
                <div key={event.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-light)' }}>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>Cuota #{event.number}</h5>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>${event.amount.toFixed(2)}{event.purpose ? ` · ${event.purpose}` : ''}</span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px', color: STATUS_COLORS[event.status], border: `1px solid ${STATUS_COLORS[event.status]}33` }}>
                    {STATUS_LABELS[event.status]}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
