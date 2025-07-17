import React, { useRef, useEffect,useCallback,useState} from 'react';
import { Box, Typography, Slider } from '@mui/material';

const ArmJointControl = ({
  jointName,
  minValue,
  maxValue,
  realTimeValue,
  plannedValue,
  rosServiceCalling,
  isInteracting,
  onInteractionChange,
  isOnTeacherMode,
  onControlChange,
  callSrvEvent
}) => {

  // 保存isInteracting状态，不用管；异步needs，为了事件函数中拿到最新状态而同步 ref 
  const isInteractingRef = useRef(isInteracting);
  useEffect(() => {
    isInteractingRef.current = isInteracting; // 保存isInteracting状态
    }, [isInteracting]);

  const realTimeValueRef = useRef(realTimeValue); 
  const plannedValueRef = useRef(plannedValue);
  useEffect(() => {
    realTimeValueRef.current = realTimeValue; // 每次 realTimeValue 改变时更新 ref
  }, [realTimeValue]);
  useEffect(() => {
    plannedValueRef.current = plannedValue; // 每次 plannedValue 改变时更新 ref
  }, [plannedValue]);
  // const areJointValueEqual = useCallback(() => {
  //   return realTimeValueRef.current === plannedValueRef.current;;
  // }, []);

  // 滑块值变化时触发
  const handleSliderChange = (event, newValue) => {
    // if(!isInteractingRef.current){
    //   onInteractionChange(true); // 通知父组件开始交互
    // }
    plannedValueRef.current = newValue;
    onControlChange(jointName, newValue); // 通知父组件更新规划值
  };

  const handleSliderChangeStart = (event, newValue) => {
    if(!isInteractingRef.current){
      onInteractionChange(true); // 通知父组件开始交互
    }
  };

  // 滑块释放时结束交互
  const handleSliderChangeCommitted = () => {
    if(!rosServiceCalling){
      callSrvEvent(); // 通知 ros 节点移动
    }
    onInteractionChange(false); // 通知父组件结束交互
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      m={1}
      sx={{
        backgroundColor: 'rgba(0, 0, 0, 0.05)', // 半透明背景
        borderRadius: '2px',
        padding: '2px', ////10->5
      }}
    >
      <Typography variant="body2" style={{ fontSize: '0.8rem', marginBottom: '7px' }}>
        {jointName}:  {realTimeValue.toFixed(3)}
      </Typography>
      <Slider
        value={isInteractingRef.current? plannedValueRef.current : realTimeValueRef.current} 
        min={minValue}
        max={maxValue}
        step={0.01} // 调整步长（可根据需要调整）
        onChange={handleSliderChange}
        onMouseDown={handleSliderChangeStart}
        onTouchStart={handleSliderChangeStart}
        onChangeCommitted={handleSliderChangeCommitted}
        disabled={isOnTeacherMode} // 禁用滑块交互
        sx={{
          width: '90%', // 滑块宽度
          '& .MuiSlider-thumb': { height: 10, width: 12 }, // 调整滑块样式
        }}
      />
    </Box>
  );
};

export default ArmJointControl;
