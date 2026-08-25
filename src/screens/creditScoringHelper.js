// Inline credit scoring helper (no mobile dependencies)
export const calculateCreditScore = (clientEmail, loans = [], getKycProfile) => {
  if (!clientEmail) return { score: 0, label: 'Sin Datos', color: '#EF4444', description: 'Perfil incompleto. Comienza tu primer préstamo para ganar puntos.' };

  const profile = getKycProfile ? getKycProfile(clientEmail) : null;
  const clientLoans = loans.filter(l => l.clientEmail === clientEmail);

  let kycPts = 0, profilePts = 0, paymentsPts = 0, completedPts = 0;

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
  let label = 'Sin historial', color = '#A0AAB2', description = 'Aún no tienes préstamos. Realiza tu primer préstamo para comenzar a acumular puntos.';
  if (score >= 85) { label = 'Excelente'; color = '#10B981'; description = 'Cliente confiable con historial impecable. Acceso a mejores tasas y montos.'; }
  else if (score >= 70) { label = 'Bueno'; color = '#3B82F6'; description = 'Buen historial de pagos. Sigue así para alcanzar el nivel Excelente.'; }
  else if (score >= 50) { label = 'Regular'; color = '#F59E0B'; description = 'Historial moderado. Completa tus pagos a tiempo para mejorar tu score.'; }
  else if (score >= 20) { label = 'En desarrollo'; color = '#F97316'; description = 'Estás comenzando tu historial. Mantén tus pagos al día.'; }
  else { label = 'Sin historial'; color = '#A0AAB2'; description = 'Aún no tienes préstamos. Realiza tu primer préstamo para comenzar.'; }

  return { score, label, color, description };
};
