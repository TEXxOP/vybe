import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import Button from '../components/primitives/Button';
import Field from '../components/primitives/Field';
import { Icons } from '../components/Icons';

import { useCart } from '../context/CartContext';
import { ROUTES } from '../lib/routes';
import styles from './Auth.module.css';

/**
 * Sign in.
 *
 *  1. IT ALWAYS WENT TO THE HOMEPAGE. `navigate('/')` on success, regardless of
 *     why you were signing in. Get gated at checkout with a full bag, sign in,
 *     and you were dropped on the homepage having lost your place entirely.
 *     Checkout now passes `state.from` and this honours it.
 *
 *  2. IT OFFERED "GUEST CHECKOUT" — a button that linked to /shop, and which
 *     described a feature that does not exist: every order route on the server
 *     sits behind `protect`. It promised something impossible and then didn't
 *     even do the impossible thing, it just went to the catalogue.
 *
 *  3. A SIGNED-IN USER STILL SAW THE LOGIN FORM. Nothing checked.
 *
 *  4. NO LABEL WAS ASSOCIATED WITH EITHER INPUT, and there were no autoComplete
 *     attributes, so password managers had nothing to latch onto — on the one
 *     form where they matter most.
 *
 *  5. THE ERROR BANNER HAD NO role="alert", so a screen reader user submitted
 *     the form, was told nothing, and had no idea why they were still here.
 *
 *  6. THE EMAIL WASN'T TRIMMED. A leading space pasted from a password manager
 *     produced "Invalid email or password" for entirely correct credentials.
 *
 *  7. "© 2025" WAS HARDCODED — already wrong.
 */
export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, user, authReady } = useCart();

    const [form, setForm] = useState({ email: '', password: '' });
    const [reveal, setReveal] = useState(false);
    const [errors, setErrors] = useState({});
    const [failure, setFailure] = useState('');
    const [busy, setBusy] = useState(false);

    /* Where to go afterwards. Checkout sends you here with this set; anywhere
       else falls back to the homepage. */
    const from = location.state?.from || ROUTES.home;

    const change = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
        setFailure('');
    };

    const submit = async (e) => {
        e.preventDefault();

        const found = {};
        if (!form.email.trim()) found.email = 'Enter the email you signed up with.';
        if (!form.password) found.password = 'Enter your password.';
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setBusy(true);
        setFailure('');
        try {
            /* Trimmed. A space pasted in front of an address is not a wrong
               password, but that is what the old code told you it was. */
            await login({ email: form.email.trim(), password: form.password });
            navigate(from, { replace: true });
        } catch (err) {
            setFailure(err?.message || 'That email and password combination didn’t work.');
            setBusy(false);
        }
    };

    /* Wait for the auth check rather than flashing a login form at someone who
       is already signed in. */
    if (!authReady) {
        return (
            <div className={styles.page}>
                <p className={styles.booting} aria-live="polite">
                    One moment…
                </p>
            </div>
        );
    }

    if (user) {
        return <Navigate to={from} replace />;
    }

    return (
        <div className={styles.page}>
            {/* ---- INK PANEL ---- */}
            <aside className={styles.panel}>
                <Link className={styles.wordmark} to={ROUTES.home}>
                    VYBE
                </Link>

                <p className={styles.statement}>
                    Small runs.
                    <span className={styles.statementLine}>No restocks.</span>
                    <span className={styles.statementLine}>Yours.</span>
                </p>

                <p className={styles.panelFoot}>
                    © {new Date().getFullYear()} VYBE — printed in small batches
                </p>
            </aside>

            {/* ---- FORM ----
                A <div>, not a <main>: App.jsx's shell already wraps every route
                in <main id="main">, and a document may only have one main
                landmark. Nesting a second one makes the skip link ambiguous and
                gives a screen reader two "main" regions to choose between. */}
            <div className={styles.formSide}>
                <div className={styles.form}>
                    <header className={styles.head}>
                        <p className={styles.eyebrow}>Members</p>
                        <h1 className={styles.title}>Welcome back</h1>
                        <p className={styles.sub}>
                            {location.state?.from === ROUTES.checkout
                                ? 'Sign in and we’ll take you straight back to your order.'
                                : 'Sign in to see your orders and pick up where you left off.'}
                        </p>
                    </header>

                    <form onSubmit={submit} noValidate>
                        {failure ? (
                            <p className={styles.failure} role="alert">
                                {failure}
                            </p>
                        ) : null}

                        <div className={styles.fields}>
                            <Field
                                label="Email"
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={change}
                                error={errors.email}
                                required
                                autoComplete="email"
                                placeholder="you@example.com"
                            />

                            <Field
                                label="Password"
                                name="password"
                                type={reveal ? 'text' : 'password'}
                                value={form.password}
                                onChange={change}
                                error={errors.password}
                                required
                                autoComplete="current-password"
                            />

                            {/* A labelled checkbox rather than an icon floated
                                over the input — it can't collide with the error
                                message, and it reads as part of the form. */}
                            <label className={styles.reveal}>
                                <input
                                    type="checkbox"
                                    checked={reveal}
                                    onChange={(e) => setReveal(e.target.checked)}
                                />
                                Show password
                            </label>
                        </div>

                        <Button type="submit" variant="riso" size="lg" full loading={busy}>
                            Sign in
                        </Button>
                    </form>

                    <p className={styles.alt}>
                        No account yet?{' '}
                        <Link
                            className={styles.altLink}
                            to={ROUTES.register}
                            state={location.state}
                        >
                            Create one
                        </Link>
                    </p>

                    {/* Not "Guest Checkout" — that never existed. This is what
                        the old button actually did. */}
                    <Link className={styles.browse} to={ROUTES.shop}>
                        <Icons.ArrowLeft size={13} /> Keep browsing instead
                    </Link>
                </div>
            </div>
        </div>
    );
}
