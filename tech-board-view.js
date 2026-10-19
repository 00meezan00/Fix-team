// ============================================================
// 🏆 tech-board-view.js — «ترتيب الفنيين» (المالك + الفني)
// ------------------------------------------------------------
// 🧸 بالبلدي: الداشبورد (المحاسب العام) بيحسب ترتيب الفنيين وبينشره
//    كل ٥ دقايق في درج اسمه «tech-board». الملف ده هو اللي بيعرضه —
//    نفس الشاشة في الصفحتين، فالشكل والفترات واحدين:
//      👑 owner.html      → زرار جديد في ⋮ تحت «👥 الموظفين»
//      🔧 my-devices.html → زرار «🏆 ترتيب الفنيين» القديم بيفتح الشاشة دي
//    common.js هو اللي بيحمّله في الصفحتين — من غير ما نلمسهم.
//
// 🗓️ الفترات (٢٠٢٦-١٠-١٩): النهارده · الشهر الحالي · الشهر السابق
//    (بدل «آخر ٣٠ يوم»). أسامي الشهور جاية جاهزة من الداشبورد
//    (cmLabel · pmLabel) عشان تطابق الأرقام اللي اتحسبت.
//
// 🏷️ الألقاب (🥇 المتصدر … الأخير):
//    • المالك صاحب المحل → بيشوف لقب **كل** فني.
//    • الفني → بيشوف لقبه **هو بس** — اللقب حافز شخصي، ولو الكل شايف
//      مين «الأخير» بيتحوّل لإحراج قدام الزمايل.
//
// ⚠️ مفيش أي SQL: «tech-board» مفتوح للقراية لكل اللي داخل النظام
//    (app_data_key_readable — اتأكدنا بملف 111-check).
// ⚠️ الحساب نفسه **مش هنا** — هو في الداشبورد بس (techBoardFor).
//    منطق النقاط في مكان واحد = مستحيل يطلع رقمين مختلفين.
// ⚠️ الداشبورد لسه ماتحدّثش؟ (الدرج فيه today + d30 بس) → «الشهر
//    الحالي» بيقول «لسه» بدل ما يطلع رقم غلط.
// ============================================================
(function(){
  if(window.IFixTechBoard) return;

  var KEY = 'tech-board';
  var STALE_MS = 25 * 60 * 1000;   // نفس رقم صفحة الفني القديم
  var PAGE = (location.pathname.split('/').pop() || '').toLowerCase().replace(/\.html$/,'');
  var IS_OWNER = PAGE === 'owner';
  var S = { data:null, mode:'cm', loading:false, err:'' };

  function e(s){
    return (typeof esc === 'function') ? esc(s)
      : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
          return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
        });
  }
  function dark(){ return document.documentElement.getAttribute('data-theme') === 'dark'; }
  // اسمي كفني: المالك = MY_TECH · الفني = ME (متغيّرات صفحاتهم)
  function myName(){
    try{ if(typeof MY_TECH !== 'undefined' && MY_TECH) return String(MY_TECH).trim(); }catch(x){}
    try{ if(typeof ME !== 'undefined' && ME) return String(ME).trim(); }catch(x){}
    return '';
  }
  // اسم الشهر — من الداشبورد لو موجود، وإلا من ساعة الموبايل
  function monthName(off){
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth() + off, 1).toLocaleDateString('ar-EG', { month:'long' });
  }

  // ---------- الستايل (مرة واحدة) ----------
  function css(){
    if(document.getElementById('tbvCss')) return;
    var st = document.createElement('style');
    st.id = 'tbvCss';
    st.textContent =
        '#tbvBg{position:fixed;inset:0;z-index:9300;background:rgba(8,10,14,.55);}'
      + '#tbvSheet{position:fixed;left:0;right:0;bottom:0;z-index:9301;max-height:88vh;overflow-y:auto;'
      +   'background:var(--card,#fff);color:var(--ink,#111);border-radius:20px 20px 0 0;'
      +   'padding:16px 16px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.3);'
      +   'font-family:Tajawal,system-ui,sans-serif;}'
      + '#tbvSheet .h{display:flex;align-items:center;gap:10px;margin-bottom:12px;}'
      + '#tbvSheet .h b{flex:1;font:900 16px/1.4 Cairo,sans-serif;}'
      + '#tbvSheet .x{border:none;background:var(--paper,#eee);color:var(--ink,#111);width:34px;height:34px;'
      +   'border-radius:10px;font-size:17px;cursor:pointer;}'
      + '#tbvSheet .chips{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;}'
      + '#tbvSheet .chip{border:1px solid var(--line,#ddd);background:transparent;color:var(--ink,#111);'
      +   'border-radius:999px;padding:7px 14px;font:800 12.5px/1.3 inherit;cursor:pointer;}'
      + '#tbvSheet .chip small{display:block;font-size:10.5px;font-weight:600;opacity:.75;}'
      + '#tbvSheet .chip.on{background:var(--accent,#EE5B10);border-color:var(--accent,#EE5B10);color:var(--on-accent,#0C0C0E);}'
      + '#tbvSheet table{width:100%;border-collapse:collapse;font-size:12.5px;}'
      + '#tbvSheet th{color:var(--muted,#666);font-size:11.5px;padding:7px 6px;font-weight:800;}'
      + '#tbvSheet td{padding:9px 6px;border-top:1px solid var(--line,#ddd);text-align:center;}'
      + '#tbvSheet td.n{text-align:start;font-weight:800;}'
      + '#tbvSheet .pts{font-weight:900;color:var(--ifx-ember-ink,#B8460A);}'
      + '#tbvSheet .mut{color:var(--muted,#666);}'
      + '#tbvSheet .badge{display:inline-block;margin-inline-start:6px;font-size:10.5px;font-weight:900;'
      +   'border-radius:6px;padding:2px 7px;line-height:1.6;border:1px solid;white-space:nowrap;}'
      + '#tbvSheet .stale{background:rgba(180,83,9,.12);border:1px solid rgba(180,83,9,.45);color:#B45309;'
      +   'border-radius:10px;padding:10px 12px;font-size:12px;font-weight:800;line-height:1.75;margin-bottom:12px;}'
      + '#tbvSheet .empty{text-align:center;color:var(--muted,#666);padding:26px 10px;font-size:13px;line-height:1.9;}'
      + '#tbvSheet .foot{color:var(--muted,#666);font-size:11px;margin-top:12px;text-align:center;}';
    document.head.appendChild(st);
  }

  // ---------- اللقب (نفس ألوان صفحة الفني — بتتغيّر مع الثيم) ----------
  function rank(i, total){
    var r = i + 1, D = dark();
    function mk(txt, dk, lt, rgb){
      return { txt:txt, col: D ? dk : lt,
               bg: 'rgba(' + rgb + ',' + (D ? '.20' : '.16') + ')',
               bd: 'rgba(' + rgb + ',' + (D ? '.60' : '.42') + ')' };
    }
    if(r === 1) return mk('🥇 المتصدر', '#FBBF24', '#8A4A05', '217,119,6');
    if(r === 2) return mk('🥈 التاني',   '#CBD5E1', '#475569', '148,163,184');
    if(r === 3) return mk('🥉 التالت',   '#FDBA74', '#92400E', '234,138,60');
    if(r > 3 && r === total)     return mk('الأخير',     '#FCA5A5', '#A81B1B', '220,38,38');
    if(r > 3 && r === total - 1) return mk('قبل الأخير', '#FDBA74', '#9A3A08', '234,88,12');
    return mk('الترتيب ' + r, '#93C5FD', '#1D4ED8', '37,99,235');
  }
  function badge(i, total){
    var b = rank(i, total);
    return '<span class="badge" style="color:' + b.col + ';background:' + b.bg + ';border-color:' + b.bd + ';">' + b.txt + '</span>';
  }
  function avgTxt(v){
    if(v === null || v === undefined || v === '') return '—';
    v = Number(v);
    return v < 1 ? 'أقل من يوم' : v.toFixed(1) + ' يوم';
  }

  // ---------- القراية من السيرفر ----------
  async function load(){
    S.loading = true; S.err = ''; paint();
    try{
      var res = await sb.from('app_data').select('value').eq('key', KEY).maybeSingle();
      // ⚠️ Supabase مبيرميش خطأ — بيرجّعه في .error
      if(res.error) throw res.error;
      S.data = (res.data && res.data.value) ? JSON.parse(res.data.value) : null;
    }catch(x){
      console.error('[ترتيب الفنيين] فشل القراية:', x);
      S.err = (x && x.message) ? x.message : String(x);
    }
    S.loading = false; paint();
  }

  // ---------- الرسم ----------
  function paint(){
    var sh = document.getElementById('tbvSheet'); if(!sh) return;
    var d = S.data || {};
    var cmL = d.cmLabel || monthName(0), pmL = d.pmLabel || monthName(-1);
    var rows = (S.mode === 'today' ? d.today : S.mode === 'pm' ? d.pm : d.cm);
    // الداشبورد لسه بالنسخة القديمة؟ (مفيش cm/pm في الدرج)
    var oldBoard = !!S.data && S.mode !== 'today' && !Array.isArray(rows);
    rows = rows || [];
    var me = myName();
    var at = d.at;
    var stale = at && (Date.now() - new Date(at).getTime() > STALE_MS);

    function chip(m, l, sub){
      return '<button class="chip' + (S.mode === m ? ' on' : '') + '" onclick="IFixTechBoard.mode(\'' + m + '\')">'
        + l + (sub ? '<small>' + e(sub) + '</small>' : '') + '</button>';
    }

    var body;
    if(S.loading && !S.data) body = '<div class="empty">لحظة…</div>';
    else if(S.err) body = '<div class="empty">⚠️ مقدرناش نجيب الترتيب<br><small>' + e(S.err) + '</small></div>';
    else if(oldBoard) body = '<div class="empty">⏳ الفترة دي لسه بتتجهّز<br><small>هتظهر أول ما المحاسب العام يفتح النظام بالتحديث الجديد</small></div>';
    else if(!rows.length) body = '<div class="empty">لسه مفيش ترتيب في الفترة دي<br><small>بيظهر أول ما المحاسب العام يفتح النظام</small></div>';
    else body =
        '<div style="overflow-x:auto;"><table>'
      + '<tr><th style="text-align:start;">#</th><th style="text-align:start;">الفني</th><th>⭐ النقاط</th><th>أجهزة</th><th>متوسط المدة</th><th>مرتجع</th></tr>'
      + rows.map(function(r, i){
          var mine = me && r.t === me;
          // 🏷️ المالك: لقب الكل · الفني: لقبه هو بس
          var showBadge = IS_OWNER || mine;
          return '<tr style="' + (mine ? 'background:rgba(252,104,24,' + (dark() ? '.14' : '.09') + ');' : '') + '">'
            + '<td class="mut" style="text-align:start;">' + (i + 1) + '</td>'
            + '<td class="n">' + e(r.t) + (mine ? ' <span class="mut" style="font-weight:600;">(إنت)</span>' : '') + (showBadge ? badge(i, rows.length) : '') + '</td>'
            + '<td class="pts">' + e(r.points) + '</td>'
            + '<td>' + e(r.count) + '</td>'
            + '<td class="mut">' + avgTxt(r.avg) + '</td>'
            + '<td>' + e(r.ret) + ' <span class="mut" style="font-size:11px;">(' + e(r.rate) + '%)</span></td>'
            + '</tr>';
        }).join('')
      + '</table></div>';

    sh.innerHTML =
        '<div class="h"><b>🏆 ترتيب الفنيين</b>'
      +   '<button class="x" onclick="IFixTechBoard.reload()" title="تحديث">🔄</button>'
      +   '<button class="x" onclick="IFixTechBoard.close()">✕</button></div>'
      + '<div class="chips">'
      +   chip('today', 'النهارده', '')
      +   chip('cm', 'الشهر الحالي', cmL)
      +   chip('pm', 'الشهر السابق', pmL)
      + '</div>'
      + (stale ? '<div class="stale">⏸️ التحديثات موقوفة لحين حضور المحاسبين<br><span style="font-weight:500;">الشغل متسجّل ومحفوظ — الترتيب هيتحدّث أول ما يفتحوا النظام</span></div>' : '')
      + body
      + (at ? '<div class="foot">آخر تحديث: ' + e(new Date(at).toLocaleString('ar-EG')) + '</div>' : '');
  }

  function open(){
    try{ if(typeof closeKebab === 'function') closeKebab(); }catch(x){}
    css();
    if(!document.getElementById('tbvSheet')){
      var bg = document.createElement('div'); bg.id = 'tbvBg'; bg.onclick = close;
      var sh = document.createElement('div'); sh.id = 'tbvSheet'; sh.setAttribute('dir', 'rtl');
      document.body.appendChild(bg); document.body.appendChild(sh);
    }
    paint();
    load();          // كل فتحة بتقرا من جديد — الترتيب بيتغيّر طول اليوم
  }
  function close(){
    ['tbvBg', 'tbvSheet'].forEach(function(id){ var el = document.getElementById(id); if(el) el.remove(); });
  }

  // ---------- 👑 المالك: زرار جديد في قايمة ⋮ ----------
  // 📍 تحت «👥 الموظفين» (#sbOwnerBtn) في مجموعة «🏪 المحل».
  function mountOwner(){
    if(document.getElementById('tbvMenuBtn')) return;
    var menu = document.getElementById('kebabMenu'); if(!menu) return;
    var b = document.createElement('button');
    b.id = 'tbvMenuBtn';
    b.type = 'button';
    b.textContent = '🏆 ترتيب الفنيين';
    b.onclick = open;
    var anchor = document.getElementById('sbOwnerBtn');
    if(!anchor){
      var heads = menu.querySelectorAll('.mh');
      for(var i = 0; i < heads.length; i++){ if(/المحل/.test(heads[i].textContent)){ anchor = heads[i]; break; } }
    }
    if(anchor && anchor.parentNode === menu) menu.insertBefore(b, anchor.nextSibling);
    else{
      var sep = menu.querySelector('.sep');
      if(sep) menu.insertBefore(b, sep); else menu.appendChild(b);
    }
  }

  // ---------- 🔧 الفني: الزرار القديم يفتح الشاشة الجديدة ----------
  // 🧸 my-devices.html فيها زرار «🏆 ترتيب الفنيين» بيندَه openTechBoard().
  //    بنحط نسختنا مكان الدالة القديمة — فنفس الزرار بيفتح الشاشة الجديدة
  //    بالتلات فترات، من غير ما نلمس الصفحة.
  // ⚠️ renderTechBoard كمان: refresh() في الصفحة بتندهها لو شاشتها القديمة
  //    مفتوحة. بقت مابتعملش حاجة غير إنها تحدّث شاشتنا لو مفتوحة.
  function mountTech(){
    window.openTechBoard = open;
    window.renderTechBoard = function(){ if(document.getElementById('tbvSheet')) load(); };
  }

  function mount(){ if(IS_OWNER) mountOwner(); else if(PAGE === 'my-devices') mountTech(); }
  if(document.readyState === 'loading') addEventListener('DOMContentLoaded', mount); else mount();
  setTimeout(mount, 2000);   // احتياطي لو القايمة اتبنت متأخر

  document.addEventListener('keydown', function(ev){ if(ev.key === 'Escape') close(); });

  window.IFixTechBoard = {
    open: open, close: close, reload: load,
    mode: function(m){ S.mode = m; paint(); }
  };
})();
