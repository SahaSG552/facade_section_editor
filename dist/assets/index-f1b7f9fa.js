(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function e(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(s){if(s.ep)return;s.ep=!0;const r=e(s);fetch(s.href,r)}})();const hu="modulepreload",uu=function(i){return"/"+i},yl={},Sl=function(t,e,n){if(!e||e.length===0)return t();const s=document.getElementsByTagName("link");return Promise.all(e.map(r=>{if(r=uu(r),r in yl)return;yl[r]=!0;const o=r.endsWith(".css"),a=o?'[rel="stylesheet"]':"";if(!!n)for(let h=s.length-1;h>=0;h--){const u=s[h];if(u.href===r&&(!o||u.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${r}"]${a}`))return;const c=document.createElement("link");if(c.rel=o?"stylesheet":hu,o||(c.as="script",c.crossOrigin=""),c.href=r,document.head.appendChild(c),o)return new Promise((h,u)=>{c.addEventListener("load",h),c.addEventListener("error",()=>u(new Error(`Unable to preload CSS for ${r}`)))})})).then(()=>t()).catch(r=>{const o=new Event("vite:preloadError",{cancelable:!0});if(o.payload=r,window.dispatchEvent(o),!o.defaultPrevented)throw r})};function Fr(i){return i*Math.PI/180}function he(i){if(!i||typeof i!="string")return i;try{return math.evaluate(i)}catch{return i}}function du(i){var r;if(!i||i.length===0)return{minX:0,minY:0,maxX:0,maxY:0,width:0,height:0,center:{x:0,y:0}};const t=(r=i[0])==null?void 0:r.ownerSVGElement;if(!t)return{minX:0,minY:0,maxX:0,maxY:0,width:0,height:0,center:{x:0,y:0}};const e=t.getAttribute("viewBox"),n=t.getBoundingClientRect();t.setAttribute("viewBox",`0 0 ${n.width} ${n.height}`);try{let o=function(g){const x=g.getBBox(),m=g.getCTM(),f=t.createSVGPoint(),A=[{x:x.x,y:x.y},{x:x.x+x.width,y:x.y},{x:x.x+x.width,y:x.y+x.height},{x:x.x,y:x.y+x.height}];let v=1/0,S=1/0,w=-1/0,R=-1/0;return A.forEach(P=>{f.x=P.x,f.y=P.y;const I=f.matrixTransform(m);v=Math.min(v,I.x),S=Math.min(S,I.y),w=Math.max(w,I.x),R=Math.max(R,I.y)}),{x:v,y:S,width:w-v,height:R-S}};var s=o;let a=1/0,l=1/0,c=-1/0,h=-1/0;if(i.forEach(g=>{if(g&&typeof g.getBBox=="function"){const x=o(g);a=Math.min(a,x.x),l=Math.min(l,x.y),c=Math.max(c,x.x+x.width),h=Math.max(h,x.y+x.height)}}),a===1/0)return{minX:0,minY:0,maxX:0,maxY:0,width:0,height:0,center:{x:0,y:0}};const u=c-a,d=h-l,p={x:a+u/2,y:l+d/2};return{minX:a,minY:l,maxX:c,maxY:h,width:u,height:d,center:p}}finally{e?t.setAttribute("viewBox",e):t.removeAttribute("viewBox")}}function fu(i,t,e=0){const{width:n,height:s}=t,r=n+2*e,o=s+2*e,a=i.canvas.getBoundingClientRect(),l=a.width,c=a.height,h=l/r,u=c/o;i.zoomLevel=Math.min(h,u),i.panX=t.center.x,i.panY=t.center.y,i.updateViewBox(),i.canvas.style.transition="viewBox 1s ease"}function zc(i,t){if(t){const{minX:e,maxX:n,minY:s,maxY:r,padding:o=20}=t,a=n-e+2*o,l=r-s+2*o,c=i.canvas.getBoundingClientRect(),h=c.width,u=c.height,d=h/a,p=u/l;i.zoomLevel=Math.min(d,p),i.panX=(e+n)/2,i.panY=(s+r)/2}else{const e=i.canvas.getBoundingClientRect();i.zoomLevel=1,i.panX=e.width/2,i.panY=e.height/2}i.updateViewBox()}function pu(i,t,e=20){const n=Wo(t);zc(i,{minX:n.centerX-n.width/2,maxX:n.centerX+n.width/2,minY:n.centerY-n.height/2,maxY:n.centerY+n.height/2,padding:e})}function Wo(i){const t=document.createElementNS("http://www.w3.org/2000/svg","svg");t.style.position="absolute",t.style.left="-9999px",t.style.top="-9999px",t.style.width="1px",t.style.height="1px",t.appendChild(i),document.body.appendChild(t);const e=i.getBBox();return document.body.removeChild(t),{width:e.width,height:e.height,centerX:e.x+e.width/2,centerY:e.y+e.height/2}}const wi={cylindrical:{operations:["AL","OU","IN"],bits:[{id:"cyl-1",name:"D10H20",diameter:10,length:20,shankDiameter:6,totalLength:50,fillColor:"rgba(0, 140, 255, 0.3)"},{id:"cyl-2",name:"D12H25",diameter:12,length:25,shankDiameter:8,totalLength:60,fillColor:"rgba(0, 140, 255, 0.3)"}]},conical:{operations:["AL","VC"],bits:[{id:"con-1",name:"V90D25",diameter:25.4,length:19,angle:90,fillColor:"rgba(26, 255, 0, 0.3)"},{id:"con-2",name:"V120D32",diameter:32,length:13.2,angle:120,fillColor:"rgba(26, 255, 0, 0.3)"},{id:"con-3",name:"V120D50",diameter:50,length:20.6,angle:120,fillColor:"rgba(26, 255, 0, 0.3)"}]},ball:{operations:["AL","OU","IN"],bits:[{id:"bn-1",name:"U10",diameter:10,length:20,height:5,fillColor:"rgba(255, 0, 0, 0.3)"},{id:"bn-2",name:"U19",diameter:19,length:25,height:9.5,fillColor:"rgba(255, 0, 0, 0.3)"},{id:"bn-3",name:"U38",diameter:38.1,length:22,height:19.05,fillColor:"rgba(255, 0, 0, 0.3)"}]},fillet:{operations:["AL","OU","IN"],bits:[{id:"fil-1",name:"R3",diameter:6.35,length:6.35,height:3.175,cornerRadius:3.175,flat:0,fillColor:"rgba(128, 0, 128, 0.3)"},{id:"fil-2",name:"R4D9F2",diameter:9.5,length:9.5,height:4,cornerRadius:4,flat:2,fillColor:"rgba(128, 0, 128, 0.3)"}]},bull:{operations:["AL","OU","IN"],bits:[{id:"bul-1",name:"B3D10",diameter:10,length:10,height:3,cornerRadius:3,flat:4,fillColor:"rgba(128, 128, 0, 0.3)"},{id:"bul-2",name:"B2D12",diameter:12,length:12,height:2,cornerRadius:2,flat:8,fillColor:"rgba(128, 128, 0, 0.3)"}]}},Vc="facade_bits_v1";let re=null;const Yr=new Set(Object.keys(wi));function Rs(i){const t=wi[i];return t&&typeof t=="object"&&t.bits?{operations:t.operations||[],bits:t.bits}:{operations:["AL"],bits:t||[]}}function Ei(){return"b_"+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}async function Ys(){const i=localStorage.getItem(Vc);if(i)try{const t=JSON.parse(i);re={};let e=!1;Object.keys(wi).forEach(n=>{t[n]?re[n]=t[n]:(re[n]=Rs(n).bits.map(s=>({id:s.id||Ei(),...s})),e=!0)}),e&&Vn();return}catch(t){console.warn("Failed to parse bits from storage, fallback to defaults.",t)}try{const t=await fetch("./src/data/userBits.json");if(t.ok){const e=await t.json();re={},Object.keys(wi).forEach(n=>{e[n]&&Array.isArray(e[n])?re[n]=e[n].map(s=>({id:s.id||Ei(),...s})):re[n]=Rs(n).bits.map(s=>({id:s.id||Ei(),...s}))}),Vn();return}}catch(t){console.warn("Failed to load from userBits.json, using defaults.",t)}re={},Object.keys(wi).forEach(t=>{re[t]=Rs(t).bits.map(e=>({id:e.id||Ei(),...e}))}),Vn()}function Vn(){localStorage.setItem(Vc,JSON.stringify(re))}let Ml=!1,oo=null;async function mu(){Ml||(oo||(oo=Ys()),await oo,Ml=!0)}async function Ai(){return await mu(),re}function gu(i){re={},Object.keys(wi).forEach(t=>{re[t]=i[t]||Rs(t).bits.map(e=>({id:e.id||Ei(),...e}))}),Vn()}function Ha(i){return Yr.has(i)?Rs(i).operations:[]}function Xo(i,t){if(re||Ys(),!Yr.has(i))return null;const e={id:Ei(),...t};return Array.isArray(re[i])||(re[i]=[]),re[i].push(e),Vn(),e}function Gc(i,t,e){if(re||Ys(),!Yr.has(i))return null;const n=re[i].findIndex(s=>s.id===t);return n===-1?null:(re[i][n]={...re[i][n],...e},Vn(),re[i][n])}function Hc(i,t){re||Ys(),Yr.has(i)&&(re[i]=re[i].filter(e=>e.id!==t),Vn())}function xu(){re=null,Ys(),Vn()}function _u(){if(!re)return null;const i=JSON.stringify(re,null,2),t=new Blob([i],{type:"application/json"}),e=document.createElement("a");return e.href=URL.createObjectURL(t),e.download="userBits.json",document.body.appendChild(e),e.click(),document.body.removeChild(e),t}function vu(i){try{const t=JSON.parse(i),e=Object.keys(wi);if(!e.every(s=>Array.isArray(t[s])))throw new Error("Invalid JSON structure");return re={},e.forEach(s=>{re[s]=(t[s]||[]).map(r=>({id:r.id||Ei(),...r}))}),Vn(),!0}catch(t){return console.error("Failed to import JSON:",t),!1}}const bl=Object.freeze(Object.defineProperty({__proto__:null,addBit:Xo,deleteBit:Hc,exportToJSON:_u,getBits:Ai,getOperationsForGroup:Ha,importFromJSON:vu,resetToDefaults:xu,setBits:gu,updateBit:Gc},Symbol.toStringTag,{value:"Module"}));class El{constructor(t,e,n,s){this.svgNS=t,this.defs=e,this.gridLayer=n,this.config=s}render(){const t=this.defs.querySelector(`#${this.config.id}-pattern`);t&&this.defs.removeChild(t);let e=0,n=0;const s=document.createElementNS(this.svgNS,"pattern");s.id=`${this.config.id}-pattern`,s.setAttribute("patternUnits","userSpaceOnUse"),s.setAttribute("x",e),s.setAttribute("y",n),s.setAttribute("width",this.config.size),s.setAttribute("height",this.config.size);const r=document.createElementNS(this.svgNS,"line");r.setAttribute("x1",0),r.setAttribute("y1",0),r.setAttribute("x2",this.config.size),r.setAttribute("y2",0),r.setAttribute("stroke",this.config.color),r.setAttribute("stroke-width",this.config.thickness),s.appendChild(r);const o=document.createElementNS(this.svgNS,"line");o.setAttribute("x1",0),o.setAttribute("y1",0),o.setAttribute("x2",0),o.setAttribute("y2",this.config.size),o.setAttribute("stroke",this.config.color),o.setAttribute("stroke-width",this.config.thickness),s.appendChild(o),this.defs.appendChild(s);const a=document.createElementNS(this.svgNS,"rect");a.setAttribute("x",this.config.x),a.setAttribute("y",this.config.y),a.setAttribute("width",this.config.width),a.setAttribute("height",this.config.height),a.setAttribute("fill",`url(#${this.config.id}-pattern)`),a.setAttribute("pointer-events","none"),this.gridLayer.appendChild(a)}}class Wc{constructor(t){this.config={canvas:null,width:800,height:600,enableZoom:!0,enablePan:!0,enableGrid:!0,enableMouseEvents:!0,enableSelection:!1,enableDrag:!1,gridSize:1,gridAnchorX:null,gridAnchorY:null,initialZoom:1,initialPanX:400,initialPanY:300,layers:["grid","content","overlay"],onZoom:null,onPan:null,onMouseDown:null,onMouseMove:null,onMouseUp:null,onWheel:null,...t},this.svgNS="http://www.w3.org/2000/svg",this.zoomLevel=this.config.initialZoom,this.panX=this.config.initialPanX,this.panY=this.config.initialPanY,this.isDragging=!1,this.lastMouseX=0,this.lastMouseY=0,this.gridEnabled=this.config.enableGrid,this.layers={},this.gridLayer=null,this.initialize()}initialize(){if(!this.config.canvas)throw new Error("Canvas element is required");this.canvas=this.config.canvas,this.updateCanvasSize(),this.canvas.setAttribute("width","100%"),this.canvas.setAttribute("height","100%"),this.panX=this.canvasParameters.width/2,this.panY=this.canvasParameters.height/2,this.canvas.setAttribute("viewBox",`0 0 ${this.canvasParameters.width} ${this.canvasParameters.height}`),this.config.layers.forEach(e=>{const n=document.createElementNS(this.svgNS,"g");n.id=`${e}-layer`,this.layers[e]=n,this.canvas.appendChild(n),e==="grid"&&(this.gridLayer=n)}),this.config.enableGrid&&this.drawGrid(),this.config.enableMouseEvents&&this.setupMouseEvents();const t=this.canvas.parentElement;t&&(this.resizeObserver=new ResizeObserver(()=>{this.resize()}),this.resizeObserver.observe(t)),this.updateViewBox()}setupMouseEvents(){this.config.enableZoom&&this.canvas.addEventListener("wheel",this.handleZoom.bind(this),{passive:!1}),this.canvas.addEventListener("mousedown",this.handleMouseDown.bind(this)),this.canvas.addEventListener("mousemove",this.handleMouseMove.bind(this)),this.canvas.addEventListener("mouseup",this.handleMouseUp.bind(this)),this.canvas.addEventListener("mouseleave",this.handleMouseUp.bind(this)),this.setupTouchEvents()}setupTouchEvents(){this.setupBasicTouchEvents()}setupBasicTouchEvents(){const t=this.canvas.parentElement;t&&(t.addEventListener("touchstart",this.handleTouchStart.bind(this),{passive:!1}),t.addEventListener("touchmove",this.handleTouchMove.bind(this),{passive:!1}),t.addEventListener("touchend",this.handleTouchEnd.bind(this),{passive:!1})),this.canvas.addEventListener("touchstart",this.handleTouchStart.bind(this),{passive:!1}),this.canvas.addEventListener("touchmove",this.handleTouchMove.bind(this),{passive:!1}),this.canvas.addEventListener("touchend",this.handleTouchEnd.bind(this),{passive:!1})}drawGrid(){if(!this.gridEnabled||!this.gridLayer)return;this.gridLayer.innerHTML="";let t=this.canvas.querySelector("defs");t||(t=document.createElementNS(this.svgNS,"defs"),this.canvas.insertBefore(t,this.canvas.firstChild));const e=this.canvas.getBoundingClientRect(),n=e.width/this.zoomLevel,s=e.height/this.zoomLevel,r=this.panX-n/2,o=this.panY-s/2;let a=this.config.gridSize;const l=1;a*this.zoomLevel<l&&(a=l/this.zoomLevel);const c=Math.max(.01,.1/Math.sqrt(this.zoomLevel)),h=10,u={id:"grid",size:this.config.gridSize,color:"#e0e0e0",thickness:c,anchorX:this.config.gridAnchorX-this.config.gridSize/2,anchorY:this.config.gridAnchorY-this.config.gridSize/2,panX:this.panX,panY:this.panY,x:r,y:o,width:n,height:s};new El(this.svgNS,t,this.gridLayer,u).render();const p={id:"aux-grid",size:h,color:"#5f5959ff",thickness:c*2,anchorX:this.config.gridAnchorX-this.config.gridSize/2,anchorY:this.config.gridAnchorY-this.config.gridSize/2,panX:this.panX,panY:this.panY,x:r,y:o,width:n,height:s};new El(this.svgNS,t,this.gridLayer,p).render()}toggleGrid(){this.gridEnabled=!this.gridEnabled,this.gridEnabled?this.drawGrid():this.gridLayer&&(this.gridLayer.innerHTML="")}zoomIn(){this.zoomLevel*=1.2,this.updateViewBox()}zoomOut(){this.zoomLevel/=1.2,this.updateViewBox()}fitToScale(t=null){zc(this,t)}fitToSVGElement(t,e=20){pu(this,t,e)}updateViewBox(){const t=this.canvas.getBoundingClientRect(),e=t.width/this.zoomLevel,n=t.height/this.zoomLevel,s=this.panX-e/2,r=this.panY-n/2;this.canvas.setAttribute("viewBox",`${s} ${r} ${e} ${n}`),this.gridEnabled&&this.drawGrid(),this.config.onZoom&&this.config.onZoom(this.zoomLevel,this.panX,this.panY)}handleZoom(t){t.preventDefault();const e=this.canvas.getBoundingClientRect(),n=t.clientX-e.left,s=t.clientY-e.top,r=t.deltaY>0?.9:1.1,o=this.zoomLevel;this.zoomLevel*=r;const a=e.width/o,l=e.height/o,c=this.panX-a/2,h=this.panY-l/2,u=c+n/e.width*a,d=h+s/e.height*l,p=e.width/this.zoomLevel,g=e.height/this.zoomLevel,x=u-n/e.width*p,m=d-s/e.height*g;this.panX=x+p/2,this.panY=m+g/2,this.updateViewBox(),this.config.onWheel&&this.config.onWheel(t,this.zoomLevel,this.panX,this.panY)}handleMouseDown(t){t.button===0&&this.config.enablePan&&(this.isDragging=!0,this.lastMouseX=t.clientX,this.lastMouseY=t.clientY,this.canvas.style.cursor="grabbing"),this.config.onMouseDown&&this.config.onMouseDown(t)}handleMouseMove(t){if(this.isDragging&&this.config.enablePan){const e=t.clientX-this.lastMouseX,n=t.clientY-this.lastMouseY,s=e/this.zoomLevel,r=n/this.zoomLevel;this.panX-=s,this.panY-=r,this.lastMouseX=t.clientX,this.lastMouseY=t.clientY,this.updateViewBox()}this.config.onMouseMove&&this.config.onMouseMove(t)}handleMouseUp(t){this.isDragging&&(this.isDragging=!1,this.canvas.style.cursor=this.config.enablePan?"grab":"default"),this.config.onMouseUp&&this.config.onMouseUp(t)}handleTouchStart(t){t.touches.length===1&&this.config.enablePan?(t.preventDefault(),this.isDragging=!0,this.lastMouseX=t.touches[0].clientX,this.lastMouseY=t.touches[0].clientY):t.touches.length===2&&this.config.enableZoom&&(t.preventDefault(),this.handlePinchStart(t))}handleTouchMove(t){if(this.isDragging&&t.touches.length===1&&this.config.enablePan){t.preventDefault();const e=t.touches[0].clientX-this.lastMouseX,n=t.touches[0].clientY-this.lastMouseY,s=e/this.zoomLevel,r=n/this.zoomLevel;this.panX-=s,this.panY-=r,this.lastMouseX=t.touches[0].clientX,this.lastMouseY=t.touches[0].clientY,this.updateViewBox()}else t.touches.length===2&&this.config.enableZoom&&(t.preventDefault(),this.handlePinchMove(t))}handleTouchEnd(t){this.isDragging&&(this.isDragging=!1),this.pinchStartDistance&&(this.pinchStartDistance=null,this.pinchStartZoom=null,this.pinchStartCenterX=null,this.pinchStartCenterY=null)}handlePinchStart(t){const e=t.touches[0],n=t.touches[1];this.pinchStartDistance=this.getTouchDistance(e,n),this.pinchStartZoom=this.zoomLevel,this.pinchStartCenterX=(e.clientX+n.clientX)/2,this.pinchStartCenterY=(e.clientY+n.clientY)/2}handlePinchMove(t){const e=t.touches[0],n=t.touches[1],s=this.getTouchDistance(e,n);if(this.pinchStartDistance&&this.pinchStartZoom){const r=s/this.pinchStartDistance;let o=this.pinchStartZoom*r;o=Math.max(.1,Math.min(10,o)),Math.abs(o-this.zoomLevel)>.01&&(this.zoomLevel=o,this.updateViewBox())}}getTouchDistance(t,e){const n=t.clientX-e.clientX,s=t.clientY-e.clientY;return Math.sqrt(n*n+s*s)}screenToSvg(t,e){const n=this.canvas.getBoundingClientRect(),s=t-n.left,r=e-n.top,o=n.width/this.zoomLevel,a=n.height/this.zoomLevel,l=this.panX-o/2,c=this.panY-a/2,h=l+s/n.width*o,u=c+r/n.height*a;return{x:h,y:u}}snapToGrid(t){return Math.round(t/this.config.gridSize)*this.config.gridSize}getLayer(t){return this.layers[t]}clearLayer(t){this.layers[t]&&(this.layers[t].innerHTML="")}addToLayer(t,e){this.layers[t]&&this.layers[t].appendChild(e)}removeFromLayer(t,e){this.layers[t]&&e.parentNode===this.layers[t]&&this.layers[t].removeChild(e)}updateCanvasSize(){var e,n;const t=this.canvas.parentElement;if(t){const s=t.clientWidth,r=t.clientHeight;this.canvasParameters={width:s>0?s:((e=this.canvasParameters)==null?void 0:e.width)||this.config.width||800,height:r>0?r:((n=this.canvasParameters)==null?void 0:n.height)||this.config.height||600}}else this.canvasParameters={width:this.config.width||800,height:this.config.height||600}}resize(){const t=this.canvasParameters.width,e=this.canvasParameters.height;this.updateCanvasSize(),this.panX=this.panX/t*this.canvasParameters.width,this.panY=this.panY/e*this.canvasParameters.height,this.updateViewBox()}}const be="http://www.w3.org/2000/svg";class Yo{constructor(t){this.canvasManager=t,this.bitGroups=document.getElementById("bit-groups"),this.CLIPPER_SCALE=1e3}createSVGIcon(t,e,n=50){const s=document.createElementNS(be,"svg");s.setAttribute("width",n),s.setAttribute("height",n),s.setAttribute("viewBox",`0 0 ${n} ${n}`);const r=document.createElementNS(be,"circle");r.setAttribute("cx",n/2),r.setAttribute("cy",n/2),r.setAttribute("r",n/2-1),r.setAttribute("fill","white"),r.setAttribute("stroke","black"),r.setAttribute("stroke-width","2"),s.appendChild(r);const o=document.createElementNS(be,"g");o.setAttribute("transform",`translate(${n/2}, ${n/2})`);let a;if(t!=="newBit"&&e&&e.diameter!==void 0)a=this.createBitShapeElement(e,t,0,e.length/2,!1,!1),a.setAttribute("transform",`scale(${n/80})`);else{const l=n/4;switch(t){case"cylindrical":a=document.createElementNS(be,"rect"),a.setAttribute("x",-n/4),a.setAttribute("y",-n/4),a.setAttribute("width",n/2),a.setAttribute("height",n/2);break;case"conical":a=document.createElementNS(be,"path"),a.setAttribute("d",`M ${-l} 0
                    L ${-l} ${-l}
                    L ${l} ${-l}
                    L ${l} 0
                    L 0 ${l}
                    Z`);break;case"ball":a=document.createElementNS(be,"path"),a.setAttribute("d",`M ${-l} 0
                    L ${-l} ${-l}
                    L ${l} ${-l}
                    L ${l} 0
                    A ${l} ${l} 0 0 1 0 ${l}
                    A ${l} ${l} 0 0 1 ${-l} 0
                    Z`);break;case"fillet":a=document.createElementNS(be,"path"),a.setAttribute("d",`M ${-l} ${l/4}
                    L ${-l} ${-l}
                    L ${l} ${-l}
                    L ${l} ${l/4}
                    A ${l} ${l} 0 0 0 ${l/4} ${l}
                    L ${-l/4} ${l}
                    A ${l} ${l} 0 0 0 ${-l} ${l/4}
                    Z`);break;case"bull":a=document.createElementNS(be,"path"),a.setAttribute("d",`M ${-l} ${l/2}
                    L ${-l} ${-l}
                    L ${l} ${-l}
                    L ${l} ${l/2}
                    A ${l/2} ${l/2} 0 0 1 ${l/2} ${l}
                    L ${-l/2} ${l}
                    A ${l/2} ${l/2} 0 0 1 ${-l} ${l/2}
                    Z`);break;case"newBit":a=document.createElementNS(be,"path"),a.setAttribute("d",`M0 ${-n/6}V${n/6}M${-n/6} 0H${n/6}`);break}if(a){const c=e!=null&&e.fillColor?this.getBitFillColor(e,!1):"white";a.setAttribute("fill",c),a.setAttribute("stroke","black"),a.setAttribute("stroke-width","2")}}return a&&o.appendChild(a),s.appendChild(o),s}createActionIcon(t){const e=document.createElementNS(be,"svg");e.setAttribute("width","15"),e.setAttribute("height","15"),e.setAttribute("viewBox","0 0 24 24");const n=document.createElementNS(be,"circle");n.setAttribute("cx","12"),n.setAttribute("cy","12"),n.setAttribute("r","11"),n.setAttribute("fill","white"),n.setAttribute("stroke-width","2");const s=document.createElementNS(be,"path");switch(s.setAttribute("fill","black"),t){case"edit":n.setAttribute("stroke","green"),s.setAttribute("d","M16.293 2.293l3.414 3.414-13 13-3.414-3.414 13-13zM18 10v8h-8v-8h8z");break;case"copy":n.setAttribute("stroke","orange"),s.setAttribute("d","M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z");break;case"remove":n.setAttribute("stroke","red"),s.setAttribute("d","M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z");break}return e.appendChild(n),e.appendChild(s),e}createBitShapeElement(t,e,n=0,s=0,r=!1,o=!0,a=1){const l=document.createElementNS(be,"g");let c,h={x:n+t.diameter/2,y:s-t.height},u={x:n-t.diameter/2,y:s-t.height},d=t.height/2+this.distancePtToPt(h,u)*this.distancePtToPt(h,u)/(8*t.height);const p=this.getBitFillColor(t,r);switch(e){case"cylindrical":c=document.createElementNS(be,"rect"),c.setAttribute("x",n-t.diameter/2),c.setAttribute("y",s-t.length),c.setAttribute("width",t.diameter),c.setAttribute("height",t.length),c.setAttribute("fill",p);break;case"conical":const g=t.angle,x=t.diameter,m=x/2*(1/Math.tan(this.angleToRad(g/2))),f=[`${n},${s}`,`${n-x/2},${s-m}`,`${n-x/2},${s-t.length}`,`${n+x/2},${s-t.length}`,`${n+x/2},${s-m}`].join(" ");c=document.createElementNS(be,"polygon"),c.setAttribute("points",f),c.setAttribute("fill",p);break;case"ball":c=document.createElementNS(be,"path"),c.setAttribute("d",`M ${n+t.diameter/2} ${s-t.height} A ${d} ${d} 0 0 1 ${n-t.diameter/2} ${s-t.height}
        L ${n-t.diameter/2} ${s-t.length}
        L ${n+t.diameter/2} ${s-t.length} Z`),c.setAttribute("fill",p);break;case"fillet":d=t.cornerRadius,c=document.createElementNS(be,"path"),c.setAttribute("d",`M ${n+t.diameter/2} ${s-t.height} A ${d} ${d} 0 0 0 ${n+t.flat/2} ${s}
        L ${n-t.flat/2} ${s}
        A ${d} ${d} 0 0 0 ${n-t.diameter/2} ${s-t.height}
        L ${n-t.diameter/2} ${s-t.length}
        L ${n+t.diameter/2} ${s-t.length} Z`),c.setAttribute("fill",p);break;case"bull":d=t.cornerRadius,c=document.createElementNS(be,"path"),c.setAttribute("d",`M ${n+t.diameter/2} ${s-t.height} A ${d} ${d} 0 0 1 ${n+t.flat/2} ${s}
        L ${n-t.flat/2} ${s}
        A ${d} ${d} 0 0 1 ${n-t.diameter/2} ${s-t.height}
        L ${n-t.diameter/2} ${s-t.length}
        L ${n+t.diameter/2} ${s-t.length} Z`),c.setAttribute("fill",p);break}if(c&&(c.setAttribute("stroke","black"),c.setAttribute("stroke-width",a),c.classList.add("bit-shape"),l.appendChild(c)),o&&t.shankDiameter&&t.totalLength&&t.totalLength>t.length){const g=t.totalLength-t.length,x=document.createElementNS(be,"rect");x.setAttribute("x",n-t.shankDiameter/2),x.setAttribute("y",s-t.totalLength),x.setAttribute("width",t.shankDiameter),x.setAttribute("height",g),x.setAttribute("fill","rgba(64, 64, 64, 0.1)"),x.setAttribute("stroke","black"),x.setAttribute("stroke-width",a),x.classList.add("shank-shape"),l.appendChild(x)}return l}getBitFillColor(t,e=!1){const n=t.fillColor;if(!n)return"rgba(204, 204, 204, 0.3)";let s,r,o;if(n.startsWith("rgba")){const l=n.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);l&&(s=parseInt(l[1]),r=parseInt(l[2]),o=parseInt(l[3]))}else if(n.startsWith("rgb")){const l=n.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);l&&(s=parseInt(l[1]),r=parseInt(l[2]),o=parseInt(l[3]))}else if(n.startsWith("#")){const l=n.slice(1);s=parseInt(l.slice(0,2),16),r=parseInt(l.slice(2,4),16),o=parseInt(l.slice(4,6),16)}return`rgba(${s}, ${r}, ${o}, ${e?.6:.3})`}distancePtToPt(t,e){return Math.sqrt((e.x-t.x)**2+(e.y-t.y)**2)}angleToRad(t){return t*Math.PI/180}async createBitGroups(){const t=await Ai();Object.keys(t).forEach(n=>{const s=(t[n]||[]).slice().sort((u,d)=>{const p=(u.diameter||0)-(d.diameter||0);return p!==0?p:(u.length||0)-(d.length||0)}),r=document.createElement("div");r.className="bit-group";const o=this.createSVGIcon(n);r.appendChild(o);const a=document.createElement("div");a.className="bit-list",s.forEach((u,d)=>{const p=document.createElement("div");p.className="bit";const g=document.createElement("span");g.textContent=u.name,p.appendChild(g);const x=this.createSVGIcon(n,u,40);p.appendChild(x);const m=document.createElement("div");m.className="action-icons",["edit","copy","remove"].forEach(f=>{const A=this.createActionIcon(f);A.addEventListener("click",async v=>{switch(v.stopPropagation(),f){case"edit":this.openBitModal(n,u);break;case"copy":await this.handleCopyClick(v,u),this.refreshBitGroups();break;case"remove":await this.handleDeleteClick(v,u),this.refreshBitGroups();break}}),m.appendChild(A)}),p.appendChild(m),p.addEventListener("click",()=>this.drawBitShape(u,n)),a.appendChild(p)});const l=document.createElement("div");l.className="bit add-bit";const c=document.createElement("span");c.textContent="New",l.appendChild(c);const h=this.createSVGIcon("newBit","newBit",40);l.appendChild(h),l.addEventListener("click",()=>this.openNewBitMenu(n)),a.appendChild(l),r.appendChild(a),r.addEventListener("mouseenter",u=>{const d=r.getBoundingClientRect();a.style.display="flex",a.style.left=d.right+5+"px",a.style.top=d.top+d.height/2+"px",a.style.transform="translateY(-50%)",r.getAttribute("data-after-element")}),r.addEventListener("mouseleave",u=>{setTimeout(()=>{a.matches(":hover")||(a.style.display="none")},100)}),a.addEventListener("mouseenter",()=>{a.style.display="flex"}),a.addEventListener("mouseleave",()=>{a.style.display="none"}),this.bitGroups.appendChild(r)})}async refreshBitGroups(){this.bitGroups.innerHTML="",await this.createBitGroups()}async handleCopyClick(t,e){const n=e.name,s=await Ai(),o=Object.values(s).flat().filter(h=>h.name.startsWith(`${n} (`)).reduce((h,u)=>{const d=u.name.match(/\((\d+)\)$/);return d?Math.max(h,parseInt(d[1],10)):h},0),a=`${n} (${o+1})`,l={...e,name:a};delete l.id;const c=await this.findBitGroupName(e);c&&Xo(c,l)}async handleDeleteClick(t,e){if(confirm(`Are you sure you want to delete ${e.name}?`)){const n=await this.findBitGroupName(e);n&&Hc(n,e.id)}}async isBitNameDuplicate(t,e=null){const n=await Ai();return Object.values(n||{}).flat().some(s=>s.name===t&&s.id!==e)}async findBitGroupName(t){const e=await Ai();for(const n in e)if(e[n].some(s=>s.id===t.id))return n;return null}collectBitParameters(t,e){var d,p;const n=t.querySelector("#bit-name").value.trim(),s=parseFloat(he(t.querySelector("#bit-diameter").value)),r=parseFloat(he(t.querySelector("#bit-length").value)),o=parseInt(he(t.querySelector("#bit-toolnumber").value),10),a=document.querySelector("#bit-color"),l=a?a.value:"#cccccc";let c={name:n,diameter:s,length:r,toolNumber:o,fillColor:l};const h=(d=t.querySelector("#bit-shankDiameter"))==null?void 0:d.value;if(h){const g=parseFloat(he(h));isNaN(g)||(c.shankDiameter=g)}const u=(p=t.querySelector("#bit-totalLength"))==null?void 0:p.value;if(u){const g=parseFloat(he(u));isNaN(g)||(c.totalLength=g)}return e==="conical"&&(c.angle=parseFloat(he(t.querySelector("#bit-angle").value))),e==="ball"&&(c.height=parseFloat(he(t.querySelector("#bit-height").value))),(e==="fillet"||e==="bull")&&(c.height=parseFloat(he(t.querySelector("#bit-height").value)),c.cornerRadius=parseFloat(he(t.querySelector("#bit-cornerRadius").value)),c.flat=parseFloat(he(t.querySelector("#bit-flat").value))),c}validateBitParameters(t,e){var a,l,c,h,u,d,p,g;if(!t.querySelector("#bit-name").value.trim()||!((a=t.querySelector("#bit-diameter"))==null?void 0:a.value)||!((l=t.querySelector("#bit-length"))==null?void 0:l.value)||!((c=t.querySelector("#bit-toolnumber"))==null?void 0:c.value)||e==="conical"&&!((h=t.querySelector("#bit-angle"))==null?void 0:h.value)||e==="ball"&&!((u=t.querySelector("#bit-height"))==null?void 0:u.value))return!1;if(e==="fillet"||e==="bull"){const x=(d=t.querySelector("#bit-height"))==null?void 0:d.value,m=(p=t.querySelector("#bit-cornerRadius"))==null?void 0:p.value,f=(g=t.querySelector("#bit-flat"))==null?void 0:g.value;if(!x||!m||!f)return!1}return!0}buildBitPayload(t,e){var u,d;const n=parseFloat(he(t.querySelector("#bit-diameter").value)),s=parseFloat(he(t.querySelector("#bit-length").value)),r=parseInt(he(t.querySelector("#bit-toolnumber").value),10)||1,o=document.querySelector("#bit-color"),a=o?o.value:"#cccccc",l={name:t.querySelector("#bit-name").value.trim(),diameter:n,length:s,toolNumber:r,fillColor:a},c=(u=t.querySelector("#bit-shankDiameter"))==null?void 0:u.value;if(c){const p=parseFloat(he(c));isNaN(p)||(l.shankDiameter=p)}const h=(d=t.querySelector("#bit-totalLength"))==null?void 0:d.value;if(h){const p=parseFloat(he(h));isNaN(p)||(l.totalLength=p)}if(e==="conical"){const p=parseFloat(he(t.querySelector("#bit-angle").value));l.angle=p}if(e==="ball"){const p=parseFloat(he(t.querySelector("#bit-height").value));l.height=p}if(e==="fillet"||e==="bull"){const p=parseFloat(he(t.querySelector("#bit-height").value));l.height=p;const g=parseFloat(he(t.querySelector("#bit-cornerRadius").value));l.cornerRadius=g;const x=parseFloat(he(t.querySelector("#bit-flat").value));l.flat=x}return l}openNewBitMenu(t){this.openBitModal(t,null)}openBitModal(t,e=null){const n=!!e,s=e&&e.toolNumber!==void 0?e.toolNumber:1,r=e?e.diameter:"",o=e?e.length:"",a=e?e.angle:"",l=e?e.height:"",c=e?e.cornerRadius:"",h=e?e.flat:"",u=e?e.shankDiameter:"",d=e?e.totalLength:"",p=e&&e.fillColor?e.fillColor:"#cccccc",g=e?e.name:"",x=document.createElement("div");x.className="modal",x.innerHTML=`
    <div class="modal-content">
      <h2>${n?"Edit Bit":"New Bit Parameters"}</h2>
      <div class="modal-body">
        <form id="bit-form" class="bit-form">
          <label for="bit-name">Name:</label>
          <input type="text" id="bit-name" required value="${g}">
          ${this.getGroupSpecificInputs(t,{diameter:r,length:o,shankDiameter:u,totalLength:d,angle:a,height:l,cornerRadius:c,flat:h})}
          
          <label for="bit-toolnumber">Tool Number:</label>
          <input type="number" id="bit-toolnumber" min="1" step="1" value="${s}" required>
        </form>
        <div id="bit-preview" class="bit-preview">
          <svg id="bit-preview-canvas" width="200" height="200"></svg>
          <div id="preview-toolbar">
          <button id="preview-zoom-in" title="Zoom In">+</button>
          <button id="preview-zoom-out" title="Zoom Out">-</button>
          <button id="preview-fit" title="Fit to Scale">Fit</button>
          <button id="preview-toggle-grid" title="Toggle Grid">Grid</button>
          <input type="color" id="bit-color" value="${p}" title="Bit Color">
          </div>
        </div>

        </div>
    <div class="button-group">
        <button type="button" id="cancel-btn">Cancel</button>
        <button type="submit" form="bit-form">OK</button>
    </div>
    </div>
  `,document.body.appendChild(x);const m=x.querySelector("#bit-form");let f,A=!1;const v=()=>{f=new Wc({canvas:x.querySelector("#bit-preview-canvas"),width:200,height:200,enableZoom:!0,enablePan:!0,enableGrid:!0,enableMouseEvents:!0,gridSize:10,initialZoom:1,initialPanX:100,initialPanY:100,layers:["grid","bits"],onZoom:Y=>{I(Y)}})},S=()=>{f.zoomIn(),y()},w=()=>{f.zoomOut(),y()},R=()=>{if(this.validateBitParameters(m,t)){const Y=this.collectBitParameters(m,t),j=this.createBitShapeElement(Y,t,0,0,!0);Wo(j),f.fitToSVGElement(j,5)}else f.zoomLevel=1,f.panX=100,f.panY=100,f.updateViewBox();I(),y()},P=()=>{f.toggleGrid()};v();function I(Y=f==null?void 0:f.zoomLevel){if(!Y||!f)return;const j=Math.max(.1,.5/Math.sqrt(Y)),Z=f.getLayer("bits"),O=Z==null?void 0:Z.querySelector(".bit-shape"),z=Z==null?void 0:Z.querySelector(".shank-shape");O&&O.setAttribute("stroke-width",j),z&&z.setAttribute("stroke-width",j)}const y=()=>{const Y=f.getLayer("bits");if(Y.innerHTML="",!this.validateBitParameters(m,t)){const at=document.createElementNS(be,"text");at.setAttribute("x",f.panX),at.setAttribute("y",f.panY+10),at.setAttribute("text-anchor","middle"),at.setAttribute("font-size","14"),at.setAttribute("fill","#999"),at.textContent="Заполните все параметры",Y.appendChild(at);return}const j=this.collectBitParameters(m,t),Z=this.createBitShapeElement(j,t,0,0,!0),O=Wo(Z);if(!A){const Gt=160/O.width,Yt=160/O.height,$=Math.min(Gt,Yt);f.zoomLevel=$,f.updateViewBox(),A=!0}const z=Math.max(.1,.5/Math.sqrt(f.zoomLevel)),pt=this.createBitShapeElement(j,t,f.panX-O.centerX,f.panY-O.centerY,!0,!0,z);Y.appendChild(pt)};if(x.querySelector("#preview-zoom-in").addEventListener("click",()=>{S(),y()}),x.querySelector("#preview-zoom-out").addEventListener("click",()=>{w(),y()}),x.querySelector("#preview-fit").addEventListener("click",()=>{R()}),x.querySelector("#preview-toggle-grid").addEventListener("click",()=>{P()}),m.querySelectorAll('input[type="text"]').forEach(Y=>{Y.addEventListener("blur",()=>{Y.value=he(Y.value)}),Y.addEventListener("input",y)}),m.querySelectorAll('input[type="number"]').forEach(Y=>{Y.addEventListener("input",y),R()}),x.querySelector("#bit-color").addEventListener("input",y),n&&e){const Y=()=>{const O=this.collectBitParameters(m,t);this.onUpdateCanvasBitWithParams&&this.onUpdateCanvasBitWithParams(e.id,O,t)},j=m.querySelectorAll('input[type="text"], input[type="number"]'),Z=x.querySelector("#bit-color");j.forEach(O=>{O.addEventListener("input",Y)}),Z&&Z.addEventListener("input",Y)}y(),R(),m.addEventListener("submit",async Y=>{Y.preventDefault();const j=m.querySelector("#bit-name").value.trim();if(await this.isBitNameDuplicate(j,n?e==null?void 0:e.id:null)){alert("A bit with this name already exists. Please choose a different name.");return}const Z=this.buildBitPayload(m,t);let O;n?O=Gc(t,e.id,Z):O=Xo(t,Z),n&&this.updateCanvasBitsForBitId(O.id),document.body.removeChild(x),this.refreshBitGroups()}),x.querySelector("#cancel-btn").addEventListener("click",()=>{document.body.removeChild(x)})}getGroupSpecificInputs(t,e={}){const n=e.diameter!==void 0?e.diameter:"",s=e.length!==void 0?e.length:"",r=e.angle!==void 0?e.angle:"",o=e.height!==void 0?e.height:"",a=e.cornerRadius!==void 0?e.cornerRadius:"",l=e.flat!==void 0?e.flat:"",c=e.shankDiameter!==void 0?e.shankDiameter:"",h=e.totalLength!==void 0?e.totalLength:"";let u=`
        <label for="bit-diameter">Diameter:</label>
        <input type="text" id="bit-diameter" required value="${n}">
        <label for="bit-length">Length:</label>
        <input type="text" id="bit-length" required value="${s}">
        <label for="bit-shankDiameter">Shank Diameter:</label>
        <input type="text" id="bit-shankDiameter" value="${c}">
        <label for="bit-totalLength">Total Length:</label>
        <input type="text" id="bit-totalLength" value="${h}">
    `;return t==="conical"&&(u+=`
        <label for="bit-angle">Angle:</label>
        <input type="text" id="bit-angle" required value="${r}">
        `),t==="ball"&&(u+=`
        <label for="bit-height">Height:</label>
        <input type="text" id="bit-height" required value="${o}">
        `),(t==="fillet"||t==="bull")&&(u+=`
        <label for="bit-height">Height:</label>
        <input type="text" id="bit-height" required value="${o}">
        <label for="bit-cornerRadius">Corner Radius:</label>
        <input type="text" id="bit-cornerRadius" required value="${a}">
        <label for="bit-flat">Flat:</label>
        <input type="text" id="bit-flat" required value="${l}">
        `),u}drawBitShape(t,e){this.onDrawBitShape&&this.onDrawBitShape(t,e)}updateCanvasBitsForBitId(t){this.onUpdateCanvasBits&&this.onUpdateCanvasBits(t)}assignProfilePathsToBits(t){t.forEach(e=>{const n=e.bitData,r=this.createBitShapeElement(n,e.groupName,0,0,!1,!1).querySelector(".bit-shape");let o="";if(r)if(r.tagName==="rect"){const a=parseFloat(r.getAttribute("x")),l=parseFloat(r.getAttribute("y")),c=parseFloat(r.getAttribute("width")),h=parseFloat(r.getAttribute("height"));!isNaN(a)&&!isNaN(l)&&!isNaN(c)&&!isNaN(h)&&(o=`M ${a} ${l} L ${a+c} ${l} L ${a+c} ${l+h} L ${a} ${l+h} Z`)}else if(r.tagName==="polygon"){const a=r.getAttribute("points");if(a){const l=a.trim().split(/\s+/).filter(c=>c.includes(","));l.length>0&&(o="M "+l.join(" L ")+" Z")}}else r.tagName==="path"&&(o=r.getAttribute("d")||"");o&&(o=this.invertYInPath(o),o.trim().endsWith("Z")||(o+=" Z")),e.bitData||(e.bitData={}),e.bitData.profilePath=o})}invertYInPath(t){const e=t.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi),n=[];return e.forEach(s=>{const r=s[0].toUpperCase(),o=s.slice(1).trim().split(/[\s,]+/).map(Number).filter(l=>!isNaN(l));n.push(r);let a=0;for(;a<o.length;)if(r==="M"||r==="L"||r==="T")n.push(o[a],-o[a+1]),a+=2;else if(r==="H")n.push(o[a]),a+=1;else if(r==="V")n.push(-o[a]),a+=1;else if(r==="C")n.push(o[a],-o[a+1],o[a+2],-o[a+3],o[a+4],-o[a+5]),a+=6;else if(r==="S"||r==="Q")n.push(o[a],-o[a+1],o[a+2],-o[a+3]),a+=4;else if(r==="A"){const l=1-o[a+4];n.push(o[a],o[a+1],o[a+2],o[a+3],l,o[a+5],-o[a+6]),a+=7}else{if(r==="Z")break;n.push(...o.slice(a));break}}),n.join(" ")}}class yu{constructor(){this.listeners={}}on(t,e){this.listeners[t]||(this.listeners[t]=[]),this.listeners[t].push(e)}off(t,e){if(!this.listeners[t])return;const n=this.listeners[t].indexOf(e);n!==-1&&this.listeners[t].splice(n,1)}emit(t,...e){if(!this.listeners[t])return;const n=[...this.listeners[t]];for(const s of n)try{s(...e)}catch(r){console.error(`Error in event callback for ${t}:`,r)}}once(t,e){const n=(...s)=>{e(...s),this.off(t,n)};this.on(t,n)}clear(t){this.listeners[t]=[]}clearAll(){this.listeners={}}}const Xc=new yu;class qs{constructor(t){this.name=t,this.initialized=!1,this.eventBus=Xc}async initialize(){if(this.initialized){console.warn(`Module ${this.name} already initialized`);return}console.log(`Initializing module ${this.name}...`),this.setupEventListeners(),this.initialized=!0,this.eventBus.emit(`module:${this.name}:initialized`),console.log(`Module ${this.name} initialized`)}setupEventListeners(){}async shutdown(){if(!this.initialized){console.warn(`Module ${this.name} not initialized`);return}console.log(`Shutting down module ${this.name}...`),this.cleanupEventListeners(),this.initialized=!1,this.eventBus.emit(`module:${this.name}:shutdown`),console.log(`Module ${this.name} shut down`)}cleanupEventListeners(){}getName(){return this.name}isInitialized(){return this.initialized}}class Su extends qs{constructor(){super("export"),this.dxfExporter=new Mu}initialize(){return super.initialize(),console.log("ExportModule initialized"),Promise.resolve()}exportToDXF(t,e,n,s,r){return this.dxfExporter.exportToDXF(t,e,n,s,r)}downloadDXF(t,e="facade_design.dxf"){this.dxfExporter.downloadDXF(t,e)}}require("makerjs");class Mu{constructor(){this.dxfContent=[],this.handleCounter=256}exportToDXF(t,e,n,s,r){return this.dxfContent=[],this.writeHeader(),this.writeClasses(),this.writeTables(t,n,s,r),this.writeBlocks(),this.writeEntities(t,e,n,s,r),this.writeObjects(),this.writeEOF(),this.dxfContent.join(`
`)}writeHeader(){this.dxfContent.push("0"),this.dxfContent.push("SECTION"),this.dxfContent.push("2"),this.dxfContent.push("HEADER"),this.dxfContent.push("9"),this.dxfContent.push("$ACADVER"),this.dxfContent.push("1"),this.dxfContent.push("AC1021"),this.dxfContent.push("9"),this.dxfContent.push("$DWGCODEPAGE"),this.dxfContent.push("3"),this.dxfContent.push("ANSI_1251"),this.dxfContent.push("9"),this.dxfContent.push("$INSBASE"),this.dxfContent.push("10"),this.dxfContent.push("0.0"),this.dxfContent.push("20"),this.dxfContent.push("0.0"),this.dxfContent.push("30"),this.dxfContent.push("0.0"),this.dxfContent.push("9"),this.dxfContent.push("$EXTMIN"),this.dxfContent.push("10"),this.dxfContent.push("0.0"),this.dxfContent.push("20"),this.dxfContent.push("0.0"),this.dxfContent.push("30"),this.dxfContent.push("0.0"),this.dxfContent.push("9"),this.dxfContent.push("$EXTMAX"),this.dxfContent.push("10"),this.dxfContent.push("1000.0"),this.dxfContent.push("20"),this.dxfContent.push("1000.0"),this.dxfContent.push("30"),this.dxfContent.push("0.0"),this.dxfContent.push("9"),this.dxfContent.push("$LIMMIN"),this.dxfContent.push("10"),this.dxfContent.push("0.0"),this.dxfContent.push("20"),this.dxfContent.push("0.0"),this.dxfContent.push("9"),this.dxfContent.push("$LIMMAX"),this.dxfContent.push("10"),this.dxfContent.push("420.0"),this.dxfContent.push("20"),this.dxfContent.push("297.0"),this.dxfContent.push("0"),this.dxfContent.push("ENDSEC")}writeClasses(){this.dxfContent.push("0"),this.dxfContent.push("SECTION"),this.dxfContent.push("2"),this.dxfContent.push("CLASSES"),this.dxfContent.push("0"),this.dxfContent.push("ENDSEC")}writeTables(t,e,n,s){this.dxfContent.push("0"),this.dxfContent.push("SECTION"),this.dxfContent.push("2"),this.dxfContent.push("TABLES");let r=t.length+2;if(e&&r++,n&&(r+=n.length),this.dxfContent.push("0"),this.dxfContent.push("TABLE"),this.dxfContent.push("2"),this.dxfContent.push("LAYER"),this.dxfContent.push("70"),this.dxfContent.push(r.toString()),this.writeLayer("Default",0,0,0,0),e){const o=`CUT_${s}MM_OU`;this.writeLayer(o,0,0,0,0)}n&&n.forEach((o,a)=>{const l=t[o.bitIndex];if(l){let c=o.depth!==void 0?o.depth:l.y,h=c.toString();c%1!==0?h=`_${h.replace(".","_")}`:h=`${c}`;const u=`${l.name}_${h}MM_${l.operation}`,d=this.colorToDXFIndex(l.color);this.writeLayer(u,d,0,0,0)}}),t.forEach((o,a)=>{const l="Default",c=this.colorToDXFIndex(o.color);this.writeLayer(l,c,0,0,0)}),this.dxfContent.push("0"),this.dxfContent.push("ENDTAB"),this.addBLOCKRECORDTable(),this.addLTYPETable(),this.addSTYLETable(),this.addVPORTTable(),this.addEmptyTable("VIEW"),this.addEmptyTable("UCS"),this.addAPPIDTable(),this.addDIMSTYLETable(),this.dxfContent.push("0"),this.dxfContent.push("ENDSEC")}writeLayer(t,e,n=0,s=0,r=0){const o=this.getNextHandle();if(this.dxfContent.push("0"),this.dxfContent.push("LAYER"),this.dxfContent.push("5"),this.dxfContent.push(o),this.dxfContent.push("100"),this.dxfContent.push("AcDbSymbolTableRecord"),this.dxfContent.push("100"),this.dxfContent.push("AcDbLayerTableRecord"),this.dxfContent.push("2"),this.dxfContent.push(t),this.dxfContent.push("70"),this.dxfContent.push(r.toString()),e&&typeof e=="object"&&e.r!==void 0){const a=e.r*256*256+e.g*256+e.b;this.dxfContent.push("420"),this.dxfContent.push(a.toString())}else this.dxfContent.push("62"),this.dxfContent.push((e||7).toString());this.dxfContent.push("6"),this.dxfContent.push("CONTINUOUS"),this.dxfContent.push("290"),this.dxfContent.push("1"),this.dxfContent.push("390"),this.dxfContent.push("0")}addLTYPETable(){this.dxfContent.push("0"),this.dxfContent.push("TABLE"),this.dxfContent.push("2"),this.dxfContent.push("LTYPE"),this.dxfContent.push("70"),this.dxfContent.push("1");const t=this.getNextHandle();this.dxfContent.push("0"),this.dxfContent.push("LTYPE"),this.dxfContent.push("5"),this.dxfContent.push(t),this.dxfContent.push("100"),this.dxfContent.push("AcDbSymbolTableRecord"),this.dxfContent.push("100"),this.dxfContent.push("AcDbLinetypeTableRecord"),this.dxfContent.push("2"),this.dxfContent.push("CONTINUOUS"),this.dxfContent.push("70"),this.dxfContent.push("0"),this.dxfContent.push("3"),this.dxfContent.push(""),this.dxfContent.push("72"),this.dxfContent.push("65"),this.dxfContent.push("73"),this.dxfContent.push("0"),this.dxfContent.push("40"),this.dxfContent.push("0.0"),this.dxfContent.push("0"),this.dxfContent.push("ENDTAB")}addSTYLETable(){this.dxfContent.push("0"),this.dxfContent.push("TABLE"),this.dxfContent.push("2"),this.dxfContent.push("STYLE"),this.dxfContent.push("70"),this.dxfContent.push("1");const t=this.getNextHandle();this.dxfContent.push("0"),this.dxfContent.push("STYLE"),this.dxfContent.push("5"),this.dxfContent.push(t),this.dxfContent.push("100"),this.dxfContent.push("AcDbSymbolTableRecord"),this.dxfContent.push("100"),this.dxfContent.push("AcDbTextStyleTableRecord"),this.dxfContent.push("2"),this.dxfContent.push("STANDARD"),this.dxfContent.push("70"),this.dxfContent.push("0"),this.dxfContent.push("40"),this.dxfContent.push("0.0"),this.dxfContent.push("41"),this.dxfContent.push("1.0"),this.dxfContent.push("50"),this.dxfContent.push("0.0"),this.dxfContent.push("71"),this.dxfContent.push("0"),this.dxfContent.push("42"),this.dxfContent.push("2.5"),this.dxfContent.push("3"),this.dxfContent.push("txt"),this.dxfContent.push("4"),this.dxfContent.push(""),this.dxfContent.push("0"),this.dxfContent.push("ENDTAB")}addAPPIDTable(){this.dxfContent.push("0"),this.dxfContent.push("TABLE"),this.dxfContent.push("2"),this.dxfContent.push("APPID"),this.dxfContent.push("70"),this.dxfContent.push("2");const t=this.getNextHandle();this.dxfContent.push("0"),this.dxfContent.push("APPID"),this.dxfContent.push("5"),this.dxfContent.push(t),this.dxfContent.push("100"),this.dxfContent.push("AcDbSymbolTableRecord"),this.dxfContent.push("100"),this.dxfContent.push("AcDbRegAppTableRecord"),this.dxfContent.push("2"),this.dxfContent.push("ACAD"),this.dxfContent.push("70"),this.dxfContent.push("0");const e=this.getNextHandle();this.dxfContent.push("0"),this.dxfContent.push("APPID"),this.dxfContent.push("5"),this.dxfContent.push(e),this.dxfContent.push("100"),this.dxfContent.push("AcDbSymbolTableRecord"),this.dxfContent.push("100"),this.dxfContent.push("AcDbRegAppTableRecord"),this.dxfContent.push("2"),this.dxfContent.push("Rhino"),this.dxfContent.push("70"),this.dxfContent.push("0"),this.dxfContent.push("0"),this.dxfContent.push("ENDTAB")}addBLOCKRECORDTable(){this.dxfContent.push("0"),this.dxfContent.push("TABLE"),this.dxfContent.push("2"),this.dxfContent.push("BLOCK_RECORD"),this.dxfContent.push("70"),this.dxfContent.push("2"),this.dxfContent.push("0"),this.dxfContent.push("BLOCK_RECORD"),this.dxfContent.push("2"),this.dxfContent.push("*MODEL_SPACE"),this.dxfContent.push("0"),this.dxfContent.push("BLOCK_RECORD"),this.dxfContent.push("2"),this.dxfContent.push("*PAPER_SPACE"),this.dxfContent.push("0"),this.dxfContent.push("ENDTAB")}addVPORTTable(){this.dxfContent.push("0"),this.dxfContent.push("TABLE"),this.dxfContent.push("2"),this.dxfContent.push("VPORT"),this.dxfContent.push("70"),this.dxfContent.push("1"),this.dxfContent.push("0"),this.dxfContent.push("VPORT"),this.dxfContent.push("2"),this.dxfContent.push("*ACTIVE"),this.dxfContent.push("70"),this.dxfContent.push("0"),this.dxfContent.push("10"),this.dxfContent.push("0.0"),this.dxfContent.push("20"),this.dxfContent.push("0.0"),this.dxfContent.push("11"),this.dxfContent.push("1.0"),this.dxfContent.push("21"),this.dxfContent.push("1.0"),this.dxfContent.push("12"),this.dxfContent.push("400.0"),this.dxfContent.push("22"),this.dxfContent.push("-295.0"),this.dxfContent.push("32"),this.dxfContent.push("0.0"),this.dxfContent.push("13"),this.dxfContent.push("0.0"),this.dxfContent.push("23"),this.dxfContent.push("0.0"),this.dxfContent.push("14"),this.dxfContent.push("1.0"),this.dxfContent.push("24"),this.dxfContent.push("1.0"),this.dxfContent.push("15"),this.dxfContent.push("1.0"),this.dxfContent.push("25"),this.dxfContent.push("1.0"),this.dxfContent.push("16"),this.dxfContent.push("0.0"),this.dxfContent.push("26"),this.dxfContent.push("0.0"),this.dxfContent.push("36"),this.dxfContent.push("1.0"),this.dxfContent.push("17"),this.dxfContent.push("0.0"),this.dxfContent.push("27"),this.dxfContent.push("1.0"),this.dxfContent.push("37"),this.dxfContent.push("0.0"),this.dxfContent.push("40"),this.dxfContent.push("200.0"),this.dxfContent.push("41"),this.dxfContent.push("2.0"),this.dxfContent.push("42"),this.dxfContent.push("50.0"),this.dxfContent.push("43"),this.dxfContent.push("0.0"),this.dxfContent.push("44"),this.dxfContent.push("0.0"),this.dxfContent.push("50"),this.dxfContent.push("0.0"),this.dxfContent.push("51"),this.dxfContent.push("0.0"),this.dxfContent.push("71"),this.dxfContent.push("0"),this.dxfContent.push("72"),this.dxfContent.push("100"),this.dxfContent.push("73"),this.dxfContent.push("1"),this.dxfContent.push("74"),this.dxfContent.push("1"),this.dxfContent.push("75"),this.dxfContent.push("0"),this.dxfContent.push("76"),this.dxfContent.push("0"),this.dxfContent.push("77"),this.dxfContent.push("0"),this.dxfContent.push("78"),this.dxfContent.push("0"),this.dxfContent.push("0"),this.dxfContent.push("ENDTAB")}addDIMSTYLETable(){this.dxfContent.push("0"),this.dxfContent.push("TABLE"),this.dxfContent.push("2"),this.dxfContent.push("DIMSTYLE"),this.dxfContent.push("70"),this.dxfContent.push("1"),this.dxfContent.push("0"),this.dxfContent.push("DIMSTYLE"),this.dxfContent.push("2"),this.dxfContent.push("STANDARD"),this.dxfContent.push("70"),this.dxfContent.push("0"),this.dxfContent.push("3"),this.dxfContent.push(""),this.dxfContent.push("40"),this.dxfContent.push("1.0"),this.dxfContent.push("41"),this.dxfContent.push("0.18"),this.dxfContent.push("42"),this.dxfContent.push("0.0625"),this.dxfContent.push("44"),this.dxfContent.push("0.18"),this.dxfContent.push("47"),this.dxfContent.push("0.0"),this.dxfContent.push("48"),this.dxfContent.push("0.0"),this.dxfContent.push("73"),this.dxfContent.push("1"),this.dxfContent.push("74"),this.dxfContent.push("1"),this.dxfContent.push("75"),this.dxfContent.push("0"),this.dxfContent.push("76"),this.dxfContent.push("0"),this.dxfContent.push("77"),this.dxfContent.push("0"),this.dxfContent.push("278"),this.dxfContent.push("2"),this.dxfContent.push("279"),this.dxfContent.push("46"),this.dxfContent.push("281"),this.dxfContent.push("0"),this.dxfContent.push("282"),this.dxfContent.push("0"),this.dxfContent.push("271"),this.dxfContent.push("4"),this.dxfContent.push("276"),this.dxfContent.push("0"),this.dxfContent.push("0"),this.dxfContent.push("ENDTAB")}addEmptyTable(t){this.dxfContent.push("0"),this.dxfContent.push("TABLE"),this.dxfContent.push("2"),this.dxfContent.push(t),this.dxfContent.push("70"),this.dxfContent.push("0"),this.dxfContent.push("0"),this.dxfContent.push("ENDTAB")}writeBlocks(){this.dxfContent.push("0"),this.dxfContent.push("SECTION"),this.dxfContent.push("2"),this.dxfContent.push("BLOCKS"),this.dxfContent.push("0"),this.dxfContent.push("ENDSEC")}writeEntities(t,e,n,s,r){this.dxfContent.push("0"),this.dxfContent.push("SECTION"),this.dxfContent.push("2"),this.dxfContent.push("ENTITIES"),n&&this.writePartFront(n,r),s&&s.forEach((o,a)=>{this.writeOffsetContour(o,t)}),this.writeResultPolygon(e,"Default"),t.forEach((o,a)=>{this.writeBitShape(o,a)}),this.dxfContent.push("0"),this.dxfContent.push("ENDSEC")}writeBitShape(t,e){const n="Default",s=t.group.getAttribute("transform");let r=0,o=0;if(s){const c=s.match(/translate\(([^,]+),\s*([^)]+)\)/);c&&(r=parseFloat(c[1]),o=parseFloat(c[2]))}const a=t.group.querySelector(".bit-shape");if(!a)return;const l=c=>-c;this.writeSVGShape(a,r,o,n,l),this.addBitXDATA(t)}addBitXDATA(t){this.dxfContent.push("1001"),this.dxfContent.push("Rhino"),this.dxfContent.push("1002"),this.dxfContent.push("{"),this.dxfContent.push("1000"),this.dxfContent.push("Name"),this.dxfContent.push("1000"),this.dxfContent.push(t.name),this.dxfContent.push("1002"),this.dxfContent.push("}")}writePartFront(t,e){const n=`CUT_${e}MM_OU`,s=r=>-r;this.writeSVGRect(t,0,0,n,s)}writeOffsetContour(t,e){const n=e[t.bitIndex];if(!n)return;let s=t.depth!==void 0?t.depth:n.y,r=s.toString();s%1!==0?r=`_${r.replace(".","_")}`:r=`${s}`;let o=`${n.name}_${r}MM_${n.operation}`;t.pass===0&&(o="Default");const a=l=>-l;this.writeSVGPath(t.element,0,0,o,a)}writeSVGShape(t,e,n,s,r){const o=t.tagName.toLowerCase();switch(o){case"rect":this.writeSVGRect(t,e,n,s,r);break;case"polygon":this.writeSVGPolygon(t,e,n,s,r);break;case"path":this.writeSVGPath(t,e,n,s,r);break;case"circle":this.writeSVGCircle(t,e,n,s,r);break;default:console.warn(`Unsupported SVG element type: ${o}`)}}writeSVGRect(t,e,n,s,r){const o=parseFloat(t.getAttribute("x")||0)+e,a=parseFloat(t.getAttribute("y")||0)+n,l=parseFloat(t.getAttribute("width")||0),c=parseFloat(t.getAttribute("height")||0),h=o,u=r(a),d=o+l,p=r(a+c),g=this.getNextHandle();this.dxfContent.push("0"),this.dxfContent.push("LWPOLYLINE"),this.dxfContent.push("5"),this.dxfContent.push(g),this.dxfContent.push("100"),this.dxfContent.push("AcDbEntity"),this.dxfContent.push("8"),this.dxfContent.push(s),this.dxfContent.push("6"),this.dxfContent.push("BYLAYER"),this.dxfContent.push("62"),this.dxfContent.push("256"),this.dxfContent.push("370"),this.dxfContent.push("-1"),this.dxfContent.push("100"),this.dxfContent.push("AcDbPolyline"),this.dxfContent.push("90"),this.dxfContent.push("4"),this.dxfContent.push("70"),this.dxfContent.push("1"),this.dxfContent.push("10"),this.dxfContent.push(h.toString()),this.dxfContent.push("20"),this.dxfContent.push(u.toString()),this.dxfContent.push("10"),this.dxfContent.push(d.toString()),this.dxfContent.push("20"),this.dxfContent.push(u.toString()),this.dxfContent.push("10"),this.dxfContent.push(d.toString()),this.dxfContent.push("20"),this.dxfContent.push(p.toString()),this.dxfContent.push("10"),this.dxfContent.push(h.toString()),this.dxfContent.push("20"),this.dxfContent.push(p.toString())}writeSVGPolygon(t,e,n,s,r){const a=(t.getAttribute("points")||"").trim().split(/\s+/).map(h=>{const[u,d]=h.split(",").map(Number);return{x:u+e,y:r(d+n)}});if(a.length<3)return;const l=this.ensureCounterClockwise(a),c=this.getNextHandle();this.dxfContent.push("0"),this.dxfContent.push("LWPOLYLINE"),this.dxfContent.push("5"),this.dxfContent.push(c),this.dxfContent.push("100"),this.dxfContent.push("AcDbEntity"),this.dxfContent.push("8"),this.dxfContent.push(s),this.dxfContent.push("6"),this.dxfContent.push("BYLAYER"),this.dxfContent.push("62"),this.dxfContent.push("256"),this.dxfContent.push("370"),this.dxfContent.push("-1"),this.dxfContent.push("100"),this.dxfContent.push("AcDbPolyline"),this.dxfContent.push("90"),this.dxfContent.push(l.length.toString()),this.dxfContent.push("70"),this.dxfContent.push("1"),l.forEach(h=>{this.dxfContent.push("10"),this.dxfContent.push(h.x.toString()),this.dxfContent.push("20"),this.dxfContent.push(h.y.toString())})}writeSVGPath(t,e,n,s,r){const o=t.getAttribute("d")||"",a=this.parseSVGPathSegments(o,e,n,r);a.length>0&&this.writePathAsPolyline(a,s)}writeSVGCircle(t,e,n,s,r){const o=parseFloat(t.getAttribute("cx")||0)+e,a=parseFloat(t.getAttribute("cy")||0)+n,l=parseFloat(t.getAttribute("r")||0),c=this.getNextHandle();this.dxfContent.push("0"),this.dxfContent.push("CIRCLE"),this.dxfContent.push("5"),this.dxfContent.push(c),this.dxfContent.push("100"),this.dxfContent.push("AcDbEntity"),this.dxfContent.push("8"),this.dxfContent.push(s),this.dxfContent.push("6"),this.dxfContent.push("BYLAYER"),this.dxfContent.push("62"),this.dxfContent.push("256"),this.dxfContent.push("370"),this.dxfContent.push("-1"),this.dxfContent.push("100"),this.dxfContent.push("AcDbCircle"),this.dxfContent.push("10"),this.dxfContent.push(o.toString()),this.dxfContent.push("20"),this.dxfContent.push(r(a).toString()),this.dxfContent.push("30"),this.dxfContent.push("0.0"),this.dxfContent.push("40"),this.dxfContent.push(l.toString())}writeResultPolygon(t,e="Default"){if(!t)return;const n=t.getAttribute("transform")||"";let s=0,r=0;if(n){const a=n.match(/translate\(([^,]+),\s*([^)]+)\)/);a&&(s=parseFloat(a[1])||0,r=parseFloat(a[2])||0)}const o=a=>-a;this.writeSVGPath(t,s,r,e,o)}writeObjects(){this.dxfContent.push("0"),this.dxfContent.push("SECTION"),this.dxfContent.push("2"),this.dxfContent.push("OBJECTS"),this.dxfContent.push("0"),this.dxfContent.push("ENDSEC")}writeEOF(){this.dxfContent.push("0"),this.dxfContent.push("EOF")}parseSVGPathSegments(t,e,n,s){const r=[],o=this.parseSVGPathCommands(t);let a=0,l=0,c=0,h=0;for(const u of o)switch(u.type){case"M":a=u.x+e,l=s(u.y+n),c=a,h=l;break;case"L":const d=u.x+e,p=s(u.y+n);r.push({type:"line",start:{x:a,y:l},end:{x:d,y:p}}),a=d,l=p;break;case"H":const g=u.x+e;r.push({type:"line",start:{x:a,y:l},end:{x:g,y:l}}),a=g;break;case"V":const x=s(u.y+n);r.push({type:"line",start:{x:a,y:l},end:{x:a,y:x}}),l=x;break;case"A":const m=a,f=l,A=u.x+e,v=s(u.y+n),S=this.svgArcToDXFArc(m,f,A,v,u.rx,u.ry,u.xAxisRotation,u.largeArcFlag,u.sweepFlag);S&&r.push({type:"arc",arc:S}),a=A,l=v;break;case"Z":(a!==c||l!==h)&&r.push({type:"line",start:{x:a,y:l},end:{x:c,y:h}}),a=c,l=h;break}return r}parseSVGPathCommands(t){const e=[],n=/([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi;let s;for(;(s=n.exec(t))!==null;){const r=s[1].toUpperCase(),o=s[2].trim().split(/[\s,]+/).map(Number);switch(r){case"M":case"L":e.push({type:r,x:o[0]||0,y:o[1]||0});break;case"H":e.push({type:r,x:o[0]||0});break;case"V":e.push({type:r,y:o[0]||0});break;case"A":e.push({type:r,rx:o[0]||0,ry:o[1]||0,xAxisRotation:o[2]||0,largeArcFlag:o[3]||0,sweepFlag:o[4]||0,x:o[5]||0,y:o[6]||0});break;case"Z":e.push({type:r});break}}return e}svgArcToDXFArc(t,e,n,s,r,o,a,l,c){if(Math.abs(r-o)>.001||Math.abs(a)>.001)return null;const h=r,u=n-t,d=s-e,p=Math.sqrt(u*u+d*d);if(p===0||h===0)return null;const g=p/2,x=Math.sqrt(h*h-g*g),m=(t+n)/2,f=(e+s)/2,A=-d/p,v=u/p,S=x*(c?-1:1),w=m+A*S,R=f+v*S;let P=Math.atan2(e-R,t-w)*(180/Math.PI),I=Math.atan2(s-R,n-w)*(180/Math.PI);const y=C=>(C%360+360)%360;return P=y(P),I=y(I),{centerX:w,centerY:R,radius:h,startAngle:P,endAngle:I,sweepFlag:c}}writePathAsPolyline(t,e){if(t.length===0)return;const n=[],s=[];let r;if(t[0].type==="arc"){const c=t[0].arc;r={x:c.centerX+c.radius*Math.cos(c.startAngle*Math.PI/180),y:c.centerY+c.radius*Math.sin(c.startAngle*Math.PI/180)}}else r=t[0].start;n.push(r),s.push(0);for(let c=0;c<t.length;c++){const h=t[c];if(h.type==="line")n.push(h.end),s.push(0),r=h.end;else if(h.type==="arc"){const u=h.arc,d=this.calculateBulge(u);s[s.length-1]=d;const p={x:u.centerX+u.radius*Math.cos(u.endAngle*Math.PI/180),y:u.centerY+u.radius*Math.sin(u.endAngle*Math.PI/180)};n.push(p),s.push(0),r=p}}const o=.01,a=n.length>2&&Math.abs(n[n.length-1].x-n[0].x)<o&&Math.abs(n[n.length-1].y-n[0].y)<o;a&&(n.pop(),s.pop());const l=this.getNextHandle();this.dxfContent.push("0"),this.dxfContent.push("LWPOLYLINE"),this.dxfContent.push("5"),this.dxfContent.push(l),this.dxfContent.push("100"),this.dxfContent.push("AcDbEntity"),this.dxfContent.push("8"),this.dxfContent.push(e),this.dxfContent.push("6"),this.dxfContent.push("BYLAYER"),this.dxfContent.push("62"),this.dxfContent.push("256"),this.dxfContent.push("370"),this.dxfContent.push("-1"),this.dxfContent.push("100"),this.dxfContent.push("AcDbPolyline"),this.dxfContent.push("90"),this.dxfContent.push(n.length.toString()),this.dxfContent.push("70"),this.dxfContent.push(a?"1":"0");for(let c=0;c<n.length;c++)this.dxfContent.push("10"),this.dxfContent.push(n[c].x.toString()),this.dxfContent.push("20"),this.dxfContent.push(n[c].y.toString()),s[c]!==0&&(this.dxfContent.push("42"),this.dxfContent.push(s[c].toString()))}calculateBulge(t){let e=Math.abs(t.endAngle-t.startAngle);e>180&&(e=360-e);const n=e*Math.PI/180,s=Math.tan(n/4);return t.sweepFlag?-s:s}ensureCounterClockwise(t){if(t.length<3)return t;let e=0;for(let n=0;n<t.length;n++){const s=(n+1)%t.length;e+=t[n].x*t[s].y-t[s].x*t[n].y}return e<0?t.slice().reverse():t}colorToDXFIndex(t){if(!t)return{r:255,g:255,b:255};if(typeof t=="number")return t;let e,n,s;if(t.startsWith("#")){const r=t.slice(1);e=parseInt(r.slice(0,2),16),n=parseInt(r.slice(2,4),16),s=parseInt(r.slice(4,6),16)}else if(t.startsWith("rgba")||t.startsWith("rgb")){const r=t.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);r&&(e=parseInt(r[1]),n=parseInt(r[2]),s=parseInt(r[3]))}return e!==void 0&&n!==void 0&&s!==void 0?{r:e,g:n,b:s}:{r:255,g:255,b:255}}getNextHandle(){const t=this.handleCounter.toString(16).toUpperCase();return this.handleCounter++,t}downloadDXF(t,e="facade_design.dxf"){const n=new Blob([t],{type:"application/dxf"}),s=document.createElement("a");s.href=URL.createObjectURL(n),s.download=e,document.body.appendChild(s),s.click(),document.body.removeChild(s)}}class bu{constructor(){this.EPSILON=1e-6}calculateOffset(t,e){if(!t||t.length<3)return t;const n=this.ensureClosed(t),s=[];for(let a=0;a<n.length-1;a++){const l=n[a],c=n[a+1],h=this.calculateEdgeOffset(l,c,e);h&&s.push(h)}const r=[];for(let a=0;a<s.length;a++){const l=s[a],c=s[(a+1)%s.length],h=this.findIntersection(l,c);if(h)r.push(h);else{const u={x:(l.end.x+c.start.x)/2,y:(l.end.y+c.start.y)/2};r.push(u)}}const o=this.removeDuplicatePoints(r);return this.ensureCounterClockwise(o)}ensureClosed(t){if(t.length===0)return t;const e=t[0],n=t[t.length-1];return Math.abs(e.x-n.x)>this.EPSILON||Math.abs(e.y-n.y)>this.EPSILON?[...t,{x:e.x,y:e.y}]:t}calculateEdgeOffset(t,e,n){const s=e.x-t.x,r=e.y-t.y,o=Math.sqrt(s*s+r*r);if(o<this.EPSILON)return null;const a=-r/o,l=s/o,c={x:t.x+a*n,y:t.y+l*n},h={x:e.x+a*n,y:e.y+l*n};return{start:c,end:h}}findIntersection(t,e){const n=t.start,s=t.end,r=e.start,o=e.end,a=(n.x-s.x)*(r.y-o.y)-(n.y-s.y)*(r.x-o.x);if(Math.abs(a)<this.EPSILON)return null;const l=((n.x-r.x)*(r.y-o.y)-(n.y-r.y)*(r.x-o.x))/a,c=-((n.x-s.x)*(n.y-r.y)-(n.y-s.y)*(n.x-r.x))/a;return l>=0&&l<=1&&c>=0&&c<=1?{x:n.x+l*(s.x-n.x),y:n.y+l*(s.y-n.y)}:null}removeDuplicatePoints(t){const e=[],n=this.EPSILON;for(const s of t){let r=!1;for(const o of e)if(Math.abs(s.x-o.x)<n&&Math.abs(s.y-o.y)<n){r=!0;break}r||e.push(s)}return e}ensureCounterClockwise(t){if(t.length<3)return t;let e=0;for(let n=0;n<t.length;n++){const s=(n+1)%t.length;e+=t[n].x*t[s].y-t[s].x*t[n].y}return e<0&&t.reverse(),t}rectToPoints(t){const e=parseFloat(t.getAttribute("x"))||0,n=parseFloat(t.getAttribute("y"))||0,s=parseFloat(t.getAttribute("width"))||0,r=parseFloat(t.getAttribute("height"))||0;return[{x:e,y:n},{x:e+s,y:n},{x:e+s,y:n+r},{x:e,y:n+r},{x:e,y:n}]}}const Qi=require("makerjs");function Eu(i){if(!i)return null;const t=i.tagName.toLowerCase();if(t==="path")return i.getAttribute("d");if(t==="rect"){const e=parseFloat(i.getAttribute("x"))||0,n=parseFloat(i.getAttribute("y"))||0,s=parseFloat(i.getAttribute("width"))||0,r=parseFloat(i.getAttribute("height"))||0;return`M ${e} ${n} L ${e+s} ${n} L ${e+s} ${n+r} L ${e} ${n+r} Z`}else if(t==="polygon"){const e=i.getAttribute("points").trim().split(/\s+/),n=[];for(let s=0;s<e.length;s+=2)n.push(`${e[s]},${e[s+1]}`);return`M ${n.join(" L ")} Z`}else return i.getAttribute("d")||null}function Al(i,t={}){let e,n=0,s=0;if(i.group){e=i.group.querySelector(".bit-shape");const a=i.group.getAttribute("transform");if(a){const l=a.match(/translate\(([^,]+),\s*([^)]+)\)/);l&&(n=parseFloat(l[1]),s=-parseFloat(l[2]))}}else e=i,n=t.x||0,s=t.y||0;const r=Eu(e);if(!r)return null;const o=Qi.importer.fromSVGPathData(r);return(n!==0||s!==0)&&Qi.model.move(o,[n,s]),o}function Au(i,t,e,n,s){const r=document.getElementById("panel-section"),o=Al(r,{x:0,y:0});if(!o)return console.error("Failed to create panel model"),"";const a=s.map(x=>Al(x)).filter(x=>x);if(a.length===0){const x=Qi.exporter.toSVG(o),A=new DOMParser().parseFromString(x,"image/svg+xml").querySelector("path");return A?A.getAttribute("d"):""}let l=a[0];for(let x=1;x<a.length;x++)l=Qi.model.combineUnion(l,a[x]);const c={origin:[0,0],models:{main:o,subtract:l}},h=Qi.model.combineSubtraction(c.models.main,c.models.subtract),u=Qi.exporter.toSVG(h),g=new DOMParser().parseFromString(u,"image/svg+xml").querySelector("path");return g?g.getAttribute("d"):""}class Tu{constructor(){this.services={},this.factories={},this.instances={}}registerService(t,e,n=!0){if(this.services[t]){console.warn(`Service ${t} is already registered`);return}this.services[t]={factory:e,singleton:n}}registerFactory(t,e){if(this.factories[t]){console.warn(`Factory ${t} is already registered`);return}this.factories[t]=e}get(t){if(this.services[t]){const{factory:e,singleton:n}=this.services[t];return n?(this.instances[t]||(this.instances[t]=e(this)),this.instances[t]):e(this)}if(this.factories[t])return this.factories[t](this);throw new Error(`Service or factory ${t} not found`)}has(t){return!!this.services[t]||!!this.factories[t]}reset(){this.instances={}}}const Cu=new Tu;class wu{constructor(){this.container=Cu,this.eventBus=Xc,this.modules=[],this.initialized=!1}registerModule(t,e){this.container.registerService(e,t),this.modules.push(e)}async initialize(){if(this.initialized){console.warn("Application already initialized");return}console.log("Initializing application...");for(const t of this.modules)try{const e=this.container.get(t);typeof e.initialize=="function"&&(await e.initialize(),console.log(`Module ${t} initialized`))}catch(e){throw console.error(`Failed to initialize module ${t}:`,e),e}this.initialized=!0,this.eventBus.emit("app:initialized"),console.log("Application initialized successfully")}async start(){this.initialized||await this.initialize(),this.eventBus.emit("app:started"),console.log("Application started")}getModule(t){return this.container.get(t)}async shutdown(){console.log("Shutting down application...");for(let t=this.modules.length-1;t>=0;t--){const e=this.modules[t];try{const n=this.container.get(e);typeof n.shutdown=="function"&&(await n.shutdown(),console.log(`Module ${e} shut down`))}catch(n){console.error(`Failed to shutdown module ${e}:`,n)}}this.eventBus.emit("app:shutdown"),this.container.reset(),this.initialized=!1,console.log("Application shut down successfully")}}const je=new wu;class Pu extends qs{constructor(){super("canvas"),this.canvasManager=null,this.canvasElement=null}async initialize(){if(await super.initialize(),this.canvasElement=document.getElementById("canvas"),!this.canvasElement)throw new Error("Canvas element not found");this.waitForCanvasManager()}waitForCanvasManager(){const t=()=>{window.mainCanvasManager?(console.log("CanvasModule: Using existing CanvasManager from global scope"),this.canvasManager=window.mainCanvasManager,this.eventBus.emit("canvas:ready",{canvasManager:this.canvasManager})):setTimeout(t,10)};t()}getCanvasManager(){return this.canvasManager}getCanvasElement(){return this.canvasElement}setupEventListeners(){this.eventBus.on("app:initialized",()=>{console.log("App initialized, setting up canvas")})}cleanupEventListeners(){this.eventBus.off("app:initialized")}}class Ru extends qs{constructor(){super("bits"),this.bitsManager=null,this.canvasManager=null}async initialize(){await super.initialize(),this.waitForCanvasReady(),this.setupEventListeners()}waitForCanvasReady(){const t=()=>{var n;const e=((n=je.getModule("canvas"))==null?void 0:n.getCanvasManager())||window.mainCanvasManager;e?(this.canvasManager=e,this.bitsManager=new Yo(this.canvasManager),console.log("BitsModule initialized with BitsManager and CanvasManager")):setTimeout(t,10)};t()}getBitsManager(){return this.bitsManager}setCanvasManager(t){this.canvasManager=t,this.bitsManager?this.bitsManager.canvasManager=t:this.bitsManager=new Yo(t)}setupEventListeners(){this.eventBus.on("canvas:ready",({canvasManager:t})=>{console.log("Canvas is ready, initializing bits manager"),this.setCanvasManager(t)}),this.eventBus.on("bits:add",t=>{console.log("Adding new bit:",t)})}cleanupEventListeners(){this.eventBus.off("canvas:ready"),this.eventBus.off("bits:add")}}class Lu extends qs{constructor(){super("ui"),this.leftPanelClickOutsideHandler=null,this.rightPanelClickOutsideHandler=null}initialize(){return super.initialize(),console.log("UIModule initialized"),this.initializeTheme(),this.setupResponsivePanels(),Promise.resolve()}toggleTheme(){const t=document.documentElement,e=document.getElementById("theme-toggle"),n=e.querySelector("svg");t.classList.contains("dark")?(t.classList.remove("dark"),localStorage.setItem("theme","light"),n.innerHTML='<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>',e.title="Switch to Dark Theme"):(t.classList.add("dark"),localStorage.setItem("theme","dark"),n.innerHTML='<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path>',e.title="Switch to Light Theme")}initializeTheme(){const t=localStorage.getItem("theme"),e=document.getElementById("theme-toggle"),n=e.querySelector("svg");t==="dark"?(document.documentElement.classList.add("dark"),n.innerHTML='<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path>',e.title="Switch to Light Theme"):(document.documentElement.classList.remove("dark"),n.innerHTML='<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>',e.title="Switch to Dark Theme")}toggleLeftPanel(){const t=document.getElementById("left-panel"),e=window.innerWidth<=768,n=this.isMobileDevice();e||n?t.classList.contains("overlay-visible")?(t.classList.remove("overlay-visible"),t.classList.add("collapsed"),t.style.display="none",this.leftPanelClickOutsideHandler&&(document.removeEventListener("click",this.leftPanelClickOutsideHandler),this.leftPanelClickOutsideHandler=null)):(t.classList.remove("collapsed"),t.classList.add("overlay-visible"),t.style.display="flex",this.leftPanelClickOutsideHandler=s=>{!t.contains(s.target)&&!s.target.closest("#app-header button")&&this.toggleLeftPanel()},setTimeout(()=>{document.addEventListener("click",this.leftPanelClickOutsideHandler)},10)):(t.classList.toggle("collapsed"),t.classList.remove("overlay-visible"),t.style.display=""),this.updateCanvasAfterPanelToggle()}toggleRightMenu(){const t=document.getElementById("right-menu");!t.classList.contains("collapsed")&&(window.innerWidth>1e3||t.style.display==="flex")?(t.classList.add("collapsed"),window.innerWidth<=1e3&&(t.style.display="none")):(t.classList.remove("collapsed"),window.innerWidth<=1e3&&(t.style.display="flex")),this.updateCanvasAfterPanelToggle()}updateCanvasAfterPanelToggle(){var o;const t=(o=this.app)==null?void 0:o.getModule("canvas");if(!t||!t.canvasManager)return;const e=t.canvasManager,n=e.canvasParameters.width,s=e.canvasParameters.height,r=document.getElementById("canvas");e.canvasParameters.width=r.getBoundingClientRect().width,e.canvasParameters.height=r.getBoundingClientRect().height,e.panX=e.panX/n*e.canvasParameters.width,e.panY=e.panY/s*e.canvasParameters.height,e.updateViewBox()}setupResponsivePanels(){window.addEventListener("resize",()=>{this.handleWindowResize()})}handleWindowResize(){var s;const t=(s=this.app)==null?void 0:s.getModule("canvas");t&&t.canvasManager&&(t.canvasManager.resize(),this.emit("canvas:resized"));const e=document.getElementById("left-panel"),n=document.getElementById("right-menu");window.innerWidth>768&&e&&(e.classList.remove("collapsed","overlay-visible"),e.style.display="",this.leftPanelClickOutsideHandler&&(document.removeEventListener("click",this.leftPanelClickOutsideHandler),this.leftPanelClickOutsideHandler=null)),window.innerWidth>1e3&&n&&(n.classList.remove("collapsed","overlay-visible"),n.style.display="",this.rightPanelClickOutsideHandler&&(document.removeEventListener("click",this.rightPanelClickOutsideHandler),this.rightPanelClickOutsideHandler=null)),this.updateCanvasAfterPanelToggle()}logOperation(t){const e=document.getElementById("operations-log");if(!e)return;const n=new Date().toLocaleTimeString();e.textContent=`[${n}] ${t}`,e.classList.remove("fade-out"),setTimeout(()=>{e.classList.add("fade-out")},5e3)}showAlert(t){alert(t)}showConfirm(t){return confirm(t)}createFileInput(t="*",e=null){const n=document.createElement("input");return n.type="file",n.accept=t,e&&(n.onchange=s=>e(s.target.files[0])),n.click(),n}isMobileDevice(){return/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||window.innerWidth<=768&&window.innerHeight<=1024}}/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Wa="182",es={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},ts={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Du=0,Tl=1,Iu=2,Cr=1,Yc=2,Es=3,li=0,Ke=1,Sn=2,Gn=0,ns=1,Cl=2,wl=3,Pl=4,Nu=5,Si=100,Uu=101,Fu=102,Ou=103,Bu=104,ku=200,zu=201,Vu=202,Gu=203,qo=204,$o=205,Hu=206,Wu=207,Xu=208,Yu=209,qu=210,$u=211,Zu=212,ju=213,Ku=214,Zo=0,jo=1,Ko=2,rs=3,Jo=4,Qo=5,ta=6,ea=7,qc=0,Ju=1,Qu=2,En=0,$c=1,Zc=2,jc=3,Kc=4,Jc=5,Qc=6,th=7,eh=300,Li=301,os=302,na=303,ia=304,qr=306,sa=1e3,kn=1001,ra=1002,De=1003,td=1004,Qs=1005,Fe=1006,ao=1007,Ti=1008,rn=1009,nh=1010,ih=1011,Us=1012,Xa=1013,Cn=1014,Mn=1015,Wn=1016,Ya=1017,qa=1018,Fs=1020,sh=35902,rh=35899,oh=1021,ah=1022,mn=1023,Xn=1026,Ci=1027,lh=1028,$a=1029,as=1030,Za=1031,ja=1033,wr=33776,Pr=33777,Rr=33778,Lr=33779,oa=35840,aa=35841,la=35842,ca=35843,ha=36196,ua=37492,da=37496,fa=37488,pa=37489,ma=37490,ga=37491,xa=37808,_a=37809,va=37810,ya=37811,Sa=37812,Ma=37813,ba=37814,Ea=37815,Aa=37816,Ta=37817,Ca=37818,wa=37819,Pa=37820,Ra=37821,La=36492,Da=36494,Ia=36495,Na=36283,Ua=36284,Fa=36285,Oa=36286,ed=3200,ch=0,nd=1,ni="",sn="srgb",ls="srgb-linear",Or="linear",se="srgb",Bi=7680,Rl=519,id=512,sd=513,rd=514,Ka=515,od=516,ad=517,Ja=518,ld=519,Ll=35044,Dl="300 es",bn=2e3,Br=2001;function hh(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function kr(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function cd(){const i=kr("canvas");return i.style.display="block",i}const Il={};function Nl(...i){const t="THREE."+i.shift();console.log(t,...i)}function Vt(...i){const t="THREE."+i.shift();console.warn(t,...i)}function ee(...i){const t="THREE."+i.shift();console.error(t,...i)}function Os(...i){const t=i.join(" ");t in Il||(Il[t]=!0,Vt(...i))}function hd(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}class Ui{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){const n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){const n=this._listeners;if(n===void 0)return;const s=n[t];if(s!==void 0){const r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){const e=this._listeners;if(e===void 0)return;const n=e[t.type];if(n!==void 0){t.target=this;const s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,t);t.target=null}}}const Ie=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Ul=1234567;const Ls=Math.PI/180,Bs=180/Math.PI;function Fi(){const i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ie[i&255]+Ie[i>>8&255]+Ie[i>>16&255]+Ie[i>>24&255]+"-"+Ie[t&255]+Ie[t>>8&255]+"-"+Ie[t>>16&15|64]+Ie[t>>24&255]+"-"+Ie[e&63|128]+Ie[e>>8&255]+"-"+Ie[e>>16&255]+Ie[e>>24&255]+Ie[n&255]+Ie[n>>8&255]+Ie[n>>16&255]+Ie[n>>24&255]).toLowerCase()}function Zt(i,t,e){return Math.max(t,Math.min(e,i))}function Qa(i,t){return(i%t+t)%t}function ud(i,t,e,n,s){return n+(i-t)*(s-n)/(e-t)}function dd(i,t,e){return i!==t?(e-i)/(t-i):0}function Ds(i,t,e){return(1-e)*i+e*t}function fd(i,t,e,n){return Ds(i,t,1-Math.exp(-e*n))}function pd(i,t=1){return t-Math.abs(Qa(i,t*2)-t)}function md(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*(3-2*i))}function gd(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*i*(i*(i*6-15)+10))}function xd(i,t){return i+Math.floor(Math.random()*(t-i+1))}function _d(i,t){return i+Math.random()*(t-i)}function vd(i){return i*(.5-Math.random())}function yd(i){i!==void 0&&(Ul=i);let t=Ul+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function Sd(i){return i*Ls}function Md(i){return i*Bs}function bd(i){return(i&i-1)===0&&i!==0}function Ed(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Ad(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Td(i,t,e,n,s){const r=Math.cos,o=Math.sin,a=r(e/2),l=o(e/2),c=r((t+n)/2),h=o((t+n)/2),u=r((t-n)/2),d=o((t-n)/2),p=r((n-t)/2),g=o((n-t)/2);switch(s){case"XYX":i.set(a*h,l*u,l*d,a*c);break;case"YZY":i.set(l*d,a*h,l*u,a*c);break;case"ZXZ":i.set(l*u,l*d,a*h,a*c);break;case"XZX":i.set(a*h,l*g,l*p,a*c);break;case"YXY":i.set(l*p,a*h,l*g,a*c);break;case"ZYZ":i.set(l*g,l*p,a*h,a*c);break;default:Vt("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function Ji(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function Ve(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const Cd={DEG2RAD:Ls,RAD2DEG:Bs,generateUUID:Fi,clamp:Zt,euclideanModulo:Qa,mapLinear:ud,inverseLerp:dd,lerp:Ds,damp:fd,pingpong:pd,smoothstep:md,smootherstep:gd,randInt:xd,randFloat:_d,randFloatSpread:vd,seededRandom:yd,degToRad:Sd,radToDeg:Md,isPowerOfTwo:bd,ceilPowerOfTwo:Ed,floorPowerOfTwo:Ad,setQuaternionFromProperEuler:Td,normalize:Ve,denormalize:Ji};class ct{constructor(t=0,e=0){ct.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Zt(this.x,t.x,e.x),this.y=Zt(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=Zt(this.x,t,e),this.y=Zt(this.y,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Zt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Zt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*n-o*s+t.x,this.y=r*s+o*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Di{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,o,a){let l=n[s+0],c=n[s+1],h=n[s+2],u=n[s+3],d=r[o+0],p=r[o+1],g=r[o+2],x=r[o+3];if(a<=0){t[e+0]=l,t[e+1]=c,t[e+2]=h,t[e+3]=u;return}if(a>=1){t[e+0]=d,t[e+1]=p,t[e+2]=g,t[e+3]=x;return}if(u!==x||l!==d||c!==p||h!==g){let m=l*d+c*p+h*g+u*x;m<0&&(d=-d,p=-p,g=-g,x=-x,m=-m);let f=1-a;if(m<.9995){const A=Math.acos(m),v=Math.sin(A);f=Math.sin(f*A)/v,a=Math.sin(a*A)/v,l=l*f+d*a,c=c*f+p*a,h=h*f+g*a,u=u*f+x*a}else{l=l*f+d*a,c=c*f+p*a,h=h*f+g*a,u=u*f+x*a;const A=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=A,c*=A,h*=A,u*=A}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=u}static multiplyQuaternionsFlat(t,e,n,s,r,o){const a=n[s],l=n[s+1],c=n[s+2],h=n[s+3],u=r[o],d=r[o+1],p=r[o+2],g=r[o+3];return t[e]=a*g+h*u+l*p-c*d,t[e+1]=l*g+h*d+c*u-a*p,t[e+2]=c*g+h*p+a*d-l*u,t[e+3]=h*g-a*u-l*d-c*p,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const n=t._x,s=t._y,r=t._z,o=t._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(s/2),u=a(r/2),d=l(n/2),p=l(s/2),g=l(r/2);switch(o){case"XYZ":this._x=d*h*u+c*p*g,this._y=c*p*u-d*h*g,this._z=c*h*g+d*p*u,this._w=c*h*u-d*p*g;break;case"YXZ":this._x=d*h*u+c*p*g,this._y=c*p*u-d*h*g,this._z=c*h*g-d*p*u,this._w=c*h*u+d*p*g;break;case"ZXY":this._x=d*h*u-c*p*g,this._y=c*p*u+d*h*g,this._z=c*h*g+d*p*u,this._w=c*h*u-d*p*g;break;case"ZYX":this._x=d*h*u-c*p*g,this._y=c*p*u+d*h*g,this._z=c*h*g-d*p*u,this._w=c*h*u+d*p*g;break;case"YZX":this._x=d*h*u+c*p*g,this._y=c*p*u+d*h*g,this._z=c*h*g-d*p*u,this._w=c*h*u-d*p*g;break;case"XZY":this._x=d*h*u-c*p*g,this._y=c*p*u-d*h*g,this._z=c*h*g+d*p*u,this._w=c*h*u+d*p*g;break;default:Vt("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],s=e[4],r=e[8],o=e[1],a=e[5],l=e[9],c=e[2],h=e[6],u=e[10],d=n+a+u;if(d>0){const p=.5/Math.sqrt(d+1);this._w=.25/p,this._x=(h-l)*p,this._y=(r-c)*p,this._z=(o-s)*p}else if(n>a&&n>u){const p=2*Math.sqrt(1+n-a-u);this._w=(h-l)/p,this._x=.25*p,this._y=(s+o)/p,this._z=(r+c)/p}else if(a>u){const p=2*Math.sqrt(1+a-n-u);this._w=(r-c)/p,this._x=(s+o)/p,this._y=.25*p,this._z=(l+h)/p}else{const p=2*Math.sqrt(1+u-n-a);this._w=(o-s)/p,this._x=(r+c)/p,this._y=(l+h)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Zt(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,s=t._y,r=t._z,o=t._w,a=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+o*a+s*c-r*l,this._y=s*h+o*l+r*a-n*c,this._z=r*h+o*c+n*l-s*a,this._w=o*h-n*a-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){if(e<=0)return this;if(e>=1)return this.copy(t);let n=t._x,s=t._y,r=t._z,o=t._w,a=this.dot(t);a<0&&(n=-n,s=-s,r=-r,o=-o,a=-a);let l=1-e;if(a<.9995){const c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this._onChangeCallback()}else this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class N{constructor(t=0,e=0,n=0){N.prototype.isVector3=!0,this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Fl.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Fl.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,s=this.z,r=t.elements,o=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(t){const e=this.x,n=this.y,s=this.z,r=t.x,o=t.y,a=t.z,l=t.w,c=2*(o*s-a*n),h=2*(a*e-r*s),u=2*(r*n-o*e);return this.x=e+l*c+o*u-a*h,this.y=n+l*h+a*c-r*u,this.z=s+l*u+r*h-o*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Zt(this.x,t.x,e.x),this.y=Zt(this.y,t.y,e.y),this.z=Zt(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=Zt(this.x,t,e),this.y=Zt(this.y,t,e),this.z=Zt(this.z,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Zt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,s=t.y,r=t.z,o=e.x,a=e.y,l=e.z;return this.x=s*l-r*a,this.y=r*o-n*l,this.z=n*a-s*o,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return lo.copy(this).projectOnVector(t),this.sub(lo)}reflect(t){return this.sub(lo.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Zt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const lo=new N,Fl=new Di;class Xt{constructor(t,e,n,s,r,o,a,l,c){Xt.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,l,c)}set(t,e,n,s,r,o,a,l,c){const h=this.elements;return h[0]=t,h[1]=s,h[2]=a,h[3]=e,h[4]=r,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],u=n[7],d=n[2],p=n[5],g=n[8],x=s[0],m=s[3],f=s[6],A=s[1],v=s[4],S=s[7],w=s[2],R=s[5],P=s[8];return r[0]=o*x+a*A+l*w,r[3]=o*m+a*v+l*R,r[6]=o*f+a*S+l*P,r[1]=c*x+h*A+u*w,r[4]=c*m+h*v+u*R,r[7]=c*f+h*S+u*P,r[2]=d*x+p*A+g*w,r[5]=d*m+p*v+g*R,r[8]=d*f+p*S+g*P,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8];return e*o*h-e*a*c-n*r*h+n*a*l+s*r*c-s*o*l}invert(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],u=h*o-a*c,d=a*l-h*r,p=c*r-o*l,g=e*u+n*d+s*p;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const x=1/g;return t[0]=u*x,t[1]=(s*c-h*n)*x,t[2]=(a*n-s*o)*x,t[3]=d*x,t[4]=(h*e-s*l)*x,t[5]=(s*r-a*e)*x,t[6]=p*x,t[7]=(n*l-c*e)*x,t[8]=(o*e-n*r)*x,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,o,a){const l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+t,-s*c,s*l,-s*(-c*o+l*a)+a+e,0,0,1),this}scale(t,e){return this.premultiply(co.makeScale(t,e)),this}rotate(t){return this.premultiply(co.makeRotation(-t)),this}translate(t,e){return this.premultiply(co.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const co=new Xt,Ol=new Xt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Bl=new Xt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function wd(){const i={enabled:!0,workingColorSpace:ls,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===se&&(s.r=Hn(s.r),s.g=Hn(s.g),s.b=Hn(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===se&&(s.r=is(s.r),s.g=is(s.g),s.b=is(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===ni?Or:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return Os("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return Os("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[ls]:{primaries:t,whitePoint:n,transfer:Or,toXYZ:Ol,fromXYZ:Bl,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:sn},outputColorSpaceConfig:{drawingBufferColorSpace:sn}},[sn]:{primaries:t,whitePoint:n,transfer:se,toXYZ:Ol,fromXYZ:Bl,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:sn}}}),i}const Qt=wd();function Hn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function is(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let ki;class Pd{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{ki===void 0&&(ki=kr("canvas")),ki.width=t.width,ki.height=t.height;const s=ki.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),n=ki}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=kr("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=Hn(r[o]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Hn(e[n]/255)*255):e[n]=Hn(e[n]);return{data:e,width:t.width,height:t.height}}else return Vt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let Rd=0;class tl{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Rd++}),this.uuid=Fi(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){const e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayHeight,e.displayWidth,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(ho(s[o].image)):r.push(ho(s[o]))}else r=ho(s);n.url=r}return e||(t.images[this.uuid]=n),n}}function ho(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Pd.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Vt("Texture: Unable to serialize Texture."),{})}let Ld=0;const uo=new N;class He extends Ui{constructor(t=He.DEFAULT_IMAGE,e=He.DEFAULT_MAPPING,n=kn,s=kn,r=Fe,o=Ti,a=mn,l=rn,c=He.DEFAULT_ANISOTROPY,h=ni){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Ld++}),this.uuid=Fi(),this.name="",this.source=new tl(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new ct(0,0),this.repeat=new ct(1,1),this.center=new ct(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Xt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(uo).x}get height(){return this.source.getSize(uo).y}get depth(){return this.source.getSize(uo).z}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(const e in t){const n=t[e];if(n===void 0){Vt(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){Vt(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==eh)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case sa:t.x=t.x-Math.floor(t.x);break;case kn:t.x=t.x<0?0:1;break;case ra:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case sa:t.y=t.y-Math.floor(t.y);break;case kn:t.y=t.y<0?0:1;break;case ra:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}He.DEFAULT_IMAGE=null;He.DEFAULT_MAPPING=eh;He.DEFAULT_ANISOTROPY=1;class ve{constructor(t=0,e=0,n=0,s=1){ve.prototype.isVector4=!0,this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,s=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*e+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*e+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*e+o[7]*n+o[11]*s+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r;const l=t.elements,c=l[0],h=l[4],u=l[8],d=l[1],p=l[5],g=l[9],x=l[2],m=l[6],f=l[10];if(Math.abs(h-d)<.01&&Math.abs(u-x)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+x)<.1&&Math.abs(g+m)<.1&&Math.abs(c+p+f-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const v=(c+1)/2,S=(p+1)/2,w=(f+1)/2,R=(h+d)/4,P=(u+x)/4,I=(g+m)/4;return v>S&&v>w?v<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(v),s=R/n,r=P/n):S>w?S<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(S),n=R/s,r=I/s):w<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(w),n=P/r,s=I/r),this.set(n,s,r,e),this}let A=Math.sqrt((m-g)*(m-g)+(u-x)*(u-x)+(d-h)*(d-h));return Math.abs(A)<.001&&(A=1),this.x=(m-g)/A,this.y=(u-x)/A,this.z=(d-h)/A,this.w=Math.acos((c+p+f-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Zt(this.x,t.x,e.x),this.y=Zt(this.y,t.y,e.y),this.z=Zt(this.z,t.z,e.z),this.w=Zt(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=Zt(this.x,t,e),this.y=Zt(this.y,t,e),this.z=Zt(this.z,t,e),this.w=Zt(this.w,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Zt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Dd extends Ui{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Fe,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new ve(0,0,t,e),this.scissorTest=!1,this.viewport=new ve(0,0,t,e);const s={width:t,height:e,depth:n.depth},r=new He(s);this.textures=[];const o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(t={}){const e={minFilter:Fe,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),t!==null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;const s=Object.assign({},t.textures[e].image);this.textures[e].source=new tl(s)}return this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class An extends Dd{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}}class uh extends He{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=De,this.minFilter=De,this.wrapR=kn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class Id extends He{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=De,this.minFilter=De,this.wrapR=kn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class $s{constructor(t=new N(1/0,1/0,1/0),e=new N(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(un.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(un.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=un.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0){const r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,un):un.fromBufferAttribute(r,o),un.applyMatrix4(t.matrixWorld),this.expandByPoint(un);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),tr.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),tr.copy(n.boundingBox)),tr.applyMatrix4(t.matrixWorld),this.union(tr)}const s=t.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,un),un.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(xs),er.subVectors(this.max,xs),zi.subVectors(t.a,xs),Vi.subVectors(t.b,xs),Gi.subVectors(t.c,xs),qn.subVectors(Vi,zi),$n.subVectors(Gi,Vi),pi.subVectors(zi,Gi);let e=[0,-qn.z,qn.y,0,-$n.z,$n.y,0,-pi.z,pi.y,qn.z,0,-qn.x,$n.z,0,-$n.x,pi.z,0,-pi.x,-qn.y,qn.x,0,-$n.y,$n.x,0,-pi.y,pi.x,0];return!fo(e,zi,Vi,Gi,er)||(e=[1,0,0,0,1,0,0,0,1],!fo(e,zi,Vi,Gi,er))?!1:(nr.crossVectors(qn,$n),e=[nr.x,nr.y,nr.z],fo(e,zi,Vi,Gi,er))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,un).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(un).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(In[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),In[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),In[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),In[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),In[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),In[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),In[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),In[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(In),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}}const In=[new N,new N,new N,new N,new N,new N,new N,new N],un=new N,tr=new $s,zi=new N,Vi=new N,Gi=new N,qn=new N,$n=new N,pi=new N,xs=new N,er=new N,nr=new N,mi=new N;function fo(i,t,e,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){mi.fromArray(i,r);const a=s.x*Math.abs(mi.x)+s.y*Math.abs(mi.y)+s.z*Math.abs(mi.z),l=t.dot(mi),c=e.dot(mi),h=n.dot(mi);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}const Nd=new $s,_s=new N,po=new N;class $r{constructor(t=new N,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):Nd.setFromPoints(t).getCenter(n);let s=0;for(let r=0,o=t.length;r<o;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;_s.subVectors(t,this.center);const e=_s.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(_s,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(po.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(_s.copy(t.center).add(po)),this.expandByPoint(_s.copy(t.center).sub(po))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}}const Nn=new N,mo=new N,ir=new N,Zn=new N,go=new N,sr=new N,xo=new N;class el{constructor(t=new N,e=new N(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Nn)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=Nn.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Nn.copy(this.origin).addScaledVector(this.direction,e),Nn.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){mo.copy(t).add(e).multiplyScalar(.5),ir.copy(e).sub(t).normalize(),Zn.copy(this.origin).sub(mo);const r=t.distanceTo(e)*.5,o=-this.direction.dot(ir),a=Zn.dot(this.direction),l=-Zn.dot(ir),c=Zn.lengthSq(),h=Math.abs(1-o*o);let u,d,p,g;if(h>0)if(u=o*l-a,d=o*a-l,g=r*h,u>=0)if(d>=-g)if(d<=g){const x=1/h;u*=x,d*=x,p=u*(u+o*d+2*a)+d*(o*u+d+2*l)+c}else d=r,u=Math.max(0,-(o*d+a)),p=-u*u+d*(d+2*l)+c;else d=-r,u=Math.max(0,-(o*d+a)),p=-u*u+d*(d+2*l)+c;else d<=-g?(u=Math.max(0,-(-o*r+a)),d=u>0?-r:Math.min(Math.max(-r,-l),r),p=-u*u+d*(d+2*l)+c):d<=g?(u=0,d=Math.min(Math.max(-r,-l),r),p=d*(d+2*l)+c):(u=Math.max(0,-(o*r+a)),d=u>0?r:Math.min(Math.max(-r,-l),r),p=-u*u+d*(d+2*l)+c);else d=o>0?-r:r,u=Math.max(0,-(o*d+a)),p=-u*u+d*(d+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(mo).addScaledVector(ir,d),p}intersectSphere(t,e){Nn.subVectors(t.center,this.origin);const n=Nn.dot(this.direction),s=Nn.dot(Nn)-n*n,r=t.radius*t.radius;if(s>r)return null;const o=Math.sqrt(r-s),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,o,a,l;const c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(t.min.x-d.x)*c,s=(t.max.x-d.x)*c):(n=(t.max.x-d.x)*c,s=(t.min.x-d.x)*c),h>=0?(r=(t.min.y-d.y)*h,o=(t.max.y-d.y)*h):(r=(t.max.y-d.y)*h,o=(t.min.y-d.y)*h),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),u>=0?(a=(t.min.z-d.z)*u,l=(t.max.z-d.z)*u):(a=(t.max.z-d.z)*u,l=(t.min.z-d.z)*u),n>l||a>s)||((a>n||n!==n)&&(n=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,Nn)!==null}intersectTriangle(t,e,n,s,r){go.subVectors(e,t),sr.subVectors(n,t),xo.crossVectors(go,sr);let o=this.direction.dot(xo),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Zn.subVectors(this.origin,t);const l=a*this.direction.dot(sr.crossVectors(Zn,sr));if(l<0)return null;const c=a*this.direction.dot(go.cross(Zn));if(c<0||l+c>o)return null;const h=-a*Zn.dot(xo);return h<0?null:this.at(h/o,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class ue{constructor(t,e,n,s,r,o,a,l,c,h,u,d,p,g,x,m){ue.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,l,c,h,u,d,p,g,x,m)}set(t,e,n,s,r,o,a,l,c,h,u,d,p,g,x,m){const f=this.elements;return f[0]=t,f[4]=e,f[8]=n,f[12]=s,f[1]=r,f[5]=o,f[9]=a,f[13]=l,f[2]=c,f[6]=h,f[10]=u,f[14]=d,f[3]=p,f[7]=g,f[11]=x,f[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ue().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinant()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinant()===0)return this.identity();const e=this.elements,n=t.elements,s=1/Hi.setFromMatrixColumn(t,0).length(),r=1/Hi.setFromMatrixColumn(t,1).length(),o=1/Hi.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*o,e[9]=n[9]*o,e[10]=n[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,n=t.x,s=t.y,r=t.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(t.order==="XYZ"){const d=o*h,p=o*u,g=a*h,x=a*u;e[0]=l*h,e[4]=-l*u,e[8]=c,e[1]=p+g*c,e[5]=d-x*c,e[9]=-a*l,e[2]=x-d*c,e[6]=g+p*c,e[10]=o*l}else if(t.order==="YXZ"){const d=l*h,p=l*u,g=c*h,x=c*u;e[0]=d+x*a,e[4]=g*a-p,e[8]=o*c,e[1]=o*u,e[5]=o*h,e[9]=-a,e[2]=p*a-g,e[6]=x+d*a,e[10]=o*l}else if(t.order==="ZXY"){const d=l*h,p=l*u,g=c*h,x=c*u;e[0]=d-x*a,e[4]=-o*u,e[8]=g+p*a,e[1]=p+g*a,e[5]=o*h,e[9]=x-d*a,e[2]=-o*c,e[6]=a,e[10]=o*l}else if(t.order==="ZYX"){const d=o*h,p=o*u,g=a*h,x=a*u;e[0]=l*h,e[4]=g*c-p,e[8]=d*c+x,e[1]=l*u,e[5]=x*c+d,e[9]=p*c-g,e[2]=-c,e[6]=a*l,e[10]=o*l}else if(t.order==="YZX"){const d=o*l,p=o*c,g=a*l,x=a*c;e[0]=l*h,e[4]=x-d*u,e[8]=g*u+p,e[1]=u,e[5]=o*h,e[9]=-a*h,e[2]=-c*h,e[6]=p*u+g,e[10]=d-x*u}else if(t.order==="XZY"){const d=o*l,p=o*c,g=a*l,x=a*c;e[0]=l*h,e[4]=-u,e[8]=c*h,e[1]=d*u+x,e[5]=o*h,e[9]=p*u-g,e[2]=g*u-p,e[6]=a*h,e[10]=x*u+d}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Ud,t,Fd)}lookAt(t,e,n){const s=this.elements;return en.subVectors(t,e),en.lengthSq()===0&&(en.z=1),en.normalize(),jn.crossVectors(n,en),jn.lengthSq()===0&&(Math.abs(n.z)===1?en.x+=1e-4:en.z+=1e-4,en.normalize(),jn.crossVectors(n,en)),jn.normalize(),rr.crossVectors(en,jn),s[0]=jn.x,s[4]=rr.x,s[8]=en.x,s[1]=jn.y,s[5]=rr.y,s[9]=en.y,s[2]=jn.z,s[6]=rr.z,s[10]=en.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],u=n[5],d=n[9],p=n[13],g=n[2],x=n[6],m=n[10],f=n[14],A=n[3],v=n[7],S=n[11],w=n[15],R=s[0],P=s[4],I=s[8],y=s[12],C=s[1],U=s[5],V=s[9],X=s[13],Y=s[2],j=s[6],Z=s[10],O=s[14],z=s[3],pt=s[7],at=s[11],_t=s[15];return r[0]=o*R+a*C+l*Y+c*z,r[4]=o*P+a*U+l*j+c*pt,r[8]=o*I+a*V+l*Z+c*at,r[12]=o*y+a*X+l*O+c*_t,r[1]=h*R+u*C+d*Y+p*z,r[5]=h*P+u*U+d*j+p*pt,r[9]=h*I+u*V+d*Z+p*at,r[13]=h*y+u*X+d*O+p*_t,r[2]=g*R+x*C+m*Y+f*z,r[6]=g*P+x*U+m*j+f*pt,r[10]=g*I+x*V+m*Z+f*at,r[14]=g*y+x*X+m*O+f*_t,r[3]=A*R+v*C+S*Y+w*z,r[7]=A*P+v*U+S*j+w*pt,r[11]=A*I+v*V+S*Z+w*at,r[15]=A*y+v*X+S*O+w*_t,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],o=t[1],a=t[5],l=t[9],c=t[13],h=t[2],u=t[6],d=t[10],p=t[14],g=t[3],x=t[7],m=t[11],f=t[15],A=l*p-c*d,v=a*p-c*u,S=a*d-l*u,w=o*p-c*h,R=o*d-l*h,P=o*u-a*h;return e*(x*A-m*v+f*S)-n*(g*A-m*w+f*R)+s*(g*v-x*w+f*P)-r*(g*S-x*R+m*P)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],u=t[9],d=t[10],p=t[11],g=t[12],x=t[13],m=t[14],f=t[15],A=u*m*c-x*d*c+x*l*p-a*m*p-u*l*f+a*d*f,v=g*d*c-h*m*c-g*l*p+o*m*p+h*l*f-o*d*f,S=h*x*c-g*u*c+g*a*p-o*x*p-h*a*f+o*u*f,w=g*u*l-h*x*l-g*a*d+o*x*d+h*a*m-o*u*m,R=e*A+n*v+s*S+r*w;if(R===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const P=1/R;return t[0]=A*P,t[1]=(x*d*r-u*m*r-x*s*p+n*m*p+u*s*f-n*d*f)*P,t[2]=(a*m*r-x*l*r+x*s*c-n*m*c-a*s*f+n*l*f)*P,t[3]=(u*l*r-a*d*r-u*s*c+n*d*c+a*s*p-n*l*p)*P,t[4]=v*P,t[5]=(h*m*r-g*d*r+g*s*p-e*m*p-h*s*f+e*d*f)*P,t[6]=(g*l*r-o*m*r-g*s*c+e*m*c+o*s*f-e*l*f)*P,t[7]=(o*d*r-h*l*r+h*s*c-e*d*c-o*s*p+e*l*p)*P,t[8]=S*P,t[9]=(g*u*r-h*x*r-g*n*p+e*x*p+h*n*f-e*u*f)*P,t[10]=(o*x*r-g*a*r+g*n*c-e*x*c-o*n*f+e*a*f)*P,t[11]=(h*a*r-o*u*r-h*n*c+e*u*c+o*n*p-e*a*p)*P,t[12]=w*P,t[13]=(h*x*s-g*u*s+g*n*d-e*x*d-h*n*m+e*u*m)*P,t[14]=(g*a*s-o*x*s-g*n*l+e*x*l+o*n*m-e*a*m)*P,t[15]=(o*u*s-h*a*s+h*n*l-e*u*l-o*n*d+e*a*d)*P,this}scale(t){const e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),s=Math.sin(e),r=1-n,o=t.x,a=t.y,l=t.z,c=r*o,h=r*a;return this.set(c*o+n,c*a-s*l,c*l+s*a,0,c*a+s*l,h*a+n,h*l-s*o,0,c*l-s*a,h*l+s*o,r*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,o){return this.set(1,n,r,0,t,1,o,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){const s=this.elements,r=e._x,o=e._y,a=e._z,l=e._w,c=r+r,h=o+o,u=a+a,d=r*c,p=r*h,g=r*u,x=o*h,m=o*u,f=a*u,A=l*c,v=l*h,S=l*u,w=n.x,R=n.y,P=n.z;return s[0]=(1-(x+f))*w,s[1]=(p+S)*w,s[2]=(g-v)*w,s[3]=0,s[4]=(p-S)*R,s[5]=(1-(d+f))*R,s[6]=(m+A)*R,s[7]=0,s[8]=(g+v)*P,s[9]=(m-A)*P,s[10]=(1-(d+x))*P,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){const s=this.elements;if(t.x=s[12],t.y=s[13],t.z=s[14],this.determinant()===0)return n.set(1,1,1),e.identity(),this;let r=Hi.set(s[0],s[1],s[2]).length();const o=Hi.set(s[4],s[5],s[6]).length(),a=Hi.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),dn.copy(this);const c=1/r,h=1/o,u=1/a;return dn.elements[0]*=c,dn.elements[1]*=c,dn.elements[2]*=c,dn.elements[4]*=h,dn.elements[5]*=h,dn.elements[6]*=h,dn.elements[8]*=u,dn.elements[9]*=u,dn.elements[10]*=u,e.setFromRotationMatrix(dn),n.x=r,n.y=o,n.z=a,this}makePerspective(t,e,n,s,r,o,a=bn,l=!1){const c=this.elements,h=2*r/(e-t),u=2*r/(n-s),d=(e+t)/(e-t),p=(n+s)/(n-s);let g,x;if(l)g=r/(o-r),x=o*r/(o-r);else if(a===bn)g=-(o+r)/(o-r),x=-2*o*r/(o-r);else if(a===Br)g=-o/(o-r),x=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=p,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=x,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,s,r,o,a=bn,l=!1){const c=this.elements,h=2/(e-t),u=2/(n-s),d=-(e+t)/(e-t),p=-(n+s)/(n-s);let g,x;if(l)g=1/(o-r),x=o/(o-r);else if(a===bn)g=-2/(o-r),x=-(o+r)/(o-r);else if(a===Br)g=-1/(o-r),x=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=p,c[2]=0,c[6]=0,c[10]=g,c[14]=x,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}}const Hi=new N,dn=new ue,Ud=new N(0,0,0),Fd=new N(1,1,1),jn=new N,rr=new N,en=new N,kl=new ue,zl=new Di;class wn{constructor(t=0,e=0,n=0,s=wn.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const s=t.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],h=s[9],u=s[2],d=s[6],p=s[10];switch(e){case"XYZ":this._y=Math.asin(Zt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,p),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Zt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,p),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(Zt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,p),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Zt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,p),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(Zt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(a,p));break;case"XZY":this._z=Math.asin(-Zt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,p),this._y=0);break;default:Vt("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return kl.makeRotationFromQuaternion(t),this.setFromRotationMatrix(kl,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return zl.setFromEuler(this),this.setFromQuaternion(zl,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}wn.DEFAULT_ORDER="XYZ";class dh{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let Od=0;const Vl=new N,Wi=new Di,Un=new ue,or=new N,vs=new N,Bd=new N,kd=new Di,Gl=new N(1,0,0),Hl=new N(0,1,0),Wl=new N(0,0,1),Xl={type:"added"},zd={type:"removed"},Xi={type:"childadded",child:null},_o={type:"childremoved",child:null};class Le extends Ui{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Od++}),this.uuid=Fi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Le.DEFAULT_UP.clone();const t=new N,e=new wn,n=new Di,s=new N(1,1,1);function r(){n.setFromEuler(e,!1)}function o(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new ue},normalMatrix:{value:new Xt}}),this.matrix=new ue,this.matrixWorld=new ue,this.matrixAutoUpdate=Le.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Le.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new dh,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Wi.setFromAxisAngle(t,e),this.quaternion.multiply(Wi),this}rotateOnWorldAxis(t,e){return Wi.setFromAxisAngle(t,e),this.quaternion.premultiply(Wi),this}rotateX(t){return this.rotateOnAxis(Gl,t)}rotateY(t){return this.rotateOnAxis(Hl,t)}rotateZ(t){return this.rotateOnAxis(Wl,t)}translateOnAxis(t,e){return Vl.copy(t).applyQuaternion(this.quaternion),this.position.add(Vl.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Gl,t)}translateY(t){return this.translateOnAxis(Hl,t)}translateZ(t){return this.translateOnAxis(Wl,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Un.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?or.copy(t):or.set(t,e,n);const s=this.parent;this.updateWorldMatrix(!0,!1),vs.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Un.lookAt(vs,or,this.up):Un.lookAt(or,vs,this.up),this.quaternion.setFromRotationMatrix(Un),s&&(Un.extractRotation(s.matrixWorld),Wi.setFromRotationMatrix(Un),this.quaternion.premultiply(Wi.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(ee("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Xl),Xi.child=t,this.dispatchEvent(Xi),Xi.child=null):ee("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(zd),_o.child=t,this.dispatchEvent(_o),_o.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Un.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Un.multiply(t.parent.matrixWorld)),t.applyMatrix4(Un),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Xl),Xi.child=t,this.dispatchEvent(Xi),Xi.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){const o=this.children[n].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(vs,t,Bd),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(vs,kd,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e){const n=this.parent;if(t===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const u=l[c];r(t.shapes,u)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(t.materials,this.material[l]));s.material=a}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];s.animations.push(r(t.animations,l))}}if(e){const a=o(t.geometries),l=o(t.materials),c=o(t.textures),h=o(t.images),u=o(t.shapes),d=o(t.skeletons),p=o(t.animations),g=o(t.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),p.length>0&&(n.animations=p),g.length>0&&(n.nodes=g)}return n.object=s,n;function o(a){const l=[];for(const c in a){const h=a[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const s=t.children[n];this.add(s.clone())}return this}}Le.DEFAULT_UP=new N(0,1,0);Le.DEFAULT_MATRIX_AUTO_UPDATE=!0;Le.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const fn=new N,Fn=new N,vo=new N,On=new N,Yi=new N,qi=new N,Yl=new N,yo=new N,So=new N,Mo=new N,bo=new ve,Eo=new ve,Ao=new ve;class pn{constructor(t=new N,e=new N,n=new N){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),fn.subVectors(t,e),s.cross(fn);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){fn.subVectors(s,e),Fn.subVectors(n,e),vo.subVectors(t,e);const o=fn.dot(fn),a=fn.dot(Fn),l=fn.dot(vo),c=Fn.dot(Fn),h=Fn.dot(vo),u=o*c-a*a;if(u===0)return r.set(0,0,0),null;const d=1/u,p=(c*l-a*h)*d,g=(o*h-a*l)*d;return r.set(1-p-g,g,p)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,On)===null?!1:On.x>=0&&On.y>=0&&On.x+On.y<=1}static getInterpolation(t,e,n,s,r,o,a,l){return this.getBarycoord(t,e,n,s,On)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,On.x),l.addScaledVector(o,On.y),l.addScaledVector(a,On.z),l)}static getInterpolatedAttribute(t,e,n,s,r,o){return bo.setScalar(0),Eo.setScalar(0),Ao.setScalar(0),bo.fromBufferAttribute(t,e),Eo.fromBufferAttribute(t,n),Ao.fromBufferAttribute(t,s),o.setScalar(0),o.addScaledVector(bo,r.x),o.addScaledVector(Eo,r.y),o.addScaledVector(Ao,r.z),o}static isFrontFacing(t,e,n,s){return fn.subVectors(n,e),Fn.subVectors(t,e),fn.cross(Fn).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return fn.subVectors(this.c,this.b),Fn.subVectors(this.a,this.b),fn.cross(Fn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return pn.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return pn.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return pn.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return pn.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return pn.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,s=this.b,r=this.c;let o,a;Yi.subVectors(s,n),qi.subVectors(r,n),yo.subVectors(t,n);const l=Yi.dot(yo),c=qi.dot(yo);if(l<=0&&c<=0)return e.copy(n);So.subVectors(t,s);const h=Yi.dot(So),u=qi.dot(So);if(h>=0&&u<=h)return e.copy(s);const d=l*u-h*c;if(d<=0&&l>=0&&h<=0)return o=l/(l-h),e.copy(n).addScaledVector(Yi,o);Mo.subVectors(t,r);const p=Yi.dot(Mo),g=qi.dot(Mo);if(g>=0&&p<=g)return e.copy(r);const x=p*c-l*g;if(x<=0&&c>=0&&g<=0)return a=c/(c-g),e.copy(n).addScaledVector(qi,a);const m=h*g-p*u;if(m<=0&&u-h>=0&&p-g>=0)return Yl.subVectors(r,s),a=(u-h)/(u-h+(p-g)),e.copy(s).addScaledVector(Yl,a);const f=1/(m+x+d);return o=x*f,a=d*f,e.copy(n).addScaledVector(Yi,o).addScaledVector(qi,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const fh={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Kn={h:0,s:0,l:0},ar={h:0,s:0,l:0};function To(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}class jt{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){const s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=sn){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Qt.colorSpaceToWorking(this,e),this}setRGB(t,e,n,s=Qt.workingColorSpace){return this.r=t,this.g=e,this.b=n,Qt.colorSpaceToWorking(this,s),this}setHSL(t,e,n,s=Qt.workingColorSpace){if(t=Qa(t,1),e=Zt(e,0,1),n=Zt(n,0,1),e===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+e):n+e-n*e,o=2*n-r;this.r=To(o,r,t+1/3),this.g=To(o,r,t),this.b=To(o,r,t-1/3)}return Qt.colorSpaceToWorking(this,s),this}setStyle(t,e=sn){function n(r){r!==void 0&&parseFloat(r)<1&&Vt("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r;const o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:Vt("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){const r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);Vt("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=sn){const n=fh[t.toLowerCase()];return n!==void 0?this.setHex(n,e):Vt("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Hn(t.r),this.g=Hn(t.g),this.b=Hn(t.b),this}copyLinearToSRGB(t){return this.r=is(t.r),this.g=is(t.g),this.b=is(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=sn){return Qt.workingToColorSpace(Ne.copy(this),t),Math.round(Zt(Ne.r*255,0,255))*65536+Math.round(Zt(Ne.g*255,0,255))*256+Math.round(Zt(Ne.b*255,0,255))}getHexString(t=sn){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Qt.workingColorSpace){Qt.workingToColorSpace(Ne.copy(this),e);const n=Ne.r,s=Ne.g,r=Ne.b,o=Math.max(n,s,r),a=Math.min(n,s,r);let l,c;const h=(a+o)/2;if(a===o)l=0,c=0;else{const u=o-a;switch(c=h<=.5?u/(o+a):u/(2-o-a),o){case n:l=(s-r)/u+(s<r?6:0);break;case s:l=(r-n)/u+2;break;case r:l=(n-s)/u+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=Qt.workingColorSpace){return Qt.workingToColorSpace(Ne.copy(this),e),t.r=Ne.r,t.g=Ne.g,t.b=Ne.b,t}getStyle(t=sn){Qt.workingToColorSpace(Ne.copy(this),t);const e=Ne.r,n=Ne.g,s=Ne.b;return t!==sn?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(Kn),this.setHSL(Kn.h+t,Kn.s+e,Kn.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Kn),t.getHSL(ar);const n=Ds(Kn.h,ar.h,e),s=Ds(Kn.s,ar.s,e),r=Ds(Kn.l,ar.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Ne=new jt;jt.NAMES=fh;let Vd=0;class fs extends Ui{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Vd++}),this.uuid=Fi(),this.name="",this.type="Material",this.blending=ns,this.side=li,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=qo,this.blendDst=$o,this.blendEquation=Si,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new jt(0,0,0),this.blendAlpha=0,this.depthFunc=rs,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Rl,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Bi,this.stencilZFail=Bi,this.stencilZPass=Bi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){Vt(`Material: parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){Vt(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==ns&&(n.blending=this.blending),this.side!==li&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==qo&&(n.blendSrc=this.blendSrc),this.blendDst!==$o&&(n.blendDst=this.blendDst),this.blendEquation!==Si&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==rs&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Rl&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Bi&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Bi&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Bi&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){const o=[];for(const a in r){const l=r[a];delete l.metadata,o.push(l)}return o}if(e){const r=s(t.textures),o=s(t.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}}class ph extends fs{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new jt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new wn,this.combine=qc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const Ee=new N,lr=new ct;let Gd=0;class gn{constructor(t,e,n=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Gd++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=Ll,this.updateRanges=[],this.gpuType=Mn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)lr.fromBufferAttribute(this,e),lr.applyMatrix3(t),this.setXY(e,lr.x,lr.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)Ee.fromBufferAttribute(this,e),Ee.applyMatrix3(t),this.setXYZ(e,Ee.x,Ee.y,Ee.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)Ee.fromBufferAttribute(this,e),Ee.applyMatrix4(t),this.setXYZ(e,Ee.x,Ee.y,Ee.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Ee.fromBufferAttribute(this,e),Ee.applyNormalMatrix(t),this.setXYZ(e,Ee.x,Ee.y,Ee.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Ee.fromBufferAttribute(this,e),Ee.transformDirection(t),this.setXYZ(e,Ee.x,Ee.y,Ee.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=Ji(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=Ve(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Ji(e,this.array)),e}setX(t,e){return this.normalized&&(e=Ve(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Ji(e,this.array)),e}setY(t,e){return this.normalized&&(e=Ve(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Ji(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Ve(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Ji(e,this.array)),e}setW(t,e){return this.normalized&&(e=Ve(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=Ve(e,this.array),n=Ve(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=Ve(e,this.array),n=Ve(n,this.array),s=Ve(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=Ve(e,this.array),n=Ve(n,this.array),s=Ve(s,this.array),r=Ve(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Ll&&(t.usage=this.usage),t}}class mh extends gn{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class gh extends gn{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class Se extends gn{constructor(t,e,n){super(new Float32Array(t),e,n)}}let Hd=0;const ln=new ue,Co=new Le,$i=new N,nn=new $s,ys=new $s,Re=new N;class Oe extends Ui{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Hd++}),this.uuid=Fi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(hh(t)?gh:mh)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new Xt().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return ln.makeRotationFromQuaternion(t),this.applyMatrix4(ln),this}rotateX(t){return ln.makeRotationX(t),this.applyMatrix4(ln),this}rotateY(t){return ln.makeRotationY(t),this.applyMatrix4(ln),this}rotateZ(t){return ln.makeRotationZ(t),this.applyMatrix4(ln),this}translate(t,e,n){return ln.makeTranslation(t,e,n),this.applyMatrix4(ln),this}scale(t,e,n){return ln.makeScale(t,e,n),this.applyMatrix4(ln),this}lookAt(t){return Co.lookAt(t),Co.updateMatrix(),this.applyMatrix4(Co.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter($i).negate(),this.translate($i.x,$i.y,$i.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const n=[];for(let s=0,r=t.length;s<r;s++){const o=t[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Se(n,3))}else{const n=Math.min(t.length,e.count);for(let s=0;s<n;s++){const r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&Vt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new $s);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){ee("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new N(-1/0,-1/0,-1/0),new N(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){const r=e[n];nn.setFromBufferAttribute(r),this.morphTargetsRelative?(Re.addVectors(this.boundingBox.min,nn.min),this.boundingBox.expandByPoint(Re),Re.addVectors(this.boundingBox.max,nn.max),this.boundingBox.expandByPoint(Re)):(this.boundingBox.expandByPoint(nn.min),this.boundingBox.expandByPoint(nn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&ee('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new $r);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){ee("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new N,1/0);return}if(t){const n=this.boundingSphere.center;if(nn.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){const a=e[r];ys.setFromBufferAttribute(a),this.morphTargetsRelative?(Re.addVectors(nn.min,ys.min),nn.expandByPoint(Re),Re.addVectors(nn.max,ys.max),nn.expandByPoint(Re)):(nn.expandByPoint(ys.min),nn.expandByPoint(ys.max))}nn.getCenter(n);let s=0;for(let r=0,o=t.count;r<o;r++)Re.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(Re));if(e)for(let r=0,o=e.length;r<o;r++){const a=e[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)Re.fromBufferAttribute(a,c),l&&($i.fromBufferAttribute(t,c),Re.add($i)),s=Math.max(s,n.distanceToSquared(Re))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&ee('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){ee("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=e.position,s=e.normal,r=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new gn(new Float32Array(4*n.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let I=0;I<n.count;I++)a[I]=new N,l[I]=new N;const c=new N,h=new N,u=new N,d=new ct,p=new ct,g=new ct,x=new N,m=new N;function f(I,y,C){c.fromBufferAttribute(n,I),h.fromBufferAttribute(n,y),u.fromBufferAttribute(n,C),d.fromBufferAttribute(r,I),p.fromBufferAttribute(r,y),g.fromBufferAttribute(r,C),h.sub(c),u.sub(c),p.sub(d),g.sub(d);const U=1/(p.x*g.y-g.x*p.y);isFinite(U)&&(x.copy(h).multiplyScalar(g.y).addScaledVector(u,-p.y).multiplyScalar(U),m.copy(u).multiplyScalar(p.x).addScaledVector(h,-g.x).multiplyScalar(U),a[I].add(x),a[y].add(x),a[C].add(x),l[I].add(m),l[y].add(m),l[C].add(m))}let A=this.groups;A.length===0&&(A=[{start:0,count:t.count}]);for(let I=0,y=A.length;I<y;++I){const C=A[I],U=C.start,V=C.count;for(let X=U,Y=U+V;X<Y;X+=3)f(t.getX(X+0),t.getX(X+1),t.getX(X+2))}const v=new N,S=new N,w=new N,R=new N;function P(I){w.fromBufferAttribute(s,I),R.copy(w);const y=a[I];v.copy(y),v.sub(w.multiplyScalar(w.dot(y))).normalize(),S.crossVectors(R,y);const U=S.dot(l[I])<0?-1:1;o.setXYZW(I,v.x,v.y,v.z,U)}for(let I=0,y=A.length;I<y;++I){const C=A[I],U=C.start,V=C.count;for(let X=U,Y=U+V;X<Y;X+=3)P(t.getX(X+0)),P(t.getX(X+1)),P(t.getX(X+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new gn(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let d=0,p=n.count;d<p;d++)n.setXYZ(d,0,0,0);const s=new N,r=new N,o=new N,a=new N,l=new N,c=new N,h=new N,u=new N;if(t)for(let d=0,p=t.count;d<p;d+=3){const g=t.getX(d+0),x=t.getX(d+1),m=t.getX(d+2);s.fromBufferAttribute(e,g),r.fromBufferAttribute(e,x),o.fromBufferAttribute(e,m),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),a.fromBufferAttribute(n,g),l.fromBufferAttribute(n,x),c.fromBufferAttribute(n,m),a.add(h),l.add(h),c.add(h),n.setXYZ(g,a.x,a.y,a.z),n.setXYZ(x,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let d=0,p=e.count;d<p;d+=3)s.fromBufferAttribute(e,d+0),r.fromBufferAttribute(e,d+1),o.fromBufferAttribute(e,d+2),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)Re.fromBufferAttribute(t,e),Re.normalize(),t.setXYZ(e,Re.x,Re.y,Re.z)}toNonIndexed(){function t(a,l){const c=a.array,h=a.itemSize,u=a.normalized,d=new c.constructor(l.length*h);let p=0,g=0;for(let x=0,m=l.length;x<m;x++){a.isInterleavedBufferAttribute?p=l[x]*a.data.stride+a.offset:p=l[x]*h;for(let f=0;f<h;f++)d[g++]=c[p++]}return new gn(d,h,u)}if(this.index===null)return Vt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new Oe,n=this.index.array,s=this.attributes;for(const a in s){const l=s[a],c=t(l,n);e.setAttribute(a,c)}const r=this.morphAttributes;for(const a in r){const l=[],c=r[a];for(let h=0,u=c.length;h<u;h++){const d=c[h],p=t(d,n);l.push(p)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){const t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const l in n){const c=n[l];t.data.attributes[l]=c.toJSON(t.data)}const s={};let r=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let u=0,d=c.length;u<d;u++){const p=c[u];h.push(p.toJSON(t.data))}h.length>0&&(s[l]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(t.data.boundingSphere=a.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone());const s=t.attributes;for(const c in s){const h=s[c];this.setAttribute(c,h.clone(e))}const r=t.morphAttributes;for(const c in r){const h=[],u=r[c];for(let d=0,p=u.length;d<p;d++)h.push(u[d].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;const o=t.groups;for(let c=0,h=o.length;c<h;c++){const u=o[c];this.addGroup(u.start,u.count,u.materialIndex)}const a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const ql=new ue,gi=new el,cr=new $r,$l=new N,hr=new N,ur=new N,dr=new N,wo=new N,fr=new N,Zl=new N,pr=new N;class xn extends Le{constructor(t=new Oe,e=new ph){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){const n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;e.fromBufferAttribute(s,t);const a=this.morphTargetInfluences;if(r&&a){fr.set(0,0,0);for(let l=0,c=r.length;l<c;l++){const h=a[l],u=r[l];h!==0&&(wo.fromBufferAttribute(u,t),o?fr.addScaledVector(wo,h):fr.addScaledVector(wo.sub(e),h))}e.add(fr)}return e}raycast(t,e){const n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),cr.copy(n.boundingSphere),cr.applyMatrix4(r),gi.copy(t.ray).recast(t.near),!(cr.containsPoint(gi.origin)===!1&&(gi.intersectSphere(cr,$l)===null||gi.origin.distanceToSquared($l)>(t.far-t.near)**2))&&(ql.copy(r).invert(),gi.copy(t.ray).applyMatrix4(ql),!(n.boundingBox!==null&&gi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,gi)))}_computeIntersections(t,e,n){let s;const r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,p=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,x=d.length;g<x;g++){const m=d[g],f=o[m.materialIndex],A=Math.max(m.start,p.start),v=Math.min(a.count,Math.min(m.start+m.count,p.start+p.count));for(let S=A,w=v;S<w;S+=3){const R=a.getX(S),P=a.getX(S+1),I=a.getX(S+2);s=mr(this,f,t,n,c,h,u,R,P,I),s&&(s.faceIndex=Math.floor(S/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{const g=Math.max(0,p.start),x=Math.min(a.count,p.start+p.count);for(let m=g,f=x;m<f;m+=3){const A=a.getX(m),v=a.getX(m+1),S=a.getX(m+2);s=mr(this,o,t,n,c,h,u,A,v,S),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,x=d.length;g<x;g++){const m=d[g],f=o[m.materialIndex],A=Math.max(m.start,p.start),v=Math.min(l.count,Math.min(m.start+m.count,p.start+p.count));for(let S=A,w=v;S<w;S+=3){const R=S,P=S+1,I=S+2;s=mr(this,f,t,n,c,h,u,R,P,I),s&&(s.faceIndex=Math.floor(S/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{const g=Math.max(0,p.start),x=Math.min(l.count,p.start+p.count);for(let m=g,f=x;m<f;m+=3){const A=m,v=m+1,S=m+2;s=mr(this,o,t,n,c,h,u,A,v,S),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}}}function Wd(i,t,e,n,s,r,o,a){let l;if(t.side===Ke?l=n.intersectTriangle(o,r,s,!0,a):l=n.intersectTriangle(s,r,o,t.side===li,a),l===null)return null;pr.copy(a),pr.applyMatrix4(i.matrixWorld);const c=e.ray.origin.distanceTo(pr);return c<e.near||c>e.far?null:{distance:c,point:pr.clone(),object:i}}function mr(i,t,e,n,s,r,o,a,l,c){i.getVertexPosition(a,hr),i.getVertexPosition(l,ur),i.getVertexPosition(c,dr);const h=Wd(i,t,e,n,hr,ur,dr,Zl);if(h){const u=new N;pn.getBarycoord(Zl,hr,ur,dr,u),s&&(h.uv=pn.getInterpolatedAttribute(s,a,l,c,u,new ct)),r&&(h.uv1=pn.getInterpolatedAttribute(r,a,l,c,u,new ct)),o&&(h.normal=pn.getInterpolatedAttribute(o,a,l,c,u,new N),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const d={a,b:l,c,normal:new N,materialIndex:0};pn.getNormal(hr,ur,dr,d.normal),h.face=d,h.barycoord=u}return h}class Ii extends Oe{constructor(t=1,e=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};const a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);const l=[],c=[],h=[],u=[];let d=0,p=0;g("z","y","x",-1,-1,n,e,t,o,r,0),g("z","y","x",1,-1,n,e,-t,o,r,1),g("x","z","y",1,1,t,n,e,s,o,2),g("x","z","y",1,-1,t,n,-e,s,o,3),g("x","y","z",1,-1,t,e,n,s,r,4),g("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new Se(c,3)),this.setAttribute("normal",new Se(h,3)),this.setAttribute("uv",new Se(u,2));function g(x,m,f,A,v,S,w,R,P,I,y){const C=S/P,U=w/I,V=S/2,X=w/2,Y=R/2,j=P+1,Z=I+1;let O=0,z=0;const pt=new N;for(let at=0;at<Z;at++){const _t=at*U-X;for(let Gt=0;Gt<j;Gt++){const Yt=Gt*C-V;pt[x]=Yt*A,pt[m]=_t*v,pt[f]=Y,c.push(pt.x,pt.y,pt.z),pt[x]=0,pt[m]=0,pt[f]=R>0?1:-1,h.push(pt.x,pt.y,pt.z),u.push(Gt/P),u.push(1-at/I),O+=1}}for(let at=0;at<I;at++)for(let _t=0;_t<P;_t++){const Gt=d+_t+j*at,Yt=d+_t+j*(at+1),$=d+(_t+1)+j*(at+1),F=d+(_t+1)+j*at;l.push(Gt,Yt,F),l.push(Yt,$,F),z+=6}a.addGroup(p,z,y),p+=z,d+=O}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ii(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function cs(i){const t={};for(const e in i){t[e]={};for(const n in i[e]){const s=i[e][n];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(Vt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone():Array.isArray(s)?t[e][n]=s.slice():t[e][n]=s}}return t}function Ge(i){const t={};for(let e=0;e<i.length;e++){const n=cs(i[e]);for(const s in n)t[s]=n[s]}return t}function Xd(i){const t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function xh(i){const t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Qt.workingColorSpace}const Yd={clone:cs,merge:Ge};var qd=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,$d=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Pn extends fs{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=qd,this.fragmentShader=$d,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=cs(t.uniforms),this.uniformsGroups=Xd(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const s in this.uniforms){const o=this.uniforms[s].value;o&&o.isTexture?e.uniforms[s]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[s]={type:"m4",value:o.toArray()}:e.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const n={};for(const s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}}class _h extends Le{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ue,this.projectionMatrix=new ue,this.projectionMatrixInverse=new ue,this.coordinateSystem=bn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Jn=new N,jl=new ct,Kl=new ct;class cn extends _h{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=Bs*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(Ls*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Bs*2*Math.atan(Math.tan(Ls*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){Jn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Jn.x,Jn.y).multiplyScalar(-t/Jn.z),Jn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Jn.x,Jn.y).multiplyScalar(-t/Jn.z)}getViewSize(t,e){return this.getViewBounds(t,jl,Kl),e.subVectors(Kl,jl)}setViewOffset(t,e,n,s,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(Ls*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,e-=o.offsetY*n/c,s*=o.width/l,n*=o.height/c}const a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const Zi=-90,ji=1;class Zd extends Le{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new cn(Zi,ji,t,e);s.layers=this.layers,this.add(s);const r=new cn(Zi,ji,t,e);r.layers=this.layers,this.add(r);const o=new cn(Zi,ji,t,e);o.layers=this.layers,this.add(o);const a=new cn(Zi,ji,t,e);a.layers=this.layers,this.add(a);const l=new cn(Zi,ji,t,e);l.layers=this.layers,this.add(l);const c=new cn(Zi,ji,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[n,s,r,o,a,l]=e;for(const c of e)this.remove(c);if(t===bn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===Br)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,l,c,h]=this.children,u=t.getRenderTarget(),d=t.getActiveCubeFace(),p=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;const x=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,t.setRenderTarget(n,0,s),t.render(e,r),t.setRenderTarget(n,1,s),t.render(e,o),t.setRenderTarget(n,2,s),t.render(e,a),t.setRenderTarget(n,3,s),t.render(e,l),t.setRenderTarget(n,4,s),t.render(e,c),n.texture.generateMipmaps=x,t.setRenderTarget(n,5,s),t.render(e,h),t.setRenderTarget(u,d,p),t.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class vh extends He{constructor(t=[],e=Li,n,s,r,o,a,l,c,h){super(t,e,n,s,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class yh extends An{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new vh(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new Ii(5,5,5),r=new Pn({name:"CubemapFromEquirect",uniforms:cs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Ke,blending:Gn});r.uniforms.tEquirect.value=e;const o=new xn(s,r),a=e.minFilter;return e.minFilter===Ti&&(e.minFilter=Fe),new Zd(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e=!0,n=!0,s=!0){const r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,n,s);t.setRenderTarget(r)}}class gr extends Le{constructor(){super(),this.isGroup=!0,this.type="Group"}}const jd={type:"move"};class Po{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new gr,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new gr,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new N,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new N),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new gr,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new N,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new N),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){o=!0;for(const x of t.hand.values()){const m=e.getJointPose(x,n),f=this._getHandJoint(c,x);m!==null&&(f.matrix.fromArray(m.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,f.jointRadius=m.radius),f.visible=m!==null}const h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],d=h.position.distanceTo(u.position),p=.02,g=.005;c.inputState.pinching&&d>p+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&d<=p-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(jd)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const n=new gr;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}class Kd extends Le{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new wn,this.environmentIntensity=1,this.environmentRotation=new wn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}class Jd extends He{constructor(t=null,e=1,n=1,s,r,o,a,l,c=De,h=De,u,d){super(null,o,a,l,c,h,s,r,u,d),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Ro=new N,Qd=new N,tf=new Xt;class ti{constructor(t=new N(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const s=Ro.subVectors(n,e).cross(Qd.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const n=t.delta(Ro),s=this.normal.dot(n);if(s===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const r=-(t.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:e.copy(t.start).addScaledVector(n,r)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||tf.getNormalMatrix(t),s=this.coplanarPoint(Ro).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const xi=new $r,ef=new ct(.5,.5),xr=new N;class nl{constructor(t=new ti,e=new ti,n=new ti,s=new ti,r=new ti,o=new ti){this.planes=[t,e,n,s,r,o]}set(t,e,n,s,r,o){const a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=bn,n=!1){const s=this.planes,r=t.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],u=r[5],d=r[6],p=r[7],g=r[8],x=r[9],m=r[10],f=r[11],A=r[12],v=r[13],S=r[14],w=r[15];if(s[0].setComponents(c-o,p-h,f-g,w-A).normalize(),s[1].setComponents(c+o,p+h,f+g,w+A).normalize(),s[2].setComponents(c+a,p+u,f+x,w+v).normalize(),s[3].setComponents(c-a,p-u,f-x,w-v).normalize(),n)s[4].setComponents(l,d,m,S).normalize(),s[5].setComponents(c-l,p-d,f-m,w-S).normalize();else if(s[4].setComponents(c-l,p-d,f-m,w-S).normalize(),e===bn)s[5].setComponents(c+l,p+d,f+m,w+S).normalize();else if(e===Br)s[5].setComponents(l,d,m,S).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),xi.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),xi.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(xi)}intersectsSprite(t){xi.center.set(0,0,0);const e=ef.distanceTo(t.center);return xi.radius=.7071067811865476+e,xi.applyMatrix4(t.matrixWorld),this.intersectsSphere(xi)}intersectsSphere(t){const e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const s=e[n];if(xr.x=s.normal.x>0?t.max.x:t.min.x,xr.y=s.normal.y>0?t.max.y:t.min.y,xr.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(xr)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Zr extends fs{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new jt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}}const zr=new N,Vr=new N,Jl=new ue,Ss=new el,_r=new $r,Lo=new N,Ql=new N;class Sh extends Le{constructor(t=new Oe,e=new Zr){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,n=[0];for(let s=1,r=e.count;s<r;s++)zr.fromBufferAttribute(e,s-1),Vr.fromBufferAttribute(e,s),n[s]=n[s-1],n[s]+=zr.distanceTo(Vr);t.setAttribute("lineDistance",new Se(n,1))}else Vt("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(t,e){const n=this.geometry,s=this.matrixWorld,r=t.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),_r.copy(n.boundingSphere),_r.applyMatrix4(s),_r.radius+=r,t.ray.intersectsSphere(_r)===!1)return;Jl.copy(s).invert(),Ss.copy(t.ray).applyMatrix4(Jl);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,h=n.index,d=n.attributes.position;if(h!==null){const p=Math.max(0,o.start),g=Math.min(h.count,o.start+o.count);for(let x=p,m=g-1;x<m;x+=c){const f=h.getX(x),A=h.getX(x+1),v=vr(this,t,Ss,l,f,A,x);v&&e.push(v)}if(this.isLineLoop){const x=h.getX(g-1),m=h.getX(p),f=vr(this,t,Ss,l,x,m,g-1);f&&e.push(f)}}else{const p=Math.max(0,o.start),g=Math.min(d.count,o.start+o.count);for(let x=p,m=g-1;x<m;x+=c){const f=vr(this,t,Ss,l,x,x+1,x);f&&e.push(f)}if(this.isLineLoop){const x=vr(this,t,Ss,l,g-1,p,g-1);x&&e.push(x)}}}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function vr(i,t,e,n,s,r,o){const a=i.geometry.attributes.position;if(zr.fromBufferAttribute(a,s),Vr.fromBufferAttribute(a,r),e.distanceSqToSegment(zr,Vr,Lo,Ql)>n)return;Lo.applyMatrix4(i.matrixWorld);const c=t.ray.origin.distanceTo(Lo);if(!(c<t.near||c>t.far))return{distance:c,point:Ql.clone().applyMatrix4(i.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:i}}const tc=new N,ec=new N;class Mh extends Sh{constructor(t,e){super(t,e),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,n=[];for(let s=0,r=e.count;s<r;s+=2)tc.fromBufferAttribute(e,s),ec.fromBufferAttribute(e,s+1),n[s]=s===0?0:n[s-1],n[s+1]=n[s]+tc.distanceTo(ec);t.setAttribute("lineDistance",new Se(n,1))}else Vt("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class ks extends He{constructor(t,e,n=Cn,s,r,o,a=De,l=De,c,h=Xn,u=1){if(h!==Xn&&h!==Ci)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const d={width:t,height:e,depth:u};super(d,s,r,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new tl(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}class nf extends ks{constructor(t,e=Cn,n=Li,s,r,o=De,a=De,l,c=Xn){const h={width:t,height:t,depth:1},u=[h,h,h,h,h,h];super(t,t,e,n,s,r,o,a,l,c),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}}class bh extends He{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}}class Ln{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Vt("Curve: .getPoint() not implemented.")}getPointAt(t,e){const n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){const t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const e=[];let n,s=this.getPoint(0),r=0;e.push(0);for(let o=1;o<=t;o++)n=this.getPoint(o/t),r+=n.distanceTo(s),e.push(r),s=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e=null){const n=this.getLengths();let s=0;const r=n.length;let o;e?o=e:o=t*n[r-1];let a=0,l=r-1,c;for(;a<=l;)if(s=Math.floor(a+(l-a)/2),c=n[s]-o,c<0)a=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,n[s]===o)return s/(r-1);const h=n[s],d=n[s+1]-h,p=(o-h)/d;return(s+p)/(r-1)}getTangent(t,e){let s=t-1e-4,r=t+1e-4;s<0&&(s=0),r>1&&(r=1);const o=this.getPoint(s),a=this.getPoint(r),l=e||(o.isVector2?new ct:new N);return l.copy(a).sub(o).normalize(),l}getTangentAt(t,e){const n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e=!1){const n=new N,s=[],r=[],o=[],a=new N,l=new ue;for(let p=0;p<=t;p++){const g=p/t;s[p]=this.getTangentAt(g,new N)}r[0]=new N,o[0]=new N;let c=Number.MAX_VALUE;const h=Math.abs(s[0].x),u=Math.abs(s[0].y),d=Math.abs(s[0].z);h<=c&&(c=h,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),a.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],a),o[0].crossVectors(s[0],r[0]);for(let p=1;p<=t;p++){if(r[p]=r[p-1].clone(),o[p]=o[p-1].clone(),a.crossVectors(s[p-1],s[p]),a.length()>Number.EPSILON){a.normalize();const g=Math.acos(Zt(s[p-1].dot(s[p]),-1,1));r[p].applyMatrix4(l.makeRotationAxis(a,g))}o[p].crossVectors(s[p],r[p])}if(e===!0){let p=Math.acos(Zt(r[0].dot(r[t]),-1,1));p/=t,s[0].dot(a.crossVectors(r[0],r[t]))>0&&(p=-p);for(let g=1;g<=t;g++)r[g].applyMatrix4(l.makeRotationAxis(s[g],p*g)),o[g].crossVectors(s[g],r[g])}return{tangents:s,normals:r,binormals:o}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){const t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}}class il extends Ln{constructor(t=0,e=0,n=1,s=1,r=0,o=Math.PI*2,a=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=o,this.aClockwise=a,this.aRotation=l}getPoint(t,e=new ct){const n=e,s=Math.PI*2;let r=this.aEndAngle-this.aStartAngle;const o=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(o?r=0:r=s),this.aClockwise===!0&&!o&&(r===s?r=-s:r=r-s);const a=this.aStartAngle+t*r;let l=this.aX+this.xRadius*Math.cos(a),c=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){const h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),d=l-this.aX,p=c-this.aY;l=d*h-p*u+this.aX,c=d*u+p*h+this.aY}return n.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){const t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}class sf extends il{constructor(t,e,n,s,r,o){super(t,e,n,n,s,r,o),this.isArcCurve=!0,this.type="ArcCurve"}}function sl(){let i=0,t=0,e=0,n=0;function s(r,o,a,l){i=r,t=a,e=-3*r+3*o-2*a-l,n=2*r-2*o+a+l}return{initCatmullRom:function(r,o,a,l,c){s(o,a,c*(a-r),c*(l-o))},initNonuniformCatmullRom:function(r,o,a,l,c,h,u){let d=(o-r)/c-(a-r)/(c+h)+(a-o)/h,p=(a-o)/h-(l-o)/(h+u)+(l-a)/u;d*=h,p*=h,s(o,a,d,p)},calc:function(r){const o=r*r,a=o*r;return i+t*r+e*o+n*a}}}const yr=new N,Do=new sl,Io=new sl,No=new sl;class rf extends Ln{constructor(t=[],e=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=s}getPoint(t,e=new N){const n=e,s=this.points,r=s.length,o=(r-(this.closed?0:1))*t;let a=Math.floor(o),l=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/r)+1)*r:l===0&&a===r-1&&(a=r-2,l=1);let c,h;this.closed||a>0?c=s[(a-1)%r]:(yr.subVectors(s[0],s[1]).add(s[0]),c=yr);const u=s[a%r],d=s[(a+1)%r];if(this.closed||a+2<r?h=s[(a+2)%r]:(yr.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=yr),this.curveType==="centripetal"||this.curveType==="chordal"){const p=this.curveType==="chordal"?.5:.25;let g=Math.pow(c.distanceToSquared(u),p),x=Math.pow(u.distanceToSquared(d),p),m=Math.pow(d.distanceToSquared(h),p);x<1e-4&&(x=1),g<1e-4&&(g=x),m<1e-4&&(m=x),Do.initNonuniformCatmullRom(c.x,u.x,d.x,h.x,g,x,m),Io.initNonuniformCatmullRom(c.y,u.y,d.y,h.y,g,x,m),No.initNonuniformCatmullRom(c.z,u.z,d.z,h.z,g,x,m)}else this.curveType==="catmullrom"&&(Do.initCatmullRom(c.x,u.x,d.x,h.x,this.tension),Io.initCatmullRom(c.y,u.y,d.y,h.y,this.tension),No.initCatmullRom(c.z,u.z,d.z,h.z,this.tension));return n.set(Do.calc(l),Io.calc(l),No.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(s.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const s=this.points[e];t.points.push(s.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(new N().fromArray(s))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}function nc(i,t,e,n,s){const r=(n-t)*.5,o=(s-e)*.5,a=i*i,l=i*a;return(2*e-2*n+r+o)*l+(-3*e+3*n-2*r-o)*a+r*i+e}function of(i,t){const e=1-i;return e*e*t}function af(i,t){return 2*(1-i)*i*t}function lf(i,t){return i*i*t}function Is(i,t,e,n){return of(i,t)+af(i,e)+lf(i,n)}function cf(i,t){const e=1-i;return e*e*e*t}function hf(i,t){const e=1-i;return 3*e*e*i*t}function uf(i,t){return 3*(1-i)*i*i*t}function df(i,t){return i*i*i*t}function Ns(i,t,e,n,s){return cf(i,t)+hf(i,e)+uf(i,n)+df(i,s)}class Eh extends Ln{constructor(t=new ct,e=new ct,n=new ct,s=new ct){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new ct){const n=e,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Ns(t,s.x,r.x,o.x,a.x),Ns(t,s.y,r.y,o.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Dr extends Ln{constructor(t=new N,e=new N,n=new N,s=new N){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new N){const n=e,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Ns(t,s.x,r.x,o.x,a.x),Ns(t,s.y,r.y,o.y,a.y),Ns(t,s.z,r.z,o.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Ah extends Ln{constructor(t=new ct,e=new ct){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new ct){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new ct){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Qn extends Ln{constructor(t=new N,e=new N){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new N){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new N){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Th extends Ln{constructor(t=new ct,e=new ct,n=new ct){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new ct){const n=e,s=this.v0,r=this.v1,o=this.v2;return n.set(Is(t,s.x,r.x,o.x),Is(t,s.y,r.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Ir extends Ln{constructor(t=new N,e=new N,n=new N){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new N){const n=e,s=this.v0,r=this.v1,o=this.v2;return n.set(Is(t,s.x,r.x,o.x),Is(t,s.y,r.y,o.y),Is(t,s.z,r.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Ch extends Ln{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new ct){const n=e,s=this.points,r=(s.length-1)*t,o=Math.floor(r),a=r-o,l=s[o===0?o:o-1],c=s[o],h=s[o>s.length-2?s.length-1:o+1],u=s[o>s.length-3?s.length-1:o+2];return n.set(nc(a,l.x,c.x,h.x,u.x),nc(a,l.y,c.y,h.y,u.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(s.clone())}return this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const s=this.points[e];t.points.push(s.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(new ct().fromArray(s))}return this}}var ic=Object.freeze({__proto__:null,ArcCurve:sf,CatmullRomCurve3:rf,CubicBezierCurve:Eh,CubicBezierCurve3:Dr,EllipseCurve:il,LineCurve:Ah,LineCurve3:Qn,QuadraticBezierCurve:Th,QuadraticBezierCurve3:Ir,SplineCurve:Ch});class wh extends Ln{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){const t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){const n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new ic[n](e,t))}return this}getPoint(t,e){const n=t*this.getLength(),s=this.getCurveLengths();let r=0;for(;r<s.length;){if(s[r]>=n){const o=s[r]-n,a=this.curves[r],l=a.getLength(),c=l===0?0:1-o/l;return a.getPointAt(c,e)}r++}return null}getLength(){const t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const t=[];let e=0;for(let n=0,s=this.curves.length;n<s;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){const e=[];let n;for(let s=0,r=this.curves;s<r.length;s++){const o=r[s],a=o.isEllipseCurve?t*2:o.isLineCurve||o.isLineCurve3?1:o.isSplineCurve?t*o.points.length:t,l=o.getPoints(a);for(let c=0;c<l.length;c++){const h=l[c];n&&n.equals(h)||(e.push(h),n=h)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const s=t.curves[e];this.curves.push(s.clone())}return this.autoClose=t.autoClose,this}toJSON(){const t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){const s=this.curves[e];t.curves.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const s=t.curves[e];this.curves.push(new ic[s.type]().fromJSON(s))}return this}}class ss extends wh{constructor(t){super(),this.type="Path",this.currentPoint=new ct,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){const n=new Ah(this.currentPoint.clone(),new ct(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,s){const r=new Th(this.currentPoint.clone(),new ct(t,e),new ct(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(t,e,n,s,r,o){const a=new Eh(this.currentPoint.clone(),new ct(t,e),new ct(n,s),new ct(r,o));return this.curves.push(a),this.currentPoint.set(r,o),this}splineThru(t){const e=[this.currentPoint.clone()].concat(t),n=new Ch(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,s,r,o){const a=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+a,e+l,n,s,r,o),this}absarc(t,e,n,s,r,o){return this.absellipse(t,e,n,n,s,r,o),this}ellipse(t,e,n,s,r,o,a,l){const c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(t+c,e+h,n,s,r,o,a,l),this}absellipse(t,e,n,s,r,o,a,l){const c=new il(t,e,n,s,r,o,a,l);if(this.curves.length>0){const u=c.getPoint(0);u.equals(this.currentPoint)||this.lineTo(u.x,u.y)}this.curves.push(c);const h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){const t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}}class Pi extends ss{constructor(t){super(t),this.uuid=Fi(),this.type="Shape",this.holes=[]}getPointsHoles(t){const e=[];for(let n=0,s=this.holes.length;n<s;n++)e[n]=this.holes[n].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){const s=t.holes[e];this.holes.push(s.clone())}return this}toJSON(){const t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,n=this.holes.length;e<n;e++){const s=this.holes[e];t.holes.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){const s=t.holes[e];this.holes.push(new ss().fromJSON(s))}return this}}function ff(i,t,e=2){const n=t&&t.length,s=n?t[0]*e:i.length;let r=Ph(i,0,s,e,!0);const o=[];if(!r||r.next===r.prev)return o;let a,l,c;if(n&&(r=_f(i,t,r,e)),i.length>80*e){a=i[0],l=i[1];let h=a,u=l;for(let d=e;d<s;d+=e){const p=i[d],g=i[d+1];p<a&&(a=p),g<l&&(l=g),p>h&&(h=p),g>u&&(u=g)}c=Math.max(h-a,u-l),c=c!==0?32767/c:0}return zs(r,o,e,a,l,c,0),o}function Ph(i,t,e,n,s){let r;if(s===Pf(i,t,e,n)>0)for(let o=t;o<e;o+=n)r=sc(o/n|0,i[o],i[o+1],r);else for(let o=e-n;o>=t;o-=n)r=sc(o/n|0,i[o],i[o+1],r);return r&&hs(r,r.next)&&(Gs(r),r=r.next),r}function Ni(i,t){if(!i)return i;t||(t=i);let e=i,n;do if(n=!1,!e.steiner&&(hs(e,e.next)||ge(e.prev,e,e.next)===0)){if(Gs(e),e=t=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==t);return t}function zs(i,t,e,n,s,r,o){if(!i)return;!o&&r&&bf(i,n,s,r);let a=i;for(;i.prev!==i.next;){const l=i.prev,c=i.next;if(r?mf(i,n,s,r):pf(i)){t.push(l.i,i.i,c.i),Gs(i),i=c.next,a=c.next;continue}if(i=c,i===a){o?o===1?(i=gf(Ni(i),t),zs(i,t,e,n,s,r,2)):o===2&&xf(i,t,e,n,s,r):zs(Ni(i),t,e,n,s,r,1);break}}}function pf(i){const t=i.prev,e=i,n=i.next;if(ge(t,e,n)>=0)return!1;const s=t.x,r=e.x,o=n.x,a=t.y,l=e.y,c=n.y,h=Math.min(s,r,o),u=Math.min(a,l,c),d=Math.max(s,r,o),p=Math.max(a,l,c);let g=n.next;for(;g!==t;){if(g.x>=h&&g.x<=d&&g.y>=u&&g.y<=p&&As(s,a,r,l,o,c,g.x,g.y)&&ge(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function mf(i,t,e,n){const s=i.prev,r=i,o=i.next;if(ge(s,r,o)>=0)return!1;const a=s.x,l=r.x,c=o.x,h=s.y,u=r.y,d=o.y,p=Math.min(a,l,c),g=Math.min(h,u,d),x=Math.max(a,l,c),m=Math.max(h,u,d),f=Ba(p,g,t,e,n),A=Ba(x,m,t,e,n);let v=i.prevZ,S=i.nextZ;for(;v&&v.z>=f&&S&&S.z<=A;){if(v.x>=p&&v.x<=x&&v.y>=g&&v.y<=m&&v!==s&&v!==o&&As(a,h,l,u,c,d,v.x,v.y)&&ge(v.prev,v,v.next)>=0||(v=v.prevZ,S.x>=p&&S.x<=x&&S.y>=g&&S.y<=m&&S!==s&&S!==o&&As(a,h,l,u,c,d,S.x,S.y)&&ge(S.prev,S,S.next)>=0))return!1;S=S.nextZ}for(;v&&v.z>=f;){if(v.x>=p&&v.x<=x&&v.y>=g&&v.y<=m&&v!==s&&v!==o&&As(a,h,l,u,c,d,v.x,v.y)&&ge(v.prev,v,v.next)>=0)return!1;v=v.prevZ}for(;S&&S.z<=A;){if(S.x>=p&&S.x<=x&&S.y>=g&&S.y<=m&&S!==s&&S!==o&&As(a,h,l,u,c,d,S.x,S.y)&&ge(S.prev,S,S.next)>=0)return!1;S=S.nextZ}return!0}function gf(i,t){let e=i;do{const n=e.prev,s=e.next.next;!hs(n,s)&&Lh(n,e,e.next,s)&&Vs(n,s)&&Vs(s,n)&&(t.push(n.i,e.i,s.i),Gs(e),Gs(e.next),e=i=s),e=e.next}while(e!==i);return Ni(e)}function xf(i,t,e,n,s,r){let o=i;do{let a=o.next.next;for(;a!==o.prev;){if(o.i!==a.i&&Tf(o,a)){let l=Dh(o,a);o=Ni(o,o.next),l=Ni(l,l.next),zs(o,t,e,n,s,r,0),zs(l,t,e,n,s,r,0);return}a=a.next}o=o.next}while(o!==i)}function _f(i,t,e,n){const s=[];for(let r=0,o=t.length;r<o;r++){const a=t[r]*n,l=r<o-1?t[r+1]*n:i.length,c=Ph(i,a,l,n,!1);c===c.next&&(c.steiner=!0),s.push(Af(c))}s.sort(vf);for(let r=0;r<s.length;r++)e=yf(s[r],e);return e}function vf(i,t){let e=i.x-t.x;if(e===0&&(e=i.y-t.y,e===0)){const n=(i.next.y-i.y)/(i.next.x-i.x),s=(t.next.y-t.y)/(t.next.x-t.x);e=n-s}return e}function yf(i,t){const e=Sf(i,t);if(!e)return t;const n=Dh(e,i);return Ni(n,n.next),Ni(e,e.next)}function Sf(i,t){let e=t;const n=i.x,s=i.y;let r=-1/0,o;if(hs(i,e))return e;do{if(hs(i,e.next))return e.next;if(s<=e.y&&s>=e.next.y&&e.next.y!==e.y){const u=e.x+(s-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(u<=n&&u>r&&(r=u,o=e.x<e.next.x?e:e.next,u===n))return o}e=e.next}while(e!==t);if(!o)return null;const a=o,l=o.x,c=o.y;let h=1/0;e=o;do{if(n>=e.x&&e.x>=l&&n!==e.x&&Rh(s<c?n:r,s,l,c,s<c?r:n,s,e.x,e.y)){const u=Math.abs(s-e.y)/(n-e.x);Vs(e,i)&&(u<h||u===h&&(e.x>o.x||e.x===o.x&&Mf(o,e)))&&(o=e,h=u)}e=e.next}while(e!==a);return o}function Mf(i,t){return ge(i.prev,i,t.prev)<0&&ge(t.next,i,i.next)<0}function bf(i,t,e,n){let s=i;do s.z===0&&(s.z=Ba(s.x,s.y,t,e,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,Ef(s)}function Ef(i){let t,e=1;do{let n=i,s;i=null;let r=null;for(t=0;n;){t++;let o=n,a=0;for(let c=0;c<e&&(a++,o=o.nextZ,!!o);c++);let l=e;for(;a>0||l>0&&o;)a!==0&&(l===0||!o||n.z<=o.z)?(s=n,n=n.nextZ,a--):(s=o,o=o.nextZ,l--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=o}r.nextZ=null,e*=2}while(t>1);return i}function Ba(i,t,e,n,s){return i=(i-e)*s|0,t=(t-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,i|t<<1}function Af(i){let t=i,e=i;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==i);return e}function Rh(i,t,e,n,s,r,o,a){return(s-o)*(t-a)>=(i-o)*(r-a)&&(i-o)*(n-a)>=(e-o)*(t-a)&&(e-o)*(r-a)>=(s-o)*(n-a)}function As(i,t,e,n,s,r,o,a){return!(i===o&&t===a)&&Rh(i,t,e,n,s,r,o,a)}function Tf(i,t){return i.next.i!==t.i&&i.prev.i!==t.i&&!Cf(i,t)&&(Vs(i,t)&&Vs(t,i)&&wf(i,t)&&(ge(i.prev,i,t.prev)||ge(i,t.prev,t))||hs(i,t)&&ge(i.prev,i,i.next)>0&&ge(t.prev,t,t.next)>0)}function ge(i,t,e){return(t.y-i.y)*(e.x-t.x)-(t.x-i.x)*(e.y-t.y)}function hs(i,t){return i.x===t.x&&i.y===t.y}function Lh(i,t,e,n){const s=Mr(ge(i,t,e)),r=Mr(ge(i,t,n)),o=Mr(ge(e,n,i)),a=Mr(ge(e,n,t));return!!(s!==r&&o!==a||s===0&&Sr(i,e,t)||r===0&&Sr(i,n,t)||o===0&&Sr(e,i,n)||a===0&&Sr(e,t,n))}function Sr(i,t,e){return t.x<=Math.max(i.x,e.x)&&t.x>=Math.min(i.x,e.x)&&t.y<=Math.max(i.y,e.y)&&t.y>=Math.min(i.y,e.y)}function Mr(i){return i>0?1:i<0?-1:0}function Cf(i,t){let e=i;do{if(e.i!==i.i&&e.next.i!==i.i&&e.i!==t.i&&e.next.i!==t.i&&Lh(e,e.next,i,t))return!0;e=e.next}while(e!==i);return!1}function Vs(i,t){return ge(i.prev,i,i.next)<0?ge(i,t,i.next)>=0&&ge(i,i.prev,t)>=0:ge(i,t,i.prev)<0||ge(i,i.next,t)<0}function wf(i,t){let e=i,n=!1;const s=(i.x+t.x)/2,r=(i.y+t.y)/2;do e.y>r!=e.next.y>r&&e.next.y!==e.y&&s<(e.next.x-e.x)*(r-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==i);return n}function Dh(i,t){const e=ka(i.i,i.x,i.y),n=ka(t.i,t.x,t.y),s=i.next,r=t.prev;return i.next=t,t.prev=i,e.next=s,s.prev=e,n.next=e,e.prev=n,r.next=n,n.prev=r,n}function sc(i,t,e,n){const s=ka(i,t,e);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function Gs(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function ka(i,t,e){return{i,x:t,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function Pf(i,t,e,n){let s=0;for(let r=t,o=e-n;r<e;r+=n)s+=(i[o]-i[r])*(i[r+1]+i[o+1]),o=r;return s}class Rf{static triangulate(t,e,n=2){return ff(t,e,n)}}class Ri{static area(t){const e=t.length;let n=0;for(let s=e-1,r=0;r<e;s=r++)n+=t[s].x*t[r].y-t[r].x*t[s].y;return n*.5}static isClockWise(t){return Ri.area(t)<0}static triangulateShape(t,e){const n=[],s=[],r=[];rc(t),oc(n,t);let o=t.length;e.forEach(rc);for(let l=0;l<e.length;l++)s.push(o),o+=e[l].length,oc(n,e[l]);const a=Rf.triangulate(n,s);for(let l=0;l<a.length;l+=3)r.push(a.slice(l,l+3));return r}}function rc(i){const t=i.length;t>2&&i[t-1].equals(i[0])&&i.pop()}function oc(i,t){for(let e=0;e<t.length;e++)i.push(t[e].x),i.push(t[e].y)}class jr extends Oe{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};const r=t/2,o=e/2,a=Math.floor(n),l=Math.floor(s),c=a+1,h=l+1,u=t/a,d=e/l,p=[],g=[],x=[],m=[];for(let f=0;f<h;f++){const A=f*d-o;for(let v=0;v<c;v++){const S=v*u-r;g.push(S,-A,0),x.push(0,0,1),m.push(v/a),m.push(1-f/l)}}for(let f=0;f<l;f++)for(let A=0;A<a;A++){const v=A+c*f,S=A+c*(f+1),w=A+1+c*(f+1),R=A+1+c*f;p.push(v,S,R),p.push(S,w,R)}this.setIndex(p),this.setAttribute("position",new Se(g,3)),this.setAttribute("normal",new Se(x,3)),this.setAttribute("uv",new Se(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new jr(t.width,t.height,t.widthSegments,t.heightSegments)}}class rl extends Oe{constructor(t=new Pi([new ct(0,.5),new ct(-.5,-.5),new ct(.5,-.5)]),e=12){super(),this.type="ShapeGeometry",this.parameters={shapes:t,curveSegments:e};const n=[],s=[],r=[],o=[];let a=0,l=0;if(Array.isArray(t)===!1)c(t);else for(let h=0;h<t.length;h++)c(t[h]),this.addGroup(a,l,h),a+=l,l=0;this.setIndex(n),this.setAttribute("position",new Se(s,3)),this.setAttribute("normal",new Se(r,3)),this.setAttribute("uv",new Se(o,2));function c(h){const u=s.length/3,d=h.extractPoints(e);let p=d.shape;const g=d.holes;Ri.isClockWise(p)===!1&&(p=p.reverse());for(let m=0,f=g.length;m<f;m++){const A=g[m];Ri.isClockWise(A)===!0&&(g[m]=A.reverse())}const x=Ri.triangulateShape(p,g);for(let m=0,f=g.length;m<f;m++){const A=g[m];p=p.concat(A)}for(let m=0,f=p.length;m<f;m++){const A=p[m];s.push(A.x,A.y,0),r.push(0,0,1),o.push(A.x,A.y)}for(let m=0,f=x.length;m<f;m++){const A=x[m],v=A[0]+u,S=A[1]+u,w=A[2]+u;n.push(v,S,w),l+=3}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){const t=super.toJSON(),e=this.parameters.shapes;return Lf(e,t)}static fromJSON(t,e){const n=[];for(let s=0,r=t.shapes.length;s<r;s++){const o=e[t.shapes[s]];n.push(o)}return new rl(n,t.curveSegments)}}function Lf(i,t){if(t.shapes=[],Array.isArray(i))for(let e=0,n=i.length;e<n;e++){const s=i[e];t.shapes.push(s.uuid)}else t.shapes.push(i.uuid);return t}class Df extends Pn{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class ac extends fs{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new jt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new jt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ch,this.normalScale=new ct(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new wn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class If extends fs{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=ed,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class Nf extends fs{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}const lc={enabled:!1,files:{},add:function(i,t){this.enabled!==!1&&(this.files[i]=t)},get:function(i){if(this.enabled!==!1)return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};class Uf{constructor(t,e,n){const s=this;let r=!1,o=0,a=0,l;const c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(h){a++,r===!1&&s.onStart!==void 0&&s.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,s.onProgress!==void 0&&s.onProgress(h,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){const u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=c.length;u<d;u+=2){const p=c[u],g=c[u+1];if(p.global&&(p.lastIndex=0),p.test(h))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const Ff=new Uf;class ol{constructor(t){this.manager=t!==void 0?t:Ff,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(t,e){const n=this;return new Promise(function(s,r){n.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}}ol.DEFAULT_MATERIAL_NAME="__DEFAULT";const Bn={};class Of extends Error{constructor(t,e){super(t),this.response=e}}class Bf extends ol{constructor(t){super(t),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(t,e,n,s){t===void 0&&(t=""),this.path!==void 0&&(t=this.path+t),t=this.manager.resolveURL(t);const r=lc.get(`file:${t}`);if(r!==void 0)return this.manager.itemStart(t),setTimeout(()=>{e&&e(r),this.manager.itemEnd(t)},0),r;if(Bn[t]!==void 0){Bn[t].push({onLoad:e,onProgress:n,onError:s});return}Bn[t]=[],Bn[t].push({onLoad:e,onProgress:n,onError:s});const o=new Request(t,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),a=this.mimeType,l=this.responseType;fetch(o).then(c=>{if(c.status===200||c.status===0){if(c.status===0&&Vt("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||c.body===void 0||c.body.getReader===void 0)return c;const h=Bn[t],u=c.body.getReader(),d=c.headers.get("X-File-Size")||c.headers.get("Content-Length"),p=d?parseInt(d):0,g=p!==0;let x=0;const m=new ReadableStream({start(f){A();function A(){u.read().then(({done:v,value:S})=>{if(v)f.close();else{x+=S.byteLength;const w=new ProgressEvent("progress",{lengthComputable:g,loaded:x,total:p});for(let R=0,P=h.length;R<P;R++){const I=h[R];I.onProgress&&I.onProgress(w)}f.enqueue(S),A()}},v=>{f.error(v)})}}});return new Response(m)}else throw new Of(`fetch for "${c.url}" responded with ${c.status}: ${c.statusText}`,c)}).then(c=>{switch(l){case"arraybuffer":return c.arrayBuffer();case"blob":return c.blob();case"document":return c.text().then(h=>new DOMParser().parseFromString(h,a));case"json":return c.json();default:if(a==="")return c.text();{const u=/charset="?([^;"\s]*)"?/i.exec(a),d=u&&u[1]?u[1].toLowerCase():void 0,p=new TextDecoder(d);return c.arrayBuffer().then(g=>p.decode(g))}}}).then(c=>{lc.add(`file:${t}`,c);const h=Bn[t];delete Bn[t];for(let u=0,d=h.length;u<d;u++){const p=h[u];p.onLoad&&p.onLoad(c)}}).catch(c=>{const h=Bn[t];if(h===void 0)throw this.manager.itemError(t),c;delete Bn[t];for(let u=0,d=h.length;u<d;u++){const p=h[u];p.onError&&p.onError(c)}this.manager.itemError(t)}).finally(()=>{this.manager.itemEnd(t)}),this.manager.itemStart(t)}setResponseType(t){return this.responseType=t,this}setMimeType(t){return this.mimeType=t,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}class al extends Le{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new jt(t),this.intensity=e}dispose(){this.dispatchEvent({type:"dispose"})}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}}class kf extends al{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Le.DEFAULT_UP),this.updateMatrix(),this.groundColor=new jt(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}toJSON(t){const e=super.toJSON(t);return e.object.groundColor=this.groundColor.getHex(),e}}const Uo=new ue,cc=new N,hc=new N;class zf{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ct(512,512),this.mapType=rn,this.map=null,this.mapPass=null,this.matrix=new ue,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new nl,this._frameExtents=new ct(1,1),this._viewportCount=1,this._viewports=[new ve(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,n=this.matrix;cc.setFromMatrixPosition(t.matrixWorld),e.position.copy(cc),hc.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(hc),e.updateMatrixWorld(),Uo.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Uo,e.coordinateSystem,e.reversedDepth),e.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Uo)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}class ll extends _h{constructor(t=-1,e=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=n-t,o=n+t,a=s+e,l=s-e;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}class Vf extends zf{constructor(){super(new ll(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Gf extends al{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Le.DEFAULT_UP),this.updateMatrix(),this.target=new Le,this.shadow=new Vf}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){const e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}}class Hf extends al{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}}class Wf extends cn{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}}class uc{constructor(t=1,e=0,n=0){this.radius=t,this.phi=e,this.theta=n}set(t,e,n){return this.radius=t,this.phi=e,this.theta=n,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=Zt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+e*e+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,n),this.phi=Math.acos(Zt(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const dc=new ct;class Xf{constructor(t=new ct(1/0,1/0),e=new ct(-1/0,-1/0)){this.isBox2=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=dc.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=1/0,this.max.x=this.max.y=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y}getCenter(t){return this.isEmpty()?t.set(0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,dc).distanceTo(t)}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}class Yf extends Mh{constructor(t=10,e=10,n=4473924,s=8947848){n=new jt(n),s=new jt(s);const r=e/2,o=t/e,a=t/2,l=[],c=[];for(let d=0,p=0,g=-a;d<=e;d++,g+=o){l.push(-a,0,g,a,0,g),l.push(g,0,-a,g,0,a);const x=d===r?n:s;x.toArray(c,p),p+=3,x.toArray(c,p),p+=3,x.toArray(c,p),p+=3,x.toArray(c,p),p+=3}const h=new Oe;h.setAttribute("position",new Se(l,3)),h.setAttribute("color",new Se(c,3));const u=new Zr({vertexColors:!0,toneMapped:!1});super(h,u),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}class qf extends Mh{constructor(t=1){const e=[0,0,0,t,0,0,0,0,0,0,t,0,0,0,0,0,0,t],n=[1,0,0,1,.6,0,0,1,0,.6,1,0,0,0,1,0,.6,1],s=new Oe;s.setAttribute("position",new Se(e,3)),s.setAttribute("color",new Se(n,3));const r=new Zr({vertexColors:!0,toneMapped:!1});super(s,r),this.type="AxesHelper"}setColors(t,e,n){const s=new jt,r=this.geometry.attributes.color.array;return s.set(t),s.toArray(r,0),s.toArray(r,3),s.set(e),s.toArray(r,6),s.toArray(r,9),s.set(n),s.toArray(r,12),s.toArray(r,15),this.geometry.attributes.color.needsUpdate=!0,this}dispose(){this.geometry.dispose(),this.material.dispose()}}class _i{constructor(){this.type="ShapePath",this.color=new jt,this.subPaths=[],this.currentPath=null}moveTo(t,e){return this.currentPath=new ss,this.subPaths.push(this.currentPath),this.currentPath.moveTo(t,e),this}lineTo(t,e){return this.currentPath.lineTo(t,e),this}quadraticCurveTo(t,e,n,s){return this.currentPath.quadraticCurveTo(t,e,n,s),this}bezierCurveTo(t,e,n,s,r,o){return this.currentPath.bezierCurveTo(t,e,n,s,r,o),this}splineThru(t){return this.currentPath.splineThru(t),this}toShapes(t){function e(f){const A=[];for(let v=0,S=f.length;v<S;v++){const w=f[v],R=new Pi;R.curves=w.curves,A.push(R)}return A}function n(f,A){const v=A.length;let S=!1;for(let w=v-1,R=0;R<v;w=R++){let P=A[w],I=A[R],y=I.x-P.x,C=I.y-P.y;if(Math.abs(C)>Number.EPSILON){if(C<0&&(P=A[R],y=-y,I=A[w],C=-C),f.y<P.y||f.y>I.y)continue;if(f.y===P.y){if(f.x===P.x)return!0}else{const U=C*(f.x-P.x)-y*(f.y-P.y);if(U===0)return!0;if(U<0)continue;S=!S}}else{if(f.y!==P.y)continue;if(I.x<=f.x&&f.x<=P.x||P.x<=f.x&&f.x<=I.x)return!0}}return S}const s=Ri.isClockWise,r=this.subPaths;if(r.length===0)return[];let o,a,l;const c=[];if(r.length===1)return a=r[0],l=new Pi,l.curves=a.curves,c.push(l),c;let h=!s(r[0].getPoints());h=t?!h:h;const u=[],d=[];let p=[],g=0,x;d[g]=void 0,p[g]=[];for(let f=0,A=r.length;f<A;f++)a=r[f],x=a.getPoints(),o=s(x),o=t?!o:o,o?(!h&&d[g]&&g++,d[g]={s:new Pi,p:x},d[g].s.curves=a.curves,h&&g++,p[g]=[]):p[g].push({h:a,p:x[0]});if(!d[0])return e(r);if(d.length>1){let f=!1,A=0;for(let v=0,S=d.length;v<S;v++)u[v]=[];for(let v=0,S=d.length;v<S;v++){const w=p[v];for(let R=0;R<w.length;R++){const P=w[R];let I=!0;for(let y=0;y<d.length;y++)n(P.p,d[y].p)&&(v!==y&&A++,I?(I=!1,u[y].push(P)):f=!0);I&&u[v].push(P)}}A>0&&f===!1&&(p=u)}let m;for(let f=0,A=d.length;f<A;f++){l=d[f].s,c.push(l),m=p[f];for(let v=0,S=m.length;v<S;v++)l.holes.push(m[v].h)}return c}}class $f extends Ui{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){if(t===void 0){Vt("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}}function fc(i,t,e,n){const s=Zf(n);switch(e){case oh:return i*t;case lh:return i*t/s.components*s.byteLength;case $a:return i*t/s.components*s.byteLength;case as:return i*t*2/s.components*s.byteLength;case Za:return i*t*2/s.components*s.byteLength;case ah:return i*t*3/s.components*s.byteLength;case mn:return i*t*4/s.components*s.byteLength;case ja:return i*t*4/s.components*s.byteLength;case wr:case Pr:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Rr:case Lr:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case aa:case ca:return Math.max(i,16)*Math.max(t,8)/4;case oa:case la:return Math.max(i,8)*Math.max(t,8)/2;case ha:case ua:case fa:case pa:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case da:case ma:case ga:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case xa:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case _a:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case va:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case ya:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case Sa:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case Ma:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case ba:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case Ea:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case Aa:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case Ta:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case Ca:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case wa:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case Pa:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case Ra:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case La:case Da:case Ia:return Math.ceil(i/4)*Math.ceil(t/4)*16;case Na:case Ua:return Math.ceil(i/4)*Math.ceil(t/4)*8;case Fa:case Oa:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function Zf(i){switch(i){case rn:case nh:return{byteLength:1,components:1};case Us:case ih:case Wn:return{byteLength:2,components:1};case Ya:case qa:return{byteLength:2,components:4};case Cn:case Xa:case Mn:return{byteLength:4,components:1};case sh:case rh:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Wa}}));typeof window<"u"&&(window.__THREE__?Vt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Wa);/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Ih(){let i=null,t=!1,e=null,n=null;function s(r,o){e(r,o),n=i.requestAnimationFrame(s)}return{start:function(){t!==!0&&e!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function jf(i){const t=new WeakMap;function e(a,l){const c=a.array,h=a.usage,u=c.byteLength,d=i.createBuffer();i.bindBuffer(l,d),i.bufferData(l,c,h),a.onUploadCallback();let p;if(c instanceof Float32Array)p=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)p=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?p=i.HALF_FLOAT:p=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)p=i.SHORT;else if(c instanceof Uint32Array)p=i.UNSIGNED_INT;else if(c instanceof Int32Array)p=i.INT;else if(c instanceof Int8Array)p=i.BYTE;else if(c instanceof Uint8Array)p=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)p=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:p,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:u}}function n(a,l,c){const h=l.array,u=l.updateRanges;if(i.bindBuffer(c,a),u.length===0)i.bufferSubData(c,0,h);else{u.sort((p,g)=>p.start-g.start);let d=0;for(let p=1;p<u.length;p++){const g=u[d],x=u[p];x.start<=g.start+g.count+1?g.count=Math.max(g.count,x.start+x.count-g.start):(++d,u[d]=x)}u.length=d+1;for(let p=0,g=u.length;p<g;p++){const x=u[p];i.bufferSubData(c,x.start*h.BYTES_PER_ELEMENT,h,x.start,x.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=t.get(a);l&&(i.deleteBuffer(l.buffer),t.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=t.get(a);if(c===void 0)t.set(a,e(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var Kf=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Jf=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Qf=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,tp=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,ep=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,np=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,ip=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,sp=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,rp=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,op=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,ap=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,lp=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,cp=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,hp=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,up=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,dp=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,fp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,pp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,mp=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,gp=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,xp=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,_p=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,vp=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,yp=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Sp=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Mp=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,bp=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Ep=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Ap=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Tp=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Cp="gl_FragColor = linearToOutputTexel( gl_FragColor );",wp=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Pp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Rp=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Lp=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Dp=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Ip=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Np=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Up=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Fp=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Op=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Bp=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,kp=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,zp=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Vp=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Gp=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Hp=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Wp=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Xp=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Yp=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,qp=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,$p=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Zp=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return v;
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( vec3( 1.0 ) - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,jp=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Kp=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Jp=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Qp=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,tm=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,em=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,nm=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,im=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,sm=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,rm=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,om=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,am=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,lm=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,cm=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,hm=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,um=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,dm=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,fm=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,pm=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,mm=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,gm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,xm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,_m=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,vm=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,ym=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Sm=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Mm=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,bm=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Em=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Am=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Tm=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Cm=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,wm=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Pm=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Rm=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Lm=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Dm=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * 6.28318530718;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * 6.28318530718;
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * vogelDiskSample( 0, 5, phi ).x + bitangent * vogelDiskSample( 0, 5, phi ).y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * vogelDiskSample( 1, 5, phi ).x + bitangent * vogelDiskSample( 1, 5, phi ).y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * vogelDiskSample( 2, 5, phi ).x + bitangent * vogelDiskSample( 2, 5, phi ).y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * vogelDiskSample( 3, 5, phi ).x + bitangent * vogelDiskSample( 3, 5, phi ).y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * vogelDiskSample( 4, 5, phi ).x + bitangent * vogelDiskSample( 4, 5, phi ).y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadow = step( depth, dp );
			#else
				shadow = step( dp, depth );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Im=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Nm=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Um=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Fm=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Om=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Bm=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,km=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,zm=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Vm=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Gm=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Hm=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Wm=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Xm=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Ym=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,qm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,$m=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Zm=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const jm=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Km=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Jm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Qm=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,tg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,eg=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ng=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,ig=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,sg=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,rg=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,og=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,ag=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,lg=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,cg=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,hg=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,ug=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,dg=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,fg=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,pg=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,mg=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,gg=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,xg=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,_g=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,vg=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,yg=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Sg=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Mg=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,bg=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Eg=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Ag=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Tg=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Cg=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,wg=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Pg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,$t={alphahash_fragment:Kf,alphahash_pars_fragment:Jf,alphamap_fragment:Qf,alphamap_pars_fragment:tp,alphatest_fragment:ep,alphatest_pars_fragment:np,aomap_fragment:ip,aomap_pars_fragment:sp,batching_pars_vertex:rp,batching_vertex:op,begin_vertex:ap,beginnormal_vertex:lp,bsdfs:cp,iridescence_fragment:hp,bumpmap_pars_fragment:up,clipping_planes_fragment:dp,clipping_planes_pars_fragment:fp,clipping_planes_pars_vertex:pp,clipping_planes_vertex:mp,color_fragment:gp,color_pars_fragment:xp,color_pars_vertex:_p,color_vertex:vp,common:yp,cube_uv_reflection_fragment:Sp,defaultnormal_vertex:Mp,displacementmap_pars_vertex:bp,displacementmap_vertex:Ep,emissivemap_fragment:Ap,emissivemap_pars_fragment:Tp,colorspace_fragment:Cp,colorspace_pars_fragment:wp,envmap_fragment:Pp,envmap_common_pars_fragment:Rp,envmap_pars_fragment:Lp,envmap_pars_vertex:Dp,envmap_physical_pars_fragment:Hp,envmap_vertex:Ip,fog_vertex:Np,fog_pars_vertex:Up,fog_fragment:Fp,fog_pars_fragment:Op,gradientmap_pars_fragment:Bp,lightmap_pars_fragment:kp,lights_lambert_fragment:zp,lights_lambert_pars_fragment:Vp,lights_pars_begin:Gp,lights_toon_fragment:Wp,lights_toon_pars_fragment:Xp,lights_phong_fragment:Yp,lights_phong_pars_fragment:qp,lights_physical_fragment:$p,lights_physical_pars_fragment:Zp,lights_fragment_begin:jp,lights_fragment_maps:Kp,lights_fragment_end:Jp,logdepthbuf_fragment:Qp,logdepthbuf_pars_fragment:tm,logdepthbuf_pars_vertex:em,logdepthbuf_vertex:nm,map_fragment:im,map_pars_fragment:sm,map_particle_fragment:rm,map_particle_pars_fragment:om,metalnessmap_fragment:am,metalnessmap_pars_fragment:lm,morphinstance_vertex:cm,morphcolor_vertex:hm,morphnormal_vertex:um,morphtarget_pars_vertex:dm,morphtarget_vertex:fm,normal_fragment_begin:pm,normal_fragment_maps:mm,normal_pars_fragment:gm,normal_pars_vertex:xm,normal_vertex:_m,normalmap_pars_fragment:vm,clearcoat_normal_fragment_begin:ym,clearcoat_normal_fragment_maps:Sm,clearcoat_pars_fragment:Mm,iridescence_pars_fragment:bm,opaque_fragment:Em,packing:Am,premultiplied_alpha_fragment:Tm,project_vertex:Cm,dithering_fragment:wm,dithering_pars_fragment:Pm,roughnessmap_fragment:Rm,roughnessmap_pars_fragment:Lm,shadowmap_pars_fragment:Dm,shadowmap_pars_vertex:Im,shadowmap_vertex:Nm,shadowmask_pars_fragment:Um,skinbase_vertex:Fm,skinning_pars_vertex:Om,skinning_vertex:Bm,skinnormal_vertex:km,specularmap_fragment:zm,specularmap_pars_fragment:Vm,tonemapping_fragment:Gm,tonemapping_pars_fragment:Hm,transmission_fragment:Wm,transmission_pars_fragment:Xm,uv_pars_fragment:Ym,uv_pars_vertex:qm,uv_vertex:$m,worldpos_vertex:Zm,background_vert:jm,background_frag:Km,backgroundCube_vert:Jm,backgroundCube_frag:Qm,cube_vert:tg,cube_frag:eg,depth_vert:ng,depth_frag:ig,distance_vert:sg,distance_frag:rg,equirect_vert:og,equirect_frag:ag,linedashed_vert:lg,linedashed_frag:cg,meshbasic_vert:hg,meshbasic_frag:ug,meshlambert_vert:dg,meshlambert_frag:fg,meshmatcap_vert:pg,meshmatcap_frag:mg,meshnormal_vert:gg,meshnormal_frag:xg,meshphong_vert:_g,meshphong_frag:vg,meshphysical_vert:yg,meshphysical_frag:Sg,meshtoon_vert:Mg,meshtoon_frag:bg,points_vert:Eg,points_frag:Ag,shadow_vert:Tg,shadow_frag:Cg,sprite_vert:wg,sprite_frag:Pg},At={common:{diffuse:{value:new jt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Xt},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Xt}},envmap:{envMap:{value:null},envMapRotation:{value:new Xt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Xt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Xt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Xt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Xt},normalScale:{value:new ct(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Xt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Xt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Xt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Xt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new jt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new jt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0},uvTransform:{value:new Xt}},sprite:{diffuse:{value:new jt(16777215)},opacity:{value:1},center:{value:new ct(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Xt},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0}}},yn={basic:{uniforms:Ge([At.common,At.specularmap,At.envmap,At.aomap,At.lightmap,At.fog]),vertexShader:$t.meshbasic_vert,fragmentShader:$t.meshbasic_frag},lambert:{uniforms:Ge([At.common,At.specularmap,At.envmap,At.aomap,At.lightmap,At.emissivemap,At.bumpmap,At.normalmap,At.displacementmap,At.fog,At.lights,{emissive:{value:new jt(0)}}]),vertexShader:$t.meshlambert_vert,fragmentShader:$t.meshlambert_frag},phong:{uniforms:Ge([At.common,At.specularmap,At.envmap,At.aomap,At.lightmap,At.emissivemap,At.bumpmap,At.normalmap,At.displacementmap,At.fog,At.lights,{emissive:{value:new jt(0)},specular:{value:new jt(1118481)},shininess:{value:30}}]),vertexShader:$t.meshphong_vert,fragmentShader:$t.meshphong_frag},standard:{uniforms:Ge([At.common,At.envmap,At.aomap,At.lightmap,At.emissivemap,At.bumpmap,At.normalmap,At.displacementmap,At.roughnessmap,At.metalnessmap,At.fog,At.lights,{emissive:{value:new jt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:$t.meshphysical_vert,fragmentShader:$t.meshphysical_frag},toon:{uniforms:Ge([At.common,At.aomap,At.lightmap,At.emissivemap,At.bumpmap,At.normalmap,At.displacementmap,At.gradientmap,At.fog,At.lights,{emissive:{value:new jt(0)}}]),vertexShader:$t.meshtoon_vert,fragmentShader:$t.meshtoon_frag},matcap:{uniforms:Ge([At.common,At.bumpmap,At.normalmap,At.displacementmap,At.fog,{matcap:{value:null}}]),vertexShader:$t.meshmatcap_vert,fragmentShader:$t.meshmatcap_frag},points:{uniforms:Ge([At.points,At.fog]),vertexShader:$t.points_vert,fragmentShader:$t.points_frag},dashed:{uniforms:Ge([At.common,At.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:$t.linedashed_vert,fragmentShader:$t.linedashed_frag},depth:{uniforms:Ge([At.common,At.displacementmap]),vertexShader:$t.depth_vert,fragmentShader:$t.depth_frag},normal:{uniforms:Ge([At.common,At.bumpmap,At.normalmap,At.displacementmap,{opacity:{value:1}}]),vertexShader:$t.meshnormal_vert,fragmentShader:$t.meshnormal_frag},sprite:{uniforms:Ge([At.sprite,At.fog]),vertexShader:$t.sprite_vert,fragmentShader:$t.sprite_frag},background:{uniforms:{uvTransform:{value:new Xt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:$t.background_vert,fragmentShader:$t.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Xt}},vertexShader:$t.backgroundCube_vert,fragmentShader:$t.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:$t.cube_vert,fragmentShader:$t.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:$t.equirect_vert,fragmentShader:$t.equirect_frag},distance:{uniforms:Ge([At.common,At.displacementmap,{referencePosition:{value:new N},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:$t.distance_vert,fragmentShader:$t.distance_frag},shadow:{uniforms:Ge([At.lights,At.fog,{color:{value:new jt(0)},opacity:{value:1}}]),vertexShader:$t.shadow_vert,fragmentShader:$t.shadow_frag}};yn.physical={uniforms:Ge([yn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Xt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Xt},clearcoatNormalScale:{value:new ct(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Xt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Xt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Xt},sheen:{value:0},sheenColor:{value:new jt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Xt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Xt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Xt},transmissionSamplerSize:{value:new ct},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Xt},attenuationDistance:{value:0},attenuationColor:{value:new jt(0)},specularColor:{value:new jt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Xt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Xt},anisotropyVector:{value:new ct},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Xt}}]),vertexShader:$t.meshphysical_vert,fragmentShader:$t.meshphysical_frag};const br={r:0,b:0,g:0},vi=new wn,Rg=new ue;function Lg(i,t,e,n,s,r,o){const a=new jt(0);let l=r===!0?0:1,c,h,u=null,d=0,p=null;function g(v){let S=v.isScene===!0?v.background:null;return S&&S.isTexture&&(S=(v.backgroundBlurriness>0?e:t).get(S)),S}function x(v){let S=!1;const w=g(v);w===null?f(a,l):w&&w.isColor&&(f(w,1),S=!0);const R=i.xr.getEnvironmentBlendMode();R==="additive"?n.buffers.color.setClear(0,0,0,1,o):R==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,o),(i.autoClear||S)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function m(v,S){const w=g(S);w&&(w.isCubeTexture||w.mapping===qr)?(h===void 0&&(h=new xn(new Ii(1,1,1),new Pn({name:"BackgroundCubeMaterial",uniforms:cs(yn.backgroundCube.uniforms),vertexShader:yn.backgroundCube.vertexShader,fragmentShader:yn.backgroundCube.fragmentShader,side:Ke,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(R,P,I){this.matrixWorld.copyPosition(I.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(h)),vi.copy(S.backgroundRotation),vi.x*=-1,vi.y*=-1,vi.z*=-1,w.isCubeTexture&&w.isRenderTargetTexture===!1&&(vi.y*=-1,vi.z*=-1),h.material.uniforms.envMap.value=w,h.material.uniforms.flipEnvMap.value=w.isCubeTexture&&w.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=S.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(Rg.makeRotationFromEuler(vi)),h.material.toneMapped=Qt.getTransfer(w.colorSpace)!==se,(u!==w||d!==w.version||p!==i.toneMapping)&&(h.material.needsUpdate=!0,u=w,d=w.version,p=i.toneMapping),h.layers.enableAll(),v.unshift(h,h.geometry,h.material,0,0,null)):w&&w.isTexture&&(c===void 0&&(c=new xn(new jr(2,2),new Pn({name:"BackgroundMaterial",uniforms:cs(yn.background.uniforms),vertexShader:yn.background.vertexShader,fragmentShader:yn.background.fragmentShader,side:li,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(c)),c.material.uniforms.t2D.value=w,c.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,c.material.toneMapped=Qt.getTransfer(w.colorSpace)!==se,w.matrixAutoUpdate===!0&&w.updateMatrix(),c.material.uniforms.uvTransform.value.copy(w.matrix),(u!==w||d!==w.version||p!==i.toneMapping)&&(c.material.needsUpdate=!0,u=w,d=w.version,p=i.toneMapping),c.layers.enableAll(),v.unshift(c,c.geometry,c.material,0,0,null))}function f(v,S){v.getRGB(br,xh(i)),n.buffers.color.setClear(br.r,br.g,br.b,S,o)}function A(){h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(v,S=1){a.set(v),l=S,f(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(v){l=v,f(a,l)},render:x,addToRenderList:m,dispose:A}}function Dg(i,t){const e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=d(null);let r=s,o=!1;function a(C,U,V,X,Y){let j=!1;const Z=u(X,V,U);r!==Z&&(r=Z,c(r.object)),j=p(C,X,V,Y),j&&g(C,X,V,Y),Y!==null&&t.update(Y,i.ELEMENT_ARRAY_BUFFER),(j||o)&&(o=!1,S(C,U,V,X),Y!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(Y).buffer))}function l(){return i.createVertexArray()}function c(C){return i.bindVertexArray(C)}function h(C){return i.deleteVertexArray(C)}function u(C,U,V){const X=V.wireframe===!0;let Y=n[C.id];Y===void 0&&(Y={},n[C.id]=Y);let j=Y[U.id];j===void 0&&(j={},Y[U.id]=j);let Z=j[X];return Z===void 0&&(Z=d(l()),j[X]=Z),Z}function d(C){const U=[],V=[],X=[];for(let Y=0;Y<e;Y++)U[Y]=0,V[Y]=0,X[Y]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:U,enabledAttributes:V,attributeDivisors:X,object:C,attributes:{},index:null}}function p(C,U,V,X){const Y=r.attributes,j=U.attributes;let Z=0;const O=V.getAttributes();for(const z in O)if(O[z].location>=0){const at=Y[z];let _t=j[z];if(_t===void 0&&(z==="instanceMatrix"&&C.instanceMatrix&&(_t=C.instanceMatrix),z==="instanceColor"&&C.instanceColor&&(_t=C.instanceColor)),at===void 0||at.attribute!==_t||_t&&at.data!==_t.data)return!0;Z++}return r.attributesNum!==Z||r.index!==X}function g(C,U,V,X){const Y={},j=U.attributes;let Z=0;const O=V.getAttributes();for(const z in O)if(O[z].location>=0){let at=j[z];at===void 0&&(z==="instanceMatrix"&&C.instanceMatrix&&(at=C.instanceMatrix),z==="instanceColor"&&C.instanceColor&&(at=C.instanceColor));const _t={};_t.attribute=at,at&&at.data&&(_t.data=at.data),Y[z]=_t,Z++}r.attributes=Y,r.attributesNum=Z,r.index=X}function x(){const C=r.newAttributes;for(let U=0,V=C.length;U<V;U++)C[U]=0}function m(C){f(C,0)}function f(C,U){const V=r.newAttributes,X=r.enabledAttributes,Y=r.attributeDivisors;V[C]=1,X[C]===0&&(i.enableVertexAttribArray(C),X[C]=1),Y[C]!==U&&(i.vertexAttribDivisor(C,U),Y[C]=U)}function A(){const C=r.newAttributes,U=r.enabledAttributes;for(let V=0,X=U.length;V<X;V++)U[V]!==C[V]&&(i.disableVertexAttribArray(V),U[V]=0)}function v(C,U,V,X,Y,j,Z){Z===!0?i.vertexAttribIPointer(C,U,V,Y,j):i.vertexAttribPointer(C,U,V,X,Y,j)}function S(C,U,V,X){x();const Y=X.attributes,j=V.getAttributes(),Z=U.defaultAttributeValues;for(const O in j){const z=j[O];if(z.location>=0){let pt=Y[O];if(pt===void 0&&(O==="instanceMatrix"&&C.instanceMatrix&&(pt=C.instanceMatrix),O==="instanceColor"&&C.instanceColor&&(pt=C.instanceColor)),pt!==void 0){const at=pt.normalized,_t=pt.itemSize,Gt=t.get(pt);if(Gt===void 0)continue;const Yt=Gt.buffer,$=Gt.type,F=Gt.bytesPerElement,E=$===i.INT||$===i.UNSIGNED_INT||pt.gpuType===Xa;if(pt.isInterleavedBufferAttribute){const b=pt.data,W=b.stride,nt=pt.offset;if(b.isInstancedInterleavedBuffer){for(let H=0;H<z.locationSize;H++)f(z.location+H,b.meshPerAttribute);C.isInstancedMesh!==!0&&X._maxInstanceCount===void 0&&(X._maxInstanceCount=b.meshPerAttribute*b.count)}else for(let H=0;H<z.locationSize;H++)m(z.location+H);i.bindBuffer(i.ARRAY_BUFFER,Yt);for(let H=0;H<z.locationSize;H++)v(z.location+H,_t/z.locationSize,$,at,W*F,(nt+_t/z.locationSize*H)*F,E)}else{if(pt.isInstancedBufferAttribute){for(let b=0;b<z.locationSize;b++)f(z.location+b,pt.meshPerAttribute);C.isInstancedMesh!==!0&&X._maxInstanceCount===void 0&&(X._maxInstanceCount=pt.meshPerAttribute*pt.count)}else for(let b=0;b<z.locationSize;b++)m(z.location+b);i.bindBuffer(i.ARRAY_BUFFER,Yt);for(let b=0;b<z.locationSize;b++)v(z.location+b,_t/z.locationSize,$,at,_t*F,_t/z.locationSize*b*F,E)}}else if(Z!==void 0){const at=Z[O];if(at!==void 0)switch(at.length){case 2:i.vertexAttrib2fv(z.location,at);break;case 3:i.vertexAttrib3fv(z.location,at);break;case 4:i.vertexAttrib4fv(z.location,at);break;default:i.vertexAttrib1fv(z.location,at)}}}}A()}function w(){I();for(const C in n){const U=n[C];for(const V in U){const X=U[V];for(const Y in X)h(X[Y].object),delete X[Y];delete U[V]}delete n[C]}}function R(C){if(n[C.id]===void 0)return;const U=n[C.id];for(const V in U){const X=U[V];for(const Y in X)h(X[Y].object),delete X[Y];delete U[V]}delete n[C.id]}function P(C){for(const U in n){const V=n[U];if(V[C.id]===void 0)continue;const X=V[C.id];for(const Y in X)h(X[Y].object),delete X[Y];delete V[C.id]}}function I(){y(),o=!0,r!==s&&(r=s,c(r.object))}function y(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:I,resetDefaultState:y,dispose:w,releaseStatesOfGeometry:R,releaseStatesOfProgram:P,initAttributes:x,enableAttribute:m,disableUnusedAttributes:A}}function Ig(i,t,e){let n;function s(c){n=c}function r(c,h){i.drawArrays(n,c,h),e.update(h,n,1)}function o(c,h,u){u!==0&&(i.drawArraysInstanced(n,c,h,u),e.update(h,n,u))}function a(c,h,u){if(u===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,h,0,u);let p=0;for(let g=0;g<u;g++)p+=h[g];e.update(p,n,1)}function l(c,h,u,d){if(u===0)return;const p=t.get("WEBGL_multi_draw");if(p===null)for(let g=0;g<c.length;g++)o(c[g],h[g],d[g]);else{p.multiDrawArraysInstancedWEBGL(n,c,0,h,0,d,0,u);let g=0;for(let x=0;x<u;x++)g+=h[x]*d[x];e.update(g,n,1)}}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function Ng(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){const P=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(P.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(P){return!(P!==mn&&n.convert(P)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(P){const I=P===Wn&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(P!==rn&&n.convert(P)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&P!==Mn&&!I)}function l(P){if(P==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";P="mediump"}return P==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp";const h=l(c);h!==c&&(Vt("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const u=e.logarithmicDepthBuffer===!0,d=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control"),p=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),f=i.getParameter(i.MAX_VERTEX_ATTRIBS),A=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),v=i.getParameter(i.MAX_VARYING_VECTORS),S=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),w=i.getParameter(i.MAX_SAMPLES),R=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:u,reversedDepthBuffer:d,maxTextures:p,maxVertexTextures:g,maxTextureSize:x,maxCubemapSize:m,maxAttributes:f,maxVertexUniforms:A,maxVaryings:v,maxFragmentUniforms:S,maxSamples:w,samples:R}}function Ug(i){const t=this;let e=null,n=0,s=!1,r=!1;const o=new ti,a=new Xt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){const p=u.length!==0||d||n!==0||s;return s=d,n=u.length,p},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){e=h(u,d,0)},this.setState=function(u,d,p){const g=u.clippingPlanes,x=u.clipIntersection,m=u.clipShadows,f=i.get(u);if(!s||g===null||g.length===0||r&&!m)r?h(null):c();else{const A=r?0:n,v=A*4;let S=f.clippingState||null;l.value=S,S=h(g,d,v,p);for(let w=0;w!==v;++w)S[w]=e[w];f.clippingState=S,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=A}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(u,d,p,g){const x=u!==null?u.length:0;let m=null;if(x!==0){if(m=l.value,g!==!0||m===null){const f=p+x*4,A=d.matrixWorldInverse;a.getNormalMatrix(A),(m===null||m.length<f)&&(m=new Float32Array(f));for(let v=0,S=p;v!==x;++v,S+=4)o.copy(u[v]).applyMatrix4(A,a),o.normal.toArray(m,S),m[S+3]=o.constant}l.value=m,l.needsUpdate=!0}return t.numPlanes=x,t.numIntersection=0,m}}function Fg(i){let t=new WeakMap;function e(o,a){return a===na?o.mapping=Li:a===ia&&(o.mapping=os),o}function n(o){if(o&&o.isTexture){const a=o.mapping;if(a===na||a===ia)if(t.has(o)){const l=t.get(o).texture;return e(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new yh(l.height);return c.fromEquirectangularTexture(i,o),t.set(o,c),o.addEventListener("dispose",s),e(c.texture,o.mapping)}else return null}}return o}function s(o){const a=o.target;a.removeEventListener("dispose",s);const l=t.get(a);l!==void 0&&(t.delete(a),l.dispose())}function r(){t=new WeakMap}return{get:n,dispose:r}}const si=4,pc=[.125,.215,.35,.446,.526,.582],Mi=20,Og=256,Ms=new ll,mc=new jt;let Fo=null,Oo=0,Bo=0,ko=!1;const Bg=new N;class gc{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,n=.1,s=100,r={}){const{size:o=256,position:a=Bg}=r;Fo=this._renderer.getRenderTarget(),Oo=this._renderer.getActiveCubeFace(),Bo=this._renderer.getActiveMipmapLevel(),ko=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,n,s,l,a),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=vc(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=_c(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(Fo,Oo,Bo),this._renderer.xr.enabled=ko,t.scissorTest=!1,Ki(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Li||t.mapping===os?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Fo=this._renderer.getRenderTarget(),Oo=this._renderer.getActiveCubeFace(),Bo=this._renderer.getActiveMipmapLevel(),ko=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:Fe,minFilter:Fe,generateMipmaps:!1,type:Wn,format:mn,colorSpace:ls,depthBuffer:!1},s=xc(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=xc(t,e,n);const{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=kg(r)),this._blurMaterial=Vg(r,t,e),this._ggxMaterial=zg(r,t,e)}return s}_compileMaterial(t){const e=new xn(new Oe,t);this._renderer.compile(e,Ms)}_sceneToCubeUV(t,e,n,s,r){const l=new cn(90,1,e,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,d=u.autoClear,p=u.toneMapping;u.getClearColor(mc),u.toneMapping=En,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(s),u.clearDepth(),u.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new xn(new Ii,new ph({name:"PMREM.Background",side:Ke,depthWrite:!1,depthTest:!1})));const x=this._backgroundBox,m=x.material;let f=!1;const A=t.background;A?A.isColor&&(m.color.copy(A),t.background=null,f=!0):(m.color.copy(mc),f=!0);for(let v=0;v<6;v++){const S=v%3;S===0?(l.up.set(0,c[v],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[v],r.y,r.z)):S===1?(l.up.set(0,0,c[v]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[v],r.z)):(l.up.set(0,c[v],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[v]));const w=this._cubeSize;Ki(s,S*w,v>2?w:0,w,w),u.setRenderTarget(s),f&&u.render(x,l),u.render(t,l)}u.toneMapping=p,u.autoClear=d,t.background=A}_textureToCubeUV(t,e){const n=this._renderer,s=t.mapping===Li||t.mapping===os;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=vc()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=_c());const r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;const a=r.uniforms;a.envMap.value=t;const l=this._cubeSize;Ki(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(o,Ms)}_applyPMREM(t){const e=this._renderer,n=e.autoClear;e.autoClear=!1;const s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=n}_applyGGXFilter(t,e,n){const s=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;const l=o.uniforms,c=n/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),u=Math.sqrt(c*c-h*h),d=0+c*1.25,p=u*d,{_lodMax:g}=this,x=this._sizeLods[n],m=3*x*(n>g-si?n-g+si:0),f=4*(this._cubeSize-x);l.envMap.value=t.texture,l.roughness.value=p,l.mipInt.value=g-e,Ki(r,m,f,3*x,2*x),s.setRenderTarget(r),s.render(a,Ms),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=g-n,Ki(t,m,f,3*x,2*x),s.setRenderTarget(t),s.render(a,Ms)}_blur(t,e,n,s,r){const o=this._pingPongRenderTarget;this._halfBlur(t,o,e,n,s,"latitudinal",r),this._halfBlur(o,t,n,n,s,"longitudinal",r)}_halfBlur(t,e,n,s,r,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&ee("blur direction must be either latitudinal or longitudinal!");const h=3,u=this._lodMeshes[s];u.material=c;const d=c.uniforms,p=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*p):2*Math.PI/(2*Mi-1),x=r/g,m=isFinite(r)?1+Math.floor(h*x):Mi;m>Mi&&Vt(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Mi}`);const f=[];let A=0;for(let P=0;P<Mi;++P){const I=P/x,y=Math.exp(-I*I/2);f.push(y),P===0?A+=y:P<m&&(A+=2*y)}for(let P=0;P<f.length;P++)f[P]=f[P]/A;d.envMap.value=t.texture,d.samples.value=m,d.weights.value=f,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);const{_lodMax:v}=this;d.dTheta.value=g,d.mipInt.value=v-n;const S=this._sizeLods[s],w=3*S*(s>v-si?s-v+si:0),R=4*(this._cubeSize-S);Ki(e,w,R,3*S,2*S),l.setRenderTarget(e),l.render(u,Ms)}}function kg(i){const t=[],e=[],n=[];let s=i;const r=i-si+1+pc.length;for(let o=0;o<r;o++){const a=Math.pow(2,s);t.push(a);let l=1/a;o>i-si?l=pc[o-i+si-1]:o===0&&(l=0),e.push(l);const c=1/(a-2),h=-c,u=1+c,d=[h,h,u,h,u,u,h,h,u,u,h,u],p=6,g=6,x=3,m=2,f=1,A=new Float32Array(x*g*p),v=new Float32Array(m*g*p),S=new Float32Array(f*g*p);for(let R=0;R<p;R++){const P=R%3*2/3-1,I=R>2?0:-1,y=[P,I,0,P+2/3,I,0,P+2/3,I+1,0,P,I,0,P+2/3,I+1,0,P,I+1,0];A.set(y,x*g*R),v.set(d,m*g*R);const C=[R,R,R,R,R,R];S.set(C,f*g*R)}const w=new Oe;w.setAttribute("position",new gn(A,x)),w.setAttribute("uv",new gn(v,m)),w.setAttribute("faceIndex",new gn(S,f)),n.push(new xn(w,null)),s>si&&s--}return{lodMeshes:n,sizeLods:t,sigmas:e}}function xc(i,t,e){const n=new An(i,t,e);return n.texture.mapping=qr,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Ki(i,t,e,n,s){i.viewport.set(t,e,n,s),i.scissor.set(t,e,n,s)}function zg(i,t,e){return new Pn({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Og,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Kr(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 3.2: Transform view direction to hemisphere configuration
				vec3 Vh = normalize(vec3(alpha * V.x, alpha * V.y, V.z));

				// Section 4.1: Orthonormal basis
				float lensq = Vh.x * Vh.x + Vh.y * Vh.y;
				vec3 T1 = lensq > 0.0 ? vec3(-Vh.y, Vh.x, 0.0) / sqrt(lensq) : vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(Vh, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + Vh.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * Vh;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Gn,depthTest:!1,depthWrite:!1})}function Vg(i,t,e){const n=new Float32Array(Mi),s=new N(0,1,0);return new Pn({name:"SphericalGaussianBlur",defines:{n:Mi,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Kr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Gn,depthTest:!1,depthWrite:!1})}function _c(){return new Pn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Kr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Gn,depthTest:!1,depthWrite:!1})}function vc(){return new Pn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Kr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Gn,depthTest:!1,depthWrite:!1})}function Kr(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Gg(i){let t=new WeakMap,e=null;function n(a){if(a&&a.isTexture){const l=a.mapping,c=l===na||l===ia,h=l===Li||l===os;if(c||h){let u=t.get(a);const d=u!==void 0?u.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==d)return e===null&&(e=new gc(i)),u=c?e.fromEquirectangular(a,u):e.fromCubemap(a,u),u.texture.pmremVersion=a.pmremVersion,t.set(a,u),u.texture;if(u!==void 0)return u.texture;{const p=a.image;return c&&p&&p.height>0||h&&p&&s(p)?(e===null&&(e=new gc(i)),u=c?e.fromEquirectangular(a):e.fromCubemap(a),u.texture.pmremVersion=a.pmremVersion,t.set(a,u),a.addEventListener("dispose",r),u.texture):null}}}return a}function s(a){let l=0;const c=6;for(let h=0;h<c;h++)a[h]!==void 0&&l++;return l===c}function r(a){const l=a.target;l.removeEventListener("dispose",r);const c=t.get(l);c!==void 0&&(t.delete(l),c.dispose())}function o(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:n,dispose:o}}function Hg(i){const t={};function e(n){if(t[n]!==void 0)return t[n];const s=i.getExtension(n);return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){const s=e(n);return s===null&&Os("WebGLRenderer: "+n+" extension not supported."),s}}}function Wg(i,t,e,n){const s={},r=new WeakMap;function o(u){const d=u.target;d.index!==null&&t.remove(d.index);for(const g in d.attributes)t.remove(d.attributes[g]);d.removeEventListener("dispose",o),delete s[d.id];const p=r.get(d);p&&(t.remove(p),r.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,e.memory.geometries--}function a(u,d){return s[d.id]===!0||(d.addEventListener("dispose",o),s[d.id]=!0,e.memory.geometries++),d}function l(u){const d=u.attributes;for(const p in d)t.update(d[p],i.ARRAY_BUFFER)}function c(u){const d=[],p=u.index,g=u.attributes.position;let x=0;if(p!==null){const A=p.array;x=p.version;for(let v=0,S=A.length;v<S;v+=3){const w=A[v+0],R=A[v+1],P=A[v+2];d.push(w,R,R,P,P,w)}}else if(g!==void 0){const A=g.array;x=g.version;for(let v=0,S=A.length/3-1;v<S;v+=3){const w=v+0,R=v+1,P=v+2;d.push(w,R,R,P,P,w)}}else return;const m=new(hh(d)?gh:mh)(d,1);m.version=x;const f=r.get(u);f&&t.remove(f),r.set(u,m)}function h(u){const d=r.get(u);if(d){const p=u.index;p!==null&&d.version<p.version&&c(u)}else c(u);return r.get(u)}return{get:a,update:l,getWireframeAttribute:h}}function Xg(i,t,e){let n;function s(d){n=d}let r,o;function a(d){r=d.type,o=d.bytesPerElement}function l(d,p){i.drawElements(n,p,r,d*o),e.update(p,n,1)}function c(d,p,g){g!==0&&(i.drawElementsInstanced(n,p,r,d*o,g),e.update(p,n,g))}function h(d,p,g){if(g===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,p,0,r,d,0,g);let m=0;for(let f=0;f<g;f++)m+=p[f];e.update(m,n,1)}function u(d,p,g,x){if(g===0)return;const m=t.get("WEBGL_multi_draw");if(m===null)for(let f=0;f<d.length;f++)c(d[f]/o,p[f],x[f]);else{m.multiDrawElementsInstancedWEBGL(n,p,0,r,d,0,x,0,g);let f=0;for(let A=0;A<g;A++)f+=p[A]*x[A];e.update(f,n,1)}}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function Yg(i){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(e.calls++,o){case i.TRIANGLES:e.triangles+=a*(r/3);break;case i.LINES:e.lines+=a*(r/2);break;case i.LINE_STRIP:e.lines+=a*(r-1);break;case i.LINE_LOOP:e.lines+=a*r;break;case i.POINTS:e.points+=a*r;break;default:ee("WebGLInfo: Unknown draw mode:",o);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function qg(i,t,e){const n=new WeakMap,s=new ve;function r(o,a,l){const c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0;let d=n.get(a);if(d===void 0||d.count!==u){let C=function(){I.dispose(),n.delete(a),a.removeEventListener("dispose",C)};var p=C;d!==void 0&&d.texture.dispose();const g=a.morphAttributes.position!==void 0,x=a.morphAttributes.normal!==void 0,m=a.morphAttributes.color!==void 0,f=a.morphAttributes.position||[],A=a.morphAttributes.normal||[],v=a.morphAttributes.color||[];let S=0;g===!0&&(S=1),x===!0&&(S=2),m===!0&&(S=3);let w=a.attributes.position.count*S,R=1;w>t.maxTextureSize&&(R=Math.ceil(w/t.maxTextureSize),w=t.maxTextureSize);const P=new Float32Array(w*R*4*u),I=new uh(P,w,R,u);I.type=Mn,I.needsUpdate=!0;const y=S*4;for(let U=0;U<u;U++){const V=f[U],X=A[U],Y=v[U],j=w*R*4*U;for(let Z=0;Z<V.count;Z++){const O=Z*y;g===!0&&(s.fromBufferAttribute(V,Z),P[j+O+0]=s.x,P[j+O+1]=s.y,P[j+O+2]=s.z,P[j+O+3]=0),x===!0&&(s.fromBufferAttribute(X,Z),P[j+O+4]=s.x,P[j+O+5]=s.y,P[j+O+6]=s.z,P[j+O+7]=0),m===!0&&(s.fromBufferAttribute(Y,Z),P[j+O+8]=s.x,P[j+O+9]=s.y,P[j+O+10]=s.z,P[j+O+11]=Y.itemSize===4?s.w:1)}}d={count:u,texture:I,size:new ct(w,R)},n.set(a,d),a.addEventListener("dispose",C)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,e);else{let g=0;for(let m=0;m<c.length;m++)g+=c[m];const x=a.morphTargetsRelative?1:1-g;l.getUniforms().setValue(i,"morphTargetBaseInfluence",x),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",d.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:r}}function $g(i,t,e,n){let s=new WeakMap;function r(l){const c=n.render.frame,h=l.geometry,u=t.get(l,h);if(s.get(u)!==c&&(t.update(u),s.set(u,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),s.get(l)!==c&&(e.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,i.ARRAY_BUFFER),s.set(l,c))),l.isSkinnedMesh){const d=l.skeleton;s.get(d)!==c&&(d.update(),s.set(d,c))}return u}function o(){s=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),e.remove(c.instanceMatrix),c.instanceColor!==null&&e.remove(c.instanceColor)}return{update:r,dispose:o}}const Zg={[$c]:"LINEAR_TONE_MAPPING",[Zc]:"REINHARD_TONE_MAPPING",[jc]:"CINEON_TONE_MAPPING",[Kc]:"ACES_FILMIC_TONE_MAPPING",[Qc]:"AGX_TONE_MAPPING",[th]:"NEUTRAL_TONE_MAPPING",[Jc]:"CUSTOM_TONE_MAPPING"};function jg(i,t,e,n,s){const r=new An(t,e,{type:i,depthBuffer:n,stencilBuffer:s}),o=new An(t,e,{type:Wn,depthBuffer:!1,stencilBuffer:!1}),a=new Oe;a.setAttribute("position",new Se([-1,3,0,-1,-1,0,3,-1,0],3)),a.setAttribute("uv",new Se([0,2,0,0,2,0],2));const l=new Df({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),c=new xn(a,l),h=new ll(-1,1,1,-1,0,1);let u=null,d=null,p=!1,g,x=null,m=[],f=!1;this.setSize=function(A,v){r.setSize(A,v),o.setSize(A,v);for(let S=0;S<m.length;S++){const w=m[S];w.setSize&&w.setSize(A,v)}},this.setEffects=function(A){m=A,f=m.length>0&&m[0].isRenderPass===!0;const v=r.width,S=r.height;for(let w=0;w<m.length;w++){const R=m[w];R.setSize&&R.setSize(v,S)}},this.begin=function(A,v){if(p||A.toneMapping===En&&m.length===0)return!1;if(x=v,v!==null){const S=v.width,w=v.height;(r.width!==S||r.height!==w)&&this.setSize(S,w)}return f===!1&&A.setRenderTarget(r),g=A.toneMapping,A.toneMapping=En,!0},this.hasRenderPass=function(){return f},this.end=function(A,v){A.toneMapping=g,p=!0;let S=r,w=o;for(let R=0;R<m.length;R++){const P=m[R];if(P.enabled!==!1&&(P.render(A,w,S,v),P.needsSwap!==!1)){const I=S;S=w,w=I}}if(u!==A.outputColorSpace||d!==A.toneMapping){u=A.outputColorSpace,d=A.toneMapping,l.defines={},Qt.getTransfer(u)===se&&(l.defines.SRGB_TRANSFER="");const R=Zg[d];R&&(l.defines[R]=""),l.needsUpdate=!0}l.uniforms.tDiffuse.value=S.texture,A.setRenderTarget(x),A.render(c,h),x=null,p=!1},this.isCompositing=function(){return p},this.dispose=function(){r.dispose(),o.dispose(),a.dispose(),l.dispose()}}const Nh=new He,za=new ks(1,1),Uh=new uh,Fh=new Id,Oh=new vh,yc=[],Sc=[],Mc=new Float32Array(16),bc=new Float32Array(9),Ec=new Float32Array(4);function ps(i,t,e){const n=i[0];if(n<=0||n>0)return i;const s=t*e;let r=yc[s];if(r===void 0&&(r=new Float32Array(s),yc[s]=r),t!==0){n.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,i[o].toArray(r,a)}return r}function we(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function Pe(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function Jr(i,t){let e=Sc[t];e===void 0&&(e=new Int32Array(t),Sc[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function Kg(i,t){const e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function Jg(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(we(e,t))return;i.uniform2fv(this.addr,t),Pe(e,t)}}function Qg(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(we(e,t))return;i.uniform3fv(this.addr,t),Pe(e,t)}}function t0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(we(e,t))return;i.uniform4fv(this.addr,t),Pe(e,t)}}function e0(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(we(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),Pe(e,t)}else{if(we(e,n))return;Ec.set(n),i.uniformMatrix2fv(this.addr,!1,Ec),Pe(e,n)}}function n0(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(we(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),Pe(e,t)}else{if(we(e,n))return;bc.set(n),i.uniformMatrix3fv(this.addr,!1,bc),Pe(e,n)}}function i0(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(we(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),Pe(e,t)}else{if(we(e,n))return;Mc.set(n),i.uniformMatrix4fv(this.addr,!1,Mc),Pe(e,n)}}function s0(i,t){const e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function r0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(we(e,t))return;i.uniform2iv(this.addr,t),Pe(e,t)}}function o0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(we(e,t))return;i.uniform3iv(this.addr,t),Pe(e,t)}}function a0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(we(e,t))return;i.uniform4iv(this.addr,t),Pe(e,t)}}function l0(i,t){const e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function c0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(we(e,t))return;i.uniform2uiv(this.addr,t),Pe(e,t)}}function h0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(we(e,t))return;i.uniform3uiv(this.addr,t),Pe(e,t)}}function u0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(we(e,t))return;i.uniform4uiv(this.addr,t),Pe(e,t)}}function d0(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(za.compareFunction=e.isReversedDepthBuffer()?Ja:Ka,r=za):r=Nh,e.setTexture2D(t||r,s)}function f0(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||Fh,s)}function p0(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTextureCube(t||Oh,s)}function m0(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||Uh,s)}function g0(i){switch(i){case 5126:return Kg;case 35664:return Jg;case 35665:return Qg;case 35666:return t0;case 35674:return e0;case 35675:return n0;case 35676:return i0;case 5124:case 35670:return s0;case 35667:case 35671:return r0;case 35668:case 35672:return o0;case 35669:case 35673:return a0;case 5125:return l0;case 36294:return c0;case 36295:return h0;case 36296:return u0;case 35678:case 36198:case 36298:case 36306:case 35682:return d0;case 35679:case 36299:case 36307:return f0;case 35680:case 36300:case 36308:case 36293:return p0;case 36289:case 36303:case 36311:case 36292:return m0}}function x0(i,t){i.uniform1fv(this.addr,t)}function _0(i,t){const e=ps(t,this.size,2);i.uniform2fv(this.addr,e)}function v0(i,t){const e=ps(t,this.size,3);i.uniform3fv(this.addr,e)}function y0(i,t){const e=ps(t,this.size,4);i.uniform4fv(this.addr,e)}function S0(i,t){const e=ps(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function M0(i,t){const e=ps(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function b0(i,t){const e=ps(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function E0(i,t){i.uniform1iv(this.addr,t)}function A0(i,t){i.uniform2iv(this.addr,t)}function T0(i,t){i.uniform3iv(this.addr,t)}function C0(i,t){i.uniform4iv(this.addr,t)}function w0(i,t){i.uniform1uiv(this.addr,t)}function P0(i,t){i.uniform2uiv(this.addr,t)}function R0(i,t){i.uniform3uiv(this.addr,t)}function L0(i,t){i.uniform4uiv(this.addr,t)}function D0(i,t,e){const n=this.cache,s=t.length,r=Jr(e,s);we(n,r)||(i.uniform1iv(this.addr,r),Pe(n,r));let o;this.type===i.SAMPLER_2D_SHADOW?o=za:o=Nh;for(let a=0;a!==s;++a)e.setTexture2D(t[a]||o,r[a])}function I0(i,t,e){const n=this.cache,s=t.length,r=Jr(e,s);we(n,r)||(i.uniform1iv(this.addr,r),Pe(n,r));for(let o=0;o!==s;++o)e.setTexture3D(t[o]||Fh,r[o])}function N0(i,t,e){const n=this.cache,s=t.length,r=Jr(e,s);we(n,r)||(i.uniform1iv(this.addr,r),Pe(n,r));for(let o=0;o!==s;++o)e.setTextureCube(t[o]||Oh,r[o])}function U0(i,t,e){const n=this.cache,s=t.length,r=Jr(e,s);we(n,r)||(i.uniform1iv(this.addr,r),Pe(n,r));for(let o=0;o!==s;++o)e.setTexture2DArray(t[o]||Uh,r[o])}function F0(i){switch(i){case 5126:return x0;case 35664:return _0;case 35665:return v0;case 35666:return y0;case 35674:return S0;case 35675:return M0;case 35676:return b0;case 5124:case 35670:return E0;case 35667:case 35671:return A0;case 35668:case 35672:return T0;case 35669:case 35673:return C0;case 5125:return w0;case 36294:return P0;case 36295:return R0;case 36296:return L0;case 35678:case 36198:case 36298:case 36306:case 35682:return D0;case 35679:case 36299:case 36307:return I0;case 35680:case 36300:case 36308:case 36293:return N0;case 36289:case 36303:case 36311:case 36292:return U0}}class O0{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=g0(e.type)}}class B0{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=F0(e.type)}}class k0{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){const s=this.seq;for(let r=0,o=s.length;r!==o;++r){const a=s[r];a.setValue(t,e[a.id],n)}}}const zo=/(\w+)(\])?(\[|\.)?/g;function Ac(i,t){i.seq.push(t),i.map[t.id]=t}function z0(i,t,e){const n=i.name,s=n.length;for(zo.lastIndex=0;;){const r=zo.exec(n),o=zo.lastIndex;let a=r[1];const l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){Ac(e,c===void 0?new O0(a,i,t):new B0(a,i,t));break}else{let u=e.map[a];u===void 0&&(u=new k0(a),Ac(e,u)),e=u}}}class Nr{constructor(t,e){this.seq=[],this.map={};const n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){const a=t.getActiveUniform(e,o),l=t.getUniformLocation(e,a.name);z0(a,l,this)}const s=[],r=[];for(const o of this.seq)o.type===t.SAMPLER_2D_SHADOW||o.type===t.SAMPLER_CUBE_SHADOW||o.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,n,s){const r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){const s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,o=e.length;r!==o;++r){const a=e[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,s)}}static seqWithValue(t,e){const n=[];for(let s=0,r=t.length;s!==r;++s){const o=t[s];o.id in e&&n.push(o)}return n}}function Tc(i,t,e){const n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}const V0=37297;let G0=0;function H0(i,t){const e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=s;o<r;o++){const a=o+1;n.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return n.join(`
`)}const Cc=new Xt;function W0(i){Qt._getMatrix(Cc,Qt.workingColorSpace,i);const t=`mat3( ${Cc.elements.map(e=>e.toFixed(4))} )`;switch(Qt.getTransfer(i)){case Or:return[t,"LinearTransferOETF"];case se:return[t,"sRGBTransferOETF"];default:return Vt("WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function wc(i,t,e){const n=i.getShaderParameter(t,i.COMPILE_STATUS),r=(i.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";const o=/ERROR: 0:(\d+)/.exec(r);if(o){const a=parseInt(o[1]);return e.toUpperCase()+`

`+r+`

`+H0(i.getShaderSource(t),a)}else return r}function X0(i,t){const e=W0(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}const Y0={[$c]:"Linear",[Zc]:"Reinhard",[jc]:"Cineon",[Kc]:"ACESFilmic",[Qc]:"AgX",[th]:"Neutral",[Jc]:"Custom"};function q0(i,t){const e=Y0[t];return e===void 0?(Vt("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const Er=new N;function $0(){Qt.getLuminanceCoefficients(Er);const i=Er.x.toFixed(4),t=Er.y.toFixed(4),e=Er.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Z0(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ts).join(`
`)}function j0(i){const t=[];for(const e in i){const n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function K0(i,t){const e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){const r=i.getActiveAttrib(t,s),o=r.name;let a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:i.getAttribLocation(t,o),locationSize:a}}return e}function Ts(i){return i!==""}function Pc(i,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function Rc(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const J0=/^[ \t]*#include +<([\w\d./]+)>/gm;function Va(i){return i.replace(J0,tx)}const Q0=new Map;function tx(i,t){let e=$t[t];if(e===void 0){const n=Q0.get(t);if(n!==void 0)e=$t[n],Vt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("Can not resolve #include <"+t+">")}return Va(e)}const ex=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Lc(i){return i.replace(ex,nx)}function nx(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function Dc(i){let t=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?t+=`
#define HIGH_PRECISION`:i.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}const ix={[Cr]:"SHADOWMAP_TYPE_PCF",[Es]:"SHADOWMAP_TYPE_VSM"};function sx(i){return ix[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const rx={[Li]:"ENVMAP_TYPE_CUBE",[os]:"ENVMAP_TYPE_CUBE",[qr]:"ENVMAP_TYPE_CUBE_UV"};function ox(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":rx[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const ax={[os]:"ENVMAP_MODE_REFRACTION"};function lx(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":ax[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const cx={[qc]:"ENVMAP_BLENDING_MULTIPLY",[Ju]:"ENVMAP_BLENDING_MIX",[Qu]:"ENVMAP_BLENDING_ADD"};function hx(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":cx[i.combine]||"ENVMAP_BLENDING_NONE"}function ux(i){const t=i.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),7*16)),texelHeight:n,maxMip:e}}function dx(i,t,e,n){const s=i.getContext(),r=e.defines;let o=e.vertexShader,a=e.fragmentShader;const l=sx(e),c=ox(e),h=lx(e),u=hx(e),d=ux(e),p=Z0(e),g=j0(r),x=s.createProgram();let m,f,A=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(Ts).join(`
`),m.length>0&&(m+=`
`),f=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(Ts).join(`
`),f.length>0&&(f+=`
`)):(m=[Dc(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ts).join(`
`),f=[Dc(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==En?"#define TONE_MAPPING":"",e.toneMapping!==En?$t.tonemapping_pars_fragment:"",e.toneMapping!==En?q0("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",$t.colorspace_pars_fragment,X0("linearToOutputTexel",e.outputColorSpace),$0(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Ts).join(`
`)),o=Va(o),o=Pc(o,e),o=Rc(o,e),a=Va(a),a=Pc(a,e),a=Rc(a,e),o=Lc(o),a=Lc(a),e.isRawShaderMaterial!==!0&&(A=`#version 300 es
`,m=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,f=["#define varying in",e.glslVersion===Dl?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Dl?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+f);const v=A+m+o,S=A+f+a,w=Tc(s,s.VERTEX_SHADER,v),R=Tc(s,s.FRAGMENT_SHADER,S);s.attachShader(x,w),s.attachShader(x,R),e.index0AttributeName!==void 0?s.bindAttribLocation(x,0,e.index0AttributeName):e.morphTargets===!0&&s.bindAttribLocation(x,0,"position"),s.linkProgram(x);function P(U){if(i.debug.checkShaderErrors){const V=s.getProgramInfoLog(x)||"",X=s.getShaderInfoLog(w)||"",Y=s.getShaderInfoLog(R)||"",j=V.trim(),Z=X.trim(),O=Y.trim();let z=!0,pt=!0;if(s.getProgramParameter(x,s.LINK_STATUS)===!1)if(z=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,x,w,R);else{const at=wc(s,w,"vertex"),_t=wc(s,R,"fragment");ee("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(x,s.VALIDATE_STATUS)+`

Material Name: `+U.name+`
Material Type: `+U.type+`

Program Info Log: `+j+`
`+at+`
`+_t)}else j!==""?Vt("WebGLProgram: Program Info Log:",j):(Z===""||O==="")&&(pt=!1);pt&&(U.diagnostics={runnable:z,programLog:j,vertexShader:{log:Z,prefix:m},fragmentShader:{log:O,prefix:f}})}s.deleteShader(w),s.deleteShader(R),I=new Nr(s,x),y=K0(s,x)}let I;this.getUniforms=function(){return I===void 0&&P(this),I};let y;this.getAttributes=function(){return y===void 0&&P(this),y};let C=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return C===!1&&(C=s.getProgramParameter(x,V0)),C},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(x),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=G0++,this.cacheKey=t,this.usedTimes=1,this.program=x,this.vertexShader=w,this.fragmentShader=R,this}let fx=0;class px{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,n=t.fragmentShader,s=this._getShaderStage(e),r=this._getShaderStage(n),o=this._getShaderCacheForMaterial(t);return o.has(s)===!1&&(o.add(s),s.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){const e=this.shaderCache;let n=e.get(t);return n===void 0&&(n=new mx(t),e.set(t,n)),n}}class mx{constructor(t){this.id=fx++,this.code=t,this.usedTimes=0}}function gx(i,t,e,n,s,r,o){const a=new dh,l=new px,c=new Set,h=[],u=new Map,d=s.logarithmicDepthBuffer;let p=s.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(y){return c.add(y),y===0?"uv":`uv${y}`}function m(y,C,U,V,X){const Y=V.fog,j=X.geometry,Z=y.isMeshStandardMaterial?V.environment:null,O=(y.isMeshStandardMaterial?e:t).get(y.envMap||Z),z=O&&O.mapping===qr?O.image.height:null,pt=g[y.type];y.precision!==null&&(p=s.getMaxPrecision(y.precision),p!==y.precision&&Vt("WebGLProgram.getParameters:",y.precision,"not supported, using",p,"instead."));const at=j.morphAttributes.position||j.morphAttributes.normal||j.morphAttributes.color,_t=at!==void 0?at.length:0;let Gt=0;j.morphAttributes.position!==void 0&&(Gt=1),j.morphAttributes.normal!==void 0&&(Gt=2),j.morphAttributes.color!==void 0&&(Gt=3);let Yt,$,F,E;if(pt){const ne=yn[pt];Yt=ne.vertexShader,$=ne.fragmentShader}else Yt=y.vertexShader,$=y.fragmentShader,l.update(y),F=l.getVertexShaderID(y),E=l.getFragmentShaderID(y);const b=i.getRenderTarget(),W=i.state.buffers.depth.getReversed(),nt=X.isInstancedMesh===!0,H=X.isBatchedMesh===!0,lt=!!y.map,vt=!!y.matcap,ut=!!O,tt=!!y.aoMap,st=!!y.lightMap,ht=!!y.bumpMap,bt=!!y.normalMap,M=!!y.displacementMap,D=!!y.emissiveMap,mt=!!y.metalnessMap,Ut=!!y.roughnessMap,Ct=y.anisotropy>0,L=y.clearcoat>0,_=y.dispersion>0,B=y.iridescence>0,et=y.sheen>0,rt=y.transmission>0,Q=Ct&&!!y.anisotropyMap,It=L&&!!y.clearcoatMap,xt=L&&!!y.clearcoatNormalMap,Lt=L&&!!y.clearcoatRoughnessMap,zt=B&&!!y.iridescenceMap,dt=B&&!!y.iridescenceThicknessMap,yt=et&&!!y.sheenColorMap,Nt=et&&!!y.sheenRoughnessMap,Ft=!!y.specularMap,Mt=!!y.specularColorMap,Kt=!!y.specularIntensityMap,k=rt&&!!y.transmissionMap,wt=rt&&!!y.thicknessMap,gt=!!y.gradientMap,Pt=!!y.alphaMap,ft=y.alphaTest>0,ot=!!y.alphaHash,St=!!y.extensions;let qt=En;y.toneMapped&&(b===null||b.isXRRenderTarget===!0)&&(qt=i.toneMapping);const de={shaderID:pt,shaderType:y.type,shaderName:y.name,vertexShader:Yt,fragmentShader:$,defines:y.defines,customVertexShaderID:F,customFragmentShaderID:E,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:p,batching:H,batchingColor:H&&X._colorsTexture!==null,instancing:nt,instancingColor:nt&&X.instanceColor!==null,instancingMorph:nt&&X.morphTexture!==null,outputColorSpace:b===null?i.outputColorSpace:b.isXRRenderTarget===!0?b.texture.colorSpace:ls,alphaToCoverage:!!y.alphaToCoverage,map:lt,matcap:vt,envMap:ut,envMapMode:ut&&O.mapping,envMapCubeUVHeight:z,aoMap:tt,lightMap:st,bumpMap:ht,normalMap:bt,displacementMap:M,emissiveMap:D,normalMapObjectSpace:bt&&y.normalMapType===nd,normalMapTangentSpace:bt&&y.normalMapType===ch,metalnessMap:mt,roughnessMap:Ut,anisotropy:Ct,anisotropyMap:Q,clearcoat:L,clearcoatMap:It,clearcoatNormalMap:xt,clearcoatRoughnessMap:Lt,dispersion:_,iridescence:B,iridescenceMap:zt,iridescenceThicknessMap:dt,sheen:et,sheenColorMap:yt,sheenRoughnessMap:Nt,specularMap:Ft,specularColorMap:Mt,specularIntensityMap:Kt,transmission:rt,transmissionMap:k,thicknessMap:wt,gradientMap:gt,opaque:y.transparent===!1&&y.blending===ns&&y.alphaToCoverage===!1,alphaMap:Pt,alphaTest:ft,alphaHash:ot,combine:y.combine,mapUv:lt&&x(y.map.channel),aoMapUv:tt&&x(y.aoMap.channel),lightMapUv:st&&x(y.lightMap.channel),bumpMapUv:ht&&x(y.bumpMap.channel),normalMapUv:bt&&x(y.normalMap.channel),displacementMapUv:M&&x(y.displacementMap.channel),emissiveMapUv:D&&x(y.emissiveMap.channel),metalnessMapUv:mt&&x(y.metalnessMap.channel),roughnessMapUv:Ut&&x(y.roughnessMap.channel),anisotropyMapUv:Q&&x(y.anisotropyMap.channel),clearcoatMapUv:It&&x(y.clearcoatMap.channel),clearcoatNormalMapUv:xt&&x(y.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Lt&&x(y.clearcoatRoughnessMap.channel),iridescenceMapUv:zt&&x(y.iridescenceMap.channel),iridescenceThicknessMapUv:dt&&x(y.iridescenceThicknessMap.channel),sheenColorMapUv:yt&&x(y.sheenColorMap.channel),sheenRoughnessMapUv:Nt&&x(y.sheenRoughnessMap.channel),specularMapUv:Ft&&x(y.specularMap.channel),specularColorMapUv:Mt&&x(y.specularColorMap.channel),specularIntensityMapUv:Kt&&x(y.specularIntensityMap.channel),transmissionMapUv:k&&x(y.transmissionMap.channel),thicknessMapUv:wt&&x(y.thicknessMap.channel),alphaMapUv:Pt&&x(y.alphaMap.channel),vertexTangents:!!j.attributes.tangent&&(bt||Ct),vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!j.attributes.color&&j.attributes.color.itemSize===4,pointsUvs:X.isPoints===!0&&!!j.attributes.uv&&(lt||Pt),fog:!!Y,useFog:y.fog===!0,fogExp2:!!Y&&Y.isFogExp2,flatShading:y.flatShading===!0&&y.wireframe===!1,sizeAttenuation:y.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:W,skinning:X.isSkinnedMesh===!0,morphTargets:j.morphAttributes.position!==void 0,morphNormals:j.morphAttributes.normal!==void 0,morphColors:j.morphAttributes.color!==void 0,morphTargetsCount:_t,morphTextureStride:Gt,numDirLights:C.directional.length,numPointLights:C.point.length,numSpotLights:C.spot.length,numSpotLightMaps:C.spotLightMap.length,numRectAreaLights:C.rectArea.length,numHemiLights:C.hemi.length,numDirLightShadows:C.directionalShadowMap.length,numPointLightShadows:C.pointShadowMap.length,numSpotLightShadows:C.spotShadowMap.length,numSpotLightShadowsWithMaps:C.numSpotLightShadowsWithMaps,numLightProbes:C.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:y.dithering,shadowMapEnabled:i.shadowMap.enabled&&U.length>0,shadowMapType:i.shadowMap.type,toneMapping:qt,decodeVideoTexture:lt&&y.map.isVideoTexture===!0&&Qt.getTransfer(y.map.colorSpace)===se,decodeVideoTextureEmissive:D&&y.emissiveMap.isVideoTexture===!0&&Qt.getTransfer(y.emissiveMap.colorSpace)===se,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===Sn,flipSided:y.side===Ke,useDepthPacking:y.depthPacking>=0,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionClipCullDistance:St&&y.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(St&&y.extensions.multiDraw===!0||H)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:y.customProgramCacheKey()};return de.vertexUv1s=c.has(1),de.vertexUv2s=c.has(2),de.vertexUv3s=c.has(3),c.clear(),de}function f(y){const C=[];if(y.shaderID?C.push(y.shaderID):(C.push(y.customVertexShaderID),C.push(y.customFragmentShaderID)),y.defines!==void 0)for(const U in y.defines)C.push(U),C.push(y.defines[U]);return y.isRawShaderMaterial===!1&&(A(C,y),v(C,y),C.push(i.outputColorSpace)),C.push(y.customProgramCacheKey),C.join()}function A(y,C){y.push(C.precision),y.push(C.outputColorSpace),y.push(C.envMapMode),y.push(C.envMapCubeUVHeight),y.push(C.mapUv),y.push(C.alphaMapUv),y.push(C.lightMapUv),y.push(C.aoMapUv),y.push(C.bumpMapUv),y.push(C.normalMapUv),y.push(C.displacementMapUv),y.push(C.emissiveMapUv),y.push(C.metalnessMapUv),y.push(C.roughnessMapUv),y.push(C.anisotropyMapUv),y.push(C.clearcoatMapUv),y.push(C.clearcoatNormalMapUv),y.push(C.clearcoatRoughnessMapUv),y.push(C.iridescenceMapUv),y.push(C.iridescenceThicknessMapUv),y.push(C.sheenColorMapUv),y.push(C.sheenRoughnessMapUv),y.push(C.specularMapUv),y.push(C.specularColorMapUv),y.push(C.specularIntensityMapUv),y.push(C.transmissionMapUv),y.push(C.thicknessMapUv),y.push(C.combine),y.push(C.fogExp2),y.push(C.sizeAttenuation),y.push(C.morphTargetsCount),y.push(C.morphAttributeCount),y.push(C.numDirLights),y.push(C.numPointLights),y.push(C.numSpotLights),y.push(C.numSpotLightMaps),y.push(C.numHemiLights),y.push(C.numRectAreaLights),y.push(C.numDirLightShadows),y.push(C.numPointLightShadows),y.push(C.numSpotLightShadows),y.push(C.numSpotLightShadowsWithMaps),y.push(C.numLightProbes),y.push(C.shadowMapType),y.push(C.toneMapping),y.push(C.numClippingPlanes),y.push(C.numClipIntersection),y.push(C.depthPacking)}function v(y,C){a.disableAll(),C.instancing&&a.enable(0),C.instancingColor&&a.enable(1),C.instancingMorph&&a.enable(2),C.matcap&&a.enable(3),C.envMap&&a.enable(4),C.normalMapObjectSpace&&a.enable(5),C.normalMapTangentSpace&&a.enable(6),C.clearcoat&&a.enable(7),C.iridescence&&a.enable(8),C.alphaTest&&a.enable(9),C.vertexColors&&a.enable(10),C.vertexAlphas&&a.enable(11),C.vertexUv1s&&a.enable(12),C.vertexUv2s&&a.enable(13),C.vertexUv3s&&a.enable(14),C.vertexTangents&&a.enable(15),C.anisotropy&&a.enable(16),C.alphaHash&&a.enable(17),C.batching&&a.enable(18),C.dispersion&&a.enable(19),C.batchingColor&&a.enable(20),C.gradientMap&&a.enable(21),y.push(a.mask),a.disableAll(),C.fog&&a.enable(0),C.useFog&&a.enable(1),C.flatShading&&a.enable(2),C.logarithmicDepthBuffer&&a.enable(3),C.reversedDepthBuffer&&a.enable(4),C.skinning&&a.enable(5),C.morphTargets&&a.enable(6),C.morphNormals&&a.enable(7),C.morphColors&&a.enable(8),C.premultipliedAlpha&&a.enable(9),C.shadowMapEnabled&&a.enable(10),C.doubleSided&&a.enable(11),C.flipSided&&a.enable(12),C.useDepthPacking&&a.enable(13),C.dithering&&a.enable(14),C.transmission&&a.enable(15),C.sheen&&a.enable(16),C.opaque&&a.enable(17),C.pointsUvs&&a.enable(18),C.decodeVideoTexture&&a.enable(19),C.decodeVideoTextureEmissive&&a.enable(20),C.alphaToCoverage&&a.enable(21),y.push(a.mask)}function S(y){const C=g[y.type];let U;if(C){const V=yn[C];U=Yd.clone(V.uniforms)}else U=y.uniforms;return U}function w(y,C){let U=u.get(C);return U!==void 0?++U.usedTimes:(U=new dx(i,C,y,r),h.push(U),u.set(C,U)),U}function R(y){if(--y.usedTimes===0){const C=h.indexOf(y);h[C]=h[h.length-1],h.pop(),u.delete(y.cacheKey),y.destroy()}}function P(y){l.remove(y)}function I(){l.dispose()}return{getParameters:m,getProgramCacheKey:f,getUniforms:S,acquireProgram:w,releaseProgram:R,releaseShaderCache:P,programs:h,dispose:I}}function xx(){let i=new WeakMap;function t(o){return i.has(o)}function e(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,l){i.get(o)[a]=l}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function _x(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.z!==t.z?i.z-t.z:i.id-t.id}function Ic(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function Nc(){const i=[];let t=0;const e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function o(u,d,p,g,x,m){let f=i[t];return f===void 0?(f={id:u.id,object:u,geometry:d,material:p,groupOrder:g,renderOrder:u.renderOrder,z:x,group:m},i[t]=f):(f.id=u.id,f.object=u,f.geometry=d,f.material=p,f.groupOrder=g,f.renderOrder=u.renderOrder,f.z=x,f.group=m),t++,f}function a(u,d,p,g,x,m){const f=o(u,d,p,g,x,m);p.transmission>0?n.push(f):p.transparent===!0?s.push(f):e.push(f)}function l(u,d,p,g,x,m){const f=o(u,d,p,g,x,m);p.transmission>0?n.unshift(f):p.transparent===!0?s.unshift(f):e.unshift(f)}function c(u,d){e.length>1&&e.sort(u||_x),n.length>1&&n.sort(d||Ic),s.length>1&&s.sort(d||Ic)}function h(){for(let u=t,d=i.length;u<d;u++){const p=i[u];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:a,unshift:l,finish:h,sort:c}}function vx(){let i=new WeakMap;function t(n,s){const r=i.get(n);let o;return r===void 0?(o=new Nc,i.set(n,[o])):s>=r.length?(o=new Nc,r.push(o)):o=r[s],o}function e(){i=new WeakMap}return{get:t,dispose:e}}function yx(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new N,color:new jt};break;case"SpotLight":e={position:new N,direction:new N,color:new jt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new N,color:new jt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new N,skyColor:new jt,groundColor:new jt};break;case"RectAreaLight":e={color:new jt,position:new N,halfWidth:new N,halfHeight:new N};break}return i[t.id]=e,e}}}function Sx(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ct};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ct};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ct,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}let Mx=0;function bx(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function Ex(i){const t=new yx,e=Sx(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new N);const s=new N,r=new ue,o=new ue;function a(c){let h=0,u=0,d=0;for(let y=0;y<9;y++)n.probe[y].set(0,0,0);let p=0,g=0,x=0,m=0,f=0,A=0,v=0,S=0,w=0,R=0,P=0;c.sort(bx);for(let y=0,C=c.length;y<C;y++){const U=c[y],V=U.color,X=U.intensity,Y=U.distance;let j=null;if(U.shadow&&U.shadow.map&&(U.shadow.map.texture.format===as?j=U.shadow.map.texture:j=U.shadow.map.depthTexture||U.shadow.map.texture),U.isAmbientLight)h+=V.r*X,u+=V.g*X,d+=V.b*X;else if(U.isLightProbe){for(let Z=0;Z<9;Z++)n.probe[Z].addScaledVector(U.sh.coefficients[Z],X);P++}else if(U.isDirectionalLight){const Z=t.get(U);if(Z.color.copy(U.color).multiplyScalar(U.intensity),U.castShadow){const O=U.shadow,z=e.get(U);z.shadowIntensity=O.intensity,z.shadowBias=O.bias,z.shadowNormalBias=O.normalBias,z.shadowRadius=O.radius,z.shadowMapSize=O.mapSize,n.directionalShadow[p]=z,n.directionalShadowMap[p]=j,n.directionalShadowMatrix[p]=U.shadow.matrix,A++}n.directional[p]=Z,p++}else if(U.isSpotLight){const Z=t.get(U);Z.position.setFromMatrixPosition(U.matrixWorld),Z.color.copy(V).multiplyScalar(X),Z.distance=Y,Z.coneCos=Math.cos(U.angle),Z.penumbraCos=Math.cos(U.angle*(1-U.penumbra)),Z.decay=U.decay,n.spot[x]=Z;const O=U.shadow;if(U.map&&(n.spotLightMap[w]=U.map,w++,O.updateMatrices(U),U.castShadow&&R++),n.spotLightMatrix[x]=O.matrix,U.castShadow){const z=e.get(U);z.shadowIntensity=O.intensity,z.shadowBias=O.bias,z.shadowNormalBias=O.normalBias,z.shadowRadius=O.radius,z.shadowMapSize=O.mapSize,n.spotShadow[x]=z,n.spotShadowMap[x]=j,S++}x++}else if(U.isRectAreaLight){const Z=t.get(U);Z.color.copy(V).multiplyScalar(X),Z.halfWidth.set(U.width*.5,0,0),Z.halfHeight.set(0,U.height*.5,0),n.rectArea[m]=Z,m++}else if(U.isPointLight){const Z=t.get(U);if(Z.color.copy(U.color).multiplyScalar(U.intensity),Z.distance=U.distance,Z.decay=U.decay,U.castShadow){const O=U.shadow,z=e.get(U);z.shadowIntensity=O.intensity,z.shadowBias=O.bias,z.shadowNormalBias=O.normalBias,z.shadowRadius=O.radius,z.shadowMapSize=O.mapSize,z.shadowCameraNear=O.camera.near,z.shadowCameraFar=O.camera.far,n.pointShadow[g]=z,n.pointShadowMap[g]=j,n.pointShadowMatrix[g]=U.shadow.matrix,v++}n.point[g]=Z,g++}else if(U.isHemisphereLight){const Z=t.get(U);Z.skyColor.copy(U.color).multiplyScalar(X),Z.groundColor.copy(U.groundColor).multiplyScalar(X),n.hemi[f]=Z,f++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=At.LTC_FLOAT_1,n.rectAreaLTC2=At.LTC_FLOAT_2):(n.rectAreaLTC1=At.LTC_HALF_1,n.rectAreaLTC2=At.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=d;const I=n.hash;(I.directionalLength!==p||I.pointLength!==g||I.spotLength!==x||I.rectAreaLength!==m||I.hemiLength!==f||I.numDirectionalShadows!==A||I.numPointShadows!==v||I.numSpotShadows!==S||I.numSpotMaps!==w||I.numLightProbes!==P)&&(n.directional.length=p,n.spot.length=x,n.rectArea.length=m,n.point.length=g,n.hemi.length=f,n.directionalShadow.length=A,n.directionalShadowMap.length=A,n.pointShadow.length=v,n.pointShadowMap.length=v,n.spotShadow.length=S,n.spotShadowMap.length=S,n.directionalShadowMatrix.length=A,n.pointShadowMatrix.length=v,n.spotLightMatrix.length=S+w-R,n.spotLightMap.length=w,n.numSpotLightShadowsWithMaps=R,n.numLightProbes=P,I.directionalLength=p,I.pointLength=g,I.spotLength=x,I.rectAreaLength=m,I.hemiLength=f,I.numDirectionalShadows=A,I.numPointShadows=v,I.numSpotShadows=S,I.numSpotMaps=w,I.numLightProbes=P,n.version=Mx++)}function l(c,h){let u=0,d=0,p=0,g=0,x=0;const m=h.matrixWorldInverse;for(let f=0,A=c.length;f<A;f++){const v=c[f];if(v.isDirectionalLight){const S=n.directional[u];S.direction.setFromMatrixPosition(v.matrixWorld),s.setFromMatrixPosition(v.target.matrixWorld),S.direction.sub(s),S.direction.transformDirection(m),u++}else if(v.isSpotLight){const S=n.spot[p];S.position.setFromMatrixPosition(v.matrixWorld),S.position.applyMatrix4(m),S.direction.setFromMatrixPosition(v.matrixWorld),s.setFromMatrixPosition(v.target.matrixWorld),S.direction.sub(s),S.direction.transformDirection(m),p++}else if(v.isRectAreaLight){const S=n.rectArea[g];S.position.setFromMatrixPosition(v.matrixWorld),S.position.applyMatrix4(m),o.identity(),r.copy(v.matrixWorld),r.premultiply(m),o.extractRotation(r),S.halfWidth.set(v.width*.5,0,0),S.halfHeight.set(0,v.height*.5,0),S.halfWidth.applyMatrix4(o),S.halfHeight.applyMatrix4(o),g++}else if(v.isPointLight){const S=n.point[d];S.position.setFromMatrixPosition(v.matrixWorld),S.position.applyMatrix4(m),d++}else if(v.isHemisphereLight){const S=n.hemi[x];S.direction.setFromMatrixPosition(v.matrixWorld),S.direction.transformDirection(m),x++}}}return{setup:a,setupView:l,state:n}}function Uc(i){const t=new Ex(i),e=[],n=[];function s(h){c.camera=h,e.length=0,n.length=0}function r(h){e.push(h)}function o(h){n.push(h)}function a(){t.setup(e)}function l(h){t.setupView(e,h)}const c={lightsArray:e,shadowsArray:n,camera:null,lights:t,transmissionRenderTarget:{}};return{init:s,state:c,setupLights:a,setupLightsView:l,pushLight:r,pushShadow:o}}function Ax(i){let t=new WeakMap;function e(s,r=0){const o=t.get(s);let a;return o===void 0?(a=new Uc(i),t.set(s,[a])):r>=o.length?(a=new Uc(i),o.push(a)):a=o[r],a}function n(){t=new WeakMap}return{get:e,dispose:n}}const Tx=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Cx=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,wx=[new N(1,0,0),new N(-1,0,0),new N(0,1,0),new N(0,-1,0),new N(0,0,1),new N(0,0,-1)],Px=[new N(0,-1,0),new N(0,-1,0),new N(0,0,1),new N(0,0,-1),new N(0,-1,0),new N(0,-1,0)],Fc=new ue,bs=new N,Vo=new N;function Rx(i,t,e){let n=new nl;const s=new ct,r=new ct,o=new ve,a=new If,l=new Nf,c={},h=e.maxTextureSize,u={[li]:Ke,[Ke]:li,[Sn]:Sn},d=new Pn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ct},radius:{value:4}},vertexShader:Tx,fragmentShader:Cx}),p=d.clone();p.defines.HORIZONTAL_PASS=1;const g=new Oe;g.setAttribute("position",new gn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const x=new xn(g,d),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Cr;let f=this.type;this.render=function(R,P,I){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||R.length===0)return;R.type===Yc&&(Vt("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),R.type=Cr);const y=i.getRenderTarget(),C=i.getActiveCubeFace(),U=i.getActiveMipmapLevel(),V=i.state;V.setBlending(Gn),V.buffers.depth.getReversed()===!0?V.buffers.color.setClear(0,0,0,0):V.buffers.color.setClear(1,1,1,1),V.buffers.depth.setTest(!0),V.setScissorTest(!1);const X=f!==this.type;X&&P.traverse(function(Y){Y.material&&(Array.isArray(Y.material)?Y.material.forEach(j=>j.needsUpdate=!0):Y.material.needsUpdate=!0)});for(let Y=0,j=R.length;Y<j;Y++){const Z=R[Y],O=Z.shadow;if(O===void 0){Vt("WebGLShadowMap:",Z,"has no shadow.");continue}if(O.autoUpdate===!1&&O.needsUpdate===!1)continue;s.copy(O.mapSize);const z=O.getFrameExtents();if(s.multiply(z),r.copy(O.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/z.x),s.x=r.x*z.x,O.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/z.y),s.y=r.y*z.y,O.mapSize.y=r.y)),O.map===null||X===!0){if(O.map!==null&&(O.map.depthTexture!==null&&(O.map.depthTexture.dispose(),O.map.depthTexture=null),O.map.dispose()),this.type===Es){if(Z.isPointLight){Vt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}O.map=new An(s.x,s.y,{format:as,type:Wn,minFilter:Fe,magFilter:Fe,generateMipmaps:!1}),O.map.texture.name=Z.name+".shadowMap",O.map.depthTexture=new ks(s.x,s.y,Mn),O.map.depthTexture.name=Z.name+".shadowMapDepth",O.map.depthTexture.format=Xn,O.map.depthTexture.compareFunction=null,O.map.depthTexture.minFilter=De,O.map.depthTexture.magFilter=De}else{Z.isPointLight?(O.map=new yh(s.x),O.map.depthTexture=new nf(s.x,Cn)):(O.map=new An(s.x,s.y),O.map.depthTexture=new ks(s.x,s.y,Cn)),O.map.depthTexture.name=Z.name+".shadowMap",O.map.depthTexture.format=Xn;const at=i.state.buffers.depth.getReversed();this.type===Cr?(O.map.depthTexture.compareFunction=at?Ja:Ka,O.map.depthTexture.minFilter=Fe,O.map.depthTexture.magFilter=Fe):(O.map.depthTexture.compareFunction=null,O.map.depthTexture.minFilter=De,O.map.depthTexture.magFilter=De)}O.camera.updateProjectionMatrix()}const pt=O.map.isWebGLCubeRenderTarget?6:1;for(let at=0;at<pt;at++){if(O.map.isWebGLCubeRenderTarget)i.setRenderTarget(O.map,at),i.clear();else{at===0&&(i.setRenderTarget(O.map),i.clear());const _t=O.getViewport(at);o.set(r.x*_t.x,r.y*_t.y,r.x*_t.z,r.y*_t.w),V.viewport(o)}if(Z.isPointLight){const _t=O.camera,Gt=O.matrix,Yt=Z.distance||_t.far;Yt!==_t.far&&(_t.far=Yt,_t.updateProjectionMatrix()),bs.setFromMatrixPosition(Z.matrixWorld),_t.position.copy(bs),Vo.copy(_t.position),Vo.add(wx[at]),_t.up.copy(Px[at]),_t.lookAt(Vo),_t.updateMatrixWorld(),Gt.makeTranslation(-bs.x,-bs.y,-bs.z),Fc.multiplyMatrices(_t.projectionMatrix,_t.matrixWorldInverse),O._frustum.setFromProjectionMatrix(Fc,_t.coordinateSystem,_t.reversedDepth)}else O.updateMatrices(Z);n=O.getFrustum(),S(P,I,O.camera,Z,this.type)}O.isPointLightShadow!==!0&&this.type===Es&&A(O,I),O.needsUpdate=!1}f=this.type,m.needsUpdate=!1,i.setRenderTarget(y,C,U)};function A(R,P){const I=t.update(x);d.defines.VSM_SAMPLES!==R.blurSamples&&(d.defines.VSM_SAMPLES=R.blurSamples,p.defines.VSM_SAMPLES=R.blurSamples,d.needsUpdate=!0,p.needsUpdate=!0),R.mapPass===null&&(R.mapPass=new An(s.x,s.y,{format:as,type:Wn})),d.uniforms.shadow_pass.value=R.map.depthTexture,d.uniforms.resolution.value=R.mapSize,d.uniforms.radius.value=R.radius,i.setRenderTarget(R.mapPass),i.clear(),i.renderBufferDirect(P,null,I,d,x,null),p.uniforms.shadow_pass.value=R.mapPass.texture,p.uniforms.resolution.value=R.mapSize,p.uniforms.radius.value=R.radius,i.setRenderTarget(R.map),i.clear(),i.renderBufferDirect(P,null,I,p,x,null)}function v(R,P,I,y){let C=null;const U=I.isPointLight===!0?R.customDistanceMaterial:R.customDepthMaterial;if(U!==void 0)C=U;else if(C=I.isPointLight===!0?l:a,i.localClippingEnabled&&P.clipShadows===!0&&Array.isArray(P.clippingPlanes)&&P.clippingPlanes.length!==0||P.displacementMap&&P.displacementScale!==0||P.alphaMap&&P.alphaTest>0||P.map&&P.alphaTest>0||P.alphaToCoverage===!0){const V=C.uuid,X=P.uuid;let Y=c[V];Y===void 0&&(Y={},c[V]=Y);let j=Y[X];j===void 0&&(j=C.clone(),Y[X]=j,P.addEventListener("dispose",w)),C=j}if(C.visible=P.visible,C.wireframe=P.wireframe,y===Es?C.side=P.shadowSide!==null?P.shadowSide:P.side:C.side=P.shadowSide!==null?P.shadowSide:u[P.side],C.alphaMap=P.alphaMap,C.alphaTest=P.alphaToCoverage===!0?.5:P.alphaTest,C.map=P.map,C.clipShadows=P.clipShadows,C.clippingPlanes=P.clippingPlanes,C.clipIntersection=P.clipIntersection,C.displacementMap=P.displacementMap,C.displacementScale=P.displacementScale,C.displacementBias=P.displacementBias,C.wireframeLinewidth=P.wireframeLinewidth,C.linewidth=P.linewidth,I.isPointLight===!0&&C.isMeshDistanceMaterial===!0){const V=i.properties.get(C);V.light=I}return C}function S(R,P,I,y,C){if(R.visible===!1)return;if(R.layers.test(P.layers)&&(R.isMesh||R.isLine||R.isPoints)&&(R.castShadow||R.receiveShadow&&C===Es)&&(!R.frustumCulled||n.intersectsObject(R))){R.modelViewMatrix.multiplyMatrices(I.matrixWorldInverse,R.matrixWorld);const X=t.update(R),Y=R.material;if(Array.isArray(Y)){const j=X.groups;for(let Z=0,O=j.length;Z<O;Z++){const z=j[Z],pt=Y[z.materialIndex];if(pt&&pt.visible){const at=v(R,pt,y,C);R.onBeforeShadow(i,R,P,I,X,at,z),i.renderBufferDirect(I,null,X,at,R,z),R.onAfterShadow(i,R,P,I,X,at,z)}}}else if(Y.visible){const j=v(R,Y,y,C);R.onBeforeShadow(i,R,P,I,X,j,null),i.renderBufferDirect(I,null,X,j,R,null),R.onAfterShadow(i,R,P,I,X,j,null)}}const V=R.children;for(let X=0,Y=V.length;X<Y;X++)S(V[X],P,I,y,C)}function w(R){R.target.removeEventListener("dispose",w);for(const I in c){const y=c[I],C=R.target.uuid;C in y&&(y[C].dispose(),delete y[C])}}}const Lx={[Zo]:jo,[Ko]:ta,[Jo]:ea,[rs]:Qo,[jo]:Zo,[ta]:Ko,[ea]:Jo,[Qo]:rs};function Dx(i,t){function e(){let k=!1;const wt=new ve;let gt=null;const Pt=new ve(0,0,0,0);return{setMask:function(ft){gt!==ft&&!k&&(i.colorMask(ft,ft,ft,ft),gt=ft)},setLocked:function(ft){k=ft},setClear:function(ft,ot,St,qt,de){de===!0&&(ft*=qt,ot*=qt,St*=qt),wt.set(ft,ot,St,qt),Pt.equals(wt)===!1&&(i.clearColor(ft,ot,St,qt),Pt.copy(wt))},reset:function(){k=!1,gt=null,Pt.set(-1,0,0,0)}}}function n(){let k=!1,wt=!1,gt=null,Pt=null,ft=null;return{setReversed:function(ot){if(wt!==ot){const St=t.get("EXT_clip_control");ot?St.clipControlEXT(St.LOWER_LEFT_EXT,St.ZERO_TO_ONE_EXT):St.clipControlEXT(St.LOWER_LEFT_EXT,St.NEGATIVE_ONE_TO_ONE_EXT),wt=ot;const qt=ft;ft=null,this.setClear(qt)}},getReversed:function(){return wt},setTest:function(ot){ot?b(i.DEPTH_TEST):W(i.DEPTH_TEST)},setMask:function(ot){gt!==ot&&!k&&(i.depthMask(ot),gt=ot)},setFunc:function(ot){if(wt&&(ot=Lx[ot]),Pt!==ot){switch(ot){case Zo:i.depthFunc(i.NEVER);break;case jo:i.depthFunc(i.ALWAYS);break;case Ko:i.depthFunc(i.LESS);break;case rs:i.depthFunc(i.LEQUAL);break;case Jo:i.depthFunc(i.EQUAL);break;case Qo:i.depthFunc(i.GEQUAL);break;case ta:i.depthFunc(i.GREATER);break;case ea:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}Pt=ot}},setLocked:function(ot){k=ot},setClear:function(ot){ft!==ot&&(wt&&(ot=1-ot),i.clearDepth(ot),ft=ot)},reset:function(){k=!1,gt=null,Pt=null,ft=null,wt=!1}}}function s(){let k=!1,wt=null,gt=null,Pt=null,ft=null,ot=null,St=null,qt=null,de=null;return{setTest:function(ne){k||(ne?b(i.STENCIL_TEST):W(i.STENCIL_TEST))},setMask:function(ne){wt!==ne&&!k&&(i.stencilMask(ne),wt=ne)},setFunc:function(ne,_n,Dn){(gt!==ne||Pt!==_n||ft!==Dn)&&(i.stencilFunc(ne,_n,Dn),gt=ne,Pt=_n,ft=Dn)},setOp:function(ne,_n,Dn){(ot!==ne||St!==_n||qt!==Dn)&&(i.stencilOp(ne,_n,Dn),ot=ne,St=_n,qt=Dn)},setLocked:function(ne){k=ne},setClear:function(ne){de!==ne&&(i.clearStencil(ne),de=ne)},reset:function(){k=!1,wt=null,gt=null,Pt=null,ft=null,ot=null,St=null,qt=null,de=null}}}const r=new e,o=new n,a=new s,l=new WeakMap,c=new WeakMap;let h={},u={},d=new WeakMap,p=[],g=null,x=!1,m=null,f=null,A=null,v=null,S=null,w=null,R=null,P=new jt(0,0,0),I=0,y=!1,C=null,U=null,V=null,X=null,Y=null;const j=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let Z=!1,O=0;const z=i.getParameter(i.VERSION);z.indexOf("WebGL")!==-1?(O=parseFloat(/^WebGL (\d)/.exec(z)[1]),Z=O>=1):z.indexOf("OpenGL ES")!==-1&&(O=parseFloat(/^OpenGL ES (\d)/.exec(z)[1]),Z=O>=2);let pt=null,at={};const _t=i.getParameter(i.SCISSOR_BOX),Gt=i.getParameter(i.VIEWPORT),Yt=new ve().fromArray(_t),$=new ve().fromArray(Gt);function F(k,wt,gt,Pt){const ft=new Uint8Array(4),ot=i.createTexture();i.bindTexture(k,ot),i.texParameteri(k,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(k,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let St=0;St<gt;St++)k===i.TEXTURE_3D||k===i.TEXTURE_2D_ARRAY?i.texImage3D(wt,0,i.RGBA,1,1,Pt,0,i.RGBA,i.UNSIGNED_BYTE,ft):i.texImage2D(wt+St,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,ft);return ot}const E={};E[i.TEXTURE_2D]=F(i.TEXTURE_2D,i.TEXTURE_2D,1),E[i.TEXTURE_CUBE_MAP]=F(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),E[i.TEXTURE_2D_ARRAY]=F(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),E[i.TEXTURE_3D]=F(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),b(i.DEPTH_TEST),o.setFunc(rs),ht(!1),bt(Tl),b(i.CULL_FACE),tt(Gn);function b(k){h[k]!==!0&&(i.enable(k),h[k]=!0)}function W(k){h[k]!==!1&&(i.disable(k),h[k]=!1)}function nt(k,wt){return u[k]!==wt?(i.bindFramebuffer(k,wt),u[k]=wt,k===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=wt),k===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=wt),!0):!1}function H(k,wt){let gt=p,Pt=!1;if(k){gt=d.get(wt),gt===void 0&&(gt=[],d.set(wt,gt));const ft=k.textures;if(gt.length!==ft.length||gt[0]!==i.COLOR_ATTACHMENT0){for(let ot=0,St=ft.length;ot<St;ot++)gt[ot]=i.COLOR_ATTACHMENT0+ot;gt.length=ft.length,Pt=!0}}else gt[0]!==i.BACK&&(gt[0]=i.BACK,Pt=!0);Pt&&i.drawBuffers(gt)}function lt(k){return g!==k?(i.useProgram(k),g=k,!0):!1}const vt={[Si]:i.FUNC_ADD,[Uu]:i.FUNC_SUBTRACT,[Fu]:i.FUNC_REVERSE_SUBTRACT};vt[Ou]=i.MIN,vt[Bu]=i.MAX;const ut={[ku]:i.ZERO,[zu]:i.ONE,[Vu]:i.SRC_COLOR,[qo]:i.SRC_ALPHA,[qu]:i.SRC_ALPHA_SATURATE,[Xu]:i.DST_COLOR,[Hu]:i.DST_ALPHA,[Gu]:i.ONE_MINUS_SRC_COLOR,[$o]:i.ONE_MINUS_SRC_ALPHA,[Yu]:i.ONE_MINUS_DST_COLOR,[Wu]:i.ONE_MINUS_DST_ALPHA,[$u]:i.CONSTANT_COLOR,[Zu]:i.ONE_MINUS_CONSTANT_COLOR,[ju]:i.CONSTANT_ALPHA,[Ku]:i.ONE_MINUS_CONSTANT_ALPHA};function tt(k,wt,gt,Pt,ft,ot,St,qt,de,ne){if(k===Gn){x===!0&&(W(i.BLEND),x=!1);return}if(x===!1&&(b(i.BLEND),x=!0),k!==Nu){if(k!==m||ne!==y){if((f!==Si||S!==Si)&&(i.blendEquation(i.FUNC_ADD),f=Si,S=Si),ne)switch(k){case ns:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Cl:i.blendFunc(i.ONE,i.ONE);break;case wl:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Pl:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:ee("WebGLState: Invalid blending: ",k);break}else switch(k){case ns:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Cl:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case wl:ee("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Pl:ee("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:ee("WebGLState: Invalid blending: ",k);break}A=null,v=null,w=null,R=null,P.set(0,0,0),I=0,m=k,y=ne}return}ft=ft||wt,ot=ot||gt,St=St||Pt,(wt!==f||ft!==S)&&(i.blendEquationSeparate(vt[wt],vt[ft]),f=wt,S=ft),(gt!==A||Pt!==v||ot!==w||St!==R)&&(i.blendFuncSeparate(ut[gt],ut[Pt],ut[ot],ut[St]),A=gt,v=Pt,w=ot,R=St),(qt.equals(P)===!1||de!==I)&&(i.blendColor(qt.r,qt.g,qt.b,de),P.copy(qt),I=de),m=k,y=!1}function st(k,wt){k.side===Sn?W(i.CULL_FACE):b(i.CULL_FACE);let gt=k.side===Ke;wt&&(gt=!gt),ht(gt),k.blending===ns&&k.transparent===!1?tt(Gn):tt(k.blending,k.blendEquation,k.blendSrc,k.blendDst,k.blendEquationAlpha,k.blendSrcAlpha,k.blendDstAlpha,k.blendColor,k.blendAlpha,k.premultipliedAlpha),o.setFunc(k.depthFunc),o.setTest(k.depthTest),o.setMask(k.depthWrite),r.setMask(k.colorWrite);const Pt=k.stencilWrite;a.setTest(Pt),Pt&&(a.setMask(k.stencilWriteMask),a.setFunc(k.stencilFunc,k.stencilRef,k.stencilFuncMask),a.setOp(k.stencilFail,k.stencilZFail,k.stencilZPass)),D(k.polygonOffset,k.polygonOffsetFactor,k.polygonOffsetUnits),k.alphaToCoverage===!0?b(i.SAMPLE_ALPHA_TO_COVERAGE):W(i.SAMPLE_ALPHA_TO_COVERAGE)}function ht(k){C!==k&&(k?i.frontFace(i.CW):i.frontFace(i.CCW),C=k)}function bt(k){k!==Du?(b(i.CULL_FACE),k!==U&&(k===Tl?i.cullFace(i.BACK):k===Iu?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):W(i.CULL_FACE),U=k}function M(k){k!==V&&(Z&&i.lineWidth(k),V=k)}function D(k,wt,gt){k?(b(i.POLYGON_OFFSET_FILL),(X!==wt||Y!==gt)&&(i.polygonOffset(wt,gt),X=wt,Y=gt)):W(i.POLYGON_OFFSET_FILL)}function mt(k){k?b(i.SCISSOR_TEST):W(i.SCISSOR_TEST)}function Ut(k){k===void 0&&(k=i.TEXTURE0+j-1),pt!==k&&(i.activeTexture(k),pt=k)}function Ct(k,wt,gt){gt===void 0&&(pt===null?gt=i.TEXTURE0+j-1:gt=pt);let Pt=at[gt];Pt===void 0&&(Pt={type:void 0,texture:void 0},at[gt]=Pt),(Pt.type!==k||Pt.texture!==wt)&&(pt!==gt&&(i.activeTexture(gt),pt=gt),i.bindTexture(k,wt||E[k]),Pt.type=k,Pt.texture=wt)}function L(){const k=at[pt];k!==void 0&&k.type!==void 0&&(i.bindTexture(k.type,null),k.type=void 0,k.texture=void 0)}function _(){try{i.compressedTexImage2D(...arguments)}catch(k){ee("WebGLState:",k)}}function B(){try{i.compressedTexImage3D(...arguments)}catch(k){ee("WebGLState:",k)}}function et(){try{i.texSubImage2D(...arguments)}catch(k){ee("WebGLState:",k)}}function rt(){try{i.texSubImage3D(...arguments)}catch(k){ee("WebGLState:",k)}}function Q(){try{i.compressedTexSubImage2D(...arguments)}catch(k){ee("WebGLState:",k)}}function It(){try{i.compressedTexSubImage3D(...arguments)}catch(k){ee("WebGLState:",k)}}function xt(){try{i.texStorage2D(...arguments)}catch(k){ee("WebGLState:",k)}}function Lt(){try{i.texStorage3D(...arguments)}catch(k){ee("WebGLState:",k)}}function zt(){try{i.texImage2D(...arguments)}catch(k){ee("WebGLState:",k)}}function dt(){try{i.texImage3D(...arguments)}catch(k){ee("WebGLState:",k)}}function yt(k){Yt.equals(k)===!1&&(i.scissor(k.x,k.y,k.z,k.w),Yt.copy(k))}function Nt(k){$.equals(k)===!1&&(i.viewport(k.x,k.y,k.z,k.w),$.copy(k))}function Ft(k,wt){let gt=c.get(wt);gt===void 0&&(gt=new WeakMap,c.set(wt,gt));let Pt=gt.get(k);Pt===void 0&&(Pt=i.getUniformBlockIndex(wt,k.name),gt.set(k,Pt))}function Mt(k,wt){const Pt=c.get(wt).get(k);l.get(wt)!==Pt&&(i.uniformBlockBinding(wt,Pt,k.__bindingPointIndex),l.set(wt,Pt))}function Kt(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),h={},pt=null,at={},u={},d=new WeakMap,p=[],g=null,x=!1,m=null,f=null,A=null,v=null,S=null,w=null,R=null,P=new jt(0,0,0),I=0,y=!1,C=null,U=null,V=null,X=null,Y=null,Yt.set(0,0,i.canvas.width,i.canvas.height),$.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:b,disable:W,bindFramebuffer:nt,drawBuffers:H,useProgram:lt,setBlending:tt,setMaterial:st,setFlipSided:ht,setCullFace:bt,setLineWidth:M,setPolygonOffset:D,setScissorTest:mt,activeTexture:Ut,bindTexture:Ct,unbindTexture:L,compressedTexImage2D:_,compressedTexImage3D:B,texImage2D:zt,texImage3D:dt,updateUBOMapping:Ft,uniformBlockBinding:Mt,texStorage2D:xt,texStorage3D:Lt,texSubImage2D:et,texSubImage3D:rt,compressedTexSubImage2D:Q,compressedTexSubImage3D:It,scissor:yt,viewport:Nt,reset:Kt}}function Ix(i,t,e,n,s,r,o){const a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ct,h=new WeakMap;let u;const d=new WeakMap;let p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(L,_){return p?new OffscreenCanvas(L,_):kr("canvas")}function x(L,_,B){let et=1;const rt=Ct(L);if((rt.width>B||rt.height>B)&&(et=B/Math.max(rt.width,rt.height)),et<1)if(typeof HTMLImageElement<"u"&&L instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&L instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&L instanceof ImageBitmap||typeof VideoFrame<"u"&&L instanceof VideoFrame){const Q=Math.floor(et*rt.width),It=Math.floor(et*rt.height);u===void 0&&(u=g(Q,It));const xt=_?g(Q,It):u;return xt.width=Q,xt.height=It,xt.getContext("2d").drawImage(L,0,0,Q,It),Vt("WebGLRenderer: Texture has been resized from ("+rt.width+"x"+rt.height+") to ("+Q+"x"+It+")."),xt}else return"data"in L&&Vt("WebGLRenderer: Image in DataTexture is too big ("+rt.width+"x"+rt.height+")."),L;return L}function m(L){return L.generateMipmaps}function f(L){i.generateMipmap(L)}function A(L){return L.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:L.isWebGL3DRenderTarget?i.TEXTURE_3D:L.isWebGLArrayRenderTarget||L.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function v(L,_,B,et,rt=!1){if(L!==null){if(i[L]!==void 0)return i[L];Vt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+L+"'")}let Q=_;if(_===i.RED&&(B===i.FLOAT&&(Q=i.R32F),B===i.HALF_FLOAT&&(Q=i.R16F),B===i.UNSIGNED_BYTE&&(Q=i.R8)),_===i.RED_INTEGER&&(B===i.UNSIGNED_BYTE&&(Q=i.R8UI),B===i.UNSIGNED_SHORT&&(Q=i.R16UI),B===i.UNSIGNED_INT&&(Q=i.R32UI),B===i.BYTE&&(Q=i.R8I),B===i.SHORT&&(Q=i.R16I),B===i.INT&&(Q=i.R32I)),_===i.RG&&(B===i.FLOAT&&(Q=i.RG32F),B===i.HALF_FLOAT&&(Q=i.RG16F),B===i.UNSIGNED_BYTE&&(Q=i.RG8)),_===i.RG_INTEGER&&(B===i.UNSIGNED_BYTE&&(Q=i.RG8UI),B===i.UNSIGNED_SHORT&&(Q=i.RG16UI),B===i.UNSIGNED_INT&&(Q=i.RG32UI),B===i.BYTE&&(Q=i.RG8I),B===i.SHORT&&(Q=i.RG16I),B===i.INT&&(Q=i.RG32I)),_===i.RGB_INTEGER&&(B===i.UNSIGNED_BYTE&&(Q=i.RGB8UI),B===i.UNSIGNED_SHORT&&(Q=i.RGB16UI),B===i.UNSIGNED_INT&&(Q=i.RGB32UI),B===i.BYTE&&(Q=i.RGB8I),B===i.SHORT&&(Q=i.RGB16I),B===i.INT&&(Q=i.RGB32I)),_===i.RGBA_INTEGER&&(B===i.UNSIGNED_BYTE&&(Q=i.RGBA8UI),B===i.UNSIGNED_SHORT&&(Q=i.RGBA16UI),B===i.UNSIGNED_INT&&(Q=i.RGBA32UI),B===i.BYTE&&(Q=i.RGBA8I),B===i.SHORT&&(Q=i.RGBA16I),B===i.INT&&(Q=i.RGBA32I)),_===i.RGB&&(B===i.UNSIGNED_INT_5_9_9_9_REV&&(Q=i.RGB9_E5),B===i.UNSIGNED_INT_10F_11F_11F_REV&&(Q=i.R11F_G11F_B10F)),_===i.RGBA){const It=rt?Or:Qt.getTransfer(et);B===i.FLOAT&&(Q=i.RGBA32F),B===i.HALF_FLOAT&&(Q=i.RGBA16F),B===i.UNSIGNED_BYTE&&(Q=It===se?i.SRGB8_ALPHA8:i.RGBA8),B===i.UNSIGNED_SHORT_4_4_4_4&&(Q=i.RGBA4),B===i.UNSIGNED_SHORT_5_5_5_1&&(Q=i.RGB5_A1)}return(Q===i.R16F||Q===i.R32F||Q===i.RG16F||Q===i.RG32F||Q===i.RGBA16F||Q===i.RGBA32F)&&t.get("EXT_color_buffer_float"),Q}function S(L,_){let B;return L?_===null||_===Cn||_===Fs?B=i.DEPTH24_STENCIL8:_===Mn?B=i.DEPTH32F_STENCIL8:_===Us&&(B=i.DEPTH24_STENCIL8,Vt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):_===null||_===Cn||_===Fs?B=i.DEPTH_COMPONENT24:_===Mn?B=i.DEPTH_COMPONENT32F:_===Us&&(B=i.DEPTH_COMPONENT16),B}function w(L,_){return m(L)===!0||L.isFramebufferTexture&&L.minFilter!==De&&L.minFilter!==Fe?Math.log2(Math.max(_.width,_.height))+1:L.mipmaps!==void 0&&L.mipmaps.length>0?L.mipmaps.length:L.isCompressedTexture&&Array.isArray(L.image)?_.mipmaps.length:1}function R(L){const _=L.target;_.removeEventListener("dispose",R),I(_),_.isVideoTexture&&h.delete(_)}function P(L){const _=L.target;_.removeEventListener("dispose",P),C(_)}function I(L){const _=n.get(L);if(_.__webglInit===void 0)return;const B=L.source,et=d.get(B);if(et){const rt=et[_.__cacheKey];rt.usedTimes--,rt.usedTimes===0&&y(L),Object.keys(et).length===0&&d.delete(B)}n.remove(L)}function y(L){const _=n.get(L);i.deleteTexture(_.__webglTexture);const B=L.source,et=d.get(B);delete et[_.__cacheKey],o.memory.textures--}function C(L){const _=n.get(L);if(L.depthTexture&&(L.depthTexture.dispose(),n.remove(L.depthTexture)),L.isWebGLCubeRenderTarget)for(let et=0;et<6;et++){if(Array.isArray(_.__webglFramebuffer[et]))for(let rt=0;rt<_.__webglFramebuffer[et].length;rt++)i.deleteFramebuffer(_.__webglFramebuffer[et][rt]);else i.deleteFramebuffer(_.__webglFramebuffer[et]);_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer[et])}else{if(Array.isArray(_.__webglFramebuffer))for(let et=0;et<_.__webglFramebuffer.length;et++)i.deleteFramebuffer(_.__webglFramebuffer[et]);else i.deleteFramebuffer(_.__webglFramebuffer);if(_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer),_.__webglMultisampledFramebuffer&&i.deleteFramebuffer(_.__webglMultisampledFramebuffer),_.__webglColorRenderbuffer)for(let et=0;et<_.__webglColorRenderbuffer.length;et++)_.__webglColorRenderbuffer[et]&&i.deleteRenderbuffer(_.__webglColorRenderbuffer[et]);_.__webglDepthRenderbuffer&&i.deleteRenderbuffer(_.__webglDepthRenderbuffer)}const B=L.textures;for(let et=0,rt=B.length;et<rt;et++){const Q=n.get(B[et]);Q.__webglTexture&&(i.deleteTexture(Q.__webglTexture),o.memory.textures--),n.remove(B[et])}n.remove(L)}let U=0;function V(){U=0}function X(){const L=U;return L>=s.maxTextures&&Vt("WebGLTextures: Trying to use "+L+" texture units while this GPU supports only "+s.maxTextures),U+=1,L}function Y(L){const _=[];return _.push(L.wrapS),_.push(L.wrapT),_.push(L.wrapR||0),_.push(L.magFilter),_.push(L.minFilter),_.push(L.anisotropy),_.push(L.internalFormat),_.push(L.format),_.push(L.type),_.push(L.generateMipmaps),_.push(L.premultiplyAlpha),_.push(L.flipY),_.push(L.unpackAlignment),_.push(L.colorSpace),_.join()}function j(L,_){const B=n.get(L);if(L.isVideoTexture&&mt(L),L.isRenderTargetTexture===!1&&L.isExternalTexture!==!0&&L.version>0&&B.__version!==L.version){const et=L.image;if(et===null)Vt("WebGLRenderer: Texture marked for update but no image data found.");else if(et.complete===!1)Vt("WebGLRenderer: Texture marked for update but image is incomplete");else{E(B,L,_);return}}else L.isExternalTexture&&(B.__webglTexture=L.sourceTexture?L.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,B.__webglTexture,i.TEXTURE0+_)}function Z(L,_){const B=n.get(L);if(L.isRenderTargetTexture===!1&&L.version>0&&B.__version!==L.version){E(B,L,_);return}else L.isExternalTexture&&(B.__webglTexture=L.sourceTexture?L.sourceTexture:null);e.bindTexture(i.TEXTURE_2D_ARRAY,B.__webglTexture,i.TEXTURE0+_)}function O(L,_){const B=n.get(L);if(L.isRenderTargetTexture===!1&&L.version>0&&B.__version!==L.version){E(B,L,_);return}e.bindTexture(i.TEXTURE_3D,B.__webglTexture,i.TEXTURE0+_)}function z(L,_){const B=n.get(L);if(L.isCubeDepthTexture!==!0&&L.version>0&&B.__version!==L.version){b(B,L,_);return}e.bindTexture(i.TEXTURE_CUBE_MAP,B.__webglTexture,i.TEXTURE0+_)}const pt={[sa]:i.REPEAT,[kn]:i.CLAMP_TO_EDGE,[ra]:i.MIRRORED_REPEAT},at={[De]:i.NEAREST,[td]:i.NEAREST_MIPMAP_NEAREST,[Qs]:i.NEAREST_MIPMAP_LINEAR,[Fe]:i.LINEAR,[ao]:i.LINEAR_MIPMAP_NEAREST,[Ti]:i.LINEAR_MIPMAP_LINEAR},_t={[id]:i.NEVER,[ld]:i.ALWAYS,[sd]:i.LESS,[Ka]:i.LEQUAL,[rd]:i.EQUAL,[Ja]:i.GEQUAL,[od]:i.GREATER,[ad]:i.NOTEQUAL};function Gt(L,_){if(_.type===Mn&&t.has("OES_texture_float_linear")===!1&&(_.magFilter===Fe||_.magFilter===ao||_.magFilter===Qs||_.magFilter===Ti||_.minFilter===Fe||_.minFilter===ao||_.minFilter===Qs||_.minFilter===Ti)&&Vt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(L,i.TEXTURE_WRAP_S,pt[_.wrapS]),i.texParameteri(L,i.TEXTURE_WRAP_T,pt[_.wrapT]),(L===i.TEXTURE_3D||L===i.TEXTURE_2D_ARRAY)&&i.texParameteri(L,i.TEXTURE_WRAP_R,pt[_.wrapR]),i.texParameteri(L,i.TEXTURE_MAG_FILTER,at[_.magFilter]),i.texParameteri(L,i.TEXTURE_MIN_FILTER,at[_.minFilter]),_.compareFunction&&(i.texParameteri(L,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(L,i.TEXTURE_COMPARE_FUNC,_t[_.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(_.magFilter===De||_.minFilter!==Qs&&_.minFilter!==Ti||_.type===Mn&&t.has("OES_texture_float_linear")===!1)return;if(_.anisotropy>1||n.get(_).__currentAnisotropy){const B=t.get("EXT_texture_filter_anisotropic");i.texParameterf(L,B.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(_.anisotropy,s.getMaxAnisotropy())),n.get(_).__currentAnisotropy=_.anisotropy}}}function Yt(L,_){let B=!1;L.__webglInit===void 0&&(L.__webglInit=!0,_.addEventListener("dispose",R));const et=_.source;let rt=d.get(et);rt===void 0&&(rt={},d.set(et,rt));const Q=Y(_);if(Q!==L.__cacheKey){rt[Q]===void 0&&(rt[Q]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,B=!0),rt[Q].usedTimes++;const It=rt[L.__cacheKey];It!==void 0&&(rt[L.__cacheKey].usedTimes--,It.usedTimes===0&&y(_)),L.__cacheKey=Q,L.__webglTexture=rt[Q].texture}return B}function $(L,_,B){return Math.floor(Math.floor(L/B)/_)}function F(L,_,B,et){const Q=L.updateRanges;if(Q.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,_.width,_.height,B,et,_.data);else{Q.sort((dt,yt)=>dt.start-yt.start);let It=0;for(let dt=1;dt<Q.length;dt++){const yt=Q[It],Nt=Q[dt],Ft=yt.start+yt.count,Mt=$(Nt.start,_.width,4),Kt=$(yt.start,_.width,4);Nt.start<=Ft+1&&Mt===Kt&&$(Nt.start+Nt.count-1,_.width,4)===Mt?yt.count=Math.max(yt.count,Nt.start+Nt.count-yt.start):(++It,Q[It]=Nt)}Q.length=It+1;const xt=i.getParameter(i.UNPACK_ROW_LENGTH),Lt=i.getParameter(i.UNPACK_SKIP_PIXELS),zt=i.getParameter(i.UNPACK_SKIP_ROWS);i.pixelStorei(i.UNPACK_ROW_LENGTH,_.width);for(let dt=0,yt=Q.length;dt<yt;dt++){const Nt=Q[dt],Ft=Math.floor(Nt.start/4),Mt=Math.ceil(Nt.count/4),Kt=Ft%_.width,k=Math.floor(Ft/_.width),wt=Mt,gt=1;i.pixelStorei(i.UNPACK_SKIP_PIXELS,Kt),i.pixelStorei(i.UNPACK_SKIP_ROWS,k),e.texSubImage2D(i.TEXTURE_2D,0,Kt,k,wt,gt,B,et,_.data)}L.clearUpdateRanges(),i.pixelStorei(i.UNPACK_ROW_LENGTH,xt),i.pixelStorei(i.UNPACK_SKIP_PIXELS,Lt),i.pixelStorei(i.UNPACK_SKIP_ROWS,zt)}}function E(L,_,B){let et=i.TEXTURE_2D;(_.isDataArrayTexture||_.isCompressedArrayTexture)&&(et=i.TEXTURE_2D_ARRAY),_.isData3DTexture&&(et=i.TEXTURE_3D);const rt=Yt(L,_),Q=_.source;e.bindTexture(et,L.__webglTexture,i.TEXTURE0+B);const It=n.get(Q);if(Q.version!==It.__version||rt===!0){e.activeTexture(i.TEXTURE0+B);const xt=Qt.getPrimaries(Qt.workingColorSpace),Lt=_.colorSpace===ni?null:Qt.getPrimaries(_.colorSpace),zt=_.colorSpace===ni||xt===Lt?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,zt);let dt=x(_.image,!1,s.maxTextureSize);dt=Ut(_,dt);const yt=r.convert(_.format,_.colorSpace),Nt=r.convert(_.type);let Ft=v(_.internalFormat,yt,Nt,_.colorSpace,_.isVideoTexture);Gt(et,_);let Mt;const Kt=_.mipmaps,k=_.isVideoTexture!==!0,wt=It.__version===void 0||rt===!0,gt=Q.dataReady,Pt=w(_,dt);if(_.isDepthTexture)Ft=S(_.format===Ci,_.type),wt&&(k?e.texStorage2D(i.TEXTURE_2D,1,Ft,dt.width,dt.height):e.texImage2D(i.TEXTURE_2D,0,Ft,dt.width,dt.height,0,yt,Nt,null));else if(_.isDataTexture)if(Kt.length>0){k&&wt&&e.texStorage2D(i.TEXTURE_2D,Pt,Ft,Kt[0].width,Kt[0].height);for(let ft=0,ot=Kt.length;ft<ot;ft++)Mt=Kt[ft],k?gt&&e.texSubImage2D(i.TEXTURE_2D,ft,0,0,Mt.width,Mt.height,yt,Nt,Mt.data):e.texImage2D(i.TEXTURE_2D,ft,Ft,Mt.width,Mt.height,0,yt,Nt,Mt.data);_.generateMipmaps=!1}else k?(wt&&e.texStorage2D(i.TEXTURE_2D,Pt,Ft,dt.width,dt.height),gt&&F(_,dt,yt,Nt)):e.texImage2D(i.TEXTURE_2D,0,Ft,dt.width,dt.height,0,yt,Nt,dt.data);else if(_.isCompressedTexture)if(_.isCompressedArrayTexture){k&&wt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Pt,Ft,Kt[0].width,Kt[0].height,dt.depth);for(let ft=0,ot=Kt.length;ft<ot;ft++)if(Mt=Kt[ft],_.format!==mn)if(yt!==null)if(k){if(gt)if(_.layerUpdates.size>0){const St=fc(Mt.width,Mt.height,_.format,_.type);for(const qt of _.layerUpdates){const de=Mt.data.subarray(qt*St/Mt.data.BYTES_PER_ELEMENT,(qt+1)*St/Mt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ft,0,0,qt,Mt.width,Mt.height,1,yt,de)}_.clearLayerUpdates()}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ft,0,0,0,Mt.width,Mt.height,dt.depth,yt,Mt.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,ft,Ft,Mt.width,Mt.height,dt.depth,0,Mt.data,0,0);else Vt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else k?gt&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,ft,0,0,0,Mt.width,Mt.height,dt.depth,yt,Nt,Mt.data):e.texImage3D(i.TEXTURE_2D_ARRAY,ft,Ft,Mt.width,Mt.height,dt.depth,0,yt,Nt,Mt.data)}else{k&&wt&&e.texStorage2D(i.TEXTURE_2D,Pt,Ft,Kt[0].width,Kt[0].height);for(let ft=0,ot=Kt.length;ft<ot;ft++)Mt=Kt[ft],_.format!==mn?yt!==null?k?gt&&e.compressedTexSubImage2D(i.TEXTURE_2D,ft,0,0,Mt.width,Mt.height,yt,Mt.data):e.compressedTexImage2D(i.TEXTURE_2D,ft,Ft,Mt.width,Mt.height,0,Mt.data):Vt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):k?gt&&e.texSubImage2D(i.TEXTURE_2D,ft,0,0,Mt.width,Mt.height,yt,Nt,Mt.data):e.texImage2D(i.TEXTURE_2D,ft,Ft,Mt.width,Mt.height,0,yt,Nt,Mt.data)}else if(_.isDataArrayTexture)if(k){if(wt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Pt,Ft,dt.width,dt.height,dt.depth),gt)if(_.layerUpdates.size>0){const ft=fc(dt.width,dt.height,_.format,_.type);for(const ot of _.layerUpdates){const St=dt.data.subarray(ot*ft/dt.data.BYTES_PER_ELEMENT,(ot+1)*ft/dt.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,ot,dt.width,dt.height,1,yt,Nt,St)}_.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,dt.width,dt.height,dt.depth,yt,Nt,dt.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,Ft,dt.width,dt.height,dt.depth,0,yt,Nt,dt.data);else if(_.isData3DTexture)k?(wt&&e.texStorage3D(i.TEXTURE_3D,Pt,Ft,dt.width,dt.height,dt.depth),gt&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,dt.width,dt.height,dt.depth,yt,Nt,dt.data)):e.texImage3D(i.TEXTURE_3D,0,Ft,dt.width,dt.height,dt.depth,0,yt,Nt,dt.data);else if(_.isFramebufferTexture){if(wt)if(k)e.texStorage2D(i.TEXTURE_2D,Pt,Ft,dt.width,dt.height);else{let ft=dt.width,ot=dt.height;for(let St=0;St<Pt;St++)e.texImage2D(i.TEXTURE_2D,St,Ft,ft,ot,0,yt,Nt,null),ft>>=1,ot>>=1}}else if(Kt.length>0){if(k&&wt){const ft=Ct(Kt[0]);e.texStorage2D(i.TEXTURE_2D,Pt,Ft,ft.width,ft.height)}for(let ft=0,ot=Kt.length;ft<ot;ft++)Mt=Kt[ft],k?gt&&e.texSubImage2D(i.TEXTURE_2D,ft,0,0,yt,Nt,Mt):e.texImage2D(i.TEXTURE_2D,ft,Ft,yt,Nt,Mt);_.generateMipmaps=!1}else if(k){if(wt){const ft=Ct(dt);e.texStorage2D(i.TEXTURE_2D,Pt,Ft,ft.width,ft.height)}gt&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,yt,Nt,dt)}else e.texImage2D(i.TEXTURE_2D,0,Ft,yt,Nt,dt);m(_)&&f(et),It.__version=Q.version,_.onUpdate&&_.onUpdate(_)}L.__version=_.version}function b(L,_,B){if(_.image.length!==6)return;const et=Yt(L,_),rt=_.source;e.bindTexture(i.TEXTURE_CUBE_MAP,L.__webglTexture,i.TEXTURE0+B);const Q=n.get(rt);if(rt.version!==Q.__version||et===!0){e.activeTexture(i.TEXTURE0+B);const It=Qt.getPrimaries(Qt.workingColorSpace),xt=_.colorSpace===ni?null:Qt.getPrimaries(_.colorSpace),Lt=_.colorSpace===ni||It===xt?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Lt);const zt=_.isCompressedTexture||_.image[0].isCompressedTexture,dt=_.image[0]&&_.image[0].isDataTexture,yt=[];for(let ot=0;ot<6;ot++)!zt&&!dt?yt[ot]=x(_.image[ot],!0,s.maxCubemapSize):yt[ot]=dt?_.image[ot].image:_.image[ot],yt[ot]=Ut(_,yt[ot]);const Nt=yt[0],Ft=r.convert(_.format,_.colorSpace),Mt=r.convert(_.type),Kt=v(_.internalFormat,Ft,Mt,_.colorSpace),k=_.isVideoTexture!==!0,wt=Q.__version===void 0||et===!0,gt=rt.dataReady;let Pt=w(_,Nt);Gt(i.TEXTURE_CUBE_MAP,_);let ft;if(zt){k&&wt&&e.texStorage2D(i.TEXTURE_CUBE_MAP,Pt,Kt,Nt.width,Nt.height);for(let ot=0;ot<6;ot++){ft=yt[ot].mipmaps;for(let St=0;St<ft.length;St++){const qt=ft[St];_.format!==mn?Ft!==null?k?gt&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ot,St,0,0,qt.width,qt.height,Ft,qt.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ot,St,Kt,qt.width,qt.height,0,qt.data):Vt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):k?gt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ot,St,0,0,qt.width,qt.height,Ft,Mt,qt.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ot,St,Kt,qt.width,qt.height,0,Ft,Mt,qt.data)}}}else{if(ft=_.mipmaps,k&&wt){ft.length>0&&Pt++;const ot=Ct(yt[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,Pt,Kt,ot.width,ot.height)}for(let ot=0;ot<6;ot++)if(dt){k?gt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ot,0,0,0,yt[ot].width,yt[ot].height,Ft,Mt,yt[ot].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ot,0,Kt,yt[ot].width,yt[ot].height,0,Ft,Mt,yt[ot].data);for(let St=0;St<ft.length;St++){const de=ft[St].image[ot].image;k?gt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ot,St+1,0,0,de.width,de.height,Ft,Mt,de.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ot,St+1,Kt,de.width,de.height,0,Ft,Mt,de.data)}}else{k?gt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ot,0,0,0,Ft,Mt,yt[ot]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ot,0,Kt,Ft,Mt,yt[ot]);for(let St=0;St<ft.length;St++){const qt=ft[St];k?gt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ot,St+1,0,0,Ft,Mt,qt.image[ot]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ot,St+1,Kt,Ft,Mt,qt.image[ot])}}}m(_)&&f(i.TEXTURE_CUBE_MAP),Q.__version=rt.version,_.onUpdate&&_.onUpdate(_)}L.__version=_.version}function W(L,_,B,et,rt,Q){const It=r.convert(B.format,B.colorSpace),xt=r.convert(B.type),Lt=v(B.internalFormat,It,xt,B.colorSpace),zt=n.get(_),dt=n.get(B);if(dt.__renderTarget=_,!zt.__hasExternalTextures){const yt=Math.max(1,_.width>>Q),Nt=Math.max(1,_.height>>Q);rt===i.TEXTURE_3D||rt===i.TEXTURE_2D_ARRAY?e.texImage3D(rt,Q,Lt,yt,Nt,_.depth,0,It,xt,null):e.texImage2D(rt,Q,Lt,yt,Nt,0,It,xt,null)}e.bindFramebuffer(i.FRAMEBUFFER,L),D(_)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,et,rt,dt.__webglTexture,0,M(_)):(rt===i.TEXTURE_2D||rt>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&rt<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,et,rt,dt.__webglTexture,Q),e.bindFramebuffer(i.FRAMEBUFFER,null)}function nt(L,_,B){if(i.bindRenderbuffer(i.RENDERBUFFER,L),_.depthBuffer){const et=_.depthTexture,rt=et&&et.isDepthTexture?et.type:null,Q=S(_.stencilBuffer,rt),It=_.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;D(_)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,M(_),Q,_.width,_.height):B?i.renderbufferStorageMultisample(i.RENDERBUFFER,M(_),Q,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,Q,_.width,_.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,It,i.RENDERBUFFER,L)}else{const et=_.textures;for(let rt=0;rt<et.length;rt++){const Q=et[rt],It=r.convert(Q.format,Q.colorSpace),xt=r.convert(Q.type),Lt=v(Q.internalFormat,It,xt,Q.colorSpace);D(_)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,M(_),Lt,_.width,_.height):B?i.renderbufferStorageMultisample(i.RENDERBUFFER,M(_),Lt,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,Lt,_.width,_.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function H(L,_,B){const et=_.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(i.FRAMEBUFFER,L),!(_.depthTexture&&_.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const rt=n.get(_.depthTexture);if(rt.__renderTarget=_,(!rt.__webglTexture||_.depthTexture.image.width!==_.width||_.depthTexture.image.height!==_.height)&&(_.depthTexture.image.width=_.width,_.depthTexture.image.height=_.height,_.depthTexture.needsUpdate=!0),et){if(rt.__webglInit===void 0&&(rt.__webglInit=!0,_.depthTexture.addEventListener("dispose",R)),rt.__webglTexture===void 0){rt.__webglTexture=i.createTexture(),e.bindTexture(i.TEXTURE_CUBE_MAP,rt.__webglTexture),Gt(i.TEXTURE_CUBE_MAP,_.depthTexture);const zt=r.convert(_.depthTexture.format),dt=r.convert(_.depthTexture.type);let yt;_.depthTexture.format===Xn?yt=i.DEPTH_COMPONENT24:_.depthTexture.format===Ci&&(yt=i.DEPTH24_STENCIL8);for(let Nt=0;Nt<6;Nt++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Nt,0,yt,_.width,_.height,0,zt,dt,null)}}else j(_.depthTexture,0);const Q=rt.__webglTexture,It=M(_),xt=et?i.TEXTURE_CUBE_MAP_POSITIVE_X+B:i.TEXTURE_2D,Lt=_.depthTexture.format===Ci?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(_.depthTexture.format===Xn)D(_)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Lt,xt,Q,0,It):i.framebufferTexture2D(i.FRAMEBUFFER,Lt,xt,Q,0);else if(_.depthTexture.format===Ci)D(_)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Lt,xt,Q,0,It):i.framebufferTexture2D(i.FRAMEBUFFER,Lt,xt,Q,0);else throw new Error("Unknown depthTexture format")}function lt(L){const _=n.get(L),B=L.isWebGLCubeRenderTarget===!0;if(_.__boundDepthTexture!==L.depthTexture){const et=L.depthTexture;if(_.__depthDisposeCallback&&_.__depthDisposeCallback(),et){const rt=()=>{delete _.__boundDepthTexture,delete _.__depthDisposeCallback,et.removeEventListener("dispose",rt)};et.addEventListener("dispose",rt),_.__depthDisposeCallback=rt}_.__boundDepthTexture=et}if(L.depthTexture&&!_.__autoAllocateDepthBuffer)if(B)for(let et=0;et<6;et++)H(_.__webglFramebuffer[et],L,et);else{const et=L.texture.mipmaps;et&&et.length>0?H(_.__webglFramebuffer[0],L,0):H(_.__webglFramebuffer,L,0)}else if(B){_.__webglDepthbuffer=[];for(let et=0;et<6;et++)if(e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[et]),_.__webglDepthbuffer[et]===void 0)_.__webglDepthbuffer[et]=i.createRenderbuffer(),nt(_.__webglDepthbuffer[et],L,!1);else{const rt=L.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Q=_.__webglDepthbuffer[et];i.bindRenderbuffer(i.RENDERBUFFER,Q),i.framebufferRenderbuffer(i.FRAMEBUFFER,rt,i.RENDERBUFFER,Q)}}else{const et=L.texture.mipmaps;if(et&&et.length>0?e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer),_.__webglDepthbuffer===void 0)_.__webglDepthbuffer=i.createRenderbuffer(),nt(_.__webglDepthbuffer,L,!1);else{const rt=L.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Q=_.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,Q),i.framebufferRenderbuffer(i.FRAMEBUFFER,rt,i.RENDERBUFFER,Q)}}e.bindFramebuffer(i.FRAMEBUFFER,null)}function vt(L,_,B){const et=n.get(L);_!==void 0&&W(et.__webglFramebuffer,L,L.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),B!==void 0&&lt(L)}function ut(L){const _=L.texture,B=n.get(L),et=n.get(_);L.addEventListener("dispose",P);const rt=L.textures,Q=L.isWebGLCubeRenderTarget===!0,It=rt.length>1;if(It||(et.__webglTexture===void 0&&(et.__webglTexture=i.createTexture()),et.__version=_.version,o.memory.textures++),Q){B.__webglFramebuffer=[];for(let xt=0;xt<6;xt++)if(_.mipmaps&&_.mipmaps.length>0){B.__webglFramebuffer[xt]=[];for(let Lt=0;Lt<_.mipmaps.length;Lt++)B.__webglFramebuffer[xt][Lt]=i.createFramebuffer()}else B.__webglFramebuffer[xt]=i.createFramebuffer()}else{if(_.mipmaps&&_.mipmaps.length>0){B.__webglFramebuffer=[];for(let xt=0;xt<_.mipmaps.length;xt++)B.__webglFramebuffer[xt]=i.createFramebuffer()}else B.__webglFramebuffer=i.createFramebuffer();if(It)for(let xt=0,Lt=rt.length;xt<Lt;xt++){const zt=n.get(rt[xt]);zt.__webglTexture===void 0&&(zt.__webglTexture=i.createTexture(),o.memory.textures++)}if(L.samples>0&&D(L)===!1){B.__webglMultisampledFramebuffer=i.createFramebuffer(),B.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,B.__webglMultisampledFramebuffer);for(let xt=0;xt<rt.length;xt++){const Lt=rt[xt];B.__webglColorRenderbuffer[xt]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,B.__webglColorRenderbuffer[xt]);const zt=r.convert(Lt.format,Lt.colorSpace),dt=r.convert(Lt.type),yt=v(Lt.internalFormat,zt,dt,Lt.colorSpace,L.isXRRenderTarget===!0),Nt=M(L);i.renderbufferStorageMultisample(i.RENDERBUFFER,Nt,yt,L.width,L.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+xt,i.RENDERBUFFER,B.__webglColorRenderbuffer[xt])}i.bindRenderbuffer(i.RENDERBUFFER,null),L.depthBuffer&&(B.__webglDepthRenderbuffer=i.createRenderbuffer(),nt(B.__webglDepthRenderbuffer,L,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(Q){e.bindTexture(i.TEXTURE_CUBE_MAP,et.__webglTexture),Gt(i.TEXTURE_CUBE_MAP,_);for(let xt=0;xt<6;xt++)if(_.mipmaps&&_.mipmaps.length>0)for(let Lt=0;Lt<_.mipmaps.length;Lt++)W(B.__webglFramebuffer[xt][Lt],L,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+xt,Lt);else W(B.__webglFramebuffer[xt],L,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+xt,0);m(_)&&f(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(It){for(let xt=0,Lt=rt.length;xt<Lt;xt++){const zt=rt[xt],dt=n.get(zt);let yt=i.TEXTURE_2D;(L.isWebGL3DRenderTarget||L.isWebGLArrayRenderTarget)&&(yt=L.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(yt,dt.__webglTexture),Gt(yt,zt),W(B.__webglFramebuffer,L,zt,i.COLOR_ATTACHMENT0+xt,yt,0),m(zt)&&f(yt)}e.unbindTexture()}else{let xt=i.TEXTURE_2D;if((L.isWebGL3DRenderTarget||L.isWebGLArrayRenderTarget)&&(xt=L.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(xt,et.__webglTexture),Gt(xt,_),_.mipmaps&&_.mipmaps.length>0)for(let Lt=0;Lt<_.mipmaps.length;Lt++)W(B.__webglFramebuffer[Lt],L,_,i.COLOR_ATTACHMENT0,xt,Lt);else W(B.__webglFramebuffer,L,_,i.COLOR_ATTACHMENT0,xt,0);m(_)&&f(xt),e.unbindTexture()}L.depthBuffer&&lt(L)}function tt(L){const _=L.textures;for(let B=0,et=_.length;B<et;B++){const rt=_[B];if(m(rt)){const Q=A(L),It=n.get(rt).__webglTexture;e.bindTexture(Q,It),f(Q),e.unbindTexture()}}}const st=[],ht=[];function bt(L){if(L.samples>0){if(D(L)===!1){const _=L.textures,B=L.width,et=L.height;let rt=i.COLOR_BUFFER_BIT;const Q=L.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,It=n.get(L),xt=_.length>1;if(xt)for(let zt=0;zt<_.length;zt++)e.bindFramebuffer(i.FRAMEBUFFER,It.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+zt,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,It.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+zt,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,It.__webglMultisampledFramebuffer);const Lt=L.texture.mipmaps;Lt&&Lt.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,It.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,It.__webglFramebuffer);for(let zt=0;zt<_.length;zt++){if(L.resolveDepthBuffer&&(L.depthBuffer&&(rt|=i.DEPTH_BUFFER_BIT),L.stencilBuffer&&L.resolveStencilBuffer&&(rt|=i.STENCIL_BUFFER_BIT)),xt){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,It.__webglColorRenderbuffer[zt]);const dt=n.get(_[zt]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,dt,0)}i.blitFramebuffer(0,0,B,et,0,0,B,et,rt,i.NEAREST),l===!0&&(st.length=0,ht.length=0,st.push(i.COLOR_ATTACHMENT0+zt),L.depthBuffer&&L.resolveDepthBuffer===!1&&(st.push(Q),ht.push(Q),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,ht)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,st))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),xt)for(let zt=0;zt<_.length;zt++){e.bindFramebuffer(i.FRAMEBUFFER,It.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+zt,i.RENDERBUFFER,It.__webglColorRenderbuffer[zt]);const dt=n.get(_[zt]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,It.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+zt,i.TEXTURE_2D,dt,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,It.__webglMultisampledFramebuffer)}else if(L.depthBuffer&&L.resolveDepthBuffer===!1&&l){const _=L.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[_])}}}function M(L){return Math.min(s.maxSamples,L.samples)}function D(L){const _=n.get(L);return L.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&_.__useRenderToTexture!==!1}function mt(L){const _=o.render.frame;h.get(L)!==_&&(h.set(L,_),L.update())}function Ut(L,_){const B=L.colorSpace,et=L.format,rt=L.type;return L.isCompressedTexture===!0||L.isVideoTexture===!0||B!==ls&&B!==ni&&(Qt.getTransfer(B)===se?(et!==mn||rt!==rn)&&Vt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):ee("WebGLTextures: Unsupported texture color space:",B)),_}function Ct(L){return typeof HTMLImageElement<"u"&&L instanceof HTMLImageElement?(c.width=L.naturalWidth||L.width,c.height=L.naturalHeight||L.height):typeof VideoFrame<"u"&&L instanceof VideoFrame?(c.width=L.displayWidth,c.height=L.displayHeight):(c.width=L.width,c.height=L.height),c}this.allocateTextureUnit=X,this.resetTextureUnits=V,this.setTexture2D=j,this.setTexture2DArray=Z,this.setTexture3D=O,this.setTextureCube=z,this.rebindTextures=vt,this.setupRenderTarget=ut,this.updateRenderTargetMipmap=tt,this.updateMultisampleRenderTarget=bt,this.setupDepthRenderbuffer=lt,this.setupFrameBufferTexture=W,this.useMultisampledRTT=D,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function Nx(i,t){function e(n,s=ni){let r;const o=Qt.getTransfer(s);if(n===rn)return i.UNSIGNED_BYTE;if(n===Ya)return i.UNSIGNED_SHORT_4_4_4_4;if(n===qa)return i.UNSIGNED_SHORT_5_5_5_1;if(n===sh)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===rh)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===nh)return i.BYTE;if(n===ih)return i.SHORT;if(n===Us)return i.UNSIGNED_SHORT;if(n===Xa)return i.INT;if(n===Cn)return i.UNSIGNED_INT;if(n===Mn)return i.FLOAT;if(n===Wn)return i.HALF_FLOAT;if(n===oh)return i.ALPHA;if(n===ah)return i.RGB;if(n===mn)return i.RGBA;if(n===Xn)return i.DEPTH_COMPONENT;if(n===Ci)return i.DEPTH_STENCIL;if(n===lh)return i.RED;if(n===$a)return i.RED_INTEGER;if(n===as)return i.RG;if(n===Za)return i.RG_INTEGER;if(n===ja)return i.RGBA_INTEGER;if(n===wr||n===Pr||n===Rr||n===Lr)if(o===se)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===wr)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Pr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Rr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Lr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===wr)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Pr)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Rr)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Lr)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===oa||n===aa||n===la||n===ca)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===oa)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===aa)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===la)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===ca)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===ha||n===ua||n===da||n===fa||n===pa||n===ma||n===ga)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===ha||n===ua)return o===se?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===da)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===fa)return r.COMPRESSED_R11_EAC;if(n===pa)return r.COMPRESSED_SIGNED_R11_EAC;if(n===ma)return r.COMPRESSED_RG11_EAC;if(n===ga)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===xa||n===_a||n===va||n===ya||n===Sa||n===Ma||n===ba||n===Ea||n===Aa||n===Ta||n===Ca||n===wa||n===Pa||n===Ra)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===xa)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===_a)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===va)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===ya)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Sa)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Ma)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===ba)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Ea)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Aa)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Ta)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Ca)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===wa)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Pa)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Ra)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===La||n===Da||n===Ia)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===La)return o===se?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Da)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Ia)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Na||n===Ua||n===Fa||n===Oa)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===Na)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Ua)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Fa)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Oa)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Fs?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}const Ux=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Fx=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Ox{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){const n=new bh(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,n=new Pn({vertexShader:Ux,fragmentShader:Fx,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new xn(new jr(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Bx extends Ui{constructor(t,e){super();const n=this;let s=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,u=null,d=null,p=null,g=null;const x=typeof XRWebGLBinding<"u",m=new Ox,f={},A=e.getContextAttributes();let v=null,S=null;const w=[],R=[],P=new ct;let I=null;const y=new cn;y.viewport=new ve;const C=new cn;C.viewport=new ve;const U=[y,C],V=new Wf;let X=null,Y=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(E){let b=w[E];return b===void 0&&(b=new Po,w[E]=b),b.getTargetRaySpace()},this.getControllerGrip=function(E){let b=w[E];return b===void 0&&(b=new Po,w[E]=b),b.getGripSpace()},this.getHand=function(E){let b=w[E];return b===void 0&&(b=new Po,w[E]=b),b.getHandSpace()};function j(E){const b=R.indexOf(E.inputSource);if(b===-1)return;const W=w[b];W!==void 0&&(W.update(E.inputSource,E.frame,c||o),W.dispatchEvent({type:E.type,data:E.inputSource}))}function Z(){s.removeEventListener("select",j),s.removeEventListener("selectstart",j),s.removeEventListener("selectend",j),s.removeEventListener("squeeze",j),s.removeEventListener("squeezestart",j),s.removeEventListener("squeezeend",j),s.removeEventListener("end",Z),s.removeEventListener("inputsourceschange",O);for(let E=0;E<w.length;E++){const b=R[E];b!==null&&(R[E]=null,w[E].disconnect(b))}X=null,Y=null,m.reset();for(const E in f)delete f[E];t.setRenderTarget(v),p=null,d=null,u=null,s=null,S=null,F.stop(),n.isPresenting=!1,t.setPixelRatio(I),t.setSize(P.width,P.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(E){r=E,n.isPresenting===!0&&Vt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(E){a=E,n.isPresenting===!0&&Vt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(E){c=E},this.getBaseLayer=function(){return d!==null?d:p},this.getBinding=function(){return u===null&&x&&(u=new XRWebGLBinding(s,e)),u},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(E){if(s=E,s!==null){if(v=t.getRenderTarget(),s.addEventListener("select",j),s.addEventListener("selectstart",j),s.addEventListener("selectend",j),s.addEventListener("squeeze",j),s.addEventListener("squeezestart",j),s.addEventListener("squeezeend",j),s.addEventListener("end",Z),s.addEventListener("inputsourceschange",O),A.xrCompatible!==!0&&await e.makeXRCompatible(),I=t.getPixelRatio(),t.getSize(P),x&&"createProjectionLayer"in XRWebGLBinding.prototype){let W=null,nt=null,H=null;A.depth&&(H=A.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,W=A.stencil?Ci:Xn,nt=A.stencil?Fs:Cn);const lt={colorFormat:e.RGBA8,depthFormat:H,scaleFactor:r};u=this.getBinding(),d=u.createProjectionLayer(lt),s.updateRenderState({layers:[d]}),t.setPixelRatio(1),t.setSize(d.textureWidth,d.textureHeight,!1),S=new An(d.textureWidth,d.textureHeight,{format:mn,type:rn,depthTexture:new ks(d.textureWidth,d.textureHeight,nt,void 0,void 0,void 0,void 0,void 0,void 0,W),stencilBuffer:A.stencil,colorSpace:t.outputColorSpace,samples:A.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{const W={antialias:A.antialias,alpha:!0,depth:A.depth,stencil:A.stencil,framebufferScaleFactor:r};p=new XRWebGLLayer(s,e,W),s.updateRenderState({baseLayer:p}),t.setPixelRatio(1),t.setSize(p.framebufferWidth,p.framebufferHeight,!1),S=new An(p.framebufferWidth,p.framebufferHeight,{format:mn,type:rn,colorSpace:t.outputColorSpace,stencilBuffer:A.stencil,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1})}S.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),F.setContext(s),F.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function O(E){for(let b=0;b<E.removed.length;b++){const W=E.removed[b],nt=R.indexOf(W);nt>=0&&(R[nt]=null,w[nt].disconnect(W))}for(let b=0;b<E.added.length;b++){const W=E.added[b];let nt=R.indexOf(W);if(nt===-1){for(let lt=0;lt<w.length;lt++)if(lt>=R.length){R.push(W),nt=lt;break}else if(R[lt]===null){R[lt]=W,nt=lt;break}if(nt===-1)break}const H=w[nt];H&&H.connect(W)}}const z=new N,pt=new N;function at(E,b,W){z.setFromMatrixPosition(b.matrixWorld),pt.setFromMatrixPosition(W.matrixWorld);const nt=z.distanceTo(pt),H=b.projectionMatrix.elements,lt=W.projectionMatrix.elements,vt=H[14]/(H[10]-1),ut=H[14]/(H[10]+1),tt=(H[9]+1)/H[5],st=(H[9]-1)/H[5],ht=(H[8]-1)/H[0],bt=(lt[8]+1)/lt[0],M=vt*ht,D=vt*bt,mt=nt/(-ht+bt),Ut=mt*-ht;if(b.matrixWorld.decompose(E.position,E.quaternion,E.scale),E.translateX(Ut),E.translateZ(mt),E.matrixWorld.compose(E.position,E.quaternion,E.scale),E.matrixWorldInverse.copy(E.matrixWorld).invert(),H[10]===-1)E.projectionMatrix.copy(b.projectionMatrix),E.projectionMatrixInverse.copy(b.projectionMatrixInverse);else{const Ct=vt+mt,L=ut+mt,_=M-Ut,B=D+(nt-Ut),et=tt*ut/L*Ct,rt=st*ut/L*Ct;E.projectionMatrix.makePerspective(_,B,et,rt,Ct,L),E.projectionMatrixInverse.copy(E.projectionMatrix).invert()}}function _t(E,b){b===null?E.matrixWorld.copy(E.matrix):E.matrixWorld.multiplyMatrices(b.matrixWorld,E.matrix),E.matrixWorldInverse.copy(E.matrixWorld).invert()}this.updateCamera=function(E){if(s===null)return;let b=E.near,W=E.far;m.texture!==null&&(m.depthNear>0&&(b=m.depthNear),m.depthFar>0&&(W=m.depthFar)),V.near=C.near=y.near=b,V.far=C.far=y.far=W,(X!==V.near||Y!==V.far)&&(s.updateRenderState({depthNear:V.near,depthFar:V.far}),X=V.near,Y=V.far),V.layers.mask=E.layers.mask|6,y.layers.mask=V.layers.mask&3,C.layers.mask=V.layers.mask&5;const nt=E.parent,H=V.cameras;_t(V,nt);for(let lt=0;lt<H.length;lt++)_t(H[lt],nt);H.length===2?at(V,y,C):V.projectionMatrix.copy(y.projectionMatrix),Gt(E,V,nt)};function Gt(E,b,W){W===null?E.matrix.copy(b.matrixWorld):(E.matrix.copy(W.matrixWorld),E.matrix.invert(),E.matrix.multiply(b.matrixWorld)),E.matrix.decompose(E.position,E.quaternion,E.scale),E.updateMatrixWorld(!0),E.projectionMatrix.copy(b.projectionMatrix),E.projectionMatrixInverse.copy(b.projectionMatrixInverse),E.isPerspectiveCamera&&(E.fov=Bs*2*Math.atan(1/E.projectionMatrix.elements[5]),E.zoom=1)}this.getCamera=function(){return V},this.getFoveation=function(){if(!(d===null&&p===null))return l},this.setFoveation=function(E){l=E,d!==null&&(d.fixedFoveation=E),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=E)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(V)},this.getCameraTexture=function(E){return f[E]};let Yt=null;function $(E,b){if(h=b.getViewerPose(c||o),g=b,h!==null){const W=h.views;p!==null&&(t.setRenderTargetFramebuffer(S,p.framebuffer),t.setRenderTarget(S));let nt=!1;W.length!==V.cameras.length&&(V.cameras.length=0,nt=!0);for(let ut=0;ut<W.length;ut++){const tt=W[ut];let st=null;if(p!==null)st=p.getViewport(tt);else{const bt=u.getViewSubImage(d,tt);st=bt.viewport,ut===0&&(t.setRenderTargetTextures(S,bt.colorTexture,bt.depthStencilTexture),t.setRenderTarget(S))}let ht=U[ut];ht===void 0&&(ht=new cn,ht.layers.enable(ut),ht.viewport=new ve,U[ut]=ht),ht.matrix.fromArray(tt.transform.matrix),ht.matrix.decompose(ht.position,ht.quaternion,ht.scale),ht.projectionMatrix.fromArray(tt.projectionMatrix),ht.projectionMatrixInverse.copy(ht.projectionMatrix).invert(),ht.viewport.set(st.x,st.y,st.width,st.height),ut===0&&(V.matrix.copy(ht.matrix),V.matrix.decompose(V.position,V.quaternion,V.scale)),nt===!0&&V.cameras.push(ht)}const H=s.enabledFeatures;if(H&&H.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&x){u=n.getBinding();const ut=u.getDepthInformation(W[0]);ut&&ut.isValid&&ut.texture&&m.init(ut,s.renderState)}if(H&&H.includes("camera-access")&&x){t.state.unbindTexture(),u=n.getBinding();for(let ut=0;ut<W.length;ut++){const tt=W[ut].camera;if(tt){let st=f[tt];st||(st=new bh,f[tt]=st);const ht=u.getCameraImage(tt);st.sourceTexture=ht}}}}for(let W=0;W<w.length;W++){const nt=R[W],H=w[W];nt!==null&&H!==void 0&&H.update(nt,b,c||o)}Yt&&Yt(E,b),b.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:b}),g=null}const F=new Ih;F.setAnimationLoop($),this.setAnimationLoop=function(E){Yt=E},this.dispose=function(){}}}const yi=new wn,kx=new ue;function zx(i,t){function e(m,f){m.matrixAutoUpdate===!0&&m.updateMatrix(),f.value.copy(m.matrix)}function n(m,f){f.color.getRGB(m.fogColor.value,xh(i)),f.isFog?(m.fogNear.value=f.near,m.fogFar.value=f.far):f.isFogExp2&&(m.fogDensity.value=f.density)}function s(m,f,A,v,S){f.isMeshBasicMaterial||f.isMeshLambertMaterial?r(m,f):f.isMeshToonMaterial?(r(m,f),u(m,f)):f.isMeshPhongMaterial?(r(m,f),h(m,f)):f.isMeshStandardMaterial?(r(m,f),d(m,f),f.isMeshPhysicalMaterial&&p(m,f,S)):f.isMeshMatcapMaterial?(r(m,f),g(m,f)):f.isMeshDepthMaterial?r(m,f):f.isMeshDistanceMaterial?(r(m,f),x(m,f)):f.isMeshNormalMaterial?r(m,f):f.isLineBasicMaterial?(o(m,f),f.isLineDashedMaterial&&a(m,f)):f.isPointsMaterial?l(m,f,A,v):f.isSpriteMaterial?c(m,f):f.isShadowMaterial?(m.color.value.copy(f.color),m.opacity.value=f.opacity):f.isShaderMaterial&&(f.uniformsNeedUpdate=!1)}function r(m,f){m.opacity.value=f.opacity,f.color&&m.diffuse.value.copy(f.color),f.emissive&&m.emissive.value.copy(f.emissive).multiplyScalar(f.emissiveIntensity),f.map&&(m.map.value=f.map,e(f.map,m.mapTransform)),f.alphaMap&&(m.alphaMap.value=f.alphaMap,e(f.alphaMap,m.alphaMapTransform)),f.bumpMap&&(m.bumpMap.value=f.bumpMap,e(f.bumpMap,m.bumpMapTransform),m.bumpScale.value=f.bumpScale,f.side===Ke&&(m.bumpScale.value*=-1)),f.normalMap&&(m.normalMap.value=f.normalMap,e(f.normalMap,m.normalMapTransform),m.normalScale.value.copy(f.normalScale),f.side===Ke&&m.normalScale.value.negate()),f.displacementMap&&(m.displacementMap.value=f.displacementMap,e(f.displacementMap,m.displacementMapTransform),m.displacementScale.value=f.displacementScale,m.displacementBias.value=f.displacementBias),f.emissiveMap&&(m.emissiveMap.value=f.emissiveMap,e(f.emissiveMap,m.emissiveMapTransform)),f.specularMap&&(m.specularMap.value=f.specularMap,e(f.specularMap,m.specularMapTransform)),f.alphaTest>0&&(m.alphaTest.value=f.alphaTest);const A=t.get(f),v=A.envMap,S=A.envMapRotation;v&&(m.envMap.value=v,yi.copy(S),yi.x*=-1,yi.y*=-1,yi.z*=-1,v.isCubeTexture&&v.isRenderTargetTexture===!1&&(yi.y*=-1,yi.z*=-1),m.envMapRotation.value.setFromMatrix4(kx.makeRotationFromEuler(yi)),m.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=f.reflectivity,m.ior.value=f.ior,m.refractionRatio.value=f.refractionRatio),f.lightMap&&(m.lightMap.value=f.lightMap,m.lightMapIntensity.value=f.lightMapIntensity,e(f.lightMap,m.lightMapTransform)),f.aoMap&&(m.aoMap.value=f.aoMap,m.aoMapIntensity.value=f.aoMapIntensity,e(f.aoMap,m.aoMapTransform))}function o(m,f){m.diffuse.value.copy(f.color),m.opacity.value=f.opacity,f.map&&(m.map.value=f.map,e(f.map,m.mapTransform))}function a(m,f){m.dashSize.value=f.dashSize,m.totalSize.value=f.dashSize+f.gapSize,m.scale.value=f.scale}function l(m,f,A,v){m.diffuse.value.copy(f.color),m.opacity.value=f.opacity,m.size.value=f.size*A,m.scale.value=v*.5,f.map&&(m.map.value=f.map,e(f.map,m.uvTransform)),f.alphaMap&&(m.alphaMap.value=f.alphaMap,e(f.alphaMap,m.alphaMapTransform)),f.alphaTest>0&&(m.alphaTest.value=f.alphaTest)}function c(m,f){m.diffuse.value.copy(f.color),m.opacity.value=f.opacity,m.rotation.value=f.rotation,f.map&&(m.map.value=f.map,e(f.map,m.mapTransform)),f.alphaMap&&(m.alphaMap.value=f.alphaMap,e(f.alphaMap,m.alphaMapTransform)),f.alphaTest>0&&(m.alphaTest.value=f.alphaTest)}function h(m,f){m.specular.value.copy(f.specular),m.shininess.value=Math.max(f.shininess,1e-4)}function u(m,f){f.gradientMap&&(m.gradientMap.value=f.gradientMap)}function d(m,f){m.metalness.value=f.metalness,f.metalnessMap&&(m.metalnessMap.value=f.metalnessMap,e(f.metalnessMap,m.metalnessMapTransform)),m.roughness.value=f.roughness,f.roughnessMap&&(m.roughnessMap.value=f.roughnessMap,e(f.roughnessMap,m.roughnessMapTransform)),f.envMap&&(m.envMapIntensity.value=f.envMapIntensity)}function p(m,f,A){m.ior.value=f.ior,f.sheen>0&&(m.sheenColor.value.copy(f.sheenColor).multiplyScalar(f.sheen),m.sheenRoughness.value=f.sheenRoughness,f.sheenColorMap&&(m.sheenColorMap.value=f.sheenColorMap,e(f.sheenColorMap,m.sheenColorMapTransform)),f.sheenRoughnessMap&&(m.sheenRoughnessMap.value=f.sheenRoughnessMap,e(f.sheenRoughnessMap,m.sheenRoughnessMapTransform))),f.clearcoat>0&&(m.clearcoat.value=f.clearcoat,m.clearcoatRoughness.value=f.clearcoatRoughness,f.clearcoatMap&&(m.clearcoatMap.value=f.clearcoatMap,e(f.clearcoatMap,m.clearcoatMapTransform)),f.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=f.clearcoatRoughnessMap,e(f.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),f.clearcoatNormalMap&&(m.clearcoatNormalMap.value=f.clearcoatNormalMap,e(f.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(f.clearcoatNormalScale),f.side===Ke&&m.clearcoatNormalScale.value.negate())),f.dispersion>0&&(m.dispersion.value=f.dispersion),f.iridescence>0&&(m.iridescence.value=f.iridescence,m.iridescenceIOR.value=f.iridescenceIOR,m.iridescenceThicknessMinimum.value=f.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=f.iridescenceThicknessRange[1],f.iridescenceMap&&(m.iridescenceMap.value=f.iridescenceMap,e(f.iridescenceMap,m.iridescenceMapTransform)),f.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=f.iridescenceThicknessMap,e(f.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),f.transmission>0&&(m.transmission.value=f.transmission,m.transmissionSamplerMap.value=A.texture,m.transmissionSamplerSize.value.set(A.width,A.height),f.transmissionMap&&(m.transmissionMap.value=f.transmissionMap,e(f.transmissionMap,m.transmissionMapTransform)),m.thickness.value=f.thickness,f.thicknessMap&&(m.thicknessMap.value=f.thicknessMap,e(f.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=f.attenuationDistance,m.attenuationColor.value.copy(f.attenuationColor)),f.anisotropy>0&&(m.anisotropyVector.value.set(f.anisotropy*Math.cos(f.anisotropyRotation),f.anisotropy*Math.sin(f.anisotropyRotation)),f.anisotropyMap&&(m.anisotropyMap.value=f.anisotropyMap,e(f.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=f.specularIntensity,m.specularColor.value.copy(f.specularColor),f.specularColorMap&&(m.specularColorMap.value=f.specularColorMap,e(f.specularColorMap,m.specularColorMapTransform)),f.specularIntensityMap&&(m.specularIntensityMap.value=f.specularIntensityMap,e(f.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,f){f.matcap&&(m.matcap.value=f.matcap)}function x(m,f){const A=t.get(f).light;m.referencePosition.value.setFromMatrixPosition(A.matrixWorld),m.nearDistance.value=A.shadow.camera.near,m.farDistance.value=A.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function Vx(i,t,e,n){let s={},r={},o=[];const a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(A,v){const S=v.program;n.uniformBlockBinding(A,S)}function c(A,v){let S=s[A.id];S===void 0&&(g(A),S=h(A),s[A.id]=S,A.addEventListener("dispose",m));const w=v.program;n.updateUBOMapping(A,w);const R=t.render.frame;r[A.id]!==R&&(d(A),r[A.id]=R)}function h(A){const v=u();A.__bindingPointIndex=v;const S=i.createBuffer(),w=A.__size,R=A.usage;return i.bindBuffer(i.UNIFORM_BUFFER,S),i.bufferData(i.UNIFORM_BUFFER,w,R),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,v,S),S}function u(){for(let A=0;A<a;A++)if(o.indexOf(A)===-1)return o.push(A),A;return ee("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(A){const v=s[A.id],S=A.uniforms,w=A.__cache;i.bindBuffer(i.UNIFORM_BUFFER,v);for(let R=0,P=S.length;R<P;R++){const I=Array.isArray(S[R])?S[R]:[S[R]];for(let y=0,C=I.length;y<C;y++){const U=I[y];if(p(U,R,y,w)===!0){const V=U.__offset,X=Array.isArray(U.value)?U.value:[U.value];let Y=0;for(let j=0;j<X.length;j++){const Z=X[j],O=x(Z);typeof Z=="number"||typeof Z=="boolean"?(U.__data[0]=Z,i.bufferSubData(i.UNIFORM_BUFFER,V+Y,U.__data)):Z.isMatrix3?(U.__data[0]=Z.elements[0],U.__data[1]=Z.elements[1],U.__data[2]=Z.elements[2],U.__data[3]=0,U.__data[4]=Z.elements[3],U.__data[5]=Z.elements[4],U.__data[6]=Z.elements[5],U.__data[7]=0,U.__data[8]=Z.elements[6],U.__data[9]=Z.elements[7],U.__data[10]=Z.elements[8],U.__data[11]=0):(Z.toArray(U.__data,Y),Y+=O.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,V,U.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function p(A,v,S,w){const R=A.value,P=v+"_"+S;if(w[P]===void 0)return typeof R=="number"||typeof R=="boolean"?w[P]=R:w[P]=R.clone(),!0;{const I=w[P];if(typeof R=="number"||typeof R=="boolean"){if(I!==R)return w[P]=R,!0}else if(I.equals(R)===!1)return I.copy(R),!0}return!1}function g(A){const v=A.uniforms;let S=0;const w=16;for(let P=0,I=v.length;P<I;P++){const y=Array.isArray(v[P])?v[P]:[v[P]];for(let C=0,U=y.length;C<U;C++){const V=y[C],X=Array.isArray(V.value)?V.value:[V.value];for(let Y=0,j=X.length;Y<j;Y++){const Z=X[Y],O=x(Z),z=S%w,pt=z%O.boundary,at=z+pt;S+=pt,at!==0&&w-at<O.storage&&(S+=w-at),V.__data=new Float32Array(O.storage/Float32Array.BYTES_PER_ELEMENT),V.__offset=S,S+=O.storage}}}const R=S%w;return R>0&&(S+=w-R),A.__size=S,A.__cache={},this}function x(A){const v={boundary:0,storage:0};return typeof A=="number"||typeof A=="boolean"?(v.boundary=4,v.storage=4):A.isVector2?(v.boundary=8,v.storage=8):A.isVector3||A.isColor?(v.boundary=16,v.storage=12):A.isVector4?(v.boundary=16,v.storage=16):A.isMatrix3?(v.boundary=48,v.storage=48):A.isMatrix4?(v.boundary=64,v.storage=64):A.isTexture?Vt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):Vt("WebGLRenderer: Unsupported uniform value type.",A),v}function m(A){const v=A.target;v.removeEventListener("dispose",m);const S=o.indexOf(v.__bindingPointIndex);o.splice(S,1),i.deleteBuffer(s[v.id]),delete s[v.id],delete r[v.id]}function f(){for(const A in s)i.deleteBuffer(s[A]);o=[],s={},r={}}return{bind:l,update:c,dispose:f}}const Gx=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let vn=null;function Hx(){return vn===null&&(vn=new Jd(Gx,16,16,as,Wn),vn.name="DFG_LUT",vn.minFilter=Fe,vn.magFilter=Fe,vn.wrapS=kn,vn.wrapT=kn,vn.generateMipmaps=!1,vn.needsUpdate=!0),vn}class Wx{constructor(t={}){const{canvas:e=cd(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:p=rn}=t;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=n.getContextAttributes().alpha}else g=o;const x=p,m=new Set([ja,Za,$a]),f=new Set([rn,Cn,Us,Fs,Ya,qa]),A=new Uint32Array(4),v=new Int32Array(4);let S=null,w=null;const R=[],P=[];let I=null;this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=En,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const y=this;let C=!1;this._outputColorSpace=sn;let U=0,V=0,X=null,Y=-1,j=null;const Z=new ve,O=new ve;let z=null;const pt=new jt(0);let at=0,_t=e.width,Gt=e.height,Yt=1,$=null,F=null;const E=new ve(0,0,_t,Gt),b=new ve(0,0,_t,Gt);let W=!1;const nt=new nl;let H=!1,lt=!1;const vt=new ue,ut=new N,tt=new ve,st={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let ht=!1;function bt(){return X===null?Yt:1}let M=n;function D(T,G){return e.getContext(T,G)}try{const T={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${Wa}`),e.addEventListener("webglcontextlost",qt,!1),e.addEventListener("webglcontextrestored",de,!1),e.addEventListener("webglcontextcreationerror",ne,!1),M===null){const G="webgl2";if(M=D(G,T),M===null)throw D(G)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(T){throw ee("WebGLRenderer: "+T.message),T}let mt,Ut,Ct,L,_,B,et,rt,Q,It,xt,Lt,zt,dt,yt,Nt,Ft,Mt,Kt,k,wt,gt,Pt,ft;function ot(){mt=new Hg(M),mt.init(),gt=new Nx(M,mt),Ut=new Ng(M,mt,t,gt),Ct=new Dx(M,mt),Ut.reversedDepthBuffer&&d&&Ct.buffers.depth.setReversed(!0),L=new Yg(M),_=new xx,B=new Ix(M,mt,Ct,_,Ut,gt,L),et=new Fg(y),rt=new Gg(y),Q=new jf(M),Pt=new Dg(M,Q),It=new Wg(M,Q,L,Pt),xt=new $g(M,It,Q,L),Kt=new qg(M,Ut,B),Nt=new Ug(_),Lt=new gx(y,et,rt,mt,Ut,Pt,Nt),zt=new zx(y,_),dt=new vx,yt=new Ax(mt),Mt=new Lg(y,et,rt,Ct,xt,g,l),Ft=new Rx(y,xt,Ut),ft=new Vx(M,L,Ut,Ct),k=new Ig(M,mt,L),wt=new Xg(M,mt,L),L.programs=Lt.programs,y.capabilities=Ut,y.extensions=mt,y.properties=_,y.renderLists=dt,y.shadowMap=Ft,y.state=Ct,y.info=L}ot(),x!==rn&&(I=new jg(x,e.width,e.height,s,r));const St=new Bx(y,M);this.xr=St,this.getContext=function(){return M},this.getContextAttributes=function(){return M.getContextAttributes()},this.forceContextLoss=function(){const T=mt.get("WEBGL_lose_context");T&&T.loseContext()},this.forceContextRestore=function(){const T=mt.get("WEBGL_lose_context");T&&T.restoreContext()},this.getPixelRatio=function(){return Yt},this.setPixelRatio=function(T){T!==void 0&&(Yt=T,this.setSize(_t,Gt,!1))},this.getSize=function(T){return T.set(_t,Gt)},this.setSize=function(T,G,J=!0){if(St.isPresenting){Vt("WebGLRenderer: Can't change size while VR device is presenting.");return}_t=T,Gt=G,e.width=Math.floor(T*Yt),e.height=Math.floor(G*Yt),J===!0&&(e.style.width=T+"px",e.style.height=G+"px"),I!==null&&I.setSize(e.width,e.height),this.setViewport(0,0,T,G)},this.getDrawingBufferSize=function(T){return T.set(_t*Yt,Gt*Yt).floor()},this.setDrawingBufferSize=function(T,G,J){_t=T,Gt=G,Yt=J,e.width=Math.floor(T*J),e.height=Math.floor(G*J),this.setViewport(0,0,T,G)},this.setEffects=function(T){if(x===rn){console.error("THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(T){for(let G=0;G<T.length;G++)if(T[G].isOutputPass===!0){console.warn("THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}I.setEffects(T||[])},this.getCurrentViewport=function(T){return T.copy(Z)},this.getViewport=function(T){return T.copy(E)},this.setViewport=function(T,G,J,K){T.isVector4?E.set(T.x,T.y,T.z,T.w):E.set(T,G,J,K),Ct.viewport(Z.copy(E).multiplyScalar(Yt).round())},this.getScissor=function(T){return T.copy(b)},this.setScissor=function(T,G,J,K){T.isVector4?b.set(T.x,T.y,T.z,T.w):b.set(T,G,J,K),Ct.scissor(O.copy(b).multiplyScalar(Yt).round())},this.getScissorTest=function(){return W},this.setScissorTest=function(T){Ct.setScissorTest(W=T)},this.setOpaqueSort=function(T){$=T},this.setTransparentSort=function(T){F=T},this.getClearColor=function(T){return T.copy(Mt.getClearColor())},this.setClearColor=function(){Mt.setClearColor(...arguments)},this.getClearAlpha=function(){return Mt.getClearAlpha()},this.setClearAlpha=function(){Mt.setClearAlpha(...arguments)},this.clear=function(T=!0,G=!0,J=!0){let K=0;if(T){let q=!1;if(X!==null){const Et=X.texture.format;q=m.has(Et)}if(q){const Et=X.texture.type,Rt=f.has(Et),Tt=Mt.getClearColor(),Dt=Mt.getClearAlpha(),Ot=Tt.r,Ht=Tt.g,Bt=Tt.b;Rt?(A[0]=Ot,A[1]=Ht,A[2]=Bt,A[3]=Dt,M.clearBufferuiv(M.COLOR,0,A)):(v[0]=Ot,v[1]=Ht,v[2]=Bt,v[3]=Dt,M.clearBufferiv(M.COLOR,0,v))}else K|=M.COLOR_BUFFER_BIT}G&&(K|=M.DEPTH_BUFFER_BIT),J&&(K|=M.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),M.clear(K)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",qt,!1),e.removeEventListener("webglcontextrestored",de,!1),e.removeEventListener("webglcontextcreationerror",ne,!1),Mt.dispose(),dt.dispose(),yt.dispose(),_.dispose(),et.dispose(),rt.dispose(),xt.dispose(),Pt.dispose(),ft.dispose(),Lt.dispose(),St.dispose(),St.removeEventListener("sessionstart",fl),St.removeEventListener("sessionend",pl),di.stop()};function qt(T){T.preventDefault(),Nl("WebGLRenderer: Context Lost."),C=!0}function de(){Nl("WebGLRenderer: Context Restored."),C=!1;const T=L.autoReset,G=Ft.enabled,J=Ft.autoUpdate,K=Ft.needsUpdate,q=Ft.type;ot(),L.autoReset=T,Ft.enabled=G,Ft.autoUpdate=J,Ft.needsUpdate=K,Ft.type=q}function ne(T){ee("WebGLRenderer: A WebGL context could not be created. Reason: ",T.statusMessage)}function _n(T){const G=T.target;G.removeEventListener("dispose",_n),Dn(G)}function Dn(T){nu(T),_.remove(T)}function nu(T){const G=_.get(T).programs;G!==void 0&&(G.forEach(function(J){Lt.releaseProgram(J)}),T.isShaderMaterial&&Lt.releaseShaderCache(T))}this.renderBufferDirect=function(T,G,J,K,q,Et){G===null&&(G=st);const Rt=q.isMesh&&q.matrixWorld.determinant()<0,Tt=su(T,G,J,K,q);Ct.setMaterial(K,Rt);let Dt=J.index,Ot=1;if(K.wireframe===!0){if(Dt=It.getWireframeAttribute(J),Dt===void 0)return;Ot=2}const Ht=J.drawRange,Bt=J.attributes.position;let Jt=Ht.start*Ot,oe=(Ht.start+Ht.count)*Ot;Et!==null&&(Jt=Math.max(Jt,Et.start*Ot),oe=Math.min(oe,(Et.start+Et.count)*Ot)),Dt!==null?(Jt=Math.max(Jt,0),oe=Math.min(oe,Dt.count)):Bt!=null&&(Jt=Math.max(Jt,0),oe=Math.min(oe,Bt.count));const xe=oe-Jt;if(xe<0||xe===1/0)return;Pt.setup(q,K,Tt,J,Dt);let _e,ce=k;if(Dt!==null&&(_e=Q.get(Dt),ce=wt,ce.setIndex(_e)),q.isMesh)K.wireframe===!0?(Ct.setLineWidth(K.wireframeLinewidth*bt()),ce.setMode(M.LINES)):ce.setMode(M.TRIANGLES);else if(q.isLine){let kt=K.linewidth;kt===void 0&&(kt=1),Ct.setLineWidth(kt*bt()),q.isLineSegments?ce.setMode(M.LINES):q.isLineLoop?ce.setMode(M.LINE_LOOP):ce.setMode(M.LINE_STRIP)}else q.isPoints?ce.setMode(M.POINTS):q.isSprite&&ce.setMode(M.TRIANGLES);if(q.isBatchedMesh)if(q._multiDrawInstances!==null)Os("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),ce.renderMultiDrawInstances(q._multiDrawStarts,q._multiDrawCounts,q._multiDrawCount,q._multiDrawInstances);else if(mt.get("WEBGL_multi_draw"))ce.renderMultiDraw(q._multiDrawStarts,q._multiDrawCounts,q._multiDrawCount);else{const kt=q._multiDrawStarts,ie=q._multiDrawCounts,te=q._multiDrawCount,Qe=Dt?Q.get(Dt).bytesPerElement:1,Oi=_.get(K).currentProgram.getUniforms();for(let tn=0;tn<te;tn++)Oi.setValue(M,"_gl_DrawID",tn),ce.render(kt[tn]/Qe,ie[tn])}else if(q.isInstancedMesh)ce.renderInstances(Jt,xe,q.count);else if(J.isInstancedBufferGeometry){const kt=J._maxInstanceCount!==void 0?J._maxInstanceCount:1/0,ie=Math.min(J.instanceCount,kt);ce.renderInstances(Jt,xe,ie)}else ce.render(Jt,xe)};function dl(T,G,J){T.transparent===!0&&T.side===Sn&&T.forceSinglePass===!1?(T.side=Ke,T.needsUpdate=!0,Js(T,G,J),T.side=li,T.needsUpdate=!0,Js(T,G,J),T.side=Sn):Js(T,G,J)}this.compile=function(T,G,J=null){J===null&&(J=T),w=yt.get(J),w.init(G),P.push(w),J.traverseVisible(function(q){q.isLight&&q.layers.test(G.layers)&&(w.pushLight(q),q.castShadow&&w.pushShadow(q))}),T!==J&&T.traverseVisible(function(q){q.isLight&&q.layers.test(G.layers)&&(w.pushLight(q),q.castShadow&&w.pushShadow(q))}),w.setupLights();const K=new Set;return T.traverse(function(q){if(!(q.isMesh||q.isPoints||q.isLine||q.isSprite))return;const Et=q.material;if(Et)if(Array.isArray(Et))for(let Rt=0;Rt<Et.length;Rt++){const Tt=Et[Rt];dl(Tt,J,q),K.add(Tt)}else dl(Et,J,q),K.add(Et)}),w=P.pop(),K},this.compileAsync=function(T,G,J=null){const K=this.compile(T,G,J);return new Promise(q=>{function Et(){if(K.forEach(function(Rt){_.get(Rt).currentProgram.isReady()&&K.delete(Rt)}),K.size===0){q(T);return}setTimeout(Et,10)}mt.get("KHR_parallel_shader_compile")!==null?Et():setTimeout(Et,10)})};let io=null;function iu(T){io&&io(T)}function fl(){di.stop()}function pl(){di.start()}const di=new Ih;di.setAnimationLoop(iu),typeof self<"u"&&di.setContext(self),this.setAnimationLoop=function(T){io=T,St.setAnimationLoop(T),T===null?di.stop():di.start()},St.addEventListener("sessionstart",fl),St.addEventListener("sessionend",pl),this.render=function(T,G){if(G!==void 0&&G.isCamera!==!0){ee("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(C===!0)return;const J=St.enabled===!0&&St.isPresenting===!0,K=I!==null&&(X===null||J)&&I.begin(y,X);if(T.matrixWorldAutoUpdate===!0&&T.updateMatrixWorld(),G.parent===null&&G.matrixWorldAutoUpdate===!0&&G.updateMatrixWorld(),St.enabled===!0&&St.isPresenting===!0&&(I===null||I.isCompositing()===!1)&&(St.cameraAutoUpdate===!0&&St.updateCamera(G),G=St.getCamera()),T.isScene===!0&&T.onBeforeRender(y,T,G,X),w=yt.get(T,P.length),w.init(G),P.push(w),vt.multiplyMatrices(G.projectionMatrix,G.matrixWorldInverse),nt.setFromProjectionMatrix(vt,bn,G.reversedDepth),lt=this.localClippingEnabled,H=Nt.init(this.clippingPlanes,lt),S=dt.get(T,R.length),S.init(),R.push(S),St.enabled===!0&&St.isPresenting===!0){const Rt=y.xr.getDepthSensingMesh();Rt!==null&&so(Rt,G,-1/0,y.sortObjects)}so(T,G,0,y.sortObjects),S.finish(),y.sortObjects===!0&&S.sort($,F),ht=St.enabled===!1||St.isPresenting===!1||St.hasDepthSensing()===!1,ht&&Mt.addToRenderList(S,T),this.info.render.frame++,H===!0&&Nt.beginShadows();const q=w.state.shadowsArray;if(Ft.render(q,T,G),H===!0&&Nt.endShadows(),this.info.autoReset===!0&&this.info.reset(),(K&&I.hasRenderPass())===!1){const Rt=S.opaque,Tt=S.transmissive;if(w.setupLights(),G.isArrayCamera){const Dt=G.cameras;if(Tt.length>0)for(let Ot=0,Ht=Dt.length;Ot<Ht;Ot++){const Bt=Dt[Ot];gl(Rt,Tt,T,Bt)}ht&&Mt.render(T);for(let Ot=0,Ht=Dt.length;Ot<Ht;Ot++){const Bt=Dt[Ot];ml(S,T,Bt,Bt.viewport)}}else Tt.length>0&&gl(Rt,Tt,T,G),ht&&Mt.render(T),ml(S,T,G)}X!==null&&V===0&&(B.updateMultisampleRenderTarget(X),B.updateRenderTargetMipmap(X)),K&&I.end(y),T.isScene===!0&&T.onAfterRender(y,T,G),Pt.resetDefaultState(),Y=-1,j=null,P.pop(),P.length>0?(w=P[P.length-1],H===!0&&Nt.setGlobalState(y.clippingPlanes,w.state.camera)):w=null,R.pop(),R.length>0?S=R[R.length-1]:S=null};function so(T,G,J,K){if(T.visible===!1)return;if(T.layers.test(G.layers)){if(T.isGroup)J=T.renderOrder;else if(T.isLOD)T.autoUpdate===!0&&T.update(G);else if(T.isLight)w.pushLight(T),T.castShadow&&w.pushShadow(T);else if(T.isSprite){if(!T.frustumCulled||nt.intersectsSprite(T)){K&&tt.setFromMatrixPosition(T.matrixWorld).applyMatrix4(vt);const Rt=xt.update(T),Tt=T.material;Tt.visible&&S.push(T,Rt,Tt,J,tt.z,null)}}else if((T.isMesh||T.isLine||T.isPoints)&&(!T.frustumCulled||nt.intersectsObject(T))){const Rt=xt.update(T),Tt=T.material;if(K&&(T.boundingSphere!==void 0?(T.boundingSphere===null&&T.computeBoundingSphere(),tt.copy(T.boundingSphere.center)):(Rt.boundingSphere===null&&Rt.computeBoundingSphere(),tt.copy(Rt.boundingSphere.center)),tt.applyMatrix4(T.matrixWorld).applyMatrix4(vt)),Array.isArray(Tt)){const Dt=Rt.groups;for(let Ot=0,Ht=Dt.length;Ot<Ht;Ot++){const Bt=Dt[Ot],Jt=Tt[Bt.materialIndex];Jt&&Jt.visible&&S.push(T,Rt,Jt,J,tt.z,Bt)}}else Tt.visible&&S.push(T,Rt,Tt,J,tt.z,null)}}const Et=T.children;for(let Rt=0,Tt=Et.length;Rt<Tt;Rt++)so(Et[Rt],G,J,K)}function ml(T,G,J,K){const{opaque:q,transmissive:Et,transparent:Rt}=T;w.setupLightsView(J),H===!0&&Nt.setGlobalState(y.clippingPlanes,J),K&&Ct.viewport(Z.copy(K)),q.length>0&&Ks(q,G,J),Et.length>0&&Ks(Et,G,J),Rt.length>0&&Ks(Rt,G,J),Ct.buffers.depth.setTest(!0),Ct.buffers.depth.setMask(!0),Ct.buffers.color.setMask(!0),Ct.setPolygonOffset(!1)}function gl(T,G,J,K){if((J.isScene===!0?J.overrideMaterial:null)!==null)return;if(w.state.transmissionRenderTarget[K.id]===void 0){const Jt=mt.has("EXT_color_buffer_half_float")||mt.has("EXT_color_buffer_float");w.state.transmissionRenderTarget[K.id]=new An(1,1,{generateMipmaps:!0,type:Jt?Wn:rn,minFilter:Ti,samples:Ut.samples,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Qt.workingColorSpace})}const Et=w.state.transmissionRenderTarget[K.id],Rt=K.viewport||Z;Et.setSize(Rt.z*y.transmissionResolutionScale,Rt.w*y.transmissionResolutionScale);const Tt=y.getRenderTarget(),Dt=y.getActiveCubeFace(),Ot=y.getActiveMipmapLevel();y.setRenderTarget(Et),y.getClearColor(pt),at=y.getClearAlpha(),at<1&&y.setClearColor(16777215,.5),y.clear(),ht&&Mt.render(J);const Ht=y.toneMapping;y.toneMapping=En;const Bt=K.viewport;if(K.viewport!==void 0&&(K.viewport=void 0),w.setupLightsView(K),H===!0&&Nt.setGlobalState(y.clippingPlanes,K),Ks(T,J,K),B.updateMultisampleRenderTarget(Et),B.updateRenderTargetMipmap(Et),mt.has("WEBGL_multisampled_render_to_texture")===!1){let Jt=!1;for(let oe=0,xe=G.length;oe<xe;oe++){const _e=G[oe],{object:ce,geometry:kt,material:ie,group:te}=_e;if(ie.side===Sn&&ce.layers.test(K.layers)){const Qe=ie.side;ie.side=Ke,ie.needsUpdate=!0,xl(ce,J,K,kt,ie,te),ie.side=Qe,ie.needsUpdate=!0,Jt=!0}}Jt===!0&&(B.updateMultisampleRenderTarget(Et),B.updateRenderTargetMipmap(Et))}y.setRenderTarget(Tt,Dt,Ot),y.setClearColor(pt,at),Bt!==void 0&&(K.viewport=Bt),y.toneMapping=Ht}function Ks(T,G,J){const K=G.isScene===!0?G.overrideMaterial:null;for(let q=0,Et=T.length;q<Et;q++){const Rt=T[q],{object:Tt,geometry:Dt,group:Ot}=Rt;let Ht=Rt.material;Ht.allowOverride===!0&&K!==null&&(Ht=K),Tt.layers.test(J.layers)&&xl(Tt,G,J,Dt,Ht,Ot)}}function xl(T,G,J,K,q,Et){T.onBeforeRender(y,G,J,K,q,Et),T.modelViewMatrix.multiplyMatrices(J.matrixWorldInverse,T.matrixWorld),T.normalMatrix.getNormalMatrix(T.modelViewMatrix),q.onBeforeRender(y,G,J,K,T,Et),q.transparent===!0&&q.side===Sn&&q.forceSinglePass===!1?(q.side=Ke,q.needsUpdate=!0,y.renderBufferDirect(J,G,K,q,T,Et),q.side=li,q.needsUpdate=!0,y.renderBufferDirect(J,G,K,q,T,Et),q.side=Sn):y.renderBufferDirect(J,G,K,q,T,Et),T.onAfterRender(y,G,J,K,q,Et)}function Js(T,G,J){G.isScene!==!0&&(G=st);const K=_.get(T),q=w.state.lights,Et=w.state.shadowsArray,Rt=q.state.version,Tt=Lt.getParameters(T,q.state,Et,G,J),Dt=Lt.getProgramCacheKey(Tt);let Ot=K.programs;K.environment=T.isMeshStandardMaterial?G.environment:null,K.fog=G.fog,K.envMap=(T.isMeshStandardMaterial?rt:et).get(T.envMap||K.environment),K.envMapRotation=K.environment!==null&&T.envMap===null?G.environmentRotation:T.envMapRotation,Ot===void 0&&(T.addEventListener("dispose",_n),Ot=new Map,K.programs=Ot);let Ht=Ot.get(Dt);if(Ht!==void 0){if(K.currentProgram===Ht&&K.lightsStateVersion===Rt)return vl(T,Tt),Ht}else Tt.uniforms=Lt.getUniforms(T),T.onBeforeCompile(Tt,y),Ht=Lt.acquireProgram(Tt,Dt),Ot.set(Dt,Ht),K.uniforms=Tt.uniforms;const Bt=K.uniforms;return(!T.isShaderMaterial&&!T.isRawShaderMaterial||T.clipping===!0)&&(Bt.clippingPlanes=Nt.uniform),vl(T,Tt),K.needsLights=ou(T),K.lightsStateVersion=Rt,K.needsLights&&(Bt.ambientLightColor.value=q.state.ambient,Bt.lightProbe.value=q.state.probe,Bt.directionalLights.value=q.state.directional,Bt.directionalLightShadows.value=q.state.directionalShadow,Bt.spotLights.value=q.state.spot,Bt.spotLightShadows.value=q.state.spotShadow,Bt.rectAreaLights.value=q.state.rectArea,Bt.ltc_1.value=q.state.rectAreaLTC1,Bt.ltc_2.value=q.state.rectAreaLTC2,Bt.pointLights.value=q.state.point,Bt.pointLightShadows.value=q.state.pointShadow,Bt.hemisphereLights.value=q.state.hemi,Bt.directionalShadowMap.value=q.state.directionalShadowMap,Bt.directionalShadowMatrix.value=q.state.directionalShadowMatrix,Bt.spotShadowMap.value=q.state.spotShadowMap,Bt.spotLightMatrix.value=q.state.spotLightMatrix,Bt.spotLightMap.value=q.state.spotLightMap,Bt.pointShadowMap.value=q.state.pointShadowMap,Bt.pointShadowMatrix.value=q.state.pointShadowMatrix),K.currentProgram=Ht,K.uniformsList=null,Ht}function _l(T){if(T.uniformsList===null){const G=T.currentProgram.getUniforms();T.uniformsList=Nr.seqWithValue(G.seq,T.uniforms)}return T.uniformsList}function vl(T,G){const J=_.get(T);J.outputColorSpace=G.outputColorSpace,J.batching=G.batching,J.batchingColor=G.batchingColor,J.instancing=G.instancing,J.instancingColor=G.instancingColor,J.instancingMorph=G.instancingMorph,J.skinning=G.skinning,J.morphTargets=G.morphTargets,J.morphNormals=G.morphNormals,J.morphColors=G.morphColors,J.morphTargetsCount=G.morphTargetsCount,J.numClippingPlanes=G.numClippingPlanes,J.numIntersection=G.numClipIntersection,J.vertexAlphas=G.vertexAlphas,J.vertexTangents=G.vertexTangents,J.toneMapping=G.toneMapping}function su(T,G,J,K,q){G.isScene!==!0&&(G=st),B.resetTextureUnits();const Et=G.fog,Rt=K.isMeshStandardMaterial?G.environment:null,Tt=X===null?y.outputColorSpace:X.isXRRenderTarget===!0?X.texture.colorSpace:ls,Dt=(K.isMeshStandardMaterial?rt:et).get(K.envMap||Rt),Ot=K.vertexColors===!0&&!!J.attributes.color&&J.attributes.color.itemSize===4,Ht=!!J.attributes.tangent&&(!!K.normalMap||K.anisotropy>0),Bt=!!J.morphAttributes.position,Jt=!!J.morphAttributes.normal,oe=!!J.morphAttributes.color;let xe=En;K.toneMapped&&(X===null||X.isXRRenderTarget===!0)&&(xe=y.toneMapping);const _e=J.morphAttributes.position||J.morphAttributes.normal||J.morphAttributes.color,ce=_e!==void 0?_e.length:0,kt=_.get(K),ie=w.state.lights;if(H===!0&&(lt===!0||T!==j)){const ze=T===j&&K.id===Y;Nt.setState(K,T,ze)}let te=!1;K.version===kt.__version?(kt.needsLights&&kt.lightsStateVersion!==ie.state.version||kt.outputColorSpace!==Tt||q.isBatchedMesh&&kt.batching===!1||!q.isBatchedMesh&&kt.batching===!0||q.isBatchedMesh&&kt.batchingColor===!0&&q.colorTexture===null||q.isBatchedMesh&&kt.batchingColor===!1&&q.colorTexture!==null||q.isInstancedMesh&&kt.instancing===!1||!q.isInstancedMesh&&kt.instancing===!0||q.isSkinnedMesh&&kt.skinning===!1||!q.isSkinnedMesh&&kt.skinning===!0||q.isInstancedMesh&&kt.instancingColor===!0&&q.instanceColor===null||q.isInstancedMesh&&kt.instancingColor===!1&&q.instanceColor!==null||q.isInstancedMesh&&kt.instancingMorph===!0&&q.morphTexture===null||q.isInstancedMesh&&kt.instancingMorph===!1&&q.morphTexture!==null||kt.envMap!==Dt||K.fog===!0&&kt.fog!==Et||kt.numClippingPlanes!==void 0&&(kt.numClippingPlanes!==Nt.numPlanes||kt.numIntersection!==Nt.numIntersection)||kt.vertexAlphas!==Ot||kt.vertexTangents!==Ht||kt.morphTargets!==Bt||kt.morphNormals!==Jt||kt.morphColors!==oe||kt.toneMapping!==xe||kt.morphTargetsCount!==ce)&&(te=!0):(te=!0,kt.__version=K.version);let Qe=kt.currentProgram;te===!0&&(Qe=Js(K,G,q));let Oi=!1,tn=!1,gs=!1;const fe=Qe.getUniforms(),We=kt.uniforms;if(Ct.useProgram(Qe.program)&&(Oi=!0,tn=!0,gs=!0),K.id!==Y&&(Y=K.id,tn=!0),Oi||j!==T){Ct.buffers.depth.getReversed()&&T.reversedDepth!==!0&&(T._reversedDepth=!0,T.updateProjectionMatrix()),fe.setValue(M,"projectionMatrix",T.projectionMatrix),fe.setValue(M,"viewMatrix",T.matrixWorldInverse);const Xe=fe.map.cameraPosition;Xe!==void 0&&Xe.setValue(M,ut.setFromMatrixPosition(T.matrixWorld)),Ut.logarithmicDepthBuffer&&fe.setValue(M,"logDepthBufFC",2/(Math.log(T.far+1)/Math.LN2)),(K.isMeshPhongMaterial||K.isMeshToonMaterial||K.isMeshLambertMaterial||K.isMeshBasicMaterial||K.isMeshStandardMaterial||K.isShaderMaterial)&&fe.setValue(M,"isOrthographic",T.isOrthographicCamera===!0),j!==T&&(j=T,tn=!0,gs=!0)}if(kt.needsLights&&(ie.state.directionalShadowMap.length>0&&fe.setValue(M,"directionalShadowMap",ie.state.directionalShadowMap,B),ie.state.spotShadowMap.length>0&&fe.setValue(M,"spotShadowMap",ie.state.spotShadowMap,B),ie.state.pointShadowMap.length>0&&fe.setValue(M,"pointShadowMap",ie.state.pointShadowMap,B)),q.isSkinnedMesh){fe.setOptional(M,q,"bindMatrix"),fe.setOptional(M,q,"bindMatrixInverse");const ze=q.skeleton;ze&&(ze.boneTexture===null&&ze.computeBoneTexture(),fe.setValue(M,"boneTexture",ze.boneTexture,B))}q.isBatchedMesh&&(fe.setOptional(M,q,"batchingTexture"),fe.setValue(M,"batchingTexture",q._matricesTexture,B),fe.setOptional(M,q,"batchingIdTexture"),fe.setValue(M,"batchingIdTexture",q._indirectTexture,B),fe.setOptional(M,q,"batchingColorTexture"),q._colorsTexture!==null&&fe.setValue(M,"batchingColorTexture",q._colorsTexture,B));const an=J.morphAttributes;if((an.position!==void 0||an.normal!==void 0||an.color!==void 0)&&Kt.update(q,J,Qe),(tn||kt.receiveShadow!==q.receiveShadow)&&(kt.receiveShadow=q.receiveShadow,fe.setValue(M,"receiveShadow",q.receiveShadow)),K.isMeshGouraudMaterial&&K.envMap!==null&&(We.envMap.value=Dt,We.flipEnvMap.value=Dt.isCubeTexture&&Dt.isRenderTargetTexture===!1?-1:1),K.isMeshStandardMaterial&&K.envMap===null&&G.environment!==null&&(We.envMapIntensity.value=G.environmentIntensity),We.dfgLUT!==void 0&&(We.dfgLUT.value=Hx()),tn&&(fe.setValue(M,"toneMappingExposure",y.toneMappingExposure),kt.needsLights&&ru(We,gs),Et&&K.fog===!0&&zt.refreshFogUniforms(We,Et),zt.refreshMaterialUniforms(We,K,Yt,Gt,w.state.transmissionRenderTarget[T.id]),Nr.upload(M,_l(kt),We,B)),K.isShaderMaterial&&K.uniformsNeedUpdate===!0&&(Nr.upload(M,_l(kt),We,B),K.uniformsNeedUpdate=!1),K.isSpriteMaterial&&fe.setValue(M,"center",q.center),fe.setValue(M,"modelViewMatrix",q.modelViewMatrix),fe.setValue(M,"normalMatrix",q.normalMatrix),fe.setValue(M,"modelMatrix",q.matrixWorld),K.isShaderMaterial||K.isRawShaderMaterial){const ze=K.uniformsGroups;for(let Xe=0,ro=ze.length;Xe<ro;Xe++){const fi=ze[Xe];ft.update(fi,Qe),ft.bind(fi,Qe)}}return Qe}function ru(T,G){T.ambientLightColor.needsUpdate=G,T.lightProbe.needsUpdate=G,T.directionalLights.needsUpdate=G,T.directionalLightShadows.needsUpdate=G,T.pointLights.needsUpdate=G,T.pointLightShadows.needsUpdate=G,T.spotLights.needsUpdate=G,T.spotLightShadows.needsUpdate=G,T.rectAreaLights.needsUpdate=G,T.hemisphereLights.needsUpdate=G}function ou(T){return T.isMeshLambertMaterial||T.isMeshToonMaterial||T.isMeshPhongMaterial||T.isMeshStandardMaterial||T.isShadowMaterial||T.isShaderMaterial&&T.lights===!0}this.getActiveCubeFace=function(){return U},this.getActiveMipmapLevel=function(){return V},this.getRenderTarget=function(){return X},this.setRenderTargetTextures=function(T,G,J){const K=_.get(T);K.__autoAllocateDepthBuffer=T.resolveDepthBuffer===!1,K.__autoAllocateDepthBuffer===!1&&(K.__useRenderToTexture=!1),_.get(T.texture).__webglTexture=G,_.get(T.depthTexture).__webglTexture=K.__autoAllocateDepthBuffer?void 0:J,K.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(T,G){const J=_.get(T);J.__webglFramebuffer=G,J.__useDefaultFramebuffer=G===void 0};const au=M.createFramebuffer();this.setRenderTarget=function(T,G=0,J=0){X=T,U=G,V=J;let K=null,q=!1,Et=!1;if(T){const Tt=_.get(T);if(Tt.__useDefaultFramebuffer!==void 0){Ct.bindFramebuffer(M.FRAMEBUFFER,Tt.__webglFramebuffer),Z.copy(T.viewport),O.copy(T.scissor),z=T.scissorTest,Ct.viewport(Z),Ct.scissor(O),Ct.setScissorTest(z),Y=-1;return}else if(Tt.__webglFramebuffer===void 0)B.setupRenderTarget(T);else if(Tt.__hasExternalTextures)B.rebindTextures(T,_.get(T.texture).__webglTexture,_.get(T.depthTexture).__webglTexture);else if(T.depthBuffer){const Ht=T.depthTexture;if(Tt.__boundDepthTexture!==Ht){if(Ht!==null&&_.has(Ht)&&(T.width!==Ht.image.width||T.height!==Ht.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");B.setupDepthRenderbuffer(T)}}const Dt=T.texture;(Dt.isData3DTexture||Dt.isDataArrayTexture||Dt.isCompressedArrayTexture)&&(Et=!0);const Ot=_.get(T).__webglFramebuffer;T.isWebGLCubeRenderTarget?(Array.isArray(Ot[G])?K=Ot[G][J]:K=Ot[G],q=!0):T.samples>0&&B.useMultisampledRTT(T)===!1?K=_.get(T).__webglMultisampledFramebuffer:Array.isArray(Ot)?K=Ot[J]:K=Ot,Z.copy(T.viewport),O.copy(T.scissor),z=T.scissorTest}else Z.copy(E).multiplyScalar(Yt).floor(),O.copy(b).multiplyScalar(Yt).floor(),z=W;if(J!==0&&(K=au),Ct.bindFramebuffer(M.FRAMEBUFFER,K)&&Ct.drawBuffers(T,K),Ct.viewport(Z),Ct.scissor(O),Ct.setScissorTest(z),q){const Tt=_.get(T.texture);M.framebufferTexture2D(M.FRAMEBUFFER,M.COLOR_ATTACHMENT0,M.TEXTURE_CUBE_MAP_POSITIVE_X+G,Tt.__webglTexture,J)}else if(Et){const Tt=G;for(let Dt=0;Dt<T.textures.length;Dt++){const Ot=_.get(T.textures[Dt]);M.framebufferTextureLayer(M.FRAMEBUFFER,M.COLOR_ATTACHMENT0+Dt,Ot.__webglTexture,J,Tt)}}else if(T!==null&&J!==0){const Tt=_.get(T.texture);M.framebufferTexture2D(M.FRAMEBUFFER,M.COLOR_ATTACHMENT0,M.TEXTURE_2D,Tt.__webglTexture,J)}Y=-1},this.readRenderTargetPixels=function(T,G,J,K,q,Et,Rt,Tt=0){if(!(T&&T.isWebGLRenderTarget)){ee("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Dt=_.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&Rt!==void 0&&(Dt=Dt[Rt]),Dt){Ct.bindFramebuffer(M.FRAMEBUFFER,Dt);try{const Ot=T.textures[Tt],Ht=Ot.format,Bt=Ot.type;if(!Ut.textureFormatReadable(Ht)){ee("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Ut.textureTypeReadable(Bt)){ee("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}G>=0&&G<=T.width-K&&J>=0&&J<=T.height-q&&(T.textures.length>1&&M.readBuffer(M.COLOR_ATTACHMENT0+Tt),M.readPixels(G,J,K,q,gt.convert(Ht),gt.convert(Bt),Et))}finally{const Ot=X!==null?_.get(X).__webglFramebuffer:null;Ct.bindFramebuffer(M.FRAMEBUFFER,Ot)}}},this.readRenderTargetPixelsAsync=async function(T,G,J,K,q,Et,Rt,Tt=0){if(!(T&&T.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Dt=_.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&Rt!==void 0&&(Dt=Dt[Rt]),Dt)if(G>=0&&G<=T.width-K&&J>=0&&J<=T.height-q){Ct.bindFramebuffer(M.FRAMEBUFFER,Dt);const Ot=T.textures[Tt],Ht=Ot.format,Bt=Ot.type;if(!Ut.textureFormatReadable(Ht))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Ut.textureTypeReadable(Bt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Jt=M.createBuffer();M.bindBuffer(M.PIXEL_PACK_BUFFER,Jt),M.bufferData(M.PIXEL_PACK_BUFFER,Et.byteLength,M.STREAM_READ),T.textures.length>1&&M.readBuffer(M.COLOR_ATTACHMENT0+Tt),M.readPixels(G,J,K,q,gt.convert(Ht),gt.convert(Bt),0);const oe=X!==null?_.get(X).__webglFramebuffer:null;Ct.bindFramebuffer(M.FRAMEBUFFER,oe);const xe=M.fenceSync(M.SYNC_GPU_COMMANDS_COMPLETE,0);return M.flush(),await hd(M,xe,4),M.bindBuffer(M.PIXEL_PACK_BUFFER,Jt),M.getBufferSubData(M.PIXEL_PACK_BUFFER,0,Et),M.deleteBuffer(Jt),M.deleteSync(xe),Et}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(T,G=null,J=0){const K=Math.pow(2,-J),q=Math.floor(T.image.width*K),Et=Math.floor(T.image.height*K),Rt=G!==null?G.x:0,Tt=G!==null?G.y:0;B.setTexture2D(T,0),M.copyTexSubImage2D(M.TEXTURE_2D,J,0,0,Rt,Tt,q,Et),Ct.unbindTexture()};const lu=M.createFramebuffer(),cu=M.createFramebuffer();this.copyTextureToTexture=function(T,G,J=null,K=null,q=0,Et=null){Et===null&&(q!==0?(Os("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),Et=q,q=0):Et=0);let Rt,Tt,Dt,Ot,Ht,Bt,Jt,oe,xe;const _e=T.isCompressedTexture?T.mipmaps[Et]:T.image;if(J!==null)Rt=J.max.x-J.min.x,Tt=J.max.y-J.min.y,Dt=J.isBox3?J.max.z-J.min.z:1,Ot=J.min.x,Ht=J.min.y,Bt=J.isBox3?J.min.z:0;else{const an=Math.pow(2,-q);Rt=Math.floor(_e.width*an),Tt=Math.floor(_e.height*an),T.isDataArrayTexture?Dt=_e.depth:T.isData3DTexture?Dt=Math.floor(_e.depth*an):Dt=1,Ot=0,Ht=0,Bt=0}K!==null?(Jt=K.x,oe=K.y,xe=K.z):(Jt=0,oe=0,xe=0);const ce=gt.convert(G.format),kt=gt.convert(G.type);let ie;G.isData3DTexture?(B.setTexture3D(G,0),ie=M.TEXTURE_3D):G.isDataArrayTexture||G.isCompressedArrayTexture?(B.setTexture2DArray(G,0),ie=M.TEXTURE_2D_ARRAY):(B.setTexture2D(G,0),ie=M.TEXTURE_2D),M.pixelStorei(M.UNPACK_FLIP_Y_WEBGL,G.flipY),M.pixelStorei(M.UNPACK_PREMULTIPLY_ALPHA_WEBGL,G.premultiplyAlpha),M.pixelStorei(M.UNPACK_ALIGNMENT,G.unpackAlignment);const te=M.getParameter(M.UNPACK_ROW_LENGTH),Qe=M.getParameter(M.UNPACK_IMAGE_HEIGHT),Oi=M.getParameter(M.UNPACK_SKIP_PIXELS),tn=M.getParameter(M.UNPACK_SKIP_ROWS),gs=M.getParameter(M.UNPACK_SKIP_IMAGES);M.pixelStorei(M.UNPACK_ROW_LENGTH,_e.width),M.pixelStorei(M.UNPACK_IMAGE_HEIGHT,_e.height),M.pixelStorei(M.UNPACK_SKIP_PIXELS,Ot),M.pixelStorei(M.UNPACK_SKIP_ROWS,Ht),M.pixelStorei(M.UNPACK_SKIP_IMAGES,Bt);const fe=T.isDataArrayTexture||T.isData3DTexture,We=G.isDataArrayTexture||G.isData3DTexture;if(T.isDepthTexture){const an=_.get(T),ze=_.get(G),Xe=_.get(an.__renderTarget),ro=_.get(ze.__renderTarget);Ct.bindFramebuffer(M.READ_FRAMEBUFFER,Xe.__webglFramebuffer),Ct.bindFramebuffer(M.DRAW_FRAMEBUFFER,ro.__webglFramebuffer);for(let fi=0;fi<Dt;fi++)fe&&(M.framebufferTextureLayer(M.READ_FRAMEBUFFER,M.COLOR_ATTACHMENT0,_.get(T).__webglTexture,q,Bt+fi),M.framebufferTextureLayer(M.DRAW_FRAMEBUFFER,M.COLOR_ATTACHMENT0,_.get(G).__webglTexture,Et,xe+fi)),M.blitFramebuffer(Ot,Ht,Rt,Tt,Jt,oe,Rt,Tt,M.DEPTH_BUFFER_BIT,M.NEAREST);Ct.bindFramebuffer(M.READ_FRAMEBUFFER,null),Ct.bindFramebuffer(M.DRAW_FRAMEBUFFER,null)}else if(q!==0||T.isRenderTargetTexture||_.has(T)){const an=_.get(T),ze=_.get(G);Ct.bindFramebuffer(M.READ_FRAMEBUFFER,lu),Ct.bindFramebuffer(M.DRAW_FRAMEBUFFER,cu);for(let Xe=0;Xe<Dt;Xe++)fe?M.framebufferTextureLayer(M.READ_FRAMEBUFFER,M.COLOR_ATTACHMENT0,an.__webglTexture,q,Bt+Xe):M.framebufferTexture2D(M.READ_FRAMEBUFFER,M.COLOR_ATTACHMENT0,M.TEXTURE_2D,an.__webglTexture,q),We?M.framebufferTextureLayer(M.DRAW_FRAMEBUFFER,M.COLOR_ATTACHMENT0,ze.__webglTexture,Et,xe+Xe):M.framebufferTexture2D(M.DRAW_FRAMEBUFFER,M.COLOR_ATTACHMENT0,M.TEXTURE_2D,ze.__webglTexture,Et),q!==0?M.blitFramebuffer(Ot,Ht,Rt,Tt,Jt,oe,Rt,Tt,M.COLOR_BUFFER_BIT,M.NEAREST):We?M.copyTexSubImage3D(ie,Et,Jt,oe,xe+Xe,Ot,Ht,Rt,Tt):M.copyTexSubImage2D(ie,Et,Jt,oe,Ot,Ht,Rt,Tt);Ct.bindFramebuffer(M.READ_FRAMEBUFFER,null),Ct.bindFramebuffer(M.DRAW_FRAMEBUFFER,null)}else We?T.isDataTexture||T.isData3DTexture?M.texSubImage3D(ie,Et,Jt,oe,xe,Rt,Tt,Dt,ce,kt,_e.data):G.isCompressedArrayTexture?M.compressedTexSubImage3D(ie,Et,Jt,oe,xe,Rt,Tt,Dt,ce,_e.data):M.texSubImage3D(ie,Et,Jt,oe,xe,Rt,Tt,Dt,ce,kt,_e):T.isDataTexture?M.texSubImage2D(M.TEXTURE_2D,Et,Jt,oe,Rt,Tt,ce,kt,_e.data):T.isCompressedTexture?M.compressedTexSubImage2D(M.TEXTURE_2D,Et,Jt,oe,_e.width,_e.height,ce,_e.data):M.texSubImage2D(M.TEXTURE_2D,Et,Jt,oe,Rt,Tt,ce,kt,_e);M.pixelStorei(M.UNPACK_ROW_LENGTH,te),M.pixelStorei(M.UNPACK_IMAGE_HEIGHT,Qe),M.pixelStorei(M.UNPACK_SKIP_PIXELS,Oi),M.pixelStorei(M.UNPACK_SKIP_ROWS,tn),M.pixelStorei(M.UNPACK_SKIP_IMAGES,gs),Et===0&&G.generateMipmaps&&M.generateMipmap(ie),Ct.unbindTexture()},this.initRenderTarget=function(T){_.get(T).__webglFramebuffer===void 0&&B.setupRenderTarget(T)},this.initTexture=function(T){T.isCubeTexture?B.setTextureCube(T,0):T.isData3DTexture?B.setTexture3D(T,0):T.isDataArrayTexture||T.isCompressedArrayTexture?B.setTexture2DArray(T,0):B.setTexture2D(T,0),Ct.unbindTexture()},this.resetState=function(){U=0,V=0,X=null,Ct.reset(),Pt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return bn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorSpace=Qt._getDrawingBufferColorSpace(t),e.unpackColorSpace=Qt._getUnpackColorSpace()}}const Oc={type:"change"},cl={type:"start"},Bh={type:"end"},Ar=new el,Bc=new ti,Xx=Math.cos(70*Cd.DEG2RAD),Ae=new N,Ye=2*Math.PI,ae={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Go=1e-6;class Yx extends $f{constructor(t,e=null){super(t,e),this.state=ae.NONE,this.target=new N,this.cursor=new N,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:es.ROTATE,MIDDLE:es.DOLLY,RIGHT:es.PAN},this.touches={ONE:ts.ROTATE,TWO:ts.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new N,this._lastQuaternion=new Di,this._lastTargetPosition=new N,this._quat=new Di().setFromUnitVectors(t.up,new N(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new uc,this._sphericalDelta=new uc,this._scale=1,this._panOffset=new N,this._rotateStart=new ct,this._rotateEnd=new ct,this._rotateDelta=new ct,this._panStart=new ct,this._panEnd=new ct,this._panDelta=new ct,this._dollyStart=new ct,this._dollyEnd=new ct,this._dollyDelta=new ct,this._dollyDirection=new N,this._mouse=new ct,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=$x.bind(this),this._onPointerDown=qx.bind(this),this._onPointerUp=Zx.bind(this),this._onContextMenu=n_.bind(this),this._onMouseWheel=Jx.bind(this),this._onKeyDown=Qx.bind(this),this._onTouchStart=t_.bind(this),this._onTouchMove=e_.bind(this),this._onMouseDown=jx.bind(this),this._onMouseMove=Kx.bind(this),this._interceptControlDown=i_.bind(this),this._interceptControlUp=s_.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Oc),this.update(),this.state=ae.NONE}update(t=null){const e=this.object.position;Ae.copy(e).sub(this.target),Ae.applyQuaternion(this._quat),this._spherical.setFromVector3(Ae),this.autoRotate&&this.state===ae.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=Ye:n>Math.PI&&(n-=Ye),s<-Math.PI?s+=Ye:s>Math.PI&&(s-=Ye),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=o!=this._spherical.radius}if(Ae.setFromSpherical(this._spherical),Ae.applyQuaternion(this._quatInverse),e.copy(this.target).add(Ae),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){const a=Ae.length();o=this._clampDistance(a*this._scale);const l=a-o;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){const a=new N(this._mouse.x,this._mouse.y,0);a.unproject(this.object);const l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;const c=new N(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(a),this.object.updateMatrixWorld(),o=Ae.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(Ar.origin.copy(this.object.position),Ar.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Ar.direction))<Xx?this.object.lookAt(this.target):(Bc.setFromNormalAndCoplanarPoint(this.object.up,this.target),Ar.intersectPlane(Bc,this.target))))}else if(this.object.isOrthographicCamera){const o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>Go||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Go||this._lastTargetPosition.distanceToSquared(this.target)>Go?(this.dispatchEvent(Oc),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?Ye/60*this.autoRotateSpeed*t:Ye/60/60*this.autoRotateSpeed}_getZoomScale(t){const e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){Ae.setFromMatrixColumn(e,0),Ae.multiplyScalar(-t),this._panOffset.add(Ae)}_panUp(t,e){this.screenSpacePanning===!0?Ae.setFromMatrixColumn(e,1):(Ae.setFromMatrixColumn(e,0),Ae.crossVectors(this.object.up,Ae)),Ae.multiplyScalar(t),this._panOffset.add(Ae)}_pan(t,e){const n=this.domElement;if(this.object.isPerspectiveCamera){const s=this.object.position;Ae.copy(s).sub(this.target);let r=Ae.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*r/n.clientHeight,this.object.matrix),this._panUp(2*e*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const n=this.domElement.getBoundingClientRect(),s=t-n.left,r=e-n.top,o=n.width,a=n.height;this._mouse.x=s/o*2-1,this._mouse.y=-(r/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(Ye*this._rotateDelta.x/e.clientHeight),this._rotateUp(Ye*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(Ye*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-Ye*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(Ye*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-Ye*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panStart.set(n,s)}}_handleTouchStartDolly(t){const e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{const n=this._getSecondPointerPosition(t),s=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(Ye*this._rotateDelta.x/e.clientHeight),this._rotateUp(Ye*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){const e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const o=(t.pageX+e.x)*.5,a=(t.pageY+e.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new ct,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){const e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){const e=t.deltaMode,n={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}}function qx(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i)))}function $x(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function Zx(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Bh),this.state=ae.NONE;break;case 1:const t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function jx(i){let t;switch(i.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case es.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=ae.DOLLY;break;case es.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=ae.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=ae.ROTATE}break;case es.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=ae.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=ae.PAN}break;default:this.state=ae.NONE}this.state!==ae.NONE&&this.dispatchEvent(cl)}function Kx(i){switch(this.state){case ae.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case ae.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case ae.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function Jx(i){this.enabled===!1||this.enableZoom===!1||this.state!==ae.NONE||(i.preventDefault(),this.dispatchEvent(cl),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Bh))}function Qx(i){this.enabled!==!1&&this._handleKeyDown(i)}function t_(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case ts.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=ae.TOUCH_ROTATE;break;case ts.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=ae.TOUCH_PAN;break;default:this.state=ae.NONE}break;case 2:switch(this.touches.TWO){case ts.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=ae.TOUCH_DOLLY_PAN;break;case ts.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=ae.TOUCH_DOLLY_ROTATE;break;default:this.state=ae.NONE}break;default:this.state=ae.NONE}this.state!==ae.NONE&&this.dispatchEvent(cl)}function e_(i){switch(this._trackPointer(i),this.state){case ae.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case ae.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case ae.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case ae.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=ae.NONE}}function n_(i){this.enabled!==!1&&i.preventDefault()}function i_(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function s_(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}const r_=sn;class Gr extends ol{constructor(t){super(t),this.defaultDPI=90,this.defaultUnit="px"}load(t,e,n,s){const r=this,o=new Bf(r.manager);o.setPath(r.path),o.setRequestHeader(r.requestHeader),o.setWithCredentials(r.withCredentials),o.load(t,function(a){try{e(r.parse(a))}catch(l){s?s(l):console.error(l),r.manager.itemError(t)}},n,s)}parse(t){const e=this;function n($,F){if($.nodeType!==1)return;const E=S($);let b=!1,W=null;switch($.nodeName){case"svg":F=g($,F);break;case"style":r($);break;case"g":F=g($,F);break;case"path":F=g($,F),$.hasAttribute("d")&&(W=s($));break;case"rect":F=g($,F),W=l($);break;case"polygon":F=g($,F),W=c($);break;case"polyline":F=g($,F),W=h($);break;case"circle":F=g($,F),W=u($);break;case"ellipse":F=g($,F),W=d($);break;case"line":F=g($,F),W=p($);break;case"defs":b=!0;break;case"use":F=g($,F);const lt=($.getAttributeNS("http://www.w3.org/1999/xlink","href")||"").substring(1),vt=$.viewportElement.getElementById(lt);vt?n(vt,F):console.warn("SVGLoader: 'use node' references non-existent node id: "+lt);break}W&&(F.fill!==void 0&&F.fill!=="none"&&W.color.setStyle(F.fill,r_),R(W,_t),V.push(W),W.userData={node:$,style:F});const nt=$.childNodes;for(let H=0;H<nt.length;H++){const lt=nt[H];b&&lt.nodeName!=="style"&&lt.nodeName!=="defs"||n(lt,F)}E&&(Y.pop(),Y.length>0?_t.copy(Y[Y.length-1]):_t.identity())}function s($){const F=new _i,E=new ct,b=new ct,W=new ct;let nt=!0,H=!1;const lt=$.getAttribute("d");if(lt===""||lt==="none")return null;const vt=lt.match(/[a-df-z][^a-df-z]*/ig);for(let ut=0,tt=vt.length;ut<tt;ut++){const st=vt[ut],ht=st.charAt(0),bt=st.slice(1).trim();nt===!0&&(H=!0,nt=!1);let M;switch(ht){case"M":M=m(bt);for(let D=0,mt=M.length;D<mt;D+=2)E.x=M[D+0],E.y=M[D+1],b.x=E.x,b.y=E.y,D===0?F.moveTo(E.x,E.y):F.lineTo(E.x,E.y),D===0&&W.copy(E);break;case"H":M=m(bt);for(let D=0,mt=M.length;D<mt;D++)E.x=M[D],b.x=E.x,b.y=E.y,F.lineTo(E.x,E.y),D===0&&H===!0&&W.copy(E);break;case"V":M=m(bt);for(let D=0,mt=M.length;D<mt;D++)E.y=M[D],b.x=E.x,b.y=E.y,F.lineTo(E.x,E.y),D===0&&H===!0&&W.copy(E);break;case"L":M=m(bt);for(let D=0,mt=M.length;D<mt;D+=2)E.x=M[D+0],E.y=M[D+1],b.x=E.x,b.y=E.y,F.lineTo(E.x,E.y),D===0&&H===!0&&W.copy(E);break;case"C":M=m(bt);for(let D=0,mt=M.length;D<mt;D+=6)F.bezierCurveTo(M[D+0],M[D+1],M[D+2],M[D+3],M[D+4],M[D+5]),b.x=M[D+2],b.y=M[D+3],E.x=M[D+4],E.y=M[D+5],D===0&&H===!0&&W.copy(E);break;case"S":M=m(bt);for(let D=0,mt=M.length;D<mt;D+=4)F.bezierCurveTo(x(E.x,b.x),x(E.y,b.y),M[D+0],M[D+1],M[D+2],M[D+3]),b.x=M[D+0],b.y=M[D+1],E.x=M[D+2],E.y=M[D+3],D===0&&H===!0&&W.copy(E);break;case"Q":M=m(bt);for(let D=0,mt=M.length;D<mt;D+=4)F.quadraticCurveTo(M[D+0],M[D+1],M[D+2],M[D+3]),b.x=M[D+0],b.y=M[D+1],E.x=M[D+2],E.y=M[D+3],D===0&&H===!0&&W.copy(E);break;case"T":M=m(bt);for(let D=0,mt=M.length;D<mt;D+=2){const Ut=x(E.x,b.x),Ct=x(E.y,b.y);F.quadraticCurveTo(Ut,Ct,M[D+0],M[D+1]),b.x=Ut,b.y=Ct,E.x=M[D+0],E.y=M[D+1],D===0&&H===!0&&W.copy(E)}break;case"A":M=m(bt,[3,4],7);for(let D=0,mt=M.length;D<mt;D+=7){if(M[D+5]==E.x&&M[D+6]==E.y)continue;const Ut=E.clone();E.x=M[D+5],E.y=M[D+6],b.x=E.x,b.y=E.y,o(F,M[D],M[D+1],M[D+2],M[D+3],M[D+4],Ut,E),D===0&&H===!0&&W.copy(E)}break;case"m":M=m(bt);for(let D=0,mt=M.length;D<mt;D+=2)E.x+=M[D+0],E.y+=M[D+1],b.x=E.x,b.y=E.y,D===0?F.moveTo(E.x,E.y):F.lineTo(E.x,E.y),D===0&&W.copy(E);break;case"h":M=m(bt);for(let D=0,mt=M.length;D<mt;D++)E.x+=M[D],b.x=E.x,b.y=E.y,F.lineTo(E.x,E.y),D===0&&H===!0&&W.copy(E);break;case"v":M=m(bt);for(let D=0,mt=M.length;D<mt;D++)E.y+=M[D],b.x=E.x,b.y=E.y,F.lineTo(E.x,E.y),D===0&&H===!0&&W.copy(E);break;case"l":M=m(bt);for(let D=0,mt=M.length;D<mt;D+=2)E.x+=M[D+0],E.y+=M[D+1],b.x=E.x,b.y=E.y,F.lineTo(E.x,E.y),D===0&&H===!0&&W.copy(E);break;case"c":M=m(bt);for(let D=0,mt=M.length;D<mt;D+=6)F.bezierCurveTo(E.x+M[D+0],E.y+M[D+1],E.x+M[D+2],E.y+M[D+3],E.x+M[D+4],E.y+M[D+5]),b.x=E.x+M[D+2],b.y=E.y+M[D+3],E.x+=M[D+4],E.y+=M[D+5],D===0&&H===!0&&W.copy(E);break;case"s":M=m(bt);for(let D=0,mt=M.length;D<mt;D+=4)F.bezierCurveTo(x(E.x,b.x),x(E.y,b.y),E.x+M[D+0],E.y+M[D+1],E.x+M[D+2],E.y+M[D+3]),b.x=E.x+M[D+0],b.y=E.y+M[D+1],E.x+=M[D+2],E.y+=M[D+3],D===0&&H===!0&&W.copy(E);break;case"q":M=m(bt);for(let D=0,mt=M.length;D<mt;D+=4)F.quadraticCurveTo(E.x+M[D+0],E.y+M[D+1],E.x+M[D+2],E.y+M[D+3]),b.x=E.x+M[D+0],b.y=E.y+M[D+1],E.x+=M[D+2],E.y+=M[D+3],D===0&&H===!0&&W.copy(E);break;case"t":M=m(bt);for(let D=0,mt=M.length;D<mt;D+=2){const Ut=x(E.x,b.x),Ct=x(E.y,b.y);F.quadraticCurveTo(Ut,Ct,E.x+M[D+0],E.y+M[D+1]),b.x=Ut,b.y=Ct,E.x=E.x+M[D+0],E.y=E.y+M[D+1],D===0&&H===!0&&W.copy(E)}break;case"a":M=m(bt,[3,4],7);for(let D=0,mt=M.length;D<mt;D+=7){if(M[D+5]==0&&M[D+6]==0)continue;const Ut=E.clone();E.x+=M[D+5],E.y+=M[D+6],b.x=E.x,b.y=E.y,o(F,M[D],M[D+1],M[D+2],M[D+3],M[D+4],Ut,E),D===0&&H===!0&&W.copy(E)}break;case"Z":case"z":F.currentPath.autoClose=!0,F.currentPath.curves.length>0&&(E.copy(W),F.currentPath.currentPoint.copy(E),nt=!0);break;default:console.warn(st)}H=!1}return F}function r($){if(!(!$.sheet||!$.sheet.cssRules||!$.sheet.cssRules.length))for(let F=0;F<$.sheet.cssRules.length;F++){const E=$.sheet.cssRules[F];if(E.type!==1)continue;const b=E.selectorText.split(/,/gm).filter(Boolean).map(W=>W.trim());for(let W=0;W<b.length;W++){const nt=Object.fromEntries(Object.entries(E.style).filter(([,H])=>H!==""));X[b[W]]=Object.assign(X[b[W]]||{},nt)}}}function o($,F,E,b,W,nt,H,lt){if(F==0||E==0){$.lineTo(lt.x,lt.y);return}b=b*Math.PI/180,F=Math.abs(F),E=Math.abs(E);const vt=(H.x-lt.x)/2,ut=(H.y-lt.y)/2,tt=Math.cos(b)*vt+Math.sin(b)*ut,st=-Math.sin(b)*vt+Math.cos(b)*ut;let ht=F*F,bt=E*E;const M=tt*tt,D=st*st,mt=M/ht+D/bt;if(mt>1){const xt=Math.sqrt(mt);F=xt*F,E=xt*E,ht=F*F,bt=E*E}const Ut=ht*D+bt*M,Ct=(ht*bt-Ut)/Ut;let L=Math.sqrt(Math.max(0,Ct));W===nt&&(L=-L);const _=L*F*st/E,B=-L*E*tt/F,et=Math.cos(b)*_-Math.sin(b)*B+(H.x+lt.x)/2,rt=Math.sin(b)*_+Math.cos(b)*B+(H.y+lt.y)/2,Q=a(1,0,(tt-_)/F,(st-B)/E),It=a((tt-_)/F,(st-B)/E,(-tt-_)/F,(-st-B)/E)%(Math.PI*2);$.currentPath.absellipse(et,rt,F,E,Q,Q+It,nt===0,b)}function a($,F,E,b){const W=$*E+F*b,nt=Math.sqrt($*$+F*F)*Math.sqrt(E*E+b*b);let H=Math.acos(Math.max(-1,Math.min(1,W/nt)));return $*b-F*E<0&&(H=-H),H}function l($){const F=v($.getAttribute("x")||0),E=v($.getAttribute("y")||0),b=v($.getAttribute("rx")||$.getAttribute("ry")||0),W=v($.getAttribute("ry")||$.getAttribute("rx")||0),nt=v($.getAttribute("width")),H=v($.getAttribute("height")),lt=1-.551915024494,vt=new _i;return vt.moveTo(F+b,E),vt.lineTo(F+nt-b,E),(b!==0||W!==0)&&vt.bezierCurveTo(F+nt-b*lt,E,F+nt,E+W*lt,F+nt,E+W),vt.lineTo(F+nt,E+H-W),(b!==0||W!==0)&&vt.bezierCurveTo(F+nt,E+H-W*lt,F+nt-b*lt,E+H,F+nt-b,E+H),vt.lineTo(F+b,E+H),(b!==0||W!==0)&&vt.bezierCurveTo(F+b*lt,E+H,F,E+H-W*lt,F,E+H-W),vt.lineTo(F,E+W),(b!==0||W!==0)&&vt.bezierCurveTo(F,E+W*lt,F+b*lt,E,F+b,E),vt}function c($){function F(nt,H,lt){const vt=v(H),ut=v(lt);W===0?b.moveTo(vt,ut):b.lineTo(vt,ut),W++}const E=/([+-]?\d*\.?\d+(?:e[+-]?\d+)?)(?:,|\s)([+-]?\d*\.?\d+(?:e[+-]?\d+)?)/g,b=new _i;let W=0;return $.getAttribute("points").replace(E,F),b.currentPath.autoClose=!0,b}function h($){function F(nt,H,lt){const vt=v(H),ut=v(lt);W===0?b.moveTo(vt,ut):b.lineTo(vt,ut),W++}const E=/([+-]?\d*\.?\d+(?:e[+-]?\d+)?)(?:,|\s)([+-]?\d*\.?\d+(?:e[+-]?\d+)?)/g,b=new _i;let W=0;return $.getAttribute("points").replace(E,F),b.currentPath.autoClose=!1,b}function u($){const F=v($.getAttribute("cx")||0),E=v($.getAttribute("cy")||0),b=v($.getAttribute("r")||0),W=new ss;W.absarc(F,E,b,0,Math.PI*2);const nt=new _i;return nt.subPaths.push(W),nt}function d($){const F=v($.getAttribute("cx")||0),E=v($.getAttribute("cy")||0),b=v($.getAttribute("rx")||0),W=v($.getAttribute("ry")||0),nt=new ss;nt.absellipse(F,E,b,W,0,Math.PI*2);const H=new _i;return H.subPaths.push(nt),H}function p($){const F=v($.getAttribute("x1")||0),E=v($.getAttribute("y1")||0),b=v($.getAttribute("x2")||0),W=v($.getAttribute("y2")||0),nt=new _i;return nt.moveTo(F,E),nt.lineTo(b,W),nt.currentPath.autoClose=!1,nt}function g($,F){F=Object.assign({},F);let E={};if($.hasAttribute("class")){const H=$.getAttribute("class").split(/\s/).filter(Boolean).map(lt=>lt.trim());for(let lt=0;lt<H.length;lt++)E=Object.assign(E,X["."+H[lt]])}$.hasAttribute("id")&&(E=Object.assign(E,X["#"+$.getAttribute("id")]));function b(H,lt,vt){vt===void 0&&(vt=function(tt){return tt.startsWith("url")&&console.warn("SVGLoader: url access in attributes is not implemented."),tt}),$.hasAttribute(H)&&(F[lt]=vt($.getAttribute(H))),E[lt]&&(F[lt]=vt(E[lt])),$.style&&$.style[H]!==""&&(F[lt]=vt($.style[H]))}function W(H){return Math.max(0,Math.min(1,v(H)))}function nt(H){return Math.max(0,v(H))}return b("fill","fill"),b("fill-opacity","fillOpacity",W),b("fill-rule","fillRule"),b("opacity","opacity",W),b("stroke","stroke"),b("stroke-opacity","strokeOpacity",W),b("stroke-width","strokeWidth",nt),b("stroke-linejoin","strokeLineJoin"),b("stroke-linecap","strokeLineCap"),b("stroke-miterlimit","strokeMiterLimit",nt),b("visibility","visibility"),F}function x($,F){return $-(F-$)}function m($,F,E){if(typeof $!="string")throw new TypeError("Invalid input: "+typeof $);const b={SEPARATOR:/[ \t\r\n\,.\-+]/,WHITESPACE:/[ \t\r\n]/,DIGIT:/[\d]/,SIGN:/[-+]/,POINT:/\./,COMMA:/,/,EXP:/e/i,FLAGS:/[01]/},W=0,nt=1,H=2,lt=3;let vt=W,ut=!0,tt="",st="";const ht=[];function bt(Ut,Ct,L){const _=new SyntaxError('Unexpected character "'+Ut+'" at index '+Ct+".");throw _.partial=L,_}function M(){tt!==""&&(st===""?ht.push(Number(tt)):ht.push(Number(tt)*Math.pow(10,Number(st)))),tt="",st=""}let D;const mt=$.length;for(let Ut=0;Ut<mt;Ut++){if(D=$[Ut],Array.isArray(F)&&F.includes(ht.length%E)&&b.FLAGS.test(D)){vt=nt,tt=D,M();continue}if(vt===W){if(b.WHITESPACE.test(D))continue;if(b.DIGIT.test(D)||b.SIGN.test(D)){vt=nt,tt=D;continue}if(b.POINT.test(D)){vt=H,tt=D;continue}b.COMMA.test(D)&&(ut&&bt(D,Ut,ht),ut=!0)}if(vt===nt){if(b.DIGIT.test(D)){tt+=D;continue}if(b.POINT.test(D)){tt+=D,vt=H;continue}if(b.EXP.test(D)){vt=lt;continue}b.SIGN.test(D)&&tt.length===1&&b.SIGN.test(tt[0])&&bt(D,Ut,ht)}if(vt===H){if(b.DIGIT.test(D)){tt+=D;continue}if(b.EXP.test(D)){vt=lt;continue}b.POINT.test(D)&&tt[tt.length-1]==="."&&bt(D,Ut,ht)}if(vt===lt){if(b.DIGIT.test(D)){st+=D;continue}if(b.SIGN.test(D)){if(st===""){st+=D;continue}st.length===1&&b.SIGN.test(st)&&bt(D,Ut,ht)}}b.WHITESPACE.test(D)?(M(),vt=W,ut=!1):b.COMMA.test(D)?(M(),vt=W,ut=!0):b.SIGN.test(D)?(M(),vt=nt,tt=D):b.POINT.test(D)?(M(),vt=H,tt=D):bt(D,Ut,ht)}return M(),ht}const f=["mm","cm","in","pt","pc","px"],A={mm:{mm:1,cm:.1,in:1/25.4,pt:72/25.4,pc:6/25.4,px:-1},cm:{mm:10,cm:1,in:1/2.54,pt:72/2.54,pc:6/2.54,px:-1},in:{mm:25.4,cm:2.54,in:1,pt:72,pc:6,px:-1},pt:{mm:25.4/72,cm:2.54/72,in:1/72,pt:1,pc:6/72,px:-1},pc:{mm:25.4/6,cm:2.54/6,in:1/6,pt:72/6,pc:1,px:-1},px:{px:1}};function v($){let F="px";if(typeof $=="string"||$ instanceof String)for(let b=0,W=f.length;b<W;b++){const nt=f[b];if($.endsWith(nt)){F=nt,$=$.substring(0,$.length-nt.length);break}}let E;return F==="px"&&e.defaultUnit!=="px"?E=A.in[e.defaultUnit]/e.defaultDPI:(E=A[F][e.defaultUnit],E<0&&(E=A[F].in*e.defaultDPI)),E*parseFloat($)}function S($){if(!($.hasAttribute("transform")||$.nodeName==="use"&&($.hasAttribute("x")||$.hasAttribute("y"))))return null;const F=w($);return Y.length>0&&F.premultiply(Y[Y.length-1]),_t.copy(F),Y.push(F),F}function w($){const F=new Xt,E=j;if($.nodeName==="use"&&($.hasAttribute("x")||$.hasAttribute("y"))){const b=v($.getAttribute("x")||0),W=v($.getAttribute("y")||0);F.translate(b,W)}if($.hasAttribute("transform")){const b=$.getAttribute("transform").split(")");for(let W=b.length-1;W>=0;W--){const nt=b[W].trim();if(nt==="")continue;const H=nt.indexOf("("),lt=nt.length;if(H>0&&H<lt){const vt=nt.slice(0,H),ut=m(nt.slice(H+1));switch(E.identity(),vt){case"translate":if(ut.length>=1){const tt=ut[0];let st=0;ut.length>=2&&(st=ut[1]),E.translate(tt,st)}break;case"rotate":if(ut.length>=1){let tt=0,st=0,ht=0;tt=ut[0]*Math.PI/180,ut.length>=3&&(st=ut[1],ht=ut[2]),Z.makeTranslation(-st,-ht),O.makeRotation(tt),z.multiplyMatrices(O,Z),Z.makeTranslation(st,ht),E.multiplyMatrices(Z,z)}break;case"scale":if(ut.length>=1){const tt=ut[0];let st=tt;ut.length>=2&&(st=ut[1]),E.scale(tt,st)}break;case"skewX":ut.length===1&&E.set(1,Math.tan(ut[0]*Math.PI/180),0,0,1,0,0,0,1);break;case"skewY":ut.length===1&&E.set(1,0,0,Math.tan(ut[0]*Math.PI/180),1,0,0,0,1);break;case"matrix":ut.length===6&&E.set(ut[0],ut[2],ut[4],ut[1],ut[3],ut[5],0,0,1);break}}F.premultiply(E)}}return F}function R($,F){function E(H){at.set(H.x,H.y,1).applyMatrix3(F),H.set(at.x,at.y)}function b(H){const lt=H.xRadius,vt=H.yRadius,ut=Math.cos(H.aRotation),tt=Math.sin(H.aRotation),st=new N(lt*ut,lt*tt,0),ht=new N(-vt*tt,vt*ut,0),bt=st.applyMatrix3(F),M=ht.applyMatrix3(F),D=j.set(bt.x,M.x,0,bt.y,M.y,0,0,0,1),mt=Z.copy(D).invert(),L=O.copy(mt).transpose().multiply(mt).elements,_=U(L[0],L[1],L[4]),B=Math.sqrt(_.rt1),et=Math.sqrt(_.rt2);if(H.xRadius=1/B,H.yRadius=1/et,H.aRotation=Math.atan2(_.sn,_.cs),!((H.aEndAngle-H.aStartAngle)%(2*Math.PI)<Number.EPSILON)){const Q=Z.set(B,0,0,0,et,0,0,0,1),It=O.set(_.cs,_.sn,0,-_.sn,_.cs,0,0,0,1),xt=Q.multiply(It).multiply(D),Lt=zt=>{const{x:dt,y:yt}=new N(Math.cos(zt),Math.sin(zt),0).applyMatrix3(xt);return Math.atan2(yt,dt)};H.aStartAngle=Lt(H.aStartAngle),H.aEndAngle=Lt(H.aEndAngle),P(F)&&(H.aClockwise=!H.aClockwise)}}function W(H){const lt=y(F),vt=C(F);H.xRadius*=lt,H.yRadius*=vt;const ut=lt>Number.EPSILON?Math.atan2(F.elements[1],F.elements[0]):Math.atan2(-F.elements[3],F.elements[4]);H.aRotation+=ut,P(F)&&(H.aStartAngle*=-1,H.aEndAngle*=-1,H.aClockwise=!H.aClockwise)}const nt=$.subPaths;for(let H=0,lt=nt.length;H<lt;H++){const ut=nt[H].curves;for(let tt=0;tt<ut.length;tt++){const st=ut[tt];st.isLineCurve?(E(st.v1),E(st.v2)):st.isCubicBezierCurve?(E(st.v0),E(st.v1),E(st.v2),E(st.v3)):st.isQuadraticBezierCurve?(E(st.v0),E(st.v1),E(st.v2)):st.isEllipseCurve&&(pt.set(st.aX,st.aY),E(pt),st.aX=pt.x,st.aY=pt.y,I(F)?b(st):W(st))}}}function P($){const F=$.elements;return F[0]*F[4]-F[1]*F[3]<0}function I($){const F=$.elements,E=F[0]*F[3]+F[1]*F[4];if(E===0)return!1;const b=y($),W=C($);return Math.abs(E/(b*W))>Number.EPSILON}function y($){const F=$.elements;return Math.sqrt(F[0]*F[0]+F[1]*F[1])}function C($){const F=$.elements;return Math.sqrt(F[3]*F[3]+F[4]*F[4])}function U($,F,E){let b,W,nt,H,lt;const vt=$+E,ut=$-E,tt=Math.sqrt(ut*ut+4*F*F);return vt>0?(b=.5*(vt+tt),lt=1/b,W=$*lt*E-F*lt*F):vt<0?W=.5*(vt-tt):(b=.5*tt,W=-.5*tt),ut>0?nt=ut+tt:nt=ut-tt,Math.abs(nt)>2*Math.abs(F)?(lt=-2*F/nt,H=1/Math.sqrt(1+lt*lt),nt=lt*H):Math.abs(F)===0?(nt=1,H=0):(lt=-.5*nt/F,nt=1/Math.sqrt(1+lt*lt),H=lt*nt),ut>0&&(lt=nt,nt=-H,H=lt),{rt1:b,rt2:W,cs:nt,sn:H}}const V=[],X={},Y=[],j=new Xt,Z=new Xt,O=new Xt,z=new Xt,pt=new ct,at=new N,_t=new Xt,Gt=new DOMParser().parseFromString(t,"image/svg+xml");return n(Gt.documentElement,{fill:"#000",fillOpacity:1,strokeOpacity:1,strokeWidth:1,strokeLineJoin:"miter",strokeLineCap:"butt",strokeMiterLimit:4}),{paths:V,xml:Gt.documentElement}}static createShapes(t){const n={ORIGIN:0,DESTINATION:1,BETWEEN:2,LEFT:3,RIGHT:4,BEHIND:5,BEYOND:6},s={loc:n.ORIGIN,t:0};function r(x,m,f,A){const v=x.x,S=m.x,w=f.x,R=A.x,P=x.y,I=m.y,y=f.y,C=A.y,U=(R-w)*(P-y)-(C-y)*(v-w),V=(S-v)*(P-y)-(I-P)*(v-w),X=(C-y)*(S-v)-(R-w)*(I-P),Y=U/X,j=V/X;if(X===0&&U!==0||Y<=0||Y>=1||j<0||j>1)return null;if(U===0&&X===0){for(let Z=0;Z<2;Z++)if(o(Z===0?f:A,x,m),s.loc==n.ORIGIN){const O=Z===0?f:A;return{x:O.x,y:O.y,t:s.t}}else if(s.loc==n.BETWEEN){const O=+(v+s.t*(S-v)).toPrecision(10),z=+(P+s.t*(I-P)).toPrecision(10);return{x:O,y:z,t:s.t}}return null}else{for(let z=0;z<2;z++)if(o(z===0?f:A,x,m),s.loc==n.ORIGIN){const pt=z===0?f:A;return{x:pt.x,y:pt.y,t:s.t}}const Z=+(v+Y*(S-v)).toPrecision(10),O=+(P+Y*(I-P)).toPrecision(10);return{x:Z,y:O,t:Y}}}function o(x,m,f){const A=f.x-m.x,v=f.y-m.y,S=x.x-m.x,w=x.y-m.y,R=A*w-S*v;if(x.x===m.x&&x.y===m.y){s.loc=n.ORIGIN,s.t=0;return}if(x.x===f.x&&x.y===f.y){s.loc=n.DESTINATION,s.t=1;return}if(R<-Number.EPSILON){s.loc=n.LEFT;return}if(R>Number.EPSILON){s.loc=n.RIGHT;return}if(A*S<0||v*w<0){s.loc=n.BEHIND;return}if(Math.sqrt(A*A+v*v)<Math.sqrt(S*S+w*w)){s.loc=n.BEYOND;return}let P;A!==0?P=S/A:P=w/v,s.loc=n.BETWEEN,s.t=P}function a(x,m){const f=[],A=[];for(let v=1;v<x.length;v++){const S=x[v-1],w=x[v];for(let R=1;R<m.length;R++){const P=m[R-1],I=m[R],y=r(S,w,P,I);y!==null&&f.find(C=>C.t<=y.t+Number.EPSILON&&C.t>=y.t-Number.EPSILON)===void 0&&(f.push(y),A.push(new ct(y.x,y.y)))}}return A}function l(x,m,f){const A=new ct;m.getCenter(A);const v=[];return f.forEach(S=>{S.boundingBox.containsPoint(A)&&a(x,S.points).forEach(R=>{v.push({identifier:S.identifier,isCW:S.isCW,point:R})})}),v.sort((S,w)=>S.point.x-w.point.x),v}function c(x,m,f,A,v){(v==null||v==="")&&(v="nonzero");const S=new ct;x.boundingBox.getCenter(S);const w=[new ct(f,S.y),new ct(A,S.y)],R=l(w,x.boundingBox,m);R.sort((V,X)=>V.point.x-X.point.x);const P=[],I=[];R.forEach(V=>{V.identifier===x.identifier?P.push(V):I.push(V)});const y=P[0].point.x,C=[];let U=0;for(;U<I.length&&I[U].point.x<y;)C.length>0&&C[C.length-1]===I[U].identifier?C.pop():C.push(I[U].identifier),U++;if(C.push(x.identifier),v==="evenodd"){const V=C.length%2===0,X=C[C.length-2];return{identifier:x.identifier,isHole:V,for:X}}else if(v==="nonzero"){let V=!0,X=null,Y=null;for(let j=0;j<C.length;j++){const Z=C[j];V?(Y=m[Z].isCW,V=!1,X=Z):Y!==m[Z].isCW&&(Y=m[Z].isCW,V=!0)}return{identifier:x.identifier,isHole:V,for:X}}else console.warn('fill-rule: "'+v+'" is currently not implemented.')}let h=999999999,u=-999999999,d=t.subPaths.map(x=>{const m=x.getPoints();let f=-999999999,A=999999999,v=-999999999,S=999999999;for(let w=0;w<m.length;w++){const R=m[w];R.y>f&&(f=R.y),R.y<A&&(A=R.y),R.x>v&&(v=R.x),R.x<S&&(S=R.x)}return u<=v&&(u=v+1),h>=S&&(h=S-1),{curves:x.curves,points:m,isCW:Ri.isClockWise(m),identifier:-1,boundingBox:new Xf(new ct(S,A),new ct(v,f))}});d=d.filter(x=>x.points.length>1);for(let x=0;x<d.length;x++)d[x].identifier=x;const p=d.map(x=>c(x,d,h,u,t.userData?t.userData.style.fillRule:void 0)),g=[];return d.forEach(x=>{if(!p[x.identifier].isHole){const f=new Pi;f.curves=x.curves,p.filter(v=>v.isHole&&v.for===x.identifier).forEach(v=>{const S=d[v.identifier],w=new ss;w.curves=S.curves,f.holes.push(w)}),g.push(f)}}),g}static getStrokeStyle(t,e,n,s,r){return t=t!==void 0?t:1,e=e!==void 0?e:"#000",n=n!==void 0?n:"miter",s=s!==void 0?s:"butt",r=r!==void 0?r:4,{strokeColor:e,strokeWidth:t,strokeLineJoin:n,strokeLineCap:s,strokeMiterLimit:r}}static pointsToStroke(t,e,n,s){const r=[],o=[],a=[];if(Gr.pointsToStrokeWithBuffers(t,e,n,s,r,o,a)===0)return null;const l=new Oe;return l.setAttribute("position",new Se(r,3)),l.setAttribute("normal",new Se(o,3)),l.setAttribute("uv",new Se(a,2)),l}static pointsToStrokeWithBuffers(t,e,n,s,r,o,a,l){const c=new ct,h=new ct,u=new ct,d=new ct,p=new ct,g=new ct,x=new ct,m=new ct,f=new ct,A=new ct,v=new ct,S=new ct,w=new ct,R=new ct,P=new ct,I=new ct,y=new ct;n=n!==void 0?n:12,s=s!==void 0?s:.001,l=l!==void 0?l:0,t=ut(t);const C=t.length;if(C<2)return 0;const U=t[0].equals(t[C-1]);let V,X=t[0],Y;const j=e.strokeWidth/2,Z=1/(C-1);let O=0,z,pt,at,_t,Gt=!1,Yt=0,$=l*3,F=l*2;E(t[0],t[1],c).multiplyScalar(j),m.copy(t[0]).sub(c),f.copy(t[0]).add(c),A.copy(m),v.copy(f);for(let tt=1;tt<C;tt++){V=t[tt],tt===C-1?U?Y=t[1]:Y=void 0:Y=t[tt+1];const st=c;if(E(X,V,st),u.copy(st).multiplyScalar(j),S.copy(V).sub(u),w.copy(V).add(u),z=O+Z,pt=!1,Y!==void 0){E(V,Y,h),u.copy(h).multiplyScalar(j),R.copy(V).sub(u),P.copy(V).add(u),at=!0,u.subVectors(Y,X),st.dot(u)<0&&(at=!1),tt===1&&(Gt=at),u.subVectors(Y,V),u.normalize();const ht=Math.abs(st.dot(u));if(ht>Number.EPSILON){const bt=j/ht;u.multiplyScalar(-bt),d.subVectors(V,X),p.copy(d).setLength(bt).add(u),I.copy(p).negate();const M=p.length(),D=d.length();d.divideScalar(D),g.subVectors(Y,V);const mt=g.length();switch(g.divideScalar(mt),d.dot(I)<D&&g.dot(I)<mt&&(pt=!0),y.copy(p).add(V),I.add(V),_t=!1,pt?at?(P.copy(I),w.copy(I)):(R.copy(I),S.copy(I)):nt(),e.strokeLineJoin){case"bevel":H(at,pt,z);break;case"round":lt(at,pt),at?W(V,S,R,z,0):W(V,P,w,z,1);break;case"miter":case"miter-clip":default:const Ut=j*e.strokeMiterLimit/M;if(Ut<1)if(e.strokeLineJoin!=="miter-clip"){H(at,pt,z);break}else lt(at,pt),at?(g.subVectors(y,S).multiplyScalar(Ut).add(S),x.subVectors(y,R).multiplyScalar(Ut).add(R),b(S,z,0),b(g,z,0),b(V,z,.5),b(V,z,.5),b(g,z,0),b(x,z,0),b(V,z,.5),b(x,z,0),b(R,z,0)):(g.subVectors(y,w).multiplyScalar(Ut).add(w),x.subVectors(y,P).multiplyScalar(Ut).add(P),b(w,z,1),b(g,z,1),b(V,z,.5),b(V,z,.5),b(g,z,1),b(x,z,1),b(V,z,.5),b(x,z,1),b(P,z,1));else pt?(at?(b(f,O,1),b(m,O,0),b(y,z,0),b(f,O,1),b(y,z,0),b(I,z,1)):(b(f,O,1),b(m,O,0),b(y,z,1),b(m,O,0),b(I,z,0),b(y,z,1)),at?R.copy(y):P.copy(y)):at?(b(S,z,0),b(y,z,0),b(V,z,.5),b(V,z,.5),b(y,z,0),b(R,z,0)):(b(w,z,1),b(y,z,1),b(V,z,.5),b(V,z,.5),b(y,z,1),b(P,z,1)),_t=!0;break}}else nt()}else nt();!U&&tt===C-1&&vt(t[0],A,v,at,!0,O),O=z,X=V,m.copy(R),f.copy(P)}if(!U)vt(V,S,w,at,!1,z);else if(pt&&r){let tt=y,st=I;Gt!==at&&(tt=I,st=y),at?(_t||Gt)&&(st.toArray(r,0*3),st.toArray(r,3*3),_t&&tt.toArray(r,1*3)):(_t||!Gt)&&(st.toArray(r,1*3),st.toArray(r,3*3),_t&&tt.toArray(r,0*3))}return Yt;function E(tt,st,ht){return ht.subVectors(st,tt),ht.set(-ht.y,ht.x).normalize()}function b(tt,st,ht){r&&(r[$]=tt.x,r[$+1]=tt.y,r[$+2]=0,o&&(o[$]=0,o[$+1]=0,o[$+2]=1),$+=3,a&&(a[F]=st,a[F+1]=ht,F+=2)),Yt+=3}function W(tt,st,ht,bt,M){c.copy(st).sub(tt).normalize(),h.copy(ht).sub(tt).normalize();let D=Math.PI;const mt=c.dot(h);Math.abs(mt)<1&&(D=Math.abs(Math.acos(mt))),D/=n,u.copy(st);for(let Ut=0,Ct=n-1;Ut<Ct;Ut++)d.copy(u).rotateAround(tt,D),b(u,bt,M),b(d,bt,M),b(tt,bt,.5),u.copy(d);b(d,bt,M),b(ht,bt,M),b(tt,bt,.5)}function nt(){b(f,O,1),b(m,O,0),b(S,z,0),b(f,O,1),b(S,z,0),b(w,z,1)}function H(tt,st,ht){st?tt?(b(f,O,1),b(m,O,0),b(S,z,0),b(f,O,1),b(S,z,0),b(I,z,1),b(S,ht,0),b(R,ht,0),b(I,ht,.5)):(b(f,O,1),b(m,O,0),b(w,z,1),b(m,O,0),b(I,z,0),b(w,z,1),b(w,ht,1),b(I,ht,0),b(P,ht,1)):tt?(b(S,ht,0),b(R,ht,0),b(V,ht,.5)):(b(w,ht,1),b(P,ht,0),b(V,ht,.5))}function lt(tt,st){st&&(tt?(b(f,O,1),b(m,O,0),b(S,z,0),b(f,O,1),b(S,z,0),b(I,z,1),b(S,O,0),b(V,z,.5),b(I,z,1),b(V,z,.5),b(R,O,0),b(I,z,1)):(b(f,O,1),b(m,O,0),b(w,z,1),b(m,O,0),b(I,z,0),b(w,z,1),b(w,O,1),b(I,z,0),b(V,z,.5),b(V,z,.5),b(I,z,0),b(P,O,1)))}function vt(tt,st,ht,bt,M,D){switch(e.strokeLineCap){case"round":M?W(tt,ht,st,D,.5):W(tt,st,ht,D,.5);break;case"square":if(M)c.subVectors(st,tt),h.set(c.y,-c.x),u.addVectors(c,h).add(tt),d.subVectors(h,c).add(tt),bt?(u.toArray(r,1*3),d.toArray(r,0*3),d.toArray(r,3*3)):(u.toArray(r,1*3),a[3*2+1]===1?d.toArray(r,3*3):u.toArray(r,3*3),d.toArray(r,0*3));else{c.subVectors(ht,tt),h.set(c.y,-c.x),u.addVectors(c,h).add(tt),d.subVectors(h,c).add(tt);const mt=r.length;bt?(u.toArray(r,mt-1*3),d.toArray(r,mt-2*3),d.toArray(r,mt-4*3)):(d.toArray(r,mt-2*3),u.toArray(r,mt-1*3),d.toArray(r,mt-4*3))}break}}function ut(tt){let st=!1;for(let bt=1,M=tt.length-1;bt<M;bt++)if(tt[bt].distanceTo(tt[bt+1])<s){st=!0;break}if(!st)return tt;const ht=[];ht.push(tt[0]);for(let bt=1,M=tt.length-1;bt<M;bt++)tt[bt].distanceTo(tt[bt+1])>=s&&ht.push(tt[bt]);return ht.push(tt[tt.length-1]),ht}}}class o_ extends qs{constructor(){super(),this.scene=null,this.camera=null,this.renderer=null,this.controls=null,this.container=null,this.animationFrameId=null,this.panelMesh=null,this.bitPathMeshes=[],this.lights={},this.wireframeMode=!1,this.cameraFitted=!1,this.bitPathMeshes=[],this.panelMesh=null,this.partMesh=null}async init(){if(console.log("ThreeModule: Initializing..."),this.container=document.getElementById("three-canvas-container"),!this.container){console.error("ThreeModule: Container not found");return}this.scene=new Kd,this.scene.background=new jt(16119285);const t=this.container.clientWidth/this.container.clientHeight;this.camera=new cn(45,t,.1,1e4),this.camera.position.set(0,400,600),this.camera.lookAt(0,0,0),this.renderer=new Wx({antialias:!0}),this.renderer.setSize(this.container.clientWidth,this.container.clientHeight),this.renderer.setPixelRatio(window.devicePixelRatio),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Yc,this.container.appendChild(this.renderer.domElement),this.controls=new Yx(this.camera,this.renderer.domElement),this.controls.enableDamping=!0,this.controls.dampingFactor=.05,this.controls.screenSpacePanning=!1,this.controls.minDistance=100,this.controls.maxDistance=2e3,this.controls.maxPolarAngle=Math.PI/2,this.setupLighting(),this.addGridHelper();const e=new qf(200);this.scene.add(e),window.addEventListener("resize",this.onWindowResize.bind(this)),this.addWireframeToggle(),this.animate(),console.log("ThreeModule: Initialized successfully")}setupLighting(){this.lights.ambient=new Hf(16777215,.6),this.scene.add(this.lights.ambient),this.lights.directional=new Gf(16777215,.8),this.lights.directional.position.set(200,400,300),this.lights.directional.castShadow=!0,this.lights.directional.shadow.camera.near=.1,this.lights.directional.shadow.camera.far=1500,this.lights.directional.shadow.camera.left=-500,this.lights.directional.shadow.camera.right=500,this.lights.directional.shadow.camera.top=500,this.lights.directional.shadow.camera.bottom=-500,this.lights.directional.shadow.mapSize.width=2048,this.lights.directional.shadow.mapSize.height=2048,this.scene.add(this.lights.directional),this.lights.hemisphere=new kf(16777215,4473924,.4),this.lights.hemisphere.position.set(0,200,0),this.scene.add(this.lights.hemisphere)}addGridHelper(){const n=new Yf(1e3,50,8947848,13421772);n.position.y=0,this.scene.add(n)}addWireframeToggle(){const t=document.createElement("button");t.textContent="Wireframe",t.style.position="absolute",t.style.top="10px",t.style.right="10px",t.style.padding="8px 16px",t.style.backgroundColor="rgba(255, 255, 255, 0.9)",t.style.border="1px solid #ccc",t.style.borderRadius="4px",t.style.cursor="pointer",t.style.zIndex="100",t.style.fontSize="12px",t.style.fontWeight="500",t.addEventListener("click",()=>{this.toggleWireframe()}),this.container.appendChild(t),this.wireframeToggleBtn=t}toggleWireframe(){this.wireframeMode=!this.wireframeMode,this.scene.traverse(t=>{t.isMesh&&t.material&&(Array.isArray(t.material)?t.material.forEach(e=>{e.wireframe=this.wireframeMode}):t.material.wireframe=this.wireframeMode)}),this.wireframeToggleBtn&&(this.wireframeToggleBtn.style.backgroundColor=this.wireframeMode?"rgba(0, 191, 255, 0.9)":"rgba(255, 255, 255, 0.9)")}async updatePanel(t,e,n,s=[],r="top-left"){console.log("ThreeModule: Updating panel",{width:t,height:e,thickness:n,bits:s.length}),this.panelMesh&&(this.scene.remove(this.panelMesh),this.panelMesh.geometry.dispose(),this.panelMesh.material.dispose(),this.panelMesh=null),this.partMesh&&(this.scene.remove(this.partMesh),this.partMesh.geometry.dispose(),this.partMesh.material.dispose(),this.partMesh=null),this.bitPathMeshes.forEach(l=>{this.scene.remove(l),l.geometry.dispose(),l.material.dispose()}),this.bitPathMeshes=[];const o=new Ii(t,e,n),a=new ac({color:14596231,roughness:.8,metalness:.1,wireframe:this.wireframeMode});this.panelMesh=new xn(o,a),this.panelMesh.castShadow=!0,this.panelMesh.receiveShadow=!0,this.panelMesh.position.set(0,e/2,0),s&&s.length>0&&await this.createBitPathExtrusions(s,t,e,n,r),this.fitCameraToPanel(t,e,n),this.scene.add(this.panelMesh),window.bitsVisible&&this.bitPathMeshes.forEach(l=>this.scene.add(l)),window.showPart&&this.bitPathMeshes.length>0&&this.applyCSGOperation(!0)}async createBitPathExtrusions(t,e,n,s,r){console.log("ThreeModule: Creating bit path extrusions",t.length);const o=window.offsetContours||[],a=document.getElementById("part-front");if(!a){console.error("partFront element not found!");return}const l=parseFloat(a.getAttribute("x")),c=parseFloat(a.getAttribute("y")),h=parseFloat(a.getAttribute("width")),u=parseFloat(a.getAttribute("height"));console.log("partFront info:",{x:l,y:c,width:h,height:u});for(const[d,p]of t.entries()){console.log(`Processing bit ${d}:`,{x:p.x,y:p.y,operation:p.operation,name:p.name});const g=o.filter(P=>P.bitIndex===d);if(g.length===0){console.log(`No contours found for bit ${d}`);continue}const x=g.find(P=>P.pass!==0);if(!x||!x.element){console.log(`No valid contour element for bit ${d}`);continue}const f=x.element.getAttribute("d");if(!f){console.log(`No path data for bit ${d}`);continue}console.log(`Path data for bit ${d}:`,f.substring(0,100)+"...");const A=this.parsePathToCurves(f);if(A.length===0){console.log(`No curves found for bit ${d}:`,f);continue}console.log(`Parsed ${A.length} curves for bit ${d}`);const v=this.createCurveFromCurves(A,l,c,h,u,p.y,s,r),S=this.createPathVisualization(v,p.color);S&&(this.scene.add(S),this.bitPathMeshes.push(S),console.log(`Added path visualization for bit ${d}`));const w=await this.createBitProfile(p.bitData),R=this.extrudeAlongPath(w,v,p.color);R?(this.bitPathMeshes.push(R),console.log(`Created extrude mesh for bit ${d}`)):console.log(`Failed to create extrude mesh for bit ${d}`)}}parsePathToCurves(t){const e=[],n=t.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);let s=0,r=0,o=0,a=0;return n==null||n.forEach(l=>{const c=l[0].toUpperCase(),h=l.slice(1).trim().split(/[\s,]+/).map(Number).filter(u=>!isNaN(u));switch(c){case"M":h.length>=2&&(s=h[0],r=h[1],o=s,a=r);break;case"L":if(h.length>=2){const u=h[0],d=h[1];e.push(new Qn(new N(s,r,0),new N(u,d,0))),s=u,r=d}break;case"H":if(h.length>=1){const u=h[0];e.push(new Qn(new N(s,r,0),new N(u,r,0))),s=u}break;case"V":if(h.length>=1){const u=h[0];e.push(new Qn(new N(s,r,0),new N(s,u,0))),r=u}break;case"C":if(h.length>=6){const u=h[0],d=h[1],p=h[2],g=h[3],x=h[4],m=h[5];e.push(new Dr(new N(s,r,0),new N(u,d,0),new N(p,g,0),new N(x,m,0))),s=x,r=m}break;case"Q":if(h.length>=4){const u=h[0],d=h[1],p=h[2],g=h[3];e.push(new Ir(new N(s,r,0),new N(u,d,0),new N(p,g,0))),s=p,r=g}break;case"A":if(h.length>=7){const u=h[5],d=h[6];e.push(new Qn(new N(s,r,0),new N(u,d,0))),s=u,r=d}break;case"Z":e.length>0&&e.push(new Qn(new N(s,r,0),new N(o,a,0))),s=o,r=a;break}}),e}createCurveFromCurves(t,e,n,s,r,o,a,l){console.log("Creating curve from curves:",{curvesCount:t.length,firstCurve:t[0],depth:o,panelThickness:a,panelAnchor:l});const c=t.map(u=>{if(u instanceof Qn){const d=this.convertPoint2DTo3D(u.v1.x,u.v1.y,e,n,s,r,o,a,l),p=this.convertPoint2DTo3D(u.v2.x,u.v2.y,e,n,s,r,o,a,l);return new Qn(d,p)}else if(u instanceof Dr){const d=this.convertPoint2DTo3D(u.v0.x,u.v0.y,e,n,s,r,o,a,l),p=this.convertPoint2DTo3D(u.v1.x,u.v1.y,e,n,s,r,o,a,l),g=this.convertPoint2DTo3D(u.v2.x,u.v2.y,e,n,s,r,o,a,l),x=this.convertPoint2DTo3D(u.v3.x,u.v3.y,e,n,s,r,o,a,l);return new Dr(d,p,g,x)}else if(u instanceof Ir){const d=this.convertPoint2DTo3D(u.v0.x,u.v0.y,e,n,s,r,o,a,l),p=this.convertPoint2DTo3D(u.v1.x,u.v1.y,e,n,s,r,o,a,l),g=this.convertPoint2DTo3D(u.v2.x,u.v2.y,e,n,s,r,o,a,l);return new Ir(d,p,g)}return null}).filter(u=>u!==null);console.log("Sample 3D curves:",{first:c[0],middle:c[Math.floor(c.length/2)],last:c[c.length-1]});const h=new wh;return c.forEach(u=>{h.add(u)}),h}convertPoint2DTo3D(t,e,n,s,r,o,a,l,c){const h=t-n-r/2;let d=s+o-e;c==="bottom-left"&&(d=e-s);let p;return c==="top-left"?p=a-l/2:c==="bottom-left"?p=a+l/2:p=-a,new N(h,d,p)}createPathVisualization(t,e){try{const n=t.getPoints(200),s=new Oe().setFromPoints(n),r=new Zr({color:new jt(e||"#ff0000"),linewidth:3,opacity:.8,transparent:!0}),o=new Sh(s,r);return console.log("Created path visualization with",n.length,"points"),o}catch(n){return console.error("Error creating path visualization:",n),null}}async createBitProfile(t){if(t.profilePath)try{const e=`<svg xmlns="http://www.w3.org/2000/svg"><path d="${t.profilePath}"/></svg>`,n="data:image/svg+xml;base64,"+btoa(e),s=new Gr;return new Promise((r,o)=>{s.load(n,a=>{const l=Gr.createShapes(a.paths[0]);if(l.length>0){let c=l[0];r(c)}else r(this.createFallbackShape(t))},void 0,a=>{console.error("Error loading SVG:",a),r(this.createFallbackShape(t))})})}catch(e){return console.error("Error parsing SVG profile:",e),this.createFallbackShape(t)}return this.createFallbackShape(t)}createFallbackShape(t){const n=(t.diameter||10)/2,s=new Pi,r=32;for(let o=0;o<=r;o++){const a=o/r*Math.PI*2,l=Math.cos(a)*n,c=Math.sin(a)*n;o===0?s.moveTo(l,c):s.lineTo(l,c)}return s}rotateShape(t,e){const s=t.getPoints(200).map(o=>{const a=o.x,c=o.y,h=-a;return new ct(c,h)}),r=new Pi;return r.setFromPoints(s),r}extrudeAlongPath(t,e,n){try{const s=Math.max(50,Math.floor(e.getLength()/5));let o=e.getPoints(s).map(p=>new N(p.x,p.y,p.z));const a=o[0],l=o[o.length-1],c=a.distanceTo(l)<.01;c&&o.length>1&&(o=o.slice(0,-1)),console.log("Extruding with mitered corners:",{profilePoints:t.getPoints().length,contourPoints:o.length,contourClosed:c,curveLength:e.getLength()});const h=this.ProfiledContourGeometry(t,o,c),u=new ac({color:new jt(n||"#cccccc"),roughness:.5,metalness:.2,side:Sn,wireframe:this.wireframeMode}),d=new xn(h,u);return d.castShadow=!0,d.receiveShadow=!0,d}catch(s){return console.error("Error extruding along path:",s),null}}ProfiledContourGeometry(t,e,n){try{n=n!==void 0?n:!0;let s=new rl(t);s.rotateX(-Math.PI*.5);let r=s.attributes.position,o=new Float32Array(r.count*e.length*3);for(let h=0;h<e.length;h++){let u=new ct().subVectors(e[h-1<0?e.length-1:h-1],e[h]),d=new ct().subVectors(e[h+1==e.length?0:h+1],e[h]),x=(d.angle()-u.angle())*.5,m=d.angle()+Math.PI*.5;n||((h==0||h==e.length-1)&&(x=Math.PI*.5),h==e.length-1&&(m=u.angle()-Math.PI*.5));let f=Math.tan(x-Math.PI*.5),A=new ue().set(1,0,0,0,-f,1,0,0,0,0,1,0,0,0,0,1),v=m,S=new ue().set(Math.cos(v),-Math.sin(v),0,0,Math.sin(v),Math.cos(v),0,0,0,0,1,0,0,0,0,1),w=new ue().set(1,0,0,e[h].x,0,1,0,e[h].y,0,0,1,e[h].z,0,0,0,1),R=r.clone();R.applyMatrix4(A),R.applyMatrix4(S),R.applyMatrix4(w),o.set(R.array,R.count*h*3)}let a=new Oe;a.setAttribute("position",new gn(o,3));let l=[],c=n==!1?e.length-1:e.length;for(let h=0;h<c;h++)for(let u=0;u<r.count;u++){let d=h,p=h+1==e.length?0:h+1,g=u,x=u+1==r.count?0:u+1,m=x+r.count*d,f=g+r.count*d,A=g+r.count*p,v=x+r.count*p;l.push(m,f,v),l.push(f,A,v)}return a.setIndex(l),a.computeVertexNormals(),a}catch(s){return console.error("Error in ProfiledContourGeometry:",s),new Ii(1,1,1)}}toggleBitMeshesVisibility(t){this.bitPathMeshes.forEach(e=>{e.visible=t})}toggleBitMeshesVisibility(t){this.bitPathMeshes.forEach(e=>{e.visible=t})}applyCSGOperation(t){if(this.panelMesh)try{t?(this.bitPathMeshes.forEach(e=>{e.visible=!1}),console.log("Part view: bit meshes hidden (CSG simulation)")):(this.bitPathMeshes.forEach(e=>{e.visible=window.bitsVisible!==!1}),console.log("Normal view: bit meshes shown"))}catch(e){console.error("Error in applyCSGOperation:",e),this.bitPathMeshes.forEach(n=>{n.visible=window.bitsVisible!==!1})}}fitCameraToPanel(t,e,n){if(this.cameraFitted)return;const r=Math.max(t,e,n)*2;this.camera.position.set(r*.8,r*.6,-r),this.camera.lookAt(0,e/2,n/2),this.controls.target.set(0,e/2,n/2),this.controls.update(),this.cameraFitted=!0}onWindowResize(){if(!this.container||!this.camera||!this.renderer)return;const t=this.container.clientWidth,e=this.container.clientHeight;this.camera.aspect=t/e,this.camera.updateProjectionMatrix(),this.renderer.setSize(t,e)}animate(){this.animationFrameId=requestAnimationFrame(this.animate.bind(this)),this.controls&&this.controls.update(),this.renderer&&this.scene&&this.camera&&this.renderer.render(this.scene,this.camera)}setVisible(t){this.container&&(this.container.style.display=t?"flex":"none")}cleanup(){this.animationFrameId&&cancelAnimationFrame(this.animationFrameId),this.renderer&&this.renderer.dispose(),this.controls&&this.controls.dispose(),this.panelMesh&&(this.panelMesh.geometry.dispose(),this.panelMesh.material.dispose()),this.bitPathMeshes.forEach(t=>{t.geometry.dispose(),t.material.dispose()}),this.scene&&this.scene.traverse(t=>{t.geometry&&t.geometry.dispose(),t.material&&(Array.isArray(t.material)?t.material.forEach(e=>e.dispose()):t.material.dispose())}),console.log("ThreeModule: Cleaned up")}}je.registerModule(i=>new Pu,"canvas");je.registerModule(i=>new Ru,"bits");je.registerModule(i=>new Su,"export");je.registerModule(i=>new Lu,"ui");je.registerModule(i=>new o_,"three");const pe="http://www.w3.org/2000/svg",Ue=document.getElementById("canvas"),Cs=document.getElementById("panel-width"),ws=document.getElementById("panel-height"),Ps=document.getElementById("panel-thickness");let Ze,qe,Me=400,Hs=600,me=19,hn="top-left",ye=!1,$e,ri=!0,zn=!0,it,Te,bi=1,Hr=!1,kh=0,zh=0,Vh=0,Gh=0,Wr=!1,Ce=null,le=[],ci=!1,Ws=!1,us=null,Xr=!1,Hh=0,Wh=0,Xh=0,Yh=0,Ga=!1,Ur=null,Tr=50,a_=50;function l_(){if(Ze=document.createElementNS(pe,"rect"),qe=document.createElementNS(pe,"rect"),!it){const l={width:800,height:600},c=(l.width-Me)/2,h=(l.height-me)/2,u=js(),d=c+u.x+bi/2,p=h+u.y+bi/2;it=new Wc({canvas:Ue,enableZoom:!0,enablePan:!1,enableGrid:!0,enableMouseEvents:!0,gridSize:bi,gridAnchorX:d,gridAnchorY:p,initialZoom:1,layers:["grid","panel","offsets","bits","phantoms","overlay"],onZoom:(g,x,m)=>{eo(g)}}),window.mainCanvasManager=it}const i=it.getLayer("panel");ai=it.getLayer("bits"),it.getLayer("phantoms"),i.appendChild(Ze),Ze.id="panel-section",qe.id="part-front",i.appendChild(qe),$e=document.createElementNS(pe,"path"),$e.id="part-path",$e.setAttribute("fill","rgba(71, 64, 64, 0.16)"),$e.setAttribute("stroke","black"),$e.setAttribute("stroke-width",Tn()),$e.style.display="none",i.appendChild($e);const t=document.createElementNS(pe,"g");t.id="panel-anchor-indicator",i.appendChild(t),Qr(),document.getElementById("zoom-in-btn").addEventListener("click",()=>it.zoomIn()),document.getElementById("zoom-out-btn").addEventListener("click",()=>it.zoomOut()),document.getElementById("fit-scale-btn").addEventListener("click",jh),document.getElementById("zoom-selected-btn").addEventListener("click",M_),document.getElementById("toggle-grid-btn").addEventListener("click",()=>it.toggleGrid()),document.getElementById("grid-scale").addEventListener("blur",l=>{const c=he(l.target.value);l.target.value=c,bi=parseFloat(c)||1,it.config.gridSize=bi,hl(),it.gridEnabled&&it.drawGrid()});const e=document.getElementById("panel-anchor-btn");e.appendChild(Zh(hn)),e.addEventListener("click",h_),document.getElementById("part-btn").addEventListener("click",I_);const n=document.getElementById("bits-btn");n.addEventListener("click",L_),n.classList.add("bits-visible");const s=document.getElementById("shank-btn");s.addEventListener("click",D_),s.classList.add("shank-visible"),document.getElementById("export-dxf-btn").addEventListener("click",N_),document.getElementById("save-btn").addEventListener("click",U_),document.getElementById("save-as-btn").addEventListener("click",F_),document.getElementById("load-btn").addEventListener("click",O_),document.getElementById("clear-btn").addEventListener("click",B_),Ue.addEventListener("mousedown",E_),Ue.addEventListener("mousemove",A_),Ue.addEventListener("mouseup",T_),Ue.addEventListener("touchstart",C_,{passive:!1}),Ue.addEventListener("touchmove",w_,{passive:!1}),Ue.addEventListener("touchend",P_,{passive:!1}),Te=new Yo(it),Te.onDrawBitShape=(l,c)=>m_(l,c,Te.createBitShapeElement.bind(Te)),Te.onUpdateCanvasBits=l=>p_(l),Te.onUpdateCanvasBitWithParams=(l,c,h)=>r(l,c,h);function r(l,c,h){Wt.forEach((u,d)=>{if(u.bitData.id===l){u.bitData={...u.bitData,...c},c.name&&c.name!==u.name&&(u.name=c.name);const p=u.group.querySelector("g");if(p){const g=le.includes(d),x=Te.createBitShapeElement(u.bitData,h,u.baseAbsX,u.baseAbsY,g);if(g){const m=x.querySelector(".bit-shape"),f=x.querySelector(".shank-shape"),A=Math.max(.1,.5/Math.sqrt(it.zoomLevel));m&&(m.setAttribute("stroke","#00BFFF"),m.setAttribute("stroke-width",A)),f&&(f.setAttribute("stroke","#00BFFF"),f.setAttribute("stroke-width",A),f.style.display=zn?"block":"none")}u.group.replaceChild(x,p)}}}),Je(),Be(),on(),ye&&ke(),window.threeModule&&Rn()}document.getElementById("export-bits-btn").addEventListener("click",()=>{Sl(()=>Promise.resolve().then(()=>bl),void 0).then(l=>{l.exportToJSON()})}),document.getElementById("import-bits-btn").addEventListener("click",()=>{const l=document.createElement("input");l.type="file",l.accept=".json",l.onchange=c=>{const h=c.target.files[0];if(h){const u=new FileReader;u.onload=d=>{const p=d.target.result;Sl(()=>Promise.resolve().then(()=>bl),void 0).then(g=>{g.importFromJSON(p)?(Te.refreshBitGroups(),Wt=[],Je(),Yn()):alert("Failed to import bits data. Please check the JSON format.")})},u.readAsText(h)}},l.click()});const o=je.getModule("ui");document.getElementById("toggle-left-panel").addEventListener("click",()=>o.toggleLeftPanel()),document.getElementById("toggle-right-menu").addEventListener("click",()=>o.toggleRightMenu()),document.getElementById("theme-toggle").addEventListener("click",()=>{je.getModule("ui").toggleTheme()})}function c_(){const i=it.canvasParameters.width,t=it.canvasParameters.height;it.canvasParameters.width=Ue.getBoundingClientRect().width,it.canvasParameters.height=Ue.getBoundingClientRect().height,it.panX=it.panX/i*it.canvasParameters.width,it.panY=it.panY/t*it.canvasParameters.height,it.updateViewBox()}function h_(){hn=hn==="top-left"?"bottom-left":"top-left";const i=document.getElementById("panel-anchor-btn");i.innerHTML="",i.appendChild(Zh(hn)),u_(),hl(),qh()}function u_(){const i=(it.canvasParameters.width-Me)/2,t=(it.canvasParameters.height-me)/2,e=hn==="top-left"?"bottom-left":"top-left",n=i,s=e==="top-left"?t:t+me,r=i,o=hn==="top-left"?t:t+me;Wt.forEach(a=>{const l=n+a.x,c=s+a.y,h=l-r,u=c-o;a.x=h,a.y=u,Je();const d=r+h,p=o+u,g=d-a.baseAbsX,x=p-a.baseAbsY;a.group.setAttribute("transform",`translate(${g}, ${x})`)}),Be(),on(),ye&&ke()}function d_(){const i=(it.canvasParameters.width-Me)/2,t=(it.canvasParameters.height-me)/2,n=i+{x:0,y:0}.x,s=t;qe.setAttribute("x",n),qe.setAttribute("y",s-Hs-100),qe.setAttribute("width",Me),qe.setAttribute("height",Hs),qe.setAttribute("fill","rgba(155, 155, 155, 0.16)"),qe.setAttribute("stroke","black"),qe.setAttribute("stroke-width",Tn())}function Qr(){Ze.setAttribute("x",(it.canvasParameters.width-Me)/2),Ze.setAttribute("y",(it.canvasParameters.height-me)/2),Ze.setAttribute("width",Me),Ze.setAttribute("height",me),Ze.setAttribute("fill","rgba(155, 155, 155, 0.16)"),Ze.setAttribute("stroke","black"),d_(),qh()}function qh(){const i=document.getElementById("panel-anchor-indicator");i.innerHTML="";const t=(it.canvasParameters.width-Me)/2,e=(it.canvasParameters.height-me)/2;let n,s;hn==="top-left"?(n=t,s=e):hn==="bottom-left"&&(n=t,s=e+me);const r=5,o=Math.max(.1,.5/Math.sqrt(it.zoomLevel)),a=document.createElementNS(pe,"line");a.setAttribute("x1",n-r),a.setAttribute("y1",s),a.setAttribute("x2",n+r),a.setAttribute("y2",s),a.setAttribute("stroke","red"),a.setAttribute("stroke-width",o),i.appendChild(a);const l=document.createElementNS(pe,"line");l.setAttribute("x1",n),l.setAttribute("y1",s-r),l.setAttribute("x2",n),l.setAttribute("y2",s+r),l.setAttribute("stroke","red"),l.setAttribute("stroke-width",o),i.appendChild(l)}function hl(){const i=(it.canvasParameters.width-Me)/2,t=(it.canvasParameters.height-me)/2,e=js(),n=i+e.x+bi/2,s=t+e.y+bi/2;it&&(it.config.gridAnchorX=n,it.config.gridAnchorY=s,it.gridEnabled&&it.drawGrid())}function ei(){Me=parseInt(Cs.value)||Me,Hs=parseInt(ws.value)||Hs,me=parseInt(Ps.value)||me,Qr(),ul(),Te.assignProfilePathsToBits(Wt),hl(),Be(),on(),ye&&ke(),window.threeModule&&Rn()}function ul(){const i=(it.canvasParameters.width-Me)/2,t=(it.canvasParameters.height-me)/2,e=js(),n=i+e.x,s=t+e.y;Wt.forEach(r=>{const o=n+(r.x||0),a=s+(r.y||0),l=o-r.baseAbsX,c=a-r.baseAbsY;r.group&&r.group.setAttribute("transform",`translate(${l}, ${c})`)}),Yn(),ye&&ke()}let Wt=[],Xs=0,oi=null,ai,ii=[];window.offsetContours=ii;function $h(i){const t=js();return{x:i.x+t.x,y:i.y+t.y}}function on(){const i=it.getLayer("phantoms");i.innerHTML="";const t=(it.canvasParameters.width-Me)/2,e=(it.canvasParameters.height-me)/2,n={x:0,y:0},s=t+n.x,r=e+n.y;Wt.forEach((o,a)=>{if(o.operation==="VC"){const l=$h(o),c=o.bitData.angle||90,h=l.y,d=(o.bitData.diameter||10)/2*(1/Math.tan(Fr(c)/2)),p=d<h?Math.ceil(h/d):1,g=[];for(let x=0;x<p;x++)g.push(h*(x+1)/p);if(p>1){const x=g.map(m=>{const f=m*Math.tan(Fr(c/2));return l.x-f});x.reverse(),x.forEach((m,f)=>{if(f===p-1)return;const A={...o.bitData,fillColor:"rgba(128, 128, 128, 0.1)"},v=s+x[f+1],S=r+g[f],w=Te.createBitShapeElement(A,o.groupName,v,S,!1,!1);w.setAttribute("stroke","gray"),w.setAttribute("stroke-width",Tn(it.zoomLevel)),w.setAttribute("fill","rgba(128, 128, 128, 0.1)"),w.classList.add("phantom-bit"),i.appendChild(w)})}}})}function Be(){const i=it.getLayer("offsets");i.innerHTML="",ii=[],window.offsetContours=ii,(it.canvasParameters.width-Me)/2,(it.canvasParameters.height-me)/2;const t=new bu,e=t.rectToPoints(qe);Wt.forEach((n,s)=>{if(n.operation==="VC"){const r=$h(n),o=n.bitData.angle||90,a=r.y,c=(n.bitData.diameter||10)/2*(1/Math.tan(Fr(o)/2)),h=c<a?Math.ceil(a/c):1,u=[];for(let g=0;g<h;g++)u.push(a*(g+1)/h);const d=u.map(g=>{const x=g*Math.tan(Fr(o/2));return r.x-x});if(d.reverse(),e&&e.length>0){const g=t.calculateOffset(e,r.x);if(g&&g.length>0){const x=g.map((f,A)=>A===0?`M ${f.x} ${f.y}`:`L ${f.x} ${f.y}`).join(" ")+" Z",m=document.createElementNS(pe,"path");m.setAttribute("d",x),m.setAttribute("fill","none"),m.setAttribute("stroke","black"),m.setAttribute("stroke-width",Tn()),m.setAttribute("stroke-dasharray","5,5"),m.classList.add("offset-contour"),i.appendChild(m),ii.push({element:m,bitIndex:s,offsetDistance:r.x,operation:"VC",pass:0})}}const p=t.calculateOffset(e,d[0]);if(p&&p.length>0){const g=p.map((m,f)=>f===0?`M ${m.x} ${m.y}`:`L ${m.x} ${m.y}`).join(" ")+" Z",x=document.createElementNS(pe,"path");x.setAttribute("d",g),x.setAttribute("fill","none"),x.setAttribute("stroke",n.color||"#cccccc"),x.setAttribute("stroke-width",Tn()),x.setAttribute("stroke-dasharray","5,5"),x.classList.add("offset-contour"),i.appendChild(x),ii.push({element:x,bitIndex:s,offsetDistance:d[0],operation:"VC",pass:1,depth:r.y})}}else{let r=n.x;n.operation==="OU"?r=n.x+(n.bitData.diameter||0)/2:n.operation==="IN"&&(r=n.x-(n.bitData.diameter||0)/2);const o=t.calculateOffset(e,r);if(o&&o.length>0){const a=o.map((c,h)=>h===0?`M ${c.x} ${c.y}`:`L ${c.x} ${c.y}`).join(" ")+" Z",l=document.createElementNS(pe,"path");l.setAttribute("d",a),l.setAttribute("fill","none"),l.setAttribute("stroke",n.color||"#cccccc"),l.setAttribute("stroke-width",Tn()),l.setAttribute("stroke-dasharray","5,5"),l.classList.add("offset-contour"),i.appendChild(l),ii.push({element:l,bitIndex:s,offsetDistance:r})}}})}const Ho=["center","left","right"];function f_(i){const t=document.createElementNS(pe,"svg");t.setAttribute("width","20"),t.setAttribute("height","20"),t.setAttribute("viewBox","0 0 20 20"),t.style.cursor="pointer";const e=document.createElementNS(pe,"rect");if(e.setAttribute("width","20"),e.setAttribute("height","20"),e.setAttribute("fill","white"),e.setAttribute("stroke","black"),e.setAttribute("stroke-width","1"),t.appendChild(e),i==="center"){const n=document.createElementNS(pe,"line");n.setAttribute("x1","10"),n.setAttribute("y1","3"),n.setAttribute("x2","10"),n.setAttribute("y2","17"),n.setAttribute("stroke","black"),n.setAttribute("stroke-width","1"),n.setAttribute("stroke-dasharray","2,2"),t.appendChild(n);const s=document.createElementNS(pe,"rect");s.setAttribute("x","7"),s.setAttribute("y","8"),s.setAttribute("width","6"),s.setAttribute("height","4"),s.setAttribute("fill","black"),t.appendChild(s)}else if(i==="left"){const n=document.createElementNS(pe,"line");n.setAttribute("x1","5"),n.setAttribute("y1","3"),n.setAttribute("x2","5"),n.setAttribute("y2","17"),n.setAttribute("stroke","black"),n.setAttribute("stroke-width","1"),n.setAttribute("stroke-dasharray","2,2"),t.appendChild(n);const s=document.createElementNS(pe,"rect");s.setAttribute("x","2"),s.setAttribute("y","8"),s.setAttribute("width","6"),s.setAttribute("height","4"),s.setAttribute("fill","black"),t.appendChild(s)}else if(i==="right"){const n=document.createElementNS(pe,"line");n.setAttribute("x1","15"),n.setAttribute("y1","3"),n.setAttribute("x2","15"),n.setAttribute("y2","17"),n.setAttribute("stroke","black"),n.setAttribute("stroke-width","1"),n.setAttribute("stroke-dasharray","2,2"),t.appendChild(n);const s=document.createElementNS(pe,"rect");s.setAttribute("x","12"),s.setAttribute("y","8"),s.setAttribute("width","6"),s.setAttribute("height","4"),s.setAttribute("fill","black"),t.appendChild(s)}return t}function Zh(i){const t=document.createElementNS(pe,"svg");t.setAttribute("width","20"),t.setAttribute("height","20"),t.setAttribute("viewBox","0 0 20 20"),t.style.cursor="pointer";const e=document.createElementNS(pe,"rect");e.setAttribute("width","20"),e.setAttribute("height","20"),e.setAttribute("fill","rgba(155, 155, 155, 0.5)"),e.setAttribute("stroke","black"),e.setAttribute("stroke-width",Tn()),t.appendChild(e);const n=2;let s,r;i==="top-left"?(s=3,r=3):i==="bottom-left"&&(s=3,r=17);const o=document.createElementNS(pe,"line");o.setAttribute("x1",s-n),o.setAttribute("y1",r),o.setAttribute("x2",s+n),o.setAttribute("y2",r),o.setAttribute("stroke","red"),o.setAttribute("stroke-width",Tn()),t.appendChild(o);const a=document.createElementNS(pe,"line");return a.setAttribute("x1",s),a.setAttribute("y1",r-n),a.setAttribute("x2",s),a.setAttribute("y2",r+n),a.setAttribute("stroke","red"),a.setAttribute("stroke-width",Tn()),t.appendChild(a),t}function p_(i){const t=Ai();let e=null;for(const n in t){const s=t[n].find(r=>r.id===i);if(s){e=s;break}}e&&(Wt.forEach((n,s)=>{if(n.bitData.id===i){n.bitData=e,n.name=e.name,Te.assignProfilePathsToBits([n]);const r=n.group.querySelector("g");if(r){const o=le.includes(s),a=Te.createBitShapeElement(e,n.groupName,n.baseAbsX,n.baseAbsY,o);if(o){const l=a.querySelector(".bit-shape"),c=a.querySelector(".shank-shape"),h=Math.max(.1,.5/Math.sqrt(it.zoomLevel));l&&(l.setAttribute("stroke","#00BFFF"),l.setAttribute("stroke-width",h)),c&&(c.setAttribute("stroke","#00BFFF"),c.setAttribute("stroke-width",h),c.style.display=zn?"block":"none")}n.group.replaceChild(a,r)}}}),window.threeModule&&Rn(),Je(),Be(),on(),ye&&ke(),window.threeModule&&Rn())}function m_(i,t,e){ei();const n=(it.canvasParameters.width-Me)/2,s=(it.canvasParameters.height-me)/2,r=n+Me/2,o=s,a=e(i,t,r,o),l=document.createElementNS(pe,"g");l.appendChild(a),l.setAttribute("transform","translate(0, 0)"),ai.appendChild(l),Xs++;const c=r-n,h=o-s,u={number:Xs,name:i.name,x:c,y:h,alignment:"center",operation:"AL",color:i.fillColor||"#cccccc",group:l,baseAbsX:r,baseAbsY:o,bitData:i,groupName:t};Wt.push(u),Te.assignProfilePathsToBits([u]),Je(),eo(),Be(),ye&&ke()}function Je(){const i=document.getElementById("bits-sheet-body");i.innerHTML="",Wt.forEach((e,n)=>{const s=document.createElement("tr");s.setAttribute("data-index",n),s.addEventListener("click",P=>{P.target.tagName==="INPUT"||P.target.tagName==="SELECT"||P.target.closest("button")||P.target.closest("svg")||P.target.closest("option")||(P.stopPropagation(),Zs(n))});const r=document.createElement("td");r.className="drag-handle",r.draggable=!0,r.textContent="☰",r.addEventListener("dragstart",__),r.addEventListener("dragend",S_),s.appendChild(r);const o=document.createElement("td");o.textContent=n+1,s.appendChild(o);const a=document.createElement("td");a.textContent=e.name,s.appendChild(a);const l=document.createElement("td"),c=document.createElement("input");c.type="text";const h=hi(e);c.value=e.x+h.x,c.addEventListener("change",()=>{const P=he(c.value);c.value=P;const y=(parseFloat(P)||0)-h.x;ds(n,y,e.y)}),l.appendChild(c),s.appendChild(l);const u=document.createElement("td"),d=document.createElement("input");d.type="text",d.value=Jh(e.y,h),d.addEventListener("change",()=>{const P=he(d.value);d.value=P;const I=b_(P,h);ds(n,e.x,I)}),u.appendChild(d),s.appendChild(u);const p=document.createElement("td"),g=document.createElement("button");g.type="button",g.style.background="none",g.style.border="none",g.style.padding="0",g.style.cursor="pointer",g.appendChild(f_(e.alignment||"center")),g.addEventListener("click",P=>{P.stopPropagation(),x_(n)}),p.appendChild(g),s.appendChild(p);const x=document.createElement("td"),m=document.createElement("select");m.style.width="100%",m.style.padding="2px",m.style.border="1px solid #ccc",m.style.borderRadius="3px";const f=Ha(e.groupName),A={AL:"Profile Along",OU:"Profile Outside",IN:"Profile Inside",VC:"V-Carve",PO:"Pocketing",RE:"Re-Machining",TS:"T-Slotting",DR:"Drill"};f.forEach(P=>{const I=document.createElement("option");I.value=P,I.textContent=A[P]||P,e.operation===P&&(I.selected=!0),m.appendChild(I)}),m.addEventListener("change",()=>{e.operation=m.value,Be(),on(),window.threeModule&&Rn()}),x.appendChild(m),s.appendChild(x);const v=document.createElement("td"),S=document.createElement("input");S.id="bit-color-input",S.type="color",S.value=e.color||"#cccccc",S.style.border="1px solid #ccc",S.style.borderRadius="3px",S.style.cursor="pointer",S.addEventListener("input",()=>{var I;e.color=S.value;const P=(I=e.group)==null?void 0:I.querySelector("g");if(P){const y={...e.bitData,fillColor:e.color},C=Te.createBitShapeElement(y,e.groupName,e.baseAbsX,e.baseAbsY,le.includes(n));e.group.replaceChild(C,P)}Be(),on(),window.threeModule&&Rn()}),v.appendChild(S),s.appendChild(v);const w=document.createElement("td"),R=document.createElement("button");R.type="button",R.className="del-btn",R.textContent="✕",R.title="Delete bit from canvas",R.addEventListener("click",P=>{P.stopPropagation(),g_(n)}),w.appendChild(R),s.appendChild(w),s.addEventListener("dragover",v_),s.addEventListener("drop",y_),le.includes(n)&&s.classList.add("selected-bit-row"),i.appendChild(s)});const t=document.getElementById("right-menu");t&&t.addEventListener("click",e=>{e.target.closest("input, button, svg, tr, td, th")||(le.forEach(s=>{to(s)}),le=[],Je(),Yn())})}function g_(i){if(i<0||i>=Wt.length)return;const t=Wt[i];t.group&&t.group.parentNode&&t.group.parentNode.removeChild(t.group),Wt.splice(i,1),le=le.filter(e=>e!==i).map(e=>e>i?e-1:e),Je(),Yn(),Be(),on(),ye&&ke(),window.threeModule&&Rn()}function x_(i){const t=Wt[i];if(!t)return;const n=(Ho.indexOf(t.alignment||"center")+1)%Ho.length,s=Ho[n],r=hi(t);t.alignment=s;const o=hi(t),a=r.x-o.x,l=r.y-o.y;if(a!==0||l!==0){const c=t.x+a,h=t.y+l;ds(i,c,h)}Je(),ye&&ke(),window.threeModule&&Rn()}function Zs(i){const t=le.indexOf(i);if(t!==-1)le.splice(t,1),to(i);else{le.push(i);const e=Wt[i];if(e&&e.group){const n=e.group.querySelector("g");if(n){const s=n.querySelector(".bit-shape");n.querySelector(".shank-shape"),s&&(s.dataset.originalFill=s.getAttribute("fill"),s.dataset.originalStroke=s.getAttribute("stroke"));const r={...e.bitData,fillColor:e.color},o=Te.createBitShapeElement(r,e.groupName,e.baseAbsX,e.baseAbsY,!0);e.group.replaceChild(o,n);const a=o.querySelector(".bit-shape"),l=o.querySelector(".shank-shape"),c=Math.max(.1,.5/Math.sqrt(it.zoomLevel));a&&(a.setAttribute("stroke","#00BFFF"),a.setAttribute("stroke-width",c)),l&&(l.setAttribute("stroke","#00BFFF"),l.setAttribute("stroke-width",c))}}}Je(),Yn()}function to(i){const t=Wt[i];if(t&&t.group){const e=t.group.querySelector("g");if(e){const n={...t.bitData,fillColor:t.color},s=Te.createBitShapeElement(n,t.groupName,t.baseAbsX,t.baseAbsY,!1);t.group.replaceChild(s,e);const r=Math.max(.1,.5/Math.sqrt(it.zoomLevel)),o=s.querySelector(".bit-shape"),a=s.querySelector(".shank-shape");o&&o.setAttribute("stroke-width",r),a&&(a.setAttribute("stroke","black"),a.setAttribute("stroke-width",r),a.style.display=zn?"block":"none")}}}function ds(i,t,e){ei();const n=ms(),s=n.x,r=n.y;if(le.includes(i)&&le.length>1){const u=Wt[i],d=u.x,p=u.y,g=t-d,x=e-p;le.forEach(m=>{if(m!==i){const f=Wt[m],A=f.x+g,v=f.y+x,S=s+A,w=r+v,R=S-f.baseAbsX,P=w-f.baseAbsY;f.group.setAttribute("transform",`translate(${R}, ${P})`),f.x=A,f.y=v}}),le.forEach(m=>{no(m,Wt[m].x,Wt[m].y)})}const o=Wt[i],a=s+t,l=r+e,c=a-o.baseAbsX,h=l-o.baseAbsY;o.group.setAttribute("transform",`translate(${c}, ${h})`),o.x=t,o.y=e,Yn(),Be(),on(),eo(),ye&&ke(),window.threeModule&&Rn()}function __(i){oi=this.closest("tr"),i.dataTransfer.effectAllowed="move",i.dataTransfer.setData("text/plain",oi.getAttribute("data-index")),oi.style.opacity="0.4"}function v_(i){return i.preventDefault&&i.preventDefault(),i.dataTransfer.dropEffect="move",!1}function y_(i){if(i.stopPropagation&&i.stopPropagation(),!oi)return!1;const t=parseInt(oi.getAttribute("data-index"),10),e=parseInt(this.getAttribute("data-index"),10);if(t!==e){const[n]=Wt.splice(t,1);Wt.splice(e,0,n),le=le.map(s=>s===t?e:s>t&&s<=e?s-1:s>=e&&s<t?s+1:s),Je(),Yn()}return!1}function S_(i){oi&&(oi.style.opacity="1"),oi=null}function Yn(){const i=document.getElementById("bits-layer");i.innerHTML="",Wt.forEach((t,e)=>{t.number=e+1,i.appendChild(t.group),t.group.querySelectorAll(".anchor-point").forEach(u=>u.remove());const n=document.createElementNS(pe,"g");n.classList.add("anchor-point");const s=hi(t),r=s.x+t.baseAbsX,o=s.y+t.baseAbsY,a=3,l=Math.max(.1,.5/Math.sqrt(it.zoomLevel)),c=document.createElementNS(pe,"line");c.setAttribute("x1",r-a),c.setAttribute("y1",o),c.setAttribute("x2",r+a),c.setAttribute("y2",o),c.setAttribute("stroke","red"),c.setAttribute("stroke-width",l),n.appendChild(c);const h=document.createElementNS(pe,"line");h.setAttribute("x1",r),h.setAttribute("y1",o-a),h.setAttribute("x2",r),h.setAttribute("y2",o+a),h.setAttribute("stroke","red"),h.setAttribute("stroke-width",l),n.appendChild(h),le.includes(e)?n.setAttribute("visibility","visible"):n.setAttribute("visibility","hidden"),t.group.appendChild(n)})}function Tn(i=it==null?void 0:it.zoomLevel){return i?Math.max(.1,.5/Math.sqrt(i)):1}function eo(i=it==null?void 0:it.zoomLevel){if(!i)return;const t=Tn(i);Ze&&Ze.setAttribute("stroke-width",t),qe&&qe.setAttribute("stroke-width",t),Wt.forEach(n=>{var o,a;const s=(o=n.group)==null?void 0:o.querySelector(".bit-shape"),r=(a=n.group)==null?void 0:a.querySelector(".shank-shape");s&&s.setAttribute("stroke-width",t),r&&r.setAttribute("stroke-width",t)}),ii.forEach(n=>{n.element&&n.element.setAttribute("stroke-width",t)});const e=it==null?void 0:it.getLayer("phantoms");e&&e.querySelectorAll(".phantom-bit .bit-shape").forEach(s=>{s.setAttribute("stroke-width",t)})}function jh(){const i=[];if(["panel","offsets","bits","phantoms","overlay"].forEach(e=>{const n=it.getLayer(e);if(n){const s=Array.from(n.children).filter(r=>r.style.display!=="none"&&window.getComputedStyle(r).display!=="none");i.push(...s)}}),i.length===0){it.fitToScale({minX:0,maxX:it.canvasParameters.width,minY:0,maxY:it.canvasParameters.height,padding:20});return}Kh(i,100)}function Kh(i=le,t=50){if(!i||i.length===0)return;const e=i.every(s=>typeof s=="number");let n;if(e){const s=ms();let r=1/0,o=1/0,a=-1/0,l=-1/0;if(i.forEach(d=>{const p=Wt[d];if(p){const g=s.x+p.x,x=s.y+p.y,m=(p.bitData.diameter||10)/2;let f=0;zn&&p.bitData.shankDiameter&&p.bitData.totalLength&&p.bitData.length&&(f=p.bitData.totalLength-p.bitData.length),r=Math.min(r,g-m),o=Math.min(o,x-m-f),a=Math.max(a,g+m),l=Math.max(l,x+m)}}),r===1/0)return;const c=a-r,h=l-o,u={x:r+c/2,y:o+h/2};n={width:c,height:h,center:u}}else n=du(i);fu(it,n,t)}function M_(){Kh(le,50)}function js(){return hn==="top-left"?{x:0,y:0}:{x:0,y:me}}function Jh(i,t){const e=i+t.y;return hn==="bottom-left"?-e:e}function b_(i,t){return(hn==="bottom-left"?-i:i)-t.y}function ms(){const i=(it.canvasParameters.width-Me)/2,t=(it.canvasParameters.height-me)/2,e=js();return{x:i+e.x,y:t+e.y}}function hi(i){const e=(i.bitData.diameter||0)/2;switch(i.alignment){case"left":return{x:-e,y:0};case"right":return{x:e,y:0};case"center":default:return{x:0,y:0}}}function E_(i){if(i.button===0){const t=it.screenToSvg(i.clientX,i.clientY);let e=!1;if(ri)for(let n=0;n<Wt.length;n++){const s=Wt[n];if(s&&s.group){const r=s.group.querySelector(".bit-shape");if(r){const o=s.group.getAttribute("transform");let a=0,l=0;if(o){const u=o.match(/translate\(([^,]+),\s*([^)]+)\)/);u&&(a=parseFloat(u[1])||0,l=parseFloat(u[2])||0)}const c=t.x-a,h=t.y-l;if(r.isPointInFill(new DOMPoint(c,h))){const u=s.baseAbsX+a,d=s.baseAbsY+l;if(Math.sqrt((t.x-u)**2+(t.y-d)**2)<=20)if(e=!0,le.includes(n)){Wr=!0,Ce=n,t.x,t.y,ci=!1,Ue.style.cursor="pointer";return}else{Zs(n);return}}}}}!e&&le.length>0&&(le.forEach(n=>{to(n)}),le=[],Je(),Yn()),Hr=!0,kh=i.clientX,zh=i.clientY,Vh=it.panX,Gh=it.panY,Ue.style.cursor="grabbing"}}function A_(i){if(Wr&&Ce!==null){ci=!0;const t=it.screenToSvg(i.clientX,i.clientY),e=Wt[Ce],n=hi(e),s=ms();let r=t.x-s.x,o=t.y-s.y;r=it.snapToGrid(r),o=it.snapToGrid(o);let a=r-n.x,l=o-n.y;Qh(i.clientX,i.clientY),ds(Ce,a,l),no(Ce,a,l)}else if(Hr){const t=i.clientX-kh,e=i.clientY-zh,n=t/it.zoomLevel,s=e/it.zoomLevel;it.panX=Vh-n,it.panY=Gh-s,it.updateViewBox()}}function T_(i){Wr?(Wr=!1,!ci&&Ce!==null&&Zs(Ce),Ce=null,ci=!1,Ue.style.cursor="grab",ye&&ke()):Hr&&(Hr=!1,Ue.style.cursor="grab")}function C_(i){if(i.preventDefault(),i.touches.length===1){const t=i.touches[0],e=it.screenToSvg(t.clientX,t.clientY);let n=!1;if(ri)for(let s=0;s<Wt.length;s++){const r=Wt[s];if(r&&r.group){const o=r.group.querySelector(".bit-shape");if(o){const a=r.group.getAttribute("transform");let l=0,c=0;if(a){const d=a.match(/translate\(([^,]+),\s*([^)]+)\)/);d&&(l=parseFloat(d[1])||0,c=parseFloat(d[2])||0)}const h=e.x-l,u=e.y-c;if(o.isPointInFill(new DOMPoint(h,u))){const d=r.baseAbsX+l,p=r.baseAbsY+c;if(Math.sqrt((e.x-d)**2+(e.y-p)**2)<=30)if(n=!0,us=t.identifier,le.includes(s)){Ws=!0,Ce=s,e.x,e.y,ci=!1;return}else{Zs(s);return}}}}}n||(le.length>0&&(le.forEach(s=>{to(s)}),le=[],Je(),Yn()),Xr=!0,Hh=t.clientX,Wh=t.clientY,Xh=it.panX,Yh=it.panY)}}function w_(i){if(i.preventDefault(),Ws&&i.touches.length===1){const t=Array.from(i.touches).find(h=>h.identifier===us);if(!t)return;ci=!0;const e=it.screenToSvg(t.clientX,t.clientY),n=Wt[Ce],s=hi(n),r=ms();let o=e.x-r.x,a=e.y-r.y;o=it.snapToGrid(o),a=it.snapToGrid(a);let l=o-s.x,c=a-s.y;Qh(t.clientX,t.clientY),ds(Ce,l,c),no(Ce,l,c)}else if(Xr&&i.touches.length===1){const t=i.touches[0],e=t.clientX-Hh,n=t.clientY-Wh,s=e/it.zoomLevel,r=n/it.zoomLevel;it.panX=Xh-s,it.panY=Yh-r,it.updateViewBox()}}function P_(i){Array.from(i.changedTouches).find(e=>e.identifier===us)&&(Ws&&(Ws=!1,!ci&&Ce!==null&&Zs(Ce),Ce=null,ci=!1,us=null,tu(),ye&&ke()),Xr&&(Xr=!1))}function Qh(i,t){const e=Ue.getBoundingClientRect(),n=a_;let s=0,r=0;i<e.left+n?s=-Tr:i>e.right-n&&(s=Tr),t<e.top+n?r=-Tr:t>e.bottom-n&&(r=Tr),s!==0||r!==0?R_(s,r):tu()}function R_(i,t){Ga||(Ga=!0,Ur=setInterval(()=>{var s,r;const e=i/it.zoomLevel,n=t/it.zoomLevel;if(it.panX+=e,it.panY+=n,it.updateViewBox(),Ws&&Ce!==null){const o=Wt[Ce],a=hi(o),l=ms(),c=it.screenToSvg(((s=Array.from(Ue.ownerDocument.touches).find(h=>h.identifier===us))==null?void 0:s.clientX)||0,((r=Array.from(Ue.ownerDocument.touches).find(h=>h.identifier===us))==null?void 0:r.clientY)||0);if(c.x!==0||c.y!==0){let h=c.x-l.x,u=c.y-l.y;h=it.snapToGrid(h),u=it.snapToGrid(u);let d=h-a.x,p=u-a.y;ds(Ce,d,p),no(Ce,d,p)}}},50))}function tu(){Ur&&(clearInterval(Ur),Ur=null),Ga=!1}function no(i,t,e){const s=document.getElementById("bits-sheet-body").querySelectorAll("tr");if(s[i]){const r=s[i].querySelectorAll("td"),o=hi(Wt[i]);if(r[3]){const a=r[3].querySelector("input");a&&(a.value=t+o.x)}if(r[4]){const a=r[4].querySelector("input");a&&(a.value=Jh(e,o))}}}function ke(){if(!ye)return $e;const i=(it.canvasParameters.width-Me)/2,t=(it.canvasParameters.height-me)/2,e=Au(Me,me,i,t,Wt);return $e.setAttribute("d",e),$e.setAttribute("transform",`translate(${i}, ${t})`),$e}function L_(){ri=!ri;const i=document.getElementById("bits-btn"),t=it.getLayer("phantoms");ri?(ai.style.display="block",t.style.display="block",i.classList.remove("bits-hidden"),i.classList.add("bits-visible"),i.title="Hide Bits",zn||Wt.forEach(e=>{var s;const n=(s=e.group)==null?void 0:s.querySelector(".shank-shape");n&&(n.style.display="none")})):(ai.style.display="none",t.style.display="none",i.classList.remove("bits-visible"),i.classList.add("bits-hidden"),i.title="Show Bits"),window.threeModule&&window.threeModule.toggleBitMeshesVisibility(ri)}function D_(){zn=!zn;const i=document.getElementById("shank-btn");Wt.forEach(t=>{var n;const e=(n=t.group)==null?void 0:n.querySelector(".shank-shape");e&&(e.style.display=zn?"block":"none")}),zn?(i.classList.remove("shank-hidden"),i.classList.add("shank-visible"),i.title="Hide Shanks"):(i.classList.remove("shank-visible"),i.classList.add("shank-hidden"),i.title="Show Shanks")}function I_(){if(!ai||!Ze||!$e){console.error("SVG elements not initialized");return}ye=!ye;const i=document.getElementById("part-btn");ye?(ke(),Ze.style.display="none",$e.style.display="block",ai.style.display=ri?"block":"none",i.classList.remove("part-hidden"),i.classList.add("part-visible"),i.title="Show Material"):(Ze.style.display="block",$e.style.display="none",ai.style.display=ri?"block":"none",i.classList.remove("part-visible"),i.classList.add("part-hidden"),i.title="Show Part"),window.threeModule&&window.threeModule.applyCSGOperation(ye)}function kc(){l_(),Te.createBitGroups(),Be(),on(),Cs.addEventListener("input",ei),ws.addEventListener("input",ei),Ps.addEventListener("input",ei),Cs.addEventListener("blur",()=>{Cs.value=he(Cs.value),ei()}),ws.addEventListener("blur",()=>{ws.value=he(ws.value),ei()}),Ps.addEventListener("blur",()=>{Ps.value=he(Ps.value),ei()}),requestAnimationFrame(()=>{jh(),setTimeout(async()=>{const i=localStorage.getItem("bits_positions");if(i)try{const t=JSON.parse(i);if(t.length>0){const e=await eu(t);je.getModule("ui").logOperation(`Auto-loaded ${e} saved bit positions`),Be(),on()}}catch(t){console.warn("Failed to load saved positions:",t),ui("Failed to auto-load saved positions")}},100)})}async function N_(){if(Wt.length===0){alert("No bits on canvas to export. Please add some bits first.");return}const i=ye;i||(ye=!0);const t=ke();console.log(t);try{const e=je.getModule("export");if(!e)throw new Error("Export module not found");const n=e.exportToDXF(Wt,t,qe,ii,me);i||(ye=!1),e.downloadDXF(n),console.log("DXF export completed. File downloaded."),ui("DXF export completed successfully")}catch(e){console.error("Failed to export DXF:",e),ui("Failed to export DXF: "+e.message),alert("Failed to export DXF. Please check console for details.")}}function ui(i){const t=document.getElementById("operations-log"),e=new Date().toLocaleTimeString();t.textContent=`[${e}] ${i}`,t.classList.remove("fade-out"),setTimeout(()=>{t.classList.add("fade-out")},5e3)}function U_(){const i=Wt.map(t=>({id:t.bitData.id,x:t.x,y:t.y,alignment:t.alignment,operation:t.operation,color:t.color}));localStorage.setItem("bits_positions",JSON.stringify(i)),ui(`Saved ${i.length} bit positions`)}function F_(){const i=Wt.map(s=>({id:s.bitData.id,x:s.x,y:s.y,alignment:s.alignment,operation:s.operation,color:s.color})),t=JSON.stringify(i,null,2),e=new Blob([t],{type:"application/json"}),n=document.createElement("a");n.href=URL.createObjectURL(e),n.download="bits_positions.json",document.body.appendChild(n),n.click(),document.body.removeChild(n),ui(`Exported ${i.length} bit positions to JSON file`)}async function O_(){const i=document.createElement("input");i.type="file",i.accept=".json",i.onchange=async t=>{const e=t.target.files[0];if(e){const n=new FileReader;n.onload=async s=>{try{const r=JSON.parse(s.target.result),o=await eu(r);ui(`Loaded ${o} bit positions from JSON file`),Be()}catch{alert("Failed to parse JSON file. Please check the format."),ui("Failed to load positions: invalid JSON format")}},n.readAsText(e)}},i.click()}async function eu(i){Wt.forEach(n=>{n.group&&n.group.parentNode&&n.group.parentNode.removeChild(n.group)}),Wt=[];const t=await Ai();let e=0;return i.forEach((n,s)=>{let r=null,o=null;for(const[a,l]of Object.entries(t)){const c=l.find(h=>h.id===n.id);if(c){r=c,o=a;break}}if(r)try{const a=(it.canvasParameters.width-Me)/2,l=(it.canvasParameters.height-me)/2,c=a+Me/2,h=l+me/2,u=Te.createBitShapeElement(r,o,c,h),d=document.createElementNS(pe,"g");d.appendChild(u),ai.appendChild(d),Xs++;const p=Ha(o);let g=n.operation||"AL";p.includes(g)||(g="AL");const x={number:Xs,name:r.name,x:n.x,y:n.y,alignment:n.alignment||"center",operation:g,color:n.color||r.fillColor||"#cccccc",group:d,baseAbsX:c,baseAbsY:h,bitData:r,groupName:o};Wt.push(x),Te.assignProfilePathsToBits([x]),e++;const m=ms(),f=m.x+n.x,A=m.y+n.y,v=f-c,S=A-h;d.setAttribute("transform",`translate(${v}, ${S})`)}catch(a){console.error(`Error restoring bit ${n.id}:`,a)}else console.warn(`Bit with ID ${n.id} not found in available bits`)}),Je(),eo(),Be(),on(),ye&&ke(),e}function B_(){const i=Wt.length;Wt.forEach(t=>{t.group&&t.group.parentNode&&t.group.parentNode.removeChild(t.group)}),Wt=[],Xs=0,localStorage.removeItem("bits_positions"),Je(),Be(),on(),ye&&ke(),ui(`Cleared ${i} bits from canvas`)}window.addEventListener("resize",()=>{it&&(it.resize(),Qr(),ul(),Be(),on(),ye&&ke());const i=document.getElementById("left-panel"),t=document.getElementById("right-menu");window.innerWidth>768&&i&&(i.classList.remove("collapsed","overlay-visible"),i.style.display=""),window.innerWidth>1e3&&t&&(t.classList.remove("collapsed","overlay-visible"),t.style.display=""),it&&c_()});async function k_(){try{await je.start();const i=je.getModule("canvas"),t=je.getModule("bits"),e=je.getModule("three");console.log("Modular system initialized successfully"),console.log("Canvas module:",i),console.log("Bits module:",t),console.log("Three module:",e),e&&(await e.init(),window.threeModule=e),kc(),z_(e)}catch(i){console.error("Failed to initialize modular system:",i),kc()}}function z_(i){const t=document.getElementById("view-2d"),e=document.getElementById("view-3d"),n=document.getElementById("view-both"),s=document.getElementById("app");function r(a){[t,e,n].forEach(l=>{l.classList.remove("active")}),a.classList.add("active")}function o(a){s.classList.remove("view-2d","view-3d","view-both"),s.classList.add(`view-${a}`),i&&(a==="3d"||a==="both")&&Rn(),it&&setTimeout(()=>{it.resize(),Qr(),Be(),ul()},100),i&&(a==="3d"||a==="both")&&setTimeout(()=>{i.onWindowResize()},100)}t.addEventListener("click",()=>{o("2d"),r(t)}),e.addEventListener("click",()=>{o("3d"),r(e)}),n.addEventListener("click",()=>{o("both"),r(n)}),s.classList.add("view-2d"),r(t)}async function Rn(){const i=window.threeModule;i&&await i.updatePanel(Me,Hs,me,Wt,hn)}window.addEventListener("load",k_);
