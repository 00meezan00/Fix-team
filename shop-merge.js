// ============================================================
// I Fix Team — 🔗 دمج المحلات (shop-merge.js) — نسخة الإنتاج (مؤقت)
// ------------------------------------------------------------
// 🧸 بالبلدي:
//    نفس أدوات الدمج بتاعة صفحة «حسابات العملاء» في الاستيجنج،
//    بس جوه شباك واحد بيتفتح من شاشة «🧾 الحسابات» — للمحاسب العام بس.
//    فيه ٤ تابات:
//      🔗 ممكن نفس     — السيستم بيدوّر لوحده على أسامي شبه بعض
//                         (نفس الاسم لو شلنا المسافات، أو فرق حرف واحد).
//                         تختار تسيب أنهي اسم، أو «مختلفين».
//      🟡 محتاج مراجعة — أي اسم محل جديد اتعمله كود لوحده. يا «✅ محل
//                         جديد صح» يا «🔗 ده هو…» وتختار المحل.
//      🏪 المحلات       — دوّر على أي محل: أشكال اسمه · ➕ اسم تاني ·
//                         🔗 ادمجه · ✏️ الاسم الرسمي.
//      📜 الدمج         — كل دمج اتعمل، و«↩️ فك الدمج».
//
// 🗄️ السيرفر: prod-shop-codes.sql (customer_merge · customer_unmerge ·
//    customer_rename) + prod-shop-merge.sql (customer_mark_reviewed ·
//    customer_alias_add · customer_shop_stats). كله للمحاسب العام بس.
// ⚠️ الدمج مابيغيّرش ولا حرف في الأجهزة ولا الدفتر — الحسابات بتتجمّع
//    في الشاشة بس (accounts.js). فك الدمج بيرجّع كل حاجة زي ما كانت.
// ⚠️ «مختلفين» بيتحفظ على الموبايل/الكمبيوتر ده بس (نفس مفتاح
//    الاستيجنج ifix-cust-ign) — زي الاستيجنج بالظبط.
// ⚠️ بيستخدم من الداشبورد: sb · isSuperAdmin · IFixShops · accShopsReload
//    · openAccounts — كلهم بـ typeof عشان مايوقّعش الصفحة.
// ============================================================
(function(){
  if(window.ShopMerge) return;

  var IGN_KEY = 'ifix-cust-ign';
  var M = { tab:'pairs', q:'', C:[], A:[], LOG:[], ST:{}, loaded:false, busy:false, err:'', pairs:null, limit:60 };
  var IGN = new Set();
  try{ IGN = new Set(JSON.parse(localStorage.getItem(IGN_KEY) || '[]')); }catch(e){}
  function saveIgn(){ try{ localStorage.setItem(IGN_KEY, JSON.stringify(Array.from(IGN))); }catch(e){} }

  // ---------- أدوات ----------
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]; }); }
  // نفس تبسيط السيرفر (erp_norm) — لازم الاتنين يطلعوا نفس النتيجة
  function norm(t){
    return String(t || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ـ/g, '')
      .replace(/[\s!-\/:-@\[-`{-~،؛؟«»]+/g, ' ').trim();
  }
  function fmt(n){ return (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-EG'); }
  function dtt(iso){ try{ return new Date(iso).toLocaleString('ar-EG', { day:'numeric', month:'numeric', year:'2-digit', hour:'numeric', minute:'2-digit', timeZone:'Africa/Cairo' }); }catch(e){ return ''; } }
  function isBoss(){ try{ return typeof isSuperAdmin === 'function' && isSuperAdmin(); }catch(e){ return false; } }
  var toastT;
  function toast(msg, bad){
    var el = $('smgToast'); if(!el) return;
    el.textContent = msg; el.className = 'smg-toast on' + (bad ? ' bad' : '');
    clearTimeout(toastT); toastT = setTimeout(function(){ el.className = 'smg-toast'; }, bad ? 5200 : 2800);
  }
  // ⚠️ Supabase مابيرميش خطأ — بيرجّعه في .error. هنا بنرميه بصوت عالي.
  async function rpc(name, args){
    if(!navigator.onLine) throw new Error('مفيش نت — العملية دي محتاجة اتصال');
    var r = await sb.rpc(name, args || {});
    if(r.error) throw r.error;
    return r.data;
  }
  async function sel(table, cols, build){
    var all = [], from = 0;
    for(;;){
      var q = sb.from(table).select(cols).range(from, from + 999);
      if(build) q = build(q);
      var r = await q;
      if(r.error) throw r.error;
      all = all.concat(r.data || []);
      if(!r.data || r.data.length < 1000) break;
      from += 1000;
    }
    return all;
  }
  function errMsg(e){
    var m = (e && (e.message || e.hint)) || String(e);
    if(/customer_mark_reviewed|customer_alias_add|customer_shop_stats/i.test(m) && /schema cache|does not exist|PGRST20/i.test(m)) return m + ' — (prod-shop-merge.sql لسه ما اتشغّلش؟)';
    if(/customer|erp_|schema cache|does not exist|PGRST20/i.test(m)) return m + ' — (prod-shop-codes.sql لسه ما اتشغّلش؟)';
    return m;
  }

  // ============================================================
  // 📥 التحميل
  // ============================================================
  async function load(manual){
    if(M.busy) return;
    M.busy = true;
    try{
      var res = await Promise.all([
        sel('customers', 'id,code,name,kind,active,merged_into,reviewed,auto_created,created_at', function(q){ return q.order('code'); }),
        sel('customer_aliases', 'alias_norm,customer_id,sample_raw,source'),
        sel('customer_merge_log', 'id,from_id,into_id,aliases,reason,by_email,at,undone_at,undone_by,undo_reason', function(q){ return q.order('at', { ascending:false }); })
      ]);
      M.C = res[0]; M.A = res[1]; M.LOG = res[2];
      // 📊 الأرقام (أجهزة · حركات · رصيد) — لو الملف الجديد ما اتشغّلش، الشباك بيشتغل من غيرها
      M.ST = {};
      try{ (await rpc('customer_shop_stats') || []).forEach(function(x){ M.ST[x.id] = x; }); M.stErr = ''; }
      catch(e){ M.stErr = errMsg(e); }
      M.loaded = true; M.err = ''; M.pairs = null;
      if(manual) toast('اتحدّثت ✅');
    }catch(e){
      console.error('[دمج المحلات] التحميل فشل:', e);
      M.err = errMsg(e);
    }finally{ M.busy = false; }
    render();
  }
  // بعد أي تغيير: الشباك + الكشكول + شاشة الحسابات
  async function afterChange(){
    await load();
    try{
      if(typeof accShopsReload === 'function') await accShopsReload();
      else if(window.IFixShops) await IFixShops.load(true);
    }catch(e){}
  }

  // ============================================================
  // 🧮 حسابات
  // ============================================================
  function byId(id){ for(var i = 0; i < M.C.length; i++) if(M.C[i].id === id) return M.C[i]; return null; }
  function live(){ return M.C.filter(function(c){ return !c.merged_into; }); }
  function shops(){ return live().filter(function(c){ return c.code !== 'R-001'; }); }
  function aliasesOf(id){ return M.A.filter(function(a){ return a.customer_id === id; }); }
  function st(id){ return M.ST[id] || { devices:0, entries:0, balance:0 }; }
  function needReview(){ return shops().filter(function(c){ return c.auto_created && !c.reviewed; }); }

  // 🔍 فرق حرف واحد بالظبط (زيادة · ناقص · متغيّر) — نفس الاستيجنج
  function lev1(a, b){
    if(a === b) return true;
    var la = a.length, lb = b.length;
    if(Math.abs(la - lb) > 1) return false;
    var i = 0, j = 0, diff = 0;
    while(i < la && j < lb){
      if(a[i] === b[j]){ i++; j++; continue; }
      if(++diff > 1) return false;
      if(la > lb) i++; else if(lb > la) j++; else { i++; j++; }
    }
    return diff + (la - i) + (lb - j) <= 1;
  }
  function pairs(){
    var L = shops().map(function(c){ return { c:c, k:norm(c.name).replace(/ /g, '') }; });
    var out = [];
    for(var i = 0; i < L.length; i++){
      for(var j = i + 1; j < L.length; j++){
        var a = L[i], b = L[j];
        if(a.k.length < 4 || b.k.length < 4) continue;
        var same = a.k === b.k;
        if(!same && !lev1(a.k, b.k)) continue;
        var key = [a.c.id, b.c.id].sort().join('|');
        if(IGN.has(key)) continue;
        out.push({ a:a.c, b:b.c, key:key, why: same ? 'نفس الاسم لو شلنا المسافات' : 'فرق حرف واحد' });
      }
    }
    return out.sort(function(x, y){ return x.why === y.why ? 0 : (x.why.indexOf('نفس') === 0 ? -1 : 1); });
  }
  // 💡 «شبهه» — للدمج من المراجعة أو من أي محل
  function suggestFor(c){
    var k = norm(c.name).replace(/ /g, '');
    if(k.length < 3) return [];
    return shops().filter(function(x){ return x.id !== c.id; }).map(function(x){
      var xk = norm(x.name).replace(/ /g, '');
      var s = xk === k ? 3 : lev1(xk, k) ? 2 : ((xk.indexOf(k) >= 0 || k.indexOf(xk) >= 0) && Math.min(xk.length, k.length) >= 4) ? 1 : 0;
      return { x:x, s:s };
    }).filter(function(o){ return o.s; }).sort(function(a, b){ return b.s - a.s; }).map(function(o){ return o.x; });
  }
  function matches(c, q){
    if(!q) return true;
    var n = norm(q);
    if(c.code.toLowerCase().indexOf(q.toLowerCase()) >= 0) return true;
    if(norm(c.name).indexOf(n) >= 0) return true;
    return aliasesOf(c.id).some(function(a){ return a.alias_norm.indexOf(n) >= 0; });
  }

  // ============================================================
  // 🖼️ الشباك
  // ============================================================
  function ensureDom(){
    if($('smgOv')) return;
    var css = document.createElement('style'); css.id = 'smgCss';
    css.textContent =
      '#smgOv{position:fixed;inset:0;z-index:9000;background:var(--bg,#F3F5F7);overflow-y:auto;color:var(--ink,#1A2332);}' +
      '#smgOv.hidden{display:none;}' +
      '.smg-top{position:sticky;top:0;z-index:2;background:var(--surface,#fff);border-bottom:1px solid var(--border,#E2E8F0);padding:calc(env(safe-area-inset-top,0px) + 12px) 16px 0;}' +
      '.smg-row{display:flex;align-items:center;justify-content:space-between;gap:10px;}' +
      '.smg-top h2{margin:0;font-size:18px;font-weight:900;}' +
      '.smg-x{border:1px solid var(--border,#E2E8F0);background:var(--surface-2,#F8FAFC);color:var(--ink,#1A2332);border-radius:10px;width:40px;height:40px;font-size:20px;cursor:pointer;}' +
      '.smg-tabs{display:flex;gap:6px;overflow-x:auto;padding:12px 0 10px;scrollbar-width:none;}' +
      '.smg-tab{flex:none;border:1.5px solid var(--border,#E2E8F0);background:var(--surface-2,#F8FAFC);color:var(--ink,#1A2332);border-radius:999px;padding:8px 13px;font:inherit;font-weight:800;font-size:13px;cursor:pointer;white-space:nowrap;}' +
      '.smg-tab.on{background:var(--ink,#1A2332);color:var(--surface,#fff);border-color:var(--ink,#1A2332);}' +
      '.smg-tab .n{display:inline-block;min-width:18px;margin-inline-start:4px;border-radius:9px;padding:0 5px;background:#DC2626;color:#fff;font-size:11px;line-height:18px;text-align:center;}' +
      '.smg-wrap{max-width:820px;margin:0 auto;padding:14px 14px calc(env(safe-area-inset-bottom,0px) + 40px);}' +
      '.smg-hint{font-size:13px;color:var(--muted,#64748B);line-height:1.8;margin:0 2px 12px;}' +
      '.smg-empty{background:var(--surface,#fff);border:1px dashed var(--border,#E2E8F0);border-radius:13px;padding:26px 14px;text-align:center;color:var(--muted,#64748B);font-size:14px;}' +
      '.smg-err{background:#FEF2F2;color:#B91C1C;border-radius:12px;padding:12px 14px;font-size:13px;font-weight:700;line-height:1.8;margin-bottom:12px;word-break:break-word;}' +
      '.smg-card{background:var(--surface,#fff);border:1px solid var(--border,#E2E8F0);border-inline-start:4px solid var(--edge,var(--border,#E2E8F0));border-radius:13px;padding:11px 13px;margin-bottom:9px;}' +
      '.smg-card.review{--edge:#D97706;} .smg-card.off{opacity:.6;}' +
      'button.smg-card{display:block;width:100%;text-align:start;color:var(--ink,#1A2332);font:inherit;cursor:pointer;}' +
      '.smg-t{font-weight:900;font-size:15px;line-height:1.5;word-break:break-word;}' +
      '.smg-s{font-size:12.5px;color:var(--muted,#64748B);margin-top:3px;line-height:1.7;}' +
      '.smg-code{font-family:ui-monospace,Menlo,monospace;font-size:12px;font-weight:700;color:var(--muted,#64748B);direction:ltr;unicode-bidi:isolate;}' +
      '.smg-pair{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;}' +
      '.smg-side{background:var(--surface-2,#F8FAFC);border-radius:10px;padding:8px 10px;min-width:0;}' +
      '.smg-vs{font-weight:900;color:var(--muted,#64748B);}' +
      '.smg-acts{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px;}' +
      '.smg-btn{flex:1 1 auto;border:1px solid var(--border,#E2E8F0);background:var(--surface-2,#F8FAFC);color:var(--ink,#1A2332);border-radius:10px;padding:10px;font:inherit;font-size:13px;font-weight:800;cursor:pointer;}' +
      '.smg-btn.ok{background:#15803D;border-color:#15803D;color:#fff;}' +
      '.smg-btn.pri{background:#6D28D9;border-color:#6D28D9;color:#fff;}' +
      '.smg-btn.bad{color:#DC2626;border-color:#FCA5A5;}' +
      '.smg-btn.sm{flex:0 0 auto;padding:7px 10px;font-size:12px;}' +
      '.smg-btn:disabled{opacity:.5;cursor:default;}' +
      '.smg-search{width:100%;box-sizing:border-box;border:1px solid var(--border,#E2E8F0);background:var(--surface,#fff);color:var(--ink,#1A2332);border-radius:12px;padding:12px 13px;font:inherit;font-size:16px;margin-bottom:10px;}' +
      '.smg-alias{display:inline-flex;align-items:center;gap:4px;background:var(--surface-2,#F8FAFC);border:1px solid var(--border,#E2E8F0);border-radius:9px;padding:5px 9px;margin:4px 0 0 4px;font-size:13px;font-weight:700;}' +
      '.smg-alias small{color:var(--muted,#64748B);font-weight:700;}' +
      '.smg-sec{font-weight:900;font-size:14px;margin:16px 2px 8px;}' +
      '.smg-pick{display:block;width:100%;text-align:start;border:1px solid var(--border,#E2E8F0);background:var(--surface,#fff);color:var(--ink,#1A2332);border-radius:10px;padding:10px 11px;margin-top:6px;font:inherit;font-size:13.5px;cursor:pointer;}' +
      '.smg-pick.on{border-color:#6D28D9;background:rgba(109,40,217,.08);}' +
      '.smg-warn{background:#FFFBEB;color:#92400E;border:1px solid #FDE68A;border-radius:11px;padding:10px 12px;font-size:13px;font-weight:700;line-height:1.8;margin-bottom:12px;}' +
      '.smg-lbl{display:block;font-size:13px;font-weight:800;color:var(--ink-2,#475569);margin:10px 0 5px;}' +
      '.smg-sheet-ov{position:fixed;inset:0;z-index:9100;background:rgba(8,14,20,.55);display:flex;align-items:flex-end;justify-content:center;}' +
      '.smg-sheet{width:100%;max-width:640px;max-height:92dvh;overflow-y:auto;background:var(--bg,#F3F5F7);border-radius:18px 18px 0 0;padding:0 0 calc(env(safe-area-inset-bottom,0px) + 22px);}' +
      '.smg-sh{position:sticky;top:0;background:var(--bg,#F3F5F7);display:flex;align-items:center;gap:10px;padding:14px 16px 10px;border-bottom:1px solid var(--border,#E2E8F0);}' +
      '.smg-sh h3{flex:1;margin:0;font-size:16px;font-weight:900;word-break:break-word;}' +
      '.smg-sb{padding:14px 16px;}' +
      '.smg-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 22px);transform:translateX(-50%);z-index:9200;background:#16233A;color:#fff;border-radius:12px;padding:12px 16px;font-weight:800;font-size:13.5px;box-shadow:0 12px 30px rgba(0,0,0,.3);opacity:0;pointer-events:none;transition:opacity .25s;max-width:90vw;text-align:center;}' +
      '.smg-toast.on{opacity:1;} .smg-toast.bad{background:#DC2626;}' +
      '@media (max-width:820px){#smgOv input,.smg-sheet input{font-size:16px !important;}}';
    document.head.appendChild(css);
    var ov = document.createElement('div');
    ov.id = 'smgOv'; ov.className = 'hidden'; ov.setAttribute('dir', 'rtl');
    ov.innerHTML = '<div class="smg-top"><div class="smg-row"><h2>🔗 دمج المحلات</h2>' +
      '<div style="display:flex;gap:8px;"><button class="smg-x" title="تحديث" onclick="ShopMerge.reload()">↻</button>' +
      '<button class="smg-x" onclick="ShopMerge.close()">×</button></div></div>' +
      '<div class="smg-tabs" id="smgTabs"></div></div><div class="smg-wrap" id="smgApp"></div>';
    document.body.appendChild(ov);
    var t = document.createElement('div'); t.id = 'smgToast'; t.className = 'smg-toast';
    document.body.appendChild(t);
  }

  function render(){
    if(!$('smgOv')) return;
    if(M.loaded && M.pairs === null) M.pairs = pairs();
    var tl = [
      { k:'pairs', l:'🔗 ممكن نفس', n: M.loaded ? M.pairs.length : 0 },
      { k:'review', l:'🟡 محتاج مراجعة', n: M.loaded ? needReview().length : 0 },
      { k:'list', l:'🏪 المحلات' },
      { k:'log', l:'📜 الدمج' }
    ];
    $('smgTabs').innerHTML = tl.map(function(x){
      return '<button class="smg-tab' + (M.tab === x.k ? ' on' : '') + '" onclick="ShopMerge.go(\'' + x.k + '\')">' + x.l +
        (x.n ? '<span class="n">' + x.n + '</span>' : '') + '</button>';
    }).join('');
    var app = $('smgApp');
    if(!M.loaded){
      app.innerHTML = M.err ? '<div class="smg-err">⚠️ ' + esc(M.err) + '</div><button class="smg-btn" onclick="ShopMerge.reload()">↻ جرّب تاني</button>'
                            : '<div class="smg-empty">⏳ جاري التحميل…</div>';
      return;
    }
    var head = (M.err ? '<div class="smg-err">⚠️ آخر تحديث فشل: ' + esc(M.err) + '</div>' : '')
      + (M.stErr ? '<div class="smg-warn">📊 عدد الأجهزة والرصيد مش ظاهرين: ' + esc(M.stErr) + '</div>' : '');
    var V = { pairs: viewPairs, review: viewReview, list: viewList, log: viewLog };
    app.innerHTML = head + (V[M.tab] || viewPairs)();
  }
  function statLine(c){
    var s = st(c.id);
    return '<span class="smg-code">' + esc(c.code) + '</span> · 📱 ' + (s.devices || 0) + ' جهاز · 📒 ' + (s.entries || 0) + ' حركة · ' + fmt(s.balance) + ' ج.م';
  }

  // ---------- 🔗 ممكن نفس ----------
  function sideHtml(c){
    return '<div class="smg-side"><div style="font-weight:900;word-break:break-word;">' + esc(c.name) + '</div><div class="smg-s">' + statLine(c) + '</div></div>';
  }
  function viewPairs(){
    var P = M.pairs || [];
    return '<div class="smg-hint">أسامي شبه بعض أوي. لو هما نفس المحل اختار الاسم اللي هيفضل — التاني هيتدمج فيه بكل أشكال اسمه، وحسابهم يبقى واحد. ' +
      'لو محلين مختلفين دوس «مختلفين» ومش هيتسألوا تاني على الجهاز ده.</div>' +
      (P.length ? P.map(function(p, i){
        return '<div class="smg-card"><div class="smg-pair">' + sideHtml(p.a) + '<div class="smg-vs">⇄</div>' + sideHtml(p.b) + '</div>' +
          '<div class="smg-s" style="margin-top:6px;">💡 ' + p.why + '</div>' +
          '<div class="smg-acts"><button class="smg-btn" onclick="ShopMerge.pairMerge(' + i + ',\'b\',\'a\')">⬅️ خلّي «' + esc(p.a.name) + '»</button>' +
          '<button class="smg-btn" onclick="ShopMerge.pairMerge(' + i + ',\'a\',\'b\')">خلّي «' + esc(p.b.name) + '» ➡️</button>' +
          '<button class="smg-btn sm" onclick="ShopMerge.pairIgnore(' + i + ')">مختلفين</button></div></div>';
      }).join('') : '<div class="smg-empty">✨ مفيش أسامي شبه بعض</div>');
  }
  async function pairMerge(i, from, into){
    var p = (M.pairs || [])[i]; if(!p) return;
    var f = p[from], t = p[into];
    var why = prompt('🔗 «' + f.name + '» (' + f.code + ') هيتدمج في «' + t.name + '» (' + t.code + ')\nكل أشكال اسمه هتروح له، وحسابهم يبقى واحد.\n\nاكتب السبب:', 'نفس المحل — اتكتب بطريقتين');
    if(why === null) return;
    await doMerge(f.id, t.id, why);
  }
  function pairIgnore(i){
    var p = (M.pairs || [])[i]; if(!p) return;
    IGN.add(p.key); saveIgn(); M.pairs = null; render(); toast('👍 مش هيتسألوا تاني');
  }

  // ---------- 🟡 محتاج مراجعة ----------
  function viewReview(){
    var L = needReview().sort(function(a, b){ return new Date(b.created_at) - new Date(a.created_at); });
    return '<div class="smg-hint">دول أسامي محلات جديدة اتكتبت على جهاز أو في الحسابات، والسيستم عمل لكل واحد كود لوحده. ' +
      'لو المحل جديد فعلاً دوس «✅ محل جديد صح». لو هو نفس محل موجود بس اتكتب غلط، دوس «🔗 ده هو…» واختار المحل.</div>' +
      (L.length ? L.map(function(c){
        var sg = suggestFor(c).slice(0, 3);
        return '<div class="smg-card review"><div class="smg-t">' + esc(c.name) + '</div>' +
          '<div class="smg-s">' + statLine(c) + ' · اتعمل ' + dtt(c.created_at) + '</div>' +
          (sg.length ? '<div class="smg-s">💡 شبه: <b>' + sg.map(function(x){ return esc(x.name); }).join(' · ') + '</b></div>' : '') +
          '<div class="smg-acts"><button class="smg-btn ok" onclick="ShopMerge.markReviewed(\'' + c.id + '\')">✅ محل جديد صح</button>' +
          '<button class="smg-btn" onclick="ShopMerge.openMerge(\'' + c.id + '\')">🔗 ده هو…</button>' +
          '<button class="smg-btn sm" onclick="ShopMerge.openShop(\'' + c.id + '\')">✏️</button></div></div>';
      }).join('') : '<div class="smg-empty">✨ مفيش أسامي جديدة مستنية مراجعة</div>');
  }
  async function markReviewed(id){
    var c = byId(id); if(!c) return;
    try{ await rpc('customer_mark_reviewed', { p_id:id }); toast('✅ «' + c.name + '» محل جديد'); await load(); }
    catch(e){ toast(errMsg(e), true); }
  }

  // ---------- 🏪 المحلات ----------
  function viewList(){
    return '<input class="smg-search" id="smgQ" type="search" placeholder="🔍 دوّر بالاسم أو الكود أو أي شكل للاسم…" value="' + esc(M.q) + '" oninput="ShopMerge.q(this.value)">' +
      '<div id="smgListHost">' + listHtml() + '</div>';
  }
  function listHtml(){
    var q = M.q.trim();
    var L = shops().filter(function(c){ return matches(c, q); })
      .sort(function(a, b){ return (st(b.id).entries + st(b.id).devices) - (st(a.id).entries + st(a.id).devices) || a.code.localeCompare(b.code); });
    if(!L.length) return '<div class="smg-empty">مفيش نتايج</div>';
    var shown = L.slice(0, M.limit);
    return '<div class="smg-hint">' + L.length + ' محل' + (L.length > shown.length ? ' — ظاهر أول ' + shown.length : '') + '</div>' +
      shown.map(function(c){
        var al = aliasesOf(c.id).length;
        return '<button class="smg-card' + (c.auto_created && !c.reviewed ? ' review' : '') + '" onclick="ShopMerge.openShop(\'' + c.id + '\')">' +
          '<div class="smg-t">' + esc(c.name) + (c.auto_created && !c.reviewed ? ' 🟡' : '') + '</div>' +
          '<div class="smg-s">' + statLine(c) + (al > 1 ? ' · ' + al + ' شكل للاسم' : '') + '</div></button>';
      }).join('') +
      (L.length > shown.length ? '<button class="smg-btn" style="width:100%;" onclick="ShopMerge.more()">⬇️ اعرض أكتر (' + (L.length - shown.length) + ' فاضلين)</button>' : '');
  }
  var SRC = { review:'من المراجعة', auto:'اتعمل لوحده', merge:'من دمج', manual:'إنت ضفته' };
  function openShop(id){
    var c = byId(id); if(!c) return;
    var al = aliasesOf(c.id);
    var merged = M.C.filter(function(x){ return x.merged_into === c.id; });
    sheet(c.name + ' — ' + c.code,
      '<div class="smg-card"><div class="smg-s">' + statLine(c) + '</div></div>' +
      (c.auto_created && !c.reviewed ? '<div class="smg-warn">🟡 الاسم ده اتعمل له كود لوحده — لو محل جديد فعلاً دوس «✅ محل جديد صح»، ولو هو نفس محل موجود ادمجه.</div>' : '') +
      '<div class="smg-sec">🔤 أشكال الاسم</div>' +
      '<div class="smg-hint" style="margin-bottom:4px;">أي اسم من دول يتكتب على جهاز أو في الحسابات بيروح للمحل ده. (أ/ا · ى/ي · ة/ه · المسافات · كابيتال/سمول كلهم واحد.)</div>' +
      '<div>' + (al.map(function(a){ return '<span class="smg-alias">' + esc(a.sample_raw || a.alias_norm) + ' <small>' + (SRC[a.source] || a.source || '') + '</small></span>'; }).join('') || '<div class="smg-empty">مفيش</div>') + '</div>' +
      (merged.length ? '<div class="smg-s" style="margin-top:8px;">🔗 اتدمج فيه: ' + merged.map(function(x){ return esc(x.name) + ' <span class="smg-code">' + esc(x.code) + '</span>'; }).join(' · ') + '</div>' : '') +
      '<label class="smg-lbl" for="smgNewAl">➕ اسم تاني لنفس المحل</label>' +
      '<input class="smg-search" id="smgNewAl" placeholder="مثال: محل حفيلة الجديد" style="margin-bottom:6px;">' +
      '<button class="smg-btn" style="width:100%;" onclick="ShopMerge.addAlias(\'' + c.id + '\')">➕ ضيف الاسم</button>' +
      '<div class="smg-acts" style="margin-top:16px;">' +
        (c.auto_created && !c.reviewed ? '<button class="smg-btn ok" onclick="ShopMerge.markReviewed(\'' + c.id + '\');ShopMerge.closeSheet()">✅ محل جديد صح</button>' : '') +
        '<button class="smg-btn pri" onclick="ShopMerge.openMerge(\'' + c.id + '\')">🔗 ادمجه في محل تاني</button>' +
        '<button class="smg-btn" onclick="ShopMerge.rename(\'' + c.id + '\')">✏️ الاسم الرسمي</button></div>');
  }
  async function addAlias(id){
    var v = String(($('smgNewAl') || {}).value || '').trim();
    if(!v){ toast('اكتب الاسم', true); return; }
    try{ await rpc('customer_alias_add', { p_customer:id, p_alias:v }); toast('➕ اتضاف'); await afterChange(); openShop(id); }
    catch(e){ toast(errMsg(e), true); }
  }
  async function rename(id){
    var c = byId(id); if(!c) return;
    var v = prompt('✏️ الاسم الرسمي لـ ' + c.code + ':\n(الأسامي القديمة هتفضل توصل للحساب ده)', c.name);
    if(v === null) return;
    var nm = v.trim().replace(/\s+/g, ' ');
    if(nm.length < 2 || nm === c.name) return;
    try{ await rpc('customer_rename', { p_id:c.id, p_name:nm }); toast('✏️ اتغيّر'); await afterChange(); openShop(id); }
    catch(e){ toast(errMsg(e), true); }
  }

  // ---------- 📜 الدمج ----------
  function viewLog(){
    return '<div class="smg-hint">كل دمج اتعمل. لو دمج طلع غلط دوس «↩️ فك الدمج» — المحل بيرجع بأشكال اسمه وحسابه لوحده زي ما كان.</div>' +
      (M.LOG.length ? M.LOG.map(function(m){
        var f = byId(m.from_id) || {}, t = byId(m.into_id) || {};
        return '<div class="smg-card' + (m.undone_at ? ' off' : '') + '">' +
          '<div class="smg-t" style="font-size:14px;">' + esc(f.name || '؟') + ' <span class="smg-code">' + esc(f.code || '') + '</span> ← ' +
            esc(t.name || '؟') + ' <span class="smg-code">' + esc(t.code || '') + '</span></div>' +
          '<div class="smg-s">' + dtt(m.at) + ' · ' + esc(m.by_email) + ' · ' + esc(m.reason) + '</div>' +
          (m.undone_at ? '<div class="smg-s">↩️ اتفك ' + dtt(m.undone_at) + ' · ' + esc(m.undone_by) + ' · ' + esc(m.undo_reason) + '</div>'
            : '<div class="smg-acts"><button class="smg-btn bad sm" onclick="ShopMerge.unmerge(' + m.id + ')">↩️ فك الدمج</button></div>') +
          '</div>';
      }).join('') : '<div class="smg-empty">لسه مفيش دمج</div>');
  }
  async function unmerge(id){
    var why = prompt('↩️ ليه بتفك الدمج ده؟ (إجباري)', 'اتدمج بالغلط');
    if(why === null) return;
    if(why.trim().length < 3){ toast('اكتب سبب (٣ حروف على الأقل)', true); return; }
    try{ await rpc('customer_unmerge', { p_merge_id:id, p_reason:why.trim() }); toast('↩️ الدمج اتفك'); await afterChange(); }
    catch(e){ toast(errMsg(e), true); }
  }

  // ============================================================
  // 🔗 الدمج: اختار المحل اللي هيفضل (فيه «شبهه» + بحث)
  // ============================================================
  var MG = { from:null, q:'', sel:null };
  function openMerge(id){
    var c = byId(id); if(!c) return;
    if(c.code === 'R-001'){ toast('مينفعش تدمج عملاء القطاعي في محل', true); return; }
    MG = { from:c, q:'', sel:null };
    sheet('🔗 دمج «' + c.name + '»', mergeHtml());
  }
  function mergeHtml(){
    var f = MG.from, s = st(f.id);
    var sug = suggestFor(f).slice(0, 6);
    var q = MG.q.trim();
    var res = q ? shops().filter(function(x){ return x.id !== f.id && matches(x, q); }).slice(0, 12) : [];
    var pick = function(x){
      return '<button class="smg-pick' + (MG.sel && MG.sel.id === x.id ? ' on' : '') + '" onclick="ShopMerge.pick(\'' + x.id + '\')"><b>' + esc(x.name) + '</b> ' +
        '<span class="smg-s" style="display:inline;">' + statLine(x) + '</span></button>';
    };
    return '<div class="smg-warn">«' + esc(f.name) + '» (' + esc(f.code) + ') هيختفي من القايمة، وكل أشكال اسمه (' + aliasesOf(f.id).length + ') هتروح للمحل اللي هتختاره — ' +
        'فـ' + (s.devices || 0) + ' جهاز و' + (s.entries || 0) + ' حركة هيتحسبوا على حسابه. لو طلع غلط بيتفك من «📜 الدمج».</div>' +
      (MG.sel ? '<div class="smg-sec">🏪 المحل اللي هيفضل</div>' + pick(MG.sel) +
                '<button class="smg-btn sm" style="margin-top:6px;" onclick="ShopMerge.pick(null)">تغيير</button>'
        : (sug.length ? '<div class="smg-sec">💡 شبهه</div>' + sug.map(pick).join('') : '') +
          '<label class="smg-lbl" for="smgPkQ">🔍 أو دوّر على المحل</label>' +
          '<input class="smg-search" id="smgPkQ" type="search" placeholder="اسم أو كود" value="' + esc(MG.q) + '" oninput="ShopMerge.pickQ(this.value)" style="margin-bottom:0;">' +
          '<div id="smgPkRes">' + res.map(pick).join('') + (q && !res.length ? '<div class="smg-s">مفيش نتايج</div>' : '') + '</div>') +
      '<label class="smg-lbl" for="smgWhy">📝 السبب</label>' +
      '<input class="smg-search" id="smgWhy" value="نفس المحل — اتكتب بطريقتين">' +
      '<button class="smg-btn pri" style="width:100%;padding:14px;font-size:15px;" onclick="ShopMerge.mergeGo()"' + (MG.sel ? '' : ' disabled') + '>' +
        (MG.sel ? '🔗 ادمجه في «' + esc(MG.sel.name) + '»' : 'اختار المحل الأول') + '</button>';
  }
  function reMerge(){
    var w = $('smgWhy') ? $('smgWhy').value : null;
    setSheetBody(mergeHtml());
    if(w !== null && $('smgWhy')) $('smgWhy').value = w;
  }
  function pickQ(v){
    MG.q = v;
    var h = $('smgPkRes'); if(!h) return;
    var tmp = document.createElement('div'); tmp.innerHTML = mergeHtml();
    var r = tmp.querySelector('#smgPkRes'); h.innerHTML = r ? r.innerHTML : '';
  }
  async function mergeGo(){
    if(!MG.sel || !MG.from) return;
    var why = String(($('smgWhy') || {}).value || '').trim();
    if(why.length < 3){ toast('اكتب السبب (٣ حروف على الأقل)', true); return; }
    if(!confirm('🔗 «' + MG.from.name + '» ← «' + MG.sel.name + '»\nمتأكد؟')) return;
    await doMerge(MG.from.id, MG.sel.id, why);
  }
  async function doMerge(fromId, intoId, why){
    if(!why || why.trim().length < 3){ toast('اكتب السبب (٣ حروف على الأقل)', true); return; }
    try{
      await rpc('customer_merge', { p_from:fromId, p_into:intoId, p_reason:why.trim() });
      closeSheet();
      var t = byId(intoId);
      toast('🔗 اتدمجوا' + (t ? ' في «' + t.name + '»' : ''));
      await afterChange();
    }catch(e){ toast(errMsg(e), true); }
  }

  // ============================================================
  // 🪟 الشيت الصغير
  // ============================================================
  function sheet(title, body){
    closeSheet();
    var ov = document.createElement('div');
    ov.className = 'smg-sheet-ov'; ov.id = 'smgSheetOv'; ov.setAttribute('dir', 'rtl');
    ov.onclick = function(e){ if(e.target === ov) closeSheet(); };
    ov.innerHTML = '<div class="smg-sheet"><div class="smg-sh"><h3>' + esc(title) + '</h3><button class="smg-x" onclick="ShopMerge.closeSheet()">✕</button></div>' +
      '<div class="smg-sb" id="smgSheetBody">' + body + '</div></div>';
    document.body.appendChild(ov);
  }
  function setSheetBody(html){ var b = $('smgSheetBody'); if(b) b.innerHTML = html; }
  function closeSheet(){ var o = $('smgSheetOv'); if(o) o.remove(); }

  // ============================================================
  // 🚪 فتح / قفل
  // ============================================================
  function open(tab){
    if(!isBoss()){ alert('دمج المحلات للمحاسب العام بس.'); return; }
    if(!navigator.onLine){ alert('محتاج نت.'); return; }
    ensureDom();
    if(tab) M.tab = tab;
    $('smgOv').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    render();
    load();
  }
  function close(){
    closeSheet();
    var o = $('smgOv'); if(o) o.classList.add('hidden');
    document.body.style.overflow = '';
  }
  // دمج محل بعينه (من زرار «🔗 ده نفس محل تاني» في الحسابات)
  async function mergeByName(n){
    open('list');
    var c = null;
    try{ c = (window.IFixShops && IFixShops.ready()) ? IFixShops.customer(n) : null; }catch(e){}
    if(!M.loaded) await load();
    if(c && byId(c.id)) openMerge(c.id);
    else { M.q = String(n || ''); render(); toast('المحل ده لسه مالوش كود — دوّر عليه في القايمة', true); }
  }

  document.addEventListener('keydown', function(e){
    if(e.key !== 'Escape' || !$('smgOv') || $('smgOv').classList.contains('hidden')) return;
    if($('smgSheetOv')) closeSheet(); else close();
  });

  // ============================================================
  // 🔌 التوصيل بشاشة الحسابات
  //   ١) زرار «🔗 دمج المحلات» فوق في شاشة الحسابات (المحاسب العام بس)
  //   ٢) «🔗 ده نفس محل تاني» و«↩️ فك دمج» في كل محل بقوا يفتحوا الشباك ده
  //   ⚠️ بنستنى الصفحة تخلص تحميل — عشان دوال الداشبورد تكون اتعرّفت
  // ============================================================
  function syncBtn(){
    var b = $('accMergeBtn');
    if(!b){
      var head = document.querySelector('#accountsOverlay .modal-head');
      if(!head) return;
      b = document.createElement('button');
      b.id = 'accMergeBtn'; b.type = 'button'; b.className = 'acc-mini-btn';
      b.style.cssText = 'margin:0 auto 0 10px;color:#6D28D9;border-color:#C4B5FD;';
      b.textContent = '🔗 دمج المحلات';
      b.onclick = function(){ open(); };
      var x = head.querySelector('.close-btn');
      head.insertBefore(b, x || null);
    }
    b.style.display = isBoss() ? '' : 'none';
  }
  function wire(){
    if(typeof window.openAccounts === 'function' && !window.openAccounts.__smg){
      var oa = window.openAccounts;
      window.openAccounts = function(){ var r = oa.apply(this, arguments); try{ syncBtn(); }catch(e){} return r; };
      window.openAccounts.__smg = true;
    }
    if(typeof window.accMergeShop === 'function' && !window.accMergeShop.__smg){
      window.accMergeShop = function(n){ return mergeByName(n); };
      window.accMergeShop.__smg = true;
    }
    if(typeof window.accUnmergeShop === 'function' && !window.accUnmergeShop.__smg){
      window.accUnmergeShop = function(){ open('log'); };
      window.accUnmergeShop.__smg = true;
    }
    try{ syncBtn(); }catch(e){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
  window.addEventListener('load', wire);

  window.ShopMerge = {
    open: open, close: close, reload: function(){ load(true); },
    go: function(k){ M.tab = k; M.limit = 60; render(); var o = $('smgOv'); if(o) o.scrollTop = 0; },
    q: function(v){ M.q = v; M.limit = 60; var h = $('smgListHost'); if(h) h.innerHTML = listHtml(); },
    more: function(){ M.limit += 100; var h = $('smgListHost'); if(h) h.innerHTML = listHtml(); },
    pairMerge: pairMerge, pairIgnore: pairIgnore, markReviewed: markReviewed,
    openShop: openShop, addAlias: addAlias, rename: rename, unmerge: unmerge,
    openMerge: openMerge, mergeByName: mergeByName, mergeGo: mergeGo,
    pick: function(id){ MG.sel = id ? byId(id) : null; reMerge(); },
    pickQ: pickQ, closeSheet: closeSheet
  };
})();
