/* ================= Journey to the Nikah — script ================= */
if (!window.gsap || !window.ScrollTrigger || !window.THREE) {
  document.body.classList.add("libraries-failed");
  throw new Error("Journey libraries did not load. Check your internet connection and reload.");
}
gsap.registerPlugin(ScrollTrigger);

/* ---------------- Lenis smooth scroll ---------------- */
const LenisCtor = window.Lenis || (window.lenis && window.lenis.default);
let lenis = null;
if (LenisCtor) {
  lenis = new LenisCtor({
    duration: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on("scroll", ScrollTrigger.update);
  const rafLoop = (time) => { lenis.raf(time); requestAnimationFrame(rafLoop); };
  requestAnimationFrame(rafLoop);
  gsap.ticker.lagSmoothing(0);
}

/* ---------------- Three.js mosque world ---------------- */
(function mosqueWorld() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas || !window.THREE) return;

  const PATH = 260;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe7efed);
  scene.fog = new THREE.FogExp2(0xe7efed, 0.011);

  const camera = new THREE.PerspectiveCamera(isMobile ? 68 : 55, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 1.4, 10);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.3 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0xe7efed, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  scene.add(new THREE.HemisphereLight(0xfff9e8, 0x81918c, 1.45));
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xfff2d5, 1.0);
  key.position.set(6, 14, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xd6c29a, 0.35);
  rim.position.set(-6, 8, -4); scene.add(rim);

  /* marble texture */
  const marbleTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 512;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 512, 512);
    g.addColorStop(0, "#fffdf7"); g.addColorStop(1, "#ece3cf");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "rgba(184,153,104,0.18)"; ctx.lineWidth = 0.6;
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      const x = Math.random() * 512; ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + Math.random()*120-60, 170, x + Math.random()*120-60, 340, x + Math.random()*120-60, 512);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  const marbleMat = new THREE.MeshLambertMaterial({ map: marbleTex, color: 0xfaf5ea });
  const marbleColMat = new THREE.MeshLambertMaterial({ map: marbleTex, color: 0xfffaf0 });

  /* floor + sheen */
  const floorTex = marbleTex.clone(); floorTex.needsUpdate = true; floorTex.repeat.set(18, 18);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshLambertMaterial({ map: floorTex, color: 0xfff8ec }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2; scene.add(floor);
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(500, 500),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, depthWrite: false }));
  sheen.rotation.x = -Math.PI / 2; sheen.position.y = -1.99; scene.add(sheen);

  /* courtyard walls make the mosque readable against the sky */
  const wallMat = new THREE.MeshLambertMaterial({ map: marbleTex, color: 0xeee4d1 });
  [-7.2, 7.2].forEach((x) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7, PATH + 28), wallMat);
    wall.position.set(x, 1.25, -PATH / 2 + 5);
    scene.add(wall);
  });

  /* arch bays */
  const colGeom = new THREE.CylinderGeometry(0.38, 0.44, 7.6, 20);
  const capGeom = new THREE.CylinderGeometry(0.6, 0.42, 0.5, 20);
  const baseGeom = new THREE.CylinderGeometry(0.55, 0.62, 0.5, 20);
  const archShape = new THREE.Shape();
  archShape.moveTo(-4.6, 5.7);
  archShape.lineTo(-4.6, 6.3); archShape.lineTo(-3.5, 6.3);
  archShape.quadraticCurveTo(-3.5, 8.4, 0, 9.9);
  archShape.quadraticCurveTo(3.5, 8.4, 3.5, 6.3);
  archShape.lineTo(4.6, 6.3); archShape.lineTo(4.6, 5.7);
  archShape.quadraticCurveTo(3.0, 7.0, 0, 8.7);
  archShape.quadraticCurveTo(-3.0, 7.0, -4.6, 5.7);
  const archGeom = new THREE.ExtrudeGeometry(archShape, { depth: 0.5, bevelEnabled: false });

  for (let i = 0; i < 28; i++) {
    const bay = new THREE.Group();
    [-4.6, 4.6].forEach((x) => {
      const col = new THREE.Mesh(colGeom, marbleColMat); col.position.set(x, 1.6, 0); bay.add(col);
      const cap = new THREE.Mesh(capGeom, marbleMat); cap.position.set(x, 5.65, 0); bay.add(cap);
      const bse = new THREE.Mesh(baseGeom, marbleMat); bse.position.set(x, -1.7, 0); bay.add(bse);
    });
    const arch = new THREE.Mesh(archGeom, wallMat); arch.position.z = -0.25; bay.add(arch);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(4.15, 0.07, 8, 48, Math.PI), new THREE.MeshBasicMaterial({ color: 0xa77d35 }));
    trim.rotation.z = Math.PI; trim.position.set(0, 6.2, 0.28); bay.add(trim);
    bay.position.z = -i * 9; scene.add(bay);
  }

  /* domes */
  const domeMat = new THREE.MeshLambertMaterial({ map: marbleTex, color: 0xfffaf0 });
  for (let i = 1; i <= 6; i++) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(6, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.position.set(0, 6.4, -i * 40); scene.add(dome);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 6, 1.2, 32), marbleMat);
    drum.position.set(0, 5.8, -i * 40); scene.add(drum);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.6, 14), new THREE.MeshLambertMaterial({ color: 0xd6c29a }));
    fin.position.set(0, 13.6, -i * 40); scene.add(fin);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), new THREE.MeshLambertMaterial({ color: 0xb89968 }));
    orb.position.set(0, 12.6, -i * 40); scene.add(orb);
  }

  /* fountain */
  const fountain = new THREE.Group();
  const fBase = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.1, 0.5, 40), marbleMat); fBase.position.y = -1.75; fountain.add(fBase);
  const fRim = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.14, 12, 36), marbleMat);
  fRim.rotation.x = Math.PI / 2; fRim.position.y = -1.45; fountain.add(fRim);
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.55, 40), new THREE.MeshBasicMaterial({ color: 0xeae2ce, transparent: true, opacity: 0.75 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -1.5; fountain.add(water);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 1.1, 14), marbleMat); spout.position.y = -0.9; fountain.add(spout);
  fountain.position.set(0, 0, -50); scene.add(fountain);

  const dropCount = 60;
  const dropGeo = new THREE.BufferGeometry();
  const dropPos = new Float32Array(dropCount * 3);
  const dropVel = new Float32Array(dropCount);
  for (let i = 0; i < dropCount; i++) {
    dropPos[i*3] = (Math.random()-0.5)*0.6;
    dropPos[i*3+1] = -0.4 + Math.random()*2;
    dropPos[i*3+2] = -50 + (Math.random()-0.5)*0.6;
    dropVel[i] = 0.02 + Math.random()*0.03;
  }
  dropGeo.setAttribute("position", new THREE.BufferAttribute(dropPos, 3));
  const drops = new THREE.Points(dropGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.85, depthWrite: false }));
  scene.add(drops);

  /* olive trees */
  for (let i = 0; i < 14; i++) {
    const z = -i * 18 - 8;
    [-9.5, 9.5].forEach((x) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 2.2, 10), new THREE.MeshLambertMaterial({ color: 0x8a7a5a }));
      trunk.position.set(x, -0.9, z); scene.add(trunk);
      for (let k = 0; k < 4; k++) {
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.3 - k*0.18, 10, 10), new THREE.MeshLambertMaterial({ color: 0xa8a878 }));
        leaves.position.set(x + (Math.random()-0.5)*0.4, 0.6 + k*0.7, z + (Math.random()-0.5)*0.4);
        scene.add(leaves);
      }
    });
  }

  /* rose beds */
  const roseGeo = new THREE.SphereGeometry(0.14, 8, 8);
  const roseMat = new THREE.MeshLambertMaterial({ color: 0xfff6f0 });
  for (let i = 0; i < (isMobile ? 60 : 120); i++) {
    const rose = new THREE.Mesh(roseGeo, roseMat);
    const side = Math.random() > 0.5 ? 1 : -1;
    rose.position.set(side * (6.8 + Math.random()*1.8), -1.85 + Math.random()*0.15, -Math.random()*PATH);
    scene.add(rose);
  }

  /* curtains */
  const curtainMat = new THREE.MeshBasicMaterial({ color: 0xfaf3e0, transparent: true, opacity: 0.42, side: THREE.DoubleSide });
  const curtains = [];
  for (let i = 0; i < 10; i++) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 6.4, 12, 10), curtainMat);
    const side = i % 2 ? 1 : -1;
    c.position.set(side * 4.75, 2.7, -i * 25 - 12);
    c.rotation.y = side * Math.PI / 2;
    scene.add(c); curtains.push(c);
  }

  /* doves */
  const birdTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const ctx = c.getContext("2d");
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(6, 44);
    ctx.quadraticCurveTo(20, 20, 32, 38);
    ctx.quadraticCurveTo(44, 20, 58, 44); ctx.stroke();
    return new THREE.CanvasTexture(c);
  })();
  const birdMat = new THREE.MeshBasicMaterial({ map: birdTex, transparent: true, depthWrite: false });
  const birds = [];
  for (let i = 0; i < 12; i++) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), birdMat);
    b.position.set((Math.random()-0.5)*40, 6 + Math.random()*5, -Math.random()*PATH);
    scene.add(b);
    birds.push({ mesh: b, sp: 0.015 + Math.random()*0.02, base: b.position.y, phase: Math.random()*Math.PI*2 });
  }

  /* moon */
  const moon = new THREE.Mesh(new THREE.CircleGeometry(3, 64), new THREE.MeshBasicMaterial({ color: 0xfff5dc, transparent: true, opacity: 0 }));
  moon.position.set(0, 8, -PATH - 6); scene.add(moon);
  const moonHalo = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshBasicMaterial({ color: 0xfff5dc, transparent: true, opacity: 0 }));
  moonHalo.position.set(0, 8, -PATH - 6.5); scene.add(moonHalo);

  /* light rays */
  const rays = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 22), new THREE.MeshBasicMaterial({
      color: 0xfff2d5, transparent: true, opacity: 0.06,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }));
    m.position.set((Math.random()-0.5)*8, 6, -i*18 - 10);
    m.rotation.z = 0.35 + (Math.random()-0.5)*0.2;
    scene.add(m); rays.push(m);
  }

  /* petals */
  const petalGeo = new THREE.PlaneGeometry(0.34, 0.48);
  const petalTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(64, 50, 5, 64, 64, 60);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.6, "rgba(255,250,240,0.9)");
    grad.addColorStop(1, "rgba(255,240,220,0)");
    ctx.fillStyle = grad; ctx.beginPath();
    ctx.ellipse(64, 64, 40, 55, 0, 0, Math.PI*2); ctx.fill();
    return new THREE.CanvasTexture(c);
  })();
  const petalMat = new THREE.MeshBasicMaterial({ map: petalTex, transparent: true, depthWrite: false, opacity: 0.9 });
  const petals = [];
  for (let i = 0; i < (isMobile ? 45 : 80); i++) {
    const m = new THREE.Mesh(petalGeo, petalMat);
    m.position.set((Math.random()-0.5)*24, Math.random()*14, -Math.random()*PATH);
    m.rotation.z = Math.random()*Math.PI;
    scene.add(m);
    petals.push({ mesh: m, speed: 0.006 + Math.random()*0.012, sway: 0.5 + Math.random(), rot: (Math.random()-0.5)*0.01, offset: Math.random()*Math.PI*2 });
  }

  /* dust */
  const dustCount = isMobile ? 300 : 700;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i*3] = (Math.random()-0.5)*40;
    dustPos[i*3+1] = Math.random()*14;
    dustPos[i*3+2] = -Math.random()*PATH;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xf0e4c8, size: 0.04, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
  })));

  /* input */
  let scrollY = window.scrollY;
  window.addEventListener("scroll", () => { scrollY = window.scrollY; }, { passive: true });
  if (lenis) lenis.on("scroll", (e) => { scrollY = e.scroll; });

  const mouse = { x: 0, y: 0 };
  window.addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = window.matchMedia("(max-width: 768px)").matches ? 68 : 55;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 200));
  resize();

  const clock = new THREE.Clock();
  (function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const totalScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, scrollY / totalScroll);

    camera.position.x = mouse.x * 0.6;
    camera.position.y = 1.4 + mouse.y * -0.25;
    camera.position.z = 10 - progress * PATH;
    camera.lookAt(mouse.x * 0.4, 1.2, camera.position.z - 10);

    const dp = drops.geometry.attributes.position;
    for (let i = 0; i < dropCount; i++) {
      const iy = i * 3 + 1;
      let y = dp.array[iy] + dropVel[i];
      if (y > 1.4) { y = -0.4; dropVel[i] = 0.02 + Math.random()*0.035; }
      dp.array[iy] = y;
    }
    dp.needsUpdate = true;

    curtains.forEach((c, i) => {
      const pos = c.geometry.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const yv = pos.getY(v);
        pos.setZ(v, Math.sin(t*1.2 + i + yv*0.6) * 0.12 * ((yv + 3.2) / 6.4));
      }
      pos.needsUpdate = true;
    });

    birds.forEach((b) => {
      b.mesh.position.x += b.sp;
      b.mesh.position.y = b.base + Math.sin(t*3 + b.phase) * 0.2;
      b.mesh.scale.x = 1 + Math.sin(t*8 + b.phase) * 0.1;
      if (b.mesh.position.x > 22) b.mesh.position.x = -22;
    });

    petals.forEach((p) => {
      p.mesh.position.y -= p.speed;
      p.mesh.position.x += Math.sin(t * p.sway + p.offset) * 0.005;
      p.mesh.rotation.z += p.rot;
      if (p.mesh.position.y < -2) {
        p.mesh.position.y = 12;
        p.mesh.position.x = (Math.random()-0.5)*24;
      }
    });

    rays.forEach((r, i) => { r.material.opacity = 0.05 + Math.sin(t*0.5 + i) * 0.03; });

    const moonOp = Math.max(0, (progress - 0.82) * 5);
    moon.material.opacity = Math.min(1, moonOp);
    moonHalo.material.opacity = Math.min(0.35, moonOp * 0.35);

    renderer.render(scene, camera);
  })();
})();

/* ---------------- Cursor glow ---------------- */
(function cursorGlow() {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  const el = document.createElement("div");
  el.className = "cursor-glow";
  document.body.appendChild(el);
  window.addEventListener("mousemove", (e) => {
    gsap.to(el, { x: e.clientX, y: e.clientY, duration: 0.4, ease: "power3.out", overwrite: true });
  });
  document.querySelectorAll("button, a, .btn-magnetic").forEach((b) => {
    b.addEventListener("mouseenter", () => gsap.to(el, { scale: 2, duration: 0.3 }));
    b.addEventListener("mouseleave", () => gsap.to(el, { scale: 1, duration: 0.3 }));
  });
})();

/* ---------------- Scratch cards ---------------- */
document.querySelectorAll("[data-scratch]").forEach((wrap) => {
  const canvas = wrap.querySelector(".scratch-canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const label = wrap.getAttribute("data-label") || "— scratch to reveal —";
  let revealed = false, drawing = false;

  function paint() {
    if (revealed) return;
    const width = Math.round(wrap.getBoundingClientRect().width);
    const height = Math.round(wrap.getBoundingClientRect().height);
    if (width < 2 || height < 2) { requestAnimationFrame(paint); return; }
    const dpr = 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "#f2e8d0"); grad.addColorStop(1, "#e6d7b3");
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 20;
      img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
      img.data[i+1] = Math.max(0, Math.min(255, img.data[i+1] + n));
      img.data[i+2] = Math.max(0, Math.min(255, img.data[i+2] + n));
    }
    ctx.putImageData(img, 0, 0);
    ctx.fillStyle = "#8a6a2f";
    ctx.font = "italic " + Math.max(15, Math.round(canvas.width * 0.042)) + "px 'Cormorant Garamond', serif";
    ctx.textAlign = "center";
    ctx.fillText(label, canvas.width / 2, canvas.height / 2);
  }
  requestAnimationFrame(paint);
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(paint, 200); });

  const radius = () => Math.max(20, canvas.width * 0.055);

  function scratchAt(x, y) {
    if (revealed) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath(); ctx.arc(x, y, radius(), 0, Math.PI * 2); ctx.fill();

    if (Math.random() > 0.75) {
      const rect = canvas.getBoundingClientRect();
      const dot = document.createElement("div");
      dot.style.cssText = `position:fixed;left:${rect.left + x}px;top:${rect.top + y}px;width:4px;height:4px;border-radius:50%;background:#b89968;pointer-events:none;z-index:50;box-shadow:0 0 8px #d6c29a`;
      document.body.appendChild(dot);
      gsap.to(dot, { x: (Math.random()-0.5)*60, y: 40 + Math.random()*40, opacity: 0, duration: 1.2, ease: "power2.out", onComplete: () => dot.remove() });
    }

    if (Math.random() > 0.88) {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let cleared = 0, total = 0;
      for (let i = 3; i < data.length; i += 40) { total++; if (data[i] === 0) cleared++; }
      if (cleared / total > 0.45) {
        revealed = true;
        gsap.to(canvas, { opacity: 0, duration: 0.8, ease: "power2.out", onComplete: () => (canvas.style.pointerEvents = "none") });
      }
    }
  }
  const at = (cx, cy) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || !canvas.width || !canvas.height) return;
    scratchAt((cx - rect.left) * (canvas.width / rect.width), (cy - rect.top) * (canvas.height / rect.height));
  };

  canvas.addEventListener("mousedown", (e) => { drawing = true; at(e.clientX, e.clientY); });
  canvas.addEventListener("mousemove", (e) => drawing && at(e.clientX, e.clientY));
  window.addEventListener("mouseup", () => (drawing = false));
  canvas.addEventListener("mouseleave", () => (drawing = false));
  canvas.addEventListener("touchstart", (e) => { drawing = true; at(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  canvas.addEventListener("touchmove", (e) => { e.preventDefault(); at(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
  canvas.addEventListener("touchend", () => (drawing = false));
});

/* ---------------- Countdown ---------------- */
(function countdown() {
  const target = new Date("2026-10-18T20:00:00+05:00").getTime();
  const R = 130, C = 2 * Math.PI * R;
  const ring = document.getElementById("ring");
  if (ring) ring.setAttribute("stroke-dasharray", C);
  const pad = (n) => String(n).padStart(2, "0");
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = pad(v); };
  function tick() {
    const t = Math.max(0, target - Date.now());
    set("cd-d", Math.floor(t / 86400000));
    set("cd-h", Math.floor((t / 3600000) % 24));
    set("cd-m", Math.floor((t / 60000) % 60));
    set("cd-s", Math.floor((t / 1000) % 60));
    const progress = 1 - Math.min(1, t / (365 * 86400000));
    if (ring) ring.setAttribute("stroke-dashoffset", C * (1 - progress));
  }
  tick(); setInterval(tick, 1000);
})();


/* ---------------- Entry veil + scroll animations ---------------- */
(function boot() {
  const veil = document.getElementById("veil");
  const btn = document.getElementById("begin-btn");
  if (lenis) lenis.stop();
  document.body.style.overflow = "hidden";

  if (!btn || !veil) { document.body.style.overflow = ""; initScroll(); return; }
  btn.addEventListener("click", () => {
    gsap.to(veil, {
      opacity: 0, duration: 1, ease: "power2.out",
      onComplete: () => {
        veil.style.display = "none";
        document.body.style.overflow = "";
        if (lenis) lenis.start();
        initScroll();
        ScrollTrigger.refresh();
      },
    });
  });
})();

function initScroll() {
  /* Envelope opening — pinned */
  gsap.timeline({
    scrollTrigger: { trigger: "#scene-open", start: "top top", end: "+=100%", scrub: 1, pin: true, anticipatePin: 1 },
  })
    .to(".wax-seal", { scale: 0.4, opacity: 0, duration: 1 }, 0)
    .to("#scene-open .envelope-flap", { rotateX: -180, duration: 2, ease: "power2.inOut" }, 0.2)
    .to(".invitation-card", { opacity: 1, y: "-40%", duration: 2 }, 1)
    .to("#scene-open .envelope", { y: -60, opacity: 0.4, duration: 1 }, 2.5);

  /* Scene reveals */
  gsap.utils.toArray(".scene-reveal").forEach((el) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: "top 78%", end: "top 32%", scrub: 1 },
      opacity: 0, y: 60,
    });
  });

  /* Calligraphy draw */
  [["#bismillah", "#scene-bismillah", 3], ["#verse", "#scene-verse", 3.5]].forEach(([sel, trig, dur]) => {
    document.querySelectorAll(sel + " path").forEach((path) => {
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(path, { strokeDashoffset: 0, duration: dur, ease: "power2.inOut", scrollTrigger: { trigger: trig, start: "top 65%" } });
    });
  });

  /* Roses bloom */
  gsap.utils.toArray(".rose").forEach((r, i) => {
    gsap.from(r, {
      scale: 0, opacity: 0, transformOrigin: "center center",
      duration: 1.6, delay: i * 0.15, ease: "elastic.out(1,0.6)",
      scrollTrigger: { trigger: "#scene-names", start: "top 65%" },
    });
  });

  gsap.from(".name-line", {
    scaleX: 0, transformOrigin: "left center", duration: 1.5, ease: "power3.inOut",
    scrollTrigger: { trigger: "#scene-names", start: "top 45%" },
  });

  /* Timeline items */
  gsap.utils.toArray(".tl-item").forEach((el, i) => {
    gsap.from(el, {
      opacity: 0, x: i % 2 === 0 ? -60 : 60, duration: 1.2,
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });

  /* Memory parallax (desktop only) */
  if (window.matchMedia("(min-width: 761px)").matches) {
    const memories = document.querySelectorAll(".memory-frag");
    window.addEventListener("mousemove", (e) => {
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      memories.forEach((m, i) => {
        const depth = (i + 1) * 0.02;
        gsap.to(m, { x: (e.clientX - cx) * depth, y: (e.clientY - cy) * depth, duration: 1.5, ease: "power2.out" });
      });
    });
  }

  /* Ending */
  gsap.to(".ending-envelope", {
    rotateX: 40, scale: 0.7, opacity: 0.5,
    scrollTrigger: { trigger: "#scene-ending", start: "top 60%", end: "bottom bottom", scrub: 1 },
  });
  gsap.to(".ending-veil", {
    opacity: 1,
    scrollTrigger: { trigger: "#scene-ending", start: "center center", end: "bottom bottom", scrub: 1 },
  });

  let t; window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => ScrollTrigger.refresh(), 250); });
}
