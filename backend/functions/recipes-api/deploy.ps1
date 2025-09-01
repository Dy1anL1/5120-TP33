param(
  [switch]$deploy  # Use --deploy to trigger deployment
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

$FnName = 'recipes-api'   # Change to the corresponding function name in foods-api / nutrition-match-api directories
$Zip    = 'function.zip'
$PkgDir = '.package'

# 1) Dependency installation (force in current directory, do not use workspaces)
if (-not (Test-Path 'node_modules')) {
  Write-Host "node_modules not found -> installing deps locally"
  # If you have package-lock.json, prefer ci; otherwise install is safer
  if (Test-Path 'package-lock.json') {
    npm ci --omit=dev --workspaces=false
  } else {
    npm install --omit=dev --workspaces=false
  }
}

# Double-check node_modules
if (-not (Test-Path 'node_modules')) {
  throw "node_modules still missing. If your repo uses npm workspaces at the root, run: `npm install --omit=dev --workspaces=false` inside this folder."
}

# 2) Clean old artifacts & package directory
if (Test-Path $Zip)     { Remove-Item $Zip -Force }
if (Test-Path $PkgDir)  { Remove-Item $PkgDir -Recurse -Force }
New-Item -ItemType Directory -Path $PkgDir | Out-Null

# 3) Copy files to temporary directory
Copy-Item -Path "index.js" -Destination $PkgDir -Force
Copy-Item -Path "package.json" -Destination $PkgDir -Force
Copy-Item -Path "node_modules" -Destination $PkgDir -Recurse -Force

# 4) Compression
Compress-Archive -Path "$PkgDir\*" -DestinationPath $Zip -Force
Write-Host "Packed $Zip"

# 5) Deploy
if ($deploy) {
  Write-Host "Deploying $FnName..."
  aws lambda update-function-code --function-name $FnName --zip-file fileb://$Zip | Out-Null
  Write-Host "Deployed $FnName"
}
