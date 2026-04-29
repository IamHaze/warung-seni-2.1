const db = require("../database/db");

const cooldowns = new Map();
const COOLDOWN = 600000;

module.exports = {
    name: "bankrob",
    execute(message) {
        const user = message.author.id;
        const target = message.mentions.users.first();

        if (!target) return message.reply("❌ Mention a target: `wbankrob @user`");
        if (target.id === user) return message.reply("❌ Cannot rob yourself");

        const now = Date.now();
        const cd = cooldowns.get(user) || 0;
        if (now < cd) {
            const left = Math.ceil((cd - now) / 1000);
            return message.reply(`⏳ Sabo **${left}s** leklu chill2`);
        }

        db.get(`SELECT amount FROM inventory WHERE user_id=? AND item='lockpick'`, [user], (err, pick) => {
            if (!pick || pick.amount < 1) {
                return message.reply(
                    `❌ You need a **lockpick** to rob a bank!\n` +
                    `🛒 Buy one with \`wbuy lockpick\` (💰 500)`
                );
            }

            db.get(`SELECT * FROM users WHERE user_id=?`, [user], (err, robber) => {
                if (!robber) return message.reply("❌ Your data not found");

                db.get(`SELECT * FROM users WHERE user_id=?`, [target.id], (err, victim) => {
                    if (!victim || victim.bank <= 0) {
                        return message.reply("🏦 Target bank is empty");
                    }

                    db.run(`UPDATE inventory SET amount = amount - 1 WHERE user_id=? AND item='lockpick'`, [user]);
                    db.run(`DELETE FROM inventory WHERE user_id=? AND item='lockpick' AND amount <= 0`, [user]);

                    cooldowns.set(user, now + COOLDOWN);

                    const heatPenalty = robber.heat * 0.04;
                    const successChance = Math.max(0.10, 0.25 - heatPenalty);
                    const success = Math.random() < successChance;

                    if (!success) {
                        const fine = Math.floor(robber.wallet * 0.20);
                        db.run(`UPDATE users SET wallet = wallet - ?, heat = heat + 3 WHERE user_id=?`, [fine, user]);
                        return message.reply(
                            `🚓 **Anda Gagal. LEMAH!**\n\n` +
                            `💸 Fine: **${fine.toLocaleString()}** (20% of wallet)\n` +
                            `🔥 Heat +3\n` +
                            `🔑 Lockpick consumed.`
                        );
                    }

                    const stealPercent = Math.floor(Math.random() * 8) + 3;
                    const amount = Math.floor(victim.bank * (stealPercent / 100));

                    db.run(`UPDATE users SET wallet = wallet + ?, heat = heat + 3 WHERE user_id=?`, [amount, user]);
                    db.run(`UPDATE users SET bank = bank - ? WHERE user_id=?`, [amount, target.id]);

                    message.reply(
                        `🏦 **Tahniah la berjaya rompak!**\n\n` +
                        `🎯 Target: <@${target.id}>\n` +
                        `💸 Stolen: **${amount.toLocaleString()}** (${stealPercent}% of bank)\n` +
                        `🔥 Heat +3\n` +
                        `🔑 Lockpick consumed.`
                    );

                    target.send(
                        `🚨 **Anda Telah Dirompak!**\n` +
                        `💸 Lost: **${amount.toLocaleString()}** coins from your bank\n` +
                        `🏦 Use \`wdep\` sparingly — keep less in your bank!`
                    ).catch(() => {});
                });
            });
        });
    }
};
