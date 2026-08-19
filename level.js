const db = require("../database/db");
const config = require("../config.json");

function addXP(user, amount) {
    db.get(`SELECT * FROM users WHERE user_id=?`, [user], (err, row) => {
        if (!row) return;

        let xp = row.xp + amount;
        let level = row.level;

        const needed = Math.floor(100 * Math.pow(config.xp.level_multiplier, level));

        if (xp >= needed) {
            xp -= needed;
            level++;

            console.log(`LEVEL UP: ${user} -> ${level}`);
        }

        db.run(`UPDATE users SET xp=?, level=? WHERE user_id=?`,
            [xp, level, user]);
    });
}

module.exports = { addXP };
