/**
 * 订单服务示例
 */

export interface Order {
  id: string;
  userId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
}

export class OrderService {
  private orders: Map<string, Order> = new Map();

  constructor() {
    // 初始化一些示例订单
    this.orders.set("1", {
      id: "1",
      userId: "1",
      items: [
        { productId: "1", quantity: 2, price: 99.99 },
        { productId: "2", quantity: 1, price: 49.99 },
      ],
      total: 249.97,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * 根据 ID 获取订单
   */
  getOrderById(id: string): Order | null {
    return this.orders.get(id) || null;
  }

  /**
   * 获取用户的所有订单
   */
  getOrdersByUserId(userId: string): Order[] {
    return Array.from(this.orders.values()).filter(
      (order) => order.userId === userId,
    );
  }

  /**
   * 创建订单
   */
  createOrder(order: Omit<Order, "id" | "createdAt">): Order {
    const id = String(this.orders.size + 1);
    const newOrder: Order = {
      ...order,
      id,
      createdAt: new Date().toISOString(),
    };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  /**
   * 更新订单状态
   */
  updateOrderStatus(id: string, status: Order["status"]): Order | null {
    const order = this.orders.get(id);
    if (!order) {
      return null;
    }
    const updatedOrder = { ...order, status };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  /**
   * 获取所有订单
   */
  getAllOrders(): Order[] {
    return Array.from(this.orders.values());
  }
}
