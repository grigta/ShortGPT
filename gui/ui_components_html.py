import gradio as gr


class GradioComponentsHTML:

    # ── Дизайн-система ────────────────────────────────────────────────
    # Палитра «монтажная студия»: глубокий графит + тёплый янтарь.
    INK = "#0D1017"          # фон приложения
    PANEL = "#151A22"        # панели / карточки
    PANEL_2 = "#0F141B"      # поля ввода
    LINE = "#222B36"         # границы / hairline
    TEXT = "#E6EAF0"         # основной текст
    MUTED = "#8FA0B2"        # вторичный текст
    AMBER = "#F6A623"        # акцент действий
    AMBER_HI = "#FFC15A"     # ховер / верх градиента

    @staticmethod
    def get_theme():
        '''Кастомная тёмная тема Gradio (форсируется в обоих режимах).'''
        c = GradioComponentsHTML
        return gr.themes.Soft(
            primary_hue="amber",
            secondary_hue="orange",
            neutral_hue="slate",
            font=[gr.themes.GoogleFont("Manrope"), "ui-sans-serif", "system-ui", "sans-serif"],
            font_mono=[gr.themes.GoogleFont("JetBrains Mono"), "ui-monospace", "monospace"],
            radius_size=gr.themes.sizes.radius_lg,
            spacing_size=gr.themes.sizes.spacing_md,
        ).set(
            body_background_fill=c.INK,
            body_background_fill_dark=c.INK,
            body_text_color=c.TEXT,
            body_text_color_dark=c.TEXT,
            body_text_color_subdued=c.MUTED,
            body_text_color_subdued_dark=c.MUTED,
            background_fill_primary=c.PANEL,
            background_fill_primary_dark=c.PANEL,
            background_fill_secondary="#11151C",
            background_fill_secondary_dark="#11151C",
            block_background_fill=c.PANEL,
            block_background_fill_dark=c.PANEL,
            block_border_color=c.LINE,
            block_border_color_dark=c.LINE,
            block_label_text_color=c.MUTED,
            block_label_text_color_dark=c.MUTED,
            block_title_text_color="#C6D2DE",
            block_title_text_color_dark="#C6D2DE",
            border_color_primary=c.LINE,
            border_color_primary_dark=c.LINE,
            input_background_fill=c.PANEL_2,
            input_background_fill_dark=c.PANEL_2,
            input_border_color="#273140",
            input_border_color_dark="#273140",
            input_placeholder_color="#5E6B7A",
            button_primary_background_fill=f"linear-gradient(150deg,{c.AMBER_HI},{c.AMBER})",
            button_primary_background_fill_dark=f"linear-gradient(150deg,{c.AMBER_HI},{c.AMBER})",
            button_primary_background_fill_hover=f"linear-gradient(150deg,#FFCE7A,#FFB13D)",
            button_primary_text_color="#1A1205",
            button_primary_text_color_dark="#1A1205",
            button_secondary_background_fill="#1B222C",
            button_secondary_background_fill_dark="#1B222C",
            button_secondary_text_color="#D7E0EA",
            button_secondary_text_color_dark="#D7E0EA",
            color_accent_soft="#1E2733",
            panel_background_fill="#12171E",
            panel_background_fill_dark="#12171E",
        )

    @staticmethod
    def get_css() -> str:
        '''Точечный CSS: шрифты, шапка-«аппаратная», вкладки, полировка.'''
        c = GradioComponentsHTML
        return f'''
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        footer {{ visibility: hidden !important; display: none !important; }}

        .gradio-container {{
            max-width: 1180px !important;
            margin: 0 auto !important;
            font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif !important;
        }}

        /* ── Шапка ─────────────────────────────────────────────── */
        .sg-header {{
            display: flex; justify-content: space-between; align-items: center;
            padding: 24px 6px 14px;
        }}
        .sg-brand {{ display: flex; align-items: center; gap: 16px; }}
        .sg-logo {{
            width: 52px; height: 52px; border-radius: 14px;
            background: linear-gradient(150deg, {c.AMBER_HI}, {c.AMBER});
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 10px 24px -10px rgba(246,166,35,.65);
        }}
        .sg-logo::after {{
            content: ''; width: 0; height: 0; border-style: solid;
            border-width: 11px 0 11px 18px;
            border-color: transparent transparent transparent #1A1205;
            margin-left: 4px;
        }}
        .sg-brand-text {{ display: flex; flex-direction: column; }}
        .sg-title {{
            font-size: 30px; font-weight: 800; letter-spacing: -.02em;
            color: #F3F6FA; line-height: 1;
        }}
        .sg-subtitle {{ font-size: 13.5px; color: {c.MUTED}; margin-top: 6px; }}
        .sg-status {{
            font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px;
            color: #9FB0C2; background: {c.PANEL}; border: 1px solid #273140;
            border-radius: 999px; padding: 7px 14px;
            display: flex; align-items: center; gap: 8px; white-space: nowrap;
        }}
        .sg-dot {{
            width: 8px; height: 8px; border-radius: 50%; background: #3FD07F;
            animation: sgpulse 2.2s infinite;
        }}
        @keyframes sgpulse {{
            0%   {{ box-shadow: 0 0 0 0 rgba(63,208,127,.5); }}
            70%  {{ box-shadow: 0 0 0 7px rgba(63,208,127,0); }}
            100% {{ box-shadow: 0 0 0 0 rgba(63,208,127,0); }}
        }}
        /* Сигнатура: полоса-«киноплёнка» */
        .sg-filmstrip {{
            height: 6px; border-radius: 6px; margin: 4px 6px 2px;
            background: repeating-linear-gradient(90deg, {c.AMBER} 0 22px, #6E4B14 22px 26px);
            opacity: .5;
        }}

        /* ── Заголовки секций ─────────────────────────────────── */
        .gradio-container h1 {{ font-weight: 800 !important; letter-spacing: -.02em; }}
        .gradio-container h2 {{ font-weight: 600 !important; color: #AEBDCC !important; }}

        /* ── Вкладки ──────────────────────────────────────────── */
        .tab-nav {{ border-bottom: 1px solid {c.LINE} !important; gap: 2px; }}
        .tab-nav button {{ font-weight: 600 !important; color: #8595A6 !important; }}
        .tab-nav button.selected {{
            color: {c.AMBER} !important;
            border-bottom: 2px solid {c.AMBER} !important;
        }}

        @media (prefers-reduced-motion: reduce) {{ .sg-dot {{ animation: none; }} }}
        '''

    @staticmethod
    def get_html_header() -> str:
        '''Шапка панели: логотип, название, статус. Без сторонних бейджей.'''
        return '''
            <div class="sg-header">
              <div class="sg-brand">
                <div class="sg-logo"></div>
                <div class="sg-brand-text">
                  <div class="sg-title">ShortGPT</div>
                  <div class="sg-subtitle">Студия автоматизации видео</div>
                </div>
              </div>
              <div class="sg-status">
                <span class="sg-dot"></span> Локально · порт 31415
              </div>
            </div>
            <div class="sg-filmstrip"></div>
        '''

    @staticmethod
    def get_html_error_template() -> str:
        return '''
        <div style="background:#2A1518; border:1px solid rgba(242,109,109,.28); color:#F4C7C7;
                    padding:16px 18px; border-radius:14px; margin:10px 0;
                    font-family:'Manrope',ui-sans-serif,system-ui,sans-serif;">
          <div style="font-weight:700; color:#FF8B8B; margin-bottom:8px;">Ошибка: {error_message}</div>
          <pre style="white-space:pre-wrap; font-family:'JetBrains Mono',ui-monospace,monospace;
                      font-size:12px; color:#C9A9A9; background:rgba(0,0,0,.28);
                      padding:10px 12px; border-radius:8px; overflow:auto; margin:0;">{stack_trace}</pre>
          <div style="margin-top:10px; color:#C9A9A9;">Если ошибка повторяется — проверьте ключи API во вкладке «Настройки».</div>
        </div>
        '''

    @staticmethod
    def get_html_video_template(file_url_path, file_name, width="auto", height="auto"):
        """
        Собрать HTML для встраивания и скачивания видео.

        Parameters:
        file_url_path (str): URL или путь к видеофайлу.
        file_name (str): Имя видеофайла.
        width (str, optional): Ширина видео. По умолчанию "auto".
        height (str, optional): Высота видео. По умолчанию "auto".

        Returns:
        str: Сгенерированный HTML-фрагмент.
        """
        html = f'''
            <div style="display: flex; flex-direction: column; align-items: center;">
                <video width="{width}" height="{height}" style="max-height: 100%; border-radius: 12px;" controls>
                    <source src="{file_url_path}" type="video/mp4">
                    Ваш браузер не поддерживает тег video.
                </video>
                <a href="{file_url_path}" download="{file_name}" style="margin-top: 12px; text-decoration:none;">
                    <button style="font-size: 1em; padding: 10px 18px; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; color: #1A1205; background: linear-gradient(150deg,#FFC15A,#F6A623);">Скачать видео</button>
                </a>
            </div>
        '''
        return html
