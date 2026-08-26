import { Link } from 'react-router-dom';
import Plate from './primitives/Plate';
import Ink from './primitives/Ink';
import Button from './primitives/Button';
import Reveal from './primitives/Reveal';
import { shopCategory, ROUTES } from '../lib/routes';
import styles from './Collections.module.css';

/**
 * PLATE 01 — Collections.
 *
 * Three collections, three inks. Each card is a single link with the image,
 * the name and the category all inside it, which is what it always looked
 * like but never was: the previous markup nested a vertical label and a copy
 * block inside an <a> alongside two competing images, and flanked the whole
 * thing with a pair of arrow <button>s that carouselled nothing — there were
 * only ever three cards, and they were all already on screen.
 *
 * Two real fixes carried in here:
 *
 *   - The section had no heading of any kind, so the header's "Collections"
 *     nav link scrolled to an unlabelled region. It has an <h2> now.
 *   - Links went to a hand-written `/shop?category=…`, which Shop.jsx never
 *     read. They resolve through shopCategory() and Shop now honours it.
 *
 * The second image per card is gone. It existed as an onError fallback for the
 * first, which Ink handles properly; two 250px-wide photographs crammed into a
 * third of a row was never legible anyway.
 */

const COLLECTIONS = [
  {
    name: 'EDGE',
    eyebrow: 'Outerwear',
    slug: 'jackets',
    plate: 'pink',
    image:
      'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=800&h=1000&fit=crop',
    alt: 'A model in an oversized technical jacket',
  },
  {
    name: 'CANVAS',
    eyebrow: 'Graphic tees',
    slug: 'shirts',
    plate: 'orange',
    image:
      'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&h=1000&fit=crop',
    alt: 'Colorful graphic t-shirts hanging on a rack',
  },
  {
    name: 'ENERGY',
    eyebrow: 'Hoodies',
    slug: 'hoodies',
    plate: 'blue',
    image:
      'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=800&h=1000&fit=crop',
    alt: 'A model wearing a heavyweight hooded sweatshirt',
  },
];

export default function Collections() {
  return (
    <Plate id="collections" index={1} ink="three inks" tone="ink">
      <header className={styles.head}>
        <h2 className={styles.title}>Collections</h2>
        <p className={styles.note}>
          Three runs, three inks. Pick a plate.
        </p>
      </header>

      <ul className={styles.grid}>
        {COLLECTIONS.map((collection, i) => (
          <Reveal
            as="li"
            key={collection.slug}
            variant="up"
            delay={i * 90}
            className={styles.cell}
          >
            <Link className={styles.card} to={shopCategory(collection.slug)}>
              <span className={styles.cardNum} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>

              <Ink
                src={collection.image}
                alt={collection.alt}
                ratio="4 / 5"
                plate={collection.plate}
                className={styles.cardInk}
                sizes="(min-width: 900px) 30vw, 88vw"
              />

              <span className={styles.cardCopy}>
                <span className={styles.cardEyebrow}>{collection.eyebrow}</span>
                <strong className={styles.cardName}>{collection.name}</strong>
                <span className={styles.cardCue} aria-hidden="true">
                  Shop {collection.name} →
                </span>
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>

      <div className={styles.foot}>
        <Button to={ROUTES.shop} variant="onInk" size="lg">
          View All Collections
        </Button>
      </div>
    </Plate>
  );
}
