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
 * 简单 semver 比较：返回 a > b 则正数，a < b 则负数，相等则 0
 */
function compareVersions(a: string, b: string): number {
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
  return String(preA).localeCompare(String(preB));
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
 * 批量获取 @dreamer/* 包版本（用于 init 生成 deno.json）
 *
 * @param useBeta 是否使用 beta 最新版
 * @returns 各包的版本映射，key 为包名（如 dweb、render、router、plugins）
 */
export async function fetchDreamerVersions(useBeta: boolean): Promise<{
  dweb: string;
  render: string;
  router: string;
  plugins: string;
}> {
  const [dweb, render, router, plugins] = await Promise.all([
    fetchJsrLatestVersion("@dreamer/dweb", useBeta),
    fetchJsrLatestVersion("@dreamer/render", useBeta),
    fetchJsrLatestVersion("@dreamer/router", useBeta),
    fetchJsrLatestVersion("@dreamer/plugins", useBeta),
  ]);

  return {
    dweb: dweb ?? "3.0.0",
    render: render ?? "1.0.0-beta.17",
    router: router ?? "1.0.0-beta.10",
    plugins: plugins ?? "1.0.0-beta.14",
  };
}
