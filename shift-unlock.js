// ============================================================
// 🔓 shift-unlock.js — «طلب فتح الشاشة من المحاسب العام» (الإنتاج — v147)
// ------------------------------------------------------------
// 🧸 بالبلدي — الملف ده ليه وشّين (زي shift-lock.js في الاستيجنج):
//
//   ① الموظف المقفول عليه (🛵 الديسباتشر · 📞 الكول سنتر · 🧪 مسؤول الفحص):
//      تحت كارت «🔒 الشاشة مقفولة برّه الشيفت» بيظهر صندوق
//      «🔓 محتاج تفتح وإنت برّه الشيفت؟» — يكتب عايز يعمل إيه وليه
//      ويدوس «📨 ابعت للمحاسب العام». بعدها:
//        ⏳ مستني → الصفحة بتسأل كل ١٢ ثانية، وأول ما يوافق بتفتح لوحدها.
//        🔓 اتفتح → شارة صغيرة تحت «🔓 مفتوح مؤقت لحد ٣:٤٠»،
//                   ولما الوقت يخلص الصفحة بتتقفل لوحدها.
//        🚫 اترفض → بيشوف السبب ويقدر يطلب تاني.
//
//   ② المحاسب العام (dashboard):
//      لوحة «🔓 طلبات فتح الشاشة» فوق — كل طلب: الاسم · الدور · السبب ·
//      ✅ ٣٠ د · ساعة · ساعتين · ⏱️ مدة تانية · 🚫 رفض.
//      والمفتوح دلوقتي ليه «⏹️ اقفل دلوقتي». وفي ⋮ «🔓 طلبات فتح الشاشة»
//      بتفتح السجل (آخر ٧ أيام).
//
// 🔒 القفل الحقيقي على السيرفر (prod-shift-unlock.sql): «المحاسب العام
//    فتحله» = «حاضر» جوه cc_shift_state / cc_on_shift. الملف ده بس
//    بيرسم الصندوق والزراير.
//
// 📍 الصفحة بتحط <div class="ulk-slot"></div> جوه كارت القفل، والملف ده
//    بيملاه لوحده (حتى لو الصفحة رسمت الكارت من جديد — بيرجّع الكلام
//    اللي الموظف كان كاتبه).
// ⚠️ prod-shift-unlock.sql مااتشغّلش؟ → الصندوق بيقول كده بدل ما يقع.
// ============================================================
(function(){
  if(window.IFixUnlock) return;

  var PAGE = (location.pathname.split('/').pop() || '').toLowerCase().replace(/\.html$/, '') || 'index';
  var EMP_PAGES = { dispatch:1, callcenter:1, tester:1 };
  var ROLE_AR = { dispatcher:'الديسباتشر', callcenter:'الكول سنتر', tester:'مسؤول الفحص' };

  var S = {
    st:null, missing:false, busy:false, draft:'', sending:false, sig:'',
    pollT:0, untilT:0, lastOn:null,
    // المحاسب العام
    admin:false, list:null, aBusy:false, aPollT:0, seen:null
  };

  // ---------- أدوات ----------
  function e(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }
  function hm(iso){
    try{ return new Date(iso).toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit', timeZone:'Africa/Cairo' }); }
    catch(x){ return ''; }
  }
  function ago(iso){
    var m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
    if(m < 1) return 'دلوقتي';
    if(m < 60) return 'من ' + m + ' دقيقة';
    var h = Math.floor(m / 60);
    if(h < 24) return 'من ' + h + ' ساعة';
    return 'من ' + Math.floor(h / 24) + ' يوم';
  }
  function dur(min){
    min = Number(min) || 0;
    if(min < 60) return min + ' دقيقة';
    var h = Math.floor(min / 60), r = min % 60;
    return (h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : h + ' ساعات') + (r ? ' و' + r + ' د' : '');
  }
  function msg(x){ return (x && x.message) ? x.message : String(x); }
  function isMissing(m){ return /shift_unlock_|PGRST202|does not exist|schema cache|Could not find the function/i.test(m || ''); }
  function say(t){
    var el = document.getElementById('ulkToast');
    if(!el){
      el = document.createElement('div'); el.id = 'ulkToast'; el.setAttribute('dir', 'rtl');
      document.body.appendChild(el);
    }
    el.textContent = t; el.classList.add('on');
    clearTimeout(el._t); el._t = setTimeout(function(){ el.classList.remove('on'); }, 3200);
  }

  // ---------- الستايل (ألوان الإنتاج — كحلي #16233A · أحمر #E8321E) ----------
  function css(){
    if(document.getElementById('ulkCss')) return;
    var st = document.createElement('style');
    st.id = 'ulkCss';
    st.textContent =
        '.ulk-box{margin:18px auto 0;max-width:440px;text-align:start;background:var(--card,var(--surface,#fff));'
      +   'border:1px solid var(--line,var(--border,#E2E8F0));border-radius:16px;padding:16px;color:var(--ink,#1A2332);}'
      + '.ulk-h{font-weight:900;font-size:15px;line-height:1.5;margin-bottom:4px;}'
      + '.ulk-s{font-size:12.5px;color:var(--muted,#64748B);line-height:1.8;margin-bottom:10px;}'
      + '.ulk-box textarea{width:100%;box-sizing:border-box;min-height:92px;resize:vertical;border:1px solid var(--line,var(--border,#E2E8F0));'
      +   'border-radius:12px;padding:11px 12px;background:var(--bg,var(--paper,#F3F5F7));color:var(--ink,#1A2332);'
      +   'font:500 16px/1.7 inherit;font-family:inherit;margin-bottom:8px;}'
      + '.ulk-box textarea:focus{outline:2px solid #E8321E;outline-offset:0;}'
      + '.ulk-b{display:block;width:100%;border:1px solid var(--line,var(--border,#E2E8F0));background:var(--card,#fff);'
      +   'color:var(--ink,#1A2332);border-radius:12px;padding:13px 10px;font-weight:800;font-size:14.5px;font-family:inherit;'
      +   'cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}'
      + '.ulk-b.pri{background:#E8321E;border-color:#E8321E;color:#fff;}'
      + '.ulk-b.ghost{background:none;color:var(--muted,#64748B);margin-top:8px;}'
      + '.ulk-b:disabled{opacity:.55;cursor:default;}'
      + '.ulk-wait{border:1.5px solid #E8321E;background:rgba(232,50,30,.07);border-radius:13px;padding:12px;font-size:13.5px;line-height:1.9;}'
      + '.ulk-wait q{display:block;quotes:none;margin:6px 0;padding:8px 10px;border-radius:9px;background:var(--card,#fff);'
      +   'color:var(--ink-2,var(--muted,#475569));white-space:pre-wrap;word-break:break-word;}'
      + '.ulk-no{border:1px solid rgba(220,38,38,.35);background:rgba(220,38,38,.07);border-radius:12px;padding:10px 12px;'
      +   'font-size:13px;line-height:1.8;margin-bottom:10px;}'
      + '.ulk-no.exp{border-color:rgba(232,50,30,.4);background:rgba(232,50,30,.06);}'
      + '.ulk-err{color:#DC2626;font-size:12.5px;font-weight:800;min-height:18px;margin-bottom:6px;}'
      // شارة «مفتوح مؤقت»
      + '#ulkChip{position:fixed;inset-inline-start:12px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:9290;'
      +   'background:#16233A;color:#fff;border:1px solid #E8321E;border-radius:999px;padding:7px 13px;'
      +   'font-weight:800;font-size:12.5px;line-height:1.4;box-shadow:0 6px 18px rgba(0,0,0,.22);pointer-events:none;}'
      // رسالة صغيرة
      + '#ulkToast{position:fixed;left:50%;bottom:calc(70px + env(safe-area-inset-bottom));transform:translateX(-50%) translateY(20px);'
      +   'z-index:9600;background:#16233A;color:#fff;padding:10px 16px;border-radius:12px;font-weight:800;font-size:13.5px;'
      +   'opacity:0;pointer-events:none;transition:.2s;max-width:90vw;text-align:center;}'
      + '#ulkToast.on{opacity:1;transform:translateX(-50%) translateY(0);}'

      // ===== لوحة المحاسب العام =====
      + '#sulHost:empty{display:none;}'
      + '#sulHost .sul-panel{background:var(--surface,#fff);border:1px solid rgba(232,50,30,.4);'
      +   'border-inline-start:4px solid #E8321E;border-radius:16px;margin:14px 22px 0;padding:14px 16px;'
      +   'box-shadow:0 4px 16px var(--shadow,rgba(0,0,0,.08));color:var(--ink,#1A2332);}'
      + '@media (max-width:640px){#sulHost .sul-panel{margin:12px 12px 0;}}'
      + '#sulHost .sul-h{display:flex;align-items:center;gap:8px;font-weight:900;font-size:15px;line-height:1.4;margin-bottom:10px;}'
      + '.sul-n{background:#DC2626;color:#fff;font-weight:800;font-size:12px;line-height:22px;min-width:22px;'
      +   'height:22px;border-radius:11px;text-align:center;padding:0 6px;display:inline-block;}'
      + '#sulHost .sul-log{margin-inline-start:auto;border:none;background:none;color:var(--muted,#64748B);'
      +   'font-weight:800;font-size:12.5px;font-family:inherit;cursor:pointer;padding:6px;}'
      + '.sul-row{border:1px solid var(--border,#E2E8F0);background:var(--surface-2,#F8FAFC);border-radius:12px;padding:11px 12px;margin-bottom:9px;}'
      + '.sul-row:last-child{margin-bottom:0;}'
      + '.sul-who{font-weight:900;font-size:14px;}'
      + '.sul-who small{font-weight:700;color:var(--muted,#64748B);font-size:12px;}'
      + '.sul-why{margin:7px 0 9px;padding:8px 10px;border-radius:9px;background:var(--surface,#fff);'
      +   'border:1px dashed var(--border,#E2E8F0);font-size:13.5px;line-height:1.85;white-space:pre-wrap;word-break:break-word;}'
      + '.sul-acts{display:flex;flex-wrap:wrap;gap:6px;}'
      + '.sul-b{border:1px solid var(--border,#E2E8F0);background:var(--surface,#fff);color:var(--ink,#1A2332);'
      +   'border-radius:9px;padding:8px 11px;font-weight:800;font-size:12.5px;font-family:inherit;cursor:pointer;}'
      + '.sul-b.ok{background:#16A34A;border-color:#16A34A;color:#fff;}'
      + '.sul-b.no{color:#DC2626;border-color:rgba(220,38,38,.45);}'
      + '.sul-b:disabled{opacity:.5;cursor:default;}'
      + '.sul-tag{display:inline-block;font-size:11px;font-weight:800;border-radius:7px;padding:2px 8px;margin-inline-start:6px;}'
      + '.sul-tag.on{background:rgba(22,163,74,.14);color:#16A34A;}'
      + '.sul-tag.open{background:rgba(232,50,30,.12);color:#E8321E;}'
      + '.sul-st{font-size:12px;font-weight:800;margin-top:4px;line-height:1.8;color:var(--muted,#64748B);}'
      // السجل (صفحة كاملة)
      + '#sulSheet{position:fixed;inset:0;z-index:9302;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;'
      +   'background:var(--bg,#F3F5F7);color:var(--ink,#1A2332);}'
      + '#sulSheet .h{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;background:#16233A;'
      +   'color:#fff;padding:calc(12px + env(safe-area-inset-top)) 16px 12px;}'
      + '#sulSheet .h b{flex:1;font-weight:900;font-size:17px;}'
      + '#sulSheet .x{border:none;background:rgba(255,255,255,.12);color:inherit;width:34px;height:34px;border-radius:10px;font-size:17px;cursor:pointer;}'
      + '#sulSheet .wrap{max-width:720px;margin:0 auto;padding:14px 16px calc(70px + env(safe-area-inset-bottom));}'
      + '#sulSheet .empty{text-align:center;color:var(--muted,#64748B);padding:30px 10px;}';
    (document.head || document.documentElement).appendChild(st);
  }

  // ############################################################
  // ① الموظف
  // ############################################################
  async function check(){
    if(S.busy) return;
    S.busy = true;
    try{
      var res = await sb.rpc('cc_shift_state');
      if(res.error) throw res.error;
      S.st = res.data || {};
      // السيرفر القديم (prod-shift-unlock.sql مااتشغّلش): مفيش «lockable»
      S.missing = !('lockable' in S.st);
    }catch(x){
      console.warn('[طلب الفتح] مقدرناش نسأل السيرفر:', msg(x));
      S.busy = false; schedule(); return;   // غلطة نت؟ نحاول تاني بعدين
    }
    S.busy = false;
    after();
  }

  function after(){
    var st = S.st || {};
    // الحالة اتغيّرت (اتفتح أو الفتح خلص)؟ → الصفحة تشوف تاني بنفسها
    if(S.lastOn !== null && S.lastOn !== !!st.on) pageRecheck();
    S.lastOn = !!st.on;
    paintSlots();
    paintChip();
    armUntil();
    schedule();
  }

  // 🔁 كل صفحة بتشوف الشيفت بطريقتها
  function pageRecheck(){
    try{
      if(PAGE === 'tester' && typeof window.load === 'function') return window.load();
      if(typeof window.applyShift === 'function') return window.applyShift();
    }catch(x){ console.warn('[طلب الفتح] إعادة الفحص:', x); }
  }

  // كل قد إيه نسأل؟ — مستني رد: ١٢ ثانية · غير كده: دقيقة
  function schedule(){
    clearTimeout(S.pollT);
    var st = S.st || {};
    if(S.missing || (S.st && !st.lockable)) return;
    var ms = (st.pending && !st.on) ? 12000 : 60000;
    S.pollT = setTimeout(function(){
      if(document.hidden){ schedule(); return; }
      check();
    }, ms);
  }
  // الفتح المؤقت هيخلص الساعة كام؟ → نسأل في اللحظة دي بالظبط
  function armUntil(){
    clearTimeout(S.untilT);
    var u = S.st && S.st.unlock_until;
    if(!u) return;
    var ms = Date.parse(u) - Date.now() + 1500;
    if(ms > 0 && ms < 2147000000) S.untilT = setTimeout(check, ms);
  }

  // ---------- الصندوق جوه كارت القفل ----------
  function boxHtml(){
    var st = S.st || {};
    var head = '<div class="ulk-h">🔓 محتاج تفتح وإنت برّه الشيفت؟</div>'
      + '<div class="ulk-s">اكتب للمحاسب العام إنت عايز تعمل إيه وليه — لو وافق الشاشة هتتفتح لمدة هو بيحددها.</div>';
    if(S.missing){
      return head + '<div class="ulk-no">⚠️ الخدمة دي لسه ماشتغلتش على السيرفر (prod-shift-unlock.sql).</div>';
    }
    if(st.pending){
      return head + '<div class="ulk-wait">⏳ <b>طلبك عند المحاسب العام</b> — اتبعت ' + e(ago(st.pending.at))
        + '<q>' + e(st.pending.reason) + '</q>أول ما يوافق الشاشة هتتفتح لوحدها.</div>'
        + '<button class="ulk-b ghost" onclick="IFixUnlock.cancel()">↩️ إلغاء الطلب</button>';
    }
    var last = st.last, note = '';
    if(last && last.status === 'rejected' && Date.now() - Date.parse(last.at) < 12 * 3600000){
      note = '<div class="ulk-no">🚫 آخر طلب ليك <b>اترفض</b> ' + e(ago(last.at))
        + (last.note ? '<br>السبب: ' + e(last.note) : '') + '</div>';
    }else if(last && last.status === 'approved' && last.until && Date.parse(last.until) <= Date.now()
             && Date.now() - Date.parse(last.until) < 12 * 3600000){
      note = '<div class="ulk-no exp">⌛ الفتح المؤقت خلص الساعة ' + e(hm(last.until))
        + (last.ended_at ? ' (المحاسب العام قفله)' : '') + '</div>';
    }
    return head + note
      + '<textarea class="ulk-ta" maxlength="1000" placeholder="مثلاً: عميل جاي ياخد جهازه دلوقتي ومحتاج أسلّمه…" '
      +   'oninput="IFixUnlock.draft(this.value)">' + e(S.draft) + '</textarea>'
      + '<div class="ulk-err"></div>'
      + '<button class="ulk-b pri" onclick="IFixUnlock.send()"' + (S.sending ? ' disabled' : '') + '>'
      +   (S.sending ? '⏳ بنبعت…' : '📨 ابعت للمحاسب العام') + '</button>';
  }

  function paintSlots(force){
    var st = S.st;
    var slots = document.querySelectorAll('.ulk-slot');
    if(!slots.length) return;
    css();
    var show = st && (S.missing || (st.lockable && !st.on));
    var sig = show ? JSON.stringify([S.missing, st.pending && st.pending.id, st.last && st.last.id,
                                     st.last && st.last.until, S.sending]) : '';
    for(var i = 0; i < slots.length; i++){
      var sl = slots[i];
      if(!show){ if(sl.innerHTML) sl.innerHTML = ''; sl._sig = ''; continue; }
      if(!force && sl._sig === sig && sl.firstChild) continue;   // نفس الحالة → مانرسمش (عشان الكتابة ماتضيعش)
      var focused = document.activeElement && sl.contains(document.activeElement);
      sl.innerHTML = '<div class="ulk-box">' + boxHtml() + '</div>';
      sl._sig = sig;
      if(focused){ var ta = sl.querySelector('textarea'); if(ta){ ta.focus(); try{ ta.setSelectionRange(ta.value.length, ta.value.length); }catch(x){} } }
    }
  }

  // الصفحة رسمت كارت القفل من جديد؟ → نملا الصندوق تاني
  function watch(){
    try{
      var mo = new MutationObserver(function(){
        var slots = document.querySelectorAll('.ulk-slot');
        for(var i = 0; i < slots.length; i++){
          if(!slots[i].firstChild && S.st){ paintSlots(true); break; }
        }
      });
      mo.observe(document.body, { childList:true, subtree:true });
    }catch(x){}
  }

  // ---------- شارة «مفتوح مؤقت» ----------
  function paintChip(){
    var st = S.st || {};
    var on = st.lockable && st.on && !st.duty && st.unlock_until;
    var c = document.getElementById('ulkChip');
    if(!on){ if(c) c.remove(); return; }
    css();
    if(!c){
      c = document.createElement('div');
      c.id = 'ulkChip';
      c.setAttribute('dir', 'rtl');
      document.body.appendChild(c);
    }
    c.textContent = '🔓 مفتوح مؤقت لحد ' + hm(st.unlock_until);
  }

  // ---------- الأزرار ----------
  function errAt(t){
    var els = document.querySelectorAll('.ulk-err');
    for(var i = 0; i < els.length; i++) els[i].textContent = t;
  }
  async function send(){
    if(S.sending) return;
    var txt = String(S.draft || '').trim();
    if(txt.length < 5){
      errAt('اكتب إنت عايز تعمل إيه وليه (٥ حروف على الأقل)');
      var ta = document.querySelector('.ulk-ta'); if(ta) ta.focus();
      return;
    }
    S.sending = true; paintSlots(true);
    try{
      var res = await sb.rpc('shift_unlock_request', { p_reason: txt });
      if(res.error) throw res.error;
      S.draft = '';
      S.sending = false;
      say('📨 الطلب وصل للمحاسب العام');
      await check();
      paintSlots(true);
    }catch(x){
      S.sending = false;
      paintSlots(true);
      var m = msg(x);
      errAt('❌ ' + (isMissing(m) ? 'الخدمة لسه ماشتغلتش على السيرفر' : m));
      if(/مفتوحة أصلاً/.test(m)) { await check(); pageRecheck(); }
    }
  }
  async function cancel(){
    var p = S.st && S.st.pending;
    if(!p || !confirm('تلغي طلب الفتح؟')) return;
    try{
      var res = await sb.rpc('shift_unlock_cancel', { p_id: p.id });
      if(res.error) throw res.error;
    }catch(x){ alert('❌ ' + msg(x)); }
    await check();
    paintSlots(true);
  }

  // ############################################################
  // ② المحاسب العام (dashboard)
  // ############################################################
  async function adminBoot(){
    if(S.admin) return;
    var ok = await loadList();
    if(!ok) return;          // مش المحاسب العام (أو الملف مااتشغّلش) → نسكت خالص
    S.admin = true;
    css();
    mountAdminMenu();
    setTimeout(mountAdminMenu, 2500);
    document.addEventListener('visibilitychange', function(){ if(!document.hidden) loadList(); });
  }

  function host(){
    var h = document.getElementById('sulHost');
    if(h) return h;
    h = document.createElement('div');
    h.id = 'sulHost';
    var a = document.getElementById('approvalsHost');
    if(a && a.parentNode) a.parentNode.insertBefore(h, a);
    else{
      var tb = document.querySelector('.topbar');
      if(tb && tb.parentNode) tb.parentNode.insertBefore(h, tb.nextSibling);
      else document.body.insertBefore(h, document.body.firstChild);
    }
    return h;
  }

  // بترجّع true لو اشتغلت (يعني ده المحاسب العام والملف متركّب)
  async function loadList(){
    if(S.aBusy) return !!S.admin;
    S.aBusy = true;
    var ok = true;
    try{
      var res = await sb.rpc('shift_unlock_list', { p_days: 7 });
      if(res.error) throw res.error;
      S.list = res.data || { rows: [] };
      notifyNew();
    }catch(x){
      var m = msg(x);
      if(isMissing(m) || /للمحاسب العام بس/.test(m)){ S.aBusy = false; return false; }
      console.warn('[طلبات الفتح]', m);
      ok = !!S.admin;
    }
    S.aBusy = false;
    if(S.admin || ok){ paintAdmin(); paintSheet(); }
    clearTimeout(S.aPollT);
    S.aPollT = setTimeout(function(){ if(!document.hidden) loadList(); else S.aPollT = setTimeout(loadList, 20000); }, 20000);
    return ok;
  }

  // طلب جديد وصل والصفحة مفتوحة → رجّة + رسالة
  function notifyNew(){
    var rows = (S.list && S.list.rows) || [];
    var pend = rows.filter(function(r){ return r.status === 'pending'; });
    if(S.seen === null){ S.seen = {}; pend.forEach(function(r){ S.seen[r.id] = 1; }); return; }
    var fresh = pend.filter(function(r){ return !S.seen[r.id]; });
    pend.forEach(function(r){ S.seen[r.id] = 1; });
    if(!fresh.length) return;
    try{ if(navigator.vibrate) navigator.vibrate([120, 60, 120]); }catch(x){}
    css();
    say('🔓 طلب فتح الشاشة من ' + (fresh[0].name || fresh[0].email));
  }

  function rowHtml(r, inSheet){
    var who = '<div class="sul-who">👤 ' + e(r.name || r.email)
      + ' <small>· ' + e(ROLE_AR[r.role] || r.role || '') + ' · ' + e(ago(r.at)) + '</small>'
      + (r.on_duty ? '<span class="sul-tag on">🟢 حضر خلاص</span>' : '')
      + (r.active ? '<span class="sul-tag open">🔓 مفتوح لحد ' + e(hm(r.until)) + '</span>' : '')
      + '</div>';
    var why = '<div class="sul-why">' + e(r.reason) + '</div>';
    var acts = '';
    if(r.status === 'pending'){
      acts = '<div class="sul-acts">'
        + '<button class="sul-b ok" onclick="IFixUnlock.ok(\'' + r.id + '\',30)">✅ افتح ٣٠ د</button>'
        + '<button class="sul-b ok" onclick="IFixUnlock.ok(\'' + r.id + '\',60)">✅ ساعة</button>'
        + '<button class="sul-b ok" onclick="IFixUnlock.ok(\'' + r.id + '\',120)">✅ ساعتين</button>'
        + '<button class="sul-b" onclick="IFixUnlock.ok(\'' + r.id + '\',0)">⏱️ مدة تانية</button>'
        + '<button class="sul-b no" onclick="IFixUnlock.no(\'' + r.id + '\')">🚫 رفض</button>'
        + '</div>';
    }else if(r.active){
      acts = '<div class="sul-acts"><button class="sul-b no" onclick="IFixUnlock.end(\'' + r.id + '\')">⏹️ اقفل دلوقتي</button></div>';
    }
    var stLine = '';
    if(inSheet && r.status !== 'pending'){
      var t = r.status === 'approved'
        ? '✅ اتوافق ' + dur(r.minutes) + (r.ended_at ? ' · ⏹️ اتقفل بدري ' + hm(r.ended_at) : (r.active ? '' : ' · خلص ' + hm(r.until)))
        : r.status === 'rejected' ? '🚫 اترفض' : '↩️ اتلغى';
      stLine = '<div class="sul-st">' + e(t) + (r.note ? ' — ' + e(r.note) : '')
        + (r.decided_at ? ' · ' + e(new Date(r.decided_at).toLocaleString('ar-EG', { timeZone:'Africa/Cairo' })) : '') + '</div>';
    }
    return '<div class="sul-row">' + who + why + stLine + acts + '</div>';
  }

  function paintAdmin(){
    var rows = (S.list && S.list.rows) || [];
    var show = rows.filter(function(r){ return r.status === 'pending' || r.active; });
    var h = host();
    var pend = show.filter(function(r){ return r.status === 'pending'; }).length;
    paintAdminMenu(pend);
    if(!show.length){ h.innerHTML = ''; return; }
    h.innerHTML = '<div class="sul-panel" dir="rtl">'
      + '<div class="sul-h">🔓 طلبات فتح الشاشة'
      +   (pend ? '<span class="sul-n">' + pend + '</span>' : '')
      +   '<button class="sul-log" onclick="IFixUnlock.log()">📜 السجل</button></div>'
      + show.map(function(r){ return rowHtml(r, false); }).join('')
      + '</div>';
  }

  // ---- زرار في ⋮ (تحت «🛡️ إدارة النظام») ----
  function mountAdminMenu(){
    if(document.getElementById('sulMenuBtn')) return;
    var menu = document.getElementById('menuDropdown');
    if(!menu) return;
    var b = document.createElement('button');
    b.id = 'sulMenuBtn';
    b.type = 'button';
    b.onclick = function(ev){ if(ev) ev.stopPropagation(); openLog(); };
    var slot = document.getElementById('slotAdmin');
    if(slot && slot.parentNode === menu) menu.insertBefore(b, slot);
    else{
      var out = menu.querySelector('.logout-menu-item');
      if(out) menu.insertBefore(b, out); else menu.appendChild(b);
    }
    var rows = (S.list && S.list.rows) || [];
    paintAdminMenu(rows.filter(function(r){ return r.status === 'pending'; }).length);
  }
  function paintAdminMenu(n){
    var b = document.getElementById('sulMenuBtn');
    if(!b) return;
    b.innerHTML = '🔓 طلبات فتح الشاشة' + (n ? ' <span class="sul-n">' + n + '</span>' : '');
  }

  // ---- السجل (صفحة كاملة) ----
  function openLog(){
    try{ var md = document.getElementById('menuDropdown'); if(md) md.classList.add('hidden'); }catch(x){}
    css();
    if(!document.getElementById('sulSheet')){
      var sh = document.createElement('div');
      sh.id = 'sulSheet';
      sh.setAttribute('dir', 'rtl');
      document.body.appendChild(sh);
      try{ document.body.dataset.sulOv = document.body.style.overflow || ''; document.body.style.overflow = 'hidden'; }catch(x){}
    }
    paintSheet();
    loadList();
  }
  function closeLog(){
    var sh = document.getElementById('sulSheet'); if(!sh) return;
    sh.remove();
    try{ document.body.style.overflow = document.body.dataset.sulOv || ''; delete document.body.dataset.sulOv; }catch(x){}
  }
  function paintSheet(){
    var sh = document.getElementById('sulSheet'); if(!sh) return;
    var rows = (S.list && S.list.rows) || [];
    sh.innerHTML = '<div class="h"><b>🔓 طلبات فتح الشاشة</b>'
      + '<button class="x" onclick="IFixUnlock.reload()" title="تحديث">🔄</button>'
      + '<button class="x" onclick="IFixUnlock.closeLog()" aria-label="قفل">✕</button></div>'
      + '<div class="wrap">'
      + '<div class="sul-st" style="margin-bottom:12px;">🛵 الديسباتشر · 📞 الكول سنتر · 🧪 مسؤول الفحص — آخر ٧ أيام</div>'
      + (rows.length ? rows.map(function(r){ return rowHtml(r, true); }).join('')
                     : '<div class="empty">مفيش طلبات في آخر ٧ أيام</div>')
      + '</div>';
  }

  // ---- القرارات ----
  async function decide(id, ok, minutes, note){
    if(S.aBusy) return;
    S.aBusy = true;
    try{
      var res = await sb.rpc('shift_unlock_decide', { p_id: id, p_approve: ok, p_minutes: ok ? minutes : null, p_note: note || null });
      if(res.error) throw res.error;
      say(ok ? '✅ الشاشة اتفتحت لمدة ' + dur(minutes) : '🚫 الطلب اترفض');
    }catch(x){ alert('❌ ' + msg(x)); }
    S.aBusy = false;
    loadList();
  }
  function approve(id, minutes){
    if(!minutes){
      var v = prompt('تفتحله قد إيه؟ (بالدقايق — من ٥ لـ ٧٢٠)', '45');
      if(v === null) return;
      minutes = parseInt(String(v).replace(/[٠-٩]/g, function(d){ return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); }), 10);
      if(!(minutes >= 5 && minutes <= 720)){ alert('اكتب رقم من ٥ لـ ٧٢٠'); return; }
    }
    var r = ((S.list && S.list.rows) || []).filter(function(x){ return x.id === id; })[0];
    if(!confirm('تفتح الشاشة لـ «' + ((r && (r.name || r.email)) || '') + '» لمدة ' + dur(minutes) + '؟')) return;
    decide(id, true, minutes, '');
  }
  function reject(id){
    var n = prompt('سبب الرفض؟ (اختياري — هيوصل للموظف)', '');
    if(n === null) return;
    decide(id, false, null, n);
  }
  async function endNow(id){
    if(!confirm('تقفل الشاشة عليه دلوقتي حالاً؟')) return;
    try{
      var res = await sb.rpc('shift_unlock_end', { p_id: id });
      if(res.error) throw res.error;
      say('⏹️ اتقفلت');
    }catch(x){ alert('❌ ' + msg(x)); }
    loadList();
  }

  // ############################################################
  // التشغيل
  // ############################################################
  async function boot(){
    if(typeof sb === 'undefined') return;
    try{
      var r = await sb.auth.getSession();
      if(!(r && r.data && r.data.session)) return;   // لسه ما دخلش
    }catch(x){ return; }
    if(PAGE === 'dashboard'){ adminBoot(); return; }
    if(!EMP_PAGES[PAGE]) return;
    watch();
    check();
    document.addEventListener('visibilitychange', function(){ if(!document.hidden) check(); });
    addEventListener('online', function(){ check(); });
  }
  if(document.readyState === 'loading') addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 400); });
  else setTimeout(boot, 400);

  window.IFixUnlock = {
    check: check,
    send: send, cancel: cancel,
    draft: function(v){ S.draft = v; errAt(''); },
    ok: approve, no: reject, end: endNow, log: openLog, closeLog: closeLog,
    reload: function(){ loadList(); },
    state: function(){ return S.st; }
  };
})();
