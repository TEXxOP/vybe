#!/usr/bin/env node
/**
 * CSS Module integrity checker — no dependencies, runs on plain Node.
 *
 * The previous build had 20 globally-scoped stylesheets in which import order
 * decided which rule won, so a class could be silently overridden from three
 * files away. CSS Modules fix the scoping, but they introduce two new silent
 * failure modes that a bundler will happily ignore:
 *
 *   1. `styles.thing` where the stylesheet has no `.thing` — resolves to
 *      `undefined`, React renders `class="undefined"`, and the element simply
 *      appears unstyled. No error, anywhere.
 *   2. `var(--token)` where the token was never declared — the property is
 *      invalid at computed-value time and silently falls back to inherited or
 *      initial. Also no error, anywhere.
 *
 * Both are invisible without a browser, so this script is how we see them.
 *
 * Usage: node scripts/check-css-modules.mjs
 * Exits 1 if there are errors.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');

/* Custom properties that are set at runtime rather than declared in CSS.
   press.js writes the misregistration spring onto <html>; Reveal passes a
   per-element stagger. Neither can be found by scanning stylesheets. */
const RUNTIME_PROPS = new Set([
    '--mis-x',
    '--mis-y',
    '--mis-a',
    '--reveal-delay',
]);

const errors = [];
const warnings = [];

function walk(dir, out = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, out);
        else out.push(full);
    }
    return out;
}

const files = walk(SRC);
const jsxFiles = files.filter((f) => f.endsWith('.jsx'));
const cssFiles = files.filter((f) => f.endsWith('.css'));

const rel = (f) => relative(ROOT, f).replace(/\\/g, '/');

/** Comments legitimately quote class names, hex values and filenames, so they
 *  have to come out before anything is extracted or we get phantom `.css`,
 *  `.jsx` and `.onInk` "classes". Newlines are preserved so reported line
 *  numbers still match the file on disk. */
const stripComments = (css) =>
    css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/** The same hazard, worse, in JS. Several files document what they deleted by
 *  quoting the old statement in prose — App.jsx's header explains that
 *  `import './App.css'` is gone, and main.jsx lists the two stylesheets it no
 *  longer loads. Scanned raw, those read as live imports and the checker
 *  reports three failures that are actually three comments. The `[^:]` guard
 *  on the line-comment branch keeps `https://` in a URL from being eaten. */
const stripJsComments = (src) =>
    src
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
        .replace(/(^|[^:])\/\/.*$/gm, (m, pre) => pre);

/** Stylesheets that are meant to be global, and are not a mistake.
 *  global.css is the reset, the element defaults and the few genuinely global
 *  utilities (.skipLink, .visuallyHidden); tokens.css is the token layer it
 *  imports. Everything else in src/ must be a CSS Module. */
const INTENTIONALLY_GLOBAL = /\/(global|tokens)\.css$/;

/* ---- 1. Build the set of every declared custom property -----------------
   Includes properties set from JSX inline styles — `style={{ '--ratio': r }}`
   is how Ink, Marquee and Stamp pass a value into their stylesheet, and those
   are just as real as a declaration in CSS.                                */
const declaredProps = new Set(RUNTIME_PROPS);
for (const f of cssFiles) {
    for (const m of stripComments(readFileSync(f, 'utf8')).matchAll(
        /(--[\w-]+)\s*:/g
    )) {
        declaredProps.add(m[1]);
    }
}
for (const f of jsxFiles) {
    for (const m of readFileSync(f, 'utf8').matchAll(
        /['"](--[\w-]+)['"]\s*:/g
    )) {
        declaredProps.add(m[1]);
    }
}

/* ---- 2. Every var() reference must resolve ------------------------------ */
for (const f of cssFiles) {
    const lines = stripComments(readFileSync(f, 'utf8')).split('\n');
    lines.forEach((line, i) => {
        for (const m of line.matchAll(/var\(\s*(--[\w-]+)/g)) {
            if (!declaredProps.has(m[1])) {
                errors.push(
                    `${rel(f)}:${i + 1}  undefined custom property ${m[1]}`
                );
            }
        }
    });
}

/* ---- 3. Raw hex colours are only allowed in tokens.css ----------------- */
for (const f of cssFiles) {
    if (f.endsWith('tokens.css')) continue;
    const lines = stripComments(readFileSync(f, 'utf8')).split('\n');
    lines.forEach((line, i) => {
        for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
            // Inverted-surface blocks redeclare tokens; those are the one
            // sanctioned exception and are flagged as warnings, not errors.
            if (/--[\w-]+\s*:/.test(line)) {
                warnings.push(
                    `${rel(f)}:${i + 1}  hex ${m[0]} in a token redeclaration`
                );
            } else {
                errors.push(
                    `${rel(f)}:${i + 1}  raw hex ${m[0]} outside tokens.css`
                );
            }
        }
    });
}

/* ---- 4. Every styles.x must exist in the imported module -----------------
   A component may import MORE THAN ONE module — the three admin pages each pair
   their own stylesheet with the shared AdminTable.module.css. An earlier version
   of this check used `src.match(…)`, which returns only the first match, so a
   second import and every reference through it went unverified. That's the worse
   kind of bug in a checker: not a false alarm, a silent pass.

   Unused-class warnings are accumulated across ALL importers and only reported
   once, at the end. Computing them per file would flag every class that any one
   importer happens not to use — which for a stylesheet shared by three pages is
   almost all of them.                                                        */
const definedByCss = new Map(); /* cssPath  -> Set of class names */
const usedByCss = new Map(); /* cssPath  -> Set of class names, union */
const dynamicByCss = new Set(); /* cssPaths indexed with a non-literal */
const importersByCss = new Map(); /* cssPath  -> [jsx files] */

const classesIn = (cssPath) => {
    if (!definedByCss.has(cssPath)) {
        const css = stripComments(readFileSync(cssPath, 'utf8'));
        definedByCss.set(
            cssPath,
            new Set([...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]))
        );
    }
    return definedByCss.get(cssPath);
};

for (const f of jsxFiles) {
    const src = stripJsComments(readFileSync(f, 'utf8'));

    const imports = [
        ...src.matchAll(
            /import\s+(\w+)\s+from\s+['"](\.[^'"]*\.module\.css)['"]/g
        ),
    ];

    if (imports.length === 0) {
        // A component with no module import must not reference a global
        // stylesheet either — that was the old architecture.
        for (const m of src.matchAll(/import\s+['"](\.[^'"]*\.css)['"]/g)) {
            if (!m[1].includes('.module.') && !INTENTIONALLY_GLOBAL.test(m[1])) {
                errors.push(
                    `${rel(f)}  imports global stylesheet ${m[1]} — use a CSS Module`
                );
            }
        }
        continue;
    }

    for (const [, binding, spec] of imports) {
        const cssPath = resolve(dirname(f), spec);
        if (!existsSync(cssPath)) {
            errors.push(`${rel(f)}  imports missing stylesheet ${spec}`);
            continue;
        }

        if (!importersByCss.has(cssPath)) importersByCss.set(cssPath, []);
        importersByCss.get(cssPath).push(f);

        const defined = classesIn(cssPath);

        const used = new Set();
        const dot = new RegExp(`\\b${binding}\\.([A-Za-z_$][\\w$]*)`, 'g');
        const bracket = new RegExp(`\\b${binding}\\[['"]([^'"]+)['"]\\]`, 'g');
        for (const m of src.matchAll(dot)) used.add(m[1]);
        for (const m of src.matchAll(bracket)) used.add(m[1]);

        for (const name of used) {
            if (!defined.has(name)) {
                /* Named by binding, not by "styles", because with two modules in
                   one file "styles.x" would point at the wrong import. */
                errors.push(
                    `${rel(f)}  ${binding}.${name} has no .${name} in ${spec}`
                );
            }
        }

        if (!usedByCss.has(cssPath)) usedByCss.set(cssPath, new Set());
        for (const name of used) usedByCss.get(cssPath).add(name);

        /* Variant classes are reached as styles[tone] / styles[variant], so a
           file that indexes the module with anything other than a string literal
           cannot have its unused classes determined statically. Reporting
           orphans there produces nothing but noise. */
        if (new RegExp(`\\b${binding}\\[\\s*[^'"\\]]`).test(src)) {
            dynamicByCss.add(cssPath);
        }
    }
}

for (const [cssPath, defined] of definedByCss) {
    if (dynamicByCss.has(cssPath)) continue;
    const used = usedByCss.get(cssPath) || new Set();
    for (const name of defined) {
        if (!used.has(name) && !/^(from|to)$/.test(name)) {
            warnings.push(`${rel(cssPath)}  .${name} is never used`);
        }
    }
}

/* A module nobody imports is dead weight — four orphaned admin stylesheets
   survived the rewrite this way, still on disk, imported by nothing. */
for (const f of cssFiles) {
    if (!f.endsWith('.module.css')) continue;
    if (!importersByCss.has(f)) {
        warnings.push(`${rel(f)}  is imported by nothing`);
    }
}

/* ---- Pass 3: relative imports resolve to a file on disk ----------------
   A third silent failure, added after splitting context/CartContext.jsx into
   a .js module plus CartProvider.jsx: eight files import `useCart` from
   '../context/CartContext' with no extension. That still resolves, but only
   because Vite tries .js before .jsx — a rename one directory over can break
   eight call sites and ESLint will not say a word about it, because ESLint
   does not resolve modules. Vite reports it, but only for the route you happen
   to load, and only at runtime.

   Comments are stripped first — see stripJsComments. */

/* Extensionless specifiers, in the order Vite's resolver tries them. */
const RESOLVE_AS = ['', '.js', '.jsx', '.json', '/index.js', '/index.jsx'];

const importSpec = /(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g;

for (const f of files.filter((f) => /\.(js|jsx)$/.test(f))) {
    const src = stripJsComments(readFileSync(f, 'utf8'));
    for (const [, spec] of src.matchAll(importSpec)) {
        const base = resolve(dirname(f), spec);
        if (!RESOLVE_AS.some((ext) => existsSync(base + ext))) {
            errors.push(`${rel(f)}  imports '${spec}', which resolves to nothing`);
        }
    }
}

/* ---- Report ------------------------------------------------------------ */
if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  ! ${w}`);
}

if (errors.length) {
    console.log(`\n${errors.length} error(s):`);
    for (const e of errors) console.log(`  x ${e}`);
    console.log('');
    process.exit(1);
}

console.log(
    `\nOK — ${jsxFiles.length} components, ${cssFiles.length} stylesheets, ` +
    `${declaredProps.size} tokens. No broken class or token references.\n`
);
