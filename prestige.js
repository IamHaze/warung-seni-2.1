const db = require("../database/db");

module.exports = {
    execute(message) {
        const userId = message.author.id;

        db.get("SELECT * FROM users WHERE user_id=?", [userId], (err, user) => {
            if (!user) return message.reply("No account");

            const total = user.wallet + user.bank;

            if (total < 100000) {
                return message.reply("Need 100k to prestige");
            }

            const newPrestige = (user.prestige || 0) + 1;

            db.run(
                "UPDATE users SET wallet=500, bank=0, prestige=? WHERE user_id=?",
                [newPrestige, userId]
            );

            db.run("DELETE FROM inventory WHERE user_id=?", [userId]);

            message.reply(`🌟 Prestige ${newPrestige} | Boost x${1 + newPrestige * 0.5}`);
        });
    }
};
