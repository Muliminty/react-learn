/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * 此源代码受 MIT 许可证的约束，许可证可在源代码树的根目录下的 LICENSE 文件中找到。
 */

// 从共享模块中导入工具函数和常量
import getComponentNameFromType from 'shared/getComponentNameFromType'; // 获取组件名称的工具函数
import ReactSharedInternals from 'shared/ReactSharedInternals'; // React 内部共享的工具和变量
import hasOwnProperty from 'shared/hasOwnProperty'; // 检查对象是否拥有某个属性的工具函数
import assign from 'shared/assign'; // 对象属性合并的工具函数
import {
  getIteratorFn,
  REACT_ELEMENT_TYPE, // React 元素类型的 Symbol
  REACT_FRAGMENT_TYPE, // Fragment 类型的 Symbol
  REACT_LAZY_TYPE, // Lazy 组件类型的 Symbol
} from 'shared/ReactSymbols'; // React 相关的 Symbol 常量
import { checkKeyStringCoercion } from 'shared/CheckStringCoercion'; // 检查 key 是否为字符串的工具函数
import isValidElementType from 'shared/isValidElementType'; // 检查是否为有效的元素类型
import isArray from 'shared/isArray'; // 检查是否为数组的工具函数
import { describeUnknownElementTypeFrameInDEV } from 'shared/ReactComponentStackFrame'; // 在开发模式下描述未知元素类型的堆栈信息
import {
  disableDefaultPropsExceptForClasses, // 禁用默认 props（除了类组件）的特性标志
  enableOwnerStacks, // 启用组件堆栈跟踪的特性标志
} from 'shared/ReactFeatureFlags'; // React 特性标志

// React 客户端引用的 Symbol
const REACT_CLIENT_REFERENCE = Symbol.for('react.client.reference');

// 创建一个任务（用于开发模式下的堆栈跟踪）
const createTask =
  // eslint-disable-next-line react-internal/no-production-logging
  __DEV__ && enableOwnerStacks && console.createTask
    ? // eslint-disable-next-line react-internal/no-production-logging
    console.createTask
    : () => null;

/**
 * 获取任务名称（用于开发模式下的堆栈跟踪）
 * @param {*} type 组件类型
 * @returns {string} 任务名称
 */
function getTaskName(type) {
  if (type === REACT_FRAGMENT_TYPE) {
    return '<>'; // Fragment 类型的任务名称
  }
  if (
    typeof type === 'object' &&
    type !== null &&
    type.$$typeof === REACT_LAZY_TYPE
  ) {
    // 如果是 Lazy 组件，不立即初始化，因此无法获取具体类型
    return '<...>';
  }
  try {
    // 尝试获取组件名称
    const name = getComponentNameFromType(type);
    return name ? '<' + name + '>' : '<...>'; // 返回带组件名称的任务名称
  } catch (x) {
    return '<...>'; // 如果出错，返回默认名称
  }
}

/**
 * 获取当前组件的所有者（Owner）。
 * 所有者通常是当前组件的父组件，用于在开发模式下调试和错误提示。
 * 
 * @returns {ReactComponent|null} 当前组件的所有者，如果不存在或不在开发模式下，返回 null。
 */
function getOwner() {
  if (__DEV__) { // 仅在开发模式下执行
    // ReactSharedInternals.A 是 React 内部的调度器（Dispatcher），
    // 它包含了 React 在运行时的内部方法和状态。
    const dispatcher = ReactSharedInternals.A;

    // 如果调度器不存在，返回 null。
    // 这种情况可能发生在 React 尚未初始化或调度器被意外清空时。
    if (dispatcher === null) {
      return null;
    }

    // 调用调度器的 getOwner 方法，获取当前组件的所有者。
    // 所有者信息通常用于调试，例如在错误提示中显示组件的堆栈信息。
    return dispatcher.getOwner();
  }

  // 在生产模式下，直接返回 null。
  // 生产模式下不会跟踪组件所有者，以减少性能开销。
  return null;
}

// 以下变量用于控制开发模式下的警告显示，避免重复提示相同的警告。

// 是否已经显示过关于特殊 prop（如 `key`）的警告。
// 这是一个全局标志，用于确保只显示一次相关警告。
let specialPropKeyWarningShown;

// 是否已经显示过关于 `ref` 的警告。
// 这是一个全局对象，用于记录哪些组件已经显示过 ref 相关的警告。
// 键是组件的唯一标识，值是一个布尔值，表示是否已经显示过警告。
let didWarnAboutElementRef;

// 是否已经显示过关于旧版 JSX 运行时的警告。
// 这是一个全局标志，用于确保只显示一次相关警告。
let didWarnAboutOldJSXRuntime;

if (__DEV__) { // 仅在开发模式下初始化
  // 初始化 didWarnAboutElementRef 为一个空对象。
  // 这个对象用于记录哪些组件已经显示过 ref 相关的警告。
  didWarnAboutElementRef = {};
}

/**
 * 检查配置对象（config）中的 `ref` 属性是否有效。
 * 在开发模式下，会额外检查 `ref` 是否被标记为 React 的警告属性。
 *
 * @param {Object} config - 包含组件属性的配置对象。
 * @returns {boolean} - 如果 `ref` 属性有效且未被标记为警告，返回 `true`；否则返回 `false`。
 */
function hasValidRef(config) {
  if (__DEV__) { // 仅在开发模式下执行额外检查
    // 检查 config 对象是否包含 `ref` 属性
    if (hasOwnProperty.call(config, 'ref')) {
      // 获取 `ref` 属性的属性描述符
      const getter = Object.getOwnPropertyDescriptor(config, 'ref').get;

      // 如果 `ref` 属性是一个 getter，并且被标记为 React 的警告属性（isReactWarning），
      // 则返回 false，表示 `ref` 无效。
      if (getter && getter.isReactWarning) {
        return false;
      }
    }
  }

  // 在生产模式下，直接检查 `ref` 是否不为 undefined。
  // 如果 `ref` 存在且不为 undefined，则认为它是有效的。
  return config.ref !== undefined;
}

/**
 * 检查配置对象（config）中的 `key` 属性是否有效。
 * 在开发模式下，会额外检查 `key` 是否被标记为 React 的警告属性。
 *
 * @param {Object} config - 包含组件属性的配置对象。
 * @returns {boolean} - 如果 `key` 属性有效且未被标记为警告，返回 `true`；否则返回 `false`。
 */
function hasValidKey(config) {
  if (__DEV__) { // 仅在开发模式下执行额外检查
    // 检查 config 对象是否包含 `key` 属性
    if (hasOwnProperty.call(config, 'key')) {
      // 获取 `key` 属性的属性描述符
      const getter = Object.getOwnPropertyDescriptor(config, 'key').get;

      // 如果 `key` 属性是一个 getter，并且被标记为 React 的警告属性（isReactWarning），
      // 则返回 false，表示 `key` 无效。
      if (getter && getter.isReactWarning) {
        return false;
      }
    }
  }

  // 在生产模式下，直接检查 `key` 是否不为 undefined。
  // 如果 `key` 存在且不为 undefined，则认为它是有效的。
  return config.key !== undefined;
}

/**
 * 定义一个 `key` 属性的 getter，用于在开发模式下警告开发者不要直接访问 `key`。
 * `key` 是 React 内部使用的特殊属性，不应该作为组件的 prop 直接访问。
 *
 * @param {Object} props - 组件的 props 对象。
 * @param {string} displayName - 组件的显示名称，用于在警告信息中标识组件。
 */
function defineKeyPropWarningGetter(props, displayName) {
  if (__DEV__) { // 仅在开发模式下执行
    // 定义一个函数，用于在访问 `key` 属性时发出警告
    const warnAboutAccessingKey = function () {
      // 如果警告尚未显示过，则显示警告
      if (!specialPropKeyWarningShown) {
        specialPropKeyWarningShown = true; // 标记警告已显示


        console.error(
          '%s: `key` is not a prop. Trying to access it will result ' +
          'in `undefined` being returned. If you need to access the same ' +
          'value within the child component, you should pass it as a different ' +
          'prop. (https://react.dev/link/special-props)',
          displayName, // 组件的显示名称
        );
      }
    };

    // 标记这个函数为 React 的警告函数
    warnAboutAccessingKey.isReactWarning = true;

    // 使用 Object.defineProperty 定义 `key` 属性的 getter
    Object.defineProperty(props, 'key', {
      get: warnAboutAccessingKey, // 当访问 `key` 时，调用 warnAboutAccessingKey 函数
      configurable: true, // 允许后续重新定义该属性
    });
  }
}

/**
 * 获取元素的 `ref` 属性，并在开发模式下显示弃用警告。
 * 在 React 19 中，`element.ref` 的访问方式已被移除，`ref` 现在是一个普通的 prop。
 *
 * @returns {*} - 返回 `ref` 属性的值。如果 `ref` 为 `undefined`，则返回 `null`。
 */
function elementRefGetterWithDeprecationWarning() {
  if (__DEV__) { // 仅在开发模式下执行
    // 获取当前组件的名称
    const componentName = getComponentNameFromType(this.type);

    // 如果当前组件的 `ref` 警告尚未显示过，则显示警告
    if (!didWarnAboutElementRef[componentName]) {
      didWarnAboutElementRef[componentName] = true; // 标记警告已显示
      console.error(
        'Accessing element.ref was removed in React 19. ref is now a ' +
        'regular prop. It will be removed from the JSX Element ' +
        'type in a future release.',
      );
    }

    // 为了向后兼容，将 `undefined` 的 `ref` 强制转换为 `null`
    const refProp = this.props.ref;
    return refProp !== undefined ? refProp : null;
  }
}

/**
 * 工厂方法，用于创建一个新的 React 元素。
 * 该方法不再遵循类模式，因此不要使用 `new` 来调用它。
 * 此外，`instanceof` 检查也不起作用。
 * 相反，可以通过检查 `$$typeof` 字段是否为 `Symbol.for('react.transitional.element')` 来判断某个对象是否是 React 元素。
 *
 * @param {*} type - 元素的类型（例如，字符串 'div' 或函数组件）。
 * @param {*} key - 元素的 key，用于在列表中唯一标识元素。
 * @param {*} self - 一个临时辅助变量，用于检测 `React.createElement` 调用时 `this` 和 `owner` 是否相同，以便发出警告。
 * @param {*} source - 一个注解对象（由转译器或其他工具添加），包含文件名、行号等信息。
 * @param {*} owner - 创建此元素的组件。
 * @param {*} props - 元素的属性（props）。
 * @param {*} debugStack - 开发模式下用于调试的堆栈信息。
 * @param {*} debugTask - 开发模式下用于调试的任务信息。
 * @internal
 */
function ReactElement(
  type,
  key,
  self,
  source,
  owner,
  props,
  debugStack,
  debugTask,
) {
  // 忽略传入的 ref 参数，将 `props.ref` 作为 ref 的真实来源。
  // 我们只使用 `element.ref`，它会在访问时记录弃用警告。
  // 在下一个版本中，我们将移除 `element.ref` 以及 `ref` 参数。
  const refProp = props.ref;

  // 为了向后兼容，将 `undefined` 的 `ref` 强制转换为 `null`。
  const ref = refProp !== undefined ? refProp : null;

  let element;
  if (__DEV__) { // 开发模式下的处理
    // 在开发模式下，将 `ref` 定义为一个不可枚举的属性，并附加警告。
    // 不可枚举是为了防止测试匹配器和序列化工具访问它并触发警告。
    //
    // `ref` 将在未来的版本中从元素中完全移除。
    element = {
      // 这个标签允许我们唯一标识这是一个 React 元素
      $$typeof: REACT_ELEMENT_TYPE,

      // 元素的固有属性
      type,
      key,

      props,

      // 记录创建此元素的组件
      _owner: owner,
    };
    if (ref !== null) {
      // 如果 `ref` 不为 `null`，则定义一个不可枚举的 `ref` 属性，并在访问时触发警告
      Object.defineProperty(element, 'ref', {
        enumerable: false,
        get: elementRefGetterWithDeprecationWarning,
      });
    } else {
      // 如果 `ref` 为 `null`，则直接定义一个不可枚举的 `ref` 属性，值为 `null`
      Object.defineProperty(element, 'ref', {
        enumerable: false,
        value: null,
      });
    }
  } else { // 生产模式下的处理
    // 在生产模式下，`ref` 是一个普通属性，且 `_owner` 不存在
    element = {
      // 这个标签允许我们唯一标识这是一个 React 元素
      $$typeof: REACT_ELEMENT_TYPE,

      // 元素的固有属性
      type,
      key,
      ref,

      props,
    };
  }

  if (__DEV__) { // 开发模式下的额外处理
    // 验证标志目前是可变的。我们将其放在外部存储中，以便可以冻结整个对象。
    // 一旦 WeakMap 在常用开发环境中实现，这可以被替换为 WeakMap。
    element._store = {};

    // 为了使测试中的 React 元素比较更容易，我们将验证标志设置为不可枚举（在可能的情况下），
    // 这样测试框架会忽略它。
    Object.defineProperty(element._store, 'validated', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: 0,
    });

    // `_debugInfo` 包含服务器组件的调试信息
    Object.defineProperty(element, '_debugInfo', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: null,
    });

    if (enableOwnerStacks) { // 如果启用了组件堆栈跟踪
      // 添加调试堆栈信息
      Object.defineProperty(element, '_debugStack', {
        configurable: false,
        enumerable: false,
        writable: true,
        value: debugStack,
      });

      // 添加调试任务信息
      Object.defineProperty(element, '_debugTask', {
        configurable: false,
        enumerable: false,
        writable: true,
        value: debugTask,
      });
    }

    // 如果环境支持 `Object.freeze`，则冻结 `props` 和 `element`，防止意外修改
    if (Object.freeze) {
      Object.freeze(element.props);
      Object.freeze(element);
    }
  }

  return element; // 返回创建的 React 元素
}

/**
 * https://github.com/reactjs/rfcs/pull/107
 * @param {*} type
 * @param {object} props
 * @param {string} key
 */
export function jsxProd(type, config, maybeKey) {
  let key = null;

  // Currently, key can be spread in as a prop. This causes a potential
  // issue if key is also explicitly declared (ie. <div {...props} key="Hi" />
  // or <div key="Hi" {...props} /> ). We want to deprecate key spread,
  // but as an intermediary step, we will use jsxDEV for everything except
  // <div {...props} key="Hi" />, because we aren't currently able to tell if
  // key is explicitly declared to be undefined or not.
  if (maybeKey !== undefined) {
    if (__DEV__) {
      checkKeyStringCoercion(maybeKey);
    }
    key = '' + maybeKey;
  }

  if (hasValidKey(config)) {
    if (__DEV__) {
      checkKeyStringCoercion(config.key);
    }
    key = '' + config.key;
  }

  let props;
  if (!('key' in config)) {
    // If key was not spread in, we can reuse the original props object. This
    // only works for `jsx`, not `createElement`, because `jsx` is a compiler
    // target and the compiler always passes a new object. For `createElement`,
    // we can't assume a new object is passed every time because it can be
    // called manually.
    //
    // Spreading key is a warning in dev. In a future release, we will not
    // remove a spread key from the props object. (But we'll still warn.) We'll
    // always pass the object straight through.
    props = config;
  } else {
    // We need to remove reserved props (key, prop, ref). Create a fresh props
    // object and copy over all the non-reserved props. We don't use `delete`
    // because in V8 it will deopt the object to dictionary mode.
    props = {};
    for (const propName in config) {
      // Skip over reserved prop names
      if (propName !== 'key') {
        props[propName] = config[propName];
      }
    }
  }

  if (!disableDefaultPropsExceptForClasses) {
    // Resolve default props
    if (type && type.defaultProps) {
      const defaultProps = type.defaultProps;
      for (const propName in defaultProps) {
        if (props[propName] === undefined) {
          props[propName] = defaultProps[propName];
        }
      }
    }
  }

  return ReactElement(
    type,
    key,
    undefined,
    undefined,
    getOwner(),
    props,
    undefined,
    undefined,
  );
}

// While `jsxDEV` should never be called when running in production, we do
// support `jsx` and `jsxs` when running in development. This supports the case
// where a third-party dependency ships code that was compiled for production;
// we want to still provide warnings in development.
//
// So these functions are the _dev_ implementations of the _production_
// API signatures.
//
// Since these functions are dev-only, it's ok to add an indirection here. They
// only exist to provide different versions of `isStaticChildren`. (We shouldn't
// use this pattern for the prod versions, though, because it will add an call
// frame.)
export function jsxProdSignatureRunningInDevWithDynamicChildren(
  type,
  config,
  maybeKey,
  source,
  self,
) {
  if (__DEV__) {
    const isStaticChildren = false;
    return jsxDEVImpl(
      type,
      config,
      maybeKey,
      isStaticChildren,
      source,
      self,
      __DEV__ && enableOwnerStacks ? Error('react-stack-top-frame') : undefined,
      __DEV__ && enableOwnerStacks ? createTask(getTaskName(type)) : undefined,
    );
  }
}

export function jsxProdSignatureRunningInDevWithStaticChildren(
  type,
  config,
  maybeKey,
  source,
  self,
) {
  if (__DEV__) {
    const isStaticChildren = true;
    return jsxDEVImpl(
      type,
      config,
      maybeKey,
      isStaticChildren,
      source,
      self,
      __DEV__ && enableOwnerStacks ? Error('react-stack-top-frame') : undefined,
      __DEV__ && enableOwnerStacks ? createTask(getTaskName(type)) : undefined,
    );
  }
}

const didWarnAboutKeySpread = {};

/**
 * https://github.com/reactjs/rfcs/pull/107
 * @param {*} type
 * @param {object} props
 * @param {string} key
 */
export function jsxDEV(type, config, maybeKey, isStaticChildren, source, self) {
  return jsxDEVImpl(
    type,
    config,
    maybeKey,
    isStaticChildren,
    source,
    self,
    __DEV__ && enableOwnerStacks ? Error('react-stack-top-frame') : undefined,
    __DEV__ && enableOwnerStacks ? createTask(getTaskName(type)) : undefined,
  );
}

function jsxDEVImpl(
  type,
  config,
  maybeKey,
  isStaticChildren,
  source,
  self,
  debugStack,
  debugTask,
) {
  if (__DEV__) {
    if (!enableOwnerStacks && !isValidElementType(type)) {
      // This is an invalid element type.
      //
      // We warn here so that we can get better stack traces but with enableOwnerStacks
      // enabled we don't need this because we get good stacks if we error in the
      // renderer anyway. The renderer is the only one that knows what types are valid
      // for this particular renderer so we let it error there instead.
      //
      // We warn in this case but don't throw. We expect the element creation to
      // succeed and there will likely be errors in render.
      let info = '';
      if (
        type === undefined ||
        (typeof type === 'object' &&
          type !== null &&
          Object.keys(type).length === 0)
      ) {
        info +=
          ' You likely forgot to export your component from the file ' +
          "it's defined in, or you might have mixed up default and named imports.";
      }

      let typeString;
      if (type === null) {
        typeString = 'null';
      } else if (isArray(type)) {
        typeString = 'array';
      } else if (type !== undefined && type.$$typeof === REACT_ELEMENT_TYPE) {
        typeString = `<${getComponentNameFromType(type.type) || 'Unknown'} />`;
        info =
          ' Did you accidentally export a JSX literal instead of a component?';
      } else {
        typeString = typeof type;
      }

      console.error(
        'React.jsx: type is invalid -- expected a string (for ' +
        'built-in components) or a class/function (for composite ' +
        'components) but got: %s.%s',
        typeString,
        info,
      );
    } else {
      // This is a valid element type.

      // Skip key warning if the type isn't valid since our key validation logic
      // doesn't expect a non-string/function type and can throw confusing
      // errors. We don't want exception behavior to differ between dev and
      // prod. (Rendering will throw with a helpful message and as soon as the
      // type is fixed, the key warnings will appear.)
      // When enableOwnerStacks is on, we no longer need the type here so this
      // comment is no longer true. Which is why we can run this even for invalid
      // types.
      const children = config.children;
      if (children !== undefined) {
        if (isStaticChildren) {
          if (isArray(children)) {
            for (let i = 0; i < children.length; i++) {
              validateChildKeys(children[i], type);
            }

            if (Object.freeze) {
              Object.freeze(children);
            }
          } else {
            console.error(
              'React.jsx: Static children should always be an array. ' +
              'You are likely explicitly calling React.jsxs or React.jsxDEV. ' +
              'Use the Babel transform instead.',
            );
          }
        } else {
          validateChildKeys(children, type);
        }
      }
    }

    // Warn about key spread regardless of whether the type is valid.
    if (hasOwnProperty.call(config, 'key')) {
      const componentName = getComponentNameFromType(type);
      const keys = Object.keys(config).filter(k => k !== 'key');
      const beforeExample =
        keys.length > 0
          ? '{key: someKey, ' + keys.join(': ..., ') + ': ...}'
          : '{key: someKey}';
      if (!didWarnAboutKeySpread[componentName + beforeExample]) {
        const afterExample =
          keys.length > 0 ? '{' + keys.join(': ..., ') + ': ...}' : '{}';
        console.error(
          'A props object containing a "key" prop is being spread into JSX:\n' +
          '  let props = %s;\n' +
          '  <%s {...props} />\n' +
          'React keys must be passed directly to JSX without using spread:\n' +
          '  let props = %s;\n' +
          '  <%s key={someKey} {...props} />',
          beforeExample,
          componentName,
          afterExample,
          componentName,
        );
        didWarnAboutKeySpread[componentName + beforeExample] = true;
      }
    }

    let key = null;

    // Currently, key can be spread in as a prop. This causes a potential
    // issue if key is also explicitly declared (ie. <div {...props} key="Hi" />
    // or <div key="Hi" {...props} /> ). We want to deprecate key spread,
    // but as an intermediary step, we will use jsxDEV for everything except
    // <div {...props} key="Hi" />, because we aren't currently able to tell if
    // key is explicitly declared to be undefined or not.
    if (maybeKey !== undefined) {
      if (__DEV__) {
        checkKeyStringCoercion(maybeKey);
      }
      key = '' + maybeKey;
    }

    if (hasValidKey(config)) {
      if (__DEV__) {
        checkKeyStringCoercion(config.key);
      }
      key = '' + config.key;
    }

    let props;
    if (!('key' in config)) {
      // If key was not spread in, we can reuse the original props object. This
      // only works for `jsx`, not `createElement`, because `jsx` is a compiler
      // target and the compiler always passes a new object. For `createElement`,
      // we can't assume a new object is passed every time because it can be
      // called manually.
      //
      // Spreading key is a warning in dev. In a future release, we will not
      // remove a spread key from the props object. (But we'll still warn.) We'll
      // always pass the object straight through.
      props = config;
    } else {
      // We need to remove reserved props (key, prop, ref). Create a fresh props
      // object and copy over all the non-reserved props. We don't use `delete`
      // because in V8 it will deopt the object to dictionary mode.
      props = {};
      for (const propName in config) {
        // Skip over reserved prop names
        if (propName !== 'key') {
          props[propName] = config[propName];
        }
      }
    }

    if (!disableDefaultPropsExceptForClasses) {
      // Resolve default props
      if (type && type.defaultProps) {
        const defaultProps = type.defaultProps;
        for (const propName in defaultProps) {
          if (props[propName] === undefined) {
            props[propName] = defaultProps[propName];
          }
        }
      }
    }

    if (key) {
      const displayName =
        typeof type === 'function'
          ? type.displayName || type.name || 'Unknown'
          : type;
      defineKeyPropWarningGetter(props, displayName);
    }

    return ReactElement(
      type,
      key,
      self,
      source,
      getOwner(),
      props,
      debugStack,
      debugTask,
    );
  }
}

/**
 * 创建并返回一个新的 ReactElement，类型为给定的 type。
 * 参见 https://reactjs.org/docs/react-api.html#createelement
 */
export function createElement(type, config, children) {
  if (__DEV__) {
    if (!enableOwnerStacks && !isValidElementType(type)) {
      // 这是一个乐观检查，提供更好的堆栈追踪信息
      // 在启用 owner stacks 时，堆栈追踪会在渲染器中提供更详细的错误信息
      // 这是一个无效的元素类型。
      //
      // 我们在这种情况下发出警告，但不会抛出异常。我们预计元素创建会成功，
      // 渲染时可能会出现错误。
      let info = '';
      if (
        type === undefined ||
        (typeof type === 'object' &&
          type !== null &&
          Object.keys(type).length === 0)
      ) {
        info +=
          ' 你可能忘记从定义该组件的文件中导出组件，' +
          "或者你可能混淆了默认导出和命名导出。";
      }

      let typeString;
      if (type === null) {
        typeString = 'null';
      } else if (isArray(type)) {
        typeString = 'array';
      } else if (type !== undefined && type.$$typeof === REACT_ELEMENT_TYPE) {
        typeString = `<${getComponentNameFromType(type.type) || 'Unknown'} />`;
        info =
          ' 你是否不小心导出了一个 JSX 字面量，而不是一个组件？';
      } else {
        typeString = typeof type;
      }

      console.error(
        'React.createElement: type 无效 -- 期望的是字符串（用于内建组件）或类/函数（用于复合组件），' +
        '但实际得到的是: %s.%s',
        typeString,
        info,
      );
    } else {
      // 这是一个有效的元素类型。

      // 如果类型无效，我们跳过 key 警告，因为我们的 key 验证逻辑不期望非字符串/函数类型，
      // 可能会抛出令人困惑的错误。我们不希望异常行为在开发和生产环境中有所不同。
      // (渲染时会抛出更有帮助的错误信息，一旦修复类型，key 警告会再次出现。)
      for (let i = 2; i < arguments.length; i++) {
        validateChildKeys(arguments[i], type);
      }
    }

    // 与 jsx() 不同，createElement() 不会警告 key 的传播。
  }

  let propName;

  // 保留的名称会被提取
  const props = {};

  let key = null;

  if (config != null) {
    if (__DEV__) {
      if (
        !didWarnAboutOldJSXRuntime &&
        '__self' in config &&
        // 如果 key 存在，不认为这是旧版 JSX 转换的结果，因为现代 JSX 转换有时会使用 createElement 来保留静态 key 和扩展 key 之间的优先级。
        // 为了避免误报，我们在 key 存在时不会发出警告。
        !('key' in config)
      ) {
        didWarnAboutOldJSXRuntime = true;
        console.warn(
          '你的应用（或其某个依赖）使用了过时的 JSX 转换。更新到现代 JSX 转换以提高性能：' +
          'https://react.dev/link/new-jsx-transform',
        );
      }
    }

    if (hasValidKey(config)) {
      if (__DEV__) {
        checkKeyStringCoercion(config.key);
      }
      key = '' + config.key;
    }

    // 其余的属性会被添加到新的 props 对象中
    for (propName in config) {
      if (
        hasOwnProperty.call(config, propName) &&
        // 跳过保留的 prop 名称
        propName !== 'key' &&
        // 即使我们在运行时不再使用这些属性，也不希望它们出现在 props 中，所以在 createElement 中会过滤掉它们。
        // 我们在 jsx() 运行时不需要做这些过滤，因为 jsx() 转换从未将这些作为 props 传递；它使用单独的参数。
        propName !== '__self' &&
        propName !== '__source'
      ) {
        props[propName] = config[propName];
      }
    }
  }

  // 子节点可以是多个参数，这些会被传递到新的 props 对象中
  const childrenLength = arguments.length - 2;
  if (childrenLength === 1) {
    props.children = children;
  } else if (childrenLength > 1) {
    const childArray = Array(childrenLength);
    for (let i = 0; i < childrenLength; i++) {
      childArray[i] = arguments[i + 2];
    }
    if (__DEV__) {
      if (Object.freeze) {
        Object.freeze(childArray);
      }
    }
    props.children = childArray;
  }

  // 处理默认 props
  if (type && type.defaultProps) {
    const defaultProps = type.defaultProps;
    for (propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }
  }
  if (__DEV__) {
    if (key) {
      const displayName =
        typeof type === 'function'
          ? type.displayName || type.name || 'Unknown'
          : type;
      defineKeyPropWarningGetter(props, displayName);
    }
  }

  return ReactElement(
    type,
    key,
    undefined,
    undefined,
    getOwner(),
    props,
    __DEV__ && enableOwnerStacks ? Error('react-stack-top-frame') : undefined,
    __DEV__ && enableOwnerStacks ? createTask(getTaskName(type)) : undefined,
  );
}


export function cloneAndReplaceKey(oldElement, newKey) {
  const clonedElement = ReactElement(
    oldElement.type,
    newKey,
    undefined,
    undefined,
    !__DEV__ ? undefined : oldElement._owner,
    oldElement.props,
    __DEV__ && enableOwnerStacks ? oldElement._debugStack : undefined,
    __DEV__ && enableOwnerStacks ? oldElement._debugTask : undefined,
  );
  if (__DEV__) {
    // The cloned element should inherit the original element's key validation.
    clonedElement._store.validated = oldElement._store.validated;
  }
  return clonedElement;
}

/**
 * Clone and return a new ReactElement using element as the starting point.
 * See https://reactjs.org/docs/react-api.html#cloneelement
 */
export function cloneElement(element, config, children) {
  if (element === null || element === undefined) {
    throw new Error(
      `The argument must be a React element, but you passed ${element}.`,
    );
  }

  let propName;

  // Original props are copied
  const props = assign({}, element.props);

  // Reserved names are extracted
  let key = element.key;

  // Owner will be preserved, unless ref is overridden
  let owner = !__DEV__ ? undefined : element._owner;

  if (config != null) {
    if (hasValidRef(config)) {
      owner = __DEV__ ? getOwner() : undefined;
    }
    if (hasValidKey(config)) {
      if (__DEV__) {
        checkKeyStringCoercion(config.key);
      }
      key = '' + config.key;
    }

    // Remaining properties override existing props
    let defaultProps;
    if (
      !disableDefaultPropsExceptForClasses &&
      element.type &&
      element.type.defaultProps
    ) {
      defaultProps = element.type.defaultProps;
    }
    for (propName in config) {
      if (
        hasOwnProperty.call(config, propName) &&
        // Skip over reserved prop names
        propName !== 'key' &&
        // ...and maybe these, too, though we currently rely on them for
        // warnings and debug information in dev. Need to decide if we're OK
        // with dropping them. In the jsx() runtime it's not an issue because
        // the data gets passed as separate arguments instead of props, but
        // it would be nice to stop relying on them entirely so we can drop
        // them from the internal Fiber field.
        propName !== '__self' &&
        propName !== '__source' &&
        // Undefined `ref` is ignored by cloneElement. We treat it the same as
        // if the property were missing. This is mostly for
        // backwards compatibility.
        !(propName === 'ref' && config.ref === undefined)
      ) {
        if (
          !disableDefaultPropsExceptForClasses &&
          config[propName] === undefined &&
          defaultProps !== undefined
        ) {
          // Resolve default props
          props[propName] = defaultProps[propName];
        } else {
          props[propName] = config[propName];
        }
      }
    }
  }

  // Children can be more than one argument, and those are transferred onto
  // the newly allocated props object.
  const childrenLength = arguments.length - 2;
  if (childrenLength === 1) {
    props.children = children;
  } else if (childrenLength > 1) {
    const childArray = Array(childrenLength);
    for (let i = 0; i < childrenLength; i++) {
      childArray[i] = arguments[i + 2];
    }
    props.children = childArray;
  }

  const clonedElement = ReactElement(
    element.type,
    key,
    undefined,
    undefined,
    owner,
    props,
    __DEV__ && enableOwnerStacks ? element._debugStack : undefined,
    __DEV__ && enableOwnerStacks ? element._debugTask : undefined,
  );

  for (let i = 2; i < arguments.length; i++) {
    validateChildKeys(arguments[i], clonedElement.type);
  }

  return clonedElement;
}

/**
 * Ensure that every element either is passed in a static location, in an
 * array with an explicit keys property defined, or in an object literal
 * with valid key property.
 *
 * @internal
 * @param {ReactNode} node Statically passed child of any type.
 * @param {*} parentType node's parent's type.
 */
function validateChildKeys(node, parentType) {
  if (__DEV__) {
    if (enableOwnerStacks) {
      // When owner stacks is enabled no warnings happens. All we do is
      // mark elements as being in a valid static child position so they
      // don't need keys.
      if (isValidElement(node)) {
        if (node._store) {
          node._store.validated = 1;
        }
      }
      return;
    }
    if (typeof node !== 'object' || !node) {
      return;
    }
    if (node.$$typeof === REACT_CLIENT_REFERENCE) {
      // This is a reference to a client component so it's unknown.
    } else if (isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const child = node[i];
        if (isValidElement(child)) {
          validateExplicitKey(child, parentType);
        }
      }
    } else if (isValidElement(node)) {
      // This element was passed in a valid location.
      if (node._store) {
        node._store.validated = 1;
      }
    } else {
      const iteratorFn = getIteratorFn(node);
      if (typeof iteratorFn === 'function') {
        // Entry iterators used to provide implicit keys,
        // but now we print a separate warning for them later.
        if (iteratorFn !== node.entries) {
          const iterator = iteratorFn.call(node);
          if (iterator !== node) {
            let step;
            while (!(step = iterator.next()).done) {
              if (isValidElement(step.value)) {
                validateExplicitKey(step.value, parentType);
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Verifies the object is a ReactElement.
 * See https://reactjs.org/docs/react-api.html#isvalidelement
 * @param {?object} object
 * @return {boolean} True if `object` is a ReactElement.
 * @final
 */
export function isValidElement(object) {
  return (
    typeof object === 'object' &&
    object !== null &&
    object.$$typeof === REACT_ELEMENT_TYPE
  );
}

const ownerHasKeyUseWarning = {};

/**
 * Warn if the element doesn't have an explicit key assigned to it.
 * This element is in an array. The array could grow and shrink or be
 * reordered. All children that haven't already been validated are required to
 * have a "key" property assigned to it. Error statuses are cached so a warning
 * will only be shown once.
 *
 * @internal
 * @param {ReactElement} element Element that requires a key.
 * @param {*} parentType element's parent's type.
 */
function validateExplicitKey(element, parentType) {
  if (enableOwnerStacks) {
    // Skip. Will verify in renderer instead.
    return;
  }
  if (__DEV__) {
    if (!element._store || element._store.validated || element.key != null) {
      return;
    }
    element._store.validated = 1;

    const currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
    if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
      return;
    }
    ownerHasKeyUseWarning[currentComponentErrorInfo] = true;

    // Usually the current owner is the offender, but if it accepts children as a
    // property, it may be the creator of the child that's responsible for
    // assigning it a key.
    let childOwner = '';
    if (element && element._owner != null && element._owner !== getOwner()) {
      let ownerName = null;
      if (typeof element._owner.tag === 'number') {
        ownerName = getComponentNameFromType(element._owner.type);
      } else if (typeof element._owner.name === 'string') {
        ownerName = element._owner.name;
      }
      // Give the component that originally created this child.
      childOwner = ` It was passed a child from ${ownerName}.`;
    }

    const prevGetCurrentStack = ReactSharedInternals.getCurrentStack;
    ReactSharedInternals.getCurrentStack = function () {
      const owner = element._owner;
      // Add an extra top frame while an element is being validated
      let stack = describeUnknownElementTypeFrameInDEV(
        element.type,
        owner ? owner.type : null,
      );
      // Delegate to the injected renderer-specific implementation
      if (prevGetCurrentStack) {
        stack += prevGetCurrentStack() || '';
      }
      return stack;
    };
    console.error(
      'Each child in a list should have a unique "key" prop.' +
      '%s%s See https://react.dev/link/warning-keys for more information.',
      currentComponentErrorInfo,
      childOwner,
    );
    ReactSharedInternals.getCurrentStack = prevGetCurrentStack;
  }
}

function getCurrentComponentErrorInfo(parentType) {
  if (__DEV__) {
    let info = '';
    const owner = getOwner();
    if (owner) {
      const name = getComponentNameFromType(owner.type);
      if (name) {
        info = '\n\nCheck the render method of `' + name + '`.';
      }
    }
    if (!info) {
      const parentName = getComponentNameFromType(parentType);
      if (parentName) {
        info = `\n\nCheck the top-level render call using <${parentName}>.`;
      }
    }
    return info;
  }
}
