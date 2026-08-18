import Plate from './primitives/Plate';
import Ink from './primitives/Ink';
import Button from './primitives/Button';
import Reveal from './primitives/Reveal';
import Stamp from './primitives/Stamp';
import { ROUTES } from '../lib/routes';
import styles from './OurStory.module.css';

/**
 * PLATE 02 — Our Story.
 *
 * The centre spread: the timeline runs down the page as a printed schedule,
 * with the current year set as the standfirst rather than as a separate card.
 *
 * That's the structural fix. The previous version split the chronology across
 * two columns with two unrelated treatments — 2022, 2023 and 2024 as a small
 * icon list on the left, then 2025 as a bordered "featured" card in the middle
 * column, styled nothing like the other three. A reader had to work out that
 * the four were the same sequence. Here they're one ordered list, and 2025 is
 * simply the last item, which is where the emphasis belongs anyway.
 *
 * The section id changes from "about" to "story" so it matches ANCHORS.story,
 * which is what the header's About link and the footer both point at. Before,
 * the anchor and the id disagreed, so neither ever resolved.
 *
 * The decorative brush-stroke SVG is gone — it was two coral quadratic curves
 * at 25% and 35% opacity, from the old palette, and it meant nothing.
 */

const MILESTONES = [
  { year: '2022', title: 'The Spark' },
  { year: '2023', title: 'The First Drop' },
  { year: '2024', title: 'The Culture Collab' },
];

const STATS = [
  { value: '50+', label: 'Countries' },
  { value: '100K', label: 'Community' },
  { value: '500+', label: 'Designs' },
];

export default function OurStory() {
  return (
    <Plate id="story" index={2} ink="ink + pink" tone="paper">
      <div className={styles.spread}>
        {/* ---- COLUMN ONE: the account ----------------------------------- */}
        <div className={styles.column}>
          <h2 className={styles.title}>
            Our
            <span className={styles.titleShout}>
              <span className={styles.titleGhost} aria-hidden="true">
                Story
              </span>
              <span className={styles.titleInk}>Story</span>
            </span>
          </h2>

          <p className={styles.lede}>
            VYBE started as a passion project — a rebellion against mass trends
            and an embrace of raw, unapologetic style. We design for those who
            own their vibe and live it loud.
          </p>

          {/* One list, four entries, in order. */}
          <ol className={styles.timeline}>
            {MILESTONES.map((item, i) => (
              <Reveal
                as="li"
                key={item.year}
                variant="left"
                delay={i * 70}
                className={styles.entry}
              >
                <span className={styles.entryYear}>{item.year}</span>
                <span className={styles.entryRule} aria-hidden="true" />
                <span className={styles.entryTitle}>{item.title}</span>
              </Reveal>
            ))}

            <Reveal
              as="li"
              variant="left"
              delay={210}
              className={`${styles.entry} ${styles.entryNow}`}
            >
              <span className={styles.entryYear}>2025</span>
              <span className={styles.entryRule} aria-hidden="true" />
              <span className={styles.entryBody}>
                <span className={styles.entryTitle}>Going Global</span>
                <Stamp tone="pink" className={styles.entryStamp}>
                  You are here
                </Stamp>
                <span className={styles.entryText}>
                  Our official site went live. Now, we&apos;re taking VYBE
                  worldwide — one bold fit at a time. The movement has just
                  begun.
                </span>
                <Button
                  to={ROUTES.register}
                  variant="ink"
                  size="md"
                  className={styles.entryCta}
                >
                  Join The Movement
                </Button>
              </span>
            </Reveal>
          </ol>
        </div>

        {/* ---- COLUMN TWO: the plates ------------------------------------ */}
        <div className={styles.column}>
          <Ink
            src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=900&h=1170&fit=crop"
            alt="A model photographed on the street in a VYBE layered fit"
            ratio="3 / 4"
            plate="pink"
            taped
            className={styles.portrait}
            sizes="(min-width: 900px) 42vw, 88vw"
          />

          <dl className={styles.stats}>
            {STATS.map((stat) => (
              <div className={styles.stat} key={stat.label}>
                <dt className={styles.statLabel}>{stat.label}</dt>
                <dd className={styles.statValue}>{stat.value}</dd>
              </div>
            ))}
          </dl>

          <figure className={styles.quote}>
            <blockquote className={styles.quoteText}>
              &ldquo;Fashion is the armor to survive the reality of everyday
              life.&rdquo;
            </blockquote>
            <figcaption className={styles.quoteBy}>
              — Bill Cunningham
            </figcaption>
          </figure>

          {/* The illustration, kept from the previous build — it's the only
              piece of original artwork in the project, and its flat red-on-pink
              two-tone happens to sit right inside the riso palette.

              Re-encoded, not redrawn. It shipped as a 1,296 KB RGBA PNG whose
              alpha channel was fully opaque on every pixel — a quarter of the
              file describing transparency that wasn't there — in a format meant
              for flat graphics, holding 73,000 distinct colours. As WebP at the
              same 1056px it is 49 KB: 26x smaller, mean per-channel difference
              of 1/255, indistinguishable at the ~18vw it actually renders at.
              The filename is also no longer the image generator's default. */}
          <Ink
            src="/story-figure.webp"
            alt="An illustrated figure in a VYBE outfit"
            ratio="1 / 1"
            plate="none"
            className={styles.blob}
            sizes="(min-width: 900px) 18vw, 44vw"
          />
        </div>
      </div>
    </Plate>
  );
}
