using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Security.Cryptography;
using System.Windows.Forms;
public static class AuroraUpdater {
 public const string Version="0.14.0";
 static string Full(string value){string full=Path.GetFullPath(value);return full.Length>Path.GetPathRoot(full).Length?full.TrimEnd(Path.DirectorySeparatorChar):full;}
 static bool Inside(string value,string root){return value.Equals(root,StringComparison.OrdinalIgnoreCase)||value.StartsWith(root+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase);}
 public static void CheckPayload(string payload){
  foreach(string file in new[]{"package.json","mixer-activity.js","mixer-activity.css","stage.js","stage.css","workspace-menu.js","workspace-menu.css","playback-preparation.js","native-prepare.worker.js","native-transport.js","midi-timeline.cs","midi-bridge.ps1","transport-keyboard.js","main.cjs","preload.cjs","index.html","live-keyboard.html","live-keyboard.js","left-hand-core.js","live-keyboard-core.js","midi-input.ps1","midi-input.cjs","native-midi-client.js","midi-input-diagnostics.js"})if(!File.Exists(Path.Combine(payload,file)))throw new IOException("Arquivo ausente: "+file+". Extraia o pacote inteiro antes de atualizar.");
  if(!Regex.IsMatch(File.ReadAllText(Path.Combine(payload,"package.json")),"\"version\"\\s*:\\s*\"0\\.14\\.0\""))throw new IOException("O pacote nao corresponde a versao "+Version+".");
 }
 static void CopyTree(string source,string destination){
  if((File.GetAttributes(source)&FileAttributes.ReparsePoint)!=0)throw new IOException("Pasta vinculada nao pode ser copiada: "+source);
  Directory.CreateDirectory(destination);
  foreach(string file in Directory.GetFiles(source)){if((File.GetAttributes(file)&FileAttributes.ReparsePoint)!=0)throw new IOException("Arquivo vinculado: "+file);File.Copy(file,Path.Combine(destination,Path.GetFileName(file)),true);}
  foreach(string folder in Directory.GetDirectories(source))CopyTree(folder,Path.Combine(destination,Path.GetFileName(folder)));
 }
 static string Hash(string path){using(var sha=SHA256.Create())using(var stream=File.OpenRead(path))return BitConverter.ToString(sha.ComputeHash(stream));}
 public static string Apply(string payload,string target){
  payload=Full(payload);target=Full(target);CheckPayload(payload);
  if(!File.Exists(Path.Combine(target,"AuroraMIDI.exe")))throw new IOException("Escolha a pasta que contem AuroraMIDI.exe.");
  string installed=Path.Combine(target,"resources","app");
  if(Inside(payload,installed)||Inside(installed,payload))throw new IOException("Extraia a atualizacao fora de resources\\app do programa.");
  bool original=Directory.Exists(installed);string backup=Path.Combine(target,"Backups_Atualizacao","antes_"+Version+"_"+DateTime.Now.ToString("yyyyMMdd_HHmmss_fff"));
  if(original)CopyTree(installed,backup);
  try{
   CopyTree(payload,installed);
   foreach(string file in Directory.GetFiles(payload,"*",SearchOption.AllDirectories)){string relative=file.Substring(payload.Length+1);if(Hash(file)!=Hash(Path.Combine(installed,relative)))throw new IOException("Verificacao de copia falhou: "+relative);}
  }catch(Exception error){if(original){try{CopyTree(backup,installed);}catch(Exception restore){throw new IOException("Falha ao atualizar e restaurar. Backup: "+backup+Environment.NewLine+restore.Message,error);}}throw new IOException("Atualizacao nao concluida. Backup: "+backup+Environment.NewLine+error.Message,error);}
  return original?backup:"";
 }
 [STAThread] public static int Main(string[] args){
  try{
   string payload=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"resources","app");CheckPayload(payload);
   if(args.Length==2&&args[0]=="--test-target"){Apply(payload,args[1]);return 0;}
   Application.EnableVisualStyles();
   if(MessageBox.Show("Feche o Aurora por Encerrar no notebook antes de continuar.\n\nNa proxima janela, escolha a pasta que contem AuroraMIDI.exe.","Atualizar Aurora MIDI "+Version,MessageBoxButtons.OKCancel,MessageBoxIcon.Information)!=DialogResult.OK)return 0;
   using(var dialog=new FolderBrowserDialog()){
    dialog.Description="Escolha a pasta que contem AuroraMIDI.exe";dialog.ShowNewFolderButton=false;
    if(dialog.ShowDialog()!=DialogResult.OK)return 0;
    string backup=Apply(payload,dialog.SelectedPath);
    MessageBox.Show("Aurora atualizado para "+Version+".\n\nAbra AuroraMIDI.exe normalmente. Em Ajuda ou no painel Teclado ao vivo, confira o numero "+Version+".\n\nBackup: "+backup,"Atualizacao concluida",MessageBoxButtons.OK,MessageBoxIcon.Information);
   }return 0;
  }catch(Exception error){if(args.Length>0)return 1;MessageBox.Show(error.Message,"Atualizacao nao concluida",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}
 }
}
