### file-upload - 文件上传

```typescript
import { fileUpload, handleFileUpload } from "@dreamer/dweb/plugins";

usePlugin(fileUpload({
  config: { // 文件上传配置对象
    uploadDir: "./uploads", // 上传目录（相对于项目根目录）
    maxFileSize: 10 * 1024 * 1024, // 最大文件大小（字节）
    allowedTypes: ["image/jpeg", "image/png", "application/pdf"], // 允许的文件类型数组（MIME 类型或扩展名）
    allowMultiple: true, // 是否允许多文件上传
    namingStrategy: "uuid", // 文件命名策略（'original' | 'timestamp' | 'uuid' | 'hash'）
    createSubdirs: true, // 是否创建子目录（按日期）
    subdirStrategy: "YYYY/mm/dd", // 子目录策略（模板格式或预设值）
    // 模板格式示例：
    //   'YYYY/mm/dd' - 2026/01/02（默认，适合上传较多的项目）
    //   'YYYY/mm' - 2026/01（适合上传较少的项目）
    //   'YYYY' - 2026（适合上传很少的项目）
    //   'YY/m/d' - 26/1/2（使用2位年份和1-2位月日）
    //   'YYYY-MM-DD' - 2026-01-02（使用横线分隔符）
    // 预设值（向后兼容）：'year-month-day' | 'year-month' | 'year'
    perFileLimit: 5 * 1024 * 1024, // 文件大小限制（每个文件）
    totalLimit: 50 * 1024 * 1024, // 总大小限制（所有文件）
  },
  injectClientScript: true, // 是否在客户端注入上传脚本（默认 true）
}));

// 处理文件上传
server.setHandler(async (req, res) => {
  if (req.method === "POST" && req.path === "/upload") {
    const result = await handleFileUpload(req, {
      uploadDir: "./uploads",
      maxFileSize: 5 * 1024 * 1024,
    });
    res.json(result);
  }
});
```

#### 配置选项

**可选参数：**

- `config` - 文件上传配置对象，包含：
  - `uploadDir` - 上传目录（相对于项目根目录）
  - `maxFileSize` - 最大文件大小（字节）
  - `allowedTypes` - 允许的文件类型数组（MIME 类型或扩展名）
  - `allowMultiple` - 是否允许多文件上传
  - `namingStrategy` - 文件命名策略（'original' | 'timestamp' | 'uuid' | 'hash'）
  - `createSubdirs` - 是否创建子目录（按日期）
  - `subdirStrategy` - 子目录创建策略（模板格式或预设值），默认为 `'YYYY/mm/dd'`
    - **模板格式**（推荐）：
      - `'YYYY/mm/dd'` - 2026/01/02（默认，适合上传较多的项目）
      - `'YYYY/mm'` - 2026/01（适合上传较少的项目）
      - `'YYYY'` - 2026（适合上传很少的项目）
      - `'YY/m/d'` - 26/1/2（使用2位年份和1-2位月日）
      - `'YYYY-MM-DD'` - 2026-01-02（使用横线分隔符）
      - 支持的占位符：
        - `YYYY` - 4位年份（如：2026）
        - `YY` - 2位年份（如：26）
        - `mm` - 2位月份（如：01）
        - `m` - 1-2位月份（如：1, 12）
        - `dd` - 2位日期（如：02）
        - `d` - 1-2位日期（如：2, 31）
    - **预设值**（向后兼容）：
      - `'year-month-day'` - 等同于 `'YYYY/mm/dd'`
      - `'year-month'` - 等同于 `'YYYY/mm'`
      - `'year'` - 等同于 `'YYYY'`
  - `perFileLimit` - 文件大小限制（每个文件）
  - `totalLimit` - 总大小限制（所有文件）
- `injectClientScript` - 是否在客户端注入上传脚本（默认 true）

**注意：** file-upload 插件专注于文件上传功能，不包含图片处理功能。如需图片优化（压缩、裁切、格式转换等），请使用独立的 `image-optimizer` 插件。
