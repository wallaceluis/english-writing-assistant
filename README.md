# English Assist

Assistente de escrita em inglês que vive na bandeja do Windows. Copie um texto, pressione `Ctrl+Alt+E` e receba a versão em inglês numa janela flutuante, pronta para colar.

- **Texto em português** → traduzido para um inglês nativo e profissional.
- **Texto em inglês** → gramática corrigida e reescrito para soar mais natural.

![Janela do English Assist com um texto traduzido](docs/screenshot.png)

## Como funciona no dia a dia

1. Deixe o app rodando em segundo plano (ele fica só na bandeja do sistema, sem janela na barra de tarefas).
2. Escreva seu e-mail, mensagem de Slack ou comentário de PR, selecione o texto e pressione `Ctrl+C`.
3. Pressione `Ctrl+Alt+E`. A janela aparece e o texto em inglês vai sendo escrito em tempo real.
4. Pressione `Enter` para copiar o resultado. A janela se fecha sozinha e você cola com `Ctrl+V`.

| Atalho       | Ação                                                   |
| ------------ | ------------------------------------------------------ |
| `Ctrl+Alt+E` | Global: lê o clipboard e abre a janela com o resultado |
| `Enter`      | Copia o resultado e fecha a janela                     |
| `Ctrl+R`     | Refaz o texto (gera outra versão)                      |
| `Esc`        | Fecha a janela                                         |

Clicar fora da janela também a fecha. O ícone na bandeja tem um menu com **Melhorar texto copiado**, **Abrir janela**, **Configurações…**, **Iniciar com o Windows** e **Sair**.

## Requisitos

- Windows 10 ou 11 (64 bits)
- [Node.js](https://nodejs.org) 20 ou superior
- Uma chave de API da OpenAI com créditos ([platform.openai.com/api-keys](https://platform.openai.com/api-keys))

## Instalação

```bash
git clone https://github.com/wallaceluis/english-writing-assistant.git
cd english-writing-assistant
npm install
npm run dev
```

O `npm run dev` abre o app com hot reload. Use `F12` com a janela em foco para abrir o DevTools.

## Configurando a API Key

### Pelo app (recomendado)

Na primeira execução o app abre direto na tela de configurações. Depois disso, ela fica no menu da bandeja (**Configurações…**) e no ícone de ajustes no topo da janela.

1. Crie uma chave em [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Cole no campo **Chave de API da OpenAI** e clique em **Salvar**.

A chave é criptografada com a [`safeStorage`](https://www.electronjs.org/docs/latest/api/safe-storage) do Electron (DPAPI do Windows, vinculada ao seu usuário) e gravada em `%APPDATA%\English Assist\settings.json`. Ela nunca chega ao processo de renderização: a interface só fica sabendo se existe uma chave e quais são os quatro últimos caracteres.

Na mesma tela dá para trocar o **modelo**. O padrão é `gpt-5.4-mini`; qualquer modelo de chat da OpenAI serve.

### Por variável de ambiente

Útil em desenvolvimento. Copie `.env.example` para `.env` na raiz do projeto e preencha:

```ini
OPENAI_API_KEY=sua-chave-aqui
# OPENAI_MODEL=gpt-5.4-mini
```

O arquivo `.env` só é lido fora do app instalado (`npm run dev` e `npm start`) e está no `.gitignore`. No app instalado, as variáveis `OPENAI_API_KEY` e `OPENAI_MODEL` do Windows também são respeitadas. Uma chave salva pelo app tem prioridade sobre a do ambiente.

## Compilando para Windows

```bash
npm run dist
```

O instalador é gerado em `release/English-Assist-Setup-1.0.0.exe` (NSIS, x64). Para testar sem instalar, `npm run dist:dir` gera apenas a pasta `release/win-unpacked/` com o `English Assist.exe`.

Depois de instalar, marque **Iniciar com o Windows** no menu da bandeja para o app subir junto com o sistema.

> O executável não é assinado digitalmente, então o Windows SmartScreen pode avisar na primeira execução. Clique em **Mais informações → Executar assim mesmo**.

### Erro "Cannot create symbolic link" no `npm run dist`

O electron-builder baixa um pacote (`winCodeSign`) que contém links simbólicos, e o Windows só permite criá-los com privilégio. Resolva de uma destas formas e rode o comando de novo:

- Ative o **Modo de Desenvolvedor** em *Configurações → Privacidade e segurança → Para desenvolvedores*; ou
- Abra o terminal como **Administrador** só para a primeira compilação (o pacote fica em cache).

## Scripts

| Script              | O que faz                                                      |
| ------------------- | -------------------------------------------------------------- |
| `npm run dev`       | Roda o app em desenvolvimento com hot reload                   |
| `npm run build`     | Checa os tipos e compila main, preload e renderer para `out/`  |
| `npm start`         | Roda a versão compilada de `out/`                              |
| `npm run typecheck` | Só a checagem de tipos do TypeScript                           |
| `npm run dist`      | Compila e gera o instalador do Windows em `release/`           |
| `npm run dist:dir`  | Compila e gera só a pasta descompactada, sem instalador        |
| `npm run icons`     | Redesenha `resources/icon.png` e `resources/tray.png`          |

## Arquitetura

```
src/
├── main/                 Processo principal do Electron
│   ├── index.ts          Inicialização, instância única, primeira execução
│   ├── window.ts         Janela flutuante sem bordas (mostrar, esconder, posicionar)
│   ├── tray.ts           Ícone e menu da bandeja
│   ├── shortcut.ts       Registro do atalho global
│   ├── assistant.ts      Sessão: lê o clipboard, chama a OpenAI, emite eventos
│   ├── openai.ts         Prompt, streaming e tradução dos erros da API
│   ├── settings.ts       Chave criptografada e modelo
│   └── ipc.ts            Handlers das chamadas vindas do renderer
├── preload/index.ts      Ponte segura (contextBridge) exposta como window.api
├── renderer/             Interface em React + Tailwind CSS
│   └── src/
│       ├── App.tsx
│       ├── hooks/useAssistant.ts
│       └── components/
└── shared/ipc.ts         Canais e tipos compartilhados entre os três processos
```

O fluxo de um atalho:

1. O `globalShortcut` dispara no processo principal, que lê o texto do clipboard e mostra a janela.
2. O principal chama a API de Chat Completions da OpenAI com `stream: true`.
3. Cada pedaço da resposta vai para o renderer pelo canal `session:event` (`start`, `mode`, `delta`, `done` ou `error`).
4. O renderer só desenha o estado. Copiar, fechar e refazer voltam ao principal por `ipcRenderer.invoke`.

O renderer roda com `contextIsolation`, `sandbox` e sem `nodeIntegration`; a chave e todas as chamadas de rede ficam no processo principal.

## Privacidade

O texto copiado é enviado à API da OpenAI somente quando você pressiona o atalho (ou usa **Melhorar texto copiado** / **Refazer**). O app não monitora o clipboard, não guarda histórico e não envia dados para nenhum outro serviço.

## Problemas comuns

| Sintoma                                           | O que fazer                                                                                                                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aviso "Atalho indisponível" ao abrir              | Outro programa já usa `Ctrl+Alt+E`. Feche-o ou troque a constante `SHORTCUT` em `src/main/shortcut.ts`.                                                     |
| `AltGr+E` parou de digitar `°`                    | No Windows, `AltGr` equivale a `Ctrl+Alt`, então o atalho captura essa combinação enquanto o app está aberto. Troque o atalho em `src/main/shortcut.ts`.    |
| "A OpenAI recusou a chave de API"                 | A chave está errada ou foi revogada. Gere outra e salve em **Configurações**.                                                                               |
| "Sua conta da OpenAI está sem créditos"           | Adicione créditos em [platform.openai.com](https://platform.openai.com/settings/organization/billing).                                                      |
| "O modelo … não existe ou não está disponível"    | Sua conta não tem acesso ao modelo configurado. Troque em **Configurações**.                                                                                |
| "Não encontrei texto no clipboard"                | O clipboard está vazio ou tem uma imagem/arquivo. Copie o texto com `Ctrl+C` antes do atalho.                                                               |
| `npm install` falha ao instalar o Electron        | O projeto fixa o Electron 39, a última série cujo instalador roda no Node 20. Para usar um Electron mais novo, atualize o Node para 22.12 ou superior.      |

## Stack

[Electron](https://www.electronjs.org) · [electron-vite](https://electron-vite.org) · [React](https://react.dev) · [TypeScript](https://www.typescriptlang.org) · [Tailwind CSS](https://tailwindcss.com) · [OpenAI Node SDK](https://github.com/openai/openai-node) · [electron-builder](https://www.electron.build)

## Licença

[MIT](LICENSE)
