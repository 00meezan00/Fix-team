// ############################################################
// 📱 آيفون ↔ أندرويد — خانة واحدة جوه «الملخص المالي» (للمحاسب العام بس)
// ------------------------------------------------------------
// 🧸 الفكرة: خانة واحدة بتجاوب على 3 أسئلة:
//    ١) من مبيعات الفترة: كام جنيه (وكام %) جم من الآيفون، وكام من الأندرويد؟
//    ٢) من نقاط الفنيين كلهم مع بعض: كام نقطة (وكام %) آيفون، وكام أندرويد؟
//    ٣) كل فني لوحده: شغله كام % آيفون وكام % أندرويد؟
//
// 📏 القواعد:
//    • «آيفون» = الجهاز اللي خانة «نوع الجهاز» عنده فيها آيفون
//      (iPhone / ايفون / أيفون / آيفون / Apple / ابل).
//      أي حاجة غير كده = «أندرويد» (وبتشمل التاب والأجهزة من غير نوع).
//    • المبيعات = نفس أجهزة «إيراد الصيانة» اللي فوق بالظبط
//      (اتسلّمت في الفترة × السعر المتفق عليه) — فالمجموع بيساوي الكارت ده.
//    • النقاط = نفس حساب «🏆 تقييم الفنيين» بالحرف (فني مساعد بنسبته،
//      مرتجع بيتقسم على أصحابه، جملة وجهاز مرفوض بدون نقاط…) — بس على
//      فترة الملخص المالي. الجهاز بيتحسب في الفترة اللي خلص فيها.
//
// 🔒 للمحاسب العام بس: الملخص المالي نفسه مقفول على isSuperAdmin،
//    والدالة هنا بتتأكد تاني.
// 🗄️ مابتكتبش أي حاجة ولا بتطلب حاجة من السيرفر — بتقرا من `devices` اللي
//    في الصفحة أصلاً.
//
// ⚠️ ملف مؤقت للإنتاج — بيستخدم من الداشبورد:
//    devices · isWS · returnAfterDeliveryDate · returnPointParts ·
//    returnCompletionDate · completionDate · PT_DONE · enDigits · esc
// ⚠️ لو اتعدّلت قاعدة النقاط في renderTechEval (dashboard.html) لازم تتعدّل
//    هنا كمان في دالة collectPoints — وإلا الأرقام هتختلف.
// ############################################################
(function(){
  'use strict';

  const _esc = s => (typeof esc === 'function') ? esc(s)
    : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const _digits = s => (typeof enDigits === 'function') ? enDigits(s) : String(s == null ? '' : s);
  const money  = n => Number(n || 0).toLocaleString('en-EG');
  const ptsFmt = n => Number(n || 0).toLocaleString('en-EG', { maximumFractionDigits: 1 });
  const round1 = n => Math.round(n * 10) / 10;

  // ---------- آيفون ولا لأ؟ (من خانة «نوع الجهاز» بس) ----------
  // بنوحّد الألف (أ إ آ ← ا) والحروف الكبيرة عشان «آيفون» و«أيفون» و«ايفون» يتمسكوا كلهم.
  // «ابل» بالعربي لازم تبقى كلمة لوحدها (أو بعد «ال») — عشان «قابل» ماتتحسبش آيفون.
  function isIphone(d){
    const t = String((d && d.deviceType) || '').toLowerCase().replace(/[أإآ]/g, 'ا');
    if(!t) return false;
    return /iphone|iph|apple|ايفون/.test(t) || /(^|[^ء-ي])(ال)?ابل($|[^ء-ي])/.test(t);
  }

  // ---------- الستايل (بألوان الداشبورد نفسها — فاتح وغامق) ----------
  function css(){
    if(document.getElementById('plsStyle')) return;
    const s = document.createElement('style');
    s.id = 'plsStyle';
    s.textContent = `
    .pls-box{background:var(--surface,#fff); border:1px solid var(--border,#E2E8F0); border-radius:16px; padding:14px 14px 12px; margin:6px 0 18px;}
    .pls-title{font-size:16px; font-weight:800; color:var(--ink,#1A2332); margin:0 0 2px;}
    .pls-sub{font-size:12px; color:var(--muted,#64748B); line-height:1.8; margin:0 0 10px;}
    .pls-sec{font-size:13.5px; font-weight:800; color:var(--ink,#1A2332); margin:14px 0 6px; padding-top:10px; border-top:1px dashed var(--border,#E2E8F0);}
    .pls-sec:first-of-type{border-top:none; padding-top:0; margin-top:6px;}
    .pls-bar{display:flex; height:14px; border-radius:8px; overflow:hidden; background:var(--surface-3,#E2E8F0);}
    .pls-bar span{display:block; height:100%;}
    .pls-ip{background:var(--info,#2563EB);}
    .pls-an{background:var(--warn,#D97706);}
    .pls-legend{display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;}
    .pls-leg{background:var(--surface-2,#F8FAFC); border:1px solid var(--border,#E2E8F0); border-radius:12px; padding:8px 10px;}
    .pls-leg .k{font-size:12.5px; font-weight:800; color:var(--ink,#1A2332); display:flex; align-items:center; gap:6px;}
    .pls-leg .k i{display:inline-block; width:10px; height:10px; border-radius:3px;}
    .pls-leg .v{font-size:19px; font-weight:800; color:var(--ink,#1A2332); line-height:1.35; margin-top:2px;}
    .pls-leg .p{font-size:12.5px; color:var(--muted,#64748B); line-height:1.7;}
    .pls-tech{padding:9px 0; border-top:1px solid var(--border,#E2E8F0);}
    .pls-tech:first-of-type{border-top:none;}
    .pls-tech-h{display:flex; justify-content:space-between; align-items:baseline; gap:8px; margin-bottom:5px;}
    .pls-tech-h b{font-size:14px; color:var(--ink,#1A2332);}
    .pls-tech-h span{font-size:12px; color:var(--muted,#64748B);}
    .pls-tl{display:flex; justify-content:space-between; gap:8px; margin-top:5px; font-size:12px; color:var(--muted,#64748B); line-height:1.7;}
    .pls-tl div{flex:1;}
    .pls-tl b{color:var(--ink,#1A2332); font-size:13px;}
    .pls-empty{font-size:13px; color:var(--muted,#64748B); padding:8px 0;}
    .pls-note{font-size:11.5px; color:var(--muted-2,#94A3B8); line-height:1.9; margin-top:10px;}
    .pls-err{font-size:13px; color:var(--danger,#DC2626); line-height:1.8;}
    `;
    document.head.appendChild(s);
  }

  // ---------- مساهمات النقاط: [{ name, d, share }] ----------
  // ⚠️ ده نسخة طبق الأصل من أول حلقة في renderTechEval (dashboard.html)،
  //    الفرق الوحيد إن الفترة جاية من برّه (inRange) بدل فترة «تقييم الفنيين».
  function collectPoints(inRange){
    const out = [];
    const push = (name, d, share) => { if(name && share) out.push({ name, d, share }); };
    const clampPct = v => Math.min(100, Math.max(0, parseFloat(_digits(v)) || 0));

    devices.forEach(d => {
      if(d.status === 'rejected') return;               // المرفوض مالوش نقاط

      // ===== جهاز رجع بعد التسليم =====
      if(returnAfterDeliveryDate(d)){
        if(isWS(d)) return;                             // الجملة بدون نقاط
        const rParts = returnPointParts(d);
        if(!rParts.length) return;
        const rDone = rParts.filter(p => p.earned);     // اللي لسه ما استحقش مش بيتحسب
        if(!rDone.length) return;
        const cd = returnCompletionDate(d) || completionDate(d);
        if(!cd || !inRange(cd)) return;
        const rPct = clampPct(d.assistPercent);
        rDone.forEach(p => {
          if(d.assistTechnician && rPct > 0 && !p.blamed){
            const a = p.amt * (rPct / 100);
            push(d.assistTechnician, d, a);
            push(p.owner, d, p.amt - a);
          } else {
            push(p.owner, d, p.amt);
          }
        });
        return;
      }

      // ===== الفرع العادي: لازم الشغل يكون خلص دلوقتي =====
      if(!PT_DONE[d.status]) return;
      const pts = parseFloat(_digits(d.points)) || 0;
      if(!pts || !d.technician) return;
      if(isWS(d)) return;
      const cd = completionDate(d);
      if(!cd || !inRange(cd)) return;                   // لسه معلّق/برّه الفترة
      const pct = clampPct(d.assistPercent);
      if(d.assistTechnician && pct > 0){
        const a = pts * (pct / 100);
        push(d.assistTechnician, d, a);
        push(d.technician, d, pts - a);
      } else {
        push(d.technician, d, pts);
      }
    });
    return out;
  }

  const pctOf = (a, total) => total > 0 ? Math.round(a * 100 / total) : 0;

  // شريط نسبتين (آيفون | أندرويد) — النسبتين مجموعهم ١٠٠ دايماً
  function bar(ipPct, total){
    if(!(total > 0)) return `<div class="pls-bar"></div>`;
    return `<div class="pls-bar" role="img" aria-label="آيفون ${ipPct}% وأندرويد ${100 - ipPct}%">`
         + `<span class="pls-ip" style="width:${ipPct}%"></span><span class="pls-an" style="width:${100 - ipPct}%"></span></div>`;
  }

  // ---------- الخانة كلها ----------
  // o = { delivered: أجهزة اتسلّمت في الفترة (deliveredInRange), inRange: دالة الفترة (inAnRange) }
  function html(o){
    try{
      if(typeof isSuperAdmin === 'function' && !isSuperAdmin()) return '';
      css();
      o = o || {};
      const inRange = o.inRange;
      if(typeof inRange !== 'function') throw new Error('inRange مش متبعتة');

      // ===== ١) المبيعات =====
      let ipAmt = 0, anAmt = 0, ipN = 0, anN = 0, noType = 0;
      (o.delivered || []).forEach(d => {
        const p = parseInt(_digits(d.agreedPrice)) || 0;   // نفس حساب «إيراد الصيانة» بالظبط
        if(isIphone(d)){ ipAmt += p; ipN++; }
        else { anAmt += p; anN++; if(!String(d.deviceType || '').trim()) noType++; }
      });
      const salesTotal = ipAmt + anAmt;
      const ipSalesPct = pctOf(ipAmt, salesTotal);

      const salesHtml = (ipN + anN) === 0
        ? `<div class="pls-empty">مفيش أجهزة اتسلّمت في الفترة دي.</div>`
        : `${bar(ipSalesPct, salesTotal)}
           <div class="pls-legend">
             <div class="pls-leg"><div class="k"><i class="pls-ip"></i>آيفون</div>
               <div class="v">${money(ipAmt)} <span style="font-size:12px;font-weight:600;">جنيه</span></div>
               <div class="p">${salesTotal > 0 ? ipSalesPct + '%' : '—'} · ${ipN} جهاز</div></div>
             <div class="pls-leg"><div class="k"><i class="pls-an"></i>أندرويد</div>
               <div class="v">${money(anAmt)} <span style="font-size:12px;font-weight:600;">جنيه</span></div>
               <div class="p">${salesTotal > 0 ? (100 - ipSalesPct) + '%' : '—'} · ${anN} جهاز</div></div>
           </div>`;

      // ===== ٢) النقاط (كل الفنيين مجمّعين) + ٣) كل فني =====
      const byTech = {};     // اسم الفني ← { ip:{pts,devs:Set}, an:{pts,devs:Set} }
      let ipPts = 0, anPts = 0;
      collectPoints(inRange).forEach(x => {
        const side = isIphone(x.d) ? 'ip' : 'an';
        const rec = byTech[x.name] = byTech[x.name] || { ip: { pts: 0, devs: new Set() }, an: { pts: 0, devs: new Set() } };
        rec[side].pts += x.share;
        rec[side].devs.add(x.d.id != null ? x.d.id : x.d);
        if(side === 'ip') ipPts += x.share; else anPts += x.share;
      });
      ipPts = round1(ipPts); anPts = round1(anPts);
      const ptsTotal = ipPts + anPts;
      const ipPtsPct = pctOf(ipPts, ptsTotal);

      const ptsHtml = !(ptsTotal > 0)
        ? `<div class="pls-empty">مفيش نقاط اتحسبت في الفترة دي.</div>`
        : `${bar(ipPtsPct, ptsTotal)}
           <div class="pls-legend">
             <div class="pls-leg"><div class="k"><i class="pls-ip"></i>آيفون</div>
               <div class="v">${ptsFmt(ipPts)} <span style="font-size:12px;font-weight:600;">نقطة</span></div>
               <div class="p">${ipPtsPct}%</div></div>
             <div class="pls-leg"><div class="k"><i class="pls-an"></i>أندرويد</div>
               <div class="v">${ptsFmt(anPts)} <span style="font-size:12px;font-weight:600;">نقطة</span></div>
               <div class="p">${100 - ipPtsPct}%</div></div>
           </div>`;

      const techs = Object.keys(byTech)
        .map(n => {
          const r = byTech[n];
          const ip = round1(r.ip.pts), an = round1(r.an.pts);
          return { n, ip, an, ipN: r.ip.devs.size, anN: r.an.devs.size, tot: ip + an };
        })
        .filter(x => x.tot > 0)
        .sort((a, b) => b.tot - a.tot);

      const techHtml = techs.length === 0
        ? `<div class="pls-empty">مفيش شغل فنيين اتحسب في الفترة دي.</div>`
        : techs.map(x => {
            const p = pctOf(x.ip, x.tot);
            return `<div class="pls-tech">
              <div class="pls-tech-h"><b>${_esc(x.n)}</b><span>${ptsFmt(x.tot)} نقطة</span></div>
              ${bar(p, x.tot)}
              <div class="pls-tl">
                <div><i class="pls-ip" style="display:inline-block;width:9px;height:9px;border-radius:3px;margin-inline-end:5px;"></i>آيفون <b>${p}%</b><br>${ptsFmt(x.ip)} نقطة · ${x.ipN} جهاز</div>
                <div><i class="pls-an" style="display:inline-block;width:9px;height:9px;border-radius:3px;margin-inline-end:5px;"></i>أندرويد <b>${100 - p}%</b><br>${ptsFmt(x.an)} نقطة · ${x.anN} جهاز</div>
              </div>
            </div>`;
          }).join('');

      return `
      <div class="pls-box" id="plsBox">
        <div class="pls-title">📱 آيفون ↔ أندرويد</div>
        <div class="pls-sub">حسب الفترة المختارة فوق</div>

        <div class="pls-sec">💰 المبيعات</div>
        ${salesHtml}

        <div class="pls-sec">⭐ نقاط الفنيين (كلهم مع بعض)</div>
        ${ptsHtml}

        <div class="pls-sec">🔧 شغل كل فني (آيفون / أندرويد)</div>
        ${techHtml}

        <div class="pls-note">
          • «آيفون» = نوع الجهاز مكتوب فيه آيفون. أي حاجة غير كده بتتحسب «أندرويد» (بتشمل التاب)${noType ? ` — منهم <b>${noType}</b> جهاز من غير نوع متسجّل` : ''}.<br>
          • المبيعات = الأجهزة اللي اتسلّمت في الفترة (نفس «إيراد الصيانة» فوق).<br>
          • النقاط = نفس حساب «🏆 تقييم الفنيين»، والجهاز بيتحسب في الفترة اللي خلص فيها.
        </div>
      </div>`;
    }catch(e){
      // ⚠️ مفيش ابتلاع صامت — الغلط يبان في الشاشة وفي الـ Console
      console.error('[آيفون/أندرويد] فشل الحساب:', e);
      try{ css(); }catch(_){}
      return `<div class="pls-box"><div class="pls-title">📱 آيفون ↔ أندرويد</div>
        <div class="pls-err">⚠️ حصلت مشكلة في حساب الخانة دي: ${_esc(e && e.message ? e.message : e)}</div></div>`;
    }
  }

  window.IFixPlatformStats = { html, isIphone, collectPoints };
})();
