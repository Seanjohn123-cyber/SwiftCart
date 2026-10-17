import pg from "pg";
import { randomUUID } from "node:crypto";

const { Pool } = pg;
let pool;
let schemaPromise;

export function isCustomerDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Customer accounts require DATABASE_URL to be configured.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", (error) => {
      console.error("Unexpected customer database pool error:", error);
    });
  }

  return pool;
}

async function ensureCustomerSchema() {
  if (!schemaPromise) {
    schemaPromise = getPool()
      .query(`
        CREATE TABLE IF NOT EXISTS swiftcart_customers (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL DEFAULT '',
          email TEXT NOT NULL UNIQUE,
          password_salt TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE swiftcart_customers
          ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '';
        CREATE TABLE IF NOT EXISTS swiftcart_checkout_intents (
          idempotency_key TEXT PRIMARY KEY,
          paypal_order_id TEXT UNIQUE,
          customer_id TEXT NOT NULL REFERENCES swiftcart_customers(id),
          product_id TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS swiftcart_customer_purchases (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL REFERENCES swiftcart_customers(id),
          paypal_order_id TEXT NOT NULL UNIQUE,
          paypal_capture_id TEXT NOT NULL UNIQUE,
          product_id TEXT NOT NULL,
          item_name TEXT NOT NULL,
          sku TEXT NOT NULL,
          amount TEXT NOT NULL,
          currency TEXT NOT NULL,
          purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS swiftcart_customer_purchases_history_idx
          ON swiftcart_customer_purchases (customer_id, purchased_at DESC);
      `)
      .catch((error) => {
        schemaPromise = null;
        throw error;
      });
  }
  await schemaPromise;
}

export async function createCustomer({
  fullName,
  email,
  passwordSalt,
  passwordHash,
}) {
  await ensureCustomerSchema();
  const customer = {
    id: randomUUID(),
    email,
  };
  await getPool().query(
    `INSERT INTO swiftcart_customers
       (id, full_name, email, password_salt, password_hash)
     VALUES ($1, $2, $3, $4, $5)`,
    [customer.id, fullName, customer.email, passwordSalt, passwordHash],
  );
  return customer;
}

export async function getCustomerByEmail(email) {
  await ensureCustomerSchema();
  const result = await getPool().query(
    `SELECT id, full_name, email, password_salt, password_hash
     FROM swiftcart_customers
     WHERE email = $1`,
    [email],
  );
  return result.rows[0] || null;
}

export async function getCustomerById(id) {
  await ensureCustomerSchema();
  const result = await getPool().query(
    "SELECT id, full_name, email FROM swiftcart_customers WHERE id = $1",
    [id],
  );
  return result.rows[0] || null;
}

export async function reserveCustomerCheckoutIntent({
  idempotencyKey,
  customerId,
  productId,
}) {
  await ensureCustomerSchema();
  const result = await getPool().query(
    `INSERT INTO swiftcart_checkout_intents
       (idempotency_key, customer_id, product_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING idempotency_key`,
    [idempotencyKey, customerId, productId],
  );

  if (result.rowCount === 1) return true;

  const existing = await getPool().query(
    `SELECT customer_id, product_id
     FROM swiftcart_checkout_intents
     WHERE idempotency_key = $1`,
    [idempotencyKey],
  );
  return (
    existing.rows[0]?.customer_id === customerId &&
    existing.rows[0]?.product_id === productId
  );
}

export async function linkCustomerCheckoutOrder({
  idempotencyKey,
  customerId,
  productId,
  orderId,
}) {
  await ensureCustomerSchema();
  const result = await getPool().query(
    `UPDATE swiftcart_checkout_intents
     SET paypal_order_id = COALESCE(paypal_order_id, $4)
     WHERE idempotency_key = $1
       AND customer_id = $2
       AND product_id = $3
       AND (paypal_order_id IS NULL OR paypal_order_id = $4)`,
    [idempotencyKey, customerId, productId, orderId],
  );
  return result.rowCount === 1;
}

export async function saveCustomerPurchase({
  orderId,
  captureId,
  product,
  amount,
  currency,
}) {
  await ensureCustomerSchema();
  await getPool().query(
    `INSERT INTO swiftcart_customer_purchases (
       id, customer_id, paypal_order_id, paypal_capture_id,
       product_id, item_name, sku, amount, currency
     )
     SELECT $1, intent.customer_id, intent.paypal_order_id, $3,
            intent.product_id, $5, $6, $7, $8
     FROM swiftcart_checkout_intents AS intent
     WHERE intent.paypal_order_id = $2
       AND intent.product_id = $4
     ON CONFLICT DO NOTHING`,
    [
      randomUUID(),
      orderId,
      captureId,
      product.sku,
      product.name,
      product.sku,
      amount,
      currency,
    ],
  );

  const saved = await getPool().query(
    `SELECT 1
     FROM swiftcart_customer_purchases
     WHERE paypal_order_id = $1 AND paypal_capture_id = $2`,
    [orderId, captureId],
  );
  return saved.rowCount === 1;
}

export async function listCustomerPurchases(customerId) {
  await ensureCustomerSchema();
  const result = await getPool().query(
    `SELECT paypal_order_id AS "orderId",
            paypal_capture_id AS "captureId",
            product_id AS "productId",
            item_name AS "itemName",
            sku,
            amount,
            currency,
            purchased_at AS "purchasedAt"
     FROM swiftcart_customer_purchases
     WHERE customer_id = $1
     ORDER BY purchased_at DESC
     LIMIT 100`,
    [customerId],
  );
  return result.rows;
}
