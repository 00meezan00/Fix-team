/* ============================================================
   🧪 qc-view.js — ورقة فحص الجهاز (ملف مشترك) — ملف SQL رقم 110
   ------------------------------------------------------------
   🧸 بالبلدي:
      التيستر بيفحص الجهاز مرتين: 🛎️ وقت الاستلام و 📦 وقت التسليم.
      الملف ده فيه حاجتين:
        ١) 📋 قايمة البنود نفسها (QC.GROUPS) — صفحة التيستر بتبني منها
           الورقة، وباقي الشاشات بتقرا منها أسماء البنود.
           👉 عايز تزوّد بند؟ زوّده هنا بس، وكل الشاشات هتشوفه.
        ٢) 👀 كارت «نتيجة الفحص» اللي بيظهر في تفاصيل الجهاز
           (الاستقبال · مدير الإنتاج · المحاسب العام · الفني · المالك).

   🔑 القراية من السيرفر بس: qc_latest (ملف 110). مفيش كتابة هنا.

   ⚠️ الملف مكتفي بنفسه عن قصد: ألوانه جواه، ومبيعتمدش على أي متغيّر
      في الصفحة غير sb (common.js). لو الصفحة فيها --surface/--ink بياخدها،
      ولو مفيش بيستخدم ألوانه هو.

   🟦 (٢٠٢٦-١٠-٢١) بقى TypeScript (ts/qc-view.ts → qc-view.js)
      🧸 نفس الكود بالحرف — اتزوّد بس «ورق» بيقول نوع كل حاجة.
         المترجم بيشيل الورق ده والمتصفح بياخد نفس الـ js القديم.
   ============================================================ */
// 🏷️ الأنواع — بتختفي بعد الترجمة
/** بند واحد في ورقة الفحص */
interface QcItemDef {
  /** المفتاح — مايتغيّرش بعد ما الشغل يبدأ */
  k: string;
  /** الاسم اللي بيظهر */
  l: string;
  /** بيتفحص حتى لو الجهاز مش بيفتح (الشكل الخارجي) */
  off?: boolean;
  /** تلميح صغير تحت البند */
  hint?: string;
}
/** مجموعة بنود (الشاشة · الشحن · …) */
interface QcGroup { g: string; icon: string; t: string; items: QcItemDef[]; }
/** بند + مجموعته — في QC.FLAT و QC.BY_K */
type QcFlatItem = QcItemDef & { g: string; gicon: string };
/** نتيجة بند في فحص متسجّل */
interface QcMark {
  k: string;
  /** ok = سليم · bad = فيه مشكلة · na = ماتجربش */
  s: string;
  /** ملاحظة التيستر على البند */
  n?: string | null;
}
/** فحص واحد متسجّل — من qc_latest() (ملف 110) */
interface QcCheck {
  items: QcMark[];
  /** false = الجهاز مش بيفتح */
  power_on?: boolean | null;
  /** صحة البطارية ٪ */
  battery_health?: number | null;
  by_name?: string | null;
  at: string;
  notes?: string | null;
}
interface QcSummary { ok: number; bad: number; na: number; bads: QcMark[]; nas: QcMark[]; }
/** آخر فحص لجهاز — في الكاش */
interface QcCacheRow {
  intake: QcCheck | null;
  delivery: QcCheck | null;
  /** اتفحص كام مرة */
  n: number;
  /** intake · delivery · null — الجهاز مستني أنهي فحص */
  phase: string | null;
  /** من إمتى دخل المرحلة دي */
  since: string | null;
  /** إمتى قريناه من السيرفر (ms) */
  at: number;
}
/** حالة جهاز زي ما الشاشات بتقراها — QC.state(id) */
interface QcState {
  intake: QcCheck | null;
  delivery: QcCheck | null;
  n: number;
  phase: string | null;
  since: string | null;
  intakeOk: boolean;
  deliveryOk: boolean;
  regress: QcMark[];
}
interface QcApi {
  GROUPS: QcGroup[];
  FLAT: QcFlatItem[];
  BY_K: Record<string, QcFlatItem>;
  S_TXT: Record<string, string>;
  PHASE: Record<string, { i: string; t: string }>;
  label(k: string): string;
  summary(c: QcCheck | null | undefined): QcSummary;
  regress(intake: QcCheck | null | undefined, delivery: QcCheck | null | undefined): QcMark[];
  load(ids: string[] | null | undefined, force?: boolean): Promise<Record<string, QcCacheRow>>;
  state(id: string): QcState | null;
  panelHtml(d: { id?: string } | null | undefined, rerender?: () => void): string;
  forget(id?: string): void;
  lastError(): string;
}
declare var QC: QcApi;

(function(){
  'use strict';

  // ------------------------------------------------------------
  // 📋 البنود — off:true = بيتفحص حتى لو الجهاز مش بيفتح (الشكل الخارجي)
  // ⚠️ المفتاح (k) مايتغيّرش بعد ما الشغل يبدأ — الفحوصات القديمة متسجّلة بيه.
  //    الاسم (l) يتغيّر عادي.
  // ------------------------------------------------------------
  var GROUPS: QcGroup[] = [
    { g:'shape', icon:'🧱', t:'الشكل الخارجي', items:[
      { k:'chassis', l:'الشاسيه / الإطار', off:true, hint:'خبطات · انحناء · كسر' },
      { k:'back',    l:'الضهر',            off:true, hint:'كسر · خدوش' },
      { k:'glass',   l:'زجاج الشاشة',      off:true, hint:'كسر · خدوش · سكرينة' },
      { k:'lens',    l:'زجاج الكاميرات',   off:true },
      { k:'sim_tray',l:'درج الشريحة',      off:true }
    ]},
    { g:'screen', icon:'📱', t:'الشاشة', items:[
      { k:'display', l:'العرض', hint:'بقع · خطوط · ألوان · شاشة محروقة' },
      { k:'touch',   l:'التاتش', hint:'كل أماكن الشاشة' },
      { k:'light',   l:'الإضاءة' }
    ]},
    { g:'power', icon:'🔋', t:'الشحن والبطارية', items:[
      { k:'charge',  l:'الشحن' },
      { k:'port',    l:'منفذ الشحن', off:true },
      { k:'battery', l:'البطارية', hint:'بتفصل · بتسخن · منفوخة' },
      { k:'wireless',l:'الشحن اللاسلكي (لو بيدعمه)' }
    ]},
    { g:'net', icon:'📶', t:'الشبكة والاتصالات', items:[
      { k:'network', l:'الشبكة والشريحة' },
      { k:'calls',   l:'المكالمات (اتصال واستقبال)' },
      { k:'wifi',    l:'الواي فاي' },
      { k:'bt',      l:'البلوتوث' },
      { k:'gps',     l:'الـ GPS / الموقع' }
    ]},
    { g:'sound', icon:'🔊', t:'الصوت والمايكات', items:[
      { k:'speaker', l:'السماعة الخارجية' },
      { k:'earpiece',l:'سماعة المكالمة' },
      { k:'mic',     l:'المايك الأساسي' },
      { k:'mic2',    l:'المايك التاني (الفيديو / السماعة)' },
      { k:'vibrate', l:'الهزاز' }
    ]},
    { g:'cam', icon:'📷', t:'الكاميرات', items:[
      { k:'cam_back', l:'الكاميرا الخلفية', hint:'كل العدسات + الفوكس' },
      { k:'cam_front',l:'الكاميرا الأمامية' },
      { k:'flash',    l:'الفلاش' }
    ]},
    { g:'keys', icon:'🔘', t:'الأزرار والحساسات', items:[
      { k:'power_btn', l:'زرار الباور' },
      { k:'vol_btn',   l:'أزرار الصوت' },
      { k:'biometric', l:'البصمة / Face ID' },
      { k:'proximity', l:'حساس القرب' },
      { k:'rotate',    l:'التدوير (الجيروسكوب)' }
    ]}
  ];
  var FLAT: QcFlatItem[] = [];
  GROUPS.forEach(function(g){ g.items.forEach(function(it){ FLAT.push(Object.assign({ g:g.g, gicon:g.icon }, it)); }); });
  var BY_K: Record<string, QcFlatItem> = {};
  FLAT.forEach(function(it){ BY_K[it.k] = it; });

  var S_TXT: Record<string, string> = { ok:'✅ سليم', bad:'❌ فيه مشكلة', na:'➖ ماتجربش' };
  var PHASE: Record<string, { i: string; t: string }> = { intake:{ i:'🛎️', t:'فحص الاستلام' }, delivery:{ i:'📦', t:'فحص التسليم' } };

  // ---------- أدوات ----------
  function esc(s: unknown): string {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function lbl(k: string): string { return (BY_K[k] && BY_K[k].l) || k; }
  function ago(iso: string): string {
    var m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if(!(m >= 0)) return '';
    if(m < 1) return 'دلوقتي';
    if(m < 60) return 'من ' + m + ' دقيقة';
    var h = Math.floor(m / 60); if(h < 24) return 'من ' + h + ' ساعة';
    var d = Math.floor(h / 24); return d === 1 ? 'من يوم' : 'من ' + d + ' يوم';
  }
  function when(iso: string): string {
    try{ return new Date(iso).toLocaleString('ar-EG', { day:'numeric', month:'numeric', hour:'numeric', minute:'2-digit', timeZone:'Africa/Cairo' }); }
    catch(e){ return ''; }
  }

  // ملخّص فحص واحد: كام سليم / فيه مشكلة / ماتجربش + البنود اللي فيها مشكلة
  function summary(c: QcCheck | null | undefined): QcSummary {
    var out: QcSummary = { ok:0, bad:0, na:0, bads:[], nas:[] };
    if(!c || !Array.isArray(c.items)) return out;
    c.items.forEach(function(it){
      if(it.s === 'ok') out.ok++;
      else if(it.s === 'bad'){ out.bad++; out.bads.push(it); }
      else if(it.s === 'na'){ out.na++; out.nas.push(it); }
    });
    return out;
  }
  // ⚠️ حاجات كانت ✅ سليمة وقت الاستلام وبقت ❌ وقت التسليم
  function regress(intake: QcCheck | null | undefined, delivery: QcCheck | null | undefined): QcMark[] {
    if(!intake || !delivery || !Array.isArray(intake.items) || !Array.isArray(delivery.items)) return [];
    var was: Record<string, string> = {};
    intake.items.forEach(function(it){ was[it.k] = it.s; });
    return delivery.items.filter(function(it){ return it.s === 'bad' && was[it.k] === 'ok'; });
  }

  // ============================================================
  // 🗄️ الكاش — آخر فحص لكل جهاز (من qc_latest)
  // ============================================================
  var cache: Record<string, QcCacheRow> = {};          // id → { intake, delivery, n, phase, since, at }
  var pending: Record<string, boolean> = {};        // id → true وهو بيتحمّل
  var failAt: Record<string, number> = {};         // id → آخر مرة القراية فشلت (عشان مانفضلش نعيد ونرسم من غير ما نقف)
  var RETRY_MS = 30000;
  var lastErr = '';
  var MAX_AGE = 45000;     // ٤٥ ثانية — بعدها بنقرا تاني لما الكارت يترسم

  async function load(ids: string[] | null | undefined, force?: boolean): Promise<Record<string, QcCacheRow>> {
    if(typeof sb === 'undefined') return {};
    ids = (ids || []).filter(Boolean);
    var need = ids.filter(function(id){
      var c = cache[id];
      return force || !c || (Date.now() - c.at) > MAX_AGE;
    }).filter(function(id){
      return force || (!pending[id] && !(failAt[id] && Date.now() - failAt[id] < RETRY_MS));
    });
    if(!need.length) return cache;
    need.forEach(function(id){ pending[id] = true; });
    try{
      var res = await sb.rpc('qc_latest', { p_ids: need.slice(0, 400) });
      // ⚠️ Supabase مبيرميش خطأ — بيرجّعه في .error
      if(res.error) throw res.error;
      var data = res.data || {};
      var now = Date.now();
      need.forEach(function(id){
        var r = data[id] || {};
        cache[id] = { intake: r.intake || null, delivery: r.delivery || null, n: r.n || 0,
                      phase: r.phase || null, since: r.since || null, at: now };
        delete failAt[id];
      });
      lastErr = '';
    }catch(e: any){
      lastErr = (e && e.message) ? e.message : String(e);
      console.warn('qc_latest:', lastErr);
      need.forEach(function(id){ failAt[id] = Date.now(); });
    }finally{
      need.forEach(function(id){ delete pending[id]; });
    }
    return cache;
  }

  // الفحص «محسوب» لو اتعمل بعد ما الجهاز دخل المرحلة (مرتجع رجع؟ → محتاج فحص جديد)
  function fresh(c: QcCheck | null, since: string | null): boolean {
    if(!c) return false;
    if(!since) return true;
    return new Date(c.at).getTime() >= new Date(since).getTime() - 1000;
  }
  function state(id: string): QcState | null {
    var c = cache[id];
    if(!c) return null;
    return {
      intake: c.intake, delivery: c.delivery, n: c.n, phase: c.phase, since: c.since,
      intakeOk:   c.phase === 'intake'   ? fresh(c.intake, c.since)   : !!c.intake,
      deliveryOk: c.phase === 'delivery' ? fresh(c.delivery, c.since) : !!c.delivery,
      regress: regress(c.intake, c.delivery)
    };
  }

  // ============================================================
  // 🎨 الستايل
  // ============================================================
  var CSS = ''
  + '.qc-card{--qc-bg:var(--surface,var(--card,#fff));--qc-soft:var(--surface-2,var(--soft,#F4F4F2));'
  + '--qc-ink:var(--ink,#141416);--qc-mut:var(--muted,#6B6B70);--qc-line:var(--border,var(--line,#E3E1DC));'
  + '--qc-ok:#15803D;--qc-ok-bg:#EAF6EE;--qc-bad:#DC2626;--qc-bad-bg:#FEF2F2;--qc-wait:#B45309;--qc-wait-bg:#FEF3C7;--qc-acc:#F26A1B;'
  + 'background:var(--qc-bg);border:1px solid var(--qc-line);border-inline-start:4px solid var(--qc-acc);'
  + 'border-radius:12px;padding:11px 12px;margin:0 0 14px;color:var(--qc-ink);font-size:13px;line-height:1.75;}'
  + 'html[data-theme="dark"] .qc-card{--qc-ok:#4ADE80;--qc-ok-bg:rgba(74,222,128,.13);--qc-bad:#F87171;--qc-bad-bg:rgba(248,113,113,.14);'
  + '--qc-wait:#FBBF24;--qc-wait-bg:rgba(251,191,36,.15);--qc-acc:#FF7A2E;}'
  + '.qc-h{display:flex;align-items:center;gap:6px;font-weight:900;font-size:14px;margin-bottom:6px;}'
  + '.qc-h small{font-weight:700;color:var(--qc-mut);font-size:11.5px;margin-inline-start:auto;}'
  + '.qc-ph{border-top:1px dashed var(--qc-line);padding-top:7px;margin-top:7px;}'
  + '.qc-ph:first-of-type{border-top:none;padding-top:0;margin-top:0;}'
  + '.qc-pt{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-weight:800;}'
  + '.qc-chip{display:inline-block;border-radius:20px;padding:1px 9px;font-size:11.5px;font-weight:800;background:var(--qc-soft);color:var(--qc-mut);}'
  + '.qc-chip.ok{background:var(--qc-ok-bg);color:var(--qc-ok);}.qc-chip.bad{background:var(--qc-bad-bg);color:var(--qc-bad);}'
  + '.qc-chip.wait{background:var(--qc-wait-bg);color:var(--qc-wait);}'
  + '.qc-by{font-size:11.5px;color:var(--qc-mut);}'
  + '.qc-bads{margin:4px 0 0;padding:0;list-style:none;}'
  + '.qc-bads li{font-size:12.5px;padding:1px 0;}'
  + '.qc-bads li b{color:var(--qc-bad);}'
  + '.qc-reg{background:var(--qc-bad-bg);color:var(--qc-bad);border-radius:9px;padding:7px 9px;margin-top:7px;font-weight:800;font-size:12.5px;}'
  + '.qc-note{background:var(--qc-soft);border-radius:8px;padding:5px 8px;margin-top:5px;font-size:12.5px;white-space:pre-wrap;word-break:break-word;}'
  + '.qc-card details{margin-top:6px;}'
  + '.qc-card summary{cursor:pointer;font-size:12px;font-weight:800;color:var(--qc-acc);}'
  + '.qc-all{display:grid;grid-template-columns:1fr auto auto;gap:2px 10px;font-size:12px;margin-top:6px;}'
  + '.qc-all .gh{grid-column:1/-1;font-weight:900;color:var(--qc-mut);margin-top:5px;}'
  + '.qc-all .hd{font-weight:900;color:var(--qc-mut);font-size:11px;}'
  + '.qc-all .rg{color:var(--qc-bad);font-weight:900;}';
  function injectCss(){
    if(document.getElementById('qcCss')) return;
    var st = document.createElement('style'); st.id = 'qcCss'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ============================================================
  // 👀 كارت النتيجة في تفاصيل الجهاز
  // ------------------------------------------------------------
  // QC.panelHtml(d, rerender)
  //   d        = الجهاز (محتاج d.id بس)
  //   rerender = دالة الصفحة اللي بترسم التفاصيل تاني — بننده عليها
  //              لما النتيجة توصل من السيرفر.
  // ============================================================
  function icon(s: string): string { return s === 'ok' ? '✅' : s === 'bad' ? '❌' : s === 'na' ? '➖' : '·'; }

  function phaseHtml(ph: string, c: QcCheck | null, isCurrent: boolean, isFresh: boolean): string {
    var P = PHASE[ph];
    if(!c){
      return '<div class="qc-ph"><div class="qc-pt">' + P.i + ' ' + P.t
        + (isCurrent ? ' <span class="qc-chip wait">⏳ لسه ما اتفحصش</span>' : ' <span class="qc-chip">لسه</span>') + '</div></div>';
    }
    var sm = summary(c);
    var old = isCurrent && !isFresh;
    return '<div class="qc-ph"><div class="qc-pt">' + P.i + ' ' + P.t
      + ' <span class="qc-chip ok">✅ ' + sm.ok + '</span>'
      + (sm.bad ? ' <span class="qc-chip bad">❌ ' + sm.bad + '</span>' : '')
      + (sm.na ? ' <span class="qc-chip">➖ ' + sm.na + '</span>' : '')
      + (c.power_on === false ? ' <span class="qc-chip bad">🔌 الجهاز مش بيفتح</span>' : '')
      + (c.battery_health != null ? ' <span class="qc-chip">🔋 ' + esc(c.battery_health) + '٪</span>' : '')
      + (old ? ' <span class="qc-chip wait">⏳ ده فحص قديم — محتاج فحص جديد</span>' : '')
      + '</div>'
      + '<div class="qc-by">🧪 ' + esc(c.by_name || '') + ' · ' + esc(when(c.at)) + ' (' + esc(ago(c.at)) + ')</div>'
      + (sm.bads.length ? '<ul class="qc-bads">' + sm.bads.map(function(it){
          return '<li><b>❌ ' + esc(lbl(it.k)) + '</b>' + (it.n ? ' — ' + esc(it.n) : '') + '</li>'; }).join('') + '</ul>' : '')
      + (c.notes ? '<div class="qc-note">📝 ' + esc(c.notes) + '</div>' : '')
      + '</div>';
  }

  function allItemsHtml(intake: QcCheck | null, delivery: QcCheck | null): string {
    var wi: Record<string, QcMark> = {}, wd: Record<string, QcMark> = {};
    (intake && intake.items || []).forEach(function(it){ wi[it.k] = it; });
    (delivery && delivery.items || []).forEach(function(it){ wd[it.k] = it; });
    var h = '<div class="qc-all"><span class="hd">البند</span><span class="hd">🛎️</span><span class="hd">📦</span>';
    GROUPS.forEach(function(g){
      h += '<span class="gh">' + g.icon + ' ' + esc(g.t) + '</span>';
      g.items.forEach(function(it){
        var a = wi[it.k], b = wd[it.k];
        var rg = a && b && a.s === 'ok' && b.s === 'bad';
        h += '<span' + (rg ? ' class="rg"' : '') + '>' + esc(it.l)
          + (a && a.n ? ' <small>(' + esc(a.n) + ')</small>' : '')
          + (b && b.n && (!a || b.n !== a.n) ? ' <small>(📦 ' + esc(b.n) + ')</small>' : '') + '</span>'
          + '<span>' + (a ? icon(a.s) : '·') + '</span><span>' + (b ? icon(b.s) : '·') + '</span>';
      });
    });
    return h + '</div>';
  }

  function panelHtml(d: { id?: string } | null | undefined, rerender?: () => void): string {
    if(!d || !d.id) return '';
    injectCss();
    var st = state(d.id);
    var c = cache[d.id];
    if(!c || (Date.now() - c.at) > MAX_AGE){
      var retryOk = !(failAt[d.id] && Date.now() - failAt[d.id] < RETRY_MS);
      if(!pending[d.id] && retryOk) load([d.id]).then(function(){ try{ if(typeof rerender === 'function') rerender(); }catch(e){} });
    }
    if(!st){
      return '<div class="qc-card"><div class="qc-h">🧪 فحص الجهاز <small>⏳ بنقرا…</small></div>'
        + (lastErr ? '<div class="qc-by" style="color:#DC2626">' + esc(lastErr)
          + (/qc_latest|does not exist|PGRST202/i.test(lastErr) ? ' — (ملف SQL رقم 110 لسه ما اتشغّلش؟)' : '') + '</div>' : '')
        + '</div>';
    }
    var reg = st.regress;
    return '<div class="qc-card">'
      + '<div class="qc-h">🧪 فحص الجهاز' + (st.n > 2 ? ' <small>اتفحص ' + st.n + ' مرات</small>' : '') + '</div>'
      + phaseHtml('intake', st.intake, st.phase === 'intake', st.intakeOk)
      + phaseHtml('delivery', st.delivery, st.phase === 'delivery', st.deliveryOk)
      + (reg.length ? '<div class="qc-reg">⚠️ حاجات كانت سليمة وقت الاستلام وبقت فيها مشكلة: '
          + reg.map(function(it){ return esc(lbl(it.k)) + (it.n ? ' (' + esc(it.n) + ')' : ''); }).join(' · ') + '</div>' : '')
      + ((st.intake || st.delivery) ? '<details><summary>📋 كل البنود</summary>' + allItemsHtml(st.intake, st.delivery) + '</details>' : '')
      + '</div>';
  }

  window.QC = {
    GROUPS: GROUPS, FLAT: FLAT, BY_K: BY_K, S_TXT: S_TXT, PHASE: PHASE,
    label: lbl, summary: summary, regress: regress,
    load: load, state: state, panelHtml: panelHtml,
    forget: function(id){ if(id) delete cache[id]; else cache = {}; },
    lastError: function(){ return lastErr; }
  };
})();
