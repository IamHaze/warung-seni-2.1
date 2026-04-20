const db = require("../database/db");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");

const pendingDuels = new Map();
const cooldowns = new Map();
const COOLDOWN = 30000;

const MOVES = ["⚔️ Attack", "🛡️ Defend", "💨 Dodge"];
const MOVE_IDS = ["attack", "defend", "dodge"];

function resolveCombat(aMove, bMove) {
    if (aMove === bMove) return "tie";
    if (
        (aMove === "attack" && bMove === "dodge") ||
        (aMove === "defend" && bMove === "attack") ||
        (aMove === "dodge" && bMove === "defend")
    ) return "a";
    return "b";
}

module.exports = {
    name: "duel",
    async execute(message, args) {
        const challenger = message.author;
        const target = message.mentions.users.first();
        const betArg = args[1]?.toLowerCase();

        if (!target) return message.reply("❌ Usage: `wduel @user <amount|all>`");
        if (target.id === challenger.id) return message.reply("❌ Cannot duel yourself");
        if (target.bot) return message.reply("❌ Cannot duel a bot");

        const now = Date.now();
        const cd = cooldowns.get(challenger.id) || 0;
        if (now < cd) {
            const left = Math.ceil((cd - now) / 1000);
            return message.reply(`⏳ Wait **${left}s** before challenging again`);
        }

        if (pendingDuels.has(challenger.id) || pendingDuels.has(target.id)) {
            return message.reply("❌ Someone in this duel already has a pending challenge.");
        }

        db.get(`SELECT wallet FROM users WHERE user_id=?`, [challenger.id], (err, cRow) => {
            if (err || !cRow) return message.reply("❌ User error");

            const bet = betArg === "all" ? cRow.wallet : parseInt(betArg);
            if (!bet || bet <= 0) return message.reply("❌ Invalid bet amount. Usage: `wduel @user <amount|all>`");
            if (cRow.wallet < bet) return message.reply(`❌ Not enough coins!\n💰 Your wallet: **${cRow.wallet}**`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("duel_accept").setLabel("Accept").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("duel_decline").setLabel("Decline").setStyle(ButtonStyle.Danger)
            );

            message.reply({
                content:
                    `⚔️ **DUEL CHALLENGE!**\n\n` +
                    `<@${challenger.id}> challenges <@${target.id}> to a duel!\n` +
                    `💸 Bet: **${bet}** coins\n\n` +
                    `<@${target.id}> — Accept or Decline?`,
                components: [row]
            }).then(challengeMsg => {
                pendingDuels.set(challenger.id, true);
                pendingDuels.set(target.id, true);

                const collector = challengeMsg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 30000
                });

                collector.on("collect", async interaction => {
                    if (interaction.user.id !== target.id) {
                        return interaction.reply({ content: "❌ This is not your challenge!", flags: 64 });
                    }

                    collector.stop("responded");

                    if (interaction.customId === "duel_decline") {
                        pendingDuels.delete(challenger.id);
                        pendingDuels.delete(target.id);
                        return interaction.update({
                            content: `❌ <@${target.id}> declined the duel.`,
                            components: []
                        });
                    }

                    db.get(`SELECT wallet FROM users WHERE user_id=?`, [target.id], (err, tRow) => {
                        if (err || !tRow || tRow.wallet < bet) {
                            pendingDuels.delete(challenger.id);
                            pendingDuels.delete(target.id);
                            return interaction.update({
                                content: `❌ <@${target.id}> doesn't have enough coins to match the bet (**${bet}**).`,
                                components: []
                            });
                        }

                        interaction.update({
                            content:
                                `⚔️ **DUEL ACCEPTED!**\n\n` +
                                `<@${challenger.id}> vs <@${target.id}>\n` +
                                `💸 Bet: **${bet}** coins each\n\n` +
                                `🎮 Best of 3 rounds — Pick your moves via DM!\n` +
                                `⏳ Waiting for both players to pick their moves...`,
                            components: []
                        }).then(() => {
                            startDuel(message, challenger, target, bet, challengeMsg);
                        });
                    });
                });

                collector.on("end", (_, reason) => {
                    if (reason !== "responded") {
                        pendingDuels.delete(challenger.id);
                        pendingDuels.delete(target.id);
                        challengeMsg.edit({ content: "⏰ Duel challenge expired.", components: [] }).catch(() => {});
                    }
                });
            });
        });
    }
};

async function startDuel(message, challenger, target, bet, channelMsg) {
    const scores = { [challenger.id]: 0, [target.id]: 0 };
    let round = 0;
    const maxRounds = 3;

    cooldowns.set(challenger.id, Date.now() + COOLDOWN);
    cooldowns.set(target.id, Date.now() + COOLDOWN);

    async function playRound() {
        round++;

        const buildMoveRow = (userId) => new ActionRowBuilder().addComponents(
            MOVE_IDS.map((id, i) =>
                new ButtonBuilder()
                    .setCustomId(`move_${id}_${userId}_${round}`)
                    .setLabel(MOVES[i])
                    .setStyle(ButtonStyle.Primary)
            )
        );

        let challengerMove = null;
        let targetMove = null;

        const roundMsg = await channelMsg.reply(
            `⚔️ **ROUND ${round}/${maxRounds}**\n\n` +
            `Score: <@${challenger.id}> **${scores[challenger.id]}** — **${scores[target.id]}** <@${target.id}>\n\n` +
            `Both players: Check your DMs to pick a move!\n` +
            `⏳ 20 seconds to respond...`
        ).catch(() => null);

        async function sendMovePrompt(user) {
            const row = buildMoveRow(user.id);
            try {
                const dm = await user.send({
                    content: `⚔️ **DUEL Round ${round}** — Pick your move!`,
                    components: [row]
                });

                return new Promise(resolve => {
                    const col = dm.createMessageComponentCollector({
                        componentType: ComponentType.Button,
                        time: 20000,
                        filter: i => i.user.id === user.id && i.customId.includes(`_${user.id}_${round}`)
                    });

                    col.on("collect", async i => {
                        const move = i.customId.split("_")[1];
                        await i.update({ content: `✅ You picked: **${MOVES[MOVE_IDS.indexOf(move)]}**`, components: [] });
                        col.stop("picked");
                        resolve(move);
                    });

                    col.on("end", (_, reason) => {
                        if (reason !== "picked") resolve("attack");
                    });
                });
            } catch {
                return "attack";
            }
        }

        [challengerMove, targetMove] = await Promise.all([
            sendMovePrompt(challenger),
            sendMovePrompt(target)
        ]);

        const result = resolveCombat(challengerMove, targetMove);

        let roundResult = "";
        if (result === "tie") {
            roundResult = "🤝 **TIE!** No point awarded.";
        } else if (result === "a") {
            scores[challenger.id]++;
            roundResult = `✅ <@${challenger.id}> wins this round!`;
        } else {
            scores[target.id]++;
            roundResult = `✅ <@${target.id}> wins this round!`;
        }

        const moveLine =
            `<@${challenger.id}>: **${MOVES[MOVE_IDS.indexOf(challengerMove)]}**  vs  ` +
            `<@${target.id}>: **${MOVES[MOVE_IDS.indexOf(targetMove)]}**`;

        if (roundMsg) {
            await roundMsg.edit(
                `⚔️ **ROUND ${round} RESULT**\n\n` +
                `${moveLine}\n\n` +
                `${roundResult}\n` +
                `Score: <@${challenger.id}> **${scores[challenger.id]}** — **${scores[target.id]}** <@${target.id}>`
            ).catch(() => {});
        }

        const cScore = scores[challenger.id];
        const tScore = scores[target.id];
        const roundsLeft = maxRounds - round;

        const cWon = cScore > tScore + roundsLeft;
        const tWon = tScore > cScore + roundsLeft;
        const allDone = round >= maxRounds;

        if (cWon || tWon || allDone) {
            return finalizeDuel(message, challenger, target, bet, scores, cScore === tScore ? null : (cScore > tScore ? challenger : target));
        }

        await new Promise(r => setTimeout(r, 2000));
        playRound();
    }

    playRound();
}

function finalizeDuel(message, challenger, target, bet, scores, winner) {
    pendingDuels.delete(challenger.id);
    pendingDuels.delete(target.id);

    if (!winner) {
        message.channel.send(
            `⚔️ **DUEL OVER — TIE!**\n\n` +
            `<@${challenger.id}> **${scores[challenger.id]}** — **${scores[target.id]}** <@${target.id}>\n` +
            `💰 Bet returned to both players.`
        ).catch(() => {});
        return;
    }

    const loser = winner.id === challenger.id ? target : challenger;

    db.get(`SELECT wallet FROM users WHERE user_id=?`, [loser.id], (err, lRow) => {
        const actualBet = Math.min(bet, lRow?.wallet || 0);

        db.run(`UPDATE users SET wallet = wallet - ? WHERE user_id=?`, [actualBet, loser.id]);
        db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [actualBet, winner.id]);

        message.channel.send(
            `⚔️ **DUEL OVER!**\n\n` +
            `Score: <@${challenger.id}> **${scores[challenger.id]}** — **${scores[target.id]}** <@${target.id}>\n\n` +
            `🏆 Winner: <@${winner.id}>\n` +
            `💰 Winnings: **+${actualBet}** coins`
        ).catch(() => {});
    });
}
