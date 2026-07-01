import os
import traceback
from enum import Enum

import gradio as gr

from gui.asset_components import AssetComponentsUtils
from gui.ui_abstract_component import AbstractComponentUI
from gui.ui_components_html import GradioComponentsHTML
from shortGPT.audio.edge_voice_module import EdgeTTSVoiceModule
from shortGPT.audio.eleven_voice_module import ElevenLabsVoiceModule
from shortGPT.config.api_db import ApiKeyManager
from shortGPT.config.languages import (EDGE_TTS_VOICENAME_MAPPING,
                                        ELEVEN_SUPPORTED_LANGUAGES,
                                        LANGUAGE_ACRONYM_MAPPING,
                                        Language)
from shortGPT.engine.content_video_engine import ContentVideoEngine
from shortGPT.gpt import gpt_chat_video


class Chatstate(Enum):
    ASK_ORIENTATION = 1
    ASK_VOICE_MODULE = 2
    ASK_LANGUAGE = 3
    ASK_DESCRIPTION = 4
    GENERATE_SCRIPT = 5
    ASK_SATISFACTION = 6
    MAKE_VIDEO = 7
    ASK_CORRECTION = 8


class VideoAutomationUI(AbstractComponentUI):
    def __init__(self, shortGptUI: gr.Blocks):
        self.shortGptUI = shortGptUI
        self.state = Chatstate.ASK_ORIENTATION
        self.isVertical = None
        self.voice_module = None
        self.language = None
        self.script = ""
        self.video_html = ""
        self.videoVisible = False
        self.video_automation = None
        self.chatbot = None
        self.msg = None
        self.restart_button = None
        self.video_folder = None
        self.errorHTML = None
        self.outHTML = None

    def is_key_missing(self):
        openrouter_key = ApiKeyManager.get_api_key("OPENROUTER_API_KEY")
        if not openrouter_key:
            return "Отсутствует ключ OpenRouter. Откройте вкладку «Настройки» и введите ключ API."

        pexels_api_key = ApiKeyManager.get_api_key("PEXELS_API_KEY")
        if not pexels_api_key:
            return "Отсутствует ключ Pexels API. Откройте вкладку «Настройки» и введите ключ API."

    def generate_script(self, message, language):
        return gpt_chat_video.generateScript(message, language)

    def correct_script(self, script, correction):
        return gpt_chat_video.correctScript(script, correction)

    def make_video(self, script, voice_module, isVertical, progress):
        videoEngine = ContentVideoEngine(voiceModule=voice_module, script=script, isVerticalFormat=isVertical)
        num_steps = videoEngine.get_total_steps()
        progress_counter = 0

        def logger(prog_str):
            progress(progress_counter / (num_steps), f"Creating video - {progress_counter} - {prog_str}")
        videoEngine.set_logger(logger)
        for step_num, step_info in videoEngine.makeContent():
            progress(progress_counter / (num_steps), f"Creating video - {step_info}")
            progress_counter += 1

        video_path = videoEngine.get_video_output_path()
        return video_path

    def reset_components(self):
        return gr.update(value=self.initialize_conversation()), gr.update(visible=True), gr.update(value="", visible=False), gr.update(value="", visible=False)

    def chatbot_conversation(self):
        def respond(message, chat_history, progress=gr.Progress()):
            # global self.state, isVertical, voice_module, language, script, videoVisible, video_html
            error_html = ""
            errorVisible = False
            inputVisible = True
            folderVisible = False
            if self.state == Chatstate.ASK_ORIENTATION:
                errorMessage = self.is_key_missing()
                if errorMessage:
                    bot_message = errorMessage
                else:
                    self.isVertical = "vertical" in message.lower() or "short" in message.lower() or "верт" in message.lower() or "шорт" in message.lower()
                    self.state = Chatstate.ASK_VOICE_MODULE
                    bot_message = "Какой движок озвучки использовать? Напишите «ElevenLabs» — высокое качество, «EdgeTTS» — бесплатно, среднее качество."
            elif self.state == Chatstate.ASK_VOICE_MODULE:
                if "elevenlabs" in message.lower() or "eleven" in message.lower():
                    eleven_labs_key = ApiKeyManager.get_api_key("ELEVENLABS_API_KEY")
                    if not eleven_labs_key:
                        bot_message = "Отсутствует ключ ElevenLabs API. Откройте вкладку «Настройки» и введите ключ API."
                        return
                    self.voice_module = ElevenLabsVoiceModule
                    language_choices = [lang.value for lang in ELEVEN_SUPPORTED_LANGUAGES]
                elif "edgetts" in message.lower() or "edge" in message.lower():
                    self.voice_module = EdgeTTSVoiceModule
                    language_choices = [lang.value for lang in Language]
                else:
                    bot_message = "Не удалось распознать движок. Напишите «ElevenLabs» или «EdgeTTS»."
                    return
                self.state = Chatstate.ASK_LANGUAGE
                bot_message = f"🌐 На каком языке будет видео? Выберите один из вариантов ({', '.join(language_choices)})"
            elif self.state == Chatstate.ASK_LANGUAGE:
                self.language = next((lang for lang in Language if lang.value.lower() in message.lower()), None)
                self.language = self.language if self.language else Language.ENGLISH
                if self.voice_module == ElevenLabsVoiceModule:
                    self.voice_module = ElevenLabsVoiceModule(ApiKeyManager.get_api_key('ELEVENLABS_API_KEY'), "Chris", checkElevenCredits=True)
                elif self.voice_module == EdgeTTSVoiceModule:
                    self.voice_module = EdgeTTSVoiceModule(EDGE_TTS_VOICENAME_MAPPING[self.language]['male'])
                self.state = Chatstate.ASK_DESCRIPTION
                bot_message = "Отлично 🔥! 📝 Опишите подробно тему вашего видео — я сгенерирую сценарий по этому описанию."
            elif self.state == Chatstate.ASK_DESCRIPTION:
                self.script = self.generate_script(message, self.language.value)
                self.state = Chatstate.ASK_SATISFACTION
                bot_message = f"📝 Вот сгенерированный сценарий:\n\n--------------\n{self.script}\n\n・Устраивает сценарий? Готовы приступить к созданию видео? Ответьте «ДА» или «НЕТ». 👍👎"
            elif self.state == Chatstate.ASK_SATISFACTION:
                if "yes" in message.lower() or "да" in message.lower():
                    self.state = Chatstate.MAKE_VIDEO
                    inputVisible = False
                    yield gr.update(visible=False), gr.update(value=[[None, "Ваше видео создаётся! 🎬"]]), gr.update(value="", visible=False), gr.update(value=error_html, visible=errorVisible), gr.update(visible=folderVisible), gr.update(visible=False)
                    try:
                        video_path = self.make_video(self.script, self.voice_module, self.isVertical, progress=progress)
                        file_name = video_path.split("/")[-1].split("\\")[-1]
                        current_url = self.shortGptUI.share_url+"/" if self.shortGptUI.share else self.shortGptUI.local_url
                        file_url_path = f"{current_url}gradio_api/file={video_path}"
                        self.video_html = f'''
                            <div style="display: flex; flex-direction: column; align-items: center;">
                                <video width="{600}" height="{300}" style="max-height: 100%; border-radius: 12px;" controls>
                                    <source src="{file_url_path}" type="video/mp4">
                                    Ваш браузер не поддерживает тег video.
                                </video>
                                <a href="{file_url_path}" download="{file_name}" style="margin-top: 12px; text-decoration:none;">
                                    <button style="font-size: 1em; padding: 10px 18px; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; color: #1A1205; background: linear-gradient(150deg,#FFC15A,#F6A623);">Скачать видео</button>
                                </a>
                            </div>'''
                        self.videoVisible = True
                        folderVisible = True
                        bot_message = "Видео готово! 🎬 Прокрутите вниз, чтобы открыть папку с файлом."
                    except Exception as e:
                        traceback_str = ''.join(traceback.format_tb(e.__traceback__))
                        error_name = type(e).__name__.capitalize() + " : " + f"{e.args[0]}"
                        errorVisible = True
                        gradio_content_automation_ui_error_template = GradioComponentsHTML.get_html_error_template()
                        error_html = gradio_content_automation_ui_error_template.format(error_message=error_name, stack_trace=traceback_str)
                        bot_message = "При создании видео произошла ошибка ❌"
                        print("Error", traceback_str)
                        yield gr.update(visible=False), gr.update(value=[[None, "Ваше видео создаётся! 🎬"]]), gr.update(value="", visible=False), gr.update(value=error_html, visible=errorVisible), gr.update(visible=folderVisible), gr.update(visible=True)

                else:
                    self.state = Chatstate.ASK_CORRECTION  # change self.state to ASK_CORRECTION
                    bot_message = "Опишите, что нужно изменить в сценарии"
            elif self.state == Chatstate.ASK_CORRECTION:  # new self.state
                self.script = self.correct_script(self.script, message)  # call generateScript with correct=True
                self.state = Chatstate.ASK_SATISFACTION
                bot_message = f"📝 Вот исправленный сценарий:\n\n--------------\n{self.script}\n\n・Устраивает сценарий? Готовы приступить к созданию видео? Ответьте «ДА» или «НЕТ». 👍👎"
            chat_history.append((message, bot_message))
            yield gr.update(value="", visible=inputVisible), gr.update(value=chat_history), gr.update(value=self.video_html, visible=self.videoVisible), gr.update(value=error_html, visible=errorVisible), gr.update(visible=folderVisible), gr.update(visible=True)

        return respond

    def initialize_conversation(self):
        self.state = Chatstate.ASK_ORIENTATION
        self.isVertical = None
        self.language = None
        self.script = ""
        self.video_html = ""
        self.videoVisible = False
        return [[None, "🤖 Добро пожаловать в ShortGPT! 🚀 Я помогу автоматизировать создание и монтаж видео.\nНачнём! 🎥🎬\n\nКакой формат видео нужен — горизонтальный или вертикальный? (горизонтальное ИЛИ вертикальное)"]]

    def reset_conversation(self):
        self.state = Chatstate.ASK_ORIENTATION
        self.isVertical = None
        self.language = None
        self.script = ""
        self.video_html = ""
        self.videoVisible = False

    def create_ui(self):
        with gr.Row(visible=False) as self.video_automation:
            with gr.Column():
                self.chatbot = gr.Chatbot(self.initialize_conversation, height=365, label="Диалог")
                self.msg = gr.Textbox(placeholder="Введите сообщение и нажмите Enter…", label="Ваше сообщение")
                self.restart_button = gr.Button("Начать заново")
                self.video_folder = gr.Button("📁", visible=False)
                self.video_folder.click(lambda _: AssetComponentsUtils.start_file(os.path.abspath("videos/")))
                respond = self.chatbot_conversation()

            self.errorHTML = gr.HTML(visible=False)
            self.outHTML = gr.HTML('<div style="min-height: 80px;"></div>')
            self.restart_button.click(self.reset_components, [], [self.chatbot, self.msg, self.errorHTML, self.outHTML])
            self.restart_button.click(self.reset_conversation, [])
            self.msg.submit(respond, [self.msg, self.chatbot], [self.msg, self.chatbot, self.outHTML, self.errorHTML, self.video_folder, self.restart_button])
        return self.video_automation
