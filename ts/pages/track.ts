
// ============================================================
// FIX TEAM — صفحة «متابعة جهازك» للعميل (track.html)
// ------------------------------------------------------------
// 🟦 (٢٠٢٦-١٠-٢٢) الكود ده كان جوه track.html نفسها (<script> … </script>)
//    واتنقل هنا. الصفحة بقت بتنده: <script src="pages/track.js"></script>
//    🧸 نفس الكود بالحرف — اتزوّد بس «ورق» بيقول نوع كل حاجة.
//       المترجم بيشيل الورق ده والمتصفح بياخد نفس الكود القديم.
// ⚠️ بيتحمّل بعد common.js (sb · esc) — زي ما كان جوه الصفحة بالظبط.
// ============================================================
// 🏷️ الأنواع — بتختفي بعد الترجمة
/** بيانات الجهاز اللي السيرفر بيبعتها للعميل — get_tracking() */
interface TrackData {
  deviceType: string;
  model: string;
  /** رقم المتابعة */
  ref?: string;
  customerName?: string;
  status: string;
  /** نتيجة الورشة لما الجهاز يرجع للاستقبال (rejected …) */
  outcome?: string;
  rejectReason?: string;
  /** الميعاد المتوقع */
  dueAt?: string | null;
  dueChanged?: boolean;
  issue?: string;
  deepInspectionRequested?: boolean;
  priceConfirmRequested?: boolean;
  price: number;
  updatedAt?: string;
}
/** ردود العميل (موافق / مش موافق) — get_track_response() */
interface TrackResponses { deep_inspection_response?: string; price_response?: string; }

if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(() => {}); }

// ===== إعدادات البيئة: إنتاج / تجريبي (Staging) =====
// نطاق الإنتاج بس بيستخدم قاعدة الإنتاج. أي نطاق تاني (تجريبي/معاينة/لوكال) بيستخدم Staging تلقائياً
// عشان مستحيل نشر تجريبي يلمس بيانات الإنتاج بالغلط.
// الاتصال بقاعدة البيانات + تحديد البيئة + شريط STAGING + esc
// اتنقلوا كلهم لـ common.js (بيتحمّل فوق قبل السكربت ده).

const $: (id: string) => HTMLElement = id => document.getElementById(id)!;
const token = new URLSearchParams(location.search).get('t');
let lastPayload = null;

async function respond(kind: string, answer: string){
  if(!token) return;
  try{
    const { error } = await sb.rpc('submit_track_response', { p_token: token, p_kind: kind, p_answer: answer });
    if(error) throw error;
  }catch(e){ alert('حصل خطأ، جرّب تاني'); return; }
  showApproveResult(kind, answer);
}

function showApproveResult(kind: string, answer: string){
  const cardId = kind === 'deep' ? 'deepCard' : 'priceCardApprove';
  const resultId = kind === 'deep' ? 'deepResult' : 'priceResult';
  $(cardId).style.display = 'none';
  const r = $(resultId);
  r.style.display = 'block';
  r.className = 'approve-result ' + (answer === 'accepted' ? 'yes' : 'no');
  r.textContent = answer === 'accepted'
    ? (kind === 'deep' ? '✅ تم إرسال موافقتك على الفحص الدقيق' : '✅ تم إرسال موافقتك على السعر')
    : '📝 تم إرسال ردك، هيتواصل معاك المحل';
}

async function loadResponses(): Promise<TrackResponses> {
  if(!token) return {};
  try{
    const { data } = await sb.rpc('get_track_response', { p_token: token });
    return data || {};
  }catch(e){ return {}; }
}

// المراحل اللي العميل بيشوفها (لحد تم الصيانة، والتسليم بيظهر كمكافأة نهائية)
const STEPS = [
  { key:'waiting',    icon:'📥', title:'تم استلام الجهاز',  sub:'جهازك اتسجل عندنا وداخل على الفحص', pct:15 },
  { key:'diagnosing', icon:'🔍', title:'جاري الكشف',        sub:'بنفحص الجهاز لتحديد العطل بدقة', pct:45 },
  { key:'repairing',  icon:'🔧', title:'جاري الصيانة',      sub:'العطل اتحدد والصيانة شغالة فعلياً', pct:75 },
  { key:'done',       icon:'🎉', title:'تمت الصيانة',       sub:'جهازك جاهز للاستلام من المحل', pct:100 },
];
const ORDER = ['waiting','diagnosing','repairing','done'];

// ⏳ (٢٠٢٦-١٠-١٣) «النهارده ٦ م» / «بكره ٢ م» / «الخميس ١٥ أكتوبر ٦ م»
function dueWhenTxt(iso: string): string {
  const d = new Date(iso);
  if(isNaN(d as any)) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round(((day as any) - (today as any)) / 86400000);
  const tm = d.toLocaleTimeString('ar-EG', { hour:'numeric', minute:'2-digit' });
  if(diff === 0) return 'النهارده ' + tm;
  if(diff === 1) return 'بكره ' + tm;
  return d.toLocaleDateString('ar-EG', { weekday:'long', day:'numeric', month:'long' }) + ' ' + tm;
}

let responses: TrackResponses = {};
function renderTrack(data: TrackData){
  $('loading').style.display = 'none';
  $('notfound').style.display = 'none';
  $('content').style.display = 'block';

  $('devName').textContent = `${data.deviceType} ${data.model}`.trim();
  $('devRef').textContent = 'رقم المتابعة: ' + (data.ref || '');
  $('hello').textContent = data.customerName ? `أهلاً ${data.customerName} 👋 دي حالة جهازك لحظة بلحظة` : 'دي حالة جهازك لحظة بلحظة';

  // ============================================================
  // 🛎️ (٢٠٢٦-١٠-١١) حالتين جداد من موظف الاستقبال:
  //   sent_to_repair / received_from_reception → «الجهاز في قسم الصيانة»
  //   sent_to_reception → زي «تمت الصيانة» (جاهز للاستلام)
  //   (لو الورشة رفضته الجهاز بيروح «تم الرفض» على طول)
  //   🧸 العميل مالوش دعوة بالتفاصيل الداخلية — بنوريه المعنى بس.
  // ============================================================
  let st = data.status;
  // 🔴 «المرفوض» كمان — العميل مايعرفش إنه اترفض لحد ما مدير الإنتاج يقرر ويبعته
  const sentToRepair = (st === 'sent_to_repair' || st === 'received_from_reception' || st === 'workshop_rejected');
  // 📥 صندوق الاستلام فيه الاتنين — العميل بيشوف نتيجة الورشة · درج الخالص = جاهز
  if(st === 'sent_to_reception') st = (data.outcome === 'rejected') ? 'rejected' : 'done';
  if(st === 'fixed_drawer') st = 'done';
  const special = $('specialBox');
  special.style.display = 'none';

  let idx = ORDER.indexOf(st);
  let pct: number, statusText: string, full = false;

  if(st === 'delivered'){
    idx = ORDER.length - 1; pct = 100; full = true;
    statusText = '✅ تم تسليم الجهاز — شكراً لثقتك في FIX TEAM';
  } else if(st === 'rejected'){
    idx = -1; pct = 100; full = false;
    statusText = 'تم الاعتذار عن الصيانة';
    special.style.display = 'block';
    special.style.background = '#FEF2F2'; special.style.border = '1.5px solid #FECACA'; special.style.color = '#B91C1C';
    // 🚫 (المرحلة الأولى) سبب الرفض اللي مدير الإنتاج اختاره — لو موجود
    special.textContent = 'للأسف تعذّرت صيانة الجهاز'
      + (data.rejectReason ? ' — السبب: ' + data.rejectReason : '')
      + '. تقدر تستلمه من المحل، وكلمنا لأي استفسار 🙏';
  } else if(st === 'returned'){
    idx = -1; pct = 100; full = false;
    statusText = 'الجهاز في المرتجعات';
    special.style.display = 'block';
    special.style.background = '#FFF7ED'; special.style.border = '1.5px solid #FED7AA'; special.style.color = '#C2410C';
    special.textContent = 'الجهاز رجع للمراجعة عندنا — هنتواصل معاك بالتفاصيل في أقرب وقت';
  } else if(sentToRepair){
    idx = 1; pct = 30; full = false;
    statusText = '🔧 الجهاز في قسم الصيانة';
  } else {
    if(idx < 0) idx = 0;
    pct = STEPS[idx].pct;
    full = (st === 'done');
    statusText = STEPS[idx].icon + ' ' + STEPS[idx].title;
  }

  const bar = $('bar');
  bar.classList.toggle('full', full);
  requestAnimationFrame(() => { bar.style.width = pct + '%'; });
  $('pct').textContent = pct + '%';
  $('statusLine').textContent = statusText;

  // ⏳ (٢٠٢٦-١٠-١٣) الميعاد المتوقع — طول ما الجهاز لسه بيتصلّح بس
  //    (لو الميعاد عدّى مابنكتبش «متأخر» للعميل — بنقوله إننا بنخلّصه)
  const working = (st === 'waiting' || st === 'diagnosing' || st === 'repairing' || sentToRepair);
  if(data.dueAt && working){
    const late = Date.parse(data.dueAt) < Date.now();
    $('dueCard').style.display = 'block';
    $('dueWhen').textContent = late ? 'بنخلّص جهازك دلوقتي 🔧' : dueWhenTxt(data.dueAt);
    $('dueChg').textContent = late ? 'هنبلغك أول ما يجهز' : (data.dueChanged ? 'الميعاد اتعدّل بعد ما اتفقنا معاك 🙏' : '');
  } else {
    $('dueCard').style.display = 'none';
  }

  $('steps').innerHTML = STEPS.map((s, i) => {
    const cls = (st === 'delivered' || i < idx) ? 'done' : (i === idx && st !== 'delivered' ? (st === 'done' ? 'done' : 'current') : '');
    const dot = (cls === 'done') ? '✓' : s.icon;
    return `<div class="step ${cls}">
      <div class="dot">${dot}</div>
      <div><div class="step-title">${s.title}</div><div class="step-sub">${s.sub}</div></div>
    </div>`;
  }).join('');

  // العطل: قبل الصيانة = المُبلّغ عنه، من الصيانة وبعدها = المكتشف
  if(data.issue && data.issue.trim()){
    $('issueCard').style.display = 'block';
    const discovered = ['repairing','done','delivered'].includes(st);
    $('issueLbl').textContent = discovered ? '🔎 تم اكتشاف العطل' : '📝 العطل المُبلّغ عنه';
    $('issueTxt').textContent = data.issue;
  } else {
    $('issueCard').style.display = 'none';
  }

  // رسالة الاستلام من الفرع
  $('pickupBox').style.display = (st === 'done') ? 'block' : 'none';

  // طلب الفحص الدقيق
  if(data.deepInspectionRequested && st !== 'delivered'){
    if(responses.deep_inspection_response){
      $('deepCard').style.display = 'none';
      showApproveResult('deep', responses.deep_inspection_response);
    } else {
      $('deepCard').style.display = 'block';
      $('deepResult').style.display = 'none';
    }
  } else {
    $('deepCard').style.display = 'none';
    $('deepResult').style.display = 'none';
  }

  if(data.price > 0){
    $('priceCard').style.display = 'block';
    $('priceNum').textContent = data.price.toLocaleString('en-EG') + ' ج.م';
    // طلب تأكيد السعر
    if(data.priceConfirmRequested && st !== 'delivered'){
      if(responses.price_response){
        $('priceCardApprove').style.display = 'none';
        showApproveResult('price', responses.price_response);
      } else {
        $('priceCardApprove').style.display = 'block';
        $('priceResult').style.display = 'none';
      }
    } else {
      $('priceCardApprove').style.display = 'none';
      $('priceResult').style.display = 'none';
    }
  } else {
    $('priceCard').style.display = 'none';
  }

  $('meta').textContent = 'آخر تحديث: ' + new Date(data.updatedAt || Date.now()).toLocaleString('ar-EG');
}

// إيقاع السحب — الجهاز لسه في المحل / اتسلّم
const POLL_ACTIVE = 60000;    // دقيقة
const POLL_IDLE   = 600000;   // عشر دقايق بعد التسليم
let pollMs = 0, pollTimer: ReturnType<typeof setInterval> | null = null;

// ما بنسحبش والصفحة مش ظاهرة. الرجوع للتاب بيحدّث
// فوراً تحت — فالعميل مش بيفوته حاجة.
function tick(){ if(!document.hidden) load(); }

function schedule(ms: number){
  if(ms === pollMs) return;
  if(pollTimer) clearInterval(pollTimer);
  pollMs = ms;
  pollTimer = setInterval(tick, ms);
}

async function load(){
  if(!token){ $('loading').style.display='none'; $('notfound').style.display='block'; return; }
  try{
    const { data, error } = await sb.rpc('get_tracking', { p_token: token });
    if(error || !data){ $('loading').style.display='none'; $('notfound').style.display='block'; return; }
    const payload: TrackData = JSON.parse(data);

    // الطلب التاني لما يكون فيه سؤال معلّق بس. لو مفيش،
    // renderTrack أصلاً مبتقراش responses — فكنّا بنجيبها ونرميها.
    const asking = !!(payload.deepInspectionRequested || payload.priceConfirmRequested)
                   && payload.status !== 'delivered';
    responses = asking ? await loadResponses() : {};

    renderTrack(payload);

    // اتسلّم ؟ نهدّي الإيقاع وما نوقفش — الجهاز ممكن
    // يرجع مرتجع ويتطلب موافقة على سعر جديد.
    schedule(payload.status === 'delivered' ? POLL_IDLE : POLL_ACTIVE);
  }catch(e){
    $('loading').style.display='none'; $('notfound').style.display='block';
  }
}

load();
schedule(POLL_ACTIVE);
// ولو العميل رجع للصفحة بعد ما سابها، تتحدث فوراً
document.addEventListener('visibilitychange', () => { if(!document.hidden) load(); });
