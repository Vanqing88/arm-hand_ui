import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { robotCollisionUtils, CollisionConfig } from './RobotCollisionUtils';
import config from '../config';

/**
 * 机器人自碰撞检测组件
 * 专门检测规划模型内部各部件之间的碰撞
 */
const RobotSelfCollisionDetector = ({
  robot, // 单个机器人模型（通常是planned模型）
  isEnabled = config.collisionDetection.enabled,
  threshold = config.collisionDetection.threshold,
  onCollisionChange,
  children
}) => {
  // 状态管理
  const [collisionStatus, setCollisionStatus] = useState({
    hasCollision: false,
    collisionCount: 0,
    totalCollisions: 0,
    details: []
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionInterval, setDetectionInterval] = useState(config.collisionDetection.detectionInterval);
  const [selfCollisionPairs, setSelfCollisionPairs] = useState([]);

  // 引用
  const detectionIntervalRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());
  const robotRef = useRef(robot);
  const robotMeshesRef = useRef([]);

  // 更新robot引用
  useEffect(() => {
    robotRef.current = robot;
  }, [robot]);

  /**
   * 定义需要检测自碰撞的身体部件组合
   */
  const getSelfCollisionPairs = useCallback(() => {
    const collisionConfig = config.collisionDetection;
    
    // 使用config中定义的身体部件
    const bodyParts = collisionConfig.bodyParts;

    // 使用config中定义的碰撞检测对
    const collisionPairs = collisionConfig.collisionPairs;

    return collisionPairs.map(pair => ({
      ...pair,
      links1: bodyParts[pair.part1] || [],
      links2: bodyParts[pair.part2] || []
    }));
  }, []);

  /**
   * 获取机器人的所有网格并按链接分组
   */
  const getMeshGroupsByLink = useCallback((robot) => {
    const meshGroups = new Map();
    
    if (!robot) return meshGroups;

    robot.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const linkName = getLinkName(child);
        if (!meshGroups.has(linkName)) {
          meshGroups.set(linkName, []);
        }
        meshGroups.get(linkName).push(child);
      }
    });

    return meshGroups;
  }, []);

  /**
   * 获取网格所属的链接名称
   */
  const getLinkName = (mesh) => {
    let current = mesh;
    while (current) {
      if (current.isURDFLink) {
        return current.name;
      }
      current = current.parent;
    }
    return 'unknown_link';
  };

  /**
   * 计算两个包围盒之间的最小距离
   */
  const calculateBoxDistance = (box1, box2) => {
    // 如果两个包围盒相交，距离为0
    if (box1.intersectsBox(box2)) {
      return 0;
    }

    // 计算两个包围盒中心点
    const center1 = new THREE.Vector3();
    const center2 = new THREE.Vector3();
    box1.getCenter(center1);
    box2.getCenter(center2);

    // 计算中心点距离
    const centerDistance = center1.distanceTo(center2);

    // 计算两个包围盒的尺寸
    const size1 = new THREE.Vector3();
    const size2 = new THREE.Vector3();
    box1.getSize(size1);
    box2.getSize(size2);

    // 计算两个包围盒对角线长度的一半
    const halfDiagonal1 = size1.length() * 0.5;
    const halfDiagonal2 = size2.length() * 0.5;

    // 最小距离 = 中心点距离 - 两个对角线长度的一半
    const minDistance = Math.max(0, centerDistance - halfDiagonal1 - halfDiagonal2);

    return minDistance;
  };

  /**
   * 初始化自碰撞检测系统
   */
  const initializeSelfCollisionDetection = useCallback(async () => {
    if (!robot) {
      console.warn('机器人模型未加载，无法初始化自碰撞检测');
      return false;
    }

    try {
      console.log('开始初始化机器人自碰撞检测系统...');
      
      // 获取自碰撞检测对
      const pairs = getSelfCollisionPairs();
      setSelfCollisionPairs(pairs);
      
      // 为机器人构建BVH
      await robotCollisionUtils.buildBVHForRobot(robot, 'self_collision');
      
      // 获取网格分组
      const meshGroups = getMeshGroupsByLink(robot);
      robotMeshesRef.current = Array.from(meshGroups.entries());

      setIsInitialized(true);
      console.log('自碰撞检测系统初始化完成');
      console.log('检测对数量:', pairs.length);
      console.log('网格分组数量:', meshGroups.size);
      
      return true;
    } catch (error) {
      console.error('自碰撞检测系统初始化失败:', error);
      return false;
    }
  }, [robot, getSelfCollisionPairs, getMeshGroupsByLink]);

  /**
   * 执行自碰撞检测
   */
  const performSelfCollisionDetection = useCallback(() => {
    if (!isInitialized || !isEnabled || !robotRef.current) {
      return;
    }

    try {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;

      // 限制更新频率以提高性能
      if (timeSinceLastUpdate < detectionInterval) {
        return;
      }

      lastUpdateRef.current = now;

      const allCollisions = [];
      const meshGroups = getMeshGroupsByLink(robotRef.current);
      const collisionSet = new Set(); // 用于去重

      // 检测每个碰撞对
      for (const pair of selfCollisionPairs) {
        const { links1, links2, priority } = pair;
        
        // 获取对应的网格
        for (const link1 of links1) {
          for (const link2 of links2) {
            const meshes1 = meshGroups.get(link1) || [];
            const meshes2 = meshGroups.get(link2) || [];
            
            // 检测这两组网格之间的碰撞
            for (const mesh1 of meshes1) {
              for (const mesh2 of meshes2) {
                // 创建唯一的碰撞标识符
                const collisionKey = `${mesh1.uuid}_${mesh2.uuid}`;
                const reverseKey = `${mesh2.uuid}_${mesh1.uuid}`;
                
                // 避免重复检测
                if (collisionSet.has(collisionKey) || collisionSet.has(reverseKey)) {
                  continue;
                }
                
                const collision = checkMeshPairCollision(mesh1, mesh2, threshold, priority);
                if (collision) {
                  collision.pairType = `${pair.part1}_vs_${pair.part2}`;
                  collision.priority = priority;
                  collision.collisionKey = collisionKey;
                  allCollisions.push(collision);
                  collisionSet.add(collisionKey);
                }
              }
            }
          }
        }
      }

      // 更新碰撞状态
      const newStatus = {
        hasCollision: allCollisions.some(c => c.severity === 'collision'),
        collisionCount: allCollisions.filter(c => c.severity === 'collision').length,
        totalCollisions: allCollisions.length,
        details: allCollisions
      };

      setCollisionStatus(newStatus);

      // 更新可视化
      updateSelfCollisionVisualization(allCollisions);

      // 回调通知外部组件
      if (onCollisionChange) {
        onCollisionChange(newStatus);
      }

      // 如果检测到碰撞，输出详细信息
      if (allCollisions.length > 0) {
        console.log(`检测到 ${allCollisions.length} 个碰撞:`);
        
        // 按类型分组显示
        const collisionGroups = {};
        allCollisions.forEach(collision => {
          const key = `${collision.linkName1} ↔ ${collision.linkName2}`;
          if (!collisionGroups[key]) {
            collisionGroups[key] = [];
          }
          collisionGroups[key].push(collision);
        });
        
        Object.entries(collisionGroups).forEach(([key, collisions]) => {
          console.log(`  ${key}: ${collisions.length} 个碰撞 (${collisions[0].severity})`);
        });
        
        // 显示高优先级碰撞
        const highPriorityCollisions = allCollisions.filter(c => 
          c.severity === 'collision' && c.priority === 'high'
        );
        if (highPriorityCollisions.length > 0) {
          console.warn('高优先级碰撞:', highPriorityCollisions.length, '个');
        }
      }

    } catch (error) {
      console.error('自碰撞检测执行失败:', error);
    }
  }, [isInitialized, isEnabled, threshold, detectionInterval, onCollisionChange, selfCollisionPairs, getMeshGroupsByLink]);

  /**
   * 检测两个网格之间的碰撞
   */
  const checkMeshPairCollision = (mesh1, mesh2, threshold, priority) => {
    if (!mesh1 || !mesh2 || mesh1 === mesh2) {
      return null;
    }

    try {
      // 检查是否是默认相连的部件（排除这些碰撞）
      const link1 = getLinkName(mesh1);
      const link2 = getLinkName(mesh2);
      
      // 使用config中定义的默认相连部件
      const connectedParts = config.collisionDetection.connectedParts;
      
      // 检查是否是默认相连的部件
      const isConnected = connectedParts.some(([part1, part2]) => 
        (link1 === part1 && link2 === part2) || (link1 === part2 && link2 === part1)
      );
      
      if (isConnected) {
        return null; // 跳过默认相连的部件
      }

      // 更新世界矩阵
      mesh1.updateMatrixWorld(true);
      mesh2.updateMatrixWorld(true);

      // 计算包围盒
      const box1 = new THREE.Box3().setFromObject(mesh1);
      const box2 = new THREE.Box3().setFromObject(mesh2);

      // 快速包围盒检测
      if (!box1.intersectsBox(box2)) {
        return null;
      }

      // 计算两个包围盒的最小距离
      const distance = calculateBoxDistance(box1, box2);
      
      // 根据优先级调整阈值
      const priorityConfig = config.collisionDetection.priorities[priority];
      const adjustedThreshold = priorityConfig ? priorityConfig.threshold : threshold;
      
      if (distance <= adjustedThreshold) {
        return {
          mesh1: mesh1,
          mesh2: mesh2,
          linkName1: link1,
          linkName2: link2,
          distance: distance,
          severity: 'collision',
          priority: priority,
          timestamp: Date.now()
        };
      }

      return null;
    } catch (error) {
      console.warn('网格碰撞检测过程中出错:', error);
      return null;
    }
  };

  /**
   * 更新自碰撞可视化
   */
  const updateSelfCollisionVisualization = (collisions) => {
    // 重置材质
    robotCollisionUtils.resetAllMaterials();

    // 应用碰撞高亮 - 只对规划模型（不透明模型）进行高亮
    for (const collision of collisions) {
      // 使用蓝色材质高亮碰撞区域
      const blueMaterial = robotCollisionUtils.collisionMaterials.get('collision');
      if (blueMaterial && collision.mesh1 && collision.mesh2) {
        collision.mesh1.material = blueMaterial.clone();
        collision.mesh2.material = blueMaterial.clone();
      }
    }
  };

  /**
   * 启动持续自碰撞检测
   */
  const startSelfCollisionDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    setIsDetecting(true);
    
    detectionIntervalRef.current = setInterval(() => {
      performSelfCollisionDetection();
    }, detectionInterval);

    console.log(`自碰撞检测已启动，检测间隔: ${detectionInterval}ms`);
  }, [performSelfCollisionDetection, detectionInterval]);

  /**
   * 停止自碰撞检测
   */
  const stopSelfCollisionDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    setIsDetecting(false);
    console.log('自碰撞检测已停止');
  }, []);

  // 机器人加载后自动初始化
  useEffect(() => {
    if (robot && !isInitialized) {
      const timer = setTimeout(() => {
        initializeSelfCollisionDetection();
      }, 1500); // 稍长的延迟确保模型完全加载
      
      return () => clearTimeout(timer);
    }
  }, [robot, isInitialized, initializeSelfCollisionDetection]);

  // 启用状态改变时自动启动/停止检测
  useEffect(() => {
    if (isEnabled && isInitialized) {
      startSelfCollisionDetection();
    } else {
      stopSelfCollisionDetection();
    }

    return () => {
      stopSelfCollisionDetection();
    };
  }, [isEnabled, isInitialized, startSelfCollisionDetection, stopSelfCollisionDetection]);

  // 清理资源
  useEffect(() => {
    return () => {
      stopSelfCollisionDetection();
    };
  }, [stopSelfCollisionDetection]);

  // 提供给子组件的API
  const selfCollisionAPI = {
    status: collisionStatus,
    isInitialized,
    isDetecting,
    isEnabled,
    threshold,
    detectionInterval,
    selfCollisionPairs,
    
    // 控制方法
    start: startSelfCollisionDetection,
    stop: stopSelfCollisionDetection,
    trigger: performSelfCollisionDetection,
    initialize: initializeSelfCollisionDetection,
    
    // 配置方法
    setThreshold: (newThreshold) => threshold = newThreshold,
    setInterval: setDetectionInterval,
  };

  // 如果提供了children，则作为render prop使用
  if (children && typeof children === 'function') {
    return children(selfCollisionAPI);
  }

  // 否则渲染默认的状态显示组件
  return (
    <SelfCollisionStatusDisplay 
      status={collisionStatus}
      isInitialized={isInitialized}
      isDetecting={isDetecting}
      isEnabled={isEnabled}
      api={selfCollisionAPI}
    />
  );
};

/**
 * 自碰撞状态显示组件
 */
const SelfCollisionStatusDisplay = ({ 
  status, 
  isInitialized, 
  isDetecting, 
  isEnabled,
  api 
}) => {
  const getStatusColor = () => {
    if (!isInitialized) return '#95a5a6'; // 灰色 - 未初始化
    if (!isEnabled) return '#95a5a6'; // 灰色 - 已禁用
    if (status.hasCollision) return '#e74c3c'; // 红色 - 碰撞
    return '#27ae60'; // 绿色 - 正常
  };

  const getStatusText = () => {
    if (!isInitialized) return '初始化中...';
    if (!isEnabled) return '已禁用';
    if (status.hasCollision) return `自碰撞 (${status.collisionCount})`;
    return '正常';
  };

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      zIndex: 1000,
      minWidth: '200px'
    }}>
      <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
        机器人自碰撞检测
      </div>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '5px' 
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          marginRight: '8px'
        }} />
        <span>{getStatusText()}</span>
      </div>

      {isInitialized && (
        <div style={{ fontSize: '12px', color: '#ccc' }}>
          <div>检测对: {api.selfCollisionPairs?.length || 0}</div>
          <div>状态: {isDetecting ? '运行中' : '已停止'}</div>
        </div>
      )}

      {status.hasCollision && status.details.length > 0 && (
        <div style={{ 
          marginTop: '10px', 
          fontSize: '11px', 
          color: '#ffcccc',
          maxHeight: '100px',
          overflowY: 'auto'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>
            碰撞详情:
          </div>
          {status.details
            .slice(0, 3)
            .map((detail, index) => (
              <div key={index}>
                {detail.linkName1} ↔ {detail.linkName2}
                <span style={{ fontSize: '10px', color: '#ccc' }}>
                  ({detail.priority})
                </span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
};

export default RobotSelfCollisionDetector; 