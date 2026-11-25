# Aurora MIDI 0.11.1

## Diagnostico para outro computador (0.11.1)

A versao e exibida no topo do painel. Salvar diagnostico exporta um JSON com
entrada selecionada, filtros, divisao, notas ativas e as ultimas 2048 mensagens
curtas. Marcadores identificam testes com CHORD/ACMP ligado/desligado; nao
controlam o instrumento. Clock e active sensing nao ocupam o log bruto, mas
continuam contados. O arquivo nao inclui playlists ou fontes de musicas.

A funcao permite investigar o notebook fisico sem assumir que ele compartilha
o filesystem ou os dispositivos da sessao de desenvolvimento. Ainda nao ha
validacao fisica do envio da esquerda do E-X50 com ACMP. O pacote inclui um
atualizador .NET com selecao de pasta, backup e verificacao SHA256 das copias.

## So mao esquerda (0.11)

O atalho da barra principal abre o monitor com leftOnly=1. Em uma janela ja
aberta, o IPC live-keyboard-mode ativa o mesmo modo sem criar outro monitor.
O estado e salvo; o canal e a divisao sao guardados por nome do dispositivo.
O E-X50/SX600 e preferido a portas genericas quando nao ha selecao anterior.

left-hand-core.js usa limite superior de nota (54 por padrao, ajustavel ou
marcado por uma tecla) e aprende um canal melodico ao receber um acorde real,
com pelo menos tres classes de notas abaixo do limite. O canal 10 nao participa
da aprendizagem automatica; pode ser selecionado manualmente. Nao existe uma
identificacao universal de mao fisica no protocolo MIDI: a faixa selecionada
precisa corresponder a divisao do instrumento. O filtro funciona inclusive
quando as duas maos usam o mesmo canal. Mensagens brutas continuam disponiveis.

O ultimo acorde valido permanece visivel para o violonista nos intervalos,
com a legenda Ultimo acorde recebido. Ele e apagado ao trocar/desconectar a
entrada, limpar notas ou alterar a fonte. Notas da direita e sinais de ritmo
nao criam um acorde da esquerda. Canais e divisao podem ser redetectados.

A funcao nao recupera notas/acordes internos que o ACMP do E-X50 nao envie
pelo USB. O relato de ausencia de notas da esquerda com ACMP ativo continua
sem uma captura fisica controlada. Nao foi atribuida uma correcao desse envio.

npm run test:left-hand cobre selecao do teclado, descoberta de canal, divisao
marcada, melodia na mesma/diferente pista, memoria com rotulo explicito, perfis
por dispositivo, persistencia e ausencia de cifras quando so chega a direita.

## Verificacao CHORD/ACMP (0.10.2)

Foi relatado que a mao direita chega normalmente, mas a esquerda nao aparece
quando CHORD/ACMP esta ligado no E-X50. Ainda nao foi capturado o sinal do
instrumento fisico nesse estado: a causa nao esta confirmada.

O painel agora conta Note On antes do filtro de exibicao, informa os canais
recebidos e permite Testar CHORD/ACMP com os 16 canais habilitados. O botao
reinicia os contadores para comparar exclusivamente a mao esquerda, sem
alterar o modo do teclado. O usuario pode voltar aos filtros depois do teste.
A ponte preserva mensagens curtas de canal e sinais de tempo/inicio/parada;
esses sinais nunca sao tratados como notas ou acordes. SysEx nao e capturado.
Isso distingue notas filtradas de um teste sem notas recebidas. Nao recupera
acordes internos que o instrumento eventualmente nao transmite por MIDI.

Testes simulam notas no canal 10 bloqueado, liberacao dos canais, trafego de
ritmo sem notas, diagnostico e reconhecimento apenas apos receber notas reais.
Uma correcao definitiva para o comportamento fisico depende do resultado do
teste no E-X50. Ativar SPLIT como teste da parte esquerda e uma hipotese de
configuracao, nao uma garantia documentada de transmissao USB com ACMP.

## Teclado ao vivo (0.10)

Botao ao lado de Layout padrao abre uma janela independente no estilo Acordes.
`live-keyboard.js` prioriza as entradas WinMM do Windows, por meio de
`midi-input.cjs`, `midi-input.ps1` e `native-midi-client.js`. O processo separado
usa midiInGetNumDevs, midiInGetDevCapsW, midiInOpen e midiInStart. O callback
C# apenas enfileira mensagens; as operacoes WinMM ficam na thread principal.
Mensagens sao agrupadas antes de chegar ao renderer; excesso de fila limpa
notas em vez de deixa-las presas. As entradas sao verificadas a cada 2 segundos.
Atualizar forca nova enumeracao. Erros de dispositivo ocupado sao exibidos.
Fechar o painel ou o Aurora libera a entrada. A ponte de saida do player e
independente e nao foi modificada.

Web MIDI, sem SysEx, permanece como reserva em plataformas sem WinMM. O painel
usa a sessao exclusiva `persist:aurora-live-keyboard` e permissoes somente para
MIDI comum, sem alterar permissoes do player. Nao abre saidas nem faz MIDI Thru.
Nao recebe eventos do player: as notas mostradas vem apenas do dispositivo
selecionado. O painel encerra junto com o player e participa do grupo de janelas.

`live-keyboard-core.js` mantem contagens por canal/nota, sustain e All Notes Off,
All Sound Off e Reset Controllers. Os filtros guardam o estado de todos os
canais; por padrao apenas o canal 10 fica excluido. Acompanhamentos melodicos
podem exigir escolher os canais transmitidos pelas maos do tecladista no
instrumento. Nao se presume um mapa de canais fixo para Yamaha ou Roland.
Desconectar ou trocar de dispositivo limpa as notas. O piano e atualizado por
requestAnimationFrame; acordes sao reconhecidos a cada lote de 65 ms sem
debounce que possa ficar adiado indefinidamente por ritmos densos.

Testes em `npm run test:live-keyboard`: notas, acordes, sustain, filtro de canais,
mensagens de limpeza, eventos densos, reconexao simulada, localizacao do botao,
janela unica, permissoes e encerramento. `npm run test:midi-input` cobre a ponte
nativa, enumeracao, refresh, mensagens, desconexao e erro de dispositivo ocupado.
A ponte real foi compilada e iniciada no Windows; a sessao de teste nao expunha
entradas fisicas. PSR-SX600/E-X50 ainda requerem validacao conectados.

## Atalho Cifra Dog (0.9.2)

O botao Cifra Dog abre a copia local em `integrations/cifra-dog/v2` no navegador
padrao. O launcher usa HTTP apenas em 127.0.0.1:47835, iniciado sob demanda,
com origem fixa para preservar o IndexedDB do Cifra Dog. O servidor encerra
com o Aurora. Nao ha troca de faixas, cifras ou dados entre os dois aplicativos.
O codigo original e sua licenca MIT acompanham a copia local. A pasta v2 e os
pacotes vieram do Cifra-Dog-main presente na Area de Trabalho.

## Estabilidade das janelas (0.9.1)

`showGroup` nao volta a mostrar ou elevar janelas ja visiveis quando recebe
foco. Somente paineis escondidos pela minimizacao do grupo sao restaurados,
com `showInactive`, sem roubar foco. Isso elimina o ciclo de eventos de foco
assincronos que o antigo `show`/`moveTop` podia gerar no Windows.

Eventos nativos `leave-full-screen` nao desencaixam mais os paineis. A tela
cheia e o layout encaixado sao estados independentes; soltar telas continua
disponivel nos botoes e atalhos explicitos. A repeticao de teclas seguradas
e ignorada para Ctrl+Shift+D e Escape, inclusive dentro dos iframes.

`npm run test:windows` cobre eventos de foco enfileirados, restauracao de
paineis ocultos/minimizados, eventos tardios de tela cheia, 20 ciclos de
encaixe, cinco inicializacoes no navegador e repeticao de atalhos. Eventos
nativos usam um simulador; a piscada intermitente em Windows real nao foi
reproduzida de forma controlada neste teste.

## Continuidade da reproducao (0.9)

A playlist aberta e a faixa carregada possuem identidades separadas. Navegar
entre listas preserva o transporte; mixer, exportacao, fila e deteccao de
viradas usam a identidade da faixa em reproducao. O avanco volta para a lista
de origem. Playlists analisadas mantem os mesmos objetos em memoria; listas
restauradas ainda nao analisadas passam por `midi-parser.worker.js`, um arquivo
por mensagem. Um contador descarta resultados de navegacoes ultrapassadas.

O IndexedDB continua usando a store `state` da versao 1, com chaves imutaveis
`midi-UUID` para os bytes e referencias `bytesKey` nos registros da sessao.
A primeira gravacao migra os bytes legados; as seguintes gravam apenas ajustes
e metadados. Gravacoes sao serializadas e a sessao e confirmada depois dos bytes.
`restoreMidiBytes` aceita tanto o formato anterior quanto o novo. Arquivos
removidos podem deixar chaves de bytes antigas; nao ha coleta automatica nesta
versao. Fazer downgrade exige exportar um backup Aurora antes, pois a versao
anterior nao conhece `bytesKey`.

`npm run test:continuity` executa a regressao em Edge com 200 MIDIs sinteticos
de aproximadamente 60 KB. Verifica continuidade, ausencia de resets MIDI,
identidade dos eventos, dono da mix, filas entre listas, viradas agendadas,
cancelamento de navegacao concorrente e restauracao da sessao. A saida MIDI e
simulada; a latencia audivel WinMM requer teste no dispositivo de uso.

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
- `mixer-ui.js`, `mixer-core.js`, `mixer-enhancements.css`: preferências dentro da aba Mixer, faders por instrumento até 200%, boost com compensação de velocidade quando o volume MIDI atinge o limite e sugestões mantidas no mixer compacto.
- `performance-ui.js`, `transition-core.js`: viradas agendadas para começar no último compasso e concluir junto da transição, com detecção conservadora da entrada da faixa seguinte.
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


## 0.12.0 — reproducao independente da interface e configuracoes sobre o dock

O envio MIDI nativo usa agora uma timeline completa compilada em native-transport.js,
transmitida por IPC restrito ao processo principal e executada por midi-timeline.cs
no processo WinMM. Um Stopwatch monotono e uma thread dedicada entregam notas,
controladores e SysEx sem depender dos timers ou desenhos do Chromium. Pausa,
stop, busca e carregamento cancelam a fila antes do reset. Ajustes de mix, tom e
andamento substituem apenas os eventos futuros, preservando as notas em curso.
Note-offs continuam sendo enviados durante mute para evitar notas presas.
O renderer acompanha a posicao apos uma tarefa longa e nunca reenvia eventos ja
agendados. Viradas e caudas usam o mecanismo anterior durante a transicao e retomam
a timeline nativa quando nao existem mais caudas. A previa Web Audio continua
simplificada; os nos de audio sao desconectados ao terminarem.

Atualizacoes visuais do transporte foram limitadas a 25 Hz; acordes e paineis a
10 Hz, com cache da playlist e da entrada detectada. A fila nativa nao depende
dessa taxa. Se o bridge rejeitar a timeline, o player usa o envio compativel.

transport-keyboard.js centraliza Espaco na captura: janela principal, todos os
paineis grudados/soltos e teclado ao vivo. Repeticao de tecla nao alterna novamente;
campos de texto, selects, composicao e dialogos de formulario preservam sua edicao.
O roteador do dock aceita play tambem de acordes e karaoke.

Configuracoes permanecem em um dialog nativo HTML sobre o dock. Abrir, fechar,
mudar tema/letras ou decodificacao nao troca o modo da janela nem reinicia MIDI.
O Espaco funciona nos controles nao textuais desse dialog; Esc fecha somente as
configuracoes. Os mesmos ajustes continuam acessiveis no painel Mixer grudado.

Validacao nesta versao: testes puros de MIDI/mix/transicoes; testes Edge de dock,
viradas, playlists grandes, entrada MIDI e mao esquerda; regressao de Espaco nos
seis paineis e nas configuracoes; simulacao de bloqueio de renderer de 1,3/2,5 s
sem reenvio de notas; thread C# com entrega real por relogio e cancelamento,
substituicao de tempo/mix, busca e limite final. Bridge WinMM real compilou e abriu
Microsoft GS Wavetable Synth. A execucao automatizada do Electron nesta sessao foi
bloqueada pela ACL AppContainer do ambiente; ela nao foi alterada. A qualidade
audivel e a carga no notebook do usuario precisam ser conferidas no dispositivo.


## 0.13.0 — entrada rapida, troca de musica e workspace unico

A selecao da musica inicia o transporte antes de reconstruir telas. Eventos
visuais de load/play sao agrupados e os paineis sao atualizados na tarefa seguinte.
A entrada rapida comeca exatamente na primeira nota, incluindo selecao por clique
na playlist. Clique duplo nao provoca um segundo restart. O sinalizador needsSeek
obriga a inicializacao do transporte mesmo quando o novo arquivo comeca em zero:
antes, deferSeek/preservePlaying podiam manter vozes do arquivo anterior. A ponte
WinMM cancela a fila antiga e envia sustain-off, all-notes-off e all-sound-off nos
16 canais antes do reset, sem deixar notas antigas reentrar depois dele. Viradas
continuam preservando apenas as caudas explicitamente autorizadas.

playback-preparation.js prepara a faixa atual e vizinhas em native-prepare.worker.js,
sem transformar o MIDI no clique quando o cache ja esta pronto. O cache usa estado
da mix/volume/tom, guarda offsets dos eventos e tem limite de 8 planos/16 MiB.
Passar o mouse por uma faixa tambem solicita preparo, com fila curta e deduplicada.
Atualizacoes dinamicas dos paineis nao reenviam a lista completa nem preferencias;
frames grudados seguem diretamente ao iframe interessado, sem passar pelo IPC
nativo. Os paineis combinam metadados completos com deltas do transporte.

O workspace grudado e o unico modo para player, mixer, piano, playlist, controles,
karaoke e acordes. Botoes e atalhos de soltar/estudio foram retirados; pedidos IPC
legados sao ignorados ou roteados ao painel embutido. Esc sai de um painel ampliado
ou fecha um dialogo; nunca desmonta o workspace. A ferramenta de entrada de teclado
continua independente, acessivel por Opcoes, preservando o layout principal.

workspace-menu.js/.css oferecem Opcoes na barra superior: arquivos, biblioteca,
playlists, detalhes/marcadores, exportacao, mix, paineis, ajustes de acordes/estudo,
entrada de teclado, preferencias, tema, Cifra Dog, layout, ajuda e corte de notas.
Biblioteca, detalhes e ajustes de acordes abrem sobre o workspace, usando os mesmos
controles existentes. Feito por Gabriel Simao (com acentuacao na interface) aparece
no menu e na ajuda; o autor do pacote tambem foi atualizado.

Validacao: test:workspace cobre menu, dock fixo, encaminhamento sem janelas soltas,
settings sem resets, Espaco, clique real nas linhas, 20 trocas rapidas, nota antiga
sustentada com sustain, entrada de arquivo com 3,25 s de silencio e worker/cache.
A primeira nota foi observada em cerca de 0,2–0,4 ms no envio simulado, antes de uma
reconstrucao visual artificial de 180 ms. Isso mede o agendamento no teste, nao a
latencia audivel do Windows ou do teclado do usuario. Os testes de continuidade,
viradas, MIDI e ponte WinMM permanecem parte da verificacao desta versao.
Os testes historicos que esperam alternar para janelas soltas descrevem modos
retirados; test:workspace substitui esse contrato de interface.


## 0.14.0 — letras, menu, atividade MIDI e viradas curtas

stage.js agora aplica frame.size em --lyric-size. stage.css usa esse valor com
prioridade sobre os clamps de viewport do modo compacto/fullscreen. O tamanho
escolhido funciona no iframe grudado, em painel ampliado e na janela de karaoke.
A mudanca de tamanho nao reinicia o transporte nem troca o layout.

O menu Opcoes preserva ferramentas complementares, preferencias, entrada de
teclado, organizacao e ajuda. Abrir/importar/salvar playlists, exportar e salvar/
restaurar mix continuam nas janelas principais; esses atalhos duplicados foram
retirados do menu, assim como o segundo botao de tema.

mixer-activity.js/.css exibem uma linha compacta por canal, com 20 segmentos,
instrumento atual, notas e M/S. Os controles completos continuam em Timbres,
volumes e mixagem, recolhidos por padrao. Ataques MIDI sao registrados em track()
e mantidos por 200 ms com decaimento, para que bateria muito curta apareca entre
quadros. Notas sustentadas mantem atividade ate soltarem. Mute, solo, pausa e
stop afetam os indicadores. Sao indicadores de atividade/velocidade MIDI, nao
medidores de amplitude de audio. Os quadros dinamicos vao a 20 Hz e nao repetem
metadados de canais, playlist, preferencias ou mix.

Viradas planejadas usam no maximo dois tempos em vez de quatro e sao agendadas
nos dois tempos finais. O andamento musical e preservado. O banco de padroes
existente foi mantido nesta etapa; a substituicao por viradas extraidas dos
exemplos depende dos arquivos MIDI que o usuario vai enviar.

Testes Edge: tamanhos reais de 24/72/40 px no karaoke grudado; menu sem atalhos
duplicados; indicadores de notas curtas, acordes, programas, mute, pausa e
controle completo recolhivel; virada de 1 s a 120 BPM nos ultimos dois tempos.
Regressoes de transporte, notas presas, Espaco, worker/cache e transicoes tambem
foram executadas. Testes de duracao foram atualizados para a nova extensao.
