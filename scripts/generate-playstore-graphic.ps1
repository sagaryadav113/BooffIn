Add-Type -AssemblyName System.Drawing
$sourcePath = Join-Path $PSScriptRoot "..\assets\images\google-play-feature-graphic.jpg"
$destPngPath = Join-Path $PSScriptRoot "..\assets\images\google-play-feature-graphic-1024x500.png"
$destJpgPath = Join-Path $PSScriptRoot "..\assets\images\google-play-feature-graphic-1024x500.jpg"

$src = [System.Drawing.Image]::FromFile($sourcePath)
$dest = New-Object System.Drawing.Bitmap(1024, 500)
$g = [System.Drawing.Graphics]::FromImage($dest)

$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$targetRatio = 1024.0 / 500.0
$srcW = $src.Width
$srcH = [int]($src.Width / $targetRatio)
$srcX = 0
$srcY = [int](($src.Height - $srcH) / 2)

$destRect = New-Object System.Drawing.Rectangle(0, 0, 1024, 500)
$g.DrawImage($src, $destRect, $srcX, $srcY, $srcW, $srcH, [System.Drawing.GraphicsUnit]::Pixel)

$dest.Save($destPngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$dest.Save($destJpgPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)

$g.Dispose()
$dest.Dispose()
$src.Dispose()

Write-Host "Success: Generated 1024x500 Google Play feature graphics in assets/images!"
