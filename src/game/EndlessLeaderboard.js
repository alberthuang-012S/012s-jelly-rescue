// Each rival keeps one matched time/score/rescue sample from the calibration
// report in qa/endless/leaderboard-estimate.json. No network or random ranking.
const rival = (id, name, icon, survivedMs, score, rescuedCount, source) =>
  Object.freeze({id, name, icon, survivedMs, score, rescuedCount, source:Object.freeze(source)});
export const ENDLESS_RIVALS = Object.freeze([
  rival('rookie','新手小隊','✦',104000,5852,35,{profile:'探索型',speed:205,seed:1}),
  rival('park','公園常客','♣',132200,7683,47,{profile:'探索型',speed:256.25,seed:789}),
  rival('cafe','咖啡巡邏員','☕',247800,22722,112,{profile:'熟悉型',speed:256.25,seed:1}),
  rival('garden','花園小隊','✿',285100,21463,117,{profile:'熟悉型',speed:205,seed:123}),
  rival('skate','滑板高手','◆',423400,39722,193,{profile:'熟悉型',speed:256.25,seed:789}),
  rival('night','夜班巡邏員','☾',600000,67220,308,{profile:'熟練型',speed:205,seed:123,checkpoint:600}),
  rival('captain','廣場守護者','★',900000,100106,472,{profile:'熟練型',speed:205,seed:1,checkpoint:900})
]);

export function compareEndlessRecords(a, b) {
  return b.survivedMs - a.survivedMs || b.score - a.score;
}
export function endlessStandings(best = null) {
  const entries = ENDLESS_RIVALS.map(entry => ({...entry,isPlayer:false}));
  if (best) entries.push({...best,id:'player',name:'你',isPlayer:true});
  // Stable ties retain the established rival's position.
  return entries.sort(compareEndlessRecords).map((entry,index) => ({...entry,rank:index+1}));
}
export function endlessRank(record) {
  return endlessStandings(record).find(entry => entry.isPlayer).rank;
}
export function endlessNextTarget(record = null) {
  const standings = endlessStandings(record);
  if (!record) return standings.at(-1);
  const position = standings.findIndex(entry => entry.isPlayer);
  return position > 0 ? standings[position - 1] : null;
}
export function endlessTargetText(record = null) {
  const target = endlessNextTarget(record);
  if (!target) return '你已登上榜首，挑戰更長的生存紀錄！';
  if (!record) return `首個目標：超過 ${Math.floor(target.survivedMs / 60000)} 分 ${Math.floor(target.survivedMs / 1000) % 60} 秒，超越${target.name}。`;
  const gap = target.survivedMs - record.survivedMs;
  return gap > 0
    ? `距離上一名${target.name}，還差約 ${Math.ceil(gap / 1000)} 秒。`
    : `同時間再多 ${target.score - record.score + 1} 分，就能超越${target.name}。`;
}
