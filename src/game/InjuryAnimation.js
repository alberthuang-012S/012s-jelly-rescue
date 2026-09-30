import { STATES } from './constants.js';

export const INJURY_ROLES = Object.freeze({
  basketballPlayer: { row: 0, reaction: 'fall' },
  skateboarder: { row: 1, reaction: 'fall' },
  runner: { row: 2, reaction: 'sore' },
  fitnessGuy: { row: 3, reaction: 'sore' }
});

// Pose selection follows the existing reaction timer. It never delays rescue,
// extends a deadline, moves a collision body or adds gameplay state.
export function injuryPose(npc, now = 0) {
  const role = INJURY_ROLES[npc.role];
  if (!role || role.reaction !== npc.reactionType || !npc.scenarioType
    || ![STATES.WARNING, STATES.HELP, STATES.CRITICAL].includes(npc.state)) return null;
  const progress = npc.reactionDuration > 0 ? 1 - npc.reactionTimer / npc.reactionDuration : 1;
  const frame = progress < .32 ? 0 : progress < .72 ? 1
    : 2;
  return { row: role.row, frame, settled: progress >= .72 };
}
