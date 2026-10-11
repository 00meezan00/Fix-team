// ============================================================
// I Fix Team — إعدادات الحالات (statuses.js)
// ------------------------------------------------------------
// تعريف حالات الأجهزة (قيد الانتظار / جاري الصيانة / تم التسليم ...)
// بيانات بحتة، اتفصلت من dashboard.html.
//
// ⚠️ يتحمّل قبل كود الداشبورد:
//   <script src="points.js"></script>
//   <script src="statuses.js"></script>   ← هنا
//   <script> ...كود الصفحة... </script>
//
// ⚠️ STATUSES و ACTION_STATUSES اتشالوا من dashboard.html — متعرّفهمش في مكانين.
//
// 🆕 (٢٠٢٦-١٠-١١) موظف الاستقبال + مدير الإنتاج — ٣ حالات جداد:
//   sent_to_repair          «تم الإرسال للصيانة»       الاستقبال بعته — لسه الورشة ما استلمتش
//   received_from_reception «تم الاستلام من الاستقبال»  مدير الإنتاج استلمه فعلاً
//   sent_to_reception       «تم الإرسال للاستقبال»     مدير الإنتاج رجّعه ومشكلته اتحلّت
//                            (لو اترفض → بيروح «درج الرفض» على طول)
//
// 🧸 رحلة الجهاز:
//   انتظار ← اتبعت للورشة ← الورشة استلمت ← كشف ← صيانة ← خلص
//          ← اتبعت للاستقبال (درج الخالص) ← اتسلّم للعميل
//                       أو ← درج الرفض ← العميل خده (تم الرفض)
//
// ⚠️ الترتيب هنا هو ترتيب الخانات في الشاشة الرئيسية والأزرار.
// ⚠️ قواعد «مين يحرّك لفين» متكررة في قاعدة البيانات (ملف 74 —
//    الحارس) عشان محدش يلف حوالين الشاشة. لو غيّرت هنا، غيّر هناك.
// ============================================================

const STATUSES = [
  { key: "waiting", label: "قيد الانتظار", labelKey:"status.waiting", varname:"waiting" },
  { key: "sent_to_repair", label: "تم الإرسال للصيانة", labelKey:"status.sent_to_repair", varname:"sent_to_repair" },
  { key: "received_from_reception", label: "تم الاستلام من الاستقبال", labelKey:"status.received_from_reception", varname:"received_from_reception" },
  { key: "diagnosing", label: "جاري الكشف", labelKey:"status.diagnosing", varname:"diagnosing" },
  { key: "repairing", label: "جاري الصيانة", labelKey:"status.repairing", varname:"repairing" },
  { key: "done", label: "تم الصيانة", labelKey:"status.done", varname:"done" },
  { key: "sent_to_reception", label: "تم الإرسال للاستقبال", labelKey:"status.sent_to_reception", varname:"sent_to_reception" },
  { key: "delivered_paid", label: "تم التسليم والدفع", labelKey:"status.delivered_paid", varname:"delivered_paid" },
  { key: "delivered_unpaid", label: "تم التسليم بانتظار الدفع", labelKey:"status.delivered_unpaid", varname:"delivered_unpaid" },
  { key: "rejected_shop", label: "درج الرفض", labelKey:"status.rejected_shop", varname:"rejected_shop" },
  { key: "rejected", label: "تم الرفض", labelKey:"status.rejected", varname:"rejected" },
  { key: "returned", label: "المرتجعات", labelKey:"status.returned", varname:"returned" },
  // 🗑 المهملات — مش حالة شغل، دي سلة. الجهاز اللي بيتمسح بيقعد
  // هنا ٣٠ يوم وبعدين بيتمسح نهائي لوحده.
  // ⚠️ مقصود إنها مش في ACTION_STATUSES: مفيش زرار بيحوّل جهاز
  //    للمهملات — الطريق الوحيد هو زرار «حذف الجهاز».
  { key: "trashed", label: "المهملات", labelKey:"status.trashed", varname:"trashed" },
];

// حالات الأزرار (الإجراءات) — زراير المحاسب
const ACTION_STATUSES = [
  { key: "waiting", label: "قيد الانتظار", labelKey:"status.waiting", varname:"waiting" },
  { key: "sent_to_repair", label: "تم الإرسال للصيانة", labelKey:"status.sent_to_repair", varname:"sent_to_repair" },
  { key: "received_from_reception", label: "تم الاستلام من الاستقبال", labelKey:"status.received_from_reception", varname:"received_from_reception" },
  { key: "diagnosing", label: "جاري الكشف", labelKey:"status.diagnosing", varname:"diagnosing" },
  { key: "repairing", label: "جاري الصيانة", labelKey:"status.repairing", varname:"repairing" },
  { key: "done", label: "تم الصيانة", labelKey:"status.done", varname:"done" },
  { key: "sent_to_reception", label: "تم الإرسال للاستقبال", labelKey:"status.sent_to_reception", varname:"sent_to_reception" },
  { key: "delivered", label: "تم التسليم", labelKey:"status.delivered", varname:"delivered" },
  { key: "rejected", label: "تم الرفض", labelKey:"status.rejected", varname:"rejected" },
  { key: "returned", label: "المرتجعات", labelKey:"status.returned", varname:"returned" },
];

// ============================================================
// 🏷️ نفس الحالة — اسم مختلف حسب مين بيبص
// ------------------------------------------------------------
// 🧸 الجهاز اللي مدير الإنتاج «بعته للاستقبال» هو نفسه اللي
//    الاستقبال شايفه في «درج الخالص». حالة واحدة، اسمين.
// ============================================================
const ROLE_STATUS_LABELS = {
  reception:  { sent_to_reception: 'درج الخالص' },
  production: { sent_to_repair:    'وارد من الاستقبال' },
};

// ============================================================
// 🛎️ موظف الاستقبال
// ------------------------------------------------------------
// HIDDEN       = خانات مش بتظهر في شاشته.
// IN_WORKSHOP  = الجهاز لسه في الورشة → بيتعدّ عنده جوه
//                «تم الإرسال للصيانة»، والكارت بيقول هو فين بالظبط.
//                ⚠️ يعني «تم الصيانة» مابيبانش عنده خالص —
//                   لحد ما مدير الإنتاج يبعته «تم الإرسال للاستقبال».
// NEXT         = من كل حالة، يقدر يروح فين.
// NEEDS_REPORT = خروج من غير ما يعدّي على مدير الإنتاج → لازم تقرير
//                بيوصل للمحاسب العام.
// ============================================================
// 💵 «تم التسليم والدفع» مش خانة الاستقبال — الدفع كله شغل المحاسب
const RECEPTION_HIDDEN      = ['received_from_reception', 'diagnosing', 'repairing', 'done', 'delivered_paid', 'trashed'];
const RECEPTION_IN_WORKSHOP = ['sent_to_repair', 'received_from_reception', 'diagnosing', 'repairing', 'done'];
const RECEPTION_NEXT = {
  waiting:           ['sent_to_repair', 'delivered', 'rejected'],
  sent_to_repair:    ['waiting', 'delivered', 'rejected'],
  sent_to_reception: ['delivered', 'rejected', 'sent_to_repair'],
  delivered:         ['returned'],
  returned:          ['sent_to_repair', 'delivered', 'rejected'],
};
const RECEPTION_NEEDS_REPORT = {
  waiting:        ['delivered', 'rejected'],
  sent_to_repair: ['delivered', 'rejected'],
  returned:       ['delivered', 'rejected'],
};
const RECEPTION_ACTIONS = ['waiting', 'sent_to_repair', 'delivered', 'rejected', 'returned'];

// ============================================================
// 🏭 مدير الإنتاج
// ------------------------------------------------------------
// بيشوف شاشة المحاسب من غير خانات التسليم و«تم الرفض».
// هو اللي بيقرر: الجهاز اتحلّ ولا اترفض (زرار «تم الإرسال للاستقبال»).
// ============================================================
const PRODUCTION_HIDDEN = ['delivered_paid', 'delivered_unpaid', 'rejected', 'trashed'];
const PRODUCTION_NEXT = {
  waiting:                 ['received_from_reception'],
  sent_to_repair:          ['received_from_reception'],
  returned:                ['received_from_reception'],
  received_from_reception: ['diagnosing', 'repairing', 'done', 'sent_to_reception'],
  diagnosing:              ['received_from_reception', 'repairing', 'done', 'sent_to_reception'],
  repairing:               ['received_from_reception', 'diagnosing', 'done', 'sent_to_reception'],
  done:                    ['diagnosing', 'repairing', 'sent_to_reception'],
  // رجّعه للاستقبال بالغلط؟ يقدر يسحبه تاني قبل ما يتسلّم
  sent_to_reception:       ['diagnosing', 'repairing', 'done'],
};
const PRODUCTION_ACTIONS = ['received_from_reception', 'diagnosing', 'repairing', 'done', 'sent_to_reception'];

// الحالات اللي الجهاز فيها «جوه الورشة»
const WORKSHOP_STATES = ['received_from_reception', 'diagnosing', 'repairing', 'done'];
