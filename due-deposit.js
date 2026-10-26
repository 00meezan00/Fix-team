// ============================================================
// I Fix Team — ⏳ الميعاد مع العميل + 💵 العربون (إخباري)
// (due-deposit.js) — نسخة الإنتاج بس
// ------------------------------------------------------------
// 🧸 الملف ده فيه حاجتين بيستخدمهم المحاسب والديسباتشر والمالك:
//
// ١) ⏳ «الساعة الرملية» — زي الاستيدج بالظبط:
//    وقت التسجيل لازم تختار «اتفقت مع العميل على قد إيه؟»
//    (ساعة · ساعة ونص · ساعتين · آخر النهارده · بكره · يومين ·
//    ٣ أيام · أسبوع · ميعاد معيّن). الرملة بتبدأ من وقت التسجيل.
//    💡 وبيقترح مدة من الأجهزة اللي شبهه (نفس الماركة + نوع العطل)
//       — «النص» مش المتوسط، ولازم ٣ أجهزة على الأقل.
//    الخانات جوه الجهاز (نفس أسماء الاستيدج بالحرف عشان البيانات
//    تكمّل لما الاستيدج ينزل):
//      dueAt     الميعاد اللي اتفقنا عليه (ISO)
//      dueStart  الرملة اتقلبت إمتى (وقت التسجيل أو آخر ميعاد جديد)
//      dueLabel  الكلام اللي اتقال للعميل («ساعتين»)
//      dueLog    سجل كل اللي حصل (بيتزاد بس)
//
// ٢) 💵 العربون — **خانة إخبارية**:
//    🧸 «إخبارية» يعني: رقم مكتوب للعلم بس. مابيتحسبش فلوس خالص —
//       لا بيتخصم من السعر، ولا بيدخل الخزنة، ولا الحسابات.
//       فايدته إن اللي بيسلّم الجهاز يعرف إن العميل دفع منه كام قبل
//       كده. مثال: الحساب ٢٠٠٠ والعربون ١٠٠٠ → ياخد ١٠٠٠ من العميل،
//       ويسجّل إن حساب الجهاز ٢٠٠٠ اتدفعوا فوري.
//    الخانة: depositNote (نص فيه أرقام بس).
//    ⚠️ اسمها مختلف عن «deposit» بتاع الاستيدج عن قصد — العربون
//       بتاع الاستيدج بيتخصم من السعر، وده لأ. لو استخدمنا نفس
//       الاسم، الاستيدج لما ينزل كان هيخصم العربونات دي بالغلط.
//
// ⚠️ مؤقت: النسخة دي هتتشال لما الاستيدج ينزل الإنتاج.
// ⚠️ ملف مستقل بذاته — مابيعتمدش على أي متغير من الصفحة
//    (ألوانه وstyle بتاعه جوه، وبيعرف الوضع الليلي لوحده).
// ⚠️ السيرفر: الديسباتشر والمالك محتاجين ملف prod-due-deposit.sql.
// ============================================================
(function(){
  'use strict';

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // ---------- الإعدادات (نفس الاستيدج) ----------
  const MIN_SAMPLES = 3;
  const CHIPS = [
    { k:'1h',  label:'ساعة',          h:1 },
    { k:'90m', label:'ساعة ونص',      h:1.5 },
    { k:'2h',  label:'ساعتين',        h:2 },
    { k:'eod', label:'آخر النهارده',  at:'eod' },
    { k:'tmr', label:'بكره',          at:'tmr' },
    { k:'2d',  label:'يومين',         h:48 },
    { k:'3d',  label:'٣ أيام',        h:72 },
    { k:'1w',  label:'أسبوع',         h:168 },
  ];
  // الحالات اللي الرملة شغّالة فيها (حالات الإنتاج)
  const ACTIVE = ['waiting', 'diagnosing', 'repairing', 'returned'];
  // الورشة خلصت = الساعة وقفت
  const FINISH = ['done', 'rejected', 'delivered'];

  // ---------- الحسابات ----------
  function fromChip(k, fromMs){
    const c = CHIPS.find(x => x.k === k);
    if(!c) return null;
    const base = new Date(fromMs || Date.now());
    if(c.h) return new Date(base.getTime() + c.h * 3600000);
    const t = new Date(base);
    if(c.at === 'eod'){ t.setHours(22, 0, 0, 0); if(t.getTime() - base.getTime() < 3600000) return new Date(base.getTime() + 3600000); return t; }
    if(c.at === 'tmr'){ t.setDate(t.getDate() + 1); t.setHours(18, 0, 0, 0); return t; }
    return null;
  }
  function whenTxt(iso){
    const d = new Date(iso);
    if(isNaN(d)) return '';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    const diff = Math.round((day - today) / 86400000);
    const tm = d.toLocaleTimeString('ar-EG', { hour:'numeric', minute:'2-digit' });
    if(diff === 0) return 'النهارده ' + tm;
    if(diff === 1) return 'بكره ' + tm;
    if(diff === -1) return 'امبارح ' + tm;
    return d.toLocaleDateString('ar-EG', { weekday:'long', day:'numeric', month:'long' }) + ' ' + tm;
  }
  function durTxt(ms){
    const m = Math.max(0, Math.round(ms / 60000));
    if(m < 60) return m + ' د';
    const h = Math.floor(m / 60), r = m % 60;
    if(h < 48) return h + ' س' + (r ? ' و ' + r + ' د' : '');
    const dd = Math.floor(h / 24), hh = h % 24;
    return dd + ' يوم' + (hh ? ' و ' + hh + ' س' : '');
  }
  // آخر مرة الجهاز دخل المرتجعات — الميعاد القديم مالوش دعوة بالمرتجع
  function lastReturnAt(d){
    const h = (d && d.statusHistory) || [];
    for(let i = h.length - 1; i >= 0; i--) if(h[i] && h[i].status === 'returned' && h[i].date) return Date.parse(h[i].date);
    return 0;
  }
  function isActive(d){
    if(!d || !d.dueAt || !d.dueStart) return false;
    if(!ACTIVE.includes(d.status)) return false;
    if(d.status === 'returned' && Date.parse(d.dueStart) < lastReturnAt(d)) return false;
    return true;
  }
  // وضع الرملة دلوقتي
  function info(d){
    if(!isActive(d)) return null;
    const s = Date.parse(d.dueStart), e = Date.parse(d.dueAt), now = Date.now();
    if(!(e > s)) return null;
    const pct = (now - s) / (e - s);
    const color = pct >= 1 ? 'bad' : pct >= 0.5 ? 'warn' : 'ok';
    return { s, e, pct, left: e - now, color };
  }
  function leftTxt(i){ return i.left >= 0 ? 'باقي ' + durTxt(i.left) : 'متأخر ' + durTxt(-i.left); }
  // الورشة خلصت الجهاز إمتى (بعد ما الرملة اتقلبت)
  function finishedAt(d){
    const h = (d && d.statusHistory) || [];
    const from = Date.parse(d.dueStart || d.intakeDate) || 0;
    for(const x of h){
      if(!x || !x.date) continue;
      const t = Date.parse(x.date);
      if(t >= from && FINISH.includes(x.status)) return t;
    }
    return 0;
  }

  // ---------- 💡 اقتراح المدة ----------
  const ISSUE_GROUPS = [
    { k:'screen', name:'شاشة',   w:['شاش', 'تاتش', 'lcd', 'screen', 'oled', 'عرض'] },
    { k:'batt',   name:'بطارية', w:['بطار', 'battery', 'بيفصل'] },
    { k:'charge', name:'شحن',    w:['شحن', 'سوكت', 'شاحن', 'charg'] },
    { k:'soft',   name:'سوفت',   w:['سوفت', 'فلاش', 'تحديث', 'هنج', 'ريستارت', 'لوجو', 'soft', 'icloud', 'اكونت', 'حساب'] },
    { k:'water',  name:'مياه',   w:['مياه', 'مايه', 'ميه', 'وقع في', 'water'] },
    { k:'cam',    name:'كاميرا', w:['كامير', 'camera'] },
    { k:'audio',  name:'صوت',    w:['سماع', 'مايك', 'صوت', 'سبيكر', 'speaker', 'mic'] },
    { k:'back',   name:'ضهر',    w:['باغ', 'ضهر', 'ظهر', 'back', 'فريم', 'شاسيه'] },
    { k:'board',  name:'بوردة',  w:['بورد', 'ايسي', ' ic', 'شورت', 'board', 'مابيفتحش', 'ميت'] },
    { k:'btn',    name:'زراير',  w:['زرار', 'زراير', 'باور', 'فوليوم', 'بصم', 'face', 'فيس'] },
  ];
  function norm(s){
    return ' ' + String(s || '').toLowerCase()
      .replace(/[ً-ْ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي') + ' ';
  }
  function issueGroup(issue){
    const t = norm(issue);
    // الكلمة اللي بتبدأ بمسافة (« ic») لازم تبقى أول كلمة — عشان «ic» جوه كلمة تانية مايتحسبش
    return ISSUE_GROUPS.find(g => g.w.some(w => t.includes((w.startsWith(' ') ? ' ' : '') + norm(w).trim()))) || null;
  }
  function brand(type){ return norm(type).trim().split(/\s+/)[0] || ''; }
  // samples = أجهزة بالشكل الأصلي (deviceType, reportedIssue, intakeDate, statusHistory)
  function buildMap(samples){
    const map = {};
    const from = Date.now() - 180 * 86400000;
    (samples || []).forEach(d => {
      if(!d) return;
      const s = Date.parse(d.intakeDate);
      if(!(s >= from)) return;
      const h = d.statusHistory || [];
      const fin = h.find(x => x && x.date && FINISH.includes(x.status));
      if(!fin) return;
      const ms = Date.parse(fin.date) - s;
      if(!(ms > 0)) return;
      const g = issueGroup(d.reportedIssue);
      if(!g) return;
      const b = brand(d.deviceType);
      [b + '|' + g.k, '*|' + g.k].forEach(key => (map[key] = map[key] || []).push(ms));
    });
    Object.keys(map).forEach(k => map[k].sort((a, b) => a - b));
    return map;
  }
  function suggestFrom(map, type, issue){
    const g = issueGroup(issue);
    if(!g) return null;
    const b = brand(type);
    let list = map[b + '|' + g.k], scope = (type || '').trim();
    if(!list || list.length < MIN_SAMPLES){ list = map['*|' + g.k]; scope = 'كل الأنواع'; }
    if(!list || list.length < MIN_SAMPLES) return null;
    const med = list[Math.floor(list.length / 2)];
    const hrs = med / 3600000;
    const chip = hrs <= 1 ? '1h' : hrs <= 1.5 ? '90m' : hrs <= 2 ? '2h' : hrs <= 8 ? 'eod' : hrs <= 30 ? 'tmr' : hrs <= 48 ? '2d' : hrs <= 72 ? '3d' : '1w';
    return { med, n: list.length, group: g.name, scope, chip };
  }

  // ---------- 📝 اختيار المدة (في فورم التسجيل وفي «ميعاد جديد») ----------
  // opts: { host: id الخانة, getType(), getIssue(), getSamples(), getFromMs(),
  //         title (اختياري), fromWord (اختياري: «وقت الدخول» / «دلوقتي») }
  const pickers = {};
  function picker(name, opts){
    const p = {
      name, opts, chip: '', custom: '', _map: null, _mapAt: 0,
      fromMs(){ try{ return (opts.getFromMs && opts.getFromMs()) || Date.now(); }catch(e){ return Date.now(); } },
      at(){
        if(p.chip === 'custom'){
          const t = p.custom ? new Date(p.custom) : null;
          return t && !isNaN(t) ? t : null;
        }
        return p.chip ? fromChip(p.chip, p.fromMs()) : null;
      },
      suggest(){
        if(!opts.getSamples) return null;
        try{
          if(!p._map || Date.now() - p._mapAt > 10 * 60000){ p._map = buildMap(opts.getSamples()); p._mapAt = Date.now(); }
          return suggestFrom(p._map, opts.getType ? opts.getType() : '', opts.getIssue ? opts.getIssue() : '');
        }catch(e){ return null; }
      },
      reset(){ p.chip = ''; p.custom = ''; p.render(); },
      resultHtml(at){
        if(!at) return '';
        return at.getTime() > p.fromMs()
          ? `<div class="ifd-res">⏰ الميعاد: <b>${esc(whenTxt(at.toISOString()))}</b></div>`
          : `<div class="ifd-res ifd-bad-t">⚠️ الميعاد لازم يبقى بعد ${esc(opts.fromWord || 'وقت الدخول')}</div>`;
      },
      render(keepInput){
        const host = document.getElementById(opts.host);
        if(!host) return;
        const at = p.at();
        if(keepInput){
          const r = document.getElementById(opts.host + '_res');
          if(r) r.innerHTML = p.resultHtml(at);   // الخانة المفتوحة ماتترسمش تاني عشان الكتابة ماتضيعش
          return;
        }
        const sug = p.suggest();
        const N = JSON.stringify(name).replace(/"/g, '&quot;');
        const btn = c => `<button type="button" class="ifd-chip${p.chip === c.k ? ' on' : ''}" onclick="IFixDue._pick(${N},'${c.k}')">${c.label}</button>`;
        const sugHtml = sug ? `<div class="ifd-sug">💡 أجهزة ${esc(sug.group)} (${esc(sug.scope)}) بتخلص عادة في حوالي <b>${esc(durTxt(sug.med))}</b> <small>(من ${sug.n} جهاز)</small>
            ${p.chip !== sug.chip ? `<button type="button" class="ifd-chip" onclick="IFixDue._pick(${N},'${sug.chip}')">استخدم «${esc(CHIPS.find(c => c.k === sug.chip).label)}»</button>` : ''}</div>` : '';
        host.innerHTML = `<span class="ifd-lbl">${opts.title || '⏳ اتفقت مع العميل على قد إيه؟ <b class="ifd-req">*</b>'}</span>
          <div class="ifd-chips">${CHIPS.map(btn).join('')}
            <button type="button" class="ifd-chip${p.chip === 'custom' ? ' on' : ''}" onclick="IFixDue._custom(${N})">📅 ميعاد معيّن</button></div>
          ${p.chip === 'custom' ? `<input type="datetime-local" id="${esc(opts.host)}_custom" class="ifd-input" value="${esc(p.custom)}" onchange="IFixDue._customVal(${N}, this.value)" />` : ''}
          <div id="${esc(opts.host)}_res">${p.resultHtml(at)}</div>
          ${sugHtml}`;
      },
      // بيرجّع { fields } أو { err }
      fields(startIso, by, role){
        const at = p.at();
        if(!at) return { err: 'اختار المدة اللي اتفقت عليها مع العميل' };
        if(at.getTime() <= Date.parse(startIso)) return { err: 'الميعاد مع العميل لازم يبقى بعد ' + (opts.fromWord || 'وقت الدخول') };
        const c = CHIPS.find(x => x.k === p.chip);
        const label = c ? c.label : whenTxt(at.toISOString());
        const iso = at.toISOString();
        return { label, fields: {
          dueAt: iso, dueStart: startIso, dueLabel: label,
          dueLog: [{ kind: 'set', text: '⏳ اتفقنا مع العميل: ' + label + ' (لحد ' + whenTxt(iso) + ')',
                     at: new Date().toISOString(), by: by || '', role: role || '', dueAt: iso }],
        } };
      },
    };
    pickers[name] = p;
    return p;
  }
  function _pick(name, k){ const p = pickers[name]; if(!p) return; p.chip = k; p.render(); }
  function _custom(name){
    const p = pickers[name]; if(!p) return;
    p.chip = 'custom'; p.render();
    setTimeout(() => { const e = document.getElementById(p.opts.host + '_custom'); if(e) e.focus(); }, 50);
  }
  function _customVal(name, v){ const p = pickers[name]; if(!p) return; p.custom = v; p.chip = 'custom'; p.render(true); }

  // ---------- 🏷️ على الكارت ----------
  function cardChip(d){
    const i = info(d);
    if(!i) return '';
    return `<span class="ifd-tag ifd-${i.color}">⏳ ${esc(leftTxt(i))}</span>`;
  }
  // ---------- 📋 في التفاصيل ----------
  // actionsHtml: زراير إضافية من الصفحة (زي «✏️ ميعاد جديد»)
  function boxHtml(d, actionsHtml){
    if(!d || !d.dueAt) return '';
    const i = info(d);
    let sub = '';
    if(i){
      sub = `<div class="ifd-bar"><i class="ifd-${i.color}-bg" style="width:${Math.min(100, Math.max(3, Math.round(i.pct * 100)))}%;"></i></div>
             <div class="ifd-box-s ifd-${i.color}-t">${esc(leftTxt(i))}</div>`;
    } else if(FINISH.includes(d.status)){
      const fin = finishedAt(d);
      if(fin) sub = `<div class="ifd-box-s">${fin <= Date.parse(d.dueAt) ? '✅ خلص في ميعاده' : '⚠️ خلص متأخر ' + esc(durTxt(fin - Date.parse(d.dueAt)))}</div>`;
    }
    return `<div class="ifd-box ifd-${i ? i.color : 'none'}-b">
      <div class="ifd-box-h">⏳ الميعاد مع العميل: <b>${esc(whenTxt(d.dueAt))}</b>${d.dueLabel ? ` <small>(${esc(d.dueLabel)})</small>` : ''}</div>
      ${sub}${actionsHtml || ''}
    </div>`;
  }
  // سطر في السجل + ملاحظة — للتعديل بعد التسجيل
  function logAppend(d, kind, text, by, role, roleLabel, extra){
    const now = new Date().toISOString();
    return {
      dueLog: [...((d && d.dueLog) || []), Object.assign({ kind, text, at: now, by: by || '', role: role || '' }, extra || {})],
      activityNotes: [...((d && d.activityNotes) || []), { text, at: now, by: by || '', role: roleLabel || '' }],
    };
  }

  // ---------- 💵 العربون (إخباري) ----------
  const DEP_HINT = 'خانة إخبارية: رقم للعلم بس — مابيتحسبش فلوس، ولا بيتخصم من السعر، ولا بيدخل الخزنة. بيعرّف اللي بيسلّم الجهاز إن العميل دفع منه كام قبل كده.';
  // أرقام بس (عربي أو إنجليزي) → نص أرقام إنجليزي
  function depDigits(v){
    return String(v == null ? '' : v)
      .replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776))
      .replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
  }
  function depAmount(d){ const n = parseInt(depDigits(d && d.depositNote), 10); return n > 0 ? n : 0; }
  const fmt = n => Number(n).toLocaleString('en-US');
  function depChip(d){
    const n = depAmount(d);
    return n ? `<span class="ifd-tag ifd-dep">💵 عربون ${fmt(n)}</span>` : '';
  }
  // في التفاصيل · price = سعر الجهاز لو معروف (أو null)
  // في التفاصيل (الديسباتشر والمالك) — سطر بسيط من غير شرح
  function depBoxHtml(d, price, actionsHtml){
    const n = depAmount(d);
    return `<div class="ifd-box ifd-dep-b">
      <div class="ifd-box-h">💵 العربون <span class="ifd-info">إخباري</span>: <b>${n ? fmt(n) + ' ج.م' : '—'}</b></div>
      ${actionsHtml || ''}
    </div>`;
  }
  // خانة الإدخال في الفورم — id بيتحدد من الصفحة
  function depFieldHtml(id){
    return `<span class="ifd-lbl">💵 العربون (اختياري) <span class="ifd-info">إخباري</span></span>
      <input id="${esc(id)}" class="ifd-input" style="margin-top:0;" type="text" inputmode="numeric" autocomplete="off" maxlength="9"
             placeholder="مثلاً 1000 — سيبه فاضي لو مفيش" oninput="this.value=IFixDue.depDigits(this.value)" />
`;
  }

  // ---------- 🎨 الشكل (ألوانه جوه — مش معتمد على الصفحة) ----------
  function injectCss(){
    if(document.getElementById('ifdCss')) return;
    const st = document.createElement('style');
    st.id = 'ifdCss';
    st.textContent = `
      :root{ --ifd-ink:#1F2937; --ifd-muted:#6B7280; --ifd-line:#D6DAE0; --ifd-card:#FFFFFF;
        --ifd-acc:#2563EB; --ifd-acc-bg:#EFF6FF;
        --ifd-ok:#15803D; --ifd-ok-bg:#DCFCE7; --ifd-warn:#B45309; --ifd-warn-bg:#FEF3C7;
        --ifd-bad:#B91C1C; --ifd-bad-bg:#FEE2E2; --ifd-dep:#7C3AED; --ifd-dep-bg:#F3E8FF; }
      html[data-theme="dark"]{ --ifd-ink:#E5E7EB; --ifd-muted:#9CA3AF; --ifd-line:#374151; --ifd-card:#1F2937;
        --ifd-acc:#60A5FA; --ifd-acc-bg:#1E3A5F;
        --ifd-ok:#4ADE80; --ifd-ok-bg:#14532D; --ifd-warn:#FBBF24; --ifd-warn-bg:#4A3510;
        --ifd-bad:#F87171; --ifd-bad-bg:#4C1D1D; --ifd-dep:#C4B5FD; --ifd-dep-bg:#3B2766; }
      .ifd-lbl{display:block; font-size:12.5px; font-weight:700; color:var(--ifd-muted); margin-bottom:6px;}
      .ifd-req{color:var(--ifd-bad);}
      .ifd-chips{display:flex; flex-wrap:wrap; gap:6px;}
      .ifd-chip{border:1.5px solid var(--ifd-line); background:var(--ifd-card); color:var(--ifd-ink); border-radius:18px;
        padding:8px 12px; font:inherit; font-size:13px; font-weight:700; cursor:pointer;}
      .ifd-chip.on{background:var(--ifd-acc); border-color:var(--ifd-acc); color:#fff;}
      .ifd-input{width:100%; box-sizing:border-box; margin-top:8px; border:1px solid var(--ifd-line); border-radius:11px; padding:11px 12px;
        font:inherit; font-size:16px; background:var(--ifd-card); color:var(--ifd-ink);}
      .ifd-res{font-size:13.5px; margin:8px 0 2px; color:var(--ifd-ink);}
      .ifd-bad-t{color:var(--ifd-bad);}
      .ifd-sug{font-size:12.5px; margin-top:8px; padding:8px 10px; border-radius:9px;
        background:var(--ifd-acc-bg); color:var(--ifd-acc); line-height:1.8;}
      .ifd-sug .ifd-chip{padding:4px 10px; font-size:12px; margin-inline-start:4px;}
      .ifd-hint{font-size:11.5px; color:var(--ifd-muted); margin-top:5px; line-height:1.6;}
      .ifd-info{display:inline-block; font-size:10.5px; font-weight:800; padding:1px 7px; border-radius:8px;
        background:var(--ifd-dep-bg); color:var(--ifd-dep); vertical-align:middle;}
      .ifd-tag{display:inline-block; font-size:11.5px; font-weight:800; padding:3px 8px; border-radius:8px; margin:6px 4px 0 0;}
      .ifd-ok{background:var(--ifd-ok-bg); color:var(--ifd-ok);}
      .ifd-warn{background:var(--ifd-warn-bg); color:var(--ifd-warn);}
      .ifd-bad{background:var(--ifd-bad-bg); color:var(--ifd-bad);}
      .ifd-dep{background:var(--ifd-dep-bg); color:var(--ifd-dep);}
      .ifd-box{border:1.5px solid var(--ifd-line); border-radius:12px; padding:10px 12px; margin:0 0 12px;
        background:var(--ifd-card); color:var(--ifd-ink);}
      .ifd-ok-b{border-color:var(--ifd-ok);} .ifd-warn-b{border-color:var(--ifd-warn);}
      .ifd-bad-b{border-color:var(--ifd-bad);} .ifd-dep-b{border-color:var(--ifd-dep);}
      .ifd-box-h{font-size:13.5px; line-height:1.7;}
      .ifd-box-h small{color:var(--ifd-muted);}
      .ifd-box-s{font-size:12.5px; margin-top:4px; line-height:1.7;}
      .ifd-ok-t{color:var(--ifd-ok);} .ifd-warn-t{color:var(--ifd-warn);} .ifd-bad-t{color:var(--ifd-bad);}
      .ifd-bar{height:7px; border-radius:6px; background:var(--ifd-line); overflow:hidden; margin-top:8px;}
      .ifd-bar i{display:block; height:100%; border-radius:6px;}
      .ifd-ok-bg{background:var(--ifd-ok);} .ifd-warn-bg{background:var(--ifd-warn);} .ifd-bad-bg{background:var(--ifd-bad);}
      .ifd-btn{margin-top:8px; border:1.5px solid var(--ifd-line); background:var(--ifd-card); color:var(--ifd-ink);
        border-radius:9px; padding:7px 12px; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;}
    `;
    (document.head || document.documentElement).appendChild(st);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectCss); else injectCss();

  window.IFixDue = {
    CHIPS, ACTIVE, fromChip, whenTxt, durTxt, isActive, info, leftTxt, finishedAt,
    issueGroup, buildMap, suggestFrom, picker, cardChip, boxHtml, logAppend,
    depDigits, depAmount, depChip, depBoxHtml, depFieldHtml, DEP_HINT,
    _pick, _custom, _customVal,
  };
})();
