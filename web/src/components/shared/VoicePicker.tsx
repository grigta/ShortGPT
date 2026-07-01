import { Link } from 'react-router'
import { useEdgeVoices, useElevenVoices } from '../../hooks/useVoices'
import type { VoiceSpec } from '../../lib/api/types'
import { ELEVEN_SUPPORTED } from '../../lib/languages'
import { Combobox } from '../ui/Combobox'
import { Field } from '../ui/Field'
import { SegmentedControl } from '../ui/SegmentedControl'

interface VoicePickerProps {
  value: VoiceSpec
  onChange: (value: VoiceSpec) => void
  /** Перевод: язык задаётся списком целевых языков, селектор языка не нужен. */
  hideLanguage?: boolean
  error?: string
}

/** Выбор TTS: EdgeTTS (бесплатно, язык + пол) или ElevenLabs (язык + голос из API). */
export function VoicePicker({ value, onChange, hideLanguage, error }: VoicePickerProps) {
  const edge = useEdgeVoices()
  const eleven = useElevenVoices()

  const elevenAvailable = eleven.data?.available ?? false

  const languageOptions =
    value.engine === 'edge'
      ? (edge.data ?? []).map((v) => ({ value: v.language, label: v.language }))
      : ELEVEN_SUPPORTED.map((l) => ({ value: l, label: l }))

  return (
    <div className="space-y-4">
      <SegmentedControl
        options={[
          { value: 'edge', label: 'EdgeTTS · бесплатно' },
          { value: 'elevenlabs', label: 'ElevenLabs', disabled: !elevenAvailable },
        ]}
        value={value.engine}
        onChange={(engine) =>
          onChange(
            engine === 'edge'
              ? { engine, language: value.language || 'English', gender: value.gender ?? 'male' }
              : {
                  engine,
                  language: ELEVEN_SUPPORTED.includes(value.language) ? value.language : 'English',
                  voice_name: eleven.data?.voices[0],
                },
          )
        }
      />
      {!elevenAvailable && !eleven.isLoading && (
        <p className="text-[12px] text-text-low">
          {eleven.data?.detail && eleven.data.detail !== 'Ключ не задан' ? (
            <>
              ElevenLabs недоступен: {eleven.data.detail}{' '}
              <Link to="/settings" className="text-amber-400 hover:underline">
                Настройки →
              </Link>
            </>
          ) : (
            <>
              ElevenLabs недоступен —{' '}
              <Link to="/settings" className="text-amber-400 hover:underline">
                добавьте ключ в настройках
              </Link>
            </>
          )}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-4">
        {!hideLanguage && (
          <Field label="Язык" error={error} className="w-64">
            <Combobox
              options={languageOptions}
              value={value.language || null}
              onChange={(language) => onChange({ ...value, language })}
              placeholder="Выберите язык…"
            />
          </Field>
        )}

        {value.engine === 'edge' ? (
          <Field label="Голос">
            <SegmentedControl
              options={[
                { value: 'male', label: 'Мужской' },
                { value: 'female', label: 'Женский' },
              ]}
              value={value.gender ?? 'male'}
              onChange={(gender) => onChange({ ...value, gender })}
            />
          </Field>
        ) : (
          <Field label="Голос ElevenLabs" className="w-56">
            <Combobox
              options={(eleven.data?.voices ?? []).map((v) => ({ value: v, label: v }))}
              value={value.voice_name ?? null}
              onChange={(voice_name) => onChange({ ...value, voice_name })}
              placeholder="Голос…"
            />
          </Field>
        )}
      </div>
    </div>
  )
}
