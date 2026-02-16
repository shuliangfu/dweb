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
import { $t } from "../../../utils/i18n.ts";

export function getAppTsx(opts: InitOptions): string {
  const titleName = opts.projectName;
  const propsSnippet = getAppPropsTypeSnippet(opts.engine);
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
  description = "Built with @dreamer/dweb",
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
      <body className="bg-gray-100 text-gray-900 antialiased">
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
    ? "UnoCSS"
    : opts.style === "tailwind"
    ? "Tailwind CSS v4"
    : "Generic styles";
  const importAndProps = getLayoutPropsTypeSnippet(opts.engine);

  return `/**
 * Layout component - header, footer, content (using ${styleComment})
 */

${importAndProps}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between h-16">
            <a
              href="/"
              className="text-xl font-bold ${accentClass}"
            >
              ${appDisplayName}
            </a>
            <ul className="flex items-center gap-6 list-none m-0 p-0">
              <li>
                <a
                  href="/"
                  className="${linkClass}"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  className="${linkClass}"
                >
                  About
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2024 Built with @dreamer/dweb
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
    : "bg-gradient-to-br from-[#667eea] to-[#764ba2]";
  const isView = opts.engine === "view";
  const attr = isView ? "class" : "className";
  const counterImport = isView
    ? 'import { createSignal } from "@dreamer/view";\n\n'
    : opts.engine === "preact"
    ? 'import { useState } from "preact/hooks";\n\n'
    : 'import { useState } from "react";\n\n';
  const counterState = isView
    ? "  const [count, setCount] = createSignal(0);\n"
    : "  const [count, setCount] = useState(0);\n";
  const counterSection = isView
    ? `      <section ${attr}="mb-10 rounded-xl border border-gray-200 bg-white p-6 shadow-md">
        <h2 ${attr}="mb-4 text-center text-[#667eea]">${
      $t("init.template.counterExample")
    }</h2>
        <p ${attr}="mb-4 text-center text-sm text-gray-500">${
      $t("init.template.counterViewDesc")
    }</p>
        {() => (
          <div ${attr}="flex flex-col items-center justify-center gap-4">
            <span ${attr}="text-2xl font-semibold">count: ${"{"}count()${"}"}</span>
            <div ${attr}="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                ${attr}="rounded-lg border-0 bg-[#667eea] px-4 py-2 text-white hover:opacity-90"
                onClick={() => setCount(count() + 1)}
              >
                ${$t("init.template.counterIncrement")}
              </button>
              <button
                type="button"
                ${attr}="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
                onClick={() => setCount(count() - 1)}
              >
                ${$t("init.template.counterDecrement")}
              </button>
              <button
                type="button"
                ${attr}="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-gray-600 hover:bg-gray-200"
                onClick={() => setCount(0)}
              >
                ${$t("init.template.counterReset")}
              </button>
            </div>
          </div>
        )}
      </section>`
    : `      <section ${attr}="mb-10 rounded-xl border border-gray-200 bg-white p-6 shadow-md">
        <h2 ${attr}="mb-4 text-center text-[#667eea]">${
      $t("init.template.counterExample")
    }</h2>
        <p ${attr}="mb-4 text-center text-sm text-gray-500">${
      $t("init.template.counterSummary")
    }</p>
        <div ${attr}="flex flex-col items-center justify-center gap-4">
          <span ${attr}="text-2xl font-semibold">count: ${"{"}count${"}"}</span>
          <div ${attr}="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              ${attr}="rounded-lg border-0 bg-[#667eea] px-4 py-2 text-white hover:opacity-90"
              onClick={() => setCount((c) => c + 1)}
            >
              ${$t("init.template.counterIncrement")}
            </button>
            <button
              type="button"
              ${attr}="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
              onClick={() => setCount((c) => c - 1)}
            >
              ${$t("init.template.counterDecrement")}
            </button>
            <button
              type="button"
              ${attr}="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-gray-600 hover:bg-gray-200"
              onClick={() => setCount(0)}
            >
              ${$t("init.template.counterReset")}
            </button>
          </div>
        </div>
      </section>`;

  return `/**
 * ${$t("init.comments.homePage")}
 * ${$t("init.comments.homeRoute")}
 */

${counterImport}export default function Home() {
${counterState}  return (
    <div ${attr}="py-5">
      <section ${attr}="mb-10 rounded-xl ${heroGradient} px-5 py-15 text-center text-white">
        <h1 ${attr}="mb-4 text-4xl">${$t("init.template.indexWelcome")}</h1>
        <p ${attr}="text-xl text-white/90">
          ${$t("init.template.indexDesc", { engine: engineName })}
        </p>
      </section>

      <section ${attr}="mb-10">
        <h2 ${attr}="mb-8 text-center text-2xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-[#667eea] to-[#764ba2]">${
    $t("init.template.indexFeatures")
  }</h2>
        <div ${attr}="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div ${attr}="rounded-lg bg-white p-6 shadow-md">
            <h3 ${attr}="mb-2.5 text-[#667eea]">${
    $t("init.template.featureFileRouting")
  }</h3>
            <p>${$t("init.template.featureFileRoutingDesc")}</p>
          </div>
          <div ${attr}="rounded-lg bg-white p-6 shadow-md">
            <h3 ${attr}="mb-2.5 text-[#667eea]">${
    $t("init.template.featureSsr")
  }</h3>
            <p>${$t("init.template.featureSsrDesc")}</p>
          </div>
          <div ${attr}="rounded-lg bg-white p-6 shadow-md">
            <h3 ${attr}="mb-2.5 text-[#667eea]">${
    $t("init.template.featureTypescript")
  }</h3>
            <p>${$t("init.template.featureTypescriptDesc")}</p>
          </div>
          <div ${attr}="rounded-lg bg-white p-6 shadow-md">
            <h3 ${attr}="mb-2.5 text-[#667eea]">${engineName}</h3>
            <p>${$t("init.template.featureEngine")}</p>
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
  return `/**
 * ${$t("init.comments.aboutPage")}
 * ${$t("init.comments.aboutRoute")}
 */

export default function About() {
  return (
    <div className="py-5">
      <h1 className="mb-8 text-3xl font-bold">${
    $t("init.template.aboutTitle")
  }</h1>

      <section className="rounded-lg bg-white p-8 shadow-md">
        <p className="mb-6" dangerouslySetInnerHTML={{ __html: "${
    $t("init.template.aboutDesc", { engine: engineName })
  }" }} />

        <h2 className="mb-4 mt-6 text-xl font-semibold text-indigo-600">${
    $t("init.template.aboutTechStack")
  }</h2>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>@dreamer/dweb</strong> - ${$t("init.template.techDweb")}
          </li>
          <li>
            <strong>${engineName}</strong> - ${$t("init.template.techEngine")}
          </li>
          <li>
            <strong>Deno</strong> - ${$t("init.template.techDeno")}
          </li>
          <li>
            <strong>TypeScript</strong> - ${$t("init.template.techTypescript")}
          </li>
        </ul>
      </section>
    </div>
  );
}
`;
}

export function getUserByIdTsx(opts: InitOptions): string {
  const avatarGradient = opts.style === "tailwind"
    ? "bg-linear-to-br from-indigo-500 to-purple-600"
    : "bg-gradient-to-br from-indigo-500 to-purple-600";
  return `/**
 * ${$t("init.comments.userDetailPage")}
 * ${$t("init.comments.dynamicRoute")}
 */

/** ${$t("init.comments.userPageProps")} */
interface UserProps {
  /** ${$t("init.comments.routeParams")} */
  params: {
    id: string;
  };
}

/** Mock user data */
const users: Record<string, { name: string; email: string; role: string }> = {
  "1": { name: "${
    $t("init.template.user1Name")
  }", email: "user1@example.com", role: "${$t("init.template.user1Role")}" },
  "2": { name: "${
    $t("init.template.user2Name")
  }", email: "user2@example.com", role: "${$t("init.template.user2Role")}" },
  "3": { name: "${
    $t("init.template.user3Name")
  }", email: "user3@example.com", role: "${$t("init.template.user3Role")}" },
};

/**
 * ${$t("init.comments.userDetailPage")}
 */
export default function User({ params }: UserProps) {
  const user = users[params.id];

  if (!user) {
    return (
      <div className="py-16 px-5 text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-500">${
    $t("init.template.userNotFound")
  }</h1>
        <p className="mb-4">${
    $t("init.template.userNotFoundDescPrefix")
  }{params.id}${$t("init.template.userNotFoundDescSuffix")}</p>
        <a
          href="/"
          className="mt-5 inline-block rounded-md bg-blue-600 px-5 py-2.5 text-white no-underline hover:bg-blue-700"
        >
          ${$t("init.template.backToHome")}
        </a>
      </div>
    );
  }

  return (
    <div className="py-5">
      <h1 className="mb-8 text-3xl font-bold">${
    $t("init.template.userDetail")
  }</h1>

      <div className="flex items-center gap-6 rounded-xl bg-white p-8 shadow-md">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full ${avatarGradient} text-3xl font-bold text-white">
          {user.name.charAt(0)}
        </div>
        <div>
          <h2 className="mb-2 text-2xl font-semibold">{user.name}</h2>
          <p className="mb-2.5 text-gray-600">{user.email}</p>
          <span className="inline-block rounded-full bg-indigo-500 px-3 py-1 text-sm text-white">
            {user.role}
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <a
          href="/user/1"
          className="rounded-md bg-gray-100 px-5 py-2.5 text-gray-800 no-underline transition-colors hover:bg-gray-200"
        >
          ${$t("init.template.user1")}
        </a>
        <a
          href="/user/2"
          className="rounded-md bg-gray-100 px-5 py-2.5 text-gray-800 no-underline transition-colors hover:bg-gray-200"
        >
          ${$t("init.template.user2")}
        </a>
        <a
          href="/user/3"
          className="rounded-md bg-gray-100 px-5 py-2.5 text-gray-800 no-underline transition-colors hover:bg-gray-200"
        >
          ${$t("init.template.user3")}
        </a>
      </div>
    </div>
  );
}
`;
}
