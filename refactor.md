# Algo Visualizer 架构分析与重构规划 (SOLID 原则)

本文档基于 SOLID 原则对 `src` 目录下的前端项目进行了深度分析，指出了当前架构中可能导致未来维护困难的问题，并提出了相应的解决方案。

---

## 1. SRP: 单一职责原则 (Single Responsibility Principle)

### 问题分析

- **`App.tsx` (上帝组件):** 承担了过多的职责。它同时负责状态管理（代码、断点、执行历史）、生命周期管理（Pyodide 初始化、响应式监听）、业务逻辑（代码运行控制）以及顶层布局编排。
- **`Editor.tsx`:** 内部逻辑过于复杂。它不仅管理 Monaco 编辑器的实例，还直接负责 LSP Worker 的通信、断点与编辑器装饰器的同步转换逻辑、以及复杂的 Gutter 交互（拖拽选中范围）。

### 建议方案

- **逻辑抽离：** 将 `App.tsx` 中的状态管理与副作用逻辑提取为自定义 Hooks，如 `usePyodideEngine`、`useExecutionHistory` 和 `useResponsiveLayout`。
- **组件瘦身：** 让 `App.tsx` 回归其本质——只负责最高层级的容器结构布局。
- **视图与逻辑分离：** 将 `Editor.tsx` 中的断点同步算法和 LSP 管理逻辑移出组件，使组件只关注 UI 渲染。

---

## 2. OCP: 开闭原则 (Open/Closed Principle)

### 问题分析

- **可视化分发逻辑 (Conditional Rendering):** 在 `Visualizer.tsx` 中，`renderGraphItem` 使用硬编码的 `switch(item.type)` 来分发渲染组件（Array, Array2D, Nodes, Var）。
- **类型定义耦合：** 每当需要支持一种新的数据结构（如 `Tree` 或 `Stack`）时，都必须修改 `Visualizer.tsx` 的核心逻辑并不断扩充 `GraphUnion` 类型及 `switch` 分支。

### 建议方案

- **注册表模式 (Registry Pattern):** 建立一个可视化组件注册表。每种数据结构定义自己的渲染组件，并在系统初始化时注册。
- **插件化扩展：** `Visualizer.tsx` 只需根据数据类型查询注册表，无需了解具体的渲染细节，从而实现“对扩展开放，对修改封闭”。

---

## 3. LSP: 里氏替换原则 (Liskov Substitution Principle)

### 问题分析

- **接口不一致：** 各个可视化组件（`ArrayVisualizer`, `NodesVisualizer` 等）接收的 `data` 属性虽然源自同一基类，但在父级组件分发时存在大量针对特定子类的“特殊处理”（补丁代码），导致子类型无法被透明地透明替换。

### 建议方案

- **标准化契约：** 定义统一的可视化数据接口协议。确保所有可视化组件遵循一致的输入/输出契约，或通过适配器层将后端数据标准化，消除父级组件中的特殊判断。

---

## 4. ISP: 接口隔离原则 (Interface Segregation Principle)

### 问题分析

- **Props 过载：** 许多子组件直接接收整个 `Snapshot` 或 `GraphUnion` 对象，即使它们只使用了其中的一小部分属性（如只使用了 `line` 号）。
- **过度依赖：** 这种做法导致组件与庞大的数据结构强耦合，增加了不必要的重新渲染风险和维护成本。

### 建议方案

- **精简 Interface：** 组件应只声明其真正依赖的最小属性集。在父组件层级进行数据解构或利用 Selector 提取必要信息，从而隔离无关变化。

---

## 5. DIP: 依赖倒置原则 (Dependency Inversion Principle)

### 问题分析

- **硬编码实现：**
  - 业务逻辑层直接依赖于具体的 `pyodideService`（Python 后端）。
  - UI 层直接调用具体的 Worker 构造函数。
- **扩展受限：** 如果未来需要支持 JavaScript、C++ 等多语言可视化，目前的实现方案需要大规模重构。

### 建议方案

- **抽象执行引擎：** 定义统一的 `ExecutionEngine` 抽象接口。`App` 组件应依赖于该抽象接口，而非具体的 Python 实现。
- **依赖注入：** 通过配置或 Provider 将具体的 Service（如 PyodideEngine）注入应用，使底层实现易于切换且方便进行单元测试（Mocking）。

---

## 总结与重构优先级

1.  **高优先级：** 解耦合 `App.tsx` 与 `Editor.tsx`，提取逻辑到 Hooks 中。（解决 SRP）
2.  **中优先级：** 引入组件注册表管理可视化类型。（解决 OCP）
3.  **长期目标：** 抽象执行引擎层，解除与 Python 环境的强绑定。（解决 DIP）
