export const PIGMENT_ENEMY_COLUMNS = Object.freeze({ inkDrop: 0, inkRoller: 1, inkPlanter: 2 });

export function pigmentQueenFrame(boss, freed = false) {
  if (freed || boss.state === 'DEFEATED') return 5;
  if (boss.hitFlash > 0 && boss.coreOpen) return 4;
  if (boss.coreOpen) return 3;
  if (['TELEGRAPH', 'SHIELD_WARN', 'VOLLEY_WAIT', 'SHIELD_BUILD', 'SUMMON'].includes(boss.state)) return 1;
  if (['SHIELD', 'CORE_CLOSE'].includes(boss.state)) return 2;
  return 0;
}

export function pigmentEnemyFrame(enemy) {
  const column = PIGMENT_ENEMY_COLUMNS[enemy.type];
  if (column === undefined) return null;
  const action = ['TELEGRAPH', 'DASH'].includes(enemy.state)
    || enemy.type === 'inkPlanter' && (enemy.plantTimer < .45 || enemy.plantTimer > enemy.def.interval - .3);
  return column + (action && enemy.hp > 0 ? 3 : 0);
}
