import {WorkspacePanels} from './panels.mjs';
import {Simulation} from './engine.mjs';
import {TransitMap} from './map.mjs';
const $=id=>document.getElementById(id);
const colors={61:'#326cbb',412:'#d17b3f',475:'#308771'};
let network,sim,running=false,timer=null,mapView=null;
const panels=new WorkspacePanels(()=>{mapView?.map.invalidateSize({pan:false});mapView?.drawHeat();mapView?.drawPeople();});
function message(text,error=false){$('feedback').textContent=text;$('feedback').classList.toggle('error',error);}
function update(previous=null,steps=0){
  const s=sim.summary();
  for(const k of ['generated','remaining','boarded','buses'])$(k).textContent=s[k].toLocaleString('en-US');
  $('clock').textContent=`仿真步 ${s.tick}`;$('waiting').textContent=`${s.waiting} 人`;
  $('routeBars').innerHTML=sim.routes.map(r=>`<div class="route-bar"><span>${r.id}</span><span class="track"><i style="background:${colors[r.id]};width:${r.buses.length/30*100}%"></i></span><b>${r.buses.length}</b></div>`).join('');
  $('stationRows').innerHTML=network.stations.map(([x,y],i)=>`<div class="station-row"><span>S${i+1}</span><b>${sim.counts[x*100+y]} 人</b></div>`).join('');
  $('toggle').textContent=running?'暂停仿真':'开始仿真';$('runState').textContent=running?'运行中':'已暂停';
  mapView.sync(sim,previous,steps);
  panels.sync(sim,network,running);
}
function stop(){clearInterval(timer);timer=null;running=false;}
function start(){
  clearInterval(timer);running=true;
  timer=setInterval(()=>{
    try{const before=sim.routes.map(r=>({id:r.id,buses:[...r.buses]}));const steps=Number($('speed').value);for(let i=0;i<steps;i++)sim.step();update(before,steps);}
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
for(const id of ['showHeat','showRoutes'])$(id).addEventListener('change',()=>mapView?.layers($('showHeat').checked,$('showRoutes').checked));
$('showBuildings').addEventListener('change',()=>mapView?.detailMode($('showBuildings').checked));
$('heatFocus').addEventListener('change',()=>mapView?.focusHeat($('heatFocus').checked));
$('showPeople').addEventListener('change',()=>mapView?.peopleMode($('showPeople').checked));
$('peopleZoom').addEventListener('click',()=>{if(!mapView)return;$('showPeople').checked=true;mapView.peopleMode(true);mapView.zoomToPeople();});
$('mapHome').addEventListener('click',()=>mapView?.home());
function selectRoute(id){$('route').value=String(id);mapView?.select(id);document.querySelectorAll('.route-chip').forEach(b=>{b.classList.toggle('selected',Number(b.dataset.route)===id);b.setAttribute('aria-pressed',String(Number(b.dataset.route)===id));});}
$('route').addEventListener('change',()=>selectRoute(Number($('route').value)));
for(const b of document.querySelectorAll('.route-chip'))b.addEventListener('click',()=>selectRoute(Number(b.dataset.route)));
$('export').addEventListener('click',()=>{
  const s=sim.summary();
  const rows=[['metric','value'],['data_type','synthetic_browser_simulation'],...Object.entries(s),...sim.routes.map(r=>['route_'+r.id+'_buses',r.buses.length])];
  const blob=new Blob(['\ufeff'+rows.map(r=>r.join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ezbus-simulation-snapshot.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  message('已导出当前指标，文件注明为合成仿真数据。');
});
try{
  const response=await fetch(new URL('./assets/network.json',import.meta.url));
  if(!response.ok)throw new Error('路网文件读取失败');network=await response.json();sim=new Simulation(network);
  const geographyResponse=await fetch(new URL('./assets/map.geojson',import.meta.url));
  if(!geographyResponse.ok)throw new Error('街区地图读取失败');
  mapView=new TransitMap(network,await geographyResponse.json());selectRoute(Number($('route').value));
  for(const id of ['toggle','reset','add','remove','people','export'])$(id).disabled=false;
  message('路网已加载。点击「开始仿真」观察人流与公交。');update();
}catch(e){$('runState').textContent='加载失败';message(e.message+'，请刷新页面重试。',true);}
