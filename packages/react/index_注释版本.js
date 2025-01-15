/**
 * 版权所有 (c) Meta Platforms, Inc. 和其关联公司。
 *
 * 此源码根据 MIT 许可证授权，具体内容请查看项目根目录中的 LICENSE 文件。
 *
 * @flow
 */

// 保持与 https://github.com/facebook/flow/blob/main/lib/react.js 的同步
// 以下是 React 类型定义，便于使用 Flow 类型检查工具

// 组件类型
export type ComponentType<-P> = React$ComponentType<P>;

// 抽象组件类型
export type AbstractComponent<-Config> = React$AbstractComponent<Config>;

// 元素类型
export type ElementType = React$ElementType;

// 元素类型，可以指定组件类型 C
export type Element<+C> = React$Element<C>;

// 任意类型的 React 元素
export type MixedElement = React$Element<ElementType>;

// React 元素的唯一标识符类型
export type Key = React$Key;

// React 节点，可以是字符串、组件或其他类型
export type Node = React$Node;

// 上下文类型，用于 React Context API
export type Context<T> = React$Context<T>;

// React Portal 类型，用于创建 Portal
export type Portal = React$Portal;

// 获取指定组件类型 C 的属性类型
export type ElementProps<C> = React$ElementProps<C>;

// 获取指定组件类型 C 的配置类型
export type ElementConfig<C> = React$ElementConfig<C>;

// 获取指定组件类型 C 的 ref 引用类型
export type ElementRef<C> = React$ElementRef<C>;

// 定义配置类型 Props 和默认属性 DefaultProps 的类型
export type Config<Props, DefaultProps> = React$Config<Props, DefaultProps>;

// 表示子元素数组的类型，可以是嵌套数组或单个子元素
export type ChildrenArray<+T> = $ReadOnlyArray<ChildrenArray<T>> | T;

// 导出所有内容以便测试中使用
// 由于某些原因，Flow 不支持直接使用 `export * from`
export {
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, // 内部变量，用户请勿使用
  __COMPILER_RUNTIME, // 编译器运行时
  Children, // React 子元素工具
  Component, // React 类组件
  Fragment, // React 片段，用于返回多个子元素
  Profiler, // 性能分析工具
  PureComponent, // React 纯组件，用于性能优化
  StrictMode, // 严格模式，用于标记潜在问题
  Suspense, // 用于处理异步操作的组件
  cloneElement, // 克隆 React 元素
  createContext, // 创建上下文
  createElement, // 创建 React 元素
  createRef, // 创建 ref
  use, // 异步支持
  forwardRef, // 转发 ref
  isValidElement, // 检查是否是有效的 React 元素
  lazy, // 懒加载组件
  memo, // React.memo，用于性能优化
  cache, // 缓存工具
  startTransition, // 启动优先级较低的状态更新
  unstable_LegacyHidden, // 不稳定的隐藏组件
  unstable_Activity, // 不稳定的活动组件
  unstable_Scope, // 不稳定的作用域组件
  unstable_SuspenseList, // 不稳定的 Suspense 列表组件
  unstable_TracingMarker, // 不稳定的追踪标记
  unstable_ViewTransition, // 不稳定的视图过渡
  unstable_getCacheForType, // 获取指定类型的缓存
  unstable_useCacheRefresh, // 不稳定的缓存刷新 Hook
  useId, // 用于生成稳定 ID 的 Hook
  useCallback, // 用于缓存函数的 Hook
  useContext, // 使用上下文的 Hook
  useDebugValue, // 用于调试 React Hook 的值
  useDeferredValue, // 延迟值更新的 Hook
  useEffect, // 副作用 Hook
  experimental_useEffectEvent, // 实验性的 Effect 事件 Hook
  useImperativeHandle, // 自定义 ref 处理的 Hook
  useInsertionEffect, // 用于插入副作用的 Hook
  useLayoutEffect, // DOM 更新后的同步副作用 Hook
  useMemo, // 缓存计算值的 Hook
  useOptimistic, // 实验性的乐观更新 Hook
  useSyncExternalStore, // 用于外部存储同步的 Hook
  useReducer, // 使用 reducer 模式的 Hook
  useRef, // 引用值的 Hook
  useState, // 状态管理的 Hook
  useTransition, // 管理 UI 过渡的 Hook
  useActionState, // 管理 Action 状态的 Hook
  version, // 当前 React 版本
} from './src/ReactClient'; // 从 ReactClient 文件导出
