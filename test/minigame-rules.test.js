const test = require("node:test");
const assert = require("node:assert/strict");
const rules = require("../src/renderer/tray/minigame-rules");

test("던전은 공개된 피해와 보물을 적용하고 회복은 최대 체력으로 제한한다", () => {
  const state = rules.newDungeon(() => 0.2);
  state.cards = [{ type: "monster", damage: 3, loot: 70, heal: 0 }];
  rules.chooseDungeonCard(state, 0);
  assert.equal(state.health, 7);
  assert.equal(state.treasure, 70);
  assert.equal(state.floor, 2);
  state.cards = [{ type: "heal", damage: 0, loot: 0, heal: 4 }];
  rules.chooseDungeonCard(state, 0);
  assert.equal(state.health, 10);
  assert.equal(state.treasure, 70);
  assert.equal(state.floor, 3);
});

test("던전 사망은 이번 보물을 잃으며 마지막 층에서도 완주보다 우선한다", () => {
  const state = rules.newDungeon();
  Object.assign(state, { floor: 10, health: 2, treasure: 250,
    cards: [{ type: "monster", damage: 2, loot: 80, heal: 0 }] });
  rules.chooseDungeonCard(state, 0);
  assert.equal(state.status, "lost");
  assert.equal(state.health, 0);
  assert.equal(rules.dungeonShards(state), 0);
  rules.retreatDungeon(state);
  assert.equal(state.status, "lost");
  assert.equal(rules.chooseDungeonCard(state, 0), null);
});

test("귀환과 10층 완주 때 보물을 100 단위로 정산한다", () => {
  const returned = rules.newDungeon();
  returned.treasure = 299;
  rules.retreatDungeon(returned);
  assert.equal(returned.status, "returned");
  assert.equal(rules.dungeonShards(returned), 2);
  assert.equal(rules.chooseDungeonCard(returned, 0), null);
  const cleared = rules.newDungeon();
  Object.assign(cleared, { floor: 10, treasure: 180,
    cards: [{ type: "treasure", damage: 1, loot: 30, heal: 0 }] });
  rules.chooseDungeonCard(cleared, 0);
  assert.equal(cleared.status, "cleared");
  assert.equal(cleared.floor, 10);
  assert.equal(rules.dungeonShards(cleared), 2);
  assert.equal(rules.newDungeon().treasure, 0);
});

test("모든 층은 3개의 카드와 정확한 비음수 피해/보상을 제공한다", () => {
  for (let floor = 1; floor <= 10; floor++) {
    for (const random of [() => 0, () => 0.5, () => 0.999]) {
      const cards = rules.dungeonCards(floor, random);
      assert.equal(cards.length, 3);
      assert.ok(cards.some((card) => card.type === "monster"));
      assert.ok(cards.some((card) => card.type === "treasure"));
      for (const card of cards) {
        for (const key of ["damage", "loot", "heal"])
          assert.ok(Number.isInteger(card[key]) && card[key] >= 0);
      }
    }
  }
});

test("슬링샷은 조준 방향으로 발사하며 최대 세기를 제한하고 움직일 때 재발사를 막는다", () => {
  const ball = rules.newSlingCourse(0);
  assert.equal(rules.shootSling(ball, 0, -2), false);
  assert.equal(ball.shots, 0);
  assert.equal(rules.shootSling(ball, 0, -200), true);
  assert.equal(ball.vy, -900);
  assert.equal(ball.shots, 1);
  assert.equal(rules.shootSling(ball, 50, 0), false);
  assert.equal(ball.shots, 1);
  const fullPull = rules.newSlingCourse(0);
  rules.shootSling(fullPull, 0, -60);
  assert.equal(fullPull.vy, ball.vy);
});

test("벽을 관통하지 않고 반사하며 마찰로 멈춘다", () => {
  const ball = rules.newSlingCourse(1);
  Object.assign(ball, { x: 95, y: 220, vx: 900, vy: 0 });
  rules.stepSling(ball, 0.05);
  assert.ok(ball.x <= 103);
  assert.ok(ball.vx < 0);
  for (let i = 0; i < 300; i++) rules.stepSling(ball, 1 / 60);
  assert.equal(rules.slingMoving(ball), false);
  assert.ok(ball.x >= 22 && ball.x <= 298);
});

test("슬링샷은 가로·세로·대각선으로 곧게 날아가도 이동 거리만큼 구른다", () => {
  for (const [dx, dy] of [[25, 0], [-25, 0], [0, 25], [0, -25], [15, 20], [-15, -20]]) {
    const ball = rules.newSlingCourse(0);
    Object.assign(ball, { x: 160, y: 200 });
    rules.shootSling(ball, dx, dy);
    rules.stepSling(ball, 1 / 60);
    const distance = Math.hypot(ball.x - 160, ball.y - 200);
    assert.ok(Math.abs(Math.abs(ball.angle) - distance / rules.BALL_RADIUS) < 1e-10,
      `direction ${dx}, ${dy}`);
    assert.equal(Math.sign(ball.angle), Math.sign(Math.abs(dx) >= Math.abs(dy) ? dx : dy));
    const angle = ball.angle;
    ball.vx = ball.vy = 0;
    rules.stepSling(ball, 1 / 60);
    assert.equal(ball.angle, angle);
  }
});

test("2번 코스 오른쪽 아래에서 짧게 당겨도 위쪽 홀까지 도달한다", () => {
  for (const fps of [30, 60, 120]) {
    const ball = rules.newSlingCourse(1);
    Object.assign(ball, { x: 250, y: 310 });
    rules.shootSling(ball, 0, -35);
    for (let frame = 0; frame < fps * 10 && !ball.holed && rules.slingMoving(ball); frame++)
      rules.stepSling(ball, Math.min(1 / fps, 0.032));
    assert.equal(ball.holed, true, `${fps} fps`);
  }
});

test("2번 코스는 수평으로 벽을 우회하고 조준 오차가 있어도 2타로 통과한다", () => {
  for (const firstPull of [22, 24, 26, 28]) {
    for (const angleError of [-3, 0, 3]) {
      for (const powerError of [-1, 0, 1]) {
        const ball = rules.newSlingCourse(1);
        function shoot(dx, dy) {
          rules.shootSling(ball, dx, dy);
          for (let frame = 0; frame < 600 && !ball.holed && rules.slingMoving(ball); frame++)
            rules.stepSling(ball, 1 / 60);
        }
        shoot(firstPull, 0);
        // 첫 샷은 벽 끝에 걸리거나 반사되지 않고 수평으로 지나간다.
        assert.equal(ball.y, 295);
        assert.ok(ball.x > 180);
        const dx = 250 - ball.x;
        const dy = 110 - ball.y;
        const angle = Math.atan2(dy, dx) + angleError * Math.PI / 180;
        const power = 60 * ((Math.hypot(dx, dy) * 1.6 + 6) / 900) ** (2 / 3) + powerError;
        shoot(Math.cos(angle) * power, Math.sin(angle) * power);
        assert.equal(ball.holed, true, `pull=${firstPull}, angle=${angleError}, power=${powerError}`);
        assert.equal(ball.shots, 2);
      }
    }
  }
});

test("홀에 느리게 들어가야 성공하며 목표 타수에 맞춰 별을 계산한다", () => {
  const fast = rules.newSlingCourse(0);
  Object.assign(fast, { x: 160, y: 70, shots: 1, vy: -500 });
  rules.stepSling(fast, 1 / 120);
  assert.equal(fast.holed, false);
  for (const [shots, stars] of [[1, 3], [3, 2], [4, 1]]) {
    const ball = rules.newSlingCourse(0);
    Object.assign(ball, { x: 160, y: 70, shots, vy: -50 });
    rules.stepSling(ball, 1 / 120);
    assert.equal(ball.holed, true);
    assert.equal(rules.slingStars(ball), stars);
    assert.equal(rules.shootSling(ball, 0, 50), false);
  }
});

test("12개 코스 모두 실제 발사와 물리 루프로 통과할 수 있다", () => {
  // 벽을 우회하는 실제 경로. 목표 좌표로 순간 이동하지 않고 매번 발사·감속한다.
  const routes = [
    [[160, 65]],
    [[190, 310], [250, 110]],
    [[260, 235], [255, 70]],
    [[160, 55]],
    [[55, 125], [160, 125], [160, 235], [260, 235], [260, 55]],
    [[23, 300], [23, 55], [160, 55]],
    [[22, 300], [22, 60], [255, 60]],
    [[160, 200], [22, 200], [22, 50], [160, 50]],
    [[60, 300], [60, 55], [160, 55]],
    [[260, 305], [260, 200], [60, 200], [60, 65], [260, 65]],
    [[30, 300], [30, 60], [260, 60]],
    [[160, 225], [30, 225], [30, 45], [160, 45]],
  ];
  assert.equal(routes.length, rules.SLING_COURSES.length);
  for (let index = 0; index < routes.length; index++) {
    const ball = rules.newSlingCourse(index);
    for (const [x, y] of routes[index]) {
      const dx = x - ball.x;
      const dy = y - ball.y;
      const distance = Math.hypot(dx, dy);
      const power = 60 * ((distance * 1.6 + 6) / 900) ** (2 / 3);
      assert.equal(rules.shootSling(ball, dx / distance * power, dy / distance * power), true);
      for (let frame = 0; frame < 600 && !ball.holed && rules.slingMoving(ball); frame++)
        rules.stepSling(ball, 1 / 60);
    }
    assert.equal(ball.holed, true, `course ${index + 1}`);
    if (index >= 8) assert.equal(rules.slingStars(ball), 3, `course ${index + 1} par`);
  }
});

test("12개 코스의 이동 장애물은 보드 안에 있고 시간에 따라 움직인다", () => {
  assert.equal(rules.SLING_COURSES.length, 12);
  for (let index = 0; index < rules.SLING_COURSES.length; index++) {
    const ball = rules.newSlingCourse(index);
    const start = rules.slingWalls(ball);
    ball.time = 1;
    const moved = rules.slingWalls(ball);
    for (let i = 0; i < moved.length; i++) {
      const wall = moved[i];
      assert.ok(wall.x >= 10 && wall.x + wall.w <= 310);
      assert.ok(wall.y >= 10 && wall.y + wall.h <= 350);
      if (wall.axis) assert.notEqual(wall[wall.axis], start[i][wall.axis]);
    }
  }
});

test("범퍼는 정면·대각선 충돌을 반사하고 최대 속도에서도 관통하지 않는다", () => {
  const bumper = rules.SLING_COURSES[8].bumpers[0];
  const radius = bumper.radius + rules.BALL_RADIUS;
  for (const angle of [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    for (const speed of [40, 500, rules.SLING_MAX_SPEED]) {
      const ball = rules.newSlingCourse(8);
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      Object.assign(ball, {
        x: bumper.x + nx * (radius + 0.1), y: bumper.y + ny * (radius + 0.1),
        vx: -nx * speed, vy: -ny * speed, shots: 1,
      });
      rules.stepSling(ball, 1 / 120);
      assert.ok(Math.hypot(ball.x - bumper.x, ball.y - bumper.y) >= radius - 1e-10);
      assert.ok(ball.vx * nx + ball.vy * ny > 0);
      assert.ok(Math.hypot(ball.vx, ball.vy) <= rules.SLING_MAX_SPEED);
      if (speed === 40) assert.ok(Math.hypot(ball.vx, ball.vy) > 170);
      const reflectedSpeed = Math.hypot(ball.vx, ball.vy);
      rules.stepSling(ball, 1 / 120);
      assert.ok(Math.hypot(ball.vx, ball.vy) < reflectedSpeed, "반사 후 재가속하지 않는다");
    }
  }
});

test("새 코스의 범퍼는 보드 안에 있고 출발점·홀·이동 벽과 겹치지 않는다", () => {
  for (let index = 8; index < rules.SLING_COURSES.length; index++) {
    const course = rules.SLING_COURSES[index];
    for (const bumper of course.bumpers) {
      assert.ok(bumper.x - bumper.radius >= 10 && bumper.x + bumper.radius <= 310);
      assert.ok(bumper.y - bumper.radius >= 10 && bumper.y + bumper.radius <= 350);
      for (const [x, y] of [course.start, course.hole])
        assert.ok(Math.hypot(x - bumper.x, y - bumper.y) > bumper.radius + rules.BALL_RADIUS);
      for (const wall of course.walls) {
        // 이동 벽이 차지할 수 있는 전체 범위를 검사한다.
        const x = wall.x - (wall.axis === "x" ? wall.amplitude : 0);
        const y = wall.y - (wall.axis === "y" ? wall.amplitude : 0);
        const w = wall.w + (wall.axis === "x" ? 2 * wall.amplitude : 0);
        const h = wall.h + (wall.axis === "y" ? 2 * wall.amplitude : 0);
        const dx = bumper.x - Math.max(x, Math.min(bumper.x, x + w));
        const dy = bumper.y - Math.max(y, Math.min(bumper.y, y + h));
        assert.ok(Math.hypot(dx, dy) > bumper.radius, `course ${index + 1}`);
      }
    }
  }
});
