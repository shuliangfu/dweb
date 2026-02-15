/**
 * 权限管理页面
 * 路由: /permissions
 */

/** 角色项 */
interface RoleItem {
  id: string;
  name: string;
  desc: string;
  userCount: number;
}

/** 权限项 */
interface PermItem {
  id: string;
  name: string;
  module: string;
}

/** 页面属性（由 load 注入） */
interface PermissionsProps {
  roles: RoleItem[];
  permissions: PermItem[];
}

/**
 * 服务端数据加载：在服务端准备角色与权限数据，注入到组件
 */
export function load(): Promise<PermissionsProps> {
  const roles: RoleItem[] = [
    { id: "admin", name: "管理员", desc: "拥有所有权限", userCount: 2 },
    { id: "user", name: "普通用户", desc: "基础读写权限", userCount: 8 },
    { id: "guest", name: "访客", desc: "仅读权限", userCount: 5 },
  ];
  const permissions: PermItem[] = [
    { id: "user:read", name: "用户查看", module: "用户" },
    { id: "user:write", name: "用户编辑", module: "用户" },
    { id: "content:read", name: "内容查看", module: "内容" },
    { id: "content:write", name: "内容编辑", module: "内容" },
    { id: "settings:manage", name: "系统设置", module: "系统" },
  ];
  return Promise.resolve({ roles, permissions });
}

/**
 * 权限管理页面（纯展示，数据由 load 注入）
 */
export default function Permissions({ roles, permissions }: PermissionsProps) {
  return (
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-gray-900">权限管理</h1>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">角色列表</h2>
          <div class="space-y-3">
            {roles.map((role) => (
              <div
                key={role.id}
                class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <div>
                  <p class="font-medium text-gray-900">{role.name}</p>
                  <p class="text-sm text-gray-500">{role.desc}</p>
                </div>
                <span class="text-sm text-gray-500">{role.userCount} 人</span>
              </div>
            ))}
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">权限列表</h2>
          <div class="space-y-2">
            {permissions.map((perm) => (
              <div
                key={perm.id}
                class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <span class="font-medium text-gray-900">{perm.name}</span>
                <span class="text-xs text-gray-400">{perm.module}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
