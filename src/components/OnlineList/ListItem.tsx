import { memo, useRef } from 'react'
import { View, type ViewStyle } from 'react-native'
import Text from '@/components/common/Text'
import Badge, { type BadgeType } from '@/components/common/Badge'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import { LIST_ITEM_HEIGHT } from '@/config/constant'
import { createStyle, type RowInfo } from '@/utils/tools'
import TVButton, { type TVButtonType } from '@/components/common/TVButton'

// TV 模式：列表项加高，遥控器更容易选中
export const ITEM_HEIGHT = (scaleSizeH(LIST_ITEM_HEIGHT) * 1.15) || (LIST_ITEM_HEIGHT * 1.15)

const useQualityTag = (musicInfo: LX.Music.MusicInfoOnline) => {
  const t = useI18n()
  let info: { type: BadgeType | null, text: string } = { type: null, text: '' }
  if (musicInfo.meta._qualitys.flac24bit) {
    info.type = 'secondary'
    info.text = t('quality_lossless_24bit')
  } else if (musicInfo.meta._qualitys.flac ?? musicInfo.meta._qualitys.ape) {
    info.type = 'secondary'
    info.text = t('quality_lossless')
  } else if (musicInfo.meta._qualitys['320k']) {
    info.type = 'tertiary'
    info.text = t('quality_high_quality')
  }
  return info
}

export default memo(({ item, index, showSource, onPress, onLongPress, onShowMenu, selectedList, rowInfo, isShowAlbumName, isShowInterval }: {
  item: LX.Music.MusicInfoOnline
  index: number
  showSource?: boolean
  onPress: (item: LX.Music.MusicInfoOnline, index: number) => void
  onLongPress: (item: LX.Music.MusicInfoOnline, index: number) => void
  onShowMenu: (item: LX.Music.MusicInfoOnline, index: number, position: { x: number, y: number, w: number, h: number }) => void
  selectedList: LX.Music.MusicInfoOnline[]
  rowInfo: RowInfo
  isShowAlbumName: boolean
  isShowInterval: boolean
}) => {
  const theme = useTheme()
  const isSelected = selectedList.includes(item)

  const moreButtonRef = useRef<TVButtonType>(null)
  const handleShowMenu = () => {
    if (moreButtonRef.current?.measure) {
      moreButtonRef.current.measure((fx, fy, width, height, px, py) => {
        onShowMenu(item, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
      })
    }
  }
  const tagInfo = useQualityTag(item)
  const singer = `${item.singer}${isShowAlbumName && item.meta.albumName ? ` · ${item.meta.albumName}` : ''}`

  return (
    <View style={{
      ...styles.listItem,
      width: rowInfo.rowWidth,
      height: ITEM_HEIGHT,
      backgroundColor: isSelected ? theme['c-primary-background-hover'] : 'rgba(0,0,0,0)',
    }}>
      {/*
        主体区域：用 TVButton（TvFocusView），遥控器聚焦时显示统一绿色边框
        长按 OK 键触发 onLongPress → 相当于弹出菜单
      */}
      <TVButton
        style={styles.listItemLeft as ViewStyle}
        onPress={() => { onPress(item, index) }}
        onLongPress={() => { onLongPress(item, index) }}
        borderRadius={6}
      >
        <View style={styles.listItemLeftInner}>
          <Text style={styles.sn} size={13} color={theme['c-300']}>{index + 1}</Text>
          <View style={styles.itemInfo}>
            <Text numberOfLines={1} size={15}>{item.name}</Text>
            <View style={styles.listItemSingle}>
              {tagInfo.type ? <Badge type={tagInfo.type}>{tagInfo.text}</Badge> : null}
              {showSource ? <Badge type="tertiary">{item.source}</Badge> : null}
              <Text style={styles.listItemSingleText} size={12} color={theme['c-500']} numberOfLines={1}>{singer}</Text>
            </View>
          </View>
        </View>
      </TVButton>
      {/* 时长显示移到 TVButton 外面，避免与焦点框重叠 */}
      {isShowInterval
        ? <Text style={styles.interval} size={12} color={theme['c-250']} numberOfLines={1}>{item.interval}</Text>
        : null
      }
      {/* 更多菜单按钮：同样使用 TVButton，保持绿色边框一致 */}
      <TVButton
        ref={moreButtonRef}
        onPress={handleShowMenu}
        style={styles.moreButton as ViewStyle}
        borderRadius={6}
      >
        <Icon name="dots-vertical" style={{ color: theme['c-350'] }} size={14} />
      </TVButton>
    </View>
  )
}, (prevProps, nextProps) => {
  return !!(prevProps.item === nextProps.item &&
    prevProps.index === nextProps.index &&
    prevProps.isShowAlbumName === nextProps.isShowAlbumName &&
    prevProps.isShowInterval === nextProps.isShowInterval &&
    nextProps.selectedList.includes(nextProps.item) == prevProps.selectedList.includes(nextProps.item)
  )
})

const styles = createStyle({
  listItem: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingRight: 2,
    alignItems: 'center',
  },
  listItemLeft: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    height: '100%',
  },
  listItemLeftInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  sn: {
    width: 42,
    textAlign: 'center',
    paddingLeft: 3,
    paddingRight: 3,
  },
  itemInfo: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: 8,  // 右侧留空，防止文字贴近焦点框右边缘
  },
  listItemSingle: {
    paddingTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemSingleText: {
    flexGrow: 0,
    flexShrink: 1,
    fontWeight: '300',
  },
  // 时长显示在 TVButton 外部，左移避开焦点框
  interval: {
    paddingHorizontal: 10,
    minWidth: 46,
    textAlign: 'right',
  },
  moreButton: {
    height: '80%',
    paddingLeft: 18,
    paddingRight: 18,
    justifyContent: 'center',
  },
})
