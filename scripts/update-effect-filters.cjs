/* SPDX-License-Identifier: MIT */
// node scripts/update-effect-filters.cjs /path/to/public-cardlist.json YYYY-MM-DD
const fs=require('node:fs'),path=require('node:path');
const {effectText}=require('../src/wonder-deck.js');
const labels={evade:'回避距離',skillPower:'スキル攻撃力',killDamage:'撃破ダメージ',expRange:'経験値獲得範囲'};
function classify(raw){
 const text=effectText(raw).normalize('NFKC').replace(/\s/g,'').split('【ソウル】')[0];
 const positive=v=>/^(?:上が|上げ|増加|拡大|上昇|広が)/.test(v);
 const increases=target=>{const re=new RegExp('(?:'+target+')([^。▲▼〔〕]{0,70}?)(上が[るり]|下が[るり]|上げ[る、]|下げ[る、]|増加|減少|拡大|縮小|上昇|低下|広が[るり]|狭ま[るり])','g');return [...text.matchAll(re)].some(m=>positive(m[2]));};
 const tags=[];
 if(increases('回避(?:(?:の)?距離|による移動距離)'))tags.push('evade');
 // Unqualified attack power also raises skill power; named shot/link/base attacks do not.
 const generic=text.replace(/(?:ストレート(?:ショット)?|ドロー(?:ショット)?|リンク|拠点|城)(?:の)?攻撃力/g,'別能力');
 const genericUp=[...generic.matchAll(/攻撃力([^。▲▼〔〕]{0,70}?)(上が[るり]|下が[るり]|増加|減少|上昇|低下)/g)].some(m=>positive(m[2]));
 if(increases('スキル(?:の)?(?:攻撃力|威力|ダメージ)')||genericUp)tags.push('skillPower');
 if(increases('撃破(?:時の)?ダメージ'))tags.push('killDamage');
 if(increases('経験値(?:を)?獲得(?:できる)?(?:の)?範囲'))tags.push('expRange');
 return tags;
}
function generate(data,date){
 const rows=new Map();
 for(const group of data)for(const c of group.data || []){
  const m=String(c.ci).match(/^(skill|master|assist|soul)\/([a-f\d]{32})\.png$/i);if(!m)continue;
  const effects=classify(c.te),kind=m[1]==='skill'?'skill':m[1]==='master'?'mskill':c.ca===11?'soul':'assist';
  if(effects.length)rows.set(m[2],{id:m[2],name:c.na,kind,effects});
 }
 return {schemaVersion:1,reviewedAt:date,source:'https://wonderland-wars.net/rankdata/cardlist.json',definitions:labels,notice:'公式効果文にある上昇効果で分類。条件付き・固有効果を含む。現在の装備で発動することを保証しない。低下だけの効果・消費MP・防御力・巨人の効果は対象外。',cards:[...rows.values()].sort((a,b)=>a.id.localeCompare(b.id))};
}
module.exports={classify,generate};
if(require.main===module){
 const [file,date]=process.argv.slice(2);if(!file || !/^\d{4}-\d{2}-\d{2}$/.test(date||''))throw Error('公開JSONファイルと確認日YYYY-MM-DDを指定してください');
 const out=generate(JSON.parse(fs.readFileSync(file,'utf8')),date);
 fs.writeFileSync(path.join(__dirname,'../data/effect-filters.json'),JSON.stringify(out,null,2)+'\n');
 console.log(Object.fromEntries(Object.keys(labels).map(k=>[k,out.cards.filter(c=>c.effects.includes(k)).length])));
}
