import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export type ProjectileType = 'fast' | 'heavy' | 'shotgun';

export class Projectile {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  type: ProjectileType;
  active: boolean = true;

  private speed: number;
  private size: number;

  constructor(
    type: ProjectileType = 'fast',
    position: THREE.Vector3 = new THREE.Vector3(),
    direction: THREE.Vector3 = new THREE.Vector3(0, 0, 1)
  ) {
    this.type = type;
    
    switch (type) {
      case 'fast':
        this.speed = 50;
        this.size = 0.05;
        break;
      case 'heavy':
        this.speed = 20;
        this.size = 0.15;
        break;
      case 'shotgun':
        this.speed = 40;
        this.size = 0.03;
        break;
      default:
        this.speed = 30;
        this.size = 0.05;
    }

    const geometry = new THREE.SphereGeometry(this.size, 8, 8);
    const material = new THREE.MeshLambertMaterial({
      color: type === 'fast' ? 0xff0000 : type === 'heavy' ? 0x00ff00 : 0xffff00
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.castShadow = true;

    const shape = new CANNON.Sphere(this.size);
    const mass = type === 'heavy' ? 10 : type === 'shotgun' ? 0.5 : 2;
    
    this.body = new CANNON.Body({
      mass,
      material: new CANNON.Material('projectile'),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      linearDamping: 0.1
    });
    this.body.addShape(shape);
    
    const velocity = direction.clone().normalize().multiplyScalar(this.speed);
    this.body.velocity.set(velocity.x, velocity.y, velocity.z);
  }

  update(): void {
    this.mesh.position.set(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
