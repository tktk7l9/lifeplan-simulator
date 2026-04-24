/* Three.js layered mountain parallax hero
   - Dawn palette (amber/peach/warm ink)
   - Mouse parallax, continuous cloud/fog drift, walking hiker, sun bloom
*/
(function(){
  const container = document.getElementById('hero3d');
  if (!container || !window.THREE) return;

  const THREE = window.THREE;
  const W = () => container.clientWidth;
  const H = () => container.clientHeight;

  // === Renderer ===
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';

  // === Scene & camera ===
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W()/H(), 0.1, 2000);
  camera.position.set(0, 4, 28);
  camera.lookAt(0, 2, 0);

  // === Sky (big background plane with shader gradient) ===
  const skyGeo = new THREE.PlaneGeometry(300, 180);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      uTop:    { value: new THREE.Color('#2a180c') },   // deep warm ink
      uMid:    { value: new THREE.Color('#d97706') },   // amber-600
      uLow:    { value: new THREE.Color('#fcd5a6') },   // peach
      uHorizon:{ value: new THREE.Color('#fde4b8') },
      uTime:   { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uTop, uMid, uLow, uHorizon;
      uniform float uTime;
      void main(){
        float y = vUv.y;
        vec3 col = mix(uMid, uTop, smoothstep(0.55, 1.0, y));
        col = mix(uLow, col, smoothstep(0.18, 0.55, y));
        col = mix(uHorizon, col, smoothstep(0.05, 0.22, y));
        // subtle noise banding
        col += (sin((vUv.x+uTime*0.02)*40.)*.003 + sin((vUv.y+uTime*0.01)*80.)*.002);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.position.set(0, 12, -70);
  scene.add(sky);

  // === Sun ===
  const sunGroup = new THREE.Group();
  // Halo (large soft additive sprite)
  const haloTex = makeRadialTexture('rgba(255,236,176,1)', 'rgba(255,180,100,0.0)', 512);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0.55 }));
  halo.scale.set(36, 36, 1);
  sunGroup.add(halo);
  // Core disc
  const coreTex = makeRadialTexture('rgba(255,245,200,1)', 'rgba(255,210,130,0)', 256);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: coreTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0.85 }));
  core.scale.set(8, 8, 1);
  sunGroup.add(core);
  // God rays (thin streaks)
  const raysTex = makeRaysTexture();
  const rays = new THREE.Sprite(new THREE.SpriteMaterial({ map: raysTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0.22 }));
  rays.scale.set(55, 55, 1);
  sunGroup.add(rays);

  sunGroup.position.set(14, 11, -55);
  scene.add(sunGroup);

  // === Mountain layers ===
  // Build ridgeline geometry as extruded triangular strip
  function makeRidge({ width, segments, zPos, color, heightFn, bottomY=-8, jitter=0.2, flatShading=true }){
    const pts = [];
    for (let i=0; i<=segments; i++){
      const t = i/segments;
      const x = (t - 0.5) * width;
      const y = heightFn(t) + (Math.sin(i*1.7)*jitter);
      pts.push({x, y});
    }
    const geom = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const baseColor = new THREE.Color(color);
    const shadowColor = baseColor.clone().multiplyScalar(0.55);
    for (let i=0; i<pts.length-1; i++){
      const a = pts[i], b = pts[i+1];
      // Quad: a(top), b(top), a(bottom), b(bottom)
      const ax=a.x, ay=a.y, bx=b.x, by=b.y;
      // two triangles
      positions.push(ax, ay, 0,  bx, by, 0,  ax, bottomY, 0);
      positions.push(bx, by, 0,  bx, bottomY, 0,  ax, bottomY, 0);
      // gradient vertex colors (top lighter, bottom darker)
      const top = baseColor, bot = shadowColor;
      colors.push(top.r, top.g, top.b,  top.r, top.g, top.b,  bot.r, bot.g, bot.b);
      colors.push(top.r, top.g, top.b,  bot.r, bot.g, bot.b,  bot.r, bot.g, bot.b);
    }
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
    geom.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.DoubleSide });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.z = zPos;
    return { mesh, pts };
  }

  // Far range — low, wide, hazy
  const far = makeRidge({
    width: 180, segments: 90, zPos: -40, color: '#a46a2a',
    heightFn: t => {
      return 4 + Math.sin(t*8 + 0.3)*2.2 + Math.sin(t*21)*0.7 + Math.cos(t*3)*1.5;
    },
    bottomY: -10, jitter: 0.35,
  });
  scene.add(far.mesh);

  // Mid range — warmer, higher
  const mid = makeRidge({
    width: 140, segments: 80, zPos: -25, color: '#7c4712',
    heightFn: t => {
      return 3 + Math.sin(t*6 - 1)*3.5 + Math.sin(t*14 + 2)*1.2 + Math.cos(t*2.2)*2;
    },
    bottomY: -10, jitter: 0.5,
  });
  scene.add(mid.mesh);

  // Near range — dark brown, more detailed
  const near = makeRidge({
    width: 120, segments: 100, zPos: -14, color: '#4a2610',
    heightFn: t => {
      // Bigger central peak (for summit)
      const centralPeak = 5.5 * Math.exp(-Math.pow((t-0.58)*4.2, 2));
      return 2.2 + Math.sin(t*4.8 + 1.2)*2.3 + Math.sin(t*11)*0.9 + centralPeak;
    },
    bottomY: -10, jitter: 0.3,
  });
  scene.add(near.mesh);

  // Foreground — very dark silhouette
  const fg = makeRidge({
    width: 100, segments: 70, zPos: -6, color: '#1e140c',
    heightFn: t => {
      return 1.5 + Math.sin(t*3.5 + 2)*1.8 + Math.sin(t*9)*0.6;
    },
    bottomY: -10, jitter: 0.25,
  });
  scene.add(fg.mesh);

  // Snow caps on near range peaks (find peaks)
  addSnowCaps(near, -14);

  // === Trail (dashed line climbing near range) ===
  const trailPts = [];
  const trailSeg = 60;
  for (let i=0; i<=trailSeg; i++){
    const t = i/trailSeg;
    // Path from bottom-left base up to summit (x from -18 to ~2.5, y rising)
    const x = THREE.MathUtils.lerp(-20, 2.5, Math.pow(t, 1.1));
    // y follows the near ridge roughly
    const ridgeT = 0.12 + t * 0.46;
    const ridgeY = 2.2 + Math.sin(ridgeT*4.8 + 1.2)*2.3 + Math.sin(ridgeT*11)*0.9 + 5.5 * Math.exp(-Math.pow((ridgeT-0.58)*4.2, 2));
    const y = THREE.MathUtils.lerp(-6.5, ridgeY - 0.2, Math.pow(t, 1.3));
    trailPts.push(new THREE.Vector3(x, y, -13.5));
  }
  const trailCurve = new THREE.CatmullRomCurve3(trailPts);
  const trailDashGeom = new THREE.BufferGeometry().setFromPoints(trailCurve.getPoints(200));
  const trailDashMat = new THREE.LineDashedMaterial({ color:'#fde8c3', dashSize:0.25, gapSize:0.55, linewidth:1, transparent:true, opacity:0.9 });
  const trailLine = new THREE.Line(trailDashGeom, trailDashMat);
  trailLine.computeLineDistances();
  scene.add(trailLine);

  // Summit flag
  const summitPoint = trailPts[trailPts.length-1].clone();
  const flagGroup = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6),
    new THREE.MeshBasicMaterial({ color: 0x1c1410 })
  );
  pole.position.y = 0.7;
  flagGroup.add(pole);
  const flagGeo = new THREE.PlaneGeometry(0.8, 0.5, 10, 1);
  const flagMat = new THREE.MeshBasicMaterial({ color: 0xd97706, side:THREE.DoubleSide });
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(0.4, 1.15, 0);
  flagGroup.add(flag);
  flagGroup.position.copy(summitPoint);
  scene.add(flagGroup);

  // === Hiker ===
  const hikerGroup = new THREE.Group();
  // body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.25), new THREE.MeshBasicMaterial({ color: 0x1c1410 }));
  body.position.y = 0.35;
  hikerGroup.add(body);
  // head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), new THREE.MeshBasicMaterial({ color: 0x2a1810 }));
  head.position.y = 0.82;
  hikerGroup.add(head);
  // pack
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.2), new THREE.MeshBasicMaterial({ color: 0x92400e }));
  pack.position.set(0, 0.4, -0.2);
  hikerGroup.add(pack);
  // stick
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0x1c1410 }));
  stick.rotation.z = 0.3;
  stick.position.set(0.25, 0.45, 0.15);
  hikerGroup.add(stick);

  scene.add(hikerGroup);

  // === Clouds (sprites drifting) ===
  const cloudTex = makeCloudTexture();
  const clouds = [];
  for (let i=0; i<14; i++){
    const mat = new THREE.SpriteMaterial({ map: cloudTex, transparent:true, depthWrite:false, opacity: 0.5 + Math.random()*0.4 });
    const s = new THREE.Sprite(mat);
    const scale = 10 + Math.random()*18;
    s.scale.set(scale, scale*0.38, 1);
    const z = -60 + Math.random()*46; // distributed across depth
    s.position.set((Math.random()-0.5)*100, 4 + Math.random()*8 + (z<-30?3:0), z);
    s.userData.speed = (0.02 + Math.random()*0.05) * (z < -30 ? 0.4 : 1);
    s.userData.baseY = s.position.y;
    s.userData.phase = Math.random()*Math.PI*2;
    clouds.push(s);
    scene.add(s);
  }

  // === Fog plane near camera (soft haze in front of mid) ===
  const fogTex = makeFogTexture();
  const fogMat = new THREE.SpriteMaterial({ map: fogTex, transparent:true, depthWrite:false, opacity:0.45 });
  const fog1 = new THREE.Sprite(fogMat);
  fog1.scale.set(100, 18, 1);
  fog1.position.set(0, 0, -18);
  scene.add(fog1);

  const fog2 = new THREE.Sprite(fogMat.clone());
  fog2.material.opacity = 0.3;
  fog2.scale.set(100, 12, 1);
  fog2.position.set(0, -1.5, -10);
  scene.add(fog2);

  // === Light rays (additive sprites) ===
  const rayTex = makeLightBeamTexture();
  const beam = new THREE.Sprite(new THREE.SpriteMaterial({ map: rayTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity: 0.14 }));
  beam.scale.set(50, 50, 1);
  beam.position.set(14, 11, -50);
  scene.add(beam);

  // === Mouse parallax ===
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('mousemove', e => {
    const rect = container.getBoundingClientRect();
    mouse.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouse.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });
  window.addEventListener('touchmove', e => {
    if (!e.touches.length) return;
    const rect = container.getBoundingClientRect();
    mouse.tx = ((e.touches[0].clientX - rect.left) / rect.width - 0.5) * 2;
    mouse.ty = ((e.touches[0].clientY - rect.top) / rect.height - 0.5) * 2;
  }, { passive:true });

  // === Animation loop ===
  const clock = new THREE.Clock();
  let hikerT = 0;
  function animate(){
    const dt = clock.getDelta();
    const t = clock.getElapsedTime();

    // ease mouse
    mouse.x += (mouse.tx - mouse.x) * 0.045;
    mouse.y += (mouse.ty - mouse.y) * 0.045;

    // Camera parallax
    camera.position.x = mouse.x * 1.4;
    camera.position.y = 4 - mouse.y * 0.6;
    camera.lookAt(0, 2 + mouse.y * 0.15, 0);

    // Layer parallax (near moves more than far)
    fg.mesh.position.x = mouse.x * 0.5;
    near.mesh.position.x = mouse.x * 0.3;
    mid.mesh.position.x = mouse.x * 0.18;
    far.mesh.position.x = mouse.x * 0.08;

    // Trail + flag + hiker share near layer
    trailLine.position.x = near.mesh.position.x;
    flagGroup.position.x = summitPoint.x + near.mesh.position.x;

    // Clouds drift
    clouds.forEach(s => {
      s.position.x += s.userData.speed;
      if (s.position.x > 55) s.position.x = -55;
      s.position.y = s.userData.baseY + Math.sin(t*0.3 + s.userData.phase) * 0.25;
    });

    // Fog slow sway
    fog1.position.x = Math.sin(t * 0.1) * 4;
    fog2.position.x = Math.cos(t * 0.07) * 6;

    // Sun breathe
    const breathe = 1 + Math.sin(t * 0.6) * 0.03;
    sunGroup.scale.set(breathe, breathe, 1);
    rays.material.rotation = t * 0.05;
    beam.material.rotation = -t * 0.03;

    // Sky shader time
    skyMat.uniforms.uTime.value = t;

    // Hiker walk
    hikerT += dt * 0.04;
    if (hikerT > 0.98) hikerT = 0;
    const pos = trailCurve.getPoint(hikerT);
    const next = trailCurve.getPoint(Math.min(hikerT + 0.01, 1));
    hikerGroup.position.copy(pos);
    hikerGroup.position.x += near.mesh.position.x;
    hikerGroup.position.y += 0.15 + Math.sin(t*6) * 0.04; // bob
    // face direction
    const dir = Math.atan2(next.x - pos.x, 0.1);
    hikerGroup.rotation.y = dir * 0.25;
    // scale with perspective (climbing upward = slightly bigger? keep constant-ish)
    const sc = THREE.MathUtils.lerp(0.9, 0.55, hikerT);
    hikerGroup.scale.set(sc, sc, sc);

    // Flag wave (simple vertex displacement)
    const pos2 = flag.geometry.attributes.position;
    for (let i=0; i<pos2.count; i++){
      const x = pos2.getX(i);
      if (x > -0.39){ // not the pole-attached edge
        const wave = Math.sin(t*6 + x*3) * 0.08 * (x + 0.4);
        pos2.setZ(i, wave);
      }
    }
    pos2.needsUpdate = true;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  // Resize
  window.addEventListener('resize', () => {
    renderer.setSize(W(), H());
    camera.aspect = W()/H();
    camera.updateProjectionMatrix();
  });

  // === Texture helpers ===
  function makeRadialTexture(innerColor, outerColor, size){
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    g.addColorStop(0, innerColor);
    g.addColorStop(1, outerColor);
    ctx.fillStyle = g;
    ctx.fillRect(0,0,size,size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  function makeRaysTexture(){
    const size = 512;
    const c = document.createElement('canvas'); c.width=c.height=size;
    const ctx = c.getContext('2d');
    ctx.translate(size/2, size/2);
    for (let i=0; i<24; i++){
      ctx.rotate((Math.PI*2)/24);
      const w = 3 + Math.random()*4;
      const len = size*0.48;
      const grad = ctx.createLinearGradient(0,0, len, 0);
      grad.addColorStop(0, 'rgba(255,235,180,0.9)');
      grad.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -w/2);
      ctx.lineTo(len, 0);
      ctx.lineTo(0, w/2);
      ctx.closePath();
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  function makeLightBeamTexture(){
    const size = 512;
    const c = document.createElement('canvas'); c.width=c.height=size;
    const ctx = c.getContext('2d');
    ctx.translate(size/2, size/2);
    for (let i=0; i<8; i++){
      ctx.save();
      ctx.rotate(Math.PI*2/8 * i + Math.random()*0.2);
      const w = 6 + Math.random()*14;
      const len = size*0.46;
      const grad = ctx.createLinearGradient(0,0, len, 0);
      grad.addColorStop(0, 'rgba(255,230,170,0.6)');
      grad.addColorStop(1, 'rgba(255,180,100,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -w/2);
      ctx.lineTo(len, 0);
      ctx.lineTo(0, w/2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  function makeCloudTexture(){
    const size = 256;
    const c = document.createElement('canvas'); c.width=size; c.height=size*0.5;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0,0,c.width,c.height);
    // Draw several soft ellipses to form a cloud puff
    const cx = size/2, cy = size*0.25;
    for (let i=0; i<6; i++){
      const x = cx + (Math.random()-0.5) * size*0.7;
      const y = cy + (Math.random()-0.5) * size*0.15;
      const r = 18 + Math.random()*26;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,248,235,0.95)');
      g.addColorStop(0.6, 'rgba(255,240,220,0.5)');
      g.addColorStop(1, 'rgba(255,240,220,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, y, r, r*0.7, 0, 0, Math.PI*2); ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  function makeFogTexture(){
    const size = 512;
    const c = document.createElement('canvas'); c.width=size; c.height=size*0.3;
    const ctx = c.getContext('2d');
    for (let i=0; i<30; i++){
      const x = Math.random()*size;
      const y = Math.random()*c.height;
      const r = 20 + Math.random()*60;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(250,225,190,0.5)');
      g.addColorStop(1, 'rgba(250,225,190,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function addSnowCaps(ridge, zPos){
    const pts = ridge.pts;
    for (let i=2; i<pts.length-2; i++){
      if (pts[i].y > pts[i-1].y && pts[i].y > pts[i+1].y && pts[i].y > 5){
        const g = new THREE.Mesh(
          new THREE.ConeGeometry(0.7, 0.9, 4),
          new THREE.MeshBasicMaterial({ color: 0xfdf8ef })
        );
        g.rotation.y = Math.PI/4;
        g.position.set(pts[i].x, pts[i].y + 0.05, zPos + 0.05);
        g.scale.set(1, 0.4, 1);
        scene.add(g);
      }
    }
  }
})();
