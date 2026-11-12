/** Read-only presentation of the official operation checkpoints.
 * Never advances the ledger or treats a missing status as complete. */
export function playerPhaseProgress(phase, operation, checkpoints, steps={}) {
  const resolved = checkpoints.filter(([id]) => ['done','na'].includes(steps[id]));
  const next = checkpoints.find(([id]) => !['done','na'].includes(steps[id]));
  const name = phase==='execution' ? operation||'Operation' : phase==='cleanup'?'Cleanup':phase==='war'?'War Column Phase':phase==='selection'?'Choose operation':phase;
  return {
    name,
    completed:resolved.length,
    total:checkpoints.length,
    next:next ? {id:next[0],label:next[1],rule:next[2]} : null,
    checkpoints:checkpoints.map(([id,label,rule])=>({id,label,rule,status:steps[id]==='done'?'done':steps[id]==='na'?'na':'pending'}))
  };
}
