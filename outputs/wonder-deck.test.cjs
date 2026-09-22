const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Engine,normalizeCard,slotRule,slotsOf,filterCards,emptyFilter,effectText,effectHTML,deckSignature}=require('./wonder-deck.js');
const id=n=>n.toString(16).padStart(32,'0');
const raw=(n,ct=2,lv=6)=>({ci:id(n),ct,lv,ol:10,te:'assbsfcrhpufs',ra:3,fi:8,gr:[5]});
const card=(n,kind='assist',level=6)=>({id:id(n),kind,level,owned:true});
const slot=(type,n)=>({type,slot:n,editable:true});
const makeDeck=()=>({con:'OK',rslt:'OK',skill:[{sl:0,ci:id(1),ct:1,lv:10},{sl:1,ci:id(2),ct:1,lv:10}],master:[{sl:8,ci:id(3),ct:8,lv:10}],assist:[{sl:4,ci:id(4),ct:2,lv:10},{sl:9,ci:id(5),ct:2,lv:10}],soul:[{sl:7,ci:id(6),ct:3,lv:10}],reserve:[{sl:7,ci:id(7),ct:8,lv:10,bs:true}],ARANK:[],ASRANK:[],MRANK:[]});
function harness(){
 const decks={'2':makeDeck(),'36':makeDeck()};decks['36'].assist[0].ci=id(36);const calls=[];
 const api={
  deck:async cast=>structuredClone(decks[cast]),
  candidates:async(cast,s)=>{const cur=slotsOf(decks[cast]).find(x=>x.type===s.type&&x.slot===s.slot);return {status:'OK',setcast:{id:Number(cast),name:'Cast '+cast},setcard:{...raw(0),ci:cur.id},card:[raw(8),raw(9),raw(4),raw(5)].filter(c=>c.ci!==cur.id)};},
  permission:async()=>({key:'fresh-key',remove:true}),
  commit:async(cast,s,newID,key)=>{calls.push({cast,s,newID,key});const all=Object.values(decks[cast]).filter(Array.isArray).flat(),target=(decks[cast][s.type==='mskill'?'master':s.type]).find(x=>x.sl===s.slot),other=all.find(x=>x!==target&&x.ci===newID);if(other)other.ci=target.ci;target.ci=newID==='remove'?null:newID;return {};}
 };
 const engine=new Engine(api,new Map());return {engine,api,decks,calls};
}
test('normal skill, soul and master slots have distinct card types',()=>{
 for(const [type,n,kind] of [['skill',1,'skill'],['assist',4,'assist'],['soul',7,'soul'],['mskill',8,'mskill']])for(const k of ['skill','assist','soul','mskill'])assert.equal(!slotRule(slot(type,n),card(8,k),2),k===kind);
 assert.ok(slotRule(slot('mskill',4),card(8,'mskill'),2));assert.ok(slotRule(slot('soul',8),card(8,'soul'),2));
 assert.ok(slotRule(slot('skill',0),card(8,'skill'),2));
});
test('slot9 uses unlock level, never overlap',()=>{
 assert.ok(slotRule(slot('assist',9),{...card(8,'assist',5),overlap:30},2));
 for(const lv of [6,7])assert.equal(slotRule(slot('assist',9),{...card(8,'assist',lv),overlap:0},2),'');
});
test('reserve slot7 accepts all official kinds; normal soul slot7 does not',()=>{
 for(const kind of ['skill','assist','soul','mskill'])assert.equal(slotRule(slot('reserve',7),card(8,kind,1),2),'');
 assert.ok(slotRule(slot('soul',7),card(8,'mskill'),2));
});
test('fixed, unowned and other-cast skills are blocked',()=>{
 assert.ok(slotRule({...slot('skill',1),editable:false},card(8,'skill'),2));
 assert.ok(slotRule(slot('assist',4),{...card(8),owned:false},2));
 assert.ok(slotRule(slot('skill',1),{...card(8,'skill'),cast:'36'},2));
});
test('catalog and deck CT fields are normalized independently',()=>{
 const master=normalizeCard({...raw(8,1),na:'master'},'mskill');assert.equal(master.kind,'mskill');
 const soul=normalizeCard({...raw(9,11),na:'soul'},'assist');assert.equal(soul.kind,'soul');
 const skill=normalizeCard({...raw(10,2),ca:36,na:'skill'},'skill');assert.equal(skill.kind,'skill');assert.equal(skill.category,2);assert.equal(skill.cast,'36');
 const merged=normalizeCard(raw(10,1,3),'deck',new Map([[id(10),skill]]));assert.equal(merged.kind,'skill');assert.equal(merged.name,'skill');assert.equal(merged.level,3);assert.equal(merged.cast,'36');
});
test('effect decoding preserves meaning and cannot inject markup',()=>{
 assert.match(effectText('assstibsfcrhpufs'),/\n▲最大ＨＰ/);assert.ok(!effectHTML('<img onerror=x>fcrhpufs').includes('<img'));assert.match(effectHTML('fcrhpufs'),/class="up"/);
});
test('fullwidth query, AND words, OR category filters and ability modes',()=>{
 const a=normalizeCard({...raw(1),na:'ＨＰ MP',fi:24},'deck'),b=normalizeCard({...raw(2),na:'HP',fi:8},'deck');let f=emptyFilter();f.q='hp ｍｐ';assert.equal(filterCards([a,b],f,2).length,1);
 f=emptyFilter();f.effects=['8','16'];assert.equal(filterCards([a,b],f,2).length,1);f.effectMode='any';assert.equal(filterCards([a,b],f,2).length,2);f.level=['1','6'];assert.equal(filterCards([a,b],f,2).length,2);f.rarity=['4'];assert.equal(filterCards([a,b],f,2).length,0);
});
test('20 repeated saves remain usable; normal/reserve slots retain identity',async()=>{
 const {engine:e,calls}=harness();await e.changeCast('2',slot('assist',4));
 for(let i=0;i<20;i++){assert.equal(await e.save(id(i%2?9:8)),true);assert.equal(e.locked,false);assert.equal(e.current.id,id(i%2?9:8));}
 assert.equal(calls.length,20);assert.equal(e.successes,20);
 await e.chooseSlot(slot('reserve',7));assert.equal(e.current.type,'reserve');assert.equal(e.current.kind,'mskill');
});
test('remove, re-set and whole-deck swaps refresh all affected slots',async()=>{
 const {engine:e}=harness();await e.changeCast('2',slot('assist',4));assert.equal(await e.save('remove'),true);assert.equal(e.current.id,null);assert.equal(await e.save(id(4)),true);
 assert.equal(await e.save(id(5)),true);assert.equal(e.current.id,id(5));assert.equal(e.slots.find(s=>s.type==='assist'&&s.slot===9).id,id(4));
});
test('double click and cast/slot switching cannot overlap a commit',async()=>{
 const {engine:e,api,calls}=harness();await e.changeCast('2',slot('assist',4));let release;api.permission=()=>new Promise(r=>release=r);
 const p=e.save(id(8));assert.equal(await e.save(id(9)),false);assert.equal(await e.changeCast('36'),false);assert.equal(await e.chooseSlot(slot('assist',9)),false);
 release({key:'new',remove:true});await p;assert.equal(calls.length,1);assert.equal(calls[0].cast,'2');assert.equal(calls[0].key,'new');
});
test('late cast responses cannot replace the active cast',async()=>{
 const {engine:e,api}=harness();const deck=api.deck;let release;api.deck=cast=>cast==='2'?new Promise(r=>release=()=>deck(cast).then(r)):deck(cast);
 const a=e.changeCast('2');await e.changeCast('36',slot('assist',4));release();await a;assert.equal(e.cast,'36');assert.equal(e.current.id,id(36));
});
test('late slot responses cannot replace current candidates',async()=>{
 const {engine:e,api}=harness();await e.changeCast('2',slot('assist',4));const candidates=api.candidates;let release;api.candidates=(cast,s)=>s.slot===9?new Promise(r=>release=()=>candidates(cast,s).then(r)):candidates(cast,s);
 const a=e.chooseSlot(slot('assist',9));await e.chooseSlot(slot('reserve',7));release();await a;assert.equal(e.current.type,'reserve');assert.equal(e.current.id,id(7));
});
test('cast2 writes do not change cast36 and returning rereads server',async()=>{
 const {engine:e,decks}=harness();const before=deckSignature(decks['36']);await e.changeCast('2',slot('assist',4));await e.save(id(8));await e.changeCast('36',slot('assist',4));assert.equal(e.current.id,id(36));await e.changeCast('2',slot('assist',4));assert.equal(e.current.id,id(8));assert.equal(deckSignature(decks['36']),before);
});
test('stale candidate, changed slot and removal prohibition never submit',async()=>{
 for(const mode of ['candidate','slot','remove']){const {engine:e,api,calls}=harness();await e.changeCast('2',slot('assist',4));const old=api.candidates;api.candidates=async(...args)=>{const d=await old(...args);if(mode==='candidate')d.card=[];if(mode==='slot')d.setcard.ci=id(99);return d;};if(mode==='remove')api.permission=async()=>({key:'k',remove:false});assert.equal(await e.save(mode==='remove'?'remove':id(8)),false);assert.equal(calls.length,0);assert.equal(e.locked,false);}
});
test('timeout after applied mutation is reconciled without resending',async()=>{
 const {engine:e,api,calls}=harness();await e.changeCast('2',slot('assist',4));const commit=api.commit;api.commit=async(...a)=>{await commit(...a);throw Error('timeout');};assert.equal(await e.save(id(8)),true);assert.equal(calls.length,1);assert.equal(e.locked,false);
});
test('unknown network result locks further writes until actual success can be read',async()=>{
 const {engine:e,api,decks}=harness();await e.changeCast('2',slot('assist',4));api.commit=async()=>{throw Error('network');};assert.equal(await e.save(id(8)),false);assert.equal(e.locked,true);assert.equal(await e.save(id(9)),false);assert.equal(await e.changeCast('36'),false);decks['2'].assist[0].ci=id(8);assert.equal(await e.reconcile(false),true);assert.equal(e.locked,false);
});
test('server rejection and candidate-refresh failure recover predictably',async()=>{
 const h=harness(),e=h.engine;await e.changeCast('2',slot('assist',4));h.api.commit=async()=>({error:'拒否'});assert.equal(await e.save(id(8)),false);assert.equal(e.locked,false);assert.match(e.error,/拒否/);
 const v=harness();await v.engine.changeCast('2',slot('assist',4));const commit=v.api.commit;v.api.commit=async(...args)=>{await commit(...args);v.api.candidates=async()=>{throw Error('offline');};return {};};assert.equal(await v.engine.save(id(8)),true);assert.equal(v.engine.loading,true);assert.ok(v.engine.reason(card(9)));
});
test('dispose rejects future responses and writes',async()=>{
 const {engine:e,api}=harness();let release;api.deck=()=>new Promise(r=>release=r);const loading=e.changeCast('2');assert.equal(e.dispose(),true);release(makeDeck());await loading;assert.equal(e.deck,null);assert.equal(await e.save(id(8)),false);
});
test('changes in a different slot from another screen stop saving and refresh placement',async()=>{
 const {engine:e,decks,calls}=harness();await e.changeCast('2',slot('assist',4));decks['2'].assist[1].ci=id(99);
 assert.equal(await e.save(id(8)),false);assert.equal(calls.length,0);assert.equal(e.slots.find(s=>s.type==='assist'&&s.slot===9).id,id(99));assert.match(e.error,/別の画面/);assert.equal(e.locked,false);
});
test('swap cannot put an invalid card into its previous source slot',async()=>{
 const {engine:e,api,calls,decks}=harness();decks['2'].assist[0].ci=id(4);await e.changeCast('2',slot('assist',4));const candidates=api.candidates;
 api.candidates=async(...a)=>{const d=await candidates(...a);d.setcard.lv=5;return d;};
 assert.equal(await e.save(id(5)),false);assert.equal(calls.length,0);assert.match(e.error,/交換元/);
});
test('server response that creates a duplicate cannot be reported as successful',async()=>{
 const {engine:e,api,decks}=harness();await e.changeCast('2',slot('assist',4));api.commit=async()=>{decks['2'].assist[0].ci=id(5);return {};};
 assert.equal(await e.save(id(5)),false);assert.equal(e.successes,0);assert.match(e.error,/一致しません/);
});
test('recommendations follow slot type and level while reserve retains all kinds',async()=>{
 const {engine:e,decks}=harness();decks['2'].ARANK=[{...raw(101,2,5),na:'low'},{...raw(102,2,6),na:'high'}];decks['2'].ASRANK=[{...raw(103,3,1),na:'soul'}];decks['2'].MRANK=[{...raw(104,8),na:'master'}];
 await e.changeCast('2',slot('assist',9));assert.deepEqual(e.cards.filter(c=>c.viewOnly).map(c=>c.name),['high']);
 await e.chooseSlot(slot('reserve',7));assert.equal(e.cards.filter(c=>c.viewOnly).length,4);
});
test('recommendations are first by default, preserving official order for non-recommendations',()=>{
 const a={...normalizeCard(raw(1),'deck'),rank:undefined},b={...normalizeCard(raw(2),'deck'),rank:2},c={...normalizeCard(raw(3),'deck'),rank:1},d={...normalizeCard(raw(4),'deck')};
 assert.deepEqual(filterCards([a,b,c,d],emptyFilter(),2).map(c=>c.id),[id(3),id(2),id(1),id(4)]);
});
