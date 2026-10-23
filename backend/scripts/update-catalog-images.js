const path = require('node:path');
const mongoose = require('mongoose');
const Product = require('../src/models/Product.model');
const catalogImageMap = require('../catalog-image-map.json');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const STOREFRONT_ORIGIN = 'https://www.restoralai.com';
const applyChanges = process.argv.includes('--apply');

async function main() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI must be set in the environment.');
    }

    await mongoose.connect(process.env.MONGODB_URI);

    let planned = 0;
    let updated = 0;
    let alreadyCurrent = 0;
    let preserved = 0;

    for (const [name, image] of Object.entries(catalogImageMap)) {
        const targetUrl = `${STOREFRONT_ORIGIN}/product-images/${image.file}`;
        const product = await Product.findOne({ name })
            .select('name images')
            .lean();

        if (!product) {
            console.log(`SKIP missing product: ${name}`);
            preserved += 1;
            continue;
        }

        const currentUrl = product.images?.[0]?.url;
        const currentAlt = product.images?.[0]?.alt;

        if (currentUrl === targetUrl && currentAlt === image.alt) {
            console.log(`OK already current: ${name}`);
            alreadyCurrent += 1;
            continue;
        }

        // Never replace an admin-uploaded image or an unexpected URL.
        if (typeof currentUrl !== 'string' || !currentUrl.includes(image.legacyPhotoId)) {
            console.log(`SKIP changed image; preserving current value: ${name}`);
            preserved += 1;
            continue;
        }

        if (!applyChanges) {
            console.log(`DRY RUN would update: ${name}`);
            planned += 1;
            continue;
        }

        const result = await Product.updateOne(
            { _id: product._id, 'images.0.url': currentUrl },
            {
                $set: {
                    'images.0.url': targetUrl,
                    'images.0.alt': image.alt,
                },
            }
        );

        if (result.modifiedCount === 1) {
            console.log(`UPDATED: ${name}`);
            updated += 1;
        } else {
            console.log(`SKIP changed during update; preserved: ${name}`);
            preserved += 1;
        }
    }

    console.log(
        `${applyChanges ? 'Applied' : 'Dry run'}: ${updated || planned} to update, ${alreadyCurrent} already current, ${preserved} preserved.`
    );
}

main()
    .catch((error) => {
        console.error(`Catalog image update failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });
