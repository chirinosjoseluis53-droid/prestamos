const ENTITY_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"'`/]/g, s => ENTITY_MAP[s]);
}

export function stripHtml(str) {
  if (!str) return '';
  return String(str).replace(/<[^>]*>/g, '').trim();
}

export function sanitizeInput(str, { maxLen = 500, allowHtml = false } = {}) {
  if (!str) return '';
  let val = String(str).trim();
  if (!allowHtml) val = stripHtml(val);
  if (val.length > maxLen) val = val.substring(0, maxLen);
  return val;
}

export function sanitizeFinancial(val, { min = 0, max = 999999999, allowNegative = false } = {}) {
  const num = parseFloat(val);
  if (isNaN(num)) return 0;
  if (!allowNegative && num < min) return min;
  if (num > max) return max;
  return Math.round(num * 100) / 100;
}

export function validatePassword(password) {
  const errors = [];
  if (!password || password.length < 8) errors.push('al menos 8 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('al menos una mayúscula');
  if (!/[a-z]/.test(password)) errors.push('al menos una minúscula');
  if (!/[0-9]/.test(password)) errors.push('al menos un número');
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) errors.push('al menos un carácter especial');
  return errors;
}

export function generateSecureId() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export function generateSecureCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join('');
}

export function sanitizeKycFields(data) {
  if (!data || typeof data !== 'object') return data;
  const sanitized = { ...data };
  const textFields = ['full_name', 'fullName', 'phone', 'address', 'id_number', 'idNumber', 'country', 'city', 'state'];
  textFields.forEach(f => {
    if (sanitized[f]) sanitized[f] = sanitizeInput(sanitized[f], { maxLen: 300 });
  });
  return sanitized;
}

export function clearAllLocalStorage() {
  const keysToKeep = ['theme'];
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) keys.push(key);
  }
  keys.forEach(key => {
    if (!keysToKeep.includes(key)) {
      localStorage.removeItem(key);
    }
  });
}

export function validateFinancialInput(value, { label = 'Valor', min = 0, max = 999999999, required = false, allowDecimal = true } = {}) {
  const num = Number(value);
  if (required && (value === '' || value === null || value === undefined)) {
    return `${label} es obligatorio`;
  }
  if (value === '' || value === null || value === undefined) return null;
  if (isNaN(num)) return `${label} debe ser un número válido`;
  if (num < min) return `${label} no puede ser menor a ${min}`;
  if (num > max) return `${label} no puede ser mayor a ${max}`;
  if (!allowDecimal && num !== Math.floor(num)) return `${label} debe ser un número entero`;
  return null;
}
