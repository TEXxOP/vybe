import { Link } from 'react-router-dom';
import Button from '../components/primitives/Button';
import Stamp from '../components/primitives/Stamp';
import { ROUTES } from '../lib/routes';
import styles from './NotFound.module.css';

/**
 * 404 — "plate missing".
 *
 * The previous build had no catch-all route at all. Every path it linked to
 * but never mounted — /faq, /shipping, /returns, /size-guide, /track-order,
 * /privacy, /terms, /orders, plus any typo — rendered an empty <main> between
 * a working header and a working footer. The page looked broken rather than
 * missing, which is the worst of both.
 *
 * Framed in the press language: a sheet that came off the run without its
 * plate. And it offers the four places people actually want, rather than a
 * lone "go home" button.
 */

const WAYS_OUT = [
    { label: 'Shop the drop', to: ROUTES.shop },
    { label: 'Track an order', to: ROUTES.trackOrder },
    { label: 'Size guide', to: ROUTES.sizeGuide },
    { label: 'FAQs', to: ROUTES.faq },
];

export default function NotFound() {
    return (
        <section className={styles.page} aria-labelledby="nf-title">
            <div className={styles.sheet}>
                <Stamp tone="pink" solid angle={-2} className={styles.stamp}>
                    Plate missing
                </Stamp>

                <p className={styles.code} aria-hidden="true">
                    404
                </p>

                <h1 className={styles.title} id="nf-title">
                    This sheet
                    <span className={styles.shout}>
                        <span className={styles.shoutGhost} aria-hidden="true">
                            never ran
                        </span>
                        <span className={styles.shoutInk}>never ran</span>
                    </span>
                </h1>

                <p className={styles.lede}>
                    The page you asked for isn&apos;t part of this press run. It
                    may have been a limited drop that sold through, or the
                    address may have a typo in it.
                </p>

                <div className={styles.actions}>
                    <Button to={ROUTES.home} variant="ink" size="lg">
                        Back to the cover
                    </Button>
                    <Button to={ROUTES.shop} variant="outline" size="lg">
                        Shop everything
                    </Button>
                </div>

                <nav className={styles.ways} aria-label="Popular pages">
                    <p className={styles.waysHead}>Or try one of these</p>
                    <ul className={styles.waysList}>
                        {WAYS_OUT.map((way) => (
                            <li key={way.to}>
                                <Link className={styles.wayLink} to={way.to}>
                                    {way.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </section>
    );
}
