/* SPDX-License-Identifier: MIT
 * Copyright (c) 2026 satokoyo
 */
/* node scripts/build.cjs [existing Babel bundle path] */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const source=fs.readFileSync(path.join(root,'src/wonder-deck.js'),'utf8');
let compact=source;
if(process.argv[2]){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'wonder-deck-build-'));
 const plugin=path.join(temp,'compact-plugin.cjs');
 try{
  fs.writeFileSync(plugin,'module.exports=()=>({manipulateOptions(o){o.compact=true;o.comments=false;o.sourceMaps=false;o.generatorOpts={...o.generatorOpts,compact:true,comments:false};}});');
  compact=require(path.resolve(process.argv[2])).babelTransform(source,path.join(root,'src/wonder-deck.js'),false,[[plugin,{}]],[]).code;
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
const license=fs.readFileSync(path.join(root,'LICENSE'),'utf8');
compact='/*!\n'+license+'*/\n'+compact;
const standalone='javascript:'+encodeURI(compact).replace(/[?#]/g,c=>encodeURIComponent(c));
const integrity='sha384-'+require('node:crypto').createHash('sha384').update(compact).digest('base64');
const loader=fs.readFileSync(path.join(root,'src/loader.js'),'utf8').replace('{{INTEGRITY}}',integrity).replace(/\n/g,'');
const bookmark='javascript:'+encodeURI(loader).replace(/[?#]/g,c=>encodeURIComponent(c));
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const version=source.match(/const VERSION\s*=\s*'([^']+)'/)[1];
const screenshot='data:image/webp;base64,'+fs.readFileSync(path.join(root,'site/assets/deck-desktop.webp')).toString('base64');
const html=fs.readFileSync(path.join(root,'site/index.template.html'),'utf8').replaceAll('{{VERSION}}',()=>escape(version)).replaceAll('{{BOOKMARKLET}}',()=>escape(bookmark)).replaceAll('{{USAGE_SCREENSHOT}}',()=>screenshot);
fs.mkdirSync(dist,{recursive:true});
fs.writeFileSync(path.join(dist,'LICENSE'),license);
fs.writeFileSync(path.join(dist,'wonder-deck.js'),source);
fs.writeFileSync(path.join(dist,'wonder-deck.min.js'),compact);
fs.writeFileSync(path.join(dist,'wonder-deck.bookmarklet.txt'),bookmark+'\n');
fs.writeFileSync(path.join(dist,'index.html'),html);
fs.writeFileSync(path.join(dist,'wonder-deck-'+version+'.js'),compact);
fs.writeFileSync(path.join(dist,'wonder-deck.standalone.txt'),standalone+'\n');
fs.copyFileSync(path.join(root,'data/reference-stats.json'),path.join(dist,'reference-stats-'+version+'.json'));
fs.copyFileSync(path.join(root,'data/README.md'),path.join(dist,'DATA-NOTICE.txt'));
console.log(JSON.stringify({sourceBytes:Buffer.byteLength(source),compactBytes:Buffer.byteLength(compact),bookmarkCharacters:bookmark.length}));
