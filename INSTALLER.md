# The Fate Ring 安装包说明

## 本地预览

```bash
npm install
DEEPSEEK_API_KEY=你的_key npm run electron
```

## 打 Mac 安装包

```bash
npm run dist:mac
```

生成文件会出现在 `release/` 目录里，通常是：

```text
release/The-Fate-Ring-1.0.0-mac.dmg
```

## DeepSeek Key

安装包不会把 DeepSeek API Key 写进源码或 HTML。桌面 App 会优先读取运行环境里的：

```text
DEEPSEEK_API_KEY
```

如果没有这个变量，App 仍可打开和抽牌，但 AI 解读会回退到本地兜底。

如果要让朋友不用配置 Key 也能用 DeepSeek，推荐把 DeepSeek 调用部署成你自己的后端代理，再让 App 调你的代理地址；不要把 Key 直接打进安装包。
