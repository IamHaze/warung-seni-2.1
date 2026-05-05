const db = require("../database/db");
const config = require("../config.json");
const cooldowns = new Map();

module.exports = {
    name: "dice",
    execute(message, args) {
        const user = message.author.id;
        const choice = args[0]?.toLowerCase();
        const betArg = args[1]?.toLowerCase();

        if (!choice || !["over", "under"].includes(choice) || !betArg) {
            return message.reply("❌ Usage: `wdice <over|under> <amount|all>`\n📝 Guess if roll is over or under 7 (2–12)  |  Alias: `wdc`");
        }

        const now = Date.now();
        const cd = cooldowns.get(user) || 0;
        if (now < cd) return message.reply(`⏳ Wait **${Math.ceil((cd - now) / 1000)}s**`);
        cooldowns.set(user, now + config.cooldowns.gamble);

        db.get(`SELECT wallet FROM users WHERE user_id=?`, [user], (err, row) => {
            if (!row) return message.reply("❌ User not found");

            const bet = betArg === "all" ? row.wallet : parseInt(betArg);

            if (!bet || bet <= 0) return message.reply("❌ Invalid amount");
            if (row.wallet < bet) return message.reply(`❌ Not enough money\n💰 Wallet: **${row.wallet.toLocaleString()}**`);

            const roll = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2;
            const win = (choice === "over" && roll > 7) || (choice === "under" && roll < 7);
            const tie = roll === 7;

            let net = 0;
            let resultText = "";

            if (tie) {
                net = 0;
                resultText = "🤝 **Tie! Rolled exactly 7 — bet returned**";
            } else if (win) {
                net = bet;
                resultText = "✅ **Correct!**";
            } else {
                net = -bet;
                resultText = "❌ **Wrong!**";
            }

            db.run(
                `UPDATE users SET wallet = wallet + ?, heat = heat + ? WHERE user_id=?`,
                [net, net < 0 ? 1 : 0, user]
            );

            message.reply(
                `🎲 **DICE ROLL**\n\n` +
                `🎯 Your guess: **${choice.toUpperCase()}** 7\n` +
                `🎲 Rolled: **${roll}**\n\n` +
                `${resultText}\n` +
                `💰 ${net >= 0 ? "+" : ""}**${net.toLocaleString()}**`
            );
        });
    }
};
