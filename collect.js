const db = require("../database/db");

module.exports = {
    execute(message) {
        const userId = message.author.id;

        db.get(
            "SELECT pending_income, last_collect FROM users WHERE user_id=?",
            [userId],
            (err, user) => {

                const now = Date.now();
                const cooldown = 30000; // 30 sec

                if (now - user.last_collect < cooldown) {
                    return message.reply("⏳ Sabo Dividen x masuk lg");
                }

                const amount = user.pending_income || 0;

                if (amount <= 0) {
                    return message.reply("Nothing to collect");
                }

                db.run(
                    "UPDATE users SET wallet = wallet + ?, pending_income = 0, last_collect=? WHERE user_id=?",
                    [amount, now, userId]
                );

                message.reply(`💰 Dpt la dividen: ${amount}`);
            }
        );
    }
};
