'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Vehicle, Foto, fotoPrincipal } from '@/lib/veloxis';
import { BUCKET, redimensionar } from '@/lib/fotos';
import { limparDescricao, Contato } from '@/lib/descricao';
import ShareDialog from './ShareDialog';

export default function FotosDescricao({ v, persist }: { v: Vehicle; persist: (v: Vehicle) => void }) {
  const supabase = createClient();
  const fotos = v.data.fotos || [];
  const principal = fotoPrincipal(v);
  const inputRef = useRef<HTMLInputElement>(null);

  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState('');
  const [erro, setErro] = useState('');

  const [contato, setContato] = useState<Contato>({ nome: '', telefone: '' });
  const [contatoSalvo, setContatoSalvo] = useState(false);
  const [msgContato, setMsgContato] = useState('');

  const [texto, setTexto] = useState(v.data.descricao || '');
  const [msgTexto, setMsgTexto] = useState('');
  const [compartilhar, setCompartilhar] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const m: any = user?.user_metadata || {};
      const c = { nome: m.contato_nome || '', telefone: m.contato_telefone || '' };
      setContato(c);
      setContatoSalvo(!!c.telefone);
    });
  }, []);

  useEffect(() => {
    const faltando = fotos.map(f => f.thumbPath).filter(p => !thumbs[p]);
    if (!faltando.length) return;
    supabase.storage.from(BUCKET).createSignedUrls(faltando, 60 * 60).then(({ data }) => {
      if (!data) return;
      const novo: Record<string, string> = {};
      data.forEach(d => { if (d.path && d.signedUrl) novo[d.path] = d.signedUrl; });
      setThumbs(prev => ({ ...prev, ...novo }));
    });
  }, [fotos.map(f => f.id).join(',')]);

  async function adicionar(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErro('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro('Sessão expirada, faça login novamente.'); return; }
    const lista = Array.from(files);
    const novas: Foto[] = [];
    for (let i = 0; i < lista.length; i++) {
      const file = lista[i];
      setEnviando(`ENVIANDO FOTO ${i + 1} DE ${lista.length}...`);
      if (!file.type.startsWith('image/')) { setErro(`"${file.name}" não é uma imagem.`); continue; }
      try {
        const id = crypto.randomUUID();
        const grande = await redimensionar(file, 1600, 0.82);
        const pequena = await redimensionar(file, 480, 0.75);
        const path = `${user.id}/${v.id}/fotos/${id}.jpg`;
        const thumbPath = `${user.id}/${v.id}/fotos/${id}-thumb.jpg`;
        const r1 = await supabase.storage.from(BUCKET).upload(path, grande, { contentType: 'image/jpeg' });
        if (r1.error) throw new Error(r1.error.message);
        const r2 = await supabase.storage.from(BUCKET).upload(thumbPath, pequena, { contentType: 'image/jpeg' });
        if (r2.error) {
          await supabase.storage.from(BUCKET).remove([path]);
          throw new Error(r2.error.message);
        }
        novas.push({ id, nome: file.name, path, thumbPath, data: new Date().toISOString() });
      } catch (e: any) {
        setErro(`${file.name}: ${e?.message || 'erro ao enviar'}`);
      }
    }
    setEnviando('');
    if (inputRef.current) inputRef.current.value = '';
    if (novas.length) {
      persist({
        ...v,
        data: { ...v.data, fotos: [...fotos, ...novas], fotoPrincipalId: principal?.id || novas[0].id },
      });
    }
  }

  function definirPrincipal(id: string) {
    persist({ ...v, data: { ...v.data, fotoPrincipalId: id } });
  }

  async function excluir(f: Foto) {
    if (!confirm('Excluir esta foto?')) return;
    await supabase.storage.from(BUCKET).remove([f.path, f.thumbPath]);
    const restantes = fotos.filter(x => x.id !== f.id);
    const novoPrincipal = principal?.id === f.id ? (restantes[0]?.id || '') : (v.data.fotoPrincipalId || '');
    persist({ ...v, data: { ...v.data, fotos: restantes, fotoPrincipalId: novoPrincipal } });
  }

  async function salvarContato() {
    setMsgContato('');
    if (contato.telefone.replace(/\D/g, '').length < 10) { setMsgContato('Informe o telefone com DDD.'); return; }
    const { error } = await supabase.auth.updateUser({ data: { contato_nome: contato.nome.trim(), contato_telefone: contato.telefone.trim() } });
    if (error) { setMsgContato('Erro ao salvar: ' + error.message); return; }
    setContatoSalvo(true);
    setMsgContato('Contato salvo. Vale para todos os seus veículos.');
  }

  function limpar() {
    setMsgTexto('');
    if (!contatoSalvo) { setMsgTexto('Salve o seu contato (acima) antes de usar "LIMPAR E AJUSTAR".'); return; }
    if (!texto.trim()) { setMsgTexto('Cole o texto do grupo primeiro.'); return; }
    const r = limparDescricao(texto, contato);
    setTexto(r.texto);
    setMsgTexto('Texto ajustado. Confira e clique em SALVAR DESCRIÇÃO.');
  }

  function salvarDescricao() {
    persist({ ...v, data: { ...v.data, descricao: texto } });
    setMsgTexto('Descrição salva.');
  }

  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setMsgTexto('Descrição copiada.'); }
    catch { setMsgTexto('Não consegui copiar. Selecione o texto e copie manualmente.'); }
  }

  const alterado = texto !== (v.data.descricao || '');

  return (
    <div>
      <div className="vx-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Fotos do veículo ({fotos.length})</h3>
          <button className="vx-btn" onClick={() => {
            if (!fotos.length) { alert('Adicione fotos primeiro.'); return; }
            setCompartilhar(true);
          }}>COMPARTILHAR</button>
        </div>
        <div className="vx-hint">Toque na estrela para escolher a foto principal. Ela aparece na lista de veículos e é a primeira a ser enviada.</div>

        <div className="vx-fotos">
          {fotos.map(f => {
            const ehPrincipal = principal?.id === f.id;
            return (
              <div key={f.id} className={`vx-foto ${ehPrincipal ? 'principal' : ''}`}>
                {thumbs[f.thumbPath] ? <img src={thumbs[f.thumbPath]} alt="" /> : <div className="vx-foto-vazia">...</div>}
                {ehPrincipal && <span className="vx-foto-tag">PRINCIPAL</span>}
                <button className="vx-foto-btn star" title="Definir como principal" aria-label="Definir como principal" onClick={() => definirPrincipal(f.id)} style={{ color: ehPrincipal ? '#fbbf24' : '#fff' }}>
                  {ehPrincipal ? '★' : '☆'}
                </button>
                <button className="vx-foto-btn del" title="Excluir foto" aria-label="Excluir foto" onClick={() => excluir(f)}>✕</button>
              </div>
            );
          })}
          <label className="vx-foto vx-foto-add">
            <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={!!enviando} onChange={e => adicionar(e.target.files)} />
            <span style={{ fontSize: 22 }}>+</span>
            <span>ADICIONAR FOTOS</span>
          </label>
        </div>
        {enviando && <div className="vx-hint" style={{ marginTop: 10, color: 'var(--silver)' }}>{enviando}</div>}
        {erro && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 10 }}>{erro}</div>}
      </div>

      <div className="vx-card">
        <h3>Seu contato para compartilhar</h3>
        <div className="vx-hint">Preencha uma vez. Este nome e telefone substituem o contato do vendedor em todas as descrições.</div>
        <div className="vx-fieldgrid">
          <div className="vx-field"><label>Nome (como aparece no anúncio)</label><input className="vx-input" value={contato.nome} placeholder='Ex: Fernando "CAFU"' onChange={e => { setContato({ ...contato, nome: e.target.value }); setContatoSalvo(false); }} /></div>
          <div className="vx-field"><label>WhatsApp com DDD</label><input className="vx-input" value={contato.telefone} placeholder="Ex: 19 99999-9999" inputMode="tel" onChange={e => { setContato({ ...contato, telefone: e.target.value }); setContatoSalvo(false); }} /></div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="vx-btn secondary" onClick={salvarContato}>SALVAR CONTATO</button>
          {msgContato && <span style={{ fontSize: 12, color: 'var(--silver)' }}>{msgContato}</span>}
          {!msgContato && contatoSalvo && <span style={{ fontSize: 12, color: 'var(--green)' }}>Contato salvo</span>}
        </div>
      </div>

      <div className="vx-card">
        <h3>Descrição do veículo</h3>
        <div className="vx-hint">Cole o texto que o vendedor mandou no grupo e clique em LIMPAR E AJUSTAR. Remove emojis, alinha à esquerda, tira o link do vendedor e troca o telefone pelo seu. Depois você ainda pode editar à mão.</div>
        <textarea
          className="vx-input"
          rows={16}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Cole aqui o anúncio do grupo..."
          style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }}
        />
        <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="vx-btn secondary" onClick={limpar}>LIMPAR E AJUSTAR</button>
          <button className="vx-btn" onClick={salvarDescricao}>SALVAR DESCRIÇÃO</button>
          {texto && <button className="vx-btn secondary" onClick={copiar}>COPIAR</button>}
          {alterado && <span style={{ fontSize: 12, color: 'var(--amber)' }}>Alterações não salvas</span>}
        </div>
        {msgTexto && <div className="vx-hint" style={{ marginTop: 10, marginBottom: 0, color: 'var(--silver)' }}>{msgTexto}</div>}
      </div>

      {compartilhar && <ShareDialog vehicle={v} onClose={() => setCompartilhar(false)} />}
    </div>
  );
}
