export function flattenCatalogVariant(product, variant) {
  const priceMinor = Number(variant.priceMinor);
  const originalPriceMinor = Number(variant.originalPriceMinor ?? priceMinor);

  return {
    id: product.id,
    productId: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    tags: product.tags || [],
    description: product.description,
    image: product.images?.[variant.imageIndex] || product.images?.[0] || "",
    images: product.images || [],
    rating: Number(product.rating?.average || 0),
    reviewsCount: Number(product.rating?.count || 0),
    currency: product.currency || "USD",
    priceMinor,
    price: priceMinor / 100,
    originalPriceMinor,
    originalPrice: originalPriceMinor / 100,
    sku: variant.sku,
    color: variant.color,
    size: variant.size,
    stock: Number(variant.stock || 0),
    inStock: Number(variant.stock || 0) > 0,
    store: product.store || product.brand,
    deliveryDays: product.deliveryDays || "2-3 business days",
    shippingCostMinor: Number(product.shippingCostMinor || 0),
    shippingCost: Number(product.shippingCostMinor || 0) / 100,
    returnPolicy: product.returnPolicy || "30-Day Demo Return Policy",
    merchantOffers: (variant.merchantOffers || []).map((offer) => ({
      ...offer,
      price:
        Number.isInteger(offer.priceMinor) && offer.priceMinor >= 0
          ? offer.priceMinor / 100
          : Number(offer.price || 0),
    })),
    demoCatalog: product.demoCatalog === true,
  };
}

export function flattenCatalog(products) {
  return products.flatMap((product) =>
    (product.variants || []).map((variant) =>
      flattenCatalogVariant(product, variant),
    ),
  );
}

export function getVariantLabel(productName, color, size) {
  const details = [color, size != null ? `size ${size}` : null].filter(Boolean);
  return details.length ? `${productName} (${details.join(", ")})` : productName;
}
