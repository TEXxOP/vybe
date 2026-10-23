import catalogImageMap from '../../backend/catalog-image-map.json';

/**
 * Replace only the known mismatched seed photos. An image that an admin has
 * since changed is left untouched, so this map does not override real uploads.
 */
export function getProductImages(product) {
    const images = Array.isArray(product?.images) ? product.images : [];
    const replacement = catalogImageMap[product?.name];
    const currentImage = images[0];

    if (
        !replacement ||
        typeof currentImage?.url !== 'string' ||
        !currentImage.url.includes(replacement.legacyPhotoId)
    ) {
        return images;
    }

    return [
        {
            ...currentImage,
            url: `/product-images/${replacement.file}`,
            alt: replacement.alt,
        },
        ...images.slice(1),
    ];
}

export function getProductImage(product, index = 0) {
    return getProductImages(product)[index];
}

export function getCanonicalProductImages(product) {
    return getProductImages(product).map((image) => ({
        ...image,
        url: image.url?.startsWith('/product-images/')
            ? `https://www.restoralai.com${image.url}`
            : image.url,
    }));
}
