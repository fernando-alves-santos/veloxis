export const BUCKET = 'veiculo-arquivos';

async function decodificar(file: File): Promise<{ src: CanvasImageSource; w: number; h: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      // 'from-image' respeita a rotação da foto tirada no celular.
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as any);
      return { src: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
    } catch {
      // cai para o método via <img>
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('Não consegui ler esta imagem.'));
    img.src = url;
  });
  return { src: img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

export async function redimensionar(file: File, maxLado: number, qualidade: number): Promise<Blob> {
  const d = await decodificar(file);
  try {
    const escala = Math.min(1, maxLado / Math.max(d.w, d.h));
    const w = Math.max(1, Math.round(d.w * escala));
    const h = Math.max(1, Math.round(d.h * escala));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(d.src, 0, 0, w, h);
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob(b => (b ? res(b) : rej(new Error('Falha ao comprimir a imagem.'))), 'image/jpeg', qualidade)
    );
  } finally {
    d.close();
  }
}
