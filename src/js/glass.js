/* maksō — hero com vidro líquido em WebGL.
 * O fundo (luz em tons de couro/vinho) e a cápsula de vidro são desenhados
 * no mesmo shader. Como o fundo é nosso, a refração funciona igual em
 * iPhone, Android e desktop. Sem WebGL, o CSS (vidro fosco) assume. */
// @ts-check
var MaksoGlass = (function () {
  'use strict';

  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';

  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 u_res;',     // tamanho do buffer (px de dispositivo)
    'uniform float u_scale;',  // px de dispositivo por px CSS
    'uniform float u_time;',   // segundos
    'uniform vec4 u_rect;',    // caixa da logo em px CSS, relativa ao hero (x, y, w, h)
    'uniform float u_intro;',  // 0→1 (já com easing)

    'vec3 blob(vec2 p, vec2 c, float r, vec3 col){ vec2 d=(p-c)/r; return col*exp(-dot(d,d)); }',

    'vec3 bg(vec2 p){',
    '  vec2 S=u_res/u_scale; float m=sqrt(S.x*S.y); float t=u_time;',      // raio pela área: não estoura no celular em pé
    '  vec3 col=vec3(0.0196,0.0078,0.0118);',                                   // #050203
    '  col+=blob(p,S*vec2(0.28+0.10*sin(t*0.251),0.38+0.07*cos(t*0.209)),0.42*m,vec3(0.353,0.059,0.102)*0.80);', // vinho #5a0f1a
    '  col+=blob(p,S*vec2(0.70+0.09*cos(t*0.229),0.78+0.06*sin(t*0.271)),0.46*m,vec3(0.227,0.024,0.063)*0.85);', // bordô #3a0610
    '  col+=blob(p,S*vec2(0.80+0.07*sin(t*0.307),0.52+0.08*cos(t*0.233)),0.30*m,vec3(0.478,0.243,0.102)*0.55);', // conhaque #7a3e1a
    '  col+=blob(p,S*vec2(0.58+0.12*cos(t*0.217),0.34+0.05*sin(t*0.289)),0.16*m,vec3(0.788,0.635,0.478)*0.22);', // champanhe
    '  col=1.0-exp(-col*1.25);',                                                 // exposição suave: nunca satura
    '  float v=length((p/S-0.5)*vec2(1.0,1.25));',
    '  return col*(1.0-0.45*smoothstep(0.30,0.95,v));',                         // vinheta: preto mais profundo nas bordas
    '}',

    'float sdBox(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }',
    'float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }',

    'void main(){',
    '  vec2 p=vec2(gl_FragCoord.x, u_res.y-gl_FragCoord.y)/u_scale;',        // px CSS, origem no topo-esquerda
    '  float k=u_intro;',
    '  float lh=u_rect.w;',                                                  // altura da logo
    '  vec2 c=u_rect.xy+0.5*u_rect.zw;',
    '  vec2 hs=vec2(0.5*u_rect.z+0.22*lh, 0.5*lh+0.35*lh)*mix(0.96,1.0,k);', // folga 0.22h / 0.35h
    '  float H=2.0*hs.y; float rad=hs.y;',
    '  vec2 q=p-c;',
    '  float d=sdBox(q,hs,rad);',
    '  vec3 base=bg(p);',
    // sombra suave abaixo da cápsula (fora dela)
    '  float ds=sdBox(q-vec2(0.0,0.08*H),hs,rad);',
    '  base*=1.0-0.18*k*(1.0-smoothstep(0.0,0.25*H,ds));',
    '  float inside=(1.0-smoothstep(-1.0,1.0,d))*k;',
    '  vec3 col=base;',
    '  if(inside>0.0){',
    '    float bezel=0.22*H;',
    '    float edge=1.0-smoothstep(0.0,bezel,-d);',
    '    vec2 n=normalize(vec2(sdBox(q+vec2(1.0,0.0),hs,rad)-sdBox(q-vec2(1.0,0.0),hs,rad), sdBox(q+vec2(0.0,1.0),hs,rad)-sdBox(q-vec2(0.0,1.0),hs,rad))+1e-5);',
    '    vec2 pr=p-n*edge*edge*0.35*H;',
    '    pr=c+(pr-c)*0.94;',
    '    vec3 g=(bg(pr)+bg(pr+vec2(4.0,0.0))+bg(pr-vec2(4.0,0.0))+bg(pr+vec2(0.0,4.0))+bg(pr-vec2(0.0,4.0)))*0.2;',
    '    vec2 disp=n*edge*edge*3.0;',                                          // leve dispersão de cor na borda
    '    g.r=mix(g.r,bg(pr+disp).r,0.6); g.b=mix(g.b,bg(pr-disp).b,0.6);',
    '    g=g*1.06+0.012;',
    '    g+=vec3(0.10)*pow(edge,3.0);',                                         // brilho de borda (fresnel)
    '    g+=vec3(0.055)*(1.0-smoothstep(-hs.y,0.35*hs.y,q.y))*(1.0-0.6*edge);', // reflexo suave no topo
    '    float ring=1.0-smoothstep(0.0,2.0,-d);',
    '    vec2 L=normalize(vec2(-0.6,-0.8));',                                  // luz de cima-esquerda (y para baixo)
    '    float rim=(pow(max(dot(n,L),0.0),3.0)*0.85 + pow(max(dot(n,-L),0.0),3.0)*0.30 + 0.10)*ring;',
    '    col=mix(base, g+vec3(rim), inside);',
    '  }',
    '  col+=(hash(gl_FragCoord.xy)-0.5)/255.0;',                              // dither anti-faixas
    '  gl_FragColor=vec4(col,1.0);',
    '}',
  ].join('\n');

  /** @param {number} x */
  function easeOutQuint(x) { return 1 - Math.pow(1 - x, 5); }

  /**
   * Caixa de layout (sem transform, sem rolagem) do alvo relativa ao hero.
   * @param {HTMLElement} target @param {HTMLElement} hero
   */
  function layoutBox(target, hero) {
    var x = 0;
    var y = 0;
    /** @type {Element|null} */
    var el = target;
    while (el && el !== hero && el instanceof HTMLElement) {
      x += el.offsetLeft;
      y += el.offsetTop;
      el = el.offsetParent;
    }
    if (el !== hero) {
      // offsetParent não passou pelo hero: usa a diferença de retângulos (raro).
      var a = target.getBoundingClientRect();
      var b = hero.getBoundingClientRect();
      x = a.left - b.left;
      y = a.top - b.top;
    }
    return { x: x, y: y, w: target.offsetWidth, h: target.offsetHeight };
  }

  /** @param {WebGLRenderingContext} gl @param {number} type @param {string} src */
  function compile(gl, type, src) {
    var s = /** @type {WebGLShader} */ (gl.createShader(type));
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
      throw new Error('shader: ' + gl.getShaderInfoLog(s));
    }
    return s;
  }

  /** @param {WebGLRenderingContext} gl */
  function createProgram(gl) {
    var prog = /** @type {WebGLProgram} */ (gl.createProgram());
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost()) {
      throw new Error('link: ' + gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return {
      res: gl.getUniformLocation(prog, 'u_res'),
      scale: gl.getUniformLocation(prog, 'u_scale'),
      time: gl.getUniformLocation(prog, 'u_time'),
      rect: gl.getUniformLocation(prog, 'u_rect'),
      intro: gl.getUniformLocation(prog, 'u_intro'),
    };
  }

  /**
   * @param {{hero: HTMLElement, canvas: HTMLCanvasElement, target: HTMLElement, reducedMotion: boolean, intro: boolean}} o
   * @returns {{destroy(): void}}
   */
  function mount(o) {
    var hero = o.hero;
    var canvas = o.canvas;
    var target = o.target;
    var noop = { destroy: function () {} };
    if (!hero || !canvas || !target) return noop;

    hero.dataset.motion = o.reducedMotion ? 'static' : 'live';

    /** @type {WebGLRenderingContext|null} */
    var gl = null;
    try {
      gl = /** @type {WebGLRenderingContext|null} */ (canvas.getContext('webgl', {
        alpha: false, antialias: false, depth: false, stencil: false,
        premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power',
      }));
    } catch (e) { gl = null; }
    if (!gl) { hero.dataset.glass = 'css'; return noop; }
    var ctx = gl;

    /** @type {ReturnType<typeof createProgram>|null} */
    var u = null;
    var lost = false;
    var scale = 1;
    var rect = { x: 0, y: 0, w: 0, h: 0 };
    var t0 = performance.now();
    var introStart = t0;
    var introOn = o.intro && !o.reducedMotion;
    var staticMode = o.reducedMotion;
    var visible = true;
    var raf = 0;
    var lastDraw = -Infinity;
    var samples = 0;
    var sampleSum = 0;
    var lastTick = 0;

    function init() {
      try {
        u = createProgram(ctx);
        return true;
      } catch (e) {
        u = null;
        hero.dataset.glass = 'css';
        return false;
      }
    }

    function measure() {
      var w = hero.clientWidth;
      var h = hero.clientHeight;
      scale = Math.min(window.devicePixelRatio || 1, 1.5);
      var bw = Math.round(w * scale);
      var bh = Math.round(h * scale);
      if (Math.abs(canvas.width - bw) >= 1 || Math.abs(canvas.height - bh) >= 1) {
        canvas.width = bw;
        canvas.height = bh;
      }
      rect = layoutBox(target, hero);
      /** @type {any} */ (canvas).__maksoRect = rect;
    }

    /** @param {number} now */
    function draw(now) {
      if (!u || lost) return;
      var k = 1;
      if (introOn) {
        var x = Math.min(1, (now - introStart) / 600);
        k = easeOutQuint(x);
        if (x >= 1) introOn = false;
      }
      ctx.viewport(0, 0, canvas.width, canvas.height);
      ctx.uniform2f(u.res, canvas.width, canvas.height);
      ctx.uniform1f(u.scale, scale);
      ctx.uniform1f(u.time, o.reducedMotion ? 0 : (now - t0) / 1000);
      ctx.uniform4f(u.rect, rect.x, rect.y, rect.w, rect.h);
      ctx.uniform1f(u.intro, k);
      ctx.drawArrays(ctx.TRIANGLES, 0, 3);
      if (hero.dataset.glass !== 'webgl') hero.dataset.glass = 'webgl';
    }

    function shouldRun() {
      return !lost && !!u && visible && !document.hidden && (!staticMode || introOn);
    }

    /** @param {number} now */
    function tick(now) {
      raf = 0;
      if (!shouldRun()) return;
      // Mede o ritmo dos primeiros 60 quadros: aparelho sofrendo → quadro parado.
      if (!staticMode && samples < 60) {
        if (lastTick) { sampleSum += now - lastTick; samples++; }
        if (samples === 60 && sampleSum / samples > 24) {
          staticMode = true;
          hero.dataset.motion = 'static';
        }
      }
      lastTick = now;
      if (now - lastDraw >= 32) { // ~30 fps: o movimento é lento, 60 fps só gastaria bateria
        lastDraw = now;
        draw(now);
      }
      schedule();
    }

    function schedule() {
      if (!raf && shouldRun()) raf = requestAnimationFrame(tick);
    }

    function redraw() {
      measure();
      draw(performance.now());
      schedule();
    }

    if (!init()) return noop;
    measure();
    draw(performance.now());
    schedule();

    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(function () { redraw(); }) : null;
    if (ro) { ro.observe(hero); ro.observe(target); }
    var io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(function (entries) {
      visible = entries[entries.length - 1].isIntersecting;
      lastTick = 0;
      schedule();
    }) : null;
    if (io) io.observe(hero);

    function onVisibility() { lastTick = 0; if (!document.hidden) redraw(); }
    function onResize() { redraw(); }
    /** @param {Event} e */
    function onLost(e) {
      e.preventDefault();
      lost = true;
      u = null;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      hero.dataset.glass = 'css';
    }
    function onRestored() {
      lost = false;
      if (init()) redraw();
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    return {
      destroy: function () {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (ro) ro.disconnect();
        if (io) io.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('resize', onResize);
        canvas.removeEventListener('webglcontextlost', onLost);
        canvas.removeEventListener('webglcontextrestored', onRestored);
      },
    };
  }

  return { mount: mount, layoutBox: layoutBox };
})();
