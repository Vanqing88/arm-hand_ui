import * as THREE from 'three';

// VR灯光组件 - 为VR场景优化的光照配置
export function VRLighting() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 2, 3]} intensity={1.2} />
      <pointLight position={[-5, 5, 5]} intensity={0.8} />
    </>
  );
}

// 创建VR光照的函数版本（用于非React组件）
export function createVRLighting(scene) {
  // 环境光 - 提供基础照明
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  // 方向光 - 主要光源，模拟太阳光
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight.position.set(3, 2, 3);
  scene.add(directionalLight);

  // 点光源 - 补充光源，增加场景层次感
  const pointLight = new THREE.PointLight(0xffffff, 0.8);
  pointLight.position.set(-5, 5, 5);
  scene.add(pointLight);

  return {
    ambientLight,
    directionalLight,
    pointLight
  };
}

// 清理光照的函数
export function disposeVRLighting(lights) {
  if (lights.ambientLight) {
    lights.ambientLight.dispose();
  }
  if (lights.directionalLight) {
    lights.directionalLight.dispose();
  }
  if (lights.pointLight) {
    lights.pointLight.dispose();
  }
} 