import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Slider, Button, IconButton } from '@mui/material';
import * as THREE from "three";
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';

/*
模型(L_HandRef,R_HandRef)的目标滑块 用度数 有度数转弧度的逻辑 cause CoordinatesTemp需要弧度
统一样式版本 - 与预设动作控制面板风格保持一致
 */

const RobotArmTargetSlider = ({
  name,        // 滑块名称（比如 "X Position"）
  min,         // 最小值
  max,         // 最大值
  id,         // 滑块 id属性 用于作为坐标更改的 key值
  step , // 步长
  currentChoosedHandRef, //目前好像没用
  HandRef,
  CoordinatesTemp,
  setCoordinatesTemp,
  index_LorR, // 用于区分左右手的键值
  value: initialValue = 0,
  MoveLSrvCall,
  rosServiceCalling,
}) => {
  // 初始化 value 的默认值
  let initialCalculatedValue = initialValue;

  if (id === 'x' || id === 'y' || id === 'z') { //xyz坐标
    initialCalculatedValue = Number(CoordinatesTemp[index_LorR][id].toFixed(3));
    step = 0.003; 
  }
  else if (id === 'xR' || id === 'yR' || id === 'zR') {// 将PI弧度转换为180角度
    initialCalculatedValue = Number(THREE.MathUtils.radToDeg(CoordinatesTemp[index_LorR][id]).toFixed(1));
    step = 15;
  }

  // 使用 useState 来管理基础值和累计变化值
  const [baseValue, setBaseValue] = useState(initialCalculatedValue);
  const [accumValue, setAccumValue] = useState(0); // 累计变化值
  
  // 显示值 = 基础值 + 累计变化值
  const displayValue = Number((baseValue + accumValue).toFixed(3));

  // 添加一个状态来跟踪是否处于用户主动控制中
  const [isUserControlling, setIsUserControlling] = useState(false);

  // 长按相关的状态
  const [pressing, setPressing] = useState(false);
  const [pressDirection, setPressDirection] = useState(0); // 1 表示增加，-1 表示减少
  const longPressTimerRef = useRef(null);
  const intervalRef = useRef(null);
  const pressStartTimeRef = useRef(0);
  const currentStepRef = useRef(step);

  // 当 CoordinatesTemp 发生变化时更新基础值，但只在不是用户主动控制时更新
  useEffect(() => {
    if (!isUserControlling) {
      if (id === 'x' || id === 'y' || id === 'z') {
        setBaseValue(Number(CoordinatesTemp[index_LorR][id].toFixed(3)));
      } else if (id === 'xR' || id === 'yR' || id === 'zR') {
        setBaseValue(Number(THREE.MathUtils.radToDeg(CoordinatesTemp[index_LorR][id]).toFixed(1)));
      }
      setAccumValue(0); // 重置累计值
    }
  }, [CoordinatesTemp, index_LorR, id, isUserControlling]);

  // 用于 ROS 服务调用完成后重新同步数据的计时器
  const syncTimerRef = useRef(null);

  // 处理长按效果
  useEffect(() => {
    if (pressing && pressDirection !== 0) {
      // 清除之前的定时器
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // 设置新的定时器，每200ms执行一次
      intervalRef.current = setInterval(() => {
        const pressDuration = Date.now() - pressStartTimeRef.current;

        // 根据按下时间调整步长
        if (pressDuration > 500) {
          // 长按超过0.5秒，使用2倍步长
          currentStepRef.current = step * 2;
        } else {
          // 初始使用基本步长
          currentStepRef.current = step;
        }

        // 累加变化值
        const delta = pressDirection * currentStepRef.current;
        setAccumValue(prev => Number((prev + delta).toFixed(3)));
        
      }, 200); // 每200毫秒累加一次

      // 清理函数
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [pressing, pressDirection, step]);

  // 按下按钮时触发
  const handleButtonDown = (direction) => {
    // 标记为用户控制状态
    setIsUserControlling(true);

    // 记录按下时间和方向
    pressStartTimeRef.current = Date.now();
    setPressDirection(direction);

    // 设置延时，如果超过200ms没有释放，就认为是长按
    longPressTimerRef.current = setTimeout(() => {
      setPressing(true);
    }, 200);

    // 立即应用一次变化（单击效果）
    const delta = direction * step;
    setAccumValue(prev => Number((prev + delta).toFixed(3)));
  };

  // 释放按钮时触发
  const handleButtonUp = () => {
    // 清除长按计时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    // 重置长按状态
    setPressing(false);
    setPressDirection(0);
    currentStepRef.current = step;

    // 鼠标松开时，调用MoveLSrvCall发送累计的变化
    if (accumValue !== 0) {
      MoveLSrvCall(accumValue, id);
    }

    // 设置定时器恢复同步
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = setTimeout(() => {
      setIsUserControlling(false);
      setAccumValue(0); // 重置累计值
    }, 1000);
  };

  // 组件卸载时清理所有计时器
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      margin: '6px 0',
      backgroundColor: isUserControlling ? 'rgba(52, 152, 219, 0.1)' : 'rgba(236, 240, 241, 0.8)', 
      borderRadius: '6px',
      padding: '8px',
      border: isUserControlling ? '1px solid rgba(52, 152, 219, 0.3)' : '1px solid rgba(189, 195, 199, 0.3)',
      transition: 'all 0.3s ease'
    }}>
      {/* 标签和数值显示 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: '8px'
      }}>
        <label style={{
          fontSize: '12px',
          fontWeight: '500',
          color: '#34495e'
        }}>
          {name}
        </label>
        <span style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: isUserControlling ? '#3498db' : '#2c3e50',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: '3px 6px',
          borderRadius: '3px',
          minWidth: '50px',
          textAlign: 'center'
        }}>
          {displayValue}
        </span>
      </div>

      {/* 控制按钮区域 */}
      <div style={{
        display: 'flex',
        gap: '10px',
        justifyContent: 'center',
        width: '100%'
      }}>
        <button
          onMouseDown={() => handleButtonDown(-1)}
          onMouseUp={handleButtonUp}
          onMouseLeave={handleButtonUp}
          onTouchStart={() => handleButtonDown(-1)}
          onTouchEnd={handleButtonUp}
          disabled={rosServiceCalling}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            border: 'none',
            borderRadius: '6px',
            cursor: rosServiceCalling ? 'not-allowed' : 'pointer',
            backgroundColor: rosServiceCalling ? '#95a5a6' : '#e74c3c',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            opacity: rosServiceCalling ? 0.6 : 1,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
        >
          <ArrowDownward fontSize="small" />
        </button>

        <button
          onMouseDown={() => handleButtonDown(1)}
          onMouseUp={handleButtonUp}
          onMouseLeave={handleButtonUp}
          onTouchStart={() => handleButtonDown(1)}
          onTouchEnd={handleButtonUp}
          disabled={rosServiceCalling}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            border: 'none',
            borderRadius: '6px',
            cursor: rosServiceCalling ? 'not-allowed' : 'pointer',
            backgroundColor: rosServiceCalling ? '#95a5a6' : '#27ae60',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            opacity: rosServiceCalling ? 0.6 : 1,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
        >
          <ArrowUpward fontSize="small" />
        </button>
      </div>

      {/* 范围提示 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '9px',
        color: '#95a5a6',
        width: '100%',
        marginTop: '6px'
      }}>
        <span>最小: {min}</span>
        <span>最大: {max}</span>
      </div>
    </div>
  );
};

export default RobotArmTargetSlider;