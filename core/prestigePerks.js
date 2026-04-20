module.exports = {

    getUnlocked(perstige) {

        const perks = {
            commands: [],
            items: []
        };

        // 🎮 COMMAND UNLOCKS
        if (perstige >= 1) perks.commands.push("rob");
        if (perstige >= 2) perks.commands.push("heist");
        if (perstige >= 3) perks.commands.push("gamble");
        if (perstige >= 5) perks.commands.push("casino");

        // 🏭 ITEM UNLOCKS
        if (perstige >= 1) perks.items.push("gold_printer");
        if (perstige >= 2) perks.items.push("ai_factory");
        if (perstige >= 3) perks.items.push("dark_lab");

        return perks;
    },

    hasCommand(perstige, command) {
        const perks = this.getUnlocked(perstige);
        return perks.commands.includes(command);
    },

    hasItem(perstige, item) {
        const perks = this.getUnlocked(perstige);
        return perks.items.includes(item);
    }
};
