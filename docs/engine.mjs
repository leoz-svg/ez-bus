/** Browser port of the supplied Python grid rules; NOT measured transport data.
 * Fixes: bounded movement retries, bounds before indexing, safe bus limits,
 * explicit generated/boarded counts, seeded reset. No ML model is involved.
 */
export class Simulation {
  constructor(network, seed = 2023) {
    this.network = network;
    this.seed = seed >>> 0;
    this.tick = 0;
    this.generated = 0;
    this.boarded = 0;
    this.people = [];
    this.facility = new Uint8Array(10000);
    this.counts = new Uint16Array(10000);
    this.busCounts = new Uint16Array(10000);
    for (const [x,y] of network.roads) this.facility[x*100+y] = 1;
    for (const [x,y] of network.stations) this.facility[x*100+y] = 2;
    this.routes = network.routes.map(r => ({id:r.id, points:r.points, buses:[]}));
    for (const r of this.routes) {
      for (const [x,y] of r.points) if (this.facility[x*100+y] !== 2) this.facility[x*100+y] = 1;
      this.addBus(r.id);
    }
  }
  random() {
    this.seed = (Math.imul(1664525,this.seed)+1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  choose(a) { return a[Math.floor(this.random()*a.length)]; }
  route(id) {
    const r = this.routes.find(r=>r.id===id);
    if (!r) throw new Error('请选择有效线路。');
    return r;
  }
  addBus(id) {
    const r=this.route(id);
    if(r.buses.length>=30) throw new Error('每条线路最多配置 30 辆公交。');
    const free=r.points.map((_,i)=>i).filter(i=>!r.buses.includes(i));
    if(!free.length) throw new Error('这条线路没有空余位置。');
    const pos=this.choose(free);r.buses.push(pos);
    const [x,y]=r.points[pos];this.busCounts[x*100+y]++;
  }
  removeBus(id) {
    const r=this.route(id);
    if(!r.buses.length) throw new Error('该线路已无可减少的公交。');
    const index=Math.floor(this.random()*r.buses.length);
    const [pos]=r.buses.splice(index,1),[x,y]=r.points[pos];this.busCounts[x*100+y]--;
  }
  addPeople() {
    if(this.generated+30>10000) throw new Error('已达到本次演示人数上限，请重置后继续。');
    const groups=[{n:14,from:[[35,48],[35,46],[35,47]],to:[31,64]},
                  {n:2,from:[[56,40],[57,40]],to:[61,71]},
                  {n:14,from:[[69,54],[69,55]],to:[61,71]}];
    for(const g of groups) for(let i=0;i<g.n;i++) {
      const [x,y]=this.choose(g.from);this.people.push({x,y,tx:g.to[0],ty:g.to[1]});
      this.counts[x*100+y]++;this.generated++;
    }
  }
  step() {
    // Original code emits 30 people on each of ticks 0..66: 2,010, not 2,000.
    if(this.tick<2000/30 && this.generated+30<=10000) this.addPeople();
    for(const r of this.routes) r.buses=r.buses.map(pos=>{
      const [x,y]=r.points[pos];this.busCounts[x*100+y]--;
      const next=(pos+1)%r.points.length,[nx,ny]=r.points[next];this.busCounts[nx*100+ny]++;
      return next;
    });
    if(this.tick%5===0) {
      this.people=this.people.filter(p=>{
        const old=p.x*100+p.y;
        if(this.facility[old]===2) {
          if(!this.busCounts[old]) return true;
          this.counts[old]--;this.boarded++;return false;
        }
        for(let attempt=0;attempt<64;attempt++) {
          const nx=p.x+(this.random()<0.6?Math.sign(p.tx-p.x):0);
          const ny=p.y+(this.random()<0.6?Math.sign(p.ty-p.y):0);
          if(nx<0||nx>=100||ny<0||ny>=100) continue;
          const next=nx*100+ny;
          if(!this.facility[next]) continue;
          if(this.counts[next]<80) {
            this.counts[old]--;this.counts[next]++;p.x=nx;p.y=ny;
          }
          break;
        }
        return true;
      });
    }
    this.tick++;
  }
  summary() {
    let waiting=0,peak=0;
    for(let i=0;i<this.counts.length;i++) {
      if(this.facility[i]===2) waiting+=this.counts[i];
      peak=Math.max(peak,this.counts[i]);
    }
    return {tick:this.tick,generated:this.generated,remaining:this.people.length,boarded:this.boarded,waiting,peak,
      buses:this.routes.reduce((n,r)=>n+r.buses.length,0)};
  }
}
