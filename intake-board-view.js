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
// 🔒 الحماية مش هنا: السيرفر (intake_board — ملف SQL رقم 113) هو اللي
//    بيبعت فلوس زميلك «فاضية» أصلاً. الشاشة دي مابتخبّيش حاجة.
//
// 📍 بيتحمّل من common.js في: dashboard · dispatch · owner
//    والزرار بيتحط في قايمة ⋮ لوحده — من غير ما نلمس الصفحات.
// ⚠️ ملف 113 مااتشغّلش؟ → الشاشة بتقول كده بوضوح بدل ما تفضل فاضية.
// ============================================================
(function(){
  if(window.IFixIntakeBoard) return;

  var S = { mode:'cm', ym:'', rows:null, loading:false, err:'', admin:null, seq:0 };

  function e(s){
    return (typeof esc === 'function') ? esc(s)
      : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
          return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
        });
  }
  function dark(){ return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function money(n){ return Math.round(Number(n) || 0).toLocaleString('en-US') + ' ج.م'; }
  function monthName(y, m){ return new Date(y, m, 1).toLocaleDateString('ar-EG', { month:'long' }); }

  // الفترة → [من، لحد] بساعة الموبايل (القاهرة)
  function range(){
    var n = new Date(), y = n.getFullYear(), m = n.getMonth();
    if(S.mode === 'today'){ var a = new Date(y, m, n.getDate()); return [a, new Date(y, m, n.getDate() + 1)]; }
    if(S.mode === 'pm') return [new Date(y, m - 1, 1), new Date(y, m, 1)];
    if(S.mode === 'ym' && /^\d{4}-\d{2}$/.test(S.ym)){
      var yy = +S.ym.slice(0, 4), mm = +S.ym.slice(5, 7) - 1;
      return [new Date(yy, mm, 1), new Date(yy, mm + 1, 1)];
    }
    return [new Date(y, m, 1), new Date(y, m + 1, 1)];   // الشهر الحالي
  }
  function periodLabel(){
    var n = new Date();
    if(S.mode === 'today') return 'النهارده';
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
      }
      var r = range();
      var res = await sb.rpc('intake_board', { p_from: r[0].toISOString(), p_to: r[1].toISOString() });
      // ⚠️ Supabase مبيرميش خطأ — بيرجّعه في .error
      if(res.error) throw res.error;
      if(my !== S.seq) return;
      S.rows = res.data || [];
    }catch(x){
      if(my !== S.seq) return;
      console.error('[ترتيب الاستلامات]', x);
      var msg = (x && x.message) ? x.message : String(x);
      S.err = /intake_board|schema cache|does not exist|PGRST202/i.test(msg)
        ? 'السيرفر لسه مايعرفش الميزة دي — شغّل ملف SQL رقم 113'
        : msg;
      S.rows = null;
    }
    S.loading = false; paint();
  }

  // ---------- الرسم ----------
  function medal(rank){ return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''; }

  function paint(){
    var sh = document.getElementById('ibvSheet'); if(!sh) return;
    var rows = S.rows || [];
    var me = rows.filter(function(r){ return r.is_me; })[0];

    function chip(m, l){ return '<button class="chip' + (S.mode === m ? ' on' : '') + '" onclick="IFixIntakeBoard.mode(\'' + m + '\')">' + l + '</button>'; }
    var n = new Date(), pm = new Date(n.getFullYear(), n.getMonth() - 1, 1);
    // 📅 المحاسب العام: أي شهر في أي سنة — كلام ظاهر والخانة الحقيقية شفافة فوقه
    //    (الأيفون كان بيرسم <input type=month> فاضي = مربع من غير كلام)
    var picker = S.admin
      ? '<label class="mpick' + (S.mode === 'ym' ? ' on' : '') + '">📅 ' + (S.mode === 'ym' ? e(periodLabel()) : 'اختار شهر')
        + '<input type="month" value="' + e(S.ym) + '" max="' + n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '"'
        + ' onchange="IFixIntakeBoard.ym(this.value)" aria-label="اختار أي شهر"></label>'
      : '';

    var meBox = '';
    if(me) meBox = '<div class="me"><div class="r">' + (medal(me.rank) || '#' + me.rank) + '</div>'
      + '<div style="flex:1;"><div class="mut" style="font-size:12px;font-weight:700;">ترتيبك ' + me.rank + ' من ' + rows.length
      + ' · ' + me.devices + ' جهاز اتسلّم</div><div class="m">💰 ' + money(me.amount) + '</div></div></div>';
    else if(S.rows && !S.admin) meBox = '<div class="sub">لسه مفيش أجهزة سجّلتها واتسلّمت في الفترة دي.</div>';

    var body;
    if(S.loading && !S.rows) body = '<div class="empty">لحظة…</div>';
    else if(S.err) body = '<div class="empty">⚠️ ' + e(S.err) + '</div>';
    else if(!rows.length) body = '<div class="empty">مفيش أجهزة اتسلّمت في الفترة دي</div>';
    else{
      var total = rows.reduce(function(s, r){ return s + (Number(r.amount) || 0); }, 0);
      var cnt = rows.reduce(function(s, r){ return s + (Number(r.devices) || 0); }, 0);
      body = '<table><tr><th style="text-align:start;">#</th><th style="text-align:start;">الاسم</th><th>أجهزة</th><th>💰 الفلوس</th></tr>'
        + rows.map(function(r){
            return '<tr style="' + (r.is_me ? 'background:rgba(252,104,24,' + (dark() ? '.14' : '.09') + ');' : '') + '">'
              + '<td class="mut" style="text-align:start;">' + (medal(r.rank) || r.rank) + '</td>'
              + '<td class="n">' + e(r.name) + (r.is_me ? ' <span class="mut" style="font-weight:600;">(إنت)</span>' : '') + '</td>'
              + '<td>' + e(r.devices) + '</td>'
              + '<td>' + (r.amount === null || r.amount === undefined ? '<span class="mut">🔒</span>' : '<span class="cash">' + money(r.amount) + '</span>') + '</td>'
              + '</tr>';
          }).join('')
        + (S.admin ? '<tr><td></td><td class="n">∑ الإجمالي</td><td style="font-weight:900;">' + cnt + '</td><td class="cash">' + money(total) + '</td></tr>' : '')
        + '</table>';
    }

    sh.innerHTML =
        '<div class="h"><b>📥 ترتيب الاستلامات</b>'
      +   '<button class="x" onclick="IFixIntakeBoard.reload()" title="تحديث">🔄</button>'
      +   '<button class="x" onclick="IFixIntakeBoard.close()" aria-label="قفل">✕</button></div>'
      + '<div class="wrap">'
      + '<div class="sub">بمجموع سعر الأجهزة اللي سجّلتها واتسلّمت — المرفوض مابيتحسبش.'
      +   (S.admin ? '' : ' فلوس زمايلك 🔒 — كل واحد بيشوف فلوسه بس.') + '</div>'
      + '<div class="chips">' + chip('today', 'النهارده') + chip('cm', 'الشهر الحالي') + chip('pm', 'الشهر السابق') + picker + '</div>'
      + '<div class="mut" style="font-size:12.5px;font-weight:800;margin:-4px 2px 10px;">📅 ' + e(periodLabel()) + '</div>'
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
      for(var i = 0; i < heads.length; i++){ if(/المحل/.test(heads[i].textContent)){ anchor = heads[i]; break; } }
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
    mode: function(m){ S.mode = m; load(); },
    ym:   function(v){ if(!v){ S.mode = 'cm'; } else { S.ym = v; S.mode = 'ym'; } load(); }
  };
})();
