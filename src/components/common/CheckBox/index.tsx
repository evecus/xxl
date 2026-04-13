import { useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import CheckBox from './Checkbox'

import { createStyle, tipDialog } from '@/utils/tools'
import { scaleSizeH, scaleSizeW } from '@/utils/pixelRatio'
import { useTheme } from '@/store/theme/hook'
import Text from '../Text'
import { Icon } from '../Icon'
import TVButton from '../TVButton'

export interface CheckBoxProps {
  check: boolean
  label?: string
  children?: React.ReactNode
  onChange: (check: boolean) => void
  disabled?: boolean
  need?: boolean
  size?: number
  marginRight?: number
  marginBottom?: number
  hasTVPreferredFocus?: boolean

  helpTitle?: string
  helpDesc?: string
}

export default ({ check, label, children, onChange, helpTitle, helpDesc, disabled = false, need = false, marginRight = 0, marginBottom = 0, size = 1, hasTVPreferredFocus }: CheckBoxProps) => {
  const theme = useTheme()
  const [isDisabled, setDisabled] = useState(false)
  const tintColors = {
    true: theme['c-primary'],
    false: theme['c-600'],
  }
  const disabledTintColors = {
    true: theme['c-primary-alpha-600'],
    false: theme['c-400'],
  }

  useEffect(() => {
    if (need) {
      if (check) {
        if (!isDisabled) setDisabled(true)
      } else {
        if (isDisabled) setDisabled(false)
      }
    } else {
      isDisabled && setDisabled(false)
    }
  }, [check, need, isDisabled])

  const handleLabelPress = useCallback(() => {
    if (isDisabled) return
    onChange?.(!check)
  }, [isDisabled, onChange, check])

  const helpComponent = useMemo(() => {
    const handleShowHelp = () => {
      void tipDialog({
        title: helpTitle ?? '',
        message: helpDesc,
        btnText: global.i18n.t('understand'),
      })
    }
    return (helpTitle ?? helpDesc) ? (
      <TVButton
        style={styles.helpBtn}
        onPress={handleShowHelp}
        borderRadius={4}
      >
        <Icon size={15 * size} name="help" />
      </TVButton>
    ) : null
  }, [helpTitle, helpDesc, size])


  const contentStyle = { ...styles.content, marginBottom: scaleSizeH(marginBottom) }
  const labelStyle = { ...styles.label, marginRight: scaleSizeW(marginRight) }

  return (
    disabled
      ? (
          <View style={contentStyle}>
            <CheckBox status={check ? 'checked' : 'unchecked'} disabled={true} tintColors={disabledTintColors} size={size} />
            <View style={labelStyle}>{label ? <Text style={styles.name} color={theme['c-500']} size={15 * size}>{label}</Text> : children}</View>
            {helpComponent}
          </View>
        )
      : (
          <View style={contentStyle}>
            <CheckBox status={check ? 'checked' : 'unchecked'} disabled={isDisabled} onPress={handleLabelPress} tintColors={tintColors} size={size} />
            <TVButton
              style={labelStyle}
              onPress={handleLabelPress}
              borderRadius={4}
              hasTVPreferredFocus={hasTVPreferredFocus}
            >
              <>{label ? <Text style={styles.name} size={15 * size}>{label}</Text> : children}</>
            </TVButton>
            {helpComponent}
          </View>
        )
  )
}

const styles = createStyle({
  content: {
    flexGrow: 0,
    flexShrink: 1,
    marginRight: 15,
    alignItems: 'center',
    flexDirection: 'row',
  },
  label: {
    flexGrow: 0,
    flexShrink: 1,
    paddingRight: 3,
  },
  name: {
    marginTop: 2,
  },
  helpBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
})
