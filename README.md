# Aurora MIDI

Player MIDI e karaokê para Windows 10/11 x64. O Aurora reúne reprodução,
playlists, mixagem e ferramentas de acompanhamento em uma aplicação desktop
offline. Esta versão corresponde ao pacote 0.14.0.
Os arquivos de atualização e o histórico de versões ficam em `Atualizações/`.

### Pacote portátil abaixo de 500 MB

O pacote de distribuição é gerado separadamente da pasta de desenvolvimento.
Na pasta `resources/app`, execute `npm run build:portable`; a saída fica em
`dist/AuroraMIDI_Leve`, na raiz do projeto. Para escolher outra pasta nova, use
`npm run build:portable -- --out CAMINHO`. O gerador usa apenas Node.js,
recusa sobrescrever pastas existentes e verifica o limite de 500.000.000 bytes
para a pasta **descompactada**.

O pacote mantém o runtime Electron, o motor MIDI, as DLLs gráficas e de áudio,
as licenças e todas as ferramentas musicais. Inclui os idiomas pt-BR, pt-PT e
en-US. Histórico Git, cópias de trabalho, backups, testes e ferramentas de
desenvolvimento ficam fora da distribuição. As sete imagens PNG do Cifra Dog
que já são usadas em WebP também ficam fora; os originais permanecem nos fontes.
Um manifesto SHA-256 permite conferir os arquivos distribuídos.

Para conferir tamanho, hashes e recursos locais do pacote sem dependências:
`npm run test:portable -- ../../dist/AuroraMIDI_Leve --static`.
Sem `--static`, o teste também usa Playwright para abrir o executável,
iniciar/pausar a demonstração e abrir o monitor da mão esquerda.

Validação do pacote em 25/11/2026: 330.993.881 bytes descompactados e
150.369.684 bytes no ZIP. Integridade SHA-256, recursos offline, testes MIDI,
mixagem, transporte e interface de karaokê/mixer passaram. O teste da interface
usou os arquivos do pacote no Edge. A abertura nativa automatizada do Electron
foi bloqueada pelas ACLs do ambiente Windows de execução e não foi validada;
as proteções de sandbox do aplicativo distribuído permanecem habilitadas.

> **Pacote portátil:** o repositório inclui `AuroraMIDI.exe` e os recursos do
> runtime Electron para Windows. O executável é armazenado com Git LFS; instale
> Git LFS antes de clonar ou execute `git lfs pull` após o clone. Os fontes para
> desenvolvimento ficam em `resources/app`.

## Funcionalidades

- Reproduz MIDI formato 0/1, KAR e RMI, com letras sincronizadas quando
  presentes no arquivo.
- Mantém playlists VPL compatíveis com o VanBasco, listas nomeadas, busca,
  filtros, ordenação, fila “Tocar a seguir” e reprodução contínua.
- Oferece controles de velocidade e tom, repetição, reprodução aleatória,
  prévia, loop A-B e entrada rápida que ignora silêncios no início e no fim.
- Inclui mixer de 16 canais com volume, panorâmica, mute/solo e programas
  General MIDI; permite guardar mixes e exportar uma cópia MIDI ajustada.
- Exibe letras, teclado de piano e análise aproximada de acordes, com cifras,
  diagramas de violão e contagem para a próxima troca.
- Organiza Player, Playlist, Controles, Mixer, Karaokê, Piano e Acordes em
  painéis separados ou encaixados. Temas, layouts e ajustes são salvos localmente.
- A virada MIDI conecta músicas da fila ou da playlist: estima o andamento
  efetivo de ambas, toca uma variação de um compasso e procura a entrada do
  acompanhamento na próxima faixa. A entrada pode ser ajustada manualmente.

## Como funciona

O aplicativo é construído com Electron. A interface e os módulos de música
ficam em `resources/app`; `main.cjs` gerencia janelas e operações locais,
enquanto `preload.cjs` expõe à interface uma ponte IPC restrita. O motor MIDI
analisa eventos, tempos, sustain e letras; a saída nativa do Windows usa WinMM
por meio de `midi-bridge.ps1`. A prévia Web Audio é simplificada e pode soar
diferente do sintetizador ou teclado MIDI escolhido.

As músicas e listas são lidas localmente; o aplicativo não envia os arquivos
para servidores. Arquivos de backup `.aurora` preservam dados da sessão e
mixagens; VPL e MIDI exportado são formatos separados e não guardam todos os
ajustes visuais ou de mixagem do backup.

## Como usar

### Executar a versão portátil

No Windows 10/11 x64, abra `AuroraMIDI.exe` na raiz do pacote. O pacote inclui
o runtime necessário e não é um instalador.

### Executar a versão de desenvolvimento

Requisitos: Windows 10/11 x64, Node.js e npm.

```powershell
cd resources/app
npm install
npm start
```

O Aurora abre como aplicação desktop. Para começar, abra um MIDI (`Ctrl+O`)
ou importe uma lista VPL. Use os controles de transporte para reproduzir e
pausar; os painéis de Playlist, Mixer, Karaokê, Piano e Acordes ficam
disponíveis pela interface. Na Playlist, use `+` para colocar uma faixa na
fila “Tocar a seguir”. Para uma transição, clique em **Virada** para aguardar
o fim da faixa atual ou em **Confirmar** para iniciá-la imediatamente.

### Testes

Na pasta `resources/app`:

```powershell
npm test
npm run test:ui
npm run test:v08
```

`test:ui` usa DOM simulado; os testes automatizados não substituem a
verificação de áudio, janelas nativas e dispositivos MIDI em um Windows real.

## Compatibilidade e limites

- A saída de áudio depende do sintetizador Windows ou do dispositivo MIDI
  selecionado; latência e timbres variam entre dispositivos.
- A análise de acordes e a detecção automática do acompanhamento são
  aproximadas. Arranjos ambíguos podem exigir a seleção manual do canal ou
  ajuste do ponto de entrada.
- MIDI formato 2, geração automática de letras e skins/plugins binários do
  VanBasco não são suportados.
- O repositório inclui o executável portátil e o runtime Electron/Chromium;
  respeite também os avisos de licença incluídos no pacote ao redistribuí-lo.

## Autoria e licença

Autoria indicada nos metadados do pacote: **Gabriel** (`author: Gabriel`).
Conta associada ao repositório: [@GabrielSimaon](https://github.com/GabrielSimaon).
O código do Aurora é distribuído sob a licença MIT; consulte
[`LICENSE`](LICENSE) e `resources/app/LICENSE_AURORA.txt`.

