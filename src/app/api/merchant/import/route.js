import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import fs from 'fs';
import path from 'path';
import { isAuthorizedMerchantRequest } from '@/lib/merchant-session';

const CATALOG_PATH = path.join(process.cwd(), 'src', 'data', 'catalog.json');

// High-resolution fallback photography mapping by category/keyword
const FALLBACK_PHOTOS = {
  shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
  sneaker: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=600&q=80',
  running: 'https://images.unsplash.com/photo-1661605813204-8c7662c1a5f8?auto=format&fit=crop&w=600&q=80',
  casual: 'https://images.unsplash.com/photo-1637437757614-6491c8e915b5?auto=format&fit=crop&w=600&q=80',
  sandal: 'https://images.unsplash.com/photo-1591620460030-0ab8f583dc5b?auto=format&fit=crop&w=600&q=80',
  audio: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
  headphones: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
  watch: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
  fitness: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
  keyboard: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80',
  tech: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80',
  apparel: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
  bag: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
  backpack: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80'
};

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '');
}

function getPhotoForProduct(item) {
  if (item.image) {
    try {
      const imageUrl = new URL(item.image);
      if (imageUrl.protocol === 'https:' && imageUrl.hostname === 'images.unsplash.com') {
        return imageUrl.toString();
      }
    } catch {
      // Use a category-based fallback for invalid image URLs.
    }
  }
  const text = `${item.name} ${item.category || ''}`.toLowerCase();
  for (const [key, url] of Object.entries(FALLBACK_PHOTOS)) {
    if (text.includes(key)) return url;
  }
  return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
}

export async function POST(req) {
  if (!isAuthorizedMerchantRequest(
    req,
    process.env.MERCHANT_IMPORT_TOKEN,
  )) {
    return NextResponse.json(
      { error: process.env.MERCHANT_IMPORT_TOKEN ? 'Merchant import is unauthorized.' : 'Merchant import is not configured.' },
      { status: process.env.MERCHANT_IMPORT_TOKEN ? 401 : 503 }
    );
  }

  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 1024 * 1024) {
      return NextResponse.json({ error: 'Import payload exceeds the 1 MB limit.' }, { status: 413 });
    }

    const requestText = await req.text();
    if (Buffer.byteLength(requestText, 'utf8') > 1024 * 1024) {
      return NextResponse.json({ error: 'Import payload exceeds the 1 MB limit.' }, { status: 413 });
    }

    const body = JSON.parse(requestText);
    const { storeName, items } = body;

    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return NextResponse.json(
        { error: 'Provide between 1 and 100 inventory items.' },
        { status: 400 }
      );
    }
    if (storeName !== undefined && (typeof storeName !== 'string' || storeName.length > 100)) {
      return NextResponse.json({ error: 'Store name must be 100 characters or fewer.' }, { status: 400 });
    }
    const invalidItem = items.find((raw) => {
      if (
        !raw ||
        typeof raw !== 'object' ||
        Array.isArray(raw) ||
        typeof raw.name !== 'string' ||
        !raw.name.trim() ||
        raw.name.length > 160 ||
        (raw.currency && raw.currency !== 'USD')
      ) {
        return true;
      }

      if (Array.isArray(raw.variants)) {
        return (
          raw.variants.length === 0 ||
          raw.variants.length > 100 ||
          raw.variants.some(
            (variant) =>
              !variant ||
              typeof variant.sku !== 'string' ||
              !/^[A-Za-z0-9._:-]{1,80}$/.test(variant.sku) ||
              !Number.isInteger(variant.priceMinor) ||
              variant.priceMinor <= 0 ||
              variant.priceMinor > 10_000_000 ||
              !Number.isInteger(variant.stock) ||
              variant.stock < 0 ||
              variant.stock > 1_000_000 ||
              typeof variant.color !== 'string' ||
              !variant.color.trim() ||
              !(
                (typeof variant.size === 'string' &&
                  variant.size.trim().length > 0 &&
                  variant.size.length <= 30) ||
                (Number.isFinite(variant.size) && variant.size > 0)
              ) ||
              (variant.originalPriceMinor !== undefined &&
                (!Number.isInteger(variant.originalPriceMinor) ||
                  variant.originalPriceMinor < variant.priceMinor ||
                  variant.originalPriceMinor > 10_000_000)),
          )
        );
      }

      const price = Number(raw.price);
      const originalPrice =
        raw.originalPrice === undefined
          ? price
          : Number(raw.originalPrice);
      return (
        !Number.isFinite(price) ||
        price <= 0 ||
        price > 100000 ||
        !Number.isFinite(originalPrice) ||
        originalPrice < price ||
        originalPrice > 100000
      );
    });
    if (invalidItem) {
      return NextResponse.json(
        { error: 'Every product must have a name and either a valid USD price or valid USD variant prices.' },
        { status: 400 }
      );
    }

    // Read current catalog
    let currentCatalog = [];
    if (fs.existsSync(CATALOG_PATH)) {
      const fileData = fs.readFileSync(CATALOG_PATH, 'utf-8');
      currentCatalog = JSON.parse(fileData);
    }

    // Format and ingest new items
    const usedProductIds = new Set(currentCatalog.map((product) => product.id));
    const ingested = items.map((raw, idx) => {
      const resolvedStore = raw.store || storeName || 'Partner Merchant';
      const images = (Array.isArray(raw.images) ? raw.images : [raw.image])
        .filter((image) => typeof image === 'string')
        .map((image) => getPhotoForProduct({ ...raw, image }));
      if (images.length === 0) images.push(getPhotoForProduct(raw));
      const baseId =
        typeof raw.id === 'string' &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.id)
          ? raw.id
          : slugify(`${resolvedStore}-${raw.name}`) ||
            `product-${randomUUID().slice(0, 8)}`;
      let id = baseId;
      let suffix = 2;
      while (usedProductIds.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }
      usedProductIds.add(id);
      const rating = raw.rating && typeof raw.rating === 'object'
        ? {
            average: Number.isFinite(Number(raw.rating.average))
              ? Number(raw.rating.average)
              : 0,
            count: Number.isInteger(raw.rating.count)
              ? raw.rating.count
              : 0,
          }
        : {
            average: Number.isFinite(Number(raw.rating))
              ? Number(raw.rating)
              : 0,
            count: Number.isInteger(raw.reviewsCount)
              ? raw.reviewsCount
              : 0,
          };
      const rawVariants = Array.isArray(raw.variants)
        ? raw.variants
        : [
            {
              sku: typeof raw.sku === 'string' && raw.sku.trim()
                ? raw.sku.trim().slice(0, 80)
                : `SKU-EXT-${randomUUID().slice(0, 8).toUpperCase()}`,
              color: typeof raw.color === 'string' ? raw.color : 'default',
              size: raw.size || 'Standard',
              priceMinor: Math.round(Number(raw.price) * 100),
              originalPriceMinor: Math.round(
                Number(raw.originalPrice ?? Number(raw.price) * 1.25) * 100,
              ),
              stock: raw.inStock === false ? 0 : Number(raw.stock ?? 10),
              imageIndex: 0,
            },
          ];
      return {
        id,
        name: raw.name.trim(),
        brand: typeof raw.brand === 'string' && raw.brand.trim()
          ? raw.brand.trim().slice(0, 80)
          : String(raw.name.trim().split(/\s+/)[0]).slice(0, 80),
        category: typeof raw.category === 'string' ? raw.category.slice(0, 40) : 'general',
        tags: Array.isArray(raw.tags)
          ? raw.tags.filter((tag) => typeof tag === 'string').slice(0, 20)
          : [],
        description: typeof raw.description === 'string'
          ? raw.description.slice(0, 1000)
          : `Product supplied by ${resolvedStore}.`,
        images,
        rating,
        currency: 'USD',
        variants: rawVariants.map((variant) => ({
          sku: variant.sku,
          color: variant.color.trim().toLowerCase(),
          size: variant.size,
          priceMinor: variant.priceMinor,
          originalPriceMinor: variant.originalPriceMinor ?? variant.priceMinor,
          stock: variant.stock,
          imageIndex:
            Number.isInteger(variant.imageIndex) &&
            variant.imageIndex >= 0 &&
            variant.imageIndex < images.length
              ? variant.imageIndex
              : 0,
          merchantOffers: Array.isArray(variant.merchantOffers)
            ? variant.merchantOffers
            : [
                {
                  store: resolvedStore,
                  priceMinor: variant.priceMinor,
                  shipping: 'Free Standard',
                  status: 'Best Price',
                  isWinner: true,
                },
              ],
        })),
        store: String(resolvedStore).slice(0, 100),
        deliveryDays: typeof raw.deliveryDays === 'string' ? raw.deliveryDays.slice(0, 80) : '2-3 business days',
        shippingCostMinor: Number.isInteger(raw.shippingCostMinor) && raw.shippingCostMinor >= 0
          ? raw.shippingCostMinor
          : Number.isFinite(Number(raw.shippingCost)) && Number(raw.shippingCost) >= 0
          ? Math.round(Number(raw.shippingCost) * 100)
          : 0,
        returnPolicy: typeof raw.returnPolicy === 'string'
          ? raw.returnPolicy.slice(0, 200)
          : '30-Day Free Returns (PayPal Protected)',
        demoCatalog: raw.demoCatalog === true,
      };
    });

    const existingSkus = new Set(
      currentCatalog.flatMap((product) =>
        (product.variants || []).map((variant) => variant.sku),
      ),
    );
    const importedSkus = new Set();
    for (const product of ingested) {
      for (const variant of product.variants) {
        if (existingSkus.has(variant.sku) || importedSkus.has(variant.sku)) {
          return NextResponse.json(
            { error: `SKU ${variant.sku} is already in the catalog.` },
            { status: 409 },
          );
        }
        importedSkus.add(variant.sku);
      }
    }

    // Merge into catalog (avoiding duplicate IDs)
    const existingIds = new Set(currentCatalog.map((c) => c.id));
    const newItems = ingested.filter((i) => !existingIds.has(i.id));
    const updatedCatalog = [...newItems, ...currentCatalog];

    // Write back to file system
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(updatedCatalog, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      importedCount: newItems.length,
      totalCatalogCount: updatedCatalog.length,
      sampleImported: newItems.slice(0, 3)
    });
  } catch (error) {
    console.error('Merchant import error:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Import request must contain valid JSON.' }, { status: 400 });
    }
    if (error.message.startsWith('Invalid original price')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Merchant import error:', error);
    return NextResponse.json({ error: 'Inventory import failed.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (fs.existsSync(CATALOG_PATH)) {
      const fileData = fs.readFileSync(CATALOG_PATH, 'utf-8');
      const catalog = JSON.parse(fileData);
      return NextResponse.json({ total: catalog.length, catalog });
    }
    return NextResponse.json({ total: 0, catalog: [] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
