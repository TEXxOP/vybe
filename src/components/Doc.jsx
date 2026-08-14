import Plate from './primitives/Plate';
import styles from './Doc.module.css';

/**
 * DOC — the shared shell for the site's written pages.
 *
 * Six of the eight missing routes are prose: FAQ, shipping, returns, size guide,
 * privacy and terms. Six pages, one shape — so the shape lives here once rather
 * than being pasted into six stylesheets that would immediately start to drift.
 *
 * Prose styling is done with element selectors scoped inside `.prose`. Element
 * selectors have a bad reputation, and deservedly so in a global stylesheet —
 * but `.prose` is hashed by CSS Modules, so `.prose h2` provably cannot reach an
 * h2 anywhere else in the app. The scope is what makes the technique safe, and
 * it's why the six prose pages contain no classNames at all.
 *
 * `updated` takes a plain ISO date string. A policy page with no date is a
 * policy page nobody can rely on.
 */
export default function Doc({ eyebrow, title, lede, updated, children }) {
    return (
        <Plate tone="paper" label={`Sheet · ${eyebrow || title}`}>
            <div className={styles.doc}>
                <header className={styles.head}>
                    {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}

                    <h1 className={styles.title}>{title}</h1>

                    {lede ? <p className={styles.lede}>{lede}</p> : null}

                    {updated ? (
                        <p className={styles.updated}>
                            Last revised{' '}
                            <time dateTime={updated}>
                                {new Date(updated).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </time>
                        </p>
                    ) : null}
                </header>

                <div className={styles.prose}>{children}</div>
            </div>
        </Plate>
    );
}
