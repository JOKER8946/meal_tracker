'use client';
import { useEffect,useState } from 'react';
import { Pencil,Trash2 } from 'lucide-react';
import {motion,useReducedMotion} from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { mealEmoji,type Meal } from '@/lib/types';
export function MealCard({meal,onEdit,onDelete}:{meal:Meal;onEdit:()=>void;onDelete:()=>void}) {
  const reduced=useReducedMotion();
  const [url,setUrl]=useState('');const [error,setError]=useState(false);const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;let objectUrl='';setUrl('');setError(false);
    supabase().storage.from('meal-photos').download(meal.photo_path).then(({data,error})=>{
      if(!active)return;
      if(error||!data){setError(true);return;}
      objectUrl=URL.createObjectURL(data);setUrl(objectUrl);
    }).catch(()=>{if(active)setError(true);});
    return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[meal.photo_path,retry]);
  return <motion.article className="meal-card" initial={reduced?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.22}}>
    <div className="meal-image">{url?<img src={url} alt={`${meal.meal_type} meal`} loading="lazy"/>:error?<button onClick={()=>setRetry(v=>v+1)}>Retry photo</button>:<span aria-label="Loading photo">{mealEmoji[meal.meal_type]}</span>}<span className={`meal-tag ${meal.meal_type}`}>{mealEmoji[meal.meal_type]} {meal.meal_type}</span></div>
    <div className="meal-body"><div className="flex items-center justify-between gap-2"><h3>{meal.meal_type[0].toUpperCase()+meal.meal_type.slice(1)}</h3><time dateTime={meal.eaten_at}>{new Date(meal.eaten_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</time></div><p>{meal.notes||'A moment of nourishment.'}</p><div className="card-actions"><button onClick={onEdit} aria-label={`Edit ${meal.meal_type}`}><Pencil size={15}/>Edit</button><button onClick={onDelete} aria-label={`Delete ${meal.meal_type}`}><Trash2 size={15}/>Delete</button></div></div>
  </motion.article>;
}
