import * as THREE from 'three';

export class DebrisParticles {
  private particles: THREE.Points | null = null;
  private velocities: THREE.Vector3[] = [];
  private lifetimes: number[] = [];
  private maxLifetime: number = 2;

  constructor(private scene: THREE.Scene) {}

  emit(position: THREE.Vector3, count: number = 30, color: number = 0x8b4513): void {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    
    this.velocities = [];
    this.lifetimes = [];
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.2;
      
      this.velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 6,
        (Math.random() - 0.5) * 8
      ));
      
      this.lifetimes.push(this.maxLifetime);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color,
      size: 0.03,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  update(dt: number): void {
    if (!this.particles) return;
    
    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    let allDead = true;
    
    for (let i = 0; i < this.lifetimes.length; i++) {
      if (this.lifetimes[i] <= 0) continue;
      
      allDead = false;
      
      this.velocities[i].y -= 9.82 * dt;
      
      positions[i * 3] += this.velocities[i].x * dt;
      positions[i * 3 + 1] += this.velocities[i].y * dt;
      positions[i * 3 + 2] += this.velocities[i].z * dt;
      
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 0;
        this.velocities[i].y *= -0.3;
        this.velocities[i].x *= 0.8;
        this.velocities[i].z *= 0.8;
      }
      
      this.lifetimes[i] -= dt;
    }
    
    this.particles.geometry.attributes.position.needsUpdate = true;
    
    const material = this.particles.material as THREE.PointsMaterial;
    material.opacity = Math.max(0, this.lifetimes[0] / this.maxLifetime);
    
    if (allDead) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      material.dispose();
      this.particles = null;
    }
  }

  clear(): void {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
      this.particles = null;
    }
    this.velocities = [];
    this.lifetimes = [];
  }
}
