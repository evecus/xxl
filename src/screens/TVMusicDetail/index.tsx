/**
 * TV 共用歌曲详情页
 * 三种入口：leaderboard / songlist / mylist
 * 顶部：标题 + 播放详情图标 + 收藏按钮（songlist 专属）
 * 内容：分页两列歌曲列表
 */
import { useEffect, useRef, useCallback } from 'react'
import { View, StyleSheet, BackHandler } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useStatusbarHeight } from '@/store/common/hook'
import { useIsPlay, usePlayerMusicInfo } from '@/store/player/hook'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import Image from '@/components/common/Image'
import TVButton from '@/components/common/TVButton'
import PageContent from '@/components/PageContent'
import StatusBar from '@/components/common/StatusBar'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS } from '@/config/constant'
import { pop } from '@/navigation'
import commonState from '@/store/common/state'
import { navigations } from '@/navigation'
import { type TVMusicDetailParams } from '@/navigation/navigation'

// 各数据来源的加载逻辑
import LeaderboardContent, { type LeaderboardContentType } from './content/LeaderboardContent'
import SonglistContent, { type SonglistContentType } from './content/SonglistContent'
import MylistContent, { type MylistContentType } from './content/MylistContent'

type ContentRef = LeaderboardContentType | SonglistContentType | MylistContentType

export default ({ componentId, params }: { componentId: string; params: TVMusicDetailParams }) => {
  const theme = useTheme()
  const statusBarHeight = useStatusbarHeight()
  const contentRef = useRef<ContentRef>(null)
  const isPlay = useIsPlay()
  const musicInfo = usePlayerMusicInfo()

  useEffect(() => {
    setComponentId(COMPONENT_IDS.tvMusicDetail, componentId)
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      // 先通知主页把焦点设好，再 pop，避免 pop 动画时系统自动聚焦播放按钮
      global.state_event.emit('tvMusicDetailWillPop')
      void pop(componentId)
      return true
    })
    return () => { back.remove() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openPlayDetail = useCallback(() => {
    if (commonState.componentIds.home) {
      navigations.pushPlayDetailScreen(commonState.componentIds.home)
    }
  }, [])

  const handleCollect = useCallback(() => {
    if (params.type === 'songlist') {
      (contentRef.current as SonglistContentType)?.collect()
    }
  }, [params])

  return (
    <PageContent>
      <StatusBar />
      <View style={[styles.root, { paddingTop: statusBarHeight }]}>
        {/* 顶部栏 */}
        <View style={[styles.topBar, { borderBottomColor: theme['c-border-background'] }]}>
          <Text style={styles.title} size={20} numberOfLines={1} color={theme['c-font']}>
            {params.name}
          </Text>
          <View style={styles.actions}>
            {/* 收藏（仅歌单） */}
            {params.type === 'songlist'
              ? (
                  <TVButton style={styles.actionBtn} borderRadius={6} onPress={handleCollect}>
                    <Text size={16} color={theme['c-primary']}>收藏歌单</Text>
                  </TVButton>
                )
              : null
            }
            {/* 播放详情：有封面显示封面，无封面显示播放/暂停图标 */}
            <TVButton style={styles.playBtn} borderRadius={22} onPress={openPlayDetail}>
              {musicInfo.pic
                ? <Image url={musicInfo.pic} style={styles.playBtnImg} />
                : <Icon name={isPlay ? 'pause' : 'play'} size={20} color={theme['c-primary']} />
              }
            </TVButton>
          </View>
        </View>

        {/* 内容区 */}
        <View style={styles.content}>
          {params.type === 'leaderboard' && (
            <LeaderboardContent
              ref={contentRef as React.Ref<LeaderboardContentType>}
              id={params.id}
              source={params.source}
            />
          )}
          {params.type === 'songlist' && (
            <SonglistContent
              ref={contentRef as React.Ref<SonglistContentType>}
              id={params.id}
              source={params.source}
            />
          )}
          {params.type === 'mylist' && (
            <MylistContent
              ref={contentRef as React.Ref<MylistContentType>}
              id={params.id}
            />
          )}
        </View>
      </View>
    </PageContent>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'column',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  playBtnImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
})
