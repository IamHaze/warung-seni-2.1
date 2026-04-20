const db = require("./database/db");
const getUser = require("./core/getUser");

module.exports = {
    name: "bal",
    execute(message) {

        const user = message.author.id;

        getUser(user, () => {

            db.get(
                `SELECT wallet, bank, prestige FROM users WHERE user_id=?`,
                [user],
                (err, row) => {

                    message.reply(
                        `💰 Wallet: ${row.wallet}\n` +
                        `🏦 Bank: ${row.bank}\n` +
                        `🌟 Prestige: ${row.prestige || 0}`
                    );

                }
            );

        });
    }
};
