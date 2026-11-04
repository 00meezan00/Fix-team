/* ============================================================
   🏆 owner-techpoints.js — «ترتيب الفنيين» عند المالك (v148)
   ------------------------------------------------------------
   🧸 بالبلدي:
      نفس شاشة «🏆 ترتيب الفنيين» اللي عند الفني (my-devices.html)
      **بالظبط**: نفس الجدول · نفس الألوان · نفس اللقب جنب اسمك ·
      نفس شريط «التحديثات موقوفة».
      البيانات نفسها: app_data['tech-board'] اللي الداشبورد بينشرها
      للفنيين (publishTechBoard) — مفيش حسبة تانية.
      الفترات (عند الكل): النهارده · امبارح · الشهر الحالي · الشهر السابق.
   ⚠️ لو عدّلت شاشة الفني (renderTechBoard في my-devices.html)
      عدّل هنا كمان — دي نسخة منها.
   ⚠️ مكتفي بنفسه: ستايله جواه وبيستعمل ألوان owner.html.
   ============================================================ */
(function(){
  'use strict';
  var techBoard = null, ERR = '', tbMode = 'month';
  var TB_BLUE = '#2563EB';

  function esc(t){ return String(t == null ? '' : t).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  // اسم المالك الظاهر (هو كمان بيشتغل فني) — من owner.html
  function me(){ try{ return (typeof MY_TECH !== 'undefined' && MY_TECH) || (typeof ME !== 'undefined' && ME) || ''; }catch(e){ return ''; } }
  function tbDark(){ try{ return document.documentElement.getAttribute('data-theme') === 'dark'; }catch(e){ return false; } }

  var T = {
    title:'ترتيب الفنيين', today:'النهارده', yesterday:'امبارح', month:'الشهر الحالي', prev:'الشهر السابق',
    tech:'الفني', points:'النقاط', done:'أجهزة', avg:'متوسط المدة', returns:'مرتجع',
    day:'يوم', lessDay:'أقل من يوم', updated:'آخر تحديث:',
    r1:'🥇 المتصدر', r2:'🥈 التاني', r3:'🥉 التالت', rLast:'الأخير', rLast2:'قبل الأخير', rN:'الترتيب {n}',
    paused:'التحديثات موقوفة لحين حضور المحاسبين',
    resume:'الشغل متسجّل ومحفوظ — الترتيب هيتحدّث أول ما يفتحوا النظام',
    empty:'لسه مفيش ترتيب — هيظهر أول ما المحاسب يفتح النظام'
  };

  function css(){
    if(document.getElementById('otpCss')) return;
    var st = document.createElement('style');
    st.id = 'otpCss';
    st.textContent = [
      '#otpOverlay{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;}',
      '#otpOverlay.hidden{display:none;}',
      '.otp-sheet{width:100%;max-width:640px;max-height:88vh;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;'
        + 'background:var(--card,#fff);color:var(--ink,#17222E);border-radius:20px 20px 0 0;padding-bottom:env(safe-area-inset-bottom);}',
      '.otp-x{float:left;border:0;border-radius:10px;width:34px;height:34px;font-size:20px;background:var(--paper,#EBEEF2);color:var(--ink,#17222E);cursor:pointer;}'
    ].join('\n');
    document.head.appendChild(st);
  }
  function ensureUi(){
    css();
    if(!document.getElementById('otpOverlay')){
      var ov = document.createElement('div');
      ov.id = 'otpOverlay'; ov.className = 'hidden'; ov.setAttribute('dir', 'rtl');
      ov.addEventListener('click', function(e){ if(e.target === ov) closeOwnerTechPoints(); });
      document.body.appendChild(ov);
    }
  }
  function ensureBtn(){
    var menu = document.getElementById('kebabMenu');
    if(!menu) return null;
    var b = document.getElementById('otpMenuBtn');
    if(b) return b;
    b = document.createElement('button');
    b.id = 'otpMenuBtn';
    b.textContent = '🏆 ترتيب الفنيين';
    b.onclick = function(){ try{ if(typeof closeKebab === 'function') closeKebab(); }catch(e){} openOwnerTechPoints(); };
    var anchor = document.getElementById('opcMenuBtn') || document.getElementById('sbOwnerBtn');
    if(anchor && anchor.parentNode === menu) menu.insertBefore(b, anchor.nextSibling);
    else menu.appendChild(b);
    return b;
  }

  async function load(){
    try{
      var r = await sb.from('app_data').select('value').eq('key', 'tech-board').maybeSingle();
      if(r.error) throw r.error;
      techBoard = (r.data && r.data.value) ? JSON.parse(r.data.value) : null;
      ERR = '';
    }catch(e){ techBoard = null; ERR = (e && e.message) || String(e); }
  }

  function render(){
    var ov = document.getElementById('otpOverlay'); if(!ov) return;
    var ME_ = me();
    var rows = (techBoard && (tbMode === 'month' ? (techBoard.month || techBoard.d30) : techBoard[tbMode])) || [];
    var at = techBoard && techBoard.at;
    var chip = function(m, lbl){
      return '<button type="button" data-m="' + m + '" style="border:1px solid ' + (tbMode === m ? TB_BLUE : 'var(--line,#E4E9EF)') + ';'
        + 'background:' + (tbMode === m ? TB_BLUE : 'transparent') + ';color:' + (tbMode === m ? '#fff' : 'var(--ink,#17222E)') + ';'
        + 'border-radius:999px;padding:7px 15px;font:800 12.5px/1 inherit;cursor:pointer;">' + lbl + '</button>';
    };
    var fmtAvg = function(v){ return (v === null || v === undefined) ? '—' : (v < 1 ? T.lessDay : Number(v).toFixed(1) + ' ' + T.day); };

    function rankLabel(i, total){
      var r = i + 1, D = tbDark();
      var mk = function(txt, dk, lt, rgb){ return { txt: txt, col: D ? dk : lt,
        bg: 'rgba(' + rgb + ',' + (D ? '.20' : '.16') + ')', bd: 'rgba(' + rgb + ',' + (D ? '.60' : '.42') + ')' }; };
      if(r === 1) return mk(T.r1, '#FBBF24', '#8A4A05', '217,119,6');
      if(r === 2) return mk(T.r2, '#CBD5E1', '#475569', '148,163,184');
      if(r === 3) return mk(T.r3, '#FDBA74', '#92400E', '234,138,60');
      if(r > 3 && r === total)     return mk(T.rLast,  '#FCA5A5', '#A81B1B', '220,38,38');
      if(r > 3 && r === total - 1) return mk(T.rLast2, '#FDBA74', '#9A3A08', '234,88,12');
      return mk(T.rN.replace('{n}', r), '#93C5FD', '#1D4ED8', '37,99,235');
    }
    var badge = function(i, total){
      var b = rankLabel(i, total);
      return '<span style="display:inline-block;margin-inline-start:6px;font-size:10.5px;font-weight:900;'
        + 'color:' + b.col + ';background:' + b.bg + ';border:1px solid ' + b.bd + ';'
        + 'border-radius:6px;padding:2px 7px;line-height:1.6;">' + b.txt + '</span>';
    };

    var STALE_MS = 25 * 60 * 1000;
    var stale = at && (Date.now() - new Date(at).getTime() > STALE_MS);
    var staleBar = stale ? '<div style="background:rgba(180,83,9,.12);border:1px solid rgba(180,83,9,.45);color:#B45309;'
      + 'border-radius:10px;padding:10px 12px;font-size:12px;font-weight:800;line-height:1.75;margin-bottom:12px;">'
      + '⏸️ ' + T.paused + '<br><span style="font-weight:500;">' + T.resume + '</span></div>' : '';

    var body = ERR
      ? '<div style="text-align:center;color:var(--muted,#6B7A8C);padding:26px 10px;font-size:13px;">⚠️ مقدرناش نقرا الترتيب — حدّث الصفحة.<br><small>' + esc(ERR) + '</small></div>'
      : rows.length ? '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12.5px;">'
        + '<tr style="color:var(--muted,#6B7A8C);font-size:11.5px;">'
        + '<th style="text-align:start;padding:7px 6px;">#</th><th style="text-align:start;padding:7px 6px;">' + T.tech + '</th>'
        + '<th style="padding:7px 6px;">⭐ ' + T.points + '</th><th style="padding:7px 6px;">' + T.done + '</th>'
        + '<th style="padding:7px 6px;">' + T.avg + '</th><th style="padding:7px 6px;">' + T.returns + '</th></tr>'
        + rows.map(function(r, i){
            var mine = ME_ && r.t === ME_;
            return '<tr style="border-top:1px solid var(--line,#E4E9EF);' + (mine ? (tbDark() ? 'background:rgba(59,130,246,.16);' : 'background:rgba(37,99,235,.10);') : '') + '">'
              + '<td style="padding:9px 6px;color:var(--muted,#6B7A8C);">' + (i + 1) + '</td>'
              + '<td style="padding:9px 6px;font-weight:800;">' + esc(r.t) + (mine ? badge(i, rows.length) : '') + '</td>'
              + '<td style="padding:9px 6px;text-align:center;font-weight:900;color:' + (tbDark() ? '#93C5FD' : TB_BLUE) + ';">' + esc(r.points) + '</td>'
              + '<td style="padding:9px 6px;text-align:center;">' + esc(r.count) + '</td>'
              + '<td style="padding:9px 6px;text-align:center;color:var(--muted,#6B7A8C);">' + fmtAvg(r.avg) + '</td>'
              + '<td style="padding:9px 6px;text-align:center;">' + esc(r.ret) + ' <span style="color:var(--muted,#6B7A8C);font-size:11px;">(' + esc(r.rate) + '%)</span></td></tr>';
          }).join('') + '</table></div>'
      : '<div style="text-align:center;color:var(--muted,#6B7A8C);padding:26px 10px;font-size:13px;">' + T.empty + '</div>';

    ov.innerHTML = '<div class="otp-sheet"><div style="padding:16px 16px 22px;">'
      + '<button type="button" class="otp-x" aria-label="اقفل">×</button>'
      + '<div style="font:900 16px/1.4 \'Cairo\',sans-serif;margin-bottom:12px;">🏆 ' + T.title + '</div>'
      + '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">'
      + chip('today', T.today) + chip('yesterday', T.yesterday) + chip('month', T.month) + chip('prev', T.prev) + '</div>'
      + staleBar + body
      + (at ? '<div style="color:var(--muted,#6B7A8C);font-size:11px;margin-top:12px;text-align:center;">' + T.updated + ' ' + new Date(at).toLocaleString('ar-EG') + '</div>' : '')
      + '</div></div>';
    ov.querySelector('.otp-x').onclick = closeOwnerTechPoints;
    Array.prototype.forEach.call(ov.querySelectorAll('button[data-m]'), function(b){
      b.onclick = function(){ tbMode = b.getAttribute('data-m'); render(); };
    });
  }

  async function openOwnerTechPoints(){
    ensureUi();
    var ov = document.getElementById('otpOverlay');
    ov.classList.remove('hidden');
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

  function boot(){ try{ ensureUi(); ensureBtn(); }catch(e){ console.error('owner-techpoints boot:', e); } }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
