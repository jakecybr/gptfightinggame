const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");

const manifestEl = document.getElementById("manifest");
const playerPromptEl = document.getElementById("playerPrompt");
const enemyPromptEl = document.getElementById("enemyPrompt");
const generateBtn = document.getElementById("generateBtn");
const randomBtn = document.getElementById("randomBtn");
const resetBtn = document.getElementById("resetBtn");
const pauseBtn = document.getElementById("pauseBtn");
const assistAimEl = document.getElementById("assistAim");
const showHitboxesEl = document.getElementById("showHitboxes");
const botDifficultyEl = document.getElementById("botDifficulty");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");

const keys = {};
const floorY = canvas.height - 112;
const gravity = 0.56;
const particlePool = [];

let pause = false;
let screenShake = 0;
let stageTheme = null;
let combatTimer = 99;
let timerTick = 0;
let round = 1;
const wins = { player: 0, enemy: 0 };

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
}

function pick(items, seed) {
  return items[seed % items.length];
}

function seeded(seed, index, min = 0, max = 1) {
  const x = Math.sin(seed * 0.0017 + index * 77.39) * 43758.5453;
  const t = x - Math.floor(x);
  return min + (max - min) * t;
}

function keywordScore(prompt, words) {
  const lower = prompt.toLowerCase();
  return words.reduce((score, word) => score + (lower.includes(word) ? 1 : 0), 0);
}

function generateFighterFromPrompt(prompt, side = "player") {
  const sourcePrompt = prompt.trim() || `${side} arena warrior`;
  const seed = hashString(sourcePrompt + side);

  const speedBias = keywordScore(sourcePrompt, ["fast", "speed", "quick", "ninja", "dash", "agile"]);
  const powerBias = keywordScore(sourcePrompt, ["heavy", "tank", "golem", "brute", "hammer", "power"]);
  const magicBias = keywordScore(sourcePrompt, ["arcane", "plasma", "fire", "ice", "lightning", "void"]);
  const defenseBias = keywordScore(sourcePrompt, ["shield", "defense", "armor", "stone", "robot"]);

  const stats = {
    speed: clamp(3 + speedBias + Math.round(seeded(seed, 2, 0, 2)), 2, 10),
    jump: clamp(8 + speedBias + magicBias + Math.round(seeded(seed, 3, 0, 4)), 7, 16),
    power: clamp(4 + powerBias + Math.round(seeded(seed, 4, 0, 5)), 3, 12),
    defense: clamp(3 + defenseBias + Math.round(seeded(seed, 5, 0, 5)), 2, 12),
    special: clamp(4 + magicBias + Math.round(seeded(seed, 6, 0, 4)), 3, 12),
  };

  const style = {
    body: `hsl(${seed % 360} 78% 54%)`,
    trim: `hsl(${(seed + 90) % 360} 80% 62%)`,
    glow: `hsl(${(seed + 160) % 360} 92% 68%)`,
    accent: `hsl(${(seed + 235) % 360} 88% 72%)`,
    eye: pick(["#ffffff", "#fff1a8", "#b6ffe9", "#ffd5f7"], seed >> 2),
    shape: pick(["lean", "balanced", "heavy"], seed >> 5),
    headgear: pick(["horns", "hood", "visor", "crown", "none"], seed >> 8),
    weapon: pick(["blade", "gauntlet", "staff", "chakram", "whip"], seed >> 11),
  };

  const animation = {
    idleFrames: 10,
    runFrames: 12,
    jumpFrames: 8,
    lightFrames: 6,
    heavyFrames: 12,
    specialFrames: 18,
  };

  return {
    name: `${pick(["Nova", "Volt", "Rift", "Astra", "Kairo", "Zeta"], seed)} ${pick(["Striker", "Monk", "Breaker", "Warden", "Specter"], seed >> 1)}`,
    sourcePrompt,
    seed,
    stats,
    style,
    animation,
    aiInterpretation: {
      archetype: speedBias > powerBias ? "rushdown" : powerBias > speedBias ? "bruiser" : "balanced",
      styleNotes: `Generated from keywords with ${style.weapon} weapon and ${style.headgear} motif.`,
      confidence: `${88 + ((seed >> 4) % 12)}%`,
    },
  };
}

function generateStageFromSeeds(a, b) {
  const seed = a ^ (b << 1);
  return {
    skyTop: `hsl(${seed % 360} 75% 66%)`,
    skyBottom: `hsl(${(seed + 45) % 360} 72% 58%)`,
    floor: `hsl(${(seed + 220) % 360} 35% 40%)`,
    mountain: `hsl(${(seed + 260) % 360} 36% 30%)`,
    energy: `hsl(${(seed + 130) % 360} 95% 70%)`,
  };
}

function makeFighter(data, x, side) {
  return {
    ...data,
    side,
    x,
    y: floorY,
    vx: 0,
    vy: 0,
    w: data.style.shape === "heavy" ? 64 : 54,
    h: data.style.shape === "lean" ? 102 : 110,
    grounded: true,
    hp: 100,
    superMeter: 0,
    facing: side === "player" ? 1 : -1,
    actionTimer: 0,
    action: "idle",
    frame: 0,
    hurtFlash: 0,
    invuln: 0,
    roundsWon: 0,
  };
}

let playerPrompt = "plasma samurai fox with neon jacket and fast aerial combos";
let enemyPrompt = "stone golem boxer with heavy punches and high defense";
playerPromptEl.value = playerPrompt;
enemyPromptEl.value = enemyPrompt;

let player = makeFighter(generateFighterFromPrompt(playerPrompt, "player"), 270, "player");
let enemy = makeFighter(generateFighterFromPrompt(enemyPrompt, "enemy"), canvas.width - 270, "enemy");
stageTheme = generateStageFromSeeds(player.seed, enemy.seed);

function spawnParticles(x, y, color, amount, force = 1) {
  for (let i = 0; i < amount; i += 1) {
    particlePool.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 8 * force,
      vy: (Math.random() - 0.6) * 7 * force,
      life: 24 + Math.random() * 18,
      color,
      r: 2 + Math.random() * 3,
    });
  }
}

function resetRound(fullReset = false) {
  player.x = 270;
  enemy.x = canvas.width - 270;
  player.y = floorY;
  enemy.y = floorY;
  player.vx = 0;
  enemy.vx = 0;
  player.vy = 0;
  enemy.vy = 0;
  player.hp = fullReset ? 100 : clamp(player.hp + 25, 1, 100);
  enemy.hp = fullReset ? 100 : clamp(enemy.hp + 25, 1, 100);
  player.superMeter = fullReset ? 0 : player.superMeter;
  enemy.superMeter = fullReset ? 0 : enemy.superMeter;
  player.action = "idle";
  enemy.action = "idle";
  player.actionTimer = 0;
  enemy.actionTimer = 0;
  combatTimer = 99;
  pause = false;
  particlePool.length = 0;
}

function resetMatchFromPrompts() {
  playerPrompt = playerPromptEl.value;
  enemyPrompt = enemyPromptEl.value;
  player = makeFighter(generateFighterFromPrompt(playerPrompt, "player"), 270, "player");
  enemy = makeFighter(generateFighterFromPrompt(enemyPrompt, "enemy"), canvas.width - 270, "enemy");
  stageTheme = generateStageFromSeeds(player.seed, enemy.seed);
  wins.player = 0;
  wins.enemy = 0;
  round = 1;
  resetRound(true);
  renderManifest();
}

function randomPrompt() {
  const adjectives = ["neon", "cyber", "arcane", "shadow", "celestial", "lava", "electric"];
  const species = ["fox", "dragon", "robot", "ninja", "golem", "samurai", "witch"];
  const styles = ["fast aerial combos", "heavy slam attacks", "defensive counter style", "long range magic pokes", "dash-in mixups"];
  return `${pick(adjectives, (Math.random() * 999) | 0)} ${pick(species, (Math.random() * 999) | 0)} with ${pick(styles, (Math.random() * 999) | 0)}`;
}

function tryAction(fighter, action) {
  if (fighter.actionTimer > 0 && fighter.action !== "block") return;
  if (action === "light") {
    fighter.action = "light";
    fighter.actionTimer = 15;
  }
  if (action === "heavy") {
    fighter.action = "heavy";
    fighter.actionTimer = 24;
  }
  if (action === "special" && fighter.superMeter >= 35) {
    fighter.action = "special";
    fighter.actionTimer = 34;
    fighter.superMeter -= 35;
    spawnParticles(fighter.x + fighter.facing * 22, fighter.y - 70, fighter.style.glow, 24, 1.6);
  }
}

function getAttackBox(fighter) {
  if (!["light", "heavy", "special"].includes(fighter.action)) return null;
  const mult = fighter.action === "light" ? 1 : fighter.action === "heavy" ? 1.4 : 2;
  return {
    x: fighter.x + fighter.facing * (fighter.w / 2 + 28 * mult),
    y: fighter.y - fighter.h * 0.68,
    w: 34 * mult,
    h: 30 * mult,
  };
}

function bodyBox(f) {
  return { x: f.x, y: f.y - f.h / 2, w: f.w, h: f.h };
}

function intersects(a, b) {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
}

function updatePlayerControl() {
  const speed = 1.6 + player.stats.speed * 0.55;
  player.vx = 0;
  if (keys.KeyA) {
    player.vx = -speed;
    player.facing = -1;
  }
  if (keys.KeyD) {
    player.vx = speed;
    player.facing = 1;
  }
  if (assistAimEl.checked && Math.abs(player.x - enemy.x) < 145 && !keys.KeyA && !keys.KeyD) {
    player.facing = player.x < enemy.x ? 1 : -1;
  }

  if (keys.KeyW && player.grounded) {
    player.vy = -(8 + player.stats.jump * 0.52);
    player.grounded = false;
    spawnParticles(player.x, floorY, player.style.trim, 12);
  }

  if (keys.ShiftLeft || keys.ShiftRight) {
    player.action = "block";
  } else if (player.action === "block" && player.actionTimer <= 0) {
    player.action = "idle";
  }

  if (keys.KeyJ) tryAction(player, "light");
  if (keys.KeyK) tryAction(player, "heavy");
  if (keys.KeyL) tryAction(player, "special");
}

function updateEnemyAI() {
  const difficulty = Number(botDifficultyEl.value);
  const desiredDist = 110 + (10 - difficulty) * 9;
  const dx = player.x - enemy.x;
  enemy.facing = dx >= 0 ? 1 : -1;

  const speed = (1.2 + enemy.stats.speed * 0.48) * (0.75 + difficulty * 0.06);
  if (Math.abs(dx) > desiredDist) {
    enemy.vx = enemy.facing * speed;
  } else {
    enemy.vx = (Math.random() - 0.5) * 1.2;
  }

  const attackChance = 0.006 + difficulty * 0.0025;
  if (Math.random() < attackChance) {
    const pickAction = Math.random();
    if (pickAction < 0.5) tryAction(enemy, "light");
    else if (pickAction < 0.82) tryAction(enemy, "heavy");
    else tryAction(enemy, "special");
  }

  if (Math.random() < 0.002 + difficulty * 0.0006 && enemy.grounded) {
    enemy.vy = -(8 + enemy.stats.jump * 0.5);
    enemy.grounded = false;
  }

  if (Math.random() < 0.004 && player.action !== "idle") enemy.action = "block";
  if (enemy.action === "block" && Math.random() < 0.06) enemy.action = "idle";
}

function updatePhysics(f) {
  f.vy += gravity;
  f.x += f.vx;
  f.y += f.vy;

  f.x = clamp(f.x, 40, canvas.width - 40);
  if (f.y >= floorY) {
    f.y = floorY;
    f.vy = 0;
    if (!f.grounded) spawnParticles(f.x, floorY, f.style.trim, 8);
    f.grounded = true;
  }

  f.frame += 0.2 + Math.abs(f.vx) * 0.08;

  if (f.actionTimer > 0) f.actionTimer -= 1;
  if (f.actionTimer <= 0 && ["light", "heavy", "special", "hit"].includes(f.action)) {
    f.action = "idle";
  }

  if (f.invuln > 0) f.invuln -= 1;
  if (f.hurtFlash > 0) f.hurtFlash -= 1;
}

function applyHit(attacker, defender) {
  if (attacker.actionTimer <= 0 || defender.invuln > 0) return;
  if (!["light", "heavy", "special"].includes(attacker.action)) return;

  const startup = attacker.action === "light" ? 8 : attacker.action === "heavy" ? 14 : 20;
  if (attacker.actionTimer > startup) return;

  const atk = getAttackBox(attacker);
  if (!atk || !intersects(atk, bodyBox(defender))) return;

  const baseDamage = attacker.action === "light" ? 6 : attacker.action === "heavy" ? 11 : 16;
  const defense = defender.stats.defense * 0.45;
  const raw = baseDamage + attacker.stats.power * 0.7 - defense;
  let damage = clamp(Math.round(raw), 2, 24);

  const blocked = defender.action === "block" && defender.facing !== attacker.facing;
  if (blocked) damage = Math.floor(damage * 0.35);

  defender.hp = clamp(defender.hp - damage, 0, 100);
  defender.superMeter = clamp(defender.superMeter + 5 + damage * 0.55, 0, 100);
  attacker.superMeter = clamp(attacker.superMeter + 4 + damage * 0.45, 0, 100);

  const knock = attacker.action === "special" ? 8 : attacker.action === "heavy" ? 5.5 : 3;
  defender.vx += attacker.facing * knock;
  defender.vy -= attacker.action === "special" ? 2.4 : 1.2;
  defender.hurtFlash = 6;
  defender.invuln = 10;
  defender.action = blocked ? "block" : "hit";
  defender.actionTimer = blocked ? 6 : 10;

  spawnParticles(defender.x, defender.y - defender.h * 0.65, blocked ? "#a7ecff" : "#ffd4a8", blocked ? 9 : 16, attacker.action === "special" ? 1.4 : 1);
  screenShake = Math.max(screenShake, attacker.action === "special" ? 10 : attacker.action === "heavy" ? 6 : 3);

  attacker.actionTimer = 0;
  attacker.action = "idle";
}

function handleRoundEnd() {
  if (player.hp > 0 && enemy.hp > 0 && combatTimer > 0) return;

  let winner = null;
  if (player.hp === enemy.hp) winner = combatTimer === 0 ? "draw" : null;
  else winner = player.hp > enemy.hp ? "player" : "enemy";

  if (winner === "player") wins.player += 1;
  if (winner === "enemy") wins.enemy += 1;

  round += 1;
  if (wins.player >= 2 || wins.enemy >= 2) {
    pause = true;
  } else {
    resetRound(false);
  }
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, stageTheme.skyTop);
  g.addColorStop(0.66, stageTheme.skyBottom);
  g.addColorStop(1, "#8d7fe8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = `${stageTheme.mountain}bb`;
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    const x = i * 180 - 20;
    ctx.moveTo(x, floorY + 10);
    ctx.lineTo(x + 120, 220 + (i % 3) * 70);
    ctx.lineTo(x + 240, floorY + 10);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = stageTheme.floor;
  ctx.fillRect(0, floorY + 10, canvas.width, canvas.height - floorY);

  ctx.strokeStyle = `${stageTheme.energy}66`;
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i += 1) {
    ctx.beginPath();
    ctx.arc(120 + i * 220, floorY + 20, 30 + (i % 3) * 10, 0, Math.PI, true);
    ctx.stroke();
  }
}

function drawFighter(f) {
  const bob = Math.sin(f.frame * 0.9) * 2;
  const atkStretch = f.action === "heavy" ? 1.2 : f.action === "special" ? 1.35 : 1;
  const alpha = f.hurtFlash > 0 ? 0.78 : 1;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(f.x, f.y + bob);
  ctx.scale(f.facing, 1);

  ctx.fillStyle = `${f.style.glow}66`;
  ctx.beginPath();
  ctx.ellipse(0, -72, 45 + Math.sin(f.frame) * 3, 54 + Math.sin(f.frame * 0.8) * 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = f.style.body;
  ctx.fillRect(-f.w * 0.26, -f.h * 0.9, f.w * 0.52, f.h * 0.44);

  ctx.fillStyle = f.style.trim;
  ctx.fillRect(-f.w * 0.22, -f.h * 0.46, f.w * 0.44, f.h * 0.34);

  ctx.fillStyle = f.style.body;
  ctx.fillRect(f.w * 0.2, -f.h * 0.82, f.w * 0.26 * atkStretch, f.h * 0.11);
  ctx.fillRect(-f.w * 0.46, -f.h * 0.82, f.w * 0.26, f.h * 0.11);

  ctx.fillStyle = f.style.accent;
  ctx.fillRect(-f.w * 0.2, -f.h * 0.12, f.w * 0.16, f.h * 0.23);
  ctx.fillRect(f.w * 0.04, -f.h * 0.12, f.w * 0.16, f.h * 0.23);

  if (f.style.headgear !== "none") {
    ctx.fillStyle = f.style.accent;
    ctx.fillRect(-f.w * 0.18, -f.h * 0.99, f.w * 0.36, f.h * 0.08);
  }

  ctx.fillStyle = f.style.eye;
  ctx.fillRect(f.w * 0.06, -f.h * 0.78, f.w * 0.1, 4);

  ctx.restore();

  if (showHitboxesEl.checked) {
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    const b = bodyBox(f);
    ctx.strokeRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    const hit = getAttackBox(f);
    if (hit) {
      ctx.fillStyle = "rgba(255,180,80,0.35)";
      ctx.fillRect(hit.x - hit.w / 2, hit.y - hit.h / 2, hit.w, hit.h);
    }
  }
}

function drawParticles() {
  for (let i = particlePool.length - 1; i >= 0; i -= 1) {
    const p = particlePool[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.16;
    p.life -= 1;
    if (p.life <= 0) {
      particlePool.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = p.life / 42;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawBar(x, y, value, color, label, right = false) {
  const w = 360;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x, y, w, 23);
  const fill = (w * value) / 100;
  ctx.fillStyle = color;
  ctx.fillRect(right ? x + (w - fill) : x, y, fill, 23);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = right ? "right" : "left";
  ctx.fillText(label, right ? x + w : x, y - 6);
}

function drawHud() {
  drawBar(32, 26, player.hp, "#4df58d", `${player.name}  R:${wins.player}`);
  drawBar(canvas.width - 392, 26, enemy.hp, "#ff6386", `${enemy.name}  R:${wins.enemy}`, true);

  drawBar(32, 56, player.superMeter, "#5bd4ff", "SUPER");
  drawBar(canvas.width - 392, 56, enemy.superMeter, "#8ca4ff", "SUPER", true);

  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(canvas.width / 2 - 58, 22, 116, 42);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 33px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(combatTimer).padStart(2, "0"), canvas.width / 2, 53);

  ctx.font = "bold 18px sans-serif";
  ctx.fillText(`Round ${round}`, canvas.width / 2, 82);
  ctx.textAlign = "left";

  if (wins.player >= 2 || wins.enemy >= 2) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 56px sans-serif";
    ctx.fillText(wins.player > wins.enemy ? "PLAYER VICTORY" : "ENEMY VICTORY", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "20px sans-serif";
    ctx.fillText("Generate fighters or Reset Match to play again", canvas.width / 2, canvas.height / 2 + 25);
    ctx.textAlign = "left";
  }

  if (pause && wins.player < 2 && wins.enemy < 2) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
    ctx.textAlign = "left";
  }
}

function renderManifest() {
  manifestEl.textContent = JSON.stringify(
    {
      stageTheme,
      config: {
        aimAssist: assistAimEl.checked,
        showHitboxes: showHitboxesEl.checked,
        botDifficulty: Number(botDifficultyEl.value),
      },
      player,
      enemy,
      wins,
      round,
    },
    null,
    2,
  );
}

function exportState() {
  const payload = {
    playerPrompt: playerPromptEl.value,
    enemyPrompt: enemyPromptEl.value,
    playerData: generateFighterFromPrompt(playerPromptEl.value, "player"),
    enemyData: generateFighterFromPrompt(enemyPromptEl.value, "enemy"),
    settings: {
      aimAssist: assistAimEl.checked,
      showHitboxes: showHitboxesEl.checked,
      botDifficulty: Number(botDifficultyEl.value),
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `fighter-forge-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importState(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      playerPromptEl.value = data.playerPrompt || playerPromptEl.value;
      enemyPromptEl.value = data.enemyPrompt || enemyPromptEl.value;
      if (data.settings) {
        assistAimEl.checked = Boolean(data.settings.aimAssist);
        showHitboxesEl.checked = Boolean(data.settings.showHitboxes);
        botDifficultyEl.value = String(clamp(Number(data.settings.botDifficulty || 6), 1, 10));
      }
      resetMatchFromPrompts();
    } catch {
      alert("Invalid JSON file.");
    }
  };
  reader.readAsText(file);
}

function updateGame() {
  if (pause) return;
  if (wins.player >= 2 || wins.enemy >= 2) return;

  updatePlayerControl();
  updateEnemyAI();

  updatePhysics(player);
  updatePhysics(enemy);

  applyHit(player, enemy);
  applyHit(enemy, player);

  timerTick += 1;
  if (timerTick >= 60) {
    timerTick = 0;
    combatTimer = clamp(combatTimer - 1, 0, 99);
  }

  handleRoundEnd();
}

function render() {
  ctx.save();
  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    screenShake *= 0.86;
  }

  drawBackground();
  drawFighter(player);
  drawFighter(enemy);
  drawParticles();
  drawHud();

  ctx.restore();
}

function tick() {
  updateGame();
  render();
  if ((performance.now() | 0) % 21 === 0) renderManifest();
  requestAnimationFrame(tick);
}

generateBtn.addEventListener("click", resetMatchFromPrompts);
resetBtn.addEventListener("click", () => {
  wins.player = 0;
  wins.enemy = 0;
  round = 1;
  resetRound(true);
  renderManifest();
});
randomBtn.addEventListener("click", () => {
  playerPromptEl.value = randomPrompt();
  enemyPromptEl.value = randomPrompt();
  resetMatchFromPrompts();
});
pauseBtn.addEventListener("click", () => {
  pause = !pause;
  pauseBtn.textContent = pause ? "Resume" : "Pause";
});
exportBtn.addEventListener("click", exportState);
importInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importState(file);
});

window.addEventListener("keydown", (event) => {
  keys[event.code] = true;
});
window.addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

renderManifest();
tick();
