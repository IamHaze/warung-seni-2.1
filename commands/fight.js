const db = require("../database/db");

const AI_NAMES = ["Nexus", "Cipher", "Vulcan", "Siege", "Vortex", "Specter", "Wraith"];
const AI_STRENGTH = [40, 50, 60, 70, 80, 90, 100];

module.exports = {
    name: "fight",
    execute(message) {
        const user = message.author.id;
        const now = Date.now();

        db.get(`SELECT user_id, amount, time FROM ai_rob_log WHERE user_id=?`, [user], (err, rob) => {
            if (!rob) {
                return message.reply("❌ You haven't been robbed by an AI!\n🤖 Wait for the next attack or try `wrob` someone instead.");
            }

            const timePassed = now - rob.time;
            const FIGHT_WINDOW = 5 * 60 * 1000;

            if (timePassed > FIGHT_WINDOW) {
                db.run(`DELETE FROM ai_rob_log WHERE user_id=?`, [user]);
                return message.reply("⏰ Too late! The AI escape window closed.\n💸 Your coins are gone.");
            }

            db.get(`SELECT wallet, level FROM users WHERE user_id=?`, [user], (err, playerData) => {
                if (!playerData) return message.reply("❌ User error");

                const aiName = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
                const aiStr = AI_STRENGTH[Math.floor(Math.random() * AI_STRENGTH.length)];
                const playerStr = Math.max(10, playerData.level * 5);

                const playerRoll = Math.floor(Math.random() * 100) + playerStr;
                const aiRoll = Math.floor(Math.random() * 100) + aiStr;

                const playerWins = playerRoll > aiRoll;

                if (playerWins) {
                    db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [rob.amount, user]);
                    db.run(`DELETE FROM ai_rob_log WHERE user_id=?`, [user]);

                    return message.reply(
                        `⚔️ **AI COMBAT VICTORY!**\n\n` +
                        `You: **${playerRoll}** vs ${aiName}: **${aiRoll}**\n\n` +
                        `💪 You defeated **${aiName}**!\n` +
                        `💰 Reclaimed: **${rob.amount}** coins\n` +
                        `🏆 Justice served!`
                    );
                } else {
                    const extraLoss = Math.floor(rob.amount * 0.2);
                    db.run(`UPDATE users SET wallet = wallet - ? WHERE user_id=?`, [extraLoss, user]);
                    db.run(`DELETE FROM ai_rob_log WHERE user_id=?`, [user]);

                    return message.reply(
                        `⚔️ **AI COMBAT DEFEAT!**\n\n` +
                        `You: **${playerRoll}** vs ${aiName}: **${aiRoll}**\n\n` +
                        `💀 **${aiName}** overwhelmed you!\n` +
                        `💸 Lost an additional **${extraLoss}** coins\n` +
                        `🔥 Total loss: **${rob.amount + extraLoss}**`
                    );
                }
            });
        });
    }
};
