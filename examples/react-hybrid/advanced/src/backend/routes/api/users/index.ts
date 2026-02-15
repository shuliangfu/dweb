/**
 * 用户列表 API
 * GET /api/users - 供客户端请求使用，服务端应直接使用 user-service
 */

import { getAllUsers } from "@common/services/mod.ts";
import { json } from "@dreamer/router";

/**
 * GET /api/users
 * 返回用户列表，供客户端 fetch 测试或刷新数据使用
 */
export function GET(_request: Request) {
  const users = getAllUsers();
  return json({ success: true, data: users });
}
