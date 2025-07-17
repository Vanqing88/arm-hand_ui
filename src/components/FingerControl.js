// FingerControl.js
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Box, Typography, TextField, Dialog, DialogActions, DialogContent, DialogTitle, Button } from '@mui/material';

// 后续的优化可以通过 React.memo 来避免不必要的重新渲染
const FingerControl = ({ 
  jointName,
  minValue = 0,  // 默认最小值
  maxValue = 180, // 默认最大值
  realTimeValue,
  plannedValue,
  rosServiceCalling,
  isInteracting,
  onInteractionChange,
  onControlChange,
  enterEvent,
}) => {
  const [error, setError] = useState(""); // 用于显示错误提示信息
  const [openDialog, setOpenDialog] = useState(false); // 用于控制弹窗的显示和关闭

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
  //   return realTimeValueRef.current === plannedValueRef.current;
  // }, []);

  // 输入框值变更时
  const handleInputChange = (event) => {
    if(!isInteractingRef.current){
      onInteractionChange(true); // 通知父组件开始交互
    }
    const newValue = parseFloat(event.target.value);

    // 判断输入值是否合法并在范围内
    if (!isNaN(newValue)) {
      if (newValue < minValue || newValue > maxValue) {
        // 超出范围，显示错误提示
        setError(`${jointName}'s value is out of the allowed range. Please enter a value between ${minValue} and ${maxValue}.`);
        setOpenDialog(true); // 打开弹窗
      } else {
        // 合法范围内，更新 plannedValue 并通知父组件
        setError("");  // 清除错误提示
        plannedValueRef.current = newValue;
        onControlChange(jointName, newValue);
      }
    }
  };

  // 按下 Enter 键时处理
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !rosServiceCalling) {
      enterEvent(); // 调用父组件中的 enterEvent 方法
    }
    onInteractionChange(false); // 通知父组件结束交互
  };

  // 关闭弹窗
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  return (
    <Box
      mx={0.1}
      flex={1}
      display="flex"
      flexDirection="row"
      alignItems="center"
      sx={{
        backgroundColor: 'rgba(0, 0, 0, 0.1)', // 半透明背景
        borderRadius: '5px', // 圆角矩形
        padding: '1px',
        height: '60px', // 控制整体高度
        width: '80px', // 控制整体高度
      }}
    >
      {/* 左侧：手指名称和输入框 */}
      <Box display="flex" flexDirection="column" justifyContent="space-between" alignItems="center" mx={0.5}>
        <Typography variant="body1" style={{ fontSize: '0.8rem' }}>{jointName}</Typography>
        {/* 调整 TextField 紧凑样式并支持直接修改 */}
        <TextField
          variant="outlined"
          size="small"  // 小尺寸，减小边框
          value={isInteractingRef.current ? plannedValueRef.current : (realTimeValueRef.current).toFixed(0)} 
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={rosServiceCalling} // 禁用输入框交互
          sx={{
            width: '35px',  // 控制宽度，使输入框更紧凑
            '& .MuiOutlinedInput-root': {
              padding: '0', // 去除边框内的padding
              '& fieldset': {
                borderColor: 'rgba(0, 0, 0, 0.3)', // 自定义边框颜色
              },
            },
            '& .MuiInputBase-input': {
              padding: '2px 4px', // 控制文本输入的内边距
              fontSize: '0.875rem', // 控制字体大小
            },
          }}
        />
      </Box>
      
      {/* 弹窗错误提示 */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Error</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{error}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FingerControl;
