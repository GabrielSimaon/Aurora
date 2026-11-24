# Aurora MIDI 0.3.0

Player desktop offline para Windows x64, com UI em Electron, saída nativa WinMM e modo de prévia Web Audio. O pacote portátil contém o runtime; o usuário abre AuroraMIDI.exe sem comandos. Não inclui nem executa vmidi.exe, DLLs ou complementos binários antigos.


## Mudanças 0.3

- `mixer-core.js`: catálogo contextual de programas GM, kits opcionais, estado original e snapshots normalizados de mix. Recomendações não mudam o estado de um arquivo recém-aberto.
- `mixer-ui.js`: recomendações, edição ao vivo, salvar/recuperar mix por música, original por canal/global e exportação de cópia. A origem (`songs[].bytes` e eventos parseados) nunca é reescrita. O backup `.aurora` inclui a origem, o snapshot confirmado e os ajustes atuais.
- `player.setProgram`: altera bancos/programa e retoca somente as vozes do canal; não faz reset do dispositivo, não busca outra posição e não troca bateria ou canais vizinhos. Restaura os bancos/programas originais ao retirar o override. Resets GM/GS/XG reconhecidos rearmam os programas antes da primeira nota de cada canal.
- `midi-core.write`: grava as escolhas GM também quando o arquivo contém Bank Select ou reset GM. O volume geral de monitoração não entra no arquivo; o ganho por música entra.
- `compact-ui.js`: janela principal compacta com barra e transporte. Dock alterna seis janelas independentes; o estúdio maior permanece como modo opcional. Playlist e controles destacados usam IPC para o mesmo player principal, sem duplicar áudio ou abrir outra sessão.
- `save-song-as`: verifica se o destino selecionado é a origem (incluindo realpath/identidade do arquivo) e pede outro nome quando necessário. Origem desconhecida em uploads arrastados usa o nome sugerido _Minha_Mix; o usuário ainda deve escolher um nome diferente se salvar manualmente nesse caso.
- `dev-tools/embed_icon.py`: utilitário de empacotamento com LIEF/pefile, sem dependência de execução. Substitui as imagens RT_ICON e preserva integralmente a seção .text, inclusive seu padding. Verifica import hash e entry point. O runtime recebido não possuía assinatura Authenticode; nenhuma proteção do computador é alterada.
- Novos testes: `tests-v3.cjs`, `dev-tests/test-v3-ui.cjs`, `test-panels.cjs` e `test-desktop.cjs`. Há IO real em diretórios temporários, DOM/IPC/janelas simulados e verificação de recursos PE. O executável não foi executado neste host Linux.

O catálogo recomenda programas MIDI existentes; não contém um banco de samples de áudio de terceiros. A saída Windows/dispositivo define a gravação/timbre real. A prévia Web Audio é simplificada. O snapshot "salvo" fica separado dos ajustes atuais, permitindo experimentar, restaurar a origem e recuperar a mix confirmada.

## Módulos

- `midi-core.js`: parser SMF 0/1 e RMI; mapa de tempo, SMPTE, letras, sustain, conversão ticks/segundos e exportação de MIDI ajustado.
- `player.js`: reprodução, estado dos controladores, vozes em sustain, busca, A-B, ganho por música e transposição ao vivo. Transpor retoca somente as vozes melódicas, sem reiniciar relógio, dispositivo, programas ou bateria. Notas fora de 0–127 são suprimidas conforme o filtro do VanBasco enviado.
- `playlist-core.js`: formato VPL, campos entre aspas, acentuação Windows-1252, máscaras de mute/redução, speed factor, semitons e volume 0–255; comparação de texto e ordenação personalizada independente da ordenação alfabética.
- `playlist-files.cjs`: acesso local escolhido pelo usuário, localização de arquivos movidos e exportação de VPL com cópias de MIDIs quando faltam caminhos válidos. Não altera as fontes.
- `playlist-ui.js`: múltiplas listas, ordenação, filtros, arquivos de pasta, reprodução contínua e controles de painéis destacados.
- `harmonic-core.js`: análise harmônica por tempos e duração/sustain, escolha de canal, sequência atual/próxima, formas de violão e recomendação de capotraste.
- `harmonic-analyzer.worker.js`: análise em worker para manter a interface livre durante a reprodução.
- `chord-ui.js`: cifras, contagem, estudo, histórico, capotraste, canhotos, congelamento e modo faixa.
- `main.cjs`, `preload.cjs`, `midi-bridge.ps1`: janela, IPC restrito, arquivos e ponte WinMM. A ponte inicializa C# pelo Windows PowerShell instalado no sistema, sem mostrar terminal. Não instala drivers nem serviços.
- `stage.*`, `chord-stage.*`, `panel-stage.*`: karaokê, acordes, Output e piano em janelas independentes. A janela de acordes minimiza pelo X e encerra com o player.

O renderer mantém isolamento de contexto, sandbox e CSP sem scripts remotos. Não habilitar nodeIntegration. Os fontes ficam em `resources/app`; não há node_modules de produção, pois o código do player não usa dependências de execução adicionais além do Electron.

## Testes para desenvolvimento

`npm test`: testes puros, inclusive arquivos temporários de VPL/MIDI.

`npm run test:ui`: testes em DOM simulado, após instalar as devDependencies. O desenvolvimento exige Node; o aplicativo pronto não exige. Os testes exercitam interfaces, não substituem a inspeção visual real. O fixture `fixtures/Teste-Acordes.mid` vem do pacote enviado para comparação e contém C | Am | F | G.

Foram também analisados os nove MIDIs/KARs de referência e o VPL incluído no ZIP enviado. Testes isolados em emulador da DLL/executável de referência confirmaram os limites de transposição +/-12, Am→Bm com +2 e o descarte de notas que ultrapassam a faixa MIDI. Os binários de referência não são distribuídos com o Aurora.

## Limites de fidelidade e verificação

A transposição e os campos VPL foram comparados à lógica/estrutura da referência, mas este é outro motor e outra UI. Não há execução de skins LYT, plugins de navegador ou DLLs antigas. A redução do VPL é mapeada para 25% no mixer e convertida novamente à máscara correspondente na exportação. Mixagem detalhada, programas e pan são preservados em backup Aurora ou no MIDI exportado; não cabem nos campos VPL legados.

A entrada rápida retira silêncio de início/fim para a execução contínua. A troca é imediata na lógica do aplicativo, com MIDIs já analisados, mas não garante áudio sem intervalo entre notas em qualquer dispositivo; WinMM, o sintetizador e o hardware têm latência própria.

A análise de acordes segue a abordagem do complemento fornecido: janelas de 1/2 tempos, duração de notas/sustain, preferência por acompanhamento, baixo para resolver ambiguidades, cache e detecção ao vivo como reserva. Ela é aproximada. SMPTE usa leitura ao vivo sem próximo acorde; limite da análise antecipada: 20 mil janelas. Posições não cadastradas são informadas sem inventar digitação. Capotraste só altera representação visual e cifras copiadas.

Validação feita no Linux: testes do núcleo, arquivos de referência, IO de playlists, DOM simulado e IPC simulado. Não foi possível validar a aparência renderizada, as janelas Win32, a leitura do VPL exportado dentro do VanBasco original, o áudio WinMM e dispositivos físicos em um Windows real. Esses testes permanecem necessários no computador de uso.

O runtime Electron/Chromium mantém seus avisos de licença no diretório do programa. Veja `LICENSE` e `LICENSES.chromium.html`; o código do Aurora tem licença em `LICENSE_AURORA.txt`.
