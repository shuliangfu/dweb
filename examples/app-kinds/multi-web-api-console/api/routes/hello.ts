import type { ApiContext } from "@dreamer/dweb";
import { json } from "@dreamer/router";

export async function GET(_ctx: ApiContext) {
  return json({ message: "Hello from api kind" });
}
