import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GeometryUtils } from '../geometry/GeometryUtils';

export type PhysicsShapeType = 'sphere' | 'box' | 'convex';

export class FragmentBodyFactory {
  constructor(private defaultShapeType: PhysicsShapeType = 'sphere') {}

  createBody(
    geometry: THREE.BufferGeometry, 
    density: number = 500,
    position: THREE.Vector3 = new THREE.Vector3(),
    shapeType?: PhysicsShapeType
  ): CANNON.Body {
    const useShapeType = shapeType ?? this.defaultShapeType;
    
    if (useShapeType === 'sphere') {
      return this.createSphereBody(geometry, density, position);
    } else if (useShapeType === 'box') {
      return this.createBoxBody(geometry, density, position);
    } else {
      return this.createConvexBody(geometry, density, position);
    }
  }

  private createSphereBody(
    geometry: THREE.BufferGeometry,
    density: number,
    position: THREE.Vector3
  ): CANNON.Body {
    const radius = GeometryUtils.getBoundingRadius(geometry);
    const volume = (4/3) * Math.PI * Math.pow(radius, 3);
    const mass = Math.max(0.01, volume * density);
    
    const body = new CANNON.Body({
      mass,
      material: new CANNON.Material('fragment'),
      linearDamping: 0.3,
      angularDamping: 0.3,
      position: new CANNON.Vec3(position.x, position.y, position.z)
    });
    
    body.addShape(new CANNON.Sphere(Math.max(0.01, radius)));
    return body;
  }

  private createBoxBody(
    geometry: THREE.BufferGeometry,
    density: number,
    position: THREE.Vector3
  ): CANNON.Body {
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
    const volume = size.x * size.y * size.z;
    const mass = Math.max(0.01, volume * density);
    
    const body = new CANNON.Body({
      mass,
      material: new CANNON.Material('fragment'),
      linearDamping: 0.3,
      angularDamping: 0.3,
      position: new CANNON.Vec3(position.x, position.y, position.z)
    });
    
    body.addShape(new CANNON.Box(halfExtents));
    return body;
  }

  private createConvexBody(
    geometry: THREE.BufferGeometry,
    density: number,
    position: THREE.Vector3
  ): CANNON.Body {
    const shape = this.createConvexShape(geometry);
    
    if (!shape) {
      return this.createSphereBody(geometry, density, position);
    }

    const volume = GeometryUtils.calculateVolume(geometry);
    const mass = Math.max(0.01, volume * density);
    
    const body = new CANNON.Body({
      mass,
      material: new CANNON.Material('fragment'),
      linearDamping: 0.3,
      angularDamping: 0.3,
      position: new CANNON.Vec3(position.x, position.y, position.z)
    });
    
    body.addShape(shape);
    return body;
  }

  private createConvexShape(geometry: THREE.BufferGeometry): CANNON.ConvexPolyhedron | null {
    const positions = geometry.attributes.position;
    const indices = geometry.index;
    
    if (!positions) return null;
    
    const uniqueVertices: Map<string, number> = new Map();
    const vertices: CANNON.Vec3[] = [];
    const vertexMap: number[] = [];
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
      
      if (!uniqueVertices.has(key)) {
        uniqueVertices.set(key, vertices.length);
        vertices.push(new CANNON.Vec3(x, y, z));
      }
      vertexMap.push(uniqueVertices.get(key)!);
    }
    
    if (vertices.length < 4) return null;
    
    const faces: number[][] = [];
    
    if (indices) {
      for (let i = 0; i < indices.count; i += 3) {
        const a = vertexMap[indices.getX(i)];
        const b = vertexMap[indices.getX(i + 1)];
        const c = vertexMap[indices.getX(i + 2)];
        faces.push([a, b, c]);
      }
    } else {
      for (let i = 0; i < positions.count; i += 3) {
        faces.push([vertexMap[i], vertexMap[i + 1], vertexMap[i + 2]]);
      }
    }
    
    if (faces.length < 4) return null;
    
    try {
      return new CANNON.ConvexPolyhedron({ vertices, faces });
    } catch {
      return null;
    }
  }

  setDefaultShapeType(type: PhysicsShapeType): void {
    this.defaultShapeType = type;
  }
}
