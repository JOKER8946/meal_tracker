'use client';
import { useState, type FormEvent } from 'react';
import { ArrowUpRight, MoonStar, Utensils } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function Auth({ recovery = false, onRecovered }: { recovery?: boolean; onRecovered?: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    try {
      const client = supabase();
      if (recovery) {
        const result = await client.auth.updateUser({ password });
        if (result.error) throw result.error;
        onRecovered?.();
      } else if (mode === 'signup') {
        const result = await client.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (result.error) throw result.error;
        if (!result.data.session) setMessage('Check your email for a confirmation link, then come back to sign in. If you already have an account, sign in instead.');
      } else if (mode === 'reset') {
        const result = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (result.error) throw result.error;
        setMessage('If an account exists for this email, a password reset link is on its way.');
      } else {
        const result = await client.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not connect. Please try again.'); }
    finally { setBusy(false); }
  }
  const title = recovery ? 'A fresh start.' : mode === 'signup' ? 'Make room for you.' : mode === 'reset' ? 'Let’s get you back.' : 'Hello, daily you.';
  return <main className="auth-layout">
    <section className="auth-story"><a className="brand" href="/">daily<span>✳</span></a>
      <div><span className="eyebrow">LITTLE HABITS. BIG ENERGY.</span><h1>Eat colorfully.<br/>Rest deeply.<br/><em>Feel like you.</em></h1>
      <p>A little reflection on what fuels you.<br/>A little more room to recharge.</p></div>
      <div className="story-stickers" aria-hidden="true"><span><Utensils/> good food</span><span><MoonStar/> sweet dreams</span><b>100%<small>YOUR PACE</small></b></div>
      <p className="fine">Your meals. Your sleep. Your space.</p>
    </section>
    <section className="auth-card"><span className="pill">YOUR EVERYDAY COMPANION ✨</span><h2>{title}</h2>
      <p>{recovery ? 'Choose a new password for your account.' : mode === 'signup' ? 'Start your own private food & sleep journal.' : mode === 'reset' ? 'We’ll email you a link to reset your password.' : 'Pick up your food & sleep journal.'}</p>
      {!recovery && mode !== 'reset' && <div className="segmented"><button type="button" aria-pressed={mode === 'login'} onClick={() => {setMode('login');setError('');setMessage('');}}>Sign in</button><button type="button" aria-pressed={mode === 'signup'} onClick={() => {setMode('signup');setError('');setMessage('');}}>Create account</button></div>}
      <form onSubmit={submit}>
        {!recovery && <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254}/></label>}
        {(recovery || mode !== 'reset') && <label>Password<input name="password" type="password" autoComplete={mode === 'signup' || recovery ? 'new-password' : 'current-password'} required minLength={mode === 'signup' || recovery ? 8 : 1} placeholder={mode === 'signup' || recovery ? 'At least 8 characters' : 'Your password'}/></label>}
        {error && <p role="alert" className="error">{error}</p>}{message && <p role="status" className="notice">{message}</p>}
        <button className="button primary" disabled={busy}>{busy ? 'One moment…' : recovery ? 'Save new password' : mode === 'signup' ? 'Create my account' : mode === 'reset' ? 'Send reset link' : 'Let’s go'}<ArrowUpRight size={20}/></button>
      </form>
      {!recovery && <button className="text-button" onClick={() => {setMode(mode === 'reset' ? 'login' : 'reset');setError('');setMessage('');}}>{mode === 'reset' ? 'Back to sign in' : 'Forgot your password?'}</button>}
      <p className="fine">A private journal, just for you. No public profiles.</p>
    </section>
  </main>;
}
