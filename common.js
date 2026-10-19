// ============================================================
// I Fix Team — كود مشترك بين كل الصفحات (common.js)
// ------------------------------------------------------------
// الفكرة ببساطة: الحاجات اللي كانت متكرّرة في كل ملف (الاتصال بقاعدة
// البيانات، تحديد البيئة، شريط التجربة، تأمين النصوص) بنكتبها هنا
// **مرة واحدة بس**. أي تعديل هنا بيسري على كل الصفحات على طول.
//
// ⚠️ الترتيب مهم — لازم يتحمّل بعد مكتبة supabase-js وقبل كود الصفحة:
//     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//     <script src="common.js"></script>
//     <script> ...كود الصفحة... </script>
//
// ⚠️ أي صفحة بتضيف common.js لازم **تشيل** من كودها التعريفات دي:
//     SUPABASE_ENVS · PROD_HOSTS · APP_ENV · sb · esc  (+ شريط STAGING)
//     لو فضلت متعرّفة في الصفحة كمان، المتصفح هيقول
//     "Identifier already declared" والصفحة **كلها هتقع**.
//
// 🔄 وفي آخر الملف: «التحديث بدوسة واحدة» لكل الشاشات (IFixUpdate).
// ============================================================

// ===== إعدادات البيئة: إنتاج / تجريبي (Staging) =====
// نطاق الإنتاج بس بيستخدم قاعدة الإنتاج. أي نطاق تاني (تجريبي/معاينة/
// لوكال) بيستخدم Staging تلقائياً — عشان مستحيل نشر تجريبي يلمس
// بيانات الإنتاج بالغلط.
const SUPABASE_ENVS = {
  production: {
    url: "https://ujpnewqqdkmiedtwvdsy.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcG5ld3FxZGttaWVkdHd2ZHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MzI0ODEsImV4cCI6MjEwMDAwODQ4MX0.PVreBU_ONzAsHO58AJgXVUhuZjvz0quJU8OTxEVcjDc"
  },
  staging: {
    url: "https://farfaazxogpvxmujnedu.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcmZhYXp4b2dwdnhtdWpuZWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNDc2MzQsImV4cCI6MjEwMDYyMzYzNH0.uCWokM2rtM20PPCVGCfsW5X0WkDYi2Bl3jcqiogBsME"
  }
};

// نطاقات الإنتاج بس. أي دومين مش في القايمة = staging.
// ⚠️ عن قصد مش بنحط دومين المعاينة (assistant.fix-team.pages.dev) هنا،
//    عشان النسخة القديمة عليه ما تلمسش قاعدة الإنتاج بالغلط.
//    لو جبت دومين مخصص (زي ifixteam.com) زوّده هنا.
const PROD_HOSTS = ["fix-team.pages.dev"];
const APP_ENV = PROD_HOSTS.includes(location.hostname) ? "production" : "staging";
const sb = supabase.createClient(SUPABASE_ENVS[APP_ENV].url, SUPABASE_ENVS[APP_ENV].key);

// شريط أصفر تحت الشاشة لو إحنا على بيئة التجربة — عشان تفرّق بسرعة
// إنك مش على الإنتاج.
if (APP_ENV === "staging") {
  addEventListener("DOMContentLoaded", function () {
    var b = document.createElement("div");
    b.textContent = "🧪 بيئة تجريبية — STAGING";
    b.style.cssText = "position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#B45309;color:#fff;text-align:center;font:700 12px/1.7 system-ui,sans-serif;padding:5px;";
    document.body.appendChild(b);
  });
}

// ============================================================
// 📱 ده فون ولا كمبيوتر؟
// ------------------------------------------------------------
// ⚠️ نفس منطق attIsPhone (attendance.js) و payIsPhone (payroll.js)
//    بالحرف — عشان «فون» يبقى معناه واحد في النظام كله:
//    المتصفح بيقول إنه موبايل **و** الشاشة بتاعة لمس.
//    (الآيباد الحديث بيقول عن نفسه «ماك»، فبيتحسب كمبيوتر.)
// ============================================================
function commonIsPhone(){
  try{
    const ua = navigator.userAgent || '';
    const mobileUA = /iPhone|iPad|iPod|Android|Mobile/i.test(ua);
    const touch = (navigator.maxTouchPoints || 0) > 0;
    return mobileUA && touch;
  }catch(e){ return false; }
}

// ============================================================
// ⚙️ «لوحة الأدمن» — على الفون بس
// ------------------------------------------------------------
// 🧠 بالبلدي: الزرار بيتعمل في قايمة التلت نقط في الداشبورد
//    (injectAdminMenu). على الكمبيوتر بنحط عليه «طاقية إخفاء»
//    من أول لحظة — فمبيظهرش خالص، حتى لو اتعمل بعدين.
//
// ⚠️ ده إخفاء للزرار بس. لو حد فتح admin.html بالرابط من كمبيوتر،
//    الصفحة نفسها بترجّعه على شاشة المحاسب (شوف boot في admin.html).
//    ومفيش استثناء — حتى لو الاشتراك خلصان، التفعيل من الفون بس.
// ============================================================
(function(){
  try{
    if(commonIsPhone()) return;
    var st = document.createElement('style');
    st.id = 'commonDeskHide';
    st.textContent = '#adminMenuBtn{display:none !important;}';
    (document.head || document.documentElement).appendChild(st);
  }catch(e){}
})();

// ===== خطط الاشتراك =====
// ⚠️ الأسعار وسعر الصرف هنا **مرة واحدة بس**. بيظهروا في المنشور،
//    وفي صفحة "حسابي"، وفي لوحة الأدمن.
//
// 🔧 عايز تغيّر سعر الدولار؟ غيّر الرقم اللي تحت وارفع common.js. خلاص.
//    وعايز تغيّر سعر خطة؟ غيّر رقم usd بتاعها هنا.
const USD_RATE = 50;   // ← سعر الدولار بالجنيه (غيّره من هنا لما يتغيّر)
const PLANS = [
  { key:'monthly', label:'شهري',   months:1, usd:300,  off:0  },
  { key:'quarter', label:'٣ شهور', months:3, usd:855,  off:5  },
  { key:'half',    label:'٦ شهور', months:6, usd:1620, off:10 },
];
// تنسيق السعر: بالدولار وجنبه ما يعادله بالمصري
function planPrice(p){
  const egp = Math.round(p.usd * USD_RATE);
  return '$' + p.usd.toLocaleString('en-US') + ' (ما يعادل ' + egp.toLocaleString('en-US') + ' ج.م)';
}

// ===== شاشة إيقاف الخدمة =====
// بتظهر لما الفترة المجانية تخلص والاشتراك مش مفعّل. رسالة واحدة
// لكل الصفحات، وأول ما يدوس "فهمت" بيتسجّل خروج ويتقفل.
//
// 🔧 لو رجعت تستخدم صفحة الدفع بعدين: نادي showServiceStopped(true)
//    وهتوديه لـ checkout.html بدل الخروج.
function showServiceStopped(toCheckout){
  if (document.getElementById('svcStopOv')) return;
  const ov = document.createElement('div');
  ov.id = 'svcStopOv';
  ov.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;background:#0B1220;color:#fff;' +
    'display:flex;align-items:center;justify-content:center;padding:24px;' +
    'font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;';
  ov.innerHTML =
    '<div dir="rtl" style="max-width:420px;text-align:center;">' +
      '<div style="font-size:52px;margin-bottom:10px;">⛔</div>' +
      '<h2 style="margin:0 0 10px;font-size:21px;font-weight:900;">تم إيقاف الخدمة</h2>' +
      '<p style="margin:0 0 22px;font-size:15px;line-height:2;opacity:.9;">' +
        'انتهت مدة الاشتراك الحالية.<br>برجاء الاشتراك لاستئناف الخدمة.' +
      '</p>' +
      '<button id="svcStopOk" style="width:100%;padding:14px;border:none;border-radius:12px;' +
        'background:#0891A8;color:#fff;font:900 15px/1 inherit;cursor:pointer;">فهمت</button>' +
    '</div>';
  document.body.appendChild(ov);
  document.getElementById('svcStopOk').onclick = async function(){
    this.disabled = true;
    this.textContent = 'جاري الإغلاق…';
    if (toCheckout) { window.location.href = 'checkout.html'; return; }
    try { await sb.auth.signOut(); } catch (e) {}
    try { window.close(); } catch (e) {}          // بيقفل التطبيق المثبّت
    window.location.href = 'index.html';          // احتياطي لو ما اتقفلش
  };
}

// ===== 👤 صفحة "حسابي" المشتركة =====
// الفني والديسباتشر بيفتحوا صفحات مستقلة عن الداشبورد، فبنحط
// الشاشة هنا مرة واحدة والصفحتين بتستخدموها.
//
// الاستخدام في الصفحة:
//   1) زرار في القايمة:  <button id="accountMenuBtn" class="hidden" onclick="openAccountShared()">👤 حسابي</button>
//   2) بعد تسجيل الدخول: syncAccountShared(email, name, roleLabel)
const SUBINFO_KEY = 'subscription-info';
let _accUser = { email:'', name:'', role:'' };
let _accInfo = {};

// بيظهر الزرار **بس** لو الشخص ده وصله منشور خطط الاشتراك
async function syncAccountShared(email, name, roleLabel){
  _accUser = { email:(email||'').toLowerCase(), name:name||'', role:roleLabel||'' };
  const btn = document.getElementById('accountMenuBtn');
  if(!btn) return;
  if(!_accUser.email){ btn.classList.add('hidden'); return; }
  const key = 'broadcast:user:' + _accUser.email;
  try{
    const { data, error } = await sb.from('app_data').select('value').eq('key', key).maybeSingle();
    if(error) throw error;
    let show = false;
    if(data && data.value){
      try{ show = JSON.parse(data.value).subPlan === true; }catch(e){}
      if(!show) console.info('[حسابي] فيه منشور شخصي بس مش منشور أسعار');
    }else{
      console.info('[حسابي] مفيش منشور شخصي على المفتاح:', key);
    }
    btn.classList.toggle('hidden', !show);
    // مش بنعتمد على الـ CSS لوحده — بنقفل العرض مباشرة كمان،
    // عشان لو الصفحة مفيهاش قاعدة .hidden يفضل الإخفاء شغّال.
    btn.style.display = show ? '' : 'none';
  }catch(e){
    console.error('[حسابي] فشلت قراءة المنشور:', e);
    btn.classList.add('hidden');
    btn.style.display = 'none';
  }
}

async function openAccountShared(){
  try{
    const { data } = await sb.from('app_data').select('value').eq('key', SUBINFO_KEY).maybeSingle();
    _accInfo = (data && data.value) ? (JSON.parse(data.value) || {}) : {};
  }catch(e){ _accInfo = {}; }

  let ov = document.getElementById('accSharedOv');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'accSharedOv';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99990;background:rgba(8,14,20,.6);'
      + 'display:flex;align-items:flex-end;justify-content:center;';
    ov.onclick = e => { if(e.target === ov) ov.remove(); };
    document.body.appendChild(ov);
  }
  const P = PLANS.map(p =>
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;'
    + 'border:1px solid rgba(128,128,128,.3);border-radius:12px;padding:12px 14px;margin-bottom:8px;">'
    + '<div><b>' + esc(p.label) + '</b>'
    + (p.off ? ' <span style="background:#16A34A;color:#fff;border-radius:20px;padding:2px 8px;font-size:11px;font-weight:800;">وفّر ' + p.off + '%</span>' : '')
    + '</div><div style="font-weight:800;font-size:13px;white-space:nowrap;">' + esc(planPrice(p)) + '</div></div>').join('');

  ov.innerHTML =
    '<div dir="rtl" style="width:100%;max-width:560px;max-height:90vh;overflow-y:auto;background:#0F172A;'
    + 'color:#E2E8F0;border-radius:18px 18px 0 0;padding:18px 16px 40px;font-family:inherit;">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">'
      + '<h3 style="margin:0;flex:1;font-size:16px;">👤 حسابي</h3>'
      + '<button onclick="document.getElementById(\'accSharedOv\').remove()" '
        + 'style="border:none;background:#1E293B;color:#E2E8F0;width:34px;height:34px;border-radius:10px;font-size:16px;cursor:pointer;">✕</button>'
    + '</div>'
    + '<div style="border:1px solid rgba(128,128,128,.3);border-radius:14px;padding:14px;margin-bottom:12px;line-height:2;">'
      + '<div>الاسم: <b>' + esc(_accUser.name || '—') + '</b></div>'
      + '<div>البريد: <span dir="ltr">' + esc(_accUser.email || '—') + '</span></div>'
      + (_accUser.role ? '<div>الصلاحية: <b>' + esc(_accUser.role) + '</b></div>' : '')
    + '</div>'
    + '<div style="font-weight:800;margin:16px 0 8px;">📦 خطط الاشتراك</div>' + P
    + '<div style="font-size:12.5px;opacity:.75;line-height:1.9;margin-bottom:16px;">'
      + '💳 سيتم إرسال طرق الدفع المتاحة على بريدكم الإلكتروني بعد تسجيل البيانات.</div>'
    + '<div style="font-weight:800;margin:16px 0 6px;">📝 بيانات التواصل للاشتراك</div>'
    + '<div style="font-size:12px;opacity:.75;margin-bottom:8px;">تقدر تعدّلها في أي وقت — التعديل بيوصل للإدارة على طول.</div>'
    + '<input id="acName"  placeholder="الاسم"            value="' + esc(_accInfo.name||'')  + '" style="' + _accIn() + '">'
    + '<input id="acPhone" placeholder="رقم الهاتف" dir="ltr" value="' + esc(_accInfo.phone||'') + '" style="' + _accIn() + '">'
    + '<input id="acEmail" placeholder="البريد الإلكتروني" dir="ltr" value="' + esc(_accInfo.email||'') + '" style="' + _accIn() + '">'
    + '<select id="acPlan" style="' + _accIn() + '">'
      + '<option value="">— الخطة المطلوبة (اختياري) —</option>'
      + PLANS.map(p => '<option value="' + esc(p.label) + '"' + (_accInfo.plan===p.label?' selected':'') + '>' + esc(p.label) + '</option>').join('')
    + '</select>'
    + '<button onclick="saveAccountShared()" style="width:100%;padding:13px;border:none;border-radius:12px;'
      + 'background:#0891A8;color:#fff;font:800 14px/1 inherit;cursor:pointer;margin-top:4px;">💾 حفظ البيانات</button>'
    + (_accInfo.at ? '<div style="font-size:12px;opacity:.7;margin-top:8px;">آخر تحديث: ' + new Date(_accInfo.at).toLocaleString('ar-EG') + '</div>' : '')
    + '</div>';
}
function _accIn(){
  return 'width:100%;padding:11px 13px;border-radius:11px;border:1px solid rgba(128,128,128,.35);'
    + 'background:#1E293B;color:#E2E8F0;font:inherit;font-size:13.5px;margin-bottom:8px;';
}

async function saveAccountShared(){
  const g = id => (document.getElementById(id)||{}).value || '';
  const name = g('acName').trim(), phone = g('acPhone').trim(), email = g('acEmail').trim();
  if(!name || !phone || !email){ alert('اكتب الاسم والرقم والإيميل'); return; }
  if(!/^\S+@\S+\.\S+$/.test(email)){ alert('الإيميل مش مظبوط'); return; }
  const payload = { name, phone, email, plan:g('acPlan'), at:new Date().toISOString(), by:_accUser.email };
  try{
    const { error } = await sb.from('app_data')
      .upsert({ key:SUBINFO_KEY, value:JSON.stringify(payload), updated_at:new Date().toISOString() });
    if(error) throw error;
    _accInfo = payload;
    alert('اتحفظت ✅ — هيتم إرسال طرق الدفع على بريدك');
    const ov = document.getElementById('accSharedOv'); if(ov) ov.remove();
  }catch(e){
    console.error('saveAccountShared failed:', e);
    // 42501 = الصلاحية رفضت الكتابة (RLS) — رسالة واضحة بدل كود غامض
    const perm = e && (e.code === '42501' || /row-level security/i.test(e.message || ''));
    alert(perm
      ? 'الحفظ اترفض من الصلاحيات — بلّغ الأدمن يشغّل ملف 15-subinfo-write.sql'
      : 'فشل الحفظ: ' + (e.message || e));
  }
}

// ============================================================
// 👥 لوحة الموظفين الملوّنة — تحميل staff-board.js
// ------------------------------------------------------------
// 🧠 بالبلدي: common.js محمّل في كل الصفحات، فهو اللي بيجيب ملف
//    اللوحة — بس في الصفحتين اللي محتاجينه:
//      • الداشبورد → علامته #staffOverlay (اللوحة القديمة)
//      • المالك    → علامته #kebabMenu + #ownName
//    كده مفيش أي <script> جديد في الصفحتين الكبار.
//
// ⚠️ بعد DOMContentLoaded: العلامات دي عناصر في الصفحة — قبل كده
//    مش هتبقى موجودة لسه.
// ⚠️ لو staff-board.js مش مرفوع: الداشبورد بيفضل على اللوحة القديمة
//    (أخضر/أحمر) والمالك مبيظهرلوش الزرار — ولا صفحة بتقع.
// ============================================================
addEventListener('DOMContentLoaded', function(){
  try{
    var need = document.getElementById('staffOverlay')
            || (document.getElementById('kebabMenu') && document.getElementById('ownName'));
    if(!need || window.StaffBoard || document.getElementById('sbScript')) return;
    var s = document.createElement('script');
    s.id = 'sbScript';
    s.src = 'staff-board.js';
    s.onerror = function(){ console.error('فشل تحميل staff-board.js — اللوحة الملوّنة مش هتظهر'); };
    document.head.appendChild(s);
  }catch(e){ console.error('staff-board loader:', e); }
});

// ============================================================
// 💬 شات الموظفين — تحميل dock.js + dock-tools.js
// ------------------------------------------------------------
// 🧠 بالبلدي: الداشبورد بيحمّل الشريط الجانبي بنفسه. باقي الصفحات
//    (المالك · الديسباتشر · الفني · الموظف) common.js هو اللي
//    بيجيبهولهم — عشان ماحدش يلمس الصفحات الكبيرة.
//    الـ HR والأدمن والتتبّع والدفع مش في القايمة → مفيش شات هناك.
//
// ⚠️ الترتيب مهم: dock.js الأول (بيعرّف IFixDock)، وبعدين
//    dock-tools.js (بيسجّل الشات فيه) — فبنحمّل التاني في onload الأول.
// ⚠️ لو الملف مش مرفوع أو ملف 89 مش متشغّل: الشريط مبيظهرش وخلاص،
//    ولا صفحة بتقع.
// ============================================================
addEventListener('DOMContentLoaded', function(){
  try{
    var page = (location.pathname.split('/').pop() || '').toLowerCase().replace(/\.html$/,'');
    // 🛵 parts = صفحة مسؤول قطع الغيار (ملف 95)
    var PAGES = ['owner','dispatch','my-devices','staff','parts'];
    if(PAGES.indexOf(page) === -1) return;
    if(window.IFixStaffChat || document.getElementById('dkScript')) return;
    function add(id, src, then){
      var s = document.createElement('script');
      s.id = id; s.src = src;
      s.onload = then || null;
      s.onerror = function(){ console.error('فشل تحميل ' + src + ' — شات الموظفين مش هيظهر'); };
      document.head.appendChild(s);
    }
    // 🧱 الطبقة: تحت التوب بار بدرجة (عشان القايمة المنسدلة تفضل فوق
    //    الشريط) وفوق شرايط البحث/«جهاز جديد» اللي بتفضل بانية.
    var tb = document.querySelector('.topbar');
    var tz = tb ? parseInt(getComputedStyle(tb).zIndex, 10) : NaN;
    if(tz > 1) document.documentElement.style.setProperty('--dk-z', String(tz - 1));
    // 🙈 أول ما أي شاشة منبثقة (.overlay) تتفتح، الشريط يستخبى — وإلا
    //    كان هيركب فوق خلفيتها الغامقة.
    var hideT = 0;
    function syncHide(){
      hideT = 0;
      var open = !!document.querySelector('.overlay:not(.hidden)');
      document.body.classList.toggle('dk-hide', open);
    }
    try{
      new MutationObserver(function(){ if(!hideT) hideT = requestAnimationFrame(syncHide); })
        .observe(document.body, { subtree:true, childList:true, attributes:true, attributeFilter:['class'] });
    }catch(e){}
    syncHide();
    if(window.IFixDock) add('dktScript', 'dock-tools.js');
    else add('dkScript', 'dock.js', function(){ add('dktScript', 'dock-tools.js'); });
  }catch(e){ console.error('staff-chat loader:', e); }
});

// ============================================================
// 🏪 اختيار المحل من «📒 حسابات العملاء» — تحميل shop-picker.js
// ------------------------------------------------------------
// 🧸 بالبلدي: خانة «اسم المحل» في تسجيل الجهاز وتفاصيله بقت تقترح
//    المحلات بالكود وتوحّد الاسم (ملفات SQL 98 و 100). common.js هو
//    اللي بيجيب الملف للشاشات اللي فيها الخانة دي — زي الشات بالظبط،
//    من غير ما نلمس الصفحات الكبيرة:
//      dashboard (الاستقبال والمحاسب العام) · dispatch · owner
// ⚠️ لو الملف مش مرفوع أو ملف 98 مش متشغّل: الخانة بتفضل كتابة حرة
//    زي زمان — ولا صفحة بتقع.
// ============================================================
addEventListener('DOMContentLoaded', function(){
  try{
    var page = (location.pathname.split('/').pop() || '').toLowerCase().replace(/\.html$/,'') || 'index';
    if(['dashboard','dispatch','owner'].indexOf(page) === -1) return;
    if(window.IFixShops || document.getElementById('spScript')) return;
    var s = document.createElement('script');
    s.id = 'spScript';
    s.src = 'shop-picker.js';
    s.onerror = function(){ console.error('فشل تحميل shop-picker.js — خانة المحل هتفضل كتابة حرة'); };
    document.head.appendChild(s);
  }catch(e){ console.error('shop-picker loader:', e); }
});

// ============================================================
// 📑 أرقام المستندات (ERP) — تحميل erp-docs.js
// ------------------------------------------------------------
// 🧸 بالبلدي: السيرفر بقى بيدّي كل جهاز ورق بأرقام مسلسلة
//    (🧾 أمر شغل · 💰 سند عربون · 📦 فاتورة تسليم · 🚫 إذن خروج)
//    — ملف SQL رقم 103. الملف ده بيعرض الأرقام في «تفاصيل الجهاز»
//    وبيحط رقم الفاتورة على «🧾 إيصال التسليم».
//    الداشبورد بس (الاستقبال · مدير الإنتاج · أمين الخزنة · المحاسب العام).
// ⚠️ لو الملف مش مرفوع أو ملف 103 مش متشغّل: مفيش صندوق وخلاص —
//    ولا صفحة بتقع.
// ============================================================
addEventListener('DOMContentLoaded', function(){
  try{
    var page = (location.pathname.split('/').pop() || '').toLowerCase().replace(/\.html$/,'') || 'index';
    if(page !== 'dashboard') return;
    if(window.IFixDocs || document.getElementById('edScript')) return;
    var s = document.createElement('script');
    s.id = 'edScript';
    s.src = 'erp-docs.js';
    s.onerror = function(){ console.error('فشل تحميل erp-docs.js — أرقام المستندات مش هتظهر'); };
    document.head.appendChild(s);
  }catch(e){ console.error('erp-docs loader:', e); }
});

// ============================================================
// 🚗👑 مسؤول الحركة والمالك على الـERP — تحميل erp-field.js
// ------------------------------------------------------------
// 🧸 بالبلدي: الصفحتين dispatch و owner كبار قوي، فالملف الصغير ده
//    بيقف جنبهم ويزوّد حاجتين (ملف SQL رقم 105):
//      📑 صندوق «الورق» في تفاصيل الجهاز: كود العميل + أرقام الورق
//         (أمر شغل · فاتورة تسليم …) — من غير ولا جنيه.
//      📒 «الحسابات» بقت من الكشكول الجديد بالاسم الرسمي والكود —
//         فالمحل المكتوب بشكلين بقى حساب واحد.
// ⚠️ لو الملف مش مرفوع أو ملف 105 مش متشغّل: الحسابات بترجع للورقة
//    القديمة لوحدها، وصندوق الورق مابيظهرش — ولا صفحة بتقع.
// ⚠️ بيتحمّل بعد الصفحة (DOMContentLoaded) — عشان يلاقي دوالها
//    (showInfo · openTechSheet · loadLedger) ويقف جنبها.
// ============================================================
addEventListener('DOMContentLoaded', function(){
  try{
    var page = (location.pathname.split('/').pop() || '').toLowerCase().replace(/\.html$/,'') || 'index';
    if(['dispatch','owner'].indexOf(page) === -1) return;
    if(window.IFixField || document.getElementById('efScript')) return;
    var s = document.createElement('script');
    s.id = 'efScript';
    s.src = 'erp-field.js';
    s.onerror = function(){ console.error('فشل تحميل erp-field.js — الحسابات هتفضل على الورقة القديمة'); };
    document.head.appendChild(s);
  }catch(e){ console.error('erp-field loader:', e); }
});

// ============================================================
// 🏆 ترتيب الفنيين (المالك + الفني) — تحميل tech-board-view.js
// ------------------------------------------------------------
// 🧸 بالبلدي: الفني بيشوف «🏆 ترتيب الفنيين» في صفحته من زمان.
//    المالك ماكانش عنده. الملف الصغير ده بيحط الزرار في قايمة ⋮
//    عند المالك ويعرض نفس الترتيب اللي الداشبورد بينشره — من غير
//    ما نلمس owner.html الكبيرة.
// ⚠️ مفيش SQL: درج «tech-board» مفتوح للقراية لكل اللي داخل النظام.
// ⚠️ لو الملف مش مرفوع: الزرار مابيظهرش وخلاص — ولا صفحة بتقع.
// ============================================================
addEventListener('DOMContentLoaded', function(){
  try{
    var page = (location.pathname.split('/').pop() || '').toLowerCase().replace(/\.html$/,'');
    // 🆕 (٢٠٢٦-١٠-١٩) + my-devices: الفني بقى يشوف نفس الشاشة (التلات فترات)
    if(['owner','my-devices'].indexOf(page) === -1) return;
    if(window.IFixTechBoard || document.getElementById('tbvScript')) return;
    var s = document.createElement('script');
    s.id = 'tbvScript';
    s.src = 'tech-board-view.js';
    s.onerror = function(){ console.error('فشل تحميل tech-board-view.js — «ترتيب الفنيين» مش هيظهر عند المالك'); };
    document.head.appendChild(s);
  }catch(e){ console.error('tech-board loader:', e); }
});

// ============================================================
// 👥 شؤون العاملين على الـERP — تحميل erp-hr.js
// ------------------------------------------------------------
// 🧸 بالبلدي: كل مرتب يتصرف بقى ليه «سند صرف» برقم (ملف SQL رقم 106).
//    الملف ده بيكتب الرقم على كارت الكشف، وبيزوّد «📋 مسير المرتبات»
//    في قايمة ⋮ — في hr.html بس، ومن غير ما نلمسها.
// ⚠️ لو الملف مش مرفوع أو ملف 106 مش متشغّل: مفيش أرقام وخلاص —
//    ولا صفحة بتقع.
// ============================================================
addEventListener('DOMContentLoaded', function(){
  try{
    var page = (location.pathname.split('/').pop() || '').toLowerCase().replace(/\.html$/,'');
    if(page !== 'hr') return;
    if(window.IFixHrErp || document.getElementById('ehScript')) return;
    var s = document.createElement('script');
    s.id = 'ehScript';
    s.src = 'erp-hr.js';
    s.onerror = function(){ console.error('فشل تحميل erp-hr.js — أرقام سندات المرتبات مش هتظهر'); };
    document.head.appendChild(s);
  }catch(e){ console.error('erp-hr loader:', e); }
});

// ============================================================
// 📒 مركز الأستاذ — زرار في قايمة الداشبورد (ملف SQL رقم 107)
// ------------------------------------------------------------
// 🧸 بالبلدي: بنحط زرار «📒 مركز الأستاذ» تحت «📒 حسابات العملاء»
//    على طول — من غير ما نلمس الداشبورد. الزرار واخد نفس class
//    بتاع «حسابات العملاء» (cust-menu-item)، فالداشبورد نفسه بيظهّره
//    للمحاسب العام بس ويخبّيه عن الباقي.
// ⚠️ الصفحة نفسها (gl.html) بتسأل السيرفر «إنت المحاسب العام؟»
//    وأي حد تاني بيترجع للداشبورد — والقيود مقفولة على السيرفر كمان.
// ============================================================
addEventListener('DOMContentLoaded', function(){
  try{
    var page = (location.pathname.split('/').pop() || '').toLowerCase().replace(/\.html$/,'') || 'index';
    if(page !== 'dashboard' || document.getElementById('glMenuBtn')) return;
    var cust = document.querySelector('#menuDropdown .cust-menu-item') || document.querySelector('.cust-menu-item');
    if(!cust) return;
    var b = document.createElement('button');
    b.id = 'glMenuBtn';
    b.className = 'cust-menu-item';
    b.textContent = '📒 مركز الأستاذ';
    b.onclick = function(){ location.href = 'gl.html'; };
    cust.parentNode.insertBefore(b, cust.nextSibling);
  }catch(e){ console.error('gl menu:', e); }
});

// ============================================================
// 🗂️ ترتيب قايمة التلت نقط — إخفاء العناوين الفاضية
// ------------------------------------------------------------
// 🧠 بالبلدي: القايمة متقسّمة مجموعات، فوق كل مجموعة عنوان صغير
//    (class="mh") زي «قطع الغيار». بس خانات كتير بتظهر **حسب
//    الصلاحية** — فممكن مجموعة كاملة تبقى مخفية عند حد معيّن.
//    ساعتها العنوان بيفضل واقف لوحده فوق ولا حاجة، وده شكله وحش.
//
//    الدالة دي بتعدّي على القايمة وتسأل لكل عنوان: «تحتك زرار ظاهر؟»
//    لأ → العنوان يستخبى. ونفس الكلام للخطوط الفاصلة (sep / hr):
//    خط مالوش زراير ظاهرة قبله أو بعده بيستخبى.
//
// ⚠️ بتتنده كل ما القايمة تتفتح — لأن الصلاحيات بتوصل من السيرفر
//    بعد ما الصفحة ترسم، فمينفعش نحسبها مرة واحدة في الأول.
// ============================================================
function ifxTidyMenu(menu){
  try{
    if(typeof menu === 'string') menu = document.querySelector(menu);
    if(!menu) return;
    var kids = Array.prototype.slice.call(menu.children);
    var isSep  = function(el){ return el.tagName === 'HR' || /(^|\s)sep(\s|$)/.test(el.className || ''); };
    var isHead = function(el){ return /(^|\s)mh(\s|$)/.test(el.className || ''); };
    // getComputedStyle بيدّي display بتاع العنصر نفسه حتى لو القايمة مقفولة
    var shown  = function(el){ return el.tagName === 'BUTTON' && getComputedStyle(el).display !== 'none'; };

    // ① العناوين: يظهر بس لو تحته زرار ظاهر قبل العنوان/الخط اللي بعده
    kids.forEach(function(el, i){
      if(!isHead(el)) return;
      var any = false;
      for(var j = i + 1; j < kids.length; j++){
        if(isHead(kids[j]) || isSep(kids[j])) break;
        if(shown(kids[j])){ any = true; break; }
      }
      el.style.display = any ? '' : 'none';
    });

    // ② الخطوط: يظهر بس لو فيه زرار ظاهر قبله (من آخر خط ظاهر) وبعده
    var seenBtn = false, lastSep = null;
    kids.forEach(function(el){
      if(isSep(el)){
        el.style.display = 'none';
        if(seenBtn){ lastSep = el; seenBtn = false; }
        return;
      }
      if(shown(el)){
        if(lastSep){ lastSep.style.display = ''; lastSep = null; }
        seenBtn = true;
      }
    });

    // ③ أول عنوان ظاهر فوق خالص مالوش خط فوقه (class="first")
    var firstDone = false;
    kids.forEach(function(el){
      if(isHead(el)) el.classList.remove('first');
      if(firstDone || getComputedStyle(el).display === 'none') return;
      firstDone = true;
      if(isHead(el)) el.classList.add('first');
    });
  }catch(e){ console.warn('ifxTidyMenu:', e); }
}

// ===== تأمين النصوص قبل عرضها في الصفحة =====
// النسخة الأأمن: بتأمّن ٥ رموز (بما فيها ' المفردة) — بتمنع أي حقن HTML.
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ============================================================
// 🔄 التحديث بدوسة واحدة — لكل الشاشات (IFixUpdate)
// ------------------------------------------------------------
// 🧠 الحكاية بالبلدي:
//    الآيفون لما التطبيق يبقى متثبّت على الشاشة الرئيسية، مبيقفلوش
//    بجد لما الموظف يخرج منه — بيحطه «نايم» في الخلفية. ولما يرجع،
//    بيصحّيه بنفس الكود القديم اللي كان شغّال. ومفيش زرار تحديث ولا
//    سحب لتحت. فالموظف كان لازم يقفل التطبيق من شاشة التطبيقات عشان
//    التحديث يوصله — وأغلبهم مايعرفوش كده.
//
// ✅ دلوقتي التطبيق نفسه بيسأل السيرفر: «فيه نسخة أجدد منّي؟»
//    • رقم النسخة بيتقري من سطر CACHE_NAME في sw.js.
//    • بيسأل: أول ما الصفحة تفتح · كل ما الموظف يرجع للتطبيق ·
//      كل ١٠ دقايق وهو فاتح · لما النت يرجع.
//    • فيه جديد؟ → شريط تحت «🎁 فيه تحديث جديد» وزرار «🔄 حدّث».
//    • الموظف كان سايب التطبيق ربع ساعة أو أكتر ورجع، ومفيش أي كلام
//      مكتوب في خانة لسه ما اتحفظش → التطبيق بيحدّث نفسه لوحده.
//    • وفي قايمة التلت نقط بند «🔄 تحديث التطبيق» موجود دايماً،
//      وجنبه رقم النسخة اللي الموظف شغّال بيها (مفيد لو بتسأله).
//
// 🔴 الشرط الوحيد: **كل ما ترفع أي تعديل، زوّد رقم CACHE_NAME في sw.js**
//    (v74 → v75). ده الجرس اللي بيقول للموبايلات «فيه جديد».
//    لو نسيته، التحديث التلقائي مش هيشتغل — بس زرار القايمة هيفضل
//    شغّال يدوي.
//
// ⚠️ ليه هنا في common.js؟ لأنه متحمّل في كل الشاشات (محاسب ·
//    ديسباتشر · فني · HR · موظف · مالك · أدمن) — فكلهم بياخدوا
//    الميزة من مكان واحد، من غير ما نلمس أي صفحة.
// ============================================================
(function(){
  if(window.IFixUpdate) return;

  var BOOT_VER = null;     // النسخة اللي الصفحة دي شغّالة بيها دلوقتي
  var NEW_VER  = null;     // نسخة أجدد لقيناها على السيرفر
  var lastCheck = 0, hiddenAt = 0, snoozeUntil = 0, autoArm = false, busy = false;

  var GAP      = 60 * 1000;        // مانسألش السيرفر أكتر من مرة في الدقيقة
  var POLL     = 10 * 60 * 1000;   // وهو فاتح: نسأل كل ١٠ دقايق
  var AWAY_MIN = 15 * 60 * 1000;   // غاب ربع ساعة → نحدّث لوحدنا لو آمن
  var SNOOZE   = 10 * 60 * 1000;   // «✕» = الشريط يرجع بعد ١٠ دقايق

  // شريط STAGING بيقعد تحت خالص — فشريطنا يطلع فوقه مش عليه
  var STG = (typeof APP_ENV !== 'undefined' && APP_ENV === 'staging') ? 34 : 0;

  // ① الحارس (service worker) لازم يبقى متسجّل من أي شاشة.
  //    قبل كده كان بيتسجّل من صفحة الدخول والداشبورد بس — فالفني اللي
  //    مثبّت «أجهزتي» على طول ممكن ميكونش عنده حارس أصلاً.
  //    تكرار التسجيل آمن — المتصفح بيتجاهله لو موجود.
  try{
    if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function(){});
  }catch(e){}

  // ② رقم النسخة اللي على السيرفر — من سطر CACHE_NAME في sw.js
  //    cache:'no-store' = هات من السيرفر نفسه، مش من أي نسخة محفوظة.
  //    ⚠️ من غير «?رقم» في الرابط عن قصد: الحارس بيخزّن ملفات .js
  //       بالرابط، ورابط مختلف كل مرة كان هيملا الكاش بنسخ ملهاش لازمة.
  function readServerVer(){
    return fetch('sw.js', { cache:'no-store' }).then(function(r){
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function(txt){
      var m = txt.match(/CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
      return m ? m[1] : null;
    });
  }

  // الصفحة فتحت من غير نت؟ يبقى شغّالة بالنسخة اللي في درج الحارس
  function readCachedVer(){
    if(!window.caches) return Promise.resolve(null);
    return caches.keys().then(function(keys){
      var k = keys.filter(function(x){ return x.indexOf('ifixteam-') === 0; });
      return k.length ? k[k.length - 1] : null;
    }).catch(function(){ return null; });
  }

  function check(force){
    if(busy || !navigator.onLine) return Promise.resolve();
    var now = Date.now();
    if(!force && now - lastCheck < GAP) return Promise.resolve();
    lastCheck = now;
    return readServerVer().then(function(v){
      if(!v) return;
      if(!BOOT_VER){ BOOT_VER = v; paintMenu(); return; }   // أول مرة = ده رقمنا
      if(v !== BOOT_VER){ NEW_VER = v; paintMenu(); onNewVersion(); }
    }).catch(function(e){
      // مش كارثة — هنسأل تاني بعدين. بنكتب في الكونسول بس.
      console.warn('[التحديث] مقدرناش نسأل السيرفر:', e && e.message ? e.message : e);
    });
  }

  function onNewVersion(){
    // راجع بعد غياب طويل ومفيش شغل متساب في نص → نحدّث لوحدنا
    if(autoArm && !hasUnsaved()){ autoArm = false; apply(); return; }
    autoArm = false;
    if(Date.now() < snoozeUntil) return;      // داس «✕» من شوية
    showBanner();
  }

  // ③ «فيه كلام مكتوب ولسه ما اتحفظش؟»
  //    لو أيوه → **مانحدّثش لوحدنا أبداً**. نطلّع الشريط بس، والموظف
  //    يقرر. أحسن تحديث يتأخر من شغل يضيع.
  //    ⚠️ خانات البحث مش محسوبة — اللي مكتوب فيها مش «شغل».
  function hasUnsaved(){
    try{
      var a = document.activeElement;
      if(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'search') return true;
      var els = document.querySelectorAll('input, textarea');
      for(var i = 0; i < els.length; i++){
        var el = els[i];
        var t = (el.type || '').toLowerCase();
        if(el.disabled || el.readOnly) continue;
        if(/^(search|hidden|checkbox|radio|button|submit|reset|file|range|color)$/.test(t)) continue;
        if(el.id === 'q' || el.id === 'prQ' || /search/i.test(el.id || '')) continue;
        if(!el.getClientRects().length) continue;            // مخفية خالص (display:none)
        if(el.value && el.value !== el.defaultValue) return true;
      }
    }catch(e){ return true; }   // مش متأكدين؟ يبقى مانحدّثش لوحدنا
    return false;
  }

  // ④ التحديث نفسه:
  //    (أ) نقول للحارس «روح هات النسخة الجديدة»
  //    (ب) نرمي الدرج القديم (صور · مكتبات · صفحات قديمة)
  //    (ج) نعيد فتح الصفحة — فتيجي كلها طازة من السيرفر
  //    ⚠️ تعديلات الأوفلاين اللي لسه ما اترفعتش متخزّنة في localStorage
  //       مش في الدرج ده — فمش بتتلمس.
  // ④ التحديث نفسه:
  //    (أ) نقول للحارس «روح هات النسخة الجديدة»
  //    (ب) **نستنى** الحارس الجديد لحد ما يستلم الشغل فعلاً
  //    (ج) وبعدين بس نعيد فتح الصفحة
  //
  // 🐛 (٢٠٢٦-١٠-١٩) قبل كده كنا بنرمي كل الدرج ونعيد الفتح **على طول**.
  //    على الآيفون الصفحة كانت بتتفتح في نفس لحظة ما الحارس القديم
  //    بيسلّم للجديد — الطلبات اللي في النص بتقع، والدرج متشال فمفيش
  //    نسخة احتياطية → common.js مايتحمّلش → الشاشة بالشكل القديم
  //    وواقفة على «جارٍ التحميل» لحد ما الموظف يقفل التطبيق ويفتحه.
  //    دلوقتي: بنستنى الحارس الجديد يبقى «شغّال» (activated) قبل الفتح،
  //    ومش بنرمي الدرج بإيدنا — الحارس الجديد بيمسح القديم لوحده
  //    (activate في sw.js) بعد ما يكون خزّن الجديد.
  //    ⚠️ تعديلات الأوفلاين اللي لسه ما اترفعتش متخزّنة في localStorage
  //       مش في الدرج — فمش بتتلمس.
  function apply(){
    if(busy) return;
    busy = true;
    hideBanner();
    showBusy();
    var done = false;
    function go(){
      if(done) return;
      done = true;
      location.reload();
    }
    function soon(){ setTimeout(go, 300); }   // ثانية صغيرة عشان التسليم يخلص
    try{
      if(!('serviceWorker' in navigator)){ go(); return; }
      var swc = navigator.serviceWorker;
      // الحارس الجديد مسك الصفحة → خلاص، افتح
      swc.addEventListener('controllerchange', soon);
      swc.getRegistration().then(function(reg){
        if(!reg){ go(); return; }
        return reg.update().catch(function(){}).then(function(){
          var nw = reg.installing || reg.waiting;
          // مفيش حارس جديد بيتجهّز (يا إما مفيش جديد، يا إما استلم من بدري) → افتح
          if(!nw){ go(); return; }
          if(nw.state === 'activated'){ soon(); return; }
          nw.addEventListener('statechange', function(){
            if(nw.state === 'activated') soon();
            else if(nw.state === 'redundant') go();
          });
        });
      }).catch(go);
    }catch(e){ go(); }
    // شبكة أمان: لو حاجة علّقت، نعيد الفتح بعد ١٢ ثانية برضه
    setTimeout(go, 12000);
  }

  // ===== الشريط اللي تحت =====
  // ⚠️ الألوان مكتوبة ثابتة جوه الشريط عن قصد (مش من متغيرات الصفحة):
  //    كل شاشة في النظام ليها أسماء ألوان مختلفة، والشريط لازم يبان
  //    بنفس الشكل في الكل — في الفاتح والداكن.
  function showBanner(){
    if(document.getElementById('ifxUpdBar')) return;
    if(!document.body){ addEventListener('DOMContentLoaded', showBanner); return; }
    var b = document.createElement('div');
    b.id = 'ifxUpdBar';
    b.setAttribute('dir', 'rtl');
    b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);'
      + 'width:calc(100% - 24px);max-width:520px;box-sizing:border-box;'
      + 'bottom:calc(env(safe-area-inset-bottom, 0px) + ' + (12 + STG) + 'px);z-index:99998;'
      + 'background:#0B6E7F;color:#fff;border-radius:16px;padding:12px 14px;'
      + 'box-shadow:0 12px 32px rgba(0,0,0,.35);display:flex;align-items:center;gap:10px;'
      + 'font-family:Tajawal,system-ui,-apple-system,"Segoe UI",sans-serif;';
    b.innerHTML =
        '<div style="font-size:26px;line-height:1;flex:none;">🎁</div>'
      + '<div style="flex:1;min-width:0;line-height:1.5;">'
      +   '<div style="font-weight:900;font-size:14.5px;">فيه تحديث جديد للتطبيق</div>'
      +   '<div style="font-size:12px;opacity:.9;">دوس «حدّث» — مش هياخد غير ثانيتين</div>'
      + '</div>'
      + '<button type="button" id="ifxUpdGo" style="flex:none;border:none;border-radius:11px;'
      +   'padding:11px 15px;background:#fff;color:#0B6E7F;font-family:inherit;font-weight:900;'
      +   'font-size:14px;line-height:1;cursor:pointer;">🔄 حدّث</button>'
      + '<button type="button" id="ifxUpdLater" aria-label="بعدين" style="flex:none;border:none;'
      +   'background:rgba(255,255,255,.16);color:#fff;width:34px;height:34px;border-radius:10px;'
      +   'font-size:16px;line-height:1;cursor:pointer;">✕</button>';
    document.body.appendChild(b);
    document.getElementById('ifxUpdGo').onclick = apply;
    document.getElementById('ifxUpdLater').onclick = function(){
      snoozeUntil = Date.now() + SNOOZE;
      hideBanner();
    };
  }
  function hideBanner(){
    var b = document.getElementById('ifxUpdBar');
    if(b) b.remove();
  }

  // شاشة «بنحدّث…» — عشان الموظف ميدوسش على حاجة وإحنا بنعيد الفتح
  function showBusy(){
    if(document.getElementById('ifxUpdBusy') || !document.body) return;
    var o = document.createElement('div');
    o.id = 'ifxUpdBusy';
    o.setAttribute('dir', 'rtl');
    o.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(8,14,20,.82);'
      + 'color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;'
      + 'gap:12px;font-family:Tajawal,system-ui,-apple-system,sans-serif;text-align:center;padding:24px;';
    o.innerHTML = '<div style="font-size:42px;line-height:1;">🔄</div>'
      + '<div style="font-weight:900;font-size:17px;">بنحدّث التطبيق…</div>'
      + '<div style="font-size:13px;opacity:.85;">ثانية واحدة بس</div>';
    document.body.appendChild(o);
  }

  // ===== بند «🔄 تحديث التطبيق» في قايمة التلت نقط =====
  // كل شاشة اسم قايمتها مختلف — فبندوّر على الأسماء الأربعة:
  //   #menuDropdown → المحاسب والأدمن (الداشبورد)
  //   #kebabMenu    → الفني · الديسباتشر · المالك · الموظف
  //   #menuDrop     → شؤون العاملين
  // وبنحطه قبل «تسجيل الخروج» (ولو قبله خط فاصل، قبل الخط).
  // ⚠️ الزرار ده بيحدّث **دايماً** حتى لو مفيش رقم جديد — يعني
  //    «تحديث بالعافية». مفيد لو الموظف بيقول «الشاشة شكلها غريب».
  var MENUS = ['#menuDropdown', '#kebabMenu', '#menuDrop'];
  function mountMenuBtn(){
    if(document.getElementById('ifxUpdMenuBtn')) return;
    var menu = null;
    for(var i = 0; i < MENUS.length && !menu; i++) menu = document.querySelector(MENUS[i]);
    if(!menu) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'ifxUpdMenuBtn';
    btn.onclick = function(e){ if(e) e.stopPropagation(); apply(); };
    // 📍 الصفحة حاجزة له مكان بالاسم (#ifxUpdSlot)؟ يتحط فيه بالظبط.
    //    ده بيخلّي كل صفحة ترتّب قايمتها زي ما هي عايزة (مثلاً تحت
    //    «الإعدادات» على طول) بدل ما يتحط قبل الخروج وخلاص.
    var slot = menu.querySelector('#ifxUpdSlot');
    if(slot){
      slot.parentNode.replaceChild(btn, slot);
      paintMenu();
      return;
    }
    var out = null, kids = menu.querySelectorAll('button');
    for(var j = 0; j < kids.length; j++){
      if(/logout/i.test(kids[j].getAttribute('onclick') || '')){ out = kids[j]; break; }
    }
    var before = out;
    if(out && out.previousElementSibling && /(^|\s)sep(\s|$)/.test(out.previousElementSibling.className || '')){
      before = out.previousElementSibling;
    }
    if(before) menu.insertBefore(btn, before); else menu.appendChild(btn);
    paintMenu();
  }
  function paintMenu(){
    var b = document.getElementById('ifxUpdMenuBtn');
    if(!b) return;
    var ver = String(BOOT_VER || '').replace(/^ifixteam-/, '');
    b.innerHTML = NEW_VER
      ? '🎁 فيه تحديث — حدّث دلوقتي <span style="display:inline-block;width:8px;height:8px;'
        + 'border-radius:50%;background:#DC2626;vertical-align:middle;margin-inline-start:4px;"></span>'
      : '🔄 تحديث التطبيق' + (ver ? ' <span style="opacity:.55;font-size:.82em;">(' + esc(ver) + ')</span>' : '');
  }

  // ===== إمتى بنسأل؟ =====
  function boot(){
    mountMenuBtn();
    setTimeout(mountMenuBtn, 2500);   // احتياطي لو القايمة اتبنت متأخر
    if(navigator.onLine) check(true);
    else readCachedVer().then(function(v){ if(v && !BOOT_VER){ BOOT_VER = v; paintMenu(); } });
  }
  if(document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();

  // الموظف رجع للتطبيق (من واتساب، من القفل، من أي حتة)
  document.addEventListener('visibilitychange', function(){
    if(document.hidden){ hiddenAt = Date.now(); return; }
    var away = hiddenAt ? (Date.now() - hiddenAt) : 0;
    hiddenAt = 0;
    autoArm = away >= AWAY_MIN;
    // ⚠️ autoArm بيتطفي بعد السؤال ده بالظبط — عشان السؤال اللي بعده
    //    بعشر دقايق (والموظف شغّال قدام الشاشة) ميحدّثش لوحده.
    check(true).then(function(){ autoArm = false; });
  });
  // سفاري ساعات بيرجّع الصفحة من «الدرج» من غير ما يفتحها من جديد
  addEventListener('pageshow', function(e){ if(e && e.persisted) check(true); });
  addEventListener('online', function(){ check(true); });
  setInterval(function(){ if(!document.hidden) check(false); }, POLL);

  // للكونسول ولأي شاشة عايزة تستخدمه
  window.IFixUpdate = {
    check:   function(){ return check(true); },
    apply:   apply,
    version: function(){ return BOOT_VER; },
    latest:  function(){ return NEW_VER; }
  };
})();

// ============================================================
// 🔒 قايمة التلت نقط مفتوحة = الصفحة اللي وراها متتحركش
// ------------------------------------------------------------
// 🧸 بالبلدي: القايمة زي ورقة فوق كراسة. لما تحط صباعك على
//    الورقة وتسحب، المفروض الورقة بس اللي تتحرك (لو طويلة) —
//    مش الكراسة اللي تحتها. قبل كده الموبايل كان بيعدّي السحبة
//    للصفحة اللي ورا، فالشاشة الرئيسية تتزحلق والقايمة مفتوحة.
//
// ✅ دلوقتي، طول ما القايمة مفتوحة:
//    • صباعك **على القايمة**: لو القايمة طويلة بتتسكرول هي بس.
//      ولما توصل لآخرها (فوق أو تحت) بتقف — مبتزقّش الصفحة.
//      ولو القايمة قصيرة أصلاً، مفيش أي حاجة بتتحرك.
//    • صباعك **برّه القايمة**: الصفحة واقفة برضه.
//    • نفس الكلام لعجلة الماوس على الكمبيوتر.
//    أول ما القايمة تتقفل، كل حاجة بترجع طبيعي.
//
// ⚠️ ليه مش «body{position:fixed}» المشهورة؟ لأنها بترجّع الصفحة
//    لفوق خالص وهي مقفولة، والشريط اللي فوق (sticky) بيطير معاها
//    — فالقايمة نفسها كانت هتختفي من قدامك. الطريقة دي مبتحرّكش
//    أي حاجة من مكانها، بتمنع السحبة بس.
//
// ⚠️ ليه هنا في common.js؟ نفس الأسماء التلاتة بتاعة زرار التحديث:
//      #menuDropdown → الداشبورد (المحاسب والأدمن)
//      #kebabMenu    → الفني · الديسباتشر · المالك · الموظف
//      #menuDrop     → شؤون العاملين
//    فكل الشاشات بتاخدها من غير ما نلمس ولا صفحة.
//    وكل صفحة بتفتح قايمتها بطريقتها (hidden / open / display) —
//    فإحنا مش بنسأل «إزاي اتفتحت»، بنسأل «هي باينة على الشاشة؟».
// ============================================================
(function(){
  if(window.__ifxMenuLock) return;
  window.__ifxMenuLock = true;

  var LOCK_MENUS = ['menuDropdown', 'kebabMenu', 'menuDrop'];

  // overscroll-behavior:contain = الطريقة الرسمية في المتصفحات الجديدة
  // («السكرول ميعدّيش للي ورايا»). اللي تحت في الجافاسكريبت بيغطّي
  // الموبايلات القديمة اللي مبتفهمهاش.
  try{
    var st = document.createElement('style');
    st.id = 'ifxMenuLockCss';
    st.textContent = '#menuDropdown,#kebabMenu,#menuDrop{overscroll-behavior:contain;}';
    (document.head || document.documentElement).appendChild(st);
  }catch(e){}

  // القايمة المفتوحة دلوقتي (أو null)
  function openMenu(){
    for(var i = 0; i < LOCK_MENUS.length; i++){
      var el = document.getElementById(LOCK_MENUS[i]);
      if(!el) continue;
      // getClientRects فاضية = display:none (هي أو أبوها) = مقفولة
      if(!el.getClientRects().length) continue;
      var cs = getComputedStyle(el);
      if(cs.visibility === 'hidden' || cs.display === 'none') continue;
      return el;
    }
    return null;
  }

  // أقرب حاجة بتتسكرول فعلاً — من مكان الصباع لحد القايمة
  function scrollerIn(menu, target){
    var n = target;
    while(n && n !== menu && n.nodeType === 1){
      if(n.scrollHeight > n.clientHeight + 1){
        var oy = getComputedStyle(n).overflowY;
        if(oy === 'auto' || oy === 'scroll') return n;
      }
      n = n.parentNode;
    }
    return (menu.scrollHeight > menu.clientHeight + 1) ? menu : null;
  }

  // dy > 0 = الصباع/العجلة عايزة تطلع لفوق (المحتوى ينزل)
  // بترجّع true لو الحركة دي هتعدّي للصفحة اللي ورا
  function wouldLeak(box, dy){
    if(!box) return true;                                       // مفيش حاجة تتسكرول أصلاً
    var atTop    = box.scrollTop <= 0;
    var atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 1;
    return (dy > 0 && atTop) || (dy < 0 && atBottom);
  }

  var lastY = 0, tMenu = null;

  document.addEventListener('touchstart', function(e){
    tMenu = openMenu();
    if(tMenu && e.touches && e.touches.length) lastY = e.touches[0].clientY;
  }, { passive:true, capture:true });

  // ⚠️ passive:false لازم — من غيرها preventDefault مبيشتغلش
  //    والمتصفح بيكمّل السكرول عادي.
  document.addEventListener('touchmove', function(e){
    if(!tMenu) return;
    if(!openMenu()){ tMenu = null; return; }                    // اتقفلت في النص
    if(!e.cancelable) return;
    var y  = (e.touches && e.touches.length) ? e.touches[0].clientY : lastY;
    var dy = y - lastY;
    lastY = y;

    // برّه القايمة → الصفحة واقفة
    if(!tMenu.contains(e.target)){ e.preventDefault(); return; }
    // جوه القايمة → تتسكرول هي، بس متعدّيش للصفحة
    if(wouldLeak(scrollerIn(tMenu, e.target), dy)) e.preventDefault();
  }, { passive:false, capture:true });

  document.addEventListener('touchend',    function(){ tMenu = null; }, { passive:true, capture:true });
  document.addEventListener('touchcancel', function(){ tMenu = null; }, { passive:true, capture:true });

  // 🖱️ عجلة الماوس / التاتش باد على الكمبيوتر — نفس القاعدة
  document.addEventListener('wheel', function(e){
    var menu = openMenu();
    if(!menu || !e.cancelable) return;
    if(!menu.contains(e.target)){ e.preventDefault(); return; }
    // deltaY موجب = العجلة نازلة = المحتوى بيطلع (عكس الصباع)
    if(wouldLeak(scrollerIn(menu, e.target), -e.deltaY)) e.preventDefault();
  }, { passive:false, capture:true });
})();

// ============================================================
// 🎨 (٢٠٢٦-١٠-١٩) هوية FIX TEAM — كل الشاشات من مكان واحد
// ------------------------------------------------------------
// 🧸 بالبلدي: اللوجو عبارة عن موبايل نايم على ضهره، شايل فوقه مفكّين
//    وترسين كأنه ترابيزة. التصميم ماشي على نفس الفكرة:
//
//    ⭐ الشريط اللي فوق (أسود اللوجو) قاعد على «حرف موبايل» أبيض
//       بفتحات السماعة الرمادي — زي ما العدة قاعدة على الموبايل في
//       اللوجو بالظبط. ده توقيع التصميم في كل الشاشات.
//    🔤 اسم FIX TEAM في الشريط مكتوب بخط عريض ممدود زي اللوجو:
//       FIX أبيض و TEAM برتقالي.
//    🛠️ مربع اللوجو الصغير بقى «العدة» بس (logo-mark.png) — الكلام
//       في المقاس الصغير ده كان بيبقى مش مقري.
//
//    الألوان من اللوجو نفسه (متاخدة بالقطّارة من الصورة):
//      ⬛ #0C0C0E  أسود اللوجو  → الشريط + خلفية الغامق
//      ⬜ #F2F2F0  أبيض الترس   → خلفية الفاتح + حرف الموبايل
//      🟧 #FC6818  برتقالي العدة → الزراير (والكلام عليها أسود — زي
//                                 TEAM البرتقالي على الأسود في اللوجو)
//      🩶 #7F828B  رمادي السماعة → الكلام الثانوي والحدود
//    على الفاتح البرتقالي درجة أعمق شوية (#EE5B10)، والأرقام والكلام
//    البرتقالي على الأبيض أعمق كمان (#B8460A) عشان يتقري.
//
// ⚠️ ألوان الحالات (أخضر اتصلح · أحمر مرفوض · بنفسجي كشف …) زي ما هي
//    عن قصد — دي معلومة للموظف، مش ديكور.
// ⚠️ ليه [data-ifx-brand] في الأسماء؟ عشان قاعدتنا تكسب قاعدة الشاشة
//    نفسها (الشاشة بتتكتب بعدنا في الصفحة، فلازم نبقى أقوى منها).
// ⚠️ صفحة الدخول (index.html) مش بتحمّل common.js — اتلوّنت لوحدها.
// 🔙 عايز ترجع الشكل القديم؟ امسح البلوك ده كله. خلاص.
// ============================================================
(function(){
  if(window.__ifxBrand) return;
  window.__ifxBrand = true;
  try{
    var page = (location.pathname.split('/').pop() || '').toLowerCase().replace(/\.html$/,'') || 'index';
    var root = document.documentElement;
    root.setAttribute('data-ifx-brand', '');

    // 🔤 خط اسم المحل — Archivo الممدود (أقرب خط مجاني لحروف اللوجو)
    try{
      var fl = document.createElement('link');
      fl.rel = 'stylesheet';
      fl.href = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,800;125,900&display=swap';
      (document.head || root).appendChild(fl);
    }catch(e){}

    var L = 'html[data-ifx-brand]:not([data-theme="dark"])';
    var D = 'html[data-ifx-brand][data-theme="dark"]';
    var A = 'html[data-ifx-brand]';

    // 🔴 «--red» في شاشات الفني والحركة والمالك كان لون اللوجو القديم
    //    (التروس الحمرا) — فبقى برتقالي. في الشاشات التانية معناه «خطر»
    //    فبيفضل أحمر.
    var redIsBrand = ['my-devices','dispatch','owner'].indexOf(page) !== -1;

    var NIGHT = '#0C0C0E', GEAR = '#F2F2F0', EMBER = '#FC6818', SLOT = '#7F828B';
    // ⚙️ ترس اللوجو البرتقالي (٨ سنان) — مرسوم بالكود، من غير ملف صورة
    var GEAR_ICON = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='%23FC6818' fill-rule='evenodd' d='M19.99 9.40 L22.74 9.64 L22.74 14.36 L19.99 14.60 L19.48 15.81 L21.26 17.93 L17.93 21.26 L15.81 19.48 L14.60 19.99 L14.36 22.74 L9.64 22.74 L9.40 19.99 L8.19 19.48 L6.07 21.26 L2.74 17.93 L4.52 15.81 L4.01 14.60 L1.26 14.36 L1.26 9.64 L4.01 9.40 L4.52 8.19 L2.74 6.07 L6.07 2.74 L8.19 4.52 L9.40 4.01 L9.64 1.26 L14.36 1.26 L14.60 4.01 L15.81 4.52 L17.93 2.74 L21.26 6.07 L19.48 8.19Z M15.2 12 A3.2 3.2 0 1 0 8.8 12 A3.2 3.2 0 1 0 15.2 12Z'/></svg>\")";

    var css =
      // ===== ☀️ الفاتح — ورق بلون الترس الأبيض =====
      L + '{'
      + '--bg:#ECECE9;--surface:#FFFFFF;--surface-2:#F6F6F4;--surface-3:#EFEFEC;--surface-alt:#EFEFEC;'
      + '--border:#DEDED9;--border-strong:#C9C9C3;'
      + '--ink:#0C0C0E;--ink-2:#45464C;--ink-3:#2A2B30;--muted:#6A6C73;--muted-2:#6A6C73;'
      + '--accent:#EE5B10;--accent-dark:#D44F0B;--on-accent:#0C0C0E;--ifx-ember-ink:#B8460A;'
      + '--chrome:' + NIGHT + ';--chrome-ink:' + GEAR + ';'
      + '--on-chrome:' + GEAR + ';--steel:' + NIGHT + ';--steel-2:#1E1E22;--steel-ink:' + GEAR + ';'
      + '--paper:#ECECE9;--card:#FFFFFF;--line:#DEDED9;--soft:#F4F4F1;--faint:#8E9097;'
      + '--brand:#EE5B10;'
      + (redIsBrand ? '--red:#E04F07;--red-dark:#B8460A;' : '')
      + '}'
      // ===== 🌙 الغامق — خلفية اللوجو نفسها =====
      + D + '{'
      + '--bg:' + NIGHT + ';--surface:#17171A;--surface-2:#1F1F23;--surface-3:#27272C;--surface-alt:#1F1F23;'
      + '--border:#2B2C31;--border-strong:#3A3B41;'
      + '--ink:' + GEAR + ';--ink-2:#C6C7CB;--ink-3:#DCDDDF;--muted:#9A9CA3;--muted-2:' + SLOT + ';'
      + '--accent:' + EMBER + ';--accent-dark:#FF8040;--on-accent:' + NIGHT + ';--ifx-ember-ink:#FF8A4C;'
      + '--chrome:#060607;--chrome-ink:' + GEAR + ';'
      + '--on-chrome:' + GEAR + ';--on-color:' + NIGHT + ';--steel:#060607;--steel-2:#17171A;--steel-ink:' + GEAR + ';'
      + '--paper:' + NIGHT + ';--card:#17171A;--line:#2B2C31;--soft:#1F1F23;--faint:' + SLOT + ';'
      + '--brand:' + EMBER + ';'
      + (redIsBrand ? '--red:' + EMBER + ';--red-dark:#FF8040;' : '')
      + '}'

      // ===== ⭐ التوقيع: الشريط قاعد على حرف الموبايل =====
      // من تحت لفوق: جسم الموبايل الأبيض (٦px) وفيه ٣ فتحات سماعة رمادي
      // (قصيرة + طويلة + طويلة — زي اللوجو) · فراغ أسود · خط رفيع أبيض.
      // كله رسم خلفية — من غير ولا عنصر زيادة في الصفحة.
      // ⚠️ قطعة مرسومة (::after) لازقة في قاع الشريط — مش عنصر في الصفحة.
      //    حواف مدوّرة من تحت زي الموبايل · خط رفيع فوقه (حرف الشاشة) ·
      //    ٣ فتحات سماعة: قصيرة + طويلة + طويلة — من ناحية الشمال زي اللوجو.
      + A + ' .topbar{background:var(--chrome) !important;padding-bottom:26px !important;'
      +   'border-bottom:none !important;box-shadow:0 8px 20px rgba(12,12,14,.16) !important;}'
      + A + ' .topbar::after{content:"";position:absolute;inset-inline:12px;bottom:6px;height:9px;'
      +   'pointer-events:none;border-radius:2px 2px 7px 7px;'
      +   'background-color:' + GEAR + ';'
      +   'background-image:linear-gradient(' + SLOT + ',' + SLOT + '),linear-gradient(' + SLOT + ',' + SLOT + '),linear-gradient(' + SLOT + ',' + SLOT + ');'
      +   'background-size:10px 3px,22px 3px,22px 3px;'
      +   'background-position:left 18px center,left 36px center,left 66px center;'
      +   'background-repeat:no-repeat;border-radius:2px 2px 7px 7px;'
      +   'box-shadow:0 -5px 0 -3px ' + GEAR + ';}'

      // ===== 🔤 اسم FIX TEAM زي اللوجو =====
      + '.ifx-wm{font-family:"Archivo","Cairo",sans-serif;font-stretch:125%;font-weight:900;'
      +   'letter-spacing:.02em;direction:ltr;unicode-bidi:isolate;color:' + GEAR + ';}'
      + '.ifx-wm b{color:' + EMBER + ';font-weight:inherit;}'
      // 🛠️ مربع اللوجو → العدة بس، عريضة زي اللوجو
      + A + ' .topbar .brand .logo.ifx-mark{width:66px;height:32px;flex:0 0 66px;aspect-ratio:auto;'
      +   'background:none !important;border-radius:0;overflow:visible;}'
      + A + ' .topbar .brand .logo.ifx-mark img{object-fit:contain !important;border-radius:0 !important;}'
      + A + ' .topbar .brand p{color:#9CA0A8;}'

      // ===== 🟧 الزرار البرتقالي: الكلام عليه أسود — زي TEAM على الأسود =====
      + A + ' .btn-primary,' + A + ' .tv-ok,' + A + ' .acc-save,' + A + ' .due-chip.on,'
      + A + ' .pr-q.on,' + A + ' .oh-back{color:var(--on-accent) !important;}'
      + A + ' .btn-primary{font-weight:800;}'
      + A + ' .btn-primary:disabled{color:var(--muted) !important;}'
      + A + ' .topbar-actions .btn-primary{box-shadow:0 0 0 1px rgba(252,104,24,.35), 0 4px 14px rgba(252,104,24,.28);}'
      // الزراير الشفافة على الشريط الأسود — إطار رمادي السماعة
      + A + ' .topbar .btn-secondary,' + A + ' .topbar .menu-btn{background:rgba(242,242,240,.06);border-color:rgba(127,130,139,.55);}'
      + A + ' .topbar .btn-secondary:hover,' + A + ' .topbar .menu-btn:hover{background:rgba(242,242,240,.12);}'

      // ===== الكلام البرتقالي على الأبيض = درجة أعمق عشان يتقري =====
      + A + ' .card-price,' + A + ' .timeline-duration,' + A + ' .ip-nums,' + A + ' .pr-back,'
      + A + ' .iv-act,' + A + ' .set-opt.active .sub{color:var(--ifx-ember-ink) !important;}'
      + A + ' .timeline-item{border-right-color:var(--accent);}'

      // ===== لمسات كانت فيروزي ثابت =====
      + A + ' .tech-select:focus{box-shadow:0 0 0 3px rgba(252,104,24,.20);}'
      + A + ' .gs-box:focus-within{box-shadow:0 3px 16px rgba(252,104,24,.16);}'
      + A + ' .field input:focus,' + A + ' .field textarea:focus{outline-color:rgba(252,104,24,.40);}'
      + A + ' :focus-visible{outline-color:' + EMBER + ';}'
      + A + ' .set-opt.active{background:rgba(252,104,24,.08);}'
      + A + ' .inv-card.open{box-shadow:0 4px 16px rgba(252,104,24,.20);}'
      + A + ' .ip-fill{background:var(--accent);}'
      + A + ' .tv-mode-btn.sel{background:rgba(252,104,24,.10);color:var(--ifx-ember-ink);}'
      + A + ' .inv-chip.active{box-shadow:inset 0 -2px 0 ' + EMBER + ';}'
      // الحدود الرمادي المزرقّة في الفاتح → رمادي محايد زي الترس
      + L + ' .column{border-inline-color:#D6D6D0;border-bottom-color:#D6D6D0;}'
      + L + ' .day-column,' + L + ' .menu-dropdown{border-color:#D6D6D0;}'
      // عناوين مجموعات القايمة ⋮ بلون السماعة
      + A + ' .menu-dropdown .mh{color:' + SLOT + ';}'

      // ===== 💬 شريط الشات اللي على الجنب (dock.js + dock-tools.js) =====
      // ⚠️ dock-tools.js بيفرض ألوانه القديمة (كحلي/فيروزي) على #dkRail
      //    و#dkPanel بنفسه — فاسمنا هنا أقوى من اسمه عشان يكسب.
      //    الشريط لونه بين أسود اللوجو والكروت، وحرفه رمادي السماعة،
      //    والأيقونة المفتوحة عليها شَرطة برتقالي زي المفك.
      + L + ' #dkRail,' + L + ' #dkPanel{'
      +   '--surface:#FFFFFF;--surface-2:#F6F6F4;--surface-3:#EFEFEC;--border:#DEDED9;'
      +   '--ink:#0C0C0E;--muted:#6A6C73;--muted-2:#6A6C73;--accent:#EE5B10;--danger:#DC2626;}'
      + D + ' #dkRail,' + D + ' #dkPanel{'
      +   '--surface:#17171A;--surface-2:#111113;--surface-3:#27272C;--border:#2B2C31;'
      +   '--ink:' + GEAR + ';--muted:#9A9CA3;--muted-2:' + SLOT + ';--accent:' + EMBER + ';--danger:#F87171;}'
      + A + ' #dkRail{border-inline-start-color:var(--border);box-shadow:inset 1px 0 0 rgba(127,130,139,.12);}'
      + A + ' #dkRail .dk-ico:hover{border-color:rgba(252,104,24,.45);}'
      + A + ' #dkPanel .sc-btn.pri{color:' + NIGHT + ';}'
      + A + ' #dkPanel .sc-row:hover{border-color:var(--accent);}'

      // ===== ⏳ شاشة التحميل: اللوجو من غير علبة — ماشي مع الخلفية =====
      // 🧸 قبل كده كانت أيقونة التطبيق (مربع أسود) قاعدة في النص —
      //    على الأبيض كانت باينة «علبة» لوحدها.
      //    دلوقتي اللوجو نفسه من غير مربع:
      //      🌙 الغامق → اللوجو الأصلي (أبيض + برتقالي) على الأسود
      //      ☀️ الفاتح → نسخة معكوسة: الأبيض بقى أسود فحمي والبرتقالي زي ما هو
      // ⚠️ content:url() بيبدّل الصورة من غير ما نلمس الصفحة.
      //    #bootVeil = الداشبورد · #veil = المالك/الحركة/الفني.
      + A + ' #bootVeil .bv-logo{width:150px;height:101px;border-radius:0;overflow:visible;box-shadow:none;background:none;}'
      + A + ' #bootVeil .bv-logo img{object-fit:contain;}'
      + A + ' #veil img[src*="icon"]{width:150px !important;height:auto !important;border-radius:0 !important;box-shadow:none !important;background:none !important;object-fit:contain;}'
      // 🐛 (٢٠٢٦-١٠-١٩) الحركة والفني: اللوجو كان مقصوص (الترس من الشمال
      //    وكلمة TEAM من تحت). 🧸 السبب: الصورة الجديدة عرضها ١٥٠ بس كانت
      //    محطوطة جوه علبة صغيرة ٩٦×٩٦ في الصفحة نفسها (#veil .mk) وواخدة
      //    أمر «اللي يطلع برّه العلبة يتقص» — زي صورة كبيرة في برواز صغير.
      //    ✅ بنفك العلبة: مقاسها على قد الصورة · من غير قص · من غير خلفية
      //    ولا ضل — فاللوجو يبان كامل زي الداشبورد والمالك.
      + A + ' #veil .mk{width:auto !important;height:auto !important;border-radius:0 !important;overflow:visible !important;box-shadow:none !important;background:none !important;}'
      + L + ' #bootVeil .bv-logo img,' + L + ' #veil img[src*="icon"]{content:url("boot-logo-light.png");}'
      + D + ' #bootVeil .bv-logo img,' + D + ' #veil img[src*="icon"]{content:url("boot-logo-dark.png");}'

      // ===== 🔔 شرايط «حصل تحديث في شاشة …» =====
      // 🧸 كانت لوح برتقالي محروق مليان من الحيطة للحيطة — بيتعب العين.
      //    بقت «ورقة شغل» هادية: سطح فحمي/أبيض بلمسة برتقالي خفيفة،
      //    وإطار برتقالي رفيع، والجرس بقى ⚙️ ترس اللوجو البرتقالي —
      //    بيلف «سِنّة واحدة» كل ٤ ثواني (حركة ميكانيكية هادية بدل
      //    الجرس اللي بيرن). زرار «افتح» هو البرتقالي المليان الوحيد.
      // ⚠️ نفس الشكل لشريط «مرتبك» (#payBanner من payroll.js).
      + '#ntfBanners:not(:empty){display:flex;flex-direction:column;gap:8px;padding:10px 14px 2px;}'
      + A + ' .ntf-banner,' + A + ' #payBanner{'
      +   'display:flex;align-items:center;gap:11px;cursor:pointer;margin:0;'
      +   'padding:11px 12px 11px 11px;border-radius:13px;'
      +   'border:1px solid rgba(252,104,24,.38);border-inline-start:4px solid ' + EMBER + ';'
      +   'font:700 13.5px/1.65 "Tajawal",system-ui,sans-serif;text-align:start;'
      +   'transition:border-color .15s, transform .1s;}'
      + A + ' #payBanner{margin:10px 14px 2px;}'
      + L + ' .ntf-banner,' + L + ' #payBanner{background:#FFF6F0;color:#2A2B30;box-shadow:0 2px 10px rgba(252,104,24,.08);}'
      + D + ' .ntf-banner,' + D + ' #payBanner{background:#1A1411;color:#E6E6E3;box-shadow:none;}'
      + A + ' .ntf-banner:hover,' + A + ' #payBanner:hover{border-color:rgba(252,104,24,.7);}'
      + A + ' .ntf-banner:active,' + A + ' #payBanner:active{transform:scale(.99);}'
      + A + ' .ntf-banner b,' + A + ' #payBanner b{color:var(--ifx-ember-ink);font-weight:900;}'
      // ⚙️ الجرس → ترس
      + A + ' .ntf-banner .ntf-bell,' + A + ' #payBanner .pay-bell{'
      +   'flex:none;width:22px;height:22px;font-size:0;color:transparent;overflow:hidden;'
      +   'background:' + GEAR_ICON + ' center/contain no-repeat;'
      +   'animation:ifxGearTick 4s cubic-bezier(.5,0,.3,1) infinite;}'
      + '@keyframes ifxGearTick{0%,82%{transform:rotate(0)}100%{transform:rotate(45deg)}}'
      + '@media (prefers-reduced-motion:reduce){' + A + ' .ntf-banner .ntf-bell,' + A + ' #payBanner .pay-bell{animation:none;}}'
      + A + ' .ntf-banner .ntf-bn-txt,' + A + ' #payBanner .pay-bn-txt{flex:1;min-width:0;}'
      // زرار «افتح ›» — برتقالي اللوجو والكلام أسود
      + A + ' .ntf-banner .ntf-bn-go,' + A + ' #payBanner .pay-bn-go{'
      +   'flex:none;background:' + EMBER + ';color:' + NIGHT + ';border-radius:9px;'
      +   'padding:6px 12px;font:900 12.5px/1.2 "Tajawal",system-ui,sans-serif;white-space:nowrap;}'

      // ===== حاجات common.js نفسه =====
      + '#ifxUpdBar{background:' + NIGHT + ' !important;box-shadow:inset 0 -3px 0 ' + EMBER + ', 0 12px 32px rgba(0,0,0,.35) !important;}'
      + '#ifxUpdGo{background:' + EMBER + ' !important;color:' + NIGHT + ' !important;}'
      + '#svcStopOv{background:' + NIGHT + ' !important;}'
      + '#svcStopOk{background:' + EMBER + ' !important;color:' + NIGHT + ' !important;}'
      + '#accSharedOv button[onclick^="saveAccountShared"]{background:' + EMBER + ' !important;color:' + NIGHT + ' !important;}';

    // ⏳ لوجو شاشة التحميل يتحمّل بدري عشان يظهر مع أول رسمة
    try{
      ['boot-logo-light.png','boot-logo-dark.png'].forEach(function(u){
        var pl = document.createElement('link'); pl.rel = 'preload'; pl.as = 'image'; pl.href = u;
        (document.head || root).appendChild(pl);
      });
    }catch(e){}

    var st = document.createElement('style');
    st.id = 'ifxBrandCss';
    st.textContent = css;
    (document.head || root).appendChild(st);

    // ===== 🔤 + 🛠️ اسم المحل وشعاره في الشريط =====
    // ⚠️ بنلمس بس العنصر اللي كلامه «FIX TEAM» بالظبط ومالوش ولاد —
    //    أي عنوان تاني في الشريط (زي «أجهزتي») مابيتلمسش.
    function swapMark(lg, img){
      if(lg.dataset.ifxProbe) return;
      lg.dataset.ifxProbe = '1';
      var probe = new Image();
      probe.onload = function(){ lg.classList.add('ifx-mark'); img.src = 'logo-mark.png'; };
      probe.src = 'logo-mark.png';   // الملف مش مرفوع؟ → الأيقونة القديمة تفضل زي ما هي
    }
    function dressHeader(){
      try{
        var bars = document.querySelectorAll('.topbar');
        for(var b = 0; b < bars.length; b++){
          var els = bars[b].querySelectorAll('h1, h2, .brand-name, .brand-title, span, div, b, strong');
          for(var i = 0; i < els.length; i++){
            var el = els[i];
            if(el.children.length || el.dataset.ifxWm) continue;
            if(!/^\s*FIX\s+TEAM\s*$/i.test(el.textContent || '')) continue;
            el.dataset.ifxWm = '1';
            el.innerHTML = '<span class="ifx-wm">FIX <b>TEAM</b></span>';
          }
          // ::after محتاج الشريط يكون «متموضع» — لو static بنخليه relative
          if(getComputedStyle(bars[b]).position === 'static') bars[b].style.position = 'relative';
          var lg = bars[b].querySelector('.brand .logo');
          if(lg && !lg.classList.contains('ifx-mark')){
            var img = lg.querySelector('img');
            if(img) swapMark(lg, img);
          }
        }
      }catch(e){ console.warn('ifx header:', e); }
    }
    if(document.readyState === 'loading') addEventListener('DOMContentLoaded', dressHeader);
    else dressHeader();
    setTimeout(dressHeader, 1500);   // شاشات بترسم الشريط متأخر

    // ===== لون شريط الساعة على الموبايل = أسود الشريط =====
    // ⚠️ كل شاشة بتحط لونها القديم (كحلي) وقت ما الثيم يتغيّر —
    //    فبنراقب ونرجّعه أسود كل مرة.
    function syncBar(){
      try{
        var want = root.getAttribute('data-theme') === 'dark' ? '#060607' : NIGHT;
        var metas = document.querySelectorAll('meta[name="theme-color"]');
        for(var i = 0; i < metas.length; i++){
          if(metas[i].getAttribute('content') !== want) metas[i].setAttribute('content', want);
        }
      }catch(e){}
    }
    syncBar();
    addEventListener('DOMContentLoaded', syncBar);
    try{
      new MutationObserver(syncBar).observe(root, { attributes:true, attributeFilter:['data-theme'] });
      addEventListener('DOMContentLoaded', function(){
        var metas = document.querySelectorAll('meta[name="theme-color"]');
        for(var i = 0; i < metas.length; i++){
          new MutationObserver(syncBar).observe(metas[i], { attributes:true, attributeFilter:['content'] });
        }
      });
    }catch(e){}
  }catch(e){ console.warn('ifx brand:', e); }
})();
