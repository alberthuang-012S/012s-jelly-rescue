import { CONDITIONS, STATES } from './constants.js';
import { NPC } from './NPC.js?mountain-pavilion-dialogue-v2';
import { choose, distance } from './utils.js';
import { NPC_ROLE_DEFS } from './NPCRoleDefinitions.js';
import { SCENARIO_DEFS, weightedChoice } from './ScenarioDefinitions.js';
import { TravelPlanner } from './TravelPlanner.js';

const ACTIVE_STATES = [STATES.WARNING, STATES.HELP, STATES.CRITICAL];

export class EventDirector {
  constructor(stage, callbacks = {}) {
    this.callbacks = callbacks;
    this.reset(stage);
  }

  reset(stage) {
    this.stage = stage;
    this.nextNpcId = 1;
    this.nextSpawnAt = 0.8;
    this.nextEventAt = stage.event.initialDelay;
    this.lastCondition = null;
    this.conditionStreak = 0;
    this.introIndex = 0;
    this.travelPlanner = null;
  }

  seed(npcs) {
    const seedCount = this.stage.seedCount || 5;
    for (let index = 0; index < seedCount; index += 1) this.spawn(npcs, index);
  }

  spawn(npcs, preferredIndex = null) {
    const pointIndex = preferredIndex === null ? Math.floor(Math.random() * this.stage.spawnPoints.length) : preferredIndex % this.stage.spawnPoints.length;
    const point = this.stage.spawnPoints[pointIndex];
    const role = this.stage.npcTypes[(this.nextNpcId - 1) % this.stage.npcTypes.length];
    const route = point.route ? this.stage.routes[point.route] : [];
    const npc = new NPC({
      id: `npc-${this.nextNpcId++}`,
      role,
      x: point.x,
      y: point.y,
      zone: point.zone,
      path: route,
      stageId: this.stage.id
    });
    npc.onFailure = this.callbacks.onFailure;
    npc.onStateChange = this.callbacks.onStateChange;
    npcs.push(npc);
    this.callbacks.onSpawn?.(npc);
    return npc;
  }

  update(dt, stageTime, npcs) {
    const activeCount = npcs.filter((npc) => npc.active).length;
    if (stageTime < this.stage.duration && stageTime >= this.nextSpawnAt && activeCount < this.stage.maxNpcs) {
      this.spawn(npcs);
      this.nextSpawnAt = stageTime + this.getSpawnCooldown(stageTime);
    }
    if (stageTime >= this.nextEventAt && stageTime < this.stage.duration) {
      const triggered = this.triggerEvent(stageTime, npcs);
      this.nextEventAt = stageTime + (triggered ? this.getEventCooldown(stageTime) : 1.1);
    }
  }

  triggerEvent(stageTime, npcs, forcedCondition = null) {
    const events = npcs.filter((npc) => npc.active && ACTIVE_STATES.includes(npc.state));
    if (events.length >= this.getMaxSimultaneous(stageTime)) return false;
    let candidates = npcs.filter((npc) => npc.canReceiveEvent(stageTime));
    if (!candidates.length) return false;
    const baseTolerance = this.getTolerance(stageTime);
    const warningDuration = this.getWarningDuration(stageTime);
    if (this.stage.scenarioPool) {
      candidates = candidates.filter((npc) => this.isScheduleFeasible(npc, events, baseTolerance, warningDuration, stageTime));
      const selection = this.pickScenario(candidates, stageTime, forcedCondition);
      if (!selection) return false;
      const { npc, scenarioType } = selection;
      const player = this.callbacks.getPlayer?.();
      const tolerance = Math.max(baseTolerance, (player ? this.routeTime(player, npc) : 0) + 1.5 - warningDuration);
      if (!npc.startScenario(scenarioType, tolerance, warningDuration, stageTime)) return false;
      this.conditionStreak = this.lastCondition === npc.condition ? this.conditionStreak + 1 : 1;
      this.lastCondition = npc.condition;
      if (this.stage.introConditions?.[this.introIndex] === npc.condition) this.introIndex += 1;
      this.callbacks.onEvent?.(npc, npc.condition);
      return true;
    }
    const reachableCandidates = this.getReachableCandidates(candidates, baseTolerance, warningDuration);
    const npc = this.selectCandidate(
      reachableCandidates.length ? reachableCandidates : candidates,
      stageTime,
      npcs
    );
    const condition = forcedCondition || this.pickCondition(npc, stageTime);
    const estimatedTravelTime = this.estimateTravelTime(npc);
    // Direct distance is intentionally only a fairness guard, not pathfinding.
    // If every candidate is far away, grant enough tolerance for a reasonable
    // run instead of creating an event that is impossible by construction.
    const safetyMargin = 1.5;
    const adjustedTolerance = Math.max(
      baseTolerance,
      estimatedTravelTime + safetyMargin - warningDuration
    );
    npc.startEvent(condition, adjustedTolerance, warningDuration, stageTime);
    this.lastCondition = condition;
    this.callbacks.onEvent?.(npc, condition);
    return true;
  }

  selectCandidate(candidates, stageTime, npcs = []) {
    if (candidates.length <= 1) return candidates[0];
    const activeEvents = npcs.filter((npc) => npc.active && ACTIVE_STATES.includes(npc.state));
    if (!activeEvents.length) return choose(candidates);

    const preferredSeparation = this.stage.id === 'mountain' ? 230 : 180;
    const separated = candidates.filter((candidate) => activeEvents.every((event) => (
      distance(candidate, event) >= preferredSeparation
    )));
    const pool = separated.length ? separated : candidates;
    const player = this.callbacks.getPlayer?.();
    const pressure = stageTime >= (this.stage.id === 'mountain' ? 40 : 45);
    const scored = pool.map((candidate) => {
      const nearestActiveDistance = Math.min(...activeEvents.map((event) => distance(candidate, event)));
      const playerDistance = player ? distance(player, candidate) : 0;
      const oppositeDirectionBonus = player && activeEvents.some((event) => {
        const activeX = event.x - player.x;
        const activeY = event.y - player.y;
        const candidateX = candidate.x - player.x;
        const candidateY = candidate.y - player.y;
        const activeHorizontal = Math.abs(activeX) > Math.abs(activeY);
        const candidateHorizontal = Math.abs(candidateX) > Math.abs(candidateY);
        return activeHorizontal === candidateHorizontal
          ? Math.sign(activeHorizontal ? activeX : activeY) !== Math.sign(candidateHorizontal ? candidateX : candidateY)
          : true;
      }) ? 120 : 0;
      return {
        candidate,
        score: nearestActiveDistance
          + oppositeDirectionBonus
          + (pressure ? nearestActiveDistance * 0.25 : 0)
          - playerDistance * 0.08
      };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].candidate;
  }

  estimateTravelTime(npc) {
    const player = this.callbacks.getPlayer?.();
    if (!player) return 0;
    const rescueRange = 60;
    return Math.max(0, distance(player, npc) - rescueRange) / Math.max(1, player.speed || 205);
  }

  getPhaseConfig(stageTime) {
    return this.stage.phases?.find((phase) => stageTime < phase.until) || this.stage.phases?.at(-1);
  }

  pickScenario(candidates, stageTime, forcedCondition = null) {
    const phase = this.getPhaseConfig(stageTime);
    const pool = phase?.scenarioPool || this.stage.scenarioPool || [];
    const options = candidates.flatMap((npc) => pool.map((scenarioType) => ({
      npc, scenarioType,
      weight: (this.stage.scenarioWeights[scenarioType] || 0) * this.getRoleScenarioWeight(npc, scenarioType)
    })).filter((option) => option.weight > 0));
    const conditions = [...new Set(options.map((option) => SCENARIO_DEFS[option.scenarioType].condition))];
    if (!conditions.length || (forcedCondition && !conditions.includes(forcedCondition))) return null;
    // Choose the product family first so role count/weights cannot skew the
    // stage ratio. A temporary missing family defers rather than substituting.
    const stageFamilies = [...new Set(pool.map((type) => SCENARIO_DEFS[type].condition))];
    const condition = forcedCondition || this.pickScenarioCondition(stageFamilies, phase);
    const eligible = options.filter((option) => SCENARIO_DEFS[option.scenarioType].condition === condition);
    const scenarioType = weightedChoice([...new Set(eligible.map((option) => option.scenarioType))]
      .map((type) => [type, this.stage.scenarioWeights[type]]));
    if (!scenarioType) return null;
    const roleCandidates = eligible.filter((option) => option.scenarioType === scenarioType);
    const npcId = weightedChoice(roleCandidates.map((option) => [option.npc.id, this.getRoleScenarioWeight(option.npc, scenarioType)]));
    return { scenarioType, npc: candidates.find((npc) => npc.id === npcId) };
  }

  getRoleScenarioWeight(npc, scenarioType) {
    return this.stage.roleScenarioWeights?.[scenarioType] ?? NPC_ROLE_DEFS[npc.role]?.scenarioWeights[scenarioType] ?? 0;
  }

  pickScenarioCondition(families, phase) {
    if (!phase?.conditionWeights) return families.length === 1 ? families[0]
      : Math.random() < phase.ppaRatio ? CONDITIONS.ITCH : CONDITIONS.SORENESS;
    const weights = Object.entries(phase.conditionWeights).filter(([condition]) => families.includes(condition));
    const introCondition = this.stage.introConditions?.[this.introIndex];
    // Retry the first introduction until a feasible resident is available.
    // Subsequent introductions start only in their configured phase.
    if (introCondition && (this.introIndex === 0 || weights.some(([condition, weight]) => condition === introCondition && weight > 0))) return introCondition;
    const alternatives = weights.filter(([condition, weight]) => weight > 0 && condition !== this.lastCondition);
    if (this.conditionStreak >= this.stage.maxConditionStreak && alternatives.length) return weightedChoice(alternatives);
    return weightedChoice(weights);
  }

  routeTime(from, to) {
    const player = this.callbacks.getPlayer?.();
    if (!player) return 0;
    if (!this.travelPlanner) this.travelPlanner = new TravelPlanner(this.stage, player.radius || 25);
    // Center-to-center is conservative: the actual Use range is more generous.
    return this.travelPlanner.pathDistance(from, to) / Math.max(1, player.speed || 205);
  }

  isScheduleFeasible(candidate, events, tolerance, warningDuration, stageTime) {
    const player = this.callbacks.getPlayer?.();
    if (!player) return true;
    const travel = this.routeTime(player, candidate);
    const newDeadline = Math.max(tolerance + warningDuration, travel + 1.5);
    if (!Number.isFinite(travel) || newDeadline > this.stage.duration - stageTime) return false;
    if (!events.length) return travel + 1.5 <= newDeadline;
    // Current stages cap simultaneous events at two. Test both visit orders,
    // including time to use/switch items, against each resident's own deadline.
    return events.every((event) => {
      const deadline = (event.state === STATES.WARNING ? event.warningTimer : 0) + event.tolerance;
      const toExisting = this.routeTime(player, event);
      const between = this.routeTime(event, candidate);
      return (toExisting + .75 <= deadline && toExisting + between + 1.5 <= newDeadline)
        || (travel + .75 <= newDeadline && travel + between + 1.5 <= deadline);
    });
  }

  getReachableCandidates(candidates, tolerance, warningDuration) {
    const player = this.callbacks.getPlayer?.();
    if (!player) return candidates;
    const availableTime = tolerance + warningDuration - 1.5;
    return candidates.filter((candidate) => this.estimateTravelTime(candidate) <= availableTime);
  }

  pickCondition(npc, stageTime) {
    if (this.stage.id === 'park') {
      if (stageTime < 12) return CONDITIONS.ITCH;
      if (stageTime < 20) return Math.random() < 0.58 ? CONDITIONS.SORENESS : CONDITIONS.ITCH;
      if (stageTime < 45) return Math.random() < 0.5 ? CONDITIONS.ITCH : CONDITIONS.SORENESS;
    }
    const zone = this.stage.zones.find((item) => item.id === npc.zone);
    if (zone?.preference === 'itch' && Math.random() < (stageTime >= 45 ? 0.62 : 0.74)) return CONDITIONS.ITCH;
    if (zone?.preference === 'sore' && Math.random() < (stageTime >= 45 ? 0.62 : 0.74)) return CONDITIONS.SORENESS;
    return Math.random() < 0.5 ? CONDITIONS.ITCH : CONDITIONS.SORENESS;
  }

  getTolerance(stageTime) {
    if (this.stage.phases) return this.getPhaseConfig(stageTime).tolerance;
    if (this.stage.id === 'park') {
      if (stageTime < 12) return 11;
      if (stageTime < 20) return 10.2;
      if (stageTime < 45) return 8.9;
      return 7.4;
    }
    if (stageTime < 15) return 10.4;
    if (stageTime < 40) return 9.4;
    return 8.1;
  }

  getWarningDuration(stageTime) {
    if (this.stage.phases) return this.getPhaseConfig(stageTime).warningDuration;
    if (this.stage.id === 'park') {
      if (stageTime < 12) return 3.8;
      if (stageTime < 20) return 3.5;
      if (stageTime < 45) return 3;
      return 2.6;
    }
    if (stageTime < 15) return 4;
    if (stageTime < 40) return 3.5;
    return 3.1;
  }

  getMaxSimultaneous(stageTime) {
    if (this.stage.phases) return this.getPhaseConfig(stageTime).maxSimultaneous;
    if (this.stage.id === 'park') {
      if (stageTime < 20) return 1;
      if (stageTime < 45) return 2;
      return 2;
    }
    if (stageTime < 15) return 1;
    if (stageTime < 40) return 2;
    return 2;
  }

  getSpawnCooldown(stageTime) {
    if (this.stage.phases) return this.getPhaseConfig(stageTime).spawnCooldown;
    if (this.stage.id === 'park') {
      if (stageTime < 12) return 6.2;
      if (stageTime < 20) return 5.3;
      if (stageTime < 45) return 4.8;
      return 3.8;
    }
    if (stageTime < 15) return 6;
    if (stageTime < 40) return 5;
    return 4;
  }

  getEventCooldown(stageTime) {
    if (this.stage.phases) return this.getPhaseConfig(stageTime).eventCooldown;
    if (this.stage.id === 'park') {
      if (stageTime < 12) return 5.6;
      if (stageTime < 20) return 4.7;
      if (stageTime < 45) return 4.1;
      return 3;
    }
    if (stageTime < 15) return 5.8;
    if (stageTime < 40) return 4.5;
    return 3.1;
  }
}
