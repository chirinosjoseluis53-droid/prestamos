import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { calculateCreditScore } from './creditScoringHelper';
import { formatLoanDate, getCreatedAt } from '../lib/loanHelpers';
import { escapeHtml, validateFinancialInput } from '../lib/sanitize';
import localdb from '../lib/localdb';
import { openContractPrint } from '../lib/contractTemplate';
import { Check, X, ShieldCheck, AlertCircle, FileText, Upload, MapPin, Navigation, DollarSign, CheckCircle2, Percent } from 'lucide-react';

function AdminClientMap({ latitude, longitude, country }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);

  useEffect(() => {
    if (!latitude || !longitude || !mapRef.current) return;

    const loadLeaflet = async () => {
      if (!window.L) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        await new Promise(resolve => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      const L = window.L;
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      const map = L.map(mapRef.current, { zoomControl: false }).setView([lat, lng], 15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(map);

      L.marker([lat, lng]).addTo(map)
        .bindPopup(`<b>${escapeHtml(country || 'Ubicación')}</b><br/>Lat: ${Number(lat).toFixed(4)}, Lng: ${Number(lng).toFixed(4)}`)
        .openPopup();

      leafletMapRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
    };

    loadLeaflet();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [latitude, longitude, country]);

  if (!latitude || !longitude) return null;

  return (
    <div style={{ backgroundColor: 'var(--surface-light)', padding: '12px', borderRadius: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <MapPin size={16} style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: '12px', fontWeight: '600' }}>Ubicación del Cliente ({country})</span>
      </div>
      <div style={{ height: '200px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

export default function AdminRequests() {
  const { currentUser } = useAuth();
  const { loans, getKycProfile, approveLoan, rejectLoan, refreshLoans } = useData();
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [adminRate, setAdminRate] = useState(null);

  const [paymentType, setPaymentType] = useState('installments');
  const [disbursementMethod, setDisbursementMethod] = useState('cash');
  const [interestRate, setInterestRate] = useState('5');
  const [installmentCount, setInstallmentCount] = useState('12');
  const [firstPaymentDate, setFirstPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [disbursementProof, setDisbursementProof] = useState(null);
  const [disbursementProofPreview, setDisbursementProofPreview] = useState(null);

  useEffect(() => {
    refreshLoans();
    const loadRate = async () => {
      if (currentUser?.id) {
        const rate = await localdb.getAdminInterestRate(currentUser.id);
        if (rate !== null) {
          setAdminRate(rate);
          setInterestRate(String(rate));
        }
      }
    };
    loadRate();
  }, []);

  const pendingLoans = loans.filter(l => l.status === 'pending');

  const handleReviewClick = (loan) => {
    setSelectedLoan(loan);
    setPaymentType('installments');
    setDisbursementMethod('cash');
    setInterestRate(String(adminRate ?? 5));
    setInstallmentCount(String(loan.installments_count || 12));
    setFirstPaymentDate(new Date().toISOString().split('T')[0]);
    setDisbursementProof(null);
    setDisbursementProofPreview(null);
  };

  const handleSaveRate = async () => {
    const newRate = parseFloat(interestRate);
    if (isNaN(newRate) || newRate < 0 || newRate > 100) { alert('Ingresa una tasa válida (0-100%)'); return; }
    try {
      await localdb.saveAdminInterestRate(currentUser.id, newRate);
      setAdminRate(newRate);
      alert('Tasa de interés actualizada correctamente.');
    } catch (e) {
      alert('Error al guardar la tasa.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setDisbursementProof(file); setDisbursementProofPreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleApprove = async () => {
    if (!paymentType) { alert('Selecciona el tipo de pago'); return; }
    if (!disbursementMethod) { alert('Selecciona el método de desembolso'); return; }
    if (!firstPaymentDate) { alert('Ingresa la fecha del primer pago'); return; }
    if (paymentType === 'installments' && !installmentCount) { alert('Indica el número de cuotas'); return; }

    const rateErr = validateFinancialInput(interestRate, { label: 'Tasa de interés', min: 0, max: 100, required: true, allowDecimal: true });
    if (rateErr) { alert(rateErr); return; }
    if (paymentType === 'installments') {
      const instErr = validateFinancialInput(installmentCount, { label: 'Número de cuotas', min: 1, max: 360, required: true, allowDecimal: false });
      if (instErr) { alert(instErr); return; }
    }

    if (window.confirm(`¿Aprobar préstamo de $${selectedLoan.amount} a ${selectedLoan.clientEmail}?\nTasa: ${interestRate}%`)) {
      try {
        await approveLoan(selectedLoan.id, {
          paymentType, disbursementMethod, interestRate, installmentCount, firstPaymentDate, disbursementProof,
        });
        alert('Préstamo aprobado correctamente.');
        setSelectedLoan(null);
        refreshLoans();
      } catch (error) {
        alert('Error al aprobar: ' + error.message);
      }
    }
  };

  const handleReject = async () => {
    if (window.confirm('¿Seguro que deseas rechazar esta solicitud?')) {
      try {
        await rejectLoan(selectedLoan.id, 'Rechazado por el administrador');
        alert('Solicitud rechazada.');
        setSelectedLoan(null);
        refreshLoans();
      } catch (error) {
        alert('Error al rechazar: ' + error.message);
      }
    }
  };

  const handlePrintContract = () => {
    const kycProfile = getKycProfile(selectedLoan.clientEmail);
    const score = calculateCreditScore(selectedLoan.clientEmail, loans, getKycProfile);
    openContractPrint({
      id: selectedLoan.id,
      client_name: kycProfile?.fullName || selectedLoan.clientEmail,
      client_email: selectedLoan.clientEmail,
      amount: selectedLoan.amount,
      currency: selectedLoan.currency || 'USD',
      interest_rate: interestRate,
      installments_count: installmentCount,
      purpose: selectedLoan.purpose || 'Préstamo personal',
      signed_at: getCreatedAt(selectedLoan),
      signature: `FIRMADO DIGITALMENTE POR: ${(kycProfile?.fullName || selectedLoan.clientEmail).toUpperCase()}`,
    }, {
      showAdminSignature: true,
      adminName: currentUser?.name || 'Administrador',
      creditScore: score,
    });
  };

  return (
    <div className="admin-requests animate-fade">
      {selectedLoan ? (
        <div className="grid-2col-wide">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="premium-card" style={{ padding: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedLoan(null)} style={{ marginBottom: '16px', fontSize: '13px' }}>← Volver al Listado</button>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Revisar Solicitud</h3>
              {(() => {
                const profile = getKycProfile(selectedLoan.clientEmail);
                const score = calculateCreditScore(selectedLoan.clientEmail, loans, getKycProfile);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      {profile?.profilePhoto ? (
                        <img src={profile.profilePhoto} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} alt="Profile" />
                      ) : (
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(15,164,108,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '24px', fontWeight: 'bold' }}>
                          {(profile?.fullName || 'C')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>{profile?.fullName || selectedLoan.clientEmail}</h4>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedLoan.clientEmail}</div>
                        {profile?.phone && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tel: {profile.phone}</div>}
                      </div>
                    </div>
                    {profile?.latitude && profile?.longitude && (
                      <AdminClientMap latitude={profile.latitude} longitude={profile.longitude} country={profile.country} />
                    )}
                    <div style={{ border: `1.5px solid ${score.color}`, padding: '14px', borderRadius: '12px', backgroundColor: `${score.color}05` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Score Crediticio</span>
                        <span style={{ color: score.color, fontWeight: '800', fontSize: '18px' }}>{score.score} pts ({score.label})</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{score.description}</p>
                    </div>
                    {profile?.idFrontPhoto && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '12px', marginTop: '8px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Frente ID</span>
                          <img src={profile.idFrontPhoto} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} alt="ID Frente" />
                        </div>
                        {profile?.idBackPhoto && (
                          <div>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Reverso ID</span>
                            <img src={profile.idBackPhoto} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} alt="ID Reverso" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="premium-card" style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Monto Solicitado</div>
              <div style={{ fontSize: '40px', fontWeight: '800', color: 'var(--primary)', margin: '8px 0' }}>
                ${parseFloat(selectedLoan.amount).toLocaleString()} {selectedLoan.currency || 'USD'}
              </div>
              <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text)' }}>Motivo: {selectedLoan.purpose || 'Personal'}</div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Solicitado el: {formatLoanDate(getCreatedAt(selectedLoan))}</span>
              {selectedLoan.installments_count > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Plazo: {selectedLoan.installments_count} meses</div>
              )}
            </div>
          </div>

          <div className="premium-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: 0 }}>Condiciones de Aprobación</h3>

            <button type="button" className="btn btn-secondary" onClick={handlePrintContract}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <FileText size={16} /> Generar Pagaré / Contrato (PDF)
            </button>

            {/* Current Admin Rate Banner */}
            {adminRate !== null && (
              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(15,164,108,0.08)', border: '1px solid rgba(15,164,108,0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Percent size={16} style={{ color: 'var(--primary)' }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tasa vigente: </span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)' }}>{adminRate}%</span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Método de Desembolso</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[{ id: 'cash', label: '💵 Efectivo' }, { id: 'zelle', label: '💸 Zelle' }, { id: 'transfer', label: '🏦 Transfer' }].map(opt => (
                  <button key={opt.id} className={`btn ${disbursementMethod === opt.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }} onClick={() => setDisbursementMethod(opt.id)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Pago del Cliente</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[{ id: 'single', label: '💰 Pago Único' }, { id: 'installments', label: '📅 Por Cuotas' }].map(opt => (
                  <button key={opt.id} className={`btn ${paymentType === opt.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }} onClick={() => setPaymentType(opt.id)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {paymentType === 'installments' && (
              <div className="form-group">
                <label className="form-label">Número de Cuotas</label>
                <input type="number" className="form-control" placeholder="Ej: 12" value={installmentCount} onChange={e => setInstallmentCount(e.target.value)} />
              </div>
            )}

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ margin: 0 }}>Tasa de Interés %</label>
                <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={handleSaveRate}>
                  Guardar como tasa global
                </button>
              </div>
              <input type="number" className="form-control" placeholder="5" step="0.5" value={interestRate} onChange={e => setInterestRate(e.target.value)} />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {adminRate !== null ? `Vigente: ${adminRate}% — Puedes modificarlo para este préstamo` : 'Define una tasa global para que se aplique a todas las solicitudes'}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Fecha del Primer Pago</label>
              <input type="date" className="form-control" value={firstPaymentDate} onChange={e => setFirstPaymentDate(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Comprobante de Desembolso (Opcional)</label>
              <div className="file-upload-box" onClick={() => document.getElementById('disbursement-proof-input').click()} style={{ padding: '20px', height: '110px' }}>
                {disbursementProofPreview ? (
                  <img src={disbursementProofPreview} style={{ maxHeight: '100%', objectFit: 'contain' }} alt="Comprobante" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <Upload size={24} style={{ color: 'var(--text-secondary)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Subir Comprobante</span>
                  </div>
                )}
                <input type="file" id="disbursement-proof-input" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1, borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={handleReject}>
                <X size={16} /> Rechazar
              </button>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleApprove}>
                <Check size={16} /> Aprobar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="requests-list">
          {/* Admin Interest Rate Quick Setting */}
          <div className="premium-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Percent size={18} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Tasa de interés vigente:</span>
              <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)' }}>{adminRate ?? 'No definida'}%</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="number" className="form-control" step="0.5" placeholder="Tasa %"
                style={{ width: '100px', padding: '6px 10px', fontSize: '13px' }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0 && val <= 100) {
                      await localdb.saveAdminInterestRate(currentUser.id, val);
                      setAdminRate(val);
                      setInterestRate(String(val));
                      e.target.value = '';
                    }
                  }
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Enter para guardar</span>
            </div>
          </div>

          {pendingLoans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <CheckCircle2 size={48} style={{ color: 'var(--success)', marginBottom: '16px', display: 'inline-block' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', margin: '0 0 6px 0' }}>¡Todo al día!</h3>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No hay solicitudes de préstamos pendientes por revisar.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {pendingLoans.map(loan => {
                const profile = getKycProfile(loan.clientEmail);
                const hasKyc = !!profile?.kycCompletedAt || !!profile?.faceVerified;
                return (
                  <div key={loan.id} className="premium-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      {profile?.profilePhoto ? (
                        <img src={profile.profilePhoto} style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover' }} alt="Avatar" />
                      ) : (
                        <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: 'rgba(15,164,108,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold' }}>
                          {(profile?.fullName || 'C')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700' }}>{profile?.fullName || loan.clientEmail}</h4>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Sol. #{loan.id.slice(-6)} • {formatLoanDate(getCreatedAt(loan))} • {loan.currency || 'USD'}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          {hasKyc ? (
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--success)', backgroundColor: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <ShieldCheck size={10} /> KYC Listo
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--danger)', backgroundColor: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertCircle size={10} /> Sin KYC
                            </span>
                          )}
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', backgroundColor: 'var(--surface-light)', padding: '2px 6px', borderRadius: '6px' }}>
                            {loan.purpose || 'Personal'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--primary)' }}>
                        ${parseFloat(loan.amount).toLocaleString()} {loan.currency || 'USD'}
                      </span>
                      <button className="btn btn-primary" onClick={() => handleReviewClick(loan)} style={{ padding: '6px 14px', fontSize: '12px' }}>
                        Revisar →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
