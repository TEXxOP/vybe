import { useCallback, useEffect, useRef } from 'react';

/**
 * USE DIALOG — the four things a modal owes you.
 *
 * A modal isn't a styled box. Opening one makes four promises, and a partial
 * implementation is worse than none because it looks finished:
 *
 *   1. ESCAPE CLOSES IT. There is no other universal way out.
 *   2. THE PAGE BEHIND DOESN'T SCROLL. Otherwise a trackpad flick over the
 *      backdrop scrolls the document underneath and the dialog appears to drift.
 *   3. FOCUS MOVES IN. Without this, a keyboard user's caret is still on the
 *      button behind the scrim, tabbing through a form they can't see.
 *   4. FOCUS COMES BACK. On close, to whatever opened it — not to the top of the
 *      document, which is where an unmanaged focus reset lands you.
 *
 * Plus the one the old build had no version of at all: TAB STAYS INSIDE. A
 * 20-field form you can silently tab out of, into the admin nav behind the
 * scrim, is a trap in the other direction.
 *
 * WHY THIS IS A HOOK AND NOT A FOURTH COPY: Header's mobile drawer implements
 * 1–4 inline, and did it correctly, so this was written to match its behaviour
 * rather than to replace it. Header's Escape handler is shared across three
 * layers (menu / drawer / search) and unpicking it to route one of them through
 * here would leave that drawer's key handling split across two files — strictly
 * worse than the duplication. So it stays as it is, deliberately, and this is
 * noted rather than quietly ignored.
 *
 * ON THE `onClose` DEPENDENCY: it's a real dependency of the keydown effect, not
 * something hidden behind a ref. Callers pass a `requestClose` whose identity
 * changes when the form becomes dirty — and it *should*, because that's a
 * different close behaviour. Re-subscribing a keydown listener costs nothing;
 * a stale one that discards a filled-in form costs the user their work. (The
 * fetch hook next door refuses a ref for the opposite reason: there, a changing
 * identity means a changing request, and hiding it would silently serve stale
 * data.)
 */
export function useDialog(onClose) {
    const ref = useRef(null);

    /* Focus and scroll are set up once, on open, and undone on close. They have
       nothing to do with `onClose`, so they don't re-run when it changes. */
    useEffect(() => {
        const node = ref.current;
        const restoreTo = document.activeElement;
        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = 'hidden';

        /* The first control, or the dialog itself. The dialog carries
           tabIndex={-1} so it can hold focus when it has no controls yet. */
        const first = node?.querySelector(FOCUSABLE);
        (first || node)?.focus();

        return () => {
            document.body.style.overflow = previousOverflow;
            /* Only if the element is still in the document — the trigger row may
               have been removed by the very save that closed this dialog. */
            if (restoreTo instanceof HTMLElement && restoreTo.isConnected) {
                restoreTo.focus();
            }
        };
    }, []);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onClose();
                return;
            }

            if (event.key !== 'Tab') return;

            /* Queried at keypress, not at open: this form grows and shrinks as
               rows are added, so a list captured on mount would be wrong by the
               time anyone pressed Tab. */
            const items = focusableWithin(ref.current);
            if (items.length === 0) return;

            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement;

            if (event.shiftKey && (active === first || active === ref.current)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    /* Handed to the backdrop. A click that starts and ends on the scrim is a
       deliberate dismissal; a drag that began inside the dialog and released
       over the scrim is not, and shouldn't be treated as one. */
    const backdropProps = useBackdrop(onClose);

    return { ref, backdropProps };
}

const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableWithin(node) {
    if (!node) return [];
    /* offsetParent is null for anything display:none — a control inside a
       collapsed section is in the DOM but not reachable, and including it would
       send focus somewhere invisible. */
    return Array.from(node.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
    );
}

function useBackdrop(onClose) {
    const startedOnBackdrop = useRef(false);

    const onPointerDown = useCallback((event) => {
        startedOnBackdrop.current = event.target === event.currentTarget;
    }, []);

    const onClick = useCallback(
        (event) => {
            if (event.target !== event.currentTarget) return;
            if (!startedOnBackdrop.current) return;
            startedOnBackdrop.current = false;
            onClose();
        },
        [onClose]
    );

    return { onPointerDown, onClick };
}
