const db = require("../../database/db");
const isAdmin = require("../../utils/isAdmin");

module.exports = {
    name: "setmoney",
    execute(message, args) {
        if (!isAdmin(message.author.id)) {
            return message.reply("❌ No permission");
        }

        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!target) return message.reply("❌ Mention a user");
        if (isNaN(amount)) return message.reply("❌ Invalid amount");

        db.run(
            "UPDATE users SET wallet = ? WHERE user_id=?",
            [amount, target.id],
            (err) => {
                if (err) return message.reply("❌ DB error");
                message.reply(`💰 Set **${target.username}**'s wallet to **${amount}**`);
            }
        );
    }
};
