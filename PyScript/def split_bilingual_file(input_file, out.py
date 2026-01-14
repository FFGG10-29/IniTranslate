import os

def debug_split_bilingual_file(input_file, output_file_odd, output_file_even, expected_encoding='utf-8'):
    """
    增强版双语文件拆分器（带调试信息）
    
    参数:
        input_file: 输入文件路径
        output_file_odd: 奇数行输出（通常为英文）
        output_file_even: 偶数行输出（通常为中文）
        expected_encoding: 预期文件编码
    """
    try:
        if not os.path.exists(input_file):
            print(f"错误：找不到输入文件 {input_file}")
            return False

        odd_lines = []  # 存储奇数行（英文）
        even_lines = [] # 存储偶数行（中文）
        line_count = 0
        actual_line_count = 0  # 实际非空行计数

        print("开始读取文件...")
        with open(input_file, 'r', encoding=expected_encoding, errors='replace') as f:
            for line in f:
                line_count += 1
                cleaned_line = line.strip()
                
                # 跳过完全空白的行（可选）
                if not cleaned_line:
                    print(f"第{line_count}行为空，已跳过")
                    continue
                
                actual_line_count += 1
                if actual_line_count % 2 == 1:  # 实际奇数行 -> 英文
                    odd_lines.append(cleaned_line)
                    print(f"行{line_count} -> 英文: {cleaned_line[:50]}...")  # 预览前50字符
                else:  # 实际偶数行 -> 中文
                    even_lines.append(cleaned_line)
                    print(f"行{line_count} -> 中文: {cleaned_line[:50]}...")
        
        print(f"\n读取完成。总行数: {line_count}, 非空行数: {actual_line_count}")
        print(f"识别出英文行: {len(odd_lines)}, 中文行: {len(even_lines)}")

        # 写入英文文件（奇数行）
        with open(output_file_odd, 'w', encoding='utf-8') as f:
            f.write('\n'.join(odd_lines))
        print(f"英文行已写入: {output_file_odd}")

        # 写入中文文件（偶数行）
        with open(output_file_even, 'w', encoding='utf-8') as f:
            f.write('\n'.join(even_lines))
        print(f"中文行已写入: {output_file_even}")

        # 验证结果
        if len(odd_lines) == 0 and len(even_lines) == 0:
            print("警告：未处理任何有效行，请检查文件内容或编码")
        elif len(odd_lines) == 0:
            print("警告：英文文件为空，可能所有行被误判为中文行")
        elif len(even_lines) == 0:
            print("警告：中文文件为空，可能所有行被误判为英文行")
        else:
            print("✅ 文件拆分成功！")

        return True

    except Exception as e:
        print(f"处理文件时出错: {e}")
        return False

# 使用示例
if __name__ == "__main__":
    input_file = "B:\\Desktop\\my_translation_pairs.txt"  # 请修改为您的文件路径
    output_english = "B:\\Desktop\\english_lines.txt"
    output_chinese = "B:\\Desktop\\chinese_lines.txt"
    
    # 尝试常见编码（如果UTF-8失败）
    encodings_to_try = ['utf-8', 'gbk', 'utf-16']
    
    for encoding in encodings_to_try:
        print(f"\n尝试编码: {encoding}")
        success = debug_split_bilingual_file(input_file, output_english, output_chinese, encoding)
        if success:
            break
    else:
        print("所有编码尝试均失败，请检查文件格式")