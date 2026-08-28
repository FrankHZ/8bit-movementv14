$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $repositoryRoot 'src'
$releaseRoot = Join-Path $repositoryRoot 'release'
$manifestPath = Join-Path $sourceRoot 'module.json'
$packagePath = Join-Path $repositoryRoot 'package.json'

$manifest = Get-Content -Raw -Encoding utf8 -LiteralPath $manifestPath | ConvertFrom-Json
$package = Get-Content -Raw -Encoding utf8 -LiteralPath $packagePath | ConvertFrom-Json

if ($manifest.version -ne $package.version) {
  throw "Version mismatch: module.json is $($manifest.version), package.json is $($package.version)."
}

if ($manifest.id -notmatch '^[a-z0-9-]+$') {
  throw "Unsafe module id: $($manifest.id)"
}

if ($manifest.version -notmatch '^[0-9A-Za-z.+-]+$') {
  throw "Unsafe module version: $($manifest.version)"
}

New-Item -ItemType Directory -Force -Path $releaseRoot | Out-Null

$releaseRootFull = [System.IO.Path]::GetFullPath($releaseRoot).TrimEnd(
  [System.IO.Path]::DirectorySeparatorChar,
  [System.IO.Path]::AltDirectorySeparatorChar
)

function Resolve-ReleaseChild([string] $path) {
  $fullPath = [System.IO.Path]::GetFullPath($path)
  $prefix = $releaseRootFull + [System.IO.Path]::DirectorySeparatorChar
  if (-not $fullPath.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify a path outside the release directory: $fullPath"
  }
  return $fullPath
}

$stagePath = Resolve-ReleaseChild (Join-Path $releaseRoot $manifest.id)
$manualZip = Resolve-ReleaseChild (Join-Path $releaseRoot "$($manifest.id).zip")
$versionedZip = Resolve-ReleaseChild (
  Join-Path $releaseRoot "$($manifest.id)-$($manifest.version).zip"
)

if (Test-Path -LiteralPath $stagePath) {
  Remove-Item -LiteralPath $stagePath -Recurse -Force
}
New-Item -ItemType Directory -Path $stagePath | Out-Null

Get-ChildItem -Force -LiteralPath $sourceRoot | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $stagePath -Recurse -Force
}

foreach ($packageFile in @('CHANGELOG', 'LICENSE', 'readme.md')) {
  Copy-Item -LiteralPath (Join-Path $repositoryRoot $packageFile) -Destination $stagePath
}

foreach ($zipPath in @($manualZip, $versionedZip)) {
  if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
  }
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
  $stagePath,
  $manualZip,
  [System.IO.Compression.CompressionLevel]::Optimal,
  $false
)
Copy-Item -LiteralPath $manualZip -Destination $versionedZip

Write-Output "Staged module: $stagePath"
foreach ($zipPath in @($manualZip, $versionedZip)) {
  $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath
  Write-Output "Package: $zipPath"
  Write-Output "SHA256: $($hash.Hash)"
}
