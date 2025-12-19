/**
 * PluginManager 类单元测试
 */

import { assertEquals, assert } from '@std/assert';
import { PluginManager } from '../../../src/core/plugin.ts';
import type { Plugin, Request, Response } from '../../../src/types/index.ts';

Deno.test('PluginManager - 创建实例', () => {
  const manager = new PluginManager();
  assert(manager !== null);
});

Deno.test('PluginManager - 注册插件对象', () => {
  const manager = new PluginManager();
  const plugin: Plugin = {
    name: 'test-plugin',
    onInit: async () => {},
  };
  
  manager.register(plugin);
  const plugins = manager.getAll();
  assertEquals(plugins.length, 1);
  assertEquals(plugins[0].name, 'test-plugin');
});

Deno.test('PluginManager - 注册插件配置', () => {
  const manager = new PluginManager();
  const pluginConfig = {
    name: 'test-plugin',
    config: { key: 'value' },
  };
  
  manager.register(pluginConfig);
  const plugins = manager.getAll();
  assertEquals(plugins.length, 1);
  assertEquals(plugins[0].name, 'test-plugin');
});

Deno.test('PluginManager - 批量注册插件', () => {
  const manager = new PluginManager();
  const plugins: Plugin[] = [
    { name: 'plugin1' },
    { name: 'plugin2' },
    { name: 'plugin3' },
  ];
  
  manager.registerMany(plugins);
  const allPlugins = manager.getAll();
  assertEquals(allPlugins.length, 3);
});

Deno.test('PluginManager - 执行 onInit 钩子', async () => {
  const manager = new PluginManager();
  const callOrder: string[] = [];
  
  const plugin1: Plugin = {
    name: 'plugin1',
    onInit: async () => {
      callOrder.push('plugin1');
    },
  };
  
  const plugin2: Plugin = {
    name: 'plugin2',
    onInit: async () => {
      callOrder.push('plugin2');
    },
  };
  
  manager.register(plugin1);
  manager.register(plugin2);
  
  await manager.executeOnInit({} as any);
  
  assertEquals(callOrder.length, 2);
  assertEquals(callOrder[0], 'plugin1');
  assertEquals(callOrder[1], 'plugin2');
});

Deno.test('PluginManager - 执行 onRequest 钩子', async () => {
  const manager = new PluginManager();
  const callOrder: string[] = [];
  
  const plugin: Plugin = {
    name: 'plugin',
    onRequest: async (_req, _res) => {
      callOrder.push('onRequest');
    },
  };
  
  manager.register(plugin);
  
  const req = {} as Request;
  const res = {} as Response;
  await manager.executeOnRequest(req, res);
  
  assertEquals(callOrder.length, 1);
  assertEquals(callOrder[0], 'onRequest');
});

Deno.test('PluginManager - 执行 onResponse 钩子', async () => {
  const manager = new PluginManager();
  const callOrder: string[] = [];
  
  const plugin: Plugin = {
    name: 'plugin',
    onResponse: async (_req, _res) => {
      callOrder.push('onResponse');
    },
  };
  
  manager.register(plugin);
  
  const req = {} as Request;
  const res = {} as Response;
  await manager.executeOnResponse(req, res);
  
  assertEquals(callOrder.length, 1);
  assertEquals(callOrder[0], 'onResponse');
});

Deno.test('PluginManager - 执行 onError 钩子', async () => {
  const manager = new PluginManager();
  const callOrder: string[] = [];
  
  const plugin: Plugin = {
    name: 'plugin',
    onError: async (_err, _req, _res) => {
      callOrder.push('onError');
    },
  };
  
  manager.register(plugin);
  
  const error = new Error('Test error');
  const req = {
    url: 'http://localhost:3000/test',
    method: 'GET',
    headers: new Headers(),
    getHeader: function(_name: string) { return null; },
  } as Request;
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: function(_name: string, _value: string) {},
  } as Response;
  await manager.executeOnError(error, req, res);
  
  // 验证钩子被调用
  assert(callOrder.length === 1);
  assert(callOrder[0] === 'onError');
});

Deno.test('PluginManager - 执行 onBuild 钩子', async () => {
  const manager = new PluginManager();
  let hookCalled = false;
  
  // 确保插件对象包含 onBuild 方法
  const plugin: Plugin = {
    name: 'plugin',
    onBuild: async (_config) => {
      hookCalled = true;
    },
  };
  
  manager.register(plugin);
  
  // 验证插件已注册
  const plugins = manager.getAll();
  assert(plugins.length > 0);
  
  // executeOnBuild 需要传入构建配置对象
  await manager.executeOnBuild({ outDir: 'dist' } as any);
  
  // 验证钩子被调用
  assert(hookCalled, 'onBuild 钩子应该被调用');
});

Deno.test('PluginManager - 执行 onStart 钩子', async () => {
  const manager = new PluginManager();
  let hookCalled = false;
  
  // 确保插件对象包含 onStart 方法
  const plugin: Plugin = {
    name: 'plugin',
    onStart: async (_app) => {
      hookCalled = true;
    },
  };
  
  manager.register(plugin);
  
  // 验证插件已注册
  const plugins = manager.getAll();
  assert(plugins.length > 0);
  
  // executeOnStart 需要传入应用实例
  const mockApp = { server: {}, middleware: {}, plugins: {} };
  await manager.executeOnStart(mockApp as any);
  
  // 验证钩子被调用
  assert(hookCalled, 'onStart 钩子应该被调用');
});

Deno.test('PluginManager - 清空所有插件', () => {
  const manager = new PluginManager();
  manager.register({ name: 'plugin1' });
  manager.register({ name: 'plugin2' });
  
  assertEquals(manager.getAll().length, 2);
  
  manager.clear();
  
  assertEquals(manager.getAll().length, 0);
});

Deno.test('PluginManager - 插件不包含钩子时不执行', async () => {
  const manager = new PluginManager();
  const callOrder: string[] = [];
  
  const plugin: Plugin = {
    name: 'plugin',
    // 没有钩子
  };
  
  manager.register(plugin);
  
  await manager.executeOnInit({} as any);
  await manager.executeOnRequest({} as Request, {} as Response);
  await manager.executeOnResponse({} as Request, {} as Response);
  
  // 不应该有任何调用
  assertEquals(callOrder.length, 0);
});

