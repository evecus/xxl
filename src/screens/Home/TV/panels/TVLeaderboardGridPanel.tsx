/**
 * TV 排行榜面板（Grid 方块版）
 * 顶部：平台 Tab（一行）
 * 内容：榜单方块 Grid（一行5个）
 */
import { memo, useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { View, StyleSheet, FlatList } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import TVButton, { type TVButtonType } from '@/components/common/TVButton'
import Text from '@/components/common/Text'
import { getBoardsList } from '@/core/leaderboard'
import boardState, { type BoardItem } from '@/store/leaderboard/state'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import { getLeaderboardSetting, saveLeaderboardSetting } from '@/utils/data'
import { setFocusZone } from '../index'

const NUM_COLUMNS = 5

export interface TVLeaderboardGridPanelType {
  focusTopBar: () => void
  restoreFocus: () => void
}

export default memo(forwardRef<TVLeaderboardGridPanelType>((_, ref) => {
  const theme = useTheme()
  const t = useI18n()
  const sourceNameType = useSettingValue('common.sourceNameType')

  const [sources] = useState(() => boardState.sources)
  const [activeSource, setActiveSource] = useState<LX.OnlineSource>(sources[0] ?? 'kw')
  const [boardList, setBoardList] = useState<BoardItem[]>([])
  const firstTabRef = useRef<TVButtonType>(null)
  const lastFocusedCardRef = useRef<TVButtonType | null>(null)

  useImperativeHandle(ref, () => ({
    focusTopBar() {
      firstTabRef.current?.requestFocus()
    },
    restoreFocus() {
      if (lastFocusedCardRef.current) {
        lastFocusedCardRef.current.requestFocus()
      } else {
        firstTabRef.current?.requestFocus()
      }
    },
  }))

  const loadBoards = useCallback((source: LX.OnlineSource) => {
    void getBoardsList(source).then(list => { setBoardList(list) })
  }, [])

  useEffect(() => {
    void getLeaderboardSetting().then(({ source }) => {
      const src = sources.includes(source) ? source : (sources[0] ?? 'kw')
      setActiveSource(src)
      loadBoards(src)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectSource = (source: LX.OnlineSource) => {
    if (source === activeSource) return
    setActiveSource(source)
    void saveLeaderboardSetting({ source, boardId: '' })
    loadBoards(source)
  }

  const handleOpenBoard = (board: BoardItem, btnRef: TVButtonType) => {
    if (!commonState.componentIds.home) return
    lastFocusedCardRef.current = btnRef
    navigations.pushTVMusicDetailScreen(commonState.componentIds.home, {
      type: 'leaderboard',
      id: board.id,
      name: board.name,
      source: activeSource,
    })
  }

  const paddedList = [...boardList]
  const remainder = paddedList.length % NUM_COLUMNS
  if (remainder > 0) {
    for (let i = 0; i < NUM_COLUMNS - remainder; i++) {
      paddedList.push({ id: `__pad_${i}`, name: '', bangid: '' })
    }
  }

  return (
    <View style={s.root}>
      {/* 平台 Tab */}
      <View style={[s.tabBar, { borderBottomColor: theme['c-border-background'] }]}>
        {sources.map((src, i) => {
          const active = src === activeSource
          const label = t(`source_${sourceNameType}_${src}`)
          return (
            <TVButton
              key={src}
              ref={i === 0 ? firstTabRef : undefined}
              style={[s.tab, active && { borderBottomColor: theme['c-primary'] }]}
              onPress={() => handleSelectSource(src)}
              onFocus={() => setFocusZone('topbar')}
              hasTVPreferredFocus={i === 0}
            >
              <Text size={18} color={active ? theme['c-primary'] : undefined}>{label}</Text>
            </TVButton>
          )
        })}
      </View>

      {/* 方块 Grid */}
      <FlatList
        key={NUM_COLUMNS}
        data={paddedList}
        numColumns={NUM_COLUMNS}
        keyExtractor={item => item.id}
        contentContainerStyle={s.gridContent}
        renderItem={({ item }) => {
          if (!item.name) return <View style={s.cardWrap} />
          return <BoardCard item={item} theme={theme} onOpen={handleOpenBoard} />
        }}
      />
    </View>
  )
}))

const BoardCard = memo(({ item, theme, onOpen }: {
  item: BoardItem
  theme: any
  onOpen: (board: BoardItem, btn: TVButtonType) => void
}) => {
  const btnRef = useRef<TVButtonType>(null)
  return (
    <View style={s.cardWrap}>
      <TVButton
        ref={btnRef}
        style={[s.card, { backgroundColor: '#f5f3ff' }]}
        borderRadius={8}
        onPress={() => { if (btnRef.current) onOpen(item, btnRef.current) }}
        onFocus={() => setFocusZone('content')}
      >
        <View style={s.podiumWrap}>
          {/* 皇冠 */}
          <View style={s.crownWrap}>
            <View style={s.crownBase}>
              <View style={[s.crownPeak, { left: 0 }]} />
              <View style={[s.crownPeak, { left: '40%' }]} />
              <View style={[s.crownPeak, { right: 0 }]} />
            </View>
          </View>
          {/* 领奖台 */}
          <View style={s.podiumRow}>
            <View style={s.podiumColWrap}>
              <Text style={s.podiumNum}>2</Text>
              <View style={[s.podiumBar, { height: 36, backgroundColor: '#a78bfa', opacity: 0.75 }]} />
            </View>
            <View style={s.podiumColWrap}>
              <View style={[s.podiumBar, { height: 52, backgroundColor: '#7c3aed', opacity: 0.9 }]} />
            </View>
            <View style={s.podiumColWrap}>
              <Text style={s.podiumNum}>3</Text>
              <View style={[s.podiumBar, { height: 24, backgroundColor: '#c4b5fd', opacity: 0.8 }]} />
            </View>
          </View>
        </View>
      </TVButton>
      <Text style={s.cardName} size={12} color={theme['c-font']} numberOfLines={2}>{item.name}</Text>
    </View>
  )
})

const s = StyleSheet.create({
  root: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  gridContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  cardWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8, paddingBottom: 20 },
  card: { width: '100%', aspectRatio: 1.2, borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  podiumWrap: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 10 },
  crownWrap: { marginBottom: 4, alignItems: 'center' },
  crownBase: { width: 28, height: 14, backgroundColor: '#fbbf24', borderRadius: 2, position: 'relative', flexDirection: 'row' },
  crownPeak: { position: 'absolute', top: -8, width: 8, height: 10, backgroundColor: '#fbbf24', borderRadius: 2 },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  podiumColWrap: { alignItems: 'center', width: 32 },
  podiumNum: { fontSize: 11, fontWeight: '700', color: '#7c3aed', marginBottom: 2 },
  podiumBar: { width: 32, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  cardName: { marginTop: 6, textAlign: 'center', lineHeight: 18 },
})
