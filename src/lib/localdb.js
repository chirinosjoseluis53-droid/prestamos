import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { generateSecureCode, sanitizeInput, sanitizeFinancial } from './sanitize';

const COL = {
  admins: 'admins',
  clients: 'clients',
  kyc: 'kyc_profiles',
  loans: 'loans',
  installments: 'installments',
  paymentSettings: 'payment_settings',
  notifications: 'notifications',
  signedContracts: 'signed_contracts',
  communications: 'communications',
};

function docData(snap) {
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

function mapDocs(snap) {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function applyLateFees(installments) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return installments.map((inst) => {
    if (inst.status === 'pending' && inst.due_date) {
      const dueDate = new Date(inst.due_date);
      if (dueDate < today) {
        const penalty = parseFloat((inst.amount * 0.05).toFixed(2));
        return { ...inst, late_fee: penalty, total_amount: inst.amount + penalty, is_late: true };
      }
    }
    return { ...inst, late_fee: 0, total_amount: inst.amount, is_late: false };
  });
}

async function getInstallmentsForLoan(loanId) {
  const snap = await getDocs(
    query(
      collection(db, COL.loans, loanId, COL.installments),
      orderBy('number', 'asc'),
    ),
  );
  return applyLateFees(mapDocs(snap));
}

export async function initDB() {}

export async function hashPassword() {
  return null;
}

export async function createAdmin({ id, email, company_name }) {
  const createdAt = new Date().toISOString();
  const inviteCode = generateSecureCode(8);
  const entry = {
    email,
    company_name: company_name || null,
    telefono: null,
    created_at: createdAt,
    invite_code: inviteCode,
    status: 'active',
  };
  await setDoc(doc(db, COL.admins, id), entry);
  return { id, email, inviteCode };
}

export async function createClient({ id, email, nombre, adminId }) {
  const createdAt = new Date().toISOString();
  const entry = {
    email,
    nombre: nombre || null,
    telefono: null,
    admin_id: adminId || null,
    created_at: createdAt,
    status: 'active',
  };
  await setDoc(doc(db, COL.clients, id), entry);
  return { id, email };
}

export async function findAdminByEmail(email) {
  const snap = await getDocs(
    query(collection(db, COL.admins), where('email', '==', email)),
  );
  return snap.empty ? null : docData(snap.docs[0]);
}

export async function findClientByEmail(email) {
  const snap = await getDocs(
    query(collection(db, COL.clients), where('email', '==', email)),
  );
  return snap.empty ? null : docData(snap.docs[0]);
}

export async function getAdminById(id) {
  const snap = await getDoc(doc(db, COL.admins, id));
  return docData(snap);
}

export async function getClientById(id) {
  const snap = await getDoc(doc(db, COL.clients, id));
  return docData(snap);
}

export async function getAllAdmins() {
  const snap = await getDocs(collection(db, COL.admins));
  return mapDocs(snap).map((admin) => ({
    ...admin,
    invite_code: admin.invite_code || (admin.id ? admin.id.substring(0, 6).toUpperCase() : '---'),
  }));
}

export async function getAllClients() {
  const snap = await getDocs(collection(db, COL.clients));
  return mapDocs(snap);
}

export async function findAdminByInviteCode(code) {
  if (!code || typeof code !== 'string') return null;
  const snap = await getDocs(
    query(collection(db, COL.admins), where('invite_code', '==', code.trim().toUpperCase())),
  );
  if (!snap.empty) return docData(snap.docs[0]);
  return null;
}

export async function updateUserStatus(table, id, status) {
  const col = table === 'admins' ? COL.admins : COL.clients;
  await updateDoc(doc(db, col, id), { status });
}

export async function resetAdminPassword() {
  throw new Error('Usa el restablecimiento de contrasena por correo desde Firebase Auth');
}

export async function saveKycProfile(clientId, profileData) {
  const entry = {
    client_id: clientId,
    full_name: sanitizeInput(profileData.fullName || profileData.full_name || ''),
    id_number: sanitizeInput(profileData.idNumber || profileData.id_number || ''),
    phone: sanitizeInput(profileData.phone || ''),
    address: sanitizeInput(profileData.address || ''),
    country: sanitizeInput(profileData.country || ''),
    flag: profileData.flag || null,
    latitude: sanitizeFinancial(profileData.latitude || profileData.lat || 0),
    longitude: sanitizeFinancial(profileData.longitude || profileData.lng || 0),
    profile_photo: profileData.profilePhoto || profileData.profile_photo || null,
    id_front_photo: profileData.idFrontPhoto || profileData.id_front_photo || null,
    id_back_photo: profileData.idBackPhoto || profileData.id_back_photo || null,
    face_verified: profileData.faceVerified || profileData.face_verified || false,
    status: 'pending',
    updated_at: new Date().toISOString(),
  };
  const ref = doc(db, COL.kyc, clientId);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    entry.created_at = new Date().toISOString();
  }
  await setDoc(ref, entry, { merge: true });
  return entry;
}

export async function getKycProfile(clientId) {
  if (!clientId) return null;
  const snap = await getDoc(doc(db, COL.kyc, clientId));
  return docData(snap);
}

export async function createLoan(loan) {
  const { installments, ...loanData } = loan;
  await setDoc(doc(db, COL.loans, loan.id), {
    ...loanData,
    created_at: loan.created_at || new Date().toISOString(),
  });
  if (installments && installments.length) {
    await createInstallments(installments);
  }
  return loan;
}

export async function getLoansByAdmin(adminId) {
  const snap = await getDocs(
    query(collection(db, COL.loans), where('admin_id', '==', adminId)),
  );
  const loans = mapDocs(snap).sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  );
  await Promise.all(
    loans.map(async (loan) => {
      loan.installments = await getInstallmentsForLoan(loan.id);
    }),
  );
  return loans;
}

export async function getLoansByClient(clientId) {
  const snap = await getDocs(
    query(collection(db, COL.loans), where('client_id', '==', clientId)),
  );
  const loans = mapDocs(snap).sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  );
  await Promise.all(
    loans.map(async (loan) => {
      loan.installments = await getInstallmentsForLoan(loan.id);
    }),
  );
  return loans;
}

export async function updateLoanFields(loanId, fields) {
  const allowed = ['status', 'interest_rate', 'installments_count', 'frequency', 'disbursement_method', 'start_date', 'purpose'];
  const payload = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) payload[key] = fields[key];
  }
  if (Object.keys(payload).length > 0) {
    await updateDoc(doc(db, COL.loans, loanId), payload);
  }
}

export async function deleteLoan(loanId) {
  const instSnap = await getDocs(collection(db, COL.loans, loanId, COL.installments));
  const batch = writeBatch(db);
  instSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, COL.loans, loanId));
  await batch.commit();
}

export async function createInstallments(installmentsList) {
  if (!installmentsList.length) return;
  const loanId = installmentsList[0].loan_id;
  const batch = writeBatch(db);
  for (const inst of installmentsList) {
    const ref = doc(db, COL.loans, loanId, COL.installments, inst.id);
    batch.set(ref, { ...inst, paid_amount: inst.paid_amount != null ? inst.paid_amount : 0 });
  }
  await batch.commit();
}

export async function deleteInstallmentsByIds(loanId, installmentIds) {
  if (!installmentIds?.length) return;
  const batch = writeBatch(db);
  installmentIds.forEach((id) => {
    batch.delete(doc(db, COL.loans, loanId, COL.installments, id));
  });
  await batch.commit();
}

function extractLoanIdFromInstallmentId(installmentId) {
  if (!installmentId) return null;
  if (installmentId.includes('_inst_')) return installmentId.split('_inst_')[0];
  if (installmentId.includes('_ref_')) return installmentId.split('_ref_')[0];
  const lastUnderscore = installmentId.lastIndexOf('_');
  if (lastUnderscore > 0) return installmentId.substring(0, lastUnderscore);
  return null;
}

export async function updateInstallment(installmentId, fields, loanId = null) {
  const resolvedLoanId = loanId || extractLoanIdFromInstallmentId(installmentId);
  if (!resolvedLoanId) return;

  const instRef = doc(db, COL.loans, resolvedLoanId, COL.installments, installmentId);
  const instSnap = await getDoc(instRef);
  if (!instSnap.exists()) return;

  const allowed = ['status', 'payment_proof_url', 'paid_date', 'paid_amount', 'claimed_amount', 'payment_history'];
  const payload = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) payload[key] = fields[key];
  }
  if (Object.keys(payload).length > 0) {
    await updateDoc(instRef, payload);
  }
}

export async function savePaymentSettings(adminId, settings) {
  await setDoc(doc(db, COL.paymentSettings, adminId), settings, { merge: true });
}

export async function getPaymentSettings(adminId) {
  if (!adminId) return null;
  const snap = await getDoc(doc(db, COL.paymentSettings, adminId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    zelle: { enabled: false, email: '', phone: '', holderName: '', ...data.zelle },
    pagoMovil: { enabled: false, bank: '', phone: '', rif: '', ...data.pagoMovil },
    transfer: { enabled: false, bank: '', account: '', owner: '', ...data.transfer },
    whatsapp: {
      enabled: false,
      accessToken: '',
      phoneNumberId: '',
      useTemplate: false,
      templateName: 'payment_reminder',
      templateLanguage: 'es',
      ...data.whatsapp,
    },
  };
}

// ── Interest Rate Settings ──────────────────────────────────────────────
export async function saveAdminInterestRate(adminId, rate) {
  await setDoc(doc(db, 'admin_settings', adminId), { interestRate: rate, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function getAdminInterestRate(adminId) {
  if (!adminId) return null;
  const snap = await getDoc(doc(db, 'admin_settings', adminId));
  if (!snap.exists()) return null;
  return snap.data().interestRate ?? null;
}

export async function createNotification(notification) {
  const id = notification.id || Date.now().toString();
  const entry = {
    target: notification.target || 'client',
    user_id: notification.user_id,
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    read: notification.read ? 1 : 0,
    created_at: new Date().toISOString(),
  };
  await setDoc(doc(db, COL.notifications, id), entry);
  return { id, ...entry };
}

export async function getNotifications(userId) {
  const snap = await getDocs(
    query(collection(db, COL.notifications), where('user_id', '==', userId)),
  );
  return mapDocs(snap).sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  );
}

export async function markNotificationRead(notificationId) {
  await updateDoc(doc(db, COL.notifications, notificationId), { read: 1 });
}

export async function markAllNotificationsRead(userId) {
  const notifications = await getNotifications(userId);
  const unread = notifications.filter((n) => !n.read);
  await Promise.all(unread.map((n) => markNotificationRead(n.id)));
}

export async function saveSignedContract(contract) {
  const id = contract.id || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const entry = {
    ...contract,
    id,
    signed_at: contract.signed_at || new Date().toISOString(),
  };
  await setDoc(doc(db, COL.signedContracts, id), entry);
  return entry;
}

export async function getSignedContractsByClient(clientId) {
  if (!clientId) return [];
  const snap = await getDocs(
    query(collection(db, COL.signedContracts), where('client_id', '==', clientId)),
  );
  return mapDocs(snap).sort(
    (a, b) => new Date(b.signed_at || 0) - new Date(a.signed_at || 0),
  );
}

export async function getSignedContract(contractId) {
  if (!contractId) return null;
  const snap = await getDoc(doc(db, COL.signedContracts, contractId));
  return docData(snap);
}

export async function clientHasSignedContract(clientId) {
  const list = await getSignedContractsByClient(clientId);
  return list.length > 0;
}

export default {
  initDB,
  createAdmin,
  createClient,
  findAdminByEmail,
  findClientByEmail,
  getAdminById,
  getClientById,
  hashPassword,
  getAllAdmins,
  getAllClients,
  findAdminByInviteCode,
  updateUserStatus,
  resetAdminPassword,
  saveKycProfile,
  getKycProfile,
  createLoan,
  getLoansByAdmin,
  getLoansByClient,
  updateLoanFields,
  deleteLoan,
  createInstallments,
  deleteInstallmentsByIds,
  updateInstallment,
  savePaymentSettings,
  getPaymentSettings,
  saveAdminInterestRate,
  getAdminInterestRate,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
  saveSignedContract,
  getSignedContractsByClient,
  getSignedContract,
  clientHasSignedContract,
  getMessages: async (loanId) => {
    try {
      const snap = await getDocs(query(collection(db, 'messages'), where('loanId', '==', loanId)));
      return mapDocs(snap).sort((a, b) => new Date(a.created_at || a.createdAt || 0) - new Date(b.created_at || b.createdAt || 0));
    } catch (e) {
      return [];
    }
  },
  sendMessage: async (loanId, senderId, text, meta = {}) => {
    const msgId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await setDoc(doc(db, 'messages', msgId), {
      id: msgId,
      loanId,
      senderId,
      text,
      senderName: meta.senderName || null,
      isAdmin: meta.isAdmin || false,
      createdAt: new Date().toISOString(),
    });
    return msgId;
  },

  addCommunication: async ({ clientEmail, type, direction, subject, notes, duration, agentName, agentEmail }) => {
    const id = generateSecureCode(12) + Date.now().toString(36);
    const entry = {
      id,
      clientEmail: sanitizeInput(clientEmail || ''),
      type: sanitizeInput(type || 'message'),
      direction: sanitizeInput(direction || 'outbound'),
      subject: sanitizeInput(subject || ''),
      notes: sanitizeInput(notes || ''),
      duration: duration || null,
      agentName: sanitizeInput(agentName || ''),
      agentEmail: sanitizeInput(agentEmail || ''),
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, COL.communications, id), entry);
    return entry;
  },

  getCommunicationsByClient: async (clientEmail) => {
    if (!clientEmail) return [];
    const q = query(
      collection(db, COL.communications),
      where('clientEmail', '==', clientEmail),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  },

  getCommunicationsByAgent: async (agentEmail) => {
    if (!agentEmail) return [];
    const q = query(
      collection(db, COL.communications),
      where('agentEmail', '==', agentEmail),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  },

  deleteCommunication: async (id) => {
    if (!id) return;
    await deleteDoc(doc(db, COL.communications, id));
  },

  getAllCommunications: async () => {
    try {
      const snap = await getDocs(collection(db, COL.communications));
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (e) {
      return [];
    }
  },
};
