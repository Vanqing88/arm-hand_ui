import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import URDFLoader from 'urdf-loader';

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

    const light = new THREE.AmbientLight(0x404040);
    const directionalLight0 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight0.position.set(1, 1, 1).normalize();
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(1, 1, -1).normalize();

    scene.add(light, directionalLight0, directionalLight1);

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

  // 鼠标交互部分
  const dragging = useRef(false);
  const initialMouseY = useRef(null);
  const selectedObjectRef = useRef(null);

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

  const onMouseDown = useCallback((event) => {
    if (dragging.current) return;
    dragging.current = true;
    onInteractionChange(true);
    if (!sceneRef.current || !cameraRef.current) return;
    const { x, y } = getClientXY(event);
    const rect = canvasRef.current.getBoundingClientRect();
    initialMouseY.current = y;
    const mouse = new THREE.Vector2(
      ((x - rect.left) / rect.width) * 2 - 1,
      -((y - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
    if (intersects.length > 0) {
      const selectedObject = intersects[0].object.parent.parent;
      const classifySelection = (object) => {
        const { name } = object;
        let joint = "unknown";
        if (name.startsWith("index")) joint = "index_MCP";
        else if (name.startsWith("middle")) joint = "middle_MCP";
        else if (name.startsWith("ring")) joint = "ring_MCP";
        else if (name.startsWith("little")) joint = "little_MCP";
        else if (name === "base_link" || name.startsWith("thumb_Link1"))
          joint = "thumb_CMC";
        else if (name.startsWith("thumb_Link2") || name.startsWith("thumb_Link3"))
          joint = "thumb_IP";
        return {
          ...object,
          joint,
        };
      };
      selectedObjectRef.current = classifySelection(selectedObject);
    }
    // 阻止移动端长按弹出菜单
    if (event.touches) event.preventDefault();
  });

  const onMouseMove = useCallback((event) => {
    if (dragging.current && selectedObjectRef.current?.joint !== "unknown" && !rosServiceCalling) {
      const { y } = getClientXY(event);
      const deltaY = y - initialMouseY.current;
      const name = selectedObjectRef.current.joint;
      const jointValueChange = deltaY / 2;
      const newValues = plannedHandValuesRef.current[name] + jointValueChange;
      plannedHandValuesRef.current[name] = newValues;
      onControlChange(name, newValues);
      initialMouseY.current = y;
    }
    // 阻止页面滚动
    if (event.touches) event.preventDefault();
  });

  const onMouseUp = useCallback((event) => {
    dragging.current = false;
    if (selectedObjectRef.current && selectedObjectRef.current.name !== "unknown") {
      if (!areJointValuesEqual(realTimeHandValuesRef.current, plannedHandValuesRef.current)) {
        onHandSrvCall(plannedHandValuesRef.current);
      }
    }
    onInteractionChange(false);
    selectedObjectRef.current = null;
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