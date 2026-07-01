import time
import gradio as gr

from gui.ui_tab_short_automation import ShortAutomationUI
from gui.ui_tab_video_automation import VideoAutomationUI
from gui.ui_tab_video_translation import VideoTranslationUI


class GradioContentAutomationUI:
    def __init__(self, shortGPTUI):
        self.shortGPTUI = shortGPTUI
        self.content_automation_ui = None

    def create_ui(self):
        '''Create Gradio interface'''
        with gr.Tab("Создание контента") as self.content_automation_ui:
            gr.Markdown("# 🎬 Создание контента")
            gr.Markdown("## Выберите задачу автоматизации")
            choice = gr.Radio(['🎬 Создание Shorts (вертикальные ролики)', '🎞️ Видео из стоковых материалов', '🌐 Многоязычный дубляж видео'], label="Выберите вариант")
            video_automation_ui = VideoAutomationUI(self.shortGPTUI).create_ui()
            short_automation_ui = ShortAutomationUI(self.shortGPTUI).create_ui()
            video_translation_ui = VideoTranslationUI(self.shortGPTUI).create_ui()
            def onChange(x):
                showShorts= x == choice.choices[0][0]
                showVideo = x == choice.choices[1][0]
                showTranslation= x == choice.choices[2][0]
                return gr.update(visible=showShorts), gr.update(visible=showVideo), gr.update(visible=showTranslation)
            choice.change(onChange, [choice], [short_automation_ui,video_automation_ui, video_translation_ui])
        return self.content_automation_ui
