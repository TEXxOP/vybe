import { Link } from 'react-router-dom';
import { Icons } from './Icons';
import { ROUTES, ANCHORS } from '../lib/routes';
import styles from './Footer.module.css';

/* All copy below is carried over verbatim from the previous build. The change
   is that every link now resolves through the route manifest — seven of the
   Customer Support links used to point at routes that were never registered,
   and "Track Order" pointed at /orders, which is a different page. */

const NAVIGATION = [
    { label: 'Home', to: ROUTES.home },
    { label: 'Shop', to: ROUTES.shop },
    { label: 'Collections', to: ANCHORS.collections },
    { label: 'Community', to: ANCHORS.community },
    { label: 'Limited Editions', to: ANCHORS.drops },
    { label: 'About', to: ANCHORS.story },
    { label: 'Contact Us', to: ANCHORS.contact },
];

const SUPPORT = [
    { label: 'FAQs', to: ROUTES.faq },
    { label: 'Shipping & Delivery', to: ROUTES.shipping },
    { label: 'Returns & Exchanges', to: ROUTES.returns },
    { label: 'Size Guide', to: ROUTES.sizeGuide },
    { label: 'Track Order', to: ROUTES.trackOrder },
    { label: 'Privacy Policy', to: ROUTES.privacy },
    { label: 'Terms & Conditions', to: ROUTES.terms },
];

const SOCIAL = [
    { label: 'X/Twitter', href: 'https://x.com', Icon: Icons.BrandX },
    { label: 'Instagram', href: 'https://instagram.com', Icon: Icons.BrandInstagram },
    { label: 'YouTube', href: 'https://youtube.com', Icon: Icons.BrandYouTube },
    { label: 'TikTok', href: 'https://tiktok.com', Icon: Icons.BrandTikTok },
];

export default function Footer() {
    return (
        <footer className={styles.footer} id="contact">
            {/* MASTHEAD — the wordmark at poster scale, printed off-register.
                The page opens and closes on the same gesture. */}
            <div className={styles.masthead} aria-hidden="true">
                <span className={styles.mastheadGhost}>VYBE</span>
                <span className={styles.mastheadInk}>VYBE</span>
            </div>

            <div className={styles.inner}>
                <div className={styles.grid}>
                    <div className={styles.brand}>
                        <Link to={ROUTES.home} className={styles.brandMark}>
                            VYBE
                        </Link>
                        <p className={styles.tagline}>Streetwear made for your vibe.</p>

                        <ul className={styles.social}>
                            {SOCIAL.map(({ label, href, Icon }) => (
                                <li key={label}>
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.socialLink}
                                        aria-label={label}
                                    >
                                        <Icon size={17} />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <nav className={styles.column} aria-labelledby="footer-nav-heading">
                        <h2 className={styles.columnHead} id="footer-nav-heading">
                            Navigation
                        </h2>
                        <ul className={styles.list}>
                            {NAVIGATION.map((item) => (
                                <li key={item.label}>
                                    <Link to={item.to} className={styles.link}>
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <nav className={styles.column} aria-labelledby="footer-support-heading">
                        <h2 className={styles.columnHead} id="footer-support-heading">
                            Customer Support
                        </h2>
                        <ul className={styles.list}>
                            {SUPPORT.map((item) => (
                                <li key={item.label}>
                                    <Link to={item.to} className={styles.link}>
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div className={styles.column}>
                        <h2 className={styles.columnHead}>Contact us</h2>
                        <ul className={styles.list}>
                            <li>
                                <a href="mailto:support@vybe.com" className={styles.contact}>
                                    <Icons.Mail size={16} />
                                    <span>support@vybe.com</span>
                                </a>
                            </li>
                            <li>
                                <a href="tel:+13235550199" className={styles.contact}>
                                    <Icons.Phone size={16} />
                                    <span>+1 (323) 555-0199</span>
                                </a>
                            </li>
                            <li>
                                <p className={styles.contactStatic}>
                                    <Icons.Clock size={16} />
                                    <span>Mon-Fri, 9AM-6PM (PST)</span>
                                </p>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className={styles.bottom}>
                    <p className={styles.copyright}>© 2025 VYBE. All rights reserved.</p>
                    {/* A colophon, the way a printed object signs off. */}
                    <p className={styles.colophon}>
                        Set in Big Shoulders, Archivo &amp; Courier Prime
                    </p>
                </div>
            </div>
        </footer>
    );
}
