// ============================================================
// 📥 intake-board-view.js — «ترتيب الاستلامات»
// ------------------------------------------------------------
// 🧸 بالبلدي: كل واحد بيسجّل أجهزة بيدخل الترتيب. الترتيب بمجموع
//    سعر الأجهزة اللي **اتسلّمت** — اللي فلوسه أكتر هو الأول.
//    • إنت بتشوف ترتيبك وعدد أجهزتك **وفلوسك**.
//    • زمايلك: ترتيبهم وعدد أجهزتهم بس — فلوسهم 🔒.
//    • المحاسب العام بيشوف فلوس الكل + الإجمالي، ويقدر يختار أي شهر
//      في أي سنة.
//
// 🔒 الحماية مش هنا: السيرفر (intake_board — ملف prod-intake-board.sql) هو اللي
//    بيبعت فلوس زميلك «فاضية» أصلاً. الشاشة دي مابتخبّيش حاجة.
//
// 📍 نسخة الإنتاج: بيتحمّل بـ<script> في dashboard · dispatch · owner
//    (منقول من الاستيدج ts/intake-board-view.ts بالحرف — اتشال بس «ورق» الأنواع)
//    والزرار بيتحط في قايمة ⋮ لوحده — من غير ما نلمس الصفحات.
// ⚠️ ملف 113 مااتشغّلش؟ → الشاشة بتقول كده بوضوح بدل ما تفضل فاضية.
//
// 🟦 (٢٠٢٦-١٠-٢١) بقى TypeScript (ts/intake-board-view.ts → intake-board-view.js)
//    🧸 نفس الكود بالحرف — اتزوّد بس «ورق» بيقول نوع كل حاجة.
//       المترجم بيشيل الورق ده والمتصفح بياخد نفس الـ js القديم.
// ============================================================
// 🏷️ الأنواع — بتختفي بعد الترجمة
/** صف واحد في الترتيب — من intake_board() (ملف 113) */

               

                                 

                               ﻿                           

                 

                       
                                                                 

                              

                           

              
                                    

                                             

 

               

                          

                      

;                                               

(function(){
  if(window.IFixIntakeBoard) return;

  // 🗓️ (v148) mode: 'day' (يوم من الشهر الحالي — S.day) · 'cm' · 'pm' · 'ym'
  var S              = { mode:'cm', ym:'', day:'', rows:null, loading:false, err:'', admin:null, sa:null, seq:0, at:null };
  function pad2(n){ return String(n).padStart(2, '0'); }
  function ymdOf(d){ return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function todayStr(){ return ymdOf(new Date()); }
  function dayLabel(v){
    if(v === todayStr()) return 'النهارده';
    var n = new Date(), y = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1);
    if(v === ymdOf(y)) return 'امبارح';
    var d = new Date(+v.slice(0, 4), +v.slice(5, 7) - 1, +v.slice(8, 10));
    return d.toLocaleDateString('ar-EG', { weekday:'long', day:'numeric', month:'long' });
  }

  function e(s         )         {
    return (typeof esc === 'function') ? esc(s)
      : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
          return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }                          )[c];
        });
  }
  function dark()          { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function money(n         )         { return Math.round(Number(n) || 0).toLocaleString('en-US') + ' ج.م'; }
  function monthName(y        , m        )         { return new Date(y, m, 1).toLocaleDateString('ar-EG', { month:'long' }); }

  // الفترة → [من، لحد] بساعة الموبايل (القاهرة)
  function range()         {
    var n = new Date(), y = n.getFullYear(), m = n.getMonth();
    if(S.mode === 'today'){ var a = new Date(y, m, n.getDate()); return [a, new Date(y, m, n.getDate() + 1)]; }
    if(S.mode === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(S.day)){
      var dy = +S.day.slice(0, 4), dm = +S.day.slice(5, 7) - 1, dd = +S.day.slice(8, 10);
      return [new Date(dy, dm, dd), new Date(dy, dm, dd + 1)];
    }
    if(S.mode === 'pm') return [new Date(y, m - 1, 1), new Date(y, m, 1)];
    if(S.mode === 'ym' && /^\d{4}-\d{2}$/.test(S.ym)){
      var yy = +S.ym.slice(0, 4), mm = +S.ym.slice(5, 7) - 1;
      return [new Date(yy, mm, 1), new Date(yy, mm + 1, 1)];
    }
    return [new Date(y, m, 1), new Date(y, m + 1, 1)];   // الشهر الحالي
  }
  function periodLabel()         {
    var n = new Date();
    if(S.mode === 'today') return 'النهارده';
    if(S.mode === 'day' && S.day) return dayLabel(S.day);
    if(S.mode === 'pm'){ var p = new Date(n.getFullYear(), n.getMonth() - 1, 1); return monthName(p.getFullYear(), p.getMonth()) + ' ' + p.getFullYear(); }
    if(S.mode === 'ym' && S.ym) return monthName(+S.ym.slice(0, 4), +S.ym.slice(5, 7) - 1) + ' ' + S.ym.slice(0, 4);
    return monthName(n.getFullYear(), n.getMonth()) + ' ' + n.getFullYear();
  }

  // ---------- الستايل ----------
  function css(){
    if(document.getElementById('ibvCss')) return;
    var st = document.createElement('style');
    st.id = 'ibvCss';
    st.textContent =
        // 📄 (٢٠٢٦-١٠-١٩) صفحة كاملة بدل الشيت اللي بيطلع من تحت
        '#ibvSheet{position:fixed;inset:0;z-index:9301;overflow-y:auto;-webkit-overflow-scrolling:touch;'
      +   'overscroll-behavior:contain;background:var(--paper,var(--bg,#fff));color:var(--ink,#111);'
      +   'font-family:Tajawal,system-ui,sans-serif;}'
      + '#ibvSheet .wrap{max-width:720px;margin:0 auto;padding:14px 16px calc(70px + env(safe-area-inset-bottom));}'
      // الرأس لازق فوق — وتحت نتش الأيفون (env(safe-area-inset-top))
      + '#ibvSheet .h{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;'
      +   'background:var(--chrome,#0C0C0E);color:var(--on-chrome,#F2F2F0);'
      +   'padding:calc(12px + env(safe-area-inset-top)) 16px 12px;box-shadow:0 4px 14px rgba(0,0,0,.18);}'
      + '#ibvSheet .h b{flex:1;font:900 17px/1.4 Cairo,sans-serif;}'
      + '#ibvSheet .h .x{background:rgba(242,242,240,.10);color:inherit;}'
      + '#ibvSheet .mpick{position:relative;display:inline-flex;align-items:center;gap:6px;border:1px dashed var(--line,var(--border,#ccc));'
      +   'border-radius:999px;padding:7px 14px;font:800 12.5px/1.3 inherit;color:var(--ink,#111);cursor:pointer;overflow:hidden;}'
      + '#ibvSheet .mpick.on{border-style:solid;border-color:var(--accent,#EE5B10);color:var(--ifx-ember-ink,#B8460A);}'
      // الخانة الحقيقية شفافة فوق الكلام — الدوسة بتفتح منتقي الشهر بتاع الموبايل
      + '#ibvSheet .mpick input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;font-size:16px;}'
      + '#ibvSheet .sub{color:var(--muted,#666);font-size:12px;line-height:1.8;margin-bottom:12px;}'
      + '#ibvSheet .x{border:none;background:var(--paper,var(--surface-2,#eee));color:var(--ink,#111);width:34px;height:34px;'
      +   'border-radius:10px;font-size:17px;cursor:pointer;}'
      + '#ibvSheet .chips{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center;}'
      + '#ibvSheet .chip{border:1px solid var(--line,var(--border,#ddd));background:transparent;color:var(--ink,#111);'
      +   'border-radius:999px;padding:7px 14px;font:800 12.5px/1.3 inherit;cursor:pointer;}'
      + '#ibvSheet .chip.on{background:var(--accent,#EE5B10);border-color:var(--accent,#EE5B10);color:var(--on-accent,#0C0C0E);}'
      + '#ibvSheet .me{border:1.5px solid var(--accent,#EE5B10);background:rgba(252,104,24,' + '.08);border-radius:14px;'
      +   'padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;gap:12px;}'
      + '#ibvSheet .me .r{font:900 26px/1 Cairo,sans-serif;color:var(--ifx-ember-ink,#B8460A);min-width:44px;text-align:center;}'
      + '#ibvSheet .me .m{font:900 19px/1.3 Cairo,sans-serif;}'
      + '#ibvSheet table{width:100%;border-collapse:collapse;font-size:13px;}'
      + '#ibvSheet th{color:var(--muted,#666);font-size:11.5px;padding:7px 6px;font-weight:800;}'
      + '#ibvSheet td{padding:10px 6px;border-top:1px solid var(--line,var(--border,#ddd));text-align:center;}'
      + '#ibvSheet td.n{text-align:start;font-weight:800;}'
      + '#ibvSheet .mut{color:var(--muted,#666);}'
      + '#ibvSheet .cash{font-weight:900;color:var(--ifx-ember-ink,#B8460A);white-space:nowrap;}'
      // 🎯 التارجت
      + '#ibvSheet .tbar{height:7px;border-radius:9px;background:var(--line,var(--border,#ddd));overflow:hidden;margin-top:4px;}'
      + '#ibvSheet .tbar i{display:block;height:100%;border-radius:9px;background:var(--accent,#EE5B10);}'
      + '#ibvSheet .tbar.done i{background:#16A34A;}'
      + '#ibvSheet .tpct{font-weight:900;white-space:nowrap;}'
      + '#ibvSheet .tset{border:1px dashed var(--line,var(--border,#ccc));background:transparent;color:var(--ink,#111);'
      +   'border-radius:8px;padding:3px 8px;font:800 11.5px/1.3 inherit;cursor:pointer;white-space:nowrap;}'
      + '#ibvSheet .tools{display:flex;gap:8px;flex-wrap:wrap;margin:-4px 0 12px;}'
      + '#ibvSheet .empty{text-align:center;color:var(--muted,#666);padding:26px 10px;font-size:13px;line-height:1.9;}';
    document.head.appendChild(st);
  }

  // ---------- السيرفر ----------
  async function load(){
    var my = ++S.seq;                      // لو داس على فترة تانية بسرعة، الرد القديم يتهمل
    S.loading = true; S.err = ''; paint();
    try{
      if(S.admin === null){
        try{ var a = await sb.rpc('is_super_admin'); S.admin = (a && a.data === true); }catch(x){ S.admin = false; }
        S.sa = S.admin;   // 🎯 المحاسب العام بس اللي بيكتب التارجت (المالك بيشوف بس)
        // 👑 (ملف 114) المالك بيشوف فلوس الكل زي المحاسب العام — والسيرفر هو اللي بيقرر فعلاً
        if(!S.admin && /(^|\/)owner(\.html)?$/i.test(location.pathname.replace(/\/$/, ''))) S.admin = true;
      }
      var r = range();
      var res = await sb.rpc('intake_board', { p_from: r[0].toISOString(), p_to: r[1].toISOString() });
      // ⚠️ Supabase مبيرميش خطأ — بيرجّعه في .error
      if(res.error) throw res.error;
      if(my !== S.seq) return;
      S.rows = res.data || [];
    }catch(x     ){
      if(my !== S.seq) return;
      console.error('[ترتيب الاستلامات]', x);
      var msg = (x && x.message) ? x.message : String(x);
      S.err = /intake_board|schema cache|does not exist|PGRST202/i.test(msg)
        ? 'السيرفر لسه مايعرفش الميزة دي — شغّل ملف prod-intake-board.sql'
        : msg;
      S.rows = null;
    }
    if(my === S.seq && !S.err) S.at = new Date();   // 🔄 آخر تحديث نجح
    S.loading = false; paint();
  }

  // ---------- الرسم ----------
  // ---------- 🎯 التارجت الشهري ----------
  //    بيظهر بس لما الفترة شهر — مش «النهارده»
  function isMonth()          { return S.mode !== 'today' && S.mode !== 'day'; }
  function curYm()         { var a = range()[0]; return a.getFullYear() + '-' + String(a.getMonth() + 1).padStart(2, '0'); }
  function pct(r     )         { var t = Number(r.target) || 0; return t > 0 ? Math.floor((Number(r.amount) || 0) * 100 / t) : 0; }
  function tbar(p        )         {
    return '<div class="tbar' + (p >= 100 ? ' done' : '') + '"><i style="width:' + Math.min(100, Math.max(0, p)) + '%;"></i></div>';
  }
  function hasT(r     )          { return r && r.target !== null && r.target !== undefined && Number(r.target) > 0; }

  // 🪪 (2/11) التارجت على الأكونت: key = pkey من السيرفر ('' = موظف جديد بالاسم)
  async function setTarget(key, name        , cur     ){
    if(!S.sa) return;
    var v = prompt('🎯 تارجت «' + name + '» لشهر ' + periodLabel() + ' (بالجنيه):\n'
      + 'سيبه فاضي أو 0 = شيل التارجت', cur ? String(Math.round(Number(cur))) : '');
    if(v === null) return;
    v = String(v).replace(/[٠-٩]/g, function(d){ return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); }).replace(/[^0-9.]/g, '');
    var n = v === '' ? 0 : Number(v);
    if(!isFinite(n) || n < 0){ alert('رقم غلط'); return; }
    var res = await sb.rpc('intake_target_set2', { p_key: key || '', p_name: name, p_ym: curYm(), p_target: n });
    // السيرفر لسه على القديم (prod-reg-identity.sql ما اتشغّلش)؟ → بالاسم زي زمان
    if(res.error && /intake_target_set2|schema cache|PGRST202/i.test(res.error.message || '')) res = await sb.rpc('intake_target_set', { p_name: name, p_ym: curYm(), p_target: n });
    if(res.error){
      var m = res.error.message || String(res.error);
      alert('⚠️ ما اتحفظش: ' + m + (/intake_target_set|schema cache|does not exist|PGRST202/i.test(m)
        ? '\n\nشغّل ملف prod-intake-targets.sql الأول.' : ''));
      return;
    }
    load();
  }
  async function addTarget(){
    if(!S.sa) return;
    var nm = prompt('اسم الموظف — زي ما بيتكتب في «اسم الموظف اللي بيسجّل الجهاز»:');
    if(nm === null || !String(nm).trim()) return;
    setTarget('', String(nm).trim(), null);
  }
  // 📋 نفس تارجتات الشهر اللي قبله
  async function copyPrev(){
    if(!S.sa) return;
    var a = range()[0], p0 = new Date(a.getFullYear(), a.getMonth() - 1, 1), p1 = new Date(a.getFullYear(), a.getMonth(), 1);
    var res = await sb.rpc('intake_board', { p_from: p0.toISOString(), p_to: p1.toISOString() });
    if(res.error){ alert('⚠️ ' + (res.error.message || res.error)); return; }
    var prev = (res.data || []).filter(hasT);
    if(!prev.length){ alert('الشهر اللي قبله مفيهوش تارجتات.'); return; }
    var idOf = function(r){ return r.pkey || ('n:' + String(r.name).trim().toLowerCase()); };
    var have = {}; (S.rows || []).filter(hasT).forEach(function(r){ have[idOf(r)] = 1; });
    var todo = prev.filter(function(r){ return !have[idOf(r)]; });
    if(!todo.length){ alert('كل اللي كان عليهم تارجت الشهر اللي فات عليهم تارجت دلوقتي.'); return; }
    if(!confirm('هنحط لـ ' + todo.length + ' موظف نفس تارجت الشهر اللي فات:\n\n'
      + todo.map(function(r){ return '• ' + r.name + ': ' + money(r.target); }).join('\n')
      + '\n\n(اللي عليهم تارجت الشهر ده مش هيتغيّروا)')) return;
    for(var i = 0; i < todo.length; i++){
      var w = todo[i].pkey
        ? await sb.rpc('intake_target_set2', { p_key: todo[i].pkey, p_name: todo[i].name, p_ym: curYm(), p_target: Number(todo[i].target) })
        : await sb.rpc('intake_target_set', { p_name: todo[i].name, p_ym: curYm(), p_target: Number(todo[i].target) });
      if(w.error){ alert('⚠️ وقف عند «' + todo[i].name + '»: ' + (w.error.message || w.error)); break; }
    }
    load();
  }

  function tCell(r     )         {
    // نهرّب لـ JS الأول وبعدين لـ HTML — عشان اسم فيه ' مايكسرش الزرار
    var js = function(x){ return e(String(x == null ? '' : x).replace(/\\/g, '\\\\').replace(/'/g, "\\'")); };
    var args = '\'' + js(r.pkey || '') + '\',\'' + js(r.name) + '\',';
    var edit = S.sa ? ' <button class="tset" onclick="IFixIntakeBoard.setTarget(' + args + (hasT(r) ? Number(r.target) : 0) + ')">✎</button>' : '';
    if(!hasT(r)) return S.sa ? '<button class="tset" onclick="IFixIntakeBoard.setTarget(' + args + '0)">＋ تارجت</button>' : '<span class="mut">—</span>';
    if(r.amount === null || r.amount === undefined) return '<span class="mut">🔒</span>';
    var p = pct(r);
    return '<div class="tpct"' + (p >= 100 ? ' style="color:#16A34A;"' : '') + '>' + p + '٪' + edit + '</div>'
      + '<div class="mut" style="font-size:11px;">من ' + money(r.target) + '</div>' + tbar(p);
  }

  function medal(rank        )         { return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''; }

  function paint(){
    var sh = document.getElementById('ibvSheet'); if(!sh) return;
    var rows = S.rows || [];
    var me = rows.filter(function(r){ return r.is_me; })[0];
    // 🔓 بيشوف فلوس الكل؟ — بنصدّق السيرفر: لو بعت فلوس حد غيري يبقى أيوه
    var seeAll = rows.some(function(r){ return !r.is_me && r.amount !== null && r.amount !== undefined; })
              || (S.admin && !rows.some(function(r){ return !r.is_me; }));

    function chip(m        , l        ){ return '<button class="chip' + (S.mode === m ? ' on' : '') + '" onclick="IFixIntakeBoard.mode(\'' + m + '\')">' + l + '</button>'; }
    var n = new Date(), pm = new Date(n.getFullYear(), n.getMonth() - 1, 1);
    // 🗓️ (v148) أيام الشهر الحالي كلها (من ١ لحد النهارده) — الأحدث فوق.
    //    زي «اختار شهر»: كلام ظاهر والقايمة الحقيقية شفافة فوقه.
    var days = [];
    for(var di = n.getDate(); di >= 1; di--) days.push(ymdOf(new Date(n.getFullYear(), n.getMonth(), di)));
    var dayOn = S.mode === 'day';
    var dayPick = '<label class="mpick' + (dayOn ? ' on' : '') + '" style="border-style:solid;">🗓️ ' + (dayOn ? e(dayLabel(S.day)) : 'اختار يوم')
      + '<select onchange="IFixIntakeBoard.day(this.value)" aria-label="اختار يوم من الشهر الحالي" style="position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;font-size:16px;">'
      + '<option value=""' + (dayOn ? '' : ' selected') + ' disabled>اختار يوم</option>'
      + days.map(function(v){ return '<option value="' + v + '"' + (dayOn && S.day === v ? ' selected' : '') + '>' + e(dayLabel(v)) + '</option>'; }).join('')
      + '</select></label>';
    // 📅 المحاسب العام: أي شهر في أي سنة — كلام ظاهر والخانة الحقيقية شفافة فوقه
    //    (الأيفون كان بيرسم <input type=month> فاضي = مربع من غير كلام)
    var picker = (S.admin || seeAll)
      ? '<label class="mpick' + (S.mode === 'ym' ? ' on' : '') + '">📅 ' + (S.mode === 'ym' ? e(periodLabel()) : 'اختار شهر')
        + '<input type="month" value="' + e(S.ym) + '" max="' + n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '"'
        + ' onchange="IFixIntakeBoard.ym(this.value)" aria-label="اختار أي شهر"></label>'
      : '';

    var meBox = '';
    if(me) meBox = '<div class="me"><div class="r">' + (medal(me.rank) || '#' + me.rank) + '</div>'
      + '<div style="flex:1;"><div class="mut" style="font-size:12px;font-weight:700;">ترتيبك ' + me.rank + ' من ' + rows.length
      + ' · ' + me.devices + ' جهاز اتسلّم</div><div class="m">💰 ' + money(me.amount) + '</div>'
      + ((isMonth() && hasT(me))
          ? '<div style="margin-top:6px;font-size:12.5px;font-weight:800;">🎯 التارجت ' + money(me.target) + ' · '
            + (pct(me) >= 100
                ? '<span style="color:#16A34A;">🎉 وصلت ' + pct(me) + '٪ — عدّيت التارجت</span>'
                : 'وصلت <span class="tpct">' + pct(me) + '٪</span> — فاضلك ' + money(Number(me.target) - (Number(me.amount) || 0)))
            + '</div>' + tbar(pct(me))
          : '')
      + '</div></div>';
    else if(S.rows && !seeAll) meBox = '<div class="sub">لسه مفيش أجهزة سجّلتها واتسلّمت في الفترة دي.</div>';

    var body;
    if(S.loading && !S.rows) body = '<div class="empty">لحظة…</div>';
    else if(S.err) body = '<div class="empty">⚠️ ' + e(S.err) + '</div>';
    else if(!rows.length) body = '<div class="empty">مفيش أجهزة اتسلّمت في الفترة دي</div>';
    else{
      var total = rows.reduce(function(s, r){ return s + (Number(r.amount) || 0); }, 0);
      var cnt = rows.reduce(function(s, r){ return s + (Number(r.devices) || 0); }, 0);
      // 🎯 عمود التارجت: لو فيه تارجت ظاهر، أو المحاسب العام (عشان يكتب)
      var tCol = isMonth() && (S.sa || rows.some(hasT));
      body = '<table><tr><th style="text-align:start;">#</th><th style="text-align:start;">الاسم</th><th>أجهزة</th><th>💰 الفلوس</th>'
        + (tCol ? '<th>🎯 التارجت</th>' : '') + '</tr>'
        + rows.map(function(r){
            return '<tr style="' + (r.is_me ? 'background:rgba(252,104,24,' + (dark() ? '.14' : '.09') + ');' : '') + '">'
              + '<td class="mut" style="text-align:start;">' + (medal(r.rank) || r.rank) + '</td>'
              + '<td class="n">' + e(r.name) + (r.is_me ? ' <span class="mut" style="font-weight:600;">(إنت)</span>' : '') + '</td>'
              + '<td>' + e(r.devices) + '</td>'
              + '<td>' + (r.amount === null || r.amount === undefined ? '<span class="mut">🔒</span>' : '<span class="cash">' + money(r.amount) + '</span>') + '</td>'
              + (tCol ? '<td style="min-width:92px;">' + tCell(r) + '</td>' : '')
              + '</tr>';
          }).join('')
        + (seeAll ? '<tr><td></td><td class="n">∑ الإجمالي</td><td style="font-weight:900;">' + cnt + '</td><td class="cash">' + money(total) + '</td>'
            + (tCol ? '<td>' + (function(){
                var tt = rows.reduce(function(s, r){ return s + (hasT(r) ? Number(r.target) : 0); }, 0);
                var got = rows.reduce(function(s, r){ return s + (hasT(r) ? (Number(r.amount) || 0) : 0); }, 0);
                return tt ? '<div class="tpct">' + Math.floor(got * 100 / tt) + '٪</div><div class="mut" style="font-size:11px;">من ' + money(tt) + '</div>' : '';
              })() + '</td>' : '')
            + '</tr>' : '')
        + '</table>';
    }

    sh.innerHTML =
        '<div class="h"><b>📥 ترتيب الاستلامات</b>'
      // 🔄 (2/11) الزرار بيبيّن إنه شغّال: ⏳ وهو بيحمّل + «اتحدّث الساعة …» تحت
      //    (قبل كده لو الأرقام زي ما هي، الشاشة كانت بتترسم بنفس الشكل — كأنك مادستش)
      +   '<button class="x" onclick="IFixIntakeBoard.reload()" title="تحديث"' + (S.loading ? ' disabled style="opacity:.6;"' : '') + '>' + (S.loading ? '⏳' : '🔄') + '</button>'
      +   '<button class="x" onclick="IFixIntakeBoard.close()" aria-label="قفل">✕</button></div>'
      + '<div class="wrap">'
      + '<div class="sub">بمجموع سعر الأجهزة اللي سجّلتها واتسلّمت — المرفوض مابيتحسبش.'
      +   (seeAll ? '' : ' فلوس زمايلك 🔒 — كل واحد بيشوف فلوسه بس.') + '</div>'
      + '<div class="chips">' + dayPick + chip('cm', 'الشهر الحالي') + chip('pm', 'الشهر السابق') + picker + '</div>'
      + '<div class="mut" style="font-size:12.5px;font-weight:800;margin:-4px 2px 10px;">📅 ' + e(periodLabel())
      +   (S.loading ? ' · <span style="color:var(--accent,#EE5B10);">⏳ بيحدّث…</span>'
          : (S.at ? ' · 🔄 اتحدّث الساعة ' + e(S.at.toLocaleTimeString('ar-EG', { hour:'numeric', minute:'2-digit', second:'2-digit' })) : ''))
      + '</div>'
      + ((S.sa && isMonth())
          ? '<div class="tools"><button class="tset" onclick="IFixIntakeBoard.addTarget()">🎯 ＋ تارجت لموظف</button>'
            + '<button class="tset" onclick="IFixIntakeBoard.copyPrev()">📋 انسخ تارجت الشهر اللي قبله</button></div>'
          : '')
      + meBox + body
      + '</div>';
  }

  function open(){
    try{ if(typeof closeKebab === 'function') closeKebab(); }catch(x){}
    try{ var md = document.getElementById('menuDropdown'); if(md) md.classList.add('hidden'); }catch(x){}
    css();
    if(!document.getElementById('ibvSheet')){
      var sh = document.createElement('div'); sh.id = 'ibvSheet'; sh.setAttribute('dir', 'rtl');
      document.body.appendChild(sh);
    }
    // الصفحة اللي ورا ماتتحركش وإحنا فاتحين الصفحة دي
    try{ document.body.dataset.ibvOv = document.body.style.overflow || ''; document.body.style.overflow = 'hidden'; }catch(x){}
    paint();
    load();
  }
  function close(){
    var el = document.getElementById('ibvSheet'); if(el) el.remove();
    try{ document.body.style.overflow = document.body.dataset.ibvOv || ''; delete document.body.dataset.ibvOv; }catch(x){}
  }

  // ---------- الزرار في قايمة ⋮ ----------
  // dashboard → #menuDropdown (قبل «🔄 تحديث التطبيق»)
  // dispatch / owner → #kebabMenu (تحت «🏆 ترتيب الفنيين» أو جوه مجموعة «🏪 المحل»)
  function mount(){
    if(document.getElementById('ibvMenuBtn')) return;
    var menu = document.getElementById('kebabMenu') || document.getElementById('menuDropdown');
    if(!menu) return;
    var b = document.createElement('button');
    b.id = 'ibvMenuBtn';
    b.type = 'button';
    b.textContent = '📥 ترتيب الاستلامات';
    b.onclick = function(ev){ if(ev) ev.stopPropagation(); open(); };
    // ⚠️ من غير class عن قصد: زراير الداشبورد ليها أسامي زي money-menu-item
    //    بتخلّيها تستخبى عن الاستقبال — والزرار ده لكل اللي بيسجّل.
    var anchor = (menu.id === 'menuDropdown')
      ? menu.querySelector('.mh-shop')                          // الداشبورد: أول حاجة تحت «🏪 المحل»
      : (document.getElementById('tbvMenuBtn') || document.getElementById('sbOwnerBtn'));
    if(!anchor && menu.id === 'kebabMenu'){
      var heads = menu.querySelectorAll('.mh');
      for(var i = 0; i < heads.length; i++){ if(/المحل/.test(heads[i].textContent )){ anchor = heads[i]; break; } }
    }
    if(anchor && anchor.parentNode === menu){ menu.insertBefore(b, anchor.nextSibling); return; }
    var upd = document.getElementById('ifxUpdMenuBtn') || menu.querySelector('#ifxUpdSlot');
    if(upd && upd.parentNode === menu){ menu.insertBefore(b, upd); return; }
    var sep = menu.querySelector('.sep');
    if(sep) menu.insertBefore(b, sep); else menu.appendChild(b);
  }
  if(document.readyState === 'loading') addEventListener('DOMContentLoaded', mount); else mount();
  setTimeout(mount, 2500);   // احتياطي لو القايمة اتبنت متأخر

  document.addEventListener('keydown', function(ev){ if(ev.key === 'Escape') close(); });

  window.IFixIntakeBoard = {
    open: open, close: close, reload: load,
    setTarget: setTarget, addTarget: addTarget, copyPrev: copyPrev,
    mode: function(m){ S.mode = m; load(); },
    day:  function(v){ if(!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) return; S.day = v; S.mode = 'day'; load(); },
    ym:   function(v){ if(!v){ S.mode = 'cm'; } else { S.ym = v; S.mode = 'ym'; } load(); }
  };
})();
