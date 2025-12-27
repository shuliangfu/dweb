/**
 * RSS 插件
 * 自动生成 RSS Feed
 */

import type { BuildConfig, Plugin } from "../../types/index.ts";
import type { RSSFeedConfig, RSSItem, RSSPluginOptions } from "./types.ts";
import * as path from "@std/path";

/**
 * 格式化日期为 RSS 格式
 */
function formatRSSDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toUTCString();
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 生成 RSS XML
 */
function generateRSS(feed: RSSFeedConfig, items: RSSItem[]): string {
  const lines: string[] = [];

  // XML 声明
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
  lines.push("  <channel>");

  // Channel 信息
  lines.push(`    <title>${escapeXml(feed.title)}</title>`);
  lines.push(`    <description>${escapeXml(feed.description)}</description>`);
  lines.push(`    <link>${escapeXml(feed.siteUrl)}</link>`);

  if (feed.feedUrl) {
    lines.push(
      `    <atom:link href="${
        escapeXml(feed.feedUrl)
      }" rel="self" type="application/rss+xml" />`,
    );
  }

  if (feed.language) {
    lines.push(`    <language>${escapeXml(feed.language)}</language>`);
  }

  if (feed.copyright) {
    lines.push(`    <copyright>${escapeXml(feed.copyright)}</copyright>`);
  }

  if (feed.managingEditor) {
    lines.push(
      `    <managingEditor>${escapeXml(feed.managingEditor)}</managingEditor>`,
    );
  }

  if (feed.webMaster) {
    lines.push(`    <webMaster>${escapeXml(feed.webMaster)}</webMaster>`);
  }

  if (feed.lastBuildDate) {
    lines.push(
      `    <lastBuildDate>${formatRSSDate(feed.lastBuildDate)}</lastBuildDate>`,
    );
  } else {
    lines.push(
      `    <lastBuildDate>${formatRSSDate(new Date())}</lastBuildDate>`,
    );
  }

  if (feed.ttl) {
    lines.push(`    <ttl>${feed.ttl}</ttl>`);
  }

  // Feed 图片
  if (feed.image) {
    lines.push("    <image>");
    lines.push(`      <url>${escapeXml(feed.image.url)}</url>`);
    if (feed.image.title) {
      lines.push(`      <title>${escapeXml(feed.image.title)}</title>`);
    }
    if (feed.image.link) {
      lines.push(`      <link>${escapeXml(feed.image.link)}</link>`);
    }
    if (feed.image.width) {
      lines.push(`      <width>${feed.image.width}</width>`);
    }
    if (feed.image.height) {
      lines.push(`      <height>${feed.image.height}</height>`);
    }
    lines.push("    </image>");
  }

  // Items
  for (const item of items) {
    lines.push("    <item>");
    lines.push(`      <title>${escapeXml(item.title)}</title>`);
    lines.push(`      <link>${escapeXml(item.link)}</link>`);

    if (item.description) {
      lines.push(
        `      <description>${escapeXml(item.description)}</description>`,
      );
    }

    if (item.pubDate) {
      lines.push(`      <pubDate>${formatRSSDate(item.pubDate)}</pubDate>`);
    }

    if (item.author) {
      lines.push(`      <author>${escapeXml(item.author)}</author>`);
    }

    if (item.category) {
      const categories = Array.isArray(item.category)
        ? item.category
        : [item.category];
      for (const cat of categories) {
        lines.push(`      <category>${escapeXml(cat)}</category>`);
      }
    }

    if (item.guid) {
      lines.push(
        `      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>`,
      );
    } else {
      lines.push(
        `      <guid isPermaLink="true">${escapeXml(item.link)}</guid>`,
      );
    }

    if (item.content) {
      lines.push(
        `      <content:encoded><![CDATA[${item.content}]]></content:encoded>`,
      );
    }

    if (item.comments !== undefined) {
      lines.push(
        `      <comments>${item.comments ? "true" : "false"}</comments>`,
      );
    }

    if (item.commentsUrl) {
      lines.push(`      <comments>${escapeXml(item.commentsUrl)}</comments>`);
    }

    lines.push("    </item>");
  }

  lines.push("  </channel>");
  lines.push("</rss>");

  return lines.join("\n");
}

/**
 * 创建 RSS 插件
 */
export function rss(options: RSSPluginOptions): Plugin {
  if (!options.feed) {
    throw new Error("RSS 插件需要 feed 配置");
  }

  return {
    name: "rss",
    config: options as unknown as Record<string, unknown>,

    /**
     * 构建时钩子 - 生成 RSS Feed
     */
    async onBuild(buildConfig: BuildConfig) {
      const outDir = buildConfig.outDir || "dist";
      const outputPath = options.outputPath || "rss.xml";
      const filename = options.filename || "feed.xml";
      const finalPath = path.join(outDir, outputPath, filename);

      console.log("📰 [RSS Plugin] 开始生成 RSS Feed...");

      try {
        let items: RSSItem[] = [];

        // 使用提供的条目
        if (options.items) {
          items = [...options.items];
        }

        // 自动扫描路由（简化实现，实际应该解析路由文件）
        if (options.autoScan !== false && !options.items) {
          // 这里可以扫描路由文件，提取文章/内容信息
          // 简化实现：提示用户手动提供 items
          console.warn(
            "💡 [RSS Plugin] 自动扫描功能需要手动实现，请提供 items 配置",
          );
        }

        // 如果没有条目，使用默认示例
        if (items.length === 0) {
          console.warn("⚠️  [RSS Plugin] 没有找到 RSS 条目，请配置 items 选项");
          items = [
            {
              title: "示例文章",
              link: `${options.feed.siteUrl}/example`,
              description: "这是一个示例 RSS 条目",
              pubDate: new Date(),
            },
          ];
        }

        // 生成 RSS XML
        const rssXml = generateRSS(options.feed, items);

        // 确保输出目录存在
        await Deno.mkdir(path.dirname(finalPath), { recursive: true });

        // 写入文件
        await Deno.writeTextFile(finalPath, rssXml);

        console.log(
          `✅ [RSS Plugin] 生成 RSS Feed: ${finalPath} (${items.length} 个条目)`,
        );

        // 如果启用按分类生成
        if (options.generateByCategory && options.categories) {
          for (const category of options.categories) {
            const categoryItems = items.filter(category.filter);
            if (categoryItems.length > 0) {
              const categoryFeed: RSSFeedConfig = {
                ...options.feed,
                title: `${options.feed.title} - ${category.name}`,
              };
              const categoryRssXml = generateRSS(categoryFeed, categoryItems);
              const categoryPath = path.join(
                outDir,
                outputPath,
                `${category.name}-${filename}`,
              );
              await Deno.writeTextFile(categoryPath, categoryRssXml);
              console.log(
                `✅ [RSS Plugin] 生成分类 Feed: ${categoryPath} (${categoryItems.length} 个条目)`,
              );
            }
          }
        }
      } catch (error) {
        console.error("❌ [RSS Plugin] 生成 RSS Feed 时出错:", error);
      }
    },
  };
}

// 导出类型
export type { RSSFeedConfig, RSSItem, RSSPluginOptions } from "./types.ts";
