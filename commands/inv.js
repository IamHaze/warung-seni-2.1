const db = require("../database/db");

module.exports = {
    name: "inv",
    execute(message) {
        const user = message.author.id;

        db.all("SELECT * FROM inventory WHERE user_id=?", [user], (err, rows) => {
            if (err) return message.reply("❌ DB error");

            if (!rows || rows.length === 0) {
                return message.reply("🎒 Empty inventory");
            }

            let msg = "🎒 Inventory:\n";

            rows.forEach(i => {
                msg += `• ${i.item} x${i.amount || 0} (lvl ${i.level || 1})\n`;
            });

            message.reply(msg);
        });
    }
};
