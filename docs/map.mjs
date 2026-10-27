/* Esri geographic basemap, original project route coordinates and simulated vehicles.
 * Project grid is bundled as a fallback when online basemap tiles are unavailable.
 */
const COLORS={61:'#326cbb',412:'#d17b3f',475:'#308771'};
const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roadWidths={motorway:11,trunk:10,primary:9,secondary:8,tertiary:7,residential:5.5,unclassified:5,living_street:4.5,service:3.2,pedestrian:3,footway:1.5,path:1.3,steps:1.2,cycleway:1.6};

export class TransitMap {
  constructor(network,geojson){
    this.network=network;
    this.map=L.map('map',{zoomControl:false,attributionControl:true,preferCanvas:true,minZoom:15,maxZoom:19,zoomSnap:.25,scrollWheelZoom:false,maxBounds:[[-27.4735,153.000],[-27.456,153.023]],maxBoundsViscosity:1});
    this.map.attributionControl.setPrefix(false);
    this.map.attributionControl.addAttribution('Routes: EZ Bus project');
    L.control.zoom({position:'topright',zoomInTitle:'放大地图',zoomOutTitle:'缩小地图'}).addTo(this.map);
    L.control.scale({position:'bottomleft',imperial:false,maxWidth:100}).addTo(this.map);
    this.detail=L.layerGroup().addTo(this.map);this.labels=L.layerGroup().addTo(this.map);
    this.routeLayer=L.layerGroup().addTo(this.map);this.stops=[];this.busMarkers=new Map();this.transitions=new Map();
    this.showHeat=true;this.showRoutes=true;this.frame=0;this.sim=null;
    for(const [name,z] of [['land',210],['buildings',240],['roads',270],['roadLabels',310],['geography',350],['routes',400],['heat',390],['pedestrians',395],['stops',450],['buses',500]]){
      this.map.createPane(name);this.map.getPane(name).style.zIndex=z;
    }
    this.map.getPane('heat').style.pointerEvents='none';this.map.getPane('roadLabels').style.pointerEvents='none';
    this.paintGeography(geojson);
    this.basemap=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',{
      pane:'geography',maxZoom:19,keepBuffer:2,attribution:'Tiles © Esri · Sources: Esri, HERE, Garmin, Intermap, increment P, GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, METI, Esri Japan, TomTom, GIS User Community',crossOrigin:true
    }).addTo(this.map);
    this.tileLoaded=0;this.tileErrors=0;this.mapLoading=true;
    this.basemap.on('tileload',()=>{this.tileLoaded++;this.updateBasemapStatus();});
    this.basemap.on('tileerror',()=>{this.tileErrors++;this.updateBasemapStatus();});
    this.basemap.on('loading',()=>{this.tileLoaded=0;this.tileErrors=0;this.mapLoading=true;document.getElementById('mapStatus').textContent='正在加载街区底图…';});
    this.basemap.on('load',()=>{this.mapLoading=false;this.updateBasemapStatus();});
    this.paintRoutes();
    this.heatCanvas=L.DomUtil.create('canvas','crowd-overlay',this.map.getPane('heat'));
    this.heatCtx=this.heatCanvas.getContext('2d');
    this.peopleCanvas=L.DomUtil.create('canvas','pedestrian-overlay',this.map.getPane('pedestrians'));
    this.peopleCtx=this.peopleCanvas.getContext('2d');this.peopleHistory=new WeakMap();this.peopleSequence=0;this.peopleTracks=[];this.showPeople=false;
    this.map.getPane('pedestrians').style.pointerEvents='none';
    this.map.on('moveend zoomend resize',()=>this.drawPeople());
    this.map.on('zoomstart',()=>{this.peopleCanvas.style.opacity='0';});
    this.map.on('zoomend',()=>{this.peopleCanvas.style.opacity='1';});
    this.map.on('moveend zoomend resize',()=>{this.drawHeat();this.refreshLabels();});
    this.map.on('zoomstart',()=>{this.heatCanvas.style.opacity='0';});
    this.map.on('zoomend',()=>{this.heatCanvas.style.opacity='1';});
    network.stations.forEach(([x,y],i)=>{
      const marker=L.circleMarker(this.toLatLng(x,y),{pane:'stops',radius:4.5,color:'#486266',weight:2,fillColor:'#fff',fillOpacity:1}).addTo(this.map);
      marker.bindTooltip(`S${i+1} · 仿真车站`,{direction:'top',className:'stop-tooltip'});
      marker.bindPopup('',{className:'transit-popup'});this.stops.push(marker);
    });
    this.home();let oldWidth=document.getElementById('map').clientWidth;this.resizeObserver=new ResizeObserver(()=>{const width=document.getElementById('map').clientWidth;if(!width)return;this.map.invalidateSize({pan:false});if(Math.abs(width-oldWidth)>10){oldWidth=width;this.home();}});
    this.resizeObserver.observe(document.getElementById('map'));
    this.animate();
  }
  toLatLng(x,y){const b=this.network.bounds;return [b.minLat+x*b.step,b.minLon+y*b.step];}
  home(){this.map.fitBounds([[-27.46955,153.0044],[-27.4609,153.01455]],{padding:[35,45],animate:false});}
  paintGeography(data){
    const filter=fn=>({type:'FeatureCollection',features:data.features.filter(fn)});
    const land=filter(f=>f.properties.kind==='land');
    L.geoJSON(land,{pane:'land',interactive:false,style:f=>{
      const t=f.properties;
      const water=t.natural==='water'||t.waterway==='riverbank';
      const green=['park','garden','pitch','nature_reserve','recreation_ground'].includes(t.leisure)||['grass','recreation_ground','forest','meadow','village_green','cemetery'].includes(t.landuse);
      return {color:water?'#b3d3dd':green?'#c3d3bc':'#e1dfd6',weight:.7,fillColor:water?'#bddce5':t.leisure==='pitch'?'#b0c6a0':green?'#d6e3c9':'#eae7df',fillOpacity:1};
    }}).addTo(this.map);
    const buildings=filter(f=>f.properties.kind==='building');
    L.geoJSON(buildings,{pane:'buildings',interactive:false,style:f=>({color:f.properties.leisure==='stadium'?'#aeb9b9':'#cfd4d1',weight:.7,fillColor:f.properties.leisure==='stadium'?'#c9d2d2':'#dce0dc',fillOpacity:1})}).addTo(this.detail);
    const roads=filter(f=>f.properties.kind==='road');
    const width=f=>roadWidths[f.properties.highway]||4;
    L.geoJSON(roads,{pane:'roads',interactive:false,style:f=>({color:'#d5d7d0',weight:width(f)+1.8,opacity:1,lineCap:'round',lineJoin:'round'})}).addTo(this.map);
    L.geoJSON(roads,{pane:'roads',interactive:false,style:f=>({color:['motorway','trunk','primary'].includes(f.properties.highway)?'#f7edcf':'#fdfdfb',weight:width(f),opacity:1,lineCap:'round',lineJoin:'round',dashArray:['footway','path','steps'].includes(f.properties.highway)?'2 3':null})}).addTo(this.map);
    L.geoJSON(filter(f=>f.properties.kind==='rail'),{pane:'roads',interactive:false,style:{color:'#b0bab8',weight:2,dashArray:'4 4'}}).addTo(this.map);
    // All names/positions below come from the bundled geographic features.
    this.labelSpecs=[];const seen=new Set();
    for(const f of data.features){
      const p=f.properties;if(!p.name||seen.has(p.name))continue;
      const road=p.kind==='road'&&['primary','secondary','tertiary','residential'].includes(p.highway);
      const landmark=p.leisure==='stadium'||p.leisure==='park';
      if(!road&&!landmark)continue;
      seen.add(p.name);
      const coords=f.geometry.type==='Polygon'?f.geometry.coordinates[0]:f.geometry.coordinates;
      if(coords.length<2)continue;
      let pos,angle=0;
      if(landmark){pos=coords.reduce((a,c)=>[a[0]+c[0]/coords.length,a[1]+c[1]/coords.length],[0,0]);}
      else{let best=0,a=coords[0],b=coords[1];for(let i=1;i<coords.length;i++){const prev=coords[i-1],cur=coords[i],d=Math.hypot((cur[0]-prev[0])*.887,cur[1]-prev[1]);if(d>best){best=d;a=prev;b=cur;}}pos=[(a[0]+b[0])/2,(a[1]+b[1])/2];angle=Math.atan2(-(b[1]-a[1]),(b[0]-a[0])*.887)*180/Math.PI;if(angle>90)angle-=180;if(angle< -90)angle+=180;}
      const cls=landmark?'place-label':'street-label';
      const title=escapeText(p.name);
      const marker=L.marker([pos[1],pos[0]],{pane:'roadLabels',interactive:false,icon:L.divIcon({className:'map-label',html:`<span class="${cls}" style="transform:translate(-50%,-50%) rotate(${landmark?0:angle}deg)">${title}${p.leisure==='stadium'?'<small>赛事散场仿真区域</small>':''}</span>`,iconSize:[0,0]})});
      this.labelSpecs.push({marker,landmark,major:p.highway!=='residential'});
    }
  }
  refreshLabels(){
    this.labels.clearLayers();const z=this.map.getZoom(),boxes=[];
    for(const s of this.labelSpecs.sort((a,b)=>Number(b.landmark)-Number(a.landmark))){
      if(!s.landmark&&z<16.1&&!s.major)continue;
      const p=this.map.latLngToContainerPoint(s.marker.getLatLng());
      if(p.x<30||p.y<35||p.x>this.map.getSize().x-35||p.y>this.map.getSize().y-40)continue;
      if(boxes.some(b=>Math.abs(b.x-p.x)<95&&Math.abs(b.y-p.y)<35))continue;
      boxes.push(p);s.marker.addTo(this.labels);
    }
  }
  paintRoutes(){
    this.routes=[];
    for(const route of this.network.routes){
      const points=route.geometry||route.points.map(p=>this.toLatLng(...p));
      const casing=L.polyline(points,{pane:'routes',color:'#fff',weight:7,opacity:.95,lineCap:'round',lineJoin:'round',smoothFactor:1.5,interactive:false});
      const line=L.polyline(points,{pane:'routes',color:COLORS[route.id],weight:3.8,opacity:.92,lineCap:'round',lineJoin:'round',smoothFactor:1.5});
      line.bindTooltip(`${route.id} 号线路 · 原项目坐标`,{sticky:true});
      casing.addTo(this.routeLayer);line.addTo(this.routeLayer);this.routes.push({id:route.id,casing,line});
    }
  }
  select(id){for(const r of this.routes){r.line.setStyle({weight:r.id===id?4.8:3.5,opacity:r.id===id?1:.65});r.casing.setStyle({weight:r.id===id?8:6.5});} }
  layers(heat,routes){this.showHeat=heat;this.showRoutes=routes;routes?this.routeLayer.addTo(this.map):this.map.removeLayer(this.routeLayer);this.drawHeat();}
  focusHeat(on){this.heatFocused=on;document.getElementById('map').classList.toggle('heat-focused',on&&this.showHeat);}
  detailMode(on){on?this.basemap.addTo(this.map):this.map.removeLayer(this.basemap);this.updateBasemapStatus();}
  updateBasemapStatus(){
    const el=document.getElementById('mapStatus');
    if(!this.map.hasLayer(this.basemap)){el.textContent='本地项目路网 · 示意视图';return;}
    el.textContent=this.tileErrors>0?'部分底图未加载 · 路网可继续演示':this.mapLoading?'正在加载街区底图…':this.tileLoaded>0?'地理底图 · 车辆与人流为仿真':'街区底图加载中 · 路网可继续演示';
  }
  busIcon(route,index){
    return L.divIcon({className:'bus-marker',iconSize:[30,46],iconAnchor:[15,23],html:`<button type="button" class="vehicle-hit" aria-label="${route} 号线路公交 ${index+1}" style="--route:${COLORS[route]}"><span class="vehicle-rotate"><svg viewBox="0 0 30 52" aria-hidden="true"><rect x="2" y="9" width="3" height="9" rx="1" fill="#384c54"/><rect x="25" y="9" width="3" height="9" rx="1" fill="#384c54"/><rect x="4" y="2" width="22" height="48" rx="6" fill="#fff" stroke="${COLORS[route]}" stroke-width="2"/><path d="M7 4h16v6H7z" fill="${COLORS[route]}"/><rect x="7" y="11" width="16" height="8" rx="2" fill="#3d6070"/><path d="M8 12h12l-6 6H8z" fill="#80a8b8" opacity=".7"/><rect x="7" y="22" width="16" height="16" rx="2" fill="#e2e8e7"/><path d="M9 25h12M9 29h12M9 33h12" stroke="#bdccce"/><rect x="7" y="41" width="16" height="4" rx="1.5" fill="#426779"/><path d="M5 7h2m16 0h2" stroke="#fff3bb" stroke-width="3"/><path d="M5 47h3m14 0h3" stroke="#da846d" stroke-width="2"/></svg></span><span class="bus-number">${route}</span></button>`});
  }
  sync(sim,previous=null,steps=0){
    this.sim=sim;const alive=new Set();const now=performance.now();
    // Identity survives filtering/boarding; display jitter never changes the engine RNG.
    this.peopleTracks=sim.people.map(p=>{
      const old=this.peopleHistory.get(p),id=old?.id??this.peopleSequence++;
      const heading=old&&(p.x!==old.x||p.y!==old.y)?Math.atan2((p.y-old.y)*.887,p.x-old.x):old?.heading??0;
      const next={id,x:p.x,y:p.y,heading};this.peopleHistory.set(p,next);
      return {...next,fromX:old?.x??p.x,fromY:old?.y??p.y};
    });
    this.peopleStarted=now;this.peopleAnimating=true;this.drawPeople(now);
    for(const r of sim.routes){
      const geo=this.network.routes.find(x=>x.id===r.id),points=geo.displayPoints||r.points.map(p=>this.toLatLng(...p));
      r.buses.forEach((pos,i)=>{
        const key=`${r.id}-${i}`;alive.add(key);
        if(!this.busMarkers.has(key)){
          const marker=L.marker(points[pos],{pane:'buses',icon:this.busIcon(r.id,i),keyboard:false,riseOnHover:true}).addTo(this.map);
          marker.bindPopup(`<div class="bus-popup"><b style="color:${COLORS[r.id]}">${r.id} 号线路</b><span>仿真公交 ${i+1}</span><small>车辆按原项目路径行驶<br>非实时 GPS / 不代表真实班次</small></div>`,{className:'transit-popup',offset:[0,-18]});
          this.busMarkers.set(key,marker);
        }
        const prev=previous?.find(x=>x.id===r.id)?.buses[i];
        this.transitions.set(key,{points,from:prev??pos,to:pos,steps:prev==null?0:steps,started:now,duration:200});
      });
    }
    for(const [key,marker] of this.busMarkers)if(!alive.has(key)){this.map.removeLayer(marker);this.busMarkers.delete(key);this.transitions.delete(key);}
    this.stops.forEach((m,i)=>{const [x,y]=this.network.stations[i],n=sim.counts[x*100+y];m.setStyle({radius:n?5.5:4.5,fillColor:n?'#fff0d8':'#fff'});m.setPopupContent(`<div class="bus-popup"><b>S${i+1} · 仿真车站</b><span>当前候车 ${n} 人</span><small>项目模型站点，非实时站牌数据</small></div>`);});
    this.drawHeat();
  }
  drawHeat(){
    if(!this.heatCanvas)return;
    const size=this.map.getSize(),dpr=Math.min(devicePixelRatio||1,2);
    this.heatCanvas.width=size.x*dpr;this.heatCanvas.height=size.y*dpr;
    this.heatCanvas.style.width=size.x+'px';this.heatCanvas.style.height=size.y+'px';
    L.DomUtil.setPosition(this.heatCanvas,this.map.containerPointToLayerPoint([0,0]));
    const c=this.heatCtx;c.setTransform(dpr,0,0,dpr,0,0);
    const panel=document.getElementById('heatSummary');panel.classList.toggle('heat-hidden',!this.showHeat);
    document.getElementById('map').classList.toggle('heat-focused',!!this.heatFocused&&this.showHeat);
    document.getElementById('heatFocus').disabled=!this.showHeat;
    if(!this.sim)return;
    const occupied=[];let peak=0;
    for(let i=0;i<this.sim.counts.length;i++){const n=this.sim.counts[i];if(n){occupied.push([i,n]);peak=Math.max(peak,n);}}
    document.getElementById('heatPeak').innerHTML=`${peak} <small>人</small>`;
    document.getElementById('heatNote').textContent=!this.showHeat?'热区已隐藏':peak?`${occupied.length} 个网格有人`:'暂无人流 · 开始仿真后显示';
    if(!this.showHeat)return;
    // Fixed per-cell thresholds, never normalized to each frame's maximum.
    // Paint low counts first so dense cells remain legible in overlapping halos.
    occupied.sort((a,b)=>a[1]-b[1]);
    const projected=this.map.latLngToContainerPoint(this.toLatLng(1,0)).distanceTo(this.map.latLngToContainerPoint(this.toLatLng(0,0)));
    for(const [i,n] of occupied){
      const p=this.map.latLngToContainerPoint(this.toLatLng(Math.floor(i/100),i%100));
      const radius=Math.min(58,Math.max(17,projected*2.4));
      if(p.x< -radius||p.y< -radius||p.x>size.x+radius||p.y>size.y+radius)continue;
      const rgb=n>=80?'153,27,64':n>=30?'226,57,39':n>=10?'246,126,29':'250,195,58';
      const g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);
      g.addColorStop(0,`rgba(${rgb},.88)`);g.addColorStop(.25,`rgba(${rgb},.70)`);
      g.addColorStop(.60,`rgba(${rgb},.24)`);g.addColorStop(1,`rgba(${rgb},0)`);
      c.fillStyle=g;c.beginPath();c.arc(p.x,p.y,radius,0,Math.PI*2);c.fill();
    }
    // Small opaque centers preserve the exact category even where halos overlap.
    for(const [i,n] of occupied){
      const p=this.map.latLngToContainerPoint(this.toLatLng(Math.floor(i/100),i%100));
      c.fillStyle=n>=80?'#991b40':n>=30?'#e23927':n>=10?'#f67e1d':'#fac33a';
      c.beginPath();c.arc(p.x,p.y,Math.max(1.5,Math.min(3,projected*.22)),0,Math.PI*2);c.fill();
    }
  }

  peopleMode(on){this.showPeople=on;this.drawPeople();}
  zoomToPeople(){
    let cell=6954,peak=0;
    if(this.sim)for(let i=0;i<this.sim.counts.length;i++)if(this.sim.counts[i]>peak){peak=this.sim.counts[i];cell=i;}
    this.map.setView(this.toLatLng(Math.floor(cell/100),cell%100),18.25,{animate:false});
  }
  drawPeople(now=performance.now()){
    if(!this.peopleCanvas)return;
    const size=this.map.getSize(),dpr=Math.min(devicePixelRatio||1,2),canvas=this.peopleCanvas,c=this.peopleCtx;
    const w=Math.round(size.x*dpr),h=Math.round(size.y*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    canvas.style.width=size.x+'px';canvas.style.height=size.y+'px';
    L.DomUtil.setPosition(canvas,this.map.containerPointToLayerPoint([0,0]));
    c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,size.x,size.y);
    const status=document.getElementById('peopleStatus');
    const report=text=>{if(status.textContent!==text)status.textContent=text;};
    if(!this.showPeople){report('行人图层已关闭');return;}
    if(this.map.getZoom()<18){report('远景显示热区 · 放大至街道级别查看行人');return;}
    if(!this.peopleTracks.length){report('暂无行人 · 开始仿真或增加一批人流');return;}
    const f=Math.min(1,Math.max(0,(now-this.peopleStarted)/200));this.peopleAnimating=f<1;
    const cells=new Map();let visible=0,drawn=0;
    for(const t of this.peopleTracks){
      const x=t.fromX+(t.x-t.fromX)*f,y=t.fromY+(t.y-t.fromY)*f;
      const center=this.map.latLngToContainerPoint(this.toLatLng(x,y));
      if(center.x<0||center.y<0||center.x>size.x||center.y>size.y)continue;
      visible++;
      const key=t.x*100+t.y,n=cells.get(key)||0;if(n>=5||drawn>=600)continue;cells.set(key,n+1);drawn++;
      // Stable offsets lie inside the simulated grid cell, not arbitrary city positions.
      const dx=(((t.id*37+11)%101)/100-.5)*.68,dy=(((t.id*61+29)%103)/102-.5)*.68;
      const p=this.map.latLngToContainerPoint(this.toLatLng(x+dx,y+dy));
      const scale=Math.min(1.3,.85+(this.map.getZoom()-18)*.25);
      c.save();c.translate(p.x,p.y);c.rotate(t.heading);c.scale(scale,scale);
      // Top-down shoulders, head and shoes; compact enough to preserve street context.
      c.fillStyle='#203f5138';c.beginPath();c.ellipse(1,2,4.3,5.8,0,0,Math.PI*2);c.fill();
      c.fillStyle='#263b48';c.fillRect(-2.7,2,2,3);c.fillRect(.7,2,2,3);
      c.fillStyle=['#237c8c','#426c9a','#596583','#317f6b'][t.id%4];
      c.strokeStyle='#ffffff';c.lineWidth=.8;c.beginPath();c.ellipse(0,0,4,2.9,0,0,Math.PI*2);c.fill();c.stroke();
      c.fillStyle=['#dfb48d','#c48f6b','#e9c5a1'][t.id%3];c.beginPath();c.arc(0,-2.1,2.2,0,Math.PI*2);c.fill();
      c.fillStyle='#433f3c';c.beginPath();c.arc(0,-2.6,1.65,Math.PI,Math.PI*2);c.fill();c.restore();
    }
    report(visible?`${drawn<visible?'抽样显示':'显示'} ${drawn} / 视野内 ${visible} 人`:'当前视野无行人 · 点击“放大查看人流”定位');
  }
  animate(){
    const now=performance.now();
    if(this.peopleAnimating&&this.showPeople&&this.map.getZoom()>=18)this.drawPeople(now);
    for(const [key,t] of this.transitions){
      if(t.finished)continue;
      const f=Math.min(1,(now-t.started)/t.duration),n=t.points.length;
      const progress=t.from+t.steps*f,index=Math.floor(progress)%n,part=progress-Math.floor(progress);
      const a=t.points[index],b=t.points[(index+1)%n];
      // Do not draw a cross-city flight when the original cyclic route wraps.
      const jump=this.map.distance(a,b)>120||index===n-1;
      const latlng=f===1?t.points[t.to]:jump?a:[a[0]+(b[0]-a[0])*part,a[1]+(b[1]-a[1])*part];
      const marker=this.busMarkers.get(key);marker.setLatLng(latlng);
      let next=(index+1)%n;
      while(next!==index&&t.points[next][0]===a[0]&&t.points[next][1]===a[1])next=(next+1)%n;
      const target=t.points[next];const angle=Math.atan2((target[1]-a[1])*.887,target[0]-a[0])*180/Math.PI;
      const body=marker.getElement()?.querySelector('.vehicle-rotate');if(body&&!jump)body.style.transform=`rotate(${angle}deg)`;
      if(f===1)t.finished=true;
    }
    this.frame=requestAnimationFrame(()=>this.animate());
  }
}
