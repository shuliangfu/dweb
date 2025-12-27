/**
 * 产品服务示例
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  createdAt: string;
}

export class ProductService {
  private products: Map<string, Product> = new Map();

  constructor() {
    // 初始化一些示例产品
    this.products.set("1", {
      id: "1",
      name: "笔记本电脑",
      description: "高性能笔记本电脑",
      price: 5999.99,
      stock: 10,
      category: "电子产品",
      createdAt: new Date().toISOString(),
    });
    this.products.set("2", {
      id: "2",
      name: "无线鼠标",
      description: "人体工学无线鼠标",
      price: 199.99,
      stock: 50,
      category: "电子产品",
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * 根据 ID 获取产品
   */
  getProductById(id: string): Product | null {
    return this.products.get(id) || null;
  }

  /**
   * 获取所有产品
   */
  getAllProducts(): Product[] {
    return Array.from(this.products.values());
  }

  /**
   * 根据分类获取产品
   */
  getProductsByCategory(category: string): Product[] {
    return Array.from(this.products.values()).filter(
      (product) => product.category === category,
    );
  }

  /**
   * 创建产品
   */
  createProduct(product: Omit<Product, "id" | "createdAt">): Product {
    const id = String(this.products.size + 1);
    const newProduct: Product = {
      ...product,
      id,
      createdAt: new Date().toISOString(),
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  /**
   * 更新产品库存
   */
  updateStock(id: string, stock: number): Product | null {
    const product = this.products.get(id);
    if (!product) {
      return null;
    }
    const updatedProduct = { ...product, stock };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  /**
   * 搜索产品
   */
  searchProducts(keyword: string): Product[] {
    const lowerKeyword = keyword.toLowerCase();
    return Array.from(this.products.values()).filter(
      (product) =>
        product.name.toLowerCase().includes(lowerKeyword) ||
        product.description.toLowerCase().includes(lowerKeyword),
    );
  }
}
