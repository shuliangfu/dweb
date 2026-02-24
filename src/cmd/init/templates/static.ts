/**
 * init 生成的静态文件：.gitignore、.vscode/settings.json、.vscode/i18n-ally-custom-framework.yml、Tailwind/Uno CSS 入口、favicon.svg、jsx.d.ts、deploy.sh、tsconfig.json（Bun）
 */

import { $tr, getJsxImportSource } from "../helpers.ts";
import type { InitOptions } from "../types.ts";

/** 部署脚本：构建后使用 docker compose 启动 */
export function getDeploySh(): string {
  return `#!/bin/sh
set -e
dweb-cli build
docker compose up -d
`;
}

/**
 * JSX 固有元素类型文件内容：供选用 view 引擎的项目做 TSX 类型检查。
 * 与 @dreamer/view 的 examples/jsx.d.ts 一致，JSR 不允许在包内 declare global，故由 init 写入项目根目录。
 */
export function getJsxDts(): string {
  return `/**
 * ${$tr("init.comments.jsxDtsLine1")}
 * ${$tr("init.comments.jsxDtsLine2")}
 */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [tag: string]: Record<string, unknown>;
    }
  }
}

export {};
`;
}

/** init 创建项目时写入的默认 favicon（与 examples/view-csr/basic/assets/favicon.svg 一致） */
export function getFaviconSvg(): string {
  return `<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 32 32"
  width="32"
  height="32"
>
  <rect width="32" height="32" rx="6" fill="#2563eb" />
  <text
    x="16"
    y="22"
    font-size="18"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
    font-family="system-ui,sans-serif"
  >D</text>
</svg>
`;
}

export function getGitignore(): string {
  return `# ${$tr("init.comments.gitignoreDeno")}
.deno/
deno.lock

# ${$tr("init.comments.gitignoreDeps")}
node_modules

# ${$tr("init.comments.gitignoreBuild")}
dist/
build/

# ${$tr("init.comments.gitignoreDwebGen")}
_client.dep.tsx

# ${$tr("init.comments.gitignoreDockerCache")}
runtime/

# ${$tr("init.comments.gitignoreEnv")}
.env
.env.local

# ${$tr("init.comments.gitignoreIde")}
.idea
.cursor

# ${$tr("init.comments.gitignoreSystem")}
.DS_Store
`;
}

/**
 * .npmrc：让 npm/bun 从 JSR 的 npm 代理解析 @jsr 作用域包（@jsr/dreamer__* 等）
 */
export function getNpmrc(): string {
  return `@jsr:registry=https://npm.jsr.io
`;
}

/**
 * i18n-ally 自定义框架配置：识别 $t() / $tr()（dweb 等包通用），无注释
 */
export function getI18nAllyCustomFrameworkYml(): string {
  return `monopoly: true

languageIds:
  - javascript
  - typescript
  - javascriptreact
  - typescriptreact

usageMatchRegex:
  - "[^\\\\w\\\\d]\\\\$t(?:r)?\\\\(['\\\\\\"\`]({key})['\\\\\\"\`]"
  - "[^\\\\w\\\\d]\\\\$t(?:r)?\\\\(['\\\\\\"\`]({key})['\\\\\\"\`]\\\\s*,"
  - "[^\\\\w\\\\d]\\\\$t(?:r)?\\\\(['\\\\\\"\`]({key})['\\\\\\"\`]\\\\s*,.*?['\\\\\\"\`][a-z]{2}-[A-Z]{2}['\\\\\\"\`]\\\\s*\\\\)"

refactorTemplates:
  - '$t("$1")'
  - '$tr("$1")'
`;
}

/**
 * Bun 项目用 tsconfig.json：根据模板引擎设置 jsx / jsxImportSource，供 tsc 与 IDE 类型检查
 * moduleResolution: "nodenext" 与 NodeNext 模块规范一致，便于解析 node_modules
 * 仅当 runtime === "bun" 时由 generate 写入
 */
export function getTsconfigJson(opts: InitOptions): string {
  const jsxImportSource = getJsxImportSource(opts.engine);
  return JSON.stringify(
    {
      "compilerOptions": {
        "target": "ESNext",
        "module": "NodeNext",
        "moduleResolution": "nodenext",
        "lib": ["ESNext", "DOM", "DOM.Iterable"],
        "jsx": "react-jsx",
        "jsxImportSource": jsxImportSource,
        "noEmit": true,
        "skipLibCheck": true,
        "strict": true,
        "resolveJsonModule": true,
        "isolatedModules": true,
      },
      "include": ["src/**/*"],
      "exclude": ["node_modules", "dist"],
    },
    null,
    2,
  );
}

export function getVscodeSettingsJson(opts: InitOptions): string {
  const runtime = opts.runtime;
  if (runtime === "bun") {
    return `{
  // ==================== ${$tr("init.comments.vscodeBun")} ====================
  // ${$tr("init.comments.vscodeFormat")}
  "[typescript]": {
    "editor.defaultFormatter": "vscode.typescript-language-features",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit",
      "source.organizeImports": "explicit"
    }
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "vscode.typescript-language-features",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit",
      "source.organizeImports": "explicit"
    }
  },
  "[javascript]": {
    "editor.defaultFormatter": "vscode.typescript-language-features",
    "editor.formatOnSave": true
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "vscode.typescript-language-features",
    "editor.formatOnSave": true
  },
  "[json]": {
    "editor.defaultFormatter": "vscode.json-language-features",
    "editor.formatOnSave": true
  },
  "[jsonc]": {
    "editor.defaultFormatter": "vscode.json-language-features",
    "editor.formatOnSave": true
  },
  // ==================== ${
      $tr("init.comments.vscodeEditor")
    } ====================
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.detectIndentation": false,
  "editor.trimAutoWhitespace": true,
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "files.trimFinalNewlines": true,
  "editor.rulers": [120],
  "editor.wordWrap": "off",
  "editor.formatOnPaste": true,
  "editor.formatOnType": false,
  "editor.suggestSelection": "first",
  "editor.snippetSuggestions": "top",
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": false,
  "editor.minimap.enabled": true,
  // ==================== ${$tr("init.comments.vscodeCss")} ====================
  "css.lint.unknownAtRules": "ignore",
  // ==================== ${
      $tr("init.comments.vscodeAssoc")
    } ====================
  "files.associations": {
    "*.tsx": "typescriptreact",
    "*.ts": "typescript"
  },
  // ==================== ${
      $tr("init.comments.vscodeExclude")
    } ====================
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/.bun": true
  },
  // ==================== ${
      $tr("init.comments.vscodeSearchExclude")
    } ====================
  "search.exclude": {
    "**/node_modules": true,
    "**/.bun": true,
    "**/dist": true,
    "**/runtime": true
  },
  // ==================== ${
      $tr("init.comments.vscodeI18n")
    } ====================
  "i18n-ally.localesPaths": ["locales"],
  "i18n-ally.pathMatcher": "{locale}.{ext}",
  "i18n-ally.keystyle": "nested",
  "i18n-ally.sortKeys": true,
  "i18n-ally.namespace": false,
  "i18n-ally.enabledParsers": ["json"],
  "i18n-ally.sourceLanguage": "zh-CN",
  "i18n-ally.displayLanguage": "zh-CN",
  "i18n-ally.translate.engines": ["deepl", "google"],
  "i18n-ally.extract.keygenStyle": "PascalCase",
  "i18n-ally.enabledFrameworks": ["react", "i18next", "general", "custom"],
  "i18n-ally.regex.key": ".*?",
  "i18n-ally.extract.autoDetect": true
}
`;
  }
  // Deno 运行时
  return `{
  // ==================== ${
    $tr("init.comments.vscodeDeno")
  } ====================
  "deno.enable": true,
  "deno.lint": true,
  // ==================== ${
    $tr("init.comments.vscodeFormat")
  } ====================
  "[typescript]": {
    "editor.defaultFormatter": "denoland.vscode-deno",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit",
      "source.organizeImports": "explicit"
    }
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "denoland.vscode-deno",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit",
      "source.organizeImports": "explicit"
    }
  },
  "[javascript]": {
    "editor.defaultFormatter": "denoland.vscode-deno",
    "editor.formatOnSave": true
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "denoland.vscode-deno",
    "editor.formatOnSave": true
  },
  "[json]": {
    "editor.defaultFormatter": "vscode.json-language-features",
    "editor.formatOnSave": true
  },
  "[jsonc]": {
    "editor.defaultFormatter": "vscode.json-language-features",
    "editor.formatOnSave": true
  },
  // ==================== ${
    $tr("init.comments.vscodeEditor")
  } ====================
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.detectIndentation": false,
  "editor.trimAutoWhitespace": true,
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "files.trimFinalNewlines": true,
  "editor.rulers": [120],
  "editor.wordWrap": "off",
  "editor.formatOnPaste": true,
  "editor.formatOnType": false,
  "editor.suggestSelection": "first",
  "editor.snippetSuggestions": "top",
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": false,
  "editor.minimap.enabled": true,
  // ==================== ${$tr("init.comments.vscodeCss")} ====================
  "css.lint.unknownAtRules": "ignore",
  // ==================== ${
    $tr("init.comments.vscodeAssoc")
  } ====================
  "files.associations": {
    "*.tsx": "typescriptreact",
    "*.ts": "typescript"
  },
  // ==================== ${
    $tr("init.comments.vscodeExclude")
  } ====================
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/.deno": true
  },
  // ==================== ${
    $tr("init.comments.vscodeSearchExclude")
  } ====================
  "search.exclude": {
    "**/node_modules": true,
    "**/.deno": true,
    "**/dist": true,
    "**/runtime": true
  },
  // ==================== ${
    $tr("init.comments.vscodeI18n")
  } ====================
  "i18n-ally.localesPaths": ["locales"],
  "i18n-ally.pathMatcher": "{locale}.{ext}",
  "i18n-ally.keystyle": "nested",
  "i18n-ally.sortKeys": true,
  "i18n-ally.namespace": false,
  "i18n-ally.enabledParsers": ["json"],
  "i18n-ally.sourceLanguage": "zh-CN",
  "i18n-ally.displayLanguage": "zh-CN",
  "i18n-ally.translate.engines": ["deepl", "google"],
  "i18n-ally.extract.keygenStyle": "PascalCase",
  "i18n-ally.enabledFrameworks": ["react", "i18next", "general", "custom"],
  "i18n-ally.regex.key": ".*?",
  "i18n-ally.extract.autoDetect": true
}
`;
}

export function getTailwindCss(): string {
  return `/**
 * ${$tr("init.comments.tailwindEntry")}
 * ${$tr("init.comments.tailwindScanPaths")}
 */
@source "../**/*.{ts,tsx}";

@import "tailwindcss";

@theme {
  --color-primary-600: #0284c7;
  --color-primary-700: #0369a1;
}
`;
}

export function getUnoCss(): string {
  return `/**
 * ${$tr("init.comments.unocssEntry")}
 * ${$tr("init.comments.unocssDesc")}
 */

/* ${$tr("init.comments.baseReset")} */
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; min-height: 100%; }
a { color: inherit; text-decoration: none; }

/* ${$tr("init.comments.optionalCustomLayer")} */
`;
}
