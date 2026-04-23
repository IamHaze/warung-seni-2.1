const db = require("../database/db");

module.exports = {
    name: "rob",
    execute(message) {
        const user = message.author.id;
        const target = message.mentions.users.first();
        const now = Date.now();
        const cooldown = 60000;

        if (!target) return message.reply("❌ Mention a target to rob");
        if (target.id === user) return message.reply("❌ Cannot rob yourself");

        db.get(`SELECT * FROM users WHERE user_id=?`, [user], (err, robber) => {
            if (!robber) return message.reply("❌ Your data not found");

            // ⏳ Cooldown check
            if (robber.last_rob && now - robber.last_rob < cooldown) {
                const left = Math.floor((cooldown - (now - robber.last_rob)) / 1000);
                return message.reply(`⏳ Wait **${left}s** before robbing again`);
            }

            // 🔑 REQUIRE lockpick
            db.get(
                `SELECT amount FROM inventory WHERE user_id=? AND item='lockpick'`,
                [user],
                (err, pick) => {
                    if (!pick || pick.amount < 1) {
                        return message.reply(
                            `❌ You need a **lockpick** to rob someone!\n` +
                            `🛒 Buy one with \`wbuy lockpick\` (💰 500)`
                        );
                    }

                    // Check attacker's optional items
                    db.all(
                        `SELECT item, amount FROM inventory WHERE user_id=? AND item IN ('hacker_kit','emp_device','getaway_car')`,
                        [user],
                        (err, atkItems) => {
                            const atk = {};
                            (atkItems || []).forEach(i => atk[i.item] = i.amount);

                            // Check victim's defense items
                            db.all(
                                `SELECT item, amount FROM inventory WHERE user_id=? AND item IN ('guard_dog','safe','alarm','vault')`,
                                [target.id],
                                (err, defItems) => {
                                    const def = {};
                                    (defItems || []).forEach(i => def[i.item] = i.amount);

                                    db.get(`SELECT * FROM users WHERE user_id=?`, [target.id], (err, victim) => {
                                        if (!victim) return message.reply("❌ Target not found");
                                        if (victim.wallet <= 0) return message.reply("💀 Target is broke (0 coins)");

                                        // 🔑 Consume lockpick
                                        db.run(
                                            `UPDATE inventory SET amount = amount - 1 WHERE user_id=? AND item='lockpick'`,
                                            [user]
                                        );
                                        db.run(`DELETE FROM inventory WHERE user_id=? AND item='lockpick' AND amount <= 0`, [user]);

                                        const hasEmp = atk["emp_device"] > 0;

                                        // ⚡ EMP — consume if present
                                        if (hasEmp) {
                                            db.run(`UPDATE inventory SET amount = amount - 1 WHERE user_id=? AND item='emp_device'`, [user]);
                                            db.run(`DELETE FROM inventory WHERE user_id=? AND item='emp_device' AND amount <= 0`, [user]);
                                        }

                                        // 🐕 Guard dog check (bypassed by EMP)
                                        if (!hasEmp && def["guard_dog"] && Math.random() < 0.25) {
                                            db.run(`UPDATE users SET last_rob=? WHERE user_id=?`, [now, user]);
                                            return message.reply(
                                                `🐕 **GUARD DOG!**\n` +
                                                `<@${target.id}>'s guard dog blocked your rob!\n` +
                                                `🔑 Your lockpick was consumed.`
                                            );
                                        }

                                        // 🚨 Alarm — DM victim with robber's username (bypassed by EMP)
                                        if (!hasEmp && def["alarm"]) {
                                            const robberName = message.author.username;
                                            target.send(
                                                `🚨 **ROB ATTEMPT!**\n` +
                                                `👤 **${robberName}** (<@${user}>) is trying to rob you right now!\n` +
                                                `Quick, type \`wdep all\` to protect your coins!`
                                            ).catch(() => {});
                                        }

                                        // 🎯 Success rate
                                        let successRate = 0.5 - (robber.heat * 0.03);
                                        if (successRate < 0.15) successRate = 0.15;

                                        // 💻 Hacker kit bonus
                                        if (atk["hacker_kit"] > 0) {
                                            successRate = Math.min(0.95, successRate + 0.15);
                                            db.run(`UPDATE inventory SET amount = amount - 1 WHERE user_id=? AND item='hacker_kit'`, [user]);
                                            db.run(`DELETE FROM inventory WHERE user_id=? AND item='hacker_kit' AND amount <= 0`, [user]);
                                        }

                                        const roll = Math.random();
                                        const eventRoll = Math.random();

                                        // 🛡️ Dodge
                                        if (eventRoll < 0.08) {
                                            db.run(`UPDATE users SET last_rob=? WHERE user_id=?`, [now, user]);
                                            return message.reply(
                                                `🛡️ <@${target.id}> dodged your rob!\n` +
                                                `🔑 Lockpick consumed.`
                                            );
                                        }

                                        // 🔫 Counter
                                        if (eventRoll < 0.16) {
                                            const counter = Math.floor(robber.wallet * 0.2);
                                            db.run(`UPDATE users SET wallet = wallet - ?, last_rob=? WHERE user_id=?`, [counter, now, user]);
                                            db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [counter, target.id]);
                                            return message.reply(
                                                `🔫 **COUNTERED!**\n` +
                                                `<@${target.id}> fought back and stole **${counter}** from you!\n` +
                                                `🔑 Lockpick consumed.`
                                            );
                                        }

                                        // ❌ Fail
                                        if (roll > successRate) {
                                            let penalty = Math.floor(robber.wallet * 0.15);

                                            // 🚗 Getaway car reduces fine
                                            let carUsed = false;
                                            if (atk["getaway_car"] > 0) {
                                                penalty = Math.floor(penalty * 0.5);
                                                carUsed = true;
                                                db.run(`UPDATE inventory SET amount = amount - 1 WHERE user_id=? AND item='getaway_car'`, [user]);
                                                db.run(`DELETE FROM inventory WHERE user_id=? AND item='getaway_car' AND amount <= 0`, [user]);
                                            }

                                            db.run(
                                                `UPDATE users SET wallet = wallet - ?, heat = heat + 1, last_rob=? WHERE user_id=?`,
                                                [penalty, now, user]
                                            );

                                            return message.reply(
                                                `🚓 **Kantoi Lu!**\n\n` +
                                                `💸 Fine: **${penalty}**${carUsed ? " *(getaway car saved 50%!)*" : ""}\n` +
                                                `🔥 Heat +1\n` +
                                                `🔑 Lockpick consumed.`
                                            );
                                        }

                                        // ✅ Success
                                        const percent = Math.floor(Math.random() * 30) + 10;
                                        let amount = Math.floor(victim.wallet * (percent / 100));

                                        let defenseLog = "";

                                        // 🔒 Safe — protects flat 5000 (bypassed by EMP)
                                        if (!hasEmp && def["safe"]) {
                                            const protection = 5000;
                                            amount = Math.max(0, amount - protection);
                                            defenseLog += `\n🔒 Safe blocked **${protection}** coins`;
                                        }

                                        // 🏛️ Vault — blocks 40% (bypassed by EMP)
                                        if (!hasEmp && def["vault"]) {
                                            const blocked = Math.floor(amount * 0.4);
                                            amount -= blocked;
                                            defenseLog += `\n🏛️ Vault blocked **${blocked}** coins (40%)`;
                                        }

                                        if (amount <= 0) {
                                            db.run(`UPDATE users SET last_rob=?, heat = heat + 1 WHERE user_id=?`, [now, user]);
                                            return message.reply(
                                                `😤 **Rob Failed!**\n` +
                                                `<@${target.id}>'s defenses blocked everything!${defenseLog}\n` +
                                                `🔑 Lockpick consumed.`
                                            );
                                        }

                                        db.run(
                                            `UPDATE users SET wallet = wallet + ?, heat = heat + 1, last_rob=? WHERE user_id=?`,
                                            [amount, now, user]
                                        );
                                        db.run(
                                            `UPDATE users SET wallet = wallet - ? WHERE user_id=?`,
                                            [amount, target.id]
                                        );

                                        message.reply(
                                            `💰 **Tahniah dasar pencuri!**\n\n` +
                                            `🎯 Target: <@${target.id}>\n` +
                                            `💸 Stolen: **${amount}** (${percent}%)` +
                                            `${hasEmp ? "\n⚡ EMP bypassed defenses!" : ""}` +
                                            `${defenseLog}\n` +
                                            `🔥 Heat +1\n` +
                                            `🔑 Lockpick consumed.`
                                        );

                                        // 📩 DM victim
                                        target.send(
                                            `🚨 **Anda dh kena rompak!**\n` +
                                            `💸 Lost: **${amount}** coins\n` +
                                            `🛡️ Buy defense items with \`wbuy guard_dog\` or \`wbuy vault\`!`
                                        ).catch(() => {});
                                    });
                                }
                            );
                        }
                    );
                }
            );
        });
    }
};
