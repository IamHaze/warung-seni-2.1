const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config.json");
const db = require("./database/db");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Map();

/* ================= COMMAND LOADER ================= */
function loadCommands(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            loadCommands(fullPath);
        } else if (file.endsWith(".js")) {
            const command = require(fullPath);
            if (!command.name || !command.execute) {
                console.log(`❌ Skipping invalid command file: ${file}`);
                continue;
            }
            client.commands.set(command.name, command);
            console.log(`✅ Loaded command: ${command.name}`);
        }
    }
}

loadCommands(path.join(__dirname, "commands"));

/* ================= ALIAS LOADER ================= */
const ALIASES = require("./core/aliases");
for (const [alias, cmdName] of Object.entries(ALIASES)) {
    const cmd = client.commands.get(cmdName);
    if (cmd) {
        client.commands.set(alias, cmd);
        console.log(`🔗 Alias: w${alias} → w${cmdName}`);
    }
}

/* ================= READY ================= */
client.on("clientReady", () => {
    console.log(`🚀 Logged in as ${client.user.tag}`);
    console.log(`📦 Loaded ${client.commands.size} commands (incl. aliases)`);

    // Shadow Broker
    const { startShadowBroker } = require("./core/events");
    startShadowBroker(client);
    console.log("🕵️ Shadow Broker started");

    // Drop event system (wclaim — 10B-600B, max 32/day)
    const { initDropEvents } = require("./core/dropEvents");
    initDropEvents(client);
    console.log("🎁 Drop event system started");
});

/* ================= MESSAGE ================= */
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(config.prefix)) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    const command = client.commands.get(cmd);
    if (!command) return;

    try {
        command.execute(message, args);
    } catch (err) {
        console.error("Command error:", err);
        message.reply("❌ Error executing command");
    }
});

/* ================= PASSIVE INCOME ================= */
setInterval(() => {
    console.log("💸 Passive tick");

    db.all(`SELECT * FROM inventory`, [], (err, rows) => {
        if (err || !rows) return;

        rows.forEach(entry => {
            const itemData = config.items[entry.item];
            if (!itemData || !itemData.income) return;

            const level = entry.level || 1;

            db.get(`SELECT prestige FROM users WHERE user_id=?`, [entry.user_id], (err, user) => {
                if (err || !user) return;

                const bonus  = 1 + (user.prestige * config.prestige.income_bonus_per_level);
                const income = Math.floor(itemData.income * level * bonus);

                db.run(
                    `UPDATE users SET pending_income = pending_income + ? WHERE user_id=?`,
                    [income, entry.user_id]
                );
            });
        });
    });
}, 600000);

/* ================= SHADOW CROWN EXPIRY CLEANUP ================= */
const CROWN_EXPIRY = 24 * 60 * 60 * 1000;
setInterval(() => {
    const expiryCutoff = Date.now() - CROWN_EXPIRY;
    db.all(
        `SELECT user_id, level FROM inventory WHERE item='shadow_crown'`,
        [],
        (err, rows) => {
            if (!rows) return;
            rows.forEach(row => {
                if (row.level && row.level < expiryCutoff) {
                    db.run(`DELETE FROM inventory WHERE user_id=? AND item='shadow_crown'`, [row.user_id]);
                    db.run(
                        `INSERT INTO shadow_crown_log (user_id, used_at) VALUES (?, ?)
                         ON CONFLICT(user_id) DO UPDATE SET used_at = ?`,
                        [row.user_id, Date.now(), Date.now()]
                    );
                    console.log(`👑 Shadow Crown expired for ${row.user_id}`);
                }
            });
        }
    );
}, 300000);

/* ================= HEAT DECAY ================= */
setInterval(() => {
    db.run(`
        UPDATE users
        SET heat = CASE
            WHEN heat > 0 THEN heat - 1
            ELSE 0
        END
    `);
    console.log("🚓 Heat cooled down");
}, 300000);

/* ================= MEMBER LEAVE - DELETE DATA ================= */
client.on("guildMemberRemove", (member) => {
    const userId = member.id;

    db.serialize(() => {
        db.run(`DELETE FROM users WHERE user_id=?`, [userId], (err) => {
            if (err) {
                console.error(`Error deleting user ${userId}:`, err);
                return;
            }
            console.log(`🗑️ Deleted all data for user ${userId} (${member.user.username})`);
        });

        db.run(`DELETE FROM inventory WHERE user_id=?`,        [userId]);
        db.run(`DELETE FROM skills WHERE user_id=?`,           [userId]);
        db.run(`DELETE FROM fishing_log WHERE user_id=?`,      [userId]);
        db.run(`DELETE FROM duel_log WHERE user_id=?`,         [userId]);
        db.run(`DELETE FROM buffs WHERE user_id=?`,            [userId]);
        db.run(`DELETE FROM shadow_crown_log WHERE user_id=?`, [userId]);
        db.run(`DELETE FROM pets WHERE user_id=?`,             [userId]);
        db.run(`DELETE FROM pet_neglect_log WHERE user_id=?`,  [userId]);
    });
});

/* ================= PET NEGLECT CHECK ================= */
const PET_NEGLECT_TIMEOUT = 24 * 60 * 60 * 1000;
setInterval(() => {
    const now    = Date.now();
    const cutoff = now - PET_NEGLECT_TIMEOUT;

    db.all(
        `SELECT user_id, pet_name, pet_type FROM pets WHERE last_action < ?`,
        [cutoff],
        (err, pets) => {
            if (!pets || pets.length === 0) return;

            pets.forEach(pet => {
                db.run(`DELETE FROM pets WHERE user_id=?`, [pet.user_id], (err) => {
                    if (err) return;

                    db.run(
                        `INSERT INTO pet_neglect_log (user_id, ran_away_at) VALUES (?, ?)
                         ON CONFLICT(user_id) DO UPDATE SET ran_away_at = ?`,
                        [pet.user_id, now, now]
                    );

                    console.log(`💀 Pet "${pet.pet_name}" (${pet.pet_type}) ran away from ${pet.user_id} — 1-week ban applied`);

                    client.users.fetch(pet.user_id).then(user => {
                        user.send(
                            `💀 **Your pet ran away!**\n\n` +
                            `**${pet.pet_name}** left because you didn't care for them for 24 hours.\n\n` +
                            `⏳ You are **banned from adopting** for **7 days**.\n` +
                            `*Next time, feed and play with your pet regularly...*`
                        ).catch(() => {});
                    }).catch(() => {});
                });
            });
        }
    );
}, 600000);


/* ================= DAILY LEADERBOARD COMPETITION ================= */
const { getMYTDayKey, isMYTMidnight } = require("./core/timezone");

const LEADERBOARD_PRIZES = {
    first:  20_000_000_000_000,  // 20PB
    second: 10_000_000_000_000,  // 10PB
    third:   5_000_000_000_000   // 5PB
};

async function checkDailyLeaderboard(client) {
    const today = getMYTDayKey();
    const channel = client.channels.cache.get(config.eventChannel);
    if (!channel) return;

    db.get(`SELECT * FROM daily_leaderboard WHERE day_key=?`, [today], async (err, record) => {
        if (err) return;

        // Get top 3 richest
        db.all(
            `SELECT user_id, (wallet + bank) as total FROM users ORDER BY total DESC LIMIT 3`,
            [],
            async (err, top3) => {
                if (err || !top3 || top3.length === 0) return;

                const first_id  = top3[0]?.user_id || null;
                const second_id = top3[1]?.user_id || null;
                const third_id  = top3[2]?.user_id || null;

                // Check if already awarded today
                if (record?.awarded_at > 0) {
                    // Already awarded - check for changes and notify
                    if (record.first_id !== first_id || record.second_id !== second_id || record.third_id !== third_id) {
                        // Leaderboard changed! Notify new #1
                        if (first_id && record.first_id !== first_id) {
                            channel.send(
                                `🏆 **NEW LEADER!**\n\n` +
                                `<@${first_id}> has taken **#1** on the daily leaderboard!\n` +
                                `💰 Prize at midnight (MYT): **20PB**`
                            ).catch(() => {});
                        }

                        // Update the tracking
                        db.run(
                            `UPDATE daily_leaderboard SET first_id=?, second_id=?, third_id=? WHERE day_key=?`,
                            [first_id, second_id, third_id, today]
                        );
                    }
                    return;
                }

                // Create/update tracking for today
                db.run(
                    `INSERT INTO daily_leaderboard (day_key, first_id, second_id, third_id, awarded_at) VALUES (?, ?, ?, ?, 0)
                     ON CONFLICT(day_key) DO UPDATE SET first_id=?, second_id=?, third_id=?`,
                    [today, first_id, second_id, third_id, first_id, second_id, third_id]
                );
            }
        );
    });
}

// Award prizes at midnight MYT and reset tracking
async function awardDailyLeaderboard(client) {
    const today = getMYTDayKey();
    const channel = client.channels.cache.get(config.eventChannel);
    if (!channel) return;

    db.get(`SELECT * FROM daily_leaderboard WHERE day_key=?`, [today], async (err, record) => {
        if (err || !record || record.awarded_at > 0) return;

        const winners = [];
        if (record.first_id) winners.push({ id: record.first_id, prize: LEADERBOARD_PRIZES.first, place: 1 });
        if (record.second_id) winners.push({ id: record.second_id, prize: LEADERBOARD_PRIZES.second, place: 2 });
        if (record.third_id) winners.push({ id: record.third_id, prize: LEADERBOARD_PRIZES.third, place: 3 });

        if (winners.length === 0) return;

        // Award prizes
        for (const w of winners) {
            db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [w.prize, w.id]);
        }

        // Mark as awarded
        db.run(`UPDATE daily_leaderboard SET awarded_at=? WHERE day_key=?`, [Date.now(), today]);

        // Announce winners
        let msg = `🏆 **DAILY LEADERBOARD RESULTS!**\n\n`;
        msg += `🏅 Top 3 richest players have been rewarded!\n\n`;

        for (const w of winners) {
            let username = "Unknown";
            try {
                const user = await client.users.fetch(w.id);
                username = user.username;
            } catch {}

            const medal = w.place === 1 ? "🥇" : w.place === 2 ? "🥈" : "🥉";
            const prizeStr = w.prize === LEADERBOARD_PRIZES.first ? "20PB" : w.prize === LEADERBOARD_PRIZES.second ? "10PB" : "5PB";
            msg += `${medal} **#${w.place}** <@${w.id}> — **+${prizeStr}**\n`;
        }

        msg += `\n*New competition starts now!*`;
        channel.send(msg).catch(() => {});

        // Create new tracking for next day
        const tomorrow = getMYTDayKey();
        db.run(
            `INSERT OR IGNORE INTO daily_leaderboard (day_key, first_id, second_id, third_id, awarded_at) VALUES (?, NULL, NULL, NULL, 0)`,
            [tomorrow]
        );
    });
}

// Check leaderboard every 5 minutes
setInterval(() => {
    checkDailyLeaderboard(client);
}, 300000);

// Award prizes at midnight MYT (check every minute)
setInterval(() => {
    if (isMYTMidnight()) {
        awardDailyLeaderboard(client);
    }
}, 60000);

client.login(config.token);
