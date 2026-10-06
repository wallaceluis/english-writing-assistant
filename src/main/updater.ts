import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import { notify } from './tray'

// Updates come from the GitHub releases of the repository named in electron-builder.yml.
// A new version downloads in the background and is installed when the app quits.
export function initUpdater(): void {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('update-downloaded', (info) => {
    notify('Atualização pronta', `A versão ${info.version} será instalada quando você sair do English Assist.`)
  })
  // Failures are reported by whoever asked for the check; without a listener they would be thrown.
  autoUpdater.on('error', () => {})

  void checkForUpdates(false)
}

/** `manual` checks always tell the user the outcome; the one at startup stays quiet unless there is an update. */
export async function checkForUpdates(manual: boolean): Promise<void> {
  if (!app.isPackaged) {
    if (manual) notify('Atualizações', 'Só a versão instalada do app se atualiza sozinha.')
    return
  }

  try {
    const result = await autoUpdater.checkForUpdates()
    if (!manual) return
    if (result?.downloadPromise) {
      notify('Atualização encontrada', `Baixando a versão ${result.updateInfo.version}.`)
    } else {
      notify('Atualizações', `Você já está na versão mais recente (${app.getVersion()}).`)
    }
  } catch {
    // No release published yet, or no internet.
    if (manual) notify('Atualizações', 'Não foi possível verificar agora. Tente de novo mais tarde.')
  }
}
