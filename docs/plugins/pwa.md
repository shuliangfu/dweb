### pwa - 渐进式 Web 应用

```typescript
import { pwa } from "@dreamer/dweb/plugins";

usePlugin(pwa({
  manifest: {
    name: "My App",
    shortName: "App",
    description: "My awesome app",
    themeColor: "#000000",
    backgroundColor: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  serviceWorker: {
    enabled: true,
    path: "/sw.js",
  },
}));
```
