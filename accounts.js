// ============================================================
// I Fix Team — شاشة الحسابات المشتركة (accounts.js)
// ------------------------------------------------------------
// الملف ده فيه **الجزء اللي بيعرض بس** من شاشة "آجل المحلات":
// القراءة · البحث · الكروت · كشف المحل · تصدير PDF.
//
// 🔴 مفيش فيه ولا سطر واحد بيكتب في الدفتر. عن قصد.
//    تسجيل الدفعة · الخصم · الرصيد الافتتاحي · الحذف · النقل ·
//    تصدير Excel — كلهم لسه في dashboard.html وحده.
//
//    يعني صفحة الديسباتشر مش "بنخفي عنها الأزرار" — الكود اللي
//    بيعمل الحاجات دي **مش بيتحمّل عندها أصلاً**. وده أقوى بكتير
//    من الإخفاء.
//
// ⚠️ الترتيب — لازم يتحمّل بعد common.js و i18n.js:
//     <script src="common.js"></script>
//     <script src="i18n.js"></script>
//     <script src="accounts.js"></script>   ← هنا
//     <script> ...كود الصفحة... </script>
//
// ⚠️ التعريفات اللي تحت اتشالت من dashboard.html — متعرّفهاش في
//    مكانين وإلا المتصفح هيقول "Identifier already declared"
//    والصفحة **كلها** هتقع.
//
// الصفحة لازم توفّر:
//   • sb            (من common.js)
//   • t             (من i18n.js)
//   • esc           (من common.js)
//   • عناصر HTML:   accountsOverlay · accountsBody · accSearch
// ============================================================

// ===== مفتاح التعديل =====
// true  = المحاسب/الأدمن — كل الأزرار
// false = قراءة فقط — عرض وبحث و PDF وبس
//
// 🔧 صفحة الديسباتشر بتحطها false قبل ما تفتح الشاشة:
//     ACC_CAN_EDIT = false;
var ACC_CAN_EDIT = true;

// ============================================================
// 🛵 «المندوب» — اللي جاب الجهاز للمحل (مش صاحبه)
// ------------------------------------------------------------
// 🧸 بالبلدي: ساعات الجهاز بييجي مع واحد من المحل (صبي · موتوسيكل)
//    مش مع صاحبه. الاسم ده بيتكتب وقت الاستلام (d.broughtBy)،
//    وبيظهر في الحسابات والـPDF والإكسيل.
//
// ✏️ عايز تغيّر الكلمة («الطيّار» / «الموصّل»…)؟ غيّرها هنا بس —
//    كل الشاشات والكشوف بتقرا من السطر ده.
// ============================================================
var ACC_BB_LABEL = 'المندوب';

// اسم المندوب لسطر في الكشف.
// ⚠️ الجهاز نفسه الأول (لو المحاسب صحّح الاسم من التفاصيل بعدين،
//    الكشف ياخد الصح)، ولو الجهاز اتمسح بنرجع للنسخة المحفوظة في القيد.
//    الدفعة والخصم والرصيد الافتتاحي مالهمش مندوب.
function stmtBroughtBy(e){
  if(!e || e.type !== 'debit') return '';
  const d = e.deviceId ? accDevices().find(x => x.id === e.deviceId) : null;
  return String((d && d.broughtBy) || e.broughtBy || '').trim();
}

// قايمة الأجهزة — بتُستخدم في تاريخ التسليم وفي العطل في الكشف.
// الصفحة اللي مفيهاش أجهزة بترجّع قايمة فاضية والكشف يشتغل عادي
// بتاريخ القيد بدل تاريخ التسليم.
// اللغة المستخدمة في التواريخ. getLocale معرّفة في الداشبورد بس،
// فبنقراها لو موجودة وإلا بنقرا من I18N مباشرة.
function accLocale(){
  try{
    if(typeof getLocale === 'function') return getLocale();
    if(typeof I18N !== 'undefined' && I18N.getLang && I18N.getLang() === 'en') return 'en-GB';
  }catch(e){}
  return 'ar-EG';
}

function accDevices(){
  try{ return (typeof devices !== 'undefined' && Array.isArray(devices)) ? devices : []; }
  catch(e){ return []; }
}

const LEDGER_KEY = 'accounts-ledger';
let ledger = [];

async function loadLedger(){
  try{
    // ⚠️ بنقرا من sb مباشرة مش من window.storage — دي معرّفة في
    //    الداشبورد بس، وصفحة الديسباتشر مفيهاش. والنتيجة واحدة.
    const { data, error } = await sb.from('app_data')
      .select('value').eq('key', LEDGER_KEY).maybeSingle();
    if(error) throw error;
    ledger = (data && data.value) ? JSON.parse(data.value) : [];
    try{ localStorage.setItem('ifix_ledger_cache', JSON.stringify(ledger)); }catch(e){}
  }catch(e){
    // أوفلاين → قراءة فقط من الكاش
    try{ ledger = JSON.parse(localStorage.getItem('ifix_ledger_cache') || '[]'); }catch(e2){ ledger = []; }
  }
}

function openAccounts(){
  // ⚠️ التلات حاجات دي موجودة في الداشبورد بس. الحراسة بتخلي
  //    نفس الملف يشتغل في صفحة الديسباتشر من غير ما يقع.
  const _menu = document.getElementById('menuDropdown');
  if(_menu) _menu.classList.add('hidden');
  if(typeof shieldGhostClick === 'function') shieldGhostClick();
  if(typeof clearSearchBox === 'function') clearSearchBox('accSearch');
  else { const _s = document.getElementById('accSearch'); if(_s) _s.value = ''; }
  // نرجّع طريقة العرض المحفوظة (بعد أي فتح كشف مؤقت حوّلها لقائمة)
  try{ const v = localStorage.getItem(ACC_VIEW_KEY); if(ACC_VIEW_MODES.includes(v)) accViewMode = v; }catch(e){}
  syncAccViewButtons();
  document.getElementById('accountsOverlay').classList.remove('hidden');
  renderAccounts();
}
function closeAccounts(){ document.getElementById('accountsOverlay').classList.add('hidden'); }
let accOpenShop = null;

function shopNamesForDatalist(){
  // ⚠️ كانت Set على النص الخام: اسم الدفتر مش متقصوص، فـ"محل النور"
  //    و"محل النور " كانوا بيطلعوا سطرين في القايمة. والترتيب كان
  //    ترتيب الإدخال — يعني المحل اللي بتتعامل معاه كل يوم ممكن
  //    يكون في آخر القايمة.
  //
  //    دلوقتي: دمج على مفتاح متقصوص (مسافات وحالة حروف بس — مفيش
  //    تطبيع مرن عشان محلين بأسامي متقاربة ما يندمجوش)، والعرض
  //    بأحدث صيغة اتكتبت، والترتيب بالأحدث استخداماً.
  const seen = new Map();
  const put = (raw, ts) => {
    const n = String(raw||'').trim();
    if(!n) return;
    const k = n.toLowerCase().replace(/\s+/g, ' ');
    const prev = seen.get(k);
    if(!prev || ts > prev.ts) seen.set(k, { name: n, ts });
  };
  ledger.forEach(e => put(e.shop, new Date(e.date||0).getTime() || 0));
  accDevices().forEach(d => put(d.shopName, new Date(d.intakeDate||0).getTime() || 0));
  return [...seen.values()]
    .sort((a,b) => b.ts - a.ts)
    .map(x => `<option value="${esc(x.name)}">`).join('');
}

function shopStats(){
  const shops = {};
  ledger.forEach(e => {
    const k = e.shop || 'بدون محل';
    shops[k] = shops[k] || { debit:0, credit:0, discount:0, opening:0, entries:[] };
    const amt = e.amount||0;
    if(e.type === 'credit') shops[k].credit += amt;
    else if(e.type === 'discount') shops[k].discount += amt;
    else if(e.type === 'opening') shops[k].opening += amt;
    else shops[k].debit += amt;   // debit (افتراضي)
    shops[k].entries.push(e);
  });
  Object.values(shops).forEach(s => {
    s.owed = s.debit + s.opening;      // اللي عليه (آجل + رصيد افتتاحي)
    s.paid = s.credit + s.discount;    // اللي اتدفع أو اتخصم
    s.balance = s.owed - s.paid;       // المتبقي
  });
  return shops;
}

// بيحدد الحركة اللي بتبدأ "دورة حسابية جديدة": حركة آجل/افتتاحي والرصيد قبلها كان مسدّد (≤ صفر)
function cycleStartIds(entries){
  const asc = entries.slice().sort((a,b) => new Date(a.date) - new Date(b.date));
  const starts = new Set();
  let bal = 0;
  asc.forEach((e,i) => {
    const isDebt = (e.type === 'debit' || e.type === 'opening');
    if(isDebt && bal <= 0 && i > 0) starts.add(e.id);
    bal += (e.type === 'credit' || e.type === 'discount') ? -(e.amount||0) : (e.amount||0);
  });
  return starts;
}

// ============================================================
// 📥📤 التاريخين على كارت الجهاز في شاشة الحسابات
// ------------------------------------------------------------
// 🧠 قبل كده الكارت كان عليه تاريخ واحد من غير اسم — وده كان
//    عملياً يوم الخروج (اتسلّم). وفي الطباعة كان فيه تاريخين.
//    فمكنتش عارف الرقم اللي قدامك ده دخول ولا خروج.
//    دلوقتي الاتنين مكتوبين ومتسمّيين، ونفس الأرقام اللي في الـPDF.
// ============================================================
function accFmtShort(iso){
  if(!iso) return '—';
  const d = new Date(iso);
  if(isNaN(d.getTime())) return '—';
  try{ return d.toLocaleString(accLocale()); }catch(e){ return d.toISOString(); }
}
function accEntryDatesHtml(e){
  const inn = stmtIntakeDate(e);
  // الجهاز موجود بس لسه ما اتسلّمش؟ (مرتجع لسه في الورشة مثلاً)
  // → «لسه ما خرجش» بدل ما نكتب تاريخ القيد كأنه يوم الخروج
  const dev = (e && e.deviceId) ? accDevices().find(x => x.id === e.deviceId) : null;
  if(dev && e.type === 'debit' && !accEntryExitDate(e, dev)){
    return `<div class="acc-entry-meta" style="display:flex;flex-wrap:wrap;gap:4px 12px;">`
      + `<span>📥 دخل: <b>${accFmtShort(inn)}</b></span>`
      + `<span>📤 خرج: <b style="color:var(--warn);">لسه ما خرجش</b></span>`
      + `</div>`;
  }
  const out = stmtDate(e);
  return `<div class="acc-entry-meta" style="display:flex;flex-wrap:wrap;gap:4px 12px;">`
    + `<span>📥 دخل: <b>${accFmtShort(inn)}</b></span>`
    + `<span>📤 خرج: <b>${accFmtShort(out)}</b></span>`
    + `</div>`;
}

// رسم حركة واحدة في كشف المحل حسب نوعها
function accEntryHtml(e){
  const amt = (e.amount||0).toLocaleString('en-EG');
  const meta = `<div class="acc-entry-meta">${new Date(e.date).toLocaleString(accLocale())} — ${t('acc.by')} ${esc(e.by||'')}</div>`;
  if(e.type === 'credit'){
    return `<div class="acc-entry" style="background:var(--success-bg);">
      <div><div style="font-weight:700; color:var(--success);">💵 ${t('acc.entryPayment')}${e.note ? ` — ${esc(e.note)}` : ''}</div>${meta}</div>
      <div style="text-align:left;"><div style="font-weight:800; color:var(--success);">− ${amt} ج.م</div>
        ${ACC_CAN_EDIT ? `<button class="acc-mini-btn" style="color:var(--danger);border-color:var(--danger-border);" onclick="deletePayment('${e.id}')">${t('acc.deleteEntry')}</button>` : ''}</div>
    </div>`;
  }
  if(e.type === 'discount'){
    return `<div class="acc-entry" style="background:var(--info-bg);">
      <div><div style="font-weight:700; color:var(--info);">🏷️ ${t('acc.entryDiscount')}${e.note ? ` — ${esc(e.note)}` : ''}</div>${meta}</div>
      <div style="text-align:left;"><div style="font-weight:800; color:var(--info);">− ${amt} ج.م</div>
        ${ACC_CAN_EDIT ? `<button class="acc-mini-btn" style="color:var(--danger);border-color:var(--danger-border);" onclick="deletePayment('${e.id}')">${t('acc.deleteEntry')}</button>` : ''}</div>
    </div>`;
  }
  if(e.type === 'opening'){
    return `<div class="acc-entry" style="background:var(--warn-tint);">
      <div><div style="font-weight:700; color:var(--warn);">🧾 ${t('acc.entryOpening')}</div>${meta}</div>
      <div style="text-align:left;"><div style="font-weight:800; color:var(--warn);">+ ${amt} ج.م</div>
        ${ACC_CAN_EDIT ? `<button class="acc-mini-btn" style="color:var(--danger);border-color:var(--danger-border);" onclick="deletePayment('${e.id}')">${t('acc.deleteEntry')}</button>` : ''}</div>
    </div>`;
  }
  // debit (جهاز آجل)
  // العطل واللون بيبانوا تحت اسم الجهاز على طول — المحل بيسأل
  // عليهم كل شوية، وقبل كده كان لازم يفتح الكشف كـ PDF عشان يشوف
  // العطل، واللون مكانش بيبان خالص.
  const issue = stmtIssue(e);
  const color = stmtColor(e);
  const bb = stmtBroughtBy(e);
  const bits = [];
  if(issue) bits.push(`⚠️ ${esc(issue)}`);
  if(color) bits.push(`🎨 ${esc(color)}`);
  const extra = bits.length
    ? `<div class="acc-entry-meta" style="color:var(--ink-2);">${bits.join(' <span style="opacity:.5;">·</span> ')}</div>`
    : '';
  // 🛵 المندوب في سطر لوحده — عشان المحل يعرف مين من عنده جاب الجهاز
  const bbLine = bb
    ? `<div class="acc-entry-meta" style="color:var(--ink-2);">🛵 ${esc(ACC_BB_LABEL)}: <b>${esc(bb)}</b></div>`
    : '';
  return `<div class="acc-entry">
    <div><div style="font-weight:700;">📱 ${esc(e.deviceLabel||'جهاز')}</div>
      ${extra}
      ${bbLine}
      ${accEntryDatesHtml(e)}
      <div class="acc-entry-meta">${t('acc.by')} ${esc(e.by||'')}${e.prevShop ? ` — <span style="color:var(--warn);">منقول من حساب "${esc(e.prevShop)}"</span>` : ''}</div></div>
    <div style="text-align:left;"><div style="font-weight:800; color:var(--warn);">+ ${amt} ج.م</div>
      ${ACC_CAN_EDIT ? `<button class="acc-mini-btn" onclick="transferDebit('${e.id}')">⇄ ${t('acc.moveShop')}</button>` : ''}</div>
  </div>`;
}

// رسم كارت محل واحد (أكورديون) بحركاته وفواصل الدورات
function accShopBlockHtml(n, s){
  const balance = s.balance;
  const open = accOpenShop === n;
  const safe = esc(n).replace(/'/g,"\\'");
  const starts = cycleStartIds(s.entries);
  const sortedDesc = s.entries.slice().sort((a,b) => new Date(b.date) - new Date(a.date));
  const cycleDivider = (e) => `<div style="text-align:center; margin:8px 0; color:#0891A8; font-size:12.5px; font-weight:800; border-top:1px dashed #CBD5E1; padding-top:8px;">🔄 ${t('acc.newCycle')} — ${new Date(e.date).toLocaleDateString('ar-EG')}</div>`;
  // ⚠️ في وضع القراءة-فقط الأزرار دي **مش بتترسم أصلاً** — مش
  //    مخفية بـ CSS. يعني حتى لو حد فتح أدوات المطوّر، مفيش زرار
  //    يدوس عليه. وفوق ده الكتابة نفسها مرفوضة من قاعدة البيانات.
  // 📅 زرارين Excel و PDF بيفتحوا شاشة «اختار الفترة» الأول
  //    (accRangeShop) — مش بيطبعوا على طول زي زمان.
  const toolbar = ACC_CAN_EDIT ? `
      <button class="btn-secondary" style="color:#0E7490;border-color:#A5F3FC;" onclick="waShop('${safe}')">💬 ${t('acc.wa')}</button>
      <button class="acc-mini-btn" style="margin-top:0;align-self:center;" onclick="setShopPhone('${safe}')">✎ ${t('acc.phone')}</button>
      <button class="acc-mini-btn" style="margin-top:0;align-self:center;color:var(--info);border-color:var(--info-border);" onclick="addDiscount('${safe}')">🏷️ ${t('acc.discount')}</button>
      <button class="btn-secondary" style="color:#166534;border-color:var(--success-border);" onclick="accRangeShop('xlsx','${safe}')">📊 Excel</button>
      <button class="btn-secondary" style="color:var(--danger-strong);border-color:var(--danger-border);" onclick="accRangeShop('pdf','${safe}')">📄 PDF</button>
      <button class="acc-mini-btn" style="margin-top:0;align-self:center;color:var(--danger);border-color:var(--danger-border);" onclick="deleteAccount('${safe}')">🗑 ${t('acc.deleteAccount')}</button>`
    : `<button class="btn-secondary" style="color:var(--danger-strong);border-color:var(--danger-border);" onclick="accRangeShop('pdf','${safe}')">📄 PDF</button>`;

  const entriesHtml = !open ? '' : `
    <div class="acc-toolbar">${toolbar}
    </div>
    <div class="acc-entries">${sortedDesc.map(e => accEntryHtml(e) + (starts.has(e.id) ? cycleDivider(e) : '')).join('')}</div>`;

  return `<div class="acc-shop" data-accshop="${esc(n)}">
    <button class="acc-shop-head" onclick="accOpenShop = accOpenShop==='${safe}' ? null : '${safe}'; renderAccounts();">
      <span style="font-weight:800; font-size:16px;">🏪 ${esc(n)}</span>
      <span class="acc-nums">
        <span>${t('acc.owed')}: <b>${s.owed.toLocaleString('en-EG')}</b></span>
        <span>${t('acc.paidDisc')}: <b style="color:var(--success);">${s.paid.toLocaleString('en-EG')}</b></span>
        <span>${t('acc.remaining')}: <b style="color:${balance > 0 ? 'var(--danger)' : 'var(--success)'};">${balance.toLocaleString('en-EG')}</b> ${t('acc.egp')}</span>
        <span style="color:var(--muted-2);">${open ? '▲' : '▼'}</span>
      </span>
    </button>
    ${entriesHtml}
  </div>`;
}

let accGroupOpen = { open:true, paid:false };
function toggleAccGroup(g){ accGroupOpen[g] = !accGroupOpen[g]; renderAccounts(); }

function renderAccounts(){
  // القايمة دي جزء من نموذج تسجيل الدفعة — مش موجودة في وضع
  // القراءة-فقط، فبنتخطاها بدل ما نقع.
  const _dl = document.getElementById('accShopsList');
  if(_dl) _dl.innerHTML = shopNamesForDatalist();
  const _sb = document.getElementById('accSearch');
  const q = ((_sb && _sb.value) || '').trim();
  const shops = shopStats();
  let names = Object.keys(shops);
  if(q) names = names.filter(n => n.includes(q));

  if(names.length === 0){
    document.getElementById('accountsBody').innerHTML = `<div class="empty-col">${q ? t('acc.noMatch') : t('acc.empty')}</div>`;
    return;
  }

  const openNames = names.filter(n => shops[n].balance > 0).sort((a,b) => shops[b].balance - shops[a].balance);
  const paidNames = names.filter(n => shops[n].balance <= 0).sort((a,b) => a.localeCompare(b,'ar'));
  const totalOpen = openNames.reduce((t,n) => t + shops[n].balance, 0);

  // نحافظ على مكان السكرول وقت أي تحديث
  const _scroller = document.getElementById('accountsOverlay');
  const _y = _scroller ? _scroller.scrollTop : 0;

  // رسم عناصر المجموعة حسب طريقة العرض المختارة — البحث بيتفلتر قبل هنا فبيسري على الأنواع الـ3
  const groupItems = (list) => {
    if(accViewMode === 'grid-small') return `<div class="acc-grid-small">${list.map(n => accShopCardSmall(n, shops[n])).join('')}</div>`;
    if(accViewMode === 'grid-large') return `<div class="acc-grid-large">${list.map(n => accShopCardLarge(n, shops[n])).join('')}</div>`;
    return list.map(n => accShopBlockHtml(n, shops[n])).join('');
  };

  const groupHtml = (title, bg, fg, key, list) => `
    <div style="margin-bottom:14px;">
      <button onclick="toggleAccGroup('${key}')" style="width:100%; display:flex; justify-content:space-between; align-items:center; background:${bg}; color:${fg}; border:none; border-radius:12px; padding:14px 16px; font-family:inherit; font-weight:800; font-size:15px; cursor:pointer;">
        <span>${title} (${list.length})</span><span>${accGroupOpen[key] ? '▲' : '▼'}</span>
      </button>
      ${accGroupOpen[key] ? `<div style="margin-top:10px;">${list.length ? groupItems(list) : `<div class="empty-col">${t('acc.none')}</div>`}</div>` : ''}
    </div>`;

  document.getElementById('accountsBody').innerHTML = `
    <div style="background:var(--danger-bg); border:1px solid var(--danger-border); border-radius:12px; padding:12px 16px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
      <span style="font-weight:800; color:#991B1B;">${t('acc.totalOpen')}</span>
      <span style="font-weight:900; font-size:18px; color:var(--danger);">${totalOpen.toLocaleString('en-EG')} ${t('acc.egp')}</span>
    </div>
    ${groupHtml('📂 ' + t('acc.groupOpen'), 'var(--danger-bg)', '#991B1B', 'open', openNames)}
    ${groupHtml('✅ ' + t('acc.groupPaid'), 'var(--success-bg)', '#166534', 'paid', paidNames)}
  `;
  if(_scroller) _scroller.scrollTop = _y;
}

// ============================================================
// طريقة عرض الحسابات: قائمة تفصيلية / مربعات صغيرة / مربعات كبيرة
// التفضيل بيتحفظ لكل جهاز في localStorage — إضافي بالكامل، مش بيمس بيانات أو سكيمة
// ============================================================
const ACC_VIEW_KEY = 'store_accounts_view_mode';
const ACC_VIEW_MODES = ['list', 'grid-small', 'grid-large'];
let accViewMode = (function(){
  try{ const v = localStorage.getItem(ACC_VIEW_KEY); return ACC_VIEW_MODES.includes(v) ? v : 'list'; }
  catch(e){ return 'list'; }
})();

// تلوين الزر الفعّال في المبدّل حسب الوضع الحالي
function syncAccViewButtons(){
  document.querySelectorAll('#accViewBar .acc-viewbtn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-mode') === accViewMode);
  });
}

// تغيير الوضع من أزرار المبدّل — بيحفظ التفضيل ويعيد الرسم
function setAccViewMode(mode){
  if(!ACC_VIEW_MODES.includes(mode)) mode = 'list';
  accViewMode = mode;
  try{ localStorage.setItem(ACC_VIEW_KEY, mode); }catch(e){}
  syncAccViewButtons();
  renderAccounts();
}

// فتح كشف المحل بالكامل من كارت (صغير/كبير): بيعرض القائمة ويفتح الأكورديون ويمرّر ليه
// ملحوظة: بيحوّل العرض لقائمة وقتياً بس من غير ما يغيّر التفضيل المحفوظ
function openShopFromCard(name){
  accOpenShop = name;
  accGroupOpen.open = true;
  accGroupOpen.paid = true;   // نتأكد إن المجموعة اللي فيها المحل مفتوحة
  accViewMode = 'list';
  syncAccViewButtons();
  renderAccounts();
  requestAnimationFrame(() => {
    const el = Array.from(document.querySelectorAll('#accountsBody [data-accshop]'))
      .find(x => x.getAttribute('data-accshop') === name);
    if(el && el.scrollIntoView) el.scrollIntoView({ behavior:'smooth', block:'start' });
  });
}

// كارت صغير: اسم المحل + المتبقّي بارز — للمسح البصري السريع
function accShopCardSmall(n, s){
  const balance = s.balance;
  const safe = esc(n).replace(/'/g,"\\'");
  const balColor = balance > 0 ? 'var(--danger)' : 'var(--success)';
  return `<button type="button" class="acc-card acc-card-sm" data-accshop="${esc(n)}" onclick="openShopFromCard('${safe}')">
    <span class="acc-card-name">🏪 ${esc(n)}</span>
    <span class="acc-card-bal" style="color:${balColor};">${balance.toLocaleString('en-EG')}<small> ${t('acc.egp')}</small></span>
  </button>`;
}

// كارت كبير: رأس (اسم + طباعة كشف) وجسم (عليه / مدفوع-خصم / المتبقّي كشارة)
function accShopCardLarge(n, s){
  const balance = s.balance;
  const safe = esc(n).replace(/'/g,"\\'");
  const balColor = balance > 0 ? 'var(--danger)' : 'var(--success)';
  const balBg = balance > 0 ? 'var(--danger-bg)' : 'var(--success-bg)';
  return `<div class="acc-card acc-card-lg" data-accshop="${esc(n)}">
    <div class="acc-card-lg-head">
      <button type="button" class="acc-card-open" onclick="openShopFromCard('${safe}')"><span>🏪 ${esc(n)}</span></button>
      <button type="button" class="acc-card-print" title="${t('acc.printPdf')}" onclick="event.stopPropagation(); accRangeShop('pdf','${safe}')">🖨️</button>
    </div>
    <div class="acc-card-lg-body" onclick="openShopFromCard('${safe}')">
      <div class="acc-card-row"><span>${t('acc.owed')}</span><b>${s.owed.toLocaleString('en-EG')}</b></div>
      <div class="acc-card-row"><span>${t('acc.paidDisc')}</span><b style="color:var(--success);">${s.paid.toLocaleString('en-EG')}</b></div>
      <div class="acc-card-bal-badge" style="background:${balBg}; color:${balColor};">
        <span>${t('acc.remaining')}</span><b>${balance.toLocaleString('en-EG')} ${t('acc.egp')}</b>
      </div>
    </div>
  </div>`;
}

// نوع الحركة يزوّد الرصيد (جهاز آجل/رصيد افتتاحي) ولا ينقّصه (دفعة/خصم)
function isDebitLike(e){ return e.type === 'debit' || e.type === 'opening'; }
// وصف الحركة نص عادي (للإكسيل)
function stmtDesc(e){
  if(e._carry) return accCarryText(e);
  if(e.type==='opening') return 'رصيد افتتاحي سابق';
  if(e.type==='discount') return 'خصم' + (e.note ? ' — ' + e.note : '');
  if(e.type==='credit') return 'دفعة' + (e.note ? ' — ' + e.note : '');
  return (e.kind==='return' ? 'مرتجع — ' : '') + 'جهاز: ' + (e.deviceLabel||'') + (e.prevShop ? ` (منقول من حساب ${e.prevShop})` : '');
}
// وصف الحركة بأيقونات (للـ PDF)
function stmtDescHtml(e){
  if(e._carry) return '📌 <b>' + esc(accCarryText(e)) + '</b>';
  if(e.type==='opening') return '🧾 رصيد افتتاحي سابق';
  if(e.type==='discount') return '🏷️ خصم' + (e.note ? ' — ' + esc(e.note) : '');
  if(e.type==='credit') return '💵 دفعة' + (e.note ? ' — ' + esc(e.note) : '');
  return `${e.kind==='return' ? '🔁 ' : ''}📱 ${esc(e.deviceLabel||'جهاز')}${e.kind==='return' ? ` <small style="color:var(--violet);font-weight:800;">(مرتجع)</small>` : ''}` + (e.prevShop ? `<br><small style="color:var(--warn);">منقول من حساب "${esc(e.prevShop)}"</small>` : '');
}

// عطل الجهاز في كشف الحساب.
// القيود الجديدة بتحفظه جواها. القديمة بنجيبه من الجهاز نفسه.
// الحركات اللي مش أجهزة (دفعة/خصم/رصيد افتتاحي) مالهاش عطل.
// ============================================================
// تاريخ السطر في كشف حساب المحل
// ------------------------------------------------------------
// ⚠️ e.date هو لحظة إنشاء القيد في الدفتر — مش تاريخ تسليم الجهاز:
//       date: new Date().toISOString()   في addLedgerDebit
//
// الاتنين بيتساووا بس لو المحاسب حدد "آجل" وقت التسليم بالظبط.
// لو حدده بعدين، أو سعّر الجهاز بعدين، أو ظبّط دفعة قديمة النهاردة —
// القيد بياخد تاريخ النهاردة. فكشف فيه عشرين جهاز اتسلّموا الشهر
// اللي فات كان بيطلع كلهم بتاريخ واحد: يوم ما فتحت الكشف.
//
// والمحل عايز يعرف "الجهاز ده رجعلي إمتى"، مش إمتى المحاسب سجّل القيد.
//
// القيود اللي مش مربوطة بجهاز (دفعة · رصيد افتتاحي · خصم) بتفضل
// على تاريخ القيد — وده صح ليها: ده فعلاً يوم ما حصلت.
// ============================================================
// ============================================================
// 🧳 رحلات الجهاز — دخل · خرج · رجع · خرج تاني …
// ------------------------------------------------------------
// 🔴 المشكلة اللي كانت:
//    الكشف كان بياخد «تاريخ الخروج» من **آخر مرة** الجهاز اتسلّم.
//    فالجهاز اللي رجع واتسلّم تاني، سطره الأصلي وسطر المرتجع
//    الاتنين كانوا بياخدوا **نفس** التاريخ (تسليم ما بعد المرتجع)
//    — وبما إن التاريخ واحد، الترتيب كان بيتلخبط والمرتجع ييجي
//    قبل الأصلي.
//
// 🧠 الحل بالبلدي: بنقرا سجل الجهاز كأنه تذاكر سفر:
//       رحلة ١ (الأصلية): دخل → … → خرج (اتسلّم)
//       رحلة ٢ (مرتجع ١): رجع → … → خرج تاني
//       رحلة ٣ (مرتجع ٢): رجع → … → خرج تالت
//    وكل سطر في الكشف بياخد تواريخ **رحلته هو** بس.
//
// ⚠️ بنعدّ **تغيير الحالة** بس، مش أي سطر في السجل. ليه؟ لأن
//    السجل فيه ملاحظات كتير (تسعير · تحويل آجل · تعديل مبلغ)
//    بتتكتب بحالة الجهاز وقتها — يعني «delivered» ممكن تتكرر عشر
//    مرات وهي تسليم واحد بس. فبنعدّ اللحظة اللي الحالة **اتغيّرت** فيها.
// ============================================================
function accStatusMoves(d){
  const h = (d && Array.isArray(d.statusHistory)) ? d.statusHistory : [];
  const out = []; let prev = null;
  for(let i = 0; i < h.length; i++){
    const x = h[i];
    if(!x || !x.status || !x.date) continue;
    if(x.status !== prev){ out.push({ s: x.status, t: x.date }); prev = x.status; }
  }
  return out;
}

// أماكن «رجع» في السجل — بس اللي بعد تسليم فعلاً (ده المرتجع الحقيقي)
function accReturnMoves(moves){
  const rets = []; let seenDelivered = false;
  for(let i = 0; i < moves.length; i++){
    if(moves[i].s === 'delivered') seenDelivered = true;
    else if(moves[i].s === 'returned' && seenDelivered) rets.push(i);
  }
  return rets;
}

// أول تسليم بين مكانين في السجل (من بعد a لحد قبل b)
function accFirstDelivered(moves, a, b){
  for(let i = a; i < b; i++) if(moves[i].s === 'delivered') return moves[i].t;
  return null;
}

// قيد المرتجع ده بتاع أنهي رجعة؟ (رقم من صفر — أو -1 لو مش لاقيين)
// 🧠 بندوّر على آخر رجعة حصلت **قبل** ما القيد يتكتب — لأن قيد المرتجع
//    بيتعمل وهو في المرتجعات أو بعد ما يتسلّم، مش قبل ما يرجع.
function accReturnRoundIdx(e, moves, rets){
  if(!rets.length) return -1;
  const et = new Date(e.date || 0).getTime();
  let k = -1;
  for(let j = 0; j < rets.length; j++){
    if(new Date(moves[rets[j]].t).getTime() <= et + 1000) k = j;
  }
  if(k < 0) k = Math.min(Math.max((e.retRound || 1) - 1, 0), rets.length - 1);
  return k;
}

// 📤 تاريخ الخروج لسطر جهاز — حسب رحلته
function accEntryExitDate(e, d){
  const moves = accStatusMoves(d);
  if(!moves.length) return null;
  const rets = accReturnMoves(moves);
  if(e.kind === 'return'){
    const k = accReturnRoundIdx(e, moves, rets);
    if(k < 0) return null;
    const end = (k + 1 < rets.length) ? rets[k + 1] : moves.length;
    return accFirstDelivered(moves, rets[k] + 1, end);   // null = لسه ما خرجش
  }
  // السطر الأصلي: آخر تسليم **قبل** أول رجعة
  const end = rets.length ? rets[0] : moves.length;
  for(let i = end - 1; i >= 0; i--) if(moves[i].s === 'delivered') return moves[i].t;
  return null;
}

// 📥 تاريخ دخول المرتجع = يوم ما رجع في **الرجعة بتاعته**
function accEntryReturnIntake(e, d){
  const moves = accStatusMoves(d);
  const rets = accReturnMoves(moves);
  const k = accReturnRoundIdx(e, moves, rets);
  return k < 0 ? null : moves[rets[k]].t;
}

function stmtDate(e){
  if(e && e.deviceId){
    const dev = accDevices().find(x => x.id === e.deviceId);
    // من غير الجهاز (اتمسح / الصفحة مفيهاش أجهزة) بنرجع لتاريخ
    // القيد — تاريخ أقل دقة، بس مش صفحة واقعة.
    const dd = dev ? accEntryExitDate(e, dev) : null;
    if(dd) return dd;
  }
  return e && e.date;
}

// ============================================================
// 📥 تاريخ الدخول — يوم ما الجهاز دخل المحل
// ------------------------------------------------------------
// 🧠 بالبلدي: الكشف كان فيه تاريخ واحد بس = يوم ما الجهاز **خرج**
//    (اتسلّم). دلوقتي فيه كمان يوم ما الجهاز **دخل**. فالمحل يشوف
//    «الجهاز ده قعد عندكم من كذا لكذا».
//
// من فين بنجيبه؟
//   • القيود الجديدة: محفوظ جوه القيد نفسه (intakeDate) — بيتحفظ
//     من addLedgerDebit في الداشبورد. فلو الجهاز اتمسح بعدين،
//     التاريخ يفضل موجود.
//   • القيود القديمة: بنجيبه من الجهاز نفسه (d.intakeDate).
//   • المرتجع: «دخوله» = يوم ما رجع في **الرجعة بتاعته** (حالة returned
//     في سجل الحالات) — مش يوم دخوله أول مرة خالص.
//   • دفعة / خصم / رصيد افتتاحي: مالهمش دخول → «—».
// ============================================================
function stmtIntakeDate(e){
  if(!e || e.type !== 'debit') return null;
  const d = e.deviceId ? accDevices().find(x => x.id === e.deviceId) : null;
  if(e.kind === 'return'){
    // يوم ما رجع في **رجعته هو** — مش آخر رجعة للجهاز
    return d ? accEntryReturnIntake(e, d) : null;
  }
  if(e.intakeDate) return e.intakeDate;
  return (d && d.intakeDate) || null;
}

// تاريخ + ساعة للكشف — ولو مفيش تاريخ (أو تاريخ بايظ) بنكتب «—»
function accFmtDT(iso){
  if(!iso) return '—';
  const d = new Date(iso);
  if(isNaN(d.getTime())) return '—';
  try{ return d.toLocaleString('ar-EG'); }catch(e){ return d.toISOString(); }
}

// 🎨 لون الجهاز في كشف الحساب.
// نفس منطق stmtIssue بالظبط: القيود الجديدة ممكن تحفظه جواها،
// والقديمة بنجيبه من الجهاز نفسه. والحركات اللي مش أجهزة
// (دفعة/خصم/رصيد افتتاحي) مالهاش لون.
// ⚠️ اللون مهم للمحل عشان يفرّق بين جهازين نفس الموديل لنفس
//    العميل — «ايفون ١٤ أسود» و«ايفون ١٤ أبيض».
function stmtColor(e){
  if(e.type !== 'debit') return '';
  if(e.color) return String(e.color).trim();
  const d = accDevices().find(x => x.id === e.deviceId);
  return (d && d.deviceColor) ? String(d.deviceColor).trim() : '';
}

function stmtIssue(e){
  if(e.type !== 'debit') return '';
  if(e.issue) return e.issue;
  const d = accDevices().find(x => x.id === e.deviceId);
  if(e.kind === 'return') return (d && (d.discoveredFault || d.returnComplaint)) ? String(d.discoveredFault || d.returnComplaint).trim() : '';
  return (d && d.reportedIssue) ? String(d.reportedIssue).trim() : '';
}

// ============================================================
// سطور كشف المحل
// ------------------------------------------------------------
// 📅 لو فيه فترة متحددة (ACC_RANGE) — بنطلّع الحركات اللي جوه
//    الفترة بس، وبنحط في أولها سطر واحد اسمه «رصيد سابق»:
//    ده مجموع كل اللي قبل أول يوم في الفترة.
//
// 🧠 ليه السطر ده مهم؟ تخيّل كشكول حساب. لو قطعت منه صفحات
//    الشهر ده بس وإديتها للمحل، هيقول «طب واللي قبل كده؟».
//    السطر ده بيقوله: «قبل الشهر ده كان عليك كذا» — فالمتبقي
//    في آخر الكشف بيطلع صح، مش بس فلوس الشهر ده.
//
// ⚠️ الحركات اللي **بعد** آخر يوم في الفترة مش داخلة خالص —
//    فالمتبقي = الرصيد لحد آخر يوم في الفترة.
// ============================================================
// ============================================================
// 📅 الفترة «حسب أنهي تاريخ»؟
// ------------------------------------------------------------
// basis = 'out' → تاريخ الخروج (الافتراضي — زي ما كان)
// basis = 'in'  → تاريخ الدخول
//
// 🧠 بالبلدي: لو اخترت «الشهر ده حسب الدخول»، هيطلع كل جهاز
//    **دخل** المحل الشهر ده — حتى لو خرج الشهر اللي بعده.
//    ولو «حسب الخروج»، هيطلع كل جهاز **اتسلّم** الشهر ده.
//
// ⚠️ الدفعة والخصم والرصيد الافتتاحي مالهمش «دخول» — فبنستعمل
//    تاريخهم هم في الحالتين (يوم ما الدفعة حصلت فعلاً).
// ============================================================
function accBasisDate(e, basis){
  if(basis === 'in'){
    const inn = stmtIntakeDate(e);
    if(inn) return inn;
  }
  return stmtDate(e);
}

function shopStatementRows(shop){
  // الترتيب بنفس التاريخ اللي الفترة ماشية عليه — وإلا السطور تطلع
  // مبعثرة قدام المحل. مفيش عمود رصيد جاري، فالترتيب عرض بحت.
  const r = ACC_RANGE;
  const basis = (r && r.basis) || 'out';
  const bd = e => accBasisDate(e, basis);
  const all = ledger.filter(e => (e.shop||'بدون محل') === shop)
    .slice().sort((a,b) => new Date(bd(a)) - new Date(bd(b)));
  let entries = all;
  if(r && r.cycle){
    // 🔄 الدورة الحالية — شوف accCycleSplit تحت
    const c = accCycleSplit(shop);
    if(c){
      entries = c.list.slice().sort((a,b) => new Date(bd(a)) - new Date(bd(b)));
      if(c.before < -0.5 && c.at){
        entries = [{
          id: '__carry', _carry: true, _carryFrom: c.at.toISOString(),
          shop, type: 'credit', amount: Math.abs(c.before),
          date: new Date(c.at.getTime() - 1000).toISOString(), by: '', note: ''
        }].concat(entries);
      }
    }
  } else if(r){
    entries = all.filter(e => accInRange(bd(e), r));
    if(r.from){
      const fromT = r.from.getTime();
      const prior = all.filter(e => {
        const tt = new Date(bd(e) || 0).getTime();
        return tt && tt < fromT;
      }).reduce((s,e) => s + (isDebitLike(e) ? (e.amount||0) : -(e.amount||0)), 0);
      if(prior){
        // سطر الرصيد السابق — مش حركة حقيقية في الدفتر، متولّد للكشف بس
        entries = [{
          id: '__carry', _carry: true, _carryFrom: r.from.toISOString(),
          shop, type: prior > 0 ? 'opening' : 'credit', amount: Math.abs(prior),
          date: new Date(fromT - 1000).toISOString(), by: '', note: ''
        }].concat(entries);
      }
    }
  }
  const debit = entries.filter(e=>e.type==='debit'||e.type==='opening').reduce((t,e)=>t+(e.amount||0),0);
  const credit = entries.filter(e=>e.type==='credit'||e.type==='discount').reduce((t,e)=>t+(e.amount||0),0);
  return { entries, debit, credit, balance: debit - credit };
}


// ============================================================
// الطباعة — من جوه الصفحة، مش في تاب جديد
// ------------------------------------------------------------
// ⚠️ الطريقة الأقدم كانت window.open('','_blank') وبعدين
//    document.write. ودي بتفتح **صفحة جديدة**، ولما التطبيق
//    مثبّت على الأيفون (standalone) مفيش زرار رجوع أصلاً —
//    فالمستخدم بيتحبس ومضطر يقفل التطبيق ويفتحه تاني.
//
//    بعدها بقينا نرسم الكشف في إطار مخفي (iframe) جوه نفس الصفحة
//    ونطبع منه. الصفحة ما بتتحركش من مكانها — وده شغّال تمام على
//    الكمبيوتر وأندرويد.
//
// 🔴 لكن على الأيفون والآيباد الإطار المخفي **مش بيطبع خالص**:
//    سفاري (WebKit) بيدعم الطباعة للصفحة الرئيسية بس، وأي
//    iframe.contentWindow.print() بيتجاهله في صمت — من غير خطأ
//    ومن غير رسالة. وده كان بالظبط اللي بيحصل: الزرار يتدعس
//    ومفيش أي حاجة تحصل، والكمبيوتر شغّال عادي.
//
//    تشبيه: كإنك بتقول للورقة اللي جوه الدرج «اطبعي نفسك».
//    على الويندوز الدرج بينفّذ، وعلى الأيفون الدرج مش سامع
//    أصلاً — لازم تطلّع الورقة برّه على المكتب الأول.
//
//    فعلى الأيفون بنعمل كده بالظبط: بنعرض الكشف **في الصفحة
//    نفسها** ملء الشاشة، وبنندهه window.print() بتاع الصفحة
//    الرئيسية — ودي WebKit بيدعمها.
//
// 🔧 الكمبيوتر وأندرويد سايبينهم على الـ iframe زي ما هم. شغّال،
//    فمش هنلمسه — وده مقصود مش كسل.
// ============================================================

// الأيفون والآيباد.
// ⚠️ الآيباد الحديث بيقول عن نفسه "Macintosh" في الـ user agent،
//    فبنكشفه باللمس كمان وإلا هيتعامل كأنه كمبيوتر ويفضل مكسور.
var ACC_IS_IOS = (function(){
  try{
    var ua = navigator.userAgent || '';
    if(/iPad|iPhone|iPod/.test(ua)) return true;
    return /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
  }catch(e){ return false; }
})();

// ============================================================
// مسار الأيفون: الكشف بيتعرض في الصفحة نفسها وبيتطبع منها
// ------------------------------------------------------------
// الكشف جاي كصفحة HTML كاملة (فيها <style> و<body>). بنفصلهم:
//   • الجسم  → بيتحط في صندوق ملء الشاشة جوه الصفحة
//   • الاستايل → بيتحقن في الصفحة، وقواعد body بتاعته بتتحوّل
//     للصندوق بتاعنا عشان ما تقعش على صفحة النظام كلها
//
// وفي وضع الطباعة بنخفي كل حاجة في الصفحة ما عدا الصندوق —
// فاللي بيتطبع هو الكشف لوحده.
// ============================================================
// 📱 التطبيق مثبّت على الشاشة الرئيسية (مش سفاري عادي)؟
// ⚠️ الفرق ده مهم جداً: سفاري العادي بيطبع تمام، لكن التطبيق
//    المثبّت **مبيدعمش الطباعة خالص** — الأمر بيتجاهل في صمت.
//    (قيد في نظام آبل: developer.apple.com/forums/thread/22911)
//    فبنبني PDF بنفسنا بدلها.
var ACC_IOS_APP = ACC_IS_IOS && (function(){
  try{
    if(navigator.standalone === true) return true;
    return !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  }catch(e){ return false; }
})();

// ============================================================
// 🎨 ألوان الطباعة — الكشف لازم يطلع فاتح دايماً
// ------------------------------------------------------------
// ⚠️ التقارير بتستعمل متغيرات ثيم الداشبورد جوه الأسطر، مثلاً:
//        background:var(--surface)   ·   color:var(--warn)
//
//    ده مكانش بيبان في الإطار المخفي لأن المتغيرات دي مش معرّفة
//    جواه أصلاً — فكانت بتقع على الافتراضي والخلفية تطلع بيضا.
//    يعني كان شغّال بالصدفة مش بالتصميم.
//
//    لكن الكشف دلوقتي بيتعرض **جوه الصفحة نفسها**، يعني ورث ثيم
//    الداشبورد. ولو المحاسب شغّال بالوضع الداكن، --surface بتبقى
//    كحلي غامق والكلام غامق فوقه = سطور مش مقروءة خالص.
//
//    الحل: بنعيد تعريف ألوان الثيم كلها **جوه الكشف بس** بقيم
//    الوضع الفاتح. فأي تقرير بيطلع بألوان الورق الصح مهما كان
//    ثيم الشاشة، وصفحة النظام ورا الكشف ما بتتأثرش.
//
// 🔧 القيم دي منقولة من :root في dashboard.html. لو غيّرت لون
//    هناك وعايزه يتغيّر في الطباعة كمان، غيّره هنا برضه.
// ============================================================
var ACC_PRINT_VARS =
    'color-scheme:light;'
  + '--bg:#F3F5F7;--surface:#FFFFFF;--ink:#1A2332;--muted:#64748B;'
  + '--accent:#0891A8;--accent-dark:#077A8F;'
  + '--surface-2:#F8FAFC;--surface-3:#F1F5F9;--surface-alt:#EEF0F3;'
  + '--border:#E2E8F0;--border-strong:#CBD5E1;'
  + '--ink-2:#475569;--ink-3:#334155;--muted-2:#64748B;'
  + '--on-accent:#FFFFFF;'
  + '--shadow:rgba(16,24,40,.10);--shadow-lg:rgba(16,24,40,.20);'
  + '--chrome:#1A2332;--chrome-ink:#FFFFFF;'
  + '--danger:#DC2626;--danger-bg:#FEF2F2;--danger-border:#FCA5A5;--danger-strong:#B91C1C;--danger-tint:#FEE2E2;'
  + '--warn:#B45309;--warn-bg:#FEF3C7;--warn-border:#FDE68A;--warn-strong:#92400E;--warn-tint:#FFFBEB;'
  + '--success:#16A34A;--success-bg:#F0FDF4;--success-border:#BBF7D0;'
  + '--info:#2563EB;--info-bg:#EFF6FF;--info-border:#BFDBFE;'
  + '--violet:#7C3AED;'
  + '--waiting:#96521A;--waiting-bg:#FBF2E9;'
  + '--diagnosing:#6E56CF;--diagnosing-bg:#F1EEFB;'
  + '--repairing:#2B6CB0;--repairing-bg:#EAF1F8;'
  + '--done:#15803D;--done-bg:#EAF6EE;'
  + '--delivered:#64748B;--delivered-bg:#EEF1F3;'
  + '--delivered_paid:#15803D;--delivered_paid-bg:#DCFCE7;'
  + '--delivered_unpaid:#B45309;--delivered_unpaid-bg:#FEF3C7;'
  + '--paid:#15803D;--paid-bg:#EAF6EE;'
  + '--unpaid:#B45309;--unpaid-bg:#FEF3E2;'
  + '--rejected_shop:#C2185B;--rejected_shop-bg:#FCE7F1;'
  + '--rejected:#BE1D1D;--rejected-bg:#FEF2F2;'
  + '--returned:#9333EA;--returned-bg:#F5EEFC;'
  + '--trashed:#64748B;--trashed-bg:#EEF1F3;';

function accPrintSheet(html, title){
  accClosePrintSheet();          // أي كشف قديم لسه مفتوح

  var css = '', body = html;
  try{
    var doc = new DOMParser().parseFromString(html, 'text/html');
    css = Array.prototype.map.call(doc.querySelectorAll('style'),
            function(s){ return s.textContent; }).join('\n');
    body = doc.body ? doc.body.innerHTML : html;
  }catch(e){ console.error('قراءة الكشف فشلت:', e); }

  // ⚠️ استايل الكشف متكتب وهو فاكر إنه لوحده في صفحة. قواعد body
  //    بتاعته (padding / خط / لون) لو سبناها هتقع على صفحة النظام
  //    كلها. بنحوّلها للصندوق بتاعنا بس.
  css = String(css).replace(/(^|[}\n,]\s*)body(\s*[,{])/g, '$1.aps-doc$2');

  var st = document.createElement('style');
  st.id = 'accPrintSheetCss';
  st.textContent =
    // ⚠️ ACC_PRINT_VARS لازم تفضل أول حاجة جوه القاعدة — هي اللي
    //    بتقطع ثيم الداشبورد عن الكشف.
    '#accPrintSheet{' + ACC_PRINT_VARS
      + 'position:fixed;inset:0;z-index:2147483647;background:#fff;'
      + 'color:#1A2332;overflow:auto;-webkit-overflow-scrolling:touch;}'
    + '#accPrintSheet .aps-bar{position:sticky;top:0;z-index:2;display:flex;align-items:center;'
      + 'gap:8px;padding:calc(10px + env(safe-area-inset-top)) 12px 10px;background:#101014;color:#fff;}'
    + '#accPrintSheet .aps-t{flex:1;font-weight:800;font-size:14px;overflow:hidden;'
      + 'text-overflow:ellipsis;white-space:nowrap;}'
    + '#accPrintSheet .aps-btn{border:0;border-radius:10px;padding:11px 14px;'
      + 'font:800 13px/1 inherit;cursor:pointer;white-space:nowrap;}'
    + '#accPrintSheet .aps-x{background:rgba(255,255,255,.16);color:#fff;}'
    + '#accPrintSheet .aps-p{background:#16A34A;color:#fff;}'
    + '\n' + css + '\n'
    // ⚠️ لازم تفضل آخر حاجة في الاستايل — عشان تكسب على أي
    //    @media print مكتوب جوه الكشف نفسه.
    + '@media print{'
      + 'body > *:not(#accPrintSheet){display:none !important;}'
      + '#accPrintSheet{position:static !important;overflow:visible !important;background:#fff !important;}'
      + '#accPrintSheet .aps-bar{display:none !important;}'
    + '}';
  document.head.appendChild(st);

  var host = document.createElement('div');
  host.id = 'accPrintSheet';
  host.setAttribute('dir', 'rtl');
  host.innerHTML =
    '<div class="aps-bar">'
      + '<button type="button" class="aps-btn aps-x" onclick="accClosePrintSheet()">✕ إغلاق</button>'
      + '<span class="aps-t">' + esc(title || 'كشف') + '</span>'
      + '<button type="button" class="aps-btn aps-p" id="apsPrintBtn" onclick="accPrintNow()">'
        + (ACC_IOS_APP ? '📄 احفظ / ابعت PDF' : '🖨️ اطبع / احفظ PDF') + '</button>'
    + '</div>'
    + '<div class="aps-doc">' + body + '</div>';
  document.body.appendChild(host);

  // ⚠️ من غير أي تأخير — لازم تبقى في نفس لحظة الضغطة، وإلا سفاري
  //    بيعتبرها "طباعة تلقائية" ويطلب إذن كل مرة.
  //
  // 📱 بس في التطبيق المثبّت الزرار بيعمل PDF ويفتح شيت المشاركة —
  //    ومش منطقي إن ده يحصل لوحده أول ما الكشف يفتح. المحاسب ساعات
  //    عايز يبص بس. فهناك بيستنى ضغطته هو.
  if(!ACC_IOS_APP) accPrintNow();
}

// الطباعة نفسها. زرار «اطبع» جوه الكشف بيندهها كمان — فلو النداء
// التلقائي اتمنع لأي سبب، المستخدم عنده ضغطة مباشرة تشتغل أكيد.
//
// 📱 في التطبيق المثبّت على الأيفون مفيش طباعة أصلاً، فبنبني PDF.
function accPrintNow(){
  if(ACC_IOS_APP) return accSavePdf();
  try{ window.print(); }
  catch(e){ console.error('الطباعة فشلت:', e); }
}

// ============================================================
// 📄 بناء PDF بإيدينا — من غير أي مكتبة خارجية
// ------------------------------------------------------------
// ليه بإيدينا؟ مكتبات الـ PDF الجاهزة تقيلة (نص ميجا) وبتتحمّل من
// النت، والمحل شغّال على نت موبايل. والمطلوب هنا بسيط: صورة في
// ورقة. فالكود ده بيعمل كده بالظبط.
//
// إزاي بيشتغل:
//   ١) بنقرا اللي **ظاهر على الشاشة** (عنوان · كروت · جدول)
//   ٢) بنرسمه على كانفس صفحة صفحة
//      ⚠️ ليه كانفس؟ لأن الكانفس بيشكّل العربي صح في سفاري —
//         وده أهم حاجة. أي طريقة تانية بتطلع الحروف مقطّعة.
//   ٣) كل صفحة بتتحوّل JPEG
//   ٤) بنلفّ الصور في ملف PDF مكتوب بايت بايت
//
// ⚠️ بنقرا من الشاشة مش من البيانات — يعني لو غيّرت شكل التقرير
//    بكرا، الـ PDF بيتغيّر معاه لوحده. مفيش حتة اتنين لازم
//    تفتكر تظبطهم مع بعض.
// ============================================================

// ورقة A4 أفقي بالنقطة (نفس @page في التقارير)، و×2 عشان الصورة تطلع حادة
var ACC_PDF = { w: 842, h: 595, pad: 26, scale: 2 };
var ACC_PDF_FONT = '"Tajawal","Cairo",-apple-system,"SF Arabic","Segoe UI",Tahoma,sans-serif';

function accPdfFont(px, weight){
  return (weight || 400) + ' ' + Math.round(px * ACC_PDF.scale) + 'px ' + ACC_PDF_FONT;
}

// مستطيل بحواف مدوّرة (ما تعتمدش على roundRect — سفاري القديم مفيهوش)
function accPdfRoundRect(x, r0, y, w, h, r){
  const c = r0;
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);      c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);      c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);          c.quadraticCurveTo(x, y, x + r, y);
  c.closePath(); c.fill();
}

// لون الشريط العلوي: التقارير بتستعمل تدرّج، والمتصفح بيرجّعه كنص —
// فبناخد أول لون جواه. ولو مفيش، بناخد لون الخلفية العادي.
function accPdfBandColor(el){
  if(!el) return '#1A2332';
  try{
    const cs = getComputedStyle(el);
    const m = String(cs.backgroundImage || '').match(/rgba?\([^)]+\)/);
    if(m) return m[0];
    const bg = cs.backgroundColor;
    if(bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
  }catch(e){}
  return '#1A2332';
}

// بنقرا الكشف المعروض: عنوان · كروت الأرقام · أعمدة وصفوف الجدول
function accPdfRead(){
  const root = document.querySelector('#accPrintSheet .aps-doc');
  if(!root) return null;
  const txt = el => el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : '';
  const head = root.querySelector('.head');

  const data = {
    title: txt(head && head.querySelector('h1')),
    sub:   txt(head && head.querySelector('.sub')),
    band:  accPdfBandColor(head),
    cards: [], cols: [], rows: []
  };
  if(!data.title){
    const bar = document.querySelector('#accPrintSheet .aps-t');
    data.title = txt(bar);
  }

  root.querySelectorAll('.tcard').forEach(c => {
    data.cards.push({
      lbl: txt(c.querySelector('.lbl')),
      num: txt(c.querySelector('.num')),
      bg:  getComputedStyle(c).backgroundColor || '#475569'
    });
  });

  const table = root.querySelector('table');
  if(table){
    table.querySelectorAll('tr').forEach(tr => {
      const ths = tr.querySelectorAll('th');
      if(ths.length && !data.cols.length){
        ths.forEach(th => data.cols.push(txt(th)));
        return;
      }
      const tds = tr.querySelectorAll('td');
      if(!tds.length) return;
      const cells = [];
      tds.forEach(td => {
        let cs = {};
        try{ cs = getComputedStyle(td); }catch(e){}
        cells.push({
          t: txt(td),
          c: cs.color || '#1A2332',
          b: (parseInt(cs.fontWeight, 10) || 400) >= 700
        });
      });
      data.rows.push({ cells: cells });
    });
  }
  return data;
}

// بنلفّ الكلام على سطرين كحد أقصى، والزيادة بتتقص بنقط —
// عشان سطر واحد طويل ما يكسرش شكل الجدول كله.
function accPdfWrap(ctx, text, maxW, maxLines){
  const words = String(text || '').split(' ');
  const lines = []; let cur = '';
  for(let i = 0; i < words.length; i++){
    const test = cur ? (cur + ' ' + words[i]) : words[i];
    if(ctx.measureText(test).width <= maxW || !cur){ cur = test; }
    else { lines.push(cur); cur = words[i]; if(lines.length === maxLines - 1) break; }
  }
  if(cur) lines.push(cur);
  if(lines.length > maxLines) lines.length = maxLines;
  const last = lines.length - 1;
  if(last >= 0 && ctx.measureText(lines[last]).width > maxW){
    let s = lines[last];
    while(s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    lines[last] = s + '…';
  }
  return lines.length ? lines : [''];
}

// عرض كل عمود: بنقيس أطول كلام فيه وبنوزّع الباقي بالتناسب
function accPdfCols(ctx, data, avail){
  const n = data.cols.length || (data.rows[0] ? data.rows[0].cells.length : 1);
  const want = [];
  for(let i = 0; i < n; i++){
    ctx.font = accPdfFont(12, 800);
    let w = ctx.measureText(data.cols[i] || '').width;
    ctx.font = accPdfFont(12, 400);
    for(let r = 0; r < data.rows.length; r++){
      const cell = data.rows[r].cells[i];
      if(!cell) continue;
      w = Math.max(w, Math.min(ctx.measureText(cell.t).width, avail * 0.34));
    }
    want.push(w + 18 * ACC_PDF.scale);
  }
  const total = want.reduce((t, x) => t + x, 0) || 1;
  return want.map(x => x * avail / total);
}

// رسم صفحة واحدة. بترجّع الكانفس.
function accPdfPage(data, rows, pageNo, pageCount, colW, withHead){
  const S = ACC_PDF.scale, W = ACC_PDF.w * S, H = ACC_PDF.h * S, P = ACC_PDF.pad * S;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.textBaseline = 'middle';
  try{ c.direction = 'rtl'; }catch(e){}
  c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W, H);

  let y = P;

  if(withHead){
    const bh = 76 * S;
    c.fillStyle = data.band;
    accPdfRoundRect(P, c, y, W - P * 2, bh, 12 * S);
    c.textAlign = 'right';
    c.fillStyle = '#FFFFFF';
    c.font = accPdfFont(22, 900);
    c.fillText(data.title || '', W - P - 18 * S, y + (data.sub ? 30 : 38) * S);
    if(data.sub){
      c.font = accPdfFont(11.5, 400);
      c.fillText(data.sub, W - P - 18 * S, y + 54 * S);
    }
    c.textAlign = 'left';
    c.font = accPdfFont(15, 900);
    c.fillText('I FIX TEAM', P + 18 * S, y + 32 * S);
    c.font = accPdfFont(9.5, 400);
    c.fillText('FOR MOBILE SERVICES', P + 18 * S, y + 50 * S);
    y += bh + 14 * S;

    if(data.cards.length){
      const ch = 56 * S, gap = 10 * S;
      const cw = (W - P * 2 - gap * (data.cards.length - 1)) / data.cards.length;
      data.cards.forEach((card, i) => {
        // من اليمين لليسار عشان الترتيب يبقى زي الشاشة
        const x = W - P - cw - i * (cw + gap);
        c.fillStyle = card.bg;
        accPdfRoundRect(x, c, y, cw, ch, 10 * S);
        c.fillStyle = '#FFFFFF';
        c.textAlign = 'right';
        c.font = accPdfFont(10.5, 400);
        c.fillText(card.lbl, x + cw - 12 * S, y + 17 * S);
        c.font = accPdfFont(19, 900);
        c.fillText(card.num, x + cw - 12 * S, y + 39 * S);
      });
      y += ch + 14 * S;
    }
  }

  // رأس الجدول — بيتكرر في كل صفحة عشان الورقة تتقرا لوحدها
  const hh = 30 * S;
  c.fillStyle = '#101014';
  c.fillRect(P, y, W - P * 2, hh);
  c.fillStyle = '#FFFFFF';
  c.font = accPdfFont(11.5, 800);
  c.textAlign = 'center';
  let cx = W - P;
  for(let i = 0; i < colW.length; i++){
    c.fillText(data.cols[i] || '', cx - colW[i] / 2, y + hh / 2);
    cx -= colW[i];
  }
  y += hh;

  // الصفوف
  const lineH = 16 * S;
  rows.forEach((row, ri) => {
    const hgt = row._h;
    c.fillStyle = (ri % 2) ? '#F8FAFC' : '#FFFFFF';
    c.fillRect(P, y, W - P * 2, hgt);
    c.strokeStyle = '#E5E7EB'; c.lineWidth = Math.max(1, S * 0.6);
    c.beginPath(); c.moveTo(P, y + hgt); c.lineTo(W - P, y + hgt); c.stroke();
    let x2 = W - P;
    for(let i = 0; i < colW.length; i++){
      const cell = row.cells[i];
      if(cell){
        c.fillStyle = cell.c;
        c.font = accPdfFont(11.5, cell.b ? 800 : 400);
        c.textAlign = 'center';
        const lines = row._lines[i] || [''];
        const startY = y + hgt / 2 - (lines.length - 1) * lineH / 2;
        for(let L = 0; L < lines.length; L++){
          c.fillText(lines[L], x2 - colW[i] / 2, startY + L * lineH);
        }
      }
      x2 -= colW[i];
    }
    y += hgt;
  });

  // التذييل
  c.fillStyle = '#6B7280';
  c.font = accPdfFont(10, 400);
  c.textAlign = 'right';
  c.fillText('نظام I Fix Team لإدارة الصيانة', W - P, H - P / 2);
  c.textAlign = 'left';
  c.fillText('صفحة ' + pageNo + ' من ' + pageCount, P, H - P / 2);
  return cv;
}

// base64 → بايتات
function accB64Bytes(b64){
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ============================================================
// تركيب ملف الـ PDF بايت بايت
// ------------------------------------------------------------
// الملف بسيط: لكل صفحة صورة JPEG واحدة مفرودة على الورقة كلها.
// ⚠️ الـ PDF فيه جدول (xref) بمواقع كل جزء بالبايت. لو رقم واحد
//    غلط، الملف مابيفتحش خالص. عشان كده بنعدّ الطول مع كل إضافة
//    بدل ما نحسبه في الآخر.
// ⚠️ وبنحط JPEG جوه الملف مباشرة (DCTDecode) — الـ PDF بيفهم
//    الصيغة دي من نفسه، فمش محتاجين أي ضغط من عندنا.
// ============================================================
function accPdfBuild(pages){
  const chunks = []; let len = 0; const off = [];
  const raw = s => {
    const a = new Uint8Array(s.length);
    for(let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 0xFF;
    return a;
  };
  const put  = u => { chunks.push(u); len += u.length; };
  const puts = s => put(raw(s));
  const n = pages.length, objs = 2 + n * 3;

  puts('%PDF-1.4\n');
  off[1] = len; puts('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  const kids = [];
  for(let p = 0; p < n; p++) kids.push((3 + p * 3) + ' 0 R');
  off[2] = len;
  puts('2 0 obj\n<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>\nendobj\n');

  for(let p = 0; p < n; p++){
    const pg = 3 + p * 3, ct = pg + 1, im = pg + 2;
    off[pg] = len;
    puts(pg + ' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + ACC_PDF.w + ' ' + ACC_PDF.h + ']'
       + ' /Resources << /XObject << /Im0 ' + im + ' 0 R >> >> /Contents ' + ct + ' 0 R >>\nendobj\n');
    const cont = 'q ' + ACC_PDF.w + ' 0 0 ' + ACC_PDF.h + ' 0 0 cm /Im0 Do Q\n';
    off[ct] = len;
    puts(ct + ' 0 obj\n<< /Length ' + cont.length + ' >>\nstream\n' + cont + 'endstream\nendobj\n');
    off[im] = len;
    puts(im + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + pages[p].w + ' /Height ' + pages[p].h
       + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + pages[p].bytes.length + ' >>\nstream\n');
    put(pages[p].bytes);
    puts('\nendstream\nendobj\n');
  }

  const xref = len;
  let x = 'xref\n0 ' + (objs + 1) + '\n0000000000 65535 f \n';
  for(let i = 1; i <= objs; i++){
    x += ('0000000000' + off[i]).slice(-10) + ' 00000 n \n';
  }
  x += 'trailer\n<< /Size ' + (objs + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  puts(x);

  const out = new Uint8Array(len); let o = 0;
  chunks.forEach(u => { out.set(u, o); o += u.length; });
  return out;
}

// اسم ملف آمن (من غير رموز بتكسّر الحفظ)
function accPdfName(t){
  return (String(t || 'كشف').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'كشف') + '.pdf';
}

// ============================================================
// الزرار: بنبني الـ PDF وندّيه لشيت المشاركة
// ------------------------------------------------------------
// ⚠️⚠️ كله **متزامن** لحد نداء المشاركة. لو استنينا أي حاجة
//    (await) قبلها، الأيفون بيعتبر إن المشاركة مش جاية من ضغطة
//    المستخدم وبيرفضها. نفس درس الطباعة والموقع بالظبط.
// ============================================================
function accSavePdf(){
  const btn = document.getElementById('apsPrintBtn');
  const data = accPdfRead();
  if(!data || (!data.rows.length && !data.cols.length)){
    alert('مفيش حاجة نحوّلها PDF.');
    return;
  }

  try{
    const S = ACC_PDF.scale, W = ACC_PDF.w * S, H = ACC_PDF.h * S, P = ACC_PDF.pad * S;
    const meas = document.createElement('canvas').getContext('2d');
    const avail = W - P * 2;
    const colW = accPdfCols(meas, data, avail);

    // ارتفاع كل صف (سطر ولا سطرين) — بنحسبه مرة واحدة ونستعمله في التقسيم والرسم
    const lineH = 16 * S;
    data.rows.forEach(row => {
      let lines = 1;
      row._lines = [];
      for(let i = 0; i < colW.length; i++){
        const cell = row.cells[i];
        if(!cell){ row._lines.push(['']); continue; }
        meas.font = accPdfFont(11.5, cell.b ? 800 : 400);
        const L = accPdfWrap(meas, cell.t, colW[i] - 10 * S, 2);
        row._lines.push(L);
        lines = Math.max(lines, L.length);
      }
      row._h = Math.max(26 * S, lines * lineH + 10 * S);
    });

    // تقسيم الصفوف على الصفحات
    const headH = 76 * S + 14 * S + (data.cards.length ? 56 * S + 14 * S : 0);
    const tableH = 30 * S;
    const footH = P;
    const pagesRows = [];
    let cur = [], used = 0, first = true;
    const room = () => H - P - footH - tableH - (first ? headH : 0);
    data.rows.forEach(row => {
      if(used + row._h > room() && cur.length){
        pagesRows.push(cur); cur = []; used = 0; first = false;
      }
      cur.push(row); used += row._h;
    });
    pagesRows.push(cur);

    const pages = [];
    for(let i = 0; i < pagesRows.length; i++){
      const cv = accPdfPage(data, pagesRows[i], i + 1, pagesRows.length, colW, i === 0);
      const url = cv.toDataURL('image/jpeg', 0.92);
      pages.push({ w: cv.width, h: cv.height, bytes: accB64Bytes(url.split(',')[1]) });
    }

    const bytes = accPdfBuild(pages);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const name = accPdfName(data.title);

    // شيت المشاركة بتاع الأيفون — واتساب · حفظ في الملفات · طباعة
    try{
      if(navigator.canShare && typeof File === 'function'){
        const file = new File([blob], name, { type: 'application/pdf' });
        if(navigator.canShare({ files: [file] })){
          navigator.share({ files: [file], title: data.title || name })
            .catch(e => { if(e && e.name !== 'AbortError') console.warn('المشاركة اتلغت:', e); });
          return;
        }
      }
    }catch(e){ console.warn('المشاركة مش متاحة:', e); }

    // مفيش مشاركة؟ بننزّله ملف عادي
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => { try{ URL.revokeObjectURL(url); }catch(e){} }, 15000);
  }catch(e){
    console.error('بناء الـ PDF فشل:', e);
    alert('مقدرناش نعمل الـ PDF: ' + ((e && e.message) || e));
  }finally{
    if(btn) btn.disabled = false;
  }
}

// بنشيل الصندوق **والاستايل** مع بعض. لو سبنا الاستايل، قواعد
// الجدول والألوان بتاعة الكشف هتفضل واقعة على صفحة النظام.
function accClosePrintSheet(){
  var h = document.getElementById('accPrintSheet');    if(h) h.remove();
  var s = document.getElementById('accPrintSheetCss'); if(s) s.remove();
}

function accPrint(html, title){
  // 📅 لو فيه فترة مختارة، بنكتبها في رأس الورقة — عشان اللي
  //    ماسك الورقة يعرف هي بتغطي من إمتى لإمتى.
  if(ACC_PERIOD_LABEL) html = accStampPeriodHtml(html, ACC_PERIOD_LABEL);

  // 🍎 الأيفون والآيباد: مسار مختلف تماماً (شوف الشرح فوق)
  if(ACC_IS_IOS) return accPrintSheet(html, title);

  // إطار قديم من طباعة سابقة؟ نشيله عشان ما يتكدّسوش
  const old = document.getElementById('accPrintFrame');
  if(old) old.remove();

  const f = document.createElement('iframe');
  f.id = 'accPrintFrame';
  f.setAttribute('aria-hidden', 'true');
  f.title = title || 'print';
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
  document.body.appendChild(f);

  // ⚠️⚠️ الطباعة لازم تتنده **في نفس اللحظة** اللي المستخدم دس فيها.
  //
  //    الأيفون بيعتبر أي print() بيتأخر (setTimeout / انتظار
  //    تحميل) إنها "طباعة تلقائية" من الموقع، وبيطلّع رسالة:
  //        "This website has been blocked from automatically printing"
  //    وبيخليك تدوس Allow كل مرة.
  //
  //    تشبيه: كإنك طلبت حاجة من موظف، وبعدين اتلهيت ثانية، وبعدين
  //    قلت "هات" — هو مش عارف إنت اللي طلبت ولا حد تاني. لازم
  //    الطلب يبقى ملزّق بالضغطة.
  //
  //    عشان كده: مفيش setTimeout ومفيش انتظار خالص. الاستايل جوه
  //    الصفحة نفسها (<style>) فبيتقرا فوراً، وشكل الكشف بيطلع
  //    مظبوط. الخط الخارجي (Cairo/Tajawal) هو اللي ممكن ما يلحقش
  //    ينزّل، وساعتها بيطلع بخط النظام — والعربي بيبان كويس برضه.
  //    خط أقل جمالاً أرحم بكتير من رسالة إذن كل مرة.
  try{
    const d = f.contentWindow.document;
    d.open(); d.write(html); d.close();
    f.contentWindow.focus();
    f.contentWindow.print();
  }catch(e){
    console.error('الطباعة فشلت:', e);
    f.remove();
    alert('مقدرناش نفتح نافذة الطباعة. جرّب تاني.');
  }
}

function exportShopPdf(shop){
  const { entries, debit, credit, balance } = shopStatementRows(shop);
  const realCount = entries.filter(e => !e._carry).length;
  const rowsHtml = entries.map((e,i) => {
    const issue = stmtIssue(e);
    const color = stmtColor(e);
    const bb = stmtBroughtBy(e);     // 🛵
    // 📥 تاريخ الدخول — للأجهزة بس. الدفعة والخصم والرصيد السابق «—»
    const inDate = accFmtDT(stmtIntakeDate(e));
    return `
    <tr style="background:${e._carry ? '#FFFBEB' : (i%2 ? '#F8FAFC' : '#FFFFFF')};">
      <td>${inDate}</td>
      <td>${e._carry ? '—' : accFmtDT(stmtDate(e))}</td>
      <td style="text-align:right;">${stmtDescHtml(e)}</td>
      <td style="text-align:right; color:#475569;">${issue ? esc(issue) : '—'}</td>
      <td style="color:#475569;">${color ? esc(color) : '—'}</td>
      <td style="color:#475569;">${bb ? esc(bb) : '—'}</td>
      <td style="color:#B45309; font-weight:800;">${isDebitLike(e) ? (e.amount||0).toLocaleString('en-EG') : '—'}</td>
      <td style="color:#16A34A; font-weight:800;">${!isDebitLike(e) ? (e.amount||0).toLocaleString('en-EG') : '—'}</td>
    </tr>`;
  }).join('');

  accPrint(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
  <title>كشف حساب — ${esc(shop)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    /* خط النظام مكتوب صراحةً بعد الخط الخارجي — عشان لو ما لحقش
       ينزّل، العربي يطلع بخط نضيف مش بخط افتراضي وحش */
    body{font-family:'Tajawal',-apple-system,'SF Arabic','Segoe UI',Tahoma,sans-serif; color:#1A2332; margin:0; padding:28px;}
    .head{background:linear-gradient(135deg,#E8321E,#C22513); color:#fff; border-radius:14px; padding:22px 26px; display:flex; justify-content:space-between; align-items:center;}
    .head h1{font-family:'Cairo',-apple-system,'SF Arabic',sans-serif; font-size:26px; margin:0;}
    .head .sub{font-size:13px; opacity:.9; margin-top:4px;}
    .head .brand{font-family:'Cairo',-apple-system,'SF Arabic',sans-serif; font-weight:900; font-size:18px; text-align:left;}
    .totals{display:flex; gap:14px; margin:18px 0;}
    .tcard{flex:1; border-radius:12px; padding:14px 18px; color:#fff;}
    .tcard .lbl{font-size:13px; opacity:.92;}
    .tcard .num{font-family:'Cairo',-apple-system,'SF Arabic',sans-serif; font-size:26px; font-weight:900; margin-top:2px;}
    table{width:100%; border-collapse:collapse; font-size:13px;}
    th{background:#101014; color:#fff; padding:11px 6px; font-size:12.5px;}
    td{padding:10px 6px; border-bottom:1px solid #E5E7EB; text-align:center;}
    .foot{margin-top:18px; font-size:12px; color:#6B7280; display:flex; justify-content:space-between;}
    /* الجدول بقى تمن أعمدة (الدخول + الخروج + العطل + اللون + المندوب) — الأفقي ضروري */
    @page{ size:A4 landscape; margin:10mm; }
    @media print{ body{padding:12px;} }
  </style></head><body>
    <div class="head">
      <div><h1>كشف حساب: ${esc(shop)}</h1><div class="sub">تاريخ الكشف: ${new Date().toLocaleDateString('ar-EG')} — ${new Date().toLocaleTimeString('ar-EG')}</div></div>
      <div class="brand">I FIX TEAM<br><small style="font-weight:400;font-size:11px;">FOR MOBILE SERVICES</small></div>
    </div>
    <div class="totals">
      <div class="tcard" style="background:#B45309;"><div class="lbl">إجمالي الآجل (عليه)</div><div class="num">${debit.toLocaleString('en-EG')} ج.م</div></div>
      <div class="tcard" style="background:#16A34A;"><div class="lbl">إجمالي المدفوع (له)</div><div class="num">${credit.toLocaleString('en-EG')} ج.م</div></div>
      <div class="tcard" style="background:${balance>0 ? '#DC2626' : '#2563EB'};"><div class="lbl">المتبقي على المحل</div><div class="num">${balance.toLocaleString('en-EG')} ج.م</div></div>
    </div>
    <table>
      <tr><th style="width:12%;">تاريخ الدخول</th><th style="width:12%;">تاريخ الخروج</th><th style="width:21%;">البيان</th><th style="width:17%;">العطل</th><th style="width:8%;">اللون</th><th style="width:10%;">${esc(ACC_BB_LABEL)}</th><th>عليه (آجل)</th><th>له (دفعات)</th></tr>
      ${rowsHtml || '<tr><td colspan="8">مفيش حركات متسجلة</td></tr>'}
    </table>
    <div class="foot"><span>نظام I Fix Team لإدارة الصيانة</span><span>عدد الحركات: ${realCount}</span></div>
  </body></html>`, 'كشف حساب — ' + shop);
}


// ============================================================
// 📅 فترة الطباعة والتصدير (PDF و Excel)
// ------------------------------------------------------------
// 🧠 الفكرة بالبلدي:
//    قبل كده زرار PDF أو Excel كان بيطبع **كل حاجة من أول يوم**.
//    دلوقتي أول ما تدوس، بتطلع شاشة صغيرة بتسألك:
//        «عايز تطبع من إمتى لإمتى؟»
//    وفيها اختيارات سريعة (النهاردة · آخر ٧ أيام · الشهر ده ·
//    الشهر اللي فات · كل الفترة) أو تكتب «من» و«إلى» بإيدك.
//
// 📍 بتشتغل في مكانين:
//    ١) كشف المحل في «الحسابات» — PDF و Excel.
//       عند المحاسب والأدمن والديسباتشر والمالك (الديسباتشر
//       والمالك عندهم PDF بس — زي ما هو).
//    ٢) «تم التسليم — بانتظار الدفع» — PDF و Excel (المحاسب).
//       هنا الفترة بتتحسب على **تاريخ التسليم**.
//
// ⚠️ ليه كله هنا في accounts.js ومش في الداشبورد؟
//    لأن الملف ده متحمّل في التلات صفحات (المحاسب · الديسباتشر ·
//    المالك)، وكل طباعة PDF في النظام بتعدّي على accPrint اللي
//    هنا. فتعديل واحد بيوصل للكل، ومفيش نسختين يختلفوا عن بعض.
//
// ⚠️ «تم التسليم بانتظار الدفع» زرايره مكتوبة في dashboard.html.
//    بدل ما نلمس الداشبورد، بنركّب «مدخل» قدام دالتين التصدير
//    بتوعه (accInstallUnpaidRange تحت): الزرار نفسه ما اتغيّرش،
//    بس لما يتداس بيعدّي علينا الأول، نسألك عن الفترة، ونبعتله
//    الأجهزة اللي جوه الفترة بس.
//
// 🍎 الأيفون: الطباعة لازم تحصل **في نفس لحظة الضغطة** (شوف
//    الشرح عند accPrint). عشان كده زرار «اطبع» في شاشة الفترة
//    بيندَه الطباعة على طول من غير أي انتظار — الضغطة دي نفسها
//    هي «ضغطة المستخدم» اللي الأيفون عايزها.
// ============================================================
var ACC_RANGE = null;          // { from:Date|null, to:Date|null } — أو null = كل الفترة
var ACC_PERIOD_LABEL = '';     // «الفترة: من … إلى …» — بيتكتب في رأس الـPDF
var ACC_RD = null;             // الشاشة المفتوحة دلوقتي (إعداداتها)
var ACC_RANGE_PREF_KEY = 'ifix_export_range';
var ACC_BASIS_PREF_KEY = 'ifix_export_basis';   // 'in' أو 'out' — آخر اختيار على الجهاز ده

function accYmd(d){
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function accDayStart(s){ if(!s) return null; const d = new Date(s + 'T00:00:00'); return isNaN(d) ? null : d; }
function accDayEnd(s){   if(!s) return null; const d = new Date(s + 'T23:59:59.999'); return isNaN(d) ? null : d; }
function accFmtDay(d){ try{ return d.toLocaleDateString('ar-EG'); }catch(e){ return accYmd(d); } }

// التاريخ ده جوه الفترة؟ (من غير فترة = أي حاجة تعدّي)
function accInRange(iso, r){
  if(!r) return true;
  const tt = new Date(iso || 0).getTime();
  if(!tt) return false;
  if(r.from && tt < r.from.getTime()) return false;
  if(r.to && tt > r.to.getTime()) return false;
  return true;
}

function accRangeLabel(r){
  if(!r) return '';
  if(r.cycle){
    const c = accCycleSplit(r.shop);
    return 'الفترة: الدورة الحالية — من ' + (c && c.at ? accFmtDay(c.at) : 'أولها') + ' لحد النهاردة';
  }
  // «حسب تاريخ الدخول/الخروج» — بيتكتب على الورقة نفسها عشان اللي
  // ماسكها يعرف الفترة دي محسوبة على أنهي تاريخ
  const b = r.basis === 'in' ? ' (حسب تاريخ الدخول)' : (r.basis === 'out' ? ' (حسب تاريخ الخروج)' : '');
  if(r.from && r.to) return 'الفترة' + b + ': من ' + accFmtDay(r.from) + ' إلى ' + accFmtDay(r.to);
  if(r.from) return 'الفترة' + b + ': من ' + accFmtDay(r.from) + ' لحد النهاردة';
  if(r.to)   return 'الفترة' + b + ': من الأول لحد ' + accFmtDay(r.to);
  return '';
}

// نص سطر «الرصيد السابق» في الكشف
function accCarryText(e){
  let day = '';
  try{ day = new Date(e._carryFrom).toLocaleDateString('ar-EG'); }catch(x){}
  return 'رصيد سابق قبل ' + day + (e.type === 'credit' ? ' (لصالح المحل)' : '');
}

// بنكتب الفترة جوه سطر التاريخ اللي تحت العنوان (.sub).
// لو التقرير مفيهوش السطر ده، بنحط سطر لوحده أول الصفحة.
function accStampPeriodHtml(html, label){
  const s = String(html || '');
  const safe = esc(label);
  if(s.indexOf('class="sub">') !== -1) return s.replace('class="sub">', 'class="sub">📅 ' + safe + ' — ');
  return s.replace(/<body([^>]*)>/i, '<body$1><div style="font-weight:800;margin:0 0 12px;">📅 ' + safe + '</div>');
}

// بنشغّل حاجة والفترة «مفعّلة» — وبعدها بنرجّعها زي ما كانت، حتى لو حصل خطأ
function accWithRange(r, fn){
  const prevR = ACC_RANGE, prevL = ACC_PERIOD_LABEL;
  ACC_RANGE = r || null;
  ACC_PERIOD_LABEL = accRangeLabel(r);
  try{ return fn(); }
  finally{ ACC_RANGE = prevR; ACC_PERIOD_LABEL = prevL; }
}

// ============================================================
// 📊 كتابة الفترة في ملف الإكسل
// ------------------------------------------------------------
// دوال الإكسل مكتوبة في الداشبورد، وكلها بتكتب في الخانة A2 سطر
// «I Fix Team … تاريخ الكشف». عايزين نزوّد عليه «الفترة: …».
//
// 🧠 بالبلدي: بنقف على باب «اعمل ورقة جديدة» لحظة واحدة بس.
//    أول ما الداشبورد يعمل الورقة، بنعلّم عليها: «قبل ما
//    تتحفظ، زوّد الفترة في السطر التاني». وبعدين بنمشي من على
//    الباب على طول — فأي إكسل تاني في النظام مش بيتأثر.
//
// ⚠️ لو أي حاجة هنا فشلت، الملف بيطلع عادي من غير سطر الفترة —
//    مفيش حاجة بتقع.
// ============================================================
function accExcelStamped(label, fn){
  if(!label || typeof ExcelJS === 'undefined' || !ExcelJS.Workbook) return fn();
  const P = ExcelJS.Workbook.prototype;
  const orig = P && P.addWorksheet;
  if(typeof orig !== 'function') return fn();
  P.addWorksheet = function(){
    const ws = orig.apply(this, arguments);
    try{
      const x = this.xlsx;
      if(x && !x.__accStamped && typeof x.writeBuffer === 'function'){
        x.__accStamped = true;
        const write0 = x.writeBuffer;
        x.writeBuffer = function(){
          try{
            const c = ws.getCell('A2');
            c.value = (c.value ? String(c.value) + ' — ' : '') + label;
          }catch(e){ console.warn('سطر الفترة في الإكسل:', e); }
          return write0.apply(x, arguments);
        };
      }
    }catch(e){ console.warn('سطر الفترة في الإكسل:', e); }
    return ws;
  };
  // الداشبورد بيعمل الورقة في أول سطر من دالته (قبل أي انتظار)،
  // فبنرجّع الباب زي ما كان على طول بعد النداء
  try{ return fn(); }
  finally{ P.addWorksheet = orig; }
}

// ---------- آخر اختيار — بيتحفظ على الجهاز عشان المرة الجاية ----------
function accRangePrefGet(){
  try{ return JSON.parse(localStorage.getItem(ACC_RANGE_PREF_KEY) || 'null') || { mode:'all' }; }
  catch(e){ return { mode:'all' }; }
}
function accRangePrefSet(p){
  try{ localStorage.setItem(ACC_RANGE_PREF_KEY, JSON.stringify(p)); }catch(e){}
}

// ============================================================
// 🔄 «من أول الدورة الحالية» — زي الاستيدج (customers.html)
// ------------------------------------------------------------
// 🧸 بالبلدي: «الدورة» = صفحة في كشكول حساب المحل. أول ما الحساب
//    يبقى صفر (المحل سدّد كل اللي عليه) وبعدين ياخد جهاز آجل تاني →
//    بتبدأ صفحة جديدة. الزرار ده بيطبع **الصفحة الحالية بس** — الأجهزة
//    اللي على المحل دلوقتي ودفعاتها — من غير اللي اتسدّد قبل كده.
//    وبيبقى **متختار لوحده** كل ما تفتح كشف محل.
//
// ⚠️ بنمشي على **ترتيب تسجيل الحركات** (وقت التسجيل date، والدفتر
//    محفوظ الأحدث الأول) — مش تاريخ خروج الجهاز. ليه؟ دفعة وجهاز في
//    نفس اليوم: لو رتّبنا بالخروج ممكن الجهاز ييجي قبل الدفعة، فالحساب
//    «مايوصلش صفر» والدورة الجديدة ماتتعرفش.
// ⚠️ ومش بنقطع بالـ«يوم»: بنقطع عند الحركة نفسها — فالدفعة القديمة
//    اللي في نفس يوم أول جهاز جديد مابتدخلش.
// ⚠️ المحل كان دافع زيادة قبل الدورة (رصيده بالسالب) → سطر «رصيد سابق
//    (لصالح المحل)» في أول الكشف، عشان المتبقي يطلع صح.
// ============================================================
function accCycleSplit(shop){
  if(!shop || !Array.isArray(ledger)) return null;
  const n = ledger.length;
  const rows = [];
  ledger.forEach((e, i) => { if((e.shop||'بدون محل') === shop) rows.push({ e, i }); });
  if(!rows.length) return null;
  // الأقدم الأول: بوقت التسجيل، ولو نفس الوقت → الأبعد في الدفتر أقدم (الجديد بيتحط أوله)
  rows.sort((a, b) => {
    const ta = new Date(a.e.date || 0).getTime() || 0, tb = new Date(b.e.date || 0).getTime() || 0;
    return (ta - tb) || (b.i - a.i);
  });
  let start = -1, bal = 0, before = 0;
  rows.forEach((x, k) => {
    const a = Number(x.e.amount) || 0;
    const debt = isDebitLike(x.e);
    if(debt && a > 0 && bal <= 0.5){ start = k; before = bal; }   // الحساب كان خالص وجه دين جديد
    bal += debt ? a : -a;
  });
  if(start < 0) return null;
  const d = new Date(rows[start].e.date || 0);
  return { list: rows.slice(start).map(x => x.e), before, at: isNaN(d.getTime()) ? null : d, n: rows.length - start };
}

// الاختيارات السريعة → تاريخ «من» و«إلى» (كنص yyyy-mm-dd)
var ACC_RANGE_PRESETS = [
  { k:'all',   n:'كل الفترة' },
  { k:'today', n:'النهاردة' },
  { k:'week',  n:'آخر ٧ أيام' },
  { k:'month', n:'الشهر ده' },
  { k:'last',  n:'الشهر اللي فات' },
];
function accPresetDates(k){
  const now = new Date();
  const today = accYmd(now);
  if(k === 'today') return { from: today, to: today };
  if(k === 'week'){ const s = new Date(now); s.setDate(s.getDate() - 6); return { from: accYmd(s), to: today }; }
  if(k === 'month') return { from: accYmd(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  if(k === 'last'){
    return { from: accYmd(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
             to:   accYmd(new Date(now.getFullYear(), now.getMonth(), 0)) };
  }
  return { from: '', to: '' };
}

// الاستايل — بيتحقن مرة واحدة. ألوان الثيم مع قيم احتياطية،
// عشان الشاشة تطلع مظبوطة في الصفحات التلاتة (كل صفحة بتسمّي
// ألوانها بأسامي مختلفة شوية).
function accRangeCss(){
  if(document.getElementById('accRangeCss')) return;
  const st = document.createElement('style');
  st.id = 'accRangeCss';
  st.textContent =
    '#accRangeOv{position:fixed;inset:0;z-index:2147483000;background:rgba(10,16,24,.55);'
    + 'display:flex;align-items:center;justify-content:center;padding:16px;}'
    + '#accRangeOv .arg-card{background:var(--surface,#fff);color:var(--ink,#1A2332);border-radius:18px;'
    + 'width:100%;max-width:420px;max-height:90vh;overflow-y:auto;padding:18px 18px 14px;'
    + 'box-shadow:0 22px 60px rgba(0,0,0,.35);font-family:inherit;}'
    + '#accRangeOv .arg-h{font-family:Cairo,inherit;font-weight:900;font-size:17px;line-height:1.5;}'
    + '#accRangeOv .arg-s{font-size:12.5px;color:var(--muted,#64748B);margin:3px 0 14px;}'
    + '#accRangeOv .arg-chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px;}'
    + '#accRangeOv .arg-chip{border:1.5px solid var(--border,#E2E8F0);background:var(--surface-2,#F8FAFC);'
    + 'color:var(--ink,#1A2332);border-radius:20px;padding:8px 13px;font:700 13px/1.2 inherit;cursor:pointer;}'
    + '#accRangeOv .arg-chip.on{background:#E8321E;border-color:#E8321E;color:#fff;}'
    + '#accRangeOv .arg-basis{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;}'
    + '#accRangeOv .arg-bbtn{border:1.5px solid var(--border,#E2E8F0);background:var(--surface-2,#F8FAFC);'
    + 'color:var(--ink,#1A2332);border-radius:12px;padding:11px 8px;font:800 13.5px/1.3 inherit;cursor:pointer;}'
    + '#accRangeOv .arg-bbtn.on{background:#1F3864;border-color:#1F3864;color:#fff;}'
    + '#accRangeOv .arg-lbl{font-size:12px;font-weight:700;color:var(--muted,#64748B);margin:0 0 6px;}'
    + '#accRangeOv .arg-dates{display:grid;grid-template-columns:1fr 1fr;gap:10px;}'
    + '#accRangeOv .arg-dates label{font-size:12px;font-weight:700;color:var(--muted,#64748B);display:block;}'
    + '#accRangeOv .arg-dates input{display:block;width:100%;box-sizing:border-box;margin-top:5px;'
    + 'border:1.5px solid var(--border,#E2E8F0);background:var(--surface-2,#F8FAFC);color:var(--ink,#1A2332);'
    + 'border-radius:10px;padding:10px;font-family:inherit;font-size:16px;}'
    + '#accRangeOv .arg-info{margin:14px 0 12px;padding:10px 12px;border-radius:10px;font-size:13px;'
    + 'font-weight:700;line-height:1.7;background:var(--surface-2,#F1F5F9);color:var(--ink,#1A2332);}'
    + '#accRangeOv .arg-info.bad{background:#FEF2F2;color:#B91C1C;}'
    + '#accRangeOv .arg-go{width:100%;border:none;border-radius:12px;padding:14px;font:900 15px/1 inherit;'
    + 'cursor:pointer;color:#fff;background:#16A34A;}'
    + '#accRangeOv .arg-go.pdf{background:#DC2626;}'
    + '#accRangeOv .arg-go:disabled{opacity:.45;cursor:not-allowed;}'
    + '#accRangeOv .arg-x{width:100%;margin-top:8px;border:none;background:none;padding:11px;'
    + 'font:700 14px/1 inherit;color:var(--muted,#64748B);cursor:pointer;}';
  document.head.appendChild(st);
}

// ============================================================
// فتح شاشة «اختار الفترة»
// ------------------------------------------------------------
// opts = {
//   title : العنوان فوق
//   fmt   : 'pdf' أو 'xlsx' — بيغيّر كلام ولون الزرار بس
//   unit  : «حركة» أو «جهاز» — للعدّاد
//   count : (فترة) => عدد اللي هيطلع — عشان نقولك قبل ما تطبع
//   run   : (فترة) => بيطبع/بيصدّر فعلاً
// }
// ============================================================
function accRangeOpen(opts){
  accRangeCss();
  accRangeClose();
  ACC_RD = opts;
  const pref = accRangePrefGet();
  let mode = pref.mode || 'all';
  if(mode === 'cycle') mode = 'all';
  let dates = mode === 'custom' ? { from: pref.from || '', to: pref.to || '' } : accPresetDates(mode);
  if(!ACC_RANGE_PRESETS.some(p => p.k === mode) && mode !== 'custom'){ mode = 'all'; dates = { from:'', to:'' }; }
  // 🔄 كشف محل وليه دورة → «من أول الدورة الحالية» متختار لوحده (زي الاستيدج)
  const cyc = opts.cycleShop ? accCycleSplit(opts.cycleShop) : null;
  ACC_RD.cycle = cyc;
  if(cyc){ mode = 'cycle'; dates = { from: cyc.at ? accYmd(cyc.at) : '', to: '' }; }
  ACC_RD.mode = mode;
  // 📥📤 «حسب أنهي تاريخ» — بيظهر بس لو الشاشة اللي فاتحاها طلبته
  //    (كشف المحل). شاشة «بانتظار الدفع» مالهاش دعوة بيه.
  if(opts.basis){
    let b = 'out';
    try{ const v = localStorage.getItem(ACC_BASIS_PREF_KEY); if(v === 'in' || v === 'out') b = v; }catch(e){}
    ACC_RD.basisSel = b;
  }

  const isPdf = opts.fmt !== 'xlsx';
  const goTxt = isPdf
    ? (ACC_IOS_APP ? '📄 اعمل PDF' : '🖨️ اطبع / احفظ PDF')
    : '📊 نزّل ملف Excel';

  const ov = document.createElement('div');
  ov.id = 'accRangeOv';
  ov.setAttribute('dir', 'rtl');
  ov.onclick = e => { if(e.target === ov) accRangeClose(); };
  ov.innerHTML =
    '<div class="arg-card">'
    + '<div class="arg-h">📅 ' + esc(opts.title || 'اختار الفترة') + '</div>'
    + '<div class="arg-s">عايز تطبع من إمتى لإمتى؟</div>'
    + (opts.basis
        ? '<div class="arg-lbl">الفترة دي محسوبة على:</div>'
          + '<div class="arg-basis">'
            + '<button type="button" class="arg-bbtn" data-b="in" onclick="accRangeBasis(\'in\')">📥 تاريخ الدخول</button>'
            + '<button type="button" class="arg-bbtn" data-b="out" onclick="accRangeBasis(\'out\')">📤 تاريخ الخروج</button>'
          + '</div>'
        : '')
    + '<div class="arg-chips">'
      + (cyc ? '<button type="button" class="arg-chip" data-k="cycle" onclick="accRangePick(\'cycle\')">🔄 من أول الدورة الحالية'
               + (cyc.at ? ' · ' + esc(accFmtDay(cyc.at)) : '') + '</button>' : '')
      + ACC_RANGE_PRESETS.map(p =>
          '<button type="button" class="arg-chip" data-k="' + p.k + '" onclick="accRangePick(\'' + p.k + '\')">' + p.n + '</button>'
        ).join('')
    + '</div>'
    + '<div class="arg-dates">'
      + '<label>من<input type="date" id="argFrom" value="' + esc(dates.from) + '" onchange="accRangeCustom()"></label>'
      + '<label>إلى<input type="date" id="argTo" value="' + esc(dates.to) + '" onchange="accRangeCustom()"></label>'
    + '</div>'
    + '<div class="arg-info" id="argInfo"></div>'
    + '<button type="button" class="arg-go' + (isPdf ? ' pdf' : '') + '" id="argGo" onclick="accRangeGo()">' + goTxt + '</button>'
    + '<button type="button" class="arg-x" onclick="accRangeClose()">إلغاء</button>'
    + '</div>';
  document.body.appendChild(ov);
  accRangeSync();
}

function accRangeClose(){
  const ov = document.getElementById('accRangeOv');
  if(ov) ov.remove();
}

// دوست على اختيار سريع → بنملا «من» و«إلى» بتواريخه
function accRangePick(k){
  if(!ACC_RD) return;
  ACC_RD.mode = k;
  const d = (k === 'cycle')
    ? { from: (ACC_RD.cycle && ACC_RD.cycle.at) ? accYmd(ACC_RD.cycle.at) : '', to: '' }   // للعرض بس — الطباعة بتقطع عند الحركة نفسها
    : accPresetDates(k);
  const f = document.getElementById('argFrom'), t2 = document.getElementById('argTo');
  if(f) f.value = d.from;
  if(t2) t2.value = d.to;
  accRangeSync();
}

// دوست «تاريخ الدخول» أو «تاريخ الخروج»
function accRangeBasis(b){
  if(!ACC_RD || !ACC_RD.basis) return;
  ACC_RD.basisSel = (b === 'in') ? 'in' : 'out';
  try{ localStorage.setItem(ACC_BASIS_PREF_KEY, ACC_RD.basisSel); }catch(e){}
  accRangeSync();
}

// كتبت تاريخ بإيدك → بقى «فترة مخصوصة»
function accRangeCustom(){
  if(!ACC_RD) return;
  ACC_RD.mode = 'custom';
  accRangeSync();
}

// الفترة اللي على الشاشة دلوقتي → { from, to } أو null (كل الفترة)
function accRangeRead(){
  if(ACC_RD && ACC_RD.mode === 'cycle' && ACC_RD.cycle && ACC_RD.cycleShop){
    return { cycle: true, shop: ACC_RD.cycleShop, from: null, to: null, basis: ACC_RD.basisSel || 'out' };
  }
  const fs = ((document.getElementById('argFrom') || {}).value || '').trim();
  const ts = ((document.getElementById('argTo') || {}).value || '').trim();
  if(!fs && !ts) return null;
  let from = accDayStart(fs), to = accDayEnd(ts);
  // كاتب «من» بعد «إلى» بالغلط؟ بنقلبهم بدل ما نطلّع ورقة فاضية
  if(from && to && from > to){
    const f2 = accDayStart(ts), t3 = accDayEnd(fs);
    from = f2; to = t3;
  }
  if(!(from || to)) return null;
  const r = { from, to };
  if(ACC_RD && ACC_RD.basis) r.basis = ACC_RD.basisSel || 'out';
  return r;
}

// بنحدّث الشاشة: الاختيار الملوّن + «هيطلع كام حاجة»
function accRangeSync(){
  if(!ACC_RD) return;
  document.querySelectorAll('#accRangeOv .arg-chip').forEach(b => {
    b.classList.toggle('on', b.getAttribute('data-k') === ACC_RD.mode);
  });
  document.querySelectorAll('#accRangeOv .arg-bbtn').forEach(b => {
    b.classList.toggle('on', b.getAttribute('data-b') === ACC_RD.basisSel);
  });
  const r = accRangeRead();
  const info = document.getElementById('argInfo');
  const go = document.getElementById('argGo');
  let n = -1;
  try{ n = ACC_RD.count ? ACC_RD.count(r) : -1; }catch(e){ console.warn('عدّ الفترة:', e); }
  const unit = ACC_RD.unit || 'حركة';
  const period = r ? accRangeLabel(r) : 'كل الفترة — من أول يوم';
  if(info){
    if(n === 0){
      info.className = 'arg-info bad';
      info.textContent = '⚠️ مفيش ولا ' + unit + ' في الفترة دي — اختار فترة تانية';
    } else {
      info.className = 'arg-info';
      info.textContent = '📅 ' + period + (n > 0 ? ' · هيطلع ' + n + ' ' + unit : '');
    }
  }
  if(go) go.disabled = (n === 0);
}

// «اطبع» / «نزّل»
// ⚠️⚠️ متزامن بالكامل — مفيش await قبل الطباعة. الأيفون محتاج
//    الطباعة تتنده في نفس لحظة الضغطة (شوف الشرح عند accPrint).
function accRangeGo(){
  if(!ACC_RD) return;
  const r = accRangeRead();
  const opts = ACC_RD;
  accRangePrefSet(opts.mode === 'custom'
    ? { mode:'custom',
        from: (document.getElementById('argFrom') || {}).value || '',
        to:   (document.getElementById('argTo') || {}).value || '' }
    : { mode: (opts.mode === 'cycle') ? 'all' : (opts.mode || 'all') });
  // بنقفل الشاشة الأول — عشان متبانش فوق الكشف ولا تتطبع معاه
  accRangeClose();
  ACC_RD = null;
  try{ opts.run(r); }
  catch(e){
    console.error('الطباعة بالفترة فشلت:', e);
    alert('مقدرناش نطبع: ' + ((e && e.message) || e));
  }
}

// Escape بيقفل الشاشة
document.addEventListener('keydown', e => { if(e.key === 'Escape') accRangeClose(); });

// ============================================================
// ١) كشف المحل — زرار PDF و Excel في «الحسابات»
// ============================================================
function accRangeShop(fmt, shop){
  const isX = fmt === 'xlsx';
  if(isX && typeof exportShopExcel !== 'function'){ alert('تصدير Excel مش متاح في الصفحة دي'); return; }
  accRangeOpen({
    title: (isX ? 'Excel — ' : 'كشف PDF — ') + shop,
    fmt: fmt,
    unit: 'حركة',
    basis: true,     // 📥📤 اعرض «حسب تاريخ الدخول / الخروج»
    cycleShop: shop, // 🔄 «من أول الدورة الحالية»
    count: r => accWithRange(r, () => shopStatementRows(shop).entries.filter(e => !e._carry).length),
    run: r => accWithRange(r, () => isX
      ? accExcelStamped(accRangeLabel(r), () => exportShopExcel(shop))
      : exportShopPdf(shop))
  });
}

// ============================================================
// ٢) «تم التسليم — بانتظار الدفع» (في dashboard.html)
// ------------------------------------------------------------
// بنلفّ دالتين التصدير بتوع الداشبورد: الزرار بيندَه نفس الاسم،
// فبيوصل لينا الأول، ولما تختار الفترة بنبعت للدالة الأصلية
// الأجهزة اللي **اتسلّمت** جوه الفترة بس.
//
// ⚠️ بنتركّب بعد ما الصفحة تخلص تحميل (الداشبورد بيعرّف الدوال
//    بعد الملف ده). في صفحة الديسباتشر والمالك الدوال مش موجودة
//    أصلاً — فمفيش حاجة بتحصل.
// ============================================================
function accUnpaidDate(d){
  try{
    const dd = (typeof deliveredDateOf === 'function') ? deliveredDateOf(d) : null;
    return dd || (d && d.intakeDate) || null;
  }catch(e){ return d && d.intakeDate; }
}
function accUnpaidFilter(list, r){
  if(!r) return list.slice();
  return list.filter(d => accInRange(accUnpaidDate(d), r));
}

function accInstallUnpaidRange(){
  [['exportDeliveredUnpaidExcel', 'xlsx'], ['exportDeliveredUnpaidPdf', 'pdf']].forEach(([name, fmt]) => {
    const orig = window[name];
    if(typeof orig !== 'function' || orig.__accRange) return;
    const wrapped = function(list){
      // من غير قايمة؟ (نداء قديم من مكان تاني) → زي ما كان بالظبط
      if(!Array.isArray(list)) return orig.apply(this, arguments);
      const src = list.slice();   // صورة من القايمة لحظة الضغط
      accRangeOpen({
        title: (fmt === 'xlsx' ? 'Excel' : 'PDF') + ' — تم التسليم بانتظار الدفع',
        fmt: fmt,
        unit: 'جهاز',
        count: r => accUnpaidFilter(src, r).length,
        run: r => {
          const sub = accUnpaidFilter(src, r);
          return accWithRange(r, () => fmt === 'xlsx'
            ? accExcelStamped(accRangeLabel(r), () => orig.call(window, sub))
            : orig.call(window, sub));
        }
      });
    };
    wrapped.__accRange = true;
    window[name] = wrapped;
  });
}
document.addEventListener('DOMContentLoaded', accInstallUnpaidRange);
window.addEventListener('load', accInstallUnpaidRange);
