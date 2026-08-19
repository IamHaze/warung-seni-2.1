const db = require("../database/db");

module.exports = {
    name: "mbuy",
    execute(message, args) {
        const user = message.author.id;
        const item = args[0];

        db.get(`SELECT * FROM market WHERE item=?`, [item], (err, row) => {
            if (!row) return message.reply("Item not in market");

            db.get(`SELECT * FROM users WHERE user_id=?`, [user], (err, u) => {
                if (!u || u.wallet < row.price) return message.reply("Not enough money");

                db.run(`UPDATE users SET wallet = wallet - ? WHERE user_id=?`,
                    [row.price, user]);

                db.run(`
                    INSERT INTO inventory (user_id, item, amount)
                    VALUES (?, ?, 1)
                    ON CONFLICT(user_id, item)
                    DO UPDATE SET amount = amount + 1
                `, [user, item]);

                db.run(`UPDATE market SET demand = demand + 1 WHERE item=?`, [item]);

                message.reply(`🛒 Bought ${item} for ${row.price}`);
            });
        });
    }
};
