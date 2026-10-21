// ============================================================
// FIX TEAM — المترجم (build.mjs)
// ------------------------------------------------------------
// 🧸 بالبلدي: المتصفح بيفهم JS بس. ملفات TS زي كراسة فيها ورق
//    صغير لازق جنب كل كلمة («دي رقم» · «دي اسم»). الملف ده هو
//    اللي بيشيل الورق الصغير ويطلّع JS نضيف المتصفح يقراه.
//
// بيعمل إيه بالظبط؟
//   ① بيعمل فولدر فاضي اسمه dist
//   ② بينسخ فيه كل ملفات الموقع زي ما هي (html · صور · json · js لسه ماتحوّلش)
//   ③ كل ملف في فولدر ts/ بيتحوّل لـ js بنفس الاسم:
//        ts/statuses.ts        →  dist/statuses.js
//        ts/pages/x.ts         →  dist/pages/x.js
//   ④ Cloudflare Pages بيرفع فولدر dist بس
//
// ⚠️ الملفات هنا «سكريبتات عادية» مش «موديولات» (زي الموقع من الأول):
//    أي const أو function فوق خالص في ملف بيبقى متشاف من كل الملفات
//    التانية في نفس الصفحة. عشان كده ممنوع import/export في ts/ —
//    المترجم بيوقف ويقولك لو لقاها.
// ⚠️ المترجم ده **مابيوقفش** عشان أخطاء الأنواع — بيشيل الورق الصغير
//    وخلاص. فحص الأنواع منفصل: npm run check
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const OUT  = path.join(ROOT, 'dist');
const SRC  = path.join(ROOT, 'ts');

// حاجات مابتتنسخش للموقع (أدوات البناء نفسها)
const SKIP = new Set([
  'dist', 'ts', 'node_modules', '.git', '.github', 'functions',
  'package.json', 'package-lock.json', 'tsconfig.json',
  'build.mjs', 'build.sh', 'check-pages.mjs', '.gitignore', '.DS_Store',
]);

function copyTree(from, to){
  fs.mkdirSync(to, { recursive: true });
  for(const name of fs.readdirSync(from)){
    if(from === ROOT && SKIP.has(name)) continue;
    const a = path.join(from, name), b = path.join(to, name);
    const st = fs.statSync(a);
    if(st.isDirectory()) copyTree(a, b);
    else fs.copyFileSync(a, b);
  }
}

function listTs(dir){
  if(!fs.existsSync(dir)) return [];
  const out = [];
  for(const name of fs.readdirSync(dir)){
    const p = path.join(dir, name);
    if(fs.statSync(p).isDirectory()) out.push(...listTs(p));
    else if(name.endsWith('.ts') && !name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

// ① + ②
fs.rmSync(OUT, { recursive: true, force: true });
copyTree(ROOT, OUT);

// ③
let failed = 0, done = 0;
for(const file of listTs(SRC)){
  const rel  = path.relative(SRC, file);                 // statuses.ts
  const dest = path.join(OUT, rel.replace(/\.ts$/, '.js'));
  const src  = fs.readFileSync(file, 'utf8');

  // ممنوع import/export — الصفحات بتحمّل الملفات <script> عادي
  const sf = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true);
  const isModule = sf.statements.some(s =>
    ts.isImportDeclaration(s) || ts.isExportDeclaration(s) || ts.isExportAssignment(s) ||
    (ts.canHaveModifiers(s) && (ts.getModifiers(s) || []).some(m => m.kind === ts.SyntaxKind.ExportKeyword)));
  if(isModule){
    console.error(`❌ ${rel}: فيه import/export — الملفات هنا سكريبتات عادية، شيلهم.`);
    failed++; continue;
  }

  const res = ts.transpileModule(src, {
    fileName: rel,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,       // كل موبايلات المحل بتفهمه (آيفون ١٤+ · أندرويد كروم)
      module: ts.ModuleKind.ESNext,
      removeComments: false,                // الشرح بالعربي يفضل في الملف المترجم
      useDefineForClassFields: true,
    },
  });
  const errs = (res.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  if(errs.length){
    for(const d of errs) console.error(`❌ ${rel}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
    failed++; continue;
  }

  // 🧸 TypeScript بيحط «"use strict";» أول الملف من نفسه — ده بيخلّي
  //    المتصفح أشد في حاجات قليلة (زي متغير اتكتب من غير let). الملفات
  //    القديمة اتكتبت من غيره، فبنشيله عشان السلوك يفضل زي ما هو بالظبط.
  //    (لو الملف الأصلي نفسه كاتبه، بيفضل.)
  let js = res.outputText;
  if(!/^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/|\s)*["']use strict["']/.test(src)){
    js = js.replace(/^"use strict";\r?\n/, '');
  }

  if(fs.existsSync(dest)){
    console.warn(`⚠️  ${rel.replace(/\.ts$/, '.js')} القديم لسه موجود جنب ts/${rel} — النسخة المترجمة من ts هي اللي اترفعت. امسح القديم من الريبو.`);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, js);
  done++;
}

if(failed){
  console.error(`\n🛑 البناء وقف: ${failed} ملف فيه مشكلة.`);
  process.exit(1);
}
console.log(`✅ اتبنى: ${done} ملف ts اتحوّل لـ js · كل الموقع في dist/`);
