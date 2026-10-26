import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Simulation} from '../docs/engine.mjs';
const network=JSON.parse(readFileSync(new URL('../docs/assets/network.json',import.meta.url),'utf8'));
function invariant(s) {
  assert.equal(s.generated,s.people.length+s.boarded,'population conservation');
  assert.equal(s.counts.reduce((a,b)=>a+b,0),s.people.length,'grid/population agreement');
  assert.equal(s.busCounts.reduce((a,b)=>a+b,0),s.routes.reduce((n,r)=>n+r.buses.length,0),'grid/fleet agreement');
  for(const p of s.people) assert.ok(p.x>=0&&p.x<100&&p.y>=0&&p.y<100,'bounded coordinates');
}
test('long run conserves people and buses through dispatch mutations',()=>{
  const s=new Simulation(network);
  for(let i=0;i<1500;i++) {
    if(i===200){s.addBus(61);s.addBus(475);s.addPeople();}
    if(i===500)s.removeBus(412);
    s.step();invariant(s);
  }
  assert.equal(s.generated,2040);
  assert.ok(s.boarded>0,'boarding actually occurs');
});
test('empty, unknown and full routes reject without corrupting state',()=>{
  const s=new Simulation(network);
  s.removeBus(61);assert.throws(()=>s.removeBus(61));
  assert.throws(()=>s.addBus('61'));assert.throws(()=>s.addBus(999));
  for(let i=0;i<30;i++)s.addBus(61);
  assert.throws(()=>s.addBus(61));invariant(s);
});
test('reset is reproducible and cohort generation matches source loop',()=>{
  const a=new Simulation(network),b=new Simulation(network);
  for(let i=0;i<100;i++){a.step();b.step();}
  assert.deepEqual(a.summary(),b.summary());assert.deepEqual(a.people,b.people);
  assert.equal(a.generated,2010);
});
test('manual additions cannot exceed demo population budget',()=>{
  const s=new Simulation(network);
  for(let i=0;i<333;i++)s.addPeople();
  assert.throws(()=>s.addPeople());invariant(s);
});
