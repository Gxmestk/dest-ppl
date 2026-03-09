import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { Fragment } from '../entities/Fragment';

export class SleepManager {
  private maxSleepTime: number = 10;
  private velocityThreshold: number = 0.1;

  constructor(
    private scene: THREE.Scene,
    private world: CANNON.World
  ) {}

  update(fragments: Fragment[], dt: number): Fragment[] {
    const toRemove: Fragment[] = [];
    
    for (const fragment of fragments) {
      const velocity = fragment.body.velocity;
      const angularVelocity = fragment.body.angularVelocity;
      
      const speed = Math.sqrt(
        velocity.x * velocity.x + 
        velocity.y * velocity.y + 
        velocity.z * velocity.z
      );
      
      const angularSpeed = Math.sqrt(
        angularVelocity.x * angularVelocity.x +
        angularVelocity.y * angularVelocity.y +
        angularVelocity.z * angularVelocity.z
      );
      
      if (speed < this.velocityThreshold && angularSpeed < this.velocityThreshold) {
        fragment.sleepTime += dt;
        
        if (fragment.sleepTime > this.maxSleepTime) {
          toRemove.push(fragment);
        }
      } else {
        fragment.sleepTime = 0;
      }
    }
    
    for (const fragment of toRemove) {
      this.scene.remove(fragment.mesh);
      this.world.removeBody(fragment.body);
      fragment.dispose();
    }
    
    return toRemove;
  }

  setMaxSleepTime(time: number): void {
    this.maxSleepTime = time;
  }
}
