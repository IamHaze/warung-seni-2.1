-- ============================
-- FULL SCHEMA (reference only)
-- ============================
-- db.js handles creation with CREATE TABLE IF NOT EXISTS
-- and safe column additions via ALTER TABLE + PRAGMA check.
-- Existing data is NEVER dropped.

-- USERS
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
    pending_income INTEGER DEFAULT 0,
    collect_day INTEGER DEFAULT 0,
    collect_day_total INTEGER DEFAULT 0,
    fish_streak INTEGER DEFAULT 0
);

-- INVENTORY
CREATE TABLE IF NOT EXISTS inventory (
    user_id TEXT,
    item TEXT,
    amount INTEGER,
    level INTEGER DEFAULT 1,
    PRIMARY KEY(user_id, item)
);

-- MARKET (AI SYSTEM)
CREATE TABLE IF NOT EXISTS market (
    item TEXT PRIMARY KEY,
    price INTEGER,
    demand REAL DEFAULT 1.0,
    supply REAL DEFAULT 1.0
);

-- SHADOW CROWN LOG
CREATE TABLE IF NOT EXISTS shadow_crown_log (
    user_id TEXT PRIMARY KEY,
    used_at INTEGER DEFAULT 0
);

-- BUFFS (active item effects)
CREATE TABLE IF NOT EXISTS buffs (
    user_id TEXT,
    buff TEXT,
    expires_at INTEGER DEFAULT 0,
    PRIMARY KEY(user_id, buff)
);

-- SKILLS
CREATE TABLE IF NOT EXISTS skills (
    user_id TEXT,
    skill TEXT,
    xp INTEGER,
    PRIMARY KEY(user_id, skill)
);

-- FISHING LOG
CREATE TABLE IF NOT EXISTS fishing_log (
    user_id TEXT,
    fish TEXT,
    count INTEGER DEFAULT 0,
    total_value INTEGER DEFAULT 0,
    PRIMARY KEY(user_id, fish)
);

-- DUEL LOG
CREATE TABLE IF NOT EXISTS duel_log (
    user_id TEXT PRIMARY KEY,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    total_won INTEGER DEFAULT 0,
    total_lost INTEGER DEFAULT 0
);

-- AI ROB LOG
CREATE TABLE IF NOT EXISTS ai_rob_log (
    user_id TEXT PRIMARY KEY,
    amount INTEGER DEFAULT 0,
    time INTEGER DEFAULT 0
);

-- PETS
CREATE TABLE IF NOT EXISTS pets (
    user_id TEXT PRIMARY KEY,
    pet_name TEXT,
    pet_type TEXT,
    hunger INTEGER DEFAULT 0,
    happiness INTEGER DEFAULT 100,
    last_fed INTEGER DEFAULT 0,
    last_played INTEGER DEFAULT 0,
    last_action INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT 0
);

-- PET NEGLECT LOG
CREATE TABLE IF NOT EXISTS pet_neglect_log (
    user_id TEXT PRIMARY KEY,
    ran_away_at INTEGER DEFAULT 0
);
