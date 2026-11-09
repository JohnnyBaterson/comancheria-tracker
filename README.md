# Comanchería · Table Companion

**Static, offline-capable, local-first companion for the physical board game** *Comanchería: The Rise and Fall of the Comanche Empire* (GMT Games, Joel Toppen).

**Status: working early-access prototype (v0.1.0), partial rules validation.** It is **NOT** a fully rules-enforcing implementation of Comanchería. You must own/use the physical game, read the printed cards and rules, and verify manual decisions. The app has no server dependency and is suitable for GitHub Pages.

## Deploy on GitHub Pages (no coding or build required)

1. Download `comancheria-tracker.zip` and **extract** it on your computer.
2. Create a new **public** repository on GitHub, e.g. `comancheria-tracker`.
3. Upload the **contents** of the extracted folder to the repository root: `index.html`, `assets/`, `manifest.webmanifest`, `service-worker.js`, and (optionally) the rest of the source/documentation. Do **not** upload just the ZIP; GitHub Pages won't unpack it.
4. In the GitHub repository, open **Settings → Pages**. Under **Build and deployment**, select **Deploy from a branch**, then **main** / **(root)** and **Save**.
5. Open `https://YOUR-USERNAME.github.io/comancheria-tracker/` after Pages has deployed. Works in Firefox, Chrome, Safari and mobile browsers with normal modern JavaScript support.

No npm or database is needed to deploy. There are no external stylesheets, scripts or card-image dependencies. All URLs are relative, so deployment from a project subpath works.

To try locally, serve the folder with a static server (ES modules generally cannot run by double-clicking `index.html` from `file://`):

```sh
cd comancheria-tracker
python3 -m http.server 8000
# Open http://localhost:8000/
```

## Getting started

- **Overview → Settings:** Choose an official scenario. The app starts empty; set Military, Culture and AP tracks and enter counters from the *printed scenario setup* before starting. The **demonstration game is invented example data**, not an official scenario setup.
- **Pieces & stock:** Add every physical counter as an individually tracked piece. Each counter may sit on a numbered map space, in a Ranchería Resources box (`box:Ranchería`), be possessed by a Band (`held:Band`), sit in stock, or be removed permanently.
- **Board map:** Select areas to inspect counters. The map is an original schematic list of all 36 numbered territory spaces, Palo Duro Canyon, 5 Enemy squares, and Reservation; it does **not** trace the official edges.
- **Board map → Add map connection:** Enter the actual solid/dashed edge after verifying the line on your physical map. Until entered, the rules engine blocks Band moves over that edge. You are responsible for correctly transcribing connections; the app does not certify the complete map graph.
- **Operations:** Tick **Done** or **N/A** for each step of the procedure only after doing it physically. An unchecked step blocks advancement. During Take Actions, activate a Band and record Move, Hunt, Raid and Trade if applicable.
- **Cards & events:** Enter card IDs/short names and zones; consult physical card text for actual game effects.
- **Action journal:** Review every recorded state change. Undo/Redo restores prior snapshots. **Reconcile the physical board after Undo/Redo.**
- **Settings → Export JSON:** Save a portable backup. Import into the app on another browser/device to continue. Browser storage can be cleared by privacy features or manual deletion, so export backups regularly.

## Implemented checks (some operations still require manual prerequisite confirmation)

| Feature | Behaviour | Primary source |
|---|---|---|
| Tracks | Military, Culture, Player AP and Enemy AP constrained to 0–9 | §1.2, §2.11 |
| Immediate defeat | Cannot start with both tracks at 0; dropping both Military and Culture to 0 ends game | §2.11.1 |
| Mandatory Passage | Blocks other Operations if no Bands are in play or mandatory marker is set | §3.2 |
| War/Operations/Cleanup | Guided checkpoints, N/A and Done; incomplete checkpoints block advancing | §3–4 |
| Basic stacking | Blocks leaving Cleanup when more than one restricted counter occupies a round/canyon space, or more than one Band an Enemy square | §2.4, §3.4 |
| Activation | Paid outside-band activation costs Strength in AP; free activation requires user to acknowledge medicine track | §4.1 |
| Movement | Band crosses a **player-recorded** adjacent connection; costs 1 movement point with possessed Horse, otherwise 2 | §5.2.2 |
| Horse spending | Spending one possessed Horse grants 1 movement point | §4.1.1.C |
| Hunt | Requires Bison in active Band space; costs 2 movement if possessing Mahimiana, otherwise 3 | §5.2.1 |
| Raid | Requires Enemy or Peace space; spends 1 movement; locks other commands until physical Success Check is resolved; enters loot/Ravaged | §5.2.3 |
| Trade | Enemy or Peace target; relevant Ravaged restrictions; possessed Horse/Captives/Bison; consumes resource, 1 movement and conditional Player AP | §5.2.4 |
| Permanently removed counter | Can't return from `Removed from game` except by Undo | §1.2 |
| Optional physical stock caps | Prevents exceeding user-entered per-type/subtype limits | §1.3 (counter supply) |
| Saving & review | Local JSON snapshots, action journal, undo/redo, JSON import/export, offline cache on HTTPS | App feature |

**Warning:** A command passing these checks is **only a check against implemented rules**, not a certification that it is globally legal under all cards, historical periods, or enemy procedures. The journal distinguishes automatically validated sub-actions from manually acknowledged input; actions that rely on a verified *user-entered* connection are marked manual.

## Not yet automated

- Exact official scenario setup for all five scenarios, including pieces, enemy display instructions, initial cards/cups and prescribed stock. Setup is manually entered.
- Exact official board adjacency graph. It must be manually transcribed before moves can be validated against it.
- Complete Paraibo medicine-track/Band order mechanics, full Ranchería activation semantics, detailed Planning and Culture operations, and card-triggered actions.
- Automated calculation of the success check cup, random draws/dice, enemy instructions, War Column pathfinding, Battles, Passage of Time's 15 substeps, and victory-objective evaluation.
- Correct application of all four History cards, 84 Development cards, 24 Culture cards, 25 War cards, and their precedence interactions.
- Exhaustive physical piece inventory from official countersheets, automatic enemy display, counter shortage substitution edge cases, and all territory rules.
- Shared real-time games, a backend, or automatic camera reading of physical counters.

The **Passage of Time** checklist has 15 slots by rule number; for some steps it is deliberately a generic prompt to consult the printed §4.4. It is **not** an attempt to reproduce all game procedures or automatically calculate their consequences. All checkpoint N/A markings are user-judged.

Until these gaps are closed, use this as an **assisted ledger** and do not rely on it to rule out every illegal action or forgotten consequence.

## Project layout

```
index.html                     Static entry point
assets/style.css               Original responsive dark UI
assets/app.js                  UI, event journal, save/export, controls
assets/engine.js               Framework-free, pure validation/reducer
assets/icon.svg                Original app icon
manifest.webmanifest           Installable PWA settings
service-worker.js              Offline static-file cache after first HTTPS visit
tests/engine.test.mjs          Automated rules-subset regression tests
package.json                  Optional local test command
README.md                     This file
LICENSE                       MIT license for original companion source
```

Run engine checks: `npm test` (Node 22 recommended). Browser shell was smoke-tested with Chromium; normal hosting still needs a real-world check in Firefox after uploading.

## References and licensing

The independent tracker is based on the publisher's [Spring 2024 Living Rules](https://gmtwebsiteassets.s3.us-west-2.amazonaws.com/comancheria/Comancheria_LivingRules_low-res.pdf), and the official [GMT game/resources page](https://www.gmtgames.com/p-872-comancheria-the-rise-and-fall-of-the-comanche-empire-2nd-printing.aspx).

Original companion source is MIT licensed. *Comanchería* is the property of its creators and GMT Games; no official map artwork, card scans or counter art is bundled. This unofficial tool is not endorsed by or affiliated with GMT Games. User-created session data should not be published to public GitHub repos by accident. The game state lives in the player's own browser, not in the GitHub repository.

## A possible later roadmap

1. Transcribe and unit-test **the exact map graph and physical counter supply** against GMT components.
2. Enter each **official scenario setup** as data and compare it to the published playbook.
3. Implement complete **Ranchería/medicine and Culture/Planning procedures** with explicit rule-source provenance.
4. Implement **enemy instruction machine**, War Columns, combat, Success Check cup, draws and physical dice mode.
5. Add **all official card effects**, provenance and comprehensive tests of precedence and historical-period transitions.
6. Test every step against official tutorial examples, errata/FAQ and complete physical playthroughs, then clearly mark rules coverage as complete **only when demonstrated**.
