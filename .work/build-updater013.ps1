$ErrorActionPreference='Stop'
Add-Type -Path (Join-Path $PSScriptRoot 'AuroraUpdater013.cs') -ReferencedAssemblies System.Windows.Forms,System.Drawing,System.Core -OutputAssembly (Join-Path $PSScriptRoot 'release-0.13.0/Atualizar_Aurora.exe') -OutputType WindowsApplication
Add-Type -Path (Join-Path $PSScriptRoot 'AuroraUpdater013.cs') -ReferencedAssemblies System.Windows.Forms,System.Drawing,System.Core
$payload=Join-Path $PSScriptRoot 'release-0.13.0/resources/app'
$target=Join-Path $PSScriptRoot 'test-update-0.13.0'
$backup=[AuroraUpdater]::Apply($payload,$target)
Write-Output ('PASS updater 0.13.0: verified payload hashes; backup: '+$backup)
