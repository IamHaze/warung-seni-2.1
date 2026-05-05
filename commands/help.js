const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");

const PAGES = [
    {
        title: "📋 All Commands — Overview",
        color: "📋",
        content:
            `Use the buttons below to browse each category.\n\n` +
            `**Prefix:** \`w\`\n` +
            `**Example:** \`wbal\`, \`wwork\`, \`wbj 500\`\n\n` +
            `**━━━ Categories ━━━**\n` +
            `💰 Page 2 — Economy & Balance\n` +
            `🎰 Page 3 — Gambling\n` +
            `⚔️ Page 4 — Crime & Combat\n` +
            `🏭 Page 5 — Income & Items\n` +
            `🎒 Page 6 — Inventory & Shop\n` +
            `🐾 Page 7 — Pets\n` +
            `👑 Page 8 — Prestige\n` +
            `🛡️ Page 9 — Admin\n\n` +
            `**━━━ Quick Tips ━━━**\n` +
            `• Most commands support \`all\` as an amount\n` +
            `• Short aliases save typing — shown in [ ]\n` +
            `• 🔥 Heat increases fines & reduces rob success\n` +
            `• 🌟 Prestige boosts income & unlocks new items`
    },
    {
        title: "💰 Economy & Balance",
        content:
            `**━━━ Balance ━━━**\n` +
            `\`wbal\` — Check your wallet, bank & prestige\n` +
            `\`wtop\` — Global leaderboard (paginated)\n` +
            `\`wrank\` — See your rank on the leaderboard\n` +
            `\`wheat\` — Check your current heat level\n\n` +

            `**━━━ Banking ━━━**\n` +
            `\`wdep <amount|all>\` — Deposit coins to bank\n` +
            `\`wwith <amount|all>\` — Withdraw from bank\n\n` +

            `**━━━ Earning ━━━**\n` +
            `\`wwork\` [\`wwk\`] — Work for coins (60s cooldown)\n` +
            `\`wdaily\` [\`wdy\`] — Claim daily reward + streak bonus\n` +
            `\`wcollect\` [\`wcol\`] — Collect passive income from items\n` +
            `\`wfarm\` [\`wfa\`] — Collect farm income (type a code!)\n` +
            `\`wfish\` [\`wfs\`] — Go fishing for coins\n` +
            `\`wclaim\` — Claim a server drop event\n\n` +

            `**━━━ Transfers ━━━**\n` +
            `\`wpay @user <amount>\` — Send coins to another player`
    },
    {
        title: "🎰 Gambling",
        content:
            `All gambling commands accept \`all\` as the bet amount.\n\n` +

            `**━━━ Games ━━━**\n` +
            `\`wgamble <amt|all>\` [\`wgb\`]\n` +
            `  └ Roll for jackpot (x5), double (x2), even, or lose\n\n` +

            `\`wblackjack <amt|all>\` [\`wbj\`]\n` +
            `  └ Classic blackjack vs dealer. Natural 21 = x1.5 payout\n\n` +

            `\`wslots <amt|all>\` [\`wsl\`]\n` +
            `  └ Spin the reels. 🎰🎰🎰 = x20 jackpot!\n\n` +

            `\`wcoinflip <heads|tails> <amt|all>\` [\`wcf\`]\n` +
            `  └ 50/50 double or nothing\n\n` +

            `\`wdice <over|under> <amt|all>\` [\`wdc\`]\n` +
            `  └ Guess if 2d6 roll is over/under 7\n\n` +

            `**━━━ Boosts ━━━**\n` +
            `🍀 \`lucky_charm\` — +10% gamble luck for 1 hour\n` +
            `⚡ \`energy_drink\` — Skip all cooldowns for 5 min\n` +
            `🎟️ \`lottery_ticket\` — Scratch for prizes up to 500,000\n\n` +
            `Use \`wuse <item>\` to activate these.`
    },
    {
        title: "⚔️ Crime & Combat",
        content:
            `**━━━ Robbing ━━━**\n` +
            `\`wrob @user\` — Rob a player's wallet\n` +
            `  └ Requires: 🔑 lockpick · Optional: hacker_kit, getaway_car, emp_device\n\n` +
            `\`wbankrob @user\` [\`wbr\`] — Rob a player's bank (10m cooldown)\n` +
            `  └ Requires: 🔑 lockpick · Harder but bigger payout\n\n` +
            `\`wheist\` [\`whs\`] — Solo bank heist for random loot\n` +
            `  └ Requires: 🔑 lockpick · Hacker kit boosts success\n\n` +

            `**━━━ Crime ━━━**\n` +
            `\`wcrime\` [\`wcr\`] — Commit a random crime (2m cooldown)\n` +
            `  └ 50% success · Fail = fine + 🔥 heat\n\n` +

            `**━━━ Duels ━━━**\n` +
            `\`wduel @user <amt|all>\` [\`wdu\`] — Challenge another player\n` +
            `  └ Best of 3 rounds via DM button moves\n` +
            `  └ Moves: ⚔️ Attack · 🛡️ Defend · 💨 Dodge\n\n` +

            `**━━━ AI Events ━━━**\n` +
            `\`wfight\` — Fight back after Shadow Broker robs you\n` +
            `  └ Win = reclaim coins · Lose = extra -20% penalty\n\n` +

            `**━━━ Heat System ━━━**\n` +
            `🟢 Low (0–2) · 🟡 Medium (3–5) · 🔴 HIGH (6+)\n` +
            `High heat = bigger fines & lower rob success rate\n` +
            `Heat decays -1 every 5 minutes automatically`
    },
    {
        title: "🏭 Income & Items",
        content:
            `**━━━ How Passive Income Works ━━━**\n` +
            `Buy income items → they generate coins every 10 min\n` +
            `Use \`wcollect\` to claim pending income\n\n` +

            `**━━━ Regular Shop Items (income/tick) ━━━**\n` +
            `🖨️ printer       — 1,000   coins · 50/tick\n` +
            `🏭 factory       — 5,000   coins · 300/tick\n` +
            `🔬 lab           — 20,000  coins · 1,200/tick\n` +
            `⚛️ quantum_core  — 100,000 coins · 5,000/tick\n` +
            `🏗️ warehouse     — 350,000 coins · 15,000/tick\n\n` +

            `**━━━ Upgrading Items ━━━**\n` +
            `\`wupgrade <item> [times]\` [\`wup\`]\n` +
            `  └ Levels up an item for higher income\n` +
            `  └ Max level 15 · 70% base success rate\n` +
            `  └ Prestige reduces cost & raises success chance\n\n` +

            `**━━━ Item Buffs ━━━**\n` +
            `Prestige multiplier stacks on top of base income\n` +
            `Global events (x2 boost / x0.5 tax) apply randomly\n` +
            `Level bonus = income × item_level`
    },
    {
        title: "🎒 Inventory & Shop",
        content:
            `**━━━ Viewing ━━━**\n` +
            `\`winv\` — View your inventory\n` +
            `\`wshop\` — Browse the regular shop\n` +
            `\`wpshop\` [\`wps\`] — Browse the prestige shop\n\n` +

            `**━━━ Buying ━━━**\n` +
            `\`wbuy <item> [qty]\` — Buy from regular shop\n` +
            `\`wpbuy <item>\` [\`wpb\`] — Buy from prestige shop\n` +
            `\`wpbuy\` — Claim ALL unlocked prestige items at once\n\n` +

            `**━━━ Using Items ━━━**\n` +
            `\`wuse <item> [@target]\` — Use a consumable item\n\n` +
            `Usable items:\n` +
            `🍀 \`lucky_charm\`    — +10% gamble luck (1h)\n` +
            `⚡ \`energy_drink\`   — Reset all cooldowns (5 min)\n` +
            `🎟️ \`lottery_ticket\` — Scratch & win up to 500k\n` +
            `👑 \`shadow_crown\`   — Steal EVERYTHING from a target\n\n` +

            `**━━━ Defense Items ━━━**\n` +
            `🐕 guard_dog  — 25% chance to block rob attempts\n` +
            `🔒 safe       — Protects 5,000 coins from theft\n` +
            `🚨 alarm      — DMs you when someone tries to rob you\n` +
            `🏛️ vault      — Blocks 40% of stolen amount\n\n` +

            `**━━━ Attack Items ━━━**\n` +
            `🔑 lockpick    — Required for rob/bankrob/heist\n` +
            `💻 hacker_kit  — +15% rob success chance\n` +
            `⚡ emp_device  — Bypasses ALL victim defenses\n` +
            `🚗 getaway_car — Halves fines if caught`
    },
    {
        title: "🐾 Pets",
        content:
            `**━━━ Commands ━━━**\n` +
            `\`wpet list\`           — View all adoptable pets & prices\n` +
            `\`wpet adopt <type>\`   — Adopt a pet\n` +
            `\`wpet view\`           — Check your pet's stats\n` +
            `\`wpet feed\`           — Feed pet (-40 hunger, +5 happy) · 200 coins\n` +
            `\`wpet play\`           — Play with pet (+25 happy) · 100 coins\n` +
            `\`wpet abandon\`        — Release your pet\n\n` +

            `**━━━ Pet Tiers ━━━**\n` +
            `🟢 Starter  — hamster, rabbit, fish, cat, dog\n` +
            `🔵 Mid      — parrot, fox, owl, penguin, bear\n` +
            `🟣 Rare     — wolf, panda\n` +
            `🟡 Legendary— dragon, phoenix, unicorn\n\n` +

            `**━━━ Care Rules ━━━**\n` +
            `⚠️ Feed or play at least once every **6 hours**\n` +
            `💀 If neglected for **24 hours** — pet runs away!\n` +
            `🚫 Running away triggers a **7-day adoption ban**\n\n` +

            `**━━━ Status Indicators ━━━**\n` +
            `🟢 Healthy · 😢 Sad · 🤢 Hungry · 💀 Critical`
    },
    {
        title: "👑 Prestige",
        content:
            `**━━━ What Is Prestige? ━━━**\n` +
            `Spending coins to reset & climb higher tiers.\n` +
            `Each prestige level gives permanent bonuses:\n` +
            `• +5% income multiplier per level\n` +
            `• Unlocks exclusive high-income items\n` +
            `• Reduces upgrade costs & raises upgrade success\n` +
            `• Reduces heist cooldowns\n\n` +

            `**━━━ How To Prestige ━━━**\n` +
            `\`wprestige\` [\`wpres\`] — Spend coins to prestige\n` +
            `  └ Base cost: 150,000 · Multiplier: x1.5 per level\n` +
            `  └ Wallet resets to 500 · Bank & inventory cleared\n\n` +

            `**━━━ Prestige Shop ━━━**\n` +
            `\`wpshop\` — See all prestige items & requirements\n` +
            `\`wpbuy <item>\` — Unlock a specific item\n` +
            `\`wpbuy\` — Auto-claim all items you qualify for\n\n` +

            `**━━━ Notable Milestones ━━━**\n` +
            `P1  — gold_printer (500/tick)\n` +
            `P9  — bank (1,000,000/tick)\n` +
            `P12 — space_station (10,000,000/tick)\n` +
            `P20 — quantum_reactor (25,000,000/tick)\n` +
            `P40 — singularity_core (10,000,000,000/tick)\n\n` +

            `👑 \`frey\` — Legendary item, P10, 1 per server`
    },
    {
        title: "🛡️ Admin Commands",
        content:
            `Admin-only commands. Requires owner ID in config.\n\n` +

            `**━━━ Economy ━━━**\n` +
            `\`wgive @user <amount>\`      — Add coins to wallet\n` +
            `\`wsetmoney @user <amount>\`  — Set exact wallet amount\n` +
            `\`wreset @user\`              — Reset user to default\n\n` +

            `**━━━ Prestige ━━━**\n` +
            `\`wsetprestige @user <lvl>\` — Set prestige level\n\n` +

            `**━━━ Dashboard ━━━**\n` +
            `The web dashboard runs on \`http://localhost:4000\`\n` +
            `• View all users & market data\n` +
            `• Give money via browser form\n` +
            `• Reset users via browser form\n\n` +

            `**━━━ Config Tips ━━━**\n` +
            `Edit \`config.json\` to adjust:\n` +
            `• Cooldown durations\n` +
            `• Gamble odds\n` +
            `• Prestige cost & multiplier\n` +
            `• Drop event intervals & amounts`
    }
];

module.exports = {
    name: "help",
    async execute(message, args) {
        // Direct category shortcut: whelp gamble, whelp pets, etc.
        const shortcuts = {
            economy: 1, balance: 1, earn: 1,
            gamble: 2, gambling: 2, casino: 2, bet: 2,
            crime: 3, rob: 3, combat: 3, fight: 3, duel: 3,
            income: 4, items: 4, upgrade: 4, passive: 4,
            shop: 5, inv: 5, inventory: 5, buy: 5,
            pet: 6, pets: 6,
            prestige: 7,
            admin: 8
        };

        let startPage = 0;
        if (args[0]) {
            const key = args[0].toLowerCase();
            if (shortcuts[key] !== undefined) startPage = shortcuts[key];
        }

        let page = startPage;
        const total = PAGES.length;

        function buildEmbed(p) {
            const pg = PAGES[p];
            return (
                `📖 **${pg.title}**\n` +
                `*Page ${p + 1} of ${total}*\n` +
                `${"─".repeat(32)}\n\n` +
                pg.content +
                `\n\n${"─".repeat(32)}\n` +
                `*Use the buttons to navigate · \`whelp <category>\` to jump directly*`
            );
        }

        function buildRow(p) {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("help_first")
                    .setLabel("⏮")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === 0),
                new ButtonBuilder()
                    .setCustomId("help_prev")
                    .setLabel("◀ Prev")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(p === 0),
                new ButtonBuilder()
                    .setCustomId("help_next")
                    .setLabel("Next ▶")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(p === total - 1),
                new ButtonBuilder()
                    .setCustomId("help_last")
                    .setLabel("⏭")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === total - 1)
            );
        }

        const msg = await message.reply({
            content: buildEmbed(page),
            components: [buildRow(page)]
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000
        });

        collector.on("collect", async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: "❌ This help menu belongs to someone else!", flags: 64 });
            }

            if (interaction.customId === "help_first")  page = 0;
            if (interaction.customId === "help_prev")   page = Math.max(0, page - 1);
            if (interaction.customId === "help_next")   page = Math.min(total - 1, page + 1);
            if (interaction.customId === "help_last")   page = total - 1;

            await interaction.update({
                content: buildEmbed(page),
                components: [buildRow(page)]
            });
        });

        collector.on("end", () => {
            msg.edit({ components: [] }).catch(() => {});
        });
    }
};
