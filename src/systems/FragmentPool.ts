import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { Fragment } from '../entities/Fragment';

export class FragmentPool {
  private pool: Fragment[] = [];
  private maxPoolSize: number = 100;

  constructor(
    private scene: THREE.Scene,
    private world: CANNON.World
  ) {}

  acquire(): Fragment | null {
    return this.pool.pop() || null;
  }

  release(fragment: Fragment): void {
    if (this.pool.length >= this.maxPoolSize) {
      fragment.dispose();
      return;
    }
    
    this.scene.remove(fragment.mesh);
    this.world.removeBody(fragment.body);
    fragment.body.position.set(0, -100, 0);
    fragment.body.velocity.set(0, 0, 0);
    fragment.body.angularVelocity.set(0, 0, 0);
    
    this.pool.push(fragment);
  }

  clear(): void {
    for (const fragment of this.pool) {
      fragment.dispose();
    }
    this.pool = [];
  }

  get poolSize(): number {
    return this.pool.length;
  }
}
