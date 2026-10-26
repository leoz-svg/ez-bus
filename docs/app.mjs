import {Simulation} from './engine.mjs';
const $=id=>document.getElementById(id);
const colors={61:'#7575ae',412:'#cb896b',475:'#729483'};
const canvas=$('map'),ctx=canvas.getContext('2d');
let network,sim,running=false,timer=null;
const W=800,H=650,scale=5.35,ox=(W-100*scale)/2,oy=48;
const xy=(x,y)=>[ox+y*scale,oy+(99-x)*scale];
function message(text,error=false){$('feedback').textContent=text;$('feedback').classList.toggle('error',error);}
function draw(){
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#e9ece8';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#e0e5df';ctx.lineWidth=.6;
  for(let i=0;i<=100;i+=10){const [x,y]=xy(i,i);ctx.beginPath();ctx.moveTo(x,oy);ctx.lineTo(x,oy+535);ctx.moveTo(ox,y);ctx.lineTo(ox+535,y);ctx.stroke();}
  if(!network)return;
  ctx.fillStyle='#fafbf7';
  for(let i=0;i<sim.facility.length;i++)if(sim.facility[i]){const [x,y]=xy(Math.floor(i/100),i%100);ctx.fillRect(x-2.7,y-2.7,5.5,5.5);}
  if($('showRoutes').checked)for(const r of sim.routes){
    ctx.strokeStyle=colors[r.id];ctx.lineWidth=2.7;ctx.lineJoin='round';ctx.beginPath();
    r.points.forEach(([x,y],i)=>{const [px,py]=xy(x,y);i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.stroke();
  }
  if($('showHeat').checked)for(let i=0;i<sim.counts.length;i++)if(sim.counts[i]){
    const [x,y]=xy(Math.floor(i/100),i%100),n=sim.counts[i],radius=8+Math.min(15,n/4);
    const grad=ctx.createRadialGradient(x,y,0,x,y,radius);
    grad.addColorStop(0,`rgba(207,99,64,${Math.min(.85,.22+n/100)})`);grad.addColorStop(.55,'rgba(225,174,78,.28)');grad.addColorStop(1,'rgba(225,174,78,0)');
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
  }
  network.stations.forEach(([x,y],i)=>{
    const [px,py]=xy(x,y);ctx.fillStyle='#fff';ctx.strokeStyle='#78878a';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(px,py,4.8,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#7b8384';ctx.font='10px sans-serif';ctx.fillText('S'+(i+1),px+8,py-6);
  });
  for(const r of sim.routes)for(const pos of r.buses){const [x,y]=xy(...r.points[pos]);ctx.fillStyle=colors[r.id];ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.fillRect(x-5,y-5,10,10);ctx.strokeRect(x-5,y-5,10,10);}
  ctx.fillStyle='#9ca69d';ctx.font='11px sans-serif';ctx.fillText('100 × 100 GRID',ox,oy+575);ctx.fillText('SOURCE: PROJECT CSV',ox+355,oy+575);
}
function update(){
  const s=sim.summary();
  for(const k of ['generated','remaining','boarded','buses'])$(k).textContent=s[k].toLocaleString('en-US');
  $('clock').textContent=`仿真步 ${s.tick}`;$('waiting').textContent=`${s.waiting} 人`;
  $('routeBars').innerHTML=sim.routes.map(r=>`<div class="route-bar"><span>${r.id}</span><span class="track"><i style="background:${colors[r.id]};width:${r.buses.length/30*100}%"></i></span><b>${r.buses.length}</b></div>`).join('');
  $('stationRows').innerHTML=network.stations.map(([x,y],i)=>`<div class="station-row"><span>S${i+1}</span><b>${sim.counts[x*100+y]} 人</b></div>`).join('');
  $('toggle').textContent=running?'暂停仿真':'开始仿真';$('runState').textContent=running?'运行中':'已暂停';
  draw();
}
function stop(){clearInterval(timer);timer=null;running=false;}
function start(){
  clearInterval(timer);running=true;
  timer=setInterval(()=>{
    try{for(let i=0;i<Number($('speed').value);i++)sim.step();update();}
    catch(e){stop();message('仿真已暂停：'+e.message,true);update();}
  },200);
}
function command(fn,success){try{fn();message(success);update();}catch(e){message(e.message,true);}}
$('toggle').addEventListener('click',()=>{if(!sim)return;running?stop():start();message(running?'仿真运行中，可以调整线路公交数量。':'已暂停；当前人流与车辆状态已保留。');update();});
$('reset').addEventListener('click',()=>{stop();sim=new Simulation(network);message('已重置到固定种子初始状态，每条线路 1 辆公交。');update();});
$('speed').addEventListener('change',()=>{if(running)start();});
$('add').addEventListener('click',()=>command(()=>sim.addBus(Number($('route').value)),'已增加一辆公交；地图与统计已同步。'));
$('remove').addEventListener('click',()=>command(()=>sim.removeBus(Number($('route').value)),'已减少一辆公交；地图与统计已同步。'));
$('people').addEventListener('click',()=>command(()=>sim.addPeople(),'已按原项目的 14 / 2 / 14 分组增加 30 人。'));
for(const id of ['showHeat','showRoutes'])$(id).addEventListener('change',draw);
$('export').addEventListener('click',()=>{
  const s=sim.summary();
  const rows=[['metric','value'],['data_type','synthetic_browser_simulation'],...Object.entries(s),...sim.routes.map(r=>['route_'+r.id+'_buses',r.buses.length])];
  const blob=new Blob(['\ufeff'+rows.map(r=>r.join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ezbus-simulation-snapshot.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  message('已导出当前指标，文件注明为合成仿真数据。');
});
draw();
try{
  const response=await fetch(new URL('./assets/network.json',import.meta.url));
  if(!response.ok)throw new Error('路网文件读取失败');network=await response.json();sim=new Simulation(network);
  for(const id of ['toggle','reset','add','remove','people','export'])$(id).disabled=false;
  message('路网已加载。点击「开始仿真」观察人流与公交。');update();
}catch(e){$('runState').textContent='加载失败';message(e.message+'，请刷新页面重试。',true);}
