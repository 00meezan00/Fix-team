
// ============================================================
// FIX TEAM — صفحة الموظف «⏰ المواعيد» (staff.html)
// ------------------------------------------------------------
// 🟦 (٢٠٢٦-١٠-٢٢) الكود ده كان جوه staff.html نفسها واتنقل هنا.
//    الصفحة بقت بتنده: <script src="pages/staff.js"></script>
//    🧸 نفس الكود بالحرف — اتزوّد بس «ورق» بيقول نوع كل حاجة.
// ⚠️ السكريبتين الصغيرين اللي فوق في <head> (اللغة عربي + الثيم)
//    فضلوا جوه الصفحة عن قصد: لازم يشتغلوا قبل ما الصفحة تترسم.
// ⚠️ بيتحمّل بعد common.js · i18n.js · attendance.js · payroll.js.
// ============================================================

// ============================================================
// صفحة الموظف — المواعيد وبس
// ------------------------------------------------------------
// ⚠️ الصفحة دي **مابتقراش** أي جدول أجهزة ولا فلوس ولا حسابات.
//    كل اللي بتعمله: تتأكد إنك داخل، وتفتح شاشة المواعيد.
//
//    وده مقصود — أقل صفحة في النظام من ناحية الوصول للبيانات.
//    الحماية الحقيقية في قاعدة البيانات (سياسات RLS)، والصفحة
//    دي بتحترم نفس المبدأ: ما تطلبش حاجة مالكش لازمة بيها.
// ============================================================
let ME = '', ROLES_MAP: Record<string, any> = {}, MY_ROLE = '';

(async function boot(){
  const { data:{ session } } = await sb.auth.getSession();
  if(!session){ location.href = 'index.html'; return; }
  ME = (session.user.email || '').toLowerCase();

  // الاسم والدور — للعرض في الرأس بس
  let rolesOk = false;
  try{
    const { data, error } = await sb.from('app_data')
      .select('value').eq('key','user-roles').maybeSingle();
    // ⚠️ Supabase مبيرميش خطأ — بيرجّعه في .error
    if(error) throw error;
    if(data && data.value) ROLES_MAP = JSON.parse(data.value) || {};
    rolesOk = true;
  }catch(e){ console.error('user-roles failed:', e); }

  const mine = ROLES_MAP[ME];
  MY_ROLE = typeof mine === 'string' ? mine : (mine && mine.role) || '';

  // 🔒 (٢٠٢٦-١٠-١١) إيميل مش متسجّل في لوحة الأدمن = مالوش دخول
  if(rolesOk && !MY_ROLE){
    try{ await sb.auth.signOut(); }catch(e){}
    location.replace('index.html?nouser=1');
    return;
  }

  document.getElementById('whoLbl')!.textContent =
    nameOf(ME) + (MY_ROLE ? ' — ' + roleLabel(MY_ROLE) : '');

  // ⚠️ الموظف اللي دوره اتغيّر وهو فاتح الصفحة — نوديه لمكانه.
  //    من غير ده هيفضل قافل على صفحة المواعيد بعد ما يبقى فني
  //    أو محاسب، ومش هيعرف يوصل لشغله.
  const HOME: Record<string, string> = {
    technician:  'my-devices.html',
    dispatcher:  'dispatch.html',
    hr:          'hr.html',
    owner:       'owner.html',
    parts:       'parts.html',     // 🛵 مسؤول قطع الغيار (ملف 95)
    // 🛎️🏭📞 الاستقبال ومدير الإنتاج والكول سنتر على شاشة المحاسب
    reception:   'dashboard.html',
    production:  'dashboard.html',
    callcenter:  'dashboard.html',
    accountant:  'dashboard.html',
    super_admin: 'dashboard.html'
  };
  if(MY_ROLE && HOME[MY_ROLE]){ location.replace(HOME[MY_ROLE]); return; }

  // على الكمبيوتر زرار المواعيد بيتخفي — نوضّح السبب بدل شاشة فاضية
  setTimeout(() => {
    const btn = document.querySelector<HTMLElement>('.att-menu-btn');
    const hidden = !btn || btn.style.display === 'none';
    const hint = document.getElementById('deskHint');
    if(hint) hint.style.display = hidden ? '' : 'none';
  }, 1500);
})();

function roleLabel(r: string): string {
  return ({ super_admin:'أدمن', accountant:'أمين الخزنة', dispatcher:'مسؤول حركة',
           technician:'فني', hr:'شؤون العاملين', staff:'موظف',
           owner:'المالك', reception:'موظف الاستقبال', production:'مدير الإنتاج',
           callcenter:'الكول سنتر', parts:'مسؤول قطع الغيار' } as Record<string, string>)[r] || r;
}
function nameOf(email: string): string {
  const v = ROLES_MAP[email];
  const n = (v && typeof v === 'object' && v.techName) ? v.techName : '';
  return n || (email || '').split('@')[0];
}
// ============================================================
// قايمة التلت نقط
// ============================================================
function toggleKebab(){
  const m = document.getElementById('kebabMenu')!;
  const sh = document.getElementById('kebabShield')!;
  const open = m.classList.contains('hidden');
  m.classList.toggle('hidden', !open);
  sh.classList.toggle('hidden', !open);
}
function closeKebab(){
  document.getElementById('kebabMenu')!.classList.add('hidden');
  document.getElementById('kebabShield')!.classList.add('hidden');
}

async function doLogout(){
  try{ await sb.auth.signOut(); }catch(e){}
  location.href = 'index.html';
}
