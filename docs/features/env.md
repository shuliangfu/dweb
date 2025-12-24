## 环境变量

### 开发环境

创建 `.env.development`：

```env
PORT=3000
DB_HOST=localhost
DB_NAME=mydb_dev
```

### 生产环境

创建 `.env.production`：

```env
PORT=3000
DB_HOST=prod-db.example.com
DB_NAME=mydb
```

### 使用环境变量

```typescript
// dweb.config.ts
export default defineConfig({
  server: {
    port: parseInt(Deno.env.get("PORT") || "3000"),
  },
  database: {
    connection: {
      host: Deno.env.get("DB_HOST") || "localhost",
      database: Deno.env.get("DB_NAME") || "mydb",
    },
  },
});
```
