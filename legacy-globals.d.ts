// ============================================================
// FIX TEAM — أسامي لسه عايشة في ملفات JS القديمة (legacy-globals.d.ts)
// ------------------------------------------------------------
// 🧸 بالبلدي: ملفات TS الجديدة بتنادي على حاجات معرّفة في صفحات أو
//    ملفات لسه ماتحوّلتش (زي ME في صفحة الفني).
//    المدرّس (tsc) مابيشوفش ملفات JS، فبنعرّفه بيهم هنا:
//    «فيه حاجة اسمها sb موجودة، متقلقش».
//
// ⚠️ كل ما ملف يتحوّل لـ TS، الاسم بتاعه **يتشال من هنا** — عشان
//    ماتبقاش معرّفة مرتين.
// ⚠️ الملف ده للفحص بس — مابيتحوّلش لـ js ومابيترفعش للموقع.
// ============================================================

// ---------- common.js ----------
// ✅ (٢٠٢٦-١٠-٢١) common.js بقى TS — sb و esc اتشالوا من هنا
//    (بقوا متعرّفين في ts/common.ts نفسه).

// ---------- admin.html — common.ts بيزوّد زراير في قوايمها ----------
/** «🎛️ المميزات» */
declare var KNOWN_FLAGS: { key: string; desc: string }[];
/** حالة كل ميزة: مفتوحة ولا مقفولة */
declare var featureFlags: Record<string, { is_enabled: boolean; description?: string; updated_at?: string }>;
/** زرار تشغيل/قفل ميزة — common.ts بيلف حواليه (العلامة __sl) */
declare var toggleFlag: LegacyFn;
/** الصلاحيات الإضافية تحت كل حساب */
declare var CAPS: { key: string; icon: string; label: string; hint: string; forRoles: string[] }[];
/** رسم لوحة الأدمن من الأول */
declare var render: (() => void) | undefined;
// ---------- hr.html ----------
/** كل الحسابات وأدوارها */
declare var ROLES_MAP: Record<string, any>;

// ---------- صفحات كتير (dashboard · dispatch · admin …) — اختيارية ----------
// 🧸 label.ts بيسأل «موجودة؟» قبل ما يستخدم أي واحدة منهم، ولو مش موجودة عنده بديل.
/** الأرقام العربي → إنجليزي */
declare var enDigits: ((s: unknown) => string) | undefined;
/** بيصلّح الأرقام جوه خانة وهو بيكتب */
declare var fixDigitsInput: ((el: any) => void) | undefined;
/** مفاتيح المميزات من لوحة الأدمن */
declare var isFeatureEnabled: ((key: string) => boolean) | undefined;
/** تاريخ ووقت قصير */
declare var shortDateTime: ((iso: any) => string) | undefined;
/** رقم التذكرة المختصر — الداشبورد */
declare var devRef: ((d: any) => string) | undefined;
/** رسالة الغلط — الداشبورد */
declare var showError: ((msg: string) => void) | undefined;
/** رسالة «خلصت» — الداشبورد */
declare var showImportDone: ((msg: string) => void) | undefined;
/** التنبيه الصغير — admin.html وصفحات تانية (ok=false يبقى أحمر) */
declare var toast: ((msg: string, ok?: boolean) => void) | undefined;

// ---------- accounts.js ----------
/** 🏪 الداشبورد بس — accounts.ts بيستعملهم لو موجودين (typeof … === 'function') */
/** لغة التواريخ (ar-EG / en-GB) */
declare var getLocale: (() => string) | undefined;
/** تفضية خانة البحث */
declare var clearSearchBox: ((id: string) => void) | undefined;
/** منع الدوسة «الشبح» بعد قفل القايمة */
declare var shieldGhostClick: (() => void) | undefined;
/** تصدير كشف محل Excel — الداشبورد بس */
declare var exportShopExcel: ((shop: string) => unknown) | undefined;
/** يوم تسليم الجهاز */
declare var deliveredDateOf: ((d: any) => string | null) | undefined;

// ---------- owner.html ----------
/** اسم المالك كفني (لو بيشتغل فني كمان) */
declare var MY_TECH: string | undefined;
/** قفل قايمة ⋮ — owner.html / my-devices.html */
declare var closeKebab: (() => void) | undefined;
/** رقم الجهاز المفتوح في شيت الفني — owner.html (let) */
declare let techId: unknown;

// ---------- my-devices.html ----------
/** اسم الفني اللي فاتح الصفحة */
declare var ME: string | undefined;

// ---------- dashboard.html ----------
/** التنبيه الصغير اللي بيطلع فوق — الداشبورد */
declare var ph1Toast: ((msg: string) => void) | undefined;
/** المستخدم الحالي — dashboard.html (let) — ai-invoice بيقرا اسمه */
declare var currentUser: { name?: string; [k: string]: any } | undefined;
/** فيه نت؟ — الداشبورد (لو مش موجودة بنسأل navigator.onLine) */
declare var isOnline: (() => boolean) | undefined;
/** رقم الجهاز المفتوح في «تفاصيل الجهاز» */
declare var selectedId: unknown;
/** كل الأجهزة اللي اتحمّلت */
declare var devices: any[];

// ---------- hr.html ----------
/** اسم الموظف من إيميله */
declare var nameOf: ((email: string) => string) | undefined;
/** الكشف المفتوح دلوقتي */
declare var SLIP: { email: string };
/** قفل قايمة ⋮ في HR */
declare var closeMenu: (() => void) | undefined;

// ---------- حاجات بتتحط على window من ملفات تانية ----------
/** دالة قديمة ممكن نلفّها بغلاف — العلامة __sl / __st معناها «اتلفّت خلاص» */
type LegacyFn = ((...args: any[]) => any) & { __sl?: number; __st?: number; __erpd?: boolean; __ehr?: boolean; __ifxField?: boolean; __aiv?: boolean; __pur?: boolean };
interface Window {
  /** my-devices.html — tech-board-view بيبدّلها بشاشته */
  openTechBoard?: () => void;
  renderTechBoard?: () => void;
  /** attendance.ts — بقت TS، بس shift-lock بيلف حوالين attPunch و closeAttendance
   *  (العلامة __sl) فلازم يفضلوا هنا كمان */
  openAttendance?: () => void;
  closeAttendance?: LegacyFn;
  attPunch?: LegacyFn;
  /** my-devices.html — بيوقّف الانصراف (مثلاً أجهزة مستنية رد على قطع غيار) */
  attBeforeOut?: (state: any) => unknown;
  /** payroll.js — شاشة «مرتبك» */
  openPayroll?: () => void;
  /** dashboard.html — erp-docs بيلف حواليهم */
  renderDetail?: LegacyFn;
  receiptData?: LegacyFn;
  /** hr.html — erp-hr بيلف حواليهم */
  slipCard?: LegacyFn;
  loadPayslips?: LegacyFn;
  /** تسجيل الخروج — كل صفحة بتسمّيه باسم */
  logout?: () => unknown;
  doLogout?: () => unknown;
  /** الداشبورد: شاشة الإشعارات القديمة — push-ui بياخد مكانها */
  openPushSettings?: () => unknown;
  /** owner.html — منع الدوسة «الشبح» بعد قفل القايمة — staff-board */
  shieldGhostClick?: () => void;
  /** dashboard.html — لوحة الموظفين القديمة — staff-board بياخد مكانها */
  openStaff?: () => void;
  /** dispatch.html / owner.html — erp-field بيلف حواليهم */
  showInfo?: LegacyFn;
  openTechSheet?: LegacyFn;
  renderTechSheet?: LegacyFn;
  /** accounts.js — erp-field بيلف حواليهم */
  loadLedger?: LegacyFn;
  openAccounts?: LegacyFn;
  /** dashboard.html — ai-invoice بيلف حواليهم (العلامة __aiv / __pur) */
  openDetail?: LegacyFn;
  closeDetail?: LegacyFn;
  toggleMenu?: LegacyFn;
  /** الداشبورد: يعيد حساب النقط لما قطع الجهاز تتغيّر */
  onDevicePartsChanged?: (id: string) => void;
  /** صفحة «مراجعة قطع الغيار» — تتحدّث لما قطعة تتربط أو تتشال */
  prOnPartsChanged?: () => void;
}
