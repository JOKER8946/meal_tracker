'use client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Auth } from './auth';
import { Journal } from './journal';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    let active = true;
    try {
      const client = supabase();
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (!active) return;
        if (event === 'PASSWORD_RECOVERY') setRecovery(true);
        if (event === 'SIGNED_OUT') setRecovery(false);
        setUser(session?.user ?? null); setLoading(false);
      });
      client.auth.getSession().then(({ data, error }) => {
        if (!active) return;
        if (error) setError(error.message);
        setUser(data.session?.user ?? null); setLoading(false);
      }).catch(() => { if (active) {setError('Could not restore your session. Please reload.');setLoading(false);} });
      return () => {active = false;data.subscription.unsubscribe();};
    } catch (err) {setError(err instanceof Error ? err.message : 'Unable to connect.');setLoading(false);}
    return () => {active = false;};
  }, []);
  if (loading) return <main className="loading" role="status">Opening your daily space…</main>;
  if (error) return <main className="loading"><p role="alert">{error}</p><button onClick={() => location.reload()}>Try again</button></main>;
  if (recovery) return <Auth recovery onRecovered={() => setRecovery(false)}/>;
  if (!user) return <Auth/>;
  return <Journal key={user.id} user={user}/>;
}
