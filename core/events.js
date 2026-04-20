const db = require("../database/db");
const config = require("../config.json");

// 🎯 Active drop tracking
let activeDrop = null;

function startEvents(client) {

    /* ================= DROP / JACKPOT EVENTS ================= */
    setInterval(() => {
        const channel = client.channels.cache.get(config.eventChannel);
        if (!channel) {
            console.log("⚠️ Event channel not found:", config.eventChannel);
            return;
        }

        const isJackpot = Math.random() < config.events.boom_chance;
        const amount = isJackpot
            ? config.events.drop_amount * 5
            : config.events.drop_amount;

        activeDrop = { amount, claimedBy: null };

        if (isJackpot) {
            channel.send(
                `💎 **JACKPOT EVENT!**\n` +
                `First to type \`wclaim\` wins **${amount}** coins!`
            );
        } else {
            channel.send(
                `🎁 **DROP EVENT!**\n` +
                `First to type \`wclaim\` wins **${amount}** coins!`
            );
        }

        // Auto-expire drop after 60 seconds
        setTimeout(() => {
            if (activeDrop && !activeDrop.claimedBy) {
                activeDrop = null;
                channel.send(`⏰ The drop expired unclaimed!`);
            }
        }, 60000);

    }, config.events.drop_interval);

    /* ================= SHADOW BROKER — AI ROBBERY ================= */
    scheduleShadowBroker(client);
}

function scheduleShadowBroker(client) {
    // Random interval: 20–60 minutes
    const minMs = 20 * 60 * 1000;
    const maxMs = 60 * 60 * 1000;
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

    console.log(`🕵️ Shadow Broker scheduled in ${Math.round(delay / 60000)} minutes`);

    setTimeout(() => {
        runShadowBroker(client);
        // Schedule next one after this runs
        scheduleShadowBroker(client);
    }, delay);
}

function runShadowBroker(client) {
    const channel = client.channels.cache.get(config.eventChannel);
    if (!channel) return;

    // 🏆 Grab top 10 richest players with enough wallet to rob
    db.all(
        `SELECT user_id, wallet FROM users
         WHERE wallet > 1000
         ORDER BY wallet DESC
         LIMIT 10`,
        [],
        async (err, rows) => {
            if (err || !rows || rows.length === 0) {
                console.log("🕵️ Shadow Broker: No valid targets found");
                return;
            }

            // 🎯 Pick random target from top 10
            const target = rows[Math.floor(Math.random() * rows.length)];

            let username = "Unknown";
            try {
                const user = await client.users.fetch(target.user_id);
                username = user.username;
            } catch {}

            // 💀 Steal 5–20% of their wallet
            const stealPercent = (Math.random() * 15 + 5) / 100;
            const stealAmount = Math.floor(target.wallet * stealPercent);

            // ⚠️ Warning phase — 30 seconds to deposit
            channel.send(
                `🚨 **SHADOW BROKER ALERT**\n\n` +
                `🕵️ The Shadow Broker has locked onto a target...\n` +
                `🎯 Target: **${username}**\n\n` +
                `⏳ **30 seconds** to \`wdep\` your coins to the bank!\n` +
                `💀 Amount at risk: **${stealAmount}** coins`
            );

            console.log(`🕵️ Shadow Broker targeting ${username} for ${stealAmount}`);

            // 💀 Strike after 30 seconds
            setTimeout(() => {
                // Re-fetch wallet in case they deposited
                db.get(
                    `SELECT wallet FROM users WHERE user_id=?`,
                    [target.user_id],
                    (err, fresh) => {
                        if (err || !fresh) return;

                        // If they moved their coins, steal less
                        const actualSteal = Math.min(stealAmount, fresh.wallet);

                        if (actualSteal <= 0) {
                            channel.send(
                                `😤 **Shadow Broker**: *${username} moved their coins in time. Next time...*`
                            );
                            return;
                        }

                        db.run(
                            `UPDATE users SET wallet = wallet - ? WHERE user_id=?`,
                            [actualSteal, target.user_id],
                            (err) => {
                                if (err) return;

                                channel.send(
                                    `💀 **SHADOW BROKER STRIKES!**\n\n` +
                                    `🕵️ Target: **${username}**\n` +
                                    `💸 Stolen: **${actualSteal}** coins\n\n` +
                                    `*The Shadow Broker vanishes into the dark...*`
                                );

                                console.log(`🕵️ Shadow Broker stole ${actualSteal} from ${username}`);
                            }
                        );
                    }
                );
            }, 30000);
        }
    );
}

function claimDrop(userId) {
    if (!activeDrop || activeDrop.claimedBy) return null;
    activeDrop.claimedBy = userId;
    const claimed = { amount: activeDrop.amount };
    activeDrop = null;
    return claimed;
}

module.exports = { startEvents, getActiveDrop: () => activeDrop, clearActiveDrop: () => { activeDrop = null; }, claimDrop };
