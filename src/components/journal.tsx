'use client';
import { useCallback,useEffect,useState } from 'react';
import dynamic from 'next/dynamic';
import {motion,useReducedMotion} from 'framer-motion';
import type { User } from '@supabase/supabase-js';
import { Plus,MoonStar,Pencil,Trash2,Sun,CalendarDays,ChartNoAxesColumnIncreasing } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cleanupPhotos } from '@/lib/photos';
import { dateKey,fromKey,durationLabel } from '@/lib/dates';
import type { Meal,Sleep } from '@/lib/types';
import { MealEditor } from './meal-editor';
import { MealCard } from './meal-card';
import { Modal } from './modal';
import { SleepEditor } from './sleep-editor';
import { Calendar } from './calendar';
import { Pwa } from './pwa';
const WeeklyCharts=dynamic(()=>import('./weekly-charts'),{ssr:false,loading:()=> <p role="status">Opening your weekly view…</p>});

export function Journal({user}:{user:User}) {
  const reduced=useReducedMotion();
  const [view,setView]=useState<'journal'|'history'|'week'>('journal');
  const [day,setDay]=useState(()=>dateKey(new Date()));
  const [meals,setMeals]=useState<Meal[]>([]);
  const [sleep,setSleep]=useState<Sleep|null>(null);
  const [sleepEditing,setSleepEditing]=useState(false);
  const [sleepDeleting,setSleepDeleting]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const [editing,setEditing]=useState<Meal|'new'|null>(null);
  const [deleting,setDeleting]=useState<Meal|null>(null);const [busy,setBusy]=useState(false);
  const [version,setVersion]=useState(0);
  const refresh=useCallback(()=>setVersion(v=>v+1),[]);
  useEffect(()=>{void cleanupPhotos(user.id).catch(e=>setNotice(e.message));},[user.id]);
  useEffect(()=>{
    let active=true;setLoading(true);setError('');setMeals([]);setSleep(null);
    async function load(){
      const rows:Meal[]=[];
      for(let offset=0;;offset+=1000){
        const {data,error}=await supabase().from('meals').select('*').eq('user_id',user.id).eq('meal_date',day).order('eaten_at').order('id').range(offset,offset+999);
        if(error)throw error;if(!active)return;rows.push(...data as Meal[]);if(data.length<1000)break;
      }
      const night=await supabase().from('sleep_logs').select('*').eq('user_id',user.id).eq('sleep_date',day).maybeSingle();
      if(night.error)throw night.error;
      if(active){setMeals(rows);setSleep(night.data as Sleep|null);}
    }
    load().catch(e=>{if(active)setError(e.message||'Could not load your journal.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[day,user.id,version]);
  async function remove(){if(!deleting)return;setBusy(true);setError('');try{
    const {error}=await supabase().from('meals').delete().eq('id',deleting.id).eq('user_id',user.id);if(error)throw error;
    try{await cleanupPhotos(user.id,[deleting.photo_path]);setNotice('Meal deleted.');}catch(e){setNotice(e instanceof Error?e.message:'Photo cleanup will retry.');}
    setDeleting(null);refresh();
  }catch(e){setError(e instanceof Error?e.message:'Could not delete. Try again.');}finally{setBusy(false);}}
  async function logout(){setError('');const {error}=await supabase().auth.signOut({scope:'local'});if(error)setError(error.message);}
  async function removeSleep(){if(!sleep)return;setBusy(true);try{const {error}=await supabase().from('sleep_logs').delete().eq('id',sleep.id).eq('user_id',user.id);if(error)throw error;setSleepDeleting(false);setNotice('Sleep log deleted.');refresh();}catch(e){setError(e instanceof Error?e.message:'Could not delete sleep.');}finally{setBusy(false);}}
  return <main className="shell"><header className="app-header"><a className="brand" href="/">daily<span>✳</span></a><span className="header-note">EAT WELL. REST EASY.</span><button className="text-button" onClick={()=>void logout()}>Sign out</button></header>
    <nav className="main-nav" aria-label="Main navigation"><button aria-current={view==='journal'?'page':undefined} onClick={()=>{setView('journal');setDay(dateKey(new Date()));}}><Sun size={18}/>Today</button><button aria-current={view==='history'?'page':undefined} onClick={()=>setView('history')}><CalendarDays size={18}/>History</button><button aria-current={view==='week'?'page':undefined} onClick={()=>setView('week')}><ChartNoAxesColumnIncreasing size={18}/>Your week</button></nav>
    <motion.section className="page-heading" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.25}}><div><span className="eyebrow">YOUR EVERYDAY, A LITTLE BRIGHTER</span><h1>{view==='history'?'Your days, collected.':view==='week'?'Find your rhythm.':'Good food. Good rest.'}<span className="heading-star" aria-hidden="true">✷</span></h1><p>Small moments. A fuller picture of you.</p></div><div className="heading-actions"><span className="pace-sticker" aria-hidden="true">a little<br/><b>DAILY MAGIC</b></span><motion.button whileTap={reduced?undefined:{scale:.97}} className="button primary" onClick={()=>setEditing('new')}><Plus size={20}/>Log a meal</motion.button></div></motion.section>
    <div className="day-toolbar"><h2>{day===dateKey(new Date())?'Today':fromKey(day).toLocaleDateString([],{month:'long',day:'numeric'})}<span className="subtle"> / your journal</span></h2><label className="date-filter">Journal date<input type="date" value={day} onChange={e=>{if(e.target.value)setDay(e.target.value);}}/></label></div>
    {notice&&<p role="status" className="notice">{notice}<button className="text-button" onClick={()=>setNotice('')}>Dismiss</button></p>}
    {error&&<div role="alert" className="error">{error}<button className="text-button" onClick={refresh}>Retry</button></div>}
    {view==='week'?<WeeklyCharts userId={user.id} day={day} onDay={setDay} version={version}/>:<>
    {!loading&&!error&&<div className="day-highlights" aria-label="Daily meal counts"><div className="day-total"><span aria-hidden="true">✿</span><div><strong>{meals.length}</strong><small>meals, memories & moments</small></div></div><div className="type-counts">{(['breakfast','lunch','dinner','snack'] as const).map((type,i)=><span key={type}><i aria-hidden="true">{['🍳','🥗','🍜','🍓'][i]}</i><b>{meals.filter(m=>m.meal_type===type).length}</b><small>{type}</small></span>)}</div></div>}
    {!loading&&!error&&<section className="sleep-strip" aria-label="Sleep log"><div className="sleep-icon"><MoonStar/></div><div className="sleep-summary"><span className="eyebrow">LAST NIGHT’S RECHARGE</span><h3>{sleep?durationLabel(Number(sleep.duration_minutes)):'Make room for rest.'}</h3><p>{sleep?`${new Date(sleep.slept_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})} → ${new Date(sleep.woke_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`:'Log your night. Get to know your rhythm.'}</p></div><div className="sleep-controls"><button className="button secondary" onClick={()=>setSleepEditing(true)}>{sleep?<Pencil size={16}/>:<Plus size={18}/>}{sleep?'Edit sleep':'Log sleep'}</button>{sleep&&<button className="icon-button" aria-label="Delete sleep" onClick={()=>setSleepDeleting(true)}><Trash2 size={17}/></button>}</div></section>}
    <div className={view==='history'?'history-layout':''}>{view==='history'&&<Calendar userId={user.id} day={day} onSelect={setDay} version={version}/>}
    {loading?<p role="status">Loading your journal…</p>:<section className="meal-grid" aria-label="Meals">{meals.map(meal=><MealCard key={meal.id} meal={meal} onEdit={()=>setEditing(meal)} onDelete={()=>setDeleting(meal)}/>)}{!meals.length&&!error&&<div className="empty-state"><span aria-hidden="true">🍋</span><h3>A fresh page for your plate.</h3><p>Snap your first meal and capture a little of your day.</p><button className="button secondary" onClick={()=>setEditing('new')}>Add your first meal</button></div>}</section>}</div>
    </>}
    {editing&&<MealEditor userId={user.id} day={day} meal={editing==='new'?undefined:editing} onClose={()=>setEditing(null)} onSaved={message=>{setEditing(null);setNotice(message);refresh();}}/>}
    {sleepEditing&&<SleepEditor userId={user.id} day={day} sleep={sleep||undefined} onClose={()=>setSleepEditing(false)} onSaved={()=>{setSleepEditing(false);setNotice('Sleep saved. Here’s to recharging.');refresh();}}/>}
    {sleepDeleting&&<Modal title="Delete this sleep log?" busy={busy} onClose={()=>setSleepDeleting(false)}><p>This removes the sleep log for this day. This cannot be undone.</p>{error&&<p role="alert" className="error">{error}</p>}<div className="flex gap-3"><button className="button secondary" disabled={busy} onClick={()=>setSleepDeleting(false)}>Keep it</button><button className="button danger" disabled={busy} onClick={()=>void removeSleep()}>Delete sleep log</button></div></Modal>}
    {deleting&&<Modal title="Delete this meal?" onClose={()=>setDeleting(null)} busy={busy}><p>This removes the entry and its private photo. This cannot be undone.</p>{error&&<p role="alert" className="error">{error}</p>}<div className="flex gap-3"><button className="button secondary" disabled={busy} onClick={()=>setDeleting(null)}>Keep it</button><button className="button danger" disabled={busy} onClick={()=>void remove()}>{busy?'Deleting…':'Delete meal'}</button></div></Modal>}
    <Pwa/>
  </main>;
}
