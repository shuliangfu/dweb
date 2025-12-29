/**
 * 表格输出工具
 * 提供美化的表格显示功能
 */

import { colors } from "./ansi.ts";

/**
 * 表格列定义
 */
export interface TableColumn {
  /** 列标题 */
  header: string;
  /** 列宽度（字符数，0 表示自动） */
  width?: number;
  /** 对齐方式 */
  align?: "left" | "right" | "center";
  /** 格式化函数 */
  formatter?: (value: any) => string;
}

/**
 * 表格选项
 */
export interface TableOptions {
  /** 是否显示边框 */
  border?: boolean;
  /** 边框样式 */
  borderStyle?: "single" | "double" | "rounded";
  /** 是否显示标题行 */
  header?: boolean;
  /** 列分隔符 */
  columnSeparator?: string;
}

/**
 * 计算列宽度
 * @param data 表格数据
 * @param columns 列定义
 * @returns 每列的宽度数组
 */
function calculateColumnWidths(
  data: Record<string, any>[],
  columns: TableColumn[],
): number[] {
  return columns.map((col, index) => {
    if (col.width && col.width > 0) {
      return col.width;
    }

    // 计算标题宽度
    let maxWidth = col.header.length;

    // 计算数据宽度
    const key = Object.keys(data[0] || {})[index] || "";
    for (const row of data) {
      const value = row[key];
      const formatted = col.formatter
        ? col.formatter(value)
        : String(value || "");
      maxWidth = Math.max(maxWidth, formatted.length);
    }

    return maxWidth;
  });
}

/**
 * 对齐文本
 * @param text 文本内容
 * @param width 总宽度
 * @param align 对齐方式
 * @returns 对齐后的文本
 */
function alignText(
  text: string,
  width: number,
  align: "left" | "right" | "center" = "left",
): string {
  const textLen = text.length;
  if (textLen >= width) {
    return text;
  }

  const padding = width - textLen;

  switch (align) {
    case "right": {
      return " ".repeat(padding) + text;
    }
    case "center": {
      const left = Math.floor(padding / 2);
      const right = padding - left;
      return " ".repeat(left) + text + " ".repeat(right);
    }
    case "left":
    default: {
      return text + " ".repeat(padding);
    }
  }
}

/**
 * 绘制表格边框
 * @param widths 列宽度数组
 * @param style 边框样式
 * @returns 边框字符串
 */
function drawBorder(
  widths: number[],
  style: "single" | "double" | "rounded" = "single",
): string {
  const chars = {
    single: {
      topLeft: "┌",
      topRight: "┐",
      bottomLeft: "└",
      bottomRight: "┘",
      top: "─",
      bottom: "─",
      left: "│",
      right: "│",
      cross: "┼",
      topCross: "┬",
      bottomCross: "┴",
    },
    double: {
      topLeft: "╔",
      topRight: "╗",
      bottomLeft: "╚",
      bottomRight: "╝",
      top: "═",
      bottom: "═",
      left: "║",
      right: "║",
      cross: "╬",
      topCross: "╦",
      bottomCross: "╩",
    },
    rounded: {
      topLeft: "╭",
      topRight: "╮",
      bottomLeft: "╰",
      bottomRight: "╯",
      top: "─",
      bottom: "─",
      left: "│",
      right: "│",
      cross: "┼",
      topCross: "┬",
      bottomCross: "┴",
    },
  };

  const c = chars[style];
  const line = widths.map((w) => c.top.repeat(w + 2)).join(c.topCross);
  return c.topLeft + line + c.topRight;
}

/**
 * 绘制分隔线
 * @param widths 列宽度数组
 * @param style 边框样式
 * @returns 分隔线字符串
 */
function drawSeparator(
  widths: number[],
  style: "single" | "double" | "rounded" = "single",
): string {
  const chars = {
    single: { left: "├", right: "┤", cross: "┼", line: "─" },
    double: { left: "╠", right: "╣", cross: "╬", line: "═" },
    rounded: { left: "├", right: "┤", cross: "┼", line: "─" },
  };

  const c = chars[style];
  const line = widths.map((w) => c.line.repeat(w + 2)).join(c.cross);
  return c.left + line + c.right;
}

/**
 * 绘制表格行
 * @param values 单元格值数组
 * @param widths 列宽度数组
 * @param columns 列定义
 * @param style 边框样式
 * @returns 行字符串
 */
function drawRow(
  values: any[],
  widths: number[],
  columns: TableColumn[],
  style: "single" | "double" | "rounded" = "single",
): string {
  const chars = {
    single: { left: "│", right: "│", separator: "│" },
    double: { left: "║", right: "║", separator: "║" },
    rounded: { left: "│", right: "│", separator: "│" },
  };

  const c = chars[style];
  const cells = values.map((value, index) => {
    const col = columns[index] || {};
    const formatted = col.formatter
      ? col.formatter(value)
      : String(value || "");
    const aligned = alignText(formatted, widths[index], col.align || "left");
    return ` ${aligned} `;
  });

  return c.left + cells.join(c.separator) + c.right;
}

/**
 * 输出表格
 * @param data 表格数据（对象数组）
 * @param columns 列定义（可选，如果不提供则自动从数据推断）
 * @param options 表格选项
 */
export function table(
  data: Record<string, any>[],
  columns?: TableColumn[],
  options: TableOptions = {},
): void {
  if (data.length === 0) {
    console.log(colors.dim + "（无数据）" + colors.reset);
    return;
  }

  const {
    border = true,
    borderStyle = "single",
    header = true,
  } = options;

  // 如果没有提供列定义，从数据自动推断
  if (!columns) {
    const keys = Object.keys(data[0]);
    columns = keys.map((key) => ({
      header: key,
      width: 0,
      align: "left" as const,
    }));
  }

  // 计算列宽度
  const widths = calculateColumnWidths(data, columns);

  // 绘制表格
  if (border) {
    // 顶部边框
    console.log(colors.gray + drawBorder(widths, borderStyle) + colors.reset);
  }

  // 标题行
  if (header) {
    const headerValues = columns.map((col) => col.header);
    const headerRow = drawRow(headerValues, widths, columns, borderStyle);
    console.log(colors.cyan + colors.bright + headerRow + colors.reset);

    if (border) {
      // 标题分隔线
      console.log(
        colors.gray + drawSeparator(widths, borderStyle) + colors.reset,
      );
    }
  }

  // 数据行
  const keys = Object.keys(data[0]);
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const values = keys.map((key) => row[key]);
    const rowStr = drawRow(values, widths, columns, borderStyle);

    // 交替行颜色
    if (i % 2 === 0) {
      console.log(rowStr);
    } else {
      console.log(colors.dim + rowStr + colors.reset);
    }
  }

  if (border) {
    // 底部边框
    console.log(colors.gray + drawBorder(widths, borderStyle) + colors.reset);
  }
}

/**
 * 输出简单的键值对表格
 * @param data 键值对对象
 * @param options 表格选项
 */
export function keyValueTable(
  data: Record<string, any>,
  options: TableOptions = {},
): void {
  const rows = Object.entries(data).map(([key, value]) => ({
    key,
    value: String(value),
  }));

  table(rows, [
    { header: "键", width: 20, align: "left" },
    { header: "值", width: 0, align: "left" },
  ], options);
}

/**
 * 输出进度条
 * @param current 当前值
 * @param total 总值
 * @param width 进度条宽度（字符数）
 * @param label 标签文本
 */
export function progressBar(
  current: number,
  total: number,
  width = 30,
  label = "",
): void {
  const percentage = Math.min(
    100,
    Math.max(0, Math.round((current / total) * 100)),
  );
  const filled = Math.round((width * percentage) / 100);
  const empty = width - filled;

  const bar = colors.green + "█".repeat(filled) + colors.gray +
    "░".repeat(empty) + colors.reset;
  const percentText = `${percentage}%`;

  if (label) {
    console.log(`${label} ${bar} ${percentText}`);
  } else {
    console.log(`${bar} ${percentText}`);
  }
}
