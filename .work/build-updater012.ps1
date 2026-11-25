$ErrorActionPreference='Stop'
Add-Type -Path (Join-Path $PSScriptRoot 'AuroraUpdater012.cs') -ReferencedAssemblies System.Windows.Forms,System.Drawing,System.Core -OutputAssembly (Join-Path $PSScriptRoot 'release-0.12.0/Atualizar_Aurora.exe') -OutputType WindowsApplication
Add-Type -Path (Join-Path $PSScriptRoot 'AuroraUpdater012.cs') -ReferencedAssemblies System.Windows.Forms,System.Drawing,System.Core
$payload=Join-Path $PSScriptRoot 'release-0.12.0/resources/app'
$target=Join-Path $PSScriptRoot 'test-update-0.12.0'
$backup=[AuroraUpdater]::Apply($payload,$target)
Write-Output ('PASS updater 0.12.0: all payload hashes verified; prior-version backup: '+$backup)
