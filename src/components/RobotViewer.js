import React, { useEffect, useRef, useState, useCallback, } from 'react';
import * as THREE from 'three';
import URDFLoader from 'urdf-loader';
import { DragControls } from 'three/examples/jsm/controls/DragControls';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import RobotArmTarget from './RobotArmTarget';
import ShowCoordinates from './ShowCoordinates';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader';
import config from "../config";
import CollisionDetector from '../utils/CollisionDetector';

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
  onCollisionStatusChange,
}) => {
  const canvasRef = useRef(null);
  const robotRef = useRef(null);
  const controlsRef = useRef(null);
  const initialMouseY = useRef(null);
  const initialMouseX = useRef(null);
  const selectedObjectRef = useRef(null);
  const isDragging = useRef(false);

  const [sceneReady, setSceneReady] = useState(false);
  const lastUpdateRef = useRef(Date.now());
  const updateInterval = 300; // 从200ms增加到300ms，进一步减少闪烁
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);

  // 存储关节-链接映射关系和原始材质
  const jointLinkMappingRef = useRef(new Map());
  const originalMaterialsRef = useRef(new Map());
  const warningMaterialsRef = useRef(null);
  const collisionMaterialsRef = useRef(null);

  // 碰撞检测器
  const collisionDetectorRef = useRef(null);
  const collidingLinksRef = useRef(new Set());
  
  // 添加材质状态缓存，避免重复设置相同材质
  const materialStateCacheRef = useRef(new Map());
  const lastJointValuesRef = useRef({ left: {}, right: {} });
  
  // 添加防抖机制
  const materialUpdateTimeoutRef = useRef(null);
  const pendingMaterialUpdatesRef = useRef(new Set());
  
  // 添加碰撞检测更新控制
  const lastCollisionUpdateRef = useRef(0);
  const collisionUpdateInterval = 500; // 碰撞检测更新间隔

  const currentChoosedHandRef = useRef(null);

  const isInteractingRef = useRef(isInteracting);
  useEffect(() => {
    isInteractingRef.current = isInteracting;
  }, [isInteracting]);

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

  // 创建碰撞材质
  const createCollisionMaterials = useCallback(() => {
    if (collisionMaterialsRef.current) {
      return collisionMaterialsRef.current;
    }
    
    const materials = {
      collision: new THREE.MeshStandardMaterial({
        color: 0x0080FF,  // 蓝色碰撞
        roughness: 0.4,
        metalness: 0.6,
        emissive: 0x001144,
        transparent: true,
        opacity: 0.8,
      })
    };
    
    collisionMaterialsRef.current = materials;
    return materials;
  }, []);

  // 更新碰撞可视化颜色（适用于所有链接，包括手掌）
  const updateCollisionVisualColor = useCallback((linkName, status) => {
    if (!robotRef.current) return;
    
    // 直接查找指定名称的链接
    let targetLink = null;
    robotRef.current.traverse((child) => {
      if (child.isURDFLink && child.name === linkName) {
        targetLink = child;
      }
    });
    
    if (!targetLink) {
      return;
    }
    
    // 更新链接的材质
    targetLink.traverse((child) => {
      if (child.isMesh && child.material) {
        if (status === 'normal') {
          // 恢复原始材质
          const originalMaterial = originalMaterialsRef.current.get(child.uuid);
          if (originalMaterial) {
            child.material = originalMaterial;
          }
        } else if (status === 'collision') {
          // 应用碰撞材质（蓝色）
          const materials = createCollisionMaterials();
          const targetMaterial = materials[status];
          if (targetMaterial) {
            child.material = targetMaterial;
          }
        }
      }
    });
  }, [createCollisionMaterials]);

  // 保存所有链接的原始材质
  const saveAllOriginalMaterials = useCallback((robot) => {
    if (!robot) return;
    
    robot.traverse((child) => {
      if (child.isURDFLink) {
        child.traverse((meshChild) => {
          if (meshChild.isMesh && meshChild.material) {
            if (!originalMaterialsRef.current.has(meshChild.uuid)) {
              // 深拷贝原始材质
              const originalMaterial = meshChild.material.clone();
              originalMaterialsRef.current.set(meshChild.uuid, originalMaterial);
            }
          }
        });
      }
    });
    
    console.log(`保存了 ${originalMaterialsRef.current.size} 个原始材质`);
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
    const warningThreshold = 0.1; // 当接近25%的极限范围时开始警告（更容易测试）
    const dangerThreshold = 0.01;   // 当接近10%的极限范围时显示危险
    
    // 计算距离极限的比例
    const distanceToMin = Math.abs(currentValue - min) / range;
    const distanceToMax = Math.abs(currentValue - max) / range;
    const minDistance = Math.min(distanceToMin, distanceToMax);
    
    if (minDistance <= dangerThreshold) {
      return 'danger';   // 红色 - 非常接近极限
    } else if (minDistance <= warningThreshold) {
      return 'warning';  // 橙色 - 接近极限
    }
    
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

  // 初始化碰撞检测
  const initializeCollisionDetection = useCallback((robot) => {
    if (!robot) return;
    
    console.log('初始化碰撞检测系统...');
    
    // 创建碰撞检测器
    collisionDetectorRef.current = new CollisionDetector();
    
    // 关闭调试模式，避免调试网格导致的闪烁
    const debugMode = false; // 设置为 false 以关闭调试网格
    collisionDetectorRef.current.setDebugMode(debugMode);
    
    // 保存所有链接的原始材质（用于碰撞检测）
    saveAllOriginalMaterials(robot);
    
    // 设置碰撞回调
    collisionDetectorRef.current.setCollisionCallback((event) => {
      if (event.type === 'collision') {
        console.log(`检测到碰撞: ${event.linkA.name} <-> ${event.linkB.name}`);
        collidingLinksRef.current.add(event.linkA.name);
        collidingLinksRef.current.add(event.linkB.name);
        
        // 暂时禁用碰撞材质更新，避免与关节极限材质冲突
        // updateCollisionVisualColor(event.linkA.name, 'collision');
        // updateCollisionVisualColor(event.linkB.name, 'collision');
        
        // 通知父组件碰撞状态变化
        if (onCollisionStatusChange) {
          const hasCollision = collisionDetectorRef.current.hasAnyCollision();
          const collisionPairs = collisionDetectorRef.current.getAllCollisionPairs();
          onCollisionStatusChange(hasCollision, collisionPairs);
        }
      } else if (event.type === 'collision_end') {
        console.log(`碰撞结束: ${event.linkA.name} <-> ${event.linkB.name}`);
        
        // 使用事件中提供的碰撞状态信息
        if (!event.linkAStillColliding) {
          collidingLinksRef.current.delete(event.linkA.name);
          // updateCollisionVisualColor(event.linkA.name, 'normal');
        }
        if (!event.linkBStillColliding) {
          collidingLinksRef.current.delete(event.linkB.name);
          // updateCollisionVisualColor(event.linkB.name, 'normal');
        }
        
        // 通知父组件碰撞状态变化
        if (onCollisionStatusChange) {
          const hasCollision = collisionDetectorRef.current.hasAnyCollision();
          const collisionPairs = collisionDetectorRef.current.getAllCollisionPairs();
          onCollisionStatusChange(hasCollision, collisionPairs);
        }
      }
    });
    
    // 将机器人添加到物理世界
    collisionDetectorRef.current.addRobotToPhysicsWorld(robot);
    
    // 如果开启了调试模式，创建可视化
    if (debugMode && sceneRef.current) {
      collisionDetectorRef.current.createDebugVisualization(sceneRef.current);
    }
  }, [onCollisionStatusChange, updateCollisionVisualColor, saveAllOriginalMaterials]);

  // 建立关节到链接的映射关系（仅处理机械臂关节，严格排除手掌）
  const buildJointLinkMapping = useCallback((robot) => {
    if (!robot) return;
    
    // 清空之前的映射
    jointLinkMappingRef.current.clear();
    originalMaterialsRef.current.clear();
    
    // 获取机械臂关节名称列表
    const armJointNames = [
      ...config.armJointLimits.leftArm.map(joint => joint.name),
      ...config.armJointLimits.rightArm.map(joint => joint.name),
    ];
    
    // 明确的手掌链接名称
    const handLinkNames = ['HAND_R', 'HAND_L', 'TCP_R', 'TCP_L'];
    
    // 遍历机器人的所有关节
    Object.entries(robot.joints).forEach(([jointName, joint]) => {
      // 只处理机械臂关节，跳过手掌关节
      if (armJointNames.includes(jointName)) {
        // 查找与关节直接相关的链接，严格排除手掌部件
        const relatedLinks = [];
        
        // 遍历关节的直接子元素
        joint.children.forEach((child) => {
          if (child.isURDFLink) {
            // 检查是否为手掌相关部件
            const isHandRelated = handLinkNames.includes(child.name);
            
            if (!isHandRelated) {
              relatedLinks.push(child);
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
            }
          }
        });
        
        if (relatedLinks.length > 0) {
          jointLinkMappingRef.current.set(jointName, relatedLinks);
          
          // 保存原始材质（排除手掌部件）
          relatedLinks.forEach(link => {
            link.traverse((child) => {
              if (child.isMesh && child.material) {
                // 再次确认不是手掌相关的网格
                const isHandMesh = isHandRelatedMesh(child, link);
                
                if (!isHandMesh && !originalMaterialsRef.current.has(child.uuid)) {
                  // 深拷贝原始材质以避免引用问题
                  const originalMaterial = child.material.clone();
                  originalMaterialsRef.current.set(child.uuid, originalMaterial);
                }
              }
            });
          });
        }
      }
    });
    
    console.log(`关节映射完成，共处理 ${jointLinkMappingRef.current.size} 个机械臂关节`);
  }, [isHandRelatedMesh]);

  // 更新关节可视化颜色（仅处理机械臂关节）
  const updateJointVisualColor = useCallback((jointName, status) => {
    const relatedLinks = jointLinkMappingRef.current.get(jointName);
    if (!relatedLinks || relatedLinks.length === 0) {
      // 这里不输出错误信息，因为手掌关节本来就不在映射中
      return;
    }
    
    // 更新所有相关链接的材质（再次确认排除手掌）
    relatedLinks.forEach(link => {
      // 检查链接是否发生碰撞，碰撞状态优先于关节极限状态
      const isColliding = collidingLinksRef.current.has(link.name);
      
      link.traverse((child) => {
        if (child.isMesh && child.material) {
          // 最后一道防线：确保不更新手掌网格的材质
          const isHandMesh = isHandRelatedMesh(child, link);
          
          if (!isHandMesh) {
            if (isColliding) {
              // 碰撞状态优先，保持蓝色
              return;
            }
            
            if (status === 'normal') {
              // 恢复原始材质
              const originalMaterial = originalMaterialsRef.current.get(child.uuid);
              if (originalMaterial) {
                child.material = originalMaterial;
              }
            } else {
              // 应用警告或危险材质
              const materials = createWarningMaterials();
              const targetMaterial = materials[status];
              if (targetMaterial) {
                child.material = targetMaterial;
              }
            }
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

  // 防抖的材质更新函数
  const debouncedUpdateJointVisualColor = useCallback((jointName, status) => {
    // 暂时完全禁用材质更新，测试是否是材质更新导致的闪烁
    return;
    
    const cacheKey = `${jointName}_limit`;
    const currentState = materialStateCacheRef.current.get(cacheKey);
    
    // 如果状态没有改变，直接返回
    if (currentState === status) {
      return;
    }
    
    // 添加到待更新列表
    pendingMaterialUpdatesRef.current.add(jointName);
    
    // 清除之前的定时器
    if (materialUpdateTimeoutRef.current) {
      clearTimeout(materialUpdateTimeoutRef.current);
    }
    
    // 设置新的定时器，延迟更新材质
    materialUpdateTimeoutRef.current = setTimeout(() => {
      pendingMaterialUpdatesRef.current.forEach(joint => {
        const cacheKey = `${joint}_limit`;
        const currentState = materialStateCacheRef.current.get(cacheKey);
        const newStatus = checkJointLimitStatus(joint, 
          shouldShowPlannedValues() 
            ? (plannedLeftArmValuesRef.current[joint] || plannedRightArmValuesRef.current[joint])
            : (realTimeLeftArmValuesRef.current[joint] || realTimeRightArmValuesRef.current[joint])
        );
        
        if (currentState !== newStatus) {
          updateJointVisualColor(joint, newStatus);
          materialStateCacheRef.current.set(cacheKey, newStatus);
        }
      });
      
      pendingMaterialUpdatesRef.current.clear();
      materialUpdateTimeoutRef.current = null;
    }, 100); // 100ms防抖延迟
  }, [checkJointLimitStatus, shouldShowPlannedValues, updateJointVisualColor]);

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

    const light = new THREE.AmbientLight(0x808080);
    scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 2, 5).normalize();
    scene.add(directionalLight);

    // 设置拖拽控制对象
    const objects = [];
    const loader1 = new ColladaLoader();
    
    // 加载右手模型
    loader1.load('./H1_Pro1/meshes_dae/HAND_R.dae', (Rcollada) => {
      const model1 = Rcollada.scene;
      model1.traverse((child) => {
        if (child.isMesh) {
          child.material.transparent = true;
          child.material.opacity = 0.5;
        }
      });
      model1.rotation.y = Math.PI;
      scene.add(model1);
      R_HandRef.current = model1;
      currentChoosedHandRef.current = R_HandRef.current;
      objects.push(model1);
      setSceneReady(true);
    });

    // 加载左手模型
    loader1.load('./H1_Pro1/meshes_dae/HAND_L.dae', (Lcollada) => {
      const model = Lcollada.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.material.transparent = true;
          child.material.opacity = 0.5;
        }
      });
      scene.add(model);
      L_HandRef.current = model;
      objects.push(model);
      setSceneReady(true);
    });

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

    // 加载URDF机器人模型
    const loader = new URDFLoader();
    loader.load('./H1_Pro1/urdf/H1_Pro1.urdf', (robot) => {
      console.log('URDF机器人模型加载完成');
      robotRef.current = robot;

      // 遍历机器人模型，设置可见性（保持原始材质不变）
      robot.traverse((child) => {
        if (child.isURDFLink && child.children[0]?.isURDFVisual) {
          if (child.name.startsWith("ILIUM_")) child.visible = true;
          // 不再修改原始材质，保持机器人的原始外观
        }
      });

      scene.add(robot);
      
      // 确保场景完全更新后再初始化碰撞检测
      robot.updateMatrixWorld(true);
      
      // 延迟建立映射关系，确保模型完全加载
      setTimeout(() => {
        buildJointLinkMapping(robot);
        initializeCollisionDetection(robot);
        setSceneReady(true);
      }, 800); // 适中的延迟时间
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
      
      // 清理碰撞检测器
      if (collisionDetectorRef.current) {
        collisionDetectorRef.current.dispose();
        collisionDetectorRef.current = null;
      }
      
      // 清理材质状态缓存
      materialStateCacheRef.current.clear();
      originalMaterialsRef.current.clear();
      warningMaterialsRef.current = null;
      collisionMaterialsRef.current = null;
      
      // 清理防抖定时器
      if (materialUpdateTimeoutRef.current) {
        clearTimeout(materialUpdateTimeoutRef.current);
        materialUpdateTimeoutRef.current = null;
      }
      pendingMaterialUpdatesRef.current.clear();
    };
  }, [buildJointLinkMapping, initializeCollisionDetection]);

  // 优化更新的频率，包含关节颜色更新逻辑和碰撞检测
  const updateArmvalues = useCallback(() => {
    const currentTime = Date.now();
    if (currentTime - lastUpdateRef.current < updateInterval) {
      return;
    }
    lastUpdateRef.current = currentTime;

    if (sceneReady && robotRef.current) {
      const robot = robotRef.current;

      // 检查关节值是否真的发生了变化
      const currentLeftValues = realTimeLeftArmValuesRef.current;
      const currentRightValues = realTimeRightArmValuesRef.current;
      const plannedLeftValues = plannedLeftArmValuesRef.current;
      const plannedRightValues = plannedRightArmValuesRef.current;
      
      const lastLeftValues = lastJointValuesRef.current.left;
      const lastRightValues = lastJointValuesRef.current.right;
      
      // 确定要显示的值
      const displayLeftValues = shouldShowPlannedValues() ? plannedLeftValues : currentLeftValues;
      const displayRightValues = shouldShowPlannedValues() ? plannedRightValues : currentRightValues;
      
      // 检查是否有显著变化（添加阈值检测）
      const threshold = 0.1; // 0.1度的阈值
      const hasSignificantChange = (newValues, oldValues) => {
        return Object.keys(newValues).some(key => {
          const newVal = newValues[key];
          const oldVal = oldValues[key];
          return typeof newVal === 'number' && typeof oldVal === 'number' && 
                 Math.abs(newVal - oldVal) > threshold;
        });
      };
      
      const leftChanged = hasSignificantChange(displayLeftValues, lastLeftValues);
      const rightChanged = hasSignificantChange(displayRightValues, lastRightValues);
      
      // 机器人模型关节更新
      const updateJointValues = (values, suffix) => {
        Object.entries(robot.joints).forEach(([key, joint]) => {
          if (key.endsWith(suffix) && typeof values[key] === 'number' && !isNaN(values[key])) {
            const angle = values[key] * (Math.PI / 180);
            joint.setJointValue(angle);
          }
        });
      };

      // 只在有显著变化时更新
      if (leftChanged) {
        updateJointValues(displayLeftValues, '_L');
        lastJointValuesRef.current.left = { ...displayLeftValues };
      }
      if (rightChanged) {
        updateJointValues(displayRightValues, '_R');
        lastJointValuesRef.current.right = { ...displayRightValues };
      }
    }
  }, [sceneReady, shouldShowPlannedValues]);

  // 单独的关节极限检查函数，降低检查频率
  const checkJointLimits = useCallback(() => {
    if (!sceneReady || !robotRef.current || !jointLinkMappingRef.current.size) return;

    const robot = robotRef.current;

    // 检查关节极限并更新颜色
    const checkJointValuesWithColorUpdate = (values, suffix) => {
      Object.entries(values).forEach(([jointName, value]) => {
        if (typeof value === 'number' && !isNaN(value)) {
          // 检查关节值是否有显著变化
          const lastValue = lastJointValuesRef.current[suffix === '_L' ? 'left' : 'right'][jointName];
          const threshold = 0.5; // 0.5度的阈值
          
          if (typeof lastValue === 'number' && Math.abs(value - lastValue) < threshold) {
            return; // 跳过微小变化
          }
          
          const limitStatus = checkJointLimitStatus(jointName, value);
          
          // 使用防抖的材质更新函数
          debouncedUpdateJointVisualColor(jointName, limitStatus);
        }
      });
    };

    if (shouldShowPlannedValues()) {
      checkJointValuesWithColorUpdate(plannedLeftArmValuesRef.current, '_L');
      checkJointValuesWithColorUpdate(plannedRightArmValuesRef.current, '_R');
    } else {
      checkJointValuesWithColorUpdate(realTimeLeftArmValuesRef.current, '_L');
      checkJointValuesWithColorUpdate(realTimeRightArmValuesRef.current, '_R');
    }
  }, [sceneReady, shouldShowPlannedValues, checkJointLimitStatus, debouncedUpdateJointVisualColor]);

  // 使用 requestAnimationFrame 控制更新频率
  useEffect(() => {
    let animationFrameId;
    let lastUpdateTime = 0;
    let lastLimitCheckTime = 0;
    let lastCollisionUpdateTime = 0;
    
    const updateLoop = (currentTime) => {
      // 主更新循环
      if (currentTime - lastUpdateTime >= updateInterval) {
        updateArmvalues();
        lastUpdateTime = currentTime;
      }
      
      // 关节极限检查
      if (currentTime - lastLimitCheckTime >= 2000) {
        checkJointLimits();
        lastLimitCheckTime = currentTime;
      }
      
      // 碰撞检测更新
      if (currentTime - lastCollisionUpdateTime >= collisionUpdateInterval) {
        if (collisionDetectorRef.current && sceneReady && robotRef.current) {
          collisionDetectorRef.current.updateRobotPhysics(robotRef.current);
          collisionDetectorRef.current.stepPhysics();
        }
        lastCollisionUpdateTime = currentTime;
      }
      
      animationFrameId = requestAnimationFrame(updateLoop);
    };
    
    animationFrameId = requestAnimationFrame(updateLoop);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [updateArmvalues, checkJointLimits, sceneReady]);

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

  // 递归查找父对象，找到name以_L或_R结尾的对象（手臂关节）
  function findArmJointObject(obj) {
    let current = obj;
    while (current) {
      if (current.name && (current.name.endsWith('_L') || current.name.endsWith('_R'))) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }

  const onMouseDown = useCallback((event) => {
    if (isDragging.current || rosServiceCalling) return;
    isDragging.current = true;
    const { x, y } = getClientXY(event);
    const rect = canvasRef.current.getBoundingClientRect();
    initialMouseY.current = y;
    initialMouseX.current = x;
    const mouse = new THREE.Vector2(
      ((x - rect.left) / rect.width) * 2 - 1,
      -((y - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
    if (intersects.length > 0) {
      const armJointObj = findArmJointObject(intersects[0].object);
      if (armJointObj) {
        selectedObjectRef.current = armJointObj;
        controlsRef.current.enabled = false;
      } else {
        selectedObjectRef.current = null;
        controlsRef.current.enabled = true;
      }
    } else {
      selectedObjectRef.current = null;
      controlsRef.current.enabled = true;
    }
    if (event.touches) event.preventDefault();
  });

  const onMouseMove = useCallback((event) => {
    if (isDragging.current && selectedObjectRef.current && !rosServiceCalling) {
      const { x, y } = getClientXY(event);
      const deltaY = initialMouseY.current - y;
      const deltaX = (x - initialMouseX.current) / 10;
      const name = selectedObjectRef.current.name;
      let jointValueChange = name === 'Neck_Y' ? deltaY : deltaX;
      const { newValues, isLeftArm, isRightArm } = getUpdatedJointValues(name, jointValueChange);
      if (isLeftArm) {
        onLeftControlChange(name, newValues);
      } else if (isRightArm) {
        onRightControlChange(name, newValues);
      } else {
        return;
      }
      initialMouseY.current = y;
      initialMouseX.current = x;
    }
    if (event.touches) event.preventDefault();
  });

  // 提取为一个函数，判断并更新关节值
  const getUpdatedJointValues = (name, jointValueChange) => {
    let newValues = 0;
    const isLeftArm = name.endsWith('_L');
    const isRightArm = name.endsWith('_R');

    if (isLeftArm) {
      newValues = plannedLeftArmValuesRef.current[name] + jointValueChange;
      newValues = validateJointValue(newValues);
      plannedLeftArmValuesRef.current[name] = newValues;
    } else if (isRightArm) {
      newValues = plannedRightArmValuesRef.current[name] + jointValueChange;
      newValues = validateJointValue(newValues);
      plannedRightArmValuesRef.current[name] = newValues;
    }

    return { newValues, isLeftArm, isRightArm };
  };

  // 验证关节值是否有效
  const validateJointValue = (value) => {
    return isNaN(value) ? 0 : value;
  };

  const onMouseUp = useCallback((event) => {
    isDragging.current = false;
    if (selectedObjectRef.current) {
      const selectedName = selectedObjectRef.current.name;
      if (
        selectedName.endsWith('_L') && !areJointValuesEqual(realTimeLeftArmValuesRef.current, plannedLeftArmValuesRef.current)
      ) {
        onLeftMoveJSrvCall(plannedLeftArmValuesRef.current);
      }
      if (
        selectedName.endsWith('_R') && !areJointValuesEqual(realTimeRightArmValuesRef.current, plannedRightArmValuesRef.current)
      ) {
        onRightMoveJSrvCall(plannedRightArmValuesRef.current);
      }
    }
    onInteractionChange(false);
    controlsRef.current.enabled = true;
    selectedObjectRef.current = null;
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
    <div>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default RobotViewer;