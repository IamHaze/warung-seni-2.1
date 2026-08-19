const db = require("../../database/db");
const isAdmin = require("../../utils/isAdmin");

module.exports = {
    name: "reset",
    execute(message, args) {
        if (!isAdmin(message.author.id)) {
            return message.reply("❌ No permission");
        }

        const target = message.mentions.users.first();
        if (!target) return message.reply("❌ Mention a user");

        db.run(
            "UPDATE users SET wallet=500, bank=0, prestige=0 WHERE user_id=?",
            [target.id],
            (err) => {
                if (err) return message.reply("❌ DB error on reset");
                db.run("DELETE FROM inventory WHERE user_id=?", [target.id], (err2) => {
                    if (err2) return message.reply("❌ DB error clearing inventory");
                    message.reply(`🔄 Reset **${target.username}** successfully`);
                });
            }
        );
    }
};
