import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Save, RotateCcw, Eye, Edit2, CheckCircle } from 'lucide-react';

const DEFAULT_TEMPLATE = `CONTRATO DE PRÉSTAMO Y PAGARÉ ELECTRÓNICO

EL PRESTAMISTA Y EL PRESTATARIO acuerdan los siguientes términos:

1. OBJETO DEL CONTRATO
El Prestamista otorga al Prestatario un préstamo por la cantidad solicitada, el cual se compromete a devolver bajo las condiciones aquí establecidas.

2. TASA DE INTERÉS
Se aplicará la tasa de interés acordada al momento de la aprobación del préstamo, la cual será fija durante toda la vigencia del mismo.

3. PLAZO DE PAGO
El Prestatario se compromete a pagar las cuotas mensuales en las fechas de vencimiento establecidas en el cronograma de amortización.

4. MORATORIOS
En caso de incumplimiento en el pago oportuno, se aplicará una penalidad del 5% sobre el monto de la cuota vencida por cada mes de retraso.

5. INCUMPLIMIENTO
El incumplimiento reiterado (3 cuotas consecutivas sin pago) autoriza al Prestamista a iniciar acciones legales para la recuperación del monto adeudado.

6. PAGO ANTICIPADO
El Prestatario podrá realizar pagos anticipados sin penalidad alguna, reduciendo proporcionalmente el saldo pendiente.

7. USO DE DATOS PERSONALES
Los datos personales proporcionados serán utilizados exclusivamente para los fines de este contrato y la gestión del préstamo.

8. FIRMA DIGITAL
Las partes reconocen que la firma digital aquí asentada tiene plena validez legal de acuerdo con la legislación vigente.

Al firmar este contrato, el Prestatario declara haber leído, comprendido y aceptado todos los términos y condiciones aquí establecidos.
`;

const VARIABLES_HELP = [
  { var: '{{client_name}}', desc: 'Nombre completo del cliente' },
  { var: '{{client_email}}', desc: 'Correo del cliente' },
  { var: '{{amount}}', desc: 'Monto del préstamo' },
  { var: '{{rate}}', desc: 'Tasa de interés' },
  { var: '{{date}}', desc: 'Fecha actual' },
  { var: '{{installments}}', desc: 'Número de cuotas' },
  { var: '{{purpose}}', desc: 'Propósito del préstamo' },
];

export default function AdminContractTemplates({ setTab }) {
  const { currentUser } = useAuth();
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saved, setSaved] = useState(false);

  const [previewVars, setPreviewVars] = useState({
    client_name: 'Juan Pérez',
    client_email: 'juan@email.com',
    amount: '1,000.00',
    rate: '5',
    date: new Date().toLocaleDateString('es-ES'),
    installments: '6',
    purpose: 'Consumo personal',
  });

  useEffect(() => {
    const saved = localStorage.getItem(`@contract_template_${currentUser?.id}`);
    if (saved) setTemplate(saved);
  }, [currentUser]);

  const handleSave = () => {
    localStorage.setItem(`@contract_template_${currentUser?.id}`, template);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setIsEditing(false);
  };

  const handleReset = () => {
    if (window.confirm('¿Restablecer la plantilla por defecto? Se perderán los cambios no guardados.')) {
      setTemplate(DEFAULT_TEMPLATE);
      localStorage.removeItem(`@contract_template_${currentUser?.id}`);
    }
  };

  const getPreviewHTML = () => {
    let html = template;
    Object.entries(previewVars).forEach(([key, val]) => {
      html = html.split(`{{${key}}}`).join(val);
    });
    return html;
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} style={{ color: 'var(--primary)' }} />
            Plantillas de Contrato
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
            Personaliza el texto de los contratos de préstamo
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setIsEditing(!isEditing)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Edit2 size={14} /> {isEditing ? 'Cancelar' : 'Editar'}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowPreview(!showPreview)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Eye size={14} /> Vista Previa
          </button>
        </div>
      </div>

      <div className="grid-2col" style={{ gap: '24px', alignItems: 'start' }}>
        {/* Editor */}
        <div className="premium-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit2 size={16} style={{ color: 'var(--primary)' }} /> Editor de Plantilla
            </h3>
            {saved && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#2ECC71', fontWeight: '600' }}>
                <CheckCircle size={14} /> Guardado
              </span>
            )}
          </div>

          <textarea
            value={template}
            onChange={e => setTemplate(e.target.value)}
            disabled={!isEditing}
            style={{
              width: '100%', minHeight: '400px', padding: '16px', borderRadius: '12px',
              border: '1px solid var(--border)', backgroundColor: isEditing ? 'var(--surface-light)' : 'var(--surface)',
              fontFamily: "'Courier New', monospace", fontSize: '13px', lineHeight: '1.7',
              resize: 'vertical', color: 'var(--text)', outline: 'none',
              opacity: isEditing ? 1 : 0.8, cursor: isEditing ? 'text' : 'default',
            }}
          />

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={!isEditing} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Save size={14} /> Guardar Plantilla
            </button>
            <button className="btn btn-secondary" onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)' }}>
              <RotateCcw size={14} /> Restablecer
            </button>
          </div>
        </div>

        {/* Preview & Variables */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Variables Help */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} style={{ color: 'var(--primary)' }} /> Variables Disponibles
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {VARIABLES_HELP.map(v => (
                <div key={v.var} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--surface-light)', borderRadius: '8px' }}>
                  <code style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)', backgroundColor: 'rgba(37,99,235,0.08)', padding: '2px 6px', borderRadius: '4px' }}>{v.var}</code>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{v.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Variables */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>Variables de Vista Previa</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(previewVars).map(([key, val]) => (
                <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</label>
                  <input
                    type="text"
                    className="form-control"
                    value={val}
                    onChange={e => setPreviewVars(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{ fontSize: '12px', padding: '8px 12px' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Preview Result */}
          {showPreview && (
            <div className="premium-card" style={{ padding: '20px', border: '2px solid var(--primary)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={16} style={{ color: 'var(--primary)' }} /> Vista Previa del Contrato
              </h3>
              <div style={{
                backgroundColor: '#fff', color: '#1e293b', padding: '24px', borderRadius: '12px',
                border: '1px solid var(--border)', fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                fontSize: '12px', lineHeight: '1.8', whiteSpace: 'pre-wrap', maxHeight: '400px', overflowY: 'auto',
              }}>
                {getPreviewHTML()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
