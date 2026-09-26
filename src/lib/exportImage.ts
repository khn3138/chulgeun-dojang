// html-to-image, jsPDF는 크기가 커서 [보내기]를 누를 때만 불러온다.

export async function renderPng(node: HTMLElement): Promise<Blob> {
  const { toBlob } = await import('html-to-image');
  const blob = await toBlob(node, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true,
  });
  if (!blob) throw new Error('이미지를 만들지 못했어요');
  return blob;
}

/** PNG 한 장을 A4 한 페이지에 맞춰 넣는다. */
export async function pngToPdf(png: Blob): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const dataUrl = await blobToDataUrl(png);
  const { width, height } = await imageSize(dataUrl);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  const scale = Math.min(maxW / width, maxH / height);
  const w = width * scale;
  const h = height * scale;
  pdf.addImage(dataUrl, 'PNG', (pageW - w) / 2, margin, w, h);
  return pdf.output('blob');
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function imageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('이미지 크기를 읽지 못했어요'));
    img.src = src;
  });
}
