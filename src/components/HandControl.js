import React, { useCallback } from 'react';
import { Box } from '@mui/material';
import FingerControl from './FingerControl';
import config from "../config";  // 引入配置文件

const FingerNames = ['thumb_IP', 'thumb_CMC', 'index_MCP', 'middle_MCP', 'ring_MCP', 'little_MCP'];

const HandControl = ({ 
  isInteracting,
  onInteractionChange,
  rosServiceCalling,
  realTimeHandValues,
  plannedHandValues,
  type,
  onControlChange,
  onHandSrvCall
}) => {
  const panelStyles = {
    position: 'absolute',
    top: '1%',  // 控制面板的垂直位置，您可以根据需求调整
    zIndex: 10,  // 让 JointControlPanel 浮动在 RobotViewer 上方
    width: 'auto',  // 控制面板宽度自适应
    height: 'auto',  // 高度自适应
    display: 'flex',  // 使用 flex 布局
    flexDirection: 'row',  // 横向排列
  };

  if (type === 'L') {
    panelStyles.left = '0';  // 将面板放置在左侧
  } else if (type === 'R') {
    panelStyles.right = '0';  // 将面板放置在右侧
  }

  // 动态加载左右手的关节配置
  const jointConfigs = type === 'L' 
    ? config.handJointLimits.leftHand 
    : config.handJointLimits.rightHand;

  const areJointValuesEqual = useCallback((currentValues, plannedValues) => {
    return Object.keys(plannedValues).every(
      (key) => currentValues[key] === plannedValues[key]
    );
  }, []);

  // 检查实时值和规划值是否不同，如果不同则调用ROS服务
  const enterEvent = () => {
    // if (JSON.stringify(realTimeHandValues) !== JSON.stringify(plannedHandValues)){
    if (!areJointValuesEqual(realTimeHandValues, plannedHandValues)){
      onHandSrvCall(plannedHandValues); // 调用 ROS 服务
    }
  };

  return (
    <Box sx={panelStyles}>
      {FingerNames.map((fingerName) => {
        const jointConfig = jointConfigs.find(joint => joint.name === fingerName); // 获取每个手指的配置
  
        if (!jointConfig) return null; // 如果没有对应的关节配置，则跳过
  
        return (
          <FingerControl
            key={fingerName}
            jointName={fingerName} // 手指关节名称
            minValue={jointConfig.min} // 获取最小值
            maxValue={jointConfig.max} // 获取最大值
            realTimeValue={realTimeHandValues[fingerName] || 0} // 默认值为 0，避免 undefined
            plannedValue={plannedHandValues[fingerName] || 0} // 默认值为 0，避免 undefined
            rosServiceCalling={rosServiceCalling}
            isInteracting={isInteracting}
            onInteractionChange={onInteractionChange}
            onControlChange={onControlChange}
            enterEvent={enterEvent}
          />
        );
      })}
    </Box>
  );
};

export default HandControl;
