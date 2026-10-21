// ============================================================
// 🔒 shift-lock.js — «قفل الشاشة برّه الشيفت» (ملف SQL رقم 116)
// ------------------------------------------------------------
// 🧸 بالبلدي — الملف ده ليه وشّين:
//
//   ① الموظف (الاستقبال · أمين الخزنة · الكول سنتر · مسؤول القطع ·
//      التيستر · مسؤول الحركة · الموظف العادي):
//      لو الزرار شغّال في لوحة الأدمن وهو ماحضرش / منصرف / في بريك →
//      الشاشة كلها بتتغطّى بشاشة «🔒 الشاشة مقفولة». فاضل له:
//        ⏰ المواعيد · 💰 مرتبك · 📥 ترتيب الاستلامات · تسجيل الخروج
//      + «📨 اطلب فتح من المحاسب العام» — يكتب عايز يعمل إيه وليه.
//      أول ما يسجّل حضور (أو المحاسب يوافق) → الصفحة بتفتح وتحمّل الشغل.
//      ولو اتفتحله مؤقت → شارة صغيرة تحت «🔓 مفتوح لحد ٣:٤٠».
//
//   ② المحاسب العام (على الداشبورد):
//      لوحة «🔓 طلبات فتح الشاشة» فوق — كل طلب: الاسم · الدور · السبب ·
//      ✅ افتح (٣٠ د · ساعة · ساعتين · مدة تانية) · 🚫 رفض.
//      والمفتوح دلوقتي ليه «⏹️ اقفل دلوقتي». وفي ⋮ «🔓 طلبات فتح الشاشة»
//      بتفتح السجل (آخر ٧ أيام).
//
// 🔒 الحماية الحقيقية على السيرفر (ملف 116): الأجهزة والشات وكل حاجة
//    مقفولين هناك. الشاشة دي بس بتغطّي اللي متحفوظ على الموبايل،
//    وبتقول للموظف يعمل إيه بدل ما يلاقي صفحة فاضية.
//
// 🧱 الطبقات: الشاشة المقفولة على 9300 — تحت «المواعيد» و«مرتبك» (9400)
//    و«ترتيب الاستلامات» (9301) بالظبط، فبيطلعوا فوقها ولما يتقفلوا
//    يرجع يلاقي القفل.
//
// 🖥️ (ملف 117) «حساب جهاز ثابت» (كمبيوتر المحل): مابيتقفلش خالص، وزراير
//    «المواعيد» و«مرتبك» بتستخبى من عنده — مالوش موظف يحضر أو ياخد مرتب.
//
// 📍 common.js بيحمّله في: dashboard · dispatch · parts · tester · staff
// ⚠️ ملف 116 مااتشغّلش؟ → الملف بيسكت خالص (ولا بيقفل على حد).
// ⚠️ النت فصل وهو مقفول؟ → بيفضل مقفول (مانفتحش بسبب غلطة نت).
//
// 🟦 (٢٠٢٦-١٠-٢١) بقى TypeScript (ts/shift-lock.ts → shift-lock.js)
//    🧸 نفس الكود بالحرف — اتزوّد بس «ورق» بيقول نوع كل حاجة.
//       المترجم بيشيل الورق ده والمتصفح بياخد نفس الـ js القديم.
// ============================================================
// 🏷️ الأنواع — بتختفي بعد الترجمة
/** طلب فتح واحد (بتاعي) */
interface ShiftUnlockReq {
  id: string;
  at: string;
  reason: string;
  /** pending · approved · rejected · cancelled */
  status?: string;
  note?: string | null;
  until?: string | null;
}
/** رد shift_lock_state() — حالتي دلوقتي */
interface ShiftState {
  /** 🖥️ حساب جهاز ثابت (ملف 117) */
  station?: boolean;
  role?: string;
  /** دوري ممكن يتقفل أصلاً؟ */
  lockable?: boolean;
  locked?: boolean;
  on_duty?: boolean;
  /** in · out · break · resume */
  last_kind?: string | null;
  last_at?: string | null;
  unlock_until?: string | null;
  pending?: ShiftUnlockReq | null;
  last?: ShiftUnlockReq | null;
}
/** طلب في لوحة المحاسب العام — من shift_unlock_list() */
interface ShiftUnlockRow {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  at: string;
  reason: string;
  status: string;
  /** مفتوح دلوقتي */
  active?: boolean;
  on_duty?: boolean;
  until?: string | null;
  minutes?: number | null;
  ended_at?: string | null;
  note?: string | null;
  decided_at?: string | null;
}
interface ShiftUnlockList { enabled?: boolean; rows: ShiftUnlockRow[]; }
interface ShiftLockState {
  st: ShiftState | null;
  /** ملف 116 مااتشغّلش → الميزة ساكتة */
  missing: boolean;
  busy: boolean;
  wasLocked: boolean;
  /** بصمة آخر رسمة — عشان مانرسمش على الفاضي */
  sig: string;
  /** اللي الموظف كاتبه في طلب الفتح */
  draft: string;
  pollT: number;
  untilT: number;
  sending: boolean;
  admin: boolean;
  list: ShiftUnlockList | null;
  aBusy: boolean;
  aPollT: number;
  /** الطلبات اللي شفناها — عشان التنبيه يطلع للجديد بس */
  seen: Record<string, number> | null;
}
interface IFixShiftLockApi {
  check(): Promise<void>;
  att(): void;
  pay(): void;
  rank(): void;
  recheck(btn?: HTMLButtonElement | null): Promise<void>;
  send(): Promise<void>;
  cancel(): Promise<void>;
  logout(): unknown;
  draft(v: string): void;
  ok(id: string, minutes: number): void;
  no(id: string): void;
  end(id: string): Promise<void>;
  log(): void;
  closeLog(): void;
  reload(): void;
  state(): ShiftState | null;
}
declare var IFixShiftLock: IFixShiftLockApi;

(function(){
  if(window.IFixShiftLock) return;

  var PAGE = (location.pathname.split('/').pop() || '').toLowerCase().replace(/\.html$/, '') || 'index';
  var ROLE_AR: Record<string, string> = {
    reception:'موظف الاستقبال', accountant:'أمين الخزنة', callcenter:'الكول سنتر',
    parts:'مسؤول القطع', tester:'مسؤول الفحص', dispatcher:'مسؤول الحركة', staff:'موظف'
  };

  var S: ShiftLockState = {
    st:null, missing:false, busy:false, wasLocked:false, sig:'', draft:'',
    pollT:0, untilT:0, sending:false,
    // المحاسب العام
    admin:false, list:null, aBusy:false, aPollT:0, seen:null
  };

  // ---------- أدوات ----------
  function e(s: unknown): string {
    return (typeof esc === 'function') ? esc(s)
      : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
          return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' } as Record<string, string>)[c];
        });
  }
  function hm(iso: string | null | undefined): string {
    try{ return new Date(iso!).toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit', timeZone:'Africa/Cairo' }); }
    catch(x){ return ''; }
  }
  function ago(iso: string): string {
    var m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
    if(m < 1) return 'دلوقتي';
    if(m < 60) return 'من ' + m + ' دقيقة';
    var h = Math.floor(m / 60);
    if(h < 24) return 'من ' + h + ' ساعة';
    return 'من ' + Math.floor(h / 24) + ' يوم';
  }
  function dur(min: any): string {
    min = Number(min) || 0;
    if(min < 60) return min + ' دقيقة';
    var h = Math.floor(min / 60), r = min % 60;
    return (h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : h + ' ساعات') + (r ? ' و' + r + ' د' : '');
  }
  function cleanErr(x: any): string {
    var m = (x && x.message) ? x.message : String(x);
    return m.replace(/^SHIFT_LOCK\|/, '');
  }
  function isMissing(m: string | null | undefined): boolean { return /shift_lock_state|shift_unlock_list|PGRST202|does not exist|schema cache/i.test(m || ''); }

  // ---------- الستايل ----------
  function css(){
    if(document.getElementById('slCss')) return;
    var st = document.createElement('style');
    st.id = 'slCss';
    st.textContent =
      // ألوان الملف من data-theme — مش معتمد على متغيرات أي صفحة
        '#ifxShiftLock,#slChip,#sulSheet{--sl-bg:#ECECE9;--sl-card:#FFFFFF;--sl-line:#DEDED9;--sl-ink:#0C0C0E;'
      +   '--sl-ink2:#45464C;--sl-mut:#6A6C73;--sl-ember:#EE5B10;--sl-ember-ink:#B8460A;--sl-red:#DC2626;--sl-green:#16A34A;}'
      + 'html[data-theme="dark"] #ifxShiftLock,html[data-theme="dark"] #slChip,html[data-theme="dark"] #sulSheet{'
      +   '--sl-bg:#0C0C0E;--sl-card:#17171A;--sl-line:#2B2C31;--sl-ink:#F2F2F0;--sl-ink2:#C6C7CB;--sl-mut:#9A9CA3;'
      +   '--sl-ember:#FC6818;--sl-ember-ink:#FF8A4C;--sl-red:#F87171;--sl-green:#4ADE80;}'

      // ===== الشاشة المقفولة =====
      + '#ifxShiftLock{position:fixed;inset:0;z-index:9300;background:var(--sl-bg);color:var(--sl-ink);'
      +   'overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;'
      +   'font-family:Tajawal,system-ui,-apple-system,sans-serif;}'
      + 'html.ifx-shift-locked,html.ifx-shift-locked body{overflow:hidden !important;}'
      + '#ifxShiftLock .sl-wrap{max-width:460px;margin:0 auto;'
      +   'padding:calc(28px + env(safe-area-inset-top)) 18px calc(80px + env(safe-area-inset-bottom));}'
      + '#ifxShiftLock .sl-ic{width:74px;height:74px;margin:0 auto 12px;border-radius:22px;display:flex;'
      +   'align-items:center;justify-content:center;font-size:38px;background:var(--sl-card);'
      +   'border:1px solid var(--sl-line);box-shadow:0 6px 18px rgba(0,0,0,.08);}'
      + '#ifxShiftLock h2{text-align:center;margin:0 0 6px;font:900 21px/1.4 Cairo,Tajawal,sans-serif;}'
      + '#ifxShiftLock .sl-why{text-align:center;color:var(--sl-ink2);font-size:14px;line-height:1.9;margin:0 0 18px;}'
      + '#ifxShiftLock .sl-why b{color:var(--sl-ember-ink);}'
      + '#ifxShiftLock .sl-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;}'
      + '#ifxShiftLock .sl-btn{display:block;width:100%;border:1px solid var(--sl-line);background:var(--sl-card);'
      +   'color:var(--sl-ink);border-radius:14px;padding:15px 10px;font:800 14.5px/1.4 Tajawal,sans-serif;cursor:pointer;'
      +   'text-align:center;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}'
      + '#ifxShiftLock .sl-btn:active{transform:scale(.98);}'
      + '#ifxShiftLock .sl-btn.big{grid-column:1/-1;background:var(--sl-ember);border-color:var(--sl-ember);color:#0C0C0E;font-weight:900;}'
      + '#ifxShiftLock .sl-btn.ghost{background:none;color:var(--sl-ink2);}'
      + '#ifxShiftLock .sl-btn.out{background:none;border:none;color:var(--sl-red);margin-top:18px;}'
      + '#ifxShiftLock .sl-btn:disabled{opacity:.5;cursor:default;}'
      + '#ifxShiftLock .sl-sec{margin-top:22px;background:var(--sl-card);border:1px solid var(--sl-line);'
      +   'border-radius:16px;padding:16px;}'
      + '#ifxShiftLock .sl-sec-h{font:900 15px/1.5 Tajawal,sans-serif;margin-bottom:4px;}'
      + '#ifxShiftLock .sl-sec-s{font-size:12.5px;color:var(--sl-mut);line-height:1.8;margin-bottom:10px;}'
      + '#ifxShiftLock textarea{width:100%;box-sizing:border-box;min-height:96px;resize:vertical;border:1px solid var(--sl-line);'
      +   'border-radius:12px;padding:11px 12px;background:var(--sl-bg);color:var(--sl-ink);'
      +   'font:500 16px/1.7 Tajawal,sans-serif;margin-bottom:10px;}'
      + '#ifxShiftLock textarea:focus{outline:2px solid var(--sl-ember);outline-offset:0;}'
      + '#ifxShiftLock .sl-wait{border:1.5px solid var(--sl-ember);background:rgba(252,104,24,.08);border-radius:13px;'
      +   'padding:13px;font-size:13.5px;line-height:1.9;}'
      + '#ifxShiftLock .sl-wait q{display:block;quotes:none;margin:6px 0;padding:8px 10px;border-radius:9px;'
      +   'background:var(--sl-card);color:var(--sl-ink2);white-space:pre-wrap;word-break:break-word;}'
      + '#ifxShiftLock .sl-no{border:1px solid rgba(220,38,38,.35);background:rgba(220,38,38,.07);color:var(--sl-ink);'
      +   'border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.8;margin-bottom:12px;}'
      + '#ifxShiftLock .sl-err{color:var(--sl-red);font-size:12.5px;font-weight:800;min-height:18px;margin-bottom:6px;}'
      + '#ifxShiftLock .sl-ok{text-align:center;font:900 16px/1.8 Tajawal,sans-serif;color:var(--sl-green);padding:30px 10px;}'

      // ===== 🖥️ حساب جهاز ثابت (ملف 117): من غير مواعيد ولا مرتب =====
      // ⚠️ !important عشان attendance.js و payroll.js بيظهّروا الزراير بنفسهم كل شوية
      + 'html.ifx-station .att-menu-btn,html.ifx-station .pay-menu-btn,html.ifx-station .pay-self-menu-btn,'
      +   'html.ifx-station #payBanner,html.ifx-station .pay-dot{display:none !important;}'

      // ===== شارة «مفتوح مؤقت» =====
      + '#slChip{position:fixed;inset-inline-start:12px;bottom:calc(44px + env(safe-area-inset-bottom));z-index:9290;'
      +   'background:var(--sl-card);color:var(--sl-ink);border:1px solid var(--sl-ember);border-radius:999px;'
      +   'padding:7px 13px;font:800 12.5px/1.4 Tajawal,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.18);}'

      // ===== لوحة المحاسب العام (جوه الداشبورد — بألوانه) =====
      + '#sulHost:empty{display:none;}'
      + '#sulHost .sul-panel{background:var(--surface,#fff);border:1px solid rgba(252,104,24,.45);'
      +   'border-inline-start:4px solid #FC6818;border-radius:16px;margin:14px 22px 0;padding:14px 16px;'
      +   'box-shadow:0 4px 16px rgba(0,0,0,.08);color:var(--ink,#111);}'
      + '#sulHost .sul-h{display:flex;align-items:center;gap:8px;font:900 15px/1.4 Cairo,sans-serif;margin-bottom:10px;}'
      + '#sulHost .sul-n{background:#DC2626;color:#fff;font:800 12px/22px Tajawal,sans-serif;min-width:22px;'
      +   'height:22px;border-radius:11px;text-align:center;padding:0 6px;}'
      + '#sulHost .sul-log{margin-inline-start:auto;border:none;background:none;color:var(--muted,#666);'
      +   'font:800 12.5px/1 Tajawal,sans-serif;cursor:pointer;padding:6px;}'
      + '.sul-row{border:1px solid var(--border,#ddd);background:var(--surface-2,#f7f7f5);border-radius:12px;'
      +   'padding:11px 12px;margin-bottom:9px;}'
      + '.sul-row:last-child{margin-bottom:0;}'
      + '.sul-who{font-weight:900;font-size:14px;}'
      + '.sul-who small{font-weight:700;color:var(--muted,#666);font-size:12px;}'
      + '.sul-why{margin:7px 0 9px;padding:8px 10px;border-radius:9px;background:var(--surface,#fff);'
      +   'border:1px dashed var(--border,#ddd);font-size:13.5px;line-height:1.85;white-space:pre-wrap;word-break:break-word;}'
      + '.sul-acts{display:flex;flex-wrap:wrap;gap:6px;}'
      + '.sul-b{border:1px solid var(--border,#ddd);background:var(--surface,#fff);color:var(--ink,#111);'
      +   'border-radius:9px;padding:8px 11px;font:800 12.5px/1.2 Tajawal,sans-serif;cursor:pointer;}'
      + '.sul-b.ok{background:#16A34A;border-color:#16A34A;color:#fff;}'
      + '.sul-b.no{color:#DC2626;border-color:rgba(220,38,38,.45);}'
      + '.sul-b:disabled{opacity:.5;cursor:default;}'
      + '.sul-tag{display:inline-block;font-size:11px;font-weight:800;border-radius:7px;padding:2px 8px;margin-inline-start:6px;}'
      + '.sul-tag.on{background:rgba(22,163,74,.14);color:#16A34A;}'
      + '.sul-tag.open{background:rgba(252,104,24,.14);color:#B8460A;}'
      + 'html[data-theme="dark"] .sul-tag.open{color:#FF8A4C;}'

      // ===== سجل الطلبات (صفحة كاملة) =====
      + '#sulSheet{position:fixed;inset:0;z-index:9302;overflow-y:auto;-webkit-overflow-scrolling:touch;'
      +   'overscroll-behavior:contain;background:var(--sl-bg);color:var(--sl-ink);font-family:Tajawal,system-ui,sans-serif;}'
      + '#sulSheet .h{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;background:#0C0C0E;'
      +   'color:#F2F2F0;padding:calc(12px + env(safe-area-inset-top)) 16px 12px;}'
      + '#sulSheet .h b{flex:1;font:900 17px/1.4 Cairo,sans-serif;}'
      + '#sulSheet .x{border:none;background:rgba(242,242,240,.10);color:inherit;width:34px;height:34px;border-radius:10px;font-size:17px;cursor:pointer;}'
      + '#sulSheet .wrap{max-width:720px;margin:0 auto;padding:14px 16px calc(70px + env(safe-area-inset-bottom));}'
      + '#sulSheet .sul-row{background:var(--sl-card);border-color:var(--sl-line);}'
      + '#sulSheet .sul-why{background:var(--sl-bg);border-color:var(--sl-line);}'
      + '#sulSheet .st{font-size:12px;font-weight:800;margin-top:4px;line-height:1.8;color:var(--sl-mut);}'
      + '#sulSheet .empty{text-align:center;color:var(--sl-mut);padding:30px 10px;}';
    (document.head || document.documentElement).appendChild(st);
  }

  // ############################################################
  // ① الموظف
  // ############################################################

  // ---------- السؤال للسيرفر ----------
  async function check(){
    if(S.busy || S.missing) return;
    S.busy = true;
    try{
      var res = await sb.rpc('shift_lock_state');
      // ⚠️ Supabase مبيرميش خطأ — بيرجّعه في .error
      if(res.error) throw res.error;
      S.st = res.data || {};
    }catch(x: any){
      var m = (x && x.message) ? x.message : String(x);
      if(isMissing(m)){ S.missing = true; console.info('[قفل الشيفت] ملف 116 مااتشغّلش — الميزة ساكتة'); }
      else console.warn('[قفل الشيفت] مقدرناش نسأل السيرفر:', m);
      S.busy = false;
      // ⚠️ مقفول وحصلت غلطة نت؟ بيفضل مقفول — مانفتحش بسبب غلطة
      return;
    }
    S.busy = false;
    apply();
  }

  function apply(){
    var st: ShiftState = S.st || {};
    // 🖥️ (ملف 117) حساب جهاز ثابت: مالوش مواعيد ولا مرتب — الزراير تستخبى
    document.documentElement.classList.toggle('ifx-station', !!st.station);
    if(st.station){ css(); hideLock(); paintChip(); return; }
    if(st.role === 'super_admin'){
      if(PAGE === 'dashboard') adminBoot();
      return;
    }
    if(!st.lockable){ hideLock(); paintChip(); return; }   // دور مالوش دعوة
    if(st.locked){
      S.wasLocked = true;
      showLock();
    }else{
      if(S.wasLocked){ unlockedNow(); return; }
      hideLock();
    }
    paintChip();
    armUntil();
    schedule();
  }

  // كل قد إيه نسأل؟ — مقفول ومستني رد: ١٠ ثواني · مقفول: ٢٠ · مفتوح: ٤٥
  function schedule(){
    clearTimeout(S.pollT);
    var st: ShiftState = S.st || {};
    if(!st.lockable) return;
    var ms = st.locked ? (st.pending ? 10000 : 20000) : 45000;
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

  // اتفتحت بعد ما كانت مقفولة → نعيد فتح الصفحة عشان الشغل يتحمّل
  // (وهي مقفولة السيرفر كان بيرجّع «ولا جهاز»)
  function unlockedNow(){
    var ov = document.getElementById('ifxShiftLock');
    if(ov) ov.innerHTML = '<div class="sl-wrap"><div class="sl-ok">✅ الشاشة اتفتحت<br>'
      + '<span style="font-size:13px;font-weight:700;color:var(--sl-mut);">بنحمّل الشغل…</span></div></div>';
    setTimeout(function(){ location.reload(); }, 900);
  }

  // ---------- الشاشة ----------
  function closeMenus(){
    ['menuDropdown','kebabMenu','menuDrop'].forEach(function(id){
      var m = document.getElementById(id);
      if(m){ m.classList.add('hidden'); m.classList.remove('open', 'show'); }
    });
  }

  function showLock(){
    css();
    var ov = document.getElementById('ifxShiftLock');
    if(!ov){
      ov = document.createElement('div');
      ov.id = 'ifxShiftLock';
      ov.setAttribute('dir', 'rtl');
      (document.body || document.documentElement).appendChild(ov);
      closeMenus();
    }
    document.documentElement.classList.add('ifx-shift-locked');
    paintLock(false);
  }
  function hideLock(){
    var ov = document.getElementById('ifxShiftLock');
    if(ov) ov.remove();
    document.documentElement.classList.remove('ifx-shift-locked');
  }

  function whyText(st: ShiftState): string {
    var k = st.last_kind, at = st.last_at;
    if(!k) return 'لسه <b>ماسجّلتش حضور</b> النهارده.';
    if(k === 'out') return 'إنت <b>منصرف</b> من الساعة ' + e(hm(at)) + '.';
    if(k === 'break') return 'إنت <b>في بريك</b> من الساعة ' + e(hm(at)) + ' — دوس «استئناف العمل» في المواعيد.';
    return 'آخر حضور ليك <b>قديم</b> (غالباً نسيت تنصرف) — سجّل حضور جديد.';
  }

  // بنرسم من جديد بس لو حاجة اتغيّرت — عشان الكلام اللي بيكتبه مايضيعش
  function paintLock(force: boolean): void {
    var ov = document.getElementById('ifxShiftLock');
    if(!ov) return;
    var st: ShiftState = S.st || {};
    var sig = JSON.stringify([st.last_kind, st.last_at, st.pending && st.pending.id, st.last && st.last.id, S.sending]);
    if(!force && sig === S.sig && ov.firstChild) return;
    S.sig = sig;

    var canAtt = typeof window.openAttendance === 'function';
    var canPay = typeof window.openPayroll === 'function' && document.getElementById('payOverlay');
    var canRank = !!window.IFixIntakeBoard;

    var btns = '';
    if(canAtt) btns += '<button class="sl-btn big" onclick="IFixShiftLock.att()">⏰ المواعيد — سجّل حضورك</button>';
    if(canPay) btns += '<button class="sl-btn" onclick="IFixShiftLock.pay()">💰 مرتبك</button>';
    if(canRank) btns += '<button class="sl-btn" onclick="IFixShiftLock.rank()">📥 ترتيب الاستلامات</button>';
    btns += '<button class="sl-btn ghost" style="grid-column:1/-1;" onclick="IFixShiftLock.recheck(this)">🔄 سجّلت حضور — افتح الشاشة</button>';

    // ---- طلب الفتح ----
    var req = '';
    if(st.pending){
      req = '<div class="sl-wait">⏳ <b>طلبك عند المحاسب العام</b> — اتبعت ' + e(ago(st.pending.at))
        + '<q>' + e(st.pending.reason) + '</q>'
        + 'أول ما يرد الشاشة هتتفتح لوحدها.</div>'
        + '<button class="sl-btn ghost" style="margin-top:10px;" onclick="IFixShiftLock.cancel()">↩️ إلغاء الطلب</button>';
    }else{
      var last = st.last, note = '';
      if(last && last.status === 'rejected' && Date.now() - Date.parse(last.at) < 12 * 3600000){
        note = '<div class="sl-no">🚫 آخر طلب ليك <b>اترفض</b> ' + e(ago(last.at))
          + (last.note ? '<br>السبب: ' + e(last.note) : '') + '</div>';
      }else if(last && last.status === 'approved' && last.until && Date.parse(last.until) <= Date.now()
               && Date.now() - Date.parse(last.until) < 12 * 3600000){
        note = '<div class="sl-no" style="border-color:rgba(252,104,24,.4);background:rgba(252,104,24,.07);">'
          + '⌛ الفتح المؤقت خلص الساعة ' + e(hm(last.until)) + '</div>';
      }
      req = note
        + '<textarea id="slReason" maxlength="1000" placeholder="مثلاً: عميل جاي ياخد جهازه دلوقتي ومحتاج أسلّمه…" '
        +   'oninput="IFixShiftLock.draft(this.value)">' + e(S.draft) + '</textarea>'
        + '<div class="sl-err" id="slErr"></div>'
        + '<button class="sl-btn big" id="slSend" onclick="IFixShiftLock.send()"' + (S.sending ? ' disabled' : '') + '>'
        +   (S.sending ? '⏳ بنبعت…' : '📨 ابعت للمحاسب العام') + '</button>';
    }

    ov.innerHTML =
        '<div class="sl-wrap">'
      + '<div class="sl-ic">🔒</div>'
      + '<h2>الشاشة مقفولة</h2>'
      + '<p class="sl-why">' + whyText(st) + '<br>الشغل بيتفتح أول ما تسجّل حضور.</p>'
      + '<div class="sl-grid">' + btns + '</div>'
      + '<div class="sl-sec">'
      +   '<div class="sl-sec-h">🔓 محتاج تفتح وإنت برّه الشيفت؟</div>'
      +   '<div class="sl-sec-s">اكتب للمحاسب العام إنت عايز تعمل إيه وليه — لو وافق الشاشة هتتفتح لمدة هو بيحددها.</div>'
      +   req
      + '</div>'
      + '<button class="sl-btn out" onclick="IFixShiftLock.logout()">⏻ تسجيل الخروج</button>'
      + '</div>';
  }

  // ---------- شارة «مفتوح مؤقت» ----------
  function paintChip(){
    var st: ShiftState = S.st || {};
    var on = st.lockable && !st.locked && !st.on_duty && st.unlock_until;
    var c = document.getElementById('slChip');
    if(!on){ if(c) c.remove(); return; }
    css();
    if(!c){
      c = document.createElement('div');
      c.id = 'slChip';
      c.setAttribute('dir', 'rtl');
      document.body.appendChild(c);
    }
    c.textContent = '🔓 مفتوح مؤقت لحد ' + hm(st.unlock_until);
  }

  // ---------- الأزرار ----------
  async function send(){
    if(S.sending) return;
    var ta = document.getElementById('slReason') as HTMLTextAreaElement | null;
    var txt = (ta ? ta.value : S.draft || '').trim();
    var er = document.getElementById('slErr');
    if(txt.length < 5){
      if(er) er.textContent = 'اكتب إنت عايز تعمل إيه وليه (٥ حروف على الأقل)';
      if(ta) ta.focus();
      return;
    }
    S.sending = true; paintLock(true);
    try{
      var res = await sb.rpc('shift_unlock_request', { p_reason: txt });
      if(res.error) throw res.error;
      S.draft = '';
      S.sending = false;
      await check();
      paintLock(true);
    }catch(x){
      S.sending = false;
      paintLock(true);
      var er2 = document.getElementById('slErr');
      if(er2) er2.textContent = '❌ ' + cleanErr(x);
    }
  }

  async function cancel(){
    var p = S.st && S.st.pending;
    if(!p || !confirm('تلغي طلب الفتح؟')) return;
    try{
      var res = await sb.rpc('shift_unlock_cancel', { p_id: p.id });
      if(res.error) throw res.error;
    }catch(x){ alert('❌ ' + cleanErr(x)); }
    await check();
    paintLock(true);
  }

  async function recheck(btn: HTMLButtonElement | null | undefined){
    if(btn){ btn.disabled = true; btn.textContent = '⏳ بنشوف…'; }
    await check();
    if(S.st && S.st.locked){
      paintLock(true);
      if(S.st.last_kind !== 'in' && S.st.last_kind !== 'resume'){
        setTimeout(function(){ alert('لسه مفيش حضور متسجّل — افتح «⏰ المواعيد» وسجّل حضور الأول.'); }, 50);
      }
    }
  }

  function doLogout(){
    if(!confirm('تسجيل الخروج؟')) return;
    try{
      if(typeof window.logout === 'function') return window.logout();
      if(typeof window.doLogout === 'function') return window.doLogout();
    }catch(x){}
    Promise.resolve().then(function(){ return sb.auth.signOut(); })
      .catch(function(){}).then(function(){ location.href = 'index.html'; });
  }

  // ---------- ربط المواعيد: بعد أي تسجيل → نسأل تاني على طول ----------
  // ⚠️ attPunch لازم تبدأ **فوراً** في نفس الدوسة (سفاري وإذن الموقع) —
  //    الغلاف بينادي الأصلية على طول من غير أي انتظار قبلها.
  function hookAttendance(){
    try{
      if(typeof window.attPunch === 'function' && !window.attPunch.__sl){
        var op = window.attPunch;
        var wp: LegacyFn = async function(this: any){
          try{ return await op.apply(this, arguments as any); }
          finally{ setTimeout(check, 700); }
        };
        wp.__sl = 1;
        window.attPunch = wp;
      }
      if(typeof window.closeAttendance === 'function' && !window.closeAttendance.__sl){
        var oc = window.closeAttendance;
        var wc: LegacyFn = function(this: any){ var r = oc.apply(this, arguments as any); setTimeout(check, 300); return r; };
        wc.__sl = 1;
        window.closeAttendance = wc;
      }
    }catch(x){ console.warn('[قفل الشيفت] ربط المواعيد:', x); }
  }

  // ############################################################
  // ② المحاسب العام
  // ############################################################
  function adminBoot(){
    if(S.admin) return;
    S.admin = true;
    css();
    mountAdminMenu();
    setTimeout(mountAdminMenu, 2500);
    loadList();
    document.addEventListener('visibilitychange', function(){ if(!document.hidden) loadList(); });
  }

  function host(): HTMLElement {
    var h = document.getElementById('sulHost');
    if(h) return h;
    h = document.createElement('div');
    h.id = 'sulHost';
    var a = document.getElementById('ntfBanners') || document.getElementById('approvalsHost');
    if(a && a.parentNode){
      if(a.id === 'ntfBanners') a.parentNode.insertBefore(h, a.nextSibling);
      else a.parentNode.insertBefore(h, a);
    }else{
      var tb = document.querySelector('.topbar');
      if(tb && tb.parentNode) tb.parentNode.insertBefore(h, tb.nextSibling);
      else document.body.insertBefore(h, document.body.firstChild);
    }
    return h;
  }

  async function loadList(days?: number){
    if(S.aBusy) return;
    S.aBusy = true;
    try{
      var res = await sb.rpc('shift_unlock_list', { p_days: days || 7 });
      if(res.error) throw res.error;
      S.list = res.data || { rows: [] };
      notifyNew();
    }catch(x){
      var m = cleanErr(x);
      if(isMissing(m)){ S.aBusy = false; return; }   // ملف 116 مااتشغّلش
      console.warn('[طلبات الفتح]', m);
    }
    S.aBusy = false;
    paintAdmin();
    paintSheet();
    clearTimeout(S.aPollT);
    S.aPollT = setTimeout(function(){ if(!document.hidden) loadList(); else S.aPollT = setTimeout(loadList, 20000); }, 20000);
  }

  // طلب جديد وصل والصفحة مفتوحة → رجّة + تنبيه
  function notifyNew(){
    var rows = (S.list && S.list.rows) || [];
    var pend = rows.filter(function(r){ return r.status === 'pending'; });
    if(S.seen === null){ S.seen = {}; pend.forEach(function(r){ S.seen![r.id] = 1; }); return; }
    var fresh = pend.filter(function(r){ return !S.seen![r.id]; });
    pend.forEach(function(r){ S.seen![r.id] = 1; });
    if(!fresh.length) return;
    try{ if(navigator.vibrate) navigator.vibrate([120, 60, 120]); }catch(x){}
    try{ if(typeof ph1Toast === 'function') ph1Toast('🔓 طلب فتح الشاشة من ' + (fresh[0].name || fresh[0].email)); }catch(x){}
  }

  function rowHtml(r: ShiftUnlockRow, inSheet: boolean): string {
    var who = '<div class="sul-who">👤 ' + e(r.name || r.email)
      + ' <small>· ' + e(ROLE_AR[r.role!] || r.role || '') + ' · ' + e(ago(r.at)) + '</small>'
      + (r.on_duty ? '<span class="sul-tag on">🟢 حضر خلاص</span>' : '')
      + (r.active ? '<span class="sul-tag open">🔓 مفتوح لحد ' + e(hm(r.until)) + '</span>' : '')
      + '</div>';
    var why = '<div class="sul-why">' + e(r.reason) + '</div>';
    var acts = '';
    if(r.status === 'pending'){
      acts = '<div class="sul-acts">'
        + '<button class="sul-b ok" onclick="IFixShiftLock.ok(\'' + r.id + '\',30)">✅ افتح ٣٠ د</button>'
        + '<button class="sul-b ok" onclick="IFixShiftLock.ok(\'' + r.id + '\',60)">✅ ساعة</button>'
        + '<button class="sul-b ok" onclick="IFixShiftLock.ok(\'' + r.id + '\',120)">✅ ساعتين</button>'
        + '<button class="sul-b" onclick="IFixShiftLock.ok(\'' + r.id + '\',0)">⏱️ مدة تانية</button>'
        + '<button class="sul-b no" onclick="IFixShiftLock.no(\'' + r.id + '\')">🚫 رفض</button>'
        + '</div>';
    }else if(r.active){
      acts = '<div class="sul-acts"><button class="sul-b no" onclick="IFixShiftLock.end(\'' + r.id + '\')">⏹️ اقفل دلوقتي</button></div>';
    }
    var stLine = '';
    if(inSheet && r.status !== 'pending'){
      var t = r.status === 'approved'
        ? '✅ اتوافق ' + dur(r.minutes) + (r.ended_at ? ' · ⏹️ اتقفل بدري ' + hm(r.ended_at) : (r.active ? '' : ' · خلص ' + hm(r.until)))
        : r.status === 'rejected' ? '🚫 اترفض' : '↩️ اتلغى';
      stLine = '<div class="st">' + e(t) + (r.note ? ' — ' + e(r.note) : '')
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
      +   '<button class="sul-log" onclick="IFixShiftLock.log()">📜 السجل</button></div>'
      + show.map(function(r){ return rowHtml(r, false); }).join('')
      + '</div>';
  }

  // ---- زرار في ⋮ (جوه «🛡️ إدارة النظام») ----
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
    paintAdminMenu(0);
  }
  function paintAdminMenu(n: number): void {
    var b = document.getElementById('sulMenuBtn');
    if(!b) return;
    b.innerHTML = '🔓 طلبات فتح الشاشة' + (n ? ' <span class="ntf-n">' + n + '</span>' : '');
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
    loadList(7);
  }
  function closeLog(){
    var sh = document.getElementById('sulSheet'); if(!sh) return;
    sh.remove();
    try{ document.body.style.overflow = document.body.dataset.sulOv || ''; delete document.body.dataset.sulOv; }catch(x){}
  }
  function paintSheet(){
    var sh = document.getElementById('sulSheet'); if(!sh) return;
    var L: Partial<ShiftUnlockList> = S.list || {};
    var rows = L.rows || [];
    sh.innerHTML = '<div class="h"><b>🔓 طلبات فتح الشاشة</b>'
      + '<button class="x" onclick="IFixShiftLock.reload()" title="تحديث">🔄</button>'
      + '<button class="x" onclick="IFixShiftLock.closeLog()" aria-label="قفل">✕</button></div>'
      + '<div class="wrap">'
      + '<div class="st" style="margin-bottom:12px;">'
      +   (L.enabled ? '🔒 القفل شغّال' : '⏸️ القفل مقفول من لوحة الأدمن — محدش هيطلب دلوقتي')
      +   ' · آخر ٧ أيام</div>'
      + (rows.length ? rows.map(function(r){ return rowHtml(r, true); }).join('')
                     : '<div class="empty">مفيش طلبات في آخر ٧ أيام</div>')
      + '</div>';
  }

  // ---- القرارات ----
  async function decide(id: string, ok: boolean, minutes: number | null, note: string | null){
    if(S.aBusy) return;
    S.aBusy = true;
    try{
      var res = await sb.rpc('shift_unlock_decide', { p_id: id, p_approve: ok, p_minutes: ok ? minutes : null, p_note: note || null });
      if(res.error) throw res.error;
    }catch(x){ alert('❌ ' + cleanErr(x)); }
    S.aBusy = false;
    loadList();
  }
  function approve(id: string, minutes: number){
    if(!minutes){
      var v = prompt('تفتحله قد إيه؟ (بالدقايق — من ٥ لـ ٧٢٠)', '45');
      if(v === null) return;
      minutes = parseInt(String(v).replace(/[٠-٩]/g, function(d){ return '٠١٢٣٤٥٦٧٨٩'.indexOf(d) as any; }), 10);
      if(!(minutes >= 5 && minutes <= 720)){ alert('اكتب رقم من ٥ لـ ٧٢٠'); return; }
    }
    var r = ((S.list && S.list.rows) || []).filter(function(x){ return x.id === id; })[0];
    if(!confirm('تفتح الشاشة لـ «' + ((r && (r.name || r.email)) || '') + '» لمدة ' + dur(minutes) + '؟')) return;
    decide(id, true, minutes, '');
  }
  function reject(id: string){
    var n = prompt('سبب الرفض؟ (اختياري — هيوصل للموظف)', '');
    if(n === null) return;
    decide(id, false, null, n);
  }
  async function endNow(id: string){
    if(!confirm('تقفل الشاشة عليه دلوقتي حالاً؟')) return;
    try{
      var res = await sb.rpc('shift_unlock_end', { p_id: id });
      if(res.error) throw res.error;
    }catch(x){ alert('❌ ' + cleanErr(x)); }
    loadList();
  }

  // ############################################################
  // التشغيل
  // ############################################################
  async function boot(){
    try{
      var r = await sb.auth.getSession();
      if(!(r && r.data && r.data.session)) return;   // لسه ما دخلش
    }catch(x){ return; }
    hookAttendance();
    setTimeout(hookAttendance, 2000);
    check();
    document.addEventListener('visibilitychange', function(){ if(!document.hidden) check(); });
    addEventListener('online', function(){ check(); });
  }
  if(document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();

  window.IFixShiftLock = {
    check: check,
    // الموظف
    att: function(){ try{ window.openAttendance!(); }catch(x){ alert('❌ ' + x); } },
    pay: function(){ try{ window.openPayroll!(); }catch(x){ alert('❌ ' + x); } },
    rank: function(){ try{ window.IFixIntakeBoard.open(); }catch(x){ alert('❌ ' + x); } },
    recheck: recheck, send: send, cancel: cancel, logout: doLogout,
    draft: function(v){ S.draft = v; var er = document.getElementById('slErr'); if(er) er.textContent = ''; },
    // المحاسب العام
    ok: approve, no: reject, end: endNow, log: openLog, closeLog: closeLog,
    reload: function(){ loadList(7); },
    state: function(){ return S.st; }
  };
})();
