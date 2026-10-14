import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
  if (item.image && item.image.startsWith('http')) {
    return item.image;
  }
  const text = `${item.name} ${item.category || ''}`.toLowerCase();
  for (const [key, url] of Object.entries(FALLBACK_PHOTOS)) {
    if (text.includes(key)) return url;
  }
  return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { storeName, items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: items array is required.' },
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
      const price = parseFloat(raw.price) || 49.99;
      const originalPrice = raw.originalPrice ? parseFloat(raw.originalPrice) : Math.round(price * 1.25 * 100) / 100;
      const resolvedStore = raw.store || storeName || 'Partner Merchant';

      return {
        id: raw.id || `PROD-EXT-${Date.now()}-${idx + 1}`,
        name: raw.name || 'Unnamed Product',
        category: raw.category || 'general',
        price: price,
        originalPrice: originalPrice,
        size: raw.size || 'Standard',
        color: raw.color || 'Default',
        rating: raw.rating || 4.7,
        reviewsCount: raw.reviewsCount || Math.floor(Math.random() * 800) + 120,
        sku: raw.sku || `SKU-EXT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        inStock: true,
        store: resolvedStore,
        deliveryDays: raw.deliveryDays || '2-3 business days',
        shippingCost: raw.shippingCost || 0.00,
        returnPolicy: raw.returnPolicy || '30-Day Free Returns (PayPal Protected)',
        description: raw.description || `Verified retail product from ${resolvedStore}.`,
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
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
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
