# 将 dist/ 同步到 netlify-upload/（保留 上传说明.txt）
$ErrorActionPreference = "Stop"
$App = Split-Path $PSScriptRoot -Parent
$Dist = Join-Path $App "dist"
$Target = Join-Path $App "netlify-upload"

if (-not (Test-Path $Dist)) {
    Write-Error "未找到 dist/，请先运行: npm run build"
}

Get-ChildItem $Target -Force | Where-Object { $_.Name -ne "上传说明.txt" } | Remove-Item -Recurse -Force
Copy-Item -Path (Join-Path $Dist "*") -Destination $Target -Recurse -Force

Write-Host "已同步 dist -> netlify-upload/"
Write-Host "下一步: https://app.netlify.com 拖拽 netlify-upload 上传"
