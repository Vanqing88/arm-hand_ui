# DAE文件查看器 - 独立应用

这是一个专门用于查看和操作DAE文件的独立网页应用。它提供了现代化的用户界面，支持多文件同时显示和独立的透明度控制。

## 🚀 功能特性

- **36个DAE文件支持** - 涵盖H1_Pro1/meshes_dae目录下的所有文件
- **独立透明度控制** - 每个文件可以独立调节透明度（0-1范围）
- **多文件同时显示** - 可以同时加载多个文件进行对比
- **现代化UI界面** - 使用Material-UI组件，响应式设计
- **实时3D渲染** - 基于Three.js的高性能3D渲染
- **完全独立** - 不依赖其他项目，可单独部署

## 📦 安装和运行

### 前置要求
- Node.js 16.0 或更高版本
- npm 或 yarn

### 安装依赖
```bash
cd dae-viewer-app
npm install
```

### 启动开发服务器
```bash
npm start
```

应用将在 http://localhost:3000 启动

### 构建生产版本
```bash
npm run build
```

构建后的文件将生成在 `build` 目录中

## 🎯 使用方法

### 1. 加载DAE文件
- 在左侧控制面板的下拉菜单中选择要加载的DAE文件
- 文件将自动加载到3D场景中
- 默认透明度设置为0.8

### 2. 控制透明度
- 在已加载文件列表中，每个文件都有一个透明度滑块
- 拖动滑块调节透明度（0 = 完全透明，1 = 完全不透明）
- 实时显示当前透明度数值

### 3. 管理文件
- **加载测试文件** - 点击"测试加载"按钮快速加载手部和躯干文件
- **移除单个文件** - 点击文件旁边的删除按钮
- **清空所有文件** - 点击"清空所有"按钮移除所有已加载文件

### 4. 3D场景操作
- **旋转视角** - 鼠标左键拖拽
- **缩放** - 鼠标滚轮
- **平移** - 鼠标右键拖拽
- **重置视角** - 双击场景

## 📁 项目结构

```
dae-viewer-app/
├── public/
│   ├── index.html
│   ├── manifest.json
│   ├── favicon.ico
│   └── H1_Pro1/
│       └── meshes_dae/ (36个DAE文件)
├── src/
│   ├── App.js              # 主应用组件
│   ├── index.js            # 应用入口
│   ├── reportWebVitals.js  # 性能监控
│   └── components/
│       ├── DAEViewer.js          # 主查看器组件
│       └── DAEViewerControls.js  # 控制界面组件
├── package.json
└── README.md
```

## 🛠️ 技术栈

- **React 18** - 前端框架
- **Three.js** - 3D渲染引擎
- **Material-UI** - UI组件库
- **ColladaLoader** - DAE文件加载器

## 🌐 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 📝 支持的文件列表

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

## 🔧 故障排除

### 常见问题

1. **文件加载失败**
   - 检查H1_Pro1/meshes_dae目录是否存在相应文件
   - 确保文件路径正确

2. **透明度控制无效**
   - 重新加载文件，系统会自动克隆材质
   - 确保浏览器支持WebGL

3. **性能问题**
   - 移除不需要的文件
   - 使用"清空所有"功能释放内存

4. **界面显示异常**
   - 使用现代浏览器
   - 检查浏览器是否支持WebGL

## 📄 许可证

本项目仅供学习和研究使用。

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目。 