import * as THREE from 'three';
import { HumanBuilder } from '../geometry/HumanBuilder';
import { VoronoiFracture, type FractureResult } from '../geometry/VoronoiFracture';

export interface PreComputedFracture {
  results: FractureResult[];
  fragmentCount: number;
}

export class PreFracturedHuman {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  isFractured: boolean = false;
  
  private material: THREE.Material;
  private preComputedFracture: PreComputedFracture | null = null;
  private fracturePromise: Promise<PreComputedFracture> | null = null;

  constructor(
    position: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    private fragmentCount: number = 30
  ) {
    const builder = new HumanBuilder();
    this.geometry = builder.buildMerged();
    
    this.material = new THREE.MeshLambertMaterial({
      color: 0xffdbac,
      flatShading: true
    });
    
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.name = 'human';
    
    this.startPreFracture();
  }

  private startPreFracture(): void {
    this.fracturePromise = this.computeFractureAsync();
  }

  private async computeFractureAsync(): Promise<PreComputedFracture> {
    const voronoi = new VoronoiFracture();
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const results = voronoi.fracture(this.mesh, this.fragmentCount);
    
    return {
      results,
      fragmentCount: results.length
    };
  }

  async getPreComputedFracture(): Promise<PreComputedFracture | null> {
    if (this.preComputedFracture) {
      return this.preComputedFracture;
    }
    
    if (this.fracturePromise) {
      this.preComputedFracture = await this.fracturePromise;
      this.fracturePromise = null;
      return this.preComputedFracture;
    }
    
    return null;
  }

  hasPreComputedFracture(): boolean {
    return this.preComputedFracture !== null;
  }

  setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    
    if (this.preComputedFracture) {
      for (const result of this.preComputedFracture.results) {
        result.geometry.dispose();
      }
      this.preComputedFracture = null;
    }
  }
}
