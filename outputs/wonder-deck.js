/* Wonder Deck 1.0 — self-contained Wonder.NET deck editor. */
(function () {
  'use strict';
  const VERSION = '1.1.1';
  const GROUPS = ['skill', 'master', 'assist', 'soul', 'reserve'];
  const TYPES = {1: 'skill', 2: 'assist', 3: 'soul', 8: 'mskill'};
  const LABEL = {skill: 'スキル', assist: 'アシスト', soul: 'ソウル', mskill: 'マスタースキル', reserve: 'リザーブ'};
  const CAT = {1: '攻撃', 2: '回復', 3: '強化', 4: '妨害', 5: '移動・特殊', 7: '武器', 8: '防具', 9: '装飾', 10: '道具', 11: 'ソウル'};
  const RARITY = {1: 'N', 2: 'R', 3: 'SR', 4: 'WR'};
  const EFFECTS = {1: 'ストレート', 2: 'ドロー', 4: 'スピード', 8: 'HP', 16: 'MP'};
  const VERSIONS = {1: 'Ver.1', 2: 'Ver.2', 3: 'Ver.3', 4: 'Ver.4', 5: 'Ver.5', 9: 'NEW', 19: 'キャスト専用', 20: '冒険譚', 50: 'クラフト', 70: 'イベント', 90: 'その他'};
  const WORDS = {sti:'使用可能レベルに達すると、以下の効果を発動する。',zcs:'【全キャスト共通スキル】',ass:'【アシスト】',bka:'【冒険専用アシスト】',bks:'【冒険専用スキル】',ksh:'この効果はストーリーモードでのみ発動する。',kss:'このカードはストーリーモードでのみ使用できる。',fli:'フリックをすると即時発動する。',sau:'▲ストレート攻撃力が上がる',sad:'▼ストレート攻撃力が下がる',dau:'▲ドロー攻撃力が上がる',dad:'▼ドロー攻撃力が下がる',hpu:'▲最大ＨＰが上がる',hpd:'▼最大ＨＰが下がる',mpu:'▲最大ＭＰが上がる',mpd:'▼最大ＭＰが下がる',spu:'▲スピードが上がる',spd:'▼スピードが下がる',sku:'▲スキル防御力が上がる'};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => String(s || '').normalize('NFKC').toLocaleLowerCase('ja');
  function effectParts(raw) {
    const out = []; let color = '';
    for (const p of String(raw || '').split(/(sti|zcs|ass|bka|bks|ksh|kss|fli|sau|sad|dau|dad|hpu|hpd|mpu|mpd|spu|spd|sku|fcr|fcb|fs|bs)/g)) {
      if (p === 'fcr' || p === 'fcb') color = p === 'fcr' ? 'up' : 'down';
      else if (p === 'fs') color = '';
      else if (p) out.push({text: p === 'bs' ? '\n' : WORDS[p] || p, color});
    }
    return out;
  }
  const effectText = raw => effectParts(raw).map(p => p.text).join('');
  const effectHTML = raw => effectParts(raw).map(p => `<span class="${p.color}">${esc(p.text)}</span>`).join('');
  const validID = id => typeof id === 'string' && /^[a-f\d]{32}$/i.test(id);
  function normalizeCard(raw, source, catalog) {
    const base = catalog && catalog.get(raw.ci);
    let kind, category, cast;
    if (source === 'deck') { kind = TYPES[Number(raw.ct)]; category = raw.ca; }
    else if (source === 'skill') { kind = 'skill'; category = raw.ct; cast = String(raw.ca); }
    else if (source === 'mskill') { kind = 'mskill'; category = raw.ct; }
    else { kind = Number(raw.ct) === 11 ? 'soul' : 'assist'; category = raw.ct; }
    const c = {...base, id:raw.ci, name:raw.na || (base && base.name) || '名称未取得', kind,
      category:Number(category == null ? base && base.category : category),
      level:raw.lv == null ? base && base.level : Number(raw.lv),
      overlap:raw.ol == null ? base && base.overlap : Number(raw.ol),
      rarity:raw.ra == null ? base && base.rarity : Number(raw.ra),
      flags:raw.fi == null ? (base && base.flags) || 0 : Number(raw.fi),
      versions:raw.gr || (base && base.versions) || [],
      cast:cast == null ? base && base.cast : cast,
      effect:raw.te == null ? (base && base.effect) || '' : raw.te,
      peculiar:raw.rc || (base && base.peculiar) || [],
      boosts:raw.se || (base && base.boosts) || [],
      equipped:!!raw.set, owned:raw.ha == null ? (base?.owned ?? true) : [true,1,'1','true'].includes(raw.ha),
      mp:raw.mp == null ? base && base.mp : raw.mp,
      uses:raw.uc == null ? base && base.uses : raw.uc,
      first:raw.fst == null ? base && base.first : raw.fst,
      next:raw.nex == null ? base && base.next : raw.nex};
    c.search = norm(c.name + ' ' + effectText(c.effect) + ' ' + c.peculiar.map(r => r.na).join(' '));
    return c;
  }
  function slotsOf(deck) {
    return GROUPS.flatMap(group => (deck[group] || []).map(r => ({type:group === 'master' ? 'mskill' : group,
      slot:Number(r.sl), id:validID(r.ci) ? r.ci : null, overlap:r.lv, kind:TYPES[Number(r.ct)],
      editable:!(group === 'skill' && Number(r.sl) === 0) && !(group === 'reserve' && !r.bs)})));
  }
  const slotKey = s => s.type + ':' + s.slot;
  const sameSlot = (a,b) => !!a && !!b && slotKey(a) === slotKey(b);
  const slotLabel = s => s.type === 'skill' && s.slot === 0 ? 'ワンダースキル（固定）' : LABEL[s.type] + ' ' + (s.type === 'reserve' ? s.slot + 1 : s.slot) + (s.type === 'assist' && s.slot === 9 ? ' · Lv.6以上' : '');
  function slotRule(slot, card, cast) {
    if (!slot || !slot.editable) return 'この枠は変更できません';
    if (!card || !validID(card.id)) return 'カードを選んでください';
    if (!card.owned) return '未所持のカードです';
    if (slot.type === 'reserve') return '';
    if (slot.type === 'mskill' && (slot.slot !== 8 || card.kind !== 'mskill')) return 'slot=8はマスタースキル専用です';
    if (slot.type === 'soul' && (slot.slot !== 7 || card.kind !== 'soul')) return 'slot=7はソウル専用です';
    if (slot.type === 'assist') {
      if (![4,5,6,9].includes(slot.slot) || card.kind !== 'assist') return 'アシストカード専用です';
      if (slot.slot === 9 && !(card.level >= 6)) return '使用可能レベル6以上のアシストが必要です';
    }
    if (slot.type === 'skill' && (card.kind !== 'skill' || ![1,2,3].includes(slot.slot) || (card.cast != null && card.cast !== String(cast)))) return 'このキャストの通常スキル専用です';
    if (!['skill','assist','soul','mskill'].includes(slot.type)) return '不明な枠です';
    return '';
  }
  const categoryKey = c => ['mskill','soul'].includes(c.kind) ? c.kind : c.kind+':'+(c.category || 'unknown');
  const categoryName = key => LABEL[key] || ((key.startsWith('skill:')?'スキル・':'')+(CAT[key.split(':')[1]] || '分類未取得'));
  const cardCategoryText = c => c.kind==='assist' ? CAT[c.category] || '分類未取得' : c.kind==='skill' ? 'スキル・'+(CAT[c.category] || '分類未取得') : LABEL[c.kind] || '種別未取得';
  const levelOrder = c => c.kind==='mskill' ? 98 : Number.isFinite(c.level) && c.level>0 ? c.level : 99;
  const kindOrder = c => c.kind==='skill'?0:c.kind==='mskill'?2:1;
  const levelLabel = c => c.kind==='skill' ? '通常スキル' : c.kind==='mskill' ? 'マスタースキル（使用レベルなし）' : levelOrder(c)===99 ? '使用レベル未取得' : 'Lv.'+c.level;
  const cardGroup = c => c.kind==='skill'?'skill':kindOrder(c)+':'+levelOrder(c);
  function unavailableReason(c){
    if(!c)return 'カードを選んでください';
    if(!c.owned)return '未所持のため選択できません';
    const missing=[];
    if(!['skill','assist','soul','mskill'].includes(c.kind))missing.push('種別');
    if(!c.name || c.name==='名称未取得')missing.push('カード名');
    if(c.kind!=='mskill' && levelOrder(c)===99)missing.push('使用レベル');
    if(!RARITY[c.rarity])missing.push('レアリティ');
    if(['skill','assist'].includes(c.kind) && !CAT[c.category])missing.push('カテゴリ');
    if(!c.effect)missing.push('効果');
    return missing.length?'情報未取得（'+missing.join('・')+'）のため選択できません':'';
  }
  const emptyFilter = () => ({q:'',kind:[],categoryTab:'all',level:[],rarity:[],versions:[],effects:[],effectMode:'all',proper:false,recommended:false});
  function filterCards(cards, f, cast) {
    const words = norm(f.q).trim().split(/\s+/).filter(Boolean);
    const result = cards.filter(c => {
      if (words.some(w => !c.search.includes(w))) return false;
      if (f.categoryTab!=='all' && categoryKey(c)!==f.categoryTab) return false;
      for (const k of ['kind','level','rarity']) if (f[k].length && !f[k].map(String).includes(String(c[k]))) return false;
      if (f.versions.length && !f.versions.some(v => c.versions.includes(Number(v)))) return false;
      if (f.proper && !c.peculiar.some(r => r.ty === 'cast' && String(r.ci) === String(cast))) return false;
      if (f.recommended && !c.rank) return false;
      const flags = f.effects.map(Number);
      if (flags.length && !(f.effectMode === 'all' ? flags.every(v => c.flags & v) : flags.some(v => c.flags & v))) return false;
      return true;
    });
    result.sort((a,b) => kindOrder(a)-kindOrder(b) || levelOrder(a)-levelOrder(b) || (b.rarity || 0)-(a.rarity || 0));
    return result;
  }
  const recommendedCards = cards => cards.filter(c=>c.rank).sort((a,b)=>(a.recommendationOrder ?? a.rank)-(b.recommendationOrder ?? b.rank));
  function deckSignature(deck) { return JSON.stringify(slotsOf(deck).map(s => [s.type,s.slot,s.id])); }
  class Engine {
    constructor(api, catalog, notify) {
      this.api=api; this.catalog=catalog; this.notify=notify || (()=>{});
      this.cast=''; this.deck=null; this.slot=null; this.cards=[]; this.rankings=[]; this.selected=null;
      this.pending=false; this.loading=false; this.uncertain=null; this.epoch=0; this.status=''; this.error=''; this.disposed=false; this.successes=0;
    }
    emit() { if (!this.disposed) this.notify(this); }
    get locked() { return this.pending || !!this.uncertain; }
    get slots() { return this.deck ? slotsOf(this.deck) : []; }
    get current() { return this.slots.find(s=>sameSlot(s,this.slot)); }
    async changeCast(cast, wanted) {
      if (this.locked || this.disposed) return false;
      const ticket=++this.epoch; this.cast=String(cast); this.loading=true; this.deck=null; this.slot=null; this.cards=[];this.rankings=[];this.selected=null;this.error='';this.status='キャストのデッキを読み込み中…';this.emit();
      try {
        const deck=await this.api.deck(this.cast);
        if (ticket!==this.epoch || this.disposed) return false;
        this.deck=deck; this.setRankings();
        const next=this.slots.find(s=>sameSlot(s,wanted)) || this.slots.find(s=>s.editable);
        this.loading=false; return await this.chooseSlot(next);
      } catch(e) { if(ticket===this.epoch){this.loading=false;this.error=e.message;this.status='取得できませんでした';this.emit();} return false; }
    }
    setRankings() {
      this.rankings=['ARANK','ASRANK','MRANK'].flatMap(key => (this.deck[key] || []).map((r,i)=>({...normalizeCard(r,'deck',this.catalog),rank:i+1}))).map((c,i)=>({...c,recommendationOrder:i}));
    }
    async chooseSlot(slot) {
      if(this.locked || this.disposed || !slot || !this.deck) return false;
      const actual=this.slots.find(s=>sameSlot(s,slot)); if(!actual)return false;
      const ticket=++this.epoch, cast=this.cast;
      this.slot=actual;this.selected=null;this.cards=[];this.loading=true;this.error='';this.status='候補を読み込み中…';this.emit();
      try {
        const d=await this.api.candidates(cast,actual);
        if(ticket!==this.epoch || this.disposed)return false;
        if(d.setcast && String(d.setcast.id)!==cast)throw Error('候補のキャストが一致しません');
        this.castName=d.setcast && d.setcast.name;
        this.installCandidates(d);this.loading=false;this.status='枠を選び、カードの詳細を確認してセット';this.emit();return true;
      }catch(e){if(ticket===this.epoch){this.loading=false;this.error=e.message;this.status='候補を取得できませんでした';this.emit();}return false;}
    }
    installCandidates(d) {
      this.currentDetail=d.setcard && validID(d.setcard.ci) ? normalizeCard(d.setcard,'deck',this.catalog) : null;
      if(this.currentDetail)this.catalog.set(this.currentDetail.id,this.currentDetail);
      for(const r of d.card || []){const c=normalizeCard(r,'deck',this.catalog);this.catalog.set(c.id,c);}
      this.setRankings();
      const ranks=new Map(this.rankings.map(c=>[c.id,c]));
      this.cards=(d.card || []).map(r=>{const c=normalizeCard(r,'deck',this.catalog), rank=ranks.get(c.id);return {...c,rank:rank && rank.rank,recommendationOrder:rank && rank.recommendationOrder};});
      this.allowed=new Map(this.cards.map(c=>[c.id,c]));
      const used=new Set(this.cards.map(c=>c.id));
      for(const c of this.rankings)if(!used.has(c.id) && this.slot.editable && !slotRule(this.slot,{...c,owned:true},this.cast))this.cards.push({...c,viewOnly:true});
      if(this.currentDetail)this.selected=this.currentDetail;
    }
    reason(card) {
      if(this.pending)return '保存しています';
      if(this.uncertain)return '保存結果の再照合が必要です';
      if(this.loading || !this.deck)return '読み込み中です';
      const unavailable=unavailableReason(card);if(unavailable)return unavailable;
      const rule=slotRule(this.current,card,this.cast);if(rule)return rule;
      if(this.current.id===card.id)return 'この枠にセット中です';
      if(!this.allowed || !this.allowed.has(card.id))return 'この枠の公式候補に含まれていません';
      return '';
    }
    async save(id) {
      if(this.locked || this.loading || this.disposed || !this.current)return false;
      const remove=id==='remove', card=remove?null:this.allowed && this.allowed.get(id), slot={...this.current};
      if(remove ? (!slot.editable || !slot.id) : !!this.reason(card))return false;
      const op={cast:this.cast,slot,id,before:deckSignature(this.deck)};
      this.pending=true;this.error='';this.status='最新の候補と変更キーを確認中…';this.selected=card;this.emit();
      let sent=false, returned=false, responseError='';
      try {
        const latest=await this.api.deck(op.cast);
        if(deckSignature(latest)!==op.before){
          this.deck=latest;this.setRankings();this.slot=this.slots.find(s=>sameSlot(s,slot));
          this.cards=[];this.allowed=new Map();this.selected=null;
          if(this.slot){const d=await this.api.candidates(op.cast,this.slot);this.installCandidates(d);}
          throw Error('別の画面で配置が変更されています。最新のデッキを表示しました。交換する枠とカードを確認して、もう一度セットしてください');
        }
        const occupied=slotsOf(latest).filter(s=>s.id===id && !sameSlot(s,slot));
        if(occupied.length>1)throw Error('同じカードが複数枠にあるため配置を確認できません');
        op.swapFrom=occupied[0] || null;
        if(op.swapFrom && !op.swapFrom.editable)throw Error('固定枠のカードは移動できません');
        const permission=await this.api.permission(op.cast,slot);
        if(remove && !permission.remove)throw Error('公式画面ではこのカードを外せません');
        const fresh=await this.api.candidates(op.cast,slot);
        if(fresh.setcast && String(fresh.setcast.id)!==op.cast)throw Error('保存先キャストが一致しません');
        const currentID=fresh.setcard && validID(fresh.setcard.ci) ? fresh.setcard.ci : null;
        if(currentID!==slot.id)throw Error('他の画面で構成が変更されています。デッキを再取得してください');
        if(!remove){const raw=(fresh.card || []).find(c=>c.ci===id);if(!raw)throw Error('このカードは現在の公式候補にありません');const c=normalizeCard(raw,'deck',this.catalog),why=unavailableReason(c)||slotRule(slot,c,op.cast);if(why)throw Error(why);}
        if(op.swapFrom && slot.id){const why=slotRule(op.swapFrom,normalizeCard(fresh.setcard,'deck',this.catalog),op.cast);if(why)throw Error('交換元の枠に現在のカードを戻せません：'+why);}
        this.status='保存しています…';this.emit();sent=true;
        try{const res=await this.api.commit(op.cast,slot,id,permission.key);returned=true;responseError=res.error || '';}catch(e){responseError=e.message;}
        this.uncertain=op;
        const ok=await this.reconcile(returned,responseError);
        return ok;
      } catch(e) {
        if(sent)this.uncertain=op;
        this.error=e.message;this.status=sent?'保存結果を確認できません。再照合してください':'保存していません';return false;
      } finally {this.pending=false;this.emit();}
    }
    async reconcile(definite, message) {
      const op=this.uncertain;if(!op)return false;
      this.status='サーバーのデッキと照合中…';this.emit();
      try{
        const deck=await this.api.deck(op.cast), actual=slotsOf(deck).find(s=>sameSlot(s,op.slot));
        const expected=op.id==='remove'?null:op.id;
        if(!actual)throw Error('保存先の枠を確認できません');
        const exchanged=!op.swapFrom || slotsOf(deck).find(s=>sameSlot(s,op.swapFrom))?.id===op.slot.id;
        const ids=slotsOf(deck).map(s=>s.id).filter(Boolean), unique=new Set(ids).size===ids.length;
        const matched=actual.id===expected && exchanged && unique;
        this.deck=deck;this.setRankings();this.slot=actual;
        if(matched || definite){
          this.uncertain=null;this.error=matched?'':(message || '交換結果が予定の配置と一致しません。サーバーの最新構成を表示しました。内容を確認してください');
          this.status=matched?'保存済み · デッキを再取得しました':'変更できませんでした';
          if(matched)this.successes++;
          this.cards=[];this.allowed=new Map();this.selected=null;
          try{const d=await this.api.candidates(op.cast,actual);this.installCandidates(d);}catch(e){this.loading=true;this.error='保存結果は確認済みですが、候補を取得できません。再読込してください：'+e.message;}
          return matched;
        }
        this.error=message || '通信が途切れ、反映の有無が未確定です。少し待って再照合してください';this.status='保存結果が未確定 · 次の保存を停止中';return false;
      }catch(e){this.error=e.message;this.status='保存結果を確認できません。再照合してください';return false;}
      finally{this.emit();}
    }
    dispose(){if(this.locked)return false;this.disposed=true;this.epoch++;return true;}
  }
  if(typeof module==='object' && module.exports){module.exports={Engine,normalizeCard,slotRule,slotsOf,slotKey,filterCards,recommendedCards,emptyFilter,categoryKey,cardCategoryText,levelOrder,levelLabel,cardGroup,unavailableReason,effectText,effectHTML,deckSignature};return;}
  if(location.origin!=='https://wonderland-wars.net' || !/^\/deck\/(index|deckchange)\.html$/.test(location.pathname)){alert('Wonder.NETのカード編集画面で実行してください。');return;}
  if(window.__wonderDeck){window.__wonderDeck.show();return;}
  const aborts=new Set();
  async function request(path,format) {
    const url=new URL(path,location.origin);if(url.origin!==location.origin)throw Error('通信先が一致しません');
    const ctl=new AbortController();aborts.add(ctl);const timer=setTimeout(()=>ctl.abort(),20000);
    try{
      const r=await fetch(url.href,{credentials:'same-origin',cache:'no-store',signal:ctl.signal});
      if(!r.ok)throw Error('通信エラー HTTP '+r.status);
      if(new URL(r.url).origin!==location.origin)throw Error('ログイン状態を確認してください');
      const text=await r.text();
      if(/name=["'](?:segaid|password)["']/i.test(text))throw Error('ログインの有効期限が切れました。再ログインして起動し直してください');
      if(format==='text')return text;
      let d;try{d=JSON.parse(text);}catch(_){throw Error('データを取得できません。ログイン状態を確認してください');}
      if((d.status && d.status!=='OK') || (d.con && d.con!=='OK') || (d.rslt && d.rslt!=='OK'))throw Error('公式サイトがデータ取得を受け付けませんでした');
      return d;
    }catch(e){if(e.name==='AbortError')throw Error('通信がタイムアウトしました');throw e;}
    finally{clearTimeout(timer);aborts.delete(ctl);}
  }
  const params=(cast,slot)=>new URLSearchParams({cast:String(cast),type:slot.type,slot:String(slot.slot)});
  const api={
    deck:async cast=>{const d=await request('/deck/setdeck?cast='+encodeURIComponent(cast));if(!Array.isArray(d.skill)||!Array.isArray(d.reserve))throw Error('デッキの形式が変更されています');return d;},
    candidates:async(cast,slot)=>{const d=await request('/deck/mydeck.json?'+params(cast,slot));if(!Array.isArray(d.card))throw Error('候補カードを取得できません');return d;},
    permission:async(cast,slot)=>{const html=await request('/deck/deckchange.html?'+params(cast,slot),'text'),doc=new DOMParser().parseFromString(html,'text/html'),key=doc.querySelector('#hkey')?.textContent.trim();if(!key)throw Error('変更キーを取得できません。ログイン状態を確認してください');return {key,remove:!!doc.querySelector('#btn_remove')};},
    commit:async(cast,slot,id,key)=>{const q=params(cast,slot);q.set('card',id);q.set('key',key);const html=await request('/deck/deckchange_ok.html?'+q,'text');const doc=new DOMParser().parseFromString(html,'text/html');return {error:[...doc.querySelectorAll('#info_message_box,.text_red')].map(e=>e.textContent.trim()).filter(Boolean).join(' ')};}
  };
  const host=document.createElement('div');host.id='wonder-deck-extension';host.style.cssText='all:initial;position:fixed;inset:0;z-index:2147483646;display:block;';document.body.append(host);
  const background=[...document.body.children].filter(el=>el!==host).map(el=>[el,el.inert]);
  background.forEach(([el])=>el.inert=true);
  const root=host.attachShadow({mode:'open'}), oldOverflow=document.documentElement.style.overflow;
  document.documentElement.style.overflow='hidden';
  let viewport=document.querySelector('meta[name=viewport]'), madeViewport=false, oldViewport=viewport?.getAttribute('content');
  if(!viewport){viewport=document.createElement('meta');viewport.name='viewport';document.head.append(viewport);madeViewport=true;}
  viewport.setAttribute('content','width=device-width, initial-scale=1');
  root.innerHTML=`<style>
:host{color-scheme:light}*{box-sizing:border-box}button,input,select{font:inherit;color:#29251e}button,select,input{border:1px solid #a59a86;border-radius:7px;background:#f7f2e8}button{padding:8px 11px;cursor:pointer}button:hover{border-color:#087f8c;background:#e0efeb}button:disabled{cursor:default;opacity:.45}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #008596;outline-offset:2px}input[type=search]{width:100%;padding:10px 12px;background:#fffdf7}select{padding:7px;max-width:100%}input[type=checkbox]{accent-color:#07848f}h1,h2,h3,h4,p{margin:0}h2{font-size:16px}small,.muted{color:#655e53}.shell{height:100%;height:100dvh;display:flex;flex-direction:column;background:#e9e1d2 url(/common/images/bg_base.jpg) center/cover;color:#27231e;font:14px/1.5 system-ui,-apple-system,"Hiragino Kaku Gothic ProN",sans-serif;color-scheme:light}.top{display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid #897e6c;background:#eee7d9 url(/common/images/bg_body.jpg);flex-wrap:wrap}.brand{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:800}.brand img{width:156px;height:auto;display:block}.brand span{color:#9e1731}.spacer{flex:1}.status{font-size:12px;color:#333c3a;padding:6px 18px;min-height:30px;background:#f2eee4;border-bottom:1px solid #a69a86}.status.error{color:#8f231e}.layout{max-width:1760px;width:calc(100% - 24px);margin:0 auto 12px;border:1px solid #877b64;box-shadow:0 5px 22px #0006;background:#f7f1e7 url(/common/images/bg_body.jpg);display:grid;grid-template-columns:304px minmax(300px,1fr) 300px;flex:1;min-height:0}.pane{min-height:0;overflow:auto;padding:14px;overscroll-behavior:contain}.deck{background:#faf7efeb;border-right:1px solid #b3a68d;padding:10px}.catalog{background:#fffcf6c7}.detail{background:#faf6ee url(/common/images/bg_body.jpg) repeat-y;background-size:100% auto;border-left:1px solid #b3a68d}.deck-row{display:grid;grid-template-columns:3fr 1fr;gap:5px;margin-bottom:8px}.deck-row.equipment{grid-template-columns:4fr 1fr}.deck-group{min-width:0}.section{font-size:11px;color:#fff;background:#282524 url(/common/images/h3_bg01.png) center/100% 100%;text-align:center;padding:3px 1px;margin-bottom:4px;white-space:nowrap}.slot-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px}.single .slot-grid{grid-template-columns:minmax(0,1fr)}.equipment .slot-grid,.reserve .slot-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.equipment .single .slot-grid{grid-template-columns:minmax(0,1fr)}.slot{position:relative;display:flex;flex-direction:column;gap:3px;align-items:center;width:100%;min-width:0;text-align:center;background:#fffaf0;border-color:#d8ccba;padding:4px 2px}.slot.active{border-color:#0c8792;background:#dceddf;box-shadow:inset 0 0 0 1px #0c8792}.slot img{width:34px;height:48px;object-fit:contain}.slot b{font-size:10px;font-weight:600;line-height:1.3;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;min-height:26px}.slot .empty-slot{height:48px;display:grid;place-items:center;color:#796d58;font-size:11px}.slot .restriction{position:absolute;right:0;top:0;background:#d9eadc;border-radius:3px;font-size:9px;padding:0 2px;color:#245142}.foot{font-size:9px;color:#6c6355;margin-top:8px}.toolbar{display:flex;gap:8px;align-items:center;margin:9px 0;flex-wrap:wrap}.toolbar label{font-size:12px;display:flex;align-items:center;gap:4px}.toolbar button{font-size:12px;padding:6px}.toolbar small{font-size:11px}#target{color:#fff;background:#222 url(/common/images/h2_bg.png) center/100% 100%;text-align:center;padding:9px 14px;font-size:15px}.category-tabs{display:flex;flex-wrap:wrap;gap:4px;border-bottom:2px solid #07848f;margin:10px 0 12px;padding-bottom:5px}.category-tabs button{padding:6px 9px;font-size:12px;border-radius:6px 6px 0 0;background:#f4eddf}.category-tabs button[aria-selected=true]{background:#087f8c;border-color:#087f8c;color:white;font-weight:700}.filters{background:#f2ecdf;border:1px solid #b5aa93;border-radius:8px;padding:9px;margin-bottom:10px}.filters summary{cursor:pointer;color:#39342b}.filter-row{margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}.filter-row strong{font-size:11px;min-width:66px;color:#51483c}.check{font-size:11px;background:#e9e1d1;border-radius:5px;padding:5px;display:inline-flex;align-items:center;gap:2px}.conditions{font-size:11px;color:#245a53;line-height:1.6;margin:8px 0;overflow-wrap:anywhere}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px}.group-heading,.level-heading{grid-column:1/-1}.group-heading{font-size:15px;color:#624414;border-bottom:2px solid #bfa66d;margin-top:10px;padding:3px 1px}.group-heading{margin-bottom:8px}.group-heading.other{color:#334c49;border-color:#9baca5}.level-heading{display:flex;align-items:center;gap:9px;font-size:12px;color:#534935;padding:5px 0 0}.level-heading:after{content:'';height:1px;flex:1;background:#c3b59c}.card{position:relative;text-align:left;padding:7px;background:#fffdf6;border-color:#b7ab95;min-width:0;display:flex;flex-direction:column;gap:5px}.card.selected{border-color:#078896;box-shadow:0 0 0 1px #078896}.card img{width:100%;aspect-ratio:120/169;object-fit:contain;min-height:0}.card b{font-size:11px;line-height:1.5;overflow-wrap:anywhere}.card .meta{font-size:10px;color:#625b4f}.rank{position:absolute;left:4px;top:4px;background:#f8d885;color:#362711;padding:2px 4px;border-radius:4px;font-size:10px;font-weight:700}.card.unowned:disabled{opacity:.5;filter:grayscale(.6);background:#eee9df;cursor:not-allowed}.more{width:100%;margin:16px 0}.detail-title{display:flex;justify-content:space-between;gap:8px;margin-bottom:14px}.detail-title button{display:none}.portrait{display:block;width:150px;max-height:225px;object-fit:contain;margin:10px auto}.effect{white-space:pre-wrap;font-size:13px;line-height:1.8;margin:14px 0;overflow-wrap:anywhere}.up{color:#a8261d}.down{color:#185f9b}.data{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.data span{padding:4px 7px;background:#e7dfcf;border-radius:5px;font-size:11px}.actions{position:sticky;bottom:-14px;background:#faf6ee;padding:12px 0;display:grid;gap:8px}.primary{background:#087f8c;border-color:#087f8c;color:#fff;font-weight:800}.primary:hover{background:#066873;color:#fff}.reason{font-size:12px;line-height:1.5;color:#715637}.empty{padding:28px 8px;color:#5e594e;line-height:1.8}.mobile-nav{display:none}.reconcile{background:#ebd4ad}.cast-picker{position:absolute;z-index:5;top:60px;left:12px;right:12px;max-width:740px;max-height:70vh;overflow:auto;background:#f7f1e5;border:1px solid #80765f;border-radius:12px;padding:16px;box-shadow:0 20px 80px #000a}.cast-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:7px;margin-top:12px}.cast-grid button{font-size:12px;display:flex;align-items:center;gap:5px;text-align:left}.cast-icon{display:block;flex:none;width:40px;height:16px;overflow:hidden}.cast-grid .cast-icon img{display:block;width:40px;height:auto;max-width:none}.cast-name{min-width:0;overflow-wrap:anywhere}.cast-grid button[aria-pressed=true]{border-color:#07848f;background:#e0efeb}.cast-picker[hidden]{display:none}.detail-backdrop{display:none}
.card{display:block;padding:0;aspect-ratio:120/190;overflow:hidden;isolation:isolate}.card img{position:absolute;top:0;left:0;display:block;width:100%;height:auto;aspect-ratio:120/169;object-fit:contain}.card-caption{position:absolute;left:0;right:0;bottom:0;height:94px;display:grid;grid-template-rows:43px 12px 12px 12px;gap:2px;padding:5px 5px 4px;background:linear-gradient(#fff9e9e8,#fff9e9fa);color:#24211b;box-shadow:0 -1px 0 #4f463855}.card b{font-size:11px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.card .meta{font-size:9px;line-height:12px;color:#413d32;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card .category{font-weight:600}.card-state{font-weight:600}.rank{z-index:1;top:3px;left:3px;padding:2px 3px;font-size:9px}.card.unowned:disabled{opacity:.5}
@media(min-width:1450px){.layout{grid-template-columns:330px minmax(400px,1fr) 350px}.grid{grid-template-columns:repeat(auto-fill,minmax(115px,1fr))}.slot img{width:38px;height:54px}.slot b{font-size:11px}}
@media(max-width:1080px){.layout{grid-template-columns:280px minmax(250px,1fr)}.detail{display:none}.detail.open{display:flex;position:absolute;right:0;top:0;bottom:0;width:min(400px,90vw);z-index:9;box-shadow:-20px 0 60px #0008}.detail-title button{display:block}.detail-backdrop.open{display:block;position:absolute;inset:0;background:#0008;z-index:8}}
@media(max-width:700px){.top{padding:8px 12px;gap:5px}.brand{font-size:11px;gap:4px}.brand img{width:110px}.top button{padding:8px;font-size:12px}.top .version,.top .spacer{display:none}.top{display:grid;grid-template-columns:minmax(0,1fr) auto auto}.top .brand{grid-column:1/3}.top [data-action=close]{grid-column:3;grid-row:1}.top #cast-current{grid-column:1/3;grid-row:2;margin:0;text-align:left}.top [data-action=reload]{grid-column:3;grid-row:2}.status{padding:6px 12px;font-size:11px}.mobile-nav{display:flex;gap:8px;padding:5px 12px;background:#eae2d2}.mobile-nav button{flex:1}.mobile-nav button.active{background:#d1e8e2;border-color:#078796}.layout{display:block;position:relative;width:100%;margin:0;border:0;box-shadow:none}.pane{height:100%;padding:12px}.deck{display:none}.shell[data-tab=deck] .deck{display:block}.shell[data-tab=deck] .catalog{display:none}.slot img{width:38px;height:54px}.slot b{font-size:11px}.grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.card{padding:0}.card b{font-size:10px}.detail.open{top:8%;bottom:0;width:100%;height:92%;border-radius:16px 16px 0 0;padding:18px;padding-bottom:env(safe-area-inset-bottom,16px);background:#faf6ee}.detail .portrait{width:120px}.detail-title h2{font-size:17px}.actions{bottom:-18px;padding-bottom:max(16px,env(safe-area-inset-bottom))}.filter-row strong{width:100%}}
@media(max-height:650px) and (min-width:701px){.deck .slot img{width:29px;height:41px}.deck .slot{padding:3px 2px}.deck .section{padding:2px 1px}.deck-row{margin-bottom:5px}}
.detail{display:flex;flex-direction:column;overflow:hidden}.detail-title{flex:none;align-items:flex-start;margin-bottom:8px}.detail-title h2{font-size:16px;line-height:1.45}.detail-summary{display:flex;align-items:flex-start;gap:8px;flex:none;margin-bottom:7px}.detail .portrait{width:32px;height:45px;max-height:45px;object-fit:contain;margin:0;flex:none}.detail .data{margin:0;gap:4px}.detail .data span{padding:2px 5px;font-size:10px}.detail-body{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding-right:3px}.detail-body .muted{font-size:11px;line-height:1.5}.detail .effect{font-size:13px;line-height:1.65;margin:8px 0}.detail .actions{position:static;flex:none;padding:8px 0 0;margin-top:8px;gap:6px;border-top:1px solid #ccbea4;background:#faf6ee}.detail .reason{font-size:11px}.detail .actions button{padding:8px 10px}@media(max-width:1080px){.detail{display:none}.detail.open{display:flex}}@media(max-width:700px){.detail .actions{padding-bottom:max(8px,env(safe-area-inset-bottom))}}
</style><div class="shell" data-tab="deck"><header class="top"><div class="brand"><img src="/common/images/bg_header.jpg" alt="Wonder.NET"><span>カード編集 拡張</span></div><small class="version">${VERSION}</small><button data-action="casts" id="cast-current">読み込み中…</button><div class="spacer"></div><button data-action="reload">再読込</button><button data-action="close">閉じる</button></header><div id="status" class="status" role="status" aria-live="polite">カード情報を読み込み中…</div><nav class="mobile-nav"><button data-action="tab" data-value="deck" class="active">デッキ</button><button data-action="tab" data-value="catalog">カード一覧</button></nav><main class="layout"><section class="pane deck" aria-label="現在のデッキ"></section><section class="pane catalog" aria-label="カード一覧"><h2 id="target">編集する枠を選択</h2><div class="toolbar"><input type="search" id="search" placeholder="カード名・効果を検索" aria-label="カード名・効果を検索"></div><nav id="category-tabs" class="category-tabs" role="tablist" aria-label="カードカテゴリ"></nav><div class="toolbar"><label><input type="checkbox" data-filter="recommended">おすすめ限定</label><small>Lv.昇順 → レアリティ降順</small><button data-action="clear">全解除</button></div><details class="filters"><summary>絞り込み条件</summary><div id="filter-controls"></div></details><div class="conditions" id="conditions"></div><div class="toolbar"><strong id="count">0枚</strong><small>カードを選ぶと効果を表示</small></div><section id="recommendations" aria-label="おすすめカード" hidden><h3 class="group-heading">おすすめ</h3><div class="grid" id="recommend-grid"></div></section><h3 class="group-heading other">カード一覧</h3><div class="grid" id="card-grid"></div><button class="more" data-action="more">さらに表示</button></section><div class="detail-backdrop" data-action="detail-close"></div><aside class="pane detail" aria-label="カード詳細"></aside></main><div class="cast-picker" hidden><div class="toolbar"><strong>キャストを選択</strong><button data-action="casts-close">閉じる</button></div><div class="cast-grid"></div></div></div>`;
  const $=s=>root.querySelector(s), $$=s=>[...root.querySelectorAll(s)];
  let engine, filter=emptyFilter(), visible=48, castList=[], catalog=new Map(), lastSlot='', lastCast='', observer, booting=false;
  let listRef, listFilter='', filteredCache=[], drawn=0, deckRenderKey='', searchTimer;
  const img=c=>'/common/img_card_thum/'+({skill:'skill',mskill:'master',assist:'assist',soul:'soul'}[c.kind] || 'assist')+'/'+c.id+'.png';
  const overlap=c=>c.overlap==null?'':c.overlap>=10?('MAX'+(c.kind==='skill' && c.overlap>10?' ＋'+(c.overlap>=30?'MAX':c.overlap-10):'')):('+'+c.overlap);
  function show(){host.style.display='block';}
  function message(text,error){$('#status').textContent=text;$('#status').classList.toggle('error',!!error);}
  function setTab(tab){$('.shell').dataset.tab=tab;$$('[data-action=tab]').forEach(b=>b.classList.toggle('active',b.dataset.value===tab));}
  function filterUI(){
    const row=(key,title,values)=>`<div class="filter-row"><strong>${title}</strong>${Object.entries(values).map(([v,t])=>`<label class="check"><input type="checkbox" data-filter="${key}" value="${v}">${esc(t)}</label>`).join('')}</div>`;
    $('#filter-controls').innerHTML=row('kind','カード種別',{skill:'通常スキル',mskill:'マスタースキル',assist:'アシスト',soul:'ソウル'})+row('level','使用レベル',{1:1,2:2,3:3,4:4,5:5,6:6,7:7})+row('rarity','レアリティ',RARITY)+row('effects','上昇能力',EFFECTS)+`<div class="filter-row"><strong>能力の条件</strong><select id="effect-mode" aria-label="上昇能力の条件"><option value="all">すべて含む</option><option value="any">いずれか含む</option></select></div>`+row('versions','バージョン等',VERSIONS)+`<div class="filter-row"><label class="check"><input type="checkbox" data-filter="proper">選択キャストの専用アシスト</label></div>`;
  }
  function renderDeck(e,busy){
    const group=(type,label,cls='')=>`<section class="deck-group ${cls}" aria-label="${label}"><h3 class="section">${label}</h3><div class="slot-grid">${e.slots.filter(s=>s.type===type && !(s.type==='skill' && s.slot===0)).map(s=>{
      const c=catalog.get(s.id) || e.rankings.find(c=>c.id===s.id) || {id:s.id,name:s.id?'名称未取得':'未設定',kind:s.kind};
      return `<button class="slot ${sameSlot(s,e.slot)?'active':''}" data-action="slot" data-value="${slotKey(s)}" title="${esc(slotLabel(s)+'：'+c.name)}" aria-label="${esc(slotLabel(s)+'：'+c.name)}" ${busy?'disabled':''}>${s.id?`<img src="${img(c)}" alt="">`:'<span class="empty-slot">空き</span>'}${s.type==='assist' && s.slot===9?'<span class="restriction">6+</span>':''}<b>${esc(c.name)}</b></button>`;
    }).join('')}</div></section>`;
    $('.deck').innerHTML='<div class="deck-row">'+group('skill','スキル')+group('mskill','マスター','single')+'</div><div class="deck-row equipment">'+group('assist','アシスト')+group('soul','ソウル','single')+'</div>'+group('reserve','リザーブ','reserve')+'<p class="foot">カード画像・データ ©SEGA</p>';
  }
  function renderCategoryTabs(){
    const keys=[...new Set(engine.cards.map(categoryKey))].sort((a,b)=>a.localeCompare(b,'en',{numeric:true}));
    const current=['all',...keys];
    if(!current.includes(filter.categoryTab))filter.categoryTab='all';
    const tabs=$('#category-tabs'), key=current.join('|')+'|'+filter.categoryTab;
    if(tabs.dataset.key===key)return;
    tabs.dataset.key=key;
    tabs.innerHTML=current.map(k=>`<button role="tab" aria-selected="${filter.categoryTab===k}" data-action="category" data-value="${esc(k)}">${esc(k==='all'?'すべて':categoryName(k))}</button>`).join('');
  }
  function render(){
    if(!engine)return;
    const e=engine, busy=e.locked;
    $$('.cast-grid button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===e.cast)));
    const cast=castList.find(c=>c.id===e.cast);$('#cast-current').textContent=(cast && cast.name)||e.castName||('キャスト '+e.cast);
    $('#cast-current').disabled=busy;$$('[data-action=reload],[data-action=close]').forEach(b=>b.disabled=busy);
    message((e.error?e.error+' ｜ ':'')+e.status,!!e.error);
    if(e.uncertain){const b=document.createElement('button');b.textContent='保存結果を再照合';b.dataset.action='reconcile';b.disabled=e.pending;b.className='reconcile';$('#status').append(' ',b);}
    const deckKey=e.deck?deckSignature(e.deck)+'|'+(e.slot?slotKey(e.slot):'')+'|'+busy:'';
    if(e.deck && deckKey!==deckRenderKey){
      deckRenderKey=deckKey;
      renderDeck(e,busy);
    }else if(!e.deck){deckRenderKey='';$('.deck').innerHTML='<div class="empty">'+esc(e.loading?'デッキを読み込み中…':'再読込してください')+'</div>';}
    const key=e.slot?slotKey(e.slot):'';
    if(lastCast!==e.cast || lastSlot!==key){filter.categoryTab='all';visible=48;$('.catalog').scrollTop=0;$('.detail').classList.remove('open');$('.detail-backdrop').classList.remove('open');lastCast=e.cast;lastSlot=key;}
    $('#target').textContent=e.slot?slotLabel(e.slot):'編集する枠を選択';
    if(!e.loading)renderCategoryTabs();
    renderCards();renderDetail();
  }
  function cardMarkup(c,e){
    const unavailable=unavailableReason(c);
    const state=!c.owned?'未所持':unavailable?'情報未取得':c.equipped?'他枠に装備中':c.viewOnly?'閲覧用':'';
    const stats=[c.kind!=='mskill' && c.level?'Lv.'+c.level:'',RARITY[c.rarity]||'',c.owned?overlap(c):''].filter(Boolean).join(' · ');
    return `<button class="card ${e.selected?.id===c.id?'selected':''} ${unavailable?'unowned':''}" data-action="card" data-value="${c.id}" aria-label="${esc(c.name)}${unavailable?'（'+esc(unavailable)+'）':'の詳細'}" title="${esc(unavailable || c.name+' / '+cardCategoryText(c)+' / '+stats)}" ${unavailable?'disabled':''}>${c.rank?`<span class="rank">おすすめ ${c.rank}</span>`:''}<img loading="lazy" decoding="async" src="${img(c)}" alt=""><span class="card-caption"><b>${esc(c.name)}</b><span class="meta category">${esc(cardCategoryText(c))}</span><span class="meta">${esc(stats)}</span><span class="meta card-state">${state}</span></span></button>`;
  }
  function renderCards(){
    if(!engine)return;
    const e=engine, cacheKey=JSON.stringify(filter)+'|'+e.cast+'|'+e.loading;
    const changed=listRef!==e.cards || listFilter!==cacheKey || visible<drawn;
    if(changed){listRef=e.cards;listFilter=cacheKey;filteredCache=e.loading?[]:filterCards(e.cards,filter,e.cast);drawn=0;$('#card-grid').replaceChildren();const recommended=recommendedCards(filteredCache);$('#recommendations').hidden=!recommended.length;$('#recommend-grid').innerHTML=recommended.map(c=>cardMarkup(c,e)).join('');}
    const list=filteredCache;
    $('#count').textContent=e.loading?'読み込み中…':list.length+'枚';
    const tags=[];if(filter.q)tags.push('検索：'+filter.q);
    for(const k of ['kind','level','rarity','versions','effects'])for(const v of filter[k])tags.push(({kind:LABEL,category:CAT,rarity:RARITY,versions:VERSIONS,effects:EFFECTS}[k]||{})[v] || 'Lv.'+v);
    if(filter.categoryTab!=='all')tags.push(categoryName(filter.categoryTab));
    if(filter.proper)tags.push('選択キャスト専用');if(filter.recommended)tags.push('おすすめ限定');
    $('#conditions').textContent=tags.length?tags.join(' ／ '):'すべての公式候補 ＋ おすすめ（閲覧用を含む）';
    const end=Math.min(visible,list.length);
    if(end>drawn){
      let markup='';
      for(let i=drawn;i<end;i++){
        const c=list[i],prev=list[i-1];
        if(!prev || cardGroup(prev)!==cardGroup(c))markup+=`<h4 class="level-heading">${esc(levelLabel(c))}</h4>`;
        markup+=cardMarkup(c,e);
      }
      $('#card-grid').insertAdjacentHTML('beforeend',markup);drawn=end;
    }
    if(!list.length && changed)$('#card-grid').innerHTML='<p class="empty">'+(e.loading?'候補を読み込み中…':'条件に合うカードがありません')+'</p>';
    $('.more').hidden=visible>=list.length;$('.more').textContent='さらに48枚表示（'+Math.min(visible,list.length)+' / '+list.length+'）';
  }
  function renderDetail(){
    const e=engine,c=e.selected,detail=$('.detail');
    if(!c){detail.innerHTML='<div class="detail-title"><h2>カードの効果</h2><button data-action="detail-close">閉じる</button></div><div class="empty">デッキの枠、または一覧のカードを選んでください。</div>';return;}
    const why=e.reason(c), current=e.current;
    const equipped=e.slots.filter(s=>s.id===c.id).map(slotLabel);
    detail.innerHTML=`<div class="detail-title"><h2>${esc(c.name)}</h2><button data-action="detail-close">閉じる</button></div><div class="detail-summary"><img class="portrait" src="${img(c)}" alt="${esc(c.name)}"><div class="data"><span>${esc(LABEL[c.kind])}</span>${c.level?`<span>使用可能 Lv.${c.level}</span>`:''}${c.rarity?`<span>${RARITY[c.rarity]||c.rarity}</span>`:''}<span>強化 ${esc(overlap(c))}</span>${c.mp!=null?`<span>MP ${c.mp}</span>`:''}${c.uses!=null?`<span>使用回数 ${c.uses}</span>`:''}${c.first!=null?`<span>初回CT ${c.first}</span>`:''}${c.next!=null?`<span>再使用CT ${c.next}</span>`:''}</div></div><div class="detail-body">${equipped.length?`<p class="muted">装備中：${esc(equipped.join(' ／ '))}</p>`:''}<div class="effect">${effectHTML(c.effect)}</div>${c.peculiar.map(r=>`<p class="muted">固有効果：${esc(r.na)}のみ適用</p>`).join('')}${c.boosts.length?`<p class="muted">強化対象：${esc(c.boosts.join('・'))}</p>`:''}</div><div class="actions"><p class="reason">${esc(why || (c.equipped?'他枠に装備中です。公式の入れ替え処理で構成を更新します。':slotLabel(current)+'にセットします'))}</p><button class="primary" data-action="save" ${why?'disabled':''}>この枠にセット</button>${current?.editable && current.id?`<button data-action="remove" ${e.locked||e.loading?'disabled':''}>この枠のカードをはずす</button>`:''}</div>`;
  }
  function chooseCard(id){if(!engine || engine.loading)return;const c=engine.cards.find(c=>c.id===id);if(unavailableReason(c))return;engine.selected=c;renderDetail();$$('.card').forEach(b=>b.classList.toggle('selected',b.dataset.value===id));$('.detail').classList.add('open');$('.detail-backdrop').classList.add('open');$('.detail').scrollTop=0;}
  function close(){
    if(engine && !engine.dispose())return;
    aborts.forEach(c=>c.abort());observer?.disconnect();clearTimeout(searchTimer);host.remove();background.forEach(([el,inert])=>el.inert=inert);document.documentElement.style.overflow=oldOverflow;
    if(madeViewport)viewport.remove();else if(oldViewport==null)viewport.removeAttribute('content');else viewport.setAttribute('content',oldViewport);
    if(engine && engine.deck && typeof window.setCastCardData==='function'){
      document.querySelectorAll('[data-cast] a').forEach(a=>a.classList.toggle('on',a.parentElement.dataset.cast===engine.cast));
      const role=document.querySelector('[data-cast="'+engine.cast+'"]')?.className.match(/role_(\d)/)?.[1];
      if(role!=null && typeof window.rolesetting==='function')window.rolesetting(Number(role));
      window.setCastCardData(Number(engine.cast));
    }
    delete window.__wonderDeck;
  }
  window.__wonderDeck={version:VERSION,show,close,get state(){return engine;}};
  root.addEventListener('click',async event=>{
    const b=event.target.closest('[data-action]');if(!b || b.disabled)return;
    const action=b.dataset.action;
    if(action==='close'){close();return;}
    if(action==='detail-close'){$('.detail').classList.remove('open');$('.detail-backdrop').classList.remove('open');return;}
    if(action==='tab'){setTab(b.dataset.value);return;}
    if(action==='casts-close'){$('.cast-picker').hidden=true;return;}
    if(!engine){if(action==='reload')boot();return;}
    if(action==='casts' && !engine.locked){$('.cast-picker').hidden=!$('.cast-picker').hidden;return;}
    if(action==='cast' && !engine.locked){$('.cast-picker').hidden=true;setTab('deck');await engine.changeCast(b.dataset.value);return;}
    if(action==='reload' && !engine.locked){await engine.changeCast(engine.cast,engine.slot);return;}
    if(action==='slot'){const s=engine.slots.find(s=>slotKey(s)===b.dataset.value);if(engine.locked)return;setTab('catalog');await engine.chooseSlot(s);return;}
    if(action==='category'){filter.categoryTab=b.dataset.value;visible=48;$('.catalog').scrollTop=0;renderCategoryTabs();renderCards();return;}
    if(action==='card'){chooseCard(b.dataset.value);return;}
    if(action==='save'){await engine.save(engine.selected?.id);return;}
    if(action==='remove'){await engine.save('remove');return;}
    if(action==='reconcile' && !engine.pending){engine.pending=true;engine.emit();await engine.reconcile(false);engine.pending=false;engine.emit();return;}
    if(action==='clear'){filter=emptyFilter();$('#search').value='';$('#effect-mode').value='all';$$('[data-filter]').forEach(el=>el.checked=false);visible=48;renderCategoryTabs();renderCards();return;}
    if(action==='more'){visible+=48;renderCards();}
  });
  root.addEventListener('input',ev=>{if(ev.target.id==='search'){filter.q=ev.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{visible=48;renderCards();},150);}});
  root.addEventListener('change',ev=>{
    const el=ev.target,key=el.dataset.filter;
    if(key){if(Array.isArray(filter[key]))filter[key]=$$('[data-filter='+key+']:checked').map(e=>e.value);else filter[key]=el.checked;}
    if(el.id==='effect-mode')filter.effectMode=el.value;
    visible=48;renderCards();
  });
  root.addEventListener('keydown',ev=>{if(ev.key==='Escape'){$('.detail').classList.remove('open');$('.detail-backdrop').classList.remove('open');$('.cast-picker').hidden=true;}});
  filterUI();
  observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting) && !$('.more').hidden){visible+=48;renderCards();}},{root:$('.catalog'),rootMargin:'150px'});observer.observe($('.more'));
  async function boot(){
    if(booting || !host.isConnected)return;booting=true;
    try{
      const q=new URLSearchParams(location.search);
      const selected=document.querySelector('[data-cast] a.on')?.parentElement.dataset.cast;
      const cast=selected || (/^#\d+$/.test(location.hash)?location.hash.slice(1):q.get('cast')) || document.querySelector('#hcast')?.textContent.trim();
      if(cast==null || !/^\d+$/.test(cast))throw Error('表示中のキャストを特定できません');
      let castDoc=document;
      if(!document.querySelector('[data-cast]'))castDoc=new DOMParser().parseFromString(await request('/deck/index.html?cast='+cast,'text'),'text/html');
      for(const type of ['skill','assist','mskill']){
        const data=await request('/card/mycard?type='+type);if(!Array.isArray(data.card))throw Error('カード名を取得できません');
        data.card.forEach(r=>{const c=normalizeCard(r,type);if(validID(c.id))catalog.set(c.id,c);});
      }
      if(!host.isConnected)return;
      const names=new Map();for(const c of catalog.values())if(c.kind==='skill'){const m=effectText(c.effect).match(/【(.+?)専用スキル】/);if(m)names.set(c.cast,m[1]);}
      castList=[...castDoc.querySelectorAll('[data-cast]')].map(e=>({id:e.dataset.cast,name:names.get(e.dataset.cast)||('キャスト '+e.dataset.cast),image:e.querySelector('img')?.getAttribute('src')}));
      if(!castList.some(c=>c.id===cast))castList.push({id:cast,name:names.get(cast)||'キャスト '+cast});
      $('.cast-grid').innerHTML=castList.map(c=>`<button data-action="cast" data-value="${esc(c.id)}">${c.image?`<span class="cast-icon"><img src="${esc(new URL(c.image,location.href).href)}" alt=""></span>`:''}<span class="cast-name">${esc(c.name)}</span></button>`).join('');
      engine=new Engine(api,catalog,render);
      await engine.changeCast(cast,q.has('slot')?{type:q.get('type'),slot:Number(q.get('slot'))}:null);
    }catch(e){message(e.message,true);}finally{booting=false;}
  }
  boot();
})();
