// ============================================================
// FIX TEAM — أسامي لسه عايشة في ملفات JS القديمة (legacy-globals.d.ts)
// ------------------------------------------------------------
// 🧸 بالبلدي: ملفات TS الجديدة بتنادي على حاجات معرّفة في صفحات أو
//    ملفات لسه ماتحوّلتش (زي sb في common.js، أو ME في صفحة الفني).
//    المدرّس (tsc) مابيشوفش ملفات JS، فبنعرّفه بيهم هنا:
//    «فيه حاجة اسمها sb موجودة، متقلقش».
//
// ⚠️ كل ما ملف يتحوّل لـ TS، الاسم بتاعه **يتشال من هنا** — عشان
//    ماتبقاش معرّفة مرتين.
// ⚠️ الملف ده للفحص بس — مابيتحوّلش لـ js ومابيترفعش للموقع.
// ============================================================

// ---------- common.js ----------
/** اتصال Supabase — common.js بيعمله لكل الصفحات */
declare const sb: any;
/** تأمين النصوص قبل ما تتحط في HTML — common.js */
declare const esc: (s: unknown) => string;

// ---------- owner.html ----------
/** اسم المالك كفني (لو بيشتغل فني كمان) */
declare var MY_TECH: string | undefined;
/** قفل قايمة ⋮ — owner.html / my-devices.html */
declare var closeKebab: (() => void) | undefined;

// ---------- my-devices.html ----------
/** اسم الفني اللي فاتح الصفحة */
declare var ME: string | undefined;

// ---------- dashboard.html ----------
/** التنبيه الصغير اللي بيطلع فوق — الداشبورد */
declare var ph1Toast: ((msg: string) => void) | undefined;
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
type LegacyFn = ((...args: any[]) => any) & { __sl?: number; __st?: number; __erpd?: boolean; __ehr?: boolean };
interface Window {
  /** my-devices.html — tech-board-view بيبدّلها بشاشته */
  openTechBoard?: () => void;
  renderTechBoard?: () => void;
  /** attendance.js — شاشة المواعيد وزرار الحضور */
  openAttendance?: () => void;
  closeAttendance?: LegacyFn;
  attPunch?: LegacyFn;
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
}
