import TalkJSTestClient from './TalkJSTestClient'

export default function TalkJSTestPage() {
  const appId = process.env.NEXT_PUBLIC_TALKJS_APP_ID || null

  return <TalkJSTestClient appId={appId} />
}
