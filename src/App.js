import "./styles.css";
import * as THREE from "three";
import { loadTextAssets, createTextMaterial } from "./Text";
import TouchTexture from "./TouchTexture";
import { EffectComposer, RenderPass, EffectPass } from "postprocessing";
import { WaterEffect } from "./WaterEffect";
global.THREE = THREE;
const createGeometry = require("three-bmfont-text");

const MSDFShader = require("three-bmfont-text/shaders/msdf");

console.clear();

export class App {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.composer = new EffectComposer(this.renderer);

    document.body.append(this.renderer.domElement);
    this.renderer.domElement.id = "webGLApp";

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    this.camera.position.z = 50;
    this.disposed = false;
    this.scene = new THREE.Scene();

    this.clock = new THREE.Clock();

    this.assets = {};
    this.raycaster = new THREE.Raycaster();
    this.hitObjects = [];

    this.touchTexture = new TouchTexture();

    this.tick = this.tick.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);

    this.init = this.init.bind(this);
    this.loader = new Loader();
    this.loadAssets().then(this.init);
  }
  loadAssets() {
    const loader = this.loader;
    const assets = this.assets;
    return new Promise((resolve, reject) => {
      loadTextAssets(assets, loader);

      loader.onComplete = () => {
        resolve();
      };
    });
  }
  initComposer() {
    const renderPass = new RenderPass(this.scene, this.camera);
    this.waterEffect = new WaterEffect({ texture: this.touchTexture.texture });

    const waterPass = new EffectPass(this.camera, this.waterEffect);

    waterPass.renderToScreen = true;
    this.composer.addPass(renderPass);
    this.composer.addPass(waterPass);
  }
  init() {
    this.touchTexture.initTexture();
    const assets = this.assets;

    const textGeometry = createGeometry({
      font: assets.font,
      align: "center",
      text: "AA"
    });
    const textMaterial = createTextMaterial(assets.glyphs);
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    let scale = 0.4;
    textMesh.scale.x = scale;
    textMesh.scale.y = -scale;
    textMesh.position.x = (-textGeometry.layout.width / 2) * scale;
    textMesh.position.y = (-textGeometry.layout.xHeight / 2) * scale;

    const textGeometry2 = createGeometry({
      font: assets.font,
      align: "center",
      width: 600,
      text: Array.from({ length: 100 }, () => "water").join(" ")
    });
    const textMaterial2 = createTextMaterial(assets.glyphs, {
      color: "rgba(20,20,20,1.0)"
    });
    const textMesh2 = new THREE.Mesh(textGeometry2, textMaterial2);
    scale = 0.1;
    console.log(textGeometry2.layout);
    textMesh2.scale.x = scale;
    textMesh2.scale.y = -scale;
    textMesh2.position.z += -0.1;
    textMesh2.position.x = (-textGeometry2.layout.width / 2) * scale;
    textMesh2.position.y =
      (-textGeometry2.layout.height / 2) * scale +
      (-textGeometry2.layout.lineHeight / 4) * scale;
    this.scene.add(textMesh2);

    this.scene.add(textMesh);

    this.addHitPlane();
    this.initTextPlane();
    this.initComposer();

    this.tick();

    window.addEventListener("resize", this.onResize);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("touchmove", this.onTouchMove);
    console.log("start");
  }
  onTouchMove(ev) {
    console.log("move");
    const touch = ev.targetTouches[0];
    this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }
  onMouseMove(ev) {
    const raycaster = this.raycaster;
    this.mouse = {
      x: ev.clientX / window.innerWidth,
      y: 1 - ev.clientY / window.innerHeight
    };
    this.touchTexture.addTouch(this.mouse);

    // raycaster.setFromCamera(this.mouse, this.camera);
    // var intersections = raycaster.intersectObjects(this.hitObjects);
    // if (intersections.length > 0) {
    //   const intersect = intersections[0];
    //   this.touchTexture.addTouch(intersect.uv);
    // }
  }
  initTextPlane() {
    const viewSize = this.getViewSize();

    const geometry = new THREE.PlaneBufferGeometry(
      viewSize.width / 2,
      viewSize.height / 2,
      1,
      1
    );
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: new THREE.Uniform(this.touchTexture.texture)
      },
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec2 vUv;
        void main(){
          vec3 color = vec3(1.);
          vec4 tex = texture2D(uMap, vUv);
          color = vec3(tex.rgb);
          gl_FragColor = vec4(color,1.);
        }
      `,
      vertexShader: `
        varying vec2 vUv;

        void main(){
          vec3 pos = position.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
          vUv = uv;
        }
      `
    });
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
  }
  addHitPlane() {
    const viewSize = this.getViewSize();
    const geometry = new THREE.PlaneBufferGeometry(
      viewSize.width,
      viewSize.height,
      1,
      1
    );
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geometry, material);

    this.hitObjects.push(mesh);
  }
  getViewSize() {
    const fovInRadians = (this.camera.fov * Math.PI) / 180;
    const height = Math.abs(
      this.camera.position.z * Math.tan(fovInRadians / 2) * 2
    );

    return { width: height * this.camera.aspect, height };
  }
  dispose() {
    this.disposed = true;
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("mousemove", this.onMouseMove);
    this.scene.children.forEach(child => {
      child.material.dispose();
      child.geometry.dispose();
    });
    if (this.assets.glyphs) this.assets.glyphs.dispose();

    this.hitObjects.forEach(child => {
      if (child) {
        console.log(child.material, child.geometry);
        if (child.material) child.material.dispose();
        if (child.geometry) child.geometry.dispose();
        // child.dispose();
      }
    });
    if (this.touchTexture) this.touchTexture.texture.dispose();
    this.scene.dispose();
    this.renderer.dispose();
    this.composer.dispose();
    // console.log(this.renderer.info.memory);
    // console.log(this.renderer.info.render);
    // console.log(this.renderer.info.programs);

    // alert("wait");
  }
  update() {
    this.touchTexture.update();
  }
  render() {
    // this.renderer.render(this.scene, this.camera);
    this.composer.render(this.clock.getDelta());
  }
  tick() {
    if (this.disposed) return;
    this.render();
    this.update();
    requestAnimationFrame(this.tick);
  }
  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

class Loader {
  constructor() {
    this.items = [];
    this.loaded = [];
  }
  begin(name) {
    this.items.push(name);
  }
  end(name) {
    this.loaded.push(name);
    if (this.loaded.length === this.items.length) {
      this.onComplete();
    }
  }
  onComplete() {}
}
