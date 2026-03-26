/**
 * init 生成的路由组件模板：_app、_layout、index、about、user/[id]
 * 示例项目前端不使用 i18n，全部使用英文文案字面量。
 */

import {
  getAppPropsTypeSnippet,
  getEngineDisplayName,
  getLayoutPropsTypeSnippet,
} from "../helpers.ts";
import type { InitOptions } from "../types.ts";
import { $tr } from "../../../utils/i18n.ts";

/**
 * 简单示例 Button 组件：单应用放在 components/，多应用放在 common/components/ 共用。
 * 支持 variant：primary / secondary / ghost，与计数器示例样式一致。
 */
export function getButtonTsx(opts: InitOptions): string {
  const isView = opts.engine === "view";
  const attr = isView ? "class" : "className";
  const variantStyles = isView
    ? `const base = "rounded-lg px-4 py-2";
  const styles = {
    primary: "border-0 bg-[#667eea] text-white hover:opacity-90",
    secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    ghost: "border border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200",
  };`
    : `const base = "rounded-lg px-4 py-2";
  const styles = {
    primary: "border-0 bg-[#667eea] text-white hover:opacity-90",
    secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    ghost: "border border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200",
  };`;
  return `/**
 * ${$tr("init.template.buttonComment")}
 */

interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  children?: unknown;
}

export function Button({
  variant = "primary",
  onClick,
  children,
}: ButtonProps) {
  ${variantStyles}
  return (
    <button
      type="button"
      ${attr}={\`\${base} \${styles[variant]}\`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
`;
}

export function getAppTsx(opts: InitOptions): string {
  const titleName = opts.projectName;
  const propsSnippet = getAppPropsTypeSnippet(opts.engine);
  /** View 引擎 JSX 推荐使用 class；Preact/React 使用 className */
  const attr = opts.engine === "view" ? "class" : "className";
  return `/**
 * App root component
 */

${propsSnippet}
  title?: string;
  description?: string;
}

export default function App({
  children,
  title = "${titleName}",
  description = "${$tr("init.template.appDescription")}",
}: AppProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={description} />
        <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
        <title>{title}</title>
      </head>
      <body ${attr}="bg-gray-100 text-gray-900 antialiased">
        <div id="app">{children}</div>
      </body>
    </html>
  );
}
`;
}

export function getLayoutTsx(opts: InitOptions, appName?: string): string {
  const appDisplayName = appName ?? opts.projectName;
  const accentClass = opts.style === "tailwind"
    ? "text-primary-600 hover:text-primary-700"
    : "text-indigo-600 hover:text-indigo-700";
  const linkClass = opts.style === "tailwind"
    ? "text-gray-600 hover:text-primary-600 transition-colors"
    : "text-gray-600 hover:text-indigo-600 transition-colors";
  const styleComment = opts.style === "unocss"
    ? $tr("init.template.styleUno")
    : opts.style === "tailwind"
    ? $tr("init.template.styleTailwind")
    : $tr("init.template.styleGeneric");
  const importAndProps = getLayoutPropsTypeSnippet(opts.engine);
  /** View 引擎 JSX 推荐使用 class，与 index/Button 模板一致 */
  const attr = opts.engine === "view" ? "class" : "className";

  return `/**
 * ${$tr("init.template.layoutComment", { style: styleComment })}
 */

${importAndProps}

export default function Layout({ children }: LayoutProps) {
  return (
    <div ${attr}="min-h-screen flex flex-col">
      <header ${attr}="bg-white shadow-sm sticky top-0 z-50">
        <div ${attr}="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav ${attr}="flex items-center justify-between h-16">
            <a
              href="/"
              ${attr}="text-xl font-bold ${accentClass}"
            >
              ${appDisplayName}
            </a>
            <ul ${attr}="flex items-center gap-6 list-none m-0 p-0">
              <li>
                <a
                  href="/"
                  ${attr}="${linkClass}"
                >
                  ${$tr("init.template.navHome")}
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  ${attr}="${linkClass}"
                >
                  ${$tr("init.template.navAbout")}
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main ${attr}="flex-1">
        <div ${attr}="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      <footer ${attr}="bg-gray-800 text-white py-8">
        <div ${attr}="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p ${attr}="text-gray-400">
            ${$tr("init.template.footerBuilt")}
          </p>
        </div>
      </footer>
    </div>
  );
}
`;
}

export function getIndexTsx(opts: InitOptions): string {
  const engineName = getEngineDisplayName(opts.engine);
  const heroGradient = opts.style === "tailwind"
    ? "bg-linear-to-br from-[#667eea] to-[#764ba2]"
    : "bg-linear-to-br from-[#667eea] to-[#764ba2]";
  /** 特性标题渐变：Tailwind v4 使用 bg-linear-to-r */
  const featuresHeadingGradient = "bg-linear-to-r from-[#667eea] to-[#764ba2]";
  const isView = opts.engine === "view";
  const attr = isView ? "class" : "className";
  const isMulti = opts.appMode === "multi" && (opts.appNames?.length ?? 0) > 0;
  const buttonImport = isMulti
    ? 'import { Button } from "@common/components/Button.tsx";\n\n'
    : 'import { Button } from "../components/Button.tsx";\n\n';
  const counterImport = isView
    ? 'import { createSignal } from "@dreamer/view";\n\n'
    : opts.engine === "preact"
    ? 'import { useState } from "preact/hooks";\n\n'
    : 'import { useState } from "react";\n\n';
  /**
   * View：init 模板用 `createSignal(0)` + `count.value`，与文档入门一致；需要时也可 `const [n, setN] = createSignal(0)`。
   */
  const counterState = isView
    ? `
  const count = createSignal(0);
`
    : "  const [count, setCount] = useState(0);\n";
  const counterSection = isView
    ? `      <section ${attr}="mb-10 rounded-xl border border-gray-200 bg-white p-6 shadow-md">
        <h2 ${attr}="mb-4 text-center text-[#667eea]">${
      $tr("init.template.counterExample")
    }</h2>
        <p ${attr}="mb-4 text-center text-sm text-gray-500">${
      $tr("init.template.counterViewDesc")
    }</p>
        {() => (
          <div ${attr}="flex flex-col items-center justify-center gap-4">
            <span ${attr}="text-2xl font-semibold">count: ${"{"}count${"}"}</span>
            <div ${attr}="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  count.value = count.value + 1;
                }}
              >
                ${$tr("init.template.counterIncrement")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  count.value = count.value - 1;
                }}
              >
                ${$tr("init.template.counterDecrement")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  count.value = 0;
                }}
              >
                ${$tr("init.template.counterReset")}
              </Button>
            </div>
          </div>
        )}
      </section>`
    : `      <section ${attr}="mb-10 rounded-xl border border-gray-200 bg-white p-6 shadow-md">
        <h2 ${attr}="mb-4 text-center text-[#667eea]">${
      $tr("init.template.counterExample")
    }</h2>
        <p ${attr}="mb-4 text-center text-sm text-gray-500">${
      $tr("init.template.counterSummary")
    }</p>
        <div ${attr}="flex flex-col items-center justify-center gap-4">
          <span ${attr}="text-2xl font-semibold">count: ${"{"}count${"}"}</span>
          <div ${attr}="flex flex-wrap items-center justify-center gap-2">
            <Button variant="primary" onClick={() => setCount((c) => c + 1)}>
              ${$tr("init.template.counterIncrement")}
            </Button>
            <Button variant="secondary" onClick={() => setCount((c) => c - 1)}>
              ${$tr("init.template.counterDecrement")}
            </Button>
            <Button variant="ghost" onClick={() => setCount(0)}>
              ${$tr("init.template.counterReset")}
            </Button>
          </div>
        </div>
      </section>`;

  return `/**
 * ${$tr("init.comments.homePage")}
 * ${$tr("init.comments.homeRoute")}
 */

${buttonImport}${counterImport}export default function Home() {
${counterState}  return (
    <div ${attr}="py-5">
      <section ${attr}="mb-10 rounded-xl ${heroGradient} px-5 py-15 text-center text-white">
        <h1 ${attr}="mb-4 text-4xl">${$tr("init.template.indexWelcome")}</h1>
        <p ${attr}="text-xl text-white/90">
          ${$tr("init.template.indexDesc", { engine: engineName })}
        </p>
      </section>

      <section ${attr}="mb-10">
        <h2 ${attr}="mb-8 text-center text-2xl font-bold tracking-wide bg-clip-text text-transparent ${featuresHeadingGradient}">${
    $tr("init.template.indexFeatures")
  }</h2>
        <div ${attr}="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div ${attr}="rounded-lg bg-white p-6 shadow-md">
            <h3 ${attr}="mb-2.5 text-[#667eea]">${
    $tr("init.template.featureFileRouting")
  }</h3>
            <p>${$tr("init.template.featureFileRoutingDesc")}</p>
          </div>
          <div ${attr}="rounded-lg bg-white p-6 shadow-md">
            <h3 ${attr}="mb-2.5 text-[#667eea]">${
    $tr("init.template.featureSsr")
  }</h3>
            <p>${$tr("init.template.featureSsrDesc")}</p>
          </div>
          <div ${attr}="rounded-lg bg-white p-6 shadow-md">
            <h3 ${attr}="mb-2.5 text-[#667eea]">${
    $tr("init.template.featureTypescript")
  }</h3>
            <p>${$tr("init.template.featureTypescriptDesc")}</p>
          </div>
          <div ${attr}="rounded-lg bg-white p-6 shadow-md">
            <h3 ${attr}="mb-2.5 text-[#667eea]">${engineName}</h3>
            <p>${$tr("init.template.featureEngine")}</p>
          </div>
        </div>
      </section>

${counterSection}
    </div>
  );
}
`;
}

export function getAboutTsx(opts: InitOptions): string {
  const engineName = getEngineDisplayName(opts.engine);
  /** View 使用 class；dangerouslySetInnerHTML 与 React 一致，由编译器处理 */
  const attr = opts.engine === "view" ? "class" : "className";
  return `/**
 * ${$tr("init.comments.aboutPage")}
 * ${$tr("init.comments.aboutRoute")}
 */

export default function About() {
  return (
    <div ${attr}="py-5">
      <h1 ${attr}="mb-8 text-3xl font-bold">${
    $tr("init.template.aboutTitle")
  }</h1>

      <section ${attr}="rounded-lg bg-white p-8 shadow-md">
        <p ${attr}="mb-6" dangerouslySetInnerHTML={{ __html: "${
    $tr("init.template.aboutDesc", { engine: engineName })
  }" }} />

        <h2 ${attr}="mb-4 mt-6 text-xl font-semibold text-indigo-600">${
    $tr("init.template.aboutTechStack")
  }</h2>
        <ul ${attr}="ml-5 list-disc space-y-2">
          <li>
            <strong>@dreamer/dweb</strong> - ${$tr("init.template.techDweb")}
          </li>
          <li>
            <strong>${engineName}</strong> - ${$tr("init.template.techEngine")}
          </li>
          <li>
            <strong>Deno</strong> - ${$tr("init.template.techDeno")}
          </li>
          <li>
            <strong>TypeScript</strong> - ${$tr("init.template.techTypescript")}
          </li>
        </ul>
      </section>
    </div>
  );
}
`;
}

export function getUserByIdTsx(opts: InitOptions): string {
  const avatarGradient = "bg-linear-to-br from-indigo-500 to-purple-600";
  /** View 引擎与首页、布局一致使用 class */
  const attr = opts.engine === "view" ? "class" : "className";
  return `/**
 * ${$tr("init.comments.userDetailPage")}
 * ${$tr("init.comments.dynamicRoute")}
 */

/** ${$tr("init.comments.userPageProps")} */
interface UserProps {
  /** ${$tr("init.comments.routeParams")} */
  params: {
    id: string;
  };
}

/** Mock user data */
const users: Record<string, { name: string; email: string; role: string }> = {
  "1": { name: "${
    $tr("init.template.user1Name")
  }", email: "user1@example.com", role: "${$tr("init.template.user1Role")}" },
  "2": { name: "${
    $tr("init.template.user2Name")
  }", email: "user2@example.com", role: "${$tr("init.template.user2Role")}" },
  "3": { name: "${
    $tr("init.template.user3Name")
  }", email: "user3@example.com", role: "${$tr("init.template.user3Role")}" },
};

/**
 * ${$tr("init.comments.userDetailPage")}
 */
export default function User({ params }: UserProps) {
  const user = users[params.id];

  if (!user) {
    return (
      <div ${attr}="py-16 px-5 text-center">
        <h1 ${attr}="mb-4 text-2xl font-bold text-red-500">${
    $tr("init.template.userNotFound")
  }</h1>
        <p ${attr}="mb-4">${
    $tr("init.template.userNotFoundDescPrefix")
  }{params.id}${$tr("init.template.userNotFoundDescSuffix")}</p>
        <a
          href="/"
          ${attr}="mt-5 inline-block rounded-md bg-blue-600 px-5 py-2.5 text-white no-underline hover:bg-blue-700"
        >
          ${$tr("init.template.backToHome")}
        </a>
      </div>
    );
  }

  return (
    <div ${attr}="py-5">
      <h1 ${attr}="mb-8 text-3xl font-bold">${
    $tr("init.template.userDetail")
  }</h1>

      <div ${attr}="flex items-center gap-6 rounded-xl bg-white p-8 shadow-md">
        <div ${attr}="flex h-20 w-20 shrink-0 items-center justify-center rounded-full ${avatarGradient} text-3xl font-bold text-white">
          {user.name.charAt(0)}
        </div>
        <div>
          <h2 ${attr}="mb-2 text-2xl font-semibold">{user.name}</h2>
          <p ${attr}="mb-2.5 text-gray-600">{user.email}</p>
          <span ${attr}="inline-block rounded-full bg-indigo-500 px-3 py-1 text-sm text-white">
            {user.role}
          </span>
        </div>
      </div>

      <div ${attr}="mt-8 flex flex-wrap gap-4">
        <a
          href="/user/1"
          ${attr}="rounded-md bg-gray-100 px-5 py-2.5 text-gray-800 no-underline transition-colors hover:bg-gray-200"
        >
          ${$tr("init.template.user1")}
        </a>
        <a
          href="/user/2"
          ${attr}="rounded-md bg-gray-100 px-5 py-2.5 text-gray-800 no-underline transition-colors hover:bg-gray-200"
        >
          ${$tr("init.template.user2")}
        </a>
        <a
          href="/user/3"
          ${attr}="rounded-md bg-gray-100 px-5 py-2.5 text-gray-800 no-underline transition-colors hover:bg-gray-200"
        >
          ${$tr("init.template.user3")}
        </a>
      </div>
    </div>
  );
}
`;
}
