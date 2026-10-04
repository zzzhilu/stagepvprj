import * as THREE from 'three';
import { addShaderPatch, hasShaderPatch } from './shader-patch';

/**
 * 舞台板平面反射:反射直接做在被指定物件(🪞)自己的材質上。
 *
 * - 反射畫面:SceneGraph 的 PlanarMirror 每幀以鏡像相機只渲染 REFLECT_LAYER(LED)到 render target,
 *   並更新下方共享 uniforms(世界座標 → 反射貼圖的投影矩陣、平面高度)。
 * - 材質:onBeforeCompile 注入,在 opaque_fragment 前把反射加到 outgoingLight;
 *   受材質本身的粗糙度(模糊 + 衰減)、金屬度/顏色(F0 色調)、凹凸貼圖(扭曲)與 Fresnel 影響。
 * - 只有「朝上」且「高度 = 平面高度」的表面會反射(側面、其他高度的面不受影響)。
 *
 * 所有材質共享同一組 uniform 物件,更新一處全場生效;每個材質另有自己的開關 uniform
 * (關閉 🪞 時只把開關設 0,不重編譯 shader)。
 */
export const planarReflectionUniforms = {
    uMirrorMap: { value: null as THREE.Texture | null },
    uMirrorMatrix: { value: new THREE.Matrix4() },
    uMirrorTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
    uMirrorPlaneY: { value: 0 },
    uMirrorStrength: { value: 1 },
    uMirrorBlur: { value: 0 },
    /** 本幀反射畫面是否有效(相機在平面下方 / 未啟用時為 0) */
    uMirrorActive: { value: 0 },
};

const PATCH_KEY = 'planar-reflection-v1';
const onUniforms = new WeakMap<THREE.Material, { value: number }>();

const VERTEX_PARS = `
varying vec3 vMirrorWorldPos;`;

const VERTEX_MAIN = `
	{
		vec4 mirrorWp = vec4( transformed, 1.0 );
		#ifdef USE_INSTANCING
			mirrorWp = instanceMatrix * mirrorWp;
		#endif
		vMirrorWorldPos = ( modelMatrix * mirrorWp ).xyz;
	}`;

const FRAGMENT_PARS = `
varying vec3 vMirrorWorldPos;
uniform sampler2D uMirrorMap;
uniform mat4 uMirrorMatrix;
uniform vec2 uMirrorTexel;
uniform float uMirrorPlaneY;
uniform float uMirrorStrength;
uniform float uMirrorBlur;
uniform float uMirrorActive;
uniform float uMirrorOn;
// mip-based 模糊:LOD bias 讓硬體做三線性插值(與 roughness 同原理),
// 再以 4 個偏移取樣柔化 mip 方塊與層間接縫(螢幕空間偏移乘 uv.w 保持透視一致)
vec3 mirrorSample( vec4 uv, float lod ) {
	if ( lod < 0.01 ) return texture2DProj( uMirrorMap, uv ).rgb;
	vec2 o = uMirrorTexel * uv.w * exp2( lod ) * 0.5; // 偏移跟著 mip 尺度放大,高 LOD 不會出現方塊感
	vec3 sum = texture2DProj( uMirrorMap, uv, lod ).rgb * 0.4;
	sum += texture2DProj( uMirrorMap, uv + vec4( o.x, o.y, 0.0, 0.0 ), lod ).rgb * 0.15;
	sum += texture2DProj( uMirrorMap, uv + vec4( -o.x, o.y, 0.0, 0.0 ), lod ).rgb * 0.15;
	sum += texture2DProj( uMirrorMap, uv + vec4( o.x, -o.y, 0.0, 0.0 ), lod ).rgb * 0.15;
	sum += texture2DProj( uMirrorMap, uv + vec4( -o.x, -o.y, 0.0, 0.0 ), lod ).rgb * 0.15;
	return sum;
}`;

const FRAGMENT_MAIN = `
	if ( uMirrorOn * uMirrorActive > 0.5 ) {
		// 遮罩:幾何法線朝上(不受凹凸影響)且位於平面高度(容差數公分)
		vec3 mGeoN = inverseTransformDirection( nonPerturbedNormal, viewMatrix );
		float mMask = smoothstep( 0.85, 0.97, abs( mGeoN.y ) )
			* ( 1.0 - smoothstep( 0.02, 0.06, abs( vMirrorWorldPos.y - uMirrorPlaneY ) ) );
		if ( mMask > 0.0 ) {
			vec4 mUv = uMirrorMatrix * vec4( vMirrorWorldPos, 1.0 );
			// 凹凸(拉絲/格紋/噪點)讓反射隨表面起伏扭曲
			vec3 mPertN = inverseTransformDirection( normal, viewMatrix );
			mUv.xy += ( mPertN.xz - mGeoN.xz ) * 0.15 * mUv.w;
			float mRough = clamp( roughnessFactor, 0.0, 1.0 );
			vec3 mRefl = mirrorSample( mUv, uMirrorBlur + mRough * 6.0 );
			// Fresnel:斜看較亮、正看較淡;金屬材質反射帶自身顏色
			float mNdV = clamp( dot( normal, geometryViewDir ), 0.0, 1.0 );
			vec3 mF0 = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
			// 粗糙表面的掠射角增亮較弱
			vec3 mK = mix( max( mF0, vec3( 0.35 ) ), vec3( 1.0 ), pow( 1.0 - mNdV, 5.0 ) * ( 1.0 - mRough ) );
			outgoingLight += mRefl * mK * ( 1.0 - mRough ) * uMirrorStrength * mMask;
		}
	}
	#include <opaque_fragment>`;

/**
 * 開關材質的平面反射。首次開啟時注入 shader(會重編譯一次);之後開關只改 uniform。
 * 僅支援 MeshStandardMaterial / MeshPhysicalMaterial(其他材質忽略)。
 */
export function setPlanarReflection(mat: THREE.Material, on: boolean) {
    if (!(mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) return;
    let onUniform = onUniforms.get(mat);
    if (!onUniform) {
        if (!on) return; // 從未開啟過:不需注入
        onUniform = { value: 0 };
        onUniforms.set(mat, onUniform);
    }
    onUniform.value = on ? 1 : 0;
    if (!on || hasShaderPatch(mat, PATCH_KEY)) return;

    const myOn = onUniform;
    addShaderPatch(mat, PATCH_KEY, (shader) => {
        Object.assign(shader.uniforms, planarReflectionUniforms, { uMirrorOn: myOn });
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>' + VERTEX_PARS)
            .replace('#include <project_vertex>', '#include <project_vertex>' + VERTEX_MAIN);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>' + FRAGMENT_PARS)
            .replace('#include <opaque_fragment>', FRAGMENT_MAIN);
    });
    mat.needsUpdate = true;
}
