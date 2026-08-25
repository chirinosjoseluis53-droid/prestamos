export const getDueDate = (inst) => inst?.due_date || inst?.dueDate || null;

export const getInterestRate = (loan) => loan?.interest_rate ?? loan?.interestRate ?? 0;

export const getCreatedAt = (loan) => loan?.created_at || loan?.createdAt || null;

export const getDisbursementMethod = (loan) => loan?.disbursement_method || loan?.disbursementMethod || 'cash';

export const getPaidDate = (inst) => inst?.paid_date || inst?.paid_at || null;

export const isKycVerified = (profile) =>
  !!(profile?.faceVerified || profile?.face_verified || profile?.kycCompletedAt);

export const formatLoanDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const getTotalPaid = (installments = []) =>
  installments.reduce((acc, i) => acc + (i.paid_amount || (i.status === 'paid' ? i.amount : 0)), 0);

export const getLoanStatus = (loan) => {
  const installments = loan?.installments || [];
  const hasSubmitted = installments.some((i) => i.status === 'submitted');
  const hasOverdue = installments.some((i) => {
    if (i.status === 'paid') return false;
    const due = getDueDate(i);
    if (!due) return false;
    return new Date(due + 'T00:00:00') < new Date(new Date().setHours(0, 0, 0, 0));
  });
  if (hasSubmitted) return { label: 'EN REVISIÓN', color: '#F39C12' };
  if (hasOverdue) return { label: 'EN MORA', color: '#E74C3C' };
  return { label: 'AL DÍA', color: '#0FA46C' };
};
