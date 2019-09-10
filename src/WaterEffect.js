import * as THREE from "three";
import { Effect } from "postprocessing";

export class WaterEffect extends Effect {
  constructor(options = {}) {
    super("WaterEffect", fragment, {
      uniforms: new Map([["uTexture", new THREE.Uniform(options.texture)]])
    });
    console.log(this);
  }
}
export default WaterEffect;

const fragment = `

uniform sampler2D uTexture;
#define PI 3.14159265359

void mainUv(inout vec2 uv) {
        vec4 tex = texture2D(uTexture, uv);
        float angle = -((tex.r) * (PI * 2.) - PI) ;
        float vx = -(tex.r *2. - 1.);
        float vy = -(tex.g *2. - 1.);
        float intensity = tex.b;
        uv.x += vx * 0.2 * intensity ;
        uv.y += vy * 0.2  *intensity;
        // uv.xy *= 1. - 0.5 * smoothstep( 0., 1., intensity) ;
        // uv.x +=  0.2 * intensity;
        // uv.y +=  0.2  *intensity;
    }
    

`;
// void mainImage(
//     const in vec4 inputColor,
//     const in vec2 uv,
//     out vec4 outputColor
// ){

//     float padding = 0.5;
//     vec2 transformedUV = uv;
//     transformedUV -= 0.5;
//     transformedUV *= 1. - padding;
//     transformedUV += 0.5;

//     float time = uTime;

//     float lines = 80.;

//     vec3 lineColor = vec3(0.1);

//     float dist = fract(transformedUV.y*lines + 0.5);

//     float nLine = floor(transformedUV.y*lines + 0.5) /  lines;

//     float line = (
//       smoothstep(0.1,0.,dist) + smoothstep(0.9,1.,dist)
//       ) ;

//     float offset = (rand(vec2(nLine)));

//     float bend = 0.5;
//     offset = sin(nLine * PI * 4. + PI/2.   ) *0.5+0.5;
//     transformedUV.x += offset * padding/2. *uProgress;

//     vec4 color = texture2D(inputBuffer, transformedUV);

//     vec4 coloredLines = vec4(
//       mix(vec3(0.), lineColor, line)
//       ,1.);
//     outputColor = color + coloredLines * (1.-greyScale(color.rgb)) ;
//     outputColor = color  ;
//     // outputColor = vec4(vec3(offset),1.);
//     // outputColor = vec4(vec3(step(greyScale(color.rgb),0.01) ),1.);
//     // outputColor= vec4(
//     //   mix(vec3(0.), lineColor, line)
//     //   ,1.);
//     // outputColor = coloredLines * vec4(vec3(1.-greyScale(color.rgb)),1.);

//   }
