import test from 'node:test';
import assert from 'node:assert/strict';
import {NPC} from '../src/game/NPC.js';
import {CONDITIONS, STATES} from '../src/game/constants.js';
import {SCENARIO_DEFS, scenarioDialogue} from '../src/game/ScenarioDefinitions.js';
import {NPC_ROLE_DEFS} from '../src/game/NPCRoleDefinitions.js';
import {layoutStatusBubbles, statusBounds} from '../src/game/StatusBubbleLayout.js';

const ctx={save(){},restore(){},measureText(text){return {width:[...text].length*14};}};
const intersects=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;

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

test('paired bubbles and countdowns remain distinct and bounded at map edges and different camera scales',()=>{
  for(const scale of [.38,.49,1.5]) for(const corner of ['center','top','bottom','left','right']){
    const bounds={left:0,top:0,right:375/scale,bottom:560/scale};
    const x=corner==='left'?20:corner==='right'?bounds.right-20:bounds.right/2;
    const y=corner==='top'?20:corner==='bottom'?bounds.bottom-20:bounds.bottom/2;
    const npcs=['youngWoman','runner'].map((role,id)=>{
      const npc=new NPC({id,role,x:x+id*4,y:y+id*4});npc.startScenario(id?'SPORT_SORE':'SKINCARE',10,3);npc.state=id?STATES.CRITICAL:STATES.HELP;return npc;
    });
    const entries=npcs.map(npc=>({npc,layout:npc.getStatusLayout(ctx,0,{cameraScale:scale,compactStatusBubble:true,visibleBounds:bounds})}));
    const before=npcs.map(npc=>({x:npc.x,y:npc.y,state:npc.state}));
    const placed=layoutStatusBubbles(entries,bounds);
    const rects=[...placed.values()].map(statusBounds);
    assert.equal(intersects(rects[0],rects[1]),false,`${scale} ${corner}`);
    for(const rect of rects){assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=bounds.right+.01&&rect.y+rect.height<=bounds.bottom+.01);}
    assert.deepEqual(npcs.map(npc=>({x:npc.x,y:npc.y,state:npc.state})),before);
  }
});

test('dialogue placement avoids protected controls and nearby character bodies when space is available',()=>{
  const bounds={left:0,top:0,right:768,bottom:1152};
  const npc=new NPC({id:1,role:'youngWoman',x:384,y:1080});npc.startScenario('SKINCARE',10,3);
  const layout=npc.getStatusLayout(ctx,0,{cameraScale:.49,compactStatusBubble:true,visibleBounds:bounds});
  const protectedArea={x:0,y:900,width:768,height:252,protected:true};
  const rect=statusBounds(layoutStatusBubbles([{npc,layout}],bounds,[protectedArea]).get(npc));
  assert.equal(intersects(rect,protectedArea),false);
});
