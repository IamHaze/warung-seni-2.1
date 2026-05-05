const db = require("../database/db");

module.exports = {
    name: "rank",
    execute(message) {
        const target = message.mentions.users.first() || message.author;
        const userId = target.id;

        db.all(
            `SELECT user_id, (wallet + bank) AS total FROM users ORDER BY total DESC`,
            [],
            (err, rows) => {
                if (err || !rows) return message.reply("❌ DB error");

                const index = rows.findIndex(u => u.user_id === userId);
                if (index === -1) return message.reply("❌ Not ranked yet — play some commands first!");

                db.get(
                    `SELECT wallet, bank, level, prestige, xp FROM users WHERE user_id=?`,
                    [userId],
                    (err, row) => {
                        if (!row) return message.reply("❌ User error");

                        const rank    = index + 1;
                        const total   = row.wallet + row.bank;
                        const pct     = Math.ceil((rank / rows.length) * 100);
                        const medal   = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank <= 10 ? "🏅" : "📊";

                        message.reply(
                            `${medal} **${target.username}'s Rank**\n\n` +
                            `📊 Global Rank: **#${rank}** / ${rows.length} players\n` +
                            `📈 Top **${pct}%**\n\n` +
                            `💰 Wallet: **${row.wallet.toLocaleString()}**\n` +
                            `🏦 Bank:   **${row.bank.toLocaleString()}**\n` +
                            `💎 Total:  **${total.toLocaleString()}**\n\n` +
                            `⭐ Level: **${row.level}** | 🌟 Prestige: **${row.prestige || 0}**`
                        );
                    }
                );
            }
        );
    }
};
