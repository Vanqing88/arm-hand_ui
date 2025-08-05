import React, { useEffect, useRef, useState, useCallback, } from 'react';
import * as THREE from 'three';
import URDFLoader from 'urdf-loader';
import { DragControls } from 'three/examples/jsm/controls/DragControls';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import RobotArmTarget from './RobotArmTarget';
import ShowCoordinates from './ShowCoordinates';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader';
import config from "../config";
import { loadDualRobots, batchSetTransparency } from './RobotTransparencyUtils';
import { createVRLighting, disposeVRLighting } from './VRLighting';
import RobotCollisionDetector from './RobotCollisionDetector';
import RobotSelfCollisionDetector from './RobotSelfCollisionDetector';

const RobotViewer = ({
  isInteracting,
  onInteractionChange,
  rosServiceCalling,
  realTimeLeftArmValues,
  realTimeRightArmValues,
  plannedLeftArmValues,
  plannedRightArmValues,
  onLeftControlChange,
  onRightControlChange,
  onLeftMoveJSrvCall,
  onRightMoveJSrvCall,
  showRobotArmTarget,
  R_HandRef,
  L_HandRef,
  CoordinatesTemp,
  setCoordinatesTemp,
  handleLeftArmMoveLSrvCall,
  handleRightArmMoveLSrvCall,
                   // 碰撞检测相关属性
                 enableCollisionDetection = config.collisionDetection.enabled,
                 collisionThreshold = config.collisionDetection.threshold,
                 onCollisionStatusChange,
}) => {
  const canvasRef = useRef(null);
  const robotRef = useRef(null);
  const controlsRef = useRef(null);
  // {{CHENGQI:
  // Action: Removed; Timestamp: 2025-08-05T11:22:29+08:00; Reason: Remove unused variables after disabling mouse joint control;
  // }}
  // 移除不再需要的鼠标控制相关变量
  // const initialMouseY = useRef(null);
  // const initialMouseX = useRef(null);
  // const selectedObjectRef = useRef(null);
  // const isDragging = useRef(false);

  const [sceneReady, setSceneReady] = useState(false);
  const [robots, setRobots] = useState({});
  const lastUpdateRef = useRef(Date.now());
  const updateInterval = 100;
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  
  // 碰撞检测状态
  const [collisionStatus, setCollisionStatus] = useState({
    hasCollision: false,
    hasWarning: false,
    collisionCount: 0,
    warningCount: 0,
    totalCollisions: 0,
    details: []
  });

  // 存储关节-链接映射关系和原始材质
  const jointLinkMappingRef = useRef(new Map());
  const originalMaterialsRef = useRef(new Map());
  const warningMaterialsRef = useRef(null);

  // 存储planned模型的关节-链接映射关系和原始材质（独立于realtime模型）
  const plannedJointLinkMappingRef = useRef(new Map());
  const plannedOriginalMaterialsRef = useRef(new Map());

  const currentChoosedHandRef = useRef(null);

  const isInteractingRef = useRef(isInteracting);
  useEffect(() => {
    isInteractingRef.current = isInteracting;
  }, [isInteracting]);

  // 碰撞检测回调函数
  const handleCollisionStatusChange = useCallback((newStatus) => {
    setCollisionStatus(newStatus);
    if (onCollisionStatusChange) {
      onCollisionStatusChange(newStatus);
    }
  }, [onCollisionStatusChange]);

  const realTimeLeftArmValuesRef = useRef(realTimeLeftArmValues);
  useEffect(() => {
    realTimeLeftArmValuesRef.current = realTimeLeftArmValues;
  }, [realTimeLeftArmValues]);

  const realTimeRightArmValuesRef = useRef(realTimeRightArmValues);
  useEffect(() => {
    realTimeRightArmValuesRef.current = realTimeRightArmValues;
  }, [realTimeRightArmValues]);

  const plannedLeftArmValuesRef = useRef(plannedLeftArmValues);
  useEffect(() => {
    plannedLeftArmValuesRef.current = plannedLeftArmValues;
  }, [plannedLeftArmValues]);

  const plannedRightArmValuesRef = useRef(plannedRightArmValues);
  useEffect(() => {
    plannedRightArmValuesRef.current = plannedRightArmValues;
  }, [plannedRightArmValues]);

  const areJointValuesEqual = useCallback((currentValues, plannedValues) => {
    return Object.keys(plannedValues).every(
      (key) => currentValues[key] === plannedValues[key]
    );
  }, []);

  // 创建警告材质
  const createWarningMaterials = useCallback(() => {
    if (warningMaterialsRef.current) {
      return warningMaterialsRef.current;
    }
    
    const materials = {
      warning: new THREE.MeshStandardMaterial({
        color: 0xFF8C00,  // 橙色警告
        roughness: 0.4,
        metalness: 0.5,
        emissive: 0x441100,
      }),
      danger: new THREE.MeshStandardMaterial({
        color: 0xFF0000,  // 红色危险
        roughness: 0.4,
        metalness: 0.5,
        emissive: 0x440000,
      })
    };
    
    warningMaterialsRef.current = materials;
    return materials;
  }, []);

  // 检查关节是否接近极限值（仅检查机械臂关节）
  const checkJointLimitStatus = useCallback((jointName, currentValue) => {
    // 只获取机械臂关节限位配置，不包括手掌关节
    const armJointLimits = [
      ...config.armJointLimits.leftArm,
      ...config.armJointLimits.rightArm,
    ];
    
    // 查找对应关节的限位信息
    const jointLimit = armJointLimits.find(joint => joint.name === jointName);
    if (!jointLimit) {
      // 如果不是机械臂关节（比如手掌关节），返回normal，不改变颜色
      return 'normal';
    }
    
    const { min, max } = jointLimit;
    const range = max - min;
    const warningThreshold = 0.1; 
    const dangerThreshold = 0.05;   
    
    // 计算距离极限的比例
    const distanceToMin = Math.abs(currentValue - min) / range;
    const distanceToMax = Math.abs(currentValue - max) / range;
    const minDistance = Math.min(distanceToMin, distanceToMax);
    
    // console.log(`机械臂关节 ${jointName}: 当前值=${currentValue.toFixed(2)}, 范围=[${min}, ${max}], 最小距离=${minDistance.toFixed(3)}`);
    
    if (minDistance <= dangerThreshold) {
      // console.log(`机械臂关节 ${jointName} 进入危险状态（红色）！`);
      return 'danger';   // 红色 - 非常接近极限
    } else if (minDistance <= warningThreshold) {
      // console.log(`机械臂关节 ${jointName} 进入警告状态（橙色）！`);
      return 'warning';  // 橙色 - 接近极限
    }
    
    // console.log(`机械臂关节 ${jointName} 处于正常状态，保持原始颜色`);
    return 'normal';     // 保持原始颜色
  }, []);

  // 改进的手掌检测函数
  const isHandRelatedMesh = useCallback((meshChild, linkParent) => {
    // 明确的手掌链接名称
    const handLinkNames = ['HAND_R', 'HAND_L'];
    
    // 手掌相关的链接名称（包括TCP）
    const handRelatedLinkNames = ['HAND_R', 'HAND_L', 'TCP_R', 'TCP_L'];
    
    // 检查1：链接本身是否是手掌相关链接
    if (handRelatedLinkNames.includes(linkParent.name)) {
      return true;
    }
    
    // 检查2：网格对象名称是否包含手掌关键词
    if (meshChild.name) {
      const handKeywords = ['HAND', 'hand', 'Hand'];
      if (handKeywords.some(keyword => meshChild.name.includes(keyword))) {
        return true;
      }
    }
    
    // 检查3：向上遍历父节点，查看是否有手掌相关的祖先节点
    let currentParent = meshChild.parent;
    let depth = 0;
    while (currentParent && depth < 5) { // 限制搜索深度
      if (currentParent.name && handLinkNames.includes(currentParent.name)) {
        return true;
      }
      currentParent = currentParent.parent;
      depth++;
    }
    
    return false;
  }, []);

  // 建立关节到链接的映射关系（仅处理机械臂关节，严格排除手掌）
  const buildJointLinkMapping = useCallback((robot, robotType = 'realtime') => {
    if (!robot) return;
    
    // console.log(`开始建立${robotType}模型的机械臂关节-链接映射关系（严格排除手掌）...`);
    
    // 根据robotType选择对应的映射存储
    const targetMappingRef = robotType === 'planned' ? plannedJointLinkMappingRef : jointLinkMappingRef;
    const targetMaterialsRef = robotType === 'planned' ? plannedOriginalMaterialsRef : originalMaterialsRef;
    
    // 清空之前的映射
    targetMappingRef.current.clear();
    targetMaterialsRef.current.clear();
    
    // 获取机械臂关节名称列表
    const armJointNames = [
      ...config.armJointLimits.leftArm.map(joint => joint.name),
      ...config.armJointLimits.rightArm.map(joint => joint.name),
    ];
    
    // 明确的手掌链接名称
    const handLinkNames = ['HAND_R', 'HAND_L', 'TCP_R', 'TCP_L'];
    
    // console.log('机械臂关节列表:', armJointNames);
    
    // 遍历机器人的所有关节
    Object.entries(robot.joints).forEach(([jointName, joint]) => {
      // 只处理机械臂关节，跳过手掌关节
      if (armJointNames.includes(jointName)) {
        // console.log(`处理机械臂关节: ${jointName}`);
        
        // 查找与关节直接相关的链接，严格排除手掌部件
        const relatedLinks = [];
        
        // 遍历关节的直接子元素
        joint.children.forEach((child) => {
          if (child.isURDFLink) {
            // 检查是否为手掌相关部件
            const isHandRelated = handLinkNames.includes(child.name);
            
            if (!isHandRelated) {
              relatedLinks.push(child);
              // console.log(`机械臂关节 ${jointName} 包含链接: ${child.name}`);
            } else {
              // console.log(`排除手掌相关链接: ${child.name} (关节: ${jointName})`);
            }
          }
        });
        
        // 也可以通过父子关系更精确地查找，但排除手掌部件
        robot.traverse((child) => {
          if (child.isURDFLink && child.parent === joint) {
            // 检查是否为手掌相关部件
            const isHandRelated = handLinkNames.includes(child.name);
            
            if (!isHandRelated && !relatedLinks.includes(child)) {
              relatedLinks.push(child);
              // console.log(`机械臂关节 ${jointName} 通过父子关系包含链接: ${child.name}`);
            } else if (isHandRelated) {
              // console.log(`通过父子关系排除手掌链接: ${child.name} (关节: ${jointName})`);
            }
          }
        });
        
        if (relatedLinks.length > 0) {
          targetMappingRef.current.set(jointName, relatedLinks);
          // console.log(`${robotType}模型机械臂关节 ${jointName} 最终映射到 ${relatedLinks.length} 个非手掌链接`);
          
          // 保存原始材质（排除手掌部件）
          relatedLinks.forEach(link => {
            link.traverse((child) => {
              if (child.isMesh && child.material) {
                // 再次确认不是手掌相关的网格
                const isHandMesh = isHandRelatedMesh(child, link);
                
                if (!isHandMesh && !targetMaterialsRef.current.has(child.uuid)) {
                  // 深拷贝原始材质以避免引用问题
                  const originalMaterial = child.material.clone();
                  targetMaterialsRef.current.set(child.uuid, originalMaterial);
                  // console.log(`保存了${robotType}模型机械臂部件网格 ${child.uuid} 的原始材质 (链接: ${link.name})`);
                } else if (isHandMesh) {
                  // console.log(`跳过保存${robotType}模型手掌网格材质: ${child.uuid} (链接: ${link.name})`);
                }
              }
            });
          });
        } else {
          // console.log(`机械臂关节 ${jointName} 没有找到合适的非手掌链接`);
        }
      } else {
        // 跳过手掌关节，保持手掌原始外观
        // console.log(`跳过手掌关节: ${jointName}`);
      }
    });
    
    // console.log(`${robotType}模型机械臂关节映射关系建立完成，共处理 ${targetMappingRef.current.size} 个机械臂关节`);
    
    // 输出最终的映射关系供调试
    targetMappingRef.current.forEach((links, jointName) => {
      const linkNames = links.map(link => link.name);
      // console.log(`${robotType}模型最终映射 - 关节 ${jointName}: [${linkNames.join(', ')}]`);
    });
  }, [isHandRelatedMesh]);

  // 更新关节可视化颜色（仅处理机械臂关节）
  const updateJointVisualColor = useCallback((jointName, status, robotType = 'realtime') => {
    // console.log(`尝试更新${robotType}模型机械臂关节 ${jointName} 的颜色状态为: ${status}`);
    
    // 根据robotType选择对应的映射存储和材质存储
    const targetMappingRef = robotType === 'planned' ? plannedJointLinkMappingRef : jointLinkMappingRef;
    const targetMaterialsRef = robotType === 'planned' ? plannedOriginalMaterialsRef : originalMaterialsRef;
    
    const relatedLinks = targetMappingRef.current.get(jointName);
    if (!relatedLinks || relatedLinks.length === 0) {
      // 这里不输出错误信息，因为手掌关节本来就不在映射中
      return;
    }
    
    // console.log(`为${robotType}模型机械臂关节 ${jointName} 应用 ${status} 状态的材质`);
    
    // 更新所有相关链接的材质（再次确认排除手掌）
    relatedLinks.forEach(link => {
      link.traverse((child) => {
        if (child.isMesh && child.material) {
          // 最后一道防线：确保不更新手掌网格的材质
          const isHandMesh = isHandRelatedMesh(child, link);
          
          if (!isHandMesh) {
            // 检查该网格是否处于碰撞状态，如果是则不应用关节限位颜色
            if (child.userData.isCollisionState) {
              // console.log(`跳过${robotType}模型碰撞网格 ${child.uuid} 的关节限位颜色更新`);
              return;
            }
            
            if (status === 'normal') {
              // 恢复原始材质
              const originalMaterial = targetMaterialsRef.current.get(child.uuid);
              if (originalMaterial) {
                child.material = originalMaterial;
                // console.log(`恢复${robotType}模型机械臂部件网格 ${child.uuid} 的原始材质`);
              }
            } else {
              // 应用警告或危险材质
              const materials = createWarningMaterials();
              const targetMaterial = materials[status];
              if (targetMaterial) {
                child.material = targetMaterial;
                // console.log(`应用 ${status} 材质到${robotType}模型机械臂部件网格 ${child.uuid}`);
              }
            }
          } else {
            // console.log(`跳过${robotType}模型手掌网格材质更新: ${child.uuid} (链接: ${link.name})`);
          }
        }
      });
    });
  }, [createWarningMaterials, isHandRelatedMesh]);

  // 新增：判断planned与realTime是否一致
  const shouldShowPlannedValues = useCallback(() => {
    const eqL = Object.keys(plannedLeftArmValuesRef.current).every(
      key => plannedLeftArmValuesRef.current[key] === realTimeLeftArmValuesRef.current[key]
    );
    const eqR = Object.keys(plannedRightArmValuesRef.current).every(
      key => plannedRightArmValuesRef.current[key] === realTimeRightArmValuesRef.current[key]
    );
    return !(eqL && eqR);
  }, []);

  // 更新机器人关节值
  const updateRobotJointValues = useCallback((robot, leftArmValues, rightArmValues) => {
    if (!robot || !robot.joints) return;
    
    Object.entries(robot.joints).forEach(([jointName, joint]) => {
      if (jointName.endsWith('_L') && leftArmValues[jointName] !== undefined) {
        const angle = leftArmValues[jointName] * (Math.PI / 180);
        joint.setJointValue(angle);
      } else if (jointName.endsWith('_R') && rightArmValues[jointName] !== undefined) {
        const angle = rightArmValues[jointName] * (Math.PI / 180);
        joint.setJointValue(angle);
      }
    });
  }, []);

  useEffect(() => {
    const scene = new THREE.Scene();
    scene.rotateX(-Math.PI / 2);
    scene.background = new THREE.Color(0xf0f0f0);

    // 辅助线 - 红色线段：X 轴 绿色线段：Y 轴 蓝色线段：Z 轴
    const axesHelper = new THREE.AxesHelper(10);
    scene.add(axesHelper);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(1.5, 0.2, -0.5);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // 配置透明材质渲染
    renderer.setClearColor(0xf0f0f0, 1);
    renderer.sortObjects = true; // 启用对象排序
    renderer.alpha = true; // 启用alpha通道

    // 使用VR光照配置
    const lights = createVRLighting(scene);

    // 设置拖拽控制对象
    const objects = [];
    const loader1 = new ColladaLoader();
    
    // // 加载右手模型
    // loader1.load('./H1_Pro1/meshes_dae/HAND_R.dae', (Rcollada) => {
    //   const model1 = Rcollada.scene;
    //   model1.traverse((child) => {
    //     if (child.isMesh) {
    //       child.material.transparent = true;
    //       child.material.opacity = 0.5;
    //     }
    //   });
    //   model1.rotation.y = Math.PI;
    //   scene.add(model1);
    //   R_HandRef.current = model1;
    //   currentChoosedHandRef.current = R_HandRef.current;
    //   objects.push(model1);
    //   setSceneReady(true);
    // });

    // // 加载左手模型
    // loader1.load('./H1_Pro1/meshes_dae/HAND_L.dae', (Lcollada) => {
    //   const model = Lcollada.scene;
    //   model.traverse((child) => {
    //     if (child.isMesh) {
    //       child.material.transparent = true;
    //       child.material.opacity = 0.5;
    //     }
    //   });
    //   scene.add(model);
    //   L_HandRef.current = model;
    //   objects.push(model);
    //   setSceneReady(true);
    // });

    // 相机控制
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.2, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.enableZoom = false;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minPolarAngle = Math.PI / 2;
    controls.minAzimuthAngle = -Math.PI;
    controls.maxAzimuthAngle = Math.PI;
    controls.update();
    controlsRef.current = controls;

    // 加载双机器人模型
    const loadedRobots = loadDualRobots(scene, './H1_Pro1/urdf/H1_Pro1.urdf', (robots) => {
      console.log('双机器人模型加载完成');
      setRobots(robots);
      
      // 使用实时机器人作为主要引用
      robotRef.current = robots.realtime;
      
      // 等待所有网格加载完成后建立映射关系
      setTimeout(() => {
        // 为realtime模型建立映射关系
        buildJointLinkMapping(robots.realtime, 'realtime');
        // 为planned模型建立映射关系
        buildJointLinkMapping(robots.planned, 'planned');
        setSceneReady(true);
      }, 1000); // 增加延迟确保所有资源加载完成
    });

    // 保存scene和camera对象到ref中
    sceneRef.current = scene;
    cameraRef.current = camera;

    // 渲染循环
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(sceneRef.current, cameraRef.current);
    };
    animate();

    return () => {
      if (renderer) renderer.dispose();
      // 清理VR光照
      disposeVRLighting(lights);
    };
  }, [buildJointLinkMapping]);

  // 优化更新的频率，包含关节颜色更新逻辑和双机器人更新
  const updateArmvalues = useCallback(() => {
    const currentTime = Date.now();
    if (currentTime - lastUpdateRef.current < updateInterval) {
      return;
    }
    lastUpdateRef.current = currentTime;

    if (sceneReady && robots.realtime && robots.planned && 
        jointLinkMappingRef.current.size > 0 && plannedJointLinkMappingRef.current.size > 0) {
      // 更新实时机器人
      updateRobotJointValues(robots.realtime, realTimeLeftArmValuesRef.current, realTimeRightArmValuesRef.current);
      
      // 更新规划机器人
      updateRobotJointValues(robots.planned, plannedLeftArmValuesRef.current, plannedRightArmValuesRef.current);

      // 机器人模型关节更新（仅对机械臂关节进行颜色状态检查，手掌保持原始外观）
      const updateJointValuesWithColorCheck = (robot, values, suffix, robotType) => {
        Object.entries(robot.joints).forEach(([key, joint]) => {
          if (key.endsWith(suffix) && typeof values[key] === 'number' && !isNaN(values[key])) {
            const angle = values[key] * (Math.PI / 180);
            joint.setJointValue(angle);
            
            // 只对机械臂关节检查极限状态并更新颜色，手掌关节保持原始颜色
            const limitStatus = checkJointLimitStatus(key, values[key]);
            updateJointVisualColor(key, limitStatus, robotType);
          }
        });
      };

      // 对实时机器人进行颜色状态检查
      updateJointValuesWithColorCheck(robots.realtime, realTimeLeftArmValuesRef.current, '_L', 'realtime');
      updateJointValuesWithColorCheck(robots.realtime, realTimeRightArmValuesRef.current, '_R', 'realtime');
      
      // 对规划机器人进行颜色状态检查
      updateJointValuesWithColorCheck(robots.planned, plannedLeftArmValuesRef.current, '_L', 'planned');
      updateJointValuesWithColorCheck(robots.planned, plannedRightArmValuesRef.current, '_R', 'planned');
    }
  }, [sceneReady, robots, updateRobotJointValues, checkJointLimitStatus, updateJointVisualColor]);

  // 使用 setInterval 控制更新频率
  useEffect(() => {
    const interval = setInterval(updateArmvalues, updateInterval);
    return () => clearInterval(interval);
  }, [updateArmvalues]);

  // 兼容触摸和鼠标事件的辅助函数
  function getClientXY(event) {
    if (event.touches && event.touches.length > 0) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    } else if (event.changedTouches && event.changedTouches.length > 0) {
      return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
    } else {
      return { x: event.clientX, y: event.clientY };
    }
  }

  // {{CHENGQI:
  // Action: Removed; Timestamp: 2025-08-05T11:22:29+08:00; Reason: Remove unused function after disabling mouse joint control;
  // }}
  // 移除不再需要的鼠标控制相关函数
  // 递归查找父对象，找到name以_L或_R结尾的对象（手臂关节）
  // function findArmJointObject(obj) {
  //   let current = obj;
  //   while (current) {
  //     if (current.name && (current.name.endsWith('_L') || current.name.endsWith('_R'))) {
  //       return current;
  //     }
  //     current = current.parent;
  //   }
  //   return null;
  // }

  // {{CHENGQI:
  // Action: Disabled; Timestamp: 2025-08-05T11:22:29+08:00; Reason: Disable mouse joint control to prevent accidental robot movement when dragging page;
  // }}
  // 禁用鼠标关节控制 - 用户反馈拖动页面时会引起机器人执行运动
  const onMouseDown = useCallback((event) => {
    // 鼠标关节控制已禁用，只保留相机控制
    // 所有机器人控制现在通过控制面板进行
    if (event.touches) event.preventDefault();
  });

  // {{CHENGQI:
  // Action: Disabled; Timestamp: 2025-08-05T11:22:29+08:00; Reason: Disable mouse joint control to prevent accidental robot movement when dragging page;
  // }}
  // 禁用鼠标关节控制 - 用户反馈拖动页面时会引起机器人执行运动
  const onMouseMove = useCallback((event) => {
    // 鼠标关节控制已禁用，只保留相机控制
    // 所有机器人控制现在通过控制面板进行
    if (event.touches) event.preventDefault();
  });

  // {{CHENGQI:
  // Action: Removed; Timestamp: 2025-08-05T11:22:29+08:00; Reason: Remove unused functions after disabling mouse joint control;
  // }}
  // 移除不再需要的鼠标控制相关函数
  // 提取为一个函数，判断并更新关节值
  // const getUpdatedJointValues = (name, jointValueChange) => {
  //   let newValues = 0;
  //   const isLeftArm = name.endsWith('_L');
  //   const isRightArm = name.endsWith('_R');

  //   if (isLeftArm) {
  //     newValues = plannedLeftArmValuesRef.current[name] + jointValueChange;
  //     newValues = validateJointValue(newValues);
  //     plannedLeftArmValuesRef.current[name] = newValues;
  //   } else if (isRightArm) {
  //     newValues = plannedRightArmValuesRef.current[name] + jointValueChange;
  //     newValues = validateJointValue(newValues);
  //     plannedRightArmValuesRef.current[name] = newValues;
  //   }

  //   return { newValues, isLeftArm, isRightArm };
  // };

  // 验证关节值是否有效
  // const validateJointValue = (value) => {
  //   return isNaN(value) ? 0 : value;
  // };

  // {{CHENGQI:
  // Action: Disabled; Timestamp: 2025-08-05T11:22:29+08:00; Reason: Disable mouse joint control to prevent accidental robot movement when dragging page;
  // }}
  // 禁用鼠标关节控制 - 用户反馈拖动页面时会引起机器人执行运动
  const onMouseUp = useCallback((event) => {
    // 鼠标关节控制已禁用，只保留相机控制
    // 所有机器人控制现在通过控制面板进行
    if (event.touches || event.changedTouches) event.preventDefault();
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    // 鼠标事件
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    // 触摸事件
    canvas.addEventListener('touchstart', onMouseDown, { passive: false });
    canvas.addEventListener('touchmove', onMouseMove, { passive: false });
    canvas.addEventListener('touchend', onMouseUp, { passive: false });
    canvas.addEventListener('touchcancel', onMouseUp, { passive: false });
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
      canvas.removeEventListener('touchstart', onMouseDown);
      canvas.removeEventListener('touchmove', onMouseMove);
      canvas.removeEventListener('touchend', onMouseUp);
      canvas.removeEventListener('touchcancel', onMouseUp);
    };
  }, [onMouseDown, onMouseMove, onMouseUp]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} />
      
      {/* 规划模型自碰撞检测组件 */}
      {enableCollisionDetection && sceneReady && robots.planned && (
        <RobotSelfCollisionDetector
          robot={robots.planned}
          isEnabled={enableCollisionDetection}
          threshold={collisionThreshold}
          onCollisionChange={handleCollisionStatusChange}
        />
      )}

      {/* 机器人手臂目标控制 */}
      {showRobotArmTarget && (
        <RobotArmTarget
          L_HandRef={L_HandRef}
          R_HandRef={R_HandRef}
          CoordinatesTemp={CoordinatesTemp}
          setCoordinatesTemp={setCoordinatesTemp}
          handleLeftArmMoveLSrvCall={handleLeftArmMoveLSrvCall}
          handleRightArmMoveLSrvCall={handleRightArmMoveLSrvCall}
        />
      )}

      {/* 坐标显示 */}
      {CoordinatesTemp.show && (
        <ShowCoordinates CoordinatesTemp={CoordinatesTemp} />
      )}
    </div>
  );
};

export default RobotViewer;