(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const start = document.getElementById('start');
  const modal = document.getElementById('dealModal');
  const pauseModal = document.getElementById('pauseModal');
  const hint = document.getElementById('hint');
  const toast = document.getElementById('toast');
  const missionTitle = document.getElementById('missionTitle');
  const missionText = document.getElementById('missionText');
  const missionProgress = document.getElementById('missionProgress');
  const repEl = document.getElementById('rep');
  const cashEl = document.getElementById('cash');
  const levelEl = document.getElementById('level');
  const dealsEl = document.getElementById('deals');
  const dealTitle = document.getElementById('dealTitle');
  const dealCopy = document.getElementById('dealCopy');
  const offerGrid = document.getElementById('offerGrid');

  const WORLD = { w: 3200, h: 2200 };
  const keys = Object.create(null);
  let running = false;
  let paused = false;
  let last = performance.now();
  let now = 0;
  let camera = { x: 0, y: 0 };
  let near = null;
  let lastToast = 0;

  const neighborhoods = [
    { name: 'Downtown Detroit', x: 0, y: 0, w: 1050, h: 720, tint: '#21302b' },
    { name: 'Midtown', x: 1050, y: 0, w: 1050, h: 720, tint: '#273128' },
    { name: 'Eastside', x: 2100, y: 0, w: 1100, h: 720, tint: '#24322e' },
    { name: 'Royal Oak', x: 0, y: 720, w: 1600, h: 1480, tint: '#23352a' },
    { name: 'Birmingham', x: 1600, y: 720, w: 1600, h: 1480, tint: '#2a3425' }
  ];

  const roads = [];
  for (let y = 180; y < WORLD.h; y += 360) roads.push({ x: 0, y, w: WORLD.w, h: 92 });
  for (let x = 220; x < WORLD.w; x += 430) roads.push({ x, y: 0, w: 96, h: WORLD.h });

  const buildings = [];
  const rand = mulberry32(77421);
  for (let gy = 0; gy < WORLD.h; gy += 360) {
    for (let gx = 0; gx < WORLD.w; gx += 430) {
      const left = gx + 18;
      const top = gy + 20;
      const w = 165 + Math.floor(rand() * 70);
      const h = 110 + Math.floor(rand() * 72);
      if (left + w < WORLD.w && top + h < WORLD.h) {
        buildings.push({ x: left, y: top, w, h, shade: rand() > .5 ? '#bcae99' : '#d0c5b3', windows: 2 + Math.floor(rand() * 4) });
      }
      const rightX = gx + 320;
      if (rightX + 90 < WORLD.w && top + 145 < WORLD.h) {
        buildings.push({ x: rightX, y: top + 35, w: 82, h: 118, shade: rand() > .5 ? '#a8967f' : '#c1b49e', windows: 2 });
      }
    }
  }

  const office = { type: 'office', x: 520, y: 470, r: 42, label: 'Shayla Lucky Realty HQ' };
  const closingOffice = { type: 'closing', x: 2670, y: 1730, r: 42, label: 'Closing Office' };

  const properties = [
    { id: 1, type: 'property', x: 865, y: 610, label: 'Brick Colonial', price: 238000, repairs: 12000, score: 78, style: 'Colonial' },
    { id: 2, type: 'property', x: 1350, y: 590, label: 'Midtown Condo', price: 294000, repairs: 5000, score: 84, style: 'Condo' },
    { id: 3, type: 'property', x: 2250, y: 605, label: 'Eastside Duplex', price: 179000, repairs: 26000, score: 88, style: 'Duplex' },
    { id: 4, type: 'property', x: 640, y: 1345, label: 'Royal Oak Bungalow', price: 319000, repairs: 8000, score: 91, style: 'Bungalow' },
    { id: 5, type: 'property', x: 1420, y: 1710, label: 'Modern Ranch', price: 365000, repairs: 15000, score: 86, style: 'Ranch' },
    { id: 6, type: 'property', x: 2180, y: 1240, label: 'Birmingham Townhome', price: 489000, repairs: 7000, score: 94, style: 'Townhome' },
    { id: 7, type: 'property', x: 2860, y: 905, label: 'Corner-Lot Home', price: 415000, repairs: 18000, score: 82, style: 'Traditional' },
    { id: 8, type: 'property', x: 2670, y: 1990, label: 'Investor Fourplex', price: 525000, repairs: 38000, score: 93, style: 'Multifamily' }
  ];

  const clients = [
    { name: 'Jordan', goal: 'first home', budget: 340000, color: '#f1d37e' },
    { name: 'Maya', goal: 'small multifamily', budget: 550000, color: '#f0a978' },
    { name: 'Chris', goal: 'move-up home', budget: 500000, color: '#9bd3ff' },
    { name: 'Nia', goal: 'investment property', budget: 420000, color: '#c3a7ff' }
  ];

  const pedestrians = Array.from({ length: 38 }, (_, i) => ({
    x: 100 + rand() * (WORLD.w - 200),
    y: 100 + rand() * (WORLD.h - 200),
    vx: (rand() - .5) * 28,
    vy: (rand() - .5) * 28,
    phase: rand() * Math.PI * 2,
    color: ['#e0c2a8','#8e5f42','#c78e69','#684332','#d8af8d'][i % 5]
  }));

  const traffic = Array.from({ length: 24 }, (_, i) => {
    const horizontal = i % 2 === 0;
    return {
      horizontal,
      x: horizontal ? rand() * WORLD.w : 220 + (i % 7) * 430 + 24,
      y: horizontal ? 180 + (i % 6) * 360 + 22 : rand() * WORLD.h,
      speed: 70 + rand() * 80,
      dir: rand() > .5 ? 1 : -1,
      color: ['#e7e7e7','#303238','#8c1d25','#1e496b','#c49337'][i % 5]
    };
  });

  const defaultSave = {
    x: office.x + 90,
    y: office.y + 60,
    rep: 12,
    cash: 0,
    level: 1,
    xp: 0,
    deals: 0,
    clientIndex: 0,
    mission: 0,
    toured: [],
    chosenProperty: null,
    offerAccepted: false,
    carUnlocked: false,
    inCar: false,
    day: 1,
    elapsed: 0
  };

  let state = loadSave();
  const player = { x: state.x, y: state.y, r: 15, dir: 0, bob: 0 };

  const missions = [
    () => ({
      title: `Meet ${currentClient().name}`,
      text: `${currentClient().name} wants a ${currentClient().goal}. Meet them at Shayla Lucky Realty HQ.`,
      target: office,
      progress: 0
    }),
    () => ({
      title: 'Tour properties',
      text: `Tour 3 properties within ${money(currentClient().budget + 100000)} and build a shortlist.`,
      target: null,
      progress: Math.min(1, state.toured.length / 3)
    }),
    () => ({
      title: 'Choose the best fit',
      text: 'Visit a toured property and press E / ACTION to prepare an offer.',
      target: null,
      progress: state.chosenProperty ? 1 : 0
    }),
    () => ({
      title: 'Negotiate the deal',
      text: state.offerAccepted ? 'Offer accepted. Head to the closing office.' : 'Select an offer strategy and try to win the deal.',
      target: state.offerAccepted ? closingOffice : properties.find(p => p.id === state.chosenProperty),
      progress: state.offerAccepted ? .7 : .25
    }),
    () => ({
      title: 'Close the deal',
      text: 'Meet at the closing office and collect your commission, XP and reputation.',
      target: closingOffice,
      progress: .9
    })
  ];

  function currentClient() { return clients[state.clientIndex % clients.length]; }

  function loadSave() {
    try {
      const raw = localStorage.getItem('shaylaLuckyKeysSave');
      return raw ? { ...defaultSave, ...JSON.parse(raw) } : { ...defaultSave };
    } catch { return { ...defaultSave }; }
  }

  function save() {
    state.x = player.x; state.y = player.y;
    try { localStorage.setItem('shaylaLuckyKeysSave', JSON.stringify(state)); } catch {}
  }

  function resetGame() {
    state = { ...defaultSave, toured: [] };
    player.x = state.x; player.y = state.y;
    localStorage.removeItem('shaylaLuckyKeysSave');
    updateHUD();
    showToast('Fresh start', 'New career save created.');
  }

  function mulberry32(a) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas._cssW = rect.width;
    canvas._cssH = rect.height;
  }
  addEventListener('resize', resize);
  resize();

  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  function levelThreshold(level) { return 100 + (level - 1) * 85; }

  function addXP(amount) {
    state.xp += amount;
    while (state.xp >= levelThreshold(state.level)) {
      state.xp -= levelThreshold(state.level);
      state.level += 1;
      state.rep += 8;
      showToast(`Level ${state.level} reached`, state.level === 2 ? 'Lucky Mobile unlocked. Press R to drive.' : 'New market credibility unlocked.');
      if (state.level >= 2) state.carUnlocked = true;
      sound(720, .12); setTimeout(() => sound(920, .12), 120);
    }
  }

  function updateHUD() {
    repEl.textContent = Math.round(state.rep);
    cashEl.textContent = money(state.cash);
    levelEl.textContent = state.level;
    dealsEl.textContent = state.deals;
    const m = missions[Math.min(state.mission, missions.length - 1)]();
    missionTitle.textContent = m.title;
    missionText.textContent = m.text;
    missionProgress.style.width = `${Math.round(m.progress * 100)}%`;
  }

  function showToast(title, copy) {
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastCopy').textContent = copy;
    toast.classList.add('show');
    lastToast = performance.now();
  }

  function sound(freq = 420, duration = .08) {
    try {
      const ac = sound.ac || (sound.ac = new (AudioContext || webkitAudioContext)());
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(.04, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + duration);
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + duration);
    } catch {}
  }

  function rectCircleCollide(rect, x, y, r) {
    const nx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
    const ny = Math.max(rect.y, Math.min(y, rect.y + rect.h));
    const dx = x - nx, dy = y - ny;
    return dx * dx + dy * dy < r * r;
  }

  function canMove(x, y) {
    if (x < 16 || y < 16 || x > WORLD.w - 16 || y > WORLD.h - 16) return false;
    for (const b of buildings) if (rectCircleCollide(b, x, y, player.r + (state.inCar ? 7 : 0))) return false;
    return true;
  }

  function update(dt) {
    if (!running || paused) return;
    state.elapsed += dt;
    if (state.elapsed > 145) { state.elapsed = 0; state.day += 1; }

    let dx = 0, dy = 0;
    if (keys.ArrowLeft || keys.KeyA) dx -= 1;
    if (keys.ArrowRight || keys.KeyD) dx += 1;
    if (keys.ArrowUp || keys.KeyW) dy -= 1;
    if (keys.ArrowDown || keys.KeyS) dy += 1;
    dx += touchMove.x; dy += touchMove.y;

    const len = Math.hypot(dx, dy) || 1;
    if (dx || dy) {
      dx /= len; dy /= len;
      const sprint = keys.ShiftLeft || keys.ShiftRight;
      let speed = state.inCar ? 330 : sprint ? 205 : 145;
      const nx = player.x + dx * speed * dt;
      const ny = player.y + dy * speed * dt;
      if (canMove(nx, player.y)) player.x = nx;
      if (canMove(player.x, ny)) player.y = ny;
      player.dir = Math.atan2(dy, dx);
      player.bob += dt * (state.inCar ? 12 : 8);
    }

    for (const p of pedestrians) {
      p.phase += dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 40 || p.x > WORLD.w - 40) p.vx *= -1;
      if (p.y < 40 || p.y > WORLD.h - 40) p.vy *= -1;
    }
    for (const c of traffic) {
      if (c.horizontal) {
        c.x += c.speed * c.dir * dt;
        if (c.x < -70) c.x = WORLD.w + 70;
        if (c.x > WORLD.w + 70) c.x = -70;
      } else {
        c.y += c.speed * c.dir * dt;
        if (c.y < -70) c.y = WORLD.h + 70;
        if (c.y > WORLD.h + 70) c.y = -70;
      }
    }

    camera.x += ((player.x - canvas._cssW / 2) - camera.x) * Math.min(1, dt * 7);
    camera.y += ((player.y - canvas._cssH / 2) - camera.y) * Math.min(1, dt * 7);
    camera.x = Math.max(0, Math.min(WORLD.w - canvas._cssW, camera.x));
    camera.y = Math.max(0, Math.min(WORLD.h - canvas._cssH, camera.y));

    detectInteraction();
    if (performance.now() - lastToast > 3300) toast.classList.remove('show');
    saveTicker += dt;
    if (saveTicker > 3) { saveTicker = 0; save(); }
  }
  let saveTicker = 0;

  function detectInteraction() {
    const targets = [office, closingOffice, ...properties];
    let closest = null, dist = 9999;
    for (const t of targets) {
      const d = Math.hypot(player.x - t.x, player.y - t.y);
      if (d < dist) { dist = d; closest = t; }
    }
    near = dist < (state.inCar ? 92 : 70) ? closest : null;
    if (near) {
      hint.textContent = near.type === 'property' ? `E / ACTION · ${near.label}` : `E / ACTION · ${near.label}`;
      hint.classList.add('show');
    } else {
      hint.classList.remove('show');
    }
  }

  function interact() {
    if (!running || paused || !near) return;
    sound(520, .07);

    if (near === office && state.mission === 0) {
      state.mission = 1;
      state.toured = [];
      showToast(`${currentClient().name} is ready`, `Budget: ${money(currentClient().budget)}. Tour three properties and build a shortlist.`);
      updateHUD(); save(); return;
    }

    if (near.type === 'property') {
      if (state.mission === 1) {
        if (!state.toured.includes(near.id)) {
          state.toured.push(near.id);
          const fit = Math.abs(near.price - currentClient().budget) < 125000 ? 'within range' : 'stretch';
          showToast(`Tour ${state.toured.length}/3 · ${near.label}`, `${money(near.price)} · ${near.style} · ${fit} · condition score ${near.score}/100`);
          addXP(18); state.rep += 1;
          if (state.toured.length >= 3) {
            state.mission = 2;
            showToast('Shortlist complete', 'Pick the property that best fits the client and prepare an offer.');
          }
          updateHUD(); save();
        } else showToast('Already toured', `${near.label} is already on your shortlist.`);
        return;
      }
      if (state.mission === 2) {
        if (!state.toured.includes(near.id)) {
          showToast('Not toured yet', 'Choose one of the three properties you toured.');
          return;
        }
        state.chosenProperty = near.id;
        state.mission = 3;
        openOffer(near);
        updateHUD(); save(); return;
      }
      if (state.mission === 3 && state.chosenProperty === near.id && !state.offerAccepted) {
        openOffer(near); return;
      }
    }

    if (near === closingOffice && (state.mission === 4 || (state.mission === 3 && state.offerAccepted))) {
      closeDeal();
    }
  }

  function openOffer(p) {
    paused = true;
    modal.classList.remove('hidden');
    dealTitle.textContent = `Negotiate · ${p.label}`;
    dealCopy.textContent = `${money(p.price)} asking · approx. ${money(p.repairs)} repairs · client budget ${money(currentClient().budget)}. Choose a strategy.`;
    const strategies = [
      { name: 'Aggressive', pct: .92, desc: 'Lower price, higher risk.' },
      { name: 'Market', pct: .975, desc: 'Balanced offer and terms.' },
      { name: 'Strong', pct: 1.015, desc: 'Higher acceptance odds.' }
    ];
    offerGrid.innerHTML = '';
    strategies.forEach(s => {
      const amount = Math.round(p.price * s.pct / 1000) * 1000;
      const b = document.createElement('button');
      b.className = 'offer-btn';
      b.innerHTML = `<b>${money(amount)}</b><strong>${s.name}</strong><span>${s.desc}</span>`;
      b.onclick = () => resolveOffer(p, s, amount);
      offerGrid.appendChild(b);
    });
  }

  function resolveOffer(p, strategy, amount) {
    const fitBonus = p.score / 100 * .18;
    const budgetPenalty = Math.max(0, amount - currentClient().budget) / Math.max(1, currentClient().budget) * .7;
    const base = strategy.name === 'Aggressive' ? .48 : strategy.name === 'Market' ? .70 : .84;
    const chance = Math.max(.22, Math.min(.96, base + fitBonus - budgetPenalty));
    const roll = Math.random();
    modal.classList.add('hidden'); paused = false;
    if (roll < chance) {
      state.offerAccepted = true;
      state.mission = 4;
      const savings = Math.max(0, p.price - amount);
      state.rep += strategy.name === 'Aggressive' ? 5 : 3;
      addXP(42);
      showToast('Offer accepted!', `${money(amount)} accepted${savings ? ` · ${money(savings)} below asking` : ''}. Head to closing.`);
      sound(660, .11); setTimeout(() => sound(850, .13), 110);
    } else {
      state.rep = Math.max(0, state.rep - 1);
      addXP(8);
      showToast('Seller countered', 'The offer did not land. Return to the property and adjust your strategy.');
    }
    updateHUD(); save();
  }

  function closeDeal() {
    const p = properties.find(x => x.id === state.chosenProperty);
    const commission = Math.round((p?.price || 300000) * .0125 / 100) * 100;
    state.cash += commission;
    state.deals += 1;
    state.rep += 12;
    addXP(95);
    showToast('Deal closed!', `Commission earned: ${money(commission)} · +12 reputation · next client unlocked.`);
    state.clientIndex = (state.clientIndex + 1) % clients.length;
    state.mission = 0;
    state.toured = [];
    state.chosenProperty = null;
    state.offerAccepted = false;
    updateHUD(); save();
  }

  function toggleCar() {
    if (!state.carUnlocked) {
      showToast('Lucky Mobile locked', 'Reach level 2 to unlock driving.');
      return;
    }
    state.inCar = !state.inCar;
    showToast(state.inCar ? 'Lucky Mobile active' : 'Back on foot', state.inCar ? 'Drive with WASD / arrows. Press R to exit.' : 'Explore properties on foot.');
    save();
  }

  function draw() {
    const w = canvas._cssW, h = canvas._cssH;
    ctx.fillStyle = '#1c2b20'; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(-camera.x, -camera.y);

    for (const n of neighborhoods) {
      ctx.fillStyle = n.tint; ctx.fillRect(n.x, n.y, n.w, n.h);
      ctx.fillStyle = 'rgba(255,255,255,.055)';
      ctx.font = '700 30px Inter, Arial';
      ctx.fillText(n.name.toUpperCase(), n.x + 42, n.y + 58);
    }

    for (let x = 0; x < WORLD.w; x += 42) {
      for (let y = 0; y < WORLD.h; y += 42) {
        if (((x + y) / 42) % 3 === 0) {
          ctx.fillStyle = 'rgba(131,167,119,.12)'; ctx.fillRect(x, y, 3, 3);
        }
      }
    }

    for (const r of roads) {
      ctx.fillStyle = '#45484b'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2; ctx.setLineDash([24, 18]);
      ctx.beginPath();
      if (r.w > r.h) { ctx.moveTo(r.x, r.y + r.h / 2); ctx.lineTo(r.x + r.w, r.y + r.h / 2); }
      else { ctx.moveTo(r.x + r.w / 2, r.y); ctx.lineTo(r.x + r.w / 2, r.y + r.h); }
      ctx.stroke(); ctx.setLineDash([]);
    }

    for (const b of buildings) drawBuilding(b);
    drawOffice(office, '#c49337');
    drawOffice(closingOffice, '#d8d8d8');
    for (const p of properties) drawProperty(p);
    for (const ped of pedestrians) drawPed(ped);
    for (const car of traffic) drawTraffic(car);
    drawPlayer();
    drawTargetArrow();
    ctx.restore();

    drawMinimap(w, h);
    drawDayNight(w, h);
  }

  function drawBuilding(b) {
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);
    ctx.fillStyle = b.shade; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#756957'; ctx.fillRect(b.x + b.w * .38, b.y + b.h - 28, 28, 28);
    ctx.fillStyle = '#4b5b60';
    for (let i = 0; i < b.windows; i++) {
      const wx = b.x + 16 + (i % 3) * 42;
      const wy = b.y + 18 + Math.floor(i / 3) * 34;
      if (wx + 22 < b.x + b.w) ctx.fillRect(wx, wy, 22, 18);
    }
  }

  function drawOffice(o, color) {
    ctx.beginPath(); ctx.arc(o.x, o.y, 30, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.fill();
    ctx.beginPath(); ctx.arc(o.x, o.y, 21, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = '900 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o === office ? 'SL' : '✓', o.x, o.y + 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    drawLabel(o.x, o.y - 42, o.label);
  }

  function drawProperty(p) {
    const toured = state.toured.includes(p.id);
    const selected = state.chosenProperty === p.id;
    ctx.beginPath(); ctx.arc(p.x, p.y, selected ? 25 : 20, 0, Math.PI * 2);
    ctx.fillStyle = selected ? '#f4ce6b' : toured ? '#8ee6a7' : '#f5f5f5'; ctx.fill();
    ctx.fillStyle = '#161616'; ctx.fillRect(p.x - 11, p.y - 4, 22, 14);
    ctx.beginPath(); ctx.moveTo(p.x - 14, p.y - 4); ctx.lineTo(p.x, p.y - 16); ctx.lineTo(p.x + 14, p.y - 4); ctx.closePath(); ctx.fill();
    if (Math.hypot(player.x - p.x, player.y - p.y) < 220) drawLabel(p.x, p.y - 36, `${p.label} · ${money(p.price)}`);
  }

  function drawPed(p) {
    ctx.beginPath(); ctx.arc(p.x, p.y - 9, 5, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
    ctx.fillStyle = '#25282d'; ctx.fillRect(p.x - 5, p.y - 3, 10, 15);
  }

  function drawTraffic(c) {
    ctx.save(); ctx.translate(c.x, c.y); if (!c.horizontal) ctx.rotate(Math.PI / 2);
    ctx.fillStyle = c.color; ctx.fillRect(-21, -10, 42, 20);
    ctx.fillStyle = '#111'; ctx.fillRect(-14, -13, 8, 4); ctx.fillRect(8, -13, 8, 4); ctx.fillRect(-14, 9, 8, 4); ctx.fillRect(8, 9, 8, 4);
    ctx.restore();
  }

  function drawPlayer() {
    ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.dir);
    if (state.inCar) {
      ctx.fillStyle = '#c49337'; ctx.fillRect(-27, -15, 54, 30);
      ctx.fillStyle = '#111'; ctx.fillRect(-13, -11, 25, 22);
      ctx.fillStyle = '#050505'; ctx.fillRect(-20, -19, 10, 5); ctx.fillRect(11, -19, 10, 5); ctx.fillRect(-20, 14, 10, 5); ctx.fillRect(11, 14, 10, 5);
      ctx.fillStyle = '#fff'; ctx.font = '900 10px Arial'; ctx.textAlign = 'center'; ctx.fillText('LUCKY', 0, 4);
    } else {
      const bob = Math.sin(player.bob) * 1.5;
      ctx.beginPath(); ctx.arc(0, -11 + bob, 8, 0, Math.PI * 2); ctx.fillStyle = '#6c3d29'; ctx.fill();
      ctx.fillStyle = '#0d0d10'; ctx.fillRect(-9, -3 + bob, 18, 22);
      ctx.fillStyle = '#f6f3ec'; ctx.fillRect(-5, 2 + bob, 10, 12);
      ctx.strokeStyle = '#c49337'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(7, 6 + bob); ctx.lineTo(17, 2 + bob); ctx.stroke();
    }
    ctx.restore();
    drawLabel(player.x, player.y + (state.inCar ? 34 : 32), state.inCar ? 'LUCKY MOBILE' : 'SHAYLA');
  }

  function drawLabel(x, y, text) {
    ctx.font = '800 11px Inter,Arial';
    const width = ctx.measureText(text).width + 16;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(x - width / 2, y - 14, width, 20);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(text, x, y); ctx.textAlign = 'left';
  }

  function drawTargetArrow() {
    const m = missions[Math.min(state.mission, missions.length - 1)]();
    let t = m.target;
    if (!t && state.mission === 1) {
      const untoured = properties.filter(p => !state.toured.includes(p.id));
      t = untoured.sort((a,b) => Math.hypot(player.x-a.x,player.y-a.y)-Math.hypot(player.x-b.x,player.y-b.y))[0];
    }
    if (!t && state.mission === 2) {
      const options = properties.filter(p => state.toured.includes(p.id));
      t = options.sort((a,b) => b.score-a.score)[0];
    }
    if (!t) return;
    const d = Math.hypot(player.x - t.x, player.y - t.y);
    if (d < 120) return;
    ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(Math.atan2(t.y-player.y,t.x-player.x));
    ctx.fillStyle = '#f1cc72'; ctx.beginPath(); ctx.moveTo(34,0);ctx.lineTo(18,-8);ctx.lineTo(18,8);ctx.closePath();ctx.fill(); ctx.restore();
  }

  function drawMinimap(w, h) {
    if (w < 760) return;
    const mw = 190, mh = 132, x = w - mw - 16, y = 150;
    ctx.fillStyle = 'rgba(0,0,0,.66)'; ctx.fillRect(x, y, mw, mh);
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.strokeRect(x, y, mw, mh);
    ctx.fillStyle = '#47514a';
    for (const r of roads) ctx.fillRect(x + r.x/WORLD.w*mw, y + r.y/WORLD.h*mh, Math.max(2,r.w/WORLD.w*mw), Math.max(2,r.h/WORLD.h*mh));
    for (const p of properties) { ctx.fillStyle = state.toured.includes(p.id) ? '#8ee6a7' : '#fff'; ctx.fillRect(x+p.x/WORLD.w*mw-2,y+p.y/WORLD.h*mh-2,4,4); }
    ctx.fillStyle = '#c49337'; ctx.beginPath();ctx.arc(x+player.x/WORLD.w*mw,y+player.y/WORLD.h*mh,4,0,Math.PI*2);ctx.fill();
  }

  function drawDayNight(w, h) {
    const cycle = (state.elapsed / 145) * Math.PI * 2;
    const darkness = Math.max(0, Math.sin(cycle - Math.PI/2) * .42);
    if (darkness > .02) { ctx.fillStyle = `rgba(11,18,44,${darkness})`; ctx.fillRect(0,0,w,h); }
    ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(14,h-54,128,34);
    ctx.fillStyle='#fff';ctx.font='800 11px Inter,Arial';ctx.fillText(`DAY ${state.day} · ${darkness>.2?'NIGHT':'DAYLIGHT'}`,26,h-33);
  }

  function loop(t) {
    now = t;
    const dt = Math.min(.033, (t - last) / 1000 || 0); last = t;
    update(dt); draw(); requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyE' || e.code === 'Space') interact();
    if (e.code === 'KeyR') toggleCar();
    if (e.code === 'Escape' && running) togglePause();
  });
  addEventListener('keyup', e => keys[e.code] = false);

  document.getElementById('playBtn').onclick = () => {
    start.classList.add('hidden'); running = true; paused = false; last = performance.now(); updateHUD(); sound(480,.08); setTimeout(()=>sound(640,.1),90);
  };
  document.getElementById('resetBtn').onclick = () => { resetGame(); start.classList.add('hidden'); running = true; paused = false; };
  document.getElementById('pauseBtn').onclick = togglePause;
  document.getElementById('resumeBtn').onclick = togglePause;
  document.getElementById('restartBtn').onclick = () => { resetGame(); pauseModal.classList.add('hidden'); paused=false; };
  document.getElementById('actionBtn').addEventListener('pointerdown', e => { e.preventDefault(); interact(); });
  document.getElementById('carBtn').addEventListener('pointerdown', e => { e.preventDefault(); toggleCar(); });

  function togglePause() {
    paused = !paused;
    pauseModal.classList.toggle('hidden', !paused);
  }

  const touchMove = { x: 0, y: 0 };
  const stick = document.getElementById('stick');
  const knob = document.getElementById('knob');
  let stickPointer = null;
  function moveStick(e) {
    const r = stick.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width/2), dy = e.clientY - (r.top + r.height/2);
    const max = 38, d = Math.hypot(dx,dy) || 1;
    if (d > max) { dx = dx/d*max; dy = dy/d*max; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    touchMove.x = dx/max; touchMove.y = dy/max;
  }
  stick.addEventListener('pointerdown', e => { stickPointer=e.pointerId; stick.setPointerCapture(e.pointerId); moveStick(e); });
  stick.addEventListener('pointermove', e => { if (e.pointerId===stickPointer) moveStick(e); });
  function endStick(e){ if(e.pointerId===stickPointer){stickPointer=null;touchMove.x=touchMove.y=0;knob.style.transform='translate(0,0)';} }
  stick.addEventListener('pointerup',endStick); stick.addEventListener('pointercancel',endStick);

  updateHUD();
})();