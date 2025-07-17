import * as CANNON from 'cannon-es';
import * as THREE from 'three';

class CollisionDetector {
  constructor() {
    this.world = null;
    this.robotBodies = new Map(); // 存储机器人各部分的物理体
    this.collisionPairs = new Set(); // 存储碰撞对
    this.onCollisionCallback = null;
    this.bodyToLinkMap = new Map(); // 物理体到链接对象的映射
    this.linkToBodyMap = new Map(); // 链接对象到物理体的映射
    this.collisionMaterial = null;
    this.isEnabled = true;
    
    this.initPhysicsWorld();
  }

  initPhysicsWorld() {
    // 创建物理世界
    this.world = new CANNON.World();
    this.world.gravity.set(0, 0, 0); // 不需要重力
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    
    // 创建碰撞材料
    this.collisionMaterial = new CANNON.Material('collision');
    this.collisionMaterial.friction = 0;
    this.collisionMaterial.restitution = 0;
    
    // 监听碰撞事件
    this.world.addEventListener('beginContact', (event) => {
      if (!this.isEnabled) return;
      
      // 修复：Cannon.js 的事件结构
      const bodyA = event.bodyA || (event.contact && event.contact.bodyA);
      const bodyB = event.bodyB || (event.contact && event.contact.bodyB);
      
      if (!bodyA || !bodyB) {
        console.warn('beginContact: bodyA or bodyB is undefined', event);
        return;
      }
      
      const linkA = this.bodyToLinkMap.get(bodyA);
      const linkB = this.bodyToLinkMap.get(bodyB);
      
      if (linkA && linkB) {
        // 过滤相邻链接的碰撞
        if (this.isAdjacentLink(linkA.name, linkB.name)) {
          console.log(`过滤相邻链接碰撞: ${linkA.name} <-> ${linkB.name}`);
          return;
        }
        
        const pairKey = this.createPairKey(linkA, linkB);
        this.collisionPairs.add(pairKey);
        
        console.log(`有效碰撞: ${linkA.name} <-> ${linkB.name}`);
        
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
    });
    
    this.world.addEventListener('endContact', (event) => {
      if (!this.isEnabled) return;
      
      // 修复：Cannon.js 的事件结构
      const bodyA = event.bodyA || (event.contact && event.contact.bodyA);
      const bodyB = event.bodyB || (event.contact && event.contact.bodyB);
      
      if (!bodyA || !bodyB) {
        console.warn('endContact: bodyA or bodyB is undefined', event);
        return;
      }
      
      const linkA = this.bodyToLinkMap.get(bodyA);
      const linkB = this.bodyToLinkMap.get(bodyB);
      
      if (linkA && linkB) {
        // 过滤相邻链接的碰撞
        if (this.isAdjacentLink(linkA.name, linkB.name)) {
          console.log(`过滤相邻链接碰撞结束: ${linkA.name} <-> ${linkB.name}`);
          return;
        }
        
        const pairKey = this.createPairKey(linkA, linkB);
        this.collisionPairs.delete(pairKey);
        
        console.log(`有效碰撞结束: ${linkA.name} <-> ${linkB.name}`);
        
        if (this.onCollisionCallback) {
          this.onCollisionCallback({
            type: 'collision_end',
            linkA,
            linkB,
            bodyA,
            bodyB
          });
        }
      }
    });
  }

  createPairKey(linkA, linkB) {
    // 创建一致的配对键
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
    // 设置碰撞过滤，避免相邻链接之间的碰撞
    this.adjacentLinks = new Set([
      // 左臂相邻链接
      'SHOULDER_L-UPPERARM_L',
      'UPPERARM_L-FOREARM_L',
      'FOREARM_L-WRIST_REVOLUTE_L',
      'WRIST_REVOLUTE_L-WRIST_UPDOWN_L',
      'WRIST_UPDOWN_L-HAND_L',
      
      // 右臂相邻链接
      'SHOULDER_R-UPPERARM_R',
      'UPPERARM_R-FOREARM_R',
      'FOREARM_R-WRIST_REVOLUTE_R',
      'WRIST_REVOLUTE_R-WRIST_UPDOWN_R',
      'WRIST_UPDOWN_R-HAND_R',
      
      // 躯干相邻链接
      'TORSO-SHOULDER_L',
      'TORSO-SHOULDER_R',
      'TORSO-NECK',
      'NECK-HEAD',
      
      // 反向映射
      'UPPERARM_L-SHOULDER_L',
      'FOREARM_L-UPPERARM_L',
      'WRIST_REVOLUTE_L-FOREARM_L',
      'WRIST_UPDOWN_L-WRIST_REVOLUTE_L',
      'HAND_L-WRIST_UPDOWN_L',
      
      'UPPERARM_R-SHOULDER_R',
      'FOREARM_R-UPPERARM_R',
      'WRIST_REVOLUTE_R-FOREARM_R',
      'WRIST_UPDOWN_R-WRIST_REVOLUTE_R',
      'HAND_R-WRIST_UPDOWN_R',
      
      'SHOULDER_L-TORSO',
      'SHOULDER_R-TORSO',
      'NECK-TORSO',
      'HEAD-NECK',
    ]);

    console.log('碰撞过滤已设置，相邻链接对:', this.adjacentLinks);
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
    
    // 创建包围盒
    const boundingBox = new THREE.Box3();
    let hasMesh = false;
    let meshCount = 0;
    
    link.traverse((child) => {
      if (child.isMesh && child.visible && child.geometry) {
        try {
          // 更新几何体的包围盒
          child.geometry.computeBoundingBox();
          
          if (child.geometry.boundingBox && !child.geometry.boundingBox.isEmpty()) {
            const meshBB = child.geometry.boundingBox.clone();
            
            // 应用子对象的变换矩阵
            child.updateMatrixWorld(true);
            meshBB.applyMatrix4(child.matrixWorld);
            
            if (hasMesh) {
              boundingBox.union(meshBB);
            } else {
              boundingBox.copy(meshBB);
              hasMesh = true;
            }
            meshCount++;
          }
        } catch (error) {
          console.warn(`处理链接 ${link.name} 的网格时出错:`, error);
        }
      }
    });
    
    if (!hasMesh || boundingBox.isEmpty()) {
      console.log(`链接 ${link.name} 没有有效的几何体，跳过创建物理体`);
      return;
    }
    
    // 计算包围盒尺寸
    const size = boundingBox.getSize(new THREE.Vector3());
    const center = boundingBox.getCenter(new THREE.Vector3());
    
    // 确保尺寸不为0且不会太小
    const minSize = 0.005; // 增加最小尺寸
    const halfX = Math.max(size.x / 2, minSize);
    const halfY = Math.max(size.y / 2, minSize);
    const halfZ = Math.max(size.z / 2, minSize);
    
    // 创建物理体形状（使用盒子形状）
    const shape = new CANNON.Box(new CANNON.Vec3(halfX, halfY, halfZ));
    
    // 创建物理体
    const body = new CANNON.Body({
      mass: 0, // 静态物体
      shape: shape,
      material: this.collisionMaterial,
      type: CANNON.Body.KINEMATIC // 运动学物体，不受力影响但可以移动
    });
    
    // 设置初始位置
    body.position.set(center.x, center.y, center.z);
    
    // 存储映射关系
    this.robotBodies.set(link.name, body);
    this.bodyToLinkMap.set(body, link);
    this.linkToBodyMap.set(link, body);
    
    // 添加到物理世界
    this.world.addBody(body);
    
    console.log(`为链接 ${link.name} 创建物理体，包含${meshCount}个网格，尺寸: ${size.x.toFixed(3)} x ${size.y.toFixed(3)} x ${size.z.toFixed(3)}`);
  }

  updateRobotPhysics(robot) {
    if (!robot || !this.isEnabled) return;
    
    // 更新每个链接的物理体位置和旋转
    robot.traverse((child) => {
      if (child.isURDFLink) {
        const body = this.linkToBodyMap.get(child);
        if (body) {
          try {
            // 获取链接的世界变换矩阵
            child.updateMatrixWorld(true);
            
            // 计算链接的实际边界框中心
            const boundingBox = new THREE.Box3();
            let hasMesh = false;
            
            child.traverse((meshChild) => {
              if (meshChild.isMesh && meshChild.visible && meshChild.geometry) {
                try {
                  meshChild.geometry.computeBoundingBox();
                  if (meshChild.geometry.boundingBox && !meshChild.geometry.boundingBox.isEmpty()) {
                    const meshBB = meshChild.geometry.boundingBox.clone();
                    meshChild.updateMatrixWorld(true);
                    meshBB.applyMatrix4(meshChild.matrixWorld);
                    
                    if (hasMesh) {
                      boundingBox.union(meshBB);
                    } else {
                      boundingBox.copy(meshBB);
                      hasMesh = true;
                    }
                  }
                } catch (error) {
                  console.warn(`更新链接 ${child.name} 的网格时出错:`, error);
                }
              }
            });
            
            if (hasMesh && !boundingBox.isEmpty()) {
              // 使用实际的边界框中心
              const center = boundingBox.getCenter(new THREE.Vector3());
              body.position.set(center.x, center.y, center.z);
              
              // 使用链接的旋转
              const position = new THREE.Vector3();
              const quaternion = new THREE.Quaternion();
              const scale = new THREE.Vector3();
              child.matrixWorld.decompose(position, quaternion, scale);
              
              body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
            }
          } catch (error) {
            console.warn(`更新链接 ${child.name} 的物理体时出错:`, error);
          }
        }
      }
    });
  }

  stepPhysics(deltaTime = 1/60) {
    if (!this.isEnabled) return;
    this.world.step(deltaTime);
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
}

export default CollisionDetector; 