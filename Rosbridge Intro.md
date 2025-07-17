[toc]


## 1. 简介
本文档主要介绍如何在前端应用中通过 ROSBridge 与 ROS 系统进行通信。

ROSBridge 通过 WebSocket 协议允许 Web 客户端（如浏览器中的 JavaScript 前端应用）与 ROS 系统进行实时数据交换，从而实现远程控制和数据获取。

在本篇文档中，我们将详细介绍 ROSBridge 的使用方法、通信架构，以及前端和 ROS 系统双方需要做的准备工作。

### 1.1 ROSBridge 原理
ROSBridge 是 ROS 系统与 Web 应用之间的桥梁，主要通过 WebSocket 协议与前端应用进行实时通信。它使得前端开发者可以通过 JavaScript 使用 roslib.js 与 ROS 系统中的 topic、service、action、param 等进行交互。
```sql
+-------------------+         WebSocket (ws://<ROSBridge Server>:9090)         +-----------------+
|                   | <---------------------------------------------> |                 |
|    Frontend       |      (JS Web App using roslib.js)              |   ROSBridge     |
|   (Web Browser)   | <---------------------------------------------> |  (WebSocket     |
|                   |     Publishes/Subscribes Topics, Calls Services  |   Server)       |
|                   |      and Actions to ROS system                 |                 |
+-------------------+                                             +-----------------+
             |                                                           |
             |  Communication through WebSocket (ROSBridge)              |
             |                                                           |
             v                                                           v
+-------------------+         +-------------------------------------+   +---------------------+
|                   |         |                                     |   |                     |
|  ROS System       |         |  ROS Topics (Publish/Subscribe)     |   |  ROS Services (Req/Res)|
|                   |         |                                     |   |                     |
|  (Robot, Sensor,  |         |  e.g., /cmd_vel, /scan             |   |  e.g., /get_robot_state|
|   Control System) |         |                                     |   |                     |
|                   |         +-------------------------------------+   +---------------------+
|                   |
|                   |
+-------------------+
```

#### 1.1.1 工作原理
ROSBridge 通过 WebSocket 启动一个服务器，前端应用（通常是浏览器中的 JavaScript）通过 WebSocket 连接到 ROSBridge 服务端。

ROSBridge 充当前端与 ROS 系统之间的通信中介，它将前端发送的消息转化为 ROS 消息，并将 ROS 系统中的数据转发到前端。ROSBridge 允许 Web 应用：
- 订阅 ROS 系统中的 topic，获取实时数据；
- 向 ROS 系统发布消息；
- 调用 ROS 服务进行远程操作；
- 使用 ROS 动作（action）接口进行更复杂的交互。

#### 1.1.2 WebSocket 通信
ROSBridge 使用 WebSocket 协议与前端进行实时通信。WebSocket 是一种全双工协议，它允许前后端在一个持续的连接上进行数据交换，而无需每次请求时都建立新的连接。

通过 WebSocket，前端应用可以随时向 ROS 发送消息，并立即接收 ROS 返回的数据。


## 2. ROSBridge 配置
### 2.1 配置 ROSBridge 服务端
ROSBridge 服务端需要在 ROS 系统中安装和配置。可以使用以下步骤来启动 ROSBridge 服务端：
#### 2.1.1 安装 ROSBridge 包：
如果尚未安装 rosbridge server，可以通过以下命令进行安装：
```bash
# 请将 <distro> 替换为你使用的 ROS 发行版（例如，melodic、noetic）
sudo apt-get install ros-<distro>-rosbridge-server
```
对于只需要 WebSocket 服务器功能的场景，只安装上面的 rosbridge server 就足够了，但是如果需要使用 rosbridge 实现更全面的 ROS 通信功能，可以安装 rosbridge_suite 这个套件，其中包括：
- rosbridge_server：WebSocket 服务器.
- rosbridge_library：提供了一些 Python 库，用于在 Python 脚本中使用 ROS 通信功能.
- rosbridge_client：一些示例客户端代码，用于演示如何与 rosbridge_server 通信.
```bash
# 请将 <distro> 替换为你使用的 ROS 发行版（例如，melodic、noetic）
sudo apt-get install ros-<distro>-rosbridge-suite
```
#### 2.1.2 配置 ROSBridge WebSocket Server：
安装完成后，我们需要按照我们的需求配置 ROSBridge WebSocket Server 并启动它。

ROSBridge WebSocket Server 是借由 /opt/ros/noetic/share/rosbridge_server/launch/rosbridge_websocket.launch 来启动的。

launch 文件中需要指定 ROSBridge 服务端的端口号、IP 地址、SSL 证书等参数，其中需要注意的是：
- `port`：指定 ROSBridge 服务端的端口号，默认值为 9090。
- `address`：指定 ROSBridge 服务端的 IP 地址，默认值为 127.0.0.1。
- `retry_startup_delay`：指定 ROSBridge 服务端启动失败后，重试的延迟时间，单位为秒，默认值为 5。
- `fragment_timeout`：指定 WebSocket 消息分片的超时时间，单位为秒，默认值为 600。
- `delay_between_messages`：指定 WebSocket 发送消息之间的延迟时间，单位为秒，默认值为 0。
- `max_message_size`：指定 WebSocket 接收消息的最大尺寸，单位为字节，默认值为 None。
- `unregister_timeout`：指定 WebSocket 客户端未注册的超时时间，单位为秒，默认值为 10。
- `websocket_ping_interval`：指定 WebSocket 客户端发送 ping 包的间隔时间，单位为秒，默认值为 0。
- `websocket_ping_timeout`：指定 WebSocket 客户端等待 pong 包的超时时间，单位为秒，默认值为 30。
- `topics_glob`：指定要订阅的 topic 名称，默认值为 [*]。
- `services_glob`：指定要调用的服务名称，默认值为 [*]。
- `params_glob`：指定要订阅的 ROS 参数，默认值为 [*]。

下面是一个 ROSBridge WebSocket 服务端的 launch 文件示例：

```launch
<launch>
  <arg name="port" default="9090" />
  <arg name="address" default="172.20.157.246" />
  <arg name="ssl" default="false" />
  <arg name="certfile" default=""/>
  <arg name="keyfile" default="" />

  <arg name="retry_startup_delay" default="5" />

  <arg name="fragment_timeout" default="600" />
  <arg name="delay_between_messages" default="0" />
  <arg name="max_message_size" default="1048576" />
  <arg name="unregister_timeout" default="10" />
  <arg name="websocket_external_port" default="None" />

  <arg name="use_compression" default="false" />

  <arg name="authenticate" default="false" />

  <arg name="websocket_ping_interval" default="10" />
  <arg name="websocket_ping_timeout" default="30" />
  <arg name="websocket_null_origin" default="true" />

  <arg name="topics_glob" default="[ /joint_states, /hand_joint_states ]" />
  <arg name="services_glob" default="[ /robotHandJointSwitch, /left_arm_movej_service, /right_arm_movej_service, /rosapi/services ]" />
  <arg name="params_glob" default="[*]" />
  <arg name="bson_only_mode" default="false" />
  <!-- Output: screen, log -->
  <arg name="output" default="screen" />

  <!-- Valid options for binary_encoder are "default", "b64" and "bson". -->
  <arg unless="$(arg bson_only_mode)" name="binary_encoder" default="default"/>

  <group if="$(arg ssl)">
    <node name="rosbridge_websocket" pkg="rosbridge_server" type="rosbridge_websocket" output="$(arg output)">
      <param name="certfile" value="$(arg certfile)" />
      <param name="keyfile" value="$(arg keyfile)" />
      <param name="authenticate" value="$(arg authenticate)" />
      <param name="port" value="$(arg port)"/>
      <param name="address" value="$(arg address)"/>
      <param name="retry_startup_delay" value="$(arg retry_startup_delay)"/>
      <param name="fragment_timeout" value="$(arg fragment_timeout)"/>
      <param name="delay_between_messages" value="$(arg delay_between_messages)"/>
      <param name="max_message_size" value="$(arg max_message_size)"/>
      <param name="unregister_timeout" value="$(arg unregister_timeout)"/>
      <param name="use_compression" value="$(arg use_compression)"/>

      <param name="websocket_ping_interval" value="$(arg websocket_ping_interval)" />
      <param name="websocket_ping_timeout" value="$(arg websocket_ping_timeout)" />
      <param name="websocket_external_port" value="$(arg websocket_external_port)" />
      <param name="websocket_null_origin" value="$(arg websocket_null_origin)" />

      <param name="topics_glob" value="$(arg topics_glob)"/>
      <param name="services_glob" value="$(arg services_glob)"/>
      <param name="params_glob" value="$(arg params_glob)"/>
    </node>
  </group>
  <group unless="$(arg ssl)">
    <node name="rosbridge_websocket" pkg="rosbridge_server" type="rosbridge_websocket" output="$(arg output)">
      <param name="authenticate" value="$(arg authenticate)" />
      <param name="port" value="$(arg port)"/>
      <param name="address" value="$(arg address)"/>
      <param name="retry_startup_delay" value="$(arg retry_startup_delay)"/>
      <param name="fragment_timeout" value="$(arg fragment_timeout)"/>
      <param name="delay_between_messages" value="$(arg delay_between_messages)"/>
      <param name="max_message_size" value="$(arg max_message_size)"/>
      <param name="unregister_timeout" value="$(arg unregister_timeout)"/>
      <param name="use_compression" value="$(arg use_compression)"/>

      <param name="websocket_ping_interval" value="$(arg websocket_ping_interval)" />
      <param name="websocket_ping_timeout" value="$(arg websocket_ping_timeout)" />
      <param name="websocket_external_port" value="$(arg websocket_external_port)" />

      <param name="topics_glob" value="$(arg topics_glob)"/>
      <param name="services_glob" value="$(arg services_glob)"/>
      <param name="params_glob" value="$(arg params_glob)"/>

      <param name="bson_only_mode" value="$(arg bson_only_mode)"/>
    </node>
  </group>

  <node name="rosapi" pkg="rosapi" type="rosapi_node" output="$(arg output)">
    <param name="topics_glob" value="$(arg topics_glob)"/>
    <param name="services_glob" value="$(arg services_glob)"/>
    <param name="params_glob" value="$(arg params_glob)"/>
  </node>
</launch>
```

#### 2.1.3 启动 ROSBridge WebSocket Server：
配置完成后，可以使用以下命令启动 ROSBridge WebSocket 服务：
```bash
roslaunch rosbridge_server rosbridge_websocket.launch
```
启动后，ROSBridge 将会在给定的 WebSocket 地址（ws://<ROSBridge服务器>:9090）监听前端应用的连接。
### 2.2 配置前端应用
在前端应用中，需要使用 roslib.js 来连接到 ROSBridge 服务器。roslib.js 是一个 JavaScript 库，提供了对 ROSBridge 提供的功能的封装，方便前端与 ROS 系统进行交互。
#### 2.2.1 管理 roslib 依赖
```bash
npm install roslib 
# 如果package.json中有相应的依赖列表，则可通过 npm install 一键安装所有依赖包
```
#### 2.2.2 连接到 ROSBridge：
在前端 JavaScript 中，使用 roslib.js 连接到 ROSBridge 服务端：
```javascript
import ROSLIB from "roslib";

var ros = new ROSLIB.Ros({
  url: 'ws://<ROSBridge服务器>:9090'
});
```

## 3. 通过 ROSBridge 进行通信
一旦前端应用成功连接到 ROSBridge，便可以开始与 ROS 系统进行通信。

ROSBridge 支持四种通信方式：Topic、Service、Action 和 Parameter。以下是如何使用这些接口的详细说明。

### 3.1 发布及订阅 Topic
Topic 是 ROS 中用于传输消息的一种通信方式，前端可以通过订阅和发布 Topic 来实现数据的双向通信。下面是在前端中发布及订阅 Topic 的示例程序：
```javascript
// 创建一个消息对象
var cmdVel = new ROSLIB.Message({
  linear: { x: 1.0, y: 0.0, z: 0.0 },
  angular: { x: 0.0, y: 0.0, z: 1.0 }
});

// 创建一个发布器，指定要发布的 topic
var cmdVelPublisher = new ROSLIB.Topic({
  ros: ros,
  name: '/cmd_vel',  // 发布的 topic 名称
  messageType: 'geometry_msgs/Twist'  // 消息类型
});

// 发布消息
cmdVelPublisher.publish(cmdVel);
```
```javascript
// 创建一个订阅器，指定要订阅的 topic
var laserScanListener = new ROSLIB.Topic({
  ros: ros,
  name: '/scan',  // 订阅的 topic 名称
  messageType: 'sensor_msgs/LaserScan'  // 消息类型
});

// 设置回调函数，处理接收到的消息
laserScanListener.subscribe(function(message) {
  console.log('Received laser scan data:', message);
});
```
### 3.2 调用 Service （目前为同步调用）
Service 是 ROS 中的一种请求-响应式通信方式，前端可以通过 roslib.js 调用 ROS 中的 Service 实现远程操作。

当前限制：目前，前端应用仅支持同步调用 ROS 服务（Service），这意味着前端应用只能发送请求并等待 ROS 系统同步响应。在前端调用服务时，用户需要等待服务的响应返回后才能继续执行其他操作。
```javascript
// 创建一个 service 客户端，指定 service 名称和类型
var getRobotStateClient = new ROSLIB.Service({
  ros: ros,
  name: '/get_robot_state',
  serviceType: 'my_robot/GetRobotState'  // Service 类型
});

// 创建请求对象
var request = new ROSLIB.ServiceRequest({
  param1: 'value1',
  param2: 'value2'
});

// 调用服务并处理响应
getRobotStateClient.callService(request, function(result) {
  console.log('Service response:', result);
});
```

注意：当前前端应用并不支持异步调用服务，这意味着对于需要长时间运行或复杂处理的任务（例如长时间的路径规划或复杂计算），前端无法异步地提交请求并同时进行其他操作。所有的服务调用都必须等到响应返回才能继续进行。
### 3.3 使用 Action
Action 是 ROS 中用于长时间运行任务的通信方式，通常用于控制机器人执行复杂任务（例如导航、抓取）。

当前前端应用并没有使用 Action 调用，因此只简单给出其使用示例，更多的信息请参考未来版本的更新。

```javascript
// 创建一个 action 客户端
var moveActionClient = new ROSLIB.ActionClient({
  ros: ros,
  serverName: '/move_base',
  actionName: 'move_base_msgs/MoveBaseAction'
});

// 创建一个目标对象
var goal = new ROSLIB.Goal({
  actionClient: moveActionClient,
  goalMessage: {
    target_pose: {
      header: {
        frame_id: 'map'
      },
      pose: {
        position: {
          x: 1.0,
          y: 0.0,
          z: 0.0
        },
        orientation: {
          w: 1.0
        }
      }
    }
  }
});

// 发送目标并监听反馈
goal.send();
goal.on('feedback', function(feedback) {
  console.log('Feedback received:', feedback);
});
```

### 3.4 使用 Parameter
前端被允许获取和设置 ROS 系统的参数，如下面的示例所示：
```javascript
// 获取参数值
ros.getParam('/robot_name', function(value) {
  console.log('Robot name:', value);
});

// 设置参数值
ros.setParam('/robot_name', 'my_robot');
```

## 4. 故障排查与常见问题
如果您遇到本文档未涵盖的问题，欢迎将其记录并补充到以下内容中，以便为后续使用者提供参考和帮助。
### 4.1 WebSocket连接失败
检查ROSBridge服务器是否正常运行，检查网络连接。
### 4.2 Service调用超时
检查服务类型和名称是否正确，确认后端服务是否正常。
### 4.3 Topic消息未接收
确认Topic名称和消息类型是否一致，ROS是否发布了消息。
### 4.4 自定义消息类型的 Service 调用失败
#### 解决方法：
##### 1. 确保自定义消息类型已经正确构建并注册
确保在构建 ROS 工作空间时，所有自定义消息类型都已正确编译并注册。在 ROS 中定义的所有自定义消息和服务类型必须通过 message_generation 包和 service_generation 包正确生成，并确保它们能够在 ROS 环境中找到。

##### 2. 显式指定服务名称和类型
通过显式指定服务名称，可以帮助 rosbridge 确认哪些服务需要被暴露。你可以在 services_glob 中明确列出服务名称，而不是使用 [*]：

```xml
<param name="services_glob" value="[ /robot_control/move_arm, /robot_control/get_state ]" />
```

这样可以避免 rosbridge 在通配符匹配时发生错误。

###### 原因：
ROS 的服务定义不仅仅是一个服务名称，它还包含了请求和响应的消息类型。如果这些消息类型是自定义的（例如 robot_control/MoveArmRequest），rosbridge_websocket 可能会因为没有正确的消息类型映射或类型注册而无法暴露这些服务。
默认情况下，rosbridge_server 可以识别标准消息类型（例如 std_msgs/String 或 geometry_msgs/Twist），但它不会自动处理你自定义的消息类型。

##### 3. 重新编译工作空间
如果你添加了新的消息类型或服务定义，记得重新编译工作空间，然后确保在 ROS 环境中能够找到所有的服务和消息类型。