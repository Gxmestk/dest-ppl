import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Projectile, type ProjectileType } from '../entities/Projectile';

export class ProjectileLauncher {
  private projectiles: Projectile[] = [];
  private projectileType: ProjectileType = 'fast';

  constructor(
    private scene: THREE.Scene,
    private world: CANNON.World
  ) {}

  setProjectileType(type: ProjectileType): void {
    this.projectileType = type;
  }

  launch(startPoint: THREE.Vector3, direction: THREE.Vector3): Projectile[] {
    const projectiles: Projectile[] = [];
    
    if (this.projectileType === 'shotgun') {
      for (let i = 0; i < 5; i++) {
        const spreadAngle = 0.1;
        const spreadDir = direction.clone();
        spreadDir.x += (Math.random() - 0.5) * spreadAngle;
        spreadDir.y += (Math.random() - 0.5) * spreadAngle;
        spreadDir.z += (Math.random() - 0.5) * spreadAngle;
        spreadDir.normalize();
        
        const projectile = new Projectile(this.projectileType, startPoint, spreadDir);
        projectiles.push(projectile);
        this.scene.add(projectile.mesh);
        this.world.addBody(projectile.body);
      }
    } else {
      const projectile = new Projectile(this.projectileType, startPoint, direction);
      projectiles.push(projectile);
      this.scene.add(projectile.mesh);
      this.world.addBody(projectile.body);
    }
    
    this.projectiles.push(...projectiles);
    return projectiles;
  }

  update(): void {
    for (const projectile of this.projectiles) {
      projectile.update();
    }
  }

  clear(): void {
    for (const projectile of this.projectiles) {
      this.scene.remove(projectile.mesh);
      this.world.removeBody(projectile.body);
      projectile.dispose();
    }
    this.projectiles = [];
  }

  getProjectileCount(): number {
    return this.projectiles.length;
  }
}
