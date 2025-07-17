import React, { useCallback } from 'react';
import { Box } from '@mui/material';
import ArmJointControl from './ArmJointControl';
import config from "../config"; // 引入配置文件
import { color } from 'three/tsl';

const ArmControl = ({
  isInteracting,
  onInteractionChange,
  rosServiceCalling,
  realTimeArmValues,
  plannedArmValues,
  type,
  onControlChange,
  onMoveJSrvCall,
  isOnTeacherMode,
}) => {
  const panelStyles = {
    position: 'absolute',
    top: '36%',  // 控制面板的垂直位置，您可以根据需求调整 35
    zIndex: 10,  // 让 JointControlPanel 浮动在 RobotViewer 上方
    width: '250px',  // 控制面板宽度
    height: 'auto',  // 高度自适应
  };

  if (type === 'L') {
    panelStyles.right = '0';  // 将面板放置在左侧
  } else if (type === 'R') {
    panelStyles.left = '0';  // 将面板放置在右侧
  }
  // 动态加载关节配置
  const jointConfigs =
    type === "L" ? config.armJointLimits.leftArm : config.armJointLimits.rightArm;

  const areJointValuesEqual = useCallback((currentValues, plannedValues) => {
    return Object.keys(plannedValues).every(
      (key) => currentValues[key] === plannedValues[key]
    );
  }, []);

  const callSrvEvent = () => {
    // if (JSON.stringify(realTimeArmValues) !== JSON.stringify(plannedArmValues)){
    if (!areJointValuesEqual(realTimeArmValues, plannedArmValues)) {
      onMoveJSrvCall(plannedArmValues); // 调用 ROS 服务
    }
  };

  return (
    <Box sx={panelStyles}>
      {jointConfigs.map((joint) => (
        <ArmJointControl

          key={joint.name}
          jointName={joint.name}
          minValue={joint.min}
          maxValue={joint.max}
          realTimeValue={realTimeArmValues[joint.name] || 0}
          plannedValue={plannedArmValues[joint.name] || 0}
          rosServiceCalling={rosServiceCalling}
          isInteracting={isInteracting}
          onInteractionChange={onInteractionChange}
          onControlChange={onControlChange}
          callSrvEvent={callSrvEvent}
          isOnTeacherMode={isOnTeacherMode}

        />
      ))}
    </Box>
  );
};

export default ArmControl;
