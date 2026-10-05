import { CONDITIONS, ITEMS } from './constants.js';

const define = (condition, reaction, warning, help, critical, rescued = '好多了！') => Object.freeze({
  condition, reaction, reactionDuration: reaction === 'fall' ? 0.85 : 1.1,
  dialogue: Object.freeze({ WARNING: warning, HELP: help, CRITICAL: critical, RESCUED: rescued }),
  wrongItem: condition === CONDITIONS.ITCH ? '這個不太適合……' : '好像不是這個……'
});

export const SCENARIO_DEFS = Object.freeze({
  SKINCARE: define(CONDITIONS.ITCH, 'skin', '皮膚有點乾乾的……', '皮膚感覺不太舒服……', '皮膚越來越不舒服了……', '舒服多了，謝謝你！'),
  OUTDOOR_SKIN: define(CONDITIONS.ITCH, 'skin', '在外面一整天，皮膚有點乾……', '皮膚感覺不太舒服……', '皮膚越來越不舒服了……', '舒服多了，謝謝你！'),
  GRASS_SKIN: define(CONDITIONS.ITCH, 'skin', '剛剛碰到草，感覺怪怪的……', '皮膚開始有點癢癢的……', '真的越來越癢了！', '不癢了，謝謝！'),
  FALL: define(CONDITIONS.SORENESS, 'fall', '啊！', '膝蓋還是好痛……', '膝蓋痛得受不了！', '膝蓋好多了，謝謝！'),
  SPORT_SORE: define(CONDITIONS.SORENESS, 'sore', '運動後，肌肉好痠！', '肌肉還是好痠……', '肌肉痠得受不了！', '肌肉舒服多了，謝謝！'),
  LONG_WALK: define(CONDITIONS.SORENESS, 'sore', '走久了，雙腿好痠！', '雙腿還是好痠……', '雙腿痠得受不了！', '雙腿舒服多了，謝謝！'),
  PIGMENT_CARE: Object.freeze({ ...define(CONDITIONS.PIGMENTATION, 'skin', '想照顧黑色素困擾……', '黑色素，請幫幫我！', '黑色素照顧，我快要走了！', '照顧完成，謝謝你！'), wrongItem: '黑色素要用 DDM+1 喔！' }),
  SALLOW_CARE: Object.freeze({ ...define(CONDITIONS.SALLOWNESS, 'skin', '皮膚看起來蠟黃……', '皮膚蠟黃，請幫幫我！', '皮膚蠟黃，我快要走了！', '照顧完成，謝謝你！'), wrongItem: '皮膚蠟黃要用 SSW+1 喔！' })
});

const dialogue = (WARNING, HELP, CRITICAL, RESCUED) => Object.freeze({ WARNING, HELP, CRITICAL, RESCUED });

// Role lines are scoped by stage and scenario so they cannot bleed into the
// condition-based Park and Mountain events or contradict the selected item.
const ROLE_SCENARIO_DIALOGUE = Object.freeze({
  city: Object.freeze({
    youngWoman: Object.freeze({
      SKINCARE: dialogue('皮膚感覺有點乾乾的……', '想好好照顧一下皮膚。', '皮膚越來越不舒服了……', '舒服多了，謝謝你！'),
      OUTDOOR_SKIN: dialogue('皮膚感覺有點乾乾的……', '想好好照顧一下皮膚。', '皮膚越來越不舒服了……', '舒服多了，謝謝你！')
    }),
    shopper: Object.freeze({
      SKINCARE: dialogue('逛了一整天，皮膚有點乾……', '想讓皮膚舒服一點。', '皮膚真的有點受不了了……', '好多了，謝謝！'),
      LONG_WALK: Object.freeze({ WARNING: '逛久了，雙腿好痠！' })
    }),
    cafeVisitor: Object.freeze({
      SKINCARE: dialogue('冷氣吹久了，皮膚乾乾的……', '感覺皮膚需要照顧一下。', '越來越不舒服了……', '現在舒服多了！'),
      OUTDOOR_SKIN: dialogue('冷氣吹久了，皮膚乾乾的……', '感覺皮膚需要照顧一下。', '越來越不舒服了……', '現在舒服多了！')
    }),
    photographerGirl: Object.freeze({
      SKINCARE: dialogue('皮膚感覺有點乾乾的……', '皮膚感覺有點不舒服。', '好想趕快照顧一下皮膚……', '舒服多了，謝謝你！')
    }),
    grassVisitor: Object.freeze({
      GRASS_SKIN: dialogue('剛剛碰到草，感覺怪怪的……', '皮膚開始有點癢癢的……', '真的越來越癢了！', '不癢了，謝謝！')
    }),
    deliveryWorker: Object.freeze({
      SPORT_SORE: dialogue('今天跑了一整天，肩膀好痠……', '肩膀還是好痠……', '痠得快背不動了！', '肩膀舒服多了，謝謝！'),
      LONG_WALK: dialogue('今天跑了一整天，肩膀好痠……', '肩膀還是好痠……', '痠得快背不動了！', '肩膀舒服多了，謝謝！')
    })
  }),
  sports: Object.freeze({
    skateboarder: Object.freeze({
      FALL: dialogue('啊！', '膝蓋好痛……', '膝蓋痛得受不了！', '膝蓋好多了，謝謝！')
    }),
    basketballPlayer: Object.freeze({
      FALL: dialogue('啊！', '腳好痛……', '腳痛得受不了！', '腳好多了，謝謝！')
    }),
    runner: Object.freeze({
      SPORT_SORE: dialogue('跑完這圈，雙腿好痠！', '雙腿還是好痠……', '雙腿痠得受不了！', '雙腿舒服多了，謝謝！')
    }),
    fitnessGuy: Object.freeze({
      SPORT_SORE: dialogue('剛練完，肩膀好痠……', '手臂也開始痠了……', '肌肉痠得受不了！', '肌肉舒服多了！')
    }),
    sportsGirl: Object.freeze({
      SPORT_SORE: dialogue('運動完，腿有點痠……', '雙腿還是好痠……', '腿真的痠得受不了！', '現在輕鬆多了，謝謝！')
    }),
    grassVisitor: Object.freeze({
      GRASS_SKIN: dialogue('剛剛碰到草，感覺怪怪的……', '皮膚開始有點癢癢的……', '真的越來越癢了！', '不癢了，謝謝！')
    }),
    deliveryWorker: Object.freeze({
      SPORT_SORE: dialogue('今天跑了一整天，肩膀好痠……', '肩膀還是好痠……', '痠得快背不動了！', '肩膀舒服多了，謝謝！'),
      LONG_WALK: dialogue('今天跑了一整天，肩膀好痠……', '肩膀還是好痠……', '痠得快背不動了！', '肩膀舒服多了，謝謝！')
    })
  })
});

export function resolveScenario(type) {
  const definition = SCENARIO_DEFS[type];
  if (!definition) throw new RangeError(`Unknown scenario: ${type}`);
  return definition;
}

export function scenarioDialogue(role, type, state, stageId = null) {
  if (!type) return null;
  const definition = SCENARIO_DEFS[type];
  if (!definition) return null;
  if (stageId && !['city', 'sports', 'garden'].includes(stageId)) return null;
  return ROLE_SCENARIO_DIALOGUE[stageId]?.[role]?.[type]?.[state] || definition.dialogue[state] || null;
}

const LEGACY_CONDITION_DIALOGUE = Object.freeze({
  [CONDITIONS.ITCH]: dialogue('好像有點癢……', '好癢！', '快受不了了！', '好多了！'),
  [CONDITIONS.SORENESS]: dialogue('好像有點痠痛……', '痠痛不太舒服……', '快受不了了！', '好多了！')
});

export function legacyConditionDialogue(condition, state) {
  return LEGACY_CONDITION_DIALOGUE[condition]?.[state] || null;
}

export function requiredItem(condition) {
  return Object.values(ITEMS).find((item) => item.condition === condition)?.id || null;
}

export function weightedChoice(entries, random = Math.random) {
  const pool = entries.filter(([, weight]) => Number.isFinite(weight) && weight > 0);
  const total = pool.reduce((sum, [, weight]) => sum + weight, 0);
  if (!total) return null;
  let value = random() * total;
  for (const [key, weight] of pool) {
    value -= weight;
    if (value < 0) return key;
  }
  return pool.at(-1)[0];
}
