$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Threading;
using System.Collections.Concurrent;
using System.Runtime.InteropServices;
public class AuroraMidiInput {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct Caps {public ushort mid,pid;public uint version;[MarshalAs(UnmanagedType.ByValTStr,SizeConst=32)]public string name;public uint support;}
 [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void InputCallback(IntPtr handle,uint message,UIntPtr instance,UIntPtr data,UIntPtr timestamp);
 [DllImport("winmm.dll")] static extern uint midiInGetNumDevs();
 [DllImport("winmm.dll",CharSet=CharSet.Unicode,EntryPoint="midiInGetDevCapsW")] static extern uint midiInGetDevCaps(UIntPtr id,out Caps caps,uint size);
 [DllImport("winmm.dll")] static extern uint midiInOpen(out IntPtr handle,uint device,InputCallback callback,UIntPtr instance,uint flags);
 [DllImport("winmm.dll")] static extern uint midiInStart(IntPtr handle);
 [DllImport("winmm.dll")] static extern uint midiInStop(IntPtr handle);
 [DllImport("winmm.dll")] static extern uint midiInReset(IntPtr handle);
 [DllImport("winmm.dll")] static extern uint midiInClose(IntPtr handle);
 [DllImport("winmm.dll",CharSet=CharSet.Unicode,EntryPoint="midiInGetErrorTextW")] static extern uint midiInGetErrorText(uint code,StringBuilder text,uint length);
 static readonly ConcurrentQueue<uint> notes=new ConcurrentQueue<uint>();
 static readonly ConcurrentQueue<string> commands=new ConcurrentQueue<string>();
 static readonly InputCallback callback=Receive;
 static IntPtr input=IntPtr.Zero;static int device=-1;static string deviceName="",lastList="";static int overflow=0;
 static void Receive(IntPtr handle,uint message,UIntPtr instance,UIntPtr data,UIntPtr timestamp){
  // Never call MIDI functions from the native callback. Drain on the main loop.
  if(handle!=input||(message!=0x3C3&&message!=0x3CC))return;
  uint packed=(uint)data.ToUInt64();int status=(int)(packed&255),kind=status>>4;
  if(status<128||(status>=240&&status!=248&&status!=250&&status!=251&&status!=252&&status!=254&&status!=255))return;
  if(notes.Count>=8192){Interlocked.Exchange(ref overflow,1);return;}notes.Enqueue(packed);
 }
 static string Enc(string text){return Convert.ToBase64String(Encoding.UTF8.GetBytes(text??""));}
 static string Name(uint id){Caps caps;return midiInGetDevCaps((UIntPtr)id,out caps,(uint)Marshal.SizeOf(typeof(Caps)))==0?caps.name:null;}
 static void Close(){IntPtr previous=input;input=IntPtr.Zero;if(previous!=IntPtr.Zero){midiInStop(previous);midiInReset(previous);midiInClose(previous);}device=-1;deviceName="";uint ignored;while(notes.TryDequeue(out ignored)){} }
 static void Error(string token,uint code){StringBuilder text=new StringBuilder(256);midiInGetErrorText(code,text,256);Console.WriteLine("ERROR "+token+" "+code+" "+Enc(text.ToString()));}
 static void List(string token,bool force){
  uint count=midiInGetNumDevs();StringBuilder signature=new StringBuilder();for(uint i=0;i<count;i++)signature.Append(i).Append(':').Append(Name(i)).Append('|');
  if(input!=IntPtr.Zero&&(device<0||device>=count||Name((uint)device)!=deviceName)){Close();Console.WriteLine("CLOSED 0");}
  if(!force&&signature.ToString()==lastList)return;lastList=signature.ToString();Console.WriteLine("LISTBEGIN "+token);for(uint i=0;i<count;i++){string name=Name(i);if(name!=null)Console.WriteLine("INPUT "+i+" "+Enc(name));}Console.WriteLine("LISTEND "+token);
 }
 public static void Run(){
  Thread reader=new Thread(()=>{try{string line;while((line=Console.ReadLine())!=null)commands.Enqueue(line);}finally{commands.Enqueue("QUIT");}});reader.IsBackground=true;reader.Start();
  try{List("0",true);Console.Out.Flush();DateTime nextList=DateTime.UtcNow.AddSeconds(2);bool run=true;
   while(run){string command;while(commands.TryDequeue(out command)){string[] p=command.Split(' ');if(p[0]=="QUIT"){run=false;break;}string token=p.Length>1?p[1]:"0";
    if(p[0]=="LIST"){List(token,true);continue;}
    if(p[0]=="CLOSE"){Close();Console.WriteLine("CLOSED "+token);continue;}
    if(p[0]=="OPEN"){Close();uint id;if(p.Length<3||!uint.TryParse(p[2],out id)||id>=midiInGetNumDevs()){Error(token,2);continue;}uint result=midiInOpen(out input,id,callback,UIntPtr.Zero,0x30000);if(result==0)result=midiInStart(input);if(result!=0){Close();Error(token,result);continue;}device=(int)id;deviceName=Name(id);Console.WriteLine("ACTIVE "+token+" "+id);}
   }
   if(Interlocked.Exchange(ref overflow,0)!=0){uint ignored;while(notes.TryDequeue(out ignored)){}Console.WriteLine("RESET");}
   uint note;int drained=0;while(drained++<512&&notes.TryDequeue(out note))Console.WriteLine("MIDI "+note);
   if(DateTime.UtcNow>=nextList){List("0",false);nextList=DateTime.UtcNow.AddSeconds(2);}Console.Out.Flush();Thread.Sleep(8);
  }}finally{Close();}
 }
}
'@
[AuroraMidiInput]::Run()
