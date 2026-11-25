$ErrorActionPreference = 'Stop'
$timelineSource = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'midi-timeline.cs') -Raw
$bridgeSource = @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
public class AuroraMidi {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct Caps {public ushort mid,pid; public uint version; [MarshalAs(UnmanagedType.ByValTStr,SizeConst=32)] public string name; public ushort technology,voices,notes,channelMask; public uint support;}
 [DllImport("winmm.dll")] static extern uint midiOutGetNumDevs();
 [DllImport("winmm.dll",CharSet=CharSet.Unicode,EntryPoint="midiOutGetDevCapsW")] static extern uint midiOutGetDevCaps(UIntPtr id,out Caps caps,uint size);
 [DllImport("winmm.dll")] static extern uint midiOutOpen(out IntPtr h,uint id,IntPtr callback,IntPtr instance,uint flags);
 [DllImport("winmm.dll")] static extern uint midiOutShortMsg(IntPtr h,uint message);
 [DllImport("winmm.dll")] static extern uint midiOutReset(IntPtr h);
 [DllImport("winmm.dll")] static extern uint midiOutClose(IntPtr h);
 [StructLayout(LayoutKind.Sequential)] public struct Header {public IntPtr data; public uint length,recorded;public UIntPtr user;public uint flags;public IntPtr next;public UIntPtr reserved;public uint offset;[MarshalAs(UnmanagedType.ByValArray,SizeConst=8)]public UIntPtr[] reservedArray;}
 [DllImport("winmm.dll")] static extern uint midiOutPrepareHeader(IntPtr h,IntPtr header,uint size);
 [DllImport("winmm.dll")] static extern uint midiOutLongMsg(IntPtr h,IntPtr header,uint size);
 [DllImport("winmm.dll")] static extern uint midiOutUnprepareHeader(IntPtr h,IntPtr header,uint size);
 static List<IntPtr> pending=new List<IntPtr>();
 static void Cleanup(){for(int i=pending.Count-1;i>=0;i--){IntPtr ptr=pending[i];Header head=(Header)Marshal.PtrToStructure(ptr,typeof(Header));if((head.flags&1)!=0){if(midiOutUnprepareHeader(handle,ptr,(uint)Marshal.SizeOf(typeof(Header)))==0){Marshal.FreeHGlobal(head.data);Marshal.FreeHGlobal(ptr);pending.RemoveAt(i);}}}}
 static void Long(string hex){if(handle==IntPtr.Zero||hex.Length>2097152||hex.Length%2!=0)return;byte[] data=new byte[hex.Length/2];for(int i=0;i<data.Length;i++)data[i]=Convert.ToByte(hex.Substring(i*2,2),16);Header head=new Header();head.data=Marshal.AllocHGlobal(data.Length);Marshal.Copy(data,0,head.data,data.Length);head.length=(uint)data.Length;head.reservedArray=new UIntPtr[8];IntPtr ptr=Marshal.AllocHGlobal(Marshal.SizeOf(typeof(Header)));Marshal.StructureToPtr(head,ptr,false);uint r=midiOutPrepareHeader(handle,ptr,(uint)Marshal.SizeOf(typeof(Header)));if(r==0){r=midiOutLongMsg(handle,ptr,(uint)Marshal.SizeOf(typeof(Header)));if(r==0){pending.Add(ptr);return;}midiOutUnprepareHeader(handle,ptr,(uint)Marshal.SizeOf(typeof(Header)));}Marshal.FreeHGlobal(head.data);Marshal.FreeHGlobal(ptr);}
 static IntPtr handle=IntPtr.Zero;
 static AuroraTimeline timeline;
 static void Output(byte[] data,bool isLong){Cleanup();if(handle==IntPtr.Zero||data.Length==0)return;if(isLong){Long(BitConverter.ToString(data).Replace("-",""));return;}uint msg=data[0];if(data.Length>1)msg|=(uint)data[1]<<8;if(data.Length>2)msg|=(uint)data[2]<<16;midiOutShortMsg(handle,msg);}
 static double Number(string text){return double.Parse(text,System.Globalization.CultureInfo.InvariantCulture);}
 static void Open(int id){if(handle!=IntPtr.Zero){midiOutReset(handle);Cleanup();midiOutClose(handle);handle=IntPtr.Zero;}uint r=midiOutOpen(out handle,unchecked((uint)id),IntPtr.Zero,IntPtr.Zero,0);Console.WriteLine(r==0?"READY":"ERROR "+r);Console.Out.Flush();}
 public static void Run(){
  for(uint i=0;i<midiOutGetNumDevs();i++){Caps c; if(midiOutGetDevCaps((UIntPtr)i,out c,(uint)Marshal.SizeOf(typeof(Caps)))==0) Console.WriteLine("DEVICE "+i+" "+Convert.ToBase64String(Encoding.UTF8.GetBytes(c.name)));}
  Open(-1);
  timeline=new AuroraTimeline(Output);
  try {string line;while((line=Console.ReadLine())!=null){
   if(line=="QUIT")break;
   if(line.StartsWith("TIMELINE ")){try{string[] t=line.Split(' ');if(t[1]=="stop")timeline.Stop();else if(t[1]=="start")timeline.Start(t[5],Number(t[2]),Number(t[3]),Number(t[4]));else if(t[1]=="replace")timeline.Replace(t[4],Number(t[2]),Number(t[3]));}catch{Console.WriteLine("TIMELINE_ERROR");Console.Out.Flush();}continue;}
   string command=line;
   if(command=="RESET"||command.StartsWith("OPEN "))timeline.Stop();
   timeline.Immediate(delegate {Cleanup();string[] p=command.Split(' ');if(p[0]=="L"){Long(p[1]);return;}if(p[0]=="RESET"){if(handle!=IntPtr.Zero)midiOutReset(handle);return;}if(p[0]=="OPEN"){Open(int.Parse(p[1]));return;}if(p[0]=="S"&&handle!=IntPtr.Zero){uint msg=uint.Parse(p[1]);if(p.Length>2)msg|=uint.Parse(p[2])<<8;if(p.Length>3)msg|=uint.Parse(p[3])<<16;midiOutShortMsg(handle,msg);}});
  }} finally {timeline.Dispose();if(handle!=IntPtr.Zero){midiOutReset(handle);Cleanup();midiOutClose(handle);}}
 }
}
'@
Add-Type -TypeDefinition ($bridgeSource + [Environment]::NewLine + $timelineSource)
[AuroraMidi]::Run()
