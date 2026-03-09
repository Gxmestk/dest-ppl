import * as THREE from 'three';
import { HumanBuilder } from '../geometry/HumanBuilder';
import { VoronoiFracture, type FractureResult } from '../geometry/VoronoiFracture';

export interface BodyPart {
  name: string;
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  isFractured: boolean;
  preComputedFracture: FractureResult[] | null;
}

export class CompositeHuman {
  parts: Map<string, BodyPart> = new Map();
  group: THREE.Group;
  position: THREE.Vector3;
  isFullyFractured: boolean = false;
  
  private material: THREE.Material;
  private builder: HumanBuilder;

  constructor(position: THREE.Vector3 = new THREE.Vector3(0, 0, 0), private fragmentCount: number = 30) {
    this.position = position;
    this.builder = new HumanBuilder();
    
    this.material = new THREE.MeshLambertMaterial({
      color: 0xffdbac,
      flatShading: true
    });
    
    this.group = new THREE.Group();
    this.group.position.copy(position);
    
    this.buildBodyParts();
  }

  private buildBodyParts(): void {
    const partConfigs = this.builder.getBodyParts();
    
    for (const config of partConfigs) {
      const mesh = new THREE.Mesh(config.geometry, this.material);
      mesh.position.copy(config.position);
      mesh.rotation.copy(config.rotation);
      mesh.scale.copy(config.scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = config.name;
      mesh.userData.bodyPartName = config.name;
      
      this.group.add(mesh);
      
      this.parts.set(config.name, {
        name: config.name,
        mesh,
        geometry: config.geometry,
        isFractured: false,
        preComputedFracture: null
      });
    }
  }

  async preFractureAll(): Promise<void> {
    const voronoi = new VoronoiFracture();
    const promises: Promise<void>[] = [];
    
    for (const [name, _part] of this.parts) {
      promises.push(this.preFracturePart(name, voronoi));
    }
    
    await Promise.all(promises);
  }

  async preFracturePart(partName: string, voronoi?: VoronoiFracture): Promise<void> {
    const part = this.parts.get(partName);
    if (!part || part.isFractured || part.preComputedFracture) return;
    
    await new Promise(resolve => setTimeout(resolve, 1));
    
    if (!voronoi) voronoi = new VoronoiFracture();
    
    const seedCount = Math.max(8, Math.floor(this.fragmentCount / 3));
    part.preComputedFracture = voronoi.fracture(part.mesh, seedCount);
  }

  getPart(partName: string): BodyPart | undefined {
    return this.parts.get(partName);
  }

  getPartMesh(partName: string): THREE.Mesh | undefined {
    return this.parts.get(partName)?.mesh;
  }

  getAllMeshes(): THREE.Mesh[] {
    return Array.from(this.parts.values()).map(p => p.mesh);
  }

  getHitPart(intersection: THREE.Intersection): BodyPart | null {
    const mesh = intersection.object as THREE.Mesh;
    const partName = mesh.userData.bodyPartName;
    return this.parts.get(partName) || null;
  }

  removePartFromScene(partName: string): void {
    const part = this.parts.get(partName);
    if (part) {
      this.group.remove(part.mesh);
      part.isFractured = true;
    }
  }

  isAllFractured(): boolean {
    for (const _part of this.parts.values()) {
      if (!_part.isFractured) return false;
    }
    return true;
  }

  setPosition(position: THREE.Vector3): void {
    this.position.copy(position);
    this.group.position.copy(position);
  }

  dispose(): void {
    for (const part of this.parts.values()) {
      part.geometry.dispose();
    }
    this.material.dispose();
    this.parts.clear();
  }
}
