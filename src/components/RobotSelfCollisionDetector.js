import React, { useEffect, useRef, useState, useCallback } from 'react';
import { robotCollisionUtils } from './RobotCollisionUtils';
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
   * 获取网格所属的关节名称
   */
  const getJointName = (mesh) => {
    let current = mesh;
    while (current) {
      if (current.isURDFJoint) {
        return current.name;
      }
      current = current.parent;
    }
    return 'unknown_joint';
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
      
      // 验证BVH构建结果
      const validation = robotCollisionUtils.validateBVHData('self_collision');
      console.log('BVH验证结果:', validation);
      
      if (!validation.isValid) {
        console.warn('BVH数据验证失败:', validation);
        if (validation.invalidBVHs.length > 0) {
          console.warn('无效BVH的链接:', validation.invalidBVHs);
        }
        if (validation.missingGeometry.length > 0) {
          console.warn('缺失几何体的链接:', validation.missingGeometry);
        }
      }
      
      // 获取网格分组
      const meshGroups = getMeshGroupsByLink(robot);
      robotMeshesRef.current = Array.from(meshGroups.entries());
      
      // 获取BVH统计信息
      const stats = robotCollisionUtils.getBVHStats();
      console.log('BVH统计信息:', stats);

      setIsInitialized(true);
      console.log('自碰撞检测系统初始化完成');
      console.log('检测对数量:', pairs.length);
      console.log('网格分组数量:', meshGroups.size);
      console.log('BVH覆盖率:', stats.robotStats['self_collision']?.bvhCoverage || '0%');
      
      return true;
    } catch (error) {
      console.error('自碰撞检测系统初始化失败:', error);
      return false;
    }
  }, [robot, getSelfCollisionPairs, getMeshGroupsByLink]);

  /**
   * 检测两个网格之间的碰撞
   */
  const checkMeshPairCollision = useCallback((mesh1, mesh2, threshold) => {
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

      // 创建网格数据对象以使用统一的碰撞检测方法
      const mesh1Data = {
        mesh: mesh1,
        bvh: mesh1.geometry?.boundsTree,
        linkName: link1,
        jointName: getJointName(mesh1)
      };

      const mesh2Data = {
        mesh: mesh2,
        bvh: mesh2.geometry?.boundsTree,
        linkName: link2,
        jointName: getJointName(mesh2)
      };

      // 使用robotCollisionUtils的改进碰撞检测方法
      const collision = robotCollisionUtils.checkMeshCollision(mesh1Data, mesh2Data, threshold);
      
      if (collision) {
        return {
          ...collision,
          detectionMethod: collision.detectionMethod || 'BVH_SELF_COLLISION'
        };
      }

      return null;
    } catch (error) {
      console.warn('网格碰撞检测过程中出错:', error);
      return null;
    }
  }, []);

  /**
   * 更新自碰撞可视化
   */
  const updateSelfCollisionVisualization = useCallback((collisions) => {
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
  }, []);

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
        const { links1, links2 } = pair;
        
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
                
                const collision = checkMeshPairCollision(mesh1, mesh2, threshold);
                if (collision) {
                  collision.pairType = `${pair.part1}_vs_${pair.part2}`;
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

        // 显示检测方法统计  
        const methodStats = {};
        allCollisions.forEach(collision => {
          const method = collision.detectionMethod || 'UNKNOWN';
          methodStats[method] = (methodStats[method] || 0) + 1;
        });
        console.log('检测方法统计:', methodStats);
      }

    } catch (error) {
      console.error('自碰撞检测执行失败:', error);
    }
  }, [isInitialized, isEnabled, threshold, detectionInterval, onCollisionChange, selfCollisionPairs, getMeshGroupsByLink, updateSelfCollisionVisualization, checkMeshPairCollision]);

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
    
    // 提供给子组件的API
    start: startSelfCollisionDetection,
    stop: stopSelfCollisionDetection,
    trigger: performSelfCollisionDetection,
    initialize: initializeSelfCollisionDetection,
    
    // 配置方法
    setThreshold: (newThreshold) => threshold = newThreshold,
    setInterval: setDetectionInterval,
    
    // 调试和统计方法
    getBVHStats: () => robotCollisionUtils.getBVHStats(),
    validateBVH: () => robotCollisionUtils.validateBVHData('self_collision'),
    getCollisionHistory: () => robotCollisionUtils.getAllCollisions()
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
          <div>
            <button 
              onClick={() => {
                const stats = api.getBVHStats();
                const validation = api.validateBVH();
                console.log('BVH统计:', stats);
                console.log('BVH验证:', validation);
              }}
              style={{
                fontSize: '10px',
                padding: '2px 4px',
                marginTop: '5px',
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              调试信息
            </button>
          </div>
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
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
};

export default RobotSelfCollisionDetector; 