# First Reports — 15 March 2026

> **Context:** First two reports received after full HOD rollout on 15 March 2026.
> Two submissions — Food & Beverage (Howard) and Craft Shop (Patience covering for Halima).

---

## Food & Beverage — Howard — 15 March 2026 (on time)

### Report data

| Field | Value |
|---|---|
| Breakfast pax | 8 |
| Lunch pax | 58 |
| Dinner pax | 8 |
| Challenges | None |

**Breakfast dishes:** Ziwa meaty sunrise (4), Ziwa vegty (2), Ziwa rolex (2), Spanish omelet (2)

**Lunch notes:** Everything was ok. Items received in time, refilling done in time.

**Dinner dishes:** Chicken (7), Steak (5), Pork (2), Watermelon juice (4)

**Service observations:** Team was well organised, great improvement in staff attitude and performance.

**Challenges/successes:** No challenges. Despite low season, still receiving a fair number of guests for lunch.

### Analysis

- **Report quality: excellent.** Howard filled in every section with useful, specific detail. Bar stock comparison is thorough — 20+ line items opening and closing, enabling consumption tracking.
- **Low season context:** 58 pax for lunch is the standout figure. Howard flagged this positively and it validates tracking the number — useful for management to benchmark against season patterns.
- **Dinner dish count anomaly:** Dinner pax is 8 but dishes listed sum to 18 (Chicken 7 + Steak 5 + Pork 2 + juice 4). Multiple dishes per guest is normal — no issue with the data, but worth being aware of when reading dinner_dishes in future reports.
- **Bar stock format:** Written as free text (multi-line). This is workable and Howard has been thorough, but it makes programmatic comparison between opening and closing stock impossible. Worth flagging for v1.4 consideration — either a structured repeater or clearer prompts to format consistently.

---

## Craft Shop — Patience (covering for Halima) — 14 March 2026 (late — submitted 15 March)

### Report data

| Payment method | Total |
|---|---|
| Cash | UGX 30,000 |
| MoMo Pay | UGX 50,000 |
| Card | UGX 170,000 |
| USD | 0 |
| **Grand total** | **UGX 250,000** |

**Cash items:** Cap × 1 @ 30,000

**MoMo items:** Safari hat × 1 @ 50,000

**Card items:** Polo T-shirt × 1 @ 50,000 / Polo T-shirt Big 5 × 1 @ 50,000 / Postcard × 1 @ 5,000 / Beware Signage (S) × 1 @ 25,000 / Earrings × 1 @ 20,000 / Patch × 1 @ 20,000

**Stock status:** Stock is still available.

**Notes:** Have not got any issues for today.

### Analysis

- **Report quality: good.** All payment sections filled, itemised correctly, totals match. Card total: 50+50+5+25+20+20 = 170,000 ✓
- **"Someone else" feature worked.** Patience submitted under her own name without any workaround or support needed — the system handled the substitution cleanly.
- **Late submission correctly flagged.** Submitted 15 March for 14 March — `is_late = true` in the database. The system is working as designed.
- **Quantity format minor note:** Quantities entered as "01" (text) rather than numeric 1. The field stores whatever is typed. Not a data integrity issue but worth noting — the placeholder could prompt "e.g. 2" more explicitly.
- **Stock status vague.** "Stock is still available" gives no useful operational data. The field needs a better placeholder to prompt specificity — e.g. "List any low stock items, or write 'All stocked'" — worth updating in v1.4.
- **No USD sales on day 1.** Expected — USD sales are likely occasional/tourist-driven.

---

## System observations from first use

1. **Both reports submitted on a phone** — forms working well on mobile as intended.
2. **Data is clean and queryable.** JSON structure stored correctly. All totals calculable from raw data.
3. **Late submission detection works.** Patience's report is correctly flagged in the database.
4. **HOD substitute workflow works.** No friction — Patience just selected "Someone else" and typed her name.
5. **13 departments still to submit.** The system is live and in use — this is day one.

---

*Record created: 15 March 2026.*
