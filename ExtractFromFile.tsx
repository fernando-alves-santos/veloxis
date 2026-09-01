'use client';
import { useRef, useState } from 'react';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Não consegui ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

export default function ExtractFromFile({
  tipo,
  onExtracted,
}: {
  tipo: 'compra' | 'venda';
  onExtracted: (data: any) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File | null) {
    if (!f) return;
    setError('');
    setDone(false);
    setLoading(true);
    try {
      const base64 = await fileToBase64(f);
      const res = await fetch('/api/extract-vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, mimeType: f.type || 'application/pdf', tipo }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || 'Não consegui preencher automaticamente.');
        return;
      }
      onExtracted(json.data || {});
      setDone(true);
    } catch (e: any) {
      setError(e?.message || 'Erro ao processar o arquivo.');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div style={{ marginTop: 10, padding: 10, border: '1px dashed var(--border, #333)', borderRadius: 10 }}>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>
        Preencher automaticamente com IA — envie um PDF ou foto (recibo, contrato, CRLV etc.) que os campos abaixo são preenchidos sozinhos.
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        disabled={loading}
        onChange={e => handleFile(e.target.files?.[0] || null)}
      />
      {loading && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Lendo o arquivo e preenchendo os campos...</div>}
      {error && <div style={{ fontSize: 12, color: '#e05', marginTop: 6 }}>{error}</div>}
      {done && !loading && !error && <div style={{ fontSize: 12, color: '#4a8', marginTop: 6 }}>Campos preenchidos! Confira antes de salvar.</div>}
    </div>
  );
}
