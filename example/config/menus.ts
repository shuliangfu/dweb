export const menus = [
	{
    label: $t('首页'),
    href: '/',
  },
  {
    label: $t('特性'),
    href: '/features',
  },
  {
    label: $t('示例'),
    href: '/examples',
  },
  {
    label: $t('文档'),
    href: '/docs',
  },
  {
    label: $t('关于'),
    href: '/about',
  }
] as const

export default menus;