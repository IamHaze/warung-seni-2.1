const db = require("../database/db");
const getUser = require("../core/getUser");
const { addXP } = require("../core/level");
const config = require("../config.json");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");

const cooldowns = new Map();
const COOLDOWN = 60000;

const JOBS = [
    { id: "cleaner",    label: "🧹 Cleaner",     pay: [10_000_000,  20_000_000],  desc: "Mop floors & clean toilets"  },
    { id: "driver",     label: "🚗 Driver",       pay: [15_000_000,  30_000_000],  desc: "Send passengers la mana2"    },
    { id: "cook",       label: "🍳 Cook",         pay: [20_000_000,  40_000_000],  desc: "Goreng nasi & masak lauk"    },
    { id: "guard",      label: "💂 Guard",        pay: [25_000_000,  45_000_000],  desc: "Jaga pintu & halau org"      },
    { id: "mechanic",   label: "🔧 Mechanic",     pay: [30_000_000,  55_000_000],  desc: "Repair kereta & motor"       },
    { id: "programmer", label: "💻 Programmer",   pay: [40_000_000,  70_000_000],  desc: "Debug code sampai pagi"      },
    { id: "trader",     label: "📈 Trader",       pay: [10_000_000,  80_000_000],  desc: "Buy low sell high (risky)"   },
    { id: "doctor",     label: "🩺 Doctor",       pay: [60_000_000, 100_000_000],  desc: "Tengok pesakit & bagi MC"    },
];

function pickThreeJobs() {
    const shuffled = [...JOBS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
}

// x1.0 bonus per prestige level → P10 = x11.0, P45 = x46.0
function getWorkBonus(prestige) {
    return 1 + (prestige * 1.0);
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

                        if (!job) {
                            return interaction.update({ content: "❌ Error picking job", components: [] });
                        }

                        const rawPay = Math.floor(Math.random() * (job.pay[1] - job.pay[0] + 1)) + job.pay[0];
                        const earned = Math.floor(rawPay * bonus);

                        db.run(`UPDATE users SET wallet = wallet + ? WHERE user_id=?`, [earned, userId]);
                        addXP(userId, config.xp.work);

                        await interaction.update({
                            content:
                                `${job.label} **— Siap!**\n\n` +
                                `📋 ${job.desc}\n` +
                                `💰 Earned: **${earned.toLocaleString()}** coins\n` +
                                `🌟 Prestige **${prestige}** Bonus: x${bonus.toFixed(1)}`,
                            components: []
                        });
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
    }
};
