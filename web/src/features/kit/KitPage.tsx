import { Rocket, Smartphone, SquarePlay } from 'lucide-react'
import { useState } from 'react'
import { Page } from '../../components/layout/Page'
import { PageHeader } from '../../components/layout/PageHeader'
import { AudioChip } from '../../components/ui/AudioChip'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Combobox } from '../../components/ui/Combobox'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Dropzone } from '../../components/ui/Dropzone'
import { EmptyState } from '../../components/ui/EmptyState'
import { Field } from '../../components/ui/Field'
import { Input, Textarea } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { MultiChipSelect } from '../../components/ui/MultiChipSelect'
import { RadioCardGroup } from '../../components/ui/RadioCardGroup'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Skeleton } from '../../components/ui/Skeleton'
import { Stepper } from '../../components/ui/Stepper'
import { Tabs } from '../../components/ui/Tabs'
import { TallyDot } from '../../components/ui/TallyDot'
import { Toggle } from '../../components/ui/Toggle'
import { toast } from '../../components/ui/Toast'

const LANGS = ['Русский', 'English', 'Español', 'Deutsch', 'Français', '日本語'].map((l) => ({
  value: l,
  label: l,
}))

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 font-mono text-[12px] tracking-widest text-text-low uppercase">
        {title}
      </h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  )
}

export function KitPage() {
  const [seg, setSeg] = useState('edge')
  const [radio, setRadio] = useState<string | null>('reddit')
  const [toggle, setToggle] = useState(true)
  const [num, setNum] = useState(3)
  const [combo, setCombo] = useState<string | null>(null)
  const [multi, setMulti] = useState<string[]>(['English'])
  const [tab, setTab] = useState('youtube')
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState(false)

  return (
    <Page wide>
      <PageHeader title="UI-кит" subtitle="Витрина компонентов (dev-only)" />

      <Section title="Кнопки">
        <Button variant="primary" icon={<Rocket size={15} />}>
          Запустить рендер
        </Button>
        <Button variant="primary" loading>
          Рендерим…
        </Button>
        <Button variant="secondary">Вторичная</Button>
        <Button variant="ghost">Призрачная</Button>
        <Button variant="danger">Удалить</Button>
        <Button variant="primary" disabled>
          Недоступна
        </Button>
      </Section>

      <Section title="Tally / Badge">
        <span className="flex items-center gap-2 text-[13px] text-text-mid">
          <TallyDot status="running" /> рендерится
        </span>
        <span className="flex items-center gap-2 text-[13px] text-text-mid">
          <TallyDot status="done" /> готово
        </span>
        <span className="flex items-center gap-2 text-[13px] text-text-mid">
          <TallyDot status="failed" /> ошибка
        </span>
        <span className="flex items-center gap-2 text-[13px] text-text-mid">
          <TallyDot status="queued" /> очередь
        </span>
        <Badge tone="amber">рендер</Badge>
        <Badge tone="ok">бесплатно</Badge>
        <Badge tone="err">нет ключа</Badge>
        <Badge tone="info">YouTube</Badge>
        <Badge>local</Badge>
      </Section>

      <Section title="Формы">
        <Field label="Водяной знак" hint="3–25 символов, буквы и цифры" className="w-64">
          <Input placeholder="MyChannel" />
        </Field>
        <Field label="С ошибкой" error="Выберите фоновое видео" className="w-64">
          <Input invalid placeholder="—" />
        </Field>
        <Field label="Описание видео" className="w-80">
          <Textarea placeholder="Видео о самых красивых местах Исландии…" />
        </Field>
      </Section>

      <Section title="Выбор">
        <SegmentedControl
          options={[
            { value: 'edge', label: 'EdgeTTS · бесплатно' },
            { value: 'eleven', label: 'ElevenLabs' },
          ]}
          value={seg}
          onChange={setSeg}
        />
        <Toggle checked={toggle} onChange={setToggle} label="AI-изображения" />
        <Stepper value={num} onChange={setNum} min={1} max={10} />
        <Combobox options={LANGS} value={combo} onChange={setCombo} placeholder="Язык…" className="w-56" />
      </Section>

      <Section title="Radio-карточки">
        <RadioCardGroup
          className="w-130"
          options={[
            { value: 'reddit', title: 'Reddit-история', description: 'Вопрос + история из тредов', icon: <Smartphone size={16} /> },
            { value: 'facts', title: 'Факты по теме', description: 'AI-подборка фактов', icon: <SquarePlay size={16} /> },
          ]}
          value={radio}
          onChange={setRadio}
        />
      </Section>

      <Section title="Мультивыбор языков">
        <MultiChipSelect options={LANGS} values={multi} onChange={setMulti} className="w-96" />
      </Section>

      <Section title="Tabs / Модалки / Toast">
        <Tabs
          tabs={[
            { value: 'youtube', label: 'YouTube' },
            { value: 'file', label: 'Файл' },
          ]}
          value={tab}
          onChange={setTab}
          className="w-64"
        />
        <Button onClick={() => setModal(true)}>Открыть модалку</Button>
        <Button onClick={() => setConfirm(true)}>Подтверждение</Button>
        <Button onClick={() => toast.ok('Ключ сохранён')}>Toast OK</Button>
        <Button onClick={() => toast.err('OpenRouter не отвечает')}>Toast ERR</Button>
      </Section>

      <Section title="Dropzone / Audio / Skeleton / Empty">
        <Dropzone onFile={() => toast.ok('Файл принят')} hint=".mp4, .mov до 500 МБ" className="w-80" />
        <AudioChip src="" label="Lofi Chill Beats" />
        <div className="w-56 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24" />
        </div>
        <EmptyState
          className="w-96"
          title="Здесь появятся готовые видео"
          description="Начните с создания первого short"
          action={<Button variant="primary">Создать</Button>}
        />
      </Section>

      <Modal open={modal} onClose={() => setModal(false)} title="Добавить ассет">
        <p className="text-[14px] text-text-mid">Содержимое модального окна.</p>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="ghost" onClick={() => setModal(false)}>
            Отмена
          </Button>
          <Button variant="primary" onClick={() => setModal(false)}>
            Сохранить
          </Button>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => setConfirm(false)}
        title="Удалить ассет?"
        description="«Lofi Chill Beats» будет убран из библиотеки. Файл на диске не удаляется."
      />
    </Page>
  )
}
