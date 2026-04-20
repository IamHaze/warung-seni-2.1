const db = require("../database/db");
const config = require("../config.json");
const cooldowns = new Map();

const SYMBOLS = ["🍒", "🍋", "🍊", "⭐", "💎", "🎰"];
const PAYOUTS = {
    "🍒🍒🍒": 2,
    "🍋🍋🍋": 2.5,
    "🍊🍊🍊": 3,
    "⭐⭐⭐": 5,
    "💎💎💎": 10,
    "🎰🎰🎰": 20
};

module.exports = {
    name: "slots",
    execute(message, args) {
        const user = message.author.id;
        const bet = parseInt(args[0]);

        if (!bet || bet <= 0) return message.reply("❌ Usage: `wslots <amount>`");

        const now = Date.now();
        const cd = cooldowns.get(user) || 0;
        if (now < cd) return message.reply(`⏳ Wait **${Math.ceil((cd - now) / 1000)}s**`);
        cooldowns.set(user, now + config.cooldowns.gamble);

        db.get(`SELECT wallet FROM users WHERE user_id=?`, [user], (err, row) => {
            if (!row || row.wallet < bet) return message.reply("❌ Not enough money");

            const s1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            const s2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            const s3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            const key = `${s1}${s2}${s3}`;

            const multiplier = PAYOUTS[key] || 0;
            const net = multiplier > 0
                ? Math.floor(bet * multiplier) - bet
                : -bet;

            let resultText = "";
            if (multiplier >= 20) resultText = "🎉 **JACKPOT!!!**";
            else if (multiplier >= 10) resultText = "💎 **MEGA WIN!**";
            else if (multiplier >= 5) resultText = "⭐ **BIG WIN!**";
            else if (multiplier > 0) resultText = "✅ **Winner!**";
            else {
                // Check 2-of-a-kind for small consolation
                if (s1 === s2 || s2 === s3 || s1 === s3) resultText = "😐 **So close...**";
                else resultText = "💀 **No match**";
            }

            db.run(
                `UPDATE users SET wallet = wallet + ?, heat = heat + ? WHERE user_id=?`,
                [net, net < 0 ? 1 : 0, user]
            );

            message.reply(
                `🎰 **SLOT MACHINE**\n\n` +
                `┌─────────────┐\n` +
                `│  ${s1}  ${s2}  ${s3}  │\n` +
                `└─────────────┘\n\n` +
                `${resultText}\n` +
                `💰 ${net >= 0 ? "+" : ""}**${net}**`
            );
        });
    }
};
