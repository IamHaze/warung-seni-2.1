const db = require("../database/db");
const config = require("../config.json");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");

const cooldowns = new Map();
const COOLDOWN = 30000;

const FISH = [
    { name: "Old Boot",        emoji: "👢", value: 5,         weight: 25, rarity: "Junk" },
    { name: "Seaweed",         emoji: "🌿", value: 10,        weight: 20, rarity: "Junk" },
    { name: "Sardine",         emoji: "🐟", value: 50,        weight: 18, rarity: "Common" },
    { name: "Mackerel",        emoji: "🐟", value: 100,       weight: 12, rarity: "Common" },
    { name: "Bass",            emoji: "🐟", value: 250,       weight: 8,  rarity: "Uncommon" },
    { name: "Salmon",          emoji: "🐟", value: 500,       weight: 6,  rarity: "Uncommon" },
    { name: "Tuna",            emoji: "🐟", value: 1000,      weight: 4,  rarity: "Rare" },
    { name: "Swordfish",       emoji: "⚔️", value: 2500,     weight: 3,  rarity: "Rare" },
    { name: "Pufferfish",      emoji: "🐡", value: 5000,      weight: 2,  rarity: "Epic" },
    { name: "Anglerfish",      emoji: "🔦", value: 10000,     weight: 1.2, rarity: "Epic" },
    { name: "Golden Koi",      emoji: "✨", value: 25000,     weight: 0.5, rarity: "Legendary" },
    { name: "Phantom Marlin",  emoji: "👻", value: 50000,     weight: 0.3, rarity: "Legendary" },
    { name: "Leviathan",       emoji: "🐉", value: 200000,    weight: 0.1, rarity: "Mythic" }
];

const RARITY_COLORS = {
    "Junk": "⚫",
    "Common": "⚪",
    "Uncommon": "🟢",
    "Rare": "🔵",
    "Epic": "🟣",
    "Legendary": "🟡",
    "Mythic": "🔴"
};

const LOCATIONS = [
    { name: "Pond",       emoji: "🏞️",  bonus: 1.0, desc: "Peaceful and calm" },
    { name: "River",      emoji: "🌊",  bonus: 1.2, desc: "Flowing waters" },
    { name: "Lake",       emoji: "🏔️",  bonus: 1.5, desc: "Deep and mysterious" },
    { name: "Ocean",      emoji: "🌊",  bonus: 2.0, desc: "Vast and wild" },
    { name: "Abyss",      emoji: "🕳️",  bonus: 3.0, desc: "Dark and dangerous" }
];

function pickFish() {
    const totalWeight = FISH.reduce((sum, f) => sum + f.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const fish of FISH) {
        roll -= fish.weight;
        if (roll <= 0) return fish;
    }
    return FISH[0];
}

function pickLocation(level) {
    if (level >= 30) return LOCATIONS[4];
    if (level >= 20) return LOCATIONS[3];
    if (level >= 10) return LOCATIONS[2];
    if (level >= 5) return LOCATIONS[1];
    return LOCATIONS[0];
}

module.exports = {
    name: "fish",
    execute(message, args) {
        const user = message.author.id;
        const now = Date.now();
        const cd = cooldowns.get(user) || 0;

        if (now < cd) {
            db.get(`SELECT expires_at FROM buffs WHERE user_id=? AND buff='energy_drink' AND expires_at > ?`, [user, now], (err, drink) => {
                if (!drink) {
                    const left = Math.ceil((cd - now) / 1000);
                    return message.reply(`⏳ Wait **${left}s** before fishing again`);
                }
                cooldowns.set(user, 0);
                goFish();
            });
            return;
        }

        cooldowns.set(user, now + COOLDOWN);
        goFish();

        function goFish() {
            db.get(`SELECT wallet, level, prestige FROM users WHERE user_id=?`, [user], (err, u) => {
                if (err || !u) return message.reply("❌ User error");

                const location = pickLocation(u.level || 1);
                const fish = pickFish();
                const baseValue = Math.floor(fish.value * location.bonus);
                const prestigeBonus = 1 + ((u.prestige || 0) * 0.05);
                const finalValue = Math.floor(baseValue * prestigeBonus);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("fish_reel")
                        .setLabel("Reel In!")
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji("🎣"),
                    new ButtonBuilder()
                        .setCustomId("fish_release")
                        .setLabel("Release")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji("🌊")
                );

                message.reply(
                    `🎣 **FISHING** — ${location.emoji} ${location.name}\n\n` +
                    `Something is biting... Reel it in!\n` +
                    `⏳ You have **10 seconds** to react!\n\n` +
                    `*${location.desc}*`,
                    { components: [row] }
                ).then(fishMsg => {
                    const collector = fishMsg.createMessageComponentCollector({
                        componentType: ComponentType.Button,
                        time: 10000,
                        max: 1,
                        filter: i => i.user.id === user
                    });

                    let resolved = false;

                    collector.on("collect", async (interaction) => {
                        resolved = true;

                        if (interaction.customId === "fish_release") {
                            await interaction.update({
                                content:
                                    `🌊 **Released!**\n\n` +
                                    `You let the fish go. Maybe next time!\n` +
                                    `🎣 Keep fishing with \`wfish\``,
                                components: []
                            });
                            return;
                        }

                        const catchRoll = Math.random();
                        let catchRate = 0.85;
                        if (fish.rarity === "Epic") catchRate = 0.7;
                        if (fish.rarity === "Legendary") catchRate = 0.5;
                        if (fish.rarity === "Mythic") catchRate = 0.3;

                        if (catchRoll > catchRate) {
                            await interaction.update({
                                content:
                                    `🎣 **It got away!**\n\n` +
                                    `${fish.emoji} **${fish.name}** slipped off the hook!\n` +
                                    `${RARITY_COLORS[fish.rarity]} ${fish.rarity}\n\n` +
                                    `Better luck next time...`,
                                components: []
                            });
                            return;
                        }

                        db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [finalValue, user]);

                        let streak = "";
                        if (fish.rarity === "Legendary") streak = "\n🌟 **LEGENDARY CATCH!**";
                        if (fish.rarity === "Mythic") streak = "\n🔥 **MYTHIC CATCH!!**";

                        await interaction.update({
                            content:
                                `🎣 **CAUGHT!**${streak}\n\n` +
                                `${fish.emoji} **${fish.name}**\n` +
                                `${RARITY_COLORS[fish.rarity]} ${fish.rarity}\n` +
                                `📍 ${location.emoji} ${location.name} (x${location.bonus})\n` +
                                `💰 +**${finalValue.toLocaleString()}** coins` +
                                (u.prestige > 0 ? `\n🌟 Prestige Bonus: x${prestigeBonus.toFixed(2)}` : ""),
                            components: []
                        });
                    });

                    collector.on("end", (_, reason) => {
                        if (!resolved && reason === "time") {
                            fishMsg.edit({
                                content:
                                    `⏰ **Too slow!**\n\n` +
                                    `The fish swam away while you were daydreaming...\n` +
                                    `🎣 Try again with \`wfish\``,
                                components: []
                            }).catch(() => {});
                        }
                    });
                });
            });
        }
    }
};
