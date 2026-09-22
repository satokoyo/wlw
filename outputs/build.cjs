/* Usage: node build.cjs [path/to/playwright/lib/transform/babelBundle.js] */
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'wonder-deck.js'),'utf8');
let compact=source;
if(process.argv[2]){
 const plugin=path.join(__dirname,'..','work','compact-plugin.cjs');
 fs.mkdirSync(path.dirname(plugin),{recursive:true});
 fs.writeFileSync(plugin,'module.exports=()=>({manipulateOptions(o){o.compact=true;o.comments=false;o.sourceMaps=false;o.generatorOpts={...o.generatorOpts,compact:true,comments:false};}});');
 try {compact=require(path.resolve(process.argv[2])).babelTransform(source,path.join(__dirname,'wonder-deck.js'),false,[[plugin,{}]],[]).code;}
 finally{fs.unlinkSync(plugin);}
}
// Keep URI-safe punctuation literal; escape fragment/query delimiters explicitly.
const bookmark='javascript:'+encodeURI(compact).replace(/[?#]/g,c=>encodeURIComponent(c));
fs.writeFileSync(path.join(__dirname,'wonder-deck.bookmarklet.txt'),bookmark+'\n');
fs.writeFileSync(path.join(__dirname,'wonder-deck.min.js'),compact);
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const version=source.match(/const VERSION\s*=\s*'([^']+)'/)[1];
const html=fs.readFileSync(path.join(__dirname,'install.template.html'),'utf8').replaceAll('{{VERSION}}',()=>escape(version)).replaceAll('{{BOOKMARKLET}}',()=>escape(bookmark)).replaceAll('{{USAGE_SCREENSHOT}}',()=> 'data:image/webp;base64,'+fs.readFileSync(path.join(__dirname,'assets','deck-desktop.webp')).toString('base64'));
fs.writeFileSync(path.join(__dirname,'install.html'),html);
console.log(JSON.stringify({sourceBytes:Buffer.byteLength(source),compactBytes:Buffer.byteLength(compact),bookmarkCharacters:bookmark.length}));
