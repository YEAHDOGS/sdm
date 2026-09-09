#!/usr/bin/env node
/**
 * svelte-smoke.mjs — static smoke check for .svelte components.
 *
 * No npm install needed (this machine is default-deny on network), so
 * `npm run check` / `npm run build` can't run here. This script catches the
 * cheap, common breakage instead:
 *
 *   1. Balanced delimiters — {} () [] in every .svelte file
 *      (skips the contents of <style> blocks, and string/template literals
 *      inside <script>).
 *   2. Import resolution — every relative or $lib import in .svelte and
 *      .js sources must point at an existing file (tries the literal path,
 *      then + .js, + .svelte, and /index.js).
 *
 * Usage: node site/scripts/svelte-smoke.mjs   (run from site/, or pass the
 * site dir as the first arg). Exit 0 when clean, 1 with a report otherwise.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';

const siteDir = resolve(process.argv[2] ?? join(process.cwd(), 'site'));
const srcDir = join(siteDir, 'src');
const libDir = join(srcDir, 'lib');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (p.endsWith('.svelte') || p.endsWith('.js')) out.push(p);
  }
  return out;
}

/** Strip <style> blocks, comments, and string/template literals. */
function stripNoise(source) {
  let s = source.replace(/<style[\s\S]*?<\/style>/g, '');
  s = s.replace(/\/\*[\s\S]*?\*\//g, ''); // block comments
  s = s.replace(/(^|[^:\\\w$])\/\/.*$/gm, '$1'); // line comments
  // strings: '...', "...", `...` (handles escapes, not nested ${} contents)
  s = s.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, (m) =>
    m.startsWith('`') ? m.replace(/`(?:[^`\\]|\\.)*`/g, '``') : "''"
  );
  return s;
}

function checkBalance(path) {
  const s = stripNoise(readFileSync(path, 'utf8'));
  const pairs = { '{': '}', '(': ')', '[': ']' };
  const stack = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (pairs[ch]) stack.push({ ch, i });
    else if (ch === '}' || ch === ')' || ch === ']') {
      const top = stack.pop();
      if (!top || pairs[top.ch] !== ch) {
        return `unbalanced '${ch}' at char ${i} (expected '${top ? pairs[top.ch] : '?'}')`;
      }
    }
  }
  if (stack.length) return `unclosed '${stack[stack.length - 1].ch}' at char ${stack[stack.length - 1].i}`;
  return null;
}

const IMPORT_RE = /import\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g;

function resolveImport(spec, fromFile) {
  let candidate;
  if (spec.startsWith('$lib')) candidate = join(libDir, spec.slice('$lib'.length));
  else if (spec.startsWith('.')) candidate = resolve(dirname(fromFile), spec);
  else return null; // bare specifier (npm dep) — can't check without install
  if (existsSync(candidate) && statSync(candidate).isFile()) return null;
  for (const t of [`${candidate}.js`, `${candidate}.svelte`, join(candidate, 'index.js')]) {
    if (existsSync(t) && statSync(t).isFile()) return null;
  }
  return candidate;
}

function main() {
  if (!existsSync(srcDir)) {
    console.error(`svelte-smoke: src dir not found at ${srcDir}`);
    process.exit(1);
  }
  const files = walk(srcDir);
  const problems = [];
  for (const f of files) {
    const balance = f.endsWith('.svelte') ? checkBalance(f) : null;
    if (balance) problems.push(`${rel(f)}: ${balance}`);
    const src = readFileSync(f, 'utf8');
    let m;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(src))) {
      const missing = resolveImport(m[1], f);
      if (missing) problems.push(`${rel(f)}: import '${m[1]}' does not resolve`);
    }
  }
  if (problems.length) {
    console.log('svelte-smoke: FAILED');
    for (const p of problems) console.log(`  ✖ ${p}`);
    process.exit(1);
  }
  console.log(`svelte-smoke: OK — ${files.length} files checked (balance + import resolution)`);
}

const rel = (p) => p.replace(siteDir + '/', '');
main();
