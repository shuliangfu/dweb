/**
 * L1.5-b：产品层测试报告（解析宿主 JUnit → json/md/html）
 *
 * 禁止以 pretty 终端输出作为主路径；结构化 JUnit 才是输入。
 *
 * @module
 */

import { join, mkdir, writeTextFile } from "@dreamer/runtime-adapter";

/** 产品报告格式 */
export type ProductReportFormat = "json" | "md" | "html";

/** 单条用例摘要 */
export interface TestCaseSummary {
  name: string;
  classname?: string;
  timeSec?: number;
  status: "passed" | "failed" | "skipped" | "error";
  message?: string;
}

/** 统一跑测摘要 */
export interface TestRunSummary {
  totals: {
    tests: number;
    passed: number;
    failed: number;
    errors: number;
    skipped: number;
  };
  timeSec?: number;
  suites: Array<{
    name: string;
    tests: number;
    failures: number;
    errors: number;
    skipped: number;
    timeSec?: number;
    cases: TestCaseSummary[];
  }>;
  source: "junit";
}

/**
 * 解析 `--report json,md,html`；非法 token 返回 invalid。
 */
export function parseProductReportFormats(
  value: unknown,
): { formats?: ProductReportFormat[]; invalid?: string } {
  if (value === undefined || value === null || value === false) {
    return {};
  }
  const raw = String(value).trim();
  if (!raw) return {};
  const parts = raw.split(/[,+\s]+/).map((p) => p.trim().toLowerCase()).filter(
    Boolean,
  );
  if (parts.length === 0) return {};
  const formats: ProductReportFormat[] = [];
  for (const p of parts) {
    if (p === "json" || p === "md" || p === "html") {
      if (!formats.includes(p)) formats.push(p);
    } else {
      return { invalid: p };
    }
  }
  return { formats };
}

function attr(tag: string, name: string): string | undefined {
  const re = new RegExp(`\\b${name}="([^"]*)"`, "i");
  const m = tag.match(re);
  return m?.[1];
}

function numAttr(tag: string, name: string): number | undefined {
  const v = attr(tag, name);
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * 解析 JUnit XML（testsuites / testsuite / testcase）为 {@link TestRunSummary}。
 * 实现为轻量字符串扫描，不依赖 DOM。
 */
export function parseJUnitXml(xml: string): TestRunSummary {
  const suites: TestRunSummary["suites"] = [];
  const suiteRe = /<testsuite\b([^>]*)>([\s\S]*?)<\/testsuite>/gi;
  let suiteMatch: RegExpExecArray | null;
  while ((suiteMatch = suiteRe.exec(xml)) !== null) {
    const suiteAttrs = suiteMatch[1] ?? "";
    const suiteBody = suiteMatch[2] ?? "";
    const cases: TestCaseSummary[] = [];
    // 先匹配自闭合，避免 `[^>]*` 吞掉 `/>` 里的 `/` 后误并入下一用例
    const caseRe =
      /<testcase\b([^>]*?)\s*\/>|<testcase\b([^>]*)>([\s\S]*?)<\/testcase>/gi;
    let caseMatch: RegExpExecArray | null;
    while ((caseMatch = caseRe.exec(suiteBody)) !== null) {
      const caseAttrs = (caseMatch[1] ?? caseMatch[2] ?? "").trim();
      const caseBody = caseMatch[3] ?? "";
      let status: TestCaseSummary["status"] = "passed";
      let message: string | undefined;
      if (/<skipped\b/i.test(caseBody)) {
        status = "skipped";
        const sm = caseBody.match(/<skipped\b[^>]*message="([^"]*)"/i);
        if (sm) message = decodeXmlEntities(sm[1]);
      } else if (/<error\b/i.test(caseBody)) {
        status = "error";
        const em = caseBody.match(/<error\b[^>]*message="([^"]*)"/i);
        if (em) message = decodeXmlEntities(em[1]);
      } else if (/<failure\b/i.test(caseBody)) {
        status = "failed";
        const fm = caseBody.match(/<failure\b[^>]*message="([^"]*)"/i);
        if (fm) message = decodeXmlEntities(fm[1]);
      }
      cases.push({
        name: attr(caseAttrs, "name") ?? "(unnamed)",
        classname: attr(caseAttrs, "classname"),
        timeSec: numAttr(caseAttrs, "time"),
        status,
        message,
      });
    }
    const tests = numAttr(suiteAttrs, "tests") ?? cases.length;
    const failures = numAttr(suiteAttrs, "failures") ??
      cases.filter((c) => c.status === "failed").length;
    const errors = numAttr(suiteAttrs, "errors") ??
      cases.filter((c) => c.status === "error").length;
    const skipped = numAttr(suiteAttrs, "skipped") ??
      cases.filter((c) => c.status === "skipped").length;
    suites.push({
      name: attr(suiteAttrs, "name") ?? "suite",
      tests,
      failures,
      errors,
      skipped,
      timeSec: numAttr(suiteAttrs, "time"),
      cases,
    });
  }

  // 无 <testsuite> 时尝试根 testsuites 属性兜底
  if (suites.length === 0) {
    const root = xml.match(/<testsuites\b([^>]*)\/?>/i);
    if (root) {
      const a = root[1] ?? "";
      suites.push({
        name: attr(a, "name") ?? "testsuites",
        tests: numAttr(a, "tests") ?? 0,
        failures: numAttr(a, "failures") ?? 0,
        errors: numAttr(a, "errors") ?? 0,
        skipped: numAttr(a, "skipped") ?? 0,
        timeSec: numAttr(a, "time"),
        cases: [],
      });
    }
  }

  const totals = {
    tests: 0,
    passed: 0,
    failed: 0,
    errors: 0,
    skipped: 0,
  };
  let timeSec = 0;
  let hasTime = false;
  for (const s of suites) {
    totals.tests += s.tests;
    totals.failed += s.failures;
    totals.errors += s.errors;
    totals.skipped += s.skipped;
    if (s.timeSec != null) {
      timeSec += s.timeSec;
      hasTime = true;
    }
    if (s.cases.length > 0) {
      // 用 case 状态校正 passed
    }
  }
  const casePassed = suites.reduce(
    (n, s) => n + s.cases.filter((c) => c.status === "passed").length,
    0,
  );
  const caseCounted = suites.reduce((n, s) => n + s.cases.length, 0);
  totals.passed = caseCounted > 0 ? casePassed : Math.max(
    0,
    totals.tests - totals.failed - totals.errors - totals.skipped,
  );

  return {
    totals,
    timeSec: hasTime ? timeSec : undefined,
    suites,
    source: "junit",
  };
}

/** 渲染 Markdown 报告 */
export function formatTestReportMarkdown(summary: TestRunSummary): string {
  const { totals } = summary;
  const lines: string[] = [
    "# Test Report",
    "",
    `| Metric | Count |`,
    `| --- | ---: |`,
    `| Tests | ${totals.tests} |`,
    `| Passed | ${totals.passed} |`,
    `| Failed | ${totals.failed} |`,
    `| Errors | ${totals.errors} |`,
    `| Skipped | ${totals.skipped} |`,
  ];
  if (summary.timeSec != null) {
    lines.push(`| Time (s) | ${summary.timeSec.toFixed(3)} |`);
  }
  lines.push("", "## Suites", "");
  for (const suite of summary.suites) {
    lines.push(`### ${suite.name}`);
    lines.push("");
    if (suite.cases.length === 0) {
      lines.push(
        `_tests=${suite.tests} failures=${suite.failures} errors=${suite.errors} skipped=${suite.skipped}_`,
        "",
      );
      continue;
    }
    lines.push(`| Status | Name | Time (s) |`);
    lines.push(`| --- | --- | ---: |`);
    for (const c of suite.cases) {
      const t = c.timeSec != null ? c.timeSec.toFixed(3) : "";
      const name = c.message ? `${c.name} — ${c.message}` : c.name;
      lines.push(`| ${c.status} | ${name.replace(/\|/g, "\\|")} | ${t} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** 渲染简易 HTML 报告 */
export function formatTestReportHtml(summary: TestRunSummary): string {
  const { totals } = summary;
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rows = summary.suites.flatMap((suite) =>
    suite.cases.map((c) => {
      const msg = c.message ? ` — ${esc(c.message)}` : "";
      const t = c.timeSec != null ? c.timeSec.toFixed(3) : "";
      return `<tr><td>${c.status}</td><td>${esc(suite.name)}</td><td>${
        esc(c.name)
      }${msg}</td><td>${t}</td></tr>`;
    })
  ).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Test Report</title>
<style>
body{font-family:system-ui,sans-serif;margin:1.5rem;color:#111}
table{border-collapse:collapse;width:100%;margin:1rem 0}
th,td{border:1px solid #ccc;padding:.4rem .6rem;text-align:left}
th{background:#f4f4f4}
.failed,.error{color:#b00020}
.skipped{color:#666}
.passed{color:#0a7}
</style>
</head>
<body>
<h1>Test Report</h1>
<ul>
<li>Tests: ${totals.tests}</li>
<li>Passed: ${totals.passed}</li>
<li>Failed: ${totals.failed}</li>
<li>Errors: ${totals.errors}</li>
<li>Skipped: ${totals.skipped}</li>
${
    summary.timeSec != null
      ? `<li>Time (s): ${summary.timeSec.toFixed(3)}</li>`
      : ""
  }
</ul>
<table>
<thead><tr><th>Status</th><th>Suite</th><th>Name</th><th>Time (s)</th></tr></thead>
<tbody>
${rows || "<tr><td colspan='4'>No test cases parsed</td></tr>"}
</tbody>
</table>
</body>
</html>
`;
}

/**
 * 将摘要写入 `--report-dir`（默认 `reports`）。
 * 文件名：`test-report.json` / `.md` / `.html`
 */
export async function writeTestReports(
  summary: TestRunSummary,
  formats: ProductReportFormat[],
  reportDir: string,
): Promise<string[]> {
  await mkdir(reportDir, { recursive: true });
  const written: string[] = [];
  for (const fmt of formats) {
    const path = join(reportDir, `test-report.${fmt}`);
    let content: string;
    if (fmt === "json") {
      content = JSON.stringify(summary, null, 2) + "\n";
    } else if (fmt === "md") {
      content = formatTestReportMarkdown(summary);
    } else {
      content = formatTestReportHtml(summary);
    }
    await writeTextFile(path, content);
    written.push(path);
  }
  return written;
}
