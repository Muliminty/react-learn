# `react`

React 是一个用于创建用户界面的 JavaScript 库。

`react` 包仅包含定义 React 组件所需的核心功能。通常会与 React 渲染器一起使用，比如用于 Web 的 `react-dom` 或用于原生环境的 `react-native`。

**注意：** 默认情况下，React 运行在开发模式中。开发版本包含额外的警告信息，用于帮助开发者发现常见错误；而生产版本则会进行性能优化，并移除所有错误消息。在部署应用时，请务必使用[生产版本](https://reactjs.org/docs/optimizing-performance.html#use-the-production-build)。

## 使用示例

```js
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <>
      <h1>{count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<Counter />);
```

## 文档

参考：https://react.dev/

## API

参考：https://react.dev/reference/react

---

# `react`

React is a JavaScript library for creating user interfaces.

The `react` package contains only the functionality necessary to define React components. It is typically used together with a React renderer like `react-dom` for the web, or `react-native` for the native environments.

**Note:** by default, React will be in development mode. The development version includes extra warnings about common mistakes, whereas the production version includes extra performance optimizations and strips all error messages. Don't forget to use the [production build](https://reactjs.org/docs/optimizing-performance.html#use-the-production-build) when deploying your application.

## Usage

```js
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <>
      <h1>{count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<Counter />);
```

## Documentation

See https://react.dev/

## API

See https://react.dev/reference/react
