import { parseRichText } from '@itera/core'
import { Text, View } from 'react-native'

const coreSmokeResult = parseRichText('mobile-bootstrap')

if (
  coreSmokeResult.length !== 1 ||
  coreSmokeResult[0]?.kind !== 'paragraph'
) {
  throw new Error('@itera/core runtime smoke failed')
}

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text>Itera mobile bootstrap</Text>
      <Text>Expo runtime: OK</Text>
      <Text>@itera/core: OK</Text>
    </View>
  )
}
