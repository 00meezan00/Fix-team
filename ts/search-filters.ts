/* ============================================================
   I Fix Team — فلاتر البحث (الخانات البيضاوية تحت أي بحث)
   ------------------------------------------------------------
   🧠 بالبلدي:
      تحت كل خانة بحث بيظهر صف واحد صغير بيتحرك بالعرض:

        📅 تاريخ · موديل · اسم · محل · رقم · عطل · سريال

      • دوسة على «اسم» مثلاً = البحث يدوّر في اسم العميل بس.
        تقدر تختار أكتر من واحد (اسم + محل). ولا حاجة متختارة =
        البحث العادي بتاع الصفحة زي ما هو بالظبط.
      • دوسة على 📅 = تختار يوم. أول ما تبدأ تختار (أو بعد ما
        تختار) بيظهر جنبها خانات صغيرة:
            إلى    = لو عايز فترة (من يوم لـ يوم) مش يوم واحد
            دخول   = تاريخ استلام الجهاز   (الافتراضي)
            تحديث  = تاريخ آخر تعديل على الجهاز
        وغير كده الخانات دي مستخبية.
        و ✕ بتشيل التاريخ (الاتنين).
        «إلى» فاضية = يوم واحد بس. ولو اخترت «إلى» قبل «من»
        بنبدّلهم لوحدنا — مفيش فترة بالمقلوب.

   الاستخدام من أي صفحة:
       IFixFilters.watch(['columnSearch', 'q', ...]);   // بيركّب الصف لوحده
       IFixFilters.match('q', device, query, baseMatch)  // true / false
       IFixFilters.active('q')   // فيه تاريخ متحدد؟ (عشان نعرض نتايج حتى من غير كلام)
       IFixFilters.reset('q')    // يرجّع كل حاجة للأول

   ⚠️ الحالة متخزّنة باسم الخانة (id) مش بالعنصر نفسه — لأن فيه
      شاشات بتعيد رسم خانة البحث من الأول (زي مراجعة قطع الغيار)،
      ولو اتخزّنت على العنصر كانت هتضيع مع كل رسمة.
   ⚠️ الملف مستقل تماماً: مبيعتمدش على أي متغيّر من الصفحة.
      بيقرا الجهاز بأسماء النظام (customerName…) أو بالأسماء
      المختصرة (customer…) — الاتنين شغالين.

   🟦 (٢٠٢٦-١٠-٢١) بقى TypeScript (ts/search-filters.ts → search-filters.js)
      🧸 نفس الكود بالحرف — اتزوّد بس «ورق» بيقول نوع كل حاجة
      (نص · رقم · جهاز …). المترجم بيشيل الورق ده والمتصفح بياخد
      نفس الـ js القديم بالظبط.
   ============================================================ */
// 🏷️ الأنواع — بتختفي بعد الترجمة
/** حالة الفلاتر لخانة بحث واحدة */
interface FilterState {
  /** الخانات المتعلّمة: model · name · shop · phone · issue · serial */
  f: Record<string, boolean>;
  /** من يوم (YYYY-MM-DD) — فاضي = مفيش تاريخ */
  date: string;
  /** لحد يوم — فاضي = يوم واحد بس */
  to: string;
  /** in = تاريخ الدخول · up = آخر تحديث */
  mode: string;
  picking: boolean;
}
interface FilterOpts { onChange?: () => void; }
/** خانة البحث + الصف اللي متركّب تحتها */
type FilterInput = HTMLElement & { __ifxBar?: HTMLElement };
interface IFixFiltersApi {
  watch(ids: string[] | null | undefined, opts?: Record<string, FilterOpts>): void;
  attach(inp: string | HTMLElement | null, opts?: FilterOpts): void;
  match(id: string, d: any, q: any, base?: (d: any, q: string) => unknown): boolean;
  active(id: string): boolean;
  any(id: string): boolean;
  reset(id: string): void;
  value(d: any, k: string): string;
}
/** window.IFixFilters — بيتعرّف تحت */
declare var IFixFilters: IFixFiltersApi;

(function () {
  'use strict';
  if (window.IFixFilters) return;

  var FIELDS: { k: string; n: string }[] = [
    { k: 'model',  n: 'موديل' },
    { k: 'name',   n: 'اسم' },
    { k: 'shop',   n: 'محل' },
    { k: 'phone',  n: 'رقم' },
    { k: 'issue',  n: 'عطل' },
    { k: 'serial', n: 'سريال' }
  ];

  var ST: Record<string, FilterState> = {};          // id → { f:{}, date:'', to:'', mode:'in', picking:false }
  var OPTS: Record<string, FilterOpts> = {};        // id → { onChange }
  var WATCH: string[] = [];       // أسماء الخانات اللي بنركّب عليها

  function st(id: string): FilterState {
    return ST[id] || (ST[id] = { f: {}, date: '', to: '', mode: 'in', picking: false });
  }

  // ===== قراءة الجهاز — شغالة على الشكلين =====
  function pick(o: any, keys: string[]): string {
    if (!o) return '';
    for (var i = 0; i < keys.length; i++) {
      var v = o[keys[i]];
      if (v !== undefined && v !== null && v !== '') return String(v);
    }
    return '';
  }
  function join(a: string[]): string { return a.filter(Boolean).join(' '); }

  function val(d: any, k: string): string {
    var r = (d && d._raw) || d || {};
    switch (k) {
      case 'model':  return join([pick(r, ['deviceType']) || pick(d, ['type']),
                                  pick(r, ['model']) || pick(d, ['model'])]);
      case 'name':   return pick(r, ['customerName']) || pick(d, ['customer']);
      case 'shop':   return join([pick(r, ['shopName']) || pick(d, ['shop']), pick(r, ['billedShop'])]);
      case 'phone':  return pick(r, ['customerPhone']) || pick(d, ['phone']);
      case 'issue':  return join([pick(r, ['reportedIssue']) || pick(d, ['issue']), pick(r, ['discoveredFault'])]);
      case 'serial': return pick(r, ['serialNumber']) || pick(d, ['serial']);
      case 'in':     return pick(r, ['intakeDate']) || pick(d, ['intake']);
      // آخر تحديث — ولو فاضي (أجهزة قديمة) بننزل لتاريخ الدخول
      case 'up':     return pick(r, ['lastModifiedAt']) || pick(d, ['touched']) || val(d, 'in');
    }
    return '';
  }

  // اليوم بالتوقيت المحلي YYYY-MM-DD — نفس شكل خانة التاريخ
  var DK = new Map<string, string>();
  function dayKey(iso: string): string {
    if (!iso) return '';
    var hit = DK.get(iso);
    if (hit !== undefined) return hit;
    var t = new Date(iso), k = '';
    if (!isNaN(t as unknown as number)) {
      k = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' +
          String(t.getDate()).padStart(2, '0');
    }
    if (DK.size > 50000) DK.clear();
    DK.set(iso, k);
    return k;
  }

  function textMatch(q: string, vals: string[]): boolean {
    if (window.IFixSearch) return IFixSearch.match(q, vals);
    var ql = q.toLowerCase();
    return vals.some(function (v) { return v && String(v).toLowerCase().indexOf(ql) >= 0; });
  }

  // ===== القلب: الجهاز ده يعدّي ولا لا؟ =====
  function match(id: string, d: any, q: any, base?: (d: any, q: string) => unknown): boolean {
    var s = ST[id];
    q = String(q == null ? '' : q).trim();
    if (s && s.date) {
      // يوم واحد: من = إلى · فترة: من ≤ اليوم ≤ إلى
      // (المقارنة نصية آمنة لأن الشكل YYYY-MM-DD)
      var k = dayKey(val(d, s.mode === 'up' ? 'up' : 'in'));
      if (!k || k < s.date || k > (s.to || s.date)) return false;
    }
    if (!q) return true;
    var ks = s ? FIELDS.filter(function (f) { return s.f[f.k]; }) : [];
    if (!ks.length) return base ? !!base(d, q) : true;      // مفيش فلتر → بحث الصفحة العادي
    return textMatch(q, ks.map(function (f) { return val(d, f.k); }));
  }

  function active(id: string): boolean { var s = ST[id]; return !!(s && s.date); }
  function any(id: string): boolean {
    var s = ST[id]; if (!s) return false;
    if (s.date) return true;
    for (var k in s.f) if (s.f[k]) return true;
    return false;
  }

  function reset(id: string): void {
    delete ST[id];
    var el = document.getElementById(id) as FilterInput | null;
    if (el && el.__ifxBar) paint(el);
  }

  // ===== الشكل =====
  function css() {
    if (document.getElementById('ifxCss')) return;
    var s = document.createElement('style');
    s.id = 'ifxCss';
    s.textContent = [
      '.ifx-bar{--ifx-ac:var(--accent,var(--repairing,#0891A8));--ifx-bd:var(--border,var(--line,#E4E9EF));',
      '  --ifx-bg:var(--surface,var(--card,#fff));--ifx-ink:var(--ink-2,var(--muted,#475569));',
      '  display:flex;flex-wrap:nowrap;align-items:center;gap:6px;overflow-x:auto;overflow-y:hidden;',
      '  -webkit-overflow-scrolling:touch;scrollbar-width:none;padding:7px 1px 2px;margin:0;box-sizing:border-box;width:100%;}',
      '.ifx-bar::-webkit-scrollbar{display:none;}',
      '.ifx-bar button.ifx-c{flex:none;position:relative;overflow:hidden;appearance:none;-webkit-appearance:none;',
      '  margin:0;width:auto;min-width:0;min-height:0;height:auto;box-shadow:none;',
      '  border:1px solid var(--ifx-bd);background:var(--ifx-bg);color:var(--ifx-ink);',
      '  border-radius:999px;padding:5px 11px;font-family:inherit;font-size:12px;font-weight:700;',
      '  line-height:1.25;white-space:nowrap;cursor:pointer;display:inline-flex;align-items:center;gap:3px;',
      '  -webkit-tap-highlight-color:transparent;transition:background .12s,border-color .12s,color .12s;}',
      '.ifx-bar button.ifx-c:active{transform:scale(.96);}',
      '.ifx-bar button.ifx-c.on{border-color:var(--ifx-ac);color:var(--ifx-ac);',
      '  background:rgba(8,145,168,.12);background:color-mix(in srgb,var(--ifx-ac) 15%,transparent);}',
      /* خانتين نوع التاريخ + ✕ — مستخبيين لحد ما تختار تاريخ */
      '.ifx-bar button.ifx-m{display:none;font-size:11px;padding:4px 9px;border-style:dashed;}',
      '.ifx-bar button.ifx-m.on{border-style:solid;}',
      '.ifx-bar.dt button.ifx-m{display:inline-flex;}',
      '.ifx-bar .ifx-sep{flex:none;width:1px;height:16px;background:var(--ifx-bd);}',
      /* خانة التاريخ الحقيقية شفافة فوق الزرار — دوسة واحدة بتفتح نتيجة الموبايل */
      '.ifx-bar input.ifx-d{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;',
      '  opacity:0!important;margin:0!important;padding:0!important;border:0!important;',
      '  font-size:16px!important;cursor:pointer;background:none!important;}',
      /* مراجعة قطع الغيار: خانة البحث ليها مسافة تحتها — نقرّب الصف منها */
      '.pr-search + .ifx-bar{margin-top:-8px;margin-bottom:12px;}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function dm(v: string): string { var p = v.split('-'); return (+p[2]) + '/' + (+p[1]); }
  function dateLabel(v: string): string { return v ? '📅 ' + dm(v) : '📅 تاريخ'; }
  function toLabel(v: string): string { return v ? 'إلى ' + dm(v) : 'إلى…'; }

  // لو «إلى» قبل «من» → نبدّلهم. ولو زي بعض → يوم واحد.
  function fixRange(s: FilterState): void {
    if (s.date && s.to && s.to < s.date) { var t = s.to; s.to = s.date; s.date = t; }
    if (s.to && s.to === s.date) s.to = '';
    if (!s.date && s.to) { s.date = s.to; s.to = ''; }
  }

  function paint(inp: FilterInput): void {
    var bar = inp.__ifxBar, id = inp.id;
    if (!bar) return;
    var s = st(id);
    var h = '<button type="button" class="ifx-c ifx-dt' + (s.date ? ' on' : '') + '">' +
              '<span class="ifx-dl">' + dateLabel(s.date) + '</span>' +
              '<input type="date" class="ifx-d" tabindex="-1" aria-label="تاريخ" value="' + (s.date || '') + '">' +
            '</button>' +
            '<button type="button" class="ifx-c ifx-m ifx-to' + (s.to ? ' on' : '') + '"' + (s.date ? '' : ' style="display:none"') + '>' +
              '<span class="ifx-tl">' + toLabel(s.to) + '</span>' +
              '<input type="date" class="ifx-d" tabindex="-1" aria-label="إلى تاريخ" value="' + (s.to || '') + '">' +
            '</button>' +
            '<button type="button" class="ifx-c ifx-m' + (s.mode === 'in' ? ' on' : '') + '" data-m="in">دخول</button>' +
            '<button type="button" class="ifx-c ifx-m' + (s.mode === 'up' ? ' on' : '') + '" data-m="up">تحديث</button>' +
            '<button type="button" class="ifx-c ifx-m ifx-x" data-x="1" aria-label="شيل التاريخ"' +
              (s.date ? '' : ' style="display:none"') + '>✕</button>' +
            '<span class="ifx-sep"></span>' +
            FIELDS.map(function (f) {
              return '<button type="button" class="ifx-c' + (s.f[f.k] ? ' on' : '') + '" data-f="' + f.k + '">' + f.n + '</button>';
            }).join('');
    bar.innerHTML = h;
    bar.classList.toggle('dt', !!(s.date || s.picking));
    wireDate(inp, bar);
  }

  function fire(id: string): void {
    var o = OPTS[id];
    if (o && typeof o.onChange === 'function') { try { o.onChange(); } catch (e) { console.error('[فلاتر البحث]', e); } return; }
    var el = document.getElementById(id);
    // بنعمل نفس اللي بيحصل لما حد يكتب في الخانة — فالصفحة بتعيد
    // الرسم بدالتها هي، من غير ما نعرف اسم الدالة دي أصلاً.
    if (el) el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // ============================================================
  // تحديث الخانات في مكانها — من غير ما نمسح أي حاجة ونرسمها تاني
  // ------------------------------------------------------------
  // 🐞 الباج اللي اتصلّح: الأيفون أول ما النتيجة تتفتح على خانة
  //    فاضية بيحط تاريخ النهاردة لوحده ويقول «التاريخ اتغيّر».
  //    الكود كان بيرد على ده بإنه يرسم الصف كله من جديد — فخانة
  //    التاريخ اللي النتيجة فاتحة عليها كانت بتتمسح، والنتيجة
  //    تقفل بعد أقل من ثانية على تاريخ النهاردة.
  //    المرة التانية كانت بتشتغل لأن الخانة مبقتش فاضية، فالأيفون
  //    مبيغيّرش حاجة لوحده.
  // ✅ دلوقتي وإنت بتختار: بنغيّر الكلام اللي على الخانة بس.
  //    الخانة نفسها مبتتلمسش، فالنتيجة بتفضل مفتوحة لحد ما تختار.
  // ============================================================
  function sync(bar: HTMLElement, s: FilterState): void {
    var ins = bar.querySelectorAll<HTMLInputElement>('input.ifx-d');
    var chip = bar.querySelector('.ifx-dt'), lbl = bar.querySelector('.ifx-dl');
    var to = bar.querySelector<HTMLElement>('.ifx-to'), tl = bar.querySelector('.ifx-tl');
    var x = bar.querySelector<HTMLElement>('.ifx-x');
    if (lbl) lbl.textContent = dateLabel(s.date);
    if (chip) chip.classList.toggle('on', !!s.date);
    if (tl) tl.textContent = toLabel(s.to);
    if (to) { to.classList.toggle('on', !!s.to); to.style.display = s.date ? '' : 'none'; }
    if (x) x.style.display = s.date ? '' : 'none';
    // القيم جوه الخانات — بنكتبها بس لو مختلفة (لو اتبدّلوا مثلاً)،
    // عشان منلمسش الخانة اللي المستخدم لسه بيختار فيها
    if (ins[0] && ins[0].value !== (s.date || '')) ins[0].value = s.date || '';
    if (ins[1] && ins[1].value !== (s.to || ''))   ins[1].value = s.to || '';
    bar.classList.toggle('dt', !!(s.date || s.picking));
  }

  function wireDate(inp: FilterInput, bar: HTMLElement): void {
    var id = inp.id;
    var ins = bar.querySelectorAll<HTMLInputElement>('input.ifx-d');   // [0] = من · [1] = إلى
    ins.forEach(function (d, i) {
      var key: 'date' | 'to' = i === 0 ? 'date' : 'to';
      // وإنت بتختار → الخانات الصغيرة تظهر
      d.addEventListener('focus', function () { st(id).picking = true; bar.classList.add('dt'); });
      d.addEventListener('click', function () {
        st(id).picking = true; bar.classList.add('dt');
        // الكمبيوتر: الدوسة على الخانة مبتفتحش النتيجة لوحدها
        // ⚠️ matchMedia و showPicker مش موجودين في المتصفحات القديمة — عشان كده بنسأل الأول.
        //    TypeScript فاكر matchMedia موجودة دايماً، فبنقوله «ممكن تبقى مش موجودة» (matchMedia?).
        try { if (!((window as { matchMedia?: unknown }).matchMedia && matchMedia('(pointer: coarse)').matches) && d.showPicker) d.showPicker(); } catch (e) {}
      });
      // ⚠️ هنا **ممنوع** paint() — شوف الشرح فوق sync
      var onPick = function () {
        var s = st(id);
        var v = d.value || '';
        if (s[key] === v) return;
        s[key] = v;
        if (key === 'date' && !s.date) s.to = '';      // مسحت «من» → الفترة كلها اتشالت
        sync(bar, s);
        fire(id);
      };
      d.addEventListener('change', onPick);
      d.addEventListener('input', onPick);
      // النتيجة اتقفلت → دلوقتي بس نظبّط الترتيب (لو «إلى» قبل «من»)
      d.addEventListener('blur', function () {
        var s = st(id);
        s.picking = false;
        var a = s.date, b = s.to;
        fixRange(s);
        sync(bar, s);
        if (a !== s.date || b !== s.to) fire(id);
      });
    });
  }

  function onBarClick(e: Event): void {
    var bar = e.currentTarget as HTMLElement;
    var id = bar.getAttribute('data-for');
    var b = (e.target as Element).closest ? (e.target as Element).closest('button.ifx-c') : null;
    if (!b || !id || b.classList.contains('ifx-dt') || b.classList.contains('ifx-to')) return;
    var s = st(id);
    if (b.hasAttribute('data-f')) {
      var k = b.getAttribute('data-f')!;
      s.f[k] = !s.f[k];
      b.classList.toggle('on', !!s.f[k]);
      fire(id);
    } else if (b.hasAttribute('data-m')) {
      s.mode = b.getAttribute('data-m')!;
      bar.querySelectorAll('button[data-m]').forEach(function (m) {
        m.classList.toggle('on', m.getAttribute('data-m') === s.mode);
      });
      if (s.date) fire(id);
    } else if (b.hasAttribute('data-x')) {
      s.date = ''; s.to = ''; s.picking = false;
      var inp = document.getElementById(id) as FilterInput | null;
      if (inp) paint(inp);
      fire(id);
    }
  }

  // ===== المكان: تحت الخانة مباشرةً =====
  function place(inp: HTMLElement, bar: HTMLElement): void {
    var p = inp.parentElement;
    if (!p) return;
    // البحث الرئيسي في الداشبورد: الخانة جوه صف أفقي — الفلاتر تحته
    if (p.classList.contains('gs-box')) {
      if (p.nextElementSibling !== bar) p.parentNode!.insertBefore(bar, p.nextSibling);
      return;
    }
    // بعد الخانة (وبعد زرار الباركود لو اتحط جنبها)
    var ref: Element = inp, n = inp.nextElementSibling;
    while (n && (n === bar || n.classList.contains('ifs-btn'))) { if (n !== bar) ref = n; n = n.nextElementSibling; }
    if (ref.nextElementSibling !== bar) p.insertBefore(bar, ref.nextSibling);
  }

  function attach(inp: string | FilterInput | null, opts?: FilterOpts): void {
    if (typeof inp === 'string') inp = document.getElementById(inp);
    if (!inp || !inp.id) return;
    if (opts) OPTS[inp.id] = opts;
    css();
    var bar = inp.__ifxBar;
    if (!bar || !bar.isConnected || bar.getAttribute('data-for') !== inp.id) {
      bar = document.createElement('div');
      bar.className = 'ifx-bar';
      bar.setAttribute('dir', 'rtl');
      bar.setAttribute('data-for', inp.id);
      // الفلاتر مبتقفلش الكيبورد — الدوسة مبتسحبش التركيز من خانة البحث
      bar.addEventListener('mousedown', function (e) {
        if (!(e.target && (e.target as Element).classList && (e.target as Element).classList.contains('ifx-d'))) e.preventDefault();
      });
      bar.addEventListener('click', onBarClick);
      inp.__ifxBar = bar;
      place(inp, bar);
      paint(inp);
    } else {
      place(inp, bar);
    }
  }

  // ===== المراقبة: أي خانة من القايمة تظهر (أو تترسم من جديد) → الصف يتركّب =====
  var scheduled = false, obs: MutationObserver | null = null;
  function scan() {
    scheduled = false;
    for (var i = 0; i < WATCH.length; i++) {
      var el = document.getElementById(WATCH[i]);
      if (el) attach(el);
    }
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || setTimeout)(scan);
  }
  function watch(ids: string[] | null | undefined, opts?: Record<string, FilterOpts>): void {
    (ids || []).forEach(function (id) {
      if (WATCH.indexOf(id) < 0) WATCH.push(id);
      if (opts && opts[id]) OPTS[id] = opts[id];
    });
    var go = function () {
      scan();
      if (!obs && window.MutationObserver && document.body) {
        obs = new MutationObserver(schedule);
        obs.observe(document.body, { childList: true, subtree: true });
      }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
  }

  window.IFixFilters = {
    watch: watch, attach: attach, match: match,
    active: active, any: any, reset: reset, value: val
  };
})();
