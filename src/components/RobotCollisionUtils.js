import * as THREE from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
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
          
          // 验证BVH构建是否成功
          if (!child.geometry.boundsTree) {
            console.warn(`BVH构建失败: ${child.name}`);
            return; // 跳过这个网格
          }
          
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
      console.warn('BVH数据缺失，回退到AABB检测');
      return this.fallbackAABBCollisionCheck(mesh1Data, mesh2Data, threshold);
    }

    try {
      // 更新世界矩阵
      mesh1.updateMatrixWorld(true);
      mesh2.updateMatrixWorld(true);

      // 首先进行快速AABB预检测
      const box1 = new THREE.Box3().setFromObject(mesh1);
      const box2 = new THREE.Box3().setFromObject(mesh2);

      // 如果AABB都不相交，则肯定不会有精确碰撞
      if (!box1.intersectsBox(box2)) {
        return null;
      }

      // 计算变换矩阵：从mesh2坐标系到mesh1坐标系
      const inverseMatrix1 = mesh1.matrixWorld.clone().invert();
      const transformMatrix = mesh2.matrixWorld.clone().premultiply(inverseMatrix1);

      // 使用BVH间直接碰撞检测
      const hasDirectCollision = bvh1.intersectsGeometry(mesh2.geometry, transformMatrix);
      
      if (hasDirectCollision) {
        
        return {
          mesh1: mesh1,
          mesh2: mesh2,
          linkName1: mesh1Data.linkName,
          linkName2: mesh2Data.linkName,
          jointName1: mesh1Data.jointName,
          jointName2: mesh2Data.jointName,
          detectionMethod: 'BVH_DIRECT',
          timestamp: Date.now()
        };
      }

      return null;
    } catch (error) {
      console.warn('BVH碰撞检测过程中出错，回退到AABB检测:', error);
      return this.fallbackAABBCollisionCheck(mesh1Data, mesh2Data, threshold);
    }
  }

  /**
   * AABB回退碰撞检测方法
   * @param {Object} mesh1Data - 第一个网格数据
   * @param {Object} mesh2Data - 第二个网格数据
   * @param {number} threshold - 碰撞阈值
   * @returns {Object|null} 碰撞结果或null
   */
  fallbackAABBCollisionCheck(mesh1Data, mesh2Data, threshold) {
    const { mesh: mesh1 } = mesh1Data;
    const { mesh: mesh2 } = mesh2Data;

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
      
      return {
        mesh1: mesh1,
        mesh2: mesh2,
        linkName1: mesh1Data.linkName,
        linkName2: mesh2Data.linkName,
        jointName1: mesh1Data.jointName,
        jointName2: mesh2Data.jointName,
        detectionMethod: 'AABB_FALLBACK',
        timestamp: Date.now()
      };

    } catch (error) {
      console.warn('AABB回退检测也失败:', error);
      return null;
    }
  }

  /**
   * 执行高级BVH碰撞检测（使用shapecast）
   * @param {Object} mesh1Data - 第一个网格数据
   * @param {Object} mesh2Data - 第二个网格数据
   * @param {number} threshold - 距离阈值
   * @returns {Object|null} 详细碰撞信息
   */
  performAdvancedBVHCollisionCheck(mesh1Data, mesh2Data, threshold = 0.01) {
    const { mesh: mesh1, bvh: bvh1 } = mesh1Data;
    const { mesh: mesh2, bvh: bvh2 } = mesh2Data;

    if (!bvh1 || !bvh2) {
      return null;
    }

    try {
      // 更新世界矩阵
      mesh1.updateMatrixWorld(true);
      mesh2.updateMatrixWorld(true);

      const collisionInfo = {
        hasCollision: false,
        minDistance: Infinity,
        collisionPoints: [],
        trianglePairs: []
      };

      // 计算变换矩阵
      const inverseMatrix1 = mesh1.matrixWorld.clone().invert();
      const transformMatrix = mesh2.matrixWorld.clone().premultiply(inverseMatrix1);
      
      // 将mesh2的三角形变换到mesh1的坐标系
      const mesh2Triangles = [];
      const positionAttribute = mesh2.geometry.attributes.position;
      const indexAttribute = mesh2.geometry.index;
      
      if (indexAttribute) {
        for (let i = 0; i < indexAttribute.count; i += 3) {
          const a = indexAttribute.getX(i);
          const b = indexAttribute.getX(i + 1);
          const c = indexAttribute.getX(i + 2);
          
          const triangle = new THREE.Triangle(
            new THREE.Vector3().fromBufferAttribute(positionAttribute, a).applyMatrix4(transformMatrix),
            new THREE.Vector3().fromBufferAttribute(positionAttribute, b).applyMatrix4(transformMatrix),
            new THREE.Vector3().fromBufferAttribute(positionAttribute, c).applyMatrix4(transformMatrix)
          );
          
          mesh2Triangles.push({ triangle, index: i / 3 });
        }
      }

      // 使用shapecast进行自定义碰撞检测
      bvh1.shapecast({
        intersectsBounds: (box, isLeaf, score, depth, nodeIndex) => {
          // 检查边界框是否与mesh2的任何三角形相交或接近
          for (const { triangle } of mesh2Triangles) {
            if (this.triangleIntersectsBox(triangle, box, threshold)) {
              return true;
            }
          }
          return false;
        },
        
        intersectsTriangle: (triangle1, triangleIndex1) => {
          // 检查mesh1的三角形与mesh2的所有三角形
          for (const { triangle: triangle2, index: triangleIndex2 } of mesh2Triangles) {
            const distance = this.calculateTriangleDistance(triangle1, triangle2);
            
            if (distance <= threshold) {
              collisionInfo.hasCollision = true;
              collisionInfo.minDistance = Math.min(collisionInfo.minDistance, distance);
              
              collisionInfo.trianglePairs.push({
                triangle1Index: triangleIndex1,
                triangle2Index: triangleIndex2,
                distance: distance
              });
              
              // 计算接触点
              const contactPoint = this.calculateContactPoint(triangle1, triangle2);
              if (contactPoint) {
                collisionInfo.collisionPoints.push(contactPoint);
              }
              
              return true;
            }
          }
          return false;
        }
      });

      return collisionInfo.hasCollision ? collisionInfo : null;
    } catch (error) {
      console.warn('高级BVH碰撞检测失败:', error);
      return null;
    }
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
          collision.mesh1.material = material.clone();
        }
        if (collision.mesh2) {
          collision.mesh2.material = material.clone();
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
   * 检查三角形是否与包围盒相交或接近
   * @param {THREE.Triangle} triangle - 三角形
   * @param {THREE.Box3} box - 包围盒
   * @param {number} threshold - 距离阈值
   * @returns {boolean} 是否相交或接近
   */
  triangleIntersectsBox(triangle, box, threshold = 0) {
    try {
      // 检查三角形是否与包围盒相交
      if (box.intersectsTriangle(triangle)) {
        return true;
      }
      
      // 如果有阈值，检查距离是否在阈值范围内
      if (threshold > 0) {
        const center = new THREE.Vector3();
        box.getCenter(center);
        
        const closestPoint = new THREE.Vector3();
        triangle.closestPointToPoint(center, closestPoint);
        
        const distance = closestPoint.distanceTo(center);
        return distance <= threshold;
      }
      
      return false;
    } catch (error) {
      console.warn('三角形与包围盒相交检测失败:', error);
      return false;
    }
  }

  /**
   * 计算两个三角形之间的最小距离
   * @param {THREE.Triangle} triangle1 - 第一个三角形
   * @param {THREE.Triangle} triangle2 - 第二个三角形
   * @returns {number} 最小距离
   */
  calculateTriangleDistance(triangle1, triangle2) {
    try {
      // 检查三角形是否相交
      const intersectionPoints = [];
      
      // 检查边与三角形的交点
      const edges1 = [
        [triangle1.a, triangle1.b],
        [triangle1.b, triangle1.c],
        [triangle1.c, triangle1.a]
      ];
      
      for (const [start, end] of edges1) {
        const line = new THREE.Line3(start, end);
        const intersection = new THREE.Vector3();
        
        if (triangle2.intersectsLine(line, intersection)) {
          intersectionPoints.push(intersection);
        }
      }
      
      // 如果有交点，距离为0
      if (intersectionPoints.length > 0) {
        return 0;
      }
      
      // 计算所有顶点到对方三角形的最小距离
      const points1 = [triangle1.a, triangle1.b, triangle1.c];
      const points2 = [triangle2.a, triangle2.b, triangle2.c];
      
      let minDistance = Infinity;
      
      // 计算triangle1顶点到triangle2的距离
      for (const point of points1) {
        const closestPoint = new THREE.Vector3();
        triangle2.closestPointToPoint(point, closestPoint);
        const distance = point.distanceTo(closestPoint);
        minDistance = Math.min(minDistance, distance);
      }
      
      // 计算triangle2顶点到triangle1的距离
      for (const point of points2) {
        const closestPoint = new THREE.Vector3();
        triangle1.closestPointToPoint(point, closestPoint);
        const distance = point.distanceTo(closestPoint);
        minDistance = Math.min(minDistance, distance);
      }
      
      return minDistance;
    } catch (error) {
      console.warn('三角形距离计算失败:', error);
      return Infinity;
    }
  }

  /**
   * 计算两个三角形的接触点
   * @param {THREE.Triangle} triangle1 - 第一个三角形
   * @param {THREE.Triangle} triangle2 - 第二个三角形
   * @returns {THREE.Vector3|null} 接触点或null
   */
  calculateContactPoint(triangle1, triangle2) {
    try {
      // 检查边与三角形的交点
      const edges1 = [
        [triangle1.a, triangle1.b],
        [triangle1.b, triangle1.c],
        [triangle1.c, triangle1.a]
      ];
      
      for (const [start, end] of edges1) {
        const line = new THREE.Line3(start, end);
        const intersection = new THREE.Vector3();
        
        if (triangle2.intersectsLine(line, intersection)) {
          return intersection;
        }
      }
      
      // 如果没有直接交点，返回最近点对的中点
      const center1 = new THREE.Vector3()
        .addVectors(triangle1.a, triangle1.b)
        .add(triangle1.c)
        .divideScalar(3);
        
      const closestPoint = new THREE.Vector3();
      triangle2.closestPointToPoint(center1, closestPoint);
      
      return center1.add(closestPoint).divideScalar(2);
    } catch (error) {
      console.warn('接触点计算失败:', error);
      return null;
    }
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

  /**
   * 获取BVH统计信息
   * @returns {Object} BVH统计信息
   */
  getBVHStats() {
    const stats = {
      totalRobots: this.robotBVHs.size,
      totalMeshes: 0,
      robotStats: {}
    };

    this.robotBVHs.forEach((robotData, robotId) => {
      const meshCount = robotData.meshes.length;
      const bvhMeshCount = robotData.meshes.filter(m => m.bvh).length;
      
      stats.totalMeshes += meshCount;
      stats.robotStats[robotId] = {
        totalMeshes: meshCount,
        bvhMeshes: bvhMeshCount,
        bvhCoverage: meshCount > 0 ? (bvhMeshCount / meshCount * 100).toFixed(1) + '%' : '0%'
      };
    });

    return stats;
  }

  /**
   * 验证BVH数据完整性
   * @param {string} robotId - 机器人ID
   * @returns {Object} 验证结果
   */
  validateBVHData(robotId) {
    const robotData = this.robotBVHs.get(robotId);
    
    if (!robotData) {
      return {
        isValid: false,
        error: `未找到机器人 ${robotId} 的BVH数据`
      };
    }

    const validation = {
      isValid: true,
      totalMeshes: robotData.meshes.length,
      validBVHs: 0,
      invalidBVHs: [],
      missingGeometry: [],
      errors: []
    };

    for (const meshData of robotData.meshes) {
      try {
        if (!meshData.mesh) {
          validation.errors.push('网格对象为空');
          continue;
        }

        if (!meshData.mesh.geometry) {
          validation.missingGeometry.push(meshData.linkName || 'unknown');
          continue;
        }

        if (!meshData.bvh) {
          validation.invalidBVHs.push(meshData.linkName || 'unknown');
          continue;
        }

        validation.validBVHs++;
      } catch (error) {
        validation.errors.push(`验证网格 ${meshData.linkName} 时出错: ${error.message}`);
      }
    }

    validation.isValid = validation.errors.length === 0 && 
                        validation.invalidBVHs.length === 0 && 
                        validation.missingGeometry.length === 0;

    return validation;
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