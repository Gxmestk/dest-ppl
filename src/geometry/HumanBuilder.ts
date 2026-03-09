import * as THREE from 'three';

export interface BodyPartConfig {
  name: string;
  geometry: THREE.BufferGeometry;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

export class HumanBuilder {
  getBodyParts(): BodyPartConfig[] {
    const parts: BodyPartConfig[] = [];
    
    parts.push(...this.buildTorso());
    parts.push(...this.buildHead());
    parts.push(...this.buildArms());
    parts.push(...this.buildLegs());
    
    return parts;
  }

  buildMerged(): THREE.BufferGeometry {
    const parts = this.getBodyParts();
    const geometries: THREE.BufferGeometry[] = [];
    
    for (const part of parts) {
      const geo = part.geometry.clone();
      geo.rotateX(part.rotation.x);
      geo.rotateY(part.rotation.y);
      geo.rotateZ(part.rotation.z);
      geo.scale(part.scale.x, part.scale.y, part.scale.z);
      geo.translate(part.position.x, part.position.y, part.position.z);
      geometries.push(geo);
    }
    
    return this.mergeGeometries(geometries);
  }

  private buildTorso(): BodyPartConfig[] {
    return [
      {
        name: 'torso',
        geometry: new THREE.CapsuleGeometry(0.15, 0.35, 8, 16),
        position: new THREE.Vector3(0, 1.15, 0),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1)
      },
      {
        name: 'pelvis',
        geometry: new THREE.SphereGeometry(0.12, 16, 16),
        position: new THREE.Vector3(0, 0.75, 0),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 0.8, 0.8)
      }
    ];
  }

  private buildHead(): BodyPartConfig[] {
    return [
      {
        name: 'head',
        geometry: new THREE.SphereGeometry(0.14, 16, 16),
        position: new THREE.Vector3(0, 1.7, 0),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1.15, 1)
      },
      {
        name: 'neck',
        geometry: new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8),
        position: new THREE.Vector3(0, 1.52, 0),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1)
      }
    ];
  }

  private buildArms(): BodyPartConfig[] {
    const parts: BodyPartConfig[] = [];
    
    for (const side of [-1, 1]) {
      parts.push({
        name: side === -1 ? 'leftShoulder' : 'rightShoulder',
        geometry: new THREE.SphereGeometry(0.08, 8, 8),
        position: new THREE.Vector3(side * 0.28, 1.38, 0),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1)
      });
      
      parts.push({
        name: side === -1 ? 'leftUpperArm' : 'rightUpperArm',
        geometry: new THREE.CapsuleGeometry(0.045, 0.18, 4, 8),
        position: new THREE.Vector3(side * 0.35, 1.2, 0),
        rotation: new THREE.Euler(0, 0, side * 0.2),
        scale: new THREE.Vector3(1, 1, 1)
      });
      
      parts.push({
        name: side === -1 ? 'leftLowerArm' : 'rightLowerArm',
        geometry: new THREE.CapsuleGeometry(0.04, 0.16, 4, 8),
        position: new THREE.Vector3(side * 0.38, 0.92, 0),
        rotation: new THREE.Euler(0, 0, side * 0.15),
        scale: new THREE.Vector3(1, 1, 1)
      });
    }
    
    return parts;
  }

  private buildLegs(): BodyPartConfig[] {
    const parts: BodyPartConfig[] = [];
    
    for (const side of [-1, 1]) {
      parts.push({
        name: side === -1 ? 'leftUpperLeg' : 'rightUpperLeg',
        geometry: new THREE.CapsuleGeometry(0.065, 0.28, 4, 8),
        position: new THREE.Vector3(side * 0.1, 0.42, 0),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1)
      });
      
      parts.push({
        name: side === -1 ? 'leftLowerLeg' : 'rightLowerLeg',
        geometry: new THREE.CapsuleGeometry(0.05, 0.26, 4, 8),
        position: new THREE.Vector3(side * 0.1, 0.05, 0),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1)
      });
      
      parts.push({
        name: side === -1 ? 'leftFoot' : 'rightFoot',
        geometry: new THREE.BoxGeometry(0.08, 0.05, 0.18),
        position: new THREE.Vector3(side * 0.1, -0.14, 0.03),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1)
      });
    }
    
    return parts;
  }

  private mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    for (const geo of geometries) {
      const pos = geo.attributes.position.array;
      const norm = geo.attributes.normal?.array;
      const idx = geo.index?.array;

      for (let i = 0; i < pos.length; i++) {
        positions.push(pos[i]);
      }

      if (norm) {
        for (let i = 0; i < norm.length; i++) {
          normals.push(norm[i]);
        }
      }

      if (idx) {
        for (let i = 0; i < idx.length; i++) {
          indices.push(idx[i]);
        }
      }
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (normals.length > 0) {
      merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    }
    if (indices.length > 1) {
      merged.setIndex(indices);
    }

    return merged;
  }
}
