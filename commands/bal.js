const getUser = require("../core/getUser");

module.exports = {
    name: "bal",
    execute(message) {
        const user = message.author.id;

        getUser(user, (err, row) => {
            if (!row) return message.reply("❌ Error loading user");

            message.reply(
                `💰 Wallet: ${row.wallet} | 🏦 Bank: ${row.bank}\n🌟 Prestige: ${row.prestige}`
            );
        });
    }
};
