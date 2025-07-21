import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export default class CollisionDetector {
  constructor() {
    this.world = null;
    this.robotBodies = new Map(); // 存储机器人各部分的物理体
    this.collisionPairs = new Set(); // 存储碰撞对
    this.onCollisionCallback = null;
    this.bodyToLinkMap = new Map(); // 物理体到链接对象的映射
    this.linkToBodyMap = new Map(); // 链接对象到物理体的映射
    this.collisionMaterial = null;
    this.isEnabled = true;
    this.debugMode = false; // 添加调试模式
    this.debugMeshes = new Map(); // 存储调试网格
    
    // 碰撞体缩放因子 - 增加到0.5，使包围盒更明显
    this.collisionScaleFactor = 0.5;
    
    // 存储上一次的碰撞状态，用于减少材质更新
    this.previousCollisionState = new Map();
    
    this.initPhysicsWorld();
  }

  initPhysicsWorld() {
    // 创建物理世界
    this.world = new CANNON.World();
    this.world.gravity.set(0, 0, 0); // 不需要重力
    
    // 使用更精确的宽相位算法
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.solver.iterations = 5;
    
    // 设置碰撞容差
    this.world.defaultContactMaterial.contactEquationStiffness = 1e7;
    this.world.defaultContactMaterial.contactEquationRelaxation = 3;
    
    // 创建碰撞材料
    this.collisionMaterial = new CANNON.Material('collision');
    const contactMaterial = new CANNON.ContactMaterial(
      this.collisionMaterial,
      this.collisionMaterial,
      {
        friction: 0,
        restitution: 0,
        contactEquationStiffness: 1e7,
        contactEquationRelaxation: 3
      }
    );
    this.world.addContactMaterial(contactMaterial);
    
    // 监听碰撞事件
    this.world.addEventListener('beginContact', (event) => {
      if (!this.isEnabled) return;
      
      const bodyA = event.bodyA;
      const bodyB = event.bodyB;
      
      if (!bodyA || !bodyB) {
        return;
      }
      
      const linkA = this.bodyToLinkMap.get(bodyA);
      const linkB = this.bodyToLinkMap.get(bodyB);
      
      if (linkA && linkB) {
        // 过滤相邻链接和自身的碰撞
        if (this.shouldIgnoreCollision(linkA.name, linkB.name)) {
          return;
        }
        
        const pairKey = this.createPairKey(linkA, linkB);
        
        // 只有当该碰撞对之前不存在时才触发回调
        if (!this.collisionPairs.has(pairKey)) {
          this.collisionPairs.add(pairKey);
          
          if (this.debugMode) {
            console.log(`检测到碰撞: ${linkA.name} <-> ${linkB.name}`);
          }
          
          // 检查状态是否真的改变了
          const linkAChanged = this.previousCollisionState.get(linkA.name) !== true;
          const linkBChanged = this.previousCollisionState.get(linkB.name) !== true;
          
          if (linkAChanged || linkBChanged) {
            this.previousCollisionState.set(linkA.name, true);
            this.previousCollisionState.set(linkB.name, true);
            
            if (this.onCollisionCallback) {
              this.onCollisionCallback({
                type: 'collision',
                linkA,
                linkB,
                bodyA,
                bodyB
              });
            }
          }
        }
      }
    });
    
    this.world.addEventListener('endContact', (event) => {
      if (!this.isEnabled) return;
      
      const bodyA = event.bodyA;
      const bodyB = event.bodyB;
      
      if (!bodyA || !bodyB) {
        return;
      }
      
      const linkA = this.bodyToLinkMap.get(bodyA);
      const linkB = this.bodyToLinkMap.get(bodyB);
      
      if (linkA && linkB) {
        if (this.shouldIgnoreCollision(linkA.name, linkB.name)) {
          return;
        }
        
        const pairKey = this.createPairKey(linkA, linkB);
        
        if (this.collisionPairs.has(pairKey)) {
          this.collisionPairs.delete(pairKey);
          
          if (this.debugMode) {
            console.log(`碰撞结束: ${linkA.name} <-> ${linkB.name}`);
          }
          
          // 检查链接是否还有其他碰撞
          const linkAStillColliding = this.isLinkColliding(linkA.name);
          const linkBStillColliding = this.isLinkColliding(linkB.name);
          
          // 只有当状态真的改变时才更新
          if (!linkAStillColliding && this.previousCollisionState.get(linkA.name) === true) {
            this.previousCollisionState.set(linkA.name, false);
          }
          if (!linkBStillColliding && this.previousCollisionState.get(linkB.name) === true) {
            this.previousCollisionState.set(linkB.name, false);
          }
          
          if (this.onCollisionCallback) {
            this.onCollisionCallback({
              type: 'collision_end',
              linkA,
              linkB,
              bodyA,
              bodyB,
              linkAStillColliding,
              linkBStillColliding
            });
          }
        }
      }
    });
  }

  // 判断是否应该忽略这对链接之间的碰撞
  shouldIgnoreCollision(linkNameA, linkNameB) {
    // 忽略自身碰撞
    if (linkNameA === linkNameB) {
      return true;
    }
    
    // 检查是否为相邻链接
    if (this.isAdjacentLink(linkNameA, linkNameB)) {
      return true;
    }
    
    // 只忽略直接连接的特殊组件
    const ignorePairs = [
      // 手掌内部直接连接的组件
      ['HAND_L', 'TCP_L'],
      ['HAND_R', 'TCP_R'],
      ['WRIST_FLANGE_L', 'TCP_L'],
      ['WRIST_FLANGE_R', 'TCP_R'],
    ];
    
    for (const [nameA, nameB] of ignorePairs) {
      if ((linkNameA === nameA && linkNameB === nameB) || 
          (linkNameA === nameB && linkNameB === nameA)) {
        return true;
      }
    }
    
    return false;
  }

  createPairKey(linkA, linkB) {
    const nameA = linkA.name || linkA.uuid;
    const nameB = linkB.name || linkB.uuid;
    return nameA < nameB ? `${nameA}-${nameB}` : `${nameB}-${nameA}`;
  }

  addRobotToPhysicsWorld(robot) {
    if (!robot) return;
    
    console.log('开始为机器人创建物理体...');
    
    // 遍历机器人的所有链接
    robot.traverse((child) => {
      if (child.isURDFLink) {
        this.createPhysicsBodyForLink(child);
      }
    });
    
    console.log(`已为机器人创建 ${this.robotBodies.size} 个物理体`);
    
    // 添加初始的自碰撞过滤
    this.setupCollisionFiltering();
  }

  setupCollisionFiltering() {
    // 只包含直接通过关节连接的相邻链接
    this.adjacentLinks = new Set([
      // 左臂链条
      'TORSO-SCAPULA_L',
      'SCAPULA_L-SHOULDER_L',
      'SHOULDER_L-UPPERARM_L',
      'UPPERARM_L-FOREARM_L',
      'FOREARM_L-WRIST_REVOLUTE_L',
      'WRIST_REVOLUTE_L-WRIST_UPDOWN_L',
      'WRIST_UPDOWN_L-WRIST_FLANGE_L',
      'WRIST_FLANGE_L-TCP_L',
      
      // 右臂链条
      'TORSO-SCAPULA_R',
      'SCAPULA_R-SHOULDER_R',
      'SHOULDER_R-UPPERARM_R',
      'UPPERARM_R-FOREARM_R',
      'FOREARM_R-WRIST_REVOLUTE_R',
      'WRIST_REVOLUTE_R-WRIST_UPDOWN_R',
      'WRIST_UPDOWN_R-WRIST_FLANGE_R',
      'WRIST_FLANGE_R-TCP_R',
      
      // 躯干和头部
      'SACRUM-TORSO',
      'TORSO-NECK',
      'NECK-HEAD',
      
      // 左腿链条
      'SACRUM-ILIUM_L',
      'ILIUM_L-ISCHIUM_L',
      'ISCHIUM_L-THIGH_L',
      'THIGH_L-SHANK_L',
      'SHANK_L-ASTRAGALUS_L',
      'ASTRAGALUS_L-FOOT_L',
      
      // 右腿链条
      'SACRUM-ILIUM_R',
      'ILIUM_R-ISCHIUM_R',
      'ISCHIUM_R-THIGH_R',
      'THIGH_R-SHANK_R',
      'SHANK_R-ASTRAGALUS_R',
      'ASTRAGALUS_R-FOOT_R',
    ]);

    // 添加反向映射
    const reverseLinks = new Set();
    this.adjacentLinks.forEach(pair => {
      const [a, b] = pair.split('-');
      reverseLinks.add(`${b}-${a}`);
    });
    
    // 合并正向和反向映射
    reverseLinks.forEach(pair => this.adjacentLinks.add(pair));

    console.log('碰撞过滤已设置，相邻链接对数量:', this.adjacentLinks.size);
  }

  // 检查是否为相邻链接
  isAdjacentLink(linkA, linkB) {
    const pairKey = `${linkA}-${linkB}`;
    return this.adjacentLinks && this.adjacentLinks.has(pairKey);
  }

  createPhysicsBodyForLink(link) {
    if (!link || this.linkToBodyMap.has(link)) return;
    
    // 跳过某些不需要碰撞检测的链接
    const skipLinks = ['base_link', 'world'];
    if (skipLinks.includes(link.name)) {
      console.log(`跳过链接 ${link.name}`);
      return;
    }
    
    // 确保链接的世界矩阵是最新的
    link.updateMatrixWorld(true);
    
    // 创建包围盒 - 简化计算逻辑
    const boundingBox = new THREE.Box3();
    let hasMesh = false;
    
    // 收集所有网格的世界坐标包围盒
    link.traverse((child) => {
      if (child.isMesh && child.visible && child.geometry && child !== link) {
        // 确保几何体的包围盒已计算
        child.geometry.computeBoundingBox();
        
        if (child.geometry.boundingBox && !child.geometry.boundingBox.isEmpty()) {
          // 将局部包围盒转换到世界坐标
          const worldBoundingBox = child.geometry.boundingBox.clone();
          worldBoundingBox.applyMatrix4(child.matrixWorld);
          
          if (hasMesh) {
            boundingBox.union(worldBoundingBox);
          } else {
            boundingBox.copy(worldBoundingBox);
            hasMesh = true;
          }
        }
      }
    });
    
    if (!hasMesh || boundingBox.isEmpty()) {
      console.log(`链接 ${link.name} 的包围盒为空，跳过`);
      return;
    }
    
    // 计算包围盒尺寸和中心（在世界坐标系中）
    const size = boundingBox.getSize(new THREE.Vector3());
    const center = boundingBox.getCenter(new THREE.Vector3());
    
    // 应用缩放因子，确保最小尺寸
    const minSize = 0.01; // 增加最小尺寸
    const halfX = Math.max(size.x * this.collisionScaleFactor / 2, minSize);
    const halfY = Math.max(size.y * this.collisionScaleFactor / 2, minSize);
    const halfZ = Math.max(size.z * this.collisionScaleFactor / 2, minSize);
    
    // 创建物理体形状
    const shape = new CANNON.Box(new CANNON.Vec3(halfX, halfY, halfZ));
    
    // 创建物理体
    const body = new CANNON.Body({
      mass: 0,
      shape: shape,
      material: this.collisionMaterial,
      type: CANNON.Body.KINEMATIC
    });
    
    // 设置初始位置（直接使用世界坐标中心）
    body.position.set(center.x, center.y, center.z);
    
    // 设置初始旋转
    const quaternion = new THREE.Quaternion();
    link.getWorldQuaternion(quaternion);
    body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    
    // 存储世界中心位置，用于后续更新
    body.worldCenter = center.clone();
    
    // 存储映射关系
    this.robotBodies.set(link.name, body);
    this.bodyToLinkMap.set(body, link);
    this.linkToBodyMap.set(link, body);
    
    // 添加到物理世界
    this.world.addBody(body);
    
    if (this.debugMode) {
      console.log(`为链接 ${link.name} 创建物理体:
        - 世界中心: (${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)})
        - 尺寸: ${(halfX*2).toFixed(3)} x ${(halfY*2).toFixed(3)} x ${(halfZ*2).toFixed(3)}
        - 原始尺寸: ${size.x.toFixed(3)} x ${size.y.toFixed(3)} x ${size.z.toFixed(3)}`);
    }
  }

  updateRobotPhysics(robot) {
    if (!robot || !this.isEnabled) return;
    
    // 更新每个链接的物理体位置和旋转
    this.robotBodies.forEach((body, linkName) => {
      const link = this.bodyToLinkMap.get(body);
      if (link) {
        // 确保世界矩阵是最新的
        link.updateMatrixWorld(true);
        
        // 重新计算包围盒中心位置
        const boundingBox = new THREE.Box3();
        let hasMesh = false;
        
        link.traverse((child) => {
          if (child.isMesh && child.visible && child.geometry && child !== link) {
            child.geometry.computeBoundingBox();
            if (child.geometry.boundingBox && !child.geometry.boundingBox.isEmpty()) {
              const worldBoundingBox = child.geometry.boundingBox.clone();
              worldBoundingBox.applyMatrix4(child.matrixWorld);
              
              if (hasMesh) {
                boundingBox.union(worldBoundingBox);
              } else {
                boundingBox.copy(worldBoundingBox);
                hasMesh = true;
              }
            }
          }
        });
        
        if (hasMesh && !boundingBox.isEmpty()) {
          const center = boundingBox.getCenter(new THREE.Vector3());
          body.position.set(center.x, center.y, center.z);
          
          // 更新旋转
          const quaternion = new THREE.Quaternion();
          link.getWorldQuaternion(quaternion);
          body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        }
      }
    });
    
    // 更新物理世界的宽相位
    this.world.broadphase.dirty = true;
  }

  stepPhysics(deltaTime = 1/60) {
    if (!this.isEnabled) return;
    
    // 固定时间步长以提高稳定性
    const fixedTimeStep = 1/60;
    const maxSubSteps = 1;
    
    this.world.step(fixedTimeStep, deltaTime, maxSubSteps);
  }

  getCollidingLinks() {
    const collidingLinks = new Set();
    
    this.collisionPairs.forEach(pairKey => {
      const [nameA, nameB] = pairKey.split('-');
      collidingLinks.add(nameA);
      collidingLinks.add(nameB);
    });
    
    return Array.from(collidingLinks);
  }

  setCollisionCallback(callback) {
    this.onCollisionCallback = callback;
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
    this.collisionPairs.clear();
    this.previousCollisionState.clear();
  }

  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  dispose() {
    if (this.world) {
      // 清理所有物理体
      this.robotBodies.forEach(body => {
        this.world.removeBody(body);
      });
      
      this.robotBodies.clear();
      this.bodyToLinkMap.clear();
      this.linkToBodyMap.clear();
      this.collisionPairs.clear();
      this.previousCollisionState.clear();
      
      // 清理调试网格
      this.clearDebugVisualization();
    }
  }

  // 检查特定链接是否发生碰撞
  isLinkColliding(linkName) {
    for (const pairKey of this.collisionPairs) {
      if (pairKey.includes(linkName)) {
        return true;
      }
    }
    return false;
  }

  // 获取与指定链接发生碰撞的其他链接
  getCollisionPartnersFor(linkName) {
    const partners = [];
    
    this.collisionPairs.forEach(pairKey => {
      const [nameA, nameB] = pairKey.split('-');
      if (nameA === linkName) {
        partners.push(nameB);
      } else if (nameB === linkName) {
        partners.push(nameA);
      }
    });
    
    return partners;
  }

  // 检查机器人是否有任何碰撞
  hasAnyCollision() {
    return this.collisionPairs.size > 0;
  }

  // 获取所有碰撞对
  getAllCollisionPairs() {
    return Array.from(this.collisionPairs);
  }

  // 创建可视化辅助工具（用于调试）
  createDebugVisualization(scene) {
    if (!this.debugMode || !scene) return;
    
    // 清理旧的调试网格
    this.clearDebugVisualization();
    
    const debugMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    
    this.robotBodies.forEach((body, linkName) => {
      const shape = body.shapes[0];
      if (shape instanceof CANNON.Box) {
        const boxGeometry = new THREE.BoxGeometry(
          shape.halfExtents.x * 2,
          shape.halfExtents.y * 2,
          shape.halfExtents.z * 2
        );
        const boxMesh = new THREE.Mesh(boxGeometry, debugMaterial);
        
        // 确保位置和旋转正确设置
        boxMesh.position.copy(body.position);
        boxMesh.quaternion.copy(body.quaternion);
        boxMesh.name = `debug_${linkName}`;
        
        scene.add(boxMesh);
        this.debugMeshes.set(linkName, boxMesh);
        
        if (this.debugMode) {
          console.log(`创建调试网格: ${linkName} at (${body.position.x.toFixed(3)}, ${body.position.y.toFixed(3)}, ${body.position.z.toFixed(3)})`);
        }
      }
    });
  }

  // 更新调试可视化
  updateDebugVisualization(scene) {
    if (!this.debugMode || !scene) return;
    
    this.robotBodies.forEach((body, linkName) => {
      const debugMesh = this.debugMeshes.get(linkName);
      if (debugMesh && body) {
        // 确保调试网格正确跟随物理体
        debugMesh.position.copy(body.position);
        debugMesh.quaternion.copy(body.quaternion);
        
        // 强制更新矩阵
        debugMesh.updateMatrix();
        debugMesh.updateMatrixWorld(true);
      }
    });
  }

  // 清理调试可视化
  clearDebugVisualization() {
    this.debugMeshes.forEach((mesh) => {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
    });
    this.debugMeshes.clear();
  }
}