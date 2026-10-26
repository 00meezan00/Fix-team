/* ============================================================
   👥 staff-board.js — لوحة الموظفين الملوّنة (ملف مشترك)
   ------------------------------------------------------------
   🧠 بالبلدي:
      كل موظف ليه كارت بلون بيقول هو فين دلوقتي:
        🟢 أخضر   = حضر وشغّال (أو رجع من البريك)
        🟡 أصفر   = طالع بريك
        🟣 بنفسجي = انصرف
        🔵 أزرق   = نسي ينصرف (يوم الشغل اللي فات خلص ١٠ الصبح وهو ما انصرفش)
        🔴 أحمر   = مجاش خالص النهاردة
      وتحت اسمه سطر بمواعيد الوردية دي:
        🟢 حضور ١٠:٠٢ · ☕ بريك ٢:١٥ · ▶️ رجع ٢:٤٥ · 🟣 انصراف ٨:٠٠
      📅 يوم الشغل بيبدأ ١٠ الصبح وبيخلص ١٠ الصبح اللي بعده (قاعدة المحل).
         الساعة ١٠ الصبح الصفحة بتتفضّى، واللي لسه ما انصرفش بيبقى
         🔵 نسي ينصرف. الحساب كله في السيرفر (hr_staff_board).

   🔑 كل الحساب في السيرفر: دالة hr_staff_board (ملف 65).
      الصفحة دي بتعرض بس — مفيش ولا سطر بيكتب في أي جدول.

   📍 مين بيحمّله؟ common.js — لوحده، في صفحتين بس:
      • dashboard.html → بياخد زرار «👥 الموظفين» اللي موجود أصلاً
        (بيستبدل openStaff القديمة — شوف آخر الملف).
      • owner.html     → بيزوّد زرار «👥 الموظفين» في قايمة ⋮
      ⚠️ مفيش <script> ليه في أي صفحة. لو الملف ده مش مرفوع،
         الداشبورد بيفضل على اللوحة القديمة (أخضر/أحمر) من غير ما يقع.

   ⚠️ الملف ده مكتفي بنفسه عن قصد: ألوانه وستايله واللغة بتاعته
      جواه. مبيعتمدش على أي متغيّر في الصفحة غير sb (common.js).
      الاعتماد على حاجة من الداشبورد بيوقّعه في صفحة المالك في صمت.
   ============================================================ */
(function(){
  'use strict';

  // ألوان الحالات — الأسماء (cls) هي اللي الـCSS تحت بيلوّن بيها
  var ST = {
    in:     { t:'حاضر',    cls:'in'  },
    break:  { t:'في بريك', cls:'brk' },
    out:    { t:'انصرف',   cls:'out' },
    forgot: { t:'نسي ينصرف', cls:'fgt' },
    absent: { t:'مجاش',    cls:'abs' }
  };
  var KIND = {
    in:     { i:'🟢', t:'حضور'   },
    break:  { i:'☕', t:'بريك'   },
    resume: { i:'▶️', t:'رجع'    },
    out:    { i:'🟣', t:'انصراف' }
  };
  var ORDER = ['in', 'break', 'forgot', 'out', 'absent'];

  var rows = [], err = '', loading = false, loadedAt = null;
  var filter = 'all', q = '', timer = null, opts = {};
  var REFRESH_MS = 60000;   // دقيقة — كفاية للوحة حضور، ومش بتاكل نت

  // ---------- أدوات صغيرة (خاصة بالملف — مش من الصفحة) ----------
  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function $(id){ return document.getElementById(id); }

  // الساعة بتوقيت المحل — مش بتوقيت الموبايل اللي بيتفرّج
  function hm(iso){
    if(!iso) return '';
    try{
      return new Date(iso).toLocaleTimeString('ar-EG',
        { hour:'numeric', minute:'2-digit', timeZone:'Africa/Cairo' });
    }catch(e){ return ''; }
  }
  function minsSince(iso){
    var t = new Date(iso).getTime();
    return t ? Math.max(0, Math.floor((Date.now() - t) / 60000)) : 0;
  }
  // أرقام عربي — عشان تبقى زي المواعيد اللي جنبها في نفس السطر
  function ar(n){ try{ return Number(n).toLocaleString('ar-EG'); }catch(e){ return String(n); } }
  function durTxt(m){
    if(m < 60) return ar(m) + ' د';
    var h = Math.floor(m / 60), r = m % 60;
    return ar(h) + ' س' + (r ? ' و ' + ar(r) + ' د' : '');
  }
  function roleTxt(r){
    var map = {
      super_admin: opts.adminLabel || 'المحاسب العام',
      accountant:'محاسب', dispatcher:'مسؤول حركة', technician:'فني',
      hr:'شؤون العاملين', staff:'موظف', owner:'المالك', callcenter:'الكول سنتر'
    };
    return map[r] || r || '';
  }

  // ---------- الستايل ----------
  // ⚠️ كل الألوان متغيّرات جوه #sbOverlay — والوضع الداكن بيقلبها.
  //    الصفحتين بيحطوا data-theme على <html>، فبنقرا منه مباشرة.
  var CSS = ''
  + '#sbOverlay{--sb-bg:#F3F5F7;--sb-card:#FFFFFF;--sb-ink:#1A2332;--sb-muted:#64748B;--sb-line:#E2E8F0;'
  + '--sb-in:#16A34A;--sb-in-bg:#F0FDF4;--sb-brk:#A16207;--sb-brk-dot:#EAB308;--sb-brk-bg:#FEFCE8;'
  + '--sb-out:#7C3AED;--sb-out-bg:#F5F3FF;--sb-abs:#DC2626;--sb-abs-bg:#FEF2F2;'
  + '--sb-fgt:#2563EB;--sb-fgt-bg:#EFF6FF;'
  + 'position:fixed;inset:0;z-index:72;background:var(--sb-bg);color:var(--sb-ink);'
  + 'overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;display:none;'
  + 'font-family:"Tajawal","Segoe UI",sans-serif;}'
  + 'html[data-theme="dark"] #sbOverlay{--sb-bg:#131E29;--sb-card:#1B2A3A;--sb-ink:#E9EFF5;--sb-muted:#92A6B8;--sb-line:#2F4356;'
  + '--sb-in:#4ADE80;--sb-in-bg:rgba(74,222,128,.13);--sb-brk:#FACC15;--sb-brk-dot:#FACC15;--sb-brk-bg:rgba(250,204,21,.13);'
  + '--sb-out:#A78BFA;--sb-out-bg:rgba(167,139,250,.15);--sb-abs:#F87171;--sb-abs-bg:rgba(248,113,113,.14);'
  + '--sb-fgt:#60A5FA;--sb-fgt-bg:rgba(96,165,250,.14);}'
  + '#sbOverlay.on{display:block;}'
  + '#sbOverlay *{box-sizing:border-box;}'
  // ⚠️ env(safe-area-inset-top) = نتش الأيفون — من غيره زرار × بيستخبى تحت الساعة
  + '.sb-head{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:8px;'
  + 'padding:calc(14px + env(safe-area-inset-top)) 16px 12px;background:var(--sb-card);border-bottom:1px solid var(--sb-line);}'
  + '.sb-head h2{flex:1;min-width:0;margin:0;font-family:"Cairo",sans-serif;font-size:18px;font-weight:900;}'
  + '.sb-hbtn{flex:none;border:none;background:var(--sb-bg);color:var(--sb-ink);width:38px;height:38px;'
  + 'border-radius:10px;font-size:19px;line-height:1;cursor:pointer;}'
  + '.sb-hbtn:disabled{opacity:.5;}'
  + '.sb-body{padding:14px 16px 48px;}'
  // الكروت جوه شبكة: عمود واحد على الموبايل، وعلى الكمبيوتر بتتصف جنب بعض
  + '.sb-grid{display:grid;grid-template-columns:1fr;gap:9px;}'
  + '.sb-grid .sb-row{margin-bottom:0;}'
  + '.sb-pills{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:12px;}'
  + '.sb-pill{border:1.5px solid var(--sb-line);background:var(--sb-card);border-radius:12px;padding:10px 4px;'
  + 'text-align:center;cursor:pointer;font-family:inherit;color:var(--sb-ink);min-width:0;}'
  + '.sb-pill b{display:block;font-family:"Cairo",sans-serif;font-size:22px;font-weight:900;line-height:1.1;}'
  + '.sb-pill span{display:block;font-size:11px;font-weight:700;color:var(--sb-muted);line-height:1.35;}'
  + '.sb-pill.in b{color:var(--sb-in);}.sb-pill.brk b{color:var(--sb-brk);}'
  + '.sb-pill.out b{color:var(--sb-out);}.sb-pill.abs b{color:var(--sb-abs);}.sb-pill.fgt b{color:var(--sb-fgt);}'
  + '.sb-pill.sel.in{border-color:var(--sb-in);background:var(--sb-in-bg);}'
  + '.sb-pill.sel.brk{border-color:var(--sb-brk-dot);background:var(--sb-brk-bg);}'
  + '.sb-pill.sel.out{border-color:var(--sb-out);background:var(--sb-out-bg);}'
  + '.sb-pill.sel.abs{border-color:var(--sb-abs);background:var(--sb-abs-bg);}'
  + '.sb-pill.sel.fgt{border-color:var(--sb-fgt);background:var(--sb-fgt-bg);}'
  // ⚠️ ١٦px مقصودة: أقل من كده الأيفون بيكبّر الصفحة ومبيرجعش في وضع التطبيق
  + '.sb-search{width:100%;border:1px solid var(--sb-line);background:var(--sb-card);color:var(--sb-ink);'
  + 'border-radius:11px;padding:11px 13px;font-family:inherit;font-size:16px;margin-bottom:6px;}'
  + '.sb-upd{font-size:11.5px;color:var(--sb-muted);margin:2px 2px 12px;}'
  + '.sb-row{display:flex;gap:11px;align-items:flex-start;background:var(--sb-card);border:1px solid var(--sb-line);'
  + 'border-inline-start:5px solid var(--sb-c);border-radius:13px;padding:12px 13px;margin-bottom:9px;}'
  + '.sb-row.in{--sb-c:var(--sb-in);--sb-cb:var(--sb-in-bg);--sb-d:var(--sb-in);}'
  + '.sb-row.brk{--sb-c:var(--sb-brk-dot);--sb-cb:var(--sb-brk-bg);--sb-d:var(--sb-brk-dot);}'
  + '.sb-row.out{--sb-c:var(--sb-out);--sb-cb:var(--sb-out-bg);--sb-d:var(--sb-out);}'
  + '.sb-row.abs{--sb-c:var(--sb-abs);--sb-cb:var(--sb-abs-bg);--sb-d:var(--sb-abs);}'
  + '.sb-row.fgt{--sb-c:var(--sb-fgt);--sb-cb:var(--sb-fgt-bg);--sb-d:var(--sb-fgt);}'
  // اللمبة: دايرة + هالة بنفس اللون عشان تبان من بعيد
  + '.sb-dot{flex:none;width:14px;height:14px;border-radius:50%;margin-top:4px;background:var(--sb-d);'
  + 'box-shadow:0 0 0 4px var(--sb-cb);}'
  + '.sb-main{flex:1;min-width:0;}'
  + '.sb-top{display:flex;align-items:center;gap:8px;}'
  + '.sb-name{flex:1;min-width:0;font-weight:800;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
  + '.sb-tag{flex:none;font-size:12px;font-weight:800;border-radius:20px;padding:3px 10px;background:var(--sb-cb);color:var(--sb-c);}'
  + '.sb-row.brk .sb-tag{color:var(--sb-brk);}'
  + '.sb-meta{font-size:12px;color:var(--sb-muted);margin-top:3px;line-height:1.7;}'
  + '.sb-tl{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;}'
  + '.sb-p{font-size:12px;background:var(--sb-bg);border:1px solid var(--sb-line);border-radius:8px;padding:3px 8px;white-space:nowrap;}'
  + '.sb-p b{font-weight:800;}'
  + '.sb-empty{text-align:center;color:var(--sb-muted);padding:34px 10px;font-size:14px;line-height:2;}'
  + '.sb-err{background:var(--sb-abs-bg);color:var(--sb-abs);border-radius:12px;padding:14px;font-size:13.5px;line-height:1.9;}'
  + '.sb-err code{font-size:11.5px;word-break:break-all;}'
  // ============================================================
  // 🖥️ الكمبيوتر والتابلت العريض
  // ------------------------------------------------------------
  // ⚠️ كان فيه max-width:760px على الصفحة كلها، فعلى الكمبيوتر
  //    اللوحة كانت عمود ضيق في النص بمقاس الموبايل. دلوقتي الصفحة
  //    بتاخد العرض كله، والكروت بتتصف أعمدة على قد ما الشاشة تشيل.
  //    تحت ٩٠٠px مفيش أي تغيير — الموبايل زي ما هو بالظبط.
  // ============================================================
  + '@media (min-width:900px){'
  +   '.sb-head{padding-inline:28px;}'
  +   '.sb-head h2{font-size:21px;}'
  +   '.sb-body{padding:20px 28px 60px;}'
  +   '.sb-pills{gap:12px;margin-bottom:16px;}'
  +   '.sb-pill{padding:14px 8px;border-radius:14px;}'
  +   '.sb-pill b{font-size:30px;}'
  +   '.sb-pill span{font-size:13px;}'
  +   '.sb-search{max-width:480px;}'
  +   '.sb-grid{grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px;}'
  +   '.sb-row{padding:14px 15px;}'
  + '}';

  function injectCss(){
    if($('sbCss')) return;
    var st = document.createElement('style');
    st.id = 'sbCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // الهيكل الثابت بيتبني مرة واحدة — عشان خانة البحث متتمسحش وإنت بتكتب
  function ensureRoot(){
    var el = $('sbOverlay');
    if(el) return el;
    el = document.createElement('div');
    el.id = 'sbOverlay';
    el.innerHTML =
        '<div class="sb-head">'
      +   '<h2>👥 الموظفين</h2>'
      +   '<button class="sb-hbtn" id="sbRef" title="تحديث" onclick="StaffBoard.refresh()">↻</button>'
      +   '<button class="sb-hbtn" title="قفل" onclick="StaffBoard.close()">×</button>'
      + '</div>'
      + '<div class="sb-body">'
      +   '<div id="sbPills"></div>'
      +   '<input id="sbQ" class="sb-search" type="search" autocomplete="off" placeholder="🔍 دوّر باسم الموظف…">'
      +   '<div id="sbUpd" class="sb-upd"></div>'
      +   '<div id="sbList"><div class="sb-empty">⏳ جاري التحميل…</div></div>'
      + '</div>';
    document.body.appendChild(el);
    $('sbQ').addEventListener('input', function(){ q = this.value; renderList(); });
    return el;
  }

  // ---------- التحميل ----------
  async function load(){
    if(loading) return;
    loading = true;
    var b = $('sbRef'); if(b) b.disabled = true;
    try{
      if(typeof sb === 'undefined') throw new Error('الاتصال بالسيرفر مش جاهز (common.js)');
      var res = await sb.rpc('hr_staff_board');
      // ⚠️ Supabase مبيرميش خطأ — بيرجّعه في .error. لو بلعناه، الشاشة
      //    هتطلع فاضية والمحاسب يفتكر إن مفيش موظفين.
      if(res.error) throw res.error;
      rows = Array.isArray(res.data) ? res.data : [];
      err = '';
      loadedAt = new Date();
    }catch(e){
      console.error('hr_staff_board failed:', e);
      err = (e && e.message) ? e.message : String(e);
      // ⚠️ مبنمسحش rows: لو التحديث التلقائي فشل لحظة (نت)، الأحسن نفضل
      //    نوري آخر حاجة سليمة مع رسالة، مش نمسح الشاشة كلها.
    }finally{
      loading = false;
      if(b) b.disabled = false;
      render();
    }
  }

  // ---------- الرسم ----------
  function render(){ renderPills(); renderList(); }

  function counts(){
    var c = { in:0, break:0, out:0, forgot:0, absent:0 };
    rows.forEach(function(r){ if(c[r.status] != null) c[r.status]++; });
    return c;
  }

  function renderPills(){
    var host = $('sbPills'); if(!host) return;
    var c = counts();
    host.innerHTML = '<div class="sb-pills">' + ORDER.map(function(k){
      var s = ST[k];
      return '<button class="sb-pill ' + s.cls + (filter === k ? ' sel' : '') + '"'
           + ' onclick="StaffBoard.filter(\'' + k + '\')">'
           + '<b>' + c[k] + '</b><span>' + s.t + '</span></button>';
    }).join('') + '</div>';
    var u = $('sbUpd');
    if(u) u.textContent = loadedAt
      ? '🕒 آخر تحديث ' + hm(loadedAt.toISOString()) + ' — بيتحدّث لوحده كل دقيقة'
        + (filter !== 'all' ? ' · دوس على نفس الرقم تاني عشان تشوف الكل' : '')
      : '';
  }

  // سطر المواعيد: 🟢 حضور ١٠:٠٢ · ☕ بريك ٢:١٥ · ▶️ رجع ٢:٤٥ · 🟣 انصراف ٨:٠٠
  function timelineHtml(r){
    var ps = Array.isArray(r.punches) ? r.punches : [];
    if(!ps.length) return '';
    return '<div class="sb-tl">' + ps.map(function(p){
      var k = KIND[p.kind] || { i:'•', t:p.kind };
      return '<span class="sb-p"' + (p.manual ? ' title="اتكتب بإيد شؤون العاملين"' : '') + '>'
           + k.i + ' ' + k.t + ' <b>' + esc(hm(p.at)) + '</b>' + (p.manual ? ' ✍️' : '') + '</span>';
    }).join('') + '</div>';
  }

  function metaTxt(r){
    var bits = [roleTxt(r.role)];
    if(r.status === 'in')     bits.push('شغّال من ' + hm(r.since));
    if(r.status === 'break')  bits.push('في بريك من ' + hm(r.since) + ' (' + durTxt(minsSince(r.since)) + ')');
    if(r.status === 'out')    bits.push('انصرف ' + hm(r.since));
    if(r.status === 'absent') bits.push(r.is_off ? '🏖️ النهاردة يوم إجازته' : 'لسه مسجّلش حضور النهاردة');
    if(r.status === 'forgot'){
      // ⚠️ مبنقولش «مجاش» — هو جه فعلاً في يوم الشغل اللي فات، واللي
      //    ناقص الانصراف بس. الـHR تقدر تكتبه يدوي من «✍️ تسجيل يدوي».
      bits.push('⚠️ الوردية اللي فاتت: آخر تسجيل ' + hm(r.since) + ' وما سجّلش انصراف');
      bits.push(r.is_off ? '🏖️ النهاردة يوم إجازته' : 'ولسه ماجاش النهاردة');
    }
    return bits.filter(Boolean).join(' · ');
  }

  function renderList(){
    var host = $('sbList'); if(!host) return;

    var errBox = err
      ? '<div class="sb-err">❌ مقدرناش نقرا حالة الموظفين'
        + (rows.length ? ' — اللي تحت آخر نسخة سليمة' : '') + '<br>'
        + '<code>' + esc(err) + '</code>'
        + (/hr_staff_board|does not exist|42883|PGRST202/i.test(err)
            ? '<br>📌 ملف <b>65-staff-board.sql</b> لسه ما اتشغّلش على المشروع ده.' : '')
        + '</div><br>'
      : '';

    var qq = (q || '').trim().toLowerCase();
    var list = rows.filter(function(r){
      if(filter !== 'all' && r.status !== filter) return false;
      if(!qq) return true;
      return (String(r.user_name || '') + ' ' + String(r.user_email || '')).toLowerCase().indexOf(qq) !== -1;
    });

    if(!list.length){
      host.innerHTML = errBox + (err && !rows.length ? '' :
        '<div class="sb-empty">' + (qq ? 'مفيش موظف بالاسم ده'
          : (filter !== 'all' ? 'مفيش حد «' + ST[filter].t + '» دلوقتي' : 'مفيش موظفين متسجّلين')) + '</div>');
      return;
    }

    host.innerHTML = errBox + '<div class="sb-grid">' + list.map(function(r){
      var s = ST[r.status] || ST.absent;
      return '<div class="sb-row ' + s.cls + '">'
        + '<span class="sb-dot"></span>'
        + '<div class="sb-main">'
        +   '<div class="sb-top"><span class="sb-name">' + esc(r.user_name || r.user_email || '—') + '</span>'
        +     '<span class="sb-tag">' + s.t + '</span></div>'
        +   '<div class="sb-meta">' + esc(metaTxt(r)) + '</div>'
        +   timelineHtml(r)
        + '</div></div>';
    }).join('') + '</div>';
  }

  // ---------- التحديث التلقائي ----------
  function isOpen(){ var el = $('sbOverlay'); return !!(el && el.classList.contains('on')); }
  function startTimer(){
    stopTimer();
    timer = setInterval(function(){ if(isOpen() && !document.hidden) load(); }, REFRESH_MS);
  }
  function stopTimer(){ if(timer){ clearInterval(timer); timer = null; } }
  // رجعت للتطبيق بعد ما قفلت الشاشة؟ نحدّث على طول بدل ما تستنى دقيقة
  document.addEventListener('visibilitychange', function(){ if(!document.hidden && isOpen()) load(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && isOpen()) close(); });

  // ---------- فتح / قفل ----------
  var prevOverflow = '';
  function open(o){
    opts = o || {};
    // قفل أي قايمة مفتوحة في الصفحة (الداشبورد: menuDropdown · المالك: الكباب)
    try{ var dd = $('menuDropdown'); if(dd) dd.classList.add('hidden'); }catch(e){}
    try{ if(typeof window.closeKebab === 'function') window.closeKebab(); }catch(e){}
    try{ if(typeof window.shieldGhostClick === 'function') window.shieldGhostClick(); }catch(e){}

    injectCss();
    var el = ensureRoot();
    filter = 'all'; q = '';
    var qi = $('sbQ'); if(qi) qi.value = '';
    el.classList.add('on');
    el.scrollTop = 0;
    // الصفحة اللي ورا متتحركش وإنت بتسكرول في اللوحة
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    render();
    load();
    startTimer();
  }
  function close(){
    var el = $('sbOverlay'); if(el) el.classList.remove('on');
    document.body.style.overflow = prevOverflow || '';
    stopTimer();
  }
  function setFilter(k){
    filter = (filter === k) ? 'all' : k;   // نفس الزرار مرتين = الكل
    render();
  }

  window.StaffBoard = { open:open, close:close, refresh:load, filter:setFilter };
  window.openStaffBoard = open;

  // ============================================================
  // 🔁 الداشبورد: بناخد زرار «👥 الموظفين» اللي موجود أصلاً
  // ------------------------------------------------------------
  // الزرار في الداشبورد بينده openStaff() — ودي كانت بتفتح اللوحة
  // القديمة (أخضر/أحمر بس). بعد ما الصفحة تخلص تحميل، بنحط مكانها
  // اللوحة الجديدة.
  // ⚠️ بعد DOMContentLoaded مش قبله: الداشبورد بيعرّف openStaff في
  //    سكريبت تحت في الصفحة — لو استبدلناها بدري، هو هيرجع يكتب
  //    عليها. و#staffOverlay علامة إننا في الداشبورد فعلاً.
  // ============================================================
  function takeOverDashboard(){
    if(!$('staffOverlay')) return;
    // 🧾 حساب السوبر أدمن **هو** «المحاسب العام» — نفس الاسم في كل حتة
    window.openStaff = function(){ open({ adminLabel:'المحاسب العام' }); };
  }

  // ============================================================
  // 👑 صفحة المالك: بنزوّد زرار «👥 الموظفين» في قايمة ⋮
  // ------------------------------------------------------------
  // بيتحط تحت «💰 مرتبك» على طول. شكله بياخده لوحده من ستايل
  // القايمة بتاعة الصفحة (.kebab-menu button).
  // ⚠️ للمالك «السوبر أدمن» اسمه «المحاسب العام» — ممنوع الكلمة
  //    التانية تظهر في أي حاجة المالك بيقراها.
  // ============================================================
  function addOwnerButton(){
    var menu = $('kebabMenu');
    if(!menu || !$('ownName') || $('sbOwnerBtn')) return;
    var btn = document.createElement('button');
    btn.id = 'sbOwnerBtn';
    btn.textContent = '👥 الموظفين';
    btn.onclick = function(){ open({ adminLabel:'المحاسب العام' }); };
    var pay = menu.querySelector('.pay-menu-btn');
    var set = menu.querySelector('button[onclick="openSettings()"]');
    if(pay && pay.parentNode === menu) menu.insertBefore(btn, pay.nextSibling);
    else if(set) menu.insertBefore(btn, set);
    else menu.appendChild(btn);
  }

  function boot(){ takeOverDashboard(); addOwnerButton(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
