import * as THREE from 'three';

export interface BulletTrailParameters {
  start: THREE.Vector3;
  end: THREE.Vector3;
  duration?: number;
}

export class BulletTrail extends THREE.Mesh {
  // private readonly start: THREE.Vector3;
  // private readonly end: THREE.Vector3;
  private readonly duration = 1;
  private readonly elapsed = 0;
  private readonly vector: THREE.Vector3;

  override readonly geometry: THREE.BufferGeometry;
  override readonly material: THREE.ShaderMaterial;

  constructor(params: BulletTrailParameters) {
    super();

    // this.start = new THREE.Vector3().copy(params.start);
    // this.end = new THREE.Vector3().copy(params.end);
    // const length = this.end.clone().sub(this.start);

    this.vector = new THREE.Vector3().copy(params.end).sub(params.start);
    console.log(this.vector);

    // prettier-ignore
    const vertices = new Float32Array([
      -0.5, -0.5, 0.0,
      0.5, -0.5,  0.0,
      0.5,  0.5,  0.0,
     -0.5,  0.5,  0.0,
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
      },
      glslVersion: THREE.GLSL3,
      vertexShader: `
        uniform vec3 direction;
        uniform vec3 objectPosition;
        out vec2 vUv;

        void main() {
          vUv = uv;

          vec4 worldPosition = modelMatrix * vec4(position, 1.0);

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
          color = vec4(vUv, 0.0, 1.0);
        }
      `,
    });
  }
}
