/**
 * BGB Admin 首页
 * 路由: /admin（目录 routes/admin/；嵌套布局：根 _layout + admin/_layout）
 */

/** 管理端首页元数据（与前台各页区分） */
export const metadata = {
  title: "管理后台 - Dweb Basic",
  description: "BGB 管理端嵌套布局示例",
};

export default function BgbAdminIndex() {
  return (
    <div class="py-5">
      <h1 class="mb-8 text-3xl font-bold">Admin</h1>

      <section class="rounded-lg bg-white p-8 shadow-md">
        布局测试
      </section>
    </div>
  );
}
