# Comanchería — Digital Tabletop

A browser-based digital implementation of GMT Games’ *Comanchería*. The game runs on a single board, with clickable pieces, rules-driven procedures and local save support.

## Play online

Open the GitHub Pages site for this repository (if enabled). No account or installation is required.

## Run locally

The game is a static website. Serve this folder with a local web server, for example:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000` in a modern browser. Opening `index.html` directly as a file may prevent JavaScript modules and offline features from working.

## Publish to GitHub Pages

Upload the contents of this folder to the root of your repository. In **Settings → Pages**, choose **Deploy from a branch**, your desired branch and **/(root)**, then save.

## How it works

- Select a scenario and follow the on-board prompts to begin.
- Use the board and its contextual controls to select actions, move pieces and resolve player choices.
- The game records moves and procedures in its journal and keeps saves in your browser.
- The service worker supports offline use after the site has loaded successfully and its files have been cached.

The game consists of `index.html`, the `assets/` code and presentation files, `manifest.webmanifest` and `service-worker.js`. There is no server-side process or build step.

## Notes

This is an unofficial digital implementation. Some exceptional card and battle rules are not yet fully automated; a blocked procedure is an implementation issue to fix, not permission to invent a result. The original game remains the rules reference. Your saved games are local to your browser; changing browsers, clearing site data or changing the site's address may make existing saves unavailable.
