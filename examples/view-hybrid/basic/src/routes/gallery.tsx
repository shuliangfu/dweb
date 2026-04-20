/**
 * 相册页面
 * 路由: /gallery
 * 展示 assets/images 下的测试图片；预览交互对齐 `view/examples` 画廊（缩放、拖拽、旋转）。
 */

import { createMemo, createSignal, Show } from "@dreamer/view";

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

/** 相册页：与首页/关于/用户等区分的 title 与描述 */
export const metadata = {
  title: "相册 - Dweb Basic",
  description: "图片画廊与预览交互示例",
};

/**
 * 将角度规范到 [0, 360)，仅用于界面上的「当前角度」文案。
 * 注意：不要把它写进带 `transition: transform` 的 `rotate()`——
 * 例如从 0° 左旋一步若写成 `rotate(270deg)`，浏览器会沿 0→270 插值，视觉上像猛转近一圈；
 * 应保留累积角（如 0 → -90）给 CSS，与显示用的规范化分离。
 * @param deg 任意角度（度）
 * @returns 与 deg 同余的 0～359
 */
function normalizeDeg(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/**
 * 相册页面：缩略图网格 + 全屏预览（缩放、拖拽平移、左旋/右旋 90°）。
 * @returns 相册页面内容
 */
export default function Gallery() {
  /**
   * 当前预览数组下标；含 `0`，`Show` 条件必须用 `!== null`（`!0` 会被当成关闭）。
   */
  const [selectedIndex, setSelectedIndex] = createSignal<number | null>(null);
  /** 预览缩放倍数，与官方示例一致约 0.5～3 */
  const [scale, setScale] = createSignal(1);
  /** 预览图在视口中的平移（像素），由拖拽更新 */
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  /**
   * 旋转的累积角度（度），可正可负、可不落在 0～360，专供 `transform: rotate(...)` 与过渡插值。
   * 左旋为减、右旋为加，每次 ±90；打开预览时归零。
   */
  const [rotationDeg, setRotationDeg] = createSignal(0);
  /** 是否正在拖拽大图（拖拽时关闭 transform 过渡避免跟手发飘） */
  const [isDragging, setIsDragging] = createSignal(false);

  /** 拖拽起点：鼠标 client 与当前 position 的差，存在闭包中即可（与 view 示例一致） */
  let dragStart = { x: 0, y: 0 };

  /**
   * 当前选中的图片元数据；无选中时为 `null`。
   */
  const selectedImage = createMemo(() => {
    const idx = selectedIndex();
    return idx !== null ? GALLERY_IMAGES[idx] ?? null : null;
  });

  /**
   * 大图组合 transform：平移 → 旋转 → 缩放（与常见看图习惯一致）。
   */
  const previewStyle = createMemo(() => {
    const s = scale();
    const p = position();
    /** 使用累积角，避免 0→270° 一类大跨度插值导致「转很多圈」的错觉 */
    const r = rotationDeg();
    return {
      transform: `translate(${p.x}px, ${p.y}px) rotate(${r}deg) scale(${s})`,
      transition: isDragging() ? "none" : "transform 0.3s ease-out",
    };
  });

  /**
   * 在预览区按下鼠标开始拖拽平移。
   * @param e 鼠标事件
   */
  const onPreviewMouseDown = (e: MouseEvent) => {
    if (selectedIndex() === null) return;
    setIsDragging(true);
    const p = position();
    dragStart = { x: e.clientX - p.x, y: e.clientY - p.y };
  };

  /**
   * 页面级移动：弹层打开时在任意位置移动鼠标都更新拖拽（与 view 示例挂在 section 上同理）。
   * @param e 鼠标事件
   */
  const onGalleryMouseMove = (e: MouseEvent) => {
    if (!isDragging()) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  /** 结束拖拽 */
  const onGalleryMouseUp = () => setIsDragging(false);

  /**
   * 打开指定下标的预览并重置变换状态。
   * @param index GALLERY_IMAGES 下标
   */
  const openPreview = (index: number) => {
    setSelectedIndex(index);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotationDeg(0);
  };

  /**
   * 关闭预览。
   */
  const closePreview = () => {
    setSelectedIndex(null);
  };

  /**
   * 左旋 90°（逆时针）：累积角减 90，不先规范到 [0,360)，保证过渡只走 90°。
   */
  const rotateLeft = () => {
    setRotationDeg((d) => d - 90);
  };

  /**
   * 右旋 90°（顺时针）：累积角加 90。
   */
  const rotateRight = () => {
    setRotationDeg((d) => d + 90);
  };

  return (
    <div
      class="py-8"
      onMouseMove={onGalleryMouseMove}
      onMouseUp={onGalleryMouseUp}
    >
      {/* 页面标题区 */}
      <header class="mb-12 text-center">
        <h1 class="mb-3 text-4xl font-bold tracking-tight text-gray-900">
          图片相册
        </h1>
        <p class="text-lg text-gray-500">
          来自 assets/images；点击缩略图预览，支持缩放、拖拽移动与旋转
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
              class="block w-full aspect-4/3 cursor-pointer overflow-hidden bg-gray-100 text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              onClick={() => {
                openPreview(index);
              }}
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

      {/* 全屏预览：`z-[100]` 高于布局顶栏 `z-50` */}
      <Show when={() => selectedIndex() !== null}>
        {() => (
          <div
            class="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-label="图片预览"
            onClick={() => {
              closePreview();
            }}
          >
            <button
              type="button"
              class="absolute top-6 right-6 z-[110] rounded-full bg-white/10 p-3 text-2xl text-white transition-transform hover:rotate-90 hover:bg-white/20"
              aria-label="关闭"
              onClick={(e) => {
                e.stopPropagation();
                closePreview();
              }}
            >
              ✕
            </button>

            {/* 主图区域：占满可视区，为底部工具栏留出内边距 */}
            <div
              class="flex min-h-0 flex-1 items-center justify-center px-4 pt-16 pb-28 sm:pb-32"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                class="cursor-grab select-none active:cursor-grabbing"
                onMouseDown={onPreviewMouseDown}
                role="presentation"
              >
                <img
                  src={() => selectedImage()?.src ?? ""}
                  alt={() => selectedImage()?.alt ?? ""}
                  style={previewStyle}
                  class="max-h-[min(75vh,calc(100vh-10rem))] max-w-[90vw] rounded-xl shadow-2xl pointer-events-none object-contain"
                />
              </div>
            </div>

            {
              /*
              底部居中悬浮工具栏：药丸形、半透明 + backdrop-filter（约 10px）与参考稿一致；
              与主图分离，避免随 flex 排在图中下方。
            */
            }
            <div
              class="pointer-events-auto absolute bottom-6 left-1/2 z-[110] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-nowrap items-center gap-3 overflow-x-auto rounded-full border border-white/30 bg-black/50 px-4 py-3 shadow-lg backdrop-blur-[10px] sm:gap-6 sm:px-5"
              onClick={(e) => e.stopPropagation()}
              role="toolbar"
              aria-label="图片预览操作"
            >
              <button
                type="button"
                class="min-w-[2.5rem] shrink-0 text-xl text-white transition-transform hover:scale-125"
                aria-label="缩小"
                onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
              >
                －
              </button>
              <span class="min-w-[5ch] shrink-0 text-center font-mono text-white">
                {() => `${Math.round(scale() * 100)}%`}
              </span>
              <button
                type="button"
                class="min-w-[2.5rem] shrink-0 text-xl text-white transition-transform hover:scale-125"
                aria-label="放大"
                onClick={() => setScale((s) => Math.min(3, s + 0.2))}
              >
                ＋
              </button>
              <span
                class="mx-1 h-6 w-px shrink-0 bg-white/30"
                aria-hidden="true"
              >
              </span>
              <button
                type="button"
                class="shrink-0 rounded-lg px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-white/10"
                aria-label="向左旋转九十度"
                onClick={rotateLeft}
              >
                左旋
              </button>
              <button
                type="button"
                class="shrink-0 rounded-lg px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-white/10"
                aria-label="向右旋转九十度"
                onClick={rotateRight}
              >
                右旋
              </button>
              <span class="min-w-[4ch] shrink-0 text-center text-sm text-white/80">
                {() => `${normalizeDeg(rotationDeg())}°`}
              </span>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
