# 把游戏原型里的大图压成小游戏可用的 jpg。
# 用法（在项目根目录或任意位置）：
#   pwsh -File tools/compress-assets.ps1
#   pwsh -File tools/compress-assets.ps1 -Width 640 -Quality 78
# 只会写 微信小游戏/assets/levels，不修改原型里的原图。

param(
  [string]$Source = 'D:\合成大肥鱼\游戏原型\dist\assets\levels',
  [string]$Target = '',
  [int]$Width = 700,
  [int]$Quality = 80
)

Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $Target) { $Target = Join-Path $projectRoot 'assets\levels' }
if (-not (Test-Path $Source)) { throw "找不到素材目录：$Source" }
New-Item -ItemType Directory -Force -Path $Target | Out-Null

$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' }

$before = 0
$after = 0
foreach ($file in Get-ChildItem $Source -Filter *.png) {
  $image = [System.Drawing.Image]::FromFile($file.FullName)
  try {
    $height = [int]($image.Height * $Width / $image.Width)
    $bitmap = New-Object System.Drawing.Bitmap($Width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.DrawImage($image, 0, 0, $Width, $height)
    } finally { $graphics.Dispose() }

    $parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
      [System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)

    $destination = Join-Path $Target ($file.BaseName + '.jpg')
    $bitmap.Save($destination, $encoder, $parameters)
    $bitmap.Dispose()

    $before += $file.Length
    $after += (Get-Item $destination).Length
    '{0,-18} {1,7:N0} KB -> {2,5} KB' -f $file.Name, ($file.Length / 1KB), [math]::Round((Get-Item $destination).Length / 1KB)
  } finally { $image.Dispose() }
}

'--- 合计 {0:N2} MB -> {1:N2} MB' -f ($before / 1MB), ($after / 1MB)
