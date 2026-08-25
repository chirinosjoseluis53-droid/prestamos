import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import localdb from '../lib/localdb';
import { prepareKycPhotos, preparePaymentProof, isStoredImageUri } from '../lib/imageStore';
import { useAuth } from './AuthContext';

const DataContext = createContext();
export const useData = () => useContext(DataContext);

const normalizeKycProfile = (profile) => {
  if (!profile) return null;
  return {
    ...profile,
    fullName: profile.full_name || profile.fullName,
    idNumber: profile.id_number || profile.idNumber,
    idFrontPhoto: profile.id_front_photo || profile.idFrontPhoto,
    idBackPhoto: profile.id_back_photo || profile.idBackPhoto,
    profilePhoto: profile.profile_photo || profile.profilePhoto,
    faceVerified: profile.face_verified || profile.faceVerified,
  };
};

export const DataProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [isReady, setIsReady] = useState(false);

  // States
  const [clients, setClients] = useState([]);
  const [kycProfiles, setKycProfiles] = useState({});
  const [loans, setLoans] = useState([]);
  
  const DEFAULT_PAYMENT_SETTINGS = {
    zelle: { enabled: false, email: '', phone: '', holderName: '' },
    pagoMovil: { enabled: false, bank: '', phone: '', rif: '' },
    transfer: { enabled: false, bank: '', account: '', owner: '' },
  };
  const [paymentSettings, setPaymentSettings] = useState(DEFAULT_PAYMENT_SETTINGS);
  const [adminInterestRate, setAdminInterestRate] = useState(null);

  const loadAdminData = useCallback(async () => {
    if (!currentUser) return;
    // 1. Clientes
    const allClients = await localdb.getAllClients();
    const adminClients = (allClients || []).filter(c => c.admin_id === currentUser.id);
    setClients(adminClients);

    // 2. KYC Profiles
    const kycMap = {};
    await Promise.all(adminClients.map(async (client) => {
      const profile = await localdb.getKycProfile(client.id);
      if (profile) kycMap[client.email] = normalizeKycProfile(profile);
    }));
    setKycProfiles(kycMap);

    // 3. Loans & Installments
    const loansData = await localdb.getLoansByAdmin(currentUser.id);
    const enrichedLoans = (loansData || []).map(l => {
      const client = adminClients.find(c => c.id === l.client_id);
      return { ...l, clientEmail: client ? client.email : null };
    });
    setLoans(enrichedLoans);

    // 4. Payment Methods
    const settings = await localdb.getPaymentSettings(currentUser.id);
    if (settings) setPaymentSettings(settings);
  }, [currentUser]);

  const loadClientData = useCallback(async () => {
    if (!currentUser) return;
    // 1. KYC Profile
    const kycData = await localdb.getKycProfile(currentUser.id);
    if (kycData) {
      setKycProfiles({ [currentUser.email]: normalizeKycProfile(kycData) });
    }

    // 2. Loans & Installments
    const loansData = await localdb.getLoansByClient(currentUser.id);
    const enrichedLoans = (loansData || []).map(l => ({ ...l, clientEmail: currentUser.email }));
    setLoans(enrichedLoans);

    // 3. Admin Payment Methods
    if (currentUser.adminId) {
      const settings = await localdb.getPaymentSettings(currentUser.adminId);
      if (settings) setPaymentSettings(settings);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setClients([]);
      setKycProfiles({});
      setLoans([]);
      setPaymentSettings(DEFAULT_PAYMENT_SETTINGS);
      setIsReady(true);
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      setIsReady(false);
      try {
        if (currentUser.isSuperAdmin) {
          setClients([]);
          setKycProfiles({});
          setLoans([]);
          setPaymentSettings(DEFAULT_PAYMENT_SETTINGS);
        } else if (currentUser.isAdmin) {
          await loadAdminData();
        } else {
          // Client data loading inline to avoid useCallback dependency issues
          const kycData = await localdb.getKycProfile(currentUser.id);
          if (kycData && !cancelled) {
            setKycProfiles({ [currentUser.email]: normalizeKycProfile(kycData) });
          }
          const loansData = await localdb.getLoansByClient(currentUser.id);
          if (!cancelled) {
            setLoans((loansData || []).map(l => ({ ...l, clientEmail: currentUser.email })));
          }
          if (currentUser.adminId && !cancelled) {
            const settings = await localdb.getPaymentSettings(currentUser.adminId);
            if (settings) setPaymentSettings(settings);
          }
        }
      } catch (error) {
        // Silent fail
      }
      if (!cancelled) setIsReady(true);
    };

    loadData();

    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const refreshLoans = useCallback(async () => {
    if (!currentUser) return;
    try {
      if (currentUser.isAdmin) {
        const loansData = await localdb.getLoansByAdmin(currentUser.id);
        const enrichedLoans = (loansData || []).map(l => {
          const client = clients.find(c => c.id === l.client_id);
          return { ...l, clientEmail: client ? client.email : null };
        });
        setLoans(enrichedLoans);
      } else {
        const loansData = await localdb.getLoansByClient(currentUser.id);
        setLoans((loansData || []).map(l => ({ ...l, clientEmail: currentUser.email })));
      }
    } catch (error) {
      // Silent fail
    }
  }, [currentUser, clients]);

  const refreshKycProfiles = useCallback(async () => {
    if (!currentUser) return;
    try {
      if (currentUser.isAdmin) {
        const allClients = await localdb.getAllClients();
        const adminClients = (allClients || []).filter(c => c.admin_id === currentUser.id);
        const kycMap = {};
        await Promise.all(adminClients.map(async (client) => {
          const profile = await localdb.getKycProfile(client.id);
          if (profile) kycMap[client.email] = normalizeKycProfile(profile);
        }));
        setKycProfiles(kycMap);
      } else {
        const kycData = await localdb.getKycProfile(currentUser.id);
        if (kycData) {
          setKycProfiles({ [currentUser.email]: normalizeKycProfile(kycData) });
        }
      }
    } catch (error) {
      // Silent fail
    }
  }, [currentUser]);

  const savePaymentSettings = async (newSettings) => {
    const pMap = { ...paymentSettings, ...newSettings };
    setPaymentSettings(pMap);
    await localdb.savePaymentSettings(currentUser.id, pMap);
  };

  const saveKycProfile = async (email, profileData) => {
    const existing = kycProfiles[email] || normalizeKycProfile(await localdb.getKycProfile(currentUser.id));
    const photosToUpload = {
      profilePhoto: profileData.profilePhoto ?? profileData.profile_photo ?? existing?.profilePhoto ?? existing?.profile_photo,
      idFrontPhoto: profileData.idFrontPhoto ?? profileData.id_front_photo ?? existing?.idFrontPhoto ?? existing?.id_front_photo,
      idBackPhoto: profileData.idBackPhoto ?? profileData.id_back_photo ?? existing?.idBackPhoto ?? existing?.id_back_photo,
    };

    const uploaded = await prepareKycPhotos(photosToUpload, existing || {});

    const pickSavedPhoto = (uploadedVal, currentVal, existingVal) => {
      if (uploadedVal) return uploadedVal;
      if (isStoredImageUri(currentVal)) return currentVal;
      if (isStoredImageUri(existingVal)) return existingVal;
      return null;
    };

    const merged = {
      ...existing,
      ...profileData,
      profilePhoto: pickSavedPhoto(
        uploaded.profilePhoto,
        photosToUpload.profilePhoto,
        existing?.profilePhoto || existing?.profile_photo,
      ),
      profile_photo: pickSavedPhoto(
        uploaded.profilePhoto,
        photosToUpload.profilePhoto,
        existing?.profile_photo || existing?.profilePhoto,
      ),
      idFrontPhoto: pickSavedPhoto(
        uploaded.idFrontPhoto,
        photosToUpload.idFrontPhoto,
        existing?.idFrontPhoto || existing?.id_front_photo,
      ),
      id_front_photo: pickSavedPhoto(
        uploaded.idFrontPhoto,
        photosToUpload.idFrontPhoto,
        existing?.id_front_photo || existing?.idFrontPhoto,
      ),
      idBackPhoto: pickSavedPhoto(
        uploaded.idBackPhoto,
        photosToUpload.idBackPhoto,
        existing?.idBackPhoto || existing?.id_back_photo,
      ),
      id_back_photo: pickSavedPhoto(
        uploaded.idBackPhoto,
        photosToUpload.idBackPhoto,
        existing?.id_back_photo || existing?.idBackPhoto,
      ),
    };

    const normalized = normalizeKycProfile(merged) || merged;
    setKycProfiles(prev => ({ ...prev, [email]: { ...prev[email], ...normalized } }));
    await localdb.saveKycProfile(currentUser.id, merged);
  };

  const getKycProfile = (email) => kycProfiles[email] || null;
  const isKycComplete = (email) => {
    const p = kycProfiles[email];
    if (!p) return false;
    return !!(p.address && p.phone && (p.idNumber || p.id_number) && p.country);
  };

  const createLoanRequest = async (clientEmail, amount, purpose, extra = {}) => {
    const loan = {
      id: Date.now().toString(),
      admin_id: currentUser.adminId,
      client_id: currentUser.id,
      amount: parseFloat(amount),
      interest_rate: 0,
      installments_count: extra.months || 1,
      frequency: 'mensual',
      purpose: purpose || null,
      currency: extra.currency || 'USD',
      status: 'pending',
      created_at: new Date().toISOString(),
      installments: [],
    };
    await localdb.createLoan(loan);
    loan.clientEmail = clientEmail;
    setLoans(prev => [loan, ...prev]);

    if (currentUser.adminId) {
      await localdb.createNotification({
        target: 'admin',
        user_id: currentUser.adminId,
        title: 'Nueva solicitud de préstamo',
        body: `${clientEmail} solicitó un préstamo por $${parseFloat(amount).toFixed(2)}.`,
        data: { loanId: loan.id, clientEmail },
      });
    }

    return loan.id;
  };

  const approveLoan = async (loanId, approvalData) => {
    const updatePayload = {
      status: 'approved',
      disbursement_method: approvalData.disbursementMethod,
      interest_rate: parseFloat(approvalData.interestRate || 0),
      installments_count: parseInt(approvalData.installmentCount || 1),
      start_date: approvalData.firstPaymentDate
    };

    await localdb.updateLoanFields(loanId, updatePayload);

    let newInsts = [];
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    if (approvalData.paymentType === 'installments') {
      const baseAmount = parseFloat(loan.amount);
      const interest = updatePayload.interest_rate / 100;
      const totalWithInterest = baseAmount * (1 + interest);
      const amountPerInstallment = (totalWithInterest / updatePayload.installments_count).toFixed(2);

      for (let i = 0; i < updatePayload.installments_count; i++) {
        const dueDate = new Date(updatePayload.start_date);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        newInsts.push({
          id: `${loanId}_inst_${i + 1}`,
          loan_id: loanId,
          number: i + 1,
          amount: parseFloat(amountPerInstallment),
          due_date: dueDate.toISOString().split('T')[0],
          status: 'pending'
        });
      }
    } else {
      const totalAmount = parseFloat(loan.amount) * (1 + (updatePayload.interest_rate / 100));
      newInsts.push({
        id: `${loanId}_inst_1`,
        loan_id: loanId,
        number: 1,
        amount: totalAmount,
        due_date: updatePayload.start_date,
        status: 'pending'
      });
    }

    await localdb.createInstallments(newInsts);

    setLoans(prev => prev.map(l => {
      if (l.id !== loanId) return l;
      return { ...l, ...updatePayload, installments: newInsts };
    }));
  };

  const rejectLoan = async (loanId, reason) => {
    await localdb.updateLoanFields(loanId, { status: 'rejected' });
    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: 'rejected' } : l));
  };

  const deleteLoan = async (loanId) => {
    await localdb.deleteLoan(loanId);
    setLoans(prev => prev.filter(l => l.id !== loanId));
  };

  const updateLoan = async (loanId, newData) => {
    const payload = {};
    if (newData.purpose !== undefined) payload.purpose = newData.purpose;
    if (newData.interestRate !== undefined) payload.interest_rate = parseFloat(newData.interestRate);
    if (newData.interest_rate !== undefined) payload.interest_rate = parseFloat(newData.interest_rate);
    if (newData.disbursementMethod !== undefined) payload.disbursement_method = newData.disbursementMethod;
    if (newData.disbursement_method !== undefined) payload.disbursement_method = newData.disbursement_method;

    if (Object.keys(payload).length > 0) {
      await localdb.updateLoanFields(loanId, payload);
    }
    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, ...payload, ...newData } : l));
  };

  const refinanceLoan = async (loanId, newInterestRate, newInstallmentsCount, newStartDate) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const unpaidInstallments = loan.installments.filter(i => i.status !== 'paid');
    const remainingBalance = unpaidInstallments.reduce((acc, i) => acc + (i.amount - (i.paid_amount || 0)), 0);

    if (remainingBalance <= 0) return;

    const interest = parseFloat(newInterestRate) / 100;
    const totalWithInterest = remainingBalance * (1 + interest);
    const amountPerInstallment = (totalWithInterest / parseInt(newInstallmentsCount)).toFixed(2);

    const paidInsts = loan.installments.filter(i => i.status === 'paid');
    const unpaidIds = unpaidInstallments.map(i => i.id);

    let newInsts = [];
    for (let i = 0; i < newInstallmentsCount; i++) {
      const dueDate = new Date(newStartDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      newInsts.push({
        id: `${loanId}_ref_${Date.now()}_${i + 1}`,
        loan_id: loanId,
        number: paidInsts.length + i + 1,
        amount: parseFloat(amountPerInstallment),
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending',
        paid_amount: 0,
      });
    }

    await localdb.deleteInstallmentsByIds(loanId, unpaidIds);
    await localdb.createInstallments(newInsts);
    await localdb.updateLoanFields(loanId, {
      interest_rate: parseFloat(newInterestRate),
      installments_count: paidInsts.length + parseInt(newInstallmentsCount),
    });

    const finalInstallments = [...paidInsts, ...newInsts];
    setLoans(prev => prev.map(l => {
      if (l.id !== loanId) return l;
      return { ...l, interest_rate: parseFloat(newInterestRate), installments: finalInstallments };
    }));
  };

  const submitInstallmentPayment = async (loanId, installmentId, proofPhoto, claimedAmount = null, paymentMethod = null) => {
    const loan = loans.find(l => l.id === loanId);
    const inst = loan?.installments?.find(i => i.id === installmentId);
    const proofUrl = await preparePaymentProof(proofPhoto);
    const historyEntry = {
      id: Date.now().toString(),
      claimed_amount: claimedAmount,
      proof_url: proofUrl,
      payment_method: paymentMethod,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
      admin_name: null,
      amount: null,
    };
    const history = [...(inst?.payment_history || []), historyEntry];

    await localdb.updateInstallment(installmentId, {
      status: 'submitted',
      payment_proof_url: proofUrl,
      claimed_amount: claimedAmount,
      payment_history: history,
    }, loanId);

    setLoans(prev => prev.map(l => {
      if (l.id !== loanId) return l;
      return {
        ...l,
        installments: l.installments.map(i => i.id === installmentId ? {
          ...i,
          status: 'submitted',
          payment_proof_url: proofUrl,
          proofPhoto: proofUrl,
          claimedAmount: claimedAmount,
          claimed_amount: claimedAmount,
          payment_history: history,
        } : i),
      };
    }));

    const adminId = loan?.admin_id;
    const cuotaNum = inst?.number || installmentId.split('_').pop();
    if (adminId) {
      await localdb.createNotification({
        target: 'admin',
        user_id: adminId,
        title: 'Comprobante de pago recibido',
        body: `${currentUser.email} subió un comprobante para la cuota #${cuotaNum}.`,
        data: { loanId, installmentId },
      });
    }
  };

  const verifyInstallmentPayment = async (loanId, installmentId, isApproved, approvedAmount = null, adminName = 'Admin') => {
    const loan = loans.find(l => l.id === loanId);
    const inst = loan?.installments?.find(i => i.id === installmentId);
    if (!inst) return;

    const newStatus = isApproved ? 'paid' : 'rejected';
    const finalApprovedAmount = isApproved ? (approvedAmount != null ? parseFloat(approvedAmount) : inst.amount) : 0;

    const history = (inst.payment_history || []).map(h => {
      if (h.status === 'submitted') {
        return {
          ...h,
          status: isApproved ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUser.id,
          admin_name: adminName,
          amount: finalApprovedAmount,
        };
      }
      return h;
    });

    const updateData = {
      status: newStatus,
      payment_history: history,
    };

    if (isApproved) {
      updateData.paid_date = new Date().toISOString().split('T')[0];
      updateData.paid_amount = finalApprovedAmount;
    } else {
      updateData.payment_proof_url = null;
      updateData.claimed_amount = null;
    }

    await localdb.updateInstallment(installmentId, updateData, loanId);

    setLoans(prev => prev.map(l => {
      if (l.id !== loanId) return l;
      return {
        ...l,
        installments: l.installments.map(i => i.id === installmentId ? {
          ...i,
          ...updateData,
          proofPhoto: isApproved ? i.proofPhoto : null,
          payment_proof_url: isApproved ? i.payment_proof_url : null,
        } : i),
      };
    }));

    await localdb.createNotification({
      target: 'client',
      user_id: loan.client_id,
      title: isApproved ? '✅ Pago Aprobado' : '❌ Pago Rechazado',
      body: isApproved 
        ? `Tu pago por la cuota #${inst.number} de $${finalApprovedAmount.toFixed(2)} fue aprobado.`
        : `Tu comprobante para la cuota #${inst.number} fue rechazado. Revisa los detalles de pago.`,
      data: { loanId, installmentId },
    });
  };

  const getNotifications = async (userId) => {
    return await localdb.getNotifications(userId);
  };

  const markNotificationRead = async (notificationId) => {
    await localdb.markNotificationRead(notificationId);
  };

  const adminPayInstallment = (loanId, installmentId) => {
    return verifyInstallmentPayment(loanId, installmentId, true);
  };

  const getPendingPayments = () => {
    const result = [];
    loans.forEach(loan => {
      loan.installments?.forEach(inst => {
        if (inst.status === 'submitted') {
          result.push({ ...inst, loanId: loan.id, clientEmail: loan.clientEmail });
        }
      });
    });
    return result;
  };

  return (
    <DataContext.Provider value={{
      clients,
      loans,
      paymentSettings,
      isReady,
      getKycProfile,
      isKycComplete,
      saveKycProfile,
      createLoanRequest,
      approveLoan,
      rejectLoan,
      deleteLoan,
      updateLoan,
      refinanceLoan,
      submitInstallmentPayment,
      verifyInstallmentPayment,
      adminPayInstallment,
      getPendingPayments,
      savePaymentSettings,
      refreshLoans,
      refreshKycProfiles,
      getNotifications,
      markNotificationRead,
    }}>
      {children}
    </DataContext.Provider>
  );
};
