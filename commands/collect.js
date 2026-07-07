const db = require("../database/db");

const DAILY_LIMIT = 1_000_000_000_000_000;
const PER_COLLECT_CAP = 10_000_000_000_000;

function todayKey() {
    const d = new Date();
    return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

module.exports = {
    name: "collect",
    execute(message) {
        const user = message.author.id;
        const today = todayKey();

        db.get(`SELECT pending_income, collect_day, collect_day_total FROM users WHERE user_id=?`, [user], (err, row) => {
            if (err || !row) return message.reply("❌ User error");

            const pending = row.pending_income || 0;
            if (pending <= 0) {
                return message.reply("📭 No pending income! Items generate income every minute.");
            }

            const collectDay = row.collect_day || 0;
            const dayTotal = collectDay === today ? (row.collect_day_total || 0) : 0;

            if (dayTotal >= DAILY_LIMIT) {
                return message.reply(
                    `🚫 **Daily collect limit reached!**\n\n` +
                    `📅 Limit: **${DAILY_LIMIT.toLocaleString()}** per day\n` +
                    `✅ Already collected: **${dayTotal.toLocaleString()}** today\n` +
                    `⏳ Resets at midnight UTC`
                );
            }

            const remaining = DAILY_LIMIT - dayTotal;
            const cappedPending = Math.min(pending, PER_COLLECT_CAP, remaining);

            db.run(
                `UPDATE users SET wallet = wallet + ?, pending_income = pending_income - ?,
                 collect_day = ?, collect_day_total = ? WHERE user_id=?`,
                [cappedPending, cappedPending, today, dayTotal + cappedPending, user],
                (err) => {
                    if (err) return message.reply("❌ DB error");

                    let extra = "";
                    if (pending > cappedPending) {
                        const leftPending = pending - cappedPending;
                        extra = `\n📦 Remaining pending: **${leftPending.toLocaleString()}** (capped — collect again later)`;
                    }

                    const newDayTotal = dayTotal + cappedPending;
                    const dayRemaining = DAILY_LIMIT - newDayTotal;

                    message.reply(
                        `✅ **Income Collected!**\n\n` +
                        `💰 **+${cappedPending.toLocaleString()}** coins added to wallet` +
                        extra +
                        `\n📅 Daily collected: **${newDayTotal.toLocaleString()}** / **${DAILY_LIMIT.toLocaleString()}**` +
                        (dayRemaining > 0 ? `\n🔓 Remaining today: **${dayRemaining.toLocaleString()}**` : `\n🔒 Daily limit reached!`)
                    );
                }
            );
        });
    }
};
