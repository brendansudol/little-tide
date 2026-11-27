export const REEF = { x: -8, z: -32 };
export const SWIMMER_Y = -.55;
export const SHARK_REACH = 3.1;

export function shore(x) {
  return 1.1 * Math.sin(x * .115) + .55 * Math.cos(x * .3);
}

export function ground(x, z) {
  const offshore = shore(x) - z;
  if (offshore <= 0) return .3 + Math.min(-offshore, 25) * .036;
  const shelf = Math.max(0, Math.min(1, (offshore - 15) / 34));
  return .3 - Math.min(offshore * .14, 2.8) - 12 * shelf * shelf * (3 - 2 * shelf);
}

export function canDive(x, z) {
  return shore(x) - z >= 15;
}

// Follow the slope when diving. Coming back through the shallows lifts the swimmer.
export function nextDepth(depth, diving, x, z, dt) {
  const clearance = Math.max(0, SWIMMER_Y - ground(x, z) - .45);
  if (diving && canDive(x, z)) return Math.min(clearance, depth + 3.4 * dt);
  return Math.min(clearance, Math.max(0, depth - 4.5 * dt));
}

export function sharkPose(phase, swimmer) {
  let x = REEF.x + 3.3 * Math.sin(phase);
  let z = REEF.z + 1.7 * Math.cos(phase);
  const yaw = Math.atan2(3.3 * Math.cos(phase), -1.7 * Math.sin(phase));
  // Leave room for Finn's snout and the swimmer's outstretched hand.
  if (swimmer && Math.abs(swimmer.y + .75 - (ground(x, z) + 1.45)) < 2) {
    const dx = x - swimmer.x, dz = z - swimmer.z;
    const gap = Math.hypot(dx, dz);
    if (gap < 2.6) {
      const away = gap > .01 ? Math.atan2(dx, dz) : yaw;
      x = swimmer.x + 2.6 * Math.sin(away);
      z = swimmer.z + 2.6 * Math.cos(away);
    }
  }
  return {
    x, z, y: ground(x, z) + 1.45 + .12 * Math.sin(phase * 2),
    yaw,
  };
}

export function petDistance(swimmer, animal) {
  return Math.hypot(swimmer.x - animal.x, swimmer.y + .75 - animal.y, swimmer.z - animal.z);
}
