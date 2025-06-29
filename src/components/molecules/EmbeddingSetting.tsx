import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from 'src/lib/shadcn/ui/label'
import { Button } from 'src/lib/shadcn/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/lib/shadcn/ui/select'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from 'src/lib/shadcn/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from 'src/lib/shadcn/ui/popover'
import { cn } from 'src/lib/utils'
import { Alert } from 'src/lib/shadcn/ui/alert'
import { Input } from 'src/lib/shadcn/ui/input'
import { EmbeddingProviderEnum, LLMProviderEnum } from 'src/services/database/types'
import { GOOGLE_GENERATIVE_AI_API_KEY_LINK, OPEN_AI_API_KEY_LINK } from 'src/constants/llm'
import { useConfirmPassphrase } from 'src/hooks/mutations/use-confirm-passphrase'
import secureSession from 'src/utils/secure-session'
import { decryptSymmetric } from 'src/utils/aes'
import { useAppState } from 'src/states/app'
import { useShallow } from 'zustand/react/shallow'

import LazyIcon from '../atoms/LazyIcon'

export const EmbeddingSetting = memo(
  (props: {
    name?: string
    className?: string
    provider?: `${EmbeddingProviderEnum}`
    encrypted?: Record<string, unknown>
    options?: Record<string, unknown>
    supportedProviders?: `${EmbeddingProviderEnum}`[]
    onChangeOptions?: (data: {
      provider?: `${EmbeddingProviderEnum}`
      options?: Record<string, unknown>
      encrypted?: Record<string, unknown>
    }) => Promise<void>
  }) => {
    const theme = useAppState(useShallow((state) => state.theme))
    const [show, setShow] = useState(false)
    const [provider, setProvider] = useState<`${EmbeddingProviderEnum}`>(
      props.provider || EmbeddingProviderEnum.Local,
    )
    const [options, setOptions] = useState<Record<string, unknown>>({})
    const [encrypted, setEncrypted] = useState<Record<string, unknown>>({})
    const { confirmPassphrase } = useConfirmPassphrase()
    const { t } = useTranslation('atoms')

    const handleOpenChange = async () => {
      if (!show) {
        if (Object.keys(props.encrypted || {})?.length) {
          await confirmPassphrase()
          const decrypted: Record<string, unknown> = {}
          const passphrase = await secureSession.get('passphrase')
          if (!passphrase) {
            throw new Error('Passphrase is not found')
          }
          await Promise.all(
            Object.keys(props.encrypted || {}).map(async (key) => {
              if (props.encrypted?.[key]) {
                decrypted[key] = await decryptSymmetric(
                  props.encrypted?.[key] as string,
                  passphrase!,
                )
              }
            }),
          )
          setEncrypted(decrypted || {})
        }
        setOptions({ ...props.options })
      } else {
        setOptions({})
        setEncrypted({})
        setProvider(EmbeddingProviderEnum.Local)
      }
      setShow(!show)
    }

    const hanleSubmit = () => {
      props.onChangeOptions?.({
        provider,
        options,
        encrypted: encrypted,
      })
      setShow(false)
    }

    return (
      <div className={cn('min-w-20 flex justify-end', props.className)}>
        <Popover open={show} onOpenChange={setShow}>
          <PopoverTrigger>
            <div className="flex justify-end gap-2 !cursor-pointer">
              <Button
                onClick={handleOpenChange}
                variant="link"
                className="flex items-center px-0 !cursor-pointer"
              >
                <LazyIcon name="settings" />
                <Label className={cn(theme === 'dark' ? 'text-background' : 'text-primary')}>
                  {t('embedding_setting.title')}
                </Label>
              </Button>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            {show ? (
              <Card className="!border-none max-w-96 min-w-56 !bg-inherit !text-current">
                <CardHeader>
                  <CardTitle>{t('embedding_setting.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Label>{t('embedding_setting.provider')}:</Label>
                  <Select
                    value={provider ? `${provider}` : EmbeddingProviderEnum.Local}
                    onValueChange={(value) => setProvider(value as EmbeddingProviderEnum)}
                  >
                    <SelectTrigger className="">
                      <SelectValue placeholder={t('embedding_setting.provider_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key="local_transformers" value={EmbeddingProviderEnum.Local}>
                        {t('embedding_setting.providers.local_transformers')}
                      </SelectItem>
                      {props.supportedProviders?.map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {t(`embedding_setting.providers.${provider.toLowerCase()}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!props.supportedProviders?.length ? (
                    <Label className="text-red-500 !pt-2">
                      {t('embedding_setting.alerts.no_provider')}
                    </Label>
                  ) : undefined}
                  <>
                    {provider && provider !== EmbeddingProviderEnum.Local ? (
                      <>
                        <Alert variant="destructive" className="mt-4">
                          {t('embedding_setting.alerts.session_passkey')}
                        </Alert>
                        <div className="mt-4">
                          <Label>{t('embedding_setting.encrypted_fields.api_key')}</Label>
                          <Button variant="link" className="px-1">
                            <a
                              href={
                                provider === LLMProviderEnum.OpenAI
                                  ? OPEN_AI_API_KEY_LINK
                                  : GOOGLE_GENERATIVE_AI_API_KEY_LINK
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              (
                              {provider === LLMProviderEnum.OpenAI
                                ? OPEN_AI_API_KEY_LINK
                                : GOOGLE_GENERATIVE_AI_API_KEY_LINK}
                              )
                            </a>
                          </Button>
                          <Input
                            type="password"
                            value={encrypted?.key ? `${encrypted?.key}` : ''}
                            onChange={(e) =>
                              setEncrypted((pre) => ({
                                ...pre,
                                key: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </>
                    ) : undefined}
                  </>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="secondary" onClick={hanleSubmit}>
                    {t('embedding_setting.save')}
                  </Button>
                </CardFooter>
              </Card>
            ) : undefined}
          </PopoverContent>
        </Popover>
      </div>
    )
  },
)
