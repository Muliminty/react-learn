/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// 导入 React 的 Fragment 类型符号（Symbol），用于标识 Fragment 组件
import {REACT_FRAGMENT_TYPE} from 'shared/ReactSymbols';

// 从 ReactJSXElement 模块中导入 JSX 处理函数
import {
  jsxProd, // 生产环境下使用的通用 JSX 处理函数
  jsxProdSignatureRunningInDevWithDynamicChildren, // 开发环境下处理动态子元素的 JSX 函数
  jsxProdSignatureRunningInDevWithStaticChildren, // 开发环境下处理静态子元素的 JSX 函数
  jsxDEV as _jsxDEV, // 开发环境下专用的 JSX 处理函数（重命名为 _jsxDEV）
} from './ReactJSXElement';

/**
 * JSX 处理函数（动态子元素）。
 * 根据环境选择不同的实现：
 * - 开发环境：使用带有额外检查和警告逻辑的函数。
 * - 生产环境：使用性能优化的通用函数。
 */
const jsx: any = __DEV__
  ? jsxProdSignatureRunningInDevWithDynamicChildren // 开发环境：处理动态子元素
  : jsxProd; // 生产环境：通用处理函数

/**
 * JSX 处理函数（静态子元素）。
 * 根据环境选择不同的实现：
 * - 开发环境：使用带有额外检查和警告逻辑的函数。
 * - 生产环境：使用性能优化的通用函数。
 * 静态子元素是指子元素在渲染过程中不会发生变化，可以进行一些优化。
 */
const jsxs: any = __DEV__
  ? jsxProdSignatureRunningInDevWithStaticChildren // 开发环境：处理静态子元素
  : jsxProd; // 生产环境：通用处理函数

/**
 * 开发环境下专用的 JSX 处理函数。
 * 在生产环境下为 undefined，以避免不必要的代码加载。
 */
const jsxDEV: any = __DEV__ ? _jsxDEV : undefined;

// 导出模块内容
export {
  REACT_FRAGMENT_TYPE as Fragment, // 将 REACT_FRAGMENT_TYPE 导出为 Fragment，支持 JSX 中的 <></> 语法
  jsx, // 处理动态子元素的 JSX 函数
  jsxs, // 处理静态子元素的 JSX 函数
  jsxDEV, // 开发环境下专用的 JSX 处理函数
};