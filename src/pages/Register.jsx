import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import Button from '../components/primitives/Button';
import Field from '../components/primitives/Field';
import { Icons } from '../components/Icons';

import { useCart } from '../context/CartContext';
import { ROUTES } from '../lib/routes';
import { COMPANY } from '../lib/company';
import styles from './Auth.module.css';

/**
 * Create an account.
 *
 * Shares Auth.module.css with Login — they are two states of one screen, and the
 * previous build already shared Auth.css between them.
 *
 *  1. SAME `navigate('/')` BUG as Login: registering from the checkout gate
 *     landed you on the homepage instead of back at your order.
 *
 *  2. NO LABELS ASSOCIATED WITH FOUR INPUTS, and no autoComplete — so a
 *     password manager couldn't offer to generate or save anything.
 *
 *  3. "Please fill in all fields" FOR ANY EMPTY FIELD. One message for four
 *     possible mistakes, printed at the top, nowhere near the field at fault.
 *     Errors now sit under the field they describe.
 *
 *  4. `confirmPassword` WASN'T CHECKED FOR EMPTINESS in the first guard, so
 *     leaving it blank produced "Passwords do not match" rather than telling you
 *     that you'd missed a field.
 *
 *  5. NO CLIENT-SIDE EMAIL FORMAT CHECK, so a typo made a round trip to be told
 *     "Please enter a valid email" by Mongoose.
 *
 *  6. THE 8-CHARACTER RULE WAS INVISIBLE UNTIL YOU BROKE IT. It's now a hint on
 *     the field, and it matches User.model.js's minlength of 8 — I checked,
 *     rather than assuming.
 *
 *  7. THE ERROR BANNER HAD NO role="alert".
 *
 *  8. "© 2025" HARDCODED.
 */

/* Deliberately permissive — it exists to catch typos, not to adjudicate the
   RFC. The server has the final say. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;

export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();
    const { register, user, authReady } = useCart();

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirm: '',
    });
    const [reveal, setReveal] = useState(false);
    const [errors, setErrors] = useState({});
    const [failure, setFailure] = useState('');
    const [busy, setBusy] = useState(false);

    const from = location.state?.from || ROUTES.home;

    const change = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
        setFailure('');
    };

    const submit = async (e) => {
        e.preventDefault();

        /* One message per field, under that field. */
        const found = {};
        if (!form.name.trim()) found.name = 'What should we put on the parcel?';

        if (!form.email.trim()) found.email = 'An email is required.';
        else if (!EMAIL.test(form.email.trim()))
            found.email = 'That doesn’t look like an email address.';

        if (!form.password) found.password = 'Choose a password.';
        else if (form.password.length < MIN_PASSWORD)
            found.password = `At least ${MIN_PASSWORD} characters, please.`;

        if (!form.confirm) found.confirm = 'Type the password once more.';
        else if (form.confirm !== form.password)
            found.confirm = 'These two don’t match.';

        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setBusy(true);
        setFailure('');
        try {
            await register({
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
            });
            navigate(from, { replace: true });
        } catch (err) {
            setFailure(
                err?.message || 'The account couldn’t be created. Please try again.'
            );
            setBusy(false);
        }
    };

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
            <aside className={styles.panel}>
                <Link className={styles.wordmark} to={ROUTES.home}>
                    VYBE
                </Link>

                <p className={styles.statement}>
                    Get on the
                    <span className={styles.statementLine}>run list.</span>
                </p>

                <p className={styles.panelFoot}>
                    © {new Date().getFullYear()} {COMPANY.legalName}
                </p>
            </aside>

            {/* A <div>, not a <main> — App.jsx's shell already provides the one
                main landmark this document is allowed. */}
            <div className={styles.formSide}>
                <div className={styles.form}>
                    <header className={styles.head}>
                        <p className={styles.eyebrow}>New here</p>
                        <h1 className={styles.title}>Create an account</h1>
                        <p className={styles.sub}>
                            So your orders have somewhere to live, and your bag survives
                            a closed tab.
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
                                label="Name"
                                name="name"
                                value={form.name}
                                onChange={change}
                                error={errors.name}
                                required
                                autoComplete="name"
                            />

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
                                autoComplete="new-password"
                                /* Stated up front, not sprung on submit. */
                                hint={`At least ${MIN_PASSWORD} characters.`}
                            />

                            <Field
                                label="Confirm password"
                                name="confirm"
                                type={reveal ? 'text' : 'password'}
                                value={form.confirm}
                                onChange={change}
                                error={errors.confirm}
                                required
                                autoComplete="new-password"
                            />

                            <label className={styles.reveal}>
                                <input
                                    type="checkbox"
                                    checked={reveal}
                                    onChange={(e) => setReveal(e.target.checked)}
                                />
                                Show passwords
                            </label>
                        </div>

                        <Button type="submit" variant="riso" size="lg" full loading={busy}>
                            Create account
                        </Button>
                    </form>

                    <p className={styles.alt}>
                        Already have one?{' '}
                        <Link
                            className={styles.altLink}
                            to={ROUTES.login}
                            state={location.state}
                        >
                            Sign in
                        </Link>
                    </p>

                    <Link className={styles.browse} to={ROUTES.shop}>
                        <Icons.ArrowLeft size={13} /> Keep browsing instead
                    </Link>
                </div>
            </div>
        </div>
    );
}
