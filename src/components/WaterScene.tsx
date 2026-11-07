import { useEffect, useRef } from "react";

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `precision highp float;
uniform vec2 r;uniform float t;uniform vec2 m;uniform float calm;uniform float spd;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
float wave(vec2 p,float tt){return fbm(p+vec2(tt*.08,tt*.05))*.6+fbm(p*1.7-vec2(tt*.06,-tt*.04))*.4;}
void main(){
 vec2 uv=gl_FragCoord.xy/r;vec2 q=(gl_FragCoord.xy-.5*r)/r.y;
 // perspective water plane
 float hor=.18;float y=q.y+.5;float d=1./max(.04,(hor+.5)-y*.95);
 vec2 w=vec2(q.x*d*1.4,d*2.+t*(.25+spd));
 vec2 mq=(m-.5*r)/r.y;float md=length(q-mq);
 float rip=sin(md*60.-t*6.)*exp(-md*7.)*.12*(1.-calm);
 float tt=t*(1.-calm*.8);
 float e=.02;float hh=wave(w,tt)+rip;
 vec3 nn=normalize(vec3(wave(w+vec2(e,0),tt)-hh+rip*.3,.06,wave(w+vec2(0,e),tt)-hh));
 vec3 sky=mix(vec3(.01,.03,.06),vec3(.05,.14,.2),smoothstep(-.5,.6,q.y));
 vec3 deep=vec3(.0,.03,.05);
 vec3 L=normalize(vec3(.0,.35,-1.));
 float spec=pow(max(dot(reflect(-L,nn),vec3(0,1,0)),0.),40.);
 float fres=pow(1.-max(nn.y,0.),3.);
 float caus=pow(abs(sin(hh*18.+tt)),12.)*.25;
 vec3 col=mix(deep,vec3(.08,.32,.38),fres*1.6+caus);
 col+=vec3(.95,.9,.8)*spec*(1.2/d+.3);
 col+=vec3(.5,.9,1.)*exp(-md*9.)*.15;
 float fog=smoothstep(.0,.8,1./d);col=mix(sky,col,fog);
 col*=1.-length(uv-.5)*(.9+spd*1.5);
 col+=(h(gl_FragCoord.xy+t)-.5)*.03;
 gl_FragColor=vec4(col,1.);}`;

export type WaterHandle = { setCalm: (v: boolean) => void };

export function WaterScene({ onReady, handle }: { onReady: () => void; handle: React.MutableRefObject<WaterHandle | null> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const gl = c.getContext("webgl")!;
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr); gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (k: string) => gl.getUniformLocation(pr, k);
    const st = { mx: 0, my: 0, tmx: 0, tmy: 0, calm: 0, tcalm: 0, spd: 0, tspd: 0, time: 0 };
    handle.current = { setCalm: (v) => (st.tcalm = v ? 1 : 0) };
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    const resize = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; gl.viewport(0, 0, c.width, c.height); };
    resize(); addEventListener("resize", resize);
    const mm = (e: PointerEvent) => { st.tmx = e.clientX * dpr; st.tmy = (innerHeight - e.clientY) * dpr; };
    const wh = (e: WheelEvent) => { st.tspd = Math.min(1, st.tspd + Math.abs(e.deltaY) * 0.002); };
    let ty = 0;
    const ts = (e: TouchEvent) => (ty = e.touches[0]?.clientY ?? ty);
    const tm = (e: TouchEvent) => { const y = e.touches[0]?.clientY ?? ty; st.tspd = Math.min(1, st.tspd + Math.abs(y - ty) * 0.02); ty = y; };
    addEventListener("pointermove", mm); addEventListener("wheel", wh, { passive: true });
    addEventListener("touchstart", ts, { passive: true }); addEventListener("touchmove", tm, { passive: true });
    st.tmx = st.mx = c.width / 2; st.tmy = st.my = c.height * 0.3;
    let raf = 0, last = performance.now(), first = true;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      st.mx += (st.tmx - st.mx) * 0.08; st.my += (st.tmy - st.my) * 0.08;
      st.calm += (st.tcalm - st.calm) * 0.04; st.tspd *= Math.exp(-2 * dt); st.spd += (st.tspd - st.spd) * 0.1;
      st.time += dt * (1 + st.spd * 3);
      gl.uniform2f(U("r"), c.width, c.height); gl.uniform1f(U("t"), st.time);
      gl.uniform2f(U("m"), st.mx, st.my); gl.uniform1f(U("calm"), st.calm); gl.uniform1f(U("spd"), st.spd);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (first) { first = false; onReady(); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); removeEventListener("pointermove", mm); removeEventListener("wheel", wh); removeEventListener("touchstart", ts); removeEventListener("touchmove", tm); };
  }, []);
  return <canvas ref={ref} className="fixed inset-0 h-full w-full" />;
}
