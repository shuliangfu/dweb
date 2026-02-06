/**
 * 相册页面
 * 路由: /gallery
 * 展示 assets/images 下的测试图片
 */

import { useState } from "preact/hooks";

/**
 * 相册图片列表（与 src/assets/images 下的文件名对应）
 *
 * 路径说明：
 * - 开发环境：static 插件从 src/assets 提供，/assets/images/* 可访问
 * - 生产构建：build.assets.publicDir 将 src/assets 复制到 dist/client/assets，
 *   图片经 compress、format: webp、hash 处理后，updateAssetPaths 会把这些
 *   字符串替换为带 hash 的新路径（如 /assets/images/0.abc12345.webp）
 */
const GALLERY_IMAGES = [
  { src: "/assets/images/0.png", alt: "图片 0", title: "风景 0" },
  { src: "/assets/images/1.jpg", alt: "图片 1", title: "风景 1" },
  { src: "/assets/images/2.jpeg", alt: "图片 2", title: "风景 2" },
  { src: "/assets/images/3.jpeg", alt: "图片 3", title: "风景 3" },
  { src: "/assets/images/4.jpg", alt: "图片 4", title: "风景 4" },
  { src: "/assets/images/5.jpeg", alt: "图片 5", title: "风景 5" },
  { src: "/assets/images/6.jpeg", alt: "图片 6", title: "美女 6" },
];

/**
 * 相册页面
 * @returns 相册页面内容
 */
export default function Gallery() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <div class="py-8">
      {/* 页面标题区 */}
      <header class="mb-12 text-center">
        <h1 class="mb-3 text-4xl font-bold tracking-tight text-gray-900">
          图片相册
        </h1>
        <p class="text-lg text-gray-500">
          来自 assets/images 的测试图片展示
        </p>
      </header>

      {/* 相册网格 */}
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {GALLERY_IMAGES.map((img, index) => (
          <article
            key={img.src}
            class="group overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          >
            <button
              type="button"
              class="block w-full aspect-4/3 overflow-hidden bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              onClick={() => setSelectedIndex(index)}
            >
              <img
                src={img.src}
                alt={img.alt}
                title={img.title}
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </button>
            <div class="p-4">
              <h3 class="font-medium text-gray-800 truncate">
                {img.title}
              </h3>
              <p class="text-sm text-gray-500">
                {img.alt}
              </p>
            </div>
          </article>
        ))}
      </div>

      {/* 大图预览弹层 */}
      {selectedIndex !== null && (
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="图片预览"
          onClick={() => setSelectedIndex(null)}
        >
          <button
            type="button"
            class="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="关闭"
            onClick={() => setSelectedIndex(null)}
          >
            <svg
              class="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <img
            src={GALLERY_IMAGES[selectedIndex].src}
            alt={GALLERY_IMAGES[selectedIndex].alt}
            class="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
