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

// 尝试加载 xlsx 库，如果未安装会提示用户安装
let xlsx;
try {
    xlsx = require('xlsx');
} catch (error) {
    console.log('⚠️  xlsx 模块未安装，Excel 转换功能将不可用');
    console.log('💡 请运行: npm install xlsx');
}


/**
 * 将 Excel 文件转换为 translations.json（合并模式，不覆盖已有内容）
 * @param {string} excelPath - Excel 文件路径
 * @param {string} outputPath - 输出 JSON 文件路径
 */
function convertExcelToJson(excelPath, outputPath) {
    if (!xlsx) {
        console.error('❌ 错误: xlsx 模块未安装，无法读取 Excel 文件');
        console.log('💡 请运行: npm install xlsx');
        return false;
    }
    
    try {
        // 1. 读取现有的 translations.json（如果存在）
        let existingTranslations = {};
        if (fs.existsSync(outputPath)) {
            try {
                const existingData = fs.readFileSync(outputPath, 'utf8');
                existingTranslations = JSON.parse(existingData);
                console.log(`📁 找到现有翻译字典，包含 ${Object.keys(existingTranslations).length} 个词条`);
            } catch (err) {
                console.warn(`⚠️  读取现有 translations.json 时出错: ${err.message}`);
                console.log('💡 将创建新的翻译字典');
            }
        } else {
            console.log('📁 未找到 translations.json，将创建新文件');
        }
        
        console.log(`\n📊 正在读取 Excel 文件: ${excelPath}`);
        
        // 2. 读取 Excel 文件
        const workbook = xlsx.readFile(excelPath);
        
        // 获取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 获取表头（第一行）来确定列名
        const header = {};
        const range = xlsx.utils.decode_range(worksheet['!ref']);
        
        // 读取第一行作为表头
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = {c: C, r: 0};
            const cellRef = xlsx.utils.encode_cell(cellAddress);
            const cell = worksheet[cellRef];
            if (cell && cell.v) {
                header[C] = cell.v.toString().trim();
            }
        }
        
        // 将工作表转换为 JSON
        const jsonData = xlsx.utils.sheet_to_json(worksheet, {header: Object.values(header)});
        
        if (jsonData.length === 0) {
            console.error('❌ 错误: Excel 文件中没有数据');
            return false;
        }
        
        console.log(`📊 Excel 文件有 ${jsonData.length} 行数据`);
        console.log(`📊 列名: ${Object.keys(jsonData[0]).join(', ')}`);
        
        // 3. 转换数据格式
        const newTranslations = {};
        let skippedRows = 0;
        let addedCount = 0;
        let updatedCount = 0;
        let unchangedCount = 0;
        
        jsonData.forEach((row, index) => {
            const rowNum = index + 2; // Excel行号（从1开始，表头是第1行）
            
            // 获取 key 和 value 列
            let key = null;
            let value = null;
            
            // 查找列名（不区分大小写）
            for (const [colName, colValue] of Object.entries(row)) {
                if (colName && colValue !== undefined) {
                    const colNameLower = colName.toLowerCase();
                    if (colNameLower === 'key' || colNameLower === '键' || colNameLower === '英文') {
                        key = colValue;
                    } else if (colNameLower === 'value' || colNameLower === '值' || colNameLower === '中文') {
                        value = colValue;
                    }
                }
            }
            
            // 如果没找到标准列名，尝试第一列作为key，第二列作为value
            if (!key || !value) {
                const entries = Object.entries(row);
                if (entries.length >= 2) {
                    key = entries[0][1];
                    value = entries[1][1];
                }
            }
            
            if (key !== null && value !== null) {
                // 清理数据
                const cleanKey = key.toString().trim();
                const cleanValue = value.toString().trim();
                
                if (cleanKey && cleanValue) {
                    // 检查是否已存在
                    if (existingTranslations.hasOwnProperty(cleanKey)) {
                        if (existingTranslations[cleanKey] !== cleanValue) {
                            // 值不同，更新
                            newTranslations[cleanKey] = cleanValue;
                            updatedCount++;
                            console.log(`   🔄 行 ${rowNum}: 更新 "${cleanKey}" (旧: "${existingTranslations[cleanKey]}", 新: "${cleanValue}")`);
                        } else {
                            // 值相同，保持不变
                            newTranslations[cleanKey] = cleanValue;
                            unchangedCount++;
                        }
                    } else {
                        // 新键
                        newTranslations[cleanKey] = cleanValue;
                        addedCount++;
                        console.log(`   ➕ 行 ${rowNum}: 添加 "${cleanKey}" -> "${cleanValue}"`);
                    }
                } else {
                    skippedRows++;
                    console.log(`   ⚠️  行 ${rowNum}: 跳过 - 键或值为空`);
                }
            } else {
                skippedRows++;
                console.log(`   ⚠️  行 ${rowNum}: 跳过 - 未找到键值对`);
            }
        });
        
        if (Object.keys(newTranslations).length === 0) {
            console.error('❌ 错误: 无法从 Excel 中提取有效的键值对');
            return false;
        }
        
        // 4. 合并新旧数据（保留原有但未在Excel中出现的条目）
        const mergedTranslations = {...existingTranslations, ...newTranslations};
        
        // 5. 按key排序
        const sortedTranslations = {};
        Object.keys(mergedTranslations).sort().forEach(key => {
            sortedTranslations[key] = mergedTranslations[key];
        });
        
        // 6. 写入 JSON 文件
        fs.writeFileSync(outputPath, JSON.stringify(sortedTranslations, null, 2), 'utf8');
        
        console.log(`\n✅ 转换并合并成功!`);
        console.log(`   📁 Excel 文件: ${path.resolve(excelPath)}`);
        console.log(`   📁 JSON 文件: ${path.resolve(outputPath)}`);
        console.log(`\n📊 转换统计:`);
        console.log(`   📄 原有词条: ${Object.keys(existingTranslations).length} 个`);
        console.log(`   📄 新增词条: ${addedCount} 个`);
        console.log(`   📄 更新词条: ${updatedCount} 个`);
        console.log(`   📄 未变化词条: ${unchangedCount} 个`);
        console.log(`   📄 跳过行数: ${skippedRows} 行`);
        console.log(`   📄 合并后总数: ${Object.keys(mergedTranslations).length} 个`);
        
        // 显示前几个转换结果
        console.log(`\n📋 前5个转换结果:`);
        const entries = Object.entries(newTranslations);
        for (let i = 0; i < Math.min(5, entries.length); i++) {
            const [key, value] = entries[i];
            const isNew = !existingTranslations.hasOwnProperty(key);
            console.log(`   ${isNew ? '➕' : '🔄'} "${key}": "${value}"`);
        }
        if (entries.length > 5) {
            console.log(`   ... 还有 ${entries.length - 5} 个`);
        }
        
        return true;
        
    } catch (error) {
        console.error(`\n❌ 转换 Excel 文件时出错: ${error.message}`);
        console.error(`📋 错误详情:`, error);
        return false;
    }
}

/**
 * 主函数 - 转换 excel/key.xlsx 到 translations.json
 */
function convertExcelToJsonMain() {
    const excelPath = path.join(__dirname, 'excel', 'key.xlsx');
    const outputPath = path.join(__dirname, 'translations.json');
    
    console.log('🚀 开始转换 Excel 文件到 translations.json\n');
    console.log(`📁 工作目录: ${__dirname}`);
    console.log(`📁 Excel 文件: ${excelPath}`);
    console.log(`📁 输出文件: ${outputPath}`);
    console.log('-'.repeat(50));
    
    // 检查 Excel 文件是否存在
    if (!fs.existsSync(excelPath)) {
        console.error(`❌ 错误: Excel 文件不存在: ${excelPath}`);
        console.log('💡 请检查:');
        console.log(`   1. 确保 excel/key.xlsx 文件存在`);
        console.log(`   2. 确保文件扩展名是 .xlsx 或 .xls`);
        console.log(`   3. 确保文件没有被其他程序占用`);
        return false;
    }
    
    // 执行转换
    const success = convertExcelToJson(excelPath, outputPath);
    
    if (success) {
        console.log('\n🎉 转换完成!');
        console.log('💡 现在可以运行翻译命令: node extension.js translate');
    } else {
        console.error('\n❌ 转换失败!');
    }
    
    return success;
}

/**
 * 查找 Excel 文件
 */
function findExcelFile() {
    const possiblePaths = [
        'excel/key.xlsx',
        'excel/key.xls',
        'key.xlsx',
        'key.xls',
        './excel/*.xlsx',
        './excel/*.xls',
        './*.xlsx',
        './*.xls'
    ];
    
    for (const pattern of possiblePaths) {
        if (pattern.includes('*')) {
            const dir = pattern.split('/')[0];
            const files = fs.readdirSync(dir || '.').filter(file => 
                file.endsWith('.xlsx') || file.endsWith('.xls')
            );
            if (files.length > 0) {
                return path.join(dir || '.', files[0]);
            }
        } else if (fs.existsSync(pattern)) {
            return pattern;
        }
    }
    
    return null;
}

/**
 * 主翻译函数
 * @param {object} options - 命令行选项
 */
async function translateFiles(options) {
  const startTime = Date.now();
  const workspaceRoot = process.cwd();
  convertExcelToJsonMain();
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

      /**
     * 转义字符串以便在正则表达式中安全使用
     * @param {string} string - 需要转义的字符串
     * @returns {string} 转义后的字符串
     */
    // 辅助函数：将普通字符串转换为正则表达式安全格式（如果尚未定义）
    function escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // 遍历翻译字典，执行替换操作
    for (const [english, chinese] of Object.entries(translations)) {
    
    // 改进1: 处理空格灵活性（如果是多词短语）
    const words = english.split(/\s+/);
    const flexibleEnglish = words.join(`\\s+`); // 使用 `\s+` 匹配至少一个空格，更符合自然语言习惯

    const escapedEnglish = escapeRegExp(flexibleEnglish);
    let replacementCount = 0;

    // 改进2: 构建忽略大小写且能处理空格的正则表达式
    // 使用 `\\b` 单词边界来确保匹配整个单词，避免匹配到部分单词
    const quoteRegex = new RegExp(`(")\\s*${escapedEnglish}\\s*(")`, 'gi'); // 也允许引号内有空格

    let match;
    const matches = [];
    // 使用 while 循环来找出所有匹配项
    while ((match = quoteRegex.exec(content)) !== null) {
        matches.push(match);
    }

    if (matches.length > 0) {
        // 执行替换
        content = content.replace(quoteRegex, `$1${chinese}$2`);
        replacementCount = matches.length;
        fileChanges.push({
            type: 'quoted_text',
            original: english,
            translated: chinese,
            count: matches.length
        });
        console.log(`替换: "${english}" -> "${chinese}" (${matches.length} 次)，模式为 /"\\s*${flexibleEnglish}\\s*"/gi`);
    }   
    fileReplacements += replacementCount;
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
    convertExcelToJsonMain();
  } else {
    convertExcelToJsonMain();
    console.log('📄 翻译字典已更新: translations.json');
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