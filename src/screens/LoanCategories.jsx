import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { FolderOpen, Plus, Pencil, Trash2, Save, CheckCheck, ArrowLeft, X, Tag } from 'lucide-react';

const STORAGE_KEY = '@admin_loan_categories';

const PREDEFINED_CATEGORIES = [
  { id: '1', name: 'Consumo', description: 'Compra de bienes personales, electrodomésticos, ropa, etc.', icon: '🛒', minAmount: '100', maxAmount: '5000', minRate: '5', maxRate: '15' },
  { id: '2', name: 'Negocio / Emprendimiento', description: 'Capital para iniciar o expandir un negocio', icon: '💼', minAmount: '500', maxAmount: '50000', minRate: '8', maxRate: '20' },
  { id: '3', name: 'Salud', description: 'Gastos médicos, tratamientos, medicamentos', icon: '🏥', minAmount: '200', maxAmount: '10000', minRate: '3', maxRate: '12' },
  { id: '4', name: 'Educación', description: 'Matrícula, cursos, materiales educativos', icon: '📚', minAmount: '100', maxAmount: '8000', minRate: '3', maxRate: '10' },
  { id: '5', name: 'Vivienda', description: 'Mejoras del hogar, alquiler, depósito', icon: '🏠', minAmount: '500', maxAmount: '20000', minRate: '5', maxRate: '15' },
  { id: '6', name: 'Vehículo', description: 'Compra o reparación de vehículo', icon: '🚗', minAmount: '1000', maxAmount: '30000', minRate: '8', maxRate: '18' },
  { id: '7', name: 'Emergencia', description: 'Gastos imprevistos y urgentes', icon: '🚨', minAmount: '50', maxAmount: '3000', minRate: '5', maxRate: '20' },
];

function EmptyCategory() {
  return { id: Date.now().toString(), name: '', description: '', icon: '📌', minAmount: '', maxAmount: '', minRate: '', maxRate: '' };
}

export default function LoanCategories({ setTab }) {
  const { currentUser } = useAuth();
  const storageKey = `${STORAGE_KEY}_${currentUser?.id || 'default'}`;

  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EmptyCategory());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try { setCategories(JSON.parse(raw)); } catch (e) { setCategories(PREDEFINED_CATEGORIES); }
    } else {
      setCategories(PREDEFINED_CATEGORIES);
    }
  }, [storageKey]);

  const persist = (updated) => {
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const handleSave = () => {
    if (!form.name.trim()) { alert('El nombre es obligatorio'); return; }
    let updated;
    if (editingId) {
      updated = categories.map(c => c.id === editingId ? { ...c, ...form } : c);
    } else {
      updated = [...categories, { ...form, id: Date.now().toString() }];
    }
    setCategories(updated);
    persist(updated);
    setForm(EmptyCategory());
    setEditingId(null);
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleEdit = (cat) => {
    setForm({ ...cat });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (!window.confirm('¿Eliminar esta categoría?')) return;
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    persist(updated);
  };

  const handleReset = () => {
    if (!window.confirm('¿Restablecer categorías predeterminadas?')) return;
    setCategories(PREDEFINED_CATEGORIES);
    persist(PREDEFINED_CATEGORIES);
  };

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="top-bar-btn" onClick={() => setTab('dashboard')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FolderOpen size={22} style={{ color: 'var(--primary)' }} />
              Categorías de Préstamo
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
              Administra las categorías disponibles para solicitudes de préstamo
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            Restablecer
          </button>
          <button className="btn btn-primary" onClick={() => { setForm(EmptyCategory()); setEditingId(null); setShowForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <Plus size={16} /> Nueva Categoría
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="grid-2col" style={{ gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nombre *</label>
                  <input type="text" className="form-control" placeholder="Ej. Consumo" value={form.name} onChange={e => setField('name', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Icono (emoji)</label>
                  <input type="text" className="form-control" placeholder="🛒" value={form.icon} onChange={e => setField('icon', e.target.value)} style={{ width: '80px', textAlign: 'center', fontSize: '20px' }} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Descripción</label>
                <input type="text" className="form-control" placeholder="Descripción breve de la categoría" value={form.description} onChange={e => setField('description', e.target.value)} />
              </div>
              <div className="grid-2col" style={{ gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Monto Mínimo ($)</label>
                  <input type="number" className="form-control" placeholder="100" value={form.minAmount} onChange={e => setField('minAmount', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Monto Máximo ($)</label>
                  <input type="number" className="form-control" placeholder="5000" value={form.maxAmount} onChange={e => setField('maxAmount', e.target.value)} />
                </div>
              </div>
              <div className="grid-2col" style={{ gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tasa Mínima (%)</label>
                  <input type="number" className="form-control" placeholder="5" value={form.minRate} onChange={e => setField('minRate', e.target.value)} step="0.5" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tasa Máxima (%)</label>
                  <input type="number" className="form-control" placeholder="15" value={form.maxRate} onChange={e => setField('maxRate', e.target.value)} step="0.5" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingId ? 'Actualizar' : 'Crear Categoría'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '16px' }}>
        {categories.map(cat => (
          <div key={cat.id} className="premium-card" style={{ padding: '20px', transition: 'transform 0.2s', cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>{cat.icon}</span>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>{cat.name}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: '1.4' }}>{cat.description}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-secondary" style={{ padding: '6px', fontSize: '12px' }} onClick={() => handleEdit(cat)}>
                  <Pencil size={14} />
                </button>
                <button className="btn btn-secondary" style={{ padding: '6px', fontSize: '12px', color: 'var(--danger)' }} onClick={() => handleDelete(cat.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '10px', backgroundColor: 'var(--surface-light)', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Monto</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>
                  ${cat.minAmount || '0'} — ${cat.maxAmount || '∞'}
                </div>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'var(--surface-light)', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Tasa</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)' }}>
                  {cat.minRate || '0'}% — {cat.maxRate || '0'}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="premium-card" style={{ padding: '60px', textAlign: 'center' }}>
          <Tag size={48} style={{ color: 'var(--text-secondary)', opacity: 0.3, margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Sin categorías</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Crea categorías para que los clientes selectionen al solicitar un préstamo.</p>
        </div>
      )}
    </div>
  );
}
