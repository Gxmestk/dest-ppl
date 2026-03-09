import * as CANNON from 'cannon-es';

interface BreakableConstraint {
  constraint: CANNON.Constraint;
  bodyA: CANNON.Body;
  bodyB: CANNON.Body;
  maxDistance: number;
  broken: boolean;
  onBreak?: () => void;
}

export class PseudoBreakable {
  private constraints: BreakableConstraint[] = [];
  
  constructor(private world: CANNON.World) {}

  addBreakableConnection(
    bodyA: CANNON.Body,
    bodyB: CANNON.Body,
    maxDistance: number,
    onBreak?: () => void
  ): CANNON.Constraint | null {
    const pivotA = new CANNON.Vec3();
    const pivotB = new CANNON.Vec3(
      bodyB.position.x - bodyA.position.x,
      bodyB.position.y - bodyA.position.y,
      bodyB.position.z - bodyA.position.z
    ).scale(0.5);
    
    const constraint = new CANNON.PointToPointConstraint(
      bodyA, pivotA, bodyB, pivotB
    );
    
    const conn: BreakableConstraint = {
      constraint,
      bodyA,
      bodyB,
      maxDistance,
      broken: false,
      onBreak
    };
    
    this.constraints.push(conn);
    this.world.addConstraint(constraint);
    
    return constraint;
  }

  update(): void {
    for (const conn of this.constraints) {
      if (conn.broken) continue;
      
      const distance = conn.bodyA.position.distanceTo(conn.bodyB.position);
      
      if (distance > conn.maxDistance) {
        this.breakConstraint(conn);
      }
    }
  }

  private breakConstraint(conn: BreakableConstraint): void {
    conn.broken = true;
    this.world.removeConstraint(conn.constraint);
    conn.onBreak?.();
  }

  clear(): void {
    for (const conn of this.constraints) {
      if (!conn.broken) {
        this.world.removeConstraint(conn.constraint);
      }
    }
    this.constraints = [];
  }

  get activeCount(): number {
    return this.constraints.filter(c => !c.broken).length;
  }
}
