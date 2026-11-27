import * as THREE from './vendor/three.module.js';
import { ground, petDistance, REEF, sharkPose } from './ocean.js';

export function createReef(scene, { mat, mesh, ball }) {
  const buoy = new THREE.Group();
  scene.add(buoy);
  buoy.position.set(REEF.x, .38, REEF.z);
  const orange = mat('#ff7845'), ivory = mat('#fff4ce');
  ball(buoy, orange, 0, .1, 0, .67, .48, .67);
  mesh(new THREE.CylinderGeometry(.36, .48, .56, 12), ivory, buoy, 0, .55, 0);
  mesh(new THREE.CylinderGeometry(.21, .36, .48, 12), orange, buoy, 0, 1.07, 0);
  mesh(new THREE.TorusGeometry(.19, .05, 8, 16), ivory, buoy, 0, 1.48, 0);
  const bottom = ground(REEF.x, REEF.z);
  mesh(new THREE.CylinderGeometry(.024, .024, -bottom, 6), mat('#799386'), scene, REEF.x, bottom / 2, REEF.z);

  // Branches share a single draw call, including their different coral colors.
  const branches = [];
  const stones = new THREE.DodecahedronGeometry(1);
  const stoneMat = mat('#779e9e', { flatShading: true });
  const kelpMat = mat('#519e70', { side: THREE.DoubleSide });
  const kelp = new THREE.Shape();
  kelp.moveTo(0, 0);
  kelp.bezierCurveTo(-.3, .65, .28, 1.45, .16, 2.2);
  kelp.bezierCurveTo(.58, 1.5, -.03, .7, .12, 0);
  const leaf = new THREE.ShapeGeometry(kelp);
  const beds = [
    [-12, -23, .8], [-4, -27, .9], [-13, -31, 1.2], [-5, -35, 1.1],
    [-17, -39, 1.4], [1, -39, 1.2], [9, -28, .85], [-4, -46, 1.3],
    [-26, -47, 1.15], [16, -52, 1.55], [-12, -54, 1.35], [25, -37, 1.1],
  ];
  const coralColors = ['#ff977c', '#ffbf66', '#cba5df'];
  const up = new THREE.Vector3(0, 1, 0);
  const piece = new THREE.Object3D();
  for (const [i, [x, z, scale]] of beds.entries()) {
    const y = ground(x, z);
    const rock = mesh(stones, stoneMat, scene, x, y + .16, z);
    rock.scale.set(1.65 * scale, .65 * scale, 1.05 * scale);
    rock.rotation.y = i;
    const angle = i * 1.9;
    const coralPoint = (u, v) => new THREE.Vector3(
      x + scale * u * Math.cos(angle), y + scale * (.54 + v), z + scale * u * Math.sin(angle)
    );
    const branch = (u, v, endU, endV, radius) => {
      const a = coralPoint(u, v), b = coralPoint(endU, endV);
      const direction = b.clone().sub(a);
      piece.position.addVectors(a, b).multiplyScalar(.5);
      piece.scale.set(radius * scale, direction.length(), radius * scale);
      piece.quaternion.setFromUnitVectors(up, direction.normalize());
      piece.updateMatrix();
      branches.push({ matrix: piece.matrix.clone(), color: coralColors[i % 3] });
    };
    branch(0, 0, .02, .84, .14);
    branch(.02, .78, -.09, 1.48, .09);
    for (const side of [-1, 1]) {
      branch(0, .32, side * .46, .65, .11);
      branch(side * .46, .64, side * .58, 1.2, .085);
      branch(side * .48, .8, side * .79, .97, .07);
      branch(side * .79, .96, side * .83, 1.17, .055);
      const blade = mesh(leaf, kelpMat, scene, x + side * 1.2, ground(x + side * 1.2, z), z);
      blade.rotation.set(.08 * side, i * .7, -.23 * side);
      blade.scale.setScalar(scale * (side === 1 ? 1 : .7));
    }
  }
  const coral = new THREE.InstancedMesh(new THREE.CylinderGeometry(.7, 1, 1, 7), mat('#ffffff'), branches.length);
  branches.forEach(({ matrix, color }, i) => {
    coral.setMatrixAt(i, matrix);
    coral.setColorAt(i, new THREE.Color(color));
  });
  scene.add(coral);

  const bubbles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: '#c8fff4', transparent: true, opacity: .43, depthWrite: false }), beds.length * 5);
  bubbles.frustumCulled = false;
  scene.add(bubbles);
  const bubbleFloors = beds.map(([x, z]) => ground(x, z));

  const shark = new THREE.Group();
  scene.add(shark);
  // Cross sections run from tail to nose. The lower vertices make a continuous pale belly.
  const rings = [
    [-1.75, .08, .1], [-1.4, .23, .25], [-.9, .48, .43], [-.35, .65, .54],
    [.22, .73, .59], [.72, .72, .54], [1.12, .62, .43], [1.43, .43, .29], [1.59, .04, .065],
  ];
  const verts = [], colors = [], indices = [], sides = 16;
  const blue = new THREE.Color('#508ca4'), flank = new THREE.Color('#82b8c7'), belly = new THREE.Color('#ffefd8');
  rings.forEach(([z, w, h], ring) => {
    for (let j = 0; j < sides; j++) {
      const theta = j * Math.PI * 2 / sides, height = Math.sin(theta);
      verts.push(w * Math.cos(theta), h * height, z);
      const color = height < -.32 ? belly : height < .18 ? flank : blue;
      colors.push(color.r, color.g, color.b);
      if (ring === rings.length - 1) continue;
      const a = ring * sides + j, b = ring * sides + (j + 1) % sides;
      indices.push(a, b, a + sides, b, b + sides, a + sides);
    }
  });
  for (let j = 1; j < sides - 1; j++) {
    const nose = (rings.length - 1) * sides;
    indices.push(0, j + 1, j, nose, nose + j, nose + j + 1);
  }
  const hull = new THREE.BufferGeometry();
  hull.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  hull.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  hull.setIndex(indices);
  hull.computeVertexNormals();
  mesh(hull, mat('#ffffff', { vertexColors: true }), shark);

  const finMat = mat('#53899e', { side: THREE.DoubleSide });
  function fin(parent, outline, front, back) {
    const g = new THREE.BufferGeometry(), faces = [], n = outline.length;
    for (let i = 0; i < n; i++) faces.push(i, (i + 1) % n, n, (i + 1) % n, i, n + 1);
    g.setAttribute('position', new THREE.Float32BufferAttribute([...outline, front, back].flat(), 3));
    g.setIndex(faces);
    g.computeVertexNormals();
    return mesh(g, finMat, parent);
  }
  fin(shark, [[0,.43,.49], [0,.89,.02], [0,1.28,-.43], [0,1.3,-.55], [0,.74,-.51], [0,.41,-.78]],
    [.11,.64,-.21], [-.11,.64,-.21]);
  const tail = new THREE.Group();
  shark.add(tail);
  tail.position.z = -1.52;
  fin(tail, [[0,.11,.12], [0,.29,-.32], [0,.91,-.86], [0,.98,-1.01], [0,.51,-.87],
    [0,.02,-.55], [0,-.56,-.83], [0,-.59,-.72], [0,-.25,-.27], [0,-.1,.12]],
    [.1,0,-.26], [-.1,0,-.26]);
  const ink = mat('#203f50'), gleam = mat('#fff8df');
  for (const side of [-1, 1]) {
    fin(shark, [[side*.48,-.08,.54], [side*1.27,-.28,.02], [side*1.54,-.42,-.36],
      [side*1.47,-.44,-.43], [side*.47,-.19,-.36]], [side*.74,-.09,.01], [side*.74,-.21,.01]);
    ball(shark, gleam, side*.615,.14,.87,.135,.182,.163);
    ball(shark, ink, side*.706,.15,.91,.065,.137,.114);
    ball(shark, gleam, side*.753,.21,.957,.025,.034,.027);
  }
  const smile = new THREE.CatmullRomCurve3([
    [-.59,-.06,1.18], [-.45,-.15,1.39], [0,-.14,1.56], [.45,-.15,1.39], [.59,-.06,1.18],
  ].map(p => new THREE.Vector3(...p)));
  mesh(new THREE.TubeGeometry(smile, 20, .021, 6, false), ink, shark);

  const friend = { kind: 'shark', name: 'Finn', group: shark, pet: 0 };
  let phase = .3, waiting = false;
  const start = sharkPose(phase);
  shark.position.set(start.x, start.y, start.z);
  shark.rotation.y = start.yaw;
  function update(dt, time, now, swimmer) {
    buoy.position.y = .42 + .085 * Math.sin(time * 1.7);
    buoy.rotation.z = .075 * Math.sin(time * 1.25);
    const happy = friend.pet > now;
    // Linger within reach until the swimmer moves away.
    const gap = petDistance(swimmer, shark.position);
    waiting = gap < (waiting ? 3.35 : 2.8);
    if (!happy && !waiting) phase += dt * .32;
    const pose = sharkPose(phase, swimmer), follow = 1 - Math.exp(-dt * 7);
    shark.position.x += (pose.x - shark.position.x) * follow;
    shark.position.z += (pose.z - shark.position.z) * follow;
    shark.position.y += (pose.y + .08 * Math.sin(time * 1.8) - shark.position.y) * follow;
    const heading = waiting ? Math.atan2(swimmer.x - shark.position.x, swimmer.z - shark.position.z) : pose.yaw;
    const turn = heading - shark.rotation.y;
    const yaw = shark.rotation.y + Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-dt * 2.8));
    shark.rotation.set(.04 * Math.sin(phase * 2), yaw, Math.sin(time * (happy ? 7 : 1.8)) * (happy ? .22 : .035), 'YXZ');
    tail.rotation.y = Math.sin(time * (happy ? 12 : 4)) * (happy ? .58 : .32);
    piece.quaternion.identity();
    for (let i = 0; i < bubbles.count; i++) {
      const bed = Math.floor(i / 5), [x, z] = beds[bed], floor = bubbleFloors[bed];
      const rise = (time * .12 + i * .213) % 1;
      piece.position.set(x + .5 * Math.sin(i + rise * 4), floor + .8 + rise * (-floor - .8), z + .5 * Math.cos(i));
      piece.scale.setScalar((.035 + (i % 3) * .025) * Math.sin(Math.PI * rise));
      piece.updateMatrix();
      bubbles.setMatrixAt(i, piece.matrix);
    }
    bubbles.instanceMatrix.needsUpdate = true;
  }
  return { friend, buoy, update };
}
