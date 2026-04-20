const db = require("../database/db");
const getUser = require("../core/getUser");
const getPrestigeBonus = require("../core/prestigeBonus");
const config = require("../config.json");

const cooldowns = new Map();
const COOLDOWN = 60000;

module.exports = {
    name: "work",
    execute(message) {
        const userId = message.author.id;
        const now = Date.now();
        const cd = cooldowns.get(userId) || 0;

        if (now < cd) {
            db.get(`SELECT expires_at FROM buffs WHERE user_id=? AND buff='energy_drink' AND expires_at > ?`, [userId, now], (err, drink) => {
                if (!drink) {
                    const left = Math.ceil((cd - now) / 1000);
                    return message.reply(`⏳ Wait **${left}s** before working again`);
                }
                cooldowns.set(userId, 0);
                doWork();
            });
            return;
        }

        cooldowns.set(userId, now + COOLDOWN);
        doWork();

        function doWork() {
            getUser(userId, (err, user) => {
                if (!user) return message.reply("❌ User error");

                const base = Math.floor(Math.random() * 500) + 100;
                const bonus = getPrestigeBonus(user.prestige, config);
                const earned = Math.floor(base * bonus);

                db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [earned, userId]);
                message.reply(`💼 Keje penat2 dpt la **${earned}**\n🔥 Prestige Bonus: x${bonus.toFixed(2)}`);
            });
        }
    }
};
