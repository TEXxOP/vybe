import { Link } from 'react-router-dom';

import Doc from '../../components/Doc';
import { ROUTES } from '../../lib/routes';
import { COMPANY, emailHref } from '../../lib/company';

/**
 * Size guide.
 *
 * Real measurements, because "runs true to size" is not a measurement and the
 * return it causes costs everybody a week.
 *
 * The size columns are XS–XXL, which is exactly the enum in
 * backend/src/models/Product.model.js — so every size a product can actually be
 * sold in appears here, and no size appears here that can't be ordered. Worth
 * noting the schema applies that same letter enum to the `shoes` category, so
 * shoe listings show S/M/L rather than UK numbers; the footwear table below maps
 * the letters onto UK sizes rather than pretending the problem isn't there.
 *
 * Every cell carries both units. Splitting them into an inches table and a
 * centimetres table means maintaining the same numbers twice, which is how one
 * of them ends up wrong.
 */

/* Flat, garment-laid-down measurements in inches / centimetres. */
const TOPS = [
    { size: 'XS', chest: '19 / 48', length: '26 / 66', shoulder: '17 / 43', sleeve: '7.5 / 19' },
    { size: 'S', chest: '20 / 51', length: '27 / 69', shoulder: '18 / 46', sleeve: '8 / 20' },
    { size: 'M', chest: '21.5 / 55', length: '28 / 71', shoulder: '19 / 48', sleeve: '8.5 / 22' },
    { size: 'L', chest: '23 / 58', length: '29 / 74', shoulder: '20 / 51', sleeve: '9 / 23' },
    { size: 'XL', chest: '24.5 / 62', length: '30 / 76', shoulder: '21 / 53', sleeve: '9.5 / 24' },
    { size: 'XXL', chest: '26 / 66', length: '31 / 79', shoulder: '22 / 56', sleeve: '10 / 25' },
];

const PANTS = [
    { size: 'XS', waist: '28 / 71', hip: '38 / 97', inseam: '29 / 74' },
    { size: 'S', waist: '30 / 76', hip: '40 / 102', inseam: '30 / 76' },
    { size: 'M', waist: '32 / 81', hip: '42 / 107', inseam: '30.5 / 77' },
    { size: 'L', waist: '34 / 86', hip: '44 / 112', inseam: '31 / 79' },
    { size: 'XL', waist: '36 / 91', hip: '46 / 117', inseam: '31.5 / 80' },
    { size: 'XXL', waist: '38 / 97', hip: '48 / 122', inseam: '32 / 81' },
];

const SHOES = [
    { size: 'XS', uk: '6', eu: '40', foot: '25.0' },
    { size: 'S', uk: '7', eu: '41', foot: '25.7' },
    { size: 'M', uk: '8', eu: '42', foot: '26.5' },
    { size: 'L', uk: '9', eu: '43', foot: '27.3' },
    { size: 'XL', uk: '10', eu: '44', foot: '28.0' },
    { size: 'XXL', uk: '11', eu: '45', foot: '28.8' },
];

export default function SizeGuide() {
    return (
        <Doc
            eyebrow="Fit"
            title="Size guide"
            lede="Flat measurements for everything we print, in inches and centimetres. Measure a garment you already like and compare — it beats measuring yourself."
            updated="2026-08-25"
        >
            <h2>Tops</h2>

            <p>
                Shirts, hoodies and jackets. Measurements are taken with the garment
                flat, not around your body, so they’ll read about half of what a tape
                around your chest would.
            </p>

            <figure>
                <table>
                    <caption>Tops — flat, inches / centimetres</caption>
                    <thead>
                        <tr>
                            <th scope="col">Size</th>
                            <th scope="col">Chest</th>
                            <th scope="col">Length</th>
                            <th scope="col">Shoulder</th>
                            <th scope="col">Sleeve</th>
                        </tr>
                    </thead>
                    <tbody>
                        {TOPS.map((row) => (
                            <tr key={row.size}>
                                <th scope="row">{row.size}</th>
                                <td>{row.chest}</td>
                                <td>{row.length}</td>
                                <td>{row.shoulder}</td>
                                <td>{row.sleeve}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </figure>

            <h2>Pants</h2>

            <figure>
                <table>
                    <caption>Pants — flat, inches / centimetres</caption>
                    <thead>
                        <tr>
                            <th scope="col">Size</th>
                            <th scope="col">Waist</th>
                            <th scope="col">Hip</th>
                            <th scope="col">Inseam</th>
                        </tr>
                    </thead>
                    <tbody>
                        {PANTS.map((row) => (
                            <tr key={row.size}>
                                <th scope="row">{row.size}</th>
                                <td>{row.waist}</td>
                                <td>{row.hip}</td>
                                <td>{row.inseam}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </figure>

            <p>
                Waist is measured flat across the top edge and doubled — so a 32 here
                is a 32 on a tape around your waist.
            </p>

            <h2>Footwear</h2>

            <aside>
                <p>
                    Shoes are listed with letter sizes on this site. Use this table to
                    work out which letter is your UK size, and go by the foot-length
                    column if you’re between two.
                </p>
            </aside>

            <figure>
                <table>
                    <caption>Footwear — letter size to UK, EU and foot length</caption>
                    <thead>
                        <tr>
                            <th scope="col">Listed as</th>
                            <th scope="col">UK</th>
                            <th scope="col">EU</th>
                            <th scope="col">Foot length (cm)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {SHOES.map((row) => (
                            <tr key={row.size}>
                                <th scope="row">{row.size}</th>
                                <td>{row.uk}</td>
                                <td>{row.eu}</td>
                                <td>{row.foot}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </figure>

            <p>
                Measure foot length by standing on a sheet of paper with your heel
                against a wall and marking the end of your longest toe. Do it in the
                evening, when your feet are at their largest, and use the bigger of
                the two.
            </p>

            <h2>Caps and accessories</h2>

            <p>
                Caps are one size with an adjustable strap, fitting head
                circumferences of roughly 56–60cm. Accessories are one size unless
                the product page says otherwise.
            </p>

            <h2>How we measure</h2>

            <dl>
                <dt>Chest</dt>
                <dd>Across the garment from armpit seam to armpit seam, laid flat.</dd>

                <dt>Length</dt>
                <dd>
                    From the highest point of the shoulder straight down to the hem,
                    not following the curve.
                </dd>

                <dt>Shoulder</dt>
                <dd>Seam to seam across the back.</dd>

                <dt>Sleeve</dt>
                <dd>
                    From the shoulder seam to the end of the cuff. Short sleeves on
                    tees, so these numbers are small by design.
                </dd>

                <dt>Inseam</dt>
                <dd>From the crotch seam down the inner leg to the hem.</dd>
            </dl>

            <h2>On the fit</h2>

            <p>
                Tops are cut boxy — wider through the chest and shorter in the body
                than a standard fit, so they hang rather than follow. Take your usual
                size if you want it to sit closer to the body, or one up if you want
                the oversized drape the designs were drawn for. Between two sizes on
                the chest, size up; the length is the measurement people regret, so
                check it against something you own before you decide.
            </p>

            <p>
                Every measurement here is subject to about half an inch either way,
                which is normal for cut-and-sew garments and not a fault. If
                something arrives outside that tolerance, it’s a{' '}
                <Link to={ROUTES.returns}>return on us</Link>.
            </p>

            <small>
                Still unsure? Mail{' '}
                <a href={emailHref}>{COMPANY.email}</a> with your usual
                size in a brand you wear and we’ll tell you what we’d send.
            </small>
        </Doc>
    );
}
