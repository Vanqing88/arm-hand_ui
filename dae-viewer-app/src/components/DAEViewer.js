import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import DAEViewerControls from './DAEViewerControls';

const DAEViewer = () => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const loadedModelsRef = useRef(new Map()); // 存储已加载的模型
  const animationIdRef = useRef(null);

  const [sceneReady, setSceneReady] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState([]); // 已加载的文件列表
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // H1_Pro1/meshes_dae目录下的所有DAE文件列表
  const availableFiles = [
    'ASTRAGALUS_L.dae',
    'ASTRAGALUS_R.dae',
    'FOOT_L.dae',
    'FOOT_R.dae',
    'FOREARM_L.dae',
    'FOREARM_R.dae',
    'HAND_L.dae',
    'HAND_R.dae',
    'HEAD.dae',
    'ILIUM_L.dae',
    'ILIUM_R.dae',
    'ISCHIUM_L.dae',
    'ISCHIUM_R.dae',
    'NECK.dae',
    'SACRUM.dae',
    'SCAPULA_L.dae',
    'SCAPULA_R.dae',
    'SHANK_L.dae',
    'SHANK_R.dae',
    'SHOULDER_L.dae',
    'SHOULDER_R.dae',
    'TCP_L.dae',
    'TCP_R.dae',
    'THIGH_L.dae',
    'THIGH_R.dae',
    'TIPTOE_Z_L.dae',
    'TIPTOE_Z_R.dae',
    'TORSO.dae',
    'UPPERARM_L.dae',
    'UPPERARM_R.dae',
    'WRIST_FLANGE_L.dae',
    'WRIST_FLANGE_R.dae',
    'WRIST_REVOLUTE_L.dae',
    'WRIST_REVOLUTE_R.dae',
    'WRIST_UPDOWN_L.dae',
    'WRIST_UPDOWN_R.dae'
  ];

  // 初始化Three.js场景
  useEffect(() => {
    if (!canvasRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // 添加坐标轴辅助线
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      50, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.set(2, 2, 2);
    camera.lookAt(0, 0, 0);

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 设置光照
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5).normalize();
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // 添加相机控制
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.minDistance = 0.5;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI;
    controls.update();

    // 保存引用
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    // 渲染循环
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 窗口大小调整
    const handleResize = () => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    setSceneReady(true);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (renderer) {
        renderer.dispose();
      }
      // 清理已加载的模型
      loadedModelsRef.current.forEach((model) => {
        if (model && model.traverse) {
          model.traverse((child) => {
            if (child.isMesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(material => material.dispose());
                } else {
                  child.material.dispose();
                }
              }
            }
          });
        }
      });
      loadedModelsRef.current.clear();
    };
  }, []);

  // 加载DAE文件
  const loadDAEFile = useCallback((fileName) => {
    if (!sceneRef.current || loading) return;

    // 检查文件是否已经加载
    if (loadedModelsRef.current.has(fileName)) {
      setError(`文件 ${fileName} 已经加载`);
      return;
    }

    setLoading(true);
    setError(null);

    const filePath = `./H1_Pro1/meshes_dae/${fileName}`;
    const loader = new ColladaLoader();
    
    loader.load(
      filePath,
      (collada) => {
        const model = collada.scene;
        
        // 设置模型的基本属性
        model.name = fileName;
        model.userData = { filePath, fileName };
        
        // 设置透明度（复用RobotViewer.js的模式）
        model.traverse((child) => {
          if (child.isMesh) {
            // 确保材质可以被修改
            if (child.material) {
              child.material = child.material.clone();
            }
            child.material.transparent = true;
            child.material.opacity = 0.8;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // 添加到场景
        sceneRef.current.add(model);
        
        // 存储模型引用
        loadedModelsRef.current.set(fileName, model);
        
        // 更新文件列表
        setLoadedFiles(prev => [...prev, { fileName, filePath, opacity: 0.8 }]);
        
        setLoading(false);
        console.log(`成功加载DAE文件: ${fileName}`);
      },
      (progress) => {
        console.log(`加载进度: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
      },
      (error) => {
        console.error('加载DAE文件失败:', error);
        setError(`加载文件 ${fileName} 失败: ${error.message}`);
        setLoading(false);
      }
    );
  }, [loading]);

  // 设置模型透明度
  const setModelTransparency = useCallback((fileName, opacity) => {
    const model = loadedModelsRef.current.get(fileName);
    if (model) {
      model.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.opacity = opacity;
        }
      });
      
      // 更新文件列表中的透明度
      setLoadedFiles(prev => 
        prev.map(file => 
          file.fileName === fileName 
            ? { ...file, opacity } 
            : file
        )
      );
    }
  }, []);

  // 移除模型
  const removeModel = useCallback((fileName) => {
    const model = loadedModelsRef.current.get(fileName);
    if (model && sceneRef.current) {
      sceneRef.current.remove(model);
      
      // 清理模型资源
      model.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      
      loadedModelsRef.current.delete(fileName);
      setLoadedFiles(prev => prev.filter(file => file.fileName !== fileName));
    }
  }, []);

  // 清空所有模型
  const clearAllModels = useCallback(() => {
    loadedModelsRef.current.forEach((model) => {
      if (sceneRef.current) {
        sceneRef.current.remove(model);
      }
    });
    
    loadedModelsRef.current.clear();
    setLoadedFiles([]);
  }, []);

  // 测试加载功能 - 加载几个示例文件
  const loadTestFiles = useCallback(() => {
    const testFiles = ['HAND_L.dae', 'HAND_R.dae', 'TORSO.dae'];
    testFiles.forEach(fileName => {
      if (!loadedModelsRef.current.has(fileName)) {
        loadDAEFile(fileName);
      }
    });
  }, [loadDAEFile]);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
      
      {/* Material-UI控制界面 */}
      <DAEViewerControls
        availableFiles={availableFiles}
        loadedFiles={loadedFiles}
        loading={loading}
        error={error}
        onLoadFile={loadDAEFile}
        onRemoveFile={removeModel}
        onClearAll={clearAllModels}
        onSetTransparency={setModelTransparency}
        onLoadTestFiles={loadTestFiles}
      />
      
      {/* 调试信息 */}
      {sceneReady && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '5px',
          zIndex: 1000,
          fontSize: '12px'
        }}>
          已加载文件: {loadedFiles.length}
          <br />
          场景状态: {sceneReady ? '就绪' : '初始化中'}
        </div>
      )}
    </div>
  );
};

export default DAEViewer; 