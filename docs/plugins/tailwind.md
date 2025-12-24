### tailwind - Tailwind CSS

```typescript
import { tailwind } from "@dreamer/dweb/plugins";

usePlugin(tailwind({
  version: "v4", // 'v3' | 'v4'
  config: {
    content: ["./routes/**/*.{tsx,ts}"],
    theme: {
      extend: {},
    },
  },
}));
```
