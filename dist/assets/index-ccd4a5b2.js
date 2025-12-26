var Ep=Object.defineProperty;var Ap=(i,t,e)=>t in i?Ep(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e;var Yh=(i,t,e)=>(Ap(i,typeof t!="symbol"?t+"":t,e),e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function e(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(s){if(s.ep)return;s.ep=!0;const r=e(s);fetch(s.href,r)}})();const wp="modulepreload",Tp=function(i){return"/"+i},qh={},$h=function(t,e,n){if(!e||e.length===0)return t();const s=document.getElementsByTagName("link");return Promise.all(e.map(r=>{if(r=Tp(r),r in qh)return;qh[r]=!0;const o=r.endsWith(".css"),a=o?'[rel="stylesheet"]':"";if(!!n)for(let h=s.length-1;h>=0;h--){const u=s[h];if(u.href===r&&(!o||u.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${r}"]${a}`))return;const c=document.createElement("link");if(c.rel=o?"stylesheet":wp,o||(c.as="script",c.crossOrigin=""),c.href=r,document.head.appendChild(c),o)return new Promise((h,u)=>{c.addEventListener("load",h),c.addEventListener("error",()=>u(new Error(`Unable to preload CSS for ${r}`)))})})).then(()=>t()).catch(r=>{const o=new Event("vite:preloadError",{cancelable:!0});if(o.payload=r,window.dispatchEvent(o),!o.defaultPrevented)throw r})};function ba(i){return i*Math.PI/180}function de(i){if(!i||typeof i!="string")return i;try{return math.evaluate(i)}catch{return i}}function Cp(i){var r;if(!i||i.length===0)return{minX:0,minY:0,maxX:0,maxY:0,width:0,height:0,center:{x:0,y:0}};const t=(r=i[0])==null?void 0:r.ownerSVGElement;if(!t)return{minX:0,minY:0,maxX:0,maxY:0,width:0,height:0,center:{x:0,y:0}};const e=t.getAttribute("viewBox"),n=t.getBoundingClientRect();t.setAttribute("viewBox",`0 0 ${n.width} ${n.height}`);try{let o=function(g){const x=g.getBBox(),m=g.getCTM(),p=t.createSVGPoint(),y=[{x:x.x,y:x.y},{x:x.x+x.width,y:x.y},{x:x.x+x.width,y:x.y+x.height},{x:x.x,y:x.y+x.height}];let _=1/0,v=1/0,S=-1/0,E=-1/0;return y.forEach(M=>{p.x=M.x,p.y=M.y;const T=p.matrixTransform(m);_=Math.min(_,T.x),v=Math.min(v,T.y),S=Math.max(S,T.x),E=Math.max(E,T.y)}),{x:_,y:v,width:S-_,height:E-v}};var s=o;let a=1/0,l=1/0,c=-1/0,h=-1/0;if(i.forEach(g=>{if(g&&typeof g.getBBox=="function"){const x=o(g);a=Math.min(a,x.x),l=Math.min(l,x.y),c=Math.max(c,x.x+x.width),h=Math.max(h,x.y+x.height)}}),a===1/0)return{minX:0,minY:0,maxX:0,maxY:0,width:0,height:0,center:{x:0,y:0}};const u=c-a,d=h-l,f={x:a+u/2,y:l+d/2};return{minX:a,minY:l,maxX:c,maxY:h,width:u,height:d,center:f}}finally{e?t.setAttribute("viewBox",e):t.removeAttribute("viewBox")}}function Pp(i,t,e=0){const{width:n,height:s}=t,r=n+2*e,o=s+2*e,a=i.canvas.getBoundingClientRect(),l=a.width,c=a.height,h=l/r,u=c/o;i.zoomLevel=Math.min(h,u),i.panX=t.center.x,i.panY=t.center.y,i.updateViewBox(),i.canvas.style.transition="viewBox 1s ease"}function Kd(i,t){if(t){const{minX:e,maxX:n,minY:s,maxY:r,padding:o=20}=t,a=n-e+2*o,l=r-s+2*o,c=i.canvas.getBoundingClientRect(),h=c.width,u=c.height,d=h/a,f=u/l;i.zoomLevel=Math.min(d,f),i.panX=(e+n)/2,i.panY=(s+r)/2}else{const e=i.canvas.getBoundingClientRect();i.zoomLevel=1,i.panX=e.width/2,i.panY=e.height/2}i.updateViewBox()}function Rp(i,t,e=20){const n=ec(t);Kd(i,{minX:n.centerX-n.width/2,maxX:n.centerX+n.width/2,minY:n.centerY-n.height/2,maxY:n.centerY+n.height/2,padding:e})}function ec(i){const t=document.createElementNS("http://www.w3.org/2000/svg","svg");t.style.position="absolute",t.style.left="-9999px",t.style.top="-9999px",t.style.width="1px",t.style.height="1px",t.appendChild(i),document.body.appendChild(t);const e=i.getBBox();return document.body.removeChild(t),{width:e.width,height:e.height,centerX:e.x+e.width/2,centerY:e.y+e.height/2}}const ys={cylindrical:{operations:["AL","OU","IN"],bits:[{id:"cyl-1",name:"D10H20",diameter:10,length:20,shankDiameter:6,totalLength:50,fillColor:"rgba(0, 140, 255, 0.3)"},{id:"cyl-2",name:"D12H25",diameter:12,length:25,shankDiameter:8,totalLength:60,fillColor:"rgba(0, 140, 255, 0.3)"}]},conical:{operations:["AL","VC"],bits:[{id:"con-1",name:"V90D25",diameter:25.4,length:19,angle:90,fillColor:"rgba(26, 255, 0, 0.3)"},{id:"con-2",name:"V120D32",diameter:32,length:13.2,angle:120,fillColor:"rgba(26, 255, 0, 0.3)"},{id:"con-3",name:"V120D50",diameter:50,length:20.6,angle:120,fillColor:"rgba(26, 255, 0, 0.3)"}]},ball:{operations:["AL","OU","IN"],bits:[{id:"bn-1",name:"U10",diameter:10,length:20,height:5,fillColor:"rgba(255, 0, 0, 0.3)"},{id:"bn-2",name:"U19",diameter:19,length:25,height:9.5,fillColor:"rgba(255, 0, 0, 0.3)"},{id:"bn-3",name:"U38",diameter:38.1,length:22,height:19.05,fillColor:"rgba(255, 0, 0, 0.3)"}]},fillet:{operations:["AL","OU","IN"],bits:[{id:"fil-1",name:"R3",diameter:6.35,length:6.35,height:3.175,cornerRadius:3.175,flat:0,fillColor:"rgba(128, 0, 128, 0.3)"},{id:"fil-2",name:"R4D9F2",diameter:9.5,length:9.5,height:4,cornerRadius:4,flat:2,fillColor:"rgba(128, 0, 128, 0.3)"}]},bull:{operations:["AL","OU","IN"],bits:[{id:"bul-1",name:"B3D10",diameter:10,length:10,height:3,cornerRadius:3,flat:4,fillColor:"rgba(128, 128, 0, 0.3)"},{id:"bul-2",name:"B2D12",diameter:12,length:12,height:2,cornerRadius:2,flat:8,fillColor:"rgba(128, 128, 0, 0.3)"}]}},Jd="facade_bits_v1";let ae=null;const Da=new Set(Object.keys(ys));function zr(i){const t=ys[i];return t&&typeof t=="object"&&t.bits?{operations:t.operations||[],bits:t.bits}:{operations:["AL"],bits:t||[]}}function gs(){return"b_"+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}async function so(){const i=localStorage.getItem(Jd);if(i)try{const t=JSON.parse(i);ae={};let e=!1;Object.keys(ys).forEach(n=>{t[n]?ae[n]=t[n]:(ae[n]=zr(n).bits.map(s=>({id:s.id||gs(),...s})),e=!0)}),e&&Si();return}catch(t){console.warn("Failed to parse bits from storage, fallback to defaults.",t)}try{const t=await fetch("./src/data/userBits.json");if(t.ok){const e=await t.json();ae={},Object.keys(ys).forEach(n=>{e[n]&&Array.isArray(e[n])?ae[n]=e[n].map(s=>({id:s.id||gs(),...s})):ae[n]=zr(n).bits.map(s=>({id:s.id||gs(),...s}))}),Si();return}}catch(t){console.warn("Failed to load from userBits.json, using defaults.",t)}ae={},Object.keys(ys).forEach(t=>{ae[t]=zr(t).bits.map(e=>({id:e.id||gs(),...e}))}),Si()}function Si(){localStorage.setItem(Jd,JSON.stringify(ae))}let Zh=!1,Ya=null;async function Lp(){Zh||(Ya||(Ya=so()),await Ya,Zh=!0)}async function xs(){return await Lp(),ae}function Dp(i){ae={},Object.keys(ys).forEach(t=>{ae[t]=i[t]||zr(t).bits.map(e=>({id:e.id||gs(),...e}))}),Si()}function hh(i){return Da.has(i)?zr(i).operations:[]}function nc(i,t){if(ae||so(),!Da.has(i))return null;const e={id:gs(),...t};return Array.isArray(ae[i])||(ae[i]=[]),ae[i].push(e),Si(),e}function Qd(i,t,e){if(ae||so(),!Da.has(i))return null;const n=ae[i].findIndex(s=>s.id===t);return n===-1?null:(ae[i][n]={...ae[i][n],...e},Si(),ae[i][n])}function tf(i,t){ae||so(),Da.has(i)&&(ae[i]=ae[i].filter(e=>e.id!==t),Si())}function Ip(){ae=null,so(),Si()}function Np(){if(!ae)return null;const i=JSON.stringify(ae,null,2),t=new Blob([i],{type:"application/json"}),e=document.createElement("a");return e.href=URL.createObjectURL(t),e.download="userBits.json",document.body.appendChild(e),e.click(),document.body.removeChild(e),t}function Bp(i){try{const t=JSON.parse(i),e=Object.keys(ys);if(!e.every(s=>Array.isArray(t[s])))throw new Error("Invalid JSON structure");return ae={},e.forEach(s=>{ae[s]=(t[s]||[]).map(r=>({id:r.id||gs(),...r}))}),Si(),!0}catch(t){return console.error("Failed to import JSON:",t),!1}}const jh=Object.freeze(Object.defineProperty({__proto__:null,addBit:nc,deleteBit:tf,exportToJSON:Np,getBits:xs,getOperationsForGroup:hh,importFromJSON:Bp,resetToDefaults:Ip,setBits:Dp,updateBit:Qd},Symbol.toStringTag,{value:"Module"}));class Kh{constructor(t,e,n,s){this.svgNS=t,this.defs=e,this.gridLayer=n,this.config=s}render(){const t=this.defs.querySelector(`#${this.config.id}-pattern`);t&&this.defs.removeChild(t);let e=0,n=0;const s=document.createElementNS(this.svgNS,"pattern");s.id=`${this.config.id}-pattern`,s.setAttribute("patternUnits","userSpaceOnUse"),s.setAttribute("x",e),s.setAttribute("y",n),s.setAttribute("width",this.config.size),s.setAttribute("height",this.config.size);const r=document.createElementNS(this.svgNS,"line");r.setAttribute("x1",0),r.setAttribute("y1",0),r.setAttribute("x2",this.config.size),r.setAttribute("y2",0),r.setAttribute("stroke",this.config.color),r.setAttribute("stroke-width",this.config.thickness),s.appendChild(r);const o=document.createElementNS(this.svgNS,"line");o.setAttribute("x1",0),o.setAttribute("y1",0),o.setAttribute("x2",0),o.setAttribute("y2",this.config.size),o.setAttribute("stroke",this.config.color),o.setAttribute("stroke-width",this.config.thickness),s.appendChild(o),this.defs.appendChild(s);const a=document.createElementNS(this.svgNS,"rect");a.setAttribute("x",this.config.x),a.setAttribute("y",this.config.y),a.setAttribute("width",this.config.width),a.setAttribute("height",this.config.height),a.setAttribute("fill",`url(#${this.config.id}-pattern)`),a.setAttribute("pointer-events","none"),this.gridLayer.appendChild(a)}}class ef{constructor(t){this.config={canvas:null,width:800,height:600,enableZoom:!0,enablePan:!0,enableGrid:!0,enableMouseEvents:!0,enableSelection:!1,enableDrag:!1,gridSize:1,gridAnchorX:null,gridAnchorY:null,initialZoom:1,initialPanX:400,initialPanY:300,layers:["grid","content","overlay"],onZoom:null,onPan:null,onMouseDown:null,onMouseMove:null,onMouseUp:null,onWheel:null,...t},this.svgNS="http://www.w3.org/2000/svg",this.zoomLevel=this.config.initialZoom,this.panX=this.config.initialPanX,this.panY=this.config.initialPanY,this.isDragging=!1,this.lastMouseX=0,this.lastMouseY=0,this.gridEnabled=this.config.enableGrid,this.layers={},this.gridLayer=null,this.initialize()}initialize(){if(!this.config.canvas)throw new Error("Canvas element is required");this.canvas=this.config.canvas,this.updateCanvasSize(),this.canvas.setAttribute("width","100%"),this.canvas.setAttribute("height","100%"),this.panX=this.canvasParameters.width/2,this.panY=this.canvasParameters.height/2,this.canvas.setAttribute("viewBox",`0 0 ${this.canvasParameters.width} ${this.canvasParameters.height}`),this.config.layers.forEach(e=>{const n=document.createElementNS(this.svgNS,"g");n.id=`${e}-layer`,this.layers[e]=n,this.canvas.appendChild(n),e==="grid"&&(this.gridLayer=n)}),this.config.enableGrid&&this.drawGrid(),this.config.enableMouseEvents&&this.setupMouseEvents();const t=this.canvas.parentElement;t&&(this.resizeObserver=new ResizeObserver(()=>{this.resize()}),this.resizeObserver.observe(t)),this.updateViewBox()}setupMouseEvents(){this.config.enableZoom&&this.canvas.addEventListener("wheel",this.handleZoom.bind(this),{passive:!1}),this.canvas.addEventListener("mousedown",this.handleMouseDown.bind(this)),this.canvas.addEventListener("mousemove",this.handleMouseMove.bind(this)),this.canvas.addEventListener("mouseup",this.handleMouseUp.bind(this)),this.canvas.addEventListener("mouseleave",this.handleMouseUp.bind(this)),this.setupTouchEvents()}setupTouchEvents(){this.setupBasicTouchEvents()}setupBasicTouchEvents(){const t=this.canvas.parentElement;t&&(t.addEventListener("touchstart",this.handleTouchStart.bind(this),{passive:!1}),t.addEventListener("touchmove",this.handleTouchMove.bind(this),{passive:!1}),t.addEventListener("touchend",this.handleTouchEnd.bind(this),{passive:!1})),this.canvas.addEventListener("touchstart",this.handleTouchStart.bind(this),{passive:!1}),this.canvas.addEventListener("touchmove",this.handleTouchMove.bind(this),{passive:!1}),this.canvas.addEventListener("touchend",this.handleTouchEnd.bind(this),{passive:!1})}drawGrid(){if(!this.gridEnabled||!this.gridLayer)return;this.gridLayer.innerHTML="";let t=this.canvas.querySelector("defs");t||(t=document.createElementNS(this.svgNS,"defs"),this.canvas.insertBefore(t,this.canvas.firstChild));const e=this.canvas.getBoundingClientRect(),n=e.width/this.zoomLevel,s=e.height/this.zoomLevel,r=this.panX-n/2,o=this.panY-s/2;let a=this.config.gridSize;const l=1;a*this.zoomLevel<l&&(a=l/this.zoomLevel);const c=Math.max(.01,.1/Math.sqrt(this.zoomLevel)),h=10,u={id:"grid",size:this.config.gridSize,color:"#e0e0e0",thickness:c,anchorX:this.config.gridAnchorX-this.config.gridSize/2,anchorY:this.config.gridAnchorY-this.config.gridSize/2,panX:this.panX,panY:this.panY,x:r,y:o,width:n,height:s};new Kh(this.svgNS,t,this.gridLayer,u).render();const f={id:"aux-grid",size:h,color:"#5f5959ff",thickness:c*2,anchorX:this.config.gridAnchorX-this.config.gridSize/2,anchorY:this.config.gridAnchorY-this.config.gridSize/2,panX:this.panX,panY:this.panY,x:r,y:o,width:n,height:s};new Kh(this.svgNS,t,this.gridLayer,f).render()}toggleGrid(){this.gridEnabled=!this.gridEnabled,this.gridEnabled?this.drawGrid():this.gridLayer&&(this.gridLayer.innerHTML="")}zoomIn(){this.zoomLevel*=1.2,this.updateViewBox()}zoomOut(){this.zoomLevel/=1.2,this.updateViewBox()}fitToScale(t=null){Kd(this,t)}fitToSVGElement(t,e=20){Rp(this,t,e)}updateViewBox(){const t=this.canvas.getBoundingClientRect(),e=t.width/this.zoomLevel,n=t.height/this.zoomLevel,s=this.panX-e/2,r=this.panY-n/2;this.canvas.setAttribute("viewBox",`${s} ${r} ${e} ${n}`),this.gridEnabled&&this.drawGrid(),this.config.onZoom&&this.config.onZoom(this.zoomLevel,this.panX,this.panY)}handleZoom(t){t.preventDefault();const e=this.canvas.getBoundingClientRect(),n=t.clientX-e.left,s=t.clientY-e.top,r=t.deltaY>0?.9:1.1,o=this.zoomLevel;this.zoomLevel*=r;const a=e.width/o,l=e.height/o,c=this.panX-a/2,h=this.panY-l/2,u=c+n/e.width*a,d=h+s/e.height*l,f=e.width/this.zoomLevel,g=e.height/this.zoomLevel,x=u-n/e.width*f,m=d-s/e.height*g;this.panX=x+f/2,this.panY=m+g/2,this.updateViewBox(),this.config.onWheel&&this.config.onWheel(t,this.zoomLevel,this.panX,this.panY)}handleMouseDown(t){t.button===0&&this.config.enablePan&&(this.isDragging=!0,this.lastMouseX=t.clientX,this.lastMouseY=t.clientY,this.canvas.style.cursor="grabbing"),this.config.onMouseDown&&this.config.onMouseDown(t)}handleMouseMove(t){if(this.isDragging&&this.config.enablePan){const e=t.clientX-this.lastMouseX,n=t.clientY-this.lastMouseY,s=e/this.zoomLevel,r=n/this.zoomLevel;this.panX-=s,this.panY-=r,this.lastMouseX=t.clientX,this.lastMouseY=t.clientY,this.updateViewBox()}this.config.onMouseMove&&this.config.onMouseMove(t)}handleMouseUp(t){this.isDragging&&(this.isDragging=!1,this.canvas.style.cursor=this.config.enablePan?"grab":"default"),this.config.onMouseUp&&this.config.onMouseUp(t)}handleTouchStart(t){t.touches.length===1&&this.config.enablePan?(t.preventDefault(),this.isDragging=!0,this.lastMouseX=t.touches[0].clientX,this.lastMouseY=t.touches[0].clientY):t.touches.length===2&&this.config.enableZoom&&(t.preventDefault(),this.handlePinchStart(t))}handleTouchMove(t){if(this.isDragging&&t.touches.length===1&&this.config.enablePan){t.preventDefault();const e=t.touches[0].clientX-this.lastMouseX,n=t.touches[0].clientY-this.lastMouseY,s=e/this.zoomLevel,r=n/this.zoomLevel;this.panX-=s,this.panY-=r,this.lastMouseX=t.touches[0].clientX,this.lastMouseY=t.touches[0].clientY,this.updateViewBox()}else t.touches.length===2&&this.config.enableZoom&&(t.preventDefault(),this.handlePinchMove(t))}handleTouchEnd(t){this.isDragging&&(this.isDragging=!1),this.pinchStartDistance&&(this.pinchStartDistance=null,this.pinchStartZoom=null,this.pinchStartCenterX=null,this.pinchStartCenterY=null)}handlePinchStart(t){const e=t.touches[0],n=t.touches[1];this.pinchStartDistance=this.getTouchDistance(e,n),this.pinchStartZoom=this.zoomLevel,this.pinchStartCenterX=(e.clientX+n.clientX)/2,this.pinchStartCenterY=(e.clientY+n.clientY)/2}handlePinchMove(t){const e=t.touches[0],n=t.touches[1],s=this.getTouchDistance(e,n);if(this.pinchStartDistance&&this.pinchStartZoom){const r=s/this.pinchStartDistance;let o=this.pinchStartZoom*r;o=Math.max(.1,Math.min(10,o)),Math.abs(o-this.zoomLevel)>.01&&(this.zoomLevel=o,this.updateViewBox())}}getTouchDistance(t,e){const n=t.clientX-e.clientX,s=t.clientY-e.clientY;return Math.sqrt(n*n+s*s)}screenToSvg(t,e){const n=this.canvas.getBoundingClientRect(),s=t-n.left,r=e-n.top,o=n.width/this.zoomLevel,a=n.height/this.zoomLevel,l=this.panX-o/2,c=this.panY-a/2,h=l+s/n.width*o,u=c+r/n.height*a;return{x:h,y:u}}snapToGrid(t){return Math.round(t/this.config.gridSize)*this.config.gridSize}getLayer(t){return this.layers[t]}clearLayer(t){this.layers[t]&&(this.layers[t].innerHTML="")}addToLayer(t,e){this.layers[t]&&this.layers[t].appendChild(e)}removeFromLayer(t,e){this.layers[t]&&e.parentNode===this.layers[t]&&this.layers[t].removeChild(e)}updateCanvasSize(){var e,n;const t=this.canvas.parentElement;if(t){const s=t.clientWidth,r=t.clientHeight;this.canvasParameters={width:s>0?s:((e=this.canvasParameters)==null?void 0:e.width)||this.config.width||800,height:r>0?r:((n=this.canvasParameters)==null?void 0:n.height)||this.config.height||600}}else this.canvasParameters={width:this.config.width||800,height:this.config.height||600}}resize(){const t=this.canvasParameters.width,e=this.canvasParameters.height;this.updateCanvasSize(),this.panX=this.panX/t*this.canvasParameters.width,this.panY=this.panY/e*this.canvasParameters.height,this.updateViewBox()}}const we="http://www.w3.org/2000/svg";class ic{constructor(t){this.canvasManager=t,this.bitGroups=document.getElementById("bit-groups")}createSVGIcon(t,e,n=50){const s=document.createElementNS(we,"svg");s.setAttribute("width",n),s.setAttribute("height",n),s.setAttribute("viewBox",`0 0 ${n} ${n}`);const r=document.createElementNS(we,"circle");r.setAttribute("cx",n/2),r.setAttribute("cy",n/2),r.setAttribute("r",n/2-1),r.setAttribute("fill","white"),r.setAttribute("stroke","black"),r.setAttribute("stroke-width","2"),s.appendChild(r);const o=document.createElementNS(we,"g");o.setAttribute("transform",`translate(${n/2}, ${n/2})`);let a;if(t!=="newBit"&&e&&e.diameter!==void 0)a=this.createBitShapeElement(e,t,0,e.length/2,!1,!1),a.setAttribute("transform",`scale(${n/80})`);else{const l=n/4;switch(t){case"cylindrical":a=document.createElementNS(we,"rect"),a.setAttribute("x",-n/4),a.setAttribute("y",-n/4),a.setAttribute("width",n/2),a.setAttribute("height",n/2);break;case"conical":a=document.createElementNS(we,"path"),a.setAttribute("d",`M ${-l} 0
                    L ${-l} ${-l}
                    L ${l} ${-l}
                    L ${l} 0
                    L 0 ${l}
                    Z`);break;case"ball":a=document.createElementNS(we,"path"),a.setAttribute("d",`M ${-l} 0
                    L ${-l} ${-l}
                    L ${l} ${-l}
                    L ${l} 0
                    A ${l} ${l} 0 0 1 0 ${l}
                    A ${l} ${l} 0 0 1 ${-l} 0
                    Z`);break;case"fillet":a=document.createElementNS(we,"path"),a.setAttribute("d",`M ${-l} ${l/4}
                    L ${-l} ${-l}
                    L ${l} ${-l}
                    L ${l} ${l/4}
                    A ${l} ${l} 0 0 0 ${l/4} ${l}
                    L ${-l/4} ${l}
                    A ${l} ${l} 0 0 0 ${-l} ${l/4}
                    Z`);break;case"bull":a=document.createElementNS(we,"path"),a.setAttribute("d",`M ${-l} ${l/2}
                    L ${-l} ${-l}
                    L ${l} ${-l}
                    L ${l} ${l/2}
                    A ${l/2} ${l/2} 0 0 1 ${l/2} ${l}
                    L ${-l/2} ${l}
                    A ${l/2} ${l/2} 0 0 1 ${-l} ${l/2}
                    Z`);break;case"newBit":a=document.createElementNS(we,"path"),a.setAttribute("d",`M0 ${-n/6}V${n/6}M${-n/6} 0H${n/6}`);break}if(a){const c=e!=null&&e.fillColor?this.getBitFillColor(e,!1):"white";a.setAttribute("fill",c),a.setAttribute("stroke","black"),a.setAttribute("stroke-width","2")}}return a&&o.appendChild(a),s.appendChild(o),s}createActionIcon(t){const e=document.createElementNS(we,"svg");e.setAttribute("width","15"),e.setAttribute("height","15"),e.setAttribute("viewBox","0 0 24 24");const n=document.createElementNS(we,"circle");n.setAttribute("cx","12"),n.setAttribute("cy","12"),n.setAttribute("r","11"),n.setAttribute("fill","white"),n.setAttribute("stroke-width","2");const s=document.createElementNS(we,"path");switch(s.setAttribute("fill","black"),t){case"edit":n.setAttribute("stroke","green"),s.setAttribute("d","M16.293 2.293l3.414 3.414-13 13-3.414-3.414 13-13zM18 10v8h-8v-8h8z");break;case"copy":n.setAttribute("stroke","orange"),s.setAttribute("d","M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z");break;case"remove":n.setAttribute("stroke","red"),s.setAttribute("d","M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z");break}return e.appendChild(n),e.appendChild(s),e}createBitShapeElement(t,e,n=0,s=0,r=!1,o=!0,a=1){const l=document.createElementNS(we,"g");let c,h={x:n+t.diameter/2,y:s-t.height},u={x:n-t.diameter/2,y:s-t.height},d=t.height/2+this.distancePtToPt(h,u)*this.distancePtToPt(h,u)/(8*t.height);const f=this.getBitFillColor(t,r);switch(e){case"cylindrical":c=document.createElementNS(we,"rect"),c.setAttribute("x",n-t.diameter/2),c.setAttribute("y",s-t.length),c.setAttribute("width",t.diameter),c.setAttribute("height",t.length),c.setAttribute("fill",f);break;case"conical":const g=t.angle,x=t.diameter,m=x/2*(1/Math.tan(this.angleToRad(g/2))),p=[`${n},${s}`,`${n-x/2},${s-m}`,`${n-x/2},${s-t.length}`,`${n+x/2},${s-t.length}`,`${n+x/2},${s-m}`].join(" ");c=document.createElementNS(we,"polygon"),c.setAttribute("points",p),c.setAttribute("fill",f);break;case"ball":c=document.createElementNS(we,"path"),c.setAttribute("d",`M ${n+t.diameter/2} ${s-t.height} A ${d} ${d} 0 0 1 ${n-t.diameter/2} ${s-t.height}
        L ${n-t.diameter/2} ${s-t.length}
        L ${n+t.diameter/2} ${s-t.length} Z`),c.setAttribute("fill",f);break;case"fillet":d=t.cornerRadius,c=document.createElementNS(we,"path"),c.setAttribute("d",`M ${n+t.diameter/2} ${s-t.height} A ${d} ${d} 0 0 0 ${n+t.flat/2} ${s}
        L ${n-t.flat/2} ${s}
        A ${d} ${d} 0 0 0 ${n-t.diameter/2} ${s-t.height}
        L ${n-t.diameter/2} ${s-t.length}
        L ${n+t.diameter/2} ${s-t.length} Z`),c.setAttribute("fill",f);break;case"bull":d=t.cornerRadius,c=document.createElementNS(we,"path"),c.setAttribute("d",`M ${n+t.diameter/2} ${s-t.height} A ${d} ${d} 0 0 1 ${n+t.flat/2} ${s}
        L ${n-t.flat/2} ${s}
        A ${d} ${d} 0 0 1 ${n-t.diameter/2} ${s-t.height}
        L ${n-t.diameter/2} ${s-t.length}
        L ${n+t.diameter/2} ${s-t.length} Z`),c.setAttribute("fill",f);break}if(c&&(c.setAttribute("stroke","black"),c.setAttribute("stroke-width",a),c.classList.add("bit-shape"),l.appendChild(c)),o&&t.shankDiameter&&t.totalLength&&t.totalLength>t.length){const g=t.totalLength-t.length,x=document.createElementNS(we,"rect");x.setAttribute("x",n-t.shankDiameter/2),x.setAttribute("y",s-t.totalLength),x.setAttribute("width",t.shankDiameter),x.setAttribute("height",g),x.setAttribute("fill","rgba(64, 64, 64, 0.1)"),x.setAttribute("stroke","black"),x.setAttribute("stroke-width",a),x.classList.add("shank-shape"),l.appendChild(x)}return l}getBitFillColor(t,e=!1){const n=t.fillColor;if(!n)return"rgba(204, 204, 204, 0.3)";let s,r,o;if(n.startsWith("rgba")){const l=n.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);l&&(s=parseInt(l[1]),r=parseInt(l[2]),o=parseInt(l[3]))}else if(n.startsWith("rgb")){const l=n.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);l&&(s=parseInt(l[1]),r=parseInt(l[2]),o=parseInt(l[3]))}else if(n.startsWith("#")){const l=n.slice(1);s=parseInt(l.slice(0,2),16),r=parseInt(l.slice(2,4),16),o=parseInt(l.slice(4,6),16)}return`rgba(${s}, ${r}, ${o}, ${e?.6:.3})`}distancePtToPt(t,e){return Math.sqrt((e.x-t.x)**2+(e.y-t.y)**2)}angleToRad(t){return t*Math.PI/180}async createBitGroups(){const t=await xs();Object.keys(t).forEach(n=>{const s=(t[n]||[]).slice().sort((u,d)=>{const f=(u.diameter||0)-(d.diameter||0);return f!==0?f:(u.length||0)-(d.length||0)}),r=document.createElement("div");r.className="bit-group";const o=this.createSVGIcon(n);r.appendChild(o);const a=document.createElement("div");a.className="bit-list",s.forEach((u,d)=>{const f=document.createElement("div");f.className="bit";const g=document.createElement("span");g.textContent=u.name,f.appendChild(g);const x=this.createSVGIcon(n,u,40);f.appendChild(x);const m=document.createElement("div");m.className="action-icons",["edit","copy","remove"].forEach(p=>{const y=this.createActionIcon(p);y.addEventListener("click",async _=>{switch(_.stopPropagation(),p){case"edit":this.openBitModal(n,u);break;case"copy":await this.handleCopyClick(_,u),this.refreshBitGroups();break;case"remove":await this.handleDeleteClick(_,u),this.refreshBitGroups();break}}),m.appendChild(y)}),f.appendChild(m),f.addEventListener("click",()=>this.drawBitShape(u,n)),a.appendChild(f)});const l=document.createElement("div");l.className="bit add-bit";const c=document.createElement("span");c.textContent="New",l.appendChild(c);const h=this.createSVGIcon("newBit","newBit",40);l.appendChild(h),l.addEventListener("click",()=>this.openNewBitMenu(n)),a.appendChild(l),r.appendChild(a),r.addEventListener("mouseenter",u=>{const d=r.getBoundingClientRect();a.style.display="flex",a.style.left=d.right+5+"px",a.style.top=d.top+d.height/2+"px",a.style.transform="translateY(-50%)",r.getAttribute("data-after-element")}),r.addEventListener("mouseleave",u=>{setTimeout(()=>{a.matches(":hover")||(a.style.display="none")},100)}),a.addEventListener("mouseenter",()=>{a.style.display="flex"}),a.addEventListener("mouseleave",()=>{a.style.display="none"}),this.bitGroups.appendChild(r)})}async refreshBitGroups(){this.bitGroups.innerHTML="",await this.createBitGroups()}async handleCopyClick(t,e){const n=e.name,s=await xs(),o=Object.values(s).flat().filter(h=>h.name.startsWith(`${n} (`)).reduce((h,u)=>{const d=u.name.match(/\((\d+)\)$/);return d?Math.max(h,parseInt(d[1],10)):h},0),a=`${n} (${o+1})`,l={...e,name:a};delete l.id;const c=await this.findBitGroupName(e);c&&nc(c,l)}async handleDeleteClick(t,e){if(confirm(`Are you sure you want to delete ${e.name}?`)){const n=await this.findBitGroupName(e);n&&tf(n,e.id)}}async isBitNameDuplicate(t,e=null){const n=await xs();return Object.values(n||{}).flat().some(s=>s.name===t&&s.id!==e)}async findBitGroupName(t){const e=await xs();for(const n in e)if(e[n].some(s=>s.id===t.id))return n;return null}collectBitParameters(t,e){var d,f;const n=t.querySelector("#bit-name").value.trim(),s=parseFloat(de(t.querySelector("#bit-diameter").value)),r=parseFloat(de(t.querySelector("#bit-length").value)),o=parseInt(de(t.querySelector("#bit-toolnumber").value),10),a=document.querySelector("#bit-color"),l=a?a.value:"#cccccc";let c={name:n,diameter:s,length:r,toolNumber:o,fillColor:l};const h=(d=t.querySelector("#bit-shankDiameter"))==null?void 0:d.value;if(h){const g=parseFloat(de(h));isNaN(g)||(c.shankDiameter=g)}const u=(f=t.querySelector("#bit-totalLength"))==null?void 0:f.value;if(u){const g=parseFloat(de(u));isNaN(g)||(c.totalLength=g)}return e==="conical"&&(c.angle=parseFloat(de(t.querySelector("#bit-angle").value))),e==="ball"&&(c.height=parseFloat(de(t.querySelector("#bit-height").value))),(e==="fillet"||e==="bull")&&(c.height=parseFloat(de(t.querySelector("#bit-height").value)),c.cornerRadius=parseFloat(de(t.querySelector("#bit-cornerRadius").value)),c.flat=parseFloat(de(t.querySelector("#bit-flat").value))),c}validateBitParameters(t,e){var a,l,c,h,u,d,f,g;if(!t.querySelector("#bit-name").value.trim()||!((a=t.querySelector("#bit-diameter"))==null?void 0:a.value)||!((l=t.querySelector("#bit-length"))==null?void 0:l.value)||!((c=t.querySelector("#bit-toolnumber"))==null?void 0:c.value)||e==="conical"&&!((h=t.querySelector("#bit-angle"))==null?void 0:h.value)||e==="ball"&&!((u=t.querySelector("#bit-height"))==null?void 0:u.value))return!1;if(e==="fillet"||e==="bull"){const x=(d=t.querySelector("#bit-height"))==null?void 0:d.value,m=(f=t.querySelector("#bit-cornerRadius"))==null?void 0:f.value,p=(g=t.querySelector("#bit-flat"))==null?void 0:g.value;if(!x||!m||!p)return!1}return!0}buildBitPayload(t,e){var u,d;const n=parseFloat(de(t.querySelector("#bit-diameter").value)),s=parseFloat(de(t.querySelector("#bit-length").value)),r=parseInt(de(t.querySelector("#bit-toolnumber").value),10)||1,o=document.querySelector("#bit-color"),a=o?o.value:"#cccccc",l={name:t.querySelector("#bit-name").value.trim(),diameter:n,length:s,toolNumber:r,fillColor:a},c=(u=t.querySelector("#bit-shankDiameter"))==null?void 0:u.value;if(c){const f=parseFloat(de(c));isNaN(f)||(l.shankDiameter=f)}const h=(d=t.querySelector("#bit-totalLength"))==null?void 0:d.value;if(h){const f=parseFloat(de(h));isNaN(f)||(l.totalLength=f)}if(e==="conical"){const f=parseFloat(de(t.querySelector("#bit-angle").value));l.angle=f}if(e==="ball"){const f=parseFloat(de(t.querySelector("#bit-height").value));l.height=f}if(e==="fillet"||e==="bull"){const f=parseFloat(de(t.querySelector("#bit-height").value));l.height=f;const g=parseFloat(de(t.querySelector("#bit-cornerRadius").value));l.cornerRadius=g;const x=parseFloat(de(t.querySelector("#bit-flat").value));l.flat=x}return l}openNewBitMenu(t){this.openBitModal(t,null)}openBitModal(t,e=null){const n=!!e,s=e&&e.toolNumber!==void 0?e.toolNumber:1,r=e?e.diameter:"",o=e?e.length:"",a=e?e.angle:"",l=e?e.height:"",c=e?e.cornerRadius:"",h=e?e.flat:"",u=e?e.shankDiameter:"",d=e?e.totalLength:"",f=e&&e.fillColor?e.fillColor:"#cccccc",g=e?e.name:"",x=document.createElement("div");x.className="modal",x.innerHTML=`
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
          <input type="color" id="bit-color" value="${f}" title="Bit Color">
          </div>
        </div>

        </div>
    <div class="button-group">
        <button type="button" id="cancel-btn">Cancel</button>
        <button type="submit" form="bit-form">OK</button>
    </div>
    </div>
  `,document.body.appendChild(x);const m=x.querySelector("#bit-form");let p,y=!1;const _=()=>{p=new ef({canvas:x.querySelector("#bit-preview-canvas"),width:200,height:200,enableZoom:!0,enablePan:!0,enableGrid:!0,enableMouseEvents:!0,gridSize:10,initialZoom:1,initialPanX:100,initialPanY:100,layers:["grid","bits"],onZoom:F=>{T(F)}})},v=()=>{p.zoomIn(),b()},S=()=>{p.zoomOut(),b()},E=()=>{if(this.validateBitParameters(m,t)){const F=this.collectBitParameters(m,t),V=this.createBitShapeElement(F,t,0,0,!0);ec(V),p.fitToSVGElement(V,5)}else p.zoomLevel=1,p.panX=100,p.panY=100,p.updateViewBox();T(),b()},M=()=>{p.toggleGrid()};_();function T(F=p==null?void 0:p.zoomLevel){if(!F||!p)return;const V=Math.max(.1,.5/Math.sqrt(F)),G=p.getLayer("bits"),k=G==null?void 0:G.querySelector(".bit-shape"),X=G==null?void 0:G.querySelector(".shank-shape");k&&k.setAttribute("stroke-width",V),X&&X.setAttribute("stroke-width",V)}const b=()=>{const F=p.getLayer("bits");if(F.innerHTML="",!this.validateBitParameters(m,t)){const st=document.createElementNS(we,"text");st.setAttribute("x",p.panX),st.setAttribute("y",p.panY+10),st.setAttribute("text-anchor","middle"),st.setAttribute("font-size","14"),st.setAttribute("fill","#999"),st.textContent="Заполните все параметры",F.appendChild(st);return}const V=this.collectBitParameters(m,t),G=this.createBitShapeElement(V,t,0,0,!0),k=ec(G);if(!y){const Ot=160/k.width,Ht=160/k.height,Z=Math.min(Ot,Ht);p.zoomLevel=Z,p.updateViewBox(),y=!0}const X=Math.max(.1,.5/Math.sqrt(p.zoomLevel)),ht=this.createBitShapeElement(V,t,p.panX-k.centerX,p.panY-k.centerY,!0,!0,X);F.appendChild(ht)};if(x.querySelector("#preview-zoom-in").addEventListener("click",()=>{v(),b()}),x.querySelector("#preview-zoom-out").addEventListener("click",()=>{S(),b()}),x.querySelector("#preview-fit").addEventListener("click",()=>{E()}),x.querySelector("#preview-toggle-grid").addEventListener("click",()=>{M()}),m.querySelectorAll('input[type="text"]').forEach(F=>{F.addEventListener("blur",()=>{F.value=de(F.value)}),F.addEventListener("input",b)}),m.querySelectorAll('input[type="number"]').forEach(F=>{F.addEventListener("input",b),E()}),x.querySelector("#bit-color").addEventListener("input",b),n&&e){const F=()=>{const k=this.collectBitParameters(m,t);this.onUpdateCanvasBitWithParams&&this.onUpdateCanvasBitWithParams(e.id,k,t)},V=m.querySelectorAll('input[type="text"], input[type="number"]'),G=x.querySelector("#bit-color");V.forEach(k=>{k.addEventListener("input",F)}),G&&G.addEventListener("input",F)}b(),E(),m.addEventListener("submit",async F=>{F.preventDefault();const V=m.querySelector("#bit-name").value.trim();if(await this.isBitNameDuplicate(V,n?e==null?void 0:e.id:null)){alert("A bit with this name already exists. Please choose a different name.");return}const G=this.buildBitPayload(m,t);let k;n?k=Qd(t,e.id,G):k=nc(t,G),n&&this.updateCanvasBitsForBitId(k.id),document.body.removeChild(x),this.refreshBitGroups()}),x.querySelector("#cancel-btn").addEventListener("click",()=>{document.body.removeChild(x)})}getGroupSpecificInputs(t,e={}){const n=e.diameter!==void 0?e.diameter:"",s=e.length!==void 0?e.length:"",r=e.angle!==void 0?e.angle:"",o=e.height!==void 0?e.height:"",a=e.cornerRadius!==void 0?e.cornerRadius:"",l=e.flat!==void 0?e.flat:"",c=e.shankDiameter!==void 0?e.shankDiameter:"",h=e.totalLength!==void 0?e.totalLength:"";let u=`
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
        `),u}drawBitShape(t,e){this.onDrawBitShape&&this.onDrawBitShape(t,e)}updateCanvasBitsForBitId(t){this.onUpdateCanvasBits&&this.onUpdateCanvasBits(t)}assignProfilePathsToBits(t){t.forEach(e=>{const n=e.bitData,r=this.createBitShapeElement(n,e.groupName,0,0,!1,!1).querySelector(".bit-shape");let o="";if(r)if(r.tagName==="rect"){const a=parseFloat(r.getAttribute("x")),l=parseFloat(r.getAttribute("y")),c=parseFloat(r.getAttribute("width")),h=parseFloat(r.getAttribute("height"));!isNaN(a)&&!isNaN(l)&&!isNaN(c)&&!isNaN(h)&&(o=`M ${a} ${l} L ${a+c} ${l} L ${a+c} ${l+h} L ${a} ${l+h} Z`)}else if(r.tagName==="polygon"){const a=r.getAttribute("points");if(a){const l=a.trim().split(/\s+/).filter(c=>c.includes(","));l.length>0&&(o="M "+l.join(" L ")+" Z")}}else r.tagName==="path"&&(o=r.getAttribute("d")||"");o&&(o=this.invertYInPath(o),o.trim().endsWith("Z")||(o+=" Z")),e.bitData||(e.bitData={}),e.bitData.profilePath=o})}invertYInPath(t){const e=t.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi),n=[];return e.forEach(s=>{const r=s[0].toUpperCase(),o=s.slice(1).trim().split(/[\s,]+/).map(Number).filter(l=>!isNaN(l));n.push(r);let a=0;for(;a<o.length;)if(r==="M"||r==="L"||r==="T")n.push(o[a],-o[a+1]),a+=2;else if(r==="H")n.push(o[a]),a+=1;else if(r==="V")n.push(-o[a]),a+=1;else if(r==="C")n.push(o[a],-o[a+1],o[a+2],-o[a+3],o[a+4],-o[a+5]),a+=6;else if(r==="S"||r==="Q")n.push(o[a],-o[a+1],o[a+2],-o[a+3]),a+=4;else if(r==="A"){const l=1-o[a+4];n.push(o[a],o[a+1],o[a+2],o[a+3],l,o[a+5],-o[a+6]),a+=7}else{if(r==="Z")break;n.push(...o.slice(a));break}}),n.join(" ")}}class Up{constructor(){this.listeners={}}on(t,e){this.listeners[t]||(this.listeners[t]=[]),this.listeners[t].push(e)}off(t,e){if(!this.listeners[t])return;const n=this.listeners[t].indexOf(e);n!==-1&&this.listeners[t].splice(n,1)}emit(t,...e){if(!this.listeners[t])return;const n=[...this.listeners[t]];for(const s of n)try{s(...e)}catch(r){console.error(`Error in event callback for ${t}:`,r)}}once(t,e){const n=(...s)=>{e(...s),this.off(t,n)};this.on(t,n)}clear(t){this.listeners[t]=[]}clearAll(){this.listeners={}}}const sr=new Up;class ro{constructor(t){this.name=t,this.initialized=!1,this.eventBus=sr}async initialize(){if(this.initialized){console.warn(`Module ${this.name} already initialized`);return}console.log(`Initializing module ${this.name}...`),this.setupEventListeners(),this.initialized=!0,this.eventBus.emit(`module:${this.name}:initialized`),console.log(`Module ${this.name} initialized`)}setupEventListeners(){}async shutdown(){if(!this.initialized){console.warn(`Module ${this.name} not initialized`);return}console.log(`Shutting down module ${this.name}...`),this.cleanupEventListeners(),this.initialized=!1,this.eventBus.emit(`module:${this.name}:shutdown`),console.log(`Module ${this.name} shut down`)}cleanupEventListeners(){}getName(){return this.name}isInitialized(){return this.initialized}}class Fp extends ro{constructor(){super("export"),this.dxfExporter=new Op}initialize(){return super.initialize(),console.log("ExportModule initialized"),Promise.resolve()}exportToDXF(t,e,n,s,r){return this.dxfExporter.exportToDXF(t,e,n,s,r)}downloadDXF(t,e="facade_design.dxf"){this.dxfExporter.downloadDXF(t,e)}}require("makerjs");class Op{constructor(){this.dxfContent=[],this.handleCounter=256}exportToDXF(t,e,n,s,r){return this.dxfContent=[],this.writeHeader(),this.writeClasses(),this.writeTables(t,n,s,r),this.writeBlocks(),this.writeEntities(t,e,n,s,r),this.writeObjects(),this.writeEOF(),this.dxfContent.join(`
`)}writeHeader(){this.dxfContent.push("0"),this.dxfContent.push("SECTION"),this.dxfContent.push("2"),this.dxfContent.push("HEADER"),this.dxfContent.push("9"),this.dxfContent.push("$ACADVER"),this.dxfContent.push("1"),this.dxfContent.push("AC1021"),this.dxfContent.push("9"),this.dxfContent.push("$DWGCODEPAGE"),this.dxfContent.push("3"),this.dxfContent.push("ANSI_1251"),this.dxfContent.push("9"),this.dxfContent.push("$INSBASE"),this.dxfContent.push("10"),this.dxfContent.push("0.0"),this.dxfContent.push("20"),this.dxfContent.push("0.0"),this.dxfContent.push("30"),this.dxfContent.push("0.0"),this.dxfContent.push("9"),this.dxfContent.push("$EXTMIN"),this.dxfContent.push("10"),this.dxfContent.push("0.0"),this.dxfContent.push("20"),this.dxfContent.push("0.0"),this.dxfContent.push("30"),this.dxfContent.push("0.0"),this.dxfContent.push("9"),this.dxfContent.push("$EXTMAX"),this.dxfContent.push("10"),this.dxfContent.push("1000.0"),this.dxfContent.push("20"),this.dxfContent.push("1000.0"),this.dxfContent.push("30"),this.dxfContent.push("0.0"),this.dxfContent.push("9"),this.dxfContent.push("$LIMMIN"),this.dxfContent.push("10"),this.dxfContent.push("0.0"),this.dxfContent.push("20"),this.dxfContent.push("0.0"),this.dxfContent.push("9"),this.dxfContent.push("$LIMMAX"),this.dxfContent.push("10"),this.dxfContent.push("420.0"),this.dxfContent.push("20"),this.dxfContent.push("297.0"),this.dxfContent.push("0"),this.dxfContent.push("ENDSEC")}writeClasses(){this.dxfContent.push("0"),this.dxfContent.push("SECTION"),this.dxfContent.push("2"),this.dxfContent.push("CLASSES"),this.dxfContent.push("0"),this.dxfContent.push("ENDSEC")}writeTables(t,e,n,s){this.dxfContent.push("0"),this.dxfContent.push("SECTION"),this.dxfContent.push("2"),this.dxfContent.push("TABLES");let r=t.length+2;if(e&&r++,n&&(r+=n.length),this.dxfContent.push("0"),this.dxfContent.push("TABLE"),this.dxfContent.push("2"),this.dxfContent.push("LAYER"),this.dxfContent.push("70"),this.dxfContent.push(r.toString()),this.writeLayer("Default",0,0,0,0),e){const o=`CUT_${s}MM_OU`;this.writeLayer(o,0,0,0,0)}n&&n.forEach((o,a)=>{const l=t[o.bitIndex];if(l){let c=o.depth!==void 0?o.depth:l.y,h=c.toString();c%1!==0?h=`_${h.replace(".","_")}`:h=`${c}`;const u=`${l.name}_${h}MM_${l.operation}`,d=this.colorToDXFIndex(l.color);this.writeLayer(u,d,0,0,0)}}),t.forEach((o,a)=>{const l="Default",c=this.colorToDXFIndex(o.color);this.writeLayer(l,c,0,0,0)}),this.dxfContent.push("0"),this.dxfContent.push("ENDTAB"),this.addBLOCKRECORDTable(),this.addLTYPETable(),this.addSTYLETable(),this.addVPORTTable(),this.addEmptyTable("VIEW"),this.addEmptyTable("UCS"),this.addAPPIDTable(),this.addDIMSTYLETable(),this.dxfContent.push("0"),this.dxfContent.push("ENDSEC")}writeLayer(t,e,n=0,s=0,r=0){const o=this.getNextHandle();if(this.dxfContent.push("0"),this.dxfContent.push("LAYER"),this.dxfContent.push("5"),this.dxfContent.push(o),this.dxfContent.push("100"),this.dxfContent.push("AcDbSymbolTableRecord"),this.dxfContent.push("100"),this.dxfContent.push("AcDbLayerTableRecord"),this.dxfContent.push("2"),this.dxfContent.push(t),this.dxfContent.push("70"),this.dxfContent.push(r.toString()),e&&typeof e=="object"&&e.r!==void 0){const a=e.r*256*256+e.g*256+e.b;this.dxfContent.push("420"),this.dxfContent.push(a.toString())}else this.dxfContent.push("62"),this.dxfContent.push((e||7).toString());this.dxfContent.push("6"),this.dxfContent.push("CONTINUOUS"),this.dxfContent.push("290"),this.dxfContent.push("1"),this.dxfContent.push("390"),this.dxfContent.push("0")}addLTYPETable(){this.dxfContent.push("0"),this.dxfContent.push("TABLE"),this.dxfContent.push("2"),this.dxfContent.push("LTYPE"),this.dxfContent.push("70"),this.dxfContent.push("1");const t=this.getNextHandle();this.dxfContent.push("0"),this.dxfContent.push("LTYPE"),this.dxfContent.push("5"),this.dxfContent.push(t),this.dxfContent.push("100"),this.dxfContent.push("AcDbSymbolTableRecord"),this.dxfContent.push("100"),this.dxfContent.push("AcDbLinetypeTableRecord"),this.dxfContent.push("2"),this.dxfContent.push("CONTINUOUS"),this.dxfContent.push("70"),this.dxfContent.push("0"),this.dxfContent.push("3"),this.dxfContent.push(""),this.dxfContent.push("72"),this.dxfContent.push("65"),this.dxfContent.push("73"),this.dxfContent.push("0"),this.dxfContent.push("40"),this.dxfContent.push("0.0"),this.dxfContent.push("0"),this.dxfContent.push("ENDTAB")}addSTYLETable(){this.dxfContent.push("0"),this.dxfContent.push("TABLE"),this.dxfContent.push("2"),this.dxfContent.push("STYLE"),this.dxfContent.push("70"),this.dxfContent.push("1");const t=this.getNextHandle();this.dxfContent.push("0"),this.dxfContent.push("STYLE"),this.dxfContent.push("5"),this.dxfContent.push(t),this.dxfContent.push("100"),this.dxfContent.push("AcDbSymbolTableRecord"),this.dxfContent.push("100"),this.dxfContent.push("AcDbTextStyleTableRecord"),this.dxfContent.push("2"),this.dxfContent.push("STANDARD"),this.dxfContent.push("70"),this.dxfContent.push("0"),this.dxfContent.push("40"),this.dxfContent.push("0.0"),this.dxfContent.push("41"),this.dxfContent.push("1.0"),this.dxfContent.push("50"),this.dxfContent.push("0.0"),this.dxfContent.push("71"),this.dxfContent.push("0"),this.dxfContent.push("42"),this.dxfContent.push("2.5"),this.dxfContent.push("3"),this.dxfContent.push("txt"),this.dxfContent.push("4"),this.dxfContent.push(""),this.dxfContent.push("0"),this.dxfContent.push("ENDTAB")}addAPPIDTable(){this.dxfContent.push("0"),this.dxfContent.push("TABLE"),this.dxfContent.push("2"),this.dxfContent.push("APPID"),this.dxfContent.push("70"),this.dxfContent.push("2");const t=this.getNextHandle();this.dxfContent.push("0"),this.dxfContent.push("APPID"),this.dxfContent.push("5"),this.dxfContent.push(t),this.dxfContent.push("100"),this.dxfContent.push("AcDbSymbolTableRecord"),this.dxfContent.push("100"),this.dxfContent.push("AcDbRegAppTableRecord"),this.dxfContent.push("2"),this.dxfContent.push("ACAD"),this.dxfContent.push("70"),this.dxfContent.push("0");const e=this.getNextHandle();this.dxfContent.push("0"),this.dxfContent.push("APPID"),this.dxfContent.push("5"),this.dxfContent.push(e),this.dxfContent.push("100"),this.dxfContent.push("AcDbSymbolTableRecord"),this.dxfContent.push("100"),this.dxfContent.push("AcDbRegAppTableRecord"),this.dxfContent.push("2"),this.dxfContent.push("Rhino"),this.dxfContent.push("70"),this.dxfContent.push("0"),this.dxfContent.push("0"),this.dxfContent.push("ENDTAB")}addBLOCKRECORDTable(){this.dxfContent.push("0"),this.dxfContent.push("TABLE"),this.dxfContent.push("2"),this.dxfContent.push("BLOCK_RECORD"),this.dxfContent.push("70"),this.dxfContent.push("2"),this.dxfContent.push("0"),this.dxfContent.push("BLOCK_RECORD"),this.dxfContent.push("2"),this.dxfContent.push("*MODEL_SPACE"),this.dxfContent.push("0"),this.dxfContent.push("BLOCK_RECORD"),this.dxfContent.push("2"),this.dxfContent.push("*PAPER_SPACE"),this.dxfContent.push("0"),this.dxfContent.push("ENDTAB")}addVPORTTable(){this.dxfContent.push("0"),this.dxfContent.push("TABLE"),this.dxfContent.push("2"),this.dxfContent.push("VPORT"),this.dxfContent.push("70"),this.dxfContent.push("1"),this.dxfContent.push("0"),this.dxfContent.push("VPORT"),this.dxfContent.push("2"),this.dxfContent.push("*ACTIVE"),this.dxfContent.push("70"),this.dxfContent.push("0"),this.dxfContent.push("10"),this.dxfContent.push("0.0"),this.dxfContent.push("20"),this.dxfContent.push("0.0"),this.dxfContent.push("11"),this.dxfContent.push("1.0"),this.dxfContent.push("21"),this.dxfContent.push("1.0"),this.dxfContent.push("12"),this.dxfContent.push("400.0"),this.dxfContent.push("22"),this.dxfContent.push("-295.0"),this.dxfContent.push("32"),this.dxfContent.push("0.0"),this.dxfContent.push("13"),this.dxfContent.push("0.0"),this.dxfContent.push("23"),this.dxfContent.push("0.0"),this.dxfContent.push("14"),this.dxfContent.push("1.0"),this.dxfContent.push("24"),this.dxfContent.push("1.0"),this.dxfContent.push("15"),this.dxfContent.push("1.0"),this.dxfContent.push("25"),this.dxfContent.push("1.0"),this.dxfContent.push("16"),this.dxfContent.push("0.0"),this.dxfContent.push("26"),this.dxfContent.push("0.0"),this.dxfContent.push("36"),this.dxfContent.push("1.0"),this.dxfContent.push("17"),this.dxfContent.push("0.0"),this.dxfContent.push("27"),this.dxfContent.push("1.0"),this.dxfContent.push("37"),this.dxfContent.push("0.0"),this.dxfContent.push("40"),this.dxfContent.push("200.0"),this.dxfContent.push("41"),this.dxfContent.push("2.0"),this.dxfContent.push("42"),this.dxfContent.push("50.0"),this.dxfContent.push("43"),this.dxfContent.push("0.0"),this.dxfContent.push("44"),this.dxfContent.push("0.0"),this.dxfContent.push("50"),this.dxfContent.push("0.0"),this.dxfContent.push("51"),this.dxfContent.push("0.0"),this.dxfContent.push("71"),this.dxfContent.push("0"),this.dxfContent.push("72"),this.dxfContent.push("100"),this.dxfContent.push("73"),this.dxfContent.push("1"),this.dxfContent.push("74"),this.dxfContent.push("1"),this.dxfContent.push("75"),this.dxfContent.push("0"),this.dxfContent.push("76"),this.dxfContent.push("0"),this.dxfContent.push("77"),this.dxfContent.push("0"),this.dxfContent.push("78"),this.dxfContent.push("0"),this.dxfContent.push("0"),this.dxfContent.push("ENDTAB")}addDIMSTYLETable(){this.dxfContent.push("0"),this.dxfContent.push("TABLE"),this.dxfContent.push("2"),this.dxfContent.push("DIMSTYLE"),this.dxfContent.push("70"),this.dxfContent.push("1"),this.dxfContent.push("0"),this.dxfContent.push("DIMSTYLE"),this.dxfContent.push("2"),this.dxfContent.push("STANDARD"),this.dxfContent.push("70"),this.dxfContent.push("0"),this.dxfContent.push("3"),this.dxfContent.push(""),this.dxfContent.push("40"),this.dxfContent.push("1.0"),this.dxfContent.push("41"),this.dxfContent.push("0.18"),this.dxfContent.push("42"),this.dxfContent.push("0.0625"),this.dxfContent.push("44"),this.dxfContent.push("0.18"),this.dxfContent.push("47"),this.dxfContent.push("0.0"),this.dxfContent.push("48"),this.dxfContent.push("0.0"),this.dxfContent.push("73"),this.dxfContent.push("1"),this.dxfContent.push("74"),this.dxfContent.push("1"),this.dxfContent.push("75"),this.dxfContent.push("0"),this.dxfContent.push("76"),this.dxfContent.push("0"),this.dxfContent.push("77"),this.dxfContent.push("0"),this.dxfContent.push("278"),this.dxfContent.push("2"),this.dxfContent.push("279"),this.dxfContent.push("46"),this.dxfContent.push("281"),this.dxfContent.push("0"),this.dxfContent.push("282"),this.dxfContent.push("0"),this.dxfContent.push("271"),this.dxfContent.push("4"),this.dxfContent.push("276"),this.dxfContent.push("0"),this.dxfContent.push("0"),this.dxfContent.push("ENDTAB")}addEmptyTable(t){this.dxfContent.push("0"),this.dxfContent.push("TABLE"),this.dxfContent.push("2"),this.dxfContent.push(t),this.dxfContent.push("70"),this.dxfContent.push("0"),this.dxfContent.push("0"),this.dxfContent.push("ENDTAB")}writeBlocks(){this.dxfContent.push("0"),this.dxfContent.push("SECTION"),this.dxfContent.push("2"),this.dxfContent.push("BLOCKS"),this.dxfContent.push("0"),this.dxfContent.push("ENDSEC")}writeEntities(t,e,n,s,r){this.dxfContent.push("0"),this.dxfContent.push("SECTION"),this.dxfContent.push("2"),this.dxfContent.push("ENTITIES"),n&&this.writePartFront(n,r),s&&s.forEach((o,a)=>{this.writeOffsetContour(o,t)}),this.writeResultPolygon(e,"Default"),t.forEach((o,a)=>{this.writeBitShape(o,a)}),this.dxfContent.push("0"),this.dxfContent.push("ENDSEC")}writeBitShape(t,e){const n="Default",s=t.group.getAttribute("transform");let r=0,o=0;if(s){const c=s.match(/translate\(([^,]+),\s*([^)]+)\)/);c&&(r=parseFloat(c[1]),o=parseFloat(c[2]))}const a=t.group.querySelector(".bit-shape");if(!a)return;const l=c=>-c;this.writeSVGShape(a,r,o,n,l),this.addBitXDATA(t)}addBitXDATA(t){this.dxfContent.push("1001"),this.dxfContent.push("Rhino"),this.dxfContent.push("1002"),this.dxfContent.push("{"),this.dxfContent.push("1000"),this.dxfContent.push("Name"),this.dxfContent.push("1000"),this.dxfContent.push(t.name),this.dxfContent.push("1002"),this.dxfContent.push("}")}writePartFront(t,e){const n=`CUT_${e}MM_OU`,s=r=>-r;this.writeSVGRect(t,0,0,n,s)}writeOffsetContour(t,e){const n=e[t.bitIndex];if(!n)return;let s=t.depth!==void 0?t.depth:n.y,r=s.toString();s%1!==0?r=`_${r.replace(".","_")}`:r=`${s}`;let o=`${n.name}_${r}MM_${n.operation}`;t.pass===0&&(o="Default");const a=l=>-l;this.writeSVGPath(t.element,0,0,o,a)}writeSVGShape(t,e,n,s,r){const o=t.tagName.toLowerCase();switch(o){case"rect":this.writeSVGRect(t,e,n,s,r);break;case"polygon":this.writeSVGPolygon(t,e,n,s,r);break;case"path":this.writeSVGPath(t,e,n,s,r);break;case"circle":this.writeSVGCircle(t,e,n,s,r);break;default:console.warn(`Unsupported SVG element type: ${o}`)}}writeSVGRect(t,e,n,s,r){const o=parseFloat(t.getAttribute("x")||0)+e,a=parseFloat(t.getAttribute("y")||0)+n,l=parseFloat(t.getAttribute("width")||0),c=parseFloat(t.getAttribute("height")||0),h=o,u=r(a),d=o+l,f=r(a+c),g=this.getNextHandle();this.dxfContent.push("0"),this.dxfContent.push("LWPOLYLINE"),this.dxfContent.push("5"),this.dxfContent.push(g),this.dxfContent.push("100"),this.dxfContent.push("AcDbEntity"),this.dxfContent.push("8"),this.dxfContent.push(s),this.dxfContent.push("6"),this.dxfContent.push("BYLAYER"),this.dxfContent.push("62"),this.dxfContent.push("256"),this.dxfContent.push("370"),this.dxfContent.push("-1"),this.dxfContent.push("100"),this.dxfContent.push("AcDbPolyline"),this.dxfContent.push("90"),this.dxfContent.push("4"),this.dxfContent.push("70"),this.dxfContent.push("1"),this.dxfContent.push("10"),this.dxfContent.push(h.toString()),this.dxfContent.push("20"),this.dxfContent.push(u.toString()),this.dxfContent.push("10"),this.dxfContent.push(d.toString()),this.dxfContent.push("20"),this.dxfContent.push(u.toString()),this.dxfContent.push("10"),this.dxfContent.push(d.toString()),this.dxfContent.push("20"),this.dxfContent.push(f.toString()),this.dxfContent.push("10"),this.dxfContent.push(h.toString()),this.dxfContent.push("20"),this.dxfContent.push(f.toString())}writeSVGPolygon(t,e,n,s,r){const a=(t.getAttribute("points")||"").trim().split(/\s+/).map(h=>{const[u,d]=h.split(",").map(Number);return{x:u+e,y:r(d+n)}});if(a.length<3)return;const l=this.ensureCounterClockwise(a),c=this.getNextHandle();this.dxfContent.push("0"),this.dxfContent.push("LWPOLYLINE"),this.dxfContent.push("5"),this.dxfContent.push(c),this.dxfContent.push("100"),this.dxfContent.push("AcDbEntity"),this.dxfContent.push("8"),this.dxfContent.push(s),this.dxfContent.push("6"),this.dxfContent.push("BYLAYER"),this.dxfContent.push("62"),this.dxfContent.push("256"),this.dxfContent.push("370"),this.dxfContent.push("-1"),this.dxfContent.push("100"),this.dxfContent.push("AcDbPolyline"),this.dxfContent.push("90"),this.dxfContent.push(l.length.toString()),this.dxfContent.push("70"),this.dxfContent.push("1"),l.forEach(h=>{this.dxfContent.push("10"),this.dxfContent.push(h.x.toString()),this.dxfContent.push("20"),this.dxfContent.push(h.y.toString())})}writeSVGPath(t,e,n,s,r){const o=t.getAttribute("d")||"",a=this.parseSVGPathSegments(o,e,n,r);a.length>0&&this.writePathAsPolyline(a,s)}writeSVGCircle(t,e,n,s,r){const o=parseFloat(t.getAttribute("cx")||0)+e,a=parseFloat(t.getAttribute("cy")||0)+n,l=parseFloat(t.getAttribute("r")||0),c=this.getNextHandle();this.dxfContent.push("0"),this.dxfContent.push("CIRCLE"),this.dxfContent.push("5"),this.dxfContent.push(c),this.dxfContent.push("100"),this.dxfContent.push("AcDbEntity"),this.dxfContent.push("8"),this.dxfContent.push(s),this.dxfContent.push("6"),this.dxfContent.push("BYLAYER"),this.dxfContent.push("62"),this.dxfContent.push("256"),this.dxfContent.push("370"),this.dxfContent.push("-1"),this.dxfContent.push("100"),this.dxfContent.push("AcDbCircle"),this.dxfContent.push("10"),this.dxfContent.push(o.toString()),this.dxfContent.push("20"),this.dxfContent.push(r(a).toString()),this.dxfContent.push("30"),this.dxfContent.push("0.0"),this.dxfContent.push("40"),this.dxfContent.push(l.toString())}writeResultPolygon(t,e="Default"){if(!t)return;const n=t.getAttribute("transform")||"";let s=0,r=0;if(n){const a=n.match(/translate\(([^,]+),\s*([^)]+)\)/);a&&(s=parseFloat(a[1])||0,r=parseFloat(a[2])||0)}const o=a=>-a;this.writeSVGPath(t,s,r,e,o)}writeObjects(){this.dxfContent.push("0"),this.dxfContent.push("SECTION"),this.dxfContent.push("2"),this.dxfContent.push("OBJECTS"),this.dxfContent.push("0"),this.dxfContent.push("ENDSEC")}writeEOF(){this.dxfContent.push("0"),this.dxfContent.push("EOF")}parseSVGPathSegments(t,e,n,s){const r=[],o=this.parseSVGPathCommands(t);let a=0,l=0,c=0,h=0;for(const u of o)switch(u.type){case"M":a=u.x+e,l=s(u.y+n),c=a,h=l;break;case"L":const d=u.x+e,f=s(u.y+n);r.push({type:"line",start:{x:a,y:l},end:{x:d,y:f}}),a=d,l=f;break;case"H":const g=u.x+e;r.push({type:"line",start:{x:a,y:l},end:{x:g,y:l}}),a=g;break;case"V":const x=s(u.y+n);r.push({type:"line",start:{x:a,y:l},end:{x:a,y:x}}),l=x;break;case"A":const m=a,p=l,y=u.x+e,_=s(u.y+n),v=this.svgArcToDXFArc(m,p,y,_,u.rx,u.ry,u.xAxisRotation,u.largeArcFlag,u.sweepFlag);v&&r.push({type:"arc",arc:v}),a=y,l=_;break;case"Z":(a!==c||l!==h)&&r.push({type:"line",start:{x:a,y:l},end:{x:c,y:h}}),a=c,l=h;break}return r}parseSVGPathCommands(t){const e=[],n=/([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi;let s;for(;(s=n.exec(t))!==null;){const r=s[1].toUpperCase(),o=s[2].trim().split(/[\s,]+/).map(Number);switch(r){case"M":case"L":e.push({type:r,x:o[0]||0,y:o[1]||0});break;case"H":e.push({type:r,x:o[0]||0});break;case"V":e.push({type:r,y:o[0]||0});break;case"A":e.push({type:r,rx:o[0]||0,ry:o[1]||0,xAxisRotation:o[2]||0,largeArcFlag:o[3]||0,sweepFlag:o[4]||0,x:o[5]||0,y:o[6]||0});break;case"Z":e.push({type:r});break}}return e}svgArcToDXFArc(t,e,n,s,r,o,a,l,c){if(Math.abs(r-o)>.001||Math.abs(a)>.001)return null;const h=r,u=n-t,d=s-e,f=Math.sqrt(u*u+d*d);if(f===0||h===0)return null;const g=f/2,x=Math.sqrt(h*h-g*g),m=(t+n)/2,p=(e+s)/2,y=-d/f,_=u/f,v=x*(c?-1:1),S=m+y*v,E=p+_*v;let M=Math.atan2(e-E,t-S)*(180/Math.PI),T=Math.atan2(s-E,n-S)*(180/Math.PI);const b=A=>(A%360+360)%360;return M=b(M),T=b(T),{centerX:S,centerY:E,radius:h,startAngle:M,endAngle:T,sweepFlag:c}}writePathAsPolyline(t,e){if(t.length===0)return;const n=[],s=[];let r;if(t[0].type==="arc"){const c=t[0].arc;r={x:c.centerX+c.radius*Math.cos(c.startAngle*Math.PI/180),y:c.centerY+c.radius*Math.sin(c.startAngle*Math.PI/180)}}else r=t[0].start;n.push(r),s.push(0);for(let c=0;c<t.length;c++){const h=t[c];if(h.type==="line")n.push(h.end),s.push(0),r=h.end;else if(h.type==="arc"){const u=h.arc,d=this.calculateBulge(u);s[s.length-1]=d;const f={x:u.centerX+u.radius*Math.cos(u.endAngle*Math.PI/180),y:u.centerY+u.radius*Math.sin(u.endAngle*Math.PI/180)};n.push(f),s.push(0),r=f}}const o=.01,a=n.length>2&&Math.abs(n[n.length-1].x-n[0].x)<o&&Math.abs(n[n.length-1].y-n[0].y)<o;a&&(n.pop(),s.pop());const l=this.getNextHandle();this.dxfContent.push("0"),this.dxfContent.push("LWPOLYLINE"),this.dxfContent.push("5"),this.dxfContent.push(l),this.dxfContent.push("100"),this.dxfContent.push("AcDbEntity"),this.dxfContent.push("8"),this.dxfContent.push(e),this.dxfContent.push("6"),this.dxfContent.push("BYLAYER"),this.dxfContent.push("62"),this.dxfContent.push("256"),this.dxfContent.push("370"),this.dxfContent.push("-1"),this.dxfContent.push("100"),this.dxfContent.push("AcDbPolyline"),this.dxfContent.push("90"),this.dxfContent.push(n.length.toString()),this.dxfContent.push("70"),this.dxfContent.push(a?"1":"0");for(let c=0;c<n.length;c++)this.dxfContent.push("10"),this.dxfContent.push(n[c].x.toString()),this.dxfContent.push("20"),this.dxfContent.push(n[c].y.toString()),s[c]!==0&&(this.dxfContent.push("42"),this.dxfContent.push(s[c].toString()))}calculateBulge(t){let e=Math.abs(t.endAngle-t.startAngle);e>180&&(e=360-e);const n=e*Math.PI/180,s=Math.tan(n/4);return t.sweepFlag?-s:s}ensureCounterClockwise(t){if(t.length<3)return t;let e=0;for(let n=0;n<t.length;n++){const s=(n+1)%t.length;e+=t[n].x*t[s].y-t[s].x*t[n].y}return e<0?t.slice().reverse():t}colorToDXFIndex(t){if(!t)return{r:255,g:255,b:255};if(typeof t=="number")return t;let e,n,s;if(t.startsWith("#")){const r=t.slice(1);e=parseInt(r.slice(0,2),16),n=parseInt(r.slice(2,4),16),s=parseInt(r.slice(4,6),16)}else if(t.startsWith("rgba")||t.startsWith("rgb")){const r=t.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);r&&(e=parseInt(r[1]),n=parseInt(r[2]),s=parseInt(r[3]))}return e!==void 0&&n!==void 0&&s!==void 0?{r:e,g:n,b:s}:{r:255,g:255,b:255}}getNextHandle(){const t=this.handleCounter.toString(16).toUpperCase();return this.handleCounter++,t}downloadDXF(t,e="facade_design.dxf"){const n=new Blob([t],{type:"application/dxf"}),s=document.createElement("a");s.href=URL.createObjectURL(n),s.download=e,document.body.appendChild(s),s.click(),document.body.removeChild(s)}}class kp{constructor(){this.EPSILON=1e-6}calculateOffset(t,e){if(!t||t.length<3)return t;const n=this.ensureClosed(t),s=[];for(let a=0;a<n.length-1;a++){const l=n[a],c=n[a+1],h=this.calculateEdgeOffset(l,c,e);h&&s.push(h)}const r=[];for(let a=0;a<s.length;a++){const l=s[a],c=s[(a+1)%s.length],h=this.findIntersection(l,c);if(h)r.push(h);else{const u={x:(l.end.x+c.start.x)/2,y:(l.end.y+c.start.y)/2};r.push(u)}}const o=this.removeDuplicatePoints(r);return this.ensureCounterClockwise(o)}ensureClosed(t){if(t.length===0)return t;const e=t[0],n=t[t.length-1];return Math.abs(e.x-n.x)>this.EPSILON||Math.abs(e.y-n.y)>this.EPSILON?[...t,{x:e.x,y:e.y}]:t}calculateEdgeOffset(t,e,n){const s=e.x-t.x,r=e.y-t.y,o=Math.sqrt(s*s+r*r);if(o<this.EPSILON)return null;const a=-r/o,l=s/o,c={x:t.x+a*n,y:t.y+l*n},h={x:e.x+a*n,y:e.y+l*n};return{start:c,end:h}}findIntersection(t,e){const n=t.start,s=t.end,r=e.start,o=e.end,a=(n.x-s.x)*(r.y-o.y)-(n.y-s.y)*(r.x-o.x);if(Math.abs(a)<this.EPSILON)return null;const l=((n.x-r.x)*(r.y-o.y)-(n.y-r.y)*(r.x-o.x))/a,c=-((n.x-s.x)*(n.y-r.y)-(n.y-s.y)*(n.x-r.x))/a;return l>=0&&l<=1&&c>=0&&c<=1?{x:n.x+l*(s.x-n.x),y:n.y+l*(s.y-n.y)}:null}removeDuplicatePoints(t){const e=[],n=this.EPSILON;for(const s of t){let r=!1;for(const o of e)if(Math.abs(s.x-o.x)<n&&Math.abs(s.y-o.y)<n){r=!0;break}r||e.push(s)}return e}ensureCounterClockwise(t){if(t.length<3)return t;let e=0;for(let n=0;n<t.length;n++){const s=(n+1)%t.length;e+=t[n].x*t[s].y-t[s].x*t[n].y}return e<0&&t.reverse(),t}rectToPoints(t){const e=parseFloat(t.getAttribute("x"))||0,n=parseFloat(t.getAttribute("y"))||0,s=parseFloat(t.getAttribute("width"))||0,r=parseFloat(t.getAttribute("height"))||0;return[{x:e,y:n},{x:e+s,y:n},{x:e+s,y:n+r},{x:e,y:n+r},{x:e,y:n}]}}const er=require("makerjs");function zp(i){if(!i)return null;const t=i.tagName.toLowerCase();if(t==="path")return i.getAttribute("d");if(t==="rect"){const e=parseFloat(i.getAttribute("x"))||0,n=parseFloat(i.getAttribute("y"))||0,s=parseFloat(i.getAttribute("width"))||0,r=parseFloat(i.getAttribute("height"))||0;return`M ${e} ${n} L ${e+s} ${n} L ${e+s} ${n+r} L ${e} ${n+r} Z`}else if(t==="polygon"){const e=i.getAttribute("points").trim().split(/\s+/),n=[];for(let s=0;s<e.length;s+=2)n.push(`${e[s]},${e[s+1]}`);return`M ${n.join(" L ")} Z`}else return i.getAttribute("d")||null}function Jh(i,t={}){let e,n=0,s=0;if(i.group){e=i.group.querySelector(".bit-shape");const a=i.group.getAttribute("transform");if(a){const l=a.match(/translate\(([^,]+),\s*([^)]+)\)/);l&&(n=parseFloat(l[1]),s=-parseFloat(l[2]))}}else e=i,n=t.x||0,s=t.y||0;const r=zp(e);if(!r)return null;const o=er.importer.fromSVGPathData(r);return(n!==0||s!==0)&&er.model.move(o,[n,s]),o}function Vp(i,t,e,n,s){const r=document.getElementById("panel-section"),o=Jh(r,{x:0,y:0});if(!o)return console.error("Failed to create panel model"),"";const a=s.map(x=>Jh(x)).filter(x=>x);if(a.length===0){const x=er.exporter.toSVG(o),y=new DOMParser().parseFromString(x,"image/svg+xml").querySelector("path");return y?y.getAttribute("d"):""}let l=a[0];for(let x=1;x<a.length;x++)l=er.model.combineUnion(l,a[x]);const c={origin:[0,0],models:{main:o,subtract:l}},h=er.model.combineSubtraction(c.models.main,c.models.subtract),u=er.exporter.toSVG(h),g=new DOMParser().parseFromString(u,"image/svg+xml").querySelector("path");return g?g.getAttribute("d"):""}const Re={DEBUG:"DEBUG",INFO:"INFO",WARN:"WARN",ERROR:"ERROR"};class Gp{constructor(t,e=Re.INFO){this.moduleName=t,this.logLevel=e,this.logs=[],this.maxLogs=1e3}_formatMessage(t,...e){return{prefix:`[${new Date().toISOString().split("T")[1].split(".")[0]}] [${this.moduleName}:${t}]`,args:e}}_shouldLog(t){const e=[Re.DEBUG,Re.INFO,Re.WARN,Re.ERROR];return e.indexOf(t)>=e.indexOf(this.logLevel)}_storeLog(t,e,n){this.logs.push({timestamp:Date.now(),level:t,prefix:e,args:n}),this.logs.length>this.maxLogs&&this.logs.shift()}debug(...t){if(!this._shouldLog(Re.DEBUG))return;const{prefix:e}=this._formatMessage(Re.DEBUG);console.debug(e,...t),this._storeLog(Re.DEBUG,e,t)}info(...t){if(!this._shouldLog(Re.INFO))return;const{prefix:e}=this._formatMessage(Re.INFO);console.info(e,...t),this._storeLog(Re.INFO,e,t)}warn(...t){if(!this._shouldLog(Re.WARN))return;const{prefix:e}=this._formatMessage(Re.WARN);console.warn(e,...t),this._storeLog(Re.WARN,e,t)}error(...t){if(!this._shouldLog(Re.ERROR))return;const{prefix:e}=this._formatMessage(Re.ERROR);console.error(e,...t),this._storeLog(Re.ERROR,e,t)}getLogs(t={}){let e=this.logs;return t.level&&(e=e.filter(n=>n.level===t.level)),t.since&&(e=e.filter(n=>n.timestamp>t.since)),e}clearLogs(){this.logs=[]}exportLogs(){return JSON.stringify(this.logs,null,2)}setLogLevel(t){Re[t]&&(this.logLevel=t)}}class Yn{static createLogger(t,e=Re.INFO){return this.loggers.has(t)||this.loggers.set(t,new Gp(t,e)),this.loggers.get(t)}static getLogger(t){return this.loggers.get(t)||this.createLogger(t)}static getAllLogs(){const t={};return this.loggers.forEach((e,n)=>{t[n]=e.getLogs()}),t}static setGlobalLogLevel(t){this.loggers.forEach(e=>e.setLogLevel(t))}static clearAllLogs(){this.loggers.forEach(t=>t.clearLogs())}}Yh(Yn,"loggers",new Map);class Hp{constructor(t={}){this.log=Yn.createLogger("AppState"),this.state={panelWidth:400,panelHeight:600,panelThickness:19,panelAnchor:"top-left",showPart:!1,bitsVisible:!0,shankVisible:!0,gridSize:1,isDraggingBit:!1,...t},this.log.info("Initialized",this.state)}get(t){return this.state[t]}set(t,e){this.state[t]!==e&&(this.state[t]=e,sr.emit(`state:${t}Changed`,e,this.state),this.log.debug(`state changed: ${t} ->`,e))}setPanelSize(t,e){this.set("panelWidth",t),this.set("panelHeight",e)}setPanelThickness(t){this.set("panelThickness",t)}setPanelAnchor(t){this.set("panelAnchor",t)}setShowPart(t){this.set("showPart",t)}setBitsVisible(t){this.set("bitsVisible",t)}setShankVisible(t){this.set("shankVisible",t)}setGridSize(t){this.set("gridSize",t)}setDraggingBit(t){this.set("isDraggingBit",t)}}const qn=new Hp;class Wp{constructor({delay:t=200}={}){this.delay=t,this.timer=null,this.applyFn=null,this.log=Yn.createLogger("CSGScheduler")}configure(t){this.applyFn=t,this.log.info("Configured CSGScheduler")}cancel(){this.timer&&(clearTimeout(this.timer),this.timer=null,sr.emit("csg:cancelled"),this.log.debug("Cancelled pending CSG schedule"))}schedule(t=!0){if(!this.applyFn){this.log.warn("applyFn not configured; skipping schedule");return}this.timer&&clearTimeout(this.timer),sr.emit("csg:scheduled",{apply:t,delay:this.delay}),this.timer=setTimeout(()=>{this.timer=null;try{this.applyFn(t),sr.emit("csg:applied",{apply:t}),this.log.debug("CSG applied",{apply:t})}catch(e){this.log.error("Error applying CSG:",e)}},this.delay)}}const Ei=new Wp;class Xp{constructor(t,e,n={}){this.canvas=t,this.canvasManager=e,this.log=Yn.createLogger("InteractionManager"),this.autoScrollSpeed=n.autoScrollSpeed||50,this.autoScrollThreshold=n.autoScrollThreshold||50,this.bitTolerance=n.bitTolerance||20,this.touchTolerance=n.touchTolerance||30,this.isPanning=!1,this.isDraggingBit=!1,this.dragStarted=!1,this.isTouchDragging=!1,this.isTouchPanning=!1,this.isPinching=!1,this.autoScrollActive=!1,this.draggedBitIndex=null,this.dragStartX=0,this.dragStartY=0,this.panStartX=0,this.panStartY=0,this.panStartPanX=0,this.panStartPanY=0,this.touchIdentifier=null,this.touchDragStartX=0,this.touchDragStartY=0,this.touchPanStartX=0,this.touchPanStartY=0,this.touchPanStartPanX=0,this.touchPanStartPanY=0,this.initialPinchDistance=0,this.initialZoomLevel=1,this.lastTapTime=0,this.lastTapX=0,this.lastTapY=0,this.autoScrollInterval=null,this.callbacks={getBitsOnCanvas:null,getSelectedBitIndices:null,selectBit:null,resetBitHighlight:null,updateBitPosition:null,updateTableCoordinates:null,updatePartShape:null,getAnchorOffset:null,getPanelAnchorCoords:null,updateBitsSheet:null,redrawBitsOnCanvas:null,getBitsVisible:null,getShowPart:null,getThreeModule:null,getCsgScheduler:null},this.initializeEventListeners(),this.log.info("InteractionManager initialized")}setCallbacks(t){Object.assign(this.callbacks,t)}initializeEventListeners(){this.canvas.addEventListener("mousedown",this.handleMouseDown.bind(this)),this.canvas.addEventListener("mousemove",this.handleMouseMove.bind(this)),this.canvas.addEventListener("mouseup",this.handleMouseUp.bind(this)),this.canvas.addEventListener("mouseleave",this.handleMouseUp.bind(this)),this.canvas.addEventListener("touchstart",this.handleTouchStart.bind(this),{passive:!1}),this.canvas.addEventListener("touchmove",this.handleTouchMove.bind(this),{passive:!1}),this.canvas.addEventListener("touchend",this.handleTouchEnd.bind(this),{passive:!1}),this.canvas.addEventListener("touchcancel",this.handleTouchEnd.bind(this),{passive:!1}),this.canvas.addEventListener("gesturestart",this.handleGestureStart.bind(this),{passive:!1}),this.canvas.addEventListener("gesturechange",this.handleGestureChange.bind(this),{passive:!1}),this.canvas.addEventListener("gestureend",this.handleGestureEnd.bind(this),{passive:!1})}handleMouseDown(t){var a,l,c,h,u,d,f,g,x,m,p,y,_,v,S;if(t.button!==0)return;const e=this.canvasManager.screenToSvg(t.clientX,t.clientY);let n=!1;const s=((l=(a=this.callbacks).getBitsOnCanvas)==null?void 0:l.call(a))||[],r=((h=(c=this.callbacks).getSelectedBitIndices)==null?void 0:h.call(c))||[];if(((d=(u=this.callbacks).getBitsVisible)==null?void 0:d.call(u))??!0)for(let E=0;E<s.length;E++){const M=s[E];if(M!=null&&M.group){const T=M.group.querySelector(".bit-shape");if(T){const b=M.group.getAttribute("transform");let A=0,D=0;if(b){const F=b.match(/translate\(([^,]+),\s*([^)]+)\)/);F&&(A=parseFloat(F[1])||0,D=parseFloat(F[2])||0)}const I=e.x-A,U=e.y-D;if(T.isPointInFill(new DOMPoint(I,U))){const F=M.baseAbsX+A,V=M.baseAbsY+D;if(Math.sqrt((e.x-F)**2+(e.y-V)**2)<=this.bitTolerance)if(n=!0,r.includes(E)){this.isDraggingBit=!0,this.draggedBitIndex=E,(x=(g=(f=this.callbacks).getCsgScheduler)==null?void 0:g.call(f))==null||x.cancel(),this.log.debug("Cancelled pending CSG due to drag start"),this.dragStartX=e.x,this.dragStartY=e.y,this.dragStarted=!1,this.canvas.style.cursor="pointer";return}else{(p=(m=this.callbacks).selectBit)==null||p.call(m,E);return}}}}}!n&&r.length>0&&(r.forEach(E=>{var M,T;(T=(M=this.callbacks).resetBitHighlight)==null||T.call(M,E)}),r.length=0,(_=(y=this.callbacks).updateBitsSheet)==null||_.call(y),(S=(v=this.callbacks).redrawBitsOnCanvas)==null||S.call(v)),this.isPanning=!0,this.panStartX=t.clientX,this.panStartY=t.clientY,this.panStartPanX=this.canvasManager.panX,this.panStartPanY=this.canvasManager.panY,this.canvas.style.cursor="grabbing"}handleMouseMove(t){var e,n,s,r,o,a,l,c,h,u,d,f,g,x,m,p,y;if(this.isDraggingBit&&this.draggedBitIndex!==null){this.dragStarted=!0,window.isDraggingBit=!0,(s=(n=(e=this.callbacks).getCsgScheduler)==null?void 0:n.call(e))==null||s.cancel();const _=(o=(r=this.callbacks).getThreeModule)==null?void 0:o.call(r),v=(l=(a=this.callbacks).getShowPart)==null?void 0:l.call(a);_&&v&&_.showBasePanel();const S=this.canvasManager.screenToSvg(t.clientX,t.clientY),M=(((h=(c=this.callbacks).getBitsOnCanvas)==null?void 0:h.call(c))||[])[this.draggedBitIndex],T=((d=(u=this.callbacks).getAnchorOffset)==null?void 0:d.call(u,M))||{x:0,y:0},b=((g=(f=this.callbacks).getPanelAnchorCoords)==null?void 0:g.call(f))||{x:0,y:0};let A=S.x-b.x,D=S.y-b.y;A=this.canvasManager.snapToGrid(A),D=this.canvasManager.snapToGrid(D);let I=A-T.x,U=D-T.y;this.checkAutoScroll(t.clientX,t.clientY),(m=(x=this.callbacks).updateBitPosition)==null||m.call(x,this.draggedBitIndex,I,U),(y=(p=this.callbacks).updateTableCoordinates)==null||y.call(p,this.draggedBitIndex,I,U)}else if(this.isPanning){const _=t.clientX-this.panStartX,v=t.clientY-this.panStartY,S=_/this.canvasManager.zoomLevel,E=v/this.canvasManager.zoomLevel;this.canvasManager.panX=this.panStartPanX-S,this.canvasManager.panY=this.panStartPanY-E,this.canvasManager.updateViewBox()}}handleMouseUp(t){var e,n,s,r,o,a,l,c,h,u,d;if(this.isDraggingBit){this.isDraggingBit=!1,window.isDraggingBit=!1,!this.dragStarted&&this.draggedBitIndex!==null&&((n=(e=this.callbacks).selectBit)==null||n.call(e,this.draggedBitIndex)),this.draggedBitIndex=null,this.dragStarted=!1,this.canvas.style.cursor="grab";const f=(r=(s=this.callbacks).getShowPart)==null?void 0:r.call(s);f&&((a=(o=this.callbacks).updatePartShape)==null||a.call(o));const g=(c=(l=this.callbacks).getThreeModule)==null?void 0:c.call(l);g&&f&&(g.showBasePanel(),this.log.debug("CSG debounce timer fired after drag end"),(d=(u=(h=this.callbacks).getCsgScheduler)==null?void 0:u.call(h))==null||d.schedule(!0))}else this.isPanning&&(this.isPanning=!1,this.canvas.style.cursor="grab")}handleTouchStart(t){var e,n,s,r,o,a,l,c,h,u,d,f;if(t.preventDefault(),t.touches.length===1){const g=t.touches[0],x=this.canvasManager.screenToSvg(g.clientX,g.clientY);let m=!1;const p=((n=(e=this.callbacks).getBitsOnCanvas)==null?void 0:n.call(e))||[],y=((r=(s=this.callbacks).getSelectedBitIndices)==null?void 0:r.call(s))||[];if(((a=(o=this.callbacks).getBitsVisible)==null?void 0:a.call(o))??!0)for(let v=0;v<p.length;v++){const S=p[v];if(S!=null&&S.group){const E=S.group.querySelector(".bit-shape");if(E){const M=S.group.getAttribute("transform");let T=0,b=0;if(M){const I=M.match(/translate\(([^,]+),\s*([^)]+)\)/);I&&(T=parseFloat(I[1])||0,b=parseFloat(I[2])||0)}const A=x.x-T,D=x.y-b;if(E.isPointInFill(new DOMPoint(A,D))){const I=S.baseAbsX+T,U=S.baseAbsY+b;if(Math.sqrt((x.x-I)**2+(x.y-U)**2)<=this.touchTolerance)if(m=!0,this.touchIdentifier=g.identifier,y.includes(v)){this.isTouchDragging=!0,this.draggedBitIndex=v,this.touchDragStartX=x.x,this.touchDragStartY=x.y,this.dragStarted=!1;return}else{(c=(l=this.callbacks).selectBit)==null||c.call(l,v);return}}}}}m||(y.length>0&&(y.forEach(v=>{var S,E;(E=(S=this.callbacks).resetBitHighlight)==null||E.call(S,v)}),y.length=0,(u=(h=this.callbacks).updateBitsSheet)==null||u.call(h),(f=(d=this.callbacks).redrawBitsOnCanvas)==null||f.call(d)),this.isTouchPanning=!0,this.touchPanStartX=g.clientX,this.touchPanStartY=g.clientY,this.touchPanStartPanX=this.canvasManager.panX,this.touchPanStartPanY=this.canvasManager.panY)}}handleTouchMove(t){var e,n,s,r,o,a,l,c,h,u;if(t.preventDefault(),this.isTouchDragging&&t.touches.length===1){const d=Array.from(t.touches).find(E=>E.identifier===this.touchIdentifier);if(!d)return;this.dragStarted=!0;const f=this.canvasManager.screenToSvg(d.clientX,d.clientY),x=(((n=(e=this.callbacks).getBitsOnCanvas)==null?void 0:n.call(e))||[])[this.draggedBitIndex],m=((r=(s=this.callbacks).getAnchorOffset)==null?void 0:r.call(s,x))||{x:0,y:0},p=((a=(o=this.callbacks).getPanelAnchorCoords)==null?void 0:a.call(o))||{x:0,y:0};let y=f.x-p.x,_=f.y-p.y;y=this.canvasManager.snapToGrid(y),_=this.canvasManager.snapToGrid(_);let v=y-m.x,S=_-m.y;this.checkAutoScroll(d.clientX,d.clientY),(c=(l=this.callbacks).updateBitPosition)==null||c.call(l,this.draggedBitIndex,v,S),(u=(h=this.callbacks).updateTableCoordinates)==null||u.call(h,this.draggedBitIndex,v,S)}else if(this.isTouchPanning&&t.touches.length===1){const d=t.touches[0],f=d.clientX-this.touchPanStartX,g=d.clientY-this.touchPanStartY,x=f/this.canvasManager.zoomLevel,m=g/this.canvasManager.zoomLevel;this.canvasManager.panX=this.touchPanStartPanX-x,this.canvasManager.panY=this.touchPanStartPanY-m,this.canvasManager.updateViewBox()}}handleTouchEnd(t){var n,s,r,o,a,l,c,h,u,d,f;if(Array.from(t.changedTouches).find(g=>g.identifier===this.touchIdentifier))if(this.isTouchDragging){this.isTouchDragging=!1,!this.dragStarted&&this.draggedBitIndex!==null&&((s=(n=this.callbacks).selectBit)==null||s.call(n,this.draggedBitIndex)),this.draggedBitIndex=null,this.dragStarted=!1,this.touchIdentifier=null;const g=(o=(r=this.callbacks).getShowPart)==null?void 0:o.call(r);g&&((l=(a=this.callbacks).updatePartShape)==null||l.call(a));const x=(h=(c=this.callbacks).getThreeModule)==null?void 0:h.call(c);x&&g&&(x.showBasePanel(),(f=(d=(u=this.callbacks).getCsgScheduler)==null?void 0:d.call(u))==null||f.schedule(!0))}else this.isTouchPanning&&(this.isTouchPanning=!1,this.touchIdentifier=null)}handleGestureStart(t){t.preventDefault(),this.isPinching=!0,this.initialZoomLevel=this.canvasManager.zoomLevel}handleGestureChange(t){if(t.preventDefault(),this.isPinching){const e=this.initialZoomLevel*t.scale,n=Math.max(.1,Math.min(10,e));this.canvasManager.setZoom(n)}}handleGestureEnd(t){t.preventDefault(),this.isPinching=!1}checkAutoScroll(t,e){const n=this.canvas.getBoundingClientRect(),s=this.autoScrollThreshold;let r=0,o=0;t<n.left+s?r=-1:t>n.right-s&&(r=1),e<n.top+s?o=-1:e>n.bottom-s&&(o=1),r!==0||o!==0?this.autoScrollActive||this.startAutoScroll(r,o):this.autoScrollActive&&this.stopAutoScroll()}startAutoScroll(t,e){this.autoScrollActive=!0;const n=this.autoScrollSpeed/this.canvasManager.zoomLevel;this.autoScrollInterval=setInterval(()=>{this.canvasManager.panX+=t*n,this.canvasManager.panY+=e*n,this.canvasManager.updateViewBox()},16)}stopAutoScroll(){this.autoScrollActive=!1,this.autoScrollInterval&&(clearInterval(this.autoScrollInterval),this.autoScrollInterval=null)}destroy(){this.stopAutoScroll(),this.canvas.removeEventListener("mousedown",this.handleMouseDown),this.canvas.removeEventListener("mousemove",this.handleMouseMove),this.canvas.removeEventListener("mouseup",this.handleMouseUp),this.canvas.removeEventListener("mouseleave",this.handleMouseUp),this.canvas.removeEventListener("touchstart",this.handleTouchStart),this.canvas.removeEventListener("touchmove",this.handleTouchMove),this.canvas.removeEventListener("touchend",this.handleTouchEnd),this.canvas.removeEventListener("touchcancel",this.handleTouchEnd),this.canvas.removeEventListener("gesturestart",this.handleGestureStart),this.canvas.removeEventListener("gesturechange",this.handleGestureChange),this.canvas.removeEventListener("gestureend",this.handleGestureEnd),this.log.info("InteractionManager destroyed")}}const ho="http://www.w3.org/2000/svg",qa=Yn.createLogger("PanelManager");class Yp{constructor(t){this.canvas=t.canvas,this.canvasManager=t.canvasManager,this.bitsManager=t.bitsManager,this.panelWidth=t.panelWidth||400,this.panelHeight=t.panelHeight||600,this.panelThickness=t.panelThickness||19,this.panelAnchor=t.panelAnchor||"top-left",this.gridSize=t.gridSize||1,this.partSection=null,this.partFront=null,this.panelWidthInput=document.getElementById("panel-width"),this.panelHeightInput=document.getElementById("panel-height"),this.panelThicknessInput=document.getElementById("panel-thickness"),this.onPanelUpdate=t.onPanelUpdate||(()=>{}),this.onAnchorChange=t.onAnchorChange||(()=>{}),this.getAdaptiveStrokeWidth=t.getAdaptiveStrokeWidth||(()=>1),this.updatePartShape=t.updatePartShape||(()=>{}),this.updateOffsetContours=t.updateOffsetContours||(()=>{}),this.updatePhantomBits=t.updatePhantomBits||(()=>{}),this.updateBitsSheet=t.updateBitsSheet||(()=>{}),qa.info("PanelManager initialized")}initializeSVGElements(){this.partSection=document.createElementNS(ho,"rect"),this.partFront=document.createElementNS(ho,"rect");const t=this.canvasManager.getLayer("panel");if(t)this.partSection.id="panel-section",this.partFront.id="part-front",t.appendChild(this.partSection),t.appendChild(this.partFront);else{const e=this.canvas.querySelector("svg");e&&(e.appendChild(this.partSection),e.appendChild(this.partFront))}this.updatePanelShape()}getPanelAnchorOffset(){return this.panelAnchor==="top-left"?{x:0,y:0}:this.panelAnchor==="bottom-left"?{x:0,y:this.panelThickness}:{x:0,y:0}}transformYForDisplay(t,e){return this.panelAnchor==="bottom-left"?t-this.panelThickness:t}transformYFromDisplay(t,e){return this.panelAnchor==="bottom-left"?t+this.panelThickness:t}getPanelAnchorCoords(){const t=(this.canvasManager.canvasParameters.width-this.panelWidth)/2,e=(this.canvasManager.canvasParameters.height-this.panelThickness)/2,n=this.getPanelAnchorOffset();return{x:t+n.x,y:e+n.y}}cyclePanelAnchor(){this.panelAnchor=this.panelAnchor==="top-left"?"bottom-left":"top-left";const t=document.getElementById("panel-anchor-btn");t&&(t.innerHTML=""),this.onAnchorChange(this.panelAnchor),qa.debug(`Panel anchor changed to: ${this.panelAnchor}`)}updatePanelShape(){const t=(this.canvasManager.canvasParameters.width-this.panelWidth)/2,e=(this.canvasManager.canvasParameters.height-this.panelThickness)/2;this.partSection.setAttribute("x",t),this.partSection.setAttribute("y",e),this.partSection.setAttribute("width",this.panelWidth),this.partSection.setAttribute("height",this.panelThickness),this.partSection.setAttribute("fill","rgba(155, 155, 155, 0.16)"),this.partSection.setAttribute("stroke","black"),this.updatePartFront(),this.updatePanelAnchorIndicator(),this.onPanelUpdate()}updatePartFront(){const t=(this.canvasManager.canvasParameters.width-this.panelWidth)/2,e=(this.canvasManager.canvasParameters.height-this.panelThickness)/2;this.partFront.setAttribute("x",t),this.partFront.setAttribute("y",e-this.panelHeight-100),this.partFront.setAttribute("width",this.panelWidth),this.partFront.setAttribute("height",this.panelHeight),this.partFront.setAttribute("fill","rgba(155, 155, 155, 0.16)"),this.partFront.setAttribute("stroke","black"),this.partFront.setAttribute("stroke-width",this.getAdaptiveStrokeWidth())}updatePanelAnchorIndicator(){const t=document.getElementById("panel-anchor-indicator");if(!t)return;t.innerHTML="";const e=(this.canvasManager.canvasParameters.width-this.panelWidth)/2,n=(this.canvasManager.canvasParameters.height-this.panelThickness)/2;let s,r;this.panelAnchor==="top-left"?(s=e,r=n):this.panelAnchor==="bottom-left"&&(s=e,r=n+this.panelThickness);const o=5,a=Math.max(.1,.5/Math.sqrt(this.canvasManager.zoomLevel)),l=document.createElementNS(ho,"line");l.setAttribute("x1",s-o),l.setAttribute("y1",r),l.setAttribute("x2",s+o),l.setAttribute("y2",r),l.setAttribute("stroke","red"),l.setAttribute("stroke-width",a),t.appendChild(l);const c=document.createElementNS(ho,"line");c.setAttribute("x1",s),c.setAttribute("y1",r-o),c.setAttribute("x2",s),c.setAttribute("y2",r+o),c.setAttribute("stroke","red"),c.setAttribute("stroke-width",a),t.appendChild(c)}updateGridAnchor(){const t=(this.canvasManager.canvasParameters.width-this.panelWidth)/2,e=(this.canvasManager.canvasParameters.height-this.panelThickness)/2,n=this.getPanelAnchorOffset(),s=t+n.x+this.gridSize/2,r=e+n.y+this.gridSize/2;this.canvasManager&&this.canvasManager.config&&(this.canvasManager.config.gridAnchorX=s,this.canvasManager.config.gridAnchorY=r,this.canvasManager.gridEnabled&&this.canvasManager.drawGrid())}updatePanelParams(){this.panelWidth=parseInt(this.panelWidthInput.value)||this.panelWidth,this.panelHeight=parseInt(this.panelHeightInput.value)||this.panelHeight,this.panelThickness=parseInt(this.panelThicknessInput.value)||this.panelThickness,this.updatePanelShape(),this.updateGridAnchor(),this.updateOffsetContours(),this.updatePhantomBits(),this.updatePartShape(),qa.debug(`Panel params updated: ${this.panelWidth}x${this.panelHeight}x${this.panelThickness}`)}getWidth(){return this.panelWidth}getHeight(){return this.panelHeight}getThickness(){return this.panelThickness}getAnchor(){return this.panelAnchor}setWidth(t){this.panelWidth=t,this.panelWidthInput&&(this.panelWidthInput.value=t),this.updatePanelShape()}setHeight(t){this.panelHeight=t,this.panelHeightInput&&(this.panelHeightInput.value=t),this.updatePanelShape()}setThickness(t){this.panelThickness=t,this.panelThicknessInput&&(this.panelThicknessInput.value=t),this.updatePanelShape()}setAnchor(t){this.panelAnchor=t,this.updatePanelAnchorIndicator(),this.updateGridAnchor()}setCallbacks(t){t.onPanelUpdate&&(this.onPanelUpdate=t.onPanelUpdate),t.onAnchorChange&&(this.onAnchorChange=t.onAnchorChange),t.getAdaptiveStrokeWidth&&(this.getAdaptiveStrokeWidth=t.getAdaptiveStrokeWidth),t.updatePartShape&&(this.updatePartShape=t.updatePartShape),t.updateOffsetContours&&(this.updateOffsetContours=t.updateOffsetContours),t.updatePhantomBits&&(this.updatePhantomBits=t.updatePhantomBits),t.updateBitsSheet&&(this.updateBitsSheet=t.updateBitsSheet)}}class qp{constructor(){this.services={},this.factories={},this.instances={}}registerService(t,e,n=!0){if(this.services[t]){console.warn(`Service ${t} is already registered`);return}this.services[t]={factory:e,singleton:n}}registerFactory(t,e){if(this.factories[t]){console.warn(`Factory ${t} is already registered`);return}this.factories[t]=e}get(t){if(this.services[t]){const{factory:e,singleton:n}=this.services[t];return n?(this.instances[t]||(this.instances[t]=e(this)),this.instances[t]):e(this)}if(this.factories[t])return this.factories[t](this);throw new Error(`Service or factory ${t} not found`)}has(t){return!!this.services[t]||!!this.factories[t]}reset(){this.instances={}}}const $p=new qp;class Zp{constructor(){this.container=$p,this.eventBus=sr,this.modules=[],this.initialized=!1}registerModule(t,e){this.container.registerService(e,t),this.modules.push(e)}async initialize(){if(this.initialized){console.warn("Application already initialized");return}console.log("Initializing application...");for(const t of this.modules)try{const e=this.container.get(t);typeof e.initialize=="function"&&(await e.initialize(),console.log(`Module ${t} initialized`))}catch(e){throw console.error(`Failed to initialize module ${t}:`,e),e}this.initialized=!0,this.eventBus.emit("app:initialized"),console.log("Application initialized successfully")}async start(){this.initialized||await this.initialize(),this.eventBus.emit("app:started"),console.log("Application started")}getModule(t){return this.container.get(t)}async shutdown(){console.log("Shutting down application...");for(let t=this.modules.length-1;t>=0;t--){const e=this.modules[t];try{const n=this.container.get(e);typeof n.shutdown=="function"&&(await n.shutdown(),console.log(`Module ${e} shut down`))}catch(n){console.error(`Failed to shutdown module ${e}:`,n)}}this.eventBus.emit("app:shutdown"),this.container.reset(),this.initialized=!1,console.log("Application shut down successfully")}}const hn=new Zp;class jp extends ro{constructor(){super("canvas"),this.canvasManager=null,this.canvasElement=null}async initialize(){if(await super.initialize(),this.canvasElement=document.getElementById("canvas"),!this.canvasElement)throw new Error("Canvas element not found");this.waitForCanvasManager()}waitForCanvasManager(){const t=()=>{window.mainCanvasManager?(console.log("CanvasModule: Using existing CanvasManager from global scope"),this.canvasManager=window.mainCanvasManager,this.eventBus.emit("canvas:ready",{canvasManager:this.canvasManager})):setTimeout(t,10)};t()}getCanvasManager(){return this.canvasManager}getCanvasElement(){return this.canvasElement}setupEventListeners(){this.eventBus.on("app:initialized",()=>{console.log("App initialized, setting up canvas")})}cleanupEventListeners(){this.eventBus.off("app:initialized")}}class Kp extends ro{constructor(){super("bits"),this.bitsManager=null,this.canvasManager=null}async initialize(){await super.initialize(),this.waitForCanvasReady(),this.setupEventListeners()}waitForCanvasReady(){const t=()=>{var n;const e=((n=hn.getModule("canvas"))==null?void 0:n.getCanvasManager())||window.mainCanvasManager;e?(this.canvasManager=e,this.bitsManager=new ic(this.canvasManager),console.log("BitsModule initialized with BitsManager and CanvasManager")):setTimeout(t,10)};t()}getBitsManager(){return this.bitsManager}setCanvasManager(t){this.canvasManager=t,this.bitsManager?this.bitsManager.canvasManager=t:this.bitsManager=new ic(t)}setupEventListeners(){this.eventBus.on("canvas:ready",({canvasManager:t})=>{console.log("Canvas is ready, initializing bits manager"),this.setCanvasManager(t)}),this.eventBus.on("bits:add",t=>{console.log("Adding new bit:",t)})}cleanupEventListeners(){this.eventBus.off("canvas:ready"),this.eventBus.off("bits:add")}}class Jp extends ro{constructor(){super("ui"),this.leftPanelClickOutsideHandler=null,this.rightPanelClickOutsideHandler=null}initialize(){return super.initialize(),console.log("UIModule initialized"),this.initializeTheme(),this.setupResponsivePanels(),Promise.resolve()}toggleTheme(){const t=document.documentElement,e=document.getElementById("theme-toggle"),n=e.querySelector("svg");t.classList.contains("dark")?(t.classList.remove("dark"),localStorage.setItem("theme","light"),n.innerHTML='<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>',e.title="Switch to Dark Theme"):(t.classList.add("dark"),localStorage.setItem("theme","dark"),n.innerHTML='<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path>',e.title="Switch to Light Theme")}initializeTheme(){const t=localStorage.getItem("theme"),e=document.getElementById("theme-toggle"),n=e.querySelector("svg");t==="dark"?(document.documentElement.classList.add("dark"),n.innerHTML='<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path>',e.title="Switch to Light Theme"):(document.documentElement.classList.remove("dark"),n.innerHTML='<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>',e.title="Switch to Dark Theme")}toggleLeftPanel(){const t=document.getElementById("left-panel"),e=window.innerWidth<=768,n=this.isMobileDevice();e||n?t.classList.contains("overlay-visible")?(t.classList.remove("overlay-visible"),t.classList.add("collapsed"),t.style.display="none",this.leftPanelClickOutsideHandler&&(document.removeEventListener("click",this.leftPanelClickOutsideHandler),this.leftPanelClickOutsideHandler=null)):(t.classList.remove("collapsed"),t.classList.add("overlay-visible"),t.style.display="flex",this.leftPanelClickOutsideHandler=s=>{!t.contains(s.target)&&!s.target.closest("#app-header button")&&this.toggleLeftPanel()},setTimeout(()=>{document.addEventListener("click",this.leftPanelClickOutsideHandler)},10)):(t.classList.toggle("collapsed"),t.classList.remove("overlay-visible"),t.style.display=""),this.updateCanvasAfterPanelToggle()}toggleRightMenu(){const t=document.getElementById("right-menu");!t.classList.contains("collapsed")&&(window.innerWidth>1e3||t.style.display==="flex")?(t.classList.add("collapsed"),window.innerWidth<=1e3&&(t.style.display="none")):(t.classList.remove("collapsed"),window.innerWidth<=1e3&&(t.style.display="flex")),this.updateCanvasAfterPanelToggle()}updateCanvasAfterPanelToggle(){var o;const t=(o=this.app)==null?void 0:o.getModule("canvas");if(!t||!t.canvasManager)return;const e=t.canvasManager,n=e.canvasParameters.width,s=e.canvasParameters.height,r=document.getElementById("canvas");e.canvasParameters.width=r.getBoundingClientRect().width,e.canvasParameters.height=r.getBoundingClientRect().height,e.panX=e.panX/n*e.canvasParameters.width,e.panY=e.panY/s*e.canvasParameters.height,e.updateViewBox()}setupResponsivePanels(){window.addEventListener("resize",()=>{this.handleWindowResize()})}handleWindowResize(){var s;const t=(s=this.app)==null?void 0:s.getModule("canvas");t&&t.canvasManager&&(t.canvasManager.resize(),this.emit("canvas:resized"));const e=document.getElementById("left-panel"),n=document.getElementById("right-menu");window.innerWidth>768&&e&&(e.classList.remove("collapsed","overlay-visible"),e.style.display="",this.leftPanelClickOutsideHandler&&(document.removeEventListener("click",this.leftPanelClickOutsideHandler),this.leftPanelClickOutsideHandler=null)),window.innerWidth>1e3&&n&&(n.classList.remove("collapsed","overlay-visible"),n.style.display="",this.rightPanelClickOutsideHandler&&(document.removeEventListener("click",this.rightPanelClickOutsideHandler),this.rightPanelClickOutsideHandler=null)),this.updateCanvasAfterPanelToggle()}logOperation(t){const e=document.getElementById("operations-log");if(!e)return;const n=new Date().toLocaleTimeString();e.textContent=`[${n}] ${t}`,e.classList.remove("fade-out"),setTimeout(()=>{e.classList.add("fade-out")},5e3)}showAlert(t){alert(t)}showConfirm(t){return confirm(t)}createFileInput(t="*",e=null){const n=document.createElement("input");return n.type="file",n.accept=t,e&&(n.onchange=s=>e(s.target.files[0])),n.click(),n}isMobileDevice(){return/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||window.innerWidth<=768&&window.innerHeight<=1024}}/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const oo="182",rr={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},nr={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Qp=0,Qh=1,tm=2,da=1,nf=2,Fr=3,Dn=0,nn=1,Cn=2,bi=0,or=1,tu=2,eu=3,nu=4,em=5,ds=100,nm=101,im=102,sm=103,rm=104,om=200,am=201,lm=202,cm=203,sc=204,rc=205,hm=206,um=207,dm=208,fm=209,pm=210,mm=211,gm=212,xm=213,_m=214,oc=0,ac=1,lc=2,hr=3,cc=4,hc=5,uc=6,dc=7,sf=0,vm=1,ym=2,ti=0,rf=1,of=2,af=3,lf=4,cf=5,hf=6,uf=7,df=300,As=301,ur=302,fc=303,pc=304,Ia=306,mc=1e3,yi=1001,gc=1002,ze=1003,Sm=1004,uo=1005,qe=1006,$a=1007,_s=1008,_n=1009,ff=1010,pf=1011,$r=1012,uh=1013,ii=1014,Kn=1015,Ai=1016,dh=1017,fh=1018,Zr=1020,mf=35902,gf=35899,xf=1021,_f=1022,Wn=1023,wi=1026,vs=1027,vf=1028,ph=1029,dr=1030,mh=1031,gh=1033,fa=33776,pa=33777,ma=33778,ga=33779,xc=35840,_c=35841,vc=35842,yc=35843,Sc=36196,bc=37492,Mc=37496,Ec=37488,Ac=37489,wc=37490,Tc=37491,Cc=37808,Pc=37809,Rc=37810,Lc=37811,Dc=37812,Ic=37813,Nc=37814,Bc=37815,Uc=37816,Fc=37817,Oc=37818,kc=37819,zc=37820,Vc=37821,Gc=36492,Hc=36494,Wc=36495,Xc=36283,Yc=36284,qc=36285,$c=36286,bm=3200,yf=0,Mm=1,ki="",xn="srgb",fr="srgb-linear",Ma="linear",oe="srgb",Ls=7680,iu=519,Em=512,Am=513,wm=514,xh=515,Tm=516,Cm=517,_h=518,Pm=519,su=35044,ru="300 es",Jn=2e3,Ea=2001;function Sf(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function Aa(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Rm(){const i=Aa("canvas");return i.style.display="block",i}const ou={};function au(...i){const t="THREE."+i.shift();console.log(t,...i)}function Gt(...i){const t="THREE."+i.shift();console.warn(t,...i)}function ne(...i){const t="THREE."+i.shift();console.error(t,...i)}function jr(...i){const t=i.join(" ");t in ou||(ou[t]=!0,Gt(...i))}function Lm(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}class Ts{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){const n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){const n=this._listeners;if(n===void 0)return;const s=n[t];if(s!==void 0){const r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){const e=this._listeners;if(e===void 0)return;const n=e[t.type];if(n!==void 0){t.target=this;const s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,t);t.target=null}}}const Xe=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let lu=1234567;const ar=Math.PI/180,Kr=180/Math.PI;function Cs(){const i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Xe[i&255]+Xe[i>>8&255]+Xe[i>>16&255]+Xe[i>>24&255]+"-"+Xe[t&255]+Xe[t>>8&255]+"-"+Xe[t>>16&15|64]+Xe[t>>24&255]+"-"+Xe[e&63|128]+Xe[e>>8&255]+"-"+Xe[e>>16&255]+Xe[e>>24&255]+Xe[n&255]+Xe[n>>8&255]+Xe[n>>16&255]+Xe[n>>24&255]).toLowerCase()}function Yt(i,t,e){return Math.max(t,Math.min(e,i))}function vh(i,t){return(i%t+t)%t}function Dm(i,t,e,n,s){return n+(i-t)*(s-n)/(e-t)}function Im(i,t,e){return i!==t?(e-i)/(t-i):0}function Vr(i,t,e){return(1-e)*i+e*t}function Nm(i,t,e,n){return Vr(i,t,1-Math.exp(-e*n))}function Bm(i,t=1){return t-Math.abs(vh(i,t*2)-t)}function Um(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*(3-2*i))}function Fm(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*i*(i*(i*6-15)+10))}function Om(i,t){return i+Math.floor(Math.random()*(t-i+1))}function km(i,t){return i+Math.random()*(t-i)}function zm(i){return i*(.5-Math.random())}function Vm(i){i!==void 0&&(lu=i);let t=lu+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function Gm(i){return i*ar}function Hm(i){return i*Kr}function Wm(i){return(i&i-1)===0&&i!==0}function Xm(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Ym(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function qm(i,t,e,n,s){const r=Math.cos,o=Math.sin,a=r(e/2),l=o(e/2),c=r((t+n)/2),h=o((t+n)/2),u=r((t-n)/2),d=o((t-n)/2),f=r((n-t)/2),g=o((n-t)/2);switch(s){case"XYX":i.set(a*h,l*u,l*d,a*c);break;case"YZY":i.set(l*d,a*h,l*u,a*c);break;case"ZXZ":i.set(l*u,l*d,a*h,a*c);break;case"XZX":i.set(a*h,l*g,l*f,a*c);break;case"YXY":i.set(l*f,a*h,l*g,a*c);break;case"ZYZ":i.set(l*g,l*f,a*h,a*c);break;default:Gt("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function tr(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function Je(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const $m={DEG2RAD:ar,RAD2DEG:Kr,generateUUID:Cs,clamp:Yt,euclideanModulo:vh,mapLinear:Dm,inverseLerp:Im,lerp:Vr,damp:Nm,pingpong:Bm,smoothstep:Um,smootherstep:Fm,randInt:Om,randFloat:km,randFloatSpread:zm,seededRandom:Vm,degToRad:Gm,radToDeg:Hm,isPowerOfTwo:Wm,ceilPowerOfTwo:Xm,floorPowerOfTwo:Ym,setQuaternionFromProperEuler:qm,normalize:Je,denormalize:tr};class it{constructor(t=0,e=0){it.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Yt(this.x,t.x,e.x),this.y=Yt(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=Yt(this.x,t,e),this.y=Yt(this.y,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Yt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Yt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*n-o*s+t.x,this.y=r*s+o*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Ti{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,o,a){let l=n[s+0],c=n[s+1],h=n[s+2],u=n[s+3],d=r[o+0],f=r[o+1],g=r[o+2],x=r[o+3];if(a<=0){t[e+0]=l,t[e+1]=c,t[e+2]=h,t[e+3]=u;return}if(a>=1){t[e+0]=d,t[e+1]=f,t[e+2]=g,t[e+3]=x;return}if(u!==x||l!==d||c!==f||h!==g){let m=l*d+c*f+h*g+u*x;m<0&&(d=-d,f=-f,g=-g,x=-x,m=-m);let p=1-a;if(m<.9995){const y=Math.acos(m),_=Math.sin(y);p=Math.sin(p*y)/_,a=Math.sin(a*y)/_,l=l*p+d*a,c=c*p+f*a,h=h*p+g*a,u=u*p+x*a}else{l=l*p+d*a,c=c*p+f*a,h=h*p+g*a,u=u*p+x*a;const y=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=y,c*=y,h*=y,u*=y}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=u}static multiplyQuaternionsFlat(t,e,n,s,r,o){const a=n[s],l=n[s+1],c=n[s+2],h=n[s+3],u=r[o],d=r[o+1],f=r[o+2],g=r[o+3];return t[e]=a*g+h*u+l*f-c*d,t[e+1]=l*g+h*d+c*u-a*f,t[e+2]=c*g+h*f+a*d-l*u,t[e+3]=h*g-a*u-l*d-c*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const n=t._x,s=t._y,r=t._z,o=t._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(s/2),u=a(r/2),d=l(n/2),f=l(s/2),g=l(r/2);switch(o){case"XYZ":this._x=d*h*u+c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u-d*f*g;break;case"YXZ":this._x=d*h*u+c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u+d*f*g;break;case"ZXY":this._x=d*h*u-c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u-d*f*g;break;case"ZYX":this._x=d*h*u-c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u+d*f*g;break;case"YZX":this._x=d*h*u+c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u-d*f*g;break;case"XZY":this._x=d*h*u-c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u+d*f*g;break;default:Gt("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],s=e[4],r=e[8],o=e[1],a=e[5],l=e[9],c=e[2],h=e[6],u=e[10],d=n+a+u;if(d>0){const f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-l)*f,this._y=(r-c)*f,this._z=(o-s)*f}else if(n>a&&n>u){const f=2*Math.sqrt(1+n-a-u);this._w=(h-l)/f,this._x=.25*f,this._y=(s+o)/f,this._z=(r+c)/f}else if(a>u){const f=2*Math.sqrt(1+a-n-u);this._w=(r-c)/f,this._x=(s+o)/f,this._y=.25*f,this._z=(l+h)/f}else{const f=2*Math.sqrt(1+u-n-a);this._w=(o-s)/f,this._x=(r+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Yt(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,s=t._y,r=t._z,o=t._w,a=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+o*a+s*c-r*l,this._y=s*h+o*l+r*a-n*c,this._z=r*h+o*c+n*l-s*a,this._w=o*h-n*a-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){if(e<=0)return this;if(e>=1)return this.copy(t);let n=t._x,s=t._y,r=t._z,o=t._w,a=this.dot(t);a<0&&(n=-n,s=-s,r=-r,o=-o,a=-a);let l=1-e;if(a<.9995){const c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this._onChangeCallback()}else this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class N{constructor(t=0,e=0,n=0){N.prototype.isVector3=!0,this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(cu.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(cu.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,s=this.z,r=t.elements,o=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(t){const e=this.x,n=this.y,s=this.z,r=t.x,o=t.y,a=t.z,l=t.w,c=2*(o*s-a*n),h=2*(a*e-r*s),u=2*(r*n-o*e);return this.x=e+l*c+o*u-a*h,this.y=n+l*h+a*c-r*u,this.z=s+l*u+r*h-o*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Yt(this.x,t.x,e.x),this.y=Yt(this.y,t.y,e.y),this.z=Yt(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=Yt(this.x,t,e),this.y=Yt(this.y,t,e),this.z=Yt(this.z,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Yt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,s=t.y,r=t.z,o=e.x,a=e.y,l=e.z;return this.x=s*l-r*a,this.y=r*o-n*l,this.z=n*a-s*o,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return Za.copy(this).projectOnVector(t),this.sub(Za)}reflect(t){return this.sub(Za.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Yt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Za=new N,cu=new Ti;class Xt{constructor(t,e,n,s,r,o,a,l,c){Xt.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,l,c)}set(t,e,n,s,r,o,a,l,c){const h=this.elements;return h[0]=t,h[1]=s,h[2]=a,h[3]=e,h[4]=r,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],u=n[7],d=n[2],f=n[5],g=n[8],x=s[0],m=s[3],p=s[6],y=s[1],_=s[4],v=s[7],S=s[2],E=s[5],M=s[8];return r[0]=o*x+a*y+l*S,r[3]=o*m+a*_+l*E,r[6]=o*p+a*v+l*M,r[1]=c*x+h*y+u*S,r[4]=c*m+h*_+u*E,r[7]=c*p+h*v+u*M,r[2]=d*x+f*y+g*S,r[5]=d*m+f*_+g*E,r[8]=d*p+f*v+g*M,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8];return e*o*h-e*a*c-n*r*h+n*a*l+s*r*c-s*o*l}invert(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],u=h*o-a*c,d=a*l-h*r,f=c*r-o*l,g=e*u+n*d+s*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const x=1/g;return t[0]=u*x,t[1]=(s*c-h*n)*x,t[2]=(a*n-s*o)*x,t[3]=d*x,t[4]=(h*e-s*l)*x,t[5]=(s*r-a*e)*x,t[6]=f*x,t[7]=(n*l-c*e)*x,t[8]=(o*e-n*r)*x,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,o,a){const l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+t,-s*c,s*l,-s*(-c*o+l*a)+a+e,0,0,1),this}scale(t,e){return this.premultiply(ja.makeScale(t,e)),this}rotate(t){return this.premultiply(ja.makeRotation(-t)),this}translate(t,e){return this.premultiply(ja.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const ja=new Xt,hu=new Xt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),uu=new Xt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Zm(){const i={enabled:!0,workingColorSpace:fr,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===oe&&(s.r=Mi(s.r),s.g=Mi(s.g),s.b=Mi(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===oe&&(s.r=lr(s.r),s.g=lr(s.g),s.b=lr(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===ki?Ma:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return jr("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return jr("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[fr]:{primaries:t,whitePoint:n,transfer:Ma,toXYZ:hu,fromXYZ:uu,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:xn},outputColorSpaceConfig:{drawingBufferColorSpace:xn}},[xn]:{primaries:t,whitePoint:n,transfer:oe,toXYZ:hu,fromXYZ:uu,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:xn}}}),i}const te=Zm();function Mi(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function lr(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Ds;class jm{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{Ds===void 0&&(Ds=Aa("canvas")),Ds.width=t.width,Ds.height=t.height;const s=Ds.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),n=Ds}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=Aa("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=Mi(r[o]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Mi(e[n]/255)*255):e[n]=Mi(e[n]);return{data:e,width:t.width,height:t.height}}else return Gt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let Km=0;class yh{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Km++}),this.uuid=Cs(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){const e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayHeight,e.displayWidth,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(Ka(s[o].image)):r.push(Ka(s[o]))}else r=Ka(s);n.url=r}return e||(t.images[this.uuid]=n),n}}function Ka(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?jm.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Gt("Texture: Unable to serialize Texture."),{})}let Jm=0;const Ja=new N;class sn extends Ts{constructor(t=sn.DEFAULT_IMAGE,e=sn.DEFAULT_MAPPING,n=yi,s=yi,r=qe,o=_s,a=Wn,l=_n,c=sn.DEFAULT_ANISOTROPY,h=ki){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Jm++}),this.uuid=Cs(),this.name="",this.source=new yh(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new it(0,0),this.repeat=new it(1,1),this.center=new it(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Xt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Ja).x}get height(){return this.source.getSize(Ja).y}get depth(){return this.source.getSize(Ja).z}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(const e in t){const n=t[e];if(n===void 0){Gt(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){Gt(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==df)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case mc:t.x=t.x-Math.floor(t.x);break;case yi:t.x=t.x<0?0:1;break;case gc:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case mc:t.y=t.y-Math.floor(t.y);break;case yi:t.y=t.y<0?0:1;break;case gc:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}sn.DEFAULT_IMAGE=null;sn.DEFAULT_MAPPING=df;sn.DEFAULT_ANISOTROPY=1;class le{constructor(t=0,e=0,n=0,s=1){le.prototype.isVector4=!0,this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,s=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*e+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*e+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*e+o[7]*n+o[11]*s+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r;const l=t.elements,c=l[0],h=l[4],u=l[8],d=l[1],f=l[5],g=l[9],x=l[2],m=l[6],p=l[10];if(Math.abs(h-d)<.01&&Math.abs(u-x)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+x)<.1&&Math.abs(g+m)<.1&&Math.abs(c+f+p-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const _=(c+1)/2,v=(f+1)/2,S=(p+1)/2,E=(h+d)/4,M=(u+x)/4,T=(g+m)/4;return _>v&&_>S?_<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(_),s=E/n,r=M/n):v>S?v<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(v),n=E/s,r=T/s):S<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(S),n=M/r,s=T/r),this.set(n,s,r,e),this}let y=Math.sqrt((m-g)*(m-g)+(u-x)*(u-x)+(d-h)*(d-h));return Math.abs(y)<.001&&(y=1),this.x=(m-g)/y,this.y=(u-x)/y,this.z=(d-h)/y,this.w=Math.acos((c+f+p-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Yt(this.x,t.x,e.x),this.y=Yt(this.y,t.y,e.y),this.z=Yt(this.z,t.z,e.z),this.w=Yt(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=Yt(this.x,t,e),this.y=Yt(this.y,t,e),this.z=Yt(this.z,t,e),this.w=Yt(this.w,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Yt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Qm extends Ts{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:qe,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new le(0,0,t,e),this.scissorTest=!1,this.viewport=new le(0,0,t,e);const s={width:t,height:e,depth:n.depth},r=new sn(s);this.textures=[];const o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(t={}){const e={minFilter:qe,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),t!==null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;const s=Object.assign({},t.textures[e].image);this.textures[e].source=new yh(s)}return this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class ei extends Qm{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}}class bf extends sn{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=ze,this.minFilter=ze,this.wrapR=yi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class tg extends sn{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=ze,this.minFilter=ze,this.wrapR=yi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class We{constructor(t=new N(1/0,1/0,1/0),e=new N(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(Bn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(Bn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=Bn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0){const r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,Bn):Bn.fromBufferAttribute(r,o),Bn.applyMatrix4(t.matrixWorld),this.expandByPoint(Bn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),fo.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),fo.copy(n.boundingBox)),fo.applyMatrix4(t.matrixWorld),this.union(fo)}const s=t.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Bn),Bn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(br),po.subVectors(this.max,br),Is.subVectors(t.a,br),Ns.subVectors(t.b,br),Bs.subVectors(t.c,br),Pi.subVectors(Ns,Is),Ri.subVectors(Bs,Ns),ts.subVectors(Is,Bs);let e=[0,-Pi.z,Pi.y,0,-Ri.z,Ri.y,0,-ts.z,ts.y,Pi.z,0,-Pi.x,Ri.z,0,-Ri.x,ts.z,0,-ts.x,-Pi.y,Pi.x,0,-Ri.y,Ri.x,0,-ts.y,ts.x,0];return!Qa(e,Is,Ns,Bs,po)||(e=[1,0,0,0,1,0,0,0,1],!Qa(e,Is,Ns,Bs,po))?!1:(mo.crossVectors(Pi,Ri),e=[mo.x,mo.y,mo.z],Qa(e,Is,Ns,Bs,po))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Bn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Bn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(ai[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),ai[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),ai[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),ai[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),ai[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),ai[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),ai[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),ai[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(ai),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}}const ai=[new N,new N,new N,new N,new N,new N,new N,new N],Bn=new N,fo=new We,Is=new N,Ns=new N,Bs=new N,Pi=new N,Ri=new N,ts=new N,br=new N,po=new N,mo=new N,es=new N;function Qa(i,t,e,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){es.fromArray(i,r);const a=s.x*Math.abs(es.x)+s.y*Math.abs(es.y)+s.z*Math.abs(es.z),l=t.dot(es),c=e.dot(es),h=n.dot(es);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}const eg=new We,Mr=new N,tl=new N;class Na{constructor(t=new N,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):eg.setFromPoints(t).getCenter(n);let s=0;for(let r=0,o=t.length;r<o;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Mr.subVectors(t,this.center);const e=Mr.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(Mr,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(tl.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Mr.copy(t.center).add(tl)),this.expandByPoint(Mr.copy(t.center).sub(tl))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}}const li=new N,el=new N,go=new N,Li=new N,nl=new N,xo=new N,il=new N;class ao{constructor(t=new N,e=new N(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,li)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=li.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(li.copy(this.origin).addScaledVector(this.direction,e),li.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){el.copy(t).add(e).multiplyScalar(.5),go.copy(e).sub(t).normalize(),Li.copy(this.origin).sub(el);const r=t.distanceTo(e)*.5,o=-this.direction.dot(go),a=Li.dot(this.direction),l=-Li.dot(go),c=Li.lengthSq(),h=Math.abs(1-o*o);let u,d,f,g;if(h>0)if(u=o*l-a,d=o*a-l,g=r*h,u>=0)if(d>=-g)if(d<=g){const x=1/h;u*=x,d*=x,f=u*(u+o*d+2*a)+d*(o*u+d+2*l)+c}else d=r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d=-r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d<=-g?(u=Math.max(0,-(-o*r+a)),d=u>0?-r:Math.min(Math.max(-r,-l),r),f=-u*u+d*(d+2*l)+c):d<=g?(u=0,d=Math.min(Math.max(-r,-l),r),f=d*(d+2*l)+c):(u=Math.max(0,-(o*r+a)),d=u>0?r:Math.min(Math.max(-r,-l),r),f=-u*u+d*(d+2*l)+c);else d=o>0?-r:r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(el).addScaledVector(go,d),f}intersectSphere(t,e){li.subVectors(t.center,this.origin);const n=li.dot(this.direction),s=li.dot(li)-n*n,r=t.radius*t.radius;if(s>r)return null;const o=Math.sqrt(r-s),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,o,a,l;const c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(t.min.x-d.x)*c,s=(t.max.x-d.x)*c):(n=(t.max.x-d.x)*c,s=(t.min.x-d.x)*c),h>=0?(r=(t.min.y-d.y)*h,o=(t.max.y-d.y)*h):(r=(t.max.y-d.y)*h,o=(t.min.y-d.y)*h),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),u>=0?(a=(t.min.z-d.z)*u,l=(t.max.z-d.z)*u):(a=(t.max.z-d.z)*u,l=(t.min.z-d.z)*u),n>l||a>s)||((a>n||n!==n)&&(n=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,li)!==null}intersectTriangle(t,e,n,s,r){nl.subVectors(e,t),xo.subVectors(n,t),il.crossVectors(nl,xo);let o=this.direction.dot(il),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Li.subVectors(this.origin,t);const l=a*this.direction.dot(xo.crossVectors(Li,xo));if(l<0)return null;const c=a*this.direction.dot(nl.cross(Li));if(c<0||l+c>o)return null;const h=-a*Li.dot(il);return h<0?null:this.at(h/o,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Zt{constructor(t,e,n,s,r,o,a,l,c,h,u,d,f,g,x,m){Zt.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,l,c,h,u,d,f,g,x,m)}set(t,e,n,s,r,o,a,l,c,h,u,d,f,g,x,m){const p=this.elements;return p[0]=t,p[4]=e,p[8]=n,p[12]=s,p[1]=r,p[5]=o,p[9]=a,p[13]=l,p[2]=c,p[6]=h,p[10]=u,p[14]=d,p[3]=f,p[7]=g,p[11]=x,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Zt().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinant()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinant()===0)return this.identity();const e=this.elements,n=t.elements,s=1/Us.setFromMatrixColumn(t,0).length(),r=1/Us.setFromMatrixColumn(t,1).length(),o=1/Us.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*o,e[9]=n[9]*o,e[10]=n[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,n=t.x,s=t.y,r=t.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(t.order==="XYZ"){const d=o*h,f=o*u,g=a*h,x=a*u;e[0]=l*h,e[4]=-l*u,e[8]=c,e[1]=f+g*c,e[5]=d-x*c,e[9]=-a*l,e[2]=x-d*c,e[6]=g+f*c,e[10]=o*l}else if(t.order==="YXZ"){const d=l*h,f=l*u,g=c*h,x=c*u;e[0]=d+x*a,e[4]=g*a-f,e[8]=o*c,e[1]=o*u,e[5]=o*h,e[9]=-a,e[2]=f*a-g,e[6]=x+d*a,e[10]=o*l}else if(t.order==="ZXY"){const d=l*h,f=l*u,g=c*h,x=c*u;e[0]=d-x*a,e[4]=-o*u,e[8]=g+f*a,e[1]=f+g*a,e[5]=o*h,e[9]=x-d*a,e[2]=-o*c,e[6]=a,e[10]=o*l}else if(t.order==="ZYX"){const d=o*h,f=o*u,g=a*h,x=a*u;e[0]=l*h,e[4]=g*c-f,e[8]=d*c+x,e[1]=l*u,e[5]=x*c+d,e[9]=f*c-g,e[2]=-c,e[6]=a*l,e[10]=o*l}else if(t.order==="YZX"){const d=o*l,f=o*c,g=a*l,x=a*c;e[0]=l*h,e[4]=x-d*u,e[8]=g*u+f,e[1]=u,e[5]=o*h,e[9]=-a*h,e[2]=-c*h,e[6]=f*u+g,e[10]=d-x*u}else if(t.order==="XZY"){const d=o*l,f=o*c,g=a*l,x=a*c;e[0]=l*h,e[4]=-u,e[8]=c*h,e[1]=d*u+x,e[5]=o*h,e[9]=f*u-g,e[2]=g*u-f,e[6]=a*h,e[10]=x*u+d}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(ng,t,ig)}lookAt(t,e,n){const s=this.elements;return mn.subVectors(t,e),mn.lengthSq()===0&&(mn.z=1),mn.normalize(),Di.crossVectors(n,mn),Di.lengthSq()===0&&(Math.abs(n.z)===1?mn.x+=1e-4:mn.z+=1e-4,mn.normalize(),Di.crossVectors(n,mn)),Di.normalize(),_o.crossVectors(mn,Di),s[0]=Di.x,s[4]=_o.x,s[8]=mn.x,s[1]=Di.y,s[5]=_o.y,s[9]=mn.y,s[2]=Di.z,s[6]=_o.z,s[10]=mn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],u=n[5],d=n[9],f=n[13],g=n[2],x=n[6],m=n[10],p=n[14],y=n[3],_=n[7],v=n[11],S=n[15],E=s[0],M=s[4],T=s[8],b=s[12],A=s[1],D=s[5],I=s[9],U=s[13],F=s[2],V=s[6],G=s[10],k=s[14],X=s[3],ht=s[7],st=s[11],gt=s[15];return r[0]=o*E+a*A+l*F+c*X,r[4]=o*M+a*D+l*V+c*ht,r[8]=o*T+a*I+l*G+c*st,r[12]=o*b+a*U+l*k+c*gt,r[1]=h*E+u*A+d*F+f*X,r[5]=h*M+u*D+d*V+f*ht,r[9]=h*T+u*I+d*G+f*st,r[13]=h*b+u*U+d*k+f*gt,r[2]=g*E+x*A+m*F+p*X,r[6]=g*M+x*D+m*V+p*ht,r[10]=g*T+x*I+m*G+p*st,r[14]=g*b+x*U+m*k+p*gt,r[3]=y*E+_*A+v*F+S*X,r[7]=y*M+_*D+v*V+S*ht,r[11]=y*T+_*I+v*G+S*st,r[15]=y*b+_*U+v*k+S*gt,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],o=t[1],a=t[5],l=t[9],c=t[13],h=t[2],u=t[6],d=t[10],f=t[14],g=t[3],x=t[7],m=t[11],p=t[15],y=l*f-c*d,_=a*f-c*u,v=a*d-l*u,S=o*f-c*h,E=o*d-l*h,M=o*u-a*h;return e*(x*y-m*_+p*v)-n*(g*y-m*S+p*E)+s*(g*_-x*S+p*M)-r*(g*v-x*E+m*M)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],u=t[9],d=t[10],f=t[11],g=t[12],x=t[13],m=t[14],p=t[15],y=u*m*c-x*d*c+x*l*f-a*m*f-u*l*p+a*d*p,_=g*d*c-h*m*c-g*l*f+o*m*f+h*l*p-o*d*p,v=h*x*c-g*u*c+g*a*f-o*x*f-h*a*p+o*u*p,S=g*u*l-h*x*l-g*a*d+o*x*d+h*a*m-o*u*m,E=e*y+n*_+s*v+r*S;if(E===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const M=1/E;return t[0]=y*M,t[1]=(x*d*r-u*m*r-x*s*f+n*m*f+u*s*p-n*d*p)*M,t[2]=(a*m*r-x*l*r+x*s*c-n*m*c-a*s*p+n*l*p)*M,t[3]=(u*l*r-a*d*r-u*s*c+n*d*c+a*s*f-n*l*f)*M,t[4]=_*M,t[5]=(h*m*r-g*d*r+g*s*f-e*m*f-h*s*p+e*d*p)*M,t[6]=(g*l*r-o*m*r-g*s*c+e*m*c+o*s*p-e*l*p)*M,t[7]=(o*d*r-h*l*r+h*s*c-e*d*c-o*s*f+e*l*f)*M,t[8]=v*M,t[9]=(g*u*r-h*x*r-g*n*f+e*x*f+h*n*p-e*u*p)*M,t[10]=(o*x*r-g*a*r+g*n*c-e*x*c-o*n*p+e*a*p)*M,t[11]=(h*a*r-o*u*r-h*n*c+e*u*c+o*n*f-e*a*f)*M,t[12]=S*M,t[13]=(h*x*s-g*u*s+g*n*d-e*x*d-h*n*m+e*u*m)*M,t[14]=(g*a*s-o*x*s-g*n*l+e*x*l+o*n*m-e*a*m)*M,t[15]=(o*u*s-h*a*s+h*n*l-e*u*l-o*n*d+e*a*d)*M,this}scale(t){const e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),s=Math.sin(e),r=1-n,o=t.x,a=t.y,l=t.z,c=r*o,h=r*a;return this.set(c*o+n,c*a-s*l,c*l+s*a,0,c*a+s*l,h*a+n,h*l-s*o,0,c*l-s*a,h*l+s*o,r*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,o){return this.set(1,n,r,0,t,1,o,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){const s=this.elements,r=e._x,o=e._y,a=e._z,l=e._w,c=r+r,h=o+o,u=a+a,d=r*c,f=r*h,g=r*u,x=o*h,m=o*u,p=a*u,y=l*c,_=l*h,v=l*u,S=n.x,E=n.y,M=n.z;return s[0]=(1-(x+p))*S,s[1]=(f+v)*S,s[2]=(g-_)*S,s[3]=0,s[4]=(f-v)*E,s[5]=(1-(d+p))*E,s[6]=(m+y)*E,s[7]=0,s[8]=(g+_)*M,s[9]=(m-y)*M,s[10]=(1-(d+x))*M,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){const s=this.elements;if(t.x=s[12],t.y=s[13],t.z=s[14],this.determinant()===0)return n.set(1,1,1),e.identity(),this;let r=Us.set(s[0],s[1],s[2]).length();const o=Us.set(s[4],s[5],s[6]).length(),a=Us.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),Un.copy(this);const c=1/r,h=1/o,u=1/a;return Un.elements[0]*=c,Un.elements[1]*=c,Un.elements[2]*=c,Un.elements[4]*=h,Un.elements[5]*=h,Un.elements[6]*=h,Un.elements[8]*=u,Un.elements[9]*=u,Un.elements[10]*=u,e.setFromRotationMatrix(Un),n.x=r,n.y=o,n.z=a,this}makePerspective(t,e,n,s,r,o,a=Jn,l=!1){const c=this.elements,h=2*r/(e-t),u=2*r/(n-s),d=(e+t)/(e-t),f=(n+s)/(n-s);let g,x;if(l)g=r/(o-r),x=o*r/(o-r);else if(a===Jn)g=-(o+r)/(o-r),x=-2*o*r/(o-r);else if(a===Ea)g=-o/(o-r),x=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=x,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,s,r,o,a=Jn,l=!1){const c=this.elements,h=2/(e-t),u=2/(n-s),d=-(e+t)/(e-t),f=-(n+s)/(n-s);let g,x;if(l)g=1/(o-r),x=o/(o-r);else if(a===Jn)g=-2/(o-r),x=-(o+r)/(o-r);else if(a===Ea)g=-1/(o-r),x=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=g,c[14]=x,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}}const Us=new N,Un=new Zt,ng=new N(0,0,0),ig=new N(1,1,1),Di=new N,_o=new N,mn=new N,du=new Zt,fu=new Ti;class yn{constructor(t=0,e=0,n=0,s=yn.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const s=t.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],h=s[9],u=s[2],d=s[6],f=s[10];switch(e){case"XYZ":this._y=Math.asin(Yt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Yt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(Yt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Yt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(Yt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-Yt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Gt("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return du.makeRotationFromQuaternion(t),this.setFromRotationMatrix(du,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return fu.setFromEuler(this),this.setFromQuaternion(fu,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}yn.DEFAULT_ORDER="XYZ";class Mf{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let sg=0;const pu=new N,Fs=new Ti,ci=new Zt,vo=new N,Er=new N,rg=new N,og=new Ti,mu=new N(1,0,0),gu=new N(0,1,0),xu=new N(0,0,1),_u={type:"added"},ag={type:"removed"},Os={type:"childadded",child:null},sl={type:"childremoved",child:null};class Oe extends Ts{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:sg++}),this.uuid=Cs(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Oe.DEFAULT_UP.clone();const t=new N,e=new yn,n=new Ti,s=new N(1,1,1);function r(){n.setFromEuler(e,!1)}function o(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Zt},normalMatrix:{value:new Xt}}),this.matrix=new Zt,this.matrixWorld=new Zt,this.matrixAutoUpdate=Oe.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Oe.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Mf,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Fs.setFromAxisAngle(t,e),this.quaternion.multiply(Fs),this}rotateOnWorldAxis(t,e){return Fs.setFromAxisAngle(t,e),this.quaternion.premultiply(Fs),this}rotateX(t){return this.rotateOnAxis(mu,t)}rotateY(t){return this.rotateOnAxis(gu,t)}rotateZ(t){return this.rotateOnAxis(xu,t)}translateOnAxis(t,e){return pu.copy(t).applyQuaternion(this.quaternion),this.position.add(pu.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(mu,t)}translateY(t){return this.translateOnAxis(gu,t)}translateZ(t){return this.translateOnAxis(xu,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(ci.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?vo.copy(t):vo.set(t,e,n);const s=this.parent;this.updateWorldMatrix(!0,!1),Er.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ci.lookAt(Er,vo,this.up):ci.lookAt(vo,Er,this.up),this.quaternion.setFromRotationMatrix(ci),s&&(ci.extractRotation(s.matrixWorld),Fs.setFromRotationMatrix(ci),this.quaternion.premultiply(Fs.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(ne("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(_u),Os.child=t,this.dispatchEvent(Os),Os.child=null):ne("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(ag),sl.child=t,this.dispatchEvent(sl),sl.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),ci.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),ci.multiply(t.parent.matrixWorld)),t.applyMatrix4(ci),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(_u),Os.child=t,this.dispatchEvent(Os),Os.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){const o=this.children[n].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Er,t,rg),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Er,og,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e){const n=this.parent;if(t===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const u=l[c];r(t.shapes,u)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(t.materials,this.material[l]));s.material=a}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];s.animations.push(r(t.animations,l))}}if(e){const a=o(t.geometries),l=o(t.materials),c=o(t.textures),h=o(t.images),u=o(t.shapes),d=o(t.skeletons),f=o(t.animations),g=o(t.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=s,n;function o(a){const l=[];for(const c in a){const h=a[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const s=t.children[n];this.add(s.clone())}return this}}Oe.DEFAULT_UP=new N(0,1,0);Oe.DEFAULT_MATRIX_AUTO_UPDATE=!0;Oe.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Fn=new N,hi=new N,rl=new N,ui=new N,ks=new N,zs=new N,vu=new N,ol=new N,al=new N,ll=new N,cl=new le,hl=new le,ul=new le;class me{constructor(t=new N,e=new N,n=new N){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),Fn.subVectors(t,e),s.cross(Fn);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){Fn.subVectors(s,e),hi.subVectors(n,e),rl.subVectors(t,e);const o=Fn.dot(Fn),a=Fn.dot(hi),l=Fn.dot(rl),c=hi.dot(hi),h=hi.dot(rl),u=o*c-a*a;if(u===0)return r.set(0,0,0),null;const d=1/u,f=(c*l-a*h)*d,g=(o*h-a*l)*d;return r.set(1-f-g,g,f)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,ui)===null?!1:ui.x>=0&&ui.y>=0&&ui.x+ui.y<=1}static getInterpolation(t,e,n,s,r,o,a,l){return this.getBarycoord(t,e,n,s,ui)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,ui.x),l.addScaledVector(o,ui.y),l.addScaledVector(a,ui.z),l)}static getInterpolatedAttribute(t,e,n,s,r,o){return cl.setScalar(0),hl.setScalar(0),ul.setScalar(0),cl.fromBufferAttribute(t,e),hl.fromBufferAttribute(t,n),ul.fromBufferAttribute(t,s),o.setScalar(0),o.addScaledVector(cl,r.x),o.addScaledVector(hl,r.y),o.addScaledVector(ul,r.z),o}static isFrontFacing(t,e,n,s){return Fn.subVectors(n,e),hi.subVectors(t,e),Fn.cross(hi).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Fn.subVectors(this.c,this.b),hi.subVectors(this.a,this.b),Fn.cross(hi).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return me.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return me.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return me.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return me.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return me.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,s=this.b,r=this.c;let o,a;ks.subVectors(s,n),zs.subVectors(r,n),ol.subVectors(t,n);const l=ks.dot(ol),c=zs.dot(ol);if(l<=0&&c<=0)return e.copy(n);al.subVectors(t,s);const h=ks.dot(al),u=zs.dot(al);if(h>=0&&u<=h)return e.copy(s);const d=l*u-h*c;if(d<=0&&l>=0&&h<=0)return o=l/(l-h),e.copy(n).addScaledVector(ks,o);ll.subVectors(t,r);const f=ks.dot(ll),g=zs.dot(ll);if(g>=0&&f<=g)return e.copy(r);const x=f*c-l*g;if(x<=0&&c>=0&&g<=0)return a=c/(c-g),e.copy(n).addScaledVector(zs,a);const m=h*g-f*u;if(m<=0&&u-h>=0&&f-g>=0)return vu.subVectors(r,s),a=(u-h)/(u-h+(f-g)),e.copy(s).addScaledVector(vu,a);const p=1/(m+x+d);return o=x*p,a=d*p,e.copy(n).addScaledVector(ks,o).addScaledVector(zs,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const Ef={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Ii={h:0,s:0,l:0},yo={h:0,s:0,l:0};function dl(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}class qt{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){const s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=xn){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,te.colorSpaceToWorking(this,e),this}setRGB(t,e,n,s=te.workingColorSpace){return this.r=t,this.g=e,this.b=n,te.colorSpaceToWorking(this,s),this}setHSL(t,e,n,s=te.workingColorSpace){if(t=vh(t,1),e=Yt(e,0,1),n=Yt(n,0,1),e===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+e):n+e-n*e,o=2*n-r;this.r=dl(o,r,t+1/3),this.g=dl(o,r,t),this.b=dl(o,r,t-1/3)}return te.colorSpaceToWorking(this,s),this}setStyle(t,e=xn){function n(r){r!==void 0&&parseFloat(r)<1&&Gt("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r;const o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:Gt("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){const r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);Gt("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=xn){const n=Ef[t.toLowerCase()];return n!==void 0?this.setHex(n,e):Gt("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Mi(t.r),this.g=Mi(t.g),this.b=Mi(t.b),this}copyLinearToSRGB(t){return this.r=lr(t.r),this.g=lr(t.g),this.b=lr(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=xn){return te.workingToColorSpace(Ye.copy(this),t),Math.round(Yt(Ye.r*255,0,255))*65536+Math.round(Yt(Ye.g*255,0,255))*256+Math.round(Yt(Ye.b*255,0,255))}getHexString(t=xn){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=te.workingColorSpace){te.workingToColorSpace(Ye.copy(this),e);const n=Ye.r,s=Ye.g,r=Ye.b,o=Math.max(n,s,r),a=Math.min(n,s,r);let l,c;const h=(a+o)/2;if(a===o)l=0,c=0;else{const u=o-a;switch(c=h<=.5?u/(o+a):u/(2-o-a),o){case n:l=(s-r)/u+(s<r?6:0);break;case s:l=(r-n)/u+2;break;case r:l=(n-s)/u+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=te.workingColorSpace){return te.workingToColorSpace(Ye.copy(this),e),t.r=Ye.r,t.g=Ye.g,t.b=Ye.b,t}getStyle(t=xn){te.workingToColorSpace(Ye.copy(this),t);const e=Ye.r,n=Ye.g,s=Ye.b;return t!==xn?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(Ii),this.setHSL(Ii.h+t,Ii.s+e,Ii.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Ii),t.getHSL(yo);const n=Vr(Ii.h,yo.h,e),s=Vr(Ii.s,yo.s,e),r=Vr(Ii.l,yo.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Ye=new qt;qt.NAMES=Ef;let lg=0;class _r extends Ts{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:lg++}),this.uuid=Cs(),this.name="",this.type="Material",this.blending=or,this.side=Dn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=sc,this.blendDst=rc,this.blendEquation=ds,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new qt(0,0,0),this.blendAlpha=0,this.depthFunc=hr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=iu,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ls,this.stencilZFail=Ls,this.stencilZPass=Ls,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){Gt(`Material: parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){Gt(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==or&&(n.blending=this.blending),this.side!==Dn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==sc&&(n.blendSrc=this.blendSrc),this.blendDst!==rc&&(n.blendDst=this.blendDst),this.blendEquation!==ds&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==hr&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==iu&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Ls&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Ls&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Ls&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){const o=[];for(const a in r){const l=r[a];delete l.metadata,o.push(l)}return o}if(e){const r=s(t.textures),o=s(t.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}}class Af extends _r{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new qt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new yn,this.combine=sf,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const Te=new N,So=new it;let cg=0;class Ze{constructor(t,e,n=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:cg++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=su,this.updateRanges=[],this.gpuType=Kn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)So.fromBufferAttribute(this,e),So.applyMatrix3(t),this.setXY(e,So.x,So.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)Te.fromBufferAttribute(this,e),Te.applyMatrix3(t),this.setXYZ(e,Te.x,Te.y,Te.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)Te.fromBufferAttribute(this,e),Te.applyMatrix4(t),this.setXYZ(e,Te.x,Te.y,Te.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Te.fromBufferAttribute(this,e),Te.applyNormalMatrix(t),this.setXYZ(e,Te.x,Te.y,Te.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Te.fromBufferAttribute(this,e),Te.transformDirection(t),this.setXYZ(e,Te.x,Te.y,Te.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=tr(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=Je(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=tr(e,this.array)),e}setX(t,e){return this.normalized&&(e=Je(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=tr(e,this.array)),e}setY(t,e){return this.normalized&&(e=Je(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=tr(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Je(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=tr(e,this.array)),e}setW(t,e){return this.normalized&&(e=Je(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=Je(e,this.array),n=Je(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=Je(e,this.array),n=Je(n,this.array),s=Je(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=Je(e,this.array),n=Je(n,this.array),s=Je(s,this.array),r=Je(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==su&&(t.usage=this.usage),t}}class wf extends Ze{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class Tf extends Ze{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class be extends Ze{constructor(t,e,n){super(new Float32Array(t),e,n)}}let hg=0;const Mn=new Zt,fl=new Oe,Vs=new N,gn=new We,Ar=new We,Be=new N;class De extends Ts{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:hg++}),this.uuid=Cs(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Sf(t)?Tf:wf)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new Xt().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return Mn.makeRotationFromQuaternion(t),this.applyMatrix4(Mn),this}rotateX(t){return Mn.makeRotationX(t),this.applyMatrix4(Mn),this}rotateY(t){return Mn.makeRotationY(t),this.applyMatrix4(Mn),this}rotateZ(t){return Mn.makeRotationZ(t),this.applyMatrix4(Mn),this}translate(t,e,n){return Mn.makeTranslation(t,e,n),this.applyMatrix4(Mn),this}scale(t,e,n){return Mn.makeScale(t,e,n),this.applyMatrix4(Mn),this}lookAt(t){return fl.lookAt(t),fl.updateMatrix(),this.applyMatrix4(fl.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Vs).negate(),this.translate(Vs.x,Vs.y,Vs.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const n=[];for(let s=0,r=t.length;s<r;s++){const o=t[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new be(n,3))}else{const n=Math.min(t.length,e.count);for(let s=0;s<n;s++){const r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&Gt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new We);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){ne("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new N(-1/0,-1/0,-1/0),new N(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){const r=e[n];gn.setFromBufferAttribute(r),this.morphTargetsRelative?(Be.addVectors(this.boundingBox.min,gn.min),this.boundingBox.expandByPoint(Be),Be.addVectors(this.boundingBox.max,gn.max),this.boundingBox.expandByPoint(Be)):(this.boundingBox.expandByPoint(gn.min),this.boundingBox.expandByPoint(gn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&ne('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Na);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){ne("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new N,1/0);return}if(t){const n=this.boundingSphere.center;if(gn.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){const a=e[r];Ar.setFromBufferAttribute(a),this.morphTargetsRelative?(Be.addVectors(gn.min,Ar.min),gn.expandByPoint(Be),Be.addVectors(gn.max,Ar.max),gn.expandByPoint(Be)):(gn.expandByPoint(Ar.min),gn.expandByPoint(Ar.max))}gn.getCenter(n);let s=0;for(let r=0,o=t.count;r<o;r++)Be.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(Be));if(e)for(let r=0,o=e.length;r<o;r++){const a=e[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)Be.fromBufferAttribute(a,c),l&&(Vs.fromBufferAttribute(t,c),Be.add(Vs)),s=Math.max(s,n.distanceToSquared(Be))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&ne('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){ne("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=e.position,s=e.normal,r=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Ze(new Float32Array(4*n.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let T=0;T<n.count;T++)a[T]=new N,l[T]=new N;const c=new N,h=new N,u=new N,d=new it,f=new it,g=new it,x=new N,m=new N;function p(T,b,A){c.fromBufferAttribute(n,T),h.fromBufferAttribute(n,b),u.fromBufferAttribute(n,A),d.fromBufferAttribute(r,T),f.fromBufferAttribute(r,b),g.fromBufferAttribute(r,A),h.sub(c),u.sub(c),f.sub(d),g.sub(d);const D=1/(f.x*g.y-g.x*f.y);isFinite(D)&&(x.copy(h).multiplyScalar(g.y).addScaledVector(u,-f.y).multiplyScalar(D),m.copy(u).multiplyScalar(f.x).addScaledVector(h,-g.x).multiplyScalar(D),a[T].add(x),a[b].add(x),a[A].add(x),l[T].add(m),l[b].add(m),l[A].add(m))}let y=this.groups;y.length===0&&(y=[{start:0,count:t.count}]);for(let T=0,b=y.length;T<b;++T){const A=y[T],D=A.start,I=A.count;for(let U=D,F=D+I;U<F;U+=3)p(t.getX(U+0),t.getX(U+1),t.getX(U+2))}const _=new N,v=new N,S=new N,E=new N;function M(T){S.fromBufferAttribute(s,T),E.copy(S);const b=a[T];_.copy(b),_.sub(S.multiplyScalar(S.dot(b))).normalize(),v.crossVectors(E,b);const D=v.dot(l[T])<0?-1:1;o.setXYZW(T,_.x,_.y,_.z,D)}for(let T=0,b=y.length;T<b;++T){const A=y[T],D=A.start,I=A.count;for(let U=D,F=D+I;U<F;U+=3)M(t.getX(U+0)),M(t.getX(U+1)),M(t.getX(U+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Ze(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);const s=new N,r=new N,o=new N,a=new N,l=new N,c=new N,h=new N,u=new N;if(t)for(let d=0,f=t.count;d<f;d+=3){const g=t.getX(d+0),x=t.getX(d+1),m=t.getX(d+2);s.fromBufferAttribute(e,g),r.fromBufferAttribute(e,x),o.fromBufferAttribute(e,m),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),a.fromBufferAttribute(n,g),l.fromBufferAttribute(n,x),c.fromBufferAttribute(n,m),a.add(h),l.add(h),c.add(h),n.setXYZ(g,a.x,a.y,a.z),n.setXYZ(x,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let d=0,f=e.count;d<f;d+=3)s.fromBufferAttribute(e,d+0),r.fromBufferAttribute(e,d+1),o.fromBufferAttribute(e,d+2),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)Be.fromBufferAttribute(t,e),Be.normalize(),t.setXYZ(e,Be.x,Be.y,Be.z)}toNonIndexed(){function t(a,l){const c=a.array,h=a.itemSize,u=a.normalized,d=new c.constructor(l.length*h);let f=0,g=0;for(let x=0,m=l.length;x<m;x++){a.isInterleavedBufferAttribute?f=l[x]*a.data.stride+a.offset:f=l[x]*h;for(let p=0;p<h;p++)d[g++]=c[f++]}return new Ze(d,h,u)}if(this.index===null)return Gt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new De,n=this.index.array,s=this.attributes;for(const a in s){const l=s[a],c=t(l,n);e.setAttribute(a,c)}const r=this.morphAttributes;for(const a in r){const l=[],c=r[a];for(let h=0,u=c.length;h<u;h++){const d=c[h],f=t(d,n);l.push(f)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){const t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const l in n){const c=n[l];t.data.attributes[l]=c.toJSON(t.data)}const s={};let r=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let u=0,d=c.length;u<d;u++){const f=c[u];h.push(f.toJSON(t.data))}h.length>0&&(s[l]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(t.data.boundingSphere=a.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone());const s=t.attributes;for(const c in s){const h=s[c];this.setAttribute(c,h.clone(e))}const r=t.morphAttributes;for(const c in r){const h=[],u=r[c];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;const o=t.groups;for(let c=0,h=o.length;c<h;c++){const u=o[c];this.addGroup(u.start,u.count,u.materialIndex)}const a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const yu=new Zt,ns=new ao,bo=new Na,Su=new N,Mo=new N,Eo=new N,Ao=new N,pl=new N,wo=new N,bu=new N,To=new N;class Sn extends Oe{constructor(t=new De,e=new Af){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){const n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;e.fromBufferAttribute(s,t);const a=this.morphTargetInfluences;if(r&&a){wo.set(0,0,0);for(let l=0,c=r.length;l<c;l++){const h=a[l],u=r[l];h!==0&&(pl.fromBufferAttribute(u,t),o?wo.addScaledVector(pl,h):wo.addScaledVector(pl.sub(e),h))}e.add(wo)}return e}raycast(t,e){const n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),bo.copy(n.boundingSphere),bo.applyMatrix4(r),ns.copy(t.ray).recast(t.near),!(bo.containsPoint(ns.origin)===!1&&(ns.intersectSphere(bo,Su)===null||ns.origin.distanceToSquared(Su)>(t.far-t.near)**2))&&(yu.copy(r).invert(),ns.copy(t.ray).applyMatrix4(yu),!(n.boundingBox!==null&&ns.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,ns)))}_computeIntersections(t,e,n){let s;const r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,x=d.length;g<x;g++){const m=d[g],p=o[m.materialIndex],y=Math.max(m.start,f.start),_=Math.min(a.count,Math.min(m.start+m.count,f.start+f.count));for(let v=y,S=_;v<S;v+=3){const E=a.getX(v),M=a.getX(v+1),T=a.getX(v+2);s=Co(this,p,t,n,c,h,u,E,M,T),s&&(s.faceIndex=Math.floor(v/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{const g=Math.max(0,f.start),x=Math.min(a.count,f.start+f.count);for(let m=g,p=x;m<p;m+=3){const y=a.getX(m),_=a.getX(m+1),v=a.getX(m+2);s=Co(this,o,t,n,c,h,u,y,_,v),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,x=d.length;g<x;g++){const m=d[g],p=o[m.materialIndex],y=Math.max(m.start,f.start),_=Math.min(l.count,Math.min(m.start+m.count,f.start+f.count));for(let v=y,S=_;v<S;v+=3){const E=v,M=v+1,T=v+2;s=Co(this,p,t,n,c,h,u,E,M,T),s&&(s.faceIndex=Math.floor(v/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{const g=Math.max(0,f.start),x=Math.min(l.count,f.start+f.count);for(let m=g,p=x;m<p;m+=3){const y=m,_=m+1,v=m+2;s=Co(this,o,t,n,c,h,u,y,_,v),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}}}function ug(i,t,e,n,s,r,o,a){let l;if(t.side===nn?l=n.intersectTriangle(o,r,s,!0,a):l=n.intersectTriangle(s,r,o,t.side===Dn,a),l===null)return null;To.copy(a),To.applyMatrix4(i.matrixWorld);const c=e.ray.origin.distanceTo(To);return c<e.near||c>e.far?null:{distance:c,point:To.clone(),object:i}}function Co(i,t,e,n,s,r,o,a,l,c){i.getVertexPosition(a,Mo),i.getVertexPosition(l,Eo),i.getVertexPosition(c,Ao);const h=ug(i,t,e,n,Mo,Eo,Ao,bu);if(h){const u=new N;me.getBarycoord(bu,Mo,Eo,Ao,u),s&&(h.uv=me.getInterpolatedAttribute(s,a,l,c,u,new it)),r&&(h.uv1=me.getInterpolatedAttribute(r,a,l,c,u,new it)),o&&(h.normal=me.getInterpolatedAttribute(o,a,l,c,u,new N),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const d={a,b:l,c,normal:new N,materialIndex:0};me.getNormal(Mo,Eo,Ao,d.normal),h.face=d,h.barycoord=u}return h}class $i extends De{constructor(t=1,e=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};const a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);const l=[],c=[],h=[],u=[];let d=0,f=0;g("z","y","x",-1,-1,n,e,t,o,r,0),g("z","y","x",1,-1,n,e,-t,o,r,1),g("x","z","y",1,1,t,n,e,s,o,2),g("x","z","y",1,-1,t,n,-e,s,o,3),g("x","y","z",1,-1,t,e,n,s,r,4),g("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new be(c,3)),this.setAttribute("normal",new be(h,3)),this.setAttribute("uv",new be(u,2));function g(x,m,p,y,_,v,S,E,M,T,b){const A=v/M,D=S/T,I=v/2,U=S/2,F=E/2,V=M+1,G=T+1;let k=0,X=0;const ht=new N;for(let st=0;st<G;st++){const gt=st*D-U;for(let Ot=0;Ot<V;Ot++){const Ht=Ot*A-I;ht[x]=Ht*y,ht[m]=gt*_,ht[p]=F,c.push(ht.x,ht.y,ht.z),ht[x]=0,ht[m]=0,ht[p]=E>0?1:-1,h.push(ht.x,ht.y,ht.z),u.push(Ot/M),u.push(1-st/T),k+=1}}for(let st=0;st<T;st++)for(let gt=0;gt<M;gt++){const Ot=d+gt+V*st,Ht=d+gt+V*(st+1),Z=d+(gt+1)+V*(st+1),z=d+(gt+1)+V*st;l.push(Ot,Ht,z),l.push(Ht,Z,z),X+=6}a.addGroup(f,X,b),f+=X,d+=k}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new $i(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function pr(i){const t={};for(const e in i){t[e]={};for(const n in i[e]){const s=i[e][n];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(Gt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone():Array.isArray(s)?t[e][n]=s.slice():t[e][n]=s}}return t}function Qe(i){const t={};for(let e=0;e<i.length;e++){const n=pr(i[e]);for(const s in n)t[s]=n[s]}return t}function dg(i){const t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function Cf(i){const t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:te.workingColorSpace}const fg={clone:pr,merge:Qe};var pg=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,mg=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class si extends _r{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=pg,this.fragmentShader=mg,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=pr(t.uniforms),this.uniformsGroups=dg(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const s in this.uniforms){const o=this.uniforms[s].value;o&&o.isTexture?e.uniforms[s]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[s]={type:"m4",value:o.toArray()}:e.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const n={};for(const s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}}class Pf extends Oe{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Zt,this.projectionMatrix=new Zt,this.projectionMatrixInverse=new Zt,this.coordinateSystem=Jn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Ni=new N,Mu=new it,Eu=new it;class Tn extends Pf{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=Kr*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(ar*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Kr*2*Math.atan(Math.tan(ar*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){Ni.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Ni.x,Ni.y).multiplyScalar(-t/Ni.z),Ni.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Ni.x,Ni.y).multiplyScalar(-t/Ni.z)}getViewSize(t,e){return this.getViewBounds(t,Mu,Eu),e.subVectors(Eu,Mu)}setViewOffset(t,e,n,s,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(ar*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,e-=o.offsetY*n/c,s*=o.width/l,n*=o.height/c}const a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const Gs=-90,Hs=1;class gg extends Oe{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new Tn(Gs,Hs,t,e);s.layers=this.layers,this.add(s);const r=new Tn(Gs,Hs,t,e);r.layers=this.layers,this.add(r);const o=new Tn(Gs,Hs,t,e);o.layers=this.layers,this.add(o);const a=new Tn(Gs,Hs,t,e);a.layers=this.layers,this.add(a);const l=new Tn(Gs,Hs,t,e);l.layers=this.layers,this.add(l);const c=new Tn(Gs,Hs,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[n,s,r,o,a,l]=e;for(const c of e)this.remove(c);if(t===Jn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===Ea)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,l,c,h]=this.children,u=t.getRenderTarget(),d=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;const x=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,t.setRenderTarget(n,0,s),t.render(e,r),t.setRenderTarget(n,1,s),t.render(e,o),t.setRenderTarget(n,2,s),t.render(e,a),t.setRenderTarget(n,3,s),t.render(e,l),t.setRenderTarget(n,4,s),t.render(e,c),n.texture.generateMipmaps=x,t.setRenderTarget(n,5,s),t.render(e,h),t.setRenderTarget(u,d,f),t.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class Rf extends sn{constructor(t=[],e=As,n,s,r,o,a,l,c,h){super(t,e,n,s,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class Lf extends ei{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new Rf(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new $i(5,5,5),r=new si({name:"CubemapFromEquirect",uniforms:pr(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:nn,blending:bi});r.uniforms.tEquirect.value=e;const o=new Sn(s,r),a=e.minFilter;return e.minFilter===_s&&(e.minFilter=qe),new gg(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e=!0,n=!0,s=!0){const r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,n,s);t.setRenderTarget(r)}}class Po extends Oe{constructor(){super(),this.isGroup=!0,this.type="Group"}}const xg={type:"move"};class ml{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Po,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Po,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new N,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new N),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Po,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new N,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new N),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){o=!0;for(const x of t.hand.values()){const m=e.getJointPose(x,n),p=this._getHandJoint(c,x);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,g=.005;c.inputState.pinching&&d>f+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&d<=f-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(xg)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const n=new Po;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}class _g extends Oe{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new yn,this.environmentIntensity=1,this.environmentRotation=new yn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}class vg extends sn{constructor(t=null,e=1,n=1,s,r,o,a,l,c=ze,h=ze,u,d){super(null,o,a,l,c,h,s,r,u,d),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const gl=new N,yg=new N,Sg=new Xt;class kn{constructor(t=new N(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const s=gl.subVectors(n,e).cross(yg.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const n=t.delta(gl),s=this.normal.dot(n);if(s===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const r=-(t.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:e.copy(t.start).addScaledVector(n,r)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||Sg.getNormalMatrix(t),s=this.coplanarPoint(gl).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const is=new Na,bg=new it(.5,.5),Ro=new N;class Sh{constructor(t=new kn,e=new kn,n=new kn,s=new kn,r=new kn,o=new kn){this.planes=[t,e,n,s,r,o]}set(t,e,n,s,r,o){const a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=Jn,n=!1){const s=this.planes,r=t.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],u=r[5],d=r[6],f=r[7],g=r[8],x=r[9],m=r[10],p=r[11],y=r[12],_=r[13],v=r[14],S=r[15];if(s[0].setComponents(c-o,f-h,p-g,S-y).normalize(),s[1].setComponents(c+o,f+h,p+g,S+y).normalize(),s[2].setComponents(c+a,f+u,p+x,S+_).normalize(),s[3].setComponents(c-a,f-u,p-x,S-_).normalize(),n)s[4].setComponents(l,d,m,v).normalize(),s[5].setComponents(c-l,f-d,p-m,S-v).normalize();else if(s[4].setComponents(c-l,f-d,p-m,S-v).normalize(),e===Jn)s[5].setComponents(c+l,f+d,p+m,S+v).normalize();else if(e===Ea)s[5].setComponents(l,d,m,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),is.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),is.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(is)}intersectsSprite(t){is.center.set(0,0,0);const e=bg.distanceTo(t.center);return is.radius=.7071067811865476+e,is.applyMatrix4(t.matrixWorld),this.intersectsSphere(is)}intersectsSphere(t){const e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const s=e[n];if(Ro.x=s.normal.x>0?t.max.x:t.min.x,Ro.y=s.normal.y>0?t.max.y:t.min.y,Ro.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(Ro)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class vr extends _r{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new qt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}}const wa=new N,Ta=new N,Au=new Zt,wr=new ao,Lo=new Na,xl=new N,wu=new N;class bh extends Oe{constructor(t=new De,e=new vr){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,n=[0];for(let s=1,r=e.count;s<r;s++)wa.fromBufferAttribute(e,s-1),Ta.fromBufferAttribute(e,s),n[s]=n[s-1],n[s]+=wa.distanceTo(Ta);t.setAttribute("lineDistance",new be(n,1))}else Gt("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(t,e){const n=this.geometry,s=this.matrixWorld,r=t.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Lo.copy(n.boundingSphere),Lo.applyMatrix4(s),Lo.radius+=r,t.ray.intersectsSphere(Lo)===!1)return;Au.copy(s).invert(),wr.copy(t.ray).applyMatrix4(Au);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,h=n.index,d=n.attributes.position;if(h!==null){const f=Math.max(0,o.start),g=Math.min(h.count,o.start+o.count);for(let x=f,m=g-1;x<m;x+=c){const p=h.getX(x),y=h.getX(x+1),_=Do(this,t,wr,l,p,y,x);_&&e.push(_)}if(this.isLineLoop){const x=h.getX(g-1),m=h.getX(f),p=Do(this,t,wr,l,x,m,g-1);p&&e.push(p)}}else{const f=Math.max(0,o.start),g=Math.min(d.count,o.start+o.count);for(let x=f,m=g-1;x<m;x+=c){const p=Do(this,t,wr,l,x,x+1,x);p&&e.push(p)}if(this.isLineLoop){const x=Do(this,t,wr,l,g-1,f,g-1);x&&e.push(x)}}}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function Do(i,t,e,n,s,r,o){const a=i.geometry.attributes.position;if(wa.fromBufferAttribute(a,s),Ta.fromBufferAttribute(a,r),e.distanceSqToSegment(wa,Ta,xl,wu)>n)return;xl.applyMatrix4(i.matrixWorld);const c=t.ray.origin.distanceTo(xl);if(!(c<t.near||c>t.far))return{distance:c,point:wu.clone().applyMatrix4(i.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:i}}const Tu=new N,Cu=new N;class Mh extends bh{constructor(t,e){super(t,e),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,n=[];for(let s=0,r=e.count;s<r;s+=2)Tu.fromBufferAttribute(e,s),Cu.fromBufferAttribute(e,s+1),n[s]=s===0?0:n[s-1],n[s+1]=n[s]+Tu.distanceTo(Cu);t.setAttribute("lineDistance",new be(n,1))}else Gt("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Jr extends sn{constructor(t,e,n=ii,s,r,o,a=ze,l=ze,c,h=wi,u=1){if(h!==wi&&h!==vs)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const d={width:t,height:e,depth:u};super(d,s,r,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new yh(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}class Mg extends Jr{constructor(t,e=ii,n=As,s,r,o=ze,a=ze,l,c=wi){const h={width:t,height:t,depth:1},u=[h,h,h,h,h,h];super(t,t,e,n,s,r,o,a,l,c),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}}class Df extends sn{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}}const Io=new N,No=new N,_l=new N,Bo=new me;class Eg extends De{constructor(t=null,e=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:t,thresholdAngle:e},t!==null){const s=Math.pow(10,4),r=Math.cos(ar*e),o=t.getIndex(),a=t.getAttribute("position"),l=o?o.count:a.count,c=[0,0,0],h=["a","b","c"],u=new Array(3),d={},f=[];for(let g=0;g<l;g+=3){o?(c[0]=o.getX(g),c[1]=o.getX(g+1),c[2]=o.getX(g+2)):(c[0]=g,c[1]=g+1,c[2]=g+2);const{a:x,b:m,c:p}=Bo;if(x.fromBufferAttribute(a,c[0]),m.fromBufferAttribute(a,c[1]),p.fromBufferAttribute(a,c[2]),Bo.getNormal(_l),u[0]=`${Math.round(x.x*s)},${Math.round(x.y*s)},${Math.round(x.z*s)}`,u[1]=`${Math.round(m.x*s)},${Math.round(m.y*s)},${Math.round(m.z*s)}`,u[2]=`${Math.round(p.x*s)},${Math.round(p.y*s)},${Math.round(p.z*s)}`,!(u[0]===u[1]||u[1]===u[2]||u[2]===u[0]))for(let y=0;y<3;y++){const _=(y+1)%3,v=u[y],S=u[_],E=Bo[h[y]],M=Bo[h[_]],T=`${v}_${S}`,b=`${S}_${v}`;b in d&&d[b]?(_l.dot(d[b].normal)<=r&&(f.push(E.x,E.y,E.z),f.push(M.x,M.y,M.z)),d[b]=null):T in d||(d[T]={index0:c[y],index1:c[_],normal:_l.clone()})}}for(const g in d)if(d[g]){const{index0:x,index1:m}=d[g];Io.fromBufferAttribute(a,x),No.fromBufferAttribute(a,m),f.push(Io.x,Io.y,Io.z),f.push(No.x,No.y,No.z)}this.setAttribute("position",new be(f,3))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}}class ri{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Gt("Curve: .getPoint() not implemented.")}getPointAt(t,e){const n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){const t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const e=[];let n,s=this.getPoint(0),r=0;e.push(0);for(let o=1;o<=t;o++)n=this.getPoint(o/t),r+=n.distanceTo(s),e.push(r),s=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e=null){const n=this.getLengths();let s=0;const r=n.length;let o;e?o=e:o=t*n[r-1];let a=0,l=r-1,c;for(;a<=l;)if(s=Math.floor(a+(l-a)/2),c=n[s]-o,c<0)a=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,n[s]===o)return s/(r-1);const h=n[s],d=n[s+1]-h,f=(o-h)/d;return(s+f)/(r-1)}getTangent(t,e){let s=t-1e-4,r=t+1e-4;s<0&&(s=0),r>1&&(r=1);const o=this.getPoint(s),a=this.getPoint(r),l=e||(o.isVector2?new it:new N);return l.copy(a).sub(o).normalize(),l}getTangentAt(t,e){const n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e=!1){const n=new N,s=[],r=[],o=[],a=new N,l=new Zt;for(let f=0;f<=t;f++){const g=f/t;s[f]=this.getTangentAt(g,new N)}r[0]=new N,o[0]=new N;let c=Number.MAX_VALUE;const h=Math.abs(s[0].x),u=Math.abs(s[0].y),d=Math.abs(s[0].z);h<=c&&(c=h,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),a.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],a),o[0].crossVectors(s[0],r[0]);for(let f=1;f<=t;f++){if(r[f]=r[f-1].clone(),o[f]=o[f-1].clone(),a.crossVectors(s[f-1],s[f]),a.length()>Number.EPSILON){a.normalize();const g=Math.acos(Yt(s[f-1].dot(s[f]),-1,1));r[f].applyMatrix4(l.makeRotationAxis(a,g))}o[f].crossVectors(s[f],r[f])}if(e===!0){let f=Math.acos(Yt(r[0].dot(r[t]),-1,1));f/=t,s[0].dot(a.crossVectors(r[0],r[t]))>0&&(f=-f);for(let g=1;g<=t;g++)r[g].applyMatrix4(l.makeRotationAxis(s[g],f*g)),o[g].crossVectors(s[g],r[g])}return{tangents:s,normals:r,binormals:o}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){const t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}}class Eh extends ri{constructor(t=0,e=0,n=1,s=1,r=0,o=Math.PI*2,a=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=o,this.aClockwise=a,this.aRotation=l}getPoint(t,e=new it){const n=e,s=Math.PI*2;let r=this.aEndAngle-this.aStartAngle;const o=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(o?r=0:r=s),this.aClockwise===!0&&!o&&(r===s?r=-s:r=r-s);const a=this.aStartAngle+t*r;let l=this.aX+this.xRadius*Math.cos(a),c=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){const h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),d=l-this.aX,f=c-this.aY;l=d*h-f*u+this.aX,c=d*u+f*h+this.aY}return n.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){const t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}class Ag extends Eh{constructor(t,e,n,s,r,o){super(t,e,n,n,s,r,o),this.isArcCurve=!0,this.type="ArcCurve"}}function Ah(){let i=0,t=0,e=0,n=0;function s(r,o,a,l){i=r,t=a,e=-3*r+3*o-2*a-l,n=2*r-2*o+a+l}return{initCatmullRom:function(r,o,a,l,c){s(o,a,c*(a-r),c*(l-o))},initNonuniformCatmullRom:function(r,o,a,l,c,h,u){let d=(o-r)/c-(a-r)/(c+h)+(a-o)/h,f=(a-o)/h-(l-o)/(h+u)+(l-a)/u;d*=h,f*=h,s(o,a,d,f)},calc:function(r){const o=r*r,a=o*r;return i+t*r+e*o+n*a}}}const Uo=new N,vl=new Ah,yl=new Ah,Sl=new Ah;class wg extends ri{constructor(t=[],e=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=s}getPoint(t,e=new N){const n=e,s=this.points,r=s.length,o=(r-(this.closed?0:1))*t;let a=Math.floor(o),l=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/r)+1)*r:l===0&&a===r-1&&(a=r-2,l=1);let c,h;this.closed||a>0?c=s[(a-1)%r]:(Uo.subVectors(s[0],s[1]).add(s[0]),c=Uo);const u=s[a%r],d=s[(a+1)%r];if(this.closed||a+2<r?h=s[(a+2)%r]:(Uo.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=Uo),this.curveType==="centripetal"||this.curveType==="chordal"){const f=this.curveType==="chordal"?.5:.25;let g=Math.pow(c.distanceToSquared(u),f),x=Math.pow(u.distanceToSquared(d),f),m=Math.pow(d.distanceToSquared(h),f);x<1e-4&&(x=1),g<1e-4&&(g=x),m<1e-4&&(m=x),vl.initNonuniformCatmullRom(c.x,u.x,d.x,h.x,g,x,m),yl.initNonuniformCatmullRom(c.y,u.y,d.y,h.y,g,x,m),Sl.initNonuniformCatmullRom(c.z,u.z,d.z,h.z,g,x,m)}else this.curveType==="catmullrom"&&(vl.initCatmullRom(c.x,u.x,d.x,h.x,this.tension),yl.initCatmullRom(c.y,u.y,d.y,h.y,this.tension),Sl.initCatmullRom(c.z,u.z,d.z,h.z,this.tension));return n.set(vl.calc(l),yl.calc(l),Sl.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(s.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const s=this.points[e];t.points.push(s.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(new N().fromArray(s))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}function Pu(i,t,e,n,s){const r=(n-t)*.5,o=(s-e)*.5,a=i*i,l=i*a;return(2*e-2*n+r+o)*l+(-3*e+3*n-2*r-o)*a+r*i+e}function Tg(i,t){const e=1-i;return e*e*t}function Cg(i,t){return 2*(1-i)*i*t}function Pg(i,t){return i*i*t}function Gr(i,t,e,n){return Tg(i,t)+Cg(i,e)+Pg(i,n)}function Rg(i,t){const e=1-i;return e*e*e*t}function Lg(i,t){const e=1-i;return 3*e*e*i*t}function Dg(i,t){return 3*(1-i)*i*i*t}function Ig(i,t){return i*i*i*t}function Hr(i,t,e,n,s){return Rg(i,t)+Lg(i,e)+Dg(i,n)+Ig(i,s)}class If extends ri{constructor(t=new it,e=new it,n=new it,s=new it){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new it){const n=e,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Hr(t,s.x,r.x,o.x,a.x),Hr(t,s.y,r.y,o.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Ss extends ri{constructor(t=new N,e=new N,n=new N,s=new N){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new N){const n=e,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Hr(t,s.x,r.x,o.x,a.x),Hr(t,s.y,r.y,o.y,a.y),Hr(t,s.z,r.z,o.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Nf extends ri{constructor(t=new it,e=new it){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new it){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new it){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class tn extends ri{constructor(t=new N,e=new N){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new N){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new N){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Bf extends ri{constructor(t=new it,e=new it,n=new it){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new it){const n=e,s=this.v0,r=this.v1,o=this.v2;return n.set(Gr(t,s.x,r.x,o.x),Gr(t,s.y,r.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class bs extends ri{constructor(t=new N,e=new N,n=new N){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new N){const n=e,s=this.v0,r=this.v1,o=this.v2;return n.set(Gr(t,s.x,r.x,o.x),Gr(t,s.y,r.y,o.y),Gr(t,s.z,r.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Uf extends ri{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new it){const n=e,s=this.points,r=(s.length-1)*t,o=Math.floor(r),a=r-o,l=s[o===0?o:o-1],c=s[o],h=s[o>s.length-2?s.length-1:o+1],u=s[o>s.length-3?s.length-1:o+2];return n.set(Pu(a,l.x,c.x,h.x,u.x),Pu(a,l.y,c.y,h.y,u.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(s.clone())}return this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const s=this.points[e];t.points.push(s.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(new it().fromArray(s))}return this}}var Ru=Object.freeze({__proto__:null,ArcCurve:Ag,CatmullRomCurve3:wg,CubicBezierCurve:If,CubicBezierCurve3:Ss,EllipseCurve:Eh,LineCurve:Nf,LineCurve3:tn,QuadraticBezierCurve:Bf,QuadraticBezierCurve3:bs,SplineCurve:Uf});class wh extends ri{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){const t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){const n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Ru[n](e,t))}return this}getPoint(t,e){const n=t*this.getLength(),s=this.getCurveLengths();let r=0;for(;r<s.length;){if(s[r]>=n){const o=s[r]-n,a=this.curves[r],l=a.getLength(),c=l===0?0:1-o/l;return a.getPointAt(c,e)}r++}return null}getLength(){const t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const t=[];let e=0;for(let n=0,s=this.curves.length;n<s;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){const e=[];let n;for(let s=0,r=this.curves;s<r.length;s++){const o=r[s],a=o.isEllipseCurve?t*2:o.isLineCurve||o.isLineCurve3?1:o.isSplineCurve?t*o.points.length:t,l=o.getPoints(a);for(let c=0;c<l.length;c++){const h=l[c];n&&n.equals(h)||(e.push(h),n=h)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const s=t.curves[e];this.curves.push(s.clone())}return this.autoClose=t.autoClose,this}toJSON(){const t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){const s=this.curves[e];t.curves.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const s=t.curves[e];this.curves.push(new Ru[s.type]().fromJSON(s))}return this}}class cr extends wh{constructor(t){super(),this.type="Path",this.currentPoint=new it,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){const n=new Nf(this.currentPoint.clone(),new it(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,s){const r=new Bf(this.currentPoint.clone(),new it(t,e),new it(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(t,e,n,s,r,o){const a=new If(this.currentPoint.clone(),new it(t,e),new it(n,s),new it(r,o));return this.curves.push(a),this.currentPoint.set(r,o),this}splineThru(t){const e=[this.currentPoint.clone()].concat(t),n=new Uf(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,s,r,o){const a=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+a,e+l,n,s,r,o),this}absarc(t,e,n,s,r,o){return this.absellipse(t,e,n,n,s,r,o),this}ellipse(t,e,n,s,r,o,a,l){const c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(t+c,e+h,n,s,r,o,a,l),this}absellipse(t,e,n,s,r,o,a,l){const c=new Eh(t,e,n,s,r,o,a,l);if(this.curves.length>0){const u=c.getPoint(0);u.equals(this.currentPoint)||this.lineTo(u.x,u.y)}this.curves.push(c);const h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){const t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}}class Xi extends cr{constructor(t){super(t),this.uuid=Cs(),this.type="Shape",this.holes=[]}getPointsHoles(t){const e=[];for(let n=0,s=this.holes.length;n<s;n++)e[n]=this.holes[n].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){const s=t.holes[e];this.holes.push(s.clone())}return this}toJSON(){const t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,n=this.holes.length;e<n;e++){const s=this.holes[e];t.holes.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){const s=t.holes[e];this.holes.push(new cr().fromJSON(s))}return this}}function Ng(i,t,e=2){const n=t&&t.length,s=n?t[0]*e:i.length;let r=Ff(i,0,s,e,!0);const o=[];if(!r||r.next===r.prev)return o;let a,l,c;if(n&&(r=kg(i,t,r,e)),i.length>80*e){a=i[0],l=i[1];let h=a,u=l;for(let d=e;d<s;d+=e){const f=i[d],g=i[d+1];f<a&&(a=f),g<l&&(l=g),f>h&&(h=f),g>u&&(u=g)}c=Math.max(h-a,u-l),c=c!==0?32767/c:0}return Qr(r,o,e,a,l,c,0),o}function Ff(i,t,e,n,s){let r;if(s===jg(i,t,e,n)>0)for(let o=t;o<e;o+=n)r=Lu(o/n|0,i[o],i[o+1],r);else for(let o=e-n;o>=t;o-=n)r=Lu(o/n|0,i[o],i[o+1],r);return r&&mr(r,r.next)&&(eo(r),r=r.next),r}function ws(i,t){if(!i)return i;t||(t=i);let e=i,n;do if(n=!1,!e.steiner&&(mr(e,e.next)||xe(e.prev,e,e.next)===0)){if(eo(e),e=t=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==t);return t}function Qr(i,t,e,n,s,r,o){if(!i)return;!o&&r&&Wg(i,n,s,r);let a=i;for(;i.prev!==i.next;){const l=i.prev,c=i.next;if(r?Ug(i,n,s,r):Bg(i)){t.push(l.i,i.i,c.i),eo(i),i=c.next,a=c.next;continue}if(i=c,i===a){o?o===1?(i=Fg(ws(i),t),Qr(i,t,e,n,s,r,2)):o===2&&Og(i,t,e,n,s,r):Qr(ws(i),t,e,n,s,r,1);break}}}function Bg(i){const t=i.prev,e=i,n=i.next;if(xe(t,e,n)>=0)return!1;const s=t.x,r=e.x,o=n.x,a=t.y,l=e.y,c=n.y,h=Math.min(s,r,o),u=Math.min(a,l,c),d=Math.max(s,r,o),f=Math.max(a,l,c);let g=n.next;for(;g!==t;){if(g.x>=h&&g.x<=d&&g.y>=u&&g.y<=f&&Or(s,a,r,l,o,c,g.x,g.y)&&xe(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function Ug(i,t,e,n){const s=i.prev,r=i,o=i.next;if(xe(s,r,o)>=0)return!1;const a=s.x,l=r.x,c=o.x,h=s.y,u=r.y,d=o.y,f=Math.min(a,l,c),g=Math.min(h,u,d),x=Math.max(a,l,c),m=Math.max(h,u,d),p=Zc(f,g,t,e,n),y=Zc(x,m,t,e,n);let _=i.prevZ,v=i.nextZ;for(;_&&_.z>=p&&v&&v.z<=y;){if(_.x>=f&&_.x<=x&&_.y>=g&&_.y<=m&&_!==s&&_!==o&&Or(a,h,l,u,c,d,_.x,_.y)&&xe(_.prev,_,_.next)>=0||(_=_.prevZ,v.x>=f&&v.x<=x&&v.y>=g&&v.y<=m&&v!==s&&v!==o&&Or(a,h,l,u,c,d,v.x,v.y)&&xe(v.prev,v,v.next)>=0))return!1;v=v.nextZ}for(;_&&_.z>=p;){if(_.x>=f&&_.x<=x&&_.y>=g&&_.y<=m&&_!==s&&_!==o&&Or(a,h,l,u,c,d,_.x,_.y)&&xe(_.prev,_,_.next)>=0)return!1;_=_.prevZ}for(;v&&v.z<=y;){if(v.x>=f&&v.x<=x&&v.y>=g&&v.y<=m&&v!==s&&v!==o&&Or(a,h,l,u,c,d,v.x,v.y)&&xe(v.prev,v,v.next)>=0)return!1;v=v.nextZ}return!0}function Fg(i,t){let e=i;do{const n=e.prev,s=e.next.next;!mr(n,s)&&kf(n,e,e.next,s)&&to(n,s)&&to(s,n)&&(t.push(n.i,e.i,s.i),eo(e),eo(e.next),e=i=s),e=e.next}while(e!==i);return ws(e)}function Og(i,t,e,n,s,r){let o=i;do{let a=o.next.next;for(;a!==o.prev;){if(o.i!==a.i&&qg(o,a)){let l=zf(o,a);o=ws(o,o.next),l=ws(l,l.next),Qr(o,t,e,n,s,r,0),Qr(l,t,e,n,s,r,0);return}a=a.next}o=o.next}while(o!==i)}function kg(i,t,e,n){const s=[];for(let r=0,o=t.length;r<o;r++){const a=t[r]*n,l=r<o-1?t[r+1]*n:i.length,c=Ff(i,a,l,n,!1);c===c.next&&(c.steiner=!0),s.push(Yg(c))}s.sort(zg);for(let r=0;r<s.length;r++)e=Vg(s[r],e);return e}function zg(i,t){let e=i.x-t.x;if(e===0&&(e=i.y-t.y,e===0)){const n=(i.next.y-i.y)/(i.next.x-i.x),s=(t.next.y-t.y)/(t.next.x-t.x);e=n-s}return e}function Vg(i,t){const e=Gg(i,t);if(!e)return t;const n=zf(e,i);return ws(n,n.next),ws(e,e.next)}function Gg(i,t){let e=t;const n=i.x,s=i.y;let r=-1/0,o;if(mr(i,e))return e;do{if(mr(i,e.next))return e.next;if(s<=e.y&&s>=e.next.y&&e.next.y!==e.y){const u=e.x+(s-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(u<=n&&u>r&&(r=u,o=e.x<e.next.x?e:e.next,u===n))return o}e=e.next}while(e!==t);if(!o)return null;const a=o,l=o.x,c=o.y;let h=1/0;e=o;do{if(n>=e.x&&e.x>=l&&n!==e.x&&Of(s<c?n:r,s,l,c,s<c?r:n,s,e.x,e.y)){const u=Math.abs(s-e.y)/(n-e.x);to(e,i)&&(u<h||u===h&&(e.x>o.x||e.x===o.x&&Hg(o,e)))&&(o=e,h=u)}e=e.next}while(e!==a);return o}function Hg(i,t){return xe(i.prev,i,t.prev)<0&&xe(t.next,i,i.next)<0}function Wg(i,t,e,n){let s=i;do s.z===0&&(s.z=Zc(s.x,s.y,t,e,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,Xg(s)}function Xg(i){let t,e=1;do{let n=i,s;i=null;let r=null;for(t=0;n;){t++;let o=n,a=0;for(let c=0;c<e&&(a++,o=o.nextZ,!!o);c++);let l=e;for(;a>0||l>0&&o;)a!==0&&(l===0||!o||n.z<=o.z)?(s=n,n=n.nextZ,a--):(s=o,o=o.nextZ,l--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=o}r.nextZ=null,e*=2}while(t>1);return i}function Zc(i,t,e,n,s){return i=(i-e)*s|0,t=(t-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,i|t<<1}function Yg(i){let t=i,e=i;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==i);return e}function Of(i,t,e,n,s,r,o,a){return(s-o)*(t-a)>=(i-o)*(r-a)&&(i-o)*(n-a)>=(e-o)*(t-a)&&(e-o)*(r-a)>=(s-o)*(n-a)}function Or(i,t,e,n,s,r,o,a){return!(i===o&&t===a)&&Of(i,t,e,n,s,r,o,a)}function qg(i,t){return i.next.i!==t.i&&i.prev.i!==t.i&&!$g(i,t)&&(to(i,t)&&to(t,i)&&Zg(i,t)&&(xe(i.prev,i,t.prev)||xe(i,t.prev,t))||mr(i,t)&&xe(i.prev,i,i.next)>0&&xe(t.prev,t,t.next)>0)}function xe(i,t,e){return(t.y-i.y)*(e.x-t.x)-(t.x-i.x)*(e.y-t.y)}function mr(i,t){return i.x===t.x&&i.y===t.y}function kf(i,t,e,n){const s=Oo(xe(i,t,e)),r=Oo(xe(i,t,n)),o=Oo(xe(e,n,i)),a=Oo(xe(e,n,t));return!!(s!==r&&o!==a||s===0&&Fo(i,e,t)||r===0&&Fo(i,n,t)||o===0&&Fo(e,i,n)||a===0&&Fo(e,t,n))}function Fo(i,t,e){return t.x<=Math.max(i.x,e.x)&&t.x>=Math.min(i.x,e.x)&&t.y<=Math.max(i.y,e.y)&&t.y>=Math.min(i.y,e.y)}function Oo(i){return i>0?1:i<0?-1:0}function $g(i,t){let e=i;do{if(e.i!==i.i&&e.next.i!==i.i&&e.i!==t.i&&e.next.i!==t.i&&kf(e,e.next,i,t))return!0;e=e.next}while(e!==i);return!1}function to(i,t){return xe(i.prev,i,i.next)<0?xe(i,t,i.next)>=0&&xe(i,i.prev,t)>=0:xe(i,t,i.prev)<0||xe(i,i.next,t)<0}function Zg(i,t){let e=i,n=!1;const s=(i.x+t.x)/2,r=(i.y+t.y)/2;do e.y>r!=e.next.y>r&&e.next.y!==e.y&&s<(e.next.x-e.x)*(r-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==i);return n}function zf(i,t){const e=jc(i.i,i.x,i.y),n=jc(t.i,t.x,t.y),s=i.next,r=t.prev;return i.next=t,t.prev=i,e.next=s,s.prev=e,n.next=e,e.prev=n,r.next=n,n.prev=r,n}function Lu(i,t,e,n){const s=jc(i,t,e);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function eo(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function jc(i,t,e){return{i,x:t,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function jg(i,t,e,n){let s=0;for(let r=t,o=e-n;r<e;r+=n)s+=(i[o]-i[r])*(i[r+1]+i[o+1]),o=r;return s}class Kg{static triangulate(t,e,n=2){return Ng(t,e,n)}}class Ms{static area(t){const e=t.length;let n=0;for(let s=e-1,r=0;r<e;s=r++)n+=t[s].x*t[r].y-t[r].x*t[s].y;return n*.5}static isClockWise(t){return Ms.area(t)<0}static triangulateShape(t,e){const n=[],s=[],r=[];Du(t),Iu(n,t);let o=t.length;e.forEach(Du);for(let l=0;l<e.length;l++)s.push(o),o+=e[l].length,Iu(n,e[l]);const a=Kg.triangulate(n,s);for(let l=0;l<a.length;l+=3)r.push(a.slice(l,l+3));return r}}function Du(i){const t=i.length;t>2&&i[t-1].equals(i[0])&&i.pop()}function Iu(i,t){for(let e=0;e<t.length;e++)i.push(t[e].x),i.push(t[e].y)}class Ba extends De{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};const r=t/2,o=e/2,a=Math.floor(n),l=Math.floor(s),c=a+1,h=l+1,u=t/a,d=e/l,f=[],g=[],x=[],m=[];for(let p=0;p<h;p++){const y=p*d-o;for(let _=0;_<c;_++){const v=_*u-r;g.push(v,-y,0),x.push(0,0,1),m.push(_/a),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let y=0;y<a;y++){const _=y+c*p,v=y+c*(p+1),S=y+1+c*(p+1),E=y+1+c*p;f.push(_,v,E),f.push(v,S,E)}this.setIndex(f),this.setAttribute("position",new be(g,3)),this.setAttribute("normal",new be(x,3)),this.setAttribute("uv",new be(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ba(t.width,t.height,t.widthSegments,t.heightSegments)}}class Ua extends De{constructor(t=new Xi([new it(0,.5),new it(-.5,-.5),new it(.5,-.5)]),e=12){super(),this.type="ShapeGeometry",this.parameters={shapes:t,curveSegments:e};const n=[],s=[],r=[],o=[];let a=0,l=0;if(Array.isArray(t)===!1)c(t);else for(let h=0;h<t.length;h++)c(t[h]),this.addGroup(a,l,h),a+=l,l=0;this.setIndex(n),this.setAttribute("position",new be(s,3)),this.setAttribute("normal",new be(r,3)),this.setAttribute("uv",new be(o,2));function c(h){const u=s.length/3,d=h.extractPoints(e);let f=d.shape;const g=d.holes;Ms.isClockWise(f)===!1&&(f=f.reverse());for(let m=0,p=g.length;m<p;m++){const y=g[m];Ms.isClockWise(y)===!0&&(g[m]=y.reverse())}const x=Ms.triangulateShape(f,g);for(let m=0,p=g.length;m<p;m++){const y=g[m];f=f.concat(y)}for(let m=0,p=f.length;m<p;m++){const y=f[m];s.push(y.x,y.y,0),r.push(0,0,1),o.push(y.x,y.y)}for(let m=0,p=x.length;m<p;m++){const y=x[m],_=y[0]+u,v=y[1]+u,S=y[2]+u;n.push(_,v,S),l+=3}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){const t=super.toJSON(),e=this.parameters.shapes;return Jg(e,t)}static fromJSON(t,e){const n=[];for(let s=0,r=t.shapes.length;s<r;s++){const o=e[t.shapes[s]];n.push(o)}return new Ua(n,t.curveSegments)}}function Jg(i,t){if(t.shapes=[],Array.isArray(i))for(let e=0,n=i.length;e<n;e++){const s=i[e];t.shapes.push(s.uuid)}else t.shapes.push(i.uuid);return t}class Qg extends si{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class _i extends _r{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new qt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new qt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=yf,this.normalScale=new it(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new yn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class t0 extends _i{constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new it(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Yt(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new qt(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new qt(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new qt(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}}class e0 extends _r{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=bm,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class n0 extends _r{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}const Nu={enabled:!1,files:{},add:function(i,t){this.enabled!==!1&&(this.files[i]=t)},get:function(i){if(this.enabled!==!1)return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};class i0{constructor(t,e,n){const s=this;let r=!1,o=0,a=0,l;const c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(h){a++,r===!1&&s.onStart!==void 0&&s.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,s.onProgress!==void 0&&s.onProgress(h,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){const u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=c.length;u<d;u+=2){const f=c[u],g=c[u+1];if(f.global&&(f.lastIndex=0),f.test(h))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const s0=new i0;class Th{constructor(t){this.manager=t!==void 0?t:s0,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(t,e){const n=this;return new Promise(function(s,r){n.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}}Th.DEFAULT_MATERIAL_NAME="__DEFAULT";const di={};class r0 extends Error{constructor(t,e){super(t),this.response=e}}class o0 extends Th{constructor(t){super(t),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(t,e,n,s){t===void 0&&(t=""),this.path!==void 0&&(t=this.path+t),t=this.manager.resolveURL(t);const r=Nu.get(`file:${t}`);if(r!==void 0)return this.manager.itemStart(t),setTimeout(()=>{e&&e(r),this.manager.itemEnd(t)},0),r;if(di[t]!==void 0){di[t].push({onLoad:e,onProgress:n,onError:s});return}di[t]=[],di[t].push({onLoad:e,onProgress:n,onError:s});const o=new Request(t,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),a=this.mimeType,l=this.responseType;fetch(o).then(c=>{if(c.status===200||c.status===0){if(c.status===0&&Gt("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||c.body===void 0||c.body.getReader===void 0)return c;const h=di[t],u=c.body.getReader(),d=c.headers.get("X-File-Size")||c.headers.get("Content-Length"),f=d?parseInt(d):0,g=f!==0;let x=0;const m=new ReadableStream({start(p){y();function y(){u.read().then(({done:_,value:v})=>{if(_)p.close();else{x+=v.byteLength;const S=new ProgressEvent("progress",{lengthComputable:g,loaded:x,total:f});for(let E=0,M=h.length;E<M;E++){const T=h[E];T.onProgress&&T.onProgress(S)}p.enqueue(v),y()}},_=>{p.error(_)})}}});return new Response(m)}else throw new r0(`fetch for "${c.url}" responded with ${c.status}: ${c.statusText}`,c)}).then(c=>{switch(l){case"arraybuffer":return c.arrayBuffer();case"blob":return c.blob();case"document":return c.text().then(h=>new DOMParser().parseFromString(h,a));case"json":return c.json();default:if(a==="")return c.text();{const u=/charset="?([^;"\s]*)"?/i.exec(a),d=u&&u[1]?u[1].toLowerCase():void 0,f=new TextDecoder(d);return c.arrayBuffer().then(g=>f.decode(g))}}}).then(c=>{Nu.add(`file:${t}`,c);const h=di[t];delete di[t];for(let u=0,d=h.length;u<d;u++){const f=h[u];f.onLoad&&f.onLoad(c)}}).catch(c=>{const h=di[t];if(h===void 0)throw this.manager.itemError(t),c;delete di[t];for(let u=0,d=h.length;u<d;u++){const f=h[u];f.onError&&f.onError(c)}this.manager.itemError(t)}).finally(()=>{this.manager.itemEnd(t)}),this.manager.itemStart(t)}setResponseType(t){return this.responseType=t,this}setMimeType(t){return this.mimeType=t,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}class Ch extends Oe{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new qt(t),this.intensity=e}dispose(){this.dispatchEvent({type:"dispose"})}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}}class a0 extends Ch{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Oe.DEFAULT_UP),this.updateMatrix(),this.groundColor=new qt(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}toJSON(t){const e=super.toJSON(t);return e.object.groundColor=this.groundColor.getHex(),e}}const bl=new Zt,Bu=new N,Uu=new N;class l0{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new it(512,512),this.mapType=_n,this.map=null,this.mapPass=null,this.matrix=new Zt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Sh,this._frameExtents=new it(1,1),this._viewportCount=1,this._viewports=[new le(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,n=this.matrix;Bu.setFromMatrixPosition(t.matrixWorld),e.position.copy(Bu),Uu.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Uu),e.updateMatrixWorld(),bl.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(bl,e.coordinateSystem,e.reversedDepth),e.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(bl)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}class Ph extends Pf{constructor(t=-1,e=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=n-t,o=n+t,a=s+e,l=s-e;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}class c0 extends l0{constructor(){super(new Ph(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class h0 extends Ch{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Oe.DEFAULT_UP),this.updateMatrix(),this.target=new Oe,this.shadow=new c0}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){const e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}}class u0 extends Ch{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}}class d0 extends Tn{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}}class Fu{constructor(t=1,e=0,n=0){this.radius=t,this.phi=e,this.theta=n}set(t,e,n){return this.radius=t,this.phi=e,this.theta=n,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=Yt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+e*e+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,n),this.phi=Math.acos(Yt(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const Ou=new it;class f0{constructor(t=new it(1/0,1/0),e=new it(-1/0,-1/0)){this.isBox2=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=Ou.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=1/0,this.max.x=this.max.y=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y}getCenter(t){return this.isEmpty()?t.set(0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Ou).distanceTo(t)}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}const ku=new N,ko=new N,Ws=new N,Xs=new N,Ml=new N,p0=new N,m0=new N;class In{constructor(t=new N,e=new N){this.start=t,this.end=e}set(t,e){return this.start.copy(t),this.end.copy(e),this}copy(t){return this.start.copy(t.start),this.end.copy(t.end),this}getCenter(t){return t.addVectors(this.start,this.end).multiplyScalar(.5)}delta(t){return t.subVectors(this.end,this.start)}distanceSq(){return this.start.distanceToSquared(this.end)}distance(){return this.start.distanceTo(this.end)}at(t,e){return this.delta(e).multiplyScalar(t).add(this.start)}closestPointToPointParameter(t,e){ku.subVectors(t,this.start),ko.subVectors(this.end,this.start);const n=ko.dot(ko);let r=ko.dot(ku)/n;return e&&(r=Yt(r,0,1)),r}closestPointToPoint(t,e,n){const s=this.closestPointToPointParameter(t,e);return this.delta(n).multiplyScalar(s).add(this.start)}distanceSqToLine3(t,e=p0,n=m0){const s=10000000000000001e-32;let r,o;const a=this.start,l=t.start,c=this.end,h=t.end;Ws.subVectors(c,a),Xs.subVectors(h,l),Ml.subVectors(a,l);const u=Ws.dot(Ws),d=Xs.dot(Xs),f=Xs.dot(Ml);if(u<=s&&d<=s)return e.copy(a),n.copy(l),e.sub(n),e.dot(e);if(u<=s)r=0,o=f/d,o=Yt(o,0,1);else{const g=Ws.dot(Ml);if(d<=s)o=0,r=Yt(-g/u,0,1);else{const x=Ws.dot(Xs),m=u*d-x*x;m!==0?r=Yt((x*f-g*d)/m,0,1):r=0,o=(x*r+f)/d,o<0?(o=0,r=Yt(-g/u,0,1)):o>1&&(o=1,r=Yt((x-g)/u,0,1))}}return e.copy(a).add(Ws.multiplyScalar(r)),n.copy(l).add(Xs.multiplyScalar(o)),e.sub(n),e.dot(e)}applyMatrix4(t){return this.start.applyMatrix4(t),this.end.applyMatrix4(t),this}equals(t){return t.start.equals(this.start)&&t.end.equals(this.end)}clone(){return new this.constructor().copy(this)}}class g0 extends Mh{constructor(t=10,e=10,n=4473924,s=8947848){n=new qt(n),s=new qt(s);const r=e/2,o=t/e,a=t/2,l=[],c=[];for(let d=0,f=0,g=-a;d<=e;d++,g+=o){l.push(-a,0,g,a,0,g),l.push(g,0,-a,g,0,a);const x=d===r?n:s;x.toArray(c,f),f+=3,x.toArray(c,f),f+=3,x.toArray(c,f),f+=3,x.toArray(c,f),f+=3}const h=new De;h.setAttribute("position",new be(l,3)),h.setAttribute("color",new be(c,3));const u=new vr({vertexColors:!0,toneMapped:!1});super(h,u),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}class x0 extends Mh{constructor(t=1){const e=[0,0,0,t,0,0,0,0,0,0,t,0,0,0,0,0,0,t],n=[1,0,0,1,.6,0,0,1,0,.6,1,0,0,0,1,0,.6,1],s=new De;s.setAttribute("position",new be(e,3)),s.setAttribute("color",new be(n,3));const r=new vr({vertexColors:!0,toneMapped:!1});super(s,r),this.type="AxesHelper"}setColors(t,e,n){const s=new qt,r=this.geometry.attributes.color.array;return s.set(t),s.toArray(r,0),s.toArray(r,3),s.set(e),s.toArray(r,6),s.toArray(r,9),s.set(n),s.toArray(r,12),s.toArray(r,15),this.geometry.attributes.color.needsUpdate=!0,this}dispose(){this.geometry.dispose(),this.material.dispose()}}class ss{constructor(){this.type="ShapePath",this.color=new qt,this.subPaths=[],this.currentPath=null}moveTo(t,e){return this.currentPath=new cr,this.subPaths.push(this.currentPath),this.currentPath.moveTo(t,e),this}lineTo(t,e){return this.currentPath.lineTo(t,e),this}quadraticCurveTo(t,e,n,s){return this.currentPath.quadraticCurveTo(t,e,n,s),this}bezierCurveTo(t,e,n,s,r,o){return this.currentPath.bezierCurveTo(t,e,n,s,r,o),this}splineThru(t){return this.currentPath.splineThru(t),this}toShapes(t){function e(p){const y=[];for(let _=0,v=p.length;_<v;_++){const S=p[_],E=new Xi;E.curves=S.curves,y.push(E)}return y}function n(p,y){const _=y.length;let v=!1;for(let S=_-1,E=0;E<_;S=E++){let M=y[S],T=y[E],b=T.x-M.x,A=T.y-M.y;if(Math.abs(A)>Number.EPSILON){if(A<0&&(M=y[E],b=-b,T=y[S],A=-A),p.y<M.y||p.y>T.y)continue;if(p.y===M.y){if(p.x===M.x)return!0}else{const D=A*(p.x-M.x)-b*(p.y-M.y);if(D===0)return!0;if(D<0)continue;v=!v}}else{if(p.y!==M.y)continue;if(T.x<=p.x&&p.x<=M.x||M.x<=p.x&&p.x<=T.x)return!0}}return v}const s=Ms.isClockWise,r=this.subPaths;if(r.length===0)return[];let o,a,l;const c=[];if(r.length===1)return a=r[0],l=new Xi,l.curves=a.curves,c.push(l),c;let h=!s(r[0].getPoints());h=t?!h:h;const u=[],d=[];let f=[],g=0,x;d[g]=void 0,f[g]=[];for(let p=0,y=r.length;p<y;p++)a=r[p],x=a.getPoints(),o=s(x),o=t?!o:o,o?(!h&&d[g]&&g++,d[g]={s:new Xi,p:x},d[g].s.curves=a.curves,h&&g++,f[g]=[]):f[g].push({h:a,p:x[0]});if(!d[0])return e(r);if(d.length>1){let p=!1,y=0;for(let _=0,v=d.length;_<v;_++)u[_]=[];for(let _=0,v=d.length;_<v;_++){const S=f[_];for(let E=0;E<S.length;E++){const M=S[E];let T=!0;for(let b=0;b<d.length;b++)n(M.p,d[b].p)&&(_!==b&&y++,T?(T=!1,u[b].push(M)):p=!0);T&&u[_].push(M)}}y>0&&p===!1&&(f=u)}let m;for(let p=0,y=d.length;p<y;p++){l=d[p].s,c.push(l),m=f[p];for(let _=0,v=m.length;_<v;_++)l.holes.push(m[_].h)}return c}}class _0 extends Ts{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){if(t===void 0){Gt("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}}function zu(i,t,e,n){const s=v0(n);switch(e){case xf:return i*t;case vf:return i*t/s.components*s.byteLength;case ph:return i*t/s.components*s.byteLength;case dr:return i*t*2/s.components*s.byteLength;case mh:return i*t*2/s.components*s.byteLength;case _f:return i*t*3/s.components*s.byteLength;case Wn:return i*t*4/s.components*s.byteLength;case gh:return i*t*4/s.components*s.byteLength;case fa:case pa:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case ma:case ga:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case _c:case yc:return Math.max(i,16)*Math.max(t,8)/4;case xc:case vc:return Math.max(i,8)*Math.max(t,8)/2;case Sc:case bc:case Ec:case Ac:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Mc:case wc:case Tc:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Cc:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Pc:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case Rc:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case Lc:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case Dc:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case Ic:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case Nc:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case Bc:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case Uc:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case Fc:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case Oc:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case kc:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case zc:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case Vc:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case Gc:case Hc:case Wc:return Math.ceil(i/4)*Math.ceil(t/4)*16;case Xc:case Yc:return Math.ceil(i/4)*Math.ceil(t/4)*8;case qc:case $c:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function v0(i){switch(i){case _n:case ff:return{byteLength:1,components:1};case $r:case pf:case Ai:return{byteLength:2,components:1};case dh:case fh:return{byteLength:2,components:4};case ii:case uh:case Kn:return{byteLength:4,components:1};case mf:case gf:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:oo}}));typeof window<"u"&&(window.__THREE__?Gt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=oo);/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Vf(){let i=null,t=!1,e=null,n=null;function s(r,o){e(r,o),n=i.requestAnimationFrame(s)}return{start:function(){t!==!0&&e!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function y0(i){const t=new WeakMap;function e(a,l){const c=a.array,h=a.usage,u=c.byteLength,d=i.createBuffer();i.bindBuffer(l,d),i.bufferData(l,c,h),a.onUploadCallback();let f;if(c instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=i.SHORT;else if(c instanceof Uint32Array)f=i.UNSIGNED_INT;else if(c instanceof Int32Array)f=i.INT;else if(c instanceof Int8Array)f=i.BYTE;else if(c instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:u}}function n(a,l,c){const h=l.array,u=l.updateRanges;if(i.bindBuffer(c,a),u.length===0)i.bufferSubData(c,0,h);else{u.sort((f,g)=>f.start-g.start);let d=0;for(let f=1;f<u.length;f++){const g=u[d],x=u[f];x.start<=g.start+g.count+1?g.count=Math.max(g.count,x.start+x.count-g.start):(++d,u[d]=x)}u.length=d+1;for(let f=0,g=u.length;f<g;f++){const x=u[f];i.bufferSubData(c,x.start*h.BYTES_PER_ELEMENT,h,x.start,x.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=t.get(a);l&&(i.deleteBuffer(l.buffer),t.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=t.get(a);if(c===void 0)t.set(a,e(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var S0=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,b0=`#ifdef USE_ALPHAHASH
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
#endif`,M0=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,E0=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,A0=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,w0=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,T0=`#ifdef USE_AOMAP
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
#endif`,C0=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,P0=`#ifdef USE_BATCHING
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
#endif`,R0=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,L0=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,D0=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,I0=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,N0=`#ifdef USE_IRIDESCENCE
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
#endif`,B0=`#ifdef USE_BUMPMAP
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
#endif`,U0=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,F0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,O0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,k0=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,z0=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,V0=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,G0=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,H0=`#if defined( USE_COLOR_ALPHA )
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
#endif`,W0=`#define PI 3.141592653589793
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
} // validated`,X0=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Y0=`vec3 transformedNormal = objectNormal;
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
#endif`,q0=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,$0=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Z0=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,j0=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,K0="gl_FragColor = linearToOutputTexel( gl_FragColor );",J0=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Q0=`#ifdef USE_ENVMAP
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
#endif`,tx=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,ex=`#ifdef USE_ENVMAP
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
#endif`,nx=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,ix=`#ifdef USE_ENVMAP
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
#endif`,sx=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,rx=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,ox=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,ax=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,lx=`#ifdef USE_GRADIENTMAP
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
}`,cx=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,hx=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,ux=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,dx=`uniform bool receiveShadow;
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
#endif`,fx=`#ifdef USE_ENVMAP
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
#endif`,px=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,mx=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,gx=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,xx=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,_x=`PhysicalMaterial material;
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
#endif`,vx=`uniform sampler2D dfgLUT;
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
}`,yx=`
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
#endif`,Sx=`#if defined( RE_IndirectDiffuse )
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
#endif`,bx=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Mx=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Ex=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Ax=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,wx=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Tx=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Cx=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Px=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Rx=`#if defined( USE_POINTS_UV )
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
#endif`,Lx=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Dx=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Ix=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Nx=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Bx=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ux=`#ifdef USE_MORPHTARGETS
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
#endif`,Fx=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ox=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,kx=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,zx=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Vx=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Gx=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Hx=`#ifdef USE_NORMALMAP
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
#endif`,Wx=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Xx=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Yx=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,qx=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,$x=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Zx=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,jx=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Kx=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Jx=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Qx=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,t_=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,e_=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,n_=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,i_=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,s_=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,r_=`float getShadowMask() {
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
}`,o_=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,a_=`#ifdef USE_SKINNING
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
#endif`,l_=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,c_=`#ifdef USE_SKINNING
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
#endif`,h_=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,u_=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,d_=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,f_=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,p_=`#ifdef USE_TRANSMISSION
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
#endif`,m_=`#ifdef USE_TRANSMISSION
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
#endif`,g_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,x_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,__=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,v_=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const y_=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,S_=`uniform sampler2D t2D;
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
}`,b_=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,M_=`#ifdef ENVMAP_TYPE_CUBE
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
}`,E_=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,A_=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,w_=`#include <common>
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
}`,T_=`#if DEPTH_PACKING == 3200
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
}`,C_=`#define DISTANCE
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
}`,P_=`#define DISTANCE
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
}`,R_=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,L_=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,D_=`uniform float scale;
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
}`,I_=`uniform vec3 diffuse;
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
}`,N_=`#include <common>
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
}`,B_=`uniform vec3 diffuse;
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
}`,U_=`#define LAMBERT
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
}`,F_=`#define LAMBERT
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
}`,O_=`#define MATCAP
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
}`,k_=`#define MATCAP
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
}`,z_=`#define NORMAL
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
}`,V_=`#define NORMAL
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
}`,G_=`#define PHONG
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
}`,H_=`#define PHONG
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
}`,W_=`#define STANDARD
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
}`,X_=`#define STANDARD
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
}`,Y_=`#define TOON
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
}`,q_=`#define TOON
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
}`,$_=`uniform float size;
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
}`,Z_=`uniform vec3 diffuse;
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
}`,j_=`#include <common>
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
}`,K_=`uniform vec3 color;
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
}`,J_=`uniform float rotation;
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
}`,Q_=`uniform vec3 diffuse;
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
}`,Kt={alphahash_fragment:S0,alphahash_pars_fragment:b0,alphamap_fragment:M0,alphamap_pars_fragment:E0,alphatest_fragment:A0,alphatest_pars_fragment:w0,aomap_fragment:T0,aomap_pars_fragment:C0,batching_pars_vertex:P0,batching_vertex:R0,begin_vertex:L0,beginnormal_vertex:D0,bsdfs:I0,iridescence_fragment:N0,bumpmap_pars_fragment:B0,clipping_planes_fragment:U0,clipping_planes_pars_fragment:F0,clipping_planes_pars_vertex:O0,clipping_planes_vertex:k0,color_fragment:z0,color_pars_fragment:V0,color_pars_vertex:G0,color_vertex:H0,common:W0,cube_uv_reflection_fragment:X0,defaultnormal_vertex:Y0,displacementmap_pars_vertex:q0,displacementmap_vertex:$0,emissivemap_fragment:Z0,emissivemap_pars_fragment:j0,colorspace_fragment:K0,colorspace_pars_fragment:J0,envmap_fragment:Q0,envmap_common_pars_fragment:tx,envmap_pars_fragment:ex,envmap_pars_vertex:nx,envmap_physical_pars_fragment:fx,envmap_vertex:ix,fog_vertex:sx,fog_pars_vertex:rx,fog_fragment:ox,fog_pars_fragment:ax,gradientmap_pars_fragment:lx,lightmap_pars_fragment:cx,lights_lambert_fragment:hx,lights_lambert_pars_fragment:ux,lights_pars_begin:dx,lights_toon_fragment:px,lights_toon_pars_fragment:mx,lights_phong_fragment:gx,lights_phong_pars_fragment:xx,lights_physical_fragment:_x,lights_physical_pars_fragment:vx,lights_fragment_begin:yx,lights_fragment_maps:Sx,lights_fragment_end:bx,logdepthbuf_fragment:Mx,logdepthbuf_pars_fragment:Ex,logdepthbuf_pars_vertex:Ax,logdepthbuf_vertex:wx,map_fragment:Tx,map_pars_fragment:Cx,map_particle_fragment:Px,map_particle_pars_fragment:Rx,metalnessmap_fragment:Lx,metalnessmap_pars_fragment:Dx,morphinstance_vertex:Ix,morphcolor_vertex:Nx,morphnormal_vertex:Bx,morphtarget_pars_vertex:Ux,morphtarget_vertex:Fx,normal_fragment_begin:Ox,normal_fragment_maps:kx,normal_pars_fragment:zx,normal_pars_vertex:Vx,normal_vertex:Gx,normalmap_pars_fragment:Hx,clearcoat_normal_fragment_begin:Wx,clearcoat_normal_fragment_maps:Xx,clearcoat_pars_fragment:Yx,iridescence_pars_fragment:qx,opaque_fragment:$x,packing:Zx,premultiplied_alpha_fragment:jx,project_vertex:Kx,dithering_fragment:Jx,dithering_pars_fragment:Qx,roughnessmap_fragment:t_,roughnessmap_pars_fragment:e_,shadowmap_pars_fragment:n_,shadowmap_pars_vertex:i_,shadowmap_vertex:s_,shadowmask_pars_fragment:r_,skinbase_vertex:o_,skinning_pars_vertex:a_,skinning_vertex:l_,skinnormal_vertex:c_,specularmap_fragment:h_,specularmap_pars_fragment:u_,tonemapping_fragment:d_,tonemapping_pars_fragment:f_,transmission_fragment:p_,transmission_pars_fragment:m_,uv_pars_fragment:g_,uv_pars_vertex:x_,uv_vertex:__,worldpos_vertex:v_,background_vert:y_,background_frag:S_,backgroundCube_vert:b_,backgroundCube_frag:M_,cube_vert:E_,cube_frag:A_,depth_vert:w_,depth_frag:T_,distance_vert:C_,distance_frag:P_,equirect_vert:R_,equirect_frag:L_,linedashed_vert:D_,linedashed_frag:I_,meshbasic_vert:N_,meshbasic_frag:B_,meshlambert_vert:U_,meshlambert_frag:F_,meshmatcap_vert:O_,meshmatcap_frag:k_,meshnormal_vert:z_,meshnormal_frag:V_,meshphong_vert:G_,meshphong_frag:H_,meshphysical_vert:W_,meshphysical_frag:X_,meshtoon_vert:Y_,meshtoon_frag:q_,points_vert:$_,points_frag:Z_,shadow_vert:j_,shadow_frag:K_,sprite_vert:J_,sprite_frag:Q_},Et={common:{diffuse:{value:new qt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Xt},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Xt}},envmap:{envMap:{value:null},envMapRotation:{value:new Xt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Xt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Xt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Xt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Xt},normalScale:{value:new it(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Xt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Xt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Xt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Xt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new qt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new qt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0},uvTransform:{value:new Xt}},sprite:{diffuse:{value:new qt(16777215)},opacity:{value:1},center:{value:new it(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Xt},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0}}},jn={basic:{uniforms:Qe([Et.common,Et.specularmap,Et.envmap,Et.aomap,Et.lightmap,Et.fog]),vertexShader:Kt.meshbasic_vert,fragmentShader:Kt.meshbasic_frag},lambert:{uniforms:Qe([Et.common,Et.specularmap,Et.envmap,Et.aomap,Et.lightmap,Et.emissivemap,Et.bumpmap,Et.normalmap,Et.displacementmap,Et.fog,Et.lights,{emissive:{value:new qt(0)}}]),vertexShader:Kt.meshlambert_vert,fragmentShader:Kt.meshlambert_frag},phong:{uniforms:Qe([Et.common,Et.specularmap,Et.envmap,Et.aomap,Et.lightmap,Et.emissivemap,Et.bumpmap,Et.normalmap,Et.displacementmap,Et.fog,Et.lights,{emissive:{value:new qt(0)},specular:{value:new qt(1118481)},shininess:{value:30}}]),vertexShader:Kt.meshphong_vert,fragmentShader:Kt.meshphong_frag},standard:{uniforms:Qe([Et.common,Et.envmap,Et.aomap,Et.lightmap,Et.emissivemap,Et.bumpmap,Et.normalmap,Et.displacementmap,Et.roughnessmap,Et.metalnessmap,Et.fog,Et.lights,{emissive:{value:new qt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Kt.meshphysical_vert,fragmentShader:Kt.meshphysical_frag},toon:{uniforms:Qe([Et.common,Et.aomap,Et.lightmap,Et.emissivemap,Et.bumpmap,Et.normalmap,Et.displacementmap,Et.gradientmap,Et.fog,Et.lights,{emissive:{value:new qt(0)}}]),vertexShader:Kt.meshtoon_vert,fragmentShader:Kt.meshtoon_frag},matcap:{uniforms:Qe([Et.common,Et.bumpmap,Et.normalmap,Et.displacementmap,Et.fog,{matcap:{value:null}}]),vertexShader:Kt.meshmatcap_vert,fragmentShader:Kt.meshmatcap_frag},points:{uniforms:Qe([Et.points,Et.fog]),vertexShader:Kt.points_vert,fragmentShader:Kt.points_frag},dashed:{uniforms:Qe([Et.common,Et.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Kt.linedashed_vert,fragmentShader:Kt.linedashed_frag},depth:{uniforms:Qe([Et.common,Et.displacementmap]),vertexShader:Kt.depth_vert,fragmentShader:Kt.depth_frag},normal:{uniforms:Qe([Et.common,Et.bumpmap,Et.normalmap,Et.displacementmap,{opacity:{value:1}}]),vertexShader:Kt.meshnormal_vert,fragmentShader:Kt.meshnormal_frag},sprite:{uniforms:Qe([Et.sprite,Et.fog]),vertexShader:Kt.sprite_vert,fragmentShader:Kt.sprite_frag},background:{uniforms:{uvTransform:{value:new Xt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Kt.background_vert,fragmentShader:Kt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Xt}},vertexShader:Kt.backgroundCube_vert,fragmentShader:Kt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Kt.cube_vert,fragmentShader:Kt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Kt.equirect_vert,fragmentShader:Kt.equirect_frag},distance:{uniforms:Qe([Et.common,Et.displacementmap,{referencePosition:{value:new N},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Kt.distance_vert,fragmentShader:Kt.distance_frag},shadow:{uniforms:Qe([Et.lights,Et.fog,{color:{value:new qt(0)},opacity:{value:1}}]),vertexShader:Kt.shadow_vert,fragmentShader:Kt.shadow_frag}};jn.physical={uniforms:Qe([jn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Xt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Xt},clearcoatNormalScale:{value:new it(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Xt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Xt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Xt},sheen:{value:0},sheenColor:{value:new qt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Xt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Xt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Xt},transmissionSamplerSize:{value:new it},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Xt},attenuationDistance:{value:0},attenuationColor:{value:new qt(0)},specularColor:{value:new qt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Xt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Xt},anisotropyVector:{value:new it},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Xt}}]),vertexShader:Kt.meshphysical_vert,fragmentShader:Kt.meshphysical_frag};const zo={r:0,b:0,g:0},rs=new yn,tv=new Zt;function ev(i,t,e,n,s,r,o){const a=new qt(0);let l=r===!0?0:1,c,h,u=null,d=0,f=null;function g(_){let v=_.isScene===!0?_.background:null;return v&&v.isTexture&&(v=(_.backgroundBlurriness>0?e:t).get(v)),v}function x(_){let v=!1;const S=g(_);S===null?p(a,l):S&&S.isColor&&(p(S,1),v=!0);const E=i.xr.getEnvironmentBlendMode();E==="additive"?n.buffers.color.setClear(0,0,0,1,o):E==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,o),(i.autoClear||v)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function m(_,v){const S=g(v);S&&(S.isCubeTexture||S.mapping===Ia)?(h===void 0&&(h=new Sn(new $i(1,1,1),new si({name:"BackgroundCubeMaterial",uniforms:pr(jn.backgroundCube.uniforms),vertexShader:jn.backgroundCube.vertexShader,fragmentShader:jn.backgroundCube.fragmentShader,side:nn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(E,M,T){this.matrixWorld.copyPosition(T.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(h)),rs.copy(v.backgroundRotation),rs.x*=-1,rs.y*=-1,rs.z*=-1,S.isCubeTexture&&S.isRenderTargetTexture===!1&&(rs.y*=-1,rs.z*=-1),h.material.uniforms.envMap.value=S,h.material.uniforms.flipEnvMap.value=S.isCubeTexture&&S.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=v.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(tv.makeRotationFromEuler(rs)),h.material.toneMapped=te.getTransfer(S.colorSpace)!==oe,(u!==S||d!==S.version||f!==i.toneMapping)&&(h.material.needsUpdate=!0,u=S,d=S.version,f=i.toneMapping),h.layers.enableAll(),_.unshift(h,h.geometry,h.material,0,0,null)):S&&S.isTexture&&(c===void 0&&(c=new Sn(new Ba(2,2),new si({name:"BackgroundMaterial",uniforms:pr(jn.background.uniforms),vertexShader:jn.background.vertexShader,fragmentShader:jn.background.fragmentShader,side:Dn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(c)),c.material.uniforms.t2D.value=S,c.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,c.material.toneMapped=te.getTransfer(S.colorSpace)!==oe,S.matrixAutoUpdate===!0&&S.updateMatrix(),c.material.uniforms.uvTransform.value.copy(S.matrix),(u!==S||d!==S.version||f!==i.toneMapping)&&(c.material.needsUpdate=!0,u=S,d=S.version,f=i.toneMapping),c.layers.enableAll(),_.unshift(c,c.geometry,c.material,0,0,null))}function p(_,v){_.getRGB(zo,Cf(i)),n.buffers.color.setClear(zo.r,zo.g,zo.b,v,o)}function y(){h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(_,v=1){a.set(_),l=v,p(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(_){l=_,p(a,l)},render:x,addToRenderList:m,dispose:y}}function nv(i,t){const e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=d(null);let r=s,o=!1;function a(A,D,I,U,F){let V=!1;const G=u(U,I,D);r!==G&&(r=G,c(r.object)),V=f(A,U,I,F),V&&g(A,U,I,F),F!==null&&t.update(F,i.ELEMENT_ARRAY_BUFFER),(V||o)&&(o=!1,v(A,D,I,U),F!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(F).buffer))}function l(){return i.createVertexArray()}function c(A){return i.bindVertexArray(A)}function h(A){return i.deleteVertexArray(A)}function u(A,D,I){const U=I.wireframe===!0;let F=n[A.id];F===void 0&&(F={},n[A.id]=F);let V=F[D.id];V===void 0&&(V={},F[D.id]=V);let G=V[U];return G===void 0&&(G=d(l()),V[U]=G),G}function d(A){const D=[],I=[],U=[];for(let F=0;F<e;F++)D[F]=0,I[F]=0,U[F]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:D,enabledAttributes:I,attributeDivisors:U,object:A,attributes:{},index:null}}function f(A,D,I,U){const F=r.attributes,V=D.attributes;let G=0;const k=I.getAttributes();for(const X in k)if(k[X].location>=0){const st=F[X];let gt=V[X];if(gt===void 0&&(X==="instanceMatrix"&&A.instanceMatrix&&(gt=A.instanceMatrix),X==="instanceColor"&&A.instanceColor&&(gt=A.instanceColor)),st===void 0||st.attribute!==gt||gt&&st.data!==gt.data)return!0;G++}return r.attributesNum!==G||r.index!==U}function g(A,D,I,U){const F={},V=D.attributes;let G=0;const k=I.getAttributes();for(const X in k)if(k[X].location>=0){let st=V[X];st===void 0&&(X==="instanceMatrix"&&A.instanceMatrix&&(st=A.instanceMatrix),X==="instanceColor"&&A.instanceColor&&(st=A.instanceColor));const gt={};gt.attribute=st,st&&st.data&&(gt.data=st.data),F[X]=gt,G++}r.attributes=F,r.attributesNum=G,r.index=U}function x(){const A=r.newAttributes;for(let D=0,I=A.length;D<I;D++)A[D]=0}function m(A){p(A,0)}function p(A,D){const I=r.newAttributes,U=r.enabledAttributes,F=r.attributeDivisors;I[A]=1,U[A]===0&&(i.enableVertexAttribArray(A),U[A]=1),F[A]!==D&&(i.vertexAttribDivisor(A,D),F[A]=D)}function y(){const A=r.newAttributes,D=r.enabledAttributes;for(let I=0,U=D.length;I<U;I++)D[I]!==A[I]&&(i.disableVertexAttribArray(I),D[I]=0)}function _(A,D,I,U,F,V,G){G===!0?i.vertexAttribIPointer(A,D,I,F,V):i.vertexAttribPointer(A,D,I,U,F,V)}function v(A,D,I,U){x();const F=U.attributes,V=I.getAttributes(),G=D.defaultAttributeValues;for(const k in V){const X=V[k];if(X.location>=0){let ht=F[k];if(ht===void 0&&(k==="instanceMatrix"&&A.instanceMatrix&&(ht=A.instanceMatrix),k==="instanceColor"&&A.instanceColor&&(ht=A.instanceColor)),ht!==void 0){const st=ht.normalized,gt=ht.itemSize,Ot=t.get(ht);if(Ot===void 0)continue;const Ht=Ot.buffer,Z=Ot.type,z=Ot.bytesPerElement,R=Z===i.INT||Z===i.UNSIGNED_INT||ht.gpuType===uh;if(ht.isInterleavedBufferAttribute){const P=ht.data,$=P.stride,nt=ht.offset;if(P.isInstancedInterleavedBuffer){for(let Y=0;Y<X.locationSize;Y++)p(X.location+Y,P.meshPerAttribute);A.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=P.meshPerAttribute*P.count)}else for(let Y=0;Y<X.locationSize;Y++)m(X.location+Y);i.bindBuffer(i.ARRAY_BUFFER,Ht);for(let Y=0;Y<X.locationSize;Y++)_(X.location+Y,gt/X.locationSize,Z,st,$*z,(nt+gt/X.locationSize*Y)*z,R)}else{if(ht.isInstancedBufferAttribute){for(let P=0;P<X.locationSize;P++)p(X.location+P,ht.meshPerAttribute);A.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=ht.meshPerAttribute*ht.count)}else for(let P=0;P<X.locationSize;P++)m(X.location+P);i.bindBuffer(i.ARRAY_BUFFER,Ht);for(let P=0;P<X.locationSize;P++)_(X.location+P,gt/X.locationSize,Z,st,gt*z,gt/X.locationSize*P*z,R)}}else if(G!==void 0){const st=G[k];if(st!==void 0)switch(st.length){case 2:i.vertexAttrib2fv(X.location,st);break;case 3:i.vertexAttrib3fv(X.location,st);break;case 4:i.vertexAttrib4fv(X.location,st);break;default:i.vertexAttrib1fv(X.location,st)}}}}y()}function S(){T();for(const A in n){const D=n[A];for(const I in D){const U=D[I];for(const F in U)h(U[F].object),delete U[F];delete D[I]}delete n[A]}}function E(A){if(n[A.id]===void 0)return;const D=n[A.id];for(const I in D){const U=D[I];for(const F in U)h(U[F].object),delete U[F];delete D[I]}delete n[A.id]}function M(A){for(const D in n){const I=n[D];if(I[A.id]===void 0)continue;const U=I[A.id];for(const F in U)h(U[F].object),delete U[F];delete I[A.id]}}function T(){b(),o=!0,r!==s&&(r=s,c(r.object))}function b(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:T,resetDefaultState:b,dispose:S,releaseStatesOfGeometry:E,releaseStatesOfProgram:M,initAttributes:x,enableAttribute:m,disableUnusedAttributes:y}}function iv(i,t,e){let n;function s(c){n=c}function r(c,h){i.drawArrays(n,c,h),e.update(h,n,1)}function o(c,h,u){u!==0&&(i.drawArraysInstanced(n,c,h,u),e.update(h,n,u))}function a(c,h,u){if(u===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,h,0,u);let f=0;for(let g=0;g<u;g++)f+=h[g];e.update(f,n,1)}function l(c,h,u,d){if(u===0)return;const f=t.get("WEBGL_multi_draw");if(f===null)for(let g=0;g<c.length;g++)o(c[g],h[g],d[g]);else{f.multiDrawArraysInstancedWEBGL(n,c,0,h,0,d,0,u);let g=0;for(let x=0;x<u;x++)g+=h[x]*d[x];e.update(g,n,1)}}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function sv(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){const M=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(M.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(M){return!(M!==Wn&&n.convert(M)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(M){const T=M===Ai&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(M!==_n&&n.convert(M)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&M!==Kn&&!T)}function l(M){if(M==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";M="mediump"}return M==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp";const h=l(c);h!==c&&(Gt("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const u=e.logarithmicDepthBuffer===!0,d=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control"),f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),y=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),_=i.getParameter(i.MAX_VARYING_VECTORS),v=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),S=i.getParameter(i.MAX_SAMPLES),E=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:u,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:g,maxTextureSize:x,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:y,maxVaryings:_,maxFragmentUniforms:v,maxSamples:S,samples:E}}function rv(i){const t=this;let e=null,n=0,s=!1,r=!1;const o=new kn,a=new Xt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){const f=u.length!==0||d||n!==0||s;return s=d,n=u.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){e=h(u,d,0)},this.setState=function(u,d,f){const g=u.clippingPlanes,x=u.clipIntersection,m=u.clipShadows,p=i.get(u);if(!s||g===null||g.length===0||r&&!m)r?h(null):c();else{const y=r?0:n,_=y*4;let v=p.clippingState||null;l.value=v,v=h(g,d,_,f);for(let S=0;S!==_;++S)v[S]=e[S];p.clippingState=v,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=y}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(u,d,f,g){const x=u!==null?u.length:0;let m=null;if(x!==0){if(m=l.value,g!==!0||m===null){const p=f+x*4,y=d.matrixWorldInverse;a.getNormalMatrix(y),(m===null||m.length<p)&&(m=new Float32Array(p));for(let _=0,v=f;_!==x;++_,v+=4)o.copy(u[_]).applyMatrix4(y,a),o.normal.toArray(m,v),m[v+3]=o.constant}l.value=m,l.needsUpdate=!0}return t.numPlanes=x,t.numIntersection=0,m}}function ov(i){let t=new WeakMap;function e(o,a){return a===fc?o.mapping=As:a===pc&&(o.mapping=ur),o}function n(o){if(o&&o.isTexture){const a=o.mapping;if(a===fc||a===pc)if(t.has(o)){const l=t.get(o).texture;return e(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new Lf(l.height);return c.fromEquirectangularTexture(i,o),t.set(o,c),o.addEventListener("dispose",s),e(c.texture,o.mapping)}else return null}}return o}function s(o){const a=o.target;a.removeEventListener("dispose",s);const l=t.get(a);l!==void 0&&(t.delete(a),l.dispose())}function r(){t=new WeakMap}return{get:n,dispose:r}}const Gi=4,Vu=[.125,.215,.35,.446,.526,.582],fs=20,av=256,Tr=new Ph,Gu=new qt;let El=null,Al=0,wl=0,Tl=!1;const lv=new N;class Hu{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,n=.1,s=100,r={}){const{size:o=256,position:a=lv}=r;El=this._renderer.getRenderTarget(),Al=this._renderer.getActiveCubeFace(),wl=this._renderer.getActiveMipmapLevel(),Tl=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,n,s,l,a),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Yu(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Xu(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(El,Al,wl),this._renderer.xr.enabled=Tl,t.scissorTest=!1,Ys(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===As||t.mapping===ur?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),El=this._renderer.getRenderTarget(),Al=this._renderer.getActiveCubeFace(),wl=this._renderer.getActiveMipmapLevel(),Tl=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:qe,minFilter:qe,generateMipmaps:!1,type:Ai,format:Wn,colorSpace:fr,depthBuffer:!1},s=Wu(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Wu(t,e,n);const{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=cv(r)),this._blurMaterial=uv(r,t,e),this._ggxMaterial=hv(r,t,e)}return s}_compileMaterial(t){const e=new Sn(new De,t);this._renderer.compile(e,Tr)}_sceneToCubeUV(t,e,n,s,r){const l=new Tn(90,1,e,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,d=u.autoClear,f=u.toneMapping;u.getClearColor(Gu),u.toneMapping=ti,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(s),u.clearDepth(),u.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Sn(new $i,new Af({name:"PMREM.Background",side:nn,depthWrite:!1,depthTest:!1})));const x=this._backgroundBox,m=x.material;let p=!1;const y=t.background;y?y.isColor&&(m.color.copy(y),t.background=null,p=!0):(m.color.copy(Gu),p=!0);for(let _=0;_<6;_++){const v=_%3;v===0?(l.up.set(0,c[_],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[_],r.y,r.z)):v===1?(l.up.set(0,0,c[_]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[_],r.z)):(l.up.set(0,c[_],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[_]));const S=this._cubeSize;Ys(s,v*S,_>2?S:0,S,S),u.setRenderTarget(s),p&&u.render(x,l),u.render(t,l)}u.toneMapping=f,u.autoClear=d,t.background=y}_textureToCubeUV(t,e){const n=this._renderer,s=t.mapping===As||t.mapping===ur;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Yu()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Xu());const r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;const a=r.uniforms;a.envMap.value=t;const l=this._cubeSize;Ys(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(o,Tr)}_applyPMREM(t){const e=this._renderer,n=e.autoClear;e.autoClear=!1;const s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=n}_applyGGXFilter(t,e,n){const s=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;const l=o.uniforms,c=n/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),u=Math.sqrt(c*c-h*h),d=0+c*1.25,f=u*d,{_lodMax:g}=this,x=this._sizeLods[n],m=3*x*(n>g-Gi?n-g+Gi:0),p=4*(this._cubeSize-x);l.envMap.value=t.texture,l.roughness.value=f,l.mipInt.value=g-e,Ys(r,m,p,3*x,2*x),s.setRenderTarget(r),s.render(a,Tr),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=g-n,Ys(t,m,p,3*x,2*x),s.setRenderTarget(t),s.render(a,Tr)}_blur(t,e,n,s,r){const o=this._pingPongRenderTarget;this._halfBlur(t,o,e,n,s,"latitudinal",r),this._halfBlur(o,t,n,n,s,"longitudinal",r)}_halfBlur(t,e,n,s,r,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&ne("blur direction must be either latitudinal or longitudinal!");const h=3,u=this._lodMeshes[s];u.material=c;const d=c.uniforms,f=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*f):2*Math.PI/(2*fs-1),x=r/g,m=isFinite(r)?1+Math.floor(h*x):fs;m>fs&&Gt(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${fs}`);const p=[];let y=0;for(let M=0;M<fs;++M){const T=M/x,b=Math.exp(-T*T/2);p.push(b),M===0?y+=b:M<m&&(y+=2*b)}for(let M=0;M<p.length;M++)p[M]=p[M]/y;d.envMap.value=t.texture,d.samples.value=m,d.weights.value=p,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);const{_lodMax:_}=this;d.dTheta.value=g,d.mipInt.value=_-n;const v=this._sizeLods[s],S=3*v*(s>_-Gi?s-_+Gi:0),E=4*(this._cubeSize-v);Ys(e,S,E,3*v,2*v),l.setRenderTarget(e),l.render(u,Tr)}}function cv(i){const t=[],e=[],n=[];let s=i;const r=i-Gi+1+Vu.length;for(let o=0;o<r;o++){const a=Math.pow(2,s);t.push(a);let l=1/a;o>i-Gi?l=Vu[o-i+Gi-1]:o===0&&(l=0),e.push(l);const c=1/(a-2),h=-c,u=1+c,d=[h,h,u,h,u,u,h,h,u,u,h,u],f=6,g=6,x=3,m=2,p=1,y=new Float32Array(x*g*f),_=new Float32Array(m*g*f),v=new Float32Array(p*g*f);for(let E=0;E<f;E++){const M=E%3*2/3-1,T=E>2?0:-1,b=[M,T,0,M+2/3,T,0,M+2/3,T+1,0,M,T,0,M+2/3,T+1,0,M,T+1,0];y.set(b,x*g*E),_.set(d,m*g*E);const A=[E,E,E,E,E,E];v.set(A,p*g*E)}const S=new De;S.setAttribute("position",new Ze(y,x)),S.setAttribute("uv",new Ze(_,m)),S.setAttribute("faceIndex",new Ze(v,p)),n.push(new Sn(S,null)),s>Gi&&s--}return{lodMeshes:n,sizeLods:t,sigmas:e}}function Wu(i,t,e){const n=new ei(i,t,e);return n.texture.mapping=Ia,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Ys(i,t,e,n,s){i.viewport.set(t,e,n,s),i.scissor.set(t,e,n,s)}function hv(i,t,e){return new si({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:av,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Fa(),fragmentShader:`

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
		`,blending:bi,depthTest:!1,depthWrite:!1})}function uv(i,t,e){const n=new Float32Array(fs),s=new N(0,1,0);return new si({name:"SphericalGaussianBlur",defines:{n:fs,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Fa(),fragmentShader:`

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
		`,blending:bi,depthTest:!1,depthWrite:!1})}function Xu(){return new si({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Fa(),fragmentShader:`

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
		`,blending:bi,depthTest:!1,depthWrite:!1})}function Yu(){return new si({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Fa(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:bi,depthTest:!1,depthWrite:!1})}function Fa(){return`

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
	`}function dv(i){let t=new WeakMap,e=null;function n(a){if(a&&a.isTexture){const l=a.mapping,c=l===fc||l===pc,h=l===As||l===ur;if(c||h){let u=t.get(a);const d=u!==void 0?u.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==d)return e===null&&(e=new Hu(i)),u=c?e.fromEquirectangular(a,u):e.fromCubemap(a,u),u.texture.pmremVersion=a.pmremVersion,t.set(a,u),u.texture;if(u!==void 0)return u.texture;{const f=a.image;return c&&f&&f.height>0||h&&f&&s(f)?(e===null&&(e=new Hu(i)),u=c?e.fromEquirectangular(a):e.fromCubemap(a),u.texture.pmremVersion=a.pmremVersion,t.set(a,u),a.addEventListener("dispose",r),u.texture):null}}}return a}function s(a){let l=0;const c=6;for(let h=0;h<c;h++)a[h]!==void 0&&l++;return l===c}function r(a){const l=a.target;l.removeEventListener("dispose",r);const c=t.get(l);c!==void 0&&(t.delete(l),c.dispose())}function o(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:n,dispose:o}}function fv(i){const t={};function e(n){if(t[n]!==void 0)return t[n];const s=i.getExtension(n);return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){const s=e(n);return s===null&&jr("WebGLRenderer: "+n+" extension not supported."),s}}}function pv(i,t,e,n){const s={},r=new WeakMap;function o(u){const d=u.target;d.index!==null&&t.remove(d.index);for(const g in d.attributes)t.remove(d.attributes[g]);d.removeEventListener("dispose",o),delete s[d.id];const f=r.get(d);f&&(t.remove(f),r.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,e.memory.geometries--}function a(u,d){return s[d.id]===!0||(d.addEventListener("dispose",o),s[d.id]=!0,e.memory.geometries++),d}function l(u){const d=u.attributes;for(const f in d)t.update(d[f],i.ARRAY_BUFFER)}function c(u){const d=[],f=u.index,g=u.attributes.position;let x=0;if(f!==null){const y=f.array;x=f.version;for(let _=0,v=y.length;_<v;_+=3){const S=y[_+0],E=y[_+1],M=y[_+2];d.push(S,E,E,M,M,S)}}else if(g!==void 0){const y=g.array;x=g.version;for(let _=0,v=y.length/3-1;_<v;_+=3){const S=_+0,E=_+1,M=_+2;d.push(S,E,E,M,M,S)}}else return;const m=new(Sf(d)?Tf:wf)(d,1);m.version=x;const p=r.get(u);p&&t.remove(p),r.set(u,m)}function h(u){const d=r.get(u);if(d){const f=u.index;f!==null&&d.version<f.version&&c(u)}else c(u);return r.get(u)}return{get:a,update:l,getWireframeAttribute:h}}function mv(i,t,e){let n;function s(d){n=d}let r,o;function a(d){r=d.type,o=d.bytesPerElement}function l(d,f){i.drawElements(n,f,r,d*o),e.update(f,n,1)}function c(d,f,g){g!==0&&(i.drawElementsInstanced(n,f,r,d*o,g),e.update(f,n,g))}function h(d,f,g){if(g===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,r,d,0,g);let m=0;for(let p=0;p<g;p++)m+=f[p];e.update(m,n,1)}function u(d,f,g,x){if(g===0)return;const m=t.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<d.length;p++)c(d[p]/o,f[p],x[p]);else{m.multiDrawElementsInstancedWEBGL(n,f,0,r,d,0,x,0,g);let p=0;for(let y=0;y<g;y++)p+=f[y]*x[y];e.update(p,n,1)}}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function gv(i){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(e.calls++,o){case i.TRIANGLES:e.triangles+=a*(r/3);break;case i.LINES:e.lines+=a*(r/2);break;case i.LINE_STRIP:e.lines+=a*(r-1);break;case i.LINE_LOOP:e.lines+=a*r;break;case i.POINTS:e.points+=a*r;break;default:ne("WebGLInfo: Unknown draw mode:",o);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function xv(i,t,e){const n=new WeakMap,s=new le;function r(o,a,l){const c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0;let d=n.get(a);if(d===void 0||d.count!==u){let A=function(){T.dispose(),n.delete(a),a.removeEventListener("dispose",A)};var f=A;d!==void 0&&d.texture.dispose();const g=a.morphAttributes.position!==void 0,x=a.morphAttributes.normal!==void 0,m=a.morphAttributes.color!==void 0,p=a.morphAttributes.position||[],y=a.morphAttributes.normal||[],_=a.morphAttributes.color||[];let v=0;g===!0&&(v=1),x===!0&&(v=2),m===!0&&(v=3);let S=a.attributes.position.count*v,E=1;S>t.maxTextureSize&&(E=Math.ceil(S/t.maxTextureSize),S=t.maxTextureSize);const M=new Float32Array(S*E*4*u),T=new bf(M,S,E,u);T.type=Kn,T.needsUpdate=!0;const b=v*4;for(let D=0;D<u;D++){const I=p[D],U=y[D],F=_[D],V=S*E*4*D;for(let G=0;G<I.count;G++){const k=G*b;g===!0&&(s.fromBufferAttribute(I,G),M[V+k+0]=s.x,M[V+k+1]=s.y,M[V+k+2]=s.z,M[V+k+3]=0),x===!0&&(s.fromBufferAttribute(U,G),M[V+k+4]=s.x,M[V+k+5]=s.y,M[V+k+6]=s.z,M[V+k+7]=0),m===!0&&(s.fromBufferAttribute(F,G),M[V+k+8]=s.x,M[V+k+9]=s.y,M[V+k+10]=s.z,M[V+k+11]=F.itemSize===4?s.w:1)}}d={count:u,texture:T,size:new it(S,E)},n.set(a,d),a.addEventListener("dispose",A)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,e);else{let g=0;for(let m=0;m<c.length;m++)g+=c[m];const x=a.morphTargetsRelative?1:1-g;l.getUniforms().setValue(i,"morphTargetBaseInfluence",x),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",d.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:r}}function _v(i,t,e,n){let s=new WeakMap;function r(l){const c=n.render.frame,h=l.geometry,u=t.get(l,h);if(s.get(u)!==c&&(t.update(u),s.set(u,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),s.get(l)!==c&&(e.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,i.ARRAY_BUFFER),s.set(l,c))),l.isSkinnedMesh){const d=l.skeleton;s.get(d)!==c&&(d.update(),s.set(d,c))}return u}function o(){s=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),e.remove(c.instanceMatrix),c.instanceColor!==null&&e.remove(c.instanceColor)}return{update:r,dispose:o}}const vv={[rf]:"LINEAR_TONE_MAPPING",[of]:"REINHARD_TONE_MAPPING",[af]:"CINEON_TONE_MAPPING",[lf]:"ACES_FILMIC_TONE_MAPPING",[hf]:"AGX_TONE_MAPPING",[uf]:"NEUTRAL_TONE_MAPPING",[cf]:"CUSTOM_TONE_MAPPING"};function yv(i,t,e,n,s){const r=new ei(t,e,{type:i,depthBuffer:n,stencilBuffer:s}),o=new ei(t,e,{type:Ai,depthBuffer:!1,stencilBuffer:!1}),a=new De;a.setAttribute("position",new be([-1,3,0,-1,-1,0,3,-1,0],3)),a.setAttribute("uv",new be([0,2,0,0,2,0],2));const l=new Qg({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),c=new Sn(a,l),h=new Ph(-1,1,1,-1,0,1);let u=null,d=null,f=!1,g,x=null,m=[],p=!1;this.setSize=function(y,_){r.setSize(y,_),o.setSize(y,_);for(let v=0;v<m.length;v++){const S=m[v];S.setSize&&S.setSize(y,_)}},this.setEffects=function(y){m=y,p=m.length>0&&m[0].isRenderPass===!0;const _=r.width,v=r.height;for(let S=0;S<m.length;S++){const E=m[S];E.setSize&&E.setSize(_,v)}},this.begin=function(y,_){if(f||y.toneMapping===ti&&m.length===0)return!1;if(x=_,_!==null){const v=_.width,S=_.height;(r.width!==v||r.height!==S)&&this.setSize(v,S)}return p===!1&&y.setRenderTarget(r),g=y.toneMapping,y.toneMapping=ti,!0},this.hasRenderPass=function(){return p},this.end=function(y,_){y.toneMapping=g,f=!0;let v=r,S=o;for(let E=0;E<m.length;E++){const M=m[E];if(M.enabled!==!1&&(M.render(y,S,v,_),M.needsSwap!==!1)){const T=v;v=S,S=T}}if(u!==y.outputColorSpace||d!==y.toneMapping){u=y.outputColorSpace,d=y.toneMapping,l.defines={},te.getTransfer(u)===oe&&(l.defines.SRGB_TRANSFER="");const E=vv[d];E&&(l.defines[E]=""),l.needsUpdate=!0}l.uniforms.tDiffuse.value=v.texture,y.setRenderTarget(x),y.render(c,h),x=null,f=!1},this.isCompositing=function(){return f},this.dispose=function(){r.dispose(),o.dispose(),a.dispose(),l.dispose()}}const Gf=new sn,Kc=new Jr(1,1),Hf=new bf,Wf=new tg,Xf=new Rf,qu=[],$u=[],Zu=new Float32Array(16),ju=new Float32Array(9),Ku=new Float32Array(4);function yr(i,t,e){const n=i[0];if(n<=0||n>0)return i;const s=t*e;let r=qu[s];if(r===void 0&&(r=new Float32Array(s),qu[s]=r),t!==0){n.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,i[o].toArray(r,a)}return r}function Ie(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function Ne(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function Oa(i,t){let e=$u[t];e===void 0&&(e=new Int32Array(t),$u[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function Sv(i,t){const e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function bv(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ie(e,t))return;i.uniform2fv(this.addr,t),Ne(e,t)}}function Mv(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Ie(e,t))return;i.uniform3fv(this.addr,t),Ne(e,t)}}function Ev(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ie(e,t))return;i.uniform4fv(this.addr,t),Ne(e,t)}}function Av(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ie(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),Ne(e,t)}else{if(Ie(e,n))return;Ku.set(n),i.uniformMatrix2fv(this.addr,!1,Ku),Ne(e,n)}}function wv(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ie(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),Ne(e,t)}else{if(Ie(e,n))return;ju.set(n),i.uniformMatrix3fv(this.addr,!1,ju),Ne(e,n)}}function Tv(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ie(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),Ne(e,t)}else{if(Ie(e,n))return;Zu.set(n),i.uniformMatrix4fv(this.addr,!1,Zu),Ne(e,n)}}function Cv(i,t){const e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function Pv(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ie(e,t))return;i.uniform2iv(this.addr,t),Ne(e,t)}}function Rv(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ie(e,t))return;i.uniform3iv(this.addr,t),Ne(e,t)}}function Lv(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ie(e,t))return;i.uniform4iv(this.addr,t),Ne(e,t)}}function Dv(i,t){const e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function Iv(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ie(e,t))return;i.uniform2uiv(this.addr,t),Ne(e,t)}}function Nv(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ie(e,t))return;i.uniform3uiv(this.addr,t),Ne(e,t)}}function Bv(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ie(e,t))return;i.uniform4uiv(this.addr,t),Ne(e,t)}}function Uv(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(Kc.compareFunction=e.isReversedDepthBuffer()?_h:xh,r=Kc):r=Gf,e.setTexture2D(t||r,s)}function Fv(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||Wf,s)}function Ov(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTextureCube(t||Xf,s)}function kv(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||Hf,s)}function zv(i){switch(i){case 5126:return Sv;case 35664:return bv;case 35665:return Mv;case 35666:return Ev;case 35674:return Av;case 35675:return wv;case 35676:return Tv;case 5124:case 35670:return Cv;case 35667:case 35671:return Pv;case 35668:case 35672:return Rv;case 35669:case 35673:return Lv;case 5125:return Dv;case 36294:return Iv;case 36295:return Nv;case 36296:return Bv;case 35678:case 36198:case 36298:case 36306:case 35682:return Uv;case 35679:case 36299:case 36307:return Fv;case 35680:case 36300:case 36308:case 36293:return Ov;case 36289:case 36303:case 36311:case 36292:return kv}}function Vv(i,t){i.uniform1fv(this.addr,t)}function Gv(i,t){const e=yr(t,this.size,2);i.uniform2fv(this.addr,e)}function Hv(i,t){const e=yr(t,this.size,3);i.uniform3fv(this.addr,e)}function Wv(i,t){const e=yr(t,this.size,4);i.uniform4fv(this.addr,e)}function Xv(i,t){const e=yr(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function Yv(i,t){const e=yr(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function qv(i,t){const e=yr(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function $v(i,t){i.uniform1iv(this.addr,t)}function Zv(i,t){i.uniform2iv(this.addr,t)}function jv(i,t){i.uniform3iv(this.addr,t)}function Kv(i,t){i.uniform4iv(this.addr,t)}function Jv(i,t){i.uniform1uiv(this.addr,t)}function Qv(i,t){i.uniform2uiv(this.addr,t)}function ty(i,t){i.uniform3uiv(this.addr,t)}function ey(i,t){i.uniform4uiv(this.addr,t)}function ny(i,t,e){const n=this.cache,s=t.length,r=Oa(e,s);Ie(n,r)||(i.uniform1iv(this.addr,r),Ne(n,r));let o;this.type===i.SAMPLER_2D_SHADOW?o=Kc:o=Gf;for(let a=0;a!==s;++a)e.setTexture2D(t[a]||o,r[a])}function iy(i,t,e){const n=this.cache,s=t.length,r=Oa(e,s);Ie(n,r)||(i.uniform1iv(this.addr,r),Ne(n,r));for(let o=0;o!==s;++o)e.setTexture3D(t[o]||Wf,r[o])}function sy(i,t,e){const n=this.cache,s=t.length,r=Oa(e,s);Ie(n,r)||(i.uniform1iv(this.addr,r),Ne(n,r));for(let o=0;o!==s;++o)e.setTextureCube(t[o]||Xf,r[o])}function ry(i,t,e){const n=this.cache,s=t.length,r=Oa(e,s);Ie(n,r)||(i.uniform1iv(this.addr,r),Ne(n,r));for(let o=0;o!==s;++o)e.setTexture2DArray(t[o]||Hf,r[o])}function oy(i){switch(i){case 5126:return Vv;case 35664:return Gv;case 35665:return Hv;case 35666:return Wv;case 35674:return Xv;case 35675:return Yv;case 35676:return qv;case 5124:case 35670:return $v;case 35667:case 35671:return Zv;case 35668:case 35672:return jv;case 35669:case 35673:return Kv;case 5125:return Jv;case 36294:return Qv;case 36295:return ty;case 36296:return ey;case 35678:case 36198:case 36298:case 36306:case 35682:return ny;case 35679:case 36299:case 36307:return iy;case 35680:case 36300:case 36308:case 36293:return sy;case 36289:case 36303:case 36311:case 36292:return ry}}class ay{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=zv(e.type)}}class ly{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=oy(e.type)}}class cy{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){const s=this.seq;for(let r=0,o=s.length;r!==o;++r){const a=s[r];a.setValue(t,e[a.id],n)}}}const Cl=/(\w+)(\])?(\[|\.)?/g;function Ju(i,t){i.seq.push(t),i.map[t.id]=t}function hy(i,t,e){const n=i.name,s=n.length;for(Cl.lastIndex=0;;){const r=Cl.exec(n),o=Cl.lastIndex;let a=r[1];const l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){Ju(e,c===void 0?new ay(a,i,t):new ly(a,i,t));break}else{let u=e.map[a];u===void 0&&(u=new cy(a),Ju(e,u)),e=u}}}class xa{constructor(t,e){this.seq=[],this.map={};const n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){const a=t.getActiveUniform(e,o),l=t.getUniformLocation(e,a.name);hy(a,l,this)}const s=[],r=[];for(const o of this.seq)o.type===t.SAMPLER_2D_SHADOW||o.type===t.SAMPLER_CUBE_SHADOW||o.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,n,s){const r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){const s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,o=e.length;r!==o;++r){const a=e[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,s)}}static seqWithValue(t,e){const n=[];for(let s=0,r=t.length;s!==r;++s){const o=t[s];o.id in e&&n.push(o)}return n}}function Qu(i,t,e){const n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}const uy=37297;let dy=0;function fy(i,t){const e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=s;o<r;o++){const a=o+1;n.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return n.join(`
`)}const td=new Xt;function py(i){te._getMatrix(td,te.workingColorSpace,i);const t=`mat3( ${td.elements.map(e=>e.toFixed(4))} )`;switch(te.getTransfer(i)){case Ma:return[t,"LinearTransferOETF"];case oe:return[t,"sRGBTransferOETF"];default:return Gt("WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function ed(i,t,e){const n=i.getShaderParameter(t,i.COMPILE_STATUS),r=(i.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";const o=/ERROR: 0:(\d+)/.exec(r);if(o){const a=parseInt(o[1]);return e.toUpperCase()+`

`+r+`

`+fy(i.getShaderSource(t),a)}else return r}function my(i,t){const e=py(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}const gy={[rf]:"Linear",[of]:"Reinhard",[af]:"Cineon",[lf]:"ACESFilmic",[hf]:"AgX",[uf]:"Neutral",[cf]:"Custom"};function xy(i,t){const e=gy[t];return e===void 0?(Gt("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const Vo=new N;function _y(){te.getLuminanceCoefficients(Vo);const i=Vo.x.toFixed(4),t=Vo.y.toFixed(4),e=Vo.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function vy(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(kr).join(`
`)}function yy(i){const t=[];for(const e in i){const n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function Sy(i,t){const e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){const r=i.getActiveAttrib(t,s),o=r.name;let a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:i.getAttribLocation(t,o),locationSize:a}}return e}function kr(i){return i!==""}function nd(i,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function id(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const by=/^[ \t]*#include +<([\w\d./]+)>/gm;function Jc(i){return i.replace(by,Ey)}const My=new Map;function Ey(i,t){let e=Kt[t];if(e===void 0){const n=My.get(t);if(n!==void 0)e=Kt[n],Gt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("Can not resolve #include <"+t+">")}return Jc(e)}const Ay=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function sd(i){return i.replace(Ay,wy)}function wy(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function rd(i){let t=`precision ${i.precision} float;
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
#define LOW_PRECISION`),t}const Ty={[da]:"SHADOWMAP_TYPE_PCF",[Fr]:"SHADOWMAP_TYPE_VSM"};function Cy(i){return Ty[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const Py={[As]:"ENVMAP_TYPE_CUBE",[ur]:"ENVMAP_TYPE_CUBE",[Ia]:"ENVMAP_TYPE_CUBE_UV"};function Ry(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":Py[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const Ly={[ur]:"ENVMAP_MODE_REFRACTION"};function Dy(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":Ly[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const Iy={[sf]:"ENVMAP_BLENDING_MULTIPLY",[vm]:"ENVMAP_BLENDING_MIX",[ym]:"ENVMAP_BLENDING_ADD"};function Ny(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":Iy[i.combine]||"ENVMAP_BLENDING_NONE"}function By(i){const t=i.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),7*16)),texelHeight:n,maxMip:e}}function Uy(i,t,e,n){const s=i.getContext(),r=e.defines;let o=e.vertexShader,a=e.fragmentShader;const l=Cy(e),c=Ry(e),h=Dy(e),u=Ny(e),d=By(e),f=vy(e),g=yy(r),x=s.createProgram();let m,p,y=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(kr).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(kr).join(`
`),p.length>0&&(p+=`
`)):(m=[rd(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(kr).join(`
`),p=[rd(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==ti?"#define TONE_MAPPING":"",e.toneMapping!==ti?Kt.tonemapping_pars_fragment:"",e.toneMapping!==ti?xy("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Kt.colorspace_pars_fragment,my("linearToOutputTexel",e.outputColorSpace),_y(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(kr).join(`
`)),o=Jc(o),o=nd(o,e),o=id(o,e),a=Jc(a),a=nd(a,e),a=id(a,e),o=sd(o),a=sd(a),e.isRawShaderMaterial!==!0&&(y=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",e.glslVersion===ru?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===ru?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const _=y+m+o,v=y+p+a,S=Qu(s,s.VERTEX_SHADER,_),E=Qu(s,s.FRAGMENT_SHADER,v);s.attachShader(x,S),s.attachShader(x,E),e.index0AttributeName!==void 0?s.bindAttribLocation(x,0,e.index0AttributeName):e.morphTargets===!0&&s.bindAttribLocation(x,0,"position"),s.linkProgram(x);function M(D){if(i.debug.checkShaderErrors){const I=s.getProgramInfoLog(x)||"",U=s.getShaderInfoLog(S)||"",F=s.getShaderInfoLog(E)||"",V=I.trim(),G=U.trim(),k=F.trim();let X=!0,ht=!0;if(s.getProgramParameter(x,s.LINK_STATUS)===!1)if(X=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,x,S,E);else{const st=ed(s,S,"vertex"),gt=ed(s,E,"fragment");ne("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(x,s.VALIDATE_STATUS)+`

Material Name: `+D.name+`
Material Type: `+D.type+`

Program Info Log: `+V+`
`+st+`
`+gt)}else V!==""?Gt("WebGLProgram: Program Info Log:",V):(G===""||k==="")&&(ht=!1);ht&&(D.diagnostics={runnable:X,programLog:V,vertexShader:{log:G,prefix:m},fragmentShader:{log:k,prefix:p}})}s.deleteShader(S),s.deleteShader(E),T=new xa(s,x),b=Sy(s,x)}let T;this.getUniforms=function(){return T===void 0&&M(this),T};let b;this.getAttributes=function(){return b===void 0&&M(this),b};let A=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return A===!1&&(A=s.getProgramParameter(x,uy)),A},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(x),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=dy++,this.cacheKey=t,this.usedTimes=1,this.program=x,this.vertexShader=S,this.fragmentShader=E,this}let Fy=0;class Oy{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,n=t.fragmentShader,s=this._getShaderStage(e),r=this._getShaderStage(n),o=this._getShaderCacheForMaterial(t);return o.has(s)===!1&&(o.add(s),s.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){const e=this.shaderCache;let n=e.get(t);return n===void 0&&(n=new ky(t),e.set(t,n)),n}}class ky{constructor(t){this.id=Fy++,this.code=t,this.usedTimes=0}}function zy(i,t,e,n,s,r,o){const a=new Mf,l=new Oy,c=new Set,h=[],u=new Map,d=s.logarithmicDepthBuffer;let f=s.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(b){return c.add(b),b===0?"uv":`uv${b}`}function m(b,A,D,I,U){const F=I.fog,V=U.geometry,G=b.isMeshStandardMaterial?I.environment:null,k=(b.isMeshStandardMaterial?e:t).get(b.envMap||G),X=k&&k.mapping===Ia?k.image.height:null,ht=g[b.type];b.precision!==null&&(f=s.getMaxPrecision(b.precision),f!==b.precision&&Gt("WebGLProgram.getParameters:",b.precision,"not supported, using",f,"instead."));const st=V.morphAttributes.position||V.morphAttributes.normal||V.morphAttributes.color,gt=st!==void 0?st.length:0;let Ot=0;V.morphAttributes.position!==void 0&&(Ot=1),V.morphAttributes.normal!==void 0&&(Ot=2),V.morphAttributes.color!==void 0&&(Ot=3);let Ht,Z,z,R;if(ht){const se=jn[ht];Ht=se.vertexShader,Z=se.fragmentShader}else Ht=b.vertexShader,Z=b.fragmentShader,l.update(b),z=l.getVertexShaderID(b),R=l.getFragmentShaderID(b);const P=i.getRenderTarget(),$=i.state.buffers.depth.getReversed(),nt=U.isInstancedMesh===!0,Y=U.isBatchedMesh===!0,rt=!!b.map,xt=!!b.matcap,ut=!!k,tt=!!b.aoMap,ot=!!b.lightMap,ct=!!b.bumpMap,bt=!!b.normalMap,C=!!b.displacementMap,O=!!b.emissiveMap,pt=!!b.metalnessMap,Bt=!!b.roughnessMap,wt=b.anisotropy>0,B=b.clearcoat>0,w=b.dispersion>0,H=b.iridescence>0,et=b.sheen>0,at=b.transmission>0,Q=wt&&!!b.anisotropyMap,It=B&&!!b.clearcoatMap,_t=B&&!!b.clearcoatNormalMap,Lt=B&&!!b.clearcoatRoughnessMap,Vt=H&&!!b.iridescenceMap,dt=H&&!!b.iridescenceThicknessMap,vt=et&&!!b.sheenColorMap,Nt=et&&!!b.sheenRoughnessMap,Ut=!!b.specularMap,St=!!b.specularColorMap,Jt=!!b.specularIntensityMap,W=at&&!!b.transmissionMap,Tt=at&&!!b.thicknessMap,mt=!!b.gradientMap,Pt=!!b.alphaMap,ft=b.alphaTest>0,lt=!!b.alphaHash,yt=!!b.extensions;let $t=ti;b.toneMapped&&(P===null||P.isXRRenderTarget===!0)&&($t=i.toneMapping);const fe={shaderID:ht,shaderType:b.type,shaderName:b.name,vertexShader:Ht,fragmentShader:Z,defines:b.defines,customVertexShaderID:z,customFragmentShaderID:R,isRawShaderMaterial:b.isRawShaderMaterial===!0,glslVersion:b.glslVersion,precision:f,batching:Y,batchingColor:Y&&U._colorsTexture!==null,instancing:nt,instancingColor:nt&&U.instanceColor!==null,instancingMorph:nt&&U.morphTexture!==null,outputColorSpace:P===null?i.outputColorSpace:P.isXRRenderTarget===!0?P.texture.colorSpace:fr,alphaToCoverage:!!b.alphaToCoverage,map:rt,matcap:xt,envMap:ut,envMapMode:ut&&k.mapping,envMapCubeUVHeight:X,aoMap:tt,lightMap:ot,bumpMap:ct,normalMap:bt,displacementMap:C,emissiveMap:O,normalMapObjectSpace:bt&&b.normalMapType===Mm,normalMapTangentSpace:bt&&b.normalMapType===yf,metalnessMap:pt,roughnessMap:Bt,anisotropy:wt,anisotropyMap:Q,clearcoat:B,clearcoatMap:It,clearcoatNormalMap:_t,clearcoatRoughnessMap:Lt,dispersion:w,iridescence:H,iridescenceMap:Vt,iridescenceThicknessMap:dt,sheen:et,sheenColorMap:vt,sheenRoughnessMap:Nt,specularMap:Ut,specularColorMap:St,specularIntensityMap:Jt,transmission:at,transmissionMap:W,thicknessMap:Tt,gradientMap:mt,opaque:b.transparent===!1&&b.blending===or&&b.alphaToCoverage===!1,alphaMap:Pt,alphaTest:ft,alphaHash:lt,combine:b.combine,mapUv:rt&&x(b.map.channel),aoMapUv:tt&&x(b.aoMap.channel),lightMapUv:ot&&x(b.lightMap.channel),bumpMapUv:ct&&x(b.bumpMap.channel),normalMapUv:bt&&x(b.normalMap.channel),displacementMapUv:C&&x(b.displacementMap.channel),emissiveMapUv:O&&x(b.emissiveMap.channel),metalnessMapUv:pt&&x(b.metalnessMap.channel),roughnessMapUv:Bt&&x(b.roughnessMap.channel),anisotropyMapUv:Q&&x(b.anisotropyMap.channel),clearcoatMapUv:It&&x(b.clearcoatMap.channel),clearcoatNormalMapUv:_t&&x(b.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Lt&&x(b.clearcoatRoughnessMap.channel),iridescenceMapUv:Vt&&x(b.iridescenceMap.channel),iridescenceThicknessMapUv:dt&&x(b.iridescenceThicknessMap.channel),sheenColorMapUv:vt&&x(b.sheenColorMap.channel),sheenRoughnessMapUv:Nt&&x(b.sheenRoughnessMap.channel),specularMapUv:Ut&&x(b.specularMap.channel),specularColorMapUv:St&&x(b.specularColorMap.channel),specularIntensityMapUv:Jt&&x(b.specularIntensityMap.channel),transmissionMapUv:W&&x(b.transmissionMap.channel),thicknessMapUv:Tt&&x(b.thicknessMap.channel),alphaMapUv:Pt&&x(b.alphaMap.channel),vertexTangents:!!V.attributes.tangent&&(bt||wt),vertexColors:b.vertexColors,vertexAlphas:b.vertexColors===!0&&!!V.attributes.color&&V.attributes.color.itemSize===4,pointsUvs:U.isPoints===!0&&!!V.attributes.uv&&(rt||Pt),fog:!!F,useFog:b.fog===!0,fogExp2:!!F&&F.isFogExp2,flatShading:b.flatShading===!0&&b.wireframe===!1,sizeAttenuation:b.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:$,skinning:U.isSkinnedMesh===!0,morphTargets:V.morphAttributes.position!==void 0,morphNormals:V.morphAttributes.normal!==void 0,morphColors:V.morphAttributes.color!==void 0,morphTargetsCount:gt,morphTextureStride:Ot,numDirLights:A.directional.length,numPointLights:A.point.length,numSpotLights:A.spot.length,numSpotLightMaps:A.spotLightMap.length,numRectAreaLights:A.rectArea.length,numHemiLights:A.hemi.length,numDirLightShadows:A.directionalShadowMap.length,numPointLightShadows:A.pointShadowMap.length,numSpotLightShadows:A.spotShadowMap.length,numSpotLightShadowsWithMaps:A.numSpotLightShadowsWithMaps,numLightProbes:A.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:b.dithering,shadowMapEnabled:i.shadowMap.enabled&&D.length>0,shadowMapType:i.shadowMap.type,toneMapping:$t,decodeVideoTexture:rt&&b.map.isVideoTexture===!0&&te.getTransfer(b.map.colorSpace)===oe,decodeVideoTextureEmissive:O&&b.emissiveMap.isVideoTexture===!0&&te.getTransfer(b.emissiveMap.colorSpace)===oe,premultipliedAlpha:b.premultipliedAlpha,doubleSided:b.side===Cn,flipSided:b.side===nn,useDepthPacking:b.depthPacking>=0,depthPacking:b.depthPacking||0,index0AttributeName:b.index0AttributeName,extensionClipCullDistance:yt&&b.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(yt&&b.extensions.multiDraw===!0||Y)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:b.customProgramCacheKey()};return fe.vertexUv1s=c.has(1),fe.vertexUv2s=c.has(2),fe.vertexUv3s=c.has(3),c.clear(),fe}function p(b){const A=[];if(b.shaderID?A.push(b.shaderID):(A.push(b.customVertexShaderID),A.push(b.customFragmentShaderID)),b.defines!==void 0)for(const D in b.defines)A.push(D),A.push(b.defines[D]);return b.isRawShaderMaterial===!1&&(y(A,b),_(A,b),A.push(i.outputColorSpace)),A.push(b.customProgramCacheKey),A.join()}function y(b,A){b.push(A.precision),b.push(A.outputColorSpace),b.push(A.envMapMode),b.push(A.envMapCubeUVHeight),b.push(A.mapUv),b.push(A.alphaMapUv),b.push(A.lightMapUv),b.push(A.aoMapUv),b.push(A.bumpMapUv),b.push(A.normalMapUv),b.push(A.displacementMapUv),b.push(A.emissiveMapUv),b.push(A.metalnessMapUv),b.push(A.roughnessMapUv),b.push(A.anisotropyMapUv),b.push(A.clearcoatMapUv),b.push(A.clearcoatNormalMapUv),b.push(A.clearcoatRoughnessMapUv),b.push(A.iridescenceMapUv),b.push(A.iridescenceThicknessMapUv),b.push(A.sheenColorMapUv),b.push(A.sheenRoughnessMapUv),b.push(A.specularMapUv),b.push(A.specularColorMapUv),b.push(A.specularIntensityMapUv),b.push(A.transmissionMapUv),b.push(A.thicknessMapUv),b.push(A.combine),b.push(A.fogExp2),b.push(A.sizeAttenuation),b.push(A.morphTargetsCount),b.push(A.morphAttributeCount),b.push(A.numDirLights),b.push(A.numPointLights),b.push(A.numSpotLights),b.push(A.numSpotLightMaps),b.push(A.numHemiLights),b.push(A.numRectAreaLights),b.push(A.numDirLightShadows),b.push(A.numPointLightShadows),b.push(A.numSpotLightShadows),b.push(A.numSpotLightShadowsWithMaps),b.push(A.numLightProbes),b.push(A.shadowMapType),b.push(A.toneMapping),b.push(A.numClippingPlanes),b.push(A.numClipIntersection),b.push(A.depthPacking)}function _(b,A){a.disableAll(),A.instancing&&a.enable(0),A.instancingColor&&a.enable(1),A.instancingMorph&&a.enable(2),A.matcap&&a.enable(3),A.envMap&&a.enable(4),A.normalMapObjectSpace&&a.enable(5),A.normalMapTangentSpace&&a.enable(6),A.clearcoat&&a.enable(7),A.iridescence&&a.enable(8),A.alphaTest&&a.enable(9),A.vertexColors&&a.enable(10),A.vertexAlphas&&a.enable(11),A.vertexUv1s&&a.enable(12),A.vertexUv2s&&a.enable(13),A.vertexUv3s&&a.enable(14),A.vertexTangents&&a.enable(15),A.anisotropy&&a.enable(16),A.alphaHash&&a.enable(17),A.batching&&a.enable(18),A.dispersion&&a.enable(19),A.batchingColor&&a.enable(20),A.gradientMap&&a.enable(21),b.push(a.mask),a.disableAll(),A.fog&&a.enable(0),A.useFog&&a.enable(1),A.flatShading&&a.enable(2),A.logarithmicDepthBuffer&&a.enable(3),A.reversedDepthBuffer&&a.enable(4),A.skinning&&a.enable(5),A.morphTargets&&a.enable(6),A.morphNormals&&a.enable(7),A.morphColors&&a.enable(8),A.premultipliedAlpha&&a.enable(9),A.shadowMapEnabled&&a.enable(10),A.doubleSided&&a.enable(11),A.flipSided&&a.enable(12),A.useDepthPacking&&a.enable(13),A.dithering&&a.enable(14),A.transmission&&a.enable(15),A.sheen&&a.enable(16),A.opaque&&a.enable(17),A.pointsUvs&&a.enable(18),A.decodeVideoTexture&&a.enable(19),A.decodeVideoTextureEmissive&&a.enable(20),A.alphaToCoverage&&a.enable(21),b.push(a.mask)}function v(b){const A=g[b.type];let D;if(A){const I=jn[A];D=fg.clone(I.uniforms)}else D=b.uniforms;return D}function S(b,A){let D=u.get(A);return D!==void 0?++D.usedTimes:(D=new Uy(i,A,b,r),h.push(D),u.set(A,D)),D}function E(b){if(--b.usedTimes===0){const A=h.indexOf(b);h[A]=h[h.length-1],h.pop(),u.delete(b.cacheKey),b.destroy()}}function M(b){l.remove(b)}function T(){l.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:v,acquireProgram:S,releaseProgram:E,releaseShaderCache:M,programs:h,dispose:T}}function Vy(){let i=new WeakMap;function t(o){return i.has(o)}function e(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,l){i.get(o)[a]=l}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function Gy(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.z!==t.z?i.z-t.z:i.id-t.id}function od(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function ad(){const i=[];let t=0;const e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function o(u,d,f,g,x,m){let p=i[t];return p===void 0?(p={id:u.id,object:u,geometry:d,material:f,groupOrder:g,renderOrder:u.renderOrder,z:x,group:m},i[t]=p):(p.id=u.id,p.object=u,p.geometry=d,p.material=f,p.groupOrder=g,p.renderOrder=u.renderOrder,p.z=x,p.group=m),t++,p}function a(u,d,f,g,x,m){const p=o(u,d,f,g,x,m);f.transmission>0?n.push(p):f.transparent===!0?s.push(p):e.push(p)}function l(u,d,f,g,x,m){const p=o(u,d,f,g,x,m);f.transmission>0?n.unshift(p):f.transparent===!0?s.unshift(p):e.unshift(p)}function c(u,d){e.length>1&&e.sort(u||Gy),n.length>1&&n.sort(d||od),s.length>1&&s.sort(d||od)}function h(){for(let u=t,d=i.length;u<d;u++){const f=i[u];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:a,unshift:l,finish:h,sort:c}}function Hy(){let i=new WeakMap;function t(n,s){const r=i.get(n);let o;return r===void 0?(o=new ad,i.set(n,[o])):s>=r.length?(o=new ad,r.push(o)):o=r[s],o}function e(){i=new WeakMap}return{get:t,dispose:e}}function Wy(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new N,color:new qt};break;case"SpotLight":e={position:new N,direction:new N,color:new qt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new N,color:new qt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new N,skyColor:new qt,groundColor:new qt};break;case"RectAreaLight":e={color:new qt,position:new N,halfWidth:new N,halfHeight:new N};break}return i[t.id]=e,e}}}function Xy(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new it};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new it};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new it,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}let Yy=0;function qy(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function $y(i){const t=new Wy,e=Xy(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new N);const s=new N,r=new Zt,o=new Zt;function a(c){let h=0,u=0,d=0;for(let b=0;b<9;b++)n.probe[b].set(0,0,0);let f=0,g=0,x=0,m=0,p=0,y=0,_=0,v=0,S=0,E=0,M=0;c.sort(qy);for(let b=0,A=c.length;b<A;b++){const D=c[b],I=D.color,U=D.intensity,F=D.distance;let V=null;if(D.shadow&&D.shadow.map&&(D.shadow.map.texture.format===dr?V=D.shadow.map.texture:V=D.shadow.map.depthTexture||D.shadow.map.texture),D.isAmbientLight)h+=I.r*U,u+=I.g*U,d+=I.b*U;else if(D.isLightProbe){for(let G=0;G<9;G++)n.probe[G].addScaledVector(D.sh.coefficients[G],U);M++}else if(D.isDirectionalLight){const G=t.get(D);if(G.color.copy(D.color).multiplyScalar(D.intensity),D.castShadow){const k=D.shadow,X=e.get(D);X.shadowIntensity=k.intensity,X.shadowBias=k.bias,X.shadowNormalBias=k.normalBias,X.shadowRadius=k.radius,X.shadowMapSize=k.mapSize,n.directionalShadow[f]=X,n.directionalShadowMap[f]=V,n.directionalShadowMatrix[f]=D.shadow.matrix,y++}n.directional[f]=G,f++}else if(D.isSpotLight){const G=t.get(D);G.position.setFromMatrixPosition(D.matrixWorld),G.color.copy(I).multiplyScalar(U),G.distance=F,G.coneCos=Math.cos(D.angle),G.penumbraCos=Math.cos(D.angle*(1-D.penumbra)),G.decay=D.decay,n.spot[x]=G;const k=D.shadow;if(D.map&&(n.spotLightMap[S]=D.map,S++,k.updateMatrices(D),D.castShadow&&E++),n.spotLightMatrix[x]=k.matrix,D.castShadow){const X=e.get(D);X.shadowIntensity=k.intensity,X.shadowBias=k.bias,X.shadowNormalBias=k.normalBias,X.shadowRadius=k.radius,X.shadowMapSize=k.mapSize,n.spotShadow[x]=X,n.spotShadowMap[x]=V,v++}x++}else if(D.isRectAreaLight){const G=t.get(D);G.color.copy(I).multiplyScalar(U),G.halfWidth.set(D.width*.5,0,0),G.halfHeight.set(0,D.height*.5,0),n.rectArea[m]=G,m++}else if(D.isPointLight){const G=t.get(D);if(G.color.copy(D.color).multiplyScalar(D.intensity),G.distance=D.distance,G.decay=D.decay,D.castShadow){const k=D.shadow,X=e.get(D);X.shadowIntensity=k.intensity,X.shadowBias=k.bias,X.shadowNormalBias=k.normalBias,X.shadowRadius=k.radius,X.shadowMapSize=k.mapSize,X.shadowCameraNear=k.camera.near,X.shadowCameraFar=k.camera.far,n.pointShadow[g]=X,n.pointShadowMap[g]=V,n.pointShadowMatrix[g]=D.shadow.matrix,_++}n.point[g]=G,g++}else if(D.isHemisphereLight){const G=t.get(D);G.skyColor.copy(D.color).multiplyScalar(U),G.groundColor.copy(D.groundColor).multiplyScalar(U),n.hemi[p]=G,p++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Et.LTC_FLOAT_1,n.rectAreaLTC2=Et.LTC_FLOAT_2):(n.rectAreaLTC1=Et.LTC_HALF_1,n.rectAreaLTC2=Et.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=d;const T=n.hash;(T.directionalLength!==f||T.pointLength!==g||T.spotLength!==x||T.rectAreaLength!==m||T.hemiLength!==p||T.numDirectionalShadows!==y||T.numPointShadows!==_||T.numSpotShadows!==v||T.numSpotMaps!==S||T.numLightProbes!==M)&&(n.directional.length=f,n.spot.length=x,n.rectArea.length=m,n.point.length=g,n.hemi.length=p,n.directionalShadow.length=y,n.directionalShadowMap.length=y,n.pointShadow.length=_,n.pointShadowMap.length=_,n.spotShadow.length=v,n.spotShadowMap.length=v,n.directionalShadowMatrix.length=y,n.pointShadowMatrix.length=_,n.spotLightMatrix.length=v+S-E,n.spotLightMap.length=S,n.numSpotLightShadowsWithMaps=E,n.numLightProbes=M,T.directionalLength=f,T.pointLength=g,T.spotLength=x,T.rectAreaLength=m,T.hemiLength=p,T.numDirectionalShadows=y,T.numPointShadows=_,T.numSpotShadows=v,T.numSpotMaps=S,T.numLightProbes=M,n.version=Yy++)}function l(c,h){let u=0,d=0,f=0,g=0,x=0;const m=h.matrixWorldInverse;for(let p=0,y=c.length;p<y;p++){const _=c[p];if(_.isDirectionalLight){const v=n.directional[u];v.direction.setFromMatrixPosition(_.matrixWorld),s.setFromMatrixPosition(_.target.matrixWorld),v.direction.sub(s),v.direction.transformDirection(m),u++}else if(_.isSpotLight){const v=n.spot[f];v.position.setFromMatrixPosition(_.matrixWorld),v.position.applyMatrix4(m),v.direction.setFromMatrixPosition(_.matrixWorld),s.setFromMatrixPosition(_.target.matrixWorld),v.direction.sub(s),v.direction.transformDirection(m),f++}else if(_.isRectAreaLight){const v=n.rectArea[g];v.position.setFromMatrixPosition(_.matrixWorld),v.position.applyMatrix4(m),o.identity(),r.copy(_.matrixWorld),r.premultiply(m),o.extractRotation(r),v.halfWidth.set(_.width*.5,0,0),v.halfHeight.set(0,_.height*.5,0),v.halfWidth.applyMatrix4(o),v.halfHeight.applyMatrix4(o),g++}else if(_.isPointLight){const v=n.point[d];v.position.setFromMatrixPosition(_.matrixWorld),v.position.applyMatrix4(m),d++}else if(_.isHemisphereLight){const v=n.hemi[x];v.direction.setFromMatrixPosition(_.matrixWorld),v.direction.transformDirection(m),x++}}}return{setup:a,setupView:l,state:n}}function ld(i){const t=new $y(i),e=[],n=[];function s(h){c.camera=h,e.length=0,n.length=0}function r(h){e.push(h)}function o(h){n.push(h)}function a(){t.setup(e)}function l(h){t.setupView(e,h)}const c={lightsArray:e,shadowsArray:n,camera:null,lights:t,transmissionRenderTarget:{}};return{init:s,state:c,setupLights:a,setupLightsView:l,pushLight:r,pushShadow:o}}function Zy(i){let t=new WeakMap;function e(s,r=0){const o=t.get(s);let a;return o===void 0?(a=new ld(i),t.set(s,[a])):r>=o.length?(a=new ld(i),o.push(a)):a=o[r],a}function n(){t=new WeakMap}return{get:e,dispose:n}}const jy=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Ky=`uniform sampler2D shadow_pass;
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
}`,Jy=[new N(1,0,0),new N(-1,0,0),new N(0,1,0),new N(0,-1,0),new N(0,0,1),new N(0,0,-1)],Qy=[new N(0,-1,0),new N(0,-1,0),new N(0,0,1),new N(0,0,-1),new N(0,-1,0),new N(0,-1,0)],cd=new Zt,Cr=new N,Pl=new N;function tS(i,t,e){let n=new Sh;const s=new it,r=new it,o=new le,a=new e0,l=new n0,c={},h=e.maxTextureSize,u={[Dn]:nn,[nn]:Dn,[Cn]:Cn},d=new si({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new it},radius:{value:4}},vertexShader:jy,fragmentShader:Ky}),f=d.clone();f.defines.HORIZONTAL_PASS=1;const g=new De;g.setAttribute("position",new Ze(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const x=new Sn(g,d),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=da;let p=this.type;this.render=function(E,M,T){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||E.length===0)return;E.type===nf&&(Gt("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),E.type=da);const b=i.getRenderTarget(),A=i.getActiveCubeFace(),D=i.getActiveMipmapLevel(),I=i.state;I.setBlending(bi),I.buffers.depth.getReversed()===!0?I.buffers.color.setClear(0,0,0,0):I.buffers.color.setClear(1,1,1,1),I.buffers.depth.setTest(!0),I.setScissorTest(!1);const U=p!==this.type;U&&M.traverse(function(F){F.material&&(Array.isArray(F.material)?F.material.forEach(V=>V.needsUpdate=!0):F.material.needsUpdate=!0)});for(let F=0,V=E.length;F<V;F++){const G=E[F],k=G.shadow;if(k===void 0){Gt("WebGLShadowMap:",G,"has no shadow.");continue}if(k.autoUpdate===!1&&k.needsUpdate===!1)continue;s.copy(k.mapSize);const X=k.getFrameExtents();if(s.multiply(X),r.copy(k.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/X.x),s.x=r.x*X.x,k.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/X.y),s.y=r.y*X.y,k.mapSize.y=r.y)),k.map===null||U===!0){if(k.map!==null&&(k.map.depthTexture!==null&&(k.map.depthTexture.dispose(),k.map.depthTexture=null),k.map.dispose()),this.type===Fr){if(G.isPointLight){Gt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}k.map=new ei(s.x,s.y,{format:dr,type:Ai,minFilter:qe,magFilter:qe,generateMipmaps:!1}),k.map.texture.name=G.name+".shadowMap",k.map.depthTexture=new Jr(s.x,s.y,Kn),k.map.depthTexture.name=G.name+".shadowMapDepth",k.map.depthTexture.format=wi,k.map.depthTexture.compareFunction=null,k.map.depthTexture.minFilter=ze,k.map.depthTexture.magFilter=ze}else{G.isPointLight?(k.map=new Lf(s.x),k.map.depthTexture=new Mg(s.x,ii)):(k.map=new ei(s.x,s.y),k.map.depthTexture=new Jr(s.x,s.y,ii)),k.map.depthTexture.name=G.name+".shadowMap",k.map.depthTexture.format=wi;const st=i.state.buffers.depth.getReversed();this.type===da?(k.map.depthTexture.compareFunction=st?_h:xh,k.map.depthTexture.minFilter=qe,k.map.depthTexture.magFilter=qe):(k.map.depthTexture.compareFunction=null,k.map.depthTexture.minFilter=ze,k.map.depthTexture.magFilter=ze)}k.camera.updateProjectionMatrix()}const ht=k.map.isWebGLCubeRenderTarget?6:1;for(let st=0;st<ht;st++){if(k.map.isWebGLCubeRenderTarget)i.setRenderTarget(k.map,st),i.clear();else{st===0&&(i.setRenderTarget(k.map),i.clear());const gt=k.getViewport(st);o.set(r.x*gt.x,r.y*gt.y,r.x*gt.z,r.y*gt.w),I.viewport(o)}if(G.isPointLight){const gt=k.camera,Ot=k.matrix,Ht=G.distance||gt.far;Ht!==gt.far&&(gt.far=Ht,gt.updateProjectionMatrix()),Cr.setFromMatrixPosition(G.matrixWorld),gt.position.copy(Cr),Pl.copy(gt.position),Pl.add(Jy[st]),gt.up.copy(Qy[st]),gt.lookAt(Pl),gt.updateMatrixWorld(),Ot.makeTranslation(-Cr.x,-Cr.y,-Cr.z),cd.multiplyMatrices(gt.projectionMatrix,gt.matrixWorldInverse),k._frustum.setFromProjectionMatrix(cd,gt.coordinateSystem,gt.reversedDepth)}else k.updateMatrices(G);n=k.getFrustum(),v(M,T,k.camera,G,this.type)}k.isPointLightShadow!==!0&&this.type===Fr&&y(k,T),k.needsUpdate=!1}p=this.type,m.needsUpdate=!1,i.setRenderTarget(b,A,D)};function y(E,M){const T=t.update(x);d.defines.VSM_SAMPLES!==E.blurSamples&&(d.defines.VSM_SAMPLES=E.blurSamples,f.defines.VSM_SAMPLES=E.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),E.mapPass===null&&(E.mapPass=new ei(s.x,s.y,{format:dr,type:Ai})),d.uniforms.shadow_pass.value=E.map.depthTexture,d.uniforms.resolution.value=E.mapSize,d.uniforms.radius.value=E.radius,i.setRenderTarget(E.mapPass),i.clear(),i.renderBufferDirect(M,null,T,d,x,null),f.uniforms.shadow_pass.value=E.mapPass.texture,f.uniforms.resolution.value=E.mapSize,f.uniforms.radius.value=E.radius,i.setRenderTarget(E.map),i.clear(),i.renderBufferDirect(M,null,T,f,x,null)}function _(E,M,T,b){let A=null;const D=T.isPointLight===!0?E.customDistanceMaterial:E.customDepthMaterial;if(D!==void 0)A=D;else if(A=T.isPointLight===!0?l:a,i.localClippingEnabled&&M.clipShadows===!0&&Array.isArray(M.clippingPlanes)&&M.clippingPlanes.length!==0||M.displacementMap&&M.displacementScale!==0||M.alphaMap&&M.alphaTest>0||M.map&&M.alphaTest>0||M.alphaToCoverage===!0){const I=A.uuid,U=M.uuid;let F=c[I];F===void 0&&(F={},c[I]=F);let V=F[U];V===void 0&&(V=A.clone(),F[U]=V,M.addEventListener("dispose",S)),A=V}if(A.visible=M.visible,A.wireframe=M.wireframe,b===Fr?A.side=M.shadowSide!==null?M.shadowSide:M.side:A.side=M.shadowSide!==null?M.shadowSide:u[M.side],A.alphaMap=M.alphaMap,A.alphaTest=M.alphaToCoverage===!0?.5:M.alphaTest,A.map=M.map,A.clipShadows=M.clipShadows,A.clippingPlanes=M.clippingPlanes,A.clipIntersection=M.clipIntersection,A.displacementMap=M.displacementMap,A.displacementScale=M.displacementScale,A.displacementBias=M.displacementBias,A.wireframeLinewidth=M.wireframeLinewidth,A.linewidth=M.linewidth,T.isPointLight===!0&&A.isMeshDistanceMaterial===!0){const I=i.properties.get(A);I.light=T}return A}function v(E,M,T,b,A){if(E.visible===!1)return;if(E.layers.test(M.layers)&&(E.isMesh||E.isLine||E.isPoints)&&(E.castShadow||E.receiveShadow&&A===Fr)&&(!E.frustumCulled||n.intersectsObject(E))){E.modelViewMatrix.multiplyMatrices(T.matrixWorldInverse,E.matrixWorld);const U=t.update(E),F=E.material;if(Array.isArray(F)){const V=U.groups;for(let G=0,k=V.length;G<k;G++){const X=V[G],ht=F[X.materialIndex];if(ht&&ht.visible){const st=_(E,ht,b,A);E.onBeforeShadow(i,E,M,T,U,st,X),i.renderBufferDirect(T,null,U,st,E,X),E.onAfterShadow(i,E,M,T,U,st,X)}}}else if(F.visible){const V=_(E,F,b,A);E.onBeforeShadow(i,E,M,T,U,V,null),i.renderBufferDirect(T,null,U,V,E,null),E.onAfterShadow(i,E,M,T,U,V,null)}}const I=E.children;for(let U=0,F=I.length;U<F;U++)v(I[U],M,T,b,A)}function S(E){E.target.removeEventListener("dispose",S);for(const T in c){const b=c[T],A=E.target.uuid;A in b&&(b[A].dispose(),delete b[A])}}}const eS={[oc]:ac,[lc]:uc,[cc]:dc,[hr]:hc,[ac]:oc,[uc]:lc,[dc]:cc,[hc]:hr};function nS(i,t){function e(){let W=!1;const Tt=new le;let mt=null;const Pt=new le(0,0,0,0);return{setMask:function(ft){mt!==ft&&!W&&(i.colorMask(ft,ft,ft,ft),mt=ft)},setLocked:function(ft){W=ft},setClear:function(ft,lt,yt,$t,fe){fe===!0&&(ft*=$t,lt*=$t,yt*=$t),Tt.set(ft,lt,yt,$t),Pt.equals(Tt)===!1&&(i.clearColor(ft,lt,yt,$t),Pt.copy(Tt))},reset:function(){W=!1,mt=null,Pt.set(-1,0,0,0)}}}function n(){let W=!1,Tt=!1,mt=null,Pt=null,ft=null;return{setReversed:function(lt){if(Tt!==lt){const yt=t.get("EXT_clip_control");lt?yt.clipControlEXT(yt.LOWER_LEFT_EXT,yt.ZERO_TO_ONE_EXT):yt.clipControlEXT(yt.LOWER_LEFT_EXT,yt.NEGATIVE_ONE_TO_ONE_EXT),Tt=lt;const $t=ft;ft=null,this.setClear($t)}},getReversed:function(){return Tt},setTest:function(lt){lt?P(i.DEPTH_TEST):$(i.DEPTH_TEST)},setMask:function(lt){mt!==lt&&!W&&(i.depthMask(lt),mt=lt)},setFunc:function(lt){if(Tt&&(lt=eS[lt]),Pt!==lt){switch(lt){case oc:i.depthFunc(i.NEVER);break;case ac:i.depthFunc(i.ALWAYS);break;case lc:i.depthFunc(i.LESS);break;case hr:i.depthFunc(i.LEQUAL);break;case cc:i.depthFunc(i.EQUAL);break;case hc:i.depthFunc(i.GEQUAL);break;case uc:i.depthFunc(i.GREATER);break;case dc:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}Pt=lt}},setLocked:function(lt){W=lt},setClear:function(lt){ft!==lt&&(Tt&&(lt=1-lt),i.clearDepth(lt),ft=lt)},reset:function(){W=!1,mt=null,Pt=null,ft=null,Tt=!1}}}function s(){let W=!1,Tt=null,mt=null,Pt=null,ft=null,lt=null,yt=null,$t=null,fe=null;return{setTest:function(se){W||(se?P(i.STENCIL_TEST):$(i.STENCIL_TEST))},setMask:function(se){Tt!==se&&!W&&(i.stencilMask(se),Tt=se)},setFunc:function(se,$n,oi){(mt!==se||Pt!==$n||ft!==oi)&&(i.stencilFunc(se,$n,oi),mt=se,Pt=$n,ft=oi)},setOp:function(se,$n,oi){(lt!==se||yt!==$n||$t!==oi)&&(i.stencilOp(se,$n,oi),lt=se,yt=$n,$t=oi)},setLocked:function(se){W=se},setClear:function(se){fe!==se&&(i.clearStencil(se),fe=se)},reset:function(){W=!1,Tt=null,mt=null,Pt=null,ft=null,lt=null,yt=null,$t=null,fe=null}}}const r=new e,o=new n,a=new s,l=new WeakMap,c=new WeakMap;let h={},u={},d=new WeakMap,f=[],g=null,x=!1,m=null,p=null,y=null,_=null,v=null,S=null,E=null,M=new qt(0,0,0),T=0,b=!1,A=null,D=null,I=null,U=null,F=null;const V=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let G=!1,k=0;const X=i.getParameter(i.VERSION);X.indexOf("WebGL")!==-1?(k=parseFloat(/^WebGL (\d)/.exec(X)[1]),G=k>=1):X.indexOf("OpenGL ES")!==-1&&(k=parseFloat(/^OpenGL ES (\d)/.exec(X)[1]),G=k>=2);let ht=null,st={};const gt=i.getParameter(i.SCISSOR_BOX),Ot=i.getParameter(i.VIEWPORT),Ht=new le().fromArray(gt),Z=new le().fromArray(Ot);function z(W,Tt,mt,Pt){const ft=new Uint8Array(4),lt=i.createTexture();i.bindTexture(W,lt),i.texParameteri(W,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(W,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let yt=0;yt<mt;yt++)W===i.TEXTURE_3D||W===i.TEXTURE_2D_ARRAY?i.texImage3D(Tt,0,i.RGBA,1,1,Pt,0,i.RGBA,i.UNSIGNED_BYTE,ft):i.texImage2D(Tt+yt,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,ft);return lt}const R={};R[i.TEXTURE_2D]=z(i.TEXTURE_2D,i.TEXTURE_2D,1),R[i.TEXTURE_CUBE_MAP]=z(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),R[i.TEXTURE_2D_ARRAY]=z(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),R[i.TEXTURE_3D]=z(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),P(i.DEPTH_TEST),o.setFunc(hr),ct(!1),bt(Qh),P(i.CULL_FACE),tt(bi);function P(W){h[W]!==!0&&(i.enable(W),h[W]=!0)}function $(W){h[W]!==!1&&(i.disable(W),h[W]=!1)}function nt(W,Tt){return u[W]!==Tt?(i.bindFramebuffer(W,Tt),u[W]=Tt,W===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=Tt),W===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=Tt),!0):!1}function Y(W,Tt){let mt=f,Pt=!1;if(W){mt=d.get(Tt),mt===void 0&&(mt=[],d.set(Tt,mt));const ft=W.textures;if(mt.length!==ft.length||mt[0]!==i.COLOR_ATTACHMENT0){for(let lt=0,yt=ft.length;lt<yt;lt++)mt[lt]=i.COLOR_ATTACHMENT0+lt;mt.length=ft.length,Pt=!0}}else mt[0]!==i.BACK&&(mt[0]=i.BACK,Pt=!0);Pt&&i.drawBuffers(mt)}function rt(W){return g!==W?(i.useProgram(W),g=W,!0):!1}const xt={[ds]:i.FUNC_ADD,[nm]:i.FUNC_SUBTRACT,[im]:i.FUNC_REVERSE_SUBTRACT};xt[sm]=i.MIN,xt[rm]=i.MAX;const ut={[om]:i.ZERO,[am]:i.ONE,[lm]:i.SRC_COLOR,[sc]:i.SRC_ALPHA,[pm]:i.SRC_ALPHA_SATURATE,[dm]:i.DST_COLOR,[hm]:i.DST_ALPHA,[cm]:i.ONE_MINUS_SRC_COLOR,[rc]:i.ONE_MINUS_SRC_ALPHA,[fm]:i.ONE_MINUS_DST_COLOR,[um]:i.ONE_MINUS_DST_ALPHA,[mm]:i.CONSTANT_COLOR,[gm]:i.ONE_MINUS_CONSTANT_COLOR,[xm]:i.CONSTANT_ALPHA,[_m]:i.ONE_MINUS_CONSTANT_ALPHA};function tt(W,Tt,mt,Pt,ft,lt,yt,$t,fe,se){if(W===bi){x===!0&&($(i.BLEND),x=!1);return}if(x===!1&&(P(i.BLEND),x=!0),W!==em){if(W!==m||se!==b){if((p!==ds||v!==ds)&&(i.blendEquation(i.FUNC_ADD),p=ds,v=ds),se)switch(W){case or:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case tu:i.blendFunc(i.ONE,i.ONE);break;case eu:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case nu:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:ne("WebGLState: Invalid blending: ",W);break}else switch(W){case or:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case tu:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case eu:ne("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case nu:ne("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:ne("WebGLState: Invalid blending: ",W);break}y=null,_=null,S=null,E=null,M.set(0,0,0),T=0,m=W,b=se}return}ft=ft||Tt,lt=lt||mt,yt=yt||Pt,(Tt!==p||ft!==v)&&(i.blendEquationSeparate(xt[Tt],xt[ft]),p=Tt,v=ft),(mt!==y||Pt!==_||lt!==S||yt!==E)&&(i.blendFuncSeparate(ut[mt],ut[Pt],ut[lt],ut[yt]),y=mt,_=Pt,S=lt,E=yt),($t.equals(M)===!1||fe!==T)&&(i.blendColor($t.r,$t.g,$t.b,fe),M.copy($t),T=fe),m=W,b=!1}function ot(W,Tt){W.side===Cn?$(i.CULL_FACE):P(i.CULL_FACE);let mt=W.side===nn;Tt&&(mt=!mt),ct(mt),W.blending===or&&W.transparent===!1?tt(bi):tt(W.blending,W.blendEquation,W.blendSrc,W.blendDst,W.blendEquationAlpha,W.blendSrcAlpha,W.blendDstAlpha,W.blendColor,W.blendAlpha,W.premultipliedAlpha),o.setFunc(W.depthFunc),o.setTest(W.depthTest),o.setMask(W.depthWrite),r.setMask(W.colorWrite);const Pt=W.stencilWrite;a.setTest(Pt),Pt&&(a.setMask(W.stencilWriteMask),a.setFunc(W.stencilFunc,W.stencilRef,W.stencilFuncMask),a.setOp(W.stencilFail,W.stencilZFail,W.stencilZPass)),O(W.polygonOffset,W.polygonOffsetFactor,W.polygonOffsetUnits),W.alphaToCoverage===!0?P(i.SAMPLE_ALPHA_TO_COVERAGE):$(i.SAMPLE_ALPHA_TO_COVERAGE)}function ct(W){A!==W&&(W?i.frontFace(i.CW):i.frontFace(i.CCW),A=W)}function bt(W){W!==Qp?(P(i.CULL_FACE),W!==D&&(W===Qh?i.cullFace(i.BACK):W===tm?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):$(i.CULL_FACE),D=W}function C(W){W!==I&&(G&&i.lineWidth(W),I=W)}function O(W,Tt,mt){W?(P(i.POLYGON_OFFSET_FILL),(U!==Tt||F!==mt)&&(i.polygonOffset(Tt,mt),U=Tt,F=mt)):$(i.POLYGON_OFFSET_FILL)}function pt(W){W?P(i.SCISSOR_TEST):$(i.SCISSOR_TEST)}function Bt(W){W===void 0&&(W=i.TEXTURE0+V-1),ht!==W&&(i.activeTexture(W),ht=W)}function wt(W,Tt,mt){mt===void 0&&(ht===null?mt=i.TEXTURE0+V-1:mt=ht);let Pt=st[mt];Pt===void 0&&(Pt={type:void 0,texture:void 0},st[mt]=Pt),(Pt.type!==W||Pt.texture!==Tt)&&(ht!==mt&&(i.activeTexture(mt),ht=mt),i.bindTexture(W,Tt||R[W]),Pt.type=W,Pt.texture=Tt)}function B(){const W=st[ht];W!==void 0&&W.type!==void 0&&(i.bindTexture(W.type,null),W.type=void 0,W.texture=void 0)}function w(){try{i.compressedTexImage2D(...arguments)}catch(W){ne("WebGLState:",W)}}function H(){try{i.compressedTexImage3D(...arguments)}catch(W){ne("WebGLState:",W)}}function et(){try{i.texSubImage2D(...arguments)}catch(W){ne("WebGLState:",W)}}function at(){try{i.texSubImage3D(...arguments)}catch(W){ne("WebGLState:",W)}}function Q(){try{i.compressedTexSubImage2D(...arguments)}catch(W){ne("WebGLState:",W)}}function It(){try{i.compressedTexSubImage3D(...arguments)}catch(W){ne("WebGLState:",W)}}function _t(){try{i.texStorage2D(...arguments)}catch(W){ne("WebGLState:",W)}}function Lt(){try{i.texStorage3D(...arguments)}catch(W){ne("WebGLState:",W)}}function Vt(){try{i.texImage2D(...arguments)}catch(W){ne("WebGLState:",W)}}function dt(){try{i.texImage3D(...arguments)}catch(W){ne("WebGLState:",W)}}function vt(W){Ht.equals(W)===!1&&(i.scissor(W.x,W.y,W.z,W.w),Ht.copy(W))}function Nt(W){Z.equals(W)===!1&&(i.viewport(W.x,W.y,W.z,W.w),Z.copy(W))}function Ut(W,Tt){let mt=c.get(Tt);mt===void 0&&(mt=new WeakMap,c.set(Tt,mt));let Pt=mt.get(W);Pt===void 0&&(Pt=i.getUniformBlockIndex(Tt,W.name),mt.set(W,Pt))}function St(W,Tt){const Pt=c.get(Tt).get(W);l.get(Tt)!==Pt&&(i.uniformBlockBinding(Tt,Pt,W.__bindingPointIndex),l.set(Tt,Pt))}function Jt(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),h={},ht=null,st={},u={},d=new WeakMap,f=[],g=null,x=!1,m=null,p=null,y=null,_=null,v=null,S=null,E=null,M=new qt(0,0,0),T=0,b=!1,A=null,D=null,I=null,U=null,F=null,Ht.set(0,0,i.canvas.width,i.canvas.height),Z.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:P,disable:$,bindFramebuffer:nt,drawBuffers:Y,useProgram:rt,setBlending:tt,setMaterial:ot,setFlipSided:ct,setCullFace:bt,setLineWidth:C,setPolygonOffset:O,setScissorTest:pt,activeTexture:Bt,bindTexture:wt,unbindTexture:B,compressedTexImage2D:w,compressedTexImage3D:H,texImage2D:Vt,texImage3D:dt,updateUBOMapping:Ut,uniformBlockBinding:St,texStorage2D:_t,texStorage3D:Lt,texSubImage2D:et,texSubImage3D:at,compressedTexSubImage2D:Q,compressedTexSubImage3D:It,scissor:vt,viewport:Nt,reset:Jt}}function iS(i,t,e,n,s,r,o){const a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new it,h=new WeakMap;let u;const d=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(B,w){return f?new OffscreenCanvas(B,w):Aa("canvas")}function x(B,w,H){let et=1;const at=wt(B);if((at.width>H||at.height>H)&&(et=H/Math.max(at.width,at.height)),et<1)if(typeof HTMLImageElement<"u"&&B instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&B instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&B instanceof ImageBitmap||typeof VideoFrame<"u"&&B instanceof VideoFrame){const Q=Math.floor(et*at.width),It=Math.floor(et*at.height);u===void 0&&(u=g(Q,It));const _t=w?g(Q,It):u;return _t.width=Q,_t.height=It,_t.getContext("2d").drawImage(B,0,0,Q,It),Gt("WebGLRenderer: Texture has been resized from ("+at.width+"x"+at.height+") to ("+Q+"x"+It+")."),_t}else return"data"in B&&Gt("WebGLRenderer: Image in DataTexture is too big ("+at.width+"x"+at.height+")."),B;return B}function m(B){return B.generateMipmaps}function p(B){i.generateMipmap(B)}function y(B){return B.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:B.isWebGL3DRenderTarget?i.TEXTURE_3D:B.isWebGLArrayRenderTarget||B.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function _(B,w,H,et,at=!1){if(B!==null){if(i[B]!==void 0)return i[B];Gt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+B+"'")}let Q=w;if(w===i.RED&&(H===i.FLOAT&&(Q=i.R32F),H===i.HALF_FLOAT&&(Q=i.R16F),H===i.UNSIGNED_BYTE&&(Q=i.R8)),w===i.RED_INTEGER&&(H===i.UNSIGNED_BYTE&&(Q=i.R8UI),H===i.UNSIGNED_SHORT&&(Q=i.R16UI),H===i.UNSIGNED_INT&&(Q=i.R32UI),H===i.BYTE&&(Q=i.R8I),H===i.SHORT&&(Q=i.R16I),H===i.INT&&(Q=i.R32I)),w===i.RG&&(H===i.FLOAT&&(Q=i.RG32F),H===i.HALF_FLOAT&&(Q=i.RG16F),H===i.UNSIGNED_BYTE&&(Q=i.RG8)),w===i.RG_INTEGER&&(H===i.UNSIGNED_BYTE&&(Q=i.RG8UI),H===i.UNSIGNED_SHORT&&(Q=i.RG16UI),H===i.UNSIGNED_INT&&(Q=i.RG32UI),H===i.BYTE&&(Q=i.RG8I),H===i.SHORT&&(Q=i.RG16I),H===i.INT&&(Q=i.RG32I)),w===i.RGB_INTEGER&&(H===i.UNSIGNED_BYTE&&(Q=i.RGB8UI),H===i.UNSIGNED_SHORT&&(Q=i.RGB16UI),H===i.UNSIGNED_INT&&(Q=i.RGB32UI),H===i.BYTE&&(Q=i.RGB8I),H===i.SHORT&&(Q=i.RGB16I),H===i.INT&&(Q=i.RGB32I)),w===i.RGBA_INTEGER&&(H===i.UNSIGNED_BYTE&&(Q=i.RGBA8UI),H===i.UNSIGNED_SHORT&&(Q=i.RGBA16UI),H===i.UNSIGNED_INT&&(Q=i.RGBA32UI),H===i.BYTE&&(Q=i.RGBA8I),H===i.SHORT&&(Q=i.RGBA16I),H===i.INT&&(Q=i.RGBA32I)),w===i.RGB&&(H===i.UNSIGNED_INT_5_9_9_9_REV&&(Q=i.RGB9_E5),H===i.UNSIGNED_INT_10F_11F_11F_REV&&(Q=i.R11F_G11F_B10F)),w===i.RGBA){const It=at?Ma:te.getTransfer(et);H===i.FLOAT&&(Q=i.RGBA32F),H===i.HALF_FLOAT&&(Q=i.RGBA16F),H===i.UNSIGNED_BYTE&&(Q=It===oe?i.SRGB8_ALPHA8:i.RGBA8),H===i.UNSIGNED_SHORT_4_4_4_4&&(Q=i.RGBA4),H===i.UNSIGNED_SHORT_5_5_5_1&&(Q=i.RGB5_A1)}return(Q===i.R16F||Q===i.R32F||Q===i.RG16F||Q===i.RG32F||Q===i.RGBA16F||Q===i.RGBA32F)&&t.get("EXT_color_buffer_float"),Q}function v(B,w){let H;return B?w===null||w===ii||w===Zr?H=i.DEPTH24_STENCIL8:w===Kn?H=i.DEPTH32F_STENCIL8:w===$r&&(H=i.DEPTH24_STENCIL8,Gt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):w===null||w===ii||w===Zr?H=i.DEPTH_COMPONENT24:w===Kn?H=i.DEPTH_COMPONENT32F:w===$r&&(H=i.DEPTH_COMPONENT16),H}function S(B,w){return m(B)===!0||B.isFramebufferTexture&&B.minFilter!==ze&&B.minFilter!==qe?Math.log2(Math.max(w.width,w.height))+1:B.mipmaps!==void 0&&B.mipmaps.length>0?B.mipmaps.length:B.isCompressedTexture&&Array.isArray(B.image)?w.mipmaps.length:1}function E(B){const w=B.target;w.removeEventListener("dispose",E),T(w),w.isVideoTexture&&h.delete(w)}function M(B){const w=B.target;w.removeEventListener("dispose",M),A(w)}function T(B){const w=n.get(B);if(w.__webglInit===void 0)return;const H=B.source,et=d.get(H);if(et){const at=et[w.__cacheKey];at.usedTimes--,at.usedTimes===0&&b(B),Object.keys(et).length===0&&d.delete(H)}n.remove(B)}function b(B){const w=n.get(B);i.deleteTexture(w.__webglTexture);const H=B.source,et=d.get(H);delete et[w.__cacheKey],o.memory.textures--}function A(B){const w=n.get(B);if(B.depthTexture&&(B.depthTexture.dispose(),n.remove(B.depthTexture)),B.isWebGLCubeRenderTarget)for(let et=0;et<6;et++){if(Array.isArray(w.__webglFramebuffer[et]))for(let at=0;at<w.__webglFramebuffer[et].length;at++)i.deleteFramebuffer(w.__webglFramebuffer[et][at]);else i.deleteFramebuffer(w.__webglFramebuffer[et]);w.__webglDepthbuffer&&i.deleteRenderbuffer(w.__webglDepthbuffer[et])}else{if(Array.isArray(w.__webglFramebuffer))for(let et=0;et<w.__webglFramebuffer.length;et++)i.deleteFramebuffer(w.__webglFramebuffer[et]);else i.deleteFramebuffer(w.__webglFramebuffer);if(w.__webglDepthbuffer&&i.deleteRenderbuffer(w.__webglDepthbuffer),w.__webglMultisampledFramebuffer&&i.deleteFramebuffer(w.__webglMultisampledFramebuffer),w.__webglColorRenderbuffer)for(let et=0;et<w.__webglColorRenderbuffer.length;et++)w.__webglColorRenderbuffer[et]&&i.deleteRenderbuffer(w.__webglColorRenderbuffer[et]);w.__webglDepthRenderbuffer&&i.deleteRenderbuffer(w.__webglDepthRenderbuffer)}const H=B.textures;for(let et=0,at=H.length;et<at;et++){const Q=n.get(H[et]);Q.__webglTexture&&(i.deleteTexture(Q.__webglTexture),o.memory.textures--),n.remove(H[et])}n.remove(B)}let D=0;function I(){D=0}function U(){const B=D;return B>=s.maxTextures&&Gt("WebGLTextures: Trying to use "+B+" texture units while this GPU supports only "+s.maxTextures),D+=1,B}function F(B){const w=[];return w.push(B.wrapS),w.push(B.wrapT),w.push(B.wrapR||0),w.push(B.magFilter),w.push(B.minFilter),w.push(B.anisotropy),w.push(B.internalFormat),w.push(B.format),w.push(B.type),w.push(B.generateMipmaps),w.push(B.premultiplyAlpha),w.push(B.flipY),w.push(B.unpackAlignment),w.push(B.colorSpace),w.join()}function V(B,w){const H=n.get(B);if(B.isVideoTexture&&pt(B),B.isRenderTargetTexture===!1&&B.isExternalTexture!==!0&&B.version>0&&H.__version!==B.version){const et=B.image;if(et===null)Gt("WebGLRenderer: Texture marked for update but no image data found.");else if(et.complete===!1)Gt("WebGLRenderer: Texture marked for update but image is incomplete");else{R(H,B,w);return}}else B.isExternalTexture&&(H.__webglTexture=B.sourceTexture?B.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,H.__webglTexture,i.TEXTURE0+w)}function G(B,w){const H=n.get(B);if(B.isRenderTargetTexture===!1&&B.version>0&&H.__version!==B.version){R(H,B,w);return}else B.isExternalTexture&&(H.__webglTexture=B.sourceTexture?B.sourceTexture:null);e.bindTexture(i.TEXTURE_2D_ARRAY,H.__webglTexture,i.TEXTURE0+w)}function k(B,w){const H=n.get(B);if(B.isRenderTargetTexture===!1&&B.version>0&&H.__version!==B.version){R(H,B,w);return}e.bindTexture(i.TEXTURE_3D,H.__webglTexture,i.TEXTURE0+w)}function X(B,w){const H=n.get(B);if(B.isCubeDepthTexture!==!0&&B.version>0&&H.__version!==B.version){P(H,B,w);return}e.bindTexture(i.TEXTURE_CUBE_MAP,H.__webglTexture,i.TEXTURE0+w)}const ht={[mc]:i.REPEAT,[yi]:i.CLAMP_TO_EDGE,[gc]:i.MIRRORED_REPEAT},st={[ze]:i.NEAREST,[Sm]:i.NEAREST_MIPMAP_NEAREST,[uo]:i.NEAREST_MIPMAP_LINEAR,[qe]:i.LINEAR,[$a]:i.LINEAR_MIPMAP_NEAREST,[_s]:i.LINEAR_MIPMAP_LINEAR},gt={[Em]:i.NEVER,[Pm]:i.ALWAYS,[Am]:i.LESS,[xh]:i.LEQUAL,[wm]:i.EQUAL,[_h]:i.GEQUAL,[Tm]:i.GREATER,[Cm]:i.NOTEQUAL};function Ot(B,w){if(w.type===Kn&&t.has("OES_texture_float_linear")===!1&&(w.magFilter===qe||w.magFilter===$a||w.magFilter===uo||w.magFilter===_s||w.minFilter===qe||w.minFilter===$a||w.minFilter===uo||w.minFilter===_s)&&Gt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(B,i.TEXTURE_WRAP_S,ht[w.wrapS]),i.texParameteri(B,i.TEXTURE_WRAP_T,ht[w.wrapT]),(B===i.TEXTURE_3D||B===i.TEXTURE_2D_ARRAY)&&i.texParameteri(B,i.TEXTURE_WRAP_R,ht[w.wrapR]),i.texParameteri(B,i.TEXTURE_MAG_FILTER,st[w.magFilter]),i.texParameteri(B,i.TEXTURE_MIN_FILTER,st[w.minFilter]),w.compareFunction&&(i.texParameteri(B,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(B,i.TEXTURE_COMPARE_FUNC,gt[w.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(w.magFilter===ze||w.minFilter!==uo&&w.minFilter!==_s||w.type===Kn&&t.has("OES_texture_float_linear")===!1)return;if(w.anisotropy>1||n.get(w).__currentAnisotropy){const H=t.get("EXT_texture_filter_anisotropic");i.texParameterf(B,H.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(w.anisotropy,s.getMaxAnisotropy())),n.get(w).__currentAnisotropy=w.anisotropy}}}function Ht(B,w){let H=!1;B.__webglInit===void 0&&(B.__webglInit=!0,w.addEventListener("dispose",E));const et=w.source;let at=d.get(et);at===void 0&&(at={},d.set(et,at));const Q=F(w);if(Q!==B.__cacheKey){at[Q]===void 0&&(at[Q]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,H=!0),at[Q].usedTimes++;const It=at[B.__cacheKey];It!==void 0&&(at[B.__cacheKey].usedTimes--,It.usedTimes===0&&b(w)),B.__cacheKey=Q,B.__webglTexture=at[Q].texture}return H}function Z(B,w,H){return Math.floor(Math.floor(B/H)/w)}function z(B,w,H,et){const Q=B.updateRanges;if(Q.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,w.width,w.height,H,et,w.data);else{Q.sort((dt,vt)=>dt.start-vt.start);let It=0;for(let dt=1;dt<Q.length;dt++){const vt=Q[It],Nt=Q[dt],Ut=vt.start+vt.count,St=Z(Nt.start,w.width,4),Jt=Z(vt.start,w.width,4);Nt.start<=Ut+1&&St===Jt&&Z(Nt.start+Nt.count-1,w.width,4)===St?vt.count=Math.max(vt.count,Nt.start+Nt.count-vt.start):(++It,Q[It]=Nt)}Q.length=It+1;const _t=i.getParameter(i.UNPACK_ROW_LENGTH),Lt=i.getParameter(i.UNPACK_SKIP_PIXELS),Vt=i.getParameter(i.UNPACK_SKIP_ROWS);i.pixelStorei(i.UNPACK_ROW_LENGTH,w.width);for(let dt=0,vt=Q.length;dt<vt;dt++){const Nt=Q[dt],Ut=Math.floor(Nt.start/4),St=Math.ceil(Nt.count/4),Jt=Ut%w.width,W=Math.floor(Ut/w.width),Tt=St,mt=1;i.pixelStorei(i.UNPACK_SKIP_PIXELS,Jt),i.pixelStorei(i.UNPACK_SKIP_ROWS,W),e.texSubImage2D(i.TEXTURE_2D,0,Jt,W,Tt,mt,H,et,w.data)}B.clearUpdateRanges(),i.pixelStorei(i.UNPACK_ROW_LENGTH,_t),i.pixelStorei(i.UNPACK_SKIP_PIXELS,Lt),i.pixelStorei(i.UNPACK_SKIP_ROWS,Vt)}}function R(B,w,H){let et=i.TEXTURE_2D;(w.isDataArrayTexture||w.isCompressedArrayTexture)&&(et=i.TEXTURE_2D_ARRAY),w.isData3DTexture&&(et=i.TEXTURE_3D);const at=Ht(B,w),Q=w.source;e.bindTexture(et,B.__webglTexture,i.TEXTURE0+H);const It=n.get(Q);if(Q.version!==It.__version||at===!0){e.activeTexture(i.TEXTURE0+H);const _t=te.getPrimaries(te.workingColorSpace),Lt=w.colorSpace===ki?null:te.getPrimaries(w.colorSpace),Vt=w.colorSpace===ki||_t===Lt?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,w.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,w.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,w.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Vt);let dt=x(w.image,!1,s.maxTextureSize);dt=Bt(w,dt);const vt=r.convert(w.format,w.colorSpace),Nt=r.convert(w.type);let Ut=_(w.internalFormat,vt,Nt,w.colorSpace,w.isVideoTexture);Ot(et,w);let St;const Jt=w.mipmaps,W=w.isVideoTexture!==!0,Tt=It.__version===void 0||at===!0,mt=Q.dataReady,Pt=S(w,dt);if(w.isDepthTexture)Ut=v(w.format===vs,w.type),Tt&&(W?e.texStorage2D(i.TEXTURE_2D,1,Ut,dt.width,dt.height):e.texImage2D(i.TEXTURE_2D,0,Ut,dt.width,dt.height,0,vt,Nt,null));else if(w.isDataTexture)if(Jt.length>0){W&&Tt&&e.texStorage2D(i.TEXTURE_2D,Pt,Ut,Jt[0].width,Jt[0].height);for(let ft=0,lt=Jt.length;ft<lt;ft++)St=Jt[ft],W?mt&&e.texSubImage2D(i.TEXTURE_2D,ft,0,0,St.width,St.height,vt,Nt,St.data):e.texImage2D(i.TEXTURE_2D,ft,Ut,St.width,St.height,0,vt,Nt,St.data);w.generateMipmaps=!1}else W?(Tt&&e.texStorage2D(i.TEXTURE_2D,Pt,Ut,dt.width,dt.height),mt&&z(w,dt,vt,Nt)):e.texImage2D(i.TEXTURE_2D,0,Ut,dt.width,dt.height,0,vt,Nt,dt.data);else if(w.isCompressedTexture)if(w.isCompressedArrayTexture){W&&Tt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Pt,Ut,Jt[0].width,Jt[0].height,dt.depth);for(let ft=0,lt=Jt.length;ft<lt;ft++)if(St=Jt[ft],w.format!==Wn)if(vt!==null)if(W){if(mt)if(w.layerUpdates.size>0){const yt=zu(St.width,St.height,w.format,w.type);for(const $t of w.layerUpdates){const fe=St.data.subarray($t*yt/St.data.BYTES_PER_ELEMENT,($t+1)*yt/St.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ft,0,0,$t,St.width,St.height,1,vt,fe)}w.clearLayerUpdates()}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ft,0,0,0,St.width,St.height,dt.depth,vt,St.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,ft,Ut,St.width,St.height,dt.depth,0,St.data,0,0);else Gt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else W?mt&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,ft,0,0,0,St.width,St.height,dt.depth,vt,Nt,St.data):e.texImage3D(i.TEXTURE_2D_ARRAY,ft,Ut,St.width,St.height,dt.depth,0,vt,Nt,St.data)}else{W&&Tt&&e.texStorage2D(i.TEXTURE_2D,Pt,Ut,Jt[0].width,Jt[0].height);for(let ft=0,lt=Jt.length;ft<lt;ft++)St=Jt[ft],w.format!==Wn?vt!==null?W?mt&&e.compressedTexSubImage2D(i.TEXTURE_2D,ft,0,0,St.width,St.height,vt,St.data):e.compressedTexImage2D(i.TEXTURE_2D,ft,Ut,St.width,St.height,0,St.data):Gt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):W?mt&&e.texSubImage2D(i.TEXTURE_2D,ft,0,0,St.width,St.height,vt,Nt,St.data):e.texImage2D(i.TEXTURE_2D,ft,Ut,St.width,St.height,0,vt,Nt,St.data)}else if(w.isDataArrayTexture)if(W){if(Tt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Pt,Ut,dt.width,dt.height,dt.depth),mt)if(w.layerUpdates.size>0){const ft=zu(dt.width,dt.height,w.format,w.type);for(const lt of w.layerUpdates){const yt=dt.data.subarray(lt*ft/dt.data.BYTES_PER_ELEMENT,(lt+1)*ft/dt.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,lt,dt.width,dt.height,1,vt,Nt,yt)}w.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,dt.width,dt.height,dt.depth,vt,Nt,dt.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,Ut,dt.width,dt.height,dt.depth,0,vt,Nt,dt.data);else if(w.isData3DTexture)W?(Tt&&e.texStorage3D(i.TEXTURE_3D,Pt,Ut,dt.width,dt.height,dt.depth),mt&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,dt.width,dt.height,dt.depth,vt,Nt,dt.data)):e.texImage3D(i.TEXTURE_3D,0,Ut,dt.width,dt.height,dt.depth,0,vt,Nt,dt.data);else if(w.isFramebufferTexture){if(Tt)if(W)e.texStorage2D(i.TEXTURE_2D,Pt,Ut,dt.width,dt.height);else{let ft=dt.width,lt=dt.height;for(let yt=0;yt<Pt;yt++)e.texImage2D(i.TEXTURE_2D,yt,Ut,ft,lt,0,vt,Nt,null),ft>>=1,lt>>=1}}else if(Jt.length>0){if(W&&Tt){const ft=wt(Jt[0]);e.texStorage2D(i.TEXTURE_2D,Pt,Ut,ft.width,ft.height)}for(let ft=0,lt=Jt.length;ft<lt;ft++)St=Jt[ft],W?mt&&e.texSubImage2D(i.TEXTURE_2D,ft,0,0,vt,Nt,St):e.texImage2D(i.TEXTURE_2D,ft,Ut,vt,Nt,St);w.generateMipmaps=!1}else if(W){if(Tt){const ft=wt(dt);e.texStorage2D(i.TEXTURE_2D,Pt,Ut,ft.width,ft.height)}mt&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,vt,Nt,dt)}else e.texImage2D(i.TEXTURE_2D,0,Ut,vt,Nt,dt);m(w)&&p(et),It.__version=Q.version,w.onUpdate&&w.onUpdate(w)}B.__version=w.version}function P(B,w,H){if(w.image.length!==6)return;const et=Ht(B,w),at=w.source;e.bindTexture(i.TEXTURE_CUBE_MAP,B.__webglTexture,i.TEXTURE0+H);const Q=n.get(at);if(at.version!==Q.__version||et===!0){e.activeTexture(i.TEXTURE0+H);const It=te.getPrimaries(te.workingColorSpace),_t=w.colorSpace===ki?null:te.getPrimaries(w.colorSpace),Lt=w.colorSpace===ki||It===_t?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,w.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,w.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,w.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Lt);const Vt=w.isCompressedTexture||w.image[0].isCompressedTexture,dt=w.image[0]&&w.image[0].isDataTexture,vt=[];for(let lt=0;lt<6;lt++)!Vt&&!dt?vt[lt]=x(w.image[lt],!0,s.maxCubemapSize):vt[lt]=dt?w.image[lt].image:w.image[lt],vt[lt]=Bt(w,vt[lt]);const Nt=vt[0],Ut=r.convert(w.format,w.colorSpace),St=r.convert(w.type),Jt=_(w.internalFormat,Ut,St,w.colorSpace),W=w.isVideoTexture!==!0,Tt=Q.__version===void 0||et===!0,mt=at.dataReady;let Pt=S(w,Nt);Ot(i.TEXTURE_CUBE_MAP,w);let ft;if(Vt){W&&Tt&&e.texStorage2D(i.TEXTURE_CUBE_MAP,Pt,Jt,Nt.width,Nt.height);for(let lt=0;lt<6;lt++){ft=vt[lt].mipmaps;for(let yt=0;yt<ft.length;yt++){const $t=ft[yt];w.format!==Wn?Ut!==null?W?mt&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,yt,0,0,$t.width,$t.height,Ut,$t.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,yt,Jt,$t.width,$t.height,0,$t.data):Gt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):W?mt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,yt,0,0,$t.width,$t.height,Ut,St,$t.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,yt,Jt,$t.width,$t.height,0,Ut,St,$t.data)}}}else{if(ft=w.mipmaps,W&&Tt){ft.length>0&&Pt++;const lt=wt(vt[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,Pt,Jt,lt.width,lt.height)}for(let lt=0;lt<6;lt++)if(dt){W?mt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,0,0,0,vt[lt].width,vt[lt].height,Ut,St,vt[lt].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,0,Jt,vt[lt].width,vt[lt].height,0,Ut,St,vt[lt].data);for(let yt=0;yt<ft.length;yt++){const fe=ft[yt].image[lt].image;W?mt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,yt+1,0,0,fe.width,fe.height,Ut,St,fe.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,yt+1,Jt,fe.width,fe.height,0,Ut,St,fe.data)}}else{W?mt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,0,0,0,Ut,St,vt[lt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,0,Jt,Ut,St,vt[lt]);for(let yt=0;yt<ft.length;yt++){const $t=ft[yt];W?mt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,yt+1,0,0,Ut,St,$t.image[lt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,yt+1,Jt,Ut,St,$t.image[lt])}}}m(w)&&p(i.TEXTURE_CUBE_MAP),Q.__version=at.version,w.onUpdate&&w.onUpdate(w)}B.__version=w.version}function $(B,w,H,et,at,Q){const It=r.convert(H.format,H.colorSpace),_t=r.convert(H.type),Lt=_(H.internalFormat,It,_t,H.colorSpace),Vt=n.get(w),dt=n.get(H);if(dt.__renderTarget=w,!Vt.__hasExternalTextures){const vt=Math.max(1,w.width>>Q),Nt=Math.max(1,w.height>>Q);at===i.TEXTURE_3D||at===i.TEXTURE_2D_ARRAY?e.texImage3D(at,Q,Lt,vt,Nt,w.depth,0,It,_t,null):e.texImage2D(at,Q,Lt,vt,Nt,0,It,_t,null)}e.bindFramebuffer(i.FRAMEBUFFER,B),O(w)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,et,at,dt.__webglTexture,0,C(w)):(at===i.TEXTURE_2D||at>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&at<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,et,at,dt.__webglTexture,Q),e.bindFramebuffer(i.FRAMEBUFFER,null)}function nt(B,w,H){if(i.bindRenderbuffer(i.RENDERBUFFER,B),w.depthBuffer){const et=w.depthTexture,at=et&&et.isDepthTexture?et.type:null,Q=v(w.stencilBuffer,at),It=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;O(w)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,C(w),Q,w.width,w.height):H?i.renderbufferStorageMultisample(i.RENDERBUFFER,C(w),Q,w.width,w.height):i.renderbufferStorage(i.RENDERBUFFER,Q,w.width,w.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,It,i.RENDERBUFFER,B)}else{const et=w.textures;for(let at=0;at<et.length;at++){const Q=et[at],It=r.convert(Q.format,Q.colorSpace),_t=r.convert(Q.type),Lt=_(Q.internalFormat,It,_t,Q.colorSpace);O(w)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,C(w),Lt,w.width,w.height):H?i.renderbufferStorageMultisample(i.RENDERBUFFER,C(w),Lt,w.width,w.height):i.renderbufferStorage(i.RENDERBUFFER,Lt,w.width,w.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Y(B,w,H){const et=w.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(i.FRAMEBUFFER,B),!(w.depthTexture&&w.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const at=n.get(w.depthTexture);if(at.__renderTarget=w,(!at.__webglTexture||w.depthTexture.image.width!==w.width||w.depthTexture.image.height!==w.height)&&(w.depthTexture.image.width=w.width,w.depthTexture.image.height=w.height,w.depthTexture.needsUpdate=!0),et){if(at.__webglInit===void 0&&(at.__webglInit=!0,w.depthTexture.addEventListener("dispose",E)),at.__webglTexture===void 0){at.__webglTexture=i.createTexture(),e.bindTexture(i.TEXTURE_CUBE_MAP,at.__webglTexture),Ot(i.TEXTURE_CUBE_MAP,w.depthTexture);const Vt=r.convert(w.depthTexture.format),dt=r.convert(w.depthTexture.type);let vt;w.depthTexture.format===wi?vt=i.DEPTH_COMPONENT24:w.depthTexture.format===vs&&(vt=i.DEPTH24_STENCIL8);for(let Nt=0;Nt<6;Nt++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Nt,0,vt,w.width,w.height,0,Vt,dt,null)}}else V(w.depthTexture,0);const Q=at.__webglTexture,It=C(w),_t=et?i.TEXTURE_CUBE_MAP_POSITIVE_X+H:i.TEXTURE_2D,Lt=w.depthTexture.format===vs?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(w.depthTexture.format===wi)O(w)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Lt,_t,Q,0,It):i.framebufferTexture2D(i.FRAMEBUFFER,Lt,_t,Q,0);else if(w.depthTexture.format===vs)O(w)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Lt,_t,Q,0,It):i.framebufferTexture2D(i.FRAMEBUFFER,Lt,_t,Q,0);else throw new Error("Unknown depthTexture format")}function rt(B){const w=n.get(B),H=B.isWebGLCubeRenderTarget===!0;if(w.__boundDepthTexture!==B.depthTexture){const et=B.depthTexture;if(w.__depthDisposeCallback&&w.__depthDisposeCallback(),et){const at=()=>{delete w.__boundDepthTexture,delete w.__depthDisposeCallback,et.removeEventListener("dispose",at)};et.addEventListener("dispose",at),w.__depthDisposeCallback=at}w.__boundDepthTexture=et}if(B.depthTexture&&!w.__autoAllocateDepthBuffer)if(H)for(let et=0;et<6;et++)Y(w.__webglFramebuffer[et],B,et);else{const et=B.texture.mipmaps;et&&et.length>0?Y(w.__webglFramebuffer[0],B,0):Y(w.__webglFramebuffer,B,0)}else if(H){w.__webglDepthbuffer=[];for(let et=0;et<6;et++)if(e.bindFramebuffer(i.FRAMEBUFFER,w.__webglFramebuffer[et]),w.__webglDepthbuffer[et]===void 0)w.__webglDepthbuffer[et]=i.createRenderbuffer(),nt(w.__webglDepthbuffer[et],B,!1);else{const at=B.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Q=w.__webglDepthbuffer[et];i.bindRenderbuffer(i.RENDERBUFFER,Q),i.framebufferRenderbuffer(i.FRAMEBUFFER,at,i.RENDERBUFFER,Q)}}else{const et=B.texture.mipmaps;if(et&&et.length>0?e.bindFramebuffer(i.FRAMEBUFFER,w.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,w.__webglFramebuffer),w.__webglDepthbuffer===void 0)w.__webglDepthbuffer=i.createRenderbuffer(),nt(w.__webglDepthbuffer,B,!1);else{const at=B.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Q=w.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,Q),i.framebufferRenderbuffer(i.FRAMEBUFFER,at,i.RENDERBUFFER,Q)}}e.bindFramebuffer(i.FRAMEBUFFER,null)}function xt(B,w,H){const et=n.get(B);w!==void 0&&$(et.__webglFramebuffer,B,B.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),H!==void 0&&rt(B)}function ut(B){const w=B.texture,H=n.get(B),et=n.get(w);B.addEventListener("dispose",M);const at=B.textures,Q=B.isWebGLCubeRenderTarget===!0,It=at.length>1;if(It||(et.__webglTexture===void 0&&(et.__webglTexture=i.createTexture()),et.__version=w.version,o.memory.textures++),Q){H.__webglFramebuffer=[];for(let _t=0;_t<6;_t++)if(w.mipmaps&&w.mipmaps.length>0){H.__webglFramebuffer[_t]=[];for(let Lt=0;Lt<w.mipmaps.length;Lt++)H.__webglFramebuffer[_t][Lt]=i.createFramebuffer()}else H.__webglFramebuffer[_t]=i.createFramebuffer()}else{if(w.mipmaps&&w.mipmaps.length>0){H.__webglFramebuffer=[];for(let _t=0;_t<w.mipmaps.length;_t++)H.__webglFramebuffer[_t]=i.createFramebuffer()}else H.__webglFramebuffer=i.createFramebuffer();if(It)for(let _t=0,Lt=at.length;_t<Lt;_t++){const Vt=n.get(at[_t]);Vt.__webglTexture===void 0&&(Vt.__webglTexture=i.createTexture(),o.memory.textures++)}if(B.samples>0&&O(B)===!1){H.__webglMultisampledFramebuffer=i.createFramebuffer(),H.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,H.__webglMultisampledFramebuffer);for(let _t=0;_t<at.length;_t++){const Lt=at[_t];H.__webglColorRenderbuffer[_t]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,H.__webglColorRenderbuffer[_t]);const Vt=r.convert(Lt.format,Lt.colorSpace),dt=r.convert(Lt.type),vt=_(Lt.internalFormat,Vt,dt,Lt.colorSpace,B.isXRRenderTarget===!0),Nt=C(B);i.renderbufferStorageMultisample(i.RENDERBUFFER,Nt,vt,B.width,B.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+_t,i.RENDERBUFFER,H.__webglColorRenderbuffer[_t])}i.bindRenderbuffer(i.RENDERBUFFER,null),B.depthBuffer&&(H.__webglDepthRenderbuffer=i.createRenderbuffer(),nt(H.__webglDepthRenderbuffer,B,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(Q){e.bindTexture(i.TEXTURE_CUBE_MAP,et.__webglTexture),Ot(i.TEXTURE_CUBE_MAP,w);for(let _t=0;_t<6;_t++)if(w.mipmaps&&w.mipmaps.length>0)for(let Lt=0;Lt<w.mipmaps.length;Lt++)$(H.__webglFramebuffer[_t][Lt],B,w,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,Lt);else $(H.__webglFramebuffer[_t],B,w,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,0);m(w)&&p(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(It){for(let _t=0,Lt=at.length;_t<Lt;_t++){const Vt=at[_t],dt=n.get(Vt);let vt=i.TEXTURE_2D;(B.isWebGL3DRenderTarget||B.isWebGLArrayRenderTarget)&&(vt=B.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(vt,dt.__webglTexture),Ot(vt,Vt),$(H.__webglFramebuffer,B,Vt,i.COLOR_ATTACHMENT0+_t,vt,0),m(Vt)&&p(vt)}e.unbindTexture()}else{let _t=i.TEXTURE_2D;if((B.isWebGL3DRenderTarget||B.isWebGLArrayRenderTarget)&&(_t=B.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(_t,et.__webglTexture),Ot(_t,w),w.mipmaps&&w.mipmaps.length>0)for(let Lt=0;Lt<w.mipmaps.length;Lt++)$(H.__webglFramebuffer[Lt],B,w,i.COLOR_ATTACHMENT0,_t,Lt);else $(H.__webglFramebuffer,B,w,i.COLOR_ATTACHMENT0,_t,0);m(w)&&p(_t),e.unbindTexture()}B.depthBuffer&&rt(B)}function tt(B){const w=B.textures;for(let H=0,et=w.length;H<et;H++){const at=w[H];if(m(at)){const Q=y(B),It=n.get(at).__webglTexture;e.bindTexture(Q,It),p(Q),e.unbindTexture()}}}const ot=[],ct=[];function bt(B){if(B.samples>0){if(O(B)===!1){const w=B.textures,H=B.width,et=B.height;let at=i.COLOR_BUFFER_BIT;const Q=B.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,It=n.get(B),_t=w.length>1;if(_t)for(let Vt=0;Vt<w.length;Vt++)e.bindFramebuffer(i.FRAMEBUFFER,It.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Vt,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,It.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Vt,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,It.__webglMultisampledFramebuffer);const Lt=B.texture.mipmaps;Lt&&Lt.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,It.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,It.__webglFramebuffer);for(let Vt=0;Vt<w.length;Vt++){if(B.resolveDepthBuffer&&(B.depthBuffer&&(at|=i.DEPTH_BUFFER_BIT),B.stencilBuffer&&B.resolveStencilBuffer&&(at|=i.STENCIL_BUFFER_BIT)),_t){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,It.__webglColorRenderbuffer[Vt]);const dt=n.get(w[Vt]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,dt,0)}i.blitFramebuffer(0,0,H,et,0,0,H,et,at,i.NEAREST),l===!0&&(ot.length=0,ct.length=0,ot.push(i.COLOR_ATTACHMENT0+Vt),B.depthBuffer&&B.resolveDepthBuffer===!1&&(ot.push(Q),ct.push(Q),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,ct)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,ot))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),_t)for(let Vt=0;Vt<w.length;Vt++){e.bindFramebuffer(i.FRAMEBUFFER,It.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Vt,i.RENDERBUFFER,It.__webglColorRenderbuffer[Vt]);const dt=n.get(w[Vt]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,It.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Vt,i.TEXTURE_2D,dt,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,It.__webglMultisampledFramebuffer)}else if(B.depthBuffer&&B.resolveDepthBuffer===!1&&l){const w=B.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[w])}}}function C(B){return Math.min(s.maxSamples,B.samples)}function O(B){const w=n.get(B);return B.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&w.__useRenderToTexture!==!1}function pt(B){const w=o.render.frame;h.get(B)!==w&&(h.set(B,w),B.update())}function Bt(B,w){const H=B.colorSpace,et=B.format,at=B.type;return B.isCompressedTexture===!0||B.isVideoTexture===!0||H!==fr&&H!==ki&&(te.getTransfer(H)===oe?(et!==Wn||at!==_n)&&Gt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):ne("WebGLTextures: Unsupported texture color space:",H)),w}function wt(B){return typeof HTMLImageElement<"u"&&B instanceof HTMLImageElement?(c.width=B.naturalWidth||B.width,c.height=B.naturalHeight||B.height):typeof VideoFrame<"u"&&B instanceof VideoFrame?(c.width=B.displayWidth,c.height=B.displayHeight):(c.width=B.width,c.height=B.height),c}this.allocateTextureUnit=U,this.resetTextureUnits=I,this.setTexture2D=V,this.setTexture2DArray=G,this.setTexture3D=k,this.setTextureCube=X,this.rebindTextures=xt,this.setupRenderTarget=ut,this.updateRenderTargetMipmap=tt,this.updateMultisampleRenderTarget=bt,this.setupDepthRenderbuffer=rt,this.setupFrameBufferTexture=$,this.useMultisampledRTT=O,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function sS(i,t){function e(n,s=ki){let r;const o=te.getTransfer(s);if(n===_n)return i.UNSIGNED_BYTE;if(n===dh)return i.UNSIGNED_SHORT_4_4_4_4;if(n===fh)return i.UNSIGNED_SHORT_5_5_5_1;if(n===mf)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===gf)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===ff)return i.BYTE;if(n===pf)return i.SHORT;if(n===$r)return i.UNSIGNED_SHORT;if(n===uh)return i.INT;if(n===ii)return i.UNSIGNED_INT;if(n===Kn)return i.FLOAT;if(n===Ai)return i.HALF_FLOAT;if(n===xf)return i.ALPHA;if(n===_f)return i.RGB;if(n===Wn)return i.RGBA;if(n===wi)return i.DEPTH_COMPONENT;if(n===vs)return i.DEPTH_STENCIL;if(n===vf)return i.RED;if(n===ph)return i.RED_INTEGER;if(n===dr)return i.RG;if(n===mh)return i.RG_INTEGER;if(n===gh)return i.RGBA_INTEGER;if(n===fa||n===pa||n===ma||n===ga)if(o===oe)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===fa)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===pa)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===ma)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===ga)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===fa)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===pa)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===ma)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===ga)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===xc||n===_c||n===vc||n===yc)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===xc)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===_c)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===vc)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===yc)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Sc||n===bc||n===Mc||n===Ec||n===Ac||n===wc||n===Tc)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===Sc||n===bc)return o===oe?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Mc)return o===oe?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===Ec)return r.COMPRESSED_R11_EAC;if(n===Ac)return r.COMPRESSED_SIGNED_R11_EAC;if(n===wc)return r.COMPRESSED_RG11_EAC;if(n===Tc)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===Cc||n===Pc||n===Rc||n===Lc||n===Dc||n===Ic||n===Nc||n===Bc||n===Uc||n===Fc||n===Oc||n===kc||n===zc||n===Vc)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Cc)return o===oe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Pc)return o===oe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Rc)return o===oe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Lc)return o===oe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Dc)return o===oe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Ic)return o===oe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Nc)return o===oe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Bc)return o===oe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Uc)return o===oe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Fc)return o===oe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Oc)return o===oe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===kc)return o===oe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===zc)return o===oe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Vc)return o===oe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Gc||n===Hc||n===Wc)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===Gc)return o===oe?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Hc)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Wc)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Xc||n===Yc||n===qc||n===$c)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===Xc)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Yc)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===qc)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===$c)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Zr?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}const rS=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,oS=`
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

}`;class aS{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){const n=new Df(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,n=new si({vertexShader:rS,fragmentShader:oS,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new Sn(new Ba(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class lS extends Ts{constructor(t,e){super();const n=this;let s=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,u=null,d=null,f=null,g=null;const x=typeof XRWebGLBinding<"u",m=new aS,p={},y=e.getContextAttributes();let _=null,v=null;const S=[],E=[],M=new it;let T=null;const b=new Tn;b.viewport=new le;const A=new Tn;A.viewport=new le;const D=[b,A],I=new d0;let U=null,F=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(R){let P=S[R];return P===void 0&&(P=new ml,S[R]=P),P.getTargetRaySpace()},this.getControllerGrip=function(R){let P=S[R];return P===void 0&&(P=new ml,S[R]=P),P.getGripSpace()},this.getHand=function(R){let P=S[R];return P===void 0&&(P=new ml,S[R]=P),P.getHandSpace()};function V(R){const P=E.indexOf(R.inputSource);if(P===-1)return;const $=S[P];$!==void 0&&($.update(R.inputSource,R.frame,c||o),$.dispatchEvent({type:R.type,data:R.inputSource}))}function G(){s.removeEventListener("select",V),s.removeEventListener("selectstart",V),s.removeEventListener("selectend",V),s.removeEventListener("squeeze",V),s.removeEventListener("squeezestart",V),s.removeEventListener("squeezeend",V),s.removeEventListener("end",G),s.removeEventListener("inputsourceschange",k);for(let R=0;R<S.length;R++){const P=E[R];P!==null&&(E[R]=null,S[R].disconnect(P))}U=null,F=null,m.reset();for(const R in p)delete p[R];t.setRenderTarget(_),f=null,d=null,u=null,s=null,v=null,z.stop(),n.isPresenting=!1,t.setPixelRatio(T),t.setSize(M.width,M.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(R){r=R,n.isPresenting===!0&&Gt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(R){a=R,n.isPresenting===!0&&Gt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(R){c=R},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return u===null&&x&&(u=new XRWebGLBinding(s,e)),u},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(R){if(s=R,s!==null){if(_=t.getRenderTarget(),s.addEventListener("select",V),s.addEventListener("selectstart",V),s.addEventListener("selectend",V),s.addEventListener("squeeze",V),s.addEventListener("squeezestart",V),s.addEventListener("squeezeend",V),s.addEventListener("end",G),s.addEventListener("inputsourceschange",k),y.xrCompatible!==!0&&await e.makeXRCompatible(),T=t.getPixelRatio(),t.getSize(M),x&&"createProjectionLayer"in XRWebGLBinding.prototype){let $=null,nt=null,Y=null;y.depth&&(Y=y.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,$=y.stencil?vs:wi,nt=y.stencil?Zr:ii);const rt={colorFormat:e.RGBA8,depthFormat:Y,scaleFactor:r};u=this.getBinding(),d=u.createProjectionLayer(rt),s.updateRenderState({layers:[d]}),t.setPixelRatio(1),t.setSize(d.textureWidth,d.textureHeight,!1),v=new ei(d.textureWidth,d.textureHeight,{format:Wn,type:_n,depthTexture:new Jr(d.textureWidth,d.textureHeight,nt,void 0,void 0,void 0,void 0,void 0,void 0,$),stencilBuffer:y.stencil,colorSpace:t.outputColorSpace,samples:y.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{const $={antialias:y.antialias,alpha:!0,depth:y.depth,stencil:y.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,e,$),s.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),v=new ei(f.framebufferWidth,f.framebufferHeight,{format:Wn,type:_n,colorSpace:t.outputColorSpace,stencilBuffer:y.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}v.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),z.setContext(s),z.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function k(R){for(let P=0;P<R.removed.length;P++){const $=R.removed[P],nt=E.indexOf($);nt>=0&&(E[nt]=null,S[nt].disconnect($))}for(let P=0;P<R.added.length;P++){const $=R.added[P];let nt=E.indexOf($);if(nt===-1){for(let rt=0;rt<S.length;rt++)if(rt>=E.length){E.push($),nt=rt;break}else if(E[rt]===null){E[rt]=$,nt=rt;break}if(nt===-1)break}const Y=S[nt];Y&&Y.connect($)}}const X=new N,ht=new N;function st(R,P,$){X.setFromMatrixPosition(P.matrixWorld),ht.setFromMatrixPosition($.matrixWorld);const nt=X.distanceTo(ht),Y=P.projectionMatrix.elements,rt=$.projectionMatrix.elements,xt=Y[14]/(Y[10]-1),ut=Y[14]/(Y[10]+1),tt=(Y[9]+1)/Y[5],ot=(Y[9]-1)/Y[5],ct=(Y[8]-1)/Y[0],bt=(rt[8]+1)/rt[0],C=xt*ct,O=xt*bt,pt=nt/(-ct+bt),Bt=pt*-ct;if(P.matrixWorld.decompose(R.position,R.quaternion,R.scale),R.translateX(Bt),R.translateZ(pt),R.matrixWorld.compose(R.position,R.quaternion,R.scale),R.matrixWorldInverse.copy(R.matrixWorld).invert(),Y[10]===-1)R.projectionMatrix.copy(P.projectionMatrix),R.projectionMatrixInverse.copy(P.projectionMatrixInverse);else{const wt=xt+pt,B=ut+pt,w=C-Bt,H=O+(nt-Bt),et=tt*ut/B*wt,at=ot*ut/B*wt;R.projectionMatrix.makePerspective(w,H,et,at,wt,B),R.projectionMatrixInverse.copy(R.projectionMatrix).invert()}}function gt(R,P){P===null?R.matrixWorld.copy(R.matrix):R.matrixWorld.multiplyMatrices(P.matrixWorld,R.matrix),R.matrixWorldInverse.copy(R.matrixWorld).invert()}this.updateCamera=function(R){if(s===null)return;let P=R.near,$=R.far;m.texture!==null&&(m.depthNear>0&&(P=m.depthNear),m.depthFar>0&&($=m.depthFar)),I.near=A.near=b.near=P,I.far=A.far=b.far=$,(U!==I.near||F!==I.far)&&(s.updateRenderState({depthNear:I.near,depthFar:I.far}),U=I.near,F=I.far),I.layers.mask=R.layers.mask|6,b.layers.mask=I.layers.mask&3,A.layers.mask=I.layers.mask&5;const nt=R.parent,Y=I.cameras;gt(I,nt);for(let rt=0;rt<Y.length;rt++)gt(Y[rt],nt);Y.length===2?st(I,b,A):I.projectionMatrix.copy(b.projectionMatrix),Ot(R,I,nt)};function Ot(R,P,$){$===null?R.matrix.copy(P.matrixWorld):(R.matrix.copy($.matrixWorld),R.matrix.invert(),R.matrix.multiply(P.matrixWorld)),R.matrix.decompose(R.position,R.quaternion,R.scale),R.updateMatrixWorld(!0),R.projectionMatrix.copy(P.projectionMatrix),R.projectionMatrixInverse.copy(P.projectionMatrixInverse),R.isPerspectiveCamera&&(R.fov=Kr*2*Math.atan(1/R.projectionMatrix.elements[5]),R.zoom=1)}this.getCamera=function(){return I},this.getFoveation=function(){if(!(d===null&&f===null))return l},this.setFoveation=function(R){l=R,d!==null&&(d.fixedFoveation=R),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=R)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(I)},this.getCameraTexture=function(R){return p[R]};let Ht=null;function Z(R,P){if(h=P.getViewerPose(c||o),g=P,h!==null){const $=h.views;f!==null&&(t.setRenderTargetFramebuffer(v,f.framebuffer),t.setRenderTarget(v));let nt=!1;$.length!==I.cameras.length&&(I.cameras.length=0,nt=!0);for(let ut=0;ut<$.length;ut++){const tt=$[ut];let ot=null;if(f!==null)ot=f.getViewport(tt);else{const bt=u.getViewSubImage(d,tt);ot=bt.viewport,ut===0&&(t.setRenderTargetTextures(v,bt.colorTexture,bt.depthStencilTexture),t.setRenderTarget(v))}let ct=D[ut];ct===void 0&&(ct=new Tn,ct.layers.enable(ut),ct.viewport=new le,D[ut]=ct),ct.matrix.fromArray(tt.transform.matrix),ct.matrix.decompose(ct.position,ct.quaternion,ct.scale),ct.projectionMatrix.fromArray(tt.projectionMatrix),ct.projectionMatrixInverse.copy(ct.projectionMatrix).invert(),ct.viewport.set(ot.x,ot.y,ot.width,ot.height),ut===0&&(I.matrix.copy(ct.matrix),I.matrix.decompose(I.position,I.quaternion,I.scale)),nt===!0&&I.cameras.push(ct)}const Y=s.enabledFeatures;if(Y&&Y.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&x){u=n.getBinding();const ut=u.getDepthInformation($[0]);ut&&ut.isValid&&ut.texture&&m.init(ut,s.renderState)}if(Y&&Y.includes("camera-access")&&x){t.state.unbindTexture(),u=n.getBinding();for(let ut=0;ut<$.length;ut++){const tt=$[ut].camera;if(tt){let ot=p[tt];ot||(ot=new Df,p[tt]=ot);const ct=u.getCameraImage(tt);ot.sourceTexture=ct}}}}for(let $=0;$<S.length;$++){const nt=E[$],Y=S[$];nt!==null&&Y!==void 0&&Y.update(nt,P,c||o)}Ht&&Ht(R,P),P.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:P}),g=null}const z=new Vf;z.setAnimationLoop(Z),this.setAnimationLoop=function(R){Ht=R},this.dispose=function(){}}}const os=new yn,cS=new Zt;function hS(i,t){function e(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,Cf(i)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function s(m,p,y,_,v){p.isMeshBasicMaterial||p.isMeshLambertMaterial?r(m,p):p.isMeshToonMaterial?(r(m,p),u(m,p)):p.isMeshPhongMaterial?(r(m,p),h(m,p)):p.isMeshStandardMaterial?(r(m,p),d(m,p),p.isMeshPhysicalMaterial&&f(m,p,v)):p.isMeshMatcapMaterial?(r(m,p),g(m,p)):p.isMeshDepthMaterial?r(m,p):p.isMeshDistanceMaterial?(r(m,p),x(m,p)):p.isMeshNormalMaterial?r(m,p):p.isLineBasicMaterial?(o(m,p),p.isLineDashedMaterial&&a(m,p)):p.isPointsMaterial?l(m,p,y,_):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,e(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===nn&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,e(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===nn&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,e(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,e(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,e(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const y=t.get(p),_=y.envMap,v=y.envMapRotation;_&&(m.envMap.value=_,os.copy(v),os.x*=-1,os.y*=-1,os.z*=-1,_.isCubeTexture&&_.isRenderTargetTexture===!1&&(os.y*=-1,os.z*=-1),m.envMapRotation.value.setFromMatrix4(cS.makeRotationFromEuler(os)),m.flipEnvMap.value=_.isCubeTexture&&_.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,e(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,e(p.aoMap,m.aoMapTransform))}function o(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform))}function a(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,y,_){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*y,m.scale.value=_*.5,p.map&&(m.map.value=p.map,e(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function u(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function d(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,e(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,e(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function f(m,p,y){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,e(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,e(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,e(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,e(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,e(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===nn&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,e(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,e(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=y.texture,m.transmissionSamplerSize.value.set(y.width,y.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,e(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,e(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,e(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,e(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,e(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function x(m,p){const y=t.get(p).light;m.referencePosition.value.setFromMatrixPosition(y.matrixWorld),m.nearDistance.value=y.shadow.camera.near,m.farDistance.value=y.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function uS(i,t,e,n){let s={},r={},o=[];const a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(y,_){const v=_.program;n.uniformBlockBinding(y,v)}function c(y,_){let v=s[y.id];v===void 0&&(g(y),v=h(y),s[y.id]=v,y.addEventListener("dispose",m));const S=_.program;n.updateUBOMapping(y,S);const E=t.render.frame;r[y.id]!==E&&(d(y),r[y.id]=E)}function h(y){const _=u();y.__bindingPointIndex=_;const v=i.createBuffer(),S=y.__size,E=y.usage;return i.bindBuffer(i.UNIFORM_BUFFER,v),i.bufferData(i.UNIFORM_BUFFER,S,E),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,_,v),v}function u(){for(let y=0;y<a;y++)if(o.indexOf(y)===-1)return o.push(y),y;return ne("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(y){const _=s[y.id],v=y.uniforms,S=y.__cache;i.bindBuffer(i.UNIFORM_BUFFER,_);for(let E=0,M=v.length;E<M;E++){const T=Array.isArray(v[E])?v[E]:[v[E]];for(let b=0,A=T.length;b<A;b++){const D=T[b];if(f(D,E,b,S)===!0){const I=D.__offset,U=Array.isArray(D.value)?D.value:[D.value];let F=0;for(let V=0;V<U.length;V++){const G=U[V],k=x(G);typeof G=="number"||typeof G=="boolean"?(D.__data[0]=G,i.bufferSubData(i.UNIFORM_BUFFER,I+F,D.__data)):G.isMatrix3?(D.__data[0]=G.elements[0],D.__data[1]=G.elements[1],D.__data[2]=G.elements[2],D.__data[3]=0,D.__data[4]=G.elements[3],D.__data[5]=G.elements[4],D.__data[6]=G.elements[5],D.__data[7]=0,D.__data[8]=G.elements[6],D.__data[9]=G.elements[7],D.__data[10]=G.elements[8],D.__data[11]=0):(G.toArray(D.__data,F),F+=k.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,I,D.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(y,_,v,S){const E=y.value,M=_+"_"+v;if(S[M]===void 0)return typeof E=="number"||typeof E=="boolean"?S[M]=E:S[M]=E.clone(),!0;{const T=S[M];if(typeof E=="number"||typeof E=="boolean"){if(T!==E)return S[M]=E,!0}else if(T.equals(E)===!1)return T.copy(E),!0}return!1}function g(y){const _=y.uniforms;let v=0;const S=16;for(let M=0,T=_.length;M<T;M++){const b=Array.isArray(_[M])?_[M]:[_[M]];for(let A=0,D=b.length;A<D;A++){const I=b[A],U=Array.isArray(I.value)?I.value:[I.value];for(let F=0,V=U.length;F<V;F++){const G=U[F],k=x(G),X=v%S,ht=X%k.boundary,st=X+ht;v+=ht,st!==0&&S-st<k.storage&&(v+=S-st),I.__data=new Float32Array(k.storage/Float32Array.BYTES_PER_ELEMENT),I.__offset=v,v+=k.storage}}}const E=v%S;return E>0&&(v+=S-E),y.__size=v,y.__cache={},this}function x(y){const _={boundary:0,storage:0};return typeof y=="number"||typeof y=="boolean"?(_.boundary=4,_.storage=4):y.isVector2?(_.boundary=8,_.storage=8):y.isVector3||y.isColor?(_.boundary=16,_.storage=12):y.isVector4?(_.boundary=16,_.storage=16):y.isMatrix3?(_.boundary=48,_.storage=48):y.isMatrix4?(_.boundary=64,_.storage=64):y.isTexture?Gt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):Gt("WebGLRenderer: Unsupported uniform value type.",y),_}function m(y){const _=y.target;_.removeEventListener("dispose",m);const v=o.indexOf(_.__bindingPointIndex);o.splice(v,1),i.deleteBuffer(s[_.id]),delete s[_.id],delete r[_.id]}function p(){for(const y in s)i.deleteBuffer(s[y]);o=[],s={},r={}}return{bind:l,update:c,dispose:p}}const dS=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let Zn=null;function fS(){return Zn===null&&(Zn=new vg(dS,16,16,dr,Ai),Zn.name="DFG_LUT",Zn.minFilter=qe,Zn.magFilter=qe,Zn.wrapS=yi,Zn.wrapT=yi,Zn.generateMipmaps=!1,Zn.needsUpdate=!0),Zn}class pS{constructor(t={}){const{canvas:e=Rm(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=_n}=t;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=n.getContextAttributes().alpha}else g=o;const x=f,m=new Set([gh,mh,ph]),p=new Set([_n,ii,$r,Zr,dh,fh]),y=new Uint32Array(4),_=new Int32Array(4);let v=null,S=null;const E=[],M=[];let T=null;this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=ti,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const b=this;let A=!1;this._outputColorSpace=xn;let D=0,I=0,U=null,F=-1,V=null;const G=new le,k=new le;let X=null;const ht=new qt(0);let st=0,gt=e.width,Ot=e.height,Ht=1,Z=null,z=null;const R=new le(0,0,gt,Ot),P=new le(0,0,gt,Ot);let $=!1;const nt=new Sh;let Y=!1,rt=!1;const xt=new Zt,ut=new N,tt=new le,ot={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let ct=!1;function bt(){return U===null?Ht:1}let C=n;function O(L,q){return e.getContext(L,q)}try{const L={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${oo}`),e.addEventListener("webglcontextlost",$t,!1),e.addEventListener("webglcontextrestored",fe,!1),e.addEventListener("webglcontextcreationerror",se,!1),C===null){const q="webgl2";if(C=O(q,L),C===null)throw O(q)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(L){throw ne("WebGLRenderer: "+L.message),L}let pt,Bt,wt,B,w,H,et,at,Q,It,_t,Lt,Vt,dt,vt,Nt,Ut,St,Jt,W,Tt,mt,Pt,ft;function lt(){pt=new fv(C),pt.init(),mt=new sS(C,pt),Bt=new sv(C,pt,t,mt),wt=new nS(C,pt),Bt.reversedDepthBuffer&&d&&wt.buffers.depth.setReversed(!0),B=new gv(C),w=new Vy,H=new iS(C,pt,wt,w,Bt,mt,B),et=new ov(b),at=new dv(b),Q=new y0(C),Pt=new nv(C,Q),It=new pv(C,Q,B,Pt),_t=new _v(C,It,Q,B),Jt=new xv(C,Bt,H),Nt=new rv(w),Lt=new zy(b,et,at,pt,Bt,Pt,Nt),Vt=new hS(b,w),dt=new Hy,vt=new Zy(pt),St=new ev(b,et,at,wt,_t,g,l),Ut=new tS(b,_t,Bt),ft=new uS(C,B,Bt,wt),W=new iv(C,pt,B),Tt=new mv(C,pt,B),B.programs=Lt.programs,b.capabilities=Bt,b.extensions=pt,b.properties=w,b.renderLists=dt,b.shadowMap=Ut,b.state=wt,b.info=B}lt(),x!==_n&&(T=new yv(x,e.width,e.height,s,r));const yt=new lS(b,C);this.xr=yt,this.getContext=function(){return C},this.getContextAttributes=function(){return C.getContextAttributes()},this.forceContextLoss=function(){const L=pt.get("WEBGL_lose_context");L&&L.loseContext()},this.forceContextRestore=function(){const L=pt.get("WEBGL_lose_context");L&&L.restoreContext()},this.getPixelRatio=function(){return Ht},this.setPixelRatio=function(L){L!==void 0&&(Ht=L,this.setSize(gt,Ot,!1))},this.getSize=function(L){return L.set(gt,Ot)},this.setSize=function(L,q,J=!0){if(yt.isPresenting){Gt("WebGLRenderer: Can't change size while VR device is presenting.");return}gt=L,Ot=q,e.width=Math.floor(L*Ht),e.height=Math.floor(q*Ht),J===!0&&(e.style.width=L+"px",e.style.height=q+"px"),T!==null&&T.setSize(e.width,e.height),this.setViewport(0,0,L,q)},this.getDrawingBufferSize=function(L){return L.set(gt*Ht,Ot*Ht).floor()},this.setDrawingBufferSize=function(L,q,J){gt=L,Ot=q,Ht=J,e.width=Math.floor(L*J),e.height=Math.floor(q*J),this.setViewport(0,0,L,q)},this.setEffects=function(L){if(x===_n){console.error("THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(L){for(let q=0;q<L.length;q++)if(L[q].isOutputPass===!0){console.warn("THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}T.setEffects(L||[])},this.getCurrentViewport=function(L){return L.copy(G)},this.getViewport=function(L){return L.copy(R)},this.setViewport=function(L,q,J,K){L.isVector4?R.set(L.x,L.y,L.z,L.w):R.set(L,q,J,K),wt.viewport(G.copy(R).multiplyScalar(Ht).round())},this.getScissor=function(L){return L.copy(P)},this.setScissor=function(L,q,J,K){L.isVector4?P.set(L.x,L.y,L.z,L.w):P.set(L,q,J,K),wt.scissor(k.copy(P).multiplyScalar(Ht).round())},this.getScissorTest=function(){return $},this.setScissorTest=function(L){wt.setScissorTest($=L)},this.setOpaqueSort=function(L){Z=L},this.setTransparentSort=function(L){z=L},this.getClearColor=function(L){return L.copy(St.getClearColor())},this.setClearColor=function(){St.setClearColor(...arguments)},this.getClearAlpha=function(){return St.getClearAlpha()},this.setClearAlpha=function(){St.setClearAlpha(...arguments)},this.clear=function(L=!0,q=!0,J=!0){let K=0;if(L){let j=!1;if(U!==null){const Mt=U.texture.format;j=m.has(Mt)}if(j){const Mt=U.texture.type,Rt=p.has(Mt),At=St.getClearColor(),Dt=St.getClearAlpha(),Ft=At.r,Wt=At.g,kt=At.b;Rt?(y[0]=Ft,y[1]=Wt,y[2]=kt,y[3]=Dt,C.clearBufferuiv(C.COLOR,0,y)):(_[0]=Ft,_[1]=Wt,_[2]=kt,_[3]=Dt,C.clearBufferiv(C.COLOR,0,_))}else K|=C.COLOR_BUFFER_BIT}q&&(K|=C.DEPTH_BUFFER_BIT),J&&(K|=C.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),C.clear(K)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",$t,!1),e.removeEventListener("webglcontextrestored",fe,!1),e.removeEventListener("webglcontextcreationerror",se,!1),St.dispose(),dt.dispose(),vt.dispose(),w.dispose(),et.dispose(),at.dispose(),_t.dispose(),Pt.dispose(),ft.dispose(),Lt.dispose(),yt.dispose(),yt.removeEventListener("sessionstart",kh),yt.removeEventListener("sessionend",zh),Ji.stop()};function $t(L){L.preventDefault(),au("WebGLRenderer: Context Lost."),A=!0}function fe(){au("WebGLRenderer: Context Restored."),A=!1;const L=B.autoReset,q=Ut.enabled,J=Ut.autoUpdate,K=Ut.needsUpdate,j=Ut.type;lt(),B.autoReset=L,Ut.enabled=q,Ut.autoUpdate=J,Ut.needsUpdate=K,Ut.type=j}function se(L){ne("WebGLRenderer: A WebGL context could not be created. Reason: ",L.statusMessage)}function $n(L){const q=L.target;q.removeEventListener("dispose",$n),oi(q)}function oi(L){gp(L),w.remove(L)}function gp(L){const q=w.get(L).programs;q!==void 0&&(q.forEach(function(J){Lt.releaseProgram(J)}),L.isShaderMaterial&&Lt.releaseShaderCache(L))}this.renderBufferDirect=function(L,q,J,K,j,Mt){q===null&&(q=ot);const Rt=j.isMesh&&j.matrixWorld.determinant()<0,At=_p(L,q,J,K,j);wt.setMaterial(K,Rt);let Dt=J.index,Ft=1;if(K.wireframe===!0){if(Dt=It.getWireframeAttribute(J),Dt===void 0)return;Ft=2}const Wt=J.drawRange,kt=J.attributes.position;let Qt=Wt.start*Ft,ce=(Wt.start+Wt.count)*Ft;Mt!==null&&(Qt=Math.max(Qt,Mt.start*Ft),ce=Math.min(ce,(Mt.start+Mt.count)*Ft)),Dt!==null?(Qt=Math.max(Qt,0),ce=Math.min(ce,Dt.count)):kt!=null&&(Qt=Math.max(Qt,0),ce=Math.min(ce,kt.count));const _e=ce-Qt;if(_e<0||_e===1/0)return;Pt.setup(j,K,At,J,Dt);let ve,ue=W;if(Dt!==null&&(ve=Q.get(Dt),ue=Tt,ue.setIndex(ve)),j.isMesh)K.wireframe===!0?(wt.setLineWidth(K.wireframeLinewidth*bt()),ue.setMode(C.LINES)):ue.setMode(C.TRIANGLES);else if(j.isLine){let zt=K.linewidth;zt===void 0&&(zt=1),wt.setLineWidth(zt*bt()),j.isLineSegments?ue.setMode(C.LINES):j.isLineLoop?ue.setMode(C.LINE_LOOP):ue.setMode(C.LINE_STRIP)}else j.isPoints?ue.setMode(C.POINTS):j.isSprite&&ue.setMode(C.TRIANGLES);if(j.isBatchedMesh)if(j._multiDrawInstances!==null)jr("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),ue.renderMultiDrawInstances(j._multiDrawStarts,j._multiDrawCounts,j._multiDrawCount,j._multiDrawInstances);else if(pt.get("WEBGL_multi_draw"))ue.renderMultiDraw(j._multiDrawStarts,j._multiDrawCounts,j._multiDrawCount);else{const zt=j._multiDrawStarts,re=j._multiDrawCounts,ee=j._multiDrawCount,fn=Dt?Q.get(Dt).bytesPerElement:1,Rs=w.get(K).currentProgram.getUniforms();for(let pn=0;pn<ee;pn++)Rs.setValue(C,"_gl_DrawID",pn),ue.render(zt[pn]/fn,re[pn])}else if(j.isInstancedMesh)ue.renderInstances(Qt,_e,j.count);else if(J.isInstancedBufferGeometry){const zt=J._maxInstanceCount!==void 0?J._maxInstanceCount:1/0,re=Math.min(J.instanceCount,zt);ue.renderInstances(Qt,_e,re)}else ue.render(Qt,_e)};function Oh(L,q,J){L.transparent===!0&&L.side===Cn&&L.forceSinglePass===!1?(L.side=nn,L.needsUpdate=!0,co(L,q,J),L.side=Dn,L.needsUpdate=!0,co(L,q,J),L.side=Cn):co(L,q,J)}this.compile=function(L,q,J=null){J===null&&(J=L),S=vt.get(J),S.init(q),M.push(S),J.traverseVisible(function(j){j.isLight&&j.layers.test(q.layers)&&(S.pushLight(j),j.castShadow&&S.pushShadow(j))}),L!==J&&L.traverseVisible(function(j){j.isLight&&j.layers.test(q.layers)&&(S.pushLight(j),j.castShadow&&S.pushShadow(j))}),S.setupLights();const K=new Set;return L.traverse(function(j){if(!(j.isMesh||j.isPoints||j.isLine||j.isSprite))return;const Mt=j.material;if(Mt)if(Array.isArray(Mt))for(let Rt=0;Rt<Mt.length;Rt++){const At=Mt[Rt];Oh(At,J,j),K.add(At)}else Oh(Mt,J,j),K.add(Mt)}),S=M.pop(),K},this.compileAsync=function(L,q,J=null){const K=this.compile(L,q,J);return new Promise(j=>{function Mt(){if(K.forEach(function(Rt){w.get(Rt).currentProgram.isReady()&&K.delete(Rt)}),K.size===0){j(L);return}setTimeout(Mt,10)}pt.get("KHR_parallel_shader_compile")!==null?Mt():setTimeout(Mt,10)})};let Ha=null;function xp(L){Ha&&Ha(L)}function kh(){Ji.stop()}function zh(){Ji.start()}const Ji=new Vf;Ji.setAnimationLoop(xp),typeof self<"u"&&Ji.setContext(self),this.setAnimationLoop=function(L){Ha=L,yt.setAnimationLoop(L),L===null?Ji.stop():Ji.start()},yt.addEventListener("sessionstart",kh),yt.addEventListener("sessionend",zh),this.render=function(L,q){if(q!==void 0&&q.isCamera!==!0){ne("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(A===!0)return;const J=yt.enabled===!0&&yt.isPresenting===!0,K=T!==null&&(U===null||J)&&T.begin(b,U);if(L.matrixWorldAutoUpdate===!0&&L.updateMatrixWorld(),q.parent===null&&q.matrixWorldAutoUpdate===!0&&q.updateMatrixWorld(),yt.enabled===!0&&yt.isPresenting===!0&&(T===null||T.isCompositing()===!1)&&(yt.cameraAutoUpdate===!0&&yt.updateCamera(q),q=yt.getCamera()),L.isScene===!0&&L.onBeforeRender(b,L,q,U),S=vt.get(L,M.length),S.init(q),M.push(S),xt.multiplyMatrices(q.projectionMatrix,q.matrixWorldInverse),nt.setFromProjectionMatrix(xt,Jn,q.reversedDepth),rt=this.localClippingEnabled,Y=Nt.init(this.clippingPlanes,rt),v=dt.get(L,E.length),v.init(),E.push(v),yt.enabled===!0&&yt.isPresenting===!0){const Rt=b.xr.getDepthSensingMesh();Rt!==null&&Wa(Rt,q,-1/0,b.sortObjects)}Wa(L,q,0,b.sortObjects),v.finish(),b.sortObjects===!0&&v.sort(Z,z),ct=yt.enabled===!1||yt.isPresenting===!1||yt.hasDepthSensing()===!1,ct&&St.addToRenderList(v,L),this.info.render.frame++,Y===!0&&Nt.beginShadows();const j=S.state.shadowsArray;if(Ut.render(j,L,q),Y===!0&&Nt.endShadows(),this.info.autoReset===!0&&this.info.reset(),(K&&T.hasRenderPass())===!1){const Rt=v.opaque,At=v.transmissive;if(S.setupLights(),q.isArrayCamera){const Dt=q.cameras;if(At.length>0)for(let Ft=0,Wt=Dt.length;Ft<Wt;Ft++){const kt=Dt[Ft];Gh(Rt,At,L,kt)}ct&&St.render(L);for(let Ft=0,Wt=Dt.length;Ft<Wt;Ft++){const kt=Dt[Ft];Vh(v,L,kt,kt.viewport)}}else At.length>0&&Gh(Rt,At,L,q),ct&&St.render(L),Vh(v,L,q)}U!==null&&I===0&&(H.updateMultisampleRenderTarget(U),H.updateRenderTargetMipmap(U)),K&&T.end(b),L.isScene===!0&&L.onAfterRender(b,L,q),Pt.resetDefaultState(),F=-1,V=null,M.pop(),M.length>0?(S=M[M.length-1],Y===!0&&Nt.setGlobalState(b.clippingPlanes,S.state.camera)):S=null,E.pop(),E.length>0?v=E[E.length-1]:v=null};function Wa(L,q,J,K){if(L.visible===!1)return;if(L.layers.test(q.layers)){if(L.isGroup)J=L.renderOrder;else if(L.isLOD)L.autoUpdate===!0&&L.update(q);else if(L.isLight)S.pushLight(L),L.castShadow&&S.pushShadow(L);else if(L.isSprite){if(!L.frustumCulled||nt.intersectsSprite(L)){K&&tt.setFromMatrixPosition(L.matrixWorld).applyMatrix4(xt);const Rt=_t.update(L),At=L.material;At.visible&&v.push(L,Rt,At,J,tt.z,null)}}else if((L.isMesh||L.isLine||L.isPoints)&&(!L.frustumCulled||nt.intersectsObject(L))){const Rt=_t.update(L),At=L.material;if(K&&(L.boundingSphere!==void 0?(L.boundingSphere===null&&L.computeBoundingSphere(),tt.copy(L.boundingSphere.center)):(Rt.boundingSphere===null&&Rt.computeBoundingSphere(),tt.copy(Rt.boundingSphere.center)),tt.applyMatrix4(L.matrixWorld).applyMatrix4(xt)),Array.isArray(At)){const Dt=Rt.groups;for(let Ft=0,Wt=Dt.length;Ft<Wt;Ft++){const kt=Dt[Ft],Qt=At[kt.materialIndex];Qt&&Qt.visible&&v.push(L,Rt,Qt,J,tt.z,kt)}}else At.visible&&v.push(L,Rt,At,J,tt.z,null)}}const Mt=L.children;for(let Rt=0,At=Mt.length;Rt<At;Rt++)Wa(Mt[Rt],q,J,K)}function Vh(L,q,J,K){const{opaque:j,transmissive:Mt,transparent:Rt}=L;S.setupLightsView(J),Y===!0&&Nt.setGlobalState(b.clippingPlanes,J),K&&wt.viewport(G.copy(K)),j.length>0&&lo(j,q,J),Mt.length>0&&lo(Mt,q,J),Rt.length>0&&lo(Rt,q,J),wt.buffers.depth.setTest(!0),wt.buffers.depth.setMask(!0),wt.buffers.color.setMask(!0),wt.setPolygonOffset(!1)}function Gh(L,q,J,K){if((J.isScene===!0?J.overrideMaterial:null)!==null)return;if(S.state.transmissionRenderTarget[K.id]===void 0){const Qt=pt.has("EXT_color_buffer_half_float")||pt.has("EXT_color_buffer_float");S.state.transmissionRenderTarget[K.id]=new ei(1,1,{generateMipmaps:!0,type:Qt?Ai:_n,minFilter:_s,samples:Bt.samples,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:te.workingColorSpace})}const Mt=S.state.transmissionRenderTarget[K.id],Rt=K.viewport||G;Mt.setSize(Rt.z*b.transmissionResolutionScale,Rt.w*b.transmissionResolutionScale);const At=b.getRenderTarget(),Dt=b.getActiveCubeFace(),Ft=b.getActiveMipmapLevel();b.setRenderTarget(Mt),b.getClearColor(ht),st=b.getClearAlpha(),st<1&&b.setClearColor(16777215,.5),b.clear(),ct&&St.render(J);const Wt=b.toneMapping;b.toneMapping=ti;const kt=K.viewport;if(K.viewport!==void 0&&(K.viewport=void 0),S.setupLightsView(K),Y===!0&&Nt.setGlobalState(b.clippingPlanes,K),lo(L,J,K),H.updateMultisampleRenderTarget(Mt),H.updateRenderTargetMipmap(Mt),pt.has("WEBGL_multisampled_render_to_texture")===!1){let Qt=!1;for(let ce=0,_e=q.length;ce<_e;ce++){const ve=q[ce],{object:ue,geometry:zt,material:re,group:ee}=ve;if(re.side===Cn&&ue.layers.test(K.layers)){const fn=re.side;re.side=nn,re.needsUpdate=!0,Hh(ue,J,K,zt,re,ee),re.side=fn,re.needsUpdate=!0,Qt=!0}}Qt===!0&&(H.updateMultisampleRenderTarget(Mt),H.updateRenderTargetMipmap(Mt))}b.setRenderTarget(At,Dt,Ft),b.setClearColor(ht,st),kt!==void 0&&(K.viewport=kt),b.toneMapping=Wt}function lo(L,q,J){const K=q.isScene===!0?q.overrideMaterial:null;for(let j=0,Mt=L.length;j<Mt;j++){const Rt=L[j],{object:At,geometry:Dt,group:Ft}=Rt;let Wt=Rt.material;Wt.allowOverride===!0&&K!==null&&(Wt=K),At.layers.test(J.layers)&&Hh(At,q,J,Dt,Wt,Ft)}}function Hh(L,q,J,K,j,Mt){L.onBeforeRender(b,q,J,K,j,Mt),L.modelViewMatrix.multiplyMatrices(J.matrixWorldInverse,L.matrixWorld),L.normalMatrix.getNormalMatrix(L.modelViewMatrix),j.onBeforeRender(b,q,J,K,L,Mt),j.transparent===!0&&j.side===Cn&&j.forceSinglePass===!1?(j.side=nn,j.needsUpdate=!0,b.renderBufferDirect(J,q,K,j,L,Mt),j.side=Dn,j.needsUpdate=!0,b.renderBufferDirect(J,q,K,j,L,Mt),j.side=Cn):b.renderBufferDirect(J,q,K,j,L,Mt),L.onAfterRender(b,q,J,K,j,Mt)}function co(L,q,J){q.isScene!==!0&&(q=ot);const K=w.get(L),j=S.state.lights,Mt=S.state.shadowsArray,Rt=j.state.version,At=Lt.getParameters(L,j.state,Mt,q,J),Dt=Lt.getProgramCacheKey(At);let Ft=K.programs;K.environment=L.isMeshStandardMaterial?q.environment:null,K.fog=q.fog,K.envMap=(L.isMeshStandardMaterial?at:et).get(L.envMap||K.environment),K.envMapRotation=K.environment!==null&&L.envMap===null?q.environmentRotation:L.envMapRotation,Ft===void 0&&(L.addEventListener("dispose",$n),Ft=new Map,K.programs=Ft);let Wt=Ft.get(Dt);if(Wt!==void 0){if(K.currentProgram===Wt&&K.lightsStateVersion===Rt)return Xh(L,At),Wt}else At.uniforms=Lt.getUniforms(L),L.onBeforeCompile(At,b),Wt=Lt.acquireProgram(At,Dt),Ft.set(Dt,Wt),K.uniforms=At.uniforms;const kt=K.uniforms;return(!L.isShaderMaterial&&!L.isRawShaderMaterial||L.clipping===!0)&&(kt.clippingPlanes=Nt.uniform),Xh(L,At),K.needsLights=yp(L),K.lightsStateVersion=Rt,K.needsLights&&(kt.ambientLightColor.value=j.state.ambient,kt.lightProbe.value=j.state.probe,kt.directionalLights.value=j.state.directional,kt.directionalLightShadows.value=j.state.directionalShadow,kt.spotLights.value=j.state.spot,kt.spotLightShadows.value=j.state.spotShadow,kt.rectAreaLights.value=j.state.rectArea,kt.ltc_1.value=j.state.rectAreaLTC1,kt.ltc_2.value=j.state.rectAreaLTC2,kt.pointLights.value=j.state.point,kt.pointLightShadows.value=j.state.pointShadow,kt.hemisphereLights.value=j.state.hemi,kt.directionalShadowMap.value=j.state.directionalShadowMap,kt.directionalShadowMatrix.value=j.state.directionalShadowMatrix,kt.spotShadowMap.value=j.state.spotShadowMap,kt.spotLightMatrix.value=j.state.spotLightMatrix,kt.spotLightMap.value=j.state.spotLightMap,kt.pointShadowMap.value=j.state.pointShadowMap,kt.pointShadowMatrix.value=j.state.pointShadowMatrix),K.currentProgram=Wt,K.uniformsList=null,Wt}function Wh(L){if(L.uniformsList===null){const q=L.currentProgram.getUniforms();L.uniformsList=xa.seqWithValue(q.seq,L.uniforms)}return L.uniformsList}function Xh(L,q){const J=w.get(L);J.outputColorSpace=q.outputColorSpace,J.batching=q.batching,J.batchingColor=q.batchingColor,J.instancing=q.instancing,J.instancingColor=q.instancingColor,J.instancingMorph=q.instancingMorph,J.skinning=q.skinning,J.morphTargets=q.morphTargets,J.morphNormals=q.morphNormals,J.morphColors=q.morphColors,J.morphTargetsCount=q.morphTargetsCount,J.numClippingPlanes=q.numClippingPlanes,J.numIntersection=q.numClipIntersection,J.vertexAlphas=q.vertexAlphas,J.vertexTangents=q.vertexTangents,J.toneMapping=q.toneMapping}function _p(L,q,J,K,j){q.isScene!==!0&&(q=ot),H.resetTextureUnits();const Mt=q.fog,Rt=K.isMeshStandardMaterial?q.environment:null,At=U===null?b.outputColorSpace:U.isXRRenderTarget===!0?U.texture.colorSpace:fr,Dt=(K.isMeshStandardMaterial?at:et).get(K.envMap||Rt),Ft=K.vertexColors===!0&&!!J.attributes.color&&J.attributes.color.itemSize===4,Wt=!!J.attributes.tangent&&(!!K.normalMap||K.anisotropy>0),kt=!!J.morphAttributes.position,Qt=!!J.morphAttributes.normal,ce=!!J.morphAttributes.color;let _e=ti;K.toneMapped&&(U===null||U.isXRRenderTarget===!0)&&(_e=b.toneMapping);const ve=J.morphAttributes.position||J.morphAttributes.normal||J.morphAttributes.color,ue=ve!==void 0?ve.length:0,zt=w.get(K),re=S.state.lights;if(Y===!0&&(rt===!0||L!==V)){const je=L===V&&K.id===F;Nt.setState(K,L,je)}let ee=!1;K.version===zt.__version?(zt.needsLights&&zt.lightsStateVersion!==re.state.version||zt.outputColorSpace!==At||j.isBatchedMesh&&zt.batching===!1||!j.isBatchedMesh&&zt.batching===!0||j.isBatchedMesh&&zt.batchingColor===!0&&j.colorTexture===null||j.isBatchedMesh&&zt.batchingColor===!1&&j.colorTexture!==null||j.isInstancedMesh&&zt.instancing===!1||!j.isInstancedMesh&&zt.instancing===!0||j.isSkinnedMesh&&zt.skinning===!1||!j.isSkinnedMesh&&zt.skinning===!0||j.isInstancedMesh&&zt.instancingColor===!0&&j.instanceColor===null||j.isInstancedMesh&&zt.instancingColor===!1&&j.instanceColor!==null||j.isInstancedMesh&&zt.instancingMorph===!0&&j.morphTexture===null||j.isInstancedMesh&&zt.instancingMorph===!1&&j.morphTexture!==null||zt.envMap!==Dt||K.fog===!0&&zt.fog!==Mt||zt.numClippingPlanes!==void 0&&(zt.numClippingPlanes!==Nt.numPlanes||zt.numIntersection!==Nt.numIntersection)||zt.vertexAlphas!==Ft||zt.vertexTangents!==Wt||zt.morphTargets!==kt||zt.morphNormals!==Qt||zt.morphColors!==ce||zt.toneMapping!==_e||zt.morphTargetsCount!==ue)&&(ee=!0):(ee=!0,zt.__version=K.version);let fn=zt.currentProgram;ee===!0&&(fn=co(K,q,j));let Rs=!1,pn=!1,Sr=!1;const pe=fn.getUniforms(),on=zt.uniforms;if(wt.useProgram(fn.program)&&(Rs=!0,pn=!0,Sr=!0),K.id!==F&&(F=K.id,pn=!0),Rs||V!==L){wt.buffers.depth.getReversed()&&L.reversedDepth!==!0&&(L._reversedDepth=!0,L.updateProjectionMatrix()),pe.setValue(C,"projectionMatrix",L.projectionMatrix),pe.setValue(C,"viewMatrix",L.matrixWorldInverse);const an=pe.map.cameraPosition;an!==void 0&&an.setValue(C,ut.setFromMatrixPosition(L.matrixWorld)),Bt.logarithmicDepthBuffer&&pe.setValue(C,"logDepthBufFC",2/(Math.log(L.far+1)/Math.LN2)),(K.isMeshPhongMaterial||K.isMeshToonMaterial||K.isMeshLambertMaterial||K.isMeshBasicMaterial||K.isMeshStandardMaterial||K.isShaderMaterial)&&pe.setValue(C,"isOrthographic",L.isOrthographicCamera===!0),V!==L&&(V=L,pn=!0,Sr=!0)}if(zt.needsLights&&(re.state.directionalShadowMap.length>0&&pe.setValue(C,"directionalShadowMap",re.state.directionalShadowMap,H),re.state.spotShadowMap.length>0&&pe.setValue(C,"spotShadowMap",re.state.spotShadowMap,H),re.state.pointShadowMap.length>0&&pe.setValue(C,"pointShadowMap",re.state.pointShadowMap,H)),j.isSkinnedMesh){pe.setOptional(C,j,"bindMatrix"),pe.setOptional(C,j,"bindMatrixInverse");const je=j.skeleton;je&&(je.boneTexture===null&&je.computeBoneTexture(),pe.setValue(C,"boneTexture",je.boneTexture,H))}j.isBatchedMesh&&(pe.setOptional(C,j,"batchingTexture"),pe.setValue(C,"batchingTexture",j._matricesTexture,H),pe.setOptional(C,j,"batchingIdTexture"),pe.setValue(C,"batchingIdTexture",j._indirectTexture,H),pe.setOptional(C,j,"batchingColorTexture"),j._colorsTexture!==null&&pe.setValue(C,"batchingColorTexture",j._colorsTexture,H));const bn=J.morphAttributes;if((bn.position!==void 0||bn.normal!==void 0||bn.color!==void 0)&&Jt.update(j,J,fn),(pn||zt.receiveShadow!==j.receiveShadow)&&(zt.receiveShadow=j.receiveShadow,pe.setValue(C,"receiveShadow",j.receiveShadow)),K.isMeshGouraudMaterial&&K.envMap!==null&&(on.envMap.value=Dt,on.flipEnvMap.value=Dt.isCubeTexture&&Dt.isRenderTargetTexture===!1?-1:1),K.isMeshStandardMaterial&&K.envMap===null&&q.environment!==null&&(on.envMapIntensity.value=q.environmentIntensity),on.dfgLUT!==void 0&&(on.dfgLUT.value=fS()),pn&&(pe.setValue(C,"toneMappingExposure",b.toneMappingExposure),zt.needsLights&&vp(on,Sr),Mt&&K.fog===!0&&Vt.refreshFogUniforms(on,Mt),Vt.refreshMaterialUniforms(on,K,Ht,Ot,S.state.transmissionRenderTarget[L.id]),xa.upload(C,Wh(zt),on,H)),K.isShaderMaterial&&K.uniformsNeedUpdate===!0&&(xa.upload(C,Wh(zt),on,H),K.uniformsNeedUpdate=!1),K.isSpriteMaterial&&pe.setValue(C,"center",j.center),pe.setValue(C,"modelViewMatrix",j.modelViewMatrix),pe.setValue(C,"normalMatrix",j.normalMatrix),pe.setValue(C,"modelMatrix",j.matrixWorld),K.isShaderMaterial||K.isRawShaderMaterial){const je=K.uniformsGroups;for(let an=0,Xa=je.length;an<Xa;an++){const Qi=je[an];ft.update(Qi,fn),ft.bind(Qi,fn)}}return fn}function vp(L,q){L.ambientLightColor.needsUpdate=q,L.lightProbe.needsUpdate=q,L.directionalLights.needsUpdate=q,L.directionalLightShadows.needsUpdate=q,L.pointLights.needsUpdate=q,L.pointLightShadows.needsUpdate=q,L.spotLights.needsUpdate=q,L.spotLightShadows.needsUpdate=q,L.rectAreaLights.needsUpdate=q,L.hemisphereLights.needsUpdate=q}function yp(L){return L.isMeshLambertMaterial||L.isMeshToonMaterial||L.isMeshPhongMaterial||L.isMeshStandardMaterial||L.isShadowMaterial||L.isShaderMaterial&&L.lights===!0}this.getActiveCubeFace=function(){return D},this.getActiveMipmapLevel=function(){return I},this.getRenderTarget=function(){return U},this.setRenderTargetTextures=function(L,q,J){const K=w.get(L);K.__autoAllocateDepthBuffer=L.resolveDepthBuffer===!1,K.__autoAllocateDepthBuffer===!1&&(K.__useRenderToTexture=!1),w.get(L.texture).__webglTexture=q,w.get(L.depthTexture).__webglTexture=K.__autoAllocateDepthBuffer?void 0:J,K.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(L,q){const J=w.get(L);J.__webglFramebuffer=q,J.__useDefaultFramebuffer=q===void 0};const Sp=C.createFramebuffer();this.setRenderTarget=function(L,q=0,J=0){U=L,D=q,I=J;let K=null,j=!1,Mt=!1;if(L){const At=w.get(L);if(At.__useDefaultFramebuffer!==void 0){wt.bindFramebuffer(C.FRAMEBUFFER,At.__webglFramebuffer),G.copy(L.viewport),k.copy(L.scissor),X=L.scissorTest,wt.viewport(G),wt.scissor(k),wt.setScissorTest(X),F=-1;return}else if(At.__webglFramebuffer===void 0)H.setupRenderTarget(L);else if(At.__hasExternalTextures)H.rebindTextures(L,w.get(L.texture).__webglTexture,w.get(L.depthTexture).__webglTexture);else if(L.depthBuffer){const Wt=L.depthTexture;if(At.__boundDepthTexture!==Wt){if(Wt!==null&&w.has(Wt)&&(L.width!==Wt.image.width||L.height!==Wt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");H.setupDepthRenderbuffer(L)}}const Dt=L.texture;(Dt.isData3DTexture||Dt.isDataArrayTexture||Dt.isCompressedArrayTexture)&&(Mt=!0);const Ft=w.get(L).__webglFramebuffer;L.isWebGLCubeRenderTarget?(Array.isArray(Ft[q])?K=Ft[q][J]:K=Ft[q],j=!0):L.samples>0&&H.useMultisampledRTT(L)===!1?K=w.get(L).__webglMultisampledFramebuffer:Array.isArray(Ft)?K=Ft[J]:K=Ft,G.copy(L.viewport),k.copy(L.scissor),X=L.scissorTest}else G.copy(R).multiplyScalar(Ht).floor(),k.copy(P).multiplyScalar(Ht).floor(),X=$;if(J!==0&&(K=Sp),wt.bindFramebuffer(C.FRAMEBUFFER,K)&&wt.drawBuffers(L,K),wt.viewport(G),wt.scissor(k),wt.setScissorTest(X),j){const At=w.get(L.texture);C.framebufferTexture2D(C.FRAMEBUFFER,C.COLOR_ATTACHMENT0,C.TEXTURE_CUBE_MAP_POSITIVE_X+q,At.__webglTexture,J)}else if(Mt){const At=q;for(let Dt=0;Dt<L.textures.length;Dt++){const Ft=w.get(L.textures[Dt]);C.framebufferTextureLayer(C.FRAMEBUFFER,C.COLOR_ATTACHMENT0+Dt,Ft.__webglTexture,J,At)}}else if(L!==null&&J!==0){const At=w.get(L.texture);C.framebufferTexture2D(C.FRAMEBUFFER,C.COLOR_ATTACHMENT0,C.TEXTURE_2D,At.__webglTexture,J)}F=-1},this.readRenderTargetPixels=function(L,q,J,K,j,Mt,Rt,At=0){if(!(L&&L.isWebGLRenderTarget)){ne("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Dt=w.get(L).__webglFramebuffer;if(L.isWebGLCubeRenderTarget&&Rt!==void 0&&(Dt=Dt[Rt]),Dt){wt.bindFramebuffer(C.FRAMEBUFFER,Dt);try{const Ft=L.textures[At],Wt=Ft.format,kt=Ft.type;if(!Bt.textureFormatReadable(Wt)){ne("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Bt.textureTypeReadable(kt)){ne("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}q>=0&&q<=L.width-K&&J>=0&&J<=L.height-j&&(L.textures.length>1&&C.readBuffer(C.COLOR_ATTACHMENT0+At),C.readPixels(q,J,K,j,mt.convert(Wt),mt.convert(kt),Mt))}finally{const Ft=U!==null?w.get(U).__webglFramebuffer:null;wt.bindFramebuffer(C.FRAMEBUFFER,Ft)}}},this.readRenderTargetPixelsAsync=async function(L,q,J,K,j,Mt,Rt,At=0){if(!(L&&L.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Dt=w.get(L).__webglFramebuffer;if(L.isWebGLCubeRenderTarget&&Rt!==void 0&&(Dt=Dt[Rt]),Dt)if(q>=0&&q<=L.width-K&&J>=0&&J<=L.height-j){wt.bindFramebuffer(C.FRAMEBUFFER,Dt);const Ft=L.textures[At],Wt=Ft.format,kt=Ft.type;if(!Bt.textureFormatReadable(Wt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Bt.textureTypeReadable(kt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Qt=C.createBuffer();C.bindBuffer(C.PIXEL_PACK_BUFFER,Qt),C.bufferData(C.PIXEL_PACK_BUFFER,Mt.byteLength,C.STREAM_READ),L.textures.length>1&&C.readBuffer(C.COLOR_ATTACHMENT0+At),C.readPixels(q,J,K,j,mt.convert(Wt),mt.convert(kt),0);const ce=U!==null?w.get(U).__webglFramebuffer:null;wt.bindFramebuffer(C.FRAMEBUFFER,ce);const _e=C.fenceSync(C.SYNC_GPU_COMMANDS_COMPLETE,0);return C.flush(),await Lm(C,_e,4),C.bindBuffer(C.PIXEL_PACK_BUFFER,Qt),C.getBufferSubData(C.PIXEL_PACK_BUFFER,0,Mt),C.deleteBuffer(Qt),C.deleteSync(_e),Mt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(L,q=null,J=0){const K=Math.pow(2,-J),j=Math.floor(L.image.width*K),Mt=Math.floor(L.image.height*K),Rt=q!==null?q.x:0,At=q!==null?q.y:0;H.setTexture2D(L,0),C.copyTexSubImage2D(C.TEXTURE_2D,J,0,0,Rt,At,j,Mt),wt.unbindTexture()};const bp=C.createFramebuffer(),Mp=C.createFramebuffer();this.copyTextureToTexture=function(L,q,J=null,K=null,j=0,Mt=null){Mt===null&&(j!==0?(jr("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),Mt=j,j=0):Mt=0);let Rt,At,Dt,Ft,Wt,kt,Qt,ce,_e;const ve=L.isCompressedTexture?L.mipmaps[Mt]:L.image;if(J!==null)Rt=J.max.x-J.min.x,At=J.max.y-J.min.y,Dt=J.isBox3?J.max.z-J.min.z:1,Ft=J.min.x,Wt=J.min.y,kt=J.isBox3?J.min.z:0;else{const bn=Math.pow(2,-j);Rt=Math.floor(ve.width*bn),At=Math.floor(ve.height*bn),L.isDataArrayTexture?Dt=ve.depth:L.isData3DTexture?Dt=Math.floor(ve.depth*bn):Dt=1,Ft=0,Wt=0,kt=0}K!==null?(Qt=K.x,ce=K.y,_e=K.z):(Qt=0,ce=0,_e=0);const ue=mt.convert(q.format),zt=mt.convert(q.type);let re;q.isData3DTexture?(H.setTexture3D(q,0),re=C.TEXTURE_3D):q.isDataArrayTexture||q.isCompressedArrayTexture?(H.setTexture2DArray(q,0),re=C.TEXTURE_2D_ARRAY):(H.setTexture2D(q,0),re=C.TEXTURE_2D),C.pixelStorei(C.UNPACK_FLIP_Y_WEBGL,q.flipY),C.pixelStorei(C.UNPACK_PREMULTIPLY_ALPHA_WEBGL,q.premultiplyAlpha),C.pixelStorei(C.UNPACK_ALIGNMENT,q.unpackAlignment);const ee=C.getParameter(C.UNPACK_ROW_LENGTH),fn=C.getParameter(C.UNPACK_IMAGE_HEIGHT),Rs=C.getParameter(C.UNPACK_SKIP_PIXELS),pn=C.getParameter(C.UNPACK_SKIP_ROWS),Sr=C.getParameter(C.UNPACK_SKIP_IMAGES);C.pixelStorei(C.UNPACK_ROW_LENGTH,ve.width),C.pixelStorei(C.UNPACK_IMAGE_HEIGHT,ve.height),C.pixelStorei(C.UNPACK_SKIP_PIXELS,Ft),C.pixelStorei(C.UNPACK_SKIP_ROWS,Wt),C.pixelStorei(C.UNPACK_SKIP_IMAGES,kt);const pe=L.isDataArrayTexture||L.isData3DTexture,on=q.isDataArrayTexture||q.isData3DTexture;if(L.isDepthTexture){const bn=w.get(L),je=w.get(q),an=w.get(bn.__renderTarget),Xa=w.get(je.__renderTarget);wt.bindFramebuffer(C.READ_FRAMEBUFFER,an.__webglFramebuffer),wt.bindFramebuffer(C.DRAW_FRAMEBUFFER,Xa.__webglFramebuffer);for(let Qi=0;Qi<Dt;Qi++)pe&&(C.framebufferTextureLayer(C.READ_FRAMEBUFFER,C.COLOR_ATTACHMENT0,w.get(L).__webglTexture,j,kt+Qi),C.framebufferTextureLayer(C.DRAW_FRAMEBUFFER,C.COLOR_ATTACHMENT0,w.get(q).__webglTexture,Mt,_e+Qi)),C.blitFramebuffer(Ft,Wt,Rt,At,Qt,ce,Rt,At,C.DEPTH_BUFFER_BIT,C.NEAREST);wt.bindFramebuffer(C.READ_FRAMEBUFFER,null),wt.bindFramebuffer(C.DRAW_FRAMEBUFFER,null)}else if(j!==0||L.isRenderTargetTexture||w.has(L)){const bn=w.get(L),je=w.get(q);wt.bindFramebuffer(C.READ_FRAMEBUFFER,bp),wt.bindFramebuffer(C.DRAW_FRAMEBUFFER,Mp);for(let an=0;an<Dt;an++)pe?C.framebufferTextureLayer(C.READ_FRAMEBUFFER,C.COLOR_ATTACHMENT0,bn.__webglTexture,j,kt+an):C.framebufferTexture2D(C.READ_FRAMEBUFFER,C.COLOR_ATTACHMENT0,C.TEXTURE_2D,bn.__webglTexture,j),on?C.framebufferTextureLayer(C.DRAW_FRAMEBUFFER,C.COLOR_ATTACHMENT0,je.__webglTexture,Mt,_e+an):C.framebufferTexture2D(C.DRAW_FRAMEBUFFER,C.COLOR_ATTACHMENT0,C.TEXTURE_2D,je.__webglTexture,Mt),j!==0?C.blitFramebuffer(Ft,Wt,Rt,At,Qt,ce,Rt,At,C.COLOR_BUFFER_BIT,C.NEAREST):on?C.copyTexSubImage3D(re,Mt,Qt,ce,_e+an,Ft,Wt,Rt,At):C.copyTexSubImage2D(re,Mt,Qt,ce,Ft,Wt,Rt,At);wt.bindFramebuffer(C.READ_FRAMEBUFFER,null),wt.bindFramebuffer(C.DRAW_FRAMEBUFFER,null)}else on?L.isDataTexture||L.isData3DTexture?C.texSubImage3D(re,Mt,Qt,ce,_e,Rt,At,Dt,ue,zt,ve.data):q.isCompressedArrayTexture?C.compressedTexSubImage3D(re,Mt,Qt,ce,_e,Rt,At,Dt,ue,ve.data):C.texSubImage3D(re,Mt,Qt,ce,_e,Rt,At,Dt,ue,zt,ve):L.isDataTexture?C.texSubImage2D(C.TEXTURE_2D,Mt,Qt,ce,Rt,At,ue,zt,ve.data):L.isCompressedTexture?C.compressedTexSubImage2D(C.TEXTURE_2D,Mt,Qt,ce,ve.width,ve.height,ue,ve.data):C.texSubImage2D(C.TEXTURE_2D,Mt,Qt,ce,Rt,At,ue,zt,ve);C.pixelStorei(C.UNPACK_ROW_LENGTH,ee),C.pixelStorei(C.UNPACK_IMAGE_HEIGHT,fn),C.pixelStorei(C.UNPACK_SKIP_PIXELS,Rs),C.pixelStorei(C.UNPACK_SKIP_ROWS,pn),C.pixelStorei(C.UNPACK_SKIP_IMAGES,Sr),Mt===0&&q.generateMipmaps&&C.generateMipmap(re),wt.unbindTexture()},this.initRenderTarget=function(L){w.get(L).__webglFramebuffer===void 0&&H.setupRenderTarget(L)},this.initTexture=function(L){L.isCubeTexture?H.setTextureCube(L,0):L.isData3DTexture?H.setTexture3D(L,0):L.isDataArrayTexture||L.isCompressedArrayTexture?H.setTexture2DArray(L,0):H.setTexture2D(L,0),wt.unbindTexture()},this.resetState=function(){D=0,I=0,U=null,wt.reset(),Pt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Jn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorSpace=te._getDrawingBufferColorSpace(t),e.unpackColorSpace=te._getUnpackColorSpace()}}const hd={type:"change"},Rh={type:"start"},Yf={type:"end"},Go=new ao,ud=new kn,mS=Math.cos(70*$m.DEG2RAD),Pe=new N,ln=2*Math.PI,he={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Rl=1e-6;class gS extends _0{constructor(t,e=null){super(t,e),this.state=he.NONE,this.target=new N,this.cursor=new N,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:rr.ROTATE,MIDDLE:rr.DOLLY,RIGHT:rr.PAN},this.touches={ONE:nr.ROTATE,TWO:nr.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new N,this._lastQuaternion=new Ti,this._lastTargetPosition=new N,this._quat=new Ti().setFromUnitVectors(t.up,new N(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Fu,this._sphericalDelta=new Fu,this._scale=1,this._panOffset=new N,this._rotateStart=new it,this._rotateEnd=new it,this._rotateDelta=new it,this._panStart=new it,this._panEnd=new it,this._panDelta=new it,this._dollyStart=new it,this._dollyEnd=new it,this._dollyDelta=new it,this._dollyDirection=new N,this._mouse=new it,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=_S.bind(this),this._onPointerDown=xS.bind(this),this._onPointerUp=vS.bind(this),this._onContextMenu=wS.bind(this),this._onMouseWheel=bS.bind(this),this._onKeyDown=MS.bind(this),this._onTouchStart=ES.bind(this),this._onTouchMove=AS.bind(this),this._onMouseDown=yS.bind(this),this._onMouseMove=SS.bind(this),this._interceptControlDown=TS.bind(this),this._interceptControlUp=CS.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(hd),this.update(),this.state=he.NONE}update(t=null){const e=this.object.position;Pe.copy(e).sub(this.target),Pe.applyQuaternion(this._quat),this._spherical.setFromVector3(Pe),this.autoRotate&&this.state===he.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=ln:n>Math.PI&&(n-=ln),s<-Math.PI?s+=ln:s>Math.PI&&(s-=ln),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=o!=this._spherical.radius}if(Pe.setFromSpherical(this._spherical),Pe.applyQuaternion(this._quatInverse),e.copy(this.target).add(Pe),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){const a=Pe.length();o=this._clampDistance(a*this._scale);const l=a-o;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){const a=new N(this._mouse.x,this._mouse.y,0);a.unproject(this.object);const l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;const c=new N(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(a),this.object.updateMatrixWorld(),o=Pe.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(Go.origin.copy(this.object.position),Go.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Go.direction))<mS?this.object.lookAt(this.target):(ud.setFromNormalAndCoplanarPoint(this.object.up,this.target),Go.intersectPlane(ud,this.target))))}else if(this.object.isOrthographicCamera){const o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>Rl||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Rl||this._lastTargetPosition.distanceToSquared(this.target)>Rl?(this.dispatchEvent(hd),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?ln/60*this.autoRotateSpeed*t:ln/60/60*this.autoRotateSpeed}_getZoomScale(t){const e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){Pe.setFromMatrixColumn(e,0),Pe.multiplyScalar(-t),this._panOffset.add(Pe)}_panUp(t,e){this.screenSpacePanning===!0?Pe.setFromMatrixColumn(e,1):(Pe.setFromMatrixColumn(e,0),Pe.crossVectors(this.object.up,Pe)),Pe.multiplyScalar(t),this._panOffset.add(Pe)}_pan(t,e){const n=this.domElement;if(this.object.isPerspectiveCamera){const s=this.object.position;Pe.copy(s).sub(this.target);let r=Pe.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*r/n.clientHeight,this.object.matrix),this._panUp(2*e*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const n=this.domElement.getBoundingClientRect(),s=t-n.left,r=e-n.top,o=n.width,a=n.height;this._mouse.x=s/o*2-1,this._mouse.y=-(r/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(ln*this._rotateDelta.x/e.clientHeight),this._rotateUp(ln*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(ln*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-ln*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(ln*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-ln*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panStart.set(n,s)}}_handleTouchStartDolly(t){const e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{const n=this._getSecondPointerPosition(t),s=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(ln*this._rotateDelta.x/e.clientHeight),this._rotateUp(ln*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){const e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const o=(t.pageX+e.x)*.5,a=(t.pageY+e.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new it,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){const e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){const e=t.deltaMode,n={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}}function xS(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i)))}function _S(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function vS(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Yf),this.state=he.NONE;break;case 1:const t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function yS(i){let t;switch(i.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case rr.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=he.DOLLY;break;case rr.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=he.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=he.ROTATE}break;case rr.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=he.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=he.PAN}break;default:this.state=he.NONE}this.state!==he.NONE&&this.dispatchEvent(Rh)}function SS(i){switch(this.state){case he.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case he.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case he.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function bS(i){this.enabled===!1||this.enableZoom===!1||this.state!==he.NONE||(i.preventDefault(),this.dispatchEvent(Rh),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Yf))}function MS(i){this.enabled!==!1&&this._handleKeyDown(i)}function ES(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case nr.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=he.TOUCH_ROTATE;break;case nr.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=he.TOUCH_PAN;break;default:this.state=he.NONE}break;case 2:switch(this.touches.TWO){case nr.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=he.TOUCH_DOLLY_PAN;break;case nr.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=he.TOUCH_DOLLY_ROTATE;break;default:this.state=he.NONE}break;default:this.state=he.NONE}this.state!==he.NONE&&this.dispatchEvent(Rh)}function AS(i){switch(this._trackPointer(i),this.state){case he.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case he.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case he.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case he.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=he.NONE}}function wS(i){this.enabled!==!1&&i.preventDefault()}function TS(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function CS(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}const PS=xn;class gr extends Th{constructor(t){super(t),this.defaultDPI=90,this.defaultUnit="px"}load(t,e,n,s){const r=this,o=new o0(r.manager);o.setPath(r.path),o.setRequestHeader(r.requestHeader),o.setWithCredentials(r.withCredentials),o.load(t,function(a){try{e(r.parse(a))}catch(l){s?s(l):console.error(l),r.manager.itemError(t)}},n,s)}parse(t){const e=this;function n(Z,z){if(Z.nodeType!==1)return;const R=v(Z);let P=!1,$=null;switch(Z.nodeName){case"svg":z=g(Z,z);break;case"style":r(Z);break;case"g":z=g(Z,z);break;case"path":z=g(Z,z),Z.hasAttribute("d")&&($=s(Z));break;case"rect":z=g(Z,z),$=l(Z);break;case"polygon":z=g(Z,z),$=c(Z);break;case"polyline":z=g(Z,z),$=h(Z);break;case"circle":z=g(Z,z),$=u(Z);break;case"ellipse":z=g(Z,z),$=d(Z);break;case"line":z=g(Z,z),$=f(Z);break;case"defs":P=!0;break;case"use":z=g(Z,z);const rt=(Z.getAttributeNS("http://www.w3.org/1999/xlink","href")||"").substring(1),xt=Z.viewportElement.getElementById(rt);xt?n(xt,z):console.warn("SVGLoader: 'use node' references non-existent node id: "+rt);break}$&&(z.fill!==void 0&&z.fill!=="none"&&$.color.setStyle(z.fill,PS),E($,gt),I.push($),$.userData={node:Z,style:z});const nt=Z.childNodes;for(let Y=0;Y<nt.length;Y++){const rt=nt[Y];P&&rt.nodeName!=="style"&&rt.nodeName!=="defs"||n(rt,z)}R&&(F.pop(),F.length>0?gt.copy(F[F.length-1]):gt.identity())}function s(Z){const z=new ss,R=new it,P=new it,$=new it;let nt=!0,Y=!1;const rt=Z.getAttribute("d");if(rt===""||rt==="none")return null;const xt=rt.match(/[a-df-z][^a-df-z]*/ig);for(let ut=0,tt=xt.length;ut<tt;ut++){const ot=xt[ut],ct=ot.charAt(0),bt=ot.slice(1).trim();nt===!0&&(Y=!0,nt=!1);let C;switch(ct){case"M":C=m(bt);for(let O=0,pt=C.length;O<pt;O+=2)R.x=C[O+0],R.y=C[O+1],P.x=R.x,P.y=R.y,O===0?z.moveTo(R.x,R.y):z.lineTo(R.x,R.y),O===0&&$.copy(R);break;case"H":C=m(bt);for(let O=0,pt=C.length;O<pt;O++)R.x=C[O],P.x=R.x,P.y=R.y,z.lineTo(R.x,R.y),O===0&&Y===!0&&$.copy(R);break;case"V":C=m(bt);for(let O=0,pt=C.length;O<pt;O++)R.y=C[O],P.x=R.x,P.y=R.y,z.lineTo(R.x,R.y),O===0&&Y===!0&&$.copy(R);break;case"L":C=m(bt);for(let O=0,pt=C.length;O<pt;O+=2)R.x=C[O+0],R.y=C[O+1],P.x=R.x,P.y=R.y,z.lineTo(R.x,R.y),O===0&&Y===!0&&$.copy(R);break;case"C":C=m(bt);for(let O=0,pt=C.length;O<pt;O+=6)z.bezierCurveTo(C[O+0],C[O+1],C[O+2],C[O+3],C[O+4],C[O+5]),P.x=C[O+2],P.y=C[O+3],R.x=C[O+4],R.y=C[O+5],O===0&&Y===!0&&$.copy(R);break;case"S":C=m(bt);for(let O=0,pt=C.length;O<pt;O+=4)z.bezierCurveTo(x(R.x,P.x),x(R.y,P.y),C[O+0],C[O+1],C[O+2],C[O+3]),P.x=C[O+0],P.y=C[O+1],R.x=C[O+2],R.y=C[O+3],O===0&&Y===!0&&$.copy(R);break;case"Q":C=m(bt);for(let O=0,pt=C.length;O<pt;O+=4)z.quadraticCurveTo(C[O+0],C[O+1],C[O+2],C[O+3]),P.x=C[O+0],P.y=C[O+1],R.x=C[O+2],R.y=C[O+3],O===0&&Y===!0&&$.copy(R);break;case"T":C=m(bt);for(let O=0,pt=C.length;O<pt;O+=2){const Bt=x(R.x,P.x),wt=x(R.y,P.y);z.quadraticCurveTo(Bt,wt,C[O+0],C[O+1]),P.x=Bt,P.y=wt,R.x=C[O+0],R.y=C[O+1],O===0&&Y===!0&&$.copy(R)}break;case"A":C=m(bt,[3,4],7);for(let O=0,pt=C.length;O<pt;O+=7){if(C[O+5]==R.x&&C[O+6]==R.y)continue;const Bt=R.clone();R.x=C[O+5],R.y=C[O+6],P.x=R.x,P.y=R.y,o(z,C[O],C[O+1],C[O+2],C[O+3],C[O+4],Bt,R),O===0&&Y===!0&&$.copy(R)}break;case"m":C=m(bt);for(let O=0,pt=C.length;O<pt;O+=2)R.x+=C[O+0],R.y+=C[O+1],P.x=R.x,P.y=R.y,O===0?z.moveTo(R.x,R.y):z.lineTo(R.x,R.y),O===0&&$.copy(R);break;case"h":C=m(bt);for(let O=0,pt=C.length;O<pt;O++)R.x+=C[O],P.x=R.x,P.y=R.y,z.lineTo(R.x,R.y),O===0&&Y===!0&&$.copy(R);break;case"v":C=m(bt);for(let O=0,pt=C.length;O<pt;O++)R.y+=C[O],P.x=R.x,P.y=R.y,z.lineTo(R.x,R.y),O===0&&Y===!0&&$.copy(R);break;case"l":C=m(bt);for(let O=0,pt=C.length;O<pt;O+=2)R.x+=C[O+0],R.y+=C[O+1],P.x=R.x,P.y=R.y,z.lineTo(R.x,R.y),O===0&&Y===!0&&$.copy(R);break;case"c":C=m(bt);for(let O=0,pt=C.length;O<pt;O+=6)z.bezierCurveTo(R.x+C[O+0],R.y+C[O+1],R.x+C[O+2],R.y+C[O+3],R.x+C[O+4],R.y+C[O+5]),P.x=R.x+C[O+2],P.y=R.y+C[O+3],R.x+=C[O+4],R.y+=C[O+5],O===0&&Y===!0&&$.copy(R);break;case"s":C=m(bt);for(let O=0,pt=C.length;O<pt;O+=4)z.bezierCurveTo(x(R.x,P.x),x(R.y,P.y),R.x+C[O+0],R.y+C[O+1],R.x+C[O+2],R.y+C[O+3]),P.x=R.x+C[O+0],P.y=R.y+C[O+1],R.x+=C[O+2],R.y+=C[O+3],O===0&&Y===!0&&$.copy(R);break;case"q":C=m(bt);for(let O=0,pt=C.length;O<pt;O+=4)z.quadraticCurveTo(R.x+C[O+0],R.y+C[O+1],R.x+C[O+2],R.y+C[O+3]),P.x=R.x+C[O+0],P.y=R.y+C[O+1],R.x+=C[O+2],R.y+=C[O+3],O===0&&Y===!0&&$.copy(R);break;case"t":C=m(bt);for(let O=0,pt=C.length;O<pt;O+=2){const Bt=x(R.x,P.x),wt=x(R.y,P.y);z.quadraticCurveTo(Bt,wt,R.x+C[O+0],R.y+C[O+1]),P.x=Bt,P.y=wt,R.x=R.x+C[O+0],R.y=R.y+C[O+1],O===0&&Y===!0&&$.copy(R)}break;case"a":C=m(bt,[3,4],7);for(let O=0,pt=C.length;O<pt;O+=7){if(C[O+5]==0&&C[O+6]==0)continue;const Bt=R.clone();R.x+=C[O+5],R.y+=C[O+6],P.x=R.x,P.y=R.y,o(z,C[O],C[O+1],C[O+2],C[O+3],C[O+4],Bt,R),O===0&&Y===!0&&$.copy(R)}break;case"Z":case"z":z.currentPath.autoClose=!0,z.currentPath.curves.length>0&&(R.copy($),z.currentPath.currentPoint.copy(R),nt=!0);break;default:console.warn(ot)}Y=!1}return z}function r(Z){if(!(!Z.sheet||!Z.sheet.cssRules||!Z.sheet.cssRules.length))for(let z=0;z<Z.sheet.cssRules.length;z++){const R=Z.sheet.cssRules[z];if(R.type!==1)continue;const P=R.selectorText.split(/,/gm).filter(Boolean).map($=>$.trim());for(let $=0;$<P.length;$++){const nt=Object.fromEntries(Object.entries(R.style).filter(([,Y])=>Y!==""));U[P[$]]=Object.assign(U[P[$]]||{},nt)}}}function o(Z,z,R,P,$,nt,Y,rt){if(z==0||R==0){Z.lineTo(rt.x,rt.y);return}P=P*Math.PI/180,z=Math.abs(z),R=Math.abs(R);const xt=(Y.x-rt.x)/2,ut=(Y.y-rt.y)/2,tt=Math.cos(P)*xt+Math.sin(P)*ut,ot=-Math.sin(P)*xt+Math.cos(P)*ut;let ct=z*z,bt=R*R;const C=tt*tt,O=ot*ot,pt=C/ct+O/bt;if(pt>1){const _t=Math.sqrt(pt);z=_t*z,R=_t*R,ct=z*z,bt=R*R}const Bt=ct*O+bt*C,wt=(ct*bt-Bt)/Bt;let B=Math.sqrt(Math.max(0,wt));$===nt&&(B=-B);const w=B*z*ot/R,H=-B*R*tt/z,et=Math.cos(P)*w-Math.sin(P)*H+(Y.x+rt.x)/2,at=Math.sin(P)*w+Math.cos(P)*H+(Y.y+rt.y)/2,Q=a(1,0,(tt-w)/z,(ot-H)/R),It=a((tt-w)/z,(ot-H)/R,(-tt-w)/z,(-ot-H)/R)%(Math.PI*2);Z.currentPath.absellipse(et,at,z,R,Q,Q+It,nt===0,P)}function a(Z,z,R,P){const $=Z*R+z*P,nt=Math.sqrt(Z*Z+z*z)*Math.sqrt(R*R+P*P);let Y=Math.acos(Math.max(-1,Math.min(1,$/nt)));return Z*P-z*R<0&&(Y=-Y),Y}function l(Z){const z=_(Z.getAttribute("x")||0),R=_(Z.getAttribute("y")||0),P=_(Z.getAttribute("rx")||Z.getAttribute("ry")||0),$=_(Z.getAttribute("ry")||Z.getAttribute("rx")||0),nt=_(Z.getAttribute("width")),Y=_(Z.getAttribute("height")),rt=1-.551915024494,xt=new ss;return xt.moveTo(z+P,R),xt.lineTo(z+nt-P,R),(P!==0||$!==0)&&xt.bezierCurveTo(z+nt-P*rt,R,z+nt,R+$*rt,z+nt,R+$),xt.lineTo(z+nt,R+Y-$),(P!==0||$!==0)&&xt.bezierCurveTo(z+nt,R+Y-$*rt,z+nt-P*rt,R+Y,z+nt-P,R+Y),xt.lineTo(z+P,R+Y),(P!==0||$!==0)&&xt.bezierCurveTo(z+P*rt,R+Y,z,R+Y-$*rt,z,R+Y-$),xt.lineTo(z,R+$),(P!==0||$!==0)&&xt.bezierCurveTo(z,R+$*rt,z+P*rt,R,z+P,R),xt}function c(Z){function z(nt,Y,rt){const xt=_(Y),ut=_(rt);$===0?P.moveTo(xt,ut):P.lineTo(xt,ut),$++}const R=/([+-]?\d*\.?\d+(?:e[+-]?\d+)?)(?:,|\s)([+-]?\d*\.?\d+(?:e[+-]?\d+)?)/g,P=new ss;let $=0;return Z.getAttribute("points").replace(R,z),P.currentPath.autoClose=!0,P}function h(Z){function z(nt,Y,rt){const xt=_(Y),ut=_(rt);$===0?P.moveTo(xt,ut):P.lineTo(xt,ut),$++}const R=/([+-]?\d*\.?\d+(?:e[+-]?\d+)?)(?:,|\s)([+-]?\d*\.?\d+(?:e[+-]?\d+)?)/g,P=new ss;let $=0;return Z.getAttribute("points").replace(R,z),P.currentPath.autoClose=!1,P}function u(Z){const z=_(Z.getAttribute("cx")||0),R=_(Z.getAttribute("cy")||0),P=_(Z.getAttribute("r")||0),$=new cr;$.absarc(z,R,P,0,Math.PI*2);const nt=new ss;return nt.subPaths.push($),nt}function d(Z){const z=_(Z.getAttribute("cx")||0),R=_(Z.getAttribute("cy")||0),P=_(Z.getAttribute("rx")||0),$=_(Z.getAttribute("ry")||0),nt=new cr;nt.absellipse(z,R,P,$,0,Math.PI*2);const Y=new ss;return Y.subPaths.push(nt),Y}function f(Z){const z=_(Z.getAttribute("x1")||0),R=_(Z.getAttribute("y1")||0),P=_(Z.getAttribute("x2")||0),$=_(Z.getAttribute("y2")||0),nt=new ss;return nt.moveTo(z,R),nt.lineTo(P,$),nt.currentPath.autoClose=!1,nt}function g(Z,z){z=Object.assign({},z);let R={};if(Z.hasAttribute("class")){const Y=Z.getAttribute("class").split(/\s/).filter(Boolean).map(rt=>rt.trim());for(let rt=0;rt<Y.length;rt++)R=Object.assign(R,U["."+Y[rt]])}Z.hasAttribute("id")&&(R=Object.assign(R,U["#"+Z.getAttribute("id")]));function P(Y,rt,xt){xt===void 0&&(xt=function(tt){return tt.startsWith("url")&&console.warn("SVGLoader: url access in attributes is not implemented."),tt}),Z.hasAttribute(Y)&&(z[rt]=xt(Z.getAttribute(Y))),R[rt]&&(z[rt]=xt(R[rt])),Z.style&&Z.style[Y]!==""&&(z[rt]=xt(Z.style[Y]))}function $(Y){return Math.max(0,Math.min(1,_(Y)))}function nt(Y){return Math.max(0,_(Y))}return P("fill","fill"),P("fill-opacity","fillOpacity",$),P("fill-rule","fillRule"),P("opacity","opacity",$),P("stroke","stroke"),P("stroke-opacity","strokeOpacity",$),P("stroke-width","strokeWidth",nt),P("stroke-linejoin","strokeLineJoin"),P("stroke-linecap","strokeLineCap"),P("stroke-miterlimit","strokeMiterLimit",nt),P("visibility","visibility"),z}function x(Z,z){return Z-(z-Z)}function m(Z,z,R){if(typeof Z!="string")throw new TypeError("Invalid input: "+typeof Z);const P={SEPARATOR:/[ \t\r\n\,.\-+]/,WHITESPACE:/[ \t\r\n]/,DIGIT:/[\d]/,SIGN:/[-+]/,POINT:/\./,COMMA:/,/,EXP:/e/i,FLAGS:/[01]/},$=0,nt=1,Y=2,rt=3;let xt=$,ut=!0,tt="",ot="";const ct=[];function bt(Bt,wt,B){const w=new SyntaxError('Unexpected character "'+Bt+'" at index '+wt+".");throw w.partial=B,w}function C(){tt!==""&&(ot===""?ct.push(Number(tt)):ct.push(Number(tt)*Math.pow(10,Number(ot)))),tt="",ot=""}let O;const pt=Z.length;for(let Bt=0;Bt<pt;Bt++){if(O=Z[Bt],Array.isArray(z)&&z.includes(ct.length%R)&&P.FLAGS.test(O)){xt=nt,tt=O,C();continue}if(xt===$){if(P.WHITESPACE.test(O))continue;if(P.DIGIT.test(O)||P.SIGN.test(O)){xt=nt,tt=O;continue}if(P.POINT.test(O)){xt=Y,tt=O;continue}P.COMMA.test(O)&&(ut&&bt(O,Bt,ct),ut=!0)}if(xt===nt){if(P.DIGIT.test(O)){tt+=O;continue}if(P.POINT.test(O)){tt+=O,xt=Y;continue}if(P.EXP.test(O)){xt=rt;continue}P.SIGN.test(O)&&tt.length===1&&P.SIGN.test(tt[0])&&bt(O,Bt,ct)}if(xt===Y){if(P.DIGIT.test(O)){tt+=O;continue}if(P.EXP.test(O)){xt=rt;continue}P.POINT.test(O)&&tt[tt.length-1]==="."&&bt(O,Bt,ct)}if(xt===rt){if(P.DIGIT.test(O)){ot+=O;continue}if(P.SIGN.test(O)){if(ot===""){ot+=O;continue}ot.length===1&&P.SIGN.test(ot)&&bt(O,Bt,ct)}}P.WHITESPACE.test(O)?(C(),xt=$,ut=!1):P.COMMA.test(O)?(C(),xt=$,ut=!0):P.SIGN.test(O)?(C(),xt=nt,tt=O):P.POINT.test(O)?(C(),xt=Y,tt=O):bt(O,Bt,ct)}return C(),ct}const p=["mm","cm","in","pt","pc","px"],y={mm:{mm:1,cm:.1,in:1/25.4,pt:72/25.4,pc:6/25.4,px:-1},cm:{mm:10,cm:1,in:1/2.54,pt:72/2.54,pc:6/2.54,px:-1},in:{mm:25.4,cm:2.54,in:1,pt:72,pc:6,px:-1},pt:{mm:25.4/72,cm:2.54/72,in:1/72,pt:1,pc:6/72,px:-1},pc:{mm:25.4/6,cm:2.54/6,in:1/6,pt:72/6,pc:1,px:-1},px:{px:1}};function _(Z){let z="px";if(typeof Z=="string"||Z instanceof String)for(let P=0,$=p.length;P<$;P++){const nt=p[P];if(Z.endsWith(nt)){z=nt,Z=Z.substring(0,Z.length-nt.length);break}}let R;return z==="px"&&e.defaultUnit!=="px"?R=y.in[e.defaultUnit]/e.defaultDPI:(R=y[z][e.defaultUnit],R<0&&(R=y[z].in*e.defaultDPI)),R*parseFloat(Z)}function v(Z){if(!(Z.hasAttribute("transform")||Z.nodeName==="use"&&(Z.hasAttribute("x")||Z.hasAttribute("y"))))return null;const z=S(Z);return F.length>0&&z.premultiply(F[F.length-1]),gt.copy(z),F.push(z),z}function S(Z){const z=new Xt,R=V;if(Z.nodeName==="use"&&(Z.hasAttribute("x")||Z.hasAttribute("y"))){const P=_(Z.getAttribute("x")||0),$=_(Z.getAttribute("y")||0);z.translate(P,$)}if(Z.hasAttribute("transform")){const P=Z.getAttribute("transform").split(")");for(let $=P.length-1;$>=0;$--){const nt=P[$].trim();if(nt==="")continue;const Y=nt.indexOf("("),rt=nt.length;if(Y>0&&Y<rt){const xt=nt.slice(0,Y),ut=m(nt.slice(Y+1));switch(R.identity(),xt){case"translate":if(ut.length>=1){const tt=ut[0];let ot=0;ut.length>=2&&(ot=ut[1]),R.translate(tt,ot)}break;case"rotate":if(ut.length>=1){let tt=0,ot=0,ct=0;tt=ut[0]*Math.PI/180,ut.length>=3&&(ot=ut[1],ct=ut[2]),G.makeTranslation(-ot,-ct),k.makeRotation(tt),X.multiplyMatrices(k,G),G.makeTranslation(ot,ct),R.multiplyMatrices(G,X)}break;case"scale":if(ut.length>=1){const tt=ut[0];let ot=tt;ut.length>=2&&(ot=ut[1]),R.scale(tt,ot)}break;case"skewX":ut.length===1&&R.set(1,Math.tan(ut[0]*Math.PI/180),0,0,1,0,0,0,1);break;case"skewY":ut.length===1&&R.set(1,0,0,Math.tan(ut[0]*Math.PI/180),1,0,0,0,1);break;case"matrix":ut.length===6&&R.set(ut[0],ut[2],ut[4],ut[1],ut[3],ut[5],0,0,1);break}}z.premultiply(R)}}return z}function E(Z,z){function R(Y){st.set(Y.x,Y.y,1).applyMatrix3(z),Y.set(st.x,st.y)}function P(Y){const rt=Y.xRadius,xt=Y.yRadius,ut=Math.cos(Y.aRotation),tt=Math.sin(Y.aRotation),ot=new N(rt*ut,rt*tt,0),ct=new N(-xt*tt,xt*ut,0),bt=ot.applyMatrix3(z),C=ct.applyMatrix3(z),O=V.set(bt.x,C.x,0,bt.y,C.y,0,0,0,1),pt=G.copy(O).invert(),B=k.copy(pt).transpose().multiply(pt).elements,w=D(B[0],B[1],B[4]),H=Math.sqrt(w.rt1),et=Math.sqrt(w.rt2);if(Y.xRadius=1/H,Y.yRadius=1/et,Y.aRotation=Math.atan2(w.sn,w.cs),!((Y.aEndAngle-Y.aStartAngle)%(2*Math.PI)<Number.EPSILON)){const Q=G.set(H,0,0,0,et,0,0,0,1),It=k.set(w.cs,w.sn,0,-w.sn,w.cs,0,0,0,1),_t=Q.multiply(It).multiply(O),Lt=Vt=>{const{x:dt,y:vt}=new N(Math.cos(Vt),Math.sin(Vt),0).applyMatrix3(_t);return Math.atan2(vt,dt)};Y.aStartAngle=Lt(Y.aStartAngle),Y.aEndAngle=Lt(Y.aEndAngle),M(z)&&(Y.aClockwise=!Y.aClockwise)}}function $(Y){const rt=b(z),xt=A(z);Y.xRadius*=rt,Y.yRadius*=xt;const ut=rt>Number.EPSILON?Math.atan2(z.elements[1],z.elements[0]):Math.atan2(-z.elements[3],z.elements[4]);Y.aRotation+=ut,M(z)&&(Y.aStartAngle*=-1,Y.aEndAngle*=-1,Y.aClockwise=!Y.aClockwise)}const nt=Z.subPaths;for(let Y=0,rt=nt.length;Y<rt;Y++){const ut=nt[Y].curves;for(let tt=0;tt<ut.length;tt++){const ot=ut[tt];ot.isLineCurve?(R(ot.v1),R(ot.v2)):ot.isCubicBezierCurve?(R(ot.v0),R(ot.v1),R(ot.v2),R(ot.v3)):ot.isQuadraticBezierCurve?(R(ot.v0),R(ot.v1),R(ot.v2)):ot.isEllipseCurve&&(ht.set(ot.aX,ot.aY),R(ht),ot.aX=ht.x,ot.aY=ht.y,T(z)?P(ot):$(ot))}}}function M(Z){const z=Z.elements;return z[0]*z[4]-z[1]*z[3]<0}function T(Z){const z=Z.elements,R=z[0]*z[3]+z[1]*z[4];if(R===0)return!1;const P=b(Z),$=A(Z);return Math.abs(R/(P*$))>Number.EPSILON}function b(Z){const z=Z.elements;return Math.sqrt(z[0]*z[0]+z[1]*z[1])}function A(Z){const z=Z.elements;return Math.sqrt(z[3]*z[3]+z[4]*z[4])}function D(Z,z,R){let P,$,nt,Y,rt;const xt=Z+R,ut=Z-R,tt=Math.sqrt(ut*ut+4*z*z);return xt>0?(P=.5*(xt+tt),rt=1/P,$=Z*rt*R-z*rt*z):xt<0?$=.5*(xt-tt):(P=.5*tt,$=-.5*tt),ut>0?nt=ut+tt:nt=ut-tt,Math.abs(nt)>2*Math.abs(z)?(rt=-2*z/nt,Y=1/Math.sqrt(1+rt*rt),nt=rt*Y):Math.abs(z)===0?(nt=1,Y=0):(rt=-.5*nt/z,nt=1/Math.sqrt(1+rt*rt),Y=rt*nt),ut>0&&(rt=nt,nt=-Y,Y=rt),{rt1:P,rt2:$,cs:nt,sn:Y}}const I=[],U={},F=[],V=new Xt,G=new Xt,k=new Xt,X=new Xt,ht=new it,st=new N,gt=new Xt,Ot=new DOMParser().parseFromString(t,"image/svg+xml");return n(Ot.documentElement,{fill:"#000",fillOpacity:1,strokeOpacity:1,strokeWidth:1,strokeLineJoin:"miter",strokeLineCap:"butt",strokeMiterLimit:4}),{paths:I,xml:Ot.documentElement}}static createShapes(t){const n={ORIGIN:0,DESTINATION:1,BETWEEN:2,LEFT:3,RIGHT:4,BEHIND:5,BEYOND:6},s={loc:n.ORIGIN,t:0};function r(x,m,p,y){const _=x.x,v=m.x,S=p.x,E=y.x,M=x.y,T=m.y,b=p.y,A=y.y,D=(E-S)*(M-b)-(A-b)*(_-S),I=(v-_)*(M-b)-(T-M)*(_-S),U=(A-b)*(v-_)-(E-S)*(T-M),F=D/U,V=I/U;if(U===0&&D!==0||F<=0||F>=1||V<0||V>1)return null;if(D===0&&U===0){for(let G=0;G<2;G++)if(o(G===0?p:y,x,m),s.loc==n.ORIGIN){const k=G===0?p:y;return{x:k.x,y:k.y,t:s.t}}else if(s.loc==n.BETWEEN){const k=+(_+s.t*(v-_)).toPrecision(10),X=+(M+s.t*(T-M)).toPrecision(10);return{x:k,y:X,t:s.t}}return null}else{for(let X=0;X<2;X++)if(o(X===0?p:y,x,m),s.loc==n.ORIGIN){const ht=X===0?p:y;return{x:ht.x,y:ht.y,t:s.t}}const G=+(_+F*(v-_)).toPrecision(10),k=+(M+F*(T-M)).toPrecision(10);return{x:G,y:k,t:F}}}function o(x,m,p){const y=p.x-m.x,_=p.y-m.y,v=x.x-m.x,S=x.y-m.y,E=y*S-v*_;if(x.x===m.x&&x.y===m.y){s.loc=n.ORIGIN,s.t=0;return}if(x.x===p.x&&x.y===p.y){s.loc=n.DESTINATION,s.t=1;return}if(E<-Number.EPSILON){s.loc=n.LEFT;return}if(E>Number.EPSILON){s.loc=n.RIGHT;return}if(y*v<0||_*S<0){s.loc=n.BEHIND;return}if(Math.sqrt(y*y+_*_)<Math.sqrt(v*v+S*S)){s.loc=n.BEYOND;return}let M;y!==0?M=v/y:M=S/_,s.loc=n.BETWEEN,s.t=M}function a(x,m){const p=[],y=[];for(let _=1;_<x.length;_++){const v=x[_-1],S=x[_];for(let E=1;E<m.length;E++){const M=m[E-1],T=m[E],b=r(v,S,M,T);b!==null&&p.find(A=>A.t<=b.t+Number.EPSILON&&A.t>=b.t-Number.EPSILON)===void 0&&(p.push(b),y.push(new it(b.x,b.y)))}}return y}function l(x,m,p){const y=new it;m.getCenter(y);const _=[];return p.forEach(v=>{v.boundingBox.containsPoint(y)&&a(x,v.points).forEach(E=>{_.push({identifier:v.identifier,isCW:v.isCW,point:E})})}),_.sort((v,S)=>v.point.x-S.point.x),_}function c(x,m,p,y,_){(_==null||_==="")&&(_="nonzero");const v=new it;x.boundingBox.getCenter(v);const S=[new it(p,v.y),new it(y,v.y)],E=l(S,x.boundingBox,m);E.sort((I,U)=>I.point.x-U.point.x);const M=[],T=[];E.forEach(I=>{I.identifier===x.identifier?M.push(I):T.push(I)});const b=M[0].point.x,A=[];let D=0;for(;D<T.length&&T[D].point.x<b;)A.length>0&&A[A.length-1]===T[D].identifier?A.pop():A.push(T[D].identifier),D++;if(A.push(x.identifier),_==="evenodd"){const I=A.length%2===0,U=A[A.length-2];return{identifier:x.identifier,isHole:I,for:U}}else if(_==="nonzero"){let I=!0,U=null,F=null;for(let V=0;V<A.length;V++){const G=A[V];I?(F=m[G].isCW,I=!1,U=G):F!==m[G].isCW&&(F=m[G].isCW,I=!0)}return{identifier:x.identifier,isHole:I,for:U}}else console.warn('fill-rule: "'+_+'" is currently not implemented.')}let h=999999999,u=-999999999,d=t.subPaths.map(x=>{const m=x.getPoints();let p=-999999999,y=999999999,_=-999999999,v=999999999;for(let S=0;S<m.length;S++){const E=m[S];E.y>p&&(p=E.y),E.y<y&&(y=E.y),E.x>_&&(_=E.x),E.x<v&&(v=E.x)}return u<=_&&(u=_+1),h>=v&&(h=v-1),{curves:x.curves,points:m,isCW:Ms.isClockWise(m),identifier:-1,boundingBox:new f0(new it(v,y),new it(_,p))}});d=d.filter(x=>x.points.length>1);for(let x=0;x<d.length;x++)d[x].identifier=x;const f=d.map(x=>c(x,d,h,u,t.userData?t.userData.style.fillRule:void 0)),g=[];return d.forEach(x=>{if(!f[x.identifier].isHole){const p=new Xi;p.curves=x.curves,f.filter(_=>_.isHole&&_.for===x.identifier).forEach(_=>{const v=d[_.identifier],S=new cr;S.curves=v.curves,p.holes.push(S)}),g.push(p)}}),g}static getStrokeStyle(t,e,n,s,r){return t=t!==void 0?t:1,e=e!==void 0?e:"#000",n=n!==void 0?n:"miter",s=s!==void 0?s:"butt",r=r!==void 0?r:4,{strokeColor:e,strokeWidth:t,strokeLineJoin:n,strokeLineCap:s,strokeMiterLimit:r}}static pointsToStroke(t,e,n,s){const r=[],o=[],a=[];if(gr.pointsToStrokeWithBuffers(t,e,n,s,r,o,a)===0)return null;const l=new De;return l.setAttribute("position",new be(r,3)),l.setAttribute("normal",new be(o,3)),l.setAttribute("uv",new be(a,2)),l}static pointsToStrokeWithBuffers(t,e,n,s,r,o,a,l){const c=new it,h=new it,u=new it,d=new it,f=new it,g=new it,x=new it,m=new it,p=new it,y=new it,_=new it,v=new it,S=new it,E=new it,M=new it,T=new it,b=new it;n=n!==void 0?n:12,s=s!==void 0?s:.001,l=l!==void 0?l:0,t=ut(t);const A=t.length;if(A<2)return 0;const D=t[0].equals(t[A-1]);let I,U=t[0],F;const V=e.strokeWidth/2,G=1/(A-1);let k=0,X,ht,st,gt,Ot=!1,Ht=0,Z=l*3,z=l*2;R(t[0],t[1],c).multiplyScalar(V),m.copy(t[0]).sub(c),p.copy(t[0]).add(c),y.copy(m),_.copy(p);for(let tt=1;tt<A;tt++){I=t[tt],tt===A-1?D?F=t[1]:F=void 0:F=t[tt+1];const ot=c;if(R(U,I,ot),u.copy(ot).multiplyScalar(V),v.copy(I).sub(u),S.copy(I).add(u),X=k+G,ht=!1,F!==void 0){R(I,F,h),u.copy(h).multiplyScalar(V),E.copy(I).sub(u),M.copy(I).add(u),st=!0,u.subVectors(F,U),ot.dot(u)<0&&(st=!1),tt===1&&(Ot=st),u.subVectors(F,I),u.normalize();const ct=Math.abs(ot.dot(u));if(ct>Number.EPSILON){const bt=V/ct;u.multiplyScalar(-bt),d.subVectors(I,U),f.copy(d).setLength(bt).add(u),T.copy(f).negate();const C=f.length(),O=d.length();d.divideScalar(O),g.subVectors(F,I);const pt=g.length();switch(g.divideScalar(pt),d.dot(T)<O&&g.dot(T)<pt&&(ht=!0),b.copy(f).add(I),T.add(I),gt=!1,ht?st?(M.copy(T),S.copy(T)):(E.copy(T),v.copy(T)):nt(),e.strokeLineJoin){case"bevel":Y(st,ht,X);break;case"round":rt(st,ht),st?$(I,v,E,X,0):$(I,M,S,X,1);break;case"miter":case"miter-clip":default:const Bt=V*e.strokeMiterLimit/C;if(Bt<1)if(e.strokeLineJoin!=="miter-clip"){Y(st,ht,X);break}else rt(st,ht),st?(g.subVectors(b,v).multiplyScalar(Bt).add(v),x.subVectors(b,E).multiplyScalar(Bt).add(E),P(v,X,0),P(g,X,0),P(I,X,.5),P(I,X,.5),P(g,X,0),P(x,X,0),P(I,X,.5),P(x,X,0),P(E,X,0)):(g.subVectors(b,S).multiplyScalar(Bt).add(S),x.subVectors(b,M).multiplyScalar(Bt).add(M),P(S,X,1),P(g,X,1),P(I,X,.5),P(I,X,.5),P(g,X,1),P(x,X,1),P(I,X,.5),P(x,X,1),P(M,X,1));else ht?(st?(P(p,k,1),P(m,k,0),P(b,X,0),P(p,k,1),P(b,X,0),P(T,X,1)):(P(p,k,1),P(m,k,0),P(b,X,1),P(m,k,0),P(T,X,0),P(b,X,1)),st?E.copy(b):M.copy(b)):st?(P(v,X,0),P(b,X,0),P(I,X,.5),P(I,X,.5),P(b,X,0),P(E,X,0)):(P(S,X,1),P(b,X,1),P(I,X,.5),P(I,X,.5),P(b,X,1),P(M,X,1)),gt=!0;break}}else nt()}else nt();!D&&tt===A-1&&xt(t[0],y,_,st,!0,k),k=X,U=I,m.copy(E),p.copy(M)}if(!D)xt(I,v,S,st,!1,X);else if(ht&&r){let tt=b,ot=T;Ot!==st&&(tt=T,ot=b),st?(gt||Ot)&&(ot.toArray(r,0*3),ot.toArray(r,3*3),gt&&tt.toArray(r,1*3)):(gt||!Ot)&&(ot.toArray(r,1*3),ot.toArray(r,3*3),gt&&tt.toArray(r,0*3))}return Ht;function R(tt,ot,ct){return ct.subVectors(ot,tt),ct.set(-ct.y,ct.x).normalize()}function P(tt,ot,ct){r&&(r[Z]=tt.x,r[Z+1]=tt.y,r[Z+2]=0,o&&(o[Z]=0,o[Z+1]=0,o[Z+2]=1),Z+=3,a&&(a[z]=ot,a[z+1]=ct,z+=2)),Ht+=3}function $(tt,ot,ct,bt,C){c.copy(ot).sub(tt).normalize(),h.copy(ct).sub(tt).normalize();let O=Math.PI;const pt=c.dot(h);Math.abs(pt)<1&&(O=Math.abs(Math.acos(pt))),O/=n,u.copy(ot);for(let Bt=0,wt=n-1;Bt<wt;Bt++)d.copy(u).rotateAround(tt,O),P(u,bt,C),P(d,bt,C),P(tt,bt,.5),u.copy(d);P(d,bt,C),P(ct,bt,C),P(tt,bt,.5)}function nt(){P(p,k,1),P(m,k,0),P(v,X,0),P(p,k,1),P(v,X,0),P(S,X,1)}function Y(tt,ot,ct){ot?tt?(P(p,k,1),P(m,k,0),P(v,X,0),P(p,k,1),P(v,X,0),P(T,X,1),P(v,ct,0),P(E,ct,0),P(T,ct,.5)):(P(p,k,1),P(m,k,0),P(S,X,1),P(m,k,0),P(T,X,0),P(S,X,1),P(S,ct,1),P(T,ct,0),P(M,ct,1)):tt?(P(v,ct,0),P(E,ct,0),P(I,ct,.5)):(P(S,ct,1),P(M,ct,0),P(I,ct,.5))}function rt(tt,ot){ot&&(tt?(P(p,k,1),P(m,k,0),P(v,X,0),P(p,k,1),P(v,X,0),P(T,X,1),P(v,k,0),P(I,X,.5),P(T,X,1),P(I,X,.5),P(E,k,0),P(T,X,1)):(P(p,k,1),P(m,k,0),P(S,X,1),P(m,k,0),P(T,X,0),P(S,X,1),P(S,k,1),P(T,X,0),P(I,X,.5),P(I,X,.5),P(T,X,0),P(M,k,1)))}function xt(tt,ot,ct,bt,C,O){switch(e.strokeLineCap){case"round":C?$(tt,ct,ot,O,.5):$(tt,ot,ct,O,.5);break;case"square":if(C)c.subVectors(ot,tt),h.set(c.y,-c.x),u.addVectors(c,h).add(tt),d.subVectors(h,c).add(tt),bt?(u.toArray(r,1*3),d.toArray(r,0*3),d.toArray(r,3*3)):(u.toArray(r,1*3),a[3*2+1]===1?d.toArray(r,3*3):u.toArray(r,3*3),d.toArray(r,0*3));else{c.subVectors(ct,tt),h.set(c.y,-c.x),u.addVectors(c,h).add(tt),d.subVectors(h,c).add(tt);const pt=r.length;bt?(u.toArray(r,pt-1*3),d.toArray(r,pt-2*3),d.toArray(r,pt-4*3)):(d.toArray(r,pt-2*3),u.toArray(r,pt-1*3),d.toArray(r,pt-4*3))}break}}function ut(tt){let ot=!1;for(let bt=1,C=tt.length-1;bt<C;bt++)if(tt[bt].distanceTo(tt[bt+1])<s){ot=!0;break}if(!ot)return tt;const ct=[];ct.push(tt[0]);for(let bt=1,C=tt.length-1;bt<C;bt++)tt[bt].distanceTo(tt[bt+1])>=s&&ct.push(tt[bt]);return ct.push(tt[tt.length-1]),ct}}}const qf=0,RS=1,LS=2,dd=2,Ll=1.25,fd=1,en=6*4+4+4,Ue=en/4,$f=65535,DS=Math.pow(2,-24),Dl=Symbol("SKIP_GENERATION");function IS(i){return i.index?i.index.count:i.attributes.position.count}function Ps(i){return IS(i)/3}function NS(i,t=ArrayBuffer){return i>65535?new Uint32Array(new t(4*i)):new Uint16Array(new t(2*i))}function BS(i,t){if(!i.index){const e=i.attributes.position.count,n=t.useSharedArrayBuffer?SharedArrayBuffer:ArrayBuffer,s=NS(e,n);i.setIndex(new Ze(s,1));for(let r=0;r<e;r++)s[r]=r}}function Zf(i,t){const e=Ps(i),n=t||i.drawRange,s=n.start/3,r=(n.start+n.count)/3,o=Math.max(0,s),a=Math.min(e,r)-o;return[{offset:Math.floor(o),count:Math.floor(a)}]}function pd(i,t){if(!i.groups||!i.groups.length)return Zf(i,t);const e=[],n=t||i.drawRange,s=n.start/3,r=(n.start+n.count)/3,o=Ps(i),a=[];for(const h of i.groups){const{start:u,count:d}=h,f=u/3,g=isFinite(d)?d:o*3-u,x=(u+g)/3;f<r&&x>s&&(a.push({pos:Math.max(s,f),isStart:!0}),a.push({pos:Math.min(r,x),isStart:!1}))}a.sort((h,u)=>h.pos!==u.pos?h.pos-u.pos:h.type==="end"?-1:1);let l=0,c=null;for(const h of a){const u=h.pos;l!==0&&u!==c&&e.push({offset:c,count:u-c}),l+=h.isStart?1:-1,c=u}return e}function Il(i,t,e,n,s){let r=1/0,o=1/0,a=1/0,l=-1/0,c=-1/0,h=-1/0,u=1/0,d=1/0,f=1/0,g=-1/0,x=-1/0,m=-1/0;const p=i.offset||0;for(let y=(t-p)*6,_=(t+e-p)*6;y<_;y+=6){const v=i[y+0],S=i[y+1],E=v-S,M=v+S;E<r&&(r=E),M>l&&(l=M),v<u&&(u=v),v>g&&(g=v);const T=i[y+2],b=i[y+3],A=T-b,D=T+b;A<o&&(o=A),D>c&&(c=D),T<d&&(d=T),T>x&&(x=T);const I=i[y+4],U=i[y+5],F=I-U,V=I+U;F<a&&(a=F),V>h&&(h=V),I<f&&(f=I),I>m&&(m=I)}n[0]=r,n[1]=o,n[2]=a,n[3]=l,n[4]=c,n[5]=h,s[0]=u,s[1]=d,s[2]=f,s[3]=g,s[4]=x,s[5]=m}function md(i,t,e=null,n=null,s=null){const r=i.attributes.position,o=i.index?i.index.array:null,a=r.normalized;if(s===null)s=new Float32Array(e*6),s.offset=t;else if(t<0||e+t>s.length/6)throw new Error("MeshBVH: compute triangle bounds range is invalid.");const l=r.array,c=r.offset||0;let h=3;r.isInterleavedBufferAttribute&&(h=r.data.stride);const u=["getX","getY","getZ"],d=s.offset;for(let f=t,g=t+e;f<g;f++){const m=(n?n[f]:f)*3,p=(f-d)*6;let y=m+0,_=m+1,v=m+2;o&&(y=o[y],_=o[_],v=o[v]),a||(y=y*h+c,_=_*h+c,v=v*h+c);for(let S=0;S<3;S++){let E,M,T;a?(E=r[u[S]](y),M=r[u[S]](_),T=r[u[S]](v)):(E=l[y+S],M=l[_+S],T=l[v+S]);let b=E;M<b&&(b=M),T<b&&(b=T);let A=E;M>A&&(A=M),T>A&&(A=T);const D=(A-b)/2,I=S*2;s[p+I+0]=b+D,s[p+I+1]=D+(Math.abs(b)+D)*DS}}return s}function ye(i,t,e){return e.min.x=t[i],e.min.y=t[i+1],e.min.z=t[i+2],e.max.x=t[i+3],e.max.y=t[i+4],e.max.z=t[i+5],e}function gd(i){let t=-1,e=-1/0;for(let n=0;n<3;n++){const s=i[n+3]-i[n];s>e&&(e=s,t=n)}return t}function xd(i,t){t.set(i)}function _d(i,t,e){let n,s;for(let r=0;r<3;r++){const o=r+3;n=i[r],s=t[r],e[r]=n<s?n:s,n=i[o],s=t[o],e[o]=n>s?n:s}}function Ho(i,t,e){for(let n=0;n<3;n++){const s=t[i+2*n],r=t[i+2*n+1],o=s-r,a=s+r;o<e[n]&&(e[n]=o),a>e[n+3]&&(e[n+3]=a)}}function Pr(i){const t=i[3]-i[0],e=i[4]-i[1],n=i[5]-i[2];return 2*(t*e+e*n+n*t)}const gi=32,US=(i,t)=>i.candidate-t.candidate,Bi=new Array(gi).fill().map(()=>({count:0,bounds:new Float32Array(6),rightCacheBounds:new Float32Array(6),leftCacheBounds:new Float32Array(6),candidate:0})),Wo=new Float32Array(6);function FS(i,t,e,n,s,r){let o=-1,a=0;if(r===qf)o=gd(t),o!==-1&&(a=(t[o]+t[o+3])/2);else if(r===RS)o=gd(i),o!==-1&&(a=OS(e,n,s,o));else if(r===LS){const l=Pr(i);let c=Ll*s;const h=e.offset||0,u=(n-h)*6,d=(n+s-h)*6;for(let f=0;f<3;f++){const g=t[f],p=(t[f+3]-g)/gi;if(s<gi/4){const y=[...Bi];y.length=s;let _=0;for(let S=u;S<d;S+=6,_++){const E=y[_];E.candidate=e[S+2*f],E.count=0;const{bounds:M,leftCacheBounds:T,rightCacheBounds:b}=E;for(let A=0;A<3;A++)b[A]=1/0,b[A+3]=-1/0,T[A]=1/0,T[A+3]=-1/0,M[A]=1/0,M[A+3]=-1/0;Ho(S,e,M)}y.sort(US);let v=s;for(let S=0;S<v;S++){const E=y[S];for(;S+1<v&&y[S+1].candidate===E.candidate;)y.splice(S+1,1),v--}for(let S=u;S<d;S+=6){const E=e[S+2*f];for(let M=0;M<v;M++){const T=y[M];E>=T.candidate?Ho(S,e,T.rightCacheBounds):(Ho(S,e,T.leftCacheBounds),T.count++)}}for(let S=0;S<v;S++){const E=y[S],M=E.count,T=s-E.count,b=E.leftCacheBounds,A=E.rightCacheBounds;let D=0;M!==0&&(D=Pr(b)/l);let I=0;T!==0&&(I=Pr(A)/l);const U=fd+Ll*(D*M+I*T);U<c&&(o=f,c=U,a=E.candidate)}}else{for(let v=0;v<gi;v++){const S=Bi[v];S.count=0,S.candidate=g+p+v*p;const E=S.bounds;for(let M=0;M<3;M++)E[M]=1/0,E[M+3]=-1/0}for(let v=u;v<d;v+=6){let M=~~((e[v+2*f]-g)/p);M>=gi&&(M=gi-1);const T=Bi[M];T.count++,Ho(v,e,T.bounds)}const y=Bi[gi-1];xd(y.bounds,y.rightCacheBounds);for(let v=gi-2;v>=0;v--){const S=Bi[v],E=Bi[v+1];_d(S.bounds,E.rightCacheBounds,S.rightCacheBounds)}let _=0;for(let v=0;v<gi-1;v++){const S=Bi[v],E=S.count,M=S.bounds,b=Bi[v+1].rightCacheBounds;E!==0&&(_===0?xd(M,Wo):_d(M,Wo,Wo)),_+=E;let A=0,D=0;_!==0&&(A=Pr(Wo)/l);const I=s-_;I!==0&&(D=Pr(b)/l);const U=fd+Ll*(A*_+D*I);U<c&&(o=f,c=U,a=S.candidate)}}}}else console.warn(`MeshBVH: Invalid build strategy value ${r} used.`);return{axis:o,pos:a}}function OS(i,t,e,n){let s=0;const r=i.offset;for(let o=t,a=t+e;o<a;o++)s+=i[(o-r)*6+n*2];return s/e}class Nl{constructor(){this.boundingData=new Float32Array(6)}}function kS(i,t,e,n,s,r){let o=n,a=n+s-1;const l=r.pos,c=r.axis*2,h=e.offset||0;for(;;){for(;o<=a&&e[(o-h)*6+c]<l;)o++;for(;o<=a&&e[(a-h)*6+c]>=l;)a--;if(o<a){for(let u=0;u<3;u++){let d=t[o*3+u];t[o*3+u]=t[a*3+u],t[a*3+u]=d}for(let u=0;u<6;u++){const d=o-h,f=a-h,g=e[d*6+u];e[d*6+u]=e[f*6+u],e[f*6+u]=g}o++,a--}else return o}}function zS(i,t,e,n,s,r){let o=n,a=n+s-1;const l=r.pos,c=r.axis*2,h=e.offset||0;for(;;){for(;o<=a&&e[(o-h)*6+c]<l;)o++;for(;o<=a&&e[(a-h)*6+c]>=l;)a--;if(o<a){let u=i[o];i[o]=i[a],i[a]=u;for(let d=0;d<6;d++){const f=o-h,g=a-h,x=e[f*6+d];e[f*6+d]=e[g*6+d],e[g*6+d]=x}o++,a--}else return o}}let jf,_a,Qc,Kf;const VS=Math.pow(2,32);function th(i){return"count"in i?1:1+th(i.left)+th(i.right)}function GS(i,t,e){return jf=new Float32Array(e),_a=new Uint32Array(e),Qc=new Uint16Array(e),Kf=new Uint8Array(e),eh(i,t)}function eh(i,t){const e=i/4,n=i/2,s="count"in t,r=t.boundingData;for(let o=0;o<6;o++)jf[e+o]=r[o];if(s)return t.buffer?(Kf.set(new Uint8Array(t.buffer),i),i+t.buffer.byteLength):(_a[e+6]=t.offset,Qc[n+14]=t.count,Qc[n+15]=$f,i+en);{const{left:o,right:a,splitAxis:l}=t,c=i+en;let h=eh(c,o);const u=i/en,f=h/en-u;if(f>VS)throw new Error("MeshBVH: Cannot store relative child node offset greater than 32 bits.");return _a[e+6]=f,_a[e+7]=l,eh(h,a)}}function HS(i,t,e){const s=(i.index?i.index.count:i.attributes.position.count)/3>2**16,r=e.reduce((h,u)=>h+u.count,0),o=s?4:2,a=t?new SharedArrayBuffer(r*o):new ArrayBuffer(r*o),l=s?new Uint32Array(a):new Uint16Array(a);let c=0;for(let h=0;h<e.length;h++){const{offset:u,count:d}=e[h];for(let f=0;f<d;f++)l[c+f]=u+f;c+=d}return l}function WS(i,t,e,n,s){const{maxDepth:r,verbose:o,maxLeafTris:a,strategy:l,onProgress:c,indirect:h}=s,u=i._indirectBuffer,d=i.geometry,f=d.index?d.index.array:null,g=h?zS:kS,x=Ps(d),m=new Float32Array(6);let p=!1;const y=new Nl;return Il(t,e,n,y.boundingData,m),v(y,e,n,m),y;function _(S){c&&c(S/x)}function v(S,E,M,T=null,b=0){if(!p&&b>=r&&(p=!0,o&&(console.warn(`MeshBVH: Max depth of ${r} reached when generating BVH. Consider increasing maxDepth.`),console.warn(d))),M<=a||b>=r)return _(E+M),S.offset=E,S.count=M,S;const A=FS(S.boundingData,T,t,E,M,l);if(A.axis===-1)return _(E+M),S.offset=E,S.count=M,S;const D=g(u,f,t,E,M,A);if(D===E||D===E+M)_(E+M),S.offset=E,S.count=M;else{S.splitAxis=A.axis;const I=new Nl,U=E,F=D-E;S.left=I,Il(t,U,F,I.boundingData,m),v(I,U,F,m,b+1);const V=new Nl,G=D,k=M-F;S.right=V,Il(t,G,k,V.boundingData,m),v(V,G,k,m,b+1)}return S}}function XS(i,t){const e=t.useSharedArrayBuffer?SharedArrayBuffer:ArrayBuffer,n=i.geometry;let s,r;if(t.indirect){const o=pd(n,t.range),a=HS(n,t.useSharedArrayBuffer,o);i._indirectBuffer=a,s=md(n,0,a.length,a),r=[{offset:0,count:a.length}]}else{BS(n,t);const o=Zf(n,t.range)[0];s=md(n,o.offset,o.count),r=pd(n,t.range)}i._roots=r.map(o=>{const a=WS(i,s,o.offset,o.count,t),l=th(a),c=new e(en*l);return GS(0,a,c),c})}class Ci{constructor(){this.min=1/0,this.max=-1/0}setFromPointsField(t,e){let n=1/0,s=-1/0;for(let r=0,o=t.length;r<o;r++){const l=t[r][e];n=l<n?l:n,s=l>s?l:s}this.min=n,this.max=s}setFromPoints(t,e){let n=1/0,s=-1/0;for(let r=0,o=e.length;r<o;r++){const a=e[r],l=t.dot(a);n=l<n?l:n,s=l>s?l:s}this.min=n,this.max=s}isSeparated(t){return this.min>t.max||t.min>this.max}}Ci.prototype.setFromBox=function(){const i=new N;return function(e,n){const s=n.min,r=n.max;let o=1/0,a=-1/0;for(let l=0;l<=1;l++)for(let c=0;c<=1;c++)for(let h=0;h<=1;h++){i.x=s.x*l+r.x*(1-l),i.y=s.y*c+r.y*(1-c),i.z=s.z*h+r.z*(1-h);const u=e.dot(i);o=Math.min(u,o),a=Math.max(u,a)}this.min=o,this.max=a}}();const YS=function(){const i=new N,t=new N,e=new N;return function(s,r,o){const a=s.start,l=i,c=r.start,h=t;e.subVectors(a,c),i.subVectors(s.end,s.start),t.subVectors(r.end,r.start);const u=e.dot(h),d=h.dot(l),f=h.dot(h),g=e.dot(l),m=l.dot(l)*f-d*d;let p,y;m!==0?p=(u*d-g*f)/m:p=0,y=(u+p*d)/f,o.x=p,o.y=y}}(),Lh=function(){const i=new it,t=new N,e=new N;return function(s,r,o,a){YS(s,r,i);let l=i.x,c=i.y;if(l>=0&&l<=1&&c>=0&&c<=1){s.at(l,o),r.at(c,a);return}else if(l>=0&&l<=1){c<0?r.at(0,a):r.at(1,a),s.closestPointToPoint(a,!0,o);return}else if(c>=0&&c<=1){l<0?s.at(0,o):s.at(1,o),r.closestPointToPoint(o,!0,a);return}else{let h;l<0?h=s.start:h=s.end;let u;c<0?u=r.start:u=r.end;const d=t,f=e;if(s.closestPointToPoint(u,!0,t),r.closestPointToPoint(h,!0,e),d.distanceToSquared(u)<=f.distanceToSquared(h)){o.copy(d),a.copy(u);return}else{o.copy(h),a.copy(f);return}}}}(),qS=function(){const i=new N,t=new N,e=new kn,n=new In;return function(r,o){const{radius:a,center:l}=r,{a:c,b:h,c:u}=o;if(n.start=c,n.end=h,n.closestPointToPoint(l,!0,i).distanceTo(l)<=a||(n.start=c,n.end=u,n.closestPointToPoint(l,!0,i).distanceTo(l)<=a)||(n.start=h,n.end=u,n.closestPointToPoint(l,!0,i).distanceTo(l)<=a))return!0;const x=o.getPlane(e);if(Math.abs(x.distanceToPoint(l))<=a){const p=x.projectPoint(l,t);if(o.containsPoint(p))return!0}return!1}}(),$S=["x","y","z"],xi=1e-15,vd=xi*xi;function En(i){return Math.abs(i)<xi}class Nn extends me{constructor(...t){super(...t),this.isExtendedTriangle=!0,this.satAxes=new Array(4).fill().map(()=>new N),this.satBounds=new Array(4).fill().map(()=>new Ci),this.points=[this.a,this.b,this.c],this.plane=new kn,this.isDegenerateIntoSegment=!1,this.isDegenerateIntoPoint=!1,this.degenerateSegment=new In,this.needsUpdate=!0}intersectsSphere(t){return qS(t,this)}update(){const t=this.a,e=this.b,n=this.c,s=this.points,r=this.satAxes,o=this.satBounds,a=r[0],l=o[0];this.getNormal(a),l.setFromPoints(a,s);const c=r[1],h=o[1];c.subVectors(t,e),h.setFromPoints(c,s);const u=r[2],d=o[2];u.subVectors(e,n),d.setFromPoints(u,s);const f=r[3],g=o[3];f.subVectors(n,t),g.setFromPoints(f,s);const x=c.length(),m=u.length(),p=f.length();this.isDegenerateIntoPoint=!1,this.isDegenerateIntoSegment=!1,x<xi?m<xi||p<xi?this.isDegenerateIntoPoint=!0:(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(t),this.degenerateSegment.end.copy(n)):m<xi?p<xi?this.isDegenerateIntoPoint=!0:(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(e),this.degenerateSegment.end.copy(t)):p<xi&&(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(n),this.degenerateSegment.end.copy(e)),this.plane.setFromNormalAndCoplanarPoint(a,t),this.needsUpdate=!1}}Nn.prototype.closestPointToSegment=function(){const i=new N,t=new N,e=new In;return function(s,r=null,o=null){const{start:a,end:l}=s,c=this.points;let h,u=1/0;for(let d=0;d<3;d++){const f=(d+1)%3;e.start.copy(c[d]),e.end.copy(c[f]),Lh(e,s,i,t),h=i.distanceToSquared(t),h<u&&(u=h,r&&r.copy(i),o&&o.copy(t))}return this.closestPointToPoint(a,i),h=a.distanceToSquared(i),h<u&&(u=h,r&&r.copy(i),o&&o.copy(a)),this.closestPointToPoint(l,i),h=l.distanceToSquared(i),h<u&&(u=h,r&&r.copy(i),o&&o.copy(l)),Math.sqrt(u)}}();Nn.prototype.intersectsTriangle=function(){const i=new Nn,t=new Ci,e=new Ci,n=new N,s=new N,r=new N,o=new N,a=new In,l=new In,c=new N,h=new it,u=new it;function d(_,v,S,E){const M=n;!_.isDegenerateIntoPoint&&!_.isDegenerateIntoSegment?M.copy(_.plane.normal):M.copy(v.plane.normal);const T=_.satBounds,b=_.satAxes;for(let I=1;I<4;I++){const U=T[I],F=b[I];if(t.setFromPoints(F,v.points),U.isSeparated(t)||(o.copy(M).cross(F),t.setFromPoints(o,_.points),e.setFromPoints(o,v.points),t.isSeparated(e)))return!1}const A=v.satBounds,D=v.satAxes;for(let I=1;I<4;I++){const U=A[I],F=D[I];if(t.setFromPoints(F,_.points),U.isSeparated(t)||(o.crossVectors(M,F),t.setFromPoints(o,_.points),e.setFromPoints(o,v.points),t.isSeparated(e)))return!1}return S&&(E||console.warn("ExtendedTriangle.intersectsTriangle: Triangles are coplanar which does not support an output edge. Setting edge to 0, 0, 0."),S.start.set(0,0,0),S.end.set(0,0,0)),!0}function f(_,v,S,E,M,T,b,A,D,I,U){let F=b/(b-A);I.x=E+(M-E)*F,U.start.subVectors(v,_).multiplyScalar(F).add(_),F=b/(b-D),I.y=E+(T-E)*F,U.end.subVectors(S,_).multiplyScalar(F).add(_)}function g(_,v,S,E,M,T,b,A,D,I,U){if(M>0)f(_.c,_.a,_.b,E,v,S,D,b,A,I,U);else if(T>0)f(_.b,_.a,_.c,S,v,E,A,b,D,I,U);else if(A*D>0||b!=0)f(_.a,_.b,_.c,v,S,E,b,A,D,I,U);else if(A!=0)f(_.b,_.a,_.c,S,v,E,A,b,D,I,U);else if(D!=0)f(_.c,_.a,_.b,E,v,S,D,b,A,I,U);else return!0;return!1}function x(_,v,S,E){const M=v.degenerateSegment,T=_.plane.distanceToPoint(M.start),b=_.plane.distanceToPoint(M.end);return En(T)?En(b)?d(_,v,S,E):(S&&(S.start.copy(M.start),S.end.copy(M.start)),_.containsPoint(M.start)):En(b)?(S&&(S.start.copy(M.end),S.end.copy(M.end)),_.containsPoint(M.end)):_.plane.intersectLine(M,n)!=null?(S&&(S.start.copy(n),S.end.copy(n)),_.containsPoint(n)):!1}function m(_,v,S){const E=v.a;return En(_.plane.distanceToPoint(E))&&_.containsPoint(E)?(S&&(S.start.copy(E),S.end.copy(E)),!0):!1}function p(_,v,S){const E=_.degenerateSegment,M=v.a;return E.closestPointToPoint(M,!0,n),M.distanceToSquared(n)<vd?(S&&(S.start.copy(M),S.end.copy(M)),!0):!1}function y(_,v,S,E){if(_.isDegenerateIntoSegment)if(v.isDegenerateIntoSegment){const M=_.degenerateSegment,T=v.degenerateSegment,b=s,A=r;M.delta(b),T.delta(A);const D=n.subVectors(T.start,M.start),I=b.x*A.y-b.y*A.x;if(En(I))return!1;const U=(D.x*A.y-D.y*A.x)/I,F=-(b.x*D.y-b.y*D.x)/I;if(U<0||U>1||F<0||F>1)return!1;const V=M.start.z+b.z*U,G=T.start.z+A.z*F;return En(V-G)?(S&&(S.start.copy(M.start).addScaledVector(b,U),S.end.copy(M.start).addScaledVector(b,U)),!0):!1}else return v.isDegenerateIntoPoint?p(_,v,S):x(v,_,S,E);else{if(_.isDegenerateIntoPoint)return v.isDegenerateIntoPoint?v.a.distanceToSquared(_.a)<vd?(S&&(S.start.copy(_.a),S.end.copy(_.a)),!0):!1:v.isDegenerateIntoSegment?p(v,_,S):m(v,_,S);if(v.isDegenerateIntoPoint)return m(_,v,S);if(v.isDegenerateIntoSegment)return x(_,v,S,E)}}return function(v,S=null,E=!1){this.needsUpdate&&this.update(),v.isExtendedTriangle?v.needsUpdate&&v.update():(i.copy(v),i.update(),v=i);const M=y(this,v,S,E);if(M!==void 0)return M;const T=this.plane,b=v.plane;let A=b.distanceToPoint(this.a),D=b.distanceToPoint(this.b),I=b.distanceToPoint(this.c);En(A)&&(A=0),En(D)&&(D=0),En(I)&&(I=0);const U=A*D,F=A*I;if(U>0&&F>0)return!1;let V=T.distanceToPoint(v.a),G=T.distanceToPoint(v.b),k=T.distanceToPoint(v.c);En(V)&&(V=0),En(G)&&(G=0),En(k)&&(k=0);const X=V*G,ht=V*k;if(X>0&&ht>0)return!1;s.copy(T.normal),r.copy(b.normal);const st=s.cross(r);let gt=0,Ot=Math.abs(st.x);const Ht=Math.abs(st.y);Ht>Ot&&(Ot=Ht,gt=1),Math.abs(st.z)>Ot&&(gt=2);const z=$S[gt],R=this.a[z],P=this.b[z],$=this.c[z],nt=v.a[z],Y=v.b[z],rt=v.c[z];if(g(this,R,P,$,U,F,A,D,I,h,a))return d(this,v,S,E);if(g(v,nt,Y,rt,X,ht,V,G,k,u,l))return d(this,v,S,E);if(h.y<h.x){const xt=h.y;h.y=h.x,h.x=xt,c.copy(a.start),a.start.copy(a.end),a.end.copy(c)}if(u.y<u.x){const xt=u.y;u.y=u.x,u.x=xt,c.copy(l.start),l.start.copy(l.end),l.end.copy(c)}return h.y<u.x||u.y<h.x?!1:(S&&(u.x>h.x?S.start.copy(l.start):S.start.copy(a.start),u.y<h.y?S.end.copy(l.end):S.end.copy(a.end)),!0)}}();Nn.prototype.distanceToPoint=function(){const i=new N;return function(e){return this.closestPointToPoint(e,i),e.distanceTo(i)}}();Nn.prototype.distanceToTriangle=function(){const i=new N,t=new N,e=["a","b","c"],n=new In,s=new In;return function(o,a=null,l=null){const c=a||l?n:null;if(this.intersectsTriangle(o,c))return(a||l)&&(a&&c.getCenter(a),l&&c.getCenter(l)),0;let h=1/0;for(let u=0;u<3;u++){let d;const f=e[u],g=o[f];this.closestPointToPoint(g,i),d=g.distanceToSquared(i),d<h&&(h=d,a&&a.copy(i),l&&l.copy(g));const x=this[f];o.closestPointToPoint(x,i),d=x.distanceToSquared(i),d<h&&(h=d,a&&a.copy(x),l&&l.copy(i))}for(let u=0;u<3;u++){const d=e[u],f=e[(u+1)%3];n.set(this[d],this[f]);for(let g=0;g<3;g++){const x=e[g],m=e[(g+1)%3];s.set(o[x],o[m]),Lh(n,s,i,t);const p=i.distanceToSquared(t);p<h&&(h=p,a&&a.copy(i),l&&l.copy(t))}}return Math.sqrt(h)}}();class rn{constructor(t,e,n){this.isOrientedBox=!0,this.min=new N,this.max=new N,this.matrix=new Zt,this.invMatrix=new Zt,this.points=new Array(8).fill().map(()=>new N),this.satAxes=new Array(3).fill().map(()=>new N),this.satBounds=new Array(3).fill().map(()=>new Ci),this.alignedSatBounds=new Array(3).fill().map(()=>new Ci),this.needsUpdate=!1,t&&this.min.copy(t),e&&this.max.copy(e),n&&this.matrix.copy(n)}set(t,e,n){this.min.copy(t),this.max.copy(e),this.matrix.copy(n),this.needsUpdate=!0}copy(t){this.min.copy(t.min),this.max.copy(t.max),this.matrix.copy(t.matrix),this.needsUpdate=!0}}rn.prototype.update=function(){return function(){const t=this.matrix,e=this.min,n=this.max,s=this.points;for(let c=0;c<=1;c++)for(let h=0;h<=1;h++)for(let u=0;u<=1;u++){const d=1*c|2*h|4*u,f=s[d];f.x=c?n.x:e.x,f.y=h?n.y:e.y,f.z=u?n.z:e.z,f.applyMatrix4(t)}const r=this.satBounds,o=this.satAxes,a=s[0];for(let c=0;c<3;c++){const h=o[c],u=r[c],d=1<<c,f=s[d];h.subVectors(a,f),u.setFromPoints(h,s)}const l=this.alignedSatBounds;l[0].setFromPointsField(s,"x"),l[1].setFromPointsField(s,"y"),l[2].setFromPointsField(s,"z"),this.invMatrix.copy(this.matrix).invert(),this.needsUpdate=!1}}();rn.prototype.intersectsBox=function(){const i=new Ci;return function(e){this.needsUpdate&&this.update();const n=e.min,s=e.max,r=this.satBounds,o=this.satAxes,a=this.alignedSatBounds;if(i.min=n.x,i.max=s.x,a[0].isSeparated(i)||(i.min=n.y,i.max=s.y,a[1].isSeparated(i))||(i.min=n.z,i.max=s.z,a[2].isSeparated(i)))return!1;for(let l=0;l<3;l++){const c=o[l],h=r[l];if(i.setFromBox(c,e),h.isSeparated(i))return!1}return!0}}();rn.prototype.intersectsTriangle=function(){const i=new Nn,t=new Array(3),e=new Ci,n=new Ci,s=new N;return function(o){this.needsUpdate&&this.update(),o.isExtendedTriangle?o.needsUpdate&&o.update():(i.copy(o),i.update(),o=i);const a=this.satBounds,l=this.satAxes;t[0]=o.a,t[1]=o.b,t[2]=o.c;for(let d=0;d<3;d++){const f=a[d],g=l[d];if(e.setFromPoints(g,t),f.isSeparated(e))return!1}const c=o.satBounds,h=o.satAxes,u=this.points;for(let d=0;d<3;d++){const f=c[d],g=h[d];if(e.setFromPoints(g,u),f.isSeparated(e))return!1}for(let d=0;d<3;d++){const f=l[d];for(let g=0;g<4;g++){const x=h[g];if(s.crossVectors(f,x),e.setFromPoints(s,t),n.setFromPoints(s,u),e.isSeparated(n))return!1}}return!0}}();rn.prototype.closestPointToPoint=function(){return function(t,e){return this.needsUpdate&&this.update(),e.copy(t).applyMatrix4(this.invMatrix).clamp(this.min,this.max).applyMatrix4(this.matrix),e}}();rn.prototype.distanceToPoint=function(){const i=new N;return function(e){return this.closestPointToPoint(e,i),e.distanceTo(i)}}();rn.prototype.distanceToBox=function(){const i=["x","y","z"],t=new Array(12).fill().map(()=>new In),e=new Array(12).fill().map(()=>new In),n=new N,s=new N;return function(o,a=0,l=null,c=null){if(this.needsUpdate&&this.update(),this.intersectsBox(o))return(l||c)&&(o.getCenter(s),this.closestPointToPoint(s,n),o.closestPointToPoint(n,s),l&&l.copy(n),c&&c.copy(s)),0;const h=a*a,u=o.min,d=o.max,f=this.points;let g=1/0;for(let m=0;m<8;m++){const p=f[m];s.copy(p).clamp(u,d);const y=p.distanceToSquared(s);if(y<g&&(g=y,l&&l.copy(p),c&&c.copy(s),y<h))return Math.sqrt(y)}let x=0;for(let m=0;m<3;m++)for(let p=0;p<=1;p++)for(let y=0;y<=1;y++){const _=(m+1)%3,v=(m+2)%3,S=p<<_|y<<v,E=1<<m|p<<_|y<<v,M=f[S],T=f[E];t[x].set(M,T);const A=i[m],D=i[_],I=i[v],U=e[x],F=U.start,V=U.end;F[A]=u[A],F[D]=p?u[D]:d[D],F[I]=y?u[I]:d[D],V[A]=d[A],V[D]=p?u[D]:d[D],V[I]=y?u[I]:d[D],x++}for(let m=0;m<=1;m++)for(let p=0;p<=1;p++)for(let y=0;y<=1;y++){s.x=m?d.x:u.x,s.y=p?d.y:u.y,s.z=y?d.z:u.z,this.closestPointToPoint(s,n);const _=s.distanceToSquared(n);if(_<g&&(g=_,l&&l.copy(n),c&&c.copy(s),_<h))return Math.sqrt(_)}for(let m=0;m<12;m++){const p=t[m];for(let y=0;y<12;y++){const _=e[y];Lh(p,_,n,s);const v=n.distanceToSquared(s);if(v<g&&(g=v,l&&l.copy(n),c&&c.copy(s),v<h))return Math.sqrt(v)}}return Math.sqrt(g)}}();class Dh{constructor(t){this._getNewPrimitive=t,this._primitives=[]}getPrimitive(){const t=this._primitives;return t.length===0?this._getNewPrimitive():t.pop()}releasePrimitive(t){this._primitives.push(t)}}class ZS extends Dh{constructor(){super(()=>new Nn)}}const Pn=new ZS;function Fe(i,t){return t[i+15]===$f}function vn(i,t){return t[i+6]}function Rn(i,t){return t[i+14]}function Ve(i){return i+Ue}function Ge(i,t){const e=t[i+6];return i+e*Ue}function Ih(i,t){return t[i+7]}class jS{constructor(){this.float32Array=null,this.uint16Array=null,this.uint32Array=null;const t=[];let e=null;this.setBuffer=n=>{e&&t.push(e),e=n,this.float32Array=new Float32Array(n),this.uint16Array=new Uint16Array(n),this.uint32Array=new Uint32Array(n)},this.clearBuffer=()=>{e=null,this.float32Array=null,this.uint16Array=null,this.uint32Array=null,t.length!==0&&this.setBuffer(t.pop())}}}const ge=new jS;let Hi,ir;const qs=[],Xo=new Dh(()=>new We);function KS(i,t,e,n,s,r){Hi=Xo.getPrimitive(),ir=Xo.getPrimitive(),qs.push(Hi,ir),ge.setBuffer(i._roots[t]);const o=nh(0,i.geometry,e,n,s,r);ge.clearBuffer(),Xo.releasePrimitive(Hi),Xo.releasePrimitive(ir),qs.pop(),qs.pop();const a=qs.length;return a>0&&(ir=qs[a-1],Hi=qs[a-2]),o}function nh(i,t,e,n,s=null,r=0,o=0){const{float32Array:a,uint16Array:l,uint32Array:c}=ge;let h=i*2;if(Fe(h,l)){const g=vn(i,c),x=Rn(h,l);return ye(i,a,Hi),n(g,x,!1,o,r+i/Ue,Hi)}else{let I=function(F){const{uint16Array:V,uint32Array:G}=ge;let k=F*2;for(;!Fe(k,V);)F=Ve(F),k=F*2;return vn(F,G)},U=function(F){const{uint16Array:V,uint32Array:G}=ge;let k=F*2;for(;!Fe(k,V);)F=Ge(F,G),k=F*2;return vn(F,G)+Rn(k,V)};var d=I,f=U;const g=Ve(i),x=Ge(i,c);let m=g,p=x,y,_,v,S;if(s&&(v=Hi,S=ir,ye(m,a,v),ye(p,a,S),y=s(v),_=s(S),_<y)){m=x,p=g;const F=y;y=_,_=F,v=S}v||(v=Hi,ye(m,a,v));const E=Fe(m*2,l),M=e(v,E,y,o+1,r+m/Ue);let T;if(M===dd){const F=I(m),G=U(m)-F;T=n(F,G,!0,o+1,r+m/Ue,v)}else T=M&&nh(m,t,e,n,s,r,o+1);if(T)return!0;S=ir,ye(p,a,S);const b=Fe(p*2,l),A=e(S,b,_,o+1,r+p/Ue);let D;if(A===dd){const F=I(p),G=U(p)-F;D=n(F,G,!0,o+1,r+p/Ue,S)}else D=A&&nh(p,t,e,n,s,r,o+1);return!!D}}const Rr=new N,Bl=new N;function JS(i,t,e={},n=0,s=1/0){const r=n*n,o=s*s;let a=1/0,l=null;if(i.shapecast({boundsTraverseOrder:h=>(Rr.copy(t).clamp(h.min,h.max),Rr.distanceToSquared(t)),intersectsBounds:(h,u,d)=>d<a&&d<o,intersectsTriangle:(h,u)=>{h.closestPointToPoint(t,Rr);const d=t.distanceToSquared(Rr);return d<a&&(Bl.copy(Rr),a=d,l=u),d<r}}),a===1/0)return null;const c=Math.sqrt(a);return e.point?e.point.copy(Bl):e.point=Bl.clone(),e.distance=c,e.faceIndex=l,e}const Yo=parseInt(oo)>=169,QS=parseInt(oo)<=161,as=new N,ls=new N,cs=new N,qo=new it,$o=new it,Zo=new it,yd=new N,Sd=new N,bd=new N,Lr=new N;function tb(i,t,e,n,s,r,o,a){let l;if(r===nn?l=i.intersectTriangle(n,e,t,!0,s):l=i.intersectTriangle(t,e,n,r!==Cn,s),l===null)return null;const c=i.origin.distanceTo(s);return c<o||c>a?null:{distance:c,point:s.clone()}}function Md(i,t,e,n,s,r,o,a,l,c,h){as.fromBufferAttribute(t,r),ls.fromBufferAttribute(t,o),cs.fromBufferAttribute(t,a);const u=tb(i,as,ls,cs,Lr,l,c,h);if(u){if(n){qo.fromBufferAttribute(n,r),$o.fromBufferAttribute(n,o),Zo.fromBufferAttribute(n,a),u.uv=new it;const f=me.getInterpolation(Lr,as,ls,cs,qo,$o,Zo,u.uv);Yo||(u.uv=f)}if(s){qo.fromBufferAttribute(s,r),$o.fromBufferAttribute(s,o),Zo.fromBufferAttribute(s,a),u.uv1=new it;const f=me.getInterpolation(Lr,as,ls,cs,qo,$o,Zo,u.uv1);Yo||(u.uv1=f),QS&&(u.uv2=u.uv1)}if(e){yd.fromBufferAttribute(e,r),Sd.fromBufferAttribute(e,o),bd.fromBufferAttribute(e,a),u.normal=new N;const f=me.getInterpolation(Lr,as,ls,cs,yd,Sd,bd,u.normal);u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1),Yo||(u.normal=f)}const d={a:r,b:o,c:a,normal:new N,materialIndex:0};if(me.getNormal(as,ls,cs,d.normal),u.face=d,u.faceIndex=r,Yo){const f=new N;me.getBarycoord(Lr,as,ls,cs,f),u.barycoord=f}}return u}function Ed(i){return i&&i.isMaterial?i.side:i}function ka(i,t,e,n,s,r,o){const a=n*3;let l=a+0,c=a+1,h=a+2;const{index:u,groups:d}=i;i.index&&(l=u.getX(l),c=u.getX(c),h=u.getX(h));const{position:f,normal:g,uv:x,uv1:m}=i.attributes;if(Array.isArray(t)){const p=n*3;for(let y=0,_=d.length;y<_;y++){const{start:v,count:S,materialIndex:E}=d[y];if(p>=v&&p<v+S){const M=Ed(t[E]),T=Md(e,f,g,x,m,l,c,h,M,r,o);if(T)if(T.faceIndex=n,T.face.materialIndex=E,s)s.push(T);else return T}}}else{const p=Ed(t),y=Md(e,f,g,x,m,l,c,h,p,r,o);if(y)if(y.faceIndex=n,y.face.materialIndex=0,s)s.push(y);else return y}return null}function Ce(i,t,e,n){const s=i.a,r=i.b,o=i.c;let a=t,l=t+1,c=t+2;e&&(a=e.getX(a),l=e.getX(l),c=e.getX(c)),s.x=n.getX(a),s.y=n.getY(a),s.z=n.getZ(a),r.x=n.getX(l),r.y=n.getY(l),r.z=n.getZ(l),o.x=n.getX(c),o.y=n.getY(c),o.z=n.getZ(c)}function eb(i,t,e,n,s,r,o,a){const{geometry:l,_indirectBuffer:c}=i;for(let h=n,u=n+s;h<u;h++)ka(l,t,e,h,r,o,a)}function nb(i,t,e,n,s,r,o){const{geometry:a,_indirectBuffer:l}=i;let c=1/0,h=null;for(let u=n,d=n+s;u<d;u++){let f;f=ka(a,t,e,u,null,r,o),f&&f.distance<c&&(h=f,c=f.distance)}return h}function ib(i,t,e,n,s,r,o){const{geometry:a}=e,{index:l}=a,c=a.attributes.position;for(let h=i,u=t+i;h<u;h++){let d;if(d=h,Ce(o,d*3,l,c),o.needsUpdate=!0,n(o,d,s,r))return!0}return!1}function sb(i,t=null){t&&Array.isArray(t)&&(t=new Set(t));const e=i.geometry,n=e.index?e.index.array:null,s=e.attributes.position;let r,o,a,l,c=0;const h=i._roots;for(let d=0,f=h.length;d<f;d++)r=h[d],o=new Uint32Array(r),a=new Uint16Array(r),l=new Float32Array(r),u(0,c),c+=r.byteLength;function u(d,f,g=!1){const x=d*2;if(Fe(x,a)){const m=o[d+6],p=a[x+14];let y=1/0,_=1/0,v=1/0,S=-1/0,E=-1/0,M=-1/0;for(let T=3*m,b=3*(m+p);T<b;T++){let A=n[T];const D=s.getX(A),I=s.getY(A),U=s.getZ(A);D<y&&(y=D),D>S&&(S=D),I<_&&(_=I),I>E&&(E=I),U<v&&(v=U),U>M&&(M=U)}return l[d+0]!==y||l[d+1]!==_||l[d+2]!==v||l[d+3]!==S||l[d+4]!==E||l[d+5]!==M?(l[d+0]=y,l[d+1]=_,l[d+2]=v,l[d+3]=S,l[d+4]=E,l[d+5]=M,!0):!1}else{const m=Ve(d),p=Ge(d,o);let y=g,_=!1,v=!1;if(t){if(!y){const A=m/Ue+f/en,D=p/Ue+f/en;_=t.has(A),v=t.has(D),y=!_&&!v}}else _=!0,v=!0;const S=y||_,E=y||v;let M=!1;S&&(M=u(m,f,y));let T=!1;E&&(T=u(p,f,y));const b=M||T;if(b)for(let A=0;A<3;A++){const D=m+A,I=p+A,U=l[D],F=l[D+3],V=l[I],G=l[I+3];l[d+A]=U<V?U:V,l[d+A+3]=F>G?F:G}return b}}}function Zi(i,t,e,n,s){let r,o,a,l,c,h;const u=1/e.direction.x,d=1/e.direction.y,f=1/e.direction.z,g=e.origin.x,x=e.origin.y,m=e.origin.z;let p=t[i],y=t[i+3],_=t[i+1],v=t[i+3+1],S=t[i+2],E=t[i+3+2];return u>=0?(r=(p-g)*u,o=(y-g)*u):(r=(y-g)*u,o=(p-g)*u),d>=0?(a=(_-x)*d,l=(v-x)*d):(a=(v-x)*d,l=(_-x)*d),r>l||a>o||((a>r||isNaN(r))&&(r=a),(l<o||isNaN(o))&&(o=l),f>=0?(c=(S-m)*f,h=(E-m)*f):(c=(E-m)*f,h=(S-m)*f),r>h||c>o)?!1:((c>r||r!==r)&&(r=c),(h<o||o!==o)&&(o=h),r<=s&&o>=n)}function rb(i,t,e,n,s,r,o,a){const{geometry:l,_indirectBuffer:c}=i;for(let h=n,u=n+s;h<u;h++){let d=c?c[h]:h;ka(l,t,e,d,r,o,a)}}function ob(i,t,e,n,s,r,o){const{geometry:a,_indirectBuffer:l}=i;let c=1/0,h=null;for(let u=n,d=n+s;u<d;u++){let f;f=ka(a,t,e,l?l[u]:u,null,r,o),f&&f.distance<c&&(h=f,c=f.distance)}return h}function ab(i,t,e,n,s,r,o){const{geometry:a}=e,{index:l}=a,c=a.attributes.position;for(let h=i,u=t+i;h<u;h++){let d;if(d=e.resolveTriangleIndex(h),Ce(o,d*3,l,c),o.needsUpdate=!0,n(o,d,s,r))return!0}return!1}function lb(i,t,e,n,s,r,o){ge.setBuffer(i._roots[t]),ih(0,i,e,n,s,r,o),ge.clearBuffer()}function ih(i,t,e,n,s,r,o){const{float32Array:a,uint16Array:l,uint32Array:c}=ge,h=i*2;if(Fe(h,l)){const d=vn(i,c),f=Rn(h,l);eb(t,e,n,d,f,s,r,o)}else{const d=Ve(i);Zi(d,a,n,r,o)&&ih(d,t,e,n,s,r,o);const f=Ge(i,c);Zi(f,a,n,r,o)&&ih(f,t,e,n,s,r,o)}}const cb=["x","y","z"];function hb(i,t,e,n,s,r){ge.setBuffer(i._roots[t]);const o=sh(0,i,e,n,s,r);return ge.clearBuffer(),o}function sh(i,t,e,n,s,r){const{float32Array:o,uint16Array:a,uint32Array:l}=ge;let c=i*2;if(Fe(c,a)){const u=vn(i,l),d=Rn(c,a);return nb(t,e,n,u,d,s,r)}else{const u=Ih(i,l),d=cb[u],g=n.direction[d]>=0;let x,m;g?(x=Ve(i),m=Ge(i,l)):(x=Ge(i,l),m=Ve(i));const y=Zi(x,o,n,s,r)?sh(x,t,e,n,s,r):null;if(y){const S=y.point[d];if(g?S<=o[m+u]:S>=o[m+u+3])return y}const v=Zi(m,o,n,s,r)?sh(m,t,e,n,s,r):null;return y&&v?y.distance<=v.distance?y:v:y||v||null}}const jo=new We,$s=new Nn,Zs=new Nn,Dr=new Zt,Ad=new rn,Ko=new rn;function ub(i,t,e,n){ge.setBuffer(i._roots[t]);const s=rh(0,i,e,n);return ge.clearBuffer(),s}function rh(i,t,e,n,s=null){const{float32Array:r,uint16Array:o,uint32Array:a}=ge;let l=i*2;if(s===null&&(e.boundingBox||e.computeBoundingBox(),Ad.set(e.boundingBox.min,e.boundingBox.max,n),s=Ad),Fe(l,o)){const h=t.geometry,u=h.index,d=h.attributes.position,f=e.index,g=e.attributes.position,x=vn(i,a),m=Rn(l,o);if(Dr.copy(n).invert(),e.boundsTree)return ye(i,r,Ko),Ko.matrix.copy(Dr),Ko.needsUpdate=!0,e.boundsTree.shapecast({intersectsBounds:y=>Ko.intersectsBox(y),intersectsTriangle:y=>{y.a.applyMatrix4(n),y.b.applyMatrix4(n),y.c.applyMatrix4(n),y.needsUpdate=!0;for(let _=x*3,v=(m+x)*3;_<v;_+=3)if(Ce(Zs,_,u,d),Zs.needsUpdate=!0,y.intersectsTriangle(Zs))return!0;return!1}});{const p=Ps(e);for(let y=x*3,_=(m+x)*3;y<_;y+=3){Ce($s,y,u,d),$s.a.applyMatrix4(Dr),$s.b.applyMatrix4(Dr),$s.c.applyMatrix4(Dr),$s.needsUpdate=!0;for(let v=0,S=p*3;v<S;v+=3)if(Ce(Zs,v,f,g),Zs.needsUpdate=!0,$s.intersectsTriangle(Zs))return!0}}}else{const h=Ve(i),u=Ge(i,a);return ye(h,r,jo),!!(s.intersectsBox(jo)&&rh(h,t,e,n,s)||(ye(u,r,jo),s.intersectsBox(jo)&&rh(u,t,e,n,s)))}}const Jo=new Zt,Ul=new rn,Ir=new rn,db=new N,fb=new N,pb=new N,mb=new N;function gb(i,t,e,n={},s={},r=0,o=1/0){t.boundingBox||t.computeBoundingBox(),Ul.set(t.boundingBox.min,t.boundingBox.max,e),Ul.needsUpdate=!0;const a=i.geometry,l=a.attributes.position,c=a.index,h=t.attributes.position,u=t.index,d=Pn.getPrimitive(),f=Pn.getPrimitive();let g=db,x=fb,m=null,p=null;s&&(m=pb,p=mb);let y=1/0,_=null,v=null;return Jo.copy(e).invert(),Ir.matrix.copy(Jo),i.shapecast({boundsTraverseOrder:S=>Ul.distanceToBox(S),intersectsBounds:(S,E,M)=>M<y&&M<o?(E&&(Ir.min.copy(S.min),Ir.max.copy(S.max),Ir.needsUpdate=!0),!0):!1,intersectsRange:(S,E)=>{if(t.boundsTree)return t.boundsTree.shapecast({boundsTraverseOrder:T=>Ir.distanceToBox(T),intersectsBounds:(T,b,A)=>A<y&&A<o,intersectsRange:(T,b)=>{for(let A=T,D=T+b;A<D;A++){Ce(f,3*A,u,h),f.a.applyMatrix4(e),f.b.applyMatrix4(e),f.c.applyMatrix4(e),f.needsUpdate=!0;for(let I=S,U=S+E;I<U;I++){Ce(d,3*I,c,l),d.needsUpdate=!0;const F=d.distanceToTriangle(f,g,m);if(F<y&&(x.copy(g),p&&p.copy(m),y=F,_=I,v=A),F<r)return!0}}}});{const M=Ps(t);for(let T=0,b=M;T<b;T++){Ce(f,3*T,u,h),f.a.applyMatrix4(e),f.b.applyMatrix4(e),f.c.applyMatrix4(e),f.needsUpdate=!0;for(let A=S,D=S+E;A<D;A++){Ce(d,3*A,c,l),d.needsUpdate=!0;const I=d.distanceToTriangle(f,g,m);if(I<y&&(x.copy(g),p&&p.copy(m),y=I,_=A,v=T),I<r)return!0}}}}}),Pn.releasePrimitive(d),Pn.releasePrimitive(f),y===1/0?null:(n.point?n.point.copy(x):n.point=x.clone(),n.distance=y,n.faceIndex=_,s&&(s.point?s.point.copy(p):s.point=p.clone(),s.point.applyMatrix4(Jo),x.applyMatrix4(Jo),s.distance=x.sub(s.point).length(),s.faceIndex=v),n)}function xb(i,t=null){t&&Array.isArray(t)&&(t=new Set(t));const e=i.geometry,n=e.index?e.index.array:null,s=e.attributes.position;let r,o,a,l,c=0;const h=i._roots;for(let d=0,f=h.length;d<f;d++)r=h[d],o=new Uint32Array(r),a=new Uint16Array(r),l=new Float32Array(r),u(0,c),c+=r.byteLength;function u(d,f,g=!1){const x=d*2;if(Fe(x,a)){const m=o[d+6],p=a[x+14];let y=1/0,_=1/0,v=1/0,S=-1/0,E=-1/0,M=-1/0;for(let T=m,b=m+p;T<b;T++){const A=3*i.resolveTriangleIndex(T);for(let D=0;D<3;D++){let I=A+D;I=n?n[I]:I;const U=s.getX(I),F=s.getY(I),V=s.getZ(I);U<y&&(y=U),U>S&&(S=U),F<_&&(_=F),F>E&&(E=F),V<v&&(v=V),V>M&&(M=V)}}return l[d+0]!==y||l[d+1]!==_||l[d+2]!==v||l[d+3]!==S||l[d+4]!==E||l[d+5]!==M?(l[d+0]=y,l[d+1]=_,l[d+2]=v,l[d+3]=S,l[d+4]=E,l[d+5]=M,!0):!1}else{const m=Ve(d),p=Ge(d,o);let y=g,_=!1,v=!1;if(t){if(!y){const A=m/Ue+f/en,D=p/Ue+f/en;_=t.has(A),v=t.has(D),y=!_&&!v}}else _=!0,v=!0;const S=y||_,E=y||v;let M=!1;S&&(M=u(m,f,y));let T=!1;E&&(T=u(p,f,y));const b=M||T;if(b)for(let A=0;A<3;A++){const D=m+A,I=p+A,U=l[D],F=l[D+3],V=l[I],G=l[I+3];l[d+A]=U<V?U:V,l[d+A+3]=F>G?F:G}return b}}}function _b(i,t,e,n,s,r,o){ge.setBuffer(i._roots[t]),oh(0,i,e,n,s,r,o),ge.clearBuffer()}function oh(i,t,e,n,s,r,o){const{float32Array:a,uint16Array:l,uint32Array:c}=ge,h=i*2;if(Fe(h,l)){const d=vn(i,c),f=Rn(h,l);rb(t,e,n,d,f,s,r,o)}else{const d=Ve(i);Zi(d,a,n,r,o)&&oh(d,t,e,n,s,r,o);const f=Ge(i,c);Zi(f,a,n,r,o)&&oh(f,t,e,n,s,r,o)}}const vb=["x","y","z"];function yb(i,t,e,n,s,r){ge.setBuffer(i._roots[t]);const o=ah(0,i,e,n,s,r);return ge.clearBuffer(),o}function ah(i,t,e,n,s,r){const{float32Array:o,uint16Array:a,uint32Array:l}=ge;let c=i*2;if(Fe(c,a)){const u=vn(i,l),d=Rn(c,a);return ob(t,e,n,u,d,s,r)}else{const u=Ih(i,l),d=vb[u],g=n.direction[d]>=0;let x,m;g?(x=Ve(i),m=Ge(i,l)):(x=Ge(i,l),m=Ve(i));const y=Zi(x,o,n,s,r)?ah(x,t,e,n,s,r):null;if(y){const S=y.point[d];if(g?S<=o[m+u]:S>=o[m+u+3])return y}const v=Zi(m,o,n,s,r)?ah(m,t,e,n,s,r):null;return y&&v?y.distance<=v.distance?y:v:y||v||null}}const Qo=new We,js=new Nn,Ks=new Nn,Nr=new Zt,wd=new rn,ta=new rn;function Sb(i,t,e,n){ge.setBuffer(i._roots[t]);const s=lh(0,i,e,n);return ge.clearBuffer(),s}function lh(i,t,e,n,s=null){const{float32Array:r,uint16Array:o,uint32Array:a}=ge;let l=i*2;if(s===null&&(e.boundingBox||e.computeBoundingBox(),wd.set(e.boundingBox.min,e.boundingBox.max,n),s=wd),Fe(l,o)){const h=t.geometry,u=h.index,d=h.attributes.position,f=e.index,g=e.attributes.position,x=vn(i,a),m=Rn(l,o);if(Nr.copy(n).invert(),e.boundsTree)return ye(i,r,ta),ta.matrix.copy(Nr),ta.needsUpdate=!0,e.boundsTree.shapecast({intersectsBounds:y=>ta.intersectsBox(y),intersectsTriangle:y=>{y.a.applyMatrix4(n),y.b.applyMatrix4(n),y.c.applyMatrix4(n),y.needsUpdate=!0;for(let _=x,v=m+x;_<v;_++)if(Ce(Ks,3*t.resolveTriangleIndex(_),u,d),Ks.needsUpdate=!0,y.intersectsTriangle(Ks))return!0;return!1}});{const p=Ps(e);for(let y=x,_=m+x;y<_;y++){const v=t.resolveTriangleIndex(y);Ce(js,3*v,u,d),js.a.applyMatrix4(Nr),js.b.applyMatrix4(Nr),js.c.applyMatrix4(Nr),js.needsUpdate=!0;for(let S=0,E=p*3;S<E;S+=3)if(Ce(Ks,S,f,g),Ks.needsUpdate=!0,js.intersectsTriangle(Ks))return!0}}}else{const h=Ve(i),u=Ge(i,a);return ye(h,r,Qo),!!(s.intersectsBox(Qo)&&lh(h,t,e,n,s)||(ye(u,r,Qo),s.intersectsBox(Qo)&&lh(u,t,e,n,s)))}}const ea=new Zt,Fl=new rn,Br=new rn,bb=new N,Mb=new N,Eb=new N,Ab=new N;function wb(i,t,e,n={},s={},r=0,o=1/0){t.boundingBox||t.computeBoundingBox(),Fl.set(t.boundingBox.min,t.boundingBox.max,e),Fl.needsUpdate=!0;const a=i.geometry,l=a.attributes.position,c=a.index,h=t.attributes.position,u=t.index,d=Pn.getPrimitive(),f=Pn.getPrimitive();let g=bb,x=Mb,m=null,p=null;s&&(m=Eb,p=Ab);let y=1/0,_=null,v=null;return ea.copy(e).invert(),Br.matrix.copy(ea),i.shapecast({boundsTraverseOrder:S=>Fl.distanceToBox(S),intersectsBounds:(S,E,M)=>M<y&&M<o?(E&&(Br.min.copy(S.min),Br.max.copy(S.max),Br.needsUpdate=!0),!0):!1,intersectsRange:(S,E)=>{if(t.boundsTree){const M=t.boundsTree;return M.shapecast({boundsTraverseOrder:T=>Br.distanceToBox(T),intersectsBounds:(T,b,A)=>A<y&&A<o,intersectsRange:(T,b)=>{for(let A=T,D=T+b;A<D;A++){const I=M.resolveTriangleIndex(A);Ce(f,3*I,u,h),f.a.applyMatrix4(e),f.b.applyMatrix4(e),f.c.applyMatrix4(e),f.needsUpdate=!0;for(let U=S,F=S+E;U<F;U++){const V=i.resolveTriangleIndex(U);Ce(d,3*V,c,l),d.needsUpdate=!0;const G=d.distanceToTriangle(f,g,m);if(G<y&&(x.copy(g),p&&p.copy(m),y=G,_=U,v=A),G<r)return!0}}}})}else{const M=Ps(t);for(let T=0,b=M;T<b;T++){Ce(f,3*T,u,h),f.a.applyMatrix4(e),f.b.applyMatrix4(e),f.c.applyMatrix4(e),f.needsUpdate=!0;for(let A=S,D=S+E;A<D;A++){const I=i.resolveTriangleIndex(A);Ce(d,3*I,c,l),d.needsUpdate=!0;const U=d.distanceToTriangle(f,g,m);if(U<y&&(x.copy(g),p&&p.copy(m),y=U,_=A,v=T),U<r)return!0}}}}}),Pn.releasePrimitive(d),Pn.releasePrimitive(f),y===1/0?null:(n.point?n.point.copy(x):n.point=x.clone(),n.distance=y,n.faceIndex=_,s&&(s.point?s.point.copy(p):s.point=p.clone(),s.point.applyMatrix4(ea),x.applyMatrix4(ea),s.distance=x.sub(s.point).length(),s.faceIndex=v),n)}function Tb(){return typeof SharedArrayBuffer<"u"}const Wr=new ge.constructor,Ca=new ge.constructor,Oi=new Dh(()=>new We),Js=new We,Qs=new We,Ol=new We,kl=new We;let zl=!1;function Cb(i,t,e,n){if(zl)throw new Error("MeshBVH: Recursive calls to bvhcast not supported.");zl=!0;const s=i._roots,r=t._roots;let o,a=0,l=0;const c=new Zt().copy(e).invert();for(let h=0,u=s.length;h<u;h++){Wr.setBuffer(s[h]),l=0;const d=Oi.getPrimitive();ye(0,Wr.float32Array,d),d.applyMatrix4(c);for(let f=0,g=r.length;f<g&&(Ca.setBuffer(r[f]),o=On(0,0,e,c,n,a,l,0,0,d),Ca.clearBuffer(),l+=r[f].byteLength/en,!o);f++);if(Oi.releasePrimitive(d),Wr.clearBuffer(),a+=s[h].byteLength/en,o)break}return zl=!1,o}function On(i,t,e,n,s,r=0,o=0,a=0,l=0,c=null,h=!1){let u,d;h?(u=Ca,d=Wr):(u=Wr,d=Ca);const f=u.float32Array,g=u.uint32Array,x=u.uint16Array,m=d.float32Array,p=d.uint32Array,y=d.uint16Array,_=i*2,v=t*2,S=Fe(_,x),E=Fe(v,y);let M=!1;if(E&&S)h?M=s(vn(t,p),Rn(t*2,y),vn(i,g),Rn(i*2,x),l,o+t/Ue,a,r+i/Ue):M=s(vn(i,g),Rn(i*2,x),vn(t,p),Rn(t*2,y),a,r+i/Ue,l,o+t/Ue);else if(E){const T=Oi.getPrimitive();ye(t,m,T),T.applyMatrix4(e);const b=Ve(i),A=Ge(i,g);ye(b,f,Js),ye(A,f,Qs);const D=T.intersectsBox(Js),I=T.intersectsBox(Qs);M=D&&On(t,b,n,e,s,o,r,l,a+1,T,!h)||I&&On(t,A,n,e,s,o,r,l,a+1,T,!h),Oi.releasePrimitive(T)}else{const T=Ve(t),b=Ge(t,p);ye(T,m,Ol),ye(b,m,kl);const A=c.intersectsBox(Ol),D=c.intersectsBox(kl);if(A&&D)M=On(i,T,e,n,s,r,o,a,l+1,c,h)||On(i,b,e,n,s,r,o,a,l+1,c,h);else if(A)if(S)M=On(i,T,e,n,s,r,o,a,l+1,c,h);else{const I=Oi.getPrimitive();I.copy(Ol).applyMatrix4(e);const U=Ve(i),F=Ge(i,g);ye(U,f,Js),ye(F,f,Qs);const V=I.intersectsBox(Js),G=I.intersectsBox(Qs);M=V&&On(T,U,n,e,s,o,r,l,a+1,I,!h)||G&&On(T,F,n,e,s,o,r,l,a+1,I,!h),Oi.releasePrimitive(I)}else if(D)if(S)M=On(i,b,e,n,s,r,o,a,l+1,c,h);else{const I=Oi.getPrimitive();I.copy(kl).applyMatrix4(e);const U=Ve(i),F=Ge(i,g);ye(U,f,Js),ye(F,f,Qs);const V=I.intersectsBox(Js),G=I.intersectsBox(Qs);M=V&&On(b,U,n,e,s,o,r,l,a+1,I,!h)||G&&On(b,F,n,e,s,o,r,l,a+1,I,!h),Oi.releasePrimitive(I)}}return M}const na=new rn,Td=new We,Pb={strategy:qf,maxDepth:40,maxLeafTris:10,useSharedArrayBuffer:!1,setBoundingBox:!0,onProgress:null,indirect:!1,verbose:!0,range:null};class Nh{static serialize(t,e={}){e={cloneBuffers:!0,...e};const n=t.geometry,s=t._roots,r=t._indirectBuffer,o=n.getIndex(),a={version:1,roots:null,index:null,indirectBuffer:null};return e.cloneBuffers?(a.roots=s.map(l=>l.slice()),a.index=o?o.array.slice():null,a.indirectBuffer=r?r.slice():null):(a.roots=s,a.index=o?o.array:null,a.indirectBuffer=r),a}static deserialize(t,e,n={}){n={setIndex:!0,indirect:!!t.indirectBuffer,...n};const{index:s,roots:r,indirectBuffer:o}=t;t.version||(console.warn("MeshBVH.deserialize: Serialization format has been changed and will be fixed up. It is recommended to regenerate any stored serialized data."),l(r));const a=new Nh(e,{...n,[Dl]:!0});if(a._roots=r,a._indirectBuffer=o||null,n.setIndex){const c=e.getIndex();if(c===null){const h=new Ze(t.index,1,!1);e.setIndex(h)}else c.array!==s&&(c.array.set(s),c.needsUpdate=!0)}return a;function l(c){for(let h=0;h<c.length;h++){const u=c[h],d=new Uint32Array(u),f=new Uint16Array(u);for(let g=0,x=u.byteLength/en;g<x;g++){const m=Ue*g,p=2*m;Fe(p,f)||(d[m+6]=d[m+6]/Ue-g)}}}}get indirect(){return!!this._indirectBuffer}constructor(t,e={}){if(t.isBufferGeometry){if(t.index&&t.index.isInterleavedBufferAttribute)throw new Error("MeshBVH: InterleavedBufferAttribute is not supported for the index attribute.")}else throw new Error("MeshBVH: Only BufferGeometries are supported.");if(e=Object.assign({...Pb,[Dl]:!1},e),e.useSharedArrayBuffer&&!Tb())throw new Error("MeshBVH: SharedArrayBuffer is not available.");this.geometry=t,this._roots=null,this._indirectBuffer=null,e[Dl]||(XS(this,e),!t.boundingBox&&e.setBoundingBox&&(t.boundingBox=this.getBoundingBox(new We))),this.resolveTriangleIndex=e.indirect?n=>this._indirectBuffer[n]:n=>n}shiftTriangleOffsets(t){const e=this._indirectBuffer;if(e)for(let n=0,s=e.length;n<s;n++)e[n]+=t;else{const n=this._roots;for(let s=0;s<n.length;s++){const r=n[s],o=new Uint32Array(r),a=new Uint16Array(r),l=r.byteLength/en;for(let c=0;c<l;c++){const h=Ue*c,u=2*h;Fe(u,a)&&(o[h+6]+=t)}}}}refit(t=null){return(this.indirect?xb:sb)(this,t)}traverse(t,e=0){const n=this._roots[e],s=new Uint32Array(n),r=new Uint16Array(n);o(0);function o(a,l=0){const c=a*2,h=Fe(c,r);if(h){const u=s[a+6],d=r[c+14];t(l,h,new Float32Array(n,a*4,6),u,d)}else{const u=Ve(a),d=Ge(a,s),f=Ih(a,s);t(l,h,new Float32Array(n,a*4,6),f)||(o(u,l+1),o(d,l+1))}}}raycast(t,e=Dn,n=0,s=1/0){const r=this._roots,o=[],a=this.indirect?_b:lb;for(let l=0,c=r.length;l<c;l++)a(this,l,e,t,o,n,s);return o}raycastFirst(t,e=Dn,n=0,s=1/0){const r=this._roots;let o=null;const a=this.indirect?yb:hb;for(let l=0,c=r.length;l<c;l++){const h=a(this,l,e,t,n,s);h!=null&&(o==null||h.distance<o.distance)&&(o=h)}return o}intersectsGeometry(t,e){let n=!1;const s=this._roots,r=this.indirect?Sb:ub;for(let o=0,a=s.length;o<a&&(n=r(this,o,t,e),!n);o++);return n}shapecast(t){const e=Pn.getPrimitive(),n=this.indirect?ab:ib;let{boundsTraverseOrder:s,intersectsBounds:r,intersectsRange:o,intersectsTriangle:a}=t;if(o&&a){const u=o;o=(d,f,g,x,m)=>u(d,f,g,x,m)?!0:n(d,f,this,a,g,x,e)}else o||(a?o=(u,d,f,g)=>n(u,d,this,a,f,g,e):o=(u,d,f)=>f);let l=!1,c=0;const h=this._roots;for(let u=0,d=h.length;u<d;u++){const f=h[u];if(l=KS(this,u,r,o,s,c),l)break;c+=f.byteLength/en}return Pn.releasePrimitive(e),l}bvhcast(t,e,n){let{intersectsRanges:s,intersectsTriangles:r}=n;const o=Pn.getPrimitive(),a=this.geometry.index,l=this.geometry.attributes.position,c=this.indirect?g=>{const x=this.resolveTriangleIndex(g);Ce(o,x*3,a,l)}:g=>{Ce(o,g*3,a,l)},h=Pn.getPrimitive(),u=t.geometry.index,d=t.geometry.attributes.position,f=t.indirect?g=>{const x=t.resolveTriangleIndex(g);Ce(h,x*3,u,d)}:g=>{Ce(h,g*3,u,d)};if(r){const g=(x,m,p,y,_,v,S,E)=>{for(let M=p,T=p+y;M<T;M++){f(M),h.a.applyMatrix4(e),h.b.applyMatrix4(e),h.c.applyMatrix4(e),h.needsUpdate=!0;for(let b=x,A=x+m;b<A;b++)if(c(b),o.needsUpdate=!0,r(o,h,b,M,_,v,S,E))return!0}return!1};if(s){const x=s;s=function(m,p,y,_,v,S,E,M){return x(m,p,y,_,v,S,E,M)?!0:g(m,p,y,_,v,S,E,M)}}else s=g}return Cb(this,t,e,s)}intersectsBox(t,e){return na.set(t.min,t.max,e),na.needsUpdate=!0,this.shapecast({intersectsBounds:n=>na.intersectsBox(n),intersectsTriangle:n=>na.intersectsTriangle(n)})}intersectsSphere(t){return this.shapecast({intersectsBounds:e=>t.intersectsBox(e),intersectsTriangle:e=>e.intersectsSphere(t)})}closestPointToGeometry(t,e,n={},s={},r=0,o=1/0){return(this.indirect?wb:gb)(this,t,e,n,s,r,o)}closestPointToPoint(t,e={},n=0,s=1/0){return JS(this,t,e,n,s)}getBoundingBox(t){return t.makeEmpty(),this._roots.forEach(n=>{ye(0,new Float32Array(n),Td),t.union(Td)}),t}}const Jf=1e-6,Rb=Jf*.5,Qf=Math.pow(10,-Math.log10(Jf)),Lb=Rb*Qf;function Qn(i){return~~(i*Qf+Lb)}function Db(i){return`${Qn(i.x)},${Qn(i.y)}`}function Cd(i){return`${Qn(i.x)},${Qn(i.y)},${Qn(i.z)}`}function Ib(i){return`${Qn(i.x)},${Qn(i.y)},${Qn(i.z)},${Qn(i.w)}`}function Nb(i,t,e){e.direction.subVectors(t,i).normalize();const n=i.dot(e.direction);return e.origin.copy(i).addScaledVector(e.direction,-n),e}function tp(){return typeof SharedArrayBuffer<"u"}function Bb(i){if(i.buffer instanceof SharedArrayBuffer)return i;const t=i.constructor,e=i.buffer,n=new SharedArrayBuffer(e.byteLength),s=new Uint8Array(e);return new Uint8Array(n).set(s,0),new t(n)}function Ub(i,t=ArrayBuffer){return i>65535?new Uint32Array(new t(4*i)):new Uint16Array(new t(2*i))}function Fb(i,t){if(!i.index){const e=i.attributes.position.count,n=t.useSharedArrayBuffer?SharedArrayBuffer:ArrayBuffer,s=Ub(e,n);i.setIndex(new Ze(s,1));for(let r=0;r<e;r++)s[r]=r}}function Ob(i){return i.index?i.index.count:i.attributes.position.count}function Bh(i){return Ob(i)/3}const kb=1e-8,zb=new N;function Vb(i){return~~(i/3)}function Gb(i){return i%3}function Pd(i,t){return i.start-t.start}function Rd(i,t){return zb.subVectors(t,i.origin).dot(i.direction)}function Hb(i,t,e,n=kb){i.sort(Pd),t.sort(Pd);for(let a=0;a<i.length;a++){const l=i[a];for(let c=0;c<t.length;c++){const h=t[c];if(!(h.start>l.end)){if(l.end<h.start||h.end<l.start)continue;if(l.start<=h.start&&l.end>=h.end)r(h.end,l.end)||i.splice(a+1,0,{start:h.end,end:l.end,index:l.index}),l.end=h.start,h.start=0,h.end=0;else if(l.start>=h.start&&l.end<=h.end)r(l.end,h.end)||t.splice(c+1,0,{start:l.end,end:h.end,index:h.index}),h.end=l.start,l.start=0,l.end=0;else if(l.start<=h.start&&l.end<=h.end){const u=l.end;l.end=h.start,h.start=u}else if(l.start>=h.start&&l.end>=h.end){const u=h.end;h.end=l.start,l.start=u}else throw new Error}if(e.has(l.index)||e.set(l.index,[]),e.has(h.index)||e.set(h.index,[]),e.get(l.index).push(h.index),e.get(h.index).push(l.index),o(h)&&(t.splice(c,1),c--),o(l)){i.splice(a,1),a--;break}}}s(i),s(t);function s(a){for(let l=0;l<a.length;l++)o(a[l])&&(a.splice(l,1),l--)}function r(a,l){return Math.abs(l-a)<n}function o(a){return Math.abs(a.end-a.start)<n}}const Ld=1e-5,Dd=1e-4;class Wb{constructor(){this._rays=[]}addRay(t){this._rays.push(t)}findClosestRay(t){const e=this._rays,n=t.clone();n.direction.multiplyScalar(-1);let s=1/0,r=null;for(let l=0,c=e.length;l<c;l++){const h=e[l];if(o(h,t)&&o(h,n))continue;const u=a(h,t),d=a(h,n),f=Math.min(u,d);f<s&&(s=f,r=h)}return r;function o(l,c){const h=l.origin.distanceTo(c.origin)>Ld;return l.direction.angleTo(c.direction)>Dd||h}function a(l,c){const h=l.origin.distanceTo(c.origin),u=l.direction.angleTo(c.direction);return h/Ld+u/Dd}}}const Vl=new N,Gl=new N,ia=new ao;function Xb(i,t,e){const n=i.attributes,s=i.index,r=n.position,o=new Map,a=new Map,l=Array.from(t),c=new Wb;for(let h=0,u=l.length;h<u;h++){const d=l[h],f=Vb(d),g=Gb(d);let x=3*f+g,m=3*f+(g+1)%3;s&&(x=s.getX(x),m=s.getX(m)),Vl.fromBufferAttribute(r,x),Gl.fromBufferAttribute(r,m),Nb(Vl,Gl,ia);let p,y=c.findClosestRay(ia);y===null&&(y=ia.clone(),c.addRay(y)),a.has(y)||a.set(y,{forward:[],reverse:[],ray:y}),p=a.get(y);let _=Rd(y,Vl),v=Rd(y,Gl);_>v&&([_,v]=[v,_]),ia.direction.dot(y.direction)<0?p.reverse.push({start:_,end:v,index:d}):p.forward.push({start:_,end:v,index:d})}return a.forEach(({forward:h,reverse:u},d)=>{Hb(h,u,o,e),h.length===0&&u.length===0&&a.delete(d)}),{disjointConnectivityMap:o,fragmentMap:a}}const Yb=new it,Hl=new N,qb=new le,Wl=["","",""];class $b{constructor(t=null){this.data=null,this.disjointConnections=null,this.unmatchedDisjointEdges=null,this.unmatchedEdges=-1,this.matchedEdges=-1,this.useDrawRange=!0,this.useAllAttributes=!1,this.matchDisjointEdges=!1,this.degenerateEpsilon=1e-8,t&&this.updateFrom(t)}getSiblingTriangleIndex(t,e){const n=this.data[t*3+e];return n===-1?-1:~~(n/3)}getSiblingEdgeIndex(t,e){const n=this.data[t*3+e];return n===-1?-1:n%3}getDisjointSiblingTriangleIndices(t,e){const n=t*3+e,s=this.disjointConnections.get(n);return s?s.map(r=>~~(r/3)):[]}getDisjointSiblingEdgeIndices(t,e){const n=t*3+e,s=this.disjointConnections.get(n);return s?s.map(r=>r%3):[]}isFullyConnected(){return this.unmatchedEdges===0}updateFrom(t){const{useAllAttributes:e,useDrawRange:n,matchDisjointEdges:s,degenerateEpsilon:r}=this,o=e?_:y,a=new Map,{attributes:l}=t,c=e?Object.keys(l):null,h=t.index,u=l.position;let d=Bh(t);const f=d;let g=0;n&&(g=t.drawRange.start,t.drawRange.count!==1/0&&(d=~~(t.drawRange.count/3)));let x=this.data;(!x||x.length<3*f)&&(x=new Int32Array(3*f)),x.fill(-1);let m=0,p=new Set;for(let v=g,S=d*3+g;v<S;v+=3){const E=v;for(let M=0;M<3;M++){let T=E+M;h&&(T=h.getX(T)),Wl[M]=o(T)}for(let M=0;M<3;M++){const T=(M+1)%3,b=Wl[M],A=Wl[T],D=`${A}_${b}`;if(a.has(D)){const I=E+M,U=a.get(D);x[I]=U,x[U]=I,a.delete(D),m+=2,p.delete(U)}else{const I=`${b}_${A}`,U=E+M;a.set(I,U),p.add(U)}}}if(s){const{fragmentMap:v,disjointConnectivityMap:S}=Xb(t,p,r);p.clear(),v.forEach(({forward:E,reverse:M})=>{E.forEach(({index:T})=>p.add(T)),M.forEach(({index:T})=>p.add(T))}),this.unmatchedDisjointEdges=v,this.disjointConnections=S,m=d*3-p.size}this.matchedEdges=m,this.unmatchedEdges=p.size,this.data=x;function y(v){return Hl.fromBufferAttribute(u,v),Cd(Hl)}function _(v){let S="";for(let E=0,M=c.length;E<M;E++){const T=l[c[E]];let b;switch(T.itemSize){case 1:b=Qn(T.getX(v));break;case 2:b=Db(Yb.fromBufferAttribute(T,v));break;case 3:b=Cd(Hl.fromBufferAttribute(T,v));break;case 4:b=Ib(qb.fromBufferAttribute(T,v));break}S!==""&&(S+="|"),S+=b}return S}}}class Xr extends Sn{constructor(...t){super(...t),this.isBrush=!0,this._previousMatrix=new Zt,this._previousMatrix.elements.fill(0)}markUpdated(){this._previousMatrix.copy(this.matrix)}isDirty(){const{matrix:t,_previousMatrix:e}=this,n=t.elements,s=e.elements;for(let r=0;r<16;r++)if(n[r]!==s[r])return!0;return!1}prepareGeometry(){const t=this.geometry,e=t.attributes,n=tp();if(n)for(const s in e){const r=e[s];if(r.isInterleavedBufferAttribute)throw new Error("Brush: InterleavedBufferAttributes are not supported.");r.array=Bb(r.array)}if(t.boundsTree||(Fb(t,{useSharedArrayBuffer:n}),t.boundsTree=new Nh(t,{maxLeafTris:3,indirect:!0,useSharedArrayBuffer:n})),t.halfEdges||(t.halfEdges=new $b(t)),!t.groupIndices){const s=Bh(t),r=new Uint16Array(s),o=t.groups;for(let a=0,l=o.length;a<l;a++){const{start:c,count:h}=o[a];for(let u=c/3,d=(c+h)/3;u<d;u++)r[u]=a}t.groupIndices=r}}disposeCacheData(){const{geometry:t}=this;t.halfEdges=null,t.boundsTree=null,t.groupIndices=null}}const Zb=1e-14,Xl=new N,Id=new N,Nd=new N;function zi(i,t=Zb){Xl.subVectors(i.b,i.a),Id.subVectors(i.c,i.a),Nd.subVectors(i.b,i.c);const e=Xl.angleTo(Id),n=Xl.angleTo(Nd),s=Math.PI-e-n;return Math.abs(e)<t||Math.abs(n)<t||Math.abs(s)<t||i.a.distanceToSquared(i.b)<t||i.a.distanceToSquared(i.c)<t||i.b.distanceToSquared(i.c)<t}const Yl=1e-10,Ur=1e-10,jb=1e-10,fi=new In,Me=new In,pi=new N,ql=new N,Bd=new N,sa=new kn,$l=new Nn;class Kb{constructor(){this._pool=[],this._index=0}getTriangle(){return this._index>=this._pool.length&&this._pool.push(new me),this._pool[this._index++]}clear(){this._index=0}reset(){this._pool.length=0,this._index=0}}class Jb{constructor(){this.trianglePool=new Kb,this.triangles=[],this.normal=new N,this.coplanarTriangleUsed=!1}initialize(t){this.reset();const{triangles:e,trianglePool:n,normal:s}=this;if(Array.isArray(t))for(let r=0,o=t.length;r<o;r++){const a=t[r];if(r===0)a.getNormal(s);else if(Math.abs(1-a.getNormal(pi).dot(s))>Yl)throw new Error("Triangle Splitter: Cannot initialize with triangles that have different normals.");const l=n.getTriangle();l.copy(a),e.push(l)}else{t.getNormal(s);const r=n.getTriangle();r.copy(t),e.push(r)}}splitByTriangle(t){const{normal:e,triangles:n}=this;if(t.getNormal(ql).normalize(),Math.abs(1-Math.abs(ql.dot(e)))<jb){this.coplanarTriangleUsed=!0;for(let r=0,o=n.length;r<o;r++){const a=n[r];a.coplanarCount=0}const s=[t.a,t.b,t.c];for(let r=0;r<3;r++){const o=(r+1)%3,a=s[r],l=s[o];pi.subVectors(l,a).normalize(),Bd.crossVectors(ql,pi),sa.setFromNormalAndCoplanarPoint(Bd,a),this.splitByPlane(sa,t)}}else t.getPlane(sa),this.splitByPlane(sa,t)}splitByPlane(t,e){const{triangles:n,trianglePool:s}=this;$l.copy(e),$l.needsUpdate=!0;for(let r=0,o=n.length;r<o;r++){const a=n[r];if(!$l.intersectsTriangle(a,fi,!0))continue;const{a:l,b:c,c:h}=a;let u=0,d=-1,f=!1,g=[],x=[];const m=[l,c,h];for(let p=0;p<3;p++){const y=(p+1)%3;fi.start.copy(m[p]),fi.end.copy(m[y]);const _=t.distanceToPoint(fi.start),v=t.distanceToPoint(fi.end);if(Math.abs(_)<Ur&&Math.abs(v)<Ur){f=!0;break}if(_>0?g.push(p):x.push(p),Math.abs(_)<Ur)continue;let S=!!t.intersectLine(fi,pi);!S&&Math.abs(v)<Ur&&(pi.copy(fi.end),S=!0),S&&!(pi.distanceTo(fi.start)<Yl)&&(pi.distanceTo(fi.end)<Yl&&(d=p),u===0?Me.start.copy(pi):Me.end.copy(pi),u++)}if(!f&&u===2&&Me.distance()>Ur)if(d!==-1){d=(d+1)%3;let p=0;p===d&&(p=(p+1)%3);let y=p+1;y===d&&(y=(y+1)%3);const _=s.getTriangle();_.a.copy(m[y]),_.b.copy(Me.end),_.c.copy(Me.start),zi(_)||n.push(_),a.a.copy(m[p]),a.b.copy(Me.start),a.c.copy(Me.end),zi(a)&&(n.splice(r,1),r--,o--)}else{const p=g.length>=2?x[0]:g[0];if(p===0){let E=Me.start;Me.start=Me.end,Me.end=E}const y=(p+1)%3,_=(p+2)%3,v=s.getTriangle(),S=s.getTriangle();m[y].distanceToSquared(Me.start)<m[_].distanceToSquared(Me.end)?(v.a.copy(m[y]),v.b.copy(Me.start),v.c.copy(Me.end),S.a.copy(m[y]),S.b.copy(m[_]),S.c.copy(Me.start)):(v.a.copy(m[_]),v.b.copy(Me.start),v.c.copy(Me.end),S.a.copy(m[y]),S.b.copy(m[_]),S.c.copy(Me.end)),a.a.copy(m[p]),a.b.copy(Me.end),a.c.copy(Me.start),zi(v)||n.push(v),zi(S)||n.push(S),zi(a)&&(n.splice(r,1),r--,o--)}else u===3&&console.warn("TriangleClipper: Coplanar clip not handled")}}reset(){this.triangles.length=0,this.trianglePool.clear(),this.coplanarTriangleUsed=!1}}function Qb(i){return i=~~i,i+4-i%4}class Ud{constructor(t,e=500){this.expansionFactor=1.5,this.type=t,this.length=0,this.array=null,this.setSize(e)}setType(t){if(this.length!==0)throw new Error("TypeBackedArray: Cannot change the type while there is used data in the buffer.");const e=this.array.buffer;this.array=new t(e),this.type=t}setSize(t){if(this.array&&t===this.array.length)return;const e=this.type,n=tp()?SharedArrayBuffer:ArrayBuffer,s=new e(new n(Qb(t*e.BYTES_PER_ELEMENT)));this.array&&s.set(this.array,0),this.array=s}expand(){const{array:t,expansionFactor:e}=this;this.setSize(t.length*e)}push(...t){let{array:e,length:n}=this;n+t.length>e.length&&(this.expand(),e=this.array);for(let s=0,r=t.length;s<r;s++)e[n+s]=t[s];this.length+=t.length}clear(){this.length=0}}class tM{constructor(){this.groupAttributes=[{}],this.groupCount=0}getType(t){return this.groupAttributes[0][t].type}getItemSize(t){return this.groupAttributes[0][t].itemSize}getNormalized(t){return this.groupAttributes[0][t].normalized}getCount(t){if(this.groupCount<=t)return 0;const e=this.getGroupAttrArray("position",t);return e.length/e.itemSize}getTotalLength(t){const{groupCount:e,groupAttributes:n}=this;let s=0;for(let r=0;r<e;r++){const o=n[r];s+=o[t].length}return s}getGroupAttrSet(t=0){const{groupAttributes:e}=this;if(e[t])return this.groupCount=Math.max(this.groupCount,t+1),e[t];const n=e[0];for(this.groupCount=Math.max(this.groupCount,t+1);t>=e.length;){const s={};e.push(s);for(const r in n){const o=n[r],a=new Ud(o.type);a.itemSize=o.itemSize,a.normalized=o.normalized,s[r]=a}}return e[t]}getGroupAttrArray(t,e=0){const{groupAttributes:n}=this;if(!n[0][t])throw new Error(`TypedAttributeData: Attribute with "${t}" has not been initialized`);return this.getGroupAttrSet(e)[t]}initializeArray(t,e,n,s){const{groupAttributes:r}=this,a=r[0][t];if(a){if(a.type!==e)for(let l=0,c=r.length;l<c;l++){const h=r[l][t];h.setType(e),h.itemSize=n,h.normalized=s}}else for(let l=0,c=r.length;l<c;l++){const h=new Ud(e);h.itemSize=n,h.normalized=s,r[l][t]=h}}clear(){this.groupCount=0;const{groupAttributes:t}=this;t.forEach(e=>{for(const n in e)e[n].clear()})}delete(t){this.groupAttributes.forEach(e=>{delete e[t]})}reset(){this.groupAttributes=[],this.groupCount=0}}class Fd{constructor(){this.intersectionSet={},this.ids=[]}add(t,e){const{intersectionSet:n,ids:s}=this;n[t]||(n[t]=[],s.push(t)),n[t].push(e)}}const ep=0,ch=1,eM=2,nM=3,iM=4,np=5,ip=6,An=new ao,Od=new Zt,Ke=new me,mi=new N,kd=new le,zd=new le,Vd=new le,Zl=new le,ra=new le,oa=new le,Gd=new In,jl=new N,Kl=1e-8,sM=1e-15,ps=-1,ms=1,va=-2,ya=2,Yr=0,hs=1,Uh=2,rM=1e-14;let Sa=null;function Hd(i){Sa=i}function sp(i,t){i.getMidpoint(An.origin),i.getNormal(An.direction);const e=t.raycastFirst(An,Cn);return!!(e&&An.direction.dot(e.face.normal)>0)?ps:ms}function oM(i,t){function e(){return Math.random()-.5}i.getNormal(jl),An.direction.copy(jl),i.getMidpoint(An.origin);const n=3;let s=0,r=1/0;for(let o=0;o<n;o++){An.direction.x+=e()*Kl,An.direction.y+=e()*Kl,An.direction.z+=e()*Kl,An.direction.multiplyScalar(-1);const a=t.raycastFirst(An,Cn);if(!!(a&&An.direction.dot(a.face.normal)>0)&&s++,a!==null&&(r=Math.min(r,a.distance)),r<=sM)return a.face.normal.dot(jl)>0?ya:va;if(s/n>.5||(o-s+1)/n>.5)break}return s/n>.5?ps:ms}function aM(i,t){const e=new Fd,n=new Fd;return Od.copy(i.matrixWorld).invert().multiply(t.matrixWorld),i.geometry.boundsTree.bvhcast(t.geometry.boundsTree,Od,{intersectsTriangles(s,r,o,a){if(!zi(s)&&!zi(r)){let l=s.intersectsTriangle(r,Gd,!0);if(!l){const c=s.plane,h=r.plane,u=c.normal,d=h.normal;u.dot(d)===1&&Math.abs(c.constant-h.constant)<rM&&(l=!0)}if(l){let c=i.geometry.boundsTree.resolveTriangleIndex(o),h=t.geometry.boundsTree.resolveTriangleIndex(a);e.add(c,h),n.add(h,c),Sa&&(Sa.addEdge(Gd),Sa.addIntersectingTriangles(o,s,a,r))}}return!1}}),{aIntersections:e,bIntersections:n}}function lM(i,t,e,n,s,r,o=!1){const a=e.attributes,l=e.index,c=i*3,h=l.getX(c+0),u=l.getX(c+1),d=l.getX(c+2);for(const f in r){const g=a[f],x=r[f];if(!(f in a))throw new Error(`CSG Operations: Attribute ${f} not available on geometry.`);const m=g.itemSize;f==="position"?(Ke.a.fromBufferAttribute(g,h).applyMatrix4(n),Ke.b.fromBufferAttribute(g,u).applyMatrix4(n),Ke.c.fromBufferAttribute(g,d).applyMatrix4(n),Jl(Ke.a,Ke.b,Ke.c,t,3,x,o)):f==="normal"?(Ke.a.fromBufferAttribute(g,h).applyNormalMatrix(s),Ke.b.fromBufferAttribute(g,u).applyNormalMatrix(s),Ke.c.fromBufferAttribute(g,d).applyNormalMatrix(s),o&&(Ke.a.multiplyScalar(-1),Ke.b.multiplyScalar(-1),Ke.c.multiplyScalar(-1)),Jl(Ke.a,Ke.b,Ke.c,t,3,x,o,!0)):(kd.fromBufferAttribute(g,h),zd.fromBufferAttribute(g,u),Vd.fromBufferAttribute(g,d),Jl(kd,zd,Vd,t,m,x,o))}}function cM(i,t,e,n,s,r,o,a=!1){Ql(i,n,s,r,o,a),Ql(a?e:t,n,s,r,o,a),Ql(a?t:e,n,s,r,o,a)}function rp(i,t,e=!1){switch(i){case ep:if(t===ms||t===ya&&!e)return hs;break;case ch:if(e){if(t===ps)return Yr}else if(t===ms||t===va)return hs;break;case eM:if(e){if(t===ms||t===va)return hs}else if(t===ps)return Yr;break;case iM:if(t===ps)return Yr;if(t===ms)return hs;break;case nM:if(t===ps||t===ya&&!e)return hs;break;case np:if(!e&&(t===ms||t===va))return hs;break;case ip:if(!e&&(t===ps||t===ya))return hs;break;default:throw new Error(`Unrecognized CSG operation enum "${i}".`)}return Uh}function Jl(i,t,e,n,s,r,o=!1,a=!1){const l=c=>{r.push(c.x),s>1&&r.push(c.y),s>2&&r.push(c.z),s>3&&r.push(c.w)};Zl.set(0,0,0,0).addScaledVector(i,n.a.x).addScaledVector(t,n.a.y).addScaledVector(e,n.a.z),ra.set(0,0,0,0).addScaledVector(i,n.b.x).addScaledVector(t,n.b.y).addScaledVector(e,n.b.z),oa.set(0,0,0,0).addScaledVector(i,n.c.x).addScaledVector(t,n.c.y).addScaledVector(e,n.c.z),a&&(Zl.normalize(),ra.normalize(),oa.normalize()),l(Zl),o?(l(oa),l(ra)):(l(ra),l(oa))}function Ql(i,t,e,n,s,r=!1){for(const o in s){const a=t[o],l=s[o];if(!(o in t))throw new Error(`CSG Operations: Attribute ${o} no available on geometry.`);const c=a.itemSize;o==="position"?(mi.fromBufferAttribute(a,i).applyMatrix4(e),l.push(mi.x,mi.y,mi.z)):o==="normal"?(mi.fromBufferAttribute(a,i).applyNormalMatrix(n),r&&mi.multiplyScalar(-1),l.push(mi.x,mi.y,mi.z)):(l.push(a.getX(i)),c>1&&l.push(a.getY(i)),c>2&&l.push(a.getZ(i)),c>3&&l.push(a.getW(i)))}}class hM{constructor(t){this.triangle=new me().copy(t),this.intersects={}}addTriangle(t,e){this.intersects[t]=new me().copy(e)}getIntersectArray(){const t=[],{intersects:e}=this;for(const n in e)t.push(e[n]);return t}}class Wd{constructor(){this.data={}}addTriangleIntersection(t,e,n,s){const{data:r}=this;r[t]||(r[t]=new hM(e)),r[t].addTriangle(n,s)}getTrianglesAsArray(t=null){const{data:e}=this,n=[];if(t!==null)t in e&&n.push(e[t].triangle);else for(const s in e)n.push(e[s].triangle);return n}getTriangleIndices(){return Object.keys(this.data).map(t=>parseInt(t))}getIntersectionIndices(t){const{data:e}=this;return e[t]?Object.keys(e[t].intersects).map(n=>parseInt(n)):[]}getIntersectionsAsArray(t=null,e=null){const{data:n}=this,s=new Set,r=[],o=a=>{if(n[a])if(e!==null)n[a].intersects[e]&&r.push(n[a].intersects[e]);else{const l=n[a].intersects;for(const c in l)s.has(c)||(s.add(c),r.push(l[c]))}};if(t!==null)o(t);else for(const a in n)o(a);return r}reset(){this.data={}}}class uM{constructor(){this.enabled=!1,this.triangleIntersectsA=new Wd,this.triangleIntersectsB=new Wd,this.intersectionEdges=[]}addIntersectingTriangles(t,e,n,s){const{triangleIntersectsA:r,triangleIntersectsB:o}=this;r.addTriangleIntersection(t,e,n,s),o.addTriangleIntersection(n,s,t,e)}addEdge(t){this.intersectionEdges.push(t.clone())}reset(){this.triangleIntersectsA.reset(),this.triangleIntersectsB.reset(),this.intersectionEdges=[]}init(){this.enabled&&(this.reset(),Hd(this))}complete(){this.enabled&&Hd(null)}}const Wi=new Zt,Pa=new Xt,us=new me,aa=new me,Ui=new me,la=new me,Vn=[],Es=[];function dM(i){for(const t of i)return t}function fM(i,t,e,n,s,r={}){const{useGroups:o=!0}=r,{aIntersections:a,bIntersections:l}=aM(i,t),c=[];let h=null,u;return u=o?0:-1,Xd(i,t,a,e,!1,n,s,u),Yd(i,t,a,e,!1,s,u),e.findIndex(f=>f!==ip&&f!==np)!==-1&&(u=o?i.geometry.groups.length||1:-1,Xd(t,i,l,e,!0,n,s,u),Yd(t,i,l,e,!0,s,u)),Vn.length=0,Es.length=0,{groups:c,materials:h}}function Xd(i,t,e,n,s,r,o,a=0){const l=i.matrixWorld.determinant()<0;Wi.copy(t.matrixWorld).invert().multiply(i.matrixWorld),Pa.getNormalMatrix(i.matrixWorld).multiplyScalar(l?-1:1);const c=i.geometry.groupIndices,h=i.geometry.index,u=i.geometry.attributes.position,d=t.geometry.boundsTree,f=t.geometry.index,g=t.geometry.attributes.position,x=e.ids,m=e.intersectionSet;for(let p=0,y=x.length;p<y;p++){const _=x[p],v=a===-1?0:c[_]+a,S=3*_,E=h.getX(S+0),M=h.getX(S+1),T=h.getX(S+2);us.a.fromBufferAttribute(u,E).applyMatrix4(Wi),us.b.fromBufferAttribute(u,M).applyMatrix4(Wi),us.c.fromBufferAttribute(u,T).applyMatrix4(Wi),r.reset(),r.initialize(us);const b=m[_];for(let D=0,I=b.length;D<I;D++){const U=3*b[D],F=f.getX(U+0),V=f.getX(U+1),G=f.getX(U+2);aa.a.fromBufferAttribute(g,F),aa.b.fromBufferAttribute(g,V),aa.c.fromBufferAttribute(g,G),r.splitByTriangle(aa)}const A=r.triangles;for(let D=0,I=A.length;D<I;D++){const U=A[D],F=r.coplanarTriangleUsed?oM(U,d):sp(U,d);Vn.length=0,Es.length=0;for(let V=0,G=n.length;V<G;V++){const k=rp(n[V],F,s);k!==Uh&&(Es.push(k),Vn.push(o[V].getGroupAttrSet(v)))}if(Vn.length!==0){us.getBarycoord(U.a,la.a),us.getBarycoord(U.b,la.b),us.getBarycoord(U.c,la.c);for(let V=0,G=Vn.length;V<G;V++){const k=Vn[V],ht=Es[V]===Yr;lM(_,la,i.geometry,i.matrixWorld,Pa,k,l!==ht)}}}}return x.length}function Yd(i,t,e,n,s,r,o=0){const a=i.matrixWorld.determinant()<0;Wi.copy(t.matrixWorld).invert().multiply(i.matrixWorld),Pa.getNormalMatrix(i.matrixWorld).multiplyScalar(a?-1:1);const l=t.geometry.boundsTree,c=i.geometry.groupIndices,h=i.geometry.index,u=i.geometry.attributes,d=u.position,f=[],g=i.geometry.halfEdges,x=new Set,m=Bh(i.geometry);for(let p=0,y=m;p<y;p++)p in e.intersectionSet||x.add(p);for(;x.size>0;){const p=dM(x);x.delete(p),f.push(p);const y=3*p,_=h.getX(y+0),v=h.getX(y+1),S=h.getX(y+2);Ui.a.fromBufferAttribute(d,_).applyMatrix4(Wi),Ui.b.fromBufferAttribute(d,v).applyMatrix4(Wi),Ui.c.fromBufferAttribute(d,S).applyMatrix4(Wi);const E=sp(Ui,l);Es.length=0,Vn.length=0;for(let M=0,T=n.length;M<T;M++){const b=rp(n[M],E,s);b!==Uh&&(Es.push(b),Vn.push(r[M]))}for(;f.length>0;){const M=f.pop();for(let T=0;T<3;T++){const b=g.getSiblingTriangleIndex(M,T);b!==-1&&x.has(b)&&(f.push(b),x.delete(b))}if(Vn.length!==0){const T=3*M,b=h.getX(T+0),A=h.getX(T+1),D=h.getX(T+2),I=o===-1?0:c[M]+o;if(Ui.a.fromBufferAttribute(d,b),Ui.b.fromBufferAttribute(d,A),Ui.c.fromBufferAttribute(d,D),!zi(Ui))for(let U=0,F=Vn.length;U<F;U++){const V=Es[U],G=Vn[U].getGroupAttrSet(I),k=V===Yr;cM(b,A,D,u,i.matrixWorld,Pa,G,k!==a)}}}}}function pM(i){for(let t=0;t<i.length-1;t++){const e=i[t],n=i[t+1];if(e.materialIndex===n.materialIndex){const s=e.start,r=n.start+n.count;n.start=s,n.count=r-s,i.splice(t,1),t--}}}function mM(i,t,e,n){e.clear();const s=i.attributes;for(let r=0,o=n.length;r<o;r++){const a=n[r],l=s[a];e.initializeArray(a,l.array.constructor,l.itemSize,l.normalized)}for(const r in e.attributes)n.includes(r)||e.delete(r);for(const r in t.attributes)n.includes(r)||(t.deleteAttribute(r),t.dispose())}function gM(i,t,e){let n=!1,s=-1;const r=i.attributes,o=t.groupAttributes[0];for(const l in o){const c=t.getTotalLength(l),h=t.getType(l),u=t.getItemSize(l),d=t.getNormalized(l);let f=r[l];(!f||f.array.length<c)&&(f=new Ze(new h(c),u,d),i.setAttribute(l,f),n=!0);let g=0;for(let x=0,m=Math.min(e.length,t.groupCount);x<m;x++){const p=e[x].index,{array:y,type:_,length:v}=t.groupAttributes[p][l],S=new _(y.buffer,0,v);f.array.set(S,g),g+=S.length}f.needsUpdate=!0,s=c/f.itemSize}if(i.index){const l=i.index.array;if(l.length<s)i.index=null,n=!0;else for(let c=0,h=l.length;c<h;c++)l[c]=c}let a=0;i.clearGroups();for(let l=0,c=Math.min(e.length,t.groupCount);l<c;l++){const{index:h,materialIndex:u}=e[l],d=t.getCount(h);d!==0&&(i.addGroup(a,d,u),a+=d)}i.setDrawRange(0,s),i.boundsTree=null,n&&i.dispose()}function qd(i,t){let e=t;return Array.isArray(t)||(e=[],i.forEach(n=>{e[n.materialIndex]=t})),e}class xM{constructor(){this.triangleSplitter=new Jb,this.attributeData=[],this.attributes=["position","uv","normal"],this.useGroups=!0,this.consolidateGroups=!0,this.debug=new uM}getGroupRanges(t){return!this.useGroups||t.groups.length===0?[{start:0,count:1/0,materialIndex:0}]:t.groups.map(e=>({...e}))}evaluate(t,e,n,s=new Xr){let r=!0;if(Array.isArray(n)||(n=[n]),Array.isArray(s)||(s=[s],r=!1),s.length!==n.length)throw new Error("Evaluator: operations and target array passed as different sizes.");t.prepareGeometry(),e.prepareGeometry();const{triangleSplitter:o,attributeData:a,attributes:l,useGroups:c,consolidateGroups:h,debug:u}=this;for(;a.length<s.length;)a.push(new tM);s.forEach((p,y)=>{mM(t.geometry,p.geometry,a[y],l)}),u.init(),fM(t,e,n,o,a,{useGroups:c}),u.complete();const d=this.getGroupRanges(t.geometry),f=qd(d,t.material),g=this.getGroupRanges(e.geometry),x=qd(g,e.material);g.forEach(p=>p.materialIndex+=f.length);let m=[...d,...g].map((p,y)=>({...p,index:y}));if(c){const p=[...f,...x];h&&(m=m.map(_=>{const v=p[_.materialIndex];return _.materialIndex=p.indexOf(v),_}).sort((_,v)=>_.materialIndex-v.materialIndex));const y=[];for(let _=0,v=p.length;_<v;_++){let S=!1;for(let E=0,M=m.length;E<M;E++){const T=m[E];T.materialIndex===_&&(S=!0,T.materialIndex=y.length)}S&&y.push(p[_])}s.forEach(_=>{_.material=y})}else m=[{start:0,count:1/0,index:0,materialIndex:0}],s.forEach(p=>{p.material=f[0]});return s.forEach((p,y)=>{const _=p.geometry;gM(_,a[y],m),h&&pM(_.groups)}),r?s:s[0]}evaluateHierarchy(t,e=new Xr){t.updateMatrixWorld(!0);const n=(r,o)=>{const a=r.children;for(let l=0,c=a.length;l<c;l++){const h=a[l];h.isOperationGroup?n(h,o):o(h)}},s=r=>{const o=r.children;let a=!1;for(let c=0,h=o.length;c<h;c++){const u=o[c];a=s(u)||a}const l=r.isDirty();if(l&&r.markUpdated(),a&&!r.isOperationGroup){let c;return n(r,h=>{c?c=this.evaluate(c,h,h.operation):c=this.evaluate(r,h,h.operation)}),r._cachedGeometry=c.geometry,r._cachedMaterials=c.material,!0}else return a||l};return s(t),e.geometry=t._cachedGeometry,e.material=t._cachedMaterials,e}reset(){this.triangleSplitter.reset()}}class _M{constructor(t={}){this.log=Yn.createLogger("MaterialManager"),this.materialRegistry={shaded:{enabled:!0,factory:()=>new _i({color:14596231,roughness:.8,metalness:.1,wireframe:!1})},shadedEdges:{enabled:!0,factory:()=>new _i({color:14596231,roughness:.75,metalness:.25,wireframe:!1})},wireframe:{enabled:!0,factory:()=>new _i({color:14596231,roughness:1,metalness:0,wireframe:!0})},clay:{enabled:!0,factory:()=>new _i({color:12564138,roughness:.95,metalness:.05,wireframe:!1})},metal:{enabled:!0,factory:()=>new _i({color:13421772,roughness:.25,metalness:.9,wireframe:!1})},glass:{enabled:!0,factory:()=>new t0({color:16777215,roughness:0,metalness:0,transmission:.6,transparent:!0,opacity:.4,ior:1.4,thickness:10,wireframe:!1})}},this.currentMaterialKey="shaded",this.wireframeMode=!1,this.edgesEnabled=!1,this.panelMesh=null,this.partMesh=null,this.scene=null,this.originalPanelMaterial=null,this.wireframeToggleBtn=null}initialize(t,e,n){this.panelMesh=t,this.partMesh=e,this.scene=n,this.log.info("MaterialManager initialized")}setMaterialMode(t){const e=this.materialRegistry[t];if(!e||e.enabled===!1){this.log.warn("Material mode not available:",t);return}this.currentMaterialKey=t;const n=e.factory();if(n.wireframe=this.wireframeMode,this.originalPanelMaterial=n.clone(),this.panelMesh&&(this.panelMesh.material&&this.panelMesh.material.dispose(),this.panelMesh.material=n.clone()),this.partMesh){this.partMesh.material&&this.partMesh.material.dispose();const s=e.factory();s.wireframe=this.wireframeMode,this.partMesh.material=s}this.log.info("Material mode changed to:",t)}toggleWireframe(){this.wireframeMode=!this.wireframeMode,this.scene&&this.scene.traverse(t=>{t.isMesh&&t.material&&(Array.isArray(t.material)?t.material.forEach(e=>{e.wireframe=this.wireframeMode}):t.material.wireframe=this.wireframeMode)}),this.wireframeToggleBtn&&(this.wireframeToggleBtn.style.backgroundColor=this.wireframeMode?"rgba(0, 191, 255, 0.9)":"rgba(255, 255, 255, 0.9)"),this.log.info("Wireframe mode toggled:",this.wireframeMode)}setEdgesEnabled(t){this.edgesEnabled=t,this.panelMesh&&this.panelMesh.userData.edgeLines&&(this.panelMesh.userData.edgeLines.visible=t&&this.panelMesh.visible),this.partMesh&&this.partMesh.userData.edgeLines&&(this.partMesh.userData.edgeLines.visible=t&&this.partMesh.visible),t&&(this.panelMesh&&!this.panelMesh.userData.edgeLines&&this.addEdgeVisualization(this.panelMesh),this.partMesh&&!this.partMesh.userData.edgeLines&&this.addEdgeVisualization(this.partMesh)),this.log.info("Edges enabled:",t)}addEdgeVisualization(t){try{if(!this.edgesEnabled)return;const e=new Eg(t.geometry),n=new Mh(e,new vr({color:3355443,linewidth:1,transparent:!0,opacity:.6}));n.position.copy(t.position),n.rotation.copy(t.rotation),n.scale.copy(t.scale),this.scene&&this.scene.add(n),t.userData.edgeLines=n,this.log.debug("Added edge visualization to mesh")}catch(e){this.log.error("Error adding edge visualization:",e)}}registerMaterial(t,e,n=!0){this.materialRegistry[t]={factory:e,enabled:n},this.log.info("Material registered:",t)}getCurrentMaterialKey(){return this.currentMaterialKey}isWireframeEnabled(){return this.wireframeMode}isEdgesEnabled(){return this.edgesEnabled}getMaterialFactory(t){const e=this.materialRegistry[t];return e?e.factory:null}getAvailableMaterials(){return Object.entries(this.materialRegistry).filter(([,t])=>t.enabled).map(([t])=>t)}createMaterial(t){const e=this.materialRegistry[t];if(!e)return this.log.warn("Material not found:",t),null;const n=e.factory();return n.wireframe=this.wireframeMode,n}dispose(){this.originalPanelMaterial&&(this.originalPanelMaterial.dispose(),this.originalPanelMaterial=null),this.log.info("MaterialManager disposed")}}class vM{constructor(t={}){this.log=Yn.createLogger("CSGEngine"),this.scene=null,this.panelMesh=null,this.partMesh=null,this.bitExtrudeMeshes=[],this.bitPathMeshes=[],this.originalPanelGeometry=null,this.originalPanelPosition=null,this.originalPanelRotation=null,this.originalPanelScale=null,this.panelBBox=null,this.csgActive=!1,this.csgBusy=!1,this.csgQueuedApply=null,this.csgVisible=!1,this.lastCSGSignature=null,this.useUnionBeforeSubtract=!0,this.materialManager=null,this.computeWorldBBox=null}initialize(t={}){this.scene=t.scene,this.panelMesh=t.panelMesh,this.bitExtrudeMeshes=t.bitExtrudeMeshes||[],this.bitPathMeshes=t.bitPathMeshes||[],this.originalPanelGeometry=t.originalPanelGeometry,this.originalPanelPosition=t.originalPanelPosition,this.originalPanelRotation=t.originalPanelRotation,this.originalPanelScale=t.originalPanelScale,this.materialManager=t.materialManager,this.computeWorldBBox=t.computeWorldBBox,this.log.info("CSGEngine initialized")}applyCSGOperation(t){var e,n,s,r,o,a,l,c;if(this.log.info("applyCSGOperation called with apply:",t,"bitExtrudeMeshes count:",this.bitExtrudeMeshes.length),window.isDraggingBit){this.log.info("CSG blocked: drag in progress"),this.csgQueuedApply=t;return}if(this.csgBusy){this.partMesh&&(this.partMesh.visible=!1,this.partMesh.userData.edgeLines&&(this.partMesh.userData.edgeLines.visible=!1));return}!this.panelBBox&&this.computeWorldBBox&&(this.panelBBox=this.computeWorldBBox(this.originalPanelGeometry,this.originalPanelPosition,this.originalPanelRotation,this.originalPanelScale));try{if(!t){this.log.info("Restoring base panel (Material view)"),this.showBasePanel(),this.csgBusy=!1;return}if(this.log.info("Applying CSG with optimized filtering/caching from original panel"),this.log.info("CSG Operation Start:",{timestamp:Date.now(),mode:this.useUnionBeforeSubtract?"Union":"Sequential",totalBits:this.bitExtrudeMeshes.length}),!this.bitExtrudeMeshes.length){this.log.warn("No extrude meshes available, showing base panel"),this.showBasePanel(),this.csgBusy=!1;return}const h=this.filterIntersectingExtrudes(this.panelBBox),u=[],d=new Set;for(let M=h.length-1;M>=0;M--){const T=h[M],b=((e=T.userData)==null?void 0:e.bitIndex)??((n=T.geometry)==null?void 0:n.uuid)??T.uuid;d.has(b)||(d.add(b),u.unshift(T))}const f=this.buildCSGSignature(u);if(this.csgActive&&this.partMesh&&this.lastCSGSignature===f){this.log.info("CSG signature unchanged - reusing cached result"),this.showCSGResult();return}if(u.length===0){this.log.warn("No intersecting bits with panel, skipping CSG subtraction"),this.lastCSGSignature=f,this.csgActive=!1,this.showBasePanel(),this.csgBusy=!1;return}const g=new Xr(this.originalPanelGeometry.clone()),x=this.originalPanelPosition||new N,m=this.originalPanelRotation||new yn,p=this.originalPanelScale||new N(1,1,1);g.position.copy(x),g.rotation.copy(m),g.scale.copy(p),g.updateMatrixWorld(!0);const y=new xM;y.attributes=["position","normal"];let _,v=0;if(this.useUnionBeforeSubtract){this.log.info("Using UNION mode: combining all bits first");let M=null;if(u.forEach((T,b)=>{try{const A=new Xr(T.geometry);A.position.copy(T.position),A.rotation.copy(T.rotation),A.scale.copy(T.scale),A.updateMatrixWorld(!0),M?M=y.evaluate(M,A,ep):M=A,v++}catch(A){this.log.warn(`Error building brush for bit ${b}:`,A.message)}}),!M){this.log.warn("Failed to build union brush, showing base panel"),this.lastCSGSignature=f,this.csgActive=!1,this.showBasePanel(),this.csgBusy=!1;return}_=y.evaluate(g,M,ch)}else{this.log.info("Using SEQUENTIAL mode: subtracting bits one by one"),_=g;for(const M of u)try{const T=new Xr(M.geometry);if(T.position.copy(M.position),T.rotation.copy(M.rotation),T.scale.copy(M.scale),T.updateMatrixWorld(!0),_=y.evaluate(_,T,ch),!_){this.log.warn(`Sequential subtraction failed at bit ${v}`);break}v++}catch(T){this.log.warn(`Error in sequential subtraction for bit ${v}:`,T.message);break}}if(!_){this.log.error("CSG subtraction failed, reverting to base panel"),this.lastCSGSignature=null,this.csgActive=!1,this.showBasePanel(),this.csgBusy=!1;return}this.partMesh&&(this.partMesh.userData.edgeLines&&(this.scene.remove(this.partMesh.userData.edgeLines),(s=this.partMesh.userData.edgeLines.geometry)==null||s.dispose(),(r=this.partMesh.userData.edgeLines.material)==null||r.dispose()),this.scene.remove(this.partMesh),(o=this.partMesh.geometry)==null||o.dispose(),(a=this.partMesh.material)==null||a.dispose());const S=this.materialManager.getMaterialFactory(this.materialManager.getCurrentMaterialKey()),E=S?S():((c=(l=this.originalPanelMaterial)==null?void 0:l.clone)==null?void 0:c.call(l))||new _i({color:14596231});E.wireframe=this.materialManager.isWireframeEnabled(),_.material=E,_.castShadow=!0,_.receiveShadow=!0,this.partMesh=_,this.materialManager.partMesh=this.partMesh,this.materialManager.isEdgesEnabled()&&this.materialManager.addEdgeVisualization(_),this.lastCSGSignature=f,this.csgActive=!0,this.showCSGResult(),this.log.info(`CSG applied successfully, processed ${v} intersecting bits`),this.log.info("CSG Operation End:",{timestamp:Date.now(),success:!0,bitsProcessed:v})}catch(h){this.log.error("Error in applyCSGOperation:",h),this.log.info("CSG Operation End:",{timestamp:Date.now(),success:!1,error:h.message})}finally{if(this.csgBusy=!1,this.csgQueuedApply!==null){const h=this.csgQueuedApply;this.csgQueuedApply=null,this.applyCSGOperation(h)}}}buildCSGSignature(t=[]){var s;const e={geometry:(s=this.originalPanelGeometry)==null?void 0:s.uuid,position:this.originalPanelPosition?this.originalPanelPosition.toArray():null,rotation:this.originalPanelRotation?[this.originalPanelRotation.x,this.originalPanelRotation.y,this.originalPanelRotation.z]:null,scale:this.originalPanelScale?this.originalPanelScale.toArray():null},n=t.map(r=>{var o,a;return{geometry:(o=r.geometry)==null?void 0:o.uuid,position:r.position.toArray(),rotation:[r.rotation.x,r.rotation.y,r.rotation.z],scale:r.scale.toArray(),operation:(a=r.userData)==null?void 0:a.operation}});return JSON.stringify({panel:e,bits:n})}filterIntersectingExtrudes(t){if(!t)return[];const e=[];return this.bitExtrudeMeshes.forEach((n,s)=>{if(!n.geometry){this.log.warn(`Bit mesh ${s} missing geometry, skipping`);return}this.computeWorldBBox(n.geometry,n.position,n.rotation,n.scale).intersectsBox(t)?e.push(n):this.log.debug(`Bit mesh ${s} culls out of panel bounds`)}),e}showBasePanel(){this.panelMesh&&(this.panelMesh.visible=!0,this.materialManager.isEdgesEnabled()?this.panelMesh.userData.edgeLines?this.panelMesh.userData.edgeLines.visible=!0:this.materialManager.addEdgeVisualization(this.panelMesh):this.panelMesh.userData.edgeLines&&(this.panelMesh.userData.edgeLines.visible=!1)),this.partMesh&&(this.partMesh.visible=!1,this.partMesh.userData.edgeLines&&(this.partMesh.userData.edgeLines.visible=!1)),this.bitPathMeshes.forEach(t=>{t.visible=window.bitsVisible!==!1}),this.bitExtrudeMeshes.forEach(t=>{t.visible=window.bitsVisible!==!1}),this.csgVisible=!1}showCSGResult(){this.panelMesh&&(this.panelMesh.visible=!1,this.panelMesh.userData.edgeLines&&(this.panelMesh.userData.edgeLines.visible=!1)),this.partMesh&&(this.scene.children.includes(this.partMesh)||this.scene.add(this.partMesh),this.partMesh.visible=!0,this.materialManager.isEdgesEnabled()?this.partMesh.userData.edgeLines?this.partMesh.userData.edgeLines.visible=!0:this.materialManager.addEdgeVisualization(this.partMesh):this.partMesh.userData.edgeLines&&(this.partMesh.userData.edgeLines.visible=!1)),this.bitPathMeshes.forEach(t=>{t.visible=!1}),this.bitExtrudeMeshes.forEach(t=>{t.visible=!1}),this.csgVisible=!0}setUnionMode(t){this.useUnionBeforeSubtract=t,this.lastCSGSignature=null,this.log.info("CSG mode changed to:",t?"Union":"Sequential")}isActive(){return this.csgActive}updateMeshReferences(t,e,n){this.panelMesh=t,this.bitExtrudeMeshes=e||[],this.bitPathMeshes=n||[]}dispose(){var t,e,n,s,r,o;this.partMesh&&(this.partMesh.userData.edgeLines&&((t=this.scene)==null||t.remove(this.partMesh.userData.edgeLines),(e=this.partMesh.userData.edgeLines.geometry)==null||e.dispose(),(n=this.partMesh.userData.edgeLines.material)==null||n.dispose()),(s=this.scene)==null||s.remove(this.partMesh),(r=this.partMesh.geometry)==null||r.dispose(),(o=this.partMesh.material)==null||o.dispose()),this.log.info("CSGEngine disposed")}}class yM{constructor(){this.log=Yn.createLogger("SceneManager"),this.scene=null,this.camera=null,this.renderer=null,this.controls=null,this.container=null,this.lights={ambient:null,directional:null,hemisphere:null},this.cameraFitted=!1,this.animationFrameId=null,this.stats=null,this.log.info("Created")}initialize(t){if(!t)throw new Error("SceneManager.initialize() requires a DOM container");this.container=t,this.scene=new _g,this.scene.background=new qt(16119285);const e=this.container.clientWidth/this.container.clientHeight;this.camera=new Tn(45,e,.1,1e4),this.camera.position.set(0,400,600),this.camera.lookAt(0,0,0),this.renderer=new pS({antialias:!0}),this.renderer.setSize(this.container.clientWidth,this.container.clientHeight),this.renderer.setPixelRatio(window.devicePixelRatio),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=nf,this.container.appendChild(this.renderer.domElement),this.controls=new gS(this.camera,this.renderer.domElement),this.controls.enableDamping=!0,this.controls.dampingFactor=.05,this.controls.screenSpacePanning=!1,this.controls.minDistance=100,this.controls.maxDistance=2e3,this.controls.maxPolarAngle=Math.PI/2,this.setupLighting(),this.addGridHelper();const n=new x0(200);this.scene.add(n),window.addEventListener("resize",this.onWindowResize.bind(this)),this.log.info("Initialized successfully")}setupLighting(){this.lights.ambient=new u0(16777215,.6),this.scene.add(this.lights.ambient),this.lights.directional=new h0(16777215,.8),this.lights.directional.position.set(200,400,300),this.lights.directional.castShadow=!0,this.lights.directional.shadow.camera.near=.1,this.lights.directional.shadow.camera.far=1500,this.lights.directional.shadow.camera.left=-500,this.lights.directional.shadow.camera.right=500,this.lights.directional.shadow.camera.top=500,this.lights.directional.shadow.camera.bottom=-500,this.lights.directional.shadow.mapSize.width=2048,this.lights.directional.shadow.mapSize.height=2048,this.scene.add(this.lights.directional),this.lights.hemisphere=new a0(16777215,4473924,.4),this.lights.hemisphere.position.set(0,200,0),this.scene.add(this.lights.hemisphere),this.log.info("Lighting setup complete")}addGridHelper(){const n=new g0(1e3,50,8947848,13421772);n.position.y=0,this.scene.add(n),this.log.info("Grid helper added")}fitCameraToPanel(t,e,n){if(this.cameraFitted)return;const r=Math.max(t,e,n)*2;this.camera.position.set(r*.8,r*.6,-r),this.camera.lookAt(0,e/2,n/2),this.controls.target.set(0,e/2,n/2),this.controls.update(),this.cameraFitted=!0,this.log.info(`Camera fitted to panel: ${t}x${e}x${n}`)}onWindowResize(){if(!this.container||!this.camera||!this.renderer)return;const t=this.container.clientWidth,e=this.container.clientHeight;this.camera.aspect=t/e,this.camera.updateProjectionMatrix(),this.renderer.setSize(t,e),this.log.debug(`Window resized: ${t}x${e}`)}addStatsWidget(t){if(!t||typeof t>"u"){this.log.warn("Stats.js not provided or loaded");return}this.stats=new t,this.stats.showPanel(0),this.stats.dom.style.position="absolute",this.stats.dom.style.left="10px",this.stats.dom.style.top="10px",this.stats.dom.style.zIndex="100",this.container.appendChild(this.stats.dom),this.log.info("Stats widget added")}render(){this.stats&&this.stats.begin(),this.controls&&this.controls.update(),this.renderer&&this.scene&&this.camera&&this.renderer.render(this.scene,this.camera),this.stats&&this.stats.end()}dispose(){this.controls&&this.controls.dispose(),this.renderer&&this.renderer.dispose(),this.animationFrameId&&cancelAnimationFrame(this.animationFrameId),window.removeEventListener("resize",this.onWindowResize.bind(this)),this.log.info("Disposed")}}class SM{constructor(){this.log=Yn.createLogger("ExtrusionBuilder"),this.materialManager=null,this.log.info("Created")}initialize(t){this.materialManager=t.materialManager,this.log.info("Initialized")}parsePathToCurves(t){const e=[],n=t.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);let s=0,r=0,o=0,a=0;return n==null||n.forEach(l=>{const c=l[0].toUpperCase(),h=l.slice(1).trim().split(/[\s,]+/).map(Number).filter(u=>!isNaN(u));switch(c){case"M":h.length>=2&&(s=h[0],r=h[1],o=s,a=r);break;case"L":if(h.length>=2){const u=h[0],d=h[1];e.push(new tn(new N(s,r,0),new N(u,d,0))),s=u,r=d}break;case"H":if(h.length>=1){const u=h[0];e.push(new tn(new N(s,r,0),new N(u,r,0))),s=u}break;case"V":if(h.length>=1){const u=h[0];e.push(new tn(new N(s,r,0),new N(s,u,0))),r=u}break;case"C":if(h.length>=6){const u=h[0],d=h[1],f=h[2],g=h[3],x=h[4],m=h[5];e.push(new Ss(new N(s,r,0),new N(u,d,0),new N(f,g,0),new N(x,m,0))),s=x,r=m}break;case"Q":if(h.length>=4){const u=h[0],d=h[1],f=h[2],g=h[3];e.push(new bs(new N(s,r,0),new N(u,d,0),new N(f,g,0))),s=f,r=g}break;case"A":if(h.length>=7){const u=h[5],d=h[6];e.push(new tn(new N(s,r,0),new N(u,d,0))),s=u,r=d}break;case"Z":e.length>0&&e.push(new tn(new N(s,r,0),new N(o,a,0))),s=o,r=a;break}}),e}createCurveFromCurves(t,e,n,s,r,o,a,l){this.log.debug("Creating curve from curves:",{curvesCount:t.length,firstCurve:t[0],depth:o,panelThickness:a,panelAnchor:l});const c=t.map(u=>{if(u instanceof tn){const d=this.convertPoint2DTo3D(u.v1.x,u.v1.y,e,n,s,r,o,a,l),f=this.convertPoint2DTo3D(u.v2.x,u.v2.y,e,n,s,r,o,a,l);return new tn(d,f)}else if(u instanceof Ss){const d=this.convertPoint2DTo3D(u.v0.x,u.v0.y,e,n,s,r,o,a,l),f=this.convertPoint2DTo3D(u.v1.x,u.v1.y,e,n,s,r,o,a,l),g=this.convertPoint2DTo3D(u.v2.x,u.v2.y,e,n,s,r,o,a,l),x=this.convertPoint2DTo3D(u.v3.x,u.v3.y,e,n,s,r,o,a,l);return new Ss(d,f,g,x)}else if(u instanceof bs){const d=this.convertPoint2DTo3D(u.v0.x,u.v0.y,e,n,s,r,o,a,l),f=this.convertPoint2DTo3D(u.v1.x,u.v1.y,e,n,s,r,o,a,l),g=this.convertPoint2DTo3D(u.v2.x,u.v2.y,e,n,s,r,o,a,l);return new bs(d,f,g)}return null}).filter(u=>u!==null);this.log.debug("Sample 3D curves:",{first:c[0],middle:c[Math.floor(c.length/2)],last:c[c.length-1]});const h=new wh;return c.forEach(u=>{h.add(u)}),h}convertPoint2DTo3D(t,e,n,s,r,o,a,l,c){const h=t-n-r/2;let d=s+o-e;c==="bottom-left"&&(d=e-s);let f;return c==="top-left"?f=a-l/2:c==="bottom-left"?f=a+l/2:f=-a,new N(h,d,f)}createPathVisualization(t,e){try{const n=t.getPoints(200),s=new De().setFromPoints(n),r=new vr({color:new qt(e||"#ff0000"),linewidth:3,opacity:.8,transparent:!0}),o=new bh(s,r);return this.log.debug("Created path visualization with",n.length,"points"),o}catch(n){return this.log.error("Error creating path visualization:",n),null}}async createBitProfile(t){if(t.profilePath)try{const e=`<svg xmlns="http://www.w3.org/2000/svg"><path d="${t.profilePath}"/></svg>`,n="data:image/svg+xml;base64,"+btoa(e),s=new gr;return new Promise((r,o)=>{s.load(n,a=>{const l=gr.createShapes(a.paths[0]);if(l.length>0){let c=l[0];r(c)}else r(this.createFallbackShape(t))},void 0,a=>{this.log.error("Error loading SVG:",a),r(this.createFallbackShape(t))})})}catch(e){return this.log.error("Error parsing SVG profile:",e),this.createFallbackShape(t)}return this.createFallbackShape(t)}createFallbackShape(t){const n=(t.diameter||10)/2,s=new Xi,r=32;for(let o=0;o<=r;o++){const a=o/r*Math.PI*2,l=Math.cos(a)*n,c=Math.sin(a)*n;o===0?s.moveTo(l,c):s.lineTo(l,c)}return s}extrudeAlongPath(t,e,n){try{const s=Math.max(50,Math.floor(e.getLength()/5));let o=e.getPoints(s).map(m=>new N(m.x,m.y,m.z));const a=o[0],l=o[o.length-1],c=a.distanceTo(l)<.01;c&&o.length>1&&(o=o.slice(0,-1)),this.log.debug("Extruding with mitered corners:",{profilePoints:t.getPoints().length,contourPoints:o.length,contourClosed:c,curveLength:e.getLength()});const h=this.createProfiledContourGeometry(t,o,c);if(!h)throw new Error("Failed to create ProfiledContourGeometry");this.log.debug("ProfiledContourGeometry created:",{vertices:h.attributes.position.count,hasNormals:!!h.attributes.normal,hasUV:!!h.attributes.uv,indexCount:h.index?h.index.count:0});const d=19*2,f=h.attributes.position;if(f){const m=f.array;for(let p=2;p<m.length;p+=3)m[p]<-d/2&&(m[p]=-d/2),m[p]>d/2&&(m[p]=d/2);f.needsUpdate=!0}h.computeBoundingBox(),h.computeVertexNormals(),h.normalizeNormals();const g=new _i({color:new qt(n||"#cccccc"),roughness:.5,metalness:.2,side:Dn,wireframe:this.materialManager?this.materialManager.isWireframeEnabled():!1}),x=new Sn(h,g);return x.castShadow=!0,x.receiveShadow=!0,x}catch(s){return this.log.error("Error extruding along path:",s.message),this.log.error("Error stack:",s.stack),null}}createProfiledContourGeometry(t,e,n){try{n=n!==void 0?n:!0;let s=new Ua(t);s.rotateX(-Math.PI*.5);let r=s.attributes.position,o=new Float32Array(r.count*e.length*3);for(let h=0;h<e.length;h++){let u=new it().subVectors(e[h-1<0?e.length-1:h-1],e[h]),d=new it().subVectors(e[h+1==e.length?0:h+1],e[h]),x=(d.angle()-u.angle())*.5,m=d.angle()+Math.PI*.5;n||((h==0||h==e.length-1)&&(x=Math.PI*.5),h==e.length-1&&(m=u.angle()-Math.PI*.5));let p=Math.tan(x-Math.PI*.5),y=new Zt().set(1,0,0,0,-p,1,0,0,0,0,1,0,0,0,0,1),_=m,v=new Zt().set(Math.cos(_),-Math.sin(_),0,0,Math.sin(_),Math.cos(_),0,0,0,0,1,0,0,0,0,1),S=new Zt().set(1,0,0,e[h].x,0,1,0,e[h].y,0,0,1,e[h].z,0,0,0,1),E=r.clone();E.applyMatrix4(y),E.applyMatrix4(v),E.applyMatrix4(S),o.set(E.array,E.count*h*3)}let a=new De;a.setAttribute("position",new Ze(o,3));let l=[],c=n==!1?e.length-1:e.length;for(let h=0;h<c;h++)for(let u=0;u<r.count;u++){let d=h,f=h+1==e.length?0:h+1,g=u,x=u+1==r.count?0:u+1,m=x+r.count*d,p=g+r.count*d,y=g+r.count*f,_=x+r.count*f;l.push(m,_,p),l.push(p,_,y)}return a.setIndex(l),a.computeVertexNormals(),a.normalizeNormals(),a}catch(s){return this.log.error("Error in createProfiledContourGeometry:",s),new $i(1,1,1)}}dispose(){this.log.info("Disposed")}}class bM extends ro{constructor(){super(),this.log=Yn.createLogger("ThreeModule"),this.scene=null,this.container=null,this.animationFrameId=null,this.sceneManager=new yM,this.materialManager=new _M,this.csgEngine=new vM,this.extrusionBuilder=new SM,this.panelMesh=null,this.originalPanelGeometry=null,this.originalPanelMaterial=null,this.originalPanelPosition=null,this.originalPanelRotation=null,this.originalPanelScale=null,this.bitPathMeshes=[],this.bitExtrudeMeshes=[],this.partMesh=null,this.basePanelMesh=null,this.panelBBox=null,this.csgVisible=!1,this.updatePanelRunning=!1,this.updatePanelQueuedArgs=null,this.lastPanelUpdateSignature=null}async init(){if(this.log.info("Initializing..."),this.container=document.getElementById("three-canvas-container"),!this.container){this.log.error("Container not found");return}this.sceneManager.initialize(this.container),this.scene=this.sceneManager.scene,this.extrusionBuilder.initialize({materialManager:this.materialManager}),this.initMaterialControls(),this.addWireframeToggle(),this.addCSGModeToggle(),this.sceneManager.addStatsWidget(typeof window<"u"&&window.Stats?window.Stats:null),this.animate(),this.log.info("Initialized successfully")}initMaterialControls(){try{const t=document.createElement("div");t.style.position="absolute",t.style.top="8px",t.style.right="8px",t.style.display="flex",t.style.gap="8px",t.style.padding="6px 8px",t.style.background="rgba(255,255,255,0.9)",t.style.borderRadius="6px",t.style.boxShadow="0 2px 8px rgba(0,0,0,0.15)",t.style.zIndex="101";const e=document.createElement("select");e.title="Material",this.materialManager.getAvailableMaterials().forEach(c=>{const h=document.createElement("option");h.value=c,h.textContent=c,e.appendChild(h)}),e.value=this.materialManager.getCurrentMaterialKey(),e.addEventListener("change",()=>{this.materialManager.setMaterialMode(e.value)});const n=document.createElement("label");n.style.display="flex",n.style.alignItems="center",n.style.gap="4px";const s=document.createElement("input");s.type="checkbox",s.checked=this.materialManager.isWireframeEnabled(),s.title="Wireframe Mesh",s.addEventListener("change",()=>{this.materialManager.toggleWireframe()});const r=document.createElement("span");r.textContent="Wireframe",n.appendChild(s),n.appendChild(r);const o=document.createElement("label");o.style.display="flex",o.style.alignItems="center",o.style.gap="4px";const a=document.createElement("input");a.type="checkbox",a.checked=this.materialManager.isEdgesEnabled(),a.title="Edges Overlay",a.addEventListener("change",()=>{this.materialManager.setEdgesEnabled(a.checked)});const l=document.createElement("span");l.textContent="Edges",o.appendChild(a),o.appendChild(l),t.appendChild(e),t.appendChild(n),t.appendChild(o),this.container.style.position="relative",this.container.appendChild(t),this.materialControls={wrap:t,select:e,wf:s,ed:a}}catch(t){this.log.warn("Failed to init material controls:",t)}}addWireframeToggle(){const t=document.createElement("button");t.textContent="Wireframe",t.style.position="absolute",t.style.top="10px",t.style.right="10px",t.style.padding="8px 16px",t.style.backgroundColor="rgba(255, 255, 255, 0.9)",t.style.border="1px solid #ccc",t.style.borderRadius="4px",t.style.cursor="pointer",t.style.zIndex="100",t.style.fontSize="12px",t.style.fontWeight="500",t.addEventListener("click",()=>{this.toggleWireframe()}),this.container.appendChild(t),this.wireframeToggleBtn=t}addCSGModeToggle(){const t=document.createElement("div");t.style.position="absolute",t.style.top="50px",t.style.right="10px",t.style.padding="8px",t.style.backgroundColor="rgba(255, 255, 255, 0.9)",t.style.border="1px solid #ccc",t.style.borderRadius="4px",t.style.zIndex="100",t.style.fontSize="12px",t.style.display="flex",t.style.alignItems="center",t.style.gap="6px";const e=document.createElement("input");e.type="checkbox",e.id="csg-union-mode",e.checked=this.useUnionBeforeSubtract,e.style.cursor="pointer";const n=document.createElement("label");n.htmlFor="csg-union-mode",n.textContent="Union bits before subtract",n.style.cursor="pointer",n.style.userSelect="none",e.addEventListener("change",()=>{this.csgEngine.setUnionMode(e.checked),window.showPart&&this.bitExtrudeMeshes.length>0&&this.csgEngine.applyCSGOperation(!0)}),t.appendChild(e),t.appendChild(n),this.container.appendChild(t),this.csgModeToggle=t}addStatsWidget(){if(typeof Stats>"u"){this.log.warn("Stats.js not loaded, skipping stats widget");return}this.stats=new Stats,this.stats.showPanel(0),this.stats.dom.style.position="absolute",this.stats.dom.style.left="10px",this.stats.dom.style.top="10px",this.stats.dom.style.zIndex="100",this.container.appendChild(this.stats.dom)}buildPanelBitsSignature(t,e,n,s=[],r){const o=s.map(a=>{var l,c,h,u;return{name:a.name||a.id||"bit",x:a.x,y:a.y,op:a.operation,profile:((l=a.bitData)==null?void 0:l.profilePath)||((c=a.bitData)==null?void 0:c.name)||((h=a.bitData)==null?void 0:h.id)||((u=a.bitData)==null?void 0:u.type)||"profile"}});return JSON.stringify({w:t,h:e,t:n,anchor:r,bits:o})}async updatePanel(t,e,n,s=[],r="top-left"){var o,a,l,c;if(this.updatePanelRunning){this.updatePanelQueuedArgs={width:t,height:e,thickness:n,bits:s,panelAnchor:r};return}this.updatePanelRunning=!0,this.log.info("Updating panel",{width:t,height:e,thickness:n,bits:s.length});try{const h=this.buildPanelBitsSignature(t,e,n,s,r);if(this.lastPanelUpdateSignature===h){this.log.info("signature unchanged, skipping rebuild");return}this.panelMesh&&(this.scene.remove(this.panelMesh),this.panelMesh.geometry!==this.originalPanelGeometry&&((o=this.panelMesh.geometry)==null||o.dispose()),this.panelMesh.material!==this.originalPanelMaterial&&((a=this.panelMesh.material)==null||a.dispose()),this.panelMesh.userData.edgeLines&&(this.scene.remove(this.panelMesh.userData.edgeLines),(l=this.panelMesh.userData.edgeLines.geometry)==null||l.dispose(),(c=this.panelMesh.userData.edgeLines.material)==null||c.dispose()),this.panelMesh=null),this.partMesh&&(this.partMesh.visible=!1,this.partMesh.userData.edgeLines&&(this.partMesh.userData.edgeLines.visible=!1)),this.bitPathMeshes.forEach(f=>{this.scene.remove(f),f.geometry.dispose(),f.material.dispose()}),this.bitPathMeshes=[],this.bitExtrudeMeshes.forEach(f=>{this.scene.remove(f),f.geometry.dispose(),f.material.dispose()}),this.bitExtrudeMeshes=[],this.lastCSGSignature=null,this.csgActive=!1,this.csgVisible=!1,this.panelBBox=null;const u=new $i(t,e,n),d=this.materialManager.createMaterial(this.materialManager.getCurrentMaterialKey());this.panelMesh=new Sn(u,d),this.panelMesh.castShadow=!0,this.panelMesh.receiveShadow=!0,this.panelMesh.position.set(0,e/2,0),this.basePanelMesh=this.panelMesh,this.materialManager.initialize(this.panelMesh,this.partMesh,this.scene),this.originalPanelGeometry=this.panelMesh.geometry.clone(),this.originalPanelMaterial=this.panelMesh.material.clone(),this.originalPanelPosition=this.panelMesh.position.clone(),this.originalPanelRotation=this.panelMesh.rotation.clone(),this.originalPanelScale=this.panelMesh.scale.clone(),this.panelBBox=this.computeWorldBBox(this.originalPanelGeometry,this.originalPanelPosition,this.originalPanelRotation,this.originalPanelScale),this.csgEngine.initialize({scene:this.scene,panelMesh:this.panelMesh,bitExtrudeMeshes:this.bitExtrudeMeshes,bitPathMeshes:this.bitPathMeshes,originalPanelGeometry:this.originalPanelGeometry,originalPanelPosition:this.originalPanelPosition,originalPanelRotation:this.originalPanelRotation,originalPanelScale:this.originalPanelScale,materialManager:this.materialManager,computeWorldBBox:this.computeWorldBBox.bind(this)}),this.log.debug("Original panel data saved at creation"),s&&s.length>0&&await this.createBitPathExtrusions(s,t,e,n,r),this.sceneManager.fitCameraToPanel(t,e,n),this.log.info("Adding panel mesh and bit meshes to scene",{bitPathLinesCount:this.bitPathMeshes.length,bitExtrudeMeshesCount:this.bitExtrudeMeshes.length,bitsVisible:window.bitsVisible,showPart:window.showPart}),this.scene.add(this.panelMesh),window.bitsVisible!==!1?(this.log.info("Adding bit meshes to scene",{bitPathLines:this.bitPathMeshes.length,bitExtrudes:this.bitExtrudeMeshes.length}),this.bitPathMeshes.forEach(f=>{this.scene.add(f),f.visible=!window.showPart}),this.bitExtrudeMeshes.forEach(f=>{this.scene.add(f),f.visible=!window.showPart})):(this.log.debug("Bits not visible, hiding bit meshes"),this.bitPathMeshes.forEach(f=>{f.visible=!1}),this.bitExtrudeMeshes.forEach(f=>{f.visible=!1})),this.lastPanelUpdateSignature=h}catch(h){this.log.error("updatePanel failed",h)}finally{if(this.updatePanelRunning=!1,this.updatePanelQueuedArgs){const h=this.updatePanelQueuedArgs;this.updatePanelQueuedArgs=null,await this.updatePanel(h.width,h.height,h.thickness,h.bits,h.panelAnchor)}}}async createBitPathExtrusions(t,e,n,s,r){const o=new Set,a=[];for(const g of t){const x=g&&g.group?g.group:g;o.has(x)||(o.add(x),a.push(g))}this.log.info("Creating bit path extrusions",{bitsCount:t.length,uniqueBitsCount:a.length});const l=window.offsetContours||[],c=document.getElementById("part-front");if(!c){this.log.error("partFront element not found!");return}const h=parseFloat(c.getAttribute("x")),u=parseFloat(c.getAttribute("y")),d=parseFloat(c.getAttribute("width")),f=parseFloat(c.getAttribute("height"));this.log.debug("partFront info:",{x:h,y:u,width:d,height:f});for(const[g,x]of a.entries()){this.log.debug(`Processing bit ${g}:`,{x:x.x,y:x.y,operation:x.operation,name:x.name});const m=l.filter(b=>b.bitIndex===g);if(m.length===0){this.log.debug(`No contours found for bit ${g}`);continue}const p=m.find(b=>b.pass!==0);if(!p||!p.element){this.log.debug(`No valid contour element for bit ${g}`);continue}const _=p.element.getAttribute("d");if(!_){this.log.debug(`No path data for bit ${g}`);continue}this.log.debug(`Path data for bit ${g}:`,_.substring(0,100)+"...");const v=this.extrusionBuilder.parsePathToCurves(_);if(v.length===0){this.log.debug(`No curves found for bit ${g}:`,_);continue}this.log.debug(`Parsed ${v.length} curves for bit ${g}`);const S=this.extrusionBuilder.createCurveFromCurves(v,h,u,d,f,x.y,s,r),E=this.extrusionBuilder.createPathVisualization(S,x.color);E&&(E.userData.bitIndex=g,this.bitPathMeshes.push(E),this.log.debug(`Added path visualization for bit ${g}`));const M=await this.extrusionBuilder.createBitProfile(x.bitData);if(!M){this.log.debug(`No bit profile created for bit ${g}`);continue}const T=this.extrusionBuilder.extrudeAlongPath(M,S,x.color);T?(T.userData.operation=x.operation||"subtract",T.userData.bitIndex=g,this.bitExtrudeMeshes.push(T),this.log.debug(`Created extrude mesh for bit ${g}`)):this.log.debug(`Failed to create extrude mesh for bit ${g}`)}}toggleBitMeshesVisibility(t){this.log.debug("toggleBitMeshesVisibility called with visible:",t),this.bitPathMeshes.forEach(e=>{e.visible=t}),this.bitExtrudeMeshes.forEach(e=>{e.visible=t})}computeWorldBBox(t,e,n,s){const r=new We;t.computeBoundingBox(),r.copy(t.boundingBox);const o=new Zt,a=e||new N,l=n||new yn,c=s||new N(1,1,1);return o.compose(a,new Ti().setFromEuler(l),c),r.applyMatrix4(o),r}animate(){let t=0,e=0,n=0,s=0;return commands==null||commands.forEach(r=>{const o=r[0].toUpperCase(),a=r.slice(1).trim().split(/[\s,]+/).map(Number).filter(l=>!isNaN(l));switch(o){case"M":a.length>=2&&(t=a[0],e=a[1],n=t,s=e);break;case"L":if(a.length>=2){const l=a[0],c=a[1];curves.push(new tn(new N(t,e,0),new N(l,c,0))),t=l,e=c}break;case"H":if(a.length>=1){const l=a[0];curves.push(new tn(new N(t,e,0),new N(l,e,0))),t=l}break;case"V":if(a.length>=1){const l=a[0];curves.push(new tn(new N(t,e,0),new N(t,l,0))),e=l}break;case"C":if(a.length>=6){const l=a[0],c=a[1],h=a[2],u=a[3],d=a[4],f=a[5];curves.push(new Ss(new N(t,e,0),new N(l,c,0),new N(h,u,0),new N(d,f,0))),t=d,e=f}break;case"Q":if(a.length>=4){const l=a[0],c=a[1],h=a[2],u=a[3];curves.push(new bs(new N(t,e,0),new N(l,c,0),new N(h,u,0))),t=h,e=u}break;case"A":if(a.length>=7){const l=a[5],c=a[6];curves.push(new tn(new N(t,e,0),new N(l,c,0))),t=l,e=c}break;case"Z":curves.length>0&&curves.push(new tn(new N(t,e,0),new N(n,s,0))),t=n,e=s;break}}),curves}createCurveFromCurves(t,e,n,s,r,o,a,l){this.log.debug("Creating curve from curves:",{curvesCount:t.length,firstCurve:t[0],depth:o,panelThickness:a,panelAnchor:l});const c=t.map(u=>{if(u instanceof tn){const d=this.convertPoint2DTo3D(u.v1.x,u.v1.y,e,n,s,r,o,a,l),f=this.convertPoint2DTo3D(u.v2.x,u.v2.y,e,n,s,r,o,a,l);return new tn(d,f)}else if(u instanceof Ss){const d=this.convertPoint2DTo3D(u.v0.x,u.v0.y,e,n,s,r,o,a,l),f=this.convertPoint2DTo3D(u.v1.x,u.v1.y,e,n,s,r,o,a,l),g=this.convertPoint2DTo3D(u.v2.x,u.v2.y,e,n,s,r,o,a,l),x=this.convertPoint2DTo3D(u.v3.x,u.v3.y,e,n,s,r,o,a,l);return new Ss(d,f,g,x)}else if(u instanceof bs){const d=this.convertPoint2DTo3D(u.v0.x,u.v0.y,e,n,s,r,o,a,l),f=this.convertPoint2DTo3D(u.v1.x,u.v1.y,e,n,s,r,o,a,l),g=this.convertPoint2DTo3D(u.v2.x,u.v2.y,e,n,s,r,o,a,l);return new bs(d,f,g)}return null}).filter(u=>u!==null);this.log.debug("Sample 3D curves:",{first:c[0],middle:c[Math.floor(c.length/2)],last:c[c.length-1]});const h=new wh;return c.forEach(u=>{h.add(u)}),h}convertPoint2DTo3D(t,e,n,s,r,o,a,l,c){const h=t-n-r/2;let d=s+o-e;c==="bottom-left"&&(d=e-s);let f;return c==="top-left"?f=a-l/2:c==="bottom-left"?f=a+l/2:f=-a,new N(h,d,f)}createPathVisualization(t,e){try{const n=t.getPoints(200),s=new De().setFromPoints(n),r=new vr({color:new qt(e||"#ff0000"),linewidth:3,opacity:.8,transparent:!0}),o=new bh(s,r);return this.log.debug("Created path visualization with",n.length,"points"),o}catch(n){return this.log.error("Error creating path visualization:",n),null}}async createBitProfile(t){if(t.profilePath)try{const e=`<svg xmlns="http://www.w3.org/2000/svg"><path d="${t.profilePath}"/></svg>`,n="data:image/svg+xml;base64,"+btoa(e),s=new gr;return new Promise((r,o)=>{s.load(n,a=>{const l=gr.createShapes(a.paths[0]);if(l.length>0){let c=l[0];r(c)}else r(this.createFallbackShape(t))},void 0,a=>{this.log.error("Error loading SVG:",a),r(this.createFallbackShape(t))})})}catch(e){return this.log.error("Error parsing SVG profile:",e),this.createFallbackShape(t)}return this.createFallbackShape(t)}createFallbackShape(t){const n=(t.diameter||10)/2,s=new Xi,r=32;for(let o=0;o<=r;o++){const a=o/r*Math.PI*2,l=Math.cos(a)*n,c=Math.sin(a)*n;o===0?s.moveTo(l,c):s.lineTo(l,c)}return s}rotateShape(t,e){const s=t.getPoints(200).map(o=>{const a=o.x,c=o.y,h=-a;return new it(c,h)}),r=new Xi;return r.setFromPoints(s),r}extrudeAlongPath(t,e,n){try{const s=Math.max(50,Math.floor(e.getLength()/5));let o=e.getPoints(s).map(m=>new N(m.x,m.y,m.z));const a=o[0],l=o[o.length-1],c=a.distanceTo(l)<.01;c&&o.length>1&&(o=o.slice(0,-1)),this.log.debug("Extruding with mitered corners:",{profilePoints:t.getPoints().length,contourPoints:o.length,contourClosed:c,curveLength:e.getLength()});const h=this.ProfiledContourGeometry(t,o,c);if(!h)throw new Error("Failed to create ProfiledContourGeometry");this.log.debug("ProfiledContourGeometry created:",{vertices:h.attributes.position.count,hasNormals:!!h.attributes.normal,hasUV:!!h.attributes.uv,indexCount:h.index?h.index.count:0});const d=19*2,f=h.attributes.position;if(f){const m=f.array;for(let p=2;p<m.length;p+=3)m[p]<-d/2&&(m[p]=-d/2),m[p]>d/2&&(m[p]=d/2);f.needsUpdate=!0}h.computeBoundingBox(),h.computeVertexNormals(),h.normalizeNormals();const g=new _i({color:new qt(n||"#cccccc"),roughness:.5,metalness:.2,side:Dn,wireframe:this.materialManager.isWireframeEnabled()}),x=new Sn(h,g);return x.castShadow=!0,x.receiveShadow=!0,x}catch(s){return this.log.error("Error extruding along path:",s.message),this.log.error("Error stack:",s.stack),this.log.error("ProfiledContourGeometry function:",this.ProfiledContourGeometry.toString().substring(0,200)),null}}ProfiledContourGeometry(t,e,n){try{n=n!==void 0?n:!0;let s=new Ua(t);s.rotateX(-Math.PI*.5);let r=s.attributes.position,o=new Float32Array(r.count*e.length*3);for(let h=0;h<e.length;h++){let u=new it().subVectors(e[h-1<0?e.length-1:h-1],e[h]),d=new it().subVectors(e[h+1==e.length?0:h+1],e[h]),x=(d.angle()-u.angle())*.5,m=d.angle()+Math.PI*.5;n||((h==0||h==e.length-1)&&(x=Math.PI*.5),h==e.length-1&&(m=u.angle()-Math.PI*.5));let p=Math.tan(x-Math.PI*.5),y=new Zt().set(1,0,0,0,-p,1,0,0,0,0,1,0,0,0,0,1),_=m,v=new Zt().set(Math.cos(_),-Math.sin(_),0,0,Math.sin(_),Math.cos(_),0,0,0,0,1,0,0,0,0,1),S=new Zt().set(1,0,0,e[h].x,0,1,0,e[h].y,0,0,1,e[h].z,0,0,0,1),E=r.clone();E.applyMatrix4(y),E.applyMatrix4(v),E.applyMatrix4(S),o.set(E.array,E.count*h*3)}let a=new De;a.setAttribute("position",new Ze(o,3));let l=[],c=n==!1?e.length-1:e.length;for(let h=0;h<c;h++)for(let u=0;u<r.count;u++){let d=h,f=h+1==e.length?0:h+1,g=u,x=u+1==r.count?0:u+1,m=x+r.count*d,p=g+r.count*d,y=g+r.count*f,_=x+r.count*f;l.push(m,_,p),l.push(p,_,y)}return a.setIndex(l),a.computeVertexNormals(),a.normalizeNormals(),a}catch(s){return this.log.error("Error in ProfiledContourGeometry:",s),new $i(1,1,1)}}toggleBitMeshesVisibility(t){this.log.debug("toggleBitMeshesVisibility called with visible:",t),this.bitPathMeshes.forEach(e=>{e.visible=t}),this.bitExtrudeMeshes.forEach(e=>{e.visible=t})}computeWorldBBox(t,e,n,s){const r=new We;t.computeBoundingBox(),r.copy(t.boundingBox);const o=new Zt,a=e||new N,l=n||new yn,c=s||new N(1,1,1);return o.compose(a,new Ti().setFromEuler(l),c),r.applyMatrix4(o),r}animate(){this.animationFrameId=requestAnimationFrame(this.animate.bind(this)),this.sceneManager.render()}onWindowResize(){this.sceneManager.onWindowResize()}applyCSGOperation(t){this.csgEngine.applyCSGOperation(t)}showBasePanel(){this.csgEngine.showBasePanel()}showCSGResult(){this.csgEngine.showCSGResult()}setVisible(t){this.container&&(this.container.style.display=t?"flex":"none")}cleanup(){this.animationFrameId&&cancelAnimationFrame(this.animationFrameId),this.sceneManager&&this.sceneManager.dispose(),this.materialManager&&this.materialManager.dispose(),this.csgEngine&&this.csgEngine.dispose(),this.extrusionBuilder&&this.extrusionBuilder.dispose(),this.panelMesh&&(this.panelMesh.geometry.dispose(),this.panelMesh.material.dispose()),this.bitPathMeshes.forEach(t=>{t.geometry.dispose(),t.material.dispose()}),this.bitExtrudeMeshes.forEach(t=>{t.geometry.dispose(),t.material.dispose()}),this.scene&&this.scene.traverse(t=>{t.geometry&&t.geometry.dispose(),t.material&&(Array.isArray(t.material)?t.material.forEach(e=>e.dispose()):t.material.dispose())}),this.log.info("Cleaned up")}get csgActive(){return this.csgEngine.csgActive}set csgActive(t){this.csgEngine.csgActive=t}get partMesh(){return this.csgEngine.partMesh}set partMesh(t){this.csgEngine.partMesh=t}get lastCSGSignature(){return this.csgEngine.lastCSGSignature}set lastCSGSignature(t){this.csgEngine.lastCSGSignature=t}get panelBBox(){return this.csgEngine.panelBBox}set panelBBox(t){this.csgEngine.panelBBox=t}get csgVisible(){return this.csgEngine.csgVisible}set csgVisible(t){this.csgEngine.csgVisible=t}get useUnionBeforeSubtract(){return this.csgEngine.useUnionBeforeSubtract}set useUnionBeforeSubtract(t){this.csgEngine.useUnionBeforeSubtract=t}get camera(){return this.sceneManager.camera}get renderer(){return this.sceneManager.renderer}get controls(){return this.sceneManager.controls}get lights(){return this.sceneManager.lights}get cameraFitted(){return this.sceneManager.cameraFitted}set cameraFitted(t){this.sceneManager.cameraFitted=t}get stats(){return this.sceneManager.stats}set stats(t){this.sceneManager.stats=t}}hn.registerModule(i=>new jp,"canvas");hn.registerModule(i=>new Kp,"bits");hn.registerModule(i=>new Fp,"export");hn.registerModule(i=>new Jp,"ui");hn.registerModule(i=>new bM,"three");const Se="http://www.w3.org/2000/svg",vi=Yn.createLogger("Script"),qr=document.getElementById("canvas"),ca=document.getElementById("panel-width"),ha=document.getElementById("panel-height"),ua=document.getElementById("panel-thickness");let Gn,no,ke=400,Ra=600,Ae=19,Ln="top-left",ie=!1,cn,zn=!0,Hn=!0;window.showPart=ie;window.bitsVisible=zn;window.isDraggingBit=!1;let Ct,Le,$d,wn,Fi=1;qn.setPanelSize(ke,Ra);qn.setPanelThickness(Ae);qn.setPanelAnchor(Ln);qn.setShowPart(ie);qn.setBitsVisible(zn);qn.setShankVisible(Hn);qn.setGridSize(Fi);let Ee=[];function MM(){if(!Ct){const l={width:800,height:600},c=(l.width-ke)/2,h=(l.height-Ae)/2,u=Va(),d=c+u.x+Fi/2,f=h+u.y+Fi/2;Ct=new ef({canvas:qr,enableZoom:!0,enablePan:!1,enableGrid:!0,enableMouseEvents:!0,gridSize:Fi,gridAnchorX:d,gridAnchorY:f,initialZoom:1,layers:["grid","panel","offsets","bits","phantoms","overlay"],onZoom:(g,x,m)=>{za(g)}}),window.mainCanvasManager=Ct}const i=Ct.getLayer("panel");qi=Ct.getLayer("bits"),Ct.getLayer("phantoms"),cn=document.createElementNS(Se,"path"),cn.id="part-path",cn.setAttribute("fill","rgba(71, 64, 64, 0.16)"),cn.setAttribute("stroke","black"),cn.setAttribute("stroke-width",ni()),cn.style.display="none",i.appendChild(cn);const t=document.createElementNS(Se,"g");t.id="panel-anchor-indicator",i.appendChild(t),document.getElementById("zoom-in-btn").addEventListener("click",()=>Ct.zoomIn()),document.getElementById("zoom-out-btn").addEventListener("click",()=>Ct.zoomOut()),document.getElementById("fit-scale-btn").addEventListener("click",up),document.getElementById("zoom-selected-btn").addEventListener("click",UM),document.getElementById("toggle-grid-btn").addEventListener("click",()=>Ct.toggleGrid()),document.getElementById("grid-scale").addEventListener("blur",l=>{const c=de(l.target.value);l.target.value=c,Fi=parseFloat(c)||1,qn.setGridSize(Fi),Ct.config.gridSize=Fi,updateGridAnchor(),Ct.gridEnabled&&Ct.drawGrid()});const e=document.getElementById("panel-anchor-btn");e.appendChild(cp(Ln)),e.addEventListener("click",AM),document.getElementById("part-btn").addEventListener("click",zM);const n=document.getElementById("bits-btn");n.addEventListener("click",OM),n.classList.add("bits-visible");const s=document.getElementById("shank-btn");s.addEventListener("click",kM),s.classList.add("shank-visible"),document.getElementById("export-dxf-btn").addEventListener("click",VM),document.getElementById("save-btn").addEventListener("click",GM),document.getElementById("save-as-btn").addEventListener("click",HM),document.getElementById("load-btn").addEventListener("click",WM),document.getElementById("clear-btn").addEventListener("click",XM),Le=new ic(Ct),Le.onDrawBitShape=(l,c)=>PM(l,c,Le.createBitShapeElement.bind(Le)),Le.onUpdateCanvasBits=l=>CM(l),Le.onUpdateCanvasBitWithParams=(l,c,h)=>r(l,c,h),$d=new Xp(qr,Ct,{autoScrollSpeed:50,autoScrollThreshold:50,bitTolerance:20,touchTolerance:30}),$d.setCallbacks({getBitsOnCanvas:()=>jt,getSelectedBitIndices:()=>Ee,selectBit:hp,resetBitHighlight:Fh,updateBitPosition:La,updateTableCoordinates:pp,updatePartShape:$e,getAnchorOffset:xr,getPanelAnchorCoords:Ga,updateBitsSheet:un,redrawBitsOnCanvas:ji,getBitsVisible:()=>zn,getShowPart:()=>ie,getThreeModule:()=>window.threeModule,getCsgScheduler:()=>Ei}),wn=new Yp({canvas:qr,canvasManager:Ct,bitsManager:Le,panelWidth:ke,panelHeight:Ra,panelThickness:Ae,panelAnchor:Ln,gridSize:Fi,onPanelUpdate:()=>{ke=wn.getWidth(),Ra=wn.getHeight(),Ae=wn.getThickness()},onAnchorChange:l=>{Ln=l,wM(),He(),dn(),ie&&$e()},getAdaptiveStrokeWidth:ni,updatePartShape:$e,updateOffsetContours:He,updatePhantomBits:dn,updateBitsSheet:un}),wn.initializeSVGElements(),Gn=wn.partSection,no=wn.partFront;function r(l,c,h){jt.forEach((u,d)=>{if(u.bitData.id===l){u.bitData={...u.bitData,...c},c.name&&c.name!==u.name&&(u.name=c.name);const f=u.group.querySelector("g");if(f){const g=Ee.includes(d),x=Le.createBitShapeElement(u.bitData,h,u.baseAbsX,u.baseAbsY,g);if(g){const m=x.querySelector(".bit-shape"),p=x.querySelector(".shank-shape"),y=Math.max(.1,.5/Math.sqrt(Ct.zoomLevel));m&&(m.setAttribute("stroke","#00BFFF"),m.setAttribute("stroke-width",y)),p&&(p.setAttribute("stroke","#00BFFF"),p.setAttribute("stroke-width",y),p.style.display=Hn?"block":"none")}u.group.replaceChild(x,f)}}}),un(),He(),dn(),ie&&$e(),window.threeModule&&Xn()}document.getElementById("export-bits-btn").addEventListener("click",()=>{$h(()=>Promise.resolve().then(()=>jh),void 0).then(l=>{l.exportToJSON()})}),document.getElementById("import-bits-btn").addEventListener("click",()=>{const l=document.createElement("input");l.type="file",l.accept=".json",l.onchange=c=>{const h=c.target.files[0];if(h){const u=new FileReader;u.onload=d=>{const f=d.target.result;$h(()=>Promise.resolve().then(()=>jh),void 0).then(g=>{g.importFromJSON(f)?(Le.refreshBitGroups(),jt=[],un(),ji()):alert("Failed to import bits data. Please check the JSON format.")})},u.readAsText(h)}},l.click()});const o=hn.getModule("ui");document.getElementById("toggle-left-panel").addEventListener("click",()=>o.toggleLeftPanel()),document.getElementById("toggle-right-menu").addEventListener("click",()=>o.toggleRightMenu()),document.getElementById("theme-toggle").addEventListener("click",()=>{hn.getModule("ui").toggleTheme()})}function EM(){const i=Ct.canvasParameters.width,t=Ct.canvasParameters.height;Ct.canvasParameters.width=qr.getBoundingClientRect().width,Ct.canvasParameters.height=qr.getBoundingClientRect().height,Ct.panX=Ct.panX/i*Ct.canvasParameters.width,Ct.panY=Ct.panY/t*Ct.canvasParameters.height,Ct.updateViewBox()}function AM(){if(wn){wn.cyclePanelAnchor(),Ln=wn.getAnchor();const i=document.getElementById("panel-anchor-btn");i&&(i.innerHTML="",i.appendChild(cp(Ln)))}}function wM(){const i=(Ct.canvasParameters.width-ke)/2,t=(Ct.canvasParameters.height-Ae)/2,e=Ln==="top-left"?"bottom-left":"top-left",n=i,s=e==="top-left"?t:t+Ae,r=i,o=Ln==="top-left"?t:t+Ae;jt.forEach(a=>{const l=n+a.x,c=s+a.y,h=l-r,u=c-o;a.x=h,a.y=u,un();const d=r+h,f=o+u,g=d-a.baseAbsX,x=f-a.baseAbsY;a.group.setAttribute("transform",`translate(${g}, ${x})`)}),He(),dn(),ie&&$e()}function op(){wn?wn.updatePanelShape():(Gn.setAttribute("x",(Ct.canvasParameters.width-ke)/2),Gn.setAttribute("y",(Ct.canvasParameters.height-Ae)/2),Gn.setAttribute("width",ke),Gn.setAttribute("height",Ae),Gn.setAttribute("fill","rgba(155, 155, 155, 0.16)"))}function ap(){const i=(Ct.canvasParameters.width-ke)/2,t=(Ct.canvasParameters.height-Ae)/2,e=Va(),n=i+e.x,s=t+e.y;jt.forEach(r=>{const o=n+(r.x||0),a=s+(r.y||0),l=o-r.baseAbsX,c=a-r.baseAbsY;r.group&&r.group.setAttribute("transform",`translate(${l}, ${c})`)}),ji(),ie&&$e()}let jt=[],io=0,Yi=null,qi,Vi=[];window.offsetContours=Vi;function lp(i){const t=Va();return{x:i.x+t.x,y:i.y+t.y}}function dn(){const i=Ct.getLayer("phantoms");i.innerHTML="";const t=(Ct.canvasParameters.width-ke)/2,e=(Ct.canvasParameters.height-Ae)/2,n={x:0,y:0},s=t+n.x,r=e+n.y;jt.forEach((o,a)=>{if(o.operation==="VC"){const l=lp(o),c=o.bitData.angle||90,h=l.y,d=(o.bitData.diameter||10)/2*(1/Math.tan(ba(c)/2)),f=d<h?Math.ceil(h/d):1,g=[];for(let x=0;x<f;x++)g.push(h*(x+1)/f);if(f>1){const x=g.map(m=>{const p=m*Math.tan(ba(c/2));return l.x-p});x.reverse(),x.forEach((m,p)=>{if(p===f-1)return;const y={...o.bitData,fillColor:"rgba(128, 128, 128, 0.1)"},_=s+x[p+1],v=r+g[p],S=Le.createBitShapeElement(y,o.groupName,_,v,!1,!1);S.setAttribute("stroke","gray"),S.setAttribute("stroke-width",ni(Ct.zoomLevel)),S.setAttribute("fill","rgba(128, 128, 128, 0.1)"),S.classList.add("phantom-bit"),i.appendChild(S)})}}})}function He(){const i=Ct.getLayer("offsets");i.innerHTML="",Vi=[],window.offsetContours=Vi,(Ct.canvasParameters.width-ke)/2,(Ct.canvasParameters.height-Ae)/2;const t=new kp,e=t.rectToPoints(no);jt.forEach((n,s)=>{if(n.operation==="VC"){const r=lp(n),o=n.bitData.angle||90,a=r.y,c=(n.bitData.diameter||10)/2*(1/Math.tan(ba(o)/2)),h=c<a?Math.ceil(a/c):1,u=[];for(let g=0;g<h;g++)u.push(a*(g+1)/h);const d=u.map(g=>{const x=g*Math.tan(ba(o/2));return r.x-x});if(d.reverse(),e&&e.length>0){const g=t.calculateOffset(e,r.x);if(g&&g.length>0){const x=g.map((p,y)=>y===0?`M ${p.x} ${p.y}`:`L ${p.x} ${p.y}`).join(" ")+" Z",m=document.createElementNS(Se,"path");m.setAttribute("d",x),m.setAttribute("fill","none"),m.setAttribute("stroke","black"),m.setAttribute("stroke-width",ni()),m.setAttribute("stroke-dasharray","5,5"),m.classList.add("offset-contour"),i.appendChild(m),Vi.push({element:m,bitIndex:s,offsetDistance:r.x,operation:"VC",pass:0})}}const f=t.calculateOffset(e,d[0]);if(f&&f.length>0){const g=f.map((m,p)=>p===0?`M ${m.x} ${m.y}`:`L ${m.x} ${m.y}`).join(" ")+" Z",x=document.createElementNS(Se,"path");x.setAttribute("d",g),x.setAttribute("fill","none"),x.setAttribute("stroke",n.color||"#cccccc"),x.setAttribute("stroke-width",ni()),x.setAttribute("stroke-dasharray","5,5"),x.classList.add("offset-contour"),i.appendChild(x),Vi.push({element:x,bitIndex:s,offsetDistance:d[0],operation:"VC",pass:1,depth:r.y})}}else{let r=n.x;n.operation==="OU"?r=n.x+(n.bitData.diameter||0)/2:n.operation==="IN"&&(r=n.x-(n.bitData.diameter||0)/2);const o=t.calculateOffset(e,r);if(o&&o.length>0){const a=o.map((c,h)=>h===0?`M ${c.x} ${c.y}`:`L ${c.x} ${c.y}`).join(" ")+" Z",l=document.createElementNS(Se,"path");l.setAttribute("d",a),l.setAttribute("fill","none"),l.setAttribute("stroke",n.color||"#cccccc"),l.setAttribute("stroke-width",ni()),l.setAttribute("stroke-dasharray","5,5"),l.classList.add("offset-contour"),i.appendChild(l),Vi.push({element:l,bitIndex:s,offsetDistance:r})}}})}const tc=["center","left","right"];function TM(i){const t=document.createElementNS(Se,"svg");t.setAttribute("width","20"),t.setAttribute("height","20"),t.setAttribute("viewBox","0 0 20 20"),t.style.cursor="pointer";const e=document.createElementNS(Se,"rect");if(e.setAttribute("width","20"),e.setAttribute("height","20"),e.setAttribute("fill","white"),e.setAttribute("stroke","black"),e.setAttribute("stroke-width","1"),t.appendChild(e),i==="center"){const n=document.createElementNS(Se,"line");n.setAttribute("x1","10"),n.setAttribute("y1","3"),n.setAttribute("x2","10"),n.setAttribute("y2","17"),n.setAttribute("stroke","black"),n.setAttribute("stroke-width","1"),n.setAttribute("stroke-dasharray","2,2"),t.appendChild(n);const s=document.createElementNS(Se,"rect");s.setAttribute("x","7"),s.setAttribute("y","8"),s.setAttribute("width","6"),s.setAttribute("height","4"),s.setAttribute("fill","black"),t.appendChild(s)}else if(i==="left"){const n=document.createElementNS(Se,"line");n.setAttribute("x1","5"),n.setAttribute("y1","3"),n.setAttribute("x2","5"),n.setAttribute("y2","17"),n.setAttribute("stroke","black"),n.setAttribute("stroke-width","1"),n.setAttribute("stroke-dasharray","2,2"),t.appendChild(n);const s=document.createElementNS(Se,"rect");s.setAttribute("x","2"),s.setAttribute("y","8"),s.setAttribute("width","6"),s.setAttribute("height","4"),s.setAttribute("fill","black"),t.appendChild(s)}else if(i==="right"){const n=document.createElementNS(Se,"line");n.setAttribute("x1","15"),n.setAttribute("y1","3"),n.setAttribute("x2","15"),n.setAttribute("y2","17"),n.setAttribute("stroke","black"),n.setAttribute("stroke-width","1"),n.setAttribute("stroke-dasharray","2,2"),t.appendChild(n);const s=document.createElementNS(Se,"rect");s.setAttribute("x","12"),s.setAttribute("y","8"),s.setAttribute("width","6"),s.setAttribute("height","4"),s.setAttribute("fill","black"),t.appendChild(s)}return t}function cp(i){const t=document.createElementNS(Se,"svg");t.setAttribute("width","20"),t.setAttribute("height","20"),t.setAttribute("viewBox","0 0 20 20"),t.style.cursor="pointer";const e=document.createElementNS(Se,"rect");e.setAttribute("width","20"),e.setAttribute("height","20"),e.setAttribute("fill","rgba(155, 155, 155, 0.5)"),e.setAttribute("stroke","black"),e.setAttribute("stroke-width",ni()),t.appendChild(e);const n=2;let s,r;i==="top-left"?(s=3,r=3):i==="bottom-left"&&(s=3,r=17);const o=document.createElementNS(Se,"line");o.setAttribute("x1",s-n),o.setAttribute("y1",r),o.setAttribute("x2",s+n),o.setAttribute("y2",r),o.setAttribute("stroke","red"),o.setAttribute("stroke-width",ni()),t.appendChild(o);const a=document.createElementNS(Se,"line");return a.setAttribute("x1",s),a.setAttribute("y1",r-n),a.setAttribute("x2",s),a.setAttribute("y2",r+n),a.setAttribute("stroke","red"),a.setAttribute("stroke-width",ni()),t.appendChild(a),t}async function CM(i){const t=xs();let e=null;for(const n in t){const s=t[n].find(r=>r.id===i);if(s){e=s;break}}e&&(jt.forEach((n,s)=>{if(n.bitData.id===i){n.bitData=e,n.name=e.name,Le.assignProfilePathsToBits([n]);const r=n.group.querySelector("g");if(r){const o=Ee.includes(s),a=Le.createBitShapeElement(e,n.groupName,n.baseAbsX,n.baseAbsY,o);if(o){const l=a.querySelector(".bit-shape"),c=a.querySelector(".shank-shape"),h=Math.max(.1,.5/Math.sqrt(Ct.zoomLevel));l&&(l.setAttribute("stroke","#00BFFF"),l.setAttribute("stroke-width",h)),c&&(c.setAttribute("stroke","#00BFFF"),c.setAttribute("stroke-width",h),c.style.display=Hn?"block":"none")}n.group.replaceChild(a,r)}}}),window.threeModule&&(await Xn(),ie&&(window.threeModule.showBasePanel(),Ei.schedule(!0))),un(),He(),dn(),ie&&$e(),window.threeModule&&(await Xn(),ie&&(window.threeModule.showBasePanel(),Ei.schedule(!0))))}function PM(i,t,e){updatepanelParams();const n=(Ct.canvasParameters.width-ke)/2,s=(Ct.canvasParameters.height-Ae)/2,r=n+ke/2,o=s,a=e(i,t,r,o),l=document.createElementNS(Se,"g");l.appendChild(a),l.setAttribute("transform","translate(0, 0)"),qi.appendChild(l),io++;const c=r-n,h=o-s,u={number:io,name:i.name,x:c,y:h,alignment:"center",operation:"AL",color:i.fillColor||"#cccccc",group:l,baseAbsX:r,baseAbsY:o,bitData:i,groupName:t};jt.push(u),Le.assignProfilePathsToBits([u]),un(),za(),He(),ie&&$e()}function un(){const i=document.getElementById("bits-sheet-body");i.innerHTML="",jt.forEach((e,n)=>{const s=document.createElement("tr");s.setAttribute("data-index",n),s.addEventListener("click",M=>{M.target.tagName==="INPUT"||M.target.tagName==="SELECT"||M.target.closest("button")||M.target.closest("svg")||M.target.closest("option")||(M.stopPropagation(),hp(n))});const r=document.createElement("td");r.className="drag-handle",r.draggable=!0,r.textContent="☰",r.addEventListener("dragstart",DM),r.addEventListener("dragend",BM),s.appendChild(r);const o=document.createElement("td");o.textContent=n+1,s.appendChild(o);const a=document.createElement("td");a.textContent=e.name,s.appendChild(a);const l=document.createElement("td"),c=document.createElement("input");c.type="text";const h=xr(e);c.value=e.x+h.x,c.addEventListener("change",async()=>{const M=de(c.value);c.value=M;const b=(parseFloat(M)||0)-h.x;await La(n,b,e.y)}),l.appendChild(c),s.appendChild(l);const u=document.createElement("td"),d=document.createElement("input");d.type="text",d.value=fp(e.y,h),d.addEventListener("change",async()=>{const M=de(d.value);d.value=M;const T=FM(M,h);await La(n,e.x,T)}),u.appendChild(d),s.appendChild(u);const f=document.createElement("td"),g=document.createElement("button");g.type="button",g.style.background="none",g.style.border="none",g.style.padding="0",g.style.cursor="pointer",g.appendChild(TM(e.alignment||"center")),g.addEventListener("click",async M=>{M.stopPropagation(),await LM(n)}),f.appendChild(g),s.appendChild(f);const x=document.createElement("td"),m=document.createElement("select");m.style.width="100%",m.style.padding="2px",m.style.border="1px solid #ccc",m.style.borderRadius="3px";const p=hh(e.groupName),y={AL:"Profile Along",OU:"Profile Outside",IN:"Profile Inside",VC:"V-Carve",PO:"Pocketing",RE:"Re-Machining",TS:"T-Slotting",DR:"Drill"};p.forEach(M=>{const T=document.createElement("option");T.value=M,T.textContent=y[M]||M,e.operation===M&&(T.selected=!0),m.appendChild(T)}),m.addEventListener("change",()=>{e.operation=m.value,He(),dn(),window.threeModule&&(Xn(),ie&&(window.threeModule.showBasePanel(),Ei.schedule(!0)))}),x.appendChild(m),s.appendChild(x);const _=document.createElement("td"),v=document.createElement("input");v.id="bit-color-input",v.type="color",v.value=e.color||"#cccccc",v.style.border="1px solid #ccc",v.style.borderRadius="3px",v.style.cursor="pointer",v.addEventListener("input",()=>{var T;e.color=v.value;const M=(T=e.group)==null?void 0:T.querySelector("g");if(M){const b={...e.bitData,fillColor:e.color},A=Le.createBitShapeElement(b,e.groupName,e.baseAbsX,e.baseAbsY,Ee.includes(n));e.group.replaceChild(A,M)}He(),dn(),window.threeModule&&Xn()}),_.appendChild(v),s.appendChild(_);const S=document.createElement("td"),E=document.createElement("button");E.type="button",E.className="del-btn",E.textContent="✕",E.title="Delete bit from canvas",E.addEventListener("click",M=>{M.stopPropagation(),RM(n)}),S.appendChild(E),s.appendChild(S),s.addEventListener("dragover",IM),s.addEventListener("drop",NM),Ee.includes(n)&&s.classList.add("selected-bit-row"),i.appendChild(s)});const t=document.getElementById("right-menu");t&&t.addEventListener("click",e=>{e.target.closest("input, button, svg, tr, td, th")||(Ee.forEach(s=>{Fh(s)}),Ee=[],un(),ji())})}function RM(i){if(i<0||i>=jt.length)return;const t=jt[i];t.group&&t.group.parentNode&&t.group.parentNode.removeChild(t.group),jt.splice(i,1),Ee=Ee.filter(e=>e!==i).map(e=>e>i?e-1:e),un(),ji(),He(),dn(),ie&&$e(),window.threeModule&&Xn()}async function LM(i){const t=jt[i];if(!t)return;const n=(tc.indexOf(t.alignment||"center")+1)%tc.length,s=tc[n],r=xr(t);t.alignment=s;const o=xr(t),a=r.x-o.x,l=r.y-o.y;if(a!==0||l!==0){const c=t.x+a,h=t.y+l;await La(i,c,h)}un(),ie&&$e(),window.threeModule&&Xn()}function hp(i){const t=Ee.indexOf(i);if(t!==-1)Ee.splice(t,1),Fh(i);else{Ee.push(i);const e=jt[i];if(e&&e.group){const n=e.group.querySelector("g");if(n){const s=n.querySelector(".bit-shape");n.querySelector(".shank-shape"),s&&(s.dataset.originalFill=s.getAttribute("fill"),s.dataset.originalStroke=s.getAttribute("stroke"));const r={...e.bitData,fillColor:e.color},o=Le.createBitShapeElement(r,e.groupName,e.baseAbsX,e.baseAbsY,!0);e.group.replaceChild(o,n);const a=o.querySelector(".bit-shape"),l=o.querySelector(".shank-shape"),c=Math.max(.1,.5/Math.sqrt(Ct.zoomLevel));a&&(a.setAttribute("stroke","#00BFFF"),a.setAttribute("stroke-width",c)),l&&(l.setAttribute("stroke","#00BFFF"),l.setAttribute("stroke-width",c))}}}un(),ji()}function Fh(i){const t=jt[i];if(t&&t.group){const e=t.group.querySelector("g");if(e){const n={...t.bitData,fillColor:t.color},s=Le.createBitShapeElement(n,t.groupName,t.baseAbsX,t.baseAbsY,!1);t.group.replaceChild(s,e);const r=Math.max(.1,.5/Math.sqrt(Ct.zoomLevel)),o=s.querySelector(".bit-shape"),a=s.querySelector(".shank-shape");o&&o.setAttribute("stroke-width",r),a&&(a.setAttribute("stroke","black"),a.setAttribute("stroke-width",r),a.style.display=Hn?"block":"none")}}}async function La(i,t,e){updatepanelParams();const n=Ga(),s=n.x,r=n.y;if(Ee.includes(i)&&Ee.length>1){const u=jt[i],d=u.x,f=u.y,g=t-d,x=e-f;Ee.forEach(m=>{if(m!==i){const p=jt[m],y=p.x+g,_=p.y+x,v=s+y,S=r+_,E=v-p.baseAbsX,M=S-p.baseAbsY;p.group.setAttribute("transform",`translate(${E}, ${M})`),p.x=y,p.y=_}}),Ee.forEach(m=>{pp(m,jt[m].x,jt[m].y)})}const o=jt[i],a=s+t,l=r+e,c=a-o.baseAbsX,h=l-o.baseAbsY;o.group.setAttribute("transform",`translate(${c}, ${h})`),o.x=t,o.y=e,ji(),He(),dn(),za(),ie&&$e(),window.threeModule&&(await Xn(),ie&&(vi.debug("CSG recalculation after table input"),Ei.schedule(!0)))}function DM(i){Yi=this.closest("tr"),i.dataTransfer.effectAllowed="move",i.dataTransfer.setData("text/plain",Yi.getAttribute("data-index")),Yi.style.opacity="0.4"}function IM(i){return i.preventDefault&&i.preventDefault(),i.dataTransfer.dropEffect="move",!1}function NM(i){if(i.stopPropagation&&i.stopPropagation(),!Yi)return!1;const t=parseInt(Yi.getAttribute("data-index"),10),e=parseInt(this.getAttribute("data-index"),10);if(t!==e){const[n]=jt.splice(t,1);jt.splice(e,0,n),Ee=Ee.map(s=>s===t?e:s>t&&s<=e?s-1:s>=e&&s<t?s+1:s),un(),ji()}return!1}function BM(i){Yi&&(Yi.style.opacity="1"),Yi=null}function ji(){const i=document.getElementById("bits-layer");i.innerHTML="",jt.forEach((t,e)=>{t.number=e+1,i.appendChild(t.group),t.group.querySelectorAll(".anchor-point").forEach(u=>u.remove());const n=document.createElementNS(Se,"g");n.classList.add("anchor-point");const s=xr(t),r=s.x+t.baseAbsX,o=s.y+t.baseAbsY,a=3,l=Math.max(.1,.5/Math.sqrt(Ct.zoomLevel)),c=document.createElementNS(Se,"line");c.setAttribute("x1",r-a),c.setAttribute("y1",o),c.setAttribute("x2",r+a),c.setAttribute("y2",o),c.setAttribute("stroke","red"),c.setAttribute("stroke-width",l),n.appendChild(c);const h=document.createElementNS(Se,"line");h.setAttribute("x1",r),h.setAttribute("y1",o-a),h.setAttribute("x2",r),h.setAttribute("y2",o+a),h.setAttribute("stroke","red"),h.setAttribute("stroke-width",l),n.appendChild(h),Ee.includes(e)?n.setAttribute("visibility","visible"):n.setAttribute("visibility","hidden"),t.group.appendChild(n)})}function ni(i=Ct==null?void 0:Ct.zoomLevel){return i?Math.max(.1,.5/Math.sqrt(i)):1}function za(i=Ct==null?void 0:Ct.zoomLevel){if(!i)return;const t=ni(i);Gn&&Gn.setAttribute("stroke-width",t),no&&no.setAttribute("stroke-width",t),jt.forEach(n=>{var o,a;const s=(o=n.group)==null?void 0:o.querySelector(".bit-shape"),r=(a=n.group)==null?void 0:a.querySelector(".shank-shape");s&&s.setAttribute("stroke-width",t),r&&r.setAttribute("stroke-width",t)}),Vi.forEach(n=>{n.element&&n.element.setAttribute("stroke-width",t)});const e=Ct==null?void 0:Ct.getLayer("phantoms");e&&e.querySelectorAll(".phantom-bit .bit-shape").forEach(s=>{s.setAttribute("stroke-width",t)})}function up(){const i=[];if(["panel","offsets","bits","phantoms","overlay"].forEach(e=>{const n=Ct.getLayer(e);if(n){const s=Array.from(n.children).filter(r=>r.style.display!=="none"&&window.getComputedStyle(r).display!=="none");i.push(...s)}}),i.length===0){Ct.fitToScale({minX:0,maxX:Ct.canvasParameters.width,minY:0,maxY:Ct.canvasParameters.height,padding:20});return}dp(i,100)}function dp(i=Ee,t=50){if(!i||i.length===0)return;const e=i.every(s=>typeof s=="number");let n;if(e){const s=Ga();let r=1/0,o=1/0,a=-1/0,l=-1/0;if(i.forEach(d=>{const f=jt[d];if(f){const g=s.x+f.x,x=s.y+f.y,m=(f.bitData.diameter||10)/2;let p=0;Hn&&f.bitData.shankDiameter&&f.bitData.totalLength&&f.bitData.length&&(p=f.bitData.totalLength-f.bitData.length),r=Math.min(r,g-m),o=Math.min(o,x-m-p),a=Math.max(a,g+m),l=Math.max(l,x+m)}}),r===1/0)return;const c=a-r,h=l-o,u={x:r+c/2,y:o+h/2};n={width:c,height:h,center:u}}else n=Cp(i);Pp(Ct,n,t)}function UM(){dp(Ee,50)}function Va(){return Ln==="top-left"?{x:0,y:0}:{x:0,y:Ae}}function fp(i,t){const e=i+t.y;return Ln==="bottom-left"?-e:e}function FM(i,t){return(Ln==="bottom-left"?-i:i)-t.y}function Ga(){const i=(Ct.canvasParameters.width-ke)/2,t=(Ct.canvasParameters.height-Ae)/2,e=Va();return{x:i+e.x,y:t+e.y}}function xr(i){const e=(i.bitData.diameter||0)/2;switch(i.alignment){case"left":return{x:-e,y:0};case"right":return{x:e,y:0};case"center":default:return{x:0,y:0}}}function pp(i,t,e){window.threeModule&&window.showPart&&(window.threeModule.showBasePanel(),vi.debug("CSG recalculation after table input"),Ei.schedule(!0));const s=document.getElementById("bits-sheet-body").querySelectorAll("tr");if(s[i]){const r=s[i].querySelectorAll("td"),o=xr(jt[i]);if(r[3]){const a=r[3].querySelector("input");a&&(a.value=t+o.x)}if(r[4]){const a=r[4].querySelector("input");a&&(a.value=fp(e,o))}}}function $e(){if(!ie)return cn;const i=(Ct.canvasParameters.width-ke)/2,t=(Ct.canvasParameters.height-Ae)/2,e=Vp(ke,Ae,i,t,jt);return cn.setAttribute("d",e),cn.setAttribute("transform",`translate(${i}, ${t})`),cn}function OM(){zn=!zn,window.bitsVisible=zn,qn.setBitsVisible(zn);const i=document.getElementById("bits-btn"),t=Ct.getLayer("phantoms");zn?(qi.style.display="block",t.style.display="block",i.classList.remove("bits-hidden"),i.classList.add("bits-visible"),i.title="Hide Bits",Hn||jt.forEach(e=>{var s;const n=(s=e.group)==null?void 0:s.querySelector(".shank-shape");n&&(n.style.display="none")})):(qi.style.display="none",t.style.display="none",i.classList.remove("bits-visible"),i.classList.add("bits-hidden"),i.title="Show Bits"),window.threeModule&&window.threeModule.toggleBitMeshesVisibility(zn)}function kM(){Hn=!Hn,qn.setShankVisible(Hn);const i=document.getElementById("shank-btn");jt.forEach(t=>{var n;const e=(n=t.group)==null?void 0:n.querySelector(".shank-shape");e&&(e.style.display=Hn?"block":"none")}),Hn?(i.classList.remove("shank-hidden"),i.classList.add("shank-visible"),i.title="Hide Shanks"):(i.classList.remove("shank-visible"),i.classList.add("shank-hidden"),i.title="Show Shanks")}async function zM(){if(!qi||!Gn||!cn){vi.error("SVG elements not initialized");return}ie=!ie,window.showPart=ie,qn.setShowPart(ie),vi.info("togglePartView: showPart changed",{showPart:ie});const i=document.getElementById("part-btn");ie?($e(),Gn.style.display="none",cn.style.display="block",qi.style.display=zn?"block":"none",i.classList.remove("part-hidden"),i.classList.add("part-visible"),i.title="Show Material"):(Gn.style.display="block",cn.style.display="none",qi.style.display=zn?"block":"none",i.classList.remove("part-visible"),i.classList.add("part-hidden"),i.title="Show Part"),window.threeModule&&(await Xn(),ie?Ei.schedule(!0):window.threeModule.showBasePanel())}function Zd(){MM(),Le.createBitGroups(),He(),dn(),ca.addEventListener("input",updatepanelParams),ha.addEventListener("input",updatepanelParams),ua.addEventListener("input",updatepanelParams),ca.addEventListener("blur",()=>{ca.value=de(ca.value),updatepanelParams()}),ha.addEventListener("blur",()=>{ha.value=de(ha.value),updatepanelParams()}),ua.addEventListener("blur",()=>{ua.value=de(ua.value),updatepanelParams()}),requestAnimationFrame(()=>{up(),Xn(),setTimeout(async()=>{const i=localStorage.getItem("bits_positions");if(i)try{const t=JSON.parse(i);if(t.length>0){const e=await mp(t);hn.getModule("ui").logOperation(`Auto-loaded ${e} saved bit positions`),He(),dn()}}catch(t){console.warn("Failed to load saved positions:",t),Ki("Failed to auto-load saved positions")}},100)})}async function VM(){if(jt.length===0){alert("No bits on canvas to export. Please add some bits first.");return}const i=ie;i||(ie=!0);const t=$e();console.log(t);try{const e=hn.getModule("export");if(!e)throw new Error("Export module not found");const n=e.exportToDXF(jt,t,no,Vi,Ae);i||(ie=!1),e.downloadDXF(n),console.log("DXF export completed. File downloaded."),Ki("DXF export completed successfully")}catch(e){console.error("Failed to export DXF:",e),Ki("Failed to export DXF: "+e.message),alert("Failed to export DXF. Please check console for details.")}}function Ki(i){const t=document.getElementById("operations-log"),e=new Date().toLocaleTimeString();t.textContent=`[${e}] ${i}`,t.classList.remove("fade-out"),setTimeout(()=>{t.classList.add("fade-out")},5e3)}function GM(){const i=jt.map(t=>({id:t.bitData.id,x:t.x,y:t.y,alignment:t.alignment,operation:t.operation,color:t.color}));localStorage.setItem("bits_positions",JSON.stringify(i)),Ki(`Saved ${i.length} bit positions`)}function HM(){const i=jt.map(s=>({id:s.bitData.id,x:s.x,y:s.y,alignment:s.alignment,operation:s.operation,color:s.color})),t=JSON.stringify(i,null,2),e=new Blob([t],{type:"application/json"}),n=document.createElement("a");n.href=URL.createObjectURL(e),n.download="bits_positions.json",document.body.appendChild(n),n.click(),document.body.removeChild(n),Ki(`Exported ${i.length} bit positions to JSON file`)}async function WM(){const i=document.createElement("input");i.type="file",i.accept=".json",i.onchange=async t=>{const e=t.target.files[0];if(e){const n=new FileReader;n.onload=async s=>{try{const r=JSON.parse(s.target.result),o=await mp(r);Ki(`Loaded ${o} bit positions from JSON file`),He()}catch{alert("Failed to parse JSON file. Please check the format."),Ki("Failed to load positions: invalid JSON format")}},n.readAsText(e)}},i.click()}async function mp(i){jt.forEach(n=>{n.group&&n.group.parentNode&&n.group.parentNode.removeChild(n.group)}),jt=[];const t=await xs();let e=0;return i.forEach((n,s)=>{let r=null,o=null;for(const[a,l]of Object.entries(t)){const c=l.find(h=>h.id===n.id);if(c){r=c,o=a;break}}if(r)try{const a=(Ct.canvasParameters.width-ke)/2,l=(Ct.canvasParameters.height-Ae)/2,c=a+ke/2,h=l+Ae/2,u=Le.createBitShapeElement(r,o,c,h),d=document.createElementNS(Se,"g");d.appendChild(u),qi.appendChild(d),io++;const f=hh(o);let g=n.operation||"AL";f.includes(g)||(g="AL");const x={number:io,name:r.name,x:n.x,y:n.y,alignment:n.alignment||"center",operation:g,color:n.color||r.fillColor||"#cccccc",group:d,baseAbsX:c,baseAbsY:h,bitData:r,groupName:o};jt.push(x),Le.assignProfilePathsToBits([x]),e++;const m=Ga(),p=m.x+n.x,y=m.y+n.y,_=p-c,v=y-h;d.setAttribute("transform",`translate(${_}, ${v})`)}catch(a){console.error(`Error restoring bit ${n.id}:`,a)}else console.warn(`Bit with ID ${n.id} not found in available bits`)}),un(),za(),He(),dn(),ie&&$e(),e}function XM(){const i=jt.length;jt.forEach(t=>{t.group&&t.group.parentNode&&t.group.parentNode.removeChild(t.group)}),jt=[],io=0,localStorage.removeItem("bits_positions"),un(),He(),dn(),ie&&$e(),Ki(`Cleared ${i} bits from canvas`)}window.addEventListener("resize",()=>{Ct&&(Ct.resize(),op(),ap(),He(),dn(),ie&&$e());const i=document.getElementById("left-panel"),t=document.getElementById("right-menu");window.innerWidth>768&&i&&(i.classList.remove("collapsed","overlay-visible"),i.style.display=""),window.innerWidth>1e3&&t&&(t.classList.remove("collapsed","overlay-visible"),t.style.display=""),Ct&&EM()});async function YM(){try{await hn.start();const i=hn.getModule("canvas"),t=hn.getModule("bits"),e=hn.getModule("three");vi.info("Modular system initialized successfully"),vi.debug("Canvas module:",i),vi.debug("Bits module:",t),vi.debug("Three module:",e),e&&(await e.init(),window.threeModule=e,Ei.configure(n=>e.applyCSGOperation(n))),Zd(),jd(),qM(e)}catch(i){vi.error("Failed to initialize modular system:",i),Zd(),jd()}}function qM(i){const t=document.getElementById("view-2d"),e=document.getElementById("view-3d"),n=document.getElementById("view-both"),s=document.getElementById("app");function r(a){[t,e,n].forEach(l=>{l.classList.remove("active")}),a.classList.add("active")}function o(a){s.classList.remove("view-2d","view-3d","view-both"),s.classList.add(`view-${a}`),i&&(a==="3d"||a==="both")&&Xn(),Ct&&setTimeout(()=>{Ct.resize(),op(),He(),ap()},100),i&&(a==="3d"||a==="both")&&setTimeout(()=>{i.onWindowResize()},100)}t.addEventListener("click",()=>{o("2d"),r(t)}),e.addEventListener("click",()=>{o("3d"),r(e)}),n.addEventListener("click",()=>{o("both"),r(n)}),s.classList.add("view-2d"),r(t)}async function Xn(){const i=window.threeModule;i&&await i.updatePanel(ke,Ra,Ae,jt,Ln)}function jd(){const i=document.getElementById("material-select");if(!i||!window.threeModule)return;const t=window.threeModule.materialRegistry||{};i.innerHTML="",Object.entries(t).forEach(([e,n])=>{if(n&&n.enabled!==!1){const s=document.createElement("option");s.value=e,s.textContent=e,i.appendChild(s)}}),i.value=window.threeModule.currentMaterialKey,i.addEventListener("change",e=>{const n=e.target.value;window.threeModule.setMaterialMode(n),window.showPart?Ei.schedule(!0):window.threeModule.showBasePanel()})}window.addEventListener("load",YM);
