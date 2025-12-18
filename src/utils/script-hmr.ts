/**
 * HMR 客户端脚本工具函数
 * 用于生成 HMR 客户端脚本代码
 */

/**
 * 生成 HMR 客户端脚本内容
 * @param hmrPort HMR 服务器端口
 * @returns HMR 客户端脚本代码
 */
export function generateHMRClientScript(hmrPort: number): string {
  return `(function () {
	const ws = new WebSocket('ws://localhost:${hmrPort}')

	/**
	 * 重新加载 CSS 文件
	 */
	function reloadStylesheet(filePath) {
		// 查找所有 link 标签
		const links = document.querySelectorAll('link[rel="stylesheet"]')
		links.forEach(link => {
			const href = link.getAttribute('href')
			if (href && (href.includes(filePath) || filePath.includes('style.css'))) {
				// 添加时间戳强制重新加载
				const newHref = href.split('?')[0] + '?t=' + Date.now()
				link.setAttribute('href', newHref)
			}
		})
	}

	/**
	 * 加载布局组件
	 */
	async function loadLayoutComponent(layoutPath) {
		if (!layoutPath) {
			return null
		}

		try {
			const separator = layoutPath.includes('?') ? '&' : '?'
			const layoutModule = await import(layoutPath + separator + 't=' + Date.now())
			return layoutModule.default
		} catch (_layoutError) {
			return null
		}
	}

	/**
	 * 创建页面元素（包含布局，支持异步组件）
	 */
	async function createPageElement(PageComponent, LayoutComponent, props, jsx) {
		// 创建页面元素（支持异步组件）
		// 注意：如果 PageComponent 是 async function，直接调用它并等待 Promise
		// 如果组件是同步的，使用 jsx 函数调用
		let pageElement
		try {
			// 先尝试直接调用组件（支持异步组件）
			const componentResult = PageComponent(props)
			// 如果返回 Promise，等待它
			if (componentResult instanceof Promise) {
				pageElement = await componentResult
			} else {
				// 同步组件返回 JSX，直接使用
				pageElement = componentResult
			}
			if (!pageElement) {
				throw new Error('页面组件返回了空值')
			}
		} catch (callError) {
			// 如果直接调用失败，尝试用 jsx 函数调用（同步组件）
			try {
				let elementResult = jsx(PageComponent, props)
				if (elementResult instanceof Promise) {
					pageElement = await elementResult
				} else {
					pageElement = elementResult
				}
				if (!pageElement) {
					throw new Error('页面组件返回了空值')
				}
			} catch (jsxError) {
				throw new Error(\`创建页面元素失败: \${callError.message}\`)
			}
		}

		// 如果有布局，用布局包裹页面元素（支持异步布局组件）
		if (LayoutComponent) {
			try {
				// 先尝试直接调用布局组件（支持异步组件）
				const layoutResult = LayoutComponent({ children: pageElement })
				let finalElement
				if (layoutResult instanceof Promise) {
					finalElement = await layoutResult
				} else {
					finalElement = layoutResult
				}
				if (!finalElement) {
					throw new Error('布局组件返回了空值')
				}
				return finalElement
			} catch (layoutCallError) {
				// 如果直接调用失败，尝试用 jsx 函数调用（同步组件）
				try {
					let layoutResult = jsx(LayoutComponent, { children: pageElement })
					let finalElement
					if (layoutResult instanceof Promise) {
						finalElement = await layoutResult
					} else {
						finalElement = layoutResult
					}
					if (!finalElement) {
						throw new Error('布局组件返回了空值')
					}
					return finalElement
				} catch (_layoutError) {
					// 如果都失败，使用原始页面元素
					return pageElement
				}
			}
		}

		return pageElement
	}

	/**
	 * 验证并渲染组件
	 */
	function renderComponent(root, finalElement, render, filePath) {
		// 先卸载之前的渲染（Preact 需要先卸载才能正确渲染新内容）
		if (root.children.length > 0 || root.textContent.trim() !== '') {
			render(null, root)
			// 等待一下，确保卸载完成
			setTimeout(() => {
				// 再次清空容器（确保干净）
				root.innerHTML = ''
				
				// 渲染新组件
				render(finalElement, root)
				
				// 等待一下，让 Preact 完成渲染
				setTimeout(() => {
					// 验证渲染结果
					const hasChildren = root.children.length > 0
					const hasText = root.textContent.trim() !== ''
					
					if (!hasChildren && !hasText) {
						throw new Error('渲染后容器为空')
					}
				}, 50)
			}, 10)
		} else {
			// 容器本来就是空的，直接渲染
			render(finalElement, root)
			
			// 等待一下，让 Preact 完成渲染
			setTimeout(() => {
				// 验证渲染结果
				const hasChildren = root.children.length > 0
				const hasText = root.textContent.trim() !== ''
				
				if (!hasChildren && !hasText) {
					throw new Error('渲染后容器为空')
				}
			}, 50)
		}
	}

	/**
	 * 更新组件（通过 GET 请求获取编译后的模块）
	 */
	async function updateComponent(moduleUrl, filePath) {
		let module = null
		try {
			// 验证 Preact 模块已预加载
			if (!globalThis.__PREACT_MODULES__) {
				throw new Error('Preact 模块未预加载')
			}
			const { render, jsx } = globalThis.__PREACT_MODULES__

			// 获取根容器
			const root = document.getElementById('root')
			if (!root) {
				throw new Error('未找到 #root 容器')
			}

			// 通过 GET 请求获取编译后的模块
			// 添加时间戳避免缓存
			const separator = moduleUrl.includes('?') ? '&' : '?'
			const moduleUrlWithTimestamp = moduleUrl + separator + 't=' + Date.now()
			
			// 直接导入模块（服务器会编译并返回）
			module = await import(moduleUrlWithTimestamp)
			
			// 获取页面组件
			const PageComponent = module.default
			if (!PageComponent || typeof PageComponent !== 'function') {
				throw new Error('组件未导出默认组件或组件不是函数')
			}

			// 获取页面数据和布局路径
			const pageData = globalThis.__PAGE_DATA__ || {}
			const props = pageData.props || {}
			const layoutPath = pageData.layoutPath

			// 加载布局组件
			const LayoutComponent = await loadLayoutComponent(layoutPath)

			// 创建页面元素（包含布局，支持异步组件）
			const finalElement = await createPageElement(
				PageComponent,
				LayoutComponent,
				props,
				jsx,
			)

			// 渲染组件
			renderComponent(root, finalElement, render, filePath)
		} catch (_error) {
			// 失败时回退到重新加载组件
			reloadComponent(filePath)
		}
	}

	/**
	 * 重新加载组件（通过重新获取页面内容，降级方案）
	 */
	async function reloadComponent(_filePath) {
		try {
			// 获取当前页面的 HTML
			const response = await fetch(globalThis.location.href, {
				headers: {
					'Cache-Control': 'no-cache',
					'Pragma': 'no-cache'
				}
			})
			const html = await response.text()

			// 解析 HTML
			const parser = new DOMParser()
			const newDoc = parser.parseFromString(html, 'text/html')

			// 获取新的 body 内容
			const newBody = newDoc.body
			const currentBody = document.body

			// 替换 body 内容（保留 script 标签，但排除 HMR 脚本）
			const scripts = Array.from(currentBody.querySelectorAll('script'))
			currentBody.innerHTML = newBody.innerHTML

			// 重新执行脚本（排除 HMR 脚本，避免重复连接）
			scripts.forEach(script => {
				const scriptContent = script.textContent || ''
				// 检查是否是 HMR 脚本（包含 WebSocket 连接代码）
				const isHMRScript = scriptContent.includes('ws://:') && scriptContent.includes('${hmrPort}')
				// 跳过 HMR 脚本，避免重复创建 WebSocket 连接
				if (isHMRScript) {
					return
				}

				const newScript = document.createElement('script')
				if (script.src) {
					newScript.src = script.src + '?t=' + Date.now()
				} else {
					newScript.textContent = scriptContent
				}
				document.body.appendChild(newScript)
			})

		} catch (_error) {
			// 失败时回退到完全重载
			globalThis.location.reload()
		}
	}

	/**
	 * 处理 HMR 更新消息
	 */
	async function handleUpdateMessage(data) {
		try {
			if (data.type === 'css' && data.action === 'reload-stylesheet') {
				// CSS 文件：只更新样式表
				reloadStylesheet(data.file)
			} else if (data.type === 'component' && data.action === 'update-component') {
				// 组件文件：通过 GET 请求获取编译后的模块
				if (data.moduleUrl) {
					await updateComponent(data.moduleUrl, data.file)
				} else {
					// 如果没有模块 URL，回退到重新加载
					reloadComponent(data.file)
				}
			} else if (data.type === 'component' && data.action === 'reload-component') {
				// 组件文件：重新加载组件内容（降级方案）
				reloadComponent(data.file)
			} else {
				// 其他情况：完全重载
				globalThis.location.reload()
			}
		} catch (_error) {
			// 失败时回退到完全重载
			globalThis.location.reload()
		}
	}

	/**
	 * 处理 HMR WebSocket 消息
	 */
	async function handleHMRMessage(event) {
		try {
			const message = JSON.parse(event.data)
			
			if (message.type === 'reload') {
				globalThis.location.reload()
			} else if (message.type === 'update') {
				await handleUpdateMessage(message.data || {})
			}
		} catch (_error) {
			// 静默处理错误
		}
	}

	ws.onmessage = handleHMRMessage

	ws.onopen = () => {
		console.log('✅ HMR WebSocket 连接已建立')
	}

	ws.onerror = (_error) => {
		// 静默处理错误
	}

	ws.onclose = () => {
		console.log('❌ HMR WebSocket 连接已关闭')
	}
})()`;
}

/**
 * 创建 HMR 客户端脚本（带 script 标签）
 * @param hmrPort HMR 服务器端口
 * @returns HMR 客户端脚本 HTML
 */
export function createHMRClientScript(hmrPort: number): string {
  const scriptContent = generateHMRClientScript(hmrPort);

  return `
<script>
${scriptContent}
</script>
`;
}

