// ############################################################
// 🏭 مدير الإنتاج — «تتبع الفنيين» + «طلبات الانصراف» (مؤقت للإنتاج)
// ------------------------------------------------------------
// 🧸 الفكرة ببساطة:
//    • مدير الإنتاج بيفتح «👷 تتبع الفنيين» من قايمة ⋮ ويعلّم على
//      الفنيين اللي تحت إيده.
//    • أي فني من دول يدوس 🔴 انصراف → بيوصل هنا طلب.
//    • شريط فوق الأعمدة «🚪 فيه فني مستني توافق على انصرافه» →
//      ✅ وافق  أو  ✋ لسه.
//    • الفني بعد الموافقة بيدوس انصراف تاني ويتسجّل (الموافقة ٦٠ دقيقة).
//    • المحاسب العام كمان يقدر يوافق (لو مدير الإنتاج مش موجود) —
//      عنده «🚪 طلبات انصراف الفنيين» في القايمة والشريط.
//
// 🗄️ السيرفر: ملف prod-prodmgr.sql — prodmgr_map · prodmgr_set_techs ·
//    prodmgr_out_list · prodmgr_out_decide. مابيقراش ولا بيكتب جداول
//    على طول.
// ⚠️ بيستخدم من الداشبورد: sb · esc · roleEntry · currentUser · isSuperAdmin
//    (كلهم بـ typeof عشان لو حاجة ناقصة مايوقعش الصفحة).
// ############################################################
(function(){
  'use strict';

  const _esc = s => (typeof esc === 'function') ? esc(s)
    : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const hm = iso => { try{ return new Date(iso).toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit', timeZone:'Africa/Cairo' }); }catch(e){ return ''; } };
  const day = iso => { try{ return new Date(iso).toLocaleDateString('ar-EG', { weekday:'long', day:'numeric', month:'numeric', timeZone:'Africa/Cairo' }); }catch(e){ return ''; } };

  // ---------- مين أنا ----------
  function isSup(){ try{ return typeof isSuperAdmin === 'function' && isSuperAdmin(); }catch(e){ return false; } }
  function isMgr(){
    try{
      if(typeof roleEntry !== 'function' || typeof currentUser === 'undefined' || !currentUser) return false;
      const en = roleEntry(currentUser.email);
      return !!(en && en.role === 'prodmgr') && !isSup();
    }catch(e){ return false; }
  }
  function canApprove(){ return isMgr() || isSup(); }

  let LIST = [];        // طلبات آخر ٢٤ ساعة
  let MAP = [];         // كل الفنيين + مديرهم
  let SEL = null;       // Set — اختياري قبل الحفظ
  let TAB = 'req';      // req | techs
  let BROKEN = false;   // الدوال مش على السيرفر (الملف مااتشغّلش)
  let BUSY = false;
  let lastPending = -1;

  const pending = () => LIST.filter(r => r.status === 'pending');

  // ---------- الستايل (بألوان الداشبورد) ----------
  function css(){
    if(document.getElementById('pmStyle')) return;
    const s = document.createElement('style');
    s.id = 'pmStyle';
    s.textContent = `
    #pmOv{position:fixed; inset:0; z-index:4000; background:var(--bg,#F3F5F7); overflow-y:auto; -webkit-overflow-scrolling:touch;}
    #pmOv.hidden{display:none;}
    .pm-head{position:sticky; top:0; z-index:2; background:#111827; color:#fff; display:flex; align-items:center; gap:10px;
      padding:calc(12px + env(safe-area-inset-top)) 16px 12px;}
    .pm-head h2{flex:1; margin:0; font-size:17px;}
    .pm-head button{background:rgba(255,255,255,.12); color:#fff; border:none; border-radius:10px; width:38px; height:38px; font-size:20px; cursor:pointer;}
    .pm-body{max-width:720px; margin:0 auto; padding:14px 16px 40px;}
    .pm-tabs{display:flex; gap:6px; margin-bottom:12px;}
    .pm-tab{flex:1; border:1.5px solid var(--border,#E2E8F0); background:var(--surface,#fff); color:var(--ink,#1A2332); border-radius:12px;
      padding:10px; font:inherit; font-size:14px; font-weight:800; cursor:pointer;}
    .pm-tab.on{background:var(--accent,#0891A8); border-color:var(--accent,#0891A8); color:#fff;}
    .pm-tab .b{background:#DC2626; color:#fff; border-radius:10px; padding:0 7px; font-size:12px; margin-inline-start:4px;}
    .pm-card{background:var(--surface,#fff); border:1px solid var(--border,#E2E8F0); border-radius:14px; padding:12px 13px; margin-bottom:9px; color:var(--ink,#1A2332);}
    .pm-card.wait{border:2px solid #F59E0B;}
    .pm-name{font-size:16px; font-weight:800;}
    .pm-sub{font-size:12.5px; color:var(--muted,#64748B); margin-top:2px; line-height:1.7;}
    .pm-acts{display:flex; gap:8px; margin-top:10px;}
    .pm-acts button{flex:1; border:none; border-radius:10px; padding:11px; font:inherit; font-size:14.5px; font-weight:800; cursor:pointer;}
    .pm-ok{background:var(--success,#16A34A); color:#fff;}
    .pm-no{background:var(--surface-3,#F1F5F9); color:var(--ink,#1A2332); border:1.5px solid var(--border,#E2E8F0) !important;}
    .pm-h{font-size:13.5px; font-weight:800; color:var(--muted,#64748B); margin:16px 2px 8px;}
    .pm-empty{text-align:center; color:var(--muted,#64748B); padding:26px 10px; font-size:14px; line-height:1.9;}
    .pm-row{display:flex; align-items:center; gap:10px; padding:11px 12px; border-bottom:1px solid var(--border,#E2E8F0); cursor:pointer;}
    .pm-row:last-child{border-bottom:none;}
    .pm-row input{width:22px; height:22px; accent-color:var(--accent,#0891A8); flex:none;}
    .pm-row .n{flex:1; font-size:15px; font-weight:700; color:var(--ink,#1A2332);}
    .pm-row .o{font-size:12px; color:var(--warn,#B45309);}
    .pm-list{background:var(--surface,#fff); border:1px solid var(--border,#E2E8F0); border-radius:14px; overflow:hidden;}
    .pm-save{position:sticky; bottom:0; padding:12px 0 calc(12px + env(safe-area-inset-bottom)); background:var(--bg,#F3F5F7);}
    .pm-save button{width:100%; border:none; border-radius:12px; padding:13px; font:inherit; font-size:15px; font-weight:800;
      background:var(--accent,#0891A8); color:#fff; cursor:pointer;}
    .pm-save button:disabled{opacity:.5;}
    .pm-chip{display:inline-block; border-radius:8px; padding:1px 8px; font-size:12px; font-weight:800;}
    .pm-chip.ok{background:var(--success-bg,#F0FDF4); color:var(--success,#16A34A);}
    .pm-chip.no{background:var(--danger-bg,#FEF2F2); color:var(--danger,#DC2626);}
    .pm-chip.used{background:var(--info-bg,#EFF6FF); color:var(--info,#2563EB);}
    .pm-chip.gray{background:var(--surface-3,#F1F5F9); color:var(--muted,#64748B);}
    .pm-note{font-size:12.5px; color:var(--muted,#64748B); line-height:1.8; margin:0 2px 10px;}
    #pmBanner{display:none; margin:8px 12px 0; background:#FEF3C7; color:#78350F; border:2px solid #F59E0B; border-radius:14px;
      padding:11px 13px; font-size:14.5px; font-weight:800; cursor:pointer; align-items:center; gap:10px;}
    #pmBanner.on{display:flex;}
    #pmBanner span{flex:1;}
    #pmBanner b{background:#B45309; color:#fff; border-radius:10px; padding:6px 12px; font-size:13px; white-space:nowrap;}
    html[data-theme="dark"] #pmBanner{background:rgba(251,191,36,.15); color:#FCD34D; border-color:rgba(251,191,36,.5);}
    .pm-mbadge{background:#DC2626; color:#fff; border-radius:10px; padding:1px 7px; font-size:11.5px; font-weight:800; margin-inline-start:4px;}`;
    document.head.appendChild(s);
  }

  // ---------- زرار القايمة ----------
  function syncMenu(){
    const dd = document.getElementById('menuDropdown');
    if(!dd) return;
    let b = document.getElementById('pmMenuBtn');
    if(!canApprove() || BROKEN){ if(b) b.remove(); return; }
    if(!b){
      b = document.createElement('button');
      b.id = 'pmMenuBtn';
      b.onclick = () => { try{ dd.classList.add('hidden'); }catch(e){} open(isMgr() ? 'techs' : 'req'); };
    }
    const n = pending().length;
    b.innerHTML = (isMgr() ? '👷 تتبع الفنيين' : '🚪 طلبات انصراف الفنيين') +
      (n ? ` <span class="pm-mbadge">${n}</span>` : '');
    // 📍 آخر حاجة في درج «🏪 المحل» — قبل عنوان «🔩 قطع الغيار»
    const mh = Array.from(dd.querySelectorAll('.mh')).find(x => (x.textContent || '').indexOf('🔩') >= 0);
    if(mh && b.nextSibling !== mh) dd.insertBefore(b, mh);
    else if(!mh && !b.parentNode) dd.appendChild(b);
  }

  // ---------- الشريط فوق الأعمدة ----------
  function syncBanner(){
    let bn = document.getElementById('pmBanner');
    if(!bn){
      const host = document.getElementById('approvalsHost');
      if(!host || !host.parentNode) return;
      bn = document.createElement('div');
      bn.id = 'pmBanner';
      bn.onclick = () => open('req');
      host.parentNode.insertBefore(bn, host);
    }
    const p = pending();
    if(!canApprove() || !p.length){ bn.classList.remove('on'); return; }
    const names = p.slice(0, 3).map(r => r.tech_name).join('، ') + (p.length > 3 ? ' …' : '');
    bn.innerHTML = `<span>🚪 ${p.length === 1 ? 'فني مستني توافق على انصرافه' : p.length + ' فنيين مستنيين توافق على انصرافهم'} — ${_esc(names)}</span><b>افتح</b>`;
    bn.classList.add('on');
  }

  // ---------- القراية من السيرفر ----------
  async function loadList(){
    if(!canApprove() || typeof sb === 'undefined') return;
    try{
      const { data, error } = await sb.rpc('prodmgr_out_list', { p_hours: 24 });
      if(error) throw error;
      LIST = data || [];
      BROKEN = false;
    }catch(e){
      console.warn('prodmgr_out_list:', e);
      // الدالة مش موجودة = ملف SQL مااتشغّلش → نستخبى من غير ما نزعج حد
      if(/prodmgr_out_list|function|schema cache|404/i.test(String(e && (e.message || e.code) || ''))) BROKEN = true;
    }
    const n = pending().length;
    if(lastPending >= 0 && n > lastPending){ try{ navigator.vibrate && navigator.vibrate([120, 60, 120]); }catch(e){} }
    lastPending = n;
    syncBanner(); syncMenu();
    if(isOpen() && TAB === 'req') render();
  }
  async function loadMap(){
    const { data, error } = await sb.rpc('prodmgr_map');
    if(error) throw error;
    MAP = data || [];
    SEL = new Set(MAP.filter(r => r.mine).map(r => r.tech_email));
  }

  // ---------- الشاشة ----------
  function isOpen(){ const ov = document.getElementById('pmOv'); return !!(ov && !ov.classList.contains('hidden')); }
  async function open(tab){
    css();
    let ov = document.getElementById('pmOv');
    if(!ov){
      ov = document.createElement('div');
      ov.id = 'pmOv';
      ov.className = 'hidden';
      document.body.appendChild(ov);
    }
    TAB = (tab === 'techs' && isMgr()) ? 'techs' : 'req';
    ov.classList.remove('hidden');
    render('⏳ جاري التحميل…');
    await loadList();
    if(TAB === 'techs'){
      try{ await loadMap(); render(); }
      catch(e){ render(); alert('❌ مقدرناش نجيب الفنيين — ' + ((e && e.message) || e)); }
    } else render();
  }
  function close(){ const ov = document.getElementById('pmOv'); if(ov) ov.classList.add('hidden'); }
  async function setTab(t){
    TAB = t;
    if(t === 'techs' && !MAP.length){
      render('⏳ جاري التحميل…');
      try{ await loadMap(); }catch(e){ alert('❌ مقدرناش نجيب الفنيين — ' + ((e && e.message) || e)); }
    }
    render();
  }

  function render(busy){
    const ov = document.getElementById('pmOv');
    if(!ov) return;
    const nP = pending().length;
    const tabs = isMgr() ? `<div class="pm-tabs">
        <button class="pm-tab ${TAB === 'req' ? 'on' : ''}" onclick="PMG.tab('req')">🚪 طلبات الانصراف${nP ? `<span class="b">${nP}</span>` : ''}</button>
        <button class="pm-tab ${TAB === 'techs' ? 'on' : ''}" onclick="PMG.tab('techs')">👷 تتبع الفنيين</button>
      </div>` : '';
    ov.innerHTML = `
      <div class="pm-head">
        <h2>${isMgr() ? '🏭 مدير الإنتاج' : '🚪 طلبات انصراف الفنيين'}</h2>
        <button onclick="PMG.refresh()" title="تحديث">↻</button>
        <button onclick="PMG.close()">×</button>
      </div>
      <div class="pm-body">
        ${tabs}
        ${busy ? `<div class="pm-empty">${_esc(busy)}</div>` : (TAB === 'techs' ? techsHtml() : reqHtml())}
      </div>`;
  }

  function reqHtml(){
    const p = pending();
    const done = LIST.filter(r => r.status !== 'pending');
    const sup = isSup();
    const card = r => `
      <div class="pm-card wait">
        <div class="pm-name">👷 ${_esc(r.tech_name)}</div>
        <div class="pm-sub">طلب ينصرف الساعة <b>${_esc(hm(r.requested_at))}</b>${sup ? ` · مدير الإنتاج: ${_esc(r.mgr_name)}` : ''}</div>
        <div class="pm-acts">
          <button class="pm-ok" ${BUSY ? 'disabled' : ''} onclick="PMG.decide('${_esc(r.id)}', true)">✅ وافق</button>
          <button class="pm-no" ${BUSY ? 'disabled' : ''} onclick="PMG.decide('${_esc(r.id)}', false)">✋ لسه</button>
        </div>
      </div>`;
    const chip = r => ({
      approved: '<span class="pm-chip ok">✅ اتوافق — لسه مادسّش انصراف</span>',
      used:     '<span class="pm-chip used">🔴 انصرف ' + _esc(hm(r.used_at)) + '</span>',
      rejected: '<span class="pm-chip no">✋ لسه</span>',
      expired:  '<span class="pm-chip gray">⌛ الموافقة خلصت (عدّى ٦٠ دقيقة)</span>',
      cancelled:'<span class="pm-chip gray">اتلغى</span>'
    }[r.status] || '');
    const row = r => `
      <div class="pm-card">
        <div class="pm-name" style="font-size:14.5px;">${_esc(r.tech_name)} ${chip(r)}</div>
        <div class="pm-sub">طلب ${_esc(day(r.requested_at))} ${_esc(hm(r.requested_at))}${r.decided_at ? ' · ' + _esc(r.decided_by_name || '') + ' ' + _esc(hm(r.decided_at)) : ''}</div>
      </div>`;
    return `
      <div class="pm-note">الفني بيدوس انصراف → الطلب بيوصل هنا. لما توافق، الفني بيدوس انصراف تاني ويتسجّل (الموافقة صالحة ٦٠ دقيقة).${sup ? '' : ' المحاسب العام كمان يقدر يوافق لو انت مش موجود.'}</div>
      ${p.length ? p.map(card).join('') : `<div class="pm-empty">✅ مفيش حد مستني دلوقتي<br><span style="font-size:12.5px;">الصفحة بتتحدّث لوحدها كل نص دقيقة</span></div>`}
      ${done.length ? `<div class="pm-h">📋 آخر ٢٤ ساعة</div>${done.map(row).join('')}` : ''}`;
  }

  function techsHtml(){
    if(!MAP.length) return `<div class="pm-empty">مفيش فنيين في لوحة الأدمن</div>`;
    const n = SEL ? SEL.size : 0;
    const row = r => {
      const on = SEL && SEL.has(r.tech_email);
      const other = r.mgr_email && !r.mine;
      return `<label class="pm-row">
        <input type="checkbox" ${on ? 'checked' : ''} onchange="PMG.pick('${_esc(r.tech_email)}', this.checked)">
        <span class="n">${_esc(r.tech_name)}</span>
        ${other ? `<span class="o">مع «${_esc(r.mgr_name)}»</span>` : ''}
      </label>`;
    };
    return `
      <div class="pm-note">علّم على الفنيين اللي تحت إيدك. اللي هتعلّم عليه، انصرافه مش هيتم غير لما توافق انت (أو المحاسب العام).</div>
      <div class="pm-list">${MAP.map(row).join('')}</div>
      <div class="pm-save"><button ${BUSY ? 'disabled' : ''} onclick="PMG.save()">💾 احفظ — ${n} ${n === 1 ? 'فني' : 'فنيين'}</button></div>`;
  }

  // ---------- الأفعال ----------
  async function decide(id, ok){
    if(BUSY) return;
    const r = LIST.find(x => x.id === id);
    BUSY = true; render();
    try{
      const { error } = await sb.rpc('prodmgr_out_decide', { p_id: id, p_ok: !!ok });
      if(error) throw error;
      if(typeof toast === 'function'){ try{ toast(ok ? '✅ وافقت — ' + (r ? r.tech_name : '') + ' يقدر ينصرف' : '✋ اتبعتله «لسه»'); }catch(e){} }
    }catch(e){
      alert('❌ ' + ((e && e.message) || e));
    }finally{
      BUSY = false;
      await loadList();
      render();
    }
  }
  function pick(email, on){
    if(!SEL) SEL = new Set();
    if(on) SEL.add(email); else SEL.delete(email);
    const b = document.querySelector('#pmOv .pm-save button');
    if(b){ const n = SEL.size; b.textContent = '💾 احفظ — ' + n + ' ' + (n === 1 ? 'فني' : 'فنيين'); }
  }
  async function save(){
    if(BUSY || !SEL) return;
    const taken = MAP.filter(r => SEL.has(r.tech_email) && r.mgr_email && !r.mine);
    if(taken.length && !confirm('الفنيين دول مع مدير إنتاج تاني:\n' + taken.map(r => '• ' + r.tech_name + ' (مع ' + r.mgr_name + ')').join('\n') + '\n\nتاخدهم عندك؟')) return;
    BUSY = true; render();
    try{
      const { data, error } = await sb.rpc('prodmgr_set_techs', { p_emails: Array.from(SEL) });
      if(error) throw error;
      await loadMap();
      BUSY = false; render();
      alert('✅ اتحفظ — عندك ' + (data || 0) + ' ' + ((data || 0) === 1 ? 'فني' : 'فنيين') + '\nانصرافهم دلوقتي محتاج موافقتك.');
    }catch(e){
      BUSY = false; render();
      alert('❌ ماتحفظش — ' + ((e && e.message) || e));
    }
  }

  window.PMG = {
    open, close, tab: setTab, decide, pick, save,
    refresh: async () => { await loadList(); if(TAB === 'techs'){ try{ await loadMap(); }catch(e){} } render(); }
  };

  // ---------- التشغيل ----------
  // الأدوار بتتحمّل بعد الصفحة — بنستنى لحد ما نعرف مين أنا
  let started = false;
  function tryStart(){
    if(started || !canApprove()) return;
    started = true;
    css();
    loadList();
    setInterval(() => { if(document.visibilityState !== 'hidden' && !BROKEN) loadList(); }, 30000);
    document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible' && !BROKEN) loadList(); });
  }
  let tries = 0;
  const iv = setInterval(() => { tryStart(); if(started || ++tries > 60) clearInterval(iv); }, 1000);

  // أي فتح للقايمة → الزرار في مكانه
  function wrapMenu(){
    if(typeof window.toggleMenu === 'function' && !window.toggleMenu.__pm){
      const orig = window.toggleMenu;
      const w = function(){ try{ tryStart(); syncMenu(); }catch(e){} return orig.apply(this, arguments); };
      w.__pm = true;
      window.toggleMenu = w;
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wrapMenu); else wrapMenu();
  addEventListener('load', () => setTimeout(wrapMenu, 1500));
})();
