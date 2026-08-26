import type { JSX } from "@dreamer/view";

export default function App(props: { children?: JSX.Element }) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <title>kinds-web</title>
      </head>
      <body>
        <div id="app">{props.children}</div>
      </body>
    </html>
  );
}
