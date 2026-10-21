// ============================================================
// FIX TEAM — فحص كود الصفحات (check-pages.mjs)
// ------------------------------------------------------------
// 🧸 بالبلدي: كل صفحة HTML عايشة في «أوضة» لوحدها في المتصفح —
//    فصفحتين ممكن يبقى فيهم دالة بنفس الاسم (load · render …)
//    من غير ما يتخانقوا. لكن المدرّس (tsc) لو شاف كل الملفات مع
//    بعض هيفتكرهم متكررين.
//    فالملف ده بيفحص كل صفحة في ts/pages/ **لوحدها** + الملفات
//    المشتركة (ts/*.ts) — زي ما المتصفح بيشوفها بالظبط.
//
// ⚠️ ده فحص بس — مابيغيّرش ولا حرف ومابيترفعش للموقع.
// الاستخدام: npm run check   (أو: node check-pages.mjs)
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'ts');
const PAGES = path.join(SRC, 'pages');

function listTs(dir, skipPages){
  if(!fs.existsSync(dir)) return [];
  const out = [];
  for(const name of fs.readdirSync(dir)){
    const p = path.join(dir, name);
    if(fs.statSync(p).isDirectory()){ if(skipPages && p === PAGES) continue; out.push(...listTs(p, skipPages)); }
    else if(name.endsWith('.ts')) out.push(p);
  }
  return out;
}

const cfg = ts.getParsedCommandLineOfConfigFile(path.join(ROOT, 'tsconfig.json'), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic(d){ console.error(d.messageText); } });
const shared = listTs(SRC, true);
const extra = fs.existsSync(path.join(ROOT, 'stubs')) ? listTs(path.join(ROOT, 'stubs'), false) : [];
const pages = listTs(PAGES, false).filter(f => !f.endsWith('.d.ts'));

let bad = 0;
for(const page of pages){
  const prog = ts.createProgram([...shared, ...extra, page], cfg.options);
  const diags = ts.getPreEmitDiagnostics(prog);
  const rel = path.relative(ROOT, page);
  if(diags.length){
    bad++;
    console.error(`❌ ${rel}: ${diags.length} غلطة`);
    for(const d of diags.slice(0, 60)){
      const where = d.file ? `${path.relative(ROOT, d.file.fileName)}(${d.file.getLineAndCharacterOfPosition(d.start).line + 1})` : '';
      console.error('   ', where, ts.flattenDiagnosticMessageText(d.messageText, ' '));
    }
  } else console.log(`✅ ${rel}: صفر أخطاء`);
}
if(bad) process.exit(1);
