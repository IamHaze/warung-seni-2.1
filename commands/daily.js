const db = require("../database/db");

function formatCooldown(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
}

module.exports = {
    name: "daily",
    execute(message) {
        const user = message.author.id;
        const now = Date.now();
        const cooldown = 86400000;

        db.get(`SELECT last_daily, streak, prestige FROM users WHERE user_id=?`, [user], (err, row) => {
            if (!row) return message.reply("❌ User error");

            const timeSince = now - (row.last_daily || 0);

            if (timeSince < cooldown) {
                const remaining = cooldown - timeSince;
                return message.reply(
                    `⏳ Dh claim kot tggu la lg **${formatCooldown(remaining)}**`
                );
            }

            // 🔥 Streak logic — reset if more than 48h since last claim
            const streak = timeSince < 172800000 ? (row.streak || 0) + 1 : 1;
            const streakBonus = Math.min(streak * 100, 1000); // max +1000 bonus
            const baseReward = 5000;
            const prestigeBonus = Math.floor(baseReward * (row.prestige || 0) * 0.1);
            const total = baseReward + streakBonus + prestigeBonus;

            db.run(
                `UPDATE users SET wallet = wallet + ?, last_daily=?, streak=? WHERE user_id=?`,
                [total, now, streak, user],
                (err) => {
                    if (err) return message.reply("❌ DB error");
                    message.reply(
                        `🎁 **Daily Reward!**\n\n` +
                        `💰 Base: ${baseReward}\n` +
                        `🔥 Streak Bonus (Day ${streak}): +${streakBonus}\n` +
                        `🌟 Prestige Bonus: +${prestigeBonus}\n` +
                        `━━━━━━━━━━━━\n` +
                        `✅ Total: **${total}** coins`
                    );
                }
            );
        });
    }
};
