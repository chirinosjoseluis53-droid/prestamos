import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Plus, Trash2, Car, Home, Smartphone, Package, Upload, X, CheckCircle2 } from 'lucide-react';

const COLLATERAL_KEY = '@prestamos_collateral';
const ASSET_TYPES = [
  { id: 'vehicle', label: 'Vehículo', icon: <Car size={18} /> },
  { id: 'property', label: 'Propiedad', icon: <Home size={18} /> },
  { id: 'electronics', label: 'Electrónicos', icon: <Smartphone size={18} /> },
  { id: 'other', label: 'Otro', icon: <Package size={18} /> },
];

export default function ClientCollateral() {
  const { currentUser } = useAuth();
  const [collaterals, setCollaterals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [assetType, setAssetType] = useState('vehicle');
  const [description, setDescription] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);

  useEffect(() => {
    const key = `${COLLATERAL_KEY}_${currentUser?.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { setCollaterals(JSON.parse(saved)); } catch { setCollaterals([]); }
    }
  }, [currentUser]);

  const saveCollaterals = (list) => {
    const key = `${COLLATERAL_KEY}_${currentUser?.id}`;
    localStorage.setItem(key, JSON.stringify(list));
    setCollaterals(list);
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreviews(prev => [...prev, ev.target.result]);
        setPhotoFiles(prev => [...prev, ev.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !estimatedValue) {
      alert('Completa la descripción y el valor estimado.');
      return;
    }
    const newCollateral = {
      id: Date.now().toString(),
      type: assetType,
      description,
      estimatedValue: parseFloat(estimatedValue),
      registrationNumber,
      photos: photoFiles,
      createdAt: new Date().toISOString(),
    };
    saveCollaterals([newCollateral, ...collaterals]);
    setDescription('');
    setEstimatedValue('');
    setRegistrationNumber('');
    setAssetType('vehicle');
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setShowForm(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar esta garantía?')) {
      saveCollaterals(collaterals.filter(c => c.id !== id));
    }
  };

  const getTypeInfo = (type) => ASSET_TYPES.find(t => t.id === type) || ASSET_TYPES[3];

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Garantías Registradas</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Registra y gestiona tus bienes como garantía</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '13px' }}>
          {showForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Nueva Garantía</>}
        </button>
      </div>

      {showForm && (
        <div className="premium-card animate-fade" style={{ padding: '24px', marginBottom: '24px', borderColor: 'var(--primary)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Registrar Nueva Garantía</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Tipo de Bien</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {ASSET_TYPES.map(t => (
                  <button key={t.id} type="button" onClick={() => setAssetType(t.id)} style={{
                    padding: '12px 8px', borderRadius: '12px', border: `2px solid ${assetType === t.id ? 'var(--primary)' : 'var(--border)'}`,
                    backgroundColor: assetType === t.id ? 'rgba(37,99,235,0.05)' : 'var(--surface-light)',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  }}>
                    <div style={{ color: assetType === t.id ? 'var(--primary)' : 'var(--text-secondary)' }}>{t.icon}</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: assetType === t.id ? 'var(--primary)' : 'var(--text)' }}>{t.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Descripción</label>
              <input type="text" className="form-control" placeholder="Ej: Toyota Corolla 2020" value={description} onChange={e => setDescription(e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Valor Estimado ($)</label>
                <input type="number" className="form-control" placeholder="0.00" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nº Registro / Placa</label>
                <input type="text" className="form-control" placeholder="Opcional" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Fotos del Bien</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {photoPreviews.map((preview, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removePhoto(idx)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={10} style={{ color: '#fff' }} />
                    </button>
                  </div>
                ))}
                <div onClick={() => document.getElementById('collateral-photo-input').click()} style={{ width: '80px', height: '80px', borderRadius: '10px', border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '4px' }}>
                  <Upload size={16} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Foto</span>
                </div>
                <input type="file" id="collateral-photo-input" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoUpload} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Shield size={16} /> Registrar Garantía
            </button>
          </form>
        </div>
      )}

      {collaterals.length === 0 ? (
        <div className="premium-card" style={{ padding: '40px', textAlign: 'center' }}>
          <Shield size={48} style={{ color: 'var(--text-secondary)', margin: '0 auto 16px auto', opacity: 0.4 }} />
          <h3 style={{ fontSize: '16px', color: 'var(--text)' }}>Sin garantías registradas</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>Registra un bien para respaldar tu solicitud de crédito.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {collaterals.map(c => {
            const typeInfo = getTypeInfo(c.type);
            return (
              <div key={c.id} className="premium-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      {typeInfo.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{c.description}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{typeInfo.label}</div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px' }}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--surface-light)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Valor Estimado</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>${c.estimatedValue.toFixed(2)}</span>
                  </div>
                  {c.registrationNumber && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--surface-light)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Registro</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{c.registrationNumber}</span>
                    </div>
                  )}
                </div>

                {c.photos && c.photos.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {c.photos.map((photo, idx) => (
                      <img key={idx} src={photo} alt="" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                    ))}
                  </div>
                )}

                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Registrado: {new Date(c.createdAt).toLocaleDateString('es-ES')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
