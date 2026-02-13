const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const promptInput = document.getElementById("prompt");
const manifestEl = document.getElementById("manifest");
const generateBtn = document.getElementById("generateBtn");

const keys = {};
const gravity = 0.5;
const floorY = canvas.height - 90;

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
}

function pick(arr, seed) {
  return arr[seed % arr.length];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function generateFighterFromPrompt(prompt) {
  const source = prompt.trim() || "mysterious arena warrior";
  const seed = hashString(source.toLowerCase());

  const style = {
    bodyColor: `hsl(${seed % 360} 72% 52%)`,
    trimColor: `hsl(${(seed + 110) % 360} 80% 60%)`,
    auraColor: `hsl(${(seed + 220) % 360} 92% 68%)`,
    eyeColor: pick(["#fff", "#ffe56f", "#87ffe6", "#ffd6f7"], seed),
    silhouette: pick(["lean", "balanced", "bulky"], seed >> 1),
  };

  const stats = {
    speed: clamp(2 + ((seed >> 4) % 5), 2, 6),
    jump: clamp(9 + ((seed >> 9) % 6), 8, 14),
    power: clamp(5 + ((seed >> 14) % 6), 5, 10),
    weight: clamp(2 + ((seed >> 19) % 5), 2, 6),
  };

  const animations = {
    idleFrames: 8,
    runFrames: 10,
    jumpFrames: 6,
    lightAttackFrames: 7,
    heavyAttackFrames: 11,
  };

  const generated = {
    name: `${pick(["Neo", "Arc", "Volt", "Drift", "Astra"], seed)} ${pick(
      ["Striker", "Specter", "Breaker", "Vanguard", "Monk"],
      seed >> 2,
    )}`,
    sourcePrompt: source,
    seed,
    style,
    stats,
    animations,
    aiSummary:
      "Prompt interpreted into deterministic fighter DNA (colors, silhouette, and animation timing).",
  };

  return generated;
}

function createFighter({ x, facing = 1, data, isPlayer = false }) {
  return {
    x,
    y: floorY,
    w: 52,
    h: 100,
    vx: 0,
    vy: 0,
    facing,
    grounded: true,
    hp: 100,
    attackTime: 0,
    attackType: null,
    frame: 0,
    data,
    isPlayer,
    aiTimer: 0,
  };
}

let generatedData = generateFighterFromPrompt("cyber ninja with teal scarf and acrobatic kicks");
let player = createFighter({ x: 210, data: generatedData, isPlayer: true, facing: 1 });
const enemyData = {
  name: "Training Bot",
  style: { bodyColor: "#ec5f67", trimColor: "#ffe48f", auraColor: "#ff8fa3", eyeColor: "#fff" },
  stats: { speed: 3, jump: 10, power: 6, weight: 4 },
};
let enemy = createFighter({ x: canvas.width - 220, data: enemyData, facing: -1 });

function startAttack(fighter, type) {
  if (fighter.attackTime > 0) return;
  fighter.attackType = type;
  fighter.attackTime = type === "heavy" ? 26 : 16;
}

function getHitbox(fighter) {
  if (fighter.attackTime <= 0) return null;
  const reach = fighter.attackType === "heavy" ? 46 : 30;
  return {
    x: fighter.x + fighter.facing * (fighter.w / 2 + reach / 2),
    y: fighter.y - fighter.h * 0.7,
    w: reach,
    h: 28,
  };
}

function intersects(a, b) {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
}

function fighterBounds(fighter) {
  return { x: fighter.x, y: fighter.y - fighter.h / 2, w: fighter.w, h: fighter.h };
}

function updatePlayer() {
  const speed = player.data.stats.speed;
  player.vx = 0;
  if (keys.KeyA) {
    player.vx = -speed;
    player.facing = -1;
  }
  if (keys.KeyD) {
    player.vx = speed;
    player.facing = 1;
  }

  if (keys.KeyW && player.grounded) {
    player.vy = -player.data.stats.jump;
    player.grounded = false;
  }

  if (keys.KeyJ) startAttack(player, "light");
  if (keys.KeyK) startAttack(player, "heavy");
}

function updateEnemy() {
  enemy.aiTimer -= 1;
  const distance = player.x - enemy.x;
  enemy.facing = distance >= 0 ? 1 : -1;

  if (Math.abs(distance) > 120) {
    enemy.vx = enemy.facing * enemy.data.stats.speed * 0.9;
  } else {
    enemy.vx = 0;
    if (enemy.aiTimer <= 0) {
      startAttack(enemy, Math.random() < 0.3 ? "heavy" : "light");
      enemy.aiTimer = 45 + Math.random() * 30;
    }
  }

  if (Math.random() < 0.004 && enemy.grounded) {
    enemy.vy = -enemy.data.stats.jump;
    enemy.grounded = false;
  }
}

function applyPhysics(fighter) {
  fighter.vy += gravity;
  fighter.x += fighter.vx;
  fighter.y += fighter.vy;

  fighter.x = clamp(fighter.x, 30, canvas.width - 30);
  if (fighter.y >= floorY) {
    fighter.y = floorY;
    fighter.vy = 0;
    fighter.grounded = true;
  }

  fighter.frame += 0.25 + Math.abs(fighter.vx) * 0.09;

  if (fighter.attackTime > 0) {
    fighter.attackTime -= 1;
    if (fighter.attackTime <= 0) {
      fighter.attackType = null;
    }
  }
}

function resolveHit(attacker, defender) {
  const hitbox = getHitbox(attacker);
  if (!hitbox) return;
  if (attacker.attackTime > (attacker.attackType === "heavy" ? 15 : 9)) return;

  if (intersects(hitbox, fighterBounds(defender))) {
    const damage = attacker.attackType === "heavy" ? 14 : 7;
    defender.hp = clamp(defender.hp - damage, 0, 100);
    defender.vx += attacker.facing * (attacker.attackType === "heavy" ? 5 : 3);
    attacker.attackTime = 0;
    attacker.attackType = null;
  }
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#7dd6ff");
  g.addColorStop(0.65, "#7fb6ff");
  g.addColorStop(1, "#8f7dff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#4567a4";
  ctx.fillRect(0, floorY + 10, canvas.width, canvas.height - floorY);

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  for (let i = 0; i < 7; i += 1) {
    ctx.beginPath();
    ctx.ellipse(130 + i * 135, 70 + (i % 2) * 35, 45, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFighter(fighter) {
  const { style } = fighter.data;
  const bob = Math.sin(fighter.frame) * 2;

  ctx.save();
  ctx.translate(fighter.x, fighter.y + bob);
  ctx.scale(fighter.facing, 1);

  ctx.fillStyle = `${style.auraColor}55`;
  ctx.beginPath();
  ctx.ellipse(0, -64, 44 + Math.sin(fighter.frame * 0.6) * 5, 52, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = style.bodyColor;
  ctx.fillRect(-16, -85, 32, 50);

  ctx.fillStyle = style.trimColor;
  ctx.fillRect(-14, -34, 28, 34);

  ctx.fillStyle = style.bodyColor;
  const armPunch = fighter.attackType ? 22 : Math.sin(fighter.frame) * 6;
  ctx.fillRect(16, -78, 16 + armPunch, 10);
  ctx.fillRect(-32, -78, 16, 10);

  ctx.fillStyle = style.trimColor;
  ctx.fillRect(-14, 0, 10, 26);
  ctx.fillRect(4, 0, 10, 26);

  ctx.fillStyle = style.eyeColor;
  ctx.fillRect(6, -72, 6, 4);

  const hitbox = getHitbox(fighter);
  if (hitbox) {
    ctx.restore();
    ctx.fillStyle = "rgba(255,220,140,0.45)";
    ctx.fillRect(hitbox.x - hitbox.w / 2, hitbox.y - hitbox.h / 2, hitbox.w, hitbox.h);
    return;
  }

  ctx.restore();
}

function drawHud() {
  const barW = 300;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(30, 24, barW, 24);
  ctx.fillRect(canvas.width - 30 - barW, 24, barW, 24);

  ctx.fillStyle = "#64ff8b";
  ctx.fillRect(30, 24, (barW * player.hp) / 100, 24);

  ctx.fillStyle = "#ff5f7b";
  const enemyW = (barW * enemy.hp) / 100;
  ctx.fillRect(canvas.width - 30 - enemyW, 24, enemyW, 24);

  ctx.fillStyle = "white";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(player.data.name, 30, 18);
  ctx.textAlign = "right";
  ctx.fillText(enemy.data.name, canvas.width - 30, 18);
  ctx.textAlign = "left";

  if (player.hp <= 0 || enemy.hp <= 0) {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 52px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(player.hp > 0 ? "YOU WIN" : "YOU LOSE", canvas.width / 2, canvas.height / 2);
    ctx.font = "18px sans-serif";
    ctx.fillText("Press Generate Fighter to reset with a new AI character", canvas.width / 2, canvas.height / 2 + 36);
    ctx.textAlign = "left";
  }
}

function updateManifest() {
  manifestEl.textContent = JSON.stringify(generatedData, null, 2);
}

function resetFight() {
  player = createFighter({ x: 210, data: generatedData, isPlayer: true, facing: 1 });
  enemy = createFighter({ x: canvas.width - 220, data: enemyData, facing: -1 });
}

function loop() {
  drawBackground();

  if (player.hp > 0 && enemy.hp > 0) {
    updatePlayer();
    updateEnemy();

    applyPhysics(player);
    applyPhysics(enemy);

    resolveHit(player, enemy);
    resolveHit(enemy, player);
  }

  drawFighter(player);
  drawFighter(enemy);
  drawHud();
  requestAnimationFrame(loop);
}

generateBtn.addEventListener("click", () => {
  generatedData = generateFighterFromPrompt(promptInput.value);
  updateManifest();
  resetFight();
});

window.addEventListener("keydown", (event) => {
  keys[event.code] = true;
});
window.addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

updateManifest();
loop();
