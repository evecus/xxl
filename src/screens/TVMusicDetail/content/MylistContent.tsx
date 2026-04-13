/**
 * 我的列表内容 — 从本地列表加载歌曲，渲染分页两列列表
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useCallback } from 'react'
import { View } from 'react-native'
import { MyMusicList, type MyMusicListType } from '../TVMusicList'
import { getListMusics } from '@/core/list'
import { playList } from '@/core/player/player'
import { usePlayInfo, usePlayMusicInfo } from '@/store/player/hook'
import { useActiveListId } from '@/store/list/hook'
import listState from '@/store/list/state'
import { handlePlayLater, handleRemove } from '@/screens/Home/Views/Mylist/MusicList/listAction'

// 复用我的列表菜单
import ListMenu, { type ListMenuType, type Position } from '@/screens/Home/Views/Mylist/MusicList/ListMenu'
import ListMusicAdd, { type MusicAddModalType } from '@/components/MusicAddModal'
import ListMusicMultiAdd, { type MusicMultiAddModalType } from '@/components/MusicMultiAddModal'

export interface MylistContentType {
  _type: 'mylist'
}

interface Props {
  id: string   // listId
}

export default forwardRef<MylistContentType, Props>(({ id }, ref) => {
  const listRef = useRef<MyMusicListType>(null)
  const listMenuRef = useRef<ListMenuType>(null)
  const listMusicAddRef = useRef<MusicAddModalType>(null)
  const listMusicMultiAddRef = useRef<MusicMultiAddModalType>(null)
  const isUnmountedRef = useRef(false)

  const playMusicInfo = usePlayMusicInfo()
  const playInfo = usePlayInfo()
  const activeListId = useActiveListId()

  useImperativeHandle(ref, () => ({ _type: 'mylist' }))

  useEffect(() => {
    isUnmountedRef.current = false
    listRef.current?.setStatus('loading')

    getListMusics(id).then(list => {
      if (isUnmountedRef.current) return
      const activeIndex = (playMusicInfo.listId === id) ? playInfo.playIndex : -1
      listRef.current?.setList(list, activeIndex)
      listRef.current?.setStatus('end')
    }).catch(() => {
      listRef.current?.setStatus('error')
    })

    return () => { isUnmountedRef.current = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handlePress = useCallback((item: LX.Music.MusicInfo, index: number) => {
    void playList(id, index)
  }, [id])

  const handleShowMenu = useCallback((
    item: LX.Music.MusicInfo,
    index: number,
    position: Position,
  ) => {
    listMenuRef.current?.show({
      musicInfo: item,
      index,
      listId: id,
      single: true,
      selectedList: [],
    }, position)
  }, [id])

  return (
    <View style={{ flex: 1 }}>
      <MyMusicList
        ref={listRef}
        onPress={handlePress}
        onShowMenu={handleShowMenu}
      />
      <ListMusicAdd ref={listMusicAddRef} onAdded={() => {}} />
      <ListMusicMultiAdd ref={listMusicMultiAddRef} onAdded={() => {}} />
      <ListMenu
        ref={listMenuRef}
        onPlay={info => { void playList(info.listId, info.index) }}
        onPlayLater={info => { handlePlayLater(info.listId, info.musicInfo, info.selectedList, () => {}) }}
        onAdd={info => {
          if (info.selectedList.length) {
            listMusicMultiAddRef.current?.show({ selectedList: info.selectedList, listId: info.listId, isMove: false })
          } else {
            listMusicAddRef.current?.show({ musicInfo: info.musicInfo, listId: info.listId, isMove: false })
          }
        }}
        onMove={info => {
          if (info.selectedList.length) {
            listMusicMultiAddRef.current?.show({ selectedList: info.selectedList, listId: info.listId, isMove: true })
          } else {
            listMusicAddRef.current?.show({ musicInfo: info.musicInfo, listId: info.listId, isMove: true })
          }
        }}
        onDislike={() => {}}
        onRemove={info => { handleRemove(info.listId, info.musicInfo, info.selectedList, () => {}) }}
        onToggleSource={() => {}}
      />
    </View>
  )
})
