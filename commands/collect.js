const db = require("../database/db");

module.exports = {
    name: "collect",
    execute(message) {
        const user = message.author.id;

        db.get(`SELECT pending_income FROM users WHERE user_id=?`, [user], (err, row) => {
            if (err || !row) return message.reply("❌ User error");

            const pending = row.pending_income || 0;
            if (pending <= 0) {
                return message.reply("📭 No pending income! Items generate income every minute.");
            }

            db.run(
                `UPDATE users SET wallet = wallet + ?, pending_income = 0 WHERE user_id=?`,
                [pending, user],
                (err) => {
                    if (err) return message.reply("❌ DB error");
                    message.reply(
                        `✅ **Income Collected!**\n\n` +
                        `💰 **+${pending}** coins added to wallet`
                    );
                }
            );
        });
    }
};
