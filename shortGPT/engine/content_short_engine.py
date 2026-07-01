import datetime
import os
import re
import shutil
from abc import abstractmethod

from shortGPT.audio import audio_utils
from shortGPT.audio.audio_duration import get_asset_duration
from shortGPT.audio.voice_module import VoiceModule
from shortGPT.config.asset_db import AssetDatabase
from shortGPT.config.languages import Language
from shortGPT.editing_framework.editing_engine import (EditingEngine,
                                                       EditingStep)
from shortGPT.editing_utils import captions, editing_images
from shortGPT.editing_utils.handle_videos import extract_random_clip_from_video
from shortGPT.engine.abstract_content_engine import AbstractContentEngine
from shortGPT.gpt import gpt_editing, gpt_translate, gpt_yt


class ContentShortEngine(AbstractContentEngine):

    def __init__(self, short_type: str, background_video_name: str, background_music_name: str, voiceModule: VoiceModule, short_id="",
                 num_images=None, watermark=None, language: Language = Language.ENGLISH, image_source: str = "auto"):
        super().__init__(short_id, short_type, language, voiceModule)
        if not short_id:
            if (num_images):
                self._db_num_images = num_images
            if (watermark):
                self._db_watermark = watermark
            # Фон опционален: без него ролик собирается из канваса + картинок + субтитров.
            self._db_background_video_name = background_video_name
            self._db_background_music_name = background_music_name
            # "generate" — картинки через image-модель OpenRouter,
            # "search" — поиск в интернете, "auto" — по наличию выбранной модели.
            self._db_image_source = image_source

        self.stepDict = {
            1:  self._generateScript,
            2:  self._generateTempAudio,
            3:  self._speedUpAudio,
            4:  self._timeCaptions,
            5:  self._generateImageSearchTerms,
            6:  self._generateImageUrls,
            7:  self._chooseBackgroundMusic,
            8:  self._chooseBackgroundVideo,
            9:  self._prepareBackgroundAssets,
            10: self._prepareCustomAssets,
            11: self._editAndRenderShort,
            12: self._addYoutubeMetadata
        }

    @abstractmethod
    def _generateScript(self):
        self._db_script = ""

    def _generateTempAudio(self):
        if not self._db_script:
            raise NotImplementedError("generateScript method must set self._db_script.")
        if (self._db_temp_audio_path):
            return
        self.verifyParameters(text=self._db_script)
        script = self._db_script
        if (self._db_language != Language.ENGLISH.value):
            self._db_translated_script = gpt_translate.translateContent(script, self._db_language)
            script = self._db_translated_script
        self._db_temp_audio_path = self.voiceModule.generate_voice(
            script, self.dynamicAssetDir + "temp_audio_path.wav")

    def _speedUpAudio(self):
        if (self._db_audio_path):
            return
        self.verifyParameters(tempAudioPath=self._db_temp_audio_path)
        self._db_audio_path = audio_utils.speedUpAudio(
            self._db_temp_audio_path, self.dynamicAssetDir+"audio_voice.wav")

    def _timeCaptions(self):
        self.verifyParameters(audioPath=self._db_audio_path)
        whisper_analysis = audio_utils.audioToText(self._db_audio_path)
        self._db_timed_captions = captions.getCaptionsWithTime(
            whisper_analysis)

    def _generateImageSearchTerms(self):
        self.verifyParameters(captionsTimed=self._db_timed_captions)
        if self._db_num_images:
            self._db_timed_image_searches = gpt_editing.getImageQueryPairs(
                self._db_timed_captions, n=self._db_num_images)

    def _generateImageUrls(self):
        if self._db_timed_image_searches:
            use_generation = {"generate": True, "search": False}.get(self._db_image_source)
            self._db_timed_image_urls = editing_images.getImageUrlsTimed(
                self._db_timed_image_searches, use_generation=use_generation)

    def _chooseBackgroundMusic(self):
        if self._db_background_music_name:
            self._db_background_music_url = AssetDatabase.get_asset_link(self._db_background_music_name)

    def _chooseBackgroundVideo(self):
        if self._db_background_video_name:
            self._db_background_video_url = AssetDatabase.get_asset_link(
                self._db_background_video_name)
            self._db_background_video_duration = AssetDatabase.get_asset_duration(
                self._db_background_video_name)

    def _prepareBackgroundAssets(self):
        self.verifyParameters(voiceover_audio_url=self._db_audio_path)
        if not self._db_voiceover_duration:
            self.logger("Rendering short: (1/4) preparing voice asset...")
            self._db_audio_path, self._db_voiceover_duration = get_asset_duration(
                self._db_audio_path, isVideo=False)
        if self._db_background_video_name and not self._db_background_trimmed:
            self.verifyParameters(
                video_duration=self._db_background_video_duration,
                background_video_url=self._db_background_video_url)
            self.logger("Rendering short: (2/4) preparing background video asset...")
            self._db_background_trimmed = extract_random_clip_from_video(
                self._db_background_video_url, self._db_background_video_duration, self._db_voiceover_duration, self.dynamicAssetDir + "clipped_background.mp4")

    def _prepareCustomAssets(self):
        self.logger("Rendering short: (3/4) preparing custom assets...")
        if not self._db_background_video_name and not self._db_canvas_path:
            # Без фонового видео базовый слой — тёмный канвас 1080x1920.
            from PIL import Image
            canvas_path = self.dynamicAssetDir + "canvas.png"
            Image.new("RGB", (1080, 1920), (13, 16, 23)).save(canvas_path)
            self._db_canvas_path = canvas_path

    def _pickCaptionFont(self):
        """LuckiestGuy не содержит кириллицы — Pillow молча рисует пустые глифы.
        Определяем алфавит по тексту субтитров, а не по метке языка."""
        sample = " ".join(text for _, text in (self._db_timed_captions or [])[:8])
        if re.search(r"[а-яА-ЯёЁ]", sample):
            return "fonts/ObelixProB-cyr.ttf"
        return None

    def _editAndRenderShort(self):
        self.verifyParameters(voiceover_audio_url=self._db_audio_path)
        if self._db_background_video_name:
            self.verifyParameters(video_duration=self._db_background_video_duration)

        outputPath = self.dynamicAssetDir+"rendered_video.mp4"
        if not (os.path.exists(outputPath)):
            self.logger("Rendering short: Starting automated editing...")
            videoEditor = EditingEngine()
            videoEditor.addEditingStep(EditingStep.ADD_VOICEOVER_AUDIO, {
                                       'url': self._db_audio_path})
            if self._db_background_music_url:
                videoEditor.addEditingStep(EditingStep.ADD_BACKGROUND_MUSIC, {'url': self._db_background_music_url,
                                                                              'loop_background_music': self._db_voiceover_duration,
                                                                              "volume_percentage": 0.11})
            if self._db_background_video_name:
                videoEditor.addEditingStep(EditingStep.CROP_1920x1080, {
                                           'url': self._db_background_trimmed})
            else:
                videoEditor.addEditingStep(EditingStep.SHOW_CANVAS, {'url': self._db_canvas_path,
                                                                     'set_time_start': 0,
                                                                     'set_time_end': self._db_voiceover_duration})
            videoEditor.addEditingStep(EditingStep.ADD_SUBSCRIBE_ANIMATION, {'url': AssetDatabase.get_asset_link('subscribe animation')})

            caption_font = self._pickCaptionFont()

            if self._db_watermark:
                watermark_args = {'text': self._db_watermark}
                if re.search(r"[а-яА-ЯёЁ]", self._db_watermark):
                    watermark_args['font'] = "fonts/ObelixProB-cyr.ttf"
                videoEditor.addEditingStep(EditingStep.ADD_WATERMARK, watermark_args)

            caption_type = EditingStep.ADD_CAPTION_SHORT_ARABIC if self._db_language == Language.ARABIC.value else EditingStep.ADD_CAPTION_SHORT
            for timing, text in self._db_timed_captions:
                caption_args = {'text': text.upper(),
                                'set_time_start': timing[0],
                                'set_time_end': timing[1]}
                if caption_font and caption_type == EditingStep.ADD_CAPTION_SHORT:
                    caption_args['font'] = caption_font
                videoEditor.addEditingStep(caption_type, caption_args)
            if self._db_num_images:
                # Без фонового видео картинки — главный визуал, показываем крупно по центру.
                image_step = EditingStep.SHOW_IMAGE if self._db_background_video_name else EditingStep.SHOW_IMAGE_CENTERED
                for timing, image_url in self._db_timed_image_urls:
                    videoEditor.addEditingStep(image_step, {'url': image_url,
                                                            'set_time_start': timing[0],
                                                            'set_time_end': timing[1]})
            print("***** SCHEMA FOR RENDERING ****")
            print(videoEditor.dumpEditingSchema())
            print("***** SCHEMA FOR RENDERING ****")
            videoEditor.renderVideo(outputPath, logger= self.logger if self.logger is not self.default_logger else None)

        self._db_video_path = outputPath

    def _addYoutubeMetadata(self):
        if not os.path.exists('videos/'):
            os.makedirs('videos')
        self._db_yt_title, self._db_yt_description = gpt_yt.generate_title_description_dict(self._db_script)

        now = datetime.datetime.now()
        date_str = now.strftime("%Y-%m-%d_%H-%M-%S")
        newFileName = f"videos/{date_str} - " + \
            re.sub(r"[^a-zA-Z0-9а-яА-ЯёЁ '\n\.]", '', self._db_yt_title)

        shutil.move(self._db_video_path, newFileName+".mp4")
        with open(newFileName+".txt", "w", encoding="utf-8") as f:
            f.write(
                f"---Youtube title---\n{self._db_yt_title}\n---Youtube description---\n{self._db_yt_description}")
        self._db_video_path = newFileName+".mp4"
        self._db_ready_to_upload = True
