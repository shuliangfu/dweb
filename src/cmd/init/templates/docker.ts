/**
 * init 生成的 Dockerfile 与 docker-compose.yml
 */

import { $t } from "../helpers.ts";
import { DEFAULT_PORT_BASE } from "../constants.ts";
import type { InitOptions } from "../types.ts";

/**
 * 生成单个 docker-compose service 块（单应用或多应用中的一个）
 */
function buildDockerService(options: {
  serviceName: string;
  port: number;
  command: string[];
  containerName: string;
  comment?: string;
}): string {
  const { serviceName, port, command, containerName, comment } = options;
  const commentLine = comment ? `  # ${comment}\n  ` : "  ";
  return `${commentLine}${serviceName}:
    build:
      context: .
      dockerfile: Dockerfile
      target: base
    container_name: ${containerName}
    restart: unless-stopped
    stop_grace_period: 5s
    user: '0:0'
    ports:
      - '${port}:${port}'
    command: ${JSON.stringify(command)}
    environment:
      - DENO_ENV=production
    volumes:
      - .:/app
      - \${DENO_CACHE_DIR:-./runtime/deno-cache}:/deno-dir
    healthcheck:
      test:
        [
          'CMD-SHELL',
          "curl -f -s -o /dev/null -w '%{http_code}' http://localhost:${port}/ | grep -q '^2' || exit 1"
        ]
      interval: 10s
      timeout: 1s
      retries: 3
      start_period: 5s
    logging:
      driver: 'local'
      options:
        max-size: '10m'
        max-file: '3'
        compress: 'true'`;
}

export function getDockerfile(): string {
  return `# ============================================
# ${$t("init.comments.dockerBaseStage")}
# ============================================
FROM denoland/deno:latest AS base

# ${$t("init.comments.dockerSwitchRoot")}
USER root

# ${$t("init.comments.dockerInstallTools")}
RUN apt-get update && \\
    apt-get install -y --no-install-recommends curl coreutils ca-certificates && \\
    rm -rf /var/lib/apt/lists/*

# ${$t("init.comments.dockerWorkDir")}
# ${$t("init.comments.dockerDenoCache")}
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
        return buildDockerService({
          serviceName: app,
          port,
          command: ["deno", "run", "-A", `dist/${app}/server.js`],
          containerName: `${projectName}-${app}`,
          comment: $t("init.comments.dockerAppPort", {
            app,
            port: String(port),
          }),
        });
      })
      .join("\n\n");

    return `# docker-compose.yml
# ${$t("init.comments.dockerMultiApp")}
# ${$t("init.comments.dockerRunBuild")}
# ${$t("init.comments.dockerCacheMount")}

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
    command: ["deno", "run", "-A", "dist/server.js"],
    containerName: `${projectName}-app`,
  });

  return `# docker-compose.yml
# ${$t("init.comments.dockerSingleApp")}
# ${$t("init.comments.dockerRunBuildSingle")}
# ${$t("init.comments.dockerCacheMount")}

services:
${serviceBlock}

networks:
  default:
    driver: bridge
`;
}
