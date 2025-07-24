// App.js - 统一风格的机器人控制界面
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ROSLIB from "roslib";
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, Typography } from '@mui/material';
import HandControl from './components/HandControl';
import RobotViewer from './components/RobotViewer';
import HandViewer from './components/HandViewer';
import ArmControl from './components/ArmControl';
import ActionButtons from './components/ActionButtons';
import RobotArmTarget from './components/RobotArmTarget';
import Teacher from './components/Teacher';
import config from "./config";
import { Quaternion, Euler } from 'three';
import * as THREE from 'three';

// 状态指示器组件
const StatusIndicator = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
      case 'normal':
        return '#27ae60'; // 绿色
      case 'disconnected':
      case 'error':
      case 'detected':
        return '#e74c3c'; // 红色
      case 'warning':
        return '#f39c12'; // 橙色
      case 'info':
        return '#3498db'; // 蓝色
      case 'none':
      default:
        return '#95a5a6'; // 灰色
    }
  };

  return (
    <div style={{
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: getStatusColor(),
      transition: 'background-color 0.3s ease',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
    }} />
  );
};

// 状态文本组件
const StatusText = ({ text, status }) => {
  return (
    <span style={{
      fontSize: '14px',
      fontWeight: 500,
      color: '#2c3e50',
      transition: 'color 0.3s ease'
    }}>
      {text}
    </span>
  );
};

// 状态面板组件
const StatusPanel = ({ isConnected, errorMessage, robotState, robotStateInfo }) => {
  // 根据机器人状态映射到显示文本和状态类型
  const getRobotStateDisplay = () => {
    switch (robotState) {
      case 0: return { text: "未初始化", status: "none" };
      case 1: return { text: "配置中", status: "warning" };
      case 2: return { text: "已开启", status: "info" };
      case 3: return { text: "启动中", status: "warning" };
      case 4: return { text: "初始化中", status: "warning" };
      case 5: return { text: "运行中", status: "normal" };
      case 6: return { text: "暂停", status: "warning" };
      case 7: return { text: "软急停", status: "error" };
      case 8: return { text: "关机", status: "none" };
      case 9: return { text: "错误", status: "error" };
      default: return { text: robotStateInfo || "未知状态", status: "none" };
    }
  };

  const robotStateDisplay = getRobotStateDisplay();

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: '100%',
      height: '60px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 20px',
      boxSizing: 'border-box',
      zIndex: 1000,
      borderTop: '1px solid rgba(0, 0, 0, 0.1)'
    }}>
      {/* ROSBridge连接状态 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flex: 1,
        justifyContent: 'center'
      }}>
        <StatusIndicator status={isConnected ? 'connected' : 'disconnected'} />
        <StatusText 
          text={isConnected ? 'ROSBridge已连接' : (errorMessage || 'ROSBridge未连接')} 
          status={isConnected ? 'connected' : 'disconnected'} 
        />
      </div>

      {/* 机器人系统状态 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flex: 1,
        justifyContent: 'center'
      }}>
        <StatusIndicator status={robotStateDisplay.status} />
        <StatusText text={robotStateDisplay.text} status={robotStateDisplay.status} />
      </div>

      {/* 奇点状态（预留） */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flex: 1,
        justifyContent: 'center'
      }}>
        <StatusIndicator status="none" />
        <StatusText text="奇点" status="none" />
      </div>
    </div>
  );
};

// 预设动作按钮组件 - 统一风格的设计
const PresetActionButton = ({ 
  index, 
  onClick, 
  onPress, 
  onRelease,
  isActive, 
  disabled,
  children 
}) => {
  return (
    <button
      onClick={onClick}
      onMouseDown={onPress}
      onMouseUp={onRelease}
      onMouseLeave={onRelease}
      onTouchStart={onPress}
      onTouchEnd={onRelease}
      disabled={disabled}
      style={{
        width: '80px',
        height: '80px',
        fontSize: '12px',
        fontWeight: 'bold',
        border: 'none',
        borderRadius: '10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: isActive ? '#27ae60' : '#3498db',
        color: 'white',
        transition: 'all 0.3s ease',
        opacity: disabled ? 0.6 : 1,
        boxShadow: isActive ? '0 4px 8px rgba(39, 174, 96, 0.3)' : '0 2px 4px rgba(52, 152, 219, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px'
      }}
    >
      {children}
    </button>
  );
};

// 预设动作控制面板组件
const PresetActionPanel = ({ 
  actions, 
  rosServiceCalling, 
  onPresetAction, 
  onPresetActionPress, 
  onPresetActionRelease 
}) => {
  const handleActionClick = (actionId) => {
    if (!rosServiceCalling) {
      onPresetAction(actionId);
    }
  };

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '10px',
      padding: '20px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: '100%',
      maxWidth: '400px',
    }}>
      {/* 统一的标题栏 - 与其他控制面板保持一致 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '2px solid #3498db',
        paddingBottom: '10px'
      }}>
        <h3 style={{
          margin: 0,
          color: '#2c3e50',
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          预设动作控制
        </h3>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: rosServiceCalling ? '#e74c3c' : '#27ae60'
        }} />
      </div>

      {/* 预设动作按钮网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {actions.map((action) => (
          <PresetActionButton
            key={action.id}
            index={action.id}
            onClick={() => handleActionClick(action.id)}
            onPress={() => onPresetActionPress(action.id)}
            onRelease={onPresetActionRelease}
            disabled={rosServiceCalling}
            isActive={false}
          >
            <span style={{ fontSize: '14px' }}>{action.name}</span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>{action.description}</span>
          </PresetActionButton>
        ))}
      </div>

      {/* 状态提示区域 */}
      <div style={{
        marginTop: '15px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#7f8c8d'
      }}>
        {rosServiceCalling && '正在执行预设动作...'}
        {!rosServiceCalling && '点击按钮执行预设动作'}
      </div>

      {/* 安全提示区域 */}
      <div style={{
        marginTop: '12px',
        padding: '8px 12px',
        backgroundColor: 'rgba(241, 196, 15, 0.1)',
        border: '1px solid rgba(241, 196, 15, 0.3)',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#f39c12',
        textAlign: 'center'
      }}>
        ⚠️ 执行预设动作前请确认机器人周围安全
      </div>
    </div>
  );
};

// 手掌滑块控制组件 - 提供精确的手指关节控制
const HandSliderControl = ({ 
  isInteracting, 
  onInteractionChange, 
  rosServiceCalling, 
  realTimeHandValues, 
  plannedHandValues, 
  type, 
  onControlChange, 
  onHandSrvCall 
}) => {
  // 添加错误处理状态
  const [error, setError] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  
  // 从config中获取手掌关节配置并映射为组件需要的格式
  const getHandJointConfig = () => {
    const handLimits = type === 'L' ? config.handJointLimits.leftHand : config.handJointLimits.rightHand;
    const jointLabels = {
      'thumb_IP': '拇指指间关节',
      'thumb_CMC': '拇指掌指关节', 
      'index_MCP': '食指掌指关节',
      'middle_MCP': '中指掌指关节',
      'ring_MCP': '无名指掌指关节',
      'little_MCP': '小指掌指关节'
    };
    
    const jointConfig = {};
    handLimits.forEach(joint => {
      jointConfig[joint.name] = {
        label: jointLabels[joint.name] || joint.name,
        min: joint.min,
        max: joint.max
      };
    });
    
    return jointConfig;
  };
  
  const jointConfig = getHandJointConfig();

  // 输入验证函数
  const validateInput = (value, jointName, minValue, maxValue) => {
    // 空值检查
    if (value === '' || value === null || value === undefined) {
      return {
        isValid: false,
        error: "请输入一个数值。",
        type: "empty"
      };
    }
    
    const newValue = parseFloat(value);
    
    // 数值格式检查
    if (isNaN(newValue)) {
      return {
        isValid: false,
        error: "请输入有效的数字，不能包含字母或特殊字符。",
        type: "format"
      };
    }
    
    // 范围检查
    if (newValue < minValue || newValue > maxValue) {
      return {
        isValid: false,
        error: `${jointName}的值超出允许范围。请输入 ${minValue.toFixed(1)} 到 ${maxValue.toFixed(1)} 之间的值。`,
        type: "range"
      };
    }
    
    // 精度检查（可选，限制小数位数）
    // 对于箭头操作产生的数值，先进行四舍五入到一位小数
    const roundedValue = Math.round(newValue * 10) / 10;
    const decimalPlaces = (roundedValue.toString().split('.')[1] || '').length;
    if (decimalPlaces > 1) {
      return {
        isValid: false,
        error: "请输入最多一位小数的数值。",
        type: "precision"
      };
    }
    
    // 使用四舍五入后的值
    const finalValue = roundedValue;
    
    return {
      isValid: true,
      value: finalValue,
      error: "",
      type: "valid"
    };
  };

  // 显示错误弹窗
  const showErrorDialog = (errorMessage) => {
    setError(errorMessage);
    setOpenDialog(true);
  };

  // 关闭错误弹窗
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // 显示成功提示
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    // 3秒后自动隐藏
    setTimeout(() => {
      setShowSuccess(false);
      setSuccessMessage("");
    }, 3000);
  };

  // 输入框值变更处理
  const handleInputChange = (event, jointName, config) => {
    const validation = validateInput(event.target.value, jointName, config.min, config.max);
    
    if (validation.isValid) {
      onControlChange(jointName, validation.value);
      if (!isInteracting) {
        onInteractionChange(true);
      }
      // 显示成功提示
      showSuccessMessage(`${jointName}已设置为 ${validation.value.toFixed(1)}°`);
    } else {
      showErrorDialog(validation.error);
    }
  };

  // Enter键确认处理
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !rosServiceCalling) {
      executeHandMovement();
    }
  };

  const handleSliderChange = (jointName, value) => {
    onControlChange(jointName, parseFloat(value));
    if (!isInteracting) {
      onInteractionChange(true);
    }
  };

  const executeHandMovement = () => {
    onHandSrvCall(plannedHandValues);
    onInteractionChange(false);
  };

  const resetToRealTimeValues = () => {
    Object.keys(jointConfig).forEach(jointName => {
      onControlChange(jointName, realTimeHandValues[jointName] || 0);
    });
    onInteractionChange(false);
  };

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '10px',
      padding: '20px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: '100%',
      maxWidth: '400px',
    }}>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '2px solid #3498db',
        paddingBottom: '10px'
      }}>
        <h3 style={{
          margin: 0,
          color: '#2c3e50',
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          {type === 'L' ? '左手' : '右手'}控制面板
        </h3>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: isInteracting ? '#e74c3c' : '#27ae60'
        }} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        {Object.entries(jointConfig).map(([jointName, config]) => {
          const realValue = realTimeHandValues[jointName] || 0;
          const plannedValue = plannedHandValues[jointName] || 0;
          
          return (
            <div key={jointName} style={{ marginBottom: '15px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '5px'
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#34495e'
                }}>
                  {config.label}
                </label>
                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                  <span style={{ marginRight: '10px' }}>
                    实际: {realValue.toFixed(1)}°
                  </span>
                  <span style={{ color: isInteracting ? '#e74c3c' : '#27ae60' }}>
                    计划: {plannedValue.toFixed(1)}°
                  </span>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '5px'
              }}>
                <input
                  type="range"
                  min={config.min}
                  max={config.max}
                  step="0.5"
                  value={plannedValue}
                  onChange={(e) => handleSliderChange(jointName, e.target.value)}
                  disabled={rosServiceCalling}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    outline: 'none',
                    cursor: rosServiceCalling ? 'not-allowed' : 'pointer',
                    background: `linear-gradient(to right, 
                      #3498db 0%, 
                      #3498db ${((plannedValue - config.min) / (config.max - config.min)) * 100}%, 
                      #ecf0f1 ${((plannedValue - config.min) / (config.max - config.min)) * 100}%, 
                      #ecf0f1 100%)`
                  }}
                />
                <input
                  type="number"
                  min={config.min}
                  max={config.max}
                  step="0.1"
                  value={plannedValue.toFixed(1)}
                  onChange={(e) => handleInputChange(e, jointName, config)}
                  onKeyDown={handleKeyDown}
                  disabled={rosServiceCalling}
                  style={{
                    width: '60px',
                    height: '30px',
                    padding: '4px 6px',
                    fontSize: '0.875rem',
                    border: '1px solid rgba(0, 0, 0, 0.3)',
                    borderRadius: '4px',
                    textAlign: 'center',
                    backgroundColor: 'white',
                    cursor: rosServiceCalling ? 'not-allowed' : 'text'
                  }}
                />
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: '#95a5a6',
                marginTop: '2px'
              }}>
                <span>{config.min}°</span>
                <span>{config.max}°</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        display: 'flex',
        gap: '10px',
        justifyContent: 'center'
      }}>
        <button
          onClick={executeHandMovement}
          disabled={!isInteracting || rosServiceCalling}
          style={{
            flex: 1,
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '6px',
            cursor: (!isInteracting || rosServiceCalling) ? 'not-allowed' : 'pointer',
            backgroundColor: (!isInteracting || rosServiceCalling) ? '#95a5a6' : '#27ae60',
            color: 'white',
            transition: 'all 0.3s ease',
            opacity: (!isInteracting || rosServiceCalling) ? 0.6 : 1
          }}
        >
          {rosServiceCalling ? '执行中...' : '执行运动'}
        </button>

        <button
          onClick={resetToRealTimeValues}
          disabled={rosServiceCalling}
          style={{
            flex: 1,
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '6px',
            cursor: rosServiceCalling ? 'not-allowed' : 'pointer',
            backgroundColor: rosServiceCalling ? '#95a5a6' : '#e74c3c',
            color: 'white',
            transition: 'all 0.3s ease',
            opacity: rosServiceCalling ? 0.6 : 1
          }}
        >
          重置
        </button>
      </div>

      {/* 成功提示 */}
      {showSuccess && (
        <div style={{
          marginTop: '10px',
          padding: '8px 12px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#155724',
          animation: 'fadeIn 0.3s ease-in'
        }}>
          ✅ {successMessage}
        </div>
      )}

      <div style={{
        marginTop: '15px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#7f8c8d'
      }}>
        {rosServiceCalling && '正在与机器人通信...'}
        {isInteracting && !rosServiceCalling && '已修改参数，点击执行运动'}
        {!isInteracting && !rosServiceCalling && '等待控制指令'}
      </div>

      {/* 错误提示弹窗 */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderBottom: '1px solid #f5c6cb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            输入验证错误
          </div>
        </DialogTitle>
        <DialogContent style={{ padding: '20px' }}>
          <Typography variant="body1" style={{ 
            color: '#721c24',
            lineHeight: '1.5',
            marginBottom: '10px'
          }}>
            {error}
          </Typography>
          <Typography variant="body2" style={{ 
            color: '#6c757d',
            fontSize: '12px',
            fontStyle: 'italic'
          }}>
            提示：您可以继续使用滑块控制，或重新输入有效的数值。
          </Typography>
        </DialogContent>
        <DialogActions style={{ padding: '16px 20px' }}>
          <Button 
            onClick={handleCloseDialog} 
            variant="contained"
            style={{
              backgroundColor: '#721c24',
              color: 'white',
              '&:hover': {
                backgroundColor: '#5a1a1a'
              }
            }}
          >
            我知道了
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

// 机械臂滑块控制组件 - 与手掌控制保持统一的设计风格
const ArmSliderControl = ({ 
  isInteracting, 
  onInteractionChange, 
  rosServiceCalling, 
  realTimeArmValues, 
  plannedArmValues, 
  type, 
  onControlChange, 
  onMoveJSrvCall,
  isOnTeacherMode,
  // 新增：另一边手臂的状态和回调函数
  realTimeOtherArmValues = {},
  plannedOtherArmValues = {},
  onOtherMoveJSrvCall = null
}) => {
  
  // 从config中获取机械臂关节配置并映射为组件需要的格式
  const getArmJointConfig = () => {
    const armLimits = type === 'L' ? config.armJointLimits.leftArm : config.armJointLimits.rightArm;
    const jointLabels = {
      'Shoulder_Y': '肩部Y轴旋转',
      'Shoulder_X': '肩部X轴旋转',
      'Shoulder_Z': '肩部Z轴旋转',
      'Elbow': '肘关节',
      'Wrist_Z': '腕部Z轴旋转',
      'Wrist_Y': '腕部Y轴旋转',
      'Wrist_X': '腕部X轴旋转'
    };
    const jointDescriptions = {
      'Shoulder_Y': '肩部左右摆动',
      'Shoulder_X': '肩部前后摆动',
      'Shoulder_Z': '肩部扭转',
      'Elbow': '肘部弯曲伸展',
      'Wrist_Z': '手腕扭转',
      'Wrist_Y': '手腕上下摆动',
      'Wrist_X': '手腕左右摆动'
    };
    
    const jointConfig = {};
    armLimits.forEach(joint => {
      const baseName = joint.name.replace(/_L$|_R$/, ''); // 移除_L或_R后缀
      jointConfig[joint.name] = {
        label: jointLabels[baseName] || joint.name,
        min: joint.min,
        max: joint.max,
        description: jointDescriptions[baseName] || ''
      };
    });
    
    return jointConfig;
  };
  
  const jointConfig = getArmJointConfig();

  const handleSliderChange = (jointName, value) => {
    onControlChange(jointName, parseFloat(value));
    if (!isInteracting) {
      onInteractionChange(true);
    }
  };

  const executeArmMovement = () => {
    // 检查当前手臂是否有参数变化
    const currentArmHasChanges = shouldShowPlannedValues();
    // 检查另一边手臂是否有参数变化
    const otherArmHasChanges = shouldShowOtherPlannedValues();
    
    // 如果当前手臂有变化，执行当前手臂的运动
    if (currentArmHasChanges) {
      onMoveJSrvCall(plannedArmValues);
    }
    
    // 如果另一边手臂有变化且回调函数存在，执行另一边手臂的运动
    if (otherArmHasChanges && onOtherMoveJSrvCall) {
      onOtherMoveJSrvCall(plannedOtherArmValues);
    }
    
    // 重置交互状态
    onInteractionChange(false);
  };

  const resetToRealTimeValues = () => {
    Object.keys(jointConfig).forEach(jointName => {
      onControlChange(jointName, realTimeArmValues[jointName] || 0);
    });
    onInteractionChange(false);
  };

  const getJointPercentage = (jointName, value) => {
    const config = jointConfig[jointName];
    if (!config) return 0;
    return ((value - config.min) / (config.max - config.min)) * 100;
  };

  // 新增：判断planned与realTime是否一致
  const shouldShowPlannedValues = () => {
    return Object.keys(plannedArmValues).some(
      key => plannedArmValues[key] !== realTimeArmValues[key]
    );
  };

  // 新增：判断另一边手臂的planned与realTime是否一致
  const shouldShowOtherPlannedValues = () => {
    return Object.keys(plannedOtherArmValues).some(
      key => plannedOtherArmValues[key] !== realTimeOtherArmValues[key]
    );
  };

  // 新增：判断是否有任何手臂需要执行运动
  const shouldEnableExecuteButton = () => {
    const currentArmHasChanges = shouldShowPlannedValues();
    const otherArmHasChanges = shouldShowOtherPlannedValues();
    return currentArmHasChanges || otherArmHasChanges;
  };

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '10px',
      padding: '20px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: '100%',
      maxWidth: '400px',
    }}>
      {/* 统一的标题栏 - 与手掌控制面板保持一致 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '2px solid #3498db',
        paddingBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{
            margin: 0,
            color: '#2c3e50',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            {type === 'L' ? '左臂' : '右臂'}控制面板
          </h3>
          {isOnTeacherMode && (
            <div style={{
              backgroundColor: '#f39c12',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              示教模式
            </div>
          )}
        </div>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: isInteracting ? '#e74c3c' : '#27ae60'
        }} />
      </div>

      {/* 关节控制区域 - 移除滚动条，使用固定高度 */}
      <div style={{ marginBottom: '20px' }}>
        {Object.entries(jointConfig).map(([jointName, config]) => {
          const realValue = realTimeArmValues[jointName] || 0;
          const plannedValue = plannedArmValues[jointName] || 0;
          
          return (
            <div key={jointName} style={{ marginBottom: '15px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '5px'
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#34495e'
                }}>
                  {config.label}
                </label>
                
                <div style={{ 
                  fontSize: '12px', 
                  color: '#7f8c8d'
                }}>
                  <span style={{ marginRight: '10px' }}>
                    实际: {realValue.toFixed(1)}°
                  </span>
                  <span style={{ color: isInteracting ? '#e74c3c' : '#27ae60' }}>
                    计划: {plannedValue.toFixed(1)}°
                  </span>
                </div>
              </div>
              
              <input
                type="range"
                min={config.min}
                max={config.max}
                step="0.5"
                value={plannedValue}
                onChange={(e) => handleSliderChange(jointName, e.target.value)}
                disabled={rosServiceCalling || isOnTeacherMode}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  outline: 'none',
                  cursor: (rosServiceCalling || isOnTeacherMode) ? 'not-allowed' : 'pointer',
                  background: `linear-gradient(to right, 
                    #3498db 0%, 
                    #3498db ${getJointPercentage(jointName, plannedValue)}%, 
                    #ecf0f1 ${getJointPercentage(jointName, plannedValue)}%, 
                    #ecf0f1 100%)`,
                  opacity: (rosServiceCalling || isOnTeacherMode) ? 0.6 : 1,
                  transition: 'opacity 0.3s ease'
                }}
              />
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: '#95a5a6',
                marginTop: '2px'
              }}>
                <span>{config.min}°</span>
                <span>{config.max}°</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 控制按钮区域 - 与手掌控制面板保持一致的样式 */}
      <div style={{
        display: 'flex',
        gap: '10px',
        justifyContent: 'center'
      }}>
        <button
          onClick={executeArmMovement}
          disabled={!shouldEnableExecuteButton() || rosServiceCalling || isOnTeacherMode}
          style={{
            flex: 1,
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '6px',
            cursor: (!shouldEnableExecuteButton() || rosServiceCalling || isOnTeacherMode) ? 'not-allowed' : 'pointer',
            backgroundColor: (!shouldEnableExecuteButton() || rosServiceCalling || isOnTeacherMode) ? '#95a5a6' : '#27ae60',
            color: 'white',
            transition: 'all 0.3s ease',
            opacity: (!shouldEnableExecuteButton() || rosServiceCalling || isOnTeacherMode) ? 0.6 : 1
          }}
        >
          {rosServiceCalling ? '执行中...' : isOnTeacherMode ? '示教模式中' : '执行运动'}
        </button>

        <button
          onClick={resetToRealTimeValues}
          disabled={rosServiceCalling || isOnTeacherMode}
          style={{
            flex: 1,
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '6px',
            cursor: (rosServiceCalling || isOnTeacherMode) ? 'not-allowed' : 'pointer',
            backgroundColor: (rosServiceCalling || isOnTeacherMode) ? '#95a5a6' : '#e74c3c',
            color: 'white',
            transition: 'all 0.3s ease',
            opacity: (rosServiceCalling || isOnTeacherMode) ? 0.6 : 1
          }}
        >
          重置
        </button>
      </div>

      {/* 统一的状态提示区域 */}
      <div style={{
        marginTop: '15px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#7f8c8d'
      }}>
        {isOnTeacherMode && '示教模式下控制面板已禁用'}
        {!isOnTeacherMode && rosServiceCalling && '正在与机器人通信...'}
        {!isOnTeacherMode && isInteracting && !rosServiceCalling && '已修改参数，点击执行运动'}
        {!isOnTeacherMode && !isInteracting && !rosServiceCalling && '等待控制指令'}
      </div>

      {/* 安全提示区域 - 在用户准备执行动作时显示 */}
      {isInteracting && !isOnTeacherMode && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: 'rgba(241, 196, 15, 0.1)',
          border: '1px solid rgba(241, 196, 15, 0.3)',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#f39c12',
          textAlign: 'center'
        }}>
          ⚠️ 请确认机器人周围安全后再执行运动
        </div>
      )}
    </div>
  );
};

const App = () => {

  const areJointValuesEqual = useCallback((currentValues, plannedValues) => {
    return Object.keys(plannedValues).every(
      (key) => currentValues[key] === plannedValues[key]
    );
  }, []);

  /*
  RobotArmTarget
  */

  const [showRobotArmTarget, setShowRobotArmTarget] = useState(false);
  const toggleComponent = () => {
    setShowRobotArmTarget(!showRobotArmTarget);
    setShowTeacher(2);
  };

  /*
  Hand Components Toggle
  */
  const [showHandComponents, setShowHandComponents] = useState(false);
  const toggleHandComponents = () => {
    setShowHandComponents(!showHandComponents);
  };

  // 机器人末端坐标状态管理
  const [CoordinatesTemp, setCoordinatesTemp] = useState({
    Right: {
      x: 0, y: 0, z: 0,
      xR: 0, yR: 0, zR: 0
    },
    Left: {
      x: 0, y: 0, z: 0,
      xR: 0, yR: 0, zR: 0
    },
  });

  const [isMoveLUpdated, setIsMoveLUpdated] = useState(false);

  function quaternionToEuler(q) {
    const quaternion = new Quaternion(q.x, q.y, q.z, q.w);
    const euler = new Euler().setFromQuaternion(quaternion, "XYZ");
    return { xR: euler.x, yR: euler.y, zR: euler.z };
  }

  function eulerToQuaternion(xR, yR, zR) {
    const euler = new Euler(xR, yR, zR, "XYZ");
    const quaternion = new Quaternion().setFromEuler(euler);
    return { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w };
  }

  const R_HandRef = useRef(null);
  const L_HandRef = useRef(null);

  // Arm MoveL ROS Service Call
  const callArmMoveLService = (serviceName, target_Poses, notWait = true) => {
    setIsMoveLUpdated(true);
    // console.log('callArmMoveLService', serviceName, target_Poses);

    if (!rosRef.current || !isConnected) {
      // console.error("WebSocket connection to ROSBridge is not active.");
      return;
    }

    const service = new ROSLIB.Service({
      ros: rosRef.current,
      name: serviceName,
      serviceType: "navi_types/Uplimb_MoveL",
    });

    const request = new ROSLIB.ServiceRequest({
      target_pose: target_Poses,
      not_wait: notWait,
    });

    // console.log(`service.name: ${service.name}, service.serviceType: ${service.serviceType}`);
    // console.log(`request.jnt_angle: ${JSON.stringify(request.target_pose)}, request.not_wait: ${request.not_wait}`);

    service.callService(request, (response) => {
      // console.log(`Response from ${serviceName}:`, response);
      if (response && response.finish.data) {
        // console.log(`Response from ${serviceName}: Operation completed successfully.`);
      } else {
        // console.error(`Response from ${serviceName}: Operation failed or incomplete.`);
      }
      setArmRosServiceCalling(false);
    }, (error) => {
      // console.error(`Error 的calling service ${serviceName}:`, error);
    });
  }

  const handleLeftArmMoveLSrvCall = (delta, id) => {
    const updatedCoordinates = { ...CoordinatesTemp.Left };

    if (id === 'x' || id === 'y' || id === 'z') {
      updatedCoordinates[id] += delta;
    } else if (id === 'xR' || id === 'yR' || id === 'zR') {
      updatedCoordinates[id] += THREE.MathUtils.degToRad(delta);
    }

    const { x, y, z, xR, yR, zR } = updatedCoordinates;
    const quaternion = eulerToQuaternion(xR, yR, zR);
    const target_Poses_L = {
      position: { x, y, z },
      orientation: {
        x: quaternion.x,
        y: quaternion.y,
        z: quaternion.z,
        w: quaternion.w
      }
    };

    callArmMoveLService("/left_arm_movel_service", target_Poses_L);
  }

  const handleRightArmMoveLSrvCall = (delta, id) => {
    // console.log('偏移值这老谢 ', delta)
    const updatedCoordinates = { ...CoordinatesTemp.Right };

    if (id === 'x' || id === 'y' || id === 'z') {
      updatedCoordinates[id] += delta;
    } else if (id === 'xR' || id === 'yR' || id === 'zR') {
      updatedCoordinates[id] += THREE.MathUtils.degToRad(delta);
    }

    const { x, y, z, xR, yR, zR } = updatedCoordinates;
    const quaternion = eulerToQuaternion(xR, yR, zR);
    const target_Poses_R = {
      position: { x, y, z },
      orientation: {
        x: quaternion.x,
        y: quaternion.y,
        z: quaternion.z,
        w: quaternion.w
      }
    };

    callArmMoveLService("/right_arm_movel_service", target_Poses_R);
  }

  const handleExecuteMoveL = () => {
    // 已弃用的函数
  }

  /*
  Arm 机械臂状态管理
  */
  const [armIsInteracting, setArmIsInteracting] = useState(false);
  const onArmIsInteractingChange = (isInteracting) => {
    setArmIsInteracting(isInteracting);
  };

  const [armRosServiceCalling, setArmRosServiceCalling] = useState(false);
  
  // 实时机械臂关节状态 - 来自机器人的真实反馈
  const [realTimeArmValues, setRealTimeArmValues] = useState({
    'Shoulder_Y_L': 0, 'Shoulder_X_L': 0, 'Shoulder_Z_L': 0, 'Elbow_L': 0,
    'Wrist_Z_L': 0, 'Wrist_Y_L': 0, 'Wrist_X_L': 0,
    'Shoulder_Y_R': 0, 'Shoulder_X_R': 0, 'Shoulder_Z_R': 0, 'Elbow_R': 0,
    'Wrist_Z_R': 0, 'Wrist_Y_R': 0, 'Wrist_X_R': 0
  });

  // 从综合状态中提取左右臂数据
  const realTimeLeftArmValues = {
    'Shoulder_Y_L': realTimeArmValues['Shoulder_Y_L'],
    'Shoulder_X_L': realTimeArmValues['Shoulder_X_L'],
    'Shoulder_Z_L': realTimeArmValues['Shoulder_Z_L'],
    'Elbow_L': realTimeArmValues['Elbow_L'],
    'Wrist_Z_L': realTimeArmValues['Wrist_Z_L'],
    'Wrist_Y_L': realTimeArmValues['Wrist_Y_L'],
    'Wrist_X_L': realTimeArmValues['Wrist_X_L'],
  };
  const realTimeRightArmValues = {
    'Shoulder_Y_R': realTimeArmValues['Shoulder_Y_R'],
    'Shoulder_X_R': realTimeArmValues['Shoulder_X_R'],
    'Shoulder_Z_R': realTimeArmValues['Shoulder_Z_R'],
    'Elbow_R': realTimeArmValues['Elbow_R'],
    'Wrist_Z_R': realTimeArmValues['Wrist_Z_R'],
    'Wrist_Y_R': realTimeArmValues['Wrist_Y_R'],
    'Wrist_X_R': realTimeArmValues['Wrist_X_R'],
  };

  // 计划机械臂关节状态 - 用户设定的目标值
  const [plannedLeftArmValues, setPlannedLeftArmValues] = useState({
    'Shoulder_X_L': 0, 'Shoulder_Y_L': 0, 'Shoulder_Z_L': 0, 'Elbow_L': 0,
    'Wrist_Z_L': 0, 'Wrist_Y_L': 0, 'Wrist_X_L': 0,
  });

  const handlePlannedLeftArmChange = (name, newValue) => {
    setPlannedLeftArmValues(prevState => ({
      ...prevState,
      [name]: newValue,
    }));
  };

  const [plannedRightArmValues, setPlannedRightArmValues] = useState({
    'Shoulder_Y_R': 0, 'Shoulder_X_R': 0, 'Shoulder_Z_R': 0, 'Elbow_R': 0,
    'Wrist_Z_R': 0, 'Wrist_Y_R': 0, 'Wrist_X_R': 0,
  });

  const handlePlannedRightArmChange = (name, newValue) => {
    setPlannedRightArmValues(prevState => ({
      ...prevState,
      [name]: newValue,
    }));
  };

  // 同步状态管理 - 确保计划值与实时值的一致性
  const [leftArmSyncDone, setLeftArmSyncDone] = useState(false);
  const [rightArmSyncDone, setRightArmSyncDone] = useState(false);
  
  useEffect(() => {
    if (!leftArmSyncDone && Object.values(realTimeLeftArmValues).some(value => value !== 0)) {
      setPlannedLeftArmValues({ ...realTimeLeftArmValues });
      setLeftArmSyncDone(true);
    }
  }, [realTimeLeftArmValues, leftArmSyncDone]);
  
  useEffect(() => {
    if (!rightArmSyncDone && Object.values(realTimeRightArmValues).some(value => value !== 0)) {
      setPlannedRightArmValues({ ...realTimeRightArmValues });
      setRightArmSyncDone(true);
    }
  }, [realTimeRightArmValues, rightArmSyncDone]);

  // Arm MoveJ ROS Service Call
  const callArmMoveJService = (serviceName, jointAngles, notWait = false) => {
    // console.log('callArmMoveJService', serviceName, jointAngles);

    if (!rosRef.current || !isConnected) {
      // console.error("WebSocket connection to ROSBridge is not active.");
      return;
    }

    if (!serviceName || !jointAngles || !Array.isArray(jointAngles)) {
      // console.error("Invalid service name or joint angles");
      return;
    }
    
    const service = new ROSLIB.Service({
      ros: rosRef.current,
      name: serviceName,
      serviceType: "navi_types/Uplimb_MoveJ",
    });

    const request = new ROSLIB.ServiceRequest({
      jnt_angle: jointAngles,
      not_wait: notWait,
    });

    // console.log(`service.name: ${service.name}, service.serviceType: ${service.serviceType}`);
    // console.log(`request.jnt_angle: ${JSON.stringify(request.jnt_angle)}, request.not_wait: ${request.not_wait}`);

    service.callService(request, (response) => {
      // console.log(`Response from ${serviceName}:`, response);
      if (response && response.finish.data) {
        // console.log(`Response from ${serviceName}: Operation completed successfully.`);
      } else {
        // console.error(`Response from ${serviceName}: Operation failed or incomplete.`);
      }
      setArmRosServiceCalling(false);
    }, (error) => {
      // console.error(`Error calling service ${serviceName}:`, error);
    });
  };

  const handleLeftArmMoveJSrvCall = (plannedLeftArmValues) => {
    setArmRosServiceCalling(true);
    const jnt_angle = [
      plannedLeftArmValues["Shoulder_Y_L"] * (Math.PI / 180),
      plannedLeftArmValues["Shoulder_X_L"] * (Math.PI / 180),
      plannedLeftArmValues["Shoulder_Z_L"] * (Math.PI / 180),
      plannedLeftArmValues["Elbow_L"] * (Math.PI / 180),
      plannedLeftArmValues["Wrist_Z_L"] * (Math.PI / 180),
      plannedLeftArmValues["Wrist_Y_L"] * (Math.PI / 180),
      plannedLeftArmValues["Wrist_X_L"] * (Math.PI / 180)
    ];
    setArmIsInteracting(false);
    // console.log('调用左臂服务，参数为：', plannedLeftArmValues);
    callArmMoveJService("/left_arm_movej_service", jnt_angle);
  };

  const handleRightArmMoveJSrvCall = (plannedRightArmValues) => {
    setArmRosServiceCalling(true);
    const jnt_angle = [
      plannedRightArmValues["Shoulder_Y_R"] * (Math.PI / 180),
      plannedRightArmValues["Shoulder_X_R"] * (Math.PI / 180),
      plannedRightArmValues["Shoulder_Z_R"] * (Math.PI / 180),
      plannedRightArmValues["Elbow_R"] * (Math.PI / 180),
      plannedRightArmValues["Wrist_Z_R"] * (Math.PI / 180),
      plannedRightArmValues["Wrist_Y_R"] * (Math.PI / 180),
      plannedRightArmValues["Wrist_X_R"] * (Math.PI / 180)
    ];
    setArmIsInteracting(false);
    // console.log('调用右臂服务，参数为：', plannedRightArmValues);
    callArmMoveJService("/right_arm_movej_service", jnt_angle);
  };

  /* 
  Hand 手掌状态管理
  */
  const [handIsInteracting, setHandIsInteracting] = useState(false);
  const onHandIsInteractingChange = (isInteracting) => {
    setHandIsInteracting(isInteracting);
  };
  const [handRosServiceCalling, setHandRosServiceCalling] = useState(false);

  // 实时手掌关节状态
  const [realTimeLeftHandValues, setRealTimeLeftHandValues] = useState({
    'index_MCP': 0, 'thumb_CMC': 0, 'thumb_IP': 0,
    'middle_MCP': 0, 'ring_MCP': 0, 'little_MCP': 0
  });

  const [realTimeRightHandValues, setRealTimeRightHandValues] = useState({
    'index_MCP': 0, 'thumb_CMC': 0, 'thumb_IP': 0,
    'middle_MCP': 0, 'ring_MCP': 0, 'little_MCP': 0
  });

  // 计划手掌关节状态
  const [plannedLeftHandValues, setPlannedLeftHandValues] = useState({
    'index_MCP': realTimeLeftHandValues['index_MCP'],
    'thumb_CMC': realTimeLeftHandValues['thumb_CMC'],
    'thumb_IP': realTimeLeftHandValues['thumb_IP'],
    'middle_MCP': realTimeLeftHandValues['middle_MCP'],
    'ring_MCP': realTimeLeftHandValues['ring_MCP'],
    'little_MCP': realTimeLeftHandValues['little_MCP']
  });
  
  const handlePlannedLeftHandChange = (jointName, value) => {
    setPlannedLeftHandValues(prevValues => ({
      ...prevValues,
      [jointName]: value
    }));
  };

  const [plannedRightHandValues, setPlannedRightHandValues] = useState({
    'index_MCP': realTimeRightHandValues['index_MCP'],
    'thumb_CMC': realTimeRightHandValues['thumb_CMC'],
    'thumb_IP': realTimeRightHandValues['thumb_IP'],
    'middle_MCP': realTimeRightHandValues['middle_MCP'],
    'ring_MCP': realTimeRightHandValues['ring_MCP'],
    'little_MCP': realTimeRightHandValues['little_MCP']
  });
  
  const handlePlannedRightHandChange = (jointName, value) => {
    setPlannedRightHandValues(prevValues => ({
      ...prevValues,
      [jointName]: value
    }));
  };

  // Call Hand ROS Service
  const callHandService = (serviceName, id, jointValues) => {
    // console.log('callHandService', serviceName);

    if (!rosRef.current || !isConnected) {
      // console.error("WebSocket connection to ROSBridge is not active.");
      return;
    }

    const service = new ROSLIB.Service({
      ros: rosRef.current,
      name: serviceName,
      serviceType: "navi_types/Hand_Joint",
    });

    const request = new ROSLIB.ServiceRequest({
      id: id,
      q: jointValues,
    });
    
    // console.log(`service.ros: ${service.ros}, service.name: ${service.name}, service.serviceType: ${service.serviceType}`);
    // console.log(`request.id: ${request.id}, request.q: ${JSON.stringify(request.q)}`);
    
    service.callService(request, (response) => {
      // console.log(`Response from ${serviceName}:`, response);

      if (response.success) {
        // console.log(`Hand ROS Service Call succeeded: ${response.message}`);
      } else {
        // console.error(`Hand ROS Service Call failed: ${response.message}`);
      }
      setHandRosServiceCalling(false);
    });
  };

  const handleLeftHandMoveServiceCall = (plannedLeftHandValues) => {
    setHandRosServiceCalling(true);
    const jointAngles = [
      plannedLeftHandValues["thumb_IP"] * (Math.PI / 180),
      plannedLeftHandValues["thumb_CMC"] * (Math.PI / 180),
      plannedLeftHandValues["index_MCP"] * (Math.PI / 180),
      plannedLeftHandValues["middle_MCP"] * (Math.PI / 180),
      plannedLeftHandValues["ring_MCP"] * (Math.PI / 180),
      plannedLeftHandValues["little_MCP"] * (Math.PI / 180)
    ];
    setHandIsInteracting(false);
    callHandService("/robotHandJointSwitch", 0, jointAngles);
  };

  const handleRightHandMoveJServiceCall = (plannedRightHandValues) => {
    setHandRosServiceCalling(true);
    const jointAngles = [
      plannedRightHandValues["thumb_IP"] * (Math.PI / 180),
      plannedRightHandValues["thumb_CMC"] * (Math.PI / 180),
      plannedRightHandValues["index_MCP"] * (Math.PI / 180),
      plannedRightHandValues["middle_MCP"] * (Math.PI / 180),
      plannedRightHandValues["ring_MCP"] * (Math.PI / 180),
      plannedRightHandValues["little_MCP"] * (Math.PI / 180)
    ];
    setHandIsInteracting(false);
    callHandService("/robotHandJointSwitch", 1, jointAngles);
  };

  // 手掌同步状态管理
  const [leftHandSyncDone, setLeftHandSyncDone] = useState(false);
  const [rightHandSyncDone, setRightHandSyncDone] = useState(false);

  useEffect(() => {
    if (!leftHandSyncDone && Object.values(realTimeLeftHandValues).some(value => value !== 0)) {
      setPlannedLeftHandValues({ ...realTimeLeftHandValues });
      setLeftHandSyncDone(true);
    }
  }, [realTimeLeftHandValues, leftHandSyncDone]);

  useEffect(() => {
    if (!rightHandSyncDone && Object.values(realTimeRightHandValues).some(value => value !== 0)) {
      setPlannedRightHandValues({ ...realTimeRightHandValues });
      setRightHandSyncDone(true);
    }
  }, [realTimeRightHandValues, rightHandSyncDone]);

  /*
  ROS连接和话题订阅管理
  */
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // 机器人状态管理
  const [robotState, setRobotState] = useState(0);
  const [robotStateInfo, setRobotStateInfo] = useState('');

  const ROS_HOST = window.location.hostname === 'localhost' ? config.rosbridge.ROS_HOST : window.location.hostname;
  const ROS_PORT = config.rosbridge.ROS_PORT;
  const reconnectionInterval = config.rosbridge.reconnectionInterval;
  const rosRef = useRef(new ROSLIB.Ros());
  
  useEffect(() => {
    const ros = rosRef.current;

    const handleConnection = () => {
      // console.log('Connected to ROSBridge');
      setIsConnected(true);
      setErrorMessage('');
    };

    const handleClose = () => {
      // console.log('Disconnected from ROSBridge');
      setIsConnected(false);
      setErrorMessage('Disconnected from ROSBridge');

      setTimeout(() => {
        ros.connect(`ws://${ROS_HOST}:${ROS_PORT}`);
      }, reconnectionInterval);
    };

    const handleError = (error) => {
      // console.error('Error connecting to ROSBridge:', error);
      setErrorMessage('Error connecting to ROSBridge');
    };

    ros.close();
    ros.connect(`ws://${ROS_HOST}:${ROS_PORT}`);

    ros.on('connection', handleConnection);
    ros.on('close', handleClose);
    ros.on('error', handleError);

    // 订阅机器人末端位姿
    const left_arm_tcp_pose = new ROSLIB.Topic({
      ros,
      name: '/left_arm_tcp_pose',
      messageType: 'geometry_msgs/Pose',
    });
    
    left_arm_tcp_pose.subscribe((message) => {
      const { x, y, z } = message.position;
      const { xR, yR, zR } = quaternionToEuler(message.orientation);
      
      setCoordinatesTemp((prev) => ({
        ...prev,
        Left: { x, y, z, xR, yR, zR },
      }));
      
      L_HandRef.current.position.x = x;
      L_HandRef.current.position.y = y;
      L_HandRef.current.position.z = z;
      L_HandRef.current.rotation.x = xR;
      L_HandRef.current.rotation.y = yR - Math.PI;
      L_HandRef.current.rotation.z = -zR;
    });

    const right_arm_tcp_pose = new ROSLIB.Topic({
      ros,
      name: '/right_arm_tcp_pose',
      messageType: 'geometry_msgs/Pose',
    });

    right_arm_tcp_pose.subscribe((message) => {
      const { x, y, z } = message.position;
      const { xR, yR, zR } = quaternionToEuler(message.orientation);
      
      setCoordinatesTemp((prev) => ({
        ...prev,
        Right: { x, y, z, xR, yR, zR },
      }));
      
      R_HandRef.current.position.x = x;
      R_HandRef.current.position.y = y;
      R_HandRef.current.position.z = z;
      R_HandRef.current.rotation.x = xR;
      R_HandRef.current.rotation.y = yR - Math.PI;
      R_HandRef.current.rotation.z = -zR;
    })
    
    // 订阅机械臂关节状态
    const armJointStates = new ROSLIB.Topic({
      ros,
      name: '/joint_states',
      messageType: 'sensor_msgs/JointState',
    });

    let i = 0;
    let lastSeq = -1;

    armJointStates.subscribe((message) => {
      if (message.header && message.header.seq <= lastSeq) {
        return;
      }

      if (message.header) {
        lastSeq = message.header.seq;
      }

      i++;
      if (i % 10 === 5) {
        const updatedArmValues = {
          Shoulder_Y_L: message.position[0] || 0,
          Shoulder_X_L: message.position[1] || 0,
          Shoulder_Z_L: message.position[2] || 0,
          Elbow_L: message.position[3] || 0,
          Wrist_Z_L: message.position[4] || 0,
          Wrist_Y_L: message.position[5] || 0,
          Wrist_X_L: message.position[6] || 0,
          Shoulder_Y_R: message.position[7] || 0,
          Shoulder_X_R: message.position[8] || 0,
          Shoulder_Z_R: message.position[9] || 0,
          Elbow_R: message.position[10] || 0,
          Wrist_Z_R: message.position[11] || 0,
          Wrist_Y_R: message.position[12] || 0,
          Wrist_X_R: message.position[13] || 0,
        };
        
        const updatedArmValuesInDegrees = Object.keys(updatedArmValues).reduce((acc, key) => {
          acc[key] = updatedArmValues[key] * (180 / Math.PI);
          return acc;
        }, {});

        setRealTimeArmValues((prev) => ({
          ...prev,
          ...updatedArmValuesInDegrees,
        }));
      }
    });

    // 订阅手掌关节状态
    const handJointStates = new ROSLIB.Topic({
      ros,
      name: '/hand_joint_states',
      messageType: 'sensor_msgs/JointState',
    });

    handJointStates.subscribe((message) => {
      const updatedLeftHandValues = {
        thumb_IP: message.position[0] || 0,
        thumb_CMC: message.position[1] || 0,
        index_MCP: message.position[2] || 0,
        middle_MCP: message.position[3] || 0,
        ring_MCP: message.position[4] || 0,
        little_MCP: message.position[5] || 0,
      };

      const updatedRightHandValues = {
        thumb_IP: message.position[6] || 0,
        thumb_CMC: message.position[7] || 0,
        index_MCP: message.position[8] || 0,
        middle_MCP: message.position[9] || 0,
        ring_MCP: message.position[10] || 0,
        little_MCP: message.position[11] || 0,
      };

      const updatedLeftHandValuesInDegrees = Object.keys(updatedLeftHandValues).reduce((acc, key) => {
        acc[key] = updatedLeftHandValues[key] * (180 / Math.PI);
        return acc;
      }, {});

      const updatedRightHandValuesInDegrees = Object.keys(updatedRightHandValues).reduce((acc, key) => {
        acc[key] = updatedRightHandValues[key] * (180 / Math.PI);
        return acc;
      }, {});

      setRealTimeLeftHandValues((prev) => ({
        ...prev,
        ...updatedLeftHandValuesInDegrees,
      }));

      setRealTimeRightHandValues((prev) => ({
        ...prev,
        ...updatedRightHandValuesInDegrees,
      }));
    });

    // 订阅机器人状态
    const robotStateTopic = new ROSLIB.Topic({
      ros,
      name: '/robot_state',
      messageType: 'navi_types/Robot_StateMsg',
    });

    robotStateTopic.subscribe((message) => {
      console.log('Received robot state:', message);
      // 根据实际消息格式解析状态
      if (message && typeof message.state !== 'undefined') {
        setRobotState(message.state);
        setRobotStateInfo(message.state_info || '');
      } else {
        console.log('Message received but no state field found:', message);
      }
    }, (error) => {
      console.error('Error subscribing to robot state topic:', error);
    });

    return () => {
      ros.off('connection', handleConnection);
      ros.off('close', handleClose);
      ros.off('error', handleError);

      armJointStates.unsubscribe();
      handJointStates.unsubscribe();
      left_arm_tcp_pose.unsubscribe();
      right_arm_tcp_pose.unsubscribe();
      robotStateTopic.unsubscribe();
      ros.close();
    };
  }, [ROS_HOST, ROS_PORT, reconnectionInterval]);

  // 鼠标样式管理
  useEffect(() => {
    if (armRosServiceCalling) {
      document.body.style.cursor = 'url("~/public/cursor/1.png"), auto';
    } else if (handRosServiceCalling) {
      document.body.style.cursor = 'url("~/public/cursor/2.png"), auto';
    } else {
      document.body.style.cursor = 'default';
    }
  }, [armRosServiceCalling, handRosServiceCalling]);

  const mergedData = {
    leftHand: plannedLeftHandValues,
    rightHand: plannedRightHandValues,
    leftArm: plannedLeftArmValues,
    rightArm: plannedRightArmValues,
  };

    /*
  预设动作管理
   */
  const [currentActionTimer, setCurrentActionTimer] = useState(null);
  const [currentActionId, setCurrentActionId] = useState(null);

  const handlePresetActionPress = (actionId) => {
    if (actionId >= 1 && actionId <= 4 && !currentActionTimer) {
      setArmRosServiceCalling(true);
      setCurrentActionId(actionId);
      // 立即发送一次
      callCmdVelTwist(TWIST_PRESETS[actionId]);
      // 启动10Hz定时器
      const timer = setInterval(() => {
        callCmdVelTwist(TWIST_PRESETS[actionId]);
      }, 100);
      setCurrentActionTimer(timer);
    }
  };

  const handlePresetActionRelease = () => {
    if (currentActionTimer) {
      clearInterval(currentActionTimer);
      setCurrentActionTimer(null);
      setCurrentActionId(null);
      // 立即发送停止帧
      callCmdVelTwist({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } });
      setArmRosServiceCalling(false);
    }
  };

  const handlePresetAction = async (actionId) => {
    // 挥手
    if (actionId === 5) {
      setArmRosServiceCalling(true);
      for (let i = 0; i < RIGHT_ARM_WAVE_TRAJECTORY.length; i++) {
        await new Promise((resolve) => {
          callArmMoveJService("/right_arm_movej_service", RIGHT_ARM_WAVE_TRAJECTORY[i], true);
          setTimeout(resolve, 800);
        });
      }
      setArmRosServiceCalling(false);
      return;
    }
    
    // 运行 - 动作7
    if (actionId === 7) {
      setArmRosServiceCalling(true);
      callRobotStateService(5); // RUN = 5
      setTimeout(() => {
        setArmRosServiceCalling(false);
      }, 1000);
      return;
    }
    
    // 软急停 - 动作8
    if (actionId === 8) {
      setArmRosServiceCalling(true);
      callRobotStateService(9); // STOP = 9
      setTimeout(() => {
        setArmRosServiceCalling(false);
      }, 1000);
      return;
    }
    
    // 关机 - 动作9
    if (actionId === 9) {
      setArmRosServiceCalling(true);
      callRobotStateService(8); // OFF = 8
      setTimeout(() => {
        setArmRosServiceCalling(false);
      }, 1000);
      return;
    }
    
    // 其他动作
    if (actionId < 1 || actionId > 12) {
      alert("该预设动作暂未定义");
      setArmRosServiceCalling(false);
    }
  };

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (currentActionTimer) {
        clearInterval(currentActionTimer);
      }
    };
  }, [currentActionTimer]);

  /*
  示教模式管理
  */
  const [showTeacher, setShowTeacher] = useState(2);
  const toggleTeacher = () => {
    setShowTeacher(prevState => (prevState + 1) % 3);
    setShowRobotArmTarget(false);
    setShowHandComponents(false);
    setShowPresetActions(false);
    setArmIsInteracting(false);
  }

  /*
  预设动作模式管理
  */
  const [showPresetActions, setShowPresetActions] = useState(false);
  const togglePresetActions = () => {
    setShowPresetActions(!showPresetActions);
    setShowRobotArmTarget(false);
    setShowHandComponents(false);
    setShowTeacher(2);
    setArmIsInteracting(false);
  }
  
  useEffect(() => {
    if (isConnected === true) {
      callTeachingService('/teach_mode_service', showTeacher);
      // console.log(`Mode ${showTeacher} Completed`);
    }
  }, [showTeacher]);

  const callTeachingService = (serviceName, modeIndex) => {
    if (!rosRef.current || !isConnected) {
      console.error("WebSocket connection to ROSBridge is not active.");
      return;
    }
    // console.log(`Teachinf Mode ${modeIndex} is Completed`);

    const service = new ROSLIB.Service({
      ros: rosRef.current,
      name: serviceName,
      serviceType: "naviai_manip_srvs/TeachMode",
    });

    const request = new ROSLIB.ServiceRequest({
      mode: modeIndex,
    });

    service.callService(request, (response) => {
      // console.log(`Response from ${serviceName}:`, response);
      if (response) {
        // console.log(`Response from ${serviceName}: Operation completed successfully.`);
      } else {
        console.error(`Response from ${serviceName}: Operation failed or incomplete.`);
      }
    }, (error) => {
      console.error(`Error calling service ${serviceName}:`, error);
    });
  };

  // Twist消息模板
  const TWIST_PRESETS = {
    1: { linear: { x: 0.3, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } },   // 前进
    2: { linear: { x: -0.3, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } },  // 后退
    3: { linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0.7 } },   // 左转
    4: { linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: -0.7 } },  // 右转
  };
  // 挥手轨迹点
  const RIGHT_ARM_WAVE_TRAJECTORY = [
    [-0.9, -1.6, -0.5, -1.5, 0.0, 0.0, 0.0],
    [-0.9, -1.6, -0.5, -0.5, 0.0, 0.0, 0.0],
    [-0.9, -1.6, -0.5, -1.5, 0.0, 0.0, 0.0],
    [-0.9, -1.6, -0.5, -0.5, 0.0, 0.0, 0.0],
    [-0.0, -0.33, 0.0, -0.0, 0.0, -0.0, -0.0]
  ];

  // 机器人状态控制服务调用函数
  const callRobotStateService = (targetState) => {
    if (!rosRef.current || !isConnected) {
      console.error("WebSocket connection to ROSBridge is not active.");
      return;
    }

    const service = new ROSLIB.Service({
      ros: rosRef.current,
      name: "/set_robot_state",
      serviceType: "navi_types/Robot_SetState",
    });

    const request = new ROSLIB.ServiceRequest({
      target_state: targetState,
    });

    service.callService(request, (response) => {
      console.log(`Robot state service response:`, response);
      if (response && response.success) {
        console.log(`Robot state changed successfully: ${response.message}`);
      } else {
        console.error(`Robot state change failed: ${response?.message || 'Unknown error'}`);
      }
    }, (error) => {
      console.error(`Error calling robot state service:`, error);
    });
  };

  const callCmdVelTwist = (twistMsg) => {
    if (!rosRef.current || !isConnected) {
      console.error("WebSocket connection to ROSBridge is not active.");
      return;
    }
    const topic = new ROSLIB.Topic({
      ros: rosRef.current,
      name: "/cmd_web_vel",
      messageType: "geometry_msgs/Twist",
    });
    const msg = new ROSLIB.Message(twistMsg);
    topic.publish(msg);
  };

  return (
    <div className="app" style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      {/* 顶部按钮栏 - 统一风格的五个主要模式切换按钮 */}
      <div style={{
        position: 'absolute',
        top: '2%',
        left: 0,
        width: '100%',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        padding: '0 2vw',
        boxSizing: 'border-box',
      }}>
        <button
          onClick={toggleTeacher}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#f084b8',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            minWidth: '140px',
            textAlign: 'center'
          }}
        >
          {showTeacher === 0 ? '左右手臂+腰示教中' : showTeacher === 1 ? '左右手臂示教中' : '退出示教'}
        </button>

        <button
          onClick={() => { 
            setShowRobotArmTarget(false); 
            setShowHandComponents(false); 
            setShowPresetActions(false);
            setShowTeacher(2); // 确保退出示教模式
            setArmIsInteracting(false); // 重置交互状态
          }}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: !showRobotArmTarget && !showHandComponents && !showPresetActions ? '#3498db' : '#95a5a6',
            color: 'white',
            border: !showRobotArmTarget && !showHandComponents && !showPresetActions ? '2px solid #1c6ea4' : 'none',
            borderRadius: '5px',
            fontWeight: !showRobotArmTarget && !showHandComponents && !showPresetActions ? 'bold' : 'normal',
            cursor: 'pointer',
            boxShadow: !showRobotArmTarget && !showHandComponents && !showPresetActions ? '0 0 8px #3498db55' : 'none',
            transition: 'all 0.2s',
            minWidth: '140px',
            textAlign: 'center'
          }}
        >
          手臂控制模式
        </button>

        <button
          onClick={() => { 
            setShowRobotArmTarget(true); 
            setShowHandComponents(false); 
            setShowPresetActions(false);
            setShowTeacher(2); // 确保退出示教模式
            setArmIsInteracting(false); // 重置交互状态
          }}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: showRobotArmTarget && !showHandComponents && !showPresetActions ? '#3498db' : '#95a5a6',
            color: 'white',
            border: showRobotArmTarget && !showHandComponents && !showPresetActions ? '2px solid #1c6ea4' : 'none',
            borderRadius: '5px',
            fontWeight: showRobotArmTarget && !showHandComponents && !showPresetActions ? 'bold' : 'normal',
            cursor: 'pointer',
            boxShadow: showRobotArmTarget && !showHandComponents && !showPresetActions ? '0 0 8px #3498db55' : 'none',
            transition: 'all 0.2s',
            minWidth: '140px',
            textAlign: 'center'
          }}
        >
          末端控制模式
        </button>

        <button
          onClick={() => { 
            setShowHandComponents(true); 
            setShowRobotArmTarget(false);
            setShowPresetActions(false);
          }}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: showHandComponents && !showPresetActions ? '#3498db' : '#95a5a6',
            color: 'white',
            border: showHandComponents && !showPresetActions ? '2px solid #1c6ea4' : 'none',
            borderRadius: '5px',
            fontWeight: showHandComponents && !showPresetActions ? 'bold' : 'normal',
            cursor: 'pointer',
            boxShadow: showHandComponents && !showPresetActions ? '0 0 8px #3498db55' : 'none',
            transition: 'all 0.2s',
            minWidth: '140px',
            textAlign: 'center'
          }}
        >
          手掌控制模式
        </button>

        <button
          onClick={togglePresetActions}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: showPresetActions ? '#3498db' : '#95a5a6',
            color: 'white',
            border: showPresetActions ? '2px solid #1c6ea4' : 'none',
            borderRadius: '5px',
            fontWeight: showPresetActions ? 'bold' : 'normal',
            cursor: 'pointer',
            boxShadow: showPresetActions ? '0 0 8px #3498db55' : 'none',
            transition: 'all 0.2s',
            minWidth: '140px',
            textAlign: 'center'
          }}
        >
          预设动作模式
        </button>
              </div>

                {/* 示教组件 - 只在非手掌模式和预设动作模式下显示 */}
        {showTeacher !== 2 && !showHandComponents && !showPresetActions && <Teacher />}

      {/* 机器人主视图 - 手臂控制模式 */}
      {!showHandComponents && !showPresetActions && !showRobotArmTarget && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
          <RobotViewer
            rosServiceCalling={armRosServiceCalling}
            isInteracting={armIsInteracting}
            onInteractionChange={onArmIsInteractingChange}
            realTimeLeftArmValues={realTimeLeftArmValues}
            realTimeRightArmValues={realTimeRightArmValues}
            plannedLeftArmValues={plannedLeftArmValues}
            plannedRightArmValues={plannedRightArmValues}
            onLeftControlChange={handlePlannedLeftArmChange}
            onRightControlChange={handlePlannedRightArmChange}
            onLeftMoveJSrvCall={handleLeftArmMoveJSrvCall}
            onRightMoveJSrvCall={handleRightArmMoveJSrvCall}
            style={{ width: '100%', height: '100%' }}
            showRobotArmTarget={false}
            L_HandRef={L_HandRef}
            R_HandRef={R_HandRef}
            CoordinatesTemp={CoordinatesTemp}
            setCoordinatesTemp={setCoordinatesTemp}
            handleLeftArmMoveLSrvCall={handleLeftArmMoveLSrvCall}
            handleRightArmMoveLSrvCall={handleRightArmMoveLSrvCall}
          />
        </div>
      )}

      {/* 末端控制模式界面 - 采用与预设动作模式相同的布局 */}
      {showRobotArmTarget && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
          {/* 机器人主视图 - 与其他模式相同，但不显示内部的RobotArmTarget */}
          <RobotViewer
            rosServiceCalling={armRosServiceCalling}
            isInteracting={armIsInteracting}
            onInteractionChange={onArmIsInteractingChange}
            realTimeLeftArmValues={realTimeLeftArmValues}
            realTimeRightArmValues={realTimeRightArmValues}
            plannedLeftArmValues={plannedLeftArmValues}
            plannedRightArmValues={plannedRightArmValues}
            onLeftControlChange={handlePlannedLeftArmChange}
            onRightControlChange={handlePlannedRightArmChange}
            onLeftMoveJSrvCall={handleLeftArmMoveJSrvCall}
            onRightMoveJSrvCall={handleRightArmMoveJSrvCall}
            style={{ width: '100%', height: '100%' }}
            showRobotArmTarget={false} // 重要：设置为false，不在RobotViewer内部显示
            L_HandRef={L_HandRef}
            R_HandRef={R_HandRef}
            CoordinatesTemp={CoordinatesTemp}
            setCoordinatesTemp={setCoordinatesTemp}
            handleLeftArmMoveLSrvCall={handleLeftArmMoveLSrvCall}
            handleRightArmMoveLSrvCall={handleRightArmMoveLSrvCall}
          />

          {/* 左侧末端控制面板 - 使用重构后的RobotArmTarget组件 */}
          <div style={{
            position: 'absolute',
            left: '2%',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '280px',
            zIndex: 10
          }}>
            <RobotArmTarget
              type="L"
              CoordinatesTemp={CoordinatesTemp}
              setCoordinatesTemp={setCoordinatesTemp}
              currentChoosedHandRef={null}
              rosServiceCalling={armRosServiceCalling}
              HandRef={L_HandRef}
              MoveLSrvCall={handleLeftArmMoveLSrvCall}
            />
          </div>

          {/* 右侧末端控制面板 - 使用重构后的RobotArmTarget组件 */}
          <div style={{
            position: 'absolute',
            right: '2%',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '280px',
            zIndex: 10
          }}>
            <RobotArmTarget
              type="R"
              CoordinatesTemp={CoordinatesTemp}
              setCoordinatesTemp={setCoordinatesTemp}
              currentChoosedHandRef={null}
              rosServiceCalling={armRosServiceCalling}
              HandRef={R_HandRef}
              MoveLSrvCall={handleRightArmMoveLSrvCall}
            />
          </div>
        </div>
      )}

      {/* 预设动作模式界面 */}
      {showPresetActions && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
          {/* 机器人主视图 - 与手臂控制模式相同 */}
          <RobotViewer
            rosServiceCalling={armRosServiceCalling}
            isInteracting={armIsInteracting}
            onInteractionChange={onArmIsInteractingChange}
            realTimeLeftArmValues={realTimeLeftArmValues}
            realTimeRightArmValues={realTimeRightArmValues}
            plannedLeftArmValues={plannedLeftArmValues}
            plannedRightArmValues={plannedRightArmValues}
            onLeftControlChange={handlePlannedLeftArmChange}
            onRightControlChange={handlePlannedRightArmChange}
            onLeftMoveJSrvCall={handleLeftArmMoveJSrvCall}
            onRightMoveJSrvCall={handleRightArmMoveJSrvCall}
            style={{ width: '100%', height: '100%' }}
            showRobotArmTarget={false}
            L_HandRef={L_HandRef}
            R_HandRef={R_HandRef}
            CoordinatesTemp={CoordinatesTemp}
            setCoordinatesTemp={setCoordinatesTemp}
            handleLeftArmMoveLSrvCall={handleLeftArmMoveLSrvCall}
            handleRightArmMoveLSrvCall={handleRightArmMoveLSrvCall}
          />

          {/* 左侧预设动作控制面板 - 动作1-6 */}
          <div style={{
            position: 'absolute',
            left: '2%',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '300px',
            zIndex: 10
          }}>
            <PresetActionPanel
              actions={[
                { id: 1, name: '前进', description: '预设动作1' },
                { id: 2, name: '后退', description: '预设动作2' },
                { id: 3, name: '左转', description: '预设动作3' },
                { id: 4, name: '右转', description: '预设动作4' },
                { id: 5, name: '挥手', description: '预设动作5' },
                { id: 6, name: '动作6', description: '预设动作6' }
              ]}
              rosServiceCalling={armRosServiceCalling}
              onPresetAction={handlePresetAction}
              onPresetActionPress={handlePresetActionPress}
              onPresetActionRelease={handlePresetActionRelease}
            />
          </div>

          {/* 右侧预设动作控制面板 - 动作7-12 */}
          <div style={{
            position: 'absolute',
            right: '2%',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '300px',
            zIndex: 10
          }}>
            <PresetActionPanel
              actions={[
                { id: 7, name: '运行', description: '预设动作7' },
                { id: 8, name: '软急停', description: '预设动作8' },
                { id: 9, name: '关机', description: '预设动作9' },
                { id: 10, name: '动作10', description: '预设动作10' },
                { id: 11, name: '动作11', description: '预设动作11' },
                { id: 12, name: '动作12', description: '预设动作12' }
              ]}
              rosServiceCalling={armRosServiceCalling}
              onPresetAction={handlePresetAction}
              onPresetActionPress={handlePresetActionPress}
              onPresetActionRelease={handlePresetActionRelease}
            />
          </div>
        </div>
      )}

      {/* 手掌专用模式界面 - 完全独立的手掌控制环境 */}
      {showHandComponents && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, backgroundColor: '#f0f0f0' }}>
          <div style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
            <h2 style={{ color: '#333', fontSize: '28px', margin: 0, fontWeight: 'bold' }}>手掌控制模式</h2>
          </div>

          <div style={{ 
            position: 'absolute', 
            top: '15%', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            width: '60%', 
            height: '70%', 
            display: 'flex',
            gap: '30px',
            justifyContent: 'center',
            alignItems: 'flex-start',
            zIndex: 2 
          }}>
            <div style={{ 
              flex: '1',
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}>
              <h3 style={{ color: '#333', textAlign: 'center', marginBottom: '15px', fontSize: '20px' }}>左手显示</h3>
              <div style={{ 
                flex: '1',
                transform: 'scale(1.5)', 
                transformOrigin: 'center center',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <HandViewer
                  isInteracting={handIsInteracting}
                  onInteractionChange={onHandIsInteractingChange}
                  rosServiceCalling={handRosServiceCalling}
                  realTimeHandValues={realTimeLeftHandValues}
                  plannedHandValues={plannedLeftHandValues}
                  type="L"
                  onControlChange={handlePlannedLeftHandChange}
                  onHandSrvCall={handleLeftHandMoveServiceCall}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>

            <div style={{ 
              flex: '1',
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}>
              <h3 style={{ color: '#333', textAlign: 'center', marginBottom: '15px', fontSize: '20px' }}>右手显示</h3>
              <div style={{ 
                flex: '1',
                transform: 'scale(1.5)', 
                transformOrigin: 'center center',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <HandViewer
                  isInteracting={handIsInteracting}
                  onInteractionChange={onHandIsInteractingChange}
                  rosServiceCalling={handRosServiceCalling}
                  realTimeHandValues={realTimeRightHandValues}
                  plannedHandValues={plannedRightHandValues}
                  type="R"
                  onControlChange={handlePlannedRightHandChange}
                  onHandSrvCall={handleRightHandMoveJServiceCall}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* 左侧手掌滑块控制面板 */}
          <div style={{
            position: 'absolute',
            left: '2%',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '300px',
            zIndex: 10
          }}>
            <HandSliderControl
              isInteracting={handIsInteracting}
              onInteractionChange={onHandIsInteractingChange}
              rosServiceCalling={handRosServiceCalling}
              realTimeHandValues={realTimeLeftHandValues}
              plannedHandValues={plannedLeftHandValues}
              type="L"
              onControlChange={handlePlannedLeftHandChange}
              onHandSrvCall={handleLeftHandMoveServiceCall}
            />
          </div>

          {/* 右侧手掌滑块控制面板 */}
          <div style={{
            position: 'absolute',
            right: '2%',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '300px',
            zIndex: 10
          }}>
            <HandSliderControl
              isInteracting={handIsInteracting}
              onInteractionChange={onHandIsInteractingChange}
              rosServiceCalling={handRosServiceCalling}
              realTimeHandValues={realTimeRightHandValues}
              plannedHandValues={plannedRightHandValues}
              type="R"
              onControlChange={handlePlannedRightHandChange}
              onHandSrvCall={handleRightHandMoveJServiceCall}
            />
          </div>
        </div>
      )}

      {/* Arm控制模式的滑块控制面板 - 核心改进部分 */}
      <div>
        {showRobotArmTarget ? null : (
          !showHandComponents && !showPresetActions && (
            <>
              {/* 左臂滑块控制面板 - 使用新的统一风格组件 */}
              <div style={{
                position: 'absolute',
                left: '2%',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '300px',
                zIndex: 10
              }}>
                <ArmSliderControl
                  isInteracting={armIsInteracting}
                  onInteractionChange={onArmIsInteractingChange}
                  rosServiceCalling={armRosServiceCalling}
                  realTimeArmValues={realTimeLeftArmValues}
                  plannedArmValues={plannedLeftArmValues}
                  type="L"
                  onControlChange={handlePlannedLeftArmChange}
                  onMoveJSrvCall={handleLeftArmMoveJSrvCall}
                  isOnTeacherMode={showTeacher !== 2}
                  // 传递右臂的状态和回调函数
                  realTimeOtherArmValues={realTimeRightArmValues}
                  plannedOtherArmValues={plannedRightArmValues}
                  onOtherMoveJSrvCall={handleRightArmMoveJSrvCall}
                />
              </div>
              
              {/* 右臂滑块控制面板 - 使用新的统一风格组件 */}
              <div style={{
                position: 'absolute',
                right: '2%',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '300px',
                zIndex: 10
              }}>
                <ArmSliderControl
                  isInteracting={armIsInteracting}
                  onInteractionChange={onArmIsInteractingChange}
                  rosServiceCalling={armRosServiceCalling}
                  realTimeArmValues={realTimeRightArmValues}
                  plannedArmValues={plannedRightArmValues}
                  type="R"
                  onControlChange={handlePlannedRightArmChange}
                  onMoveJSrvCall={handleRightArmMoveJSrvCall}
                  isOnTeacherMode={showTeacher !== 2}
                  // 传递左臂的状态和回调函数
                  realTimeOtherArmValues={realTimeLeftArmValues}
                  plannedOtherArmValues={plannedLeftArmValues}
                  onOtherMoveJSrvCall={handleLeftArmMoveJSrvCall}
                />
              </div>
            </>
          )
        )}
      </div>
      {/* 新增底部状态面板 */}
      <StatusPanel 
        isConnected={isConnected} 
        errorMessage={errorMessage} 
        robotState={robotState}
        robotStateInfo={robotStateInfo}
      />
    </div>
  );
};

export default App;