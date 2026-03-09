import * as THREE from 'three';
import { SceneManager, PhysicsWorld } from './core';
import { DestructionManager } from './systems';
import { InputHandler, ProjectileLauncher, CameraController } from './interaction';
import { DebrisParticles, FractureEffect } from './effects';
import { CompositeHuman } from './entities/CompositeHuman';
import type { Projectile } from './entities/Projectile';
import type { PhysicsShapeType } from './physics/FragmentBodyFactory';

export interface GameConfig {
  fragmentCount: number;
  impactForce: number;
  projectileType: 'fast' | 'heavy' | 'shotgun';
  slowMotion: boolean;
  showDebug: boolean;
  physicsShape: PhysicsShapeType;
}

export class Game {
  private sceneManager: SceneManager;
  private physicsWorld: PhysicsWorld;
  private destructionManager: DestructionManager;
  private inputHandler: InputHandler;
  private projectileLauncher: ProjectileLauncher;
  private cameraController: CameraController;
  private debrisParticles: DebrisParticles;
  private fractureEffect: FractureEffect;
  
  private human: CompositeHuman | null = null;
  private projectiles: Projectile[] = [];
  private config: GameConfig = {
    fragmentCount: 30,
    impactForce: 50,
    projectileType: 'fast',
    slowMotion: false,
    showDebug: false,
    physicsShape: 'sphere'
  };
  
  private lastTime: number = 0;
  private running: boolean = false;
  private fps: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private fractureReady: boolean = false;

  constructor() {
    const container = document.getElementById('app') || document.body;
    
    this.sceneManager = new SceneManager(container);
    this.physicsWorld = new PhysicsWorld();
    
    this.destructionManager = new DestructionManager(
      this.sceneManager.scene,
      this.physicsWorld.world
    );
    
    this.inputHandler = new InputHandler(
      this.sceneManager.camera,
      this.sceneManager.renderer
    );
    
    this.projectileLauncher = new ProjectileLauncher(
      this.sceneManager.scene,
      this.physicsWorld.world
    );
    
    this.cameraController = new CameraController(
      this.sceneManager.camera,
      this.sceneManager.renderer.domElement
    );
    
    this.debrisParticles = new DebrisParticles(this.sceneManager.scene);
    this.fractureEffect = new FractureEffect(this.sceneManager.scene);
    
    this.setupEventListeners();
    this.setupUI();
    this.spawnHuman();
  }

  private setupEventListeners(): void {
    window.addEventListener('click', this.handleClick.bind(this));
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private handleClick = (event: MouseEvent): void => {
    if (!this.running) return;
    
    const mousePos = this.inputHandler.getMousePosition(event);
    if (!mousePos) return;
    
    const cameraPos = this.sceneManager.camera.position.clone();
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mousePos, this.sceneManager.camera);
    
    if (this.human) {
      this.human.group.updateWorldMatrix(true, false);
      
      const meshes = this.human.getAllMeshes();
      const hits = raycaster.intersectObjects(meshes, true);
      
      if (hits.length > 0) {
        const target = hits[0].point;
        const direction = target.clone().sub(cameraPos).normalize();
        
        const newProjectiles = this.projectileLauncher.launch(cameraPos, direction);
        this.projectiles.push(...newProjectiles);
        return;
      }
    }
    
    const targetPoint = new THREE.Vector3(0, 1.2, 0);
    const direction = targetPoint.clone().sub(cameraPos).normalize();
    
    const newProjectiles = this.projectileLauncher.launch(cameraPos, direction);
    this.projectiles.push(...newProjectiles);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    switch (event.key.toLowerCase()) {
      case ' ':
        this.config.slowMotion = !this.config.slowMotion;
        break;
      case 'r':
        this.reset();
        break;
      case 'h':
        this.spawnHuman();
        break;
      case '1':
        this.setProjectileType('fast');
        break;
      case '2':
        this.setProjectileType('heavy');
        break;
      case '3':
        this.setProjectileType('shotgun');
        break;
    }
  }

  private setProjectileType(type: 'fast' | 'heavy' | 'shotgun'): void {
    this.config.projectileType = type;
    this.projectileLauncher.setProjectileType(type);
    this.updateUI();
  }

  spawnHuman(): void {
    if (this.human) {
      this.sceneManager.scene.remove(this.human.group);
      this.human.dispose();
      this.destructionManager.clear();
    }
    
    this.fractureReady = false;
    this.updateFractureStatus();
    
    this.human = new CompositeHuman(
      new THREE.Vector3(0, 0, 0),
      this.config.fragmentCount
    );
    this.sceneManager.scene.add(this.human.group);
    this.cameraController.setTarget(new THREE.Vector3(0, 1, 0));
    
    (window as any).gameHuman = this.human;
    
    this.preFractureHuman();
  }

  private async preFractureHuman(): Promise<void> {
    if (!this.human) return;
    
    await this.human.preFractureAll();
    this.fractureReady = true;
    this.updateFractureStatus();
  }

  reset(): void {
    this.destructionManager.clear();
    this.projectileLauncher.clear();
    this.debrisParticles.clear();
    
    if (this.human) {
      this.sceneManager.scene.remove(this.human.group);
      this.human.dispose();
      this.human = null;
    }
    
    this.projectiles = [];
    this.spawnHuman();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    this.running = false;
  }

  private gameLoop = (): void => {
    if (!this.running) return;
    
    requestAnimationFrame(this.gameLoop);
    
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    
    if (this.config.slowMotion) {
      dt *= 0.2;
    }
    
    dt = Math.min(dt, 0.1);
    
    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = 0;
      this.updateFPS();
    }
    
    this.physicsWorld.step(dt);
    this.destructionManager.update();
    this.projectileLauncher.update();
    this.debrisParticles.update(dt);
    this.fractureEffect.update(dt);
    
    this.checkCollisions();
    
    this.sceneManager.render();
    this.updateFragmentCount();
  }

  private checkCollisions(): void {
    if (!this.human) return;
    
    this.human.group.updateWorldMatrix(true, false);
    
    const raycaster = new THREE.Raycaster();
    const meshes = this.human.getAllMeshes().filter(m => {
      const part = this.human!.getPart(m.userData.bodyPartName);
      return part && !part.isFractured;
    });
    
    if (meshes.length === 0) return;
    
    const activeProjectiles = this.projectiles.filter(p => p.active);
    if (activeProjectiles.length === 0) return;
    
    for (const projectile of activeProjectiles) {
      const projectilePos = projectile.mesh.position;
      const velocity = projectile.body.velocity;
      
      const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
      
      if (speed < 0.1) {
        projectile.active = false;
        continue;
      }
      
      const direction = new THREE.Vector3(velocity.x, velocity.y, velocity.z).normalize();
      
      raycaster.set(projectilePos, direction);
      raycaster.far = Math.max(0.5, speed * 0.05);
      
      const intersects = raycaster.intersectObjects(meshes, true);
      if (intersects.length > 0) {
        const hit = intersects[0];
        this.triggerPartDestruction(hit, projectile);
        return;
      }
    }
  }

  private async triggerPartDestruction(
    intersection: THREE.Intersection,
    projectile: Projectile
  ): Promise<void> {
    if (!this.human) return;
    
    const hitPart = this.human.getHitPart(intersection);
    if (!hitPart || hitPart.isFractured) return;
    
    projectile.active = false;
    
    const impactPoint = intersection.point;
    
    this.debrisParticles.emit(impactPoint, 20, 0x8b5a2b);
    this.fractureEffect.play(impactPoint, this.config.impactForce);
    
    await this.destructionManager.fractureBodyPart(
      this.human,
      hitPart,
      impactPoint,
      this.config.impactForce
    );
  }

  private setupUI(): void {
    const ui = document.createElement('div');
    ui.id = 'game-ui';
    ui.innerHTML = `
      <div id="ui-panel">
        <h2>DESTRUCTION PLAYGROUND</h2>
        <div class="section">
          <h3>Controls</h3>
          <p>Click to shoot projectiles</p>
          <p>H - Spawn Human</p>
          <p>R - Reset</p>
          <p>Space - Slow Motion</p>
          <p>1/2/3 - Change projectile type</p>
        </div>
        <div class="section">
          <h3>Projectile Type</h3>
          <select id="projectile-type">
            <option value="fast">Fast Bullet</option>
            <option value="heavy">Heavy Ball</option>
            <option value="shotgun">Shotgun</option>
          </select>
        </div>
        <div class="section">
          <h3>Physics Shape</h3>
          <select id="physics-shape">
            <option value="sphere" selected>Sphere (Fast)</option>
            <option value="box">Box (Medium)</option>
            <option value="convex">Convex (Slow)</option>
          </select>
        </div>
        <div class="section">
          <h3>Settings</h3>
          <label>
            Fragment Count: <span id="fragment-value">30</span>
            <input type="range" id="fragment-count" min="10" max="100" value="30">
          </label>
          <label>
            Impact Force: <span id="force-value">50</span>
            <input type="range" id="impact-force" min="10" max="100" value="50">
          </label>
        </div>
        <div class="section stats">
          <div>FPS: <span id="fps-display">60</span></div>
          <div>Fragments: <span id="fragment-display">0</span></div>
          <div>Fracture: <span id="fracture-status">Computing...</span></div>
        </div>
      </div>
    `;
    document.body.appendChild(ui);
    
    this.setupUIEvents();
    this.addUIStyles();
  }

  private setupUIEvents(): void {
    const projectileSelect = document.getElementById('projectile-type') as HTMLSelectElement;
    if (projectileSelect) {
      projectileSelect.value = this.config.projectileType;
      projectileSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.setProjectileType(target.value as 'fast' | 'heavy' | 'shotgun');
      });
    }
    
    const physicsSelect = document.getElementById('physics-shape') as HTMLSelectElement;
    if (physicsSelect) {
      physicsSelect.value = this.config.physicsShape;
      physicsSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.config.physicsShape = target.value as PhysicsShapeType;
      });
    }
    
    const fragmentSlider = document.getElementById('fragment-count') as HTMLInputElement;
    const fragmentValue = document.getElementById('fragment-value') as HTMLSpanElement;
    if (fragmentSlider && fragmentValue) {
      fragmentSlider.addEventListener('input', (e) => {
        this.config.fragmentCount = parseInt((e.target as HTMLInputElement).value);
        fragmentValue.textContent = String(this.config.fragmentCount);
      });
    }
    
    const forceSlider = document.getElementById('impact-force') as HTMLInputElement;
    const forceValue = document.getElementById('force-value') as HTMLSpanElement;
    if (forceSlider && forceValue) {
      forceSlider.addEventListener('input', (e) => {
        this.config.impactForce = parseInt((e.target as HTMLInputElement).value);
        forceValue.textContent = String(this.config.impactForce);
      });
    }
  }

  private updateUI(): void {
    const fragmentValue = document.getElementById('fragment-value');
    const forceValue = document.getElementById('force-value');
    
    if (fragmentValue) fragmentValue.textContent = String(this.config.fragmentCount);
    if (forceValue) forceValue.textContent = String(this.config.impactForce);
  }

  private updateFPS(): void {
    const fpsDisplay = document.getElementById('fps-display');
    if (fpsDisplay) fpsDisplay.textContent = String(this.fps);
  }

  private updateFragmentCount(): void {
    const fragmentDisplay = document.getElementById('fragment-display');
    if (fragmentDisplay) fragmentDisplay.textContent = String(this.destructionManager.fragmentCount);
  }

  private updateFractureStatus(): void {
    const statusDisplay = document.getElementById('fracture-status');
    if (statusDisplay) {
      statusDisplay.textContent = this.fractureReady ? 'Ready ✓' : 'Computing...';
      statusDisplay.style.color = this.fractureReady ? '#4f4' : '#ff6347';
    }
  }

  private addUIStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #game-ui {
        position: fixed;
        top: 10px;
        left: 10px;
        font-family: 'Segoe UI', system-ui, sans-serif;
        z-index: 1000;
        pointer-events: none;
      }
      
      #ui-panel {
        background: rgba(26, 26, 26, 0.9);
        color: white;
        padding: 15px;
        border-radius: 8px;
        min-width: 200px;
        pointer-events: auto;
      }
      
      #ui-panel h2 {
        margin: 0 0 15px 0;
        font-size: 16px;
        color: #ff6347;
      }
      
      #ui-panel h3 {
        margin: 10px 0 5px 0;
        font-size: 12px;
        color: #aaa;
      }
      
      #ui-panel p {
        margin: 5px 0;
        font-size: 11px;
      }
      
      .section {
        margin-bottom: 15px;
      }
      
      .stats {
        border-top: 1px solid #444;
        padding-top: 10px;
      }
      
      label {
        display: block;
        margin: 5px 0;
        font-size: 11px;
      }
      
      input[type="range"] {
        width: 100%;
        margin: 5px 0;
      }
      
      select {
        width: 100%;
        padding: 5px;
        background: #333;
        color: white;
        border: 1px solid #555;
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);
  }

  get scene(): THREE.Scene {
    return this.sceneManager.scene;
  }
}

const game = new Game();
game.start();
