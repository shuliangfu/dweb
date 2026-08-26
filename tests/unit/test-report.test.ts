/**
 * L1.5-b product report: JUnit parse + format helpers
 */

import "../setup.ts";
import { describe, expect, it } from "@dreamer/test";
import {
  formatTestReportHtml,
  formatTestReportMarkdown,
  parseJUnitXml,
  parseProductReportFormats,
} from "../../src/utils/test-report.ts";

const SAMPLE_JUNIT = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="deno" tests="3" failures="1" errors="0" time="0.420">
  <testsuite name="demo.test.ts" tests="3" failures="1" errors="0" skipped="1" time="0.420">
    <testcase name="ok case" classname="demo" time="0.010"/>
    <testcase name="fail case" classname="demo" time="0.020">
      <failure message="expected true"/>
    </testcase>
    <testcase name="skip case" classname="demo" time="0.000">
      <skipped message="not yet"/>
    </testcase>
  </testsuite>
</testsuites>
`;

describe("parseProductReportFormats", () => {
  it("parses comma-separated formats", () => {
    const r = parseProductReportFormats("json,md,html");
    expect(r.formats).toEqual(["json", "md", "html"]);
    expect(r.invalid).toBeUndefined();
  });

  it("rejects unknown tokens", () => {
    const r = parseProductReportFormats("json,xml");
    expect(r.invalid).toBe("xml");
  });
});

describe("parseJUnitXml", () => {
  it("parses suites and case statuses", () => {
    const summary = parseJUnitXml(SAMPLE_JUNIT);
    expect(summary.source).toBe("junit");
    expect(summary.totals.tests).toBe(3);
    expect(summary.totals.failed).toBe(1);
    expect(summary.totals.skipped).toBe(1);
    expect(summary.totals.passed).toBe(1);
    expect(summary.suites.length).toBe(1);
    expect(summary.suites[0]!.cases.map((c) => c.status)).toEqual([
      "passed",
      "failed",
      "skipped",
    ]);
  });
});

describe("formatTestReport*", () => {
  it("markdown and html include totals", () => {
    const summary = parseJUnitXml(SAMPLE_JUNIT);
    const md = formatTestReportMarkdown(summary);
    expect(md).toContain("# Test Report");
    expect(md).toContain("| Failed | 1 |");
    const html = formatTestReportHtml(summary);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("fail case");
  });
});
