const db = require("../database/db");
const config = require("../config.json");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const cooldowns = new Map();

const SUITS = ["♠️", "♥️", "♦️", "♣️"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function buildDeck() {
    const deck = [];
    for (const suit of SUITS)
        for (const rank of RANKS)
            deck.push({ rank, suit });
    return deck.sort(() => Math.random() - 0.5);
}

function cardValue(rank) {
    if (["J", "Q", "K"].includes(rank)) return 10;
    if (rank === "A") return 11;
    return parseInt(rank);
}

function handTotal(hand) {
    let total = hand.reduce((sum, c) => sum + cardValue(c.rank), 0);
    let aces = hand.filter(c => c.rank === "A").length;
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}

function showHand(hand, hideSecond = false) {
    return hand.map((c, i) => (hideSecond && i === 1) ? "🂠" : `${c.rank}${c.suit}`).join("  ");
}

module.exports = {
    name: "blackjack",
    execute(message, args) {
        const user = message.author.id;
        const bet = parseInt(args[0]);

        if (!bet || bet <= 0) return message.reply("❌ Usage: `wblackjack <amount>`");

        const now = Date.now();
        const cd = cooldowns.get(user) || 0;
        if (now < cd) return message.reply(`⏳ Wait **${Math.ceil((cd - now) / 1000)}s**`);
        cooldowns.set(user, now + 15000);

        db.get(`SELECT wallet FROM users WHERE user_id=?`, [user], (err, row) => {
            if (!row || row.wallet < bet) return message.reply("❌ Not enough money");

            db.run(`UPDATE users SET wallet = wallet - ? WHERE user_id=?`, [bet, user]);

            const deck = buildDeck();
            const playerHand = [deck.pop(), deck.pop()];
            const dealerHand = [deck.pop(), deck.pop()];

            const buildMsg = (hideDealer = true, status = "") => {
                const playerTotal = handTotal(playerHand);
                const dealerTotal = hideDealer ? cardValue(dealerHand[0].rank) : handTotal(dealerHand);
                return (
                    `🃏 **BLACKJACK** — Bet: **${bet}**\n\n` +
                    `🤵 Dealer: ${showHand(dealerHand, hideDealer)} ${hideDealer ? `(${dealerTotal}+?)` : `= **${dealerTotal}**`}\n` +
                    `👤 You:   ${showHand(playerHand)} = **${playerTotal}**\n\n` +
                    (status ? `${status}\n` : "")
                );
            };

            const endGame = async (msg, payout, reason) => {
                if (payout > 0) {
                    db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [payout, user]);
                }
                const net = payout - bet;
                await msg.edit({
                    content: buildMsg(false, `${reason}\n💰 ${net >= 0 ? "+" : ""}**${net}**`),
                    components: []
                });
            };

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("bj_hit").setLabel("Hit").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("bj_stand").setLabel("Stand").setStyle(ButtonStyle.Secondary)
            );

            if (handTotal(playerHand) === 21) {
                const payout = bet + Math.floor(bet * 1.5);
                db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [payout, user]);
                return message.reply(buildMsg(false, `🎉 **BLACKJACK! Natural 21!**\n💰 +**${Math.floor(bet * 1.5)}**`));
            }

            message.reply({ content: buildMsg(), components: [buttons] }).then(msg => {
                const collector = msg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 30000
                });

                collector.on("collect", async interaction => {
                    if (interaction.user.id !== user) {
                        return interaction.reply({ content: "❌ Not your game!", flags: 64 });
                    }

                    await interaction.deferUpdate();

                    if (interaction.customId === "bj_hit") {
                        playerHand.push(deck.pop());
                        const total = handTotal(playerHand);

                        if (total > 21) {
                            collector.stop("done");
                            return endGame(msg, 0, "💥 **BUST! Over 21!**");
                        }

                        if (total === 21) {
                            collector.stop("done");
                            while (handTotal(dealerHand) < 17) dealerHand.push(deck.pop());
                            const dealerTotal = handTotal(dealerHand);
                            if (dealerTotal > 21) return endGame(msg, bet * 2, "🎉 **Dealer bust! You win!**");
                            if (total > dealerTotal) return endGame(msg, bet * 2, "✅ **You win!**");
                            if (total < dealerTotal) return endGame(msg, 0, "❌ **Dealer wins!**");
                            return endGame(msg, bet, "🤝 **Push! Tie game — bet returned**");
                        }

                        return msg.edit({ content: buildMsg(), components: [buttons] });
                    }

                    if (interaction.customId === "bj_stand") {
                        collector.stop("done");
                        while (handTotal(dealerHand) < 17) dealerHand.push(deck.pop());

                        const playerTotal = handTotal(playerHand);
                        const dealerTotal = handTotal(dealerHand);

                        if (dealerTotal > 21) return endGame(msg, bet * 2, "🎉 **Dealer bust! You win!**");
                        if (playerTotal > dealerTotal) return endGame(msg, bet * 2, "✅ **You win!**");
                        if (playerTotal < dealerTotal) return endGame(msg, 0, "❌ **Dealer wins!**");
                        return endGame(msg, bet, "🤝 **Push! Tie game — bet returned**");
                    }
                });

                collector.on("end", (_, reason) => {
                    if (reason === "time") {
                        endGame(msg, 0, "⏰ **Timed out — you lose!**");
                    }
                });
            });
        });
    }
};
