const db = require("../database/db");
const getUser = require("../core/getUser");

const cooldowns = new Map();
const COOLDOWN = 120000;

module.exports = {
    name: "crime",
    execute(message) {
        const user = message.author.id;
        const now = Date.now();
        const cd = cooldowns.get(user) || 0;

        if (now < cd) {
            db.get(`SELECT expires_at FROM buffs WHERE user_id=? AND buff='energy_drink' AND expires_at > ?`, [user, now], (err, drink) => {
                if (!drink) {
                    const left = Math.ceil((cd - now) / 1000);
                    return message.reply(`⏳ Tggu jap **${left}s** sabo sikit lpas tu buat lg`);
                }
                cooldowns.set(user, 0);
                doCrime();
            });
            return;
        }

        cooldowns.set(user, now + COOLDOWN);
        doCrime();

        function doCrime() {
            getUser(user, (err, row) => {
                if (!row) return message.reply("❌ User error");

                const success = Math.random() < 0.5;

                if (!success) {
                    const loss = Math.floor(Math.random() * 200) + 50;
                    db.run(`UPDATE users SET wallet = wallet - ?, heat = heat + 1 WHERE user_id=?`, [loss, user]);
                    return message.reply(`🚓 **Crime failed!** Hahaha Rugi **${loss.toLocaleString()}** | 🔥 Heat +1`);
                }

                const gain = Math.floor(Math.random() * 500) + 200;
                db.run(`UPDATE users SET wallet = wallet + ?, heat = heat + 1 WHERE user_id=?`, [gain, user]);
                message.reply(`💰 **Crime success!** Tahniah **${gain.toLocaleString()}** | 🔥 Heat +1`);
            });
        }
    }
};
