const db = require("../database/db");
const { getMYTDayKey } = require("../core/timezone");

// Total a user can collect per MYT day
const DAILY_CAP = 1_000_000_000_000_000 ; // 1 quadrillion per day

function fmt(n) {
    return n.toLocaleString();
}

module.exports = {
    name: "collect",
    execute(message) {
        const user  = message.author.id;
        const today = getMYTDayKey();

        db.get(
            `SELECT pending_income, collect_day, collect_day_total FROM users WHERE user_id=?`,
            [user],
            (err, row) => {
                if (err || !row) return message.reply("❌ User error");

                const pending = row.pending_income || 0;

                if (pending <= 0) {
                    return message.reply("📭 No pending income! Items generate income every minute.");
                }

                // Reset the daily counter if it's a new MYT day
                const sameDay        = row.collect_day === today;
                const dayTotal       = sameDay ? (row.collect_day_total || 0) : 0;
                const remainingToday = DAILY_CAP - dayTotal;

                if (remainingToday <= 0) {
                    return message.reply(
                        `🚫 **Daily collection limit reached!**\n\n` +
                        `📊 Daily collected: **${fmt(dayTotal)}** / **${fmt(DAILY_CAP)}**\n` +
                        `⏳ Resets at midnight MYT.`
                    );
                }

                // Collect everything, capped only by whatever's left of the daily limit
                const collectAmount = Math.min(pending, remainingToday);
                const newDayTotal   = dayTotal + collectAmount;
                const newPending    = pending - collectAmount;

                db.run(
                    `UPDATE users
                     SET wallet = wallet + ?,
                         pending_income = ?,
                         collect_day = ?,
                         collect_day_total = ?
                     WHERE user_id=?`,
                    [collectAmount, newPending, today, newDayTotal, user],
                    (err) => {
                        if (err) return message.reply("❌ DB error");

                        const cappedNote = newPending > 0
                            ? "\n🚫 Daily limit hit — remaining pending will carry over to tomorrow."
                            : "";

                        message.reply(
                            `✅ **Income Collected!**\n\n` +
                            `💰 **+${fmt(collectAmount)}** coins added to wallet\n` +
                            `📦 Remaining pending: **${fmt(newPending)}**${cappedNote}\n` +
                            `📊 Daily collected: **${fmt(newDayTotal)}** / **${fmt(DAILY_CAP)}**\n` +
                            `⏳ Remaining today: **${fmt(DAILY_CAP - newDayTotal)}**`
                        );
                    }
                );
            }
        );
    }
};