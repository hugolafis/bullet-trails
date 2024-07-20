import * as THREE from 'three';

export abstract class Particle {
  abstract update(dt?: number): void;
  abstract dispose(): void;
  abstract lifetime: number;
  abstract elapsed: number;
  abstract objects: THREE.Object3D[];
}
