/**
 * TV 我的列表面板（Grid 方块版）
 * 顶部：固定"我的列表"标题
 * 内容：列表方块 Grid（一行5个）
 */
import { memo, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { View, StyleSheet, FlatList, Modal } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useMyList } from '@/store/list/hook'
import TVButton, { type TVButtonType } from '@/components/common/TVButton'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { LIST_IDS } from '@/config/constant'
import musicSdk from '@/utils/musicSdk'
import listState from '@/store/list/state'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import { handleSync } from '@/screens/Home/Views/Mylist/MyList/listAction'
import { removeUserList } from '@/core/list'
import TVExitDialog, { type TVExitDialogType } from '@/components/common/TVExitDialog'
import ListNameEdit, { type ListNameEditType } from '@/screens/Home/Views/Mylist/MyList/ListNameEdit'
import ListMusicSort, { type ListMusicSortType } from '@/screens/Home/Views/Mylist/MyList/ListMusicSort'
import DuplicateMusic, { type DuplicateMusicType } from '@/screens/Home/Views/Mylist/MyList/DuplicateMusic'
import ListImportExport, { type ListImportExportType } from '@/screens/Home/Views/Mylist/MyList/ListImportExport'
import { useI18n } from '@/lang'
import { setFocusZone } from '../index'

const NUM_COLUMNS = 5

// ─── 操作弹窗 ────────────────────────────────────────────────────────────────
interface MenuItemDef {
  action: string
  label: string
  disabled?: boolean
  danger?: boolean
}

const ActionDialog = memo(({
  visible,
  menus,
  onAction,
  onClose,
}: {
  visible: boolean
  menus: MenuItemDef[]
  onAction: (action: string) => void
  onClose: () => void
}) => {
  const theme = useTheme()
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={d.overlay}>
        <View style={[d.card, { backgroundColor: theme['c-content-background'] }]}>
          <FlatList
            data={menus}
            keyExtractor={item => item.action}
            style={d.list}
            contentContainerStyle={d.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <View style={d.itemWrap}>
                <TVButton
                  hasTVPreferredFocus={index === 0}
                  borderRadius={6}
                  disabled={item.disabled}
                  style={[d.actionBtn, { backgroundColor: theme['c-button-background'] }]}
                  onPress={() => onAction(item.action)}
                >
                  <Text size={15}
                    color={item.disabled ? theme['c-font-label'] : item.danger ? theme['c-primary'] : theme['c-button-font']}>
                    {item.label}
                  </Text>
                </TVButton>
              </View>
            )}
          />
          <View style={[d.divider, { backgroundColor: theme['c-border-background'] }]} />
          <View style={d.cancelRow}>
            <TVButton borderRadius={6}
              style={[d.cancelBtn, { backgroundColor: theme['c-button-background'] }]}
              onPress={onClose}>
              <Text size={14} color={theme['c-primary']}>取消</Text>
            </TVButton>
          </View>
        </View>
      </View>
    </Modal>
  )
})

const d = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  card: { width: 260, maxHeight: 520, borderRadius: 12, overflow: 'hidden', elevation: 10 },
  list: { flexGrow: 0 },
  listContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6 },
  itemWrap: { marginBottom: 6 },
  actionBtn: { height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 6 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14, marginTop: 2 },
  cancelRow: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, alignItems: 'flex-end' },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, minWidth: 80, alignItems: 'center', borderRadius: 6 },
})

// ─── 对外接口 ────────────────────────────────────────────────────────────────
export interface TVMyListGridPanelType {
  focusTopBar: () => void
  isDialogVisible: () => boolean
  closeDialog: () => void
  restoreFocus: () => void
}

// ─── 主面板 ──────────────────────────────────────────────────────────────────
export default memo(forwardRef<TVMyListGridPanelType>((_, ref) => {
  const theme = useTheme()
  const t = useI18n()
  const allList = useMyList()

  const [actionVisible, setActionVisible] = useState(false)
  const actionVisibleRef = useRef(false)
  const [actionMenus, setActionMenus] = useState<MenuItemDef[]>([])
  const selectedRef = useRef<{ listInfo: LX.List.MyListInfo; index: number } | null>(null)
  const lastDotsBtnRef = useRef<TVButtonType | null>(null)
  const lastFocusedCardRef = useRef<TVButtonType | null>(null)
  // 顶部标题区域的 ref（用于 back 时还焦点）
  const titleAreaRef = useRef<TVButtonType>(null)

  const removeListDialogRef = useRef<TVExitDialogType>(null)

  const listNameEditRef = useRef<ListNameEditType>(null)
  const listMusicSortRef = useRef<ListMusicSortType>(null)
  const duplicateMusicRef = useRef<DuplicateMusicType>(null)
  const listImportExportRef = useRef<ListImportExportType>(null)

  useImperativeHandle(ref, () => ({
    focusTopBar() {
      titleAreaRef.current?.requestFocus()
    },
    isDialogVisible() {
      return actionVisibleRef.current
    },
    closeDialog() {
      setActionVisible(false)
      actionVisibleRef.current = false
      requestAnimationFrame(() => { lastDotsBtnRef.current?.requestFocus() })
    },
    restoreFocus() {
      if (lastFocusedCardRef.current) {
        lastFocusedCardRef.current.requestFocus()
      } else {
        titleAreaRef.current?.requestFocus()
      }
    },
  }))

  const buildMenus = useCallback((listInfo: LX.List.MyListInfo): MenuItemDef[] => {
    let rename = false
    let remove = false
    let sync = false
    const localFile = !listState.fetchingListStatus[listInfo.id]
    switch (listInfo.id) {
      case LIST_IDS.DEFAULT:
      case LIST_IDS.LOVE:
        break
      default: {
        const userList = listInfo as LX.List.UserListInfo
        rename = true
        remove = true
        sync = !!(userList.source && musicSdk[userList.source as keyof typeof musicSdk]?.songList)
        break
      }
    }
    return [
      { action: 'new',            label: t('list_create') },
      { action: 'rename',         label: t('list_rename'),            disabled: !rename },
      { action: 'sort',           label: t('list_sort') },
      { action: 'duplicateMusic', label: t('lists__duplicate') },
      { action: 'local_file',     label: t('list_select_local_file'), disabled: !localFile },
      { action: 'sync',           label: t('list_sync'),              disabled: !sync || !localFile },
      { action: 'import',         label: t('list_import') },
      { action: 'export',         label: t('list_export') },
      { action: 'remove',         label: t('list_remove'),            disabled: !remove, danger: true },
    ]
  }, [t])

  const handleShowDots = useCallback((
    listInfo: LX.List.MyListInfo,
    index: number,
    btnRef: TVButtonType,
  ) => {
    selectedRef.current = { listInfo, index }
    lastDotsBtnRef.current = btnRef
    setActionMenus(buildMenus(listInfo))
    setActionVisible(true)
    actionVisibleRef.current = true
  }, [buildMenus])

  const closeAction = useCallback(() => {
    setActionVisible(false)
    actionVisibleRef.current = false
    requestAnimationFrame(() => { lastDotsBtnRef.current?.requestFocus() })
  }, [])

  const handleAction = useCallback((action: string) => {
    setActionVisible(false)
    actionVisibleRef.current = false
    const sel = selectedRef.current
    if (!sel) return
    const { listInfo, index } = sel
    switch (action) {
      case 'new': listNameEditRef.current?.showCreate(Math.max(index - 1, 0)); break
      case 'rename': listNameEditRef.current?.show(listInfo as LX.List.UserListInfo); break
      case 'sort': listMusicSortRef.current?.show(listInfo); break
      case 'duplicateMusic': duplicateMusicRef.current?.show(listInfo); break
      case 'import': listImportExportRef.current?.import(listInfo, index); break
      case 'export': listImportExportRef.current?.export(listInfo, index); break
      case 'local_file': listImportExportRef.current?.selectFile(listInfo, index); break
      case 'sync': handleSync(listInfo as LX.List.UserListInfo); break
      case 'remove':
        removeListDialogRef.current?.show(
          () => { void removeUserList([(listInfo as LX.List.UserListInfo).id]) },
          global.i18n.t('list_remove_tip', { name: listInfo.name }),
        )
        break
    }
  }, [])

  const handleOpenList = useCallback((listInfo: LX.List.MyListInfo, btnRef: TVButtonType) => {
    if (!commonState.componentIds.home) return
    lastFocusedCardRef.current = btnRef
    navigations.pushTVMusicDetailScreen(commonState.componentIds.home, {
      type: 'mylist',
      id: listInfo.id,
      name: listInfo.name,
    })
  }, [])

  const paddedList: Array<LX.List.MyListInfo | null> = [...allList]
  const remainder = paddedList.length % NUM_COLUMNS
  if (remainder > 0) {
    for (let i = 0; i < NUM_COLUMNS - remainder; i++) paddedList.push(null)
  }

  return (
    <View style={s.root}>
      {/* 顶部标题栏 — 用一个隐形 TVButton 作为焦点锚点 */}
      <View style={[s.topBar, { borderBottomColor: theme['c-border-background'] }]}>
        <TVButton ref={titleAreaRef} style={s.titleBtn} borderRadius={6} onPress={() => {}} onFocus={() => setFocusZone('topbar')}>
          <Text size={20} color={theme['c-font']} style={s.topTitle}>{t('nav_love')}</Text>
        </TVButton>
      </View>

      {/* 方块 Grid */}
      <FlatList
        key={NUM_COLUMNS}
        data={paddedList}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item, index) => item?.id ?? `pad_${index}`}
        contentContainerStyle={s.gridContent}
        renderItem={({ item, index }) => {
          if (!item) return <View style={s.cardWrap} />
          return (
            <CardItem
              listInfo={item}
              index={index}
              theme={theme}
              onOpen={handleOpenList}
              onShowDots={handleShowDots}
            />
          )
        }}
      />

      <ActionDialog
        visible={actionVisible}
        menus={actionMenus}
        onAction={handleAction}
        onClose={closeAction}
      />

      <ListNameEdit ref={listNameEditRef} />
      <ListMusicSort ref={listMusicSortRef} />
      <DuplicateMusic ref={duplicateMusicRef} />
      <ListImportExport ref={listImportExportRef} />
      <TVExitDialog ref={removeListDialogRef} />
    </View>
  )
}))

// ─── 单个方块卡片 ─────────────────────────────────────────────────────────────
const CardItem = memo(({
  listInfo,
  index,
  theme,
  onOpen,
  onShowDots,
}: {
  listInfo: LX.List.MyListInfo
  index: number
  theme: any
  onOpen: (listInfo: LX.List.MyListInfo, btn: TVButtonType) => void
  onShowDots: (listInfo: LX.List.MyListInfo, index: number, btn: TVButtonType) => void
}) => {
  const dotsBtnRef = useRef<TVButtonType>(null)
  const cardBtnRef = useRef<TVButtonType>(null)
  return (
    <View style={s.cardWrap}>
      <TVButton
        ref={cardBtnRef}
        style={[s.card, { backgroundColor: '#f5f5f7' }]}
        borderRadius={8}
        onPress={() => { if (cardBtnRef.current) onOpen(listInfo, cardBtnRef.current) }}
        onFocus={() => setFocusZone('content')}
      >
        <View style={s.coverWrap}>
          <View style={s.coverAccent} />
          <View style={s.coverLines}>
            <View style={[s.coverLine, { backgroundColor: '#fbbf24', width: '100%' }]} />
            <View style={[s.coverLineSub, { width: '75%' }]} />
            <View style={[s.coverLine, { backgroundColor: '#34d399', width: '100%' }]} />
            <View style={[s.coverLineSub, { width: '55%' }]} />
            <View style={[s.coverLine, { backgroundColor: '#f87171', width: '100%' }]} />
            <View style={[s.coverLineSub, { width: '80%' }]} />
            <View style={[s.coverLine, { backgroundColor: '#818cf8', width: '100%' }]} />
          </View>
        </View>
      </TVButton>
      <View style={s.cardBottom}>
        <Text style={s.cardName} size={12} color={theme['c-font']} numberOfLines={2}>
          {listInfo.name}
        </Text>
        <TVButton
          ref={dotsBtnRef}
          style={s.dotsBtn}
          borderRadius={6}
          onPress={() => { if (dotsBtnRef.current) onShowDots(listInfo, index, dotsBtnRef.current) }}
          onFocus={() => setFocusZone('content')}
        >
          <Icon name="dots-vertical" size={16} color={theme['c-font-label']} />
        </TVButton>
      </View>
    </View>
  )
})

const s = StyleSheet.create({
  root: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, flexShrink: 0 },
  titleBtn: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 8, borderRadius: 6 },
  topTitle: { fontWeight: '600' },
  gridContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  cardWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8, paddingBottom: 20 },
  card: { width: '100%', aspectRatio: 1.2, borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  coverWrap: { flex: 1, flexDirection: 'row', width: '100%', paddingVertical: 14, paddingHorizontal: 0 },
  coverAccent: { width: 5, borderRadius: 2.5, backgroundColor: '#3b82f6', marginLeft: 14, marginRight: 12, alignSelf: 'stretch' },
  coverLines: { flex: 1, justifyContent: 'space-between', paddingRight: 14 },
  coverLine: { height: 7, borderRadius: 3.5 },
  coverLineSub: { height: 5, borderRadius: 2.5, backgroundColor: '#d1d5db' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 6, width: '100%' },
  cardName: { flex: 1, lineHeight: 18 },
  dotsBtn: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, flexShrink: 0 },
})
