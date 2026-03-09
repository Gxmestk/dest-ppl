import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

export interface FractureResult {
  geometry: THREE.BufferGeometry;
  seedPoint: THREE.Vector3;
}

class SpatialGrid {
  private cells: Map<string, THREE.Vector3[]> = new Map();
  private cellSize: number;
  
  constructor(cellSize: number = 0.3) {
    this.cellSize = cellSize;
  }
  
  private getKey(point: THREE.Vector3): string {
    const x = Math.floor(point.x / this.cellSize);
    const y = Math.floor(point.y / this.cellSize);
    const z = Math.floor(point.z / this.cellSize);
    return `${x},${y},${z}`;
  }
  
  insert(point: THREE.Vector3): void {
    const key = this.getKey(point);
    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    this.cells.get(key)!.push(point);
  }
  
  getNeighbors(point: THREE.Vector3, maxDistance: number): THREE.Vector3[] {
    const neighbors: THREE.Vector3[] = [];
    const cellRadius = Math.ceil(maxDistance / this.cellSize);
    const cx = Math.floor(point.x / this.cellSize);
    const cy = Math.floor(point.y / this.cellSize);
    const cz = Math.floor(point.z / this.cellSize);
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          const cell = this.cells.get(key);
          if (cell) {
            neighbors.push(...cell);
          }
        }
      }
    }
    
    return neighbors;
  }
}

export class VoronoiFracture {
  fracture(
    mesh: THREE.Mesh, 
    seedCount: number = 30,
    onProgress?: (percent: number) => void
  ): FractureResult[] {
    const bbox = new THREE.Box3().setFromObject(mesh);
    const seeds = this.generateSeedsInMesh(mesh, bbox, seedCount);
    
    const spatialGrid = new SpatialGrid(0.3);
    for (const seed of seeds) {
      spatialGrid.insert(seed);
    }
    
    const fragments: FractureResult[] = [];
    
    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i];
      const neighbors = this.findKNearestNeighborsOptimized(seed, seeds, spatialGrid, Math.min(8, seeds.length - 1));
      const planes = this.computeBisectorPlanes(seed, neighbors);
      
      const fragment = this.buildVoronoiCell(seed, planes, mesh, bbox, 100);
      
      if (fragment && this.isValidFragment(fragment)) {
        fragments.push({
          geometry: fragment,
          seedPoint: seed.clone()
        });
      }
      
      onProgress?.((i / seeds.length) * 100);
    }
    
    return fragments;
  }

  private generateSeedsInMesh(
    mesh: THREE.Mesh, 
    bbox: THREE.Box3, 
    count: number
  ): THREE.Vector3[] {
    const seeds: THREE.Vector3[] = [];
    const maxAttempts = count * 20;
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    for (let i = 0; i < maxAttempts && seeds.length < count; i++) {
      const candidate = new THREE.Vector3(
        center.x + THREE.MathUtils.randFloatSpread(size.x * 0.9),
        center.y + THREE.MathUtils.randFloatSpread(size.y * 0.9),
        center.z + THREE.MathUtils.randFloatSpread(size.z * 0.9)
      );
      
      if (this.pointInsideMeshOptimized(candidate, mesh, bbox)) {
        seeds.push(candidate);
      }
    }
    
    return seeds;
  }

  private pointInsideMeshOptimized(
    point: THREE.Vector3, 
    mesh: THREE.Mesh,
    bbox: THREE.Box3
  ): boolean {
    if (!bbox.containsPoint(point)) {
      return false;
    }
    
    const raycaster = new THREE.Raycaster();
    raycaster.far = 100;
    
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ];
    
    let insideCount = 0;
    
    for (const dir of directions) {
      raycaster.set(point, dir);
      const intersects = raycaster.intersectObject(mesh, false);
      
      if (intersects.length % 2 === 1) {
        insideCount++;
      }
    }
    
    return insideCount >= 3;
  }

  private computeBisectorPlanes(
    seed: THREE.Vector3, 
    neighbors: THREE.Vector3[]
  ): THREE.Plane[] {
    return neighbors.map(neighbor => {
      const midpoint = seed.clone().add(neighbor).multiplyScalar(0.5);
      const normal = neighbor.clone().sub(seed).normalize();
      return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, midpoint);
    });
  }

  private buildVoronoiCell(
    seed: THREE.Vector3,
    planes: THREE.Plane[],
    originalMesh: THREE.Mesh,
    bbox: THREE.Box3,
    sampleCount: number
  ): THREE.BufferGeometry | null {
    const bboxSize = new THREE.Vector3();
    bbox.getSize(bboxSize);
    const maxDim = Math.max(bboxSize.x, bboxSize.y, bboxSize.z);
    
    const adaptiveRadius = Math.max(0.05, Math.min(0.3, maxDim * 0.6));
    
    const interiorPoints: THREE.Vector3[] = [];
    const maxIterations = sampleCount * 10;
    
    for (let i = 0; i < maxIterations; i++) {
      const candidate = seed.clone().add(
        new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(adaptiveRadius * 2),
          THREE.MathUtils.randFloatSpread(adaptiveRadius * 2),
          THREE.MathUtils.randFloatSpread(adaptiveRadius * 2)
        )
      );
      
      const insideAllPlanes = planes.length === 0 || planes.every(plane => 
        plane.distanceToPoint(candidate) <= 0.005
      );
      
      if (insideAllPlanes && this.quickPointInsideMesh(candidate, originalMesh, bbox)) {
        interiorPoints.push(candidate);
        if (interiorPoints.length >= sampleCount) break;
      }
    }
    
    if (interiorPoints.length < 4) return null;
    
    try {
      const convexGeo = new ConvexGeometry(interiorPoints);
      return convexGeo;
    } catch {
      return null;
    }
  }

  private quickPointInsideMesh(
    point: THREE.Vector3, 
    mesh: THREE.Mesh,
    bbox: THREE.Box3
  ): boolean {
    if (!bbox.containsPoint(point)) {
      return false;
    }
    
    const raycaster = new THREE.Raycaster();
    raycaster.set(point, new THREE.Vector3(1, 0, 0));
    const intersects = raycaster.intersectObject(mesh, false);
    
    return intersects.length % 2 === 1;
  }

  private findKNearestNeighborsOptimized(
    point: THREE.Vector3, 
    _allPoints: THREE.Vector3[],
    grid: SpatialGrid,
    k: number
  ): THREE.Vector3[] {
    const searchRadius = 0.6;
    const nearbyPoints = grid.getNeighbors(point, searchRadius);
    
    const distances = nearbyPoints
      .filter(p => !p.equals(point))
      .map(p => ({
        point: p,
        distance: point.distanceTo(p)
      }))
      .sort((a, b) => a.distance - b.distance);
    
    return distances.slice(0, k).map(d => d.point);
  }

  private isValidFragment(geometry: THREE.BufferGeometry): boolean {
    const positions = geometry.attributes.position;
    return positions && positions.count >= 4;
  }
}
