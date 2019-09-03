import * as THREE from "three";

global.THREE = THREE;
const loadFont = require("load-bmfont");

const font = require("./static/SourceSansPro-Regular.json");
const GlyphURL = require("./static/SourceSansPro-Regular.png");
const MSDFShader = require("three-bmfont-text/shaders/msdf");
export const loadTextAssets = (assets, loader) => {
  assets.font = font;
  loader.begin("glyphs");
  var glyphsLoader = new THREE.TextureLoader();
  glyphsLoader.crossOrigin = "";
  glyphsLoader.load(GlyphURL, glyphs => {
    assets.glyphs = glyphs;
    loader.end("glyphs");
  });
};

export const createTextMaterial = (glyphs, options = {}) => {
  const mdsf = MSDFShader({
    transparent: true,
    side: THREE.DoubleSide,
    map: glyphs,
    color: "rgb(255,255,255)",
    negate: false,
    ...options
  });
  const material = new THREE.RawShaderMaterial({ ...mdsf });
  return material;
};
