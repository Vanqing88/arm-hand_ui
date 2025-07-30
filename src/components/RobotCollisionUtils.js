import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import config from '../config';

// 为Three.js几何体添加BVH支持
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

/**
 * 机器人碰撞检测工具类
 * 使用three-mesh-bvh进行高效的碰撞检测
 */
export class RobotCollisionUtils {
  constructor() {
    this.robotBVHs = new Map(); // 存储每个机器人模型的BVH
    this.collisionMaterials = new Map(); // 存储碰撞高亮材质
    this.originalMaterials = new Map(); // 存储原始材质
    this.collisionResults = new Map(); // 存储碰撞检测结果
    
    // 创建碰撞高亮材质
    this.createCollisionMaterials();
  }

                /**
               * 创建碰撞高亮材质
               */
              createCollisionMaterials() {
                const visConfig = config.collisionDetection.visualization;
                
                // 碰撞材质
                const collisionMaterial = new THREE.MeshStandardMaterial({
                  color: visConfig.collisionColor,
                  roughness: 0.3,
                  metalness: 0.7,
                  transparent: visConfig.transparent,
                  opacity: visConfig.opacity,
                  emissive: visConfig.collisionColor,
                  emissiveIntensity: visConfig.emissiveIntensity
                });

                this.collisionMaterials.set('collision', collisionMaterial);
              }

  /**
   * 为机器人模型构建BVH
   * @param {THREE.Object3D} robot - 机器人模型
   * @param {string} robotId - 机器人标识符
   */
  buildBVHForRobot(robot, robotId) {
    if (!robot) {
      console.warn('Robot is null, cannot build BVH');
      return;
    }

    console.log(`开始为机器人 ${robotId} 构建BVH...`);
    const meshes = [];
    const bvhData = {
      meshes: [],
      boundingBoxes: [],
      robotId: robotId
    };

    // 遍历机器人的所有网格
    robot.traverse((child) => {
      if (child.isMesh && child.geometry) {
        try {
          // 保存原始材质
          if (child.material && !this.originalMaterials.has(child.uuid)) {
            this.originalMaterials.set(child.uuid, child.material.clone());
          }

          // 确保几何体有有效的索引
          if (!child.geometry.index) {
            child.geometry = child.geometry.toNonIndexed();
          }

          // 计算几何体的包围盒树
          child.geometry.computeBoundsTree();
          
          // 创建世界矩阵用于变换
          child.updateMatrixWorld(true);
          
          meshes.push({
            mesh: child,
            bvh: child.geometry.boundsTree,
            worldMatrix: child.matrixWorld.clone(),
            linkName: this.getLinkName(child),
            jointName: this.getJointName(child)
          });

          // 计算包围盒
          const box = new THREE.Box3().setFromObject(child);
          bvhData.boundingBoxes.push({
            box: box,
            mesh: child,
            linkName: this.getLinkName(child)
          });

        } catch (error) {
          console.warn(`为网格构建BVH失败 ${child.name}:`, error);
        }
      }
    });

    bvhData.meshes = meshes;
    this.robotBVHs.set(robotId, bvhData);
    
    console.log(`为机器人 ${robotId} 构建了 ${meshes.length} 个网格的BVH`);
    return bvhData;
  }

  /**
   * 获取网格所属的链接名称
   */
  getLinkName(mesh) {
    let current = mesh;
    while (current) {
      if (current.isURDFLink) {
        return current.name;
      }
      current = current.parent;
    }
    return 'unknown_link';
  }

  /**
   * 获取网格所属的关节名称
   */
  getJointName(mesh) {
    let current = mesh;
    while (current) {
      if (current.isURDFJoint) {
        return current.name;
      }
      current = current.parent;
    }
    return 'unknown_joint';
  }

  /**
   * 计算两个包围盒之间的最小距离
   */
  calculateBoxDistance(box1, box2) {
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
  }

  /**
   * 检测两个机器人之间的碰撞
   * @param {string} robotId1 - 第一个机器人ID
   * @param {string} robotId2 - 第二个机器人ID
   * @param {number} threshold - 碰撞阈值距离
   * @returns {Array} 碰撞结果数组
   */
  detectCollisions(robotId1, robotId2, threshold = 0.01) {
    const robot1Data = this.robotBVHs.get(robotId1);
    const robot2Data = this.robotBVHs.get(robotId2);

    if (!robot1Data || !robot2Data) {
      console.warn(`无法找到机器人BVH数据: ${robotId1}, ${robotId2}`);
      return [];
    }

    const collisions = [];
    const collisionKey = `${robotId1}_${robotId2}`;

    // 对于每个机器人1的网格，检查与机器人2的所有网格的碰撞
    for (const mesh1Data of robot1Data.meshes) {
      for (const mesh2Data of robot2Data.meshes) {
        const collision = this.checkMeshCollision(mesh1Data, mesh2Data, threshold);
        if (collision) {
          collision.robotId1 = robotId1;
          collision.robotId2 = robotId2;
          collisions.push(collision);
        }
      }
    }

    // 存储碰撞结果
    this.collisionResults.set(collisionKey, collisions);
    
    // 更新可视化
    this.updateCollisionVisualization(collisions);

    return collisions;
  }

  /**
   * 检测两个网格之间的碰撞
   * @param {Object} mesh1Data - 第一个网格数据
   * @param {Object} mesh2Data - 第二个网格数据
   * @param {number} threshold - 碰撞阈值
   * @returns {Object|null} 碰撞结果或null
   */
  checkMeshCollision(mesh1Data, mesh2Data, threshold) {
    const { mesh: mesh1, bvh: bvh1 } = mesh1Data;
    const { mesh: mesh2, bvh: bvh2 } = mesh2Data;

    if (!bvh1 || !bvh2) {
      return null;
    }

    try {
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
      const distance = this.calculateBoxDistance(box1, box2);
      
      if (distance <= threshold) {
        // 进行更精确的BVH碰撞检测
        const detailedCollision = this.performDetailedCollisionCheck(mesh1Data, mesh2Data);
        
        if (detailedCollision) {
          return {
            mesh1: mesh1,
            mesh2: mesh2,
            linkName1: mesh1Data.linkName,
            linkName2: mesh2Data.linkName,
            jointName1: mesh1Data.jointName,
            jointName2: mesh2Data.jointName,
            distance: distance,
            severity: distance <= 0 ? 'collision' : 'warning',
            collisionPoints: detailedCollision.points || [],
            timestamp: Date.now()
          };
        }
      }

      return null;
    } catch (error) {
      console.warn('碰撞检测过程中出错:', error);
      return null;
    }
  }

  /**
   * 执行详细的BVH碰撞检测
   * @param {Object} mesh1Data - 第一个网格数据
   * @param {Object} mesh2Data - 第二个网格数据
   * @returns {Object|null} 详细碰撞信息
   */
  performDetailedCollisionCheck(mesh1Data, mesh2Data) {
    const { mesh: mesh1, bvh: bvh1 } = mesh1Data;
    const { mesh: mesh2, bvh: bvh2 } = mesh2Data;

    // 使用射线投射进行更精确的检测
    const raycaster = new THREE.Raycaster();
    const collisionPoints = [];
    
    // 从mesh1的几个关键点向mesh2投射射线
    const vertices1 = mesh1.geometry.attributes.position;
    const sampleCount = Math.min(50, vertices1.count); // 限制采样点数量以提高性能
    const step = Math.floor(vertices1.count / sampleCount);
    
    for (let i = 0; i < vertices1.count; i += step) {
      const vertex = new THREE.Vector3(
        vertices1.getX(i),
        vertices1.getY(i),
        vertices1.getZ(i)
      );
      
      // 转换到世界坐标
      vertex.applyMatrix4(mesh1.matrixWorld);
      
      // 计算向mesh2中心的方向
      const mesh2Center = new THREE.Vector3();
      new THREE.Box3().setFromObject(mesh2).getCenter(mesh2Center);
      
      const direction = mesh2Center.clone().sub(vertex).normalize();
      
      raycaster.set(vertex, direction);
      raycaster.firstHitOnly = true;
      
      // 检测与mesh2的交点
      const intersects = raycaster.intersectObject(mesh2, false);
      if (intersects.length > 0) {
        collisionPoints.push({
          point: intersects[0].point,
          distance: intersects[0].distance,
          face: intersects[0].face
        });
      }
    }

    if (collisionPoints.length > 0) {
      return {
        points: collisionPoints,
        hasCollision: true
      };
    }

    return null;
  }

  /**
   * 更新碰撞可视化
   * @param {Array} collisions - 碰撞结果数组
   */
  updateCollisionVisualization(collisions) {
    // 重置所有网格材质
    this.resetAllMaterials();

    // 应用碰撞高亮
    for (const collision of collisions) {
      const materialType = collision.severity === 'collision' ? 'collision' : 'warning';
      const material = this.collisionMaterials.get(materialType);

      if (material) {
        // 高亮两个碰撞的网格
        if (collision.mesh1) {
          collision.mesh1.material = material;
        }
        if (collision.mesh2) {
          collision.mesh2.material = material;
        }
      }
    }
  }

  /**
   * 重置所有网格材质到原始状态
   */
  resetAllMaterials() {
    this.originalMaterials.forEach((originalMaterial, meshUuid) => {
      // 找到对应的网格并恢复材质
      this.robotBVHs.forEach(robotData => {
        for (const meshData of robotData.meshes) {
          if (meshData.mesh.uuid === meshUuid) {
            meshData.mesh.material = originalMaterial.clone();
            return;
          }
        }
      });
    });
  }

  /**
   * 获取特定机器人的碰撞状态
   * @param {string} robotId - 机器人ID
   * @returns {Object} 碰撞状态信息
   */
  getCollisionStatus(robotId) {
    const collisions = [];
    
    this.collisionResults.forEach((collisionList, key) => {
      if (key.includes(robotId)) {
        collisions.push(...collisionList);
      }
    });

    const hasCollision = collisions.some(c => c.severity === 'collision');
    const hasWarning = collisions.some(c => c.severity === 'warning');

    return {
      hasCollision,
      hasWarning,
      collisionCount: collisions.filter(c => c.severity === 'collision').length,
      warningCount: collisions.filter(c => c.severity === 'warning').length,
      totalCollisions: collisions.length,
      details: collisions
    };
  }

  /**
   * 清理资源
   */
  dispose() {
    // 清理BVH
    this.robotBVHs.forEach(robotData => {
      robotData.meshes.forEach(meshData => {
        if (meshData.mesh.geometry && meshData.mesh.geometry.disposeBoundsTree) {
          meshData.mesh.geometry.disposeBoundsTree();
        }
      });
    });

    // 清理材质
    this.collisionMaterials.forEach(material => {
      material.dispose();
    });

    this.originalMaterials.forEach(material => {
      material.dispose();
    });

    // 清理引用
    this.robotBVHs.clear();
    this.collisionMaterials.clear();
    this.originalMaterials.clear();
    this.collisionResults.clear();
  }

  /**
   * 设置碰撞检测阈值
   * @param {number} threshold - 新的碰撞阈值
   */
  setCollisionThreshold(threshold) {
    this.collisionThreshold = threshold;
  }

  /**
   * 获取当前所有碰撞结果
   * @returns {Array} 所有碰撞结果
   */
  getAllCollisions() {
    const allCollisions = [];
    this.collisionResults.forEach(collisions => {
      allCollisions.push(...collisions);
    });
    return allCollisions;
  }
}

// 导出单例实例
export const robotCollisionUtils = new RobotCollisionUtils();

// 导出工具函数
export const createCollisionDetector = () => new RobotCollisionUtils();

// 导出碰撞检测配置
export const CollisionConfig = {
  defaultThreshold: 0.01, // 默认碰撞阈值 1cm
  warningThreshold: 0.05, // 警告阈值 5cm
  maxSamplePoints: 50, // 最大采样点数
  updateInterval: 100, // 更新间隔 (ms)
}; 