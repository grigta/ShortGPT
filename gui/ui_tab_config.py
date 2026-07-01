import time

import gradio as gr

from gui.asset_components import AssetComponentsUtils
from gui.ui_abstract_component import AbstractComponentUI
from shortGPT.api_utils.eleven_api import ElevenLabsAPI
from shortGPT.config.api_db import ApiKeyManager
from shortGPT.gpt import openrouter

MODELS_PER_PAGE = 12
TABLE_HEADERS = ["Модель (id)", "Название", "Контекст", "Вход $/1M", "Выход $/1M", "Тип"]


def _fmt_ctx(ctx):
    if not ctx:
        return "—"
    try:
        ctx = int(ctx)
    except (TypeError, ValueError):
        return str(ctx)
    if ctx >= 1000:
        return f"{ctx // 1000}K"
    return str(ctx)


def _fmt_price(p):
    if p is None:
        return "—"
    if p == 0:
        return "бесплатно"
    return f"${p:g}"


class ConfigUI(AbstractComponentUI):
    def __init__(self):
        self.api_key_manager = ApiKeyManager()
        eleven_key = self.api_key_manager.get_api_key('ELEVENLABS_API_KEY')
        self.eleven_labs_api = ElevenLabsAPI(eleven_key) if eleven_key else None

    # ── Каталог моделей OpenRouter ─────────────────────────────────
    def _filter(self, summaries, search, free_only):
        s = (search or "").strip().lower()
        res = []
        for m in summaries:
            if free_only and not m["is_free"]:
                continue
            if s and s not in m["id"].lower() and s not in (m["name"] or "").lower():
                continue
            res.append(m)
        return res

    def _rows_for_page(self, summaries, page):
        total = len(summaries)
        pages = max(1, (total + MODELS_PER_PAGE - 1) // MODELS_PER_PAGE)
        page = max(0, min(page, pages - 1))
        start = page * MODELS_PER_PAGE
        chunk = summaries[start:start + MODELS_PER_PAGE]
        rows = [[
            m["id"], m["name"], _fmt_ctx(m["context"]),
            _fmt_price(m["prompt_price"]), _fmt_price(m["completion_price"]),
            m["modality"] or "—",
        ] for m in chunk]
        label = f"Страница {page + 1} / {pages}  ·  моделей: {total}"
        return rows, label, page

    def _load(self, api_key, search, free_only, force):
        try:
            summaries = openrouter.list_model_summaries(api_key or None, force=force)
            status = f"✅ Загружено моделей: {len(summaries)}"
        except Exception as e:
            summaries = []
            status = f"❌ Не удалось загрузить модели: {e}"
        filtered = self._filter(summaries, search, free_only)
        rows, label, _ = self._rows_for_page(filtered, 0)
        return gr.update(value=rows), label, filtered, 0, status

    def reload_models(self, api_key, search, free_only):
        '''Принудительно перезагрузить каталог с OpenRouter.'''
        return self._load(api_key, search, free_only, force=True)

    def refilter_models(self, api_key, search, free_only):
        '''Отфильтровать уже загруженный каталог (из кэша).'''
        return self._load(api_key, search, free_only, force=False)

    def _load_images(self, api_key, search, force):
        try:
            summaries = openrouter.list_image_model_summaries(api_key or None, force=force)
            status = f"✅ Моделей генерации картинок: {len(summaries)}"
        except Exception as e:
            summaries = []
            status = f"❌ Не удалось загрузить модели: {e}"
        filtered = self._filter(summaries, search, False)
        rows, label, _ = self._rows_for_page(filtered, 0)
        return gr.update(value=rows), label, filtered, 0, status

    def reload_image_models(self, api_key, search):
        '''Принудительно перезагрузить список моделей генерации картинок.'''
        return self._load_images(api_key, search, force=True)

    def refilter_image_models(self, api_key, search):
        '''Отфильтровать список моделей генерации картинок (из кэша).'''
        return self._load_images(api_key, search, force=False)

    def prev_page(self, summaries, page):
        rows, label, page = self._rows_for_page(summaries or [], (page or 0) - 1)
        return gr.update(value=rows), label, page

    def next_page(self, summaries, page):
        rows, label, page = self._rows_for_page(summaries or [], (page or 0) + 1)
        return gr.update(value=rows), label, page

    def _model_detail_md(self, m):
        ctx = _fmt_ctx(m["context"])
        price = f"вход {_fmt_price(m['prompt_price'])} / выход {_fmt_price(m['completion_price'])} за 1M токенов"
        desc = (m["description"] or "")[:320]
        return f"**Выбрана модель:** `{m['id']}`\n\n{m['name']} · контекст {ctx} · {price}\n\n{desc}"

    def on_select_model(self, summaries, page, evt: gr.SelectData):
        if not summaries or evt.index is None:
            return gr.update(), gr.update()
        idx = (page or 0) * MODELS_PER_PAGE + evt.index[0]
        if 0 <= idx < len(summaries):
            m = summaries[idx]
            return gr.update(value=m["id"]), self._model_detail_md(m)
        return gr.update(), gr.update()

    # ── Ключи / озвучка ────────────────────────────────────────────
    def on_show(self, button_text, textbox, button):
        '''Показать или скрыть ключ API'''
        if button_text == "Показать":
            return gr.update(type="text"), gr.update(value="Скрыть")
        return gr.update(type="password"), gr.update(value="Показать")

    def verify_eleven_key(self, eleven_key, remaining_chars):
        '''Проверить ключ ElevenLabs API'''
        if (eleven_key and self.api_key_manager.get_api_key('ELEVENLABS_API_KEY') != eleven_key):
            try:
                self.eleven_labs_api = ElevenLabsAPI(eleven_key)
                print(self.eleven_labs_api)
                return self.eleven_labs_api.get_remaining_characters()
            except Exception as e:
                raise gr.Error(e.args[0])
        return remaining_chars

    def save_keys(self, openrouter_key, model, image_model, eleven_key, pexels_key):
        '''Сохранить ключи и выбранные модели в базе'''
        if self.api_key_manager.get_api_key("OPENROUTER_API_KEY") != openrouter_key:
            self.api_key_manager.set_api_key("OPENROUTER_API_KEY", openrouter_key)
        if model and self.api_key_manager.get_api_key("OPENROUTER_MODEL") != model:
            self.api_key_manager.set_api_key("OPENROUTER_MODEL", model)
        if self.api_key_manager.get_api_key("OPENROUTER_IMAGE_MODEL") != (image_model or ""):
            self.api_key_manager.set_api_key("OPENROUTER_IMAGE_MODEL", image_model or "")
        if self.api_key_manager.get_api_key("PEXELS_API_KEY") != pexels_key:
            self.api_key_manager.set_api_key("PEXELS_API_KEY", pexels_key)

        eleven_changed = self.api_key_manager.get_api_key('ELEVENLABS_API_KEY') != eleven_key
        if eleven_changed:
            self.api_key_manager.set_api_key("ELEVENLABS_API_KEY", eleven_key)

        if eleven_changed and eleven_key:
            new_eleven_voices = AssetComponentsUtils.getElevenlabsVoices()
            voice_update = gr.update(choices=new_eleven_voices)
        else:
            voice_update = gr.update()

        return gr.update(value=openrouter_key),\
            gr.update(value=model),\
            gr.update(value=image_model),\
            gr.update(value=eleven_key),\
            gr.update(value=pexels_key),\
            voice_update,\
            voice_update

    def get_eleven_remaining(self,):
        '''Получить остаток символов ElevenLabs API'''
        if (self.eleven_labs_api):
            try:
                return self.eleven_labs_api.get_remaining_characters()
            except Exception as e:
                return e.args[0]
        return ""

    def back_to_normal(self):
        '''Вернуть кнопку в исходное состояние через 3 секунды'''
        time.sleep(3)
        return gr.update(value="Сохранить")

    def create_ui(self):
        '''Создать UI вкладки настроек'''
        saved_openrouter_key = self.api_key_manager.get_api_key("OPENROUTER_API_KEY")
        saved_model = self.api_key_manager.get_api_key("OPENROUTER_MODEL") or openrouter.DEFAULT_MODEL
        saved_image_model = self.api_key_manager.get_api_key("OPENROUTER_IMAGE_MODEL")

        # Первичная загрузка каталога (не роняем UI при сбое сети)
        try:
            init_summaries = openrouter.list_model_summaries(saved_openrouter_key or None)
        except Exception:
            init_summaries = []
        init_rows, init_label, _ = self._rows_for_page(init_summaries, 0)
        try:
            init_img = openrouter.list_image_model_summaries(saved_openrouter_key or None)
        except Exception:
            init_img = []
        init_img_rows, init_img_label, _ = self._rows_for_page(init_img, 0)

        with gr.Tab("Настройки") as config_ui:
            gr.Markdown("### 🔑 Ключи API\nВведите ключи и нажмите «Сохранить». Ключи хранятся локально.")

            with gr.Row():
                with gr.Column(scale=3):
                    openrouter_textbox = gr.Textbox(value=saved_openrouter_key, label="Ключ OpenRouter API", placeholder="sk-or-...", show_label=True, interactive=True, show_copy_button=True, type="password")
                with gr.Column(scale=1, min_width=120):
                    show_openrouter_key = gr.Button("Показать", size="sm")
            show_openrouter_key.click(self.on_show, [show_openrouter_key], [openrouter_textbox, show_openrouter_key])

            # ── Браузер моделей OpenRouter ──────────────────────────
            gr.Markdown("### 🧠 Модель LLM (OpenRouter)\nВыберите модель из списка ниже — доступны все модели OpenRouter.")
            models_state = gr.State(init_summaries)
            page_state = gr.State(0)

            with gr.Row():
                search_box = gr.Textbox(label="Поиск модели", placeholder="например: gpt, claude, llama, deepseek…", scale=3)
                free_only = gr.Checkbox(label="Только бесплатные", value=False, scale=1)
                reload_btn = gr.Button("🔄 Обновить каталог", size="sm", scale=1)

            models_table = gr.Dataframe(
                value=init_rows,
                headers=TABLE_HEADERS,
                datatype="str",
                interactive=False,
                wrap=True,
                label="Кликните по строке, чтобы выбрать модель",
            )
            with gr.Row():
                prev_btn = gr.Button("◀ Назад", size="sm")
                page_label = gr.Markdown(init_label)
                next_btn = gr.Button("Вперёд ▶", size="sm")

            status_md = gr.Markdown("")
            selected_model = gr.Textbox(value=saved_model, label="Выбранная модель (можно ввести id вручную)", interactive=True)
            selected_detail = gr.Markdown("")

            load_outputs = [models_table, page_label, models_state, page_state, status_md]
            reload_btn.click(self.reload_models, [openrouter_textbox, search_box, free_only], load_outputs)
            search_box.change(self.refilter_models, [openrouter_textbox, search_box, free_only], load_outputs)
            free_only.change(self.refilter_models, [openrouter_textbox, search_box, free_only], load_outputs)
            prev_btn.click(self.prev_page, [models_state, page_state], [models_table, page_label, page_state])
            next_btn.click(self.next_page, [models_state, page_state], [models_table, page_label, page_state])
            models_table.select(self.on_select_model, [models_state, page_state], [selected_model, selected_detail])

            # ── Браузер моделей генерации картинок ──────────────────
            gr.Markdown("### 🖼️ Модель генерации картинок (OpenRouter)\nМодели, умеющие генерировать изображения. Оставьте поле пустым — картинки будут браться из поиска Bing.")
            img_models_state = gr.State(init_img)
            img_page_state = gr.State(0)

            with gr.Row():
                img_search = gr.Textbox(label="Поиск модели картинок", placeholder="например: flux, gemini, dall-e, sdxl…", scale=3)
                img_reload = gr.Button("🔄 Обновить список", size="sm", scale=1)

            img_table = gr.Dataframe(
                value=init_img_rows,
                headers=TABLE_HEADERS,
                datatype="str",
                interactive=False,
                wrap=True,
                label="Кликните по строке, чтобы выбрать модель картинок",
            )
            with gr.Row():
                img_prev = gr.Button("◀ Назад", size="sm")
                img_page_label = gr.Markdown(init_img_label)
                img_next = gr.Button("Вперёд ▶", size="sm")

            img_status = gr.Markdown("")
            image_selected_model = gr.Textbox(value=saved_image_model, label="Выбранная модель картинок (пусто = поиск Bing)", interactive=True)
            image_detail = gr.Markdown("")

            img_load_outputs = [img_table, img_page_label, img_models_state, img_page_state, img_status]
            img_reload.click(self.reload_image_models, [openrouter_textbox, img_search], img_load_outputs)
            img_search.change(self.refilter_image_models, [openrouter_textbox, img_search], img_load_outputs)
            img_prev.click(self.prev_page, [img_models_state, img_page_state], [img_table, img_page_label, img_page_state])
            img_next.click(self.next_page, [img_models_state, img_page_state], [img_table, img_page_label, img_page_state])
            img_table.select(self.on_select_model, [img_models_state, img_page_state], [image_selected_model, image_detail])

            # ── Озвучка и материалы ─────────────────────────────────
            gr.Markdown("### 🎙️ Озвучка и материалы")
            with gr.Row():
                eleven_labs_textbox = gr.Textbox(value=self.api_key_manager.get_api_key("ELEVENLABS_API_KEY"), label="Ключ ElevenLabs API", show_label=True, interactive=True, show_copy_button=True, type="password", scale=40)
                eleven_characters_remaining = gr.Textbox(value=self.get_eleven_remaining(), label="Остаток символов", show_label=True, interactive=False, type="text", scale=40)
                show_eleven_key = gr.Button("Показать", size="sm", scale=1)
            show_eleven_key.click(self.on_show, [show_eleven_key], [eleven_labs_textbox, show_eleven_key])
            with gr.Row():
                pexels_textbox = gr.Textbox(value=self.api_key_manager.get_api_key("PEXELS_API_KEY"), label="Ключ Pexels API", show_label=True, interactive=True, show_copy_button=True, type="password", scale=40)
                show_pexels_key = gr.Button("Показать", size="sm", scale=1)
            show_pexels_key.click(self.on_show, [show_pexels_key], [pexels_textbox, show_pexels_key])

            save_button = gr.Button("Сохранить", variant="primary")
            save_button.click(self.verify_eleven_key, [eleven_labs_textbox, eleven_characters_remaining], [eleven_characters_remaining]).success(
                self.save_keys, [openrouter_textbox, selected_model, image_selected_model, eleven_labs_textbox, pexels_textbox], [openrouter_textbox, selected_model, image_selected_model, eleven_labs_textbox, pexels_textbox, AssetComponentsUtils.voiceChoice(), AssetComponentsUtils.voiceChoiceTranslation()])
            save_button.click(lambda _: gr.update(value="Ключи сохранены!"), [], [save_button])
            save_button.click(self.back_to_normal, [], [save_button])
        return config_ui
