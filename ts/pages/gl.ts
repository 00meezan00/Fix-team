
// ============================================================
// 📒 دفتر الأستاذ العام (ملفات SQL رقم 107 و 108) — المحاسب العام بس
//    (كان اسمه «مركز الأستاذ» — اتغيّر ٢٠-١٠-٢٠٢٦ للاسم المحاسبي الصح:
//     «دفتر الأستاذ العام» = General Ledger)
// ------------------------------------------------------------
// 🧸 الحكاية:
//   كل ورقة فلوس في النظام (فاتورة تسليم · عربون · فاتورة تاجر ·
//   سند مرتب · دفعة محل …) السيرفر بيكتب لها «قيد» لوحده:
//   فلوس دخلت درج (مدين) وطلعت من درج تاني (دائن) — والاتنين متساويين.
//   الصفحة دي بتوريك الكشكول ده من كل الزوايا:
//     🩺 الملخص · ✍️ القيود · 📚 الدليل · ⚖️ ميزان المراجعة
//     📊 أرباح وخسائر · 🏦 الميزانية · 🔗 مطابقة العملاء · 🔒 الفترات
//
// ⚠️ كل كتابة من دوال السيرفر (gl_post_manual · gl_reverse · …) —
//    الشاشة مابتكتبش في جداول القيود خالص.
// ⚠️ القيد مابيتمسحش ولا بيتعدّل: الغلط = «قيد عكسي» أو «قيد تسوية».
// ============================================================
// 🟦 (٢٠٢٦-١٠-٢٢) بقى TypeScript (ts/pages/gl.ts → pages/gl.js)
//    🧸 نفس الكود بالحرف — اتزوّد بس «ورق» بيقول نوع كل حاجة.
//       المترجم بيشيل الورق ده والمتصفح بياخد نفس الـ js القديم.
// ============================================================
// 🏷️ الأنواع — بتختفي بعد الترجمة
/** 🔎 حالة الشاشة: التاب · الفترة · البحث */
interface GlView {
  tab: string; from: string; to: string; q: string; kind: string; asOf: string; limit: number;
  cq?: string; tbAll?: boolean; fak?: string;
}
/** 🔒 شهر في الدفاتر (مفتوح / مقفول) */
interface GlPeriod { ym: string; status: string; closed_by?: string | null; note?: string | null; }
/** 🩺 ملخص الدفاتر (gl_health) */
interface GlHealth {
  start: string; fy_start_month: number; td: number; tc: number; unbalanced: number;
  entries: number; lines: number; errors: number; last_errors?: { source: string; message: string }[];
  missing_docs: number; unpriced_dl: number; suspense: number; has_opening: boolean; opening_left: number;
  periods?: GlPeriod[]; years_closed?: (string | number)[];
}
/** 📚 حساب (درج) في الدليل — gl_accounts */
interface GlAccount {
  code: string; name: string; type: string; normal: string; parent: string | null; is_group: boolean;
  sys_key: string | null; party: string | null; active: boolean; note: string | null;
}
/** 👤 عميل / محل (customers) */
interface GlCustomer { id: string; code: string; name: string; kind: string; merged_into: string | null; }
/** 🏪 تاجر (suppliers) */
interface GlSupplier { id: string; name: string; }
/** سطر في ميزان المراجعة: o = أول المدة · p = حركة الفترة · d مدين · c دائن */
interface GlTbRow { code: string; type: string; od: number; oc: number; pd: number; pc: number; }
interface GlSum { od: number; oc: number; pd: number; pc: number; }
interface GlTB { key: string; rows: GlTbRow[]; sum: Record<string, GlSum>; }
/** ✍️ قيد في الكشكول وسطوره */
interface GlEntryLine { acc: string; name: string; d: number; c: number; party?: string | null; memo?: string | null; }
interface GlEntry {
  id: string; no: string; date: string; kind: string; memo: string; total: number; doc?: string | null; by?: string;
  reverses?: string | null; reversed_by?: string | null; why?: string | null; lines?: GlEntryLine[];
}
/** 🔗 عميل رصيده مختلف بين «حسابات العملاء» والأستاذ */
interface GlRecRow { id: string; code: string; name: string; sub: number; gl: number; diff: number; }
/** قايمة من السيرفر — أو رسالة الغلط لو فشلت */
type GlList<T> = T[] & { err?: string };
/** صف في التقارير (الميزان · القوايم): الحساب · عمقه · المبالغ */
interface GlTbLine { a: GlAccount; d: number; odr: number; ocr: number; pd: number; pc: number; cdr: number; ccr: number; }
interface GlStmtRow { a: GlAccount; d: number; v: number; }

/** 🏗️ نوع أصل (fa_classes) */
interface FaClass {
  code: string; name: string; kind: string; life_months: number | null; method: string; needs_customer?: boolean;
  asset_acc: string; accum_acc?: string | null; expense_acc: string; tax_rate: number; tax_method: string;
}
/** 🏗️ كارت أصل */
interface FaAsset {
  id: string; code: string; name: string; class_code: string; status: string; customer?: string | null; supplier?: string | null;
  cost: number; salvage: number; accum: number; opening_accum: number; impaired: number; this_month?: number | null;
  life_months: number | null; method: string; units_total?: number | null; next_ym?: string | null;
  acquired_on: string; in_service_on: string; funding: string; acq_no?: string | null;
  serial?: string | null; location?: string | null; note?: string | null;
  disposed_on?: string | null; disposal_amount: number; disposal_note?: string | null; disp_no?: string | null;
  void_reason?: string | null; by_year?: Record<string, number>;
}
/** 📜 إهلاك شهر اتقيّد */
interface FaRun { ym: string; total: number; n: number; entries?: (string | null)[]; }
/** 🏗️ لوحة الأصول كلها (fa_board) */
interface FaBoard {
  err?: string; assets: FaAsset[]; classes: FaClass[]; runs?: FaRun[];
  next_ym: string | null; now_ym: string; units_needed?: { id: string; code: string; ym: string | null }[];
}
/** ➕ خانات «أصل جديد» (كلها نص زي ما اتكتبت) */
interface FaForm {
  class_code: string; funding: string; cash_acc: string; acquired_on: string; in_service_on: string; method: string;
  name?: string; cost?: string; salvage?: string; life_months?: string; units_total?: string; opening_accum?: string;
  serial?: string; location?: string; note?: string; customer?: string; supplier?: string;
  [k: string]: string | undefined;
}
/** 📅 جدول إهلاك أصل (fa_schedule) */
interface FaSchedule {
  err?: string; past?: { ym: string; amt: number; no?: string | null; units?: number | null }[];
  future?: { ym: string; amt: number }[]; impairs?: { date: string; amt: number; reason: string; no?: string | null }[];
}
/** 🪪 الأصل المفتوح في الشيت */
interface FaCard { a: FaAsset; sch: FaSchedule | null; }
/** 🧾 الإهلاك الضريبي لأصل */
interface FaTax { rate: number; method: string; year: number; acc: number; book: number; }

/** 📒 كشف حساب مفتوح */
interface GlParty { customer?: string; supplier?: string; employee?: string; label: string; }
interface GlStLine { date: string; no: string; memo?: string | null; emo?: string | null; party?: string | null; doc?: string | null; kind?: string; rev?: boolean; d: number; c: number; }
interface GlStatement { code: string; from: string; to: string; party: GlParty | null; data: GlStData | null; }
/** ✍️ قيد جديد بيتكتب */
interface EnLine { acc: string; d: string; c: string; party: string; memo: string; }
interface EnDraft { kind: string; date: string; memo: string; lines: EnLine[]; busy: boolean; }

/** 📥 الإكسل: خانة واحدة (v = القيمة · f = فيها معادلة؟) */
interface XlCellV { v: any; f: boolean; }
type XlCells = Record<string, XlCellV>;
interface XlBook { sheets: Record<string, XlCells>; names: string[]; }
interface XlBlock { t: string; who?: string; memo: string; m: string; a: string; rows: number[]; coll?: boolean; }
interface XlRec { blk: string; coll: boolean; who: string; memo: string; m: string; amt: number; row: string; }
interface XlLoan { name: string; m: string; amt: number; }
interface XlLoans { out: XlLoan[]; in: XlLoan[]; }
interface XlTr { memo: string; from: string; to: string; amt: number; row: string; opening?: boolean; }
interface XlTot { rec: number; ret: number; exp: number; wd: number; }
/** 📄 يوم واحد من الشيت بعد ما اتقرا */
interface XlDay {
  n: number; rec: XlRec[]; ret: { memo: string; m: string; amt: number; row: string }[];
  exp: { memo: string; cat: string; m: string; amt: number; row: string }[]; wd: { name: string; m: string; amt: number; row: string }[];
  loans: XlLoans; tr: XlTr[]; bad: string[];
  cached: { rec: number | null; exp: number | null; wd: number | null; ret: number | null }; tot: XlTot; empty: boolean;
}
/** بند مدفوعات: بيتقيّد إزاي (how) وعلى أنهي حساب */
interface XlCat { name: string; how: string; acc: string; }
/** يوم اتقيّد قبل كده */
interface XlDayRec {
  day: string; hash: string; entry_no?: string | null; by: string; at: string; sup_nos?: string[];
  warns?: { t: string; name?: string; amt?: number; memo?: string }[]; loans: XlLoans;
}
interface XlBoardT { cats: XlCat[]; suppliers: GlSupplier[]; days?: XlDayRec[]; today: string; later?: string | null; prev?: XlDayRec | null; }
/** حالة يوم في التاب (فاضي · جاهز · متقيّد …) */
interface XlStateT { k: string; l: string; c: string; rec?: XlDayRec | null; hash?: string; }
/** 📥 كل حاجة الإكسل */
interface XlAll {
  file: string; month: string; wb: XlBook | null; days: XlDay[] | null; board: XlBoardT | null; loading: boolean; err: string;
  picks: Record<number, Record<string, string>>; base: Record<number, boolean>; sys: Record<string, XlSysDay>; busy: boolean; log: string[];
  aliases?: Record<string, string>; _colls?: { x: XlRec; cu: GlCustomer | null; ok: boolean }[];
}
/** 👀 معاينة إهلاك شهر (fa_preview) — amt فاضي = محتاج وحدات */
interface FaPreview { id: string; code: string; name: string; amt: number | null; done?: boolean; }
/** 🧾 صف في تقرير الإهلاك الضريبي */
interface FaTaxRow { a: FaAsset; t: FaTax; accY: number; diff: number; }
/** 📊 أقل حاجة بنستخدمها من ExcelJS (صف وخانة) */
interface XlsCell { value: unknown; font: unknown; fill: unknown; border: unknown; alignment: unknown; numFmt: string; }
interface XlsRow {
  values: unknown; getCell(i: number): XlsCell;
  eachCell(cb: (c: XlsCell) => void): void;
  eachCell(o: { includeEmpty: boolean }, cb: (c: XlsCell) => void): void;
}
/** 🗜️ ملف الإكسل بعد ما اتفك: هات ملف جواه بالاسم */
interface XlZip { text(name: string): Promise<string | null>; has(name: string): boolean; }
/** 🧾 سطر مدفوعات رايح للسيرفر */
interface XlExpOut { cat: string; m: string; amt: number; memo: string; supplier_id?: string; customer_id?: string; acc?: string; }
/** 🧺 اللي في السيستم يوم ما (xl_system_day) — للمقارنة */
interface XlSysDay {
  err?: string; till?: number; collections?: { customer_id: string; amount: number }[];
  closings?: { by: string; expected: number; counted: number }[];
}
/** 🤝 سلف شخص واحد متجمّعة */
interface XlLoanAgg { nm: string; a: number; m: string; }
/** 📒 بيانات كشف الحساب (gl_statement) */
interface GlStData { err?: string; opening: number; lines: GlStLine[]; }
// ============================================================
const $: (id: string) => any = id => document.getElementById(id);
const S: GlView = { tab:'home', from:'', to:'', q:'', kind:'', asOf:'', limit:80 };
let H: GlHealth = null!, ACC: GlAccount[] = [], ACCM: Record<string, GlAccount> = {}, CUST: GlCustomer[] = [], SUP: GlSupplier[] = [], EMPS: string[] = [];
let J: GlList<GlEntry> | null = null, TB: GlTB | null = null, REC: GlList<GlRecRow> | null = null, loadErr = '', loaded = false, busy = false, ME = '';

const TYPE = { asset:'الأصول', liability:'الخصوم', equity:'حقوق الملكية', revenue:'الإيرادات', expense:'المصروفات' };
const KIND: Record<string, string[]> = {
  auto:['🤖 تلقائي','blue'], cogs:['🔧 تكلفة قطع','violet'], manual:['✍️ يدوي','wait'], adjust:['🛠️ تسوية','wait'],
  opening:['📌 افتتاحي','green'], reversal:['↩️ عكسي','red'], closing:['📅 إقفال سنة',''],
  asset:['🏗️ أصول','blue'], depr:['📉 إهلاك','violet'],
  excel:['📥 شيت الإكسل','green'], till:['🧺 تقفيل الخزنة','blue']
};
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

// ---------- أدوات ----------
function fmt(n: unknown): string{ const v = Math.round((Number(n) || 0) * 100) / 100; return v.toLocaleString('en-EG', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits:2 }); }
function num(v: unknown): number | null{
  const s = String(v == null ? '' : v).replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x0660)
    .replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x06F0).replace(/[^\d.\-]/g, '');
  const n = parseFloat(s); return Number.isFinite(n) ? n : null;
}
function r2(n: unknown): number{ return Math.round((Number(n) || 0) * 100) / 100; }
function dt(d: unknown): string{ if(!d) return '—'; const [y, m, x] = String(d).slice(0, 10).split('-'); return `${+x}/${+m}/${y.slice(2)}`; }
function cairoDay(d?: string | number | Date): string{ try{ return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Cairo' }).format(d ? new Date(d) : new Date()); }catch(e: any){ return new Date().toISOString().slice(0, 10); } }
function monthLbl(ym: string): string{ const [y, m] = String(ym).slice(0, 7).split('-'); return MONTHS[+m - 1] + ' ' + y; }
function escH(s: unknown): string{ return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => (({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' } as Record<string, string>)[c])); }
function addDays(d: string, n: number): string{ const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }

let toastT: any;
function toast(msg: string, bad?: boolean){
  const el = $('toast'); el.textContent = msg; el.classList.toggle('bad', !!bad); el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), bad ? 5600 : 2800);
}
// ⚠️ Supabase مابيرميش خطأ — بيرجّعه في .error. الدوال دي بترميه بصوت عالي.
async function rpc(name: string, args?: Record<string, unknown>): Promise<any>{
  if(!navigator.onLine) throw new Error('مفيش نت — العملية دي محتاجة اتصال');
  const { data, error } = await sb.rpc(name, args || {});
  if(error) throw error;
  return data;
}
async function sel(table: string, cols: string, build?: (q: any) => any): Promise<any[]>{
  let all: any[] = [], from = 0;
  for(;;){
    let q = sb.from(table).select(cols).range(from, from + 999);
    if(build) q = build(q);
    const { data, error } = await q;
    if(error) throw error;
    all = all.concat(data || []);
    if(!data || data.length < 1000) break;
    from += 1000;
  }
  return all;
}
function errMsg(e: any): string{
  const m = (e && (e.message || e.hint)) || String(e);
  if(/gl_|schema cache|does not exist|PGRST20/i.test(m)) return m + ' — (ملف SQL رقم 107 لسه ما اتشغّلش؟)';
  return m;
}

// ============================================================
// 🚪 الدخول — المحاسب العام بس
// ============================================================
(async function boot(){
  const { data:{ session } } = await sb.auth.getSession();
  if(!session){ location.replace('index.html'); return; }
  try{ await rpc('erp_need_super'); }
  catch(e: any){
    const m = errMsg(e);
    if(/المحاسب العام بس/.test(m)){ location.replace('dashboard.html'); return; }
    loadErr = m; render(); return;
  }
  try{ ME = await rpc('erp_my_name'); }catch(e: any){ ME = session.user.email || ''; }
  $('whoLbl').textContent = ME + ' — المحاسب العام';
  await load();
  document.addEventListener('visibilitychange', () => { if(!document.hidden && !$('sheetOv')) load(); });
})();

async function load(manual?: boolean){
  if(busy) return;
  busy = true;
  try{
    const [h, a, c, s, e] = await Promise.all([
      rpc('gl_health'),
      sel('gl_accounts', 'code,name,type,normal,parent,is_group,sys_key,party,active,note', q => q.order('code')),
      sel('customers', 'id,code,name,kind,merged_into', q => q.is('merged_into', null).order('code')),
      sel('suppliers', 'id,name', q => q.order('name')),
      sel('gl_lines', 'employee_email', q => q.not('employee_email', 'is', null))
    ]);
    H = h; ACC = a.slice().sort((x, y) => x.code < y.code ? -1 : x.code > y.code ? 1 : 0); ACCM = {}; a.forEach(x => { ACCM[x.code] = x; });
    CUST = c; SUP = s; EMPS = [...new Set(e.map(x => x.employee_email))].sort();
    $('dlCust').innerHTML = CUST.map(x => `<option value="${escH(x.code + ' · ' + x.name)}">`).join('');
    $('dlSup').innerHTML = SUP.map(x => `<option value="${escH(x.name)}">`).join('');
    $('dlEmp').innerHTML = EMPS.map(x => `<option value="${escH(x)}">`).join('');
    if(!S.from){
      const today = cairoDay();
      const y0 = today.slice(0, 4) + '-01-01';
      S.from = H.start > y0 ? H.start : y0;
      S.to = today; S.asOf = today;
    }
    J = null; TB = null; REC = null;
    if(S.tab === 'fa' || S.tab === 'periods') FA = null!;
    loadErr = ''; loaded = true;
    if(manual) toast('اتحدّث ✅');
  }catch(e: any){
    console.error('[الأستاذ] التحميل فشل:', e);
    loadErr = errMsg(e);
  }finally{ busy = false; }
  render();
}

// ============================================================
// 🧮 حسابات الدليل
// ============================================================
const leafs = () => ACC.filter(a => !a.is_group);
const accName: (code: string) => string = code => (ACCM[code] || {} as GlAccount).name || code;
function ancestors(code: string): string[]{ const out = []; let p = (ACCM[code] || {} as GlAccount).parent; while(p){ out.push(p); p = (ACCM[p] || {} as GlAccount).parent; } return out; }
function depth(code: string): number{ return ancestors(code).length; }
// الرصيد في اتجاهه الطبيعي (موجب = طبيعي)
function natural(a: GlAccount, d: unknown, c: unknown): number{ return (a.normal === 'D' ? 1 : -1) * ((Number(d) || 0) - (Number(c) || 0)); }
// بيجمّع الفرعيات على الرئيسية: {code: {od,oc,pd,pc}}
function rollup(rows: GlTbRow[]): Record<string, GlSum>{
  const m: Record<string, GlSum> = {};
  ACC.forEach(a => { m[a.code] = { od:0, oc:0, pd:0, pc:0 }; });
  (rows || []).forEach(r => {
    [r.code, ...ancestors(r.code)].forEach(k => {
      const t = m[k] || (m[k] = { od:0, oc:0, pd:0, pc:0 });
      t.od += +r.od; t.oc += +r.oc; t.pd += +r.pd; t.pc += +r.pc;
    });
  });
  return m;
}
async function needTB(from: string, to: string): Promise<GlTB>{
  const key = from + '|' + to;
  if(TB && TB.key === key) return TB;
  const rows = await rpc('gl_trial_balance', { p_from:from, p_to:to });
  TB = { key, rows, sum: rollup(rows) };
  return TB;
}

// ============================================================
// 🖼️ الرسم
// ============================================================
function tabsList(){
  if(!loaded) return [];
  const warn = (H.errors || 0) + (H.missing_docs || 0) + (H.unbalanced || 0);
  return [
    { k:'home', l:'🩺 الملخص', n: warn },
    { k:'journal', l:'✍️ القيود' },
    { k:'xl', l:'📥 الإكسل' },
    { k:'chart', l:'📚 الدليل' },
    { k:'tb', l:'⚖️ ميزان المراجعة' },
    { k:'pl', l:'📊 أرباح وخسائر' },
    { k:'bs', l:'🏦 الميزانية' },
    { k:'fa', l:'🏗️ الأصول', n: FA && FA.next_ym && FA.next_ym < FA.now_ym ? 1 : 0 },
    { k:'rec', l:'🔗 مطابقة العملاء' },
    { k:'periods', l:'🔒 الفترات' }
  ];
}
function render(){
  const tl = tabsList();
  $('tabs').innerHTML = tl.map(x => `<button class="tab${S.tab === x.k ? ' on' : ''}" onclick="go('${x.k}')">${x.l}${x.n ? `<span class="n">${x.n}</span>` : ''}</button>`).join('');
  const app = $('app');
  if(!loaded){
    app.innerHTML = loadErr ? `<div class="err">⚠️ ${escH(loadErr)}</div><button class="big" onclick="load(true)">↻ جرّب تاني</button>` : '<div class="empty">⏳ جاري التحميل…</div>';
    $('fabHost').innerHTML = '';
    return;
  }
  const head = loadErr ? `<div class="err">⚠️ آخر تحديث فشل: ${escH(loadErr)}</div>` : '';
  const V: Record<string, () => string> = { home:viewHome, journal:viewJournal, xl:viewXL, chart:viewChart, tb:viewTB, pl:viewPL, bs:viewBS, fa:viewFA, rec:viewRec, periods:viewPeriods };
  app.innerHTML = head + (V[S.tab] || viewHome)();
  $('fabHost').innerHTML = S.tab === 'fa' ? `<button class="fab" onclick="openFAAdd()">➕ أصل جديد</button>`
    : ['home','journal','chart'].includes(S.tab) ? `<button class="fab" onclick="openEntry('manual')">✍️ قيد جديد</button>` : '';
  if(S.tab === 'fa' && !FA) loadFA();
  if(S.tab === 'journal' && !J) loadJournal();
  if(['tb','pl','bs','chart'].includes(S.tab)) fillReport();
  if(S.tab === 'home') homePL();
  if(S.tab === 'rec' && !REC) loadRec();
  if(S.tab === 'xl' && XL.month && !XL.board && !XL.loading) xlLoadBoard();
}
function go(k: string){ S.tab = k; S.limit = 80; render(); window.scrollTo(0, 0); }
function rangeHtml(onch: string, withAsOf?: boolean): string{
  if(withAsOf) return `<div class="range"><label>📅 الميزانية في يوم<input type="date" value="${S.asOf}" onchange="S.asOf=this.value;${onch}"></label>
    <button class="btn sm" onclick="S.asOf='${cairoDay()}';${onch}">النهارده</button></div>`;
  const today = cairoDay(), m0 = today.slice(0, 8) + '01', y0 = today.slice(0, 4) + '-01-01';
  const pm = addDays(m0, -1), pm0 = pm.slice(0, 8) + '01';
  return `<div class="range">
    <label>من<input type="date" value="${S.from}" onchange="S.from=this.value;${onch}"></label>
    <label>لحد<input type="date" value="${S.to}" onchange="S.to=this.value;${onch}"></label></div>
    <div class="chips" style="margin:-2px 0 12px;">
      <button class="chip" onclick="S.from='${m0 < H.start ? H.start : m0}';S.to='${today}';${onch}">الشهر ده</button>
      <button class="chip" onclick="S.from='${pm0 < H.start ? H.start : pm0}';S.to='${pm}';${onch}">الشهر اللي فات</button>
      <button class="chip" onclick="S.from='${y0 < H.start ? H.start : y0}';S.to='${today}';${onch}">السنة دي</button>
      <button class="chip" onclick="S.from='${H.start}';S.to='${today}';${onch}">من البداية</button></div>`;
}

// ---------- 🩺 الملخص ----------
function viewHome(){
  const h = H;
  const today = cairoDay();
  const started = today >= h.start;
  const bal = r2(h.td) === r2(h.tc) && !h.unbalanced;
  const msgs = [];
  if(!started) msgs.push(`<div class="warnbox">📅 الدفاتر بتبدأ <b>${dt(h.start)}</b> — لحد اليوم ده مفيش ورق بيتقيد (هو جوّه الرصيد الافتتاحي).
    عايز تجرّب دلوقتي على التجربة؟ رجّع البداية لأول الشهر ده من «⚙️» تحت.</div>`);
  if(!h.has_opening) msgs.push(`<div class="warnbox">📌 لسه مفيش <b>قيد افتتاحي</b> — اللي معانا وعلينا يوم البداية (الخزنة · المحافظ · المخزن · الأصول · العملاء · التجار · رأس المال).
    <br><button class="btn sm pri" onclick="openEntry('opening')">📌 اكتب القيد الافتتاحي</button></div>`);
  if(h.errors) msgs.push(`<div class="err">⚠️ فيه ${h.errors} ورقة ماتقيّدتش بسبب خطأ — دوس «🔁 قيّد الناقص». لو فضلت، ابعتلي الرسالة دي:
    <div style="font-weight:500;font-size:12px;margin-top:6px;">${(h.last_errors || []).map(x => escH(x.source + ' — ' + x.message)).join('<br>')}</div></div>`);
  if(h.missing_docs) msgs.push(`<div class="warnbox">🧾 فيه ${h.missing_docs} ورقة بفلوس من غير قيد. <button class="btn sm" onclick="backfill()">🔁 قيّد الناقص</button></div>`);
  if(h.unpriced_dl) msgs.push(`<div class="warnbox">🏷️ ${h.unpriced_dl} جهاز اتسلّم من غير سعر — مالوش قيد لحد ما يتسعّر.</div>`);
  if(Math.abs(h.suspense) >= 1) msgs.push(`<div class="warnbox">🗂️ «حساب وسيط تحت التسوية» فيه ${fmt(h.suspense)} ج.م (ديون موظفين جديدة) — وجّههم للحساب الصح بقيد تسوية.
    <br><button class="btn sm" onclick="openStatement('2190')">📒 شوف الحساب</button></div>`);
  if(h.has_opening && Math.abs(h.opening_left) >= 1) msgs.push(`<div class="warnbox">📌 «أرصدة افتتاحية تحت التسوية» فيه ${fmt(h.opening_left)} ج.م — حوّله لرأس المال (3100) بقيد تسوية لما تتأكد من الأرقام.</div>`);
  if(!msgs.length) msgs.push('<div class="okbox">✅ كله تمام — كل الورق متقيّد والقيود متوازنة.</div>');
  return `<div class="stats">
      <div class="stat ${bal ? 'good' : 'bad'}"><div class="k">⚖️ التوازن</div><div class="v">${bal ? '✅ متوازن' : '❌ مش متوازن'}</div><div class="s">مدين ${fmt(h.td)} · دائن ${fmt(h.tc)}</div></div>
      <button class="stat" onclick="go('journal')"><div class="k">✍️ القيود</div><div class="v">${h.entries}</div><div class="s">${h.lines} سطر</div></button>
      <div class="stat"><div class="k">📅 البداية</div><div class="v">${dt(h.start)}</div><div class="s">السنة: ${MONTHS[(h.fy_start_month || 1) - 1]} ← ${MONTHS[((h.fy_start_month || 1) + 10) % 12]}</div></div>
      <div class="stat ${h.errors ? 'bad' : 'good'}"><div class="k">⚠️ أخطاء</div><div class="v">${h.errors || 0}</div></div>
    </div>
    ${msgs.join('')}
    <div class="sec-h">📊 الشهر ده<span class="rule"></span></div>
    <div id="homePL"><div class="empty">⏳ …</div></div>
    <div class="sec-h">🧸 إزاي الكشكول بيشتغل<span class="rule"></span></div>
    <div class="card"><div class="c-s" style="font-size:13px;line-height:2;">
      كل ورقة فلوس بتطلع في النظام، السيرفر بيكتب لها <b>قيد</b> لوحده:<br>
      📦 فاتورة تسليم فوري ← <b>خزنة أمين الخزنة</b> زادت · <b>إيراد الصيانة</b> زاد<br>
      📦 فاتورة تسليم آجل ← <b>العملاء</b> (المحل) عليه · <b>إيراد الصيانة</b> زاد<br>
      💰 عربون ← الخزنة زادت · <b>عربون العملاء</b> (أمانة لحد التسليم)<br>
      🧾 فاتورة تاجر ← <b>مخزون القطع</b> زاد · <b>التاجر</b> ليه فلوس<br>
      🔧 الجهاز اتسلّم ← القطع المتفوترة اللي اتركّبت فيه بتتنقل من المخزن لـ<b>تكلفة القطع</b><br>
      💼 سند مرتب ← <b>مرتبات</b> · والصافي من الخزنة العامة · والمسحوبات والديون والخصومات كل واحد في درجه<br>
      💵 دفعة محل ← الخزنة العامة زادت · المحل اللي عليه نقص<br>
      ↩️ أي ورقة اتلغت ← <b>قيد عكسي</b> بيرجّع كل حاجة مكانها — مفيش حاجة بتتمسح.
    </div></div>
    <div class="sec-h">⚙️ أدوات<span class="rule"></span></div>
    <div class="acts" style="margin-top:0;">
      <button class="btn" onclick="backfill()">🔁 قيّد الناقص</button>
      <button class="btn" onclick="openStart()">📅 تاريخ البداية</button>
      <button class="btn" onclick="load(true)">↻ حدّث</button>
    </div>`;
}
async function homePL(){
  const host = $('homePL'); if(!host) return;
  try{
    const today = cairoDay(), m0 = today.slice(0, 8) + '01';
    const from = m0 < H.start ? H.start : m0;
    if(today < H.start){ host.innerHTML = '<div class="empty">الدفاتر لسه مابدأتش</div>'; return; }
    const rows = await rpc('gl_trial_balance', { p_from:from, p_to:today });
    const p = plCalc(rows);
    host.innerHTML = `<div class="stats">
      <button class="stat" onclick="S.from='${from}';S.to='${today}';go('pl')"><div class="k">💰 الإيرادات</div><div class="v">${fmt(p.rev)}</div></button>
      <button class="stat" onclick="S.from='${from}';S.to='${today}';go('pl')"><div class="k">🔧 تكلفة القطع</div><div class="v">${fmt(p.cogs)}</div></button>
      <button class="stat" onclick="S.from='${from}';S.to='${today}';go('pl')"><div class="k">🧾 المصروفات</div><div class="v">${fmt(p.exp - p.cogs)}</div></button>
      <button class="stat ${p.net >= 0 ? 'good' : 'bad'}" onclick="S.from='${from}';S.to='${today}';go('pl')"><div class="k">${p.net >= 0 ? '📈 صافي الربح' : '📉 صافي الخسارة'}</div><div class="v">${fmt(Math.abs(p.net))}</div></button>
    </div>`;
  }catch(e: any){ host.innerHTML = `<div class="err">${escH(errMsg(e))}</div>`; }
}
async function backfill(){
  try{
    toast('⏳ بنقيّد…');
    const r = await rpc('gl_backfill');
    toast(r.new_entries ? `✅ اتكتب ${r.new_entries} قيد جديد` : '✅ مفيش حاجة ناقصة');
    load();
  }catch(e: any){ toast(errMsg(e), true); }
}
function openStart(){
  sheet('📅 تاريخ بداية الدفاتر', `
    <div class="hint">يوم البداية = اليوم اللي بنكتب فيه <b>الرصيد الافتتاحي</b>. أي ورقة قبله مابتتقيدش (هي جوّه الافتتاحي)، وأي ورقة من أوله بتتقيد لوحدها.</div>
    <div class="warnbox">⚠️ القرار الرسمي: <b>1/11/2026</b>. على <b>التجربة</b> ممكن ترجّعها لأول الشهر ده عشان تجرّب — والسيرفر بيقيّد الورق اللي فات لوحده.
      <br>التأخير لقدّام مسموح بس لو لسه مفيش قيود.</div>
    <label class="f"><span>📅 أول يوم في شهر</span><input id="stDate" type="month" value="${H.start.slice(0, 7)}"></label>
    <button class="big" onclick="startGo()">💾 احفظ</button>`);
}
async function startGo(){
  const v = $('stDate').value; if(!v){ toast('اختار الشهر', true); return; }
  const d = v + '-01';
  if(!confirm('بداية الدفاتر هتبقى ' + dt(d) + '\nنكمّل؟')) return;
  try{
    const r = await rpc('gl_set_start', { p_date:d });
    closeSheet(); S.from = ''; toast('✅ البداية بقت ' + dt(d) + ' — اتكتب ' + ((r.backfill || {}).new_entries || 0) + ' قيد');
    load();
  }catch(e: any){ toast(errMsg(e), true); }
}

// ---------- ✍️ القيود ----------
function viewJournal(){
  const kinds = [['','الكل'], ['auto','🤖 تلقائي'], ['cogs','🔧 تكلفة'], ['manual','✍️ يدوي'], ['adjust','🛠️ تسوية'], ['opening','📌 افتتاحي'], ['asset','🏗️ أصول'], ['depr','📉 إهلاك'], ['excel','📥 الإكسل'], ['till','🧺 التقفيل'], ['reversal','↩️ عكسي'], ['closing','📅 إقفال']];
  return `${rangeHtml('J=null;render()')}
    <input class="search" type="search" placeholder="🔍 رقم قيد · رقم ورقة (DL-…) · كود عميل · رقم حساب · كلمة" value="${escH(S.q)}"
      onkeydown="if(event.key==='Enter'){S.q=this.value;J=null;render();}" onchange="S.q=this.value;J=null;render()">
    <div class="chips" style="margin-bottom:12px;">${kinds.map(([k, l]) => `<button class="chip${S.kind === k ? ' on' : ''}" onclick="S.kind='${k}';J=null;render()">${l}</button>`).join('')}</div>
    <div id="jHost">${J ? journalHtml() : '<div class="empty">⏳ …</div>'}</div>`;
}
async function loadJournal(){
  try{
    J = await rpc('gl_journal', { p_from:S.from, p_to:S.to, p_q:S.q, p_kind:S.kind, p_limit:S.limit });
  }catch(e: any){ J = { err: errMsg(e) } as GlList<GlEntry>; }
  const h = $('jHost'); if(h) h.innerHTML = journalHtml();
}
function journalHtml(){
  if(!J) return '<div class="empty">⏳ …</div>';
  if(J.err) return `<div class="err">${escH(J.err)}</div>`;
  if(!J.length) return '<div class="empty">مفيش قيود في الفترة دي</div>';
  return `<div class="hint">${J.length} قيد${J.length >= S.limit ? ' — ظاهر أحدث ' + S.limit : ''} · الأحدث فوق</div>`
    + J.map(entryCard).join('')
    + (J.length >= S.limit ? `<button class="btn more" onclick="S.limit+=200;loadJournal()">⬇️ اعرض أقدم</button>` : '');
}
function entryCard(e: GlEntry): string{
  const k = KIND[e.kind] || [e.kind, ''];
  const off = !!e.reversed_by;
  const canRev = ['manual','adjust','opening'].includes(e.kind) && !off;
  return `<div class="card k-${e.kind}${off ? ' off' : ''}">
    <div class="c-top"><div class="c-t">${escH(e.memo || '—')}</div><div class="money">${fmt(e.total)}</div></div>
    <div class="c-s"><span class="pill ${k[1]}">${k[0]}</span> <span class="code">${escH(e.no)}</span> · ${dt(e.date)}
      ${e.doc ? ` · 📑 <span class="code">${escH(e.doc)}</span>` : ''} · ${escH(e.by || '')}
      ${e.reverses ? ` · ↩️ بيعكس <span class="code">${escH(e.reverses)}</span>` : ''}
      ${e.reversed_by ? ` · <span style="color:var(--red)">اتعكس بـ <span class="code">${escH(e.reversed_by)}</span>${e.why ? ' — ' + escH(e.why) : ''}</span>` : ''}</div>
    <div style="margin-top:6px;">
      <div class="jl head"><div class="a">الحساب</div><div class="d">مدين</div><div class="cc">دائن</div></div>
      ${(e.lines || []).map(l => `<div class="jl${+l.c ? ' cr' : ''}"><div class="a">${+l.c ? 'إلى ' : 'من '}<span class="code">${escH(l.acc)}</span> ${escH(l.name)}
        ${l.party || l.memo ? `<small>${escH([l.party, l.memo].filter(Boolean).join(' · '))}</small>` : ''}</div>
        <div class="d">${+l.d ? fmt(l.d) : ''}</div><div class="cc">${+l.c ? fmt(l.c) : ''}</div></div>`).join('')}
    </div>
    ${canRev ? `<div class="acts"><button class="btn bad sm" onclick="reverseEntry('${e.id}','${escH(e.no)}')">↩️ اعكس القيد ده</button></div>` : ''}
  </div>`;
}
async function reverseEntry(id: string, no: string){
  const why = prompt(`↩️ عكس ${no}\nهيتكتب قيد عكسي بيرجّع كل سطر مكانه — والاتنين هيفضلوا ظاهرين.\n\nاكتب السبب:`);
  if(why === null) return;
  try{ const r = await rpc('gl_reverse', { p_id:id, p_reason:why }); toast('↩️ اتعكس بـ ' + r.entry_no); load(); }
  catch(e: any){ toast(errMsg(e), true); }
}

// ---------- 📚 الدليل ----------
function viewChart(){
  const q = (S.cq || '').trim();
  return `<div class="hint">كل الأدراج (الحسابات) وأرصدتها لحد النهارده. دوس على أي حساب يفتحلك كشفه.
    الحسابات اللي جنبها ⚙️ بيستخدمها النظام في القيود التلقائية.</div>
    <div class="acts" style="margin:0 0 12px;"><button class="btn" onclick="openAccount()">➕ حساب جديد</button></div>
    <input class="search" type="search" placeholder="🔍 رقم الحساب أو اسمه" value="${escH(q)}" oninput="S.cq=this.value;fillReport()">
    <div id="rHost"><div class="empty">⏳ …</div></div>`;
}
function chartHtml(t: GlTB): string{
  const q = (S.cq || '').trim();
  const show = ACC.filter(a => !q || a.code.startsWith(q) || a.name.includes(q));
  return `<div class="tscroll"><table class="tbl"><tr><th>الحساب</th><th class="n">الرصيد</th></tr>
    ${show.map(a => {
      const s = t.sum[a.code] || { pd:0, pc:0 };
      const v = natural(a, s.pd, s.pc);
      const d = depth(a.code);
      return `<tr class="${a.is_group ? (d === 0 ? 'g1' : 'g') : 'click'}" ${a.is_group ? '' : `onclick="openStatement('${a.code}')"`}>
        <td class="ind${Math.min(d, 3)}"><span class="code">${a.code}</span> ${escH(a.name)}${a.sys_key ? ' <span title="حساب نظام">⚙️</span>' : ''}
          ${a.party ? ` <span class="pill">${{ customer:'👤 بالعميل', supplier:'🏪 بالتاجر', employee:'👥 بالموظف' }[a.party]}</span>` : ''}
          ${!a.active ? ' <span class="pill">موقوف</span>' : ''}
          ${!a.is_group ? ` <button class="btn ghost sm" style="padding:2px 7px;" onclick="event.stopPropagation();openAccount('${a.code}')">✏️</button>` : ''}</td>
        <td class="n ${Math.abs(v) < .005 ? 'zero' : v < 0 ? 'money neg' : ''}">${Math.abs(v) < .005 ? '—' : fmt(v)}</td></tr>`;
    }).join('')}</table></div>`;
}
function openAccount(code?: string){
  const a = code ? ACCM[code] : null;
  const groups = ACC.filter(x => x.is_group);
  sheet(a ? '✏️ ' + a.code + ' · ' + a.name : '➕ حساب جديد', `
    ${a && a.sys_key ? '<div class="warnbox">⚙️ ده حساب بيستخدمه النظام في القيود التلقائية — تقدر تغيّر اسمه بس.</div>' : ''}
    <label class="f"><span>📂 تحت أنهي مجموعة</span><select id="aPar">${groups.map(g => `<option value="${g.code}"${(a ? a.parent : '52') === g.code ? ' selected' : ''}>${'— '.repeat(depth(g.code))}${g.code} · ${escH(g.name)}</option>`).join('')}</select></label>
    <div class="f2">
      <label class="f"><span>🔢 رقم الحساب</span><input id="aCode" inputmode="numeric" value="${a ? a.code : ''}" ${a ? 'disabled' : ''} placeholder="مثال: 5295"></label>
      <label class="f"><span>👤 بيتقيد بـ</span><select id="aParty" ${a && a.sys_key ? 'disabled' : ''}>
        ${[['','مفيش'],['customer','العميل'],['supplier','التاجر'],['employee','الموظف']].map(([k, l]) => `<option value="${k}"${(a ? a.party : '') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
    </div>
    <label class="f"><span>🏷️ الاسم</span><input id="aName" value="${a ? escH(a.name) : ''}" maxlength="80"></label>
    <label class="f"><span>📝 ملاحظة</span><input id="aNote" value="${a ? escH(a.note || '') : ''}"></label>
    <label class="f" style="display:flex;align-items:center;gap:8px;"><input id="aActive" type="checkbox" style="width:auto;"${!a || a.active ? ' checked' : ''}${a && a.sys_key ? ' disabled' : ''}> <span style="margin:0;">شغّال (بيظهر في القيود)</span></label>
    <div class="note-in" style="margin-bottom:12px;">💡 رقم الحساب لازم يبدأ بنفس أول رقم في المجموعة (١ أصول · ٢ خصوم · ٣ ملكية · ٤ إيرادات · ٥ مصروفات).</div>
    <button class="big" onclick="accountGo(${a ? `'${a.code}'` : 'null'})">💾 حفظ</button>`);
}
async function accountGo(code: string | null){
  const par = ACCM[$('aPar').value];
  try{
    await rpc('gl_account_save', { p_code: code || $('aCode').value.trim(), p_name:$('aName').value, p_type: par ? par.type : null,
      p_parent:$('aPar').value, p_party:$('aParty').value, p_active:$('aActive').checked, p_note:$('aNote').value, p_normal:null });
    closeSheet(); toast('💾 اتحفظ'); load();
  }catch(e: any){ toast(errMsg(e), true); }
}

// ---------- ⚖️ ميزان المراجعة ----------
function viewTB(){
  return `${rangeHtml('fillReport()')}
    <div class="acts" style="margin:0 0 12px;"><button class="btn" onclick="tbExcel()">📊 Excel</button>
      <button class="chip${S.tbAll ? ' on' : ''}" onclick="S.tbAll=!S.tbAll;fillReport()">${S.tbAll ? 'كل الحسابات' : 'اللي عليها حركة بس'}</button></div>
    <div id="rHost"><div class="empty">⏳ …</div></div>`;
}
function tbRows(t: GlTB): GlTbLine[]{
  return ACC.filter(a => {
    const s = t.sum[a.code];
    return S.tbAll || (s && (Math.abs(s.od - s.oc) > .004 || s.pd > .004 || s.pc > .004));
  }).map(a => {
    const s = t.sum[a.code];
    const ob = s.od - s.oc, cb = ob + s.pd - s.pc;
    return { a, d: depth(a.code), odr: ob > 0 ? ob : 0, ocr: ob < 0 ? -ob : 0, pd: s.pd, pc: s.pc, cdr: cb > 0 ? cb : 0, ccr: cb < 0 ? -cb : 0 };
  });
}
function tbHtml(t: GlTB): string{
  const R = tbRows(t);
  const tot = R.filter(r => !r.a.is_group).reduce((x, r) => { (['odr','ocr','pd','pc','cdr','ccr'] as const).forEach(k => x[k] += r[k]); return x; }, { odr:0, ocr:0, pd:0, pc:0, cdr:0, ccr:0 });
  const ok = r2(tot.cdr) === r2(tot.ccr) && r2(tot.pd) === r2(tot.pc);
  const c: (v: number) => string = v => v > .004 ? fmt(v) : '<span class="zero">—</span>';
  return `${ok ? '<div class="okbox">✅ الميزان متوازن — المدين = الدائن</div>' : '<div class="err">❌ الميزان مش متوازن — ابعتلي صورة</div>'}
    <div class="tscroll"><table class="tbl"><tr><th rowspan="2">الحساب</th><th class="n" colspan="2">أول المدة</th><th class="n" colspan="2">حركة الفترة</th><th class="n" colspan="2">آخر المدة</th></tr>
    <tr><th class="n">مدين</th><th class="n">دائن</th><th class="n">مدين</th><th class="n">دائن</th><th class="n">مدين</th><th class="n">دائن</th></tr>
    ${R.map(r => `<tr class="${r.a.is_group ? (r.d === 0 ? 'g1' : 'g') : 'click'}" ${r.a.is_group ? '' : `onclick="openStatement('${r.a.code}')"`}>
      <td class="ind${Math.min(r.d, 3)}"><span class="code">${r.a.code}</span> ${escH(r.a.name)}</td>
      <td class="n">${c(r.odr)}</td><td class="n">${c(r.ocr)}</td><td class="n">${c(r.pd)}</td><td class="n">${c(r.pc)}</td><td class="n">${c(r.cdr)}</td><td class="n">${c(r.ccr)}</td></tr>`).join('')}
    <tr class="tot"><td>الإجمالي</td><td class="n">${fmt(tot.odr)}</td><td class="n">${fmt(tot.ocr)}</td><td class="n">${fmt(tot.pd)}</td><td class="n">${fmt(tot.pc)}</td><td class="n">${fmt(tot.cdr)}</td><td class="n">${fmt(tot.ccr)}</td></tr>
    </table></div><div class="hint" style="margin-top:8px;">💡 دوس على أي حساب فرعي يفتح كشفه. الرئيسية (الملونة) = مجموع اللي تحتها.</div>`;
}
async function tbExcel(){
  try{
    const t = await needTB(S.from, S.to);
    const R = tbRows(t);
    await excel('ميزان-المراجعة', `ميزان المراجعة من ${S.from} لحد ${S.to}`,
      ['رقم الحساب','الحساب','أول المدة مدين','أول المدة دائن','حركة مدين','حركة دائن','آخر المدة مدين','آخر المدة دائن'],
      R.map(r => [r.a.code, '  '.repeat(r.d) + r.a.name, r.odr, r.ocr, r.pd, r.pc, r.cdr, r.ccr]), [2,3,4,5,6,7], R.map(r => r.a.is_group));
  }catch(e: any){ toast(errMsg(e), true); }
}

// ---------- 📊 أرباح وخسائر ----------
function plCalc(rows: GlTbRow[]){
  let rev = 0, exp = 0, cogs = 0;
  (rows || []).forEach(r => {
    if(r.type === 'revenue') rev += (+r.pc) - (+r.pd);
    if(r.type === 'expense'){ exp += (+r.pd) - (+r.pc); if(String(r.code).startsWith('51')) cogs += (+r.pd) - (+r.pc); }
  });
  return { rev, exp, cogs, net: rev - exp };
}
function viewPL(){
  return `${rangeHtml('fillReport()')}
    <div class="acts" style="margin:0 0 12px;"><button class="btn" onclick="plExcel()">📊 Excel</button></div>
    <div id="rHost"><div class="empty">⏳ …</div></div>`;
}
function stmtSection(t: GlTB, rootType: string, sign: number): GlStmtRow[]{
  // sign: +1 للإيرادات (دائن − مدين) · −1 للمصروفات
  const rows = ACC.filter(a => a.type === rootType && a.parent && (t.sum[a.code].pd || t.sum[a.code].pc));
  return rows.map(a => {
    const s = t.sum[a.code];
    const v = sign > 0 ? s.pc - s.pd : s.pd - s.pc;
    return { a, d: depth(a.code), v };
  });
}
function plHtml(t: GlTB): string{
  const root = { revenue: ACC.find(a => a.type === 'revenue' && !a.parent), expense: ACC.find(a => a.type === 'expense' && !a.parent) };
  const R = stmtSection(t, 'revenue', 1), E = stmtSection(t, 'expense', -1);
  const rev = root.revenue ? t.sum[root.revenue.code].pc - t.sum[root.revenue.code].pd : 0;
  const exp = root.expense ? t.sum[root.expense.code].pd - t.sum[root.expense.code].pc : 0;
  const net = rev - exp;
  const row: (r: GlStmtRow) => string = r => `<tr class="${r.a.is_group ? 'g' : 'click'}" ${r.a.is_group ? '' : `onclick="openStatement('${r.a.code}')"`}><td class="ind${Math.min(r.d, 3)}"><span class="code">${r.a.code}</span> ${escH(r.a.name)}</td><td class="n">${fmt(r.v)}</td></tr>`;
  return `<div class="stats">
      <div class="stat"><div class="k">💰 الإيرادات</div><div class="v">${fmt(rev)}</div></div>
      <div class="stat"><div class="k">🧾 المصروفات</div><div class="v">${fmt(exp)}</div></div>
      <div class="stat ${net >= 0 ? 'good' : 'bad'}"><div class="k">${net >= 0 ? '📈 صافي الربح' : '📉 صافي الخسارة'}</div><div class="v">${fmt(Math.abs(net))}</div></div>
      <div class="stat"><div class="k">📐 هامش الربح</div><div class="v">${rev ? Math.round(net / rev * 100) + '%' : '—'}</div></div></div>
    <div class="tscroll"><table class="tbl">
      <tr class="g1"><td>💰 الإيرادات</td><td class="n">${fmt(rev)}</td></tr>${R.map(row).join('') || '<tr><td colspan="2" class="zero">مفيش</td></tr>'}
      <tr class="g1"><td>🧾 المصروفات</td><td class="n">${fmt(exp)}</td></tr>${E.map(row).join('') || '<tr><td colspan="2" class="zero">مفيش</td></tr>'}
      <tr class="tot"><td>${net >= 0 ? '📈 صافي الربح' : '📉 صافي الخسارة'}</td><td class="n">${fmt(net)}</td></tr>
    </table></div>
    <div class="hint" style="margin-top:8px;">⚠️ المصروفات اللي في الإكسل (إيجار · كهربا · مسحوبات …) لسه مابتدخلش لوحدها — هتدخل لما «استيراد الإكسل» يتعمل، أو اكتبها بقيد يدوي.</div>`;
}
async function plExcel(){
  try{
    const t = await needTB(S.from, S.to);
    const R = stmtSection(t, 'revenue', 1), E = stmtSection(t, 'expense', -1);
    const rows = [['', 'الإيرادات', null], ...R.map(r => [r.a.code, '  '.repeat(r.d) + r.a.name, r.v]),
                  ['', 'المصروفات', null], ...E.map(r => [r.a.code, '  '.repeat(r.d) + r.a.name, r.v])];
    const p = plCalc(t.rows);
    rows.push(['', p.net >= 0 ? 'صافي الربح' : 'صافي الخسارة', p.net]);
    await excel('أرباح-وخسائر', `قائمة الأرباح والخسائر من ${S.from} لحد ${S.to}`, ['رقم الحساب','البند','المبلغ'], rows, [2],
      rows.map(r => !r[0]));
  }catch(e: any){ toast(errMsg(e), true); }
}

// ---------- 🏦 الميزانية ----------
function viewBS(){
  return `${rangeHtml('fillReport()', true)}
    <div class="acts" style="margin:0 0 12px;"><button class="btn" onclick="bsExcel()">📊 Excel</button></div>
    <div id="rHost"><div class="empty">⏳ …</div></div>`;
}
function bsCalc(t: GlTB){
  const sec: (type: string) => GlStmtRow[] = type => ACC.filter(a => a.type === type && (Math.abs(t.sum[a.code].pd - t.sum[a.code].pc) > .004))
    .map(a => ({ a, d: depth(a.code), v: (type === 'asset' ? 1 : -1) * (t.sum[a.code].pd - t.sum[a.code].pc) }));
  const tot: (type: string) => number = type => { const r = ACC.find(a => a.type === type && !a.parent); return r ? (type === 'asset' ? 1 : -1) * (t.sum[r.code].pd - t.sum[r.code].pc) : 0; };
  const p = plCalc(t.rows);
  return { A: sec('asset'), L: sec('liability'), E: sec('equity'), ta: tot('asset'), tl: tot('liability'), te: tot('equity'), earn: p.net };
}
function bsHtml(t: GlTB): string{
  const b = bsCalc(t);
  const right = b.tl + b.te + b.earn;
  const ok = r2(b.ta) === r2(right);
  const row: (r: GlStmtRow) => string = r => `<tr class="${r.a.is_group ? (r.d === 0 ? 'g1' : 'g') : 'click'}" ${r.a.is_group ? '' : `onclick="openStatement('${r.a.code}')"`}><td class="ind${Math.min(r.d, 3)}"><span class="code">${r.a.code}</span> ${escH(r.a.name)}</td><td class="n">${fmt(r.v)}</td></tr>`;
  return `${ok ? '<div class="okbox">✅ الميزانية متوازنة: الأصول = الخصوم + حقوق الملكية</div>' : '<div class="err">❌ الميزانية مش متوازنة — ابعتلي صورة</div>'}
    <div class="tscroll"><table class="tbl">
      ${b.A.map(row).join('') || '<tr class="g1"><td>الأصول</td><td class="n">0</td></tr>'}
      <tr class="tot"><td>إجمالي الأصول</td><td class="n">${fmt(b.ta)}</td></tr>
      ${b.L.map(row).join('') || '<tr class="g1"><td>الخصوم</td><td class="n">0</td></tr>'}
      ${b.E.map(row).join('') || '<tr class="g1"><td>حقوق الملكية</td><td class="n">0</td></tr>'}
      <tr class="g"><td class="ind1">📈 أرباح لسه ماتقفلتش (الإيرادات − المصروفات)</td><td class="n">${fmt(b.earn)}</td></tr>
      <tr class="tot"><td>إجمالي الخصوم وحقوق الملكية</td><td class="n">${fmt(right)}</td></tr>
    </table></div>`;
}
async function bsExcel(){
  try{
    const t = await needTB('1900-01-01', S.asOf);
    const b = bsCalc(t);
    const rows = [...b.A.map(r => [r.a.code, '  '.repeat(r.d) + r.a.name, r.v]), ['', 'إجمالي الأصول', b.ta],
                  ...b.L.map(r => [r.a.code, '  '.repeat(r.d) + r.a.name, r.v]), ...b.E.map(r => [r.a.code, '  '.repeat(r.d) + r.a.name, r.v]),
                  ['', 'أرباح لسه ماتقفلتش', b.earn], ['', 'إجمالي الخصوم وحقوق الملكية', b.tl + b.te + b.earn]];
    await excel('الميزانية', 'الميزانية في ' + S.asOf, ['رقم الحساب','البند','المبلغ'], rows, [2],
      rows.map(r => !r[0] || (ACCM[r[0] as string] || {} as GlAccount).is_group));
  }catch(e: any){ toast(errMsg(e), true); }
}

async function fillReport(){
  const h = $('rHost'); if(!h) { if(S.tab === 'home') homePL(); return; }
  try{
    const bs = S.tab === 'bs', ch = S.tab === 'chart';
    const t = await needTB(bs || ch ? '1900-01-01' : S.from, bs ? S.asOf : ch ? cairoDay() : S.to);
    const hh = $('rHost'); if(!hh) return;
    hh.innerHTML = S.tab === 'tb' ? tbHtml(t) : S.tab === 'pl' ? plHtml(t) : bs ? bsHtml(t) : chartHtml(t);
  }catch(e: any){ const hh = $('rHost'); if(hh) hh.innerHTML = `<div class="err">${escH(errMsg(e))}</div>`; }
}

// ---------- 🔗 مطابقة العملاء ----------
function viewRec(){
  return `<div class="hint">بنقارن رصيد كل عميل في «📒 حسابات العملاء» برصيده في الأستاذ (حساب 1200).
    المفروض يبقوا زي بعض. الفرق بيحصل لما:<br>
    • لسه مفيش قيد افتتاحي (المديونيات القديمة قبل البداية) ←  اكتبه من «📌 القيد الافتتاحي»<br>
    • جهاز آجل اتسجّل في الدفتر من غير فاتورة تسليم (أو العكس) · أو مبلغ الجهاز اتعدّل في مكان واحد بس</div>
    <div id="recHost">${recHtml()}</div>`;
}
async function loadRec(){
  try{ REC = await rpc('gl_ar_reconcile'); }catch(e: any){ REC = { err: errMsg(e) } as GlList<GlRecRow>; }
  const h = $('recHost'); if(h) h.innerHTML = recHtml();
}
function recHtml(){
  if(!REC) return '<div class="empty">⏳ …</div>';
  if(REC.err) return `<div class="err">${escH(REC.err)}</div>`;
  if(!REC.length) return '<div class="okbox">✅ كل العملاء متطابقين</div>';
  const tot = REC.reduce((t, r) => t + (+r.diff), 0);
  return `<div class="warnbox">⚠️ ${REC.length} عميل مختلفين — إجمالي الفرق ${fmt(tot)} ج.م</div>
    <div class="tscroll"><table class="tbl"><tr><th>العميل</th><th class="n">حسابات العملاء</th><th class="n">الأستاذ</th><th class="n">الفرق</th></tr>
    ${REC.slice(0, 300).map(r => `<tr class="click" onclick="openStatement('1200',{customer:'${r.id}',label:'${escH(r.code + ' · ' + r.name).replace(/'/g, '')}'})">
      <td><span class="code">${escH(r.code)}</span> ${escH(r.name)}</td><td class="n">${fmt(r.sub)}</td><td class="n">${fmt(r.gl)}</td>
      <td class="n money ${+r.diff > 0 ? 'neg' : 'dr'}">${fmt(r.diff)}</td></tr>`).join('')}</table></div>`;
}

// ---------- 🔒 الفترات ----------
function viewPeriods(){
  const today = cairoDay();
  const cur = today.slice(0, 7);
  const P: Record<string, GlPeriod> = {}; (H.periods || []).forEach(p => { P[String(p.ym).slice(0, 7)] = p; });
  const months = [];
  let m = H.start.slice(0, 7);
  while(m <= cur && months.length < 120){ months.push(m); const [y, x] = m.split('-').map(Number); m = x === 12 ? (y + 1) + '-01' : y + '-' + String(x + 1).padStart(2, '0'); }
  const fm = H.fy_start_month || 1;
  const years = [];
  for(let y = +H.start.slice(0, 4); ; y++){
    const end = (fm === 1 ? y : y + 1) + '-' + String(fm === 1 ? 12 : fm - 1).padStart(2, '0') + '-' + (fm === 1 ? '31' : '28');
    if(end >= today) break;
    years.push(y);
    if(years.length > 20) break;
  }
  if(!FA) loadFA().then(() => { if(S.tab === 'periods') render(); });
  const faPend = FA && !FA.err && FA.next_ym && FA.next_ym < FA.now_ym;
  return `${faPend ? `<div class="warnbox">🏗️ إهلاك ${ymLbl(FA.next_ym)} لسه ما اتعملش — الشهر مش هيتقفل من غيره. <button class="btn sm pri" onclick="openFARun()">🏗️ اعمله</button></div>` : ''}<div class="hint">🔒 الشهر المقفول ماحدش يقدر يكتب فيه قيد بإيده. الورق التلقائي اللي يخصّه بيتقيد بتاريخ النهارده (وبيتكتب جنبه كده).
    اقفل الشهر لما تخلّص مراجعته.</div>
    ${months.length ? months.slice().reverse().map(ym => {
      const p = P[ym]; const closed = p && p.status === 'closed'; const isCur = ym === cur;
      return `<div class="card${closed ? '' : ''}" style="--edge:${closed ? 'var(--ink-2)' : 'var(--done)'}">
        <div class="c-top"><div class="c-t">${monthLbl(ym)}</div><span class="pill ${closed ? '' : 'green'}">${closed ? '🔒 مقفول' : '🔓 مفتوح'}</span></div>
        ${p && p.closed_by ? `<div class="c-s">${closed ? 'اتقفل' : 'اتفتح'} بواسطة ${escH(p.closed_by)}${p.note ? ' · ' + escH(p.note) : ''}</div>` : ''}
        <div class="acts">${isCur ? '<span class="c-s">الشهر الحالي — بيتقفل بعد ما يخلص</span>'
          : closed ? `<button class="btn sm" onclick="periodSet('${ym}-01',false)">🔓 افتح</button>`
                   : `<button class="btn sm pri" onclick="periodSet('${ym}-01',true)">🔒 اقفل</button>`}
          <button class="btn ghost sm" onclick="S.from='${ym}-01';S.to='${lastDay(ym)}';go('tb')">⚖️ الميزان</button></div></div>`;
    }).join('') : '<div class="empty">الدفاتر لسه مابدأتش</div>'}
    <div class="sec-h">📅 إقفال السنة<span class="rule"></span></div>
    <div class="hint">آخر السنة: الإيرادات والمصروفات بتتصفّر، وصافي الربح (أو الخسارة) بيروح «الأرباح المحتجزة» (3400). بيتعمل مرة واحدة بس.</div>
    ${years.length ? years.map(y => {
      const done = (H.years_closed || []).map(String).includes(String(y));
      return `<div class="card"><div class="c-top"><div class="c-t">السنة المالية ${y}</div>
        ${done ? '<span class="pill green">✅ اتقفلت</span>' : `<button class="btn sm pri" onclick="yearClose(${y})">📅 اقفل السنة</button>`}</div></div>`;
    }).join('') : '<div class="empty">لسه مفيش سنة خلصت</div>'}`;
}
function lastDay(ym: string): string{ const [y, m] = ym.split('-').map(Number); return ym + '-' + String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0'); }
async function periodSet(d: string, closed: boolean){
  let note: string | null = '';
  if(!closed){ note = prompt('🔓 ليه بتفتح ' + monthLbl(d) + '؟'); if(note === null) return; }
  else if(!confirm('🔒 نقفل ' + monthLbl(d) + '؟\nمحدش هيقدر يكتب فيه قيد بإيده بعد كده.')) return;
  try{ await rpc('gl_period_set', { p_ym:d, p_closed:closed, p_note:note }); toast(closed ? '🔒 اتقفل' : '🔓 اتفتح'); load(); }
  catch(e: any){ toast(errMsg(e), true); }
}
async function yearClose(y: number){
  if(!confirm(`📅 إقفال السنة المالية ${y}\nالإيرادات والمصروفات هتتصفّر وصافي الربح يروح «الأرباح المحتجزة».\nمتأكد؟`)) return;
  try{ const r = await rpc('gl_year_close', { p_year:y }); toast('📅 اتقفلت — ' + r.entry_no); load(); }
  catch(e: any){ toast(errMsg(e), true); }
}

// ============================================================
// 🏗️ الأصول الثابتة والإهلاك (ملف SQL رقم 108)
// ------------------------------------------------------------
// 🧸 كل أصل له كارت (FA-26-00001): السعر · العمر · الطريقة.
//    زرار «🏗️ اعمل إهلاك الشهر» بيقسّم على كل الكروت ويكتب قيد واحد.
//    والشهر مايتقفلش لو إهلاكه لسه ما اتعملش (السيرفر بيقفله).
// ============================================================
let FA: FaBoard = null!;   // 🧸 فاضي (null) لحد ما يتحمّل — الكود بيسأل if(!FA) قبل ما يستخدمه
const FA_KIND: Record<string, string> = { tangible:'🏗️ ثابتة', intangible:'🧠 معنوية', prepaid:'📅 مقدمات' };
const FA_METH: Record<string, string> = { sl:'قسط ثابت', ddb:'متناقص مضاعف', units:'وحدات إنتاج' };
const FA_FUND: Record<string, string> = { cash:'💵 خزنة', supplier:'🏪 على تاجر', partner:'🤝 شريك دفعه', opening:'📌 رصيد افتتاحي', existing:'📝 متقيّد قبل كده' };
const faCls: (code: string) => FaClass = code => ((FA && FA.classes) || []).find(c => c.code === code) || {} as FaClass;
const ymLbl: (ym: string | null | undefined) => string = ym => ym ? monthLbl(ym + '-01') : '—';
function lifeLbl(m: number | null | undefined): string{
  if(m == null) return 'مالوش إهلاك';
  const y = Math.floor(m / 12), r = m % 12;
  const yy = y === 1 ? 'سنة' : y === 2 ? 'سنتين' : y >= 3 && y <= 10 ? y + ' سنين' : y + ' سنة';
  const rr = r === 1 ? 'شهر' : r === 2 ? 'شهرين' : r >= 3 && r <= 10 ? r + ' شهور' : r + ' شهر';
  return [y ? yy : '', r ? rr : ''].filter(Boolean).join(' و');
}

async function loadFA(){
  try{ FA = await rpc('fa_board'); }
  catch(e: any){ FA = { err: errMsg(e).replace('107', '108') } as FaBoard; }
  const h = $('faHost'); if(h) h.innerHTML = faHtml();
}
function viewFA(){
  const chips = [['all','الكل'], ['tangible','🏗️ ثابتة'], ['intangible','🧠 معنوية'], ['prepaid','📅 مقدمات'], ['disposed','🚮 اتباعت/اتلغت']];
  return `<div class="hint">كل أصل بيتسجّل مرة واحدة بسعره وعمره، وكل شهر بيتاخد منه «قسط إهلاك». المقدمات (إيجار مقدم · مقابل محل استحواذ) بتتوزّع على شهور العقد بنفس الطريقة.</div>
    <div class="chips" style="margin-bottom:10px;">${chips.map(([k, l]) => `<button class="chip${(S.fak || 'all') === k ? ' on' : ''}" onclick="S.fak='${k}';reFA()">${l}</button>`).join('')}</div>
    <div class="acts" style="margin:0 0 12px;">
      <button class="btn" onclick="openFARun()">🏗️ إهلاك الشهر</button>
      <button class="btn" onclick="openFATax()">🧾 الضريبي</button>
      <button class="btn" onclick="openFAClasses()">🗂️ الأنواع</button></div>
    <div id="faHost">${FA ? faHtml() : '<div class="empty">⏳ …</div>'}</div>`;
}
function reFA(){ render(); }
function faHtml(){
  if(!FA) return '<div class="empty">⏳ …</div>';
  if(FA.err) return `<div class="err">${escH(FA.err)}</div>`;
  const live = FA.assets.filter(a => a.status === 'active');
  const cost = live.reduce((t, a) => t + (+a.cost), 0), acc = live.reduce((t, a) => t + (+a.accum), 0);
  const monthly = live.reduce((t, a) => t + (+a.this_month! || 0), 0);
  const pend = FA.next_ym && FA.next_ym <= FA.now_ym;
  const k = S.fak || 'all';
  const L = FA.assets.filter(a => k === 'disposed' ? a.status !== 'active'
    : a.status === 'active' && (k === 'all' || faCls(a.class_code).kind === k));
  const units = (FA.units_needed || []).filter(u => u.ym && u.ym <= FA.now_ym);
  return `<div class="stats">
      <div class="stat"><div class="k">💰 التكلفة</div><div class="v">${fmt(cost)}</div><div class="s">${live.length} أصل شغّال</div></div>
      <div class="stat"><div class="k">📉 اتهلك</div><div class="v">${fmt(acc)}</div></div>
      <div class="stat"><div class="k">📗 القيمة الدفترية</div><div class="v">${fmt(cost - acc)}</div></div>
      <div class="stat"><div class="k">🗓️ القسط الجاي</div><div class="v">${fmt(monthly)}</div><div class="s">${FA.next_ym ? ymLbl(FA.next_ym) : '—'}</div></div></div>
    ${pend ? `<div class="warnbox">🏗️ إهلاك <b>${ymLbl(FA.next_ym)}</b> لسه ما اتعملش — والشهر مش هيتقفل من غيره.
      <br><button class="btn sm pri" onclick="openFARun()">🏗️ اعمله دلوقتي</button></div>` : FA.assets.length ? '<div class="okbox">✅ الإهلاك متقيّد لحد آخر شهر</div>' : ''}
    ${units.length ? `<div class="warnbox">🔢 محتاج وحدات الإنتاج: ${units.map(u => `<button class="btn sm" onclick="faUnits('${u.id}','${u.ym}')">${escH(u.code)} · ${ymLbl(u.ym)}</button>`).join(' ')}</div>` : ''}
    ${L.length ? L.map(faCard).join('') : `<div class="empty">${FA.assets.length ? 'مفيش في الفلتر ده' : 'لسه مفيش أصول — دوس «➕ أصل جديد»'}</div>`}`;
}
function faCard(a: FaAsset): string{
  const c = faCls(a.class_code);
  const base = (+a.cost) - (+a.salvage);
  const pct = base > 0 ? Math.min(100, Math.round((+a.accum) / base * 100)) : 0;
  const book = (+a.cost) - (+a.accum);
  const st = a.status === 'void' ? '<span class="pill">✖️ اتلغى</span>' : a.status === 'disposed' ? `<span class="pill red">🚮 ${+a.disposal_amount ? 'اتباع' : 'اتشال'} ${dt(a.disposed_on)}</span>`
    : a.life_months == null ? '<span class="pill">مالوش إهلاك</span>' : !a.next_ym ? '<span class="pill green">✅ خلص إهلاكه</span>' : '';
  return `<button class="card${a.status !== 'active' ? ' off' : ''}" style="--edge:${c.kind === 'prepaid' ? 'var(--wait)' : c.kind === 'intangible' ? 'var(--violet)' : 'var(--blue)'}" onclick="openFA('${a.id}')">
    <div class="c-top"><div class="c-t">${escH(a.name)} <span class="code">${escH(a.code)}</span></div><div class="money">${fmt(book)}</div></div>
    <div class="c-s">${escH(c.name || a.class_code)}${a.customer ? ' · ' + escH(a.customer) : ''} · التكلفة ${fmt(a.cost)} · ${lifeLbl(a.life_months)}${a.life_months ? ' · ' + FA_METH[a.method] : ''}
      ${a.status === 'active' && a.this_month ? ' · القسط ' + fmt(a.this_month) : ''} ${st}</div>
    ${a.life_months ? `<div style="height:6px;background:var(--soft);border-radius:4px;margin-top:7px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:var(--accent);"></div></div>
      <div class="c-s" style="font-size:11.5px;">اتهلك ${pct}% (${fmt(a.accum)})${+a.impaired ? ' · منهم اضمحلال ' + fmt(a.impaired) : ''}</div>` : ''}
  </button>`;
}

// ---------- ➕ أصل جديد ----------
let FN: FaForm = null!;
function openFAAdd(){
  if(!FA || FA.err){ toast('الأصول لسه ماتحمّلتش', true); return; }
  FN = { class_code:'MACH', funding:'cash', cash_acc:'1101', acquired_on:cairoDay(), in_service_on:'', method:'' };
  sheet('➕ أصل جديد', faAddHtml());
}
function fnSave(){
  ['name','acquired_on','in_service_on','cost','salvage','life_months','units_total','opening_accum','serial','location','note','customer','supplier','cash_acc','method']
    .forEach(k => { const el = $('fn_' + k); if(el) FN[k] = el.value; });
}
function faAddHtml(){
  const c = faCls(FN.class_code);
  const life = FN.life_months !== undefined && FN.life_months !== '' ? FN.life_months : (c.life_months == null ? '' : c.life_months);
  const meth = FN.method || c.method || 'sl';
  const cashAccs = leafs().filter(a => a.code.startsWith('11') && a.active);
  const groups: Record<string, FaClass[]> = { tangible:[], intangible:[], prepaid:[] };
  (FA.classes || []).forEach(x => groups[x.kind].push(x));
  const opening = FN.funding === 'opening';
  return `<label class="f"><span>🗂️ النوع</span><select id="fn_class" onchange="fnSave();FN.class_code=this.value;FN.life_months='';FN.method='';setSheetBody(faAddHtml())">
      ${Object.entries(groups).map(([k, L]) => `<optgroup label="${FA_KIND[k]}">${L.map(x => `<option value="${x.code}"${x.code === FN.class_code ? ' selected' : ''}>${escH(x.name)}</option>`).join('')}</optgroup>`).join('')}</select>
      <div class="note-in">${c.kind === 'prepaid' ? '📅 مصروف مدفوع مقدم — بيتوزّع على شهور العقد' : c.life_months == null ? '⚠️ النوع ده مالوش إهلاك (اضمحلال بس)' : 'العمر الافتراضي ' + lifeLbl(c.life_months) + ' — تقدر تغيّره تحت'}</div></label>
    <label class="f"><span>🏷️ الاسم</span><input id="fn_name" value="${escH(FN.name || '')}" placeholder="${c.kind === 'prepaid' ? 'مثال: إيجار المحل ٢٠٢٧' : 'مثال: ماكينة فصل شاشات'}"></label>
    ${c.needs_customer ? `<label class="f"><span>🤝 محل الاستحواذ</span><input id="fn_customer" list="dlCust" value="${escH(FN.customer || '')}" placeholder="اكتب واختار"></label>` : ''}
    <div class="f2">
      <label class="f"><span>📅 ${c.kind === 'prepaid' ? 'تاريخ الدفع' : 'تاريخ الشراء'}</span><input id="fn_acquired_on" type="date" value="${escH(FN.acquired_on || '')}" max="${cairoDay()}"></label>
      <label class="f"><span>▶️ ${c.kind === 'prepaid' ? 'بداية العقد' : 'بداية الاستخدام'}</span><input id="fn_in_service_on" type="date" value="${escH(FN.in_service_on || '')}"></label>
    </div>
    <div class="note-in" style="margin:-6px 0 10px;">الإهلاك بيبدأ من شهر بداية الاستخدام (شهر كامل). فاضي = نفس تاريخ الشراء.</div>
    <div class="f2">
      <label class="f"><span>💰 ${c.kind === 'prepaid' ? 'المبلغ المدفوع' : 'التكلفة'}</span><input id="fn_cost" inputmode="decimal" value="${escH(FN.cost || '')}" oninput="fnEst()"></label>
      <label class="f"><span>⏳ ${c.kind === 'prepaid' ? 'مدة العقد (شهور)' : 'العمر (شهور)'}</span><input id="fn_life_months" inputmode="numeric" value="${escH(life)}" oninput="fnEst()" placeholder="فاضي = مالوش إهلاك"></label>
    </div>
    ${c.kind !== 'prepaid' && c.life_months !== null ? `<div class="f2">
      <label class="f"><span>♻️ قيمة الخردة (آخر العمر)</span><input id="fn_salvage" inputmode="decimal" value="${escH(FN.salvage || '')}" placeholder="0" oninput="fnEst()"></label>
      <label class="f"><span>🧮 الطريقة</span><select id="fn_method" onchange="fnSave();setSheetBody(faAddHtml())">${Object.entries(FA_METH).map(([k, l]) => `<option value="${k}"${meth === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
    </div>` : ''}
    ${meth === 'units' && c.kind !== 'prepaid' ? `<label class="f"><span>🔢 إجمالي الوحدات المتوقعة طول العمر</span><input id="fn_units_total" inputmode="decimal" value="${escH(FN.units_total || '')}"></label>` : ''}
    <div class="okbox" id="fnEst" style="font-weight:800;">${fnEstTxt()}</div>
    <label class="f"><span>💳 اتدفع منين؟</span><div class="chips">${Object.entries(FA_FUND).map(([k, l]) => `<button class="chip${FN.funding === k ? ' on' : ''}" onclick="fnSave();FN.funding='${k}';setSheetBody(faAddHtml())">${l}</button>`).join('')}</div>
      <div class="note-in">${{ cash:'بيتخصم من حساب النقدية اللي هتختاره', supplier:'بيتكتب على حساب التاجر (يتدفعله بعدين)', partner:'شريك دفعه من جيبه ← جاري الشركاء (3200)',
        opening:'الأصل كان موجود قبل يوم البداية (' + dt(H.start) + ') — بيدخل الرصيد الافتتاحي بتكلفته واللي اتهلك منه', existing:'القيد اتعمل قبل كده بإيدك — بنسجّل الكارت بس عشان الإهلاك' }[FN.funding]}</div></label>
    ${FN.funding === 'cash' ? `<label class="f"><span>🏦 حساب النقدية</span><select id="fn_cash_acc">${cashAccs.map(a => `<option value="${a.code}"${(FN.cash_acc || '1101') === a.code ? ' selected' : ''}>${a.code} · ${escH(a.name)}</option>`).join('')}</select></label>` : ''}
    ${FN.funding === 'supplier' ? `<label class="f"><span>🏪 التاجر</span><input id="fn_supplier" list="dlSup" value="${escH(FN.supplier || '')}"></label>` : ''}
    ${opening ? `<label class="f"><span>📉 اللي اتهلك منه لحد ${dt(H.start)}</span><input id="fn_opening_accum" inputmode="decimal" value="${escH(FN.opening_accum || '')}" placeholder="0">
      <button class="btn sm" style="margin-top:6px;" onclick="fnSuggestOpen()">💡 احسبه (قسط ثابت)</button></label>` : ''}
    <details style="margin-bottom:12px;"><summary class="c-s" style="cursor:pointer;">➕ تفاصيل (سريال · مكان · ملاحظة)</summary>
      <div class="f2" style="margin-top:8px;"><label class="f"><span>🔖 سريال</span><input id="fn_serial" value="${escH(FN.serial || '')}"></label>
        <label class="f"><span>📍 المكان</span><input id="fn_location" value="${escH(FN.location || '')}"></label></div>
      <label class="f"><span>📝 ملاحظة</span><input id="fn_note" value="${escH(FN.note || '')}"></label></details>
    <button class="big" onclick="fnGo()">✅ سجّل الأصل</button>
    <div class="note-in">🔒 بيتكتب له قيد شراء في الكشكول باسمك. لو اتسجّل غلط ومفيش عليه إهلاك، بيتلغي بقيد عكسي.</div>`;
}
function fnEstTxt(){
  const g: (id: string) => number | null = id => num(($('fn_' + id) || {}).value);
  const cost = $('fn_cost') ? g('cost')! : num(FN.cost)!, life = $('fn_life_months') ? g('life_months')! : num(FN.life_months)!;
  const salv = ($('fn_salvage') ? g('salvage') : num(FN.salvage)) || 0;
  const meth = ($('fn_method') || {}).value || FN.method || faCls(FN.class_code).method;
  if(!(cost > 0)) return '🧮 اكتب التكلفة والعمر وهتشوف القسط الشهري';
  if(!(life > 0)) return '🧮 مالوش إهلاك — بيفضل بتكلفته (اضمحلال بس)';
  if(meth === 'units') return '🧮 القسط = (التكلفة − الخردة) × وحدات الشهر ÷ إجمالي الوحدات';
  if(meth === 'ddb') return `🧮 أول قسط ≈ ${fmt(cost * 2 / life)} ج.م وبيقل كل شهر`;
  return `🧮 القسط الشهري ≈ <span class="money">${fmt((cost - salv) / life)}</span> ج.م لمدة ${lifeLbl(life)}`;
}
function fnEst(){ const b = $('fnEst'); if(b) b.innerHTML = fnEstTxt(); }
function fnSuggestOpen(){
  fnSave();
  const cost = num(FN.cost)!, salv = num(FN.salvage) || 0, life = num(FN.life_months)!;
  const svc = FN.in_service_on || FN.acquired_on;
  if(!(cost > 0) || !(life > 0) || !svc){ toast('اكتب التكلفة والعمر وتاريخ الاستخدام الأول', true); return; }
  const [y1, m1] = svc.split('-').map(Number), [y2, m2] = H.start.split('-').map(Number);
  const months = Math.max(0, Math.min(life, (y2 - y1) * 12 + (m2 - m1)));
  FN.opening_accum = String(Math.round((cost - salv) * months / life * 100) / 100);
  setSheetBody(faAddHtml());
  toast(`💡 ${months} شهر × ${fmt((cost - salv) / life)} = ${fmt(FN.opening_accum)}`);
}
async function fnGo(){
  fnSave();
  const c = faCls(FN.class_code);
  const p: Record<string, any> = { class_code:FN.class_code, name:FN.name, acquired_on:FN.acquired_on, in_service_on:FN.in_service_on || '',
    cost:num(FN.cost), salvage:num(FN.salvage) || 0, life_months: String(FN.life_months ?? '').trim() === '' ? null : Math.round(num(FN.life_months)!),
    method:FN.method || c.method, units_total:num(FN.units_total), opening_accum:num(FN.opening_accum) || 0,
    funding:FN.funding, cash_acc:FN.cash_acc || '1101', serial:FN.serial || '', location:FN.location || '', note:FN.note || '' };
  if($('fn_life_months') === null && c.life_months == null) p.life_months = null;
  if(c.needs_customer){
    const v = String(FN.customer || '').trim();
    const cu = CUST.find(x => (x.code + ' · ' + x.name) === v) || CUST.find(x => x.code === v.split(' ')[0]);
    if(!cu){ toast('اختار محل الاستحواذ من القايمة', true); return; }
    p.customer_id = cu.id;
  }
  if(FN.funding === 'supplier'){
    const s = SUP.find(x => x.name === String(FN.supplier || '').trim());
    if(!s){ toast('اختار التاجر من القايمة', true); return; }
    p.supplier_id = s.id;
  }
  if(!confirm(`➕ ${p.name || 'أصل'} — ${fmt(p.cost)} ج.م\n${FA_FUND[p.funding]}\nنسجّل؟`)) return;
  try{
    const a = await rpc('fa_asset_add', { p });
    closeSheet(); toast('✅ اتسجّل ' + a.code); FA = null!; await loadFA(); load();
  }catch(e: any){ toast(errMsg(e), true); }
}

// ---------- 🪪 كارت الأصل ----------
let FAC: FaCard = null!;
async function openFA(id: string){
  const a = FA.assets.find(x => x.id === id); if(!a) return;
  FAC = { a, sch:null };
  sheet(a.code + ' · ' + a.name, faSheetHtml());
  try{ FAC.sch = await rpc('fa_schedule', { p_id:id }); }catch(e: any){ FAC.sch = { err: errMsg(e) }; }
  if(FAC && FAC.a.id === id) setSheetBody(faSheetHtml());
}
function faSheetHtml(){
  const a = FAC.a, c = faCls(a.class_code), s = FAC.sch;
  const book = (+a.cost) - (+a.accum);
  const row: (k: string, v: string) => string = (k, v) => `<div class="jl"><div class="a">${k}</div><div class="d" style="color:var(--ink)">${v}</div><div></div></div>`;
  let sched = '<div class="empty">⏳ …</div>';
  if(s && s.err) sched = `<div class="err">${escH(s.err)}</div>`;
  else if(s){
    const fut = s.future || [];
    sched = `<div class="tscroll"><table class="tbl"><tr><th>الشهر</th><th class="n">القسط</th><th>القيد</th></tr>
      ${(s.past || []).map(r => `<tr><td>${ymLbl(r.ym)}${r.units != null ? ' · ' + fmt(r.units) + ' وحدة' : ''}</td><td class="n">${fmt(r.amt)}</td><td><span class="code">${escH(r.no || '')}</span></td></tr>`).join('')}
      ${fut.slice(0, 12).map(r => `<tr style="opacity:.6"><td>${ymLbl(r.ym)} <small>(متوقع)</small></td><td class="n">${fmt(r.amt)}</td><td></td></tr>`).join('')}
      ${fut.length > 12 ? `<tr style="opacity:.6"><td colspan="3">… و${fut.length - 12} شهر كمان (${fmt(fut.slice(12).reduce((t, r) => t + (+r.amt), 0))} ج.م)</td></tr>` : ''}
      ${!(s.past || []).length && !fut.length ? '<tr><td colspan="3" class="zero">مفيش أقساط</td></tr>' : ''}</table></div>
      ${(s.impairs || []).length ? `<div class="sec-h">💥 اضمحلال<span class="rule"></span></div>${s.impairs!.map(i => `<div class="c-s">${dt(i.date)} · ${fmt(i.amt)} · ${escH(i.reason)} · <span class="code">${escH(i.no || '')}</span></div>`).join('')}` : ''}`;
  }
  const act = a.status === 'active';
  return `<div class="card" style="margin-bottom:10px;">
      ${row('النوع', escH(c.name || a.class_code))}
      ${a.customer ? row('محل الاستحواذ', escH(a.customer)) : ''}
      ${row('التكلفة', fmt(a.cost))}${+a.salvage ? row('الخردة', fmt(a.salvage)) : ''}
      ${row('اتهلك', fmt(a.accum) + (+a.opening_accum ? ` <small>(منهم ${fmt(a.opening_accum)} قبل البداية)</small>` : ''))}
      ${row('القيمة الدفترية', '<b>' + fmt(book) + '</b>')}
      ${row('العمر', lifeLbl(a.life_months) + (a.life_months ? ' · ' + FA_METH[a.method] : ''))}
      ${row('الشراء / الاستخدام', dt(a.acquired_on) + ' / ' + dt(a.in_service_on))}
      ${row('اتدفع', FA_FUND[a.funding] + (a.supplier ? ' — ' + escH(a.supplier) : '') + (a.acq_no ? ` <span class="code">${escH(a.acq_no)}</span>` : ''))}
      ${a.serial || a.location ? row('سريال · مكان', escH([a.serial, a.location].filter(Boolean).join(' · '))) : ''}
      ${a.note ? row('ملاحظة', escH(a.note)) : ''}
      ${a.status === 'disposed' ? row('🚮 اتباع', dt(a.disposed_on) + ' بـ ' + fmt(a.disposal_amount) + ' · ' + escH(a.disposal_note) + (a.disp_no ? ` <span class="code">${escH(a.disp_no)}</span>` : '')) : ''}
      ${a.status === 'void' ? row('✖️ اتلغى', escH(a.void_reason)) : ''}
    </div>
    <div class="acts" style="margin:0 0 12px;">
      ${act && a.method === 'units' ? `<button class="btn sm" onclick="faUnits('${a.id}','${a.next_ym || FA.now_ym}')">🔢 وحدات الشهر</button>` : ''}
      ${act ? `<button class="btn sm" onclick="faEdit()">✏️ تعديل</button>` : ''}
      ${act && c.kind !== 'prepaid' ? `<button class="btn sm" onclick="faImpair()">💥 اضمحلال</button>` : ''}
      ${act ? `<button class="btn sm" onclick="faDispose()">🚮 ${c.kind === 'prepaid' ? 'إنهاء العقد' : 'بيع / استبعاد'}</button>` : ''}
      ${a.status === 'disposed' ? `<button class="btn sm" onclick="faDisposeUndo()">↩️ إلغاء البيع</button>` : ''}
      ${act ? `<button class="btn bad sm" onclick="faVoid()">✖️ اتسجّل غلط</button>` : ''}
    </div>
    <div class="sec-h">📅 جدول الإهلاك<span class="rule"></span></div>${sched}`;
}
async function faAfter(msg: string, id?: string | null){ toast(msg); FA = null!; await loadFA(); if(id && FA.assets && FA.assets.some(x => x.id === id)) openFA(id); load(); }
async function faUnits(id: string, ym: string){
  const a = (FA.assets || []).find(x => x.id === id) || {} as Partial<FaAsset>;
  const v = prompt(`🔢 ${a.code || ''} ${a.name || ''}\nوحدات الإنتاج في ${ymLbl(ym)} (صفر لو مااشتغلتش):`);
  if(v === null) return;
  const n = num(v); if(n == null || n < 0){ toast('اكتب رقم', true); return; }
  try{
    await rpc('fa_units_set', { p_asset:id, p_ym: ym + '-01', p_units:n });
    if($('frPrev')){ toast('🔢 اتسجّلت'); FA = await rpc('fa_board'); frPrev(); }
    else faAfter('🔢 اتسجّلت', $('sheetOv') && FAC && FAC.a ? FAC.a.id : null);
  }catch(e: any){ toast(errMsg(e), true); }
}
function faEdit(){
  const a = FAC.a;
  sheet('✏️ ' + a.code, `<div class="hint">تغيير العمر أو الخردة أو الطريقة بيأثّر على <b>الأقساط الجاية بس</b> — اللي اتقيّد مابيتلمسش (ده «تغيير تقدير محاسبي»).</div>
    <label class="f"><span>🏷️ الاسم</span><input id="fe_name" value="${escH(a.name)}"></label>
    <div class="f2"><label class="f"><span>⏳ العمر (شهور من بداية الاستخدام)</span><input id="fe_life" inputmode="numeric" value="${a.life_months ?? ''}"></label>
      <label class="f"><span>♻️ الخردة</span><input id="fe_salv" inputmode="decimal" value="${+a.salvage || ''}"></label></div>
    <label class="f"><span>🧮 الطريقة</span><select id="fe_meth">${Object.entries(FA_METH).map(([k, l]) => `<option value="${k}"${a.method === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f"><span>🔢 إجمالي الوحدات (لوحدات الإنتاج)</span><input id="fe_units" inputmode="decimal" value="${a.units_total ?? ''}"></label>
    <div class="f2"><label class="f"><span>🔖 سريال</span><input id="fe_serial" value="${escH(a.serial || '')}"></label><label class="f"><span>📍 المكان</span><input id="fe_loc" value="${escH(a.location || '')}"></label></div>
    <label class="f"><span>📝 ملاحظة</span><input id="fe_note" value="${escH(a.note || '')}"></label>
    <button class="big" onclick="faEditGo()">💾 حفظ</button>`);
}
async function faEditGo(){
  const id = FAC.a.id;
  const p = { name:$('fe_name').value, life_months:$('fe_life').value.trim() === '' ? null : Math.round(num($('fe_life').value)!),
    salvage:num($('fe_salv').value) || 0, method:$('fe_meth').value, units_total:num($('fe_units').value),
    serial:$('fe_serial').value, location:$('fe_loc').value, note:$('fe_note').value };
  try{ await rpc('fa_asset_edit', { p_id:id, p }); closeSheet(); faAfter('💾 اتحفظ', id); }catch(e: any){ toast(errMsg(e), true); }
}
async function faImpair(){
  const a = FAC.a;
  const amt = prompt(`💥 اضمحلال ${a.code} — القيمة الدفترية ${fmt(a.cost - a.accum)}\nقيمته نزلت قد إيه؟ (كسر · تقادم · عطل)`); if(amt === null) return;
  const why = prompt('السبب:'); if(why === null) return;
  const d = prompt('التاريخ (YYYY-MM-DD):', cairoDay()); if(d === null) return;
  try{ await rpc('fa_impair_add', { p_id:a.id, p_date:d, p_amount:num(amt), p_reason:why }); faAfter('💥 اتسجّل', a.id); }catch(e: any){ toast(errMsg(e), true); }
}
function faDispose(){
  const a = FAC.a, c = faCls(a.class_code);
  const cashAccs = leafs().filter(x => x.code.startsWith('11') && x.active);
  sheet('🚮 ' + a.code + ' · ' + a.name, `<div class="hint">${c.kind === 'prepaid' ? 'العقد خلص بدري؟ لو المحل رجّعلك فلوس اكتبها — والباقي بيتصرف مصروف.' : 'بيع أو استبعاد (اتكسر · اتسرق · اترمى). الإهلاك بيتكمّل لحد شهر البيع، وبعدين: الثمن − القيمة الدفترية = ربح أو خسارة.'}</div>
    <div class="f2"><label class="f"><span>📅 التاريخ</span><input id="fd_date" type="date" value="${cairoDay()}" max="${cairoDay()}"></label>
      <label class="f"><span>💵 ${c.kind === 'prepaid' ? 'المسترد' : 'ثمن البيع'} (صفر لو استبعاد)</span><input id="fd_amt" inputmode="decimal" placeholder="0"></label></div>
    <label class="f"><span>🏦 الفلوس دخلت</span><select id="fd_cash">${cashAccs.map(x => `<option value="${x.code}"${x.code === '1101' ? ' selected' : ''}>${x.code} · ${escH(x.name)}</option>`).join('')}</select></label>
    <label class="f"><span>📝 السبب</span><input id="fd_why" placeholder="اتباع لمين · اتكسر · العقد اتلغى …"></label>
    <button class="big" onclick="faDisposeGo()">🚮 سجّل</button>`);
}
async function faDisposeGo(){
  const id = FAC.a.id;
  try{
    await rpc('fa_dispose', { p_id:id, p_date:$('fd_date').value, p_proceeds:num($('fd_amt').value) || 0, p_cash_acc:$('fd_cash').value, p_reason:$('fd_why').value });
    closeSheet(); faAfter('🚮 اتسجّل', id);
  }catch(e: any){ toast(errMsg(e), true); }
}
async function faDisposeUndo(){
  const why = prompt('↩️ ليه بتلغي البيع؟'); if(why === null) return;
  try{ await rpc('fa_dispose_undo', { p_id:FAC.a.id, p_reason:why }); faAfter('↩️ البيع اتلغى', FAC.a.id); }catch(e: any){ toast(errMsg(e), true); }
}
async function faVoid(){
  const why = prompt(`✖️ إلغاء ${FAC.a.code}\nبيتعمل قيد عكسي لقيد الشراء. (مينفعش لو عليه إهلاك متقيّد)\n\nالسبب:`); if(why === null) return;
  try{ await rpc('fa_asset_void', { p_id:FAC.a.id, p_reason:why }); closeSheet(); FAC = null!; faAfter('✖️ اتلغى'); }catch(e: any){ toast(errMsg(e), true); }
}

// ---------- 🏗️ إهلاك الشهر ----------
async function openFARun(){
  if(!FA || FA.err){ await loadFA(); }
  const target = FA.next_ym && FA.next_ym < FA.now_ym ? addDays(FA.now_ym + '-01', -1).slice(0, 7) : FA.now_ym;
  const opts = []; let m = FA.next_ym || FA.now_ym;
  while(m <= FA.now_ym && opts.length < 60){ opts.push(m); const [y, x] = m.split('-').map(Number); m = x === 12 ? (y + 1) + '-01' : y + '-' + String(x + 1).padStart(2, '0'); }
  sheet('🏗️ إهلاك الشهر', `<div class="hint">بيقيّد قسط كل الأصول لكل شهر ناقص لحد الشهر اللي هتختاره — كل شهر قيد لوحده بتاريخ آخر الشهر.
    عادةً بتعمله أول الشهر للشهر اللي فات، قبل ما تقفله.</div>
    ${opts.length && FA.next_ym ? `<label class="f"><span>📅 لحد شهر</span><select id="frYm" onchange="frPrev()">${opts.map(o => `<option value="${o}"${o === target ? ' selected' : ''}>${ymLbl(o)}</option>`).join('')}</select></label>
      <div id="frPrev"><div class="empty">⏳ …</div></div>
      <button class="big" onclick="frGo()">✅ قيّد الإهلاك</button>` : '<div class="okbox">✅ مفيش شهور ناقصة</div>'}
    <div class="sec-h">📜 اللي اتقيّد<span class="rule"></span></div>
    ${(FA.runs || []).length ? FA.runs!.map((r, i) => `<div class="card"><div class="c-top"><div class="c-t">${ymLbl(r.ym)}</div><div class="money">${fmt(r.total)}</div></div>
      <div class="c-s">${r.n} أصل · ${(r.entries || []).filter(Boolean).map(x => `<span class="code">${escH(x)}</span>`).join(' ')}</div>
      ${i === 0 ? `<div class="acts"><button class="btn bad sm" onclick="frUndo('${r.ym}')">↩️ الغي إهلاك الشهر ده</button></div>` : ''}</div>`).join('') : '<div class="empty">لسه مفيش</div>'}`);
  if(opts.length && FA.next_ym) frPrev();
}
async function frPrev(){
  const host = $('frPrev'); if(!host) return;
  const ym = FA.next_ym!;
  try{
    const rows: FaPreview[] = await rpc('fa_preview', { p_ym: ym + '-01' });
    const todo = rows.filter(r => !r.done);
    const tot = todo.reduce((t, r) => t + (+r.amt! || 0), 0);
    const later = $('frYm').value > ym;
    host.innerHTML = `<div class="hint">👀 أول شهر ناقص: <b>${ymLbl(ym)}</b>${later ? ' — والشهور اللي بعده لحد ' + ymLbl($('frYm').value) + ' هتتقيّد بنفس الطريقة' : ''}</div>
      <div class="tscroll"><table class="tbl"><tr><th>الأصل</th><th class="n">القسط</th></tr>
      ${todo.map(r => `<tr><td><span class="code">${escH(r.code)}</span> ${escH(r.name)}</td><td class="n">${r.amt == null ? `<button class="btn sm" onclick="faUnits('${r.id}','${ym}')">🔢 دخّل الوحدات</button>` : fmt(r.amt)}</td></tr>`).join('') || '<tr><td colspan="2" class="zero">مفيش</td></tr>'}
      <tr class="tot"><td>الإجمالي</td><td class="n">${fmt(tot)}</td></tr></table></div>`;
  }catch(e: any){ host.innerHTML = `<div class="err">${escH(errMsg(e))}</div>`; }
}
async function frGo(){
  const ym = $('frYm').value;
  if(!confirm('🏗️ قيّد الإهلاك لحد ' + ymLbl(ym) + '؟')) return;
  try{
    const r = await rpc('fa_run', { p_ym: ym + '-01' });
    closeSheet();
    const ms: { ym: string; total: number }[] = r.months || [];
    faAfter(ms.length ? '✅ ' + ms.map(x => ymLbl(x.ym) + ' ' + fmt(x.total)).join(' · ') : '✅ مفيش حاجة ناقصة');
  }catch(e: any){ toast(errMsg(e), true); }
}
async function frUndo(ym: string){
  const why = prompt(`↩️ إلغاء إهلاك ${ymLbl(ym)}\nبيتعمل قيد عكسي بنفس التاريخ (الشهر لازم يكون مفتوح).\n\nالسبب:`); if(why === null) return;
  try{ await rpc('fa_undo', { p_ym: ym + '-01', p_reason:why }); closeSheet(); faAfter('↩️ اتلغى'); }catch(e: any){ toast(errMsg(e), true); }
}

// ---------- 🗂️ الأنواع ----------
function openFAClasses(){
  sheet('🗂️ أنواع الأصول', `<div class="hint">العمر والطريقة الافتراضية بيتحطوا للأصول <b>الجديدة</b> بس. النسبة الضريبية للتقرير الضريبي.
    <br>⚠️ مبدئي (ق. ٩١/٢٠٠٥: مباني ٥٪ · معنوية ١٠٪ · كمبيوتر وبرامج ٥٠٪ متناقص · الباقي ٢٥٪ متناقص) — المحاسب القانوني يراجعها.</div>
    ${(FA.classes || []).map(c => `<div class="card"><div class="c-t">${escH(c.name)} <span class="code">${c.asset_acc}${c.accum_acc ? ' / ' + c.accum_acc : ''} → ${c.expense_acc}</span></div>
      <div class="f2" style="margin-top:8px;"><label class="f"><span>⏳ العمر (شهور)</span><input id="cl_l_${c.code}" inputmode="numeric" value="${c.life_months ?? ''}" placeholder="مالوش"></label>
        <label class="f"><span>🧮 الطريقة</span><select id="cl_m_${c.code}">${Object.entries(FA_METH).map(([k, l]) => `<option value="${k}"${c.method === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
      ${c.kind !== 'prepaid' ? `<div class="f2"><label class="f"><span>🧾 ضريبي ٪/سنة</span><input id="cl_t_${c.code}" inputmode="decimal" value="${+c.tax_rate}"></label>
        <label class="f"><span>طريقته</span><select id="cl_tm_${c.code}"><option value="sl"${c.tax_method === 'sl' ? ' selected' : ''}>ثابت</option><option value="db"${c.tax_method === 'db' ? ' selected' : ''}>متناقص</option></select></label></div>` : ''}
      <button class="btn sm" onclick="clSave('${c.code}')">💾 حفظ</button></div>`).join('')}`);
}
async function clSave(code: string){
  const v: (id: string) => string | undefined = id => ($(id) || {}).value;
  const l = String(v('cl_l_' + code) || '').trim();
  try{
    await rpc('fa_class_save', { p_code:code, p_life: l === '' ? null : Math.round(num(l)!), p_method:v('cl_m_' + code),
      p_tax_rate: v('cl_t_' + code) == null ? null : num(v('cl_t_' + code)), p_tax_method: v('cl_tm_' + code) || null });
    toast('💾 اتحفظ'); FA = null!; loadFA();
  }catch(e: any){ toast(errMsg(e), true); }
}

// ---------- 🧾 الإهلاك الضريبي (تقرير بس) ----------
// 🧸 بنحسب لكل أصل: سنة بسنة من سنة بداية الاستخدام (أول سنة بعدد الشهور).
//    ثابت = التكلفة × النسبة · متناقص = الباقي أول السنة × النسبة.
function taxCalc(a: FaAsset, year: number): FaTax | null{
  const c = faCls(a.class_code);
  const rate = (+c.tax_rate || 0) / 100;
  if(!rate || c.kind === 'prepaid') return null;
  const y0 = +a.in_service_on.slice(0, 4), m0 = +a.in_service_on.slice(5, 7);
  const endY = a.status === 'disposed' ? +a.disposed_on!.slice(0, 4) : 9999;
  let acc = 0, thisY = 0;
  for(let y = y0; y <= year && y <= endY; y++){
    const months = y === y0 ? 13 - m0 : 12;
    const left = (+a.cost) - acc;
    if(left <= 0) break;
    let d = c.tax_method === 'db' ? left * rate * months / 12 : (+a.cost) * rate * months / 12;
    d = Math.min(r2(d), r2(left));
    acc += d;
    if(y === year) thisY = d;
  }
  return { rate: c.tax_rate, method: c.tax_method, year: thisY, acc: r2(acc), book: r2((+a.cost) - acc) };
}
function openFATax(){
  const y = +cairoDay().slice(0, 4);
  sheet('🧾 الإهلاك الضريبي', `<div class="warnbox">⚠️ تقرير بس — القيود بالمحاسبي. الحساب تقريبي (لكل أصل لوحده، أول سنة بعدد الشهور) والمحاسب القانوني يراجعه قبل الإقرار.</div>
    <label class="f"><span>📅 السنة</span><select id="txY" onchange="txRender()">${[y, y - 1, y - 2].map(x => `<option value="${x}">${x}</option>`).join('')}</select></label>
    <div id="txBody"></div><button class="btn" style="margin-top:10px;" onclick="txExcel()">📊 Excel</button>`);
  txRender();
}
function txRows(year: number){
  return (FA.assets || []).filter(a => a.status !== 'void' && +a.in_service_on.slice(0, 4) <= year).map(a => {
    const t = taxCalc(a, year); if(!t) return null;
    const accY = +((a.by_year || {})[String(year)] || 0);
    return { a, t, accY, diff: r2(t.year - accY) };
  }).filter(Boolean) as FaTaxRow[];
}
function txRender(){
  const year = +$('txY').value, R = txRows(year);
  const tot = R.reduce((x, r) => { x.t += r.t.year; x.a += r.accY; return x; }, { t:0, a:0 });
  $('txBody').innerHTML = R.length ? `<div class="tscroll"><table class="tbl"><tr><th>الأصل</th><th class="n">النسبة</th><th class="n">ضريبي</th><th class="n">محاسبي</th><th class="n">الفرق</th></tr>
    ${R.map(r => `<tr><td><span class="code">${escH(r.a.code)}</span> ${escH(r.a.name)}</td><td class="n">${r.t.rate}% ${r.t.method === 'db' ? 'متناقص' : 'ثابت'}</td>
      <td class="n">${fmt(r.t.year)}</td><td class="n">${fmt(r.accY)}</td><td class="n">${fmt(r.diff)}</td></tr>`).join('')}
    <tr class="tot"><td colspan="2">الإجمالي</td><td class="n">${fmt(tot.t)}</td><td class="n">${fmt(tot.a)}</td><td class="n">${fmt(tot.t - tot.a)}</td></tr></table></div>
    <div class="hint" style="margin-top:6px;">الفرق الموجب = الضرايب بتسمح بإهلاك أكتر من اللي في الدفاتر السنة دي (بيتعدّل في الإقرار مش في القيود).</div>` : '<div class="empty">مفيش أصول عليها إهلاك ضريبي في السنة دي</div>';
}
async function txExcel(){
  const year = +$('txY').value, R = txRows(year);
  await excel('الإهلاك-الضريبي-' + year, 'الإهلاك الضريبي ' + year + ' (تقريبي — يراجعه المحاسب القانوني)',
    ['الكود','الأصل','التكلفة','النسبة','الطريقة','ضريبي السنة','ضريبي متجمّع','القيمة الضريبية','محاسبي السنة','الفرق'],
    R.map(r => [r.a.code, r.a.name, +r.a.cost, r.t.rate + '%', r.t.method === 'db' ? 'متناقص' : 'ثابت', r.t.year, r.t.acc, r.t.book, r.accY, r.diff]),
    [2,5,6,7,8,9]);
}

// ============================================================
// 📒 كشف حساب
// ============================================================
let ST: GlStatement = null!;
function openStatement(code: string, party?: GlParty){
  const a = ACCM[code]; if(!a) return;
  ST = { code, from:S.from, to:S.to, party: party || null, data:null };
  sheet('📒 ' + a.code + ' · ' + a.name, stHtml());
  loadSt();
}
function stHtml(){
  const a = ACCM[ST.code];
  const pty = a.party ? `<label class="f" style="margin-bottom:8px;"><span>${{ customer:'👤 العميل', supplier:'🏪 التاجر', employee:'👥 الموظف' }[a.party]} (فاضي = الكل)</span>
      <input id="stParty" list="${{ customer:'dlCust', supplier:'dlSup', employee:'dlEmp' }[a.party]}" value="${escH(ST.party ? ST.party.label : '')}"
        onchange="stPartyPick(this.value)" placeholder="اكتب واختار"></label>` : '';
  return `<div class="range"><label>من<input type="date" value="${ST.from}" onchange="ST.from=this.value;loadSt()"></label>
      <label>لحد<input type="date" value="${ST.to}" onchange="ST.to=this.value;loadSt()"></label></div>
    ${pty}
    <div class="acts" style="margin:0 0 10px;"><button class="btn sm" onclick="stExcel()">📊 Excel</button></div>
    <div id="stBody"><div class="empty">⏳ …</div></div>`;
}
function stPartyPick(v: string){
  const a = ACCM[ST.code]; v = String(v || '').trim();
  if(!v){ ST.party = null; loadSt(); return; }
  if(a.party === 'customer'){ const c = CUST.find(x => (x.code + ' · ' + x.name) === v || x.code === v.split(' ')[0]); if(!c){ toast('اختار عميل من القايمة', true); return; } ST.party = { customer:c.id, label:c.code + ' · ' + c.name }; }
  if(a.party === 'supplier'){ const s = SUP.find(x => x.name === v); if(!s){ toast('اختار تاجر من القايمة', true); return; } ST.party = { supplier:s.id, label:s.name }; }
  if(a.party === 'employee'){ ST.party = { employee:v, label:v }; }
  loadSt();
}
async function loadSt(){
  const p = ST.party || {} as GlParty;
  try{
    ST.data = await rpc('gl_statement', { p_code:ST.code, p_from:ST.from, p_to:ST.to,
      p_customer:p.customer || null, p_supplier:p.supplier || null, p_employee:p.employee || null });
  }catch(e: any){ ST.data = { err: errMsg(e) } as GlStData; }
  const h = $('stBody'); if(h) h.innerHTML = stBody();
}
function stBody(){
  const a = ACCM[ST.code], D = ST.data;
  if(!D) return '<div class="empty">⏳ …</div>';
  if(D.err) return `<div class="err">${escH(D.err)}</div>`;
  const sg = a.normal === 'D' ? 1 : -1;
  let bal = sg * (+D.opening);
  const rows = D.lines.map(l => { bal += sg * ((+l.d) - (+l.c)); return Object.assign({ bal }, l); });
  const td = D.lines.reduce((t, l) => t + (+l.d), 0), tc = D.lines.reduce((t, l) => t + (+l.c), 0);
  return `<div class="stats">
      <div class="stat"><div class="k">أول المدة</div><div class="v">${fmt(sg * D.opening)}</div></div>
      <div class="stat"><div class="k">مدين</div><div class="v money dr">${fmt(td)}</div></div>
      <div class="stat"><div class="k">دائن</div><div class="v money cr">${fmt(tc)}</div></div>
      <div class="stat"><div class="k">آخر المدة</div><div class="v">${fmt(bal)}</div></div></div>
    <div class="hint">الرصيد في اتجاهه الطبيعي (${a.normal === 'D' ? 'مدين' : 'دائن'}) — بالسالب يعني عكس الطبيعي. الأحدث تحت.</div>
    ${rows.length ? `<div class="tscroll"><table class="tbl"><tr><th>التاريخ</th><th>البيان</th><th class="n">مدين</th><th class="n">دائن</th><th class="n">الرصيد</th></tr>
      ${rows.map(l => `<tr${l.rev ? ' style="opacity:.7"' : ''}><td style="white-space:nowrap">${dt(l.date)}<br><span class="code">${escH(l.no)}</span></td>
        <td>${escH(l.memo || l.emo)}${l.party ? `<div class="c-s">${escH(l.party)}</div>` : ''}${l.doc ? `<div class="c-s">📑 <span class="code">${escH(l.doc)}</span></div>` : ''}${l.kind === 'reversal' ? '<div class="c-s" style="color:var(--red)">↩️ عكسي</div>' : ''}</td>
        <td class="n">${+l.d ? fmt(l.d) : ''}</td><td class="n">${+l.c ? fmt(l.c) : ''}</td><td class="n">${fmt(l.bal)}</td></tr>`).join('')}</table></div>`
      : '<div class="empty">مفيش حركة في الفترة دي</div>'}`;
}
async function stExcel(){
  const a = ACCM[ST.code], D = ST.data; if(!D || D.err) return;
  const sg = a.normal === 'D' ? 1 : -1; let bal = sg * (+D.opening);
  const rows = [['', '', 'رصيد أول المدة', null, null, bal], ...D.lines.map(l => { bal += sg * ((+l.d) - (+l.c));
    return [l.date, l.no, (l.memo || l.emo) + (l.party ? ' — ' + l.party : '') + (l.doc ? ' (' + l.doc + ')' : ''), +l.d || null, +l.c || null, bal]; })];
  await excel('كشف-' + a.code, `كشف حساب ${a.code} · ${a.name}${ST.party ? ' — ' + ST.party.label : ''} من ${ST.from} لحد ${ST.to}`,
    ['التاريخ','رقم القيد','البيان','مدين','دائن','الرصيد'], rows, [3,4,5], rows.map((r, i) => i === 0));
}

// ============================================================
// ✍️ قيد جديد (يدوي · تسوية · افتتاحي)
// ============================================================
let EN: EnDraft = null!;
const EN_K: Record<string, string[]> = { manual:['✍️ قيد يدوي','مصروف · تحويل بين خزنتين · أي حركة مالهاش ورقة'], adjust:['🛠️ قيد تسوية','تصحيح · توجيه حساب وسيط · إهلاك · مخصص'], opening:['📌 قيد افتتاحي','اللي معانا وعلينا يوم البداية'] };
function openEntry(kind: string){
  if(kind === 'opening' && H.has_opening && !confirm('فيه قيد افتتاحي خلاص. عايز تكتب قيد افتتاحي تاني (إضافة عليه)؟')) return;
  EN = { kind, date: kind === 'opening' ? H.start : cairoDay(), memo: kind === 'opening' ? 'القيد الافتتاحي — أرصدة ' + dt(H.start) : '',
         lines: [newLine(), newLine()], busy:false };
  sheet(EN_K[kind][0], enHtml());
}
function newLine(acc?: string): EnLine{ return { acc: acc || '', d:'', c:'', party:'', memo:'' }; }
function accOptions(sel: string): string{
  // كل الفرعيات مجمّعة تحت أبوها المباشر
  const byParent: Record<string, GlAccount[]> = {};
  leafs().filter(a => a.active || a.code === sel).forEach(a => { (byParent[a.parent!] = byParent[a.parent!] || []).push(a); });
  return '<option value="">— اختار الحساب —</option>' + Object.keys(byParent).sort().map(p =>
    `<optgroup label="${escH(p + ' · ' + accName(p))}">${byParent[p].map(a => `<option value="${a.code}"${a.code === sel ? ' selected' : ''}>${a.code} · ${escH(a.name)}</option>`).join('')}</optgroup>`).join('');
}
function enHtml(){
  const k = EN_K[EN.kind];
  return `<div class="hint">${k[1]}. كل سطر يا <b style="color:var(--blue)">مدين</b> يا <b style="color:var(--wait)">دائن</b> — والمجموعين لازم يبقوا زي بعض.</div>
    <div class="chips" style="margin-bottom:12px;">${Object.entries(EN_K).map(([x, v]) => `<button class="chip${EN.kind === x ? ' on' : ''}" onclick="enSave();EN.kind='${x}';if(EN.kind==='opening')EN.date=H.start;setSheetBody(enHtml())">${v[0]}</button>`).join('')}</div>
    <div class="f2">
      <label class="f"><span>📅 التاريخ</span><input id="enDate" type="date" value="${EN.date}" ${EN.kind === 'opening' ? 'disabled' : ''} max="${cairoDay()}" min="${H.start}"></label>
      <label class="f"><span>📝 البيان</span><input id="enMemo" value="${escH(EN.memo)}" placeholder="مثال: إيجار أكتوبر"></label>
    </div>
    ${EN.kind === 'opening' ? `<div class="warnbox">📌 القيد الافتتاحي = صورة يوم ${dt(H.start)}: الخزنة · المحافظ · المخزن (بالجرد) · الأصول · العملاء · التجار · الديون … والفرق كله بيروح «أرصدة افتتاحية تحت التسوية» (3900) لحد ما تحوّله لرأس المال.
      <br><button class="btn sm" onclick="enSuggest()">💡 هات أرصدة العملاء والتجار من النظام</button></div>` : ''}
    <div id="enLines">${EN.lines.map((l, i) => lineHtml(l, i)).join('')}</div>
    <div class="acts" style="margin:0 0 6px;"><button class="btn" onclick="enSave();EN.lines.push(newLine());setSheetBody(enHtml())">➕ سطر</button>
      ${EN.kind === 'opening' ? `<button class="btn" onclick="enPlug()">⚖️ وازن على 3900</button>` : ''}</div>
    <div class="baltag" id="enBal">${balTag()}</div>
    <button class="big" onclick="enGo()" ${EN.busy ? 'disabled' : ''}>${EN.busy ? '⏳ …' : '✅ سجّل القيد'}</button>
    <div class="note-in">🔒 القيد بيتسجّل باسمك ومابيتمسحش ولا بيتعدّل — لو طلع غلط بتعكسه.</div>`;
}
function lineHtml(l: EnLine, i: number): string{
  const a = ACCM[l.acc];
  const pl = a && a.party ? { customer:['dlCust','👤 العميل'], supplier:['dlSup','🏪 التاجر'], employee:['dlEmp','👥 الموظف (الإيميل)'] }[a.party] : null;
  return `<div class="le"><div class="r1"><select onchange="enSave();EN.lines[${i}].acc=this.value;EN.lines[${i}].party='';setSheetBody(enHtml())">${accOptions(l.acc)}</select>
      ${pl ? `<input id="lp${i}" list="${pl[0]}" value="${escH(l.party)}" placeholder="${pl[1]}" oninput="EN.lines[${i}].party=this.value">` : ''}</div>
    <div class="r2"><input id="ld${i}" class="dIn" inputmode="decimal" placeholder="مدين" value="${escH(l.d)}" oninput="EN.lines[${i}].d=this.value;if(this.value)EN.lines[${i}].c='',document.getElementById('lc${i}').value='';updBal()">
      <input id="lc${i}" class="cIn" inputmode="decimal" placeholder="دائن" value="${escH(l.c)}" oninput="EN.lines[${i}].c=this.value;if(this.value)EN.lines[${i}].d='',document.getElementById('ld${i}').value='';updBal()">
      <button class="x" onclick="enSave();EN.lines.splice(${i},1);if(EN.lines.length<2)EN.lines.push(newLine());setSheetBody(enHtml())">✕</button></div>
    <input style="margin-top:6px;" placeholder="ملاحظة السطر (اختياري)" value="${escH(l.memo)}" oninput="EN.lines[${i}].memo=this.value"></div>`;
}
function enTotals(){ let d = 0, c = 0; EN.lines.forEach(l => { d += num(l.d) || 0; c += num(l.c) || 0; }); return { d:r2(d), c:r2(c) }; }
function balTag(){
  const t = enTotals(), diff = r2(t.d - t.c);
  return `<span>مدين <b class="money dr">${fmt(t.d)}</b></span><span>دائن <b class="money cr">${fmt(t.c)}</b></span>
    <span>${diff === 0 && t.d ? '✅ متوازن' : `<b style="color:var(--red)">فرق ${fmt(diff)}</b>`}</span>`;
}
function updBal(){ const b = $('enBal'); if(b) b.innerHTML = balTag(); }
function enSave(){
  const d = $('enDate'); if(d && !d.disabled) EN.date = d.value;
  const m = $('enMemo'); if(m) EN.memo = m.value;
}
async function enSuggest(){
  try{
    const s: { customers: { code: string; name: string; amt: number }[]; suppliers: { name: string; amt: number }[] } = await rpc('gl_opening_suggest');
    enSave();
    const keep = EN.lines.filter(l => l.acc && (num(l.d) || num(l.c)));
    const ar = s.customers.map(x => ({ acc:'1200', d: x.amt > 0 ? String(x.amt) : '', c: x.amt < 0 ? String(-x.amt) : '', party: x.code + ' · ' + x.name, memo:'رصيد ' + x.code }));
    const ap = s.suppliers.map(x => ({ acc:'2101', d: x.amt > 0 ? String(x.amt) : '', c: x.amt < 0 ? String(-x.amt) : '', party: x.name, memo:'رصيد التاجر' }));
    EN.lines = keep.concat(ar, ap);
    if(EN.lines.length < 2) EN.lines.push(newLine());
    setSheetBody(enHtml());
    toast(`💡 اتضاف ${ar.length} عميل و ${ap.length} تاجر — راجعهم وكمّل الباقي (الخزنة · المخزن · الأصول)`);
  }catch(e: any){ toast(errMsg(e), true); }
}
function enPlug(){
  enSave();
  const t = enTotals(), diff = r2(t.d - t.c);
  if(!diff){ toast('القيد متوازن خلاص'); return; }
  EN.lines = EN.lines.filter(l => l.acc !== '3900');
  const t2 = enTotals(), d2 = r2(t2.d - t2.c);
  EN.lines.push({ acc:'3900', d: d2 < 0 ? String(-d2) : '', c: d2 > 0 ? String(d2) : '', party:'', memo:'الفرق — لحد ما يتحوّل لرأس المال' });
  setSheetBody(enHtml());
}
function partyArgs(a: GlAccount | undefined, raw: string): Record<string, string>{
  const v = String(raw || '').trim();
  if(!a || !a.party) return {};
  if(!v) throw new Error(`الحساب ${a.code} (${a.name}) محتاج تختار ${{ customer:'العميل', supplier:'التاجر', employee:'الموظف' }[a.party]}`);
  if(a.party === 'customer'){ const c = CUST.find(x => (x.code + ' · ' + x.name) === v) || CUST.find(x => x.code === v.split(' ')[0]); if(!c) throw new Error(`«${v}» مش عميل في القايمة`); return { customer_id:c.id }; }
  if(a.party === 'supplier'){ const s = SUP.find(x => x.name === v); if(!s) throw new Error(`«${v}» مش تاجر في القايمة`); return { supplier_id:s.id }; }
  if(!/^\S+@\S+\.\S+$/.test(v)) throw new Error('اكتب إيميل الموظف');
  return { employee_email:v.toLowerCase() };
}
async function enGo(){
  if(EN.busy) return;
  enSave();
  let lines;
  try{
    lines = EN.lines.filter(l => l.acc || num(l.d) || num(l.c)).map((l, i) => {
      const a = ACCM[l.acc];
      if(!a) throw new Error(`سطر ${i + 1}: اختار الحساب`);
      const d = num(l.d) || 0, c = num(l.c) || 0;
      if(!d && !c) throw new Error(`سطر ${i + 1}: اكتب المبلغ`);
      if(d < 0 || c < 0) throw new Error(`سطر ${i + 1}: المبلغ مايبقاش بالسالب`);
      return Object.assign({ acc:a.code, amt: r2(d - c), memo:l.memo || '' }, partyArgs(a, l.party));
    });
  }catch(e: any){ toast(e.message, true); return; }
  const t = enTotals();
  if(lines.length < 2){ toast('القيد محتاج سطرين على الأقل', true); return; }
  if(r2(t.d - t.c) !== 0){ toast('القيد مش متوازن — فرق ' + fmt(t.d - t.c), true); return; }
  if(String(EN.memo || '').trim().length < 3){ toast('اكتب البيان', true); return; }
  if(!confirm(`${EN_K[EN.kind][0]} بـ ${fmt(t.d)} ج.م\n${EN.memo}\nنسجّل؟`)) return;
  EN.busy = true; setSheetBody(enHtml());
  try{
    const e = await rpc('gl_post_manual', { p_kind:EN.kind, p_date:EN.date, p_memo:EN.memo, p_lines:lines });
    closeSheet(); toast('✅ اتسجّل ' + e.entry_no); S.tab = 'journal'; load();
  }catch(e: any){ EN.busy = false; setSheetBody(enHtml()); toast(errMsg(e), true); }
}

// ============================================================
// 📊 Excel
// ============================================================
async function excel(file: string, title: string, head: string[], rows: unknown[][], moneyCols?: number[], boldRows?: unknown[]){
  if(typeof ExcelJS === 'undefined'){ toast('مكتبة الإكسل ماتحمّلتش — جرّب تاني', true); return; }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('الأستاذ', { views:[{ rightToLeft:true }] });
  const border = { top:{style:'thin',color:{argb:'FFCBD5E1'}}, bottom:{style:'thin',color:{argb:'FFCBD5E1'}},
                   left:{style:'thin',color:{argb:'FFCBD5E1'}}, right:{style:'thin',color:{argb:'FFCBD5E1'}} };
  ws.mergeCells(1, 1, 1, head.length);
  ws.getCell(1, 1).value = title; ws.getCell(1, 1).font = { size:15, bold:true, color:{argb:'FF1F3864'} };
  ws.getCell(1, 1).alignment = { horizontal:'center' };
  ws.mergeCells(2, 1, 2, head.length);
  ws.getCell(2, 1).value = 'FIX TEAM — دفتر الأستاذ العام — اتطبع ' + new Date().toLocaleString('ar-EG');
  ws.getCell(2, 1).font = { size:10, color:{argb:'FF6B7280'} }; ws.getCell(2, 1).alignment = { horizontal:'center' };
  const h: XlsRow = ws.getRow(4); h.values = head;
  h.eachCell(c => { c.font = { bold:true, color:{argb:'FFFFFFFF'} }; c.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F3864'} }; c.border = border; c.alignment = { horizontal:'center' }; });
  rows.forEach((r, i) => {
    const row: XlsRow = ws.addRow(r);
    row.eachCell({ includeEmpty:true }, c => { c.border = border; });
    (moneyCols || []).forEach(k => { row.getCell(k + 1).numFmt = '#,##0.00'; });
    if(boldRows && boldRows[i]) row.eachCell({ includeEmpty:true }, c => { c.font = { bold:true }; c.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF1F5F9'} }; });
  });
  head.forEach((x, i) => { ws.getColumn(i + 1).width = i === 1 || i === 2 ? 38 : 16; });
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = file + '-' + cairoDay() + '.xlsx';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// ============================================================
// 📥 استيراد شيت الإكسل اليومي (ملف SQL رقم 119)
// ------------------------------------------------------------
// 🧸 الحكاية:
//   المحاسب العام بيختار ملف الشهر (.xlsm) → الصفحة بتفكّه على الجهاز
//   نفسه (من غير ما يترفع لأي حتة) وبتقرا الخانات اللي اتكتبت بإيدك في
//   الـ٣١ يوم → لكل يوم «معاينة»: المقبوضات على انستا/محافظ · المدفوعات
//   حسب البند · سلف الموظفين · سجل السلف · التحويلات — وجنبه مقارنة
//   بالسيستم → «📥 قيّد» = قيد واحد لليوم بتاريخه (xl_import_day).
//
// ⚠️ الحسابات والقيد نفسه بيتعملوا على السيرفر — الشاشة بتبعت اللي في
//    الشيت بس (والاختيارات: البند · التاجر · المحل · نوع الأصل).
// ⚠️ مابنقراش المعادلات — بنقرا الخانات اللي بتتكتب بإيدك بس، فلو
//    الملف ما اتحسبش في إكسل (أو اتنسخ) الأرقام بتطلع صح برضه.
//    الأرقام المحسوبة اللي في الملف (لو موجودة) بنقارن بيها بس.
// 🧭 أماكن الخانات = شيت v18 (شوف «التغييرات-الشيت-الجديد-والماكرو-v13.md»).
//    لو حركت ركن في الشيت، عدّل الجدول XLB تحت.
// ============================================================
const XL: XlAll = { file:'', month:'', wb:null, days:null, board:null, loading:false, err:'', picks:{}, base:{}, sys:{}, busy:false, log:[] };
const XL_CASH = ['', 'نقدي', 'كاش'];
// 🗺️ أركان المقبوضات: t = عنوان الركن (بيتقري من الشيت) · who/memo/m/a = الأعمدة
const XLB: XlBlock[] = [
  { t:'B1',  who:'B', memo:'C', m:'D', a:'E', rows:[4, 17] },
  { t:'B19', who:'B', memo:'C', m:'D', a:'E', rows:[22, 43], coll:true },     // تحصيلات حسابات العملاء
  { t:'G1',  who:'G', memo:'H', m:'J', a:'K', rows:[4, 43] },                 // fix team
  { t:'M1',  memo:'M', m:'N', a:'O', rows:[4, 17] },  { t:'M19', memo:'M', m:'N', a:'O', rows:[22, 43] },
  { t:'P1',  memo:'P', m:'R', a:'S', rows:[4, 17] },  { t:'P19', memo:'P', m:'R', a:'S', rows:[22, 43] },
  { t:'T1',  memo:'T', m:'U', a:'V', rows:[4, 17] },  { t:'T19', memo:'T', m:'U', a:'V', rows:[22, 43] },
  { t:'T45', memo:'T', m:'U', a:'V', rows:[47, 68] },
  { t:'W1',  memo:'W', m:'X', a:'Y', rows:[4, 17] },  { t:'W19', memo:'W', m:'X', a:'Y', rows:[22, 43] },
  { t:'W45', memo:'W', m:'X', a:'Y', rows:[47, 68] }
];

// ---------- 🗜️ فك ملف الإكسل (من غير مكتبة) ----------
// 🧸 ملف .xlsx / .xlsm = ملف ZIP جواه ملفات XML. المتصفح بيعرف يفك
//    الضغط لوحده (DecompressionStream) — فبنقرا الفهرس اللي في آخر
//    الملف ونطلّع اللي محتاجينه بس.
async function xlUnzip(buf: ArrayBuffer): Promise<XlZip> {
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  let eocd = -1;
  for(let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--){ if(dv.getUint32(i, true) === 0x06054b50){ eocd = i; break; } }
  if(eocd < 0) throw new Error('الملف ده مش ملف إكسل (xlsx / xlsm)');
  const n = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const files: Record<string, { meth: number; csize: number; off: number }> = {}, dec = new TextDecoder('utf-8');
  for(let i = 0; i < n; i++){
    if(dv.getUint32(p, true) !== 0x02014b50) throw new Error('الملف بايظ (فهرس الضغط)');
    const meth = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
    const off = dv.getUint32(p + 42, true);
    files[dec.decode(u8.subarray(p + 46, p + 46 + nl))] = { meth, csize, off };
    p += 46 + nl + el + cl;
  }
  async function text(name: string): Promise<string | null>{
    const f = files[name]; if(!f) return null;
    const ds = f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true);
    const raw = u8.subarray(ds, ds + f.csize);
    if(f.meth === 0) return dec.decode(raw);
    if(f.meth !== 8) throw new Error('نوع ضغط مش معروف في الملف');
    if(typeof DecompressionStream === 'undefined') throw new Error('المتصفح ده قديم ومايعرفش يفك الملف — جرّب كروم');
    const out = new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')));
    return dec.decode(await out.arrayBuffer());
  }
  return { text, has: name => !!files[name] };
}
// بيرجّع { sheets: {الاسم: خريطة الخانات}, names:[...] } — الخانة = {v: القيمة, f: فيها معادلة؟}
async function xlRead(buf: ArrayBuffer): Promise<XlBook>{
  const z = await xlUnzip(buf);
  const P: (s: string | null) => Document = s => new DOMParser().parseFromString(s!, 'application/xml');
  const wbx = P(await z.text('xl/workbook.xml'));
  const rels = P(await z.text('xl/_rels/workbook.xml.rels'));
  const relMap: Record<string, string> = {};
  [...rels.getElementsByTagName('Relationship')].forEach(r => { relMap[r.getAttribute('Id')!] = r.getAttribute('Target')!; });
  const sst: string[] = [];
  const ss = await z.text('xl/sharedStrings.xml');
  if(ss){ [...P(ss).getElementsByTagName('si')].forEach(si => sst.push([...si.getElementsByTagName('t')].map(t => t.textContent).join(''))); }
  const out: XlBook = { sheets:{}, names:[] };
  for(const sh of [...wbx.getElementsByTagName('sheet')]){
    const name = sh.getAttribute('name')!;
    const rid = sh.getAttribute('r:id') || sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    let tg = relMap[rid!] || ''; tg = tg.replace(/^\/?xl\//, '').replace(/^\//, '');
    const xml = await z.text('xl/' + tg);
    out.names.push(name);
    if(!xml || !/^(Sheet\d+|ملخص الشهر)$/.test(name)) continue;   // الأيام + الملخص بس
    const cells: XlCells = {};
    for(const c of [...P(xml).getElementsByTagName('c')]){
      const t = c.getAttribute('t'), vEl = c.getElementsByTagName('v')[0], fEl = c.getElementsByTagName('f')[0];
      let v: string | number | boolean | null = vEl ? vEl.textContent : null;
      if(t === 's') v = v == null ? null : sst[+v];
      else if(t === 'inlineStr') v = [...c.getElementsByTagName('t')].map(x => x.textContent).join('');
      else if(t === 'b') v = v === '1';
      else if(t !== 'str' && t !== 'e' && v != null && v !== '') v = Number(v);
      cells[c.getAttribute('r')!] = { v, f: !!fEl };
    }
    out.sheets[name] = cells;
  }
  return out;
}

// ---------- 📄 قراية يوم ----------
const xlTxt: (v: unknown) => string = v => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();
function xlCell(cs: XlCells, ref: string): XlCellV{ return cs[ref] || { v:null, f:false }; }
function xlIn(cs: XlCells, ref: string){ const c = xlCell(cs, ref); return c.f ? null : c.v; }        // خانة كتابة بس (من غير معادلات)
function xlNum(cs: XlCells, ref: string): number{ const v = xlIn(cs, ref); if(v == null || v === '') return 0; return typeof v === 'number' ? v : (num(v) || 0); }
function xlCached(cs: XlCells, ref: string): number | null{ const c = xlCell(cs, ref); return c.f && typeof c.v === 'number' ? c.v : null; }
function xlParseDay(cs: XlCells, n: number): XlDay{
  const d = { n, rec:[], ret:[], exp:[], wd:[], loans:{ out:[], in:[] }, tr:[], bad:[] } as unknown as XlDay;
  const meth = (ref: string) => { const m = xlTxt(xlIn(cs, ref)); return m; };
  XLB.forEach(b => {
    const title = xlTxt(xlCell(cs, b.t).v) || b.t;
    for(let r = b.rows[0]; r <= b.rows[1]; r++){
      const a = xlNum(cs, b.a + r); if(!a) continue;
      d.rec.push({ blk:title, coll:!!b.coll, who: b.who ? xlTxt(xlIn(cs, b.who + r)) : '', memo: xlTxt(xlIn(cs, b.memo + r)), m: meth(b.m + r), amt:a, row:b.a + r });
    }
  });
  for(let r = 47; r <= 68; r++){
    let a = xlNum(cs, 'S' + r);
    if(a) d.ret.push({ memo: xlTxt(xlIn(cs, 'Q' + r)), m: meth('R' + r), amt:a, row:'S' + r });
    a = xlNum(cs, 'P' + r);
    if(a) d.exp.push({ memo: xlTxt(xlIn(cs, 'M' + r)), cat: xlTxt(xlIn(cs, 'N' + r)), m: meth('O' + r), amt:a, row:'P' + r });
    a = xlNum(cs, 'L' + r);
    if(a) d.wd.push({ name: xlTxt(xlIn(cs, 'H' + r)), m: meth('K' + r), amt:a, row:'L' + r });
  }
  for(let r = 48; r <= 68; r++){
    let a = xlNum(cs, 'D' + r), nm = xlTxt(xlIn(cs, 'B' + r));
    if(a && nm) d.loans.out.push({ name:nm, m: meth('C' + r), amt:a });
    else if(a) d.bad.push('سلفة للغير بـ ' + fmt(a) + ' من غير اسم (صف ' + r + ')');
    a = xlNum(cs, 'G' + r); nm = xlTxt(xlIn(cs, 'E' + r));
    if(a && nm) d.loans.in.push({ name:nm, m: meth('F' + r), amt:a });
    else if(a) d.bad.push('سلفة من الغير بـ ' + fmt(a) + ' من غير اسم (صف ' + r + ')');
  }
  for(let r = 78; r <= 97; r++){
    const a = xlNum(cs, 'E' + r); if(!a) continue;
    const t: XlTr = { memo: xlTxt(xlIn(cs, 'B' + r)), from: xlTxt(xlIn(cs, 'C' + r)), to: xlTxt(xlIn(cs, 'D' + r)), amt:a, row:'E' + r };
    t.opening = t.memo === 'رصيد افتتاحي';
    if(!t.opening && (!t.from || !t.to)) d.bad.push('تحويل بـ ' + fmt(a) + ' (صف ' + r + ') ناقصه «من» أو «إلى»');
    d.tr.push(t);
  }
  // طرق دفع مش معروفة
  const okM: (m: string) => boolean = m => XL_CASH.includes(m) || /^(انستا ?باي|إنستا ?باي)$/.test(m) || /^(محفظة|كاش) ?[0-9]$/.test(m);
  [...d.rec, ...d.ret, ...d.exp, ...d.wd, ...d.loans.out, ...d.loans.in].forEach(x => { if(!okM(x.m)) d.bad.push('طريقة دفع مش معروفة «' + x.m + '»'); });
  d.tr.filter(t => !t.opening).forEach(t => { if(!okM(t.from) || !okM(t.to)) d.bad.push('تحويل: طريقة دفع مش معروفة'); });
  // الأرقام اللي إكسل حسبها (لو الملف اتحسب) — للمقارنة بس
  d.cached = { rec: xlCached(cs, 'AG71'), exp: xlCached(cs, 'P69'), wd: xlCached(cs, 'L69'), ret: xlCached(cs, 'S69') };
  d.tot = { rec: d.rec.reduce((t, x) => t + x.amt, 0), ret: d.ret.reduce((t, x) => t + x.amt, 0),
            exp: d.exp.reduce((t, x) => t + x.amt, 0), wd: d.wd.reduce((t, x) => t + x.amt, 0) };
  d.empty = !d.rec.length && !d.ret.length && !d.exp.length && !d.wd.length && !d.loans.out.length && !d.loans.in.length
            && !d.tr.filter(t => !t.opening).length;
  return d;
}
const xlIsCash: (m: string) => boolean = m => XL_CASH.includes(m);
const xlDate: (n: number) => string = n => XL.month + '-' + String(n).padStart(2, '0');
function xlDaysInMonth(ym: string): number{ const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function xlFnv(s: string): string{ let h = 0x811c9dc5; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }
const xlCat: (name: string) => XlCat | null = name => ((XL.board && XL.board.cats) || []).find(c => c.name === name) || null;
const xlPick = (n: number, key: string) => ((XL.picks[n] || {})[key]) || '';

// ---------- 🧮 اللي هيتبعت للسيرفر ----------
function xlPayload(d: XlDay){
  const pk = XL.picks[d.n] || {};
  const byM: Record<string, number> = {};
  d.rec.forEach(x => { if(!xlIsCash(x.m)) byM[x.m] = (byM[x.m] || 0) + x.amt; });
  d.ret.forEach(x => { if(!xlIsCash(x.m)) byM[x.m] = (byM[x.m] || 0) - x.amt; });
  return {
    receipts: Object.entries(byM).filter(([, a]) => r2(a) !== 0).map(([m, amt]) => ({ m, amt: r2(amt) })),
    expenses: d.exp.map(x => {
      const cat = pk['c' + x.row] || x.cat;
      const o: XlExpOut = { cat, m:x.m, amt:x.amt, memo:x.memo };
      const c = xlCat(cat);
      if(c && c.how === 'supplier') o.supplier_id = pk['s' + x.row] || xlGuessSup(x.memo) || '';
      if(c && c.how === 'acq') o.customer_id = pk['u' + x.row] || xlGuessAcq(x.memo) || '';
      if(c && c.how === 'asset') o.acc = pk['a' + x.row] || '';
      return o;
    }),
    wd: d.wd.map(x => ({ name:x.name, m:x.m, amt:x.amt })),
    transfers: d.tr.filter(t => !t.opening).map(t => ({ from:t.from, to:t.to, amt:t.amt, memo:t.memo })),
    loans: d.loans,
    loans_base: !!XL.base[d.n]
  };
}
function xlGuessSup(memo: string): string{
  const m = norm(memo); if(!m) return '';
  const s = ((XL.board && XL.board.suppliers) || []).find(x => m.includes(norm(x.name)));
  return s ? s.id : '';
}
function xlGuessAcq(memo: string): string{
  const m = norm(memo); if(!m) return '';
  const c = CUST.find(x => x.kind === 'acquisition' && m.includes(norm(x.name)));
  return c ? c.id : '';
}
// نفس تبسيط السيرفر (erp_norm) — زي customers.html
function norm(t: unknown): string{
  return String(t || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ـ/g, '')
    .replace(/[\s!-\/:-@\[-`{-~،؛؟«»]+/g, ' ').trim();
}
// الحاجات اللي لازم تتختار قبل التسجيل
function xlNeeds(d: XlDay): { k: string; t: string }[]{
  const p = xlPayload(d), out: { k: string; t: string }[] = [];
  p.expenses.forEach((x, i) => {
    const c = xlCat(x.cat), row = d.exp[i].row, lbl = '«' + (x.memo || 'من غير بيان') + '» ' + fmt(x.amt);
    if(!c) out.push({ k:'c' + row, t: x.cat ? 'البند «' + x.cat + '» مش معروف — ' + lbl : 'من غير بند — ' + lbl });
    else if(c.how === 'supplier' && !x.supplier_id) out.push({ k:'s' + row, t:'اختار التاجر — ' + lbl });
    else if(c.how === 'acq' && !x.customer_id) out.push({ k:'u' + row, t:'اختار محل الاستحواذ — ' + lbl });
    else if(c.how === 'asset' && !x.acc) out.push({ k:'a' + row, t:'اختار نوع الأصل — ' + lbl });
  });
  return out;
}
function xlState(d: XlDay): XlStateT{
  const day = xlDate(d.n), b = XL.board;
  const rec = b && (b.days || []).find(x => x.day === day);
  if(d.empty && !rec) return { k:'empty', l:'فاضي', c:'' };
  if(day < H.start) return { k:'pre', l:'قبل بداية الدفاتر', c:'' };
  if(b && day > b.today) return { k:'future', l:'لسه ماجاش', c:'' };
  if(d.bad.length) return { k:'bad', l:'⚠️ فيه غلط في الشيت', c:'red', rec };
  const need = xlNeeds(d).length;
  const hash = xlFnv(JSON.stringify(xlPayload(d)));
  if(rec && rec.hash === hash) return { k:'done', l:'✅ متقيّد ' + (rec.entry_no || ''), c:'green', rec, hash };
  if(need) return { k:'need', l:'🟡 محتاج ' + need + ' اختيار', c:'wait', rec, hash };
  if(rec) return { k:'changed', l:'✏️ اتغيّر — هيتقيّد تاني', c:'wait', rec, hash };
  return { k:'ready', l:'جاهز', c:'blue', hash };
}

// ---------- 🖼️ التاب ----------
function viewXL(){
  const top = `<div class="hint">ارفع ملف الشهر (.xlsm) — الصفحة بتقرا الخانات اللي اتكتبت بإيدك في كل يوم، وتوريك كل رقم رايح فين قبل ما يتقيّد.
      المقبوضات نفسها متسجّلة من السيستم؛ الشيت بيقول بس <b>جت إزاي</b> (نقدي · انستا · محافظ)، وبيضيف المدفوعات والسلف والتحويلات.</div>
    <div class="acts" style="margin:0 0 10px;">
      <button class="btn pri" onclick="$('xlFile').click()">📂 ${XL.file ? 'غيّر الملف' : 'اختار ملف الشهر'}</button>
      ${XL.days ? `<button class="btn" onclick="xlLoadBoard(true)">↻ حدّث</button>` : ''}</div>
    <input type="file" id="xlFile" accept=".xlsm,.xlsx" style="display:none" onchange="xlPickFile(this)">
    ${XL.file ? `<div class="range"><label>📄 الملف<input value="${escH(XL.file)}" disabled></label>
      <label>📅 الشهر بتاع الملف<input type="month" value="${XL.month}" onchange="xlSetMonth(this.value)"></label></div>` : ''}`;
  if(XL.err) return top + `<div class="err">⚠️ ${escH(XL.err)}</div>`;
  if(!XL.days) return top + `<div class="empty">📂 اختار ملف الشهر عشان تبدأ</div>`;
  if(!XL.board) return top + '<div class="empty">⏳ …</div>';
  const list = XL.days.map(d => ({ d, s: xlState(d) }));
  const ready = list.filter(x => ['ready','changed'].includes(x.s.k));
  const later = XL.board.later;
  const sumRow = (k: keyof XlTot) => list.filter(x => !['pre','future'].includes(x.s.k)).reduce((t, x) => t + x.d.tot[k], 0);
  return top + `<div class="stats">
      <div class="stat"><div class="k">💰 المقبوضات</div><div class="v">${fmt(sumRow('rec'))}</div><div class="s">مرتجعات ${fmt(sumRow('ret'))}</div></div>
      <div class="stat"><div class="k">🧾 المدفوعات</div><div class="v">${fmt(sumRow('exp'))}</div></div>
      <div class="stat"><div class="k">👥 سلف الموظفين</div><div class="v">${fmt(sumRow('wd'))}</div></div>
      <div class="stat ${ready.length ? 'warn' : 'good'}"><div class="k">📥 جاهز للتقييد</div><div class="v">${ready.length}</div>
        <div class="s">${list.filter(x => x.s.k === 'done').length} متقيّد</div></div></div>
    ${later ? `<div class="warnbox">⚠️ فيه أيام بعد الشهر ده متقيّدة خلاص (من ${dt(later)}). لو غيّرت «سجل السلف» في آخر يوم هنا، ارفع اليوم اللي بعده تاني.</div>` : ''}
    ${ready.length ? `<button class="big" style="margin-bottom:12px;" onclick="xlPostMany()" ${XL.busy ? 'disabled' : ''}>${XL.busy ? '⏳ بنقيّد…' : '📥 قيّد الأيام الجاهزة (' + ready.length + ')'}</button>` : ''}
    ${XL.log.length ? `<div class="okbox" style="font-weight:700;">${XL.log.map(escH).join('<br>')}</div>` : ''}
    ${list.filter(x => x.s.k !== 'empty' || x.s.rec).map(({ d, s }) => `<button class="card k-${s.k === 'done' ? 'excel' : 'manual'}${['pre','future'].includes(s.k) ? ' off' : ''}" onclick="xlOpenDay(${d.n})">
      <div class="c-top"><div class="c-t">يوم ${d.n} <span class="code">${dt(xlDate(d.n))}</span></div><span class="pill ${s.c}">${escH(s.l)}</span></div>
      <div class="c-s">💰 ${fmt(d.tot.rec)}${d.tot.ret ? ' · ↩️ ' + fmt(d.tot.ret) : ''} · 🧾 ${fmt(d.tot.exp)} · 👥 ${fmt(d.tot.wd)}
        ${d.loans.out.length || d.loans.in.length ? ' · 🤝 سجل السلف ' + (d.loans.out.length + d.loans.in.length) : ''}
        ${d.tr.filter(t => !t.opening).length ? ' · ⇄ ' + d.tr.filter(t => !t.opening).length + ' تحويل' : ''}</div>
    </button>`).join('') || '<div class="empty">الملف فاضي — مفيش ولا يوم مكتوب فيه حاجة</div>'}
    <div class="hint" style="margin-top:10px;">💡 الأيام الفاضية مش ظاهرة. نفس اليوم لو اترفع تاني بنفس الأرقام مابيتقيّدش مرتين؛ لو الأرقام اتغيّرت القيد القديم بيتعكس والجديد بيتسجّل.</div>`;
}
async function xlPickFile(inp: HTMLInputElement){
  const f = inp.files && inp.files[0]; inp.value = '';
  if(!f) return;
  XL.err = ''; XL.days = null; XL.board = null; XL.picks = {}; XL.base = {}; XL.sys = {}; XL.log = [];
  XL.file = f.name;
  const m = f.name.match(/(20\d\d)[-_. ](\d{1,2})(?!\d)/);
  XL.month = m ? m[1] + '-' + String(+m[2]).padStart(2, '0') : (XL.month || cairoDay().slice(0, 7));
  render();
  try{
    XL.wb = await xlRead(await f.arrayBuffer());
    if(!XL.wb.sheets['Sheet1']) throw new Error('مالقيناش صفحة Sheet1 — ده مش ملف الشيت اليومي');
    xlBuildDays();
    if(!m) toast('📅 اتأكد من الشهر — اسم الملف مافيهوش السنة والشهر (زي 2026-11)');
    await xlLoadBoard();
  }catch(e: any){ console.error('[الإكسل]', e); XL.err = e.message || String(e); render(); }
}
function xlBuildDays(){
  const max = xlDaysInMonth(XL.month);
  XL.days = [];
  for(let n = 1; n <= max; n++){ const cs = XL.wb!.sheets['Sheet' + n]; if(cs) XL.days.push(xlParseDay(cs, n)); }
}
function xlSetMonth(v: string){ if(!v) return; XL.month = v; XL.board = null; XL.sys = {}; if(XL.wb) xlBuildDays(); xlLoadBoard(); }
async function xlLoadBoard(manual?: boolean){
  if(!XL.month) return;
  XL.loading = true;
  try{
    XL.board = await rpc('xl_board', { p_from: XL.month + '-01', p_to: XL.month + '-' + xlDaysInMonth(XL.month) });
    if(!XL.board!.cats) throw new Error('جدول البنود فاضي');
    XL.err = '';
    if(manual) toast('اتحدّث ✅');
  }catch(e: any){ XL.err = /xl_board|schema cache|does not exist|PGRST20/i.test(e.message || '') ? 'ملف SQL رقم 119 لسه ما اتشغّلش' : errMsg(e); }
  XL.loading = false;
  if(S.tab === 'xl') render();
  if($('xlDay')) xlRenderDay();
}

// ---------- 🔎 يوم واحد ----------
let XLD: number = 0;
async function xlOpenDay(n: number){
  XLD = n;
  sheet('📥 يوم ' + n + ' — ' + dt(xlDate(n)), '<div id="xlDay"></div>');
  xlRenderDay();
  const day = xlDate(n);
  if(!XL.sys[day] && day >= H.start && day <= XL.board!.today){
    try{ XL.sys[day] = await rpc('xl_system_day', { p_day: day }); }catch(e: any){ XL.sys[day] = { err: errMsg(e) }; }
    if(XLD === n) xlRenderDay();
  }
}
function xlAccOf(m: string): string | undefined{
  if(xlIsCash(m)) return (ACC.find(a => a.sys_key === 'CASH_MAIN') || {}).code;
  if(/انستا|إنستا/.test(m)) return (ACC.find(a => a.sys_key === 'INSTAPAY') || {}).code;
  const w = String(m).match(/[0-9]$/); return w ? (ACC.find(a => a.sys_key === 'WALLET_' + w[0]) || {}).code : '';
}
const xlAccLbl: (code: string | undefined) => string = code => code ? `<span class="code">${code}</span> ${escH(accName(code))}` : '<span style="color:var(--red)">؟</span>';
const xlM: (m: string) => string = m => xlIsCash(m) ? 'نقدي' : m;
function xlPrevLoans(n: number): { src: string; loans: XlLoans } | null{
  // 🧸 سجل امبارح: من الملف لو اليوم اللي قبله في نفس الشهر · وإلا آخر يوم اتقيّد
  const prevDay = XL.days!.find(x => x.n === n - 1);
  if(prevDay) return { src:'من يوم ' + (n - 1) + ' في الملف', loans: prevDay.loans };
  const b = XL.board!;
  const st = (b.days || []).filter(x => x.day < xlDate(n)).pop() || b.prev;
  if(st) return { src:'من آخر يوم اتقيّد (' + dt(st.day) + ')', loans: st.loans };
  return null;
}
function xlLoanDiff(cur: XlLoans, prev: XlLoans | null){
  const agg = (L: XlLoan[] | undefined) => { const m: Record<string, XlLoanAgg> = {}; (L || []).forEach(x => { const k = norm(x.name); if(!k) return; m[k] = m[k] || { nm:x.name, a:0, m:x.m }; m[k].a += x.amt; }); return m; };
  const out: { side: string; nm: string; d: number; m: string }[] = [];
  (['out', 'in'] as const).forEach(side => {
    const c = agg(cur[side]), p = agg(prev ? prev[side] : []);
    new Set([...Object.keys(c), ...Object.keys(p)]).forEach(k => {
      const d = r2((c[k] ? c[k].a : 0) - (p[k] ? p[k].a : 0));
      if(d) out.push({ side, nm:(c[k] || p[k]).nm, d, m: d > 0 ? (c[k] || {} as XlLoanAgg).m : (p[k] || c[k]).m });
    });
  });
  return out;
}
function xlRenderDay(){
  const host = $('xlDay'); if(!host) return;
  const d = XL.days!.find(x => x.n === XLD); if(!d) return;
  const s = xlState(d), day = xlDate(d.n), pk = XL.picks[d.n] = XL.picks[d.n] || {};
  const sys = XL.sys[day];
  const cats = (XL.board!.cats || []);
  const sups = XL.board!.suppliers || [];
  const acqs = CUST.filter(x => x.kind === 'acquisition');
  const assetAccs = leafs().filter(a => /^1[56]/.test(a.code) && a.normal === 'D' && a.active);
  const can = ['ready','changed'].includes(s.k);

  // ١) المقبوضات
  const byM: Record<string, number> = {};
  d.rec.forEach(x => { byM[xlM(x.m)] = (byM[xlM(x.m)] || 0) + x.amt; });
  d.ret.forEach(x => { byM[xlM(x.m)] = (byM[xlM(x.m)] || 0) - x.amt; });
  const recHtml = `<div class="tscroll"><table class="tbl"><tr><th>جت إزاي</th><th class="n">المبلغ</th><th>بيتقيّد</th></tr>
    ${Object.entries(byM).map(([m, a]) => `<tr><td>${escH(m)}</td><td class="n">${fmt(a)}</td>
      <td>${m === 'نقدي' ? '<span class="zero">في الدرج — مفيش قيد</span>' : `من الخزنة العامة ← ${xlAccLbl(xlAccOf(m))}`}</td></tr>`).join('') || '<tr><td colspan="3" class="zero">مفيش</td></tr>'}</table></div>`;

  // ٢) المقارنة بالسيستم
  let cmp = '';
  if(sys && sys.err) cmp = `<div class="err">${escH(sys.err)}</div>`;
  else if(sys){
    const sheetSales = d.rec.filter(x => !x.coll).reduce((t, x) => t + x.amt, 0) - d.tot.ret;
    const diff = r2(sheetSales - Number(sys.till || 0));
    const used = new Set();
    const colls = d.rec.filter(x => x.coll).map(x => {
      const cu = xlFindCust(x.who);
      const hit = (sys.collections || []).findIndex((c, i) => !used.has(i) && cu && c.customer_id === cu.id && r2(c.amount) === r2(x.amt));
      if(hit >= 0) used.add(hit);
      return { x, cu, ok: hit >= 0 };
    });
    cmp = `<div class="${Math.abs(diff) < 1 ? 'okbox' : 'warnbox'}">🧺 المبيعات في الشيت (من غير التحصيلات − المرتجعات) <b>${fmt(sheetSales)}</b> · اللي دخل سلّة أمين الخزنة في السيستم <b>${fmt(sys.till)}</b>
        ${Math.abs(diff) < 1 ? ' — ✅ زي بعض' : ` — فرق <b>${fmt(diff)}</b>: ${diff > 0 ? 'فيه حاجة في الشيت ماتسجّلتش في السيستم (جهاز اتسلّم ومادفعش؟ إكسسوار؟)' : 'السيستم قابض أكتر من الشيت'}`}
        ${(sys.closings || []).length ? '<br>🔒 تقفيلات النهارده: ' + sys.closings!.map(c => escH(c.by) + ' — المفروض ' + fmt(c.expected) + ' · اتعدّ ' + fmt(c.counted)).join(' · ') : ''}</div>
      ${colls.length ? `<div class="sec-h">💵 تحصيلات حسابات العملاء<span class="rule"></span></div>
        ${colls.map(({ x, cu, ok }, i) => `<div class="card" style="--edge:${ok ? 'var(--done)' : 'var(--wait)'}"><div class="c-top"><div class="c-t">${escH(x.who || '—')} ${cu ? '<span class="code">' + escH(cu.code) + '</span>' : ''}</div><div class="money">${fmt(x.amt)}</div></div>
          <div class="c-s">${escH(xlM(x.m))}${x.memo ? ' · ' + escH(x.memo) : ''} · ${ok ? '✅ متسجّلة في حسابات العملاء' : '⚠️ مش متسجّلة في السيستم'}</div>
          ${ok ? '' : `<div class="acts">${cu ? `<button class="btn pri sm" onclick="xlRecordColl(${i})">💵 سجّلها لـ ${escH(cu.name)}</button>`
               : `<input class="search" style="margin:0;flex:1 1 200px;" list="dlCust" id="xlCu${i}" placeholder="مين المحل ده؟ اكتب واختار">
                  <button class="btn pri sm" onclick="xlRecordColl(${i})">💵 سجّلها</button>`}</div>`}</div>`).join('')}` : ''}`;
    XL._colls = colls;
  } else if(day >= H.start) cmp = '<div class="empty">⏳ بنجيب اللي في السيستم…</div>';

  // ٣) المدفوعات
  const expHtml = d.exp.length ? `<div class="tscroll"><table class="tbl"><tr><th>البيان</th><th>البند</th><th>منين</th><th class="n">المبلغ</th><th>بيتقيّد</th></tr>
    ${d.exp.map(x => {
      const cn = pk['c' + x.row] || x.cat, c = xlCat(cn);
      let to = '', extra = '';
      if(!c){
        extra = `<select onchange="xlSetPick('c${x.row}',this.value)"><option value="">— اختار البند —</option>${cats.map(k => `<option${k.name === cn ? ' selected' : ''}>${escH(k.name)}</option>`).join('')}</select>`;
      } else if(c.how === 'supplier'){
        const sid = pk['s' + x.row] || xlGuessSup(x.memo);
        to = '🏪 سند صرف SP لـ ' + (sid ? escH((sups.find(z => z.id === sid) || {}).name || '') : '؟');
        extra = `<select onchange="xlSetPick('s${x.row}',this.value)"><option value="">— التاجر —</option>${sups.map(z => `<option value="${z.id}"${z.id === sid ? ' selected' : ''}>${escH(z.name)}</option>`).join('')}</select>`;
      } else if(c.how === 'acq'){
        const cid = pk['u' + x.row] || xlGuessAcq(x.memo);
        to = xlAccLbl(c.acc);
        extra = `<select onchange="xlSetPick('u${x.row}',this.value)"><option value="">— محل الاستحواذ —</option>${acqs.map(z => `<option value="${z.id}"${z.id === cid ? ' selected' : ''}>${escH(z.code + ' · ' + z.name)}</option>`).join('')}</select>`;
      } else if(c.how === 'asset'){
        const a = pk['a' + x.row];
        to = a ? xlAccLbl(a) : '';
        extra = `<select onchange="xlSetPick('a${x.row}',this.value)"><option value="">— نوع الأصل —</option>${assetAccs.map(z => `<option value="${z.code}"${z.code === a ? ' selected' : ''}>${z.code} · ${escH(z.name)}</option>`).join('')}</select>`;
      } else to = xlAccLbl(c.acc);
      return `<tr><td>${escH(x.memo || '—')}</td><td>${escH(cn || '—')}${pk['c' + x.row] && x.cat !== cn ? ' <small>(اخترته)</small>' : ''}</td><td>${escH(xlM(x.m))}</td>
        <td class="n">${fmt(x.amt)}</td><td>${to}${extra ? '<div style="margin-top:4px;">' + extra + '</div>' : ''}</td></tr>`;
    }).join('')}</table></div>` : '<div class="empty">مفيش مدفوعات</div>';

  // ٤) سلف الموظفين · السجل · التحويلات
  const wdHtml = d.wd.length ? `<div class="card">${d.wd.map(x => `<div class="jl"><div class="a">👥 ${escH(x.name || '— من غير اسم')} <small>${escH(xlM(x.m))} ← مسحوبات الموظفين (1255)</small></div><div class="d">${fmt(x.amt)}</div><div></div></div>`).join('')}
      <div class="c-s">💡 الاسم بيتربط بالموظف من «🔩 مسحوبات الإكسل» في HR — الاسم اللي مش مربوط بيتقيّد من غير موظف وبيطلعلك تنبيه.</div></div>` : '';
  const pv = xlPrevLoans(d.n);
  const ld = xlLoanDiff(d.loans, pv ? pv.loans : null);
  const noHistory = !pv && (d.loans.out.length || d.loans.in.length);
  const loanHtml = (d.loans.out.length || d.loans.in.length || ld.length) ? `<div class="sec-h">🤝 سجل السلف (الفرق عن امبارح)<span class="rule"></span></div>
    <div class="hint">${pv ? escH(pv.src) : 'مفيش سجل قبل كده'} — اللي اتغيّر بس هو اللي بيتقيّد.</div>
    ${noHistory ? `<label class="warnbox" style="display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" style="width:auto;margin-top:5px;" ${XL.base[d.n] ? 'checked' : ''} onchange="XL.base[${d.n}]=this.checked;xlRenderDay();render()">
      <span>ده أول يوم يتقيّد. السلف دي كانت موجودة قبل بداية الدفاتر؟ علّم هنا وهتتعامل كرصيد قديم (اكتبها في القيد الافتتاحي). من غير علامة = سلف جديدة النهارده.</span></label>` : ''}
    <div class="card">${(XL.base[d.n] && noHistory ? [] : ld).map(x => `<div class="jl"><div class="a">${x.side === 'out' ? (x.d > 0 ? '➡️ سلّفنا ' : '⬅️ رجّعلنا ') : (x.d > 0 ? '⬅️ استلفنا من ' : '➡️ رجّعنا لـ')}${escH(x.nm)}
      <small>${escH(xlM(x.m))} · ${x.side === 'out' ? 'سلف مؤقتة للغير (1270)' : 'سلف مؤقتة من الغير (2170)'}</small></div><div class="d">${fmt(Math.abs(x.d))}</div><div></div></div>`).join('') || '<div class="c-s">مفيش تغيير</div>'}</div>` : '';
  const trs = d.tr.filter(t => !t.opening);
  const trHtml = trs.length || d.tr.length ? `<div class="sec-h">⇄ التحويلات بين الخزن<span class="rule"></span></div><div class="card">
    ${trs.map(t => `<div class="jl"><div class="a">${escH(xlM(t.from))} ← ${escH(xlM(t.to))} <small>${escH(t.memo)}</small></div><div class="d">${fmt(t.amt)}</div><div></div></div>`).join('')}
    ${d.tr.filter(t => t.opening).length ? `<div class="c-s">📌 ${d.tr.filter(t => t.opening).length} سطر «رصيد افتتاحي» — مابيتقيّدوش (أرصدة أول الشهر)</div>` : ''}</div>` : '';

  // ٥) مراجعة على أرقام إكسل نفسه
  const chk = ([['rec','المقبوضات'],['exp','المدفوعات'],['wd','سلف الموظفين'],['ret','المرتجعات']] as [keyof XlTot, string][])
    .filter(([k]) => d.cached[k] != null).map(([k, l]) => ({ l, ok: Math.abs(d.cached[k]! - d.tot[k]) < 0.5, a: d.tot[k], b: d.cached[k] }));
  const chkHtml = chk.length ? `<div class="${chk.every(c => c.ok) ? 'okbox' : 'err'}">${chk.every(c => c.ok) ? '✅ الأرقام اللي اتقرت = مجاميع الشيت نفسه'
      : '⚠️ اللي اتقرا مش زي مجاميع الشيت: ' + chk.filter(c => !c.ok).map(c => c.l + ' ' + fmt(c.a) + ' ≠ ' + fmt(c.b)).join(' · ')}</div>` : '';

  const rec = s.rec;
  host.innerHTML = `${['pre','future'].includes(s.k) ? `<div class="warnbox">📅 ${escH(s.l)} — مايتقيّدش.</div>` : ''}
    ${d.bad.length ? `<div class="err">⚠️ صلّح الحاجات دي في الشيت الأول:<br>${d.bad.map(escH).join('<br>')}</div>` : ''}
    ${rec ? `<div class="okbox">📥 اتقيّد ${rec.entry_no ? '<span class="code">' + escH(rec.entry_no) + '</span>' : '(من غير قيد — كله نقدي)'} · ${escH(rec.by)} · ${new Date(rec.at).toLocaleString('ar-EG')}
      ${(rec.sup_nos || []).length ? ' · دفعات ' + rec.sup_nos!.map(x => '<span class="code">' + escH(x) + '</span>').join(' ') : ''}
      ${s.k === 'changed' ? '<br>✏️ الأرقام في الملف اتغيّرت عن اللي اتقيّد — «قيّد تاني» هيعكس القديم ويسجّل الجديد.' : ''}</div>` : ''}
    ${(rec && rec.warns || []).map(w => `<div class="warnbox">${w.t === 'wd_name' ? '👥 «' + escH(w.name) + '» (' + fmt(w.amt) + ') مش مربوط بموظف — اربطه من «🔩 مسحوبات الإكسل» في HR وارفع اليوم تاني'
        : w.t === 'asset' ? '🏗️ شراء أصل «' + escH(w.memo) + '» بـ ' + fmt(w.amt) + ' — اعمله كارت في «🏗️ الأصول» واختار «📝 متقيّد قبل كده»'
        : w.t === 'acq' ? '🤝 دفعة محل استحواذ بـ ' + fmt(w.amt) + ' — اعملها كارت في «🏗️ الأصول» (مقابل محل استحواذ · «📝 متقيّد قبل كده») عشان تتوزّع على الشهور'
        : w.t === 'loans_base' ? '📌 سجل السلف اتعامل كرصيد قديم — اتأكد إنه في القيد الافتتاحي' : escH(JSON.stringify(w))}</div>`).join('')}
    ${chkHtml}
    <div class="sec-h">💰 المقبوضات جت إزاي<span class="rule"></span></div>${recHtml}
    ${cmp}
    <div class="sec-h">🧾 المدفوعات<span class="rule"></span></div>${expHtml}
    ${wdHtml ? `<div class="sec-h">👥 سلف الموظفين<span class="rule"></span></div>${wdHtml}` : ''}
    ${loanHtml}${trHtml}
    ${xlNeeds(d).length && !['pre','future'].includes(s.k) ? `<div class="warnbox">🟡 قبل التقييد: ${xlNeeds(d).map(x => escH(x.t)).join(' · ')}</div>` : ''}
    <div class="acts">
      ${can ? `<button class="btn pri" onclick="xlPostDay(${d.n})" ${XL.busy ? 'disabled' : ''}>${XL.busy ? '⏳ …' : s.k === 'changed' ? '📥 قيّد تاني' : '📥 قيّد اليوم ده'}</button>` : ''}
      ${rec ? `<button class="btn bad sm" onclick="xlUndo(${d.n})">↩️ شيل القيد</button>` : ''}
    </div>`;
}
function xlFindCust(name: string): GlCustomer | null{
  const k = norm(name); if(!k) return null;
  const al = (XL.aliases || {})[k];
  return CUST.find(c => c.id === al) || CUST.find(c => norm(c.name) === k) || null;
}
function xlSetPick(k: string, v: string){ (XL.picks[XLD] = XL.picks[XLD] || {})[k] = v; xlRenderDay(); render(); }
async function xlRecordColl(i: number){
  const it = (XL._colls || [])[i]; if(!it) return;
  let cu: GlCustomer | null | undefined = it.cu;
  if(!cu){
    const v = String(($('xlCu' + i) || {}).value || '').trim();
    cu = CUST.find(x => (x.code + ' · ' + x.name) === v) || CUST.find(x => x.code === v.split(' ')[0]);
    if(!cu){ toast('اختار المحل من القايمة', true); return; }
  }
  const day = xlDate(XLD);
  if(!confirm(`💵 دفعة ${fmt(it.x.amt)} ج.م من «${cu.name}» بتاريخ ${dt(day)}\nهتتسجّل في «حسابات العملاء» (ومنها في الدفاتر). نسجّل؟`)) return;
  try{
    await rpc('erp_ledger_post', { p_customer: cu.id, p_type:'credit', p_amount: it.x.amt,
      p_note: 'من شيت الإكسل يوم ' + dt(day) + (it.x.memo ? ' — ' + it.x.memo : ''), p_date: new Date(day + 'T12:00:00+03:00').toISOString() });
    toast('✅ اتسجّلت'); delete XL.sys[day]; xlOpenDay(XLD);
  }catch(e: any){ toast(errMsg(e), true); }
}
async function xlPostOne(d: XlDay): Promise<string>{
  const st = xlState(d);
  if(!['ready','changed'].includes(st.k)) throw new Error('يوم ' + d.n + ': ' + st.l);
  const r = await rpc('xl_import_day', { p_day: xlDate(d.n), p_hash: st.hash, p_data: xlPayload(d), p_force: false });
  return 'يوم ' + d.n + ': ' + (r.skipped ? 'زي ما هو' : (r.entry_no || 'كله نقدي — مفيش قيد') + ((r.sup_nos || []).length ? ' · ' + r.sup_nos.join(' ') : '')
    + ((r.warns || []).length ? ' · ⚠️ ' + r.warns.length + ' تنبيه' : '') + (r.redo ? ' (اتقيّد تاني)' : ''));
}
async function xlPostDay(n: number){
  const d = XL.days!.find(x => x.n === n); if(!d || XL.busy) return;
  if(!confirm('📥 قيّد يوم ' + n + ' (' + dt(xlDate(n)) + ')؟')) return;
  XL.busy = true; xlRenderDay();
  try{ const m = await xlPostOne(d); XL.log = [m]; toast('✅ ' + m); }
  catch(e: any){ toast(errMsg(e), true); }
  XL.busy = false; await xlLoadBoard(); load();
}
async function xlPostMany(){
  if(XL.busy) return;
  const list = XL.days!.filter(d => ['ready','changed'].includes(xlState(d).k));
  if(!list.length) return;
  if(!confirm('📥 هيتقيّد ' + list.length + ' يوم بالترتيب (' + list.map(d => d.n).join('، ') + ').\nلو يوم وقف هنقف عنده. نكمّل؟')) return;
  XL.busy = true; XL.log = []; render();
  for(const d of list){
    try{ XL.log.push('✅ ' + await xlPostOne(d)); }
    catch(e: any){ XL.log.push('⛔ يوم ' + d.n + ': ' + errMsg(e)); break; }
    render();
  }
  XL.busy = false; await xlLoadBoard(); load();
}
async function xlUndo(n: number){
  const why = prompt('↩️ شيل قيد يوم ' + n + '\nالقيد هيتعكس (ودفعات التجار بتاعته تتلغي) — مفيش حاجة بتتمسح.\n\nالسبب:');
  if(why === null) return;
  try{
    const r = await rpc('xl_undo_day', { p_day: xlDate(n), p_reason: why });
    toast('↩️ اتشال' + (r.later ? ' — ⚠️ فيه أيام بعده متقيّدة: ارفعها تاني عشان سجل السلف' : ''), !!r.later);
    await xlLoadBoard(); load();
  }catch(e: any){ toast(errMsg(e), true); }
}
// الأسامي البديلة للمحلات (عشان «حفيله» = «حفيلة»)
(async function xlAliases(){
  try{ const a = await sel('customer_aliases', 'alias_norm,customer_id'); XL.aliases = {}; a.forEach(x => { XL.aliases![x.alias_norm] = x.customer_id; }); }
  catch(e: any){ XL.aliases = {}; }
})();

// ============================================================
// 🪟 الشيت
// ============================================================
function sheet(title: string, body: string){
  const old = $('sheetOv'); if(old) old.remove();
  const ov = document.createElement('div');
  ov.className = 'ov'; ov.id = 'sheetOv';
  ov.onclick = e => { if(e.target === ov) closeSheet(); };
  ov.innerHTML = `<div class="sheet" dir="rtl"><div class="sh-h"><h3>${escH(title)}</h3><button class="sh-x" onclick="closeSheet()">✕</button></div><div class="sh-b" id="shBody">${body}</div></div>`;
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';
}
function setSheetBody(html: string){ const b = $('shBody'); if(b) b.innerHTML = html; }
function closeSheet(){ const o = $('sheetOv'); if(o) o.remove(); document.body.style.overflow = ''; }
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeSheet(); });
