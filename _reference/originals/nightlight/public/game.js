import * as THREE from 'three';
import {applyWindowRevealPines} from './pine-window-reveal.js';
import {filterRidgeGapTrees,VALLEY_LOOKBACK_DEFAULTS} from './ridge-pine-gap.js';
import {buildDarkValley,VALLEY_BUILD_DEFAULTS} from './dark-valley.js';
import {stationLayout,shellPieces,floorPiece,stationBlocked,inStationWalk,inStationRoom,STATION_BODY} from './station-room.js';
import {movePlan,onWoodenStairs,confinedRunZone,noteStep} from './move-speed.js';
import {updateDistantSound} from './distant-sound.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

const $=id=>document.getElementById(id);
const mobile=matchMedia('(pointer:coarse)').matches;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
// Flashlight and interact feel. Battery stays off: no drain, no meter.
const TUNING={
  flashlight:{
    color:0xfff1d8,intensity:300,range:28,angle:0.38,penumbra:0.45,decay:1.25,
    flicker:0.01,flickerHz:37,aimDistance:9,aimLift:0.2,aimUp:8,
    shadowBias:-0.0004,shadowNear:0.3,shadowFar:28,shadowMap:mobile?1024:2048,
    coneLength:13,
    focus:{angle:0.13,penumbra:0.16,intensity:460,range:28,coneLength:22,damp:9},
    // Once per run, at the top step. debug arms KeyR to replay it; off unless set.
    stairFlicker:{
      z:-69.5,duration:1.2,ease:0.04,
      dips:[[0.00,0.18,0.25],[0.45,0.12,0.0],[0.82,0.16,0.40]],
      reducedMotion:{level:0.35,duration:1.0},
      debug:false,
    },
  },
  interact:{
    range:3.2,beamNear:0.15,beamSlack:1.12,holdSeconds:0.85,reuseDelay:1.1,
    rimColor:0xffe1a8,rimGain:1.15,rimExtrude:0.045,rimDamp:12,glowCutoff:0.02,
    doorSwing:-1.15,doorDamp:3.5,promptRot:3,promptY:2,
    battery:false,
  },
  // Hollow room and the desk finish. Door and window stay on their original local spots.
  station:{
    finishRadius:1.5,
    width:7,depth:5,height:3.4,wall:0.12,
  },
  valleyLookback:{
    ...VALLEY_LOOKBACK_DEFAULTS,
    ...VALLEY_BUILD_DEFAULTS,
    valleySeed:919,
  },
  // Walk and trail run. confinedRun caps Shift and the run toggle on the wooden stairs and inside the station room.
  // stairZPad and stairEdge are the slack around that flight (the old footstep tread was half-width 1.6 + 0.15).
  move:{walk:1.8,run:4.6,confinedRun:2.4,stairZPad:0.05,stairEdge:0.15},
  // Once per play, ahead of the line at z=-30. Oscillators and filtered noise only.
  distantSound:{
    z:-24,duration:3,pitch:54,detune:16,gain:0.055,duck:0.2,
    x:-22,y:9,sourceZ:-72,refDistance:50,rolloff:0.8,swell:0.75,drop:0.8,
  },
};
let focusHeld=false,focusMouse=false,focusTouch=false,focusAmt=0;
let useDown=false,holdT=0,promptWord='',doorOpening=false,currentBest=null;
const interactables=[];
let doorPivot,doorMesh,windowMesh,radioMesh;
const layout=stationLayout(TUNING.station);
const renderer=new THREE.WebGLRenderer({antialias:!mobile,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.45;
document.body.prepend(renderer.domElement);

const scene=new THREE.Scene();
const FOG=new THREE.Color(0x1b2a30);
scene.background=FOG;scene.fog=new THREE.FogExp2(FOG,0.045);
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,0.1,200);

// ---------- lights
scene.add(new THREE.HemisphereLight(0x6f8a9a,0x14160f,1.6));
const moon=new THREE.DirectionalLight(0x8fb0d0,1.1);moon.position.set(-20,40,10);scene.add(moon);

// ---------- path
const P=[[0,0],[0,-14],[5,-28],[3,-42],[-4,-54],[-5,-66],[0,-80],[6,-92],[4,-104],[0,-114]].map(([x,z])=>new THREE.Vector3(x,0,z));
const curve=new THREE.CatmullRomCurve3(P);const samples=curve.getSpacedPoints(400);
const STAIR0=-62,STAIR1=-70,RISE=2.4,STAIR_N=12,STAIR_TREAD=3.2;
const hAt=z=>{const t=THREE.MathUtils.clamp((STAIR0-z)/(STAIR0-STAIR1),0,1);return t*RISE;};
function nearPath(x,z){let best=1e9,bi=0;for(let i=0;i<samples.length;i+=2){const s=samples[i];const d=(s.x-x)**2+(s.z-z)**2;if(d<best){best=d;bi=i;}}return{d:Math.sqrt(best),p:samples[bi],i:bi};}

// ---------- textures
const tl=new THREE.TextureLoader();
function tex(n,rep){const o={};for(const [k,m] of [['map','diff'],['normalMap','nor_gl'],['roughnessMap','rough']]){const t=tl.load(`tex/${n}_${m}_1k.jpg`);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);t.anisotropy=4;if(k==='map')t.colorSpace=THREE.SRGBColorSpace;o[k]=t;}return o;}
// ground
const gGeo=new THREE.PlaneGeometry(90,160,90,160);gGeo.rotateX(-Math.PI/2);gGeo.translate(0,0,-60);
{const pa=gGeo.attributes.position;for(let i=0;i<pa.count;i++){const x=pa.getX(i),z=pa.getZ(i);const n=nearPath(x,z);let y=hAt(z);if(n.d>3)y+=Math.sin(x*.7)*Math.cos(z*.5)*.25+(n.d-3)*.04;pa.setY(i,y);}gGeo.computeVertexNormals();}
const ground=new THREE.Mesh(gGeo,new THREE.MeshStandardMaterial({...tex('forest_ground_04',40),color:0x8a8a80}));ground.receiveShadow=true;scene.add(ground);
// wet gravel path ribbon
{const pts=curve.getSpacedPoints(300);const pos=[],uv=[],idx=[];let acc=0;
for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[Math.min(i+1,pts.length-1)],r=pts[Math.max(i-1,0)];const dir=q.clone().sub(r).normalize();const side=new THREE.Vector3(-dir.z,0,dir.x).multiplyScalar(1.4);if(i)acc+=p.distanceTo(pts[i-1]);
const a=p.clone().add(side),b=p.clone().sub(side);pos.push(a.x,hAt(a.z)+.03,a.z,b.x,hAt(b.z)+.03,b.z);uv.push(0,acc/2.8,1,acc/2.8);if(i)idx.push(2*i-2,2*i-1,2*i,2*i-1,2*i+1,2*i);}
const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
const t=tex('gravel_concrete_03',1);const m=new THREE.MeshStandardMaterial({...t,color:0x77736a,roughness:.35,metalness:.05});m.roughnessMap=null;
const path=new THREE.Mesh(g,m);path.receiveShadow=true;scene.add(path);}

// ---------- wood
const woodT=tex('brown_planks_09',1);const wood=new THREE.MeshStandardMaterial({...woodT,color:0x8a7a68});
// fence along path
{const post=new THREE.BoxGeometry(.14,1.1,.14),rail=new THREE.BoxGeometry(.08,.09,2.6);
const posts=new THREE.InstancedMesh(post,wood,200),rails=new THREE.InstancedMesh(rail,wood,400);let np=0,nr=0;const M=new THREE.Matrix4(),Q=new THREE.Quaternion();
for(let s=0.03;s<0.95;s+=0.012){if(s>0.5&&s<0.62)continue;const p=curve.getPointAt(s),d=curve.getTangentAt(s);const side=new THREE.Vector3(-d.z,0,d.x).multiplyScalar(2.1);const fp=p.clone().add(side);const y=hAt(fp.z);
M.compose(new THREE.Vector3(fp.x,y+.55,fp.z),Q.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.atan2(d.x,d.z)),new THREE.Vector3(1,1,1));posts.setMatrixAt(np++,M);
for(const h of [.45,.9]){M.compose(new THREE.Vector3(fp.x+d.x*1.3,y+h,fp.z+d.z*1.3),Q,new THREE.Vector3(1,1,1));rails.setMatrixAt(nr++,M);}}
posts.count=np;rails.count=nr;posts.castShadow=rails.castShadow=true;posts.receiveShadow=rails.receiveShadow=true;scene.add(posts,rails);}
// stairs
let leftRail;
{const g=new THREE.BoxGeometry(STAIR_TREAD,.2,(STAIR0-STAIR1)/STAIR_N);const st=new THREE.InstancedMesh(g,wood,STAIR_N);const M=new THREE.Matrix4();
for(let i=0;i<STAIR_N;i++){const z=STAIR0-(i+.5)*(STAIR0-STAIR1)/STAIR_N;const x=nearPath(0,z).p.x;M.makeTranslation(x,hAt(z)+.02,z);st.setMatrixAt(i,M);}st.castShadow=st.receiveShadow=true;scene.add(st);
for(const sx of [-1.7,1.7]){const r=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,9),wood);const z=(STAIR0+STAIR1)/2;r.position.set(nearPath(0,z).p.x+sx,RISE/2+.9,z);r.rotation.x=Math.atan2(RISE,STAIR0-STAIR1);r.castShadow=true;scene.add(r);if(sx===-1.7)leftRail=r;}}

function cabinPos(){return new THREE.Vector3(-3,0,-120);}
// ---------- pine trees (instanced)
const bark=new THREE.MeshStandardMaterial({...tex('bark_brown_02',1),color:0x6b5a4a});
const needle=new THREE.MeshStandardMaterial({color:0x1f3526,roughness:.9,flatShading:true});
const trunkG=new THREE.CylinderGeometry(.18,.32,14,7);trunkG.translate(0,7,0);
const coneGs=[0,1,2,3,4].map(k=>{const r=2.4-k*.42,h=3.6-k*.3;const g=new THREE.ConeGeometry(r,h,8,3,true);const pa=g.attributes.position;for(let i=0;i<pa.count;i++){pa.setX(i,pa.getX(i)*(1+Math.sin(i*12.9)*.12));pa.setZ(i,pa.getZ(i)*(1+Math.cos(i*7.1)*.12));}g.translate(0,4.2+k*2.1,0);g.computeVertexNormals();return g;});
const trees=[];let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
for(let i=0;i<2600&&trees.length<520;i++){const x=(rnd()-.5)*88,z=10-rnd()*150;const n=nearPath(x,z);if(n.d<3.6)continue;if(Math.hypot(x-cabinPos().x,z-cabinPos().z)<8)continue;if(trees.some(t=>(t.x-x)**2+(t.z-z)**2<4))continue;trees.push({x,z,s:.7+rnd()*.8,r:rnd()*6.28});}
applyWindowRevealPines(trees);
const gapTrees=filterRidgeGapTrees(trees,TUNING.valleyLookback,nearPath,curve);trees.length=0;trees.push(...gapTrees);
let vSeed=TUNING.valleyLookback.valleySeed;const vRnd=()=>(vSeed=(vSeed*16807)%2147483647)/2147483647;
const {group:darkValleyGroup,valleyPines}=buildDarkValley(TUNING.valleyLookback,vRnd);darkValleyGroup.renderOrder=-2;scene.add(darkValleyGroup);
for(const p of valleyPines)trees.push({x:p.x,z:p.z,y:p.y,s:p.s,r:p.r});
let pineTrunk,pineCones;
{const M=new THREE.Matrix4(),Q=new THREE.Quaternion();const tr=new THREE.InstancedMesh(trunkG,bark,trees.length);const cones=coneGs.map(g=>new THREE.InstancedMesh(g,needle,trees.length));
pineTrunk=tr;pineCones=cones;
trees.forEach((t,i)=>{M.compose(new THREE.Vector3(t.x,t.y!=null?t.y:hAt(t.z)-.1,t.z),Q.setFromAxisAngle(new THREE.Vector3(0,1,0),t.r),new THREE.Vector3(t.s,t.s*(.9+(i%5)*.06),t.s));tr.setMatrixAt(i,M);cones.forEach(c=>c.setMatrixAt(i,M));});
tr.castShadow=true;cones.forEach(c=>{c.castShadow=true;c.receiveShadow=true;scene.add(c)});tr.receiveShadow=true;scene.add(tr);}
// ferns/undergrowth
{const g=new THREE.ConeGeometry(.5,.5,5,1,true);g.translate(0,.2,0);const m=new THREE.MeshStandardMaterial({color:0x1a2a16,roughness:1,side:THREE.DoubleSide});const n=900;const f=new THREE.InstancedMesh(g,m,n);const M=new THREE.Matrix4();let k=0;
const cp=cabinPos(),ct=Math.cos(-.15),st=Math.sin(-.15);
for(let i=0;i<4000&&k<n;i++){const x=(rnd()-.5)*80,z=8-rnd()*140;const d=nearPath(x,z).d;if(d<2.4||d>18)continue;
 const dx=x-cp.x,dz=z-cp.z,lx=dx*ct-dz*st,lz=dx*st+dz*ct;if(Math.abs(lx)<3.55&&lz>-2.6&&lz<2.65)continue;if(lx>-2.5&&lx<-0.4&&lz>2.3&&lz<3.8)continue;
 const s=.5+rnd()*1.4;M.compose(new THREE.Vector3(x,hAt(z),z),new THREE.Quaternion(),new THREE.Vector3(s,s*.7,s));f.setMatrixAt(k++,M);}f.count=k;f.receiveShadow=true;scene.add(f);}

// ---------- radio station cabin
function remapShellUV(g){
  const S=TUNING.station,pos=g.attributes.position,nor=g.attributes.normal,uv=g.attributes.uv;
  const hx=S.width/2,hz=S.depth/2;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const nx=Math.abs(nor.getX(i)),ny=Math.abs(nor.getY(i)),nz=Math.abs(nor.getZ(i));
    let u,v;
    if(ny>=nx&&ny>=nz){u=(x+hx)/S.width;v=(z+hz)/S.depth;}
    else if(nx>=nz){u=(z+hz)/S.depth;v=y/S.height;}
    else{u=(x+hx)/S.width;v=y/S.height;}
    uv.setXY(i,u,v);
  }
}
function pieceGeom(p){const g=new THREE.BoxGeometry(p.w,p.h,p.d);g.translate(p.x,p.y,p.z);remapShellUV(g);return g;}
function boxAt(w,h,d,x,y,z){const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);return g;}
function paintGeom(g,hex){
  const c=new THREE.Color(hex),a=new Float32Array(g.attributes.position.count*3);
  for(let i=0;i<g.attributes.position.count;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}
  g.setAttribute('color',new THREE.BufferAttribute(a,3));
}
function buildStationShell(){
  const cabinWood=new THREE.MeshStandardMaterial({map:wood.map,normalMap:wood.normalMap,roughnessMap:wood.roughnessMap,color:0x8a7a68,side:THREE.DoubleSide});
  const shell=new THREE.Mesh(mergeGeometries(shellPieces(layout,TUNING.station).map(pieceGeom)),cabinWood);
  shell.castShadow=shell.receiveShadow=true;cabinOccluder.add(shell);
  const floorG=pieceGeom(floorPiece(layout,TUNING.station));{const uv=floorG.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*4,uv.getY(i)*3);}
  const floor=new THREE.Mesh(floorG,wood);
  floor.receiveShadow=true;cabin.add(floor);
  const desk=layout.desk,chair=layout.chair,stove=layout.stove,book=layout.book,radio=layout.radio;
  const woodBits=[];
  const topT=0.07,foot=0.05,topBottom=desk.top-topT;
  woodBits.push(boxAt(desk.w,topT,desk.d,desk.x,desk.top-topT/2,desk.z));
  const leg=0.07,legH=topBottom-foot;
  for(const x of [desk.x-desk.w/2+0.09,desk.x+desk.w/2-0.09])for(const z of [desk.z-desk.d/2+0.08,desk.z+desk.d/2-0.08])woodBits.push(boxAt(leg,legH,leg,x,foot+legH/2,z));
  const seatT=0.05;
  woodBits.push(boxAt(chair.w,seatT,chair.d,chair.x,chair.seat,chair.z));
  const chH=chair.seat-foot;
  for(const x of [chair.x-chair.w/2+0.06,chair.x+chair.w/2-0.06])for(const z of [chair.z-chair.d/2+0.06,chair.z+chair.d/2-0.06])woodBits.push(boxAt(0.05,chH,0.05,x,foot+chH/2,z));
  woodBits.push(boxAt(chair.w,chair.back,0.05,chair.x,chair.seat+chair.back/2,chair.z-chair.d/2+0.025));
  const furn=new THREE.Mesh(mergeGeometries(woodBits),wood);furn.castShadow=furn.receiveShadow=true;cabin.add(furn);
  const cover=new THREE.BoxGeometry(book.w,book.h,book.d),pages=new THREE.BoxGeometry(book.w*.9,book.h*.42,book.d*.84);
  pages.translate(0,book.h*.2,0);paintGeom(cover,0x3c2a1c);paintGeom(pages,0xd5c3a1);
  const bookMesh=new THREE.Mesh(mergeGeometries([cover,pages]),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96}));
  bookMesh.position.set(book.x,book.y,book.z);bookMesh.rotation.y=book.rot;bookMesh.castShadow=bookMesh.receiveShadow=true;cabin.add(bookMesh);
  const metal=new THREE.MeshStandardMaterial({color:0x6a6258,metalness:.62,roughness:.42});
  const bits=[],bodyH=stove.h*.78;
  bits.push(boxAt(stove.w,bodyH,stove.d,stove.x,bodyH/2,stove.z));
  bits.push(boxAt(stove.w*1.04,0.045,stove.d*1.04,stove.x,bodyH+0.022,stove.z));
  const plateTop=bodyH+0.044,ky=plateTop+0.08;
  const pot=new THREE.CylinderGeometry(.1,.115,.16,8);pot.translate(stove.x,ky,stove.z);bits.push(pot);
  const lid=new THREE.CylinderGeometry(.06,.072,.028,8);lid.translate(stove.x,ky+.092,stove.z);bits.push(lid);
  const knob=new THREE.SphereGeometry(.018,8,6);knob.translate(stove.x,ky+.118,stove.z);bits.push(knob);
  const handle=new THREE.TorusGeometry(.06,.012,4,8);handle.rotateY(Math.PI/2);handle.translate(stove.x+.125,ky,stove.z);bits.push(handle);
  const spout=new THREE.CylinderGeometry(.018,.028,.1,6);spout.rotateZ(Math.PI/3);spout.translate(stove.x-.12,ky+.04,stove.z);bits.push(spout);
  const stoveMesh=new THREE.Mesh(mergeGeometries(bits),metal);stoveMesh.castShadow=stoveMesh.receiveShadow=true;cabin.add(stoveMesh);
  const rbits=[];
  const body=boxAt(radio.w,radio.h,radio.d,0,0,0);paintGeom(body,0x241c16);rbits.push(body);
  const dialZ=-radio.d/2-0.012;
  for(const dx of [-.13,0,.13]){const dial=new THREE.CylinderGeometry(.04,.04,.024,12);dial.rotateX(Math.PI/2);dial.translate(dx,.01,dialZ);paintGeom(dial,0xc6a36a);rbits.push(dial);}
  const radioMat=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.48,roughness:.42});
  radioMesh=new THREE.Mesh(mergeGeometries(rbits),radioMat);
  radioMesh.position.set(radio.x,radio.y,radio.z);radioMesh.castShadow=radioMesh.receiveShadow=true;
  const amber=new THREE.Mesh(new THREE.CylinderGeometry(.026,.026,.02,12),new THREE.MeshBasicMaterial({color:0xffc14a}));
  amber.rotation.x=Math.PI/2;amber.position.set(0,.01,dialZ-0.02);radioMesh.add(amber);cabin.add(radioMesh);
}
function flattenStationGround(){
  const S=TUNING.station,hx=S.width/2,hz=S.depth/2,pa=gGeo.attributes.position,v=new THREE.Vector3();
  for(let i=0;i<pa.count;i++){
    v.set(pa.getX(i),cabin.position.y,pa.getZ(i));cabin.worldToLocal(v);
    if(Math.abs(v.x)<hx-0.05&&v.z>-hz+0.05&&v.z<hz-0.05)pa.setY(i,hAt(pa.getZ(i)));
  }
  pa.needsUpdate=true;gGeo.computeVertexNormals();
}
const cabin=new THREE.Group();scene.add(cabin);const cabinOccluder=new THREE.Group();cabin.add(cabinOccluder);let redLight;{const c=cabinPos();cabin.position.set(c.x,hAt(c.z),c.z);
buildStationShell();
const roof=new THREE.Mesh(new THREE.ConeGeometry(5.4,2.2,4),new THREE.MeshStandardMaterial({color:0x2a2622,roughness:.6}));roof.rotation.y=Math.PI/4;roof.scale.z=.75;roof.position.y=4.5;roof.castShadow=true;cabinOccluder.add(roof);
windowMesh=new THREE.Mesh(new THREE.BoxGeometry(1.46,1.12,.07),new THREE.MeshStandardMaterial({color:0x3a2e24,roughness:.8}));windowMesh.position.set(1.6,1.9,2.54);windowMesh.castShadow=true;cabin.add(windowMesh);
const winMat=new THREE.MeshBasicMaterial({color:0xffb860});
const win=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.9),winMat);win.position.set(1.6,1.9,2.62);cabin.add(win);
const winIn=new THREE.Mesh(new THREE.PlaneGeometry(1.28,.98),winMat);winIn.position.set(1.6,1.9,layout.hz-layout.t-0.012);winIn.rotation.y=Math.PI;cabin.add(winIn);
doorPivot=new THREE.Group();doorPivot.position.set(-1.9,0,2.54);
doorMesh=new THREE.Mesh(new THREE.BoxGeometry(1,2.1,.08),new THREE.MeshStandardMaterial({color:0x201812,roughness:.82,side:THREE.DoubleSide}));
doorMesh.position.set(.5,1.05,.05);doorMesh.castShadow=true;doorPivot.add(doorMesh);cabin.add(doorPivot);
const lamp=new THREE.PointLight(0xffa850,6,14,1.6);lamp.position.set(1.6,2,3.4);cabin.add(lamp);
const bulb=new THREE.Mesh(new THREE.SphereGeometry(.09),new THREE.MeshBasicMaterial({color:0xffd9a0}));bulb.position.set(-1.4,2.5,2.7);cabin.add(bulb);
const pl=new THREE.PointLight(0xffc080,3,8,2);pl.position.copy(bulb.position);cabin.add(pl);
const mast=new THREE.Mesh(new THREE.CylinderGeometry(.06,.12,14,5),new THREE.MeshStandardMaterial({color:0x555555,metalness:.6,roughness:.4}));mast.position.set(-4.5,7,-1);mast.castShadow=true;cabinOccluder.add(mast);
redLight=new THREE.Mesh(new THREE.SphereGeometry(.15),new THREE.MeshBasicMaterial({color:0xff2010}));redLight.position.set(-4.5,14.1,-1);cabin.add(redLight);
cabin.rotation.y=-.15;}
cabin.updateMatrixWorld(true);flattenStationGround();

// ---------- interactables (door is the only hold)
const _wp=new THREE.Vector3(),_to=new THREE.Vector3(),_dir=new THREE.Vector3();
function rimMat(){
  return new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,side:THREE.BackSide,
    uniforms:{uGlow:{value:0},uColor:{value:new THREE.Color(TUNING.interact.rimColor)},uGain:{value:TUNING.interact.rimGain},uExtrude:{value:TUNING.interact.rimExtrude}},
    vertexShader:`uniform float uExtrude;void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*uExtrude,1.0);}`,
    fragmentShader:`uniform float uGlow;uniform float uGain;uniform vec3 uColor;void main(){float a=uGlow*uGain;gl_FragColor=vec4(uColor*a,1.0);}`});
}
function track(mesh,prompt,hold,onUse){
  const mat=rimMat();const glow=new THREE.Mesh(mesh.geometry,mat);mesh.add(glow);
  const item={mesh,prompt,hold,onUse,mat,glow,cool:0,used:false};interactables.push(item);return item;
}
function handLetters(word){
  const rot=TUNING.interact.promptRot,yj=TUNING.interact.promptY;
  return [...word].map((ch,i)=>{const r=((ch.charCodeAt(0)*17+i*9)%(rot*2+1))-rot;const y=((ch.charCodeAt(0)*5+i*3)%(yj*2+1))-yj;return `<span style="transform:translateY(${y}px) rotate(${r}deg)">${ch}</span>`;}).join('');
}
function setPrompt(word,fill,hold){
  const el=$('prompt');
  if(!word){if(promptWord){promptWord='';el.innerHTML='';}el.style.opacity='0';el.style.pointerEvents='none';el.setAttribute('aria-hidden','true');return;}
  if(promptWord!==word){promptWord=word;el.innerHTML=handLetters(word)+(hold?'<b><i></i></b>':'');}
  el.style.opacity='1';el.style.pointerEvents=mobile?'auto':'none';el.setAttribute('aria-hidden','false');
  const bar=el.querySelector('i');if(bar) bar.style.transform=`scaleX(${Math.max(0,Math.min(1,fill))})`;
}
function beamOn(mesh){
  if(!lightOn) return false;
  mesh.getWorldPosition(_wp);_to.copy(_wp).sub(flashlight.position);const dist=_to.length();
  if(dist<TUNING.interact.beamNear||dist>flashlight.distance) return false;
  _to.multiplyScalar(1/dist);_dir.copy(flashlight.target.position).sub(flashlight.position);
  if(_dir.lengthSq()<1e-8) return false;_dir.normalize();
  return _dir.dot(_to)>Math.cos(Math.min(Math.PI/2,flashlight.angle*TUNING.interact.beamSlack));
}
function inReach(mesh){
  mesh.getWorldPosition(_wp);
  // The left rail is the length of the stairs. Its center is out of range from the steps at either end, so this one item measures the closest point on the rail.
  if(mesh===leftRail){_dir.set(0,0,1).transformDirection(mesh.matrixWorld);_to.copy(player.position).sub(_wp);const half=mesh.geometry.parameters.depth/2;_wp.addScaledVector(_dir,THREE.MathUtils.clamp(_to.dot(_dir),-half,half));}
  return _wp.distanceTo(player.position)<TUNING.interact.range;
}
function fireInteract(it){
  if(!it||it.used||it.cool>0||!beamOn(it.mesh)||!inReach(it.mesh)) return;
  if(it.hold) it.used=true;else it.cool=TUNING.interact.reuseDelay;
  click();it.onUse();
}
function reachStation(){
  if(done) return;done=true;
  $('done').style.display='flex';
  $('obj').innerHTML='<small>Objective</small><s style="opacity:.6">Reach the radio station</s>';
  sub('Hello? Is anyone receiving this? …Hello?',6);
}
function updateInteract(dt){
  let best=null,bestD=Infinity;
  for(const it of interactables){
    it.cool=Math.max(0,it.cool-dt);
    const hit=!it.used&&beamOn(it.mesh);
    const u=it.mat.uniforms.uGlow;u.value=THREE.MathUtils.damp(u.value,hit?1:0,TUNING.interact.rimDamp,dt);
    it.glow.visible=u.value>TUNING.interact.glowCutoff;
    if(done||it.used||it.cool>0||!hit||!inReach(it.mesh)) continue;
    const d=player.position.distanceTo(_wp);
    if(d<bestD){bestD=d;best=it;}
  }
  if(best!==currentBest){holdT=0;currentBest=best;}
  if(useDown&&best&&best.hold){holdT+=dt;if(holdT>=TUNING.interact.holdSeconds){useDown=false;holdT=0;fireInteract(best);}}
  else if(!useDown) holdT=0;
  if(doorOpening) doorPivot.rotation.y=THREE.MathUtils.damp(doorPivot.rotation.y,TUNING.interact.doorSwing,TUNING.interact.doorDamp,dt);
  if(best) setPrompt(best.prompt,holdT/TUNING.interact.holdSeconds,best.hold);else setPrompt('',0,false);
}
{
  const s1=nearPath(0,-16),signG=new THREE.Group();
  const post=new THREE.Mesh(new THREE.BoxGeometry(.08,1.2,.08),wood);post.position.y=.58;post.castShadow=true;
  const signMesh=new THREE.Mesh(new THREE.BoxGeometry(.92,.46,.05),new THREE.MeshStandardMaterial({color:0xd7b98a,roughness:.9}));
  signMesh.position.y=1.2;signMesh.castShadow=signMesh.receiveShadow=true;signG.add(post,signMesh);
  signG.position.set(s1.p.x-1.25,hAt(s1.p.z),s1.p.z);signG.rotation.y=Math.PI/2;scene.add(signG);
  track(signMesh,'read',false,()=>sub('Carved into the board: STATION. Stay on the gravel.',4.5));
  const s2=nearPath(0,-54),noteG=new THREE.Group();
  const stake=new THREE.Mesh(new THREE.BoxGeometry(.045,.7,.045),wood);stake.position.y=.32;stake.castShadow=true;
  const noteMesh=new THREE.Mesh(new THREE.BoxGeometry(.42,.3,.03),new THREE.MeshStandardMaterial({color:0xe4d2ae,roughness:1}));
  noteMesh.position.set(0,.66,0);noteMesh.rotation.z=.14;noteMesh.castShadow=noteMesh.receiveShadow=true;noteG.add(stake,noteMesh);
  noteG.position.set(s2.p.x-1.25,hAt(s2.p.z),s2.p.z);noteG.rotation.y=Math.PI/2;scene.add(noteG);
  track(noteMesh,'read',false,()=>sub('Pencil on a wet scrap: Count the stairs. Do not look back.',4.5));
}
track(windowMesh,'look',false,()=>sub('A shape crosses the warm glass. Then it is only the lamp.',4.5));
track(doorMesh,'open',true,()=>{doorOpening=true;});
track(radioMesh,'use',false,()=>{reachStation();});
track(leftRail,'count',false,()=>sub('Twelve steps.',3.5));

// ---------- rain
const rainN=mobile?1500:3000;const rainG=new THREE.BufferGeometry();const rp=new Float32Array(rainN*6);
for(let i=0;i<rainN;i++){const x=(Math.random()-.5)*30,y=Math.random()*14,z=(Math.random()-.5)*30;rp.set([x,y,z,x+.02,y-.35,z],i*6);}
rainG.setAttribute('position',new THREE.BufferAttribute(rp,3));const rain=new THREE.LineSegments(rainG,new THREE.LineBasicMaterial({color:0x8899aa,transparent:true,opacity:.28}));scene.add(rain);

// ---------- player
const player=new THREE.Group();scene.add(player);let model=null,mixer=null,acts={},cur=null;
const flashlight=new THREE.SpotLight(TUNING.flashlight.color,TUNING.flashlight.intensity,TUNING.flashlight.range,TUNING.flashlight.angle,TUNING.flashlight.penumbra,TUNING.flashlight.decay);flashlight.castShadow=true;flashlight.shadow.mapSize.set(TUNING.flashlight.shadowMap,TUNING.flashlight.shadowMap);flashlight.shadow.bias=TUNING.flashlight.shadowBias;flashlight.shadow.camera.near=TUNING.flashlight.shadowNear;flashlight.shadow.camera.far=TUNING.flashlight.shadowFar;
scene.add(flashlight,flashlight.target);
const torch=new THREE.Mesh(new THREE.CylinderGeometry(.03,.04,.24,8),new THREE.MeshStandardMaterial({color:0x111111,metalness:.7,roughness:.3}));torch.rotation.x=Math.PI/2;
const lens=new THREE.Mesh(new THREE.CircleGeometry(.032,12),new THREE.MeshBasicMaterial({color:0xfff6e0}));lens.position.z=.121;const torchG=new THREE.Group();torchG.add(torch,lens);scene.add(torchG);
// volumetric cone
const coneLen=TUNING.flashlight.coneLength;const vg=new THREE.ConeGeometry(Math.tan(TUNING.flashlight.angle)*coneLen,coneLen,32,24,true);vg.translate(0,-coneLen/2,0);vg.rotateX(-Math.PI/2);
const vmat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{uOn:{value:1},uT:{value:0}},
vertexShader:`varying vec3 vP;varying vec3 vN;varying vec3 vW;void main(){vP=position;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vW=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
fragmentShader:`uniform float uOn;uniform float uT;varying vec3 vP;varying vec3 vN;varying vec3 vW;float h(vec3 p){return fract(sin(dot(p,vec3(12.9,78.2,37.7)))*43758.5);}
void main(){float d=clamp(vP.z/${coneLen.toFixed(1)},0.,1.);float rim=abs(dot(normalize(vN),normalize(vW)));float a=pow(rim,2.2)*(1.-d)*(1.-d)*.11;
float n=.75+.25*sin(vP.z*1.7-uT*.8+vP.x*2.)*sin(vP.y*2.3+uT*.5);gl_FragColor=vec4(vec3(1.,.95,.85)*a*n*uOn,1.);}`});
const vol=new THREE.Mesh(vg,vmat);scene.add(vol);
// fake flare sprite
const flare=new THREE.Mesh(new THREE.PlaneGeometry(.5,.5),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uOn:{value:1}},vertexShader:`varying vec2 u;void main(){u=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float uOn;varying vec2 u;void main(){float d=length(u-.5)*2.;gl_FragColor=vec4(vec3(1.,.93,.8)*pow(max(0.,1.-d),3.)*uOn,1.);}`}));scene.add(flare);

let handBone=null;const rim=new THREE.PointLight(0x9fb8d0,2.5,6,1.5);scene.add(rim);
const loader=new GLTFLoader();
function pick(names,re){return names.find(n=>re.test(n));}
async function loadCharacter(url,label){
  const g=await loader.loadAsync(url);
  if(model){player.remove(model);mixer?.stopAllAction();}
  model=g.scene;acts={};cur=null;handBone=null;
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material.envMapIntensity=.4;}}if(o.isBone&&!handBone&&/hand.?r|right.?hand|r.?hand|hand_r|handr|wrist.?r/i.test(o.name))handBone=o;});
  const box=new THREE.Box3().setFromObject(model);const h=box.max.y-box.min.y||1;const s=1.68/h;model.scale.setScalar(s);
  box.setFromObject(model);model.position.y-=box.min.y;const c=box.getCenter(new THREE.Vector3());model.position.x-=c.x;model.position.z-=c.z;
  // facing: assume +Z forward (glTF convention)
  player.add(model);
  mixer=new THREE.AnimationMixer(model);const names=g.animations.map(a=>a.name);
  const find=re=>{const n=pick(names,re);return n?g.animations.find(a=>a.name===n):null;};
  const clips={idle:find(/idle(?!_)|idle$|idle_neutral|^idle/i),walk:find(/walk(?!_?back)/i),run:find(/^.*\|?run(?!_?(back|left|right|shoot|attack))/i)||find(/run/i)};
  if(!clips.idle&&g.animations[0])clips.idle=g.animations[0];
  for(const k in clips)if(clips[k]){acts[k]=mixer.clipAction(clips[k]);}
  play('idle');curName=label;
  sub(`${label} loaded`,1.5);
}
let curName='',clipKey='idle';
function play(k){const a=acts[k]||acts.walk||acts.idle;clipKey=(a&&a===acts[k])?k:((a&&a===acts.walk)?'walk':((a&&a===acts.idle)?'idle':k));if(!a||a===cur)return;a.reset().fadeIn(.25).play();cur?.fadeOut(.25);cur=a;}

// ---------- postprocessing
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.6,.5,.88);composer.addPass(bloom);
const grade=new ShaderPass({uniforms:{tDiffuse:{value:null},uT:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
fragmentShader:`uniform sampler2D tDiffuse;uniform float uT;varying vec2 vUv;float r(vec2 c){return fract(sin(dot(c,vec2(12.9898,78.233))+uT)*43758.5453);}
void main(){vec2 o=(vUv-.5)*.0025;vec4 c=texture2D(tDiffuse,vUv);c.r=texture2D(tDiffuse,vUv+o).r;c.b=texture2D(tDiffuse,vUv-o).b;
float v=smoothstep(.95,.25,length(vUv-.5)*1.25);c.rgb*=mix(.35,1.,v);c.rgb=mix(c.rgb,c.rgb*vec3(.9,1.,1.08),.5);c.rgb+=(r(vUv*vec2(913.,577.))-.5)*.045;gl_FragColor=c;}`});
composer.addPass(grade);composer.addPass(new OutputPass());

// ---------- input
const keys={};addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyF')toggleLight();if(e.code==='KeyR'&&!e.repeat&&started&&TUNING.flashlight.stairFlicker.debug)stairT=0;});addEventListener('keyup',e=>keys[e.code]=false);
let yaw=Math.PI,pitch=-.08,joy={x:0,y:0},running=false,lightOn=true;
let stairResolved=false,stairT=null,stairMul=1;
const cv=renderer.domElement;
cv.addEventListener('click',()=>{if(!mobile&&started)cv.requestPointerLock?.();});
addEventListener('mousemove',e=>{if(document.pointerLockElement===cv){yaw-=e.movementX*.0025;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.002,-.6,.45);}});
const joyEl=$('joy'),knob=$('knob');let joyId=null,camId=null,lx=0,ly=0;
addEventListener('touchstart',e=>{for(const t of e.changedTouches){const r=joyEl.getBoundingClientRect();const ui=t.target.closest&&(t.target.closest('.btn')||t.target.closest('#prompt'));if(joyId===null&&t.clientX<innerWidth*.45&&t.clientY>innerHeight*.35&&!ui){joyId=t.identifier;joyMove(t);}else if(camId===null&&!ui){camId=t.identifier;lx=t.clientX;ly=t.clientY;}}},{passive:false});
addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches){if(t.identifier===joyId)joyMove(t);else if(t.identifier===camId){yaw-=(t.clientX-lx)*.006;pitch=THREE.MathUtils.clamp(pitch-(t.clientY-ly)*.004,-.6,.45);lx=t.clientX;ly=t.clientY;}}},{passive:false});
addEventListener('touchend',e=>{for(const t of e.changedTouches){if(t.identifier===joyId){joyId=null;joy={x:0,y:0};knob.style.transform='';}if(t.identifier===camId)camId=null;}});
function joyMove(t){const r=joyEl.getBoundingClientRect();let x=(t.clientX-(r.left+r.width/2))/50,y=(t.clientY-(r.top+r.height/2))/50;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}joy={x,y};knob.style.transform=`translate(${x*40}px,${y*40}px)`;}
function syncFocus(){focusHeld=focusMouse||focusTouch;$('bFocus').classList.toggle('on',focusHeld&&lightOn);}
function toggleLight(){lightOn=!lightOn;$('bLight').classList.toggle('on',lightOn);syncFocus();click();}
$('bLight').addEventListener('touchstart',e=>{e.preventDefault();toggleLight();});$('bLight').addEventListener('click',toggleLight);
$('bRun').addEventListener('touchstart',e=>{e.preventDefault();running=!running;$('bRun').classList.toggle('on',running);});
$('bLight').classList.add('on');
function focusDown(e){e.preventDefault();e.stopPropagation();focusTouch=true;syncFocus();}
function focusUp(e){if(e){e.preventDefault();e.stopPropagation();}focusTouch=false;syncFocus();}
$('bFocus').addEventListener('touchstart',focusDown,{passive:false});
$('bFocus').addEventListener('touchend',focusUp,{passive:false});
$('bFocus').addEventListener('touchcancel',()=>focusUp());
$('prompt').addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();if(!currentBest)return;if(currentBest.hold)useDown=true;else fireInteract(currentBest);},{passive:false});
$('prompt').addEventListener('touchend',e=>{e.preventDefault();e.stopPropagation();useDown=false;},{passive:false});
$('prompt').addEventListener('touchcancel',()=>{useDown=false;});
addEventListener('mousedown',e=>{
  if(e.button===2){e.preventDefault();focusMouse=true;syncFocus();return;}
  if(e.button!==0||mobile||!started||document.pointerLockElement!==cv) return;
  if(e.target.closest&&e.target.closest('.btn,#picker,#start,#prompt')) return;
  useDown=true;if(currentBest&&!currentBest.hold) fireInteract(currentBest);
});
addEventListener('mouseup',e=>{if(e.button===2){focusMouse=false;syncFocus();}if(e.button===0) useDown=false;});
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('blur',()=>{focusMouse=false;focusTouch=false;useDown=false;syncFocus();});
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==cv){focusMouse=false;useDown=false;syncFocus();}});

// ---------- picker
const picker=$('picker');let roster=[];
async function buildPicker(){roster=await (await fetch('characters/index.json',{cache:'no-store'})).json();
 picker.innerHTML='';roster.forEach(r=>{const d=document.createElement('div');d.className='c'+(r.name===curName?' sel':'');d.textContent=r.name;d.onclick=()=>{loadCharacter('characters/'+r.file,r.name);picker.style.display='none';};picker.appendChild(d);});
 const l=document.createElement('label');l.innerHTML='📂 Load .glb from device<input type="file" accept=".glb,.gltf,model/gltf-binary" style="display:none">';l.querySelector('input').onchange=e=>{const f=e.target.files[0];if(f){loadCharacter(URL.createObjectURL(f),f.name.replace(/\.glb$/i,''));picker.style.display='none';}};picker.appendChild(l);
 const x=document.createElement('div');x.textContent='✕';x.style.cssText='font-size:22px;opacity:.7;margin-top:8px';x.onclick=()=>picker.style.display='none';picker.appendChild(x);}
$('bChar').addEventListener('click',async()=>{await buildPicker();picker.style.display='flex';});

// ---------- audio (synthesized, no files)
let ac=null,bus=null,rainGain=null,stepBuf=null;
const stepState={carry:0};let stepsPlayed=0;
const distantState={played:false};
function startAudio(){try{ac=new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();const len=ac.sampleRate*2,b=ac.createBuffer(1,len,ac.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;l=(l+.02*w)/1.02;d[i]=w*.4+l*3;}
 const src=ac.createBufferSource();src.buffer=b;src.loop=true;const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=1400;bus=ac.createGain();bus.gain.value=.12;rainGain=ac.createGain();rainGain.gain.value=1;src.connect(f).connect(rainGain).connect(bus).connect(ac.destination);src.start();
 const n=Math.floor(ac.sampleRate*.2);stepBuf=ac.createBuffer(1,n,ac.sampleRate);const s=stepBuf.getChannelData(0);for(let i=0;i<n;i++)s[i]=Math.random()*2-1;}catch(e){}}
function click(){if(!ac)return;const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=1800;g.gain.setValueAtTime(.15,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.05);o.connect(g).connect(ac.destination);o.start();o.stop(ac.currentTime+.06);}
// Footsteps share the rain bus, so they stay on the same mute path. rainGain is unity until the valley moan ducks it; footsteps connect after that node. Short filtered noise only.
function noiseBurst(when,dur,type,freq,q,peak){const src=ac.createBufferSource();src.buffer=stepBuf;const f=ac.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=ac.createGain();const a=Math.min(.004,dur*.25);g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),when+a);g.gain.exponentialRampToValueAtTime(.0001,when+dur);src.connect(f).connect(g).connect(bus);src.start(when,Math.random()*Math.max(0,stepBuf.duration-dur-.01));src.stop(when+dur+.02);}
function playStep(kind,speed){const t=ac.currentTime,pitch=.93+Math.random()*.14,loud=(.84+Math.random()*.32)*THREE.MathUtils.clamp(speed/TUNING.move.walk,.22,1.05)*(kind==='wood'?2.6:2.15);
 if(kind==='wood'){noiseBurst(t,.14,'bandpass',150*pitch,12,loud);noiseBurst(t,.08,'bandpass',290*pitch,6,loud*.4);noiseBurst(t,.024,'highpass',460*pitch,.7,loud*.5);}
 else{noiseBurst(t,.05,'bandpass',(1400+Math.random()*600)*pitch,.85,loud);noiseBurst(t+.01+Math.random()*.012,.034,'bandpass',(800+Math.random()*450)*pitch,1.6,loud*.55);noiseBurst(t,.02,'highpass',2000*pitch,.7,loud*.26);}}
const _cl=new THREE.Vector3(),_cw=new THREE.Vector3();
function toCabinXZ(x,z){_cl.set(x,cabin.position.y,z);cabin.worldToLocal(_cl);return{x:_cl.x,z:_cl.z};}
function fromCabinXZ(lx,lz){_cw.set(lx,0,lz);cabin.localToWorld(_cw);return{x:_cw.x,z:_cw.z};}
function canTraverse(x,z){const n=nearPath(x,z);if(n.d<5.5&&z<6&&z>-121)return true;const l=toCabinXZ(x,z);return inStationWalk(l.x,l.z,TUNING.station);}
function cabinHit(x,z){const l=toCabinXZ(x,z);return stationBlocked(l.x,l.z,doorPivot.rotation.y,layout,STATION_BODY);}
function unstickCabin(){
  const l=toCabinXZ(player.position.x,player.position.z),ang=doorPivot.rotation.y;
  if(!stationBlocked(l.x,l.z,ang,layout,STATION_BODY))return;
  for(let ring=1;ring<=14;ring++){const rad=ring*.08;for(let k=0;k<12;k++){const a=k/12*Math.PI*2,lx=l.x+Math.cos(a)*rad,lz=l.z+Math.sin(a)*rad;if(stationBlocked(lx,lz,ang,layout,STATION_BODY))continue;const w=fromCabinXZ(lx,lz);player.position.x=w.x;player.position.z=w.z;return;}}
}
const _hear=new THREE.Vector3();
function audioPose(){const d=camera.getWorldDirection(_hear),e=camera.matrixWorld.elements,p=camera.position;return {x:p.x,y:p.y,z:p.z,fx:d.x,fy:d.y,fz:d.z,ux:e[4],uy:e[5],uz:e[6]};}
function stairSpan(z){return {z0:STAIR0,z1:STAIR1,pathX:nearPath(0,z).p.x,halfWidth:STAIR_TREAD/2,edge:TUNING.move.stairEdge,zPad:TUNING.move.stairZPad};}
function onStairsAt(x,z){return onWoodenStairs(x,z,stairSpan(z));}
// The flight is the stair mesh. The room is inStationRoom; the porch (inStationWalk only) keeps trail run.
function confinedAt(x,z){const l=toCabinXZ(x,z);return confinedRunZone(x,z,{stairs:stairSpan(z),inRoom:inStationRoom(l.x,l.z,TUNING.station)});}
function footSurface(){const x=player.position.x,z=player.position.z;
 if(onStairsAt(x,z))return 'wood';
 const l=toCabinXZ(x,z),S=TUNING.station,hx=S.width/2,hz=S.depth/2;
 if(Math.abs(l.x)<hx-0.05&&l.z>-hz+0.05&&l.z<hz-0.05)return 'wood';
 if(l.z>2.15&&l.z<4.7&&Math.abs(l.x)<4.15)return 'wood';
 return 'gravel';}
function updateFootsteps(dist,speed){if(!ac||!bus||picker.style.display==='flex'){stepState.carry=0;return;}
 if(Math.abs(player.position.y-hAt(player.position.z))>.35){stepState.carry=0;return;}
 if(noteStep(stepState,dist,speed,TUNING.move.run)){stepsPlayed++;playStep(footSurface(),speed);}}
// One multiplier for the spotlight, the beam cone and the flare. No sound.
function stairFlickerLevel(t){
  const S=TUNING.flashlight.stairFlicker;
  if(t===null||t<0) return 1;
  if(reduceMotion.matches){
    const d=S.reducedMotion.duration;
    if(t>=d) return 1;
    const k=Math.sin(Math.PI*THREE.MathUtils.clamp(t/d,0,1));
    return THREE.MathUtils.lerp(1,S.reducedMotion.level,k);
  }
  if(t>=S.duration) return 1;
  let m=1;
  for(const [start,len,level] of S.dips){
    const end=start+len;
    if(t<=start||t>=end) continue;
    const e=Math.min(S.ease,len/2);
    let k=1;
    if(e>1e-4&&t<start+e) k=THREE.MathUtils.smoothstep(t,start,start+e);
    else if(e>1e-4&&t>end-e) k=THREE.MathUtils.smoothstep(end-t,0,e);
    m=THREE.MathUtils.lerp(1,level,k);
  }
  return m;
}
function updateStairFlicker(dt,prevZ){
  const S=TUNING.flashlight.stairFlicker;
  if(!stairResolved){
    const z=player.position.z;
    if(prevZ>S.z&&z<=S.z&&footSurface()==='wood'){
      stairResolved=true;
      if(lightOn) stairT=0;
    }
  }
  if(stairT!==null){
    stairT+=dt;
    const dur=reduceMotion.matches?S.reducedMotion.duration:S.duration;
    if(stairT>=dur) stairT=null;
  }
  stairMul=stairFlickerLevel(stairT);
}

// ---------- subtitles
let subT=0;function sub(t,dur=4){$('sub').textContent=t;$('sub').style.opacity=1;subT=dur;}
const beats=[{z:-4,t:"The power's out across the valley. The radio station is the only way to reach anyone."},{z:-30,t:"Keep to the path. Whatever that sound was, it wasn't the wind."},{z:-58,t:"The old stairs. The station should be just over the ridge."},{z:-96,t:"There. A light in the window. Someone's still there."}];

// ---------- loop
let started=false,done=false;const clock=new THREE.Clock();const tmp=new THREE.Vector3(),fwd=new THREE.Vector3(),camT=new THREE.Vector3();
player.position.set(0,0,2);player.rotation.y=Math.PI;
function applyLocomotion(dt){
  let ix=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+joy.x,iz=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0)+joy.y;
  const mag=Math.min(1,Math.hypot(ix,iz));
  const runIntent=(running||keys.ShiftLeft||keys.ShiftRight)&&mag>.3;
  const plan=movePlan(TUNING.move,{mag,runIntent,confined:confinedAt(player.position.x,player.position.z)});
  if(plan.moving){const a=Math.atan2(-ix,-iz)+yaw;const sp=plan.speed;const nx=player.position.x+Math.sin(a)*sp*dt,nz=player.position.z+Math.cos(a)*sp*dt;
    if(canTraverse(nx,nz)&&!cabinHit(nx,nz)){player.position.x=nx;player.position.z=nz;}
    else{if(canTraverse(nx,player.position.z)&&!cabinHit(nx,player.position.z))player.position.x=nx;if(canTraverse(player.position.x,nz)&&!cabinHit(player.position.x,nz))player.position.z=nz;}
    const ta=Math.atan2(Math.sin(a),Math.cos(a));let dr=ta-player.rotation.y;dr=Math.atan2(Math.sin(dr),Math.cos(dr));player.rotation.y+=dr*Math.min(1,dt*10);
    play(plan.clip);if(acts.walk&&cur===acts.walk)cur.timeScale=Math.max(.6,mag*1.2);
  }else play('idle');
  return mag;
}
function update(dt,t){
  const x0=player.position.x,z0=player.position.z;
  const mag=applyLocomotion(dt);
  unstickCabin();
  if(!done){const l=toCabinXZ(player.position.x,player.position.z);const dx=l.x-layout.desk.x,dz=l.z-layout.desk.z;if(inStationRoom(l.x,l.z,TUNING.station)&&dx*dx+dz*dz<TUNING.station.finishRadius*TUNING.station.finishRadius)reachStation();}
  player.position.y=THREE.MathUtils.lerp(player.position.y,hAt(player.position.z),.3);
  const moved=Math.hypot(player.position.x-x0,player.position.z-z0);updateFootsteps(moved,moved/Math.max(dt,1e-4));
  updateStairFlicker(dt,z0);
  if(model&&!Object.keys(acts).length)model.position.y=Math.abs(Math.sin(t*8))*.04*(mag>.08?1:0);
  mixer?.update(dt);rim.position.copy(player.position).add(new THREE.Vector3(0,2.6,0)).addScaledVector(new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),1.5);
  // camera over-shoulder
  fwd.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
  const right=new THREE.Vector3(-Math.cos(yaw),0,Math.sin(yaw));
  camT.copy(player.position).addScaledVector(right,.62).add(tmp.set(0,1.62,0)).addScaledVector(fwd,-2.7);
  camera.position.lerp(camT,1-Math.exp(-dt*12));
  camera.lookAt(tmp.copy(player.position).addScaledVector(right,.62).add(new THREE.Vector3(0,1.45,0)).addScaledVector(fwd,10));
  // Moan only after Play (this loop runs once started, and startAudio has set ac). No mute control; reduced motion does not reshape this one swell.
  try{updateDistantSound({ac,rainGain,tuning:TUNING.distantSound,state:distantState,prevZ:z0,z:player.position.z,pose:audioPose()});}catch(e){}
  // flashlight from hand toward aim. Focus narrows the same beam; battery stays off.
  focusAmt=THREE.MathUtils.damp(focusAmt,(focusHeld&&lightOn)?1:0,TUNING.flashlight.focus.damp,dt);
  const F=TUNING.flashlight;
  flashlight.angle=THREE.MathUtils.lerp(F.angle,F.focus.angle,focusAmt);
  flashlight.penumbra=THREE.MathUtils.lerp(F.penumbra,F.focus.penumbra,focusAmt);
  flashlight.distance=THREE.MathUtils.lerp(F.range,F.focus.range,focusAmt);
  const flick=1+Math.sin(t*F.flickerHz)*F.flicker;
  const hand=new THREE.Vector3();if(handBone){handBone.getWorldPosition(hand);}else hand.copy(player.position).add(tmp.set(0,1.15,0)).addScaledVector(right,-.3);
  const cd=camera.getWorldDirection(new THREE.Vector3());const aim=camera.position.clone().addScaledVector(cd,F.aimDistance);aim.y=Math.min(aim.y,player.position.y+F.aimLift+Math.max(0,cd.y)*F.aimUp);
  flashlight.position.copy(hand);flashlight.target.position.copy(aim);flashlight.intensity=lightOn?THREE.MathUtils.lerp(F.intensity,F.focus.intensity,focusAmt)*flick*stairMul:0;
  torchG.position.copy(hand);torchG.lookAt(aim);
  const len=THREE.MathUtils.lerp(F.coneLength,F.focus.coneLength,focusAmt);
  const zScale=len/F.coneLength,rScale=(Math.tan(flashlight.angle)*len)/(Math.tan(F.angle)*F.coneLength);
  vol.position.copy(hand);vol.lookAt(aim);vol.scale.set(rScale,rScale,zScale);vmat.uniforms.uOn.value=lightOn?stairMul:0;vmat.uniforms.uT.value=t;
  flare.position.copy(hand).addScaledVector(aim.clone().sub(hand).normalize(),.14);flare.lookAt(camera.position);flare.material.uniforms.uOn.value=lightOn?stairMul:0;
  // rain follows player
  rain.position.set(player.position.x,player.position.y,player.position.z);{const a=rainG.attributes.position.array;for(let i=0;i<a.length;i+=6){a[i+1]-=dt*14;a[i+4]-=dt*14;if(a[i+1]<-1){a[i+1]+=15;a[i+4]+=15;}}rainG.attributes.position.needsUpdate=true;}
  redLight.material.color.setScalar(0).r=(Math.sin(t*3)>0?1:.15);
  grade.uniforms.uT.value=t%10;
  // story lines still speak as you pass them. The desk finish is the one proximity check.
  for(const b of beats)if(!b.done&&player.position.z<b.z){b.done=true;sub(b.t,5);}
  if(subT>0){subT-=dt;if(subT<=0)$('sub').style.opacity=0;}
  updateInteract(dt);
}
// Headless probe. One forward tick through update(), then the player, beats, and flicker flags go back.
function probeMove(o){
  const snap={
    x:player.position.x,y:player.position.y,z:player.position.z,ry:player.rotation.y,
    yaw,running,jx:joy.x,jy:joy.y,carry:stepState.carry,
    KeyW:keys.KeyW,KeyA:keys.KeyA,KeyS:keys.KeyS,KeyD:keys.KeyD,
    ArrowUp:keys.ArrowUp,ArrowDown:keys.ArrowDown,ArrowLeft:keys.ArrowLeft,ArrowRight:keys.ArrowRight,
    ShiftLeft:keys.ShiftLeft,ShiftRight:keys.ShiftRight,
    beats:beats.map(b=>b.done),done,stairResolved,stairT,stairMul,
    subT,sub:$('sub').textContent,subOp:$('sub').style.opacity,
    doneDisp:$('done').style.display,obj:$('obj').innerHTML,
  };
  const steps0=stepsPlayed;
  try{
    const frames=o.frames||1,dt=o.dt||1/60;
    player.position.set(o.x,hAt(o.z),o.z);player.rotation.y=Math.PI;yaw=Math.PI;
    running=o.run==='toggle';joy.x=0;joy.y=0;stepState.carry=0;
    keys.KeyW=true;keys.KeyA=keys.KeyS=keys.KeyD=false;
    keys.ArrowUp=keys.ArrowDown=keys.ArrowLeft=keys.ArrowRight=false;
    keys.ShiftLeft=o.run===true||o.run==='shift';keys.ShiftRight=false;
    const confinedStart=confinedAt(o.x,o.z);
    let dist=0;
    for(let i=0;i<frames;i++){
      const x0=player.position.x,z0=player.position.z;
      update(dt,0);
      dist+=Math.hypot(player.position.x-x0,player.position.z-z0);
    }
    return {speed:dist/(frames*dt),steps:stepsPlayed-steps0,clip:clipKey,dist,confinedStart,confinedEnd:confinedAt(player.position.x,player.position.z),endX:player.position.x,endZ:player.position.z,frames,dt};
  }finally{
    player.position.set(snap.x,snap.y,snap.z);player.rotation.y=snap.ry;
    yaw=snap.yaw;running=snap.running;joy.x=snap.jx;joy.y=snap.jy;stepState.carry=snap.carry;
    keys.KeyW=snap.KeyW;keys.KeyA=snap.KeyA;keys.KeyS=snap.KeyS;keys.KeyD=snap.KeyD;
    keys.ArrowUp=snap.ArrowUp;keys.ArrowDown=snap.ArrowDown;keys.ArrowLeft=snap.ArrowLeft;keys.ArrowRight=snap.ArrowRight;
    keys.ShiftLeft=snap.ShiftLeft;keys.ShiftRight=snap.ShiftRight;
    beats.forEach((b,i)=>{b.done=snap.beats[i];});
    done=snap.done;stairResolved=snap.stairResolved;stairT=snap.stairT;stairMul=snap.stairMul;
    subT=snap.subT;
    $('sub').textContent=snap.sub;$('sub').style.opacity=snap.subOp;
    $('done').style.display=snap.doneDisp;$('obj').innerHTML=snap.obj;
  }
}
function paintFrame(readError){const dt=Math.min(clock.getDelta(),.05);const t=clock.elapsedTime;if(started)update(dt,t);composer.render();return readError?renderer.getContext().getError():0;}
function frame(){paintFrame(false);requestAnimationFrame(frame);}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});
camera.position.set(0,1.8,5.5);camera.lookAt(0,1.4,-5);
window.__game={player,tuning:TUNING,get started(){return started},set yaw(v){yaw=v},
  get audio(){return !!(ac&&bus);},get clip(){return clipKey},
  get clips(){return {idle:!!acts.idle,walk:!!acts.walk,run:!!acts.run};},
  pathX(z){return nearPath(0,z).p.x;},toWorld(lx,lz){return fromCabinXZ(lx,lz);},toLocal(x,z){return toCabinXZ(x,z);},
  sampleMove(o){return probeMove(o);},
  paintFrames(n){const errors=[];for(let i=0;i<(n||1);i++)errors.push(paintFrame(true));return errors;}};
function checkWindowSightline(){
  const windowWorld=new THREE.Vector3(1.6,1.9,2.62);cabin.localToWorld(windowWorld);
  const blockers=[ground,pineTrunk,...pineCones,cabinOccluder];
  const Y=Math.PI,P=-0.08,f=new THREE.Vector3(),r=new THREE.Vector3(),cp=new THREE.Vector3(),rd=new THREE.Vector3(),rc=new THREE.Raycaster();
  const camAt=p=>{f.set(Math.sin(Y)*Math.cos(P),Math.sin(P),Math.cos(Y)*Math.cos(P));r.set(-Math.cos(Y),0,Math.sin(Y));return cp.copy(p).addScaledVector(r,.62).add(new THREE.Vector3(0,1.62,0)).addScaledVector(f,-2.7);};
  const blocked=from=>{rd.copy(windowWorld).sub(from);const d=rd.length();rd.multiplyScalar(1/d);rc.set(from,rd);rc.far=d-.05;return rc.intersectObjects(blockers,true).length>0;};
  const lines=['Window sightline check (in-game scene, tree seed=7)',''];
  let failEarly=0,failLate=0;const len=curve.getLength();
  for(let d=0;d<=len+1e-6;d+=2){const t=d/len,p=curve.getPointAt(Math.min(t,1));p.y=hAt(p.z);const b=blocked(camAt(p));
    lines.push(`z=${p.z.toFixed(1).padStart(7)}  x=${p.x.toFixed(1).padStart(5)}  ${b?'blocked':'VISIBLE'}`);
    if(p.z>-88&&!b) failEarly++;if(p.z<=-92&&b) failLate++;}
  lines.push('',`Summary: ${failEarly} sample(s) with z>-88 not blocked; ${failLate} sample(s) with z<=-92 still blocked.`);
  return lines.join('\n');
}
window.__game.checkWindowSightline=()=>console.log(checkWindowSightline());
const DEBUG_WINDOW_SIGHTLINE=false;
if(DEBUG_WINDOW_SIGHTLINE) console.log(checkWindowSightline());
loadCharacter('characters/hana.glb','Hana').then(()=>{$('load').textContent='';}).catch(e=>{$('load').textContent='character failed: '+e.message;});
frame();
$('play').addEventListener('click',()=>{if(started)return;started=true;$('start').style.display='none';$('obj').style.opacity=1;startAudio();});
