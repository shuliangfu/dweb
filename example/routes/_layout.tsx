/**
 * 根布局组件
 * 使用 Preact + Tailwind CSS v4
 * 提供网站的整体布局结构
 */

import Navbar from "@components/Navbar.tsx";
import Footer from "@components/Footer.tsx";
import type { LayoutProps } from "@dreamer/dweb";

export const load = () => {
  const menus = [
    {
      label: $t("首页"),
      href: "/",
    },
    {
      label: $t("特性"),
      href: "/features",
    },
    {
      label: $t("示例"),
      href: "/examples",
    },
    {
      label: $t("文档"),
      href: "/docs",
    },
    {
      label: $t("关于"),
      href: "/about",
    },
  ] as const;

  return {
    menus,
  };
};

/**
 * 根布局组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function AppLayout(
  { children, data: { menus }, routePath }: LayoutProps,
) {
  // console.log('布局 data:', data.menus);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 导航栏 */}
      <Navbar currentPath={routePath} menus={menus} />

      {/* 主内容区域 */}
      <main className="grow">
        {children}
      </main>

      {/* 页脚 */}
      <Footer />
    </div>
  );
}
