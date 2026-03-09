import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export interface CollisionEvent {
  body: CANNON.Body;
  impactVelocity: number;
  contactPoint: THREE.Vector3;
  contactNormal: THREE.Vector3;
}

export type CollisionCallback = (event: CollisionEvent) => void;

export class CollisionHandler {
  private callbacks: Map<CANNON.Body, CollisionCallback[]> = new Map();
  private threshold: number = 2;

  constructor(private world: CANNON.World) {
    this.setupCollisionEvents();
  }

  private setupCollisionEvents(): void {
    this.world.addEventListener('postStep', () => {
      this.checkCollisions();
    });
  }

  private checkCollisions(): void {
    for (const contact of this.world.contacts) {
      const bodyA = contact.bi;
      const bodyB = contact.bj;
      
      if (bodyA.mass === 0 && bodyB.mass === 0) continue;
      
      const impactVelocity = this.calculateImpactVelocity(contact);
      
      if (impactVelocity < this.threshold) continue;
      
      const contactPoint = this.getContactPoint(contact);
      const contactNormal = this.getContactNormal(contact);
      
      const callbacksA = this.callbacks.get(bodyA);
      if (callbacksA) {
        const event: CollisionEvent = {
          body: bodyB,
          impactVelocity,
          contactPoint,
          contactNormal
        };
        callbacksA.forEach(cb => cb(event));
      }
      
      const callbacksB = this.callbacks.get(bodyB);
      if (callbacksB) {
        const event: CollisionEvent = {
          body: bodyA,
          impactVelocity,
          contactPoint: contactPoint.clone().negate(),
          contactNormal: contactNormal.clone().negate()
        };
        callbacksB.forEach(cb => cb(event));
      }
    }
  }

  private calculateImpactVelocity(contact: CANNON.ContactEquation): number {
    const bodyA = contact.bi;
    const bodyB = contact.bj;
    
    const relVel = new CANNON.Vec3();
    bodyA.velocity.vsub(bodyB.velocity, relVel);
    
    const normal = contact.ni;
    const impactSpeed = Math.abs(relVel.dot(normal));
    
    return impactSpeed;
  }

  private getContactPoint(contact: CANNON.ContactEquation): THREE.Vector3 {
    const point = contact.ri || new CANNON.Vec3();
    return new THREE.Vector3(point.x, point.y, point.z);
  }

  private getContactNormal(contact: CANNON.ContactEquation): THREE.Vector3 {
    const normal = contact.ni || new CANNON.Vec3(0, 1, 0);
    return new THREE.Vector3(normal.x, normal.y, normal.z);
  }

  register(body: CANNON.Body, callback: CollisionCallback): void {
    if (!this.callbacks.has(body)) {
      this.callbacks.set(body, []);
    }
    this.callbacks.get(body)!.push(callback);
  }

  unregister(body: CANNON.Body): void {
    this.callbacks.delete(body);
  }

  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }
}
