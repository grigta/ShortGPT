import os
import time
import traceback

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
from shortGPT.engine.facts_short_engine import FactsShortEngine
from shortGPT.engine.reddit_short_engine import RedditShortEngine
class ShortAutomationUI(AbstractComponentUI):
    def __init__(self, shortGptUI: gr.Blocks):
        self.shortGptUI = shortGptUI
        self.embedHTML = '<div style="display: flex; overflow-x: auto; gap: 20px;">'
        self.progress_counter = 0
        self.short_automation = None

    def create_ui(self):
        with gr.Row(visible=False) as short_automation:
            with gr.Column():
                numShorts = gr.Number(label="Количество роликов", minimum=1, value=1)
                short_type = gr.Radio([("Истории с Reddit", "Reddit Story shorts"), ("Исторические факты", "Historical Facts shorts"), ("Научные факты", "Scientific Facts shorts"), ("Свои факты (своя тема)", "Custom Facts shorts")], label="Тип роликов", value="Reddit Story shorts", interactive=True)
                facts_subject = gr.Textbox(label="Тема для фактов (например: Факты о футболе)", interactive=True, visible=False)
                short_type.change(lambda x: gr.update(visible=x == "Custom Facts shorts"), [short_type], [facts_subject])
                tts_engine = gr.Radio([AssetComponentsUtils.ELEVEN_TTS, AssetComponentsUtils.EDGE_TTS], label="Движок озвучки (TTS)", value=AssetComponentsUtils.EDGE_TTS, interactive=True)
                self.tts_engine = tts_engine.value
                with gr.Column(visible=False) as eleven_tts:
                    language_eleven = gr.Radio([lang.value for lang in ELEVEN_SUPPORTED_LANGUAGES], label="Язык", value="English", interactive=True)
                    voice_eleven = AssetComponentsUtils.voiceChoice(provider=AssetComponentsUtils.ELEVEN_TTS)
                with gr.Column(visible=True) as edge_tts:
                    language_edge = gr.Dropdown([lang.value.upper() for lang in Language], label="Язык", value="ENGLISH", interactive=True)
                def tts_engine_change(x):
                    self.tts_engine = x
                    return gr.update(visible=x == AssetComponentsUtils.ELEVEN_TTS), gr.update(visible=x == AssetComponentsUtils.EDGE_TTS)
                tts_engine.change(tts_engine_change, tts_engine, [eleven_tts, edge_tts])

                useImages = gr.Checkbox(label="Использовать изображения", value=True)
                numImages = gr.Radio([5, 10, 25], value=10, label="Количество изображений на ролик", visible=True, interactive=True)
                useImages.change(lambda x: gr.update(visible=x), useImages, numImages)

                addWatermark = gr.Checkbox(label="Добавить водяной знак")
                watermark = gr.Textbox(label="Водяной знак (название канала)", visible=False)
                addWatermark.change(lambda x: gr.update(visible=x), [addWatermark], [watermark])

                AssetComponentsUtils.background_video_checkbox()
                AssetComponentsUtils.background_music_checkbox()
                createButton = gr.Button("Создать ролики", variant="primary")

                generation_error = gr.HTML(visible=False)
                video_folder = gr.Button("📁", visible=True)
                output = gr.HTML('<div style="min-height: 80px;"></div>')

            video_folder.click(lambda _: AssetComponentsUtils.start_file(os.path.abspath("videos/")))

            createButton.click(self.inspect_create_inputs, inputs=[AssetComponentsUtils.background_video_checkbox(), AssetComponentsUtils.background_music_checkbox(), watermark, short_type, facts_subject], outputs=[generation_error]).success(self.create_short, inputs=[
                numShorts,
                short_type,
                tts_engine,
                language_eleven,
                language_edge,
                numImages,
                watermark,
                AssetComponentsUtils.background_video_checkbox(),
                AssetComponentsUtils.background_music_checkbox(),
                facts_subject,
                voice_eleven,
            ], outputs=[output, video_folder, generation_error])
        self.short_automation = short_automation
        return self.short_automation

    def create_short(self, numShorts, short_type, tts_engine, language_eleven, language_edge, numImages, watermark, background_video_list, background_music_list, facts_subject, voice_eleven, progress=gr.Progress()):
        '''Creates a short'''

        try:
            numShorts = int(numShorts)
            numImages = int(numImages) if numImages else None
            background_videos = (background_video_list * ((numShorts // len(background_video_list)) + 1))[:numShorts]
            background_musics = (background_music_list * ((numShorts // len(background_music_list)) + 1))[:numShorts]
            if tts_engine == AssetComponentsUtils.ELEVEN_TTS:
                language = Language(language_eleven.lower().capitalize())
                voice_module = ElevenLabsVoiceModule(ApiKeyManager.get_api_key('ELEVENLABS_API_KEY'), voice_eleven, checkElevenCredits=True)
            elif tts_engine == AssetComponentsUtils.EDGE_TTS:
                language = Language(language_edge.lower().capitalize())
                voice_module = EdgeTTSVoiceModule(EDGE_TTS_VOICENAME_MAPPING[language]['male'])
            for i in range(numShorts):
                shortEngine = self.create_short_engine(short_type=short_type, voice_module=voice_module, language=language, numImages=numImages, watermark=watermark,
                                                       background_video=background_videos[i], background_music=background_musics[i], facts_subject=facts_subject)
                num_steps = shortEngine.get_total_steps()

                def logger(prog_str):
                    progress(self.progress_counter / (num_steps * numShorts), f"Создаю ролик {i+1}/{numShorts} — {prog_str}")
                shortEngine.set_logger(logger)

                for step_num, step_info in shortEngine.makeContent():
                    print(step_num, step_info,self.progress_counter )
                    progress(self.progress_counter / (num_steps * numShorts), f"Создаю ролик {i+1}/{numShorts} — {step_info}")
                    self.progress_counter += 1

                video_path = shortEngine.get_video_output_path()
                current_url = self.shortGptUI.share_url+"/" if self.shortGptUI.share else self.shortGptUI.local_url
                file_url_path = f"{current_url}gradio_api/file={video_path}"
                file_name = video_path.split("/")[-1].split("\\")[-1]
                self.embedHTML += f'''
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <video width="{250}" height="{500}" style="max-height: 100%; border-radius: 12px;" controls>
                        <source src="{file_url_path}" type="video/mp4">
                        Ваш браузер не поддерживает тег video.
                    </video>
                    <a href="{file_url_path}" download="{file_name}" style="margin-top: 12px; text-decoration:none;">
                        <button style="font-size: 1em; padding: 10px 18px; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; color: #1A1205; background: linear-gradient(150deg,#FFC15A,#F6A623);">Скачать видео</button>
                    </a>
                </div>'''
                yield self.embedHTML + '</div>', gr.update(visible=True), gr.update(visible=False)
        except Exception as e:
            traceback_str = ''.join(traceback.format_tb(e.__traceback__))
            error_name = type(e).__name__.capitalize() + " : " + f"{e.args[0]}"
            print("Error", traceback_str)
            error_html = GradioComponentsHTML.get_html_error_template().format(error_message=error_name, stack_trace=traceback_str)
            yield self.embedHTML + '</div>', gr.update(visible=True), gr.update(value=error_html, visible=True)
    def inspect_create_inputs(self, background_video_list, background_music_list, watermark, short_type, facts_subject, progress=gr.Progress()):
        if short_type == "Custom Facts shorts":
            if not facts_subject:
                raise gr.Error("Укажите тему для роликов с фактами")
        if not background_video_list:
            raise gr.Error("Выберите хотя бы одно фоновое видео.")

        if not background_music_list:
            raise gr.Error("Выберите хотя бы одну фоновую музыку.")

        if watermark != "":
            if not watermark.replace(" ", "").isalnum():
                raise gr.Error("Водяной знак может содержать только буквы и цифры.")
            if len(watermark) > 25:
                raise gr.Error("Водяной знак не должен превышать 25 символов.")
            if len(watermark) < 3:
                raise gr.Error("Водяной знак должен содержать минимум 3 символа.")

        openrouter_key = ApiKeyManager.get_api_key("OPENROUTER_API_KEY")
        if not openrouter_key:
            raise gr.Error("Отсутствует ключ OpenRouter API. Откройте вкладку «Настройки» и введите ключ.")
        eleven_labs_key = ApiKeyManager.get_api_key("ELEVENLABS_API_KEY")
        if self.tts_engine == AssetComponentsUtils.ELEVEN_TTS and not eleven_labs_key:
            raise gr.Error("Отсутствует ключ ElevenLabs API. Откройте вкладку «Настройки» и введите ключ.")
        return gr.update(visible=False)

    def create_short_engine(self, short_type, voice_module, language, numImages, watermark, background_video, background_music, facts_subject):
        if short_type == "Reddit Story shorts":
            return RedditShortEngine(voice_module, background_video_name=background_video, background_music_name=background_music, num_images=numImages, watermark=watermark, language=language)
        if "fact" in short_type.lower():
            if "custom" in short_type.lower():
                facts_subject = facts_subject
            else:
                facts_subject = short_type
            return FactsShortEngine(voice_module, facts_type=facts_subject, background_video_name=background_video, background_music_name=background_music, num_images=numImages, watermark=watermark, language=language)
        raise gr.Error(f"Для этого типа роликов нет подходящего движка: {short_type}")
