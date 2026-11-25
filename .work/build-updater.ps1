$ErrorActionPreference='Stop'
Add-Type -Path (Join-Path $PSScriptRoot 'AuroraUpdater.cs') -ReferencedAssemblies System.Windows.Forms,System.Drawing,System.Core -OutputAssembly (Join-Path $PSScriptRoot 'notebook-0.11.1/Atualizar_Aurora.exe') -OutputType WindowsApplication
Add-Type -Path (Join-Path $PSScriptRoot 'AuroraUpdater.cs') -ReferencedAssemblies System.Windows.Forms,System.Drawing,System.Core
$payload=Join-Path $PSScriptRoot 'notebook-0.11.1/resources/app'
$target=Join-Path $PSScriptRoot 'test-update-notebook'
$backup=[AuroraUpdater]::Apply($payload,$target)
Write-Output ('PASS update with backup and hash verification: '+$backup)
try {[AuroraUpdater]::Apply($payload,(Join-Path $PSScriptRoot 'test-invalid-update-target'));throw 'Invalid target was accepted'} catch [System.Management.Automation.MethodInvocationException] {Write-Output 'PASS rejects destination without AuroraMIDI.exe'}
