const db       = require("../database/db");
const getUser  = require("../core/getUser");
const { claimDrop, getActiveDrop, fmt } = require("../core/dropEvents");

module.exports = {
    name: "claim",
    execute(message) {
        const user = message.author.id;

        // Show status if no drop is active
        const active = getActiveDrop();
        if (!active) {
            return message.reply(
                `📭 **Takde drop sekarang.**\n` +
                `💡 Drops spawn randomly — up to **32 times per day**!\n` +
                `🔔 Watch the drop channel to be the first to claim!`
            );
        }

        claimDrop(user, (err, claimed) => {
            if (err)      return message.reply("❌ DB error");
            if (!claimed) return message.reply(
                `📭 **Too slow!** Someone else just claimed it.\n` +
                `👀 Stay alert for the next drop!`
            );

            getUser(user, (err, row) => {
                if (err || !row) return message.reply("❌ User error");

                db.run(
                    `UPDATE users SET wallet = wallet + ? WHERE user_id=?`,
                    [claimed.amount, user],
                    (err) => {
                        if (err) return message.reply("❌ DB error");

                        message.reply(
                            `🎉 **${message.author.username}** snagged the drop!\n\n` +
                            `💰 **+${fmt(claimed.amount)}** added to wallet! 🤑\n` +
                            `📊 Use \`wbal\` to check your balance.`
                        );
                    }
                );
            });
        });
    }
};
