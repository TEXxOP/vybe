import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scroll behaviour for client-side navigation.
 *
 * Replaces the previous build's ScrollToTop, which called
 * `window.scrollTo(0, 0)` on every pathname change and nothing else. That had
 * two consequences:
 *
 *   1. Every anchor link in the app was dead. Clicking "Collections" navigated
 *      to `/#collections`, and ScrollToTop immediately yanked the page back to
 *      the top — so seven nav and footer links appeared to do nothing.
 *   2. Even without it, React Router does not scroll to a hash target on
 *      client-side navigation the way a full page load does. The browser only
 *      honours `#id` when it parses the document.
 *
 * So: no hash means go to the top; a hash means find the target and scroll to
 * it. The retry loop exists because a section may not be mounted yet on a
 * cold navigation from another route — the homepage's sections render after
 * their data resolves, and without the retry the scroll silently no-ops.
 *
 * Vertical offset is handled by `html { scroll-padding-top }` in global.css,
 * which scrollIntoView honours, so the sticky header never covers the target.
 */

const MAX_RETRY_FRAMES = 40; // ~650ms at 60fps

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function ScrollManager() {
    const { pathname, hash } = useLocation();

    useEffect(() => {
        if (!hash) {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            return undefined;
        }

        const id = decodeURIComponent(hash.slice(1));
        let frames = 0;
        let raf = 0;

        const attempt = () => {
            const target = document.getElementById(id);
            if (target) {
                target.scrollIntoView({
                    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                    block: 'start',
                });
                return;
            }
            if (frames++ < MAX_RETRY_FRAMES) {
                raf = requestAnimationFrame(attempt);
            }
        };

        raf = requestAnimationFrame(attempt);
        return () => cancelAnimationFrame(raf);
    }, [pathname, hash]);

    return null;
}
