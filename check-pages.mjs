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

// 🧸 الصفحة نفسها بتعرّف أسامي (زي ME أو nameOf) ممكن تكون متوصوفة في
//    legacy-globals.d.ts عشان صفحات تانية. وقت فحص الصفحة دي بنخبّي
//    الوصف ده من legacy — عشان المدرّس مايقولش «متعرّف مرتين».
//    (الملف نفسه على الديسك مابيتغيّرش.)
function topNames(file){
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const names = new Set();
  for(const st of sf.statements){
    if(ts.isVariableStatement(st)) for(const d of st.declarationList.declarations){ if(ts.isIdentifier(d.name)) names.add(d.name.text); }
    else if((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) names.add(st.name.text);
  }
  return names;
}
function legacyWithout(text, names){
  const sf = ts.createSourceFile('legacy.d.ts', text, ts.ScriptTarget.Latest, true);
  const cut = [];
  for(const st of sf.statements){
    if(ts.isVariableStatement(st) && st.declarationList.declarations.every(d => ts.isIdentifier(d.name) && names.has(d.name.text)))
      cut.push([st.getFullStart(), st.getEnd()]);
  }
  let out = text;
  for(const [a, b] of cut.reverse()) out = out.slice(0, a) + out.slice(b);
  return out;
}
const LEGACY = path.join(SRC, 'legacy-globals.d.ts');

let bad = 0;
for(const page of pages){
  const names = topNames(page);
  const host = ts.createCompilerHost(cfg.options);
  const read = host.readFile.bind(host), getSf = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, lang, onErr) => {
    if(path.resolve(fileName) === LEGACY){
      return ts.createSourceFile(fileName, legacyWithout(read(fileName), names), lang, true);
    }
    return getSf(fileName, lang, onErr);
  };
  const prog = ts.createProgram([...shared, ...extra, page], cfg.options, host);
  const diags = ts.getPreEmitDiagnostics(prog);
  const rel = path.relative(ROOT, page);
  if(diags.length){
    bad++;
    console.error(`❌ ${rel}: ${diags.length} غلطة`);
    for(const d of diags.slice(0, Number(process.env.MAXD || 60))){
      const where = d.file ? `${path.relative(ROOT, d.file.fileName)}(${d.file.getLineAndCharacterOfPosition(d.start).line + 1})` : '';
      console.error('   ', where, ts.flattenDiagnosticMessageText(d.messageText, ' '));
    }
  } else console.log(`✅ ${rel}: صفر أخطاء`);
}
if(bad) process.exit(1);
