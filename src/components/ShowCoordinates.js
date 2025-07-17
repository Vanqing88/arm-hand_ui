import React, { useState, useEffect } from 'react';

/*
此js文件用于显示生成的模型(L_HandRef,R_HandRef)坐标 
*/

const ShowCoordinates = ({ Taro }) => {
  const [aaaa, setAaaa] = useState(true); // 未来的超出手臂执行范围的判断
  const [errorOne, setErrorOne] = useState("");
  const distance = (point) => Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z); //标点 (x, y, z) 的欧几里得距离
  useEffect(() => {
    const rightHandDistance = distance(Taro.Right);
    const leftHandDistance = distance(Taro.Left);

    if (rightHandDistance > 0.539 || leftHandDistance > 0.539) { //TORSO（躯干） 到 WRIST（手腕） 目：

      setAaaa(false);
      setErrorOne(
      rightHandDistance > 0.539 && leftHandDistance > 0.539
        ? 'Both Hand'
        : rightHandDistance > 0.539
        ? 'Right Hand'
        : 'Left Hand'
      );
    } else {
      setAaaa(true);
    }
  }, [Taro]); // 只有 Taro 变化时才触发更新




  return (
    <div
      style={{
        position: 'absolute',
        padding: '10px',
        top: '5%',
        left: '23%',
        //backgroundColor: '#fff'
        //borderRadius: '5px',
        //boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
        textAlign: 'center',
        marginTop: '10px',
        //opacity: 0.8, 

      }}
    >
      {aaaa ? (
        <>
          <h4>球体位置</h4>
          <p>
            <strong>Right Hand:</strong> x: {Taro.Right.x.toFixed(3)}, y: {Taro.Right.y.toFixed(3)}, z: {Taro.Right.z.toFixed(3)} ,
            {/* <br /> */}
            {/* xR: {Taro.Right.xR.toFixed(3)}, yR: {Taro.Right.yR.toFixed(3)}, zR: {Taro.Right.zR.toFixed(3)} */}
          </p>
          <p>
            <strong>Left Hand:</strong> x: {Taro.Left.x.toFixed(3)}, y: {Taro.Left.y.toFixed(3)}, z: {Taro.Left.z.toFixed(3)} ,
            {/* xR: {Taro.Left.xR.toFixed(3)}, yR: {Taro.Left.yR.toFixed(3)}, zR: {Taro.Left.zR.toFixed(3)} */}
          </p>
        </>
      ) : (
        <p>注意<br/>{errorOne}超出能达到手臂范围，终端无法执行</p>
      )}
    </div>
  );
};


export default ShowCoordinates;
