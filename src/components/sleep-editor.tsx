'use client';
import { useState,type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { durationLabel,inputIso,localInput,shiftDay,sleepDuration } from '@/lib/dates';
import type { Sleep } from '@/lib/types';
import { Modal } from './modal';
export function SleepEditor({userId,day,sleep,onClose,onSaved}:{userId:string;day:string;sleep?:Sleep;onClose:()=>void;onSaved:()=>void}) {
  const [start,setStart]=useState(sleep?localInput(sleep.slept_at):`${shiftDay(day,-1)}T23:00`);
  const [end,setEnd]=useState(sleep?localInput(sleep.woke_at):`${day}T07:00`);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  let duration='Choose your bedtime and wake-up time';
  try{duration=durationLabel(sleepDuration(start,end));}catch{}
  async function submit(e:FormEvent){e.preventDefault();setError('');setBusy(true);try{
    sleepDuration(start,end);
    const payload={user_id:userId,sleep_date:end.slice(0,10),slept_at:inputIso(start),woke_at:inputIso(end)};
    const result=sleep?await supabase().from('sleep_logs').update(payload).eq('id',sleep.id).eq('user_id',userId).select('id').single():await supabase().from('sleep_logs').insert(payload).select('id').single();
    if(result.error)throw new Error(result.error.code==='23505'?'You already have a sleep log for that wake-up day. Open that day to edit it.':result.error.message);
    onSaved();
  }catch(e){setError(e instanceof Error?e.message:'Could not save your sleep. Please try again.');}finally{setBusy(false);}}
  return <Modal title={sleep?'Edit your rest':'Time to recharge'} busy={busy} onClose={onClose}><form onSubmit={submit}>
    <div className="sleep-preview"><span aria-hidden="true">☾</span><strong>{duration}</strong><small>Calculated from the times below</small></div>
    <label>Bedtime<input type="datetime-local" required value={start} onChange={e=>setStart(e.target.value)}/></label>
    <label>Wake-up time<input type="datetime-local" required value={end} onChange={e=>setEnd(e.target.value)}/></label>
    <p className="fine">This night appears on the day you wake up. Sleeping past midnight? Choose the previous date for bedtime.</p>
    {error&&<p className="error" role="alert">{error}</p>}<button className="button primary w-full" disabled={busy}>{busy?'Saving your rest…':sleep?'Save sleep changes':'Save sleep'}</button>
  </form></Modal>;
}
