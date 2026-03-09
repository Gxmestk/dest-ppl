import * as THREE from 'three';

export class GeometryUtils {
  static calculateVolume(geometry: THREE.BufferGeometry): number {
    const positions = geometry.attributes.position;
    const indices = geometry.index;
    
    if (!positions || !indices) return 0.001;
    
    let volume = 0;
    const v0 = new THREE.Vector3();
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    
    for (let i = 0; i < indices.count; i += 3) {
      const i0 = indices.getX(i);
      const i1 = indices.getX(i + 1);
      const i2 = indices.getX(i + 2);
      
      v0.fromBufferAttribute(positions, i0);
      v1.fromBufferAttribute(positions, i1);
      v2.fromBufferAttribute(positions, i2);
      
      volume += this.signedVolumeOfTriangle(v0, v1, v2);
    }
    
    return Math.max(0.001, Math.abs(volume));
  }

  private static signedVolumeOfTriangle(
    p1: THREE.Vector3, 
    p2: THREE.Vector3, 
    p3: THREE.Vector3
  ): number {
    return p1.dot(p2.cross(p3)) / 6.0;
  }

  static getBoundingRadius(geometry: THREE.BufferGeometry): number {
    geometry.computeBoundingSphere();
    return geometry.boundingSphere?.radius || 0.1;
  }

  static getCentroid(geometry: THREE.BufferGeometry): THREE.Vector3 {
    const positions = geometry.attributes.position;
    if (!positions) return new THREE.Vector3();
    
    const centroid = new THREE.Vector3();
    const count = positions.count;
    
    for (let i = 0; i < count; i++) {
      centroid.x += positions.getX(i);
      centroid.y += positions.getY(i);
      centroid.z += positions.getZ(i);
    }
    
    centroid.divideScalar(count);
    return centroid;
  }
}
