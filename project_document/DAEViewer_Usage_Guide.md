# DAE文件查看器使用指南

## 概述
DAE文件查看器是一个专门用于查看和操作H1_Pro1/meshes_dae目录下DAE文件的工具。它提供了现代化的用户界面，支持多文件同时显示和独立的透明度控制。

## 功能特性

### 🎯 核心功能
- **36个DAE文件支持** - 涵盖H1_Pro1/meshes_dae目录下的所有文件
- **独立透明度控制** - 每个文件可以独立调节透明度（0-1范围）
- **多文件同时显示** - 可以同时加载多个文件进行对比
- **现代化UI界面** - 使用Material-UI组件，响应式设计
- **实时3D渲染** - 基于Three.js的高性能3D渲染

### 📁 支持的文件列表
```
ASTRAGALUS_L.dae, ASTRAGALUS_R.dae
FOOT_L.dae, FOOT_R.dae
FOREARM_L.dae, FOREARM_R.dae
HAND_L.dae, HAND_R.dae
HEAD.dae
ILIUM_L.dae, ILIUM_R.dae
ISCHIUM_L.dae, ISCHIUM_R.dae
NECK.dae
SACRUM.dae
SCAPULA_L.dae, SCAPULA_R.dae
SHANK_L.dae, SHANK_R.dae
SHOULDER_L.dae, SHOULDER_R.dae
TCP_L.dae, TCP_R.dae
THIGH_L.dae, THIGH_R.dae
TIPTOE_Z_L.dae, TIPTOE_Z_R.dae
TORSO.dae
UPPERARM_L.dae, UPPERARM_R.dae
WRIST_FLANGE_L.dae, WRIST_FLANGE_R.dae
WRIST_REVOLUTE_L.dae, WRIST_REVOLUTE_R.dae
WRIST_UPDOWN_L.dae, WRIST_UPDOWN_R.dae
```

## 使用方法

### 1. 进入DAE查看器模式
1. 启动应用
2. 点击顶部按钮面板中的"**DAE文件查看器**"按钮
3. 界面将切换到DAE文件查看器模式

### 2. 加载DAE文件
1. 在左侧控制面板的下拉菜单中选择要加载的DAE文件
2. 文件将自动加载到3D场景中
3. 默认透明度设置为0.8

### 3. 控制透明度
1. 在已加载文件列表中，每个文件都有一个透明度滑块
2. 拖动滑块调节透明度（0 = 完全透明，1 = 完全不透明）
3. 实时显示当前透明度数值

### 4. 管理文件
- **加载测试文件** - 点击"测试加载"按钮快速加载手部和躯干文件
- **移除单个文件** - 点击文件旁边的删除按钮
- **清空所有文件** - 点击"清空所有"按钮移除所有已加载文件

### 5. 3D场景操作
- **旋转视角** - 鼠标左键拖拽
- **缩放** - 鼠标滚轮
- **平移** - 鼠标右键拖拽
- **重置视角** - 双击场景

### 6. 返回主界面
- 点击右上角的"返回主界面"按钮回到机器人控制模式

## 技术特性

### 🏗️ 架构设计
- **组件化设计** - DAEViewer和DAEViewerControls分离
- **状态管理** - 使用React Hooks管理组件状态
- **材质克隆** - 解决多实例材质共享问题
- **内存管理** - 自动清理Three.js资源

### 🎨 UI设计
- **Material-UI组件** - 现代化的用户界面
- **响应式布局** - 适配不同屏幕尺寸
- **毛玻璃效果** - 半透明背景和模糊效果
- **状态指示器** - 加载状态和错误提示

### ⚡ 性能优化
- **材质克隆** - 确保每个模型实例独立控制
- **资源清理** - 组件卸载时自动清理Three.js资源
- **渲染优化** - 高效的Three.js渲染循环
- **内存管理** - 防止内存泄漏

## 故障排除

### 常见问题

#### 1. 文件加载失败
- **原因**：文件路径错误或文件不存在
- **解决**：检查H1_Pro1/meshes_dae目录是否存在相应文件

#### 2. 透明度控制无效
- **原因**：可能是材质共享问题
- **解决**：重新加载文件，系统会自动克隆材质

#### 3. 性能问题
- **原因**：同时加载过多文件
- **解决**：移除不需要的文件，或使用"清空所有"功能

#### 4. 界面显示异常
- **原因**：浏览器兼容性问题
- **解决**：使用现代浏览器（Chrome、Firefox、Safari、Edge）

### 错误处理
- 系统会自动显示错误信息
- 错误信息包含具体的错误原因
- 可以点击错误信息旁的关闭按钮隐藏错误提示

## 开发信息

### 文件结构
```
src/components/
├── DAEViewer.js          # 主查看器组件
└── DAEViewerControls.js  # 控制界面组件
```

### 依赖库
- **Three.js** - 3D渲染引擎
- **React** - 前端框架
- **Material-UI** - UI组件库
- **ColladaLoader** - DAE文件加载器

### 浏览器兼容性
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 更新日志

### v1.0.0 (2024-01-XX)
- ✅ 初始版本发布
- ✅ 支持36个DAE文件
- ✅ 独立透明度控制
- ✅ Material-UI界面
- ✅ 多文件同时显示
- ✅ 3D场景交互
- ✅ 错误处理和状态管理 