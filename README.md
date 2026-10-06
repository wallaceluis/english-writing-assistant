# English Assist

Assistente de escrita em inglês que vive na barra de tarefas do Windows. Selecione um texto em qualquer programa, pressione um atalho e receba a versão em inglês: numa janela flutuante, direto por cima da seleção ou em voz alta.

- **Texto em português** → traduzido para inglês nativo.
- **Texto em inglês** → gramática corrigida e reescrito para soar natural, com explicação do que mudou.
- **Mensagem recebida em inglês** → traduzida para português.

![Janela do English Assist com um texto traduzido](docs/screenshot.png)

## Como funciona no dia a dia

1. Deixe o app rodando em segundo plano. Ele fica minimizado na barra de tarefas e com um ícone na bandeja do sistema.
2. Escreva seu e-mail, mensagem de Slack ou comentário de PR e selecione o texto.
3. Pressione o atalho do que você quer fazer com ele.

| Atalho global | O que faz com o texto selecionado                                              |
| ------------- | ------------------------------------------------------------------------------ |
| `Ctrl+Alt+E`  | Abre a janela com a versão em inglês, escrita em tempo real                    |
| `Ctrl+Alt+R`  | Substitui a seleção pela versão em inglês, sem abrir a janela                  |
| `Ctrl+Alt+L`  | Abre a janela e lê o resultado em voz alta                                     |
| `Ctrl+Alt+P`  | Traduz para português, para entender uma mensagem recebida                     |

Não precisa de `Ctrl+C`: o app copia a seleção por você e depois devolve o que estava no seu clipboard (quando era texto). Se nada estiver selecionado, os atalhos que abrem a janela usam o texto que já está no clipboard.

Todos os atalhos podem ser trocados em **Configurações → Atalhos**: clique no atalho e pressione a nova combinação (com `Ctrl` ou `Alt`). Se ela já pertencer a outro programa, o app avisa e mantém a anterior.

### Na janela

| Tecla        | Ação                                                              |
| ------------ | ----------------------------------------------------------------- |
| `Enter`      | Copia o resultado e fecha a janela                                |
| `Ctrl+Enter` | Fecha a janela e cola o resultado por cima do texto selecionado   |
| `Ctrl+R`     | Refaz o texto (gera outra versão)                                 |
| `Ctrl+L`     | Ouve o resultado, ou para a leitura                               |
| `Esc`        | Fecha a janela                                                    |

- **Tom:** acima do resultado, escolha entre **Profissional**, **Casual** e **Conciso**; o texto é refeito no tom escolhido. O tom padrão dos atalhos fica em **Configurações → Preferências**.
- **Explicar as correções:** quando o texto original já estava em inglês, o link abaixo do resultado lista o que mudou e por quê, em português.
- **Histórico:** o ícone de relógio abre os 50 últimos resultados, para reabrir e copiar de novo sem gastar outra requisição.
- Clicar fora da janela a minimiza, e o botão na barra de tarefas a reabre.

O ícone na bandeja tem um menu com as mesmas ações aplicadas ao texto já copiado, além de **Configurações…**, **Iniciar com o Windows**, **Verificar atualizações** e **Sair**.

### Substituir a seleção

`Ctrl+Alt+R` é o caminho mais curto: o texto selecionado some e a versão em inglês aparece no lugar. Enquanto o modelo responde, o botão do app na barra de tarefas pulsa; se algo der errado, o aviso vem pela bandeja. Não troque de janela nesse intervalo, porque o texto é colado em quem estiver em foco. O resultado também vai para o histórico.

### Glossário

Em **Configurações → Preferências**, liste os termos que têm regra própria, um por linha:

```
Kubernetes
nota fiscal = invoice
fechamento = month-end closing
```

Um termo sozinho nunca é traduzido; com sinal de igual, a tradução é sempre a indicada.

### Voz

O botão de alto-falante e o atalho `Ctrl+Alt+L` leem o resultado em voz alta. Há duas opções em **Configurações → Preferências**:

- **Windows** (padrão): usa as vozes instaladas no sistema. É gratuito, funciona offline e não usa nenhuma API. Se faltar voz em inglês, instale em *Configurações → Hora e idioma → Fala*.
- **Gemini**: voz natural gerada pelo Google, com a mesma chave do provedor Google Gemini. O texto é enviado ao Google e conta no limite gratuito da chave. Se a geração falhar, o app usa a voz do Windows e avisa no rodapé.

## Requisitos

- Windows 10 ou 11 (64 bits)
- [Node.js](https://nodejs.org) 20 ou superior
- Uma chave de API de algum provedor de IA. Há [opções gratuitas](#usando-de-graça); a OpenAI é paga

## Instalação

```bash
git clone https://github.com/wallaceluis/english-writing-assistant.git
cd english-writing-assistant
npm install
npm run dev
```

O `npm run dev` abre o app com hot reload. Use `F12` com a janela em foco para abrir o DevTools.

## Configurando o provedor de IA

Na primeira execução o app abre direto na tela de configurações. Depois disso, ela fica no menu da bandeja (**Configurações…**) e no ícone de ajustes no topo da janela.

1. Escolha um provedor na lista.
2. Clique em **Criar uma chave ↗**, gere a chave no site do provedor e cole no campo **Chave de API**.
3. Clique em **Ativar**.

Cada chave é criptografada com a [`safeStorage`](https://www.electronjs.org/docs/latest/api/safe-storage) do Electron (DPAPI do Windows, vinculada ao seu usuário) e gravada em `%APPDATA%\English Assist\settings.json`. Ela nunca chega ao processo de renderização: a interface só fica sabendo se existe uma chave e quais são os quatro últimos caracteres.

Todos os provedores são acessados pelo formato Chat Completions da OpenAI, então o campo **Modelo** aceita qualquer ID de modelo de chat daquele provedor.

### Usando de graça

Assinaturas do ChatGPT e do Claude não dão acesso à API, e não existe login oficial que permita a um app de terceiros usar a assinatura. O caminho gratuito são os planos grátis das APIs abaixo, que não pedem cartão de crédito.

| Provedor       | Modelo padrão         | Limites do plano gratuito                                              | Observações                                                                |
| -------------- | --------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Google Gemini  | `gemini-3.8-flash`    | Variam por modelo; veja em [AI Studio](https://aistudio.google.com/rate-limit) | O Google pode usar os textos do plano grátis para melhorar seus produtos   |
| Groq           | `openai/gpt-oss-120b` | 30 requisições/min, 1.000/dia e 200 mil tokens/dia por modelo          | O mais rápido; o limite diário de tokens acaba antes do de requisições     |
| OpenRouter     | `openrouter/free`     | 20 requisições/min e 50/dia (1.000/dia após comprar US$ 10 em créditos) | Uma chave para vários modelos `:free`; a lista de modelos grátis muda      |
| Ollama (local) | `llama3.2`            | Sem limites                                                            | Roda no seu PC e nada sai da máquina; a qualidade depende do modelo e da GPU |

Os números são de outubro de 2026 e mudam com frequência. Um texto típico de e-mail ou Slack gasta poucas centenas de tokens, então qualquer um desses planos cobre o uso diário de uma pessoa.

Para o Ollama, instale em [ollama.com](https://ollama.com), baixe um modelo com `ollama pull llama3.2` e ative o provedor no app (não precisa de chave).

Em **Outro compatível** entra qualquer API no mesmo formato: informe a URL base, o modelo e a chave. Serve para Cerebras, Mistral, a API da Meta (Muse Spark, que dá créditos iniciais mas não tem plano gratuito permanente) ou LM Studio. Por segurança, só são aceitas URLs `https://`, ou `http://` quando o servidor está em `localhost`.

### Fallback automático

Ative mais de um provedor e eles formam uma fila, na ordem mostrada na tela de configurações (as setas mudam a ordem). O primeiro responde; se ele falhar por qualquer motivo (limite atingido, cota esgotada, chave inválida, modelo fora do ar, sem conexão), o app tenta o seguinte sem você fazer nada. Quando isso acontece, a janela mostra `fallback · via <provedor>` ao lado do resultado.

Uma combinação que funciona bem sem gastar nada: **Groq** em primeiro (rápido), **Gemini** em segundo e **Ollama** por último, para continuar funcionando sem internet.

Detalhes do comportamento:

- Só o último provedor da fila repete a tentativa em caso de limite ou erro do servidor; os anteriores passam a vez imediatamente.
- Se um provedor falhar no meio da resposta, o texto parcial é descartado e o seguinte recomeça do zero.
- Cada requisição tem tempo limite de 30 segundos.
- Se todos falharem, a janela mostra o erro do último.

### Por variável de ambiente

Útil em desenvolvimento. Copie `.env.example` para `.env` na raiz do projeto e preencha as chaves que quiser:

```ini
OPENAI_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
```

O arquivo `.env` só é lido fora do app instalado (`npm run dev` e `npm start`) e está no `.gitignore`. No app instalado, as mesmas variáveis definidas no Windows também são respeitadas. Uma chave salva pelo app tem prioridade sobre a do ambiente.

## Compilando para Windows

```bash
npm run dist
```

O instalador é gerado em `release/English-Assist-Setup-<versão>.exe` (NSIS, x64). Para testar sem instalar, `npm run dist:dir` gera apenas a pasta `release/win-unpacked/` com o `English Assist.exe`.

Depois de instalar, marque **Iniciar com o Windows** no menu da bandeja para o app subir junto com o sistema.

> O executável não é assinado digitalmente, então o Windows SmartScreen pode avisar na primeira execução. Clique em **Mais informações → Executar assim mesmo**.

### Publicando uma versão

O app instalado procura versões novas nas [Releases do GitHub](https://github.com/wallaceluis/english-writing-assistant/releases) ao iniciar, baixa em segundo plano e instala quando você sai dele. Também dá para pedir a verificação pelo menu da bandeja ou em **Configurações → Preferências**. O repositório precisa ser público para isso funcionar.

Para publicar:

1. Aumente o campo `version` do `package.json`.
2. Crie um [token do GitHub](https://github.com/settings/tokens) com o escopo `repo` e deixe-o na variável de ambiente `GH_TOKEN` do terminal.
3. Rode `npm run release`. O electron-builder compila, cria um rascunho de Release com a tag da versão e envia o instalador, o `.blockmap` e o `latest.yml`.
4. Abra o rascunho no GitHub e publique.

Sem token, rode `npm run dist` e envie manualmente para uma Release com a tag `v<versão>` estes três arquivos de `release/`: o instalador `.exe`, o `.exe.blockmap` e o `latest.yml`.

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
| `npm run release`   | Compila e envia o instalador para uma Release do GitHub         |
| `npm run icons`     | Redesenha `resources/icon.png` e `resources/tray.png`          |

## Arquitetura

```
src/
├── main/                 Processo principal do Electron
│   ├── index.ts          Inicialização, instância única, primeira execução
│   ├── window.ts         Janela flutuante sem bordas (mostrar, minimizar, posicionar)
│   ├── selection.ts      Captura do texto selecionado em outros programas
│   ├── tray.ts           Ícone e menu da bandeja
│   ├── shortcut.ts       Registro e troca dos atalhos globais
│   ├── assistant.ts      Sessões: lê o texto, percorre os provedores, emite eventos
│   ├── openai.ts         Cliente Chat Completions: streaming e tradução dos erros
│   ├── prompt.ts         Instruções para o modelo (direção, tom, glossário)
│   ├── tts.ts            Voz natural opcional pelo Gemini
│   ├── history.ts        Últimos resultados, em um arquivo local
│   ├── updater.ts        Atualização automática pelas Releases do GitHub
│   ├── settings.ts       Provedores, chaves criptografadas, atalhos e preferências
│   └── ipc.ts            Handlers das chamadas vindas do renderer
├── preload/index.ts      Ponte segura (contextBridge) exposta como window.api
├── renderer/             Interface em React + Tailwind CSS
│   └── src/
│       ├── App.tsx
│       ├── hooks/            useAssistant (sessão) e useSpeech (voz)
│       └── components/
└── shared/
    ├── ipc.ts            Canais e tipos compartilhados entre os três processos
    ├── providers.ts      Catálogo de provedores (URL base, modelo padrão, limites)
    └── shortcuts.ts      Ações com atalho global e seus padrões
```

O fluxo de um atalho:

1. O `globalShortcut` dispara no processo principal, que copia a seleção do programa em foco, lê o texto e mostra a janela.
2. O principal chama a API de Chat Completions do primeiro provedor ativo com `stream: true`; se falhar, tenta o seguinte.
3. Cada pedaço da resposta vai para o renderer pelo canal `session:event` (`start`, `provider`, `mode`, `delta`, `done` ou `error`).
4. O renderer só desenha o estado. Copiar, substituir, refazer e explicar voltam ao principal por `ipcRenderer.invoke`.

O renderer roda com `contextIsolation`, `sandbox` e sem `nodeIntegration`; as chaves e todas as chamadas de rede ficam no processo principal.

## Como a seleção é capturada

O Windows não oferece uma forma direta de ler o texto selecionado em outro programa. Ao iniciar, o app sobe um processo auxiliar do PowerShell que fica aguardando; no atalho, ele espera você soltar as teclas, envia `Ctrl+C` para a janela em foco e confere se o clipboard mudou. Se mudou, o texto é lido e o conteúdo anterior do clipboard é restaurado. Para substituir a seleção, o caminho é o inverso: o resultado vai para o clipboard, o auxiliar envia `Ctrl+V` e o clipboard é restaurado. Gerenciadores de histórico do clipboard (como o `Win+V`) registram essa cópia.

## Privacidade

- O texto só sai do seu computador quando você usa um atalho, um item do menu da bandeja ou um botão da janela. Ele vai para a API do provedor ativo e, se houver fallback, para o seguinte.
- O app só lê a seleção e o clipboard nesses momentos; não fica monitorando nenhum dos dois.
- O histórico fica em `%APPDATA%\English Assist\history.json`, em texto puro, e nunca é enviado a lugar nenhum. Dá para limpar na tela de histórico e desligar em **Configurações → Preferências**.
- A voz do Gemini, quando escolhida, envia ao Google o texto a ser lido.
- Cada provedor tem sua própria política: no plano gratuito do Gemini, por exemplo, o Google pode usar os textos para melhorar seus produtos. Com o Ollama e a voz do Windows, nada sai do computador.

## Problemas comuns

| Sintoma                                           | O que fazer                                                                                                                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aviso "Atalho indisponível" ao abrir | Outro programa já usa a combinação. Troque em **Configurações → Atalhos**. |
| `AltGr+E` parou de digitar `°`                    | No Windows, `AltGr` equivale a `Ctrl+Alt`, então o atalho captura essa combinação enquanto o app está aberto. Troque o atalho em **Configurações → Atalhos**.    |
| "… recusou a chave de API" | A chave está errada ou foi revogada. Gere outra e salve em **Configurações**. |
| "… está sem créditos ou sem cota" | A cota gratuita do dia acabou ou a conta paga está sem saldo. Ative outro provedor como fallback. |
| "… atingiu o limite de requisições" | Limite por minuto do plano gratuito. Espere alguns segundos ou ative um segundo provedor. |
| "O modelo … não existe ou não está disponível" | O ID do modelo mudou ou sua conta não tem acesso a ele. Troque em **Configurações**. |
| "Não encontrei texto selecionado nem copiado" | Selecione o texto antes do atalho. Imagens e arquivos não contam como texto. |
| O atalho ignora a seleção em um programa | Programas abertos como administrador não aceitam o `Ctrl+C` enviado pelo app. Copie com `Ctrl+C` e use o atalho em seguida. |
| O atalho de substituir colou no lugar errado | O texto é colado na janela em foco quando a resposta chega. Não troque de janela enquanto o botão da barra de tarefas pulsa; `Ctrl+Z` desfaz. |
| "Não foi possível verificar agora" nas atualizações | Ainda não há Release publicada no GitHub, ou não há internet. |
| `npm install` falha ao instalar o Electron        | O projeto fixa o Electron 39, a última série cujo instalador roda no Node 20. Para usar um Electron mais novo, atualize o Node para 22.12 ou superior.      |

## Stack

[Electron](https://www.electronjs.org) · [electron-vite](https://electron-vite.org) · [React](https://react.dev) · [TypeScript](https://www.typescriptlang.org) · [Tailwind CSS](https://tailwindcss.com) · [OpenAI Node SDK](https://github.com/openai/openai-node) · [electron-builder](https://www.electron.build) · [electron-updater](https://www.electron.build/auto-update)

## Licença

[MIT](LICENSE)
