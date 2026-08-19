import { Link } from 'react-router-dom';
import Plate from './primitives/Plate';
import Ink from './primitives/Ink';
import Button from './primitives/Button';
import Reveal from './primitives/Reveal';
import Stamp from './primitives/Stamp';
import { Icons } from './Icons';
import { ROUTES } from '../lib/routes';
import { initials } from '../lib/format';
import styles from './CommunityHub.module.css';

/**
 * PLATE 03 — Community Hub. The letters page.
 *
 * Copy is carried over. Two controls are not, and both were dead:
 *
 *   1. The newsletter card had an email <input>, a "Join Newsletter" button and
 *      two pre-checked checkboxes. None of the four were bound to anything —
 *      no state, no handler, no endpoint. Typing an address and pressing the
 *      button did nothing at all, which is worse than not offering it. There
 *      is no mailing list in this backend to subscribe anyone to.
 *
 *      So the promise stays and the mechanism changes: "Be Part of the Inner
 *      Circle" now leads to registration, which is the one thing that actually
 *      does create an account and gate member pricing. Its description loses
 *      the words "straight to your inbox", because nothing gets sent to an
 *      inbox. THIS IS A COPY CHANGE — flagged deliberately rather than made
 *      quietly.
 *
 *   2. Elena Jackson's avatar was an Unsplash photograph of a real, unrelated
 *      person, presented as a named customer. It's initials now — same helper
 *      the header uses.
 *
 * Also: the testimonial is a <figure>/<blockquote>, not a <div> with a styled
 * <p>, so it's actually marked up as a quotation.
 */

const CHALLENGE_FACTS = [
  { Icon: Icons.Clock, label: 'Deadline', value: 'July 15' },
  { Icon: Icons.Star, label: 'Rewards', value: 'Exclusive discount code' },
];

export default function CommunityHub() {
  return (
    <Plate id="community" index={3} ink="pink" tone="paper">
      {/* ---- HEAD -------------------------------------------------------- */}
      <header className={styles.head}>
        <h2 className={styles.title}>Community Hub</h2>
        <p className={styles.subtitle}>Join the tribe. Express your vibe</p>
        <p className={styles.blurb}>
          Where fashion meets connection. Exclusive drops, style battles, and
          real connections — all in one place.
        </p>
      </header>

      <div className={styles.grid}>
        {/* ---- THE CHALLENGE ------------------------------------------- */}
        <Reveal variant="up" className={styles.feature}>
          <article className={styles.challenge}>
            <Ink
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&h=600&fit=crop"
              alt="Two people photographed mid-street in remixed streetwear fits"
              ratio="3 / 2"
              plate="pink"
              className={styles.challengeInk}
              sizes="(min-width: 900px) 56vw, 92vw"
            />

            <div className={styles.challengeBody}>
              <Stamp tone="pink" solid className={styles.challengeTag}>
                Live challenge
              </Stamp>

              <h3 className={styles.challengeTitle}>Style Remix Challenge</h3>
              <p className={styles.challengeText}>
                Show off your unique vibe by mixing and matching your favorite
                pieces from our latest collection.
              </p>

              <dl className={styles.facts}>
                {CHALLENGE_FACTS.map(({ Icon, label, value }) => (
                  <div className={styles.fact} key={label}>
                    <dt className={styles.factLabel}>
                      <Icon size={14} />
                      {label}
                    </dt>
                    <dd className={styles.factValue}>{value}</dd>
                  </div>
                ))}
              </dl>

              <Button to={ROUTES.shop} variant="ink" size="md">
                Join Challenge
              </Button>
            </div>
          </article>
        </Reveal>

        {/* ---- UPCOMING ------------------------------------------------ */}
        <Reveal variant="up" delay={90} className={styles.side}>
          <Link className={styles.upcoming} to={ROUTES.shop}>
            <Stamp tone="blue" className={styles.upcomingTag}>
              Upcoming Challenge
            </Stamp>
            <Ink
              src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=700&h=560&fit=crop"
              alt="A rail of jackets waiting to be styled"
              ratio="5 / 4"
              plate="orange"
              sizes="(min-width: 900px) 30vw, 92vw"
            />
            <span className={styles.upcomingCue} aria-hidden="true">
              Browse the collection →
            </span>
          </Link>
        </Reveal>

        {/* ---- TESTIMONIAL -------------------------------------------- */}
        <Reveal variant="up" delay={140} className={styles.side}>
          <figure className={styles.testimonial}>
            <blockquote className={styles.testimonialQuote}>
              &ldquo;Wearing VYBE makes me feel like I own the streets.&rdquo;
            </blockquote>
            <figcaption className={styles.testimonialBy}>
              <span className={styles.avatar} aria-hidden="true">
                {initials('Elena Jackson')}
              </span>
              <span className={styles.byLines}>
                <span className={styles.byName}>Elena Jackson</span>
                <span className={styles.byRole}>OG Member</span>
              </span>
            </figcaption>
            <p className={styles.hashtag}>#VybeTribe</p>
          </figure>
        </Reveal>
      </div>

      {/* ---- CLOSER -------------------------------------------------------
          The inner-circle card and the join-the-tribe CTA were two separate
          blocks pointing at the same place. One block, one action.        */}
      <Reveal variant="up" delay={60} className={styles.closer}>
        <div className={styles.closerCopy}>
          <h3 className={styles.closerTitle}>Be Part of the Inner Circle</h3>
          <p className={styles.closerText}>
            Get exclusive drops, member-only deals &amp; fresh VYBE content.
            Whether you&apos;re here to get inspired or to inspire others, the
            tribe is waiting.
          </p>
        </div>

        <div className={styles.closerAction}>
          <Button to={ROUTES.register} variant="riso" size="lg">
            Join The Vybe Tribe
          </Button>
          <p className={styles.closerNote}>
            Already in? <Link to={ROUTES.login}>Log in</Link>
          </p>
        </div>
      </Reveal>
    </Plate>
  );
}
