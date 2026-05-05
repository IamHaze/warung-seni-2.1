# Database & Config Updates Summary

## Database Changes (db.js)

### New Column Added to `users` Table:
- `fish_streak` (INTEGER DEFAULT 0) — Tracks consecutive fishing catches for streak bonuses

### Existing Column Auto-Patching:
The database schema manager safely adds missing columns via `ALTER TABLE` with `PRAGMA` checks to prevent duplication:
- `heat`, `prestige`, `last_rob`, `pending_income`, `xp`, `level` on users
- `level` on inventory
- `collect_day`, `collect_day_total` on users

### New Tables Created:
- `ai_rob_log` — Tracks AI robbery attempts for player counter-attacks
- `fishing_log` — Logs fish caught per user (optional future use)
- `duel_log` — Tracks duel wins/losses
- `pets` & `pet_neglect_log` — Pet system support

---

## Config.json Updates

### New Fishing Items:

#### Fishing Rods (1 per player max):
- `bamboo_rod` (500 coins) — Base rod, 72% catch rate
- `iron_rod` (2,000 coins) — +5% rarity bonus
- `golden_rod` (8,000 coins) — +12% rarity bonus, 15% double catch
- `crystal_rod` (25,000 coins) — +22% rarity bonus, 30% double catch

#### Bait (Stackable, consumable):
- `worm_bait` (300 coins, max 100) — +7% catch bonus, +5% rarity
- `magic_bait` (1,200 coins, max 100) — +10% catch bonus, +20% rarity

---

## Code Changes Summary

### 1. **wfarm** (commands/farm.js)
- Reduced multipliers: 1.0→0.3, 1.5→0.5, 2.5→0.8
- Harder = longer time windows, more codes to type
- Penalty: Wrong answer = 50% income, Timeout = 75% income

### 2. **wfish** (commands/fish.js) — MAJOR UPGRADE
- **Gear System**: Rods with different catch rates & rarity multipliers
- **Bait System**: Worm & magic bait consumed per cast
- **Weather**: Daily stable weather affecting catch rates
- **Locations**: 5 tiers unlocked by player level (Pond → Abyss)
- **Streak System**: Bonus multiplier for consecutive catches
- **Multi-Catch**: Chance to catch 2 fish at once
- **13 Fish Types**: Junk → Mythic, each with value & XP rewards
- **Fixed Button Issue**: Converted to async/await, proper Promise handling

### 3. **wfight** (commands/fight.js) — NEW
- Counters AI robbery attempts
- Win = reclaim coins, Lose = lose extra 20%
- 5-minute window to fight back

### 4. **AI Robbery System** (index.js)
- Every 30 mins: random player robbed (10-40% of wallet)
- Victim gets DM with attacker info
- Victim can fight back with `wfight` within 5 mins
- Event broadcast to event channel

### 5. **Prestige Income Nerfs**
- **Prestige multiplier**: 0.2 → 0.05 (20% → 5% per level)
- **Passive income cap**: 100M coins per 10-minute tick
- **P20+ item income**: Reduced by ~60% (e.g., 25B → 15M per tick)
- **Dynamic config**: Passive system now reads from config.json (was hardcoded)

### 6. **Bug Fixes**
- Pending income now caps at 100M to prevent exploitation
- Hardcoded item income removed (now uses config dynamically)
- Fish.js async/await properly implemented for button handling

### 7. **Shop Updates** (commands/shop.js)
- Added Fishing Gear section with 6 items
- Added prestige-only item validation to include new P20-45 items

### 8. **Buy Command Updates** (commands/buy.js)
- Rods added to SINGLE_ONLY list (1 per player)
- Updated prestigeOnly list with all new prestige items
- Bait stackable up to 100

---

## Database Migration Notes

✅ **Zero Data Loss**: All changes use:
- `CREATE TABLE IF NOT EXISTS` for new tables
- `ALTER TABLE ... ADD COLUMN` with PRAGMA checks for safe column addition
- Existing row data preserved with sensible defaults

✅ **Auto-Patching**: On bot startup, missing columns are automatically added to existing tables.

✅ **Safe Defaults**:
- fish_streak: 0
- pending_income: 0 (capped at 100M per tick)
- New user columns: sensible defaults (heat=0, prestige=0, etc.)

---

## Testing Checklist

- [ ] Fishing works with buttons
- [ ] Rods can be bought (one per player)
- [ ] Bait can be stacked and is consumed on cast
- [ ] Weather changes daily (stable per UTC day)
- [ ] Streak bonus multiplies on consecutive catches
- [ ] AI robbery triggers every 30 mins
- [ ] Player can `wfight` to counter robbery
- [ ] wfarm is challenging and gives 30-80% income vs 2.5x (much nerfed)
- [ ] Prestige multiplier is 5% per level, not 20%
- [ ] Passive income caps at 100M per tick
- [ ] New prestige items (P20-45) can be purchased with wpbuy
