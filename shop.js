const db = require("../database/db");

module.exports = {
    execute(message) {
        db.all("SELECT * FROM market", [], (err, rows) => {
            let msg = "🛒 **Shop**\n\n";
            rows.forEach(i => msg += `• ${i.item} — 💰 ${i.price}\n`);
            message.reply(msg);
        });
    }
};
