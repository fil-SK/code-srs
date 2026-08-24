import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii } from '@itera/core'
import { useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AUTH_ERROR_COPY, authErrorMessage, looksLikeEmail } from '@/src/auth/authErrorCopy'

const iteraSymbol = require('../../../assets/itera-logo.png')

const OTP_LENGTH = 6

export interface SignInScreenProps {
  /** Request a six-digit code for this address. */
  onRequestCode: (email: string) => Promise<void>
  /** Exchange a code for a session. Resolving means signed in. */
  onVerifyCode: (email: string, token: string) => Promise<void>
  /** Core's bootstrap error, when the session lookup itself failed. */
  bootstrapError?: string | null
}

type Stage = 'email' | 'code'

// Functional sign-in infrastructure, not a designed surface.
//
// Deliberately plain: the Itera mark, one field, one action. The web login
// screen's illustration, principles row and typographic work are a finished
// design that this milestone has no mandate to reinterpret on a phone, and
// inventing a second visual language for it here would be harder to undo than to
// skip. Existing tokens only.
//
// Two rules hold on every path through this component:
//   1. `busy` is cleared in a finally, so no action can leave its button
//      spinning forever - not on success, not on failure, not on a rejection
//      that was never an Error.
//   2. Nothing a caller throws is rendered. `authErrorMessage` maps a failure to
//      one of a fixed set of sentences, so GoTrue wording cannot reach a learner
//      even if it changes.
export function SignInScreen({ onRequestCode, onVerifyCode, bootstrapError }: SignInScreenProps) {
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const trimmedEmail = email.trim()
  const canSend = !busy && looksLikeEmail(trimmedEmail)
  const canVerify = !busy && code.length === OTP_LENGTH

  async function sendCode(resend = false) {
    if (busy) return
    if (!looksLikeEmail(trimmedEmail)) {
      setError(AUTH_ERROR_COPY.invalidEmail)
      return
    }
    Keyboard.dismiss()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await onRequestCode(trimmedEmail)
      setStage('code')
      setCode('')
      setNotice(resend ? 'A new code is on its way.' : 'We sent a code to ' + trimmedEmail + '.')
    } catch (cause) {
      setError(authErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  async function verify() {
    if (busy || code.length !== OTP_LENGTH) return
    Keyboard.dismiss()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      // Resolving hands control to the auth engine's onAuthStateChange, which
      // flips the route guard. This screen unmounts rather than navigating.
      await onVerifyCode(trimmedEmail, code)
    } catch (cause) {
      setError(authErrorMessage(cause))
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  function changeEmail() {
    setStage('email')
    setCode('')
    setError(null)
    setNotice(null)
  }

  const actionDisabled = stage === 'email' ? !canSend : !canVerify

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          alwaysBounceVertical={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <Image resizeMode="contain" source={iteraSymbol} style={styles.symbol} />
            <Text style={styles.wordmark}>Itera</Text>
          </View>

          <Text style={styles.title}>{stage === 'email' ? 'Sign in' : 'Enter your code'}</Text>
          <Text style={styles.subtitle}>
            {stage === 'email'
              ? 'We will email you a six-digit code. There is no password.'
              : 'Six digits, sent to ' + trimmedEmail + '.'}
          </Text>

          {bootstrapError && stage === 'email' ? (
            <View style={[styles.banner, styles.bannerWarning]}>
              <MaterialCommunityIcons color={iteraColors.warning} name="sign-caution" size={19} />
              <Text style={styles.bannerText}>{bootstrapError}</Text>
            </View>
          ) : null}

          {stage === 'email' ? (
            <TextInput
              accessibilityLabel="Email address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!busy}
              inputMode="email"
              keyboardType="email-address"
              onChangeText={(next) => {
                setEmail(next)
                setError(null)
              }}
              onSubmitEditing={() => void sendCode()}
              placeholder="you@example.com"
              placeholderTextColor={iteraColors.mutedLight}
              returnKeyType="go"
              style={styles.input}
              value={email}
            />
          ) : (
            <TextInput
              accessibilityLabel="Six-digit code"
              autoComplete="one-time-code"
              autoCorrect={false}
              editable={!busy}
              inputMode="numeric"
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              onChangeText={(next) => {
                setCode(next.replace(/[^0-9]/g, ''))
                setError(null)
              }}
              onSubmitEditing={() => void verify()}
              placeholder="000000"
              placeholderTextColor={iteraColors.mutedLight}
              returnKeyType="go"
              style={[styles.input, styles.codeInput]}
              textContentType="oneTimeCode"
              value={code}
            />
          )}

          {error ? (
            <View style={[styles.banner, styles.bannerError]}>
              <MaterialCommunityIcons
                color={iteraColors.error}
                name="alert-circle-outline"
                size={19}
              />
              <Text style={styles.bannerText}>{error}</Text>
            </View>
          ) : null}

          {!error && notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <Pressable
            accessibilityLabel={stage === 'email' ? 'Send code' : 'Verify'}
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: actionDisabled }}
            disabled={actionDisabled}
            onPress={() => void (stage === 'email' ? sendCode() : verify())}
            style={({ pressed }) => [
              styles.primaryButton,
              actionDisabled && styles.primaryButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={iteraColors.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {stage === 'email' ? 'Send code' : 'Verify'}
              </Text>
            )}
          </Pressable>

          {stage === 'code' ? (
            <View style={styles.secondaryRow}>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                hitSlop={8}
                onPress={changeEmail}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.secondaryText}>Change email</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                hitSlop={8}
                onPress={() => void sendCode(true)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.secondaryText}>Resend code</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.footnote}>
            Itera on this device reads your account in the cloud. A workspace that only exists in a
            browser stays in that browser.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: iteraColors.canvas },
  flex: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 26 },
  symbol: { width: 40, height: 40 },
  wordmark: {
    color: iteraColors.inkBrand,
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  title: {
    color: iteraColors.inkBrand,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 7,
    marginBottom: 22,
    color: iteraColors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    minHeight: 52,
    color: iteraColors.ink,
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  codeInput: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 14,
    borderRadius: iteraRadii.control,
    padding: 12,
  },
  bannerError: { backgroundColor: iteraColors.errorSoft },
  bannerWarning: { marginTop: 0, marginBottom: 14, backgroundColor: iteraColors.warningSoft },
  bannerText: { flex: 1, color: iteraColors.ink, fontSize: 14, lineHeight: 20 },
  notice: { marginTop: 14, color: iteraColors.muted, fontSize: 14, lineHeight: 20 },
  primaryButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderRadius: iteraRadii.control,
    backgroundColor: iteraColors.accent,
  },
  primaryButtonDisabled: { backgroundColor: iteraColors.borderStrong },
  primaryButtonText: { color: iteraColors.surface, fontSize: 16, fontWeight: '700' },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    alignItems: 'center',
    marginTop: 6,
  },
  secondaryText: { color: iteraColors.accent, fontSize: 14, fontWeight: '600' },
  footnote: {
    marginTop: 24,
    color: iteraColors.mutedLight,
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: { opacity: 0.68 },
})
