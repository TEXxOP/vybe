/**
 * WHO THIS BUSINESS ACTUALLY IS.
 *
 * Every phone number, email address and postal address on the site comes from
 * here. Nothing else may hardcode one.
 *
 * This file exists because the previous build spread `support@vybe.com` across
 * nine files and put a placeholder US phone number in the footer of an Indian
 * business. Contact details are the one category of copy where being out of date
 * is not a cosmetic problem: a customer who mails a dead address believes they
 * have contacted you, and hears nothing back. So they get the same treatment as
 * colour and the shipping threshold — one declaration, many readers.
 *
 * BRAND vs LEGAL ENTITY. These are deliberately two fields. The shop trades as
 * VYBE, which is what belongs in the masthead, the nav and any sentence a
 * customer reads. The company behind it is RESTORALQ TECHNOLOGIES PVT LTD, which
 * is what belongs on the copyright line and in the terms and privacy pages,
 * because that is the entity a customer would actually be contracting with. Do
 * not swap one for the other to make a line read more nicely.
 */

export const COMPANY = {
  /* Trading name — customer-facing copy, the masthead, the nav. */
  brand: 'VYBE',

  /* Registered entity — copyright line, terms, privacy, anything legal. */
  legalName: 'RESTORALQ TECHNOLOGIES PVT LTD',

  email: 'restoralai@gmail.com',

  /* Two forms of the same number, because they are not interchangeable.
     `phoneDisplay` is grouped for a human reading it; `phoneDial` is E.164 with
     no spaces, which is what a `tel:` href needs to be reliably dialled. Keeping
     both here stops someone "tidying" the spaces out of the visible one or
     leaving them in the link. */
  phoneDisplay: '+91 87965 63370',
  phoneDial: '+918796563370',

  /* WhatsApp wants the international number with no `+`, no spaces and no
     leading zero — 91 for India followed by the ten digits. This is the single
     most load-bearing string in the project now that enquiries replace ordering,
     so it is written once and read everywhere. See lib/enquiry.js. */
  whatsapp: '918796563370',

  address: {
    line1: 'Plot No 90, Cabin No. 2',
    line2: 'Mehrauli Road, Sector 14',
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122001',
    country: 'India',
  },
};

/** `mailto:` target. */
export const emailHref = `mailto:${COMPANY.email}`;

/** `tel:` target — always the unspaced form. */
export const telHref = `tel:${COMPANY.phoneDial}`;

/**
 * The address as lines, for a <p> with <br> or an <address> block.
 * Returned as an array rather than a joined string so the caller decides how it
 * breaks; a postal address rendered as one long line is hard to scan.
 */
export function addressLines() {
  const { line1, line2, city, state, pincode, country } = COMPANY.address;
  return [line1, line2, `${city} ${pincode}`, `${state}, ${country}`];
}

/** The address on one line, for a WhatsApp message or a meta tag. */
export function addressOneLine() {
  return addressLines().join(', ');
}
