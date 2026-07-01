import { useParams } from 'react-router'
import { Page } from '../../components/layout/Page'
import { PageHeader } from '../../components/layout/PageHeader'

export function JobScenePage() {
  const { groupId } = useParams()
  return (
    <Page wide>
      <PageHeader title="Рендер" subtitle={`Группа ${groupId}`} />
    </Page>
  )
}
