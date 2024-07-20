import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import { ParticleManager } from './particles/ParticleManager';
import { SmokeTrail } from './particles/SmokeTrail';
import { Bullet } from './particles/Bullet';

export class Viewer {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private readonly scene: THREE.Scene;

  private readonly canvasSize: THREE.Vector2;
  private readonly renderSize: THREE.Vector2;

  private particleManager: ParticleManager;
  private raycaster: THREE.Raycaster;

  private elapsed = 0; // testing - remove

  //private trail: BulletTrail;
  private effectComposer: EffectComposer;
  private rt: THREE.WebGLRenderTarget;

  constructor(private readonly renderer: THREE.WebGLRenderer, private readonly canvas: HTMLCanvasElement) {
    this.canvasSize = new THREE.Vector2();
    this.renderSize = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.particleManager = new ParticleManager(this.scene);

    this.camera = new THREE.PerspectiveCamera(75, this.canvas.clientWidth / this.canvas.clientHeight);
    this.camera.position.set(-2, 1, 1);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(2, 0, 0);

    this.raycaster = new THREE.Raycaster();

    const sun = new THREE.DirectionalLight(undefined, Math.PI); // undo physically correct changes
    sun.position.copy(new THREE.Vector3(0.75, 1, 0.5).normalize());
    const ambient = new THREE.AmbientLight(undefined, 0.25);
    this.scene.add(sun);
    this.scene.add(ambient);

    this.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.FloatType }); // important! - this needs to be float for bloom to work correctly!
    this.effectComposer = new EffectComposer(renderer, this.rt);
    this.effectComposer.addPass(new RenderPass(this.scene, this.camera));
    this.effectComposer.addPass(new UnrealBloomPass(renderer.getSize(new THREE.Vector2()), 0.6, 0.4, 0.9));
    this.effectComposer.addPass(new OutputPass());

    // Scene setup
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(0xcccccc) })
    );
    this.scene.add(floor);

    const numObjects = 50;
    const boxGeo = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial();
    const randomDirection = new THREE.Vector3();
    for (let i = 0; i < numObjects; i++) {
      randomDirection.randomDirection();
      randomDirection.y = 0;
      randomDirection.normalize();

      const mesh = new THREE.Mesh(boxGeo, material);
      const distance = Math.sqrt(Math.random() * 17.68) * 5;
      mesh.position.copy(randomDirection.multiplyScalar(distance));
      mesh.position.y += 0.5;

      const randScale = Math.random() + 1;
      mesh.scale.multiplyScalar(randScale);
      mesh.position.y += (randScale - 1) * 0.5;

      this.scene.add(mesh);
    }

    this.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      const boundingRect = this.canvas.getBoundingClientRect();
      const ndc = {
        x: (e.clientX - boundingRect.left) / boundingRect.width,
        y: (e.clientY - boundingRect.top) / boundingRect.height,
      };
      ndc.y = 1.0 - ndc.y;
      ndc.x = ndc.x * 2.0 - 1.0;
      ndc.y = ndc.y * 2.0 - 1.0;

      this.raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), this.camera);
      const intersections = this.raycaster.intersectObjects(this.scene.children);

      const far = intersections[0]?.point ?? new THREE.Vector3(ndc.x, ndc.y, 1).unproject(this.camera);
      const near = new THREE.Vector3(1, -0.5, -1).applyMatrix4(this.camera.matrixWorld);

      // Make the particles
      const bulletfx = new Bullet({ start: near, end: far, lifetime: 1 });
      this.particleManager.add(bulletfx);

      this.particleManager.add(new SmokeTrail({ start: near, end: far, lifetime: 0.25, velocity: bulletfx.velocity }));
    });

    //this.effectComposer.renderToScreen = true;

    // const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshPhysicalMaterial());
    // this.scene.add(mesh);

    // this.trail = new BulletTrail({
    //   start: new THREE.Vector3(1, 0, 0),
    //   end: new THREE.Vector3(15, 1, 1),
    //   duration: 1,
    // });
    // this.scene.add(this.trail);

    // this.particleManager.add(
    //   new Bullet({ start: new THREE.Vector3(1, 0, 0), end: new THREE.Vector3(15, 1, 1), lifetime: 1 })
    // );

    // this.particleManager.add(
    //   new SmokeTrail({ start: new THREE.Vector3(1, 0, 0), end: new THREE.Vector3(15, 1, 1), lifetime: 0.25 })
    // );

    const axesHelper = new THREE.AxesHelper();
    this.scene.add(axesHelper);

    this.scene.background = new THREE.Color(0x222233);
  }

  readonly update = (dt: number) => {
    this.controls.update();

    // testing, remove
    this.elapsed += dt;
    const rof = 0.1 + Math.random() * 3;
    if (this.elapsed >= rof) {
      const start = new THREE.Vector3(0, 1, 0);
      const random = new THREE.Vector3().randomDirection();
      const end = new THREE.Vector3(50, 1, 0);

      end.add(random);
      const bulletfx = new Bullet({ start, end, lifetime: 1 });
      this.particleManager.add(bulletfx);
      this.particleManager.add(new SmokeTrail({ start, end, lifetime: 0.25, velocity: bulletfx.velocity }));

      this.elapsed = this.elapsed % rof;
    }

    // Do we need to resize the renderer?
    this.canvasSize.set(
      Math.floor(this.canvas.parentElement!.clientWidth),
      Math.floor(this.canvas.parentElement!.clientHeight)
    );
    if (!this.renderSize.equals(this.canvasSize)) {
      this.renderSize.copy(this.canvasSize);
      this.renderer.setSize(this.renderSize.x, this.renderSize.y, false);
      this.effectComposer.setSize(this.renderSize.x, this.renderSize.y);

      this.camera.aspect = this.renderSize.x / this.renderSize.y;
      this.camera.updateProjectionMatrix();
    }

    this.particleManager.update(dt);

    // this.trail.elapsed.value += dt;
    // this.trail.elapsed.value = this.trail.elapsed.value % this.trail.speed.value; // loop and keep in range

    //this.renderer.render(this.scene, this.camera);
    this.effectComposer.render(dt);
  };
}
