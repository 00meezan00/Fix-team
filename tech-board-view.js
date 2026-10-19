// ============================================================
// 🏆 tech-board-view.js — «ترتيب الفنيين» في صفحة المالك
// ------------------------------------------------------------
// 🧸 بالبلدي: الداشبورد (المحاسب العام) بيحسب ترتيب الفنيين وبينشره
//    كل ٥ دقايق في درج اسمه «tech-board». الفني بيقراه من صفحته من
//    زمان. الملف ده بيخلّي المالك يقراه هو كمان — من غير ما نلمس
//    owner.html الكبيرة: common.js بيحمّله في صفحة المالك بس.
//
// ✅ بيعمل إيه؟
//    • بيحط زرار «🏆 ترتيب الفنيين» في قايمة ⋮ تحت «👥 الموظفين».
//    • الدوسة بتفتح شيت من تحت: النهارده · آخر ٣٠ يوم — النقاط ·
//      الأجهزة · متوسط المدة · المرتجعات.
//    • المالك صاحب المحل، فبيشوف **لقب كل فني** (🥇 المتصدر · الأخير…)
//      — مش لقبه هو بس زي الفني. وصفّه هو (لو بيشتغل فني) متعلّم.
//    • لو مفيش داشبورد فاتح من ٢٥ دقيقة → سطر «⏸️ التحديثات موقوفة».
//
// ⚠️ مفيش أي SQL: «tech-board» مفتوح للقراية لكل اللي داخل النظام
//    (app_data_key_readable — اتأكدنا بملف 111-check).
// ⚠️ الحساب نفسه **مش هنا** — هو في الداشبورد بس (techBoardFor).
//    منطق النقاط في مكان واحد = مستحيل يطلع رقمين مختلفين.
// ⚠️ الملف قايم بنفسه: ألوانه من متغيرات الصفحة وليها احتياطي،
//    ومابيعتمدش على أي دالة من owner.html غير MY_TECH (لو موجود).
// ============================================================
(function(){
  if(window.IFixTechBoard) return;

  var KEY = 'tech-board';
  var STALE_MS = 25 * 60 * 1000;   // نفس رقم صفحة الفني
  var S = { data:null, mode:'month', loading:false, err:'' };

  function e(s){
    return (typeof esc === 'function') ? esc(s)
      : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
          return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
        });
  }
  function dark(){ return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function myName(){
    try{ if(typeof MY_TECH !== 'undefined' && MY_TECH) return String(MY_TECH).trim(); }catch(x){}
    return '';
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
      + '#tbvSheet .chips{display:flex;gap:8px;margin-bottom:14px;}'
      + '#tbvSheet .chip{border:1px solid var(--line,#ddd);background:transparent;color:var(--ink,#111);'
      +   'border-radius:999px;padding:7px 15px;font:800 12.5px/1 inherit;cursor:pointer;}'
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
    var rows = (S.mode === 'today' ? d.today : d.d30) || [];
    var me = myName();
    var at = d.at;
    var stale = at && (Date.now() - new Date(at).getTime() > STALE_MS);

    function chip(m, l){ return '<button class="chip' + (S.mode === m ? ' on' : '') + '" onclick="IFixTechBoard.mode(\'' + m + '\')">' + l + '</button>'; }

    var body;
    if(S.loading && !S.data) body = '<div class="empty">لحظة…</div>';
    else if(S.err) body = '<div class="empty">⚠️ مقدرناش نجيب الترتيب<br><small>' + e(S.err) + '</small></div>';
    else if(!rows.length) body = '<div class="empty">لسه مفيش ترتيب في الفترة دي<br><small>بيظهر أول ما المحاسب العام يفتح النظام</small></div>';
    else body =
        '<div style="overflow-x:auto;"><table>'
      + '<tr><th style="text-align:start;">#</th><th style="text-align:start;">الفني</th><th>⭐ النقاط</th><th>أجهزة</th><th>متوسط المدة</th><th>مرتجع</th></tr>'
      + rows.map(function(r, i){
          var mine = me && r.t === me;
          return '<tr style="' + (mine ? 'background:rgba(252,104,24,' + (dark() ? '.14' : '.09') + ');' : '') + '">'
            + '<td class="mut" style="text-align:start;">' + (i + 1) + '</td>'
            + '<td class="n">' + e(r.t) + (mine ? ' <span class="mut" style="font-weight:600;">(إنت)</span>' : '') + badge(i, rows.length) + '</td>'
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
      + '<div class="chips">' + chip('today', 'النهارده') + chip('month', 'آخر ٣٠ يوم') + '</div>'
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

  // ---------- الزرار في قايمة ⋮ ----------
  // 📍 تحت «👥 الموظفين» (#sbOwnerBtn) في مجموعة «🏪 المحل».
  //    ولو الزرار ده مش موجود → بعد أول عنوان «المحل»، وإلا آخر القايمة قبل الخط.
  function mount(){
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
  if(document.readyState === 'loading') addEventListener('DOMContentLoaded', mount); else mount();
  setTimeout(mount, 2000);   // احتياطي لو القايمة اتبنت متأخر

  document.addEventListener('keydown', function(ev){ if(ev.key === 'Escape') close(); });

  window.IFixTechBoard = {
    open: open, close: close, reload: load,
    mode: function(m){ S.mode = m; paint(); }
  };
})();
