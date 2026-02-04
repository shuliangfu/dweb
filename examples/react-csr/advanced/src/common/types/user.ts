/** 用户角色 */
export type UserRole = "admin" | "user" | "guest";

/** 用户接口 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
}
