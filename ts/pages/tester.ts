
// ============================================================
// FIX TEAM — صفحة مسؤول الفحص «🧪 الفحص» (tester.html)
// ------------------------------------------------------------
// 🟦 (٢٠٢٦-١٠-٢٢) الكود ده كان جوه tester.html نفسها واتنقل هنا.
//    الصفحة بقت بتنده: <script src="pages/tester.js"></script>
//    🧸 نفس الكود بالحرف — اتزوّد بس «ورق» بيقول نوع كل حاجة.
// ⚠️ السكريبتين الصغيرين اللي فوق في <head> (اللغة عربي + الثيم)
//    فضلوا جوه الصفحة عن قصد: لازم يشتغلوا قبل ما الصفحة تترسم.
// ⚠️ بيتحمّل بعد common.js · i18n.js · attendance.js · payroll.js · qc-view.js (QC).
// ============================================================
// 🏷️ الأنواع — بتختفي بعد الترجمة
/** جهاز في طابور الفحص — من qc_queue() / qc_find() (ملف 110) */
interface TqDev {
  id: string;
  label: string;
  /** intake = فحص استلام · delivery = فحص تسليم */
  phase: string;
  done?: boolean;
  status: string;
  since?: string | null;
  color?: string | null;
  serial?: string | null;
  issue?: string | null;
  /** الاستقبال كتب إيه عن حالته */
  condition?: string | null;
  /** fixed · rejected — رأي الورشة */
  outcome?: string | null;
  intake?: QcCheck | null;
  delivery?: QcCheck | null;
  [k: string]: any;
}
/** فحص اتعمل قريب — قايمة «🗂️ اتفحص قريب» */
interface TqRecent extends QcCheck { phase: string; device_label: string; }
/** رد qc_queue() */
interface TqQueue { role: string; me: string; devices: TqDev[]; recent?: TqRecent[]; }
/** إجابة التيستر على بند: s = ok · bad · na · n = ملاحظة */
interface TqAns { s: string; n: string; auto?: boolean; }

// ============================================================
// 🧪 صفحة مسؤول الفحص (ملف SQL رقم 110)
// ------------------------------------------------------------
// 🧸 الحكاية:
//   🛎️ الاستقبال يسجّل جهاز → يظهر هنا في «استلام» → التيستر يفحصه
//      → الاستقبال يبعته للورشة (لو بعته من غير فحص لازم يكتب تقرير
//      للمحاسب العام).
//   📦 الورشة ترجّعه للاستقبال → يظهر هنا في «تسليم» → التيستر يفحصه
//      تاني، وجنب كل بند مكتوب كان إيه وقت الاستلام. لو حاجة كانت ✅
//      وبقت ❌ بتنوّر أحمر — والاستقبال بيشوف تحذير قبل ما يسلّم.
//
// ⚠️ الصفحة مابتقراش جدول الأجهزة خالص — كل حاجة من qc_queue على
//    السيرفر: رقم التذكرة والموديل واللون والسيريال والعطل بس.
// 📋 البنود نفسها في qc-view.js (QC.GROUPS) — زوّد بند هناك بس.
// ============================================================
const $: (id: string) => HTMLElement | null = id => document.getElementById(id);
let Q: TqQueue | null = null, ROLE = '', ME = '', loadErr = '', loading = false;
const S: { tab: string; q: string; found: any } = { tab: 'intake', q: '', found: null };
const ROLE_LBL: Record<string, string> = { tester:'مسؤول الفحص', super_admin:'المحاسب العام' };

// ---------- أدوات ----------
function ago(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if(!(m >= 0)) return '';
  if(m < 1) return 'دلوقتي';
  if(m < 60) return 'من ' + m + ' دقيقة';
  const h = Math.floor(m / 60); if(h < 24) return 'من ' + h + ' ساعة';
  const d = Math.floor(h / 24); return d === 1 ? 'من يوم' : 'من ' + d + ' يوم';
}
function dt(iso: any): string { try{ return new Date(iso).toLocaleString('ar-EG', { day:'numeric', month:'numeric', hour:'numeric', minute:'2-digit', timeZone:'Africa/Cairo' }); }catch(e: any){ return ''; } }
function escH(s: unknown): string { return typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => (({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as Record<string, string>)[c])); }
let toastT: any;
function toast(msg: string, bad?: boolean){
  const el = $('toast')!; el.textContent = msg; el.classList.toggle('bad', !!bad); el.classList.add('on');
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
  if(/qc_queue|qc_save|qc_find|schema cache|does not exist|PGRST202/i.test(m)) return m + ' — (ملف SQL رقم 110 لسه ما اتشغّلش؟)';
  return m;
}

// ============================================================
// 🚪 الدخول
// ============================================================
(async function boot(){
  const { data:{ session } } = await sb.auth.getSession();
  if(!session){ location.replace('index.html'); return; }
  // بوابة الاشتراك — نفس باقي الصفحات
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
    sessionStorage.removeItem('ifix-land');   // 🔁 وصلنا فعلاً — حارس اللفّة في index.html يتصفّر
  }catch(e: any){}
  await load();
  // ⏱️ كل ٣٠ ثانية — عشان الجهاز الجديد يظهر من غير ما يدوس تحديث
  setInterval(() => { if(!document.hidden && !$('sheetOv')) load(); }, 30000);
})();
document.addEventListener('visibilitychange', () => { if(!document.hidden && !$('sheetOv')) load(); });
addEventListener('online', () => load());

let lastTodo: Set<string> | null = null;
async function load(manual?: boolean){
  if(loading) return;
  loading = true;
  try{
    const d = await rpc('qc_queue');
    Q = d; ROLE = d.role; ME = d.me; loadErr = '';
    try{ localStorage.setItem('ifix-last-role', ROLE); }catch(e: any){}
    $('whoLbl')!.textContent = ME + ' — ' + (ROLE_LBL[ROLE] || ROLE);
    $('backDashBtn')!.style.display = ROLE === 'super_admin' ? '' : 'none';
    // 🔔 جهاز جديد وصل؟ → رجّة + رسالة
    const todo = new Set(devs().filter(x => !x.done).map(x => x.id + '@' + x.phase));
    if(lastTodo){
      const fresh = devs().filter(x => !x.done && !lastTodo!.has(x.id + '@' + x.phase));
      if(fresh.length){
        try{ if(navigator.vibrate) navigator.vibrate([120, 60, 120]); }catch(e: any){}
        toast('🔔 ' + (fresh[0].phase === 'intake' ? 'جهاز جديد مستني فحص استلام' : 'جهاز راجع من الورشة مستني فحص تسليم') + ': ' + fresh[0].label);
      }
    }
    lastTodo = todo;
    if(manual) toast('اتحدّثت ✅');
  }catch(e: any){
    console.error('qc_queue failed:', e);
    const m = errMsg(e);
    if(/مش مسموحة لحسابك/.test(m) && !Q){
      // ⚠️ (١٩-١٠) قبل كده كنا بنحوّل على طول — ولو الحساب «تيستر» في لوحة الأدمن
      //    بس السيرفر لسه مش عارف الكلمة (ملف 110 ما اتشغّلش)، الداشبورد كان
      //    بيرجّعه هنا تاني → الصفحتين يرموا بعض للأبد والصفحة «مابتفتحش».
      //    دلوقتي: لو الحساب تيستر في القايمة → نقف ونكتب السبب. غير كده → صفحته.
      const r = await myListedRole();
      if(r === 'tester'){
        loadErr = '🔧 الحساب ده «مسؤول الفحص» في لوحة الأدمن، بس السيرفر لسه مش عارف الدور ده.\n'
          + 'شغّل ملف 110-device-checks.sql على Supabase (وابعت نتيجته لو طلع خطأ)، وبعدين دوس «جرّب تاني».';
        loading = false; render(); return;
      }
      const go = ({ technician:'my-devices.html', staff:'staff.html', hr:'hr.html', dispatcher:'dispatch.html',
                   owner:'owner.html', parts:'parts.html' } as Record<string, string>)[r] || (r ? 'dashboard.html' : 'index.html');
      location.replace(go);
      return;
    }
    loadErr = m;
  }finally{ loading = false; }
  render();
}

// 🪪 الدور المكتوب للحساب ده في لوحة الأدمن (user-roles) — نفس طريقة index.html
async function myListedRole(): Promise<string> {
  try{
    const { data:{ session } } = await sb.auth.getSession();
    const em = ((session && session.user && session.user.email) || '').toLowerCase();
    const { data, error } = await sb.from('app_data').select('value').eq('key', 'user-roles').maybeSingle();
    if(error || !data || !data.value) return '';
    const v = (JSON.parse(data.value) || {})[em];
    return (typeof v === 'string') ? v : ((v && v.role) || '');
  }catch(e: any){ return ''; }
}

const devs = () => (Q && Q.devices) || [];
const ofPhase: (ph: string) => TqDev[] = ph => devs().filter(x => x.phase === ph);

// ============================================================
// 🖼️ الرسم
// ============================================================
function render(){
  const ni = ofPhase('intake').filter(x => !x.done).length;
  const nd = ofPhase('delivery').filter(x => !x.done).length;
  const tabs = [
    { k:'intake', l:'🛎️ استلام', n:ni },
    { k:'delivery', l:'📦 تسليم', n:nd },
    { k:'recent', l:'🗂️ اتفحص قريب' }
  ];
  $('tabs')!.innerHTML = tabs.map(x => `<button class="tab${S.tab === x.k ? ' on' : ''}" onclick="go('${x.k}')">${x.l}${x.n ? `<span class="n">${x.n}</span>` : ''}</button>`).join('');
  const app = $('app')!;
  if(!Q){ app.innerHTML = loadErr ? `<div class="err">⚠️ ${escH(loadErr)}</div><button class="big" onclick="load(true)">↻ جرّب تاني</button>` : '<div class="empty">⏳ جاري التحميل…</div>'; return; }
  const head = (loadErr ? `<div class="err">⚠️ آخر تحديث فشل: ${escH(loadErr)}</div>` : '')
    + `<input class="search" id="qSearch" type="search" inputmode="search" autocomplete="off" value="${escH(S.q)}"
         placeholder="🔍 رقم التذكرة أو السيريال — لأي جهاز" oninput="onSearch(this.value)">`
    + `<div id="foundHost">${foundHtml()}</div>`;
  app.innerHTML = head + (S.tab === 'recent' ? viewRecent() : viewPhase(S.tab));
}
function go(k: string){ S.tab = k; render(); window.scrollTo(0, 0); }

function devCard(x: TqDev): string {
  const ph = x.phase;
  const reg = ph === 'delivery' && x.done ? QC.regress(x.intake, x.delivery) : [];
  const cls = !x.done ? 'todo' : reg.length ? 'reg' : 'done';
  const pill = !x.done ? `<span class="pill acc">⏳ مستني ${ph === 'intake' ? 'فحص الاستلام' : 'فحص التسليم'}</span>`
             : reg.length ? `<span class="pill bad">⚠️ فيه ${reg.length} حاجة باظت</span>`
             : `<span class="pill ok">✅ اتفحص</span>`;
  const inS = x.intake ? QC.summary(x.intake) : null;
  const outcome = x.outcome === 'fixed' ? '✅ الورشة: المشكلة اتحلّت' : x.outcome === 'rejected' ? '🚫 الورشة: الجهاز اترفض' : '';
  const statusTxt = ({ waiting:'🛎️ عند الاستقبال', returned:'🔁 مرتجع عند الاستقبال', sent_to_reception:'📥 لسه راجع من الورشة',
                      fixed_drawer:'🟢 درج الخالص', rejected:'🔴 درج الرفض' } as Record<string, string>)[x.status] || x.status;
  return `<div class="card ${cls}">
    <div class="c-top"><div class="c-t">📱 ${escH(x.label)}</div>${pill}</div>
    <div class="c-s">${escH(statusTxt)}${x.since ? ' · ' + ago(x.since) : ''}${x.color ? ' · 🎨 ' + escH(x.color) : ''}${x.serial ? ' · <b dir="ltr">' + escH(x.serial) + '</b>' : ''}</div>
    ${x.issue ? `<div class="box">🛠️ العطل: ${escH(x.issue)}</div>` : ''}
    ${ph === 'delivery' && outcome ? `<div class="c-s"><b>${outcome}</b></div>` : ''}
    ${ph === 'delivery' ? (inS ? `<div class="c-s">🛎️ وقت الاستلام: ✅ ${inS.ok}${inS.bad ? ' · ❌ ' + inS.bad : ''}${inS.na ? ' · ➖ ' + inS.na : ''} (${escH(x.intake!.by_name)})</div>`
                                : `<div class="c-s" style="color:var(--wait)">⚠️ الجهاز ده ما اتفحصش وقت الاستلام</div>`) : ''}
    ${x.done ? `<div class="c-s">🧪 ${escH((x[ph] || {}).by_name || '')} · ${dt((x[ph] || {}).at)}</div>` : ''}
    <div class="acts"><button class="btn ${x.done ? '' : 'pri'}" onclick="openCheck('${x.id}','${ph}')">${x.done ? '🔁 افحصه تاني' : '🧪 افحص'}</button></div>
  </div>`;
}
function viewPhase(ph: string): string {
  const list = ofPhase(ph);
  const todo = list.filter(x => !x.done);
  const done = list.filter(x => x.done);
  const hint = ph === 'intake'
    ? 'أجهزة لسه متسجّلة عند الاستقبال — افحصها قبل ما تتبعت للورشة. الأقدم فوق.'
    : 'أجهزة راجعة من الورشة — افحصها قبل ما تتسلّم للعميل. جنب كل بند هتلاقي كان إيه وقت الاستلام.';
  return `<div class="hint">${hint}</div>
    <div class="sec-h">⏳ مستنية فحص <span class="c">${todo.length}</span><span class="rule"></span></div>
    ${todo.length ? `<div class="list">${todo.map(devCard).join('')}</div>` : '<div class="empty">✨ مفيش أجهزة مستنية دلوقتي</div>'}
    ${done.length ? `<div class="sec-h">✅ اتفحصت <span class="c">${done.length}</span><span class="rule"></span></div><div class="list">${done.map(devCard).join('')}</div>` : ''}`;
}
function viewRecent(): string {
  const r = (Q!.recent || []);
  if(!r.length) return '<div class="empty">لسه مفيش فحوصات النهارده</div>';
  return `<div class="hint">آخر الفحوصات (النهارده وامبارح). لو فيه غلط، افتح الجهاز وافحصه تاني — الأحدث هو اللي بيتحسب.</div>` + r.map(c => {
    const sm = QC.summary(c);
    return `<div class="card ${sm.bad ? 'reg' : 'done'}">
      <div class="c-top"><div class="c-t">${QC.PHASE[c.phase].i} ${escH(c.device_label)}</div>
        <span class="pill">${QC.PHASE[c.phase].t}</span></div>
      <div class="c-s">✅ ${sm.ok}${sm.bad ? ' · ❌ ' + sm.bad : ''}${sm.na ? ' · ➖ ' + sm.na : ''}${c.power_on === false ? ' · 🔌 مش بيفتح' : ''} · 🧪 ${escH(c.by_name)} · ${dt(c.at)}</div>
      ${sm.bads.length ? `<div class="box">${sm.bads.map(it => '❌ ' + escH(QC.label(it.k)) + (it.n ? ' — ' + escH(it.n) : '')).join('<br>')}</div>` : ''}
    </div>`;
  }).join('');
}

// ---------- 🔎 البحث ----------
let findT: any = 0;
function onSearch(v: string){
  S.q = v;
  clearTimeout(findT);
  findT = setTimeout(async () => {
    const q = String(v || '').trim();
    if(q.length < 3){ S.found = null; const h = $('foundHost'); if(h) h.innerHTML = ''; return; }
    try{ S.found = await rpc('qc_find', { p_q: q }) || []; }
    catch(e: any){ S.found = { err: errMsg(e) }; }
    const h = $('foundHost'); if(h) h.innerHTML = foundHtml();
  }, 350);
}
function foundHtml(): string {
  if(!S.found) return '';
  if(S.found.err) return `<div class="err">${escH(S.found.err)}</div>`;
  if(!S.found.length) return '<div class="empty" style="margin-bottom:12px;">مفيش جهاز بالرقم ده</div>';
  return `<div class="sec-h">🔎 نتيجة البحث <span class="c">${S.found.length}</span><span class="rule"></span></div>` + (S.found as TqDev[]).map(x => {
    const ph = x.phase || (x.delivery || ['sent_to_reception','fixed_drawer','rejected','delivered'].includes(x.status) ? 'delivery' : 'intake');
    return `<div class="card">
      <div class="c-top"><div class="c-t">📱 ${escH(x.label)}</div><span class="pill">${escH(x.status)}</span></div>
      <div class="c-s">${x.serial ? '<b dir="ltr">' + escH(x.serial) + '</b> · ' : ''}${x.intake ? '🛎️ اتفحص استلام' : '🛎️ ما اتفحصش استلام'} · ${x.delivery ? '📦 اتفحص تسليم' : '📦 ما اتفحصش تسليم'}</div>
      <div class="acts"><button class="btn${ph === 'intake' ? ' pri' : ''}" onclick="openCheck('${x.id}','intake',true)">🛎️ فحص استلام</button>
        <button class="btn${ph === 'delivery' ? ' pri' : ''}" onclick="openCheck('${x.id}','delivery',true)">📦 فحص تسليم</button></div>
    </div>`;
  }).join('') + '<div style="height:6px"></div>';
}

// ============================================================
// 🧪 ورقة الفحص
// ============================================================
const F: { dev: TqDev | null; phase: string; power: boolean; ans: Record<string, TqAns>; notes: string; battery: string; busy: boolean; tried: boolean } = { dev:null, phase:'intake', power:true, ans:{}, notes:'', battery:'', busy:false, tried:false };
const drafts: Record<string, any> = {};   // id@phase → اللي اتكتب لو قفل الورقة بالغلط

function findDev(id: string): TqDev | null {
  return devs().find(x => x.id === id) || ((Array.isArray(S.found) && S.found.find(x => x.id === id)) || null);
}
function openCheck(id: string, phase: string){
  const x = findDev(id); if(!x) return;
  const key = id + '@' + phase;
  const prev = x[phase];   // آخر فحص من نفس النوع (لو بيعيد)
  Object.assign(F, { dev:x, phase, busy:false, tried:false });
  if(drafts[key]) Object.assign(F, JSON.parse(JSON.stringify(drafts[key])), { dev:x, phase, busy:false, tried:false });
  else {
    F.power = true; F.ans = {}; F.notes = ''; F.battery = '';
    // 🔁 بيعيد الفحص؟ → بنبدأ من آخر إجابات عشان مايكتبش كله من الأول
    if(prev && Array.isArray(prev.items)){
      (prev.items as QcMark[]).forEach(it => { F.ans[it.k] = { s: it.s, n: it.n || '' }; });
      F.power = prev.power_on !== false; F.notes = prev.notes || '';
      F.battery = prev.battery_health == null ? '' : String(prev.battery_health);
    }
  }
  sheet();
}
function saveDraft(){ if(F.dev) drafts[F.dev.id + '@' + F.phase] = { power:F.power, ans:F.ans, notes:F.notes, battery:F.battery }; }

function wasOf(k: string): QcMark | null {
  if(F.phase !== 'delivery' || !F.dev || !F.dev.intake) return null;
  const it = (F.dev.intake.items || []).find(i => i.k === k);
  return it || null;
}
function counts(){
  let done = 0, total = 0;
  QC.FLAT.forEach(it => { total++; const a = F.ans[it.k]; if(a && a.s && !(a.s === 'bad' && String(a.n || '').trim().length < 2)) done++; });
  return { done, total };
}
function itemHtml(it: QcItemDef): string {
  const a = F.ans[it.k] || {} as TqAns;
  const locked = !F.power && !it.off;
  const w = wasOf(it.k);
  const regr = w && w.s === 'ok' && a.s === 'bad';
  const miss = F.tried && (!a.s || (a.s === 'bad' && String(a.n || '').trim().length < 2));
  const b = (s: string, ic: string, t: string) => `<button class="${s}${a.s === s ? ' on ' + s : ''}" title="${t}" ${locked ? 'disabled' : ''} onclick="setAns('${it.k}','${s}')">${ic}</button>`;
  return `<div class="it${regr ? ' regr' : miss ? ' miss' : ''}" id="it_${it.k}">
    <div class="it-top">
      <div class="it-l">${escH(it.l)}${it.hint ? `<small>${escH(it.hint)}</small>` : ''}</div>
      ${w ? `<span class="was" title="وقت الاستلام">🛎️ ${w.s === 'ok' ? '✅' : w.s === 'bad' ? '❌' : '➖'}</span>` : ''}
      <div class="sg">${b('ok','✅','سليم')}${b('bad','❌','فيه مشكلة')}${b('na','➖','ماتجربش')}</div>
    </div>
    ${(a.s === 'bad' || a.s === 'na') && !locked ? `<input class="note${a.s === 'bad' && String(a.n || '').trim().length < 2 && F.tried ? ' need' : ''}" value="${escH(a.n || '')}"
        placeholder="${a.s === 'bad' ? 'إيه المشكلة؟ (إجباري) — مثال: خدش في الركن الشمال' : 'ليه ماتجربش؟ (اختياري)'}" oninput="setNote('${it.k}', this.value)">` : ''}
    ${w && w.n && w.s !== 'ok' ? `<div class="c-s">🛎️ وقت الاستلام: ${escH(w.n)}</div>` : ''}
    ${regr ? `<div class="reg-t">⚠️ كان سليم وقت الاستلام</div>` : ''}
  </div>`;
}
function sheetBody(): string {
  const x = F.dev!;
  const P = QC.PHASE[F.phase];
  const inS = F.phase === 'delivery' && x.intake ? QC.summary(x.intake) : null;
  const regs = F.phase === 'delivery' && x.intake ? QC.FLAT.filter(it => { const w = wasOf(it.k); const a = F.ans[it.k]; return w && a && w.s === 'ok' && a.s === 'bad'; }) : [];
  return `<div class="dev">
      <div class="c-t">📱 ${escH(x.label)}</div>
      <div class="c-s">${x.color ? '🎨 ' + escH(x.color) + ' · ' : ''}${x.serial ? '<b dir="ltr">' + escH(x.serial) + '</b>' : 'مفيش سيريال'}</div>
      ${x.issue ? `<div class="box">🛠️ العطل اللي العميل قاله: ${escH(x.issue)}</div>` : ''}
      ${x.condition ? `<div class="box">📝 الاستقبال كتب: ${escH(x.condition)}</div>` : ''}
      ${F.phase === 'delivery' ? (x.outcome === 'fixed' ? '<div class="c-s"><b>✅ الورشة قالت: المشكلة اتحلّت</b></div>' : x.outcome === 'rejected' ? '<div class="c-s"><b>🚫 الورشة قالت: الجهاز اترفض</b></div>' : '') : ''}
    </div>
    ${F.phase === 'delivery' && !x.intake ? '<div class="warnbox">⚠️ الجهاز ده ما اتفحصش وقت الاستلام — مفيش حاجة نقارن بيها.</div>' : ''}
    ${inS ? `<div class="hint">🛎️ وقت الاستلام (${escH(x.intake!.by_name)} · ${dt(x.intake!.at)}): ✅ ${inS.ok}${inS.bad ? ' · ❌ ' + inS.bad : ''}${inS.na ? ' · ➖ ' + inS.na : ''} — مكتوب جنب كل بند.</div>` : ''}
    <div class="sec-h" style="margin-top:4px;">🔌 الجهاز بيفتح؟<span class="rule"></span></div>
    <div class="power">
      <button class="y${F.power ? ' on' : ''}" onclick="setPower(true)">✅ أيوه بيفتح</button>
      <button class="n${!F.power ? ' on' : ''}" onclick="setPower(false)">🔌 لأ — مش بيفتح</button>
    </div>
    ${!F.power ? '<div class="warnbox">🔌 الجهاز مش بيفتح: افحص الشكل الخارجي ومنفذ الشحن بس — الباقي هيتسجّل «➖ ماتجربش» لوحده.</div>' : ''}
    ${QC.GROUPS.map(g => {
      const its = g.items;
      const done = its.filter(it => (F.ans[it.k] || {}).s).length;
      const canAll = its.some(it => F.power || it.off);
      return `<div class="grp"><div class="grp-h">${g.icon} ${escH(g.t)} <span class="gc">${done}/${its.length}</span>
          ${canAll ? `<button class="all" onclick="allOk('${g.g}')">✅ كله سليم</button>` : ''}</div>
        ${its.map(itemHtml).join('')}</div>`;
    }).join('')}
    <label class="f"><span>🔋 صحة البطارية ٪ (لو ظاهرة في الإعدادات — اختياري)</span>
      <input id="fBat" inputmode="numeric" value="${escH(F.battery)}" placeholder="مثال: 86" oninput="F.battery=this.value;saveDraft()"></label>
    <label class="f"><span>📝 ملاحظات عامة على حالة الجهاز</span>
      <textarea id="fNotes" placeholder="أي حاجة شفتها ومش في البنود — مثال: الجهاز عليه جراب، فيه سكرينة مكسورة" oninput="F.notes=this.value;saveDraft()">${escH(F.notes)}</textarea></label>
    ${regs.length ? `<div class="badbox">⚠️ ${regs.length} حاجة كانت سليمة وقت الاستلام وبقت فيها مشكلة: ${regs.map(it => escH(it.l)).join(' · ')}<br>
       الاستقبال هيشوف تحذير قبل ما يسلّم، والمحاسب العام هيعرف.</div>` : ''}
    <button class="big" onclick="saveCheck()" ${F.busy ? 'disabled' : ''}>${F.busy ? '⏳ بنحفظ…' : '💾 احفظ ' + P.t}</button>`;
}
function progTxt(): string { const c = counts(); return c.done + ' / ' + c.total; }
function sheet(){
  closeSheet(true);
  const ov = document.createElement('div');
  ov.className = 'ov'; ov.id = 'sheetOv';
  ov.onclick = e => { if(e.target === ov) closeSheet(); };
  const P = QC.PHASE[F.phase];
  ov.innerHTML = `<div class="sheet" dir="rtl"><div class="sh-h"><h3>${P.i} ${P.t}</h3><span class="prog" id="fProg">${progTxt()}</span><button class="sh-x" onclick="closeSheet()">✕</button></div><div class="sh-b" id="shBody">${sheetBody()}</div></div>`;
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';
}
// 🔁 إعادة الرسم من غير ما الورقة تنط لفوق
function reSheet(){
  const sh = document.querySelector('#sheetOv .sheet'); const y = sh ? sh.scrollTop : 0;
  const b = $('shBody'); if(b) b.innerHTML = sheetBody();
  const p = $('fProg'); if(p) p.textContent = progTxt();
  if(sh) sh.scrollTop = y;
}
function closeSheet(silent?: boolean){
  const o = $('sheetOv'); if(o) o.remove(); document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeSheet(); });

function setAns(k: string, s: string){
  const a = F.ans[k] || {} as TqAns;
  F.ans[k] = { s, n: (s === a.s || s !== 'ok') ? (a.n || '') : '' };
  saveDraft(); reSheet();
  if(s === 'bad') setTimeout(() => { const i = document.querySelector<HTMLInputElement>('#it_' + k + ' input.note'); if(i) i.focus(); }, 30);
}
function setNote(k: string, v: string){
  F.ans[k] = Object.assign({}, F.ans[k] || {}, { n: v });
  saveDraft();
  const p = $('fProg'); if(p) p.textContent = progTxt();
}
function setPower(on: boolean){
  F.power = on;
  QC.FLAT.forEach(it => {
    if(it.off) return;
    if(!on) F.ans[it.k] = { s:'na', n:'الجهاز مش بيفتح', auto:true };
    else if(F.ans[it.k] && F.ans[it.k].auto) delete F.ans[it.k];
  });
  saveDraft(); reSheet();
}
function allOk(g: string){
  const grp = QC.GROUPS.find(x => x.g === g); if(!grp) return;
  grp.items.forEach(it => { if(!F.power && !it.off) return; if(!(F.ans[it.k] || {}).s) F.ans[it.k] = { s:'ok', n:'' }; });
  saveDraft(); reSheet();
}

async function saveCheck(){
  if(F.busy) return;
  F.tried = true;
  const miss = QC.FLAT.filter(it => { const a = F.ans[it.k]; return !a || !a.s; });
  const noNote = QC.FLAT.filter(it => { const a = F.ans[it.k]; return a && a.s === 'bad' && String(a.n || '').trim().length < 2; });
  if(miss.length || noNote.length){
    reSheet();
    const first = (miss[0] || noNote[0]);
    toast(miss.length ? '⚠️ لسه ' + miss.length + ' بند ما اتجاوبش — أولهم «' + first.l + '»'
                      : '⚠️ «' + first.l + '» فيه مشكلة — اكتب إيه هي', true);
    const el = $('it_' + first.k); if(el) el.scrollIntoView({ block:'center', behavior:'smooth' });
    return;
  }
  const bat = String(F.battery || '').replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x0660).replace(/\D/g, '');
  const items = QC.FLAT.map(it => { const a = F.ans[it.k]; return { k: it.k, l: it.l, s: a.s, n: String(a.n || '').trim() }; });
  F.busy = true; reSheet();
  try{
    await rpc('qc_save', { p_device_id: F.dev!.id, p_phase: F.phase, p_power_on: !!F.power, p_items: items,
                           p_notes: String(F.notes || '').trim(), p_battery: bat === '' ? null : Math.min(100, Number(bat)) });
    delete drafts[F.dev!.id + '@' + F.phase];
    const bad = items.filter(i => i.s === 'bad').length;
    closeSheet();
    toast('💾 ' + QC.PHASE[F.phase].t + ' اتحفظ' + (bad ? ' — ❌ ' + bad + ' فيه مشكلة' : ' — ✅ كله سليم'));
    S.found = null; S.q = '';
    load();
  }catch(e: any){ F.busy = false; reSheet(); toast(errMsg(e), true); }
}

// ============================================================
// قايمة التلت نقط + الخروج
// ============================================================
function toggleKebab(){
  const m = $('kebabMenu')!, sh = $('kebabShield')!;
  const open = m.classList.contains('hidden');
  m.classList.toggle('hidden', !open); sh.classList.toggle('hidden', !open);
}
function closeKebab(){ $('kebabMenu')!.classList.add('hidden'); $('kebabShield')!.classList.add('hidden'); }
async function doLogout(){
  if(!confirm('تسجيل الخروج؟')) return;
  try{ await sb.auth.signOut(); }catch(e: any){}
  location.href = 'index.html';
}
