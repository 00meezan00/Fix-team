// ============================================================
// 🔔 push-ui.js — «إشعارات الموبايل» لكل الشاشات (ملفات SQL 87 + 115)
// ------------------------------------------------------------
// 🧸 بالبلدي: الإشعار ده بيوصل **حتى والتطبيق مقفول** — زي الواتساب.
//    قبل كده كان في الداشبورد بس. دلوقتي كل شاشة (الفني · مسؤول الحركة ·
//    المالك · القطع · التيستر · الموظف · الداشبورد بكل أدواره) فيها
//    «🔔 الإشعارات» في قايمة ⋮، وكل موظف بيشوف الأنواع اللي تخص شغله بس.
//
// 🔀 مفتاحين منفصلين:
//    🔔 الشغل — مفتاح للكل ('work') + كل نوع لوحده
//    💬 الشات — الرسايل الخاصة (chat_dm) · أوضة «الكل» (chat_all)
//    يعني تقدر تقفل الشغل وتسيب الشات — أو العكس.
//
// 🔒 الدور مابيتبعتش من هنا — السيرفر بيعرفه لوحده (my_app_role).
//    والسيرفر هو اللي بيختار مين يوصله إيه (push_claim).
// ⚠️ الأيفون: لازم التطبيق يكون متضاف للشاشة الرئيسية (قاعدة آبل).
// ⚠️ المفتاح العام هنا لازم يطابق VAPID_PUBLIC_KEY في أسرار notify-push
//    (ونفسه في dashboard.html → IFX_VAPID_PUBLIC).
// ⚠️ في الداشبورد: بياخد مكان شاشة «🔔 إشعارات الموبايل» القديمة
//    (openPushSettings) — نفس الدفتر على السيرفر، بس بكل الأنواع.
//
// 🟦 (٢٠٢٦-١٠-٢١) بقى TypeScript (ts/push-ui.ts → push-ui.js)
//    🧸 نفس الكود بالحرف — اتزوّد بس «ورق» بيقول نوع كل حاجة.
//       المترجم بيشيل الورق ده والمتصفح بياخد نفس الـ js القديم.
// ============================================================
// 🏷️ الأنواع — بتختفي بعد الترجمة
/** نوع إشعار واحد في القايمة */
interface PushKind {
  /** المفتاح — لازم يطابق ملف 115 (push_set_muted) */
  k: string;
  /** الأيقونة */
  i: string;
  /** العنوان */
  t: string;
  /** سطر الشرح الصغير (ممكن يبقى فاضي) */
  h: string;
  /** الأدوار اللي يخصّها — صفوف الشات مالهاش */
  r?: string[];
}
/** رد push_my_state() — ملف 87 + 115 */
interface PushMyState {
  /** دوري — السيرفر بيعرفه لوحده (my_app_role) */
  role?: string;
  /** الأنواع اللي أنا قافلها ('work' = كل الشغل) */
  muted?: string[];
  /** عدد موبايلاتي المتسجّلة */
  devices: number;
}
interface PushUiState {
  /** اشتراك الموبايل ده (null = مش متفعّل) */
  sub: PushSubscription | null;
  state: PushMyState | null;
  err: string;
  busy: boolean;
  loaded: boolean;
}
interface IFixPushApi {
  open(): Promise<void>;
  close(): void;
  enable(): Promise<void>;
  toggle(k: string): Promise<void>;
  test(): Promise<void>;
  disable(): Promise<void>;
}
declare var IFixPush: IFixPushApi;

(function(){
  if(window.IFixPush) return;

  var VAPID = 'BFpt-_h1b0C81oTAX1EkJit1OiGRTt-EJGgYW4C7V9dmQ3hS7XhnSX4fsYOu9tZ8U9BayFFc4DlV0nviGt_A2MA';
  var PAGE = (location.pathname.split('/').pop() || '').toLowerCase().replace(/\.html$/, '') || 'index';

  // 🗂️ كل نوع + مين يخصّه (لازم يطابق الأسامي في ملف 115 → push_set_muted)
  var KINDS: PushKind[] = [
    { k:'inbox',         i:'📥', t:'وصلك جهاز',                  h:'مدير الإنتاج: وارد من الاستقبال · الاستقبال: راجع من الصيانة', r:['reception','production'] },
    { k:'custody_in',    i:'🚗', t:'جهاز جاي في الطريق',          h:'مسؤول الحركة أو المالك جاي بجهاز',     r:['reception'] },
    { k:'approval_req',  i:'✋', t:'طلب تسليم/رفض/إرجاع',          h:'من مسؤول الحركة أو المالك',            r:['reception','super_admin'] },
    { k:'paid',          i:'✅', t:'جهاز اتدفع',                  h:'أمين الخزنة أكد الدفع',                r:['reception'] },
    { k:'await_pay',     i:'💵', t:'عميل جاي يدفع',               h:'جهاز اتسلّم ومستني تأكيد الدفع',        r:['accountant'] },
    { k:'deposit',       i:'💰', t:'عربون محتاج تأكيد',           h:'',                                    r:['accountant'] },
    { k:'reviewed',      i:'👀', t:'المحاسب العام راجع تقريرك',    h:'',                                    r:['reception','accountant'] },
    { k:'report',        i:'📝', t:'تقرير جديد محتاج مراجعة',     h:'من الاستقبال أو أمين الخزنة',           r:['super_admin'] },
    { k:'closing',       i:'🔒', t:'تقفيل الخزنة',                h:'بالفرق — عجز أو زيادة',                r:['super_admin'] },
    { k:'tech_new',      i:'🔧', t:'جهاز جديد اتوزّع عليك',        h:'',                                    r:['technician','owner'] },
    { k:'tech_return',   i:'🔁', t:'جهاز رجعلك مرتجع',            h:'',                                    r:['technician','owner'] },
    { k:'part_bought',   i:'🛒', t:'القطعة اللي طلبتها اتشرت',     h:'استلمها من مسؤول القطع',               r:['technician','owner','production'] },
    { k:'custody_out',   i:'📤', t:'جهاز تتوصّله',                h:'الاستقبال سلّمك جهاز',                  r:['dispatcher'] },
    { k:'approval_done', i:'✅', t:'طلبك اتوافق عليه / اترفض',     h:'',                                    r:['dispatcher','owner'] },
    { k:'owner_price',   i:'🏷️', t:'جهاز محتاج تسعير',            h:'',                                    r:['owner'] },
    { k:'part_req',      i:'🛵', t:'طلب قطعة جديد',              h:'🔥 المستعجل بيبان في العنوان',         r:['parts'] },
    { k:'qc_in',         i:'🧪', t:'جهاز مستني فحص الاستلام',     h:'',                                    r:['tester'] },
    { k:'qc_out',        i:'📦', t:'جهاز مستني فحص التسليم',      h:'',                                    r:['tester'] },
    { k:'call_ask',      i:'📞', t:'كلّم العميل — وقت أطول',       h:'مدير الإنتاج محتاج وقت زيادة',          r:['callcenter'] }
  ];
  var NO_CHAT = ['hr'];

  var S: PushUiState = { sub:null, state:null, err:'', busy:false, loaded:false };

  function e(s: unknown): string {
    return (typeof esc === 'function') ? esc(s)
      : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
          return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' } as Record<string, string>)[c];
        });
  }
  function toast(m: string): void {
    try{ if(typeof ph1Toast === 'function'){ ph1Toast(m); return; } }catch(x){}
    try{ if(typeof window.toast === 'function'){ window.toast(m); return; } }catch(x){}
    alert(m);
  }

  // ---------- قدرات الموبايل ----------
  function can(): boolean { return !!('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window); }
  function isIOS(): boolean {
    var ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (/Mac/.test(ua) && 'ontouchend' in document);
  }
  function standalone(): boolean {
    return ((navigator as any).standalone === true) || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  }
  function keyU8(s: string): Uint8Array<ArrayBuffer> {
    var pad = '='.repeat((4 - s.length % 4) % 4);
    var raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length);
    for(var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function keyMatches(sub: PushSubscription | null): boolean {
    try{
      var k = sub && sub.options && sub.options.applicationServerKey;
      if(!k) return true;
      var a = new Uint8Array(k), b = keyU8(VAPID);
      if(a.length !== b.length) return false;
      for(var i = 0; i < a.length; i++) if(a[i] !== b[i]) return false;
      return true;
    }catch(x){ return true; }
  }
  function errTxt(x: any): string {
    var t = (x && x.message) || String(x);
    return /push_register|push_my_state|push_set_muted|push_test|push_unregister|does not exist|PGRST202|42883/i.test(t)
      ? 'السيرفر لسه ماتجهّزش للإشعارات (ملفات SQL 87 و 115)' : t;
  }
  // ⚠️ serviceWorker.ready مابيرجعش أبداً لو مفيش service worker — فبنحط مهلة
  function swReg(): Promise<ServiceWorkerRegistration> {
    return Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>(function(_, rej){ setTimeout(function(){ rej(new Error('التطبيق لسه بيجهّز نفسه — اقفله وافتحه وجرّب تاني')); }, 6000); })
    ]);
  }
  async function curSub(): Promise<PushSubscription | null> {
    try{ var reg = await swReg(); return await reg.pushManager.getSubscription(); }catch(x){ return null; }
  }
  async function register(sub: PushSubscription): Promise<unknown> {
    var j = sub.toJSON();
    var r = await sb.rpc('push_register', { p_endpoint: sub.endpoint, p_p256dh: j.keys!.p256dh, p_auth: j.keys!.auth,
                                            p_ua: (navigator.userAgent || '').slice(0, 300) });
    if(r.error) throw r.error;
    return r.data;
  }
  async function loadState(): Promise<void> {
    S.err = '';
    try{
      S.sub = can() ? await curSub() : null;
      var r = await sb.rpc('push_my_state');
      if(r.error) throw r.error;
      S.state = r.data || {};
    }catch(x){
      console.error('[الإشعارات] push_my_state:', x);
      S.err = errTxt(x);
    }
    S.loaded = true;
  }

  // ---------- الستايل ----------
  function css(){
    if(document.getElementById('pshCss')) return;
    var st = document.createElement('style');
    st.id = 'pshCss';
    st.textContent =
        '#pshPage{position:fixed;inset:0;z-index:9302;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;'
      +   'background:var(--paper,var(--bg,#fff));color:var(--ink,#111);font-family:Tajawal,system-ui,sans-serif;}'
      + '#pshPage .h{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;'
      +   'background:var(--chrome,#0C0C0E);color:var(--on-chrome,#F2F2F0);'
      +   'padding:calc(12px + env(safe-area-inset-top)) 16px 12px;box-shadow:0 4px 14px rgba(0,0,0,.18);}'
      + '#pshPage .h b{flex:1;font:900 17px/1.4 Cairo,sans-serif;}'
      + '#pshPage .x{border:none;background:rgba(242,242,240,.10);color:inherit;width:34px;height:34px;border-radius:10px;font-size:17px;cursor:pointer;}'
      + '#pshPage .wrap{max-width:620px;margin:0 auto;padding:16px 16px calc(70px + env(safe-area-inset-bottom));}'
      + '#pshPage .note{color:var(--muted,#666);font-size:13px;line-height:1.9;margin-bottom:14px;}'
      + '#pshPage .warn{background:rgba(180,83,9,.12);border:1px solid rgba(180,83,9,.4);color:#B45309;border-radius:12px;'
      +   'padding:11px 13px;font-size:13px;font-weight:700;line-height:1.9;margin-bottom:14px;}'
      + '#pshPage .ok{background:rgba(22,163,74,.12);border:1px solid rgba(22,163,74,.4);color:#15803D;border-radius:12px;'
      +   'padding:11px 13px;font-size:13.5px;font-weight:800;margin-bottom:14px;}'
      + 'html[data-theme="dark"] #pshPage .ok{color:#4ADE80;}'
      + '#pshPage .big{width:100%;border:none;border-radius:13px;padding:15px;margin-bottom:14px;cursor:pointer;'
      +   'background:var(--accent,#EE5B10);color:var(--on-accent,#0C0C0E);font:900 16px/1.3 Cairo,sans-serif;}'
      + '#pshPage .big:disabled{opacity:.55;}'
      + '#pshPage .card{border:1px solid var(--line,var(--border,#ddd));background:var(--card,var(--surface,#fff));'
      +   'border-radius:14px;padding:4px 12px;margin-bottom:14px;}'
      + '#pshPage .sec{font:900 14px/1.4 Cairo,sans-serif;margin:16px 2px 8px;display:flex;align-items:center;gap:8px;}'
      + '#pshPage .row{display:flex;align-items:center;gap:10px;padding:11px 0;border-top:1px solid var(--line,var(--border,#eee));}'
      + '#pshPage .row:first-child{border-top:none;}'
      + '#pshPage .row.master{font-weight:900;}'
      + '#pshPage .row.dim{opacity:.45;}'
      + '#pshPage .ic{font-size:20px;width:28px;text-align:center;flex:none;}'
      + '#pshPage .t{flex:1;min-width:0;font-size:14px;line-height:1.5;}'
      + '#pshPage .t small{display:block;color:var(--muted,#666);font-size:11.5px;font-weight:500;}'
      + '#pshPage .sw{flex:none;width:50px;height:30px;border-radius:20px;border:none;background:#C9C9C3;position:relative;cursor:pointer;transition:background .15s;}'
      + '#pshPage .sw i{position:absolute;top:3px;inset-inline-start:3px;width:24px;height:24px;border-radius:50%;background:#fff;'
      +   'box-shadow:0 1px 3px rgba(0,0,0,.25);transition:inset-inline-start .15s;}'
      + '#pshPage .sw.on{background:var(--accent,#EE5B10);}'
      + '#pshPage .sw.on i{inset-inline-start:23px;}'
      + '#pshPage .sw:disabled{opacity:.5;cursor:default;}'
      + '#pshPage .two{display:flex;gap:8px;margin-top:6px;}'
      + '#pshPage .two button{flex:1;border:1px solid var(--line,var(--border,#ddd));background:var(--card,var(--surface,#fff));'
      +   'color:var(--ink,#111);border-radius:12px;padding:12px 8px;font:800 13px/1.3 inherit;cursor:pointer;}';
    document.head.appendChild(st);
  }

  // ---------- الرسم ----------
  function paint(){
    var pg = document.getElementById('pshPage'); if(!pg) return;
    var role = (S.state && S.state.role) || '';
    var muted: string[] = (S.state && S.state.muted) || [];
    var on = !!(S.sub && window.Notification && Notification.permission === 'granted');
    var lock = !on || S.busy;
    var body: string;

    if(isIOS() && !standalone()){
      body = '<div class="warn">📲 على الأيفون لازم تضيف التطبيق للشاشة الرئيسية الأول:<br>'
        + 'دوس <b>مشاركة</b> ⬆️ ← <b>إضافة إلى الشاشة الرئيسية</b> ← افتحه من الأيقونة وارجع هنا.</div>';
    }else if(!can()){
      body = '<div class="warn">⚠️ المتصفح ده مابيدعمش الإشعارات. جرّب كروم على أندرويد، أو التطبيق المتضاف للشاشة الرئيسية على الأيفون.</div>';
    }else if(window.Notification && Notification.permission === 'denied'){
      body = '<div class="warn">🔕 الإشعارات مقفولة من إعدادات الموبايل للموقع ده. افتحها من الإعدادات وارجع هنا.</div>';
    }else if(!S.loaded){
      body = '<div class="note" style="text-align:center;">⏳ لحظة…</div>';
    }else{
      var kinds = KINDS.filter(function(k){ return k.r!.indexOf(role) !== -1; });
      var workOff = muted.indexOf('work') !== -1;
      var chatOk = role && NO_CHAT.indexOf(role) === -1;
      function sw(key: string, isOn: boolean, disabled: boolean): string {
        return '<button class="sw' + (isOn ? ' on' : '') + '" ' + (disabled ? 'disabled' : '')
          + ' onclick="IFixPush.toggle(\'' + key + '\')" aria-label="' + (isOn ? 'شغّال' : 'مقفول') + '"><i></i></button>';
      }
      function row(k: PushKind, dim: boolean): string {
        var off = muted.indexOf(k.k) !== -1;
        return '<div class="row' + (dim ? ' dim' : '') + '"><span class="ic">' + k.i + '</span>'
          + '<span class="t"><b>' + e(k.t) + '</b>' + (k.h ? '<small>' + e(k.h) + '</small>' : '') + '</span>'
          + sw(k.k, !off, lock || dim) + '</div>';
      }

      body = (S.err ? '<div class="warn">⚠️ ' + e(S.err) + '</div>' : '')
        + (on
            ? '<div class="ok">✅ شغّالة على الموبايل ده' + (S.state && S.state.devices > 1 ? ' · ومعاك ' + S.state.devices + ' أجهزة متسجّلة' : '') + '</div>'
            : '<button class="big" ' + (S.busy ? 'disabled' : '') + ' onclick="IFixPush.enable()">' + (S.busy ? '⏳ لحظة…' : '🔔 فعّل الإشعارات على الموبايل ده') + '</button>')

        // 🔔 الشغل
        + (kinds.length
            ? '<div class="sec">🔔 إشعارات الشغل</div><div class="card">'
              + '<div class="row master"><span class="ic">🔔</span><span class="t">كل إشعارات الشغل'
              +   '<small>' + (workOff ? 'مقفولة — الشات لوحده زي ما هو' : 'افتح أو اقفل كل نوع لوحده تحت') + '</small></span>'
              +   sw('work', !workOff, lock) + '</div>'
              + kinds.map(function(k){ return row(k, workOff); }).join('')
              + '</div>'
            : (role ? '<div class="note">مفيش إشعارات شغل لوظيفتك لسه.</div>' : ''))

        // 💬 الشات — مفتاح لوحده
        + (chatOk
            ? '<div class="sec">💬 إشعارات الشات</div><div class="card">'
              + row({ k:'chat_dm',  i:'✉️', t:'الرسايل الخاصة', h:'حد بعتلك رسالة لوحدك' }, false)
              + row({ k:'chat_all', i:'👥', t:'أوضة «الكل»',     h:'أي رسالة في الأوضة العامة' }, false)
              + '</div>'
              + '<div class="note">💡 الشات ليه مفتاح لوحده — تقدر تقفل إشعارات الشغل وتسيب الشات شغّال، أو العكس.</div>'
            : '')

        + (on
            ? '<div class="two">'
              + '<button ' + (S.busy ? 'disabled' : '') + ' onclick="IFixPush.test()">📨 ابعتلي إشعار تجربة</button>'
              + '<button ' + (S.busy ? 'disabled' : '') + ' onclick="IFixPush.disable()">🔕 وقّفها على الموبايل ده</button>'
              + '</div>'
            : '');
    }

    pg.innerHTML =
        '<div class="h"><b>🔔 الإشعارات</b><button class="x" onclick="IFixPush.close()" aria-label="قفل">✕</button></div>'
      + '<div class="wrap"><div class="note">🧸 الإشعار بيوصلك <b>حتى والتطبيق مقفول</b> — زي رسالة الواتساب. كل موبايل بيتفعّل لوحده، والاختيارات تحت بتمشي على كل موبايلاتك.</div>'
      + body + '</div>';
  }

  // ---------- الفتح والقفل ----------
  async function open(){
    try{ if(typeof closeKebab === 'function') closeKebab(); }catch(x){}
    try{ var md = document.getElementById('menuDropdown'); if(md) md.classList.add('hidden'); }catch(x){}
    css();
    if(!document.getElementById('pshPage')){
      var pg = document.createElement('div'); pg.id = 'pshPage'; pg.setAttribute('dir', 'rtl');
      document.body.appendChild(pg);
      try{ document.body.dataset.pshOv = document.body.style.overflow || ''; document.body.style.overflow = 'hidden'; }catch(x){}
    }
    S.loaded = false; paint();
    await loadState(); paint();
  }
  function close(){
    var pg = document.getElementById('pshPage'); if(!pg) return;
    pg.remove();
    try{ document.body.style.overflow = document.body.dataset.pshOv || ''; delete document.body.dataset.pshOv; }catch(x){}
  }

  // 🔴 طلب الإذن لازم يبقى أول حاجة في الدوسة — قبل أي await (قاعدة الأيفون)
  async function enable(){
    if(!can()) return;
    var perm: NotificationPermission = 'default';
    try{ perm = await Notification.requestPermission(); }catch(x){ perm = 'denied'; }
    if(perm !== 'granted'){ toast('الإشعارات اتقفلت. تقدر تفتحها من إعدادات الموبايل في أي وقت.'); paint(); return; }
    S.busy = true; paint();
    try{
      var reg = await swReg();
      var sub = await reg.pushManager.getSubscription();
      if(sub && !keyMatches(sub)){ try{ await sub.unsubscribe(); }catch(x){} sub = null; }
      if(!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyU8(VAPID) });
      await register(sub);
      await loadState();
      S.busy = false; paint();
      toast('🔔 الإشعارات اتفعّلت — دوس «ابعتلي إشعار تجربة» تتأكد');
    }catch(x){
      console.error('[الإشعارات] التفعيل فشل:', x);
      S.busy = false; S.err = errTxt(x); paint();
    }
  }

  async function toggle(k: string): Promise<void> {
    if(S.busy || !S.state) return;
    var cur: string[] = (S.state.muted || []).slice();
    var i = cur.indexOf(k);
    if(i === -1) cur.push(k); else cur.splice(i, 1);
    S.busy = true; paint();
    var r = await sb.rpc('push_set_muted', { p_muted: cur });
    S.busy = false;
    if(r.error){ S.err = errTxt(r.error); paint(); return; }
    // ⚠️ بنتأكد من السيرفر: لو ملف 115 مااتشغّلش، الأنواع الجديدة بتترمي في صمت
    await loadState();
    var saved: string[] = (S.state && S.state.muted) || [];
    if((saved.indexOf(k) !== -1) !== (cur.indexOf(k) !== -1)){
      S.err = 'السيرفر ماحفظش الاختيار ده — محتاج ملف SQL رقم 115';
    }
    paint();
  }

  async function test(){
    if(S.busy) return;
    S.busy = true; paint();
    var r = await sb.rpc('push_test');
    S.busy = false; paint();
    if(r.error){ S.err = errTxt(r.error); paint(); return; }
    if(r.data && r.data.configured === false){
      toast('✅ الموبايل متسجّل، بس السيرفر لسه ما اتوصلش بالـ Edge Function — كلّم المحاسب العام.');
      return;
    }
    toast('📨 اتبعت! اطلع من التطبيق واستنى ثواني — المفروض يوصلك إشعار «تجربة».');
  }

  async function disable(){
    if(!confirm('هتوقّف الإشعارات على الموبايل ده بس (أجهزتك التانية زي ما هي). متأكد؟')) return;
    S.busy = true; paint();
    try{
      var sub = S.sub || await curSub();
      if(sub){
        var r = await sb.rpc('push_unregister', { p_endpoint: sub.endpoint });
        if(r.error) throw r.error;
        try{ await sub.unsubscribe(); }catch(x){}
      }
      await loadState();
    }catch(x){ S.err = errTxt(x); }
    S.busy = false; paint();
  }

  // 🔄 كل مرة التطبيق يفتح: لو الموبايل متفعّل، بنجدّد تسجيله في صمت
  //    (عشان لو دوره اتغيّر، أو المتصفح غيّر عنوان الاشتراك).
  async function autoRefresh(){
    try{
      if(!can() || Notification.permission !== 'granted') return;
      var ss = await sb.auth.getSession();
      if(!ss || !ss.data || !ss.data.session) return;
      var sub = await curSub();
      if(sub && keyMatches(sub)) await register(sub);
    }catch(x){ console.warn('[الإشعارات] تجديد التسجيل:', x); }
  }

  // ---------- الزرار في قايمة ⋮ ----------
  function mount(){
    if(document.getElementById('pshMenuBtn')) return;
    var menu = document.getElementById('kebabMenu') || document.getElementById('menuDropdown') || document.getElementById('menuDrop');
    if(!menu) return;
    var b = document.createElement('button');
    b.id = 'pshMenuBtn';
    b.type = 'button';
    b.textContent = '🔔 الإشعارات';
    b.onclick = function(ev){ if(ev) ev.stopPropagation(); open(); };

    // الداشبورد: الزرار القديم (اللي كان لأربع أدوار بس) → الجديد مكانه
    var old = menu.querySelector('.push-menu-item');
    if(old){ old.parentNode!.insertBefore(b, old); old.remove(); return; }

    var anchor = menu.querySelector('.pay-menu-btn') || menu.querySelector('.att-menu-btn') || document.getElementById('accountMenuBtn');
    if(anchor && anchor.parentNode === menu){ menu.insertBefore(b, anchor.nextSibling); return; }
    var first = menu.querySelector('.mh');
    if(first && first.parentNode === menu){ menu.insertBefore(b, first.nextSibling); return; }
    menu.insertBefore(b, menu.firstChild);
  }

  if(document.readyState === 'loading') addEventListener('DOMContentLoaded', mount); else mount();
  setTimeout(mount, 2500);
  setTimeout(autoRefresh, 4000);   // بعد ما الصفحة تخلص تحميلها
  document.addEventListener('keydown', function(ev){ if(ev.key === 'Escape') close(); });

  // 💬 دوسة على إشعار شات والتطبيق مفتوح → sw.js بيبعت «افتح الشات»
  try{
    navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', function(ev){
      if(!ev.data || ev.data.type !== 'ifx-open-chat') return;
      close();
      try{ if(window.IFixDock) IFixDock.open('chat'); }catch(x){}
    });
  }catch(x){}

  // الداشبورد: أي نداء قديم لـ openPushSettings يفتح الشاشة الجديدة
  window.openPushSettings = open;

  window.IFixPush = { open:open, close:close, enable:enable, toggle:toggle, test:test, disable:disable };
})();
