const {test}=require('node:test');
const assert=require('node:assert/strict');
const {classify,generate}=require('../scripts/update-effect-filters.cjs');
const {effectFilterIndex,filterCards,emptyFilter}=require('../src/wonder-deck.js');
const data=require('../data/effect-filters.json');
test('custom ability tags include conditional increases and inflected verbs',()=>{
 assert.deepEqual(classify('条件を満たすと回避による移動距離が上がり、スキル攻撃力が上がる。撃破ダメージが増加する。経験値を獲得できる範囲が広がる。'),['evade','skillPower','killDamage','expRange']);
 assert.deepEqual(classify('回避距離とMP回復速度が上がり、回避の硬直が減少する。'),['evade']);
});
test('negative effects, defense, cost and giants do not become positive tags',()=>{
 for(const text of ['回避による移動距離とHP回復効果を下げる。','スキル防御力が上がる。スキル消費MPが減少する。','撃破ダメージが下がり、スピードが上がる。','経験値獲得範囲が縮小する。','【ソウル】攻撃力が上がる。'])assert.deepEqual(classify(text),[],text);
 assert.deepEqual(classify('ストレート攻撃力が上がる。ドロー攻撃力が上がる。リンク攻撃力が上がる。'),[]);
 assert.deepEqual(classify('自身のMP回復速度と攻撃力が上がる。'),['skillPower']);
});
test('custom filters join by ID and combine official abilities with AND/OR',()=>{
 const tagged=data.cards.find(c=>c.effects.includes('expRange')), index=effectFilterIndex(data);
 const a={id:tagged.id,kind:'soul',flags:8,search:'',level:1,rarity:3},b={...a,id:'f'.repeat(32),flags:31};
 assert.deepEqual(filterCards([a,b],{...emptyFilter(),effects:['expRange','8']},2,index),[a]);
 assert.deepEqual(filterCards([a,b],{...emptyFilter(),effects:['expRange','1']},2,index),[]);
 assert.equal(filterCards([a,b],{...emptyFilter(),effects:['expRange','1'],effectMode:'any'},2,index).length,2);
 assert.deepEqual(filterCards([a,b],{...emptyFilter(),effects:['expRange'],level:['6']},2,index),[]);
});
test('custom JSON validates and generation deduplicates public cards',()=>{
 assert.equal(effectFilterIndex(data).size,data.cards.length);
 for(const effects of [['unknown']])assert.throws(()=>effectFilterIndex({schemaVersion:1,cards:[{id:'a'.repeat(32),effects}]}));
 assert.throws(()=>effectFilterIndex({schemaVersion:2,cards:[]}));
 assert.throws(()=>effectFilterIndex({...data,cards:[data.cards[0],data.cards[0]]}));
 const c={ci:'assist/'+ 'a'.repeat(32)+'.png',na:'test',ca:7,te:'回避距離が上がる。'};
 assert.equal(generate([{data:[c,c]}],'2026-09-25').cards.length,1);
 for(const name of ['ウィンドゲート','ウルフレイド','ランプの魔神　ジェネヴァ'])assert.ok(data.cards.some(c=>c.name.replace(/\s/g,'')===name.replace(/\s/g,'')&&c.effects.includes('evade')),name);
});
