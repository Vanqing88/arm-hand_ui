import * as THREE from 'three';
import URDFLoader from 'urdf-loader';

// 透明度设置函数
export const setRobotTransparency = (robot, opacity = 0.5, transparent = true) => {
  if (!robot) return;
  
  robot.traverse((child) => {
    if (child.isMesh) {
      // 处理单个材质
      if (child.material && !Array.isArray(child.material)) {
        // 确保材质是可以修改的（避免共享材质问题）
        if (child.material.isSharedMaterial) {
          child.material = child.material.clone();
        }
        
        child.material.transparent = transparent;
        child.material.opacity = opacity;
        child.material.needsUpdate = true;
        
        // 设置深度写入（对透明材质很重要）
        child.material.depthWrite = !transparent;
      }
      // 处理材质数组
      else if (Array.isArray(child.material)) {
        child.material = child.material.map(mat => {
          const newMat = mat.clone();
          newMat.transparent = transparent;
          newMat.opacity = opacity;
          newMat.needsUpdate = true;
          newMat.depthWrite = !transparent;
          return newMat;
        });
      }
    }
  });
};

// 创建透明机器人副本函数
export const createTransparentRobotCopy = (originalRobot, opacity = 0.4) => {
  // 深度克隆整个机器人
  const robotCopy = originalRobot.clone(true);
  
  // 为克隆的机器人设置独立的材质
  robotCopy.traverse((child) => {
    if (child.isMesh && child.material) {
      // 克隆材质避免共享
      child.material = child.material.clone();
      child.material.transparent = true;
      child.material.opacity = opacity;
      child.material.depthWrite = false;
      child.material.needsUpdate = true;
    }
  });
  
  return robotCopy;
};

// 加载双机器人实例
export const loadDualRobots = (scene, urdfPath, onLoadComplete) => {
  const loader = new URDFLoader();
  const robots = {};
  
  // 加载第一个机器人（实时值 - 透明）
  loader.load(urdfPath, (robot1) => {
    robot1.userData.type = 'realtime';
    
    // 等待加载完成后设置透明度
    setTimeout(() => {
      setRobotTransparency(robot1, 0.5, true);
    }, 500);
    
    scene.add(robot1);
    robots.realtime = robot1;
    
    // 如果两个机器人都加载完成，调用回调
    if (robots.planned) {
      onLoadComplete && onLoadComplete(robots);
    }
  });
  
  // 加载第二个机器人（规划值 - 正常）
  loader.load(urdfPath, (robot2) => {
    robot2.userData.type = 'planned';
    
    // 可以稍微偏移位置
    robot2.position.x = 0.01;
    
    scene.add(robot2);
    robots.planned = robot2;
    
    // 如果两个机器人都加载完成，调用回调
    if (robots.realtime) {
      onLoadComplete && onLoadComplete(robots);
    }
  });
  
  return robots;
};

// 检查机器人当前透明度状态
export const checkRobotTransparency = (robot) => {
  let isTransparent = false;
  let averageOpacity = 1.0;
  let opacityCount = 0;
  
  robot.traverse((child) => {
    if (child.isMesh && child.material) {
      if (child.material.transparent) {
        isTransparent = true;
      }
      if (typeof child.material.opacity === 'number') {
        averageOpacity += child.material.opacity;
        opacityCount++;
      }
    }
  });
  
  if (opacityCount > 0) {
    averageOpacity /= opacityCount;
  }
  
  return {
    isTransparent,
    averageOpacity,
    opacityCount
  };
};

// 批量设置透明度
export const batchSetTransparency = (robots, opacity, transparent) => {
  if (Array.isArray(robots)) {
    robots.forEach(robot => {
      if (robot) {
        setRobotTransparency(robot, opacity, transparent);
      }
    });
  } else if (typeof robots === 'object') {
    Object.values(robots).forEach(robot => {
      if (robot) {
        setRobotTransparency(robot, opacity, transparent);
      }
    });
  }
}; 