import * as THREE from 'three';

export class FractureEffect {
  private ring: THREE.Mesh | null = null;
  private flash: THREE.PointLight | null = null;
  private duration: number = 0.5;
  private elapsed: number = 0;
  private active: boolean = false;
  private initialIntensity: number = 5;

  constructor(private scene: THREE.Scene) {}

  play(position: THREE.Vector3, intensity: number = 1): void {
    this.elapsed = 0;
    this.active = true;
    
    this.createRing(position, intensity);
    this.createFlash(position, intensity);
  }

  private createRing(position: THREE.Vector3, intensity: number): void {
    if (this.ring) {
      this.scene.remove(this.ring);
      this.ring.geometry.dispose();
      (this.ring.material as THREE.Material).dispose();
    }
    
    const geometry = new THREE.RingGeometry(0.01, 0.1 * intensity, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff6347,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    this.ring = new THREE.Mesh(geometry, material);
    this.ring.position.copy(position);
    this.ring.lookAt(new THREE.Vector3(0, 0, 0).sub(position).normalize());
    this.scene.add(this.ring);
  }

  private createFlash(position: THREE.Vector3, intensity: number): void {
    if (this.flash) {
      this.scene.remove(this.flash);
    }
    
    this.flash = new THREE.PointLight(0xff6347, this.initialIntensity * intensity, 5);
    this.flash.position.copy(position);
    this.scene.add(this.flash);
  }

  update(dt: number): void {
    if (!this.active) return;
    
    this.elapsed += dt;
    const t = this.elapsed / this.duration;
    
    if (t >= 1) {
      this.stop();
      return;
    }
    
    if (this.ring) {
      const scale = 1 + t * 3;
      this.ring.scale.setScalar(scale);
      (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t);
    }
    
    if (this.flash) {
      this.flash.intensity = this.initialIntensity * (1 - t);
    }
  }

  private stop(): void {
    this.active = false;
    
    if (this.ring) {
      this.scene.remove(this.ring);
      this.ring.geometry.dispose();
      (this.ring.material as THREE.Material).dispose();
      this.ring = null;
    }
    
    if (this.flash) {
      this.scene.remove(this.flash);
      this.flash = null;
    }
  }

  clear(): void {
    this.stop();
  }
}
