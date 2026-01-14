import configparser
from collections import OrderedDict

def parse_ini_with_line_numbers(file_path):
    """
    解析INI文件，并记录每个配置项出现的起始行号。
    返回一个有序字典，结构为：{section: {key: (value, line_number)}}
    """
    config_dict = OrderedDict()
    current_section = None
    line_number = 0

    with open(file_path, 'r', encoding='utf-8') as file:
        for line in file:
            line_number += 1
            stripped_line = line.strip()

            # 跳过空行和注释
            if not stripped_line:
                continue

            # 检查是否是节（Section）
            if stripped_line.startswith('[') and stripped_line.endswith(']'):
                current_section = stripped_line[1:-1]
                config_dict[current_section] = OrderedDict()
                continue

            # 处理键值对
            if current_section is not None and '=' in stripped_line:
                key, value = stripped_line.split('=', 1)
                key = key.strip()
                value = value.strip()
                # 记录当前行号为该配置项的位置
                config_dict[current_section][key] = (value, line_number)

    return config_dict

def extract_translation_pairs(orig_file, trans_file):
    """
    对比两个INI文件，提取翻译键值对及行号信息。
    
    参数:
        orig_file (str): 原始（英文）INI文件路径。
        trans_file (str): 翻译后（中文）INI文件路径。
        
    返回:
        dict: 一个字典，格式为 {line_range: {"key": key, "en": original_value, "zh": translated_value}}
    """
    orig_config = parse_ini_with_line_numbers(orig_file)
    trans_config = parse_ini_with_line_numbers(trans_file)
    
    translation_dict = {}

    # 遍历原始配置中的所有节和键
    for section in orig_config:
        if section not in trans_config:
            print(f"警告：节 '[{section}]' 在翻译文件中不存在，已跳过。")
            continue

        for key, (orig_val, orig_line) in orig_config[section].items():
            if key not in trans_config[section]:
                print(f"警告：键 '{key}' 在节 '[{section}]' 的翻译文件中不存在，已跳过。")
                continue

            trans_val, trans_line = trans_config[section][key]

            # 如果值不同，则认为是翻译对
            if orig_val != trans_val:
                # 使用行号范围作为字典的键，例如 "277-290"
                line_range_key = f"{orig_line}-{trans_line}"
                translation_dict[line_range_key] = {
                    "key": key,
                    "en": orig_val,
                    "zh": trans_val
                }

    return translation_dict

def save_translation_dict(trans_dict, output_file="translation_pairs.txt"):
    """
    将提取的翻译字典保存到文本文件，格式便于查阅。
    """
    with open(output_file, 'w', encoding='utf-8') as f:
        for line_range, pair in trans_dict.items():
            f.write(f"{line_range}：{pair['key']} = {pair['en']}, {pair['zh']}\n")

# 使用示例
if __name__ == "__main__":
    original_ini = "B:\\Desktop\\rusefi_proteus_f4-or.ini"    # 请替换为您的原始文件路径
    translated_ini = "B:\\Desktop\\rusefi_proteus_f4tr.ini" # 请替换为您的翻译文件路径
    output_txt = "my_translation_pairs.txt"

    try:
        print("正在解析文件并提取翻译对...")
        my_translations = extract_translation_pairs(original_ini, translated_ini)
        print(f"成功提取 {len(my_translations)} 条翻译记录。")

        save_translation_dict(my_translations, output_txt)
        print(f"翻译字典已保存至: {output_txt}")

        # 在控制台预览前几条记录
        print("\n预览前几条记录:")
        count = 0
        for line_range, pair in my_translations.items():
            if count >= 5:  # 只预览5条
                break
            print(f"{line_range}：{pair['key']}")
            print(f"  EN: {pair['en']}")
            print(f"  ZH: {pair['zh']}\n")
            count += 1

    except FileNotFoundError as e:
        print(f"错误：文件未找到 - {e}")
    except Exception as e:
        print(f"处理过程中出现错误: {e}")