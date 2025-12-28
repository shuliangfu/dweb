### file-upload - 文件上传

```typescript
import { fileUpload, handleFileUpload } from "@dreamer/dweb/plugins";

usePlugin(fileUpload({
  config: { // 文件上传配置对象
    uploadDir: "./uploads", // 上传目录（相对于项目根目录）
    maxFileSize: 10 * 1024 * 1024, // 最大文件大小（字节）
    allowedTypes: ["image/jpeg", "image/png"], // 允许的文件类型数组（MIME 类型或扩展名）
    allowMultiple: true, // 是否允许多文件上传
    namingStrategy: "uuid", // 文件命名策略（'original' | 'timestamp' | 'uuid' | 'hash'）
    createSubdirs: true, // 是否创建子目录（按日期）
    perFileLimit: 5 * 1024 * 1024, // 文件大小限制（每个文件）
    totalLimit: 50 * 1024 * 1024, // 总大小限制（所有文件）
    imageCrop: { // 图片裁切配置
      enabled: true,
      width: 800,
      height: 600,
      mode: "center",
    },
    imageCompress: { // 图片压缩配置
      enabled: true,
      format: "webp", // 'webp' | 'avif'
      quality: 80,
      keepOriginal: false,
    },
  },
  injectClientScript: true, // 是否在客户端注入上传脚本（默认 true）
}));

// 处理文件上传
server.setHandler(async (req, res) => {
  if (req.method === "POST" && req.path === "/upload") {
    const result = await handleFileUpload(req, {
      field: "file",
      maxSize: 5 * 1024 * 1024,
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
  - `perFileLimit` - 文件大小限制（每个文件）
  - `totalLimit` - 总大小限制（所有文件）
  - `imageCrop` - 图片裁切配置对象（enabled, width, height, mode）
  - `imageCompress` - 图片压缩配置对象（enabled, format, quality, keepOriginal）
- `injectClientScript` - 是否在客户端注入上传脚本（默认 true）
