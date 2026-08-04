'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Arquivo } from '@/lib/veloxis';

const BUCKET = 'veiculo-arquivos';

export default function FileUploader({
  vehicleId, arquivos, contexto, onChange, showContextoBadge,
}: {
  vehicleId: string; arquivos: Arquivo[]; contexto: string;
  onChange: (novos: Arquivo[]) => void; showContextoBadge?: boolean;
}) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Sessão expirada, faça login novamente.'); setUploading(false); return; }
    const novos: Arquivo[] = [];
    for (const file of Array.from(files)) {
      const path = `${user.id}/${vehicleId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) { setError(upErr.message); continue; }
      novos.push({ id: crypto.randomUUID(), nome: file.name, path, contexto, data: new Date().toISOString() });
    }
    setUploading(false);
    if (novos.length) onChange([...arquivos, ...novos]);
  }

  async function abrirArquivo(a: Arquivo) {
    // Abre a aba já no clique (antes do await), para navegadores de celular não bloquearem como pop-up.
    const novaAba = window.open('', '_blank');
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(a.path, 60 * 5);
    if (error || !data) {
      if (novaAba) novaAba.close();
      alert('Não consegui abrir o arquivo: ' + (error?.message || ''));
      return;
    }
    if (novaAba) {
      novaAba.location.href = data.signedUrl;
    } else {
      // Se mesmo assim o navegador bloqueou a aba nova, abre no lugar da aba atual.
      window.location.href = data.signedUrl;
    }
  }

  async function excluirArquivo(a: Arquivo) {
    if (!confirm(`Excluir o arquivo "${a.nome}"?`)) return;
    await supabase.storage.from(BUCKET).remove([a.path]);
    onChange(arquivos.filter(x => x.id !== a.id));
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <input type="file" multiple onChange={e => handleFiles(e.target.files)} disabled={uploading} style={{ color: 'var(--text)', fontSize: 12.5 }} />
        {uploading && <span style={{ color: 'var(--muted)', fontSize: 12 }}>Enviando...</span>}
      </div>
      {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{error}</div>}
      {arquivos.length === 0 ? (
        <div className="vx-note">Nenhum arquivo enviado ainda. PDF, foto do documento, recibo, comprovante — o que você tiver em mãos.</div>
      ) : (
        <table className="vx-table">
          <thead><tr><th>Arquivo</th>{showContextoBadge && <th>Origem</th>}<th>Enviado em</th><th></th></tr></thead>
          <tbody>
            {arquivos.map(a => (
              <tr key={a.id}>
                <td><a onClick={() => abrirArquivo(a)} style={{ cursor: 'pointer' }}>{a.nome}</a></td>
                {showContextoBadge && <td><span className="vx-badge muted">{a.contexto}</span></td>}
                <td style={{ color: 'var(--muted)' }}>{new Date(a.data).toLocaleDateString('pt-BR')}</td>
                <td><button className="vx-iconbtn" onClick={() => excluirArquivo(a)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
