// Grow time in ms
// Season: "any" | "spring" | "summer" | "fall" | "winter"
// Out-of-season = 2× grow time. Winter = 3× grow time.
// Watering reduces total grow time by 25%.
// Fertilizing doubles harvest yield.

module.exports = {
    wheat_seed: {
        name: "Wheat",         emoji: "🌾",
        growTime: 10 * 60000,  yield: [150, 350],   xp: 5,
        season: "any",         stages: ["🌱", "🌿", "🌾"]
    },
    carrot_seed: {
        name: "Carrot",        emoji: "🥕",
        growTime: 8 * 60000,   yield: [100, 250],   xp: 4,
        season: "any",         stages: ["🌱", "🌿", "🥕"]
    },
    corn_seed: {
        name: "Corn",          emoji: "🌽",
        growTime: 15 * 60000,  yield: [200, 500],   xp: 7,
        season: "summer",      stages: ["🌱", "🌿", "🌽"]
    },
    strawberry_seed: {
        name: "Strawberry",    emoji: "🍓",
        growTime: 30 * 60000,  yield: [500, 1200],  xp: 12,
        season: "spring",      stages: ["🌱", "🌸", "🍓"]
    },
    blueberry_seed: {
        name: "Blueberry",     emoji: "🫐",
        growTime: 25 * 60000,  yield: [350, 900],   xp: 10,
        season: "summer",      stages: ["🌱", "🌿", "🫐"]
    },
    pumpkin_seed: {
        name: "Pumpkin",       emoji: "🎃",
        growTime: 60 * 60000,  yield: [1000, 2500], xp: 20,
        season: "fall",        stages: ["🌱", "🍃", "🎃"]
    },
    cranberry_seed: {
        name: "Cranberry",     emoji: "🍒",
        growTime: 45 * 60000,  yield: [700, 1800],  xp: 15,
        season: "fall",        stages: ["🌱", "🌿", "🍒"]
    },
    starfruit_seed: {
        name: "Starfruit",     emoji: "⭐",
        growTime: 90 * 60000,  yield: [2500, 7000], xp: 35,
        season: "summer",      stages: ["🌱", "💫", "⭐"]
    },
    ancient_seed: {
        name: "Ancient Fruit", emoji: "🌸",
        growTime: 240 * 60000, yield: [10000, 30000], xp: 100,
        season: "any",         stages: ["🌱", "✨", "🌸"],
        legendary: true
    }
};
