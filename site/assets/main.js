/* Intent Engine landing page: two three.js scenes.
   Hero: a globe of readers that settles into a tooth on load, then rotates,
         with a few red high-intent readers.
   How it works: a funnel where readers pass through Reads, Compares, Asks and Buys. */
(function () {
  'use strict';

  var dotTexture = null;
  function dot(THREE) {
    if (dotTexture) return dotTexture;
    var c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    var x = c.getContext('2d');
    x.beginPath(); x.arc(32, 32, 29, 0, Math.PI * 2); x.fillStyle = '#ffffff'; x.fill();
    dotTexture = new THREE.CanvasTexture(c);
    return dotTexture;
  }

  function stage(canvas, build) {
    var THREE = window.THREE;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    var s = build(THREE);
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var raf = 0, visible = true, last = 0, t = 0;

    function size() {
      var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      s.resize(w, h);
    }
    function draw() { renderer.render(s.scene, s.camera); }
    function loop(now) {
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now; t += dt;
      s.tick(dt, t); draw();
      raf = visible ? requestAnimationFrame(loop) : 0;
    }

    size();
    if (reduce) { s.settle(); draw(); } else { raf = requestAnimationFrame(loop); }

    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !raf) { last = 0; raf = requestAnimationFrame(loop); }
      }).observe(canvas);
    }
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { size(); if (reduce) draw(); }).observe(canvas);
    } else {
      window.addEventListener('resize', function () { size(); if (reduce) draw(); });
    }
  }

  /* A molar described as a signed distance field: a rounded crown with four
     cusps and a shallow central fissure, joined to two splayed roots. */
  function toothSDF(x, y, z) {
    function smin(a, b, k) { var h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
    function smax(a, b, k) { return -smin(-a, -b, k); }
    function len(a, b, c) { return Math.sqrt(a * a + b * b + c * c); }
    function roundBox(px, py, pz, bx, by, bz, r) {
      var qx = Math.abs(px) - bx + r, qy = Math.abs(py) - by + r, qz = Math.abs(pz) - bz + r;
      return len(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r;
    }
    function taper(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) {
      var pax = px - ax, pay = py - ay, paz = pz - az, bax = bx - ax, bay = by - ay, baz = bz - az;
      var h = Math.min(Math.max((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0), 1);
      return len(pax - bax * h, pay - bay * h, paz - baz * h) - (r1 + (r2 - r1) * h);
    }
    var crown = roundBox(x, y - 0.72, z, 1.3, 0.7, 1.05, 0.45);
    var cx = [0.62, -0.62, 0.62, -0.62], cz = [0.45, 0.45, -0.45, -0.45];
    for (var i = 0; i < 4; i++) crown = smin(crown, len(x - cx[i], y - 1.22, z - cz[i]) - 0.42, 0.3);
    crown = smax(crown, -(len(x, y - 1.98, z) - 0.5), 0.2);
    var roots = Math.min(
      taper(x, y, z, 0.58, 0.3, 0, 0.88, -2.15, 0.05, 0.48, 0.15),
      taper(x, y, z, -0.58, 0.3, 0, -0.88, -2.15, -0.05, 0.48, 0.15)
    );
    return smin(crown, roots, 0.45);
  }

  function heroScene(THREE) {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 7.2);
    var group = new THREE.Group();
    scene.add(group);

    // Seeded random numbers, so the tooth looks the same on every visit.
    var seed = 20261020;
    function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

    // Sample points evenly over the tooth surface, then snap them onto it.
    var N = 1700, R = 2.1, YOFF = 0.1, e = 0.002, tooth = [];
    var guard = 0;
    while (tooth.length < N * 3 && guard < 600000) {
      guard++;
      var x = (rand() * 2 - 1) * 1.9, y = rand() * 4.5 - 2.4, z = (rand() * 2 - 1) * 1.5;
      var d = toothSDF(x, y, z);
      if (Math.abs(d) > 0.03) continue;
      for (var it = 0; it < 3; it++) {
        var gx = (toothSDF(x + e, y, z) - toothSDF(x - e, y, z)) / (2 * e);
        var gy = (toothSDF(x, y + e, z) - toothSDF(x, y - e, z)) / (2 * e);
        var gz = (toothSDF(x, y, z + e) - toothSDF(x, y, z - e)) / (2 * e);
        var gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
        d = toothSDF(x, y, z);
        x -= d * gx / gl; y -= d * gy / gl; z -= d * gz / gl;
      }
      tooth.push(x, y + YOFF, z);
    }
    var count = tooth.length / 3;

    // Start from a complete globe. Pair globe points with tooth points by
    // matching latitude bands, then angle within each band, so the globe
    // flows smoothly into the tooth instead of points crossing at random.
    var golden = Math.PI * (3 - Math.sqrt(5)), globe = [];
    for (var g = 0; g < count; g++) {
      var gy = 1 - (g / (count - 1)) * 2, gr = Math.sqrt(1 - gy * gy), gt = golden * g;
      globe.push([Math.cos(gt) * gr * R, gy * R, Math.sin(gt) * gr * R]);
    }
    var toothPts = [];
    for (var q = 0; q < count; q++) toothPts.push([tooth[q * 3], tooth[q * 3 + 1], tooth[q * 3 + 2], q]);
    function dirY(p) { return p[1] / (Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]) || 1); }
    function ang(p) { return Math.atan2(p[2], p[0]); }
    globe.sort(function (a, b) { return dirY(b) - dirY(a); });
    toothPts.sort(function (a, b) { return dirY(b) - dirY(a); });
    var BANDS = 40, per = Math.ceil(count / BANDS);
    var sphere = new Float32Array(count * 3), delay = new Float32Array(count);
    for (var bnd = 0; bnd < count; bnd += per) {
      var gs = globe.slice(bnd, bnd + per).sort(function (a, b) { return ang(a) - ang(b); });
      var ts = toothPts.slice(bnd, bnd + per).sort(function (a, b) { return ang(a) - ang(b); });
      for (var m = 0; m < ts.length; m++) {
        var n = ts[m][3];
        sphere[n * 3] = gs[m][0]; sphere[n * 3 + 1] = gs[m][1]; sphere[n * 3 + 2] = gs[m][2];
        delay[n] = (1 - (tooth[n * 3 + 1] + 2.2) / 4.4) * 0.45 + rand() * 0.15;
      }
    }

    var greyIdx = [], redIdx = [];
    for (var k = 0; k < count; k++) { if (k % 67 === 11) redIdx.push(k); else greyIdx.push(k); }

    function make(idx, color, sz, op) {
      var arr = new Float32Array(idx.length * 3);
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      var m = new THREE.PointsMaterial({ color: color, size: sz, sizeAttenuation: true, map: dot(THREE), alphaTest: 0.5, transparent: true, opacity: op, depthWrite: false });
      var pts = new THREE.Points(g, m);
      pts.userData.idx = idx;
      group.add(pts);
      return pts;
    }
    var greyPts = make(greyIdx, 0x9CA3AF, 0.04, 0.85);
    var redPts = make(redIdx, 0xE00623, 0.1, 1);

    var DURATION = 2.0;
    function ease(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
    function morph(time) {
      [greyPts, redPts].forEach(function (pts) {
        var idx = pts.userData.idx, a = pts.geometry.attributes.position.array;
        for (var i = 0; i < idx.length; i++) {
          var n = idx[i], u = Math.min(Math.max((time - delay[n]) / DURATION, 0), 1), s = ease(u);
          for (var c = 0; c < 3; c++) a[i * 3 + c] = sphere[n * 3 + c] + (tooth[n * 3 + c] - sphere[n * 3 + c]) * s;
        }
        pts.geometry.attributes.position.needsUpdate = true;
      });
    }
    var done = false;
    morph(0);
    group.rotation.x = 0.12;

    return {
      scene: scene, camera: camera,
      resize: function (w, h) {
        camera.aspect = w / h; camera.updateProjectionMatrix();
        var wide = w / h > 0.9;
        group.position.set(wide ? 0.45 : 0, 0.8, 0);
        group.scale.setScalar(0.76);
      },
      tick: function (dt, t) {
        if (!done) { morph(t); if (t > DURATION + 0.7) done = true; }
        group.rotation.y += dt * 0.12;
        redPts.material.size = 0.09 + Math.sin(t * 2.2) * 0.025;
      },
      settle: function () { morph(99); done = true; group.rotation.y = 0.35; }
    };
  }

  function flowScene(THREE) {
    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera(-6.3, 6.3, 2, -2, 0.1, 100);
    camera.position.set(0, 3, 12);
    camera.lookAt(0, 0, 0);
    var N = 1100, X0 = -6, X1 = 6, gates = [-3, 0, 3];
    var R0 = 1.6, R1 = 0.22;
    var pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    var P = [];
    function spawn(p, anywhere) {
      p.d = Math.random();
      p.end = p.d < 0.45 ? -3 : (p.d < 0.7 ? 0 : (p.d < 0.86 ? 3 : X1));
      p.x = anywhere ? X0 + Math.random() * (p.end - X0) : X0 - Math.random() * 0.6;
      p.a = Math.random() * Math.PI * 2;
      p.f = Math.sqrt(Math.random());
      p.v = 0.9 + Math.random() * 0.5;
    }
    for (var i = 0; i < N; i++) { var p = {}; spawn(p, true); P.push(p); }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({ size: 4.5, sizeAttenuation: false, vertexColors: true, map: dot(THREE), alphaTest: 0.5, transparent: true });
    scene.add(new THREE.Points(geo, mat));
    var rp = [];
    for (var k = 0; k < 96; k++) { var a = (k / 96) * Math.PI * 2; rp.push(0, Math.sin(a), Math.cos(a)); }
    var ringGeo = new THREE.BufferGeometry();
    ringGeo.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    var ringMat = new THREE.LineBasicMaterial({ color: 0xC9CBCF });
    var rings = gates.concat([X1]).map(function (gx) {
      var l = new THREE.LineLoop(ringGeo, ringMat); l.position.x = gx; scene.add(l); return l;
    });
    function rad(x) { return R0 + (R1 - R0) * Math.min(Math.max((x - X0) / (X1 - X0), 0), 1); }
    var grey = [0.612, 0.639, 0.686], red = [0.878, 0.024, 0.137];
    function write() {
      for (var i = 0; i < N; i++) {
        var p = P[i], r = rad(p.x) * p.f, k = i * 3;
        pos[k] = p.x; pos[k + 1] = Math.sin(p.a) * r; pos[k + 2] = Math.cos(p.a) * r;
        var c = p.x > 3 ? red : grey;
        col[k] = c[0]; col[k + 1] = c[1]; col[k + 2] = c[2];
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }
    function step(dt) {
      for (var i = 0; i < N; i++) {
        var p = P[i];
        p.x += p.v * dt; p.a += dt * 0.35;
        if (p.x > p.end) spawn(p, false);
      }
    }
    write();
    return {
      scene: scene, camera: camera,
      resize: function (w, h) {
        var vw = 12.6, vh = vw * h / w;
        camera.left = -vw / 2; camera.right = vw / 2; camera.top = vh / 2; camera.bottom = -vh / 2;
        camera.updateProjectionMatrix();
        R0 = Math.min(1.7, vh * 0.36); R1 = R0 * 0.14;
        rings.forEach(function (l) { var r = rad(l.position.x) + 0.06; l.scale.set(1, r, r); });
        mat.size = w < 600 ? 3 : 4.5;
        write();
      },
      tick: function (dt) { step(dt); write(); },
      settle: function () { for (var k = 0; k < 400; k++) step(0.03); write(); }
    };
  }

  function init() {
    if (!window.THREE) return;
    var hero = document.getElementById('hero-canvas');
    var flow = document.getElementById('flow-canvas');
    try { if (hero) stage(hero, heroScene); } catch (e) { if (window.console) console.warn('Hero animation unavailable', e); }
    try { if (flow) stage(flow, flowScene); } catch (e) { if (window.console) console.warn('Funnel animation unavailable', e); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
