// ############################################################
// 📊 إحصائية «ما بعد البيع» — للمحاسب العام (السوبر أدمن) بس
// ------------------------------------------------------------
// 🧸 الفكرة: الكول سنتر بيكلّم كل عميل استلم جهازه امبارح ويسجّل
//    رده (نجوم · الجهاز شغال؟ · عرفنا منين · اشتكى من · قال إيه).
//    الصفحة دي بتجمع كل الردود دي في مكان واحد:
//      • أرقام فوق: ردّوا كام · متوسط النجوم · مردّوش · شكاوى
//      • النجوم · الجهاز شغال؟ · عرفنا منين · اشتكى من إيه
//      • لكل فني · لكل موظف كول سنتر
//      • كل الردود واحد واحد (تدوس على أي واحد → تفاصيل الجهاز)
//    الفترة: النهارده · الشهر الحالي · الشهر السابق · أي شهر · كل الوقت
//
// 🗄️ بيقرا من devices_data على طول (المحاسب العام بيقراه أصلاً) —
//    الأجهزة اللي فيها afterSale بس، فالرد صغير ومش محتاج كل الأجهزة.
//    مابيكتبش أي حاجة.
//    afterSale{state done|noanswer|closed, stars, working, heardFrom, tags, note, at, by, tries, reviewed}
//    noCall{at, by, note}  ← «ماتتصلش بيا»
//
// ⚠️ ملف مؤقت للإنتاج — بيستخدم من الداشبورد: sb · esc · isSuperAdmin · openDetail
// ############################################################
(function(){
  'use strict';

  const HEARD = [
    { k:'facebook',  l:'📘 فيسبوك',       social:true },
    { k:'instagram', l:'📸 انستجرام',     social:true },
    { k:'tiktok',    l:'🎵 تيك توك',      social:true },
    { k:'referral',  l:'🗣️ حد عرّفه بينا' },
    { k:'passby',    l:'🚶 قابلنا صدفة' },
  ];
  const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  let ROWS = null;        // [{ id, a, tech, dev, cust, phone }]
  let NOCALL = [];        // [{ phone, at }]
  let PERIOD = 'month';   // today | month | prev | pick | all
  let PICK_Y = 0, PICK_M = 0;
  let LIST_F = 'all';     // all | bad | noans
  let LIST_N = 30;

  const _esc = s => (typeof esc === 'function') ? esc(s)
    : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const num = n => Number(n || 0).toLocaleString('ar-EG');
  const pct = (a, b) => b ? Math.round(a * 100 / b) : 0;
  // يوم/شهر بتوقيت القاهرة
  const cairo = ms => { try{ return new Date(ms).toLocaleDateString('en-CA', { timeZone:'Africa/Cairo' }); }catch(e){ return new Date(ms).toISOString().slice(0, 10); } };
  const phoneKey = p => String(p || '').replace(/[^0-9]/g, '').slice(-10);

  // ---------- الستايل (بألوان الداشبورد نفسها) ----------
  function css(){
    if(document.getElementById('asStStyle')) return;
    const s = document.createElement('style');
    s.id = 'asStStyle';
    s.textContent = `
    #asStOv{position:fixed; inset:0; z-index:4000; background:var(--bg,#F3F5F7); overflow-y:auto; -webkit-overflow-scrolling:touch;}
    #asStOv.hidden{display:none;}
    .ast-head{position:sticky; top:0; z-index:2; background:#111827; color:#fff; display:flex; align-items:center; gap:10px;
      padding:calc(12px + env(safe-area-inset-top)) 16px 12px;}
    .ast-head h2{flex:1; margin:0; font-size:17px;}
    .ast-head button{background:rgba(255,255,255,.12); color:#fff; border:none; border-radius:10px; width:38px; height:38px; font-size:20px; cursor:pointer;}
    .ast-body{max-width:860px; margin:0 auto; padding:14px 16px 40px;}
    .ast-per{display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; align-items:center;}
    .ast-chip{border:1.5px solid var(--border,#E2E8F0); background:var(--surface,#fff); color:var(--ink,#1A2332); border-radius:18px;
      padding:7px 13px; font:inherit; font-size:13px; font-weight:700; cursor:pointer;}
    .ast-chip.on{background:var(--accent,#0891A8); border-color:var(--accent,#0891A8); color:#fff;}
    .ast-per select{font:inherit; font-size:13px; padding:6px 8px; border-radius:10px; border:1.5px solid var(--border,#E2E8F0);
      background:var(--surface,#fff); color:var(--ink,#1A2332);}
    .ast-tiles{display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:8px; margin-bottom:12px;}
    .ast-tile{background:var(--surface,#fff); border:1px solid var(--border,#E2E8F0); border-radius:14px; padding:12px 13px;}
    .ast-tile .v{font-size:26px; font-weight:800; color:var(--ink,#1A2332); line-height:1.2;}
    .ast-tile .l{font-size:12.5px; color:var(--muted,#64748B); margin-top:3px; line-height:1.6;}
    .ast-tile.bad .v{color:var(--danger,#DC2626);}
    .ast-grid{display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:10px;}
    .ast-card{background:var(--surface,#fff); border:1px solid var(--border,#E2E8F0); border-radius:14px; padding:12px 13px; margin-bottom:10px;}
    .ast-card h3{margin:0 0 10px; font-size:14.5px; color:var(--ink,#1A2332);}
    .ast-card .sub{font-size:12px; color:var(--muted,#64748B); margin:-6px 0 10px;}
    .ast-bar{display:grid; grid-template-columns:118px 1fr 74px; gap:8px; align-items:center; margin:7px 0; font-size:13px; color:var(--ink,#1A2332);}
    .ast-bar .tr{height:10px; background:var(--surface-3,#F1F5F9); border-radius:5px; overflow:hidden;}
    .ast-bar .fl{height:100%; background:var(--accent,#0891A8); border-radius:5px; min-width:2px;}
    .ast-bar .fl.gold{background:#E0A100;} .ast-bar .fl.bad{background:var(--danger,#DC2626);} .ast-bar .fl.ok{background:var(--success,#16A34A);}
    .ast-bar .n{font-size:12.5px; color:var(--muted,#64748B); white-space:nowrap; font-variant-numeric:tabular-nums; text-align:end;}
    .ast-bar .n b{color:var(--ink,#1A2332);}
    .ast-bar.grp{font-weight:800;}
    .ast-bar.in{padding-inline-start:14px; font-size:12.5px;}
    .ast-empty{color:var(--muted,#64748B); font-size:13px; padding:4px 0;}
    .ast-tbl{width:100%; border-collapse:collapse; font-size:13px; color:var(--ink,#1A2332);}
    .ast-tbl th{font-size:11.5px; color:var(--muted,#64748B); font-weight:700; text-align:start; padding:5px 4px; border-bottom:1px solid var(--border,#E2E8F0);}
    .ast-tbl td{padding:7px 4px; border-bottom:1px solid var(--border,#E2E8F0); font-variant-numeric:tabular-nums;}
    .ast-tbl td.bad{color:var(--danger,#DC2626); font-weight:700;}
    .ast-item{border:1px solid var(--border,#E2E8F0); border-radius:12px; padding:9px 11px; margin-top:8px; cursor:pointer; font-size:13px; line-height:1.75; color:var(--ink,#1A2332);}
    .ast-item.bad{border-color:var(--danger-border,#FCA5A5); background:var(--danger-bg,#FEF2F2);}
    .ast-item .m{font-size:11.5px; color:var(--muted,#64748B);}
    .ast-more{display:block; width:100%; margin-top:10px; border:1px dashed var(--border,#E2E8F0); background:var(--surface,#fff);
      color:var(--muted,#64748B); border-radius:12px; padding:10px; font:inherit; font-size:13px; font-weight:700; cursor:pointer;}
    .ast-note{font-size:12px; color:var(--muted,#64748B); line-height:1.8; margin-top:6px;}
    `;
    document.head.appendChild(s);
  }

  // ---------- التحميل ----------
  async function fetchAll(make){
    const PAGE = 1000, out = [];
    for(let p = 0; p < 50; p++){
      const { data, error } = await make().range(p * PAGE, p * PAGE + PAGE - 1);
      if(error) throw error;
      if(!data || !data.length) break;
      out.push(...data);
      if(data.length < PAGE) break;
    }
    return out;
  }
  async function load(){
    const rows = await fetchAll(() => sb.from('devices_data')
      .select('id, as:data->afterSale, tech:data->>technician, dt:data->>deviceType, md:data->>model, cust:data->>customerName, phone:data->>customerPhone, st:data->>status')
      .not('data->afterSale', 'is', null)
      .order('id', { ascending:true }));
    ROWS = rows.filter(r => r.as && typeof r.as === 'object' && r.st !== 'trashed').map(r => ({
      id: r.id, a: r.as, tech: (r.tech || '').trim() || '—',
      dev: [r.dt, r.md].filter(Boolean).join(' '), cust: r.cust || '', phone: r.phone || '' }));
    try{
      const nc = await fetchAll(() => sb.from('devices_data')
        .select('id, nc:data->noCall, phone:data->>customerPhone')
        .not('data->noCall', 'is', null)
        .order('id', { ascending:true }));
      // «ماتتصلش بيا» بيتحط على كل أجهزة الرقم — نعدّ الرقم مرة واحدة
      const seen = new Map();
      nc.forEach(r => { const k = phoneKey(r.phone); const at = r.nc && r.nc.at;
        if(k && at && (!seen.has(k) || Date.parse(at) < Date.parse(seen.get(k)))) seen.set(k, at); });
      NOCALL = [...seen.entries()].map(([phone, at]) => ({ phone, at }));
    }catch(e){ console.warn('[ما بعد البيع] noCall:', e); NOCALL = []; }
  }

  // ---------- الفترة ----------
  function range(){
    const now = Date.now(), today = cairo(now);
    const [y, m] = today.split('-').map(Number);
    const ym = (Y, M) => `${Y}-${String(M).padStart(2, '0')}`;
    if(PERIOD === 'today') return { test: d => d === today, label: 'النهارده' };
    if(PERIOD === 'month') return { test: d => d.slice(0, 7) === ym(y, m), label: `${MONTHS[m - 1]} ${y}` };
    if(PERIOD === 'prev'){ const Y = m === 1 ? y - 1 : y, M = m === 1 ? 12 : m - 1;
      return { test: d => d.slice(0, 7) === ym(Y, M), label: `${MONTHS[M - 1]} ${Y}` }; }
    if(PERIOD === 'pick') return { test: d => d.slice(0, 7) === ym(PICK_Y, PICK_M), label: `${MONTHS[PICK_M - 1]} ${PICK_Y}` };
    return { test: () => true, label: 'كل الوقت' };
  }
  const inRange = (rg, at) => { const t = Date.parse(at); return !isNaN(t) && rg.test(cairo(t)); };

  // ---------- الحساب ----------
  function compute(){
    const rg = range();
    const rows = ROWS.filter(r => inRange(rg, r.a.at));
    const done = rows.filter(r => r.a.state === 'done');
    const noans = rows.filter(r => r.a.state === 'noanswer');
    const closed = rows.filter(r => r.a.state === 'closed');
    const rated = done.filter(r => Number(r.a.stars) > 0);
    const starSum = rated.reduce((s, r) => s + Number(r.a.stars), 0);
    const stars = [5, 4, 3, 2, 1].map(n => ({ n, c: rated.filter(r => Number(r.a.stars) === n).length }));
    const yes = done.filter(r => r.a.working === 'yes').length, no = done.filter(r => r.a.working === 'no').length;
    const isBad = r => r.a.state === 'done' && (r.a.working === 'no' || (r.a.stars && r.a.stars <= 2));
    const bad = done.filter(isBad);
    const heard = HEARD.map(h => ({ ...h, c: done.filter(r => r.a.heardFrom === h.k).length }));
    const heardAsked = heard.reduce((s, h) => s + h.c, 0);
    const tagMap = new Map();
    done.forEach(r => (Array.isArray(r.a.tags) ? r.a.tags : []).forEach(t => tagMap.set(t, (tagMap.get(t) || 0) + 1)));
    const tags = [...tagMap.entries()].map(([l, c]) => ({ l, c })).sort((a, b) => b.c - a.c);
    const tagged = done.filter(r => Array.isArray(r.a.tags) && r.a.tags.length).length;
    // لكل فني
    const tm = new Map();
    done.forEach(r => { const o = tm.get(r.tech) || { name: r.tech, n: 0, sum: 0, rated: 0, no: 0, bad: 0 };
      o.n++; if(r.a.stars){ o.sum += Number(r.a.stars); o.rated++; } if(r.a.working === 'no') o.no++; if(isBad(r)) o.bad++; tm.set(r.tech, o); });
    const techs = [...tm.values()].sort((a, b) => b.n - a.n);
    // لكل موظف كول سنتر
    const cm = new Map();
    rows.forEach(r => { const k = (r.a.by || '—').trim() || '—'; const o = cm.get(k) || { name: k, done: 0, noans: 0 };
      if(r.a.state === 'done') o.done++; else o.noans++; cm.set(k, o); });
    const agents = [...cm.values()].sort((a, b) => (b.done + b.noans) - (a.done + a.noans));
    const nocall = NOCALL.filter(x => inRange(rg, x.at)).length;
    return { rg, rows, done, noans, closed, rated, avg: rated.length ? starSum / rated.length : 0, stars, yes, no, bad,
             heard, heardAsked, tags, tagged, techs, agents, nocall, isBad };
  }

  // ---------- الرسم ----------
  const bar = (label, c, total, cls, extra) => `<div class="ast-bar ${extra || ''}" title="${_esc(label)}: ${c} من ${total}">
      <span>${label}</span><div class="tr"><div class="fl ${cls || ''}" style="width:${total ? Math.max(c ? 2 : 0, c * 100 / total) : 0}%"></div></div>
      <span class="n"><b>${num(c)}</b> (${num(pct(c, total))}٪)</span></div>`;
  const heardTxt = k => { const h = HEARD.find(x => x.k === k); return h ? (h.social ? 'السوشيال — ' : '') + h.l : ''; };

  function periodBar(){
    const now = cairo(Date.now()); const [y, m] = now.split('-').map(Number);
    if(!PICK_Y){ PICK_Y = y; PICK_M = m; }
    const chip = (k, l) => `<button class="ast-chip${PERIOD === k ? ' on' : ''}" onclick="AsStats.per('${k}')">${l}</button>`;
    const years = []; for(let Y = y; Y >= 2026; Y--) years.push(Y);
    return `<div class="ast-per">
      ${chip('today', 'النهارده')}${chip('month', 'الشهر الحالي')}${chip('prev', 'الشهر السابق')}${chip('all', 'كل الوقت')}
      <select onchange="AsStats.pick(this.value, null)" aria-label="الشهر">${MONTHS.map((n, i) => `<option value="${i + 1}"${PERIOD === 'pick' && PICK_M === i + 1 ? ' selected' : ''}>${n}</option>`).join('')}</select>
      <select onchange="AsStats.pick(null, this.value)" aria-label="السنة">${years.map(Y => `<option${PERIOD === 'pick' && PICK_Y === Y ? ' selected' : ''}>${Y}</option>`).join('')}</select>
      ${PERIOD === 'pick' ? '' : '<span class="ast-note" style="margin:0;">← أو اختار شهر</span>'}
    </div>`;
  }

  function listHtml(S){
    let L = S.rows.slice();
    if(LIST_F === 'bad') L = S.bad.slice();
    if(LIST_F === 'noans') L = S.rows.filter(r => r.a.state !== 'done');
    L.sort((a, b) => Date.parse(b.a.at) - Date.parse(a.a.at));
    const chip = (k, l, n) => `<button class="ast-chip${LIST_F === k ? ' on' : ''}" onclick="AsStats.lf('${k}')">${l} (${num(n)})</button>`;
    const item = r => { const a = r.a, bad = S.isBad(r); let when = '';
      try{ when = new Date(a.at).toLocaleString('ar-EG', { timeZone:'Africa/Cairo', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }); }catch(e){}
      const head = a.state === 'done'
        ? `${'⭐'.repeat(a.stars || 0)} (${a.stars || 0}/5) · ${a.working === 'no' ? '<b style="color:var(--danger)">🔧 فيه مشكلة</b>' : '✅ شغال'}${a.heardFrom ? ' · 📣 ' + _esc(heardTxt(a.heardFrom)) : ''}`
        : a.state === 'closed' ? `📵 اتقفلت — مردّش ${a.tries || 3} مرات` : `📵 مردّش (${a.tries || 1}) — هيتكلّم تاني`;
      return `<div class="ast-item${bad ? ' bad' : ''}" onclick="AsStats.open('${_esc(r.id)}')">
        <div><b>📱 ${_esc(r.dev || '')}</b>${r.cust ? ' — ' + _esc(r.cust) : ''}</div>
        <div>${head}</div>
        ${a.tags && a.tags.length ? `<div>😕 اشتكى من: ${_esc(a.tags.join(' · '))}</div>` : ''}
        ${a.note ? `<div style="white-space:pre-wrap;">💬 ${_esc(a.note)}</div>` : ''}
        <div class="m">🔧 ${_esc(r.tech)} · 📞 ${_esc(a.by || '')}${when ? ' · ' + _esc(when) : ''}${bad ? (a.reviewed ? ' · ✓ راجعه ' + _esc(a.reviewed.by || '') : ' · <b style="color:var(--danger)">لسه ماتراجعش</b>') : ''}</div>
      </div>`; };
    return `<div class="ast-card"><h3>📋 كل الردود</h3>
      <div class="ast-per" style="margin-bottom:4px;">${chip('all', 'الكل', S.rows.length)}${chip('bad', '😕 شكاوى', S.bad.length)}${chip('noans', '📵 مردّوش', S.noans.length + S.closed.length)}</div>
      ${L.length ? L.slice(0, LIST_N).map(item).join('') : '<div class="ast-empty">مفيش ردود هنا.</div>'}
      ${L.length > LIST_N ? `<button class="ast-more" onclick="AsStats.more()">⬇️ اعرض أكتر (${num(L.length - LIST_N)})</button>` : ''}
    </div>`;
  }

  function render(){
    const body = document.getElementById('asStBody'); if(!body) return;
    if(!ROWS){ body.innerHTML = periodBar() + '<div class="ast-empty" style="text-align:center;padding:30px;">⏳ بنجمع الردود…</div>'; return; }
    const S = compute();
    const calls = S.done.length + S.noans.length + S.closed.length;
    const notReviewed = S.bad.filter(r => !r.a.reviewed).length;
    const social = S.heard.filter(h => h.social).reduce((s, h) => s + h.c, 0);
    const noHeard = S.done.length - S.heardAsked;

    let h = periodBar();
    h += `<div class="ast-tiles">
      <div class="ast-tile"><div class="v">${num(S.done.length)}</div><div class="l">🤝 عميل ردّ واتسجّل رأيه<br>من ${num(calls)} مكالمة (${num(pct(S.done.length, calls))}٪ ردّوا)</div></div>
      <div class="ast-tile"><div class="v">${S.rated.length ? S.avg.toLocaleString('ar-EG', { maximumFractionDigits:1 }) : '—'} <span style="font-size:16px;">⭐</span></div><div class="l">متوسط النجوم من ٥</div></div>
      <div class="ast-tile${S.bad.length ? ' bad' : ''}"><div class="v">${num(S.bad.length)}</div><div class="l">😕 شكوى (فيه مشكلة أو ⭐⭐ وأقل)${notReviewed ? `<br><b style="color:var(--danger)">${num(notReviewed)} لسه ماتراجعتش</b>` : ''}</div></div>
      <div class="ast-tile"><div class="v">${num(S.noans.length + S.closed.length)}</div><div class="l">📵 مردّوش — ${num(S.closed.length)} اتقفلت (٣ مرات)${S.nocall ? `<br>🚫 ${num(S.nocall)} رقم قال «ماتتصلش بيا»` : ''}</div></div>
    </div>`;

    if(!S.rows.length){
      h += `<div class="ast-card"><div class="ast-empty">مفيش مكالمات ما بعد البيع في «${_esc(S.rg.label)}».</div></div>`;
      body.innerHTML = h; return;
    }

    h += `<div class="ast-grid">`;
    // ⭐ النجوم
    h += `<div class="ast-card"><h3>⭐ الخدمة كانت عاملة إزاي؟</h3>
      ${S.stars.map(s => bar('⭐'.repeat(s.n), s.c, S.rated.length, s.n <= 2 ? 'bad' : 'gold')).join('')}</div>`;
    // 🔧 شغال؟
    h += `<div class="ast-card"><h3>🔧 الجهاز شغال كويس؟</h3>
      ${bar('✅ أيوه', S.yes, S.yes + S.no, 'ok')}${bar('🔧 لأ — فيه مشكلة', S.no, S.yes + S.no, 'bad')}</div>`;
    // 📣 عرفنا منين
    h += `<div class="ast-card"><h3>📣 عرفونا منين؟</h3>
      ${S.heardAsked ? `${bar('📱 السوشيال ميديا', social, S.heardAsked, '', 'grp')}
        ${S.heard.filter(x => x.social).map(x => bar(x.l, x.c, S.heardAsked, '', 'in')).join('')}
        ${S.heard.filter(x => !x.social).map(x => bar(x.l, x.c, S.heardAsked)).join('')}` : '<div class="ast-empty">لسه محدش اتسأل السؤال ده في الفترة دي.</div>'}
      ${noHeard > 0 ? `<div class="ast-note">ℹ️ ${num(noHeard)} مكالمة قبل ما السؤال يتزاد — مش محسوبين هنا.</div>` : ''}</div>`;
    // 😕 اشتكى من
    h += `<div class="ast-card"><h3>😕 اشتكوا من إيه؟</h3>
      ${S.tags.length ? `<div class="sub">${num(S.tagged)} عميل اشتكى من حاجة من ${num(S.done.length)} — العميل ممكن يختار أكتر من حاجة</div>
        ${S.tags.map(t => bar(_esc(t.l), t.c, S.done.length, 'bad')).join('')}` : '<div class="ast-empty">✅ محدش اشتكى من حاجة.</div>'}</div>`;
    h += `</div>`;

    // 🔧 لكل فني
    h += `<div class="ast-card"><h3>🔧 لكل فني</h3>
      <div style="overflow-x:auto;"><table class="ast-tbl"><thead><tr><th>الفني</th><th>ردّوا</th><th>متوسط ⭐</th><th>فيه مشكلة</th><th>شكاوى</th></tr></thead><tbody>
      ${S.techs.map(t => `<tr><td>${_esc(t.name)}</td><td>${num(t.n)}</td>
        <td>${t.rated ? (t.sum / t.rated).toLocaleString('ar-EG', { maximumFractionDigits:1 }) : '—'}</td>
        <td class="${t.no ? 'bad' : ''}">${num(t.no)}</td><td class="${t.bad ? 'bad' : ''}">${num(t.bad)}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="ast-note">الفني المكتوب على الجهاز وقت المكالمة.</div></div>`;

    // 📞 لكل موظف كول سنتر
    h += `<div class="ast-card"><h3>📞 لكل موظف كول سنتر</h3>
      <table class="ast-tbl"><thead><tr><th>الموظف</th><th>اتسجّل رأيه</th><th>مردّش</th></tr></thead><tbody>
      ${S.agents.map(a => `<tr><td>${_esc(a.name)}</td><td>${num(a.done)}</td><td>${num(a.noans)}</td></tr>`).join('')}
      </tbody></table>
      <div class="ast-note">بالآخر اللي سجّل على الجهاز — لو مردّش وبعدين اتكلّم، بيتحسب «اتسجّل رأيه» للي كلّمه آخر مرة.</div></div>`;

    h += listHtml(S);
    body.innerHTML = h;
  }

  // ---------- فتح / قفل ----------
  async function open(){
    if(typeof isSuperAdmin === 'function' && !isSuperAdmin()) return;
    css();
    try{ const dd = document.getElementById('menuDropdown'); if(dd) dd.classList.add('hidden'); }catch(e){}
    let ov = document.getElementById('asStOv');
    if(!ov){
      ov = document.createElement('div');
      ov.id = 'asStOv';
      ov.innerHTML = `<div class="ast-head"><h2>📊 إحصائية ما بعد البيع</h2>
        <button onclick="AsStats.reload()" aria-label="تحديث" title="تحديث">🔄</button>
        <button onclick="AsStats.close()" aria-label="قفل">×</button></div>
        <div class="ast-body" id="asStBody"></div>`;
      document.body.appendChild(ov);
    }
    ov.classList.remove('hidden');
    try{ document.body.dataset.astOv = document.body.style.overflow || ''; document.body.style.overflow = 'hidden'; }catch(e){}
    LIST_N = 30;
    await reload();
  }
  async function reload(){
    ROWS = null; render();
    try{ await load(); render(); }
    catch(e){
      console.error('[ما بعد البيع] تحميل:', e);
      const b = document.getElementById('asStBody');
      if(b) b.innerHTML = periodBar() + `<div class="ast-card"><div class="ast-empty" style="color:var(--danger)">❌ ماعرفناش نجيب الردود: ${_esc((e && e.message) || e)}<br>جرّب 🔄 تاني.</div></div>`;
    }
  }
  function close(){
    const ov = document.getElementById('asStOv'); if(ov) ov.classList.add('hidden');
    try{ document.body.style.overflow = document.body.dataset.astOv || ''; delete document.body.dataset.astOv; }catch(e){}
  }

  window.AsStats = {
    // AsStats.open() → الصفحة · AsStats.open('id') → تفاصيل الجهاز ده (من الليستة)
    open(id){ if(!id) return open(); close(); try{ openDetail(id); }catch(e){ console.error(e); } },
    close, reload,
    per(k){ PERIOD = k; LIST_N = 30; render(); },
    pick(m, y){ if(m) PICK_M = Number(m); if(y) PICK_Y = Number(y); PERIOD = 'pick'; LIST_N = 30; render(); },
    lf(k){ LIST_F = k; LIST_N = 30; render(); },
    more(){ LIST_N += 30; render(); },
  };
  window.openAfterSaleStats = () => open();
})();
