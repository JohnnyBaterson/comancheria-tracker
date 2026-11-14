/** The reducer is the authority for legality, never the board director.
 * This adapter checks complete proposed commands against the exact unchanged
 * current state. perform() is immutable and returns a new state; it does not
 * commit, roll dice for the live game, or consume the live RNG.
 */
export function gateProposedPrompt(state, prompt, reducer) {
  if (!prompt || !['player', 'automatic'].includes(prompt.kind)) return prompt;
  const probe = command => {
    if (!command || typeof command.type !== 'string') return 'Missing command type';
    try { reducer(state, command); return null; }
    catch (error) { return String(error?.message || error); }
  };
  if (prompt.kind === 'automatic') {
    const reason = probe(prompt.command);
    if (!reason) return prompt;
    return {kind:'evidence',title:`${prompt.title}: command unavailable`,
      detail:`The rules engine rejected the proposed ${prompt.command?.type || 'unknown'} action: ${reason}. The board must not offer an unclickable action.`,
      invalidCommands:[{command:prompt.command,reason}]};
  }
  const choices = prompt.choices || [];
  const valid = [], invalid = [];
  for (const choice of choices) {
    const reason = probe(choice.command);
    if (reason) invalid.push({command:choice.command,label:choice.label,reason});
    else valid.push(choice);
  }
  if (!invalid.length) return prompt;
  if (valid.length) return {...prompt,choices:valid,invalidCommands:invalid};
  return {kind:'evidence',title:`${prompt.title}: no executable choices`,
    detail:`All ${invalid.length} proposed choices were rejected by the rules engine. First: ${invalid[0].reason}. Resolve the pending procedure; do not invent a default.`,
    invalidCommands:invalid};
}
