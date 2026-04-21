/**
 * TV 主页
 */
import { useEffect, useState, memo, useCallback, useRef } from 'react'
import { View, StyleSheet, DeviceEventEmitter } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useNavActiveId, useStatusbarHeight } from '@/store/common/hook'
import { useIsPlay, usePlayerMusicInfo } from '@/store/player/hook'
import { Icon } from '@/components/common/Icon'
import Image from '@/components/common/Image'
import TVButton, { type TVButtonType } from '@/components/common/TVButton'
import TVExitDialog, { type TVExitDialogType } from '@/components/common/TVExitDialog'
import TVConfirmDialog, { type TVConfirmDialogType } from '@/components/common/TVConfirmDialog'
import { exitApp, setNavActiveId } from '@/core/common'
import { toast } from '@/utils/tools'
import { useBackHandler } from '@/utils/hooks/useBackHandler'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import { NAV_MENUS } from '@/config/constant'
import type { InitState } from '@/store/common/state'

import TVSearchPanel, { type TVSearchPanelType } from './panels/TVSearchPanel'
import TVSongListPanel, { type TVSongListPanelType } from './panels/TVSongListPanel'
import TVLeaderboardGridPanel, { type TVLeaderboardGridPanelType } from './panels/TVLeaderboardGridPanel'
import TVMyListGridPanel, { type TVMyListGridPanelType } from './panels/TVMyListGridPanel'
import TVSettingPanel, { type TVSettingPanelType } from './panels/TVSettingPanel'

type NavId = InitState['navActiveId']

// ─── 焦点状态追踪（全局，不需要 React state）────────────────────────────────
// 'topbar'  = 焦点在当前面板顶部栏
// 'content' = 焦点在内容区
// 'sidebar' = 焦点在左侧栏
type FocusZone = 'topbar' | 'content' | 'sidebar'
let gFocusZone: FocusZone = 'topbar'
export const setFocusZone = (zone: FocusZone) => { gFocusZone = zone }

// ─────────────────────────────────────────────────────────────────────────────
// 左侧边栏
// ─────────────────────────────────────────────────────────────────────────────
interface SidebarProps {
  onExitPress: () => void
  // 每个菜单按钮的 ref，供 back handler 调用 requestFocus
  navBtnRefs: React.MutableRefObject<Map<string, TVButtonType>>
  playBtnRef: React.RefObject<TVButtonType>
}

const Sidebar = memo(({ onExitPress, navBtnRefs, playBtnRef }: SidebarProps) => {
  const theme = useTheme()
  const activeId = useNavActiveId()
  const statusBarHeight = useStatusbarHeight()
  const isPlay = useIsPlay()
  const musicInfo = usePlayerMusicInfo()

  const openPlayDetail = () => {
    if (commonState.componentIds.home) {
      navigations.pushPlayDetailScreen(commonState.componentIds.home)
    }
  }

  const handleNav = (id: string) => {
    if (id === 'nav_exit') { onExitPress(); return }
    setFocusZone('topbar')
    setNavActiveId(id as NavId)
  }

  return (
    <View style={[
      s.sidebar,
      {
        paddingTop: statusBarHeight + 8,
        backgroundColor: theme['c-content-background'],
        borderRightColor: theme['c-border-background'],
      },
    ]}>
      {/* 播放图标（顶部） */}
      <TVButton
        ref={playBtnRef}
        style={s.sideBtn}
        onPress={openPlayDetail}
        onFocus={() => setFocusZone('sidebar')}
      >
        <View style={[s.sidePic, { backgroundColor: theme['c-border-background'] }]}>
          {musicInfo.pic
            ? <Image url={musicInfo.pic} style={s.sidePicImg} />
            : <Icon name={isPlay ? 'pause' : 'play'} size={20} color={theme['c-primary']} />
          }
        </View>
      </TVButton>

      <View style={[s.divider, { backgroundColor: theme['c-border-background'] }]} />

      {/* 导航菜单 */}
      <View style={s.navItems}>
        {NAV_MENUS.map(menu => {
          const active = activeId === menu.id
          const iconName = menu.id === 'nav_search' ? 'search-2' : menu.icon
          return (
            <TVButton
              key={menu.id}
              ref={el => {
                if (el) navBtnRefs.current.set(menu.id, el)
                else navBtnRefs.current.delete(menu.id)
              }}
              style={[s.sideBtn, active && { ...s.sideBtnActive, borderLeftColor: theme['c-primary'] }]}
              onPress={() => handleNav(menu.id)}
              onFocus={() => setFocusZone('sidebar')}
            >
              <Icon name={iconName} size={22} color={active ? theme['c-primary'] : theme['c-font-label']} />
            </TVButton>
          )
        })}
      </View>
    </View>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// 内容区
// ─────────────────────────────────────────────────────────────────────────────
interface ContentAreaProps {
  searchRef: React.RefObject<TVSearchPanelType>
  songlistRef: React.RefObject<TVSongListPanelType>
  leaderboardRef: React.RefObject<TVLeaderboardGridPanelType>
  mylistRef: React.RefObject<TVMyListGridPanelType>
  settingRef: React.RefObject<TVSettingPanelType>
}

const ContentArea = memo(({
  searchRef, songlistRef, leaderboardRef, mylistRef, settingRef,
}: ContentAreaProps) => {
  const [id, setId] = useState(commonState.navActiveId)

  useEffect(() => {
    const handler = (newId: NavId) => { setId(newId) }
    global.state_event.on('navActiveIdUpdated', handler)
    return () => { global.state_event.off('navActiveIdUpdated', handler) }
  }, [])

  return (
    <View style={s.content}>
      <View style={[s.panel, id !== 'nav_search' && s.hidden]}>
        <TVSearchPanel ref={searchRef} />
      </View>
      <View style={[s.panel, id !== 'nav_songlist' && s.hidden]}>
        <TVSongListPanel ref={songlistRef} />
      </View>
      <View style={[s.panel, id !== 'nav_top' && s.hidden]}>
        <TVLeaderboardGridPanel ref={leaderboardRef} />
      </View>
      <View style={[s.panel, id !== 'nav_love' && s.hidden]}>
        <TVMyListGridPanel ref={mylistRef} />
      </View>
      <View style={[s.panel, id !== 'nav_setting' && s.hidden]}>
        <TVSettingPanel ref={settingRef} />
      </View>
    </View>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// 主布局
// ─────────────────────────────────────────────────────────────────────────────
export default memo(() => {
  const theme = useTheme()
  const exitDialogRef = useRef<TVExitDialogType>(null)
  const confirmDialogRef = useRef<TVConfirmDialogType>(null)
  const lastBackPressRef = useRef<number>(0)

  useEffect(() => {
    global.lx.showConfirmDialog = (options) => {
      confirmDialogRef.current?.show(options)
    }
    return () => {
      global.lx.showConfirmDialog = undefined
    }
  }, [])

  // panel refs
  const searchRef      = useRef<TVSearchPanelType>(null)
  const songlistRef    = useRef<TVSongListPanelType>(null)
  const leaderboardRef = useRef<TVLeaderboardGridPanelType>(null)
  const mylistRef      = useRef<TVMyListGridPanelType>(null)
  const settingRef     = useRef<TVSettingPanelType>(null)

  // sidebar refs
  const navBtnRefs = useRef<Map<string, TVButtonType>>(new Map())
  const playBtnRef = useRef<TVButtonType>(null)

  // 全局菜单键：MENU 键跳播放详情
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('tvMenuKey', () => {
      if (commonState.componentIds.home) {
        navigations.pushPlayDetailScreen(commonState.componentIds.home)
      }
    })
    return () => { sub.remove() }
  }, [])

  // 播放详情页即将 pop，提前把焦点还给侧边栏播放按钮
  useEffect(() => {
    const handler = () => {
      setFocusZone('sidebar')
      playBtnRef.current?.requestFocus()
    }
    global.state_event.on('tvPlayDetailWillPop', handler)
    return () => { global.state_event.off('tvPlayDetailWillPop', handler) }
  }, [])

  // TVMusicDetail（歌单/排行榜/我的列表详情）即将 pop，提前把焦点设回原来点击的卡片
  useEffect(() => {
    const handler = () => {
      const currentId = commonState.navActiveId
      const panel = (() => {
        switch (currentId) {
          case 'nav_songlist': return songlistRef.current
          case 'nav_top':     return leaderboardRef.current
          case 'nav_love':    return mylistRef.current
          default: return null
        }
      })()
      if (panel && 'restoreFocus' in panel && typeof (panel as any).restoreFocus === 'function') {
        setFocusZone('content')
        ;(panel as any).restoreFocus()
      } else {
        setFocusZone('sidebar')
        navBtnRefs.current.get(currentId)?.requestFocus()
      }
    }
    global.state_event.on('tvMusicDetailWillPop', handler)
    return () => { global.state_event.off('tvMusicDetailWillPop', handler) }
  }, [])

  const handleExitPress = useCallback(() => {
    exitDialogRef.current?.show(() => exitApp('Exit Btn'))
  }, [])

  // 获取当前面板的 focusTopBar 方法
  const getPanelRef = useCallback((id: NavId) => {
    switch (id) {
      case 'nav_search':   return searchRef.current
      case 'nav_songlist': return songlistRef.current
      case 'nav_top':      return leaderboardRef.current
      case 'nav_love':     return mylistRef.current
      case 'nav_setting':  return settingRef.current
      default: return null
    }
  }, [])

  const handleBack = useCallback(() => {
    const currentId = commonState.navActiveId

    // ── 层级 1：弹窗由 Modal onRequestClose 自动处理，此处检查我的列表弹窗 ──
    if (currentId === 'nav_love') {
      const panel = mylistRef.current
      if (panel?.isDialogVisible()) {
        panel.closeDialog()
        return true
      }
    }
    // 歌单筛选弹窗
    if (currentId === 'nav_songlist') {
      const panel = songlistRef.current
      if (panel?.isFilterVisible()) {
        panel.closeFilter()
        return true
      }
    }

    // ── 层级 2：搜索页特殊处理 → 任何位置直接推到侧边栏搜索图标 ──
    if (currentId === 'nav_search' && gFocusZone !== 'sidebar') {
      const targetBtn = navBtnRefs.current.get('nav_search')
      if (targetBtn) {
        targetBtn.requestFocus()
        setFocusZone('sidebar')
      }
      return true
    }

    // ── 层级 2：焦点在内容区 → 推到顶部栏 ──
    if (gFocusZone === 'content') {
      const panel = getPanelRef(currentId)
      if (panel) {
        panel.focusTopBar()
        setFocusZone('topbar')
      }
      return true
    }

    // ── 层级 3：焦点在顶部栏 → 推到左侧栏对应图标 ──
    if (gFocusZone === 'topbar') {
      const targetBtn = navBtnRefs.current.get(currentId)
      if (targetBtn) {
        targetBtn.requestFocus()
        setFocusZone('sidebar')
      }
      return true
    }

    // ── 层级 4：焦点在左侧栏 ──
    if (gFocusZone === 'sidebar') {
      const now = Date.now()
      if (now - lastBackPressRef.current < 2000) {
        exitApp('Back Btn Double Press')
      } else {
        lastBackPressRef.current = now
        toast(global.i18n.t('press_back_again_to_exit'))
      }
      return true
    }

    // 兜底：双击退出
    const now = Date.now()
    if (now - lastBackPressRef.current < 2000) {
      exitApp('Back Btn Double Press')
    } else {
      lastBackPressRef.current = now
      toast(global.i18n.t('press_back_again_to_exit'))
    }
    return true
  }, [getPanelRef])

  useBackHandler(handleBack)

  return (
    <View style={[s.root, { backgroundColor: theme['c-app-background'] }]}>
      <Sidebar
        onExitPress={handleExitPress}
        navBtnRefs={navBtnRefs}
        playBtnRef={playBtnRef}
      />
      <View style={s.right}>
        <ContentArea
          searchRef={searchRef}
          songlistRef={songlistRef}
          leaderboardRef={leaderboardRef}
          mylistRef={mylistRef}
          settingRef={settingRef}
        />
      </View>
      <TVExitDialog ref={exitDialogRef} />
      <TVConfirmDialog ref={confirmDialogRef} />
    </View>
  )
})

const SIDEBAR_W = 80

const s = StyleSheet.create({
  root:  { flex: 1, flexDirection: 'row' },
  right: { flex: 1 },
  sidebar: {
    width: SIDEBAR_W,
    flexShrink: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    paddingBottom: 10,
  },
  sideBtn: {
    width: SIDEBAR_W,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  sideBtnActive: { borderLeftWidth: 3 },
  sidePic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sidePicImg: { width: 44, height: 44, borderRadius: 22 },
  navItems: { flex: 1, width: '100%', alignItems: 'center' },
  divider: { width: 40, height: 1, marginVertical: 4 },
  content: { flex: 1, position: 'relative' },
  panel:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  hidden:  { display: 'none' },
})
