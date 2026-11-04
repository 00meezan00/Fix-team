/* ============================================================
   💰 owner-paycards.js — «كروت المرتبات» عند المالك (v148)
   ------------------------------------------------------------
   🧸 بالبلدي:
      المحاسب العام بيبعت من شؤون العاملين كروت مرتبات موظفين
      للمالك (prod-owner-paycards.sql). الملف ده بيعمل للمالك:
        • زرار «💰 كروت المرتبات» في قايمة ⋮ (تحت 🏪 المحل) وعليه
          عدد الكروت اللي لسه ماشافهاش.
        • شاشة فيها كل إرسالية لوحدها (الأحدث فوق): التاريخ ·
          ملاحظة المحاسب العام · كارت لكل موظف بأرقامه وقت الإرسال.
      ⚠️ الكارت = صورة وقت الإرسال. اتغيّرت الأرقام؟ المحاسب العام
         بيبعته تاني، وبيظهر في إرسالية جديدة فوق.
   🔒 السيرفر هو اللي بيقرر مين يشوف (المالك والمحاسب العام بس).
   ⚠️ مكتفي بنفسه: ستايله جواه وبيستعمل ألوان owner.html لو موجودة.
      الدالة مش موجودة (الـSQL مااتشغّلش)؟ الزرار مابيظهرش.
   ============================================================ */
(function(){
  'use strict';
  var ROWS = [], ERR = '', OPEN = {};

  function esc(t){ return String(t == null ? '' : t).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function money(v){ return v == null ? '—' : (Math.round(Number(v) * 100) / 100).toLocaleString('en-US'); }
  function when(t){ try{ return new Date(t).toLocaleString('ar-EG', { weekday:'short', day:'numeric', month:'short', hour:'numeric', minute:'2-digit' }); }catch(e){ return String(t); } }
  function dur(m){ m = Math.abs(Math.round(Number(m) || 0)); var h = Math.floor(m / 60), r = m % 60;
    return (h ? h + ' س' : '') + (h && r ? ' ' : '') + (r ? r + ' د' : '') || '0'; }

  function css(){
    if(document.getElementById('opcCss')) return;
    var st = document.createElement('style');
    st.id = 'opcCss';
    st.textContent = [
      '#opcOverlay{position:fixed;inset:0;z-index:80;background:var(--paper,#EBEEF2);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;}',
      '#opcOverlay.hidden{display:none;}',
      '.opc-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(14px + env(safe-area-inset-top)) 16px 14px;background:var(--chrome,#16233A);color:var(--on-chrome,#fff);}',
      '.opc-head h2{margin:0;font-size:17px;font-weight:900;}',
      '.opc-x{border:0;border-radius:12px;width:40px;height:40px;font-size:22px;background:rgba(255,255,255,.12);color:inherit;cursor:pointer;}',
      '.opc-body{padding:14px 16px 40px;max-width:640px;margin:0 auto;}',
      '.opc-batch{background:var(--card,#fff);border:1px solid var(--line,#E4E9EF);border-radius:16px;margin-bottom:14px;overflow:hidden;}',
      '.opc-bh{all:unset;box-sizing:border-box;display:flex;width:100%;gap:8px;align-items:center;justify-content:space-between;padding:12px 14px;cursor:pointer;font-weight:900;font-size:14px;color:var(--ink,#17222E);}',
      '.opc-bh small{display:block;font-weight:400;color:var(--muted,#6B7A8C);font-size:12px;margin-top:3px;}',
      '.opc-new{background:var(--owner-bg,#FBF4E4);color:var(--owner,#8A6410);border-radius:10px;padding:2px 8px;font-size:11.5px;font-weight:800;margin-inline-start:6px;}',
      '.opc-note{margin:0 14px 10px;padding:8px 10px;border-radius:10px;background:var(--paper,#EBEEF2);font-size:12.5px;color:var(--ink-2,#475569);}',
      '.opc-card{border-top:1px solid var(--line,#E4E9EF);padding:12px 14px;}',
      '.opc-card b.n{font-size:14.5px;}',
      '.opc-card .r{color:var(--muted,#6B7A8C);font-size:12px;}',
      '.opc-lines{margin-top:8px;font-size:13px;line-height:1.95;}',
      '.opc-lines div{display:flex;justify-content:space-between;gap:10px;}',
      '.opc-lines .neg b{color:var(--red,#E8321E);} .opc-lines .pos b{color:var(--done,#15803D);}',
      '.opc-net{display:flex;justify-content:space-between;align-items:baseline;margin-top:6px;padding-top:6px;border-top:1px dashed var(--line,#E4E9EF);font-weight:900;font-size:15px;}',
      '.opc-tag{display:inline-block;font-size:11px;border-radius:8px;padding:1px 7px;margin-inline-start:6px;background:var(--done-bg,#EAF6EE);color:var(--done,#15803D);font-weight:800;}',
      '.opc-empty{text-align:center;color:var(--muted,#6B7A8C);padding:40px 10px;line-height:1.9;}',
      '.opc-debts{margin-top:10px;padding:8px 10px;border-radius:10px;background:var(--paper,#EBEEF2);font-size:12px;}',
      '.opc-dh{font-weight:900;font-size:12.5px;margin-bottom:4px;}',
      '.opc-dt{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:6px;align-items:baseline;padding:3px 0;}',
      '.opc-dt span:not(:first-child){color:var(--muted,#6B7A8C);font-size:11px;}',
      '.opc-dt b{font-weight:800;}',
      '.opc-badge{background:#DC2626;color:#fff;border-radius:10px;padding:1px 7px;font-size:11.5px;font-weight:800;margin-inline-start:6px;}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function ensureUi(){
    css();
    if(!document.getElementById('opcOverlay')){
      var ov = document.createElement('div');
      ov.id = 'opcOverlay'; ov.className = 'hidden'; ov.setAttribute('dir', 'rtl');
      document.body.appendChild(ov);
    }
  }

  // زرار القايمة — تحت «👥 الموظفين» في 🏪 المحل
  function ensureBtn(){
    var menu = document.getElementById('kebabMenu');
    if(!menu || document.getElementById('opcMenuBtn')) return document.getElementById('opcMenuBtn');
    var b = document.createElement('button');
    b.id = 'opcMenuBtn';
    b.style.display = 'none';
    b.innerHTML = '💰 كروت المرتبات<span id="opcBadge" class="opc-badge" style="display:none;"></span>';
    b.onclick = function(){ try{ if(typeof closeKebab === 'function') closeKebab(); }catch(e){} openOwnerPaycards(); };
    var anchor = document.getElementById('sbOwnerBtn');
    if(anchor && anchor.parentNode === menu) menu.insertBefore(b, anchor.nextSibling);
    else menu.appendChild(b);
    return b;
  }

  async function load(){
    try{
      var r = await sb.rpc('owner_paycards_list', { p_limit: 300 });
      if(r.error) throw r.error;
      ROWS = r.data || []; ERR = '';
      return true;
    }catch(e){
      ERR = (e && e.message) || String(e);
      if(/owner_paycards|PGRST202|does not exist|42883/i.test(ERR)) ERR = 'missing';
      return false;
    }
  }
  function syncBadge(){
    var b = ensureBtn(); if(!b) return;
    if(ERR === 'missing'){ b.style.display = 'none'; return; }   // الـSQL مااتشغّلش
    b.style.display = '';
    var n = ROWS.filter(function(x){ return !x.seen_at; }).length;
    var bd = document.getElementById('opcBadge');
    if(bd){ bd.textContent = n; bd.style.display = n ? '' : 'none'; }
  }

  function cardHtml(h){
    var c = h.card || {};
    var lines = [];
    var add = function(t, v, cls){ lines.push('<div class="' + (cls || '') + '"><span>' + t + '</span><b>' + v + '</b></div>'); };
    add('💵 المرتب', c.salary == null ? 'مش متحدد' : money(c.salary));
    if(c.manual)    add('− 💸 خصم يدوي', money(c.manual), 'neg');
    if(c.late)      add('− ⏰ خصم تأخير', money(c.late), 'neg');
    if(c.withdraw)  add('− 🔩 مسحوبات', money(c.withdraw), 'neg');
    if(c.overtime)  add((c.overtime > 0 ? '+ ⏫ أوفر تايم ' : '− ⏬ عجز ساعات ') + '(' + dur(c.overtime_min) + ')', money(Math.abs(c.overtime)), c.overtime > 0 ? 'pos' : 'neg');
    if(c.bonus)     add('+ 🎁 زيادات', money(c.bonus), 'pos');
    if(c.leave)     add('+ 💵 إجازات ما اتاخدتش (' + (c.leave_days || 0) + ' يوم)', money(c.leave), 'pos');
    if(c.debt_paid) add('− 💳 سداد ديون', money(c.debt_paid), 'neg');
    return '<div class="opc-card">'
      + '<b class="n">' + esc(c.name || h.user_email) + '</b>'
      + (c.partner ? ' <small>🤝 شريك</small>' : '')
      + (c.paid ? '<span class="opc-tag">🔒 اتصرف</span>' : '')
      + '<div class="r">' + esc(c.role || '') + (c.role ? ' · ' : '') + esc(c.month || '') + '</div>'
      + (c.has_slip === false
          ? '<div class="opc-lines"><div><span>مفيش كشف للشهر ده</span><b>—</b></div></div>'
          : '<div class="opc-lines">' + lines.join('') + '</div>'
            + '<div class="opc-net"><span>= الصافي</span><span style="color:' + (Number(c.net) < 0 ? 'var(--red,#E8321E)' : 'var(--done,#15803D)') + ';">' + money(c.net) + ' ج.م</span></div>')
      + debtsHtml(c)
      + '</div>';
  }

  // 💳 ديونه في الشهر ده — الأساسي · اتخصم في الشهر · الباقي (لحد آخر الشهر)
  function debtsHtml(c){
    var list = Array.isArray(c.debts) ? c.debts : null;
    if(!list) return c.debt_left ? '<div class="r" style="margin-top:4px;">💳 باقي عليه ديون ' + money(c.debt_left) + ' ج.م</div>' : '';
    if(!list.length) return '';
    return '<div class="opc-debts"><div class="opc-dh">💳 الديون</div>'
      + '<div class="opc-dt"><span></span><span>الأساسي</span><span>اتخصم الشهر ده</span><span>الباقي</span></div>'
      + list.map(function(d){
          return '<div class="opc-dt"><span>' + esc(d.title) + '</span><b>' + money(d.amount) + '</b>'
            + '<b style="color:var(--done,#15803D);">' + money(d.paid_month) + '</b>'
            + '<b style="color:var(--red,#E8321E);">' + money(d.left) + '</b></div>';
        }).join('')
      + '</div>';
  }

  function render(){
    var ov = document.getElementById('opcOverlay'); if(!ov) return;
    var body;
    if(ERR && ERR !== 'missing') body = '<div class="opc-empty">⚠️ مقدرناش نقرا الكروت — حدّث الصفحة.<br><small>' + esc(ERR) + '</small></div>';
    else if(ERR === 'missing') body = '<div class="opc-empty">الخدمة لسه ماتركبتش</div>';
    else if(!ROWS.length) body = '<div class="opc-empty">💰 لسه مفيش كروت مرتبات اتبعتت<br><small>المحاسب العام بيبعتها من شؤون العاملين</small></div>';
    else {
      // كل إرسالية لوحدها — الأحدث فوق
      var order = [], by = {};
      ROWS.forEach(function(h){ if(!by[h.batch]){ by[h.batch] = []; order.push(h.batch); } by[h.batch].push(h); });
      body = order.map(function(bid, i){
        var list = by[bid], f = list[0];
        var fresh = list.some(function(x){ return !x.seen_at; });
        var open = OPEN[bid] != null ? OPEN[bid] : i === 0;
        return '<div class="opc-batch">'
          + '<button type="button" class="opc-bh" data-b="' + esc(bid) + '"><span>📤 ' + esc(when(f.sent_at))
          + (fresh ? '<span class="opc-new">جديد</span>' : '')
          + '<small>' + list.length + ' ' + (list.length === 1 ? 'كارت' : 'كروت') + ' · ' + esc((f.card || {}).month || '') + '</small></span>'
          + '<span>' + (open ? '▴' : '▾') + '</span></button>'
          + (open ? (f.note ? '<div class="opc-note">📝 ' + esc(f.note) + '</div>' : '') + list.map(cardHtml).join('') : '')
          + '</div>';
      }).join('');
    }
    ov.innerHTML = '<div class="opc-head"><h2>💰 كروت المرتبات</h2><button type="button" class="opc-x" aria-label="اقفل">×</button></div>'
      + '<div class="opc-body">' + body + '</div>';
    ov.querySelector('.opc-x').onclick = closeOwnerPaycards;
    Array.prototype.forEach.call(ov.querySelectorAll('.opc-bh'), function(b){
      b.onclick = function(){ var k = b.getAttribute('data-b'); var cur = OPEN[k] != null ? OPEN[k] : order0() === k; OPEN[k] = !cur; render(); };
    });
  }
  function order0(){ return ROWS.length ? ROWS[0].batch : null; }

  async function openOwnerPaycards(){
    ensureUi();
    var ov = document.getElementById('opcOverlay');
    ov.classList.remove('hidden');
    ov.innerHTML = '<div class="opc-head"><h2>💰 كروت المرتبات</h2><button type="button" class="opc-x">×</button></div><div class="opc-body"><div class="opc-empty">جاري التحميل…</div></div>';
    ov.querySelector('.opc-x').onclick = closeOwnerPaycards;
    await load();
    render();
    // 👁️ شافهم — الشارة تتصفّر
    if(!ERR && ROWS.some(function(x){ return !x.seen_at; })){
      try{ await sb.rpc('owner_paycards_seen'); }catch(e){}
      ROWS.forEach(function(x){ if(!x.seen_at) x.seen_at = new Date().toISOString(); });
      syncBadge();
    }
  }
  function closeOwnerPaycards(){
    var ov = document.getElementById('opcOverlay'); if(ov) ov.classList.add('hidden');
    load().then(syncBadge);
  }
  window.openOwnerPaycards = openOwnerPaycards;
  window.closeOwnerPaycards = closeOwnerPaycards;

  document.addEventListener('keydown', function(e){
    if(e.key !== 'Escape') return;
    var ov = document.getElementById('opcOverlay');
    if(ov && !ov.classList.contains('hidden')) closeOwnerPaycards();
  });

  async function boot(){
    try{
      if(typeof sb === 'undefined') return;
      var ses = await sb.auth.getSession();
      if(!ses || !ses.data || !ses.data.session) return;
      ensureUi(); ensureBtn();
      await load(); syncBadge();
      // كل ٣ دقايق — عشان الشارة تبان لو اتبعت حاجة جديدة والصفحة مفتوحة
      setInterval(function(){
        var ov = document.getElementById('opcOverlay');
        if(ov && !ov.classList.contains('hidden')) return;
        load().then(syncBadge);
      }, 180000);
    }catch(e){ console.error('owner-paycards boot:', e); }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
