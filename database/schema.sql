CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    wallet INTEGER DEFAULT 500,
    bank INTEGER DEFAULT 0,
    last_daily INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS market (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    item TEXT,
    price INTEGER
);

CREATE TABLE IF NOT EXISTS skills (
    user_id TEXT,
    skill TEXT,
    xp INTEGER,
    PRIMARY KEY(user_id, skill)
);
