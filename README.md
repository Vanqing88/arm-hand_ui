[toc]

## 1. 项目简介
本前端包提供了数个交互式组件，用于控制机器人双手双臂共28个关节/自由度的位置：
- RobotViewer：
  - 加载并展示机器人上半身的URDF模型，用户可以通过鼠标拖动选择双臂任一关节并设置目标位置。
- ArmControl：
  - 左右手臂的控制组件，共2个，每个组件包含7个滑块，用于调整左手/右手的7个手臂关节/自由度的目标位置。
- HandViewer：
  - 加载左右手的URDF模型，共两个，分为左手和右手，用户可以通过鼠标拖动选中并设置手部关节的目标位置。
- HandControl：
  - 左右手控制组件，共2个，每个组件包含6个输入框用于设置左手/右手的6个关节/自由度的目标位置。
- ROSBridge连接状态提示：
  - 显示当前是否与 ROSBridge 成功连接，提供实时连接状态反馈。

![alt text](<public/Reference Images/1.png>)

通过本包，用户可以直观地控制机器人双臂和双手的各个关节位置，支持通过鼠标拖动、滑块或输入框等多种控制方式。

确定目标关节位置后将通过 RosBridge 调用相应的 rosservice，并给定目标关节位置作为参数，驱动机器人执行相应动作。

## 2. 安装与使用
### 2.1 安装依赖
本项目使用npm进行依赖管理，用户可以通过 npm install 安装依赖：
```bash
cd <your-repository>
npm install
```
npm install 会根据 package.json 文件中的配置安装所有项目依赖，确保开发环境正确配置。
### 2.2 快速启动
#### 2.2.1 开发模式
```bash
# 在开发过程中，用户可以使用以下命令启动应用
# 启动开发服务器后，打开浏览器并访问 http://localhost:3000 即可查看应用
cd <your-repository>
npm start
```
#### 2.2.2 构建生产版本
```bash
# 准备部署应用时，可以运行以下命令来构建优化后的生产版本
# 构建文件将会被放置在build文件夹中，可以上传到任何静态文件托管服务上
cd <your-repository>
npm run build
```
### 2.3 组件使用
#### 2.3.1 RobotViewer
RobotViewer组件加载机器人上半身的URDF（统一机器人描述格式）模型，提供了一个直观的用户界面，用户可以通过鼠标拖动来选中并设置机器人双臂各关节的位置，并进行交互式控制。每次鼠标操作（按下、拖动、松开）都会计算目标关节的期望位置，并通过ROSBridge与后端通信，将目标位置发送给机器人控制系统。

<div style="text-align: center;">
  <img src="public/Reference Images/robotviewer.png" alt="alt text" style="width: 50%;">
</div>

##### 交互流程
- 用户在机器人上半身模型中选择一个关节。
- 按下鼠标并拖动模型来调整关节的位置，目标关节位置会随鼠标的拖动而动态更新。
- 松开鼠标后，前端会通过ROSBridge调用相应的rosservice，控制机器人将该关节移动到设定的目标位置。

#### 2.3.2 ArmControl
ArmControl组件有两个，分别对应左臂和右臂，每个组件提供了7个滑块（每个关节/自由度对应一个滑块），允许用户精确控制每个关节的位置。单个滑块的限制范围为urdf模型和SDK中给定的关节限制范围的结合。每次滑动滑块时，前端会计算目标关节的期望值，并通过ROSBridge将该指令发送到后端，从而控制机器人进行相应的动作。

<div style="display: flex; justify-content: center; align-items: center; gap: 10px;">
  <img src="public/Reference Images/leftarmviewer.png" alt="Left Arm Viewer" style="width: 25%;">
  <img src="public/Reference Images/rightarmviewer.png" alt="Right Arm Viewer" style="width: 25%;">
</div>


##### 交互流程
- 用户通过滑动滑块来选择目标关节位置，滑块的范围由URDF模型和SDK给定的限制范围共同确定。
- 滑块调整时，目标关节位置实时显示。
- 松开滑块后，前端通过ROSBridge将目标关节位置发送到后端控制系统，驱动机器人执行相应的动作。

#### 2.3.3 HandViewer
HandViewer组件有两个，分别加载了左手和右手的URDF模型，用户可以通过鼠标选中并拖动模型上的关节来控制手部的运动。每次交互后，前端会通过ROSBridge将目标关节位置发送到后端，控制机器人手部关节移动到指定的位置。

<div style="display: flex; justify-content: center; align-items: center; gap: 10px;">
  <img src="public/Reference Images/lefthandviewer.png" alt="Left Hand Viewer" style="width: 35%;">
  <img src="public/Reference Images/righthandviewer.png" alt="Right Hand Viewer" style="width: 35%;">
</div>


##### 交互流程
- 用户在手部模型中按下鼠标选中一个关节。
- 拖动模型来调整关节位置，目标位置会随着鼠标拖动进行动态更新。
- 松开鼠标后，前端会向后端发送控制指令，要求机器人手部关节移动到新的目标位置。

#### 2.3.4 HandControl
HandControl组件有两个，对应左手和右手，每个组件允许用户通过6个输入框来控制手的6个关节的位置。用户在输入框中手动输入目标关节的位置，并按下Enter键后，前端会将该目标关节位置通过ROSBridge发送到后端，驱动机器人执行动作。

<div style="text-align: center;">
  <img src="public/Reference Images/handcontrol.png" alt="alt text" style="width: 60%;">
</div>

##### 交互流程
- 用户在输入框中填写目标关节的位置值，输入框对应手的6个关节/自由度。
- 按下Enter键后，前端会将填写的目标值通过ROSBridge发送给后端。
- 后端会解析目标值并控制机器人手部关节到达相应位置。

#### 2.3.5 ROSBridge连接状态
ROSBridge连接状态组件显示前端是否已成功连接到ROSBridge服务器，实时显示当前的连接状态。通过该组件，用户可以知道前端是否与ROS系统保持有效的通信通道。

<div style="text-align: center;">
  <img src="public/Reference Images/connectedstate.png" alt="alt text" style="width: 35%;">
</div>

##### 状态指示
- 绿色字体：“Connected to ROSBridge”表示与ROSBridge的连接正常。
- 红色字体：“Not connected to ROSBridge”表示当前未与ROSBridge连接。

### 2.4 配置选项
#### 2.4.1 ROSBridge URL
在配置文件中，可以指定连接的ROSBridge服务器地址。ROSBridge通过WebSocket协议与前端进行通信，因此需要配置WebSocket服务器的URL：
```javascript
const ros = new ROSLIB.Ros({
  url: 'ws://<ROSBridge服务器>:9090' // 默认值：ws://localhost:9090（本地运行ROSBridge）
});
```
注意：
- 如果ROSBridge运行在远程服务器上，需要修改为该服务器的IP地址。
- 在使用过程中，确保网络连接稳定，避免WebSocket连接中断。
- 若遇到连接问题，可以检查ROSBridge服务器是否正常启动，或者WebSocket端口是否被防火墙阻塞。

## 3. 开发与贡献
如果需要对此功能包做进一步的开发，可以参考下面的步骤和建议：
- 将功能包从Gitlab克隆到本地：
```bash
git clone http://<Repo IP>/<username>/<repository>.git

```
- 安装依赖
```bash
cd <your-repository>
npm install
```
- 在本地开发过程中，修改代码并通过运行本地服务器进行测试。可以使用以下命令启动开发服务器：
```bash
npm start
```
- 提交Pull Request：确保添加了合适的测试并编写了清晰的文档。
```bash
git add . 
git commit -m "<Description>"
git push origin <Branch>
```