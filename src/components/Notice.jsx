import Plate from './primitives/Plate';
import styles from './Notice.module.css';

/**
 * NOTICE — a centred sheet for the cases where there is nothing to show.
 *
 * Four of them, on two pages: signed out, still loading, request failed, and
 * nothing here yet. They are the same object — a heading, an explanation, and
 * one or two ways out — so they're one component. Writing them inline meant
 * /orders carried three near-identical blocks and /track-order was about to
 * carry two more.
 *
 * `live` marks the body as a polite live region, for the loading case: a screen
 * reader user who triggers a fetch should hear that something is happening
 * without having to go looking for it.
 *
 * The heading is an <h1> because these states replace the whole page. A page
 * whose only heading is "Nothing here yet" is still a page with a heading.
 */
export default function Notice({ label, title, children, actions, note, live = false }) {
    return (
        <Plate tone="paper" label={label}>
            <div className={styles.notice}>
                <h1 className={styles.title}>{title}</h1>

                {children ? (
                    <div
                        className={styles.body}
                        aria-live={live ? 'polite' : undefined}
                    >
                        {children}
                    </div>
                ) : null}

                {actions ? <div className={styles.actions}>{actions}</div> : null}

                {note ? <p className={styles.note}>{note}</p> : null}
            </div>
        </Plate>
    );
}
