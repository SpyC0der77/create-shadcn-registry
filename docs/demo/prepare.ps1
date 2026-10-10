$ErrorActionPreference = 'Stop'
$work = Join-Path ([IO.Path]::GetTempPath()) ('vhs-demo-' + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $work | Out-Null
Copy-Item -LiteralPath 'bin' -Destination $work -Recurse
Copy-Item -LiteralPath 'package.json' -Destination $work -Recurse
Copy-Item -LiteralPath 'node_modules' -Destination $work -Recurse
$work
