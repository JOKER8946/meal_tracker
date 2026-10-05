import {execFileSync} from 'node:child_process';
import {readFile,readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
const files=new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean));
async function walk(dir){if(!existsSync(dir))return;for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(file.endsWith('.js'))files.add(file);}}
await walk('.next/static');
const secrets=['TEST_USER_A_PASSWORD','TEST_USER_B_PASSWORD','SUPABASE_SERVICE_ROLE_KEY','VERCEL_TOKEN','VERCEL_OIDC_TOKEN'].map(k=>process.env[k]).filter(Boolean);
const failures=[];
// Reviewed public constants in base64, nanoid and an Object.keys polyfill can
// coincidentally contain short numeric test passwords. Exclude only these entire
// quoted literals, never an arbitrary password match or a whole dependency file.
const publicLiterals=[
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~',
  '0123456789abcdef',
  'ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW',
  '0123456789',
];
let reviewed=0;
for(const file of files){
  let text=(await readFile(file)).toString('utf8');
  for(const literal of publicLiterals){for(const quote of ['"',"'"]){const quoted=quote+literal+quote;if(text.includes(quoted)){reviewed++;text=text.split(quoted).join('[reviewed public alphabet]');}}}
  if(secrets.some(s=>text.includes(s)))failures.push(file);
}
if(failures.length)throw new Error(`Private credentials found in: ${failures.join(', ')}. Values withheld.`);
for(const file of ['.env.local','.env.production']){
  try{execFileSync('git',['check-ignore','-q',file]);}catch{throw new Error(`${file} is not ignored by Git.`);}
}
console.log(`PASS: scanned ${files.size} source/assets/client-bundle files; no configured private credentials found outside ${reviewed} reviewed public alphabet literals. Local environment files are ignored.`);
