const db = require("../database/db");

module.exports = {
    execute(message, args) {
        const userId = message.author.id;
        const itemName = args[0];

        db.get(
            "SELECT * FROM inventory WHERE user_id=? AND item=?",
            [userId, itemName],
            (err, item) => {

                if (!item) return message.reply("You don't own this");

                db.get(
                    "SELECT * FROM market WHERE item=?",
                    [itemName],
                    (err, market) => {

                        const cost = Math.floor(market.price * item.level * 1.5);

                        db.get(
                            "SELECT wallet FROM users WHERE user_id=?",
                            [userId],
                            (err, user) => {

                                if (user.wallet < cost) {
                                    return message.reply(`Need ${cost}`);
                                }

                                db.run(
                                    "UPDATE users SET wallet = wallet - ? WHERE user_id=?",
                                    [cost, userId]
                                );

                                db.run(
                                    "UPDATE inventory SET level = level + 1 WHERE user_id=? AND item=?",
                                    [userId, itemName]
                                );

                                message.reply(`⚙️ ${itemName} upgraded to lvl ${item.level + 1}`);
                            }
                        );
                    }
                );
            }
        );
    }
};
