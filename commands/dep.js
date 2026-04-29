const db = require("../database/db");

module.exports = {
    name: "dep",
    execute(message, args) {
        const user = message.author.id;

        if (!args[0]) return message.reply("❌ Usage: `wdep <amount|all>`");

        db.get(`SELECT wallet, bank FROM users WHERE user_id=?`, [user], (err, row) => {
            if (err || !row) return message.reply("❌ User error");

            if (row.wallet <= 0) return message.reply("❌ No coins in wallet to deposit!");

            // ✅ Handle "all" keyword
            const amount = args[0].toLowerCase() === "all" ? row.wallet : parseInt(args[0]);

            if (!amount || amount <= 0) return message.reply("❌ Invalid amount");
            if (amount > row.wallet) return message.reply(`❌ Duit xckup tu!\n💰 Wallet: **${row.wallet.toLocaleString()}**`);

            db.run(
                `UPDATE users SET wallet = wallet - ?, bank = bank + ? WHERE user_id=?`,
                [amount, amount, user],
                (err) => {
                    if (err) return message.reply("❌ DB error");
                    message.reply(
                        `🏦 **Deposited!**\n\n` +
                        `💸 Amount: **${amount.toLocaleString()}**\n` +
                        `🏦 New Bank: **${(row.bank + amount).toLocaleString()}**\n` +
                        `💰 Remaining Wallet: **${(row.wallet - amount).toLocaleString()}**`
                    );
                }
            );
        });
    }
};
