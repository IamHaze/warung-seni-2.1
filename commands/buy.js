const db = require("../database/db");
const getUser = require("../core/getUser");
const config = require("../config.json");

const MAX_PER_PURCHASE = 100;
const MAX_STACK = 100;
const CROWN_EXPIRY = 24 * 60 * 60 * 1000;

const SINGLE_ONLY = ["lucky_charm", "energy_drink", "guard_dog", "safe", "alarm", "vault", "hacker_kit", "emp_device", "getaway_car", "bamboo_rod", "iron_rod", "golden_rod", "crystal_rod"];

function buyShadowCrown(db, user, wallet, message) {
    const now = Date.now();
    const price = 5000000;

    if (wallet < price) {
        return message.reply(
            `❌ Not enough money!\n` +
            `💸 Cost: **${price.toLocaleString()}**\n` +
            `💰 Your wallet: **${wallet.toLocaleString()}**`
        );
    }

    db.get(`SELECT user_id, used_at FROM shadow_crown_log WHERE user_id=?`, [user], (err, log) => {
        if (log && now - log.used_at < CROWN_EXPIRY) {
            const remaining = Math.ceil((CROWN_EXPIRY - (now - log.used_at)) / 3600000);
            return message.reply(`❌ You are banned from buying the **Shadow Crown** for another **${remaining}h**.`);
        }

        db.get(`SELECT user_id FROM inventory WHERE item='shadow_crown' LIMIT 1`, [], (err, existing) => {
            if (existing && existing.user_id !== user) {
                return message.reply(`❌ The **Shadow Crown** is already owned by someone. Only 1 per server at a time.`);
            }

            db.get(`SELECT amount FROM inventory WHERE user_id=? AND item='shadow_crown'`, [user], (err, ownCheck) => {
                if (ownCheck && ownCheck.amount > 0) {
                    return message.reply(`❌ You already own the **Shadow Crown**!`);
                }

                db.run(`UPDATE users SET wallet = wallet - ? WHERE user_id=?`, [price, user], (err) => {
                    if (err) return message.reply("❌ DB error");

                    db.run(
                        `INSERT INTO inventory (user_id, item, amount, level) VALUES (?, 'shadow_crown', 1, ?)
                         ON CONFLICT(user_id, item) DO UPDATE SET amount = 1, level = ?`,
                        [user, now, now],
                        (err) => {
                            if (err) return message.reply("❌ Inventory error");
                            message.reply(
                                `👑 **Shadow Crown Purchased!**\n\n` +
                                `💸 Cost: **${price.toLocaleString()}**\n` +
                                `⏳ Expires in **24 hours** if unused\n` +
                                `💀 Use with \`wuse shadow_crown @target\``
                            );
                        }
                    );
                });
            });
        });
    });
}

module.exports = {
    name: "buy",
    execute(message, args) {
        const user = message.author.id;
        const item = args[0];
        const quantity = Math.max(1, parseInt(args[1]) || 1);

        if (!item) return message.reply("❌ Usage: `wbuy <item> [quantity]`");

        if (quantity > MAX_PER_PURCHASE) {
            return message.reply(`❌ Limit is **${MAX_PER_PURCHASE}** je bohh jgn tamak.`);
        }

        const data = config.items[item];
        if (!data) return message.reply("❌ Barang x wujud check elok2. Tulis `wshop` tgk apa yg ada.");

        const prestigeOnly = [
            "gold_printer", "ai_factory", "dark_lab",
            "gold_mine", "diamond_mine", "power_plant",
            "oil_refinery", "offshore_drill", "bank", "oil_rig", "frey",
            "quantum_reactor", "dyson_sphere", "dark_matter_forge", "antimatter_engine",
            "galactic_trade_hub", "void_citadel", "nebula_refinery", "cosmic_treasury",
            "singularity_core", "multiverse_gate", "infinity_vault", "omega_forge",
            "eternal_throne", "genesis_engine", "nuclear_plant", "space_station",
            "warung_island"
        ];
        if (prestigeOnly.includes(item)) {
            return message.reply("❌ Bareyy Exclusive ni bohh.. ada kt prestige shop je (`wpshop`).");
        }

        if (item === "shadow_crown") {
            return getUser(user, (err, row) => {
                if (err || !row) return message.reply("❌ User error");
                buyShadowCrown(db, user, row.wallet, message);
            });
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
                    `💸 Cost: **${totalCost.toLocaleString()}** (${quantity}x ${item})\n` +
                    `💰 Your wallet: **${row.wallet.toLocaleString()}**`
                );
            }

            db.get(`SELECT amount FROM inventory WHERE user_id=? AND item=?`, [user, item], (err, inv) => {
                const currentAmount = inv?.amount || 0;

                if (SINGLE_ONLY.includes(item) && currentAmount >= 1) {
                    return message.reply(`❌ You can only own **1x ${item}** at a time.`);
                }

                if (!SINGLE_ONLY.includes(item) && currentAmount + quantity > MAX_STACK) {
                    const canBuy = MAX_STACK - currentAmount;
                    if (canBuy <= 0) {
                        return message.reply(`❌ You already have the max stack (**${MAX_STACK}**) of **${item}**.`);
                    }
                    return message.reply(
                        `❌ Stack limit is **${MAX_STACK}**. You own **${currentAmount}**, can only buy **${canBuy}** more.`
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
                                `🛒 **Purchase Complete!**\n\n` +
                                `📦 Item: **${item}** x${quantity}\n` +
                                `💸 Total Spent: **${totalCost.toLocaleString()}**\n` +
                                `💰 Remaining: **${(row.wallet - totalCost).toLocaleString()}**`
                            );
                        });
                    }
                );
            });
        });
    }
};
