import "./styles.css";
import * as THREE from "three";
import { loadTextAssets, createTextMaterial, Text } from "./Text";
import TouchTexture from "./TouchTexture";
import { EffectComposer, RenderPass, EffectPass } from "postprocessing";
import { WaterEffect } from "./WaterEffect";
import { Planes } from "./Planes";
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
    this.scene.background = new THREE.Color(0x161624);

    this.clock = new THREE.Clock();

    this.assets = {};
    this.raycaster = new THREE.Raycaster();
    this.hitObjects = [];

    this.touchTexture = new TouchTexture();

    this.subjects = [new Planes(this), new Text(this)];
    // this.subjects = [];

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
      // loadTextAssets(assets, loader);

      this.subjects.forEach(subject => subject.load(loader));

      loader.onComplete = () => {
        resolve();
      };
    });
  }
  initComposer() {
    console.log("init");
    const renderPass = new RenderPass(this.scene, this.camera);
    this.waterEffect = new WaterEffect({ texture: this.touchTexture.texture });
    const waterPass = new EffectPass(this.camera, this.waterEffect);
    waterPass.renderToScreen = true;
    renderPass.renderToScreen = false;
    this.composer.addPass(renderPass);
    this.composer.addPass(waterPass);
  }
  init() {
    this.touchTexture.initTexture();
    const assets = this.assets;

    // const textGeometry2 = createGeometry({
    //   font: assets.font,
    //   align: "center",
    //   width: 600,
    //   text: Array.from({ length: 100 }, () => "water").join(" ")
    // });
    // const textMaterial2 = createTextMaterial(assets.glyphs, {
    //   color: "rgba(20,20,20,1.0)"
    // });
    // const textMesh2 = new THREE.Mesh(textGeometry2, textMaterial2);
    // scale = 0.1;
    // console.log(textGeometry2.layout);
    // textMesh2.scale.x = scale;
    // textMesh2.scale.y = -scale;
    // textMesh2.position.z += -0.1;
    // textMesh2.position.x = (-textGeometry2.layout.width / 2) * scale;
    // textMesh2.position.y =
    //   (-textGeometry2.layout.height / 2) * scale +
    //   (-textGeometry2.layout.lineHeight / 4) * scale;
    // this.scene.add(textMesh2);

    this.initTextPlane();
    this.addHitPlane();
    this.subjects.forEach(subject => subject.init());
    this.initComposer();

    // this.addImagePlane();

    this.tick();

    window.addEventListener("resize", this.onResize);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("touchmove", this.onTouchMove);
  }
  onTouchMove(ev) {
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

    raycaster.setFromCamera(
      {
        x: (ev.clientX / window.innerWidth) * 2 - 1,
        y: -(ev.clientY / window.innerHeight) * 2 + 1
      },
      this.camera
    );
    // var intersections = raycaster.intersectObjects(this.hitObjects);
    // if (intersections.length > 0) {
    //   const intersect = intersections[0];
    //   this.touchTexture.addTouch(intersect.uv);
    // }
    this.subjects.forEach(subject => {
      if (subject.onMouseMove) {
        subject.onMouseMove(ev);
      }
    });
  }
  addImagePlane() {
    const viewSize = this.getViewSize();

    let width = viewSize.width / 4.5;

    const geometry = new THREE.PlaneBufferGeometry(
      width,
      viewSize.height * 0.8,
      1,
      1
    );
    let x = -viewSize.width / 2 + width / 2 + viewSize.width / 5 / 1.5;

    let space = (viewSize.width - (viewSize.width / 5 / 1.5) * 2 - width) / 2;
    for (let i = 0; i < 3; i++) {
      const material = new THREE.MeshBasicMaterial({ color: 0x484848 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x += x + i * space;
      this.scene.add(mesh);
    }
  }
  initTextPlane() {
    const viewSize = this.getViewSize();

    const geometry = new THREE.PlaneBufferGeometry(
      viewSize.width,
      viewSize.height,
      1,
      1
    );
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: new THREE.Uniform(this.touchTexture.texture),
        uLines: new THREE.Uniform(5),
        uLineWidth: new THREE.Uniform(0.01),
        uLineColor: new THREE.Uniform(new THREE.Color(0x202030))
      },
      transparent: true,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uLines;
        uniform float uLineWidth;
        uniform vec3 uLineColor;
        varying vec2 vUv;
        void main(){
          vec3 color = vec3(1.);
          color = vec3(0.);
          float line = step(0.5-uLineWidth/2.,fract(vUv.x * uLines)) - step(0.50 +uLineWidth/2.,fract(vUv.x * uLines));
          color += line * uLineColor;
          gl_FragColor = vec4(uLineColor,line);
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
    mesh.position.z = -0.001;
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
        if (child.material) child.material.dispose();
        if (child.geometry) child.geometry.dispose();
        // child.dispose();
      }
    });
    if (this.touchTexture) this.touchTexture.texture.dispose();
    this.scene.dispose();
    this.renderer.dispose();
    this.composer.dispose();
  }
  update() {
    this.touchTexture.update();
    this.subjects.forEach(subject => {
      subject.update();
    });
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

    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.subjects.forEach(subject => {
      subject.onResize(window.innerWidth, window.innerHeight);
    });
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
