import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import URDFLoader from 'urdf-loader';
import { createVRLighting, disposeVRLighting } from './VRLighting';

const HandViewer = ({ 
  isInteracting,
  onInteractionChange,
  rosServiceCalling, 
  realTimeHandValues,  
  plannedHandValues, 
  type,
  onControlChange,
  onHandSrvCall
}) => {
  const canvasRef = useRef(null);
  const robotRef = useRef(null); // 用来存储加载的机器人模型
  const [sceneReady, setSceneReady] = useState(false); // 场景是否准备好
  const lastUpdateRef = useRef(Date.now()); // 用于存储上次更新时间
  const updateInterval = 100; // 每 100ms 更新一次
  const sceneRef = useRef(null); // 添加一个ref来保存scene对象
  const cameraRef = useRef(null); // 添加一个ref来保存camera对象

  const isInteractingRef = useRef(isInteracting);
  useEffect(() => {
    isInteractingRef.current = isInteracting; // 保存isInteracting状态
    }, [isInteracting]);

  const realTimeHandValuesRef = useRef(realTimeHandValues); 
  const plannedHandValuesRef = useRef(plannedHandValues);
  useEffect(() => {
    realTimeHandValuesRef.current = realTimeHandValues; // 每次 realTimeHandValues 改变时更新 ref
  }, [realTimeHandValues]);
  useEffect(() => {
    plannedHandValuesRef.current = plannedHandValues; // 每次 plannedHandValues 改变时更新 ref
  }, [plannedHandValues]);
  const areJointValuesEqual = useCallback((currentValues, plannedValues) => {
    return Object.keys(plannedValues).every(
      (key) => currentValues[key] === plannedValues[key]
    );
  }, []);

  useEffect(() => {
    // 初始化场景、相机和渲染器
    const scene = new THREE.Scene();
    scene.position.y -= 0.1;
    scene.position.x = 0.02;
    scene.background = new THREE.Color(0xf0f0f0);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
    const pos = type === 'L' ? 0.3 : -0.3;
    camera.position.set(0, 0, pos);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current });
    renderer.setSize(window.innerHeight / 3.6, window.innerHeight / 3.6);

    // 使用VR光照配置
    const lights = createVRLighting(scene);

    const urdf = type === 'L' ? './lefthand/urdf/lefthand.urdf' : './righthand/urdf/righthand.urdf';
    // 加载URDF模型
    const loader = new URDFLoader();
    loader.load(urdf, (robot) => {
      robot.rotation.x = Math.PI / -2;

      // 动态调整机器人关节
      robot.traverse((child) => {
        if (child.isURDFLink && child.children[0].isURDFVisual) {
          child.children[0].material = new THREE.MeshStandardMaterial({
            color: 0xFF0000,
            roughness: 0.4,
            metalness: 0.5,
            emissive: 0x222222,
          });
        }
      });
      robotRef.current = robot; // 存储模型引用


      scene.add(robot);
      setSceneReady(true); // 场景准备好了
    });

    // 保存scene和camera对象到ref中
    sceneRef.current = scene;
    cameraRef.current = camera;

    // 渲染函数
    const animate = () => {
      requestAnimationFrame(animate);
      if (renderer) {
        renderer.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      if (renderer) renderer.dispose();
      // 清理VR光照
      disposeVRLighting(lights);
    };
  }, [type]);

  // 关节的映射关系
  const jointSyncMap = {
    'index_MCP': ['index_MCP', 'index_PIP', 'index_DIP'],
    'middle_MCP': ['middle_MCP', 'middle_PIP', 'middle_DIP'],
    'ring_MCP': ['ring_MCP', 'ring_PIP', 'ring_DIP'],
    'little_MCP': ['little_MCP', 'little_PIP', 'little_DIP'],
    'thumb_IP': ['thumb_IP', 'thumb_MP'],
    'thumb_CMC': ['thumb_CMC'],
  };

  // 辅助函数：更新关节值
  function updateJointValue(robot, jointName, value) {
    const joint = robot.joints[jointName];
    if (joint) {
      joint.setJointValue(value);
    }
  }

  // 优化更新的频率
  const updateHandValues = useCallback(() => {
    const currentTime = Date.now();
    if (currentTime - lastUpdateRef.current < updateInterval) {
      return; // 如果更新频率过高，则跳过更新
    }
    lastUpdateRef.current = currentTime;

    if (sceneReady && robotRef.current) {
      const robot = robotRef.current;
      const updatedValues = realTimeHandValuesRef.current;

      // 判断并更新关节值
      const valuesToUpdate = isInteractingRef.current
      ? plannedHandValuesRef.current
      : updatedValues;

      Object.entries(valuesToUpdate).forEach(([key, value]) => {
        if (typeof value === 'number' && !isNaN(value)) {
          // 获取与当前关节相关联的所有关节
          const jointsToUpdate = jointSyncMap[key] || [key]; // 默认更新当前关节
          jointsToUpdate.forEach((jointName) => {
            updateJointValue(robot, jointName, value*(Math.PI/180));
          });
        }
      });
    }
  }, [sceneReady]);

  // 使用 setInterval 控制更新频率
  useEffect(() => {
    const interval = setInterval(updateHandValues, updateInterval);
    return () => clearInterval(interval); // 清理 interval
  }, [updateHandValues]);

  // {{CHENGQI:
  // Action: Removed; Timestamp: 2025-08-05T11:22:29+08:00; Reason: Remove unused variables after disabling mouse joint control;
  // }}
  // 移除不再需要的鼠标控制相关变量
  // const dragging = useRef(false);
  // const initialMouseY = useRef(null);
  // const selectedObjectRef = useRef(null);

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
  // Action: Disabled; Timestamp: 2025-08-05T11:22:29+08:00; Reason: Disable mouse joint control to prevent accidental robot movement when dragging page;
  // }}
  // 禁用鼠标关节控制 - 用户反馈拖动页面时会引起机器人执行运动
  const onMouseDown = useCallback((event) => {
    // 鼠标关节控制已禁用，只保留3D渲染
    // 所有手掌控制现在通过控制面板进行
    // 阻止移动端长按弹出菜单
    if (event.touches) event.preventDefault();
  });

  // {{CHENGQI:
  // Action: Disabled; Timestamp: 2025-08-05T11:22:29+08:00; Reason: Disable mouse joint control to prevent accidental robot movement when dragging page;
  // }}
  // 禁用鼠标关节控制 - 用户反馈拖动页面时会引起机器人执行运动
  const onMouseMove = useCallback((event) => {
    // 鼠标关节控制已禁用，只保留3D渲染
    // 所有手掌控制现在通过控制面板进行
    // 阻止页面滚动
    if (event.touches) event.preventDefault();
  });

  // {{CHENGQI:
  // Action: Disabled; Timestamp: 2025-08-05T11:22:29+08:00; Reason: Disable mouse joint control to prevent accidental robot movement when dragging page;
  // }}
  // 禁用鼠标关节控制 - 用户反馈拖动页面时会引起机器人执行运动
  const onMouseUp = useCallback((event) => {
    // 鼠标关节控制已禁用，只保留3D渲染
    // 所有手掌控制现在通过控制面板进行
    // 阻止移动端点击穿透
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
    <canvas ref={canvasRef} />
  );
};

export default HandViewer;