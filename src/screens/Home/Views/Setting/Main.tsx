import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'

import Basic from './settings/Basic'
import Player from './settings/Player'
import List from './settings/List'
import Backup from './settings/Backup'
import Other from './settings/Other'
import Theme from './settings/Theme'
import Sync from './settings/Sync'

// 去掉 sync，把 theme 移到 list 后面
export const SETTING_SCREENS = [
  'basic',
  'player',
  'theme',
  'list',
  'backup',
  'sync',
  'other',
] as const

export type SettingScreenIds = typeof SETTING_SCREENS[number]

export interface MainType {
  setActiveId: (id: SettingScreenIds) => void
}

const Main = forwardRef<MainType, {}>((props, ref) => {
  const [id, setId] = useState(
    (SETTING_SCREENS as readonly string[]).includes(global.lx.settingActiveId)
      ? global.lx.settingActiveId as SettingScreenIds
      : 'basic'
  )

  useImperativeHandle(ref, () => ({
    setActiveId(id) {
      setId(id)
    },
  }))

  const component = useMemo(() => {
    switch (id) {
      case 'player': return <Player />
      case 'theme': return <Theme />
      case 'list': return <List />
      case 'sync': return <Sync />
      case 'backup': return <Backup />
      case 'other': return <Other />
      case 'basic':
      default: return <Basic />
    }
  }, [id])

  return component
})

export default Main
