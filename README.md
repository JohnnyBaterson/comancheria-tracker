# Comanchería digital tabletop · v2.05

Upload the **contents** of this folder to the root of your GitHub Pages repository, keeping `assets/` intact.

No copyrighted artwork is bundled. Load your original artwork locally through **Import TTS assets** in the game; the existing private artwork association system remains in place.

Play on the original printed board. Select a Paraibo on its printed Medicine row, then the printed AP/Military track or an eligible Tribe, War Column, or Instruction to perform that Headman's legal action. If multiple distinct decisions are valid, the game will not choose for you.

Saved-game import remains disabled. Do not commit original artwork or credentials.

## Single-board presentation (v2.05)

- The printed board is the sole gameplay surface. No persistent utility strip, top navigation, rail, or external action menu is mounted.
- The separate plain-text chronological action log stays at the left margin.
- Current legal choices appear only in a temporary, centred board overlay. Tap the small in-board current-decision cue, click an unused portion of the board, or press **D** to reopen it. Close the overlay to return to the uninterrupted board.
- Undo, redo, fresh game, and guided rule choices are available inside that temporary decision overlay rather than on permanent controls.
- Card inspection and card reveals remain overlays. Existing saves and the rules engine are unchanged.

## Board interaction refinement (v2.05)

- Decisions use the exact legality-filtered commands used by printed counter/track interactions, including special Band, Medicine, and History actions.
- Setup decisions open over the board and use the existing official scenario setup flow. The decision cue remains available even when the engine lists no direct choices.
- Card reveals, board event splash displays, and inspection modals are contained within the board area, not separate full-screen routes.
- Escape dismisses the decision overlay. Gameplay changes still go through the original rules engine and locally saved state.

## v2.05 · Counter-targeted decisions

- Clicking a physical counter with exactly one legal matching action performs that reducer-validated action immediately (existing behavior).
- Clicking a physical counter with multiple legal matching actions now presents **only that counter's choices** in a temporary overlay on the board, rather than silently selecting it or opening a full menu.
- The choice is rechecked against the active game state before commitment; no arbitrary command is executed.
- A printed map space with multiple legal actions opens the already filtered decision overlay, rather than leaving an invisible choice pending.
- Escape and the close control dismiss the context without changing the game. All decisions and artwork remain on the board; the action log remains the sole separate surface.

## v2.06 · Direct destinations and printed-card contexts

- Select a physical Band, Ranchería, Tribe, Resource, Bison or Mahimiana counter, then click a **highlighted legal map destination** to complete the same action as dragging that counter there. Only commands accepted by the game reducer are exposed.
- The printed map highlights destinations for selected counters; selecting a destination with more than one legal command opens a **temporary, board-centred choice overlay** rather than arbitrarily choosing.
- Clicking a Ranchería's printed Resources square presents its **own current legal actions** when there are several; unique legal actions can resolve immediately. Medicine track completion retains priority.
- Clicking a printed card executes its unique reducer-validated effect if the director explicitly identifies that exact card; multiple eligible effects appear over the board. Otherwise it opens the existing on-board card inspection.
- Existing drag interactions, AP/Culture/Military tracks, card reveals, chronological action log and local browser saves remain in place.
- New actions do not add navigation bars, side panels, off-board buttons or non-gameplay screens.

Validation: JavaScript syntax checks across all files and 25 initial scenario choice reducer checks passed. Browser navigation was blocked in the test environment; interactive full-game verification is still required. No imported artwork is bundled.

## v2.07 startup hotfix
- Fixed startup ReferenceError: `clickDestinations is not defined` by accepting the destination set in `mapSpaceNode` (as passed by `boardMap`). The previous exception was incorrectly caught and labelled as local artwork failure.
- Bumped service-worker cache key to `v2.07-click-destinations-fix` to prevent a stale offline app.js from surviving deployment.
- Verified JavaScript syntax with Node.js. Browser smoke test was attempted but the environment rejected navigation to a local HTTP server (`net::ERR_BLOCKED_BY_ADMINISTRATOR`).
