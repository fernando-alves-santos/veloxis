'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  }

  return (
    <button onClick={handleSignOut} className="vx-btn" style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--line)' }}>
      Sair
    </button>
  );
}
