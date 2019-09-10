import * as THREE from "three";
import { lerp } from "./utils";

const ImageURL = require("./static/image-1.jpg");
export class Planes {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.meshes = [];
    this.hovering = -1;
    this.uniforms = {
      uPlaneSize: new THREE.Uniform(new THREE.Vector2(0, 0))
    };
  }
  init() {
    const { width, height } = this.sceneManager.getViewSize();

    const planeMetrics = this.getPlaneMetrics(width, height);

    const geometry = new THREE.PlaneBufferGeometry(
      planeMetrics.planeWidth,
      planeMetrics.planeHeight,
      1,
      1
    );
    this.uniforms.uPlaneSize.value.set(
      planeMetrics.planeWidth,
      planeMetrics.planeHeight
    );
    this.uniforms.uPlaneSize.needsUpdate = true;

    let translateToLeft = -width / 2 + planeMetrics.planeWidth / 2;
    let x = translateToLeft + planeMetrics.x;

    let space = planeMetrics.space;
    for (let i = 0; i < 3; i++) {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uZoom: new THREE.Uniform(0),
          uZoomDelta: new THREE.Uniform(0.2),
          uPlaneSize: this.uniforms.uPlaneSize,
          uImage: new THREE.Uniform(this.image),
          uImageSize: new THREE.Uniform(
            new THREE.Vector2(this.image.image.width, this.image.image.height)
          ),
          uMouse: new THREE.Uniform(new THREE.Vector2(0, 0))
        },
        fragmentShader,
        vertexShader
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = x + i * space;
      mesh.userData.index = i;
      this.meshes.push(mesh);
      this.sceneManager.scene.add(mesh);
    }
  }
  onMouseMove(ev) {
    const raycaster = this.sceneManager.raycaster;
    var intersections = raycaster.intersectObjects(this.meshes);
    if (intersections.length > 0) {
      const intersection = intersections[0];
      const index = intersection.object.userData.index;
      this.hovering = index;
      this.meshes[index].material.uniforms.uMouse.value.set(
        intersection.uv.x,
        intersection.uv.y
      );
    } else {
      this.hovering = -1;
    }
  }
  update() {
    const meshes = this.meshes;
    for (let i = 0; i < 3; i++) {
      const zoomTarget = this.hovering === i ? 1 : 0;
      const uZoom = meshes[i].material.uniforms.uZoom;

      const zoomChange = lerp(uZoom.value, zoomTarget, 0.1, 0.00001);
      if (zoomChange !== 0) {
        uZoom.value += zoomChange;
        uZoom.needsUpdate = true;
      }
    }
  }
  load(loader) {
    loader.begin("image");
    var textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = "";
    textureLoader.load(ImageURL, image => {
      this.image = image;
      loader.end("image");
    });
  }
  getPlaneMetrics(width, height) {
    const planeWidth = width / 4.5;
    return {
      planeWidth,
      planeHeight: height * 0.8,
      x: width / 5 / 1.5,
      // Calculate the resting(empty) space and divided by number of planes
      space: (width - (width / 5 / 1.5) * 2 - planeWidth) / 2
    };
  }
  onResize(width, height) {
    const viewSize = this.sceneManager.getViewSize();

    const planeMetrics = this.getPlaneMetrics(viewSize.width, viewSize.height);
    const geometry = new THREE.PlaneBufferGeometry(
      planeMetrics.planeWidth,
      planeMetrics.planeHeight,
      1,
      1
    );

    this.uniforms.uPlaneSize.value.set(
      planeMetrics.planeWidth,
      planeMetrics.planeHeight
    );
    this.uniforms.uPlaneSize.needsUpdate = true;

    let translateToLeft = -viewSize.width / 2 + planeMetrics.planeWidth / 2;
    let x = translateToLeft + planeMetrics.x;
    let space = planeMetrics.space;

    this.meshes.forEach((mesh, i) => {
      mesh.geometry.dispose();
      mesh.geometry = geometry;
      mesh.position.x = x + i * space;
    });
  }
}

const fragmentShader = `
uniform float uZoom;
uniform float uZoomDelta;
uniform vec2 uMouse;

uniform vec2 uPlaneSize;
uniform sampler2D uImage;
uniform vec2 uImageSize;

varying vec2 vUv;

vec2 withRatio(vec2 uv, vec2 canvasSize, vec2 textureSize){
    
    vec2 ratio = vec2(
        min((canvasSize.x / canvasSize.y) / (textureSize.x / textureSize.y), 1.0),
        min((canvasSize.y / canvasSize.x) / (textureSize.y / textureSize.x), 1.0)
      );

    return vec2(
        uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
        uv.y * ratio.y + (1.0 - ratio.y) * 0.5
      );
}
vec3 greyScale(vec3 color){
    return vec3(color.r + color.g + color.b)/3.;
}

void main() {
    vec2 uv = vUv;
    uv -= 0.5;
    uv *= 1.- uZoomDelta * uZoom;
    uv += uZoomDelta * (uMouse-0.5) * 0.5 * uZoom;
    uv += 0.5;
    uv = withRatio(uv, uPlaneSize, uImageSize);
    vec3 tex = texture2D(uImage, uv).xyz;
  vec3 color = vec3(0.2 + uZoom * 0.5);
  color = mix(greyScale(tex)*0.5, tex, uZoom);
  gl_FragColor = vec4(color,1.);
}`;
const vertexShader = `
varying vec2 vUv;
void main() {
  vec3 pos = position.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.);
    vUv = uv;
}`;
