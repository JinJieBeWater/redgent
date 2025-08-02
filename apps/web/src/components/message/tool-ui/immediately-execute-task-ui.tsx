// import type { AppMessage, AppToolUI, AppUIDataTypes } from '@core/shared'
// import type { UIMessagePart } from 'ai'
// import { useEffect, useState } from 'react'
// import { useSubscription } from '@trpc/tanstack-react-query'
// import { Button } from '@web/components/ui/button'
// import {
//   Collapsible,
//   CollapsibleContent,
//   CollapsibleTrigger,
// } from '@web/components/ui/collapsible'
// import { Progress } from '@web/components/ui/progress'
// import { useChatContext } from '@web/contexts/chat-context'
// import { cn } from '@web/lib/utils'
// import { queryClient, trpc } from '@web/router'
// import { generateId } from 'ai'
// import {
//   AlertCircle,
//   Brain,
//   CheckCircle,
//   ChevronsUpDown,
//   Download,
//   FileText,
//   Filter,
//   Info,
//   Loader2,
//   Play,
//   Search,
//   SearchCode,
//   XCircle,
// } from 'lucide-react'
// import z from 'zod'

// import type { ExecuteSubscribeOutputSchema } from '@redgent/shared'

// // 获取状态对应的图标
// const getStatusIcon = (status: string) => {
//   switch (status) {
//     case 'TASK_START':
//       return Play
//     case 'FETCH_START':
//     case 'FETCH_COMPLETE':
//       return Download
//     case 'FILTER_START':
//     case 'FILTER_COMPLETE':
//       return Filter
//     case 'SELECT_START':
//     case 'SELECT_COMPLETE':
//       return Search
//     case 'FETCH_CONTENT_START':
//     case 'FETCH_CONTENT_COMPLETE':
//       return FileText
//     case 'ANALYZE_START':
//     case 'ANALYZE_COMPLETE':
//       return Brain
//     case 'TASK_COMPLETE':
//       return CheckCircle
//     case 'TASK_CANCEL':
//       return AlertCircle
//     case 'TASK_ERROR':
//       return XCircle
//     default:
//       return Info
//   }
// }

// export const ImmediatelyExecuteTaskUI = ({
//   part,
// }: {
//   message: AppMessage
//   part: UIMessagePart<AppUIDataTypes, AppToolUI>
// }) => {
//   if (part.type !== 'tool-ImmediatelyExecuteTask') return null
//   if (!part.output) return null

//   const { input, output } = part

//   const { messages, setMessages, addToolResult } = useChatContext()

//   const { data } = useSubscription(
//     trpc.task.execute.subscribe.subscriptionOptions({}),
//   )

//   const sseOutput = (data as any)?.data as z.infer<
//     typeof ExecuteSubscribeOutputSchema
//   >

//   // 计算整体进度
//   // const getProgress = () => {
//   //   if (!latestHistory) return 0
//   //   const status = output.progress.status

//   //   // 根据状态返回大致进度
//   //   const progressMap: Record<string, number> = {
//   //     TASK_START: 5,
//   //     FETCH_START: 15,
//   //     FETCH_COMPLETE: 30,
//   //     FILTER_START: 35,
//   //     FILTER_COMPLETE: 50,
//   //     SELECT_START: 55,
//   //     SELECT_COMPLETE: 65,
//   //     FETCH_CONTENT_START: 70,
//   //     FETCH_CONTENT_COMPLETE: 80,
//   //     ANALYZE_START: 85,
//   //     ANALYZE_COMPLETE: 95,
//   //     TASK_COMPLETE: 100,
//   //   }

//   //   return progressMap[status] || 0
//   // }

//   const [isOpen, setIsOpen] = useState(false)

//   if (1) {
//     return (
//       <div className="rounded-lg border p-3">
//         <div className="text-muted-foreground flex items-center gap-2">
//           <Loader2 className="h-4 w-4 animate-spin" />
//           <span>等待任务执行...</span>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="space-y-4 rounded-lg border p-3">
//       <Collapsible
//         open={isOpen}
//         onOpenChange={setIsOpen}
//         className="flex w-full flex-col gap-4"
//       >
//         {/* 任务标题和进度 */}
//         <div className="space-y-2">
//           <div className="flex items-start justify-between gap-2">
//             <div className="flex items-end gap-2">
//               <h3 className="font-semibold">
//                 {latestHistory?.name || '任务执行'}
//               </h3>
//               {output?.status === 'running' && (
//                 <div className="text-muted-foreground text-sm">
//                   {getProgress()}%
//                 </div>
//               )}
//             </div>
//             <div className="flex items-center gap-1">
//               {/* 完成后查看报告 */}
//               <Button
//                 variant={'ghost'}
//                 size={'icon'}
//                 className="size-7"
//                 disabled={output?.status !== 'success'}
//                 onClick={() => {
//                   output?.reportId &&
//                     setMessages([
//                       ...messages,
//                       {
//                         id: generateId(),
//                         role: 'user',
//                         parts: [
//                           {
//                             type: 'text',
//                             text: `查看报告`,
//                           },
//                         ],
//                       },
//                       {
//                         id: generateId(),
//                         role: 'assistant',
//                         parts: [
//                           {
//                             type: 'tool-ShowReportUI',
//                             toolCallId: generateId(),
//                             state: 'input-available',
//                             input: {
//                               id: output?.reportId,
//                             },
//                           },
//                         ],
//                       },
//                     ])
//                 }}
//               >
//                 <SearchCode />
//                 <span className="sr-only">查看报告</span>
//               </Button>
//               <CollapsibleTrigger asChild>
//                 <Button variant="ghost" size="icon" className="size-7">
//                   <ChevronsUpDown />
//                   <span className="sr-only">Toggle</span>
//                 </Button>
//               </CollapsibleTrigger>
//             </div>
//           </div>
//           {output?.status === 'running' ? (
//             <Progress value={getProgress()} className="h-2" />
//           ) : output?.status === 'cancel' ? (
//             <div className="flex items-center gap-2 text-xs">
//               <AlertCircle className="text-destructive h-4 w-4" />
//               <p>{output.message}</p>
//             </div>
//           ) : output?.status === 'success' ? (
//             <div className="flex items-center gap-2 text-xs">
//               <CheckCircle className="h-3.5 w-3.5 text-green-600" />
//               <p>{output.message}</p>
//             </div>
//           ) : output?.status === 'failure' ? (
//             <div className="flex items-center gap-2 text-xs">
//               <AlertCircle className="text-destructive h-4 w-4" />
//               <p>{output.message}</p>
//             </div>
//           ) : (
//             <Progress value={getProgress()} className="h-2" />
//           )}
//         </div>
//         <CollapsibleContent className="flex flex-col gap-2">
//           {/* 执行步骤列表 */}
//           <div className="max-h-64 space-y-2">
//             {executeHistory.map((item, index) => {
//               const Icon = getStatusIcon(item.progress.status)
//               const isLatest = index === executeHistory.length - 1
//               const isError = item.progress.status === 'TASK_ERROR'
//               const isComplete =
//                 item.progress.status.includes('COMPLETE') ||
//                 item.progress.status === 'TASK_COMPLETE'

//               return (
//                 <div key={index} className="flex items-start gap-2">
//                   <div
//                     className={`mt-0.5 flex-shrink-0 ${
//                       isError
//                         ? 'text-destructive'
//                         : isComplete
//                           ? 'text-green-600'
//                           : 'text-muted-foreground'
//                     }`}
//                   >
//                     {isLatest && isInProgress ? (
//                       <Loader2 className="h-3.5 w-3.5 animate-spin" />
//                     ) : (
//                       <Icon className="h-3.5 w-3.5" />
//                     )}
//                   </div>
//                   <div className="min-w-0 flex-1">
//                     <p
//                       className={cn(
//                         'text-xs',
//                         isError ? 'text-destructive' : 'text-foreground',
//                       )}
//                     >
//                       {item.progress.message}
//                     </p>
//                   </div>
//                 </div>
//               )
//             })}
//           </div>
//         </CollapsibleContent>
//       </Collapsible>
//     </div>
//   )
// }
