const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {cardErrataIndex,applyCardErrata,filterCards,emptyFilter,referenceValue,referenceIndex,referenceFor,effectText,validateRelease,newerRelease,equipmentConditions,effectFilterIndex}=require('../src/wonder-deck.js');
const data=require('../data/card-errata.json'),index=cardErrataIndex(data),refs=referenceIndex(require('../data/reference-stats.json'));
const card=(name)=>{const r=data.cards.find(c=>c.name===name);return applyCardErrata({id:r.id,name,kind:r.kind,owned:false,level:3,overlap:10,rarity:3,versions:[],peculiar:[],flags:0,effect:'assstibs旧効果',boosts:['旧効果']},index);};
test('all ten 5.38-R cards have date, full revised effects and validated stable IDs',()=>{
 assert.equal(index.size,10);assert.equal(data.cards.filter(c=>c.kind==='soul').length,2);
 for(const r of data.cards){assert.equal(r.date,'2026-10-05');assert.equal(r.errata,true);assert.ok(effectText(r.effect).startsWith('【アシスト】使用可能レベルに達すると'));const c=card(r.name);assert.equal(c.owned,false);assert.equal(c.id,r.id);assert.equal(c.overlap,10);assert.deepEqual(c.boosts,[]);assert.ok(c.search.includes('使用可能レベル'));}
 assert.throws(()=>cardErrataIndex({...data,cards:[data.cards[0],data.cards[0]]}));assert.throws(()=>cardErrataIndex({...data,cards:[{...data.cards[0],unknownActive:['hp']}]}));
 const wrong={id:data.cards[0].id,kind:'skill'};assert.equal(applyCardErrata(wrong,index),wrong);
});
test('errata date combines with other filters and never includes unrecorded cards',()=>{
 const cards=[card('伏龍の白羽扇'),card('飛将の赤兎馬'),{...card('伏龍の白羽扇'),errata:undefined}];
 assert.equal(filterCards(cards,{...emptyFilter(),errataDate:'2026-10-05'},2).length,2);
 assert.equal(filterCards(cards,{...emptyFilter(),errataDate:'any',effects:['2']},2).length,1);
 assert.equal(filterCards(cards,{...emptyFilter(),errataDate:'2026-06-22'},2).length,0);
 assert.equal(filterCards(cards,{...emptyFilter()},2).length,3);
});
test('revised modifiers do not use old special values; unchanged base remains usable',()=>{
 const feather=card('伏龍の白羽扇'),row=referenceFor(feather,refs);
 assert.equal(referenceValue(row.stats.ds,feather,true,null,'ds').value,null);
 assert.equal(referenceValue(row.stats.ds,feather,false,null,'ds').value,2.2);
 assert.equal(referenceValue(row.stats.ss,feather,true,null,'ss').value,1.15);
 assert.equal(referenceValue(row.stats.skill,feather,true,null,'skill').value,0);
 for(const name of ['誠実な王の服','冥界を渡るランタン','天女トヨウケビメ'])for(const stat of ['ss','ds','skill'])assert.equal(referenceValue(null,card(name),true,null,stat).value,null);
 assert.equal(referenceValue(null,card('冥界を渡るランタン'),false,null,'skill').value,0);
 assert.equal(referenceValue(null,card('飛将の赤兎馬'),true,null,'ss').value,0);
 const effect=effectFilterIndex(require('../data/effect-filters.json'));
 assert.equal(effect.get(feather.id)?.has('skillPower')||false,false);
 assert.ok(effect.get(card('飛将の赤兎馬').id).has('expRange'));
 assert.ok(effect.get(card('泉の武器商人ヘルメス').id).has('killDamage'));
 assert.deepEqual(equipmentConditions(card('天女トヨウケビメ')).map(c=>c.min),[1,2]);
});
test('release manifest binds version, data digest, source file and SRI',()=>{
 const release=validateRelease(require('../dist/release.json')),buf=fs.readFileSync('dist/'+release.script),data=JSON.parse(fs.readFileSync('dist/'+release.reference));
 assert.equal(release.integrity,'sha384-'+crypto.createHash('sha384').update(buf).digest('base64'));
 assert.equal(data.dataRevision,release.dataRevision);
 assert.equal(newerRelease('1.5.5',release,'old'),true);assert.equal(newerRelease('9.0.0',release,'old'),false);assert.equal(newerRelease(release.version,release,release.dataRevision),false);assert.equal(newerRelease(release.version,release,'0000000000000000'),true);
 for(const field of ['script','reference','integrity'])assert.throws(()=>validateRelease({...release,[field]:'https://evil.example/code'}));
});
