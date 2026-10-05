import sharp from 'sharp';
import {mkdir,readFile} from 'node:fs/promises';
await mkdir('public/icons',{recursive:true});
const svg=await readFile('public/favicon.svg');
for(const size of [192,512])await sharp(svg).resize(size,size).png().toFile(`public/icons/icon-${size}.png`);
await sharp(svg).resize(180,180).png().toFile('public/icons/apple-touch-icon.png');
const maskable=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#612be9"/><path d="M256 135v242M135 256h242M170 170l172 172M170 342l172-172" fill="none" stroke="#dcf788" stroke-width="34"/><circle cx="256" cy="256" r="46" fill="#fbbbd7"/></svg>');
await sharp(maskable).png().toFile('public/icons/maskable-512.png');
console.log('Generated 192px, 512px, maskable, and Apple icons.');
