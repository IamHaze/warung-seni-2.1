const db = require("../database/db");
const getUser = require("../core/getUser");
const config = require("../config.json");

module.exports = {
    name: "upgrade",
    execute(message, args) {
        const userId = message.author.id;
        const item = args[0];
        const amount = Math.max(1, parseInt(args[1]) || 1);

        if (!item) return message.reply("❌ Usage: `wupgrade <item> [times]`");

        getUser(userId, (err, user) => {
            if (err || !user) return message.reply("❌ User error");

            db.get(
                `SELECT * FROM inventory WHERE user_id=? AND item=?`,
                [userId, item],
                (err, inv) => {
                    if (!inv) return message.reply("❌ You don't own this item.");

                    let level = inv.level || 1;
                    let wallet = user.wallet;

                    // 💰 Preview total cost so user knows upfront
                    let previewCost = 0;
                    let tempLevel = level;
                    for (let i = 0; i < amount; i++) {
                        if (tempLevel >= 15) break;
                        const discount = 1 - (user.prestige * 0.01);
                        previewCost += Math.floor(tempLevel * 1000 * discount);
                        tempLevel++;
                    }

                    if (wallet < Math.floor(tempLevel * 1000 * (1 - user.prestige * 0.01)) && wallet < previewCost) {
                        // Still attempt — loop will handle partial upgrades
                    }

                    let successCount = 0;
                    let failCount = 0;
                    let totalCost = 0;
                    let downgrades = 0;

                    for (let i = 0; i < amount; i++) {
                        if (level >= 15) {
                            message.reply(`⚠️ **${item}** is already at max level (15)!`);
                            break;
                        }

                        const discount = 1 - (user.prestige * 0.01);
                        const cost = Math.floor(level * 1000 * discount);

                        if (wallet < cost) {
                            // Tell user they ran out of money mid-upgrade
                            if (i === 0) {
                                return message.reply(
                                    `❌ Not enough money to upgrade!\n` +
                                    `💸 Next upgrade costs: **${cost.toLocaleString()}**\n` +
                                    `💰 Your wallet: **${wallet.toLocaleString()}**\n` +
                                    `📊 Current level: **${level}**`
                                );
                            }
                            break;
                        }

                        wallet -= cost;
                        totalCost += cost;

                        // 🎯 Success rate boosted by prestige
                        const successChance = Math.min(0.95, 0.7 + (user.prestige * 0.02));
                        const success = Math.random() < successChance;

                        if (success) {
                            level++;
                            successCount++;
                        } else {
                            failCount++;
                            // Optional downgrade on fail
                            if (level > 1 && Math.random() < 0.2) {
                                level--;
                                downgrades++;
                            }
                        }
                    }

                    db.serialize(() => {
                        db.run(
                            `UPDATE inventory SET level=? WHERE user_id=? AND item=?`,
                            [level, userId, item]
                        );
                        db.run(
                            `UPDATE users SET wallet=? WHERE user_id=?`,
                            [wallet, userId],
                            (err) => {
                                if (err) return message.reply("❌ DB error saving upgrade");

                                message.reply(
                                    `⬆️ **Upgrade Results — ${item}**\n\n` +
                                    `✅ BERJAYA: **${successCount}**\n` +
                                    `❌ GAGAL: **${failCount}**\n` +
                                    (downgrades > 0 ? `⬇️ Downgrades: **${downgrades}**\n` : ``) +
                                    `💸 Spent: **${totalCost.toLocaleString()}**\n` +
                                    `📊 Final Level: **${level}/15**\n` +
                                    `💰 Remaining: **${wallet.toLocaleString()}**`
                                );
                            }
                        );
                    });
                }
            );
        });
    }
};
