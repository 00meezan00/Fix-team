/* ============================================================
   أدوات الرف
   ------------------------------------------------------------
   dock.js مش عارف أي أداة — الأدوات بتسجّل نفسها هنا.

   💬 (٢٠٢٦-١٠-١٢) شات الموظفين — بدل «محادثات العملاء» (الأسيست اتشال).
   ============================================================ */
(function () {
  'use strict';
  if (!window.IFixDock) return;
  if (window.IFixStaffChat) return;          // اتحمّل مرتين؟ مرة واحدة كفاية
  window.IFixStaffChat = true;

  // ⚠️ ماينفعش نستخدم window.sb — الصفحات بتعرّفه بـ const على المستوى الأعلى
  //    (مش خاصية على window). المعرّف المجرّد بيشتغل.
  function DB() {
    try { return (typeof sb !== 'undefined' && sb) ? sb : null; } catch (e) { return null; }
  }
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  };

  // 🧹 بقايا الأسيست
  try {
    localStorage.removeItem('ifix_chat_seen');
    if (localStorage.getItem('ifix-dock-tool') === 'assist') localStorage.setItem('ifix-dock-tool', 'chat');
  } catch (e) {}

  // ============================================================
  // 💬 شات الموظفين
  // ------------------------------------------------------------
  // 🧸 بالبلدي:
  //   • «📢 الكل» = أوضة الجروب — كل موظفين السيستم (ما عدا HR) بيشوفوها.
  //   • رسالة خاصة = بينك وبين حد واحد بس. محدش تالت يشوفها — ولا حتى
  //     المحاسب العام. السيرفر هو اللي قافلها (ملف 89)، مش الشاشة.
  //   • الرقم الأحمر على الأيقونة = رسايل جاتلك وإنت لسه مافتحتهاش.
  //
  // ⚠️ النقل (Egress): مفيش سحب كل ثانية. الرسايل بتيجي لحظياً (Realtime)،
  //    وبنسأل السيرفر «فيه جديد من آخر رسالة؟» بس لما الصفحة ترجع قدامك.
  // ⚠️ «قريت لحد فين» محفوظة على الموبايل **باسم الحساب** — عشان لو اتنين
  //    بيستخدموا نفس الموبايل، كل واحد ليه أرقامه.
  // ============================================================
  var ROLE = {
    super_admin: { t: 'المحاسب العام', i: '🧾' },
    owner:       { t: 'المالك',        i: '👑' },
    accountant:  { t: 'أمين الخزنة',   i: '💵' },
    dispatcher:  { t: 'مسؤول الحركة',  i: '🛵' },
    technician:  { t: 'فني',           i: '🔧' },
    reception:   { t: 'الاستقبال',     i: '🛎️' },
    production:  { t: 'مدير الإنتاج',  i: '🏭' },
    staff:       { t: 'موظف',          i: '👤' }
  };
  var ROLE_ORDER = ['super_admin', 'owner', 'reception', 'production', 'accountant', 'dispatcher', 'technician', 'staff'];
  var KEEP = 400;                       // آخر كام رسالة في الذاكرة

  var S = {
    me: '', contacts: [], byEmail: {}, msgs: {}, ids: {}, lastAt: '',
    view: 'list', room: null, q: '', host: null, err: '', loading: false, ok: false
  };
  var READ = {};
  function readKey() { return 'ifix_staffchat_read:' + S.me; }
  function loadRead() { try { READ = JSON.parse(localStorage.getItem(readKey()) || '{}') || {}; } catch (e) { READ = {}; } }
  function saveRead() { try { localStorage.setItem(readKey(), JSON.stringify(READ)); } catch (e) {} }

  function dmRoom(other) {
    var a = [S.me, String(other || '').toLowerCase()].sort();   // نفس ترتيب السيرفر (collate "C")
    return 'dm:' + a[0] + '|' + a[1];
  }
  function roomOther(room) {
    if (!room || room === 'all') return null;
    var p = room.slice(3).split('|');
    return p[0] === S.me ? p[1] : p[0];
  }
  function personName(email, fallback) {
    var c = S.byEmail[email];
    return c ? c.name : (fallback || String(email || '').split('@')[0]);
  }
  function personRole(email, fallback) {
    var c = S.byEmail[email];
    return (c && c.role) || fallback || '';
  }
  function roomTitle(room) {
    if (room === 'all') return '📢 الكل';
    var o = roomOther(room);
    var last = (S.msgs[room] || []).filter(function (m) { return m.sender_email === o; }).slice(-1)[0];
    var r = ROLE[personRole(o, last && last.sender_role)] || { t: '', i: '💬' };
    return r.i + ' ' + personName(o, last && last.sender_name);
  }
  function unreadIn(room) {
    var since = READ[room] || '';
    return (S.msgs[room] || []).filter(function (m) { return m.sender_email !== S.me && m.created_at > since; }).length;
  }
  function totalUnread() {
    var n = 0; Object.keys(S.msgs).forEach(function (r) { n += unreadIn(r); }); return n;
  }
  function markRead(room) {
    var arr = S.msgs[room] || [];
    if (!arr.length) return;
    var at = arr[arr.length - 1].created_at;
    if ((READ[room] || '') >= at) return;
    READ[room] = at; saveRead();
    try { IFixDock.refresh(); } catch (e) {}
  }
  function addMsg(m) {
    if (!m || !m.id || S.ids[m.id]) return false;
    S.ids[m.id] = 1;
    var arr = S.msgs[m.room] || (S.msgs[m.room] = []);
    arr.push(m);
    if (arr.length > 1 && arr[arr.length - 2].created_at > m.created_at)
      arr.sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; });
    if (arr.length > KEEP) arr.splice(0, arr.length - KEEP);
    if (m.created_at > S.lastAt) S.lastAt = m.created_at;
    return true;
  }
  function viewing(room) {
    return S.view === 'room' && S.room === room && S.host && S.host.isConnected && !document.hidden;
  }

  function when(s) {
    if (!s) return '';
    var d = new Date(s), now = new Date();
    var hm = d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return hm;
    var y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'امبارح ' + hm;
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'numeric' }) + ' ' + hm;
  }
  function dayLbl(s) {
    var d = new Date(s), now = new Date();
    if (d.toDateString() === now.toDateString()) return 'النهارده';
    var y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'امبارح';
    return d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // ---------- الشكل ----------
  // ⚠️ الألوان معرّفة هنا على الرف واللوحة نفسهم — عشان الشات يبان صح في أي
  //    صفحة (الديسباتشر/المالك/الفني مالهمش نفس متغيّرات الداشبورد).
  function css() {
    if (document.getElementById('dkChatCss')) return;
    var s = document.createElement('style');
    s.id = 'dkChatCss';
    s.textContent = [
      '#dkRail,#dkPanel{--surface:#FFFFFF;--surface-2:#F8FAFC;--surface-3:#F1F5F9;--border:#E2E8F0;',
      '  --ink:#1A2332;--muted:#64748B;--muted-2:#64748B;--accent:#0891A8;--danger:#DC2626;}',
      'html[data-theme="dark"] #dkRail,html[data-theme="dark"] #dkPanel{--surface:#1B2A3A;--surface-2:#22323F;',
      '  --surface-3:#2A3D4D;--border:#2F4356;--ink:#E9EFF5;--muted:#92A6B8;--muted-2:#71879B;--accent:#2AB5CE;--danger:#F87171;}',
      '#dkPanel{font-family:"Tajawal","Segoe UI",sans-serif;color:var(--ink);}',

      '.sc-top{display:flex;gap:6px;align-items:center;margin-bottom:10px;}',
      '.sc-btn{border:1px solid var(--border);background:var(--surface-2);color:var(--ink);border-radius:10px;',
      '  padding:8px 11px;font:800 12px/1.2 inherit;cursor:pointer;}',
      '.sc-btn.pri{background:var(--accent);border-color:var(--accent);color:#fff;}',
      '.sc-back{background:none;border:none;color:var(--accent);font:800 12.5px/1 inherit;cursor:pointer;padding:4px 0;}',
      '.sc-row{display:flex;align-items:center;gap:9px;border:1px solid var(--border);border-radius:12px;',
      '  padding:10px 11px;margin-bottom:7px;cursor:pointer;background:var(--surface-2);}',
      '.sc-row:hover{border-color:var(--accent);}',
      '.sc-row.new{border-inline-start:3px solid var(--danger);background:var(--surface);}',
      '.sc-ic{flex:none;width:34px;height:34px;border-radius:50%;background:var(--surface-3);display:flex;',
      '  align-items:center;justify-content:center;font-size:16px;}',
      '.sc-mid{flex:1;min-width:0;}',
      '.sc-nm{font:900 13px/1.4 "Cairo",sans-serif;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.sc-pv{font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}',
      '.sc-side{flex:none;text-align:end;font-size:10.5px;color:var(--muted);}',
      '.sc-n{display:inline-block;margin-top:3px;min-width:18px;border-radius:10px;background:var(--danger);color:#fff;',
      '  font:900 10.5px/18px system-ui;text-align:center;padding:0 5px;}',
      '.sc-sec{font:900 11px/1.6 inherit;color:var(--muted);margin:14px 2px 7px;}',
      '.sc-empty{color:var(--muted);font-size:12.5px;text-align:center;padding:24px 8px;line-height:2;}',
      '.sc-q{width:100%;box-sizing:border-box;padding:9px 11px;border-radius:10px;border:1px solid var(--border);',
      '  background:var(--surface-2);color:var(--ink);font:inherit;font-size:16px;margin-bottom:8px;}',

      /* المحادثة */
      '.sc-room{display:flex;flex-direction:column;height:100%;}',
      '.sc-head{display:flex;align-items:center;gap:8px;padding-bottom:9px;border-bottom:1px solid var(--border);margin-bottom:8px;}',
      '.sc-head .sc-nm{flex:1;}',
      '.sc-list{flex:1;min-height:0;overflow-y:auto;padding:4px 2px 8px;}',
      '.sc-day{text-align:center;font:800 10.5px/1 inherit;color:var(--muted);margin:12px 0 8px;}',
      '.sc-day span{background:var(--surface-3);border-radius:20px;padding:4px 10px;}',
      '.sc-m{max-width:86%;margin-bottom:6px;}',
      '.sc-m.me{margin-inline-start:auto;}',
      '.sc-cap{font:800 10.5px/1.5 inherit;color:var(--muted);margin:0 3px 2px;}',
      '.sc-b{border-radius:13px;padding:7px 11px;font-size:13.5px;line-height:1.75;white-space:pre-wrap;',
      '  word-break:break-word;background:var(--surface-3);color:var(--ink);}',
      '.sc-m.me .sc-b{background:var(--accent);color:#fff;}',
      '.sc-t{font-size:10px;color:var(--muted);margin:2px 4px 0;}',
      '.sc-m.me .sc-t{text-align:end;}',
      '.sc-send{display:flex;gap:6px;align-items:flex-end;padding-top:8px;border-top:1px solid var(--border);}',
      '.sc-send textarea{flex:1;resize:none;max-height:120px;min-height:40px;padding:9px 11px;border-radius:11px;',
      '  border:1px solid var(--border);background:var(--surface-2);color:var(--ink);font:inherit;font-size:16px;line-height:1.5;}',
      '.sc-send button{flex:none;height:40px;padding:0 15px;border:none;border-radius:11px;background:var(--accent);',
      '  color:#fff;font:900 13px/1 inherit;cursor:pointer;}',
      '.sc-send button:disabled{opacity:.5;}',
      '.sc-toast{position:fixed;inset-inline-start:50%;transform:translateX(-50%);top:calc(12px + env(safe-area-inset-top));z-index:99997;',
      '  background:#0891A8;color:#fff;padding:11px 16px;border-radius:12px;font:800 13px/1.6 "Tajawal",sans-serif;',
      '  box-shadow:0 8px 24px rgba(0,0,0,.28);cursor:pointer;max-width:88vw;text-align:start;}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ---------- الرسم ----------
  function paint() {
    var h = S.host; if (!h) return;
    if (S.err && !S.ok) { h.innerHTML = '<div class="sc-empty">⚠️ ' + esc(S.err) + '</div>'; return; }
    if (!S.ok) { h.innerHTML = '<div class="sc-empty">بنجيب الرسايل…</div>'; return; }
    if (S.view === 'room') return paintRoom();
    if (S.view === 'new') return paintNew();
    paintList();
  }

  function lastOf(room) { var a = S.msgs[room] || []; return a[a.length - 1]; }
  function rowHtml(room) {
    var last = lastOf(room), n = unreadIn(room);
    var ic = room === 'all' ? '📢' : ((ROLE[personRole(roomOther(room), last && last.sender_role)] || {}).i || '💬');
    var title = room === 'all' ? 'الكل' : personName(roomOther(room), last && last.sender_email !== S.me ? last.sender_name : '');
    var sub = room === 'all' ? '' : ((ROLE[personRole(roomOther(room))] || {}).t || '');
    var pv = last ? ((last.sender_email === S.me ? 'إنت: ' : (room === 'all' ? personName(last.sender_email, last.sender_name) + ': ' : '')) + last.body)
                  : (room === 'all' ? 'أوضة كل موظفين السيستم' : 'لسه مفيش رسايل');
    return '<div class="sc-row' + (n ? ' new' : '') + '" data-room="' + esc(room) + '">' +
      '<span class="sc-ic">' + ic + '</span>' +
      '<span class="sc-mid"><div class="sc-nm">' + esc(title) + (sub ? ' <small style="font-weight:700;color:var(--muted);">· ' + esc(sub) + '</small>' : '') + '</div>' +
      '<div class="sc-pv">' + esc(pv) + '</div></span>' +
      '<span class="sc-side">' + (last ? esc(when(last.created_at)) : '') + (n ? '<br><span class="sc-n">' + n + '</span>' : '') + '</span>' +
      '</div>';
  }
  function paintList() {
    S.host.removeAttribute('data-room'); S.host.style.height = '';
    var rooms = Object.keys(S.msgs).filter(function (r) { return r !== 'all'; });
    rooms.sort(function (a, b) { return ((lastOf(b) || {}).created_at || '') < ((lastOf(a) || {}).created_at || '') ? -1 : 1; });
    S.host.innerHTML =
      '<div class="sc-top"><button class="sc-btn pri" id="scNew">✏️ رسالة لحد</button>' +
      '<button class="sc-btn" id="scReload" style="margin-inline-start:auto;">↻</button></div>' +
      rowHtml('all') +
      '<div class="sc-sec">💬 رسايل خاصة</div>' +
      (rooms.length ? rooms.map(rowHtml).join('') : '<div class="sc-empty">لسه مكلّمتش حد لوحده — دوس «✏️ رسالة لحد»</div>');
    bindRows();
    document.getElementById('scNew').onclick = function () { S.view = 'new'; S.q = ''; paint(); };
    document.getElementById('scReload').onclick = function () { fetchNew(true); };
  }
  function bindRows() {
    Array.prototype.forEach.call(S.host.querySelectorAll('[data-room]'), function (el) {
      el.onclick = function () { openRoom(el.getAttribute('data-room')); };
    });
  }

  function paintNew() {
    S.host.removeAttribute('data-room'); S.host.style.height = '';
    var q = S.q.trim().toLowerCase();
    var list = S.contacts.filter(function (c) { return c.email !== S.me && (!q || (c.name + ' ' + ((ROLE[c.role] || {}).t || '')).toLowerCase().indexOf(q) !== -1); });
    var html = '';
    ROLE_ORDER.forEach(function (r) {
      var g = list.filter(function (c) { return c.role === r; });
      if (!g.length) return;
      html += '<div class="sc-sec">' + ROLE[r].i + ' ' + esc(ROLE[r].t) + '</div>' +
        g.map(function (c) {
          return '<div class="sc-row" data-room="' + esc(dmRoom(c.email)) + '"><span class="sc-ic">' + ROLE[r].i + '</span>' +
                 '<span class="sc-mid"><div class="sc-nm">' + esc(c.name) + '</div></span></div>';
        }).join('');
    });
    S.host.innerHTML = '<button class="sc-back" id="scBack">← رجوع</button>' +
      '<input class="sc-q" id="scQ" placeholder="🔍 دوّر على اسم أو دور…" value="' + esc(S.q) + '">' +
      (html || '<div class="sc-empty">مفيش حد بالاسم ده</div>');
    bindRows();
    document.getElementById('scBack').onclick = function () { S.view = 'list'; paint(); };
    var qi = document.getElementById('scQ');
    qi.oninput = function () { S.q = qi.value; var p = qi.selectionStart; paint(); var n = document.getElementById('scQ'); if (n) { n.focus(); try { n.setSelectionRange(p, p); } catch (e) {} } };
  }

  function paintRoom() {
    var room = S.room, arr = S.msgs[room] || [];
    var other = roomOther(room);
    var html = '', day = '';
    arr.forEach(function (m) {
      var d = dayLbl(m.created_at);
      if (d !== day) { day = d; html += '<div class="sc-day"><span>' + esc(d) + '</span></div>'; }
      var mine = m.sender_email === S.me;
      var r = ROLE[m.sender_role] || { t: '', i: '' };
      html += '<div class="sc-m' + (mine ? ' me' : '') + '">' +
        ((!mine && room === 'all') ? '<div class="sc-cap">' + r.i + ' ' + esc(m.sender_name || '') + ((r.t && r.t !== m.sender_name) ? ' · ' + esc(r.t) : '') + '</div>' : '') +
        '<div class="sc-b">' + esc(m.body) + '</div><div class="sc-t">' + esc(when(m.created_at)) + '</div></div>';
    });
    var listHtml = html || '<div class="sc-empty">' + (room === 'all' ? 'اكتب أول رسالة للكل 👋' : 'ابدأ الكلام 👋') + '</div>';
    // ⚠️ نفس المحادثة مفتوحة؟ نحدّث الرسايل بس — من غير ما نلمس خانة الكتابة.
    //    لو رسمنا كله، الكيبورد بيقفل في وش اللي بيكتب أول ما رسالة توصل.
    var L0 = document.getElementById('scList');
    if (L0 && S.host.contains(L0) && S.host.getAttribute('data-room') === room) {
      var atEnd = L0.scrollHeight - L0.scrollTop - L0.clientHeight < 80;
      L0.innerHTML = listHtml;
      if (atEnd) L0.scrollTop = L0.scrollHeight;
      if (!document.hidden) markRead(room);
      return;
    }
    S.host.setAttribute('data-room', room);
    S.host.innerHTML = '<div class="sc-room">' +
      '<div class="sc-head"><button class="sc-back" id="scBack">←</button><div class="sc-nm">' + esc(roomTitle(room)) +
      (other ? ' <small style="font-weight:700;color:var(--muted);">· ' + esc((ROLE[personRole(other)] || {}).t || '') + '</small>' : '') + '</div></div>' +
      '<div class="sc-list" id="scList">' + listHtml + '</div>' +
      '<div class="sc-send"><textarea id="scTxt" rows="1" maxlength="2000" placeholder="' + (room === 'all' ? 'رسالة للكل…' : 'اكتب رسالتك…') + '"></textarea>' +
      '<button id="scGo">إرسال</button></div></div>';
    // ارتفاع اللوحة كامل عشان خانة الكتابة تقعد تحت
    S.host.style.height = '100%';
    var t = document.getElementById('scTxt');
    t.oninput = function () { t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; };
    t.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && innerWidth > 760) { e.preventDefault(); send(); } };
    document.getElementById('scGo').onclick = send;
    document.getElementById('scBack').onclick = function () { S.view = 'list'; S.room = null; S.host.style.height = ''; S.host.removeAttribute('data-room'); paint(); };
    var L = document.getElementById('scList'); L.scrollTop = L.scrollHeight;
    if (!document.hidden) markRead(room);
  }

  function openRoom(room) {
    S.view = 'room'; S.room = room;
    if (!S.msgs[room]) S.msgs[room] = [];
    paint();
    setTimeout(function () { var t = document.getElementById('scTxt'); if (t && innerWidth > 760) t.focus(); }, 60);
  }

  // ---------- إرسال ----------
  var sending = false;
  async function send() {
    var t = document.getElementById('scTxt'), b = document.getElementById('scGo');
    if (!t || sending) return;
    var body = t.value.trim();
    if (!body) return;
    var db = DB(); if (!db) { alert('مفيش اتصال بالسيرفر'); return; }
    sending = true; if (b) b.disabled = true;
    try {
      var r = await db.from('staff_messages').insert({ room: S.room, body: body })
        .select('id,room,sender_email,sender_name,sender_role,body,created_at').single();
      // ⚠️ Supabase مابيرميش خطأ — لازم نبص على .error ونقوله بصوت عالي
      if (r.error) throw r.error;
      t.value = ''; t.style.height = '';
      addMsg(r.data);
      paint();
    } catch (e) {
      console.error('staff chat send failed:', e);
      var msg = (e && (e.message || e.hint)) || String(e);
      alert('⚠️ الرسالة ماتبعتتش:\n' + msg + (/staff_messages|relation|schema cache/i.test(msg) ? '\n\n(ملف SQL رقم 89 لسه ما اتشغّلش)' : ''));
    } finally {
      sending = false;
      var b2 = document.getElementById('scGo'); if (b2) b2.disabled = false;
    }
  }

  // ---------- التحميل ----------
  var COLS = 'id,room,sender_email,sender_name,sender_role,body,created_at';
  async function boot() {
    var db = DB(); if (!db) return false;
    try {
      var s = await db.auth.getSession();
      var em = s && s.data && s.data.session && s.data.session.user && s.data.session.user.email;
      if (!em) return true;                                // مش داخل — مفيش شات
      S.me = String(em).toLowerCase();
      loadRead();
      var c = await db.rpc('chat_contacts');
      if (c.error) {
        // HR / حساب مش مسموحله → الأداة ماتظهرش أصلاً. ولو الملف لسه ما اتشغّلش → نقول.
        if (/chat_contacts|function|schema cache/i.test(c.error.message || '')) {
          S.err = 'الشات لسه مش جاهز على السيرفر — ملف SQL رقم 89 لسه ما اتشغّلش';
          register();
        } else console.info('staff chat: مش متاح للحساب ده');
        return true;
      }
      S.contacts = c.data || [];
      S.byEmail = {}; S.contacts.forEach(function (x) { S.byEmail[x.email] = x; });
      register();
      var r = await db.from('staff_messages').select(COLS).order('created_at', { ascending: false }).limit(KEEP);
      if (r.error) throw r.error;
      (r.data || []).reverse().forEach(addMsg);
      S.ok = true; S.err = '';
      paint();
      try { IFixDock.refresh(); } catch (e) {}
      subscribe();
    } catch (e) {
      console.error('staff chat boot:', e);
      S.err = 'مقدرناش نجيب الرسايل — اتأكد من النت'; paint();
    }
    return true;
  }

  // «فيه جديد من آخر رسالة عندي؟» — صف أو اتنين، مش كل الرسايل
  var fetching = false;
  async function fetchNew(loud) {
    var db = DB(); if (!db || !S.ok || fetching) return;
    fetching = true;
    try {
      var q = db.from('staff_messages').select(COLS).order('created_at', { ascending: true }).limit(200);
      if (S.lastAt) q = q.gt('created_at', S.lastAt);
      var r = await q;
      if (r.error) throw r.error;
      var any = false;
      (r.data || []).forEach(function (m) { if (addMsg(m)) any = true; });
      if (any || loud) { paint(); try { IFixDock.refresh(); } catch (e) {} }
    } catch (e) { if (loud) alert('⚠️ مقدرناش نحدّث: ' + ((e && e.message) || e)); }
    fetching = false;
  }

  // ---------- اللحظي ----------
  var chan = null;
  async function subscribe() {
    var db = DB(); if (!db || chan) return;
    // ⚠️ لازم توكن الموظف — من غيره القفل بيحجب الأحداث في صمت
    try {
      var s = await db.auth.getSession();
      var tok = s && s.data && s.data.session && s.data.session.access_token;
      if (tok && db.realtime && db.realtime.setAuth) db.realtime.setAuth(tok);
    } catch (e) {}
    try {
      chan = db.channel('staff_chat_live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_messages' }, function (p) {
          var m = p && p.new;
          if (!m || !addMsg(m)) return;
          var mine = m.sender_email === S.me;
          if (!mine && !viewing(m.room)) toast(m);
          if (S.host && S.host.isConnected) paint();
          try { IFixDock.refresh(); } catch (e) {}
        })
        .subscribe(function (st) {
          if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') console.warn('staff chat realtime:', st);
          if (st === 'SUBSCRIBED') fetchNew(false);   // اللي فات واحنا بنشترك
        });
    } catch (e) { console.warn('staff chat subscribe:', e); }
  }

  function toast(m) {
    try { if (navigator.vibrate) navigator.vibrate([90, 50, 90]); } catch (e) {}
    var t = document.createElement('div');
    t.className = 'sc-toast';
    var r = ROLE[m.sender_role] || { i: '💬' };
    t.textContent = r.i + ' ' + (m.sender_name || 'موظف') + (m.room === 'all' ? ' (للكل)' : '') + ': ' +
                    (m.body.length > 90 ? m.body.slice(0, 90) + '…' : m.body);
    t.onclick = function () { t.remove(); try { IFixDock.open('chat'); } catch (e) {} openRoom(m.room); };
    document.body.appendChild(t);
    setTimeout(function () { try { t.remove(); } catch (e) {} }, 8000);
  }

  // ---------- التسجيل في الرف ----------
  var registered = false;
  function register() {
    if (registered) return;
    registered = true;
    css();
    IFixDock.register({
      id: 'chat', icon: '💬', title: 'شات الموظفين',
      badge: function () { return totalUnread(); },
      render: function (h) { S.host = h; paint(); },
      onShow: function () { paint(); fetchNew(false); if (S.view === 'room') markRead(S.room); }
    });
    // كان مفتوح على الأسيست القديم؟ يفتح على الشات
    try { if (localStorage.getItem('ifix-dock-open') === '1' && localStorage.getItem('ifix-dock-tool') === 'chat') IFixDock.open('chat'); } catch (e) {}
  }

  // الصفحة رجعت قدامك → نشوف الجديد (اللحظي ممكن يكون نام والموبايل في جيبك)
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    fetchNew(false);
    if (viewing(S.room)) markRead(S.room);
  });

  // ⚠️ السكربت ده ممكن يتحمّل قبل ما الصفحة تعمل sb — بنستنى شوية
  var tries = 0;
  function start() {
    if (!DB()) { if (tries++ < 50) setTimeout(start, 400); return; }
    boot();
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start);
  else start();
})();
