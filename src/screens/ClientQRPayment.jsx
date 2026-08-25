import React, { useState, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { QrCode, Download, CreditCard, Smartphone, Landmark, Mail, CheckCircle, Copy, Check } from 'lucide-react';

function generateQRPattern(data, size = 200) {
  const cells = 25;
  const cellSize = size / cells;
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  const matrix = [];
  for (let r = 0; r < cells; r++) {
    matrix[r] = [];
    for (let c = 0; c < cells; c++) {
      if (r < 7 && c < 7) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          matrix[r][c] = 1;
        } else {
          matrix[r][c] = 0;
        }
      } else if (r < 7 && c >= cells - 7) {
        if (r === 0 || r === 6 || c === cells - 7 || c === cells - 1 || (r >= 2 && r <= 4 && c >= cells - 5 && c <= cells - 3)) {
          matrix[r][c] = 1;
        } else {
          matrix[r][c] = 0;
        }
      } else if (r >= cells - 7 && c < 7) {
        if (r === cells - 7 || r === cells - 1 || c === 0 || c === 6 || (r >= cells - 5 && r <= cells - 3 && c >= 2 && c <= 4)) {
          matrix[r][c] = 1;
        } else {
          matrix[r][c] = 0;
        }
      } else {
        hash = ((hash << 5) - hash + (r * cells + c)) | 0;
        matrix[r][c] = (hash >>> 0) % 3 === 0 ? 1 : 0;
      }
    }
  }
  return { matrix, cellSize, size, cells };
}

function QRCodeSVG({ data, size = 200 }) {
  const { matrix, cellSize, size: svgSize, cells } = useMemo(() => generateQRPattern(data, size), [data, size]);
  return (
    <svg viewBox={`0 0 ${svgSize} ${svgSize}`} width={svgSize} height={svgSize} style={{ borderRadius: '12px', backgroundColor: '#fff', padding: '8px' }}>
      <rect x="0" y="0" width={svgSize} height={svgSize} fill="#ffffff" rx="12" />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect key={`${r}-${c}`} x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill="#0f172a" rx="0.5" />
          ) : null
        )
      )}
    </svg>
  );
}

export default function ClientQRPayment() {
  const { currentUser } = useAuth();
  const { loans } = useData();
  const qrRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const activeLoan = loans.find(l => {
    if (l.status !== 'approved') return false;
    const isCompleted = l.installments && l.installments.length > 0 && l.installments.every(i => i.status === 'paid');
    return !isCompleted;
  });

  const nextUnpaid = activeLoan
    ? activeLoan.installments.find(i => i.status === 'pending' || i.status === 'submitted')
    : null;

  const paymentData = useMemo(() => {
    if (!nextUnpaid || !activeLoan) return null;
    return {
      loanId: activeLoan.id,
      installmentId: nextUnpaid.id,
      installmentNumber: nextUnpaid.number,
      amount: nextUnpaid.amount,
      dueDate: nextUnpaid.due_date,
      client: currentUser?.email,
    };
  }, [nextUnpaid, activeLoan, currentUser]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 0, 0, 400, 400);
      const link = document.createElement('a');
      link.download = `QR_pago_cuota_${nextUnpaid.number}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  };

  const handleCopyLink = () => {
    if (!paymentData) return;
    navigator.clipboard.writeText(JSON.stringify(paymentData));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Pago por QR</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Escanea el código QR para realizar tu pago</p>
      </div>

      {!activeLoan || !nextUnpaid ? (
        <div className="premium-card" style={{ padding: '40px', textAlign: 'center' }}>
          <CheckCircle size={48} style={{ color: 'var(--primary)', margin: '0 auto 16px auto' }} />
          <h3>Sin cuotas pendientes</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
            No tienes cuotas pendientes de pago en este momento.
          </p>
        </div>
      ) : (
        <div className="grid-2col" style={{ gap: '24px' }}>
          <div className="premium-card" style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <QrCode size={24} />
            </div>
            <div ref={qrRef}>
              <QRCodeSVG data={paymentData} size={200} />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--primary)' }}>${nextUnpaid.amount.toFixed(2)}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Cuota #{nextUnpaid.number}</div>
            </div>

            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button className="btn btn-primary" onClick={handleDownloadQR} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Download size={16} /> Descargar QR
              </button>
              <button className="btn btn-secondary" onClick={handleCopyLink} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copiado' : 'Copiar Datos'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="premium-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Detalles del Pago</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Préstamo', value: `#${activeLoan.id.slice(-6)}` },
                  { label: 'Cuota', value: `#${nextUnpaid.number}` },
                  { label: 'Monto', value: `$${nextUnpaid.amount.toFixed(2)}` },
                  { label: 'Vencimiento', value: formatDate(nextUnpaid.due_date) },
                  { label: 'Estado', value: nextUnpaid.status === 'submitted' ? 'En revisión' : 'Pendiente' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="premium-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} style={{ color: 'var(--primary)' }} /> Métodos de Pago Aceptados
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { icon: <Smartphone size={18} />, label: 'Pago Móvil', desc: 'Transferencia instantánea desde tu banco', color: 'var(--primary)' },
                  { icon: <Landmark size={18} />, label: 'Transferencia Bancaria', desc: 'Depósito o transferencia a cuenta', color: '#D4AF37' },
                  { icon: <Mail size={18} />, label: 'Zelle', desc: 'Envío de fondos vía Zelle', color: '#6C3FE8' },
                ].map((method, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', backgroundColor: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: `${method.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: method.color, flexShrink: 0 }}>
                      {method.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{method.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{method.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
