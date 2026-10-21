/* ============================================================
   I Fix Team — عملاء الجملة
   ------------------------------------------------------------
   الأجهزة اللي بتيجي من الأسامي دي بتتحسب **جملة** تلقائياً:
   مفيش نقاط للفني، وبتتعلّم في الشاشة عشان تبان.

   ⚠️ لإضافة اسم جديد: زوّده في WHOLESALE_NAMES تحت وخلاص.
      مش لازم تكتب كل الأشكال — التطبيع بياخد باله من:
        • لاحقة المحل:  i fix · I FIX · IFIX · i fix team
        • الهمزات:      أ إ آ → ا
        • التاء:        ة → ه
        • الألف المقصورة: ى → ي
        • ال التعريف:   الهلالي = هلالي · البليسي = بليسي
        • المسافات:     عبد الله = عبدالله · مسافات زيادة
        • الحروف:       كبير/صغير في الإنجليزي

   ⚠️ والمطابقة **مش مرنة صوتياً** عن قصد. البحث بيسامح لأنك
      بتراجع نتيجته بعينك؛ ده لأ — لو طابق غلط، فني بيخسر نقاطه
      من غير ما حد ياخد باله. فالتسامح هنا في **شكل الكتابة** بس،
      مش في الأصوات المتشابهة.

   🟦 (٢٠٢٦-١٠-٢١) بقى TypeScript (ts/wholesale.ts → wholesale.js)
      🧸 نفس الكود بالحرف — اتزوّد بس «ورق» بيقول نوع كل حاجة
      (نص · رقم · جهاز …). المترجم بيشيل الورق ده والمتصفح بياخد
      نفس الـ js القديم بالظبط.
   ============================================================ */
// 🏷️ الأنواع — بتختفي بعد الترجمة
/** أي جهاز — بالأسامي الطويلة (customerName) أو المختصرة (customer) */
interface WholesaleDeviceLike {
  isWholesale?: boolean;
  customerName?: string; customer?: string;
  shopName?: string; shop?: string;
}
interface IFixWholesaleApi {
  match(customerName: unknown, shopName: unknown): boolean;
  isWholesaleDevice(d: WholesaleDeviceLike | null | undefined): boolean;
  normalize(s: unknown): string;
  names: string[];
}
/** window.IFixWholesale — بيتعرّف تحت */
declare var IFixWholesale: IFixWholesaleApi;

(function () {
  'use strict';
  if (window.IFixWholesale) return;

  // ===== القايمة =====
  // اكتب الاسم بأي شكل — التطبيع بيوحّدهم. الأسطر المكررة مالهاش ضرر.
  var WHOLESALE_NAMES: string[] = [
    'طارق', 'طارق بلال',
    'الهلالي', 'هلالي', 'هلال', 'يوسف الهلالي', 'يوسف هلالي', 'يوسف هلال',
    'محمد عيد', 'عيد',
    'عبد', 'عبد الله', 'عبدالله', 'عبد الله خليفة', 'عبدالله خليفة',
    'ياسين',
    'خليفة', 'احمد خليفة', 'خليفة الدقدوسي',
    'هيثم', 'هيثم حماد', 'عم هيثم',
    'محسن', 'محسن حرب',
    'نور', 'نور مراد',
    'يوسف الفار',
    'كريم', 'كريم عشماوي', 'كريم العشماوي',
    'زياد', 'زياد كيرا', 'زياد الحسيني',
    'ابو جبل', 'ابو حبل',   // حبل = غلطة مطبعية شائعة، بنمسكها برضه
    'بلال',
    'البليسي', 'البليسى'
  ];

  // ===== التطبيع =====
  // لاحقة المحل بأشكالها: "i fix" · "ifix" · "i fix team" · "ifixteam"
  var SHOP_SUFFIX = /\b(i\s*fix(\s*team)?|ifix(\s*team)?)\b/g;

  function norm(s: unknown): string {
    var t = String(s == null ? '' : s).toLowerCase();

    // حركات وتطويل
    t = t.replace(/[ً-ْـ]/g, '');
    // صور الحروف
    t = t.replace(/[أإآٱ]/g, 'ا')   // أ إ آ ٱ → ا
         .replace(/ة/g, 'ه')                        // ة → ه
         .replace(/[ىئ]/g, 'ي')                // ى ئ → ي
         .replace(/ؤ/g, 'و');                       // ؤ → و

    // اسم المحل بيتشال قبل أي حاجة — هو موجود مع نص القايمة تقريباً
    t = t.replace(SHOP_SUFFIX, ' ');

    // أي حاجة مش حرف ولا رقم بتبقى مسافة
    t = t.replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
    if (!t) return '';

    // ⚠️ "ال" التعريف **مش** بتتشال عن قصد.
    //    جرّبناها وطلع إن "محل النور" بيتحوّل لـ"نور" ويتحسب جملة —
    //    و"النور" اسم محل شائع جداً.
    //    ومش محتاجينها أصلاً: القايمة فيها "الهلالي" و"هلالي"،
    //    و"البليسي" و"البليسى" — الأشكال متعدّدة بالإيد، وده أضمن
    //    من إن النظام يشيل حروف ويخمّن.

    return t;
  }

  // ===== الفهرس =====
  // ⚠️ المطابقة على **الاسم كامل** — مش على كلمة جواه.
  //    جرّبنا مطابقة الكلمة الواحدة وطلعت كارثة: "طارق" لوحدها كانت
  //    بتمسك "طارق أحمد" (عميل تاني خالص)، و"عبد" كانت بتمسك كل
  //    "عبد الـ..." في الدنيا. ١٥ من ٢٨ اسم عادي كانوا هيتحسبوا جملة.
  //
  //    فلو عميل الجملة بيتكتب بلقبه أحياناً، زوّد السطر بلقبه في
  //    القايمة فوق — سطر لكل شكل. ده أضمن من إن النظام يخمّن.
  var exact = new Set<string>();
  WHOLESALE_NAMES.forEach(function (raw) {
    var n = norm(raw);
    if (n) exact.add(n);
  });

  function matchOne(value: unknown): boolean {
    var n = norm(value);
    return !!n && exact.has(n);
  }

  // اسم العميل أو اسم المحل — أي واحد فيهم يكفي
  function match(customerName: unknown, shopName: unknown): boolean {
    return matchOne(customerName) || matchOne(shopName);
  }

  // جهاز كامل: العلم اليدوي له الأولوية، وبعدين القايمة
  function isWholesaleDevice(d: WholesaleDeviceLike | null | undefined): boolean {
    if (!d) return false;
    if (d.isWholesale) return true;
    return match(d.customerName || d.customer || '', d.shopName || d.shop || '');
  }

  window.IFixWholesale = {
    match: match,
    isWholesaleDevice: isWholesaleDevice,
    normalize: norm,
    names: WHOLESALE_NAMES
  };
})();
