import * as THREE from 'three';
import { HumanBuilder } from '../geometry/HumanBuilder';

export class Human {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  isFractured: boolean = false;
  
  private material: THREE.Material;

  constructor(position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
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
  }

  setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
