const db = require("../../database/db");
const isAdmin = require("../../utils/isAdmin");

module.exports = {
    name: "setprestige",
    execute(message, args) {
        if (!isAdmin(message.author.id)) {
            return message.reply("❌ No permission");
        }

        const target = message.mentions.users.first();
        const level = parseInt(args[1]);

        if (!target) return message.reply("❌ Mention a user");
        if (isNaN(level) || level < 0) return message.reply("❌ Invalid level");

        db.run(
            "UPDATE users SET prestige = ? WHERE user_id=?",
            [level, target.id],
            (err) => {
                if (err) return message.reply("❌ DB error");
                message.reply(`🌟 Set **${target.username}**'s prestige to **${level}**`);
            }
        );
    }
};
