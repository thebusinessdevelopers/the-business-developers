# BMS Research Phase — Summary

> **Completed:** 30 March 2026  
> **Produced by:** Chat 2 (Research phase)  
> **Contains:** Four research documents covering successful examples, market research, competition, and creative solutions.

---

## Files in this folder

| File | Contents |
|---|---|
| `successful_examples.md` | Six examples: Mews, Cloudbeds, Toast, Duetto/GuestEQ, KoboToolbox, M-Pesa. What each did well and what BMS carries forward. |
| `market_research.md` | Uganda/East Africa hospitality sector: scale, current tools, operational pain points, infrastructure realities, purchasing dynamics, willingness to pay. |
| `competition.md` | Ten competitors mapped: Karibu (the primary incumbent), Mews, Cloudbeds, Little Hotelier, Hotelogix, NightsBridge, Hotel360, Opera, WhatsApp+spreadsheets, paper. Where BMS fits the gap. |
| `creative_solutions.md` | Five unconventional advantages: offline-first architecture, WhatsApp data entry, three-tier intelligence trigger model, progressive onboarding, mobile money as first-class payment. |

---

## The Five Most Important Research Findings

**1. The intelligence gap is real, unfilled, and the right bet.**
Duetto and GuestEQ demonstrate that operational intelligence is a paying category — but only at the enterprise end of the market. No system serves small-to-medium lodges in East Africa with anything beyond basic reporting. BMS's core differentiation is confirmed and unoccupied.

**2. WhatsApp and spreadsheets are the dominant incumbent, not Karibu.**
Most Ugandan lodges are not on Karibu. They are on WhatsApp groups and paper. BMS must be simple and compelling enough to displace this — which is a higher bar than displacing a paid competitor, because "free and familiar" is hard to beat without visible, demonstrable value.

**3. Offline-first is not a feature, it is the architecture.**
Uganda's internet penetration is ~28%. Rural lodges operate with intermittent connectivity. Any system that requires live internet for basic read/write operations will fail. Offline-first (service worker + IndexedDB, writes local, syncs in background) must be designed in from the beginning, not retrofitted.

**4. Mobile money is the payment infrastructure, not an add-on.**
MTN Mobile Money and Airtel Money are how transactions happen at Ugandan lodges. Stripe is not the default. BMS must treat mobile money as a first-class payment method — webhook-integrated, invoice-linked, audit-trailed — from V1.

**5. Karibu is trusted locally and feature-complete, but has zero intelligence.**
The competitive strategy is not to out-feature Karibu. It is to make Karibu's intelligence blind spot visible and painful. The Rafiki Lodge fraud case (60M UGX lost to an ex-employee with fake invoices) is the proof point. BMS's morning brief and accountability layer are the answer.

---

## What Research Changed From the Brainstorm

The brainstorm correctly identified intelligence as the centrepiece. Research adds one important calibration: **operational intelligence (accountability, anomaly detection, cross-department correlation) is more immediately valuable in this market than predictive intelligence (revenue forecasting).** A lodge owner in Murchison Falls needs to know if their stock room is being raided. They don't need a 90-day occupancy forecast. V1 should prioritise accountability and anomaly detection; forecasting follows in V3+.

---

## Open Questions Research Could Not Fully Resolve

1. **Exact Uganda PMS adoption numbers.** How many of the 780+ UHOA member hotels use Karibu vs. nothing at all vs. something else? The UHOA number is the best proxy, but direct market penetration data is not publicly available.

2. **Willingness to pay above Karibu's $75–125/month.** Research strongly suggests it is present if value is visible, but this needs validation with real lodge managers before setting BMS pricing.

3. **WhatsApp Business API registration complexity.** Meta's business verification process can be slow or blocked for new companies. This needs investigation before committing WhatsApp to V1.

4. **Department template library scope.** What are the universal vs. variable departments across different property types? Research gives a good starting list (Kitchen, F&B, Housekeeping, Security, Maintenance, Reception, Management) but the template library design needs validation against more property types before the architecture phase locks it in.
