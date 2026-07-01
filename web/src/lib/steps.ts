// Человекочитаемые названия шагов движков ShortGPT.
// Движки yield'ят строки вида "Current step (4 / 12) : _generateScript".

const STEP_LABELS: Record<string, string> = {
  _generateScript: 'Генерация сценария',
  _generateTempAudio: 'Озвучка текста',
  _speedUpAudio: 'Ускорение аудио',
  _timeCaptions: 'Распознавание и тайминг субтитров',
  _generateImageSearchTerms: 'Подбор запросов для картинок',
  _generateImageUrls: 'Поиск изображений',
  _chooseBackgroundMusic: 'Выбор фоновой музыки',
  _chooseBackgroundVideo: 'Выбор фонового видео',
  _prepareBackgroundAssets: 'Подготовка фоновых материалов',
  _prepareCustomAssets: 'Подготовка изображений',
  _editAndRenderShort: 'Монтаж и рендер видео',
  _editAndRenderVideo: 'Монтаж и рендер видео',
  _addYoutubeMetadata: 'Метаданные для YouTube',
  _addMetadata: 'Метаданные для YouTube',
  _generateVideoSearchTerms: 'Подбор запросов для стоков',
  _generateVideoUrls: 'Поиск стоковых видео',
  _downloadVideo: 'Скачивание исходного видео',
  _transcribeAudio: 'Распознавание речи',
  _translateContent: 'Перевод текста',
}

/** "Current step (4 / 12) : _generateScript" → "Генерация сценария" */
export function prettifyStepLabel(raw: string): string {
  if (!raw) return ''
  const name = raw.includes(':') ? raw.slice(raw.lastIndexOf(':') + 1).trim() : raw.trim()
  if (STEP_LABELS[name]) return STEP_LABELS[name]
  // _somethingCamelCase → "something camel case"
  const humanized = name
    .replace(/^_+/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
  return humanized.charAt(0).toUpperCase() + humanized.slice(1)
}
