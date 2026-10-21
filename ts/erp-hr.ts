// ============================================================
// I Fix Team — شؤون العاملين على الـERP (erp-hr.js)
// ------------------------------------------------------------
// 🧸 الفكرة ببساطة:
//    hr.html كبيرة قوي، فبدل ما نفتحها ونعدّل جواها، الملف الصغير
//    ده «بيقف جنبها» ويزوّد حاجتين (ملف SQL رقم 106):
//
//    ١) 💼 رقم «سند صرف المرتب» على كارت الكشف:
//       أول ما HR تدوس «✅ تم صرف الراتب»، السيرفر بيطلّع سند برقم
//       (SL-26-00001). الكارت بيكتبه تحت الصافي. ولو حصل تراجع،
//       السند القديم بيبان «ملغي» + السبب، والجديد برقم جديد.
//
//    ٢) 📋 «مسير المرتبات» في القايمة ⋮:
//       شهر كامل في شاشة واحدة — كل موظف وصافيه ورقم سنده،
//       واللي لسه ماتصرفش، والإجماليات، وإشعارات الديون اللي
//       اتسجّلت في الشهر ده — مع 🖨️ طباعة و📊 Excel.
//
// 🔒 الأمان على السيرفر: HR مابتشوفش مرتب المحاسب العام، ومحدش
//    غير HR والمحاسب العام يقدر يفتح المسير.
// 🛟 لو ملف 106 لسه ماتشغّلش: مفيش أرقام على الكروت، والمسير
//    بيقول «شغّل ملف 106» — ولا حاجة في الصفحة بتقع.
// ⚠️ common.js هو اللي بيحمّل الملف ده — في hr.html بس.
//
// 🟦 (٢٠٢٦-١٠-٢١) بقى TypeScript (ts/erp-hr.ts → erp-hr.js)
//    🧸 نفس الكود بالحرف — اتزوّد بس «ورق» بيقول نوع كل حاجة.
//       المترجم بيشيل الورق ده والمتصفح بياخد نفس الـ js القديم.
// ============================================================
// 🏷️ الأنواع — بتختفي بعد الترجمة
/** رقم سند صرف مرتب — من erp_hr_slip_nos() (ملف 106) */
interface HrSlipNo { period: string; no: string; st?: string; why?: string | null; }
/** صف موظف في مسير المرتبات — من erp_payroll_register() */
interface HrPayRow {
  name?: string;
  email?: string;
  salary?: number;
  overtime_amt?: number;
  leave_bonus?: number;
  bonus?: number;
  manual_ded?: number;
  withdraw_ded?: number;
  late_ded?: number;
  debt_ded?: number;
  net?: number;
  paid?: boolean;
  /** رقم سند الصرف */
  erp_no?: string | null;
}
/** إشعار مديونية اتسجّل في الشهر */
interface HrDebt { no: string; name: string; amount: number; note: string; st?: string; }
interface HrRegister { rows: HrPayRow[]; debts: HrDebt[]; }
interface IFixHrErpApi {
  /** أرقام السندات متقسّمة بالشهر YYYY-MM */
  nos: Record<string, HrSlipNo[]>;
  email: string;
  /** ملف 106 مااتشغّلش */
  missing: boolean;
  open?: () => void;
  close?: () => void;
  load?: (month: string) => Promise<void>;
  print?: () => void;
  excel?: () => Promise<void>;
}
declare var IFixHrErp: IFixHrErpApi;

(function(){
  'use strict';
  if(window.IFixHrErp) return;
  var page = (location.pathname.split('/').pop() || '').toLowerCase().replace(/\.html$/, '');
  if(page !== 'hr') return;
  if(typeof sb === 'undefined' || !sb || typeof sb.rpc !== 'function') return;

  var H: IFixHrErpApi = window.IFixHrErp = { nos: {}, email: '', missing: false };

  function e(s: unknown): string { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return (({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }) as Record<string, string>)[c]; }); }
  function money(v: unknown): string { return Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function ym(p: unknown): string { return String(p || '').slice(0, 7); }
  function isMissing(err: any): boolean {
    return /PGRST202|42883|Could not find the function|erp_hr_slip_nos|erp_payroll_register/i.test(
      String((err && (err.message || err.code)) || err));
  }
  function nm(email: any): string {
    try{ if(typeof nameOf === 'function') return nameOf(email); }catch(x){}
    return String(email || '').split('@')[0];
  }

  // ============================================================
  // 🎨 الشكل — بألوان hr.html نفسها (مع احتياطي)
  // ============================================================
  function css(){
    if(document.getElementById('ifxHrErpCss')) return;
    var st = document.createElement('style');
    st.id = 'ifxHrErpCss';
    st.textContent =
        '.ehr-no{margin:8px 0 2px;border:1px dashed var(--border,#E4E9EF);border-radius:11px;padding:8px 11px;font-size:12.5px;line-height:1.8;}'
      + '.ehr-no b{font-family:ui-monospace,monospace;direction:ltr;display:inline-block;font-size:13.5px;}'
      + '.ehr-no .v{opacity:.6;text-decoration:line-through;}'
      + '.ehr-no small{display:block;color:var(--muted,#6B7A8C);}'
      + '#ehrOv{position:fixed;inset:0;z-index:80;background:var(--bg,#F3F5F7);overflow-y:auto;color:var(--ink,#17222E);}'
      + '#ehrOv .h{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;background:var(--surface,#fff);'
      +   'border-bottom:1px solid var(--border,#E4E9EF);padding:calc(12px + env(safe-area-inset-top)) 16px 12px;}'
      + '#ehrOv .h h2{flex:1;margin:0;font-size:17px;font-family:Cairo,inherit;}'
      + '#ehrOv .x{border:none;background:var(--surface-2,#EEF1F3);color:var(--ink,#17222E);width:38px;height:38px;border-radius:10px;font-size:20px;cursor:pointer;}'
      + '#ehrOv .bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px 16px;}'
      + '#ehrOv .bar input{border:1px solid var(--border,#E4E9EF);background:var(--surface,#fff);color:var(--ink,#17222E);border-radius:10px;padding:9px 10px;font:inherit;font-size:16px;}'
      + '#ehrOv .btn{border:1px solid var(--border,#E4E9EF);background:var(--surface,#fff);color:var(--ink,#17222E);border-radius:10px;padding:10px 13px;font:800 13px/1 inherit;cursor:pointer;}'
      + '#ehrOv .body{padding:0 16px 40px;}'
      + '#ehrOv .tots{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:9px;margin-bottom:14px;}'
      + '#ehrOv .tot{background:var(--surface,#fff);border:1px solid var(--border,#E4E9EF);border-radius:13px;padding:11px 13px;}'
      + '#ehrOv .tot span{display:block;font-size:12px;color:var(--muted,#6B7A8C);font-weight:700;}'
      + '#ehrOv .tot b{font-family:Cairo,inherit;font-size:19px;}'
      + '#ehrOv .sec{font-weight:900;font-size:14px;margin:16px 0 8px;}'
      + '#ehrOv .tw{overflow-x:auto;border:1px solid var(--border,#E4E9EF);border-radius:12px;background:var(--surface,#fff);}'
      + '#ehrOv table{width:100%;border-collapse:collapse;min-width:640px;font-size:13px;}'
      + '#ehrOv th{background:var(--surface-2,#EEF1F3);padding:9px 8px;font-size:12px;text-align:start;white-space:nowrap;}'
      + '#ehrOv td{padding:9px 8px;border-top:1px solid var(--border,#E4E9EF);white-space:nowrap;}'
      + '#ehrOv td.n{font-family:ui-monospace,monospace;direction:ltr;text-align:left;}'
      + '#ehrOv tr.due td{background:rgba(234,179,8,.08);}'
      + '#ehrOv .ok{color:var(--done,#15803D);font-weight:800;}'
      + '#ehrOv .wait{color:#B45309;font-weight:800;}'
      + '#ehrOv .neg{color:var(--red,#DC2626);font-weight:800;}'
      + '#ehrOv .msg{padding:26px 10px;text-align:center;color:var(--muted,#6B7A8C);line-height:1.9;}'
      + '@media print{body.ehr-print > *:not(#ehrOv){display:none !important;}'
      +   '#ehrOv{position:static !important;overflow:visible !important;background:#fff !important;color:#000 !important;}'
      +   '#ehrOv .x,#ehrOv .bar{display:none !important;} #ehrOv .h{position:static !important;}'
      +   '#ehrOv table{min-width:0 !important;font-size:11px;} #ehrOv .tw{overflow:visible !important;}}';
    (document.head || document.documentElement).appendChild(st);
  }

  // ============================================================
  // 💼 ١) رقم السند على كارت الكشف
  // ============================================================
  function noBox(r: any): string {
    var list = H.nos[ym(r && r.period)] || [];
    if(!list.length) return '';
    var ok = list.filter(function(x){ return x.st !== 'void'; });
    var vd = list.filter(function(x){ return x.st === 'void'; });
    var h = '';
    if(ok.length && r.paid){
      var a = ok[ok.length - 1];
      h += '💼 سند صرف المرتب: <b>' + e(a.no) + '</b>';
    }
    vd.forEach(function(x){
      h += '<small>✖️ <span class="v">' + e(x.no) + '</span> ملغي' + (x.why ? ' — ' + e(x.why) : '') + '</small>';
    });
    return h ? '<div class="ehr-no">' + h + '</div>' : '';
  }

  function wrapSlipCard(){
    var orig = window.slipCard;
    if(typeof orig !== 'function' || orig.__ehr) return;
    var w: LegacyFn = function(this: any, r: any){
      var html = orig!.apply(this, arguments as any);
      try{
        var box = noBox(r);
        if(!box) return html;
        var i = html.indexOf('<button class="slip-btn');
        if(i < 0) i = html.lastIndexOf('</div>');
        return i < 0 ? html + box : html.slice(0, i) + box + html.slice(i);
      }catch(x){ return html; }
    };
    w.__ehr = true;
    window.slipCard = w;
  }

  async function loadNos(email: unknown): Promise<void> {
    H.nos = {};
    H.email = String(email || '').toLowerCase();
    if(H.missing || !H.email) return;
    try{
      var res = await sb.rpc('erp_hr_slip_nos', { p_email: H.email });
      if(res.error) throw res.error;
      (res.data || []).forEach(function(x: HrSlipNo){ (H.nos[x.period] = H.nos[x.period] || []).push(x); });
    }catch(err){
      if(isMissing(err)){ H.missing = true; console.warn('[erp-hr] ملف 106 لسه ماتشغّلش'); }
      else console.error('[erp-hr] erp_hr_slip_nos:', err);
    }
  }

  // بعد كل تحميل للكشوف (فتح · صرف · تراجع) بنجيب الأرقام الطازة
  function wrapLoadPayslips(){
    var orig = window.loadPayslips;
    if(typeof orig !== 'function' || orig.__ehr) return;
    var w: LegacyFn = async function(this: any){
      var r = await orig!.apply(this, arguments as any);
      var em = '';
      try{ em = SLIP.email; }catch(x){}            // eslint-disable-line no-undef
      await loadNos(em);
      return r;
    };
    w.__ehr = true;
    window.loadPayslips = w;
  }

  // ============================================================
  // 📋 ٢) مسير المرتبات
  // ============================================================
  var REG: { period: string; data: HrRegister | null; busy: boolean } = { period: '', data: null, busy: false };

  function thisMonth(): string {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function mountMenu(){
    var menu = document.getElementById('menuDrop');
    if(!menu || document.getElementById('ehrMenuBtn')) return;
    var b = document.createElement('button');
    b.id = 'ehrMenuBtn';
    b.type = 'button';
    b.textContent = '📋 مسير المرتبات';
    b.onclick = function(){ try{ if(typeof closeMenu === 'function') closeMenu(); }catch(x){} openRegister(); };
    // تحت «💰 المخصومات والمرتبات» على طول
    var after = null as HTMLButtonElement | null;
    menu.querySelectorAll('button').forEach(function(x){
      if(!after && /openPayrollAdmin/.test(x.getAttribute('onclick') || '')) after = x;
    });
    if(after && after.nextSibling) menu.insertBefore(b, after.nextSibling);
    else menu.appendChild(b);
  }

  function openRegister(){
    css();
    var ov = document.getElementById('ehrOv');
    if(!ov){
      ov = document.createElement('div');
      ov.id = 'ehrOv';
      ov.setAttribute('dir', 'rtl');
      ov.innerHTML =
          '<div class="h"><h2>📋 مسير المرتبات</h2><button class="x" type="button" onclick="IFixHrErp.close()">×</button></div>'
        + '<div class="bar"><label style="font-size:12.5px;font-weight:800;">الشهر '
        +   '<input type="month" id="ehrMonth" onchange="IFixHrErp.load(this.value)"></label>'
        +   '<button class="btn" type="button" onclick="IFixHrErp.print()">🖨️ طباعة</button>'
        +   '<button class="btn" type="button" onclick="IFixHrErp.excel()">📊 Excel</button></div>'
        + '<div class="body" id="ehrBody"></div>';
      document.body.appendChild(ov);
    }
    ov.style.display = '';
    var m = document.getElementById('ehrMonth') as HTMLInputElement | null;
    if(!REG.period) REG.period = thisMonth();
    if(m) m.value = REG.period;
    load(REG.period);
  }
  function close(){
    var ov = document.getElementById('ehrOv');
    if(ov) ov.style.display = 'none';
    document.body.classList.remove('ehr-print');
  }

  async function load(month: string): Promise<void> {
    if(!month) return;
    REG.period = month;
    var body = document.getElementById('ehrBody');
    if(body) body.innerHTML = '<div class="msg">⏳ بنجيب المسير…</div>';
    try{
      var res = await sb.rpc('erp_payroll_register', { p_period: month + '-01' });
      if(res.error) throw res.error;
      REG.data = res.data || { rows: [], debts: [] };
      render();
    }catch(err: any){
      REG.data = null;
      if(body) body.innerHTML = '<div class="msg">' + (isMissing(err)
        ? '⚠️ الميزة لسه ماتركبتش — شغّل ملف <b>106-erp-hr.sql</b>'
        : '❌ مقدرناش نجيب المسير: ' + e(err && err.message || err)) + '</div>';
      console.error('[erp-hr] erp_payroll_register:', err);
    }
  }

  function adds(r: HrPayRow): number { return Math.max(Number(r.overtime_amt || 0), 0) + Number(r.leave_bonus || 0) + Number(r.bonus || 0); }
  function deds(r: HrPayRow): number {
    return Number(r.manual_ded || 0) + Number(r.withdraw_ded || 0) + Number(r.late_ded || 0)
         + Math.max(-Number(r.overtime_amt || 0), 0) + Number(r.debt_ded || 0);
  }

  function render(){
    var body = document.getElementById('ehrBody');
    if(!body || !REG.data) return;
    var rows = REG.data.rows || [], debts = REG.data.debts || [];
    if(!rows.length && !debts.length){
      body.innerHTML = '<div class="msg">مفيش مرتبات في الشهر ده</div>';
      return;
    }
    var paid = rows.filter(function(r){ return r.paid; });
    var due  = rows.filter(function(r){ return !r.paid; });
    var sum = function(l: HrPayRow[], f: (r: HrPayRow) => unknown): number { return l.reduce(function(a, r){ return a + Number(f(r) || 0); }, 0); };
    var tot = function(l: number, k: string, c?: string): string { return '<div class="tot"><span>' + k + '</span><b' + (c ? ' class="' + c + '"' : '') + '>' + money(l) + '</b></div>'; };

    var tr = function(r: HrPayRow): string {
      var n = Number(r.net || 0);
      return '<tr class="' + (r.paid ? '' : 'due') + '">'
        + '<td><b>' + e(r.name || nm(r.email)) + '</b></td>'
        + '<td class="n">' + money(r.salary) + '</td>'
        + '<td class="n">' + money(adds(r)) + '</td>'
        + '<td class="n">' + money(deds(r)) + '</td>'
        + '<td class="n' + (n < 0 ? ' neg' : '') + '"><b>' + money(n) + '</b></td>'
        + '<td>' + (r.paid
            ? (r.erp_no ? '<span class="ok">✅ ' + e(r.erp_no) + '</span>' : '<span class="ok">✅</span> <small>(اتصرف قبل التشغيل)</small>')
            : '<span class="wait">⏳ لسه</span>') + '</td></tr>';
    };

    body.innerHTML =
        '<div class="tots">'
      +   tot(sum(rows, function(r){ return r.salary; }), 'إجمالي المرتبات')
      +   tot(sum(rows, adds), '+ إضافات', 'ok')
      +   tot(sum(rows, deds), '− استقطاعات', 'neg')
      +   tot(sum(paid, function(r){ return Math.max(Number(r.net || 0), 0); }), '✅ اتصرف (' + paid.length + ')', 'ok')
      +   tot(sum(due, function(r){ return r.net; }), '⏳ لسه (' + due.length + ')', 'wait')
      + '</div>'
      + '<div class="tw"><table><thead><tr><th>الموظف</th><th>المرتب</th><th>+ إضافات</th><th>− استقطاعات</th>'
      +   '<th>الصافي</th><th>سند الصرف</th></tr></thead><tbody>'
      +   rows.map(tr).join('')
      + '</tbody></table></div>'
      + '<div style="font-size:11.5px;color:var(--muted,#6B7A8C);margin-top:7px;line-height:1.8;">'
      +   '➕ الإضافات = أوفر تايم + حوافز + إجازات ما اتاخدتش · ➖ الاستقطاعات = خصومات + مسحوبات + تأخير + عجز ساعات + سداد ديون'
      + '</div>'
      + (debts.length ? '<div class="sec">📌 إشعارات مديونية اتسجّلت الشهر ده (' + debts.length + ')</div>'
        + '<div class="tw"><table><thead><tr><th>الرقم</th><th>الموظف</th><th>المبلغ</th><th>البيان</th></tr></thead><tbody>'
        + debts.map(function(d){
            var v = d.st === 'void';
            return '<tr><td class="n"' + (v ? ' style="text-decoration:line-through;opacity:.6"' : '') + '>' + e(d.no) + '</td>'
              + '<td>' + e(d.name) + '</td><td class="n">' + money(d.amount) + '</td>'
              + '<td>' + e(d.note) + (v ? ' <span class="neg">ملغي</span>' : '') + '</td></tr>';
          }).join('')
        + '</tbody></table></div>' : '');
  }

  function print(){
    if(!REG.data) return;
    document.body.classList.add('ehr-print');
    var done = function(){ document.body.classList.remove('ehr-print'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    try{ window.print(); }catch(x){ done(); }
  }

  async function excel(){
    if(!REG.data) return;
    if(typeof ExcelJS === 'undefined'){ alert('مكتبة Excel مش محمّلة — جرّب تاني'); return; }
    try{
      var wb = new ExcelJS.Workbook();
      var ws = wb.addWorksheet('مسير ' + REG.period, { views: [{ rightToLeft: true }] });
      ws.addRow(['مسير المرتبات — ' + REG.period]).font = { bold: true, size: 14 };
      ws.addRow(['I Fix Team — اتطبع ' + new Date().toLocaleString('ar-EG')]);
      ws.addRow([]);
      var hd = ws.addRow(['الموظف', 'المرتب', 'خصومات', 'مسحوبات', 'تأخير', 'أوفر تايم', 'إجازات', 'حوافز',
                          'سداد ديون', 'الصافي', 'الحالة', 'سند الصرف']);
      hd.font = { bold: true };
      (REG.data.rows || []).forEach(function(r: any){
        ws.addRow([r.name || nm(r.email), +r.salary || 0, +r.manual_ded || 0, +r.withdraw_ded || 0, +r.late_ded || 0,
                   +r.overtime_amt || 0, +r.leave_bonus || 0, +r.bonus || 0, +r.debt_ded || 0, +r.net || 0,
                   r.paid ? 'اتصرف' : 'لسه', r.erp_no || '']);
      });
      ws.columns.forEach(function(c: any, i: number){ c.width = i === 0 ? 24 : (i >= 10 ? 15 : 12); });
      var buf = await wb.xlsx.writeBuffer();
      var url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      var a = document.createElement('a');
      a.href = url; a.download = 'مسير-المرتبات-' + REG.period + '.xlsx';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 15000);
    }catch(err: any){
      console.error('[erp-hr] excel:', err);
      alert('❌ مقدرناش نعمل الملف: ' + (err && err.message || err));
    }
  }

  // ============================================================
  // 🔌 التركيب
  // ============================================================
  function install(){
    css();
    wrapSlipCard();
    wrapLoadPayslips();
    mountMenu();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  setTimeout(install, 3000);   // احتياطي لو حاجة اتعرّفت متأخر

  H.open = openRegister; H.close = close; H.load = load; H.print = print; H.excel = excel;
  document.addEventListener('keydown', function(ev){
    var ov = document.getElementById('ehrOv');
    if(ev.key === 'Escape' && ov && ov.style.display !== 'none') close();
  });
})();
