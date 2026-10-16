Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\pooja\.gemini\antigravity-ide\brain\31b9e4da-49dd-4934-b2fa-5c2ce2e73034\.user_uploaded\media_1792173536931.png"
$destPngPath = Join-Path $PSScriptRoot "..\assets\images\google-play-feature-graphic-1024x500.png"
$destJpgPath = Join-Path $PSScriptRoot "..\assets\images\google-play-feature-graphic-1024x500.jpg"

$src = [System.Drawing.Image]::FromFile($sourcePath)

# Target: 1024 x 500
$targetW = 1024
$targetH = 500

$dest = New-Object System.Drawing.Bitmap($targetW, $targetH)
$g = [System.Drawing.Graphics]::FromImage($dest)

$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Calculate centered crop:
# src is 1024 x 571. Height diff is 71px.
$cropY = [int](($src.Height - $targetH) / 2) # 35 px from top
$cropX = 0
$srcCropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $targetW, $targetH)
$destRect = New-Object System.Drawing.Rectangle(0, 0, $targetW, $targetH)

$g.DrawImage($src, $destRect, $srcCropRect, [System.Drawing.GraphicsUnit]::Pixel)

# Save high-res PNG and JPEG
$dest.Save($destPngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$dest.Save($destJpgPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)

$g.Dispose()
$dest.Dispose()
$src.Dispose()

Write-Host "Success: Cropped user graphic to exact 1024x500 Play Store requirement!"
