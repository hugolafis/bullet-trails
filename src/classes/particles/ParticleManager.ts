import * as THREE from 'three';
import { Particle } from './Particle';

export class ParticleManager {
  private readonly particles: Set<Particle>;

  constructor(private readonly scene: THREE.Scene) {
    this.particles = new Set<Particle>();
  }

  add(p: Particle) {
    this.particles.add(p);
    this.scene.add(p);
  }

  update(dt: number) {
    this.particles.forEach(particle => {
      particle.update(dt);

      if (particle.lifetime && particle.elapsed >= particle.lifetime) {
        this.destroyParticle(particle);
      }
    });
  }

  private destroyParticle(p: Particle) {
    p.dispose();
    this.scene.remove(p);
    this.particles.delete(p);
  }
}
