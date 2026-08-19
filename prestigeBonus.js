module.exports = function getPrestigeBonus(prestige, config) {

    const raw = 1 + (prestige * config.prestige.income_bonus_per_level);

    // 🔒 CAP to avoid broken economy
    const maxBonus = 5;

    return Math.min(raw, maxBonus);
};
