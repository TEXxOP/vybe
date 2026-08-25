import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

/**
 * One stylesheet import, at the root.
 *
 * styles/global.css @imports tokens.css, so the whole cascade enters here in a
 * defined order and nothing further down the tree can reorder it.
 *
 * What used to be here instead:
 *
 *   import './index.css'            // 295 lines: the old coral design system
 *   import './styles/animations.css' // 232 lines: global img/reveal/button rules
 *
 * Both are deleted. They weren't merely unused — they were actively defeating
 * the new system. index.css redeclared `--font-display` as Outfit at :root and
 * loaded before anything else, so every rule in the rebuild that asked for the
 * display face silently got the old one. animations.css set `img { opacity: 0 }`
 * globally and revealed images only via a `.image-loaded` class that nothing
 * adds any more, and it redefined `[data-reveal]` with a transition built from
 * `var(--ease-out-premium)` — a token that no longer exists, which makes the
 * shorthand invalid, which meant every reveal on the site snapped instead of
 * animating.
 *
 * That was the real disease in this codebase: twenty stylesheets, all global,
 * where import order decided the winner and no file could be read on its own.
 */
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
