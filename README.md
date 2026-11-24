# Aurora MIDI

Player MIDI e karaokê para Windows 10/11 x64. O Aurora reúne reprodução,
playlists, mixagem e ferramentas de acompanhamento em uma aplicação desktop
offline. Esta versão corresponde aos fontes 0.8.0.

> **Estado do pacote:** o ZIP de origem contém os fontes e a documentação,
> mas não inclui `AuroraMIDI.exe` nem as DLLs/runtime do pacote portátil.
> Portanto, este repositório permite executar a versão de desenvolvimento;
> não é um instalador pronto para uso.

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
- O ZIP fornecido não contém o executável portátil. A distribuição de uma
  versão pronta requer empacotar a aplicação e respeitar também os avisos de
  licença do Electron/Chromium.

## Autoria e licença

Autoria indicada nos metadados do pacote: **Gabriel** (`author: Gabriel`).
Conta associada ao repositório: [@GabrielSimaon](https://github.com/GabrielSimaon).
O código do Aurora é distribuído sob a licença MIT; consulte
[`LICENSE`](LICENSE) e `resources/app/LICENSE_AURORA.txt`.

