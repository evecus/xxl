import { memo } from 'react'
import { View, Platform } from 'react-native'
import { createStyle } from '@/utils/tools'
import { type ListInfoItem } from '@/store/songlist/state'
import Text from '@/components/common/Text'
import { scaleSizeW } from '@/utils/pixelRatio'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { useTheme } from '@/store/theme/hook'
import Image from '@/components/common/Image'
import TVButton from '@/components/common/TVButton'
import { setFocusZone } from '@/screens/Home/TV/index'

const gap = scaleSizeW(15)
const IMG_PADDING = 4  // 图片与焦点框的间距，可按需调整
export default memo(({ item, index, width, showSource, onPress }: {
  item: ListInfoItem
  index: number
  showSource: boolean
  width: number
  onPress: (item: ListInfoItem, index: number) => void
}) => {
  const theme = useTheme()
  const itemWidth = width - gap
  const handlePress = () => { onPress(item, index) }
  return (
    item.source
      ? (
          // TVButton 只包裹图片区域，文字在外部，焦点框只框图片
          <View style={{ ...styles.listItem, width: itemWidth }}>
            <TVButton
              onPress={handlePress}
              onFocus={() => setFocusZone('content')}
              borderRadius={4}
              style={{ padding: IMG_PADDING }}
            >
              <View style={{ ...styles.listItemImg, width: itemWidth - IMG_PADDING * 2, height: itemWidth - IMG_PADDING * 2, backgroundColor: theme['c-content-background'] }}>
                <Image
                  url={item.img}
                  nativeID={`${NAV_SHEAR_NATIVE_IDS.songlistDetail_pic}_from_${item.id}`}
                  style={{ width: itemWidth - IMG_PADDING * 2, height: itemWidth - IMG_PADDING * 2, borderRadius: 4 }}
                />
                {showSource ? <Text style={styles.sourceLabel} size={9} color="#fff">{item.source}</Text> : null}
              </View>
            </TVButton>
            <Text style={styles.listItemTitle} numberOfLines={2}>{item.name}</Text>
          </View>
        )
      : <View style={{ ...styles.listItem, width: itemWidth }} />
  )
})

const styles = createStyle({
  listItem: {
    margin: 10,
  },
  listItemImg: {
    borderRadius: 4,
    marginBottom: 5,
    overflow: 'hidden',   // 只在 Image 容器上裁剪圆角，不在 TVButton 上
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.20,
        shadowRadius: 1.41,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sourceLabel: {
    paddingLeft: 4,
    paddingBottom: 2,
    paddingRight: 4,
    position: 'absolute',
    top: 0,
    right: 0,
    borderBottomLeftRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  listItemTitle: {
    fontSize: 12,
    marginBottom: 5,
  },
})
