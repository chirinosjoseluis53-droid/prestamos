export const isStoredImageUri = (uri) =>
  typeof uri === 'string' && (uri.startsWith('http') || uri.startsWith('data:image/'));

export async function prepareKycPhotos(photos, existing = {}) {
  const result = {};
  const fields = [
    ['profilePhoto', 720],
    ['idFrontPhoto', 1200],
    ['idBackPhoto', 1200],
  ];

  for (const [key, maxWidth] of fields) {
    const val = photos[key];
    const existingVal = existing[key] || existing[key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)];
    if (!val) {
      result[key] = isStoredImageUri(existingVal) ? existingVal : null;
    } else if (isStoredImageUri(val)) {
      result[key] = val;
    } else if (val instanceof File) {
      result[key] = await resizeImageWeb(val, maxWidth);
    } else if (typeof val === 'string' && val.startsWith('data:image')) {
      result[key] = val; 
    } else {
      result[key] = isStoredImageUri(existingVal) ? existingVal : null;
    }
  }
  return result;
}

export async function preparePaymentProof(photo) {
  if (!photo) return null;
  if (isStoredImageUri(photo)) return photo;
  if (photo instanceof File) {
    return await resizeImageWeb(photo, 1200);
  }
  return photo;
}

function resizeImageWeb(file, maxWidth) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.6); 
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Error cargando imagen'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Error leyendo archivo'));
    reader.readAsDataURL(file);
  });
}
