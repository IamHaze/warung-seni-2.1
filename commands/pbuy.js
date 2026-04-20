const db = require("../database/db");

module.exports = {
    name: "pbuy",
    execute(message, args) {
        const user = message.author.id;
        const item = args[0];

        if (!item) return message.reply("❌ Usage: wpbuy <item> | See wpshop for list");

        // 🌟 Prestige level REQUIRED to unlock — NOT spent/deducted
        const requirements = {
            gold_printer:   1,
            ai_factory:     2,
            dark_lab:       3,
            gold_mine:      4,
            diamond_mine:   5,
            power_plant:    6,
            oil_refinery:   7,
            offshore_drill: 8,
            bank:           9,
            oil_rig:        10,
            nuclear_plant:  11,
            space_station:  12,
            warung_island:  10,
            frey:           10  // legendary — extra check below
        };

        const required = requirements[item];
        if (required === undefined) {
            return message.reply("❌ Invalid item. Use `wpshop` to see available items.");
        }

        db.get("SELECT prestige FROM users WHERE user_id=?", [user], (err, u) => {
            if (err || !u) return message.reply("❌ User error");

            if (u.prestige < required) {
                return message.reply(
                    `❌ **${item}** requires **Prestige ${required}**.\n` +
                    `You are currently Prestige **${u.prestige}**.`
                );
            }

            // 👑 FREY — server-unique check
            if (item === "frey") {
                db.get(
                    "SELECT user_id FROM inventory WHERE item='frey' LIMIT 1",
                    [],
                    (err, existing) => {
                        if (existing) {
                            return message.reply(
                                `👑 **Frey** is already owned by <@${existing.user_id}>.\n` +
                                `There can only be one.`
                            );
                        }
                        insertItem(db, user, item, message, u.prestige);
                    }
                );
                return;
            }

            // ✅ Regular prestige item — check if already owned
            db.get(
                "SELECT 1 FROM inventory WHERE user_id=? AND item=?",
                [user, item],
                (err, existing) => {
                    if (existing) return message.reply("❌ You already own this item!");
                    insertItem(db, user, item, message, u.prestige);
                }
            );
        });
    }
};

function insertItem(db, user, item, message, prestige) {
    db.run(
        "INSERT INTO inventory (user_id, item, amount, level) VALUES (?, ?, 1, 1)",
        [user, item],
        (err) => {
            if (err) {
                console.error("pbuy INSERT error:", err.message);
                return message.reply("❌ Purchase failed, try again.");
            }

            const legendary = item === "frey"
                ? "\n👑 **You are the one.**"
                : "";

            message.reply(
                `✅ Purchased **${item}**!${legendary}\n` +
                `🌟 Prestige level stays at **${prestige}**.`
            );
        }
    );
}
