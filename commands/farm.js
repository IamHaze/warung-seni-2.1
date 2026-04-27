const db = require("../database/db");
const config = require("../config.json");
const getPrestigeBonus = require("../core/prestigeBonus");

const cooldowns = new Map();
const COOLDOWN = 60000;

const CODES = [
    "HARVEST", "PLANT", "GROW", "FARM", "CROP",
    "SEED", "WATER", "SUN", "RAIN", "SOIL",
    "YIELD", "PLOW", "REAP", "SOW", "BARN"
];

const DIFFICULTIES = [
    { name: "Easy",   codes: 1, time: 15000, mult: 0.3 },
    { name: "Medium", codes: 2, time: 20000, mult: 0.5 },
    { name: "Hard",   codes: 3, time: 25000, mult: 0.8 }
];

function randomCode() {
    return CODES[Math.floor(Math.random() * CODES.length)];
}

module.exports = {
    name: "farm",
    execute(message, args) {
        const user = message.author.id;
        const now = Date.now();
        const cd = cooldowns.get(user) || 0;

        if (now < cd) {
            db.get(`SELECT expires_at FROM buffs WHERE user_id=? AND buff='energy_drink' AND expires_at > ?`, [user, now], (err, drink) => {
                if (!drink) {
                    const left = Math.ceil((cd - now) / 1000);
                    return message.reply(`⏳ Wait **${left}s** before farming again`);
                }
                cooldowns.set(user, 0);
                startFarm();
            });
            return;
        }

        cooldowns.set(user, now + COOLDOWN);
        startFarm();

        function startFarm() {
            db.get(`SELECT wallet, level, prestige FROM users WHERE user_id=?`, [user], (err, u) => {
                if (err || !u) return message.reply("❌ User error");

                db.all(
                    `SELECT item, amount FROM inventory WHERE user_id=? AND item IN ('printer','factory','lab','quantum_core','warehouse','gold_printer','ai_factory','dark_lab','gold_mine','diamond_mine','power_plant','oil_refinery','offshore_drill','bank','oil_rig','nuclear_plant','space_station','quantum_reactor','dyson_sphere','dark_matter_forge','antimatter_engine','galactic_trade_hub','void_citadel','nebula_refinery','cosmic_treasury','singularity_core','multiverse_gate','infinity_vault','omega_forge','eternal_throne','genesis_engine','frey','warung_island')`,
                    [user],
                    (err, items) => {
                        if (!items || items.length === 0) {
                            return message.reply(
                                `🌾 **Farm**\n\n` +
                                `You don't own any income items yet!\n` +
                                `🛒 Buy some with \`wshop\` or \`wpshop\``
                            );
                        }

                        let totalIncome = 0;
                        items.forEach(inv => {
                            const itemData = config.items[inv.item];
                            if (itemData && itemData.income) {
                                totalIncome += itemData.income * inv.amount;
                            }
                        });

                        if (totalIncome <= 0) {
                            return message.reply("❌ Your items generate no income.");
                        }

                        const levelBonus = 1 + (u.level * (config.farm?.level_bonus || 0.05));
                        const prestigeBonus = getPrestigeBonus(u.prestige || 0, config);
                        const baseIncome = Math.floor(totalIncome * levelBonus * prestigeBonus);

                        const diff = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];
                        const farmCodes = [];
                        for (let i = 0; i < diff.codes; i++) {
                            farmCodes.push(randomCode());
                        }

                        const codeStr = farmCodes.map(c => `\`${c}\``).join("  ");

                        message.reply(
                            `🌾 **FARM COLLECTION** — ${diff.name}\n\n` +
                            `Type the code(s) within **${diff.time / 1000}s** to collect!\n` +
                            `💰 Potential income: **${baseIncome.toLocaleString()}** (x${diff.mult} if you succeed)\n\n` +
                            `🔑 Code: ${codeStr}`
                        );

                        const filter = m => m.author.id === user;
                        const collector = message.channel.createMessageCollector({ filter, time: diff.time, max: 1 });

                        collector.on("collect", (m) => {
                            const input = m.content.trim().toUpperCase();
                            const expected = farmCodes.join(" ");
                            const inputNorm = input.replace(/\s+/g, " ");

                            if (inputNorm === expected || inputNorm === farmCodes.join("")) {
                                const earned = Math.floor(baseIncome * diff.mult);
                                db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [earned, user]);
                                message.reply(
                                    `✅ **Farm Collected!**\n\n` +
                                    `🌾 Difficulty: **${diff.name}** (x${diff.mult})\n` +
                                    `💰 Earned: **${earned.toLocaleString()}**\n` +
                                    `📈 Level Bonus: x${levelBonus.toFixed(2)} | 🌟 Prestige Bonus: x${prestigeBonus.toFixed(2)}`
                                );
                            } else {
                                const halfIncome = Math.floor(baseIncome * 0.5);
                                db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [halfIncome, user]);
                                message.reply(
                                    `❌ **Wrong code!**\n\n` +
                                    `Expected: **${codeStr}**\n` +
                                    `You got: **${input}**\n\n` +
                                    `💰 Half income collected: **${halfIncome.toLocaleString()}** (50% penalty)`
                                );
                            }
                        });

                        collector.on("end", (collected, reason) => {
                            if (reason === "time" && collected.size === 0) {
                                const quarterIncome = Math.floor(baseIncome * 0.25);
                                db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [quarterIncome, user]);
                                message.reply(
                                    `⏰ **Farm timed out!**\n\n` +
                                    `💰 Late collection: **${quarterIncome.toLocaleString()}** (75% penalty)`
                                );
                            }
                        });
                    }
                );
            });
        }
    }
};
