import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';

export type CameraMode = 'orbit' | 'follow' | 'top-down';

export class CameraController {
  controls: OrbitControls;
  private modeInternal: CameraMode = 'orbit';
  private targetInternal: THREE.Vector3 = new THREE.Vector3();

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.controls = new OrbitControls(camera, domElement);
  }

  get mode(): CameraMode {
    return this.modeInternal;
  }

  setMode(mode: CameraMode): void {
    this.modeInternal = mode;
    this.controls.enabled = mode === 'orbit';
  }

  setTarget(target: THREE.Vector3): void {
    this.targetInternal.copy(target);
    this.controls.target.copy(target);
  }

  update(): void {
    this.controls.update();
  }
}
