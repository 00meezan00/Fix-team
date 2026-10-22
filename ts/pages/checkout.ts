
// ============================================================
// FIX TEAM — صفحة الاشتراك (checkout.html)
// ------------------------------------------------------------
// 🟦 (٢٠٢٦-١٠-٢٢) الكود ده كان جوه checkout.html نفسها واتنقل هنا.
//    الصفحة بقت بتنده: <script src="pages/checkout.js"></script>
//    🧸 نفس الكود بالحرف — اتزوّد بس «ورق» بيقول نوع كل حاجة.
// ⚠️ سكريبت الثيم الصغير اللي فوق في <head> فضل جوه الصفحة عن قصد:
//    لازم يشتغل قبل ما الصفحة تترسم (عشان ماتنوّرش أبيض وبعدين تغمق).
// ⚠️ بيتحمّل بعد common.js (sb) و i18n.js — زي ما كان بالظبط.
// ============================================================

// ===== إعدادات البيئة: إنتاج / تجريبي (Staging) =====
// نطاق الإنتاج بس بيستخدم قاعدة الإنتاج. أي نطاق تاني (تجريبي/معاينة/لوكال) بيستخدم Staging تلقائياً
// عشان مستحيل نشر تجريبي يلمس بيانات الإنتاج بالغلط.
// الاتصال + تحديد البيئة + esc + شريط STAGING اتنقلوا لـ common.js
// (بيتحمّل فوق قبل السكربت ده).

// ============================================================
// 🔴 إعدادات الاشتراك و Paymob — املأها 🔴
// ============================================================
// رابط الدفع من Paymob (Payment Link من لوحة تحكم Paymob، أو رابط الـ iframe):
const PAYMOB_PAYMENT_URL: string = '';     // مثال: 'https://accept.paymob.com/standalone?ref=xxxxxxx'
// سعر الاشتراك الشهري بالجنيه (رقم فقط):
const PLAN_PRICE_EGP: number = 0;
// ============================================================

document.getElementById('planPrice')!.textContent =
  PLAN_PRICE_EGP > 0 ? (PLAN_PRICE_EGP.toLocaleString('en-EG') + ' ج.م / شهر') : 'حسب الباقة';

function payNow(){
  if(!PAYMOB_PAYMENT_URL){
    alert('رابط الدفع لسه مش متظبط. كلّم الإدارة لتفعيل الاشتراك.');
    return;
  }
  window.location.href = PAYMOB_PAYMENT_URL;
}

async function recheck(){
  document.getElementById('status')!.textContent = 'جاري التحقق...';
  try{
    const { data } = await sb.from('shop').select('paid_until').eq('id', 1).single();
    if(data && data.paid_until && new Date(data.paid_until) > new Date()){
      window.location.href = 'dashboard.html';
      return;
    }
    document.getElementById('note')!.textContent = 'الاشتراك لسه مش مفعّل. لو دفعت للتو استنى دقيقة وجرّب تاني.';
  }catch(e){
    document.getElementById('note')!.textContent = 'حصل خطأ في التحقق. تأكد من النت وجرّب تاني.';
  }
}

async function doLogout(){
  try{ await sb.auth.signOut(); }catch(e){}
  window.location.href = 'index.html';
}

// لازم يكون مسجّل دخول؛ ولو الاشتراك مفعّل بالفعل يدخل النظام على طول
sb.auth.getSession().then(({ data:{ session } }: any) => {
  if(!session){ window.location.href = 'index.html'; return; }
  document.getElementById('status')!.textContent = 'أهلاً ' + (session.user.email || '') + ' — لتفعيل حسابك اشترك من هنا.';
  sb.from('shop').select('paid_until').eq('id', 1).single().then(({ data }: any) => {
    if(data && data.paid_until && new Date(data.paid_until) > new Date()){
      window.location.href = 'dashboard.html';
    }
  });
});
