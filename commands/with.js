const db = require("../database/db");

module.exports = {
    name: "with",
    execute(message, args) {
        const user = message.author.id;

        if (!args[0]) return message.reply("❌ Usage: `wwith <amount|all>`");

        db.get(`SELECT wallet, bank FROM users WHERE user_id=?`, [user], (err, row) => {
            if (err || !row) return message.reply("❌ User error");

            if (row.bank <= 0) return message.reply("❌ No coins in bank to withdraw!");

            const amount = args[0].toLowerCase() === "all" ? row.bank : parseInt(args[0]);

            if (!amount || amount <= 0) return message.reply("❌ Invalid amount");
            if (amount > row.bank) return message.reply(`❌ Not enough in bank!\n🏦 Bank: **${row.bank}**`);

            db.run(
                `UPDATE users SET bank = bank - ?, wallet = wallet + ? WHERE user_id=?`,
                [amount, amount, user],
                (err) => {
                    if (err) return message.reply("❌ DB error");
                    message.reply(
                        `💸 **Withdrawn!**\n\n` +
                        `💸 Amount: **${amount}**\n` +
                        `🏦 New Bank: **${row.bank - amount}**\n` +
                        `💰 New Wallet: **${row.wallet + amount}**`
                    );
                }
            );
        });
    }
};
