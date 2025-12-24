### file-upload - 文件上传

```typescript
import { fileUpload, handleFileUpload } from "@dreamer/dweb/plugins";

usePlugin(fileUpload({
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ["image/jpeg", "image/png"],
  uploadDir: "./uploads",
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
