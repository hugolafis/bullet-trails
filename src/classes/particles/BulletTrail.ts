import * as THREE from 'three';

export interface BulletTrailParameters {
  start: THREE.Vector3;
  end: THREE.Vector3;
  duration?: number;
}

export class BulletTrail extends THREE.Mesh {
  readonly elapsed: THREE.IUniform<number> = { value: 0 };
  readonly speed: THREE.IUniform<number> = { value: 0.5 };
  private readonly vector: THREE.Vector3;

  override readonly geometry: THREE.BufferGeometry;
  override readonly material: THREE.ShaderMaterial;

  constructor(params: BulletTrailParameters) {
    super();

    this.frustumCulled = false; // todo...

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
      uniforms: {
        direction: { value: this.vector },
        objectPosition: { value: this.position },
        scale: { value: this.vector.length() },
        elapsed: this.elapsed,
        duration: this.speed,
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
          vec3 up = normalize(direction);
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

        flat in float invScale;

        in vec2 vUv;

        void main() {
          float timeStep = elapsed / duration;
          float size = 1.0 * invScale;

          // Bullet
          float upperEdge = smoothstep(2.0 * invScale, 1.5 * invScale, vUv.y - timeStep);
          float lowerEdge = smoothstep(0.0 * invScale, 1.5 * invScale, vUv.y - timeStep);
          float horizontal = 1.0 - abs(length(vUv.x) * 2.0 - 1.0);

          // Smoke
          float horizontalSmoke = pow(mix(1.0, 0.0, abs(vUv.x * 2.0 - 1.0)), 2.0);
          //float horizontalSmokeFade = smoothstep(-1.0, 0.0, vUv.y - timeStep * 2.0);
          float horizontalSmokeFade = mix(1.0 - timeStep * 1.0, 1.0, vUv.y) - timeStep;
          horizontalSmokeFade *= 1.0 - timeStep;
    
          float mask = lowerEdge * upperEdge * horizontal;
          float smokeMask = horizontalSmoke * horizontalSmokeFade;
          //float smokeMask = horizontalSmokeFade;

          //color = vec4(vec3(horizontalSmoke * horizontalSmokeFade), 1.0);

          vec3 bulletColour = vec3(1.0, 0.9, 0.1) * 5.0;
          vec3 smokeColour = vec3(0.8, 0.8, 0.8);

          vec4 finalBullet = vec4(bulletColour * mask, mask);
          vec4 finalSmoke = vec4(smokeColour, smokeMask * 0.15);

          color = finalBullet;
        }
      `,
    });
  }

  update(dt: number) {
    this.elapsed.value += dt;
  }
}
