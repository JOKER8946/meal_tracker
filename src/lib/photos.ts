import imageCompression from 'browser-image-compression';
import { supabase } from './supabase';
export async function compressPhoto(file: File) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP photo. For HEIC, export it as JPEG first.');
  if (file.size > 25*1024*1024) throw new Error('Choose a photo smaller than 25 MB.');
  const compressed = await imageCompression(file, { maxSizeMB: .18, maxWidthOrHeight:1280, fileType:'image/webp', initialQuality:.8, useWebWorker:false, maxIteration:15, preserveExif:false });
  if (!['image/webp','image/jpeg'].includes(compressed.type) || compressed.size >= 200000) throw new Error('This photo could not be reduced below 200 KB. Please choose another.');
  const objectUrl=URL.createObjectURL(compressed);
  try {
    const img=new Image(); img.src=objectUrl; await img.decode();
    if(Math.max(img.naturalWidth,img.naturalHeight)>1280)throw new Error('The compressed photo is too large. Please choose another.');
  } finally { URL.revokeObjectURL(objectUrl); }
  return new File([compressed], `photo.${compressed.type==='image/webp'?'webp':'jpg'}`, {type:compressed.type});
}

// Retry failed Storage cleanup on this device. Only owned object paths are saved,
// never tokens, image bytes, journal contents, or signed URLs.
function queueKey(userId: string) { return `daily-photo-cleanup:${userId}`; }
function queued(userId:string):string[] {try{return JSON.parse(localStorage.getItem(queueKey(userId))||'[]');}catch{return [];}}
export async function cleanupPhotos(userId:string,paths:string[] = []) {
  const pending=[...new Set([...queued(userId),...paths])].filter(p=>p.startsWith(`${userId}/`));
  if(!pending.length)return;
  localStorage.setItem(queueKey(userId),JSON.stringify(pending));
  const {error}=await supabase().storage.from('meal-photos').remove(pending);
  if(error)throw new Error('Your entry was saved, but photo cleanup needs a connection. Daily will retry when you return.');
  localStorage.removeItem(queueKey(userId));
}
