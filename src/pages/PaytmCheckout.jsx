import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import Button from '../components/primitives/Button';
import Plate from '../components/primitives/Plate';
import Stamp from '../components/primitives/Stamp';
import { Icons } from '../components/Icons';
import { ROUTES } from '../lib/routes';
import styles from './OrderSuccess.module.css';

function loadCheckoutScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-paytm-checkout="${src}"]`);
        if (existing) {
            if (window.Paytm?.CheckoutJS) resolve();
            else existing.addEventListener('load', resolve, { once: true });
            existing.addEventListener('error', reject, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.dataset.paytmCheckout = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Paytm checkout could not be loaded'));
        document.head.appendChild(script);
    });
}

export default function PaytmCheckout() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const checkout = state?.checkout;
    const started = useRef(false);
    const [error, setError] = useState('');

    const invoke = useCallback(async () => {
        if (!checkout?.checkoutScriptUrl || !checkout?.txnToken) {
            setError('This Paytm checkout session is incomplete. Start checkout again.');
            return;
        }

        setError('');
        try {
            await loadCheckoutScript(checkout.checkoutScriptUrl);
            const checkoutJs = window.Paytm?.CheckoutJS;
            if (!checkoutJs) throw new Error('Paytm checkout is unavailable in this browser');

            const config = {
                root: '',
                flow: 'DEFAULT',
                data: {
                    orderId: checkout.orderId,
                    token: checkout.txnToken,
                    tokenType: 'TXN_TOKEN',
                    amount: checkout.amount,
                },
                merchant: { redirect: true },
                handler: {
                    transactionStatus: () => {
                        navigate(`${ROUTES.paytmReturn}?order=${encodeURIComponent(checkout.internalOrderId)}`, {
                            replace: true,
                        });
                    },
                    notifyMerchant: (eventName) => {
                        if (eventName === 'SESSION_EXPIRED' || eventName === 'APP_CLOSED') {
                            setError('Paytm checkout was closed. You can try again from checkout.');
                        }
                    },
                },
            };

            const initialise = () => checkoutJs.init(config).then(() => checkoutJs.invoke());
            if (typeof checkoutJs.onLoad === 'function') checkoutJs.onLoad(initialise);
            else await initialise();
        } catch (err) {
            setError(err?.message || 'Paytm checkout could not be opened.');
        }
    }, [checkout, navigate]);

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        invoke();
    }, [invoke]);

    if (!checkout) return <Navigate to={ROUTES.checkout} replace />;

    return (
        <Plate tone="paper" label="Paytm checkout">
            <div className={styles.wrap}>
                <header className={styles.head}>
                    <Stamp tone={error ? 'danger' : 'ink'} solid angle={-3} className={styles.stamp}>
                        <Icons.Wallet size={13} /> Paytm secure checkout
                    </Stamp>
                    <h1 className={styles.title}>{error ? 'Checkout needs another try' : 'Opening Paytm'}</h1>
                    <p className={styles.lede} aria-live="polite">
                        {error || 'Paytm will open its secure payment page. Your card or UPI details stay with Paytm.'}
                    </p>
                </header>
                <div className={styles.actions}>
                    {error ? (
                        <Button type="button" variant="riso" size="lg" onClick={invoke}>
                            <Icons.RefreshCw size={16} /> Try Paytm again
                        </Button>
                    ) : null}
                    <Button to={ROUTES.checkout} variant="outline" size="lg">Back to checkout</Button>
                </div>
            </div>
        </Plate>
    );
}
