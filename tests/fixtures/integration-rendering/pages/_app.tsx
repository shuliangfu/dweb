
import { h } from 'preact';

export default function App({ children }: { children: string }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Test App</title>
      </head>
      <body>
        <div id="app" dangerouslySetInnerHTML={{ __html: children }} />
      </body>
    </html>
  );
}
