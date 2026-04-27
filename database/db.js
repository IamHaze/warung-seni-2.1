const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database/database.db");

db.serialize(() => {

    // USERS
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            wallet INTEGER DEFAULT 500,
            bank INTEGER DEFAULT 0,
            xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            heat INTEGER DEFAULT 0,
            prestige INTEGER DEFAULT 0,
            last_daily INTEGER DEFAULT 0,
            last_rob INTEGER DEFAULT 0,
            pending_income INTEGER DEFAULT 0
        )
    `);

    // INVENTORY
    db.run(`
        CREATE TABLE IF NOT EXISTS inventory (
            user_id TEXT,
            item TEXT,
            amount INTEGER,
            level INTEGER DEFAULT 1,
            PRIMARY KEY(user_id, item)
        )
    `);

    // MARKET (AI SYSTEM)
    db.run(`
        CREATE TABLE IF NOT EXISTS market (
            item TEXT PRIMARY KEY,
            price INTEGER,
            demand REAL DEFAULT 1.0,
            supply REAL DEFAULT 1.0
        )
    `);

    // SHADOW CROWN LOG
    db.run(`
        CREATE TABLE IF NOT EXISTS shadow_crown_log (
            user_id TEXT PRIMARY KEY,
            used_at INTEGER DEFAULT 0
        )
    `);

    // BUFFS
    db.run(`
        CREATE TABLE IF NOT EXISTS buffs (
            user_id TEXT,
            buff TEXT,
            expires_at INTEGER DEFAULT 0,
            PRIMARY KEY(user_id, buff)
        )
    `);

    // SKILLS
    db.run(`
        CREATE TABLE IF NOT EXISTS skills (
            user_id TEXT,
            skill TEXT,
            xp INTEGER,
            PRIMARY KEY(user_id, skill)
        )
    `);

    // FISHING LOG
    db.run(`
        CREATE TABLE IF NOT EXISTS fishing_log (
            user_id TEXT,
            fish TEXT,
            count INTEGER DEFAULT 0,
            total_value INTEGER DEFAULT 0,
            PRIMARY KEY(user_id, fish)
        )
    `);

    // DUEL LOG
    db.run(`
        CREATE TABLE IF NOT EXISTS duel_log (
            user_id TEXT PRIMARY KEY,
            wins INTEGER DEFAULT 0,
            losses INTEGER DEFAULT 0,
            total_won INTEGER DEFAULT 0,
            total_lost INTEGER DEFAULT 0
        )
    `);

    // AI ROB LOG
    db.run(`
        CREATE TABLE IF NOT EXISTS ai_rob_log (
            user_id TEXT PRIMARY KEY,
            amount INTEGER DEFAULT 0,
            time INTEGER DEFAULT 0
        )
    `);

    // ── SAFE COLUMN ADDITIONS (no data loss) ──
    // SQLite doesn't support IF NOT EXISTS on ALTER TABLE,
    // so we check information_schema first.

    const userColumns = [
        ["heat", "INTEGER DEFAULT 0"],
        ["prestige", "INTEGER DEFAULT 0"],
        ["last_rob", "INTEGER DEFAULT 0"],
        ["pending_income", "INTEGER DEFAULT 0"],
        ["xp", "INTEGER DEFAULT 0"],
        ["level", "INTEGER DEFAULT 1"]
    ];

    const inventoryColumns = [
        ["level", "INTEGER DEFAULT 1"]
    ];

    function addMissingColumns(table, columns) {
        columns.forEach(([col, type]) => {
            db.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
                if (err) return;
                const existing = (rows || []).map(r => r.name);
                if (!existing.includes(col)) {
                    db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`, (err) => {
                        if (!err) console.log(`✅ Added column ${table}.${col}`);
                    });
                }
            });
        });
    }

    addMissingColumns("users", userColumns);
    addMissingColumns("inventory", inventoryColumns);
});

module.exports = db;
