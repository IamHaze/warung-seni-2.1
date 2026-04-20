const db = require("../database/db");
const config = require("../config.json");
const getUser = require("../core/getUser");

module.exports = {
    name: "prestige",
    execute(message) {
        const user = message.author.id;
        getUser(user, (err, row) => {
            if (!row) return message.reply("User error");

            const currentPrestige = row.prestige || 0;
            const cost = Math.floor(
                config.prestige.base_cost *
                Math.pow(config.prestige.multiplier, currentPrestige)
            );

            if (row.wallet < cost) {
                return message.reply(`❌ Need ${cost} coins to prestige`);
            }

            const newPrestige = currentPrestige + 1;

            db.serialize(() => {
                db.run(
                    `UPDATE users
                     SET wallet=?, bank=0, prestige=?
                     WHERE user_id=? AND wallet >= ?`,
                    [config.economy.starting_balance, newPrestige, user, cost],
                    (err) => {
                        if (err) {
                            console.error("Prestige UPDATE error:", err);
                            return message.reply("❌ DB error during prestige, try again.");
                        }

                        db.run(
                            `DELETE FROM inventory WHERE user_id=?`,
                            [user],
                            (err2) => {
                                if (err2) {
                                    console.error("Inventory clear error:", err2);
                                    return message.reply("❌ Inventory clear failed, contact admin.");
                                }

                                message.reply(
                                    `🌟 PRESTIGE SUCCESS!\n\n` +
                                    `🏆 Level: ${currentPrestige} → ${newPrestige}\n` +
                                    `💸 Cost: ${cost}\n` +
                                    `💰 Wallet reset to ${config.economy.starting_balance}`
                                );
                            }
                        );
                    }
                );
            });
        });
    }
};
