const db = require("../database/db");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");

const cooldowns = new Map();
const COOLDOWN  = 30000;

/* ───── RODS ───── */
const RODS = {
    bamboo_rod:  { name: "Bamboo Rod",  emoji: "🎋", catchRate: 0.72, rarityMult: 0,    multiChance: 0,    valueMult: 1.0 },
    iron_rod:    { name: "Iron Rod",    emoji: "⚙️",  catchRate: 0.80, rarityMult: 0.05, multiChance: 0.05, valueMult: 1.2 },
    golden_rod:  { name: "Golden Rod",  emoji: "✨",  catchRate: 0.87, rarityMult: 0.12, multiChance: 0.15, valueMult: 1.5 },
    crystal_rod: { name: "Crystal Rod", emoji: "💎",  catchRate: 0.94, rarityMult: 0.22, multiChance: 0.30, valueMult: 2.0 }
};
const ROD_ORDER = ["crystal_rod", "golden_rod", "iron_rod", "bamboo_rod"];

/* ───── BAIT ───── */
const BAIT = {
    worm_bait:  { name: "Worm Bait",  emoji: "🪱", catchBonus: 0.07, rarityMult: 0.05 },
    magic_bait: { name: "Magic Bait", emoji: "✨",  catchBonus: 0.10, rarityMult: 0.20 }
};

/* ───── FISH ───── */
const FISH = [
    { name: "Old Boot",       emoji: "👢", value: 5,      weight: 32,   rarity: "Junk",      xp: 1   },
    { name: "Seaweed",        emoji: "🌿", value: 10,     weight: 26,   rarity: "Junk",      xp: 1   },
    { name: "Sardine",        emoji: "🐟", value: 50,     weight: 20,   rarity: "Common",    xp: 3   },
    { name: "Mackerel",       emoji: "🐟", value: 120,    weight: 14,   rarity: "Common",    xp: 5   },
    { name: "Bass",           emoji: "🐠", value: 300,    weight: 9,    rarity: "Uncommon",  xp: 8   },
    { name: "Salmon",         emoji: "🐟", value: 600,    weight: 6,    rarity: "Uncommon",  xp: 11  },
    { name: "Tuna",           emoji: "🐟", value: 1200,   weight: 4,    rarity: "Rare",      xp: 16  },
    { name: "Swordfish",      emoji: "⚔️", value: 3000,   weight: 2.5,  rarity: "Rare",      xp: 22  },
    { name: "Pufferfish",     emoji: "🐡", value: 6000,   weight: 1.5,  rarity: "Epic",      xp: 32  },
    { name: "Anglerfish",     emoji: "🔦", value: 12000,  weight: 1.0,  rarity: "Epic",      xp: 45  },
    { name: "Golden Koi",     emoji: "✨", value: 30000,  weight: 0.4,  rarity: "Legendary", xp: 65  },
    { name: "Phantom Marlin", emoji: "👻", value: 60000,  weight: 0.2,  rarity: "Legendary", xp: 90  },
    { name: "Leviathan",      emoji: "🐉", value: 250000, weight: 0.08, rarity: "Mythic",    xp: 200 }
];

const RARITY_DOT = {
    Junk: "⚫", Common: "⚪", Uncommon: "🟢",
    Rare: "🔵", Epic: "🟣", Legendary: "🟡", Mythic: "🔴"
};

/* ───── LOCATIONS ───── */
const LOCATIONS = [
    { name: "Pond",  emoji: "🏞️", mult: 1.0, minLevel: 1  },
    { name: "River", emoji: "🏞️", mult: 1.3, minLevel: 5  },
    { name: "Lake",  emoji: "🏔️", mult: 1.7, minLevel: 10 },
    { name: "Ocean", emoji: "🌊", mult: 2.1, minLevel: 20 },
    { name: "Abyss", emoji: "🕳️", mult: 3.5, minLevel: 30 }
];

/* ───── WEATHER (stable per MYT day) ───── */
const { getMYTDayKey } = require("../core/timezone");

const WEATHER = [
    { name: "Sunny",  emoji: "☀️",  catchMod: 0,     rarityMod: 0    },
    { name: "Cloudy", emoji: "☁️",  catchMod: 0.04,  rarityMod: 0.04 },
    { name: "Rainy",  emoji: "🌧️", catchMod: 0.10,  rarityMod: 0.10 },
    { name: "Stormy", emoji: "⛈️", catchMod: -0.08, rarityMod: 0.20 }
];

function getTodayWeather() {
    const dayKey = getMYTDayKey();
    const seed = (dayKey * 2654435761) >>> 0;
    return WEATHER[seed % WEATHER.length];
}

function pickFish(rarityMult = 0) {
    const weights = FISH.map(f => {
        let w = f.weight;
        if (f.rarity === "Rare")      w *= 1 + rarityMult;
        if (f.rarity === "Epic")      w *= 1 + rarityMult * 1.8;
        if (f.rarity === "Legendary") w *= 1 + rarityMult * 2.5;
        if (f.rarity === "Mythic")    w *= 1 + rarityMult * 4;
        return w;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < FISH.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return FISH[i];
    }
    return FISH[0];
}

function getLocation(level) {
    const valid = LOCATIONS.filter(l => l.minLevel <= (level || 1));
    return valid[valid.length - 1];
}

function streakBonus(streak) {
    if (streak >= 10) return { mult: 2.0, tag: "🔥🔥🔥 MAX x2.0" };
    if (streak >= 7)  return { mult: 1.7, tag: "🔥🔥 HOT x1.7"   };
    if (streak >= 5)  return { mult: 1.5, tag: "🔥 x1.5"          };
    if (streak >= 3)  return { mult: 1.3, tag: "✨ x1.3"           };
    return { mult: 1.0, tag: "" };
}

function dbGet(sql, params) {
    return new Promise(res => db.get(sql, params, (_, r) => res(r)));
}
function dbAll(sql, params) {
    return new Promise(res => db.all(sql, params, (_, r) => res(r || [])));
}

module.exports = {
    name: "fish",
    async execute(message) {
        const user = message.author.id;
        const now  = Date.now();
        const cd   = cooldowns.get(user) || 0;

        if (now < cd) {
            const drink = await dbGet(
                `SELECT expires_at FROM buffs WHERE user_id=? AND buff='energy_drink' AND expires_at > ?`,
                [user, now]
            );
            if (!drink) return message.reply(`⏳ Wait **${Math.ceil((cd - now) / 1000)}s** before fishing again`);
            cooldowns.set(user, 0);
        } else {
            cooldowns.set(user, now + COOLDOWN);
        }

        const [u, rods, baits, charm] = await Promise.all([
            dbGet(`SELECT wallet, level, prestige, fish_streak FROM users WHERE user_id=?`, [user]),
            dbAll(`SELECT item, amount FROM inventory WHERE user_id=? AND item IN ('bamboo_rod','iron_rod','golden_rod','crystal_rod')`, [user]),
            dbAll(`SELECT item, amount FROM inventory WHERE user_id=? AND item IN ('worm_bait','magic_bait')`, [user]),
            dbGet(`SELECT expires_at FROM buffs WHERE user_id=? AND buff='lucky_charm' AND expires_at > ?`, [user, now])
        ]);

        if (!u) return message.reply("❌ User error");

        // Best rod in inventory — fallback to bamboo if none owned
        let rod = RODS.bamboo_rod;
        for (const key of ROD_ORDER) {
            if (rods.find(r => r.item === key && r.amount > 0)) { rod = RODS[key]; break; }
        }

        // Best bait in inventory
        let bait = null, baitKey = null;
        if (baits.find(b => b.item === "magic_bait" && b.amount > 0))     { bait = BAIT.magic_bait; baitKey = "magic_bait"; }
        else if (baits.find(b => b.item === "worm_bait" && b.amount > 0)) { bait = BAIT.worm_bait;  baitKey = "worm_bait";  }

        const weather  = getTodayWeather();
        const loc      = getLocation(u.level);
        const streak   = u.fish_streak || 0;
        const sb       = streakBonus(streak);
        const hasCharm = !!charm;

        const catchRate = Math.min(0.97,
            rod.catchRate +
            (bait?.catchBonus || 0) +
            weather.catchMod +
            (hasCharm ? 0.05 : 0)
        );
        const rarityMult =
            rod.rarityMult +
            (bait?.rarityMult || 0) +
            weather.rarityMod +
            (hasCharm ? 0.10 : 0);

        const multiCatch = Math.random() < rod.multiChance;
        const catchCount = multiCatch ? 2 : 1;

        /* ── Cast prompt ── */
        const btnRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("reel").setLabel("🎣 Reel In!").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("release").setLabel("🌊 Release").setStyle(ButtonStyle.Secondary)
        );

        const header = [
            `🎣 **FISHING** — ${loc.emoji} ${loc.name}`,
            `${weather.emoji} ${weather.name}  |  ${rod.emoji} ${rod.name}${bait ? "  |  " + bait.emoji + " " + bait.name : ""}`,
            streak > 0 ? `🔥 Streak **${streak}**${sb.tag ? " — " + sb.tag : ""}` : null,
            `\n🐟 Something's biting... ⏳ **12 seconds** to reel in!`
        ].filter(Boolean).join("\n");

        const castMsg = await message.reply({ content: header, components: [btnRow] });

        const collector = castMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 12000,
            filter: i => i.user.id === user
        });

        let done = false;

        collector.on("collect", async interaction => {
            if (done) return;
            done = true;
            collector.stop();

            /* ── Released ── */
            if (interaction.customId === "release") {
                db.run(`UPDATE users SET fish_streak = 0 WHERE user_id=?`, [user]);
                return interaction.update({
                    content: `🌊 **Released!**\n🔥 Streak reset to 0.`,
                    components: []
                });
            }

            /* ── Consume bait ── */
            if (baitKey) {
                db.run(`UPDATE inventory SET amount = amount - 1 WHERE user_id=? AND item=?`, [user, baitKey]);
                db.run(`DELETE FROM inventory WHERE user_id=? AND item=? AND amount <= 0`, [user, baitKey]);
            }

            /* ── Miss ── */
            if (Math.random() > catchRate) {
                db.run(`UPDATE users SET fish_streak = 0 WHERE user_id=?`, [user]);
                return interaction.update({
                    content: `🎣 **Missed!** The fish got away.\n💡 Try better bait or a stronger rod.\n🔥 Streak reset.`,
                    components: []
                });
            }

            /* ── Catch ── */
            const catches = [];
            for (let i = 0; i < catchCount; i++) catches.push(pickFish(rarityMult));

            let totalCoins = 0;
            const lines = [];

            for (const fish of catches) {
                const prestigeMult = 1 + ((u.prestige || 0) * 0.05);
                const coins = Math.floor(fish.value * loc.mult * prestigeMult * rod.valueMult * sb.mult);
                totalCoins += coins;

                db.run(`
                    INSERT INTO fishing_log (user_id, fish, count, total_value)
                    VALUES (?, ?, 1, ?)
                    ON CONFLICT(user_id, fish) DO UPDATE SET count = count + 1, total_value = total_value + ?
                `, [user, fish.name, coins, coins]);

                const special = (fish.rarity === "Mythic" || fish.rarity === "Legendary")
                    ? ` *(${fish.rarity}!)*` : "";
                lines.push(`${RARITY_DOT[fish.rarity]} ${fish.emoji} **${fish.name}**${special} — 💰 +${coins.toLocaleString()}`);
            }

            const newStreak = streak + 1;
            const newSb     = streakBonus(newStreak);

            db.run(`UPDATE users SET wallet = wallet + ?, fish_streak = ? WHERE user_id=?`, [totalCoins, newStreak, user]);

            const banner =
                catches.some(f => f.rarity === "Mythic")    ? "\n🔥🔥🔥 **MYTHIC CATCH!!!**"  :
                catches.some(f => f.rarity === "Legendary") ? "\n🌟 **LEGENDARY CATCH!**"     :
                multiCatch                                   ? "\n🎣 **DOUBLE CATCH!**"        : "";

            await interaction.update({
                content:
                    `🎣 **CAUGHT!**${banner}\n\n` +
                    lines.join("\n") + "\n\n" +
                    `📍 ${loc.emoji} ${loc.name} (x${loc.mult})  ${weather.emoji} ${weather.name}\n` +
                    `${rod.emoji} ${rod.name}${bait ? "  " + bait.emoji : ""}\n` +
                    (newSb.tag ? `${newSb.tag}  ` : `🔥 Streak **${newStreak}**  `) +
                    `\n💰 **+${totalCoins.toLocaleString()}** coins added`,
                components: []
            });
        });

        collector.on("end", async (_, reason) => {
            if (!done && reason === "time") {
                done = true;
                db.run(`UPDATE users SET fish_streak = 0 WHERE user_id=?`, [user]);
                castMsg.edit({
                    content: `⏰ **Too slow!** The fish escaped.\n🔥 Streak reset.`,
                    components: []
                }).catch(() => {});
            }
        });
    }
};
