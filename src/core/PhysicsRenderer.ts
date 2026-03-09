import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class PhysicsRenderer {
  private meshToBody: Map<THREE.Mesh, CANNON.Body> = new Map();

  register(mesh: THREE.Mesh, body: CANNON.Body): void {
    this.meshToBody.set(mesh, body);
  }

  unregister(mesh: THREE.Mesh): void {
    this.meshToBody.delete(mesh);
  }

  sync(): void {
    this.meshToBody.forEach((body, mesh) => {
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(
        body.quaternion.x,
        body.quaternion.y,
        body.quaternion.z,
        body.quaternion.w
      );
    });
  }

  clear(): void {
    this.meshToBody.clear();
  }
}
