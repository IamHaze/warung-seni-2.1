const db = require("../database/db");

// Self-contained table creation — safe to require multiple times
db.run(`
    CREATE TABLE IF NOT EXISTS activity_log (
        user_id          TEXT PRIMARY KEY,
        username         TEXT,
        message_count    INTEGER DEFAULT 0,
        first_seen       INTEGER,
        last_message_at  INTEGER
    )
`);

function recordActivity(userId, username) {
    const now = Date.now();
    db.run(
        `INSERT INTO activity_log (user_id, username, message_count, first_seen, last_message_at)
         VALUES (?, ?, 1, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
            username = ?,
            message_count = message_count + 1,
            last_message_at = ?`,
        [userId, username, now, now, username, now]
    );
}

module.exports = { recordActivity };
