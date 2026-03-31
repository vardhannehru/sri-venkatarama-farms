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
      return [...(db.sales ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
        CREATE TABLE IF NOT EXISTS sales (
          id TEXT PRIMARY KEY,
          invoice_number TEXT NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL,
          created_by_user_id TEXT NOT NULL REFERENCES users(id),
          created_by_username TEXT NOT NULL,
          payment_method TEXT NOT NULL,
          subtotal NUMERIC NOT NULL DEFAULT 0,
          discount NUMERIC NOT NULL DEFAULT 0,
          total NUMERIC NOT NULL DEFAULT 0,
          received NUMERIC NOT NULL DEFAULT 0,
          balance NUMERIC NOT NULL DEFAULT 0,
          total_quantity INTEGER NOT NULL DEFAULT 0,
          items JSONB NOT NULL DEFAULT '[]'::jsonb
        );
      `);

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
            payment_method,
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
        paymentMethod: row.payment_method,
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
            payment_method,
            subtotal,
            discount,
            total,
            received,
            balance,
            total_quantity,
            items
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
        `,
        [
          sale.id,
          sale.invoiceNumber,
          sale.createdAt,
          sale.createdByUserId,
          sale.createdByUsername,
          sale.paymentMethod,
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
    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-6)}`;
    const sale = {
      id: randomUUID(),
      invoiceNumber,
      createdAt: new Date().toISOString(),
      createdByUserId: authState.user.id,
      createdByUsername: authState.user.username,
      paymentMethod: String(body.paymentMethod ?? 'Cash'),
      subtotal: Math.max(0, Number(body.subtotal ?? 0) || 0),
      discount: Math.max(0, Number(body.discount ?? 0) || 0),
      total: Math.max(0, Number(body.total ?? 0) || 0),
      received: Math.max(0, Number(body.received ?? 0) || 0),
      balance: Number(body.balance ?? 0) || 0,
      totalQuantity: Math.max(0, Number(body.totalQuantity ?? 0) || 0),
      items,
    };
    return sendJson(res, 200, await storage.createSale(sale));
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
