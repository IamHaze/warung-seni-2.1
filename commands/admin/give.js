const db = require("../../database/db");
const isAdmin = require("../../utils/isAdmin");

module.exports = {
    name: "give",
    execute(message, args) {
        if (!isAdmin(message.author.id)) {
            return message.reply("❌ No permission");
        }

        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!target) return message.reply("❌ Mention a user");
        if (!amount || amount <= 0) return message.reply("❌ Invalid amount");

        db.run(
            "UPDATE users SET wallet = wallet + ? WHERE user_id=?",
            [amount, target.id],
            (err) => {
                if (err) return message.reply("❌ DB error");
                message.reply(`💸 Gave **${amount}** coins to <@${target.id}>`);
            }
        );
    }
};
