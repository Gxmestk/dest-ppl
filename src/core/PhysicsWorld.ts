import * as CANNON from 'cannon-es';

export class PhysicsWorld {
  world: CANNON.World;
  groundBody: CANNON.Body;

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;

    this.groundBody = this.createGround();
    this.world.addBody(this.groundBody);
  }

  private createGround(): CANNON.Body {
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    return groundBody;
  }

  step(dt: number): void {
    const fixedTimeStep = 1 / 60;
    const maxSubSteps = 3;
    this.world.step(fixedTimeStep, dt, maxSubSteps);
  }

  addBody(body: CANNON.Body): void {
    this.world.addBody(body);
  }

  removeBody(body: CANNON.Body): void {
    this.world.removeBody(body);
  }
}
