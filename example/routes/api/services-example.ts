/**
 * 服务容器使用示例 API
 * 演示如何在 API 路由中获取和使用服务
 * 
 * 为什么需要使用服务容器而不是直接 new？
 * 1. **单例模式**：服务容器确保整个应用只有一个服务实例，数据共享
 * 2. **状态管理**：如果直接 new，每次都会创建新实例，数据不共享
 * 3. **依赖注入**：服务之间可以相互依赖，容器自动解析
 * 4. **测试友好**：可以轻松替换为 mock 服务
 * 5. **生命周期管理**：支持单例、瞬态、作用域等不同生命周期
 */

import type { Request, Response } from '@dreamer/dweb';
import { UserService } from '../../services/user.ts';
import { OrderService } from '../../services/order.ts';

// GET /api/services-example/get-users
export function getUsers(req: Request, res?: Response) {
  if (!res) {
    throw new Error('Response object is required');
  }
  
  try {
    // 通过 req.getApplication() 获取 Application 实例
    const application = req.getApplication?.();
    if (!application) {
      return res.json({
        success: false,
        error: 'Application 实例不可用',
      }, { status: 500 });
    }
    
    // 从服务容器获取已注册的服务（单例模式，整个应用共享同一个实例）
    const userService = application.getService<UserService>('userService');
    const users = userService.getAllUsers();
    
    return res.json({
      success: true,
      data: users,
      message: '✅ 使用服务容器获取服务，数据在多个请求间共享',
    });
  } catch (error) {
    return res.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

// GET /api/services-example/get-user
export function getUser(req: Request, res?: Response) {
  if (!res) {
    throw new Error('Response object is required');
  }
  
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return res.json({
        success: false,
        error: '用户 ID 不能为空',
      }, { status: 400 });
    }
    
    // 通过 req.getApplication() 获取 Application 实例
    const application = req.getApplication?.();
    if (!application) {
      return res.json({
        success: false,
        error: 'Application 实例不可用',
      }, { status: 500 });
    }
    
    // 从服务容器获取已注册的服务（单例模式）
    const userService = application.getService<UserService>('userService');
    const user = userService.getUserById(id);
    
    if (!user) {
      return res.json({
        success: false,
        error: '用户不存在',
      }, { status: 404 });
    }
    
    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

// POST /api/services-example/create-user
// 演示：使用服务容器，创建的用户会在所有请求间共享
export function createUser(req: Request, res?: Response) {
  if (!res) {
    throw new Error('Response object is required');
  }
  
  try {
    const application = req.getApplication?.();
    if (!application) {
      return res.json({
        success: false,
        error: 'Application 实例不可用',
      }, { status: 500 });
    }
    
    // 从服务容器获取服务（单例模式）
    const userService = application.getService<UserService>('userService');
    
    // 从请求体获取用户数据
    const body = req.body as { name?: string; email?: string };
    if (!body?.name || !body?.email) {
      return res.json({
        success: false,
        error: '用户名和邮箱不能为空',
      }, { status: 400 });
    }
    
    // 创建用户（数据会保存在服务容器的单例实例中）
    const newUser = userService.createUser({
      name: body.name,
      email: body.email,
    });
    
    return res.json({
      success: true,
      data: newUser,
      message: '✅ 用户已创建，数据保存在服务容器的单例实例中，所有请求都可以访问',
    });
  } catch (error) {
    return res.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

// GET /api/services-example/demo-singleton
// 演示：服务容器的单例模式 vs 直接 new 的区别
export function demoSingleton(req: Request, res?: Response) {
  if (!res) {
    throw new Error('Response object is required');
  }
  
  try {
    const application = req.getApplication?.();
    if (!application) {
      return res.json({
        success: false,
        error: 'Application 实例不可用',
      }, { status: 500 });
    }
    
    // 方式 1：使用服务容器（单例模式）
    const userService1 = application.getService<UserService>('userService');
    const userService2 = application.getService<UserService>('userService');
    const isSingleton = userService1 === userService2; // true，同一个实例
    
    // 方式 2：直接 new（每次都是新实例）
    const userService3 = new UserService();
    const userService4 = new UserService();
    const isNewInstance = userService3 === userService4; // false，不同实例
    
    // 演示数据共享问题
    // 使用服务容器：创建的用户在所有请求间共享
    userService1.createUser({ name: 'Shared User', email: 'shared@example.com' });
    const sharedUsers = userService1.getAllUsers();
    
    // 直接 new：每个实例的数据是独立的
    userService3.createUser({ name: 'Isolated User', email: 'isolated@example.com' });
    const isolatedUsers = userService3.getAllUsers();
    const containerUsers = userService1.getAllUsers(); // 不包含 isolatedUsers 的数据
    
    return res.json({
      success: true,
      data: {
        singleton: {
          isSameInstance: isSingleton,
          message: '✅ 服务容器返回同一个实例，数据共享',
        },
        directNew: {
          isSameInstance: isNewInstance,
          message: '❌ 直接 new 创建不同实例，数据不共享',
        },
        dataSharing: {
          sharedUsersCount: sharedUsers.length,
          isolatedUsersCount: isolatedUsers.length,
          containerUsersCount: containerUsers.length,
          message: '服务容器中的数据在所有请求间共享，直接 new 的数据只在当前实例中',
        },
      },
    });
  } catch (error) {
    return res.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

// GET /api/services-example/demo-dependency
// 演示：服务之间的依赖注入（OrderService 依赖 UserService）
export function demoDependency(req: Request, res?: Response) {
  if (!res) {
    throw new Error('Response object is required');
  }
  
  try {
    const application = req.getApplication?.();
    if (!application) {
      return res.json({
        success: false,
        error: 'Application 实例不可用',
      }, { status: 500 });
    }
    
    // 获取多个服务（它们都是单例，在整个应用中共享）
    const userService = application.getService<UserService>('userService');
    const orderService = application.getService<OrderService>('orderService');
    
    // 获取用户的订单（演示服务之间的协作）
    const users = userService.getAllUsers();
    const orders = orderService.getAllOrders();
    
    // 关联用户和订单
    const usersWithOrders = users.map(user => ({
      ...user,
      orders: orderService.getOrdersByUserId(user.id),
    }));
    
    return res.json({
      success: true,
      data: {
        users: users.length,
        orders: orders.length,
        usersWithOrders,
        message: '✅ 多个服务通过服务容器获取，可以轻松协作，且都是单例实例',
      },
    });
  } catch (error) {
    return res.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
