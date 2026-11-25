// The device clock and queued notes live outside Chromium's UI thread.
// This class also accepts an injected sink for timing/cancellation regression tests.
public sealed class AuroraTimeline : System.IDisposable {
 sealed class Item { public double At; public byte[] Data; public bool Long; }
 readonly object gate=new object();
 readonly System.Diagnostics.Stopwatch clock=System.Diagnostics.Stopwatch.StartNew();
 readonly System.Threading.AutoResetEvent wake=new System.Threading.AutoResetEvent(false);
 readonly System.Action<byte[],bool> output;
 readonly System.Threading.Thread thread;
 Item[] items=new Item[0]; int index; double origin,offset,speed=1,end;
 bool running,disposed;
 public AuroraTimeline(System.Action<byte[]> sink):this(delegate(byte[] data,bool isLong){sink(data);}){}
 public AuroraTimeline(System.Action<byte[],bool> sink){output=sink;thread=new System.Threading.Thread(Run);thread.IsBackground=true;thread.Name="Aurora MIDI clock";thread.Start();}
 static Item[] Decode(string data){
  byte[] bytes=System.Convert.FromBase64String(data);
  using(var reader=new System.IO.BinaryReader(new System.IO.MemoryStream(bytes))){
   int count=reader.ReadInt32();if(count<0||count>2000000)throw new System.IO.InvalidDataException();
   var result=new Item[count];double previous=-1;
   for(int i=0;i<count;i++){double at=reader.ReadDouble();int encodedLength=reader.ReadInt32();if(encodedLength==int.MinValue)throw new System.IO.InvalidDataException();int length=System.Math.Abs(encodedLength);if(double.IsNaN(at)||double.IsInfinity(at)||at<previous||length<1||length>1048576||length>reader.BaseStream.Length-reader.BaseStream.Position)throw new System.IO.InvalidDataException();result[i]=new Item{At=at,Data=reader.ReadBytes(length),Long=encodedLength<0};previous=at;}
   if(reader.BaseStream.Position!=reader.BaseStream.Length)throw new System.IO.InvalidDataException();return result;
  }
 }
 double Position(){return offset+(clock.Elapsed.TotalSeconds-origin)*speed;}
 public void Start(string data,double position,double rate,double boundary){
  var next=Decode(data);if(position<0||rate<.25||rate>2||double.IsNaN(position)||double.IsNaN(rate)||double.IsNaN(boundary))throw new System.IO.InvalidDataException();
  lock(gate){items=next;index=0;offset=position;speed=rate;end=boundary;origin=clock.Elapsed.TotalSeconds;running=true;}wake.Set();
 }
 public void Replace(string data,double rate,double boundary){
  var next=Decode(data);if(rate<.25||rate>2||double.IsNaN(rate)||double.IsNaN(boundary))throw new System.IO.InvalidDataException();
  lock(gate){double pos=Position();items=next;index=0;while(index<items.Length&&items[index].At<=pos)index++;offset=pos;origin=clock.Elapsed.TotalSeconds;speed=rate;end=boundary;}wake.Set();
 }
 public void Stop(){lock(gate){running=false;items=new Item[0];index=0;}wake.Set();}
 // Serialize immediate controls with note delivery, including long MIDI buffers.
 public void Immediate(System.Action action){lock(gate){action();}}
 void Run(){while(true){int wait=1000;lock(gate){if(disposed)return;if(running){double pos=Position();while(index<items.Length&&items[index].At<=pos&&items[index].At<=end){var item=items[index++];output(item.Data,item.Long);pos=Position();}if(index==items.Length||pos>=end)running=false;else wait=System.Math.Max(1,System.Math.Min(1000,(int)System.Math.Ceiling((System.Math.Min(items[index].At,end)-pos)/speed*1000)));}}wake.WaitOne(wait);}}
 public void Dispose(){Stop();lock(gate){disposed=true;}wake.Set();thread.Join();wake.Dispose();}
}
