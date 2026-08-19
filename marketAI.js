const db = require("../database/db");

function runMarketAI() {
    setInterval(() => {
        db.all("SELECT * FROM market", [], (err, items) => {
            if (err) return console.log(err);

            items.forEach(item => {
                // 📉 decay demand slowly
                let demand = item.demand * 0.95;

                if (demand < 1) demand = 1;

                // 💹 adjust price
                const newPrice = Math.floor(item.price * (demand / item.demand));

                db.run(
                    "UPDATE market SET demand = ?, price = ? WHERE item = ?",
                    [demand, newPrice, item.item]
                );
            });
        });

        console.log("📉 Market adjusted");
    }, 60000); // every 60 sec
}

module.exports = runMarketAI;
