// ============================================================
// erp-docs.js — 📑 أرقام المستندات على الجهاز (ملف SQL رقم 103)
// ------------------------------------------------------------
// 🧸 بالبلدي: السيرفر بقى بيدّي كل جهاز «ورق رسمي» بأرقام مسلسلة
//    (🧾 أمر شغل · 💰 سند عربون · 📦 فاتورة تسليم · 🚫 إذن خروج · ↩️ رد عربون)
//    وبيكتبها على الجهاز نفسه في خانة erpDocs.
//    الملف ده بيعمل حاجتين بس:
//      ١) جوه «تفاصيل الجهاز»: صندوق «📑 المستندات» بأرقام الورق
//         (والملغي مشطوب وجنبه السبب).
//      ٢) «🧾 إيصال التسليم» (طباعة وواتساب): رقم الفاتورة جنب رقم الجهاز.
//
// ⚠️ مابيكتبش أي حاجة — قراية بس. الأرقام بتيجي من السيرفر لوحدها.
// ⚠️ مابيلمسش dashboard.html: بيلف حوالين دالتين موجودين هناك
//    (renderDetail و receiptData) — زي ما تلبس الحاجة جاكيت فوق هدومها.
//    لو الدالتين مش موجودين (صفحة تانية) → مبيعملش حاجة خالص.
// ⚠️ common.js هو اللي بيحمّله (للداشبورد بس).
// ⚠️ الفلوس جنب الأرقام بتبان للمحاسب العام وأمين الخزنة والاستقبال بس.
//
// 🟦 (٢٠٢٦-١٠-٢١) بقى TypeScript (ts/erp-docs.ts → erp-docs.js)
//    🧸 نفس الكود بالحرف — اتزوّد بس «ورق» بيقول نوع كل حاجة.
//       المترجم بيشيل الورق ده والمتصفح بياخد نفس الـ js القديم.
// ============================================================
// 🏷️ الأنواع — بتختفي بعد الترجمة
/** ورقة رسمية واحدة على الجهاز (خانة erpDocs) — السيرفر بيكتبها (ملف 103) */
interface ErpDoc {
  /** WO أمر شغل · DP عربون · DR رد عربون · DL فاتورة تسليم · RJ إذن خروج مرفوض */
  t: string;
  /** الرقم المسلسل */
  no: string;
  /** void = ملغي */
  st?: string;
  amt?: number | null;
  /** العربون */
  dep?: number;
  /** الباقي بعد العربون */
  net?: number;
  /** deferred = آجل */
  pay?: string;
  /** return = جهاز مرتجع */
  r?: string;
  at?: string;
  /** سبب الإلغاء */
  why?: string;
}
interface IFixDocsApi {
  docsOf(d: any): ErpDoc[];
  lastActive(d: any, t: string): ErpDoc | null;
  refresh(): void;
}
declare var IFixDocs: IFixDocsApi;

(function(){
  if(window.IFixDocs) return;

  var TYPES: Record<string, { ic: string; n: string }> = {
    WO: { ic:'🧾', n:'أمر شغل' },
    DP: { ic:'💰', n:'سند عربون' },
    DR: { ic:'↩️', n:'سند رد عربون' },
    DL: { ic:'📦', n:'فاتورة تسليم' },
    RJ: { ic:'🚫', n:'إذن خروج مرفوض' }
  };

  function call(fn: string): boolean { try{ return typeof (window as any)[fn] === 'function' ? !!(window as any)[fn]() : false; }catch(e){ return false; } }
  // مين يشوف الفلوس جنب الورق؟ المحاسب العام + أمين الخزنة + الاستقبال
  function seeMoney(): boolean { return call('canSeeMoney') || call('isReception'); }

  function docsOf(d: any): ErpDoc[] { return (d && Array.isArray(d.erpDocs)) ? d.erpDocs.filter(Boolean) : []; }
  function lastActive(d: any, t: string): ErpDoc | null {
    var l = docsOf(d).filter(function(x){ return x.t === t && x.st !== 'void'; });
    return l.length ? l[l.length - 1] : null;
  }
  function money(n: unknown): string { return Number(n).toLocaleString('en-EG'); }
  function e(s: unknown): string { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s); }
  function when(iso: any): string {
    var t = Date.parse(iso);
    if(!t) return '';
    try{ return new Date(t).toLocaleString('ar-EG', { day:'numeric', month:'numeric', hour:'numeric', minute:'2-digit' }); }
    catch(x){ return ''; }
  }

  // ---------- 🎨 الشكل (متغيّرات الثيم — بيشتغل في الفاتح والغامق) ----------
  function css(){
    if(document.getElementById('erpdCss')) return;
    var st = document.createElement('style');
    st.id = 'erpdCss';
    st.textContent =
      '.erpd-box{border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin:0 0 14px;background:var(--surface-2);}' +
      '.erpd-h{font-size:13.5px;font-weight:800;color:var(--ink);margin-bottom:6px;display:flex;align-items:center;gap:6px;}' +
      '.erpd-row{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;padding:6px 0;border-top:1px dashed var(--border);font-size:13px;color:var(--ink-2);line-height:1.6;}' +
      '.erpd-row:first-of-type{border-top:none;}' +
      '.erpd-no{font-family:monospace;font-weight:800;font-size:13px;color:var(--ink);background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:1px 7px;direction:ltr;}' +
      '.erpd-m{font-weight:700;color:var(--ink-3, var(--ink-2));}' +
      '.erpd-w{font-size:11.5px;color:var(--muted);margin-inline-start:auto;}' +
      '.erpd-row.void{opacity:.62;}' +
      '.erpd-row.void .erpd-no{text-decoration:line-through;}' +
      '.erpd-why{flex-basis:100%;font-size:11.5px;color:var(--danger);}' +
      '.erpd-tag{font-size:11px;font-weight:800;border-radius:6px;padding:1px 6px;background:var(--returned-bg);color:var(--returned);}';
    (document.head || document.documentElement).appendChild(st);
  }

  // ---------- 📑 صندوق المستندات ----------
  function boxHtml(d: any): string {
    var list = docsOf(d);
    if(!list.length) return '';
    var showMoney = seeMoney();
    var rows = list.map(function(x){
      var ty = TYPES[x.t] || { ic:'📄', n:x.t };
      var m = '';
      if(showMoney && x.t !== 'WO'){
        if(x.t === 'DL'){
          if(x.amt == null) m = '⚠️ من غير سعر';
          else {
            m = money(x.amt) + ' ج.م';
            if(x.dep) m += ' · عربون ' + money(x.dep) + ' · الباقي ' + money(x.net);
            m += x.pay === 'deferred' ? ' · آجل' : ' · فوري';
          }
        } else if(x.t === 'RJ'){
          m = x.dep ? 'عربون ' + money(x.dep) : '';
        } else if(x.amt != null){
          m = money(x.amt) + ' ج.م';
        }
      }
      return '<div class="erpd-row' + (x.st === 'void' ? ' void' : '') + '">'
        + '<span class="erpd-no">' + e(x.no) + '</span>'
        + '<span>' + ty.ic + ' ' + e(ty.n) + '</span>'
        + (x.r === 'return' ? '<span class="erpd-tag">🔁 مرتجع</span>' : '')
        + (m ? '<span class="erpd-m">' + e(m) + '</span>' : '')
        + '<span class="erpd-w">' + e(when(x.at)) + (x.st === 'void' ? ' · ملغي' : '') + '</span>'
        + (x.st === 'void' && x.why ? '<span class="erpd-why">✖️ ' + e(x.why) + '</span>' : '')
        + '</div>';
    }).join('');
    return '<div class="erpd-box" id="erpdBox"><div class="erpd-h">📑 المستندات</div>' + rows + '</div>';
  }

  function currentDevice(): any {
    try{
      var id = (typeof selectedId !== 'undefined') ? selectedId : null;
      if(!id || typeof devices === 'undefined' || !Array.isArray(devices)) return null;
      for(var i = 0; i < devices.length; i++) if(devices[i] && devices[i].id === id) return devices[i];
    }catch(x){}
    return null;
  }

  function inject(){
    var m = document.getElementById('detailModal');
    if(!m) return;
    var old = document.getElementById('erpdBox');
    if(old) old.remove();
    var d = currentDevice();
    var html = boxHtml(d);
    if(!html) return;
    css();
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    var box = wrap.firstChild!;
    // تحت عنوان النافذة على طول — أول حاجة العين بتقعد عليها
    var head = m.querySelector('.modal-head');
    if(head && head.parentNode) head.parentNode.insertBefore(box, head.nextSibling);
    else m.insertBefore(box, m.firstChild);
  }

  // ---------- 🧥 اللف حوالين دوال الداشبورد ----------
  function wrapDetail(){
    var orig = window.renderDetail;
    if(typeof orig !== 'function' || orig.__erpd) return false;
    var w: LegacyFn = function(this: any){
      var r = orig!.apply(this, arguments as any);
      try{ inject(); }catch(x){ console.warn('[المستندات] الصندوق:', x); }
      return r;
    };
    w.__erpd = true;
    window.renderDetail = w;
    return true;
  }
  function wrapReceipt(){
    var orig = window.receiptData;
    if(typeof orig !== 'function' || orig.__erpd) return false;
    var w: LegacyFn = function(this: any, d: any){
      var r = orig!.apply(this, arguments as any);
      try{
        var dl = lastActive(d, 'DL');
        if(r && dl) r.ref = (r.ref ? r.ref + ' · ' : '') + 'فاتورة ' + dl.no;
      }catch(x){}
      return r;
    };
    w.__erpd = true;
    window.receiptData = w;
    return true;
  }

  var okD = wrapDetail(), okR = wrapReceipt();
  if(!okD && !okR) return;   // مش الداشبورد — مالناش دعوة

  window.IFixDocs = { docsOf: docsOf, lastActive: lastActive, refresh: inject };
  // لو التفاصيل مفتوحة أصلاً وإحنا بنتحمّل
  try{ inject(); }catch(x){}
})();
