$ErrorActionPreference='Stop'
Add-Type -TypeDefinition ((Get-Content -LiteralPath (Join-Path $PSScriptRoot '../midi-timeline.cs') -Raw) + @'

public static class TimelineRegression {
 static string Plan(int count,double step,int note){using(var stream=new System.IO.MemoryStream()){using(var writer=new System.IO.BinaryWriter(stream)){writer.Write(count);for(int i=0;i<count;i++){writer.Write(i*step);writer.Write(3);writer.Write(new byte[]{144,(byte)note,(byte)(i%127+1)});}return System.Convert.ToBase64String(stream.ToArray());}}}
 static void Check(bool condition,string message){if(!condition)throw new System.Exception(message);}
 public static void Run(){
  var messages=new System.Collections.Generic.List<int>();var times=new System.Collections.Generic.List<double>();var timer=System.Diagnostics.Stopwatch.StartNew();
  using(var timeline=new AuroraTimeline(delegate(byte[] data){lock(messages){messages.Add(data[1]);times.Add(timer.Elapsed.TotalSeconds);}})){
   timeline.Start(Plan(81,.01,60),0,1,1);System.Threading.Thread.Sleep(1000);
   lock(messages){Check(messages.Count==81,"Native clock lost notes while its caller was blocked for a full second");Check(times[80]-times[0]>.72&&times[80]-times[0]<.9,"Native event timing drifted");messages.Clear();times.Clear();}
   timeline.Start(Plan(100,.01,61),0,1,2);System.Threading.Thread.Sleep(90);timeline.Stop();int stopped;lock(messages){stopped=messages.Count;}System.Threading.Thread.Sleep(150);lock(messages){Check(messages.Count==stopped,"Notes leaked after pause");messages.Clear();}
   timeline.Start(Plan(100,.01,62),0,1,2);System.Threading.Thread.Sleep(90);timeline.Replace(Plan(100,.01,64),2,.6);System.Threading.Thread.Sleep(400);timeline.Stop();
   lock(messages){Check(messages.Contains(62)&&messages.Contains(64),"Live replacement failed");Check(messages.Count>=53&&messages.Count<=63,"Replacement replayed old notes or lost future events");messages.Clear();}
   timeline.Start(Plan(100,.01,65),0,1,2);System.Threading.Thread.Sleep(40);timeline.Stop();lock(messages){messages.Clear();}timeline.Start(Plan(4,.02,67),0,1,.1);System.Threading.Thread.Sleep(130);
   lock(messages){Check(messages.Count==4&&messages.TrueForAll(n=>n==67),"Seek played stale queued notes");messages.Clear();}
   timeline.Start(Plan(10,.02,69),0,1,.05);System.Threading.Thread.Sleep(150);lock(messages){Check(messages.Count==3,"End boundary leaked notes");messages.Clear();}
  }
  System.Console.WriteLine("PASS native clock: continuous notes during a blocked caller, timing, pause cancellation, live mix/tempo replacement, stale seek cancellation and end boundary");
 }
}
'@)
[TimelineRegression]::Run()
