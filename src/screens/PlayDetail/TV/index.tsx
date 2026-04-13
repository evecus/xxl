/**
 * TV 播放详情页 — 完全独立实现
 * 左：封面 + 播放控制
 * 右：逐行歌词（自动滚动到当前行）
 */
import { memo, useEffect, useRef, useCallback, useState, useMemo } from 'react'
import {
  View,
  FlatList,
  AppState,
  StyleSheet,
  BackHandler,
  TVEventHandler,
} from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useIsPlay, usePlayerMusicInfo, usePlayMusicInfo, useProgress, useStatusText } from '@/store/player/hook'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import { useBufferProgress } from '@/plugins/player'
import { useLrcPlay, useLrcSet, type Line } from '@/plugins/lyric'
import { pop } from '@/navigation'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import { useStatusbarHeight } from '@/store/common/hook'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS, LIST_IDS, NAV_SHEAR_NATIVE_IDS, MUSIC_TOGGLE_MODE } from '@/config/constant'
import { screenkeepAwake, screenUnkeepAwake } from '@/utils/nativeModules/utils'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import Image from '@/components/common/Image'
import Progress from '@/components/player/Progress'
import TVButton from '@/components/common/TVButton'
import PageContent from '@/components/PageContent'
import StatusBar from '@/components/common/StatusBar'
import { addListMusics } from '@/core/list'
import settingState from '@/store/setting/state'
import settingAction from '@/store/setting/action'
import { useSettingValue } from '@/store/setting/hook'
import { toast } from '@/utils/tools'
import playerState from '@/store/player/state'

// 按钮尺寸略小
const BTN_SM = 62
const BTN_LG = 80

// 遥控器左右键每次跳转秒数
const SEEK_STEP = 10

// ─────────────────────────────────────────────────────────────────────────────
// 歌词组件
// ─────────────────────────────────────────────────────────────────────────────
const LyricView = memo(() => {
  const theme = useTheme()
  const { line: activeLine } = useLrcPlay()
  const lines = useLrcSet()
  const listRef = useRef<FlatList>(null)
  const itemHeights = useRef<number[]>([])

  useEffect(() => {
    if (!listRef.current || lines.length === 0) return
    const offset = itemHeights.current
      .slice(0, Math.max(0, activeLine - 3))
      .reduce((a, b) => a + b, 0)
    listRef.current.scrollToOffset({ offset, animated: true })
  }, [activeLine, lines.length])

  const renderItem = useCallback(({ item, index }: { item: Line, index: number }) => {
    const active = index === activeLine
    return (
      <View
        style={s.lrcLine}
        onLayout={e => { itemHeights.current[index] = e.nativeEvent.layout.height }}
      >
        <Text
          size={active ? 26 : 20}
          color={active ? theme['c-primary'] : theme['c-350']}
          style={[s.lrcText, active && s.lrcActive]}
          numberOfLines={3}
          textBreakStrategy="simple"
        >
          {item.text}
        </Text>
        {item.extendedLyrics?.[0]?.text ? (
          <Text
            size={active ? 20 : 16}
            color={active ? theme['c-primary-alpha-200'] : theme['c-300']}
            style={s.lrcText}
            numberOfLines={2}
          >
            {item.extendedLyrics[0].text}
          </Text>
        ) : null}
      </View>
    )
  }, [activeLine, theme])

  if (lines.length === 0) {
    return (
      <View style={s.lrcEmpty}>
        <Icon name="lyric-on" size={40} color={theme['c-font-label']} />
        <Text size={15} color={theme['c-font-label']} style={{ marginTop: 12 }}>暂无歌词</Text>
      </View>
    )
  }

  return (
    <FlatList
      ref={listRef}
      style={s.lrcList}
      data={lines}
      keyExtractor={(_, i) => String(i)}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.lrcContent}
      getItemLayout={(_, index) => ({
        length: 70,
        offset: 70 * index,
        index,
      })}
    />
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// 控制按钮
// ─────────────────────────────────────────────────────────────────────────────
const CtrlBtn = memo(({ icon, size, onPress, preferFocus }: {
  icon: string, size: number, onPress: () => void, preferFocus?: boolean
}) => {
  const theme = useTheme()
  return (
    <TVButton
      style={{ ...s.btn, width: size, height: size }}
      onPress={onPress}
      hasTVPreferredFocus={preferFocus}
    >
      <Icon name={icon} color={theme['c-button-font']} rawSize={size * 0.46} />
    </TVButton>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// 爱心收藏按钮
// ─────────────────────────────────────────────────────────────────────────────
const LoveBtn = memo(() => {
  const theme = useTheme()
  const playMusicInfo = usePlayMusicInfo()

  const handlePress = useCallback(() => {
    const musicInfo = playMusicInfo.musicInfo
    if (!musicInfo || !musicInfo.id) return
    void addListMusics(
      LIST_IDS.LOVE,
      [musicInfo as LX.Music.MusicInfo],
      settingState.setting['list.addMusicLocationType'],
    ).then(() => {
      toast('已添加到收藏')
    }).catch(() => {
      toast('收藏失败，请重试')
    })
  }, [playMusicInfo])

  return (
    <TVButton
      style={{ ...s.btn, width: BTN_SM, height: BTN_SM }}
      onPress={handlePress}
    >
      <Icon name="add-music" color={theme['c-button-font']} rawSize={BTN_SM * 0.46} />
    </TVButton>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// 播放模式切换按钮
// ─────────────────────────────────────────────────────────────────────────────
type ToggleMode = LX.AppSetting['player.togglePlayMethod']

const PLAY_MODE_CYCLE: ToggleMode[] = [
  MUSIC_TOGGLE_MODE.listLoop,
  MUSIC_TOGGLE_MODE.random,
  MUSIC_TOGGLE_MODE.list,
  MUSIC_TOGGLE_MODE.singleLoop,
]

const PLAY_MODE_ICON: Record<string, string> = {
  listLoop: 'list-loop',
  random: 'list-random',
  list: 'list-order',
  singleLoop: 'single-loop',
  none: 'list-loop',
}

const PLAY_MODE_LABEL: Record<string, string> = {
  listLoop: '列表循环',
  random: '随机播放',
  list: '顺序播放',
  singleLoop: '单曲循环',
  none: '禁用',
}

const PlayModeBtn = memo(() => {
  const theme = useTheme()
  const mode = useSettingValue('player.togglePlayMethod')

  const handlePress = useCallback(() => {
    const idx = PLAY_MODE_CYCLE.indexOf(mode as ToggleMode)
    const next = PLAY_MODE_CYCLE[(idx + 1) % PLAY_MODE_CYCLE.length]
    settingAction.updateSetting({ 'player.togglePlayMethod': next })
    toast(PLAY_MODE_LABEL[next] ?? '')
  }, [mode])

  return (
    <TVButton
      style={{ ...s.btn, width: BTN_SM, height: BTN_SM }}
      onPress={handlePress}
    >
      <Icon name={PLAY_MODE_ICON[mode] ?? 'list-loop'} color={theme['c-button-font']} rawSize={BTN_SM * 0.46} />
    </TVButton>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// 进度条：焦点进入即编辑，左右键调节，2s 无操作自动提交，上下键正常移焦点
// ─────────────────────────────────────────────────────────────────────────────
const formatTime = (sec: number) => {
  const s = Math.floor(sec)
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

const AUTO_COMMIT_MS = 2000

const SeekBar = memo(({ progress, duration, buffered, nowPlayTimeStr, maxPlayTimeStr }: {
  progress: number
  duration: number
  buffered: number
  nowPlayTimeStr: string
  maxPlayTimeStr: string
}) => {
  const theme = useTheme()
  const [editing, setEditing] = useState(false)
  const [draftProgress, setDraftProgress] = useState(0)
  const durationRef = useRef(duration)
  const draftRef = useRef(draftProgress)
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { durationRef.current = duration }, [duration])
  useEffect(() => { draftRef.current = draftProgress }, [draftProgress])

  const cancelTimer = useCallback(() => {
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current)
      commitTimerRef.current = null
    }
  }, [])

  const scheduleCommit = useCallback(() => {
    cancelTimer()
    commitTimerRef.current = setTimeout(() => {
      global.app_event.setProgress(draftRef.current * durationRef.current)
      commitTimerRef.current = null
    }, AUTO_COMMIT_MS)
  }, [cancelTimer])

  const handleFocus = useCallback(() => {
    setDraftProgress(progress)
    draftRef.current = progress
    setEditing(true)
  }, [progress])

  const handleBlur = useCallback(() => {
    cancelTimer()
    setEditing(false)
  }, [cancelTimer])

  const handleDirection = useCallback((direction: 'left' | 'right') => {
    setDraftProgress(p => {
      const next = direction === 'right'
        ? Math.min(1, p + SEEK_STEP / (durationRef.current || 1))
        : Math.max(0, p - SEEK_STEP / (durationRef.current || 1))
      draftRef.current = next
      return next
    })
    scheduleCommit()
  }, [scheduleCommit])

  useEffect(() => () => cancelTimer(), [cancelTimer])

  const displayProgress = editing ? draftProgress : progress
  const progressStr: `${number}%` = `${displayProgress * 100}%`
  const bufferedStr: `${number}%` = `${buffered * 100}%`
  const timeStr = editing ? formatTime(draftProgress * (durationRef.current || 0)) : nowPlayTimeStr

  return (
    <View style={s.progressWrap}>
      <TVButton
        onFocus={handleFocus}
        onBlur={handleBlur}
        onDirection={handleDirection}
        onPress={() => {}}
        lockHorizontal={editing}
        style={s.seekBarHitArea}
      >
        <View style={s.progressBarTrack}>
          <View style={[s.track, { backgroundColor: theme['c-primary-light-400-alpha-900'], width: '100%' }]} />
          <View style={[s.track, { backgroundColor: theme['c-primary-alpha-600'], width: bufferedStr }]} />
          <View style={[s.track, { backgroundColor: theme['c-primary'], width: progressStr }]} />
        </View>
        <View style={s.timeRow}>
          <Text size={12} color={editing ? theme['c-primary'] : theme['c-500']}>{timeStr}</Text>
          <Text size={12} color={editing ? theme['c-primary'] : theme['c-500']}>{maxPlayTimeStr}</Text>
        </View>
      </TVButton>
    </View>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// 左侧面板
// ─────────────────────────────────────────────────────────────────────────────
const LeftPanel = memo(({ componentId }: { componentId: string }) => {
  const theme = useTheme()
  const musicInfo = usePlayerMusicInfo()
  const isPlay = useIsPlay()
  const statusText = useStatusText()
  const { nowPlayTimeStr, maxPlayTimeStr, progress, maxPlayTime } = useProgress()
  const buffered = useBufferProgress()
  const statusBarHeight = useStatusbarHeight()

  return (
    <View style={[s.left, { paddingTop: statusBarHeight + 4 }]}>
      {/* 顶栏：歌曲名 + 歌手名，居中显示，无返回按钮 */}
      <View style={s.header}>
        <Text size={22} numberOfLines={2} style={s.songName}>{musicInfo.name || '暂无播放'}</Text>
        <Text size={13} color={theme['c-font-label']} numberOfLines={1} style={s.singerName}>{musicInfo.singer}</Text>
      </View>

      {/* 封面（略小） */}
      <View style={s.picWrap}>
        <Image
          url={musicInfo.pic}
          nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic}
          style={s.pic}
        />
      </View>

      {/* 状态文字 */}
      <Text size={13} color={theme['c-500']} numberOfLines={1} style={s.status}>
        {statusText}
      </Text>

      {/* 进度条：TVButton 包裹，支持遥控器左右键 seek，不显示绿色焦点框 */}
      <SeekBar
        progress={progress}
        duration={maxPlayTime}
        buffered={buffered}
        nowPlayTimeStr={nowPlayTimeStr}
        maxPlayTimeStr={maxPlayTimeStr}
      />

      {/* 播放控制：左[播放模式, prev] 中[play] 右[next, 收藏, 评论] */}
      <View style={s.controls}>
        <View style={[s.controlsSide, { justifyContent: 'flex-end' }]}>
          <PlayModeBtn />
          <CtrlBtn icon="prevMusic" size={BTN_SM} onPress={() => { void playPrev() }} />
        </View>
        <CtrlBtn icon={isPlay ? 'pause' : 'play'} size={BTN_LG} onPress={togglePlay} preferFocus />
        <View style={[s.controlsSide, { justifyContent: 'flex-start' }]}>
          <CtrlBtn icon="nextMusic" size={BTN_SM} onPress={() => { void playNext() }} />
          <LoveBtn />
        </View>
      </View>
    </View>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// 主组件
// ─────────────────────────────────────────────────────────────────────────────
export default memo(({ componentId }: { componentId: string }) => {
  const theme = useTheme()

  useEffect(() => {
    setComponentId(COMPONENT_IDS.playDetail, componentId)
    screenkeepAwake()

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        if (!commonState.componentIds.comment) screenkeepAwake()
      } else if (state === 'background') {
        screenUnkeepAwake()
      }
    })

    const onIdsChange = (ids: CommonState['componentIds']) => {
      if (ids.comment) screenUnkeepAwake()
      else if (AppState.currentState === 'active') screenkeepAwake()
    }
    global.state_event.on('componentIdsUpdated', onIdsChange)

    // 遥控器返回键：直接 pop 回主页
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      void pop(commonState.componentIds.playDetail!).then(() => {
        // 通知 TV home 把焦点还给侧边栏播放按钮
        global.state_event.emit('tvPlayDetailPopped')
      })
      return true
    })

    return () => {
      global.state_event.off('componentIdsUpdated', onIdsChange)
      sub.remove()
      screenUnkeepAwake()
      backHandler.remove()
    }
  }, [])

  return (
    <PageContent>
      <StatusBar />
      <View style={[s.root, { backgroundColor: theme['c-app-background'] }]}>
        <LeftPanel componentId={componentId} />
        <View style={[s.right, { borderLeftColor: theme['c-border-background'] }]}>
          <LyricView />
        </View>
      </View>
    </PageContent>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// 样式
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },

  // 左侧
  left: {
    width: '42%',
    flexShrink: 0,
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  // 顶栏：居中显示，无返回按钮
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
    gap: 4,
  },
  songName: {
    fontWeight: '600',
    textAlign: 'center',
  },
  singerName: {
    textAlign: 'center',
  },
  // 封面略小：72% → 64%
  picWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pic: { width: '75%', aspectRatio: 1, borderRadius: 10 },
  status: {
    marginTop: 10,
    marginBottom: 2,
    width: '100%',
    textAlign: 'center',
  },
  progressWrap: { width: '100%', marginVertical: 6 },
  seekBarHitArea: { width: '100%', paddingVertical: 6, paddingHorizontal: 4 },
  progressBarTrack: { height: 5, borderRadius: 3, overflow: 'hidden', position: 'relative' },
  track: { position: 'absolute', height: '100%', top: 0, left: 0, borderRadius: 3 },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 6,
    paddingHorizontal: 8,
  },
  controlsSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  btn: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 右侧歌词
  right: {
    flex: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  lrcList:    { flex: 1 },
  lrcContent: { paddingVertical: 60, paddingHorizontal: 24 },
  lrcLine:    { paddingVertical: 14 },
  lrcText:    { textAlign: 'center' },
  lrcActive:  { fontWeight: '700' },
  lrcEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

})
