import { STATES } from './constants.js';

export const INJURY_ROLES = Object.freeze({
  basketballPlayer: { fall: 0 },
  skateboarder: { fall: 1 },
  runner: { sore: 2, fall: 4 },
  fitnessGuy: { sore: 3 }
});

// Pose selection follows the existing reaction timer. It never delays rescue,
// extends a deadline, moves a collision body or adds gameplay state.
export function injuryPose(npc, now = 0) {
  const role = INJURY_ROLES[npc.role];
  const row = role?.[npc.reactionType];
  if (row === undefined || !npc.scenarioType
    || ![STATES.WARNING, STATES.HELP, STATES.CRITICAL].includes(npc.state)) return null;
  const progress = npc.reactionDuration > 0 ? 1 - npc.reactionTimer / npc.reactionDuration : 1;
  const frame = progress < .32 ? 0 : progress < .72 ? 1
    : 2;
  return { row, frame, settled: progress >= .72 };
}
