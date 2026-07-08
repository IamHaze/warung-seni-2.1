const db = require("../database/db");
const config = require("../config.json");

function startShadowBroker(client) {
    scheduleShadowBroker(client);
}

function scheduleShadowBroker(client) {
    const minMs = 20 * 60 * 1000;
    const maxMs = 60 * 60 * 1000;
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

    console.log(`🕵️ Shadow Broker scheduled in ${Math.round(delay / 60000)} minutes`);

    setTimeout(() => {
        runShadowBroker(client);
        scheduleShadowBroker(client);
    }, delay);
}

function runShadowBroker(client) {
    const channel = client.channels.cache.get(config.eventChannel);
    if (!channel) return;

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

            const target = rows[Math.floor(Math.random() * rows.length)];

            let username = "Unknown";
            try {
                const user = await client.users.fetch(target.user_id);
                username = user.username;
            } catch {}

            const stealPercent = (Math.random() * 15 + 5) / 100;
            const stealAmount = Math.floor(target.wallet * stealPercent);

            channel.send(
                `🚨 **SHADOW BROKER ALERT**\n\n` +
                `🕵️ The Shadow Broker has locked onto a target...\n` +
                `🎯 Target: <@${target.user_id}>\n\n` +
                `⏳ **30 seconds** to \`wdep\` your coins to the bank!\n` +
                `💀 Amount at risk: **${stealAmount}** coins`
            );

            console.log(`🕵️ Shadow Broker targeting ${username} for ${stealAmount}`);

            setTimeout(() => {
                db.get(
                    `SELECT wallet FROM users WHERE user_id=?`,
                    [target.user_id],
                    (err, fresh) => {
                        if (err || !fresh) return;

                        const actualSteal = Math.min(stealAmount, fresh.wallet);

                        if (actualSteal <= 0) {
                            channel.send(
                                `😤 **Shadow Broker**: *<@${target.user_id}> moved their coins in time. Next time...*`
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
                                    `🕵️ Target: <@${target.user_id}>\n` +
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

module.exports = { startShadowBroker };
