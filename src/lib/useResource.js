import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * One request, with the three states it can actually be in.
 *
 * WHAT THIS REPLACES. Every data-fetching page in the old build wrote this by
 * hand, and all of them wrote it the same wrong way:
 *
 *     const [loading, setLoading] = useState(true);
 *     try { setThing(await api.get()); }
 *     catch (e) { console.error(e); }        // <- the bug
 *     finally { setLoading(false); }
 *
 * A failed request logged to a console nobody has open and then rendered the
 * empty state. The admin dashboard showed "Total Revenue ₹0" when the backend
 * was down — not an error, a number. That is the worst possible failure mode for
 * a page whose entire job is to report figures, because it is indistinguishable
 * from a quiet day of trading.
 *
 * So `status` is a single field with three values rather than a `loading`
 * boolean beside an `error` string: a boolean pair can represent
 * "loading AND errored", which is meaningless, and the old code's real states
 * were "loading" and "not loading", with failure folded invisibly into the
 * second one.
 *
 * THE FETCHER MUST BE STABLE. It sits in the effect's dependency array, so an
 * inline arrow would give a new function identity every render and refetch
 * forever. Pass a module-level API method (`adminAPI.getAllOrders`) or wrap it
 * in useCallback with an empty dep list. This is deliberately not hidden behind
 * a ref: a silent refetch loop is much harder to notice than a lint warning.
 *
 * `select` maps the response envelope to the thing you actually want — most of
 * these endpoints answer `{ orders: [...] }` or `{ products: [...] }` and every
 * caller then has to re-check that the field is an array. It must be stable for
 * the same reason.
 */

const identity = (raw) => raw;

export function useResource(fetcher, select = identity) {
    /* One object, so a transition can't be observed half-applied — there is no
       render in which status is 'error' but error is still ''. */
    const [state, setState] = useState({
        status: 'loading',
        data: undefined,
        error: '',
    });

    /* A counter, not a boolean: "try again" has to work a third time. */
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        /* No setState here at the top. `status` already starts at 'loading',
           and retry() puts it back from an event handler — which is where
           setState belongs. Setting it here would schedule a second render
           before the first had committed, for a value that was already correct.
           react-hooks/set-state-in-effect flags exactly this. */
        fetcher({ signal: controller.signal })
            .then((raw) => {
                setState({ status: 'ready', data: select(raw), error: '' });
            })
            .catch((err) => {
                /* We asked it to stop. Nothing failed and nothing is waiting. */
                if (err?.name === 'AbortError') return;
                setState({
                    status: 'error',
                    data: undefined,
                    error: err?.message || 'Something went wrong. Please try again.',
                });
            });

        return () => controller.abort();
    }, [fetcher, select, attempt]);

    const retry = useCallback(() => {
        setState({ status: 'loading', data: undefined, error: '' });
        setAttempt((n) => n + 1);
    }, []);

    /* For the write-then-patch case: updating one row from a mutation's own
       response beats refetching the list to be told what we were just told. */
    const setData = useCallback((next) => {
        setState((prev) => ({
            ...prev,
            data: typeof next === 'function' ? next(prev.data) : next,
        }));
    }, []);

    return useMemo(
        () => ({
            data: state.data,
            status: state.status,
            error: state.error,
            setData,
            retry,
        }),
        [state, setData, retry]
    );
}

/** `{ orders: [...] }` → `[...]`, and never undefined. */
export const selectOrders = (raw) =>
    Array.isArray(raw?.orders) ? raw.orders : [];

/** `{ products: [...] }` → `[...]`, and never undefined. */
export const selectProducts = (raw) =>
    Array.isArray(raw?.products) ? raw.products : [];
