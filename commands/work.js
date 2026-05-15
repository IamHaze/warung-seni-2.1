const db = require("../database/db");
const getUser = require("../core/getUser");
const { addXP } = require("../core/level");
const config = require("../config.json");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");

const cooldowns = new Map();
const COOLDOWN = 60000;

const JOBS = [
    { id: "cleaner",    label: "🧹 Cleaner",     pay: [10_000_000,  20_000_000],  desc: "Mop floors & clean toilets",  minigame: "type"   },
    { id: "driver",     label: "🚗 Driver",       pay: [15_000_000,  30_000_000],  desc: "Send passengers la mana2",    minigame: "type"   },
    { id: "cook",       label: "🍳 Cook",         pay: [20_000_000,  40_000_000],  desc: "Goreng nasi & masak lauk",    minigame: "math"   },
    { id: "guard",      label: "💂 Guard",        pay: [25_000_000,  45_000_000],  desc: "Jaga pintu & halau org",      minigame: "choice" },
    { id: "mechanic",   label: "🔧 Mechanic",     pay: [30_000_000,  55_000_000],  desc: "Repair kereta & motor",       minigame: "math"   },
    { id: "programmer", label: "💻 Programmer",   pay: [40_000_000,  70_000_000],  desc: "Debug code sampai pagi",      minigame: "type"   },
    { id: "trader",     label: "📈 Trader",       pay: [10_000_000,  80_000_000],  desc: "Buy low sell high (risky)",   minigame: "choice" },
    { id: "doctor",     label: "🩺 Doctor",       pay: [60_000_000, 100_000_000],  desc: "Tengok pesakit & bagi MC",    minigame: "choice" },
];

const TYPE_PHRASES = [
    "The quick brown fox",
    "Kerja keras baru kaya",
    "Jangan malas nak kerja",
    "Duit tak datang sendiri",
    "Usaha tangga kejayaan",
    "Keep grinding every day",
    "No pain no gain bro",
    "Bismillah tolong la pass",
];

const MATH_QUESTIONS = [
    () => { const a = rnd(2, 12), b = rnd(2, 12); return { q: `${a} × ${b}`, a: a * b }; },
    () => { const a = rnd(20, 99), b = rnd(10, 50); return { q: `${a} + ${b}`, a: a + b }; },
    () => { const a = rnd(50, 99), b = rnd(10, 49); return { q: `${a} - ${b}`, a: a - b }; },
    () => { const a = rnd(3, 9), b = rnd(3, 9); return { q: `${a * b} ÷ ${a}`, a: b }; },
];

const CHOICE_QUESTIONS = [
    {
        q: "Customer complaining loudly. What do you do?",
        opts: ["Ignore them", "Listen calmly & apologise", "Argue back", "Call manager immediately"],
        a: 1
    },
    {
        q: "You found extra change in the register. What do you do?",
        opts: ["Keep it", "Report it to supervisor", "Split with coworker", "Leave it there"],
        a: 1
    },
    {
        q: "Your coworker is slacking off. What do you do?",
        opts: ["Join them", "Cover for them silently", "Talk to them directly", "Report immediately"],
        a: 2
    },
    {
        q: "Boss asks you to work overtime. What do you say?",
        opts: ["Refuse flatly", "Negotiate compensation first", "Agree without question", "Pretend not to hear"],
        a: 1
    },
    {
        q: "System crash on your shift. What do you do first?",
        opts: ["Panic and run", "Restart randomly", "Follow SOP & notify IT", "Blame coworker"],
        a: 2
    },
];

function rnd(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickThreeJobs() {
    return [...JOBS].sort(() => Math.random() - 0.5).slice(0, 3);
}

function getWorkBonus(prestige) {
    return 1 + (prestige * 1.0);
}

// Returns { full, half, quarter } payout breakdown
function calcPay(job, bonus) {
    const raw = Math.floor(Math.random() * (job.pay[1] - job.pay[0] + 1)) + job.pay[0];
    const full = Math.floor(raw * bonus);
    return { full, half: Math.floor(full * 0.4), quarter: Math.floor(full * 0.2) };
}

module.exports = {
    name: "work",
    execute(message) {
        const userId = message.author.id;
        const now = Date.now();
        const cd = cooldowns.get(userId) || 0;

        if (now < cd) {
            db.get(
                `SELECT expires_at FROM buffs WHERE user_id=? AND buff='energy_drink' AND expires_at > ?`,
                [userId, now],
                (err, drink) => {
                    if (!drink) {
                        const left = Math.ceil((cd - now) / 1000);
                        return message.reply(`⏳ Wait **${left}s** before working again`);
                    }
                    cooldowns.set(userId, now + COOLDOWN);
                    showJobs();
                }
            );
            return;
        }

        cooldowns.set(userId, now + COOLDOWN);
        showJobs();

        function showJobs() {
            getUser(userId, (err, user) => {
                if (!user) return message.reply("❌ User error");

                const jobs = pickThreeJobs();
                const prestige = user.prestige || 0;
                const bonus = getWorkBonus(prestige);

                const row = new ActionRowBuilder().addComponents(
                    jobs.map(job =>
                        new ButtonBuilder()
                            .setCustomId(`work_${job.id}`)
                            .setLabel(job.label)
                            .setStyle(ButtonStyle.Primary)
                    )
                );

                const jobList = jobs.map(job => {
                    const minPay = Math.floor(job.pay[0] * bonus);
                    const maxPay = Math.floor(job.pay[1] * bonus);
                    return `${job.label}\n┗ ${job.desc}\n┗ 💰 **${minPay.toLocaleString()}** – **${maxPay.toLocaleString()}**`;
                }).join("\n\n");

                message.reply({
                    content:
                        `💼 **PILIH KERJA** — ⏳ 20 saat\n\n` +
                        `${jobList}\n\n` +
                        `🌟 Prestige **${prestige}** Bonus: **x${bonus.toFixed(1)}**`,
                    components: [row]
                }).then(msg => {
                    const collector = msg.createMessageComponentCollector({
                        componentType: ComponentType.Button,
                        time: 20000,
                        filter: i => i.user.id === userId
                    });

                    collector.on("collect", async interaction => {
                        collector.stop("picked");

                        const jobId = interaction.customId.replace("work_", "");
                        const job = jobs.find(j => j.id === jobId);
                        if (!job) return interaction.update({ content: "❌ Error picking job", components: [] });

                        const pay = calcPay(job, bonus);
                        await interaction.update({ content: buildMiniGame(job, pay), components: [] });

                        runMiniGame(message, job, pay, prestige, bonus);
                    });

                    collector.on("end", (_, reason) => {
                        if (reason !== "picked") {
                            cooldowns.set(userId, 0);
                            msg.edit({
                                content: `⏰ **Timed out!** Cooldown refunded — guna \`wwork\` balik.`,
                                components: []
                            }).catch(() => {});
                        }
                    });
                });
            });
        }

        function buildMiniGame(job, pay) {
            if (job.minigame === "type") {
                const phrase = TYPE_PHRASES[Math.floor(Math.random() * TYPE_PHRASES.length)];
                job._challenge = phrase;
                return (
                    `${job.label} **— Tugas Masuk!**\n\n` +
                    `📋 ${job.desc}\n\n` +
                    `✏️ **Type this phrase within 15s:**\n` +
                    `\`\`\`${phrase}\`\`\`` +
                    `\n💰 Full pay: **${pay.full.toLocaleString()}** | Wrong: **${pay.half.toLocaleString()}** | Timeout: **${pay.quarter.toLocaleString()}**`
                );
            }
            if (job.minigame === "math") {
                const gen = MATH_QUESTIONS[Math.floor(Math.random() * MATH_QUESTIONS.length)];
                const { q, a } = gen();
                job._challenge = String(a);
                return (
                    `${job.label} **— Tugas Masuk!**\n\n` +
                    `📋 ${job.desc}\n\n` +
                    `🔢 **Solve within 15s:**\n` +
                    `\`\`\`${q} = ?\`\`\`` +
                    `\n💰 Full pay: **${pay.full.toLocaleString()}** | Wrong: **${pay.half.toLocaleString()}** | Timeout: **${pay.quarter.toLocaleString()}**`
                );
            }
            if (job.minigame === "choice") {
                const qdata = CHOICE_QUESTIONS[Math.floor(Math.random() * CHOICE_QUESTIONS.length)];
                job._challenge = qdata;
                const optStr = qdata.opts.map((o, i) => `**${i + 1}.** ${o}`).join("\n");
                return (
                    `${job.label} **— Tugas Masuk!**\n\n` +
                    `📋 ${job.desc}\n\n` +
                    `❓ **Pick the right answer (15s):**\n${qdata.q}\n\n${optStr}` +
                    `\n\n💰 Full pay: **${pay.full.toLocaleString()}** | Wrong: **${pay.half.toLocaleString()}** | Timeout: **${pay.quarter.toLocaleString()}**`
                );
            }
        }

        function runMiniGame(message, job, pay, prestige, bonus) {
            const filter = m => m.author.id === userId;
            const collector = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });

            collector.on("collect", m => {
                const input = m.content.trim();
                let correct = false;

                if (job.minigame === "type") {
                    correct = input === job._challenge;
                } else if (job.minigame === "math") {
                    correct = input === job._challenge;
                } else if (job.minigame === "choice") {
                    const chosen = parseInt(input) - 1;
                    correct = chosen === job._challenge.a;
                }

                const earned = correct ? pay.full : pay.half;
                db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [earned, userId]);
                addXP(userId, config.xp.work);

                const result = correct
                    ? `✅ **Betul!** Full pay claimed!`
                    : `❌ **Silap!** Dapat partial pay je.`;

                message.reply(
                    `${job.label} **— Selesai!**\n\n` +
                    `${result}\n` +
                    `💰 Earned: **${earned.toLocaleString()}** coins\n` +
                    `🌟 Prestige **${prestige}** Bonus: x${bonus.toFixed(1)}`
                );
            });

            collector.on("end", (collected, reason) => {
                if (reason === "time" && collected.size === 0) {
                    db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [pay.quarter, userId]);
                    addXP(userId, config.xp.work);
                    message.reply(
                        `${job.label} **— Lambat!**\n\n` +
                        `⏰ Timeout — partial pay je.\n` +
                        `💰 Earned: **${pay.quarter.toLocaleString()}** coins`
                    );
                }
            });
        }
    }
};
