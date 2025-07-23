import React, { useState, useEffect } from 'react';
import { Box, Button, Slider, Typography } from '@mui/material';
import RobotArmTargetSlider from './RobotArmTargetSlider';
import config from "../config"; // 引入配置文件

/*
模型(L_HandRef,R_HandRef)的目标控制面板 - 统一样式版本
 */

const RobotArmTarget = ({
    type,
    currentChoosedHandRef,
    CoordinatesTemp,
    setCoordinatesTemp,
    HandRef,
    MoveLSrvCall,
    rosServiceCalling,
}) => {
    const index_LorR = type === 'L' ? 'Left' : 'Right';
    
    // 加载预设模型配置 leftHand or rightHand
    const jointConfigs = type === "L" ? config.handTargetJointLimits.leftHand : config.handTargetJointLimits.rightHand;

    // 步长状态管理
    const [positionStep, setPositionStep] = useState(config.handTargetStepConfig.position.default);
    const [orientationStep, setOrientationStep] = useState(config.handTargetStepConfig.orientation.default);

    // 步长变化处理函数
    const handlePositionStepChange = (event, newValue) => {
        setPositionStep(newValue);
    };

    const handleOrientationStepChange = (event, newValue) => {
        setOrientationStep(newValue);
    };

    // 统一的外层容器样式 - 与预设动作控制面板保持一致，优化高度
    const containerStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '10px',
        padding: '15px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '380px',
        maxHeight: '75vh', // 限制最大高度为视口的75%
        overflowY: 'auto', // 如果内容过多则允许滚动
    };

    return (
        <div style={containerStyle}>
            {/* 统一的标题栏 - 与其他控制面板保持一致 */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px',
                borderBottom: '2px solid #3498db',
                paddingBottom: '8px'
            }}>
                <h3 style={{
                    margin: 0,
                    color: '#2c3e50',
                    fontSize: '16px',
                    fontWeight: 'bold'
                }}>
                    {type === 'L' ? '左臂' : '右臂'}末端控制
                </h3>
                <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: rosServiceCalling ? '#e74c3c' : '#27ae60'
                }} />
            </div>

            {/* 步长设置区域 */}
            <div style={{
                marginBottom: '15px',
                padding: '12px',
                backgroundColor: 'rgba(52, 152, 219, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(52, 152, 219, 0.2)'
            }}>
                <h4 style={{
                    margin: '0 0 12px 0',
                    color: '#2c3e50',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    textAlign: 'center'
                }}>
                    步长设置
                </h4>
                
                {/* 位置步长设置 */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px'
                    }}>
                        <label style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#34495e'
                        }}>
                            位置步长
                        </label>
                        <span style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: '#3498db',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            padding: '2px 6px',
                            borderRadius: '3px'
                        }}>
                            {positionStep.toFixed(3)}
                        </span>
                    </div>
                    <Slider
                        value={positionStep}
                        onChange={handlePositionStepChange}
                        min={config.handTargetStepConfig.position.min}
                        max={config.handTargetStepConfig.position.max}
                        step={config.handTargetStepConfig.position.step}
                        disabled={rosServiceCalling}
                        size="small"
                        sx={{
                            '& .MuiSlider-thumb': {
                                height: 16,
                                width: 16,
                            },
                            '& .MuiSlider-track': {
                                height: 4,
                            },
                            '& .MuiSlider-rail': {
                                height: 4,
                            }
                        }}
                    />
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '10px',
                        color: '#95a5a6',
                        marginTop: '4px'
                    }}>
                        <span>最小: {config.handTargetStepConfig.position.min}</span>
                        <span>最大: {config.handTargetStepConfig.position.max}</span>
                    </div>
                </div>

                {/* 姿态步长设置 */}
                <div style={{ marginBottom: '8px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px'
                    }}>
                        <label style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#34495e'
                        }}>
                            姿态步长
                        </label>
                        <span style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: '#3498db',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            padding: '2px 6px',
                            borderRadius: '3px'
                        }}>
                            {orientationStep}°
                        </span>
                    </div>
                    <Slider
                        value={orientationStep}
                        onChange={handleOrientationStepChange}
                        min={config.handTargetStepConfig.orientation.min}
                        max={config.handTargetStepConfig.orientation.max}
                        step={config.handTargetStepConfig.orientation.step}
                        disabled={rosServiceCalling}
                        size="small"
                        sx={{
                            '& .MuiSlider-thumb': {
                                height: 16,
                                width: 16,
                            },
                            '& .MuiSlider-track': {
                                height: 4,
                            },
                            '& .MuiSlider-rail': {
                                height: 4,
                            }
                        }}
                    />
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '10px',
                        color: '#95a5a6',
                        marginTop: '4px'
                    }}>
                        <span>最小: {config.handTargetStepConfig.orientation.min}°</span>
                        <span>最大: {config.handTargetStepConfig.orientation.max}°</span>
                    </div>
                </div>
            </div>

            {/* 控制滑块区域 */}
            <div style={{ marginBottom: '15px' }}>
                {jointConfigs.map((slider) => (
                    <RobotArmTargetSlider
                        name={slider.name}
                        min={slider.min}
                        max={slider.max}
                        key={slider.key}
                        id={slider.id}
                        currentChoosedHandRef={currentChoosedHandRef}
                        CoordinatesTemp={CoordinatesTemp}
                        setCoordinatesTemp={setCoordinatesTemp}
                        index_LorR={index_LorR}
                        HandRef={HandRef}
                        MoveLSrvCall={MoveLSrvCall}
                        rosServiceCalling={rosServiceCalling}
                        positionStep={positionStep}
                        orientationStep={orientationStep}
                    />
                ))}
            </div>

            {/* 状态提示区域 */}
            <div style={{
                marginTop: '10px',
                textAlign: 'center',
                fontSize: '11px',
                color: '#7f8c8d'
            }}>
                {rosServiceCalling && '正在执行末端运动...'}
                {!rosServiceCalling && '使用按钮控制机械臂末端位置'}
            </div>

            {/* 安全提示区域 */}
            <div style={{
                marginTop: '8px',
                padding: '6px 10px',
                backgroundColor: 'rgba(241, 196, 15, 0.1)',
                border: '1px solid rgba(241, 196, 15, 0.3)',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#f39c12',
                textAlign: 'center'
            }}>
                ⚠️ 控制末端位置前请确认机器人周围安全
            </div>
        </div>
    );
}

export default RobotArmTarget;
