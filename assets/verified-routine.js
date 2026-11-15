/** Advance only reducer-validated routine steps. No player choices, unknown
 * printed effects, or unviewed card reveals may be passed automatically.
 * The caller persists the completed sequence as one atomic Undo checkpoint.
 * Enemy selection and display flips are safe to chain only when the turn director
 * returns a source-verified automatic command. Unknown History tables or
 * counter faces still present a player/evidence prompt and terminate the chain.
 */
export function runVerifiedRoutine(initial, nextPrompt, reduce, reveals) {
  let current = initial;
  const applied = [];
  const seen = new Set();
  for (;;) {
    // Journaling and random-seed metadata must not disguise a repeated board state.
    const {log,revision,rng,quality,createdAt,...gameplay} = current;
    const signature = JSON.stringify(gameplay);
    if (seen.has(signature)) break;
    seen.add(signature);
    const prompt = nextPrompt(current);
    if (prompt.kind !== 'automatic' || !prompt.command) break;
    try {
      const next = reduce(current, prompt.command);
      if (next === current) break;
      applied.push({type:prompt.command.type,title:prompt.title});
      const newlyRevealed = reveals(current,next);
      current = next;
      if (newlyRevealed.length) break;
    } catch { break; }
  }
  return {state:current,applied};
}
