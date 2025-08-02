import type { AppToolUI, AppUIDataTypes } from '@core/shared'
import type { UIMessagePart } from 'ai'
import { Card, CardContent } from '@web/components/ui/card'
import { AlertCircle } from 'lucide-react'

export const RequestUserConsentUI = ({
  part,
}: {
  part: Extract<
    UIMessagePart<AppUIDataTypes, AppToolUI>,
    { type: 'tool-RequestUserConsent' }
  >
}) => {
  const { input } = part
  if (!input?.message) return null

  return (
    <Card className="border-warning bg-warning/10 gap-2 px-3 py-3">
      <CardContent className="flex items-start gap-2 px-1">
        <AlertCircle className="text-warning h-5 w-5 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <p className="text-foreground text-sm">{input.message}</p>
        </div>
      </CardContent>
    </Card>
  )
}
