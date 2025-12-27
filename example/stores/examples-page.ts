/**
 * Examples Page Store
 * 用于管理示例页面的状态，避免在 SSR 时使用 hooks
 */

import { defineStore, useStore } from "@dreamer/dweb/client";

export interface ExamplesPageStoreState extends Record<string, unknown> {
  count: number;
  message: string;
  loading: boolean;
  examples: Array<{ id: number; name: string; description: string }>;
  formData: { name: string; description: string };
  apiResponse: Record<string, unknown> | null;
}

/**
 * 定义 Examples Page Store
 */
export const examplesPageStore = defineStore("examplesPage", {
  state: (): ExamplesPageStoreState => ({
    count: 0,
    message: "",
    loading: false,
    examples: [],
    formData: { name: "", description: "" },
    apiResponse: null,
  }),
  actions: {
    /**
     * 增加计数器
     */
    increment() {
      this.count++;
      this.message = `计数器已增加到 ${this.count}`;
    },
    /**
     * 减少计数器
     */
    decrement() {
      this.count--;
      this.message = `计数器已减少到 ${this.count}`;
    },
    /**
     * 重置计数器
     */
    reset() {
      this.count = 0;
      this.message = "计数器已重置";
    },
    /**
     * 设置消息
     */
    setMessage(message: string) {
      this.message = message;
    },
    /**
     * 设置加载状态
     */
    setLoading(loading: boolean) {
      this.loading = loading;
    },
    /**
     * 设置示例数据
     */
    setExamples(examples: Array<{ id: number; name: string; description: string }>) {
      this.examples = examples;
    },
    /**
     * 设置表单数据
     */
    setFormData(formData: { name: string; description: string }) {
      this.formData = formData;
    },
    /**
     * 重置表单数据
     */
    resetFormData() {
      this.formData = { name: "", description: "" };
    },
    /**
     * 设置 API 响应
     */
    setApiResponse(apiResponse: Record<string, unknown> | null) {
      this.apiResponse = apiResponse;
    },
    /**
     * 获取示例数据列表（使用函数式 API - 必须使用中划线格式）
     */
		async fetchExamples() {
      this.setLoading(true);
      this.setMessage("正在加载数据...");
      try {
        // ⚠️ 重要：URL 必须使用中划线格式（kebab-case），不允许使用驼峰格式（camelCase）
        const response = await fetch("/api/examples/get-examples", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const result = await response.json();
        if (result.success) {
          this.setExamples(result.data);
          this.setMessage("数据加载成功！");
          this.setApiResponse(result);
        } else {
          this.setMessage("数据加载失败");
        }
      } catch (error) {
        this.setMessage(
          `请求失败: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        this.setLoading(false);
      }
    },
    /**
     * 创建示例数据（使用函数式 API - 驼峰格式）
     */
    async createExample(formData: { name: string; description: string }) {
      this.setLoading(true);
      this.setMessage("正在创建（驼峰格式）...");
      try {
        const response = await fetch("/api/examples/create-example", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
        const result = await response.json();
        if (result.success) {
          this.setMessage(
            `创建成功！ID: ${result.data.id}（使用驼峰格式：createExample）`,
          );
          this.resetFormData();
          this.setApiResponse(result);
          // 刷新列表
          await this.fetchExamples();
        } else {
          this.setMessage("创建失败");
        }
      } catch (error) {
        this.setMessage(
          `请求失败: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        this.setLoading(false);
      }
    },
    /**
     * 创建示例数据（使用函数式 API - 短横线格式）
     */
    async createExampleKebab(formData: { name: string; description: string }) {
      this.setLoading(true);
      this.setMessage("正在创建（短横线格式）...");
      try {
        const response = await fetch("/api/examples/create-example", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
        const result = await response.json();
        if (result.success) {
          this.setMessage(
            `创建成功！ID: ${result.data.id}（使用短横线格式：create-example）`,
          );
          this.resetFormData();
          this.setApiResponse(result);
          // 刷新列表
          await this.fetchExamples();
        } else {
          this.setMessage("创建失败");
        }
      } catch (error) {
        this.setMessage(
          `请求失败: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        this.setLoading(false);
      }
    },
    /**
     * 删除示例数据（使用函数式 API - 必须使用中划线格式）
     */
    async deleteExample(id: number) {
      this.setLoading(true);
      this.setMessage("正在删除...");
      try {
        // ⚠️ 重要：URL 必须使用中划线格式（kebab-case），不允许使用驼峰格式（camelCase）
        const response = await fetch(`/api/examples/delete-example?id=${id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const result = await response.json();
        if (result.success) {
          this.setMessage(`删除成功！ID: ${result.deletedId}`);
          this.setApiResponse(result);
          // 刷新列表
          await this.fetchExamples();
        } else {
          this.setMessage("删除失败");
        }
      } catch (error) {
        this.setMessage(
          `请求失败: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        this.setLoading(false);
      }
    },
  },
});

/**
 * 响应式使用 Examples Page Store 的 Hook
 */
export const useExamplesPageStore = () => {
  return useStore(examplesPageStore);
};

