const db = require("../database/db");
const getUser = require("./getUser");
const config = require("../config.json");

// Prevents double-crediting if the same reaction event somehow fires twice
// (resets on bot restart — acceptable as a lightweight safety net, not a hard guarantee)
const rewardedMessages = new Set();

async function handleWordChainReaction(reaction, user, client) {
    try {
        const wc = config.wordChain;
        if (!wc || !wc.botId || !wc.channelId || !wc.successEmoji) return;

        // Resolve partials early so channelId is reliably available
        if (reaction.partial) {
            try { await reaction.fetch(); } catch (e) {
                console.log(`🔍 [wordChain debug] Failed to fetch partial reaction: ${e.message}`);
                return;
            }
        }
        if (reaction.message.partial) {
            try { await reaction.message.fetch(); } catch (e) {
                console.log(`🔍 [wordChain debug] Failed to fetch partial message: ${e.message}`);
                return;
            }
        }

        // 🔍 WIDE DEBUG — logs EVERY reaction event the bot sees, no filtering yet.
        // Remove this whole block once the channel/bot ID matching is confirmed working.
        console.log(
            `🔍 [wordChain debug] Reaction seen → ` +
            `channel="${reaction.message.channelId}" (expected="${wc.channelId}") | ` +
            `reactedBy="${user.id}" username="${user.username}" (expected botId="${wc.botId}") | ` +
            `emoji.name="${reaction.emoji.name}" emoji.id="${reaction.emoji.id}"`
        );

        // Only care about reactions in the configured word-chain channel
        if (reaction.message.channelId !== wc.channelId) return;

        // Only care about reactions added BY the word chain bot itself
        if (user.id !== wc.botId) return;

        const emoji = reaction.emoji;

        // Match configured emoji — supports both unicode (name) and custom emoji (id)
        const matches =
            wc.successEmoji === emoji.name ||
            (emoji.id && wc.successEmoji === emoji.id);

        console.log(`🔍 [wordChain debug] Passed channel+bot filter. Emoji match=${matches}`);

        if (!matches) return;

        const targetMessage = reaction.message;
        const player = targetMessage.author;

        if (!player || player.bot) return; // don't reward if somehow the reacted message is from a bot

        const msgKey = `${targetMessage.id}`;
        if (rewardedMessages.has(msgKey)) return;
        rewardedMessages.add(msgKey);

        // Keep the Set from growing forever
        if (rewardedMessages.size > 5000) {
            const first = rewardedMessages.values().next().value;
            rewardedMessages.delete(first);
        }

        const reward = wc.reward || 0;
        if (reward <= 0) return;

        getUser(player.id, (err) => {
            if (err) return console.error("wordChainReward getUser error:", err);

            db.run(
                `UPDATE users SET wallet = wallet + ? WHERE user_id=?`,
                [reward, player.id],
                (err) => {
                    if (err) return console.error("wordChainReward UPDATE error:", err);
                    console.log(`🔗 Word chain reward: +${reward.toLocaleString()} to ${player.username} (${player.id})`);
                }
            );
        });

        // Optional visual confirmation — economy bot stacks its own reaction to show credit was given
        if (wc.confirmEmoji) {
            targetMessage.react(wc.confirmEmoji).catch(() => {});
        }

        // Announcement in the event channel
        if (client && config.eventChannel) {
            const announceChannel = client.channels.cache.get(config.eventChannel);
            if (announceChannel) {
                const wordUsed = targetMessage.content
                    ? targetMessage.content.slice(0, 100)
                    : null;

                announceChannel.send(
                    `🔗 **WORD CHAIN SUCCESS!**\n\n` +
                    `🏆 <@${player.id}> kept the chain alive${wordUsed ? ` with **"${wordUsed}"**` : ""}!\n` +
                    `💰 Reward: **+${reward.toLocaleString()}** coins\n` +
                    `[Jump to message](${targetMessage.url})`
                ).catch(() => {});
            }
        }
    } catch (err) {
        console.error("wordChainReward handler error:", err);
    }
}

module.exports = { handleWordChainReaction };
