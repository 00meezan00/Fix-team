// ============================================================
// I Fix Team — شاشة «مرتبك» المشتركة (payroll.js)
// ------------------------------------------------------------
// الموظف بيشوف خصوماته وأسبابها. يدوس «فهمت» فالخصم يختفي —
// **والمجموع تحت بيفضل زي ما هو**.
//
// ⚠️ الترتيب — بعد common.js:
//     <script src="common.js"></script>
//     <script src="payroll.js"></script>
//
// الصفحة لازم توفّر حاجتين بس:
//   • زرار في القايمة:  class="pay-menu-btn" onclick="openPayroll()"
//   • عنصر فاضي:        <div id="payOverlay" class="hidden"></div>
//
// وخلاص. الباقي (الاستايل · الجرس · البانر · العدّاد) الملف
// بيعمله بنفسه.
//
// ============================================================
// 🔴 ٤ قواعد الملف قايم عليها:
//
// ١) **الموبايل بس.** زي شاشة المواعيد. كمبيوتر المحل مشترك،
//    فمرتب أي حد يبقى مكشوف لأي حد قاعد عليه.
//
// ٢) **«فهمت» بيعلّم مش بيمسح.** الصف بيفضل في قاعدة البيانات
//    للأبد. لو مسحناه، المجموع هيقل ومحدش هيعرف ليه.
//
// ٣) **المجموع من السيرفر مش من الجافاسكريبت.** الشاشة بتحمّل
//    آخر ٣٠٠ خصم بس. لو جمعنا اللي محمّل هيبقى ناقص في صمت.
//    دالة hr_my_deduction_totals بتعدّ على كل الصفوف.
//
// ٤) **الملف مش بيعتمد على أي متغيّر من الصفحة.** بيقرا
//    data-theme من <html> ويعرّف ألوانه بنفسه — نفس درس
//    attendance.js. أي صفحة جديدة هتشتغل من غير أي تعديل.
//
// 🧾 (ملف 68) المحاسب العام مالوش «مرتبك» — ليه شاشة لوحده
//    «🧾 كشف مرتبي»: بيكتب فيها مرتبه، ويشوف مسحوباته شهر بشهر،
//    ويدوس «تم صرف الراتب» بنفسه. ومن غير أي جرس ولا بانر.
//    الملف بيعمل الزرار في القايمة لوحده جنب «مرتبك».
// ============================================================

// ⚙️ مفتاح الإشعارات خارج التطبيق (VAPID public key).
//    سيبه فاضي = كل حاجة تشتغل عادي **من غير** إشعار خارجي.
//    عايز تشغّله؟ اقرا 34-push-subscriptions.sql — فيه الخطوات.
const PAY_VAPID_PUBLIC_KEY = '';

let _payRows   = [];   // الخصومات اليدوية
let _payLate   = [];   // خصومات التأخير (محسوبة في السيرفر)
let _payWaiv   = [];   // رسايل «الخصم اتشال»
let _paySlips  = [];   // كشوف الرواتب — شهر بشهر
// 🗄️ الدرجين: الشهر اللي بيعرضوه + مفتوحين ولا لأ
//    (بيفضلوا زي ما هم لو الشاشة اترسمت تاني بعد «فهمت»)
let _payPeriod = null;               // { from:'YYYY-MM-01', to:'YYYY-MM-DD' }
let _payOpen   = { wd:false, ded:false, exw:false };
// 🔗 درج «اسمي في الإكسل» — للمحاسب العام بس (migration 66)
//    null = لسه ماتقراش · { allowed:false } = مش ليك · { allowed:true, … } = ليك
let _payExw    = null;
let _payExwErr = '';
// ⚠️ wd_* = المسحوبات (فلوس الموظف أخدها مقدّم) — دي **مش** خصم.
//    الاتنين بيقلّلوا الصافي، بس الخصم عقوبة والمسحوبات فلوسه هو.
//    دمجهم في رقم واحد بيخلّي الموظف يعترض على حاجة مالهاش لزمة.
const PAY_EMPTY = { total_all:0, total_month:0, unseen_count:0, unseen_amount:0,
                    salary:0, has_salary:false, late_month:0, late_all:0,
                    late_unseen_count:0, net_month:0, wd_month:0, wd_all:0 };
let _payTotals = Object.assign({}, PAY_EMPTY);
let _payErr    = '';
let _payBusy   = false;
let _payLoaded = false;
// 🧾 المحاسب العام (ملف 68) — null = لسه مش عارفين · true/false
let _paySelf     = null;
let _selfData    = null;   // رد hr_self_payroll
let _selfErr     = '';
let _selfOpenOld = false;  // سجل الشهور المصروفة مفتوح؟
let _selfOpenWd  = {};     // 'YYYY-MM' → تفاصيل الشهر مفتوحة؟
let _selfBusy    = false;

// ===== هل ده موبايل؟ =====
// ⚠️ نفس منطق attIsPhone بالحرف — بس متكرّر عن قصد عشان
//    payroll.js يشتغل حتى في صفحة مش محمّلة attendance.js.
//    التكرار هنا أرخص من اعتماد صامت بيقع.
function payIsPhone(){
  try{
    const ua = navigator.userAgent || '';
    const mobileUA = /iPhone|iPad|iPod|Android|Mobile/i.test(ua);
    const touch = (navigator.maxTouchPoints || 0) > 0;
    return mobileUA && touch;
  }catch(e){ return false; }
}

function payMoney(n){
  const v = Number(n || 0);
  return v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0,
                                     maximumFractionDigits: 2 });
}
// esc جاية من common.js — بس بنحط بديل لو الصفحة نسيت تحمّله
const _payEsc = (s) => (typeof esc === 'function')
  ? esc(s)
  : String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

// ============================================================
// القراءة
// ============================================================
async function payLoad(){
  _payErr = '';
  try{
    const { data:{ session } } = await sb.auth.getSession();
    const me = ((session && session.user && session.user.email) || '').toLowerCase();
    if(!me) throw new Error('مش مسجّل دخول');


    const t = await sb.rpc('hr_my_deduction_totals');
    if(t.error) throw t.error;
    const r = Array.isArray(t.data) ? t.data[0] : t.data;
    _payTotals = Object.assign({}, PAY_EMPTY, r || {});

    // ⚠️ خصومات التأخير **مش صفوف محفوظة** — بتتحسب لحظتها في
    //    السيرفر من سجل الحضور + المواعيد. عشان كده لو HR عدّلت
    //    ميعادك، الأيام القديمة بتتصحّح لوحدها.
    //    وبنبعت إيميلنا صراحةً: لو الحساب ده HR أو أدمن، السيرفر
    //    كان هيرجّع كل الموظفين لو سبناه فاضي.
    // ⚠️ بنجيب **كل التاريخ** مش الشهر الحالي بس. لو HR ظبطت
    //    ميعاد بأثر رجعي وطلع خصم على شهر فات، الموظف لازم ياخد
    //    خبر — والقايمة اللي تحت بتفلتر بالشهر لوحدها.
    const lp = await sb.rpc('hr_late_penalties',
      { p_email: me, p_from: null, p_to: null });
    if(lp.error) throw lp.error;
    _payLate = (lp.data || []).filter(x => Number(x.penalty) > 0 || x.waived);

    // رسايل «الخصم اتشال» — دي أخبار للموظف زي الخصم بالظبط
    const wv = await sb.from('hr_penalty_waivers')
      .select('work_date,reason,created_at,seen_at')
      .ilike('user_email', me)          // 🐞 نفس سبب فلتر الخصومات تحت
      .order('created_at', { ascending:false })
      .limit(100);
    if(wv.error) throw wv.error;
    _payWaiv = wv.data || [];

    // ⚠️ الكشف قبل الصرف **حي** وبعد الصرف **متجمّد**. الدالة
    //    بترجّع المحسوب لحد ما HR تدوس «تم صرف الراتب»، وساعتها
    //    بترجّع الصورة المحفوظة. عشان ورقة القبض ما تتغيّرش بأثر
    //    رجعي لو حصل تعديل في السجل بعد شهور.
    const sl = await sb.rpc('hr_payroll_periods', { p_email: me });
    if(sl.error) throw sl.error;
    _paySlips = sl.data || [];

    // ============================================================
    // 🗄️ شهر الدرجين = أقدم شهر **لسه ماتصرفش**
    // ------------------------------------------------------------
    // أول ما HR تدوس «تم صرف الراتب»، الشهر ده بيتقفل والدرجين
    // بيتنقلوا للشهر اللي بعده لوحدهم — مفيش حاجة تتمسح، الشهر
    // المصروف بيفضل في «سجل المرتبات المصروفة».
    // ============================================================
    _payPeriod = _payPickPeriod(_paySlips);

    // الخصومات والمسحوبات: بتاعة الشهر ده **+ أي حاجة لسه ما اتقراتش**
    // من أي شهر — عشان زرار «فهمت» ما يضيعش على خبر قديم.
    // ⚠️ kind لازم يكون هنا: هو اللي بيفرّق المسحوبات عن الخصم.
    // 🔴 waived_at و waive_reason **لازم يكونوا هنا** — من غيرهم الشاشة
    //    مش بتعرف إن الخصم اتشال وبتوري السبب الأصلي بدل سبب الشيل.
    // 🐞 ilike(me): HR والأدمن قاعدة البيانات بتوريهم خصومات **الكل**،
    //    فمن غير الفلتر ده شاشة «مرتبك» بتاعتهم كانت هتعرض خصومات
    //    كل الموظفين كأنها بتاعتهم. (ilike عشان حالة الحروف.)
    const DCOLS = 'id,amount,reason,work_date,kind,created_at,seen_at,waived_at,waive_reason';
    const [dm, du] = await Promise.all([
      sb.from('hr_deductions').select(DCOLS).ilike('user_email', me)
        .gte('work_date', _payPeriod.from).lte('work_date', _payPeriod.to)
        .order('created_at', { ascending:false }).limit(1000),
      sb.from('hr_deductions').select(DCOLS).ilike('user_email', me)
        .is('seen_at', null)
        .order('created_at', { ascending:false }).limit(300)
    ]);
    // ⚠️ Supabase مبيرميش خطأ — بيرجّعه في .error
    if(dm.error) throw dm.error;
    if(du.error) throw du.error;
    const seenIds = new Set();
    _payRows = [...(dm.data || []), ...(du.data || [])]
      .filter(r => !seenIds.has(r.id) && seenIds.add(r.id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    _payLoaded = true;
  }catch(e){
    // ⚠️ الفشل الصامت هنا خطر: الشاشة تقول «مفيش خصومات ✅»
    //    والموظف يفتكر إنه سليم وهو متخصوم. بنقول فيه مشكلة.
    console.error('payLoad failed:', e);
    _payErr    = (e && e.message) ? e.message : String(e);
    _payRows   = [];
    _payPeriod = null;
    _payLate   = [];
    _payWaiv   = [];
    _paySlips  = [];
    _payTotals = Object.assign({}, PAY_EMPTY);
    _payLoaded = false;
  }
  paySyncBadge();
}

// ============================================================
// الجرس: البانر في الصفحة الرئيسية + العدّاد على زرار القايمة
// ------------------------------------------------------------
// البانر بيتحقن تحت .topbar مباشرة. الصفحات التلاتة كلها
// بتبدأ بـ <div class="topbar">، ولو صفحة جديدة مالهاش topbar
// بيتحط في أول الـ body — مفيش حالة بيختفي فيها في صمت.
// ============================================================
function paySyncBadge(){
  const show = payIsPhone();

  // 🧾 المحاسب العام: «مرتبك» تستخبى، و«كشف مرتبي» تظهر مكانها.
  //    ومفيش نقطة حمرا ولا بانر — دي فلوسه هو، مش أخبار ليه.
  if(_paySelf === true){
    document.querySelectorAll('.pay-menu-btn').forEach(b => {
      b.style.display = 'none';
      _payEnsureSelfBtn(b, show);
    });
    document.querySelectorAll('.pay-dot').forEach(x => x.remove());
    payRenderBanner(false);
    return;
  }

  const n    = Number(_payTotals.unseen_count || 0);

  // (١) زرار القايمة: يظهر على الموبايل بس، وعليه العدد
  document.querySelectorAll('.pay-menu-btn').forEach(b => {
    b.style.display = show ? '' : 'none';
    if(!b.dataset.payLabel) b.dataset.payLabel = b.textContent.trim();
    b.textContent = b.dataset.payLabel + (n ? ` (${n})` : '');
  });

  // (٢) نقطة حمرا على زرار الثلاث نقط — عشان القايمة مقفولة
  const kebab = document.querySelector('.kebab-btn, .menu-btn, .icon-btn');
  if(kebab){
    let dot = kebab.querySelector('.pay-dot');
    if(show && n){
      if(!dot){
        kebab.style.position = kebab.style.position || 'relative';
        dot = document.createElement('span');
        dot.className = 'pay-dot';
        kebab.appendChild(dot);
      }
    }else if(dot){ dot.remove(); }
  }

  // (٣) البانر
  payRenderBanner(show && n > 0);
}

function payRenderBanner(on){
  let bar = document.getElementById('payBanner');
  if(!on){ if(bar) bar.remove(); return; }
  if(!bar){
    bar = document.createElement('div');
    bar.id = 'payBanner';
    bar.onclick = () => openPayroll();
    const top = document.querySelector('.topbar');
    if(top && top.parentNode) top.parentNode.insertBefore(bar, top.nextSibling);
    else document.body.insertBefore(bar, document.body.firstChild);
  }
  bar.innerHTML =
    '<span class="pay-bell">🔔</span>' +
    '<span class="pay-bn-txt">حصل تحديث في شاشة <b>مرتبك</b> — يرجى الاطلاع عليه</span>' +
    '<span class="pay-bn-go">افتح ›</span>';
}

// ============================================================
// الشاشة
// ============================================================
async function openPayroll(){
  // المحاسب العام → شاشته هو (لو وصل هنا من أي زرار قديم)
  if(_paySelf === true) return openSelfPay();
  if(!payIsPhone()){
    alert('شاشة «مرتبك» بتتفتح من الموبايل بس');
    return;
  }
  const ov = document.getElementById('payOverlay');
  if(!ov){ console.error('payroll: العنصر #payOverlay مش موجود في الصفحة'); return; }
  ov.classList.remove('hidden');
  payRender('⏳ جاري التحميل…');
  // ⚠️ درج الإكسل بيتقرا هنا بس (لما الشاشة تتفتح) — مش في payBoot.
  //    payBoot بيشتغل عند **كل** موظف مع كل رجوع للتطبيق، ومفيش
  //    داعي نسأل السيرفر سؤال إجابته «مش ليك» كل مرة.
  await Promise.all([payLoad(), payExwLoad()]);
  payRender('');
}
function closePayroll(){
  const ov = document.getElementById('payOverlay');
  if(ov) ov.classList.add('hidden');
}

function payRender(busyMsg){
  const ov = document.getElementById('payOverlay');
  if(!ov) return;

  // خبر «مرتبك اتصرف» — ده مش خصم، فبيفضل فوق برّه الدرجين
  const paidNews = _paySlips.filter(p => p.paid && !p.seen_at);

  ov.innerHTML = `
    <div class="pay-page">
      <div class="pay-head">
        <h2>💰 مرتبك</h2>
        <button class="pay-close" onclick="closePayroll()">×</button>
      </div>
      <div class="pay-body">

        ${_payErr ? `<div class="pay-warn">⚠️ مقدرناش نقرا خصوماتك — الأرقام تحت
          <b>مش مضمونة</b>. حدّث الصفحة أو كلّم الإدارة.
          <span class="pay-warn-d">${_payEsc(_payErr)}</span></div>` : ''}

        ${busyMsg ? `<div class="pay-busy">${_payEsc(busyMsg)}</div>` : ''}

        ${paidNews.map(payPaidSlipCard).join('')}

        ${paySlipsHtml()}

        ${(busyMsg || _payErr || !_payPeriod) ? '' : payDrawersHtml()}

        ${payPushBtnHtml()}
      </div>
    </div>`;
}

// ============================================================
// 🗄️ الدرجين: درج المسحوبات · درج الخصومات
// ------------------------------------------------------------
// مقفولين دايماً لحد ما الموظف يدوس. من برّه **الاسم بس** —
// مفيش أرقام ولا تفاصيل تحت الزرار.
//
// ⚠️ الاستثناء الوحيد: نقطة حمرا صغيرة جنب الاسم لو جوه الدرج حاجة
//    لسه ما اتقراتش. من غيرها البانر بيقول «حصل تحديث» والموظف
//    يفتح الشاشة يلاقي درجين مقفولين ومش عارف يدوّر فين — والخصم
//    يعدّي من غير «فهمت».
//
// جوه كل درج: حاجات **شهر الدرجين** (_payPeriod) + أي خبر لسه
// ما اتقراش من شهر تاني.
// ============================================================
function _payInPeriod(wd){
  const d = String(wd || '').slice(0, 10);
  return !!_payPeriod && d >= _payPeriod.from && d <= _payPeriod.to;
}

// أقدم شهر لسه ماتصرفش. لو كله اتصرف → الشهر اللي بعد آخر صرف
// (أو الشهر الحالي لو هو أبعد).
function _payPickPeriod(slips){
  const ymd = v => String(v || '').slice(0, 10);
  const due = (slips || []).filter(p => !p.paid).map(p => ymd(p.period)).sort();
  let from;
  if(due.length){
    from = due[0];
  }else{
    const paid = (slips || []).filter(p => p.paid).map(p => ymd(p.period)).sort();
    const cur  = _payMonthStart();
    let next = cur;
    if(paid.length){
      const [y, m] = paid[paid.length - 1].split('-').map(Number);
      // Date.UTC(y, m, 1) = أول الشهر اللي بعده (الشهور في JS من صفر)
      next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
    }
    from = next > cur ? next : cur;
  }
  const [y, m] = from.split('-').map(Number);
  // اليوم صفر من الشهر اللي بعده = آخر يوم في الشهر ده
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { from, to };
}

function payDrawersHtml(){
  // ---- المسحوبات ----
  const wd = _payRows.filter(r => r.kind === 'withdrawal'
                               && (_payInPeriod(r.work_date) || !r.seen_at));
  const wdNew = wd.filter(r => !r.seen_at);
  const wdOld = wd.filter(r =>  r.seen_at);

  // ---- الخصومات (من الإدارة + تأخير/بريك) ----
  const man = _payRows.filter(r => r.kind !== 'withdrawal'
                                && (_payInPeriod(r.work_date) || !r.seen_at));
  const manNew = man.filter(r => !r.seen_at);
  const manOld = man.filter(r =>  r.seen_at);
  const lateNew = _payLate.filter(r => Number(r.penalty) > 0 && !r.waived && !r.acked);
  const lateOld = _payLate.filter(r => _payInPeriod(r.work_date)
                                    && !(Number(r.penalty) > 0 && !r.waived && !r.acked));
  const waivNew = _payWaiv.filter(w => !w.seen_at);

  const wdCount  = wdNew.length;
  const dedCount = manNew.length + lateNew.length + waivNew.length;
  const month = _paySlipMonth(_payPeriod.from);

  const drawer = (key, title, dot, body) => `
    <button class="pay-drw${_payOpen[key] ? ' open' : ''}" onclick="payToggleDrawer('${key}')">
      <span class="pay-drw-t">${title}${dot ? '<i class="pay-drw-dot"></i>' : ''}</span>
      <span class="pay-drw-a">${_payOpen[key] ? '▴' : '▾'}</span>
    </button>
    ${_payOpen[key] ? `<div class="pay-drw-body">
      <div class="pay-drw-m">🗓️ ${_payEsc(month)}</div>
      ${body}
    </div>` : ''}`;

  // ⚠️ الإجماليات في كارت المرتب فوق — الدرج تفاصيل بس
  const wdBody = (wd.length
    ? wdNew.map(r => r.waived_at ? payWaivedDedCard(r) : payCard(r)).join('')
      + wdOld.map(payCard).join('')
    : `<div class="pay-drw-empty">مفيش مسحوبات في الشهر ده</div>`);

  const dedBody = (man.length || lateNew.length || lateOld.length || waivNew.length)
    ? manNew.map(r => r.waived_at ? payWaivedDedCard(r) : payCard(r)).join('')
      + lateNew.map(payLateCard).join('')
      + waivNew.map(payWaivedLateCard).join('')
      + manOld.map(payCard).join('')
      + (lateOld.length ? `<div class="pay-late">${lateOld.map(payLateRow).join('')}</div>` : '')
    : `<div class="pay-drw-empty">مفيش خصومات في الشهر ده ✅</div>`;

  return `
    <div class="pay-drws">
      ${drawer('wd',  '🔩 درج المسحوبات', wdCount,  wdBody)}
      ${drawer('ded', '💸 درج الخصومات',  dedCount, dedBody)}
      ${payExwDrawerHtml()}
    </div>`;
}

function payToggleDrawer(key){
  _payOpen[key] = !_payOpen[key];
  payRenderAny();   // الدرج ممكن يكون في «مرتبك» أو في «كشف مرتبي»
}

// ============================================================
// كشف المرتب
// ------------------------------------------------------------
// ⚠️ has_salary مش نفس salary > 0.
//    مرتب = صفر معناه «HR كتبته صفر».
//    مفيش مرتب خالص معناه «لسه ماتحددش».
//    لو خلطناهم، الموظف اللي HR نسيت تكتب مرتبه هيقرا «مرتبك ٠
//    ج.م» — وده أسوأ بكتير من إننا نقوله «لسه ماتحددش».
// ============================================================
// ============================================================
// 🧾 كشوف الرواتب
// ------------------------------------------------------------
// اللي لسه ماتصرفش **برّه** — عشان الموظف يشوف مستحقاته على طول.
// واللي اتصرف **جوه سجل مطوي** — عشان الشاشة ما تبقاش طابور
// كروت قديمة بعد سنة.
//
// ⚠️ الكشف المصروف عليه قفل 🔒 وتاريخ الصرف. الأرقام دي مش
//    بتتغيّر تاني مهما حصل تعديل في السجل بعد كده.
// ============================================================
function paySlipsHtml(){
  if(!_paySlips.length){
    // مفيش كشوف خالص = لسه ماتحددش مرتب ومفيش خصومات
    return `<div class="pay-tot">
      <div class="pay-tot-hint">💵 مرتبك لسه ماتحددش في النظام —
        كلّم شؤون العاملين.</div></div>`;
  }

  const due  = _paySlips.filter(p => !p.paid);
  const paid = _paySlips.filter(p =>  p.paid);

  return `
  ${due.length ? `
    <div class="pay-sec dim">💰 مرتباتك المستحقة</div>
    ${due.map((p, i) => paySlipCard(p, i === 0)).join('')}` : ''}

  ${paid.length ? `
    <button class="pay-more" onclick="paySlipsToggle()">
      <span id="paySlipArrow">▾</span> 📜 سجل المرتبات المصروفة (${paid.length})
    </button>
    <div id="paySlipOld" class="pay-old hidden">
      ${paid.map(p => paySlipCard(p, false)).join('')}
    </div>` : ''}`;
}

function paySlipsToggle(){
  const box = document.getElementById('paySlipOld');
  const arw = document.getElementById('paySlipArrow');
  if(!box) return;
  box.classList.toggle('hidden');
  if(arw) arw.textContent = box.classList.contains('hidden') ? '▾' : '▴';
}

function _paySlipMonth(p){
  return new Date(p).toLocaleDateString('ar-EG', { month:'long', year:'numeric' });
}

// ============================================================
// سطور الأوفر تايم
// ------------------------------------------------------------
// ⚠️ بنكتب الحساب كامل قدام الموظف: ساعات الزيادة، والناقصة،
//    والصافي، وسعر ساعته. الرقم اللي الموظف مش فاهم جاي منين
//    بيتحوّل لشك — حتى لو كان في صالحه.
// ============================================================
function paySlipOvertime(p){
  const om  = Number(p.over_min  || 0);
  const sm  = Number(p.short_min || 0);
  const nm  = Number(p.net_min   || 0);
  const amt = Number(p.overtime_amt || 0);
  if(!om && !sm) return '';

  const plus = nm >= 0;
  return `
    <div><span>ساعات زيادة</span><b style="color:var(--p-green)">${_payDur(om)}</b></div>
    <div><span>ساعات ناقصة</span><b class="minus">${_payDur(sm)}</b></div>
    <div style="border-top:1px dashed var(--p-line);padding-top:7px;margin-top:3px;">
      <span>${plus ? '+ أوفر تايم' : '− عجز ساعات'}
        <small style="opacity:.75;">${_payDur(Math.abs(nm))} × ${
          Number(p.hour_value || 0).toFixed(2)} ج.م/س</small></span>
      <b style="color:${plus ? 'var(--p-green)' : 'var(--p-red)'}">${payMoney(Math.abs(amt))}</b>
    </div>`;
}

// ============================================================
// 💵 سطر «إجازات ما اتاخدتش» (ملف 71)
// ------------------------------------------------------------
// الموظف خد إجازات أقل من المسموح → بياخد على كل يوم زيادة فلوس،
// بعد ما HR تعتمدها. بالموجب وبالأخضر — دي فلوس ليه مش عليه.
// ============================================================
function payLeaveBonusLine(p){
  const v = Number(p && p.leave_bonus || 0);
  if(!v) return '';
  return `<div><span>+ إجازات ما اتاخدتش
      <small style="opacity:.75;">أيام إجازة ما خدتهاش</small></span>
    <b style="color:var(--p-green)">${payMoney(v)}</b></div>`;
}

// big = الكشف الحالي: الرقم الكبير فوق. الباقي مضغوط.
function paySlipCard(p, big){
  return `
  <div class="pay-tot slip${p.paid ? ' paid' : ''}">
    <div class="pay-slip-h">
      <b>${_payEsc(_paySlipMonth(p.period))}</b>
      <span class="pay-slip-tag ${p.paid ? 'ok' : 'wait'}">${
        p.paid ? '✅ اتصرف' : '⏳ لسه'}</span>
    </div>

    ${big ? `
      <div class="pay-tot-big" style="margin-top:10px;">
        <span class="pay-tot-n net">${payMoney(p.net)}</span>
        <span class="pay-tot-c net">ج.م</span>
      </div>
      <div class="pay-tot-l">صافي مرتبك</div>` : ''}

    <div class="pay-calc">
      <div><span>المرتب</span><b>${payMoney(p.salary)}</b></div>
      ${p.paid ? `
      <div><span>− خصومات يدوية</span><b class="minus">${payMoney(p.manual_ded)}</b></div>
      ${Number(p.withdraw_ded) ? `<div><span>− مسحوبات
        <small style="opacity:.75;">فلوس خدتها مقدّم</small></span>
        <b class="minus">${payMoney(p.withdraw_ded)}</b></div>` : ''}
      <div><span>− خصومات تأخير</span><b class="minus">${payMoney(p.late_ded)}</b></div>`
      /* 🗄️ الشهر اللي لسه ماتصرفش: **إجمالي** المسحوبات وإجمالي
         الخصومات هنا في الكارت، والتفاصيل جوه الدرجين تحت.
         الخصومات = يدوية + تأخير/بريك مع بعض — زي درج الخصومات.
         (الشهور المصروفة بتفضل مفصّلة زي ما هي — دي ورقة قبض.) */
      : `
      <div><span>− إجمالي المسحوبات</span><b class="minus">${payMoney(p.withdraw_ded)}</b></div>
      <div><span>− إجمالي الخصومات</span><b class="minus">${
        payMoney(Number(p.manual_ded || 0) + Number(p.late_ded || 0))}</b></div>`}
      ${paySlipOvertime(p)}
      ${payLeaveBonusLine(p)}
      <div class="eq"><span>= الصافي</span><b>${payMoney(p.net)}</b></div>
    </div>

    ${p.paid ? `<div class="pay-slip-meta">🔒 اتصرف
      ${_payEsc(new Date(p.paid_at).toLocaleDateString('ar-EG',
        { day:'numeric', month:'long', year:'numeric' }))}
      — الأرقام دي متقفلة ومش بتتغيّر.</div>` : ''}

  </div>`;
}

// كارت خبر «مرتبك اتصرف»
function payPaidSlipCard(p){
  return `
  <div class="pay-card good">
    <div class="pay-card-top">
      <div class="pay-amt good">💵 اتصرف</div>
      <div class="pay-when">${_payEsc(new Date(p.paid_at).toLocaleDateString('ar-EG',
        { day:'numeric', month:'long' }))}</div>
    </div>
    <div class="pay-why">تم صرف راتب <b>${_payEsc(_paySlipMonth(p.period))}</b>.</div>
    <div class="pay-calc" style="margin-top:10px;">
      <div><span>المرتب</span><b>${payMoney(p.salary)}</b></div>
      <div><span>− الخصومات</span><b class="minus">${payMoney(
        Number(p.manual_ded || 0) + Number(p.late_ded || 0))}</b></div>
      ${Number(p.withdraw_ded) ? `<div><span>− مسحوبات</span>
        <b class="minus">${payMoney(p.withdraw_ded)}</b></div>` : ''}
      ${Number(p.overtime_amt) ? `<div><span>${
        Number(p.overtime_amt) >= 0 ? '+ أوفر تايم' : '− عجز ساعات'}</span>
        <b style="color:${Number(p.overtime_amt) >= 0 ? 'var(--p-green)' : 'var(--p-red)'}">${
          payMoney(Math.abs(Number(p.overtime_amt)))}</b></div>` : ''}
      ${payLeaveBonusLine(p)}
      <div class="eq"><span>= اللي قبضته</span><b>${payMoney(p.net)}</b></div>
    </div>
    <button class="pay-ok-btn" onclick="payAckSlip('${_payEsc(p.period)}')">👍 فهمت</button>
  </div>`;
}

async function payAckSlip(period){
  if(_payBusy) return;
  _payBusy = true;
  try{
    const { error } = await sb.rpc('hr_ack_payslip', { p_period: period });
    // ⚠️ Supabase مبيرميش خطأ — بيرجّعه في .error
    if(error) throw error;
    await payLoad();
    payRender('');
  }catch(e){
    console.error('payAckSlip failed:', e);
    alert('❌ مقدرناش نسجّل إنك قريته: ' + (e.message || e));
  }finally{
    _payBusy = false;
  }
}

// ============================================================
// 🧾 «كشف مرتبي» — شاشة المحاسب العام لوحده (ملف 68)
// ------------------------------------------------------------
// 🧸 بالبلدي:
//    «مرتبك» معمولة للموظف: كل سحبة جرس، وكل جرس عايز «فهمت».
//    إنت اللي بتسحب، فمش محتاج حد يقولك إنك سحبت. عشان كده ليك
//    شاشة هادية لوحدك فيها ٣ حاجات بس:
//      💵 خانة «مرتبي» — بتكتب فيها مرتبك
//      🗓️ كارت لكل شهر — مرتب − مسحوبات = صافي، والتفاصيل تحته
//      ✅ «تم صرف الراتب» — بيقفل الشهر، والشهر اللي بعده يبدأ نضيف
//
// 🔴 كل حاجة بتتقرا من hr_self_payroll، والسيرفر بياخد الإيميل من
//    الحساب اللي داخل — مش من الصفحة. يعني مستحيل تقرا أو تقفل
//    كشف حد تاني من هنا.
//
// 🔴 مفيش أجراس: تريجر في ملف 68 بيعلّم أي سحبة عليك «اتقرت»
//    لحظة ما بتتسجّل. والصفحة كمان مبتطلّعش بانر ولا نقطة حمرا.
// ============================================================

// إنت المحاسب العام؟ — سؤال واحد للسيرفر ونفتكر الإجابة
async function payDetectSelf(){
  if(_paySelf !== null) return _paySelf;
  try{
    const { data, error } = await sb.rpc('my_app_role');
    // ⚠️ Supabase مبيرميش خطأ — بيرجّعه في .error
    if(error) throw error;
    _paySelf = (data === 'super_admin');
  }catch(e){
    // ⚠️ مش بنحفظ الفشل — المرة الجاية (رجوع للتطبيق) نسأل تاني
    console.warn('payDetectSelf failed:', e);
    return false;
  }
  return _paySelf;
}

// زرار «🧾 كشف مرتبي» في القايمة — جنب «مرتبك» على طول.
// ⚠️ لازم يبقى ابن مباشر للقايمة (نفس مكان «مرتبك») — common.js
//    بيرتّب الزراير على الأساس ده.
function _payEnsureSelfBtn(anchor, show){
  if(!anchor || !anchor.parentNode) return;
  let s = anchor.nextElementSibling;
  if(!s || !s.classList || !s.classList.contains('pay-self-menu-btn')){
    s = document.createElement('button');
    s.className = 'pay-self-menu-btn';
    s.textContent = '🧾 كشف مرتبي';
    s.onclick = () => openSelfPay();
    anchor.parentNode.insertBefore(s, anchor.nextSibling);
  }
  s.style.display = show ? '' : 'none';
}

function _selfIsOpen(){
  const ov = document.getElementById('selfPayOverlay');
  return !!(ov && !ov.classList.contains('hidden'));
}

// يرسم أي شاشة مفتوحة — «مرتبك» أو «كشف مرتبي»
// (درج «اسمي في الإكسل» موجود في الاتنين)
function payRenderAny(){
  const ov = document.getElementById('payOverlay');
  if(ov && !ov.classList.contains('hidden')) payRender('');
  if(_selfIsOpen()) selfRender('');
}

async function openSelfPay(){
  if(!payIsPhone()){
    alert('شاشة «كشف مرتبي» بتتفتح من الموبايل بس');
    return;
  }
  let ov = document.getElementById('selfPayOverlay');
  if(!ov){
    // ⚠️ الصفحة مش محتاجة تحط العنصر ده — الملف بيعمله بنفسه
    ov = document.createElement('div');
    ov.id = 'selfPayOverlay';
    document.body.appendChild(ov);
  }
  ov.classList.remove('hidden');
  selfRender('⏳ جاري التحميل…');
  await Promise.all([selfLoad(), payExwLoad()]);
  selfRender('');
}

function closeSelfPay(){
  const ov = document.getElementById('selfPayOverlay');
  if(ov) ov.classList.add('hidden');
}

async function selfLoad(){
  _selfErr = '';
  try{
    const { data, error } = await sb.rpc('hr_self_payroll');
    if(error) throw error;
    _selfData = data || { allowed:false };
  }catch(e){
    // ⚠️ بنقول بصوت عالي — الشاشة الفاضية هنا معناها «مفيش مسحوبات»
    //    وده كدب مطمّن
    console.error('selfLoad failed:', e);
    const t = (e && e.message) ? e.message : String(e);
    _selfErr = /does not exist|42883|PGRST202/i.test(t)
      ? 'الشاشة لسه ماتركبتش — شغّل ملف 68-accountant-payslip-screen.sql'
      : t;
  }
}

function selfRender(busyMsg){
  const ov = document.getElementById('selfPayOverlay');
  if(!ov) return;
  const d = _selfData || {};

  let body;
  if(busyMsg){
    body = `<div class="pay-busy">${_payEsc(busyMsg)}</div>`;
  }else if(_selfErr){
    body = `<div class="pay-warn">⚠️ مقدرناش نقرا كشفك — حدّث الصفحة وجرّب تاني.
      <span class="pay-warn-d">${_payEsc(_selfErr)}</span></div>`;
  }else if(d.allowed === false){
    body = `<div class="pay-tot"><div class="pay-tot-hint">الشاشة دي للمحاسب العام بس.</div></div>`;
  }else{
    body = _selfSalaryHtml(d) + _selfPeriodsHtml(d)
         + `<div class="pay-drws">${payExwDrawerHtml()}</div>`;
  }

  ov.innerHTML = `
    <div class="pay-page">
      <div class="pay-head">
        <h2>🧾 كشف مرتبي</h2>
        <button class="pay-close" onclick="closeSelfPay()">×</button>
      </div>
      <div class="pay-body">${body}</div>
    </div>`;
}

// 💵 خانة «مرتبي»
// ⚠️ null (لسه ماتكتبش) غير صفر — زي قاعدة has_salary في «مرتبك»
function _selfSalaryHtml(d){
  const has = d.salary !== null && d.salary !== undefined;
  return `
  <div class="sp-sal-card">
    <div class="sp-sal-h">💵 مرتبي الشهري</div>
    <div class="sp-sal-row">
      <input id="spSal" type="number" min="0" step="50" inputmode="decimal"
             placeholder="اكتب مرتبك" value="${has ? _payEsc(Number(d.salary)) : ''}">
      <button onclick="selfSaveSalary()">💾 حفظ</button>
    </div>
    <div class="sp-sal-hint${has ? '' : ' warn'}">${has
      ? 'بيتحسب على كل شهر لسه ما اتصرفش. الشهور اللي اتصرفت متقفلة ومبتتغيّرش.'
      : '⚠️ لسه ما كتبتش مرتبك — عشان كده الصافي تحت بيطلع بالسالب.'}</div>
  </div>`;
}

// 🗓️ الشهور: اللي لسه برّه (الأقدم الأول — بتصرف بالترتيب)،
//    واللي اتصرف جوه سجل مطوي (الأحدث الأول)
function _selfPeriodsHtml(d){
  const per = d.periods || [];
  if(!per.length){
    return `<div class="pay-tot"><div class="pay-tot-hint">لسه مفيش شهور —
      أول ما يبقى فيه مرتب أو مسحوبات هتظهر هنا.</div></div>`;
  }
  const due  = per.filter(p => !p.paid);              // السيرفر مرتّبها من الأقدم
  const paid = per.filter(p =>  p.paid).reverse();

  return `
    ${due.length
      ? `<div class="pay-sec dim">⏳ لسه ما اتصرفش</div>${due.map(_selfCard).join('')}`
      : `<div class="pay-ok" style="margin-top:16px;">✅ كل الشهور اتصرفت</div>`}
    ${paid.length ? `
      <button class="pay-more" onclick="selfToggleOld()">
        ${_selfOpenOld ? '▴' : '▾'} 📜 الشهور اللي اتصرفت (${paid.length})</button>
      ${_selfOpenOld ? `<div class="pay-old">${paid.map(_selfCard).join('')}</div>` : ''}` : ''}`;
}

function _selfCard(p){
  const per  = String(p.period).slice(0, 10);
  const ym   = per.slice(0, 7);
  const rows = ((_selfData && _selfData.deductions) || [])
                 .filter(r => String(r.work_date || '').slice(0, 7) === ym);
  const ded  = Number(p.manual_ded || 0) + Number(p.late_ded || 0);
  const net  = Number(p.net || 0);
  const open = !!_selfOpenWd[ym];

  return `
  <div class="pay-tot slip${p.paid ? ' paid' : ''}">
    <div class="pay-slip-h">
      <b>${_payEsc(_paySlipMonth(per))}</b>
      <span class="pay-slip-tag ${p.paid ? 'ok' : 'wait'}">${p.paid ? '✅ اتصرف' : '⏳ لسه'}</span>
    </div>

    <div class="pay-calc">
      <div><span>المرتب</span><b>${payMoney(p.salary)}</b></div>
      <div><span>− المسحوبات</span><b class="minus">${payMoney(p.withdraw_ded)}</b></div>
      ${ded ? `<div><span>− الخصومات</span><b class="minus">${payMoney(ded)}</b></div>` : ''}
      ${paySlipOvertime(p)}
      ${payLeaveBonusLine(p)}
      <div class="eq"><span>= الصافي</span><b${net < 0 ? ' style="color:var(--p-red)"' : ''}>${payMoney(net)}</b></div>
    </div>

    ${rows.length ? `
      <button class="sp-wd-btn" onclick="selfToggleWd('${ym}')">
        ${open ? '▴' : '▾'} 🔩 التفاصيل (${rows.length})</button>
      ${open ? `<div class="sp-wd">${rows.map(_selfRow).join('')}</div>` : ''}` : ''}

    ${p.paid
      ? `<div class="pay-slip-meta">🔒 اتقفل ${_payEsc(new Date(p.paid_at).toLocaleDateString('ar-EG',
            { day:'numeric', month:'long', year:'numeric' }))} — الأرقام دي مبتتغيّرش.</div>
         <button class="pay-self-btn undo" onclick="selfUnpaid('${per}')">↩️ تراجع عن الصرف</button>`
      : `<button class="pay-self-btn" onclick="selfPaid('${per}')">✅ تم صرف الراتب</button>`}
  </div>`;
}

// سطر سحبة/خصم جوه تفاصيل الشهر
function _selfRow(r){
  const off  = !!r.waived_at;
  const back = Number(r.amount) < 0;     // بالسالب = فلوس رجعت
  const day  = new Date(r.work_date).toLocaleDateString('ar-EG',
                 { weekday:'short', day:'numeric', month:'short' });
  return `
    <div class="sp-wd-row${off ? ' off' : ''}">
      <span class="d">${_payEsc(day)}</span>
      <span class="t">${r.kind === 'withdrawal' ? '' : '💸 '}${_payEsc(r.reason || '')}</span>
      <b class="${back ? 'ok' : ''}">${back ? '+' : '−'}${payMoney(Math.abs(Number(r.amount) || 0))}</b>
    </div>`;
}

function selfToggleOld(){ _selfOpenOld = !_selfOpenOld; selfRender(''); }
function selfToggleWd(ym){ _selfOpenWd[ym] = !_selfOpenWd[ym]; selfRender(''); }

async function selfSaveSalary(){
  if(_selfBusy) return;
  const el  = document.getElementById('spSal');
  const raw = el ? String(el.value).trim() : '';
  if(raw === ''){ alert('اكتب المرتب الأول'); if(el) el.focus(); return; }
  const amt = parseFloat(raw.replace(',', '.'));
  if(isNaN(amt) || amt < 0){ alert('المرتب لازم يكون رقم صفر أو أكتر'); return; }
  if(!confirm(`مرتبك هيبقى ${payMoney(amt)} ج.م\n\n` +
              'وهيتحسب على كل شهر لسه ما اتصرفش.')) return;

  _selfBusy = true;
  try{
    const { error } = await sb.rpc('hr_self_set_salary', { p_amount: amt });
    // ⚠️ Supabase مبيرميش خطأ — بيرجّعه في .error
    if(error) throw error;
    await selfLoad();
    selfRender('');
    alert('✅ اتحفظ');
  }catch(e){
    console.error('selfSaveSalary failed:', e);
    alert('❌ ' + (e.message || e));
  }finally{
    _selfBusy = false;
  }
}

// ✅ تم صرف الراتب — بيستخدم hr_mark_paid (ملف 67 سامح للمحاسب العام بس)
async function selfPaid(period){
  if(_selfBusy || !_selfData || !_selfData.me) return;
  const p = (_selfData.periods || []).find(x => String(x.period).slice(0, 10) === period);
  if(!p) return;
  const noSal = _selfData.salary === null || _selfData.salary === undefined;
  if(!confirm(`تم صرف راتب ${_paySlipMonth(period)}؟\n\n` +
              `المرتب: ${payMoney(p.salary)} ج.م\n` +
              `المسحوبات: ${payMoney(p.withdraw_ded)} ج.م\n` +
              `الصافي: ${payMoney(p.net)} ج.م\n\n` +
              (noSal ? '⚠️ لسه ما كتبتش مرتبك — الشهر هيتقفل على مرتب صفر.\n\n' : '') +
              '🔒 الأرقام هتتقفل. أي سحبة تتكتب على الشهر ده في الإكسل ' +
              'بعد كده مش هتتحسب فيه.')) return;

  _selfBusy = true;
  try{
    const { error } = await sb.rpc('hr_mark_paid',
      { p_email: _selfData.me, p_period: period });
    if(error) throw error;
    await selfLoad();
    selfRender('');
    alert('✅ راتب ' + _paySlipMonth(period) + ' اتقفل');
  }catch(e){
    console.error('selfPaid failed:', e);
    alert('❌ ' + (e.message || e));
  }finally{
    _selfBusy = false;
  }
}

async function selfUnpaid(period){
  if(_selfBusy || !_selfData || !_selfData.me) return;
  if(!confirm(`تراجع عن صرف راتب ${_paySlipMonth(period)}؟\n\n` +
              'الشهر هيرجع «لسه»، وأرقامه هترجع تتحسب لحظياً ' +
              '(يعني أي سحبة اتكتبت بعد القفل هتدخل).')) return;

  _selfBusy = true;
  try{
    const { error } = await sb.rpc('hr_unmark_paid',
      { p_email: _selfData.me, p_period: period });
    if(error) throw error;
    await selfLoad();
    selfRender('');
  }catch(e){
    console.error('selfUnpaid failed:', e);
    alert('❌ ' + (e.message || e));
  }finally{
    _selfBusy = false;
  }
}


// ⚠️ دالة payTotalsHtml اتشالت من هنا.
// كانت بتوري كشف الشهر الحالي بس. دلوقتي paySlipsHtml بتوري كل
// الشهور (المستحق برّه والمصروف جوه سجل)، والشهر الحالي بقى أول
// كارت فيهم. سيبنا الدالة القديمة كانت هتفضل تشتغل من غير ما حد
// يندهها — وأول واحد يقرا الملف بعد سنة هيفتكرها المستخدمة.

function _payMonthStart(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-01';
}

// موزّع: كل نوع كارت ليه شكل وزرار «فهمت» بينده دالة مختلفة
function payItemCard(it){
  if(it.kind === 'ded')        return payCard(it.row);
  if(it.kind === 'waived')     return payWaivedDedCard(it.row);
  if(it.kind === 'lateWaived')  return payWaivedLateCard(it.row);
  if(it.kind === 'latePenalty') return payLateCard(it.row);
  if(it.kind === 'paidSlip')    return payPaidSlipCard(it.row);
  return '';
}

// خصم يدوي HR شالته
function payWaivedDedCard(r){
  return `
  <div class="pay-card good">
    <div class="pay-card-top">
      <div class="pay-amt good">✋ اتشال</div>
      <div class="pay-when">${_payEsc(new Date(r.created_at).toLocaleDateString('ar-EG',
        { day:'numeric', month:'long' }))}</div>
    </div>
    <div class="pay-why">خصم <b>${payMoney(r.amount)} ج.م</b> كان بسبب:
      <span style="text-decoration:line-through;opacity:.7;">${_payEsc(r.reason)}</span></div>
    <div class="pay-why" style="color:var(--p-green);">
      <b>اتشال لأن:</b> ${_payEsc(r.waive_reason || '—')}</div>
    <button class="pay-ok-btn" onclick="payAck('${_payEsc(r.id)}')">👍 فهمت</button>
  </div>`;
}

// سبب الخصم بالكلام.
// ⚠️ الخصم التلقائي بقى نوعين: تأخير و/أو تعدّي البريك (migration 46)،
//    و r.penalty هو **المجموع**. لو سبنا الكلام «تأخير» زي الأول،
//    الموظف اللي اتخصم على البريك هيقرا سبب غلط ويجي يتخانق.
function _payWhy(r){
  const late  = Number(r.late_penalty_amt  || 0);
  const brk   = Number(r.break_penalty_amt || 0);
  const bits  = [];
  // الأعمدة الجديدة مش موجودة؟ (السيرفر لسه ما اتحدّثش) — نرجع للكلام القديم
  if(!late && !brk) return `تأخير — ميعادك <b>${_payHm(r.shift_min)}</b> وحضرت <b>${_payHm(r.arrived_min)}</b> (متأخر ${_payDur(r.late_min)}).`;
  if(late) bits.push(`تأخير — ميعادك <b>${_payHm(r.shift_min)}</b> وحضرت <b>${_payHm(r.arrived_min)}</b> (متأخر ${_payDur(r.late_min)}) = ${payMoney(late)} ج.م`);
  if(brk)  bits.push(`تعدّي البريك — أخدت <b>${_payDur(r.break_min)}</b> والمسموح <b>${_payDur(r.break_allow_min)}</b> (زوّدت ${_payDur(r.break_over_min)}) = ${payMoney(brk)} ج.م`);
  return bits.join('<br>');
}

// خصم تلقائي جديد (تأخير و/أو بريك) — الموظف لسه ما شافوش
function payLateCard(r){
  const d = new Date(r.work_date).toLocaleDateString('ar-EG',
    { weekday:'long', day:'numeric', month:'long' });
  return `
  <div class="pay-card new">
    <div class="pay-card-top">
      <div class="pay-amt">− ${payMoney(r.penalty)} <small>ج.م</small></div>
      <div class="pay-when">${_payEsc(d)}</div>
    </div>
    <div class="pay-why"><b>السبب:</b> ${_payWhy(r)}</div>
    <div class="pay-why" style="font-size:12px;opacity:.85;">
      الخصم ده اتحسب تلقائي من مواعيدك. لو شايف إنه غلط، كلّم شؤون العاملين.</div>
    <button class="pay-ok-btn" onclick="payAckPenalty('${_payEsc(r.work_date)}')">👍 فهمت</button>
  </div>`;
}

// خصم تأخير تلقائي HR شالته
function payWaivedLateCard(w){
  return `
  <div class="pay-card good">
    <div class="pay-card-top">
      <div class="pay-amt good">✋ اتشال</div>
      <div class="pay-when">${_payEsc(new Date(w.work_date).toLocaleDateString('ar-EG',
        { weekday:'long', day:'numeric', month:'long' }))}</div>
    </div>
    <div class="pay-why">الخصم التلقائي بتاع اليوم ده اتشال.</div>
    <div class="pay-why" style="color:var(--p-green);">
      <b>السبب:</b> ${_payEsc(w.reason || '—')}</div>
    <button class="pay-ok-btn" onclick="payAckWaiver('${_payEsc(w.work_date)}')">👍 فهمت</button>
  </div>`;
}

// ============================================================
// سطر خصم تأخير/بريك اتقرا خلاص — جوه درج الخصومات
// ⚠️ مفيش زرار «فهمت» هنا: ده اتقرا قبل كده، أو HR شالته.
// ============================================================
function payLateRow(r){
  const late = Number(r.late_penalty_amt  || 0);
  const brk  = Number(r.break_penalty_amt || 0);
  const why  = (brk && !late)
    ? `تعدّي البريك · أخدت ${_payDur(r.break_min)} والمسموح ${_payDur(r.break_allow_min)}`
    : `ميعادك ${_payHm(r.shift_min)} · حضرت ${_payHm(r.arrived_min)} · متأخر ${_payDur(r.late_min)}`
      + (brk ? ` · + تعدّي البريك` : '');
  return `
      <div class="pay-late-row${r.waived ? ' off' : ''}">
        <span class="d">${_payEsc(new Date(r.work_date).toLocaleDateString('ar-EG',
          { weekday:'short', day:'numeric', month:'short' }))}</span>
        <span class="t">${why}</span>
        <span class="v">${r.waived
          ? '<b class="ok">✋ اتشال</b>'
          : '<b>−' + payMoney(r.penalty) + '</b>'}</span>
      </div>
      ${r.waived && r.waive_reason
        ? `<div class="pay-late-why">${_payEsc(r.waive_reason)}</div>` : ''}`;
}

// مدة بالساعة والدقيقة — «ساعتين و ١٥ د» مش «١٣٥»
function _payDur(mins){
  const m = Math.max(0, Math.round(Number(mins) || 0));
  const h = Math.floor(m / 60), r = m % 60;
  if(!h) return r + ' د';
  if(!r) return h + ' س';
  return h + ' س و ' + r + ' د';
}

// ⚠️ shift_min = ميعاده الحقيقي.
//    counted_min = الوقت اللي بيتحسب منه شغله — وده بيساوي وقت
//    وصوله لو كان متأخر. عرض counted وتسميته «ميعادك» كان بيطلع
//    «حضرت ١٨:٠٠ وميعادك ١٨:٠٠» على يوم فيه خصم، وده كلام
//    متناقض: لو جه في معاده مكانش هياخد خصم أصلاً.
function _payHm(mins){
  const m = ((Number(mins) % 1440) + 1440) % 1440;
  return String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0');
}

function payCard(r){
  const isNew = !r.seen_at;
  // ⚠️ مبلغ بالسالب = سداد: الموظف رجّع فلوس، فمسحوباته قلّت.
  //    بنعرضه بعلامة + وبلون مختلف، ومبنعرضش «− -200» —
  //    الإشارتين ورا بعض بتخلّي الموظف يحسب بدل ما يقرا.
  const isBack = Number(r.amount) < 0;
  const amtTxt = (isBack ? '+ ' : '− ') + payMoney(Math.abs(Number(r.amount) || 0));
  const d = new Date(r.created_at).toLocaleDateString('ar-EG',
    { weekday:'long', day:'numeric', month:'long' });
  const t = new Date(r.created_at).toLocaleTimeString('ar-EG',
    { hour:'2-digit', minute:'2-digit', timeZone:'Africa/Cairo' });
  return `
  <div class="pay-card${isNew ? ' new' : ''}">
    <div class="pay-card-top">
      <div class="pay-amt"${isBack ? ' style="color:var(--p-green);"' : ''}>${amtTxt} <small>ج.م</small></div>
      <div class="pay-when">${_payEsc(d)}<br><span>${_payEsc(t)}</span></div>
    </div>
    <div class="pay-why"><b>السبب:</b> ${_payEsc(r.reason)}</div>
    ${isNew
      ? `<button class="pay-ok-btn" onclick="payAck('${_payEsc(r.id)}')">👍 فهمت</button>`
      : `<div class="pay-seen">✔️ قريته ${new Date(r.seen_at).toLocaleDateString('ar-EG',
           { day:'numeric', month:'long' })}</div>`}
  </div>`;
}


// ============================================================
// 🔗 درج «اسمي في الإكسل» — للمحاسب العام بس
// ------------------------------------------------------------
// 🧸 بالبلدي: المحاسب العام مش موظف، فـ HR مش شايفاه في قايمة
//    «اختار الموظف»، واسمه في الإكسل كان بيفضل واقف للأبد.
//    الدرج ده بيخلّيه يقول للنظام بنفسه: «الاسم ده أنا».
//
// 🔴 مفيش هنا أي خانة إيميل — السيرفر بياخد الإيميل من الحساب
//    اللي داخل. يعني الزرار ده **مستحيل** يربط اسم بحد تاني،
//    حتى لو حد عدّل الصفحة من الكونسول.
//
// 🔴 والدرج **مبيسجّلش فلوس**. بيربط الاسم بس. الفلوس بتنزل لما
//    ملف الإكسل يتحفظ (hr_excel_sync) — نفس الطريق الوحيد بتاع
//    كل الموظفين.
//
// ⚠️ لأي حساب تاني: السيرفر بيرجّع allowed=false والدرج مبيظهرش
//    أصلاً. ولو ملف 66 لسه ماتشغّلش: نفس الكلام — نسكت.
// ============================================================
async function payExwLoad(){
  _payExwErr = '';
  try{
    const { data, error } = await sb.rpc('hr_excel_self_state');
    // ⚠️ Supabase مبيرميش خطأ — بيرجّعه في .error
    if(error) throw error;
    _payExw = data || { allowed:false };
  }catch(e){
    const t = (e && e.message) ? e.message : String(e);
    // الدالة مش موجودة = ملف 66 ماتشغّلش → الدرج مبيظهرش لحد. ده مش خطأ.
    if(/does not exist|42883|PGRST202/i.test(t)){ _payExw = { allowed:false }; return; }
    console.error('payExwLoad failed:', e);
    // ⚠️ بنحتفظ بالحالة القديمة لو كانت ليك — عشان الدرج يفضل ظاهر
    //    ويقول «فيه مشكلة» بدل ما يختفي في صمت
    _payExwErr = t;
  }
}

function payExwDrawerHtml(){
  if(!_payExw || !_payExw.allowed) return '';
  const mine    = _payExw.mine    || [];
  const pending = _payExw.pending || [];
  const orphans = _payExw.orphans || [];
  const open = _payOpen.exw;

  const head = `
    <button class="pay-drw${open ? ' open' : ''}" onclick="payToggleDrawer('exw')">
      <span class="pay-drw-t">🔗 اسمي في الإكسل</span>
      <span class="pay-drw-a">${open ? '▴' : '▾'}</span>
    </button>`;
  if(!open) return head;

  const money = n => payMoney(n);

  // ✅ أسمائي المربوطة
  const mineHtml = mine.length
    ? mine.map((r, i) => `
        <div class="pay-exw-row ok">
          <div class="pay-exw-mid">
            <b>${_payEsc(r.raw_name)}</b>
            <span>${Number(r.rows_cnt) ? `${r.rows_cnt} سحبة · ${money(r.total)} ج.م`
                                        : 'لسه مفيش سحبات اتسجّلت عليه'}${
              Number(r.waiting) ? ` · ⏳ ${r.waiting} مستنية حفظ الإكسل` : ''}</span>
          </div>
          <button class="pay-exw-x" title="فك الربط" onclick="payExwUnlink(${i})">✖</button>
        </div>`).join('')
    : `<div class="pay-drw-empty">لسه مفيش اسم مربوط بيك</div>`;

  // 🧩 مربوطة بحساب اتمسح
  const orphHtml = orphans.map((r, i) => `
        <div class="pay-exw-row warn">
          <div class="pay-exw-mid">
            <b>${_payEsc(r.raw_name)}</b>
            <span>${r.rows_cnt} سحبة · ${money(r.total)} ج.م<br>
              مربوط بـ <span dir="ltr">${_payEsc(r.old_email)}</span> — الحساب ده اتمسح</span>
          </div>
          <button class="pay-exw-me" onclick="payExwLink('orphans', ${i})">🙋 ده أنا</button>
        </div>`).join('');

  // ⏳ الأسماء الواقفة
  const pendHtml = pending.map((r, i) => `
        <div class="pay-exw-row">
          <div class="pay-exw-mid">
            <b>${_payEsc(r.raw_name)}</b>
            <span>${r.rows_cnt} سحبة · ${money(r.total)} ج.م${r.months ? ' · ' + _payEsc(r.months) : ''}</span>
          </div>
          <button class="pay-exw-me" onclick="payExwLink('pending', ${i})">🙋 ده أنا</button>
        </div>`).join('');

  return head + `
    <div class="pay-drw-body">
      ${_payExwErr ? `<div class="pay-warn">⚠️ مقدرناش نقرا أسماء الإكسل — اللي تحت ممكن يكون قديم.
        <span class="pay-warn-d">${_payEsc(_payExwErr)}</span></div>` : ''}
      <div class="pay-exw-hint">
        🧸 دوس <b>«ده أنا»</b> جنب اسمك زي ما هو مكتوب في ملف الإكسل.
        الاسم بيتربط <b>بيك إنت بس</b>.<br>
        ⚠️ الربط لوحده مبينزّلش الفلوس — بعده <b>احفظ ملف الإكسل تاني</b>
        (ملف كل شهر لوحده)، والمسحوبات تنزل في «درج المسحوبات» فوق.
      </div>

      <div class="pay-exw-sec ok">✅ مربوط بيك (${mine.length})</div>
      ${mineHtml}

      ${orphans.length ? `
        <div class="pay-exw-sec warn">🧩 مربوطة بحساب اتمسح (${orphans.length})</div>
        ${orphHtml}` : ''}

      <div class="pay-exw-sec">⏳ أسماء واقفة من غير ربط (${pending.length})</div>
      ${pending.length ? pendHtml : `<div class="pay-drw-empty">مفيش أسماء واقفة ✅</div>`}
    </div>`;
}

// list = 'pending' أو 'orphans' — بنبعت رقم الصف مش الاسم نفسه،
// عشان الأسامي اللي فيها ' أو " ما تكسرش الـ onclick
async function payExwLink(list, i){
  if(_payBusy || !_payExw) return;
  const r = (_payExw[list] || [])[i];
  if(!r) return;
  const msg = list === 'orphans'
    ? `«${r.raw_name}» مربوط دلوقتي بحساب اتمسح (${r.old_email}).\n\n` +
      `هتاخده لنفسك؟ أول ما تحفظ ملف الإكسل، الـ ${r.rows_cnt} سحبة ` +
      `(${payMoney(r.total)} ج.م) هيتنقلوا لدرج المسحوبات بتاعك.`
    : `هتربط «${r.raw_name}» اللي في الإكسل بيك إنت.\n\n` +
      `يعني ${r.rows_cnt} سحبة (${payMoney(r.total)} ج.م) هتتحسب عليك ` +
      `أول ما تحفظ ملف الإكسل.\n\nمتأكد إنه إنت؟`;
  if(!confirm(msg)) return;

  _payBusy = true;
  try{
    const { data, error } = await sb.rpc('hr_excel_self_link', { p_alias: r.raw_name });
    if(error) throw error;
    await payExwLoad();
    if(_selfIsOpen()) await selfLoad();
    payRenderAny();
    alert((data && data.already) ? 'الاسم ده مربوط بيك أصلاً ✅'
      : 'اتربط ✅\n\nدلوقتي احفظ ملف الإكسل تاني عشان المسحوبات تنزل في «درج المسحوبات».');
  }catch(e){
    console.error('payExwLink failed:', e);
    alert('❌ ' + (e.message || e));
  }finally{
    _payBusy = false;
  }
}

async function payExwUnlink(i){
  if(_payBusy || !_payExw) return;
  const r = (_payExw.mine || [])[i];
  if(!r) return;
  if(!confirm(`هتفك ربط «${r.raw_name}» من عندك؟\n\n` +
              'المسحوبات اللي طلعت منه هتتشال من درجك — ماعدا الشهور ' +
              'اللي اتصرفت خلاص، دي بتفضل زي ما هي.\n' +
              'والاسم هيرجع «واقف» لحد ما يتربط تاني.')) return;

  _payBusy = true;
  try{
    const { data, error } = await sb.rpc('hr_excel_self_unlink', { p_alias: r.raw_name });
    if(error) throw error;
    // الخصومات اتشالت من hr_deductions → الدرجين والكشف لازم يتقروا تاني
    await Promise.all([payLoad(), payExwLoad(), _selfIsOpen() ? selfLoad() : null]);
    payRenderAny();
    const d = data || {};
    alert('اتفك ✅\n\nسحبات اتشالت: ' + (d.unlinked || 0) +
          '\nفضلت (شهور اتصرفت): ' + (d.kept_paid || 0));
  }catch(e){
    console.error('payExwUnlink failed:', e);
    alert('❌ ' + (e.message || e));
  }finally{
    _payBusy = false;
  }
}

// ============================================================
// «فهمت»
// ============================================================
async function payAck(id){
  if(_payBusy) return;
  _payBusy = true;
  try{
    const { error } = await sb.rpc('hr_ack_deduction', { p_id: id });
    // ⚠️ Supabase مبيرميش خطأ — بيرجّعه في .error. لو ما فحصناش
    //    السطر ده، الكارت هيختفي من الشاشة والصف في قاعدة البيانات
    //    هيفضل «جديد» — ويرجع تاني أول ما يقفل ويفتح.
    if(error) throw error;
    await payLoad();
    payRender('');
  }catch(e){
    console.error('payAck failed:', e);
    alert('❌ مقدرناش نسجّل إنك قريته: ' + (e.message || e));
  }finally{
    _payBusy = false;
  }
}

async function payAckPenalty(workDate){
  if(_payBusy) return;
  _payBusy = true;
  try{
    const { error } = await sb.rpc('hr_ack_penalty', { p_date: workDate });
    // ⚠️ Supabase مبيرميش خطأ — بيرجّعه في .error
    if(error) throw error;
    await payLoad();
    payRender('');
  }catch(e){
    console.error('payAckPenalty failed:', e);
    alert('❌ مقدرناش نسجّل إنك قريته: ' + (e.message || e));
  }finally{
    _payBusy = false;
  }
}

async function payAckWaiver(workDate){
  if(_payBusy) return;
  _payBusy = true;
  try{
    const { error } = await sb.rpc('hr_ack_penalty_waiver', { p_date: workDate });
    // ⚠️ Supabase مبيرميش خطأ — بيرجّعه في .error
    if(error) throw error;
    await payLoad();
    payRender('');
  }catch(e){
    console.error('payAckWaiver failed:', e);
    alert('❌ مقدرناش نسجّل إنك قريته: ' + (e.message || e));
  }finally{
    _payBusy = false;
  }
}

// ============================================================
// الإشعار خارج التطبيق (Web Push)
// ------------------------------------------------------------
// ⚠️ ٣ شروط لازم تتحقق كلها، ولو واحد ناقص الزرار مبيظهرش:
//   • المفتاح PAY_VAPID_PUBLIC_KEY متملّي فوق
//   • المتصفح بيدعم Push
//   • **على الأيفون:** التطبيق متثبّت على الشاشة الرئيسية.
//     دي قاعدة آبل مش قرارنا — سفاري بيرفض الإشعارات من التبويب
//     العادي خالص. عشان كده بنقول للموظف يثبّت بدل ما نسيبه
//     يدوس زرار مش هيشتغل.
// ============================================================
function payPushSupported(){
  return !!(PAY_VAPID_PUBLIC_KEY
    && 'serviceWorker' in navigator
    && 'PushManager'   in window
    && 'Notification'  in window);
}
function payIsStandalone(){
  return (window.navigator && window.navigator.standalone === true)
      || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
}
function payIsIOS(){
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua)
      || (/Mac/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document);
}

function payPushBtnHtml(){
  if(!PAY_VAPID_PUBLIC_KEY) return '';

  if(payIsIOS() && !payIsStandalone()){
    return `<div class="pay-push-hint">📲 عشان يوصلك إشعار وإنت برّه التطبيق،
      لازم تضيف الموقع للشاشة الرئيسية الأول:<br>
      دوس <b>مشاركة</b> ⬆️ تحت ← <b>إضافة إلى الشاشة الرئيسية</b> ←
      وافتحه من الأيقونة، وارجع هنا.</div>`;
  }
  if(!payPushSupported()) return '';

  if(Notification.permission === 'granted'){
    return `<div class="pay-push-on">🔔 الإشعارات شغّالة على الجهاز ده</div>`;
  }
  if(Notification.permission === 'denied'){
    return `<div class="pay-push-hint">🔕 إشعارات الموقع مقفولة من إعدادات
      المتصفح. افتحها وارجع هنا.</div>`;
  }
  return `<button class="pay-push-btn" onclick="payEnablePush()">
    🔔 فعّل الإشعارات — يوصلك خبر الخصم وإنت برّه التطبيق</button>`;
}

// 🔴 لازم تتنده **من ضغطة زرار مباشرة**. طلب إذن الإشعارات زي
//    طلب الموقع بالظبط: المتصفح بيديك تصريح لحظي بعد الضغطة،
//    والتصريح بيروح لو استنيت حاجة قبله. عشان كده requestPermission
//    أول سطر — قبل أي await.
async function payEnablePush(){
  if(!payPushSupported()){ alert('جهازك مش بيدعم الإشعارات'); return; }
  try{
    const perm = await Notification.requestPermission();   // 🔴 أول سطر
    if(perm !== 'granted'){
      alert('الإشعارات مقفولة. تقدر تفتحها من إعدادات المتصفح في أي وقت.');
      payRender(''); return;
    }

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if(!sub){
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: payUrlB64ToU8(PAY_VAPID_PUBLIC_KEY)
      });
    }

    const { data:{ session } } = await sb.auth.getSession();
    const email = ((session && session.user && session.user.email) || '').toLowerCase();
    if(!email) throw new Error('مش مسجّل دخول');

    const j = sub.toJSON();
    const { error } = await sb.from('push_subscriptions').upsert({
      endpoint:   sub.endpoint,
      user_email: email,
      p256dh:     j.keys.p256dh,
      auth:       j.keys.auth,
      ua:         (navigator.userAgent || '').slice(0, 300)
    }, { onConflict: 'endpoint' });
    if(error) throw error;

    alert('✅ تمام — هيوصلك إشعار على الجهاز ده أول ما يحصل خصم');
    payRender('');
  }catch(e){
    console.error('payEnablePush failed:', e);
    alert('❌ مقدرناش نفعّل الإشعارات: ' + (e.message || e));
  }
}

// المفتاح بيتكتب Base64-URL، والمتصفح عايزه بايتات
function payUrlB64ToU8(s){
  const pad  = '='.repeat((4 - s.length % 4) % 4);
  const b64  = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw  = atob(b64);
  const out  = new Uint8Array(raw.length);
  for(let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// ============================================================
// ⚠️ الملف بينده نفسه — مش مستني الصفحة تفتكر
// ------------------------------------------------------------
// نفس درس attendance.js: أول نسخة منه كانت مستنية كل صفحة تنده
// دالة التهيئة، فالزرار فضل مخفي في التلات صفحات وواحدة بس
// اشتغلت. دلوقتي الملف مسؤول عن نفسه.
//
// بننده أكتر من مرة عن قصد، عشان الصفحات اللي بتبني قايمتها
// بعد ما تقرا الأدوار من السيرفر.
// ============================================================
(function payBoot(){
  if(!payIsPhone()) return;          // الكمبيوتر: الملف بيسكت خالص

  const refresh = async () => {
    try{
      const { data:{ session } } = await sb.auth.getSession();
      if(!session) return;           // لسه ما دخلش — مفيش داعي نقرا
      // 🧾 المحاسب العام: مفيش «مرتبك» ولا أجراس — شاشته لوحدها
      if(await payDetectSelf()){
        paySyncBadge();
        if(_selfIsOpen()){ await selfLoad(); selfRender(''); }
        return;
      }
      await payLoad();
    }catch(e){ console.error('payBoot refresh failed:', e); }
    // لو الشاشة مفتوحة وإحنا بنحدّث، نعيد رسمها كمان
    const ov = document.getElementById('payOverlay');
    if(ov && !ov.classList.contains('hidden')) payRender('');
  };

  const sync = () => { try{ paySyncBadge(); }catch(e){} };

  if(document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', sync, { once:true });
  else sync();
  setTimeout(sync, 1200);
  setTimeout(sync, 3000);

  setTimeout(refresh, 1500);

  // ⚠️ لما الموظف يرجع للتطبيق بعد ما كان مقفول، بنقرا تاني.
  //    من غير ده الخصم اللي اتعمل وهو برّه مش هيبان غير لما
  //    يقفل التطبيق ويفتحه — وده ممكن يعدّي أيام.
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible') refresh();
  });

  // خصم جديد وهو فاتح التطبيق؟ البانر يطلع على طول.
  // ⚠️ ده **إضافة** مش أساس: لو الريل تايم مش شغّال، الفحص اللي
  //    فوق (visibilitychange) بيغطّي. مفيش حالة الخبر بيضيع فيها.
  setTimeout(async () => {
    try{
      const { data:{ session } } = await sb.auth.getSession();
      if(!session) return;
      const em = (session.user.email || '').toLowerCase();
      sb.channel('pay-' + em)
        .on('postgres_changes',
            { event:'INSERT', schema:'public', table:'hr_deductions' },
            () => refresh())
        .subscribe();
    }catch(e){ console.error('payroll realtime failed:', e); }
  }, 2500);
})();

// ============================================================
// الاستايل — بيتحقن من هنا مرة واحدة
// ------------------------------------------------------------
// ⚠️ الشاشة دي بتشتغل في ٣ صفحات وكل صفحة سمّية متغيراتها باسم
//    مختلف. عشان كده بتعرّف ألوانها بنفسها من data-theme اللي كل
//    الصفحات بتحطه على <html> — مش بتعتمد على أي متغيّر منها.
// ============================================================
(function payCss(){
  if(document.getElementById('payCss')) return;
  const s = document.createElement('style');
  s.id = 'payCss';
  s.textContent = `
  #payOverlay, #payBanner, #selfPayOverlay{
    --p-bg:#F1F5F9; --p-card:#FFFFFF; --p-line:#E2E8F0;
    --p-ink:#101014; --p-ink2:#334155; --p-mut:#64748B;
    --p-red:#DC2626; --p-red-bg:#FEF2F2; --p-green:#16A34A;
  }
  html[data-theme="dark"] #payOverlay, html[data-theme="dark"] #payBanner,
  html[data-theme="dark"] #selfPayOverlay{
    --p-bg:#131E29; --p-card:#1B2A3A; --p-line:#2F4356;
    --p-ink:#E9EFF5; --p-ink2:#C3D2DF; --p-mut:#92A6B8;
    --p-red:#F0554A; --p-red-bg:rgba(240,85,74,.14); --p-green:#4ADE80;
  }

  /* ===== البانر في الصفحة الرئيسية ===== */
  #payBanner{display:flex; align-items:center; gap:9px; cursor:pointer;
    background:#B45309; color:#fff; padding:11px 14px;
    font:800 13px/1.6 'Tajawal',system-ui,sans-serif; text-align:start;}
  #payBanner .pay-bell{font-size:16px; animation:payRing 2.2s ease-in-out infinite;}
  #payBanner .pay-bn-txt{flex:1; min-width:0;}
  #payBanner .pay-bn-go{flex:none; background:rgba(255,255,255,.2);
    border-radius:8px; padding:5px 10px; font-size:12px; white-space:nowrap;}
  @keyframes payRing{0%,88%,100%{transform:rotate(0)}
    91%{transform:rotate(14deg)} 95%{transform:rotate(-14deg)}}
  @media (prefers-reduced-motion:reduce){ #payBanner .pay-bell{animation:none;} }

  /* ===== النقطة على زرار الثلاث نقط ===== */
  .pay-dot{position:absolute; top:5px; inset-inline-end:5px; width:9px; height:9px;
    border-radius:50%; background:#DC2626; box-shadow:0 0 0 2px rgba(255,255,255,.75);
    pointer-events:none;}

  /* ===== الشاشة ===== */
  #payOverlay, #selfPayOverlay{position:fixed; inset:0; z-index:9400; background:var(--p-bg);
    overflow-y:auto; color:var(--p-ink);
    font-family:'Tajawal',system-ui,sans-serif;}
  #payOverlay.hidden, #selfPayOverlay.hidden{display:none;}
  .pay-page{min-height:100%;}
  /* env(safe-area-inset-top) = النتش وشريط الساعة في الأيفون */
  .pay-head{display:flex; align-items:center; gap:10px;
    padding:calc(14px + env(safe-area-inset-top)) 18px 14px;
    background:var(--p-card); border-bottom:1px solid var(--p-line);
    position:sticky; top:0; z-index:2;}
  .pay-head h2{flex:1; min-width:0; margin:0; font-family:'Cairo',sans-serif;
    font-size:18px; color:var(--p-ink);}
  .pay-close{flex:none; width:38px; height:38px; border:none; border-radius:10px;
    background:var(--p-bg); color:var(--p-ink); font-size:20px; cursor:pointer;}
  .pay-body{padding:16px 18px 44px;}

  .pay-busy{text-align:center; font-size:13px; color:var(--p-mut); padding:14px;}
  .pay-warn{background:rgba(180,83,9,.14); color:#B45309;
    border:1px solid rgba(180,83,9,.35); border-radius:11px; padding:12px 14px;
    font-size:12.5px; line-height:1.9; margin-bottom:14px;}
  html[data-theme="dark"] #payOverlay .pay-warn{color:#FBBF24;}
  .pay-warn-d{display:block; margin-top:5px; font-size:11px; opacity:.8;
    direction:ltr; word-break:break-word;}
  .pay-ok{text-align:center; color:var(--p-green); font-weight:800; font-size:15px;
    background:var(--p-card); border:1px solid var(--p-line);
    border-radius:13px; padding:22px 14px;}
  .pay-sec{font-weight:900; font-size:13.5px; color:var(--p-red); margin-bottom:10px;}

  .pay-sec.dim{color:var(--p-ink2); margin-top:20px;}
  .pay-card.good{border-color:var(--p-green); background:rgba(22,163,74,.08);}
  .pay-amt.good{font-size:19px; color:var(--p-green);}
  /* قايمة خصومات التأخير */
  .pay-late{background:var(--p-card); border:1px solid var(--p-line);
    border-radius:14px; padding:6px 12px;}
  .pay-late-row{display:flex; align-items:baseline; gap:9px; padding:9px 0;
    border-bottom:1px solid var(--p-line); font-size:13px; color:var(--p-ink2);}
  .pay-late-row:last-child{border-bottom:none;}
  .pay-late-row .d{flex:none; font-weight:800; color:var(--p-ink);}
  .pay-late-row .t{flex:1; min-width:0; font-size:11.5px; color:var(--p-mut);}
  .pay-late-row .v{flex:none;}
  .pay-late-row .v b{font-family:'Cairo',sans-serif; font-weight:900; font-size:15px;
    color:var(--p-red);}
  .pay-late-row .v b.ok{color:var(--p-green); font-size:12px;}
  .pay-late-row.off .d, .pay-late-row.off .t{opacity:.6;}
  .pay-late-why{font-size:11.5px; color:var(--p-green); padding:0 0 9px; line-height:1.8;}
  .pay-late-note{margin-top:10px; font-size:11.5px; line-height:1.9; color:var(--p-mut);}
  .pay-card{background:var(--p-card); border:1px solid var(--p-line);
    border-radius:14px; padding:14px; margin-bottom:11px;}
  .pay-card.new{border-color:var(--p-red); background:var(--p-red-bg);}
  .pay-card-top{display:flex; align-items:flex-start; justify-content:space-between; gap:10px;}
  .pay-amt{font-family:'Cairo',sans-serif; font-weight:900; font-size:25px;
    color:var(--p-red); line-height:1.2;}
  .pay-amt small{font-size:13px; font-weight:700;}
  .pay-when{text-align:end; font-size:11.5px; color:var(--p-mut); line-height:1.7;}
  .pay-when span{opacity:.8;}
  .pay-why{margin-top:9px; font-size:14px; line-height:1.9; color:var(--p-ink2);
    word-break:break-word;}
  .pay-why b{color:var(--p-ink);}
  .pay-ok-btn{width:100%; margin-top:12px; border:none; border-radius:12px;
    padding:13px; background:var(--p-green); color:#fff;
    font:900 15px/1 'Tajawal',system-ui,sans-serif; cursor:pointer;}
  .pay-seen{margin-top:9px; font-size:11.5px; color:var(--p-mut);}

  .pay-tot{margin-top:18px; background:var(--p-card); border:1px solid var(--p-line);
    border-radius:16px; padding:18px 16px; text-align:center;}
  /* كروت كشف الراتب */
  .pay-tot.slip{margin-top:11px; padding:14px 16px; border-color:var(--p-line);}
  .pay-tot.slip.paid{border-color:var(--p-green);}
  .pay-slip-h{display:flex; align-items:baseline; justify-content:space-between; gap:10px;}
  .pay-slip-h b{font-size:15px; color:var(--p-ink);}
  .pay-slip-tag{flex:none; font-size:11px; font-weight:800; border-radius:7px;
    padding:3px 9px;}
  .pay-slip-tag.ok{background:rgba(22,163,74,.14); color:var(--p-green);}
  .pay-slip-tag.wait{background:rgba(180,83,9,.14); color:#B45309;}
  html[data-theme="dark"] #payOverlay .pay-slip-tag.wait{color:#FBBF24;}
  .pay-slip-meta{margin-top:10px; padding-top:9px; border-top:1px solid var(--p-line);
    font-size:11px; line-height:1.8; color:var(--p-mut); text-align:start;}
  /* 🧾 زرار المحاسب العام: قفل مرتبه بنفسه */
  .pay-self-btn{width:100%; margin-top:12px; border:none; border-radius:12px;
    padding:13px; background:var(--p-green); color:#fff; cursor:pointer;
    font:900 14.5px/1.3 'Tajawal',system-ui,sans-serif;}
  .pay-self-btn.undo{background:var(--p-bg); color:var(--p-mut);
    border:1px solid var(--p-line); font-size:12.5px; padding:10px;}

  /* 🧾 «كشف مرتبي» — المحاسب العام */
  html[data-theme="dark"] #selfPayOverlay .pay-warn{color:#FBBF24;}
  html[data-theme="dark"] #selfPayOverlay .pay-slip-tag.wait{color:#FBBF24;}
  html[data-theme="dark"] #selfPayOverlay .pay-exw-sec.warn{color:#FBBF24;}
  .sp-sal-card{background:var(--p-card); border:1px solid var(--p-line);
    border-radius:16px; padding:14px 16px;}
  .sp-sal-h{font-weight:900; font-size:14.5px; color:var(--p-ink); margin-bottom:10px;}
  .sp-sal-row{display:flex; gap:8px;}
  .sp-sal-row input{flex:1; min-width:0; border:1px solid var(--p-line);
    background:var(--p-bg); color:var(--p-ink); border-radius:11px; padding:11px 12px;
    font:800 16px/1.2 'Tajawal',system-ui,sans-serif; text-align:center;}
  .sp-sal-row button{flex:none; border:none; border-radius:11px; padding:11px 16px;
    background:var(--p-green); color:#fff; cursor:pointer;
    font:900 14px/1 'Tajawal',system-ui,sans-serif;}
  .sp-sal-hint{margin-top:9px; font-size:12px; line-height:1.8; color:var(--p-mut);}
  .sp-sal-hint.warn{color:#B45309; font-weight:800;}
  html[data-theme="dark"] #selfPayOverlay .sp-sal-hint.warn{color:#FBBF24;}
  .sp-wd-btn{width:100%; margin-top:10px; border:1px dashed var(--p-line);
    background:none; color:var(--p-ink2); border-radius:10px; padding:10px;
    font:800 13px/1 'Tajawal',system-ui,sans-serif; cursor:pointer;}
  .sp-wd{margin-top:8px; text-align:start; border:1px solid var(--p-line);
    border-radius:11px; padding:4px 11px; background:var(--p-bg);}
  .sp-wd-row{display:flex; align-items:baseline; gap:9px; padding:8px 0;
    border-bottom:1px solid var(--p-line); font-size:13px;}
  .sp-wd-row:last-child{border-bottom:none;}
  .sp-wd-row .d{flex:none; font-weight:800; color:var(--p-ink); font-size:12px;}
  .sp-wd-row .t{flex:1; min-width:0; color:var(--p-mut); font-size:12px; word-break:break-word;}
  .sp-wd-row b{flex:none; font-family:'Cairo',sans-serif; font-weight:900; color:var(--p-red);}
  .sp-wd-row b.ok{color:var(--p-green);}
  .sp-wd-row.off .d, .sp-wd-row.off .t, .sp-wd-row.off b{opacity:.5; text-decoration:line-through;}
  .pay-tot-big{display:flex; align-items:baseline; justify-content:center; gap:6px;}
  .pay-tot-n{font-family:'Cairo',sans-serif; font-weight:900; font-size:36px;
    color:var(--p-red); line-height:1;}
  .pay-tot-c{font-size:15px; font-weight:800; color:var(--p-red); opacity:.85;}
  .pay-tot-l{margin-top:7px; font-size:13px; font-weight:800; color:var(--p-ink2);}
  .pay-tot-n.net{color:var(--p-green);}
  .pay-tot-c.net{color:var(--p-green);}
  .pay-tot-hint{margin-top:9px; font-size:12px; line-height:1.9; color:var(--p-mut);}
  .pay-calc{margin-top:14px; padding-top:12px; border-top:1px dashed var(--p-line);
    text-align:start;}
  .pay-calc div{display:flex; justify-content:space-between; align-items:baseline;
    gap:10px; padding:5px 0; font-size:14px; color:var(--p-ink2);}
  .pay-calc b{font-family:'Cairo',sans-serif; font-weight:900; font-size:16px;
    color:var(--p-ink);}
  .pay-calc b.minus{color:var(--p-red);}
  .pay-calc .eq{margin-top:5px; padding-top:8px; border-top:1px solid var(--p-line);}
  .pay-calc .eq b{color:var(--p-green); font-size:18px;}
  .pay-tot-all{margin-top:9px; padding-top:9px; border-top:1px solid var(--p-line);
    font-size:12px; color:var(--p-mut); line-height:1.9;}
  .pay-tot-all b{color:var(--p-ink2);}

  .pay-more{width:100%; margin-top:14px; border:1px solid var(--p-line);
    background:var(--p-card); color:var(--p-ink2); border-radius:12px; padding:12px;
    font:800 13px/1 'Tajawal',system-ui,sans-serif; cursor:pointer;}
  .pay-old{margin-top:11px;}
  .pay-old.hidden{display:none;}

  .pay-push-btn{width:100%; margin-top:16px; border:none; border-radius:12px;
    padding:14px 12px; background:#0891A8; color:#fff;
    font:800 13.5px/1.5 'Tajawal',system-ui,sans-serif; cursor:pointer;}
  .pay-push-on{margin-top:16px; text-align:center; font-size:12.5px;
    color:var(--p-green); font-weight:800;}
  .pay-push-hint{margin-top:16px; background:var(--p-card);
    border:1px solid var(--p-line); border-radius:12px; padding:13px 14px;
    font-size:12.5px; line-height:2; color:var(--p-ink2);}

  /* 🗄️ الدرجين */
  .pay-drws{margin-top:20px; display:flex; flex-direction:column; gap:10px;}
  .pay-drw{display:flex; align-items:center; justify-content:space-between; gap:10px;
    width:100%; border:1px solid var(--p-line); background:var(--p-card); color:var(--p-ink);
    border-radius:14px; padding:16px; cursor:pointer;
    font:900 15px/1.2 'Tajawal',system-ui,sans-serif; text-align:start;}
  .pay-drw.open{border-bottom-left-radius:4px; border-bottom-right-radius:4px;}
  .pay-drw-t{display:flex; align-items:center; gap:8px;}
  .pay-drw-a{color:var(--p-mut); font-size:14px;}
  .pay-drw-dot{display:inline-block; width:9px; height:9px; border-radius:50%;
    background:var(--p-red);}
  .pay-drw-body{margin-top:-6px; border:1px solid var(--p-line); border-top:none;
    background:var(--p-bg); border-radius:0 0 14px 14px; padding:12px 10px 4px;}
  .pay-drw-m{font-size:12px; font-weight:800; color:var(--p-mut); margin:0 4px 10px;}
  .pay-drw-empty{text-align:center; color:var(--p-mut); font-size:13px; padding:14px 8px 18px;}
  .pay-drw-body .pay-late{margin-bottom:11px;}

  /* 🔗 درج «اسمي في الإكسل» */
  .pay-exw-hint{font-size:12.5px; line-height:1.95; color:var(--p-ink2);
    background:var(--p-card); border:1px solid var(--p-line); border-radius:11px;
    padding:11px 12px; margin:0 0 12px;}
  .pay-exw-sec{font-weight:900; font-size:13px; color:var(--p-ink2); margin:14px 4px 8px;}
  .pay-exw-sec.ok{color:var(--p-green);}
  .pay-exw-sec.warn{color:#B45309;}
  html[data-theme="dark"] #payOverlay .pay-exw-sec.warn{color:#FBBF24;}
  .pay-exw-row{display:flex; align-items:center; gap:10px; background:var(--p-card);
    border:1px solid var(--p-line); border-radius:12px; padding:11px 12px; margin-bottom:8px;}
  .pay-exw-row.ok{border-color:var(--p-green);}
  .pay-exw-row.warn{border-color:#B45309;}
  .pay-exw-mid{flex:1; min-width:0;}
  .pay-exw-mid b{display:block; font-size:14.5px; color:var(--p-ink); word-break:break-word;}
  .pay-exw-mid span{font-size:11.5px; color:var(--p-mut); line-height:1.8; word-break:break-word;}
  .pay-exw-me{flex:none; border:none; border-radius:10px; padding:10px 12px;
    background:var(--p-green); color:#fff; cursor:pointer;
    font:900 13px/1 'Tajawal',system-ui,sans-serif;}
  .pay-exw-x{flex:none; border:none; background:none; color:var(--p-mut);
    font-size:17px; cursor:pointer; padding:4px 6px;}

  .pay-note{margin-top:18px; font-size:12px; line-height:2; color:var(--p-mut);
    text-align:center;}`;
  (document.head || document.documentElement).appendChild(s);
})();
