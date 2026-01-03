/**
 * Tailwind CSS v3 配置文件
 * 用于配置 Tailwind CSS v3 的扫描路径、主题扩展和插件
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  // 内容扫描路径：指定 Tailwind CSS 需要扫描的文件
  // 这些文件中的类名会被 Tailwind 识别并生成对应的 CSS
  content: [
    "./routes/**/*.{tsx,ts,jsx,js}",
    "./components/**/*.{tsx,ts,jsx,js}",
  ],

  // 主题配置：可以扩展或覆盖 Tailwind 的默认主题
  theme: {
    extend: {
      // 字体配置
      fontFamily: {
        sans: ["Graphik", "sans-serif"],
        serif: ["Merriweather", "serif"],
      },

      // 颜色配置
      colors: {
        // 默认颜色
        default: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
          950: "#030712",
          1000: "#000000",
        },
        // 主要颜色
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
          1000: "#051d2c",
        },
        // 次要颜色 - 紫色系
        secondary: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
          950: "#3b0764",
          1000: "#2d0353",
        },
        // 成功颜色
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
          1000: "#031b0d",
        },
        // 警告颜色
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
          1000: "#2c1102",
        },
        // 危险颜色
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          950: "#450a0a",
          1000: "#2c0707",
        },
        // 信息颜色 - 青色系
        info: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
          950: "#083344",
          1000: "#05202a",
        },
      },

      // 高度配置
      height: {
        screen: "100vh",
      },
      minHeight: {
        screen: "100vh",
      },

      // 间距配置
      spacing: {
        128: "32rem",
        144: "36rem",
      },

      // 圆角配置
      borderRadius: {
        "4xl": "2rem",
      },

      // 背景模糊配置
      backdropBlur: {
        xl: "24px",
      },

      // 动画配置
      animation: {
        blob: "blob 7s infinite",
        shake: "shake 0.5s infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        fadeIn2: "fadeIn 0.2s ease-in-out forwards",
      },

      // 关键帧动画
      keyframes: {
        blob: {
          "0%": {
            transform: "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
          "100%": {
            transform: "translate(0px, 0px) scale(1)",
          },
        },
        shake: {
          "0%, 100%": {
            transform: "translateX(0)",
          },
          "25%": {
            transform: "translateX(-10px)",
          },
          "75%": {
            transform: "translateX(10px)",
          },
        },
        fadeIn: {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },
      },
    },
  },

  // 插件配置：可以添加 Tailwind 插件来扩展功能
  // 例如：@tailwindcss/forms, @tailwindcss/typography 等
  plugins: [],
};
