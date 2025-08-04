# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based web application for controlling a dual-arm robotic system with hand manipulation capabilities. The application provides a comprehensive UI for controlling 28 degrees of freedom (DOF) across both arms and hands through ROSBridge communication.

## Development Commands

### Common Development Tasks
```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Eject from Create React App (not recommended)
npm run eject
```

### Testing and Quality Assurance
- The project uses Create React App's built-in testing with Jest
- Component tests are located in `src/__tests__/` directories
- Run `npm test` to execute all tests
- No linting scripts are configured in package.json

## Architecture Overview

### Core Application Structure
- **Entry Point**: `src/index.js` - Standard React application bootstrap
- **Main Component**: `src/App.js` - Contains the primary application logic and state management
- **Configuration**: `src/config.js` - Centralized configuration for ROSBridge, joint limits, and collision detection

### Key Components (`src/components/`)

#### Robot Control Components
- **`RobotViewer.js`** - Main 3D robot visualization using Three.js and URDF loader
- **`HandViewer.js`** - Specialized hand visualization components (left/right)
- **`ArmControl.js`** - Dual arm control interface with sliders
- **`HandControl.js`** - Hand control interface with input fields
- **`RobotArmTarget.js`** - End-effector position and orientation control
- **`FingerControl.js`** - Individual finger joint control

#### Collision Detection System
- **`RobotCollisionDetector.js`** - Main collision detection orchestrator
- **`RobotSelfCollisionDetector.js`** - Self-collision detection logic
- **`RobotCollisionUtils.js`** - BVH-based collision detection utilities
- **`RobotTransparencyUtils.js`** - Visual transparency management for collisions

#### Supporting Components
- **`DAEViewer.js`** - 3D model viewer for COLLADA files
- **`Teacher.js`** - Teaching/learning mode interface
- **`ActionButtons.js`** - Preset action controls
- **`ShowCoordinates.js`** - Coordinate display utilities

### ROS Integration
- **ROSBridge Connection**: WebSocket-based communication with ROS at `ws://172.16.11.238:9090`
- **Services**: 
  - Arm control: `/left_arm_movej_service`, `/right_arm_movej_service`
  - Hand control: `/robotHandJointSwitch`
  - End-effector: `/left_arm_movel_service`, `/right_arm_movel_service`
  - Robot state: `/set_robot_state`
- **Topics**:
  - Joint states: `/joint_states`, `/hand_joint_states`
  - Robot state: `/robot_state`

### State Management
- **Local State**: React useState hooks for component state
- **Real-time Synchronization**: Continuous sync between robot feedback and UI
- **Configuration-Driven**: Joint limits and behaviors defined in `config.js`

### 3D Visualization
- **Three.js**: Primary 3D rendering library
- **URDF Loader**: Loads robot models from URDF files
- **BVH Collision**: Advanced collision detection using three-mesh-bvh
- **Models**: Located in `public/` directory with DAE/URDF files

## Key Features

### Control Modes
1. **Arm Control Mode** - Direct joint control with sliders
2. **End-Effector Mode** - Cartesian position/orientation control
3. **Hand Control Mode** - Specialized finger manipulation
4. **Teaching Mode** - Robot learning and demonstration
5. **Preset Actions** - Pre-programmed movement sequences

### Collision Detection
- **BVH-based**: Uses bounding volume hierarchy for efficient detection
- **Self-collision**: Prevents robot parts from colliding with each other
- **Multi-level**: AABB pre-detection followed by precise BVH intersection
- **Visual Feedback**: Real-time collision highlighting and warnings

### Safety Features
- **Joint Limits**: Hard limits enforced through configuration
- **Emergency Stop**: Soft emergency stop functionality
- **Real-time Monitoring**: Continuous state monitoring and feedback
- **User Confirmation**: Required for potentially dangerous movements

## Configuration Files

### `src/config.js` Structure
- **ROSBridge Settings**: Connection parameters and reconnection logic
- **Joint Limits**: Define min/max values for all 28 DOF
- **Collision Detection**: Thresholds, pairs, and visualization settings
- **Performance Tuning**: BVH optimization and detection parameters

### Robot Models
- **H1_Pro1**: Main robot model in `public/H1_Pro1/`
- **3N2-JUNE**: Alternative model in `public/3N2-JUNE/`
- **Hand Models**: Separate left/right hand models with detailed finger joints

## Development Guidelines

### Component Patterns
- **Unified Design**: All control panels follow consistent styling and interaction patterns
- **Error Handling**: Comprehensive validation and user feedback
- **Real-time Updates**: Continuous synchronization with robot state
- **Responsive Design**: Adapts to different screen sizes and orientations

### ROS Communication
- **Service Calls**: Use provided service wrappers for consistency
- **State Synchronization**: Maintain real-time/planned value separation
- **Error Recovery**: Automatic reconnection and state recovery
- **Performance**: Optimize topic subscription rates and update frequencies

### 3D Visualization
- **Performance**: Use BVH acceleration for complex scenes
- **Memory Management**: Proper cleanup of Three.js resources
- **User Experience**: Smooth interactions with visual feedback
- **Accessibility**: Multiple interaction methods (mouse, touch, keyboard)

## Common Development Tasks

### Adding New Control Modes
1. Create new component following existing patterns
2. Add mode toggle in `App.js` top navigation
3. Implement proper state management and ROS integration
4. Add collision detection if necessary

### Modifying Joint Limits
1. Update limits in `src/config.js`
2. Verify limits match robot physical constraints
3. Test UI controls respect new limits
4. Update any related safety checks

### Extending Collision Detection
1. Add new collision pairs in configuration
2. Implement detection logic in `RobotCollisionUtils.js`
3. Add visual feedback in affected components
4. Test with various robot configurations

### ROS Service Integration
1. Define service client in appropriate component
2. Add error handling and retry logic
3. Update state management for service responses
4. Add user feedback for service calls

## Important Notes

- **Safety First**: Always consider safety implications when modifying control logic
- **Testing**: Thoroughly test all changes with robot hardware when possible
- **Performance**: Monitor browser performance, especially with 3D rendering
- **Compatibility**: Ensure changes work across different browsers and devices
- **Documentation**: Update documentation for significant architectural changes