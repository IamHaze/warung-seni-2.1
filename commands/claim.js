const db = require("../database/db");
const getUser = require("../core/getUser");
const { claimDrop } = require("../core/events");

module.exports = {
    name: "claim",
    execute(message) {
        const user = message.author.id;

        const claimed = claimDrop(user);

        if (!claimed) {
            return message.reply("📭 Keje mintak duit kerajaan je.");
        }

        getUser(user, (err, row) => {
            if (err || !row) {
                return message.reply("❌ User error");
            }

            db.run(
                `UPDATE users SET wallet = wallet + ? WHERE user_id=?`,
                [claimed.amount, user],
                (err) => {
                    if (err) return message.reply("❌ DB error");
                    message.reply(
                        `🎉 **${message.author.username}** snagged the drop!\n` +
                        `💰 +**${claimed.amount}** coins added to wallet!`
                    );
                }
            );
        });
    }
};
