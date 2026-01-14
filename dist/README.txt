# INI文件翻译工具

## 简介
这是一个独立的INI文件批量翻译工具，无需安装任何环境，下载即用。

## 快速开始
1. 将需要翻译的INI文件放入 input 文件夹
2. 双击运行 translate.bat
3. 查看 export 文件夹中的结果
4. 可手动修改key.xlsx里面的字典值，增加翻译条目

## 文件结构
- translate.bat - 快速翻译脚本（英文）
- ini-translate.exe - 翻译核心程序
- translations.json - 翻译字典
- input/ - 输入目录（放置INI文件）
- export/ - 输出目录（翻译结果）
- backup/ - 备份目录（自动备份）
- excel/ - Excel目录（翻译字典）

## 系统要求
- Windows 7/8/10/11
- PowerShell 3.0 或更高版本
- 无需安装Node.js或其他依赖
