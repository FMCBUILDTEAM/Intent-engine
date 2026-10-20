/* Intent Engine landing page: two three.js scenes.
   Hero: a rotating tooth of readers, with a few red high-intent readers.
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
    var golden = Math.PI * (3 - Math.sqrt(5));
    var grey = [], red = [], count = 0;
    function point(x, y, z) {
      var target = count++ % 67 === 11 ? red : grey;
      target.push(x, y, z);
    }
    // A rounded, four-cusp crown. Evenly distributed surface points retain
    // the light editorial dot treatment without loading a model or texture.
    var N = 1000;
    for (var i = 0; i < N; i++) {
      var v = 1 - 2 * (i + 0.5) / N;
      var theta = golden * i, ring = Math.pow(1 - v * v, 0.36);
      var cx = Math.cos(theta), cz = Math.sin(theta);
      var x = 1.32 * ring * Math.sign(cx) * Math.pow(Math.abs(cx), 0.78);
      var z = 0.88 * ring * Math.sign(cz) * Math.pow(Math.abs(cz), 0.78);
      var y = 0.65 + 1.02 * v;
      // Four raised cusps and a shallow central chewing-surface depression.
      y += Math.max(v, 0) * ring * (0.25 - 0.19 * Math.cos(4 * theta));
      point(x, y, z);
    }
    // Two curved, tapering roots, embedded in the crown at their shoulders.
    // Omit the hidden inner surfaces where the roots join the crown.
    for (var side = -1; side <= 1; side += 2) {
      for (var j = 0; j < 420; j++) {
        var t = (j + 0.5) / 420, angle = golden * j;
        var radius = 0.50 * Math.pow(1 - t, 0.72);
        var rx = side * (0.55 + 0.42 * t - 0.15 * Math.sin(Math.PI * t));
        var ry = 0.10 - 2.15 * t;
        var rz = 0.10 * Math.sin(Math.PI * t);
        x = rx + radius * Math.cos(angle);
        y = ry;
        z = rz + radius * 0.85 * Math.sin(angle);
        if (y > -0.25) continue;
        point(x, y, z);
      }
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
    group.scale.setScalar(0.62);
    group.rotation.x = 0.12;
    group.rotation.y = 0.25;
    return {
      scene: scene, camera: camera,
      resize: function (w, h) {
        camera.aspect = w / h; camera.updateProjectionMatrix();
        var wide = w / h > 0.9;
        group.position.set(wide ? 0.6 : 0, 1.5, 0);
      },
      tick: function (dt, t) {
        group.rotation.y += dt * 0.12;
        redPts.material.size = 0.09 + Math.sin(t * 2.2) * 0.025;
      },
      settle: function () { group.rotation.y = 0.25; }
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
