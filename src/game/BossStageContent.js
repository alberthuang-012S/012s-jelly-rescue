export const BOSS_STAGE_CONTENT = Object.freeze({
  alienMosquito: {
    title: '異星蚊災', english: 'ALIEN MOSQUITO INVASION', boss: '異星嗡嗡王', bossEnglish: 'MOSQUITO KING',
    item: 'PPA', hitMetric: 'ppaHits', enemies: '蚊群', defeated: '擊退蚊子',
    objective: '靠近蚊群，按使用釋放 PPA 能量', closedHint: '閃避預告衝刺，等待核心亮起',
    escape: '嗡……下次不敢了……！', mini: 'MINI MOSQUITO KING', peaceful: 'Jelly Park 恢復平靜',
    success: '異星嗡嗡王已退散，公園恢復平靜。', failure: '小水母需要補充體力，再出發挑戰蚊災。',
    waveTips: ['靠近小蚊子使用 PPA，命中後拉開距離，等脈衝恢復。', '看到衝刺預告就先側移，停下後再靠近。', '先處理靠近的蚊子，留意遠處飛來的泡泡。'],
    bossTips: ['先閃過衝刺，核心亮起時靠近使用 PPA。', '避開泡泡與召喚蚊群，核心亮起時再靠近。', '連續衝刺有兩次，等第二次結束、核心亮起再靠近。']
  },
  gravityOverload: {
    title: '重力痠痛危機', english: 'GRAVITY OVERLOAD', boss: '重力咚咚王', bossEnglish: 'GRAVITY KING',
    item: 'NAP', hitMetric: 'napHits', enemies: '重力怪獸', defeated: '擊退怪獸',
    objective: '移動閃開地面預告，使用 NAP 共鳴', closedHint: '走出地面預告區，等待核心亮起',
    escape: '呼……終於不用背這麼重了……！', mini: 'GRAVITY RELEASED', peaceful: '運動公園恢復輕盈',
    success: '重力背包解除過載，咚咚王輕飄飄地離開了！', failure: '休息一下，觀察地面預告，再來解除重力危機。',
    waveTips: ['靠近使用 NAP，命中後拉開距離，避開推撞。', '圓形預告鎖定後就不會移動，走出邊線再回頭。', '靠近結晶使用 NAP 可解除危險區，再處理重力怪獸。'],
    bossTips: ['走出圓形預告，拍地後靠近發光核心使用 NAP。', '左右連拍有兩次，等第二拍結束再靠近核心。', '往扇形的側面移動，再避開定點拍地，疲憊時靠近核心。']
  }
});
