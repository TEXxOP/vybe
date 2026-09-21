import { useCallback, useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import Plate from '../components/primitives/Plate';
import Stamp from '../components/primitives/Stamp';
import Button from '../components/primitives/Button';
import { Icons } from '../components/Icons';
import { useCart } from '../context/CartContext';
import { useResource } from '../lib/useResource';
import { paymentsAPI } from '../services/api';
import { ROUTES } from '../lib/routes';
import styles from './OrderSuccess.module.css';

const PROVIDERS = {
    phonepe: { label: 'PhonePe', getStatus: paymentsAPI.getPhonePeStatus },
    pinelabs: { label: 'Pine Labs', getStatus: paymentsAPI.getPineLabsStatus },
};

/** A redirect is navigation only; the server verifies payment status directly. */
export default function HostedPaymentReturn({ provider }) {
    const config = PROVIDERS[provider];
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, authReady, fetchCart } = useCart();
    const orderId = searchParams.get('order');

    if (!config || !authReady) {
        return (
            <Plate tone="paper" label="Payment · loading">
                <p className={styles.lede} aria-live="polite">Restoring your account…</p>
            </Plate>
        );
    }
    if (!user) {
        return <Navigate to={ROUTES.login} replace state={{ from: window.location.pathname + window.location.search }} />;
    }
    if (!orderId) return <Navigate to={ROUTES.orders} replace />;

    return (
        <HostedPaymentStatus
            config={config}
            orderId={orderId}
            email={user.email}
            fetchCart={fetchCart}
            navigate={navigate}
        />
    );
}

function HostedPaymentStatus({ config, orderId, email, fetchCart, navigate }) {
    const fetchStatus = useCallback(() => config.getStatus(orderId), [config, orderId]);
    const { data, status, error, retry } = useResource(fetchStatus);
    const order = data?.order;
    const paymentStatus = order?.paymentStatus;
    const paid = paymentStatus === 'paid';
    const failed = paymentStatus === 'failed' || paymentStatus === 'expired';

    useEffect(() => {
        if (status !== 'ready' || !paid) return;
        fetchCart().finally(() => {
            navigate(ROUTES.orderSuccess, {
                replace: true,
                state: {
                    orderNumber: order.orderNumber,
                    total: order.totalPrice,
                    paymentMethod: order.paymentMethod,
                    email,
                },
            });
        });
    }, [email, fetchCart, navigate, order, paid, status]);

    const checking = status === 'loading';
    const pending = status === 'ready' && !failed && !paid;

    return (
        <Plate tone="paper" label={`${config.label} payment`}>
            <div className={styles.wrap}>
                <header className={styles.head}>
                    <Stamp tone={failed ? 'danger' : 'ink'} solid angle={-3} className={styles.stamp}>
                        {failed ? <Icons.X size={13} /> : <Icons.Wallet size={13} />}
                        {failed ? 'Payment not completed' : `Checking ${config.label}`}
                    </Stamp>
                    <h1 className={styles.title}>{failed ? 'Payment needs another try' : 'Confirming your payment'}</h1>
                    <p className={styles.lede} aria-live="polite">
                        {checking
                            ? `We are securely checking the payment result with ${config.label}.`
                            : failed
                              ? `${config.label} did not confirm this payment. Your order has not been placed.`
                              : error || `${config.label} has not confirmed this payment yet. Check again; do not pay a second time.`}
                    </p>
                </header>

                <div className={styles.docket}>
                    <div className={styles.refBlock}>
                        <p className={styles.refLabel}>Payment reference</p>
                        <p className={styles.ref}>{orderId}</p>
                    </div>
                    <p className={styles.stepText}>
                        A redirect is never proof of payment. Your receipt appears only after {config.label} status is verified.
                    </p>
                </div>

                <div className={styles.actions}>
                    {pending || status === 'error' ? (
                        <Button type="button" variant="riso" size="lg" onClick={retry}>
                            <Icons.RefreshCw size={16} /> Check payment again
                        </Button>
                    ) : null}
                    {failed ? <Button to={ROUTES.checkout} variant="riso" size="lg">Try checkout again</Button> : null}
                    <Button to={ROUTES.orders} variant="outline" size="lg">View my orders</Button>
                </div>
                {checking ? <p className={styles.thanks}>Please keep this page open for a moment.</p> : null}
            </div>
        </Plate>
    );
}
