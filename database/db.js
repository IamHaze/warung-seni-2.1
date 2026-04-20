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
            level INTEGER DEFAULT 1
        )
    `);

    // INVENTORY
    db.run(`
        CREATE TABLE IF NOT EXISTS inventory (
            user_id TEXT,
            item TEXT,
            amount INTEGER,
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

    // SHADOW CROWN LOG — track last buyer for 24hr rebuy ban
    db.run(`
        CREATE TABLE IF NOT EXISTS shadow_crown_log (
            user_id TEXT PRIMARY KEY,
            used_at INTEGER DEFAULT 0
        )
    `);

    // BUFFS — active item effects per user
    db.run(`
        CREATE TABLE IF NOT EXISTS buffs (
            user_id TEXT,
            buff TEXT,
            expires_at INTEGER DEFAULT 0,
            PRIMARY KEY(user_id, buff)
        )
    `);

});

module.exports = db;
