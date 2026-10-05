'use client';
import { useEffect,useRef,useState,type FormEvent } from 'react';
import { Camera,ImagePlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { compressPhoto,cleanupPhotos } from '@/lib/photos';
import { localInput,inputIso } from '@/lib/dates';
import { mealTypes,mealEmoji,type Meal,type MealType } from '@/lib/types';
import { Modal } from './modal';

export function MealEditor({userId,day,meal,onClose,onSaved}:{userId:string;day:string;meal?:Meal;onClose:()=>void;onSaved:(message:string)=>void}) {
  const [photo,setPhoto]=useState<File>();
  const [preview,setPreview]=useState('');
  const [working,setWorking]=useState(false);
  const [compressing,setCompressing]=useState(false);
  const [error,setError]=useState('');
  const serial=useRef(0);
  const id=useRef(meal?.id||crypto.randomUUID());
  useEffect(()=>{if(!photo)return;const url=URL.createObjectURL(photo);setPreview(url);return()=>URL.revokeObjectURL(url);},[photo]);
  useEffect(()=>()=>{serial.current++;},[]);
  async function choose(file?:File) {
    if(!file)return;
    const run=++serial.current;setCompressing(true);setPhoto(undefined);setPreview('');setError('');
    try {const result=await compressPhoto(file);if(serial.current===run)setPhoto(result);}
    catch(e){if(serial.current===run)setError(e instanceof Error?e.message:'Could not read this photo.');}
    finally{if(serial.current===run)setCompressing(false);}
  }
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();if(working||compressing)return;setError('');
    if(!photo&&!meal){setError('Add a photo of your meal first.');return;}
    setWorking(true);let uploaded:string|undefined;
    try {
      const f=new FormData(e.currentTarget),time=String(f.get('time'));
      const eaten_at=inputIso(time);
      if(photo){
        uploaded=`${userId}/${crypto.randomUUID()}.${photo.type==='image/webp'?'webp':'jpg'}`;
        const {error}=await supabase().storage.from('meal-photos').upload(uploaded,photo,{contentType:photo.type,cacheControl:'0',upsert:false});
        if(error)throw error;
      }
      const payload={id:id.current,user_id:userId,notes:String(f.get('notes')).trim(),meal_type:String(f.get('type')) as MealType,eaten_at,meal_date:time.slice(0,10),photo_path:uploaded||meal!.photo_path};
      const result=meal ? await supabase().from('meals').update(payload).eq('id',meal.id).eq('user_id',userId).select('id').single() : await supabase().from('meals').insert(payload).select('id').single();
      if(result.error){
        // A lost response may still have committed. Verify before removing its photo.
        const probe=await supabase().from('meals').select('photo_path').eq('id',id.current).maybeSingle();
        if(probe.error)throw new Error('Could not confirm the save. Check your history before retrying; the photo has been kept safely.');
        if(!probe.data || probe.data.photo_path!==payload.photo_path){if(uploaded)await cleanupPhotos(userId,[uploaded]);throw result.error;}
      }
      let message=meal?'Meal updated.':'Meal saved. Nice nourishment!';
      if(uploaded&&meal){try{await cleanupPhotos(userId,[meal.photo_path]);}catch(e){message=e instanceof Error?e.message:message;}}
      onSaved(message);
    }catch(e){setError(e instanceof Error?e.message:'Could not save your meal. Check your connection and try again.');}
    finally{setWorking(false);}
  }
  return <Modal title={meal?'Edit your meal':'A little nourishment'} onClose={onClose} busy={working||compressing}>
    <form onSubmit={submit}>
      <div className="photo-picker">{preview ? <img src={preview} alt="Meal photo preview"/> : <div className="photo-placeholder"><span aria-hidden="true">📸</span><strong>{meal?'Keep your photo or add a new one':'What’s on your plate?'}</strong><small>JPEG, PNG or WebP · up to 25 MB</small></div>}
      <div className="photo-actions"><label className="button secondary"><Camera size={18}/>Camera<input aria-label="Take meal photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={working||compressing} onChange={e=>void choose(e.target.files?.[0])}/></label><label className="button secondary"><ImagePlus size={18}/>Gallery<input aria-label="Choose meal photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={working||compressing} onChange={e=>void choose(e.target.files?.[0])}/></label></div>
      <p className="fine" role="status">{compressing?'Making your photo lighter…':photo?`Ready to upload · ${Math.ceil(photo.size/1000)} KB · ${photo.type==='image/webp'?'WebP':'JPEG'}`:'Photos stay private. We make them smaller before uploading.'}</p></div>
      <label>Meal type<select name="type" defaultValue={meal?.meal_type||'breakfast'}>{mealTypes.map(t=><option key={t} value={t}>{mealEmoji[t]} {t[0].toUpperCase()+t.slice(1)}</option>)}</select></label>
      <label>Date & time<input name="time" type="datetime-local" required defaultValue={meal?localInput(meal.eaten_at):`${day}T${localInput(new Date().toISOString()).slice(11)}`}/></label>
      <label>Meal notes<textarea name="notes" maxLength={5000} defaultValue={meal?.notes||''} placeholder="What did you eat? How did it feel?"/></label>
      {error&&<p className="error" role="alert">{error}</p>}
      <button className="button primary w-full" disabled={working||compressing}>{working?'Saving your meal…':meal?'Save changes':'Save meal'}</button>
    </form>
  </Modal>;
}
