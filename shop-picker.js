// ============================================================
// I Fix Team — 🏪 اختيار المحل من الكشكول (shop-picker.js) — نسخة الإنتاج
// ------------------------------------------------------------
// 🧸 بالبلدي: خانة «اسم المحل» كانت كتابة حرة — فـ«حفيلة» و«حفيله»
//    و«حفيلة » بقوا ٣ محلات في الحسابات. الملف ده بيخلّي الخانة:
//      • تقترح المحلات من الكشكول (بالاسم والكود)
//      • تقولك تحتها: ✅ «حفيلة» S-0162 · 🆕 محل جديد · 🛍️ قطاعي
//      • ولو كتبت شكل تاني لنفس المحل («حفيله»)، بتصلّحه للاسم الرسمي
//        **قبل** ما الشاشة تحفظ — فالجهاز بيتسجّل باسم واحد بس.
//
// 📍 منقول من الاستيجنج (ts/shop-picker.ts) بالحرف — اتشال بس «ورق» الأنواع.
//    الزيادات بتاعة الإنتاج (2/11) معلّم عليها 🆕:
//      🆕 خانة «تسجيل دفعة» في الحسابات (#payShop) بتقترح كمان
//      🆕 canon / codeOf / aliasesOf / list / customer — لشاشة الحسابات
//         (كل أسامي المحل حساب واحد بالكود)
//      🆕 لما الكشكول يوصل بنقول للصفحة (حدث ifx-shops-ready)
//
// ⚠️ محل جديد مسموح (مش ممنوع) — بيتعمل له كود لوحده على السيرفر
//    (prod-shop-codes.sql).
// ⚠️ مكتفي بنفسه: محتاج sb (من common.js) وبس.
// ⚠️ مش متاح؟ (الملف ما اتشغّلش / مفيش نت / الدور مش مسموح)
//    → الخانة بتفضل شغّالة زي زمان بالظبط، من غير أي رسالة.
// ============================================================
(function(){
  'use strict';
  if(window.IFixShops) return;

  var SEL = '#f_shop, #f_shopName, #payShop, input[list="shopNameListDetail"], input[data-shop-pick]';
  var CACHE_KEY = 'ifix_shops_cache';
  var TTL = 10 * 60000;

  var S = { list: [], byId: {}, alias: {}, rawByCust: {}, at: 0, loading: null, ok: false };

  // نفس تبسيط السيرفر (erp_norm) — لازم الاتنين يطلعوا نفس النتيجة
  function norm(t){
    return String(t || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ـ/g, '')
      .replace(/[\s!-\/:-@\[-`{-~،؛؟]+/g, ' ').trim();
  }
  function isRetail(k){ var x = k.replace(/ /g, ''); return x === 'ifix' || x === 'ifixteam' || x === 'fixteam'; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]; }); }

  function build(customers, aliases){
    S.byId = {}; S.alias = {}; S.rawByCust = {};
    (customers || []).forEach(function(c){ S.byId[c.id] = c; });
    (aliases || []).forEach(function(a){
      S.alias[a.alias_norm] = a.customer_id;
      // 🆕 الشكل زي ما اتكتب (للعرض تحت اسم الحساب)
      if(a.sample_raw){ (S.rawByCust[a.customer_id] = S.rawByCust[a.customer_id] || []).push(a.sample_raw); }
    });
    // الاسم الرسمي نفسه دايماً بيوصل للعميل
    (customers || []).forEach(function(c){ var k = norm(c.name); if(k && !S.alias[k]) S.alias[k] = c.id; });
    S.list = (customers || []).filter(function(c){ return !c.merged_into && c.active !== false && c.code !== 'R-001'; })
      .map(function(c){ return { c: c, k: norm(c.name) }; });
  }
  function final(id){
    var c = S.byId[id], n = 0;
    while(c && c.merged_into && n++ < 10) c = S.byId[c.merged_into];
    return c || null;
  }

  function load(force){
    if(S.loading) return S.loading;
    if(!force && S.ok && Date.now() - S.at < TTL) return Promise.resolve(true);
    if(!S.ok){
      try{
        var c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if(c && c.customers){ build(c.customers, c.aliases); S.ok = true; ready(); }
      }catch(e){}
    }
    if(typeof sb === 'undefined' || !navigator.onLine) return Promise.resolve(S.ok);
    S.loading = (async function(){
      try{
        var all = [], al = [], from = 0, r;
        for(;;){
          r = await sb.from('customers').select('id,code,name,kind,active,merged_into').order('code').range(from, from + 999);
          if(r.error) throw r.error;
          all = all.concat(r.data || []);
          if(!r.data || r.data.length < 1000) break;
          from += 1000;
        }
        from = 0;
        for(;;){
          r = await sb.from('customer_aliases').select('alias_norm,customer_id,sample_raw').range(from, from + 999);
          if(r.error) throw r.error;
          al = al.concat(r.data || []);
          if(!r.data || r.data.length < 1000) break;
          from += 1000;
        }
        if(!all.length) throw new Error('مفيش محلات (prod-shop-codes.sql لسه ما اتشغّلش؟)');
        build(all, al);
        S.ok = true; S.at = Date.now();
        try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ customers: all, aliases: al })); }catch(e){}
        ready();
      }catch(e){
        // ⚠️ مش بنوقّع الصفحة — الخانة بتفضل كتابة حرة زي زمان
        console.warn('[shop-picker] مقدرناش نجيب المحلات:', (e && e.message) || e);
      }finally{ S.loading = null; }
      return S.ok;
    })();
    return S.loading;
  }
  // 🆕 «الكشكول وصل» → شاشة الحسابات تعيد التجميع
  function ready(){ try{ document.dispatchEvent(new Event('ifx-shops-ready')); }catch(e){} }

  // «الاسم ده تبع مين؟» → { kind:'retail' } · { kind:'known', c } · { kind:'new' } · null (فاضي)
  function resolve(name){
    var k = norm(name);
    if(!k) return null;
    if(isRetail(k)) return { kind: 'retail', c: S.list.length ? findCode('R-001') : undefined };
    var id = S.alias[k];
    if(id){ var c = final(id); if(c) return { kind: c.code === 'R-001' ? 'retail' : 'known', c: c }; }
    return { kind: 'new' };
  }
  function findCode(code){
    for(var id in S.byId){ if(S.byId[id].code === code) return S.byId[id]; }
    return undefined;
  }

  // 🆕 الاسم الرسمي للحساب — ولو المحل مش في الكشكول (أو الكشكول لسه ما وصلش) الاسم زي ما هو
  function canon(raw){
    var t = String(raw == null ? '' : raw).trim();
    if(!t) return t;
    if(!S.ok) return t;
    var r = resolve(t);
    return (r && r.c) ? r.c.name : t;
  }
  // 🆕 كود الحساب (أو '' لو مالوش)
  function codeOf(raw){
    if(!S.ok) return '';
    var r = resolve(raw);
    return (r && r.c) ? r.c.code : '';
  }
  // 🆕 المحل (من الكشكول) بتاع الاسم ده
  function customer(raw){
    if(!S.ok) return null;
    var r = resolve(raw);
    return (r && r.c) ? r.c : null;
  }
  // 🆕 كل الأشكال اللي اتكتب بيها المحل ده (بما فيها اللي اتدمجت فيه)
  function aliasesOf(id){
    var out = (S.rawByCust[id] || []).slice();
    Object.keys(S.rawByCust).forEach(function(cid){
      if(cid !== String(id) && final(cid) && final(cid).id === id) out = out.concat(S.rawByCust[cid]);
    });
    return out;
  }

  function matches(q){
    var k = norm(q);
    if(!k) return [];
    var ks = k.replace(/ /g, '');
    var out = [];
    S.list.forEach(function(x){
      var score = 0;
      if(x.k === k) score = 4;
      else if(x.k.indexOf(k) === 0) score = 3;
      else if(x.k.indexOf(k) > 0) score = 2;
      else if(x.k.replace(/ /g, '').indexOf(ks) >= 0) score = 1;
      else if(x.c.code.toLowerCase().indexOf(q.toLowerCase().trim()) >= 0) score = 1;
      if(score) out.push({ c: x.c, s: score });
    });
    // أشكال الاسم التانية («حفيله») بتوصل للمحل كمان
    Object.keys(S.alias).forEach(function(a){
      if(a.indexOf(k) !== 0) return;
      var c = final(S.alias[a]);
      if(c && c.code !== 'R-001' && !out.some(function(o){ return o.c.id === c.id; })) out.push({ c: c, s: 2 });
    });
    return out.sort(function(a, b){ return b.s - a.s || a.c.name.length - b.c.name.length; }).slice(0, 8).map(function(o){ return o.c; });
  }

  // ---------- الشكل ----------
  function css(){
    if(document.getElementById('ifxShopCss')) return;
    var st = document.createElement('style');
    st.id = 'ifxShopCss';
    st.textContent =
      '.ifx-sp-menu{margin-top:4px;border:1px solid #D7DEE7;border-radius:11px;background:#fff;overflow:hidden;box-shadow:0 8px 22px rgba(16,24,40,.12);}'
      + '.ifx-sp-menu[hidden]{display:none;}'
      + '.ifx-sp-it{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;border:none;background:none;'
      +   'padding:10px 12px;font:inherit;font-size:14.5px;color:#17222E;text-align:start;cursor:pointer;}'
      + '.ifx-sp-it + .ifx-sp-it{border-top:1px solid #EEF1F4;}'
      + '.ifx-sp-it:hover,.ifx-sp-it.on{background:#EAF1F8;}'
      + '.ifx-sp-code{font-family:ui-monospace,Menlo,monospace;font-size:11.5px;color:#6B7A8C;direction:ltr;}'
      + '.ifx-sp-st{font-size:12px;font-weight:700;line-height:1.6;margin-top:4px;}'
      + '.ifx-sp-st.ok{color:#15803D;} .ifx-sp-st.new{color:#B5651D;} .ifx-sp-st.ret{color:#2B6CB0;}'
      + 'html[data-theme="dark"] .ifx-sp-menu{background:#1B2A3A;border-color:#2F4356;}'
      + 'html[data-theme="dark"] .ifx-sp-it{color:#E9EFF5;}'
      + 'html[data-theme="dark"] .ifx-sp-it + .ifx-sp-it{border-top-color:#2F4356;}'
      + 'html[data-theme="dark"] .ifx-sp-it:hover,html[data-theme="dark"] .ifx-sp-it.on{background:rgba(123,169,220,.15);}'
      + 'html[data-theme="dark"] .ifx-sp-code{color:#92A6B8;}'
      + 'html[data-theme="dark"] .ifx-sp-st.ok{color:#4ADE80;} html[data-theme="dark"] .ifx-sp-st.new{color:#E0A15C;} html[data-theme="dark"] .ifx-sp-st.ret{color:#7BA9DC;}';
    document.head.appendChild(st);
  }

  function statusHtml(r, typed){
    if(!r) return '';
    if(r.kind === 'retail') return '<div class="ifx-sp-st ret">🛍️ زبون قطاعي (زباين المحل)</div>';
    if(r.kind === 'known'){
      var diff = norm(typed) !== norm(r.c.name) || String(typed).trim() !== r.c.name;
      return '<div class="ifx-sp-st ok">✅ ' + esc(r.c.name) + ' <span class="ifx-sp-code">' + esc(r.c.code) + '</span>'
        + (r.c.kind === 'acquisition' ? ' · 🤝 استحواذ' : '')
        + (diff ? ' — هيتسجّل بالاسم ده' : '') + '</div>';
    }
    return '<div class="ifx-sp-st new">🆕 محل جديد — هيتعمل له كود. لو هو محل موجود اختاره من القايمة.</div>';
  }

  // ---------- الربط بالخانة ----------
  function attach(inp){
    if(!inp || inp.__ifxShop) return;
    inp.__ifxShop = true;
    css();
    // ⚠️ بنشيل الـ datalist بتاع المتصفح — وإلا هيطلع قايمتين فوق بعض
    if(inp.hasAttribute('list')){ inp.dataset.ifxList = inp.getAttribute('list'); inp.removeAttribute('list'); }
    var menu = document.createElement('div'); menu.className = 'ifx-sp-menu'; menu.hidden = true;
    var st = document.createElement('div');
    inp.insertAdjacentElement('afterend', st);
    inp.insertAdjacentElement('afterend', menu);
    var cur = [], hi = -1;

    function paintStatus(){
      if(!S.ok){ st.innerHTML = ''; return; }
      var r = resolve(inp.value);
      // لسه بيكتب وفيه محلات شبهه في القايمة؟ مش هنقول «جديد» قبل ما يخلّص
      if(r && r.kind === 'new' && matches(inp.value).length){
        st.innerHTML = '<div class="ifx-sp-st ret">👆 اختار المحل من القايمة — أو كمّل الاسم لو محل جديد</div>';
        return;
      }
      st.innerHTML = statusHtml(r, inp.value);
    }
    function paintMenu(){
      if(!S.ok || inp.readOnly || inp.disabled){ menu.hidden = true; return; }
      cur = matches(inp.value);
      var r = resolve(inp.value);
      // الاسم مكتوب صح بالظبط ومفيش غيره؟ مش محتاجين قايمة
      if(r && r.kind === 'known' && cur.length === 1 && cur[0].id === r.c.id && inp.value.trim() === r.c.name) cur = [];
      if(!cur.length){ menu.hidden = true; return; }
      hi = Math.min(hi, cur.length - 1);
      menu.innerHTML = cur.map(function(c, i){
        return '<button type="button" class="ifx-sp-it' + (i === hi ? ' on' : '') + '" data-i="' + i + '">'
          + '<span>' + (c.kind === 'acquisition' ? '🤝 ' : '🏪 ') + esc(c.name) + '</span><span class="ifx-sp-code">' + esc(c.code) + '</span></button>';
      }).join('');
      menu.hidden = false;
    }
    function pick(c){
      if(!c) return;
      inp.value = c.name;
      menu.hidden = true; hi = -1;
      paintStatus();
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // ⚠️ mousedown مش click: عشان الخانة ماتفقدش التركيز قبل الاختيار
    //    (تفاصيل الجهاز بتحفظ على blur — فالحفظ يحصل بالاسم الصح بعدين)
    menu.addEventListener('mousedown', function(e){
      var b = e.target.closest('.ifx-sp-it'); if(!b) return;
      e.preventDefault(); pick(cur[+b.dataset.i]);
    });
    menu.addEventListener('touchstart', function(e){
      var b = e.target.closest('.ifx-sp-it'); if(!b) return;
      e.preventDefault(); pick(cur[+b.dataset.i]);
    }, { passive: false });
    inp.addEventListener('input', function(){ hi = -1; paintMenu(); paintStatus(); });
    inp.addEventListener('focus', function(){ load().then(function(){ paintMenu(); paintStatus(); }); });
    inp.addEventListener('keydown', function(e){
      if(menu.hidden || !cur.length) return;
      if(e.key === 'ArrowDown'){ e.preventDefault(); hi = (hi + 1) % cur.length; paintMenu(); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); hi = (hi - 1 + cur.length) % cur.length; paintMenu(); }
      else if(e.key === 'Enter' && hi >= 0){ e.preventDefault(); pick(cur[hi]); }
      else if(e.key === 'Escape'){ menu.hidden = true; }
    });
    // 🔁 توحيد الاسم: «حفيله » ← «حفيلة» — على change (بيحصل **قبل** blur،
    //    فالشاشة اللي بتحفظ على blur بتاخد الاسم الرسمي)
    function unify(){
      if(!S.ok) return;
      var r = resolve(inp.value);
      if(r && r.kind === 'known' && inp.value !== r.c.name){ inp.value = r.c.name; paintStatus(); }
    }
    inp.addEventListener('change', unify);
    inp.addEventListener('blur', function(){ setTimeout(function(){ menu.hidden = true; }, 120); });
    load().then(paintStatus);
  }

  // 🔌 أي خانة محل تتلمس → تتربط (حتى اللي بتتبني بعد ما الصفحة تحمّل)
  document.addEventListener('focusin', function(e){
    var t = e.target;
    if(t && t.matches && t.matches(SEL)) attach(t);
  }, true);
  // 🔁 قبل أي حفظ بزرار — نوحّد الاسم
  document.addEventListener('pointerdown', function(e){
    if(!S.ok) return;
    var b = e.target && e.target.closest && e.target.closest('button');
    if(!b) return;
    document.querySelectorAll(SEL).forEach(function(inp){
      if(!inp.__ifxShop) return;
      var r = resolve(inp.value);
      if(r && r.kind === 'known' && inp.value !== r.c.name) inp.value = r.c.name;
    });
  }, true);

  window.IFixShops = {
    load: load, resolve: resolve, attach: attach, norm: norm,
    // 🆕 لشاشة الحسابات
    ready: function(){ return S.ok; },
    canon: canon, codeOf: codeOf, customer: customer, aliasesOf: aliasesOf,
    list: function(){ return S.list.map(function(x){ return x.c; }); }
  };
  // تحميل بدري في الخلفية — عشان أول ما الموظف يفتح الفورم القايمة تبقى جاهزة
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(load, 1500); });
  else setTimeout(load, 1500);
})();
