import React from 'react';

const GlobalControlButtons = ({ 
  onRun, 
  onEmergencyStop, 
  onShutdown,
  rosServiceCalling,
  disabled = false 
}) => {
  return (
    <div style={{
      position: 'fixed',
      top: '5px', // 调整到顶部按钮栏下方
      right: '20px', // 保持右边距
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '6px', // 进一步减小按钮间距
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      padding: '10px', // 进一步减小内边距
      borderRadius: '8px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
      minWidth: '100px', // 进一步减小宽度
      border: '2px solid #3498db',
      backdropFilter: 'blur(10px)' // 添加毛玻璃效果
    }}>
      
      {/* 运行按钮 */}
      <button
        onClick={onRun}
        disabled={disabled || rosServiceCalling}
        style={{
          width: '100%',
          padding: '8px 6px', // 进一步调整内边距
          fontSize: '12px', // 进一步减小字体
          fontWeight: 'bold',
          border: 'none',
          borderRadius: '6px',
          cursor: (disabled || rosServiceCalling) ? 'not-allowed' : 'pointer',
          backgroundColor: (disabled || rosServiceCalling) ? '#95a5a6' : '#27ae60',
          color: 'white',
          transition: 'all 0.3s ease',
          opacity: (disabled || rosServiceCalling) ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}
      >
        <span style={{ fontSize: '11px' }}>▶</span>
        <span>运行</span>
      </button>

      {/* 软急停按钮 */}
      <button
        onClick={onEmergencyStop}
        disabled={disabled || rosServiceCalling}
        style={{
          width: '100%',
          padding: '8px 6px', // 进一步调整内边距
          fontSize: '12px', // 进一步减小字体
          fontWeight: 'bold',
          border: 'none',
          borderRadius: '6px',
          cursor: (disabled || rosServiceCalling) ? 'not-allowed' : 'pointer',
          backgroundColor: (disabled || rosServiceCalling) ? '#95a5a6' : '#e74c3c',
          color: 'white',
          transition: 'all 0.3s ease',
          opacity: (disabled || rosServiceCalling) ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}
      >
        <span style={{ fontSize: '11px' }}>⏸</span>
        <span>软急停</span>
      </button>

      {/* 关机按钮 */}
      <button
        onClick={onShutdown}
        disabled={disabled || rosServiceCalling}
        style={{
          width: '100%',
          padding: '8px 6px', // 进一步调整内边距
          fontSize: '12px', // 进一步减小字体
          fontWeight: 'bold',
          border: 'none',
          borderRadius: '6px',
          cursor: (disabled || rosServiceCalling) ? 'not-allowed' : 'pointer',
          backgroundColor: (disabled || rosServiceCalling) ? '#95a5a6' : '#34495e',
          color: 'white',
          transition: 'all 0.3s ease',
          opacity: (disabled || rosServiceCalling) ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}
      >
        <span style={{ fontSize: '11px' }}>⏹</span>
        <span>关机</span>
      </button>
    </div>
  );
};

export default GlobalControlButtons;