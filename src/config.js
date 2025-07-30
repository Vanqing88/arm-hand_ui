const config = {

    // ROSBridge 配置
    rosbridge: {
        ROS_HOST: '172.16.11.238',
        ROS_PORT: 9090,
        reconnectionInterval: 5000, // 心跳时间，单位毫秒
    },



    // 模型坐标-RobotArmTarget下发至终端模型设置
    handTargetJointLimits: {
        leftHand: [
            { name: "X Position_L", key: "x", id: "x", min: -1.000, max: 1.000},
            { name: "Y Position_L", key: "y", id: "y", min: -1.000, max: 1.000},
            { name: "Z Position_L", key: "z", id: "z", min: -1.000, max: 1.000},
            { name: "X Rotation_L", key: "xR", id: "xR", min: -180, max: 180},
            { name: "Y Rotation_L", key: "yR", id: "yR", min: -180, max: 180},
            { name: "Z Rotation_L", key: "zR", id: "zR", min: -180, max: 180},
          ],
        rightHand: [
            { name: "X Position_R", key: "x", id: "x", min: -1.000, max: 1.000 },
            { name: "Y Position_R", key: "y", id: "y", min: -1.000, max: 1.000 },
            { name: "Z Position_R", key: "z", id: "z", min: -1.000, max: 1.000 },
            { name: "X Rotation_R", key: "xR", id: "xR", min: -180, max: 180 },
            { name: "Y Rotation_R", key: "yR", id: "yR", min: -180, max: 180 },
            { name: "Z Rotation_R", key: "zR", id: "zR", min: -180, max: 180 },
          ],
    },

    // 末端控制步长设置 - RobotArmTarget
    handTargetStepConfig: {
        position: {
            default: 0.003,    // 位置坐标默认步长
            min: 0.001,        // 最小步长
            max: 0.01,         // 最大步长
            step: 0.001        // 步长调整精度
        },
        orientation: {
            default: 15,       // 姿态角度默认步长（度）
            min: 1,            // 最小步长（度）
            max: 45,           // 最大步长（度）
            step: 1            // 步长调整精度（度）
        }
    },


    // 双臂关节限位设置 - ArmControl
    armJointLimits: {
        leftArm: [
            { name: "Shoulder_Y_L", min: -165.64, max: 64.36 },
            { name: "Shoulder_X_L", min: 0, max: 119.22 },
            { name: "Shoulder_Z_L", min: -120.03, max: 120.03 },
            { name: "Elbow_L", min: -82.82, max: 0 },
            { name: "Wrist_Z_L", min: -156.15, max: 156.15 },
            { name: "Wrist_Y_L", min: -45.89, max: 45.89 },
            { name: "Wrist_X_L", min: -82.82, max: 45.89 },
        ],
        rightArm: [
            { name: "Shoulder_Y_R", min: -165.64, max: 64.36 },
            { name: "Shoulder_X_R", min: -119.22, max: 0 },
            { name: "Shoulder_Z_R", min: -120.03, max: 120.03 },
            { name: "Elbow_R", min: -82.82, max: 0 },
            { name: "Wrist_Z_R", min: -156.15, max: 156.15 },
            { name: "Wrist_Y_R", min: -45.89, max: 45.89 },
            { name: "Wrist_X_R", min: -45.89, max: 82.82 },
        ],
    },  

    // 双臂实时状态与规划状态同步设置
    armSyncInterval: 10, // 单位毫秒

    // 双手关节限位设置 - HandControl
    handJointLimits: {
        leftHand: [
            { name: "thumb_CMC", min: -57.2958, max: 85.9437 },
            { name: "thumb_IP", min: 0, max: 57.2958 },
            { name: "index_MCP", min: 0, max: 85.9437 },
            { name: "middle_MCP", min: 0, max: 85.9437 },
            { name: "ring_MCP", min: 0, max: 85.9437 },
            { name: "little_MCP", min: 0, max: 85.9437 },
        ],
        rightHand: [
            { name: "thumb_CMC", min: -57.2958, max: 85.9437 },
            { name: "thumb_IP", min: 0, max: 57.2958 },
            { name: "index_MCP", min: 0, max: 85.9437 },
            { name: "middle_MCP", min: 0, max: 85.9437 },
            { name: "ring_MCP", min: 0, max: 85.9437 },
            { name: "little_MCP", min: 0, max: 85.9437 },
        ],  
    },

    // 双手实时状态与规划状态同步设置
    handSyncInterval: 10, // 单位毫秒

    // 碰撞检测配置
    collisionDetection: {
        // 基本设置
        enabled: true,                    // 是否启用碰撞检测
        threshold: 1,                  // 碰撞检测阈值（米）
        detectionInterval: 100,           // 检测间隔（毫秒）
        
        // 优先级设置
        priorities: {
            high: {
                threshold: 0.01,          // 高优先级碰撞阈值
                color: 0xe74c3c,          // 红色
                description: '手臂交叉、关键碰撞'
            },
            medium: {
                threshold: 0.015,         // 中优先级碰撞阈值
                color: 0xf39c12,          // 橙色
                description: '头部碰撞、腿部交叉'
            },
            low: {
                threshold: 0.02,          // 低优先级碰撞阈值
                color: 0x27ae60,          // 绿色
                description: '手臂与腿部碰撞'
            }
        },

        // 碰撞检测对配置
        collisionPairs: [
            // 左臂与右臂（手臂交叉碰撞）
            { part1: 'leftArm', part2: 'rightArm', priority: 'high' },
            
            // 左臂与头部（手臂与头部碰撞）
            { part1: 'leftArm', part2: 'head', priority: 'medium' },
            { part1: 'leftArm', part2: 'torso', priority: 'medium' },
            
            // 右臂与头部（手臂与头部碰撞）
            { part1: 'rightArm', part2: 'head', priority: 'medium' },
            { part1: 'rightArm', part2: 'torso', priority: 'medium' },
            
            // 腿部之间的碰撞
            { part1: 'leftLeg', part2: 'rightLeg', priority: 'medium' },
            
            // 手臂与腿部（手臂下垂时可能碰撞）
            { part1: 'leftArm', part2: 'leftLeg', priority: 'low' },
            { part1: 'leftArm', part2: 'rightLeg', priority: 'low' },
            { part1: 'rightArm', part2: 'leftLeg', priority: 'low' },
            { part1: 'rightArm', part2: 'rightLeg', priority: 'low' },
        ],

        // 默认相连的部件（排除这些碰撞检测）
        connectedParts: [
            // 躯干与肩胛骨（默认相连）
            ['TORSO', 'SCAPULA_L'],
            ['TORSO', 'SCAPULA_R'],
            ['SACRUM', 'SCAPULA_L'],
            ['SACRUM', 'SCAPULA_R'],
            
            // 肩胛骨与肩关节（默认相连）
            ['SCAPULA_L', 'SHOULDER_L'],
            ['SCAPULA_R', 'SHOULDER_R'],
            
            // 躯干与肩关节（默认相连）
            ['TORSO', 'SHOULDER_L'],
            ['TORSO', 'SHOULDER_R'],
            
            // 肩关节与上臂（默认相连）
            ['SHOULDER_L', 'UPPERARM_L'],
            ['SHOULDER_R', 'UPPERARM_R'],
            
            // 上臂与前臂（默认相连）
            ['UPPERARM_L', 'FOREARM_L'],
            ['UPPERARM_R', 'FOREARM_R'],
            
            // 前臂与手腕（默认相连）
            ['FOREARM_L', 'WRIST_REVOLUTE_L'],
            ['FOREARM_R', 'WRIST_REVOLUTE_R'],
            ['FOREARM_L', 'WRIST_UPDOWN_L'],
            ['FOREARM_R', 'WRIST_UPDOWN_R'],
            
            // 手腕与手（默认相连）
            ['WRIST_REVOLUTE_L', 'HAND_L'],
            ['WRIST_REVOLUTE_R', 'HAND_R'],
            ['WRIST_UPDOWN_L', 'HAND_L'],
            ['WRIST_UPDOWN_R', 'HAND_R'],
            
            // 躯干与头部（默认相连）
            ['TORSO', 'HEAD'],
            ['TORSO', 'NECK'],
            ['NECK', 'HEAD'],
            
            // 躯干与腿部（默认相连）
            ['SACRUM', 'ILIUM_L'],
            ['SACRUM', 'ILIUM_R'],
            ['TORSO', 'ILIUM_L'],
            ['TORSO', 'ILIUM_R'],
            
            // 腿部关节（默认相连）
            ['ILIUM_L', 'THIGH_L'],
            ['ILIUM_R', 'THIGH_R'],
            ['THIGH_L', 'SHANK_L'],
            ['THIGH_R', 'SHANK_R'],
            ['SHANK_L', 'ASTRAGALUS_L'],
            ['SHANK_R', 'ASTRAGALUS_R'],
            ['ASTRAGALUS_L', 'FOOT_L'],
            ['ASTRAGALUS_R', 'FOOT_R'],
            ['FOOT_L', 'TIPTOE_Z_L'],
            ['FOOT_R', 'TIPTOE_Z_R']
        ],

        // 身体部件定义
        bodyParts: {
            torso: ['SACRUM', 'TORSO'],
            head: ['HEAD', 'NECK'],
            leftArm: ['SCAPULA_L', 'SHOULDER_L', 'UPPERARM_L', 'FOREARM_L', 'WRIST_REVOLUTE_L', 'WRIST_UPDOWN_L', 'HAND_L'],
            rightArm: ['SCAPULA_R', 'SHOULDER_R', 'UPPERARM_R', 'FOREARM_R', 'WRIST_REVOLUTE_R', 'WRIST_UPDOWN_R', 'HAND_R'],
            leftLeg: ['ILIUM_L', 'THIGH_L', 'SHANK_L', 'ASTRAGALUS_L', 'FOOT_L', 'TIPTOE_Z_L'],
            rightLeg: ['ILIUM_R', 'THIGH_R', 'SHANK_R', 'ASTRAGALUS_R', 'FOOT_R', 'TIPTOE_Z_R']
        },

        // 可视化设置
        visualization: {
            collisionColor: 0x0080ff,     // 碰撞高亮颜色（蓝色）
            emissiveIntensity: 0.3,       // 发光强度
            transparent: false,           // 是否透明
            opacity: 1.0                  // 不透明度
        },

        // 性能设置
        performance: {
            maxSamplePoints: 50,          // 最大采样点数
            enableBVH: true,              // 是否启用BVH加速
            enableDeduplication: true,    // 是否启用去重
            enableGrouping: true          // 是否启用分组显示
        }
    }
};    

export default config;
