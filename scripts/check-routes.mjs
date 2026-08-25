#!/usr/bin/env node
/**
 * Route integrity checker — no dependencies, runs on plain Node.
 *
 * The single worst bug in the previous build was not a crash. Eight links —
 * the seven Customer Support links in the footer and /orders in the account
 * menu — pointed at paths that were never registered as routes. React Router
 * matched nothing, rendered nothing, and the page came up as a header and a
 * footer with an empty <main> between them. No console error. No 404. Nothing
 * to notice unless you clicked the link and looked.
 *
 * lib/routes.js makes that *structurally* harder by declaring every path once.
 * This script closes the loop, in both directions:
 *
 *   - every path in the manifest is actually mounted in App.jsx, so a link
 *     cannot point at an unregistered route;
 *   - every route mounted in App.jsx is in the manifest, so a page cannot be
 *     reachable only by typing its URL;
 *   - nothing links by string literal, which is how the manifest stays the
 *     single source of truth rather than a suggestion;
 *   - every ANCHORS target has a matching id= in some component, because
 *     `/#drops` with no `id="drops"` is the same dead link wearing a hash.
 *
 * All four are invisible without a browser, which is the whole reason this
 * exists.
 *
 * Usage: node scripts/check-routes.mjs
 * Exits 1 if there are errors.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');
const APP = join(SRC, 'App.jsx');
const MANIFEST = join(SRC, 'lib', 'routes.js');

const errors = [];
const warnings = [];

const rel = (f) => relative(ROOT, f).replace(/\\/g, '/');

function walk(dir, out = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, out);
        else out.push(full);
    }
    return out;
}

/** Comments quote the very bugs this script checks for — Login.jsx's header
 *  explains that `navigate('/')` was wrong, AdminRoute's quotes a <Navigate>,
 *  and routes.js's own docstring says "components link via ROUTES.x". Scanned
 *  raw, those read as live code and the checker reports four faults that are
 *  four explanations. The `[^:]` guard keeps `https://` intact. */
const stripJsComments = (src) =>
    src
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
        .replace(/(^|[^:])\/\/.*$/gm, (m, pre) => pre);

const files = walk(SRC);
const jsxFiles = files.filter((f) => f.endsWith('.jsx'));
const codeFiles = files.filter((f) => /\.(js|jsx)$/.test(f));

/* ---- 1. Load the manifest for real ---------------------------------------
   routes.js is plain ESM with no imports and no JSX, so Node can execute it.
   Importing the actual values beats regex-parsing them: `shopCategory` and
   `ROUTES.product` are functions, and a parser would have to guess what they
   return, where an import can simply call them.                             */
const { ROUTES, ANCHORS, STATIC_PATHS } = await import(
    pathToFileURL(MANIFEST).href
);

const normalise = (p) =>
    p.replace(/\/{2,}/g, '/').replace(/(.)\/$/, '$1') || '/';

/* ---- 2. Parse the <Routes> tree, resolving nesting -----------------------
   /admin/products is not written anywhere in App.jsx. It's `path="products"`
   inside `path={ROUTES.admin}`, so a checker that only compared literals would
   declare two of the three admin routes unmounted. Parent prefixes have to be
   accumulated.

   Attributes cannot be matched with `[^>]*` — `element={<HomePage />}` puts a
   `>` inside the tag. So the scan tracks brace depth and stops at the first
   `>` outside braces.                                                       */
function parseRouteTree(block) {
    const mounted = new Map(); /* path -> 1-based line, for error messages */
    const lineAt = (index) => block.slice(0, index).split('\n').length;
    const stack = [''];

    for (let i = 0; i < block.length; i += 1) {
        if (block.startsWith('</Route>', i)) {
            if (stack.length > 1) stack.pop();
            i += 7;
            continue;
        }
        if (!block.startsWith('<Route', i)) continue;

        let depth = 0;
        let j = i + 6;
        for (; j < block.length; j += 1) {
            const c = block[j];
            if (c === '{') depth += 1;
            else if (c === '}') depth -= 1;
            else if (c === '>' && depth === 0) break;
        }
        const attrs = block.slice(i + 6, j);
        const selfClosing = attrs.trimEnd().endsWith('/');
        const parent = stack[stack.length - 1];

        /* path={ROUTES.foo} — resolved through the manifest, so a typo'd key
           reads as `undefined` and is reported rather than silently mounting a
           route called "/undefined". */
        let segment = null;
        const viaManifest = attrs.match(/path=\{\s*ROUTES\.(\w+)\s*\}/);
        const viaLiteral = attrs.match(/path=(['"])([^'"]*)\1/);

        if (viaManifest) {
            const key = viaManifest[1];
            if (typeof ROUTES[key] !== 'string') {
                errors.push(
                    `src/App.jsx:${lineAt(i)}  path={ROUTES.${key}} — ` +
                    `${key} is not a string path in the manifest`
                );
            } else {
                segment = ROUTES[key];
            }
        } else if (viaLiteral) {
            segment = viaLiteral[2];
        }

        const isIndex = /(^|\s)index(\s|$|=)/.test(attrs);
        const full =
            segment === null
                ? parent
                : normalise(
                    segment.startsWith('/') || segment === '*'
                        ? segment
                        : `${parent}/${segment}`
                );

        /* A pathless <Route element={<AdminLayout />}> is a layout wrapper: it
           mounts nothing itself, it only nests. An index route mounts its
           parent's path. */
        if (segment !== null || isIndex) {
            if (!mounted.has(full)) mounted.set(full, lineAt(i));
        }
        if (!selfClosing) stack.push(full);

        i = j;
    }

    return mounted;
}

const appSrc = stripJsComments(readFileSync(APP, 'utf8'));
const routesBlock = appSrc.match(/<Routes>([\s\S]*?)<\/Routes>/);

if (!routesBlock) {
    errors.push('src/App.jsx  has no <Routes> block — cannot verify routing');
}

const mounted = routesBlock ? parseRouteTree(routesBlock[1]) : new Map();

/* Patterns that are deliberately absent from the manifest: the catch-all, and
   parameterised routes, which are reached through a builder rather than a
   constant. */
const isDynamic = (p) => p === '*' || p.includes(':');

/* ---- 3. Every manifest path must be mounted ----------------------------- */
for (const path of STATIC_PATHS) {
    if (!mounted.has(normalise(path))) {
        errors.push(
            `lib/routes.js  '${path}' is in the manifest but not mounted in ` +
            `App.jsx — links to it will render an empty <main>`
        );
    }
}

/* ---- 4. Every mounted route must be in the manifest --------------------- */
const staticSet = new Set(STATIC_PATHS.map(normalise));
for (const [path, line] of mounted) {
    if (isDynamic(path) || staticSet.has(path)) continue;
    warnings.push(
        `src/App.jsx:${line}  '${path}' is mounted but not in the manifest — ` +
        `reachable only by typing the URL`
    );
}

/* ---- 5. Path builders must match a mounted dynamic route ----------------
   ROUTES.product(id) has to line up with `path="/product/:id"`. Calling the
   builder with a sentinel and matching segment-wise is the only honest way to
   check it — the alternative is trusting that two strings written in different
   files stayed in step.                                                     */
const dynamicMounted = [...mounted.keys()].filter((p) => p.includes(':'));

const matchesPattern = (actual, pattern) => {
    const a = actual.split('/');
    const b = pattern.split('/');
    if (a.length !== b.length) return false;
    return b.every((seg, i) => seg.startsWith(':') || seg === a[i]);
};

for (const [key, value] of Object.entries(ROUTES)) {
    if (typeof value !== 'function') continue;
    const produced = normalise(String(value('SENTINEL')).split('?')[0]);
    if (!dynamicMounted.some((p) => matchesPattern(produced, p))) {
        errors.push(
            `lib/routes.js  ROUTES.${key}() builds '${produced}', which no ` +
            `mounted route matches`
        );
    }
}

/* ---- 6. Nothing may link by string literal -----------------------------
   `to="/shop"` works right up until a path changes in the manifest and this one
   call site doesn't.

   The property form `to: '/shop'` matters more than the attribute form, and it
   is easy to leave out. Header and Footer both build their link lists as arrays
   of `{ label, to }` and map over them, so almost every navigation link in the
   app is a property, not an attribute — including all seven Customer Support
   links, which is to say every one of the dead links that motivated this file.
   A checker that only matched `to=` would have missed the entire original bug.

   Scanned across .js as well as .jsx, since a helper is just as capable of
   building a path. Fragment-only hrefs are fine (the skip link is href="#main"),
   as are external schemes — the leading-slash guard covers both.

   `path` is deliberately NOT a keyword here. It appears only on <Route>, where a
   literal is a declaration rather than a link — `path="/product/:id"` is the
   mount point, and checks 3 to 5 already verify it against the manifest from the
   parsed tree. Including it would flag the one place a pattern must be written
   out. */
const LINK_LITERAL =
    /\b(?:to|href)\b\s*[=:]\s*(['"])([^'"]*)\1|\bnavigate\(\s*(['"])([^'"]*)\3/g;

for (const f of codeFiles) {
    /* routes.js is the one place a path literal belongs. */
    if (f === MANIFEST) continue;
    const lines = stripJsComments(readFileSync(f, 'utf8')).split('\n');
    lines.forEach((line, i) => {
        for (const m of line.matchAll(LINK_LITERAL)) {
            const value = m[2] ?? m[4];
            if (!value.startsWith('/')) continue; // #hash, http:, mailto:, tel:
            errors.push(
                `${rel(f)}:${i + 1}  links to the literal '${value}' — ` +
                `use ROUTES from lib/routes.js`
            );
        }
    });
}

/* ---- 7. Every manifest entry must actually be used --------------------
   An unreferenced route is a page nothing links to. That is the mirror image of
   the original bug: the route exists, the link doesn't. */
const codeOutsideManifest = codeFiles
    .filter((f) => f !== MANIFEST)
    .map((f) => stripJsComments(readFileSync(f, 'utf8')))
    .join('\n');

for (const key of Object.keys(ROUTES)) {
    if (!new RegExp(`\\bROUTES\\.${key}\\b`).test(codeOutsideManifest)) {
        warnings.push(
            `lib/routes.js  ROUTES.${key} is never referenced — nothing links there`
        );
    }
}
for (const key of Object.keys(ANCHORS)) {
    if (!new RegExp(`\\bANCHORS\\.${key}\\b`).test(codeOutsideManifest)) {
        warnings.push(
            `lib/routes.js  ANCHORS.${key} is never referenced`
        );
    }
}

/* ---- 8. Every anchor must have a scroll target -------------------------
   ScrollManager resolves a hash with getElementById, so `/#drops` needs a live
   `id="drops"` somewhere. Without one the link changes the URL and the page
   sits exactly where it was — indistinguishable from the old build's broken
   anchors, which is the bug this whole section exists to prevent. */
const ids = new Set();
for (const f of jsxFiles) {
    for (const m of stripJsComments(readFileSync(f, 'utf8')).matchAll(
        /\bid=(['"])([^'"]+)\1/g
    )) {
        ids.add(m[2]);
    }
}

for (const [key, value] of Object.entries(ANCHORS)) {
    const [path, hash] = String(value).split('#');
    if (!hash) {
        warnings.push(`lib/routes.js  ANCHORS.${key} has no '#' fragment`);
        continue;
    }
    if (!ids.has(hash)) {
        errors.push(
            `lib/routes.js  ANCHORS.${key} targets #${hash}, but no component ` +
            `renders id="${hash}" — the link will do nothing`
        );
    }
    const base = normalise(path || '/');
    if (!mounted.has(base)) {
        errors.push(
            `lib/routes.js  ANCHORS.${key} points at '${base}', which is not mounted`
        );
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
    `\nOK — ${mounted.size} routes mounted, ${STATIC_PATHS.length} manifest ` +
    `paths, ${Object.keys(ANCHORS).length} anchors. No dead links.\n`
);
