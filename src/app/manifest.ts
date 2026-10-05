import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest {
  return {id:'/',name:'Daily — meals & sleep',short_name:'Daily',description:'Your private, colorful meal and sleep journal.',start_url:'/',scope:'/',display:'standalone',background_color:'#faf8f3',theme_color:'#612be9',lang:'en',icons:[{src:'/icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icons/maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]};
}
