import type { Request } from "@dreamer/dweb";
import { dwebUrl, dwebVersion } from "../../utils.ts";

export function getDweb(_req: Request) {
  return {
    name: "DWeb",
    version: dwebVersion,
    url: dwebUrl,
  };
}
