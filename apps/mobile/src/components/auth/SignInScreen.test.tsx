import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'

import { AUTH_ERROR_COPY } from '@/src/auth/authErrorCopy'
import { SignInScreen } from './SignInScreen'

function setup(overrides: Partial<React.ComponentProps<typeof SignInScreen>> = {}) {
  const onRequestCode = jest.fn().mockResolvedValue(undefined)
  const onVerifyCode = jest.fn().mockResolvedValue(undefined)
  render(<SignInScreen onRequestCode={onRequestCode} onVerifyCode={onVerifyCode} {...overrides} />)
  return { onRequestCode, onVerifyCode }
}

async function reachCodeStage(onRequestCode: jest.Mock) {
  fireEvent.changeText(screen.getByLabelText('Email address'), 'learner@example.com')
  fireEvent.press(screen.getByLabelText('Send code'))
  await waitFor(() => expect(onRequestCode).toHaveBeenCalledWith('learner@example.com'))
  return screen.findByLabelText('Six-digit code')
}

describe('SignInScreen', () => {
  it('will not request a code for an address that is obviously not one', () => {
    const { onRequestCode } = setup()
    fireEvent.changeText(screen.getByLabelText('Email address'), 'learner')
    fireEvent.press(screen.getByLabelText('Send code'))

    expect(onRequestCode).not.toHaveBeenCalled()
  })

  it('trims the address before sending it', async () => {
    const { onRequestCode } = setup()
    fireEvent.changeText(screen.getByLabelText('Email address'), '  learner@example.com ')
    fireEvent.press(screen.getByLabelText('Send code'))

    await waitFor(() => expect(onRequestCode).toHaveBeenCalledWith('learner@example.com'))
  })

  it('advances to the code stage and says where the code went', async () => {
    const { onRequestCode } = setup()
    await reachCodeStage(onRequestCode)

    expect(screen.getByText('Enter your code')).toBeTruthy()
    expect(screen.getByText(/We sent a code to learner@example\.com/)).toBeTruthy()
  })

  it('verifies a six-digit code', async () => {
    const { onRequestCode, onVerifyCode } = setup()
    const input = await reachCodeStage(onRequestCode)

    fireEvent.changeText(input, '123456')
    fireEvent.press(screen.getByLabelText('Verify'))

    await waitFor(() =>
      expect(onVerifyCode).toHaveBeenCalledWith('learner@example.com', '123456'),
    )
  })

  it('keeps non-digits out of the code field', async () => {
    const { onRequestCode, onVerifyCode } = setup()
    const input = await reachCodeStage(onRequestCode)

    fireEvent.changeText(input, '12ab34')
    fireEvent.press(screen.getByLabelText('Verify'))

    // Only four digits survived, so the action stays disabled.
    expect(onVerifyCode).not.toHaveBeenCalled()
  })

  it('will not verify before six digits are present', async () => {
    const { onRequestCode, onVerifyCode } = setup()
    const input = await reachCodeStage(onRequestCode)

    fireEvent.changeText(input, '12345')
    fireEvent.press(screen.getByLabelText('Verify'))

    expect(onVerifyCode).not.toHaveBeenCalled()
  })

  it('shows friendly copy when the code is refused, and never the raw error', async () => {
    const onRequestCode = jest.fn().mockResolvedValue(undefined)
    const onVerifyCode = jest
      .fn()
      .mockRejectedValue({ status: 403, message: 'AuthApiError: Token has expired or is invalid' })
    render(<SignInScreen onRequestCode={onRequestCode} onVerifyCode={onVerifyCode} />)

    const input = await reachCodeStage(onRequestCode)
    fireEvent.changeText(input, '000000')
    fireEvent.press(screen.getByLabelText('Verify'))

    expect(await screen.findByText(AUTH_ERROR_COPY.expiredCode)).toBeTruthy()
    expect(screen.queryByText(/AuthApiError/)).toBeNull()
    expect(screen.queryByText(/Token has expired/)).toBeNull()
  })

  it('shows friendly copy when the request itself cannot reach the service', async () => {
    const onRequestCode = jest.fn().mockRejectedValue(new TypeError('Network request failed'))
    render(<SignInScreen onRequestCode={onRequestCode} onVerifyCode={jest.fn()} />)

    fireEvent.changeText(screen.getByLabelText('Email address'), 'learner@example.com')
    fireEvent.press(screen.getByLabelText('Send code'))

    expect(await screen.findByText(AUTH_ERROR_COPY.network)).toBeTruthy()
    // and it stays on the email stage rather than advancing to a code that was
    // never sent.
    expect(screen.getByLabelText('Email address')).toBeTruthy()
  })

  it('leaves the action usable again after a failure', async () => {
    const onRequestCode = jest.fn().mockRejectedValueOnce(new TypeError('Network request failed'))
    render(<SignInScreen onRequestCode={onRequestCode} onVerifyCode={jest.fn()} />)

    fireEvent.changeText(screen.getByLabelText('Email address'), 'learner@example.com')
    fireEvent.press(screen.getByLabelText('Send code'))
    await screen.findByText(AUTH_ERROR_COPY.network)

    // A button left spinning is the failure mode this asserts against: the
    // label is back, the busy flag is cleared, and a retry actually fires.
    const action = screen.getByLabelText('Send code')
    expect(action.props.accessibilityState.busy).toBe(false)
    expect(action.props.accessibilityState.disabled).toBe(false)

    onRequestCode.mockResolvedValueOnce(undefined)
    fireEvent.press(action)
    await waitFor(() => expect(onRequestCode).toHaveBeenCalledTimes(2))
  })

  it('clears a rejected code so the next attempt starts fresh', async () => {
    const onRequestCode = jest.fn().mockResolvedValue(undefined)
    const onVerifyCode = jest.fn().mockRejectedValue({ status: 400, message: 'invalid' })
    render(<SignInScreen onRequestCode={onRequestCode} onVerifyCode={onVerifyCode} />)

    const input = await reachCodeStage(onRequestCode)
    fireEvent.changeText(input, '111111')
    fireEvent.press(screen.getByLabelText('Verify'))

    await screen.findByText(AUTH_ERROR_COPY.invalidCode)
    expect(screen.getByLabelText('Six-digit code').props.value).toBe('')
  })

  it('can resend a code without leaving the code stage', async () => {
    const { onRequestCode } = setup()
    await reachCodeStage(onRequestCode)

    fireEvent.press(screen.getByText('Resend code'))

    await waitFor(() => expect(onRequestCode).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('A new code is on its way.')).toBeTruthy()
  })

  it('can go back to change the address', async () => {
    const { onRequestCode } = setup()
    await reachCodeStage(onRequestCode)

    fireEvent.press(screen.getByText('Change email'))

    expect(screen.getByLabelText('Email address')).toBeTruthy()
    expect(screen.queryByLabelText('Six-digit code')).toBeNull()
  })

  it('surfaces a bootstrap failure passed down from the auth engine', () => {
    setup({ bootstrapError: "Couldn't reach the account service." })
    expect(screen.getByText("Couldn't reach the account service.")).toBeTruthy()
  })
})
