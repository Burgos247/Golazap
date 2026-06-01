import type { EventTemplate, SignedEvent } from '../lib/inscription'

declare global {
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<string>
      signEvent: (event: EventTemplate) => Promise<SignedEvent>
    }
    webln?: {
      enable: () => Promise<void>
      sendPayment: (paymentRequest: string) => Promise<{ preimage: string }>
    }
  }
}

export {}
