// ActionButtons.js
import React, { useState } from 'react';

const ActionButtons = ({ mergedData, handleExecuteMoveL}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [buttonText, setButtonText] = useState('执行');
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const handleExecute = () => {
    handleExecuteMoveL();
    setButtonText('执行中');
    setIsButtonDisabled(true);

    setTimeout(() => {
      setButtonText('执行完成');
      setTimeout(() => {
        setButtonText('执行');
        setIsButtonDisabled(false);
      }, 500); // 延迟500ms后恢复
    }, 2000); // 执行2秒后显示执行完成
  };

  // generateCSVData 在 ActionButtons 中完成
  const generateCSVData = () => {
    const { leftHand, rightHand, leftArm, rightArm } = mergedData;
    const data = [
      ['Joint Name', 'Left Hand Thumb', 'Left Hand Index', 'Left Hand Middle', 'Left Hand Ring', 'Left Hand Little', 'Right Hand Thumb', 'Right Hand Index', 'Right Hand Middle', 'Right Hand Ring', 'Right Hand Little', 'Joint Values'],
      ...Object.keys(leftHand).map(key => [
        key,
        leftHand[key],
        rightHand[key] || 0,
        JSON.stringify(leftArm),
        JSON.stringify(rightArm),
      ]),
    ];

    const csvContent = data.map(row => row.join(',')).join('\n');
    return csvContent;
  };

  // saveCSV 在 ActionButtons 中完成
  const saveCSV = () => {
    const csvData = generateCSVData();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'robot_arm_data.csv';
    link.click();
  };

  return (
    <div style={{ position: 'absolute', top: '2%', left: '50%', zIndex: 10, transform: 'translateX(-50%)' }}>
      {/* 保存按钮 */}
      <button
        onClick={saveCSV}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          marginRight: '10px',
        }}
      >
        保存
      </button>

      {/* 执行按钮 */}
      <button
        onClick={handleExecute}
        disabled={isButtonDisabled}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: isButtonDisabled ? '#ccc' : '#FF9800',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
        }}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default ActionButtons;
