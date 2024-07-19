import * as THREE from 'three';

export interface BulletTrailParameters {
  start: THREE.Vector3;
  end: THREE.Vector3;
  duration?: number;
}

export class BulletTrail extends THREE.Mesh {
  readonly elapsed: THREE.IUniform<number> = { value: 0 };
  readonly duration: THREE.IUniform<number> = { value: 15 };
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
      uniforms: {
        direction: { value: this.vector },
        objectPosition: { value: this.position },
        scale: { value: this.vector.length() },
        elapsed: this.elapsed,
        duration: this.duration,
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

          vec3 scaledPos = position;
          scaledPos.y *= scale;
    
          gl_Position = projectionMatrix * modelViewMatrix * rotMatrix * vec4(scaledPos, 1.0);
        }
      `,
      fragmentShader: `
        layout(location = 0) out vec4 color;

        uniform float elapsed;
        uniform float duration;

        uniform float scale;

        in vec2 vUv;

        void main() {
          float invScale = 1.0 / scale;
          float timeStep = elapsed / duration;
          //float size = 1.0 * invScale;
          float size = 0.05; // todo needs to be metric

          float lowerEdge = smoothstep(0.0 + timeStep, 0.2 + timeStep, vUv.y + size);
          float upperEdge = smoothstep(0.05 + timeStep, 0.0 + timeStep, vUv.y - size);
          
          float horizontal = 1.0 - abs(length(vUv.x) * 2.0 - 1.0);

          float mask = lowerEdge * upperEdge * horizontal;

          color = vec4(vec3(mask), 1.0);
        }
      `,
    });
  }

  update(dt: number) {
    this.elapsed.value += dt;
  }
}
