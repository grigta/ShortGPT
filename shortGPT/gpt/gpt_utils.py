import json
import os
import re
from time import sleep, time

import openai
import tiktoken
import yaml

from shortGPT.config.api_db import ApiKeyManager


def num_tokens_from_messages(texts, model=None):
    """Универсальная приблизительная оценка числа токенов.

    Модели OpenRouter используют разные токенизаторы, поэтому берём
    общий cl100k_base как достаточно точное приближение для любой модели.
    """
    try:
        encoding = tiktoken.get_encoding("cl100k_base")
    except Exception:
        if isinstance(texts, str):
            texts = [texts]
        return sum(len(t) // 4 + 4 for t in texts)
    if isinstance(texts, str):
        texts = [texts]
    return sum(4 + len(encoding.encode(text)) for text in texts)


def extract_biggest_json(string):
    json_regex = r"\{(?:[^{}]|(?R))*\}"
    json_objects = re.findall(json_regex, string)
    if json_objects:
        return max(json_objects, key=len)
    return None


def get_first_number(string):
    pattern = r'\b(0|[1-9]|10)\b'
    match = re.search(pattern, string)
    if match:
        return int(match.group())
    else:
        return None


def load_yaml_file(file_path: str) -> dict:
    """Reads and returns the contents of a YAML file as dictionary"""
    return yaml.safe_load(open_file(file_path))


def load_json_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        json_data = json.load(f)
    return json_data

from pathlib import Path

def load_local_yaml_prompt(file_path):
    _here = Path(__file__).parent
    _absolute_path = (_here / '..' / file_path).resolve()
    json_template = load_yaml_file(str(_absolute_path))
    return json_template['chat_prompt'], json_template['system_prompt']


def open_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as infile:
        return infile.read()
from shortGPT.gpt import openrouter


def llm_completion(chat_prompt="", system="", temp=0.7, max_tokens=2000, remove_nl=True, conversation=None, model=None):
    """Запрос к выбранной модели OpenRouter.

    Модель по умолчанию берётся из настроек (выбранная пользователем), но её
    можно переопределить аргументом ``model``. Лимит вывода адаптируется под
    ограничения конкретной модели, если они известны.
    """
    client = openrouter.get_client()
    model = model or openrouter.get_selected_model()
    info = openrouter.get_model_info(model) or {}
    max_completion = info.get("max_completion")
    if max_completion:
        max_tokens = min(max_tokens, int(max_completion))
    max_retry = 5
    retry = 0
    error = ""
    for i in range(max_retry):
        try:
            if conversation:
                messages = conversation
            else:
                messages = [
                    {"role": "system", "content": system},
                    {"role": "user", "content": chat_prompt}
                ]
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temp,
                timeout=60
                )
            text = response.choices[0].message.content.strip()
            if remove_nl:
                text = re.sub('\s+', ' ', text)
            filename = '%s_llm_completion.txt' % time()
            if not os.path.exists('.logs/gpt_logs'):
                os.makedirs('.logs/gpt_logs')
            with open('.logs/gpt_logs/%s' % filename, 'w', encoding='utf-8') as outfile:
                outfile.write(f"System prompt: ===\n{system}\n===\n"+f"Chat prompt: ===\n{chat_prompt}\n===\n" + f'RESPONSE:\n====\n{text}\n===\n')
            return text
        except Exception as oops:
            retry += 1
            print('Ошибка запроса к OpenRouter:', oops)
            error = str(oops)
            sleep(1)
    raise Exception(f"Не удалось получить ответ от модели OpenRouter. Последняя ошибка: {error}")