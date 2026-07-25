'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SITE_URL = (process.env.SITE_URL || 'https://shaylalucky.com').replace(/\/+$/, '');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'leads.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'new',
  intent TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  timeline TEXT,
  area TEXT,
  budget TEXT,
  property_address TEXT,
  message TEXT,
  source_page TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  ip_hash TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
`);

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

const leadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests. Please try again shortly.' }
});
app.use('/api/leads', leadLimiter);

function clean(v, max = 500) { return String(v ?? '').trim().replace(/\u0000/g, '').slice(0, max); }
function validEmail(v) { return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function validPhone(v) { return !v || /^[0-9+().\-\s]{7,30}$/.test(v); }
function hashIp(ip) { return crypto.createHash('sha256').update(String(ip || '')).digest('hex'); }

app.post('/api/leads', (req, res) => {
  if (clean(req.body.website, 100)) return res.status(200).json({ ok: true });

  const lead = {
    intent: clean(req.body.intent, 40), name: clean(req.body.name, 120),
    email: clean(req.body.email, 160), phone: clean(req.body.phone, 30),
    timeline: clean(req.body.timeline, 80), area: clean(req.body.area, 120),
    budget: clean(req.body.budget, 120), property_address: clean(req.body.property_address, 180),
    message: clean(req.body.message, 1200), source_page: clean(req.body.source_page, 160),
    utm_source: clean(req.body.utm_source, 100), utm_medium: clean(req.body.utm_medium, 100),
    utm_campaign: clean(req.body.utm_campaign, 120), referrer: clean(req.body.referrer, 300),
    ip_hash: hashIp(req.ip), user_agent: clean(req.get('user-agent'), 400)
  };

  if (!lead.intent || !lead.name) return res.status(400).json({ ok:false, error:'Please include your name and what you need help with.' });
  if (!lead.email && !lead.phone) return res.status(400).json({ ok:false, error:'Please provide either an email address or phone number so Shayla can respond.' });
  if (!validEmail(lead.email)) return res.status(400).json({ ok:false, error:'Please enter a valid email address.' });
  if (!validPhone(lead.phone)) return res.status(400).json({ ok:false, error:'Please enter a valid phone number.' });

  const stmt = db.prepare(`INSERT INTO leads
    (intent,name,email,phone,timeline,area,budget,property_address,message,source_page,utm_source,utm_medium,utm_campaign,referrer,ip_hash,user_agent)
    VALUES (@intent,@name,@email,@phone,@timeline,@area,@budget,@property_address,@message,@source_page,@utm_source,@utm_medium,@utm_campaign,@referrer,@ip_hash,@user_agent)`);
  const info = stmt.run(lead);
  res.status(201).json({ ok:true, id:info.lastInsertRowid });
});

function unauthorized(res) {
  res.set('WWW-Authenticate', 'Basic realm="Shayla Lucky Admin", charset="UTF-8"');
  return res.status(401).send('Authentication required.');
}
function adminAuth(req, res, next) {
  if (!ADMIN_PASSWORD) return res.status(503).send('Set ADMIN_PASSWORD before using the admin dashboard.');
  const header = req.get('authorization') || '';
  if (!header.startsWith('Basic ')) return unauthorized(res);
  let decoded = '';
  try { decoded = Buffer.from(header.slice(6), 'base64').toString('utf8'); } catch { return unauthorized(res); }
  const i = decoded.indexOf(':');
  if (i < 0) return unauthorized(res);
  const user = decoded.slice(0, i), pass = decoded.slice(i + 1);
  const userOk = user === ADMIN_USER;
  const passOk = pass.length === ADMIN_PASSWORD.length && crypto.timingSafeEqual(Buffer.from(pass), Buffer.from(ADMIN_PASSWORD));
  if (!userOk || !passOk) return unauthorized(res);
  next();
}

app.get('/api/admin/leads', adminAuth, (req, res) => {
  const status = clean(req.query.status, 20);
  const rows = status ? db.prepare('SELECT * FROM leads WHERE status=? ORDER BY id DESC LIMIT 500').all(status)
                      : db.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 500').all();
  res.json({ ok:true, leads:rows });
});
app.patch('/api/admin/leads/:id', adminAuth, (req, res) => {
  const id = Number(req.params.id), status = clean(req.body.status, 20);
  const allowed = new Set(['new','contacted','qualified','won','lost']);
  if (!Number.isInteger(id) || !allowed.has(status)) return res.status(400).json({ok:false,error:'Invalid lead or status.'});
  db.prepare('UPDATE leads SET status=? WHERE id=?').run(status, id);
  res.json({ok:true});
});
app.get('/api/admin/export.csv', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM leads ORDER BY id DESC').all();
  const headers = ['id','created_at','status','intent','name','email','phone','timeline','area','budget','property_address','message','source_page','utm_source','utm_medium','utm_campaign'];
  const esc = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
  res.type('text/csv').set('Content-Disposition','attachment; filename="shayla-lucky-leads.csv"').send(csv);
});

app.get('/sitemap.xml', (req, res) => {
  const pages = ['', 'buy', 'sell', 'invest', 'metro-detroit-real-estate', 'detroit-investment-property', 'birmingham-mi-real-estate', 'about'];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(p=>`<url><loc>${SITE_URL}/${p}</loc></url>`).join('')}</urlset>`);
});
app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${SITE_URL}/sitemap.xml\n`));
app.get('/assets/shayla-lucky.jpg', (req, res) => res.type('image/svg+xml').sendFile(path.join(__dirname,'public','assets','shayla-lucky.svg')));

app.use(express.static(path.join(__dirname,'public'), { extensions:['html'], etag:true }));
app.get('/admin', adminAuth, (req,res) => res.sendFile(path.join(__dirname,'public','admin.html')));
app.use((req,res) => res.status(404).sendFile(path.join(__dirname,'public','404.html')));
app.use((err,req,res,next) => { console.error(err); res.status(500).json({ok:false,error:'Unexpected server error.'}); });
app.listen(PORT, () => console.log(`Shayla Lucky site running on http://localhost:${PORT}`));
