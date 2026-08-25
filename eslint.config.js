import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * Three environments live in this repo, and the config used to claim they were
 * one. A single block matched `**\/*.{js,jsx}` with `globals.browser`, so every
 * `require`, `module.exports` and `process` in the 18 CommonJS files under
 * backend/ was reported as `no-undef` — 60-plus errors that were not bugs, just
 * a config describing the wrong runtime. `npm run lint` therefore exited 1 on a
 * clean tree, which is how a lint script becomes decoration: it fails so
 * reliably that nobody reads it, and a real error has nowhere to show up.
 *
 * The same pattern also missed `.mjs` entirely, which meant the two integrity
 * checkers in scripts/ — the tools standing in for a browser here — were the
 * only code in the project not being linted.
 */
export default defineConfig([
  globalIgnores(['dist', '**/node_modules']),

  /* ---- 1. The app: browser, ESM, JSX ----------------------------------- */
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // This project has no eslint-plugin-react, so `no-unused-vars` cannot
      // see identifiers that are only referenced from JSX. The existing
      // varsIgnorePattern covers imported components; argsIgnorePattern
      // extends the same intent to component-valued parameters, e.g.
      // `SOCIAL.map(({ Icon }) => <Icon />)`, which is otherwise a false
      // positive. Both patterns rely on the convention that components are
      // PascalCase and plain values are not.
      'no-unused-vars': [
        'error',
        { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' },
      ],

      // Icons.jsx exports one object whose values are all components, rather
      // than exporting each component individually. The rule can't see through
      // the object, so it reports the file as exporting a non-component — but
      // there's nothing to fix in the code: `Icons.Cart` is the call site in
      // ten files, and splitting it into forty named exports to satisfy a rule
      // about hot-reload granularity would be the tail wagging the dog. The
      // real cost is that editing an icon triggers a full reload instead of an
      // HMR patch, which is a fine trade for an append-only glyph file.
      // allowExportNames is the option provided for exactly this declaration.
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['Icons'] },
      ],
    },
  },

  /* ---- 2. Tooling and build config: Node, ESM --------------------------
     ecmaVersion 'latest' rather than 2020, because check-routes.mjs imports the
     route manifest with a top-level await — 2020 predates it and the file would
     fail to parse. No React plugins: there is no JSX out here. */
  {
    files: ['scripts/**/*.{js,mjs}', 'vite.config.js', 'eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
  },

  /* ---- 3. The API: Node, CommonJS --------------------------------------
     `sourceType: 'commonjs'` is what makes `require` and `module` defined, and
     it matches backend/package.json, which has no `type` field. Declaring the
     runtime is not the same as changing it — nothing under backend/ is touched
     by this, the errors were only ever the config's. */
  {
    files: ['backend/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'commonjs' },
    },
    rules: {
      // Two Express idioms, encoded rather than edited away — this is the API's
      // code, not the redesign's, and neither finding is a defect:
      //
      //   `next` — Express identifies error-handling middleware by ARITY. A
      //   4-parameter function is an error handler; a 3-parameter one is
      //   ordinary middleware. So deleting the unused `next` from
      //   `app.use((err, req, res, next) => …)` in server.js would not tidy the
      //   signature, it would silently demote the global error handler to
      //   middleware that never runs on an error. The parameter has to stay
      //   unused for the framework to see it.
      //
      //   caughtErrors — the optional-auth middleware swallows a bad token on
      //   purpose (`catch (error) { next() }`: no user attached, request
      //   continues as a guest). The binding is unused because the error is
      //   genuinely uninteresting there.
      //
      // Scoped to this block only. src/ keeps the stricter default, since an
      // unused binding in the app is far more often a mistake than an idiom.
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^next$', caughtErrors: 'none' },
      ],
    },
  },
])
