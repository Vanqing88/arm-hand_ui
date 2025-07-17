import React from 'react';

const CollisionStatus = ({ hasCollision, collisionPairs }) => {
  const getStatusColor = () => {
    return hasCollision ? '#e74c3c' : '#27ae60'; // 红色碰撞，绿色正常
  };

  const getStatusText = () => {
    if (!hasCollision) {
      return '无碰撞';
    }
    
    if (collisionPairs.length === 1) {
      return '检测到碰撞';
    }
    
    return `检测到${collisionPairs.length}处碰撞`;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flex: 1,
      justifyContent: 'center'
    }}>
      <div style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: getStatusColor(),
        transition: 'background-color 0.3s ease',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
      }} />
      <span style={{
        fontSize: '14px',
        fontWeight: 500,
        color: '#2c3e50',
        transition: 'color 0.3s ease'
      }}>
        {getStatusText()}
      </span>
      
      {/* 碰撞详情 */}
      {hasCollision && collisionPairs.length > 0 && (
        <span style={{
          fontSize: '12px',
          color: '#7f8c8d',
          marginLeft: '4px'
        }}>
          ({collisionPairs.slice(0, 1).map(pair => pair.replace('-', '↔')).join(', ')}{collisionPairs.length > 1 ? '...' : ''})
        </span>
      )}
    </div>
  );
};

export default CollisionStatus; 