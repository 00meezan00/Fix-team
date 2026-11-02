
// ============================================================
// I Fix Team — صفحة مسؤول الفحص «🧪 الفحص» (tester.html) — نسخة الإنتاج
// 📍 منقول من الاستيجنج (ts/pages/tester.ts) بالحرف — اتغيّر بس: حالات الإنتاج
//    (قيد الانتظار · مرتجع · تم الصيانة · تم الرفض) + اسم ملف السيرفر prod-tester.sql.
// ------------------------------------------------------------
// 🟦 (٢٠٢٦-١٠-٢٢) الكود ده كان جوه tester.html نفسها واتنقل هنا.
//    الصفحة بقت بتنده: <script src="pages/tester.js"></script>
//    🧸 نفس الكود بالحرف — اتزوّد بس «ورق» بيقول نوع كل حاجة.
// ⚠️ السكريبتين الصغيرين اللي فوق في <head> (اللغة عربي + الثيم)
//    فضلوا جوه الصفحة عن قصد: لازم يشتغلوا قبل ما الصفحة تترسم.
// ⚠️ بيتحمّل بعد common.js · i18n.js · attendance.js · payroll.js · qc-view.js (QC).
// ============================================================
// 🏷️ الأنواع — بتختفي بعد الترجمة
/** جهاز في طابور الفحص — من qc_queue() / qc_find() (prod-tester.sql) */
                 
             
                
                                                   
                
                 
                 
                        
                        
                         
                        
                                   
                            
                                      
                          
                          
                            
                   
 
/** فحص اتعمل قريب — قايمة «🗂️ اتفحص قريب» */
                                                                           
/** رد qc_queue() */
                                                                                      
/** إجابة التيستر على بند: s = ok · bad · na · n = ملاحظة */
                                                         

// ============================================================
// 🧪 صفحة مسؤول الفحص (prod-tester.sql)
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
const $                                     = id => document.getElementById(id);
let Q                 = null, ROLE = '', ME = '', loadErr = '', loading = false;
const S                                         = { tab: 'intake', q: '', found: null };
const ROLE_LBL                         = { tester:'مسؤول الفحص', super_admin:'المحاسب العام' };

// ---------- أدوات ----------
function ago(iso        )         {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if(!(m >= 0)) return '';
  if(m < 1) return 'دلوقتي';
  if(m < 60) return 'من ' + m + ' دقيقة';
  const h = Math.floor(m / 60); if(h < 24) return 'من ' + h + ' ساعة';
  const d = Math.floor(h / 24); return d === 1 ? 'من يوم' : 'من ' + d + ' يوم';
}
function dt(iso     )         { try{ return new Date(iso).toLocaleString('ar-EG', { day:'numeric', month:'numeric', hour:'numeric', minute:'2-digit', timeZone:'Africa/Cairo' }); }catch(e     ){ return ''; } }
function escH(s         )         { return typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => (({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}                          )[c])); }
let toastT     ;
function toast(msg        , bad          ){
  const el = $('toast') ; el.textContent = msg; el.classList.toggle('bad', !!bad); el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), bad ? 5200 : 2800);
}
// ⚠️ Supabase مابيرميش خطأ — بيرجّعه في .error. الدالة دي بترميه بصوت عالي.
async function rpc(name        , args                      )               {
  if(!navigator.onLine) throw new Error('مفيش نت — العملية دي محتاجة اتصال');
  const { data, error } = await sb.rpc(name, args || {});
  if(error) throw error;
  return data;
}
function errMsg(e     )         {
  const m = (e && (e.message || e.hint)) || String(e);
  if(/qc_queue|qc_save|qc_find|schema cache|does not exist|PGRST202/i.test(m)) return m + ' — (prod-tester.sql لسه ما اتشغّلش؟)';
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
      if(!ok){ try{ showServiceStopped(false); }catch(e     ){} return; }
    }
  }catch(e     ){ console.error('[الاشتراك]', e); }
  try{
    localStorage.setItem('ifix-last-email', (session.user.email || '').toLowerCase());
    sessionStorage.removeItem('ifix-bounced');
    sessionStorage.removeItem('ifix-land');   // 🔁 وصلنا فعلاً — حارس اللفّة في index.html يتصفّر
  }catch(e     ){}
  await load();
  // ⏱️ كل ٣٠ ثانية — عشان الجهاز الجديد يظهر من غير ما يدوس تحديث
  setInterval(() => { if(!document.hidden && !$('sheetOv')) load(); }, 30000);
})();
document.addEventListener('visibilitychange', () => { if(!document.hidden && !$('sheetOv')) load(); });
addEventListener('online', () => load());

let lastTodo                     = null;
async function load(manual          ){
  if(loading) return;
  loading = true;
  try{
    const d = await rpc('qc_queue');
    Q = d; ROLE = d.role; ME = d.me; loadErr = '';
    try{ localStorage.setItem('ifix-last-role', ROLE); }catch(e     ){}
    $('whoLbl') .textContent = ME + ' — ' + (ROLE_LBL[ROLE] || ROLE);
    $('backDashBtn') .style.display = ROLE === 'super_admin' ? '' : 'none';
    // 🔔 جهاز جديد وصل؟ → رجّة + رسالة
    const todo = new Set(devs().filter(x => !x.done).map(x => x.id + '@' + x.phase));
    if(lastTodo){
      const fresh = devs().filter(x => !x.done && !lastTodo .has(x.id + '@' + x.phase));
      if(fresh.length){
        try{ if(navigator.vibrate) navigator.vibrate([120, 60, 120]); }catch(e     ){}
        toast('🔔 ' + (fresh[0].phase === 'intake' ? 'جهاز جديد مستني فحص استلام' : 'جهاز راجع من الورشة مستني فحص تسليم') + ': ' + fresh[0].label);
      }
    }
    lastTodo = todo;
    if(manual) toast('اتحدّثت ✅');
  }catch(e     ){
    console.error('qc_queue failed:', e);
    const m = errMsg(e);
    if(/مش مسموحة لحسابك/.test(m) && !Q){
      // ⚠️ (١٩-١٠) قبل كده كنا بنحوّل على طول — ولو الحساب «تيستر» في لوحة الأدمن
      //    بس السيرفر لسه مش عارف الكلمة (prod-tester.sql ما اتشغّلش)، الداشبورد كان
      //    بيرجّعه هنا تاني → الصفحتين يرموا بعض للأبد والصفحة «مابتفتحش».
      //    دلوقتي: لو الحساب تيستر في القايمة → نقف ونكتب السبب. غير كده → صفحته.
      const r = await myListedRole();
      if(r === 'tester'){
        loadErr = '🔧 الحساب ده «مسؤول الفحص» في لوحة الأدمن، بس السيرفر لسه مش عارف الدور ده.\n'
          + 'شغّل ملف prod-tester.sql على Supabase (وابعت نتيجته لو طلع خطأ)، وبعدين دوس «جرّب تاني».';
        loading = false; render(); return;
      }
      const go = ({ technician:'my-devices.html', staff:'staff.html', hr:'hr.html', dispatcher:'dispatch.html',
                   owner:'owner.html', callcenter:'callcenter.html' }                          )[r] || (r ? 'dashboard.html' : 'index.html');
      location.replace(go);
      return;
    }
    loadErr = m;
  }finally{ loading = false; }
  render();
}

// 🪪 الدور المكتوب للحساب ده في لوحة الأدمن (user-roles) — نفس طريقة index.html
async function myListedRole()                  {
  try{
    const { data:{ session } } = await sb.auth.getSession();
    const em = ((session && session.user && session.user.email) || '').toLowerCase();
    const { data, error } = await sb.from('app_data').select('value').eq('key', 'user-roles').maybeSingle();
    if(error || !data || !data.value) return '';
    const v = (JSON.parse(data.value) || {})[em];
    return (typeof v === 'string') ? v : ((v && v.role) || '');
  }catch(e     ){ return ''; }
}

const devs = () => (Q && Q.devices) || [];
const ofPhase                          = ph => devs().filter(x => x.phase === ph);

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
  $('tabs') .innerHTML = tabs.map(x => `<button class="tab${S.tab === x.k ? ' on' : ''}" onclick="go('${x.k}')">${x.l}${x.n ? `<span class="n">${x.n}</span>` : ''}</button>`).join('');
  const app = $('app') ;
  if(!Q){ app.innerHTML = loadErr ? `<div class="err">⚠️ ${escH(loadErr)}</div><button class="big" onclick="load(true)">↻ جرّب تاني</button>` : '<div class="empty">⏳ جاري التحميل…</div>'; return; }
  const head = (loadErr ? `<div class="err">⚠️ آخر تحديث فشل: ${escH(loadErr)}</div>` : '')
    + `<div class="sbox" id="sBox"><input class="search" id="qSearch" type="search" inputmode="search" autocomplete="off" value="${escH(S.q)}"
         placeholder="🔍 الاسم · العطل · السيريال · رقم التذكرة" oninput="onSearch(this.value)"></div>`
    + `<div id="foundHost">${foundHtml()}</div>`;
  app.innerHTML = head + (S.tab === 'recent' ? viewRecent() : viewPhase(S.tab));
  mountSearchTools();
}

// ============================================================
// 🔎 أدوات البحث: زرار الباركود (موبايل) + فلاتر زي الاستقبال
//   الصفحة بتترسم من الأول كل تحديث، فبنركّبهم تاني كل مرة.
//   الفلاتر حالتها محفوظة باسم الخانة (qSearch) فمش بتضيع.
// ============================================================
function mountSearchTools(){
  const inp = $('qSearch'); if(!inp) return;
  if(window.IFixScan && IFixScan.mountButton(inp, onScanned)) $('sBox')?.classList.add('has-scan');
  if(window.IFixFilters) IFixFilters.attach(inp);
}
function fState(){
  return (window.IFixFilters && IFixFilters.state) ? IFixFilters.state('qSearch') : { fields:[], date:'', to:'', mode:'in' };
}

// 📷 الباركود اتقرا (كاميرا أو ماسح سلكي): بندوّر بيه — ولو جهاز واحد بس طلع
// بنفتح ورقة الفحص المناسبة على طول (استلام لو لسه مااتفحصش استلام، تسليم لو راجع من الورشة)
async function onScanned(text        ){
  const code = String(text || '').trim();
  if(!code) return;
  const inp = $('qSearch'); if(inp){ inp.value = code; }
  S.q = code; clearTimeout(findT);
  try{ S.found = await rpc('qc_find', { p_q: code }) || []; }
  catch(e     ){ S.found = { err: errMsg(e) }; }
  const h = $('foundHost'); if(h) h.innerHTML = foundHtml();
  if(Array.isArray(S.found) && S.found.length === 1){
    const x = S.found[0];
    const q = devs().find(y => y.id === x.id && !y.done);       // مستني فحص في القايمة؟
    openCheck(x.id, q ? q.phase : phaseOf(x));
  } else if(Array.isArray(S.found) && !S.found.length){
    toast('⚠️ الكود ده مش لأي جهاز في السيستم', true);
  }
}
function phaseOf(x     )         {
  return x.phase || (x.delivery || ['done','rejected','delivered'].includes(x.status) ? 'delivery' : 'intake');
}

// 🔫 الماسح السلكي على الكمبيوتر: بيكتب بسرعة جداً وينهي بـ Enter — حتى لو مفيش خانة عليها التركيز
let gScanBuf = '', gScanLast = 0;
document.addEventListener('keydown', e => {
  const now = Date.now();
  if(now - gScanLast > 120) gScanBuf = '';      // الإنسان أبطأ من كده بكتير
  gScanLast = now;
  if(e.key === 'Enter'){
    const buf = gScanBuf; gScanBuf = '';
    if(buf.replace(/[^0-9٠-٩]/g, '').length >= 10){ e.preventDefault(); closeSheet(); onScanned(buf); }
    return;
  }
  if(e.key && e.key.length === 1){ gScanBuf += e.key; if(gScanBuf.length > 60) gScanBuf = gScanBuf.slice(-60); }
}, true);
function go(k        ){ S.tab = k; render(); window.scrollTo(0, 0); }

function devCard(x       )         {
  const ph = x.phase;
  const reg = ph === 'delivery' && x.done ? QC.regress(x.intake, x.delivery) : [];
  const cls = !x.done ? 'todo' : reg.length ? 'reg' : 'done';
  const pill = !x.done ? `<span class="pill acc">⏳ مستني ${ph === 'intake' ? 'فحص الاستلام' : 'فحص التسليم'}</span>`
             : reg.length ? `<span class="pill bad">⚠️ فيه ${reg.length} حاجة باظت</span>`
             : `<span class="pill ok">✅ اتفحص</span>`;
  const inS = x.intake ? QC.summary(x.intake) : null;
  const outcome = x.outcome === 'fixed' ? '✅ الورشة: المشكلة اتحلّت' : x.outcome === 'rejected' ? '🚫 الورشة: الجهاز اترفض' : '';
  const statusTxt = ({ waiting:'🛎️ قيد الانتظار', returned:'🔁 مرتجع', done:'🟢 تم الصيانة',
                      rejected:'🔴 تم الرفض' }                          )[x.status] || x.status;
  return `<div class="card ${cls}">
    <div class="c-top"><div class="c-t">📱 ${escH(x.label)}</div>${pill}</div>
    <div class="c-s">${escH(statusTxt)}${x.since ? ' · ' + ago(x.since) : ''}${x.color ? ' · 🎨 ' + escH(x.color) : ''}${x.serial ? ' · <b dir="ltr">' + escH(x.serial) + '</b>' : ''}</div>
    ${x.issue ? `<div class="box">🛠️ العطل: ${escH(x.issue)}</div>` : ''}
    ${ph === 'delivery' && outcome ? `<div class="c-s"><b>${outcome}</b></div>` : ''}
    ${ph === 'delivery' ? (inS ? `<div class="c-s">🛎️ وقت الاستلام: ✅ ${inS.ok}${inS.bad ? ' · ❌ ' + inS.bad : ''}${inS.na ? ' · ➖ ' + inS.na : ''} (${escH(x.intake .by_name)})</div>`
                                : `<div class="c-s" style="color:var(--wait)">⚠️ الجهاز ده ما اتفحصش وقت الاستلام</div>`) : ''}
    ${x.done ? `<div class="c-s">🧪 ${escH((x[ph] || {}).by_name || '')} · ${dt((x[ph] || {}).at)}</div>` : ''}
    <div class="acts"><button class="btn ${x.done ? '' : 'pri'}" onclick="openCheck('${x.id}','${ph}')">${x.done ? '🔁 افحصه تاني' : '🧪 افحص'}</button></div>
  </div>`;
}
function viewPhase(ph        )         {
  const list = ofPhase(ph);
  const todo = list.filter(x => !x.done);
  const done = list.filter(x => x.done);
  const hint = ph === 'intake'
    ? 'أجهزة لسه «قيد الانتظار» (أو رجعت مرتجع) — افحصها قبل ما الفني يبدأ. الأقدم فوق.'
    : 'أجهزة «تم الصيانة» أو «تم الرفض» ولسه ماتسلّمتش — افحصها قبل ما تتسلّم للعميل. جنب كل بند هتلاقي كان إيه وقت الاستلام.';
  return `<div class="hint">${hint}</div>
    <div class="sec-h">⏳ مستنية فحص <span class="c">${todo.length}</span><span class="rule"></span></div>
    ${todo.length ? `<div class="list">${todo.map(devCard).join('')}</div>` : '<div class="empty">✨ مفيش أجهزة مستنية دلوقتي</div>'}
    ${done.length ? `<div class="sec-h">✅ اتفحصت <span class="c">${done.length}</span><span class="rule"></span></div><div class="list">${done.map(devCard).join('')}</div>` : ''}`;
}
function viewRecent()         {
  const r = (Q .recent || []);
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
let findT      = 0;
let findSeq = 0;
function onSearch(v        ){
  S.q = v;
  clearTimeout(findT);
  findT = setTimeout(async () => {
    const q = String(v || '').trim();
    const f = fState();
    // كلمتين على الأقل (أو تاريخ متحدد) — غير كده مفيش بحث
    if(q.length < 2 && !f.date){ S.found = null; const h = $('foundHost'); if(h) h.innerHTML = ''; return; }
    const my = ++findSeq;
    let res     ;
    try{
      res = await rpc('qc_find', { p_q: q, p_fields: f.fields.length ? f.fields : null,
                                   p_from: f.date || null, p_to: f.to || null, p_mode: f.mode });
      res = res || [];
    }
    catch(e     ){ res = { err: errMsg(e) }; }
    if(my !== findSeq) return;                 // جه بحث أحدث وإحنا مستنيين — سيبه هو
    S.found = res;
    const h = $('foundHost'); if(h) h.innerHTML = foundHtml();
  }, 350);
}
function foundHtml()         {
  if(!S.found) return '';
  if(S.found.err) return `<div class="err">${escH(S.found.err)}</div>`;
  if(!S.found.length) return '<div class="empty" style="margin-bottom:12px;">مفيش جهاز بالبحث ده</div>';
  return `<div class="sec-h">🔎 نتيجة البحث <span class="c">${S.found.length}</span><span class="rule"></span></div>` + (S.found           ).map(x => {
    const ph = phaseOf(x);
    return `<div class="card">
      <div class="c-top"><div class="c-t">📱 ${escH(x.label)}</div><span class="pill">${escH(({ waiting:'قيد الانتظار', diagnosing:'جاري الكشف', repairing:'جاري الصيانة', done:'تم الصيانة', delivered:'اتسلّم', rejected:'تم الرفض', returned:'مرتجع' })[x.status] || x.status)}</span></div>
      <div class="c-s">${x.serial ? '<b dir="ltr">' + escH(x.serial) + '</b> · ' : ''}${x.intake ? '🛎️ اتفحص استلام' : '🛎️ ما اتفحصش استلام'} · ${x.delivery ? '📦 اتفحص تسليم' : '📦 ما اتفحصش تسليم'}</div>
      ${(x.customer || x.shop) ? `<div class="c-who">👤 ${escH(x.customer || '—')}${x.shop ? ' · 🏪 ' + escH(x.shop) : ''}</div>` : ''}
      ${x.issue ? `<div class="c-who">🛠️ ${escH(x.issue)}</div>` : ''}
      <div class="acts"><button class="btn${ph === 'intake' ? ' pri' : ''}" onclick="openCheck('${x.id}','intake',true)">🛎️ فحص استلام</button>
        <button class="btn${ph === 'delivery' ? ' pri' : ''}" onclick="openCheck('${x.id}','delivery',true)">📦 فحص تسليم</button></div>
    </div>`;
  }).join('') + '<div style="height:6px"></div>';
}

// ============================================================
// 🧪 ورقة الفحص
// ============================================================
const F                                                                                                                                                  = { dev:null, phase:'intake', power:true, ans:{}, notes:'', battery:'', busy:false, tried:false };
const drafts                      = {};   // id@phase → اللي اتكتب لو قفل الورقة بالغلط

function findDev(id        )               {
  return devs().find(x => x.id === id) || ((Array.isArray(S.found) && S.found.find(x => x.id === id)) || null);
}
function openCheck(id        , phase        ){
  const x = findDev(id); if(!x) return;
  const key = id + '@' + phase;
  const prev = x[phase];   // آخر فحص من نفس النوع (لو بيعيد)
  Object.assign(F, { dev:x, phase, busy:false, tried:false });
  if(drafts[key]) Object.assign(F, JSON.parse(JSON.stringify(drafts[key])), { dev:x, phase, busy:false, tried:false });
  else {
    F.power = true; F.ans = {}; F.notes = ''; F.battery = '';
    // 🔁 بيعيد الفحص؟ → بنبدأ من آخر إجابات عشان مايكتبش كله من الأول
    if(prev && Array.isArray(prev.items)){
      (prev.items            ).forEach(it => { F.ans[it.k] = { s: it.s, n: it.n || '' }; });
      F.power = prev.power_on !== false; F.notes = prev.notes || '';
      F.battery = prev.battery_health == null ? '' : String(prev.battery_health);
    }
  }
  sheet();
  fetchLock(id);
}
function saveDraft(){ if(F.dev) drafts[F.dev.id + '@' + F.phase] = { power:F.power, ans:F.ans, notes:F.notes, battery:F.battery }; }

function wasOf(k        )                {
  if(F.phase !== 'delivery' || !F.dev || !F.dev.intake) return null;
  const it = (F.dev.intake.items || []).find(i => i.k === k);
  return it || null;
}
function counts(){
  let done = 0, total = 0;
  QC.FLAT.forEach(it => { total++; const a = F.ans[it.k]; if(a && a.s && !(a.s === 'bad' && String(a.n || '').trim().length < 2)) done++; });
  return { done, total };
}
function itemHtml(it           )         {
  const a = F.ans[it.k] || {}         ;
  const locked = !F.power && !it.off;
  const w = wasOf(it.k);
  const regr = w && w.s === 'ok' && a.s === 'bad';
  const miss = F.tried && (!a.s || (a.s === 'bad' && String(a.n || '').trim().length < 2));
  const b = (s        , ic        , t        ) => `<button class="${s}${a.s === s ? ' on ' + s : ''}" title="${t}" ${locked ? 'disabled' : ''} onclick="setAns('${it.k}','${s}')">${ic}</button>`;
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
// 🔒 باسورد الجهاز — عشان مسؤول الفحص يقدر يفتح الجهاز ويجرّبه
//   بيتجاب لوحده لما الورقة تتفتح (qc_lock) — مش مع القايمة كلها عشان صور النمط تقيلة
const LOCKS                      = {};   // id → { lockType, lockText, lockImage } | 'loading' | 'err'
async function fetchLock(id        ){
  if(LOCKS[id] && LOCKS[id] !== 'err') return;
  LOCKS[id] = 'loading';
  try{ LOCKS[id] = await rpc('qc_lock', { p_device_id: id }) || {}; }
  catch(e     ){ LOCKS[id] = 'err'; }
  if(F.dev && F.dev.id === id) reSheet();
}
function lockHtml(x     )         {
  const L = LOCKS[x.id];
  if(!L || L === 'loading') return '<div class="box">🔒 جاري تحميل باسورد الجهاز…</div>';
  if(L === 'err') return `<div class="box">⚠️ الباسورد ما اتحمّلش — <a href="#" onclick="fetchLock('${escH(x.id)}');return false;">جرّب تاني</a></div>`;
  if(L.lockType === 'text' && L.lockText)
    return `<div class="box">🔒 باسورد الجهاز: <b dir="ltr" style="font-family:monospace;font-size:16px;letter-spacing:1px;">${escH(L.lockText)}</b></div>`;
  if((L.lockType === 'pattern' || L.lockType === 'image') && L.lockImage)
    return `<div class="box">🔒 ${L.lockType === 'pattern' ? 'نمط القفل' : 'صورة القفل'}:<br><img src="${escH(L.lockImage)}" alt="" style="margin-top:6px;width:130px;height:130px;object-fit:contain;border:1px solid var(--line);border-radius:10px;background:var(--card);"></div>`;
  return '<div class="box">🔓 مفيش باسورد مسجّل للجهاز</div>';
}
function sheetBody()         {
  const x = F.dev ;
  const P = QC.PHASE[F.phase];
  const inS = F.phase === 'delivery' && x.intake ? QC.summary(x.intake) : null;
  const regs = F.phase === 'delivery' && x.intake ? QC.FLAT.filter(it => { const w = wasOf(it.k); const a = F.ans[it.k]; return w && a && w.s === 'ok' && a.s === 'bad'; }) : [];
  return `<div class="dev">
      <div class="c-t">📱 ${escH(x.label)}</div>
      <div class="c-s">${x.color ? '🎨 ' + escH(x.color) + ' · ' : ''}${x.serial ? '<b dir="ltr">' + escH(x.serial) + '</b>' : 'مفيش سيريال'}</div>
      ${lockHtml(x)}
      ${x.issue ? `<div class="box">🛠️ العطل اللي العميل قاله: ${escH(x.issue)}</div>` : ''}
      ${x.condition ? `<div class="box">📝 الاستقبال كتب: ${escH(x.condition)}</div>` : ''}
      ${F.phase === 'delivery' ? (x.outcome === 'fixed' ? '<div class="c-s"><b>✅ الورشة قالت: المشكلة اتحلّت</b></div>' : x.outcome === 'rejected' ? '<div class="c-s"><b>🚫 الورشة قالت: الجهاز اترفض</b></div>' : '') : ''}
    </div>
    ${F.phase === 'delivery' && !x.intake ? '<div class="warnbox">⚠️ الجهاز ده ما اتفحصش وقت الاستلام — مفيش حاجة نقارن بيها.</div>' : ''}
    ${inS ? `<div class="hint">🛎️ وقت الاستلام (${escH(x.intake .by_name)} · ${dt(x.intake .at)}): ✅ ${inS.ok}${inS.bad ? ' · ❌ ' + inS.bad : ''}${inS.na ? ' · ➖ ' + inS.na : ''} — مكتوب جنب كل بند.</div>` : ''}
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
function progTxt()         { const c = counts(); return c.done + ' / ' + c.total; }
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
function closeSheet(silent          ){
  const o = $('sheetOv'); if(o) o.remove(); document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeSheet(); });

function setAns(k        , s        ){
  const a = F.ans[k] || {}         ;
  F.ans[k] = { s, n: (s === a.s || s !== 'ok') ? (a.n || '') : '' };
  saveDraft(); reSheet();
  if(s === 'bad') setTimeout(() => { const i = document.querySelector                  ('#it_' + k + ' input.note'); if(i) i.focus(); }, 30);
}
function setNote(k        , v        ){
  F.ans[k] = Object.assign({}, F.ans[k] || {}, { n: v });
  saveDraft();
  const p = $('fProg'); if(p) p.textContent = progTxt();
}
function setPower(on         ){
  F.power = on;
  QC.FLAT.forEach(it => {
    if(it.off) return;
    if(!on) F.ans[it.k] = { s:'na', n:'الجهاز مش بيفتح', auto:true };
    else if(F.ans[it.k] && F.ans[it.k].auto) delete F.ans[it.k];
  });
  saveDraft(); reSheet();
}
function allOk(g        ){
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
    await rpc('qc_save', { p_device_id: F.dev .id, p_phase: F.phase, p_power_on: !!F.power, p_items: items,
                           p_notes: String(F.notes || '').trim(), p_battery: bat === '' ? null : Math.min(100, Number(bat)) });
    delete drafts[F.dev .id + '@' + F.phase];
    const bad = items.filter(i => i.s === 'bad').length;
    closeSheet();
    toast('💾 ' + QC.PHASE[F.phase].t + ' اتحفظ' + (bad ? ' — ❌ ' + bad + ' فيه مشكلة' : ' — ✅ كله سليم'));
    S.found = null; S.q = '';
    load();
  }catch(e     ){ F.busy = false; reSheet(); toast(errMsg(e), true); }
}

// ============================================================
// قايمة التلت نقط + الخروج
// ============================================================
function toggleKebab(){
  const m = $('kebabMenu') , sh = $('kebabShield') ;
  const open = m.classList.contains('hidden');
  m.classList.toggle('hidden', !open); sh.classList.toggle('hidden', !open);
}
function closeKebab(){ $('kebabMenu') .classList.add('hidden'); $('kebabShield') .classList.add('hidden'); }
async function doLogout(){
  if(!confirm('تسجيل الخروج؟')) return;
  try{ await sb.auth.signOut(); }catch(e     ){}
  location.href = 'index.html';
}
