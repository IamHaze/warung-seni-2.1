// ⚠️ This file is deprecated — use commands/pbuy.js instead
// Left here to avoid import errors if anything references it
module.exports = {};
const db = require("../database/db");

module.exports = {
    execute(message, args) {
        const userId = message.author.id;
        const item = args[0];

        const shop = {
            gold_printer: 1,
            ai_factory: 2,
            dark_lab: 3
        };

        if (!shop[item]) return message.reply("Invalid item");

        db.get("SELECT prestige FROM users WHERE user_id=?", [userId], (err, user) => {

            if ((user.prestige || 0) < shop[item]) {
                return message.reply("Not enough prestige");
            }

            db.run(
                "INSERT INTO inventory (user_id,item,amount,level) VALUES (?,?,1,1)",
                [userId, item]
            );

            message.reply(`🌟 Bought ${item}`);
        });
    }
};
