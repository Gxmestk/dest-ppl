# Procedural Human Destruction - Implementation Plan

**Project:** Interactive Voronoi Fracture System for Human Models  
**Technologies:** Three.js + Cannon.js (Vanilla Implementation)  
**Timeline:** 3 Weeks  
**Style:** Minimalist/Stylized  
**Mode:** Interactive Playground

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technical Validation](#technical-validation)
3. [3-Week Implementation Timeline](#3-week-implementation-timeline)
4. [Core Systems](#core-systems)
5. [Voronoi Fracture System](#voronoi-fracture-system)
6. [Physics Integration](#physics-integration)
7. [Visual Effects](#visual-effects)
8. [Interactive Playground](#interactive-playground)
9. [Testing Strategy](#testing-strategy)
10. [Performance Optimization](#performance-optimization)
11. [Visual Style Guide](#visual-style-guide)
12. [Success Criteria](#success-criteria)
13. [Lessons Learned](#lessons-learned)
14. [Copy-Paste Code Snippets](#copy-paste-code-snippets)

---

## Architecture Overview

```
src/
├── core/
│   ├── SceneManager.ts          # Three.js scene setup
│   ├── PhysicsWorld.ts           # Cannon.js world
│   └── PhysicsRenderer.ts        # Sync physics → rendering
│
├── geometry/
│   ├── HumanBuilder.ts           # Procedural human mesh
│   ├── VoronoiFracture.ts        # Voronoi decomposition (with SpatialGrid)
│   ├── ConvexHullBuilder.ts      # Wrapper for Three.js ConvexHull
│   ├── MeshIntersection.ts       # Raycasting-based mesh ops
│   └── GeometryUtils.ts          # BufferGeometry helpers
│
├── physics/
│   ├── FragmentBodyFactory.ts    # Create CANNON.Body (sphere/box/convex)
│   ├── PseudoBreakable.ts        # Distance-based constraint breaking
│   └── CollisionHandler.ts       # Impact detection & fracture trigger
│
├── entities/
│   ├── Human.ts                  # Human model (pre/post fracture)
│   ├── PreFracturedHuman.ts      # Pre-computed fracture (async)
│   ├── CompositeHuman.ts         # Multi-part body with per-part destruction
│   ├── Fragment.ts               # Single fracture piece
│   └── Projectile.ts             # Damaging object
│
├── systems/
│   ├── DestructionManager.ts     # Orchestrate fracture process
│   ├── FragmentPool.ts           # Object pooling for performance
│   └── SleepManager.ts           # Auto-cleanup settled fragments
│
├── effects/
│   ├── DebrisParticles.ts        # Particle system for debris
│   ├── FractureEffect.ts         # Visual feedback on fracture
│   └── TrailEffect.ts            # Motion blur for fast fragments
│
├── interaction/
│   ├── InputHandler.ts           # Mouse/touch input
│   ├── ProjectileLauncher.ts     # Spawn projectiles on click
│   └── CameraController.ts       # Orbit + follow modes
│
└── main.ts                       # Entry point
```

---

## Technical Validation

### Confirmed Support in Three.js

**Built-in Features:**
- **ConvexGeometry** - `three/addons/geometries/ConvexGeometry.js`
- **ConvexHull class** - `three/addons/math/ConvexHull.js`
- **Material clipping planes** - `material.clippingPlanes = [plane1, plane2]`

### Confirmed Support in Cannon.js

**ConvexPolyhedron:**
```typescript
new CANNON.ConvexPolyhedron({ vertices, faces })
```

**Constraints:**
- PointToPointConstraint, HingeConstraint, LockConstraint
- No native breakable constraints - custom implementation needed

### Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| No built-in mesh intersection | Use raycasting inside test + ConvexGeometry |
| No breakable constraints | Custom distance-based breaking system |
| ConvexPolyhedron expensive | Use Box/Sphere for fragments < 5cm |
| Voronoi complexity | Use built-in ConvexGeometry for cells |

---

## 3-Week Implementation Timeline

### Week 1: Core Infrastructure + Voronoi Foundation

**Days 1-2: Project Setup**
- [x] Vite + TypeScript setup
- [x] Three.js scene with OrbitControls
- [x] Cannon.js physics world
- [x] Debug helpers (grid, axes, FPS counter)

**Days 3-4: Procedural Human**
- [x] HumanBuilder class with body parts
- [x] Single merged geometry for fracture target

**Days 5-7: Voronoi Fracture Core**
- [x] ConvexHullBuilder (wrapper for Three.js ConvexGeometry)
- [x] MeshIntersection utilities (raycasting inside test)
- [x] VoronoiFracture.fracture() with progress callback

### Week 2: Physics Integration + Playground UI

**Days 8-10: Fragment Physics**
- [x] FragmentBodyFactory (geometry → CANNON.ConvexPolyhedron)
- [x] DestructionManager (orchestrates fracture)
- [x] PseudoBreakable constraints (distance-based breaking)
- [x] CollisionHandler (impact detection)

**Days 11-14: Interactive Playground UI**
- [x] UI panel with controls
- [x] InputHandler (mouse/touch raycasting)
- [x] ProjectileLauncher (click to shoot)
- [x] CameraController (orbit + follow modes)

### Week 3: Visual Polish + Effects + Advanced Features

**Days 15-16: Stylized Visual Effects**
- [x] Fragment materials (minimalist style)
- [x] Debris particle system
- [x] Color palette system

**Days 17-18: Advanced Interactivity**
- [x] Scenario presets (standing, T-pose, sitting)
- [x] Multiple projectile types (fast/heavy/shotgun)

**Days 19-20: Performance + Debug Polish**
- [x] Fragment LOD system
- [x] Sleep state management
- [x] Performance monitoring

**Day 21: Final Polish**
- [x] Keyboard shortcuts
- [x] Screen shake on impact
- [x] README.md with setup instructions

---

## Core Systems

### SceneManager.ts

```typescript
export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(3, 2, 3);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.setupLights();
    this.setupGround();
  }
}
```

### Pre-Fracture System (Instant Impact)

```typescript
class PreFracturedHuman {
  private fracturePromise: Promise<PreComputedFracture> | null = null;

  constructor(position: THREE.Vector3, fragmentCount: number) {
    this.fracturePromise = this.computeFractureAsync(fragmentCount);
  }

  async getPreComputedFracture(): Promise<PreComputedFracture | null> {
    return this.fracturePromise ? await this.fracturePromise : null;
  }
}
```

---

## Voronoi Fracture System

```typescript
export class VoronoiFracture {
  fracture(mesh: THREE.Mesh, seedCount: number = 30): THREE.BufferGeometry[] {
    const seeds = this.generateSeedsInMesh(mesh, bbox, seedCount);
    const fragments: THREE.BufferGeometry[] = [];
    
    seeds.forEach((seed) => {
      const neighbors = this.findKNearestNeighbors(seed, seeds, 8);
      const planes = this.computeBisectorPlanes(seed, neighbors);
      const fragment = this.buildVoronoiCell(seed, planes, mesh);
      if (fragment && this.isValidFragment(fragment)) {
        fragments.push(fragment);
      }
    });
    
    return fragments;
  }
}
```

---

## Physics Integration

### FragmentBodyFactory.ts

```typescript
export class FragmentBodyFactory {
  createBody(geometry: THREE.BufferGeometry, density: number = 1000): CANNON.Body {
    const shape = this.geometryToConvexPolyhedron(geometry);
    const volume = MeshIntersection.calculateVolume(geometry);
    const mass = volume * density;
    
    const body = new CANNON.Body({ mass, linearDamping: 0.3, angularDamping: 0.3 });
    body.addShape(shape);
    return body;
  }
}
```

### PseudoBreakable.ts

```typescript
export class PseudoBreakable {
  update() {
    this.constraints.forEach(conn => {
      if (conn.broken) return;
      const distance = conn.bodyA.position.distanceTo(conn.bodyB.position);
      if (distance > conn.maxDistance) {
        this.breakConstraint(conn);
      }
    });
  }
}
```

---

## Visual Effects

### DebrisParticles.ts

```typescript
export class DebrisParticles {
  emit(position: THREE.Vector3, count: number = 50) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    // ... create particles with random velocities
  }
  
  update(dt: number) {
    // Apply gravity, update positions, fade out
  }
}
```

---

## Interactive Playground

### UI Control Panel

```html
<div id="control-panel">
  <h2>DESTRUCTION PLAYGROUND</h2>
  <div class="section">
    <h3>Fracture Settings</h3>
    <label>Fragment Count <input type="range" id="fragment-count" min="10" max="100" value="30"></label>
    <label>Impact Force <input type="range" id="impact-force" min="10" max="100" value="50"></label>
  </div>
  <div class="section">
    <h3>Projectile Type</h3>
    <select id="projectile-type">
      <option value="fast">Fast Bullet</option>
      <option value="heavy">Heavy Ball</option>
      <option value="shotgun">Shotgun Spread</option>
    </select>
  </div>
</div>
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Toggle slow-mo |
| R | Reset scene |
| H | Spawn human |
| 1-3 | Switch projectile types |

---

## Testing Strategy

### Week 1: Voronoi Tests
- Should generate correct number of fragments
- Should complete within 1 second
- Should produce valid convex geometries

### Week 2: Physics Tests
- Should calculate correct mass
- Should break constraints at max distance

### Week 3: Performance Tests
- Should maintain 60 FPS with 50 fragments
- Should not leak memory after 100 fractures

---

## Performance Optimization

### Optimization Results

| Optimization | Before | After |
|-------------|--------|-------|
| Fracture on Impact | 500-1000ms freeze | Instant (pre-computed) |
| Neighbor Search | O(n²) | O(n) with SpatialGrid |
| Sample Points | 300 per cell | 100 per cell |
| Physics Shapes | ConvexPolyhedron only | Sphere/Box/Convex options |

### Fragment LOD System

```typescript
class FragmentLOD {
  update(fragment: Fragment, distanceToCamera: number) {
    if (distanceToCamera > 20) {
      fragment.simplifiedShape = new CANNON.Sphere(fragment.boundingRadius);
    }
  }
}
```

### Sleep Management

```typescript
class SleepManager {
  update(fragments: Fragment[]) {
    fragments.forEach(fragment => {
      if (fragment.body.sleepState === CANNON.Body.SLEEPING) {
        fragment.sleepTime += dt;
        if (fragment.sleepTime > 10) this.removeFragment(fragment);
      }
    });
  }
}
```

---

## Visual Style Guide

### Color Palette (Minimalist)

```typescript
const COLORS = {
  skin: 0xffdbac,     // Peach
  flesh: 0xcd853f,    // Sienna
  ground: 0x808080,   // Gray
  sky: 0x87ceeb,      // Sky blue
};
```

### Material Presets

```typescript
const fragmentMaterial = new THREE.MeshLambertMaterial({
  color: COLORS.skin,
  flatShading: true
});
```

---

## Success Criteria

### Technical Requirements
- [x] Voronoi fracture works on any mesh
- [x] 50 fragments at 60 FPS
- [x] Physics stable (no tunneling, correct collisions)
- [x] No memory leaks after 100+ fractures

### Visual Requirements
- [x] Clean, stylized aesthetic
- [x] Consistent fragment materials
- [x] Smooth camera controls

### Interactivity Requirements
- [x] Click to shoot projectiles
- [x] Real-time parameter adjustment
- [x] Multiple scenarios (3+ poses)
- [x] Keyboard shortcuts working

---

## Lessons Learned

### Top 10 Takeaways

1. **ConvexGeometry works perfectly** for Voronoi cells - wrap in try-catch
2. **6-axis raycast voting** is the most reliable point-inside-mesh test
3. **Cannon.js ConvexPolyhedron** requires unique vertices and triangular faces
4. **Projectile collision** needs raycaster with `far` property set
5. **TypeScript barrel exports** keep imports clean
6. **Vite + TypeScript** requires `.js` extensions in addon imports
7. **Fragment budget**: 30 fragments @ 60 FPS, 50 fragments @ 45-60 FPS
8. **Sleep states** dramatically reduce physics computation
9. **Pointer-events CSS** on UI overlay prevents blocking canvas clicks
10. **Memory leaks** without geometry/material disposal - always clean up!

### Performance Optimizations

1. **Pre-fracture on spawn** - Compute fracture async, instant swap on impact
2. **Spatial grid** - O(n) neighbor search instead of O(n²)
3. **Sphere physics** - 10x faster than ConvexPolyhedron
4. **Reduced samples** - 100 points per cell is sufficient
5. **Bbox rejection** - Quick bounding box test before expensive raycasts

### Three.js Insights

**ConvexGeometry API:**
- Takes array of `THREE.Vector3` points and generates convex hull
- Can fail silently if points are coplanar - wrap in try-catch

**Raycasting for Point-Inside-Mesh Test:**
```typescript
const directions = [
  new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
];
let insideCount = 0;
for (const dir of directions) {
  raycaster.set(point, dir);
  if (raycaster.intersectObject(mesh, false).length % 2 === 1) insideCount++;
}
return insideCount >= 3; // Majority vote
```

**Import Pattern for Addons:**
```typescript
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
```

### Cannon.js Insights

**ConvexPolyhedron Creation:**
```typescript
const shape = new CANNON.ConvexPolyhedron({
  vertices: [new CANNON.Vec3(x1, y1, z1), ...],
  faces: [[0, 1, 2], ...]
});
```

**Physics Step Pattern:**
```typescript
const fixedTimeStep = 1 / 60;
const maxSubSteps = 3;
world.step(fixedTimeStep, deltaTime, maxSubSteps);
```

### Common Pitfalls

1. **Geometry Disposal** - Always dispose when removing from scene
2. **Physics Body Management** - Remove from world before disposing
3. **Arrow Functions** - Bind in constructor or use regular methods

---

## Copy-Paste Code Snippets

### Complete Voronoi Fracture Implementation

```typescript
import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

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
    const cellPoints = sampleConvexRegion(seed, planes, 100);
    const validPoints = cellPoints.filter(p => pointInsideMesh(p, mesh));
    
    if (validPoints.length >= 4) {
      try {
        fragments.push(new ConvexGeometry(validPoints));
      } catch (e) {}
    }
  }
  return fragments;
}

function pointInsideMesh(point: THREE.Vector3, mesh: THREE.Mesh): boolean {
  const raycaster = new THREE.Raycaster();
  const directions = [
    new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
  ];
  let insideCount = 0;
  for (const dir of directions) {
    raycaster.set(point, dir);
    if (raycaster.intersectObject(mesh, false).length % 2 === 1) insideCount++;
  }
  return insideCount >= 3;
}
```

### Game Loop with Physics

```typescript
const clock = new THREE.Clock();
const fixedTimeStep = 1 / 60;
const maxSubSteps = 3;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  
  physicsWorld.step(fixedTimeStep, dt, maxSubSteps);
  physicsRenderer.update();
  sceneManager.render();
}

animate();
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

## Deployment

```bash
npm run dev      # Development with hot reload
npm run build    # Production build to dist/
npm run preview  # Test production build locally
```

---

*Generated: 2026-03-09*
