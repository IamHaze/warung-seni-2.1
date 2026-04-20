const db = require("../database/db");

module.exports = {
    execute(message) {
        const user = message.author.id;

        db.all(`SELECT * FROM inventory WHERE user_id=?`, [user], (err, rows) => {
            if (!rows.length) return message.reply("Empty inventory");

            let text = "🎒 Inventory:\n";

            rows.forEach(i => {
                text += `${i.item} x${i.amount} (lvl ${i.level || 1})\n`;
            });

            message.reply(text);
        });
    }
};
