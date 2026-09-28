// DOM과 독립된 규칙. 렌더러와 node:test가 같은 판정 코드를 사용한다.
const MiniGameRules = (() => {
  const DUNGEON_HEALTH = 10;
  const DUNGEON_FLOORS = 10;
  const TREASURE_PER_SHARD = 100;

  function dungeonCards(floor, random = Math.random) {
    const danger = 1 + Math.floor((floor - 1) / 3);
    const roll = (n) => Math.floor(random() * n);
    const cards = [
      { type: "monster", damage: danger + 1 + roll(2), loot: 25 + floor * 4, heal: 0 },
      { type: "treasure", damage: danger + roll(2), loot: 12 + floor * 3, heal: 0 },
      random() < 0.6
        ? { type: "heal", damage: 0, loot: 0, heal: 2 + roll(3) }
        : { type: "monster", damage: danger + 2, loot: 40 + floor * 4, heal: 0 },
    ];
    for (let i = cards.length - 1; i > 0; i--) {
      const j = roll(i + 1);
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  function newDungeon(random = Math.random) {
    return {
      floor: 1, health: DUNGEON_HEALTH, treasure: 0, status: "playing",
      cards: dungeonCards(1, random),
    };
  }

  function chooseDungeonCard(state, index, random = Math.random) {
    if (state.status !== "playing" || !state.cards[index]) return null;
    const card = state.cards[index];
    state.health = Math.max(0, Math.min(DUNGEON_HEALTH, state.health - card.damage + card.heal));
    state.treasure += card.loot;
    if (state.health === 0) {
      state.status = "lost";
      state.treasure = 0;
    } else if (state.floor === DUNGEON_FLOORS) {
      state.status = "cleared";
    } else {
      state.floor++;
      state.cards = dungeonCards(state.floor, random);
    }
    return card;
  }

  function retreatDungeon(state) {
    if (state.status === "playing") state.status = "returned";
  }

  function dungeonShards(state) {
    return state.status === "lost" ? 0 : Math.floor(state.treasure / TREASURE_PER_SHARD);
  }

  const SLING_WIDTH = 320;
  const SLING_HEIGHT = 360;
  const BALL_RADIUS = 12;
  const SLING_MAX_PULL = 60;
  const SLING_MAX_SPEED = 900;
  const SLING_COURSES = [
    { start: [160, 295], hole: [160, 65], par: 1, walls: [] },
    { start: [65, 295], hole: [250, 110], par: 2,
      walls: [{ x: 115, y: 130, w: 25, h: 95 }] },
    { start: [65, 290], hole: [255, 70], par: 2,
      walls: [{ x: 10, y: 160, w: 205, h: 18 }] },
    { start: [160, 300], hole: [160, 55], par: 2,
      walls: [{ x: 10, y: 165, w: 110, h: 20 }, { x: 200, y: 165, w: 110, h: 20 }] },
    { start: [55, 305], hole: [260, 55], par: 3,
      walls: [{ x: 105, y: 155, w: 18, h: 195 }, { x: 205, y: 10, w: 18, h: 195 }] },
    { start: [160, 300], hole: [160, 55], par: 2,
      walls: [{ x: 120, y: 170, w: 80, h: 18, axis: "x", amplitude: 75, speed: 1.3 }] },
    { start: [60, 300], hole: [255, 60], par: 3,
      walls: [{ x: 100, y: 205, w: 120, h: 18, axis: "x", amplitude: 65, speed: 1.1 },
        { x: 100, y: 95, w: 18, h: 90 }] },
    { start: [160, 305], hole: [160, 50], par: 3,
      walls: [{ x: 10, y: 230, w: 105, h: 18 }, { x: 205, y: 230, w: 105, h: 18 },
        { x: 115, y: 120, w: 90, h: 18, axis: "x", amplitude: 80, speed: 1.5 }] },
    { start: [160, 300], hole: [160, 55], par: 3, walls: [],
      bumpers: [{ x: 160, y: 180, radius: 26 }] },
    { start: [60, 305], hole: [260, 65], par: 5,
      walls: [{ x: 10, y: 220, w: 165, h: 18 }, { x: 145, y: 120, w: 165, h: 18 }],
      bumpers: [{ x: 160, y: 170, radius: 16 }] },
    { start: [55, 300], hole: [260, 60], par: 3,
      walls: [{ x: 150, y: 130, w: 18, h: 100, axis: "y", amplitude: 55, speed: 1.2 }],
      bumpers: [{ x: 80, y: 175, radius: 22 }, { x: 245, y: 200, radius: 24 }] },
    { start: [160, 305], hole: [160, 45], par: 4,
      walls: [{ x: 10, y: 240, w: 105, h: 18 }, { x: 205, y: 240, w: 105, h: 18 },
        { x: 120, y: 145, w: 80, h: 18, axis: "x", amplitude: 70, speed: 1.4 }],
      bumpers: [{ x: 110, y: 185, radius: 20 }, { x: 210, y: 185, radius: 20 },
        { x: 160, y: 95, radius: 20 }] },
  ];

  function newSlingCourse(index) {
    const course = SLING_COURSES[index];
    return {
      index, x: course.start[0], y: course.start[1], vx: 0, vy: 0,
      shots: 0, time: 0, angle: 0, holed: false,
    };
  }

  function slingMoving(ball) {
    return Math.hypot(ball.vx, ball.vy) > 0;
  }

  function shootSling(ball, dx, dy) {
    const distance = Math.hypot(dx, dy);
    if (ball.holed || slingMoving(ball) || distance < 5) return false;
    // 작은 창에서도 최대 힘에 도달하고, 짧은 샷은 섬세하게 조절한다.
    const power = Math.min(1, distance / SLING_MAX_PULL);
    const scale = SLING_MAX_SPEED * power ** 1.5 / distance;
    ball.vx = dx * scale;
    ball.vy = dy * scale;
    ball.shots++;
    return true;
  }

  function slingWalls(ball) {
    return SLING_COURSES[ball.index].walls.map((wall) => ({
      ...wall,
      ...(wall.axis ? { [wall.axis]: wall[wall.axis] + Math.sin(ball.time * wall.speed) * wall.amplitude } : {}),
    }));
  }

  function collideSlingWall(ball, wall) {
    const nx = Math.max(wall.x, Math.min(ball.x, wall.x + wall.w));
    const ny = Math.max(wall.y, Math.min(ball.y, wall.y + wall.h));
    let dx = ball.x - nx;
    let dy = ball.y - ny;
    let distance = Math.hypot(dx, dy);
    if (distance >= BALL_RADIUS) return;
    if (distance === 0) {
      const faces = [
        [ball.x - wall.x, -1, 0], [wall.x + wall.w - ball.x, 1, 0],
        [ball.y - wall.y, 0, -1], [wall.y + wall.h - ball.y, 0, 1],
      ].sort((a, b) => a[0] - b[0]);
      [distance, dx, dy] = faces[0];
      distance = -distance;
    } else {
      dx /= distance;
      dy /= distance;
    }
    ball.x += dx * (BALL_RADIUS - distance);
    ball.y += dy * (BALL_RADIUS - distance);
    const into = ball.vx * dx + ball.vy * dy;
    if (into < 0) {
      ball.vx -= 1.8 * into * dx;
      ball.vy -= 1.8 * into * dy;
    }
  }

  function collideSlingBumper(ball, bumper) {
    const dx = ball.x - bumper.x;
    const dy = ball.y - bumper.y;
    const distance = Math.hypot(dx, dy);
    const radius = BALL_RADIUS + bumper.radius;
    if (distance >= radius) return;
    const nx = distance === 0 ? 0 : dx / distance;
    const ny = distance === 0 ? -1 : dy / distance;
    ball.x = bumper.x + nx * radius;
    ball.y = bumper.y + ny * radius;
    const into = ball.vx * nx + ball.vy * ny;
    if (into >= 0) return;
    // 범퍼는 약한 샷도 튕겨 주되 최대 발사 속도는 넘지 않는다.
    const bounce = Math.max(180, -into * 1.15);
    ball.vx += (bounce - into) * nx;
    ball.vy += (bounce - into) * ny;
    const scale = Math.min(1, SLING_MAX_SPEED / Math.hypot(ball.vx, ball.vy));
    ball.vx *= scale;
    ball.vy *= scale;
  }

  function stepSling(ball, dt) {
    if (ball.holed) return;
    const steps = Math.ceil(Math.min(dt, 0.05) / (1 / 120));
    if (steps <= 0) return;
    const step = Math.min(dt, 0.05) / steps;
    const course = SLING_COURSES[ball.index];
    for (let i = 0; i < steps; i++) {
      ball.time += step;
      ball.x += ball.vx * step;
      ball.y += ball.vy * step;
      const rollDirection = Math.sign(Math.abs(ball.vx) >= Math.abs(ball.vy) ? ball.vx : ball.vy);
      ball.angle += Math.hypot(ball.vx, ball.vy) * rollDirection * step / BALL_RADIUS;
      for (const wall of slingWalls(ball)) collideSlingWall(ball, wall);
      for (const bumper of course.bumpers || []) collideSlingBumper(ball, bumper);
      const margin = 10 + BALL_RADIUS;
      if (ball.x < margin || ball.x > SLING_WIDTH - margin) {
        ball.x = Math.max(margin, Math.min(SLING_WIDTH - margin, ball.x));
        ball.vx = (ball.x === margin ? 1 : -1) * Math.abs(ball.vx) * 0.8;
      }
      if (ball.y < margin || ball.y > SLING_HEIGHT - margin) {
        ball.y = Math.max(margin, Math.min(SLING_HEIGHT - margin, ball.y));
        ball.vy = (ball.y === margin ? 1 : -1) * Math.abs(ball.vy) * 0.8;
      }
      const speed = Math.hypot(ball.vx, ball.vy);
      if (ball.shots > 0 && Math.hypot(ball.x - course.hole[0], ball.y - course.hole[1]) < 14 && speed < 95) {
        ball.x = course.hole[0];
        ball.y = course.hole[1];
        ball.vx = ball.vy = 0;
        ball.holed = true;
        return;
      }
      const friction = Math.exp(-1.6 * step);
      ball.vx *= friction;
      ball.vy *= friction;
      if (speed < 8) ball.vx = ball.vy = 0;
    }
  }

  function slingStars(ball) {
    const par = SLING_COURSES[ball.index].par;
    return ball.holed ? (ball.shots <= par ? 3 : ball.shots <= par + 2 ? 2 : 1) : 0;
  }

  return {
    DUNGEON_HEALTH, DUNGEON_FLOORS, TREASURE_PER_SHARD,
    dungeonCards, newDungeon, chooseDungeonCard, retreatDungeon, dungeonShards,
    SLING_WIDTH, SLING_HEIGHT, BALL_RADIUS, SLING_MAX_PULL, SLING_MAX_SPEED, SLING_COURSES,
    newSlingCourse, slingMoving, shootSling, slingWalls, stepSling, slingStars,
  };
})();

if (typeof module !== "undefined") module.exports = MiniGameRules;
