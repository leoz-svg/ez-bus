// Original team navigation adapted to the shared, in-browser simulation state.
export class WorkspacePanels {
  constructor(onMap){
    this.active='map';this.charts=null;this.latest=null;this.onMap=onMap;
    const tabs=[...document.querySelectorAll('[role="tab"][data-panel]')];
    tabs.forEach((tab,i)=>{
      tab.addEventListener('click',()=>this.select(tab.dataset.panel));
      tab.addEventListener('keydown',e=>{
        let j;if(e.key==='ArrowRight')j=(i+1)%tabs.length;else if(e.key==='ArrowLeft')j=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')j=0;else if(e.key==='End')j=tabs.length-1;else return;
        e.preventDefault();tabs[j].focus();this.select(tabs[j].dataset.panel);
      });
    });
    document.getElementById('dashboardRun').addEventListener('click',()=>document.getElementById('toggle').click());
    document.getElementById('dashboardReset').addEventListener('click',()=>document.getElementById('reset').click());
    this.loadDrivers();
  }
  select(key){
    this.active=key;
    document.querySelectorAll('[role="tab"][data-panel]').forEach(t=>{const on=t.dataset.panel===key;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;});
    document.querySelectorAll('.workspace-panel').forEach(p=>{p.hidden=p.id!=='panel-'+key;});
    if(key==='map')requestAnimationFrame(()=>this.onMap());
    if(key==='dashboard'&&this.latest)this.renderCharts();
  }
  sync(sim,network,running){
    const s=sim.summary();this.latest={s,waiting:network.stations.map(([x,y])=>sim.counts[x*100+y]),routes:sim.routes.map(r=>({id:r.id,count:r.buses.length}))};
    document.getElementById('dashboardRun').disabled=false;document.getElementById('dashboardReset').disabled=false;
    document.getElementById('dashboardRun').textContent=running?'暂停仿真':'开始仿真';
    document.getElementById('dashboardState').textContent=`${running?'运行中':'已暂停'} · 仿真步 ${s.tick} · 全部分区共享当前数据`;
    const text={population:`地图内 ${s.remaining} 人 · 已上车 ${s.boarded} 人`,stations:this.latest.waiting.map((n,i)=>`S${i+1}: ${n} 人`).join(' · '),routes:this.latest.routes.map(r=>`${r.id} 路: ${r.count} 辆`).join(' · '),fleet:`已配置 ${s.buses} 辆 · 可添加 ${90-s.buses} 辆（演示上限 90）`};
    for(const [key,value] of Object.entries(text))document.getElementById('values-'+key).textContent=value;
    if(this.active==='dashboard')this.renderCharts();
  }
  renderCharts(){
    const {s,waiting,routes}=this.latest;
    const definitions={population:{type:'doughnut',labels:['地图内','已上车'],values:[s.remaining,s.boarded],colors:['#c99350','#47867c']},stations:{type:'bar',labels:waiting.map((_,i)=>'S'+(i+1)),values:waiting,colors:'#82769c'},routes:{type:'bar',labels:routes.map(r=>r.id+' 路'),values:routes.map(r=>r.count),colors:['#326cbb','#d17b3f','#308771']},fleet:{type:'doughnut',labels:['已配置','可添加名额'],values:[s.buses,90-s.buses],colors:['#716489','#e7e2ee']}};
    if(!this.charts)this.charts={};
    for(const [key,d] of Object.entries(definitions)){
      if(!this.charts[key])this.charts[key]=new Chart(document.getElementById('chart-'+key),{type:d.type,data:{labels:d.labels,datasets:[{label:key==='stations'?'候车人数':'数量',data:d.values,backgroundColor:d.colors,borderWidth:0,borderRadius:d.type==='bar'?5:0}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:d.type==='doughnut',position:'bottom',labels:{boxWidth:12,font:{size:11}}}},...(d.type==='bar'?{scales:{y:{beginAtZero:true,ticks:{precision:0}},x:{grid:{display:false}}}}:{cutout:'68%'})}});
      else{this.charts[key].data.datasets[0].data=d.values;this.charts[key].resize();this.charts[key].update('none');}
    }
  }
  async loadDrivers(){
    try{const r=await fetch(new URL('./assets/drivers.json',import.meta.url));if(!r.ok)throw new Error('load');this.drivers=await r.json();
      for(const id of ['driverSearch','driverRoute','driverAttendance'])document.getElementById(id).addEventListener('input',()=>this.filterDrivers());this.filterDrivers();
    }catch{document.getElementById('driverCount').textContent='司机示例加载失败，请刷新重试；地图仿真不受影响。';}
  }
  filterDrivers(){
    const q=document.getElementById('driverSearch').value.trim().toLowerCase(),route=document.getElementById('driverRoute').value,attendance=document.getElementById('driverAttendance').value;
    const filtered=this.drivers.filter(d=>(!route||d.route===route)&&(!attendance||d.attendance===attendance)&&[d.id,d.name,d.gender,d.route,d.attendance,d.attendance==='work'?'在岗':'休假',d.gender==='Female'?'女':'男'].some(v=>String(v).toLowerCase().includes(q)));
    const body=document.getElementById('driverBody');body.replaceChildren();
    for(const d of filtered){const row=document.createElement('tr');for(const value of [d.id,d.name,d.gender==='Female'?'女':'男',d.route,d.attendance==='work'?'在岗':'休假']){const td=document.createElement('td');td.textContent=value;row.append(td);}body.append(row);}
    if(!filtered.length){const row=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.textContent='没有匹配的司机，请调整搜索条件。';row.append(td);body.append(row);}
    document.getElementById('driverCount').textContent=`显示 ${filtered.length} / ${this.drivers.length} 条虚构记录`;
  }
}
