'use client'

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import LazyIcon from 'src/components/atoms/LazyIcon'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from 'src/lib/shadcn/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from 'src/lib/shadcn/ui/sidebar'
import { getRouteURL } from 'src/utils/routes'

export function NavDocuments({
  items,
}: {
  items: {
    title: string
    icon?: JSX.Element
    isActive?: boolean
    items?: {
      title: string
      id: string
    }[]
  }[]
}) {
  const { t } = useTranslation('documents')

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <div className="text-sm">{t('title')}</div>
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton className="cursor-pointer" tooltip={t(item.title)}>
                  {item.icon}
                  <span>{t(item.title)}</span>
                  <LazyIcon
                    name="chevron-right"
                    className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                  />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem className="cursor-pointer" key={t(subItem.title)}>
                      <SidebarMenuSubButton asChild>
                        <Link to={getRouteURL('document', { documentId: subItem.id })}>
                          <span>{t(subItem.title)}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
