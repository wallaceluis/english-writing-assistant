import type { AssistApi } from '../../shared/ipc'

declare global {
  interface Window {
    api: AssistApi
  }
}
