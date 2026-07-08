const db = require("../database/db");
const getUser = require("../core/getUser");
const config = require("../config.json");

const MAX_LEVEL = 15;
const MAX_ITER_GUARD = 5000;

const PRESTIGE_ITEMS = new Set([
    "gold_printer", "ai_factory", "dark_lab",
    "gold_mine", "diamond_mine", "power_plant",
    "oil_refinery", "offshore_drill", "bank", "oil_rig",
    "nuclear_plant", "space_station", "frey",
    "quantum_reactor", "dyson_sphere", "dark_matter_forge",
    "antimatter_engine", "galactic_trade_hub", "void_citadel",
    "nebula_refinery", "cosmic_treasury", "singularity_core",
    "multiverse_gate", "infinity_vault", "omega_forge",
    "eternal_throne", "genesis_engine", "ascension_matrix",
    "divine_nexus", "absolute_zero", "omnipress", "creator_beacon",
    "warung_island"
]);

// Prestige items have a higher upgrade cost multiplier (10x base)
function calcCost(level, prestige) {
    const discount = 1 - (prestige * 0.01);
    return Math.floor(level * 10000 * discount);
}

function upgradeItemToMax(startLevel, wallet, prestige) {
    let level = startLevel;
    let successes = 0, fails = 0, downgrades = 0, cost = 0;
    let stoppedEarly = false;
    let iter = 0;

    while (level < MAX_LEVEL && iter < MAX_ITER_GUARD) {
        iter++;
        const upgCost = calcCost(level, prestige);
        if (wallet < upgCost) { stoppedEarly = true; break; }

        wallet -= upgCost;
        cost += upgCost;

        // Prestige items have slightly higher base success (more prestige = you're a pro)
        const successChance = Math.min(0.95, 0.65 + (prestige * 0.025));
        if (Math.random() < successChance) {
            level++;
            successes++;
        } else {
            fails++;
            if (level > 1 && Math.random() < 0.2) { level--; downgrades++; }
        }
    }

    return { finalLevel: level, successes, fails, downgrades, cost, wallet, stoppedEarly };
}

function buildItemLine(r) {
    if (r.skipped)        return `• **${r.item}** — ✅ Already MAX (lv15)`;
    if (r.brokeBeforeStart) return `• **${r.item}** — 💸 Out of coins (stayed lv${r.startLevel})`;

    const downStr   = r.downgrades > 0 ? ` ⬇️${r.downgrades}` : "";
    const remaining = MAX_LEVEL - r.finalLevel;
    const remStr    = remaining > 0 ? ` *(${remaining} left to max)*` : " 🏆MAX";
    const brokeStr  = r.stoppedEarly ? " 💸 Out of coins" : "";

    return (
        `• **${r.item}** lv${r.startLevel}→**${r.finalLevel}**/15${remStr}\n` +
        `  ✅${r.successes} ❌${r.fails}${downStr} | 💸 ${r.cost.toLocaleString()}${brokeStr}`
    );
}

module.exports = {
    name: "pupgrade",
    execute(message, args) {
        const userId = message.author.id;
        const item   = args[0]?.toLowerCase();
        const amount = Math.max(1, parseInt(args[1]) || 1);

        if (!item) return message.reply(
            "❌ Usage: `wpupgrade <item|all> [times]`\n" +
            "📋 Upgrades prestige items from `wpshop`.\n" +
            "💡 `wpupgrade all` — upgrades every prestige item you own to max"
        );

        getUser(userId, (err, user) => {
            if (err || !user) return message.reply("❌ User error");

            /* ═══════════════════════════════════════
               UPGRADE ALL PRESTIGE ITEMS
            ═══════════════════════════════════════ */
            if (item === "all") {
                const placeholders = [...PRESTIGE_ITEMS].map(() => "?").join(",");
                db.all(
                    `SELECT item, level FROM inventory WHERE user_id=? AND item IN (${placeholders})`,
                    [userId, ...PRESTIGE_ITEMS],
                    (err, rows) => {
                        if (err || !rows || rows.length === 0) {
                            return message.reply(
                                "❌ No prestige items found in inventory.\n" +
                                "🌟 Buy prestige items from `wpshop` first."
                            );
                        }

                        let wallet    = user.wallet;
                        const results = [];

                        for (const row of rows) {
                            const startLevel = row.level || 1;

                            if (startLevel >= MAX_LEVEL) {
                                results.push({ item: row.item, startLevel, finalLevel: MAX_LEVEL, skipped: true });
                                continue;
                            }

                            if (wallet <= 0 || wallet < calcCost(startLevel, user.prestige)) {
                                results.push({ item: row.item, startLevel, finalLevel: startLevel, brokeBeforeStart: true });
                                continue;
                            }

                            const res = upgradeItemToMax(startLevel, wallet, user.prestige);
                            wallet = res.wallet;
                            results.push({ item: row.item, startLevel, ...res });
                        }

                        const spent = user.wallet - wallet;

                        db.serialize(() => {
                            for (const r of results) {
                                if (!r.skipped && !r.brokeBeforeStart) {
                                    db.run(
                                        `UPDATE inventory SET level=? WHERE user_id=? AND item=?`,
                                        [r.finalLevel, userId, r.item]
                                    );
                                }
                            }

                            db.run(`UPDATE users SET wallet=? WHERE user_id=?`, [wallet, userId], (err) => {
                                if (err) return message.reply("❌ DB error saving upgrades");

                                const totalSuccess   = results.reduce((s, r) => s + (r.successes  || 0), 0);
                                const totalFail      = results.reduce((s, r) => s + (r.fails      || 0), 0);
                                const totalDowngrade = results.reduce((s, r) => s + (r.downgrades || 0), 0);
                                const maxedCount     = results.filter(r => r.finalLevel >= MAX_LEVEL && !r.skipped).length;
                                const skippedCount   = results.filter(r => r.skipped).length;

                                const header =
                                    `⬆️ **Prestige Upgrade All**\n\n` +
                                    `📦 Items: **${rows.length}** | 🏆 Maxed: **${maxedCount + skippedCount}** | Already MAX: **${skippedCount}**\n` +
                                    `📊 Overall: ✅${totalSuccess} ❌${totalFail} ⬇️${totalDowngrade}\n` +
                                    `💸 Total Spent: **${spent.toLocaleString()}** | 💰 Remaining: **${wallet.toLocaleString()}**\n\n`;

                                const lines = results.map(buildItemLine).join("\n");

                                // Discord 2000 char limit — send in chunks if needed
                                if ((header + lines).length <= 1950) {
                                    return message.reply(header + lines);
                                }

                                // Chunk into multiple messages
                                const lineArr = results.map(buildItemLine);
                                let chunk = header;
                                const chunks = [];

                                for (const line of lineArr) {
                                    if ((chunk + line + "\n").length > 1950) {
                                        chunks.push(chunk);
                                        chunk = "";
                                    }
                                    chunk += line + "\n";
                                }
                                if (chunk) chunks.push(chunk);

                                // Send first chunk as reply, rest as follow-ups
                                message.reply(chunks[0]).then(() => {
                                    for (let i = 1; i < chunks.length; i++) {
                                        message.channel.send(chunks[i]).catch(() => {});
                                    }
                                });
                            });
                        });
                    }
                );
                return;
            }

            /* ═══════════════════════════════════════
               UPGRADE SINGLE PRESTIGE ITEM
            ═══════════════════════════════════════ */
            if (!PRESTIGE_ITEMS.has(item)) {
                return message.reply(
                    `❌ **${item}** is not a prestige item.\n` +
                    `Use \`wupgrade ${item}\` for regular items, or \`wpshop\` to see prestige items.`
                );
            }

            db.get(
                `SELECT * FROM inventory WHERE user_id=? AND item=?`,
                [userId, item],
                (err, inv) => {
                    if (!inv) return message.reply(`❌ You don't own **${item}**.\n🌟 Buy it with \`wpbuy ${item}\``);

                    let level      = inv.level || 1;
                    let wallet     = user.wallet;
                    let successes  = 0, fails = 0, downgrades = 0, totalCost = 0;
                    const startLvl = level;

                    for (let i = 0; i < amount; i++) {
                        if (level >= MAX_LEVEL) {
                            if (i === 0) return message.reply(`⚠️ **${item}** is already at max level (${MAX_LEVEL})!`);
                            break;
                        }

                        const cost = calcCost(level, user.prestige);
                        if (wallet < cost) {
                            if (i === 0) return message.reply(
                                `❌ Not enough money!\n` +
                                `💸 Next upgrade: **${cost.toLocaleString()}** | 💰 Wallet: **${wallet.toLocaleString()}**\n` +
                                `📊 Current level: **${level}**/15`
                            );
                            break;
                        }

                        wallet -= cost;
                        totalCost += cost;

                        const successChance = Math.min(0.95, 0.65 + (user.prestige * 0.025));
                        if (Math.random() < successChance) {
                            level++;
                            successes++;
                        } else {
                            fails++;
                            if (level > 1 && Math.random() < 0.2) { level--; downgrades++; }
                        }
                    }

                    db.serialize(() => {
                        db.run(`UPDATE inventory SET level=? WHERE user_id=? AND item=?`, [level, userId, item]);
                        db.run(`UPDATE users SET wallet=? WHERE user_id=?`, [wallet, userId], (err) => {
                            if (err) return message.reply("❌ DB error saving upgrade");

                            const remaining = MAX_LEVEL - level;
                            const remStr    = remaining > 0 ? `*(${remaining} more to max)*` : "🏆 **MAX REACHED!**";
                            const downStr   = downgrades > 0 ? ` | ⬇️ Downgrades: **${downgrades}**` : "";

                            message.reply(
                                `⬆️ **Prestige Upgrade — ${item}**\n\n` +
                                `✅ Success: **${successes}** | ❌ Fail: **${fails}**${downStr}\n` +
                                `📊 Level: **${startLvl}** → **${level}**/15 ${remStr}\n` +
                                `💸 Spent: **${totalCost.toLocaleString()}** | 💰 Remaining: **${wallet.toLocaleString()}**`
                            );
                        });
                    });
                }
            );
        });
    }
};
