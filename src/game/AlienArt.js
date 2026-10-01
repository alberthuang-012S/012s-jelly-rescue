// Atlas cell order is shared by the packer, renderer and preview.
export const ALIEN_ENEMY_COLUMNS = Object.freeze({ mosquitoScout: 0, mosquitoCharger: 1, mosquitoBubble: 2 });
export function alienEnemyFrame(enemy, time) {
  const flapRate = ['TELEGRAPH', 'DASH'].includes(enemy.state) ? 18 : 10;
  return ALIEN_ENEMY_COLUMNS[enemy.type] + (Math.floor(time * flapRate) % 2) * 3;
}
export function alienBossFrame(enemy, time, dizzy = false) {
  if (dizzy) return 4;
  if (enemy.coreOpen || ['FATIGUE', 'CORE_OPEN'].includes(enemy.state)) return 3;
  if (['TELEGRAPH', 'DASH', 'BUBBLE', 'SUMMON'].includes(enemy.state)) return 2;
  return Math.floor(time * 8) % 2;
}
