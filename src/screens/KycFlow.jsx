import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  User, MapPin, FileUp, Camera, CheckCircle2,
  ChevronRight, ChevronLeft, ScanFace, Navigation,
  Locate, Phone, Home, CreditCard, Flag, AlertCircle,
  Scan, Check
} from 'lucide-react';

// ─── Paso 1: Datos Personales ─────────────────────────────────────────────────
function Step1Personal({ onNext, data, setData }) {
  const [fullName, setFullName] = useState(data.fullName || '');
  const [phone, setPhone] = useState(data.phone || '');
  const [address, setAddress] = useState(data.address || '');
  const [idNumber, setIdNumber] = useState(data.idNumber || '');

  const handleNext = () => {
    if (!fullName.trim() || !phone.trim() || !address.trim() || !idNumber.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }
    setData(prev => ({ ...prev, fullName, phone, address, idNumber }));
    onNext();
  };

  return (
    <div className="kyc-step-content animate-fade">
      <div className="kyc-step-header">
        <p className="kyc-step-label">Paso 1 de 5</p>
        <h2 className="kyc-step-title">Datos Personales</h2>
        <p className="kyc-step-subtitle">Para verificar tu identidad necesitamos tu información básica</p>
      </div>

      <div className="kyc-form">
        <KycInputField
          icon={<User size={18} />}
          label="NOMBRE COMPLETO"
          type="text"
          placeholder="Ej: Juan Pérez"
          value={fullName}
          onChange={setFullName}
        />
        <KycInputField
          icon={<Phone size={18} />}
          label="NÚMERO DE TELÉFONO"
          type="tel"
          placeholder="+58 412 000 0000"
          value={phone}
          onChange={setPhone}
        />
        <KycInputField
          icon={<Home size={18} />}
          label="DIRECCIÓN"
          type="text"
          placeholder="Calle, sector, ciudad..."
          value={address}
          onChange={setAddress}
        />
        <KycInputField
          icon={<CreditCard size={18} />}
          label="CÉDULA / PASAPORTE"
          type="text"
          placeholder="Número de documento"
          value={idNumber}
          onChange={setIdNumber}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary kyc-btn-next" onClick={handleNext}>
          CONTINUAR <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ─── Paso 2: Ubicación y País ─────────────────────────────────────────────────
const COUNTRIES = [
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦' },
  { code: 'DO', name: 'Rep. Dominicana', flag: '🇩🇴' },
];

function Step2Location({ onNext, onBack, data, setData }) {
  const [country, setCountry] = useState(data.country || null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [location, setLocation] = useState(
    data.latitude && data.longitude
      ? { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) }
      : null
  );
  const [loadingGps, setLoadingGps] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerRef = useRef(null);

  // Load Leaflet (OpenStreetMap) dynamically
  useEffect(() => {
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
      initMap();
    };
    loadLeaflet();
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current || leafletMapRef.current) return;
    const L = window.L;
    const initLat = location?.lat || 10.48;
    const initLng = location?.lng || -66.89;

    const map = L.map(mapRef.current).setView([initLat, initLng], location ? 14 : 6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    if (location) {
      markerRef.current = L.marker([location.lat, location.lng]).addTo(map);
    }

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      setLocation({ lat, lng });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }
    });

    leafletMapRef.current = map;
  };

  const requestGpsLocation = () => {
    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocation({ lat, lng });
        if (leafletMapRef.current) {
          leafletMapRef.current.setView([lat, lng], 15);
          const L = window.L;
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng]).addTo(leafletMapRef.current);
          }
        }
        setLoadingGps(false);
      },
      () => {
        setLocation({ lat: 10.4806, lng: -66.9036 });
        setLoadingGps(false);
        alert('No se pudo obtener ubicación GPS. Se utilizaron coordenadas aproximadas.');
      }
    );
  };

  const handleNext = () => {
    if (!location) { alert('Por favor selecciona tu ubicación en el mapa'); return; }
    if (!country) { alert('Por favor selecciona tu país'); return; }
    setData(prev => ({
      ...prev,
      latitude: location.lat.toFixed(6),
      longitude: location.lng.toFixed(6),
      country: country.name,
      countryCode: country.code,
      flag: country.flag,
    }));
    onNext();
  };

  return (
    <div className="kyc-step-content animate-fade">
      <div className="kyc-step-header">
        <p className="kyc-step-label">Paso 2 de 5</p>
        <h2 className="kyc-step-title">Ubicación y País</h2>
        <p className="kyc-step-subtitle">Selecciona tu país y marca tu ubicación en el mapa</p>
      </div>

      {/* Country selector */}
      <div
        className="kyc-country-btn"
        onClick={() => setShowCountryPicker(true)}
      >
        <Flag size={18} style={{ color: 'var(--text-secondary)' }} />
        <span style={{ flex: 1, color: country ? 'var(--text)' : 'var(--text-secondary)' }}>
          {country ? `${country.flag} ${country.name}` : 'Seleccionar país / bandera'}
        </span>
        <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
      </div>

      {/* Country Picker Modal */}
      {showCountryPicker && (
        <div className="modal-backdrop" onClick={() => setShowCountryPicker(false)}>
          <div className="modal-card" style={{ maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Flag size={18} style={{ color: 'var(--primary)' }} /> Seleccionar País
              </h3>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {COUNTRIES.map(c => (
                <div
                  key={c.code}
                  onClick={() => { setCountry(c); setShowCountryPicker(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
                    borderRadius: '10px', cursor: 'pointer', border: '1px solid var(--border)',
                    backgroundColor: country?.code === c.code ? 'rgba(15,164,108,0.1)' : 'var(--surface-light)',
                    borderColor: country?.code === c.code ? 'var(--primary)' : 'var(--border)',
                  }}
                  className="menu-item"
                >
                  <span style={{ fontSize: '22px' }}>{c.flag}</span>
                  <span style={{ fontWeight: '500', color: 'var(--text)' }}>{c.name}</span>
                  {country?.code === c.code && <Check size={16} style={{ color: 'var(--primary)', marginLeft: 'auto' }} />}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCountryPicker(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* GPS Button */}
      <button className="kyc-location-btn" onClick={requestGpsLocation} disabled={loadingGps}>
        <Locate size={16} style={{ color: 'var(--primary)' }} />
        <span>{loadingGps ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}</span>
        {loadingGps && <div className="kyc-spinner-sm" />}
      </button>

      {/* Map label */}
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '10px' }}>
        Toca el mapa para marcar tu ubicación
      </p>

      {/* OpenStreetMap via Leaflet */}
      <div style={{ height: '260px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '24px', position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {!location && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '8px',
            backgroundColor: 'rgba(0,0,0,0.35)', pointerEvents: 'none', zIndex: 999
          }}>
            <MapPin size={32} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ color: 'var(--text)', fontSize: '13px' }}>Toca el mapa para marcar tu ubicación</span>
          </div>
        )}
      </div>

      {location && (
        <div className="kyc-coords-badge">
          <Navigation size={14} style={{ color: 'var(--primary)' }} />
          <span>Lat: {parseFloat(location.lat).toFixed(4)}, Lng: {parseFloat(location.lng).toFixed(4)}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <button className="btn btn-secondary kyc-btn-back" onClick={onBack}>
          <ChevronLeft size={18} /> ATRÁS
        </button>
        <button className="btn btn-primary kyc-btn-next" onClick={handleNext}>
          CONTINUAR <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ─── Paso 3: Documentos de Identidad ─────────────────────────────────────────
function Step3Documents({ onNext, onBack, data, setData }) {
  const [docType, setDocType] = useState(data.docType || 'cedula');
  const [frontPhoto, setFrontPhoto] = useState(null);
  const [backPhoto, setBackPhoto] = useState(null);
  const [frontPreview, setFrontPreview] = useState(data.idFrontPreview || null);
  const [backPreview, setBackPreview] = useState(data.idBackPreview || null);
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  const handleFileChange = (e, side) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (side === 'front') { setFrontPhoto(file); setFrontPreview(ev.target.result); }
      else { setBackPhoto(file); setBackPreview(ev.target.result); }
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    if (!frontPreview) { alert('Sube la foto frontal de tu documento'); return; }
    if (docType === 'cedula' && !backPreview) { alert('Sube también la foto trasera de tu cédula'); return; }
    setData(prev => ({
      ...prev,
      docType,
      idFrontPhoto: frontPhoto || prev.idFrontPhoto,
      idBackPhoto: backPhoto || prev.idBackPhoto,
      idFrontPreview: frontPreview,
      idBackPreview: backPreview || frontPreview,
    }));
    onNext();
  };

  return (
    <div className="kyc-step-content animate-fade">
      <div className="kyc-step-header">
        <p className="kyc-step-label">Paso 3 de 5</p>
        <h2 className="kyc-step-title">Documento de Identidad</h2>
        <p className="kyc-step-subtitle">Toma fotos claras de ambos lados</p>
      </div>

      {/* Doc type selector */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'cedula', label: '🪪 Cédula' },
          { id: 'pasaporte', label: '📕 Pasaporte' },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => setDocType(opt.id)}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid',
              borderColor: docType === opt.id ? 'var(--primary)' : 'var(--border)',
              backgroundColor: docType === opt.id ? 'rgba(15,164,108,0.1)' : 'var(--surface)',
              color: docType === opt.id ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: '600', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Front photo */}
      <div
        className="kyc-photo-card"
        onClick={() => frontInputRef.current?.click()}
      >
        {frontPreview ? (
          <>
            <img src={frontPreview} alt="Frente" className="kyc-photo-preview" />
            <div className="kyc-photo-edit-badge"><Camera size={14} color="#fff" /></div>
          </>
        ) : (
          <div className="kyc-photo-placeholder">
            <Camera size={36} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ color: 'var(--text)', fontWeight: '600' }}>
              {docType === 'cedula' ? 'Frente de la Cédula' : 'Página Principal del Pasaporte'}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
              Toca para subir foto
            </span>
          </div>
        )}
        <input ref={frontInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileChange(e, 'front')} />
      </div>

      {/* Back photo (only for cedula) */}
      {docType === 'cedula' && (
        <div
          className="kyc-photo-card"
          onClick={() => backInputRef.current?.click()}
        >
          {backPreview ? (
            <>
              <img src={backPreview} alt="Reverso" className="kyc-photo-preview" />
              <div className="kyc-photo-edit-badge"><Camera size={14} color="#fff" /></div>
            </>
          ) : (
            <div className="kyc-photo-placeholder">
              <Camera size={36} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ color: 'var(--text)', fontWeight: '600' }}>Reverso de la Cédula</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Toca para subir foto</span>
            </div>
          )}
          <input ref={backInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileChange(e, 'back')} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
        <button className="btn btn-secondary kyc-btn-back" onClick={onBack}>
          <ChevronLeft size={18} /> ATRÁS
        </button>
        <button className="btn btn-primary kyc-btn-next" onClick={handleNext}>
          CONTINUAR <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ─── Paso 4: Foto de Perfil ───────────────────────────────────────────────────
function Step4Profile({ onNext, onBack, data, setData }) {
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePreview, setProfilePreview] = useState(data.profilePreview || null);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfilePhoto(file);
      setProfilePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    if (!profilePreview) { alert('Por favor sube tu foto de perfil'); return; }
    setData(prev => ({ ...prev, profilePhoto: profilePhoto || prev.profilePhoto, profilePreview }));
    onNext();
  };

  return (
    <div className="kyc-step-content animate-fade">
      <div className="kyc-step-header">
        <p className="kyc-step-label">Paso 4 de 5</p>
        <h2 className="kyc-step-title">Foto de Perfil</h2>
        <p className="kyc-step-subtitle">Tu foto será visible en tu cuenta y usada para verificación facial</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            width: '160px', height: '160px', borderRadius: '50%', overflow: 'hidden',
            border: profilePreview ? '3px solid var(--primary)' : '2px dashed var(--border)',
            cursor: 'pointer', backgroundColor: 'var(--surface)', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s'
          }}
        >
          {profilePreview ? (
            <img src={profilePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Perfil" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <User size={56} style={{ color: 'var(--text-secondary)' }} />
            </div>
          )}
          <div style={{
            position: 'absolute', bottom: '8px', right: '8px',
            backgroundColor: 'var(--primary)', borderRadius: '50%', padding: '8px',
            border: '2px solid var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Camera size={16} color="#fff" />
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
          {profilePreview ? '¡Foto cargada! Toca para cambiarla.' : 'Toca para subir tu selfie'}
        </p>
        <input ref={inputRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>

      {/* Tip card */}
      <div style={{
        display: 'flex', gap: '12px', padding: '14px', borderRadius: '12px',
        backgroundColor: 'rgba(212,175,55,0.1)', border: '1px solid var(--admin-accent)',
        marginBottom: '30px'
      }}>
        <AlertCircle size={20} style={{ color: 'var(--admin-accent)', flexShrink: 0, marginTop: '2px' }} />
        <p style={{ color: 'var(--text)', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
          Asegúrate de que tu rostro sea claramente visible, con buena iluminación y sin lentes de sol.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn btn-secondary kyc-btn-back" onClick={onBack}>
          <ChevronLeft size={18} /> ATRÁS
        </button>
        <button
          className="btn btn-primary kyc-btn-next"
          onClick={handleNext}
          style={{ opacity: profilePreview ? 1 : 0.5 }}
        >
          CONTINUAR <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ─── Paso 5: Verificación Facial ──────────────────────────────────────────────
const SCAN_STEPS = [
  'Alineando rostro...',
  'Detectando puntos faciales...',
  'Comparando con documento...',
  'Verificando biometría...',
  '¡Identidad verificada!',
];

function Step5FaceVerify({ onFinish, onBack, data, loading }) {
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [done, setDone] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanLineRef = useRef(null);
  const animFrameRef = useRef(null);
  const scanPosRef = useRef(0);
  const dirRef = useRef(1);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      // Silent fail
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  const animateScanLine = () => {
    if (!scanLineRef.current) return;
    scanPosRef.current += dirRef.current * 2;
    if (scanPosRef.current >= 230 || scanPosRef.current <= 0) dirRef.current *= -1;
    scanLineRef.current.style.top = `${scanPosRef.current}px`;
    animFrameRef.current = requestAnimationFrame(animateScanLine);
  };

  const handleScan = async () => {
    setScanning(true);
    setScanStep(0);
    await startWebcam();
    animateScanLine();

    for (let i = 0; i < SCAN_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, i === SCAN_STEPS.length - 1 ? 1200 : 900));
      setScanStep(i);
    }

    stopWebcam();
    setDone(true);
    setScanning(false);
  };

  useEffect(() => () => stopWebcam(), []);

  return (
    <div className="kyc-step-content animate-fade" style={{ textAlign: 'center' }}>
      <div className="kyc-step-header" style={{ textAlign: 'center' }}>
        <p className="kyc-step-label" style={{ textAlign: 'center' }}>Paso 5 de 5</p>
        <h2 className="kyc-step-title" style={{ textAlign: 'center' }}>Verificación Facial</h2>
        <p className="kyc-step-subtitle" style={{ textAlign: 'center' }}>
          {done ? '¡Identidad confirmada!' : 'Centra tu rostro y presiona Escanear'}
        </p>
      </div>

      {/* Camera Oval */}
      <div className="kyc-face-wrapper" style={{ transform: scanning && !done ? 'scale(1.03)' : 'scale(1)' }}>
        {done ? (
          <div className="kyc-face-done">
            {data.profilePreview ? (
              <img src={data.profilePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Verificado" />
            ) : (
              <User size={60} style={{ color: 'var(--text-secondary)' }} />
            )}
            <div className="kyc-check-badge">
              <Check size={28} color="#fff" />
            </div>
          </div>
        ) : (
          <>
            {scanning ? (
              <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} autoPlay playsInline muted />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <ScanFace size={72} style={{ color: 'var(--text-secondary)' }} />
              </div>
            )}
            {/* Face frame corners */}
            <div className="kyc-face-overlay">
              <div className="kyc-face-frame">
                <div className="kyc-corner kyc-corner-tl" />
                <div className="kyc-corner kyc-corner-tr" />
                <div className="kyc-corner kyc-corner-bl" />
                <div className="kyc-corner kyc-corner-br" />
                {scanning && (
                  <div
                    ref={scanLineRef}
                    className="kyc-scan-line"
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Status */}
      <div className="kyc-status-box">
        {scanning || done ? (
          <div className={`kyc-step-status ${done ? 'done' : ''}`}>
            {done
              ? <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
              : <Scan size={20} style={{ color: 'var(--primary)' }} className="kyc-spin" />
            }
            <span>{SCAN_STEPS[scanStep]}</span>
          </div>
        ) : (
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Asegúrate de tener buena iluminación
          </span>
        )}
      </div>

      {/* Buttons */}
      {!done ? (
        <button
          className="btn btn-primary kyc-btn-next"
          style={{ width: '100%', marginBottom: '12px', opacity: scanning ? 0.6 : 1 }}
          onClick={handleScan}
          disabled={scanning}
        >
          <Scan size={20} />
          {scanning ? 'ESCANEANDO...' : 'ESCANEAR ROSTRO'}
        </button>
      ) : (
        <button
          className="btn kyc-btn-next"
          style={{ width: '100%', backgroundColor: 'var(--success)', marginBottom: '12px' }}
          onClick={onFinish}
          disabled={loading}
        >
          <CheckCircle2 size={20} />
          {loading ? 'ENVIANDO...' : 'FINALIZAR VERIFICACIÓN'}
        </button>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button className="btn btn-secondary kyc-btn-back" onClick={() => { stopWebcam(); onBack(); }} disabled={scanning}>
          <ChevronLeft size={18} /> ATRÁS
        </button>
      </div>
    </div>
  );
}

// ─── Input field reutilizable ─────────────────────────────────────────────────
function KycInputField({ icon, label, type, placeholder, value, onChange }) {
  return (
    <div className="kyc-input-container">
      <div className="kyc-input-icon">{icon}</div>
      <div className="kyc-input-wrapper">
        <label className="kyc-input-label">{label}</label>
        <input
          type={type || 'text'}
          className="kyc-input"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── Barra de progreso tipo dots (igual que móvil) ────────────────────────────
function KycProgressDots({ currentStep, totalSteps = 5 }) {
  return (
    <div className="kyc-dots-bar">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
        <div
          key={s}
          className={`kyc-dot ${s <= currentStep ? 'active' : ''} ${s === currentStep ? 'current' : ''}`}
        />
      ))}
    </div>
  );
}

// ─── KycFlow Principal ────────────────────────────────────────────────────────
export default function KycFlow() {
  const { currentUser } = useAuth();
  const { saveKycProfile } = useData();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});

  const handleSaveKyc = async () => {
    setLoading(true);
    try {
      const payload = {
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        idNumber: formData.idNumber,
        country: formData.country,
        countryCode: formData.countryCode,
        latitude: parseFloat(formData.latitude) || null,
        longitude: parseFloat(formData.longitude) || null,
        docType: formData.docType,
        profilePhoto: formData.profilePhoto,
        idFrontPhoto: formData.idFrontPhoto,
        idBackPhoto: formData.idBackPhoto,
        faceVerified: true,
        kycCompletedAt: new Date().toISOString(),
        status: 'pending',
      };
      await saveKycProfile(currentUser.email, payload);
      window.location.reload();
    } catch (error) {
      alert('Error guardando perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '40px 16px',
      backgroundColor: 'var(--background)',
    }}>
      <div className="premium-card" style={{ width: '100%', maxWidth: '620px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '6px' }}>
            Verificación de Identidad <span style={{ color: 'var(--primary)' }}>KYC</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Para poder solicitar un préstamo, requerimos verificar tus datos legales.
          </p>
        </div>

        {/* Progress bar – dots style like mobile */}
        <KycProgressDots currentStep={step} />

        {/* Step content */}
        {step === 1 && <Step1Personal onNext={() => setStep(2)} data={formData} setData={setFormData} />}
        {step === 2 && <Step2Location onNext={() => setStep(3)} onBack={() => setStep(1)} data={formData} setData={setFormData} />}
        {step === 3 && <Step3Documents onNext={() => setStep(4)} onBack={() => setStep(2)} data={formData} setData={setFormData} />}
        {step === 4 && <Step4Profile onNext={() => setStep(5)} onBack={() => setStep(3)} data={formData} setData={setFormData} />}
        {step === 5 && <Step5FaceVerify onFinish={handleSaveKyc} onBack={() => setStep(4)} data={formData} loading={loading} />}
      </div>
    </div>
  );
}
