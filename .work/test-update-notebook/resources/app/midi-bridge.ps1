$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
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
 static void Open(int id){if(handle!=IntPtr.Zero){midiOutReset(handle);Cleanup();midiOutClose(handle);handle=IntPtr.Zero;}uint r=midiOutOpen(out handle,unchecked((uint)id),IntPtr.Zero,IntPtr.Zero,0);Console.WriteLine(r==0?"READY":"ERROR "+r);Console.Out.Flush();}
 public static void Run(){
  for(uint i=0;i<midiOutGetNumDevs();i++){Caps c; if(midiOutGetDevCaps((UIntPtr)i,out c,(uint)Marshal.SizeOf(typeof(Caps)))==0) Console.WriteLine("DEVICE "+i+" "+Convert.ToBase64String(Encoding.UTF8.GetBytes(c.name)));}
  Open(-1);
  try {string line;while((line=Console.ReadLine())!=null){Cleanup();string[] p=line.Split(' ');if(p[0]=="QUIT")break;if(p[0]=="L"){Long(p[1]);continue;}if(p[0]=="RESET"){if(handle!=IntPtr.Zero)midiOutReset(handle);continue;}if(p[0]=="OPEN"){Open(int.Parse(p[1]));continue;}if(p[0]=="S"&&handle!=IntPtr.Zero){uint msg=uint.Parse(p[1]);if(p.Length>2)msg|=uint.Parse(p[2])<<8;if(p.Length>3)msg|=uint.Parse(p[3])<<16;midiOutShortMsg(handle,msg);}}} finally {if(handle!=IntPtr.Zero){midiOutReset(handle);Cleanup();midiOutClose(handle);}}
 }
}
'@
[AuroraMidi]::Run()
