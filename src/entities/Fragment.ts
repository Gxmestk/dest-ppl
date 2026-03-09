import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Fragment {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  seedPoint: THREE.Vector3;
  sleepTime: number = 0;

  constructor(
    geometry: THREE.BufferGeometry,
    body: CANNON.Body,
    seedPoint: THREE.Vector3,
    color: THREE.Color
  ) {
    this.seedPoint = seedPoint;
    this.body = body;
    
    const material = new THREE.MeshLambertMaterial({
      color,
      flatShading: true
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.set(body.position.x, body.position.y, body.position.z);
    this.mesh.quaternion.set(
      body.quaternion.x,
      body.quaternion.y,
      body.quaternion.z,
      body.quaternion.w
    );
  }

  update(): void {
    this.mesh.position.set(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );
    this.mesh.quaternion.set(
      this.body.quaternion.x,
      this.body.quaternion.y,
      this.body.quaternion.z,
      this.body.quaternion.w
    );
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
