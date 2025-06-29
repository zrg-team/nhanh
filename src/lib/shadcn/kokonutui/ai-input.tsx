'use client'

import { ChangeEvent, KeyboardEvent, useState, MouseEvent, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from 'src/lib/utils'
import { Textarea } from 'src/lib/shadcn/ui/textarea'
import LazyIcon from 'src/components/atoms/LazyIcon'

import { useAutoResizeTextarea } from './use-auto-resize-textarea'
import { BorderBeam } from '../ui/border-beam'

const MIN_HEIGHT = 48
const MAX_HEIGHT = 164

const AIInput = memo(
  ({
    onSubmit,
    disabled,
    enableTool,
    enableFile,
    placeholder,
    minHeight,
    maxHeight,
    className,
    onStop,
    onChange,
    onClearChat,
    value,
    isLoading,
    inProgressMessage,
  }: {
    isLoading?: boolean
    inProgressMessage?: boolean
    className?: string
    value?: string
    disabled?: boolean
    placeholder?: string
    enableTool?: boolean
    enableFile?: boolean
    minHeight?: number
    maxHeight?: number
    height?: number
    onClearChat?: () => void
    onStop?: () => void
    onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void
    onSubmit: (
      input: string,
      e: KeyboardEvent<HTMLTextAreaElement> | MouseEvent<HTMLButtonElement>,
      selectedItem?: string[],
    ) => Promise<boolean>
  }) => {
    const [loading, setLoading] = useState(false)
    const [innerValue, setInnerValue] = useState('')
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
      minHeight: minHeight || MIN_HEIGHT,
      maxHeight: maxHeight || MAX_HEIGHT,
    })
    const [showSearch, setShowSearch] = useState(true)

    const handleSubmit = useCallback(
      async (e: KeyboardEvent<HTMLTextAreaElement> | MouseEvent<HTMLButtonElement>) => {
        try {
          setLoading(true)
          const result = await onSubmit(innerValue, e)
          if (result) {
            setInnerValue('')
          }
        } finally {
          setLoading(false)
        }
      },
      [innerValue, onSubmit],
    )

    return (
      <div className={cn('w-full py-4 max-w-xl', className)}>
        <div className="relative w-full mx-auto">
          {isLoading ? <BorderBeam className="rounded-xl" /> : null}
          <div className="bg-black/5 dark:bg-white/5 rounded-xl rounded-bl-none rounded-br-none">
            <div className="flex justify-between items-center px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
              <div className="relative" data-model-menu>
                {onClearChat ? (
                  <button
                    type="button"
                    onClick={onClearChat}
                    className="flex items-center gap-1.5 rounded-lg py-1"
                  >
                    <LazyIcon
                      name="trash"
                      className="w-4 h-4 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                    />
                    <span className="dark:text-white">Clear Chat</span>
                  </button>
                ) : undefined}
              </div>
            </div>
          </div>
          <div className="relative flex flex-col">
            <Textarea
              value={(onChange ? value : innerValue) || ''}
              disabled={disabled || loading}
              placeholder={placeholder}
              className={cn(
                'w-full rounded-xl rounded-tl-none rounded-tr-none rounded-b-none px-4 py-3 bg-black/5 dark:bg-white/5 border-none dark:text-white placeholder:text-black/70 dark:placeholder:text-white/70 resize-none focus-visible:ring-0 leading-[1.2]',
                'flex-1',
              )}
              ref={textareaRef}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              onChange={(e) => {
                if (!onChange) {
                  setInnerValue(e.target.value)
                }
                adjustHeight()
                onChange?.(e)
              }}
            />

            <div className="h-12 bg-black/5 dark:bg-white/5 rounded-b-xl">
              <div className="absolute left-3 bottom-3 flex items-center gap-2">
                {enableFile ? (
                  <label className="cursor-pointer rounded-lg p-2 bg-black/5 dark:bg-white/5">
                    <input type="file" className="hidden" />
                    <LazyIcon
                      name="paperclip"
                      className="w-4 h-4 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                    />
                  </label>
                ) : undefined}
                {enableTool ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowSearch(!showSearch)
                    }}
                    className={cn(
                      'rounded-full transition-all flex items-center gap-2 px-1.5 py-1 border h-8',
                      showSearch
                        ? 'bg-sky-500/15 border-sky-400 text-sky-500'
                        : 'bg-black/5 dark:bg-white/5 border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white',
                    )}
                  >
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <motion.div
                        animate={{
                          rotate: showSearch ? 180 : 0,
                          scale: showSearch ? 1.1 : 1,
                        }}
                        whileHover={{
                          rotate: showSearch ? 180 : 15,
                          scale: 1.1,
                          transition: {
                            type: 'spring',
                            stiffness: 300,
                            damping: 10,
                          },
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 260,
                          damping: 25,
                        }}
                      >
                        <LazyIcon
                          name="globe"
                          className={cn('w-4 h-4', showSearch ? 'text-sky-500' : 'text-inherit')}
                        />
                      </motion.div>
                    </div>
                    <AnimatePresence>
                      {showSearch && (
                        <motion.span
                          initial={{ width: 0, opacity: 0 }}
                          animate={{
                            width: 'auto',
                            opacity: 1,
                          }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-sm overflow-hidden whitespace-nowrap text-sky-500 flex-shrink-0"
                        >
                          Search
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                ) : undefined}
              </div>

              <div className="absolute right-3 bottom-3">
                <button
                  type="button"
                  disabled={(disabled || loading) && !inProgressMessage}
                  onClick={(e) => {
                    if (inProgressMessage) {
                      onStop?.()
                      return
                    }
                    handleSubmit(e)
                  }}
                  className={cn(
                    'rounded-lg p-2',
                    (onChange && value) || innerValue
                      ? 'bg-sky-500/15 text-sky-500'
                      : 'bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white',
                  )}
                >
                  <LazyIcon name={inProgressMessage ? 'pause' : 'send'} className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
)

export default AIInput
