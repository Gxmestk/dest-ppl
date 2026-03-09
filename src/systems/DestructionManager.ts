import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { VoronoiFracture } from '../geometry/VoronoiFracture';
import { FragmentBodyFactory } from '../physics/FragmentBodyFactory';
import { PseudoBreakable } from '../physics/PseudoBreakable';
import { Fragment } from '../entities/Fragment';
import type { Human } from '../entities/Human';
import type { PreFracturedHuman, PreComputedFracture } from '../entities/PreFracturedHuman';
import type { CompositeHuman, BodyPart } from '../entities/CompositeHuman';

export class DestructionManager {
  private bodyFactory = new FragmentBodyFactory('sphere');
  private breakables: PseudoBreakable;
  private fragments: Fragment[] = [];

  constructor(
    private scene: THREE.Scene,
    private world: CANNON.World
  ) {
    this.breakables = new PseudoBreakable(world);
  }

  async fracturePreComputed(
    human: PreFracturedHuman,
    impactPoint: THREE.Vector3,
    impactForce: number
  ): Promise<Fragment[]> {
    const preComputed = await human.getPreComputedFracture();
    
    if (!preComputed) {
      console.warn('No pre-computed fracture available');
      return [];
    }
    
    return this.applyFracture(human, preComputed, impactPoint, impactForce);
  }

  fractureHuman(
    human: Human,
    impactPoint: THREE.Vector3,
    impactForce: number,
    onProgress?: (percent: number) => void
  ): Fragment[] {
    const voronoi = new VoronoiFracture();
    const fragmentCount = Math.min(50, Math.floor(impactForce / 2) + 10);
    
    const fractureResults = voronoi.fracture(human.mesh, fragmentCount, onProgress);
    
    return this.applyFractureFromResults(
      human.mesh,
      fractureResults,
      impactPoint,
      impactForce,
      () => { human.isFractured = true; }
    );
  }

  async fractureBodyPart(
    human: CompositeHuman,
    bodyPart: BodyPart,
    impactPoint: THREE.Vector3,
    impactForce: number
  ): Promise<Fragment[]> {
    if (bodyPart.isFractured) {
      return [];
    }
    
    if (!bodyPart.preComputedFracture) {
      await human.preFracturePart(bodyPart.name);
    }
    
    if (!bodyPart.preComputedFracture || bodyPart.preComputedFracture.length === 0) {
      console.warn(`No fracture data for part: ${bodyPart.name}`);
      return [];
    }
    
    human.removePartFromScene(bodyPart.name);
    
    const worldMatrix = new THREE.Matrix4();
    bodyPart.mesh.updateWorldMatrix(true, false);
    worldMatrix.copy(bodyPart.mesh.matrixWorld);
    
    const fragments = this.createFragmentsWithTransform(
      bodyPart.preComputedFracture,
      worldMatrix,
      impactPoint,
      impactForce
    );
    
    return fragments;
  }

  private applyFracture(
    human: PreFracturedHuman,
    preComputed: PreComputedFracture,
    impactPoint: THREE.Vector3,
    impactForce: number
  ): Fragment[] {
    this.scene.remove(human.mesh);
    human.isFractured = true;
    
    return this.createFragments(
      preComputed.results,
      human.mesh.position,
      impactPoint,
      impactForce
    );
  }

  private applyFractureFromResults(
    mesh: THREE.Mesh,
    fractureResults: Array<{ geometry: THREE.BufferGeometry; seedPoint: THREE.Vector3 }>,
    impactPoint: THREE.Vector3,
    impactForce: number,
    onRemove: () => void
  ): Fragment[] {
    this.scene.remove(mesh);
    onRemove();
    
    return this.createFragments(fractureResults, mesh.position, impactPoint, impactForce);
  }

  private createFragmentsWithTransform(
    fractureResults: Array<{ geometry: THREE.BufferGeometry; seedPoint: THREE.Vector3 }>,
    worldMatrix: THREE.Matrix4,
    impactPoint: THREE.Vector3,
    impactForce: number
  ): Fragment[] {
    const newFragments: Fragment[] = [];
    
    const palette = [
      0xffdbac, 0xe8c39e, 0xcea07e, 0xb08060,
      0x8b5a2b, 0xff6347, 0xcd853f, 0xd2691e
    ];

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    worldMatrix.decompose(position, quaternion, scale);

    for (const result of fractureResults) {
      const color = new THREE.Color(
        palette[Math.floor(Math.random() * palette.length)]
      );
      
      const worldSeedPoint = result.seedPoint.clone();
      worldSeedPoint.applyMatrix4(worldMatrix);
      
      const body = this.bodyFactory.createBody(
        result.geometry,
        500,
        worldSeedPoint
      );
      
      const fragment = new Fragment(
        result.geometry,
        body,
        result.seedPoint,
        color
      );
      
      fragment.mesh.position.copy(worldSeedPoint);
      fragment.mesh.quaternion.copy(quaternion);
      
      const direction = worldSeedPoint.clone().sub(impactPoint).normalize();
      const impulse = direction.multiplyScalar(impactForce * 0.3);
      body.applyImpulse(
        new CANNON.Vec3(impulse.x, impulse.y, impulse.z),
        new CANNON.Vec3(0, 0, 0)
      );
      
      this.scene.add(fragment.mesh);
      this.world.addBody(fragment.body);
      this.fragments.push(fragment);
      newFragments.push(fragment);
    }

    return newFragments;
  }

  private createFragments(
    fractureResults: Array<{ geometry: THREE.BufferGeometry; seedPoint: THREE.Vector3 }>,
    basePosition: THREE.Vector3,
    impactPoint: THREE.Vector3,
    impactForce: number
  ): Fragment[] {
    const newFragments: Fragment[] = [];
    
    const palette = [
      0xffdbac, 0xe8c39e, 0xcea07e, 0xb08060,
      0x8b5a2b, 0xff6347, 0xcd853f, 0xd2691e
    ];

    for (const result of fractureResults) {
      const color = new THREE.Color(
        palette[Math.floor(Math.random() * palette.length)]
      );
      
      const worldSeedPoint = result.seedPoint.clone().add(basePosition);
      
      const body = this.bodyFactory.createBody(
        result.geometry,
        500,
        worldSeedPoint
      );
      
      const fragment = new Fragment(
        result.geometry,
        body,
        result.seedPoint,
        color
      );
      
      const direction = worldSeedPoint.clone().sub(impactPoint).normalize();
      const impulse = direction.multiplyScalar(impactForce * 0.3);
      body.applyImpulse(
        new CANNON.Vec3(impulse.x, impulse.y, impulse.z),
        new CANNON.Vec3(0, 0, 0)
      );
      
      this.scene.add(fragment.mesh);
      this.world.addBody(fragment.body);
      this.fragments.push(fragment);
      newFragments.push(fragment);
    }

    return newFragments;
  }

  connectNearbyFragments(fragments: Fragment[], maxDistance: number = 0.25): void {
    for (let i = 0; i < fragments.length; i++) {
      for (let j = i + 1; j < fragments.length; j++) {
        const dist = fragments[i].mesh.position.distanceTo(fragments[j].mesh.position);
        
        if (dist < maxDistance) {
          this.breakables.addBreakableConnection(
            fragments[i].body,
            fragments[j].body,
            maxDistance * 2
          );
        }
      }
    }
  }

  update(): void {
    this.breakables.update();
    
    for (const fragment of this.fragments) {
      fragment.update();
    }
  }

  clear(): void {
    for (const fragment of this.fragments) {
      this.scene.remove(fragment.mesh);
      this.world.removeBody(fragment.body);
      fragment.dispose();
    }
    this.fragments = [];
    this.breakables.clear();
  }

  get fragmentCount(): number {
    return this.fragments.length;
  }

  get activeConstraintCount(): number {
    return this.breakables.activeCount;
  }
}
