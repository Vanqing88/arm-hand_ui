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
};    

export default config;
