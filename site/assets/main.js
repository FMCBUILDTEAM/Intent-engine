/* Intent Engine landing page: two three.js scenes.
   Hero: a rotating globe of readers, with a few red high-intent readers.
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

  function heroScene(THREE) {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 7.2);
    var group = new THREE.Group();
    scene.add(group);
    var N = 1600, R = 2.1, golden = Math.PI * (3 - Math.sqrt(5));
    var grey = [], red = [];
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
      var px = Math.cos(th) * r * R, py = y * R, pz = Math.sin(th) * r * R;
      if (i % 67 === 11) red.push(px, py, pz); else grey.push(px, py, pz);
    }
    function make(arr, color, sz, op) {
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      var m = new THREE.PointsMaterial({ color: color, size: sz, sizeAttenuation: true, map: dot(THREE), alphaTest: 0.5, transparent: true, opacity: op, depthWrite: false });
      var pts = new THREE.Points(g, m);
      group.add(pts);
      return pts;
    }
    make(grey, 0x9CA3AF, 0.04, 0.85);
    var redPts = make(red, 0xE00623, 0.1, 1);
    group.rotation.x = 0.35;
    return {
      scene: scene, camera: camera,
      resize: function (w, h) {
        camera.aspect = w / h; camera.updateProjectionMatrix();
        var wide = w / h > 0.9;
        group.position.set(wide ? 0.6 : 0, wide ? 0.55 : 0.9, 0);
      },
      tick: function (dt, t) {
        group.rotation.y += dt * 0.12;
        redPts.material.size = 0.09 + Math.sin(t * 2.2) * 0.025;
      },
      settle: function () { group.rotation.y = 0.6; }
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
