
// ============================================================
// FIX TEAM — صفحة مسؤول قطع الغيار «🛵 قطع الغيار» (parts.html)
// ------------------------------------------------------------
// 🟦 (٢٠٢٦-١٠-٢٢) الكود ده كان جوه parts.html نفسها واتنقل هنا.
//    الصفحة بقت بتنده: <script src="pages/parts.js"></script>
//    🧸 نفس الكود بالحرف — اتزوّد بس «ورق» بيقول نوع كل حاجة.
// ⚠️ السكريبتين الصغيرين اللي فوق في <head> (اللغة عربي + الثيم)
//    فضلوا جوه الصفحة عن قصد: لازم يشتغلوا قبل ما الصفحة تترسم.
// ⚠️ بيتحمّل بعد common.js · i18n.js · attendance.js · payroll.js.
// ============================================================
// 🏷️ الأنواع — بتختفي بعد الترجمة (كلها جاية من parts_board — ملفات 95 و 104)
/** طلب قطعة من الفني / مدير الإنتاج */
interface PtReq {
  id: string;
  /** new · going · bought · received · unavailable · cancelled */
  status: string;
  part: string;
  device_id: string;
  device_label: string;
  device_issue?: string | null;
  tech_name?: string | null;
  requested_by_name: string;
  created_at: string;
  taken_by?: string | null;
  taken_by_name?: string | null;
  urgent?: any;
  note?: string | null;
  close_note?: string | null;
  closed_by_name?: string | null;
  [k: string]: any;
}
/** قطعة اتشرت */
interface PtBuy {
  id: string;
  part: string;
  qty: any;
  /** null = ⏳ لسه من غير سعر */
  unit_price: number | null;
  price_guess?: number | null;
  supplier: string;
  supplier_id: string;
  request_id?: string | null;
  device_id?: string | null;
  device_label: string;
  /** active · bad · returned */
  status: string;
  from_invoice?: boolean;
  invoice_id?: string | null;
  bought_at: string;
  bought_by_name: string;
  [k: string]: any;
}
/** تاجر */
interface PtSup {
  id: string;
  name: string;
  active?: boolean;
  /** daily · weekly · none */
  cycle?: string;
  inv_dow?: number | null;
  credit_limit?: number | null;
  balance?: any;
  pending_n?: number;
  unpriced_n?: number;
  oldest_pending?: string | null;
  [k: string]: any;
}
/** جهاز في «⚖️ المطابقة» */
interface PtMatch {
  device_id: string;
  label: string;
  tech?: string | null;
  tech_comment?: string | null;
  /** match · mismatch · null */
  decision?: string | null;
  stale?: boolean;
  parts?: any[];
  [k: string]: any;
}
/** رد parts_board() */
interface PtBoard {
  role: string;
  me: string;
  uid: string;
  requests: PtReq[];
  purchases?: PtBuy[];
  suppliers?: PtSup[];
  match?: PtMatch[];
  invoices?: any[];
  price_log?: any[];
  [k: string]: any;
}
/** تنبيه في «⚠️ تنبيهات» */
interface PtAlert { k: string; s?: PtSup; p?: PtBuy; txt: string; }
/** فورم «🛒 اشتريتها» */
interface PtBuyForm {
  req: PtReq | null;
  dev: { id: string; label: string } | null;
  part: string;
  qty: any;
  sup: string;
  price: any;
  unk: boolean;
  note: string;
  busy: boolean;
  found: any[];
  stock?: boolean;
  [k: string]: any;
}
/** سطر في فاتورة التاجر */
interface PtLine {
  uid: number;
  name: string;
  qty: any;
  unit: number | null;
  total: number | null;
  /** القطع المسجّلة اللي السطر ده بيسعّرها */
  purchases: string[];
  ok: boolean;
  manual: boolean;
  totalTyped?: boolean;
  unitTyped?: boolean;
  [k: string]: any;
}
/** فاتورة بتتدخّل دلوقتي */
interface PtInv {
  sid: string;
  date: string;
  no: string;
  total: any;
  adjust: boolean;
  lines: PtLine[];
  file: Blob | null;
  url: string;
  mime: string;
  model: string;
  raw: any;
  busy: boolean;
  reading: boolean;
  pickFor: number | null;
  uid: number;
}

// ============================================================
// 🛵🔩 صفحة مسؤول قطع الغيار (ملفات SQL رقم 95 و 104)
// ------------------------------------------------------------
// 🧸 الحكاية:
//   الفني / مدير الإنتاج يطلب قطعة → المسؤول يدوس «🚶 رايح أجيبها»
//   (الطلب يتقفل باسمه) → يشتريها ويكتب التاجر، والسعر لو يعرفه (وإلا ⏳)
//   → الفني يستلم → الفاتورة توصل (يومي أو أسبوعي) → **المحاسب العام**
//   يراجعها مع التاجر ويدخّلها فالأسعار تنزل → المحاسب العام يدفع للتاجر.
//
// 👀 مين بيفتح الصفحة دي:
//   🛵 مسؤول القطع (parts)   → الطلبات والشراء والقطع بالأسعار — من غير فواتير ولا دفعات
//   🧾 المحاسب العام          → كل حاجة + 🧾 الفواتير + 💸 الدفعات + ⚖️ المطابقة + ⚠️ التنبيهات
//   🏭 مدير الإنتاج           → الطلبات + ⚖️ المطابقة + التكرار — **من غير أي سعر**
//   (السيرفر هو اللي بيشيل الأسعار ويقفل الفواتير — مش الشاشة اللي بتخبّيها)
//
// 📑 (ملف 104) الورق بقى ليه أرقام في كشكول الـERP:
//   🧾 PI فاتورة مشتريات · 💸 SP سند صرف لتاجر · ↩️ PR مرتجع مشتريات
//   وبعد ما القطعة تدخل فاتورة، سعرها بيتعدّل من المحاسب العام بس.
//
// ⚠️ الصفحة مابتقراش جدول الأجهزة خالص. كل حاجة من دالة parts_board
//    على السيرفر — بتدّي رقم التذكرة والموديل والعطل بس (مفيش عميل ولا تليفون).
// ============================================================
/** 🧸 بيرجّع أي عنصر في الصفحة (خانة · زرار · صندوق) — عشان كده any */
const $: (id: string) => any = id => document.getElementById(id);
let B: PtBoard | null = null, ROLE = '', ME = '', UID = '', loadErr = '', loading = false;
const S: { tab: string; supFocus: any } = { tab: 'req', supFocus: null };
let lastReqIds: Set<string> | null = null;

const ROLE_LBL: Record<string, string> = { parts:'مسؤول قطع الغيار', super_admin:'المحاسب العام', production:'مدير الإنتاج' };
const isRunner = () => ROLE === 'parts';
const isBoss   = () => ROLE === 'super_admin';
const isProd   = () => ROLE === 'production';
const money    = () => ROLE === 'parts' || ROLE === 'super_admin';

// ---------- أدوات ----------
function fmt(n: unknown): string { return (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-EG'); }
function num(v: unknown): number | null {
  const s = String(v == null ? '' : v).replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x0660)
    .replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x06F0).replace(/[^\d.\-]/g, '');
  const n = parseFloat(s); return Number.isFinite(n) ? n : null;
}
// نفس تبسيط السيرفر (parts_norm): «شاشة أصلي» = «شاشه اصلى»
function norm(t: unknown): string {
  return String(t || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ـ/g, '')
    .replace(/[\s.,،؛؟!?\-_/\\()+*:;"'«»]+/g, ' ').trim();
}
function cairoDay(d?: any): string { try{ return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Cairo' }).format(d ? new Date(d) : new Date()); }catch(e: any){ return ''; } }
function ago(iso: any): string {
  const m = Math.floor((Date.now() - (new Date(iso) as any).getTime()) / 60000);
  if(!(m >= 0)) return '';
  if(m < 1) return 'دلوقتي';
  if(m < 60) return 'من ' + m + ' دقيقة';
  const h = Math.floor(m / 60); if(h < 24) return 'من ' + h + ' ساعة';
  const d = Math.floor(h / 24); return d === 1 ? 'من يوم' : 'من ' + d + ' يوم';
}
function dt(iso: any): string { try{ return new Date(iso).toLocaleString('ar-EG', { day:'numeric', month:'numeric', hour:'numeric', minute:'2-digit', timeZone:'Africa/Cairo' }); }catch(e: any){ return ''; } }
function dOnly(v: any): string { try{ return new Date(v + (String(v).length === 10 ? 'T12:00:00' : '')).toLocaleDateString('ar-EG', { day:'numeric', month:'numeric', year:'2-digit', timeZone:'Africa/Cairo' }); }catch(e: any){ return v || ''; } }
const DOW = ['الأحد','الاتنين','التلات','الأربع','الخميس','الجمعة','السبت'];
// 📑 (ملف 104) شارة رقم المستند
function docPill(no: unknown): string { return no ? ` <span class="pill doc">${esc(no)}</span>` : ''; }

let toastT: any;
function toast(msg: string, bad?: boolean){
  const el = $('toast'); el.textContent = msg; el.classList.toggle('bad', !!bad); el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), bad ? 5200 : 2800);
}
// ⚠️ Supabase مابيرميش خطأ — بيرجّعه في .error. الدالة دي بترميه بصوت عالي.
async function rpc(name: string, args?: Record<string, any>): Promise<any> {
  if(!navigator.onLine) throw new Error('مفيش نت — العملية دي محتاجة اتصال');
  const { data, error } = await sb.rpc(name, args || {});
  if(error) throw error;
  return data;
}
function errMsg(e: any): string {
  const m = (e && (e.message || e.hint)) || String(e);
  if(/parts_board|part_buy|part_request|schema cache|does not exist|PGRST202/i.test(m)) return m + ' — (ملف SQL رقم 95 لسه ما اتشغّلش؟)';
  return m;
}

// ============================================================
// 🚪 الدخول
// ============================================================
(async function boot(){
  const { data:{ session } } = await sb.auth.getSession();
  if(!session){ location.replace('index.html'); return; }
  // بوابة الاشتراك — نفس باقي الصفحات (جدول shop بيتقرا دايماً)
  try{
    const { data:sh } = await sb.from('shop').select('paid_until, trial_until').eq('id', 1).maybeSingle();
    if(sh){
      const now = new Date();
      const ok = (sh.paid_until && new Date(sh.paid_until) > now) || (sh.trial_until && new Date(sh.trial_until) > now);
      if(!ok){ try{ showServiceStopped(false); }catch(e: any){} return; }
    }
  }catch(e: any){ console.error('[الاشتراك]', e); }
  try{
    localStorage.setItem('ifix-last-email', (session.user.email || '').toLowerCase());
    sessionStorage.removeItem('ifix-bounced');
  }catch(e: any){}
  await load();
  setInterval(() => { if(!document.hidden) load(); }, 60000);
  subscribeLive();
})();

async function load(manual?: boolean){
  if(loading) return;
  loading = true;
  try{
    const d = await rpc('parts_board', { p_days: 45 });
    B = d; ROLE = d.role; ME = d.me; UID = d.uid; loadErr = '';
    try{ localStorage.setItem('ifix-last-role', ROLE === 'parts' ? 'parts' : ROLE); }catch(e: any){}
    $('whoLbl').textContent = ME + ' — ' + (ROLE_LBL[ROLE] || ROLE);
    $('backDashBtn').style.display = isRunner() ? 'none' : '';
    if(isProd() && !['req','match'].includes(S.tab)) S.tab = 'req';
    notifyNew();
    if(manual) toast('اتحدّثت ✅');
  }catch(e: any){
    console.error('parts_board failed:', e);
    const m = errMsg(e);
    // مش مسموح للحساب ده؟ → يرجع لصفحته
    if(/مش مسموحة لحسابك/.test(m) && !B){
      let last = ''; try{ last = localStorage.getItem('ifix-last-role') || ''; }catch(_: any){}
      location.replace(last === 'technician' ? 'my-devices.html' : last === 'staff' ? 'staff.html' : last === 'hr' ? 'hr.html' : 'dashboard.html');
      return;
    }
    loadErr = m;
  }finally{ loading = false; }
  render();
}

// 🔔 طلب جديد وصل؟ → رجّة + رسالة (للمسؤول بس)
function notifyNew(){
  if(!B) return;
  const ids = new Set(B.requests.filter(q => q.status === 'new').map(q => q.id));
  if(lastReqIds && isRunner()){
    const fresh = B.requests.filter(q => q.status === 'new' && !lastReqIds!.has(q.id));
    if(fresh.length){
      try{ if(navigator.vibrate) navigator.vibrate([120, 60, 120]); }catch(e: any){}
      toast('🔔 طلب جديد: ' + fresh[0].part + (fresh.length > 1 ? ' (+' + (fresh.length - 1) + ')' : ''));
    }
  }
  lastReqIds = ids;
}

// ⚡ لحظي: أول ما حد يطلب قطعة، الصفحة بتتحدّث (لو الـ Realtime شغّال)
let liveT: any = 0;
function subscribeLive(){
  if(!(isRunner() || isBoss())) return;
  try{
    sb.channel('parts_live').on('postgres_changes', { event:'*', schema:'public', table:'part_requests' }, () => {
      clearTimeout(liveT); liveT = setTimeout(() => load(), 700);
    }).subscribe();
  }catch(e: any){ console.warn('parts realtime:', e); }
}
document.addEventListener('visibilitychange', () => { if(!document.hidden) load(); });
addEventListener('online', () => load());

// ============================================================
// 🧮 حسابات بتتعمل على الشاشة
// ============================================================
const P = () => (B && B.purchases) || [];
const supById: (id: string) => PtSup | null = id => ((B && B.suppliers) || []).find(s => s.id === id) || null;
const openReqs = () => B!.requests.filter(q => ['new','going','bought'].includes(q.status));
const unpriced = () => P().filter(p => p.unit_price == null && p.status !== 'returned' && !p.from_invoice);
const badOnes = () => P().filter(p => p.status === 'bad');
const pendingOf: (sid: string) => PtBuy[] = sid => P().filter(p => p.supplier_id === sid && !p.invoice_id && p.status !== 'returned' && !p.from_invoice);

// 📅 الفاتورة اتأخرت؟ (يومي: من بكره · أسبوعي: بعد ٧ أيام من أقدم قطعة)
function invoiceDue(s: PtSup): { late: number; txt: string } | null {
  if(!s || !s.oldest_pending || s.cycle === 'none') return null;
  const today = cairoDay();
  const oldestDay = cairoDay(s.oldest_pending);
  const days = Math.floor(((new Date(today) as any) - (new Date(oldestDay) as any)) / 86400000);
  if(s.cycle === 'daily'){
    if(days >= 1) return { late: days, txt: '⏰ فاتورته اليومية متأخرة ' + days + ' يوم' };
    return { late: 0, txt: '📅 فاتورة النهارده' };
  }
  const todayDow = new Date(today + 'T12:00:00').getDay();
  if(days > 7) return { late: days - 7, txt: '⏰ فاتورته الأسبوعية متأخرة ' + (days - 7) + ' يوم' };
  if(s.inv_dow != null && todayDow === Number(s.inv_dow)) return { late: 0, txt: '📅 فاتورته النهارده (' + DOW[s.inv_dow] + ')' };
  return null;
}
function alerts(): PtAlert[] {
  if(!B || !money()) return [];
  const a: PtAlert[] = [];
  (B.suppliers || []).forEach(s => {
    const due = invoiceDue(s);
    // 🧾 المحاسب العام بيعرف بعد يوم زيادة (أسبوعي) أو يومين (يومي)
    //    🛵 المسؤول بيعرف على طول — عشان يفكّر التاجر يبعتها
    if(due && due.late > 0 && (isRunner() || due.late >= (s.cycle === 'daily' ? 2 : 1)))
      a.push({ k:'inv', s, txt: '🧾 ' + s.name + ': ' + due.txt + ' (' + s.pending_n + ' قطعة مستنية)'
                                + (isRunner() ? ' — فكّر التاجر يبعتها للمحاسب العام' : '') });
    if(s.credit_limit != null && Number(s.balance) > Number(s.credit_limit))
      a.push({ k:'limit', s, txt: '💳 ' + s.name + ': الحساب ' + fmt(s.balance) + ' عدّى الحد ' + fmt(s.credit_limit) });
  });
  const old7 = unpriced().filter(p => Date.now() - (new Date(p.bought_at) as any) > 7 * 86400000);
  if(old7.length) a.push({ k:'old', txt: '⏳ ' + old7.length + ' قطعة من غير سعر من أكتر من ٧ أيام' });
  if(isBoss()){
    P().filter(p => p.price_flag === 'jump').forEach(p => a.push({ k:'jump', p,
      txt: '🔺 سعر «' + p.part + '» من ' + p.supplier + ' قفز لـ ' + fmt(p.unit_price) + ' (أكتر من ٢٠٪)' }));
    P().filter(p => p.from_invoice && p.part !== 'فرق إجمالي الفاتورة' && Date.now() - (new Date(p.bought_at) as any) < 14 * 86400000)
      .forEach(p => a.push({ k:'extra', p, txt: '🧾 «' + p.part + '» في فاتورة ' + p.supplier + ' ومالهاش شراء مسجّل (دخلت المخزن)' }));
  }
  return a;
}
function matchQueue(): PtMatch[] {
  return ((B && B.match) || []).filter(m => !m.decision || m.stale || m.decision === 'mismatch'
                                          || (m.parts || []).some(x => x.dup_state === 'open'));
}

// ============================================================
// 🖼️ الرسم
// ============================================================
function tabsList(){
  if(!B) return [];
  const t: { k: string; l: string; n?: number; soft?: boolean }[] = [{ k:'req', l:'📥 الطلبات', n: B.requests.filter(q => q.status === 'new').length }];
  if(money()){
    t.push({ k:'unk', l:'⏳ من غير سعر', n: unpriced().length, soft: true });
    // 🔒 (ملف 104) الفواتير عند المحاسب العام بس
    if(isBoss()) t.push({ k:'inv', l:'🧾 الفواتير' });
    t.push({ k:'sup', l:'🏪 التجار' });
    t.push({ k:'ret', l:'↩️ ترجيع', n: badOnes().length });
    t.push({ k:'buys', l:'🛒 القطع' });
  }
  if(isBoss() || isProd()) t.push({ k:'match', l:'⚖️ المطابقة', n: matchQueue().length });
  if(money()) t.push({ k:'alert', l:'⚠️ تنبيهات', n: alerts().length });
  return t;
}
function render(){
  const tl = tabsList();
  if(B && !tl.some(x => x.k === S.tab)) S.tab = 'req';
  $('tabs').innerHTML = tl.map(x => `<button class="tab${S.tab === x.k ? ' on' : ''}" onclick="go('${x.k}')">${x.l}${x.n ? `<span class="n${x.soft ? ' soft' : ''}">${x.n}</span>` : ''}</button>`).join('');
  const app = $('app');
  if(!B){ app.innerHTML = loadErr ? `<div class="err">⚠️ ${esc(loadErr)}</div><button class="big" onclick="load(true)">↻ جرّب تاني</button>` : '<div class="empty">⏳ جاري التحميل…</div>'; return; }
  const head = loadErr ? `<div class="err">⚠️ آخر تحديث فشل: ${esc(loadErr)}</div>` : '';
  const V: Record<string, () => string> = { req: viewReq, unk: viewUnk, inv: viewInv, sup: viewSup, ret: viewRet, buys: viewBuys, match: viewMatch, alert: viewAlert };
  app.innerHTML = head + (V[S.tab] || viewReq)();
  $('fabHost').innerHTML = money() && ['req','buys','unk'].includes(S.tab)
    ? `<button class="fab" onclick="openBuy(null)">➕ قطعة من غير طلب</button>`
    : (isBoss() && S.tab === 'inv' ? `<button class="fab" onclick="openInvoice(null)">🧾 فاتورة جديدة</button>` : '');
}
function go(k: string){ S.tab = k; render(); window.scrollTo(0, 0); }

// ---------- 📥 الطلبات ----------
const REQ_ST: Record<string, string[]> = { new:['🆕 جديد','red'], going:['🚶 رايح يجيبها','blue'], bought:['🛒 اتشرت — مستني الفني يستلم','green'],
                 received:['✅ الفني استلم','green'], unavailable:['🚫 مش متوفرة','wait'], cancelled:['✖️ اتلغى',''] };
function reqCard(q: PtReq): string {
  const st = REQ_ST[q.status] || [q.status, ''];
  const mine = q.taken_by && q.taken_by === UID;
  const bought = P().filter(p => p.request_id === q.id);
  const guess = lastPriceTxt(q.part);
  let acts = '';
  if(isRunner()){
    if(q.status === 'new') acts = `<button class="btn go" onclick="reqAct('${q.id}','take')">🚶 رايح أجيبها</button>
      <button class="btn" onclick="openBuy('${q.id}')">🛒 اشتريتها</button>
      <button class="btn bad sm" onclick="reqUnavail('${q.id}')">🚫 مش متوفرة</button>`;
    else if(q.status === 'going' && mine) acts = `<button class="btn pri" onclick="openBuy('${q.id}')">🛒 اشتريتها</button>
      <button class="btn bad sm" onclick="reqUnavail('${q.id}')">🚫 مش متوفرة</button>
      <button class="btn ghost sm" onclick="reqAct('${q.id}','release')">↩️ سيبه</button>`;
    else if(q.status === 'bought') acts = `<button class="btn sm" onclick="openBuy('${q.id}')">➕ قطعة كمان للطلب ده</button>`;
    else if(q.status === 'unavailable') acts = `<button class="btn ghost sm" onclick="reqAct('${q.id}','reopen')">🔄 لقيتها — افتحه تاني</button>`;
  } else {
    if(['new','going'].includes(q.status)) acts += `<button class="btn bad sm" onclick="reqCancel('${q.id}')">✖️ إلغاء الطلب</button>`;
    if(isBoss() && q.status === 'going') acts += `<button class="btn ghost sm" onclick="reqAct('${q.id}','release')">↩️ فكّه من ${esc(q.taken_by_name)}</button>`;
    if(['unavailable','cancelled'].includes(q.status)) acts += `<button class="btn ghost sm" onclick="reqAct('${q.id}','reopen')">🔄 افتحه تاني</button>`;
    if(q.status === 'bought') acts += `<button class="btn ok sm" onclick="reqAct('${q.id}','received')">✅ الفني استلم</button>`;
  }
  const cls = q.status === 'new' ? 'new' : q.status === 'going' ? 'going' : q.status === 'bought' ? 'bought' : 'closed';
  return `<div class="card ${cls}">
    <div class="c-top"><div class="c-t">${q.urgent ? '🔥 ' : ''}${esc(q.part)}</div><span class="pill ${st[1]}">${st[0]}</span></div>
    <div class="c-s">📱 <b>${esc(q.device_label)}</b>${q.tech_name ? ' · 🔧 ' + esc(q.tech_name) : ''}</div>
    <div class="c-s">طلبها ${esc(q.requested_by_name)} · ${ago(q.created_at)}${q.taken_by_name ? ' · 🚶 ' + esc(q.taken_by_name) : ''}</div>
    ${q.device_issue ? `<div class="box">🛠️ ${esc(q.device_issue)}</div>` : ''}
    ${q.note ? `<div class="box">📝 ${esc(q.note)}</div>` : ''}
    ${q.close_note ? `<div class="box">🚫 ${esc(q.close_note)} — ${esc(q.closed_by_name)}</div>` : ''}
    ${bought.length ? `<div class="box">${bought.map(p => `🛒 ${esc(p.part)}${Number(p.qty) > 1 ? ' ×' + fmt(p.qty) : ''} · 🏪 ${esc(p.supplier)}${money() ? ' · ' + priceTxt(p) : ''}`).join('<br>')}</div>` : ''}
    ${money() && ['new','going'].includes(q.status) && guess ? `<div class="c-s">💡 ${guess}</div>` : ''}
    ${acts ? `<div class="acts">${acts}</div>` : ''}
  </div>`;
}
function viewReq(){
  const all = B!.requests;
  const order: Record<string, number> = { new:0, going:1, bought:2 };
  const open = openReqs().sort((a, b) => (order[a.status] - order[b.status]) || (b.urgent - a.urgent) || ((new Date(a.created_at) as any) - (new Date(b.created_at) as any)));
  const closed = all.filter(q => !['new','going','bought'].includes(q.status)).slice(0, 25);
  const myGoing = open.filter(q => q.status === 'going' && q.taken_by === UID).length;
  return `${isRunner() && myGoing ? `<div class="okbox">🚶 ماسك ${myGoing} طلب — لما تشتري دوس «🛒 اشتريتها» واكتب التاجر.</div>` : ''}
    <div class="sec-h">📥 مفتوحة <span class="c">${open.length}</span><span class="rule"></span></div>
    ${open.length ? open.map(reqCard).join('') : '<div class="empty">✨ مفيش طلبات مفتوحة دلوقتي</div>'}
    ${closed.length ? `<div class="sec-h">🗂️ اتقفلت قريب <span class="c">${closed.length}</span><span class="rule"></span></div>${closed.map(reqCard).join('')}` : ''}`;
}
async function reqAct(id: string, a: string){
  try{ await rpc('part_request_act', { p_id:id, p_action:a, p_note:'' });
    toast(({ take:'🚶 الطلب بقى باسمك', release:'↩️ الطلب رجع للكل', reopen:'🔄 الطلب اتفتح تاني', received:'✅ اتسجّل إن الفني استلم' } as Record<string, string>)[a] || 'تمام ✅');
    load();
  }catch(e: any){ toast(errMsg(e), true); load(); }
}
async function reqUnavail(id: string){
  const n = prompt('🚫 ليه مش متوفرة؟ (لفّيت على مين؟) — الكلام ده هيوصل للفني ومدير الإنتاج');
  if(n === null) return;
  try{ await rpc('part_request_act', { p_id:id, p_action:'unavailable', p_note:n }); toast('🚫 اتسجّل — مش متوفرة'); load(); }
  catch(e: any){ toast(errMsg(e), true); }
}
async function reqCancel(id: string){
  const n = prompt('✖️ سبب الإلغاء (اختياري)', '');
  if(n === null) return;
  try{ await rpc('part_request_act', { p_id:id, p_action:'cancel', p_note:n }); toast('✖️ الطلب اتلغى'); load(); }
  catch(e: any){ toast(errMsg(e), true); }
}

// ---------- 💡 آخر سعر ----------
function lastPrice(part: string, sid?: string): PtBuy | null {
  const n = norm(part);
  const list = P().filter(p => p.unit_price != null && Number(p.unit_price) > 0 && !p.from_invoice && norm(p.part) === n)
    .sort((a, b) => (((b.supplier_id === sid) as any) - ((a.supplier_id === sid) as any)) || ((new Date(b.bought_at) as any) - (new Date(a.bought_at) as any)));
  return list[0] || null;
}
function lastPriceTxt(part: string, sid?: string): string {
  const l = lastPrice(part, sid);
  return l ? `آخر مرة جبناها من ${esc(l.supplier)} بـ <b>${fmt(l.unit_price)}</b> ج.م (${ago(l.bought_at)})` : '';
}
function priceTxt(p: PtBuy): string {
  if(p.unit_price == null) return `<span class="unk">⏳ لسه من غير سعر</span>${p.price_guess ? ` <span style="color:var(--muted)">(تقريباً ${fmt(p.price_guess)})</span>` : ''}`;
  return `<span class="money">${fmt(p.unit_price)}</span> ج.م${Number(p.qty) > 1 ? ' × ' + fmt(p.qty) : ''}${p.price_flag === 'jump' ? ' <span class="pill red">🔺 قفز</span>' : ''}`;
}

// ---------- 🛒 «اشتريتها» ----------
const BUY: PtBuyForm = { req:null, dev:null, part:'', qty:1, sup:'', price:'', unk:true, note:'', busy:false, found:[] };
function openBuy(reqId: string | null){
  const q = reqId ? B!.requests.find(x => x.id === reqId) : null;
  Object.assign(BUY, { req: q, dev: q ? { id:q.device_id, label:q.device_label } : null, part: q ? q.part : '',
    qty: 1, sup: '', price: '', unk: true, note: '', busy: false, found: [], stock: false });
  sheet(q ? '🛒 اشتريت: ' + q.part : '🛒 قطعة من غير طلب', buyHtml());
}
function activeSups(): PtSup[] { return (B!.suppliers || []).filter(s => s.active); }
function buyHtml(): string {
  const sups = activeSups();
  const devBlock = BUY.req ? `<div class="box" style="margin:0 0 12px;">📱 <b>${esc(BUY.req.device_label)}</b>${BUY.req.tech_name ? ' · 🔧 ' + esc(BUY.req.tech_name) : ''}</div>`
    : `<label class="f"><span>📱 القطعة لأنهي جهاز؟</span>
        ${BUY.dev ? `<div class="chips"><span class="chip on">${esc(BUY.dev.label)}</span><button class="chip add" onclick="BUY.dev=null;reBuy()">تغيير</button></div>`
          : BUY.stock ? `<div class="chips"><span class="chip on">📦 للمخزن (مش لجهاز)</span><button class="chip add" onclick="BUY.stock=false;reBuy()">تغيير</button></div>`
          : `<input id="bDevQ" inputmode="numeric" placeholder="آخر أرقام التذكرة… مثلاً 12345" oninput="findDev(this.value)">
             <div id="bDevRes"></div>
             <div class="chips" style="margin-top:8px;"><button class="chip" onclick="BUY.stock=true;reBuy()">📦 مش لجهاز — للمخزن</button></div>`}
      </label>`;
  const g = BUY.part ? lastPriceTxt(BUY.part, BUY.sup) : '';
  return `${devBlock}
    <label class="f"><span>🔩 القطعة</span><input id="bPart" value="${esc(BUY.part)}" maxlength="120" oninput="BUY.part=this.value;bHint()" placeholder="مثال: شاشة A12 أصلي"></label>
    <div class="f2">
      <label class="f"><span>🔢 الكمية</span><input id="bQty" type="number" min="1" step="1" inputmode="numeric" value="${esc(BUY.qty)}" oninput="BUY.qty=this.value"></label>
      <label class="f"><span>💰 سعر القطعة الواحدة</span><input id="bPrice" inputmode="decimal" value="${esc(BUY.price)}" placeholder="${BUY.unk ? '⏳ مش معروف' : 'بالجنيه'}" oninput="BUY.price=this.value;BUY.unk=!String(this.value).trim();bUnk()"></label>
    </div>
    <div class="chips" style="margin:-4px 0 12px;"><button id="bUnkBtn" class="chip unk${BUY.unk ? ' on' : ''}" onclick="BUY.unk=true;BUY.price='';$('bPrice').value='';bUnk()">⏳ السعر لسه مش معروف</button></div>
    <div class="note-in" id="bHint" style="margin:-6px 2px 12px;">${g ? '💡 ' + g : ''}</div>
    <label class="f"><span>🏪 جبتها من مين؟ (بتتسجّل على حسابه)</span>
      <div class="chips">${sups.map(s => `<button class="chip${BUY.sup === s.id ? ' on' : ''}" onclick="BUY.sup='${s.id}';reBuy()">${esc(s.name)}</button>`).join('')}
        <button class="chip add" onclick="newSupplier(true)">➕ تاجر جديد</button></div></label>
    <label class="f"><span>📝 ملاحظة (اختياري)</span><input id="bNote" value="${esc(BUY.note)}" oninput="BUY.note=this.value" placeholder="مثال: الضمان أسبوع"></label>
    <button class="big" id="bGo" onclick="buyGo(false)" ${BUY.busy ? 'disabled' : ''}>${BUY.busy ? '⏳ …' : '✅ سجّل'}</button>
    <div class="note-in">🧾 لو مش عارف السعر، سيبه ⏳ — هيتملي لوحده لما المحاسب العام يدخّل فاتورة التاجر.</div>`;
}
function reBuy(){
  // نحفظ اللي اتكتب قبل ما نعيد الرسم
  ['bPart','bQty','bPrice','bNote'].forEach(id => { const e = $(id); if(e){ const k = ({ bPart:'part', bQty:'qty', bPrice:'price', bNote:'note' } as Record<string, string>)[id]; BUY[k] = e.value; } });
  setSheetBody(buyHtml());
}
function bUnk(){ const b = $('bUnkBtn'); if(b) b.classList.toggle('on', BUY.unk); }
function bHint(){ const h = $('bHint'); if(h){ const g = BUY.part ? lastPriceTxt(BUY.part, BUY.sup) : ''; h.innerHTML = g ? '💡 ' + g : ''; } }
let findT: any = 0;
function findDev(v: string){
  clearTimeout(findT);
  findT = setTimeout(async () => {
    const host = $('bDevRes'); if(!host) return;
    if(String(v).replace(/\D/g, '').length < 3){ host.innerHTML = ''; return; }
    try{
      const rows = await rpc('parts_find_device', { p_q: v });
      BUY.found = rows || [];
      host.innerHTML = BUY.found.length ? BUY.found.map((r, i) => `<button class="pick" onclick="pickDev(${i})"><b>${esc(r.label)}</b><br><span style="color:var(--muted);font-size:12px;">${esc(r.issue || '')}${r.tech ? ' · 🔧 ' + esc(r.tech) : ''}</span></button>`).join('')
        : '<div class="note-in">مفيش جهاز شغّال بالرقم ده</div>';
    }catch(e: any){ host.innerHTML = `<div class="note-in" style="color:var(--red)">${esc(errMsg(e))}</div>`; }
  }, 350);
}
function pickDev(i: number){ const r = BUY.found[i]; if(!r) return; BUY.dev = { id:r.id, label:r.label }; reBuy(); }

async function buyGo(force?: boolean): Promise<void> {
  if(BUY.busy) return;
  const part = String(BUY.part || '').trim();
  const qty = num(BUY.qty) || 1;
  const price = BUY.unk ? null : num(BUY.price);
  if(part.length < 2){ toast('اكتب اسم القطعة', true); return; }
  if(!BUY.sup){ toast('🏪 اختار التاجر اللي جبت منه', true); return; }
  if(!BUY.unk && (price == null || price < 0)){ toast('اكتب السعر صح — أو دوس «⏳ مش معروف»', true); return; }
  if(!BUY.req && !BUY.dev && !BUY.stock){ toast('📱 اختار الجهاز — أو «للمخزن»', true); return; }
  BUY.busy = true; reBuy();
  try{
    const r = await rpc('part_buy', { p_request_id: BUY.req ? BUY.req.id : null, p_device_id: BUY.dev ? BUY.dev.id : null,
      p_part: part, p_qty: qty, p_supplier_id: BUY.sup, p_price: price, p_note: BUY.note || '', p_force: !!force });
    closeSheet();
    toast('✅ اتسجّلت على حساب ' + (supById(BUY.sup) || {} as PtSup).name + (price == null ? ' — ⏳ من غير سعر' : ''));
    if(r && r.warn) setTimeout(() => toast('💳 ' + r.warn, true), 2900);
    load();
  }catch(e: any){
    BUY.busy = false;
    const m = errMsg(e);
    // 🔴 تكرار: «DUP|مين|القطعة|إمتى»
    if(/^DUP\|/.test(m)){
      const [, who, what, when] = m.split('|');
      if(confirm('🔴 استنى!\n' + who + ' جاب «' + what + '» لنفس الجهاز ده (' + when + ').\n\nمتأكد إنها قطعة تانية محتاجينها؟\n(لو سجّلتها، مدير الإنتاج هيقرر: تفضل · ترجع للتاجر · تدخل المخزن)')){
        BUY.busy = false; return buyGo(true);
      }
      reBuy(); return;
    }
    reBuy(); toast(m, true);
  }
}

// ---------- 🏪 تاجر جديد / تعديل ----------
async function newSupplier(fromBuy: boolean){
  const name = (prompt('🏪 اسم التاجر الجديد') || '').trim();
  if(!name) return;
  const cyc = prompt('🧾 بيعمل فاتورة إزاي؟\n1 = كل يوم\n2 = كل أسبوع', '2');
  if(cyc === null) return;
  let dow = null;
  if(cyc.trim() !== '1'){
    const d = prompt('📅 فاتورته الأسبوعية يوم إيه؟\n' + DOW.map((x, i) => (i + 1) + ' = ' + x).join('\n'), '5');
    if(d === null) return;
    dow = Math.min(7, Math.max(1, parseInt(d) || 5)) - 1;
  }
  try{
    const s = await rpc('supplier_save', { p_id:null, p_name:name, p_cycle: cyc.trim() === '1' ? 'daily' : 'weekly', p_dow:dow,
      p_limit:null, p_phone:'', p_note:'', p_active:true });
    toast('🏪 اتضاف «' + s.name + '» — وبقى في خانات الفنيين كمان');
    await load();
    if(fromBuy){ BUY.sup = s.id; reBuy(); }
  }catch(e: any){ toast(errMsg(e), true); }
}
function editSupplier(id: string){
  const s = supById(id); if(!s) return;
  sheet('✏️ ' + s.name, `
    <label class="f"><span>🏪 الاسم</span><input id="sName" value="${esc(s.name)}" maxlength="40"></label>
    <label class="f"><span>🧾 الفاتورة</span><select id="sCyc">
      <option value="daily"${s.cycle === 'daily' ? ' selected' : ''}>كل يوم</option>
      <option value="weekly"${s.cycle === 'weekly' ? ' selected' : ''}>كل أسبوع</option>
      <option value="none"${s.cycle === 'none' ? ' selected' : ''}>من غير ميعاد</option></select></label>
    <label class="f"><span>📅 يوم الفاتورة الأسبوعية</span><select id="sDow"><option value="">—</option>
      ${DOW.map((x, i) => `<option value="${i}"${Number(s.inv_dow) === i && s.inv_dow != null ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
    ${isBoss() ? `<label class="f"><span>💳 أقصى مبلغ ينفع يبقى عليه (فاضي = من غير حد)</span><input id="sLim" inputmode="decimal" value="${s.credit_limit == null ? '' : esc(s.credit_limit)}"></label>` : ''}
    <label class="f"><span>📞 التليفون</span><input id="sPh" value="${esc(s.phone || '')}" dir="ltr"></label>
    <label class="f"><span>📝 ملاحظة</span><input id="sNote" value="${esc(s.note || '')}"></label>
    <label class="f" style="display:flex;align-items:center;gap:8px;"><input id="sAct" type="checkbox" style="width:auto;"${s.active ? ' checked' : ''}> <span style="margin:0;">شغّال (بيظهر في الاختيارات)</span></label>
    <button class="big" onclick="saveSupplier('${s.id}')">💾 حفظ</button>`);
}
async function saveSupplier(id: string){
  const s = supById(id);
  const v: (k: string) => string = k => ($(k) || {}).value || '';
  try{
    await rpc('supplier_save', { p_id:id, p_name:v('sName'), p_cycle:v('sCyc'), p_dow: v('sDow') === '' ? null : Number(v('sDow')),
      p_limit: isBoss() ? num(v('sLim')) : (s ? s.credit_limit : null), p_phone:v('sPh'), p_note:v('sNote'), p_active: $('sAct').checked });
    closeSheet(); toast('💾 اتحفظ'); load();
  }catch(e: any){ toast(errMsg(e), true); }
}

// ---------- ⏳ من غير سعر ----------
function buyRow(p: PtBuy, opts?: { noSup?: boolean; noEdit?: boolean }): string {
  opts = opts || {};
  const where = p.device_id ? '📱 ' + esc(p.device_label) : '📦 للمخزن';
  const tags: string[] = [];
  if(p.status === 'bad') tags.push('<span class="pill red">🔧 بايظة — ترجع</span>');
  if(p.status === 'returned') tags.push('<span class="pill">↩️ رجعت</span>' + docPill(p.return_no));
  if(p.dup_state === 'open') tags.push('<span class="pill red">🔴 تكرار</span>');
  if(p.dest === 'stock' && p.device_id) tags.push('<span class="pill violet">📦 دخلت المخزن</span>');
  if(p.invoice_id) tags.push('<span class="pill green">🧾 في فاتورة</span>');
  return `<div class="row${p.status === 'returned' ? ' strike' : ''}">
    <div class="m"><div class="t">${esc(p.part)}${Number(p.qty) > 1 ? ' ×' + fmt(p.qty) : ''} ${tags.join(' ')}</div>
      <div class="s">${opts.noSup ? '' : '🏪 ' + esc(p.supplier) + ' · '}${where} · ${esc(p.bought_by_name)} · ${ago(p.bought_at)}</div>
      ${p.note ? `<div class="s">📝 ${esc(p.note)}</div>` : ''}${p.bad_reason && p.status !== 'active' ? `<div class="s" style="color:var(--red)">🔧 ${esc(p.bad_reason)}</div>` : ''}</div>
    <div style="text-align:end;">${money() ? `<div>${priceTxt(p)}</div>` : ''}
      ${money() && p.status !== 'returned' && !opts.noEdit ? `<button class="btn sm" style="margin-top:5px;" onclick="editBuy('${p.id}')">✏️</button>` : ''}</div>
  </div>`;
}
function viewUnk(): string {
  const list = unpriced();
  if(!list.length) return '<div class="empty">✅ كل القطع متسعّرة — مفيش حاجة مستنية فاتورة</div>';
  const by: Record<string, PtBuy[]> = {};
  list.forEach(p => { (by[p.supplier_id] = by[p.supplier_id] || []).push(p); });
  return `<div class="hint">${isBoss()
      ? 'القطع دي اتجابت ولسه سعرها مش معروف. لما فاتورة التاجر توصل دوس «🧾 دخّل الفاتورة» — الأسعار هتنزل عليها لوحدها.'
      : 'القطع دي اتجابت ولسه سعرها مش معروف. الأسعار هتنزل لوحدها لما المحاسب العام يراجع فاتورة التاجر ويدخّلها — فكّر التاجر يبعتها.'}</div>` +
    Object.keys(by).map(sid => {
      const s = supById(sid) || { name:'؟' } as PtSup;
      const due = invoiceDue(s);
      return `<div class="card">
        <div class="c-top"><div class="c-t">🏪 ${esc(s.name)}</div><span class="pill wait">⏳ ${by[sid].length}</span></div>
        <div class="c-s">${s.cycle === 'daily' ? 'فاتورة يومية' : s.cycle === 'weekly' ? 'فاتورة أسبوعية' + (s.inv_dow != null ? ' — يوم ' + DOW[s.inv_dow] : '') : ''}${due ? ' · <b>' + due.txt + '</b>' : ''}</div>
        <div style="margin-top:6px;">${by[sid].map(p => buyRow(p, { noSup:true })).join('')}</div>
        ${isBoss() ? `<div class="acts"><button class="btn pri" onclick="openInvoice('${sid}')">🧾 دخّل فاتورة ${esc(s.name)}</button></div>` : ''}
      </div>`;
    }).join('');
}

// ---------- ✏️ تعديل شراء ----------
function editBuy(id: string){
  const p = P().find(x => x.id === id); if(!p) return;
  const sups = activeSups();
  // 🔒 (ملف 104) القطعة دخلت فاتورة → السعر والكمية للمحاسب العام بس
  const lockMoney = !!p.invoice_id && !isBoss();
  sheet('✏️ ' + p.part, `
    ${p.invoice_id ? (lockMoney
        ? '<div class="warnbox">🔒 القطعة دي دخلت فاتورة التاجر — السعر والكمية بيتعدّلوا من المحاسب العام بس. تقدر تصلّح الاسم.</div>'
        : '<div class="warnbox">🧾 القطعة دي دخلت فاتورة — أي تغيير في السعر بيتسجّل (ومبيعدّلش رقم الفاتورة نفسها).</div>') : ''}
    <label class="f"><span>🔩 القطعة</span><input id="eName" value="${esc(p.part)}"></label>
    <div class="f2">
      <label class="f"><span>🔢 الكمية</span><input id="eQty" type="number" min="1" inputmode="numeric" value="${esc(p.qty)}" ${lockMoney ? 'disabled' : ''}></label>
      <label class="f"><span>💰 سعر الواحدة (فاضي = ⏳)</span><input id="ePrice" inputmode="decimal" value="${p.unit_price == null ? '' : esc(p.unit_price)}" ${lockMoney ? 'disabled' : ''}></label>
    </div>
    <label class="f"><span>🏪 التاجر</span><select id="eSup" ${p.invoice_id ? 'disabled' : ''}>${sups.concat(sups.some(s => s.id === p.supplier_id) ? [] : [supById(p.supplier_id) || { id:p.supplier_id, name:p.supplier } as PtSup])
      .map(s => `<option value="${s.id}"${s.id === p.supplier_id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
    <label class="f"><span>📝 سبب التعديل ${p.unit_price != null && !lockMoney ? '(إجباري لو السعر اتغيّر)' : ''}</span><input id="eWhy" placeholder="مثال: التاجر قال السعر غلط"></label>
    <button class="big" onclick="saveBuy('${p.id}')">💾 حفظ</button>
    <div class="acts" style="margin-top:14px;">
      ${p.status === 'active' ? `<button class="btn bad" onclick="markBuy('${p.id}','bad')">🔧 القطعة بايظة</button>` : ''}
      ${p.status !== 'returned' ? `<button class="btn" onclick="markBuy('${p.id}','returned')">↩️ رجّعتها للتاجر</button>` : ''}
      ${p.status === 'bad' ? `<button class="btn ghost" onclick="markBuy('${p.id}','unbad')">↩️ مش بايظة (غلط)</button>` : ''}
    </div>
    ${priceLogHtml(p.id)}`);
}
function priceLogHtml(id: string): string {
  const l = ((B && B.price_log) || []).filter(x => x.purchase_id === id);
  if(!l.length) return '';
  return `<div class="sec-h" style="margin-top:18px;">📜 تغييرات السعر<span class="rule"></span></div>` + l.map(x =>
    `<div class="row"><div class="m"><div class="t">${x.old_price == null ? '⏳' : fmt(x.old_price)} ← ${x.new_price == null ? '⏳' : fmt(x.new_price)}</div>
      <div class="s">${esc(x.by_name)} · ${dt(x.at)}${x.reason ? ' · ' + esc(x.reason) : ''}</div></div></div>`).join('');
}
async function saveBuy(id: string){
  const pr = String($('ePrice').value || '').trim();
  try{
    await rpc('part_purchase_edit', { p_id:id, p_part:$('eName').value, p_qty:num($('eQty').value), p_supplier_id:$('eSup').value,
      p_price: pr === '' ? null : num(pr), p_reason:$('eWhy').value });
    closeSheet(); toast('💾 اتحفظ'); load();
  }catch(e: any){ toast(errMsg(e), true); }
}
async function markBuy(id: string, a: string){
  let why: string | null = '';
  if(a === 'bad'){ why = prompt('🔧 إيه اللي فيها؟'); if(why === null) return; }
  if(a === 'returned'){ why = prompt('↩️ رجّعتها للتاجر — هتنزل من حسابه. ملاحظة (اختياري):', ''); if(why === null) return; }
  if(a === 'unreturn'){ why = prompt('↩️ ليه الترجيع اتلغى؟'); if(why === null) return; }
  try{ const r = await rpc('part_purchase_mark', { p_id:id, p_action:a, p_reason:why || '' }); closeSheet();
    toast(({ bad:'🔧 اتعلّمت بايظة — في «↩️ ترجيع»',
            returned:'↩️ رجعت للتاجر ونزلت من حسابه' + (r && r.return_no ? ' — مرتجع ' + r.return_no : ''),
            unbad:'✅ رجعت سليمة', unreturn:'↩️ الترجيع اتلغى' } as Record<string, string>)[a]); load();
  }catch(e: any){ toast(errMsg(e), true); }
}

// ---------- ↩️ ترجيع ----------
function viewRet(): string {
  const bad = badOnes();
  const done = P().filter(p => p.status === 'returned').slice(0, 20);
  return `<div class="hint">قطع الفني قال إنها بايظة (أو قرار التكرار قال ترجع). رجّعها للتاجر ودوس «↩️ رجّعتها» — هتنزل من حسابه وتاخد رقم مرتجع.</div>
    <div class="sec-h">🔧 لازم ترجع <span class="c">${bad.length}</span><span class="rule"></span></div>
    ${bad.length ? bad.map(p => `<div class="card new">${buyRow(p, { noEdit:true })}<div class="acts">
        <button class="btn pri" onclick="markBuy('${p.id}','returned')">↩️ رجّعتها للتاجر</button>
        <button class="btn ghost sm" onclick="markBuy('${p.id}','unbad')">مش بايظة</button></div></div>`).join('') : '<div class="empty">✨ مفيش قطع مستنية ترجع</div>'}
    ${done.length ? `<div class="sec-h">↩️ رجعت قريب<span class="rule"></span></div><div class="card">${done.map(p => buyRow(p, { noEdit:true }) + (isBoss() ? `<div class="acts" style="margin:0 0 6px;"><button class="btn ghost sm" onclick="markBuy('${p.id}','unreturn')">↩️ لغي الترجيع (غلط)</button></div>` : '')).join('')}</div>` : ''}`;
}

// ---------- 🛒 كل القطع ----------
function viewBuys(): string {
  const list = P().filter(p => !p.from_invoice).slice(0, 120);
  return `<div class="hint">كل القطع اللي اتجابت آخر ٤٥ يوم (واللي لسه مستنية فاتورة مهما كانت قديمة).</div>
    ${list.length ? `<div class="card">${list.map(p => buyRow(p)).join('')}</div>` : '<div class="empty">لسه مفيش قطع اتجابت</div>'}`;
}

// ---------- 🏪 التجار ----------
function viewSup(): string {
  const sups = B!.suppliers || [];
  const total = sups.reduce((t, s) => t + (Number(s.balance) || 0), 0);
  return `<div class="card" style="--edge:var(--accent);"><div class="c-top"><div class="c-t">💰 عليك للتجار كلهم</div><div class="money" style="font-size:19px;">${fmt(total)} ج.م</div></div>
      <div class="c-s">ده المتسعّر بس. القطع ⏳ اللي لسه من غير سعر مش داخلة في الرقم.</div></div>
    <div class="acts" style="margin:0 0 12px;"><button class="btn" onclick="newSupplier(false)">➕ تاجر جديد</button></div>
    ${sups.map(s => {
      const due = invoiceDue(s);
      const over = s.credit_limit != null && Number(s.balance) > Number(s.credit_limit);
      return `<div class="card${s.active ? '' : ' closed'}" style="${over ? '--edge:var(--red);' : ''}">
        <div class="c-top"><div class="c-t">🏪 ${esc(s.name)}${s.active ? '' : ' <span class="pill">متوقف</span>'}</div>
          <div class="money" style="font-size:17px;">${fmt(s.balance)} <small>ج.م</small></div></div>
        <div class="c-s">${s.cycle === 'daily' ? '🧾 فاتورة كل يوم' : s.cycle === 'weekly' ? '🧾 فاتورة كل أسبوع' + (s.inv_dow != null ? ' (' + DOW[s.inv_dow] + ')' : '') : '🧾 من غير ميعاد'}
          ${s.unpriced_n ? ` · <span class="unk">⏳ ${s.unpriced_n} من غير سعر</span>` : ''}${s.pending_n ? ` · ${s.pending_n} مستنية فاتورة` : ''}
          ${s.last_invoice ? ' · آخر فاتورة ' + dOnly(s.last_invoice) : ''}${s.credit_limit != null ? ' · الحد ' + fmt(s.credit_limit) : ''}</div>
        ${due ? `<div class="c-s" style="color:${due.late ? 'var(--red)' : 'var(--blue)'};font-weight:800;">${due.txt}</div>` : ''}
        ${over ? `<div class="c-s" style="color:var(--red);font-weight:800;">💳 عدّى الحد</div>` : ''}
        <div class="acts">
          <button class="btn" onclick="openStatement('${s.id}')">📒 كشف الحساب</button>
          ${isBoss() && s.pending_n ? `<button class="btn pri" onclick="openInvoice('${s.id}')">🧾 فاتورة</button>` : ''}
          ${isBoss() ? `<button class="btn ok" onclick="payOpen('${s.id}')">💸 دفعة</button>` : ''}
          <button class="btn ghost sm" onclick="editSupplier('${s.id}')">✏️</button>
        </div></div>`;
    }).join('')}`;
}

// 📒 كشف الحساب: كل قطعة (+) وكل دفعة (−) والرصيد بعد كل سطر
async function openStatement(id: string){
  const s = supById(id);
  sheet('📒 كشف حساب ' + (s ? s.name : ''), '<div class="empty">⏳ …</div>');
  try{
    const d = await rpc('supplier_statement', { p_supplier_id:id });
    const rows: any[] = [];
    ((d.purchases || []) as PtBuy[]).forEach(p => rows.push({ at:p.bought_at, kind:'p', p }));
    ((d.payments || []) as any[]).forEach(y => rows.push({ at:y.paid_at, kind:'y', y }));
    rows.sort((a, b) => (new Date(a.at) as any) - (new Date(b.at) as any));
    let bal = 0, unk = 0;
    const html = rows.map(r => {
      if(r.kind === 'p'){
        const p = r.p;
        const amt = p.status === 'returned' || p.unit_price == null ? 0 : Number(p.qty) * Number(p.unit_price);
        if(p.unit_price == null && p.status !== 'returned') unk++;
        bal += amt;
        return `<div class="row${p.status === 'returned' ? ' strike' : ''}"><div class="m"><div class="t">${esc(p.part)}${Number(p.qty) > 1 ? ' ×' + fmt(p.qty) : ''}</div>
          <div class="s">${dt(p.bought_at)} · ${p.device_label ? esc(p.device_label) : '📦'}${p.status === 'returned' ? ' · ↩️ رجعت' + docPill(p.return_no) : ''}${p.invoice_id ? ' · 🧾' : ''}</div></div>
          <div style="text-align:end;">${p.unit_price == null ? '<span class="unk">⏳</span>' : '<span class="money">+' + fmt(Number(p.qty) * Number(p.unit_price)) + '</span>'}
          <div class="s">${fmt(bal)}</div></div></div>`;
      }
      const y = r.y;
      if(!y.voided) bal -= Number(y.amount);
      return `<div class="row${y.voided ? ' strike' : ''}"><div class="m"><div class="t">💸 دفعة${docPill(y.erp_no)}${y.note ? ' — ' + esc(y.note) : ''}</div>
        <div class="s">${dt(y.paid_at)} · ${esc(y.by_name)}${y.voided ? ' · اتلغت: ' + esc(y.void_reason) : ''}</div></div>
        <div style="text-align:end;"><span class="money neg">−${fmt(y.amount)}</span><div class="s">${fmt(bal)}</div>
        ${isBoss() && !y.voided ? `<button class="btn ghost sm" onclick="payVoid('${y.id}','${id}')">لغي</button>` : ''}</div></div>`;
    }).reverse().join('');
    setSheetBody(`<div class="card" style="--edge:var(--accent);"><div class="c-top"><div class="c-t">الباقي عليك له</div><div class="money" style="font-size:20px;">${fmt(d.balance)} ج.م</div></div>
        ${unk ? `<div class="c-s unk">+ ${unk} قطعة لسه من غير سعر</div>` : ''}</div>
      ${isBoss() ? `<button class="big" style="margin-bottom:12px;" onclick="payOpen('${id}')">💸 سجّل دفعة</button>` : ''}
      <div class="card">${html || '<div class="empty">لسه مفيش حركة</div>'}</div>`);
  }catch(e: any){ setSheetBody(`<div class="err">${esc(errMsg(e))}</div>`); }
}

// 💸 الدفعة — المحاسب العام بس (والسيرفر بيرفض أي حد تاني)
function payOpen(id: string){
  const s = supById(id); if(!s) return;
  sheet('💸 دفعة لـ ' + s.name, `
    <div class="card"><div class="c-top"><div class="c-t">عليك له دلوقتي</div><div class="money">${fmt(s.balance)} ج.م</div></div>
      ${s.unpriced_n ? `<div class="c-s unk">+ ${s.unpriced_n} قطعة لسه من غير سعر</div>` : ''}</div>
    <label class="f"><span>💵 المبلغ</span><input id="payAmt" inputmode="decimal" placeholder="بالجنيه"></label>
    <div class="chips" style="margin:-4px 0 12px;"><button class="chip" onclick="$('payAmt').value='${Math.max(0, Math.round(Number(s.balance) || 0))}'">الحساب كله</button></div>
    <label class="f"><span>📝 ملاحظة</span><input id="payNote" placeholder="مثال: حساب الأسبوع"></label>
    <div class="warnbox">🔒 المبلغ ده بيتخصم من «المفروض في الخزنة» عند أمين الخزنة في التقفيل الجاي — وبياخد رقم سند صرف.</div>
    <button class="big" onclick="payGo('${id}')">💸 سجّل الدفعة</button>`);
}
async function payGo(id: string){
  const a = num($('payAmt').value);
  if(!(a! > 0)){ toast('اكتب المبلغ', true); return; }
  const s = supById(id);
  if(!confirm('💸 دفعة ' + fmt(a) + ' ج.م لـ ' + (s ? s.name : '') + ' من الخزنة؟')) return;
  try{ const y = await rpc('supplier_pay', { p_supplier_id:id, p_amount:a, p_note:$('payNote').value || '' });
    closeSheet(); toast('💸 الدفعة اتسجّلت' + (y && y.erp_no ? ' — سند صرف ' + y.erp_no : '')); load(); }
  catch(e: any){ toast(errMsg(e), true); }
}
async function payVoid(pid: string, sid: string){
  const r = prompt('↩️ ليه الدفعة دي بتتلغي؟ (هتفضل ظاهرة مشطوبة)');
  if(r === null) return;
  try{ await rpc('supplier_pay_void', { p_id:pid, p_reason:r }); toast('↩️ الدفعة اتلغت'); await load(); openStatement(sid); }
  catch(e: any){ toast(errMsg(e), true); }
}

// ---------- ⚖️ المطابقة ----------
function viewMatch(): string {
  const all = (B!.match || []);
  const q = matchQueue();
  const ok = all.filter(m => !q.includes(m)).slice(0, 15);
  const card: (m: PtMatch) => string = m => {
    const dups = (m.parts || []).filter(x => x.dup_state === 'open');
    const st = m.stale ? ['⚠️ الكلام اتغيّر بعد القرار','wait'] : m.decision === 'match' ? ['✅ مطابق','green']
             : m.decision === 'mismatch' ? ['🔴 مش مطابق','red'] : ['🟡 محتاج مراجعة','wait'];
    const tc = String(m.tech_comment || '').trim();
    return `<div class="card ${m.decision === 'mismatch' && !m.stale ? 'new' : m.decision === 'match' && !m.stale ? 'bought' : 'going'}">
      <div class="c-top"><div class="c-t">📱 ${esc(m.label)}</div><span class="pill ${st[1]}">${st[0]}</span></div>
      <div class="c-s">🔧 ${esc(m.tech || '—')}</div>
      <div class="vs">
        <div><span class="k">🔧 الفني كتب</span>${tc ? esc(tc) : '<span style="color:var(--faint)">لسه ماكتبش</span>'}</div>
        <div><span class="k">🛵 المسؤول جاب</span>${(m.parts || []).map(x => esc(x.part) + (Number(x.qty) > 1 ? ' ×' + fmt(x.qty) : '') + ` <span style="color:var(--muted)">(${esc(x.supplier)} · ${esc(x.by)})</span>` + (x.dup_state === 'open' ? ' 🔴' : '') + (x.dest === 'stock' ? ' 📦' : '')).join('<br>')}</div>
      </div>
      ${m.decision ? `<div class="c-s">قرار ${esc(m.decision_by)} · ${dt(m.decision_at)}${m.decision_note ? ' — ' + esc(m.decision_note) : ''}</div>` : ''}
      ${dups.map(x => `<div class="warnbox" style="margin:10px 0 0;">🔴 «${esc(x.part)}» اتجابت مرتين للجهاز ده — نعمل فيها إيه؟
        <div class="acts"><button class="btn sm" onclick="dupDo('${x.id}','keep')">✅ الاتنين صح</button>
        <button class="btn sm" onclick="dupDo('${x.id}','return')">↩️ ترجع للتاجر</button>
        <button class="btn sm" onclick="dupDo('${x.id}','stock')">📦 تدخل المخزن</button></div></div>`).join('')}
      <div class="acts"><button class="btn ok" onclick="matchDo('${m.device_id}','match')">✅ مطابق</button>
        <button class="btn bad" onclick="matchDo('${m.device_id}','mismatch')">🔴 مش مطابق</button></div>
    </div>`;
  };
  return `<div class="hint">قارن كلام الفني بالقطع اللي المسؤول جابها لنفس الجهاز. لو أي واحد فيهم اتغيّر بعد قرارك، الجهاز بيرجع هنا تاني.</div>
    <div class="sec-h">🟡 محتاجين قرار <span class="c">${q.length}</span><span class="rule"></span></div>
    ${q.length ? q.map(card).join('') : '<div class="empty">✨ كله متراجع</div>'}
    ${ok.length ? `<div class="sec-h">✅ اتراجعوا<span class="rule"></span></div>${ok.map(card).join('')}` : ''}`;
}
async function matchDo(dev: string, d: string){
  let note: string | null = '';
  if(d === 'mismatch'){ note = prompt('🔴 إيه اللي مش مطابق؟ (هيوصل للمحاسب العام)'); if(note === null) return; }
  try{ await rpc('part_match_set', { p_device_id:dev, p_decision:d, p_note:note }); toast(d === 'match' ? '✅ مطابق' : '🔴 اتسجّل مش مطابق'); load(); }
  catch(e: any){ toast(errMsg(e), true); }
}
async function dupDo(id: string, d: string){
  try{ await rpc('part_dup_decide', { p_id:id, p_decision:d });
    toast(({ keep:'✅ الاتنين اتسجّلوا صح', return:'↩️ هتظهر للمسؤول في «ترجيع»', stock:'📦 هتدخل المخزن مع الفاتورة' } as Record<string, string>)[d]); load(); }
  catch(e: any){ toast(errMsg(e), true); }
}

// ---------- ⚠️ تنبيهات ----------
function viewAlert(): string {
  const a = alerts();
  const mism = isBoss() ? (B!.match || []).filter(m => m.decision === 'mismatch' && !m.stale) : [];
  return `${a.length ? a.map(x => `<div class="card new"><div class="c-t" style="font-size:14px;">${esc(x.txt)}</div>
      <div class="acts">${x.k === 'jump' ? `<button class="btn sm" onclick="editBuy('${x.p!.id}')">✏️ افتح القطعة</button><button class="btn ok sm" onclick="flagSeen('${x.p!.id}')">✓ شفته</button>` : ''}
      ${x.k === 'inv' && isBoss() ? `<button class="btn pri sm" onclick="openInvoice('${x.s!.id}')">🧾 دخّل الفاتورة</button>` : ''}
      ${x.k === 'limit' ? `<button class="btn sm" onclick="openStatement('${x.s!.id}')">📒 كشف الحساب</button>` : ''}
      ${x.k === 'old' ? `<button class="btn sm" onclick="go('unk')">⏳ افتحهم</button>` : ''}</div></div>`).join('') : '<div class="empty">✨ مفيش تنبيهات</div>'}
    ${mism.length ? `<div class="sec-h">🔴 أجهزة مش مطابقة<span class="rule"></span></div>${mism.map(m => `<div class="card new"><div class="c-t">📱 ${esc(m.label)}</div><div class="c-s">${esc(m.decision_note)} — ${esc(m.decision_by)}</div></div>`).join('')}` : ''}`;
}
async function flagSeen(id: string){ try{ await rpc('part_flag_clear', { p_id:id }); toast('✓ تمام'); load(); }catch(e: any){ toast(errMsg(e), true); } }

// ============================================================
// 🧾 الفواتير — 🔒 (ملف 104) المحاسب العام بس
// ============================================================
function viewInv(): string {
  const list = (B!.invoices || []);
  const sups = (B!.suppliers || []).filter(s => s.pending_n);
  return `<div class="hint">صوّر فاتورة التاجر (أو اكتبها بإيدك) بعد ما تراجعها معاه — السيستم بيطابق كل سطر مع القطع اللي اتجابت منه وبينزّل السعر عليها، والقطع بتدخل المخزن مربوطة بأجهزتها، والفاتورة بتاخد رقم 🧾 PI.</div>
    ${sups.length ? `<div class="sec-h">⏳ تجار مستنيين فاتورة<span class="rule"></span></div>
      <div class="chips" style="margin-bottom:6px;">${sups.map(s => `<button class="chip" onclick="openInvoice('${s.id}')">🏪 ${esc(s.name)} <b style="color:var(--wait)">${s.pending_n}</b></button>`).join('')}</div>` : ''}
    <div class="sec-h">🧾 آخر الفواتير <span class="c">${list.length}</span><span class="rule"></span></div>
    ${list.length ? list.map(i => {
      const ps = P().filter(p => p.invoice_id === i.id);
      return `<div class="card"><div class="c-top"><div class="c-t">🏪 ${esc(i.supplier_name)}${i.invoice_number ? ' <span style="color:var(--muted);font-size:13px;">#' + esc(i.invoice_number) + '</span>' : ''}${docPill(i.erp_no)}</div>
        <div class="money">${fmt(i.grand_total)} ج.م</div></div>
        <div class="c-s">${dOnly(i.invoice_date)} · دخّلها ${esc(i.created_by_name || '')} · ${ps.length} قطعة</div>
        ${ps.length ? `<div style="margin-top:6px;">${ps.map(p => buyRow(p, { noSup:true, noEdit:true })).join('')}</div>` : ''}
        ${i.image_path ? `<div class="acts"><button class="btn sm" onclick="showInvImg('${esc(i.image_path)}')">🖼️ صورة الفاتورة</button></div>` : ''}</div>`;
    }).join('') : '<div class="empty">لسه مفيش فواتير اتدخّلت من هنا</div>'}`;
}
async function showInvImg(path: string){
  try{
    const { data, error } = await sb.storage.from('invoices').createSignedUrl(path, 600);
    if(error) throw error;
    window.open(data.signedUrl, '_blank');
  }catch(e: any){ toast('مقدرناش نفتح الصورة: ' + errMsg(e), true); }
}

// ---------- 🧾 فاتورة جديدة ----------
const INV: PtInv = { sid:'', date:'', no:'', total:'', adjust:false, lines:[], file:null, url:'', mime:'', model:'manual', raw:null, busy:false, reading:false, pickFor:null, uid:0 };
function openInvoice(sid: string | null){
  // 🔒 (ملف 104) الفاتورة بتتراجع وتتقفل مع التاجر عند المحاسب العام بس
  if(!isBoss()){ toast('🧾 فواتير التجار بقت عند المحاسب العام — هو اللي بيراجعها مع التاجر ويدخّلها', true); return; }
  if(INV.url){ try{ URL.revokeObjectURL(INV.url); }catch(e: any){} }
  Object.assign(INV, { sid: sid || '', date: cairoDay(), no:'', total:'', adjust:false, lines:[], file:null, url:'', mime:'',
    model:'manual', raw:null, busy:false, reading:false, pickFor:null });
  sheet('🧾 فاتورة جديدة', invHtml());
}
function invPending(): PtBuy[] {
  if(!INV.sid) return [];
  return pendingOf(INV.sid).sort((a, b) => (new Date(a.bought_at) as any) - (new Date(b.bought_at) as any));
}
// القطعة دي من فترة الفاتورة؟ (يومي: نفس اليوم · أسبوعي: آخر ٧ أيام قبل تاريخها)
function inPeriod(p: PtBuy): boolean {
  const s = supById(INV.sid); if(!s || !INV.date) return true;
  const d = cairoDay(p.bought_at);
  if(s.cycle === 'daily') return d === INV.date;
  const from = new Date((new Date(INV.date + 'T12:00:00') as any) - 7 * 86400000).toISOString().slice(0, 10);
  return d > from && d <= INV.date;
}
// 🔤 قد إيه الاسمين شبه بعض (من ٠ لـ ١)
function sim(a: string, b: string): number {
  const A = norm(a), Bn = norm(b);
  if(!A || !Bn) return 0;
  if(A === Bn) return 1;
  if(A.includes(Bn) || Bn.includes(A)) return 0.85;
  const ta = new Set(A.split(' ')), tb = new Set(Bn.split(' '));
  let inter = 0; ta.forEach(x => { if(tb.has(x)) inter++; });
  return inter / Math.max(ta.size, tb.size);
}
// 🤝 المطابقة الأوتوماتيك: كل سطر ياخد القطع ⏳ اللي اسمها شبهه لحد ما يكمّل كميته
function autoMatch(){
  const pool = invPending();
  const used = new Set();
  INV.lines.forEach(l => l.purchases.forEach(id => used.add(id)));
  INV.lines.forEach(l => {
    if(l.manual) return;
    let have = l.purchases.reduce((t, id) => t + (Number((pool.find(p => p.id === id) || {}).qty) || 0), 0);
    const want = num(l.qty) || 1;
    const cands = pool.filter(p => !used.has(p.id)).map(p => ({ p, s: sim(l.name, p.part) + (inPeriod(p) ? 0.05 : 0) }))
      .filter(x => x.s >= 0.5).sort((a, b) => b.s - a.s || ((new Date(a.p.bought_at) as any) - (new Date(b.p.bought_at) as any)));
    for(const c of cands){
      if(have + Number(c.p.qty) > want) continue;
      l.purchases.push(c.p.id); used.add(c.p.id); have += Number(c.p.qty);
      if(have >= want) break;
    }
  });
}
function lineState(l: PtLine): string {
  const pool = invPending();
  const ps = l.purchases.map(id => pool.find(p => p.id === id)).filter(Boolean) as PtBuy[];
  const have = ps.reduce((t, p) => t + Number(p.qty), 0);
  const want = num(l.qty) || 1;
  const low = ps.some(p => sim(l.name, p.part) < 0.75);
  if(have === want && !low) return 'g';
  if(have > 0) return 'y';
  return 'r';
}
function lineTotal(l: PtLine): number { const q = num(l.qty) || 0, u = num(l.unit), t = num(l.total); return t != null ? t : (u != null ? q * u : 0); }
function invHtml(): string {
  const sups = (B!.suppliers || []).filter(s => s.active || s.id === INV.sid);
  const pool = invPending();
  const used = new Set(); INV.lines.forEach(l => l.purchases.forEach(id => used.add(id)));
  const left = pool.filter(p => !used.has(p.id));
  const sumL = INV.lines.reduce((t, l) => t + lineTotal(l), 0);
  const tot = num(INV.total);
  const diff = tot != null ? tot - sumL : 0;
  const needOk = INV.lines.filter(l => lineState(l) !== 'g' && !l.ok).length;
  const s = supById(INV.sid);
  if(INV.reading) return `<div class="empty">🤖 بنقرا الفاتورة… (من ١٠ لـ ٣٠ ثانية)</div>`;
  return `
    <label class="f"><span>🏪 التاجر</span><div class="chips">${sups.map(x => `<button class="chip${INV.sid === x.id ? ' on' : ''}" onclick="invSup('${x.id}')">${esc(x.name)}${x.pending_n ? ' <b style="color:var(--wait)">' + x.pending_n + '</b>' : ''}</button>`).join('')}</div></label>
    ${INV.sid ? `
    ${INV.url ? (/pdf/.test(INV.mime) ? `<div class="okbox">📄 ملف PDF متحمّل</div>` : `<img class="inv-img" src="${INV.url}" alt="">`) : ''}
    <div class="acts" style="margin:0 0 12px;">
      <button class="btn pri" onclick="$('invCam').click()">📷 صوّر الفاتورة</button>
      <button class="btn" onclick="$('invFile').click()">🖼️ من الجهاز</button>
    </div>
    <div class="f2">
      <label class="f"><span>📅 تاريخ الفاتورة</span><input type="date" value="${esc(INV.date)}" onchange="INV.date=this.value;reInv()"></label>
      <label class="f"><span>#️⃣ رقمها (لو فيه)</span><input value="${esc(INV.no)}" oninput="INV.no=this.value"></label>
    </div>
    <label class="f"><span>💰 إجمالي الفاتورة المكتوب</span><input inputmode="decimal" value="${esc(INV.total)}" oninput="INV.total=this.value;invLive()" placeholder="لو فاضي = مجموع السطور"></label>
    <div class="sec-h">📋 السطور <span class="c">${INV.lines.length}</span><span class="rule"></span></div>
    ${INV.lines.length ? '' : `<div class="hint">صوّر الفاتورة والسطور هتتكتب لوحدها — أو دوس «➕ سطر».</div>`}
    ${INV.lines.map((l, i) => lineHtml(l, i, pool)).join('')}
    <div class="acts" style="margin:0 0 10px;"><button class="btn" onclick="invAdd()">➕ سطر</button>
      ${left.length ? `<button class="btn ghost" onclick="invFill()">⚡ سطر لكل قطعة ⏳ فاضلة</button>` : ''}</div>
    <div id="invSum">${invSumHtml(sumL, tot, diff)}</div>
    ${left.length ? `<div class="sec-h">⏳ قطع من ${esc(s ? s.name : '')} لسه مش في الفاتورة <span class="c">${left.length}</span><span class="rule"></span></div>
      <div class="hint">دي هتفضل ⏳ وتتسأل عليها في الفاتورة الجاية.</div>
      <div class="card">${left.map(p => `<div class="row"><div class="m"><div class="t">${esc(p.part)}${Number(p.qty) > 1 ? ' ×' + fmt(p.qty) : ''}${inPeriod(p) ? '' : ' <span class="pill">أقدم</span>'}</div><div class="s">${p.device_id ? '📱 ' + esc(p.device_label) : '📦'} · ${dt(p.bought_at)} · ${esc(p.bought_by_name)}</div></div><div>${priceTxt(p)}</div></div>`).join('')}</div>` : ''}
    ${needOk ? `<div class="warnbox">🟡 فيه ${needOk} سطر محتاج تأكيد — دوس «✓ تمام» على كل واحد بعد ما تراجعه.</div>` : ''}
    <button class="big" onclick="invSave()" ${INV.busy || needOk || !INV.lines.length ? 'disabled' : ''}>${INV.busy ? '⏳ بنحفظ…' : '💾 احفظ الفاتورة'}</button>
    <div class="note-in">✅ متطابق · 🟡 محتاج تأكيد · 🔴 مالوش قطعة مسجّلة (هيدخل المخزن ويتسجّل على حساب التاجر)</div>
    ` : '<div class="hint">اختار التاجر الأول.</div>'}
    <input type="file" id="invCam" accept="image/*" capture="environment" style="display:none" onchange="invPick(this)">
    <input type="file" id="invFile" accept="image/*,application/pdf" style="display:none" onchange="invPick(this)">`;
}
function lineHtml(l: PtLine, i: number, pool: PtBuy[]): string {
  const st = lineState(l);
  const ps = l.purchases.map(id => pool.find(p => p.id === id)).filter(Boolean) as PtBuy[];
  const icon = st === 'g' ? '✅' : st === 'y' ? '🟡' : '🔴';
  const used = new Set(); INV.lines.forEach(x => x.purchases.forEach(id => used.add(id)));
  const cands = pool.filter(p => !used.has(p.id)).map(p => ({ p, s: sim(l.name, p.part) })).sort((a, b) => b.s - a.s);
  return `<div class="ln ${st}">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;"><b>${icon} ${i + 1}</b><span style="flex:1"></span>
      ${st !== 'g' ? `<button class="btn sm ${l.ok ? 'ok' : ''}" onclick="INV.lines[${i}].ok=!INV.lines[${i}].ok;reInv()">${l.ok ? '✓ اتأكد' : '✓ تمام'}</button>` : ''}
      <button class="btn ghost sm" onclick="INV.lines.splice(${i},1);reInv()">🗑</button></div>
    <div class="ln-lbl"><span>الصنف</span><span>كمية</span><span>الواحدة</span><span>الإجمالي</span></div>
    <div class="ln-grid">
      <input value="${esc(l.name)}" onchange="INV.lines[${i}].name=this.value;INV.lines[${i}].ok=false;reInv()">
      <input inputmode="decimal" value="${esc(l.qty)}" onchange="lnSet(${i},'qty',this.value)">
      <input inputmode="decimal" value="${l.unit == null ? '' : esc(l.unit)}" onchange="lnSet(${i},'unit',this.value)">
      <input inputmode="decimal" value="${l.total == null ? '' : esc(l.total)}" onchange="lnSet(${i},'total',this.value)">
    </div>
    <div>${ps.map(p => `<button class="mchip${sim(l.name, p.part) < 0.75 ? ' low' : ''}" onclick="lnDrop(${i},'${p.id}')">${esc(p.part)}${Number(p.qty) > 1 ? ' ×' + fmt(p.qty) : ''} · ${p.device_id ? esc(p.device_label.split(' — ')[0]) : '📦'} ✕</button>`).join('')}</div>
    ${INV.pickFor === i ? `<div style="margin-top:6px;">${cands.length ? cands.slice(0, 12).map(c => `<button class="pick" onclick="lnAdd(${i},'${c.p.id}')">${esc(c.p.part)}${Number(c.p.qty) > 1 ? ' ×' + fmt(c.p.qty) : ''} — ${c.p.device_id ? esc(c.p.device_label) : '📦'} <span style="color:var(--muted);font-size:11.5px;">(${dt(c.p.bought_at)})</span></button>`).join('') : '<div class="note-in">مفيش قطع ⏳ فاضلة من التاجر ده</div>'}
      <button class="btn ghost sm" style="margin-top:6px;" onclick="INV.pickFor=null;reInv()">قفل</button></div>`
      : `<button class="btn ghost sm" style="margin-top:6px;" onclick="INV.pickFor=${i};reInv()">➕ اربط بقطعة</button>`}
  </div>`;
}
function invSumHtml(sumL: number, tot: number | null, diff: number): string {
  return `<div class="sum"><span>مجموع السطور: <b class="money">${fmt(sumL)}</b></span>
    ${tot != null ? `<span>الإجمالي: <b class="money">${fmt(tot)}</b></span><span style="color:${Math.abs(diff) > 0.5 ? 'var(--red)' : 'var(--done)'}">الفرق: <b>${fmt(diff)}</b></span>` : ''}</div>
    ${tot != null && Math.abs(diff) > 0.5 ? `<label class="f" style="display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" style="width:auto;margin-top:4px;" ${INV.adjust ? 'checked' : ''} onchange="INV.adjust=this.checked">
      <span style="margin:0;font-weight:700;">⚖️ الإجمالي المكتوب هو الصح — سجّل الفرق (${fmt(diff)}) سطر لوحده على حساب التاجر (خصم أو مصاريف)</span></label>` : ''}`;
}
function invLive(){
  const sumL = INV.lines.reduce((t, l) => t + lineTotal(l), 0);
  const tot = num(INV.total);
  const h = $('invSum'); if(h) h.innerHTML = invSumHtml(sumL, tot, tot != null ? tot - sumL : 0);
}
function reInv(){ const y = ((document.querySelector('.ov .sheet') || {}) as Element).scrollTop || 0; setSheetBody(invHtml()); const sh = document.querySelector('.ov .sheet'); if(sh) sh.scrollTop = y; }
function invSup(id: string){ INV.sid = id; INV.lines.forEach(l => { l.purchases = []; l.ok = false; l.manual = false; }); autoMatch(); reInv(); }
function newLine(o?: Partial<PtLine>): PtLine { return Object.assign({ uid: ++INV.uid, name:'', qty:1, unit:null, total:null, purchases:[], ok:false, manual:false }, o || {}); }
function invAdd(){ INV.lines.push(newLine()); reInv(); }
// ⚡ سطر لكل قطعة ⏳ فاضلة — للتاجر اللي فاتورته بنفس ترتيب المشتريات
function invFill(){
  const used = new Set(); INV.lines.forEach(l => l.purchases.forEach(id => used.add(id)));
  invPending().filter(p => !used.has(p.id)).forEach(p =>
    INV.lines.push(newLine({ name:p.part, qty:Number(p.qty), unit:p.unit_price, purchases:[p.id], ok:true, manual:true })));
  reInv();
}
function lnSet(i: number, k: string, v: string){
  const l = INV.lines[i]; if(!l) return;
  l[k] = String(v).trim() === '' ? null : num(v);
  if(k === 'qty' && !(l.qty > 0)) l.qty = 1;
  if((k === 'unit' || k === 'qty') && l.unit != null && !l.totalTyped) l.total = +(l.unit * (l.qty || 1)).toFixed(2);
  if(k === 'total'){ l.totalTyped = l.total != null; if(l.total != null && (l.unit == null || !l.unitTyped)) l.unit = +(l.total / (l.qty || 1)).toFixed(2); }
  if(k === 'unit') l.unitTyped = l.unit != null;
  reInv();
}
function lnDrop(i: number, id: string){ const l = INV.lines[i]; l.purchases = l.purchases.filter(x => x !== id); l.ok = false; l.manual = true; reInv(); }
function lnAdd(i: number, id: string){ const l = INV.lines[i]; l.purchases.push(id); l.ok = false; l.manual = true; INV.pickFor = null; reInv(); }

// 📷 قراية الفاتورة بالذكاء الاصطناعي — نفس دالة parse-invoice بتاعة فواتير المشتريات
async function invPick(inp: HTMLInputElement){
  const f = inp.files && inp.files[0]; inp.value = '';
  if(!f) return;
  if(!/^image\//.test(f.type) && f.type !== 'application/pdf'){ toast('صورة أو PDF بس', true); return; }
  if(f.size > 20 * 1024 * 1024){ toast('الملف كبير — صوّرها تاني', true); return; }
  const { blob, mime } = await shrink(f);
  if(INV.url){ try{ URL.revokeObjectURL(INV.url); }catch(e: any){} }
  INV.file = blob; INV.mime = mime; INV.url = URL.createObjectURL(blob);
  INV.reading = true; reInv();
  try{
    const b64 = await toB64(blob);
    const res = await parseInvoice(mime, b64);
    const d = (res && res.data) || {};
    INV.model = (res && res.model) || 'ai'; INV.raw = (res && res.raw) || null;
    if(d.invoice_date) INV.date = d.invoice_date;
    if(d.invoice_number) INV.no = d.invoice_number;
    if(d.grand_total) INV.total = String(d.grand_total);
    if(!INV.sid && d.supplier_name){
      const hit = (B!.suppliers || []).find(s => sim(s.name, d.supplier_name) >= 0.85);
      if(hit) INV.sid = hit.id;
    }
    INV.lines = ((d.items || []) as any[]).map(it => newLine({ name: it.item_name || '', qty: num(it.quantity) || 1,
      unit: num(it.unit_cost_price), total: num(it.total_price) }));
    autoMatch();
    INV.reading = false; reInv();
    toast(INV.lines.length ? '🤖 اتقرت ' + INV.lines.length + ' سطر — راجعها' : 'مالقيناش سطور — اكتبها بإيدك', !INV.lines.length);
  }catch(e: any){
    console.error('parse-invoice:', e);
    INV.reading = false; INV.model = 'manual'; reInv();
    toast('🤖 القراية الأوتوماتيك ما نجحتش — اكتب السطور بإيدك وإنت شايف الصورة (' + errMsg(e) + ')', true);
  }
}
async function shrink(file: Blob): Promise<{ blob: Blob; mime: string }> {
  if(!/^image\//.test(file.type)) return { blob:file, mime:file.type };
  try{
    const bmp = await createImageBitmap(file);
    const sc = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    if(sc >= 1 && file.size < 1.5 * 1024 * 1024) return { blob:file, mime:file.type };
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    const out = await new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', 0.82));
    return (!out || out.size > file.size) ? { blob:file, mime:file.type } : { blob:out, mime:'image/jpeg' };
  }catch(e: any){ return { blob:file, mime:file.type || 'image/jpeg' }; }
}
function toB64(blob: Blob): Promise<string> { return new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob); }); }
async function parseInvoice(mime: string, b64: string): Promise<any> {
  const { data:{ session } } = await sb.auth.getSession();
  const base = String(sb.supabaseUrl || '').replace(/\/+$/, '');
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 90000);
  try{
    const r = await fetch(base + '/functions/v1/parse-invoice', { method:'POST', signal:ctl.signal,
      headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + (session && session.access_token), 'apikey': sb.supabaseKey || '' },
      body: JSON.stringify({ mimeType:mime, dataBase64:b64 }) });
    const j = await r.json().catch(() => null);
    if(!r.ok) throw new Error((j && (j.message || j.error)) || ('HTTP ' + r.status));
    return j;
  }finally{ clearTimeout(t); }
}

async function invSave(){
  if(INV.busy) return;
  if(!isBoss()){ toast('🧾 فواتير التجار عند المحاسب العام بس', true); return; }
  if(!INV.sid){ toast('اختار التاجر', true); return; }
  if(!INV.lines.length){ toast('الفاتورة فاضية', true); return; }
  for(const [i, l] of INV.lines.entries()){
    if(!String(l.name || '').trim()){ toast('سطر ' + (i + 1) + ' — اكتب الصنف', true); return; }
    if(num(l.unit) == null && num(l.total) == null){ toast('سطر ' + (i + 1) + ' («' + l.name + '») — اكتب السعر', true); return; }
  }
  const s = supById(INV.sid);
  const extra = INV.lines.filter(l => lineState(l) === 'r').length;
  if(!confirm('💾 فاتورة ' + (s ? s.name : '') + ' — ' + INV.lines.length + ' سطر' + (extra ? '\n🔴 ' + extra + ' سطر مالوش قطعة مسجّلة (هيدخل المخزن)' : '') + '\n\nنحفظ؟')) return;
  INV.busy = true; reInv();
  // صورة الفاتورة — لو الرفع فشل بنكمّل، الفاتورة أهم من صورتها
  let path = null;
  if(INV.file){
    try{
      path = INV.date + '/' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) + (/pdf/.test(INV.mime) ? '.pdf' : '.jpg');
      const up = await sb.storage.from('invoices').upload(path, INV.file, { contentType: INV.mime, upsert:false });
      if(up.error){ console.warn('رفع صورة الفاتورة:', up.error); path = null; }
    }catch(e: any){ path = null; }
  }
  try{
    const lines = INV.lines.map(l => ({ name: String(l.name).trim(), qty: num(l.qty) || 1,
      unit: num(l.unit), total: num(l.total), purchases: l.purchases }));
    const r = await rpc('supplier_invoice_save', { p_supplier_id: INV.sid, p_date: INV.date, p_number: INV.no || '',
      p_total: num(INV.total), p_image_path: path, p_lines: lines, p_adjust: !!INV.adjust,
      p_ai_model: INV.model || 'manual', p_ai_raw: INV.raw });
    closeSheet();
    toast('🧾 اتحفظت' + (r.erp_no ? ' — ' + r.erp_no : '') + ' · ' + r.priced + ' قطعة اتسعّرت' + (r.extra ? ' · ' + r.extra + ' زيادة دخلت المخزن' : ''));
    load();
  }catch(e: any){ INV.busy = false; reInv(); toast(errMsg(e), true); }
}

// ============================================================
// 🪟 الشيت
// ============================================================
function sheet(title: string, body: string){
  closeSheet();
  const ov = document.createElement('div');
  ov.className = 'ov'; ov.id = 'sheetOv';
  ov.onclick = e => { if(e.target === ov) closeSheet(); };
  ov.innerHTML = `<div class="sheet" dir="rtl"><div class="sh-h"><h3>${esc(title)}</h3><button class="sh-x" onclick="closeSheet()">✕</button></div><div class="sh-b" id="shBody">${body}</div></div>`;
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';
}
function setSheetBody(html: string){ const b = $('shBody'); if(b) b.innerHTML = html; }
function closeSheet(){ const o = $('sheetOv'); if(o) o.remove(); document.body.style.overflow = ''; }
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeSheet(); });

// ============================================================
// قايمة التلت نقط + الخروج
// ============================================================
function toggleKebab(){
  const m = $('kebabMenu'), sh = $('kebabShield');
  const open = m.classList.contains('hidden');
  m.classList.toggle('hidden', !open); sh.classList.toggle('hidden', !open);
}
function closeKebab(){ $('kebabMenu').classList.add('hidden'); $('kebabShield').classList.add('hidden'); }
async function doLogout(){
  if(!confirm('تسجيل الخروج؟')) return;
  try{ await sb.auth.signOut(); }catch(e: any){}
  location.href = 'index.html';
}
