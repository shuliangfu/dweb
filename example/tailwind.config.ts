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
    './routes/**/*.{tsx,ts,jsx,js}',
    './components/**/*.{tsx,ts,jsx,js}',
    './common/**/*.{tsx,ts,jsx,js}',
  ],
  
  // 主题配置：可以扩展或覆盖 Tailwind 的默认主题
  theme: {
    extend: {
      // 在这里可以添加自定义的颜色、字体、间距等
      // 例如：
      // colors: {
      //   primary: '#0ea5e9',
      // },
      // fontFamily: {
      //   sans: ['Graphik', 'sans-serif'],
      // },
    },
  },
  
  // 插件配置：可以添加 Tailwind 插件来扩展功能
  // 例如：@tailwindcss/forms, @tailwindcss/typography 等
  plugins: [],
};
