import * as THREE from 'three';
import type { ProjectileType } from '../entities/Projectile';

export class InputHandler {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private projectileType: ProjectileType = 'fast';

  constructor(
    private camera: THREE.Camera,
    private renderer: THREE.WebGLRenderer
  ) {
    this.raycaster = new THREE.Raycaster();
  }

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  getMousePosition(event: MouseEvent): THREE.Vector2 | null {
    if (!event) return null;
    this.mouse = new THREE.Vector2();
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    return this.mouse;
  }

  getIntersections(objects: THREE.Object3D[]): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.mouse!, this.camera);
    return this.raycaster.intersectObjects(objects);
  }

  getWorldPosition(event: MouseEvent, planeY: number = 0): THREE.Vector3 | null {
    this.getMousePosition(event);
    this.raycaster.setFromCamera(this.mouse!, this.camera);
    
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    const intersection = new THREE.Vector3();
    
    if (this.raycaster.ray.intersectPlane(plane, intersection)) {
      return intersection;
    }
    return null;
  }

  getDirectionToScreenCenter(): THREE.Vector3 {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);
    return direction;
  }

  setProjectileType(type: ProjectileType): void {
    this.projectileType = type;
  }

  get projectileTypeValue(): ProjectileType {
    return this.projectileType;
  }
}
