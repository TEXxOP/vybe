/* ---------------------------------------------------------------------------
   Remove a product from the LIVE database.

   Editing backend/seed.js only changes what a *fresh* seed would insert — a
   database that has already been seeded keeps every document it was given.
   That is why the shoes listing survived being deleted from the seed file, and
   why this script exists: it operates on the data, not the fixture.

   It also clears the product out of every saved cart. A cart line whose
   `product` ref points at a deleted document populates as null, which the cart
   page renders as a nameless "Item" at ₹0 — a ghost row nobody can remove.

   Orders are deliberately left alone. An order is a record of something that
   happened, and rewriting history to tidy a catalogue is how you end up unable
   to answer a customer's question about what they bought.

   Usage, from the backend directory:
       node scripts/remove-product.js "neon pulse"          # dry run, default
       node scripts/remove-product.js "neon pulse" --apply  # actually delete
   --------------------------------------------------------------------------- */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../src/models/Product.model');
const Cart = require('../src/models/Cart.model');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const pattern = args.filter((a) => !a.startsWith('--'))[0];

if (!pattern) {
    console.error('Give me a name to match, e.g. node scripts/remove-product.js "neon pulse"');
    process.exit(1);
}

/* Escaped, so a name containing regex punctuation matches literally rather
   than silently becoming a different query. */
const rx = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

(async () => {
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI is not set. Run this from the backend directory so .env loads.');
        process.exit(1);
    }

    /* Fail fast rather than hang for 30s on an unreachable host. */
    await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
    });
    console.log('Connected.');

    const matches = await Product.find({ name: rx }).select('_id name category price');

    if (matches.length === 0) {
        console.log(`Nothing matches /${pattern}/i. Already gone, or the name differs.`);
        await mongoose.disconnect();
        return;
    }

    console.log(`\n${matches.length} product(s) match /${pattern}/i:`);
    for (const p of matches) {
        console.log(`  • ${p.name}  [${p.category}]  ₹${p.price}  ${p._id}`);
    }

    const ids = matches.map((p) => p._id);
    const cartsAffected = await Cart.countDocuments({ 'items.product': { $in: ids } });
    console.log(`\n${cartsAffected} saved cart(s) hold one of these.`);

    if (!apply) {
        console.log('\nDRY RUN — nothing deleted. Re-run with --apply to remove.');
        await mongoose.disconnect();
        return;
    }

    const pulled = await Cart.updateMany(
        { 'items.product': { $in: ids } },
        { $pull: { items: { product: { $in: ids } } } }
    );
    const deleted = await Product.deleteMany({ _id: { $in: ids } });

    console.log(`\nDeleted ${deleted.deletedCount} product(s).`);
    console.log(`Cleaned ${pulled.modifiedCount} cart(s).`);

    /* Carts cache their own totals, so a pull leaves the money stale. The
       model recomputes on save; re-saving each touched cart is the cheapest
       way to make it do that. */
    const stale = await Cart.find({ user: { $exists: true } });
    let resaved = 0;
    for (const cart of stale) {
        const before = cart.totalPrice;
        await cart.save();
        if (cart.totalPrice !== before) resaved += 1;
    }
    console.log(`Recomputed totals on ${resaved} cart(s).`);

    await mongoose.disconnect();
    console.log('\nDone.');
})().catch(async (err) => {
    /* Message only. A connection error can carry the credentialed URI in its
       `reason`, and this output is not a place for that. */
    console.error('\nFailed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
