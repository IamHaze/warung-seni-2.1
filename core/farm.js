const db = require("../database/db");
const config = require("../config.json");
const { addXP } = require("./level");

function startFarm() {
    setInterval(() => {
        db.all(`SELECT * FROM inventory`, [], (err, rows) => {
            if (!rows) return;

            const users = {};

            rows.forEach(r => {
                if (!users[r.user_id]) users[r.user_id] = 0;

                const item = config.items[r.item];
                if (item && item.income) {
                    users[r.user_id] += item.income * r.amount;
                }
            });

            for (const user in users) {
                db.get(`SELECT level FROM users WHERE user_id=?`, [user], (err, row) => {
                    if (!row) return;

                    const bonus = 1 + (row.level * config.farm.level_bonus);
                    const total = Math.floor(users[user] * bonus);

                    db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`,
                        [total, user]);

                    addXP(user, config.xp.farm);
                });
            }

            console.log("💰 GOD FARM tick");
        });
    }, config.farm.tick_interval);
}

module.exports = { startFarm };
