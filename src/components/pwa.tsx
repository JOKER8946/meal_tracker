'use client';
import {useEffect,useState} from 'react';
import {Download} from 'lucide-react';
import {Modal} from './modal';
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
export function Pwa(){
  const [prompt,setPrompt]=useState<InstallEvent|null>(null);const [installed,setInstalled]=useState(false);const [help,setHelp]=useState(false);const [offline,setOffline]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{
    if(process.env.NODE_ENV==='production'&&'serviceWorker'in navigator){navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>setError('Install support could not load. Refresh when you’re connected.'));}
    setInstalled(window.matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone));
    const capture=(event:Event)=>{event.preventDefault();setPrompt(event as InstallEvent);};
    const accepted=()=>{setInstalled(true);setPrompt(null);};const connection=()=>setOffline(!navigator.onLine);connection();
    window.addEventListener('beforeinstallprompt',capture);window.addEventListener('appinstalled',accepted);window.addEventListener('online',connection);window.addEventListener('offline',connection);
    return()=>{window.removeEventListener('beforeinstallprompt',capture);window.removeEventListener('appinstalled',accepted);window.removeEventListener('online',connection);window.removeEventListener('offline',connection);};
  },[]);
  async function install(){if(!prompt){setHelp(true);return;}try{await prompt.prompt();const result=await prompt.userChoice;if(result.outcome==='accepted')setInstalled(true);setPrompt(null);}catch{setHelp(true);}}
  return <><footer className="app-footer"><span>Made for your everyday. <b>✳</b></span>{!installed&&<button className="text-button" onClick={()=>void install()}><Download size={15}/>Install Daily</button>}</footer>{offline&&<p className="offline-notice" role="status">You’re offline. Reconnect before saving changes.</p>}{error&&<p role="status" className="error">{error}</p>}{help&&<Modal title="Daily, on your home screen" onClose={()=>setHelp(false)}><p>Open Daily in your phone’s main browser, then:</p><ul className="install-instructions"><li><strong>iPhone / iPad:</strong> in Safari, tap Share, then Add to Home Screen.</li><li><strong>Android:</strong> in Chrome, open the ⋮ menu and choose Install app or Add to Home screen.</li><li><strong>Desktop:</strong> look for the install icon in the browser’s address bar.</li></ul><p className="fine">Your journal needs an internet connection to load and save. Installation is available over HTTPS or localhost.</p></Modal>}</>;
}
