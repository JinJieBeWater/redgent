/* eslint-disable */
import 'katex/dist/katex.min.css'

import React, { Fragment, useCallback, useMemo, useState } from 'react'
import { useTheme } from '@web/components/theme-provider'
import { Button } from '@web/components/ui/button'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@web/components/ui/hover-card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/components/ui/table'
import { cn } from '@web/lib/utils'
import { ArrowLeftRight, Check, Copy, WrapText } from 'lucide-react'
import Marked, { ReactRenderer } from 'marked-react'
import Latex from 'react-latex-next'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism'
import { toast } from 'sonner'

interface MarkdownRendererProps {
  content: string
}

interface CitationLink {
  text: string
  link: string
}

// Citation source configuration
interface CitationSourceConfig {
  name: string
  pattern: RegExp
  urlGenerator: (title: string, source: string) => string | null
}

// 使用系统默认等宽字体
const monoFontFamily =
  'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Inconsolata, "Roboto Mono", "Cascadia Code", "Lucida Console", monospace'

const citationSources: CitationSourceConfig[] = [
  {
    name: 'Wikipedia',
    pattern: /Wikipedia/i,
    urlGenerator: (title: string, source: string) => {
      const searchTerm =
        `${title} ${source.replace(/\s+[-–—]\s+Wikipedia/i, '')}`.trim()
      return `https://en.wikipedia.org/wiki/${encodeURIComponent(searchTerm.replace(/\s+/g, '_'))}`
    },
  },
  {
    name: 'arXiv',
    pattern: /arXiv:(\d+\.\d+)/i,
    urlGenerator: (_title: string, source: string) => {
      const match = source.match(/arXiv:(\d+\.\d+)/i)
      return match ? `https://arxiv.org/abs/${match[1]}` : null
    },
  },
  {
    name: 'GitHub',
    pattern: /github\.com\/[^\/]+\/[^\/\s]+/i,
    urlGenerator: (_title: string, source: string) => {
      const match = source.match(/(https?:\/\/github\.com\/[^\/]+\/[^\/\s]+)/i)
      return match ? match[1] : null
    },
  },
  {
    name: 'DOI',
    pattern: /doi:(\S+)/i,
    urlGenerator: (_title: string, source: string) => {
      const match = source.match(/doi:(\S+)/i)
      return match ? `https://doi.org/${match[1]}` : null
    },
  },
]

// Helper function to process citations
const processCitation = (
  title: string,
  source: string,
): { text: string; url: string } | null => {
  for (const citationSource of citationSources) {
    if (citationSource.pattern.test(source)) {
      const url = citationSource.urlGenerator(title, source)
      if (url) {
        return {
          text: `${title} - ${source}`,
          url,
        }
      }
    }
  }
  return null
}

const isValidUrl = (str: string) => {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

const preprocessLaTeX = (content: string) => {
  // This function is kept for backward compatibility but is no longer used
  // The new LaTeX processing is integrated directly into the MarkdownRenderer
  return content
}

const ImplMarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [processedContent, extractedCitations, latexBlocks] = useMemo(() => {
    const citations: CitationLink[] = []

    // First, extract and protect code blocks to prevent LaTeX processing inside them
    const codeBlocks: Array<{ id: string; content: string }> = []
    let modifiedContent = content

    // Protect code blocks (both inline and fenced)
    const codeBlockPatterns = [
      /```[\s\S]*?```/g, // Fenced code blocks
      /`[^`\n]+`/g, // Inline code
    ]

    codeBlockPatterns.forEach(pattern => {
      modifiedContent = modifiedContent.replace(pattern, match => {
        const id = `CODEBLOCK${codeBlocks.length}END`
        codeBlocks.push({ id, content: match })
        return id
      })
    })

    // Then, extract and protect monetary amounts
    const monetaryBlocks: Array<{ id: string; content: string }> = []

    // Protect common monetary patterns
    const monetaryPatterns = [
      /\$\d+(?:,\d{3})*(?:\.\d+)?\s*(?:per\s+(?:million|thousand|token|month|year)|\/(?:month|year|token)|(?:million|thousand|billion|k|K|M|B))\b/g,
      /\$\d+(?:,\d{3})*(?:\.\d+)?\s*(?=\s|$|[.,;!?])/g,
    ]

    monetaryPatterns.forEach(pattern => {
      modifiedContent = modifiedContent.replace(pattern, match => {
        const id = `MONETARY${monetaryBlocks.length}END`
        monetaryBlocks.push({ id, content: match })
        return id
      })
    })

    // Then extract and protect LaTeX blocks
    const latexBlocks: Array<{
      id: string
      content: string
      isBlock: boolean
    }> = []

    // Extract block equations first (they need to be standalone)
    const blockPatterns = [
      { pattern: /\\\[([\s\S]*?)\\\]/g, isBlock: true },
      { pattern: /\$\$([\s\S]*?)\$\$/g, isBlock: true },
    ]

    blockPatterns.forEach(({ pattern, isBlock }) => {
      modifiedContent = modifiedContent.replace(pattern, match => {
        const id = `LATEXBLOCK${latexBlocks.length}END`
        latexBlocks.push({ id, content: match, isBlock })
        return id
      })
    })

    // Process LaTeX patterns (monetary amounts are already protected)
    const inlinePatterns = [
      { pattern: /\\\(([\s\S]*?)\\\)/g, isBlock: false },
      { pattern: /\$(?![{#])[^\$\n]+?\$/g, isBlock: false },
    ]

    inlinePatterns.forEach(({ pattern, isBlock }) => {
      modifiedContent = modifiedContent.replace(pattern, match => {
        const id = `LATEXINLINE${latexBlocks.length}END`
        latexBlocks.push({ id, content: match, isBlock })
        return id
      })
    })

    // Now process citations (LaTeX is already protected)

    // Process references followed by URLs
    const refWithUrlRegex =
      /(?:\[(?:(?:\[?(PDF|DOC|HTML)\]?\s+)?([^\]]+))\]|\b([^.!?\n]+?(?:\s+[-–—]\s+\w+|\s+\([^)]+\)))\b)(?:\s*(?:\(|\[\s*|\s+))(https?:\/\/[^\s)]+)(?:\s*[)\]]|\s|$)/g

    // Process standalone URLs at the end of sentences
    const standaloneUrlRegex = /\s+(https?:\/\/[^\s\]]+)(?=\s*[\].,;:!?\s]|$)/g
    modifiedContent = modifiedContent.replace(
      refWithUrlRegex,
      (_match, docType, bracketText, plainText, url) => {
        const text = bracketText || plainText
        const fullText = (docType ? `[${docType}] ` : '') + text
        const cleanUrl = url.replace(/[.,;:]+$/, '')

        citations.push({ text: fullText.trim(), link: cleanUrl })
        return `[${fullText.trim()}](${cleanUrl})`
      },
    )

    // Process standalone URLs
    modifiedContent = modifiedContent.replace(
      standaloneUrlRegex,
      (match, url) => {
        // Extract a reasonable title from the URL
        const cleanUrl = url.replace(/[.,;:!?]+$/, '')
        const urlParts = cleanUrl.split('/')
        const domain = urlParts[2] || cleanUrl
        const path = urlParts.slice(3).join('/')

        // Try to extract a meaningful title
        let title = domain
        if (path) {
          const pathTitle = path
            .split(/[-_]/)
            .join(' ')
            .replace(/\.[^.]*$/, '')
          if (pathTitle.length > 0 && pathTitle.length < 100) {
            title = pathTitle
          }
        }

        // Check if this URL is already linked
        const alreadyLinked = citations.some(
          citation => citation.link === cleanUrl,
        )
        if (!alreadyLinked) {
          citations.push({ text: title, link: cleanUrl })
          return ` [${title}](${cleanUrl})`
        }
        return match
      },
    )

    // Process quoted paper titles
    const quotedTitleRegex =
      /"([^"]+)"(?:\s+([^.!?\n]+?)(?:\s+[-–—]\s+(?:[A-Z][a-z]+(?:\.[a-z]+)?|\w+:\S+)))/g
    modifiedContent = modifiedContent.replace(
      quotedTitleRegex,
      (match, title, source) => {
        const citation = processCitation(title, source)
        if (citation) {
          citations.push({ text: citation.text.trim(), link: citation.url })
          return `[${citation.text.trim()}](${citation.url})`
        }
        return match
      },
    )

    // Process raw URLs to documents
    const rawUrlRegex =
      /(https?:\/\/[^\s]+\.(?:pdf|doc|docx|ppt|pptx|xls|xlsx))\b/gi
    modifiedContent = modifiedContent.replace(rawUrlRegex, (match, url) => {
      const filename = url.split('/').pop() || url
      const alreadyLinked = citations.some(citation => citation.link === url)
      if (!alreadyLinked) {
        citations.push({ text: filename, link: url })
      }
      return match
    })

    // Restore protected monetary amounts
    monetaryBlocks.forEach(({ id, content }) => {
      modifiedContent = modifiedContent.replace(id, content)
    })

    // Restore protected code blocks
    codeBlocks.forEach(({ id, content }) => {
      modifiedContent = modifiedContent.replace(id, content)
    })

    return [modifiedContent, citations, latexBlocks]
  }, [content])

  const citationLinks = extractedCitations

  interface CodeBlockProps {
    language: string | undefined
    children: string
  }

  const CodeBlock: React.FC<CodeBlockProps> = ({ language, children }) => {
    const [isCopied, setIsCopied] = useState(false)
    const [isWrapped, setIsWrapped] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const { theme } = useTheme()

    // Auto-expand for shorter code blocks
    const shouldShowExpandButton = children.split('\n').length > 20

    const handleCopy = useCallback(async () => {
      try {
        if (!navigator.clipboard) {
          // Fallback for browsers without clipboard API
          const textArea = document.createElement('textarea')
          textArea.value = children
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
        } else {
          await navigator.clipboard.writeText(children)
        }
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
        toast.success('Code copied to clipboard')
      } catch (error) {
        console.error('Failed to copy code:', error)
        toast.error('Failed to copy code')
      }
    }, [children])

    const toggleWrap = useCallback(() => {
      setIsWrapped(prev => !prev)
      toast.success(isWrapped ? 'Code wrap disabled' : 'Code wrap enabled')
    }, [isWrapped])

    const toggleExpand = useCallback(() => {
      setIsExpanded(prev => !prev)
    }, [])

    // Create custom themes without background to prevent override
    const customDarkTheme = {
      ...oneDark,
      'pre[class*="language-"]': {
        ...oneDark['pre[class*="language-"]'],
        background: 'transparent',
        backgroundColor: 'transparent',
      },
      'code[class*="language-"]': {
        ...oneDark['code[class*="language-"]'],
        background: 'transparent',
        backgroundColor: 'transparent',
      },
    }

    const customLightTheme = {
      ...oneLight,
      'pre[class*="language-"]': {
        ...oneLight['pre[class*="language-"]'],
        background: 'transparent',
        backgroundColor: 'transparent',
      },
      'code[class*="language-"]': {
        ...oneLight['code[class*="language-"]'],
        background: 'transparent',
        backgroundColor: 'transparent',
      },
    }

    return (
      <div className="border-border bg-accent group relative my-2 overflow-hidden rounded-md border">
        {/* Header with language and controls */}
        <div className="bg-accent border-border flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            {language && (
              <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {language}
              </span>
            )}
            <span className="text-muted-foreground text-xs">
              {children.split('\n').length} lines
            </span>
          </div>

          {/* Controls */}
          <div className="flex gap-1">
            <button
              onClick={toggleWrap}
              className={cn(
                'border-border bg-background rounded border p-1 shadow-sm transition-colors',
                isWrapped
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title={isWrapped ? 'Disable wrap' : 'Enable wrap'}
            >
              {isWrapped ? (
                <ArrowLeftRight size={12} />
              ) : (
                <WrapText size={12} />
              )}
            </button>
            <button
              onClick={handleCopy}
              className={cn(
                'border-border bg-background rounded border p-1 shadow-sm transition-colors',
                isCopied
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title={isCopied ? 'Copied!' : 'Copy code'}
            >
              {isCopied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        <div
          className={cn(
            'relative',
            shouldShowExpandButton && !isExpanded && 'max-h-96 overflow-hidden',
          )}
        >
          <SyntaxHighlighter
            language={language || 'text'}
            style={theme === 'dark' ? customDarkTheme : customLightTheme}
            customStyle={{
              margin: 0,
              padding: isWrapped ? '1rem' : '1rem 1rem 1rem 0',
              paddingLeft: isWrapped ? '1rem' : '0',
              backgroundColor: 'transparent !important',
              fontSize: '0.875rem',
              lineHeight: '1.6',
              fontFamily: monoFontFamily,
            }}
            showLineNumbers={!isWrapped}
            lineNumberStyle={{
              color: 'hsl(var(--muted-foreground))',
              paddingRight: '1rem',
              minWidth: '2.5rem',
              textAlign: 'right',
              userSelect: 'none',
              fontFamily: monoFontFamily,
              fontSize: '0.75rem',
            }}
            codeTagProps={{
              style: {
                fontFamily: monoFontFamily,
                whiteSpace: isWrapped ? 'pre-wrap' : 'pre',
                wordBreak: isWrapped ? 'break-word' : 'normal',
                overflowWrap: isWrapped ? 'break-word' : 'normal',
                overflowX: isWrapped ? 'visible' : 'auto',
              },
            }}
            wrapLongLines={isWrapped}
          >
            {children}
          </SyntaxHighlighter>

          {/* Fade overlay for collapsed long code blocks */}
          {shouldShowExpandButton && !isExpanded && (
            <div className="from-muted pointer-events-none absolute right-0 bottom-0 left-0 h-12 bg-gradient-to-t to-transparent">
              <div className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2 transform">
                <button
                  onClick={toggleExpand}
                  className={cn(
                    'bg-background/90 border-border/50 rounded-lg border px-4 py-2 text-xs font-medium backdrop-blur-sm transition-all',
                    'text-muted-foreground hover:text-foreground hover:bg-accent/80 hover:border-border',
                  )}
                  title="Expand code block"
                >
                  Expand
                </button>
              </div>
            </div>
          )}

          {/* Collapse button for expanded long code blocks */}
          {shouldShowExpandButton && isExpanded && (
            <div className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2 transform">
              <button
                onClick={toggleExpand}
                className={cn(
                  'bg-background/90 border-border/50 rounded-lg border px-4 py-2 text-xs font-medium backdrop-blur-sm transition-all',
                  'text-muted-foreground hover:text-foreground hover:bg-accent/80 hover:border-border',
                )}
                title="Collapse code block"
              >
                Collapse
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  CodeBlock.displayName = 'CodeBlock'

  const InlineCode: React.FC<{ code: string }> = ({ code }) => {
    const [isCopied, setIsCopied] = useState(false)

    const handleCopy = useCallback(async () => {
      try {
        if (!navigator.clipboard) {
          // Fallback for browsers without clipboard API
          const textArea = document.createElement('textarea')
          textArea.value = code
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
        } else {
          await navigator.clipboard.writeText(code)
        }
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 1500)
        toast.success('Code copied to clipboard')
      } catch (error) {
        console.error('Failed to copy code:', error)
        toast.error('Failed to copy code')
      }
    }, [code])

    return (
      <code
        className={cn(
          'inline rounded px-1 py-0.5 font-mono text-[0.9em]',
          'bg-muted/50',
          'text-foreground/85',
          'before:content-none after:content-none',
          'hover:bg-muted/70 cursor-pointer transition-colors duration-150',
          'align-baseline',
          isCopied && 'ring-primary/30 bg-primary/5 ring-1',
        )}
        style={{
          fontFamily: monoFontFamily,
          fontSize: '0.85em',
          lineHeight: 'inherit',
        }}
        onClick={handleCopy}
        title={isCopied ? 'Copied!' : 'Click to copy'}
      >
        {code}
      </code>
    )
  }

  InlineCode.displayName = 'InlineCode'

  const LinkPreview = ({ href, title }: { href: string; title?: string }) => {
    const domain = new URL(href).hostname

    return (
      <div className="bg-accent m-0 flex flex-col text-xs">
        <div className="text-muted-foreground flex h-6 items-center space-x-1.5 px-2 pt-2 text-xs">
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
            alt=""
            width={12}
            height={12}
            className="rounded-sm"
          />
          <span className="truncate font-medium">{domain}</span>
        </div>
        {title && (
          <div className="px-2 pt-1 pb-2">
            <h3 className="text-foreground m-0 line-clamp-3 text-sm font-normal">
              {title}
            </h3>
          </div>
        )}
      </div>
    )
  }

  const renderHoverCard = (
    href: string,
    text: React.ReactNode,
    isCitation: boolean = false,
    citationText?: string,
  ) => {
    const title = citationText || (typeof text === 'string' ? text : '')

    return (
      <HoverCard openDelay={10}>
        <HoverCardTrigger asChild>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={
              isCitation
                ? 'text-primary bg-primary/10 hover:bg-primary/20 focus:ring-primary m-0! inline-flex -translate-y-[1px] cursor-pointer items-center rounded-sm px-1.25 py-0.5 align-baseline text-xs leading-none font-medium no-underline focus:ring-1 focus:outline-none'
                : 'text-primary bg-primary/10 font-medium no-underline hover:underline'
            }
          >
            {text}
          </a>
        </HoverCardTrigger>
        <HoverCardContent
          side="top"
          align="start"
          sideOffset={5}
          className="border-primary/30 bg-background w-64 overflow-hidden rounded-md border p-0 shadow-lg"
        >
          <LinkPreview href={href} title={title} />
        </HoverCardContent>
      </HoverCard>
    )
  }

  const generateKey = () => {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    )
  }

  const renderCitation = (
    index: number,
    citationText: string,
    href: string,
  ) => {
    return (
      <span
        className="relative inline-flex items-baseline whitespace-normal"
        key={generateKey()}
      >
        {renderHoverCard(href, index + 1, true, citationText)}
      </span>
    )
  }

  const renderer: Partial<ReactRenderer> = {
    text(text: string) {
      // Check if this text contains any LaTeX placeholders
      const blockPattern = /LATEXBLOCK(\d+)END/g
      const inlinePattern = /LATEXINLINE(\d+)END/g

      // If no LaTeX placeholders, return text as-is
      if (!blockPattern.test(text) && !inlinePattern.test(text)) {
        return text
      }

      // Reset regex state
      blockPattern.lastIndex = 0
      inlinePattern.lastIndex = 0

      // Process the text to replace placeholders with LaTeX components
      const components: any[] = []
      let lastEnd = 0

      // Collect all matches (both block and inline)
      const allMatches: Array<{ match: RegExpExecArray; isBlock: boolean }> = []

      let match
      while ((match = blockPattern.exec(text)) !== null) {
        allMatches.push({ match, isBlock: true })
      }

      while ((match = inlinePattern.exec(text)) !== null) {
        allMatches.push({ match, isBlock: false })
      }

      // Sort matches by position
      allMatches.sort((a, b) => a.match.index - b.match.index)

      // Process matches in order
      allMatches.forEach(({ match, isBlock }) => {
        const fullMatch = match[0]
        const start = match.index

        // Add text before this match
        if (start > lastEnd) {
          const textContent = text.slice(lastEnd, start)
          components.push(
            <span key={`text-${components.length}-${generateKey()}`}>
              {textContent}
            </span>,
          )
        }

        // Find the corresponding LaTeX block
        const latexBlock = latexBlocks.find(block => block.id === fullMatch)
        if (latexBlock) {
          if (isBlock) {
            // Don't wrap block equations in div here - let paragraph handler do it
            components.push(
              <Latex
                key={`latex-${components.length}-${generateKey()}`}
                delimiters={[
                  { left: '$$', right: '$$', display: true },
                  { left: '\\[', right: '\\]', display: true },
                ]}
                strict={false}
              >
                {latexBlock.content}
              </Latex>,
            )
          } else {
            components.push(
              <Latex
                key={`latex-${components.length}-${generateKey()}`}
                delimiters={[
                  { left: '$', right: '$', display: false },
                  { left: '\\(', right: '\\)', display: false },
                ]}
                strict={false}
              >
                {latexBlock.content}
              </Latex>,
            )
          }
        } else {
          components.push(
            <span key={`fallback-${components.length}-${generateKey()}`}>
              {fullMatch}
            </span>,
          ) // fallback
        }

        lastEnd = start + fullMatch.length
      })

      // Add any remaining text
      if (lastEnd < text.length) {
        const textContent = text.slice(lastEnd)
        components.push(
          <span key={`text-final-${components.length}-${generateKey()}`}>
            {textContent}
          </span>,
        )
      }

      return components.length === 1 ? (
        components[0]
      ) : (
        <Fragment key={generateKey()}>{components}</Fragment>
      )
    },
    paragraph(children) {
      // Check if the paragraph contains only a LaTeX block placeholder
      if (typeof children === 'string') {
        const blockMatch = children.match(/^LATEXBLOCK(\d+)END$/)
        if (blockMatch) {
          const latexBlock = latexBlocks.find(block => block.id === children)
          if (latexBlock && latexBlock.isBlock) {
            // Render block equations outside of paragraph tags
            return (
              <div className="my-6 text-center" key={generateKey()}>
                <Latex
                  delimiters={[
                    { left: '$$', right: '$$', display: true },
                    { left: '\\[', right: '\\]', display: true },
                  ]}
                  strict={false}
                >
                  {latexBlock.content}
                </Latex>
              </div>
            )
          }
        }
      }

      return (
        <p key={generateKey()} className="text-foreground my-2 leading-relaxed">
          {children}
        </p>
      )
    },
    code(children, language) {
      // This handles fenced code blocks (```)
      return (
        <CodeBlock language={language} key={generateKey()}>
          {String(children)}
        </CodeBlock>
      )
    },
    codespan(code) {
      // This handles inline code (`code`)
      const codeString = typeof code === 'string' ? code : String(code || '')
      return <InlineCode key={generateKey()} code={codeString} />
    },
    link(href, text) {
      const citationIndex = citationLinks.findIndex(link => link.link === href)
      if (citationIndex !== -1) {
        // For citations, show the citation text in the hover card
        const citationText = citationLinks[citationIndex].text
        return renderCitation(citationIndex, citationText, href)
      }
      return isValidUrl(href) ? (
        renderHoverCard(href, text)
      ) : (
        <a
          key={generateKey()}
          href={href}
          className="text-primary font-medium hover:underline"
        >
          {text}
        </a>
      )
    },
    heading(children, level) {
      const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements
      const sizeClasses =
        {
          1: 'text-2xl md:text-3xl font-extrabold mt-4 mb-4',
          2: 'text-xl md:text-2xl font-bold mt-4 mb-3',
          3: 'text-lg md:text-xl font-semibold mt-4 mb-3',
          4: 'text-base md:text-lg font-medium mt-4 mb-2',
          5: 'text-sm md:text-base font-medium mt-4 mb-2',
          6: 'text-xs md:text-sm font-medium mt-4 mb-2',
        }[level] || ''

      return (
        <HeadingTag
          key={generateKey()}
          className={`${sizeClasses} text-foreground tracking-tight`}
        >
          {children}
        </HeadingTag>
      )
    },
    list(children, ordered) {
      const ListTag = ordered ? 'ol' : 'ul'
      return (
        <ListTag
          key={generateKey()}
          className={`text-foreground my-2 space-y-2 pl-6 ${ordered ? 'list-decimal' : 'list-disc'}`}
        >
          {children}
        </ListTag>
      )
    },
    listItem(children) {
      return (
        <li key={generateKey()} className="pl-1 leading-relaxed">
          {children}
        </li>
      )
    },
    blockquote(children) {
      return (
        <blockquote
          key={generateKey()}
          className="border-primary/30 text-foreground bg-muted/50 my-6 rounded-r-md border-l-4 py-1 pl-4 italic"
        >
          {children}
        </blockquote>
      )
    },
    table(children) {
      return (
        <Table key={generateKey()} className="!m-0 !rounded-lg !border">
          {children}
        </Table>
      )
    },
    tableRow(children) {
      return <TableRow key={generateKey()}>{children}</TableRow>
    },
    tableCell(children, flags) {
      const alignClass = flags.align ? `text-${flags.align}` : 'text-left'
      const isHeader = flags.header

      return isHeader ? (
        <TableHead
          key={generateKey()}
          className={cn(
            alignClass,
            'border-border bg-muted/50 !m-1 border-r !p-2 font-semibold !text-wrap last:border-r-0',
          )}
        >
          {children}
        </TableHead>
      ) : (
        <TableCell
          key={generateKey()}
          className={cn(
            alignClass,
            'border-border !m-1 border-r !p-2 !text-wrap last:border-r-0',
          )}
        >
          {children}
        </TableCell>
      )
    },
    tableHeader(children) {
      return (
        <TableHeader key={generateKey()} className="!m-1 !p-1">
          {children}
        </TableHeader>
      )
    },
    tableBody(children) {
      return (
        <TableBody key={generateKey()} className="!m-1 !text-wrap">
          {children}
        </TableBody>
      )
    },
  }

  return (
    <div className="markdown-body prose prose-neutral dark:prose-invert text-foreground mb-3 max-w-none font-sans">
      <Marked renderer={renderer}>{processedContent}</Marked>
    </div>
  )
}

export const CopyButton = ({ text }: { text: string }) => {
  const [isCopied, setIsCopied] = useState(false)

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        if (!navigator.clipboard) {
          return
        }
        await navigator.clipboard.writeText(text)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
        toast.success('Copied to clipboard')
      }}
      className="h-8 rounded-full px-2 text-xs"
    >
      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  )
}

const MarkdownRenderer = React.memo(ImplMarkdownRenderer)

export { MarkdownRenderer, preprocessLaTeX }
