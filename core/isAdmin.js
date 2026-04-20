const config = require("../config.json");

module.exports = function isAdmin(message) {
    // owner check
    if (config.admin.owners.includes(message.author.id)) return true;

    // role check (optional)
    if (config.admin.roles.length > 0 && message.member) {
        return message.member.roles.cache.some(r =>
            config.admin.roles.includes(r.id)
        );
    }

    return false;
};
