const db = require("../database/db");
const config = require("../config.json");
const cooldowns = new Map();

module.exports = {
    name: "coinflip",
    execute(message, args) {
        const user = message.author.id;
        const choice = args[0]?.toLowerCase();
        const betArg = args[1]?.toLowerCase();

        if (!choice || !["heads", "tails"].includes(choice) || !betArg) {
            return message.reply("❌ Usage: `wcoinflip <heads|tails> <amount|all>`  |  Alias: `wcf`");
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

            const result = Math.random() < 0.5 ? "heads" : "tails";
            const win = choice === result;
            const net = win ? bet : -bet;
            const emoji = result === "heads" ? "👑" : "🦅";

            db.run(
                `UPDATE users SET wallet = wallet + ?, heat = heat + ? WHERE user_id=?`,
                [net, win ? 0 : 1, user]
            );

            message.reply(
                `🪙 **COIN FLIP**\n\n` +
                `${emoji} Result: **${result.toUpperCase()}**\n` +
                `${win ? "✅ You won!" : "❌ You lost!"}\n` +
                `💰 ${net >= 0 ? "+" : ""}**${net.toLocaleString()}**`
            );
        });
    }
};
