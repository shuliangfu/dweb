/**
 * init 生成的静态文件：.gitignore、.vscode/settings.json、Tailwind/Uno CSS 入口、favicon.svg、jsx.d.ts、deploy.sh
 */

import { $t } from "../helpers.ts";

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
 * JSX 固有元素类型：供项目内 TSX 类型检查使用。
 * 与 @dreamer/view 的 jsx.d.ts 一致，配合 deno.json compilerOptions.types 使用。
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
  return `# Deno
.deno/
deno.lock

# ${$t("init.comments.gitignoreDeps")}
node_modules

# ${$t("init.comments.gitignoreBuild")}
dist/
build/

# ${$t("init.comments.gitignoreDwebGen")}
_client.dep.tsx

# ${$t("init.comments.gitignoreDockerCache")}
runtime/

# ${$t("init.comments.gitignoreEnv")}
.env
.env.local

# IDE
.idea
.cursor

# ${$t("init.comments.gitignoreSystem")}
.DS_Store
`;
}

export function getVscodeSettingsJson(): string {
  return `{
  // ==================== ${$t("init.comments.vscodeDeno")} ====================
  "deno.enable": true,
  "deno.lint": true,
  // ==================== ${
    $t("init.comments.vscodeFormat")
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
    $t("init.comments.vscodeEditor")
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
  // ==================== ${$t("init.comments.vscodeCss")} ====================
  "css.lint.unknownAtRules": "ignore",
  // ==================== ${
    $t("init.comments.vscodeAssoc")
  } ====================
  "files.associations": {
    "*.tsx": "typescriptreact",
    "*.ts": "typescript"
  },
  // ==================== ${
    $t("init.comments.vscodeExclude")
  } ====================
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/.deno": true
  },
  // ==================== ${
    $t("init.comments.vscodeSearchExclude")
  } ====================
  "search.exclude": {
    "**/node_modules": true,
    "**/.deno": true,
    "**/dist": true,
    "**/runtime": true
  },
  // ==================== ${$t("init.comments.vscodeI18n")} ====================
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
  "i18n-ally.enabledFrameworks": ["react", "i18next"],
  "i18n-ally.regex.key": ".*?",
  "i18n-ally.extract.autoDetect": true
}
`;
}

export function getTailwindCss(): string {
  return `/**
 * ${$t("init.comments.tailwindEntry")}
 * ${$t("init.comments.tailwindScanPaths")}
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
 * ${$t("init.comments.unocssEntry")}
 * ${$t("init.comments.unocssDesc")}
 */

/* ${$t("init.comments.baseReset")} */
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; min-height: 100%; }
a { color: inherit; text-decoration: none; }

/* ${$t("init.comments.optionalCustomLayer")} */
`;
}
