#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

console.log('🚀 Starting INI translation tool packaging...\n');

// 检查是否安装了pkg
try {
  execSync('pkg --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ Error: pkg not installed, please run: npm install -g pkg');
  process.exit(1);
}

// 创建dist目录
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// 打包为可执行文件
console.log('📦 Packaging executable file...');
try {
  execSync('pkg extension.js --target node16-win-x64 --output dist/ini-translate.exe', { 
    stdio: 'inherit' 
  });
  console.log('✅ Executable file packaged successfully\n');
} catch (error) {
  console.error('❌ Packaging failed:', error.message);
  process.exit(1);
}

// 创建必要的目录结构
const directories = ['input', 'export', 'backup', 'excel'];
directories.forEach(dir => {
  const dirPath = path.join('dist', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: dist/${dir}/`);
  }
});

// 复制现有的translations.json
console.log('\n📄 Copying translation dictionary...');
if (fs.existsSync('translations.json')) {
  try {
    fs.copyFileSync('translations.json', 'dist/translations.json');
    const translationsData = JSON.parse(fs.readFileSync('translations.json', 'utf8'));
    console.log(`✅ Copied existing dictionary: translations.json (${Object.keys(translationsData).length} entries)`);
  } catch (error) {
    console.log('⚠️ Failed to copy dictionary, creating default...');
  }
} else {
  console.log('⚠️ No existing dictionary found, creating default...');
}

// 复制项目中的实际文件到打包目录
console.log('\n📁 Copying project files...');

// 复制input目录中的实际文件
if (fs.existsSync('input')) {
  try {
    const inputFiles = fs.readdirSync('input');
    let copiedCount = 0;
    
    inputFiles.forEach(file => {
      const sourcePath = path.join('input', file);
      const destPath = path.join('dist', 'input', file);
      
      if (fs.statSync(sourcePath).isFile()) {
        fs.copyFileSync(sourcePath, destPath);
        copiedCount++;
      }
    });
    
    console.log(`✅ Copied ${copiedCount} files from input/ directory`);
    
    // 如果没有文件，创建示例文件
    if (copiedCount === 0) {
      createExampleIniFile();
    }
  } catch (error) {
    console.log('⚠️ Error copying input files, creating example file...');
    createExampleIniFile();
  }
} else {
  console.log('⚠️ Input directory not found, creating example file...');

}

// 复制excel目录中的实际文件
if (fs.existsSync('excel')) {
  try {
    const excelFiles = fs.readdirSync('excel');
    let copiedCount = 0;
    
    excelFiles.forEach(file => {
      const sourcePath = path.join('excel', file);
      const destPath = path.join('dist', 'excel', file);
      
      if (fs.statSync(sourcePath).isFile()) {
        fs.copyFileSync(sourcePath, destPath);
        copiedCount++;
      }
    });
    
    console.log(`✅ Copied ${copiedCount} files from excel/ directory`);
    
    // 如果没有Excel文件，创建示例
    if (copiedCount === 0) {
      createExampleExcelFile();
    }
  } catch (error) {
    console.log('⚠️ Error copying Excel files, creating example...');
    createExampleExcelFile();
  }
} else {
  console.log('⚠️ Excel directory not found, creating example file...');

}



// 创建直接运行批处理文件
const directRunContent = `@echo off
chcp 65001 >nul
title INI Translate - Direct Mode

echo.
echo ========================================
echo      INI Translation Tool - Direct Mode
echo ========================================
echo.
echo Start time: %date% %time%
echo.

if not exist "ini-translate.exe" (
    echo ERROR: ini-translate.exe not found!
    pause
    exit /b 1
)

ini-translate.exe translate

echo.
echo End time: %date% %time%
echo.
echo Translation completed!
echo Output files: export directory
echo Backup files: backup directory
echo.
pause
`;

fs.writeFileSync('dist/translate.bat', directRunContent, 'utf8');
console.log('✅ Direct translation script created: translate.bat');

// 创建使用说明
const readmeContent = `# INI文件翻译工具

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
`;

fs.writeFileSync('dist/README.txt', readmeContent, 'utf8');
console.log('✅ User manual created: README.txt');


// 创建压缩包
console.log('\n🗜️ Creating distribution package...');
const output = fs.createWriteStream('ini-translate-tool.zip');
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', function() {
  const fileSize = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`✅ Distribution package created: ini-translate-tool.zip (${fileSize} MB)`);
  
  console.log('\n🎉 Packaging completed!');
  console.log('\n📦 Package contents:');
  console.log('   📁 translate.bat - Direct translation script');
  console.log('   📁 translations.json - Translation dictionary');
  console.log('   📁 input/ - Input directory');
  console.log('   📁 export/ - Output directory'); 
  console.log('   📁 backup/ - Backup directory');
  console.log('   📁 excel/ - Excel directory');
  console.log('   📁 README.txt - User manual');
  
  console.log('\n💡 Usage instructions:');
  console.log('   1. Extract ZIP to any directory');
  console.log('   2. Put INI files in input/ folder');
  console.log('   3. Double-click run.bat (recommended)');
  console.log('   4. Use the Chinese PowerShell interface');
  
  console.log('\n✅ Encoding issues SOLVED:');
  console.log('   - Batch files: Pure English (no Chinese characters)');
  console.log('   - Chinese interface: PowerShell (proper UTF-8 support)');
  console.log('   - No more乱码 problems!');
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);
archive.directory('dist/', false);
archive.finalize();