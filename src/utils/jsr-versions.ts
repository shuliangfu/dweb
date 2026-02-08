/**
 * 从 JSR meta.json 获取 @dreamer/* 包的最新版本
 *
 * 通过 fetch 请求 https://jsr.io/@scope/package/meta.json，
 * 根据 --beta 参数返回稳定版或 beta 最新版。
 */

/** JSR meta.json 响应结构 */
interface JsrMeta {
  scope: string;
  name: string;
  latest?: string;
  versions: Record<
    string,
    { yanked?: boolean; createdAt?: string }
  >;
}

/**
 * 判断版本是否为预发布版（含 -beta、-alpha、-rc 等）
 */
function isPrereleaseVersion(version: string): boolean {
  return /-\w+\.?\d*$/.test(version);
}

/**
 * 解析 prerelease 标识中的数值（如 beta.17 -> 17），用于正确排序
 */
function parsePrereleaseNum(pre: string): number {
  const m = pre.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * 简单 semver 比较：返回 a > b 则正数，a < b 则负数，相等则 0
 * prerelease 部分按数值比较（beta.17 > beta.9）
 * @internal 导出供单元测试使用
 */
export function compareVersions(a: string, b: string): number {
  const parse = (
    v: string,
  ): [number, number, number, string] => {
    const match = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) return [0, 0, 0, ""];
    return [
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
      (match[4] ?? "") as string,
    ];
  };
  const [ma, na, pa, preA] = parse(a);
  const [mb, nb, pb, preB] = parse(b);
  if (ma !== mb) return ma - mb;
  if (na !== nb) return na - nb;
  if (pa !== pb) return pa - pb;
  // prerelease 按标识符+数值比较：beta.9 < beta.10 < beta.17
  const preNumA = parsePrereleaseNum(preA);
  const preNumB = parsePrereleaseNum(preB);
  if (preNumA !== preNumB) return preNumA - preNumB;
  return String(preA).localeCompare(String(preB));
}

/**
 * 从两个版本中选取较新的一个（用于 --beta 时：若稳定版比 beta 新则用稳定版）
 * @internal 导出供单元测试使用
 */
export function pickNewer(a: string | null, b: string | null): string | null {
  if (a == null) return b;
  if (b == null) return a;
  return compareVersions(a, b) >= 0 ? a : b;
}

/**
 * 从 JSR meta.json 获取指定包的最新版本
 *
 * @param packageSpec 包说明符，如 "@dreamer/dweb"
 * @param useBeta true 时返回最新 beta 版，false 时返回最新稳定版
 * @returns 版本号字符串，获取失败时返回 null
 */
export async function fetchJsrLatestVersion(
  packageSpec: string,
  useBeta: boolean,
): Promise<string | null> {
  try {
    // @dreamer/dweb -> https://jsr.io/@dreamer/dweb/meta.json
    const url = `https://jsr.io/${packageSpec}/meta.json`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const meta = (await res.json()) as JsrMeta;
    const versions = meta.versions ?? {};
    const candidates = Object.entries(versions)
      .filter(([, info]) => !info.yanked)
      .map(([v]) => v);

    if (candidates.length === 0) {
      return meta.latest ?? null;
    }

    // useBeta=false：优先使用 JSR 的 meta.latest（registry 推荐版本，通常为稳定版）
    // 仅当 meta.latest 不存在或为 yanked 时，才从版本列表筛选
    if (!useBeta && meta.latest && candidates.includes(meta.latest)) {
      return meta.latest;
    }

    const filtered = useBeta
      ? candidates.filter(isPrereleaseVersion)
      : candidates.filter((v) => !isPrereleaseVersion(v));

    // 无匹配时：useBeta 用全部中的最新，否则用稳定版；若仍无则用全部
    const list = filtered.length > 0 ? filtered : candidates;
    list.sort((a, b) => compareVersions(b, a));
    return list[0] ?? meta.latest ?? null;
  } catch {
    return null;
  }
}

/**
 * 从 dweb deno.json 提取的版本
 * dweb 获取失败时用于兜底（useBeta=false 时 render、router、plugins 版本）
 */
export interface DwebConfigVersions {
  /** dweb 版本号 */
  version?: string;
}

/**
 * 批量获取 @dreamer/* 包版本（用于 init 生成 deno.json）
 *
 * - useBeta=false：全部从 JSR 获取最新稳定版
 * - useBeta=true：全部从 JSR 获取 beta 与 stable 中较新版本
 *
 * @param useBeta 是否使用 beta 最新版
 * @param dwebConfig 可选，dweb 项目 deno.json 配置（useBeta=false 时用于 render/router/plugins）
 */
export async function fetchDreamerVersions(
  useBeta: boolean,
  dwebConfig?: DwebConfigVersions | null,
): Promise<{
  dweb: string;
  render: string;
  router: string;
  plugins: string;
}> {
  if (useBeta) {
    const [
      dwebBeta,
      renderBeta,
      routerBeta,
      pluginsBeta,
      dwebStable,
      renderStable,
      routerStable,
      pluginsStable,
    ] = await Promise.all([
      fetchJsrLatestVersion("@dreamer/dweb", true),
      fetchJsrLatestVersion("@dreamer/render", true),
      fetchJsrLatestVersion("@dreamer/router", true),
      fetchJsrLatestVersion("@dreamer/plugins", true),
      fetchJsrLatestVersion("@dreamer/dweb", false),
      fetchJsrLatestVersion("@dreamer/render", false),
      fetchJsrLatestVersion("@dreamer/router", false),
      fetchJsrLatestVersion("@dreamer/plugins", false),
    ]);
    // 取 beta 与 stable 中较新的版本（如 v1.0.1 > v1.0.0-beta.10 则用 v1.0.1）
    return {
      dweb: pickNewer(dwebBeta, dwebStable) ?? "3.0.0",
      render: pickNewer(renderBeta, renderStable) ?? "1.0.0",
      router: pickNewer(routerBeta, routerStable) ?? "1.0.0",
      plugins: pickNewer(pluginsBeta, pluginsStable) ?? "1.0.0",
    };
  }

  // useBeta=false：全部从 JSR 获取最新稳定版（render、router、plugins 已发正式版）
  const [dwebVersion, renderVersion, routerVersion, pluginsVersion] =
    await Promise.all([
      fetchJsrLatestVersion("@dreamer/dweb", false),
      fetchJsrLatestVersion("@dreamer/render", false),
      fetchJsrLatestVersion("@dreamer/router", false),
      fetchJsrLatestVersion("@dreamer/plugins", false),
    ]);
  return {
    dweb: dwebVersion ?? dwebConfig?.version ?? "3.0.0",
    render: renderVersion ?? "1.0.0",
    router: routerVersion ?? "1.0.0",
    plugins: pluginsVersion ?? "1.0.0",
  };
}
