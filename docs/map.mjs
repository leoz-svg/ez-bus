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
    for(const [name,z] of [['land',210],['buildings',240],['roads',270],['roadLabels',310],['geography',350],['routes',400],['heat',420],['stops',450],['buses',500]]){
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
    this.map.on('moveend zoomend resize',()=>{this.drawHeat();this.refreshLabels();});
    this.map.on('zoomstart',()=>{this.heatCanvas.style.opacity='0';});
    this.map.on('zoomend',()=>{this.heatCanvas.style.opacity='1';});
    network.stations.forEach(([x,y],i)=>{
      const marker=L.circleMarker(this.toLatLng(x,y),{pane:'stops',radius:4.5,color:'#486266',weight:2,fillColor:'#fff',fillOpacity:1}).addTo(this.map);
      marker.bindTooltip(`S${i+1} · 仿真车站`,{direction:'top',className:'stop-tooltip'});
      marker.bindPopup('',{className:'transit-popup'});this.stops.push(marker);
    });
    this.home();let oldWidth=document.getElementById('map').clientWidth;this.resizeObserver=new ResizeObserver(()=>{this.map.invalidateSize({pan:false});const width=document.getElementById('map').clientWidth;if(Math.abs(width-oldWidth)>10){oldWidth=width;this.home();}});
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
    if(!this.showHeat||!this.sim)return;
    for(let i=0;i<this.sim.counts.length;i++){
      const n=this.sim.counts[i];if(!n)continue;
      const p=this.map.latLngToContainerPoint(this.toLatLng(Math.floor(i/100),i%100));
      if(p.x< -30||p.y< -30||p.x>size.x+30||p.y>size.y+30)continue;
      const radius=(9+Math.min(15,Math.sqrt(n)*2))*Math.pow(1.5,this.map.getZoom()-16);
      const g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);
      g.addColorStop(0,`rgba(218,104,54,${Math.min(.6,.12+n/130)})`);g.addColorStop(.45,'rgba(237,173,71,.2)');g.addColorStop(1,'rgba(237,173,71,0)');
      c.fillStyle=g;c.beginPath();c.arc(p.x,p.y,radius,0,Math.PI*2);c.fill();
    }
  }
  animate(){
    const now=performance.now();
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
