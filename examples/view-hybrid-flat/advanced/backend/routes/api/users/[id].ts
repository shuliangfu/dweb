/**
 * 用户详情 API
 * GET /api/users/:id - 供客户端请求使用，服务端 load 应直接使用 user-service
 */

import { getUserById } from "@common/services/mod.ts";
import { json } from "@dreamer/router";

interface ApiUserDetailParams {
  params: { id: string };
}

/**
 * GET /api/users/:id
 * 返回单个用户，供客户端 fetch 测试或刷新数据使用
 */
export function GET(
  _request: Request,
  context: ApiUserDetailParams,
) {
  const user = getUserById(context.params.id);
  if (!user) {
    return json({ success: false, error: "用户不存在" }, 404);
  }
  return json({ success: true, data: user });
}
