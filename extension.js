#!/usr/bin/env node
/**
 * INI文件批量翻译脚本 - 命令行版本
 * 用法: node extension.js
 */

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');

// 初始化命令行程序
const program = new Command();

program
  .name('ini-translate')
  .description('批量翻译INI配置文件的命令行工具')
  .version('1.0.0');

/**
 * 主翻译函数
 * @param {object} options - 命令行选项
 */
async function translateFiles(options) {
  const startTime = Date.now();
  const workspaceRoot = process.cwd();
  
  console.log('🚀 开始批量翻译...\n');
  console.log(`工作目录: ${workspaceRoot}`);
  
  // 使用命令行参数或默认值
  const inputDir = options.input || 'input';
  const exportDir = options.output || 'export';
  const backupDir = options.backup || 'backup';
  const translationsPath = options.translations || 'translations.json';

  console.log(`输入目录: ${inputDir}`);
  console.log(`输出目录: ${exportDir}`);
  console.log(`备份目录: ${backupDir}`);
  console.log(`翻译字典: ${translationsPath}`);
  console.log('-'.repeat(50));

  // 检查必要的路径是否存在
  if (!fs.existsSync(inputDir)) {
    console.error(`❌ 错误: 输入目录不存在: ${inputDir}`);
    console.log('💡 提示: 请创建输入目录或在命令行中指定 --input <目录>');
    return;
  }
  
  if (!fs.existsSync(translationsPath)) {
    console.error(`❌ 错误: 翻译字典文件不存在: ${translationsPath}`);
    console.log('💡 提示: 请创建翻译字典文件或在命令行中指定 --translations <文件>');
    return;
  }

  // 加载翻译字典
  let translations;
  try {
    const translationsContent = fs.readFileSync(translationsPath, 'utf8');
    translations = JSON.parse(translationsContent);
    console.log(`✅ 成功加载翻译字典，共 ${Object.keys(translations).length} 个词条\n`);
  } catch (err) {
    console.error(`❌ 错误: 加载翻译字典时出错: ${err.message}`);
    return;
  }

  // 备份源文件
  try {
    if (fs.existsSync(backupDir)) {
      console.log(`🧹 清理旧的备份目录: ${backupDir}`);
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    
    console.log(`📦 备份源文件到: ${backupDir}`);
    fs.mkdirSync(backupDir, { recursive: true });
    
    if (fs.existsSync(inputDir)) {
      const files = fs.readdirSync(inputDir);
      files.forEach(file => {
        const source = path.join(inputDir, file);
        const dest = path.join(backupDir, file);
        if (fs.lstatSync(source).isFile()) {
          fs.copyFileSync(source, dest);
        }
      });
    }
    console.log('✅ 备份完成\n');
  } catch (err) {
    console.error(`❌ 错误: 备份文件时出错: ${err.message}`);
    return;
  }

  // 创建输出目录
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  // 获取输入目录中的所有.ini文件
  const files = fs.readdirSync(inputDir).filter(file => file.endsWith('.ini'));
  
  if (files.length === 0) {
    console.log('⚠️  警告: 输入目录中没有找到.ini文件');
    return;
  }

  console.log(`📁 找到 ${files.length} 个.ini文件:\n`);

  const totalFiles = files.length;
  let processed = 0;
  let totalReplacements = 0;
  let successFiles = 0;
  let failedFiles = 0;

  // 显示进度条
  console.log('🔄 开始翻译文件...\n');

  // 遍历处理每个文件
  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const exportPath = path.join(exportDir, file);

    try {
      // 读取文件内容
      let content = fs.readFileSync(inputPath, 'utf8');
      let fileReplacements = 0;
      const fileChanges = [];

      // 遍历翻译字典，执行替换操作
      for (const [english, chinese] of Object.entries(translations)) {
        const escapedEnglish = english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedEnglish, 'g');
        const matches = content.match(regex);
        
        if (matches && matches.length > 0) {
          content = content.replace(regex, chinese);
          fileReplacements += matches.length;
          fileChanges.push({
            original: english,
            translated: chinese,
            count: matches.length
          });
        }
      }

      // 写入翻译后的内容到输出文件
      fs.writeFileSync(exportPath, content, 'utf8');

      // 更新统计
      processed++;
      totalReplacements += fileReplacements;
      successFiles++;

      // 计算进度百分比
      const percentage = Math.round((processed / totalFiles) * 100);
      
      // 显示处理进度
      console.log(`📄 ${file}:`);
      console.log(`   ✅ 处理完成 (${fileReplacements} 处替换)`);
      
      if (fileChanges.length > 0 && options.verbose) {
        console.log('   详细替换:');
        fileChanges.forEach(change => {
          console.log(`     - "${change.original}" → "${change.translated}" (${change.count}次)`);
        });
      }
      
      // 显示进度条
      const progressBar = '█'.repeat(Math.floor(percentage / 5)) + 
                         '░'.repeat(20 - Math.floor(percentage / 5));
      console.log(`   ${progressBar} ${percentage}% (${processed}/${totalFiles})\n`);

    } catch (err) {
      console.error(`❌ 错误: 处理文件 ${file} 时出错: ${err.message}`);
      failedFiles++;
    }
  }

  // 计算执行时间
  const endTime = Date.now();
  const executionTime = ((endTime - startTime) / 1000).toFixed(2);

  // 显示最终统计
  console.log('='.repeat(50));
  console.log('🎉 翻译过程已完成!');
  console.log('='.repeat(50));
  console.log(`📊 统计信息:`);
  console.log(`   ✅ 成功处理: ${successFiles} 个文件`);
  console.log(`   ❌ 失败文件: ${failedFiles} 个`);
  console.log(`   🔄 总替换: ${totalReplacements} 处`);
  console.log(`   ⏱️  执行时间: ${executionTime} 秒`);
  console.log(`\n📁 输出目录: ${path.resolve(exportDir)}`);
  console.log(`📁 备份目录: ${path.resolve(backupDir)}`);
  console.log('\n💡 提示: 翻译后的文件已保存到 export 目录');
}

/**
 * 初始化项目结构
 */
function initProject() {
  console.log('📁 初始化项目结构...\n');
  
  const directories = ['input', 'export', 'backup'];
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ 创建目录: ${dir}/`);
    } else {
      console.log(`📁 目录已存在: ${dir}/`);
    }
  });
  
  // 创建示例翻译字典
  if (!fs.existsSync('translations.json')) {
    const exampleTranslations = {
      "Engine Type": "引擎类型",
      "Launch Control Enabled": "启动控制已启用",
      "Cranking RPM": "启动转速",
      "Idle Speed": "怠速",
      "Injection Timing": "喷油正时"
    };
    
    fs.writeFileSync('translations.json', 
      JSON.stringify(exampleTranslations, null, 2));
    console.log('✅ 创建示例翻译字典: translations.json');
  } else {
    console.log('📄 翻译字典已存在: translations.json');
  }
  
  // 创建示例INI文件
  if (!fs.existsSync('input/example.ini')) {
    const exampleIni = `[Engine]
Engine Type = DEFAULT_FRANKENSO
Launch Control Enabled = true
Cranking RPM = 300
Idle Speed = 850

[Sensors]
Coolant Temperature = 90
MAP Sensor = MPX4250

[Controls]
Closed Loop = true
Injection Timing = 360`;
    
    fs.writeFileSync('input/example.ini', exampleIni);
    console.log('✅ 创建示例文件: input/example.ini');
  }
  
  console.log('\n🎉 项目初始化完成!');
  console.log('\n💡 使用方法:');
  console.log('   1. 将需要翻译的.ini文件放入 input/ 目录');
  console.log('   2. 编辑 translations.json 文件，添加翻译词条');
  console.log('   3. 运行: node extension.js translate');
}

/**
 * 测试翻译功能
 */
function testTranslation() {
  console.log('🧪 测试翻译功能...\n');
  
  const testTranslations = {
    "Hello World": "你好世界",
    "Test String": "测试字符串"
  };
  
  const testCases = [
    {
      input: "Hello World! This is a Test String.",
      expected: "你好世界! This is a 测试字符串.",
      description: "基本字符串替换"
    }
  ];
  
  testCases.forEach((testCase, index) => {
    let result = testCase.input;
    for (const [english, chinese] of Object.entries(testTranslations)) {
      const escaped = english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'g');
      result = result.replace(regex, chinese);
    }
    
    const passed = result === testCase.expected;
    console.log(`${passed ? '✅' : '❌'} 测试 ${index + 1}: ${testCase.description}`);
    if (!passed) {
      console.log(`   期望: "${testCase.expected}"`);
      console.log(`   实际: "${result}"`);
    }
  });
  
  console.log('\n🧪 测试完成!');
}

/**
 * 清理输出和备份目录
 */
function cleanDirectories() {
  console.log('🧹 清理目录...\n');
  
  const directories = ['export', 'backup'];
  directories.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`✅ 已删除: ${dir}/`);
      } catch (err) {
        console.error(`❌ 删除失败 ${dir}/: ${err.message}`);
      }
    } else {
      console.log(`📁 目录不存在: ${dir}/`);
    }
  });
  
  console.log('\n🧹 清理完成!');
}

// 配置命令行选项
program
  .command('translate')
  .description('执行批量翻译')
  .option('-i, --input <dir>', '输入目录', 'input')
  .option('-o, --output <dir>', '输出目录', 'export')
  .option('-b, --backup <dir>', '备份目录', 'backup')
  .option('-t, --translations <file>', '翻译字典文件', 'translations.json')
  .option('-v, --verbose', '显示详细输出')
  .action(translateFiles);

program
  .command('init')
  .description('初始化项目结构和示例文件')
  .action(initProject);

program
  .command('test')
  .description('测试翻译功能')
  .action(testTranslation);

program
  .command('clean')
  .description('清理输出和备份目录')
  .action(cleanDirectories);

// 如果没有提供命令，显示帮助信息
if (process.argv.length <= 2) {
  program.outputHelp();
  console.log('\n💡 示例:');
  console.log('  $ node extension.js init              # 初始化项目');
  console.log('  $ node extension.js translate         # 执行翻译');
  console.log('  $ node extension.js translate --verbose  # 详细模式');
  console.log('  $ node extension.js test              # 运行测试');
  console.log('  $ node extension.js clean             # 清理目录\n');
} else {
  program.parse(process.argv);
}