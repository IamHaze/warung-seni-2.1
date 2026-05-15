const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");

const PAGES = [
    `🛒 **ITEM SHOP** — \`wbuy <item> [qty]\` *(Page 1/3)*\n\n` +

    `**━━━ 💼 Income Items ━━━**\n` +
    `🖨️ \`printer\`       — 💰 1,000     | 50/tick\n` +
    `🏭 \`factory\`       — 💰 5,000     | 300/tick\n` +
    `🔬 \`lab\`           — 💰 20,000    | 1,200/tick\n` +
    `⚛️ \`quantum_core\`  — 💰 100,000   | 5,000/tick\n` +
    `🏗️ \`warehouse\`     — 💰 350,000   | 15,000/tick\n\n` +

    `**━━━ ⚔️ Attack Items ━━━**\n` +
    `🔑 \`lockpick\`      — 💰 500       | Required to rob\n` +
    `💻 \`hacker_kit\`    — 💰 2,000     | +15% rob success\n` +
    `⚡ \`emp_device\`    — 💰 5,000     | Bypass all defenses\n` +
    `🚗 \`getaway_car\`   — 💰 3,000     | -50% fine if caught\n\n` +

    `**━━━ 🛡️ Defense Items ━━━**\n` +
    `🐕 \`guard_dog\`     — 💰 3,000     | 25% block rob\n` +
    `🔒 \`safe\`          — 💰 5,000     | Protects 5,000 coins\n` +
    `🚨 \`alarm\`         — 💰 2,000     | DM alert on rob\n` +
    `🏛️ \`vault\`         — 💰 20,000    | Blocks 40% stolen`,

    `🛒 **ITEM SHOP** — \`wbuy <item> [qty]\` *(Page 2/3)*\n\n` +

    `**━━━ 🎣 Fishing Gear ━━━**\n` +
    `🎋 \`bamboo_rod\`    — 💰 500       | Basic rod (72% catch)\n` +
    `⚙️ \`iron_rod\`      — 💰 2,000     | +5% rarity bonus\n` +
    `✨ \`golden_rod\`    — 💰 8,000     | +12% rarity, 15% double catch\n` +
    `💎 \`crystal_rod\`   — 💰 25,000    | +22% rarity, 30% double catch\n` +
    `🪱 \`worm_bait\`     — 💰 300       | +7% catch & +5% rarity (consumable)\n` +
    `✨ \`magic_bait\`    — 💰 1,200     | +10% catch & +20% rarity\n\n` +

    `**━━━ 🎲 Consumables ━━━**\n` +
    `🍀 \`lucky_charm\`   — 💰 1,500     | +10% gamble luck (1h)\n` +
    `⚡ \`energy_drink\`  — 💰 3,000     | Reset all cooldowns (5 min)\n` +
    `🎟️ \`lottery_ticket\`— 💰 500       | Scratch for prize up to 500k\n\n` +

    `**━━━ 👑 Legendary ━━━**\n` +
    `👑 \`shadow_crown\`  — 💰 5,000,000 | 1 per server · 24hr expiry\n` +
    `　　　　　　　　Steal ALL coins & items from target\n\n` +

    `🌟 Prestige items → \`wpshop\``,

    `🛒 **ITEM SHOP** — \`wbuy <item> [qty]\` *(Page 3/3)*\n\n` +

    `**━━━ 🌾 Farming Seeds ━━━**\n` +
    `*Plant with \`wplant <seed>\` · Harvest with \`wharvest\`*\n\n` +

    `🌾 \`wheat_seed\`      — 💰 100    | 10m · Any season    · 150–350\n` +
    `🥕 \`carrot_seed\`     — 💰 80     | 8m  · Any season    · 100–250\n` +
    `🌽 \`corn_seed\`       — 💰 200    | 15m · ☀️ Summer      · 200–500\n` +
    `🍓 \`strawberry_seed\` — 💰 600    | 30m · 🌸 Spring      · 500–1,200\n` +
    `🫐 \`blueberry_seed\`  — 💰 450    | 25m · ☀️ Summer      · 350–900\n` +
    `🎃 \`pumpkin_seed\`    — 💰 1,500  | 60m · 🍂 Fall        · 1k–2,500\n` +
    `🍒 \`cranberry_seed\`  — 💰 1,000  | 45m · 🍂 Fall        · 700–1,800\n` +
    `⭐ \`starfruit_seed\`  — 💰 5,000  | 90m · ☀️ Summer      · 2,500–7,000\n` +
    `🌸 \`ancient_seed\`    — 💰 25,000 | 4h  · Any season 🌟  · 10k–30k\n\n` +

    `**━━━ 🧪 Farm Supplies ━━━**\n` +
    `🧪 \`fertilizer\`      — 💰 500    | Doubles yield (1 use per plot)\n\n` +

    `💡 Out-of-season crops grow **2× slower** · Winter = **3× slower**\n` +
    `💧 \`wwater\` speeds growth 25% · \`wcrops\` to view your farm`
];

module.exports = {
    name: "shop",
    async execute(message) {
        let page = 0;

        const buildRow = (p) => new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("shop_prev")
                .setLabel("◀ Prev")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(p === 0),
            new ButtonBuilder()
                .setCustomId("shop_next")
                .setLabel("Next ▶")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(p === PAGES.length - 1)
        );

        const msg = await message.reply({
            content: PAGES[page],
            components: [buildRow(page)]
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on("collect", async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: "❌ Not your shop menu!", flags: 64 });
            }
            if (interaction.customId === "shop_next") page = Math.min(PAGES.length - 1, page + 1);
            if (interaction.customId === "shop_prev") page = Math.max(0, page - 1);

            await interaction.update({ content: PAGES[page], components: [buildRow(page)] });
        });

        collector.on("end", () => {
            msg.edit({ components: [] }).catch(() => {});
        });
    }
};
