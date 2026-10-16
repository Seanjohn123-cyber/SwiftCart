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
      const price = Number(raw?.price);
      return !raw || typeof raw !== 'object' || Array.isArray(raw) ||
        typeof raw.name !== 'string' || !raw.name.trim() || raw.name.length > 160 ||
        !Number.isFinite(price) || price <= 0 || price > 100000;
    });
    if (invalidItem) {
      return NextResponse.json(
        { error: 'Every item must have a name and a valid price no greater than 100000.' },
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
    const ingested = items.map((raw, idx) => {
      const price = Number(raw.price);
      const originalPrice = raw.originalPrice !== undefined
        ? Number(raw.originalPrice)
        : Math.round(price * 1.25 * 100) / 100;
      if (!Number.isFinite(originalPrice) || originalPrice < price || originalPrice > 100000) {
        throw new Error(`Invalid original price for "${raw.name}".`);
      }
      const resolvedStore = raw.store || storeName || 'Partner Merchant';

      return {
        id: typeof raw.id === 'string' && /^[A-Za-z0-9._:-]{1,100}$/.test(raw.id)
          ? raw.id
          : `PROD-EXT-${randomUUID()}-${idx + 1}`,
        name: raw.name.trim(),
        category: typeof raw.category === 'string' ? raw.category.slice(0, 40) : 'general',
        price: price,
        originalPrice: originalPrice,
        size: raw.size || 'Standard',
        color: raw.color || 'Default',
        rating: raw.rating || 4.7,
        reviewsCount: raw.reviewsCount || Math.floor(Math.random() * 800) + 120,
        sku: typeof raw.sku === 'string' && raw.sku.trim()
          ? raw.sku.trim().slice(0, 80)
          : `SKU-EXT-${randomUUID().slice(0, 8).toUpperCase()}`,
        inStock: typeof raw.inStock === 'boolean' ? raw.inStock : true,
        store: String(resolvedStore).slice(0, 100),
        deliveryDays: typeof raw.deliveryDays === 'string' ? raw.deliveryDays.slice(0, 80) : '2-3 business days',
        shippingCost: Number.isFinite(Number(raw.shippingCost)) && Number(raw.shippingCost) >= 0
          ? Number(raw.shippingCost)
          : 0,
        returnPolicy: typeof raw.returnPolicy === 'string'
          ? raw.returnPolicy.slice(0, 200)
          : '30-Day Free Returns (PayPal Protected)',
        description: typeof raw.description === 'string'
          ? raw.description.slice(0, 1000)
          : `Verified retail product from ${resolvedStore}.`,
        image: getPhotoForProduct(raw),
        merchantOffers: raw.merchantOffers || [
          { store: resolvedStore, price: price, shipping: 'Free Standard', status: 'Best Price', isWinner: true },
          { store: 'Marketplace Alternative', price: Math.round(price * 1.15 * 100) / 100, shipping: '$4.99 Ground', status: `+$${(price * 0.15).toFixed(2)}`, isWinner: false }
        ]
      };
    });

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
