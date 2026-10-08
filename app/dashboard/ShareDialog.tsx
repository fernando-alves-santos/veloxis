'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Vehicle, fotosOrdenadas } from '@/lib/veloxis';
import { BUCKET } from '@/lib/fotos';

export default function ShareDialog({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const supabase = createClient();
  const fotos = fotosOrdenadas(vehicle);
  const texto = vehicle.data.descricao || '';
  const [files, setFiles] = useState<File[]>([]);
  const [pronto, setPronto] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const paths = fotos.map(f => f.path);
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 10);
        if (error || !data) throw new Error(error?.message || 'Não consegui acessar as fotos.');
        const base = (vehicle.placa || 'veiculo').replace(/[^A-Za-z0-9]/g, '') || 'veiculo';
        const lista: File[] = [];
        for (let i = 0; i < data.length; i++) {
          const url = data[i].signedUrl;
          if (!url) continue;
          const r = await fetch(url);
          if (!r.ok) throw new Error('Falha ao baixar a foto ' + (i + 1) + '.');
          const blob = await r.blob();
          lista.push(new File([blob], `${base}-${String(i + 1).padStart(2, '0')}.jpg`, { type: 'image/jpeg' }));
          if (!cancelado) setProgresso(i + 1);
        }
        if (!cancelado) { setFiles(lista); setPronto(true); }
      } catch (e: any) {
        if (!cancelado) setErro(e?.message || 'Erro ao preparar as fotos.');
      }
    })();
    return () => { cancelado = true; };
  }, []);

  async function copiar(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      return false;
    }
  }

  async function enviar() {
    setAviso('');
    // Já copia a descrição: se o WhatsApp não trouxer o texto junto das fotos, é só colar na legenda.
    if (texto) copiar();
    try {
      await navigator.share({ files, text: texto });
    } catch (e: any) {
      if (e?.name !== 'AbortError') setAviso('Não consegui abrir o compartilhamento. Use "Baixar fotos" e "Copiar descrição".');
    }
  }

  async function botaoCopiar() {
    setAviso((await copiar()) ? 'Descrição copiada.' : 'Não consegui copiar. Selecione o texto e copie manualmente.');
  }

  function baixar() {
    files.forEach((f, i) => {
      setTimeout(() => {
        const url = URL.createObjectURL(f);
        const a = document.createElement('a');
        a.href = url;
        a.download = f.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }, i * 350);
    });
  }

  const podeCompartilhar = pronto && typeof navigator !== 'undefined' && !!(navigator as any).canShare && (navigator as any).canShare({ files });

  return (
    <div className="vx-overlay" style={{ zIndex: 70 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="vx-modal" style={{ maxWidth: 520 }}>
        <div className="vx-modal-head">
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>COMPARTILHAR VEÍCULO</div>
            <div className="vx-sub">{fotos.length} FOTO{fotos.length === 1 ? '' : 'S'} + DESCRIÇÃO</div>
          </div>
          <button className="vx-close" onClick={onClose}>✕</button>
        </div>

        {erro && <div className="vx-note" style={{ color: 'var(--red)', marginBottom: 12 }}>{erro}</div>}

        {!pronto && !erro && (
          <div className="vx-note" style={{ marginBottom: 12 }}>PREPARANDO FOTOS... {progresso}/{fotos.length}</div>
        )}

        {!texto && (
          <div className="vx-note" style={{ marginBottom: 12 }}>Este veículo ainda não tem descrição salva. Só as fotos serão enviadas.</div>
        )}

        {texto && (
          <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left', fontFamily: 'inherit', fontSize: 12.5, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: 12, maxHeight: 220, overflowY: 'auto', margin: '0 0 14px' }}>{texto}</pre>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {podeCompartilhar && (
            <button className="vx-btn" onClick={enviar} style={{ justifyContent: 'center' }}>
              ENVIAR {fotos.length} FOTO{fotos.length === 1 ? '' : 'S'} + DESCRIÇÃO
            </button>
          )}
          {pronto && !podeCompartilhar && (
            <div className="vx-note">Este aparelho/navegador não permite enviar fotos direto para o WhatsApp. Use os botões abaixo: baixe as fotos e cole a descrição na conversa.</div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {texto && <button className="vx-btn secondary" onClick={botaoCopiar} style={{ flex: 1, justifyContent: 'center' }}>COPIAR DESCRIÇÃO</button>}
            {pronto && <button className="vx-btn secondary" onClick={baixar} style={{ flex: 1, justifyContent: 'center' }}>BAIXAR FOTOS</button>}
          </div>
          {podeCompartilhar && texto && (
            <div className="vx-hint" style={{ marginBottom: 0 }}>A descrição é copiada automaticamente ao enviar. Se o WhatsApp abrir só com as fotos, cole o texto na legenda.</div>
          )}
          {aviso && <div className="vx-hint" style={{ marginBottom: 0, color: 'var(--silver)' }}>{aviso}</div>}
        </div>
      </div>
    </div>
  );
}
