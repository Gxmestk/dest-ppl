# Development Documentation

Technical documentation for the Procedural Human Destruction System.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Implementation Timeline](#implementation-timeline)
3. [Technical Details](#technical-details)
4. [Performance](#performance)
5. [Lessons Learned](#lessons-learned)
6. [Code Snippets](#code-snippets)

---

## Architecture

### Directory Structure

```
src/
├── core/
│   ├── SceneManager.ts          # Three.js scene, camera, renderer, lights
│   ├── PhysicsWorld.ts          # Cannon.js world setup
│   └── PhysicsRenderer.ts       # Syncs physics bodies to meshes
│
├── geometry/
│   ├── HumanBuilder.ts          # Procedural human mesh (16 body parts)
│   ├── VoronoiFracture.ts       # Voronoi decomposition with SpatialGrid
│   └── GeometryUtils.ts         # Volume, centroid, bounds helpers
│
├── physics/
│   ├── FragmentBodyFactory.ts   # Creates CANNON.Body (sphere/box/convex)
│   ├── PseudoBreakable.ts       # Distance-based constraint breaking
│   └── CollisionHandler.ts      # Impact detection
│
├── entities/
│   ├── Human.ts                 # Legacy single-mesh human
│   ├── PreFracturedHuman.ts     # Pre-computed fracture (async)
│   ├── CompositeHuman.ts        # 16 separate body parts with pre-fracture
│   ├── Fragment.ts              # Single fracture piece
│   └── Projectile.ts            # Damaging object (fast/heavy/shotgun)
│
├── systems/
│   ├── DestructionManager.ts    # Orchestrate fracture process
│   ├── FragmentPool.ts          # Object pooling
│   └── SleepManager.ts          # Auto-cleanup settled fragments
│
├── effects/
│   ├── DebrisParticles.ts       # Particle system
│   └── FractureEffect.ts        # Visual feedback
│
├── interaction/
│   ├── InputHandler.ts          # Mouse input handling
│   ├── ProjectileLauncher.ts    # Spawns projectiles
│   └── CameraController.ts      # OrbitControls wrapper
│
└── main.ts                      # Entry point (~420 lines)
```

### Class Diagram

```
┌─────────────────┐     ┌──────────────────┐
│   SceneManager  │────▶│    THREE.Scene   │
└────────┬────────┘     └──────────────────┘
         │
         │ uses
         ▼
┌─────────────────┐     ┌──────────────────┐
│  PhysicsWorld   │────▶│   CANNON.World   │
└────────┬────────┘     └──────────────────┘
         │
         │ syncs via
         ▼
┌─────────────────┐
│ PhysicsRenderer │
└────────┬────────┘
         │
         │ manages
         ▼
┌─────────────────┐     ┌──────────────────┐
│DestructionMgr   │────▶│  CompositeHuman  │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         │ creates               │ contains
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│    Fragment     │     │   BodyPart[]     │
└─────────────────┘     └──────────────────┘
```

---

## Implementation Timeline

### Week 1: Core Infrastructure

| Days | Tasks | Status |
|------|-------|--------|
| 1-2 | Vite + TypeScript setup, Three.js scene, Cannon.js world | ✅ |
| 3-4 | HumanBuilder with 16 body parts | ✅ |
| 5-7 | VoronoiFracture with spatial grid | ✅ |

### Week 2: Physics + UI

| Days | Tasks | Status |
|------|-------|--------|
| 8-10 | Fragment physics, DestructionManager, constraints | ✅ |
| 11-14 | UI panel, InputHandler, ProjectileLauncher | ✅ |

### Week 3: Polish + Optimization

| Days | Tasks | Status |
|------|-------|--------|
| 15-16 | Visual effects, color palette | ✅ |
| 17-18 | Multiple projectile types, poses | ✅ |
| 19-20 | Performance optimization, sleep states | ✅ |
| 21 | Final polish, README | ✅ |

---

## Technical Details

### Three.js Configuration

```typescript
// SceneManager.ts
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
camera.position.set(3, 2, 3);
```

### Cannon.js Configuration

```typescript
// PhysicsWorld.ts
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.allowSleep = true;
world.solver.iterations = 10;
```

### Voronoi Fracture Algorithm

```
1. Generate seed points inside mesh (rejection sampling)
2. For each seed:
   a. Find K=8 nearest neighbors (using SpatialGrid)
   b. Compute bisector planes between seed and neighbors
   c. Sample points inside convex region
   d. Filter samples by point-in-mesh test
   e. Build convex hull (ConvexGeometry)
3. Return valid fragments
```

### Point-Inside-Mesh Test

Uses 6-axis raycast voting for 95% accuracy:

```typescript
function pointInsideMesh(point: Vector3, mesh: Mesh): boolean {
  const directions = [
    new Vector3(1, 0, 0), new Vector3(-1, 0, 0),
    new Vector3(0, 1, 0), new Vector3(0, -1, 0),
    new Vector3(0, 0, 1), new Vector3(0, 0, -1),
  ];
  let insideCount = 0;
  for (const dir of directions) {
    raycaster.set(point, dir);
    if (raycaster.intersectObject(mesh, false).length % 2 === 1) insideCount++;
  }
  return insideCount >= 3;
}
```

### Pre-Fracture System

Fragments are computed when human spawns (async), then instantly swapped on impact:

```typescript
class CompositeHuman {
  private preFracturedParts: Map<string, PreComputedFracture> = new Map();
  
  async preFractureAllParts(): Promise<void> {
    const promises = this.bodyParts.map(part => 
      this.preFracturePart(part.name, part.mesh)
    );
    await Promise.all(promises);
  }
}
```

---

## Performance

### Optimization Results

| Optimization | Before | After |
|-------------|--------|-------|
| Fracture on Impact | 500-1000ms freeze | Instant |
| Neighbor Search | O(n²) | O(n) |
| Sample Points | 300/cell | 100/cell |
| Physics Shapes | Convex only | Sphere default |

### Performance Budget

| Fragments | FPS |
|-----------|-----|
| 30 | 60 |
| 50 | 55-60 |
| 100 | 45-60 |

### Optimization Techniques

1. **Pre-fracture on spawn** - Async computation, instant swap
2. **Spatial grid** - O(n) neighbor search via grid hashing
3. **Sphere physics** - 10x faster collision than ConvexPolyhedron
4. **Sleep states** - Auto-sleep settled fragments
5. **Object pooling** - Reuse fragment meshes/bodies

### Spatial Grid Implementation

```typescript
class SpatialGrid {
  private cells: Map<string, Vector3[]> = new Map();
  private cellSize = 0.3;
  
  private getKey(point: Vector3): string {
    return `${Math.floor(point.x/this.cellSize)},${Math.floor(point.y/this.cellSize)},${Math.floor(point.z/this.cellSize)}`;
  }
  
  getNeighbors(point: Vector3, radius: number): Vector3[] {
    // O(1) cell lookup instead of O(n) scan
  }
}
```

---

## Lessons Learned

### Top 10 Insights

1. **ConvexGeometry + try-catch** - Wrap in try-catch for invalid point sets
2. **6-axis raycast voting** - Most reliable point-in-mesh test
3. **raycaster.far** - Must set for projectile collision detection
4. **Vertex deduplication** - Required for CANNON.ConvexPolyhedron
5. **Barrel exports** - Use `index.ts` for clean imports
6. **.js extensions** - Required in Three.js addon imports for Vite
7. **30 fragment budget** - Safe for 60 FPS
8. **Sleep states** - Dramatically reduce physics computation
9. **pointer-events CSS** - Use `none` on UI overlay
10. **Always dispose** - Geometry/material disposal prevents leaks

### Three.js Gotchas

**Import Pattern:**
```typescript
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
```

**Clock Deprecation:**
- `THREE.Clock` deprecated but still works
- Recommended: `THREE.Timer`

**ShadowMap:**
- `PCFSoftShadowMap` deprecated → use `PCFShadowMap`

### Cannon.js Gotchas

**ConvexPolyhedron:**
```typescript
new CANNON.ConvexPolyhedron({
  vertices: [new CANNON.Vec3(...), ...],
  faces: [[0, 1, 2], ...]  // Triangle indices
});
```

**Fixed Timestep:**
```typescript
world.step(1/60, deltaTime, 3);  // maxSubSteps = 3
```

### Common Bugs Fixed

| Bug | Fix |
|-----|-----|
| Invalid CapsuleGeometry | Use actual sizes, not scale multipliers |
| Raycaster misses Group | Call `updateWorldMatrix(true, false)` |
| Small parts = 0 fragments | Adaptive radius based on bbox |
| Wrong fragment positions | Apply world matrix transform |

---

## Code Snippets

### Fracture Mesh Function

```typescript
function fractureMesh(mesh: THREE.Mesh, seedCount: number): THREE.BufferGeometry[] {
  const bbox = new THREE.Box3().setFromObject(mesh);
  const seeds: THREE.Vector3[] = [];
  
  for (let i = 0; i < seedCount * 20 && seeds.length < seedCount; i++) {
    const point = new THREE.Vector3(
      THREE.MathUtils.randFloat(bbox.min.x, bbox.max.x),
      THREE.MathUtils.randFloat(bbox.min.y, bbox.max.y),
      THREE.MathUtils.randFloat(bbox.min.z, bbox.max.z)
    );
    if (pointInsideMesh(point, mesh)) seeds.push(point);
  }
  
  const fragments: THREE.BufferGeometry[] = [];
  for (const seed of seeds) {
    const neighbors = findKNearestNeighbors(seed, seeds, 8);
    const planes = computeBisectorPlanes(seed, neighbors);
    const points = sampleConvexRegion(seed, planes, 100)
      .filter(p => pointInsideMesh(p, mesh));
    
    if (points.length >= 4) {
      try { fragments.push(new ConvexGeometry(points)); } catch {}
    }
  }
  return fragments;
}
```

### Create Physics Body

```typescript
function createFragmentBody(geometry: THREE.BufferGeometry): CANNON.Body {
  const volume = calculateVolume(geometry);
  const mass = volume * 1000;  // density
  
  const body = new CANNON.Body({ mass, linearDamping: 0.3 });
  body.addShape(new CANNON.Sphere(estimateRadius(geometry)));  // Fast
  // body.addShape(new CANNON.Box(halfExtents));  // Medium
  // body.addShape(geometryToConvex(geometry));  // Slow but accurate
  
  return body;
}
```

### Game Loop

```typescript
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  
  physicsWorld.step(1/60, dt, 3);
  physicsRenderer.update();
  sceneManager.render();
  
  updateFPS(dt);
}

animate();
```

### Handle Click-to-Shoot

```typescript
function onMouseClick(event: MouseEvent) {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );
  
  raycaster.setFromCamera(mouse, camera);
  
  human.group.updateWorldMatrix(true, false);
  const intersects = raycaster.intersectObjects(
    human.bodyParts.map(p => p.mesh), 
    true
  );
  
  if (intersects.length > 0) {
    destructionManager.destroyBodyPart(
      intersects[0].object.userData.partName,
      intersects[0].point
    );
  }
}
```

---

## Dependencies

```json
{
  "dependencies": {
    "three": "^0.160.0",
    "cannon-es": "^0.20.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "@types/three": "^0.160.0"
  }
}
```

---

*Last updated: 2026-03-09*
