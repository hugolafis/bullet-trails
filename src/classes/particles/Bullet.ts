import * as THREE from 'three';
import { Particle } from './Particle';

export interface BulletParameters {
  start: THREE.Vector3;
  end: THREE.Vector3;
  lifetime: number;
  velocity?: number;
}

export class Bullet extends Particle {
  lifetime: number;
  readonly _elapsed: THREE.IUniform<number> = { value: 0 };
  //readonly speed: THREE.IUniform<number> = { value: 253 }; // approx 253m/s for .45 caliber
  readonly velocity = 200;
  private readonly direction: THREE.Vector3;

  override readonly geometry: THREE.BufferGeometry;
  override readonly material: THREE.ShaderMaterial;

  constructor(params: BulletParameters) {
    super();

    //this.frustumCulled = false; // todo...
    this.renderOrder = 1;

    this.lifetime = params.lifetime;

    this.position.copy(params.start);
    this.direction = new THREE.Vector3().copy(params.end).sub(params.start).normalize();

    // prettier-ignore
    const vertices = new Float32Array([
      -0.1, 0.0, 0.0,
      0.1,  0.0,  0.0,
      0.1,  2.0,  0.0,
     -0.1,  2.0,  0.0,
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
      uniforms: {
        direction: { value: this.direction },
        objectPosition: { value: this.position },
      },
      glslVersion: THREE.GLSL3,
      vertexShader: `
        uniform vec3 direction;
        uniform vec3 objectPosition;
        uniform float scale;

        out vec2 vUv;

        void main() {
          vUv = uv;

          // Compute the look vector
          vec3 look = normalize(cameraPosition - objectPosition);

          // Compute the right vector
          vec3 up = normalize(direction);
          vec3 right = normalize(cross(up, look));

          // Create the rotation matrix
          mat4 rotMatrix;
          rotMatrix[0] = vec4(right, 0.0);
          rotMatrix[1] = vec4(up, 0.0);
          rotMatrix[2] = vec4(look, 0.0);
          rotMatrix[3] = vec4(0.0, 0.0, 0.0, 1.0);
    
          gl_Position = projectionMatrix * modelViewMatrix * rotMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        layout(location = 0) out vec4 color;

        in vec2 vUv;

        void main() {
          //float timeStep = elapsed / duration;
          //float size = 1.0 * invScale;

          // Bullet
          float upperEdge = smoothstep(1.0, 0.75, vUv.y);
          float lowerEdge = smoothstep(0.0, 0.75, vUv.y);
          float horizontal = 1.0 - abs(length(vUv.x) * 2.0 - 1.0);

          float mask = lowerEdge * upperEdge * horizontal;

          vec3 bulletColour = vec3(1.0, 0.9, 0.1) * 5.0;

          vec4 finalBullet = vec4(bulletColour * mask, mask);

          color = finalBullet;
        }
      `,
    });
  }

  get elapsed() {
    return this._elapsed.value;
  }

  update(dt: number) {
    const step = this.direction.clone().multiplyScalar(this.velocity * dt);
    this.position.add(step);
    //this._elapsed.value += dt;
  }

  dispose(): void {
    this.material.dispose();
    this.geometry.dispose();
  }
}
