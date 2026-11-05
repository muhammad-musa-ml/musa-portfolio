import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validatePlannerDownload, startPlannerDownload } from './kaiju-download.mjs';

const origin = 'https://iammusa.vercel.app';
const frame = {};
const board = () => ({
  version: 1, budget: 100,
  cells: Array.from({length:35},()=>({type:'empty',floors:0,existing:[0,0],confidence:'reference'})),
  cats: ['Blue','Red','Green'].map((color,index)=>({color,start:index*7,bed:13+index,direction:2})),
  rules: {turns:15,startingPower:0,powerUpBonus:1000,firstBedBonus:2000,secondBedMultiplier:3,thirdBedMultiplier:5,bounceMoves:false,forbidFights:false,conservative:true},
});
const plan = () => ({board:board(),plan:Array(70).fill(0),placements:[],instructions:'Use Test Plan to check the prediction.',result:{valid:true,score:100,finished:3,snapshots:[{turn:0,cats:[{},{},{}]}]}});
const message = (filename='kaiju-plan.json',data=plan()) => ({source:frame,origin,data:{type:'kaiju:download',requestId:randomUUID(),filename,json:JSON.stringify(data)}});

test('accepts only the exact originating planner frame and its same-site JSON exports', () => {
  for (const event of [message(),message('kaiju-board.json',board())]) {
    const value = validatePlannerDownload(event,origin,frame);
    assert.equal(value.filename,event.data.filename);
    assert.deepEqual(JSON.parse(value.json),JSON.parse(event.data.json));
  }
  for (const event of [{...message(),source:{}},{...message(),source:null},{...message(),origin:'https://unrelated.invalid'}])
    assert.equal(validatePlannerDownload(event,origin,frame),null);
  assert.equal(validatePlannerDownload(message(),origin,null),null);
});

test('rejects executable or arbitrary filenames, malformed messages and incorrect board/plan shapes', () => {
  for (const filename of ['../../config.json','kaiju-plan.html','other.json','kaiju-plan.json.exe'])
    assert.equal(validatePlannerDownload(message(filename),origin,frame),null);
  const candidates = [
    {...message().data,type:'download'},
    {...message().data,requestId:'not-a-uuid'},
    {...message().data,url:'https://unrelated.invalid'},
    {...message().data,json:'{broken'},
    {...message().data,json:JSON.stringify({...plan(),plan:[0]})},
    {...message().data,json:JSON.stringify({...plan(),result:{...plan().result,valid:false}})},
    {...message().data,json:JSON.stringify({...plan(),board:{...board(),cells:[]}})},
    {...message().data,json:'{"__proto__":{"polluted":true}}'},
  ];
  for (const data of candidates) assert.equal(validatePlannerDownload({source:frame,origin,data},origin,frame),null);
});

test('limits exported payload bytes, including multibyte text and deeply oversized replay arrays', () => {
  const long = message(); long.data.json = 'x'.repeat(256001);
  assert.equal(validatePlannerDownload(long,origin,frame),null);
  const multibyte = message(); multibyte.data.json = '😀'.repeat(70000);
  assert.equal(validatePlannerDownload(multibyte,origin,frame),null);
  const replay = plan(); replay.result.snapshots = Array(17).fill(replay.result.snapshots[0]);
  assert.equal(validatePlannerDownload(message('kaiju-plan.json',replay),origin,frame),null);
});

test('starts the download from an attached top-level JSON anchor and removes the temporary element', () => {
  const file = validatePlannerDownload(message(),origin,frame);
  let attached = false,clicked = false,removed = false,blob;
  const anchor = {click(){assert.equal(attached,true);clicked=true;},remove(){removed=true;}};
  const document = {createElement(tag){assert.equal(tag,'a');return anchor;},body:{append(value){assert.equal(value,anchor);attached=true;}}};
  const url = startPlannerDownload(file,document,{createObjectURL(value){blob=value;return 'blob:validated-export';}});
  assert.equal(url,'blob:validated-export');
  assert.equal(anchor.href,url); assert.equal(anchor.download,'kaiju-plan.json'); assert.equal(anchor.hidden,true);
  assert.equal(blob.type,'application/json'); assert.equal(clicked,true); assert.equal(removed,true);
});
