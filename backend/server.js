import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'db.json');
const DIST_DIR = join(dirname(__dirname), 'dist');
const PORT = Number(process.env.PORT || 4000);
const DATABASE_URL = process.env.DATABASE_URL?.trim() || '';
const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim() || '';

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const defaultDb = {
  products: [],
  purchases: [],
  mortalities: [],
  expenses: [],
  dailyReports: [],
  costingReports: [],
  dailyTarget: { quantity: 0 },
  dailySales: {},
  sales: [],
  sessions: [],
  users: [
    { id: 'user_admin', username: 'owner', password: 'password', role: 'admin' },
    { id: 'user_salesman', username: 'salesman', password: 'password', role: 'salesman' },
  ],
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeRole(value) {
  return value === 'salesman' ? 'salesman' : 'admin';
}

function paymentGroupFor(method, explicitGroup) {
  if (explicitGroup === 'Cash' || explicitGroup === 'Bank') {
    return explicitGroup;
  }
  return String(method ?? 'Cash') === 'Cash' ? 'Cash' : 'Bank';
}

function sameName(a, b) {
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
}

function computeDailyReportMetrics(input) {
  const openingBirds = Math.max(0, Number(input.openingBirds ?? 0));
  const mortality = Math.max(0, Number(input.mortality ?? 0));
  const sick = Math.max(0, Number(input.sick ?? 0));
  const openingFeedKg = Math.max(0, Number(input.openingFeedKg ?? 0));
  const usedFeedKg = Math.max(0, Number(input.usedFeedKg ?? 0));
  const receivedFeedKg = Math.max(0, Number(input.receivedFeedKg ?? 0));
  const totalFeedCost = Math.max(0, Number(input.totalFeedCost ?? 0));
  const closingBirds = Math.max(0, openingBirds - mortality);
  const closingFeedKg = Math.max(0, openingFeedKg + receivedFeedKg - usedFeedKg);
  const perBirdKg = closingBirds > 0 ? usedFeedKg / closingBirds : 0;
  const perBirdFeedCost = closingBirds > 0 ? totalFeedCost / closingBirds : 0;

  return {
    openingBirds,
    mortality,
    sick,
    closingBirds,
    openingFeedKg,
    usedFeedKg,
    receivedFeedKg,
    closingFeedKg,
    perBirdKg,
    perBirdFeedCost,
    totalFeedCost,
  };
}

function flattenSalesForSheet(sales) {
  return sales.flatMap((sale) =>
    (sale.items ?? []).map((item) => ({
      saleId: sale.id,
      saleDate: sale.createdAt,
      handledBy: sale.createdByUsername,
      customerName: sale.customerName ?? '',
      customerPhone: sale.customerPhone ?? '',
      paymentMethod: sale.paymentMethod,
      product: item.name,
      category: item.category ?? '',
      quantity: Number(item.qty ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
      lineTotal: Number(item.lineTotal ?? 0),
      subtotal: Number(sale.subtotal ?? 0),
      discount: Number(sale.discount ?? 0),
      total: Number(sale.total ?? 0),
      received: Number(sale.received ?? 0),
      balance: Math.max(0, Number(sale.balance ?? 0)),
    }))
  );
}

async function syncSalesToGoogleSheets(sales) {
  if (!GOOGLE_SHEETS_WEBHOOK_URL) {
    return;
  }

  const rows = flattenSalesForSheet(sales);
  try {
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sheetName: 'Sales Register',
        headers: [
          'Sale ID',
          'Sale Date',
          'Handled By',
          'Customer Name',
          'Customer Phone',
          'Payment Method',
          'Product',
          'Category',
          'Quantity',
          'Unit Price',
          'Line Total',
          'Subtotal',
          'Discount',
          'Total',
          'Received',
          'Balance',
        ],
        rows: rows.map((row) => [
          row.saleId,
          row.saleDate,
          row.handledBy,
          row.customerName,
          row.customerPhone,
          row.paymentMethod,
          row.product,
          row.category,
          row.quantity,
          row.unitPrice,
          row.lineTotal,
          row.subtotal,
          row.discount,
          row.total,
          row.received,
          row.balance,
        ]),
      }),
    });

    if (!response.ok) {
      console.error(`Google Sheets sync failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Google Sheets sync failed', error);
  }
}

async function ensureJsonDb() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  if (!existsSync(DATA_FILE)) {
    await writeFile(DATA_FILE, JSON.stringify(defaultDb, null, 2), 'utf8');
  }
}

async function readJsonDb() {
  await ensureJsonDb();
  const raw = await readFile(DATA_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    const legacyAdmin = parsed.auth
      ? {
          id: 'user_admin',
          username: String(parsed.auth.username ?? defaultDb.users[0].username).trim() || defaultDb.users[0].username,
          password: String(parsed.auth.password ?? defaultDb.users[0].password).trim() || defaultDb.users[0].password,
          role: 'admin',
        }
      : defaultDb.users[0];
    const parsedUsers = Array.isArray(parsed.users)
      ? parsed.users
          .map((user, index) => ({
            id: String(user.id ?? `user_${index + 1}`),
            username: String(user.username ?? '').trim(),
            password: String(user.password ?? '').trim(),
            role: normalizeRole(user.role),
          }))
          .filter((user) => user.username && user.password)
      : [];
    const users = parsedUsers.length ? parsedUsers : [legacyAdmin, defaultDb.users[1]];
    const sessions = Array.isArray(parsed.sessions)
      ? parsed.sessions
          .map((session) => {
            if (typeof session === 'string') {
              return { token: session, userId: users[0].id };
            }
            return {
              token: String(session?.token ?? ''),
              userId: String(session?.userId ?? users[0].id),
            };
          })
          .filter((session) => session.token && users.some((user) => user.id === session.userId))
      : [];

    return {
      ...defaultDb,
      ...parsed,
      dailyTarget: {
        ...defaultDb.dailyTarget,
        ...(parsed.dailyTarget ?? {}),
      },
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
      mortalities: Array.isArray(parsed.mortalities) ? parsed.mortalities : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      dailyReports: Array.isArray(parsed.dailyReports) ? parsed.dailyReports : [],
      costingReports: Array.isArray(parsed.costingReports) ? parsed.costingReports : [],
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
      users,
      sessions,
    };
  } catch {
    return structuredClone(defaultDb);
  }
}

async function writeJsonDb(db) {
  await ensureJsonDb();
  await writeFile(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function createJsonStorage() {
  return {
    kind: 'json',
    async init() {
      await ensureJsonDb();
    },
    async authenticateUser(username, password) {
      const db = await readJsonDb();
      return db.users.find((user) => user.username === username && user.password === password) ?? null;
    },
    async upsertSession(token, userId) {
      const db = await readJsonDb();
      db.sessions = [...db.sessions.filter((session) => session.userId !== userId), { token, userId }];
      await writeJsonDb(db);
    },
    async getUserByToken(token) {
      const db = await readJsonDb();
      const session = db.sessions.find((item) => item.token === token);
      if (!session) return null;
      const user = db.users.find((item) => item.id === session.userId);
      return user ?? null;
    },
    async deleteSession(token) {
      const db = await readJsonDb();
      db.sessions = db.sessions.filter((session) => session.token !== token);
      await writeJsonDb(db);
    },
    async listProducts() {
      const db = await readJsonDb();
      return db.products;
    },
    async upsertProduct(product) {
      const db = await readJsonDb();
      const index = db.products.findIndex((item) => item.id === product.id);
      if (index >= 0) db.products[index] = product;
      else db.products.unshift(product);
      await writeJsonDb(db);
      return product;
    },
    async deleteProduct(id) {
      const db = await readJsonDb();
      db.products = db.products.filter((product) => product.id !== id);
      await writeJsonDb(db);
    },
    async listPurchases() {
      const db = await readJsonDb();
      return [...(db.purchases ?? [])]
        .map((purchase) => ({
          ...purchase,
          sellPrice: Number(purchase.sellPrice ?? 0),
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    async createPurchase(purchase) {
      const db = await readJsonDb();
      db.purchases = [purchase, ...(db.purchases ?? [])];
      const existing = db.products.find((product) => sameName(product.name, purchase.birdType));
      if (existing) {
        existing.stock = Number(existing.stock ?? 0) + Number(purchase.quantity ?? 0);
        existing.costPrice = Number(purchase.unitCost ?? existing.costPrice ?? 0);
        existing.sellPrice = Number(purchase.sellPrice ?? existing.sellPrice ?? 0);
      } else {
        db.products.unshift({
          id: randomUUID(),
          name: purchase.birdType,
          category: 'Live Bird',
          costPrice: Number(purchase.unitCost ?? 0),
          sellPrice: Number(purchase.sellPrice ?? 0),
          stock: Number(purchase.quantity ?? 0),
        });
      }
      await writeJsonDb(db);
      return purchase;
    },
    async listMortalities() {
      const db = await readJsonDb();
      return [...(db.mortalities ?? [])]
        .map((mortality) => ({
          ...mortality,
          sickQuantity: Number(mortality.sickQuantity ?? 0),
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    async createMortality(mortality) {
      const db = await readJsonDb();
      db.mortalities = [mortality, ...(db.mortalities ?? [])];
      const existing = db.products.find((product) => sameName(product.name, mortality.birdType));
      if (existing) {
        existing.stock = Math.max(0, Number(existing.stock ?? 0) - Number(mortality.quantity ?? 0));
      }
      await writeJsonDb(db);
      return mortality;
    },
    async listExpenses() {
      const db = await readJsonDb();
      return [...(db.expenses ?? [])]
        .map((expense) => ({
          ...expense,
          openingFeedKg: expense.openingFeedKg === undefined || expense.openingFeedKg === null ? undefined : Number(expense.openingFeedKg),
          feedRatePerKg: Number(expense.feedRatePerKg ?? 0),
          feedReceivedKg: Number(expense.feedReceivedKg ?? 0),
          feedUsedKg: Number(expense.feedUsedKg ?? 0),
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    async createExpense(expense) {
      const db = await readJsonDb();
      db.expenses = [expense, ...(db.expenses ?? [])];
      await writeJsonDb(db);
      return expense;
    },
    async listDailyReports() {
      const db = await readJsonDb();
      return [...(db.dailyReports ?? [])].sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate)));
    },
    async listCostingReports() {
      const db = await readJsonDb();
      return [...(db.costingReports ?? [])].sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate)));
    },
    async upsertDailyReport(report) {
      const db = await readJsonDb();
      const index = (db.dailyReports ?? []).findIndex((item) => item.reportDate === report.reportDate);
      if (index >= 0) {
        db.dailyReports[index] = report;
      } else {
        db.dailyReports = [...(db.dailyReports ?? []), report];
      }
      await writeJsonDb(db);
      return report;
    },
    async getDailyTarget() {
      const db = await readJsonDb();
      return db.dailyTarget ?? { quantity: 0 };
    },
    async setDailyTarget(quantity) {
      const db = await readJsonDb();
      db.dailyTarget = { quantity };
      await writeJsonDb(db);
      return db.dailyTarget;
    },
    async getTodaySalesQuantity() {
      const db = await readJsonDb();
      return Number(db.dailySales[todayKey()] ?? 0);
    },
    async addDailySale(quantity) {
      const db = await readJsonDb();
      const key = todayKey();
      db.dailySales[key] = Number(db.dailySales[key] ?? 0) + quantity;
      await writeJsonDb(db);
      return db.dailySales[key];
    },
    async listSales() {
      const db = await readJsonDb();
      return [...(db.sales ?? [])]
        .map((sale) => ({
          ...sale,
          customerName: sale.customerName ? String(sale.customerName) : undefined,
          customerPhone: sale.customerPhone ? String(sale.customerPhone) : undefined,
          paymentGroup: paymentGroupFor(sale.paymentMethod, sale.paymentGroup),
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    async createSale(sale) {
      const db = await readJsonDb();
      db.sales = [sale, ...(db.sales ?? [])];
      db.products = db.products.map((product) => {
        const soldItem = sale.items.find((item) => item.productId === product.id);
        if (!soldItem) return product;
        return {
          ...product,
          stock: Math.max(0, Number(product.stock ?? 0) - Number(soldItem.qty ?? 0)),
        };
      });
      const key = todayKey();
      db.dailySales[key] = Number(db.dailySales[key] ?? 0) + Number(sale.totalQuantity ?? 0);
      await writeJsonDb(db);
      return sale;
    },
    async receiveSaleDue(id, amount) {
      const db = await readJsonDb();
      const saleIndex = (db.sales ?? []).findIndex((item) => item.id === id);
      if (saleIndex < 0) return null;
      const sale = db.sales[saleIndex];
      const dueLeft = Math.max(0, Number(sale.total ?? 0) - Number(sale.received ?? 0));
      const receivedNow = Math.min(Math.max(0, Number(amount ?? 0)), dueLeft);
      const updatedSale = {
        ...sale,
        received: Number(sale.received ?? 0) + receivedNow,
        balance: -Math.max(0, dueLeft - receivedNow),
      };
      db.sales[saleIndex] = updatedSale;
      await writeJsonDb(db);
      return updatedSale;
    },
    async deleteSale(id) {
      const db = await readJsonDb();
      const sale = (db.sales ?? []).find((item) => item.id === id);
      if (!sale) return null;
      db.sales = (db.sales ?? []).filter((item) => item.id !== id);
      db.products = db.products.map((product) => {
        const soldItem = sale.items.find((item) => item.productId === product.id);
        if (!soldItem) return product;
        return {
          ...product,
          stock: Number(product.stock ?? 0) + Number(soldItem.qty ?? 0),
        };
      });
      const saleDateKey = String(sale.createdAt ?? '').slice(0, 10) || todayKey();
      db.dailySales[saleDateKey] = Math.max(0, Number(db.dailySales[saleDateKey] ?? 0) - Number(sale.totalQuantity ?? 0));
      await writeJsonDb(db);
      return sale;
    },
    async listUsers() {
      const db = await readJsonDb();
      return db.users;
    },
    async updateUserCredentials(userId, username, password) {
      const db = await readJsonDb();
      const userIndex = db.users.findIndex((user) => user.id === userId);
      if (userIndex < 0) return null;
      db.users[userIndex] = { ...db.users[userIndex], username, password };
      await writeJsonDb(db);
      return db.users[userIndex];
    },
    async usernameExists(username, excludeUserId) {
      const db = await readJsonDb();
      return db.users.some((user) => user.id !== excludeUserId && user.username === username);
    },
  };
}

function createPostgresStorage() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : undefined,
  });

  return {
    kind: 'postgres',
    async init() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT,
          cost_price NUMERIC NOT NULL DEFAULT 0,
          sell_price NUMERIC NOT NULL DEFAULT 0,
          stock INTEGER NOT NULL DEFAULT 0
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS purchases (
          id TEXT PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL,
          bird_type TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 0,
          unit_cost NUMERIC NOT NULL DEFAULT 0,
          sell_price NUMERIC NOT NULL DEFAULT 0,
          total_cost NUMERIC NOT NULL DEFAULT 0,
          supplier TEXT,
          notes TEXT
        );
      `);
      await pool.query(`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS sell_price NUMERIC NOT NULL DEFAULT 0;`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS mortalities (
          id TEXT PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL,
          bird_type TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 0,
          sick_quantity INTEGER NOT NULL DEFAULT 0,
          notes TEXT
        );
      `);
      await pool.query(`ALTER TABLE mortalities ADD COLUMN IF NOT EXISTS sick_quantity INTEGER NOT NULL DEFAULT 0;`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL,
          category TEXT NOT NULL,
          amount NUMERIC NOT NULL DEFAULT 0,
          opening_feed_kg NUMERIC,
          feed_rate_per_kg NUMERIC NOT NULL DEFAULT 0,
          feed_received_kg NUMERIC NOT NULL DEFAULT 0,
          feed_used_kg NUMERIC NOT NULL DEFAULT 0,
          notes TEXT
        );
      `);
      await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS opening_feed_kg NUMERIC;`);
      await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS feed_rate_per_kg NUMERIC NOT NULL DEFAULT 0;`);
      await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS feed_received_kg NUMERIC NOT NULL DEFAULT 0;`);
      await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS feed_used_kg NUMERIC NOT NULL DEFAULT 0;`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS daily_target (
          id INTEGER PRIMARY KEY,
          quantity INTEGER NOT NULL DEFAULT 0
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS daily_sales (
          sale_date DATE PRIMARY KEY,
          quantity INTEGER NOT NULL DEFAULT 0
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS daily_reports (
          id TEXT PRIMARY KEY,
          report_date DATE NOT NULL UNIQUE,
          opening_birds INTEGER NOT NULL DEFAULT 0,
          mortality INTEGER NOT NULL DEFAULT 0,
          sick INTEGER NOT NULL DEFAULT 0,
          closing_birds INTEGER NOT NULL DEFAULT 0,
          opening_feed_kg NUMERIC NOT NULL DEFAULT 0,
          used_feed_kg NUMERIC NOT NULL DEFAULT 0,
          received_feed_kg NUMERIC NOT NULL DEFAULT 0,
          closing_feed_kg NUMERIC NOT NULL DEFAULT 0,
          per_bird_kg NUMERIC NOT NULL DEFAULT 0,
          per_bird_feed_cost NUMERIC NOT NULL DEFAULT 0,
          total_feed_cost NUMERIC NOT NULL DEFAULT 0
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sales (
          id TEXT PRIMARY KEY,
          invoice_number TEXT NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL,
          created_by_user_id TEXT NOT NULL REFERENCES users(id),
          created_by_username TEXT NOT NULL,
          customer_name TEXT,
          customer_phone TEXT,
          payment_method TEXT NOT NULL,
          payment_group TEXT NOT NULL,
          subtotal NUMERIC NOT NULL DEFAULT 0,
          discount NUMERIC NOT NULL DEFAULT 0,
          total NUMERIC NOT NULL DEFAULT 0,
          received NUMERIC NOT NULL DEFAULT 0,
          balance NUMERIC NOT NULL DEFAULT 0,
          total_quantity INTEGER NOT NULL DEFAULT 0,
          items JSONB NOT NULL DEFAULT '[]'::jsonb
        );
      `);
      await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_group TEXT NOT NULL DEFAULT 'Cash';`);
      await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name TEXT;`);
      await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;`);

      await pool.query(
        `
          INSERT INTO users (id, username, password, role)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO NOTHING;
        `,
        [defaultDb.users[0].id, defaultDb.users[0].username, defaultDb.users[0].password, defaultDb.users[0].role]
      );
      await pool.query(
        `
          INSERT INTO users (id, username, password, role)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO NOTHING;
        `,
        [defaultDb.users[1].id, defaultDb.users[1].username, defaultDb.users[1].password, defaultDb.users[1].role]
      );
      await pool.query(
        `
          INSERT INTO daily_target (id, quantity)
          VALUES (1, 0)
          ON CONFLICT (id) DO NOTHING;
        `
      );
    },
    async authenticateUser(username, password) {
      const result = await pool.query(
        `SELECT id, username, password, role FROM users WHERE username = $1 AND password = $2 LIMIT 1`,
        [username, password]
      );
      return result.rows[0] ? { ...result.rows[0], role: normalizeRole(result.rows[0].role) } : null;
    },
    async upsertSession(token, userId) {
      await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
      await pool.query(`INSERT INTO sessions (token, user_id) VALUES ($1, $2)`, [token, userId]);
    },
    async getUserByToken(token) {
      const result = await pool.query(
        `
          SELECT users.id, users.username, users.password, users.role
          FROM sessions
          JOIN users ON users.id = sessions.user_id
          WHERE sessions.token = $1
          LIMIT 1
        `,
        [token]
      );
      return result.rows[0] ? { ...result.rows[0], role: normalizeRole(result.rows[0].role) } : null;
    },
    async deleteSession(token) {
      await pool.query(`DELETE FROM sessions WHERE token = $1`, [token]);
    },
    async listProducts() {
      const result = await pool.query(
        `
          SELECT id, name, category, cost_price, sell_price, stock
          FROM products
          ORDER BY name ASC
        `
      );
      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category ?? undefined,
        costPrice: Number(row.cost_price ?? 0),
        sellPrice: Number(row.sell_price ?? 0),
        stock: Number(row.stock ?? 0),
      }));
    },
    async upsertProduct(product) {
      await pool.query(
        `
          INSERT INTO products (id, name, category, cost_price, sell_price, stock)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id)
          DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            cost_price = EXCLUDED.cost_price,
            sell_price = EXCLUDED.sell_price,
            stock = EXCLUDED.stock
        `,
        [product.id, product.name, product.category ?? null, product.costPrice, product.sellPrice, product.stock]
      );
      return product;
    },
    async deleteProduct(id) {
      await pool.query(`DELETE FROM products WHERE id = $1`, [id]);
    },
    async listPurchases() {
      const result = await pool.query(
        `
          SELECT id, created_at, bird_type, quantity, unit_cost, sell_price, total_cost, supplier, notes
          FROM purchases
          ORDER BY created_at DESC
        `
      );
      return result.rows.map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        birdType: row.bird_type,
        quantity: Number(row.quantity ?? 0),
        unitCost: Number(row.unit_cost ?? 0),
        sellPrice: Number(row.sell_price ?? 0),
        totalCost: Number(row.total_cost ?? 0),
        supplier: row.supplier ?? undefined,
        notes: row.notes ?? undefined,
      }));
    },
    async createPurchase(purchase) {
      await pool.query(
        `
          INSERT INTO purchases (id, created_at, bird_type, quantity, unit_cost, sell_price, total_cost, supplier, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          purchase.id,
          purchase.createdAt,
          purchase.birdType,
          purchase.quantity,
          purchase.unitCost,
          purchase.sellPrice,
          purchase.totalCost,
          purchase.supplier ?? null,
          purchase.notes ?? null,
        ]
      );
      await pool.query(
        `
          INSERT INTO products (id, name, category, cost_price, sell_price, stock)
          SELECT $1, $2, 'Live Bird', $3, $4, 0
          WHERE NOT EXISTS (
            SELECT 1 FROM products WHERE LOWER(name) = LOWER($2)
          )
        `,
        [randomUUID(), purchase.birdType, purchase.unitCost, purchase.sellPrice]
      );
      await pool.query(
        `
          UPDATE products
          SET stock = stock + $2,
              cost_price = $3,
              sell_price = $4
          WHERE LOWER(name) = LOWER($1)
        `,
        [purchase.birdType, purchase.quantity, purchase.unitCost, purchase.sellPrice]
      );
      return purchase;
    },
    async listMortalities() {
      const result = await pool.query(
        `
          SELECT id, created_at, bird_type, quantity, sick_quantity, notes
          FROM mortalities
          ORDER BY created_at DESC
        `
      );
      return result.rows.map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        birdType: row.bird_type,
        quantity: Number(row.quantity ?? 0),
        sickQuantity: Number(row.sick_quantity ?? 0),
        notes: row.notes ?? undefined,
      }));
    },
    async createMortality(mortality) {
      await pool.query(
        `
          INSERT INTO mortalities (id, created_at, bird_type, quantity, sick_quantity, notes)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [mortality.id, mortality.createdAt, mortality.birdType, mortality.quantity, Number(mortality.sickQuantity ?? 0), mortality.notes ?? null]
      );
      await pool.query(
        `
          UPDATE products
          SET stock = GREATEST(stock - $2, 0)
          WHERE LOWER(name) = LOWER($1)
        `,
        [mortality.birdType, mortality.quantity]
      );
      return mortality;
    },
    async listExpenses() {
      const result = await pool.query(
        `
          SELECT id, created_at, category, amount, opening_feed_kg, feed_rate_per_kg, feed_received_kg, feed_used_kg, notes
          FROM expenses
          ORDER BY created_at DESC
        `
      );
      return result.rows.map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        category: row.category,
        amount: Number(row.amount ?? 0),
        openingFeedKg: row.opening_feed_kg === null || row.opening_feed_kg === undefined ? undefined : Number(row.opening_feed_kg),
        feedRatePerKg: Number(row.feed_rate_per_kg ?? 0),
        feedReceivedKg: Number(row.feed_received_kg ?? 0),
        feedUsedKg: Number(row.feed_used_kg ?? 0),
        notes: row.notes ?? undefined,
      }));
    },
    async createExpense(expense) {
      await pool.query(
        `
          INSERT INTO expenses (id, created_at, category, amount, opening_feed_kg, feed_rate_per_kg, feed_received_kg, feed_used_kg, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          expense.id,
          expense.createdAt,
          expense.category,
          expense.amount,
          expense.openingFeedKg ?? null,
          Number(expense.feedRatePerKg ?? 0),
          Number(expense.feedReceivedKg ?? 0),
          Number(expense.feedUsedKg ?? 0),
          expense.notes ?? null,
        ]
      );
      return expense;
    },
    async listDailyReports() {
      const result = await pool.query(
        `
          SELECT
            id,
            report_date,
            opening_birds,
            mortality,
            sick,
            closing_birds,
            opening_feed_kg,
            used_feed_kg,
            received_feed_kg,
            closing_feed_kg,
            per_bird_kg,
            per_bird_feed_cost,
            total_feed_cost
          FROM daily_reports
          ORDER BY report_date ASC
        `
      );
      return result.rows.map((row) => ({
        id: row.id,
        reportDate: String(row.report_date).slice(0, 10),
        openingBirds: Number(row.opening_birds ?? 0),
        mortality: Number(row.mortality ?? 0),
        sick: Number(row.sick ?? 0),
        closingBirds: Number(row.closing_birds ?? 0),
        openingFeedKg: Number(row.opening_feed_kg ?? 0),
        usedFeedKg: Number(row.used_feed_kg ?? 0),
        receivedFeedKg: Number(row.received_feed_kg ?? 0),
        closingFeedKg: Number(row.closing_feed_kg ?? 0),
        perBirdKg: Number(row.per_bird_kg ?? 0),
        perBirdFeedCost: Number(row.per_bird_feed_cost ?? 0),
        totalFeedCost: Number(row.total_feed_cost ?? 0),
      }));
    },
    async listCostingReports() {
      return [];
    },
    async upsertDailyReport(report) {
      await pool.query(
        `
          INSERT INTO daily_reports (
            id,
            report_date,
            opening_birds,
            mortality,
            sick,
            closing_birds,
            opening_feed_kg,
            used_feed_kg,
            received_feed_kg,
            closing_feed_kg,
            per_bird_kg,
            per_bird_feed_cost,
            total_feed_cost
          )
          VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (report_date)
          DO UPDATE SET
            opening_birds = EXCLUDED.opening_birds,
            mortality = EXCLUDED.mortality,
            sick = EXCLUDED.sick,
            closing_birds = EXCLUDED.closing_birds,
            opening_feed_kg = EXCLUDED.opening_feed_kg,
            used_feed_kg = EXCLUDED.used_feed_kg,
            received_feed_kg = EXCLUDED.received_feed_kg,
            closing_feed_kg = EXCLUDED.closing_feed_kg,
            per_bird_kg = EXCLUDED.per_bird_kg,
            per_bird_feed_cost = EXCLUDED.per_bird_feed_cost,
            total_feed_cost = EXCLUDED.total_feed_cost
        `,
        [
          report.id,
          report.reportDate,
          report.openingBirds,
          report.mortality,
          report.sick,
          report.closingBirds,
          report.openingFeedKg,
          report.usedFeedKg,
          report.receivedFeedKg,
          report.closingFeedKg,
          report.perBirdKg,
          report.perBirdFeedCost,
          report.totalFeedCost,
        ]
      );
      return report;
    },
    async getDailyTarget() {
      const result = await pool.query(`SELECT quantity FROM daily_target WHERE id = 1 LIMIT 1`);
      return { quantity: Number(result.rows[0]?.quantity ?? 0) };
    },
    async setDailyTarget(quantity) {
      const result = await pool.query(
        `
          INSERT INTO daily_target (id, quantity)
          VALUES (1, $1)
          ON CONFLICT (id)
          DO UPDATE SET quantity = EXCLUDED.quantity
          RETURNING quantity
        `,
        [quantity]
      );
      return { quantity: Number(result.rows[0]?.quantity ?? 0) };
    },
    async getTodaySalesQuantity() {
      const result = await pool.query(`SELECT quantity FROM daily_sales WHERE sale_date = $1::date LIMIT 1`, [todayKey()]);
      return Number(result.rows[0]?.quantity ?? 0);
    },
    async addDailySale(quantity) {
      const result = await pool.query(
        `
          INSERT INTO daily_sales (sale_date, quantity)
          VALUES ($1::date, $2)
          ON CONFLICT (sale_date)
          DO UPDATE SET quantity = daily_sales.quantity + EXCLUDED.quantity
          RETURNING quantity
        `,
        [todayKey(), quantity]
      );
      return Number(result.rows[0]?.quantity ?? 0);
    },
    async listSales() {
      const result = await pool.query(
        `
          SELECT
            id,
            invoice_number,
            created_at,
            created_by_user_id,
            created_by_username,
            customer_name,
            customer_phone,
            payment_method,
            payment_group,
            subtotal,
            discount,
            total,
            received,
            balance,
            total_quantity,
            items
          FROM sales
          ORDER BY created_at DESC
        `
      );
      return result.rows.map((row) => ({
        id: row.id,
        invoiceNumber: row.invoice_number,
        createdAt: row.created_at,
        createdByUserId: row.created_by_user_id,
        createdByUsername: row.created_by_username,
        customerName: row.customer_name ?? undefined,
        customerPhone: row.customer_phone ?? undefined,
        paymentMethod: row.payment_method,
        paymentGroup: paymentGroupFor(row.payment_method, row.payment_group),
        subtotal: Number(row.subtotal ?? 0),
        discount: Number(row.discount ?? 0),
        total: Number(row.total ?? 0),
        received: Number(row.received ?? 0),
        balance: Number(row.balance ?? 0),
        totalQuantity: Number(row.total_quantity ?? 0),
        items: Array.isArray(row.items) ? row.items : [],
      }));
    },
    async createSale(sale) {
      await pool.query(
        `
          INSERT INTO sales (
            id,
            invoice_number,
            created_at,
            created_by_user_id,
            created_by_username,
            customer_name,
            customer_phone,
            payment_method,
            payment_group,
            subtotal,
            discount,
            total,
            received,
            balance,
            total_quantity,
            items
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb)
        `,
        [
          sale.id,
          sale.invoiceNumber,
          sale.createdAt,
          sale.createdByUserId,
          sale.createdByUsername,
          sale.customerName ?? null,
          sale.customerPhone ?? null,
          sale.paymentMethod,
          sale.paymentGroup,
          sale.subtotal,
          sale.discount,
          sale.total,
          sale.received,
          sale.balance,
          sale.totalQuantity,
          JSON.stringify(sale.items),
        ]
      );
      for (const item of sale.items) {
        await pool.query(
          `
            UPDATE products
            SET stock = GREATEST(stock - $2, 0)
            WHERE id = $1
          `,
          [item.productId, item.qty]
        );
      }
      await pool.query(
        `
          INSERT INTO daily_sales (sale_date, quantity)
          VALUES ($1::date, $2)
          ON CONFLICT (sale_date)
          DO UPDATE SET quantity = daily_sales.quantity + EXCLUDED.quantity
        `,
        [todayKey(), sale.totalQuantity]
      );
      return sale;
    },
    async receiveSaleDue(id, amount) {
      const result = await pool.query(
        `
          UPDATE sales
          SET received = LEAST(total, received + $2),
              balance = -GREATEST(total - LEAST(total, received + $2), 0)
          WHERE id = $1
          RETURNING
            id,
            invoice_number,
            created_at,
            created_by_user_id,
            created_by_username,
            customer_name,
            customer_phone,
            payment_method,
            payment_group,
            subtotal,
            discount,
            total,
            received,
            balance,
            total_quantity,
            items
        `,
        [id, amount]
      );
      const row = result.rows[0];
      if (!row) return null;
      return {
        id: row.id,
        invoiceNumber: row.invoice_number,
        createdAt: row.created_at,
        createdByUserId: row.created_by_user_id,
        createdByUsername: row.created_by_username,
        customerName: row.customer_name ?? undefined,
        customerPhone: row.customer_phone ?? undefined,
        paymentMethod: row.payment_method,
        paymentGroup: paymentGroupFor(row.payment_method, row.payment_group),
        subtotal: Number(row.subtotal ?? 0),
        discount: Number(row.discount ?? 0),
        total: Number(row.total ?? 0),
        received: Number(row.received ?? 0),
        balance: Number(row.balance ?? 0),
        totalQuantity: Number(row.total_quantity ?? 0),
        items: Array.isArray(row.items) ? row.items : [],
      };
    },
    async deleteSale(id) {
      const saleResult = await pool.query(
        `
          SELECT id, created_at, total_quantity, items
          FROM sales
          WHERE id = $1
          LIMIT 1
        `,
        [id]
      );
      const sale = saleResult.rows[0];
      if (!sale) return null;
      const items = Array.isArray(sale.items) ? sale.items : [];
      for (const item of items) {
        await pool.query(
          `
            UPDATE products
            SET stock = stock + $2
            WHERE id = $1
          `,
          [item.productId, item.qty]
        );
      }
      await pool.query(
        `
          UPDATE daily_sales
          SET quantity = GREATEST(quantity - $2, 0)
          WHERE sale_date = $1::date
        `,
        [String(sale.created_at).slice(0, 10), Number(sale.total_quantity ?? 0)]
      );
      await pool.query(`DELETE FROM sales WHERE id = $1`, [id]);
      return sale;
    },
    async listUsers() {
      const result = await pool.query(`SELECT id, username, password, role FROM users ORDER BY role DESC, username ASC`);
      return result.rows.map((row) => ({
        id: row.id,
        username: row.username,
        password: row.password,
        role: normalizeRole(row.role),
      }));
    },
    async updateUserCredentials(userId, username, password) {
      const result = await pool.query(
        `
          UPDATE users
          SET username = $2, password = $3
          WHERE id = $1
          RETURNING id, username, password, role
        `,
        [userId, username, password]
      );
      return result.rows[0] ? { ...result.rows[0], role: normalizeRole(result.rows[0].role) } : null;
    },
    async usernameExists(username, excludeUserId) {
      const result = await pool.query(
        `SELECT 1 FROM users WHERE username = $1 AND id <> $2 LIMIT 1`,
        [username, excludeUserId]
      );
      return result.rowCount > 0;
    },
  };
}

const storage = DATABASE_URL ? createPostgresStorage() : createJsonStorage();

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  });
  res.end(JSON.stringify(data));
}

function notFound(res) {
  sendJson(res, 404, { message: 'Not found' });
}

async function serveFile(res, filePath) {
  try {
    const data = await readFile(filePath);
    const type = mimeTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

function getToken(req) {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

async function requireAuth(req, res) {
  const token = getToken(req);
  if (!token) {
    sendJson(res, 401, { message: 'Unauthorized' });
    return null;
  }
  const user = await storage.getUserByToken(token);
  if (!user) {
    sendJson(res, 401, { message: 'Unauthorized' });
    return null;
  }
  return { user, token };
}

function requireRole(authState, res, ...allowedRoles) {
  if (allowedRoles.includes(authState.user.role)) {
    return true;
  }
  sendJson(res, 403, { message: 'Admin access required' });
  return false;
}

const server = createServer(async (req, res) => {
  if (!req.url) return notFound(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const { pathname } = url;

  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, storage: storage.kind });
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await readBody(req);
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '').trim();
    if (!username || !password) {
      return sendJson(res, 400, { message: 'Enter username and password' });
    }
    const user = await storage.authenticateUser(username, password);
    if (!user) {
      return sendJson(res, 401, { message: 'Invalid username or password' });
    }
    const token = randomUUID();
    await storage.upsertSession(token, user.id);
    return sendJson(res, 200, {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  }

  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    return sendJson(res, 200, {
      id: authState.user.id,
      username: authState.user.username,
      role: authState.user.role,
    });
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const token = getToken(req);
    if (token) {
      await storage.deleteSession(token);
    }
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/products' && req.method === 'GET') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    return sendJson(res, 200, await storage.listProducts());
  }

  if (pathname === '/api/products' && req.method === 'POST') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    if (!requireRole(authState, res, 'admin')) return;
    const body = await readBody(req);
    const product = {
      id: String(body.id ?? randomUUID()),
      name: String(body.name ?? '').trim(),
      category: body.category ? String(body.category).trim() : undefined,
      costPrice: Number(body.costPrice ?? 0),
      sellPrice: Number(body.sellPrice ?? 0),
      stock: Number(body.stock ?? 0),
    };
    if (!product.name) {
      return sendJson(res, 400, { message: 'Product name is required' });
    }
    return sendJson(res, 200, await storage.upsertProduct(product));
  }

  if (pathname.startsWith('/api/products/') && req.method === 'DELETE') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    if (!requireRole(authState, res, 'admin')) return;
    const id = pathname.replace('/api/products/', '');
    await storage.deleteProduct(id);
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/purchases' && req.method === 'GET') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    return sendJson(res, 200, await storage.listPurchases());
  }

  if (pathname === '/api/purchases' && req.method === 'POST') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    if (!requireRole(authState, res, 'admin')) return;
    const body = await readBody(req);
    const purchase = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      birdType: String(body.birdType ?? '').trim(),
      quantity: Math.max(0, Number(body.quantity ?? 0) || 0),
      unitCost: Math.max(0, Number(body.unitCost ?? 0) || 0),
      sellPrice: Math.max(0, Number(body.sellPrice ?? 0) || 0),
      totalCost: Math.max(0, Number(body.totalCost ?? 0) || 0),
      supplier: body.supplier ? String(body.supplier).trim() : undefined,
      notes: body.notes ? String(body.notes).trim() : undefined,
    };
    if (!purchase.birdType || purchase.quantity <= 0) {
      return sendJson(res, 400, { message: 'Bird type and quantity are required' });
    }
    return sendJson(res, 200, await storage.createPurchase(purchase));
  }

  if (pathname === '/api/mortalities' && req.method === 'GET') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    return sendJson(res, 200, await storage.listMortalities());
  }

  if (pathname === '/api/mortalities' && req.method === 'POST') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    if (!requireRole(authState, res, 'admin')) return;
    const body = await readBody(req);
    const mortality = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      birdType: String(body.birdType ?? '').trim(),
      quantity: Math.max(0, Number(body.quantity ?? 0) || 0),
      sickQuantity: Math.max(0, Number(body.sickQuantity ?? 0) || 0),
      notes: body.notes ? String(body.notes).trim() : undefined,
    };
    if (!mortality.birdType || (mortality.quantity <= 0 && mortality.sickQuantity <= 0)) {
      return sendJson(res, 400, { message: 'Bird type and at least one death or sick count are required' });
    }
    return sendJson(res, 200, await storage.createMortality(mortality));
  }

  if (pathname === '/api/expenses' && req.method === 'GET') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    return sendJson(res, 200, await storage.listExpenses());
  }

  if (pathname === '/api/expenses' && req.method === 'POST') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    if (!requireRole(authState, res, 'admin')) return;
    const body = await readBody(req);
    const expense = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      category: String(body.category ?? '').trim(),
      amount: Math.max(
        0,
        Number(
          body.category === 'Feed'
            ? (Number(body.feedUsedKg ?? 0) || 0) * (Number(body.feedRatePerKg ?? 0) || 0)
            : body.amount ?? 0
        ) || 0
      ),
      openingFeedKg:
        body.openingFeedKg === undefined || body.openingFeedKg === null || body.openingFeedKg === ''
          ? undefined
          : Math.max(0, Number(body.openingFeedKg) || 0),
      feedRatePerKg: Math.max(0, Number(body.feedRatePerKg ?? 0) || 0),
      feedReceivedKg: Math.max(0, Number(body.feedReceivedKg ?? 0) || 0),
      feedUsedKg: Math.max(0, Number(body.feedUsedKg ?? 0) || 0),
      notes: body.notes ? String(body.notes).trim() : undefined,
    };
    const hasFeedEntry =
      expense.openingFeedKg !== undefined || expense.feedReceivedKg > 0 || expense.feedUsedKg > 0 || expense.feedRatePerKg > 0;
    if (!expense.category || (expense.category !== 'Feed' && expense.amount <= 0)) {
      return sendJson(res, 400, { message: 'Expense category and amount are required' });
    }
    if (expense.category === 'Feed' && !hasFeedEntry) {
      return sendJson(res, 400, { message: 'Enter opening stock, received feed, used feed, or feed rate' });
    }
    return sendJson(res, 200, await storage.createExpense(expense));
  }

  if (pathname === '/api/daily-reports' && req.method === 'GET') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    return sendJson(res, 200, await storage.listDailyReports());
  }

  if (pathname === '/api/costing-reports' && req.method === 'GET') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    return sendJson(res, 200, await storage.listCostingReports());
  }

  if (pathname === '/api/daily-reports' && req.method === 'POST') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    if (!requireRole(authState, res, 'admin')) return;
    const body = await readBody(req);
    const reportDate = String(body.reportDate ?? '').trim();
    if (!reportDate) {
      return sendJson(res, 400, { message: 'Report date is required' });
    }
    const metrics = computeDailyReportMetrics(body);
    const report = {
      id: String(body.id ?? randomUUID()),
      reportDate,
      ...metrics,
    };
    return sendJson(res, 200, await storage.upsertDailyReport(report));
  }

  if (pathname === '/api/daily-target' && req.method === 'GET') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    return sendJson(res, 200, await storage.getDailyTarget());
  }

  if (pathname === '/api/daily-target' && req.method === 'PUT') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    if (!requireRole(authState, res, 'admin')) return;
    const body = await readBody(req);
    return sendJson(res, 200, await storage.setDailyTarget(Math.max(0, Number(body.quantity ?? 0) || 0)));
  }

  if (pathname === '/api/daily-sales/today' && req.method === 'GET') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    return sendJson(res, 200, { quantity: await storage.getTodaySalesQuantity() });
  }

  if (pathname === '/api/daily-sales' && req.method === 'POST') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    const body = await readBody(req);
    const quantity = Math.max(0, Number(body.quantity ?? 0) || 0);
    return sendJson(res, 200, { quantity: await storage.addDailySale(quantity) });
  }

  if (pathname === '/api/sales' && req.method === 'GET') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    return sendJson(res, 200, await storage.listSales());
  }

  if (pathname === '/api/sales' && req.method === 'POST') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    const body = await readBody(req);
    const paymentMethod = String(body.paymentMethod ?? 'Cash');
    const paymentGroup = paymentMethod === 'Cash' ? 'Cash' : 'Bank';
    const customerName = body.customerName ? String(body.customerName).trim() : '';
    const customerPhone = body.customerPhone ? String(body.customerPhone).trim() : '';
    const items = Array.isArray(body.items)
      ? body.items.map((item) => ({
          productId: String(item.productId ?? ''),
          name: String(item.name ?? '').trim(),
          category: item.category ? String(item.category).trim() : undefined,
          qty: Math.max(0, Number(item.qty ?? 0) || 0),
          unitPrice: Math.max(0, Number(item.unitPrice ?? 0) || 0),
          lineTotal: Math.max(0, Number(item.lineTotal ?? 0) || 0),
        }))
      : [];
    if (!items.length) {
      return sendJson(res, 400, { message: 'Add at least one item to create an invoice' });
    }
    const total = Math.max(0, Number(body.total ?? 0) || 0);
    const received = Math.max(0, Number(body.received ?? 0) || 0);
    const dueAmount = Math.max(0, total - received);
    if (dueAmount > 0 && (!customerName || !customerPhone)) {
      return sendJson(res, 400, { message: 'Customer name and phone are required for due sales' });
    }
    const products = await storage.listProducts();
    for (const item of items) {
      const product = products.find((entry) => entry.id === item.productId);
      const availableStock = Number(product?.stock ?? 0);
      if (!product) {
        return sendJson(res, 400, { message: `Product not found for sale item ${item.name}` });
      }
      if (availableStock <= 0) {
        return sendJson(res, 400, { message: `${product.name} is out of stock` });
      }
      if (item.qty > availableStock) {
        return sendJson(res, 400, { message: `${product.name} has only ${availableStock} in stock` });
      }
    }
    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-6)}`;
    const sale = {
      id: randomUUID(),
      invoiceNumber,
      createdAt: new Date().toISOString(),
      createdByUserId: authState.user.id,
      createdByUsername: authState.user.username,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      paymentMethod,
      paymentGroup,
      subtotal: Math.max(0, Number(body.subtotal ?? 0) || 0),
      discount: Math.max(0, Number(body.discount ?? 0) || 0),
      total,
      received,
      balance: Number(body.balance ?? 0) || 0,
      totalQuantity: Math.max(0, Number(body.totalQuantity ?? 0) || 0),
      items,
    };
    const createdSale = await storage.createSale(sale);
    await syncSalesToGoogleSheets(await storage.listSales());
    return sendJson(res, 200, createdSale);
  }

  if (pathname.match(/^\/api\/sales\/[^/]+\/receive-due$/) && req.method === 'PUT') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    const id = pathname.replace('/api/sales/', '').replace('/receive-due', '');
    const body = await readBody(req);
    const amount = Math.max(0, Number(body.amount ?? 0) || 0);
    if (amount <= 0) {
      return sendJson(res, 400, { message: 'Enter due amount received' });
    }
    const updated = await storage.receiveSaleDue(id, amount);
    if (!updated) {
      return sendJson(res, 404, { message: 'Sale not found' });
    }
    await syncSalesToGoogleSheets(await storage.listSales());
    return sendJson(res, 200, updated);
  }

  if (pathname.startsWith('/api/sales/') && req.method === 'DELETE') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    if (!requireRole(authState, res, 'admin')) return;
    const id = pathname.replace('/api/sales/', '');
    const deleted = await storage.deleteSale(id);
    if (!deleted) {
      return sendJson(res, 404, { message: 'Invoice not found' });
    }
    await syncSalesToGoogleSheets(await storage.listSales());
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/settings/auth' && req.method === 'GET') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    if (!requireRole(authState, res, 'admin')) return;
    const users = await storage.listUsers();
    return sendJson(res, 200, {
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        role: user.role,
      })),
    });
  }

  if (pathname === '/api/settings/auth' && req.method === 'PUT') {
    const authState = await requireAuth(req, res);
    if (!authState) return;
    if (!requireRole(authState, res, 'admin')) return;
    const body = await readBody(req);
    const userId = String(body.userId ?? '').trim();
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '').trim();
    if (!userId || !username || !password) {
      return sendJson(res, 400, { message: 'Username and password are required' });
    }
    if (await storage.usernameExists(username, userId)) {
      return sendJson(res, 400, { message: 'Username already exists' });
    }
    const updatedUser = await storage.updateUserCredentials(userId, username, password);
    if (!updatedUser) {
      return sendJson(res, 404, { message: 'User not found' });
    }
    return sendJson(res, 200, {
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
    });
  }

  if (req.method === 'GET') {
    const relativePath = pathname === '/' ? '/index.html' : pathname;
    const safePath = normalize(relativePath)
      .replace(/^(\.\.[/\\])+/, '')
      .replace(/^[/\\]+/, '');
    const filePath = join(DIST_DIR, safePath);
    if (existsSync(filePath)) {
      const served = await serveFile(res, filePath);
      if (served) return;
    }

    const indexPath = join(DIST_DIR, 'index.html');
    if (existsSync(indexPath)) {
      const served = await serveFile(res, indexPath);
      if (served) return;
    }
  }

  return notFound(res);
});

try {
  await storage.init();
  server.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT} using ${storage.kind}`);
  });
} catch (error) {
  console.error('Failed to start backend', error);
  process.exit(1);
}
