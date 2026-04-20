const db = require("../../database/db");
const isAdmin = require("../../core/isAdmin");
const getUser = require("../../core/getUser");

module.exports = {
    name: "give",
    execute(message, args) {

        if (!isAdmin(message)) {
            return message.reply("❌ Admin only");
        }

        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!target || isNaN(amount)) {
            return message.reply("Usage: wgive @user amount");
        }

        getUser(target.id, () => {
            db.run(
                "UPDATE users SET wallet = wallet + ? WHERE user_id=?",
                [amount, target.id]
            );

            message.reply(`💸 Admin gave ${amount} to ${target.username}`);
        });
    }
};
