import test from 'node:test';
import assert from 'node:assert/strict';
import {NPC} from '../src/game/NPC.js';
import {CONDITIONS, STATES} from '../src/game/constants.js';
import {SCENARIO_DEFS, scenarioDialogue} from '../src/game/ScenarioDefinitions.js';
import {NPC_ROLE_DEFS} from '../src/game/NPCRoleDefinitions.js';
import {injuryPose} from '../src/game/InjuryAnimation.js';

const ctx={save(){},restore(){},measureText(text){return {width:[...text].length*14};}};

test('all scenario types have dialogue for each active state',()=>{
  for(const role of Object.keys(NPC_ROLE_DEFS)) for(const type of Object.keys(SCENARIO_DEFS))
    for(const state of [STATES.WARNING,STATES.HELP,STATES.CRITICAL]){
      const text=scenarioDialogue(role,type,state,'sports');
      assert.ok(text,`${role} ${type} ${state}`);
    }
});

test('Park and Mountain use the same simple condition dialogue without role contamination',()=>{
  const expected={
    [CONDITIONS.ITCH]:['好像有點癢……','好癢！','快受不了了！','好多了！'],
    [CONDITIONS.SORENESS]:['好像有點痠痛……','痠痛不太舒服……','快受不了了！','好多了！']
  };
  for(const stageId of ['park','mountain']) for(const [condition,lines] of Object.entries(expected)){
    const npc=new NPC({id:condition,role:'youngWoman',x:150,y:240,stageId});
    npc.startEvent(condition,10,3);
    [STATES.WARNING,STATES.HELP,STATES.CRITICAL,STATES.RESCUED].forEach((state,index)=>{
      npc.state=state;
      assert.equal(npc.getStatusLayout(ctx,0).label,lines[index],`${stageId} ${condition} ${state}`);
    });
    npc.state=STATES.FAILED;
    assert.equal(npc.getStatusLayout(ctx,0).label,'我先回去了……');
  }
});

test('City dialogue expands PPA skin-care situations while NAP scenarios stay about soreness',()=>{
  const expected={
    youngWoman:['皮膚感覺有點乾乾的……','想好好照顧一下皮膚。','皮膚越來越不舒服了……','舒服多了，謝謝你！'],
    shopper:['逛了一整天，皮膚有點乾……','想讓皮膚舒服一點。','皮膚真的有點受不了了……','好多了，謝謝！'],
    cafeVisitor:['冷氣吹久了，皮膚乾乾的……','感覺皮膚需要照顧一下。','越來越不舒服了……','現在舒服多了！'],
    photographerGirl:['皮膚感覺有點乾乾的……','皮膚感覺有點不舒服。','好想趕快照顧一下皮膚……','舒服多了，謝謝你！']
  };
  const states=[STATES.WARNING,STATES.HELP,STATES.CRITICAL,STATES.RESCUED];
  for(const [role,lines] of Object.entries(expected)){
    const npc=new NPC({id:role,role,x:150,y:240,stageId:'city'});
    npc.startScenario('SKINCARE',10,3);
    states.forEach((state,index)=>{npc.state=state;assert.equal(npc.getStatusLayout(ctx,0).label,lines[index],`${role} ${state}`);});
  }
  const shopper=new NPC({id:'shopper-nap',role:'shopper',x:150,y:240,stageId:'city'});
  shopper.startScenario('LONG_WALK',10,3);
  assert.equal(shopper.getStatusLayout(ctx,0).label,'逛久了，雙腿好痠！');
  const grassVisitor=new NPC({id:'city-grass',role:'grassVisitor',x:150,y:240,stageId:'city'});
  grassVisitor.startScenario('GRASS_SKIN',10,3);
  assert.equal(grassVisitor.getStatusLayout(ctx,0).label,'剛剛碰到草，感覺怪怪的……');
  assert.equal(scenarioDialogue('youngWoman','SKINCARE',STATES.WARNING,'park'),null);
});

test('Sports role scenarios preserve fall reaction and teach varied pain locations',()=>{
  const states=[STATES.WARNING,STATES.HELP,STATES.CRITICAL,STATES.RESCUED];
  const expected=[
    ['skateboarder','FALL',['啊！','膝蓋好痛……','膝蓋痛得受不了！','膝蓋好多了，謝謝！']],
    ['basketballPlayer','FALL',['啊！','腳好痛……','腳痛得受不了！','腳好多了，謝謝！']],
    ['runner','SPORT_SORE',['跑完這圈，雙腿好痠！','雙腿還是好痠……','雙腿痠得受不了！','雙腿舒服多了，謝謝！']],
    ['fitnessGuy','SPORT_SORE',['剛練完，肩膀好痠……','手臂也開始痠了……','肌肉痠得受不了！','肌肉舒服多了！']],
    ['sportsGirl','SPORT_SORE',['運動完，腿有點痠……','雙腿還是好痠……','腿真的痠得受不了！','現在輕鬆多了，謝謝！']],
    ['grassVisitor','GRASS_SKIN',['剛剛碰到草，感覺怪怪的……','皮膚開始有點癢癢的……','真的越來越癢了！','不癢了，謝謝！']]
  ];
  for(const [role,type,lines] of expected){
    const npc=new NPC({id:role,role,x:150,y:240,stageId:'sports'});
    npc.startScenario(type,10,3);
    states.forEach((state,index)=>{npc.state=state;assert.equal(npc.getStatusLayout(ctx,0).label,lines[index],`${role} ${type} ${state}`);});
  }
  assert.equal(scenarioDialogue('deliveryWorker','LONG_WALK',STATES.WARNING,'sports'),'今天跑了一整天，肩膀好痠……');
});

test('dialogue override wins and FALL animation leads through WARNING into HELP',()=>{
  const npc=new NPC({id:'skate',role:'skateboarder',x:150,y:240,stageId:'sports'});
  npc.startScenario('FALL',10,3);
  assert.equal(npc.visualState,'EVENT_REACTION');
  assert.deepEqual(injuryPose(npc),{row:1,frame:0,settled:false});
  assert.equal(npc.getStatusLayout(ctx,0).label,'啊！');
  npc.showDialogue('好像不是這個……');
  assert.equal(npc.getStatusLayout(ctx,0).label,'好像不是這個……');
  npc.dialogueOverride='';npc.dialogueOverrideTimer=0;
  npc.update(.9,{world:{width:400,height:400},obstacles:[]},.9);
  assert.equal(npc.state,STATES.WARNING);
  assert.equal(injuryPose(npc).settled,true);
  npc.update(2.1,{world:{width:400,height:400},obstacles:[]},3);
  assert.equal(npc.state,STATES.HELP);
  assert.equal(npc.getStatusLayout(ctx,0).label,'膝蓋好痛……');

  const basketball=new NPC({id:'basketball',role:'basketballPlayer',x:150,y:240,stageId:'sports'});
  basketball.startScenario('FALL',10,3);
  assert.equal(basketball.getStatusLayout(ctx,0).label,'啊！');
  basketball.update(3,{world:{width:400,height:400},obstacles:[]},3);
  assert.equal(basketball.state,STATES.HELP);
  assert.equal(basketball.getStatusLayout(ctx,0).label,'腳好痛……');
  assert.equal(injuryPose(basketball).row,0);
});

test('owner bubble placement stays stable over time and remains bounded at map edges',()=>{
  for(const scale of [.38,.49,1.5]) for(const corner of ['center','top','bottom','left','right']){
    const bounds={left:0,top:0,right:375/scale,bottom:560/scale};
    const x=corner==='left'?20:corner==='right'?bounds.right-20:bounds.right/2;
    const y=corner==='top'?20:corner==='bottom'?bounds.bottom-20:bounds.bottom/2;
    const npcs=['youngWoman','runner'].map((role,id)=>{
      const npc=new NPC({id,role,x:x+id*4,y:y+id*4});npc.startScenario(id?'SPORT_SORE':'SKINCARE',10,3);npc.state=id?STATES.CRITICAL:STATES.HELP;return npc;
    });
    const entries=npcs.map(npc=>({npc,layout:npc.getStatusLayout(ctx,0,{cameraScale:scale,compactStatusBubble:true,visibleBounds:bounds})}));
    for(const {npc,layout} of entries){
      const later=npc.getStatusLayout(ctx,150,{cameraScale:scale,compactStatusBubble:true,visibleBounds:bounds});
      assert.equal(later.bubbleX,layout.bubbleX);assert.equal(later.bubbleY,layout.bubbleY);
      assert.ok(layout.bubbleX>=0&&layout.bubbleY>=0&&layout.bubbleX+layout.bubbleWidth<=bounds.right+.01&&layout.bubbleY+layout.bubbleHeight<=bounds.bottom+.01);
    }
  }
});

test('itch and soreness share the same dialogue palette at every state',()=>{
  const itch=new NPC({id:1,role:'youngWoman',x:384,y:500});itch.startScenario('SKINCARE',10,3);
  const sore=new NPC({id:2,role:'runner',x:384,y:500});sore.startScenario('SPORT_SORE',10,3);
  for(const state of [STATES.WARNING,STATES.HELP,STATES.CRITICAL,STATES.RESCUED,STATES.FAILED]){
    itch.state=state;sore.state=state;
    assert.deepEqual(itch.getStatusColors(itch.getStatusLayout(ctx,0)),sore.getStatusColors(sore.getStatusLayout(ctx,0)));
  }
});
