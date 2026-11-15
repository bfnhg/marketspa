import { useEffect, useRef } from "react";
import roomImg from "@/assets/pink-water-room.jpg";

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
// Image-based scene: the painted room is sampled, and everything below the
// waterline is displaced by animated waves + mouse ripples (unseen.co style).
const FRAG = `precision highp float;
uniform vec2 r;uniform vec2 ir;uniform float t;uniform vec2 m;uniform float calm;uniform float move;uniform sampler2D img;uniform vec2 par;uniform vec3 view;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
void main(){
 vec2 frag=gl_FragCoord.xy;vec2 uv=vec2(frag.x/r.x,1.-frag.y/r.y);
 float sa=r.x/r.y,ia=ir.x/ir.y;vec2 sc=sa>ia?vec2(1.,ia/sa):vec2(sa/ia,1.);
 vec2 tuv=(uv-.5)*sc*.94/view.z+.5+view.xy+par*.03;
 float wl=.6;float depth=smoothstep(wl,1.,tuv.y);
 float tt=t*(1.-calm*.85);
 vec2 mu=vec2(m.x/r.x,m.y/r.y);vec2 dd=(uv-mu)*vec2(sa,1.);float md=length(dd);
 float rip=sin(md*58.-t*8.)*exp(-md*6.)*(.2+move*.9)*(1.-calm)*step(wl-.05,tuv.y);
 vec2 off=vec2(0.);
 if(tuv.y>wl){
  float k=depth;
  off.x=(sin(tuv.y*140./(.3+depth)+tt*1.8)*.004+ (n(vec2(tuv.x*8.,tuv.y*60.-tt))-.5)*.008)*k;
  off.y=sin(tuv.x*30.+tt*1.3)*.002*k;
 }
 off+=normalize(dd+1e-5)*rip*(.012+move*.012);
 float ca=.0015+length(uv-.5)*.004+move*.004;
 vec3 col=vec3(texture2D(img,tuv+off+vec2(ca,0)).r,texture2D(img,tuv+off).g,texture2D(img,tuv+off-vec2(ca,0)).b);
 col+=vec3(1.,.95,1.)*max(rip,0.)*(.05+move*.07);
 col*=1.-pow(length(uv-.5)*1.1,2.5)*.35;
 gl_FragColor=vec4(col,1.);}`;

/** Cadrage de la caméra dans l'image (x, y = décalage ; zoom). Animable avec GSAP. */
export const waterView = { x: 0, y: 0, zoom: 1 };

export type WaterHandle = { setCalm: (v: boolean) => void };

export function WaterScene({
  onReady,
  handle,
}: {
  onReady: () => void;
  handle: React.MutableRefObject<WaterHandle | null>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const gl = c.getContext("webgl")!;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr);
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (k: string) => gl.getUniformLocation(pr, k);
    const st = {
      mx: 0,
      my: 0,
      tmx: 0,
      tmy: 0,
      calm: 0,
      tcalm: 0,
      move: 0,
      tmove: 0,
      time: 0,
      iw: 1,
      ih: 1,
    };
    handle.current = { setCalm: (v) => (st.tcalm = v ? 1 : 0) };
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    const resize = () => {
      c.width = innerWidth * dpr;
      c.height = innerHeight * dpr;
      gl.viewport(0, 0, c.width, c.height);
    };
    resize();
    addEventListener("resize", resize);
    const mm = (e: PointerEvent) => {
      const x = e.clientX * dpr,
        y = e.clientY * dpr;
      const distance = Math.hypot(x - st.tmx, y - st.tmy);
      st.tmove = Math.min(
        1,
        st.tmove + (distance / (Math.min(innerWidth, innerHeight) * dpr)) * 2.5,
      );
      st.tmx = x;
      st.tmy = y;
    };
    addEventListener("pointermove", mm);
    st.tmx = st.mx = c.width / 2;
    st.tmy = st.my = c.height * 0.8;
    let raf = 0,
      last = performance.now(),
      first = true;
    const tex = gl.createTexture();
    const im = new Image();
    im.onload = () => {
      st.iw = im.width;
      st.ih = im.height;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
      for (const [k, v] of [
        [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
        [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
        [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
        [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
      ] as const)
        gl.texParameteri(gl.TEXTURE_2D, k, v);
      raf = requestAnimationFrame(loop);
    };
    im.src = roomImg;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      st.mx += (st.tmx - st.mx) * 0.08;
      st.my += (st.tmy - st.my) * 0.08;
      st.calm += (st.tcalm - st.calm) * 0.04;
      st.tmove *= Math.exp(-1.8 * dt);
      st.move += (st.tmove - st.move) * 0.12;
      st.time += dt;
      gl.uniform2f(U("r"), c.width, c.height);
      gl.uniform2f(U("ir"), st.iw, st.ih);
      gl.uniform1f(U("t"), st.time);
      gl.uniform2f(U("m"), st.mx, st.my);
      gl.uniform1f(U("calm"), st.calm);
      gl.uniform1f(U("move"), st.move);
      gl.uniform2f(U("par"), st.mx / c.width - 0.5, st.my / c.height - 0.5);
      gl.uniform3f(U("view"), waterView.x, waterView.y, waterView.zoom);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (first) {
        first = false;
        onReady();
      }
      raf = requestAnimationFrame(loop);
    };
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", mm);
    };
  }, []);
  return <canvas ref={ref} className="fixed inset-0 h-full w-full" />;
}
