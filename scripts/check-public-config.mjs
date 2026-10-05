const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(!url||!key)throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before building.');
if(new URL(url).protocol!=='https:')throw new Error('The production Supabase URL must use HTTPS.');
let valid=key.startsWith('sb_publishable_');
if(key.split('.').length===3){try{valid=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon';}catch{valid=false;}}
if(!valid)throw new Error('Supabase client configuration must use an anon/public key, never a secret or service-role key.');
console.log('Public Supabase configuration validated; no key values printed.');
