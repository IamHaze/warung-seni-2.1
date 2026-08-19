const db = require("../database/db");

module.exports = {
    name: "heat",
    execute(message) {
        const user = message.author.id;

        db.get(`SELECT heat FROM users WHERE user_id=?`, [user], (err, row) => {
            if (!row) return message.reply("No data");

            let level = "🟢 Low";
            if (row.heat >= 3) level = "🟡 Medium";
            if (row.heat >= 6) level = "🔴 HIGH";

            message.reply(`🚓 Heat: ${row.heat} (${level})`);
        });
    }
};
