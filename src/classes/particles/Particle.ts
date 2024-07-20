import * as THREE from 'three';

export abstract class Particle extends THREE.Mesh {
  abstract update(dt?: number): void;
  abstract dispose(): void;
  abstract lifetime: number;
  abstract elapsed: number;
}
