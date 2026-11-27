import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shore, ground, canDive, nextDepth, sharkPose, petDistance, SWIMMER_Y, SHARK_REACH, REEF } from '../dist/ocean.js';

test('The original beach and shallows lead continuously down the offshore shelf', () => {
  for (const x of [-37, REEF.x, 0, 37]) {
    const coast = shore(x);
    assert.equal(ground(x, coast + 6), .3 + 6 * .036);
    for (const distance of [0, 4, 8, 12]) {
      assert.ok(Math.abs(ground(x, coast - distance) - (.3 - distance * .14)) < 1e-9);
      assert.equal(canDive(x, coast - distance), false);
    }
    let floor = ground(x, coast - 14);
    for (let offshore = 14.1; offshore <= 52; offshore += .1) {
      const next = ground(x, coast - offshore);
      assert.ok(next <= floor && floor - next < .08);
      floor = next;
    }
    assert.ok(floor < -14);
  }
});

test('A dive descends gradually, stays above the seabed, and can surface mid-dive', () => {
  for (const fps of [30, 60, 120]) {
    const { x, z } = REEF, dt = 1 / fps;
    let depth = 0;
    for (let i = 0; i < fps; i++) depth = nextDepth(depth, true, x, z, dt);
    assert.ok(Math.abs(depth - 3.4) < 1e-8);
    for (let i = 0; i < fps; i++) depth = nextDepth(depth, false, x, z, dt);
    assert.equal(depth, 0);
    for (let i = 0; i < fps * 5; i++) depth = nextDepth(depth, true, x, -54, dt);
    assert.ok(depth > 13 && SWIMMER_Y - depth >= ground(x, -54) + .44);
    for (let shoreward = -54; shoreward <= 0; shoreward += 4 * dt) {
      depth = nextDepth(depth, true, x, shoreward, dt);
      if (depth > 0) assert.ok(SWIMMER_Y - depth >= ground(x, shoreward) + .44);
    }
    assert.equal(depth, 0);
  }
});

test('Finn stays out of petting reach at the surface and within reach along the reef floor', () => {
  for (let i = 0; i < 120; i++) {
    const shark = sharkPose(i * Math.PI / 60);
    const { x, z } = shark;
    assert.ok(canDive(x, z));
    assert.ok(petDistance({ x, y: SWIMMER_Y, z }, shark) > SHARK_REACH);
    const depth = nextDepth(0, true, x, z, 10);
    assert.ok(petDistance({ x, y: SWIMMER_Y - depth, z }, shark) < SHARK_REACH);
    assert.ok(shark.y > ground(x, z) + 1.2);
  }
});

test('Swimming directly into Finn leaves space to face him and give him a pat', () => {
  for (let i = 0; i < 24; i++) {
    const phase = i * Math.PI / 12, patrol = sharkPose(phase);
    const swimmer = { x: patrol.x, z: patrol.z, y: ground(patrol.x, patrol.z) + .45 };
    const greeting = sharkPose(phase, swimmer);
    assert.ok(Math.hypot(greeting.x - swimmer.x, greeting.z - swimmer.z) >= 2.59);
    assert.ok(petDistance(swimmer, greeting) < SHARK_REACH);
  }
});
