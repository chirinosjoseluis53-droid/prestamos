import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import localdb from '../lib/localdb';
import { openContractPrint } from '../lib/contractTemplate';
import { Search, User, Shield, ShieldOff, Eye, X, CheckCircle, XCircle, MapPin, Phone, CreditCard, Activity, FileText, Download, ArrowLeft, Navigation } from 'lucide-react';

function CreditScoreBadge({ score, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `3px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>
        {score}
      </div>
      <span style={{ fontSize: '12px', fontWeight: '600', color }}>{label}</span>
    </div>
  );
}

function ClientMap({ latitude, longitude, country }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);

  const openDirections = () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

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
        .bindPopup(`<b>${country || 'Ubicación'}</b><br/>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`)
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
    <div style={{ marginTop: '20px' }}>
      <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MapPin size={14} /> Ubicación en Mapa
      </h4>
      <div onClick={openDirections} style={{ height: '220px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', cursor: 'pointer' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>
      <button className="btn btn-primary" onClick={openDirections} style={{ width: '100%', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <Navigation size={16} /> Cómo llegar (Google Maps)
      </button>
    </div>
  );
}

export default function AdminClients() {
  const { clients, loans, getKycProfile, refreshKycProfiles } = useData();

  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [kycDetail, setKycDetail] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [contracts, setContracts] = useState({});
  const [loadingContract, setLoadingContract] = useState(null);

  const filtered = clients.filter(c =>
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.nombre || '').toLowerCase().includes(search.toLowerCase())
  );

  const getClientScore = (clientEmail) => {
    const profile = getKycProfile(clientEmail);
    const clientLoans = loans.filter(l => l.clientEmail === clientEmail);

    let kycPts = 0, profilePts = 0, paymentsPts = 30, completedPts = 0;

    if (profile) {
      if (profile.faceVerified) kycPts += 15;
      if (profile.idFrontPhoto && profile.idBackPhoto) kycPts += 10;
      if (profile.fullName) profilePts += 3;
      if (profile.idNumber) profilePts += 3;
      if (profile.phone) profilePts += 2;
      if (profile.address) profilePts += 2;
    }

    const completedLoans = clientLoans.filter(
      l => l.status === 'approved' && l.installments?.every(i => i.status === 'paid')
    );
    completedPts = Math.min(completedLoans.length * 10, 20);

    let totalInst = 0, paidInst = 0, rejectedInst = 0;
    clientLoans.forEach(loan => {
      (loan.installments || []).forEach(i => {
        totalInst++;
        if (i.status === 'paid') paidInst++;
        if (i.status === 'rejected') rejectedInst++;
      });
    });

    if (totalInst > 0) {
      paymentsPts = Math.round((paidInst / totalInst) * 45);
      paymentsPts = Math.max(0, paymentsPts - rejectedInst * 5);
    }

    const score = Math.min(100, Math.max(0, kycPts + profilePts + paymentsPts + completedPts));
    let label = 'Medio', color = '#F59E0B';
    if (score >= 85) { label = 'Excelente'; color = '#10B981'; }
    else if (score >= 70) { label = 'Bueno'; color = '#3B82F6'; }
    else if (score < 50) { label = 'Alto Riesgo'; color = '#EF4444'; }

    return { score, label, color };
  };

  const handleToggleStatus = async (client) => {
    const newStatus = client.status === 'blocked' ? 'active' : 'blocked';
    if (!window.confirm(`¿${newStatus === 'blocked' ? 'Bloquear' : 'Desbloquear'} a ${client.email}?`)) return;
    setProcessing(client.id);
    try {
      await localdb.updateUserStatus('clients', client.id, newStatus);
      // Refresh
      window.location.reload();
    } catch (e) {
      alert('Error actualizando estado: ' + e.message);
    } finally {
      setProcessing(null);
    }
  };

  const openKycDetail = (client) => {
    const profile = getKycProfile(client.email);
    setSelectedClient(client);
    setKycDetail(profile);
  };

  const downloadContract = async (client) => {
    setLoadingContract(client.id);
    try {
      const clientContracts = await localdb.getSignedContractsByClient(client.id);
      if (!clientContracts || clientContracts.length === 0) {
        alert('Este cliente no tiene contratos firmados.');
        setLoadingContract(null);
        return;
      }
      openContractPrint(clientContracts[0]);
    } catch (error) {
      alert('Error al generar contrato: ' + error.message);
    } finally {
      setLoadingContract(null);
    }
  };

  if (selectedClient) {
    const isBlocked = selectedClient.status === 'blocked';
    const clientLoans = loans.filter(l => l.clientEmail === selectedClient.email);
    
    return (
      <div className="animate-fade">
        <button className="btn btn-secondary" onClick={() => setSelectedClient(null)} style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} /> Volver a Clientes
        </button>

        <div className="grid-2col" style={{ gap: '24px', alignItems: 'start' }}>
          {/* Columna Izquierda (Perfil) */}
          <div className="premium-card">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
               {kycDetail?.profilePhoto ? (
                 <img src={kycDetail.profilePhoto} alt="Perfil" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--primary)', margin: '0 auto' }} />
               ) : (
                 <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--surface-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '1px solid var(--border)' }}>
                    <User size={48} style={{ color: 'var(--text-secondary)' }} />
                 </div>
               )}
               <h3 style={{ marginTop: '16px', fontSize: '20px' }}>{kycDetail?.fullName || kycDetail?.full_name || selectedClient.nombre || '—'}</h3>
               <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{selectedClient.email}</p>
               <div style={{ marginTop: '12px' }}>
                 <span className={`badge ${isBlocked ? 'badge-rejected' : 'badge-approved'}`}>
                   {isBlocked ? 'Bloqueado' : 'Activo'}
                 </span>
               </div>
            </div>

            <div style={{ padding: '16px', backgroundColor: 'var(--surface-light)', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>Credit Score</div>
              <CreditScoreBadge {...getClientScore(selectedClient.email)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
               <button
                 className="btn btn-primary"
                 style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                 onClick={() => downloadContract(selectedClient)}
                 disabled={loadingContract === selectedClient.id}
               >
                 <Download size={16} /> Descargar Contrato
               </button>
               <button
                 className="btn btn-secondary"
                 style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: isBlocked ? 'var(--success)' : 'var(--danger)' }}
                 onClick={() => handleToggleStatus(selectedClient)}
                 disabled={processing === selectedClient.id}
               >
                  {isBlocked ? <><Shield size={16} /> Desbloquear Cliente</> : <><ShieldOff size={16} /> Bloquear Cliente</>}
                </button>
            </div>

            <ClientMap
              latitude={kycDetail?.latitude}
              longitude={kycDetail?.longitude}
              country={kycDetail?.country}
            />
          </div>

          {/* Columna Derecha (Información KYC y Préstamos) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="premium-card">
              <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} /> Información Personal
              </h3>
              {!kycDetail ? (
                <p style={{ color: 'var(--text-secondary)' }}>Este cliente no ha completado su KYC aún.</p>
              ) : (
                <>
                  <div className="grid-2col" style={{ gap: '16px', marginBottom: '24px' }}>
                    {[
                      ['Cédula / DNI', kycDetail.idNumber || kycDetail.id_number, <FileText size={14} key="dni" />],
                      ['Teléfono', kycDetail.phone, <Phone size={14} key="phone" />],
                      ['País', kycDetail.country, <MapPin size={14} key="country" />],
                      ['Dirección', kycDetail.address, <MapPin size={14} key="address" />],
                      ['Biometría', kycDetail.faceVerified ? '✓ Verificada' : '✗ Sin verificar', <Activity size={14} key="bio" />],
                    ].map(([label, value, icon], i) => value ? (
                      <div key={i} style={{ padding: '12px', backgroundColor: 'var(--surface-light)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--primary)' }}>{icon}</span> {value}
                        </div>
                      </div>
                    ) : null)}
                  </div>
                  
                  {(kycDetail.idFrontPhoto || kycDetail.idBackPhoto) && (
                    <div>
                      <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-secondary)' }}>Documentos de Identidad</h4>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {kycDetail.idFrontPhoto && (
                          <div>
                            <img src={kycDetail.idFrontPhoto} alt="ID Frente" style={{ width: '200px', height: '120px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => window.open(kycDetail.idFrontPhoto, '_blank')} />
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', textAlign: 'center' }}>Frente</div>
                          </div>
                        )}
                        {kycDetail.idBackPhoto && (
                          <div>
                            <img src={kycDetail.idBackPhoto} alt="ID Dorso" style={{ width: '200px', height: '120px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => window.open(kycDetail.idBackPhoto, '_blank')} />
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', textAlign: 'center' }}>Dorso</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="premium-card">
              <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} /> Historial de Préstamos
              </h3>
              {clientLoans.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No hay préstamos asociados a este cliente.</p>
              ) : (
                <div className="table-container">
                  <table className="custom-table" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Monto</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientLoans.map(loan => (
                        <tr key={loan.id}>
                          <td style={{ fontWeight: '600' }}>${loan.amount}</td>
                          <td>
                            <span className={`badge badge-${loan.status === 'approved' ? 'approved' : loan.status === 'rejected' ? 'rejected' : 'pending'}`}>
                              {loan.status === 'approved' ? 'Aprobado' : loan.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{new Date(loan.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Gestión de Clientes</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Administra y supervisa todos tus clientes registrados</p>
      </div>

      {/* Search bar */}
      <div className="premium-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '44px' }}
          />
        </div>
      </div>

      {/* Clients Table */}
      <div className="premium-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px' }}>Clientes ({filtered.length})</h3>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Préstamos</th>
                <th>Credit Score</th>
                <th>KYC</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                    No se encontraron clientes
                  </td>
                </tr>
              ) : filtered.map(client => {
                const clientLoans = loans.filter(l => l.clientEmail === client.email);
                const activeLoans = clientLoans.filter(l => l.status === 'approved').length;
                const score = getClientScore(client.email);
                const kyc = getKycProfile(client.email);
                const isBlocked = client.status === 'blocked';

                return (
                  <tr key={client.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--surface-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--border)' }}>
                          {kyc?.profilePhoto ? (
                            <img src={kyc.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <User size={16} style={{ color: 'var(--text-secondary)' }} />
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '13px' }}>{kyc?.fullName || client.nombre || '—'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{client.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${isBlocked ? 'badge-rejected' : 'badge-approved'}`}>
                        {isBlocked ? 'Bloqueado' : 'Activo'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px' }}>{activeLoans} activo(s)</span>
                      <br />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{clientLoans.length} total</span>
                    </td>
                    <td>
                      <CreditScoreBadge score={score.score} label={score.label} color={score.color} />
                    </td>
                    <td>
                      {kyc ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span className={`badge ${kyc.status === 'verified' ? 'badge-approved' : 'badge-pending'}`} style={{ fontSize: '10px' }}>
                            {kyc.status === 'verified' ? '✓ Verificado' : 'En revisión'}
                          </span>
                          {kyc.faceVerified && <span style={{ fontSize: '10px', color: 'var(--primary)' }}>Biometría ✓</span>}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sin KYC</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '11px' }}
                          onClick={() => openKycDetail(client)}
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '11px', color: '#2563EB' }}
                          onClick={() => downloadContract(client)}
                          disabled={loadingContract === client.id}
                          title="Descargar contrato"
                        >
                          <Download size={12} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '11px', color: isBlocked ? 'var(--success)' : 'var(--danger)' }}
                          onClick={() => handleToggleStatus(client)}
                          disabled={processing === client.id}
                        >
                          {isBlocked ? <Shield size={12} /> : <ShieldOff size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
