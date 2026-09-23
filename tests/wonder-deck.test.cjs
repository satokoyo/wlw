/* SPDX-License-Identifier: MIT
 * Copyright (c) 2026 satokoyo
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {acquisitionFor,acquisitionHTML,leadingCards,VERSIONS,equipmentConditions,equipmentStars,Engine,normalizeCard,slotRule,slotsOf,filterCards,recommendedCards,emptyFilter,categoryKey,cardCategoryText,levelOrder,levelLabel,cardGroup,unavailableReason,effectText,effectHTML,deckSignature}=require('../src/wonder-deck.js');
const id=n=>n.toString(16).padStart(32,'0');
const raw=(n,ct=2,lv=6)=>({ci:id(n),na:'Card '+n,ca:ct===1?1:7,ct,lv,ol:10,te:'assbsfcrhpufs',ra:3,fi:8,gr:[5]});
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
 const merged=normalizeCard({...raw(10,1,3),na:undefined},'deck',new Map([[id(10),skill]]));assert.equal(merged.kind,'skill');assert.equal(merged.name,'skill');assert.equal(merged.level,3);assert.equal(merged.cast,'36');
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
test('ordinary list sorts by level and rarity; recommendations retain official order',()=>{
 const a=normalizeCard({...raw(1,2,1),ra:3},'deck'),b={...normalizeCard({...raw(2,2,3),ra:4},'deck'),rank:1},c={...normalizeCard({...raw(3,2,1),ra:2},'deck'),rank:3},d={...normalizeCard({...raw(4,2,1),ra:4},'deck'),rank:2},e=normalizeCard({...raw(5,2,1),ra:4},'deck'),f={...e,id:id(6)};
 const normal=filterCards([a,b,c,d,e,f],emptyFilter(),2);assert.deepEqual(normal.map(c=>c.id),[id(4),id(5),id(6),id(1),id(3),id(2)]);assert.deepEqual(recommendedCards(normal).map(c=>c.id),[id(2),id(4),id(3)]);
});
test('category tabs default to all and combine with the other filters',()=>{
 const a=normalizeCard({...raw(1),ca:7,na:'needle'},'deck'),b=normalizeCard({...raw(2),ca:8,na:'needle'},'deck');
 const f=emptyFilter();assert.equal(f.categoryTab,'all');assert.equal(filterCards([a,b],f,2).length,2);
 f.categoryTab='assist:7';assert.deepEqual(filterCards([a,b],f,2).map(c=>c.id),[id(1)]);
 f.q='different';assert.equal(filterCards([a,b],f,2).length,0);
 assert.equal(categoryKey({kind:'mskill',category:1}),'mskill');assert.equal(categoryKey({kind:'skill',category:1}),'skill');assert.equal(categoryKey({kind:'soul',category:11}),'soul');
});
test('unknown levels and master skills have explicit separate groups',()=>{
 const a={kind:'assist',level:undefined,rank:1},m={kind:'mskill',level:0};
 assert.equal(levelLabel(a),'使用レベル未取得');assert.equal(levelLabel(m),'マスタースキル（使用レベルなし）');
 assert.ok(levelOrder(a)>levelOrder(m));assert.ok(levelOrder(m)>levelOrder({kind:'assist',level:7}));
 assert.equal(cardGroup(a),cardGroup({...a,rank:undefined}));assert.notEqual(cardGroup(m),cardGroup(a));
});
test('unowned flags survive joins and explicitly owned data can refresh them',()=>{
 const unowned=normalizeCard({...raw(1),ha:false},'deck');assert.equal(unowned.owned,false);
 const cat=new Map([[id(1),unowned]]);assert.equal(normalizeCard(raw(1),'deck',cat).owned,false);
 assert.equal(normalizeCard({...raw(1),ha:true},'deck',cat).owned,true);
 for(const ha of [false,0,'0'])assert.equal(normalizeCard({...raw(1),ha},'deck').owned,false);
});
test('unowned recommendation absent from catalog and candidates never submits',async()=>{
 const {engine:e,decks,calls}=harness();const ribbon='b4826387d3176e3c7f202fce7270ad62';
 decks['2'].ARANK=[{ha:false,na:'おそろいのリボン',ci:ribbon,ct:2,te:'hpufsspu',ve:'New'}];
 await e.changeCast('2',slot('assist',4));const c=e.cards.find(c=>c.id===ribbon);
 assert.equal(c.owned,false);assert.equal(c.viewOnly,true);assert.equal(c.level,undefined);assert.match(e.reason(c),/未所持/);
 assert.equal(await e.save(ribbon),false);assert.equal(calls.length,0);
});
test('current recommended card gets level and rarity from the current-slot response',async()=>{
 const {engine:e,decks}=harness();decks['2'].ARANK=[{ci:id(4),ct:2,ha:true,na:'Current'}];
 await e.changeCast('2',slot('assist',4));const c=e.cards.find(c=>c.id===id(4));
 assert.equal(c.level,6);assert.equal(c.rarity,3);assert.equal(c.owned,true);
});
test('incomplete metadata is disabled for recommendations and ordinary candidates alike',async()=>{
 const full=normalizeCard(raw(8),'deck');assert.equal(unavailableReason(full),'');
 for(const [key,value,label] of [['level',undefined,'使用レベル'],['rarity',undefined,'レアリティ'],['category',NaN,'カテゴリ'],['name','名称未取得','カード名'],['effect','','効果']])assert.match(unavailableReason({...full,[key]:value}),new RegExp(label));
 assert.equal(unavailableReason({...full,kind:'mskill',level:undefined,category:undefined}),'');
 const {engine:e,api,calls}=harness();const original=api.candidates;api.candidates=async(...args)=>{const d=await original(...args);d.card[0].lv=null;return d;};
 await e.changeCast('2',slot('assist',4));assert.match(e.reason(e.cards[0]),/情報未取得/);assert.equal(await e.save(e.cards[0].id),false);assert.equal(calls.length,0);
});
test('normal skills stay separate from assists and masters are last in ordinary list',()=>{
 const make=(n,kind,level)=>({...normalizeCard(raw(n),'deck'),kind,level});
 const skill=make(1,'skill',5),assist=make(2,'assist',1),unknown=make(3,'assist',undefined),master=make(4,'mskill',0),soul=make(5,'soul',3);
 const cards=[master,unknown,assist,skill,soul];
 assert.deepEqual(filterCards(cards,emptyFilter(),2).map(c=>c.id),[id(1),id(2),id(5),id(3),id(4)]);
 assert.equal(cardGroup(skill),cardGroup({...skill,level:1}));assert.notEqual(cardGroup(skill),cardGroup({...assist,level:5}));assert.equal(levelLabel(skill),'通常スキル');
 const ranked=cards.map(c=>({...c,rank:1}));assert.deepEqual(filterCards([...cards,...ranked],emptyFilter(),2).map(c=>!!c.rank),[false,true,false,true,false,true,false,true,false,true]);
});
test('recommendation order is independent of level, rarity and ordinary ordering',()=>{
 const a={...normalizeCard(raw(1,2,7),'deck'),rank:1,recommendationOrder:0},b={...normalizeCard(raw(2,3,1),'deck'),rank:1,recommendationOrder:2},c={...normalizeCard(raw(3,2,1),'deck'),rank:2,recommendationOrder:1};
 const normal=filterCards([a,b,c],emptyFilter(),2),rec=recommendedCards(normal);
 assert.deepEqual(rec.map(c=>c.id),[id(1),id(3),id(2)]);assert.equal(normal.length,3);assert.ok(rec.every(c=>normal.includes(c)));
});
test('card overlay labels include specific category text without confusing card kinds',()=>{
 assert.equal(cardCategoryText({kind:'assist',category:7}),'武器');assert.equal(cardCategoryText({kind:'skill',category:1}),'スキル・攻撃');assert.equal(cardCategoryText({kind:'mskill',category:1}),'マスタースキル');assert.equal(cardCategoryText({kind:'soul',category:11}),'ソウル');
});

test('published copy code, drag link and executable source are identical',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const read=name=>fs.readFileSync(path.join(__dirname,'../dist',name),'utf8');
 const bookmark=read('wonder-deck.bookmarklet.txt').trim();
 const html=read('index.html');
 const decodeHTML=s=>s.replace(/&(amp|lt|gt|quot|#39);/g,(_,entity)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"}[entity]));
 assert.equal(decodeHTML(html.match(/<textarea\b[^>]*id="code"[^>]*>([\s\S]*?)<\/textarea>/)[1]),bookmark);
 assert.equal(decodeHTML(html.match(/<a\b[^>]*id="bookmark"[^>]*href="([^"]+)"/)[1]),bookmark);
 assert.equal(bookmark.split('\n').length,1);
 assert.ok(bookmark.startsWith('javascript:'));
 const executable=decodeURIComponent(read('wonder-deck.standalone.txt').trim().slice(11));
 assert.equal(executable,read('wonder-deck.min.js'));
 assert.doesNotThrow(()=>new vm.Script(executable));
 const version=read('wonder-deck.js').match(/const VERSION\s*=\s*'([^']+)'/)[1];
 assert.ok(html.includes('v'+version));
 assert.ok(executable.includes("'"+version+"'"));
});

test('equipped recommendations hydrate missing rarity from official detail, with bounded cached requests',async()=>{
 const {engine:e,api,decks}=harness();const requested=[];
 const details=new Map([[id(2),{...raw(2,1),ca:1}],[id(3),raw(3,8)],[id(4),raw(4)],[id(5),raw(5)],[id(6),{...raw(6,3),ca:11}],[id(7),raw(7,8)],[id(8),raw(8)]]);
 for(const [ci,r]of details)e.catalog.set(ci,normalizeCard({...r,ra:[id(2),id(8)].includes(ci)?r.ra:undefined},'deck'));
 decks['2'].ARANK=[{ci:id(4),ct:2,ha:true,na:'Owned weapon'}];decks['2'].ASRANK=[{ci:id(6),ct:3,ha:true,na:'Owned soul'}];decks['2'].MRANK=[{ci:id(3),ct:8,ha:true,na:'Owned master'}];
 api.candidates=async(cast,s)=>{requested.push(s.type);const cur=slotsOf(decks[cast]).find(x=>x.type===s.type&&x.slot===s.slot);return {setcast:{id:cast},setcard:details.get(cur.id),card:s.type==='assist'?[details.get(id(5))]:s.type==='reserve'?[details.get(id(8))]:[]};};
 await e.changeCast('2',slot('reserve',7));
 assert.deepEqual(requested,['reserve','assist','soul','mskill']);
 for(const ci of [id(4),id(6),id(3)]){const c=e.cards.find(c=>c.id===ci);assert.equal(c.rarity,3);assert.equal(c.owned,true);assert.equal(unavailableReason(c),'');assert.equal(c.viewOnly,true);}
 await e.chooseSlot(slot('reserve',7));assert.equal(requested.length,5);
});
test('equipment stars exclude self and reserve; show ordered multiple rarity conditions',()=>{
 const subject={...normalizeCard(raw(4),'deck'),effect:'このカード以外にレアリティがWRのアシストカードが１枚以上発動している場合bsこのカード以外にレアリティがWRのアシストカードが２枚以上発動している場合'};
 const deck=makeDeck(),cat=new Map([[id(4),subject],[id(5),{...card(5),rarity:4}],[id(6),{...card(6,'soul'),rarity:3}],[id(7),{...card(7),rarity:4}]]);
 assert.equal(equipmentConditions(subject).length,2);assert.equal(equipmentStars(subject,deck,cat).stars,'★☆');
 cat.get(id(6)).rarity=4;assert.equal(equipmentStars(subject,deck,cat).stars,'★★');
 cat.get(id(5)).rarity=3;cat.get(id(6)).rarity=3;subject.rarity=4;assert.equal(equipmentStars(subject,deck,cat).stars,'☆☆');
});
test('SR non-soul condition excludes soul and remains unknown for missing rarity',()=>{
 const c={...card(4),effect:'このカード以外にレアリティがSRのカテゴリがソウルではないアシストカードが１枚以上発動している場合'};
 const deck=makeDeck(),cat=new Map([[id(4),{...c,rarity:3}],[id(5),{...card(5),rarity:4}],[id(6),{...card(6,'soul'),rarity:3}]]);
 assert.equal(equipmentStars(c,deck,cat).stars,'☆');cat.get(id(5)).rarity=3;assert.equal(equipmentStars(c,deck,cat).stars,'★');
 delete cat.get(id(5)).rarity;assert.equal(equipmentStars(c,deck,cat).stars,'？');
});
test('category-count and unsupported equipment conditions are not falsely marked active',()=>{
 const c={...card(4,'soul'),effect:'このカード以外にカテゴリが武器のアシストカードが２枚以上発動している場合'};
 const deck=makeDeck(),cat=new Map([[id(4),c],[id(5),{...card(5),category:7}],[id(6),{...card(6,'soul'),category:11}]]);
 assert.equal(equipmentStars(c,deck,cat).stars,'☆');
 const unknown={...c,effect:'このカード以外に使用可能レベルが６以上のアシストカードが１枚以上発動している場合'};
 assert.equal(equipmentStars(unknown,deck,cat).stars,'？');
 assert.equal(equipmentStars({...c,effect:'敵を撃破した場合、攻撃力が上がる'},deck,cat).stars,'');
});
test('all normal skill subcategories share a single category tab',()=>{
 const list=[1,2,3,4,5].map(n=>normalizeCard({...raw(n,1),ca:n},'deck'));
 const f=emptyFilter();f.categoryTab='skill';assert.equal(filterCards(list,f,'2').length,5);
 assert.deepEqual([...new Set(list.map(categoryKey))],['skill']);
});

test('late metadata hydration cannot contaminate the new cast or candidate view',async()=>{
 const {engine:e,api}=harness();const original=api.candidates;let release,started;
 const ready=new Promise(r=>started=r);
 api.candidates=async(cast,s)=>{
  if(cast==='2' && s.type==='soul'){started();return new Promise(r=>release=()=>r({setcast:{id:2},setcard:{...raw(991,3),ca:11},card:[]}));}
  return original(cast,s);
 };
 const previous=e.changeCast('2',slot('assist',4));await ready;
 await e.changeCast('36',slot('assist',4));release();await previous;
 assert.equal(e.cast,'36');assert.equal(e.catalog.has(id(991)),false);assert.equal(e.current.id,id(36));assert.equal(e.loading,false);
});

test('assist and soul without an equipment activation condition never get stars',()=>{
 const deck=makeDeck(),cat=new Map();
 const effects=['','assstibs〔fcr特殊fs〕fcr▲一定時間経過するたびにストレート攻撃力とドロー攻撃力が上がるfs',
 '〔fcrロール固有fs〕fcr▲経験値獲得範囲が拡大し敵に攻撃する度に攻撃力が一定値まで上がるbsfs〔fcrロール固有fs〕fcr▲敵に一定回数攻撃するとＭＰ回復速度が上がるfsbs※ロール固有はサポーターのみ適用bs【ソウル】巨人召喚fcr貫通岩fs',
 'このカード以外のアシストカードの効果を強化する。敵を撃破した場合、スピードが上がる。'];
 for(const kind of ['assist','soul'])for(const effect of effects){const c={...card(4,kind),effect};assert.deepEqual(equipmentConditions(c),[]);assert.deepEqual(equipmentStars(c,deck,cat),{stars:'',title:''});}
});

test('an unsupported second equipment condition is retained instead of claiming all effects are enabled',()=>{
 const c={...card(4),effect:'このカード以外にレアリティがSRのアシストカードが１枚以上発動している場合攻撃力が上がる。bsマスタースキルの残り使用回数が０回の場合速度が上がる。'};
 const cat=new Map([[id(5),{...card(5),rarity:3}],[id(6),{...card(6,'soul'),rarity:3}]]);
 assert.equal(equipmentStars(c,makeDeck(),cat).stars,'★？');
});

 test('distribution retains the MIT license, including the standalone bookmarklet',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
 const license=read('LICENSE');
 assert.equal(read('dist/LICENSE'),license);
 assert.ok(read('dist/wonder-deck.min.js').startsWith('/*!\n'+license+'*/\n'));
 assert.ok(decodeURIComponent(read('dist/wonder-deck.standalone.txt').trim().slice(11)).includes(license));
 assert.ok(read('dist/index.html').includes('href="LICENSE"'));
});

// Keep the published CI entry point covering the loader and reference dataset.
require('./reference-cases.cjs');

// Official /rankdata/cardlist.json version table, checked 2026-09-23.
test('official adventure/event classifications remain distinct in filters',()=>{
 assert.equal(VERSIONS[70],'冒険譚');
 assert.equal(VERSIONS[20],'イベント');
 assert.equal(VERSIONS[90],'特典');
 const names=['約束の指輪','焼け焦げた羽飾り','踊り子の靴','青銅の短剣'];
 const adventure=names.map((na,i)=>normalizeCard({...raw(i+1),na,gr:[70]},'deck'));
 const event=normalizeCard({...raw(5,3),na:'武神 関羽',gr:[20]},'deck');
 const cards=[...adventure,event];
 const f=emptyFilter();f.versions=['70'];
 assert.deepEqual(new Set(filterCards(cards,f,2).map(c=>c.name)),new Set(names));
 f.versions=['20'];assert.deepEqual(filterCards(cards,f,2).map(c=>c.name),['武神 関羽']);
 f.versions=['20','70'];assert.equal(filterCards(cards,f,2).length,5);
 f.versions=[];assert.equal(filterCards(cards,f,2).length,5);
});

test('master labels distinguish summon and immediate effects without changing tabs',()=>{
 const a={kind:'mskill',effect:'zcsbsフリックをするとサモン待機状態になる。'};
 const b={kind:'mskill',effect:'zcsbsflibs攻撃する。'};
 assert.equal(cardCategoryText(a),'マスタースキル・サモン');
 assert.equal(cardCategoryText(b),'マスタースキル・即時');
 assert.equal(cardCategoryText({kind:'mskill',effect:''}),'マスタースキル');
 assert.equal(categoryKey(a),'mskill');assert.equal(categoryKey(b),'mskill');
});

test('current slot card leads recommendations without duplicates or changing their order',()=>{
 const current={id:id(1),name:'current'},a={id:id(2),rank:1,recommendationOrder:0},b={...current,rank:2,recommendationOrder:1};
 assert.deepEqual(leadingCards([a,b],current).map(c=>c.id),[id(1),id(2)]);
 assert.deepEqual(leadingCards([],current),[current]);
 assert.deepEqual(leadingCards([a],null),[a]);
});

test('acquisition resolves names, craft fallback, expiry, and escapes data',()=>{
 const data=require('../data/acquisition.json');
 assert.match(acquisitionFor({name:'三銃士　アラミス'},data)[0].method,/リーフ/);
 assert.equal(acquisitionFor({name:'心探しの新兵の銃'},data)[0].base,'古びた歩兵銃');
 assert.equal(acquisitionFor({name:'unknown',versions:[50]},data)[0].method,'カードクラフト');
 assert.deepEqual(acquisitionFor({name:'unknown',versions:[20]},data),[]);
 assert.match(acquisitionHTML({name:'海の魔女セイレーン'},data),/期限切れ/);
 assert.match(acquisitionHTML({name:'unknown'},data),/未収録/);
 assert.match(acquisitionHTML({},null),/未取得/);
 const malicious={...data,cards:[{name:'test',methods:[{method:'<script>',source:'javascript:alert(1)'}]}]};
 const html=acquisitionHTML({name:'test'},malicious);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('javascript:'));
 const names=data.cards.map(r=>r.name.normalize('NFKC').replace(/\s/g,''));assert.equal(new Set(names).size,names.length);
});

test('other equipped cards follow recommendations, with no duplicates or ineligible additions',()=>{
 const current={id:id(1)},recommended={id:id(2),rank:1,recommendationOrder:0},other={id:id(3)},unused={id:id(4)};
 const slots=[{id:id(3)},{id:id(1)},{id:id(2)},{id:id(99)},{id:id(3)}];
 assert.deepEqual(leadingCards([other,unused,recommended],current,slots).map(c=>c.id),[id(1),id(2),id(3)]);
 assert.deepEqual(leadingCards([unused],current,slots),[current]);
});
