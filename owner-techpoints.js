/* ============================================================
   ⭐ owner-techpoints.js — «نقاط الفنيين» عند المالك (v148)
   ------------------------------------------------------------
   🧸 بالبلدي:
      المالك مابيشوفش كل الأجهزة، فمايقدرش يحسب النقاط بنفسه.
      الداشبورد (المحاسب / المحاسب العام) بيحسبها بنفس حسبة
      «🏆 تقييم الفنيين» وبينشرها جاهزة في
      app_data['tech-board-months'] — النهارده + الشهر ده + ١١ شهر قبله.
      الملف ده بيقرا النسخة دي ويعرضها:
        • زرار «⭐ نقاط الفنيين» في قايمة ⋮ (تحت 🏪 المحل)
        • اختيار الفترة: النهارده · أي شهر من الـ١٢
        • جدول: الترتيب · الفني · النقط · عدد الأجهزة · المرتجعات
      ⚠️ الأرقام بتتحدّث لما حد يكون فاتح الداشبورد — وفوق مكتوب
         «آخر تحديث» عشان المالك يعرف هي من إمتى.
   ⚠️ مكتفي بنفسه: ستايله جواه وبيستعمل ألوان owner.html لو موجودة.
   ============================================================ */
(function(){
  'use strict';
  var DATA = null, ERR = '', SEL = '';

  function esc(t){ return String(t == null ? '' : t).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function num(v){ var n = Math.round(Number(v || 0) * 10) / 10; return n.toLocaleString('en-US'); }
  function monthName(ym){
    try{ return new Date(ym + '-01T12:00:00').toLocaleDateString('ar-EG', { month:'long', year:'numeric' }); }
    catch(e){ return ym; }
  }
  function ago(t){
    var m = Math.round((Date.now() - new Date(t).getTime()) / 60000);
    if(!(m >= 0)) return '';
    if(m < 1) return 'دلوقتي';
    if(m < 60) return 'من ' + m + ' دقيقة';
    var h = Math.round(m / 60);
    if(h < 24) return 'من ' + h + ' ساعة';
    return 'من ' + Math.round(h / 24) + ' يوم';
  }

  function css(){
    if(document.getElementById('otpCss')) return;
    var st = document.createElement('style');
    st.id = 'otpCss';
    st.textContent = [
      '#otpOverlay{position:fixed;inset:0;z-index:80;background:var(--paper,#EBEEF2);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;}',
      '#otpOverlay.hidden{display:none;}',
      '.otp-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(14px + env(safe-area-inset-top)) 16px 14px;background:var(--chrome,#16233A);color:var(--on-chrome,#fff);}',
      '.otp-head h2{margin:0;font-size:17px;font-weight:900;}',
      '.otp-x{border:0;border-radius:12px;width:40px;height:40px;font-size:22px;background:rgba(255,255,255,.12);color:inherit;cursor:pointer;}',
      '.otp-body{padding:14px 16px 40px;max-width:640px;margin:0 auto;}',
      '.otp-sel{width:100%;font:inherit;font-size:15px;padding:11px 12px;border-radius:12px;border:1px solid var(--line,#E4E9EF);background:var(--card,#fff);color:var(--ink,#17222E);}',
      '.otp-at{font-size:12px;color:var(--muted,#6B7A8C);margin:8px 2px 12px;}',
      '.otp-sum{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}',
      '.otp-sum div{background:var(--card,#fff);border:1px solid var(--line,#E4E9EF);border-radius:14px;padding:12px;}',
      '.otp-sum b{display:block;font-size:20px;font-weight:900;color:var(--owner,#8A6410);}',
      '.otp-sum span{font-size:12px;color:var(--muted,#6B7A8C);}',
      '.otp-row{display:flex;align-items:center;gap:10px;background:var(--card,#fff);border:1px solid var(--line,#E4E9EF);border-radius:14px;padding:11px 12px;margin-bottom:8px;}',
      '.otp-rk{flex:none;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;background:var(--paper,#EBEEF2);color:var(--ink,#17222E);font-size:14px;}',
      '.otp-row .m{flex:1;min-width:0;}',
      '.otp-row .m b{font-size:14.5px;}',
      '.otp-row .m small{display:block;color:var(--muted,#6B7A8C);font-size:12px;margin-top:2px;}',
      '.otp-pts{flex:none;text-align:center;}',
      '.otp-pts b{display:block;font-size:19px;font-weight:900;color:var(--owner,#8A6410);}',
      '.otp-pts small{font-size:11px;color:var(--muted,#6B7A8C);}',
      '.otp-empty{text-align:center;color:var(--muted,#6B7A8C);padding:40px 10px;line-height:1.9;}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function ensureUi(){
    css();
    if(!document.getElementById('otpOverlay')){
      var ov = document.createElement('div');
      ov.id = 'otpOverlay'; ov.className = 'hidden'; ov.setAttribute('dir', 'rtl');
      document.body.appendChild(ov);
    }
  }

  // زرار القايمة — تحت «👥 الموظفين» في 🏪 المحل (وبعد «💰 كروت المرتبات» لو موجود)
  function ensureBtn(){
    var menu = document.getElementById('kebabMenu');
    if(!menu) return null;
    var b = document.getElementById('otpMenuBtn');
    if(b) return b;
    b = document.createElement('button');
    b.id = 'otpMenuBtn';
    b.textContent = '⭐ نقاط الفنيين';
    b.onclick = function(){ try{ if(typeof closeKebab === 'function') closeKebab(); }catch(e){} openOwnerTechPoints(); };
    var anchor = document.getElementById('opcMenuBtn') || document.getElementById('sbOwnerBtn');
    if(anchor && anchor.parentNode === menu) menu.insertBefore(b, anchor.nextSibling);
    else menu.appendChild(b);
    return b;
  }

  async function load(){
    try{
      var r = await sb.from('app_data').select('value').eq('key', 'tech-board-months').maybeSingle();
      if(r.error) throw r.error;
      DATA = (r.data && r.data.value) ? JSON.parse(r.data.value) : null;
      ERR = '';
    }catch(e){
      DATA = null;
      ERR = (e && e.message) || String(e);
    }
  }

  function rowsOf(k){
    if(!DATA) return [];
    var list = k === 'today' ? DATA.today : (DATA.months || {})[k];
    return (Array.isArray(list) ? list : []).slice().sort(function(a, b){ return Number(b.points || 0) - Number(a.points || 0); });
  }

  function render(){
    var ov = document.getElementById('otpOverlay'); if(!ov) return;
    var head = '<div class="otp-head"><h2>⭐ نقاط الفنيين</h2><button type="button" class="otp-x" aria-label="اقفل">×</button></div>';
    var body;
    if(ERR){
      body = '<div class="otp-empty">⚠️ مقدرناش نقرا النقاط — حدّث الصفحة أو كلّم الإدارة.<br><small>' + esc(ERR) + '</small></div>';
    }else if(!DATA){
      body = '<div class="otp-empty">⭐ النقاط لسه ماتنشرتش<br><small>بتظهر أول ما المحاسب يفتح شاشته</small></div>';
    }else{
      var keys = Object.keys(DATA.months || {}).sort().reverse();
      if(!SEL || (SEL !== 'today' && keys.indexOf(SEL) < 0)) SEL = keys[0] || 'today';
      var opts = '<option value="today"' + (SEL === 'today' ? ' selected' : '') + '>📅 النهارده</option>'
        + keys.map(function(k, i){
            return '<option value="' + esc(k) + '"' + (SEL === k ? ' selected' : '') + '>🗓️ ' + esc(monthName(k)) + (i === 0 ? ' (الشهر ده)' : '') + '</option>';
          }).join('');
      var rows = rowsOf(SEL);
      var tot = rows.reduce(function(a, r){ return a + Number(r.points || 0); }, 0);
      var cnt = rows.reduce(function(a, r){ return a + Number(r.count || 0); }, 0);
      body = '<select class="otp-sel" id="otpSel">' + opts + '</select>'
        + '<div class="otp-at">🔄 آخر تحديث ' + esc(ago(DATA.at)) + ' — الأرقام بتتحدّث لما المحاسب يكون فاتح شاشته</div>'
        + '<div class="otp-sum"><div><b>' + num(tot) + '</b><span>إجمالي النقط</span></div><div><b>' + num(cnt) + '</b><span>جهاز</span></div></div>'
        + (rows.length ? rows.map(function(r, i){
            var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1);
            return '<div class="otp-row"><div class="otp-rk">' + medal + '</div>'
              + '<div class="m"><b>' + esc(r.t) + '</b><small>📱 ' + num(r.count) + ' جهاز'
              + (Number(r.ret) ? ' · ↩️ ' + num(r.ret) + ' مرتجع' : '')
              + (r.avg != null && r.avg !== '' ? ' · متوسط ' + num(r.avg) + ' نقطة' : '') + '</small></div>'
              + '<div class="otp-pts"><b>' + num(r.points) + '</b><small>نقطة</small></div></div>';
          }).join('') : '<div class="otp-empty">مفيش نقط في الفترة دي</div>');
    }
    ov.innerHTML = head + '<div class="otp-body">' + body + '</div>';
    ov.querySelector('.otp-x').onclick = closeOwnerTechPoints;
    var sel = document.getElementById('otpSel');
    if(sel) sel.onchange = function(){ SEL = sel.value; render(); };
  }

  async function openOwnerTechPoints(){
    ensureUi();
    var ov = document.getElementById('otpOverlay');
    ov.classList.remove('hidden');
    ov.innerHTML = '<div class="otp-head"><h2>⭐ نقاط الفنيين</h2><button type="button" class="otp-x">×</button></div><div class="otp-body"><div class="otp-empty">جاري التحميل…</div></div>';
    ov.querySelector('.otp-x').onclick = closeOwnerTechPoints;
    await load();
    render();
  }
  function closeOwnerTechPoints(){
    var ov = document.getElementById('otpOverlay'); if(ov) ov.classList.add('hidden');
  }
  window.openOwnerTechPoints = openOwnerTechPoints;
  window.closeOwnerTechPoints = closeOwnerTechPoints;

  document.addEventListener('keydown', function(e){
    if(e.key !== 'Escape') return;
    var ov = document.getElementById('otpOverlay');
    if(ov && !ov.classList.contains('hidden')) closeOwnerTechPoints();
  });

  function boot(){
    try{
      ensureUi();
      // «💰 كروت المرتبات» بيدخل قبله على طول (بيتحط بعد «👥 الموظفين» مباشرة)
      ensureBtn();
    }catch(e){ console.error('owner-techpoints boot:', e); }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
