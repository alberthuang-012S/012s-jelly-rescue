import test from 'node:test';
import assert from 'node:assert/strict';
import {NPC} from '../src/game/NPC.js';
import {CONDITIONS, STATES} from '../src/game/constants.js';
import {SCENARIO_DEFS, scenarioDialogue} from '../src/game/ScenarioDefinitions.js';
import {NPC_ROLE_DEFS} from '../src/game/NPCRoleDefinitions.js';

const ctx={save(){},restore(){},measureText(text){return {width:[...text].length*14};}};

test('all active dialogue retains symptoms, including role overrides and generic legacy events',()=>{
  for(const role of Object.keys(NPC_ROLE_DEFS)) for(const [type,definition] of Object.entries(SCENARIO_DEFS))
    for(const state of [STATES.WARNING,STATES.HELP,STATES.CRITICAL]){
      const text=scenarioDialogue(role,type,state);
      assert.match(text,definition.condition===CONDITIONS.ITCH?/癢/:type==='FALL'?/痛/:/痠/);
      assert.ok([...text].length<=13,`${role} ${type}: ${text}`);
    }
  for(const condition of Object.values(CONDITIONS)){
    const npc=new NPC({id:condition,role:'elder',x:150,y:240});npc.startEvent(condition,10,3);
    for(const state of [STATES.WARNING,STATES.HELP,STATES.CRITICAL,STATES.RESCUED]){
      npc.state=state;assert.match(npc.getStatusLayout(ctx,0).label,condition===CONDITIONS.ITCH?/癢/:/腿|痠/);
    }
  }
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
