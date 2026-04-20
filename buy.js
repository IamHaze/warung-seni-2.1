const db = require("../database/db");
const getUser = require("../core/getUser");
const config = require("../config.json");

module.exports = {
    name: "buy",
    execute(message, args) {
        const user = message.author.id;
        const item = args[0];
        const quantity = Math.max(1, parseInt(args[1]) || 1);

        if (!item) return message.reply("❌ Usage: `wbuy <item> [quantity]`");

        const data = config.items[item];
        if (!data) return message.reply("❌ Barang x wujud check elok2. Tulis `wshop` tgk apa yg ada.");

        // 🚫 Block prestige-only items from regular shop
        const prestigeOnly = [
            "gold_printer", "ai_factory", "dark_lab",
            "gold_mine", "diamond_mine", "power_plant",
            "oil_refinery", "offshore_drill", "bank", "oil_rig", "frey"
        ];
        if (prestigeOnly.includes(item)) {
            return message.reply("❌ Bareyy Exclusive ni bohh.. ada kt prestige shop je (`wpshop`).");
        }

        if (data.base_price === 0) {
            return message.reply("❌ Check molek item tu. Salah kedai ni.");
        }

        const totalCost = data.base_price * quantity;

        getUser(user, (err, row) => {
            if (err || !row) return message.reply("❌ User error");

            if (row.wallet < totalCost) {
                return message.reply(
                    `❌ Biforti xde duit tp nk beli hahahaha!\n` +
                    `💸 Cost: **${totalCost}** (${quantity}x ${item})\n` +
                    `💰 Your wallet: **${row.wallet}**`
                );
            }

            db.run(
                `UPDATE users SET wallet = wallet - ? WHERE user_id=?`,
                [totalCost, user],
                (err) => {
                    if (err) return message.reply("❌ DB error");

                    db.run(`
                        INSERT INTO inventory (user_id, item, amount, level)
                        VALUES (?, ?, ?, 1)
                        ON CONFLICT(user_id, item)
                        DO UPDATE SET amount = amount + ?
                    `, [user, item, quantity, quantity], (err) => {
                        if (err) return message.reply("❌ Inventory error");

                        message.reply(
                            `🛒 **Terima Kasih atas Pembelian!**\n\n` +
                            `📦 Item: **${item}** x${quantity}\n` +
                            `💸 Total Spent: **${totalCost}**\n` +
                            `💰 Remaining: **${row.wallet - totalCost}**`
                        );
                    });
                }
            );
        });
    }
};
