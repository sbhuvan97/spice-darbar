require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id           SERIAL PRIMARY KEY,
        name         VARCHAR(100) NOT NULL,
        local_name   VARCHAR(200),
        emoji        VARCHAR(10),
        description  TEXT,
        price        NUMERIC(10,2) NOT NULL,
        category     VARCHAR(50) NOT NULL,
        region       VARCHAR(100),
        tags         TEXT[],
        badge        VARCHAR(50),
        is_veg       BOOLEAN DEFAULT false,
        is_available BOOLEAN DEFAULT true,
        sort_order   INT DEFAULT 0,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number   VARCHAR(20) UNIQUE NOT NULL,
        table_number   INT NOT NULL,
        status         VARCHAR(20) NOT NULL DEFAULT 'new'
                         CHECK (status IN ('new','preparing','ready','served','cancelled')),
        subtotal       NUMERIC(10,2) NOT NULL DEFAULT 0,
        gst_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
        total_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
        customer_lang  VARCHAR(10) DEFAULT 'en',
        notes          TEXT,
        placed_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at     TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id            SERIAL PRIMARY KEY,
        order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        menu_item_id  INT  NOT NULL REFERENCES menu_items(id),
        item_name     VARCHAR(100) NOT NULL,
        item_emoji    VARCHAR(10),
        quantity      INT NOT NULL DEFAULT 1,
        unit_price    NUMERIC(10,2) NOT NULL,
        line_total    NUMERIC(10,2) NOT NULL,
        special_note  TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS waiter_calls (
        id           SERIAL PRIMARY KEY,
        table_number INT NOT NULL,
        is_resolved  BOOLEAN DEFAULT false,
        called_at    TIMESTAMPTZ DEFAULT NOW(),
        resolved_at  TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id            SERIAL PRIMARY KEY,
        username      VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role          VARCHAR(20) DEFAULT 'kitchen',
        is_active     BOOLEAN DEFAULT true,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status    ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_table     ON orders(table_number);
      CREATE INDEX IF NOT EXISTS idx_orders_placed_at ON orders(placed_at DESC);
      CREATE INDEX IF NOT EXISTS idx_order_items_oid  ON order_items(order_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(() => process.exit(1));
