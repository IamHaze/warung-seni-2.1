const db = require("../database/db");
const config = require("../config.json");

const cooldowns = new Map();

module.exports = {
    name: "gamble",
    execute(message, args) {
        const user = message.author.id;
        const betArg = args[0]?.toLowerCase();

        if (!betArg) return message.reply("❌ Usage: `wgamble <amount|all>`  |  Alias: `wgb`");

        const now = Date.now();
        const cd = cooldowns.get(user) || 0;

        db.get(`SELECT wallet FROM users WHERE user_id=?`, [user], (err, data) => {
            if (!data) return message.reply("❌ User error");

            const bet = betArg === "all" ? data.wallet : parseInt(betArg);

            if (!bet || bet <= 0) return message.reply("❌ Invalid amount");
            if (data.wallet < bet) return message.reply("❌ Not enough money");

            if (now < cd) {
                db.get(`SELECT expires_at FROM buffs WHERE user_id=? AND buff='energy_drink' AND expires_at > ?`, [user, now], (err, drink) => {
                    if (!drink) {
                        const left = Math.ceil((cd - now) / 1000);
                        return message.reply(`⏳ Wait **${left}s**`);
                    }
                    cooldowns.set(user, 0);
                    runGamble(bet);
                });
            } else {
                cooldowns.set(user, now + config.cooldowns.gamble);
                runGamble(bet);
            }
        });

        function runGamble(bet) {
            db.get(`SELECT wallet FROM users WHERE user_id=?`, [user], (err, data) => {
                if (!data || data.wallet < bet) {
                    return message.reply("❌ Not enough money");
                }

                db.get(
                    `SELECT expires_at FROM buffs WHERE user_id=? AND buff='lucky_charm' AND expires_at > ?`,
                    [user, Date.now()],
                    (err, charm) => {
                        const hasCharm = !!charm;
                        const roll = hasCharm ? Math.min(Math.random() + 0.1, 1) : Math.random();

                        let multiplier = 0;
                        let heatGain = 0;
                        let result = "";

                        if (roll < config.gamble.jackpot_chance) {
                            multiplier = 5; heatGain = 3; result = "💎 JACKPOT!";
                        } else if (roll < 0.25) {
                            multiplier = 2; heatGain = 2; result = "🎉 Double!";
                        } else if (roll < 0.5) {
                            multiplier = 1; result = "😐 Even";
                        } else {
                            multiplier = 0; heatGain = 1; result = "💀 Lost";
                        }

                        const winnings = Math.floor(bet * multiplier);
                        const net = winnings - bet;

                        db.run("UPDATE users SET wallet = wallet + ?, heat = heat + ? WHERE user_id=?", [net, heatGain, user]);
                        message.reply(`🎰 ${result}${hasCharm ? " 🍀" : ""}\n💸 Bet: **${bet.toLocaleString()}** | 💰 ${net >= 0 ? "+" : ""}**${net.toLocaleString()}**`);
                    }
                );
            });
        }
    }
};
