const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database/database.db");

db.serialize(() => {

    // USERS
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            user_id           TEXT PRIMARY KEY,
            wallet            INTEGER DEFAULT 500,
            bank              INTEGER DEFAULT 0,
            xp                INTEGER DEFAULT 0,
            level             INTEGER DEFAULT 1,
            heat              INTEGER DEFAULT 0,
            prestige          INTEGER DEFAULT 0,
            last_daily        INTEGER DEFAULT 0,
            last_rob          INTEGER DEFAULT 0,
            pending_income    INTEGER DEFAULT 0,
            collect_day       INTEGER DEFAULT 0,
            collect_day_total INTEGER DEFAULT 0,
            fish_streak       INTEGER DEFAULT 0
        )
    `);

    // INVENTORY
    db.run(`
        CREATE TABLE IF NOT EXISTS inventory (
            user_id TEXT,
            item    TEXT,
            amount  INTEGER,
            level   INTEGER DEFAULT 1,
            PRIMARY KEY(user_id, item)
        )
    `);

    // MARKET
    db.run(`
        CREATE TABLE IF NOT EXISTS market (
            item   TEXT PRIMARY KEY,
            price  INTEGER,
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
            user_id    TEXT,
            buff       TEXT,
            expires_at INTEGER DEFAULT 0,
            PRIMARY KEY(user_id, buff)
        )
    `);

    // SKILLS
    db.run(`
        CREATE TABLE IF NOT EXISTS skills (
            user_id TEXT,
            skill   TEXT,
            xp      INTEGER,
            PRIMARY KEY(user_id, skill)
        )
    `);

    // FISHING LOG
    db.run(`
        CREATE TABLE IF NOT EXISTS fishing_log (
            user_id     TEXT,
            fish        TEXT,
            count       INTEGER DEFAULT 0,
            total_value INTEGER DEFAULT 0,
            PRIMARY KEY(user_id, fish)
        )
    `);

    // DUEL LOG
    db.run(`
        CREATE TABLE IF NOT EXISTS duel_log (
            user_id    TEXT PRIMARY KEY,
            wins       INTEGER DEFAULT 0,
            losses     INTEGER DEFAULT 0,
            total_won  INTEGER DEFAULT 0,
            total_lost INTEGER DEFAULT 0
        )
    `);

    // AI ROB LOG
    db.run(`
        CREATE TABLE IF NOT EXISTS ai_rob_log (
            user_id TEXT PRIMARY KEY,
            amount  INTEGER DEFAULT 0,
            time    INTEGER DEFAULT 0
        )
    `);

    // PETS
    db.run(`
        CREATE TABLE IF NOT EXISTS pets (
            user_id     TEXT PRIMARY KEY,
            pet_name    TEXT,
            pet_type    TEXT,
            hunger      INTEGER DEFAULT 0,
            happiness   INTEGER DEFAULT 100,
            last_fed    INTEGER DEFAULT 0,
            last_played INTEGER DEFAULT 0,
            last_action INTEGER DEFAULT 0,
            created_at  INTEGER DEFAULT 0
        )
    `);

    // PET NEGLECT LOG
    db.run(`
        CREATE TABLE IF NOT EXISTS pet_neglect_log (
            user_id     TEXT PRIMARY KEY,
            ran_away_at INTEGER DEFAULT 0
        )
    `);

    // FARM PLOTS
    db.run(`
        CREATE TABLE IF NOT EXISTS farm_plots (
            user_id     TEXT,
            plot_number INTEGER,
            seed_type   TEXT,
            planted_at  INTEGER DEFAULT 0,
            watered_at  INTEGER DEFAULT 0,
            fertilized  INTEGER DEFAULT 0,
            PRIMARY KEY(user_id, plot_number)
        )
    `);

    // DROP EVENTS (wclaim drops — 10B-600B, max 32/day)
    db.run(`
        CREATE TABLE IF NOT EXISTS drop_events (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            amount      INTEGER NOT NULL,
            spawned_at  INTEGER NOT NULL,
            claimed_by  TEXT    DEFAULT NULL,
            claimed_at  INTEGER DEFAULT NULL,
            day_key     TEXT    NOT NULL
        )
    `);

    // ── SAFE COLUMN ADDITIONS (won't fail if column already exists) ──
    const userColumns = [
        ["heat",              "INTEGER DEFAULT 0"],
        ["prestige",          "INTEGER DEFAULT 0"],
        ["last_rob",          "INTEGER DEFAULT 0"],
        ["pending_income",    "INTEGER DEFAULT 0"],
        ["xp",                "INTEGER DEFAULT 0"],
        ["level",             "INTEGER DEFAULT 1"],
        ["collect_day",       "INTEGER DEFAULT 0"],
        ["collect_day_total", "INTEGER DEFAULT 0"],
        ["fish_streak",       "INTEGER DEFAULT 0"],
        ["last_heist",        "INTEGER DEFAULT 0"],
        ["streak",            "INTEGER DEFAULT 0"],
        ["last_claim",        "INTEGER DEFAULT 0"],
        ["last_event",        "TEXT DEFAULT ''"]
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

    addMissingColumns("users",     userColumns);
    addMissingColumns("inventory", inventoryColumns);
});

module.exports = db;
