import React, { useEffect, useRef, useState, useCallback } from 'react';
import { robotCollisionUtils, CollisionConfig } from './RobotCollisionUtils';

/**
 * 机器人碰撞检测组件
 * 提供碰撞检测的可视化和控制界面
 */
const RobotCollisionDetector = ({
  robots, // 机器人对象 { realtime: robot1, planned: robot2 }
  isEnabled = true,
  threshold = CollisionConfig.defaultThreshold,
  onCollisionChange,
  children
}) => {
  // 状态管理
  const [collisionStatus, setCollisionStatus] = useState({
    hasCollision: false,
    hasWarning: false,
    collisionCount: 0,
    warningCount: 0,
    totalCollisions: 0,
    details: []
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionInterval, setDetectionInterval] = useState(CollisionConfig.updateInterval);

  // 引用
  const detectionIntervalRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());
  const robotsRef = useRef(robots);

  // 更新robots引用
  useEffect(() => {
    robotsRef.current = robots;
  }, [robots]);

  /**
   * 初始化碰撞检测系统
   */
  const initializeCollisionDetection = useCallback(async () => {
    if (!robots?.realtime || !robots?.planned) {
      console.warn('机器人模型未完全加载，无法初始化碰撞检测');
      return false;
    }

    try {
      console.log('开始初始化碰撞检测系统...');
      
      // 为实时机器人构建BVH
      await robotCollisionUtils.buildBVHForRobot(robots.realtime, 'realtime');
      
      // 为规划机器人构建BVH 
      await robotCollisionUtils.buildBVHForRobot(robots.planned, 'planned');

      setIsInitialized(true);
      console.log('碰撞检测系统初始化完成');
      return true;
    } catch (error) {
      console.error('碰撞检测系统初始化失败:', error);
      return false;
    }
  }, [robots]);

  /**
   * 执行碰撞检测
   */
  const performCollisionDetection = useCallback(() => {
    if (!isInitialized || !isEnabled || !robotsRef.current?.realtime || !robotsRef.current?.planned) {
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

      // 执行碰撞检测（在这种情况下我们主要检测规划模型的自碰撞）
      const collisions = robotCollisionUtils.detectCollisions('realtime', 'planned', threshold);
      
      // 获取规划机器人的碰撞状态
      const plannedStatus = robotCollisionUtils.getCollisionStatus('planned');
      
      // 更新状态
      const newStatus = {
        hasCollision: plannedStatus.hasCollision || collisions.some(c => c.severity === 'collision'),
        hasWarning: plannedStatus.hasWarning || collisions.some(c => c.severity === 'warning'),
        collisionCount: plannedStatus.collisionCount + collisions.filter(c => c.severity === 'collision').length,
        warningCount: plannedStatus.warningCount + collisions.filter(c => c.severity === 'warning').length,
        totalCollisions: plannedStatus.totalCollisions + collisions.length,
        details: [...plannedStatus.details, ...collisions]
      };

      setCollisionStatus(newStatus);

      // 回调通知外部组件
      if (onCollisionChange) {
        onCollisionChange(newStatus);
      }

      // 如果检测到碰撞，输出详细信息
      if (newStatus.hasCollision) {
        console.warn('检测到碰撞:', newStatus.details.filter(c => c.severity === 'collision'));
      }

    } catch (error) {
      console.error('碰撞检测执行失败:', error);
    }
  }, [isInitialized, isEnabled, threshold, detectionInterval, onCollisionChange]);

  /**
   * 启动持续碰撞检测
   */
  const startCollisionDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    setIsDetecting(true);
    
    detectionIntervalRef.current = setInterval(() => {
      performCollisionDetection();
    }, detectionInterval);

    console.log(`碰撞检测已启动，检测间隔: ${detectionInterval}ms`);
  }, [performCollisionDetection, detectionInterval]);

  /**
   * 停止碰撞检测
   */
  const stopCollisionDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    setIsDetecting(false);
    console.log('碰撞检测已停止');
  }, []);

  /**
   * 重置碰撞检测系统
   */
  const resetCollisionDetection = useCallback(() => {
    stopCollisionDetection();
    robotCollisionUtils.resetAllMaterials();
    setCollisionStatus({
      hasCollision: false,
      hasWarning: false,
      collisionCount: 0,
      warningCount: 0,
      totalCollisions: 0,
      details: []
    });
    console.log('碰撞检测系统已重置');
  }, [stopCollisionDetection]);

  /**
   * 手动触发单次碰撞检测
   */
  const triggerSingleDetection = useCallback(() => {
    performCollisionDetection();
  }, [performCollisionDetection]);

  /**
   * 设置检测阈值
   */
  const setCollisionThreshold = useCallback((newThreshold) => {
    robotCollisionUtils.setCollisionThreshold(newThreshold);
    console.log(`碰撞检测阈值已更新为: ${newThreshold}m`);
  }, []);

  // 机器人加载后自动初始化
  useEffect(() => {
    if (robots?.realtime && robots?.planned && !isInitialized) {
      // 延迟初始化以确保模型完全加载
      const timer = setTimeout(() => {
        initializeCollisionDetection();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [robots, isInitialized, initializeCollisionDetection]);

  // 启用状态改变时自动启动/停止检测
  useEffect(() => {
    if (isEnabled && isInitialized) {
      startCollisionDetection();
    } else {
      stopCollisionDetection();
    }

    return () => {
      stopCollisionDetection();
    };
  }, [isEnabled, isInitialized, startCollisionDetection, stopCollisionDetection]);

  // 阈值改变时更新
  useEffect(() => {
    setCollisionThreshold(threshold);
  }, [threshold, setCollisionThreshold]);

  // 清理资源
  useEffect(() => {
    return () => {
      stopCollisionDetection();
      if (isInitialized) {
        robotCollisionUtils.dispose();
      }
    };
  }, [stopCollisionDetection, isInitialized]);

  // 提供给子组件的API
  const collisionAPI = {
    status: collisionStatus,
    isInitialized,
    isDetecting,
    isEnabled,
    threshold,
    detectionInterval,
    
    // 控制方法
    start: startCollisionDetection,
    stop: stopCollisionDetection,
    reset: resetCollisionDetection,
    trigger: triggerSingleDetection,
    initialize: initializeCollisionDetection,
    
    // 配置方法
    setThreshold: setCollisionThreshold,
    setInterval: setDetectionInterval,
    
    // 工具方法
    getAllCollisions: () => robotCollisionUtils.getAllCollisions(),
    resetMaterials: () => robotCollisionUtils.resetAllMaterials()
  };

  // 如果提供了children，则作为render prop使用
  if (children && typeof children === 'function') {
    return children(collisionAPI);
  }

  // 否则渲染默认的状态显示组件
  return (
    <CollisionStatusDisplay 
      status={collisionStatus}
      isInitialized={isInitialized}
      isDetecting={isDetecting}
      isEnabled={isEnabled}
      api={collisionAPI}
    />
  );
};

/**
 * 碰撞状态显示组件
 */
const CollisionStatusDisplay = ({ 
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
    if (status.hasWarning) return '#f39c12'; // 橙色 - 警告
    return '#27ae60'; // 绿色 - 正常
  };

  const getStatusText = () => {
    if (!isInitialized) return '初始化中...';
    if (!isEnabled) return '已禁用';
    if (status.hasCollision) return `碰撞 (${status.collisionCount})`;
    if (status.hasWarning) return `警告 (${status.warningCount})`;
    return '正常';
  };

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
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
        碰撞检测系统
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
          <div>总检测: {status.totalCollisions}</div>
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
            .filter(d => d.severity === 'collision')
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

export default RobotCollisionDetector;

// 导出工具hooks
export const useCollisionDetection = (robots, options = {}) => {
  const [status, setStatus] = useState({
    hasCollision: false,
    hasWarning: false,
    collisionCount: 0,
    warningCount: 0,
    totalCollisions: 0,
    details: []
  });

  const handleCollisionChange = useCallback((newStatus) => {
    setStatus(newStatus);
  }, []);

  return {
    status,
    CollisionDetector: (props) => (
      <RobotCollisionDetector
        robots={robots}
        onCollisionChange={handleCollisionChange}
        {...options}
        {...props}
      />
    )
  };
}; 