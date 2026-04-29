const db = require("../database/db");
const getUser = require("../core/getUser");
const config = require("../config.json");

module.exports = {
    name: "heist",
    execute(message) {
        const userId = message.author.id;

        getUser(userId, (err, user) => {
            if (!user) return message.reply("❌ User error");

            // ⏳ Cooldown (reduced by prestige)
            const baseCooldown = config.cooldowns.heist || 300000;
            const reduction = user.prestige * 0.05;
            const finalCooldown = Math.floor(baseCooldown * (1 - Math.min(reduction, 0.5)));

            if (user.last_heist && Date.now() - user.last_heist < finalCooldown) {
                const remaining = Math.ceil((finalCooldown - (Date.now() - user.last_heist)) / 1000);
                return message.reply(`⏳ Wait **${remaining}s** before next heist`);
            }

            // 🔑 Require lockpick for heist too
            db.get(
                `SELECT amount FROM inventory WHERE user_id=? AND item='lockpick'`,
                [userId],
                (err, pick) => {
                    if (!pick || pick.amount < 1) {
                        return message.reply(
                            `❌ You need a **lockpick** to do a heist!\n` +
                            `🛒 Buy one with \`wbuy lockpick\` (💰 500)`
                        );
                    }

                    // Check attacker items
                    db.all(
                        `SELECT item, amount FROM inventory WHERE user_id=? AND item IN ('hacker_kit','getaway_car')`,
                        [userId],
                        (err, atkItems) => {
                            const atk = {};
                            (atkItems || []).forEach(i => atk[i.item] = i.amount);

                            // 🔑 Consume lockpick
                            db.run(`UPDATE inventory SET amount = amount - 1 WHERE user_id=? AND item='lockpick'`, [userId]);
                            db.run(`DELETE FROM inventory WHERE user_id=? AND item='lockpick' AND amount <= 0`, [userId]);

                            // 🎯 Success chance
                            const baseChance = 0.4;
                            const bonusChance = user.prestige * 0.03;
                            let successChance = Math.min(0.9, baseChance + bonusChance);

                            // 💻 Hacker kit bonus
                            let hackerUsed = false;
                            if (atk["hacker_kit"] > 0) {
                                successChance = Math.min(0.95, successChance + 0.15);
                                hackerUsed = true;
                                db.run(`UPDATE inventory SET amount = amount - 1 WHERE user_id=? AND item='hacker_kit'`, [userId]);
                                db.run(`DELETE FROM inventory WHERE user_id=? AND item='hacker_kit' AND amount <= 0`, [userId]);
                            }

                            const success = Math.random() < successChance;

                            if (!success) {
                                let fine = Math.floor(Math.random() * 500) + 200;

                                // 🚗 Getaway car halves fine
                                let carUsed = false;
                                if (atk["getaway_car"] > 0) {
                                    fine = Math.floor(fine * 0.5);
                                    carUsed = true;
                                    db.run(`UPDATE inventory SET amount = amount - 1 WHERE user_id=? AND item='getaway_car'`, [userId]);
                                    db.run(`DELETE FROM inventory WHERE user_id=? AND item='getaway_car' AND amount <= 0`, [userId]);
                                }

                                db.run(
                                    `UPDATE users SET wallet = wallet - ?, last_heist=? WHERE user_id=?`,
                                    [fine, Date.now(), userId]
                                );

                                return message.reply(
                                    `🚓 **HEIST FAILED!**\n\n` +
                                    `💀 Padan muka kena saman!\n` +
                                    `💸 Denda: **${fine.toLocaleString()}**${carUsed ? " *(getaway car saved 50%!)*" : ""}\n` +
                                    `🔑 Lockpick consumed.`
                                );
                            }

                            // 💰 Base loot
                            let reward = Math.floor(Math.random() * 3000) + 1000;

                            // 🌟 Prestige bonus
                            const bonus = 1 + (user.prestige * 0.2);
                            reward = Math.floor(reward * Math.min(bonus, 5));

                            // 🎁 Bonus loot chance
                            let bonusLoot = "";
                            if (Math.random() < user.prestige * 0.05) {
                                const extra = Math.floor(Math.random() * 2000) + 500;
                                reward += extra;
                                bonusLoot = `\n🎁 Bonus Loot: **${extra.toLocaleString()}**`;
                            }

                            db.run(
                                `UPDATE users SET wallet = wallet + ?, last_heist=? WHERE user_id=?`,
                                [reward, Date.now(), userId]
                            );

                            message.reply(
                                `🏦 **BANK HEIST SUCCESS!**\n\n` +
                                `💰 Loot: **${reward.toLocaleString()}**${bonusLoot}\n` +
                                `${hackerUsed ? "💻 Hacker kit boosted success!\n" : ""}` +
                                `🌟 Prestige Bonus Active\n` +
                                `🔑 Lockpick consumed.`
                            );
                        }
                    );
                }
            );
        });
    }
};
