const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {referenceIndex,referenceFor,referenceTotals,referenceValue,referenceCondition}=require('../src/wonder-deck.js');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(read('data/reference-stats.json'));
test('reference data validates; all reviewed entries have fixed public source and finite values or null',()=>{
 const index=referenceIndex(data);assert.equal(index.size,data.cards.length);
 assert.ok(data.cards.length>=180);
 for(const row of data.cards){assert.ok(referenceFor(row,index));for(const v of Object.values(row.stats)){assert.ok([939,778,788].includes(v.source));assert.equal(v.strength,'unspecified');}}
 assert.equal(read('data/reference-stats.json'),read('dist/reference-stats-1.3.0.json'));
});
test('exact name binding normalizes widths and whitespace, separates kinds and refuses ambiguity',()=>{
 const index=referenceIndex(data);
 assert.ok(referenceFor({name:'戦隊頭目　ゼクス',kind:'soul'},index));
 assert.equal(referenceFor({name:'戦隊頭目 ゼクス',kind:'assist'},index),undefined);
 assert.equal(referenceFor({name:'ゼクス',kind:'soul'},index),undefined);
 const duplicate=referenceIndex({...data,cards:[data.cards[0],data.cards[0]]});
 assert.equal(referenceFor(data.cards[0],duplicate),null);
});
test('totals exclude reserve and inactive levels; missing stats are unknown, never zero',()=>{
 const index=referenceIndex(data),catalog=new Map([['a',{name:'神光の七星剣',kind:'assist',level:4,rarity:3}],['s',{name:'戦隊頭目 ゼクス',kind:'soul',level:1}]]);
 const slots=[{id:'a',type:'assist'},{id:'s',type:'soul'},{id:'a',type:'reserve'}];
 let total=referenceTotals(slots,catalog,index,3,false);assert.equal(total.ss.value,0);assert.equal(total.ss.unknown,0);
 total=referenceTotals(slots,catalog,index,8,false);assert.equal(total.ds.value,9.8);assert.equal(total.ds.unknown,0);
 total=referenceTotals(slots,catalog,index,8,true);assert.equal(total.ds.value,20);assert.equal(total.ss.value,7.5);
 assert.equal(total.skill.value,10);
});
test('special inclusive DS values replace base; negative numbers survive and partial data remains unknown',()=>{
 const row={name:'test',kind:'assist',stats:{ds:{base:10,active:15},ss:{base:-2,active:-4},skill:{base:null,active:null}}};
 const index=referenceIndex({schemaVersion:1,cards:[row]}),slots=[{type:'assist',id:'x'}],catalog=new Map([['x',{...row,level:1}]]);
 const result=referenceTotals(slots,catalog,index,8,true);assert.equal(result.ds.value,15);assert.equal(result.ss.value,-4);assert.equal(result.skill.unknown,1);
 catalog.get('x').level=undefined;assert.equal(referenceTotals(slots,catalog,index).ds.unknown,1);
});
test('reference values do not interpolate strengthening or classify unlisted effects as zero',()=>{
 const index=referenceIndex(data);let values=[];
 for(const overlap of [0,4,10])values.push(referenceTotals([{type:'assist',id:'x'}],new Map([['x',{name:'神光の七星剣',kind:'assist',level:4,overlap}]]),index).ss.value);
 assert.deepEqual(values,[1.5,1.5,1.5]);
 assert.equal(referenceTotals([{type:'assist',id:'x'}],new Map(),index).ss.unknown,1);
 assert.throws(()=>referenceIndex({schemaVersion:1,cards:[{name:'x',kind:'assist',stats:{ds:{base:'12',active:12}}}]}));
});
const code=decodeURIComponent(read('dist/wonder-deck.bookmarklet.txt').trim().slice(11));
function loader(){let script,timer;const alerts=[];const window={};const context=vm.createContext({window,location:{origin:'https://wonderland-wars.net',pathname:'/deck/index.html'},alert:s=>alerts.push(s),setTimeout:f=>(timer=f,1),clearTimeout(){},document:{createElement:()=>({remove(){}}),head:{append:s=>script=s}}});return {run:()=>vm.runInContext(code,context),window,alerts,get script(){return script},timeout:()=>timer()};}
test('short loader locks duplicate launches and resets on error/timeout',()=>{
 const l=loader();l.run();const first=l.script;l.run();assert.equal(l.script,first);assert.equal(l.window.__wonderDeckLoading,true);
 l.script.onerror();assert.equal(l.window.__wonderDeckLoading,undefined);assert.equal(l.alerts.length,1);l.run();assert.notEqual(l.script,first);l.timeout();assert.equal(l.window.__wonderDeckLoading,undefined);
});
test('loader preserves an existing same-version UI and has matching integrity for the versioned script',()=>{
 const l=loader();let shown=0;l.window.__wonderDeck={version:'1.3.0',show:()=>shown++};l.run();assert.equal(shown,1);assert.equal(l.script,undefined);
 delete l.window.__wonderDeck;l.run();
 assert.equal(l.script.src,'https://satokoyo.github.io/wlw/wonder-deck-1.3.0.js');
 assert.equal(l.script.integrity,'sha384-'+crypto.createHash('sha384').update(read('dist/wonder-deck-1.3.0.js')).digest('base64'));
 assert.equal(l.script.crossOrigin,'anonymous');assert.ok(code.length<1600);
});

test('equipment stat conditions respect assumed level, exclude self/reserve, and remain unknown for missing metadata',()=>{
 const index=referenceIndex(data),subject={id:'s',name:'戦隊頭目 ゼクス',kind:'soul',level:1,rarity:4};
 const slots=[{id:'s',type:'soul'},{id:'a',type:'assist'},{id:'r',type:'reserve'}];
 const catalog=new Map([['s',subject],['a',{id:'a',name:'unknown',kind:'assist',level:6,rarity:3}],['r',{level:1,rarity:3}]]);
 const rule=referenceFor(subject,index).stats.skill.condition;
 assert.equal(referenceCondition(rule,subject,slots,catalog,5),false);
 assert.equal(referenceCondition(rule,subject,slots,catalog,6),true);
 assert.equal(referenceValue(referenceFor(subject,index).stats.skill,subject,false,{slots,catalog,level:6}).value,3.33);
 delete catalog.get('a').rarity;
 assert.equal(referenceCondition(rule,subject,slots,catalog,6),null);
 assert.equal(referenceValue(referenceFor(subject,index).stats.skill,subject,true,{slots,catalog,level:6}).value,null);
});
test('conditional penalties and multi-stage equipment/time effects do not bypass their prerequisites',()=>{
 const index=referenceIndex(data),subject={id:'x',kind:'assist',name:'小刀・童話斬り',level:1,rarity:3};
 const slots=[{id:'x',type:'assist'},{id:'y',type:'assist'},{id:'s',type:'soul'}];
 const catalog=new Map([['x',subject],['y',{level:2,rarity:3}],['s',{level:1,rarity:3}]]);
 const ctx={slots,catalog,level:1},entry=referenceFor(subject,index).stats.skill;
 assert.equal(referenceValue(entry,subject,true,ctx).value,0);
 ctx.level=2;assert.equal(referenceValue(entry,subject,false,ctx).value,-50);
 const staged=referenceFor({name:'創聖模写・不変の救難',kind:'assist'},index).stats.skill;
 assert.equal(referenceValue(staged,subject,false,ctx).value,13.33);
 assert.equal(referenceValue(staged,subject,true,ctx).value,19.17);
 ctx.level=1;assert.equal(referenceValue(staged,subject,true,ctx).value,0);
});
test('published strengthening overrides use the equipped slot overlap without interpolation',()=>{
 const index=referenceIndex(data),card={id:'x',name:'茨の王レヴェイエ',kind:'soul',level:3,overlap:10};
 const catalog=new Map([['x',card]]);
 const result=referenceTotals([{type:'soul',id:'x',overlap:0}],catalog,index);
 assert.equal(result.ss.value,6.5);assert.equal(result.ss.calibrated,1);
 assert.equal(referenceValue(referenceFor(card,index).stats.ss,{...card,overlap:4}).value,7);
 assert.equal(referenceValue(referenceFor({name:'魔法怪盗 ロルト',kind:'soul'},index).stats.ss,{overlap:4},true).value,null);
});
test('negative modifiers and approximations are retained rather than becoming exact positive totals',()=>{
 const index=referenceIndex(data),card={id:'x',name:'冷たき女王の氷鏡',kind:'assist',level:4};
 const result=referenceTotals([{type:'assist',id:'x'}],new Map([['x',card]]),index);
 assert.equal(result.skill.value,-5);assert.equal(result.ds.value,3.7);
 const z=referenceFor({name:'戦隊頭目 ゼクス',kind:'soul'},index).stats.ss;
 assert.equal(referenceValue(z,{},true).approximate,true);
 assert.equal(referenceValue(z,{},false).approximate,false);
 assert.throws(()=>referenceIndex({schemaVersion:1,cards:[{kind:'assist',name:'x',stats:{ss:{base:0,active:1,source:'evil'}}}]}));
});

test('official effect text can establish no impact, but generic buffs and incomplete text stay unknown',()=>{
 const card={kind:'assist',effect:'assstibs▲最大HPが上がるbs〔特殊〕▲最大MPが上がる'};
 for(const stat of ['ss','ds','skill'])assert.equal(referenceValue(undefined,card,true,null,stat).value,0);
 for(const effect of ['', '▲最大HPが上がる','assstibs〔特殊〕▲攻撃力が上がる','assstibs〔特殊〕xyz'])assert.equal(referenceValue(undefined,{...card,effect},true,null,'ss').value,null);
 const down={...card,effect:'assstibs▼スキル攻撃力が下がる'};
 assert.equal(referenceValue(undefined,down,true,null,'skill').value,null);
});
test('special-only numbers become totals only when official base effects establish zero',()=>{
 const index=referenceIndex(data),entry=referenceFor({name:'天と獄への土産物',kind:'assist'},index).stats.ss;
 const card={kind:'assist',effect:'assstibs▲最大MPが上がるbs〔特殊〕▲ストレート攻撃力が上がる'};
 assert.equal(referenceValue(entry,card,true,null,'ss').value,5);
 assert.equal(referenceValue(entry,card,false,null,'ss').value,0);
 assert.equal(referenceValue(entry,{...card,effect:'assstibs▲ストレート攻撃力が上がるbs〔特殊〕▲ストレート攻撃力が上がる'},true,null,'ss').value,null);
});
