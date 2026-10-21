// ============================================================
// I Fix Team — مسؤول الحركة والمالك على الـERP (erp-field.js)
// ------------------------------------------------------------
// 🧸 الفكرة ببساطة:
//    الصفحتين dispatch.html و owner.html كبار قوي، فبدل ما نفتحهم
//    ونعدّل جواهم، الملف الصغير ده «بيقف جنبهم» ويزوّد حاجتين:
//
//    ١) 📑 صندوق «الورق» في تفاصيل الجهاز:
//       كود العميل (S-0012 / R-001) + أرقام الورق (🧾 أمر شغل ·
//       📦 فاتورة تسليم · …) — **من غير ولا جنيه**.
//       أول ما شيت التفاصيل يتفتح، بنسأل السيرفر عن الجهاز ده بس
//       (erp_device_paper — ملف 105) وبنحط الصندوق تحت.
//
//    ٢) 📒 الحسابات من الكشكول الجديد:
//       شاشة «الحسابات» كانت بتقرا «الورقة القديمة» بالاسم المكتوب —
//       فالمحل المكتوب بشكلين («حفيله» و«حفيلة») كان بيطلع حسابين.
//       دلوقتي بتقرا من الجدول الجديد (erp_ledger_view — ملف 105)
//       بالاسم الرسمي والكود، فكل محل = حساب واحد.
//       ⚠️ نفس الشاشة ونفس accounts.js بالظبط — اللي اتغيّر «مصدر
//          البيانات» بس، فالـPDF والكروت والبحث شغّالين زي ما هم.
//       🔍 البحث بقى يلاقي بالكود كمان (اكتب S-0012).
//
// 🔒 الأمان على السيرفر مش هنا: لو الأدمن قافل «عرض الحسابات»،
//    السيرفر بيرفض — والملف ده بيرجع للطريقة القديمة (اللي هي كمان
//    بتتقفل من السيرفر). والورق مابيجيش معاه أي فلوس أصلاً.
//
// 🛟 لو ملف 105 لسه ماتشغّلش أو أي حاجة فشلت:
//    • الحسابات → بترجع للورقة القديمة لوحدها (زي زمان بالظبط).
//    • صندوق الورق → مابيظهرش خالص.
//    ولا صفحة بتقع.
//
// ⚠️ common.js هو اللي بيحمّل الملف ده — في dispatch و owner بس.
//
// 🟦 (٢٠٢٦-١٠-٢١) بقى TypeScript (ts/erp-field.ts → erp-field.js)
//    🧸 نفس الكود بالحرف — اتزوّد بس «ورق» بيقول نوع كل حاجة.
//       المترجم بيشيل الورق ده والمتصفح بياخد نفس الـ js القديم.
// ============================================================
// 🏷️ الأنواع — بتختفي بعد الترجمة
/** ورقة واحدة على الجهاز — من erp_device_paper() (ملف 105) */
interface ErpFieldDoc {
  /** النوع: WO أمر شغل · DP عربون · DR رد عربون · DL فاتورة تسليم · RJ إذن خروج مرفوض */
  t: string;
  /** void = ملغية */
  st?: string;
  /** return = اتعملت على مرتجع */
  r?: string;
  at?: string;
  /** مين عملها */
  by?: string | null;
  /** سبب الإلغاء */
  why?: string | null;
  /** رقم الورقة (WO-26-00012) */
  no?: string | null;
}
/** ورق الجهاز + كود العميل — **من غير ولا جنيه** */
interface ErpFieldPaper {
  /** كود العميل S-0012 / R-001 */
  code?: string | null;
  name?: string | null;
  /** shop · acquisition · retail */
  kind?: string | null;
  docs?: ErpFieldDoc[];
}
/** حالة الصندوق: الورق نفسه · لسه بنجيب · فشل */
type ErpFieldBox = ErpFieldPaper | 'wait' | 'err' | null | undefined;
interface IFixFieldApi {
  page: string;
  /** erp = الكشكول الجديد · old = الورقة القديمة */
  ledgerSource: string;
  /** شباك الورق مش موجود على السيرفر (ملف 105) */
  paperMissing: boolean;
  /** القايمة اللي إحنا حطيناها في ledger — عشان نعرف لو حد كتب فوقنا */
  _rows?: any[];
  paper?: (id: string) => Promise<ErpFieldPaper | null>;
  reloadLedger?: () => Promise<boolean>;
}
declare var IFixField: IFixFieldApi;

(function(){
  'use strict';
  if(window.IFixField) return;

  var page = (location.pathname.split('/').pop() || '').toLowerCase().replace(/\.html$/, '') || 'index';
  if(['dispatch', 'owner'].indexOf(page) === -1) return;
  if(typeof sb === 'undefined' || !sb || typeof sb.rpc !== 'function') return;

  var F: IFixFieldApi = window.IFixField = {
    page: page,
    ledgerSource: '',          // 'erp' = الكشكول الجديد · 'old' = الورقة القديمة
    paperMissing: false        // شباك الورق مش موجود على السيرفر (ملف 105)
  };

  // ============================================================
  // 🎨 الشكل — بألوان الصفحة نفسها (الاتنين فيهم --line · --paper …)
  // ============================================================
  function css(){
    if(document.getElementById('ifxFieldCss')) return;
    var st = document.createElement('style');
    st.id = 'ifxFieldCss';
    st.textContent =
        '.ifx-pp{border:1px solid var(--line,#E4E9EF);border-radius:14px;padding:4px 13px 12px;margin:0 0 11px;}'
      + '.ifx-pp-h{font-size:12px;font-weight:800;color:var(--muted,#6B7A8C);padding:11px 0 6px;}'
      + '.ifx-pp-cust{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:4px 0 8px;'
      +   'border-bottom:1px solid var(--line,#E4E9EF);margin-bottom:4px;}'
      + '.ifx-pp-code{font-family:var(--mono,ui-monospace,monospace);font-weight:900;font-size:14px;'
      +   'direction:ltr;background:var(--paper,#EBEEF2);border-radius:8px;padding:3px 9px;color:var(--ink,#17222E);}'
      + '.ifx-pp-name{font-weight:700;font-size:13.5px;color:var(--ink,#17222E);}'
      + '.ifx-pp-kind{font-size:11.5px;font-weight:800;border-radius:7px;padding:2px 8px;'
      +   'background:var(--paper,#EBEEF2);color:var(--muted,#6B7A8C);}'
      + '.ifx-pp-row{display:flex;align-items:center;justify-content:space-between;gap:10px;'
      +   'padding:8px 0;border-bottom:1px dashed var(--line,#E4E9EF);font-size:13px;}'
      + '.ifx-pp-row:last-child{border-bottom:none;}'
      + '.ifx-pp-t{color:var(--ink,#17222E);font-weight:700;}'
      + '.ifx-pp-t small{display:block;color:var(--muted,#6B7A8C);font-weight:600;font-size:11.5px;margin-top:2px;}'
      + '.ifx-pp-no{font-family:var(--mono,ui-monospace,monospace);font-weight:800;font-size:13px;'
      +   'direction:ltr;white-space:nowrap;color:var(--ink,#17222E);}'
      + '.ifx-pp-row.void .ifx-pp-no{text-decoration:line-through;opacity:.55;}'
      + '.ifx-pp-void{display:inline-block;font-size:11px;font-weight:800;border-radius:6px;padding:1px 7px;'
      +   'margin-inline-start:6px;background:var(--rejected-bg,#FEF2F2);color:var(--rejected,#DC2626);}'
      + '.ifx-pp-ret{display:inline-block;font-size:11px;font-weight:800;border-radius:6px;padding:1px 7px;'
      +   'margin-inline-start:6px;background:var(--returned-bg,#F5EEFC);color:var(--returned,#9333EA);}'
      + '.ifx-pp-none{font-size:12.5px;color:var(--muted,#6B7A8C);padding:6px 0 2px;line-height:1.7;}';
    (document.head || document.documentElement).appendChild(st);
  }

  // ============================================================
  // 📑 ١) صندوق الورق في التفاصيل
  // ============================================================
  var DOC: Record<string, string[]> = {
    WO: ['🧾', 'أمر شغل'],
    DP: ['💰', 'سند عربون'],
    DR: ['↩️', 'رد عربون'],
    DL: ['📦', 'فاتورة تسليم'],
    RJ: ['🚫', 'إذن خروج مرفوض']
  };
  var KIND: Record<string, string> = { shop: '🏪 محل', acquisition: '🤝 استحواذ', retail: '🛍️ قطاعي' };

  var cache: Record<string, { at: number; data: ErpFieldPaper }> = {};            // رقم الجهاز → { at, data }
  var TTL = 60 * 1000;       // دقيقة — بعدها بنسأل تاني (الورق ممكن يتغيّر)

  function e(s: unknown): string { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return (({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }) as Record<string, string>)[c]; }); }

  function when(iso: string | undefined): string {
    var d = new Date(iso || '');
    if(isNaN(d as any)) return '';
    try{
      return d.toLocaleString('ar-EG', { day:'numeric', month:'short', hour:'numeric', minute:'2-digit',
                                         timeZone:'Africa/Cairo' });
    }catch(x){ return d.toLocaleString(); }
  }

  function boxHtml(id: string, st: ErpFieldBox): string {
    var head = '<div class="ifx-pp-h">📑 الورق (ERP)</div>';
    if(st === 'wait') return head + '<div class="ifx-pp-none">⏳ بنجيب الورق…</div>';
    if(st === 'err')  return head + '<div class="ifx-pp-none">⚠️ مقدرناش نجيب الورق — اقفل وافتح تاني</div>';
    var p = st || {};
    var cust = p.code
      ? '<div class="ifx-pp-cust"><span>🏷️</span><span class="ifx-pp-code">' + e(p.code) + '</span>'
        + (p.name ? '<span class="ifx-pp-name">' + e(p.name) + '</span>' : '')
        + (KIND[p.kind!] ? '<span class="ifx-pp-kind">' + KIND[p.kind!] + '</span>' : '')
        + '</div>'
      : '<div class="ifx-pp-cust"><span>🏷️</span><span class="ifx-pp-name" style="color:var(--muted,#6B7A8C);font-weight:600;">'
        + 'كود العميل لسه ماتكتبش على الجهاز ده</span></div>';
    var docs = Array.isArray(p.docs) ? p.docs : [];
    var rows = docs.length
      ? docs.map(function(x){
          var t = DOC[x.t] || ['📄', x.t || 'ورقة'];
          var v = x.st === 'void';
          return '<div class="ifx-pp-row' + (v ? ' void' : '') + '">'
            + '<span class="ifx-pp-t">' + t[0] + ' ' + e(t[1])
            +   (x.r === 'return' ? '<span class="ifx-pp-ret">🔁 مرتجع</span>' : '')
            +   (v ? '<span class="ifx-pp-void">ملغي</span>' : '')
            +   '<small>' + e(when(x.at)) + (x.by ? ' — ' + e(x.by) : '') + '</small>'
            +   (v && x.why ? '<small>↳ ' + e(x.why) + '</small>' : '')
            + '</span>'
            + '<span class="ifx-pp-no">' + e(x.no || '—') + '</span>'
            + '</div>';
        }).join('')
      : '<div class="ifx-pp-none">لسه مفيش ورق على الجهاز ده — أمر الشغل بيطلع للأجهزة الجديدة بس (من يوم التشغيل).</div>';
    return head + cust + rows;
  }

  function paint(id: string, st: ErpFieldBox): void {
    var box = document.querySelector('.ifx-pp[data-ifx-pp="' + CSS.escape(id) + '"]');
    if(box) box.innerHTML = boxHtml(id, st);
  }

  async function load(id: string, force?: boolean): Promise<ErpFieldPaper | null> {
    var c = cache[id];
    if(!force && c && Date.now() - c.at < TTL){ paint(id, c.data); return c.data; }
    if(!navigator.onLine){ if(c) paint(id, c.data); else paint(id, 'err'); return c ? c.data : null; }
    try{
      var res = await sb.rpc('erp_device_paper', { p_id: id });
      if(res.error) throw res.error;
      cache[id] = { at: Date.now(), data: res.data || {} };
      paint(id, cache[id].data);
      return cache[id].data;
    }catch(err: any){
      // ⚠️ الشباك مش موجود (ملف 105 لسه ماتشغّلش) → نشيل الصندوق ونسكت
      var msg = String((err && (err.message || err.code)) || err);
      if(/PGRST202|42883|erp_device_paper|Could not find the function/i.test(msg)){
        F.paperMissing = true;
        document.querySelectorAll('.ifx-pp').forEach(function(b){ b.remove(); });
        console.warn('[erp-field] شباك الورق مش موجود — شغّل ملف 105-erp-field.sql');
        return null;
      }
      console.error('[erp-field] erp_device_paper:', err);
      paint(id, 'err');
      return null;
    }
  }

  // 🔎 الشيتات اللي بتتفتح من تحت: بنصوّر «أول حاجة جوه كل شيت» قبل
  //    النداء، وبعده بنشوف أنهي شيت مفتوح اتغيّر محتواه — ده اللي
  //    اتفتح دلوقتي. كده بنشتغل مع أي شيت في الصفحتين من غير ما نعرف اسمه.
  function snap(): Map<Element, Element | null> {
    var m = new Map<Element, Element | null>();
    document.querySelectorAll('.sheet .sh-body').forEach(function(b){ m.set(b, b.firstElementChild); });
    return m;
  }
  function changedOpenBody(before: Map<Element, Element | null>): Element | null {
    var hit: Element | null = null;
    document.querySelectorAll('.sheet.on .sh-body').forEach(function(b){
      if(!before.has(b) || before.get(b) !== b.firstElementChild) hit = b;
    });
    return hit;
  }

  function attach(id: string, body: Element): void {
    if(F.paperMissing || !id || !body) return;
    if(body.id === 'intakeForm' || body.closest('#sheet')) return;          // فورم التسجيل مش تفاصيل
    var old = body.querySelector('.ifx-pp');
    if(old && old.getAttribute('data-ifx-pp') === id) return;              // متحط خلاص
    if(old) old.remove();
    css();
    var box = document.createElement('div');
    box.className = 'ifx-pp';
    box.setAttribute('data-ifx-pp', id);
    var c = cache[id];
    box.innerHTML = boxHtml(id, c ? c.data : 'wait');
    // قبل زراير الأكشن لو موجودة (تسليم/رفض…)، وإلا في الآخر
    var acts = body.querySelector('.di-actions');
    var anchor = acts || null;
    var parent = acts ? acts.parentNode! : (body.querySelector('.di') || body);
    parent.insertBefore(box, anchor);
    load(id);
  }

  function wrapDetail(name: string): boolean {
    var orig: LegacyFn = (window as any)[name];
    if(typeof orig !== 'function' || orig.__ifxField) return false;
    var w: LegacyFn = function(this: any, id: unknown){
      var before = snap();
      var r = orig.apply(this, arguments as any);
      var tryAttach = function(){
        try{
          var b = changedOpenBody(before);
          if(b) attach(String(id || ''), b);
          return !!b;
        }catch(x){ console.warn('[erp-field] attach:', x); return true; }
      };
      if(!tryAttach() && r && typeof r.then === 'function'){
        r.then(tryAttach, function(){});      // الشيت بيتفتح بعد انتظار (async)
      }
      return r;
    };
    w.__ifxField = true;
    (window as any)[name] = w;
    return true;
  }

  // ============================================================
  // 📒 ٢) الحسابات من الكشكول الجديد
  // ------------------------------------------------------------
  // ⚠️ `ledger` متعرّف في accounts.js بـ let — فبنكتب فيه بالاسم.
  //    (دي نفس المساحة لكل السكربتات العادية في الصفحة.)
  // ============================================================
  var origLoadLedger: LegacyFn | null = null, lastLedgerAt = 0, ledgerBusy: Promise<boolean> | null = null;
  var LEDGER_TTL = 60 * 1000;

  function setLedger(rows: any[]): boolean {
    try{ ledger = rows; return true; }               // eslint-disable-line no-undef
    catch(x){ console.error('[erp-field] ledger مش متعرّف:', x); return false; }
  }

  function dressAccountsScreen(){
    var h = document.querySelector('#accountsOverlay .acc-head h2');
    if(h && F.ledgerSource === 'erp') h.textContent = '📒 حسابات العملاء';
    var s = document.getElementById('accSearch') as HTMLInputElement | null;
    if(s && F.ledgerSource === 'erp') s.placeholder = 'ابحث باسم المحل أو الكود (S-0012)...';
  }

  async function loadErpLedger(): Promise<boolean> {
    if(ledgerBusy) return ledgerBusy;
    ledgerBusy = (async function(){
      try{
        if(!navigator.onLine) throw new Error('offline');
        var res = await sb.rpc('erp_ledger_view');
        if(res.error) throw res.error;
        if(!Array.isArray(res.data)) throw new Error('الرد مش قايمة');
        if(!setLedger(res.data)) throw new Error('ledger');
        F._rows = res.data;          // بنفتكر «القايمة بتاعتنا» — شوف wo تحت
        F.ledgerSource = 'erp';
        lastLedgerAt = Date.now();
        try{ localStorage.setItem('ifix_ledger_cache', JSON.stringify(res.data)); }catch(x){}
        dressAccountsScreen();
        return true;
      }catch(err: any){
        if(String(err && err.message) !== 'offline'){
          console.warn('[erp-field] الحسابات من الكشكول الجديد ماجتش — بنرجع للورقة القديمة:', err);
        }
        F.ledgerSource = 'old';
        if(origLoadLedger){ try{ await origLoadLedger(); }catch(x){} }
        return false;
      }finally{
        ledgerBusy = null;
      }
    })();
    return ledgerBusy;
  }

  function installLedger(){
    if(typeof window.loadLedger !== 'function' || window.loadLedger.__ifxField) return;
    origLoadLedger = window.loadLedger;
    var w: LegacyFn = function(){ return loadErpLedger(); };
    w.__ifxField = true;
    window.loadLedger = w;

    // 🔄 الشاشة بتتفتح على اللي عندنا على طول، ولو البيانات أقدم من
    //    دقيقة بنجيب الجديد ونرسم تاني (لو الشاشة لسه مفتوحة).
    //    قبل كده الحسابات كانت بتتحمّل مرة واحدة بس مع فتح الصفحة.
    var origOpen = window.openAccounts;
    if(typeof origOpen === 'function' && !origOpen.__ifxField){
      var wo: LegacyFn = function(this: any){
        var r = origOpen!.apply(this, arguments as any);
        dressAccountsScreen();
        // ⚠️ «ledger مش بتاعنا» = تحميل قديم من الصفحة خلص بعدنا وكتب فوقنا
        var stale = false;
        try{ stale = F.ledgerSource === 'erp' && ledger !== F._rows; }catch(x){}   // eslint-disable-line no-undef
        if(stale || Date.now() - lastLedgerAt > LEDGER_TTL){
          loadErpLedger().then(function(){
            var ov = document.getElementById('accountsOverlay');
            if(ov && !ov.classList.contains('hidden') && typeof renderAccounts === 'function') renderAccounts();
          });
        }
        return r;
      };
      wo.__ifxField = true;
      window.openAccounts = wo;
    }

    // ⏱️ الصفحة ممكن تكون حمّلت الورقة القديمة قبل ما الملف ده يوصل
    //    (السباق ده عادي — الملف بيتحمّل بعد الصفحة). لو كده، بنبدّلها.
    try{
      if(typeof ledger !== 'undefined' && Array.isArray(ledger) && ledger.length) loadErpLedger();   // eslint-disable-line no-undef
    }catch(x){}
  }

  // ============================================================
  // 👑 شيت الفني عند المالك بيترسم من أوله مع كل دوسة جواه
  // ------------------------------------------------------------
  // 🧸 renderTechSheet بتمسح الشيت وترسمه تاني (لما يغيّر الحالة أو
  //    يفتح «فني مساعد»)، فالصندوق كان هيختفي. فبعد كل رسمة بنرجّعه —
  //    من الكاش، من غير ما نسأل السيرفر تاني.
  // ⚠️ techId متعرّف في owner.html بـ let — فبنقراه بالاسم.
  // ============================================================
  function wrapTechRender(){
    var orig = window.renderTechSheet;
    if(typeof orig !== 'function' || orig.__ifxField) return;
    var w: LegacyFn = function(this: any){
      var r = orig!.apply(this, arguments as any);
      try{
        var id = '';
        try{ id = String(techId || ''); }catch(x){}            // eslint-disable-line no-undef
        var sh = document.getElementById('techSheet');
        var body = sh && sh.querySelector('.sh-body');
        if(id && body) attach(id, body);
      }catch(x){ console.warn('[erp-field] techSheet:', x); }
      return r;
    };
    w.__ifxField = true;
    window.renderTechSheet = w;
  }

  // ============================================================
  // 🔌 التركيب
  // ============================================================
  function install(){
    // dispatch: showInfo · owner: showInfo (قبعة الديسباتشر) + شيت الفني (قبعة الفني)
    wrapDetail('showInfo');
    wrapTechRender();
    if(typeof window.renderTechSheet !== 'function') wrapDetail('openTechSheet');
    installLedger();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  // احتياطي: لو دالة اتعرّفت متأخر (سكربت اتحمّل بعدنا)
  setTimeout(install, 3000);

  F.paper = function(id: string){ return load(id, true); };
  F.reloadLedger = loadErpLedger;
})();
