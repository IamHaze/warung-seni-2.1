const db = require("../database/db");

const SHADOW_CROWN_EXPIRY = 24 * 60 * 60 * 1000;

module.exports = {
    name: "use",
    execute(message, args) {
        const user = message.author.id;
        const item = args[0]?.toLowerCase();

        if (!item) return message.reply("❌ Usage: `wuse <item> [@target]`");

        if (item === "shadow_crown") {
            const target = message.mentions.users.first();
            if (!target) return message.reply("❌ Mention a target: `wuse shadow_crown @user`");
            if (target.id === user) return message.reply("❌ Cannot use Shadow Crown on yourself");

            db.get(
                `SELECT * FROM inventory WHERE user_id=? AND item='shadow_crown'`,
                [user],
                (err, crown) => {
                    if (!crown || crown.amount < 1) return message.reply("❌ You don't own the **Shadow Crown**!");

                    const boughtAt = crown.level;
                    const now = Date.now();

                    if (now - boughtAt > SHADOW_CROWN_EXPIRY) {
                        db.run(`DELETE FROM inventory WHERE user_id=? AND item='shadow_crown'`, [user]);
                        db.run(
                            `INSERT INTO shadow_crown_log (user_id, used_at) VALUES (?, ?)
                             ON CONFLICT(user_id) DO UPDATE SET used_at = ?`,
                            [user, now, now]
                        );
                        return message.reply("💀 Your **Shadow Crown** has expired and crumbled to dust! You cannot rebuy for 24h.");
                    }

                    db.get(`SELECT * FROM users WHERE user_id=?`, [target.id], (err, victim) => {
                        if (!victim) return message.reply("❌ Target not found");

                        const stolenWallet = victim.wallet;
                        const stolenBank = victim.bank;
                        const totalStolen = stolenWallet + stolenBank;

                        db.all(`SELECT * FROM inventory WHERE user_id=?`, [target.id], (err, victimItems) => {
                            db.serialize(() => {
                                db.run(`DELETE FROM inventory WHERE user_id=? AND item='shadow_crown'`, [user]);

                                db.run(
                                    `INSERT INTO shadow_crown_log (user_id, used_at) VALUES (?, ?)
                                     ON CONFLICT(user_id) DO UPDATE SET used_at = ?`,
                                    [user, now, now]
                                );

                                db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [stolenWallet, user]);
                                db.run(`UPDATE users SET wallet = 0, bank = 0 WHERE user_id=?`, [target.id]);

                                if (victimItems && victimItems.length > 0) {
                                    victimItems.forEach(inv => {
                                        if (inv.item === "shadow_crown") return;
                                        db.run(`
                                            INSERT INTO inventory (user_id, item, amount, level)
                                            VALUES (?, ?, ?, ?)
                                            ON CONFLICT(user_id, item)
                                            DO UPDATE SET amount = amount + ?
                                        `, [user, inv.item, inv.amount, inv.level, inv.amount]);
                                    });
                                    db.run(`DELETE FROM inventory WHERE user_id=?`, [target.id]);
                                }

                                const itemList = victimItems?.filter(i => i.item !== "shadow_crown").length > 0
                                    ? victimItems.filter(i => i.item !== "shadow_crown").map(i => `• ${i.item} x${i.amount}`).join("\n")
                                    : "None";

                                message.reply(
                                    `👑 **SHADOW CROWN ACTIVATED**\n\n` +
                                    `💀 Target: <@${target.id}>\n` +
                                    `💰 Wallet stolen: **${stolenWallet}**\n` +
                                    `🏦 Bank stolen: **${stolenBank}**\n` +
                                    `💎 Total: **${totalStolen}**\n` +
                                    `📦 Items stolen:\n${itemList}\n\n` +
                                    `*The Shadow Crown disintegrates after use...*\n` +
                                    `⏳ You cannot rebuy it for **24 hours**.`
                                );

                                target.send(
                                    `💀 **YOU HAVE BEEN DESTROYED**\n\n` +
                                    `👑 **${message.author.username}** used the **Shadow Crown** on you!\n` +
                                    `💰 Lost: **${totalStolen}** coins (wallet + bank)\n` +
                                    `📦 All your items have been taken.\n\n` +
                                    `*Start over and reclaim your empire...*`
                                ).catch(() => {});
                            });
                        });
                    });
                }
            );
            return;
        }

        if (item === "lottery_ticket") {
            const qtyArg = args[1]?.toLowerCase();

            db.get(`SELECT amount FROM inventory WHERE user_id=? AND item='lottery_ticket'`, [user], (err, inv) => {
                if (!inv || inv.amount < 1) return message.reply("❌ You don't have a **lottery_ticket**! Buy one with `wbuy lottery_ticket`.");

                const qty = qtyArg === "all" ? inv.amount : (parseInt(qtyArg) || 1);

                if (qty <= 0) return message.reply("❌ Invalid amount");
                if (qty > inv.amount) return message.reply(`❌ You only have **${inv.amount}** lottery ticket(s).`);

                if (qty === 1) {
                    db.run(`UPDATE inventory SET amount = amount - 1 WHERE user_id=? AND item='lottery_ticket'`, [user]);
                    db.run(`DELETE FROM inventory WHERE user_id=? AND item='lottery_ticket' AND amount <= 0`, [user]);

                    const roll = Math.random();
                    let prize, label;

                    if (roll < 0.01) {
                        prize = 500000; label = "🏆 **JACKPOT!!!** 500,000";
                    } else if (roll < 0.05) {
                        prize = 50000; label = "💎 **MEGA WIN!** 50,000";
                    } else if (roll < 0.15) {
                        prize = 10000; label = "🌟 **BIG WIN!** 10,000";
                    } else if (roll < 0.35) {
                        prize = 2500; label = "✅ **Win!** 2,500";
                    } else if (roll < 0.55) {
                        prize = 500; label = "🎟️ **Small Win** 500 (ticket refund)";
                    } else {
                        prize = 0; label = "❌ **Better luck next time!** 0";
                    }

                    if (prize > 0) {
                        db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [prize, user]);
                    }

                    return message.reply(
                        `🎟️ **LOTTERY TICKET**\n\n` +
                        `${label}\n` +
                        `💰 +**${prize}** added to wallet`
                    );
                }

                db.run(`UPDATE inventory SET amount = amount - ? WHERE user_id=? AND item='lottery_ticket'`, [qty, user]);
                db.run(`DELETE FROM inventory WHERE user_id=? AND item='lottery_ticket' AND amount <= 0`, [user]);

                let totalPrize = 0;
                const results = { jackpot: 0, mega: 0, big: 0, win: 0, small: 0, loss: 0 };

                for (let i = 0; i < qty; i++) {
                    const roll = Math.random();
                    if (roll < 0.01) { totalPrize += 500000; results.jackpot++; }
                    else if (roll < 0.05) { totalPrize += 50000; results.mega++; }
                    else if (roll < 0.15) { totalPrize += 10000; results.big++; }
                    else if (roll < 0.35) { totalPrize += 2500; results.win++; }
                    else if (roll < 0.55) { totalPrize += 500; results.small++; }
                    else { results.loss++; }
                }

                if (totalPrize > 0) {
                    db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [totalPrize, user]);
                }

                const breakdown = [
                    results.jackpot > 0 ? `🏆 JACKPOT x${results.jackpot}` : "",
                    results.mega > 0    ? `💎 MEGA WIN x${results.mega}` : "",
                    results.big > 0     ? `🌟 BIG WIN x${results.big}` : "",
                    results.win > 0     ? `✅ Win x${results.win}` : "",
                    results.small > 0   ? `🎟️ Small Win x${results.small}` : "",
                    results.loss > 0    ? `❌ Loss x${results.loss}` : ""
                ].filter(Boolean).join("\n");

                message.reply(
                    `🎟️ **LOTTERY — ${qty} Tickets**\n\n` +
                    `${breakdown}\n\n` +
                    `💰 Total Won: **+${totalPrize}** added to wallet`
                );
            });
            return;
        }

        if (item === "lucky_charm") {
            db.get(`SELECT amount FROM inventory WHERE user_id=? AND item='lucky_charm'`, [user], (err, inv) => {
                if (!inv || inv.amount < 1) return message.reply("❌ You don't have a **lucky_charm**! Buy one with `wbuy lucky_charm`.");

                const now = Date.now();
                const expires = now + 3600000;

                db.run(`UPDATE inventory SET amount = amount - 1 WHERE user_id=? AND item='lucky_charm'`, [user]);
                db.run(`DELETE FROM inventory WHERE user_id=? AND item='lucky_charm' AND amount <= 0`, [user]);

                db.run(
                    `INSERT INTO buffs (user_id, buff, expires_at) VALUES (?, 'lucky_charm', ?)
                     ON CONFLICT(user_id, buff) DO UPDATE SET expires_at = ?`,
                    [user, expires, expires],
                    (err) => {
                        if (err) return message.reply("❌ DB error");
                        message.reply(
                            `🍀 **Lucky Charm activated!**\n\n` +
                            `🎰 +10% gamble luck for the next **1 hour**\n` +
                            `⏳ Expires <t:${Math.floor(expires / 1000)}:R>`
                        );
                    }
                );
            });
            return;
        }

        if (item === "energy_drink") {
            db.get(`SELECT amount FROM inventory WHERE user_id=? AND item='energy_drink'`, [user], (err, inv) => {
                if (!inv || inv.amount < 1) return message.reply("❌ You don't have an **energy_drink**! Buy one with `wbuy energy_drink`.");

                const now = Date.now();
                const expires = now + 300000;

                db.run(`UPDATE inventory SET amount = amount - 1 WHERE user_id=? AND item='energy_drink'`, [user]);
                db.run(`DELETE FROM inventory WHERE user_id=? AND item='energy_drink' AND amount <= 0`, [user]);

                db.run(
                    `INSERT INTO buffs (user_id, buff, expires_at) VALUES (?, 'energy_drink', ?)
                     ON CONFLICT(user_id, buff) DO UPDATE SET expires_at = ?`,
                    [user, expires, expires],
                    (err) => {
                        if (err) return message.reply("❌ DB error");
                        message.reply(
                            `⚡ **Energy Drink chugged!**\n\n` +
                            `🕐 All your command cooldowns are **reset** for the next **5 minutes**\n` +
                            `⏳ Buff expires <t:${Math.floor(expires / 1000)}:R>`
                        );
                    }
                );
            });
            return;
        }

        message.reply(`❌ **${item}** is not a usable item.\n📋 Usable items: \`lottery_ticket\`, \`lucky_charm\`, \`energy_drink\`, \`shadow_crown\``);
    }
};
