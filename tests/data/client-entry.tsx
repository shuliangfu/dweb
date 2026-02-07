/**
 * 测试用客户端入口文件
 * 用于构建测试的输入
 */
/** @jsxImportSource preact */

// 模拟客户端组件
const App = () => {
  return (
    <div id="app">
      <h1>Hello World</h1>
      <p>This is a test client entry.</p>
    </div>
  );
};

/**
 * 渲染应用到 DOM
 */
export function render() {
  console.log("Rendering app...");
}

// 默认导出
export default App;
