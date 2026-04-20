module.exports = (userId) => {
    const ADMINS = [
        "990072589533724752" // 👈 your ID
    ];

    return ADMINS.includes(userId);
};
