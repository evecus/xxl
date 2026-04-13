import { useRef, forwardRef, useImperativeHandle } from 'react'
import TVButton, { type TVButtonType } from '@/components/common/TVButton'
import Modal, { type ModalType } from './Modal'
import { type Source } from '@/store/songlist/state'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'

export interface OpenListType {
  setInfo: (source: Source) => void
}

export default forwardRef<OpenListType, {}>((props, ref) => {
  const t = useI18n()
  const modalRef = useRef<ModalType>(null)
  const openBtnRef = useRef<TVButtonType>(null)
  const songlistInfoRef = useRef<{ source: Source }>({ source: 'kw' })

  useImperativeHandle(ref, () => ({
    setInfo(source) {
      songlistInfoRef.current.source = source
    },
  }))

  const handleOpenSonglist = (id: string, name = '') => {
    if (!commonState.componentIds.home) return
    navigations.pushTVMusicDetailScreen(commonState.componentIds.home, {
      type: 'songlist',
      id,
      name,
      source: songlistInfoRef.current.source,
    })
  }

  // 弹窗关闭后把焦点还给"打开"按钮
  const handleModalHide = () => {
    setTimeout(() => {
      openBtnRef.current?.requestFocus()
    }, 100)
  }

  return (
    <>
      <TVButton
        ref={openBtnRef}
        style={styles.button}
        onPress={() => modalRef.current?.show(songlistInfoRef.current.source)}
      >
        <Text>{t('songlist_open')}</Text>
      </TVButton>
      <Modal ref={modalRef} onOpenId={handleOpenSonglist} onHide={handleModalHide} />
    </>
  )
})

const styles = createStyle({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
  },
})
