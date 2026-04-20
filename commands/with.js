const db = require("../database/db");

module.exports = {
    name: "with",
    execute(message, args) {
        const user = message.author.id;
        const amount = parseInt(args[0]);

        if (!amount) return message.reply("Enter amount");

        db.get(`SELECT * FROM users WHERE user_id=?`, [user], (err, row) => {
            if (!row || row.bank < amount) return message.reply("Not enough in bank");

            db.run(`UPDATE users SET bank = bank - ?, wallet = wallet + ? WHERE user_id=?`,
                [amount, amount, user]);

            message.reply(`💸 Withdrew ${amount}`);
        });
    }
};
