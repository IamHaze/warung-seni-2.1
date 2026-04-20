const db = require("../database/db");

const REQUIREMENTS = {
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
    frey:           10
};

module.exports = {
    name: "pbuy",
    execute(message, args) {
        const user = message.author.id;
        const item = args[0];

        if (!item) {
            return claimAll(db, user, message);
        }

        if (REQUIREMENTS[item] === undefined) {
            return message.reply("❌ Invalid item. Use `wpshop` to see available items.");
        }

        db.get("SELECT prestige FROM users WHERE user_id=?", [user], (err, u) => {
            if (err || !u) return message.reply("❌ User error");

            if (u.prestige < REQUIREMENTS[item]) {
                return message.reply(
                    `❌ **${item}** requires **Prestige ${REQUIREMENTS[item]}**.\n` +
                    `You are currently Prestige **${u.prestige}**.`
                );
            }

            if (item === "frey") {
                db.get("SELECT user_id FROM inventory WHERE item='frey' LIMIT 1", [], (err, existing) => {
                    if (existing) {
                        return message.reply(
                            `👑 **Frey** is already owned by <@${existing.user_id}>.\n` +
                            `There can only be one.`
                        );
                    }
                    insertItem(db, user, item, message, u.prestige);
                });
                return;
            }

            db.get("SELECT 1 FROM inventory WHERE user_id=? AND item=?", [user, item], (err, existing) => {
                if (existing) return message.reply("❌ You already own this item!");
                insertItem(db, user, item, message, u.prestige);
            });
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

            const legendary = item === "frey" ? "\n👑 **You are the one.**" : "";

            message.reply(
                `✅ Purchased **${item}**!${legendary}\n` +
                `🌟 Prestige level stays at **${prestige}**.`
            );
        }
    );
}

function claimAll(db, user, message) {
    db.get("SELECT prestige FROM users WHERE user_id=?", [user], (err, u) => {
        if (err || !u) return message.reply("❌ User error");

        const prestige = u.prestige || 0;

        const eligible = Object.entries(REQUIREMENTS)
            .filter(([item, req]) => item !== "frey" && prestige >= req)
            .map(([item]) => item);

        if (eligible.length === 0) {
            return message.reply(
                `❌ You need at least **Prestige 1** to claim any prestige items.\n` +
                `Current prestige: **${prestige}**\n` +
                `Use \`wpshop\` to see what's available.`
            );
        }

        db.all(
            `SELECT item FROM inventory WHERE user_id=? AND item IN (${eligible.map(() => "?").join(",")})`,
            [user, ...eligible],
            (err, owned) => {
                const ownedSet = new Set((owned || []).map(r => r.item));
                const toAdd = eligible.filter(item => !ownedSet.has(item));

                if (toAdd.length === 0) {
                    return message.reply(
                        `✅ You already own all prestige items available at Prestige **${prestige}**!\n` +
                        `Prestige up to unlock more. Use \`wpshop\` to see requirements.`
                    );
                }

                let inserted = 0;
                let failed = 0;

                toAdd.forEach((item, idx) => {
                    db.run(
                        "INSERT INTO inventory (user_id, item, amount, level) VALUES (?, ?, 1, 1)",
                        [user, item],
                        (err) => {
                            if (err) {
                                console.error(`pbuy claimAll INSERT error for ${item}:`, err.message);
                                failed++;
                            } else {
                                inserted++;
                            }

                            if (idx === toAdd.length - 1) {
                                message.reply(
                                    `🌟 **Prestige Shop — Batch Claim**\n\n` +
                                    `✅ Claimed **${inserted}** item(s):\n` +
                                    toAdd.map(i => `• **${i}**`).join("\n") +
                                    (failed > 0 ? `\n❌ ${failed} failed` : "") +
                                    `\n\n🌟 Prestige stays at **${prestige}**.`
                                );
                            }
                        }
                    );
                });
            }
        );
    });
}
