const db = require("../database/db");

module.exports = {
    name: "rank",
    execute(message) {
        const user = message.author.id;

        db.all(`SELECT user_id, wallet FROM users ORDER BY wallet DESC`, [], (err, rows) => {
            const index = rows.findIndex(u => u.user_id === user);

            if (index === -1) return message.reply("Not ranked");

            message.reply(`🏅 Your rank: #${index + 1}`);
        });
    }
};
