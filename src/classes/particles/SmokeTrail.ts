import * as THREE from 'three';
import { Particle } from './Particle';

export interface BulletTrailParameters {
  start: THREE.Vector3;
  end: THREE.Vector3;
  lifetime: number;
  velocity: number;
}

export class SmokeTrail extends Particle {
  readonly _elapsed: THREE.IUniform<number> = { value: 0 };
  readonly _lifetime: THREE.IUniform<number> = { value: 0 };
  readonly _velocity: THREE.IUniform<number> = { value: 0 };
  private readonly vector: THREE.Vector3;

  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.ShaderMaterial;

  constructor(params: BulletTrailParameters) {
    super();

    this.frustumCulled = false; // todo...
    this._lifetime.value = params.lifetime;
    this._velocity.value = params.velocity;

    this.position.copy(params.start);
    this.vector = new THREE.Vector3().copy(params.end).sub(params.start);

    // prettier-ignore
    const vertices = new Float32Array([
      -0.05, 0.0, 0.0,
      0.05,  0.0,  0.0,
      0.05,  1.0,  0.0,
     -0.05,  1.0,  0.0,
    ]);

    const indices = [0, 1, 2, 2, 3, 0];

    // prettier-ignore
    const normals = new Float32Array([
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
    ])

    // prettier-ignore
    const uvs = new Float32Array([
      0, 0,
      1, 0,
      1, 1,
      0, 1,
    ]);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setIndex(indices);

    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      uniforms: {
        direction: { value: this.vector },
        objectPosition: { value: this.position },
        scale: { value: this.vector.length() },
        elapsed: this._elapsed,
        duration: this._lifetime,
        velocity: this._velocity,
      },
      glslVersion: THREE.GLSL3,
      vertexShader: `
        uniform vec3 direction;
        uniform vec3 objectPosition;
        uniform float scale;

        out vec2 vUv;
        flat out float invScale;

        void main() {
          vUv = uv;

          // Compute the look vector
          vec3 look = normalize(cameraPosition - objectPosition);

          // Compute the right vector
          vec3 up = normalize(direction); // todo take this from the objects velocity
          vec3 right = normalize(cross(up, look));

          // Create the rotation matrix
          mat4 rotMatrix;
          rotMatrix[0] = vec4(right, 0.0);
          rotMatrix[1] = vec4(up, 0.0);
          rotMatrix[2] = vec4(look, 0.0);
          rotMatrix[3] = vec4(0.0, 0.0, 0.0, 1.0);

          vec3 scaledPos = position;
          scaledPos.y *= scale;

          invScale = 1.0 / scale;
    
          gl_Position = projectionMatrix * modelViewMatrix * rotMatrix * vec4(scaledPos, 1.0);
        }
      `,
      fragmentShader: `
        layout(location = 0) out vec4 color;

        uniform float elapsed;
        uniform float duration;
        uniform float velocity;
        uniform float scale;

        flat in float invScale;

        in vec2 vUv;

        void main() {
          float timeStep = elapsed / duration;
          float size = 1.0 * invScale;
          float lengthStep = (velocity / scale) * elapsed;

          // Smoke
          float horizontalSmoke = pow(mix(1.0, 0.0, abs(vUv.x * 2.0 - 1.0)), 2.0) * 1.0 - timeStep;
          float linearSmokeFade = step(1.0, 1.0 - vUv.y + lengthStep);
    
          float smokeMask = max(horizontalSmoke * linearSmokeFade, 0.0);

          vec3 smokeColour = vec3(0.8, 0.8, 0.8);

          vec4 finalSmoke = vec4(smokeColour, smokeMask * 0.25);

          color = finalSmoke;
        }
      `,
    });
  }

  get elapsed() {
    return this._elapsed.value;
  }

  get lifetime() {
    return this._lifetime.value;
  }

  // set elapsed(val: number) {
  //   this._elapsed.value = val;
  // }

  dispose(): void {
    //throw new Error('Method not implemented.');
  }

  update(dt: number) {
    this._elapsed.value += dt;
    //this._elapsed.value = this._elapsed.value % this.lifetime; // todo remove
  }
}
