/**
 * init 生成的 Dockerfile 与 docker-compose.yml
 */

import { DEFAULT_PORT_BASE } from "../constants.ts";
import { $tr } from "../helpers.ts";
import type { InitOptions, Runtime } from "../types.ts";

/** 端口转 /proc/net/tcp 十六进制格式（如 3000 → 0BB8） */
function portToHex(port: number): string {
  return port.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * 生成单个 docker-compose service 块（单应用或多应用中的一个）
 * @param runtime 运行时，决定 command 与 volumes（Deno 挂载 deno-dir，Bun 不挂载）
 */
function buildDockerService(options: {
  serviceName: string;
  port: number;
  command: string[];
  containerName: string;
  runtime: Runtime;
}): string {
  const { serviceName, port, command, containerName, runtime } = options;
  const portHex = portToHex(port);
  const volumesBlock = runtime === "deno"
    ? `    volumes:
      - .:/app
      - \${DENO_CACHE_DIR:-./runtime/deno-cache}:/deno-dir`
    : `    volumes:
      - .:/app`;
  return `  ${serviceName}:
    build:
      context: .
      dockerfile: Dockerfile
      target: base
    container_name: ${containerName}
    restart: unless-stopped
    stop_grace_period: 5s
    user: '0:0'
    ports:
      - '0.0.0.0:${port}:${port}'
    command: ${JSON.stringify(command)}
${volumesBlock}
    healthcheck:
      # ${$tr("init.comments.dockerHealthcheckProcTcp", { port, portHex })}
      test: ['CMD-SHELL', 'grep -q "${portHex}" /proc/net/tcp 2>/dev/null || exit 1']
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 5s
    logging:
      driver: 'local'
      options:
        max-size: '10m'
        max-file: '3'
        compress: 'true'`;
}

export function getDockerfile(opts: InitOptions): string {
  if (opts.runtime === "bun") {
    return `# ============================================
# ${$tr("init.comments.dockerBaseStageBun")}
# ============================================
FROM oven/bun:latest AS base

# ${$tr("init.comments.dockerWorkDirMountBun")}
WORKDIR /app
`;
  }
  return `# ============================================
# ${$tr("init.comments.dockerBaseStageMinimal")}
# ============================================
FROM denoland/deno:latest AS base

# ${$tr("init.comments.dockerWorkDirMount")}
WORKDIR /app
`;
}

export function getDockerComposeYml(opts: InitOptions): string {
  const isMulti = opts.appMode === "multi" && (opts.appNames?.length ?? 0) > 0;
  const projectName = opts.projectName;

  if (isMulti && opts.appNames && opts.appNames.length > 0) {
    const services = opts.appNames
      .map((app, i) => {
        const port = DEFAULT_PORT_BASE + i;
        const command = opts.runtime === "bun"
          ? ["bun", "run", `dist/${app}/server.js`]
          : ["deno", "run", "-A", `dist/${app}/server.js`];
        return buildDockerService({
          serviceName: app,
          port,
          command,
          containerName: `${projectName}-${app}`,
          runtime: opts.runtime,
        });
      })
      .join("\n\n");

    return `# docker-compose.yml
# ${$tr("init.comments.dockerMultiApp")}
# ${$tr("init.comments.dockerRunBuildSingle")}
# ${$tr("init.comments.dockerCacheMount")}

services:
${services}

networks:
  default:
    driver: bridge
`;
  }

  const serviceBlock = buildDockerService({
    serviceName: projectName,
    port: DEFAULT_PORT_BASE,
    command: opts.runtime === "bun"
      ? ["bun", "run", "dist/server.js"]
      : ["deno", "run", "-A", "dist/server.js"],
    containerName: `${projectName}-app`,
    runtime: opts.runtime,
  });

  return `# docker-compose.yml
# ${$tr("init.comments.dockerSingleApp")}
# ${$tr("init.comments.dockerRunBuildSingle")}
# ${$tr("init.comments.dockerCacheMount")}

services:
${serviceBlock}

networks:
  default:
    driver: bridge
`;
}
